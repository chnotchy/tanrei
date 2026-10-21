import 'dart:async';

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
import 'navigation_harness.dart';
import 'sheet_harness.dart';

const TanreiSystem system = tanreiSystem;
final TanreiSideSheetTokens sheetTokens = system.sideSheet;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The stage of every side sheet fixture: 720 x 480 with no system insets.
const Size stage = Size(720, 480);

/// The frame of the side sheet baselines: the stage in the `space200` padding of every baseline.
final Size sideSheetGoldenSurface = Size(
  stage.width + 2 * system.space.space200,
  stage.height + 2 * system.space.space200,
);

final List<Map<String, dynamic>> fixtures = specFixtures('side-sheet');

/// The two-line content of every fixture.
final String contentText = fixtures.first['content'] as String;

/// The sheet a fixture describes: a standard sheet at the end of a row beside a bare page, a modal
/// one over the page in a `Stack`; the actions slot filled as its fixture kind says.
Widget fixtureSideSheet(Map<String, dynamic> fixture) {
  final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
  final TanreiSideSheetVariant variant = TanreiSideSheetVariant(
    props['variant'] as String? ?? 'standard',
  );
  final Widget sheet = TanreiSideSheet(
    variant: variant,
    open: props['open'] == true,
    onClose: (_) {},
    headline: props['headline'] as String? ?? '',
    showCloseButton: props['closable'] == true,
    closeButtonSemanticLabel: props['closeLabel'] as String? ?? '',
    actions: fixtureSlot('side-sheet', fixture, 'actions'),
    child: Text(fixture['content'] as String),
  );
  return SizedBox.fromSize(
    size: stage,
    child: variant == TanreiSideSheetVariant.modal
        ? Stack(children: <Widget>[sheet])
        : Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              const Expanded(child: SizedBox.shrink()),
              sheet,
            ],
          ),
  );
}

/// A page with a side sheet whose owner keeps `open`, recording every close: an Open button and a
/// Content button on the page; a standard sheet at the end of a row, a modal one over the page.
class SideSheetOwner extends StatefulWidget {
  const SideSheetOwner({
    super.key,
    this.variant = TanreiSideSheetVariant.standard,
    this.initialOpen = true,
    this.headline = 'Filters',
    this.showCloseButton = true,
    this.closeButtonSemanticLabel = 'Close filters',
    this.actions = const <Widget>[],
    this.closeOnRequest = true,
    this.closes,
    this.content,
    this.page,
  });

  final TanreiSideSheetVariant variant;
  final bool initialOpen;
  final String headline;
  final bool showCloseButton;
  final String closeButtonSemanticLabel;
  final List<Widget> actions;
  final bool closeOnRequest;
  final List<TanreiSheetCloseReason>? closes;
  final Widget? content;
  final Widget? page;

  @override
  State<SideSheetOwner> createState() => SideSheetOwnerState();
}

class SideSheetOwnerState extends State<SideSheetOwner> {
  late bool open = widget.initialOpen;

  void setOpen(bool value) => setState(() => open = value);

  @override
  Widget build(BuildContext context) {
    final Widget sheet = TanreiSideSheet(
      variant: widget.variant,
      open: open,
      headline: widget.headline,
      showCloseButton: widget.showCloseButton,
      closeButtonSemanticLabel: widget.closeButtonSemanticLabel,
      actions: widget.actions,
      onClose: (TanreiSheetCloseReason reason) {
        widget.closes?.add(reason);
        if (widget.closeOnRequest) {
          setOpen(false);
        }
      },
      child: widget.content ?? Text(contentText),
    );
    final Widget page =
        widget.page ??
        Column(
          key: const ValueKey<String>('page'),
          children: <Widget>[
            TanreiButton(onPressed: () => setOpen(!open), child: const Text('Open')),
            TanreiButton(onPressed: () {}, child: const Text('Content')),
          ],
        );
    return widget.variant == TanreiSideSheetVariant.modal
        ? Stack(
            children: <Widget>[
              Positioned.fill(child: page),
              sheet,
            ],
          )
        : Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Expanded(child: page),
              sheet,
            ],
          );
  }
}

Future<void> pumpSheet(WidgetTester tester, Widget app, {Size window = stage}) =>
    pumpInWindow(tester, app, window);

/// The panel: its clip at the end edge.
Finder panelFinder() =>
    find.byWidgetPredicate((Widget w) => w is ClipRect && w.clipper is TanreiEdgeClipper);

Rect panelRect(WidgetTester tester) => tester.getRect(panelFinder());

TanreiContainerDecoration panelDecoration(WidgetTester tester) =>
    tester
            .widget<DecoratedBox>(
              find
                  .descendant(
                    of: panelFinder(),
                    matching: find.byWidgetPredicate(
                      (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
                    ),
                  )
                  .first,
            )
            .decoration
        as TanreiContainerDecoration;

Rect drawnContainerRect(WidgetTester tester) => tester.getRect(
  find
      .descendant(
        of: panelFinder(),
        matching: find.byWidgetPredicate(
          (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
        ),
      )
      .first,
);

TanreiEdgePainter edgeOf(WidgetTester tester) =>
    tester
            .widget<CustomPaint>(
              find
                  .descendant(
                    of: panelFinder(),
                    matching: find.byWidgetPredicate(
                      (Widget w) => w is CustomPaint && w.foregroundPainter is TanreiEdgePainter,
                    ),
                  )
                  .first,
            )
            .foregroundPainter!
        as TanreiEdgePainter;

Finder closeButton() =>
    find.descendant(of: find.byType(TanreiSideSheet), matching: find.byType(TanreiIconButton));

Finder scrimFinder() => find.descendant(
  of: find.byType(TanreiSideSheet),
  matching: find.byWidgetPredicate(
    (Widget w) => w is ColoredBox && w.color == lightTheme.paint(sheetTokens.scrimColor),
  ),
);

double scrimOpacity(WidgetTester tester) => tester
    .widget<Opacity>(find.ancestor(of: scrimFinder(), matching: find.byType(Opacity)).first)
    .opacity;

Finder contentScroll() =>
    find.descendant(of: find.byType(TanreiSideSheet), matching: find.byType(SingleChildScrollView));

bool focusInSheet() => focusInside<TanreiSideSheet>();

Widget buttonsContent({bool autofocusSecond = false}) => Column(
  mainAxisSize: MainAxisSize.min,
  children: <Widget>[
    TanreiButton(onPressed: () {}, child: const Text('Save')),
    TanreiButton(autofocus: autofocusSecond, onPressed: () {}, child: const Text('Cancel')),
  ],
);

List<Widget> twoActions() => <Widget>[
  TanreiButton(onPressed: () {}, child: const Text('Apply')),
  TanreiButton(variant: TanreiButtonVariant.text, onPressed: () {}, child: const Text('Reset')),
];

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
    debugDefaultTargetPlatformOverride = null;
  });

  final Duration enter = tanreiDuration(sheetTokens.motionEnterDuration);
  final Duration exit = tanreiDuration(sheetTokens.motionExitDuration);
  final double width = sheetTokens.containerWidth;

  group('standard: a layout region', () {
    testWidgets('SSH-1: open takes the width at the end of the row, closed none and no presence; '
        'a change slides it at the end edge as the content resizes, at once where motion is '
        'reduced; no scrim, Tab leaves it, Escape, back and drags are ignored', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle semantics = tester.ensureSemantics();
      final List<TanreiSheetCloseReason> closes = <TanreiSheetCloseReason>[];
      final GlobalKey<SideSheetOwnerState> owner = GlobalKey<SideSheetOwnerState>();
      await pumpSheet(
        tester,
        sheetApp(SideSheetOwner(key: owner, closes: closes, content: buttonsContent())),
      );
      expect(panelRect(tester), Rect.fromLTWH(stage.width - width, 0, width, stage.height));
      final Finder page = find.byKey(const ValueKey<String>('page'));
      expect(tester.getSize(page).width, stage.width - width);
      expect(scrimFinder(), findsNothing);

      owner.currentState!.setOpen(false);
      await tester.pump();
      await tester.pump(exit ~/ 2);
      final double e = sheetTokens.motionExitEasing.toCurve().transform(0.5);
      expect(tester.getSize(page).width, moreOrLessEquals(stage.width - width * (1 - e)));
      await tester.pumpAndSettle();
      expect(tester.getSize(page).width, stage.width);
      expect(find.text('Filters'), findsNothing);
      expect(
        nodesBelow(
          semanticsRoot(tester),
        ).where((SemanticsNode n) => n.getSemanticsData().label == 'Filters'),
        isEmpty,
      );

      owner.currentState!.setOpen(true);
      await tester.pump();
      await tester.pump(enter ~/ 2);
      final double t = sheetTokens.motionEnterEasing.toCurve().transform(0.5);
      expect(tester.getSize(page).width, moreOrLessEquals(stage.width - width * t));
      await tester.pumpAndSettle();

      // Tab leaves it and the sheet stays; Escape, back and a drag do nothing.
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      expect(focusInSheet(), isTrue);
      final Set<bool> inside = <bool>{};
      for (int i = 0; i < 5; i++) {
        await tabTimes(tester, 1);
        inside.add(focusInSheet());
      }
      expect(inside, <bool>{true, false});
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.dragFrom(panelRect(tester).center, const Offset(200, 0));
      await tester.pumpAndSettle();
      expect(closes, isEmpty);
      expect(owner.currentState!.open, isTrue);
      expect(panelRect(tester).left, stage.width - width);

      // Reduced motion: at once.
      final GlobalKey<SideSheetOwnerState> reduced = GlobalKey<SideSheetOwnerState>();
      await pumpSheet(tester, sheetApp(SideSheetOwner(key: reduced), disableAnimations: true));
      reduced.currentState!.setOpen(false);
      await tester.pump();
      await tester.pump();
      expect(find.text('Filters'), findsNothing);
      semantics.dispose();
    });
  });

  group('modal: a modal overlay', () {
    testWidgets('SSH-2: opening slides the sheet in from the end edge and fades the scrim in over '
        'the enter motion; closing slides it out over the exit motion; reduced motion fades (at '
        'once on Android); while open it keeps Tab inside and makes the page inert', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle semantics = tester.ensureSemantics();
      final GlobalKey<SideSheetOwnerState> owner = GlobalKey<SideSheetOwnerState>();
      int pagePresses = 0;
      await pumpSheet(
        tester,
        sheetApp(
          SideSheetOwner(
            key: owner,
            variant: TanreiSideSheetVariant.modal,
            initialOpen: false,
            closeOnRequest: false,
            content: buttonsContent(),
            page: Column(
              children: <Widget>[
                TanreiButton(
                  onPressed: () => owner.currentState!.setOpen(true),
                  child: const Text('Open'),
                ),
                TanreiButton(onPressed: () => pagePresses++, child: const Text('Content')),
              ],
            ),
          ),
        ),
      );
      owner.currentState!.setOpen(true);
      await tester.pump();
      await tester.pump(enter ~/ 2);
      final double t = sheetTokens.motionEnterEasing.toCurve().transform(0.5);
      expect(panelRect(tester).left, moreOrLessEquals(stage.width - width * t, epsilon: 0.5));
      expect(scrimOpacity(tester), moreOrLessEquals(t, epsilon: 0.01));
      await tester.pumpAndSettle();
      expect(panelRect(tester).left, stage.width - width);
      expect(TanreiModalOverlays.instance.isAnyOpen, isTrue);

      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final Set<String> seen = <String>{};
      for (int i = 0; i < 6; i++) {
        await tabTimes(tester, 1);
        seen.add(focusedLabel());
        expect(focusInSheet(), isTrue);
      }
      expect(seen, <String>{'Close filters', 'Save', 'Cancel'});
      await tabTimes(tester, 3, shift: true);
      expect(focusInSheet(), isTrue);

      await tester.tapAt(tester.getCenter(find.text('Content')));
      await tester.pump();
      expect(pagePresses, 0);
      expect(
        nodesBelow(
          semanticsRoot(tester),
        ).where((SemanticsNode n) => n.getSemanticsData().label == 'Content'),
        isEmpty,
      );

      owner.currentState!.setOpen(false);
      await tester.pump();
      await tester.pump(exit ~/ 2);
      final double e = sheetTokens.motionExitEasing.toCurve().transform(0.5);
      expect(
        panelRect(tester).left,
        moreOrLessEquals(stage.width - width + width * e, epsilon: 0.5),
      );
      await tester.pumpAndSettle();
      expect(find.text('Filters'), findsNothing);
      expect(TanreiModalOverlays.instance.isAnyOpen, isFalse);

      // Reduced motion on iOS: fades in place.
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      final GlobalKey<SideSheetOwnerState> fading = GlobalKey<SideSheetOwnerState>();
      await pumpSheet(
        tester,
        sheetApp(
          SideSheetOwner(key: fading, variant: TanreiSideSheetVariant.modal, initialOpen: false),
          disableAnimations: true,
        ),
      );
      fading.currentState!.setOpen(true);
      await tester.pump();
      await tester.pump(enter ~/ 2);
      expect(panelRect(tester).left, stage.width - width);
      expect(
        tester
            .widget<Opacity>(find.ancestor(of: panelFinder(), matching: find.byType(Opacity)).first)
            .opacity,
        moreOrLessEquals(t, epsilon: 0.01),
      );
      await tester.pumpAndSettle();
      debugDefaultTargetPlatformOverride = null;

      // Android: at once.
      final GlobalKey<SideSheetOwnerState> atOnce = GlobalKey<SideSheetOwnerState>();
      await pumpSheet(
        tester,
        sheetApp(
          SideSheetOwner(key: atOnce, variant: TanreiSideSheetVariant.modal, initialOpen: false),
          disableAnimations: true,
        ),
      );
      atOnce.currentState!.setOpen(true);
      await tester.pump();
      expect(panelRect(tester).left, stage.width - width);
      semantics.dispose();
    });

    testWidgets('SSH-4: the scrim, Escape, the platform\'s back, a drag past half its width and a '
        'fling toward the end edge each ask once with their reason; a drag follows the finger and '
        'a shorter one slides back over the enter motion', (WidgetTester tester) async {
      final List<TanreiSheetCloseReason> closes = <TanreiSheetCloseReason>[];
      Future<GlobalKey<SideSheetOwnerState>> openSheet() async {
        final GlobalKey<SideSheetOwnerState> owner = GlobalKey<SideSheetOwnerState>();
        await pumpSheet(
          tester,
          sheetApp(
            SideSheetOwner(key: owner, variant: TanreiSideSheetVariant.modal, closes: closes),
          ),
        );
        return owner;
      }

      GlobalKey<SideSheetOwnerState> owner = await openSheet();
      await tester.tapAt(const Offset(100, 240));
      await tester.pumpAndSettle();
      expect(closes, <TanreiSheetCloseReason>[TanreiSheetCloseReason.scrim]);
      expect(owner.currentState!.open, isFalse);

      owner = await openSheet();
      owner.currentState!.setOpen(false);
      await tester.pumpAndSettle();
      owner.currentState!.setOpen(true);
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(closes.last, TanreiSheetCloseReason.escape);

      owner = await openSheet();
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(closes.last, TanreiSheetCloseReason.back);
      expect(find.text('Open'), findsOneWidget, reason: 'the page stayed');

      owner = await openSheet();
      final Offset start = Offset(stage.width - width / 2, 300);
      final TestGesture drag = await tester.startGesture(start);
      await drag.moveBy(const Offset(40, 0));
      await drag.moveBy(const Offset(40, 0));
      await tester.pump();
      expect(panelRect(tester).left, moreOrLessEquals(stage.width - width + 80));
      await drag.up();
      await tester.pump();
      await tester.pump();
      await tester.pump(enter ~/ 2);
      expect(panelRect(tester).left, lessThan(stage.width - width + 80));
      await tester.pumpAndSettle();
      expect(panelRect(tester).left, stage.width - width);
      expect(closes, hasLength(3), reason: 'a short drag slides back');

      await tester.timedDragFrom(start, Offset(width * 0.6, 0), const Duration(seconds: 1));
      await tester.pumpAndSettle();
      expect(closes.last, TanreiSheetCloseReason.drag);
      expect(owner.currentState!.open, isFalse);

      owner = await openSheet();
      await tester.flingFrom(start, const Offset(60, 0), 1000);
      await tester.pumpAndSettle();
      expect(closes, hasLength(5));
      expect(closes.last, TanreiSheetCloseReason.drag);
    });

    testWidgets('SSH-6: the owner closes the sheet; a declined drag holds for a frame and slides '
        'back, an accepted one slides out from where it was', (WidgetTester tester) async {
      final List<TanreiSheetCloseReason> closes = <TanreiSheetCloseReason>[];
      final GlobalKey<SideSheetOwnerState> owner = GlobalKey<SideSheetOwnerState>();
      await pumpSheet(
        tester,
        sheetApp(
          SideSheetOwner(
            key: owner,
            variant: TanreiSideSheetVariant.modal,
            closes: closes,
            closeOnRequest: false,
          ),
        ),
      );
      final Offset start = Offset(stage.width - width / 2, 300);
      await tester.tapAt(const Offset(100, 240));
      await tester.tapAt(const Offset(100, 240));
      await tester.pumpAndSettle();
      expect(closes, hasLength(1), reason: 'one request until the owner answers');
      expect(owner.currentState!.open, isTrue);
      await tester.tapAt(const Offset(100, 240));
      await tester.pumpAndSettle();
      expect(closes, hasLength(2), reason: 'declined: the next press asks again');

      final TestGesture drag = await tester.startGesture(start);
      await drag.moveBy(const Offset(20, 0));
      await drag.moveBy(Offset(width * 0.6, 0));
      await tester.pump(const Duration(seconds: 1));
      final double released = panelRect(tester).left;
      await drag.up();
      expect(closes.last, TanreiSheetCloseReason.drag);
      await tester.pump();
      expect(panelRect(tester).left, released, reason: 'held for one frame');
      await tester.pump();
      await tester.pump(enter ~/ 2);
      expect(panelRect(tester).left, lessThan(released));
      await tester.pumpAndSettle();
      expect(panelRect(tester).left, stage.width - width);

      final GlobalKey<SideSheetOwnerState> closing = GlobalKey<SideSheetOwnerState>();
      await pumpSheet(
        tester,
        sheetApp(
          SideSheetOwner(key: closing, variant: TanreiSideSheetVariant.modal, closes: closes),
        ),
      );
      final TestGesture second = await tester.startGesture(start);
      await second.moveBy(const Offset(20, 0));
      await second.moveBy(Offset(width * 0.6, 0));
      await tester.pump(const Duration(seconds: 1));
      final double from = panelRect(tester).left;
      await second.up();
      await tester.pump();
      expect(closing.currentState!.open, isFalse);
      expect(panelRect(tester).left, moreOrLessEquals(from, epsilon: 0.5));
      await tester.pump(exit ~/ 2);
      expect(panelRect(tester).left, greaterThan(from));
      await tester.pumpAndSettle();
      expect(find.text('Filters'), findsNothing);
    });

    testWidgets('SSH-15: a dialog opened from a modal sheet stays above it, Escape closes only the '
        'dialog, and focus comes back to the sheet', (WidgetTester tester) async {
      final List<TanreiSheetCloseReason> closes = <TanreiSheetCloseReason>[];
      final GlobalKey<SideSheetOwnerState> owner = GlobalKey<SideSheetOwnerState>();
      await pumpSheet(
        tester,
        sheetApp(
          SideSheetOwner(
            key: owner,
            variant: TanreiSideSheetVariant.modal,
            initialOpen: false,
            showCloseButton: false,
            closes: closes,
            content: Builder(
              builder: (BuildContext context) => TanreiButton(
                onPressed: () => unawaited(
                  showTanreiDialog<void>(
                    context: context,
                    builder: (BuildContext dialog) => TanreiDialog(
                      headline: 'Clear filters?',
                      actions: <Widget>[
                        TanreiButton(
                          onPressed: () => Navigator.of(dialog).pop(),
                          child: const Text('Keep'),
                        ),
                      ],
                    ),
                  ),
                ),
                child: const Text('Clear'),
              ),
            ),
          ),
        ),
      );
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      owner.currentState!.setOpen(true);
      await tester.pumpAndSettle();
      await tabTimes(tester, 1);
      expect(focusedLabel(), 'Clear');
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      expect(find.text('Clear filters?'), findsOneWidget);
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(find.text('Clear filters?'), findsNothing);
      expect(closes, isEmpty);
      expect(focusedLabel(), 'Clear');
    });
  });

  group('both variants', () {
    testWidgets('SSH-3: opening moves focus to the content\'s autofocus widget, or to the sheet; '
        'closing returns it when the sheet closes, or where that element is gone to the page; a '
        'standard sheet mounted open moves none, a modal one moves focus in as if it had just '
        'opened', (WidgetTester tester) async {
      for (final TanreiSideSheetVariant variant in TanreiSideSheetVariant.core) {
        final GlobalKey<SideSheetOwnerState> owner = GlobalKey<SideSheetOwnerState>();
        await pumpSheet(
          tester,
          sheetApp(
            SideSheetOwner(
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
        expect(focusedLabel(), 'Cancel', reason: '$variant: when it opens');
        owner.currentState!.setOpen(false);
        await tester.pump();
        expect(focusedLabel(), 'Open', reason: '$variant: when it closes');
        await tester.pumpAndSettle();

        final GlobalKey<SideSheetOwnerState> plain = GlobalKey<SideSheetOwnerState>();
        await pumpSheet(
          tester,
          sheetApp(
            SideSheetOwner(
              key: plain,
              variant: variant,
              initialOpen: false,
              content: buttonsContent(),
            ),
          ),
        );
        await tabTimes(tester, 1);
        await tester.sendKeyEvent(LogicalKeyboardKey.enter);
        await tester.pump();
        await tester.pump();
        expect(focusInSheet(), isTrue);
        expect(FocusManager.instance.primaryFocus, isA<FocusScopeNode>());
        await tester.pumpAndSettle();

        final GlobalKey<SideSheetOwnerState> gone = GlobalKey<SideSheetOwnerState>();
        bool showOpen = true;
        late StateSetter setPage;
        await pumpSheet(
          tester,
          sheetApp(
            SideSheetOwner(
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
        expect(focusInSheet(), isFalse);
        await tester.pumpAndSettle();
      }

      await pumpSheet(tester, sheetApp(SideSheetOwner(key: UniqueKey())));
      expect(focusInSheet(), isFalse, reason: 'standard, mounted open');

      // A modal sheet mounted open moves focus in, as if it had just opened.
      await pumpSheet(
        tester,
        sheetApp(
          SideSheetOwner(
            key: UniqueKey(),
            variant: TanreiSideSheetVariant.modal,
            content: buttonsContent(autofocusSecond: true),
          ),
        ),
      );
      expect(focusedLabel(), 'Cancel', reason: 'modal, mounted open, with a mark');
      await pumpSheet(
        tester,
        sheetApp(
          SideSheetOwner(
            key: UniqueKey(),
            variant: TanreiSideSheetVariant.modal,
            content: buttonsContent(),
          ),
        ),
      );
      expect(focusInSheet(), isTrue, reason: 'modal, mounted open');
      expect(FocusManager.instance.primaryFocus, isA<FocusScopeNode>());
    });

    testWidgets('SSH-5: the close button is a standard, medium icon button showing the close '
        'glyph, named by closeButtonSemanticLabel; activating it asks to close with the reason '
        'close in either variant; without a name it is drawn and reported', (
      WidgetTester tester,
    ) async {
      for (final TanreiSideSheetVariant variant in TanreiSideSheetVariant.core) {
        final List<TanreiSheetCloseReason> closes = <TanreiSheetCloseReason>[];
        final GlobalKey<SideSheetOwnerState> owner = GlobalKey<SideSheetOwnerState>();
        await pumpSheet(
          tester,
          sheetApp(SideSheetOwner(key: owner, variant: variant, closes: closes)),
        );
        final TanreiIconButton button = tester.widget<TanreiIconButton>(closeButton());
        expect(button.variant, TanreiIconButtonVariant.standard);
        expect(button.size, TanreiIconButtonSize.medium);
        expect((button.icon as Text).data, tanreiCloseGlyph);
        expect(button.semanticLabel, 'Close filters');
        await tester.tap(closeButton());
        await tester.pumpAndSettle();
        expect(closes, <TanreiSheetCloseReason>[TanreiSheetCloseReason.close]);
        expect(owner.currentState!.open, isFalse);
      }
      final List<String> reports = collectMissingNames();
      await pumpSheet(
        tester,
        sheetApp(SideSheetOwner(key: UniqueKey(), closeButtonSemanticLabel: '')),
      );
      expect(closeButton(), findsOneWidget);
      expect(reports, <String>['icon-button']);

      await pumpSheet(tester, sheetApp(SideSheetOwner(key: UniqueKey(), showCloseButton: false)));
      expect(closeButton(), findsNothing);
    });

    testWidgets('SSH-7: container.width beside the end inset, the full height, the variant\'s '
        'color, elevation and start corners, the end corners square, the start edge in the '
        'variant\'s outline color; a modal sheet leaves the touch target of scrim; mirrored right '
        'to left', (WidgetTester tester) async {
      await pumpSheet(tester, sheetApp(const SideSheetOwner()));
      final TanreiSideSheetVariantTokens standard = sheetTokens.variants.standard;
      expect(panelRect(tester).size, Size(width, stage.height));
      expect(panelDecoration(tester).color, lightTheme.paint(standard.containerColor));
      expect(panelDecoration(tester).shape.radius, standard.containerShape);
      expect(edgeOf(tester).side, TanreiEdgeSide.start);
      expect(edgeOf(tester).width, sheetTokens.outlineWidth);
      expect(edgeOf(tester).color, lightTheme.paint(standard.outlineColor));

      await pumpSheet(
        tester,
        sheetApp(SideSheetOwner(key: UniqueKey(), variant: TanreiSideSheetVariant.modal)),
      );
      final TanreiSideSheetVariantTokens modal = sheetTokens.variants.modal;
      final TanreiContainerDecoration decoration = panelDecoration(tester);
      expect(decoration.color, lightTheme.paint(modal.containerColor));
      expect(decoration.shape.radius, modal.containerShape);
      final TanreiResolvedElevation elevation = TanreiResolvedElevation.resolve(
        modal.containerElevation,
        lightTheme.colors,
      );
      expect(decoration.border, elevation.ring);
      expect(decoration.boxShadow, elevation.shadows);
      expect(edgeOf(tester).color.a, 0);
      // The end corners are square: the container is drawn past the end edge and clipped there.
      expect(drawnContainerRect(tester).right, panelRect(tester).right + modal.containerShape);
      expect(panelRect(tester).height, stage.height);

      // A narrow window keeps a strip of scrim.
      const Size phone = Size(360, 640);
      await pumpSheet(
        tester,
        sheetApp(SideSheetOwner(key: UniqueKey(), variant: TanreiSideSheetVariant.modal)),
        window: phone,
      );
      expect(panelRect(tester).width, phone.width - system.measure.targetTouch);

      // The end inset: the container reaches under it.
      await pumpSheet(
        tester,
        sheetApp(
          SideSheetOwner(key: UniqueKey(), variant: TanreiSideSheetVariant.modal),
          padding: const EdgeInsets.only(right: 20, top: 24, bottom: 16),
        ),
      );
      expect(panelRect(tester).width, width + 20);
      expect(panelRect(tester).right, stage.width);
      expect(
        tester.getRect(find.text('Filters')).top,
        greaterThanOrEqualTo(24),
        reason: 'the header inside the top inset',
      );

      // Right to left: at the left edge, mirrored.
      await pumpSheet(
        tester,
        sheetApp(SideSheetOwner(key: UniqueKey()), textDirection: TextDirection.rtl),
      );
      expect(panelRect(tester).left, 0);
      expect(edgeOf(tester).textDirection, TextDirection.rtl);
      expect(
        tester.getRect(closeButton()).center.dx,
        lessThan(tester.getRect(find.text('Filters')).left),
      );
    });

    testWidgets('SSH-8: the header at least header.height, the headline padding-inline after the '
        'start edge, the close button padding-inline-end before the end edge and header.gap after '
        'the headline; the content padding-inline in, directly below the header, or padding-block '
        'below the top without one; padding-block below it without actions', (
      WidgetTester tester,
    ) async {
      await pumpSheet(tester, sheetApp(const SideSheetOwner()));
      final Rect panel = panelRect(tester);
      final double inline = sheetTokens.containerPaddingInline;
      final Rect headline = tester.getRect(find.text('Filters'));
      final Rect button = tester.getRect(
        find.descendant(of: closeButton(), matching: find.byType(TanreiFocusRing)),
      );
      expect(headline.left - panel.left, inline);
      expect(panel.right - button.right, sheetTokens.headerPaddingInlineEnd);
      expect(button.center.dy, moreOrLessEquals(sheetTokens.headerHeight / 2));
      expect(headline.center.dy, moreOrLessEquals(sheetTokens.headerHeight / 2));
      final Rect content = tester.getRect(find.text(contentText));
      expect(content.left - panel.left, inline);
      expect(panel.right - content.right, greaterThanOrEqualTo(inline));
      final Rect scroll = tester.getRect(contentScroll());
      expect(scroll.top, sheetTokens.headerHeight);
      expect(scroll.bottom, stage.height);
      expect(
        tester.widget<SingleChildScrollView>(contentScroll()).padding,
        EdgeInsetsDirectional.only(
          start: inline,
          end: inline,
          bottom: sheetTokens.containerPaddingBlock,
        ),
      );
      // The gap: the headline's box ends header.gap before the close button's.
      final Rect headlineBox = tester.getRect(
        find.ancestor(of: find.text('Filters'), matching: find.byType(Expanded)).first,
      );
      expect(button.left - headlineBox.right, sheetTokens.headerGap);

      final List<String> reports = collectMissingNames();
      await pumpSheet(
        tester,
        sheetApp(SideSheetOwner(key: UniqueKey(), headline: '', showCloseButton: false)),
      );
      expect(reports, <String>['side sheet']);
      expect(tester.getRect(contentScroll()).top, 0);
      expect(
        tester.widget<SingleChildScrollView>(contentScroll()).padding,
        EdgeInsetsDirectional.only(
          start: inline,
          end: inline,
          top: sheetTokens.containerPaddingBlock,
          bottom: sheetTokens.containerPaddingBlock,
        ),
      );
    });

    testWidgets(
      'SSH-9: the headline in headline.typescale and headline.color, wrapping and growing '
      'the header, exposed as a heading',
      (WidgetTester tester) async {
        final SemanticsHandle semantics = tester.ensureSemantics();
        await pumpSheet(tester, sheetApp(const SideSheetOwner()));
        final TextStyle style = tester
            .widget<RichText>(
              find.descendant(of: find.text('Filters'), matching: find.byType(RichText)),
            )
            .text
            .style!;
        final TextStyle expected = lightTheme.textStyle(
          sheetTokens.headlineTypescale,
          color: lightTheme.paint(sheetTokens.headlineColor),
        );
        expect(style.color, expected.color);
        expect(style.fontSize, expected.fontSize);
        expect(style.fontWeight, expected.fontWeight);
        final SemanticsData heading = nodesBelow(semanticsRoot(tester))
            .map((SemanticsNode n) => n.getSemanticsData())
            .singleWhere(
              (SemanticsData d) => d.label == 'Filters' && d.hasFlag(SemanticsFlag.isHeader),
            );
        expect(heading, isNotNull);

        const String long = 'Filters for every folder, label and account you have';
        await pumpSheet(tester, sheetApp(SideSheetOwner(key: UniqueKey(), headline: long)));
        expect(tester.getSize(find.text(long)).height, greaterThan(expected.fontSize! * 1.5));
        expect(
          tester.getRect(contentScroll()).top,
          greaterThan(sheetTokens.headerHeight),
          reason: 'the header grew',
        );
        semantics.dispose();
      },
    );

    testWidgets('SSH-10: the content in content.color and the body style; it scrolls between the '
        'header and the actions, which stay; assistive technology can scroll it', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle semantics = tester.ensureSemantics();
      await pumpSheet(
        tester,
        sheetApp(
          SideSheetOwner(
            actions: twoActions(),
            content: Text(List<String>.filled(40, contentText).join(' ')),
          ),
        ),
      );
      final TextStyle style = tester
          .widget<RichText>(
            find.descendant(of: contentScroll(), matching: find.byType(RichText)).first,
          )
          .text
          .style!;
      final TextStyle body = lightTheme.textStyle(
        system.typescale.body,
        color: lightTheme.paint(sheetTokens.contentColor),
      );
      expect(style.color, body.color);
      expect(style.fontSize, body.fontSize);
      final Rect headline = tester.getRect(find.text('Filters'));
      final Rect apply = tester.getRect(find.text('Apply'));
      final ScrollPosition position = tester
          .state<ScrollableState>(
            find.descendant(of: contentScroll(), matching: find.byType(Scrollable)),
          )
          .position;
      expect(position.maxScrollExtent, greaterThan(0));
      position.jumpTo(200);
      await tester.pump();
      expect(tester.getRect(find.text('Filters')), headline);
      expect(tester.getRect(find.text('Apply')), apply);
      expect(
        nodesBelow(
          semanticsRoot(tester),
        ).any((SemanticsNode n) => n.getSemanticsData().hasAction(SemanticsAction.scrollUp)),
        isTrue,
      );
      semantics.dispose();
    });

    testWidgets(
      'SSH-11: with actions, a divider of divider.width in divider.color across the sheet, '
      'hidden, then the buttons in a row from the start edge, actions.gap apart, '
      'actions.padding-block above and below, unchanged; stacked when they do not fit',
      (WidgetTester tester) async {
        final SemanticsHandle semantics = tester.ensureSemantics();
        await pumpSheet(tester, sheetApp(SideSheetOwner(actions: twoActions())));
        final Rect panel = panelRect(tester);
        final Finder divider = find.descendant(
          of: find.byType(TanreiSideSheet),
          matching: find.byWidgetPredicate(
            (Widget w) => w is ColoredBox && w.color == lightTheme.paint(sheetTokens.dividerColor),
          ),
        );
        final Rect line = tester.getRect(divider);
        expect(line.width, panel.width);
        expect(line.height, sheetTokens.dividerWidth);
        final Rect apply = tester.getRect(find.byType(TanreiButton).at(2));
        final Rect reset = tester.getRect(find.byType(TanreiButton).at(3));
        expect(apply.left - panel.left, sheetTokens.containerPaddingInline);
        expect(reset.left, greaterThan(apply.right));
        // The buttons' targets meet the minimum; the gap is between their visible boxes.
        expect(
          tester.widget<TanreiButton>(find.byType(TanreiButton).at(3)).variant,
          TanreiButtonVariant.text,
        );
        expect(tester.getRect(contentScroll()).bottom, line.top);
        expect(
          stage.height - line.bottom,
          greaterThanOrEqualTo(2 * sheetTokens.actionsPaddingBlock),
        );

        // Too narrow for one row: stacked from the start, in order.
        await pumpSheet(
          tester,
          sheetApp(
            SideSheetOwner(
              key: UniqueKey(),
              actions: <Widget>[
                TanreiButton(onPressed: () {}, child: const Text('Apply all filters')),
                TanreiButton(onPressed: () {}, child: const Text('Reset every filter')),
              ],
            ),
          ),
        );
        final Rect first = tester.getRect(find.text('Apply all filters'));
        final Rect second = tester.getRect(find.text('Reset every filter'));
        expect(second.top, greaterThan(first.bottom));
        semantics.dispose();
      },
    );

    testWidgets('SSH-12: a modal sheet is a modal dialog named by its headline, a standard one a '
        'region named by it; an empty headline is reported', (WidgetTester tester) async {
      final SemanticsHandle semantics = tester.ensureSemantics();
      await pumpSheet(
        tester,
        sheetApp(const SideSheetOwner(variant: TanreiSideSheetVariant.modal)),
      );
      final List<SemanticsData> dialogs = nodesWithRole(tester, SemanticsRole.dialog);
      expect(dialogs, hasLength(1));
      expect(dialogs.single.label, 'Filters');
      expect(dialogs.single.hasFlag(SemanticsFlag.scopesRoute), isTrue);
      expect(dialogs.single.hasFlag(SemanticsFlag.namesRoute), isTrue);

      await pumpSheet(tester, sheetApp(SideSheetOwner(key: UniqueKey())));
      expect(nodesWithRole(tester, SemanticsRole.dialog), isEmpty);
      final Iterable<SemanticsData> all = nodesBelow(
        semanticsRoot(tester),
      ).map((SemanticsNode n) => n.getSemanticsData());
      expect(
        all.where((SemanticsData d) => d.label == 'Filters' && !d.hasFlag(SemanticsFlag.isHeader)),
        hasLength(1),
      );
      expect(all.where((SemanticsData d) => d.label == 'Content'), hasLength(1));

      final List<String> reports = collectMissingNames();
      await pumpSheet(tester, sheetApp(SideSheetOwner(key: UniqueKey(), headline: '')));
      expect(reports, <String>['side sheet']);
      semantics.dispose();
    });

    testWidgets('SSH-13: a variant the system does not have renders with standard\'s tokens, is '
        'reported, and behaves as standard', (WidgetTester tester) async {
      final List<String> reports = collectUnknownValues();
      await pumpSheet(
        tester,
        sheetApp(const SideSheetOwner(variant: TanreiSideSheetVariant('detached'))),
      );
      expect(reports, contains('side-sheet variant "detached" -> standard'));
      expect(
        panelDecoration(tester).color,
        lightTheme.paint(sheetTokens.variants.standard.containerColor),
      );
      expect(scrimFinder(), findsNothing);
      expect(tester.getSize(find.byKey(const ValueKey<String>('page'))).width, stage.width - width);
    });

    testWidgets('SSH-14: enlarged text keeps the width, grows the header with the headline and '
        'scrolls the content; the close button is the icon button\'s own size', (
      WidgetTester tester,
    ) async {
      await pumpSheet(
        tester,
        sheetApp(
          SideSheetOwner(content: Text(List<String>.filled(10, contentText).join(' '))),
          textScaler: const TextScaler.linear(2),
        ),
      );
      expect(panelRect(tester).width, width);
      expect(tester.getRect(contentScroll()).top, greaterThanOrEqualTo(sheetTokens.headerHeight));
      final ScrollPosition position = tester
          .state<ScrollableState>(
            find.descendant(of: contentScroll(), matching: find.byType(Scrollable)),
          )
          .position;
      expect(position.maxScrollExtent, greaterThan(0));
      final TanreiIconButtonSizeTokens medium = system.iconButton.sizes.medium;
      expect(
        tester.getSize(find.descendant(of: closeButton(), matching: find.byType(TanreiFocusRing))),
        Size.square(medium.containerSize),
      );
    });

    testWidgets('guidelines: side sheet', (WidgetTester tester) async {
      final SemanticsHandle semantics = tester.ensureSemantics();
      for (final TanreiSideSheetVariant variant in TanreiSideSheetVariant.core) {
        for (final TanreiThemeData theme in <TanreiThemeData>[
          TanreiThemeData.light,
          TanreiThemeData.dark,
        ]) {
          await pumpSheet(
            tester,
            sheetApp(
              SideSheetOwner(key: UniqueKey(), variant: variant, actions: twoActions()),
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
      expect(sheetTokens.containerWidth, 320);
      expect(sheetTokens.headerHeight, 64);
      expect(sheetTokens.containerPaddingInline, 24);
      expect(sheetTokens.variants.modal.containerShape, 12);
      expect(sheetTokens.variants.standard.containerShape, 0);
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": the sheet draws that system\'s width, colors and headline', (
        WidgetTester tester,
      ) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        final TanreiSideSheetTokens tokens = shipped.sideSheet;
        await pumpSheet(
          tester,
          sheetApp(const SideSheetOwner(variant: TanreiSideSheetVariant.modal), theme: theme),
        );
        expect(panelRect(tester).width, tokens.containerWidth);
        expect(panelDecoration(tester).color, theme.paint(tokens.variants.modal.containerColor));
        expect(panelDecoration(tester).shape.smoothing, shipped.shape.cornerSmoothing);
        expect(
          tester
              .widget<RichText>(
                find.descendant(of: find.text('Filters'), matching: find.byType(RichText)),
              )
              .text
              .style!
              .color,
          theme.paint(tokens.headlineColor),
        );
      });
    }
  });

  group('goldens', () {
    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'standard',
        'standard-actions',
        'modal',
      ]);
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          surface: sideSheetGoldenSurface,
          child: fixtureSideSheet(fixture),
          file: 'goldens/side_sheet/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: the modal sheet shows the
    // preset's scrim, container, corners, elevation, headline, close button and actions at once.
    const String recorded = 'modal';
    for (final TanreiSystem preset in <TanreiSystem>[m3LikeSystem, cupertinoSystem]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: sideSheetGoldenSurface,
          child: fixtureSideSheet(
            fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded),
          ),
          file: 'goldens/side_sheet/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
