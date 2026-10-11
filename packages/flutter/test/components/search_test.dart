import 'dart:ui' show SemanticsInputType;

import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_expressive_like.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

import '../systems.dart';
import 'fixture_golden.dart';

const TanreiSystem system = tanreiSystem;
final TanreiSearchTokens searchTokens = system.search;
final TanreiSearchConditionTokens standard = searchTokens.conditions.standard;
final TanreiColors light = system.schemes.light;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// SRC-1's bar width, SRC-7's docked stage and SRC-9's window.
const double barWidth = 328;
const Size barStage = Size(360, 72);
const Size dockedStage = Size(360, 320);
const Size fullScreenStage = Size(360, 480);

/// What the owner of a search saw: `input inv`, `submit inv`, `select invoices`,
/// `toggle true`, `toggle false escape`.
typedef Log = List<String>;

const List<TanreiSearchSuggestion> threeSuggestions = <TanreiSearchSuggestion>[
  TanreiSearchSuggestion(value: 'invoices', headline: 'invoices', leadingIcon: 'history'),
  TanreiSearchSuggestion(
    value: 'invoice template',
    headline: 'invoice template',
    leadingIcon: 'history',
  ),
  TanreiSearchSuggestion(
    value: 'folder:invoices',
    headline: 'Invoices',
    supportingText: 'Folder · 24 messages',
    leadingIcon: 'folder',
  ),
];

String _reason(TanreiSearchCloseReason? r) => r == null ? '' : ' ${r.name}';

/// Keeps a search's controller as a product does, and logs its events.
class SearchOwner extends StatefulWidget {
  const SearchOwner({
    super.key,
    this.log,
    this.text = '',
    this.expanded = false,
    this.presentation = TanreiSearchPresentation.docked,
    this.enabled = true,
    this.suggestions = threeSuggestions,
    this.leading,
    this.trailing = const <Widget>[],
    this.child,
    this.clearLabel = 'Clear search',
    this.backLabel = 'Back',
    this.label = 'Search mail',
    this.inPlace = false,
    this.controller,
  });

  /// Where the events go; none kept when null.
  final Log? log;
  final String text;
  final bool expanded;
  final TanreiSearchPresentation presentation;
  final bool enabled;
  final List<TanreiSearchSuggestion> suggestions;
  final Widget? leading;
  final List<Widget> trailing;
  final Widget? child;
  final String clearLabel;
  final String backLabel;
  final String label;
  final bool inPlace;
  final TanreiSearchController? controller;

  @override
  State<SearchOwner> createState() => SearchOwnerState();
}

class SearchOwnerState extends State<SearchOwner> {
  final Log _own = <String>[];

  Log get log => widget.log ?? _own;
  late final TanreiSearchController controller =
      widget.controller ?? TanreiSearchController(text: widget.text);

  @override
  void initState() {
    super.initState();
    if (widget.expanded) {
      controller.expand();
    }
  }

  @override
  void dispose() {
    if (widget.controller == null) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => TanreiSearch(
    controller: controller,
    semanticLabel: widget.label,
    hintText: 'Search mail',
    presentation: widget.presentation,
    enabled: widget.enabled,
    clearLabel: widget.clearLabel,
    backLabel: widget.backLabel,
    leading: widget.leading,
    trailing: widget.trailing,
    suggestions: widget.suggestions,
    inPlace: widget.inPlace,
    onChanged: (String v) => log.add('input $v'),
    onSubmitted: (String v) => log.add('submit $v'),
    onSelected: (String v) => log.add('select $v'),
    onExpandedChanged: (bool e, TanreiSearchCloseReason? r) => log.add('toggle $e${_reason(r)}'),
    child: widget.child,
  );
}

/// A search in an app with a navigator and an overlay: the bar 328 wide, 16 from the top.
Widget searchApp(
  Widget search, {
  TanreiThemeData theme = lightTheme,
  TextDirection textDirection = TextDirection.ltr,
  bool disableAnimations = false,
  TextScaler textScaler = TextScaler.noScaling,
  EdgeInsets padding = EdgeInsets.zero,
  Widget? after,
  Alignment alignment = Alignment.topCenter,
}) => WidgetsApp(
  color: theme.colors.primary,
  debugShowCheckedModeBanner: false,
  builder: (BuildContext context, Widget? child) => MediaQuery(
    data: MediaQuery.of(
      context,
    ).copyWith(disableAnimations: disableAnimations, textScaler: textScaler, padding: padding),
    child: TanreiTheme(
      data: theme,
      child: Directionality(textDirection: textDirection, child: child!),
    ),
  ),
  pageRouteBuilder: <T>(RouteSettings settings, WidgetBuilder builder) => PageRouteBuilder<T>(
    settings: settings,
    pageBuilder: (BuildContext context, _, _) => builder(context),
  ),
  home: ColoredBox(
    color: theme.colors.surface,
    child: FocusScope(
      autofocus: true,
      child: Align(
        alignment: alignment,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              SizedBox(width: barWidth, child: search),
              ?after,
            ],
          ),
        ),
      ),
    ),
  ),
);

Future<void> pumpSearch(
  WidgetTester tester,
  Widget search, {
  TanreiThemeData theme = lightTheme,
  TextDirection textDirection = TextDirection.ltr,
  bool disableAnimations = false,
  TextScaler textScaler = TextScaler.noScaling,
  Widget? after,
  Alignment alignment = Alignment.topCenter,
}) async {
  tester.view.physicalSize = const Size(400, 600) * 2;
  tester.view.devicePixelRatio = 2;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    searchApp(
      // A new search each time: its controller starts from the owner's props.
      KeyedSubtree(key: UniqueKey(), child: search),
      theme: theme,
      textDirection: textDirection,
      disableAnimations: disableAnimations,
      textScaler: textScaler,
      after: after,
      alignment: alignment,
    ),
  );
  await tester.pumpAndSettle();
}

Finder get searchFinder => find.byType(TanreiSearch);

/// The bar's container.
Finder get barFinder =>
    find.descendant(of: searchFinder, matching: find.byType(TanreiControlContainer)).first;

Rect barRect(WidgetTester tester) => tester.getRect(barFinder);

TanreiControlContainer barContainer(WidgetTester tester) =>
    tester.widget<TanreiControlContainer>(barFinder);

EditableText barInput(WidgetTester tester) => tester.widget<EditableText>(
  find.descendant(of: searchFinder, matching: find.byType(EditableText)).first,
);

FocusNode inputNode(WidgetTester tester) => barInput(tester).focusNode;

Finder iconButton(String label) =>
    find.byWidgetPredicate((Widget w) => w is TanreiIconButton && w.semanticLabel == label);

Rect visibleRectOf(WidgetTester tester, Finder button) => tester.getRect(
  find.descendant(of: button, matching: find.byType(TanreiControlContainer)).first,
);

Finder get viewPosition =>
    find.byWidgetPredicate((Widget w) => w.runtimeType.toString() == '_ViewPosition');

RenderTanreiSearchViewPosition viewRender(WidgetTester tester) =>
    tester.allRenderObjects.whereType<RenderTanreiSearchViewPosition>().first;

Future<void> typeText(WidgetTester tester, String text) async {
  await tester.enterText(find.byType(EditableText).first, text);
  await tester.pumpAndSettle();
}

List<String> collectIgnored() {
  final List<String> reports = <String>[];
  final TanreiIgnoredValueReporter previous = debugTanreiReportIgnoredValue;
  debugTanreiReportIgnoredValue = (String component, String prop, String why, Widget widget) =>
      reports.add('$component $prop');
  addTearDown(() => debugTanreiReportIgnoredValue = previous);
  return reports;
}

String focusedDescription() {
  final FocusNode? node = FocusManager.instance.primaryFocus;
  final BuildContext? context = node?.context;
  if (context == null) {
    return '';
  }
  final TanreiIconButton? button = context.findAncestorWidgetOfExactType<TanreiIconButton>();
  if (button != null) {
    return button.semanticLabel;
  }
  if (context.findAncestorWidgetOfExactType<EditableText>() != null ||
      context.widget is EditableText) {
    return 'input';
  }
  return node.toString();
}

/// The fixture's search, as the gallery draws it (in place for an open view), with the icon
/// buttons of its slots.
Widget fixtureSearch(Map<String, dynamic> fixture) {
  final Map<String, dynamic> p = fixture['props'] as Map<String, dynamic>;
  final List<Map<String, dynamic>> items = ((fixture['items'] as List<dynamic>?) ?? <dynamic>[])
      .cast<Map<String, dynamic>>();
  const Map<String, int> glyphs = <String, int>{
    'menu': 0xe5d2,
    'mic': 0xe029,
    'account_circle': 0xe853,
  };
  final List<Widget> leading = fixtureSlot('search', fixture, 'leading', glyphs: glyphs);
  return SearchOwner(
    text: p['value'] as String? ?? '',
    expanded: p['expanded'] == true,
    presentation: TanreiSearchPresentation.fromName(p['presentation'] as String? ?? 'docked'),
    enabled: p['disabled'] != true,
    label: p['label'] as String? ?? '',
    clearLabel: p['clearLabel'] as String? ?? '',
    backLabel: p['backLabel'] as String? ?? '',
    leading: leading.firstOrNull,
    trailing: fixtureSlot('search', fixture, 'trailing', glyphs: glyphs),
    inPlace: true,
    suggestions: <TanreiSearchSuggestion>[
      for (final Map<String, dynamic> item in items)
        TanreiSearchSuggestion(
          value: (item['props'] as Map<String, dynamic>)['value'] as String? ?? '',
          headline: (item['props'] as Map<String, dynamic>)['headline'] as String? ?? '',
          supportingText:
              (item['props'] as Map<String, dynamic>)['supportingText'] as String? ?? '',
          leadingIcon: switch ((item['props'] as Map<String, dynamic>)['leadingIcon']) {
            'history' => '\u{e889}',
            'folder' => '\u{e2c7}',
            final String other => other,
            _ => '',
          },
        ),
    ],
  );
}

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('bar', () {
    testWidgets('SRC-1: the bar is as wide as its layout, container.height high, in the resting '
        'container color, elevation and corners; the glyph padding-inline from the start, the '
        'input taking the rest, the buttons at padding-inline-with-button from the end', (
      WidgetTester tester,
    ) async {
      await pumpSearch(tester, const SearchOwner());
      final Rect bar = barRect(tester);
      expect(bar.size, Size(barWidth, searchTokens.containerHeight));
      final TanreiControlContainer c = barContainer(tester);
      expect(c.visuals.container, lightTheme.paint(standard.enabled.containerColor));
      expect(c.visuals.container, light.surfaceContainerHighest);
      expect(c.shape.radius, searchTokens.containerShape);
      final Rect glyph = tester.getRect(
        find.descendant(of: searchFinder, matching: find.byType(TanreiControlIcon)).first,
      );
      expect(glyph.left - bar.left, searchTokens.containerPaddingInline);
      expect(glyph.center.dy, moreOrLessEquals(bar.center.dy));
      final Rect input = tester.getRect(find.byType(EditableText).first);
      expect(input.left - glyph.right, moreOrLessEquals(searchTokens.containerGap, epsilon: 0.5));
      expect(
        bar.right - input.right,
        moreOrLessEquals(searchTokens.containerPaddingInline, epsilon: 0.5),
      );

      // A value, a leading and two trailing buttons.
      await pumpSearch(
        tester,
        SearchOwner(
          text: 'invoice',
          leading: TanreiIconButton(onPressed: () {}, icon: const Text('m'), semanticLabel: 'Menu'),
          trailing: <Widget>[
            TanreiIconButton(onPressed: () {}, icon: const Text('v'), semanticLabel: 'Voice'),
            TanreiIconButton(onPressed: () {}, icon: const Text('a'), semanticLabel: 'Account'),
          ],
        ),
      );
      final Rect bar2 = barRect(tester);
      expect(bar2.height, searchTokens.containerHeight);
      final Rect menu = visibleRectOf(tester, iconButton('Menu'));
      final Rect clear = visibleRectOf(tester, iconButton('Clear search'));
      final Rect voice = visibleRectOf(tester, iconButton('Voice'));
      final Rect account = visibleRectOf(tester, iconButton('Account'));
      expect(menu.left - bar2.left, searchTokens.containerPaddingInlineWithButton);
      expect(bar2.right - account.right, searchTokens.containerPaddingInlineWithButton);
      expect(voice.left - clear.right, searchTokens.containerGap);
      expect(account.left - voice.right, searchTokens.containerGap);
      for (final Rect r in <Rect>[menu, clear, voice, account]) {
        expect(r.center.dy, moreOrLessEquals(bar2.center.dy));
      }
    });

    testWidgets('SRC-1: right to left the row is mirrored', (WidgetTester tester) async {
      await pumpSearch(tester, const SearchOwner(), textDirection: TextDirection.rtl);
      final Rect bar = barRect(tester);
      final Rect glyph = tester.getRect(
        find.descendant(of: searchFinder, matching: find.byType(TanreiControlIcon)).first,
      );
      expect(bar.right - glyph.right, searchTokens.containerPaddingInline);
    });

    testWidgets('SRC-2: the search glyph is drawn at leading-icon.size in the glyph color, '
        'unselected, and hidden from assistive technology', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await pumpSearch(tester, const SearchOwner());
      final TanreiControlIcon glyph = tester.widget<TanreiControlIcon>(
        find.descendant(of: searchFinder, matching: find.byType(TanreiControlIcon)).first,
      );
      expect(glyph.size, searchTokens.leadingIconSize);
      expect(glyph.selected, isFalse);
      expect(glyph.color, lightTheme.paint(standard.enabled.leadingIconColor));
      expect(find.bySemanticsLabel(tanreiSearchGlyph), findsNothing);
      handle.dispose();
    });

    testWidgets('SRC-3: the value in the input style and color, the placeholder while empty, the '
        'caret color and the text field\'s selection color', (WidgetTester tester) async {
      await pumpSearch(tester, const SearchOwner());
      final Text hint = tester.widget<Text>(find.text('Search mail'));
      expect(hint.style!.color, lightTheme.paint(standard.enabled.placeholderColor));
      expect(hint.style!.fontSize, searchTokens.inputTypescale.size);
      final EditableText input = barInput(tester);
      expect(input.style.color, lightTheme.paint(standard.enabled.inputColor));
      expect(input.cursorColor, lightTheme.paint(standard.enabled.caretColor));
      expect(input.selectionColor, lightTheme.paint(system.textField.selectionColor));
      expect(input.maxLines, 1);
      await typeText(tester, 'invoice');
      expect(find.text('Search mail'), findsNothing);
    });

    testWidgets('SRC-4: the input edits in EditableText with the search action and a general '
        'keyboard; input once per change, none when the product sets the value; typed text keeps '
        'its own direction', (WidgetTester tester) async {
      final Log log = <String>[];
      final TanreiSearchController controller = TanreiSearchController();
      addTearDown(controller.dispose);
      await pumpSearch(
        tester,
        SearchOwner(log: log, controller: controller, suggestions: const []),
      );
      expect(barInput(tester).textInputAction, TextInputAction.search);
      expect(barInput(tester).keyboardType, TextInputType.text);
      await typeText(tester, 'in');
      expect(log, <String>['input in', 'toggle true']);
      log.clear();
      controller.text = 'set by the product';
      await tester.pumpAndSettle();
      expect(log, isEmpty);
      await typeText(tester, 'سلام');
      expect(barInput(tester).textDirection, TextDirection.rtl);
    });

    testWidgets('SRC-5: a press on the bar focuses the input and opens the view; Tab focus does '
        'not; typing and Down Arrow open it', (WidgetTester tester) async {
      final Log log = <String>[];
      await pumpSearch(tester, SearchOwner(log: log));
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pumpAndSettle();
      expect(inputNode(tester).hasFocus, isTrue);
      expect(log, isEmpty, reason: 'Tab focus does not open the view');
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pumpAndSettle();
      expect(log, <String>['toggle true']);
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      log.clear();
      // A press on the bar (on the glyph, outside the input).
      await pumpSearch(tester, SearchOwner(log: log));
      final Rect bar = barRect(tester);
      await tester.tapAt(bar.centerLeft + const Offset(14, 0));
      await tester.pumpAndSettle();
      expect(inputNode(tester).hasFocus, isTrue);
      expect(log, <String>['toggle true']);
      expect(viewPosition, findsOneWidget);
    });

    testWidgets('SRC-6: Escape, a press outside, Tab and focus leaving close a docked view with '
        'that reason; the value stays', (WidgetTester tester) async {
      final Log log = <String>[];
      Future<void> open() async {
        await pumpSearch(
          tester,
          SearchOwner(log: log, text: 'inv'),
          after: TanreiButton(onPressed: () {}, child: const Text('After')),
        );
        await tester.tap(find.byType(EditableText).first);
        await tester.pumpAndSettle();
        log.clear();
      }

      await open();
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(log, <String>['toggle false escape']);
      expect(barInput(tester).controller.text, 'inv');
      expect(viewPosition, findsNothing);

      await open();
      await tester.tapAt(const Offset(390, 590));
      await tester.pumpAndSettle();
      expect(log, <String>['toggle false outside']);

      await open();
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pumpAndSettle();
      expect(log, <String>['toggle false tab']);
      expect(focusedDescription(), 'Clear search', reason: 'Tab moves on as it would have');

      await open();
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      expect(log, <String>['toggle false focusOut']);

      await open();
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(log, <String>['toggle false back']);
      expect(find.byType(TanreiSearch), findsOneWidget, reason: 'the route did not pop');
    });

    testWidgets('SRC-10: the clear button shows while there is a value; it empties it, emits input '
        'once, returns focus to the input and neither opens nor closes the view', (
      WidgetTester tester,
    ) async {
      final Log log = <String>[];
      await pumpSearch(tester, SearchOwner(log: log));
      expect(iconButton('Clear search'), findsNothing);
      await typeText(tester, 'inv');
      expect(iconButton('Clear search'), findsOneWidget);
      final TanreiIconButton clear = tester.widget<TanreiIconButton>(iconButton('Clear search'));
      expect(clear.size, TanreiIconButtonSize.small);
      expect(clear.variant, TanreiIconButtonVariant.standard);
      log.clear();
      await tester.tap(iconButton('Clear search'));
      await tester.pumpAndSettle();
      expect(log, <String>['input ']);
      expect(barInput(tester).controller.text, isEmpty);
      expect(inputNode(tester).hasFocus, isTrue);
      expect(iconButton('Clear search'), findsNothing);
    });

    testWidgets('SRC-10: a clear button without a name still shows, and is reported once', (
      WidgetTester tester,
    ) async {
      final List<String> missing = collectMissingNames();
      await pumpSearch(tester, const SearchOwner(text: 'inv', clearLabel: ''));
      expect(iconButton(''), findsOneWidget);
      await tester.pump();
      expect(missing, unorderedEquals(<String>['icon-button', 'search clear button']));
    });

    testWidgets('SRC-12: collapsed, Escape with a value clears it and emits input; with none it '
        'passes on', (WidgetTester tester) async {
      final Log log = <String>[];
      await pumpSearch(tester, SearchOwner(log: log, text: 'inv'));
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(log, <String>['input ']);
      expect(barInput(tester).controller.text, isEmpty);
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(log, <String>['input ']);
    });

    testWidgets('SRC-13: the action key emits submit with the value, then closes the view', (
      WidgetTester tester,
    ) async {
      final Log log = <String>[];
      await pumpSearch(tester, SearchOwner(log: log));
      await typeText(tester, 'inv');
      log.clear();
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();
      expect(log, <String>['submit inv', 'toggle false submit']);
      expect(inputNode(tester).hasFocus, isTrue);
      // Collapsed: submit alone.
      log.clear();
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();
      expect(log, <String>['submit inv']);
    });
  });

  group('docked view', () {
    testWidgets(
      'SRC-7: the view opens in the overlay, view.offset below the bar, as wide as it and '
      'aligned with it, in the view color, elevation and corners; none without content',
      (WidgetTester tester) async {
        await pumpSearch(tester, const SearchOwner());
        await typeText(tester, 'inv');
        final Rect bar = barRect(tester);
        final RenderTanreiSearchViewPosition view = viewRender(tester);
        final Offset origin = view.localToGlobal(Offset.zero);
        final Rect rect = view.viewRect.shift(origin);
        expect(rect.top - bar.bottom, searchTokens.viewOffset);
        expect(rect.left, bar.left);
        expect(rect.width, bar.width);
        expect(view.isAbove, isFalse);
        final TanreiContainerDecoration decoration =
            tester
                    .widget<DecoratedBox>(
                      find
                          .descendant(
                            of: viewPosition,
                            matching: find.byWidgetPredicate(
                              (Widget w) =>
                                  w is DecoratedBox && w.decoration is TanreiContainerDecoration,
                            ),
                          )
                          .first,
                    )
                    .decoration
                as TanreiContainerDecoration;
        expect(decoration.color, light.surfaceBright);
        expect(decoration.shape.radius, searchTokens.viewContainerShape);
        final TanreiResolvedElevation level = TanreiResolvedElevation.resolve(
          searchTokens.viewContainerElevation,
          light,
        );
        expect(decoration.boxShadow, level.shadows.isEmpty ? isNull : level.shadows);

        // No content: no view, still expanded.
        final Log log = <String>[];
        await pumpSearch(
          tester,
          SearchOwner(log: log, suggestions: const <TanreiSearchSuggestion>[]),
        );
        await typeText(tester, 'inv');
        expect(log, contains('toggle true'));
        expect(viewPosition, findsNothing);
      },
    );

    testWidgets('SRC-7: with too little room below and more above, the view goes above the bar and '
        'its height is limited to the room', (WidgetTester tester) async {
      await pumpSearch(tester, const SearchOwner(), alignment: Alignment.bottomCenter);
      await typeText(tester, 'inv');
      final RenderTanreiSearchViewPosition view = viewRender(tester);
      expect(view.isAbove, isTrue);
      final Rect rect = view.viewRect.shift(view.localToGlobal(Offset.zero));
      expect(barRect(tester).top - rect.bottom, searchTokens.viewOffset);
      expect(rect.top, greaterThanOrEqualTo(searchTokens.viewViewportMargin));
    });

    testWidgets('SRC-8: focus stays in the input while the view is open, and a press on a '
        'suggestion does not take it', (WidgetTester tester) async {
      final Log log = <String>[];
      await pumpSearch(tester, SearchOwner(log: log));
      await typeText(tester, 'inv');
      expect(inputNode(tester).hasFocus, isTrue);
      await tester.tap(find.text('invoice template'));
      await tester.pumpAndSettle();
      expect(inputNode(tester).hasFocus, isTrue);
      expect(log.last, 'toggle false select');
    });

    testWidgets('SRC-14: Down Arrow makes the next suggestion active (staying on the last), Up '
        'Arrow the previous (none from the first); focus stays in the input; typing leaves none '
        'active; Enter chooses the active one', (WidgetTester tester) async {
      final Log log = <String>[];
      await pumpSearch(tester, SearchOwner(log: log));
      await typeText(tester, 'inv');
      bool active(String headline) => tester
          .widgetList<TanreiFocusRing>(
            find.ancestor(of: find.text(headline), matching: find.byType(TanreiFocusRing)),
          )
          .any((TanreiFocusRing r) => r.visible);
      for (int i = 0; i < 4; i++) {
        await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
        await tester.pumpAndSettle();
      }
      expect(active('Invoices'), isTrue, reason: 'stays on the last');
      expect(inputNode(tester).hasFocus, isTrue);
      for (int i = 0; i < 2; i++) {
        await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
        await tester.pumpAndSettle();
      }
      expect(active('invoices'), isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
      await tester.pumpAndSettle();
      expect(active('invoices'), isFalse, reason: 'none from the first');
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pumpAndSettle();
      expect(active('invoices'), isTrue);
      await typeText(tester, 'invo');
      expect(active('invoices'), isFalse, reason: 'typing leaves none active');
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pumpAndSettle();
      log.clear();
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      expect(log, <String>['select invoice template', 'toggle false select']);
    });

    testWidgets('SRC-15: a press on a suggestion emits select with its value, then closes; the '
        'value is not changed', (WidgetTester tester) async {
      final Log log = <String>[];
      await pumpSearch(tester, SearchOwner(log: log));
      await typeText(tester, 'inv');
      log.clear();
      await tester.tap(find.text('Invoices'));
      await tester.pumpAndSettle();
      expect(log, <String>['select folder:invoices', 'toggle false select']);
      expect(barInput(tester).controller.text, 'inv');
    });

    testWidgets('SRC-16: a suggestion row is at least the row height and the touch target, padded '
        'at its sides, its icon column kept in every row, the headline and supporting text in '
        'their styles', (WidgetTester tester) async {
      await pumpSearch(
        tester,
        const SearchOwner(
          suggestions: <TanreiSearchSuggestion>[
            TanreiSearchSuggestion(value: 'a', headline: 'alpha', leadingIcon: 'h'),
            TanreiSearchSuggestion(value: 'b', headline: 'beta', supportingText: 'second'),
          ],
        ),
      );
      await typeText(tester, 'a');
      final Rect alpha = tester.getRect(
        find.ancestor(of: find.text('alpha'), matching: find.byType(TanreiItemRow)),
      );
      expect(
        alpha.height,
        searchTokens.suggestionContainerHeight > system.measure.targetTouch
            ? searchTokens.suggestionContainerHeight
            : system.measure.targetTouch,
      );
      final Rect a = tester.getRect(find.text('alpha'));
      final Rect b = tester.getRect(find.text('beta'));
      expect(a.left, b.left, reason: 'headlines align: the icon column is kept');
      expect(
        a.left - alpha.left,
        searchTokens.suggestionContainerPaddingInline +
            searchTokens.suggestionLeadingIconSize +
            searchTokens.suggestionContainerGap,
      );
      expect(
        tester.widget<Text>(find.text('alpha')).style!.fontSize,
        searchTokens.suggestionHeadlineTypescale.size,
      );
      expect(
        tester.widget<Text>(find.text('second')).style!.fontSize,
        searchTokens.suggestionSupportingTextTypescale.size,
      );
    });

    testWidgets('SRC-17: a hovered, active or pressed suggestion draws that state\'s tokens; the '
        'active one takes the focused tokens and the ring inside its row; a pointer over it does '
        'not make it active', (WidgetTester tester) async {
      await pumpSearch(tester, const SearchOwner());
      await typeText(tester, 'inv');
      DecoratedBox rowBox(String headline) => tester.widget<DecoratedBox>(
        find
            .ancestor(
              of: find.text(headline),
              matching: find.byWidgetPredicate(
                (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
              ),
            )
            .first,
      );
      Color? colorOf(String headline) =>
          (rowBox(headline).decoration as TanreiContainerDecoration).color;
      expect(colorOf('invoices'), isNull);
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(location: Offset.zero);
      addTearDown(mouse.removePointer);
      await mouse.moveTo(tester.getCenter(find.text('invoices')));
      await tester.pumpAndSettle();
      expect(colorOf('invoices'), lightTheme.paint(standard.hovered.suggestionContainerColor));
      expect(
        tester
            .widgetList<TanreiFocusRing>(
              find.ancestor(of: find.text('invoices'), matching: find.byType(TanreiFocusRing)),
            )
            .any((TanreiFocusRing r) => r.visible),
        isFalse,
        reason: 'hover is not active',
      );
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pumpAndSettle();
      expect(colorOf('invoices'), lightTheme.paint(standard.focused.suggestionContainerColor));
      final TanreiFocusRing ring = tester
          .widgetList<TanreiFocusRing>(
            find.ancestor(of: find.text('invoices'), matching: find.byType(TanreiFocusRing)),
          )
          .firstWhere((TanreiFocusRing r) => r.visible);
      expect(ring.inside, isTrue);
    });
  });

  group('full-screen view', () {
    testWidgets('SRC-9: the view opens over the whole window as a modal route: a header with the '
        'back button, the input and the clear button, a divider, the suggestions; focus moves to '
        'the header\'s input and returns to the bar without opening it again', (
      WidgetTester tester,
    ) async {
      final Log log = <String>[];
      await pumpSearch(
        tester,
        SearchOwner(log: log, text: 'inv', presentation: TanreiSearchPresentation.fullScreen),
      );
      await tester.tap(find.byType(EditableText).first);
      await tester.pumpAndSettle();
      expect(log, <String>['toggle true']);
      final Finder view = find.byWidgetPredicate(
        (Widget w) => w is Semantics && (w.properties.scopesRoute ?? false),
      );
      expect(view, findsOneWidget);
      expect(tester.getRect(view), Offset.zero & const Size(400, 600));
      expect(iconButton('Back'), findsOneWidget);
      expect(iconButton('Clear search'), findsNWidgets(2));
      final Rect header = tester.getRect(
        find.ancestor(of: iconButton('Back'), matching: find.byType(ConstrainedBox)).first,
      );
      expect(header.height, greaterThanOrEqualTo(searchTokens.headerHeight));
      expect(find.text('invoices'), findsOneWidget);
      // The header's input has focus, the caret at the end.
      final EditableText headerInput = tester.widget<EditableText>(
        find.descendant(of: view, matching: find.byType(EditableText)),
      );
      expect(headerInput.focusNode.hasFocus, isTrue);
      expect(headerInput.controller.selection, const TextSelection.collapsed(offset: 3));
      // The back button closes it; focus returns to the bar, which does not open again.
      log.clear();
      await tester.tap(iconButton('Back'));
      await tester.pumpAndSettle();
      expect(log, <String>['toggle false back']);
      expect(view, findsNothing);
      expect(inputNode(tester).hasFocus, isTrue);
      expect(log, hasLength(1));
    });

    testWidgets('SRC-11: the back button is a medium standard icon button, mirrored right to left; '
        'without a name it is still drawn and reported', (WidgetTester tester) async {
      final List<String> missing = collectMissingNames();
      await pumpSearch(
        tester,
        const SearchOwner(presentation: TanreiSearchPresentation.fullScreen, backLabel: ''),
        textDirection: TextDirection.rtl,
      );
      await tester.tap(find.byType(EditableText).first);
      await tester.pumpAndSettle();
      final TanreiIconButton back = tester.widget<TanreiIconButton>(iconButton(''));
      expect(back.size, TanreiIconButtonSize.medium);
      expect(back.variant, TanreiIconButtonVariant.standard);
      expect(find.descendant(of: iconButton(''), matching: find.byType(Transform)), findsWidgets);
      expect(missing, contains('search back button'));
    });

    testWidgets('SRC-6, SRC-9: the platform\'s back closes the full-screen view with the reason '
        'back', (WidgetTester tester) async {
      final Log log = <String>[];
      await pumpSearch(
        tester,
        SearchOwner(log: log, presentation: TanreiSearchPresentation.fullScreen),
      );
      await tester.tap(find.byType(EditableText).first);
      await tester.pumpAndSettle();
      log.clear();
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(log, <String>['toggle false back']);
      expect(inputNode(tester).hasFocus, isTrue);
    });
  });

  group('states', () {
    testWidgets('SRC-18: focused by pointer or keyboard, the bar keeps its resting container and '
        'draws its focused outline, thicker, in focus-ring, and no ring around it; hovered, the '
        'hovered container; changes ease over the state motion', (WidgetTester tester) async {
      await pumpSearch(tester, const SearchOwner());
      await tester.tap(find.byType(EditableText).first);
      await tester.pumpAndSettle();
      TanreiControlContainer c = barContainer(tester);
      expect(c.visuals.container, lightTheme.paint(standard.focused.containerColor));
      expect(c.visuals.container, lightTheme.paint(standard.enabled.containerColor));
      expect(c.visuals.outline, lightTheme.paint(standard.focused.outlineColor));
      expect(c.visuals.outline, light.focusRing);
      expect(c.outlineWidth, searchTokens.focused.outlineWidth);
      expect(c.outlineWidth, greaterThan(searchTokens.outlineWidth));
      expect(
        find.descendant(of: searchFinder, matching: find.byType(TanreiFocusRing)),
        findsWidgets,
      );
      expect(
        tester
            .widgetList<TanreiFocusRing>(
              find.descendant(of: searchFinder, matching: find.byType(TanreiFocusRing)),
            )
            .where((TanreiFocusRing r) => r.visible),
        isEmpty,
        reason: 'no ring around the bar under the ring style',
      );
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(location: Offset.zero);
      addTearDown(mouse.removePointer);
      await mouse.moveTo(barRect(tester).center);
      await tester.pump();
      await tester.pump(Duration(milliseconds: searchTokens.motionStateDuration ~/ 3));
      c = barContainer(tester);
      final Color hovered = lightTheme.paint(standard.hovered.containerColor);
      expect(c.visuals.container, isNot(hovered), reason: 'easing');
      await tester.pumpAndSettle();
      expect(barContainer(tester).visuals.container, hovered);
    });

    testWidgets('SRC-18, SRC-21: WHERE the focus style is glow, the focused bar also draws the '
        'glow; the corners take the system\'s smoothing', (WidgetTester tester) async {
      final TanreiSystem glow = system.copyWith(
        behavior: system.behavior.copyWith(focusStyle: TanreiFocusStyle.glow),
        shape: system.shape.copyWith(cornerSmoothing: 0.6),
      );
      await pumpSearch(tester, const SearchOwner(), theme: TanreiThemeData(system: glow));
      expect(barContainer(tester).shape.smoothing, 0.6);
      await tester.tap(find.byType(EditableText).first);
      await tester.pumpAndSettle();
      expect(
        tester
            .widgetList<TanreiFocusRing>(
              find.descendant(of: searchFinder, matching: find.byType(TanreiFocusRing)),
            )
            .where((TanreiFocusRing r) => r.visible),
        hasLength(1),
      );
    });

    testWidgets('SRC-19: a press on the bar shows the pressed state at once and keeps it for the '
        'press-hold', (WidgetTester tester) async {
      await pumpSearch(tester, const SearchOwner());
      final TestGesture finger = await tester.startGesture(barRect(tester).center);
      await tester.pump();
      expect(
        barContainer(tester).visuals.container,
        lightTheme.paint(standard.pressed.containerColor),
      );
      await finger.up();
      await tester.pump(Duration(milliseconds: system.motion.duration.pressHold ~/ 2));
      expect(
        barContainer(tester).visuals.container,
        lightTheme.paint(standard.pressed.containerColor),
      );
      await tester.pumpAndSettle();
    });

    testWidgets('SRC-20: under none a press draws the state under it; under ripple the container '
        'keeps it and a ripple grows from the point of contact', (WidgetTester tester) async {
      for (final TanreiPressedFeedback feedback in <TanreiPressedFeedback>[
        TanreiPressedFeedback.none,
        TanreiPressedFeedback.ripple,
      ]) {
        final TanreiSystem s = system.copyWith(
          behavior: system.behavior.copyWith(pressedFeedback: feedback),
        );
        await pumpSearch(tester, const SearchOwner(), theme: TanreiThemeData(system: s));
        final TestGesture finger = await tester.startGesture(barRect(tester).center);
        await tester.pump();
        final TanreiControlContainer c = barContainer(tester);
        expect(c.visuals.container, isNot(lightTheme.paint(standard.pressed.containerColor)));
        expect(c.ripple != null, feedback == TanreiPressedFeedback.ripple);
        await finger.up();
        await tester.pumpAndSettle();
      }
    });

    testWidgets('SRC-22: the bar\'s hit area reaches the touch target above and below it', (
      WidgetTester tester,
    ) async {
      final Log log = <String>[];
      await pumpSearch(tester, SearchOwner(log: log));
      final Rect bar = barRect(tester);
      final double grow = (system.measure.targetTouch - bar.height) / 2;
      expect(tester.getSize(searchFinder).height, system.measure.targetTouch);
      await tester.tapAt(Offset(bar.center.dx, bar.top - grow + 1));
      await tester.pumpAndSettle();
      expect(log, <String>['toggle true']);
    });

    testWidgets('SRC-23: the docked view fades in over the open motion and out over the close '
        'motion; at once where motion is reduced', (WidgetTester tester) async {
      for (final bool reduced in <bool>[false, true]) {
        await pumpSearch(tester, const SearchOwner(), disableAnimations: reduced);
        await tester.enterText(find.byType(EditableText).first, 'inv');
        await tester.pump();
        await tester.pump(Duration(milliseconds: searchTokens.motionOpenDuration ~/ 4));
        final Opacity? fading = tester
            .widgetList<Opacity>(find.byType(Opacity))
            .where((Opacity o) => o.opacity > 0 && o.opacity < 1)
            .firstOrNull;
        final bool midway = tester.allRenderObjects.whereType<RenderTanreiSearchViewPosition>().any(
          (RenderTanreiSearchViewPosition r) => r.alwaysNeedsCompositing,
        );
        expect(midway, !reduced, reason: 'reduced: $reduced ${fading?.opacity}');
        await tester.pumpAndSettle();
        await tester.sendKeyEvent(LogicalKeyboardKey.escape);
        await tester.pump();
        expect(viewPosition, reduced ? findsNothing : findsOneWidget);
        await tester.pumpAndSettle();
        expect(viewPosition, findsNothing);
      }
    });
  });

  group('accessibility', () {
    testWidgets('SRC-24: the input is a search field named by label, never by the placeholder; the '
        'suggestions are buttons named by headline and described by supporting text; the '
        'full-screen view is a modal dialog named by label', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await pumpSearch(tester, const SearchOwner());
      final SemanticsNode input = tester.getSemantics(find.bySemanticsLabel('Search mail').first);
      final SemanticsData data = input.getSemanticsData();
      expect(data.hasFlag(SemanticsFlag.isTextField), isTrue);
      expect(data.inputType, SemanticsInputType.search);
      expect(data.label, 'Search mail');
      await typeText(tester, 'inv');
      final SemanticsData row = tester
          .getSemantics(find.bySemanticsLabel('Invoices'))
          .getSemanticsData();
      expect(row.hasFlag(SemanticsFlag.isButton), isTrue);
      expect(row.hint, 'Folder · 24 messages');
      expect(row.hasAction(SemanticsAction.tap), isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();

      await pumpSearch(
        tester,
        const SearchOwner(presentation: TanreiSearchPresentation.fullScreen),
      );
      await tester.tap(find.byType(EditableText).first);
      await tester.pumpAndSettle();
      final SemanticsNode dialog = tester.getSemantics(
        find.byWidgetPredicate((Widget w) => w is Semantics && (w.properties.scopesRoute ?? false)),
      );
      final SemanticsData d = dialog.getSemanticsData();
      expect(d.hasFlag(SemanticsFlag.scopesRoute), isTrue);
      expect(d.hasFlag(SemanticsFlag.namesRoute), isTrue);
      expect(d.label, 'Search mail');
      handle.dispose();
    });

    testWidgets('SRC-25: the slots\' icon buttons keep their own tokens and focus stops in reading '
        'order, and are not drawn in the full-screen header', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      Widget button(String label) =>
          TanreiIconButton(onPressed: () {}, icon: const Text('x'), semanticLabel: label);
      await pumpSearch(
        tester,
        SearchOwner(
          text: 'inv',
          leading: button('Menu'),
          trailing: <Widget>[button('Voice'), button('Account')],
        ),
      );
      final List<String> order = <String>[];
      for (int i = 0; i < 5; i++) {
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pumpAndSettle();
        order.add(focusedDescription());
      }
      expect(order, <String>['Menu', 'input', 'Clear search', 'Voice', 'Account']);
      final TanreiIconButton menu = tester.widget<TanreiIconButton>(iconButton('Menu'));
      expect(menu.variant, TanreiIconButtonVariant.standard);
      expect(visibleRectOf(tester, iconButton('Menu')).size, const Size.square(36));

      await pumpSearch(
        tester,
        SearchOwner(
          presentation: TanreiSearchPresentation.fullScreen,
          leading: button('Menu'),
          trailing: <Widget>[button('Voice')],
        ),
      );
      await tester.tap(find.byType(EditableText).first);
      await tester.pumpAndSettle();
      final Finder view = find.byWidgetPredicate(
        (Widget w) => w is Semantics && (w.properties.scopesRoute ?? false),
      );
      expect(find.descendant(of: view, matching: iconButton('Menu')), findsNothing);
      expect(find.descendant(of: view, matching: iconButton('Voice')), findsNothing);
    });

    testWidgets(
      'SRC-26: a disabled search is not focusable, editable or expandable, emits nothing, '
      'hides the clear button, is exposed as disabled and draws the disabled tokens',
      (WidgetTester tester) async {
        final SemanticsHandle handle = tester.ensureSemantics();
        final Log log = <String>[];
        await pumpSearch(tester, SearchOwner(log: log, text: 'inv', enabled: false));
        await tester.tap(find.byType(EditableText).first, warnIfMissed: false);
        await tester.pumpAndSettle();
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pumpAndSettle();
        expect(inputNode(tester).hasFocus, isFalse);
        expect(log, isEmpty);
        expect(iconButton('Clear search'), findsNothing);
        expect(barInput(tester).readOnly, isTrue);
        final SemanticsData data = tester
            .getSemantics(find.bySemanticsLabel('Search mail').first)
            .getSemanticsData();
        expect(data.hasFlag(SemanticsFlag.hasEnabledState), isTrue);
        expect(data.hasFlag(SemanticsFlag.isEnabled), isFalse);
        final TanreiControlContainer c = barContainer(tester);
        expect(c.visuals.container, lightTheme.paint(standard.disabled.containerColor));
        expect(barInput(tester).style.color, lightTheme.paint(standard.disabled.inputColor));
        handle.dispose();
      },
    );

    testWidgets('SRC-27: an empty label, suggestions with an empty or repeated value or an empty '
        'headline, and more than two trailing buttons are drawn and reported', (
      WidgetTester tester,
    ) async {
      final List<String> missing = collectMissingNames();
      final List<String> reports = collectIgnored();
      Widget button(String label) =>
          TanreiIconButton(onPressed: () {}, icon: const Text('x'), semanticLabel: label);
      await pumpSearch(
        tester,
        SearchOwner(
          label: '',
          trailing: <Widget>[button('A'), button('B'), button('C')],
          suggestions: const <TanreiSearchSuggestion>[
            TanreiSearchSuggestion(value: '', headline: 'no value'),
            TanreiSearchSuggestion(value: 'x', headline: 'one'),
            TanreiSearchSuggestion(value: 'x', headline: ''),
          ],
        ),
      );
      expect(missing, contains('search'));
      expect(reports, <String>[
        'search suggestions',
        'search suggestions',
        'search suggestions',
        'search trailing',
      ]);
      expect(iconButton('C'), findsOneWidget);
    });

    test('SRC-27: a presentation the search does not define is docked, reported', () {
      final List<String> reports = collectUnknownValues();
      expect(TanreiSearchPresentation.fromName('docked'), TanreiSearchPresentation.docked);
      expect(TanreiSearchPresentation.fromName('full-screen'), TanreiSearchPresentation.fullScreen);
      expect(reports, isEmpty);
      expect(TanreiSearchPresentation.fromName('sheet'), TanreiSearchPresentation.docked);
      expect(reports, <String>['search presentation "sheet" -> docked']);
    });

    testWidgets('SRC-28: enlarged text grows the bar to one line of the input and lets rows wrap; '
        'the icon buttons keep their size', (WidgetTester tester) async {
      await pumpSearch(
        tester,
        const SearchOwner(
          text: 'inv',
          suggestions: <TanreiSearchSuggestion>[
            TanreiSearchSuggestion(value: 'a', headline: 'a rather long suggestion headline'),
          ],
        ),
        textScaler: const TextScaler.linear(2),
      );
      final double line = 2 * searchTokens.inputTypescale.lineHeight;
      expect(barRect(tester).height, greaterThanOrEqualTo(line));
      expect(visibleRectOf(tester, iconButton('Clear search')).size, const Size.square(32));
      await tester.tap(find.byType(EditableText).first);
      await tester.pumpAndSettle();
      final Rect headline = tester.getRect(find.text('a rather long suggestion headline'));
      expect(headline.height, greaterThan(2 * searchTokens.suggestionHeadlineTypescale.lineHeight));
    });

    testWidgets('SRC-29: the default slot\'s content takes the headline color and the body style, '
        'inset like the rows', (WidgetTester tester) async {
      await pumpSearch(
        tester,
        const SearchOwner(suggestions: <TanreiSearchSuggestion>[], child: Text('No results')),
      );
      await typeText(tester, 'zzz');
      final DefaultTextStyle style = DefaultTextStyle.of(tester.element(find.text('No results')));
      expect(style.style.color, lightTheme.paint(standard.enabled.suggestionHeadlineColor));
      expect(style.style.fontSize, system.typescale.body.size);
      final RenderTanreiSearchViewPosition view = viewRender(tester);
      final Rect rect = view.viewRect.shift(view.localToGlobal(Offset.zero));
      expect(
        tester.getRect(find.text('No results')).left - rect.left,
        searchTokens.viewPaddingInline + searchTokens.suggestionContainerPaddingInline,
      );
    });

    testWidgets('guidelines: search', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final TanreiThemeData theme in <TanreiThemeData>[
        TanreiThemeData.light,
        TanreiThemeData.dark,
      ]) {
        await pumpSearch(tester, const SearchOwner(text: 'inv'), theme: theme);
        await tester.tap(find.byType(EditableText).first);
        await tester.pumpAndSettle();
        await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
        await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
        await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
        await expectLater(tester, meetsGuideline(textContrastGuideline));
      }
      handle.dispose();
    });
  });

  group('a design system drives rendering', () {
    test('the tokens the widget reads: their default values', () {
      expect(searchTokens.containerHeight, 40);
      expect(searchTokens.containerShape, system.shape.full);
      expect(searchTokens.containerPaddingInline, system.space.space150);
      expect(searchTokens.viewOffset, system.space.space50);
      expect(lightTheme.paint(standard.enabled.containerColor), light.surfaceContainerHighest);
      expect(lightTheme.paint(searchTokens.viewContainerColor), light.surfaceBright);
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": the bar draws that system\'s height, corners and container', (
        WidgetTester tester,
      ) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        await pumpSearch(tester, const SearchOwner(), theme: theme);
        expect(barRect(tester).height, shipped.search.containerHeight);
        final TanreiControlContainer c = barContainer(tester);
        expect(c.shape.radius, shipped.search.containerShape);
        expect(c.shape.smoothing, shipped.shape.cornerSmoothing);
        expect(
          c.visuals.container,
          theme.paint(shipped.search.conditions.standard.enabled.containerColor),
        );
        await tester.tap(find.byType(EditableText).first);
        await tester.pumpAndSettle();
        expect(
          barContainer(tester).visuals.outline,
          theme.paint(shipped.search.conditions.standard.focused.outlineColor),
        );
      });
    }
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('search');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'bar',
        'bar-value',
        'bar-slots',
        'bar-disabled',
        'docked',
        'full-screen',
      ]);
    });

    Widget stageFor(Map<String, dynamic> fixture) {
      final Widget search = fixtureSearch(fixture);
      return switch (fixture['id']) {
        'docked' => SizedBox.fromSize(
          size: dockedStage,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Align(
              alignment: Alignment.topCenter,
              child: SizedBox(width: barWidth, child: search),
            ),
          ),
        ),
        'full-screen' => SizedBox.fromSize(size: fullScreenStage, child: search),
        _ => SizedBox.fromSize(
          size: barStage,
          child: Center(
            child: SizedBox(width: barWidth, child: search),
          ),
        ),
      };
    }

    Size surfaceFor(Map<String, dynamic> fixture) {
      final Size stage = switch (fixture['id']) {
        'docked' => dockedStage,
        'full-screen' => fullScreenStage,
        _ => barStage,
      };
      final double pad = system.space.space200 * 2;
      return Size(stage.width + pad, stage.height + pad);
    }

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          surface: surfaceFor(fixture),
          child: stageFor(fixture),
          file: 'goldens/search/$id.png',
          settle: true,
        );
      });
    }

    // One representative fixture per shipped preset: the docked view shows the
    // preset's bar, view and rows together.
    const String recorded = 'docked';
    for (final TanreiSystem preset in <TanreiSystem>[
      m3LikeSystem,
      m3ExpressiveLikeSystem,
      cupertinoSystem,
    ]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        final Map<String, dynamic> fixture = fixtures.singleWhere(
          (Map<String, dynamic> f) => f['id'] == recorded,
        );
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: surfaceFor(fixture),
          child: stageFor(fixture),
          file: 'goldens/search/${preset.id}/$recorded.png',
          settle: true,
        );
      });
    }
  });
}
