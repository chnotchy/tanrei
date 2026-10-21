import 'dart:math' as math;

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

const TanreiSystem system = tanreiSystem;
final TanreiTabsTokens tabsTokens = system.tabs;
final TanreiColors light = system.schemes.light;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The frame of the tabs baselines: a row 360 wide (TAB-14's `verify`) inside the `space200`
/// padding of every baseline, tall enough for a primary tab with a stacked icon whose label wraps:
/// the test font's square glyphs make "Overview" wider than a third of the row, so a fixed tab's
/// label takes two lines (24 + 4 + 40 = 68 in m3-like).
const Size tabsGoldenSurface = Size(392, 120);

/// The width of every fixture's row.
const double rowWidth = 360;

/// The fixtures' icon names, as Material Symbols code points drawn as text.
const Map<String, int> iconCodePoints = <String, int>{
  'dashboard': 0xe871,
  'history': 0xe889,
  'settings': 0xe8b8,
};

Widget? glyph(String? name) =>
    name == null || name.isEmpty ? null : Text(String.fromCharCode(iconCodePoints[name] ?? 0xe5cc));

/// The row a fixture describes (TAB-14's `verify`): one row of tabs 360 wide and no panel.
Widget fixtureTabs(Map<String, dynamic> fixture) {
  final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
  return SizedBox(
    width: rowWidth,
    child: TanreiTabBar<String>(
      value: props['selected'] as String?,
      onChanged: (_) {},
      variant: TanreiTabsVariant(props['variant'] as String? ?? 'primary'),
      isScrollable: props['scrollable'] == true,
      semanticLabel: props['label'] as String? ?? '',
      tabs: <TanreiTab<String>>[
        for (final Map<String, dynamic> item
            in (fixture['items'] as List<dynamic>).cast<Map<String, dynamic>>())
          fixtureTab(item['props'] as Map<String, dynamic>),
      ],
    ),
  );
}

TanreiTab<String> fixtureTab(Map<String, dynamic> props) => TanreiTab<String>(
  value: props['value'] as String? ?? '',
  label: props['label'] as String? ?? '',
  icon: glyph(props['icon'] as String?),
  labelHidden: props['labelHidden'] == true,
  enabled: props['disabled'] != true,
);

/// Collects what the tabs report as ignored (TAB-11, TAB-19), and restores the reporter.
List<String> collectIgnoredValues() {
  final List<String> reports = <String>[];
  final TanreiIgnoredValueReporter previous = debugTanreiReportIgnoredValue;
  debugTanreiReportIgnoredValue = (String component, String prop, String why, Widget widget) =>
      reports.add('$component $prop: $why');
  addTearDown(() => debugTanreiReportIgnoredValue = previous);
  return reports;
}

TanreiTab<String> tab(String label, {String? value, bool enabled = true, Widget? icon}) =>
    TanreiTab<String>(
      value: value ?? label.toLowerCase(),
      label: label,
      icon: icon,
      enabled: enabled,
    );

List<TanreiTab<String>> threeTabs({bool thirdEnabled = true}) => <TanreiTab<String>>[
  tab('Overview'),
  tab('Activity'),
  tab('Settings', enabled: thirdEnabled),
];

const List<String> sixLabels = <String>[
  'Overview',
  'Deployments',
  'Analytics',
  'Logs',
  'Storage',
  'Settings',
];

List<TanreiTab<String>> sixTabs() => <TanreiTab<String>>[
  for (final String label in sixLabels) tab(label),
];

/// A row of [tabs] whose owner stores the selection (as a product does), recording each change in
/// [changes]; below it a panel per tab when [panels], then [after].
class TabsOwner extends StatefulWidget {
  const TabsOwner({
    super.key,
    required this.initial,
    required this.tabs,
    this.changes,
    this.variant = TanreiTabsVariant.primary,
    this.scrollable = false,
    this.semanticLabel = '',
    this.store = true,
    this.panels = false,
    this.width = rowWidth,
  });

  final String? initial;
  final List<TanreiTab<String>> tabs;
  final List<String>? changes;
  final TanreiTabsVariant variant;
  final bool scrollable;
  final String semanticLabel;

  /// Whether the owner stores what change carries (false: the product ignores it).
  final bool store;
  final bool panels;
  final double width;

  @override
  State<TabsOwner> createState() => TabsOwnerState();
}

class TabsOwnerState extends State<TabsOwner> {
  late String? value = widget.initial;

  void set(String? next) => setState(() => value = next);

  @override
  Widget build(BuildContext context) => SizedBox(
    width: widget.width,
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        TanreiTabBar<String>(
          value: value,
          onChanged: (String next) {
            widget.changes?.add(next);
            if (widget.store) {
              setState(() => value = next);
            }
          },
          variant: widget.variant,
          isScrollable: widget.scrollable,
          semanticLabel: widget.semanticLabel,
          tabs: widget.tabs,
        ),
        if (widget.panels)
          TanreiTabBarView<String>(
            value: value,
            semanticLabels: <String, String>{
              for (final TanreiTab<String> tab in widget.tabs) tab.value: tab.label,
            },
            children: <String, Widget>{
              for (final TanreiTab<String> tab in widget.tabs)
                tab.value: SizedBox(height: 40, child: Text('${tab.label} panel')),
            },
          ),
      ],
    ),
  );
}

Widget tabsApp(
  Widget child, {
  TanreiThemeData theme = lightTheme,
  bool disableAnimations = false,
  TextDirection textDirection = TextDirection.ltr,
}) => tanreiTestApp(
  Directionality(textDirection: textDirection, child: child),
  theme: theme,
  disableAnimations: disableAnimations,
);

Finder tabOf(String label) =>
    find.byWidgetPredicate((Widget w) => w is TanreiTab && w.label == label).first;

Finder containerOf(String label) => find
    .descendant(
      of: tabOf(label),
      matching: find.byWidgetPredicate(
        (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
      ),
    )
    .first;

TanreiContainerDecoration decorationOf(WidgetTester tester, String label) =>
    tester.widget<DecoratedBox>(containerOf(label)).decoration as TanreiContainerDecoration;

Color fillOf(WidgetTester tester, String label) =>
    decorationOf(tester, label).color ?? const Color(0x00000000);

TextStyle textStyleOf(WidgetTester tester, String text) => tester
    .widget<RichText>(find.descendant(of: find.text(text), matching: find.byType(RichText)))
    .text
    .style!;

Color textColor(WidgetTester tester, String text) => textStyleOf(tester, text).color!;

double opacityOf(WidgetTester tester, String label) => tester
    .widget<Opacity>(find.descendant(of: tabOf(label), matching: find.byType(Opacity)).first)
    .opacity;

bool ringVisible(WidgetTester tester, String label) => tester
    .widget<TanreiFocusRing>(
      find.descendant(of: tabOf(label), matching: find.byType(TanreiFocusRing)),
    )
    .visible;

TanreiControlIcon iconOf(WidgetTester tester, String label) => tester.widget<TanreiControlIcon>(
  find.descendant(of: tabOf(label), matching: find.byType(TanreiControlIcon)),
);

RenderTanreiTabIndicator indicatorLayer(WidgetTester tester) =>
    tester.allRenderObjects.whereType<RenderTanreiTabIndicator>().toSet().single;

/// The selected tab's indicator, in global coordinates (null: none).
Rect? indicatorRect(WidgetTester tester) {
  final RenderTanreiTabIndicator layer = indicatorLayer(tester);
  final Rect? rect = layer.indicatorRect;
  if (rect == null) {
    return null;
  }
  return rect.shift((layer as RenderBox).localToGlobal(Offset.zero));
}

/// The selected tab's value as focus sees it: the label of the tab with primary focus.
String focusedLabel() =>
    FocusManager.instance.primaryFocus?.context
        ?.findAncestorWidgetOfExactType<TanreiTab<String>>()
        ?.label ??
    '';

SemanticsNode semanticsRoot(WidgetTester tester) =>
    tester.renderObject(find.byType(WidgetsApp)).owner!.semanticsOwner!.rootSemanticsNode!;

List<SemanticsNode> nodesBelow(SemanticsNode node) {
  final List<SemanticsNode> found = <SemanticsNode>[];
  void visit(SemanticsNode n) {
    found.add(n);
    n.visitChildren((SemanticsNode child) {
      visit(child);
      return true;
    });
  }

  node.visitChildren((SemanticsNode child) {
    visit(child);
    return true;
  });
  return found;
}

Future<TestGesture> hoverOver(WidgetTester tester, Finder target) async {
  FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
  final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
  await mouse.addPointer(location: Offset.zero);
  addTearDown(mouse.removePointer);
  await mouse.moveTo(tester.getCenter(target));
  await tester.pumpAndSettle();
  return mouse;
}

/// Tab from outside into the row: focus lands on its Tab stop.
Future<void> tabInto(WidgetTester tester) async {
  await tester.sendKeyEvent(LogicalKeyboardKey.tab);
  await tester.pumpAndSettle();
}

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('selection', () {
    testWidgets('TAB-1: a pointer, touch, Enter or Space activation of a tab that is not selected '
        'sets selected and emits change once with its value; the selected tab emits nothing', (
      WidgetTester tester,
    ) async {
      final List<String> changes = <String>[];
      await tester.pumpWidget(
        tabsApp(TabsOwner(initial: 'overview', tabs: threeTabs(), changes: changes)),
      );
      await tester.tap(find.text('Activity'));
      await tester.pumpAndSettle();
      expect(changes, <String>['activity']);
      await tester.tap(find.text('Activity'), kind: PointerDeviceKind.mouse);
      await tester.pumpAndSettle();
      expect(changes, <String>['activity'], reason: 'already selected');
      await tester.tap(find.text('Settings'), kind: PointerDeviceKind.touch);
      await tester.pumpAndSettle();
      expect(changes, <String>['activity', 'settings']);

      // Enter and Space select the focused tab when the product moved focus without selecting.
      final List<String> keyed = <String>[];
      await tester.pumpWidget(
        tabsApp(
          TabsOwner(
            key: UniqueKey(),
            initial: 'overview',
            tabs: threeTabs(),
            changes: keyed,
            store: false,
          ),
        ),
      );
      await tabInto(tester);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await tester.pumpAndSettle();
      expect(focusedLabel(), 'Activity');
      expect(keyed, <String>['activity']);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      expect(keyed, <String>['activity', 'activity'], reason: 'the product kept overview');
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pumpAndSettle();
      expect(keyed, hasLength(3));
    });

    testWidgets('TAB-2: a disabled tab is not selected, emits nothing, is skipped by the arrow '
        'keys, is never the Tab stop, and is exposed as disabled', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<String> changes = <String>[];
      await tester.pumpWidget(
        tabsApp(
          TabsOwner(
            initial: 'overview',
            tabs: <TanreiTab<String>>[tab('Overview'), tab('Billing', enabled: false), tab('Logs')],
            changes: changes,
          ),
        ),
      );
      await tester.tap(find.text('Billing'));
      await tester.pumpAndSettle();
      expect(changes, isEmpty);
      await tabInto(tester);
      expect(focusedLabel(), 'Overview');
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await tester.pumpAndSettle();
      expect(focusedLabel(), 'Logs', reason: 'Billing is skipped');
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
      await tester.pumpAndSettle();
      expect(focusedLabel(), 'Overview');
      final SemanticsData billing = tester.getSemantics(tabOf('Billing')).getSemanticsData();
      expect(billing.hasFlag(SemanticsFlag.hasEnabledState), isTrue);
      expect(billing.hasFlag(SemanticsFlag.isEnabled), isFalse);
      expect(billing.hasAction(SemanticsAction.tap), isFalse);

      // A selected disabled tab is not the Tab stop either: the first enabled tab is.
      await tester.pumpWidget(
        tabsApp(
          TabsOwner(
            key: UniqueKey(),
            initial: 'billing',
            tabs: <TanreiTab<String>>[tab('Overview'), tab('Billing', enabled: false)],
          ),
        ),
      );
      await tabInto(tester);
      expect(focusedLabel(), 'Overview');
      handle.dispose();
    });

    testWidgets('TAB-11: the tab whose value is selected draws its variant\'s selected. parts, the '
        'others the plain ones; null selects the first enabled tab', (WidgetTester tester) async {
      final TanreiTabsVariantStateTokens rest = tabsTokens.variants.primary.enabled;
      await tester.pumpWidget(tabsApp(TabsOwner(initial: 'activity', tabs: threeTabs())));
      expect(textColor(tester, 'Activity'), lightTheme.paint(rest.selectedLabelColor));
      expect(textColor(tester, 'Overview'), lightTheme.paint(rest.labelColor));
      expect(fillOf(tester, 'Activity'), lightTheme.paint(rest.selectedContainerColor));
      final Rect activity = tester.getRect(find.text('Activity'));
      expect(indicatorRect(tester)!.left, moreOrLessEquals(activity.left));

      await tester.pumpWidget(
        tabsApp(
          TabsOwner(
            key: UniqueKey(),
            initial: null,
            tabs: <TanreiTab<String>>[tab('Off', enabled: false), tab('On'), tab('Later')],
          ),
        ),
      );
      expect(textColor(tester, 'On'), lightTheme.paint(rest.selectedLabelColor));
      expect(indicatorRect(tester)!.left, moreOrLessEquals(tester.getRect(find.text('On')).left));
    });

    testWidgets('TAB-11: a selected value that names no tab selects none, draws no indicator and '
        'is reported; an empty or repeated value still renders, the first tab with a value is the '
        'one it selects, and each is reported once', (WidgetTester tester) async {
      final List<String> reports = collectIgnoredValues();
      final TanreiTabsVariantStateTokens rest = tabsTokens.variants.primary.enabled;
      Widget build(String? value) => tabsApp(
        TanreiTabBar<String>(
          value: value,
          onChanged: (_) {},
          tabs: <TanreiTab<String>>[
            tab('One', value: 'x'),
            tab('Two', value: 'x'),
            tab('Three', value: ''),
          ],
        ),
      );
      await tester.pumpWidget(build('nothing'));
      for (final String label in <String>['One', 'Two', 'Three']) {
        expect(textColor(tester, label), lightTheme.paint(rest.labelColor), reason: label);
      }
      expect(indicatorRect(tester), isNull);
      expect(reports.where((String r) => r.contains('names no tab')), hasLength(1));
      expect(reports.where((String r) => r.contains('Two tabs have the value "x"')), hasLength(1));
      expect(reports.where((String r) => r.contains('has no value')), hasLength(1));
      final int count = reports.length;
      await tester.pumpWidget(build('nothing'));
      expect(reports, hasLength(count), reason: 'not on every build');
      await tester.pumpWidget(build('x'));
      await tester.pumpAndSettle();
      expect(textColor(tester, 'One'), lightTheme.paint(rest.selectedLabelColor));
      expect(textColor(tester, 'Two'), lightTheme.paint(rest.labelColor));
    });
  });

  group('keyboard', () {
    testWidgets('TAB-12: the row is one Tab stop, the selected tab; Right and Left Arrow move to '
        'the next and previous enabled tab, wrapping, Home and End to the ends, each selecting the '
        'tab it reaches and emitting change; Tab moves from the selected tab into its panel', (
      WidgetTester tester,
    ) async {
      final List<String> changes = <String>[];
      await tester.pumpWidget(
        tabsApp(TabsOwner(initial: 'activity', tabs: threeTabs(), changes: changes, panels: true)),
      );
      await tabInto(tester);
      expect(focusedLabel(), 'Activity', reason: 'the selected tab is the Tab stop');
      final List<String> seen = <String>[];
      for (int i = 0; i < 2; i++) {
        await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
        await tester.pumpAndSettle();
        seen.add(focusedLabel());
      }
      expect(seen, <String>['Settings', 'Overview'], reason: 'wraps at the end');
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
      await tester.pumpAndSettle();
      expect(focusedLabel(), 'Settings', reason: 'wraps at the start');
      await tester.sendKeyEvent(LogicalKeyboardKey.home);
      await tester.pumpAndSettle();
      expect(focusedLabel(), 'Overview');
      await tester.sendKeyEvent(LogicalKeyboardKey.end);
      await tester.pumpAndSettle();
      expect(focusedLabel(), 'Settings');
      expect(changes, <String>['settings', 'overview', 'settings', 'overview', 'settings']);
      expect(find.text('Settings panel'), findsOneWidget);
      // Tab: into the panel (it has nothing focusable, so it takes focus itself).
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pumpAndSettle();
      expect(focusedLabel(), '');
      expect(
        FocusManager.instance.primaryFocus?.context
            ?.findAncestorWidgetOfExactType<TanreiTabBarView<String>>(),
        isNotNull,
      );
      // Shift+Tab: back to the selected tab, the row's one stop.
      await tester.sendKeyDownEvent(LogicalKeyboardKey.shiftLeft);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.shiftLeft);
      await tester.pumpAndSettle();
      expect(focusedLabel(), 'Settings');
    });

    testWidgets('TAB-12, TAB-21: in a right-to-left layout Left Arrow moves to the next tab and '
        'Right Arrow to the previous', (WidgetTester tester) async {
      final List<String> changes = <String>[];
      await tester.pumpWidget(
        tabsApp(
          TabsOwner(initial: 'overview', tabs: threeTabs(), changes: changes),
          textDirection: TextDirection.rtl,
        ),
      );
      await tabInto(tester);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
      await tester.pumpAndSettle();
      expect(focusedLabel(), 'Activity');
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await tester.pumpAndSettle();
      expect(focusedLabel(), 'Overview');
      expect(changes, <String>['activity', 'overview']);
    });

    testWidgets('TAB-12: typing a letter moves nothing (no typeahead in a row of tabs)', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tabsApp(TabsOwner(initial: 'overview', tabs: threeTabs())));
      await tabInto(tester);
      await tester.sendKeyEvent(LogicalKeyboardKey.keyS);
      await tester.pumpAndSettle();
      expect(focusedLabel(), 'Overview');
    });
  });

  group('states', () {
    testWidgets('TAB-3: under the acme system hovered, focused and pressed draw their own tokens, '
        'pressed over focused over hovered; focus from a pointer draws no focused state', (
      WidgetTester tester,
    ) async {
      const TanreiThemeData acme = TanreiThemeData(system: acmeSystem);
      final TanreiTabsVariantTokens primary = acmeSystem.tabs.variants.primary;
      Color fill(TanreiInteractionState state) => acme.paint(primary.of(state).containerColor);
      expect(<Color>{
        fill(TanreiInteractionState.hovered),
        fill(TanreiInteractionState.focused),
        fill(TanreiInteractionState.pressed),
      }, hasLength(3));
      await tester.pumpWidget(
        tabsApp(
          TabsOwner(initial: 'overview', tabs: threeTabs()),
          theme: acme,
        ),
      );
      await tabInto(tester);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await tester.pumpAndSettle();
      // Activity is focused (and now selected).
      final Color focusedSelected = acme.paint(primary.focused.selectedContainerColor);
      expect(fillOf(tester, 'Activity'), focusedSelected);
      final TestGesture mouse = await hoverOver(tester, find.text('Activity'));
      expect(fillOf(tester, 'Activity'), focusedSelected, reason: 'focused over hovered');
      await mouse.down(tester.getCenter(find.text('Activity')));
      await tester.pump();
      expect(fillOf(tester, 'Activity'), acme.paint(primary.pressed.selectedContainerColor));
      await mouse.up();
      await tester.pumpAndSettle();
      await mouse.moveTo(tester.getCenter(find.text('Settings')));
      await tester.pumpAndSettle();
      expect(fillOf(tester, 'Settings'), fill(TanreiInteractionState.hovered));
      expect(fillOf(tester, 'Overview'), acme.paint(primary.enabled.containerColor));
    });

    testWidgets('TAB-4: keyboard focus shows the focus ring inside the tab at once; focus from a '
        'pointer shows none', (WidgetTester tester) async {
      await tester.pumpWidget(tabsApp(TabsOwner(initial: 'overview', tabs: threeTabs())));
      expect(ringVisible(tester, 'Overview'), isFalse);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(ringVisible(tester, 'Overview'), isTrue);
      final TanreiFocusRing ring = tester.widget<TanreiFocusRing>(
        find.descendant(of: tabOf('Overview'), matching: find.byType(TanreiFocusRing)),
      );
      expect(ring.inside, isTrue);
      await tester.tap(find.text('Activity'));
      await tester.pumpAndSettle();
      expect(ringVisible(tester, 'Activity'), isFalse);
    });

    testWidgets('TAB-5: a tab is at least the touch target wide and tall, even when its tokens '
        'are smaller', (WidgetTester tester) async {
      final TanreiSystem small = system.copyWith(
        tabs: tabsTokens.copyWith(containerHeight: 20, containerPaddingInline: 0),
      );
      await tester.pumpWidget(
        tabsApp(
          TanreiTabBar<String>(
            value: 'a',
            onChanged: (_) {},
            isScrollable: true,
            tabs: <TanreiTab<String>>[
              tab('A', value: 'a'),
              tab('B', value: 'b'),
            ],
          ),
          theme: TanreiThemeData(system: small),
        ),
      );
      for (final String label in <String>['A', 'B']) {
        final Size size = tester.getSize(containerOf(label));
        expect(size.width, greaterThanOrEqualTo(system.measure.targetTouch));
        expect(size.height, greaterThanOrEqualTo(system.measure.targetTouch));
      }
    });

    testWidgets('TAB-6: a disabled tab draws the disabled tokens of its variant, and a selected '
        'disabled tab those of its selected parts: no fill, faded text, a faded indicator', (
      WidgetTester tester,
    ) async {
      final TanreiTabsVariantStateTokens disabled = tabsTokens.variants.primary.disabled;
      await tester.pumpWidget(
        tabsApp(
          TabsOwner(
            initial: 'billing',
            tabs: <TanreiTab<String>>[tab('Overview'), tab('Billing', enabled: false)],
          ),
        ),
      );
      expect(textColor(tester, 'Billing'), lightTheme.paint(disabled.selectedLabelColor));
      expect(fillOf(tester, 'Billing').a, 0);
      expect(opacityOf(tester, 'Billing'), tabsTokens.disabled.opacity);
      expect(
        tester.renderObject(find.byType(TanreiTabBar<String>)),
        paints..rrect(color: lightTheme.paint(disabled.selectedActiveIndicatorColor)),
      );
      await tester.pumpWidget(
        tabsApp(
          TabsOwner(
            key: UniqueKey(),
            initial: 'overview',
            tabs: <TanreiTab<String>>[tab('Overview'), tab('Billing', enabled: false)],
          ),
        ),
      );
      expect(textColor(tester, 'Billing'), lightTheme.paint(disabled.labelColor));
      expect(fillOf(tester, 'Billing').a, 0);
    });

    testWidgets('TAB-7: a variant the system does not have renders as primary and is reported', (
      WidgetTester tester,
    ) async {
      final List<String> reports = collectUnknownValues();
      await tester.pumpWidget(
        tabsApp(
          TabsOwner(
            initial: 'overview',
            tabs: threeTabs(),
            variant: const TanreiTabsVariant('tertiary'),
          ),
        ),
      );
      final TanreiTabsVariantStateTokens rest = tabsTokens.variants.primary.enabled;
      expect(textColor(tester, 'Overview'), lightTheme.paint(rest.selectedLabelColor));
      expect(indicatorRect(tester)!.height, rest.activeIndicatorThickness);
      expect(reports, contains('tabs variant "tertiary" -> primary'));
    });

    testWidgets('TAB-23: a change of state or of selection animates the colors over '
        'comp.tabs.motion.state-duration with its easing, and at once where motion is reduced', (
      WidgetTester tester,
    ) async {
      final TanreiTabsVariantStateTokens rest = tabsTokens.variants.primary.enabled;
      final Color plain = lightTheme.paint(rest.labelColor);
      final Color chosen = lightTheme.paint(rest.selectedLabelColor);
      final GlobalKey<TabsOwnerState> owner = GlobalKey<TabsOwnerState>();
      await tester.pumpWidget(
        tabsApp(TabsOwner(key: owner, initial: 'overview', tabs: threeTabs())),
      );
      owner.currentState!.set('activity');
      await tester.pump();
      await tester.pump(Duration(milliseconds: tabsTokens.motionStateDuration ~/ 3));
      final double progress = tabsTokens.motionStateEasing.toCurve().transform(1 / 3);
      expect(
        textColor(tester, 'Activity'),
        isSameColorAs(tanreiLerpColor(plain, chosen, progress)),
      );
      expect(
        textColor(tester, 'Overview'),
        isSameColorAs(tanreiLerpColor(chosen, plain, progress)),
      );
      await tester.pumpAndSettle();
      expect(textColor(tester, 'Activity'), chosen);

      // A hover eases too.
      final Color hovered = lightTheme.paint(tabsTokens.variants.primary.hovered.containerColor);
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(location: Offset.zero);
      addTearDown(mouse.removePointer);
      await mouse.moveTo(tester.getCenter(find.text('Settings')));
      await tester.pump();
      await tester.pump(Duration(milliseconds: tabsTokens.motionStateDuration ~/ 3));
      expect(
        fillOf(tester, 'Settings'),
        isSameColorAs(tanreiLerpColor(const Color(0x00000000), hovered, progress)),
      );
      await tester.pumpAndSettle();

      // Reduced motion: at once.
      final GlobalKey<TabsOwnerState> reduced = GlobalKey<TabsOwnerState>();
      await tester.pumpWidget(
        tabsApp(
          TabsOwner(key: reduced, initial: 'overview', tabs: threeTabs()),
          disableAnimations: true,
        ),
      );
      reduced.currentState!.set('activity');
      await tester.pump();
      expect(textColor(tester, 'Activity'), chosen);
      expect(textColor(tester, 'Overview'), plain);
    });
  });

  group('press hold (TAB-8)', () {
    final Duration hold = tanreiDuration(system.motion.duration.pressHold);
    final Color pressedFill = lightTheme.paint(tabsTokens.variants.primary.pressed.containerColor);
    const Duration tick = Duration(milliseconds: 1);

    for (final PointerDeviceKind kind in <PointerDeviceKind>[
      PointerDeviceKind.touch,
      PointerDeviceKind.mouse,
    ]) {
      testWidgets('TAB-8: a ${kind.name} press shows the pressed state without delay and keeps it '
          'for the press-hold duration', (WidgetTester tester) async {
        await tester.pumpWidget(
          tabsApp(TabsOwner(initial: 'overview', tabs: threeTabs(), store: false)),
        );
        await tester.tap(find.text('Activity'), kind: kind);
        await tester.pump();
        expect(fillOf(tester, 'Activity'), pressedFill);
        await tester.pump(hold - tick);
        expect(fillOf(tester, 'Activity'), pressedFill);
        await tester.pump(tick);
        await tester.pumpAndSettle();
        expect(fillOf(tester, 'Activity'), isNot(pressedFill));
      });
    }

    for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
      LogicalKeyboardKey.enter,
      LogicalKeyboardKey.space,
    ]) {
      final String name = key == LogicalKeyboardKey.enter ? 'Enter' : 'Space';
      testWidgets('TAB-8: $name shows the pressed state at once and for the press-hold duration', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(tabsApp(TabsOwner(initial: 'overview', tabs: threeTabs())));
        await tabInto(tester);
        final Color focused = fillOf(tester, 'Overview');
        final Color pressed = lightTheme.paint(
          tabsTokens.variants.primary.pressed.selectedContainerColor,
        );
        await tester.sendKeyEvent(key);
        await tester.pump();
        expect(fillOf(tester, 'Overview'), pressed);
        await tester.pump(hold - tick);
        expect(fillOf(tester, 'Overview'), pressed);
        await tester.pump(tick);
        await tester.pumpAndSettle();
        expect(fillOf(tester, 'Overview'), focused);
      });
    }
  });

  group('choices of kind', () {
    testWidgets('TAB-9: overlay (default) fills the pressed container at once; ripple (m3-like) '
        'grows it from the point of contact over comp.tabs.motion.feedback-duration; dim '
        '(cupertino) dims the tab and draws no state layer', (WidgetTester tester) async {
      Widget row(TanreiThemeData theme) => tabsApp(
        TabsOwner(key: UniqueKey(), initial: 'overview', tabs: threeTabs(), store: false),
        theme: theme,
      );
      await tester.pumpWidget(row(lightTheme));
      TestGesture touch = await tester.startGesture(tester.getCenter(find.text('Activity')));
      await tester.pump();
      expect(
        fillOf(tester, 'Activity'),
        lightTheme.paint(tabsTokens.variants.primary.pressed.containerColor),
      );
      expect(decorationOf(tester, 'Activity').ripple, isNull);
      await touch.up();
      await tester.pumpAndSettle();

      const TanreiThemeData m3 = TanreiThemeData(system: m3LikeSystem);
      await tester.pumpWidget(row(m3));
      final Rect box = tester.getRect(containerOf('Activity'));
      const Offset contact = Offset(30, 10);
      touch = await tester.startGesture(box.topLeft + contact);
      await tester.pump();
      final TanreiRipple ripple = decorationOf(tester, 'Activity').ripple!;
      expect(ripple.origin, contact);
      expect(ripple.color, m3.paint(m3LikeSystem.tabs.variants.primary.pressed.containerColor));
      await tester.pump(tanreiDuration(m3LikeSystem.tabs.motionFeedbackDuration) ~/ 2);
      expect(
        decorationOf(tester, 'Activity').ripple!.progress,
        moreOrLessEquals(m3LikeSystem.tabs.motionStateEasing.toCurve().transform(0.5)),
      );
      await touch.up();
      await tester.pumpAndSettle();
      expect(decorationOf(tester, 'Activity').ripple, isNull);

      await tester.pumpWidget(row(const TanreiThemeData(system: cupertinoSystem)));
      touch = await tester.startGesture(tester.getCenter(find.text('Activity')));
      await tester.pump();
      expect(opacityOf(tester, 'Activity'), cupertinoSystem.tabs.pressed.opacity);
      expect(cupertinoSystem.tabs.pressed.opacity, lessThan(1));
      expect(fillOf(tester, 'Activity').a, 0);
      await touch.up();
      await tester.pumpAndSettle();
    });

    for (final TanreiPressedFeedback feedback in <TanreiPressedFeedback>[
      TanreiPressedFeedback.ripple,
      TanreiPressedFeedback.dim,
      TanreiPressedFeedback.none,
    ]) {
      testWidgets(
        'TAB-9: under ${feedback.name} '
        '${feedback == TanreiPressedFeedback.none ? 'every part stays with the state under the press' : 'only the container color stays with the state under the press'}',
        (WidgetTester tester) async {
          final TanreiTabsVariantTokens primary = tabsTokens.variants.primary;
          final TanreiSystem of = system.copyWith(
            behavior: system.behavior.copyWith(pressedFeedback: feedback),
            tabs: tabsTokens.copyWith(
              pressed: tabsTokens.pressed.copyWith(opacity: 0.5),
              variants: tabsTokens.variants.copyWith(
                primary: primary.copyWith(
                  pressed: primary.pressed.copyWith(
                    containerColor: const TanreiPaint.literal(Color(0xFF112233)),
                    labelColor: const TanreiPaint.literal(Color(0xFF445566)),
                  ),
                ),
              ),
            ),
          );
          await tester.pumpWidget(
            tabsApp(
              TabsOwner(initial: 'overview', tabs: threeTabs(), store: false),
              theme: TanreiThemeData(system: of),
            ),
          );
          final Color resting = textColor(tester, 'Activity');
          final TestGesture touch = await tester.startGesture(
            tester.getCenter(find.text('Activity')),
          );
          await tester.pump();
          expect(fillOf(tester, 'Activity').a, 0);
          if (feedback == TanreiPressedFeedback.none) {
            expect(textColor(tester, 'Activity'), resting);
            expect(opacityOf(tester, 'Activity'), 1);
          } else {
            expect(textColor(tester, 'Activity'), const Color(0xFF445566));
            expect(opacityOf(tester, 'Activity'), 0.5);
            expect(
              decorationOf(tester, 'Activity').ripple?.color,
              feedback == TanreiPressedFeedback.ripple ? const Color(0xFF112233) : null,
            );
          }
          await touch.up();
          await tester.pumpAndSettle();
        },
      );
    }

    testWidgets(
      'TAB-10: the corner smoothing of the system eases the tab and its focus ring; the focus '
      'style draws a ring (default) or a glow (acme)',
      (WidgetTester tester) async {
        Future<List<Paint>> focusedStrokes(TanreiSystem of) async {
          await tester.pumpWidget(
            tabsApp(
              TabsOwner(key: UniqueKey(), initial: 'overview', tabs: threeTabs()),
              theme: TanreiThemeData(system: of),
            ),
          );
          await tabInto(tester);
          final List<Paint> found = <Paint>[];
          expect(
            find.descendant(of: tabOf('Overview'), matching: find.byType(TanreiFocusRing)),
            paints..everything((Symbol method, List<dynamic> arguments) {
              if ((method == #drawRRect || method == #drawPath) &&
                  (arguments[1] as Paint).style == PaintingStyle.stroke) {
                found.add(arguments[1] as Paint);
              }
              return true;
            }),
          );
          return found;
        }

        final List<Paint> ring = await focusedStrokes(system);
        expect(decorationOf(tester, 'Overview').shape.smoothing, 0);
        expect(decorationOf(tester, 'Overview').shape.radius, tabsTokens.containerShape);
        expect(ring, isNotEmpty);
        expect(ring.every((Paint p) => p.maskFilter == null), isTrue);
        final List<Paint> glow = await focusedStrokes(acmeSystem);
        expect(glow, isNotEmpty);
        expect(glow.every((Paint p) => p.maskFilter != null), isTrue);
        // A system that rounds its tabs shows the smoothing.
        await focusedStrokes(
          cupertinoSystem.copyWith(tabs: cupertinoSystem.tabs.copyWith(containerShape: 12)),
        );
        expect(decorationOf(tester, 'Overview').shape.smoothing, 0.6);
        expect(decorationOf(tester, 'Overview').shape.radius, 12);
        expect(
          find.descendant(of: tabOf('Overview'), matching: find.byType(TanreiFocusRing)),
          paints..something(
            (Symbol method, List<dynamic> arguments) =>
                method == #drawPath && (arguments[1] as Paint).style == PaintingStyle.stroke,
          ),
        );
      },
    );
  });

  group('layout', () {
    testWidgets(
      'TAB-14: fixed tabs share the row\'s width equally; a label that does not fit wraps '
      'and every tab grows to the tallest',
      (WidgetTester tester) async {
        await tester.pumpWidget(
          tabsApp(
            TabsOwner(
              initial: 'a',
              tabs: <TanreiTab<String>>[
                tab('A', value: 'a'),
                tab('A label much too long for one line', value: 'b'),
                tab('C', value: 'c'),
              ],
            ),
          ),
        );
        final List<Size> sizes = <Size>[
          for (final String label in <String>['A', 'A label much too long for one line', 'C'])
            tester.getSize(containerOf(label)),
        ];
        for (final Size size in sizes) {
          expect(size.width, moreOrLessEquals(rowWidth / 3));
          expect(size.height, sizes[1].height);
        }
        expect(sizes[1].height, greaterThan(tabsTokens.containerHeight));
        final double line = textStyleOf(tester, 'A').height! * textStyleOf(tester, 'A').fontSize!;
        expect(
          tester.getSize(find.text('A label much too long for one line')).height,
          greaterThan(line),
        );
      },
    );

    testWidgets('TAB-14: scrollable tabs are their content plus comp.tabs.container.padding-inline '
        'on each side, keep each label on one line, start at the start edge and scroll', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tabsApp(TabsOwner(initial: 'overview', tabs: sixTabs(), scrollable: true)),
      );
      final Rect row = tester.getRect(find.byType(TanreiTabBar<String>));
      expect(tester.getRect(containerOf('Overview')).left, row.left);
      for (final String label in sixLabels) {
        final Size text = tester.getSize(find.text(label));
        final Size box = tester.getSize(containerOf(label));
        expect(box.width, moreOrLessEquals(text.width + 2 * tabsTokens.containerPaddingInline));
        expect(text.height, moreOrLessEquals(textStyleOf(tester, label).height! * 14));
      }
      expect(find.byType(SingleChildScrollView), findsOneWidget);
      final ScrollPosition position = tester
          .state<ScrollableState>(find.byType(Scrollable))
          .position;
      expect(position.maxScrollExtent, greaterThan(0));
      await tester.drag(find.text('Overview'), const Offset(-200, 0));
      await tester.pumpAndSettle();
      expect(position.pixels, greaterThan(0));
    });

    testWidgets('TAB-18: a tab is at least comp.tabs.container.height tall; a primary tab with an '
        'icon and a label stacks them container.gap apart and is height-with-icon tall; a secondary '
        'tab puts its icon before its label; icons at icon.size through the icon helper with the '
        'tab\'s selection, labels in label.typescale', (WidgetTester tester) async {
      List<TanreiTab<String>> iconTabs() => <TanreiTab<String>>[
        tab('Overview', icon: const Text('A')),
        tab('Activity', icon: const Text('B')),
      ];
      await tester.pumpWidget(tabsApp(TabsOwner(initial: 'overview', tabs: threeTabs())));
      expect(tester.getSize(containerOf('Overview')).height, tabsTokens.containerHeight);
      expect(
        textStyleOf(tester, 'Overview').fontSize,
        tabsTokens.labelTypescale.toTextStyle().fontSize,
      );

      await tester.pumpWidget(
        tabsApp(TabsOwner(key: UniqueKey(), initial: 'overview', tabs: iconTabs())),
      );
      expect(tester.getSize(containerOf('Overview')).height, tabsTokens.containerHeightWithIcon);
      Rect icon = tester.getRect(
        find.descendant(of: tabOf('Overview'), matching: find.byType(TanreiControlIcon)),
      );
      Rect label = tester.getRect(find.text('Overview'));
      expect(label.top - icon.bottom, moreOrLessEquals(tabsTokens.containerGap));
      expect(icon.center.dx, moreOrLessEquals(label.center.dx));
      expect(iconOf(tester, 'Overview').size, tabsTokens.iconSize);
      expect(iconOf(tester, 'Overview').selected, isTrue);
      expect(iconOf(tester, 'Activity').selected, isFalse);
      expect(
        iconOf(tester, 'Overview').color,
        lightTheme.paint(tabsTokens.variants.primary.enabled.selectedIconColor),
      );
      expect(
        iconOf(tester, 'Activity').color,
        lightTheme.paint(tabsTokens.variants.primary.enabled.iconColor),
      );

      await tester.pumpWidget(
        tabsApp(
          TabsOwner(
            key: UniqueKey(),
            initial: 'overview',
            tabs: iconTabs(),
            variant: TanreiTabsVariant.secondary,
          ),
        ),
      );
      expect(tester.getSize(containerOf('Overview')).height, tabsTokens.containerHeight);
      icon = tester.getRect(
        find.descendant(of: tabOf('Overview'), matching: find.byType(TanreiControlIcon)),
      );
      label = tester.getRect(find.text('Overview'));
      expect(label.left - icon.right, moreOrLessEquals(tabsTokens.containerGap));
      expect(icon.center.dy, moreOrLessEquals(label.center.dy));
    });

    testWidgets('TAB-19: labelHidden draws only the icon and keeps the label as the name; '
        'labelHidden without an icon draws the label anyway and is reported once', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<String> reports = collectIgnoredValues();
      Widget build() => tabsApp(
        TanreiTabBar<String>(
          value: 'a',
          onChanged: (_) {},
          tabs: const <TanreiTab<String>>[
            TanreiTab<String>(value: 'a', label: 'Alpha', icon: Text('A'), labelHidden: true),
            TanreiTab<String>(value: 'b', label: 'Beta', labelHidden: true),
          ],
        ),
      );
      await tester.pumpWidget(build());
      expect(find.text('Alpha'), findsNothing);
      expect(find.text('A'), findsOneWidget);
      expect(tester.getSemantics(tabOf('Alpha')).getSemanticsData().label, 'Alpha');
      expect(tester.getSize(containerOf('Alpha')).height, tabsTokens.containerHeight);
      expect(find.text('Beta'), findsOneWidget);
      expect(reports.where((String r) => r.startsWith('tabs labelHidden')), hasLength(1));
      await tester.pumpWidget(build());
      expect(reports.where((String r) => r.startsWith('tabs labelHidden')), hasLength(1));
      handle.dispose();
    });

    testWidgets(
      'TAB-20: a divider of comp.tabs.divider.thickness in divider.color along the bottom '
      'of the whole row, under the tabs and the indicator, full width while scrolling, hidden '
      'from assistive technology',
      (WidgetTester tester) async {
        final SemanticsHandle handle = tester.ensureSemantics();
        await tester.pumpWidget(
          tabsApp(TabsOwner(initial: 'overview', tabs: sixTabs(), scrollable: true)),
        );
        final Finder divider = find.byWidgetPredicate(
          (Widget w) => w is ColoredBox && w.color == lightTheme.paint(tabsTokens.dividerColor),
        );
        final Rect row = tester.getRect(find.byType(TanreiTabBar<String>));
        Rect line = tester.getRect(divider);
        expect(line.width, rowWidth);
        expect(line.height, tabsTokens.dividerThickness);
        expect(line.bottom, row.bottom);
        await tester.drag(find.text('Overview'), const Offset(-200, 0));
        await tester.pumpAndSettle();
        line = tester.getRect(divider);
        expect(line.left, row.left);
        expect(line.width, rowWidth);
        // Under the tabs: the divider comes first in paint order.
        final Stack stack = tester.widget<Stack>(
          find.descendant(of: find.byType(TanreiTabBar<String>), matching: find.byType(Stack)),
        );
        expect(stack.children.first, isA<PositionedDirectional>());
        expect(
          find.descendant(
            of: find.byType(PositionedDirectional),
            matching: find.byType(ExcludeSemantics),
          ),
          findsOneWidget,
        );
        handle.dispose();
      },
    );

    testWidgets('TAB-21: in a right-to-left layout the tabs start from the right, a scrollable row '
        'starts at its right edge, and the indicator slides mirrored', (WidgetTester tester) async {
      final GlobalKey<TabsOwnerState> owner = GlobalKey<TabsOwnerState>();
      await tester.pumpWidget(
        tabsApp(
          TabsOwner(key: owner, initial: 'overview', tabs: threeTabs()),
          textDirection: TextDirection.rtl,
        ),
      );
      final Rect row = tester.getRect(find.byType(TanreiTabBar<String>));
      expect(tester.getRect(containerOf('Overview')).right, row.right);
      expect(
        tester.getRect(containerOf('Activity')).right,
        tester.getRect(containerOf('Overview')).left,
      );
      final double start = indicatorRect(tester)!.center.dx;
      owner.currentState!.set('activity');
      await tester.pump();
      await tester.pump(Duration(milliseconds: tabsTokens.motionIndicatorDuration ~/ 4));
      expect(indicatorRect(tester)!.center.dx, lessThan(start), reason: 'moving left');
      await tester.pumpAndSettle();

      await tester.pumpWidget(
        tabsApp(
          TabsOwner(key: UniqueKey(), initial: 'overview', tabs: sixTabs(), scrollable: true),
          textDirection: TextDirection.rtl,
        ),
      );
      final Rect scrolling = tester.getRect(find.byType(TanreiTabBar<String>));
      expect(tester.getRect(containerOf('Overview')).right, scrolling.right);
    });

    testWidgets('TAB-22: a tab with an empty label still renders and is reported once', (
      WidgetTester tester,
    ) async {
      final List<String> reports = collectMissingNames();
      Widget build() => tabsApp(
        TanreiTabBar<String>(
          value: 'a',
          onChanged: (_) {},
          tabs: <TanreiTab<String>>[
            tab('', value: 'a'),
            tab('Two', value: 'b'),
          ],
        ),
      );
      await tester.pumpWidget(build());
      expect(find.byType(TanreiTab<String>), findsNWidgets(2));
      expect(reports, <String>['tab']);
      await tester.pumpWidget(build());
      expect(reports, hasLength(1));
      debugTanreiReportMissingName = tanreiReportMissingName;
      await tester.pumpWidget(
        tabsApp(
          TanreiTabBar<String>(
            key: UniqueKey(),
            value: 'a',
            onChanged: (_) {},
            tabs: <TanreiTab<String>>[tab(' ', value: 'a')],
          ),
        ),
      );
      final Object? reported = tester.takeException();
      expect('$reported', contains('tab has no accessible name'));
      expect('$reported', contains('label'));
    });
  });

  group('indicator', () {
    testWidgets(
      'TAB-16: the indicator is on the bottom edge of the row, active-indicator.thickness '
      'thick, its top corners rounded by active-indicator.shape; primary spans the tab\'s content, '
      'secondary the whole tab',
      (WidgetTester tester) async {
        final TanreiTabsVariantStateTokens primary = tabsTokens.variants.primary.enabled;
        final TanreiTabsVariantStateTokens secondary = tabsTokens.variants.secondary.enabled;
        await tester.pumpWidget(tabsApp(TabsOwner(initial: 'activity', tabs: threeTabs())));
        final Rect row = tester.getRect(find.byType(TanreiTabBar<String>));
        Rect rect = indicatorRect(tester)!;
        final Rect text = tester.getRect(find.text('Activity'));
        expect(rect.left, moreOrLessEquals(text.left));
        expect(rect.right, moreOrLessEquals(text.right));
        expect(rect.height, primary.activeIndicatorThickness);
        expect(rect.bottom, row.bottom);
        expect(
          tester.renderObject(find.byType(TanreiTabBar<String>)),
          paints..rrect(
            rrect: RRect.fromRectAndCorners(
              indicatorLayer(tester).indicatorRect!,
              topLeft: Radius.circular(primary.activeIndicatorShape),
              topRight: Radius.circular(primary.activeIndicatorShape),
            ),
            color: lightTheme.paint(primary.selectedActiveIndicatorColor),
          ),
        );
        // An icon wider than the label: the icon's extent.
        await tester.pumpWidget(
          tabsApp(
            TabsOwner(
              key: UniqueKey(),
              initial: 'a',
              tabs: <TanreiTab<String>>[
                tab('I', value: 'a', icon: const Text('X')),
                tab('Two', value: 'b'),
              ],
            ),
          ),
        );
        expect(indicatorRect(tester)!.width, tabsTokens.iconSize);

        await tester.pumpWidget(
          tabsApp(
            TabsOwner(
              key: UniqueKey(),
              initial: 'activity',
              tabs: threeTabs(),
              variant: TanreiTabsVariant.secondary,
            ),
          ),
        );
        rect = indicatorRect(tester)!;
        expect(rect.left, moreOrLessEquals(tester.getRect(containerOf('Activity')).left));
        expect(rect.width, moreOrLessEquals(rowWidth / 3));
        expect(rect.height, secondary.activeIndicatorThickness);
        expect(secondary.activeIndicatorThickness, isNot(primary.activeIndicatorThickness));
      },
    );

    testWidgets('TAB-17: the indicator slides and resizes from the old tab to the new one over '
        'comp.tabs.motion.indicator-duration with its easing, at once where motion is reduced; the '
        'panel changes at once', (WidgetTester tester) async {
      final GlobalKey<TabsOwnerState> owner = GlobalKey<TabsOwnerState>();
      final List<TanreiTab<String>> tabs = <TanreiTab<String>>[
        tab('Go', value: 'a'),
        tab('Somewhere far', value: 'b'),
      ];
      await tester.pumpWidget(
        tabsApp(TabsOwner(key: owner, initial: 'a', tabs: tabs, panels: true)),
      );
      final Rect from = indicatorRect(tester)!;
      owner.currentState!.set('b');
      await tester.pump();
      expect(find.text('Somewhere far panel'), findsOneWidget);
      expect(find.text('Go panel'), findsNothing);
      final Rect to = tester.getRect(find.text('Somewhere far'));
      await tester.pump(Duration(milliseconds: tabsTokens.motionIndicatorDuration ~/ 2));
      final double t = tabsTokens.motionIndicatorEasing.toCurve().transform(0.5);
      final Rect mid = indicatorRect(tester)!;
      expect(mid.left, moreOrLessEquals(from.left + (to.left - from.left) * t, epsilon: 0.01));
      expect(mid.right, moreOrLessEquals(from.right + (to.right - from.right) * t, epsilon: 0.01));
      await tester.pumpAndSettle();
      expect(indicatorRect(tester)!.left, moreOrLessEquals(to.left));

      final GlobalKey<TabsOwnerState> reduced = GlobalKey<TabsOwnerState>();
      await tester.pumpWidget(
        tabsApp(TabsOwner(key: reduced, initial: 'a', tabs: tabs), disableAnimations: true),
      );
      reduced.currentState!.set('b');
      await tester.pump();
      expect(indicatorRect(tester)!.left, moreOrLessEquals(to.left));
    });

    testWidgets('TAB-15: a tab that becomes selected or receives keyboard focus while partly out '
        'of view scrolls into view over the indicator\'s motion, and at once where motion is '
        'reduced', (WidgetTester tester) async {
      final GlobalKey<TabsOwnerState> owner = GlobalKey<TabsOwnerState>();
      await tester.pumpWidget(
        tabsApp(TabsOwner(key: owner, initial: 'overview', tabs: sixTabs(), scrollable: true)),
      );
      final Rect row = tester.getRect(find.byType(TanreiTabBar<String>));
      final double hidden = tester.getRect(containerOf('Analytics')).right;
      expect(hidden, greaterThan(row.right));
      owner.currentState!.set('analytics');
      await tester.pump();
      await tester.pump();
      await tester.pump(Duration(milliseconds: tabsTokens.motionIndicatorDuration ~/ 2));
      final double moving = tester.getRect(containerOf('Analytics')).right;
      expect(moving, lessThan(hidden), reason: 'on its way');
      expect(moving, greaterThan(row.right), reason: 'not there yet');
      await tester.pumpAndSettle();
      expect(tester.getRect(containerOf('Analytics')).right, moreOrLessEquals(row.right));

      // Keyboard focus moving onto a hidden tab.
      await tabInto(tester);
      await tester.sendKeyEvent(LogicalKeyboardKey.end);
      await tester.pumpAndSettle();
      expect(focusedLabel(), 'Settings');
      expect(tester.getRect(containerOf('Settings')).right, moreOrLessEquals(row.right));
      await tester.sendKeyEvent(LogicalKeyboardKey.home);
      await tester.pumpAndSettle();
      expect(tester.getRect(containerOf('Overview')).left, moreOrLessEquals(row.left));

      final GlobalKey<TabsOwnerState> reduced = GlobalKey<TabsOwnerState>();
      await tester.pumpWidget(
        tabsApp(
          TabsOwner(key: reduced, initial: 'overview', tabs: sixTabs(), scrollable: true),
          disableAnimations: true,
        ),
      );
      reduced.currentState!.set('storage');
      await tester.pump();
      await tester.pump();
      expect(tester.getRect(containerOf('Storage')).right, moreOrLessEquals(row.right));
    });
    testWidgets('TAB-15: when the row first appears with its selected tab out of view it scrolls '
        'there at once, with no animation (1c12655)', (WidgetTester tester) async {
      await tester.pumpWidget(
        tabsApp(TabsOwner(initial: 'storage', tabs: sixTabs(), scrollable: true)),
      );
      final ScrollPosition position = tester
          .state<ScrollableState>(find.byType(Scrollable))
          .position;
      // The frame after the first one shows the selected tab whole, with nothing left to animate.
      await tester.pump();
      final Rect row = tester.getRect(find.byType(TanreiTabBar<String>));
      final Rect storage = tester.getRect(containerOf('Storage'));
      expect(position.pixels, greaterThan(0));
      expect(storage.right, moreOrLessEquals(row.right));
      expect(storage.left, greaterThanOrEqualTo(row.left));
      expect(
        tester.hasRunningAnimations,
        isFalse,
        reason: 'at once, not over the indicator motion',
      );

      // A selected tab already in view: the row stays at its start edge.
      await tester.pumpWidget(
        tabsApp(
          TabsOwner(key: UniqueKey(), initial: 'overview', tabs: sixTabs(), scrollable: true),
        ),
      );
      await tester.pump();
      expect(tester.state<ScrollableState>(find.byType(Scrollable)).position.pixels, 0);
    });

    testWidgets('TAB-16: a tab\'s content stays clear of its indicator — a label that wraps grows '
        'the tab rather than running under it (1c12655)', (WidgetTester tester) async {
      const String long = 'A label much too long for one line';
      for (final TanreiTabsVariant variant in <TanreiTabsVariant>[
        TanreiTabsVariant.primary,
        TanreiTabsVariant.secondary,
      ]) {
        await tester.pumpWidget(
          tabsApp(
            TabsOwner(
              key: UniqueKey(),
              initial: 'b',
              variant: variant,
              tabs: <TanreiTab<String>>[
                tab('A', value: 'a'),
                tab(long, value: 'b'),
                tab('C', value: 'c'),
              ],
            ),
          ),
        );
        final Rect text = tester.getRect(find.text(long));
        final Rect indicator = indicatorRect(tester)!;
        final Rect box = tester.getRect(containerOf(long));
        expect(box.height, greaterThan(tabsTokens.containerHeight), reason: '$variant grows');
        expect(text.bottom, lessThanOrEqualTo(indicator.top), reason: '$variant: clear of it');
        expect(indicator.bottom, moreOrLessEquals(box.bottom));
      }
    });
  });

  group('accessibility semantics', () {
    testWidgets('TAB-13: the tab list named by the row\'s label; tabs with the tab role, their '
        'selected state and their label, drawn or not; the selected panel with the tab panel role '
        'named by its tab, the others hidden, a panel with nothing focusable made focusable', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(
        tabsApp(
          TabsOwner(
            initial: 'activity',
            semanticLabel: 'Project',
            panels: true,
            tabs: <TanreiTab<String>>[
              tab('Overview'),
              const TanreiTab<String>(
                value: 'activity',
                label: 'Activity',
                icon: Text('A'),
                labelHidden: true,
              ),
              tab('Settings'),
            ],
          ),
        ),
      );
      final List<SemanticsNode> nodes = nodesBelow(semanticsRoot(tester));
      final SemanticsNode bar = nodes.firstWhere(
        (SemanticsNode n) => n.getSemanticsData().role == SemanticsRole.tabBar,
      );
      expect(bar.getSemanticsData().label, 'Project');
      final List<SemanticsData> tabs = <SemanticsData>[];
      bar.visitChildren((SemanticsNode child) {
        tabs.add(child.getSemanticsData());
        return true;
      });
      expect(tabs.map((SemanticsData t) => t.role), everyElement(SemanticsRole.tab));
      expect(tabs.map((SemanticsData t) => t.label), <String>['Overview', 'Activity', 'Settings']);
      expect(tabs.map((SemanticsData t) => t.hasFlag(SemanticsFlag.isSelected)), <bool>[
        false,
        true,
        false,
      ]);
      expect(tabs.every((SemanticsData t) => t.hasFlag(SemanticsFlag.hasSelectedState)), isTrue);
      expect(tabs.every((SemanticsData t) => t.hasAction(SemanticsAction.tap)), isTrue);
      final SemanticsData panel = nodes
          .firstWhere((SemanticsNode n) => n.getSemanticsData().role == SemanticsRole.tabPanel)
          .getSemanticsData();
      expect(panel.label, 'Activity');
      expect(panel.hasFlag(SemanticsFlag.isFocusable), isTrue);
      expect(find.text('Overview panel'), findsNothing);
      expect(find.text('Settings panel'), findsNothing);
      // Icons, the indicator and the divider are not read.
      expect(
        nodes
            .map((SemanticsNode n) => n.getSemanticsData().label)
            .where((String l) => l.isNotEmpty),
        <String>['Project', 'Overview', 'Activity', 'Settings', 'Activity', 'Activity panel'],
      );

      // A panel with focusable content is not a stop of its own.
      await tester.pumpWidget(
        tabsApp(
          TanreiTabBarView<String>(
            value: 'a',
            children: <String, Widget>{
              'a': TanreiButton(onPressed: () {}, child: const Text('Inside')),
            },
          ),
        ),
      );
      await tester.pump();
      final SemanticsData withButton = nodesBelow(semanticsRoot(tester))
          .firstWhere((SemanticsNode n) => n.getSemanticsData().role == SemanticsRole.tabPanel)
          .getSemanticsData();
      expect(withButton.hasFlag(SemanticsFlag.isFocusable), isFalse);
      handle.dispose();
    });

    testWidgets('guidelines: tabs', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final TanreiThemeData theme in <TanreiThemeData>[
        TanreiThemeData.light,
        TanreiThemeData.dark,
      ]) {
        for (final TanreiTabsVariant variant in TanreiTabsVariant.core) {
          await tester.pumpWidget(
            tabsApp(
              TabsOwner(
                key: UniqueKey(),
                initial: 'overview',
                tabs: threeTabs(),
                variant: variant,
                semanticLabel: 'Project',
              ),
              theme: theme,
            ),
          );
          await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
          await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
          await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
          await expectLater(tester, meetsGuideline(textContrastGuideline));
        }
      }
      handle.dispose();
    });

    // WCAG 1.4.3 and 1.4.11 in every scheme of the default system: text 4.5:1 and the icon and the
    // indicator 3:1 on the surface. An imitation preset is held to its original, not to these
    // criteria, in any scheme.
    test('contrast: "${system.id}" text 4.5:1, icons and the indicator 3:1 on the surface', () {
      final List<String> failures = <String>[];
      for (final Brightness brightness in Brightness.values) {
        for (final TanreiContrast contrast in TanreiContrast.values) {
          final TanreiThemeData theme = TanreiThemeData(
            system: system,
            brightness: brightness,
            contrast: contrast,
          );
          final Color surface = theme.colors.surface;
          final String scheme = '${brightness.name} ${contrast.name}';
          for (final TanreiTabsVariant variant in TanreiTabsVariant.core) {
            final TanreiTabsVariantStateTokens rest = system.tabs.variants[variant].enabled;
            for (final (String part, TanreiPaint paint, double minimum)
                in <(String, TanreiPaint, double)>[
                  ('label', rest.labelColor, 4.5),
                  ('selected label', rest.selectedLabelColor, 4.5),
                  ('icon', rest.iconColor, 3),
                  ('selected icon', rest.selectedIconColor, 3),
                  ('indicator', rest.selectedActiveIndicatorColor, 3),
                ]) {
              final double ratio = contrastOf(
                Color.alphaBlend(theme.paint(paint), surface),
                surface,
              );
              if (ratio < minimum) {
                failures.add('$scheme ${variant.name} $part ${ratio.toStringAsFixed(2)}');
              }
            }
          }
        }
      }
      expect(failures, isEmpty);
    });
  });

  group('a design system drives rendering', () {
    test('the tokens the widget reads: their default values', () {
      expect(tabsTokens.containerHeight, 48);
      expect(tabsTokens.containerHeightWithIcon, 64);
      expect(tabsTokens.containerPaddingInline, system.space.space200);
      expect(tabsTokens.containerGap, system.space.space50);
      expect(tabsTokens.containerShape, system.shape.none);
      expect(tabsTokens.iconSize, 20);
      expect(tabsTokens.labelTypescale, system.typescale.label);
      expect(tabsTokens.dividerColor, const TanreiPaint.role(TanreiColorRole.outlineVariant));
      expect(tabsTokens.variants.primary.enabled.activeIndicatorThickness, 3);
      expect(tabsTokens.variants.secondary.enabled.activeIndicatorThickness, 2);
      expect(
        lightTheme.paint(tabsTokens.variants.primary.enabled.selectedActiveIndicatorColor),
        light.primary,
      );
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": tabs at rest draw the enabled tokens of that system', (
        WidgetTester tester,
      ) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        // A row wide enough that the test font's labels stay on one line.
        await tester.pumpWidget(
          tabsApp(
            TabsOwner(initial: 'overview', tabs: threeTabs(), width: 600),
            theme: theme,
          ),
        );
        final TanreiTabsVariantStateTokens rest = shipped.tabs.variants.primary.enabled;
        expect(textColor(tester, 'Overview'), theme.paint(rest.selectedLabelColor));
        expect(textColor(tester, 'Activity'), theme.paint(rest.labelColor));
        expect(decorationOf(tester, 'Overview').shape.smoothing, shipped.shape.cornerSmoothing);
        expect(
          tester.getSize(containerOf('Overview')).height,
          math.max(shipped.tabs.containerHeight, shipped.measure.targetTouch),
        );
        expect(indicatorRect(tester)!.height, rest.activeIndicatorThickness);
      });
    }
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('tabs');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'primary',
        'secondary',
        'primary-icons',
        'secondary-icons',
        'primary-icon-only',
        'primary-second-selected',
        'primary-scrollable',
        'secondary-scrollable',
        'primary-disabled',
        'secondary-disabled',
        'primary-selected-disabled',
      ]);
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          surface: tabsGoldenSurface,
          child: fixtureTabs(fixture),
          file: 'goldens/tabs/$id.png',
          // TAB-15: a scrollable row brings its selected tab into view once laid out.
          settle: true,
        );
      });
    }

    // One representative fixture per shipped preset: primary tabs with icons show the
    // preset's selected text, icon size, indicator and divider at once.
    const String recorded = 'primary-icons';
    for (final TanreiSystem preset in <TanreiSystem>[m3LikeSystem, cupertinoSystem]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: tabsGoldenSurface,
          child: fixtureTabs(fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded)),
          file: 'goldens/tabs/${preset.id}/$recorded.png',
          settle: true,
        );
      });
    }
  });
}
