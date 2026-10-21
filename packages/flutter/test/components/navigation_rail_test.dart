import 'dart:math' as math;

import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

import '../../test_fixtures/acme_system.g.dart';
import '../systems.dart';
import 'fixture_golden.dart';
import 'navigation_harness.dart';

const TanreiSystem system = tanreiSystem;
final TanreiNavigationRailTokens railTokens = system.navigationRail;
final TanreiColors light = system.schemes.light;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The height of the rails in these tests.
const double railHeight = 600;

/// The frame of the navigation rail baselines: a rail 80 wide and 388 high in the `space200`
/// padding of every baseline.
const Size navigationRailGoldenSurface = Size(112, 420);

TanreiNavigationRailConditionStateTokens partsOf(bool selected, TanreiInteractionState state) =>
    railTokens
        .conditions[selected
            ? TanreiNavigationRailCondition.selected
            : TanreiNavigationRailCondition.unselected]
        .of(state);

/// The glyph of the fixtures' header button.
const String menuGlyph = '\ue5d2';

/// The rail a fixture describes: the header-button items in `leading`, the destinations in order,
/// the one whose value is the fixture's value selected by its index.
Widget fixtureNavigationRail(Map<String, dynamic> fixture) {
  final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
  final List<Map<String, dynamic>> items = (fixture['items'] as List<dynamic>)
      .cast<Map<String, dynamic>>();
  final List<Map<String, dynamic>> destinations = <Map<String, dynamic>>[
    for (final Map<String, dynamic> item in items)
      if (item['kind'] == 'destination') item['props'] as Map<String, dynamic>,
  ];
  final List<Widget> header = <Widget>[
    for (final Map<String, dynamic> item in items)
      if (item['kind'] == 'header-button')
        TanreiIconButton(
          onPressed: () {},
          icon: Text(navigationGlyph(item['content'] as String?)),
          semanticLabel: (item['props'] as Map<String, dynamic>)['label'] as String,
        ),
  ];
  final int index = destinations.indexWhere(
    (Map<String, dynamic> item) => item['value'] == props['value'],
  );
  return TanreiNavigationRail(
    selectedIndex: index < 0 ? null : index,
    onDestinationSelected: (_) {},
    labelType: switch (props['labelVisibility'] as String? ?? 'always') {
      'selected' => TanreiNavigationRailLabelType.selected,
      'never' => TanreiNavigationRailLabelType.none,
      _ => TanreiNavigationRailLabelType.all,
    },
    semanticLabel: props['label'] as String? ?? '',
    leading: header.isEmpty ? null : Column(mainAxisSize: MainAxisSize.min, children: header),
    destinations: <TanreiNavigationRailDestination>[
      for (final Map<String, dynamic> item in destinations)
        TanreiNavigationRailDestination(
          icon: navigationGlyph(item['icon'] as String?),
          label: item['label'] as String? ?? '',
          disabled: item['disabled'] == true,
          badge: item['badge'] == true
              ? TanreiNavigationBadge(
                  count: item['badgeCount'] as num?,
                  semanticLabel: item['badgeLabel'] as String? ?? '',
                )
              : null,
        ),
    ],
  );
}

TanreiNavigationRailDestination destination(
  String label, {
  String icon = 'inbox',
  bool disabled = false,
  TanreiNavigationBadge? badge,
}) => TanreiNavigationRailDestination(
  icon: navigationGlyph(icon),
  label: label,
  disabled: disabled,
  badge: badge,
);

List<TanreiNavigationRailDestination> fourDestinations({bool starredDisabled = false}) =>
    <TanreiNavigationRailDestination>[
      destination('Inbox'),
      destination('Sent', icon: 'send'),
      destination('Starred', icon: 'star', disabled: starredDisabled),
      destination('Settings', icon: 'settings'),
    ];

/// A rail whose owner stores the selection, recording every call of onDestinationSelected; its
/// header is a Menu icon button unless [header] is false.
class RailOwner extends StatefulWidget {
  const RailOwner({
    super.key,
    this.initial = 0,
    required this.destinations,
    this.calls,
    this.store = true,
    this.header = true,
    this.menuFocus,
    this.labelType = TanreiNavigationRailLabelType.all,
  });

  final int? initial;
  final List<TanreiNavigationRailDestination> destinations;
  final List<int>? calls;
  final bool store;
  final bool header;
  final FocusNode? menuFocus;
  final TanreiNavigationRailLabelType labelType;

  @override
  State<RailOwner> createState() => RailOwnerState();
}

class RailOwnerState extends State<RailOwner> {
  late int? selected = widget.initial;

  void set(int? index) => setState(() => selected = index);

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: <Widget>[
      TanreiNavigationRail(
        selectedIndex: selected,
        labelType: widget.labelType,
        semanticLabel: 'Main',
        leading: widget.header
            ? TanreiIconButton(
                onPressed: () {},
                icon: const Text(menuGlyph),
                semanticLabel: 'Menu',
                focusNode: widget.menuFocus,
              )
            : null,
        onDestinationSelected: (int index) {
          widget.calls?.add(index);
          if (widget.store) {
            set(index);
          }
        },
        destinations: widget.destinations,
      ),
      const Expanded(child: SizedBox.expand()),
    ],
  );
}

Widget railApp(
  Widget child, {
  TanreiThemeData theme = lightTheme,
  bool disableAnimations = false,
  TextDirection textDirection = TextDirection.ltr,
  EdgeInsets padding = EdgeInsets.zero,
  TextScaler textScaler = TextScaler.noScaling,
  double height = railHeight,
}) => navigationApp(
  child,
  theme: theme,
  disableAnimations: disableAnimations,
  textDirection: textDirection,
  padding: padding,
  textScaler: textScaler,
  width: 400,
  height: height,
);

/// The rail's own container.
Finder railContainer() => find
    .descendant(
      of: find.byType(TanreiNavigationRail),
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
                    of: find.byType(TanreiNavigationRail),
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

String focusedLabel() {
  final BuildContext? context = FocusManager.instance.primaryFocus?.context;
  return context?.findAncestorWidgetOfExactType<TanreiNavigationItem>()?.label ??
      context?.findAncestorWidgetOfExactType<TanreiIconButton>()?.semanticLabel ??
      '';
}

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  final Duration hold = tanreiDuration(system.motion.duration.pressHold);
  const Duration tick = Duration(milliseconds: 1);

  group('selection and events', () {
    testWidgets('NVR-1: pointer, touch, Enter or Space on a destination calls '
        'onDestinationSelected once with its index — change for another destination, reselect '
        'for the selected one', (WidgetTester tester) async {
      final List<int> calls = <int>[];
      await tester.pumpWidget(
        railApp(RailOwner(destinations: fourDestinations(), calls: calls, store: false)),
      );
      await tester.tap(destinationOf('Sent'));
      await tester.pumpAndSettle();
      expect(calls, <int>[1]);
      await tester.tap(destinationOf('Inbox'));
      await tester.pumpAndSettle();
      expect(calls, <int>[1, 0]);
      // Menu, Inbox, Sent.
      for (int i = 0; i < 3; i++) {
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      }
      await tester.pump();
      expect(focusedLabel(), 'Sent');
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pumpAndSettle();
      expect(calls, <int>[1, 0, 1, 1]);
    });

    testWidgets('NVR-2: a disabled destination calls nothing, is not focusable and is exposed as '
        'disabled', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<int> calls = <int>[];
      await tester.pumpWidget(
        railApp(
          RailOwner(
            destinations: fourDestinations(starredDisabled: true),
            calls: calls,
            header: false,
          ),
        ),
      );
      await tester.tap(destinationOf('Starred'));
      await tester.pumpAndSettle();
      expect(calls, isEmpty);
      final List<String> focused = <String>[];
      for (int i = 0; i < 3; i++) {
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pump();
        focused.add(focusedLabel());
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

    testWidgets('NVR-3: the selected destination draws the selected parts, the others the '
        'unselected ones; an index that names no destination selects none and is reported', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(railApp(RailOwner(destinations: fourDestinations())));
      final TanreiNavigationRailConditionStateTokens selected = partsOf(
        true,
        TanreiInteractionState.enabled,
      );
      final TanreiNavigationRailConditionStateTokens unselected = partsOf(
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
        railApp(RailOwner(key: UniqueKey(), initial: 9, destinations: fourDestinations())),
      );
      expect(reports.single, contains('names no destination'));
      for (final String label in <String>['Inbox', 'Sent', 'Starred', 'Settings']) {
        expect(itemFillOf(tester, label).a, 0, reason: label);
      }
    });

    testWidgets('NVR-23: a destination\'s value is its index, so no two repeat: the index selects '
        'exactly one destination even when two look alike', (WidgetTester tester) async {
      await tester.pumpWidget(
        railApp(
          RailOwner(
            initial: 1,
            destinations: <TanreiNavigationRailDestination>[
              destination('Inbox'),
              destination('Inbox'),
              destination('Sent', icon: 'send'),
            ],
          ),
        ),
      );
      expect(
        tester
            .widgetList<TanreiNavigationItem>(find.byType(TanreiNavigationItem))
            .map((TanreiNavigationItem i) => i.selected),
        <bool>[false, true, false],
      );
    });
  });

  group('states', () {
    testWidgets('NVR-4: under the acme system hovered, focused and pressed draw their own tokens, '
        'pressed over focused over hovered; focus from a pointer draws no focused state', (
      WidgetTester tester,
    ) async {
      const TanreiThemeData acme = TanreiThemeData(system: acmeSystem);
      final TanreiNavigationRailConditionTokens unselected =
          acmeSystem.navigationRail.conditions.unselected;
      Color fill(TanreiInteractionState state) =>
          acme.paint(unselected.of(state).itemContainerColor);
      expect(<Color>{
        fill(TanreiInteractionState.hovered),
        fill(TanreiInteractionState.focused),
        fill(TanreiInteractionState.pressed),
      }, hasLength(3));
      await tester.pumpWidget(
        railApp(
          RailOwner(destinations: fourDestinations(), store: false, header: false),
          theme: acme,
        ),
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
      await mouse.up();
      await tester.pumpAndSettle();
      await mouse.moveTo(tester.getCenter(destinationOf('Settings')));
      await tester.pumpAndSettle();
      expect(itemFillOf(tester, 'Settings'), fill(TanreiInteractionState.hovered));

      await tester.pumpWidget(
        railApp(
          RailOwner(key: UniqueKey(), destinations: fourDestinations(), store: false),
          theme: acme,
        ),
      );
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      await tester.tap(destinationOf('Starred'));
      await tester.pumpAndSettle();
      expect(itemFillOf(tester, 'Starred'), fill(TanreiInteractionState.enabled));
    });

    testWidgets('NVR-5: keyboard focus shows the focus ring around the item container at once; '
        'focus from a pointer shows none', (WidgetTester tester) async {
      await tester.pumpWidget(railApp(RailOwner(destinations: fourDestinations(), header: false)));
      expect(itemRingVisible(tester, 'Inbox'), isFalse);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(itemRingVisible(tester, 'Inbox'), isTrue);
      expect(
        tester.getSize(
          find.descendant(of: destinationOf('Inbox'), matching: find.byType(TanreiFocusRing)),
        ),
        Size(railTokens.itemContainerWidth, railTokens.itemContainerHeight),
      );
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      await tester.tap(destinationOf('Sent'));
      await tester.pump();
      expect(itemRingVisible(tester, 'Sent'), isFalse);
    });

    testWidgets('NVR-6: the whole cell is the hit area — the rail\'s width, the destination with '
        'half of container.gap above and below, at least the touch target high without a label — '
        'and hover over any part of it answers on the item container', (WidgetTester tester) async {
      final List<int> calls = <int>[];
      await tester.pumpWidget(
        railApp(RailOwner(destinations: fourDestinations(), calls: calls, store: false)),
      );
      final Rect rail = tester.getRect(railContainer());
      final Rect cell = tester.getRect(destinationOf('Sent'));
      final Rect box = tester.getRect(itemContainerOf('Sent'));
      final Rect label = tester.getRect(
        find.descendant(of: destinationOf('Sent'), matching: find.text('Sent')),
      );
      expect(cell.width, railTokens.containerWidth);
      expect(cell.left, rail.left);
      expect(box.top - cell.top, railTokens.containerGap / 2);
      expect(cell.bottom - label.bottom, railTokens.containerGap / 2);
      await tester.tapAt(cell.topLeft + const Offset(2, 1));
      await tester.pumpAndSettle();
      expect(calls, <int>[1]);
      final TestGesture mouse = await hoverOver(tester, destinationOf('Settings'));
      await mouse.moveTo(
        tester.getRect(destinationOf('Settings')).bottomRight - const Offset(2, 1),
      );
      await tester.pumpAndSettle();
      expect(
        itemFillOf(tester, 'Settings'),
        lightTheme.paint(partsOf(false, TanreiInteractionState.hovered).itemContainerColor),
      );

      await tester.pumpWidget(
        railApp(
          RailOwner(
            key: UniqueKey(),
            destinations: fourDestinations(),
            labelType: TanreiNavigationRailLabelType.none,
          ),
        ),
      );
      expect(
        tester.getSize(destinationOf('Sent')).height,
        math.max(
          system.measure.targetTouch,
          railTokens.itemContainerHeight + railTokens.containerGap,
        ),
      );
    });

    testWidgets('NVR-7: a disabled destination draws the disabled tokens of its condition and '
        'the disabled opacity', (WidgetTester tester) async {
      await tester.pumpWidget(
        railApp(RailOwner(destinations: fourDestinations(starredDisabled: true))),
      );
      final TanreiNavigationRailConditionStateTokens disabled = partsOf(
        false,
        TanreiInteractionState.disabled,
      );
      expect(itemIconOf(tester, 'Starred').color, lightTheme.paint(disabled.itemIconColor));
      expect(itemLabelStyleOf(tester, 'Starred')!.color, lightTheme.paint(disabled.itemLabelColor));
      expect(itemOpacityOf(tester, 'Starred'), railTokens.disabled.opacity);
      await tester.pumpWidget(
        railApp(
          RailOwner(
            key: UniqueKey(),
            initial: 2,
            destinations: fourDestinations(starredDisabled: true),
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

  group('press', () {
    testWidgets('NVR-8: a press shows the pressed state without delay and keeps it for the '
        'press-hold duration', (WidgetTester tester) async {
      const TanreiThemeData acme = TanreiThemeData(system: acmeSystem);
      final Color pressed = acme.paint(
        acmeSystem.navigationRail.conditions.unselected.pressed.itemContainerColor,
      );
      await tester.pumpWidget(
        railApp(RailOwner(destinations: fourDestinations(), store: false), theme: acme),
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

    testWidgets('NVR-9: overlay (default) fills the pressed item container; ripple (m3-like) '
        'grows from the point of contact, from the center for a press outside the item container; '
        'dim (cupertino) dims the destination and draws no state layer', (
      WidgetTester tester,
    ) async {
      Widget rail(TanreiThemeData theme) => railApp(
        RailOwner(key: UniqueKey(), destinations: fourDestinations(), store: false),
        theme: theme,
      );
      await tester.pumpWidget(rail(lightTheme));
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
      await tester.pumpWidget(rail(m3));
      final Rect box = tester.getRect(itemContainerOf('Sent'));
      const Offset contact = Offset(12, 6);
      touch = await tester.startGesture(box.topLeft + contact);
      await tester.pump();
      expect(itemDecorationOf(tester, 'Sent').ripple!.origin, contact);
      await touch.up();
      await tester.pumpAndSettle();
      touch = await tester.startGesture(
        tester.getRect(destinationOf('Sent')).topLeft + const Offset(2, 2),
      );
      await tester.pump();
      expect(itemDecorationOf(tester, 'Sent').ripple!.origin, isNull);
      await touch.up();
      await tester.pumpAndSettle();

      await tester.pumpWidget(rail(const TanreiThemeData(system: cupertinoSystem)));
      touch = await tester.startGesture(tester.getCenter(destinationOf('Sent')));
      await tester.pump();
      expect(itemOpacityOf(tester, 'Sent'), cupertinoSystem.navigationRail.pressed.opacity);
      expect(itemFillOf(tester, 'Sent').a, 0);
      await touch.up();
      await tester.pumpAndSettle();
    });

    testWidgets('NVR-10: the corner smoothing of the system eases the item container and its '
        'focus ring', (WidgetTester tester) async {
      await tester.pumpWidget(
        railApp(
          RailOwner(destinations: fourDestinations(), header: false),
          theme: const TanreiThemeData(system: cupertinoSystem),
        ),
      );
      expect(
        itemDecorationOf(tester, 'Inbox').shape.smoothing,
        cupertinoSystem.shape.cornerSmoothing,
      );
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      final TanreiFocusRing ring = tester.widget<TanreiFocusRing>(
        find.descendant(of: destinationOf('Inbox'), matching: find.byType(TanreiFocusRing)),
      );
      expect(ring.visible, isTrue);
      expect(
        ring.borderRadius,
        BorderRadius.circular(cupertinoSystem.navigationRail.itemContainerShape),
      );
    });
  });

  group('layout', () {
    testWidgets('NVR-11: the parent\'s full height at the start edge, container.width wide, '
        'container color and elevation, the end edge outline.width in outline.color; at the right '
        'edge with the outline on its left in right-to-left', (WidgetTester tester) async {
      await tester.pumpWidget(railApp(RailOwner(destinations: fourDestinations())));
      final Rect rail = tester.getRect(railContainer());
      expect(rail.size, const Size(80, railHeight));
      expect(rail.width, railTokens.containerWidth);
      final TanreiContainerDecoration decoration =
          tester.widget<DecoratedBox>(railContainer()).decoration as TanreiContainerDecoration;
      expect(decoration.color, lightTheme.paint(railTokens.containerColor));
      expect(edgeOf(tester).side, TanreiEdgeSide.end);
      expect(edgeOf(tester).color, lightTheme.paint(railTokens.outlineColor));
      expect(edgeOf(tester).width, railTokens.outlineWidth);
      expect(edgeOf(tester).rectIn(rail.size).left, rail.width - railTokens.outlineWidth);

      await tester.pumpWidget(
        railApp(
          RailOwner(key: UniqueKey(), destinations: fourDestinations()),
          textDirection: TextDirection.rtl,
        ),
      );
      final Rect mirrored = tester.getRect(railContainer());
      final Rect app = tester.getRect(find.byType(RailOwner));
      expect(mirrored.right, app.right);
      expect(edgeOf(tester).rectIn(mirrored.size).left, 0);
    });

    testWidgets('NVR-12: the header centered padding-block below the top, the destinations '
        'header.gap below it (padding-block without a header), container.gap apart, centered', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(railApp(RailOwner(destinations: fourDestinations())));
      final Rect rail = tester.getRect(railContainer());
      final Rect menu = tester.getRect(
        find.byWidgetPredicate((Widget w) => w is TanreiIconButton && w.semanticLabel == 'Menu'),
      );
      expect(menu.top - rail.top, railTokens.containerPaddingBlock);
      expect(menu.center.dx, moreOrLessEquals(rail.center.dx));
      final Rect inbox = tester.getRect(itemContainerOf('Inbox'));
      final Rect sent = tester.getRect(itemContainerOf('Sent'));
      final Rect inboxLabel = tester.getRect(
        find.descendant(of: destinationOf('Inbox'), matching: find.text('Inbox')),
      );
      expect(inbox.top - menu.bottom, railTokens.headerGap);
      expect(sent.top - inboxLabel.bottom, railTokens.containerGap);
      expect(inbox.center.dx, moreOrLessEquals(rail.center.dx));

      await tester.pumpWidget(
        railApp(RailOwner(key: UniqueKey(), destinations: fourDestinations(), header: false)),
      );
      expect(
        tester.getRect(itemContainerOf('Inbox')).top - tester.getRect(railContainer()).top,
        railTokens.containerPaddingBlock,
      );
    });

    testWidgets('NVR-13: an item container item.container.width × height with corners '
        'item.container.shape, the icon centered, the label item.gap below in '
        'item.label.typescale on at most two lines, then truncated', (WidgetTester tester) async {
      const String long = 'Shared with me and with everyone else';
      await tester.pumpWidget(
        railApp(
          RailOwner(
            destinations: <TanreiNavigationRailDestination>[
              destination('Inbox'),
              destination(long, icon: 'group'),
              destination('Trash', icon: 'delete'),
            ],
          ),
        ),
      );
      final Rect box = tester.getRect(itemContainerOf('Inbox'));
      expect(box.size, Size(railTokens.itemContainerWidth, railTokens.itemContainerHeight));
      expect(itemDecorationOf(tester, 'Inbox').shape.radius, railTokens.itemContainerShape);
      expect(
        tester.getCenter(
          find.descendant(of: destinationOf('Inbox'), matching: find.byType(TanreiControlIcon)),
        ),
        box.center,
      );
      final Rect label = tester.getRect(
        find.descendant(of: destinationOf('Inbox'), matching: find.text('Inbox')),
      );
      expect(label.top - box.bottom, railTokens.itemGap);
      expect(itemLabelStyleOf(tester, 'Inbox')!.fontSize, railTokens.itemLabelTypescale.size);
      final Finder longText = find.descendant(of: destinationOf(long), matching: find.text(long));
      expect(tester.getSize(longText).height, 2 * railTokens.itemLabelTypescale.lineHeight);
      expect(tester.getSize(longText).width, lessThanOrEqualTo(railTokens.containerWidth));
      final Text text = tester.widget<Text>(longText);
      expect(text.maxLines, 2);
      expect(text.overflow, TextOverflow.ellipsis);
    });

    testWidgets('NVR-14: labelType all draws every label, selected only the selected one\'s, '
        'none none; every label stays the accessible name', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final TanreiNavigationRailLabelType type in TanreiNavigationRailLabelType.values) {
        await tester.pumpWidget(
          railApp(RailOwner(key: UniqueKey(), destinations: fourDestinations(), labelType: type)),
        );
        expect(
          <bool>[
            itemLabelStyleOf(tester, 'Inbox') != null,
            itemLabelStyleOf(tester, 'Sent') != null,
          ],
          switch (type) {
            TanreiNavigationRailLabelType.all => <bool>[true, true],
            TanreiNavigationRailLabelType.selected => <bool>[true, false],
            TanreiNavigationRailLabelType.none => <bool>[false, false],
          },
          reason: type.name,
        );
        expect(nodesWithRole(tester, SemanticsRole.tab).map((SemanticsData d) => d.label), <String>[
          'Inbox',
          'Sent',
          'Starred',
          'Settings',
        ], reason: type.name);
      }
      handle.dispose();
    });

    testWidgets('NVR-15: each icon at item.icon.size in the family and fill of its condition', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(railApp(RailOwner(destinations: fourDestinations())));
      expect(itemIconOf(tester, 'Inbox').size, railTokens.itemIconSize);
      expect(itemIconOf(tester, 'Inbox').selected, isTrue);
      expect(itemIconOf(tester, 'Sent').selected, isFalse);
    });

    testWidgets('NVR-18: the destinations scroll while the header stays in place; fewer than '
        'three or more than seven are drawn and reported', (WidgetTester tester) async {
      final List<String> reports = collectIgnoredValues();
      await tester.pumpWidget(
        railApp(
          RailOwner(
            destinations: <TanreiNavigationRailDestination>[
              for (int i = 0; i < 8; i++) destination('D$i'),
            ],
          ),
          height: 300,
        ),
      );
      expect(find.byType(TanreiNavigationItem), findsNWidgets(8));
      expect(reports.single, contains('three to seven'));
      final Finder menu = find.byWidgetPredicate(
        (Widget w) => w is TanreiIconButton && w.semanticLabel == 'Menu',
      );
      final Rect before = tester.getRect(menu);
      final double first = tester.getRect(destinationOf('D0')).top;
      await tester.drag(find.byType(SingleChildScrollView), const Offset(0, -100));
      await tester.pumpAndSettle();
      expect(tester.getRect(menu), before, reason: 'the header stays');
      expect(tester.getRect(destinationOf('D0')).top, lessThan(first));

      await tester.pumpWidget(
        railApp(
          RailOwner(
            key: UniqueKey(),
            destinations: <TanreiNavigationRailDestination>[destination('A'), destination('B')],
          ),
        ),
      );
      expect(reports, hasLength(2));
    });

    testWidgets('NVR-19: the container reaches under the insets at its start, top and bottom; the '
        'header and destinations sit inside them', (WidgetTester tester) async {
      const EdgeInsets insets = EdgeInsets.fromLTRB(30, 24, 12, 20);
      await tester.pumpWidget(
        railApp(RailOwner(destinations: fourDestinations()), padding: insets),
      );
      final Rect rail = tester.getRect(railContainer());
      expect(rail.width, railTokens.containerWidth + insets.left);
      expect(rail.height, railHeight);
      final Rect menu = tester.getRect(
        find.byWidgetPredicate((Widget w) => w is TanreiIconButton && w.semanticLabel == 'Menu'),
      );
      expect(menu.top - rail.top, insets.top + railTokens.containerPaddingBlock);
      final Rect cell = tester.getRect(destinationOf('Inbox'));
      expect(cell.left, rail.left + insets.left);
      expect(cell.width, railTokens.containerWidth);
    });

    testWidgets('NVR-22: enlarged text keeps the width, lets labels take two lines and grows the '
        'destinations, and does not scale item containers or icons', (WidgetTester tester) async {
      await tester.pumpWidget(
        railApp(
          RailOwner(destinations: fourDestinations()),
          textScaler: const TextScaler.linear(2),
        ),
      );
      expect(tester.getRect(railContainer()).width, railTokens.containerWidth);
      final Finder label = find.descendant(
        of: destinationOf('Settings'),
        matching: find.text('Settings'),
      );
      expect(tester.getSize(label).height, 2 * 2 * railTokens.itemLabelTypescale.lineHeight);
      expect(
        tester.getSize(itemContainerOf('Settings')),
        Size(railTokens.itemContainerWidth, railTokens.itemContainerHeight),
      );
      expect(
        tester.getSize(
          find.descendant(of: destinationOf('Settings'), matching: find.byType(TanreiControlIcon)),
        ),
        Size.square(railTokens.itemIconSize),
      );
    });
  });

  group('motion, badges and semantics', () {
    testWidgets('NVR-16: a new selection grows its active indicator from the center while the '
        'old one fades, over motion.selection-*; selected-only labels appear and leave over the '
        'same time; at once where motion is reduced', (WidgetTester tester) async {
      final GlobalKey<RailOwnerState> owner = GlobalKey<RailOwnerState>();
      await tester.pumpWidget(
        railApp(
          RailOwner(
            key: owner,
            destinations: fourDestinations(),
            labelType: TanreiNavigationRailLabelType.selected,
          ),
        ),
      );
      final Color indicator = lightTheme.paint(
        partsOf(true, TanreiInteractionState.enabled).itemContainerColor,
      );
      owner.currentState!.set(1);
      await tester.pump();
      await tester.pump(tanreiDuration(railTokens.motionSelectionDuration) ~/ 2);
      final double t = railTokens.motionSelectionEasing.toCurve().transform(0.5);
      expect(growOf(tester, 'Sent'), moreOrLessEquals(t));
      expect(growOf(tester, 'Inbox'), 1);
      expect(itemFillOf(tester, 'Sent'), looksLike(indicator.withValues(alpha: indicator.a * t)));
      expect(
        tester
            .widget<Align>(find.ancestor(of: find.text('Sent'), matching: find.byType(Align)).first)
            .heightFactor,
        moreOrLessEquals(t),
      );
      await tester.pumpAndSettle();
      expect(itemFillOf(tester, 'Sent'), indicator);
      expect(find.text('Inbox'), findsNothing);

      final GlobalKey<RailOwnerState> reduced = GlobalKey<RailOwnerState>();
      await tester.pumpWidget(
        railApp(RailOwner(key: reduced, destinations: fourDestinations()), disableAnimations: true),
      );
      reduced.currentState!.set(3);
      await tester.pump();
      expect(growOf(tester, 'Settings'), 1);
      expect(itemFillOf(tester, 'Settings'), indicator);
      expect(tester.hasRunningAnimations, isFalse);
    });

    testWidgets('NVR-17: a badge is a Tanrei badge on the icon, kept while disabled, and its '
        'description joins the destination\'s', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(
        railApp(
          RailOwner(
            destinations: <TanreiNavigationRailDestination>[
              destination(
                'Inbox',
                badge: const TanreiNavigationBadge(count: 3, semanticLabel: '3 unread'),
              ),
              destination(
                'Chat',
                icon: 'chat',
                disabled: true,
                badge: const TanreiNavigationBadge(semanticLabel: 'New'),
              ),
              destination('Starred', icon: 'star', badge: const TanreiNavigationBadge(count: 7)),
            ],
          ),
        ),
      );
      expect(
        find.descendant(of: find.byType(TanreiBadge), matching: find.byType(TanreiControlIcon)),
        findsNWidgets(3),
      );
      final Map<String, String> values = <String, String>{
        for (final SemanticsData d in nodesWithRole(tester, SemanticsRole.tab)) d.label: d.value,
      };
      expect(values, <String, String>{'Inbox': '3 unread', 'Chat': 'New', 'Starred': '7'});
      handle.dispose();
    });

    testWidgets('NVR-20: the destinations are the tabs of a tab bar named by the rail\'s label; '
        'the header comes first in reading and focus order with its own semantics', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final FocusNode menu = FocusNode(debugLabel: 'Menu');
      addTearDown(menu.dispose);
      await tester.pumpWidget(
        railApp(RailOwner(initial: 1, destinations: fourDestinations(), menuFocus: menu)),
      );
      expect(nodesWithRole(tester, SemanticsRole.tabBar).single.label, 'Main');
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
      final List<String> labels = <String>[
        for (final SemanticsNode node in nodesBelow(semanticsRoot(tester)))
          if (node.getSemanticsData().label.isNotEmpty) node.getSemanticsData().label,
      ];
      expect(labels.indexOf('Menu'), lessThan(labels.indexOf('Inbox')));
      final SemanticsData button = nodesBelow(semanticsRoot(tester))
          .map((SemanticsNode n) => n.getSemanticsData())
          .singleWhere((SemanticsData d) => d.label == 'Menu');
      expect(button.hasFlag(SemanticsFlag.isButton), isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(FocusManager.instance.primaryFocus, menu);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(focusedLabel(), 'Inbox');
      handle.dispose();
    });

    testWidgets('NVR-21: a destination without a label still renders and is reported once', (
      WidgetTester tester,
    ) async {
      final List<String> reports = collectMissingNames();
      await tester.pumpWidget(
        railApp(
          RailOwner(
            destinations: <TanreiNavigationRailDestination>[
              destination('Inbox'),
              destination(''),
              destination('Starred', icon: 'star'),
            ],
          ),
        ),
      );
      expect(find.byType(TanreiNavigationItem), findsNWidgets(3));
      expect(reports, <String>['navigation destination']);
    });

    testWidgets('guidelines: navigation rail', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final TanreiThemeData theme in <TanreiThemeData>[
        TanreiThemeData.light,
        TanreiThemeData.dark,
      ]) {
        await tester.pumpWidget(
          railApp(
            RailOwner(key: UniqueKey(), destinations: fourDestinations()),
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
      expect(railTokens.containerWidth, 80);
      expect(railTokens.itemContainerWidth, 56);
      expect(railTokens.itemContainerHeight, 32);
      expect(railTokens.headerGap, 24);
      expect(railTokens.containerGap, 8);
      expect(lightTheme.paint(railTokens.outlineColor), light.outlineVariant);
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": the rail draws that system\'s width, colors and item '
          'container', (WidgetTester tester) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        final TanreiNavigationRailTokens tokens = shipped.navigationRail;
        await tester.pumpWidget(railApp(RailOwner(destinations: fourDestinations()), theme: theme));
        await tester.pumpAndSettle();
        expect(tester.getRect(railContainer()).width, tokens.containerWidth);
        final Color container = theme.paint(tokens.containerColor);
        expect(
          (tester.widget<DecoratedBox>(railContainer()).decoration as TanreiContainerDecoration)
              .color,
          container.a > 0 ? container : null,
        );
        final TanreiNavigationRailConditionStateTokens selected =
            tokens.conditions.selected.enabled;
        expect(itemFillOf(tester, 'Inbox'), theme.paint(selected.itemContainerColor));
        expect(itemIconOf(tester, 'Inbox').color, theme.paint(selected.itemIconColor));
        expect(edgeOf(tester).color, theme.paint(tokens.outlineColor));
        expect(itemDecorationOf(tester, 'Inbox').shape.smoothing, shipped.shape.cornerSmoothing);
      });
    }
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('navigation-rail');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'four-destinations',
        'no-header',
        'labels-selected',
        'labels-never',
        'badges',
        'disabled',
        'long-label',
      ]);
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          surface: navigationRailGoldenSurface,
          child: fixtureNavigationRail(fixture),
          file: 'goldens/navigation_rail/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: the badges show the preset's
    // indicator (or none), label style and rail color next to its header and badges.
    const String recorded = 'badges';
    for (final TanreiSystem preset in <TanreiSystem>[m3LikeSystem, cupertinoSystem]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: navigationRailGoldenSurface,
          child: fixtureNavigationRail(
            fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded),
          ),
          file: 'goldens/navigation_rail/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
