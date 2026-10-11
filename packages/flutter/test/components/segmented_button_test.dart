import 'dart:math' as math;

import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_expressive_like.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

import '../../test_fixtures/acme_system.g.dart';
import '../harness.dart';
import '../systems.dart';
import 'fixture_golden.dart';

const TanreiSystem system = tanreiSystem;
final TanreiSegmentedButtonTokens segTokens = system.segmentedButton;
final TanreiColors light = system.schemes.light;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The stage of every fixture (SEG-14's `verify`): 400 × 96, the set at its natural width,
/// start-aligned and vertically centred; inside the `space200` padding of every baseline.
const Size stage = Size(400, 96);
const Size segGoldenSurface = Size(432, 128);

/// The fixtures' icon names, as Material Symbols code points drawn as text.
const Map<String, int> iconCodePoints = <String, int>{
  'view_list': 0xe8ef,
  'grid_view': 0xe9b0,
  'map': 0xe55b,
  'format_align_left': 0xe236,
  'format_align_center': 0xe234,
  'format_align_right': 0xe237,
};

Widget? glyph(String? name) =>
    name == null || name.isEmpty ? null : Text(String.fromCharCode(iconCodePoints[name] ?? 0xe5cc));

/// The set a fixture describes (SEG-14's `verify`), on its stage.
Widget fixtureSet(Map<String, dynamic> fixture) {
  final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
  final bool multiple = props['selection'] == 'multiple';
  return SizedBox.fromSize(
    size: stage,
    child: Align(
      alignment: AlignmentDirectional.centerStart,
      child: TanreiSegmentedButton<String>(
        multiSelectionEnabled: multiple,
        selected: multiple
            ? <String>{...(props['values'] as List<dynamic>? ?? const <dynamic>[]).cast<String>()}
            : <String>{if (props['value'] case final String value) value},
        onSelectionChanged: (_) {},
        size: TanreiSegmentedButtonSize(props['size'] as String? ?? 'medium'),
        semanticLabel: props['label'] as String? ?? '',
        segments: <TanreiSegment<String>>[
          for (final Map<String, dynamic> item
              in (fixture['items'] as List<dynamic>).cast<Map<String, dynamic>>())
            fixtureSegment(item['props'] as Map<String, dynamic>),
        ],
      ),
    ),
  );
}

TanreiSegment<String> fixtureSegment(Map<String, dynamic> props) => TanreiSegment<String>(
  value: props['value'] as String? ?? '',
  label: props['label'] as String? ?? '',
  icon: glyph(props['icon'] as String?),
  labelHidden: props['labelHidden'] == true,
  enabled: props['disabled'] != true,
);

/// Collects what the segmented button reports as ignored (SEG-12, SEG-22), and restores the
/// reporter.
List<String> collectIgnoredValues() {
  final List<String> reports = <String>[];
  final TanreiIgnoredValueReporter previous = debugTanreiReportIgnoredValue;
  debugTanreiReportIgnoredValue = (String component, String prop, String why, Widget widget) =>
      reports.add('$component $prop: $why');
  addTearDown(() => debugTanreiReportIgnoredValue = previous);
  return reports;
}

TanreiSegment<String> seg(String label, {String? value, bool enabled = true, Widget? icon}) =>
    TanreiSegment<String>(
      value: value ?? label.toLowerCase(),
      label: label,
      icon: icon,
      enabled: enabled,
    );

List<TanreiSegment<String>> range({bool monthEnabled = true}) => <TanreiSegment<String>>[
  seg('Day'),
  seg('Week'),
  seg('Month', enabled: monthEnabled),
];

/// A set whose owner stores the selection (as a product does), recording each change in
/// [changes].
class SetOwner extends StatefulWidget {
  const SetOwner({
    super.key,
    required this.initial,
    required this.segments,
    this.changes,
    this.multiple = false,
    this.size = TanreiSegmentedButtonSize.medium,
    this.semanticLabel = 'Range',
    this.store = true,
    this.width,
  });

  final Set<String> initial;
  final List<TanreiSegment<String>> segments;
  final List<Set<String>>? changes;
  final bool multiple;
  final TanreiSegmentedButtonSize size;
  final String semanticLabel;

  /// Whether the owner stores what change carries (false: the product ignores it).
  final bool store;

  /// A width the layout gives the set (null: its natural width).
  final double? width;

  @override
  State<SetOwner> createState() => SetOwnerState();
}

class SetOwnerState extends State<SetOwner> {
  late Set<String> selected = widget.initial;

  @override
  Widget build(BuildContext context) {
    final Widget set = TanreiSegmentedButton<String>(
      segments: widget.segments,
      selected: selected,
      multiSelectionEnabled: widget.multiple,
      size: widget.size,
      semanticLabel: widget.semanticLabel,
      onSelectionChanged: (Set<String> next) {
        widget.changes?.add(next);
        if (widget.store) {
          setState(() => selected = next);
        }
      },
    );
    return widget.width == null ? set : SizedBox(width: widget.width, child: set);
  }
}

Widget segApp(
  Widget child, {
  TanreiThemeData theme = lightTheme,
  bool disableAnimations = false,
  TextDirection textDirection = TextDirection.ltr,
  double textScale = 1,
}) => tanreiTestApp(
  Builder(
    builder: (BuildContext context) => MediaQuery(
      data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(textScale)),
      child: Directionality(textDirection: textDirection, child: child),
    ),
  ),
  theme: theme,
  disableAnimations: disableAnimations,
);

/// The segment whose label is [label]: the `Semantics` node of its pressable.
Finder segmentOf(String label) =>
    find.byWidgetPredicate((Widget w) => w is Semantics && w.properties.label == label).first;

Finder containerOf(String label) => find
    .descendant(
      of: segmentOf(label),
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
    .widget<Opacity>(find.descendant(of: segmentOf(label), matching: find.byType(Opacity)).first)
    .opacity;

TanreiFocusRing ringOf(WidgetTester tester, String label) => tester.widget<TanreiFocusRing>(
  find.descendant(of: segmentOf(label), matching: find.byType(TanreiFocusRing)),
);

List<TanreiControlIcon> iconsOf(WidgetTester tester, String label) => tester
    .widgetList<TanreiControlIcon>(
      find.descendant(of: segmentOf(label), matching: find.byType(TanreiControlIcon)),
    )
    .toList();

/// Whether the segment draws the check glyph, and how opaque.
double? checkOpacity(WidgetTester tester, String label) {
  final Finder check = find.descendant(of: segmentOf(label), matching: find.text(tanreiCheckGlyph));
  if (check.evaluate().isEmpty) {
    return null;
  }
  final Finder fade = find.ancestor(of: check, matching: find.byType(Opacity)).first;
  return tester.widget<Opacity>(fade).opacity;
}

RenderTanreiSegmentedSet setOf(WidgetTester tester) =>
    tester.allRenderObjects.whereType<RenderTanreiSegmentedSet>().toSet().single;

/// The set's rectangle in global coordinates.
Rect setRect(WidgetTester tester) {
  final RenderTanreiSegmentedSet set = setOf(tester);
  return set.setRect.shift(set.localToGlobal(Offset.zero));
}

String focusedLabel() {
  final BuildContext? context = FocusManager.instance.primaryFocus?.context;
  if (context == null) {
    return '';
  }
  String found = '';
  context.visitAncestorElements((Element element) {
    final Widget widget = element.widget;
    if (widget is Semantics && widget.properties.label != null) {
      found = widget.properties.label!;
      return false;
    }
    return true;
  });
  return found;
}

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

Future<TestGesture> hoverOver(WidgetTester tester, Offset at) async {
  FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
  final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
  await mouse.addPointer(location: Offset.zero);
  addTearDown(mouse.removePointer);
  await mouse.moveTo(at);
  await tester.pumpAndSettle();
  return mouse;
}

/// Tab from outside into the set: focus lands on its Tab stop.
Future<void> tabInto(WidgetTester tester) async {
  await tester.sendKeyEvent(LogicalKeyboardKey.tab);
  await tester.pumpAndSettle();
}

Future<void> press(WidgetTester tester, LogicalKeyboardKey key) async {
  await tester.sendKeyEvent(key);
  await tester.pumpAndSettle();
}

/// SEG-13, SEG-14: the height of a set of one-line labels: the size's container height, or its
/// content with the size's block padding and the set's padding where that is taller.
double expectedSetHeight(
  TanreiSegmentedButtonTokens tokens,
  TanreiSegmentedButtonSizeTokens size,
) => math.max(
  size.containerHeight,
  size.labelTypescale.lineHeight + 2 * size.containerPaddingBlock + 2 * tokens.setPadding,
);

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('selection', () {
    for (final PointerDeviceKind kind in <PointerDeviceKind>[
      PointerDeviceKind.touch,
      PointerDeviceKind.mouse,
    ]) {
      testWidgets('SEG-1: a ${kind.name} press on an unselected segment of a single choice selects '
          'it and emits change once with its value; on the selected one it changes nothing', (
        WidgetTester tester,
      ) async {
        final List<Set<String>> changes = <Set<String>>[];
        await tester.pumpWidget(
          segApp(SetOwner(initial: <String>{'week'}, segments: range(), changes: changes)),
        );
        await tester.tap(find.text('Day'), kind: kind);
        await tester.pumpAndSettle();
        expect(changes, <Set<String>>[
          <String>{'day'},
        ]);
        await tester.tap(find.text('Day'), kind: kind);
        await tester.pumpAndSettle();
        expect(changes, hasLength(1), reason: 'a single choice is never cleared by its segment');
      });
    }

    for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
      LogicalKeyboardKey.enter,
      LogicalKeyboardKey.space,
    ]) {
      testWidgets('SEG-1, SEG-19: ${key.keyLabel} on the focused segment selects it (single) or '
          'switches it (multiple), once', (WidgetTester tester) async {
        final List<Set<String>> changes = <Set<String>>[];
        await tester.pumpWidget(
          segApp(
            SetOwner(
              initial: <String>{'mon'},
              segments: <TanreiSegment<String>>[seg('Mon'), seg('Tue')],
              changes: changes,
              multiple: true,
            ),
          ),
        );
        await tabInto(tester);
        expect(focusedLabel(), 'Mon');
        await press(tester, key);
        expect(changes, <Set<String>>[<String>{}]);
        await press(tester, key);
        expect(changes.last, <String>{'mon'});
        expect(changes, hasLength(2));
      });
    }

    testWidgets('SEG-2: in a multiple choice a press adds the segment\'s value or removes it, and '
        'emits change once with the new values, which may become empty', (
      WidgetTester tester,
    ) async {
      final List<Set<String>> changes = <Set<String>>[];
      await tester.pumpWidget(
        segApp(
          SetOwner(
            initial: <String>{'mon', 'tue'},
            segments: <TanreiSegment<String>>[seg('Mon'), seg('Tue'), seg('Wed')],
            changes: changes,
            multiple: true,
          ),
        ),
      );
      await tester.tap(find.text('Wed'));
      await tester.pumpAndSettle();
      expect(changes.last, <String>{'mon', 'tue', 'wed'});
      await tester.tap(find.text('Mon'));
      await tester.pumpAndSettle();
      expect(changes.last, <String>{'tue', 'wed'});
      await tester.tap(find.text('Tue'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Wed'));
      await tester.pumpAndSettle();
      expect(changes.last, isEmpty);
      expect(changes, hasLength(4));
    });

    testWidgets('SEG-3: a disabled segment is not selected or cleared and emits nothing, is '
        'skipped by the arrow keys, is never the Tab stop and is exposed as disabled', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<Set<String>> changes = <Set<String>>[];
      await tester.pumpWidget(
        segApp(
          SetOwner(
            initial: <String>{'month'},
            segments: range(monthEnabled: false),
            changes: changes,
          ),
        ),
      );
      await tester.tap(find.text('Month'));
      await tester.pumpAndSettle();
      expect(changes, isEmpty);
      expect(
        tester.getSemantics(segmentOf('Month')),
        matchesSemantics(
          label: 'Month',
          isInMutuallyExclusiveGroup: true,
          hasCheckedState: true,
          isChecked: true,
          hasEnabledState: true,
          isEnabled: false,
          hasTapAction: false,
        ),
      );
      // The selected segment is disabled: the Tab stop is the first enabled one.
      await tabInto(tester);
      expect(focusedLabel(), 'Day');
      await press(tester, LogicalKeyboardKey.arrowRight);
      expect(focusedLabel(), 'Week');
      await press(tester, LogicalKeyboardKey.arrowRight);
      expect(focusedLabel(), 'Day', reason: 'Month is skipped and the keys wrap');

      // Multiple: the same.
      final List<Set<String>> multiple = <Set<String>>[];
      await tester.pumpWidget(
        segApp(
          SetOwner(
            key: UniqueKey(),
            initial: <String>{},
            segments: range(monthEnabled: false),
            changes: multiple,
            multiple: true,
          ),
        ),
      );
      await tester.tap(find.text('Month'));
      await tester.pumpAndSettle();
      expect(multiple, isEmpty);
      handle.dispose();
    });

    testWidgets('SEG-12: the segment whose value the selection holds draws the selected condition '
        'and every other the unselected one', (WidgetTester tester) async {
      await tester.pumpWidget(segApp(SetOwner(initial: <String>{'week'}, segments: range())));
      final TanreiSegmentedButtonConditions conditions = segTokens.conditions;
      expect(fillOf(tester, 'Week'), lightTheme.paint(conditions.selected.enabled.containerColor));
      expect(fillOf(tester, 'Day').a, 0);
      expect(textColor(tester, 'Week'), lightTheme.paint(conditions.selected.enabled.labelColor));
      expect(textColor(tester, 'Day'), lightTheme.paint(conditions.unselected.enabled.labelColor));
    });

    testWidgets('SEG-12: a value that names no segment selects nothing, and an empty or repeated '
        'value is rendered, the first segment with it being the one it selects; each reported '
        'once', (WidgetTester tester) async {
      final List<String> reports = collectIgnoredValues();
      await tester.pumpWidget(segApp(SetOwner(initial: <String>{'year'}, segments: range())));
      expect(fillOf(tester, 'Day').a, 0);
      expect(fillOf(tester, 'Week').a, 0);
      expect(fillOf(tester, 'Month').a, 0);
      expect(reports, <Matcher>[contains('"year" names no segment')]);
      await tester.pump();
      expect(reports, hasLength(1), reason: 'reported once, not on every build');

      reports.clear();
      await tester.pumpWidget(
        segApp(
          SetOwner(
            key: UniqueKey(),
            initial: <String>{'a'},
            segments: <TanreiSegment<String>>[
              seg('First', value: 'a'),
              seg('Second', value: 'a'),
              seg('Third', value: ''),
            ],
          ),
        ),
      );
      final Color selected = lightTheme.paint(segTokens.conditions.selected.enabled.containerColor);
      expect(fillOf(tester, 'First'), selected);
      expect(fillOf(tester, 'Second').a, 0);
      expect(find.text('Third'), findsOneWidget);
      expect(reports, hasLength(2));
      expect(reports, contains(contains('Two segments have the value "a"')));
      expect(reports, contains(contains('("Third") has no value')));
    });
  });

  group('keyboard', () {
    testWidgets('SEG-18: a single choice is one Tab stop, the selected segment; Right and Down '
        'Arrow move to the next segment and select it, Left and Up Arrow to the previous one, '
        'wrapping, Home and End to the ends', (WidgetTester tester) async {
      final List<Set<String>> changes = <Set<String>>[];
      await tester.pumpWidget(
        segApp(
          Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              SetOwner(initial: <String>{'week'}, segments: range(), changes: changes),
              TanreiButton(onPressed: () {}, child: const Text('After')),
            ],
          ),
        ),
      );
      await tabInto(tester);
      expect(focusedLabel(), 'Week');
      await press(tester, LogicalKeyboardKey.arrowRight);
      expect(focusedLabel(), 'Month');
      expect(changes.last, <String>{'month'});
      await press(tester, LogicalKeyboardKey.arrowDown);
      expect(focusedLabel(), 'Day', reason: 'wraps');
      expect(changes.last, <String>{'day'});
      await press(tester, LogicalKeyboardKey.arrowUp);
      expect(focusedLabel(), 'Month');
      await press(tester, LogicalKeyboardKey.arrowLeft);
      expect(focusedLabel(), 'Week');
      await press(tester, LogicalKeyboardKey.home);
      expect(focusedLabel(), 'Day');
      await press(tester, LogicalKeyboardKey.end);
      expect(focusedLabel(), 'Month');
      expect(changes.last, <String>{'month'});
      // One Tab stop: Tab leaves the set.
      await press(tester, LogicalKeyboardKey.tab);
      expect(focusedLabel(), isNot(anyOf('Day', 'Week', 'Month')));
      await tester.sendKeyDownEvent(LogicalKeyboardKey.shiftLeft);
      await press(tester, LogicalKeyboardKey.tab);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.shiftLeft);
      expect(focusedLabel(), 'Month', reason: 'back to the selected segment');
    });

    testWidgets('SEG-18: with nothing selected the Tab stop is the first enabled segment', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        segApp(
          SetOwner(
            initial: <String>{},
            segments: <TanreiSegment<String>>[
              seg('Day', enabled: false),
              seg('Week'),
              seg('Month'),
            ],
          ),
        ),
      );
      await tabInto(tester);
      expect(focusedLabel(), 'Week');
    });

    testWidgets('SEG-18, SEG-19, SEG-21: in a right-to-left layout Left Arrow moves to the next '
        'segment and Right Arrow to the previous; Down and Up keep their order', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        segApp(
          SetOwner(initial: <String>{'day'}, segments: range()),
          textDirection: TextDirection.rtl,
        ),
      );
      await tabInto(tester);
      expect(focusedLabel(), 'Day');
      await press(tester, LogicalKeyboardKey.arrowLeft);
      expect(focusedLabel(), 'Week');
      await press(tester, LogicalKeyboardKey.arrowRight);
      expect(focusedLabel(), 'Day');
      await press(tester, LogicalKeyboardKey.arrowDown);
      expect(focusedLabel(), 'Week');
    });

    testWidgets('SEG-19: a multiple choice is one Tab stop — the segment focused last, else the '
        'first selected, else the first enabled; the arrow keys move without changing the '
        'selection', (WidgetTester tester) async {
      final List<Set<String>> changes = <Set<String>>[];
      Widget build(Set<String> initial) => segApp(
        Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            SetOwner(
              key: ValueKey<Set<String>>(initial),
              initial: initial,
              segments: <TanreiSegment<String>>[seg('Mon'), seg('Tue'), seg('Wed')],
              changes: changes,
              multiple: true,
            ),
            TanreiButton(onPressed: () {}, child: const Text('After')),
          ],
        ),
      );
      await tester.pumpWidget(build(<String>{'tue', 'wed'}));
      await tabInto(tester);
      expect(focusedLabel(), 'Tue', reason: 'the first selected segment');
      await press(tester, LogicalKeyboardKey.arrowRight);
      expect(focusedLabel(), 'Wed');
      await press(tester, LogicalKeyboardKey.arrowRight);
      expect(focusedLabel(), 'Mon');
      await press(tester, LogicalKeyboardKey.end);
      await press(tester, LogicalKeyboardKey.home);
      expect(focusedLabel(), 'Mon');
      expect(changes, isEmpty, reason: 'moving never changes the selection');
      await press(tester, LogicalKeyboardKey.tab);
      expect(focusedLabel(), isNot('Mon'));
      await tester.sendKeyDownEvent(LogicalKeyboardKey.shiftLeft);
      await press(tester, LogicalKeyboardKey.tab);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.shiftLeft);
      expect(focusedLabel(), 'Mon', reason: 'the segment that had focus last');

      await tester.pumpWidget(build(<String>{}));
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      await tabInto(tester);
      expect(focusedLabel(), 'Mon', reason: 'nothing selected: the first enabled segment');
    });
  });

  group('states', () {
    testWidgets('SEG-4: under the acme system hovered, focused and pressed draw their own tokens '
        'of the segment\'s condition; focus from a pointer does not draw focused', (
      WidgetTester tester,
    ) async {
      const TanreiThemeData acme = TanreiThemeData(system: acmeSystem);
      final TanreiSegmentedButtonConditions conditions = acmeSystem.segmentedButton.conditions;
      await tester.pumpWidget(
        segApp(
          SetOwner(initial: <String>{'week'}, segments: range(), store: false),
          theme: acme,
        ),
      );
      final TestGesture mouse = await hoverOver(tester, tester.getCenter(find.text('Week')));
      expect(fillOf(tester, 'Week'), acme.paint(conditions.selected.hovered.containerColor));
      await mouse.moveTo(tester.getCenter(find.text('Day')));
      await tester.pumpAndSettle();
      expect(fillOf(tester, 'Day'), acme.paint(conditions.unselected.hovered.containerColor));
      expect(fillOf(tester, 'Week'), acme.paint(conditions.selected.enabled.containerColor));
      await mouse.moveTo(Offset.zero);
      await tester.pumpAndSettle();

      await tabInto(tester);
      expect(fillOf(tester, 'Week'), acme.paint(conditions.selected.focused.containerColor));
      expect(textColor(tester, 'Week'), acme.paint(conditions.selected.focused.labelColor));

      final TestGesture touch = await tester.startGesture(tester.getCenter(find.text('Day')));
      await tester.pump();
      expect(fillOf(tester, 'Day'), acme.paint(conditions.unselected.pressed.containerColor));
      await touch.up();
      await tester.pumpAndSettle();
      // The pointer moved focus to Day without the highlight: not drawn focused.
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      await tester.tap(find.text('Month'));
      await tester.pumpAndSettle();
      expect(fillOf(tester, 'Month'), acme.paint(conditions.unselected.enabled.containerColor));
      expect(ringOf(tester, 'Month').visible, isFalse);
    });

    testWidgets('SEG-5: keyboard focus shows the ring inside the segment at once, inside the '
        'set\'s outline; focus from a pointer shows none', (WidgetTester tester) async {
      await tester.pumpWidget(segApp(SetOwner(initial: <String>{'week'}, segments: range())));
      await tabInto(tester);
      final TanreiFocusRing ring = ringOf(tester, 'Week');
      expect(ring.visible, isTrue);
      expect(ring.inside, isTrue);
      // Inside the outline, which lies on the segment's top and bottom edges.
      final Rect ringBox = tester.getRect(
        find.descendant(of: segmentOf('Week'), matching: find.byType(TanreiFocusRing)),
      );
      final Rect segment = tester.getRect(containerOf('Week'));
      expect(ringBox.top - segment.top, segTokens.outlineWidth);
      expect(segment.bottom - ringBox.bottom, segTokens.outlineWidth);
      // No animation: shown in the first frame.
      await press(tester, LogicalKeyboardKey.arrowRight);
      expect(ringOf(tester, 'Month').visible, isTrue);
      expect(ringOf(tester, 'Week').visible, isFalse);

      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      await tester.tap(find.text('Day'));
      await tester.pumpAndSettle();
      expect(ringOf(tester, 'Day').visible, isFalse);
    });

    testWidgets('SEG-6: the set is extended to the touch target above and below, a press there '
        'goes to the segment in that column, and each segment is at least a target wide', (
      WidgetTester tester,
    ) async {
      final List<Set<String>> changes = <Set<String>>[];
      await tester.pumpWidget(
        segApp(
          SetOwner(
            initial: <String>{'a'},
            segments: <TanreiSegment<String>>[seg('A'), seg('B')],
            changes: changes,
            size: TanreiSegmentedButtonSize.small,
          ),
        ),
      );
      final double target = system.measure.targetTouch;
      final Rect set = setRect(tester);
      expect(set.height, segTokens.sizes.small.containerHeight, reason: 'visual size unchanged');
      final Rect box = tester.getRect(find.byType(TanreiSegmentedButton<String>));
      expect(box.height, target);
      final Rect b = tester.getRect(containerOf('B'));
      expect(b.width, greaterThanOrEqualTo(target));
      expect(tester.getRect(containerOf('A')).width, b.width);
      // Above the set, over B.
      await tester.tapAt(Offset(b.center.dx, box.top + 1));
      await tester.pumpAndSettle();
      expect(changes, <Set<String>>[
        <String>{'b'},
      ]);
      // Below the set, over A.
      await tester.tapAt(Offset(tester.getRect(containerOf('A')).center.dx, box.bottom - 1));
      await tester.pumpAndSettle();
      expect(changes.last, <String>{'a'});
    });

    testWidgets('SEG-7: a disabled segment draws the disabled tokens of its condition; the outline '
        'and the dividers keep their colors', (WidgetTester tester) async {
      await tester.pumpWidget(
        segApp(SetOwner(initial: <String>{'month'}, segments: range(monthEnabled: false))),
      );
      final TanreiSegmentedButtonConditions conditions = segTokens.conditions;
      expect(
        fillOf(tester, 'Month'),
        lightTheme.paint(conditions.selected.disabled.containerColor),
      );
      expect(textColor(tester, 'Month'), lightTheme.paint(conditions.selected.disabled.labelColor));
      expect(opacityOf(tester, 'Month'), segTokens.disabled.opacity);
      await tester.pumpWidget(
        segApp(
          SetOwner(
            key: UniqueKey(),
            initial: <String>{'day'},
            segments: range(monthEnabled: false),
          ),
        ),
      );
      expect(fillOf(tester, 'Month').a, 0, reason: 'a disabled unselected segment stays clear');
      expect(
        textColor(tester, 'Month'),
        lightTheme.paint(conditions.unselected.disabled.labelColor),
      );
      final RenderTanreiSegmentedSet set = setOf(tester);
      expect(
        set,
        paints
          ..rect(color: lightTheme.paint(segTokens.dividerColor))
          ..rect(color: lightTheme.paint(segTokens.dividerColor))
          ..drrect(color: lightTheme.paint(segTokens.outlineColor)),
      );
    });

    testWidgets('SEG-8: a size the system does not have renders as medium and is reported', (
      WidgetTester tester,
    ) async {
      final List<String> reports = collectUnknownValues();
      await tester.pumpWidget(
        segApp(
          SetOwner(
            initial: <String>{'week'},
            segments: range(),
            size: const TanreiSegmentedButtonSize('huge'),
          ),
        ),
      );
      expect(setRect(tester).height, segTokens.sizes.medium.containerHeight);
      expect(reports, contains('segmented-button size "huge" -> medium'));
    });

    testWidgets('SEG-23: a change of state animates the colors over '
        'comp.segmented-button.motion.state-duration, and at once where motion is reduced', (
      WidgetTester tester,
    ) async {
      final TanreiSegmentedButtonConditions conditions = segTokens.conditions;
      final Color rest = lightTheme.paint(conditions.unselected.enabled.containerColor);
      final Color hovered = lightTheme.paint(conditions.unselected.hovered.containerColor);
      final Duration duration = tanreiDuration(segTokens.motionStateDuration);
      for (final bool reduced in <bool>[false, true]) {
        await tester.pumpWidget(
          segApp(
            SetOwner(key: UniqueKey(), initial: <String>{'week'}, segments: range()),
            disableAnimations: reduced,
          ),
        );
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
        await mouse.addPointer(location: Offset.zero);
        await tester.pump();
        await mouse.moveTo(tester.getCenter(find.text('Day')));
        await tester.pump();
        await tester.pump(duration ~/ 2);
        final Color mid = fillOf(tester, 'Day');
        if (reduced) {
          expect(mid, hovered);
        } else {
          expect(mid, isNot(hovered));
          expect(mid, isNot(rest));
        }
        await tester.pump(duration);
        expect(fillOf(tester, 'Day'), hovered);
        await mouse.removePointer();
        await tester.pumpAndSettle();
      }
    });
  });

  group('press hold (SEG-9)', () {
    final Duration hold = tanreiDuration(system.motion.duration.pressHold);
    final Color pressedFill = lightTheme.paint(
      segTokens.conditions.unselected.pressed.containerColor,
    );
    const Duration tick = Duration(milliseconds: 1);

    for (final PointerDeviceKind kind in <PointerDeviceKind>[
      PointerDeviceKind.touch,
      PointerDeviceKind.mouse,
    ]) {
      testWidgets('SEG-9: a ${kind.name} press shows the pressed state without delay and keeps it '
          'for the press-hold duration', (WidgetTester tester) async {
        await tester.pumpWidget(
          segApp(SetOwner(initial: <String>{'week'}, segments: range(), store: false)),
        );
        await tester.tap(find.text('Day'), kind: kind);
        await tester.pump();
        expect(fillOf(tester, 'Day'), pressedFill);
        await tester.pump(hold - tick);
        expect(fillOf(tester, 'Day'), pressedFill);
        await tester.pump(tick);
        await tester.pumpAndSettle();
        expect(fillOf(tester, 'Day'), isNot(pressedFill));
      });
    }

    for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
      LogicalKeyboardKey.enter,
      LogicalKeyboardKey.space,
    ]) {
      testWidgets('SEG-9: ${key.keyLabel} shows the pressed state at once and for the press-hold '
          'duration', (WidgetTester tester) async {
        await tester.pumpWidget(segApp(SetOwner(initial: <String>{'week'}, segments: range())));
        await tabInto(tester);
        final Color focused = fillOf(tester, 'Week');
        final Color pressed = lightTheme.paint(
          segTokens.conditions.selected.pressed.containerColor,
        );
        await tester.sendKeyEvent(key);
        await tester.pump();
        expect(fillOf(tester, 'Week'), pressed);
        await tester.pump(hold - tick);
        expect(fillOf(tester, 'Week'), pressed);
        await tester.pump(tick);
        await tester.pumpAndSettle();
        expect(fillOf(tester, 'Week'), focused);
      });
    }
  });

  group('choices of kind', () {
    testWidgets('SEG-10: overlay (default) fills the pressed container at once; ripple (m3-like) '
        'grows it from the point of contact over comp.segmented-button.motion.feedback-duration; '
        'dim (cupertino) dims the segment and draws no state layer', (WidgetTester tester) async {
      Widget set(TanreiThemeData theme) => segApp(
        SetOwner(key: UniqueKey(), initial: <String>{'week'}, segments: range(), store: false),
        theme: theme,
      );
      await tester.pumpWidget(set(lightTheme));
      TestGesture touch = await tester.startGesture(tester.getCenter(find.text('Day')));
      await tester.pump();
      expect(
        fillOf(tester, 'Day'),
        lightTheme.paint(segTokens.conditions.unselected.pressed.containerColor),
      );
      expect(decorationOf(tester, 'Day').ripple, isNull);
      await touch.up();
      await tester.pumpAndSettle();

      const TanreiThemeData m3 = TanreiThemeData(system: m3LikeSystem);
      await tester.pumpWidget(set(m3));
      final Rect box = tester.getRect(containerOf('Day'));
      const Offset contact = Offset(20, 10);
      touch = await tester.startGesture(box.topLeft + contact);
      await tester.pump();
      final TanreiRipple ripple = decorationOf(tester, 'Day').ripple!;
      expect(ripple.origin, contact);
      expect(
        ripple.color,
        m3.paint(m3LikeSystem.segmentedButton.conditions.unselected.pressed.containerColor),
      );
      await tester.pump(tanreiDuration(m3LikeSystem.segmentedButton.motionFeedbackDuration) ~/ 2);
      expect(
        decorationOf(tester, 'Day').ripple!.progress,
        moreOrLessEquals(m3LikeSystem.segmentedButton.motionStateEasing.toCurve().transform(0.5)),
      );
      await touch.up();
      await tester.pumpAndSettle();
      expect(decorationOf(tester, 'Day').ripple, isNull);

      // A press in the target space above the set grows from the center.
      final Rect whole = tester.getRect(find.byType(TanreiSegmentedButton<String>));
      touch = await tester.startGesture(Offset(box.center.dx, whole.top + 1));
      await tester.pump();
      expect(decorationOf(tester, 'Day').ripple!.origin, isNull);
      await touch.up();
      await tester.pumpAndSettle();

      await tester.pumpWidget(set(const TanreiThemeData(system: cupertinoSystem)));
      touch = await tester.startGesture(tester.getCenter(find.text('Day')));
      await tester.pump();
      expect(opacityOf(tester, 'Day'), cupertinoSystem.segmentedButton.pressed.opacity);
      expect(cupertinoSystem.segmentedButton.pressed.opacity, lessThan(1));
      expect(fillOf(tester, 'Day').a, 0);
      await touch.up();
      await tester.pumpAndSettle();
    });

    for (final TanreiPressedFeedback feedback in <TanreiPressedFeedback>[
      TanreiPressedFeedback.ripple,
      TanreiPressedFeedback.dim,
      TanreiPressedFeedback.none,
    ]) {
      testWidgets(
        'SEG-10: under ${feedback.name} '
        '${feedback == TanreiPressedFeedback.none ? 'every part stays with the state under the press' : 'only the container color stays with the state under the press'}',
        (WidgetTester tester) async {
          final TanreiSegmentedButtonConditionTokens unselected = segTokens.conditions.unselected;
          final TanreiSystem of = system.copyWith(
            behavior: system.behavior.copyWith(pressedFeedback: feedback),
            segmentedButton: segTokens.copyWith(
              pressed: segTokens.pressed.copyWith(opacity: 0.5),
              conditions: segTokens.conditions.copyWith(
                unselected: unselected.copyWith(
                  pressed: unselected.pressed.copyWith(
                    containerColor: const TanreiPaint.literal(Color(0xFF112233)),
                    labelColor: const TanreiPaint.literal(Color(0xFF445566)),
                  ),
                ),
              ),
            ),
          );
          await tester.pumpWidget(
            segApp(
              SetOwner(initial: <String>{'week'}, segments: range(), store: false),
              theme: TanreiThemeData(system: of),
            ),
          );
          final Color resting = textColor(tester, 'Day');
          final TestGesture touch = await tester.startGesture(tester.getCenter(find.text('Day')));
          await tester.pump();
          expect(fillOf(tester, 'Day').a, 0);
          if (feedback == TanreiPressedFeedback.none) {
            expect(textColor(tester, 'Day'), resting);
            expect(opacityOf(tester, 'Day'), 1);
          } else {
            expect(textColor(tester, 'Day'), const Color(0xFF445566));
            expect(opacityOf(tester, 'Day'), 0.5);
            expect(
              decorationOf(tester, 'Day').ripple?.color,
              feedback == TanreiPressedFeedback.ripple ? const Color(0xFF112233) : null,
            );
          }
          await touch.up();
          await tester.pumpAndSettle();
        },
      );
    }

    testWidgets('SEG-11: the corner smoothing of the system eases the segments and the set; the '
        'focus style draws a ring (default) or a glow (acme)', (WidgetTester tester) async {
      Future<List<Paint>> focusedStrokes(TanreiSystem of) async {
        await tester.pumpWidget(
          segApp(
            SetOwner(key: UniqueKey(), initial: <String>{'day'}, segments: range()),
            theme: TanreiThemeData(system: of),
          ),
        );
        await tabInto(tester);
        final List<Paint> found = <Paint>[];
        expect(
          find.descendant(of: segmentOf('Day'), matching: find.byType(TanreiFocusRing)),
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
      expect(decorationOf(tester, 'Day').shape.smoothing, 0);
      expect(ring, isNotEmpty);
      expect(ring.every((Paint p) => p.maskFilter == null), isTrue);
      final List<Paint> glow = await focusedStrokes(acmeSystem);
      expect(glow, isNotEmpty);
      expect(glow.every((Paint p) => p.maskFilter != null), isTrue);
      await focusedStrokes(cupertinoSystem);
      expect(decorationOf(tester, 'Day').shape.smoothing, cupertinoSystem.shape.cornerSmoothing);
      expect(cupertinoSystem.shape.cornerSmoothing, greaterThan(0));
    });
  });

  group('layout', () {
    testWidgets('SEG-13: the set is the container height of its size, filled with set.color, '
        'outlined inside its edge; the first and last segments\' outer corners are the set\'s less '
        'its padding and every other corner is container.shape', (WidgetTester tester) async {
      for (final TanreiSystem of in <TanreiSystem>[system, cupertinoSystem]) {
        final TanreiSegmentedButtonTokens tokens = of.segmentedButton;
        final TanreiThemeData theme = TanreiThemeData(system: of);
        await tester.pumpWidget(
          segApp(
            SetOwner(key: UniqueKey(), initial: <String>{'week'}, segments: range()),
            theme: theme,
          ),
        );
        final Rect set = setRect(tester);
        expect(set.height, expectedSetHeight(tokens, tokens.sizes.medium), reason: of.id);
        final Rect day = tester.getRect(containerOf('Day'));
        expect(day.left - set.left, tokens.setPadding, reason: of.id);
        expect(day.top - set.top, tokens.setPadding, reason: of.id);
        final double outer = math.max(0, tokens.setShape - tokens.setPadding);
        final TanreiCornerRadii first = decorationOf(tester, 'Day').shape.radii;
        expect(first.topLeft, outer, reason: of.id);
        expect(first.bottomLeft, outer, reason: of.id);
        expect(first.topRight, tokens.containerShape, reason: of.id);
        final TanreiCornerRadii middle = decorationOf(tester, 'Week').shape.radii;
        expect(middle, TanreiCornerRadii.all(tokens.containerShape), reason: of.id);
        final TanreiCornerRadii last = decorationOf(tester, 'Month').shape.radii;
        expect(last.topRight, outer, reason: of.id);
        expect(last.topLeft, tokens.containerShape, reason: of.id);
      }
      // The set's fill (cupertino's track) and the outline (the default's) are drawn by the set.
      expect(
        setOf(tester),
        paints..path(
          color: const TanreiThemeData(
            system: cupertinoSystem,
          ).paint(cupertinoSystem.segmentedButton.setColor),
        ),
      );
    });

    testWidgets('SEG-13: a segment clips its fill and ripple to its own shape', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        segApp(
          SetOwner(initial: <String>{'week'}, segments: range(), store: false),
          theme: const TanreiThemeData(system: m3LikeSystem),
        ),
      );
      final TestGesture touch = await tester.startGesture(tester.getCenter(find.text('Day')));
      await tester.pump(const Duration(milliseconds: 200));
      final TanreiContainerDecoration decoration = decorationOf(tester, 'Day');
      expect(decoration.ripple, isNotNull);
      // The pill end of m3-like's first segment: the ripple is cleared outside its shape.
      final Rect box = tester.getRect(containerOf('Day'));
      final Path clip = decoration.getClipPath(Offset.zero & box.size, TextDirection.ltr);
      expect(clip.contains(const Offset(1, 1)), isFalse);
      expect(clip.contains(box.size.center(Offset.zero)), isTrue);
      await touch.up();
      await tester.pumpAndSettle();
    });

    testWidgets('SEG-14: every segment is as wide as the widest one\'s content measured as if '
        'selected, so selecting never changes a width', (WidgetTester tester) async {
      await tester.pumpWidget(
        segApp(
          SetOwner(
            initial: <String>{'a'},
            segments: <TanreiSegment<String>>[seg('A'), seg('Longer'), seg('B')],
          ),
        ),
      );
      final TanreiSegmentedButtonSizeTokens medium = segTokens.sizes.medium;
      final double label = tester.getSize(find.text('Longer')).width;
      final double expected =
          medium.containerPaddingInline * 2 + medium.checkSize + medium.containerGap + label;
      final Map<String, double> before = <String, double>{
        for (final String l in <String>['A', 'Longer', 'B'])
          l: tester.getSize(containerOf(l)).width,
      };
      expect(before.values.toSet(), <double>{expected});
      await tester.tap(find.text('Longer'));
      await tester.pumpAndSettle();
      for (final String l in <String>['A', 'Longer', 'B']) {
        expect(tester.getSize(containerOf(l)).width, before[l]);
      }
    });

    testWidgets('SEG-14: given more width the segments divide it equally; given less, labels wrap '
        'and every segment grows to the tallest', (WidgetTester tester) async {
      await tester.pumpWidget(
        segApp(SetOwner(initial: <String>{'day'}, segments: range(), width: 390)),
      );
      final double divider = segTokens.dividerWidth;
      final double each = (390 - 2 * divider) / 3;
      for (final String l in <String>['Day', 'Week', 'Month']) {
        expect(tester.getSize(containerOf(l)).width, moreOrLessEquals(each));
      }
      await tester.pumpWidget(
        segApp(
          SetOwner(
            key: UniqueKey(),
            initial: <String>{'day'},
            segments: <TanreiSegment<String>>[seg('Day'), seg('A rather long label')],
            width: 200,
          ),
        ),
      );
      final Size day = tester.getSize(containerOf('Day'));
      final Size long = tester.getSize(containerOf('A rather long label'));
      expect(day.width, moreOrLessEquals((200 - divider) / 2));
      expect(day.height, long.height);
      expect(long.height, greaterThan(segTokens.sizes.medium.containerHeight));
      final Rect text = tester.getRect(find.text('A rather long label'));
      expect(
        text.top - tester.getRect(containerOf('A rather long label')).top,
        greaterThanOrEqualTo(segTokens.sizes.medium.containerPaddingBlock),
      );
      expect(tester.takeException(), isNull);
    });

    testWidgets('SEG-15: the content is centred, the label in the label style and color of its '
        'size, condition and state, the icon at the icon size with the family of its condition', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        segApp(
          SetOwner(
            initial: <String>{'grid'},
            segments: <TanreiSegment<String>>[
              seg('List', icon: glyph('view_list')),
              seg('Grid', icon: glyph('grid_view')),
            ],
            size: TanreiSegmentedButtonSize.large,
          ),
        ),
      );
      final TanreiSegmentedButtonSizeTokens large = segTokens.sizes.large;
      expect(textStyleOf(tester, 'List').fontSize, large.labelTypescale.size);
      final TanreiControlIcon icon = iconsOf(tester, 'List').single;
      expect(icon.size, large.iconSize);
      expect(icon.selected, isFalse);
      expect(icon.color, lightTheme.paint(segTokens.conditions.unselected.enabled.iconColor));
      final Rect box = tester.getRect(containerOf('List'));
      final Rect content = tester.getRect(
        find.descendant(of: segmentOf('List'), matching: find.byType(Row)).first,
      );
      expect(content.center.dx, moreOrLessEquals(box.center.dx, epsilon: 0.5));
    });

    testWidgets('SEG-16: a selected segment draws the check before its label, in place of its '
        'icon; an icon-only segment keeps its filled icon and no check', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        segApp(
          SetOwner(
            initial: <String>{'grid', 'b'},
            multiple: true,
            segments: <TanreiSegment<String>>[
              seg('List', icon: glyph('view_list')),
              seg('Grid', icon: glyph('grid_view')),
              seg('B'),
              const TanreiSegment<String>(
                value: 'center',
                label: 'Center',
                icon: Text('C'),
                labelHidden: true,
              ),
            ],
          ),
        ),
      );
      expect(checkOpacity(tester, 'Grid'), 1);
      expect(checkOpacity(tester, 'List'), isNull);
      expect(checkOpacity(tester, 'B'), 1);
      final TanreiControlIcon check = iconsOf(tester, 'B').single;
      expect(check.size, segTokens.sizes.medium.checkSize);
      expect(check.selected, isTrue);
      expect(check.color, lightTheme.paint(segTokens.conditions.selected.enabled.iconColor));
      // The check comes before the label.
      expect(
        tester.getCenter(find.text(tanreiCheckGlyph).last).dx,
        lessThan(tester.getCenter(find.text('B')).dx),
      );
      // Icon-only, selected: its icon, filled, and no check.
      await tester.tap(find.bySemanticsLabel('Center'));
      await tester.pumpAndSettle();
      expect(checkOpacity(tester, 'Center'), isNull);
      expect(iconsOf(tester, 'Center').single.selected, isTrue);
    });

    testWidgets('SEG-16: with a check size of 0 no check is drawn and no room is reserved, and the '
        'icon stays', (WidgetTester tester) async {
      const TanreiThemeData cupertino = TanreiThemeData(system: cupertinoSystem);
      final TanreiSegmentedButtonSizeTokens medium = cupertinoSystem.segmentedButton.sizes.medium;
      expect(medium.checkSize, 0);
      await tester.pumpWidget(
        segApp(
          SetOwner(
            initial: <String>{'b', 'grid'},
            multiple: true,
            segments: <TanreiSegment<String>>[
              seg('B'),
              seg('Grid', icon: glyph('grid_view')),
            ],
          ),
          theme: cupertino,
        ),
      );
      expect(checkOpacity(tester, 'B'), isNull);
      expect(iconsOf(tester, 'Grid').single.selected, isTrue);
      final double label = tester.getSize(find.text('Grid')).width;
      expect(
        tester.getSize(containerOf('B')).width,
        medium.containerPaddingInline * 2 + medium.iconSize + medium.containerGap + label,
      );
    });

    testWidgets('SEG-16: becoming selected shows the check and changes the colors over '
        'comp.segmented-button.motion.selection-duration, and at once where motion is reduced', (
      WidgetTester tester,
    ) async {
      final Duration duration = tanreiDuration(segTokens.motionSelectionDuration);
      for (final bool reduced in <bool>[false, true]) {
        await tester.pumpWidget(
          segApp(
            SetOwner(key: UniqueKey(), initial: <String>{'day'}, segments: range()),
            disableAnimations: reduced,
          ),
        );
        await tester.tap(find.text('Week'));
        await tester.pump();
        await tester.pump(duration ~/ 3);
        final double? shown = checkOpacity(tester, 'Week');
        if (reduced) {
          expect(shown, 1);
        } else {
          expect(shown, isNotNull);
          expect(shown, greaterThan(0));
          expect(shown, lessThan(1));
        }
        await tester.pumpAndSettle();
        expect(checkOpacity(tester, 'Week'), 1);
        expect(checkOpacity(tester, 'Day'), isNull);
      }
    });

    testWidgets('SEG-17: a divider of divider.width in divider.color between each two segments, '
        'from the set\'s top padding to its bottom padding, in its color whatever the states', (
      WidgetTester tester,
    ) async {
      for (final TanreiSystem of in <TanreiSystem>[system, cupertinoSystem]) {
        final TanreiSegmentedButtonTokens tokens = of.segmentedButton;
        await tester.pumpWidget(
          segApp(
            SetOwner(
              key: UniqueKey(),
              initial: <String>{'week'},
              segments: range(monthEnabled: false),
            ),
            theme: TanreiThemeData(system: of),
          ),
        );
        final RenderTanreiSegmentedSet set = setOf(tester);
        final List<Rect> dividers = set.dividerRects;
        expect(dividers, hasLength(2));
        final Rect local = set.setRect;
        for (final Rect d in dividers) {
          expect(d.width, tokens.dividerWidth);
          expect(d.top, local.top + tokens.setPadding);
          expect(d.bottom, local.bottom - tokens.setPadding);
        }
        final Offset origin = set.localToGlobal(Offset.zero);
        expect(dividers.first.left + origin.dx, tester.getRect(containerOf('Day')).right);
        expect(dividers.first.right + origin.dx, tester.getRect(containerOf('Week')).left);
      }
    });

    testWidgets('SEG-21: in a right-to-left layout the segments start from the right, the glyph is '
        'right of the label, and a ripple grows from the point of contact', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        segApp(
          SetOwner(initial: <String>{'day'}, segments: range(), store: false),
          textDirection: TextDirection.rtl,
          theme: const TanreiThemeData(system: m3LikeSystem),
        ),
      );
      final Rect day = tester.getRect(containerOf('Day'));
      final Rect month = tester.getRect(containerOf('Month'));
      expect(day.left, greaterThan(month.left));
      // The first segment's outer corners are on its right.
      final TanreiCornerRadii first = decorationOf(tester, 'Day').shape.radii;
      expect(first.topRight, greaterThan(first.topLeft));
      expect(
        tester.getCenter(find.text(tanreiCheckGlyph)).dx,
        greaterThan(tester.getCenter(find.text('Day')).dx),
      );
      const Offset contact = Offset(12, 8);
      final TestGesture touch = await tester.startGesture(
        tester.getRect(containerOf('Week')).topLeft + contact,
      );
      await tester.pump();
      expect(decorationOf(tester, 'Week').ripple!.origin, contact);
      await touch.up();
      await tester.pumpAndSettle();
    });

    testWidgets('SEG-22: an empty segment label, a hidden label without an icon, an empty set '
        'label and fewer than two or more than five segments still render and are reported', (
      WidgetTester tester,
    ) async {
      final List<String> names = collectMissingNames();
      final List<String> ignored = collectIgnoredValues();
      await tester.pumpWidget(
        segApp(
          SetOwner(
            initial: <String>{},
            semanticLabel: '',
            segments: <TanreiSegment<String>>[
              seg('', value: 'x'),
              const TanreiSegment<String>(value: 'y', label: 'Shown', labelHidden: true),
            ],
          ),
        ),
      );
      expect(names, <String>['segmented button', 'segment']);
      expect(find.text('Shown'), findsOneWidget);
      expect(ignored, <Matcher>[contains('cannot hide its label')]);
      await tester.pump();
      expect(names, hasLength(2));

      ignored.clear();
      await tester.pumpWidget(
        segApp(
          SetOwner(
            key: UniqueKey(),
            initial: <String>{},
            segments: <TanreiSegment<String>>[seg('Only')],
          ),
        ),
      );
      expect(find.text('Only'), findsOneWidget);
      expect(ignored, <Matcher>[contains('holds 1')]);
      ignored.clear();
      await tester.pumpWidget(
        segApp(
          SetOwner(
            key: UniqueKey(),
            initial: <String>{},
            segments: <TanreiSegment<String>>[for (final String l in 'ABCDEF'.split('')) seg(l)],
          ),
        ),
      );
      expect(find.text('F'), findsOneWidget);
      expect(ignored, <Matcher>[contains('holds 6')]);
    });

    testWidgets('SEG-24: a selected segment casts its condition\'s elevation, painted above its '
        'neighbours; the set draws nothing else outside itself', (WidgetTester tester) async {
      const TanreiThemeData cupertino = TanreiThemeData(system: cupertinoSystem);
      final List<TanreiShadowLayer> level =
          cupertinoSystem.segmentedButton.conditions.selected.enabled.containerElevation;
      expect(level, isNotEmpty);
      await tester.pumpWidget(
        segApp(
          SetOwner(initial: <String>{'week'}, segments: range()),
          theme: cupertino,
        ),
      );
      final TanreiResolvedElevation resolved = TanreiResolvedElevation.resolve(
        level,
        cupertino.colors,
      );
      final TanreiContainerDecoration week = decorationOf(tester, 'Week');
      expect(week.boxShadow, resolved.shadows.isEmpty ? isNull : resolved.shadows);
      expect(week.border, resolved.ring);
      expect(decorationOf(tester, 'Day').boxShadow, isNull);
      // Painted last: the selected segment's container comes after both neighbours', whatever
      // their order in the row.
      final TanreiSegmentedButtonConditions conditions = segTokens.conditions;
      const Color a = Color(0xFF00AA00);
      const Color b = Color(0xFF0000AA);
      final TanreiSystem raised = system.copyWith(
        segmentedButton: segTokens.copyWith(
          conditions: conditions.copyWith(
            unselected: conditions.unselected.copyWith(
              enabled: conditions.unselected.enabled.copyWith(
                containerColor: const TanreiPaint.literal(a),
              ),
            ),
            selected: conditions.selected.copyWith(
              enabled: conditions.selected.enabled.copyWith(
                containerColor: const TanreiPaint.literal(b),
                containerElevation: system.elevation.level2,
              ),
            ),
          ),
        ),
      );
      await tester.pumpWidget(
        segApp(
          SetOwner(key: UniqueKey(), initial: <String>{'week'}, segments: range()),
          theme: TanreiThemeData(system: raised),
        ),
      );
      expect(
        setOf(tester),
        paints
          ..rrect(color: a)
          ..rrect(color: a)
          ..something(
            (Symbol method, List<dynamic> arguments) =>
                method == #drawRRect && (arguments[1] as Paint).color.toARGB32() == b.toARGB32(),
          ),
      );
      // Nothing is drawn outside the set's box but the elevation (the box is the set, centred in
      // the touch target).
      expect(setOf(tester).setRect.width, setOf(tester).size.width);
      // The default system raises nothing.
      expect(segTokens.conditions.selected.enabled.containerElevation, isEmpty);
    });
  });

  group('accessibility semantics', () {
    testWidgets('SEG-20: a single choice is a radio group named by the label, each segment a radio '
        'with its checked state named by its label drawn or not; icons, the check, the dividers '
        'and the outline are hidden', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(
        segApp(
          const SetOwner(
            initial: <String>{'center'},
            semanticLabel: 'Text alignment',
            segments: <TanreiSegment<String>>[
              TanreiSegment<String>(
                value: 'start',
                label: 'Align left',
                icon: Text('L'),
                labelHidden: true,
              ),
              TanreiSegment<String>(
                value: 'center',
                label: 'Center',
                icon: Text('C'),
                labelHidden: true,
              ),
              TanreiSegment<String>(
                value: 'end',
                label: 'Align right',
                icon: Text('R'),
                labelHidden: true,
              ),
            ],
          ),
        ),
      );
      final List<SemanticsNode> nodes = nodesBelow(semanticsRoot(tester));
      final SemanticsNode group = nodes.firstWhere(
        (SemanticsNode n) => n.getSemanticsData().role == SemanticsRole.radioGroup,
      );
      expect(group.getSemanticsData().label, 'Text alignment');
      final List<SemanticsData> segments = <SemanticsData>[];
      group.visitChildren((SemanticsNode child) {
        segments.add(child.getSemanticsData());
        return true;
      });
      expect(segments.map((SemanticsData s) => s.label), <String>[
        'Align left',
        'Center',
        'Align right',
      ]);
      expect(
        segments.map((SemanticsData s) => s.hasFlag(SemanticsFlag.isInMutuallyExclusiveGroup)),
        everyElement(isTrue),
      );
      expect(segments.map((SemanticsData s) => s.hasFlag(SemanticsFlag.isChecked)), <bool>[
        false,
        true,
        false,
      ]);
      expect(segments.every((SemanticsData s) => s.hasAction(SemanticsAction.tap)), isTrue);
      // Nothing else is read: no icon, no check, no divider.
      expect(
        nodes
            .map((SemanticsNode n) => n.getSemanticsData().label)
            .where((String l) => l.isNotEmpty),
        <String>['Text alignment', 'Align left', 'Center', 'Align right'],
      );
      handle.dispose();
    });

    testWidgets('SEG-20: a multiple choice is a group named by the label, each segment a toggle '
        'button with its toggled state', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(
        segApp(
          SetOwner(
            initial: <String>{'tue'},
            multiple: true,
            semanticLabel: 'Days',
            segments: <TanreiSegment<String>>[seg('Mon'), seg('Tue')],
          ),
        ),
      );
      expect(
        tester.getSemantics(segmentOf('Tue')),
        matchesSemantics(
          label: 'Tue',
          isButton: true,
          hasToggledState: true,
          isToggled: true,
          hasEnabledState: true,
          isEnabled: true,
          isFocusable: true,
          hasTapAction: true,
          hasFocusAction: true,
        ),
      );
      final List<SemanticsNode> nodes = nodesBelow(semanticsRoot(tester));
      final SemanticsData group = nodes
          .firstWhere((SemanticsNode n) => n.getSemanticsData().label == 'Days')
          .getSemanticsData();
      expect(group.role, isNot(SemanticsRole.radioGroup));
      handle.dispose();
    });

    testWidgets('guidelines: segmented button', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final TanreiThemeData theme in <TanreiThemeData>[
        TanreiThemeData.light,
        TanreiThemeData.dark,
      ]) {
        for (final TanreiSegmentedButtonSize size in TanreiSegmentedButtonSize.core) {
          await tester.pumpWidget(
            segApp(
              SetOwner(key: UniqueKey(), initial: <String>{'week'}, segments: range(), size: size),
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
      expect(segTokens.sizes.small.containerHeight, 32);
      expect(segTokens.sizes.medium.containerHeight, 36);
      expect(segTokens.sizes.large.containerHeight, 40);
      expect(segTokens.setShape, system.shape.small);
      expect(segTokens.containerShape, system.shape.none);
      expect(segTokens.setPadding, 0);
      expect(segTokens.sizes.medium.checkSize, 16);
      expect(segTokens.outlineColor, const TanreiPaint.role(TanreiColorRole.outline));
      expect(segTokens.dividerColor, const TanreiPaint.role(TanreiColorRole.outline));
      expect(
        lightTheme.paint(segTokens.conditions.selected.enabled.containerColor),
        light.secondaryContainer,
      );
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": a segmented button at rest draws the enabled tokens of that '
          'system', (WidgetTester tester) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        await tester.pumpWidget(
          segApp(
            SetOwner(initial: <String>{'week'}, segments: range()),
            theme: theme,
          ),
        );
        final TanreiSegmentedButtonTokens tokens = shipped.segmentedButton;
        expect(
          fillOf(tester, 'Week'),
          theme.paint(tokens.conditions.selected.enabled.containerColor),
        );
        expect(
          textColor(tester, 'Day'),
          theme.paint(tokens.conditions.unselected.enabled.labelColor),
        );
        expect(setRect(tester).height, expectedSetHeight(tokens, tokens.sizes.medium));
        expect(decorationOf(tester, 'Week').shape.smoothing, shipped.shape.cornerSmoothing);
        expect(checkOpacity(tester, 'Week'), tokens.sizes.medium.checkSize > 0 ? 1 : isNull);
      });
    }
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('segmented-button');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'single',
        'single-none',
        'multiple',
        'icons',
        'icon-only',
        'small',
        'large',
        'disabled',
        'selected-disabled',
      ]);
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          surface: segGoldenSurface,
          child: fixtureSet(fixture),
          file: 'goldens/segmented_button/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: the icons fixture shows the
    // preset's set, corners, check (or none), selected fill and elevation at once.
    const String recorded = 'icons';
    for (final TanreiSystem preset in <TanreiSystem>[
      m3LikeSystem,
      m3ExpressiveLikeSystem,
      cupertinoSystem,
    ]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: segGoldenSurface,
          child: fixtureSet(fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded)),
          file: 'goldens/segmented_button/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
