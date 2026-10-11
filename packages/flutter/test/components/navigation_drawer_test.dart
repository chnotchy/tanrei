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
final TanreiNavigationDrawerTokens drawerTokens = system.navigationDrawer;
final TanreiColors light = system.schemes.light;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The window of these tests.
const Size window = Size(800, 600);

/// The frame of the navigation drawer baselines: a 360 × 448 stage in the `space200` padding of
/// every baseline; a standard drawer is centered in it, a modal one fills it with its scrim.
const Size navigationDrawerGoldenSurface = Size(392, 480);

TanreiNavigationDrawerConditionStateTokens partsOf(
  bool selected,
  TanreiInteractionState state, [
  TanreiNavigationDrawerTokens? tokens,
]) => (tokens ?? drawerTokens)
    .conditions[selected
        ? TanreiNavigationDrawerCondition.selected
        : TanreiNavigationDrawerCondition.unselected]
    .of(state);

/// A fixture's items as the drawer's children, and the index of the destination whose value is
/// the fixture's value (counted in reading order through the sections).
({List<TanreiNavigationDrawerChild> children, int? selected}) fixtureChildren(
  Map<String, dynamic> fixture,
) {
  final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
  int index = 0;
  int? selected;
  List<TanreiNavigationDrawerChild> build(List<dynamic> items) => <TanreiNavigationDrawerChild>[
    for (final Map<String, dynamic> item in items.cast<Map<String, dynamic>>())
      if (item['kind'] == 'section')
        TanreiNavigationDrawerSection(
          heading: (item['props'] as Map<String, dynamic>)['heading'] as String? ?? '',
          divider: (item['props'] as Map<String, dynamic>)['divider'] == true,
          children: build(item['items'] as List<dynamic>),
        )
      else
        () {
          final Map<String, dynamic> p = item['props'] as Map<String, dynamic>;
          if (p['value'] == props['value']) {
            selected = index;
          }
          index++;
          return TanreiNavigationDrawerDestination(
            icon: navigationGlyph(p['icon'] as String?),
            label: p['label'] as String? ?? '',
            badge: p['badge'] as String? ?? '',
            enabled: p['disabled'] != true,
          );
        }(),
  ];
  final List<TanreiNavigationDrawerChild> children = build(fixture['items'] as List<dynamic>);
  return (children: children, selected: selected);
}

/// The drawer a fixture describes: standard centered in the stage, modal filling it.
Widget fixtureNavigationDrawer(Map<String, dynamic> fixture) {
  final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
  final ({List<TanreiNavigationDrawerChild> children, int? selected}) items = fixtureChildren(
    fixture,
  );
  return TanreiNavigationDrawer(
    variant: TanreiNavigationDrawerVariant(props['variant'] as String? ?? 'standard'),
    open: props['open'] == true,
    selectedIndex: items.selected,
    onDestinationSelected: (_) {},
    onClose: () {},
    semanticLabel: props['label'] as String? ?? '',
    children: items.children,
  );
}

/// The Mail drawer of most tests: a Mail section (Inbox with a badge, Sent, Drafts, Trash) and a
/// Labels section with a divider (Family, Work).
List<TanreiNavigationDrawerChild> mailChildren({bool draftsEnabled = true}) =>
    <TanreiNavigationDrawerChild>[
      TanreiNavigationDrawerSection(
        heading: 'Mail',
        children: <TanreiNavigationDrawerChild>[
          TanreiNavigationDrawerDestination(
            icon: navigationGlyph('inbox'),
            label: 'Inbox',
            badge: '24',
          ),
          TanreiNavigationDrawerDestination(icon: navigationGlyph('send'), label: 'Sent'),
          TanreiNavigationDrawerDestination(
            icon: navigationGlyph('drafts'),
            label: 'Drafts',
            enabled: draftsEnabled,
          ),
          TanreiNavigationDrawerDestination(icon: navigationGlyph('delete'), label: 'Trash'),
        ],
      ),
      TanreiNavigationDrawerSection(
        heading: 'Labels',
        divider: true,
        children: <TanreiNavigationDrawerChild>[
          TanreiNavigationDrawerDestination(icon: navigationGlyph('label'), label: 'Family'),
          TanreiNavigationDrawerDestination(icon: navigationGlyph('label'), label: 'Work'),
        ],
      ),
    ];

/// A page with a drawer whose owner keeps `open` and the selection, recording every call: a Menu
/// button that opens it and a Content button beside it; a standard drawer first in a row, a modal
/// one over the page.
class DrawerOwner extends StatefulWidget {
  const DrawerOwner({
    super.key,
    this.variant = TanreiNavigationDrawerVariant.standard,
    this.initialOpen = true,
    this.initial = 0,
    this.children,
    this.calls,
    this.closes,
    this.store = true,
    this.closeOnRequest = true,
    this.semanticLabel = 'Mail',
    this.header,
  });

  final TanreiNavigationDrawerVariant variant;
  final bool initialOpen;
  final int? initial;
  final List<TanreiNavigationDrawerChild>? children;
  final List<int>? calls;
  final List<String>? closes;
  final bool store;

  /// Whether the owner sets open to false when the drawer asks (a controlled drawer).
  final bool closeOnRequest;
  final String semanticLabel;
  final Widget? header;

  @override
  State<DrawerOwner> createState() => DrawerOwnerState();
}

class DrawerOwnerState extends State<DrawerOwner> {
  late bool open = widget.initialOpen;
  late int? selected = widget.initial;

  void setOpen(bool value) => setState(() => open = value);

  @override
  Widget build(BuildContext context) {
    final Widget drawer = TanreiNavigationDrawer(
      variant: widget.variant,
      open: open,
      selectedIndex: selected,
      semanticLabel: widget.semanticLabel,
      header: widget.header,
      onDestinationSelected: (int index) {
        widget.calls?.add(index);
        if (widget.store) {
          setState(() => selected = index);
        }
      },
      onClose: () {
        widget.closes?.add('close');
        if (widget.closeOnRequest) {
          setOpen(false);
        }
      },
      children: widget.children ?? mailChildren(),
    );
    final Widget page = Column(
      key: const ValueKey<String>('page'),
      mainAxisAlignment: MainAxisAlignment.center,
      children: <Widget>[
        TanreiButton(onPressed: () => setOpen(!open), child: const Text('Menu')),
        TanreiButton(onPressed: () {}, child: const Text('Content')),
      ],
    );
    return widget.variant == TanreiNavigationDrawerVariant.modal
        ? Stack(
            children: <Widget>[
              Positioned.fill(child: page),
              drawer,
            ],
          )
        : Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              drawer,
              Expanded(child: page),
            ],
          );
  }
}

/// A navigator app (so the platform's back reaches the page's route) around [child], with the
/// given insets, text scale and direction.
Widget drawerApp(
  Widget child, {
  TanreiThemeData theme = lightTheme,
  bool disableAnimations = false,
  TextDirection textDirection = TextDirection.ltr,
  EdgeInsets padding = EdgeInsets.zero,
  TextScaler textScaler = TextScaler.noScaling,
}) => WidgetsApp(
  color: theme.colors.primary,
  debugShowCheckedModeBanner: false,
  pageRouteBuilder: <T>(RouteSettings settings, WidgetBuilder builder) => PageRouteBuilder<T>(
    settings: settings,
    pageBuilder: (BuildContext context, _, _) => builder(context),
  ),
  home: Builder(
    builder: (BuildContext context) => MediaQuery(
      data: MediaQuery.of(
        context,
      ).copyWith(padding: padding, textScaler: textScaler, disableAnimations: disableAnimations),
      child: Directionality(
        textDirection: textDirection,
        child: TanreiTheme(
          data: theme,
          child: ColoredBox(color: theme.colors.surface, child: child),
        ),
      ),
    ),
  ),
);

Future<void> pumpDrawer(WidgetTester tester, Widget app) async {
  tester.view.physicalSize = window;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(app);
  await tester.pumpAndSettle();
}

/// The destination row labelled [label].
Finder rowOf(String label) => find
    .byWidgetPredicate(
      (Widget w) => w is Semantics && w.properties.button == true && w.properties.label == label,
    )
    .first;

Finder rowContainerOf(String label) => find
    .descendant(
      of: rowOf(label),
      matching: find.byWidgetPredicate(
        (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
      ),
    )
    .first;

TanreiContainerDecoration rowDecorationOf(WidgetTester tester, String label) =>
    tester.widget<DecoratedBox>(rowContainerOf(label)).decoration as TanreiContainerDecoration;

Color rowFillOf(WidgetTester tester, String label) =>
    rowDecorationOf(tester, label).color ?? const Color(0x00000000);

TanreiControlIcon? rowIconOf(WidgetTester tester, String label) {
  final Finder icon = find.descendant(of: rowOf(label), matching: find.byType(TanreiControlIcon));
  return icon.evaluate().isEmpty ? null : tester.widget<TanreiControlIcon>(icon);
}

TextStyle textStyleIn(WidgetTester tester, Finder of, String text) => tester
    .widget<RichText>(
      find.descendant(
        of: find.descendant(of: of, matching: find.text(text)),
        matching: find.byType(RichText),
      ),
    )
    .text
    .style!;

double rowOpacityOf(WidgetTester tester, String label) => tester
    .widget<Opacity>(find.descendant(of: rowOf(label), matching: find.byType(Opacity)).first)
    .opacity;

/// The drawer panel's container decoration.
Finder panelContainer() => find
    .descendant(
      of: find.byType(TanreiNavigationDrawer),
      matching: find.byWidgetPredicate(
        (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
      ),
    )
    .first;

TanreiContainerDecoration panelDecoration(WidgetTester tester) =>
    tester.widget<DecoratedBox>(panelContainer()).decoration as TanreiContainerDecoration;

/// The panel's visible rect (the container is drawn past the start edge and clipped there).
Rect panelRect(WidgetTester tester) => tester.getRect(
  find.descendant(of: find.byType(TanreiNavigationDrawer), matching: find.byType(ClipRect)).last,
);

TanreiEdgePainter edgeOf(WidgetTester tester) =>
    tester
            .widget<CustomPaint>(
              find
                  .descendant(
                    of: find.byType(TanreiNavigationDrawer),
                    matching: find.byWidgetPredicate(
                      (Widget w) => w is CustomPaint && w.foregroundPainter is TanreiEdgePainter,
                    ),
                  )
                  .first,
            )
            .foregroundPainter!
        as TanreiEdgePainter;

String focusedLabel() {
  final BuildContext? context = FocusManager.instance.primaryFocus?.context;
  if (context == null) {
    return '';
  }
  String? found;
  context.visitAncestorElements((Element element) {
    final Widget widget = element.widget;
    if (widget is Semantics &&
        widget.properties.button == true &&
        widget.properties.label != null) {
      found = widget.properties.label;
      return false;
    }
    if (widget is TanreiButton) {
      found = ((widget.child as Text?)?.data);
      return false;
    }
    return true;
  });
  return found ?? '';
}

Future<void> tabTimes(WidgetTester tester, int times, {bool shift = false}) async {
  for (int i = 0; i < times; i++) {
    if (shift) {
      await tester.sendKeyDownEvent(LogicalKeyboardKey.shift);
    }
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    if (shift) {
      await tester.sendKeyUpEvent(LogicalKeyboardKey.shift);
    }
    await tester.pump();
  }
}

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  final Duration hold = tanreiDuration(system.motion.duration.pressHold);
  const Duration tick = Duration(milliseconds: 1);

  group('selection and events', () {
    testWidgets('NVD-1: pointer, touch, Enter or Space on a destination calls '
        'onDestinationSelected once with its index in reading order — change, or reselect for '
        'the selected one', (WidgetTester tester) async {
      final List<int> calls = <int>[];
      await pumpDrawer(tester, drawerApp(DrawerOwner(calls: calls, store: false)));
      await tester.tap(rowOf('Family'));
      await tester.pumpAndSettle();
      expect(calls, <int>[4], reason: 'counted through the sections');
      await tester.tap(rowOf('Inbox'));
      await tester.pumpAndSettle();
      expect(calls, <int>[4, 0], reason: 'reselect');
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tabTimes(tester, 2);
      expect(focusedLabel(), 'Sent');
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pumpAndSettle();
      expect(calls, <int>[4, 0, 1, 1]);
    });

    testWidgets('NVD-2: a disabled destination calls nothing, is not focusable and is exposed as '
        'disabled', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<int> calls = <int>[];
      await pumpDrawer(
        tester,
        drawerApp(DrawerOwner(calls: calls, children: mailChildren(draftsEnabled: false))),
      );
      await tester.tap(rowOf('Drafts'));
      await tester.pumpAndSettle();
      expect(calls, isEmpty);
      final List<String> focused = <String>[];
      for (int i = 0; i < 3; i++) {
        await tabTimes(tester, 1);
        focused.add(focusedLabel());
      }
      expect(focused, <String>['Inbox', 'Sent', 'Trash']);
      final SemanticsData drafts = nodesBelow(semanticsRoot(tester))
          .map((SemanticsNode n) => n.getSemanticsData())
          .singleWhere((SemanticsData d) => d.label == 'Drafts');
      expect(drafts.hasFlag(SemanticsFlag.hasEnabledState), isTrue);
      expect(drafts.hasFlag(SemanticsFlag.isEnabled), isFalse);
      handle.dispose();
    });

    testWidgets('NVD-3: the selected destination, in a section or not, draws the selected parts '
        'and the others the unselected ones; an index that names no destination selects none and '
        'is reported', (WidgetTester tester) async {
      await pumpDrawer(tester, drawerApp(const DrawerOwner(initial: 5)));
      final TanreiNavigationDrawerConditionStateTokens selected = partsOf(
        true,
        TanreiInteractionState.enabled,
      );
      final TanreiNavigationDrawerConditionStateTokens unselected = partsOf(
        false,
        TanreiInteractionState.enabled,
      );
      expect(rowFillOf(tester, 'Work'), lightTheme.paint(selected.itemContainerColor));
      expect(rowIconOf(tester, 'Work')!.color, lightTheme.paint(selected.itemIconColor));
      expect(
        textStyleIn(tester, rowOf('Work'), 'Work').color,
        lightTheme.paint(selected.itemLabelColor),
      );
      expect(rowFillOf(tester, 'Inbox').a, 0);
      expect(
        textStyleIn(tester, rowOf('Inbox'), '24').color,
        lightTheme.paint(unselected.itemBadgeColor),
      );
      expect(
        textStyleIn(tester, rowOf('Inbox'), 'Inbox').color,
        lightTheme.paint(unselected.itemLabelColor),
      );

      await pumpDrawer(tester, drawerApp(DrawerOwner(key: UniqueKey(), initial: 0)));
      expect(
        textStyleIn(tester, rowOf('Inbox'), '24').color,
        lightTheme.paint(selected.itemBadgeColor),
      );

      final List<String> reports = collectIgnoredValues();
      await pumpDrawer(tester, drawerApp(DrawerOwner(key: UniqueKey(), initial: 12)));
      expect(reports.single, contains('names no destination'));
      for (final String label in <String>['Inbox', 'Sent', 'Family', 'Work']) {
        expect(rowFillOf(tester, label).a, 0, reason: label);
      }
    });

    testWidgets('NVD-29: a destination\'s value is its index, so no two repeat: the index selects '
        'exactly one destination even when two look alike', (WidgetTester tester) async {
      await pumpDrawer(
        tester,
        drawerApp(
          const DrawerOwner(
            initial: 1,
            children: <TanreiNavigationDrawerChild>[
              TanreiNavigationDrawerDestination(label: 'Inbox'),
              TanreiNavigationDrawerDestination(label: 'Inbox'),
            ],
          ),
        ),
      );
      final List<bool?> selected = tester
          .widgetList<Semantics>(
            find.byWidgetPredicate(
              (Widget w) =>
                  w is Semantics && w.properties.button == true && w.properties.label == 'Inbox',
            ),
          )
          .map((Semantics s) => s.properties.selected)
          .toList();
      expect(selected, <bool?>[false, true]);
    });
  });

  group('states', () {
    testWidgets('NVD-4: under the acme system hovered, focused and pressed draw their own tokens, '
        'pressed over focused over hovered; focus from a pointer draws no focused state', (
      WidgetTester tester,
    ) async {
      const TanreiThemeData acme = TanreiThemeData(system: acmeSystem);
      Color fill(TanreiInteractionState state) =>
          acme.paint(partsOf(false, state, acmeSystem.navigationDrawer).itemContainerColor);
      expect(<Color>{
        fill(TanreiInteractionState.hovered),
        fill(TanreiInteractionState.focused),
        fill(TanreiInteractionState.pressed),
      }, hasLength(3));
      await pumpDrawer(tester, drawerApp(const DrawerOwner(store: false), theme: acme));
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tabTimes(tester, 2);
      await tester.pumpAndSettle();
      expect(focusedLabel(), 'Sent');
      expect(rowFillOf(tester, 'Sent'), fill(TanreiInteractionState.focused));
      final TestGesture mouse = await hoverOver(tester, rowOf('Sent'));
      expect(rowFillOf(tester, 'Sent'), fill(TanreiInteractionState.focused));
      await mouse.down(tester.getCenter(rowOf('Sent')));
      await tester.pump();
      expect(rowFillOf(tester, 'Sent'), fill(TanreiInteractionState.pressed));
      expect(
        textStyleIn(tester, rowOf('Sent'), 'Sent').color,
        acme.paint(
          partsOf(
            false,
            TanreiInteractionState.pressed,
            acmeSystem.navigationDrawer,
          ).itemLabelColor,
        ),
      );
      await mouse.up();
      await tester.pumpAndSettle();
      await mouse.moveTo(tester.getCenter(rowOf('Trash')));
      await tester.pumpAndSettle();
      expect(rowFillOf(tester, 'Trash'), fill(TanreiInteractionState.hovered));

      await pumpDrawer(tester, drawerApp(DrawerOwner(key: UniqueKey(), store: false), theme: acme));
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      await tester.tap(rowOf('Family'));
      await tester.pumpAndSettle();
      expect(rowFillOf(tester, 'Family'), fill(TanreiInteractionState.enabled));
    });

    testWidgets('NVD-5: keyboard focus shows the focus ring around the item container at once; '
        'focus from a pointer shows none', (WidgetTester tester) async {
      await pumpDrawer(tester, drawerApp(const DrawerOwner()));
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tabTimes(tester, 1);
      final TanreiFocusRing ring = tester.widget<TanreiFocusRing>(
        find.descendant(of: rowOf('Inbox'), matching: find.byType(TanreiFocusRing)),
      );
      expect(ring.visible, isTrue);
      expect(
        tester.getSize(find.descendant(of: rowOf('Inbox'), matching: find.byType(TanreiFocusRing))),
        tester.getSize(rowContainerOf('Inbox')),
      );
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      await tester.tap(rowOf('Sent'));
      await tester.pump();
      expect(
        tester
            .widget<TanreiFocusRing>(
              find.descendant(of: rowOf('Sent'), matching: find.byType(TanreiFocusRing)),
            )
            .visible,
        isFalse,
      );
    });

    testWidgets('NVD-6: the hit area is the item container with half of container.gap above and '
        'below — the touch target with the default tokens — and a press there activates it', (
      WidgetTester tester,
    ) async {
      final List<int> calls = <int>[];
      await pumpDrawer(tester, drawerApp(DrawerOwner(calls: calls, store: false)));
      final Rect cell = tester.getRect(rowOf('Sent'));
      final Rect box = tester.getRect(rowContainerOf('Sent'));
      expect(box.top - cell.top, drawerTokens.containerGap / 2);
      expect(cell.bottom - box.bottom, drawerTokens.containerGap / 2);
      expect(cell.height, drawerTokens.itemContainerHeight + drawerTokens.containerGap);
      expect(cell.height, system.measure.targetTouch);
      await tester.tapAt(Offset(box.center.dx, cell.top + 1));
      await tester.pumpAndSettle();
      expect(calls, <int>[1]);
    });

    testWidgets('NVD-7: a disabled destination draws the disabled tokens of its condition and the '
        'disabled opacity', (WidgetTester tester) async {
      await pumpDrawer(
        tester,
        drawerApp(DrawerOwner(children: mailChildren(draftsEnabled: false))),
      );
      final TanreiNavigationDrawerConditionStateTokens disabled = partsOf(
        false,
        TanreiInteractionState.disabled,
      );
      expect(rowIconOf(tester, 'Drafts')!.color, lightTheme.paint(disabled.itemIconColor));
      expect(
        textStyleIn(tester, rowOf('Drafts'), 'Drafts').color,
        lightTheme.paint(disabled.itemLabelColor),
      );
      expect(rowOpacityOf(tester, 'Drafts'), drawerTokens.disabled.opacity);
    });
  });

  group('press', () {
    testWidgets('NVD-8: a press shows the pressed state without delay and keeps it for the '
        'press-hold duration', (WidgetTester tester) async {
      const TanreiThemeData acme = TanreiThemeData(system: acmeSystem);
      final Color pressed = acme.paint(
        partsOf(
          false,
          TanreiInteractionState.pressed,
          acmeSystem.navigationDrawer,
        ).itemContainerColor,
      );
      await pumpDrawer(tester, drawerApp(const DrawerOwner(store: false), theme: acme));
      await tester.tap(rowOf('Sent'));
      await tester.pump();
      expect(rowFillOf(tester, 'Sent'), pressed);
      await tester.pump(hold - tick);
      expect(rowFillOf(tester, 'Sent'), pressed);
      await tester.pump(tick);
      await tester.pumpAndSettle();
      expect(rowFillOf(tester, 'Sent'), isNot(pressed));
    });

    testWidgets(
      'NVD-9: overlay (default) fills the pressed item container; ripple (m3-like) grows '
      'from the point of contact; dim (cupertino) dims the destination and draws no state layer',
      (WidgetTester tester) async {
        await pumpDrawer(tester, drawerApp(const DrawerOwner(store: false)));
        TestGesture touch = await tester.startGesture(tester.getCenter(rowContainerOf('Sent')));
        await tester.pump();
        expect(
          rowFillOf(tester, 'Sent'),
          lightTheme.paint(partsOf(false, TanreiInteractionState.pressed).itemContainerColor),
        );
        expect(rowDecorationOf(tester, 'Sent').ripple, isNull);
        await touch.up();
        await tester.pumpAndSettle();

        await pumpDrawer(
          tester,
          drawerApp(
            DrawerOwner(key: UniqueKey(), store: false),
            theme: const TanreiThemeData(system: m3LikeSystem),
          ),
        );
        final Rect box = tester.getRect(rowContainerOf('Sent'));
        const Offset contact = Offset(40, 10);
        touch = await tester.startGesture(box.topLeft + contact);
        await tester.pump();
        expect(rowDecorationOf(tester, 'Sent').ripple!.origin, contact);
        await touch.up();
        await tester.pumpAndSettle();

        await pumpDrawer(
          tester,
          drawerApp(
            DrawerOwner(key: UniqueKey(), store: false),
            theme: const TanreiThemeData(system: cupertinoSystem),
          ),
        );
        touch = await tester.startGesture(tester.getCenter(rowOf('Sent')));
        await tester.pump();
        expect(rowOpacityOf(tester, 'Sent'), cupertinoSystem.navigationDrawer.pressed.opacity);
        expect(rowFillOf(tester, 'Sent').a, 0);
        await touch.up();
        await tester.pumpAndSettle();
      },
    );

    testWidgets('NVD-10: the corner smoothing of the system eases the item containers and a modal '
        'drawer\'s end corners', (WidgetTester tester) async {
      await pumpDrawer(
        tester,
        drawerApp(
          const DrawerOwner(variant: TanreiNavigationDrawerVariant.modal),
          theme: const TanreiThemeData(system: cupertinoSystem),
        ),
      );
      expect(
        rowDecorationOf(tester, 'Inbox').shape.smoothing,
        cupertinoSystem.shape.cornerSmoothing,
      );
      expect(panelDecoration(tester).shape.smoothing, cupertinoSystem.shape.cornerSmoothing);
      expect(
        panelDecoration(tester).shape.radius,
        cupertinoSystem.navigationDrawer.variants.modal.containerShape,
      );
      expect(
        tester
            .widget<TanreiFocusRing>(
              find.descendant(of: rowOf('Inbox'), matching: find.byType(TanreiFocusRing)),
            )
            .borderRadius,
        BorderRadius.circular(cupertinoSystem.navigationDrawer.itemContainerShape),
      );
    });
  });

  group('layout', () {
    testWidgets('NVD-11: container.width wide, the full height, the variant\'s color, elevation, '
        'end corners and end edge, the start corners square; at the right edge in right-to-left', (
      WidgetTester tester,
    ) async {
      await pumpDrawer(tester, drawerApp(const DrawerOwner()));
      final TanreiNavigationDrawerVariantTokens standard = drawerTokens.variants.standard;
      expect(panelRect(tester).size, Size(drawerTokens.containerWidth, window.height));
      expect(panelRect(tester).left, 0);
      expect(panelDecoration(tester).color, lightTheme.paint(standard.containerColor));
      expect(edgeOf(tester).side, TanreiEdgeSide.end);
      expect(edgeOf(tester).color, lightTheme.paint(standard.outlineColor));
      expect(edgeOf(tester).width, drawerTokens.outlineWidth);

      await pumpDrawer(
        tester,
        drawerApp(const DrawerOwner(variant: TanreiNavigationDrawerVariant.modal)),
      );
      final TanreiNavigationDrawerVariantTokens modal = drawerTokens.variants.modal;
      expect(panelDecoration(tester).color, lightTheme.paint(modal.containerColor));
      expect(
        panelDecoration(tester).boxShadow,
        TanreiResolvedElevation.resolve(modal.containerElevation, light).shadows,
      );
      expect(panelDecoration(tester).shape.radius, modal.containerShape);
      // The container is drawn past the start edge by the radius: its start corners are clipped.
      final Rect drawn = tester.getRect(panelContainer());
      expect(drawn.left, -modal.containerShape);
      expect(drawn.right, drawerTokens.containerWidth);
      expect(edgeOf(tester).color.a, 0);

      await pumpDrawer(
        tester,
        drawerApp(DrawerOwner(key: UniqueKey()), textDirection: TextDirection.rtl),
      );
      expect(panelRect(tester).right, window.width);
      expect(edgeOf(tester).rectIn(panelRect(tester).size).left, 0);
    });

    testWidgets('NVD-12: padding-inline and padding-block around the header and the items in '
        'reading order, container.gap between two destinations; they scroll together', (
      WidgetTester tester,
    ) async {
      await pumpDrawer(
        tester,
        drawerApp(const DrawerOwner(header: SizedBox(height: 40, child: Text('Header')))),
      );
      final Rect panel = panelRect(tester);
      final Rect header = tester.getRect(find.text('Header'));
      expect(header.top - panel.top, drawerTokens.containerPaddingBlock);
      expect(header.left - panel.left, drawerTokens.containerPaddingInline);
      final Rect inbox = tester.getRect(rowContainerOf('Inbox'));
      final Rect sent = tester.getRect(rowContainerOf('Sent'));
      expect(inbox.left - panel.left, drawerTokens.containerPaddingInline);
      expect(panel.right - inbox.right, drawerTokens.containerPaddingInline);
      expect(sent.top - inbox.bottom, drawerTokens.containerGap);
      expect(
        tester.getRect(find.text('Header')).top,
        lessThan(tester.getRect(find.text('Mail')).top),
      );

      // A short window: the header and the items scroll together.
      tester.view.physicalSize = const Size(800, 200);
      await tester.pumpAndSettle();
      final double before = tester.getRect(find.text('Header')).top;
      await tester.drag(find.text('Sent'), const Offset(0, -100));
      await tester.pumpAndSettle();
      expect(tester.getRect(find.text('Header')).top, lessThan(before));
    });

    testWidgets('NVD-13: an item container across the inner width, at least item.container.height, '
        'with corners item.container.shape: icon, label (wrapping) and badge text, '
        'item.padding-inline in and item.gap apart; mirrored right to left', (
      WidgetTester tester,
    ) async {
      const String long = 'A destination name far too long for one line of the drawer';
      await pumpDrawer(
        tester,
        drawerApp(
          DrawerOwner(
            children: <TanreiNavigationDrawerChild>[
              TanreiNavigationDrawerDestination(
                icon: navigationGlyph('inbox'),
                label: 'Inbox',
                badge: '24',
              ),
              TanreiNavigationDrawerDestination(icon: navigationGlyph('send'), label: long),
            ],
          ),
        ),
      );
      final Rect box = tester.getRect(rowContainerOf('Inbox'));
      expect(box.height, drawerTokens.itemContainerHeight);
      expect(rowDecorationOf(tester, 'Inbox').shape.radius, drawerTokens.itemContainerShape);
      final Rect icon = tester.getRect(
        find.descendant(of: rowOf('Inbox'), matching: find.byType(TanreiControlIcon)),
      );
      final Rect label = tester.getRect(
        find.descendant(of: rowOf('Inbox'), matching: find.text('Inbox')),
      );
      final Rect badge = tester.getRect(
        find.descendant(of: rowOf('Inbox'), matching: find.text('24')),
      );
      expect(icon.left - box.left, drawerTokens.itemPaddingInline);
      expect(label.left - icon.right, drawerTokens.itemGap);
      expect(box.right - badge.right, drawerTokens.itemPaddingInline);
      expect(icon.center.dy, moreOrLessEquals(box.center.dy));
      expect(
        textStyleIn(tester, rowOf('Inbox'), 'Inbox').fontSize,
        drawerTokens.itemLabelTypescale.size,
      );
      expect(
        textStyleIn(tester, rowOf('Inbox'), '24').fontSize,
        drawerTokens.itemBadgeTypescale.size,
      );
      // Wrapping, not truncated: the row grows.
      final Finder longText = find.descendant(of: rowOf(long), matching: find.text(long));
      expect(
        tester.getSize(longText).height,
        greaterThan(drawerTokens.itemLabelTypescale.lineHeight),
      );
      expect(
        tester.getRect(rowContainerOf(long)).height,
        greaterThan(drawerTokens.itemContainerHeight),
      );

      await pumpDrawer(
        tester,
        drawerApp(
          DrawerOwner(
            key: UniqueKey(),
            children: <TanreiNavigationDrawerChild>[
              TanreiNavigationDrawerDestination(
                icon: navigationGlyph('inbox'),
                label: 'Inbox',
                badge: '24',
              ),
            ],
          ),
          textDirection: TextDirection.rtl,
        ),
      );
      final Rect mirroredBox = tester.getRect(rowContainerOf('Inbox'));
      final Rect mirroredIcon = tester.getRect(
        find.descendant(of: rowOf('Inbox'), matching: find.byType(TanreiControlIcon)),
      );
      expect(mirroredBox.right - mirroredIcon.right, drawerTokens.itemPaddingInline);
      expect(
        tester.getRect(find.descendant(of: rowOf('Inbox'), matching: find.text('24'))).left -
            mirroredBox.left,
        drawerTokens.itemPaddingInline,
      );
    });

    testWidgets('NVD-14: each icon at item.icon.size with the family and fill of its condition', (
      WidgetTester tester,
    ) async {
      await pumpDrawer(tester, drawerApp(const DrawerOwner()));
      expect(rowIconOf(tester, 'Inbox')!.size, drawerTokens.itemIconSize);
      expect(rowIconOf(tester, 'Inbox')!.selected, isTrue);
      expect(rowIconOf(tester, 'Sent')!.selected, isFalse);
      // No icon: none drawn.
      await pumpDrawer(
        tester,
        drawerApp(
          DrawerOwner(
            key: UniqueKey(),
            children: const <TanreiNavigationDrawerChild>[
              TanreiNavigationDrawerDestination(label: 'Overview'),
            ],
          ),
        ),
      );
      expect(rowIconOf(tester, 'Overview'), isNull);
    });

    testWidgets('NVD-16: a heading in heading.typescale and heading.color, in a row at least '
        'heading.height high, starting where the destinations\' content starts, exposed as a '
        'heading that is not focusable; an empty heading draws no row', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await pumpDrawer(tester, drawerApp(const DrawerOwner()));
      final TextStyle style = textStyleIn(tester, find.byType(TanreiNavigationDrawer), 'Mail');
      expect(style.fontSize, drawerTokens.headingTypescale.size);
      expect(style.color, lightTheme.paint(drawerTokens.headingColor));
      final Rect heading = tester.getRect(find.text('Mail'));
      final Rect row = tester.getRect(
        find.ancestor(of: find.text('Mail'), matching: find.byType(ConstrainedBox)).first,
      );
      expect(row.height, drawerTokens.headingHeight);
      expect(heading.center.dy, moreOrLessEquals(row.center.dy));
      final Rect icon = tester.getRect(
        find.descendant(of: rowOf('Inbox'), matching: find.byType(TanreiControlIcon)),
      );
      expect(heading.left, icon.left);
      final SemanticsData data = nodesBelow(semanticsRoot(tester))
          .map((SemanticsNode n) => n.getSemanticsData())
          .singleWhere((SemanticsData d) => d.label == 'Mail');
      expect(data.hasFlag(SemanticsFlag.isHeader), isTrue);
      expect(data.hasFlag(SemanticsFlag.isFocusable), isFalse);

      await pumpDrawer(
        tester,
        drawerApp(
          DrawerOwner(
            key: UniqueKey(),
            children: const <TanreiNavigationDrawerChild>[
              TanreiNavigationDrawerSection(
                children: <TanreiNavigationDrawerChild>[
                  TanreiNavigationDrawerDestination(label: 'Only'),
                ],
              ),
            ],
          ),
        ),
      );
      expect(
        nodesBelow(
          semanticsRoot(tester),
        ).where((SemanticsNode n) => n.getSemanticsData().hasFlag(SemanticsFlag.isHeader)),
        isEmpty,
      );
      handle.dispose();
    });

    testWidgets('NVD-17: a divider component before a section whose divider is true, across the '
        'inner width; a section in a section is drawn in its place and reported', (
      WidgetTester tester,
    ) async {
      await pumpDrawer(tester, drawerApp(const DrawerOwner()));
      expect(find.byType(TanreiDivider), findsOneWidget);
      final Rect divider = tester.getRect(find.byType(TanreiDivider));
      expect(divider.bottom, lessThanOrEqualTo(tester.getRect(find.text('Labels')).top));
      expect(divider.top, greaterThanOrEqualTo(tester.getRect(rowOf('Trash')).bottom));
      expect(divider.width, drawerTokens.containerWidth - 2 * drawerTokens.containerPaddingInline);

      final List<String> reports = collectIgnoredValues();
      final List<int> calls = <int>[];
      await pumpDrawer(
        tester,
        drawerApp(
          DrawerOwner(
            key: UniqueKey(),
            calls: calls,
            children: const <TanreiNavigationDrawerChild>[
              TanreiNavigationDrawerDestination(label: 'Top'),
              TanreiNavigationDrawerSection(
                heading: 'Outer',
                children: <TanreiNavigationDrawerChild>[
                  TanreiNavigationDrawerSection(
                    heading: 'Inner',
                    children: <TanreiNavigationDrawerChild>[
                      TanreiNavigationDrawerDestination(label: 'Nested'),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      );
      expect(reports.single, contains('do not nest'));
      await tester.tap(rowOf('Nested'));
      await tester.pumpAndSettle();
      expect(calls, <int>[1]);
    });

    testWidgets('NVD-25: the container reaches under the insets at its start, top and bottom; the '
        'content sits inside them', (WidgetTester tester) async {
      const EdgeInsets insets = EdgeInsets.fromLTRB(30, 24, 0, 20);
      await pumpDrawer(
        tester,
        drawerApp(
          const DrawerOwner(header: SizedBox(height: 20, child: Text('Header'))),
          padding: insets,
        ),
      );
      final Rect panel = panelRect(tester);
      expect(panel.width, drawerTokens.containerWidth + insets.left);
      expect(panel.top, 0);
      expect(panel.height, window.height);
      final Rect header = tester.getRect(find.text('Header'));
      expect(header.top, insets.top + drawerTokens.containerPaddingBlock);
      expect(header.left, insets.left + drawerTokens.containerPaddingInline);
    });

    testWidgets('NVD-26: a variant the system does not have renders with standard\'s tokens and '
        'is reported', (WidgetTester tester) async {
      final List<String> reports = collectUnknownValues();
      await pumpDrawer(
        tester,
        drawerApp(const DrawerOwner(variant: TanreiNavigationDrawerVariant('floating'))),
      );
      expect(reports, contains('navigation-drawer variant "floating" -> standard'));
      expect(
        panelDecoration(tester).color,
        lightTheme.paint(drawerTokens.variants.standard.containerColor),
      );
      // It behaves as standard: in the layout, no scrim, no dialog.
      expect(find.byType(FadeTransition), findsNothing);
      expect(find.byType(Expanded), findsWidgets);
    });

    testWidgets('NVD-27: enlarged text keeps the width, grows destinations and headings, and does '
        'not scale the icons', (WidgetTester tester) async {
      await pumpDrawer(
        tester,
        drawerApp(const DrawerOwner(), textScaler: const TextScaler.linear(3)),
      );
      expect(panelRect(tester).width, drawerTokens.containerWidth);
      expect(
        tester.getRect(rowContainerOf('Sent')).height,
        greaterThan(drawerTokens.itemContainerHeight),
      );
      expect(
        tester
            .getSize(
              find.ancestor(of: find.text('Mail'), matching: find.byType(ConstrainedBox)).first,
            )
            .height,
        greaterThan(drawerTokens.headingHeight),
      );
      expect(
        tester.getSize(
          find.descendant(of: rowOf('Sent'), matching: find.byType(TanreiControlIcon)),
        ),
        Size.square(drawerTokens.itemIconSize),
      );
    });
  });

  group('standard: a layout region', () {
    testWidgets('NVD-18: open takes the width, closed takes none and has no presence; a change '
        'slides over the enter or exit motion while the content resizes, at once where motion is '
        'reduced; no scrim, no trap, no close', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final GlobalKey<DrawerOwnerState> owner = GlobalKey<DrawerOwnerState>();
      final List<String> closes = <String>[];
      await pumpDrawer(tester, drawerApp(DrawerOwner(key: owner, closes: closes)));
      Rect content() => tester.getRect(find.byKey(const ValueKey<String>('page')));
      expect(content().left, drawerTokens.containerWidth);
      expect(find.byType(FadeTransition), findsNothing, reason: 'no scrim');

      owner.currentState!.setOpen(false);
      await tester.pump();
      await tester.pump(tanreiDuration(drawerTokens.motionExitDuration) ~/ 2);
      final double t = 1 - drawerTokens.motionExitEasing.toCurve().transform(0.5);
      expect(content().left, moreOrLessEquals(drawerTokens.containerWidth * t, epsilon: 0.5));
      await tester.pumpAndSettle();
      expect(content().left, 0);
      expect(find.text('Inbox'), findsNothing);
      expect(
        nodesBelow(
          semanticsRoot(tester),
        ).where((SemanticsNode n) => n.getSemanticsData().label == 'Inbox'),
        isEmpty,
      );

      owner.currentState!.setOpen(true);
      await tester.pump();
      await tester.pump(tanreiDuration(drawerTokens.motionEnterDuration) ~/ 2);
      expect(
        content().left,
        moreOrLessEquals(
          drawerTokens.containerWidth * drawerTokens.motionEnterEasing.toCurve().transform(0.5),
          epsilon: 0.5,
        ),
      );
      await tester.pumpAndSettle();
      expect(content().left, drawerTokens.containerWidth);
      expect(closes, isEmpty);

      final GlobalKey<DrawerOwnerState> reduced = GlobalKey<DrawerOwnerState>();
      await pumpDrawer(tester, drawerApp(DrawerOwner(key: reduced), disableAnimations: true));
      reduced.currentState!.setOpen(false);
      await tester.pump();
      expect(content().left, 0);
      expect(tester.hasRunningAnimations, isFalse);
      handle.dispose();
    });

    testWidgets('NVD-28: opening moves focus to the selected destination, closing with focus '
        'inside returns it; Tab leaves an open standard drawer without closing it', (
      WidgetTester tester,
    ) async {
      final GlobalKey<DrawerOwnerState> owner = GlobalKey<DrawerOwnerState>();
      await pumpDrawer(tester, drawerApp(DrawerOwner(key: owner, initialOpen: false, initial: 1)));
      // Menu has keyboard focus, and Enter opens the drawer.
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tabTimes(tester, 1);
      expect(focusedLabel(), 'Menu');
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      expect(owner.currentState!.open, isTrue);
      expect(focusedLabel(), 'Sent');
      owner.currentState!.setOpen(false);
      await tester.pumpAndSettle();
      expect(focusedLabel(), 'Menu');

      // Tab from the last destination moves on to the page; the drawer stays open.
      owner.currentState!.setOpen(true);
      await tester.pumpAndSettle();
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tabTimes(tester, 5);
      expect(focusedLabel(), 'Menu');
      expect(owner.currentState!.open, isTrue);
      expect(find.text('Inbox'), findsOneWidget);
    });
  });

  group('modal: a modal overlay', () {
    testWidgets('NVD-19: opening slides the drawer in from the start edge and fades the scrim in '
        'over the enter motion, moves focus to the selected destination, keeps Tab inside and makes '
        'everything behind it inert', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final GlobalKey<DrawerOwnerState> owner = GlobalKey<DrawerOwnerState>();
      final List<String> closes = <String>[];
      await pumpDrawer(
        tester,
        drawerApp(
          DrawerOwner(
            key: owner,
            variant: TanreiNavigationDrawerVariant.modal,
            initialOpen: false,
            initial: 1,
            closes: closes,
            closeOnRequest: false,
          ),
        ),
      );
      expect(find.text('Inbox'), findsNothing);
      await tester.tap(find.text('Menu'));
      await tester.pump();
      await tester.pump(tanreiDuration(drawerTokens.motionEnterDuration) ~/ 2);
      final double t = drawerTokens.motionEnterEasing.toCurve().transform(0.5);
      expect(
        panelRect(tester).left,
        moreOrLessEquals(-drawerTokens.containerWidth * (1 - t), epsilon: 0.5),
      );
      final FadeTransition scrim = tester.widget<FadeTransition>(
        find.descendant(
          of: find.byType(TanreiNavigationDrawer),
          matching: find.byType(FadeTransition),
        ),
      );
      expect(scrim.opacity.value, moreOrLessEquals(t));
      await tester.pumpAndSettle();
      expect(panelRect(tester).left, 0);
      expect(
        tester
            .widget<ColoredBox>(
              find.descendant(of: find.byType(FadeTransition), matching: find.byType(ColoredBox)),
            )
            .color,
        lightTheme.paint(drawerTokens.scrimColor),
      );
      expect(focusedLabel(), 'Sent');

      // Tab stays inside: six destinations (Drafts included), wrapping.
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final Set<String> seen = <String>{};
      for (int i = 0; i < 8; i++) {
        await tabTimes(tester, 1);
        seen.add(focusedLabel());
      }
      expect(seen, <String>{'Inbox', 'Sent', 'Drafts', 'Trash', 'Family', 'Work'});

      // Behind it: a press lands on the scrim, the page is hidden from assistive technology.
      await tester.tapAt(const Offset(700, 300));
      await tester.pump();
      expect(closes, <String>['close'], reason: 'the scrim took the press');
      expect(
        nodesBelow(
          semanticsRoot(tester),
        ).where((SemanticsNode n) => n.getSemanticsData().label == 'Content'),
        isEmpty,
      );
      expect(TanreiModalOverlays.instance.isAnyOpen, isTrue);
      handle.dispose();
    });

    testWidgets('NVD-20: the scrim, Escape, the platform\'s back, a drag past half its width and a '
        'fling toward the start edge each call onClose once; the owner closes it', (
      WidgetTester tester,
    ) async {
      final List<String> closes = <String>[];
      Future<GlobalKey<DrawerOwnerState>> openDrawer({bool closeOnRequest = true}) async {
        final GlobalKey<DrawerOwnerState> owner = GlobalKey<DrawerOwnerState>();
        await pumpDrawer(
          tester,
          drawerApp(
            DrawerOwner(
              key: owner,
              variant: TanreiNavigationDrawerVariant.modal,
              closes: closes,
              closeOnRequest: closeOnRequest,
            ),
          ),
        );
        return owner;
      }

      GlobalKey<DrawerOwnerState> owner = await openDrawer();
      await tester.tapAt(const Offset(700, 300));
      await tester.pumpAndSettle();
      expect(closes, hasLength(1));
      expect(owner.currentState!.open, isFalse);
      expect(find.text('Inbox'), findsNothing);

      owner = await openDrawer();
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(closes, hasLength(2));
      expect(owner.currentState!.open, isFalse);

      owner = await openDrawer();
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(closes, hasLength(3));
      expect(owner.currentState!.open, isFalse);
      expect(find.text('Menu'), findsOneWidget, reason: 'the page stayed');

      owner = await openDrawer();
      await tester.dragFrom(const Offset(200, 300), const Offset(-160, 0));
      await tester.pumpAndSettle();
      expect(closes, hasLength(4));
      expect(owner.currentState!.open, isFalse);

      // A short drag springs back; a fling closes.
      owner = await openDrawer();
      await tester.dragFrom(const Offset(200, 300), const Offset(-60, 0));
      await tester.pumpAndSettle();
      expect(closes, hasLength(4));
      expect(panelRect(tester).left, 0);
      await tester.flingFrom(const Offset(200, 300), const Offset(-60, 0), 1000);
      await tester.pumpAndSettle();
      expect(closes, hasLength(5));

      // Controlled: an owner that does not close it keeps it open; one request per close.
      owner = await openDrawer(closeOnRequest: false);
      await tester.tapAt(const Offset(700, 300));
      await tester.tapAt(const Offset(700, 300));
      await tester.pump();
      expect(closes, hasLength(6));
      await tester.pumpAndSettle();
      expect(owner.currentState!.open, isTrue);
      expect(panelRect(tester).left, 0);
    });

    testWidgets('NVD-21: activating a destination in a modal drawer calls onDestinationSelected, '
        'then onClose', (WidgetTester tester) async {
      final List<String> events = <String>[];
      final GlobalKey<DrawerOwnerState> owner = GlobalKey<DrawerOwnerState>();
      final List<int> calls = <int>[];
      await pumpDrawer(
        tester,
        drawerApp(
          DrawerOwner(
            key: owner,
            variant: TanreiNavigationDrawerVariant.modal,
            calls: calls,
            closes: events,
          ),
        ),
      );
      await tester.tap(rowOf('Trash'));
      await tester.pumpAndSettle();
      expect(calls, <int>[3]);
      expect(events, <String>['close']);
      expect(owner.currentState!.open, isFalse);
      expect(owner.currentState!.selected, 3);
    });

    testWidgets('NVD-22: closing slides the drawer out and fades the scrim over the exit motion, '
        'and returns focus to where it was', (WidgetTester tester) async {
      final GlobalKey<DrawerOwnerState> owner = GlobalKey<DrawerOwnerState>();
      await pumpDrawer(
        tester,
        drawerApp(
          DrawerOwner(key: owner, variant: TanreiNavigationDrawerVariant.modal, initialOpen: false),
        ),
      );
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tabTimes(tester, 1);
      expect(focusedLabel(), 'Menu');
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      expect(focusedLabel(), 'Inbox');
      owner.currentState!.setOpen(false);
      await tester.pump();
      expect(focusedLabel(), 'Menu', reason: 'at the start of the motion');
      await tester.pump(tanreiDuration(drawerTokens.motionExitDuration) ~/ 2);
      final double t = drawerTokens.motionExitEasing.toCurve().transform(0.5);
      expect(
        panelRect(tester).left,
        moreOrLessEquals(-drawerTokens.containerWidth * t, epsilon: 0.5),
      );
      await tester.pumpAndSettle();
      expect(find.text('Inbox'), findsNothing);
      expect(TanreiModalOverlays.instance.isAnyOpen, isFalse);

      // Reduced motion: at once.
      final GlobalKey<DrawerOwnerState> reduced = GlobalKey<DrawerOwnerState>();
      await pumpDrawer(
        tester,
        drawerApp(
          DrawerOwner(key: reduced, variant: TanreiNavigationDrawerVariant.modal),
          disableAnimations: true,
        ),
      );
      reduced.currentState!.setOpen(false);
      await tester.pump();
      await tester.pump();
      expect(find.text('Inbox'), findsNothing);
    });

    testWidgets('NVD-23: each destination a button named by its label with its selected state, '
        'the icon hidden; a modal drawer is a modal dialog named by the drawer\'s label', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await pumpDrawer(
        tester,
        drawerApp(const DrawerOwner(variant: TanreiNavigationDrawerVariant.modal)),
      );
      final List<SemanticsData> all = nodesBelow(
        semanticsRoot(tester),
      ).map((SemanticsNode n) => n.getSemanticsData()).toList();
      final SemanticsData dialog = all.singleWhere(
        (SemanticsData d) => d.role == SemanticsRole.dialog,
      );
      expect(dialog.label, 'Mail');
      expect(dialog.hasFlag(SemanticsFlag.scopesRoute), isTrue);
      expect(dialog.hasFlag(SemanticsFlag.namesRoute), isTrue);
      final SemanticsData inbox = all.singleWhere((SemanticsData d) => d.label == 'Inbox');
      expect(inbox.hasFlag(SemanticsFlag.isButton), isTrue);
      expect(inbox.hasFlag(SemanticsFlag.isSelected), isTrue);
      final SemanticsData sent = all.singleWhere((SemanticsData d) => d.label == 'Sent');
      expect(sent.hasFlag(SemanticsFlag.hasSelectedState), isTrue);
      expect(sent.hasFlag(SemanticsFlag.isSelected), isFalse);
      handle.dispose();
    });

    testWidgets('NVD-15: badge text is part of the destination\'s description and stays while '
        'disabled', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await pumpDrawer(
        tester,
        drawerApp(
          const DrawerOwner(
            children: <TanreiNavigationDrawerChild>[
              TanreiNavigationDrawerDestination(label: 'Inbox', badge: '24'),
              TanreiNavigationDrawerDestination(label: 'Work', badge: 'New', enabled: false),
            ],
          ),
        ),
      );
      final Map<String, String> values = <String, String>{
        for (final SemanticsNode node in nodesBelow(semanticsRoot(tester)))
          if (node.getSemanticsData().hasFlag(SemanticsFlag.isButton))
            node.getSemanticsData().label: node.getSemanticsData().value,
      };
      expect(values['Inbox'], '24');
      expect(values['Work'], 'New');
      expect(find.descendant(of: rowOf('Work'), matching: find.text('New')), findsOneWidget);
      handle.dispose();
    });

    testWidgets('NVD-24: a destination without a label is drawn and reported; a modal drawer '
        'without a label is reported', (WidgetTester tester) async {
      final List<String> reports = collectMissingNames();
      await pumpDrawer(
        tester,
        drawerApp(
          const DrawerOwner(
            variant: TanreiNavigationDrawerVariant.modal,
            semanticLabel: '',
            children: <TanreiNavigationDrawerChild>[
              TanreiNavigationDrawerDestination(label: 'Inbox'),
              TanreiNavigationDrawerDestination(label: ''),
            ],
          ),
        ),
      );
      expect(reports, containsAll(<String>['navigation drawer', 'navigation destination']));
      expect(reports, hasLength(2));
    });

    testWidgets('guidelines: navigation drawer', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final TanreiNavigationDrawerVariant variant in TanreiNavigationDrawerVariant.core) {
        for (final TanreiThemeData theme in <TanreiThemeData>[
          TanreiThemeData.light,
          TanreiThemeData.dark,
        ]) {
          await pumpDrawer(
            tester,
            drawerApp(
              DrawerOwner(key: UniqueKey(), variant: variant),
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
  });

  group('a design system drives rendering', () {
    test('the tokens the widget reads: their default values', () {
      expect(drawerTokens.containerWidth, 280);
      expect(drawerTokens.itemContainerHeight, 44);
      expect(drawerTokens.containerGap, 4);
      expect(drawerTokens.variants.modal.containerShape, 12);
      expect(lightTheme.paint(drawerTokens.variants.standard.outlineColor), light.outlineVariant);
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": the drawer draws that system\'s width, colors and rows', (
        WidgetTester tester,
      ) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        final TanreiNavigationDrawerTokens tokens = shipped.navigationDrawer;
        await pumpDrawer(tester, drawerApp(const DrawerOwner(), theme: theme));
        expect(panelRect(tester).width, tokens.containerWidth);
        final Color container = theme.paint(tokens.variants.standard.containerColor);
        expect(panelDecoration(tester).color, container.a > 0 ? container : null);
        final TanreiNavigationDrawerConditionStateTokens selected =
            tokens.conditions.selected.enabled;
        expect(rowFillOf(tester, 'Inbox'), theme.paint(selected.itemContainerColor));
        expect(
          textStyleIn(tester, rowOf('Inbox'), 'Inbox').color,
          theme.paint(selected.itemLabelColor),
        );
        expect(
          tester.getRect(rowOf('Sent')).height,
          math.max(tokens.itemContainerHeight + tokens.containerGap, shipped.measure.targetTouch),
        );
        expect(rowDecorationOf(tester, 'Inbox').shape.smoothing, shipped.shape.cornerSmoothing);
      });
    }
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('navigation-drawer');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'standard',
        'standard-no-icons',
        'standard-disabled',
        'modal',
      ]);
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          surface: navigationDrawerGoldenSurface,
          child: fixtureNavigationDrawer(fixture),
          file: 'goldens/navigation_drawer/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: the modal drawer shows the
    // preset's width, container, corners, elevation, scrim, row height and selected row at once.
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
          surface: navigationDrawerGoldenSurface,
          child: fixtureNavigationDrawer(
            fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded),
          ),
          file: 'goldens/navigation_drawer/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
