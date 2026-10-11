import 'dart:math' as math;

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

const TanreiSystem system = tanreiSystem;
final TanreiNavigationBarTokens barTokens = system.navigationBar;
final TanreiColors light = system.schemes.light;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The width of every bar in these tests and baselines.
const double barWidth = 360;

/// The frame of the navigation bar baselines: a bar 360 wide in the `space200` padding of every
/// baseline.
const Size navigationBarGoldenSurface = Size(392, 112);

TanreiNavigationBarConditionStateTokens partsOf(bool selected, TanreiInteractionState state) =>
    barTokens
        .conditions[selected
            ? TanreiNavigationBarCondition.selected
            : TanreiNavigationBarCondition.unselected]
        .of(state);

/// The bar a fixture describes (NVB-11's `verify`): 360 wide, the destinations in order, the one
/// whose value is the fixture's value selected by its index.
Widget fixtureNavigationBar(Map<String, dynamic> fixture) {
  final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
  final List<Map<String, dynamic>> items = (fixture['items'] as List<dynamic>)
      .cast<Map<String, dynamic>>()
      .map((Map<String, dynamic> item) => item['props'] as Map<String, dynamic>)
      .toList();
  final int index = items.indexWhere(
    (Map<String, dynamic> item) => item['value'] == props['value'],
  );
  return SizedBox(
    width: barWidth,
    child: TanreiNavigationBar(
      selectedIndex: index < 0 ? null : index,
      onDestinationSelected: (_) {},
      labelBehavior: switch (props['labelVisibility'] as String? ?? 'always') {
        'selected' => TanreiNavigationBarLabelBehavior.onlyShowSelected,
        'never' => TanreiNavigationBarLabelBehavior.alwaysHide,
        _ => TanreiNavigationBarLabelBehavior.alwaysShow,
      },
      semanticLabel: props['label'] as String? ?? '',
      destinations: <TanreiNavigationDestination>[
        for (final Map<String, dynamic> item in items)
          TanreiNavigationDestination(
            icon: navigationGlyph(item['icon'] as String?),
            label: item['label'] as String? ?? '',
            enabled: item['disabled'] != true,
            badge: item['badge'] == true
                ? TanreiNavigationBadge(
                    count: item['badgeCount'] as num?,
                    semanticLabel: item['badgeLabel'] as String? ?? '',
                  )
                : null,
          ),
      ],
    ),
  );
}

TanreiNavigationDestination destination(
  String label, {
  String icon = 'inbox',
  bool enabled = true,
  TanreiNavigationBadge? badge,
}) => TanreiNavigationDestination(
  icon: navigationGlyph(icon),
  label: label,
  enabled: enabled,
  badge: badge,
);

List<TanreiNavigationDestination> fourDestinations({bool starredEnabled = true}) =>
    <TanreiNavigationDestination>[
      destination('Inbox'),
      destination('Sent', icon: 'send'),
      destination('Starred', icon: 'star', enabled: starredEnabled),
      destination('Settings', icon: 'settings'),
    ];

/// A bar whose owner stores the selection, recording every call of onDestinationSelected.
class BarOwner extends StatefulWidget {
  const BarOwner({
    super.key,
    this.initial = 0,
    required this.destinations,
    this.calls,
    this.store = true,
    this.labelBehavior = TanreiNavigationBarLabelBehavior.alwaysShow,
    this.semanticLabel = 'Main',
  });

  final int? initial;
  final List<TanreiNavigationDestination> destinations;
  final List<int>? calls;
  final bool store;
  final TanreiNavigationBarLabelBehavior labelBehavior;
  final String semanticLabel;

  @override
  State<BarOwner> createState() => BarOwnerState();
}

class BarOwnerState extends State<BarOwner> {
  late int? selected = widget.initial;

  void set(int? index) => setState(() => selected = index);

  @override
  Widget build(BuildContext context) => SizedBox(
    width: barWidth,
    child: TanreiNavigationBar(
      selectedIndex: selected,
      labelBehavior: widget.labelBehavior,
      semanticLabel: widget.semanticLabel,
      onDestinationSelected: (int index) {
        widget.calls?.add(index);
        if (widget.store) {
          set(index);
        }
      },
      destinations: widget.destinations,
    ),
  );
}

Finder barFinder() => find.byType(TanreiNavigationBar);

/// The bar's own container.
Finder barContainer() => find
    .descendant(
      of: barFinder(),
      matching: find.byWidgetPredicate(
        (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
      ),
    )
    .first;

TanreiEdgePainter edgeOf(WidgetTester tester) =>
    tester
            .widget<CustomPaint>(
              find
                  .descendant(
                    of: barFinder(),
                    matching: find.byWidgetPredicate(
                      (Widget w) => w is CustomPaint && w.foregroundPainter is TanreiEdgePainter,
                    ),
                  )
                  .first,
            )
            .foregroundPainter!
        as TanreiEdgePainter;

double growOf(WidgetTester tester, String label) => tester
    .widget<FractionallySizedBox>(
      find.descendant(of: destinationOf(label), matching: find.byType(FractionallySizedBox)),
    )
    .widthFactor!;

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  final Duration hold = tanreiDuration(system.motion.duration.pressHold);
  const Duration tick = Duration(milliseconds: 1);

  group('selection and events', () {
    testWidgets('NVB-1: pointer, touch, Enter or Space on a destination calls '
        'onDestinationSelected once with its index — change for another destination, reselect '
        'for the selected one', (WidgetTester tester) async {
      final List<int> calls = <int>[];
      await tester.pumpWidget(
        navigationApp(BarOwner(destinations: fourDestinations(), calls: calls, store: false)),
      );
      await tester.tap(destinationOf('Sent'));
      await tester.pumpAndSettle();
      expect(calls, <int>[1], reason: 'change');
      await tester.tap(destinationOf('Inbox'));
      await tester.pumpAndSettle();
      expect(calls, <int>[1, 0], reason: 'reselect: the selected index');
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pumpAndSettle();
      expect(calls, <int>[1, 0, 1, 1]);
    });

    testWidgets('NVB-2: a disabled destination calls nothing, is not focusable and is exposed as '
        'disabled', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<int> calls = <int>[];
      await tester.pumpWidget(
        navigationApp(
          BarOwner(destinations: fourDestinations(starredEnabled: false), calls: calls),
        ),
      );
      await tester.tap(destinationOf('Starred'));
      await tester.pumpAndSettle();
      expect(calls, isEmpty);
      final List<String> focused = <String>[];
      for (int i = 0; i < 3; i++) {
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pump();
        focused.add(
          FocusManager.instance.primaryFocus!.context!
              .findAncestorWidgetOfExactType<TanreiNavigationItem>()!
              .label,
        );
      }
      expect(focused, <String>['Inbox', 'Sent', 'Settings']);
      final SemanticsData starred = nodesWithRole(
        tester,
        SemanticsRole.tab,
      ).singleWhere((SemanticsData d) => d.label == 'Starred');
      expect(starred.hasFlag(SemanticsFlag.hasEnabledState), isTrue);
      expect(starred.hasFlag(SemanticsFlag.isEnabled), isFalse);
      handle.dispose();
    });

    testWidgets('NVB-3: the selected destination draws the selected parts, the others the '
        'unselected ones; an index that names no destination selects none and is reported', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(navigationApp(BarOwner(destinations: fourDestinations())));
      final TanreiNavigationBarConditionStateTokens selected = partsOf(
        true,
        TanreiInteractionState.enabled,
      );
      final TanreiNavigationBarConditionStateTokens unselected = partsOf(
        false,
        TanreiInteractionState.enabled,
      );
      expect(itemFillOf(tester, 'Inbox'), lightTheme.paint(selected.itemContainerColor));
      expect(itemIconOf(tester, 'Inbox').color, lightTheme.paint(selected.itemIconColor));
      expect(itemLabelStyleOf(tester, 'Inbox')!.color, lightTheme.paint(selected.itemLabelColor));
      expect(itemFillOf(tester, 'Sent').a, 0);
      expect(itemIconOf(tester, 'Sent').color, lightTheme.paint(unselected.itemIconColor));
      expect(itemLabelStyleOf(tester, 'Sent')!.color, lightTheme.paint(unselected.itemLabelColor));

      final List<String> reports = collectIgnoredValues();
      await tester.pumpWidget(
        navigationApp(BarOwner(key: UniqueKey(), initial: 7, destinations: fourDestinations())),
      );
      expect(reports.single, contains('names no destination'));
      for (final String label in <String>['Inbox', 'Sent', 'Starred', 'Settings']) {
        expect(itemFillOf(tester, label).a, 0, reason: label);
        expect(itemIconOf(tester, label).selected, isFalse, reason: label);
      }
    });

    testWidgets('NVB-22: a destination\'s value is its index, so no two repeat: the index selects '
        'exactly one destination even when two look alike', (WidgetTester tester) async {
      final List<int> calls = <int>[];
      await tester.pumpWidget(
        navigationApp(
          BarOwner(
            initial: 1,
            calls: calls,
            store: false,
            destinations: <TanreiNavigationDestination>[
              destination('Inbox'),
              destination('Inbox'),
              destination('Sent', icon: 'send'),
            ],
          ),
        ),
      );
      final List<TanreiControlIcon> icons = tester
          .widgetList<TanreiControlIcon>(find.byType(TanreiControlIcon))
          .toList();
      expect(icons.map((TanreiControlIcon i) => i.selected), <bool>[false, true, false]);
      await tester.tap(find.byType(TanreiNavigationItem).first);
      await tester.pumpAndSettle();
      expect(calls, <int>[0]);
    });
  });

  group('states', () {
    testWidgets('NVB-4: under the acme system hovered, focused and pressed draw their own tokens, '
        'pressed over focused over hovered; focus from a pointer draws no focused state', (
      WidgetTester tester,
    ) async {
      const TanreiThemeData acme = TanreiThemeData(system: acmeSystem);
      final TanreiNavigationBarConditionTokens unselected =
          acmeSystem.navigationBar.conditions.unselected;
      Color fill(TanreiInteractionState state) =>
          acme.paint(unselected.of(state).itemContainerColor);
      expect(<Color>{
        fill(TanreiInteractionState.hovered),
        fill(TanreiInteractionState.focused),
        fill(TanreiInteractionState.pressed),
      }, hasLength(3));
      await tester.pumpWidget(
        navigationApp(BarOwner(destinations: fourDestinations(), store: false), theme: acme),
      );
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pumpAndSettle();
      expect(itemFillOf(tester, 'Sent'), fill(TanreiInteractionState.focused));
      final TestGesture mouse = await hoverOver(tester, destinationOf('Sent'));
      expect(itemFillOf(tester, 'Sent'), fill(TanreiInteractionState.focused));
      await mouse.down(tester.getCenter(destinationOf('Sent')));
      await tester.pump();
      expect(itemFillOf(tester, 'Sent'), fill(TanreiInteractionState.pressed));
      expect(itemIconOf(tester, 'Sent').color, acme.paint(unselected.pressed.itemIconColor));
      await mouse.up();
      await tester.pumpAndSettle();
      await mouse.moveTo(tester.getCenter(destinationOf('Settings')));
      await tester.pumpAndSettle();
      expect(itemFillOf(tester, 'Settings'), fill(TanreiInteractionState.hovered));

      // Focus gained by a pointer draws no focused state.
      await tester.pumpWidget(
        navigationApp(
          BarOwner(key: UniqueKey(), destinations: fourDestinations(), store: false),
          theme: acme,
        ),
      );
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      await tester.tap(destinationOf('Starred'));
      await tester.pumpAndSettle();
      expect(itemFillOf(tester, 'Starred'), fill(TanreiInteractionState.enabled));
    });

    testWidgets('NVB-5: keyboard focus shows the focus ring around the item container at once; '
        'focus from a pointer shows none', (WidgetTester tester) async {
      await tester.pumpWidget(navigationApp(BarOwner(destinations: fourDestinations())));
      expect(itemRingVisible(tester, 'Inbox'), isFalse);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(itemRingVisible(tester, 'Inbox'), isTrue);
      // Around the item container: the ring wraps the item container's box.
      expect(
        tester.getSize(
          find.descendant(of: destinationOf('Inbox'), matching: find.byType(TanreiFocusRing)),
        ),
        Size(barTokens.itemContainerWidth, barTokens.itemContainerHeight),
      );
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      await tester.tap(destinationOf('Sent'));
      await tester.pump();
      expect(itemRingVisible(tester, 'Sent'), isFalse);
    });

    testWidgets('NVB-6: the whole cell is the hit area — an equal share of the width, the bar\'s '
        'full height — and hover over any part of it answers on the item container', (
      WidgetTester tester,
    ) async {
      final List<int> calls = <int>[];
      await tester.pumpWidget(
        navigationApp(BarOwner(destinations: fourDestinations(), calls: calls, store: false)),
      );
      final Rect bar = tester.getRect(barContainer());
      final Rect cell = tester.getRect(destinationOf('Sent'));
      expect(cell.width, moreOrLessEquals(barWidth / 4));
      expect(cell.height, bar.height);
      expect(cell.height, greaterThanOrEqualTo(system.measure.targetTouch));
      await tester.tapAt(cell.topLeft + const Offset(2, 2));
      await tester.pumpAndSettle();
      expect(calls, <int>[1]);
      final TestGesture mouse = await hoverOver(tester, destinationOf('Settings'));
      await mouse.moveTo(
        tester.getRect(destinationOf('Settings')).bottomRight - const Offset(2, 2),
      );
      await tester.pumpAndSettle();
      expect(
        itemFillOf(tester, 'Settings'),
        lightTheme.paint(partsOf(false, TanreiInteractionState.hovered).itemContainerColor),
      );
    });

    testWidgets('NVB-7: a disabled destination draws the disabled tokens of its condition and '
        'the disabled opacity', (WidgetTester tester) async {
      await tester.pumpWidget(
        navigationApp(BarOwner(destinations: fourDestinations(starredEnabled: false))),
      );
      final TanreiNavigationBarConditionStateTokens disabled = partsOf(
        false,
        TanreiInteractionState.disabled,
      );
      expect(itemIconOf(tester, 'Starred').color, lightTheme.paint(disabled.itemIconColor));
      expect(itemLabelStyleOf(tester, 'Starred')!.color, lightTheme.paint(disabled.itemLabelColor));
      expect(itemFillOf(tester, 'Starred'), lightTheme.paint(disabled.itemContainerColor));
      expect(itemOpacityOf(tester, 'Starred'), barTokens.disabled.opacity);

      // A disabled selected destination keeps its indicator.
      await tester.pumpWidget(
        navigationApp(
          BarOwner(
            key: UniqueKey(),
            initial: 2,
            destinations: fourDestinations(starredEnabled: false),
          ),
        ),
      );
      expect(
        itemFillOf(tester, 'Starred'),
        lightTheme.paint(partsOf(true, TanreiInteractionState.disabled).itemContainerColor),
      );
      expect(itemFillOf(tester, 'Starred').a, greaterThan(0));
    });
  });

  group('press hold (NVB-8)', () {
    testWidgets('NVB-8: a touch press shows the pressed state without delay and keeps it for the '
        'press-hold duration', (WidgetTester tester) async {
      const TanreiThemeData acme = TanreiThemeData(system: acmeSystem);
      final Color pressed = acme.paint(
        acmeSystem.navigationBar.conditions.unselected.pressed.itemContainerColor,
      );
      await tester.pumpWidget(
        navigationApp(BarOwner(destinations: fourDestinations(), store: false), theme: acme),
      );
      await tester.tap(destinationOf('Sent'));
      await tester.pump();
      expect(itemFillOf(tester, 'Sent'), pressed);
      await tester.pump(hold - tick);
      expect(itemFillOf(tester, 'Sent'), pressed);
      await tester.pump(tick);
      await tester.pumpAndSettle();
      expect(itemFillOf(tester, 'Sent'), isNot(pressed));
    });

    testWidgets('NVB-8: Enter shows the pressed state at once and for the press-hold duration', (
      WidgetTester tester,
    ) async {
      const TanreiThemeData acme = TanreiThemeData(system: acmeSystem);
      final Color pressed = acme.paint(
        acmeSystem.navigationBar.conditions.selected.pressed.itemContainerColor,
      );
      await tester.pumpWidget(
        navigationApp(BarOwner(destinations: fourDestinations(), store: false), theme: acme),
      );
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pump();
      expect(itemFillOf(tester, 'Inbox'), pressed);
      await tester.pump(hold - tick);
      expect(itemFillOf(tester, 'Inbox'), pressed);
      await tester.pump(tick);
      await tester.pumpAndSettle();
      expect(itemFillOf(tester, 'Inbox'), isNot(pressed));
    });
  });

  group('choices of kind', () {
    testWidgets('NVB-9: overlay (default) fills the pressed item container at once; ripple '
        '(m3-like) grows it from the point of contact, clipped to the item container, from its '
        'center for a press outside it; dim (cupertino) dims the destination and draws no state '
        'layer; none draws no answer', (WidgetTester tester) async {
      Widget bar(TanreiThemeData theme) => navigationApp(
        BarOwner(key: UniqueKey(), destinations: fourDestinations(), store: false),
        theme: theme,
      );
      await tester.pumpWidget(bar(lightTheme));
      TestGesture touch = await tester.startGesture(tester.getCenter(itemContainerOf('Sent')));
      await tester.pump();
      expect(
        itemFillOf(tester, 'Sent'),
        lightTheme.paint(partsOf(false, TanreiInteractionState.pressed).itemContainerColor),
      );
      expect(itemDecorationOf(tester, 'Sent').ripple, isNull);
      await touch.up();
      await tester.pumpAndSettle();

      const TanreiThemeData m3 = TanreiThemeData(system: m3LikeSystem);
      await tester.pumpWidget(bar(m3));
      final Rect box = tester.getRect(itemContainerOf('Sent'));
      const Offset contact = Offset(10, 8);
      touch = await tester.startGesture(box.topLeft + contact);
      await tester.pump();
      final TanreiRipple ripple = itemDecorationOf(tester, 'Sent').ripple!;
      expect(ripple.origin, contact);
      expect(
        ripple.color,
        m3.paint(m3LikeSystem.navigationBar.conditions.unselected.pressed.itemContainerColor),
      );
      await tester.pump(tanreiDuration(m3LikeSystem.navigationBar.motionFeedbackDuration) ~/ 2);
      expect(
        itemDecorationOf(tester, 'Sent').ripple!.progress,
        moreOrLessEquals(m3LikeSystem.navigationBar.motionStateEasing.toCurve().transform(0.5)),
      );
      await touch.up();
      await tester.pumpAndSettle();
      // Outside the item container, in the cell: from its center.
      touch = await tester.startGesture(
        tester.getRect(destinationOf('Sent')).topLeft + const Offset(3, 3),
      );
      await tester.pump();
      expect(itemDecorationOf(tester, 'Sent').ripple!.origin, isNull);
      await touch.up();
      await tester.pumpAndSettle();

      await tester.pumpWidget(bar(const TanreiThemeData(system: cupertinoSystem)));
      touch = await tester.startGesture(tester.getCenter(destinationOf('Sent')));
      await tester.pump();
      expect(itemOpacityOf(tester, 'Sent'), cupertinoSystem.navigationBar.pressed.opacity);
      expect(cupertinoSystem.navigationBar.pressed.opacity, lessThan(1));
      expect(itemFillOf(tester, 'Sent').a, 0);
      await touch.up();
      await tester.pumpAndSettle();

      final TanreiSystem none = system.copyWith(
        behavior: system.behavior.copyWith(pressedFeedback: TanreiPressedFeedback.none),
      );
      await tester.pumpWidget(bar(TanreiThemeData(system: none)));
      final Color resting = itemIconOf(tester, 'Sent').color;
      touch = await tester.startGesture(tester.getCenter(destinationOf('Sent')));
      await tester.pump();
      expect(itemFillOf(tester, 'Sent').a, 0);
      expect(itemIconOf(tester, 'Sent').color, resting);
      expect(itemOpacityOf(tester, 'Sent'), 1);
      await touch.up();
      await tester.pumpAndSettle();
    });

    testWidgets('NVB-10: the corner smoothing of the system eases the item container and its '
        'focus ring; the focus style draws a ring or a glow', (WidgetTester tester) async {
      await tester.pumpWidget(
        navigationApp(
          BarOwner(destinations: fourDestinations()),
          theme: const TanreiThemeData(system: cupertinoSystem),
        ),
      );
      expect(
        itemDecorationOf(tester, 'Inbox').shape.smoothing,
        cupertinoSystem.shape.cornerSmoothing,
      );
      expect(
        itemDecorationOf(tester, 'Inbox').shape.radius,
        cupertinoSystem.navigationBar.itemContainerShape,
      );
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      final TanreiFocusRing ring = tester.widget<TanreiFocusRing>(
        find.descendant(of: destinationOf('Inbox'), matching: find.byType(TanreiFocusRing)),
      );
      expect(ring.visible, isTrue);
      expect(
        ring.borderRadius,
        BorderRadius.circular(cupertinoSystem.navigationBar.itemContainerShape),
      );
      // Ring or glow is the focus ring primitive's choice from behavior.focusStyle.
      expect(
        find.descendant(of: destinationOf('Inbox'), matching: find.byType(TanreiFocusRing)),
        paints..something(
          (Symbol method, List<dynamic> arguments) =>
              method == #drawPath && (arguments[1] as Paint).style == PaintingStyle.stroke,
        ),
      );
    });
  });

  group('layout', () {
    testWidgets('NVB-11: full width, container.height high, container color and elevation, the '
        'top edge outline.width in outline.color, equal cells in reading order, mirrored right to '
        'left', (WidgetTester tester) async {
      await tester.pumpWidget(navigationApp(BarOwner(destinations: fourDestinations())));
      final Rect bar = tester.getRect(barContainer());
      expect(bar.width, barWidth);
      expect(bar.height, barTokens.containerHeight);
      final TanreiContainerDecoration decoration =
          tester.widget<DecoratedBox>(barContainer()).decoration as TanreiContainerDecoration;
      expect(decoration.color, lightTheme.paint(barTokens.containerColor));
      expect(decoration.boxShadow, isNull, reason: 'level0');
      expect(edgeOf(tester).side, TanreiEdgeSide.top);
      expect(edgeOf(tester).color, lightTheme.paint(barTokens.outlineColor));
      expect(edgeOf(tester).width, barTokens.outlineWidth);
      final List<double> lefts = <double>[
        for (final String label in <String>['Inbox', 'Sent', 'Starred', 'Settings'])
          tester.getRect(destinationOf(label)).left - bar.left,
      ];
      expect(lefts, <double>[0, 90, 180, 270]);

      // A system that raises the bar.
      final TanreiThemeData raised = TanreiThemeData(
        system: system.copyWith(
          navigationBar: barTokens.copyWith(containerElevation: system.elevation.level2),
        ),
      );
      await tester.pumpWidget(
        navigationApp(
          BarOwner(key: UniqueKey(), destinations: fourDestinations()),
          theme: raised,
        ),
      );
      expect(
        (tester.widget<DecoratedBox>(barContainer()).decoration as TanreiContainerDecoration)
            .boxShadow,
        TanreiResolvedElevation.resolve(system.elevation.level2, light).shadows,
      );

      await tester.pumpWidget(
        navigationApp(
          BarOwner(key: UniqueKey(), destinations: fourDestinations()),
          textDirection: TextDirection.rtl,
        ),
      );
      final Rect mirrored = tester.getRect(barContainer());
      expect(tester.getRect(destinationOf('Inbox')).right, mirrored.right);
      expect(tester.getRect(destinationOf('Settings')).left, mirrored.left);
    });

    testWidgets('NVB-12: an item container item.container.width × height with corners '
        'item.container.shape, the icon centered in it, the label item.gap below in '
        'item.label.typescale on one line truncated, the two centered in the cell', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(navigationApp(BarOwner(destinations: fourDestinations())));
      final Rect cell = tester.getRect(destinationOf('Sent'));
      final Rect box = tester.getRect(itemContainerOf('Sent'));
      expect(box.size, Size(barTokens.itemContainerWidth, barTokens.itemContainerHeight));
      expect(itemDecorationOf(tester, 'Sent').shape.radius, barTokens.itemContainerShape);
      expect(
        tester.getCenter(
          find.descendant(of: destinationOf('Sent'), matching: find.byType(TanreiControlIcon)),
        ),
        box.center,
      );
      final Rect label = tester.getRect(
        find.descendant(of: destinationOf('Sent'), matching: find.text('Sent')),
      );
      expect(label.top - box.bottom, barTokens.itemGap);
      expect(label.center.dx, moreOrLessEquals(cell.center.dx));
      expect(box.center.dx, moreOrLessEquals(cell.center.dx));
      expect((box.top + label.bottom) / 2, moreOrLessEquals(cell.center.dy));
      expect(itemLabelStyleOf(tester, 'Sent')!.fontSize, barTokens.itemLabelTypescale.size);
      final Text text = tester.widget<Text>(
        find.descendant(of: destinationOf('Sent'), matching: find.text('Sent')),
      );
      expect(text.maxLines, 1);
      expect(text.overflow, TextOverflow.ellipsis);

      const String long = 'A destination name far too long';
      await tester.pumpWidget(
        navigationApp(
          BarOwner(
            key: UniqueKey(),
            destinations: <TanreiNavigationDestination>[
              destination(long),
              destination('Sent', icon: 'send'),
              destination('Starred', icon: 'star'),
            ],
          ),
        ),
      );
      final Rect truncated = tester.getRect(
        find.descendant(of: destinationOf(long), matching: find.text(long)),
      );
      expect(truncated.width, lessThanOrEqualTo(barWidth / 3));
      expect(truncated.height, barTokens.itemLabelTypescale.lineHeight);
    });

    testWidgets('NVB-13: labelBehavior always draws every label, onlyShowSelected only the '
        'selected one\'s, alwaysHide none; a destination without a label centers its item '
        'container; every label stays the accessible name', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final TanreiNavigationBarLabelBehavior behavior
          in TanreiNavigationBarLabelBehavior.values) {
        await tester.pumpWidget(
          navigationApp(
            BarOwner(key: UniqueKey(), destinations: fourDestinations(), labelBehavior: behavior),
          ),
        );
        final Map<String, bool> drawn = <String, bool>{
          for (final String label in <String>['Inbox', 'Sent'])
            label: itemLabelStyleOf(tester, label) != null,
        };
        expect(drawn, switch (behavior) {
          TanreiNavigationBarLabelBehavior.alwaysShow => <String, bool>{
            'Inbox': true,
            'Sent': true,
          },
          TanreiNavigationBarLabelBehavior.onlyShowSelected => <String, bool>{
            'Inbox': true,
            'Sent': false,
          },
          TanreiNavigationBarLabelBehavior.alwaysHide => <String, bool>{
            'Inbox': false,
            'Sent': false,
          },
        }, reason: behavior.name);
        final Rect cell = tester.getRect(destinationOf('Sent'));
        if (!drawn['Sent']!) {
          expect(
            tester.getRect(itemContainerOf('Sent')).center,
            cell.center,
            reason: behavior.name,
          );
        }
        expect(
          nodesWithRole(tester, SemanticsRole.tab).map((SemanticsData d) => d.label),
          <String>['Inbox', 'Sent', 'Starred', 'Settings'],
          reason: behavior.name,
        );
      }
      handle.dispose();
    });

    testWidgets('NVB-14: each icon at item.icon.size in the family and fill of its condition '
        '(selected only for the selected destination)', (WidgetTester tester) async {
      await tester.pumpWidget(navigationApp(BarOwner(destinations: fourDestinations())));
      expect(itemIconOf(tester, 'Inbox').size, barTokens.itemIconSize);
      expect(itemIconOf(tester, 'Inbox').selected, isTrue);
      expect(itemIconOf(tester, 'Sent').selected, isFalse);
      final TextStyle glyph = DefaultTextStyle.of(
        tester.element(
          find.descendant(of: destinationOf('Inbox'), matching: find.byType(Text)).first,
        ),
      ).style;
      final TanreiResolvedIconStyle filled = system.icon.resolve(
        size: barTokens.itemIconSize,
        selected: true,
      );
      expect(glyph.fontFamily, filled.toTextStyle().fontFamily);
      expect(glyph.fontVariations, filled.toTextStyle().fontVariations);
    });

    testWidgets('NVB-18: the container reaches under the bottom inset; the destinations sit above '
        'it and inside the side insets', (WidgetTester tester) async {
      const EdgeInsets insets = EdgeInsets.fromLTRB(10, 0, 20, 34);
      await tester.pumpWidget(
        navigationApp(BarOwner(destinations: fourDestinations()), padding: insets),
      );
      final Rect bar = tester.getRect(barContainer());
      expect(bar.height, barTokens.containerHeight + insets.bottom);
      final Rect first = tester.getRect(destinationOf('Inbox'));
      final Rect last = tester.getRect(destinationOf('Settings'));
      expect(first.left, bar.left + insets.left);
      expect(last.right, bar.right - insets.right);
      expect(first.bottom, bar.bottom - insets.bottom);
      expect(first.height, barTokens.containerHeight);
      expect(first.width, moreOrLessEquals((barWidth - insets.horizontal) / 4));
    });

    testWidgets('NVB-21: enlarged text grows the bar to hold the labels on one line and does not '
        'scale the item containers or icons', (WidgetTester tester) async {
      await tester.pumpWidget(
        navigationApp(
          BarOwner(destinations: fourDestinations()),
          textScaler: const TextScaler.linear(3),
        ),
      );
      final double label = 3 * barTokens.itemLabelTypescale.lineHeight;
      final double content = barTokens.itemContainerHeight + barTokens.itemGap + label;
      expect(content, greaterThan(barTokens.containerHeight));
      expect(tester.getRect(barContainer()).height, moreOrLessEquals(content));
      expect(
        tester
            .getSize(find.descendant(of: destinationOf('Sent'), matching: find.text('Sent')))
            .height,
        moreOrLessEquals(label),
      );
      expect(
        tester.getSize(itemContainerOf('Sent')),
        Size(barTokens.itemContainerWidth, barTokens.itemContainerHeight),
      );
      expect(
        tester.getSize(
          find.descendant(of: destinationOf('Sent'), matching: find.byType(TanreiControlIcon)),
        ),
        Size.square(barTokens.itemIconSize),
      );
    });
  });

  group('motion', () {
    testWidgets('NVB-15: a new selection grows its active indicator from the center while the '
        'old one fades, and eases the colors, over motion.selection-*; labels shown only when '
        'selected appear and leave over the same time; at once where motion is reduced', (
      WidgetTester tester,
    ) async {
      final GlobalKey<BarOwnerState> owner = GlobalKey<BarOwnerState>();
      await tester.pumpWidget(
        navigationApp(
          BarOwner(
            key: owner,
            destinations: fourDestinations(),
            labelBehavior: TanreiNavigationBarLabelBehavior.onlyShowSelected,
          ),
        ),
      );
      final Color indicator = lightTheme.paint(
        partsOf(true, TanreiInteractionState.enabled).itemContainerColor,
      );
      owner.currentState!.set(1);
      await tester.pump();
      await tester.pump(tanreiDuration(barTokens.motionSelectionDuration) ~/ 2);
      final Curve curve = barTokens.motionSelectionEasing.toCurve();
      final double t = curve.transform(0.5);
      expect(growOf(tester, 'Sent'), moreOrLessEquals(t));
      expect(growOf(tester, 'Inbox'), 1, reason: 'the old indicator fades at its full size');
      expect(itemFillOf(tester, 'Sent'), looksLike(indicator.withValues(alpha: indicator.a * t)));
      expect(
        itemFillOf(tester, 'Inbox'),
        looksLike(indicator.withValues(alpha: indicator.a * (1 - t))),
      );
      // The label of the new selection is appearing; the old one's leaving.
      final Align appearing = tester.widget<Align>(
        find.ancestor(of: find.text('Sent'), matching: find.byType(Align)).first,
      );
      expect(appearing.heightFactor, moreOrLessEquals(t));
      expect(find.text('Inbox'), findsOneWidget);
      await tester.pumpAndSettle();
      expect(growOf(tester, 'Sent'), 1);
      expect(itemFillOf(tester, 'Sent'), indicator);
      expect(itemFillOf(tester, 'Inbox').a, 0);
      expect(find.text('Inbox'), findsNothing);

      final GlobalKey<BarOwnerState> reduced = GlobalKey<BarOwnerState>();
      await tester.pumpWidget(
        navigationApp(
          BarOwner(key: reduced, destinations: fourDestinations()),
          disableAnimations: true,
        ),
      );
      reduced.currentState!.set(2);
      await tester.pump();
      expect(growOf(tester, 'Starred'), 1);
      expect(itemFillOf(tester, 'Starred'), indicator);
      expect(itemFillOf(tester, 'Inbox').a, 0);
      expect(tester.hasRunningAnimations, isFalse);
    });
  });

  group('badges and semantics', () {
    testWidgets('NVB-16: a badge is a Tanrei badge on the icon with the count and label, kept '
        'while disabled, and its description joins the destination\'s after its name and state', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(
        navigationApp(
          BarOwner(
            destinations: <TanreiNavigationDestination>[
              destination(
                'Inbox',
                badge: const TanreiNavigationBadge(count: 3, semanticLabel: '3 unread'),
              ),
              destination(
                'Chat',
                icon: 'chat',
                badge: const TanreiNavigationBadge(semanticLabel: 'New'),
              ),
              destination(
                'Starred',
                icon: 'star',
                enabled: false,
                badge: const TanreiNavigationBadge(count: 1200),
              ),
              destination('Settings', icon: 'settings'),
            ],
          ),
        ),
      );
      final TanreiBadge inbox = tester.widget<TanreiBadge>(
        find.descendant(of: destinationOf('Inbox'), matching: find.byType(TanreiBadge)),
      );
      expect(inbox.count, 3);
      expect(inbox.semanticLabel, '3 unread');
      expect(
        find.descendant(of: find.byType(TanreiBadge), matching: find.byType(TanreiControlIcon)),
        findsNWidgets(3),
        reason: 'anchored to the icon',
      );
      expect(
        tester
            .widget<TanreiBadge>(
              find.descendant(of: destinationOf('Chat'), matching: find.byType(TanreiBadge)),
            )
            .count,
        isNull,
      );
      expect(
        find.descendant(of: destinationOf('Starred'), matching: find.byType(TanreiBadge)),
        findsOneWidget,
        reason: 'kept while disabled',
      );
      final Map<String, String> values = <String, String>{
        for (final SemanticsData d in nodesWithRole(tester, SemanticsRole.tab)) d.label: d.value,
      };
      expect(values, <String, String>{
        'Inbox': '3 unread',
        'Chat': 'New',
        'Starred': '999+',
        'Settings': '',
      });
      handle.dispose();
    });

    testWidgets('NVB-17: fewer than three or more than five destinations are still drawn and '
        'reported', (WidgetTester tester) async {
      final List<String> reports = collectIgnoredValues();
      await tester.pumpWidget(
        navigationApp(
          BarOwner(destinations: <TanreiNavigationDestination>[destination('A'), destination('B')]),
        ),
      );
      expect(find.byType(TanreiNavigationItem), findsNWidgets(2));
      expect(reports.single, contains('three to five'));
      await tester.pumpWidget(
        navigationApp(
          BarOwner(
            key: UniqueKey(),
            destinations: <TanreiNavigationDestination>[
              for (int i = 0; i < 6; i++) destination('D$i'),
            ],
          ),
        ),
      );
      expect(find.byType(TanreiNavigationItem), findsNWidgets(6));
      expect(reports, hasLength(2));
    });

    testWidgets('NVB-19: a tab bar named by the bar\'s label; each destination one tab named by '
        'its label, with its selected state; the icon hidden', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(
        navigationApp(BarOwner(initial: 1, destinations: fourDestinations())),
      );
      final List<SemanticsData> bars = nodesWithRole(tester, SemanticsRole.tabBar);
      expect(bars.single.label, 'Main');
      final List<SemanticsData> tabs = nodesWithRole(tester, SemanticsRole.tab);
      expect(tabs.map((SemanticsData d) => d.label), <String>[
        'Inbox',
        'Sent',
        'Starred',
        'Settings',
      ]);
      expect(tabs.map((SemanticsData d) => d.hasFlag(SemanticsFlag.isSelected)), <bool>[
        false,
        true,
        false,
        false,
      ]);
      for (final SemanticsData tab in tabs) {
        expect(tab.hasAction(SemanticsAction.tap), isTrue);
      }
      // Nothing below a tab: the glyph is not read.
      final SemanticsNode sent = nodesBelow(
        semanticsRoot(tester),
      ).singleWhere((SemanticsNode n) => n.getSemanticsData().label == 'Sent');
      expect(sent.childrenCount, 0);
      handle.dispose();
    });

    testWidgets('NVB-20: a destination without a label still renders and is reported once', (
      WidgetTester tester,
    ) async {
      final List<String> reports = collectMissingNames();
      await tester.pumpWidget(
        navigationApp(
          BarOwner(
            destinations: <TanreiNavigationDestination>[
              destination('Inbox'),
              destination(''),
              destination('Starred', icon: 'star'),
            ],
          ),
        ),
      );
      expect(find.byType(TanreiNavigationItem), findsNWidgets(3));
      expect(reports, <String>['navigation destination']);
      await tester.pump();
      expect(reports, hasLength(1));
    });

    testWidgets('guidelines: navigation bar', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final TanreiThemeData theme in <TanreiThemeData>[
        TanreiThemeData.light,
        TanreiThemeData.dark,
      ]) {
        await tester.pumpWidget(
          navigationApp(
            BarOwner(key: UniqueKey(), destinations: fourDestinations()),
            theme: theme,
          ),
        );
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
      expect(barTokens.containerHeight, 64);
      expect(barTokens.itemContainerWidth, 56);
      expect(barTokens.itemContainerHeight, 32);
      expect(barTokens.itemIconSize, 24);
      expect(lightTheme.paint(barTokens.outlineColor), light.outlineVariant);
      expect(
        lightTheme.paint(partsOf(true, TanreiInteractionState.enabled).itemContainerColor),
        light.secondaryContainer,
      );
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": the bar draws that system\'s height, colors and item '
          'container', (WidgetTester tester) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        final TanreiNavigationBarTokens tokens = shipped.navigationBar;
        await tester.pumpWidget(
          navigationApp(BarOwner(destinations: fourDestinations()), theme: theme),
        );
        await tester.pumpAndSettle();
        final double content =
            tokens.itemContainerHeight + tokens.itemGap + tokens.itemLabelTypescale.lineHeight;
        expect(
          tester.getRect(barContainer()).height,
          moreOrLessEquals(
            <double>[tokens.containerHeight, shipped.measure.targetTouch, content].reduce(math.max),
          ),
        );
        final Color container = theme.paint(tokens.containerColor);
        expect(
          (tester.widget<DecoratedBox>(barContainer()).decoration as TanreiContainerDecoration)
              .color,
          container.a > 0 ? container : null,
        );
        final TanreiNavigationBarConditionStateTokens selected = tokens.conditions.selected.enabled;
        final Color indicator = theme.paint(selected.itemContainerColor);
        expect(itemFillOf(tester, 'Inbox'), indicator);
        expect(itemIconOf(tester, 'Inbox').color, theme.paint(selected.itemIconColor));
        expect(
          tester.getSize(itemContainerOf('Inbox')),
          Size(tokens.itemContainerWidth, tokens.itemContainerHeight),
        );
        expect(itemDecorationOf(tester, 'Inbox').shape.smoothing, shipped.shape.cornerSmoothing);
      });
    }
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('navigation-bar');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'four-destinations',
        'three-destinations',
        'five-destinations',
        'labels-selected',
        'labels-never',
        'badges',
        'disabled',
        'none-selected',
      ]);
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          surface: navigationBarGoldenSurface,
          child: fixtureNavigationBar(fixture),
          file: 'goldens/navigation_bar/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: the badges show the preset's
    // indicator (or none), label style and bar color next to its badges.
    const String recorded = 'badges';
    for (final TanreiSystem preset in <TanreiSystem>[
      m3LikeSystem,
      m3ExpressiveLikeSystem,
      cupertinoSystem,
    ]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: navigationBarGoldenSurface,
          child: fixtureNavigationBar(
            fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded),
          ),
          file: 'goldens/navigation_bar/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
