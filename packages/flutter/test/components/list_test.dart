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
final TanreiListTokens listTokens = system.list;
final TanreiColors light = system.schemes.light;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The frame of the list baselines: a list 360 wide (LST-16's `verify`) inside the `space200`
/// padding of every baseline, tall enough for three three-line rows of m3-like (88 each). The test
/// font draws every character as wide as it is tall, so a sentence of supporting text that one line
/// holds in a real font wraps to two here, and its row is three-line.
const Size listGoldenSurface = Size(392, 304);

/// The width every fixture list is drawn at.
const double listWidth = 360;

/// The fixtures' icon names, as Material Symbols code points drawn as text (a product's icons are
/// its own; the test font draws each as its box).
const Map<String, int> iconCodePoints = <String, int>{
  'inbox': 0xe156,
  'star': 0xe838,
  'send': 0xe163,
  'wifi': 0xe63e,
  'bluetooth': 0xe1a7,
  'chevron_right': 0xe5cc,
  'archive': 0xe149,
  'delete': 0xe872,
  'label': 0xe892,
};

Widget? glyph(String? name) =>
    name == null || name.isEmpty ? null : Text(String.fromCharCode(iconCodePoints[name] ?? 0xe5cc));

/// The avatar of LST-16's `verify`: the first letter of the headline (the list centres it and sets
/// it in the headline's style, LST-20).
Widget monogram(String headline) => Text(headline.characters.first);

/// One tile of a fixture's `items`.
TanreiListTile<String> fixtureTile(Map<String, dynamic> item) {
  final Map<String, dynamic> props = item['props'] as Map<String, dynamic>;
  final String headline = props['headline'] as String? ?? '';
  final TanreiListLeadingMedia media = TanreiListLeadingMedia.fromName(
    props['leadingMedia'] as String? ?? 'none',
  );
  return TanreiListTile<String>(
    value: props['value'] as String?,
    title: headline,
    overline: props['overline'] as String? ?? '',
    subtitle: props['supportingText'] as String? ?? '',
    subtitleMaxLines: props['supportingMaxLines'] as int? ?? 0,
    trailingText: props['trailingText'] as String? ?? '',
    leadingIcon: glyph(props['leadingIcon'] as String?),
    trailingIcon: glyph(props['trailingIcon'] as String?),
    leadingMedia: media,
    // With an image the slot is empty and shows the media container color (LST-16's `verify`).
    leading: media == TanreiListLeadingMedia.avatar ? monogram(headline) : null,
    onTap: props['interactive'] == true ? () {} : null,
    enabled: props['disabled'] != true,
    divider: props['divider'] == true,
  );
}

/// The list a fixture describes: its props on the list, its items in order, 360 wide.
Widget fixtureList(Map<String, dynamic> fixture) {
  final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
  final TanreiListSelectionMode mode = TanreiListSelectionMode.fromName(
    props['selection'] as String? ?? 'none',
  );
  final Set<String> selected = switch (mode) {
    TanreiListSelectionMode.none => <String>{},
    TanreiListSelectionMode.single => <String>{if (props['value'] case final String value) value},
    TanreiListSelectionMode.multiple => <String>{
      ...(props['values'] as List<dynamic>? ?? const <dynamic>[]).cast<String>(),
    },
  };
  return SizedBox(
    width: listWidth,
    child: TanreiList<String>(
      selectionMode: mode,
      selected: selected,
      onSelectionChanged: (_) {},
      semanticLabel: props['label'] as String? ?? '',
      children: <Widget>[
        for (final Map<String, dynamic> item
            in (fixture['items'] as List<dynamic>).cast<Map<String, dynamic>>())
          fixtureTile(item),
      ],
    ),
  );
}

/// Collects what the list reports as ignored (LST-26), and restores the reporter.
List<String> collectIgnoredValues() {
  final List<String> reports = <String>[];
  final TanreiIgnoredValueReporter previous = debugTanreiReportIgnoredValue;
  debugTanreiReportIgnoredValue = (String component, String prop, String why, Widget widget) =>
      reports.add('$component $prop: $why');
  addTearDown(() => debugTanreiReportIgnoredValue = previous);
  return reports;
}

/// A list [listWidth] wide.
Widget list({
  TanreiListSelectionMode selectionMode = TanreiListSelectionMode.none,
  Set<String> selected = const <String>{},
  ValueChanged<Set<String>>? onSelectionChanged,
  String semanticLabel = 'Labels',
  required List<Widget> children,
  Key? key,
}) => SizedBox(
  width: listWidth,
  child: TanreiList<String>(
    key: key,
    selectionMode: selectionMode,
    selected: selected,
    onSelectionChanged: onSelectionChanged ?? (_) {},
    semanticLabel: semanticLabel,
    children: children,
  ),
);

/// A list whose owner keeps the selection, as a product does.
class Owner extends StatefulWidget {
  const Owner({
    super.key,
    required this.mode,
    this.initial = const <String>{},
    required this.children,
    this.changes,
  });

  final TanreiListSelectionMode mode;
  final Set<String> initial;
  final List<Widget> children;
  final List<Set<String>>? changes;

  @override
  State<Owner> createState() => _OwnerState();
}

class _OwnerState extends State<Owner> {
  late Set<String> _selected = widget.initial;

  @override
  Widget build(BuildContext context) => list(
    selectionMode: widget.mode,
    selected: _selected,
    onSelectionChanged: (Set<String> value) {
      widget.changes?.add(value);
      setState(() => _selected = value);
    },
    children: widget.children,
  );
}

TanreiListTile<String> option(
  String title, {
  String? value,
  bool enabled = true,
  FocusNode? focusNode,
  Widget? leadingIcon,
  String subtitle = '',
}) => TanreiListTile<String>(
  value: value ?? title.toLowerCase(),
  title: title,
  subtitle: subtitle,
  enabled: enabled,
  focusNode: focusNode,
  leadingIcon: leadingIcon,
);

TanreiListTile<String> action(
  String title, {
  VoidCallback? onTap,
  bool enabled = true,
  FocusNode? focusNode,
  Widget? leadingIcon,
  String subtitle = '',
  bool divider = false,
  Key? key,
}) => TanreiListTile<String>(
  key: key,
  title: title,
  subtitle: subtitle,
  onTap: onTap ?? () {},
  enabled: enabled,
  focusNode: focusNode,
  leadingIcon: leadingIcon,
  divider: divider,
);

Finder tileOf(String title) =>
    find.ancestor(of: find.text(title), matching: find.byType(TanreiListTile<String>)).first;

/// The row's container: fill and ripple.
Finder containerOfTile(String title) => find
    .ancestor(
      of: find.text(title),
      matching: find.byWidgetPredicate(
        (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
      ),
    )
    .first;

TanreiContainerDecoration decorationOf(WidgetTester tester, String title) =>
    tester.widget<DecoratedBox>(containerOfTile(title)).decoration as TanreiContainerDecoration;

Color fillOf(WidgetTester tester, String title) =>
    decorationOf(tester, title).color ?? const Color(0x00000000);

/// The color [text] is drawn in.
Color textColor(WidgetTester tester, String text) => tester
    .widget<RichText>(find.descendant(of: find.text(text), matching: find.byType(RichText)))
    .text
    .style!
    .color!;

TextStyle textStyleOf(WidgetTester tester, String text) => tester
    .widget<RichText>(find.descendant(of: find.text(text), matching: find.byType(RichText)))
    .text
    .style!;

/// The whole-row opacity (1 for a static row, which has none).
double opacityOf(WidgetTester tester, String title) {
  final Finder opacity = find.descendant(of: tileOf(title), matching: find.byType(Opacity));
  return opacity.evaluate().isEmpty ? 1 : tester.widget<Opacity>(opacity.first).opacity;
}

bool ringVisible(WidgetTester tester, String title) {
  final Finder ring = find.descendant(of: tileOf(title), matching: find.byType(TanreiFocusRing));
  return ring.evaluate().isNotEmpty && tester.widget<TanreiFocusRing>(ring).visible;
}

TanreiCheckMarkPainter markOf(WidgetTester tester, String title) =>
    tester
            .widget<CustomPaint>(
              find.descendant(
                of: tileOf(title),
                matching: find.byWidgetPredicate(
                  (Widget w) => w is CustomPaint && w.painter is TanreiCheckMarkPainter,
                ),
              ),
            )
            .painter!
        as TanreiCheckMarkPainter;

Future<TestGesture> hoverOver(WidgetTester tester, Finder target) async {
  FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
  final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
  await mouse.addPointer(location: Offset.zero);
  addTearDown(mouse.removePointer);
  await mouse.moveTo(tester.getCenter(target));
  await tester.pumpAndSettle();
  return mouse;
}

/// The semantics root of the app under test.
SemanticsNode semanticsRoot(WidgetTester tester) =>
    tester.renderObject(find.byType(WidgetsApp)).owner!.semanticsOwner!.rootSemanticsNode!;

/// Every node below [node], depth first.
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

SemanticsNode nodeWithRole(WidgetTester tester, SemanticsRole role) => nodesBelow(
  semanticsRoot(tester),
).firstWhere((SemanticsNode n) => n.getSemanticsData().role == role);

List<SemanticsNode> childrenOf(SemanticsNode node) {
  final List<SemanticsNode> children = <SemanticsNode>[];
  node.visitChildren((SemanticsNode child) {
    children.add(child);
    return true;
  });
  return children;
}

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('activation', () {
    for (final PointerDeviceKind kind in <PointerDeviceKind>[
      PointerDeviceKind.touch,
      PointerDeviceKind.mouse,
    ]) {
      testWidgets('LST-1: a ${kind.name} tap on an interactive item emits its onTap exactly once', (
        WidgetTester tester,
      ) async {
        int taps = 0;
        await tester.pumpWidget(
          tanreiTestApp(list(children: <Widget>[action('Wi-Fi', onTap: () => taps++)])),
        );
        await tester.tap(tileOf('Wi-Fi'), kind: kind);
        await tester.pumpAndSettle();
        expect(taps, 1);
      });
    }

    for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
      LogicalKeyboardKey.enter,
      LogicalKeyboardKey.space,
    ]) {
      final String name = key == LogicalKeyboardKey.enter ? 'Enter' : 'Space';
      testWidgets('LST-1: $name emits the focused item\'s onTap exactly once', (
        WidgetTester tester,
      ) async {
        int taps = 0;
        final FocusNode node = FocusNode();
        addTearDown(node.dispose);
        await tester.pumpWidget(
          tanreiTestApp(
            list(
              children: <Widget>[action('Wi-Fi', onTap: () => taps++, focusNode: node)],
            ),
          ),
        );
        node.requestFocus();
        await tester.pump();
        await tester.sendKeyEvent(key);
        await tester.pumpAndSettle();
        expect(taps, 1);
      });
    }

    testWidgets('LST-1: the semantic tap action emits onTap exactly once', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      int taps = 0;
      await tester.pumpWidget(
        tanreiTestApp(list(children: <Widget>[action('Wi-Fi', onTap: () => taps++)])),
      );
      tester.semantics.tap(find.semantics.byLabel('Wi-Fi'));
      await tester.pump();
      expect(taps, 1);
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
      handle.dispose();
    });
  });

  group('disabled', () {
    testWidgets('LST-2: a disabled interactive item or option emits nothing, is exposed as '
        'disabled, and the arrow keys still reach it; Space, Enter, pointer and touch do not '
        'activate it', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      int taps = 0;
      final FocusNode first = FocusNode();
      addTearDown(first.dispose);
      await tester.pumpWidget(
        tanreiTestApp(
          list(
            children: <Widget>[
              action('Trash', onTap: () => taps++, focusNode: first),
              action('Archive', onTap: () => taps++, enabled: false),
            ],
          ),
        ),
      );
      await tester.tap(tileOf('Archive'), warnIfMissed: false);
      first.requestFocus();
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pump();
      expect(first.hasFocus, isFalse, reason: 'the arrow key reached the disabled item');
      expect(ringVisible(tester, 'Archive'), isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pumpAndSettle();
      expect(taps, 0);
      final SemanticsData data = tester
          .getSemantics(find.byType(TanreiListTile<String>).last)
          .getSemanticsData();
      final SemanticsNode button = nodesBelow(
        semanticsRoot(tester),
      ).firstWhere((SemanticsNode n) => n.getSemanticsData().label == 'Archive');
      expect(data.role, SemanticsRole.listItem);
      expect(button.getSemanticsData().hasFlag(SemanticsFlag.hasEnabledState), isTrue);
      expect(button.getSemanticsData().hasFlag(SemanticsFlag.isEnabled), isFalse);
      expect(button.getSemanticsData().hasAction(SemanticsAction.tap), isFalse);

      // An option: no change.
      final List<Set<String>> changes = <Set<String>>[];
      await tester.pumpWidget(
        tanreiTestApp(
          Owner(
            mode: TanreiListSelectionMode.single,
            changes: changes,
            children: <Widget>[option('Light', enabled: false), option('Dark')],
          ),
        ),
      );
      await tester.tap(tileOf('Light'), warnIfMissed: false);
      await tester.pumpAndSettle();
      expect(changes, isEmpty);
      final SemanticsData light = tester
          .getSemantics(find.byType(TanreiListTile<String>).first)
          .getSemanticsData();
      expect(light.hasFlag(SemanticsFlag.hasEnabledState), isTrue);
      expect(light.hasFlag(SemanticsFlag.isEnabled), isFalse);
      handle.dispose();
    });

    testWidgets('LST-6: a disabled item draws the disabled tokens of its condition and dims as a '
        'whole — its media included — to the disabled opacity', (WidgetTester tester) async {
      for (final bool selected in <bool>[false, true]) {
        await tester.pumpWidget(
          tanreiTestApp(
            list(
              selectionMode: TanreiListSelectionMode.single,
              selected: <String>{if (selected) 'ada'},
              children: const <Widget>[
                TanreiListTile<String>(
                  value: 'ada',
                  title: 'Ada',
                  subtitle: 'Edited',
                  leadingMedia: TanreiListLeadingMedia.avatar,
                  leading: SizedBox.expand(key: Key('photo')),
                  enabled: false,
                ),
              ],
            ),
          ),
        );
        await tester.pumpAndSettle();
        final TanreiListConditionStateTokens disabled = listTokens
            .conditions[selected ? TanreiListCondition.selected : TanreiListCondition.unselected]
            .disabled;
        expect(fillOf(tester, 'Ada'), lightTheme.paint(disabled.containerColor));
        expect(textColor(tester, 'Ada'), lightTheme.paint(disabled.headlineColor));
        expect(textColor(tester, 'Edited'), lightTheme.paint(disabled.supportingTextColor));
        expect(markOf(tester, 'Ada').color, lightTheme.paint(disabled.markColor));
        expect(opacityOf(tester, 'Ada'), listTokens.disabled.opacity);
        // The opacity is above the media.
        expect(
          find.ancestor(of: find.byKey(const Key('photo')), matching: find.byType(Opacity)),
          findsOneWidget,
        );
      }
      // The default system keeps the resting colors and dims the whole row.
      expect(listTokens.disabled.opacity, system.state.disabledContentOpacity);
      for (final TanreiListCondition condition in TanreiListCondition.core) {
        final TanreiListConditionTokens tokens = listTokens.conditions[condition];
        expect(tokens.disabled.containerColor, tokens.enabled.containerColor);
        expect(tokens.disabled.headlineColor, tokens.enabled.headlineColor);
        expect(tokens.disabled.markColor, tokens.enabled.markColor);
      }
    });
  });

  group('interaction states', () {
    testWidgets('LST-3: container, texts, icons, mark and opacity come from the tokens of the '
        'condition in the highest-precedence state, pressed > focused > hovered', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final FocusNode node = FocusNode();
      addTearDown(node.dispose);
      await tester.pumpWidget(
        tanreiTestApp(
          list(
            selectionMode: TanreiListSelectionMode.multiple,
            selected: const <String>{'bug'},
            children: <Widget>[option('Bug', focusNode: node, subtitle: '12 open issues')],
          ),
        ),
      );
      final TanreiListConditionTokens selected = listTokens.conditions.selected;
      void expectDrawnFrom(TanreiListConditionStateTokens tokens, TanreiListStateTokens? state) {
        expect(fillOf(tester, 'Bug'), lightTheme.paint(tokens.containerColor));
        expect(textColor(tester, 'Bug'), lightTheme.paint(tokens.headlineColor));
        expect(textColor(tester, '12 open issues'), lightTheme.paint(tokens.supportingTextColor));
        expect(markOf(tester, 'Bug').color, lightTheme.paint(tokens.markColor));
        expect(opacityOf(tester, 'Bug'), state?.opacity ?? 1);
      }

      expectDrawnFrom(selected.enabled, null);
      final TestGesture mouse = await hoverOver(tester, tileOf('Bug'));
      expectDrawnFrom(selected.hovered, listTokens.hovered);
      // The state layer is the condition's state-layer color, its headline color.
      expect(
        fillOf(tester, 'Bug'),
        isSameColorAs(
          Color.alphaBlend(
            light.onSecondaryContainer.withValues(alpha: system.state.hoverStateLayerOpacity),
            light.secondaryContainer,
          ),
        ),
      );
      node.requestFocus();
      await tester.pumpAndSettle();
      expectDrawnFrom(selected.focused, listTokens.focused);
      await mouse.down(tester.getCenter(tileOf('Bug')));
      await tester.pump();
      expectDrawnFrom(selected.pressed, listTokens.pressed);
      await mouse.up();
      await tester.pumpAndSettle();
    });

    testWidgets('LST-3: focus gained by pointer or touch does not select the focused state', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      final FocusNode node = FocusNode();
      addTearDown(node.dispose);
      await tester.pumpWidget(
        tanreiTestApp(list(children: <Widget>[action('Wi-Fi', focusNode: node)])),
      );
      node.requestFocus();
      await tester.pumpAndSettle();
      expect(node.hasFocus, isTrue);
      expect(fillOf(tester, 'Wi-Fi'), const Color(0x00000000));
      expect(ringVisible(tester, 'Wi-Fi'), isFalse);
    });

    testWidgets('LST-3: under the acme fixture hovered, focused and pressed are three different '
        'values, and pressed > focused > hovered is visible', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      const TanreiThemeData theme = TanreiThemeData(system: acmeSystem);
      final TanreiListConditionTokens unselected = acmeSystem.list.conditions.unselected;
      final Color hovered = theme.paint(unselected.hovered.containerColor);
      final Color focused = theme.paint(unselected.focused.containerColor);
      final Color pressed = theme.paint(unselected.pressed.containerColor);
      expect(<Color>{hovered, focused, pressed}, hasLength(3));
      expect(acmeSystem.behavior.pressedFeedback, TanreiPressedFeedback.overlay);
      final FocusNode node = FocusNode();
      addTearDown(node.dispose);
      await tester.pumpWidget(
        tanreiTestApp(
          list(children: <Widget>[action('Wi-Fi', focusNode: node)]),
          theme: theme,
        ),
      );
      final TestGesture mouse = await hoverOver(tester, tileOf('Wi-Fi'));
      expect(fillOf(tester, 'Wi-Fi'), hovered);
      node.requestFocus();
      await tester.pumpAndSettle();
      expect(fillOf(tester, 'Wi-Fi'), focused);
      await mouse.down(tester.getCenter(tileOf('Wi-Fi')));
      await tester.pump();
      expect(fillOf(tester, 'Wi-Fi'), pressed);
      await mouse.up();
      await tester.pump(tanreiDuration(acmeSystem.motion.duration.pressHold));
      await tester.pumpAndSettle();
      expect(fillOf(tester, 'Wi-Fi'), focused);
    });
  });

  group('focus ring', () {
    testWidgets(
      'LST-4: keyboard focus shows the focus ring at once, inside the item\'s container',
      (WidgetTester tester) async {
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        await tester.pumpWidget(tanreiTestApp(list(children: <Widget>[action('Wi-Fi')])));
        expect(ringVisible(tester, 'Wi-Fi'), isFalse);
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pump();
        expect(ringVisible(tester, 'Wi-Fi'), isTrue);
        final TanreiFocusRing ring = tester.widget(find.byType(TanreiFocusRing));
        expect(ring.inside, isTrue);
        // The outer edge of the ring's stroke lies on the row's edge: nothing is drawn outside it.
        final TanreiMeasure measure = system.measure;
        final Rect row = Offset.zero & tester.getSize(containerOfTile('Wi-Fi'));
        final Rect expected = row.deflate(measure.focusOuterWidth / 2);
        expect(
          find.byType(TanreiFocusRing),
          paints..something((Symbol method, List<dynamic> arguments) {
            if (method != #drawRect && method != #drawRRect) {
              return false;
            }
            final Paint paint = arguments[1] as Paint;
            final Rect drawn = arguments[0] is RRect
                ? (arguments[0] as RRect).outerRect
                : arguments[0] as Rect;
            return paint.style == PaintingStyle.stroke &&
                paint.strokeWidth == measure.focusOuterWidth &&
                drawn == expected;
          }),
        );
      },
    );

    testWidgets('LST-4: pointer or touch focus does not show the focus ring', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      final FocusNode node = FocusNode();
      addTearDown(node.dispose);
      await tester.pumpWidget(
        tanreiTestApp(list(children: <Widget>[action('Wi-Fi', focusNode: node)])),
      );
      node.requestFocus();
      await tester.pumpAndSettle();
      expect(ringVisible(tester, 'Wi-Fi'), isFalse);
    });
  });

  group('target size', () {
    testWidgets('LST-5: an interactive item or an option shorter than the minimum target is made '
        'sys.target.touch tall; a static item keeps its own height; the whole row is the hit '
        'area', (WidgetTester tester) async {
      final TanreiSystem short = system.copyWith(
        list: listTokens.copyWith(containerHeightOneLine: 40),
      );
      final TanreiThemeData theme = TanreiThemeData(system: short);
      int taps = 0;
      await tester.pumpWidget(
        tanreiTestApp(
          list(
            children: <Widget>[
              const TanreiListTile<String>(title: 'Static'),
              action('Wi-Fi', onTap: () => taps++, leadingIcon: const Text('x')),
            ],
          ),
          theme: theme,
        ),
      );
      expect(tester.getSize(tileOf('Static')).height, 40);
      expect(tester.getSize(tileOf('Wi-Fi')).height, system.measure.targetTouch);
      final Rect row = tester.getRect(tileOf('Wi-Fi'));
      for (final Offset point in <Offset>[
        row.topLeft + const Offset(1, 1),
        row.centerLeft + const Offset(4, 0),
        row.bottomRight - const Offset(1, 1),
      ]) {
        await tester.tapAt(point);
      }
      await tester.pumpAndSettle();
      expect(taps, 3);

      await tester.pumpWidget(
        tanreiTestApp(
          list(selectionMode: TanreiListSelectionMode.single, children: <Widget>[option('Light')]),
          theme: theme,
        ),
      );
      expect(tester.getSize(tileOf('Light')).height, system.measure.targetTouch);
    });
  });

  group('unknown values', () {
    testWidgets('LST-7: a selection or leadingMedia the list does not define renders as the '
        'default value, and debug builds report it', (WidgetTester tester) async {
      final List<String> reports = collectUnknownValues();
      expect(TanreiListSelectionMode.fromName('grid'), TanreiListSelectionMode.none);
      expect(reports, <String>['list selection "grid" -> none']);
      expect(TanreiListLeadingMedia.fromName('video'), TanreiListLeadingMedia.none);
      expect(reports.last, 'list leading media "video" -> none');
      reports.clear();
      expect(TanreiListSelectionMode.fromName('multiple'), TanreiListSelectionMode.multiple);
      expect(TanreiListLeadingMedia.fromName('avatar'), TanreiListLeadingMedia.avatar);
      expect(reports, isEmpty);

      Widget build(String selection, String media) => list(
        selectionMode: TanreiListSelectionMode.fromName(selection),
        children: <Widget>[
          TanreiListTile<String>(
            title: 'Inbox',
            leadingIcon: const Text('x'),
            leadingMedia: TanreiListLeadingMedia.fromName(media),
          ),
        ],
      );
      final FramePixels unknown = await framePixels(
        tester,
        system: system,
        surface: listGoldenSurface,
        child: build('grid', 'video'),
      );
      final FramePixels defaults = await framePixels(
        tester,
        system: system,
        surface: listGoldenSurface,
        child: build('none', 'none'),
      );
      expect(unknown, defaults);
      expect(tester.takeException(), isNull);
    });
  });

  group('press hold (LST-8)', () {
    final Duration hold = tanreiDuration(system.motion.duration.pressHold);
    final Color pressedFill = lightTheme.paint(
      listTokens.conditions.unselected.pressed.containerColor,
    );
    const Duration tick = Duration(milliseconds: 1);

    for (final PointerDeviceKind kind in <PointerDeviceKind>[
      PointerDeviceKind.touch,
      PointerDeviceKind.mouse,
    ]) {
      testWidgets('LST-8: a ${kind.name} press shows the pressed state without delay and keeps it '
          'for the press-hold duration', (WidgetTester tester) async {
        await tester.pumpWidget(tanreiTestApp(list(children: <Widget>[action('Wi-Fi')])));
        await tester.tap(tileOf('Wi-Fi'), kind: kind);
        await tester.pump();
        expect(fillOf(tester, 'Wi-Fi'), pressedFill);
        await tester.pump(hold - tick);
        expect(fillOf(tester, 'Wi-Fi'), pressedFill);
        await tester.pump(tick);
        await tester.pumpAndSettle();
        expect(fillOf(tester, 'Wi-Fi'), isNot(pressedFill));
      });
    }

    for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
      LogicalKeyboardKey.enter,
      LogicalKeyboardKey.space,
    ]) {
      final String name = key == LogicalKeyboardKey.enter ? 'Enter' : 'Space';
      testWidgets('LST-8: $name shows the pressed state at once and for the press-hold duration', (
        WidgetTester tester,
      ) async {
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        final FocusNode node = FocusNode();
        addTearDown(node.dispose);
        await tester.pumpWidget(
          tanreiTestApp(list(children: <Widget>[action('Wi-Fi', focusNode: node)])),
        );
        node.requestFocus();
        await tester.pumpAndSettle();
        final Color focused = fillOf(tester, 'Wi-Fi');
        await tester.sendKeyEvent(key);
        await tester.pump();
        expect(fillOf(tester, 'Wi-Fi'), pressedFill);
        await tester.pump(hold - tick);
        expect(fillOf(tester, 'Wi-Fi'), pressedFill);
        await tester.pump(tick);
        await tester.pumpAndSettle();
        expect(fillOf(tester, 'Wi-Fi'), focused);
      });
    }
  });

  group('choices of kind', () {
    testWidgets('LST-9: overlay (the default) applies the pressed tokens to the whole container '
        'at once, with no ripple', (WidgetTester tester) async {
      expect(system.behavior.pressedFeedback, TanreiPressedFeedback.overlay);
      await tester.pumpWidget(tanreiTestApp(list(children: <Widget>[action('Wi-Fi')])));
      final TestGesture touch = await tester.startGesture(tester.getCenter(tileOf('Wi-Fi')));
      await tester.pump();
      expect(
        fillOf(tester, 'Wi-Fi'),
        lightTheme.paint(listTokens.conditions.unselected.pressed.containerColor),
      );
      expect(decorationOf(tester, 'Wi-Fi').ripple, isNull);
      await touch.up();
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
    });

    testWidgets('LST-9: ripple (m3-like) grows the pressed container from the point of contact '
        'over comp.list.motion.feedback-duration, from the center for the keyboard, and fades once '
        'the press has ended', (WidgetTester tester) async {
      const TanreiThemeData theme = TanreiThemeData(system: m3LikeSystem);
      final TanreiListTokens tokens = m3LikeSystem.list;
      final Color pressed = theme.paint(tokens.conditions.unselected.pressed.containerColor);
      final FocusNode node = FocusNode();
      addTearDown(node.dispose);
      await tester.pumpWidget(
        tanreiTestApp(
          list(children: <Widget>[action('Wi-Fi', focusNode: node)]),
          theme: theme,
        ),
      );
      final Rect box = tester.getRect(containerOfTile('Wi-Fi'));
      const Offset contact = Offset(40, 12);
      final TestGesture touch = await tester.startGesture(box.topLeft + contact);
      await tester.pump();
      TanreiContainerDecoration decoration = decorationOf(tester, 'Wi-Fi');
      expect(decoration.color, isNull, reason: 'the row keeps its resting (no) fill');
      expect(decoration.ripple!.origin, contact);
      expect(decoration.ripple!.color, pressed);
      expect(decoration.ripple!.progress, 0);
      final Duration growth = tanreiDuration(tokens.motionFeedbackDuration);
      await tester.pump(growth ~/ 2);
      expect(
        decorationOf(tester, 'Wi-Fi').ripple!.progress,
        moreOrLessEquals(tokens.motionStateEasing.toCurve().transform(0.5)),
      );
      await tester.pump(growth);
      await touch.up();
      await tester.pump();
      await tester.pump(tanreiDuration(tokens.motionStateDuration) ~/ 2);
      decoration = decorationOf(tester, 'Wi-Fi');
      expect(decoration.ripple!.color, isNot(pressed));
      await tester.pumpAndSettle();
      expect(decorationOf(tester, 'Wi-Fi').ripple, isNull);

      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      node.requestFocus();
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pump();
      expect(decorationOf(tester, 'Wi-Fi').ripple!.origin, isNull, reason: 'the center');
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
    });

    for (final TanreiPressedFeedback feedback in <TanreiPressedFeedback>[
      TanreiPressedFeedback.ripple,
      TanreiPressedFeedback.dim,
      TanreiPressedFeedback.none,
    ]) {
      testWidgets(
        'LST-9: under ${feedback.name} '
        '${feedback == TanreiPressedFeedback.none ? 'every part stays with the state under the press' : 'only the container color stays with the state under the press'}',
        (WidgetTester tester) async {
          final TanreiListConditionTokens unselected = listTokens.conditions.unselected;
          final TanreiSystem of = system.copyWith(
            behavior: system.behavior.copyWith(pressedFeedback: feedback),
            list: listTokens.copyWith(
              pressed: listTokens.pressed.copyWith(opacity: 0.5),
              conditions: listTokens.conditions.copyWith(
                unselected: unselected.copyWith(
                  pressed: unselected.pressed.copyWith(
                    containerColor: const TanreiPaint.literal(Color(0xFF112233)),
                    headlineColor: const TanreiPaint.literal(Color(0xFF445566)),
                  ),
                ),
              ),
            ),
          );
          await tester.pumpWidget(
            tanreiTestApp(
              list(children: <Widget>[action('Wi-Fi')]),
              theme: TanreiThemeData(system: of),
            ),
          );
          final Color resting = textColor(tester, 'Wi-Fi');
          final TestGesture touch = await tester.startGesture(tester.getCenter(tileOf('Wi-Fi')));
          await tester.pump();
          expect(fillOf(tester, 'Wi-Fi'), const Color(0x00000000));
          if (feedback == TanreiPressedFeedback.none) {
            expect(textColor(tester, 'Wi-Fi'), resting);
            expect(opacityOf(tester, 'Wi-Fi'), 1);
          } else {
            expect(textColor(tester, 'Wi-Fi'), const Color(0xFF445566));
            expect(opacityOf(tester, 'Wi-Fi'), 0.5);
            expect(
              decorationOf(tester, 'Wi-Fi').ripple?.color,
              feedback == TanreiPressedFeedback.ripple ? const Color(0xFF112233) : null,
            );
          }
          await touch.up();
          await tester.pumpAndSettle(const Duration(milliseconds: 100));
        },
      );
    }

    testWidgets('LST-9: dim (cupertino) dims the pressed row and draws no state layer', (
      WidgetTester tester,
    ) async {
      expect(cupertinoSystem.behavior.pressedFeedback, TanreiPressedFeedback.dim);
      await tester.pumpWidget(
        tanreiTestApp(
          list(children: <Widget>[action('Wi-Fi')]),
          theme: const TanreiThemeData(system: cupertinoSystem),
        ),
      );
      final TestGesture touch = await tester.startGesture(tester.getCenter(tileOf('Wi-Fi')));
      await tester.pump();
      expect(opacityOf(tester, 'Wi-Fi'), cupertinoSystem.list.pressed.opacity);
      expect(cupertinoSystem.list.pressed.opacity, lessThan(1));
      expect(fillOf(tester, 'Wi-Fi'), const Color(0x00000000));
      expect(decorationOf(tester, 'Wi-Fi').ripple, isNull);
      await touch.up();
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
    });

    testWidgets('LST-10: the corner smoothing of the system eases the row and its focus ring; the '
        'focus style draws a ring (default) or a glow (acme)', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      // The default rows are square; a system that rounds them shows the smoothing.
      expect(listTokens.containerShape, 0);
      final TanreiListTokens cupertinoList = cupertinoSystem.list;
      final TanreiSystem rounded = cupertinoSystem.copyWith(
        list: cupertinoList.copyWith(
          containerShape: 12,
          focused: cupertinoList.focused.copyWith(containerShape: 12),
        ),
      );
      final FocusNode node = FocusNode();
      addTearDown(node.dispose);
      await tester.pumpWidget(
        tanreiTestApp(
          list(children: <Widget>[action('Wi-Fi', focusNode: node)]),
          theme: TanreiThemeData(system: rounded),
        ),
      );
      node.requestFocus();
      await tester.pumpAndSettle();
      expect(decorationOf(tester, 'Wi-Fi').shape.smoothing, 0.6);
      expect(decorationOf(tester, 'Wi-Fi').shape.radius, 12);
      expect(
        find.byType(TanreiFocusRing),
        paints..something(
          (Symbol method, List<dynamic> arguments) =>
              method == #drawPath && (arguments[1] as Paint).style == PaintingStyle.stroke,
        ),
      );

      Future<List<Paint>> strokes(TanreiSystem of) async {
        final FocusNode node = FocusNode();
        addTearDown(node.dispose);
        await tester.pumpWidget(
          tanreiTestApp(
            list(
              children: <Widget>[action('Wi-Fi', focusNode: node, key: UniqueKey())],
            ),
            theme: TanreiThemeData(system: of),
          ),
        );
        node.requestFocus();
        await tester.pump();
        final List<Paint> found = <Paint>[];
        expect(
          find.byType(TanreiFocusRing),
          paints..everything((Symbol method, List<dynamic> arguments) {
            if ((method == #drawRect || method == #drawRRect || method == #drawPath) &&
                (arguments[1] as Paint).style == PaintingStyle.stroke) {
              found.add(arguments[1] as Paint);
            }
            return true;
          }),
        );
        return found;
      }

      expect(acmeSystem.behavior.focusStyle, TanreiFocusStyle.glow);
      final List<Paint> ring = await strokes(system);
      expect(ring, isNotEmpty);
      expect(ring.every((Paint paint) => paint.maskFilter == null), isTrue);
      final List<Paint> glow = await strokes(acmeSystem);
      expect(glow, isNotEmpty);
      expect(glow.every((Paint paint) => paint.maskFilter != null), isTrue);
    });
  });
  group('static items', () {
    testWidgets('LST-11: a static item draws the resting unselected tokens, is not focusable, '
        'emits nothing, answers no hover or press and ignores enabled; its trailing control keeps '
        'its own focus stop and semantics', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      bool on = false;
      final FocusNode switchNode = FocusNode();
      addTearDown(switchNode.dispose);
      await tester.pumpWidget(
        tanreiTestApp(
          list(
            children: <Widget>[
              TanreiListTile<String>(
                title: 'Wi-Fi',
                subtitle: 'Connected',
                enabled: false,
                trailing: TanreiSwitch(
                  focusNode: switchNode,
                  value: on,
                  onChanged: (bool value) => on = value,
                  label: 'Wi-Fi',
                  labelHidden: true,
                ),
              ),
            ],
          ),
        ),
      );
      final TanreiListConditionStateTokens rest = listTokens.conditions.unselected.enabled;
      expect(fillOf(tester, 'Wi-Fi'), lightTheme.paint(rest.containerColor));
      expect(textColor(tester, 'Wi-Fi'), lightTheme.paint(rest.headlineColor));
      expect(textColor(tester, 'Connected'), lightTheme.paint(rest.supportingTextColor));
      expect(opacityOf(tester, 'Wi-Fi'), 1, reason: 'enabled is ignored');
      expect(
        find.descendant(of: tileOf('Wi-Fi'), matching: find.byType(TanreiFocusRing)),
        findsOne,
        reason: 'only the switch\'s own',
      );
      final TanreiContainerDecoration before = decorationOf(tester, 'Wi-Fi');
      final TestGesture mouse = await hoverOver(tester, find.text('Connected'));
      await mouse.down(tester.getCenter(find.text('Connected')));
      await tester.pump();
      expect(decorationOf(tester, 'Wi-Fi'), before);
      await mouse.up();
      await tester.pumpAndSettle();
      // Tab reaches the switch, not the row.
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(switchNode.hasPrimaryFocus, isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pumpAndSettle();
      expect(on, isTrue);
      // The switch is its own node inside the list item.
      final SemanticsNode item = tester.getSemantics(tileOf('Wi-Fi'));
      expect(item.getSemanticsData().role, SemanticsRole.listItem);
      expect(item.getSemanticsData().hasFlag(SemanticsFlag.isFocusable), isFalse);
      expect(
        nodesBelow(
          item,
        ).any((SemanticsNode n) => n.getSemanticsData().hasFlag(SemanticsFlag.hasToggledState)),
        isTrue,
      );
      handle.dispose();
    });
  });

  group('accessibility semantics', () {
    testWidgets('LST-12: selection none exposes the list role and each item as a list item; an '
        'interactive item is one button inside its list item', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(
        tanreiTestApp(
          list(
            semanticLabel: 'Settings',
            children: <Widget>[
              const TanreiListTile<String>(title: 'Version', trailingText: '1.0'),
              action('Wi-Fi', subtitle: 'Connected'),
            ],
          ),
        ),
      );
      final SemanticsNode listNode = nodeWithRole(tester, SemanticsRole.list);
      expect(listNode.getSemanticsData().label, 'Settings');
      final List<SemanticsNode> items = childrenOf(listNode);
      expect(items.map((SemanticsNode n) => n.getSemanticsData().role), <SemanticsRole>[
        SemanticsRole.listItem,
        SemanticsRole.listItem,
      ]);
      expect(items.first.getSemanticsData().label, 'Version');
      expect(items.first.getSemanticsData().hasFlag(SemanticsFlag.isButton), isFalse);
      final List<SemanticsNode> inner = childrenOf(items.last);
      expect(inner, hasLength(1));
      final SemanticsData button = inner.single.getSemanticsData();
      expect(button.hasFlag(SemanticsFlag.isButton), isTrue);
      expect(button.label, 'Wi-Fi');
      expect(button.hint, 'Connected');
      expect(button.hasAction(SemanticsAction.tap), isTrue);
      expect(button.hasFlag(SemanticsFlag.isFocusable), isTrue);
      handle.dispose();
    });

    testWidgets('LST-12: single or multiple exposes each item as a list item with its selected '
        'state, named by the label, and ignores onTap', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      int taps = 0;
      final List<Set<String>> changes = <Set<String>>[];
      await tester.pumpWidget(
        tanreiTestApp(
          Owner(
            mode: TanreiListSelectionMode.multiple,
            initial: const <String>{'bug'},
            changes: changes,
            children: <Widget>[
              option('Bug'),
              TanreiListTile<String>(value: 'docs', title: 'Docs', onTap: () => taps++),
            ],
          ),
        ),
      );
      final SemanticsNode listNode = nodeWithRole(tester, SemanticsRole.list);
      expect(listNode.getSemanticsData().label, 'Labels');
      final List<SemanticsNode> options = childrenOf(listNode);
      expect(options, hasLength(2));
      for (final (int i, SemanticsNode node) in options.indexed) {
        final SemanticsData data = node.getSemanticsData();
        expect(data.role, SemanticsRole.listItem);
        expect(data.hasFlag(SemanticsFlag.hasSelectedState), isTrue);
        expect(data.hasFlag(SemanticsFlag.isSelected), i == 0);
        expect(data.hasFlag(SemanticsFlag.isButton), isFalse);
        expect(data.hasAction(SemanticsAction.tap), isTrue);
        expect(childrenOf(node), isEmpty, reason: 'the content is presentational');
      }
      await tester.tap(tileOf('Docs'));
      await tester.pumpAndSettle();
      expect(taps, 0);
      expect(changes, <Set<String>>[
        <String>{'bug', 'docs'},
      ]);
      handle.dispose();
    });

    testWidgets('LST-23: the headline names an item and the overline, supporting text and '
        'trailing text describe it, in reading order; icons, the mark, the divider and the media '
        'are hidden', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(
        tanreiTestApp(
          list(
            selectionMode: TanreiListSelectionMode.single,
            selected: const <String>{'roadmap'},
            children: const <Widget>[
              TanreiListTile<String>(
                value: 'roadmap',
                title: 'Roadmap',
                overline: 'Engineering',
                subtitle: 'The plan for the next quarter',
                subtitleMaxLines: 1,
                trailingText: '9:41',
                leadingMedia: TanreiListLeadingMedia.image,
                leading: Text('R'),
                trailingIcon: Text('>'),
                divider: true,
              ),
            ],
          ),
        ),
      );
      final SemanticsNode node = childrenOf(nodeWithRole(tester, SemanticsRole.list)).single;
      final SemanticsData data = node.getSemanticsData();
      expect(data.label, 'Roadmap');
      expect(data.hint, 'Engineering\nThe plan for the next quarter\n9:41');
      expect(childrenOf(node), isEmpty);
      handle.dispose();
    });

    testWidgets('LST-23: an empty headline still renders and is reported once; a selectable list '
        'without a label is reported', (WidgetTester tester) async {
      final List<String> reports = collectMissingNames();
      Widget build(String title, String label) => tanreiTestApp(
        list(
          selectionMode: TanreiListSelectionMode.single,
          semanticLabel: label,
          children: <Widget>[option(title, value: 'a')],
        ),
      );
      await tester.pumpWidget(build('', 'Theme'));
      expect(find.byType(TanreiListTile<String>), findsOneWidget);
      expect(reports, <String>['list item']);
      await tester.pumpWidget(build('', 'Theme'));
      expect(reports, hasLength(1));
      await tester.pumpWidget(build('Light', ''));
      expect(reports, <String>['list item', 'list']);
      await tester.pumpWidget(build('Light', ''));
      expect(reports, hasLength(2));
      // A list that is not selectable needs no label.
      reports.clear();
      await tester.pumpWidget(
        tanreiTestApp(list(semanticLabel: '', children: <Widget>[action('Wi-Fi')])),
      );
      expect(reports, isEmpty);
      // The default reporter says what to set.
      debugTanreiReportMissingName = tanreiReportMissingName;
      await tester.pumpWidget(
        tanreiTestApp(
          list(
            semanticLabel: '',
            children: <Widget>[action('', key: UniqueKey())],
          ),
        ),
      );
      final Object? reported = tester.takeException();
      expect('$reported', contains('list item has no accessible name'));
      expect('$reported', contains('title'));
    });

    testWidgets('LST-24: the slots of an interactive item or an option are presentational — '
        'nothing in them is exposed on its own (the rule is stated in the README)', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(
        tanreiTestApp(
          list(
            children: <Widget>[
              TanreiListTile<String>(
                title: 'Ada',
                onTap: () {},
                leadingMedia: TanreiListLeadingMedia.avatar,
                leading: Semantics(label: 'Photo', image: true, child: const SizedBox.expand()),
                trailing: const Text('Online'),
              ),
            ],
          ),
        ),
      );
      final List<SemanticsNode> labelled = nodesBelow(
        nodeWithRole(tester, SemanticsRole.list),
      ).where((SemanticsNode n) => n.getSemanticsData().label.isNotEmpty).toList();
      expect(labelled.map((SemanticsNode n) => n.getSemanticsData().label), <String>['Ada']);
      handle.dispose();
    });

    for (final TanreiThemeData theme in <TanreiThemeData>[
      TanreiThemeData.light,
      TanreiThemeData.dark,
    ]) {
      testWidgets('guidelines: interactive items and options on ${theme.brightness.name}', (
        WidgetTester tester,
      ) async {
        final SemanticsHandle handle = tester.ensureSemantics();
        for (final TanreiListSelectionMode mode in TanreiListSelectionMode.values) {
          await tester.pumpWidget(
            tanreiTestApp(
              list(
                selectionMode: mode,
                selected: const <String>{'bug'},
                children: <Widget>[
                  TanreiListTile<String>(
                    value: 'bug',
                    title: 'Bug',
                    subtitle: '12 open issues',
                    trailingText: '12',
                    onTap: () {},
                  ),
                  TanreiListTile<String>(value: 'docs', title: 'Docs', onTap: () {}),
                ],
              ),
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
    }

    // WCAG 1.4.3 and 1.4.11 in every scheme of the default system: the texts need 4.5:1 and the
    // check 3:1 against their row at rest. An imitation preset is held to its original, not to
    // these criteria, in any scheme.
    test('contrast: "${system.id}" texts 4.5:1 and the check 3:1 on their row at rest', () {
      final List<String> failures = <String>[];
      for (final Brightness brightness in Brightness.values) {
        for (final TanreiContrast contrast in TanreiContrast.values) {
          final TanreiThemeData theme = TanreiThemeData(
            system: system,
            brightness: brightness,
            contrast: contrast,
          );
          for (final TanreiListCondition condition in TanreiListCondition.core) {
            final TanreiListConditionStateTokens rest = system.list.conditions[condition].enabled;
            final Color row = Color.alphaBlend(
              theme.paint(rest.containerColor),
              theme.colors.surface,
            );
            final String where = '${brightness.name} ${contrast.name} ${condition.name}';
            for (final (String part, TanreiPaint paint) in <(String, TanreiPaint)>[
              ('headline', rest.headlineColor),
              ('overline', rest.overlineColor),
              ('supporting', rest.supportingTextColor),
              ('trailing', rest.trailingTextColor),
            ]) {
              final double ratio = contrastOf(Color.alphaBlend(theme.paint(paint), row), row);
              if (ratio < 4.5) {
                failures.add('$where $part ${ratio.toStringAsFixed(2)}');
              }
            }
            if (condition == TanreiListCondition.selected) {
              final double ratio = contrastOf(
                Color.alphaBlend(theme.paint(rest.markColor), row),
                row,
              );
              if (ratio < 3) {
                failures.add('$where mark ${ratio.toStringAsFixed(2)}');
              }
            }
          }
        }
      }
      expect(failures, isEmpty);
    });
  });

  group('selection', () {
    testWidgets('LST-13: choosing an unselected option of a single-select list selects it and '
        'emits change once; choosing the selected one changes nothing', (
      WidgetTester tester,
    ) async {
      final List<Set<String>> changes = <Set<String>>[];
      await tester.pumpWidget(
        tanreiTestApp(
          Owner(
            mode: TanreiListSelectionMode.single,
            initial: const <String>{'light'},
            changes: changes,
            children: <Widget>[option('Light'), option('Dark')],
          ),
        ),
      );
      await tester.tap(tileOf('Dark'));
      await tester.pumpAndSettle();
      expect(changes, <Set<String>>[
        <String>{'dark'},
      ]);
      expect(markOf(tester, 'Dark').progress, 1);
      expect(markOf(tester, 'Light').progress, 0);
      await tester.tap(tileOf('Dark'));
      await tester.pumpAndSettle();
      expect(changes, hasLength(1));
    });

    testWidgets('LST-14: choosing an option of a multiple-select list switches it in or out and '
        'emits change once each time', (WidgetTester tester) async {
      final List<Set<String>> changes = <Set<String>>[];
      await tester.pumpWidget(
        tanreiTestApp(
          Owner(
            mode: TanreiListSelectionMode.multiple,
            initial: const <String>{'bug'},
            changes: changes,
            children: <Widget>[option('Bug'), option('Docs')],
          ),
        ),
      );
      await tester.tap(tileOf('Docs'));
      await tester.pumpAndSettle();
      await tester.tap(tileOf('Bug'));
      await tester.pumpAndSettle();
      expect(changes, <Set<String>>[
        <String>{'bug', 'docs'},
        <String>{'docs'},
      ]);
    });

    testWidgets('LST-26: an option is selected while the selection holds its value; a value that '
        'names no option selects nothing; an empty or repeated option value still renders; debug '
        'builds report each once', (WidgetTester tester) async {
      final List<String> reports = collectIgnoredValues();
      await tester.pumpWidget(
        tanreiTestApp(
          list(
            selectionMode: TanreiListSelectionMode.multiple,
            selected: const <String>{'bug', 'nothing'},
            children: <Widget>[
              option('Bug'),
              option('Also bug', value: 'bug'),
              option('Blank', value: ''),
            ],
          ),
        ),
      );
      expect(markOf(tester, 'Bug').progress, 1);
      expect(markOf(tester, 'Also bug').progress, 1, reason: 'they are selected together');
      expect(markOf(tester, 'Blank').progress, 0);
      expect(reports, hasLength(3));
      expect(reports, everyElement(startsWith('list selected')));
      expect(reports.join(), allOf(contains('"bug"'), contains('no value'), contains('"nothing"')));
      await tester.pumpWidget(
        tanreiTestApp(
          list(
            selectionMode: TanreiListSelectionMode.multiple,
            selected: const <String>{'bug', 'nothing'},
            children: <Widget>[
              option('Bug'),
              option('Also bug', value: 'bug'),
              option('Blank', value: ''),
            ],
          ),
        ),
      );
      expect(reports, hasLength(3), reason: 'not on every build');
      // A single-select list selects only the first value it is given.
      reports.clear();
      await tester.pumpWidget(
        tanreiTestApp(
          list(
            selectionMode: TanreiListSelectionMode.single,
            selected: const <String>{'light', 'dark'},
            children: <Widget>[option('Light'), option('Dark')],
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(markOf(tester, 'Light').progress, 1);
      expect(markOf(tester, 'Dark').progress, 0);
      expect(reports.single, contains('only the first'));
    });
  });

  group('keyboard', () {
    Widget five({
      FocusNode? before,
      FocusNode? after,
      Set<String> selected = const <String>{},
      Key? key,
    }) => tanreiTestApp(
      Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          if (before != null)
            Focus(focusNode: before, child: const SizedBox(width: 10, height: 10)),
          list(
            key: key,
            selectionMode: TanreiListSelectionMode.multiple,
            selected: selected,
            children: <Widget>[
              option('Bug'),
              option('Feature', enabled: false),
              option('Docs'),
              option('Design'),
              option('Build'),
            ],
          ),
          if (after != null) Focus(focusNode: after, child: const SizedBox(width: 10, height: 10)),
        ],
      ),
    );

    String focusedTitle(WidgetTester tester) =>
        FocusManager.instance.primaryFocus?.context
            ?.findAncestorWidgetOfExactType<TanreiListTile<String>>()
            ?.title ??
        '';

    testWidgets('LST-15: the list is one Tab stop — the first selected option, else the first '
        'enabled item, then the item focused last', (WidgetTester tester) async {
      final FocusNode before = FocusNode();
      final FocusNode after = FocusNode();
      addTearDown(before.dispose);
      addTearDown(after.dispose);
      await tester.pumpWidget(five(before: before, after: after, selected: const <String>{'docs'}));
      await tester.pump();
      before.requestFocus();
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(focusedTitle(tester), 'Docs');
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(after.hasPrimaryFocus, isTrue, reason: 'one Tab leaves the list');

      // A new list: nothing was focused in it yet.
      await tester.pumpWidget(five(before: before, after: after, key: UniqueKey()));
      await tester.pumpAndSettle();
      before.requestFocus();
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(focusedTitle(tester), 'Bug');
      await tester.sendKeyEvent(LogicalKeyboardKey.end);
      await tester.pumpAndSettle();
      expect(focusedTitle(tester), 'Build');
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pumpAndSettle();
      expect(after.hasPrimaryFocus, isTrue);
      await tester.sendKeyDownEvent(LogicalKeyboardKey.shift);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.shift);
      await tester.pumpAndSettle();
      expect(focusedTitle(tester), 'Build', reason: 'the item focused last');
    });

    testWidgets('LST-15: Down and Up Arrow move without wrapping and reach disabled items, Home '
        'and End go to the ends, and moving focus never changes the selection; Space activates', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final List<Set<String>> changes = <Set<String>>[];
      await tester.pumpWidget(
        tanreiTestApp(
          Owner(
            mode: TanreiListSelectionMode.multiple,
            changes: changes,
            children: <Widget>[option('Bug'), option('Feature', enabled: false), option('Docs')],
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(focusedTitle(tester), 'Bug');
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
      expect(focusedTitle(tester), 'Bug', reason: 'no wrap');
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pump();
      expect(focusedTitle(tester), 'Feature');
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pump();
      expect(focusedTitle(tester), 'Docs');
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pump();
      expect(focusedTitle(tester), 'Docs', reason: 'no wrap');
      await tester.sendKeyEvent(LogicalKeyboardKey.home);
      await tester.pump();
      expect(focusedTitle(tester), 'Bug');
      expect(changes, isEmpty);
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.end);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      expect(changes, <Set<String>>[
        <String>{'bug'},
        <String>{'bug', 'docs'},
      ]);
    });

    testWidgets('LST-15: typed characters move focus to the next item whose headline begins with '
        'them; within one second they extend the search, after it a new one starts', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(five());
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(focusedTitle(tester), 'Bug');
      await tester.sendKeyEvent(LogicalKeyboardKey.keyD);
      await tester.pump();
      expect(focusedTitle(tester), 'Docs');
      await tester.sendKeyEvent(LogicalKeyboardKey.keyE);
      await tester.pump();
      expect(focusedTitle(tester), 'Design', reason: '"de"');
      await tester.pump(tanreiTypeaheadWindow);
      await tester.sendKeyEvent(LogicalKeyboardKey.keyB);
      await tester.pump();
      expect(focusedTitle(tester), 'Build');
      await tester.sendKeyEvent(LogicalKeyboardKey.keyB);
      await tester.pump();
      expect(focusedTitle(tester), 'Bug', reason: 'the same letter again cycles');
      await tester.sendKeyEvent(LogicalKeyboardKey.keyF);
      await tester.pump();
      await tester.pump(tanreiTypeaheadWindow);
      expect(focusedTitle(tester), 'Bug', reason: '"bbf" matches nothing');
      await tester.sendKeyEvent(LogicalKeyboardKey.keyF);
      await tester.pump();
      expect(focusedTitle(tester), 'Feature', reason: 'disabled items are reached');
      await tester.pump(tanreiTypeaheadWindow);
    });

    testWidgets('LST-15: static items take no focus; the arrow keys pass over them', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(
          list(
            children: <Widget>[
              action('Wi-Fi'),
              const TanreiListTile<String>(title: 'Version'),
              action('Bluetooth'),
            ],
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(focusedTitle(tester), 'Wi-Fi');
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pump();
      expect(focusedTitle(tester), 'Bluetooth');
    });
  });
  group('layout', () {
    const Key lead = Key('lead');
    const Key trail = Key('trail');
    const Key control = Key('control');

    Widget full(TextDirection direction, {TanreiSystem of = system}) => tanreiTestApp(
      Directionality(
        textDirection: direction,
        child: list(
          selectionMode: TanreiListSelectionMode.single,
          selected: const <String>{'bug'},
          children: const <Widget>[
            TanreiListTile<String>(
              value: 'bug',
              title: 'Bug',
              trailingText: '12',
              leadingIcon: SizedBox.expand(key: lead),
              trailingIcon: SizedBox.expand(key: trail),
              trailing: SizedBox(key: control, width: 30, height: 10),
            ),
          ],
        ),
      ),
      theme: TanreiThemeData(system: of),
    );

    testWidgets('LST-16: an item is one row — start padding, leading icon, the text column, '
        'trailing text, trailing icon, trailing control and mark, a gap apart, end padding', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(full(TextDirection.ltr));
      final Rect row = tester.getRect(tileOf('Bug'));
      final double gap = listTokens.containerGap;
      final Rect icon = tester.getRect(find.byKey(lead));
      final Rect text = tester.getRect(find.text('Bug'));
      final Rect count = tester.getRect(find.text('12'));
      final Rect trailing = tester.getRect(find.byKey(trail));
      final Rect own = tester.getRect(find.byKey(control));
      final Rect mark = tester.getRect(
        find.descendant(
          of: tileOf('Bug'),
          matching: find.byWidgetPredicate(
            (Widget w) => w is CustomPaint && w.painter is TanreiCheckMarkPainter,
          ),
        ),
      );
      expect(icon.left - row.left, listTokens.containerPaddingInlineStart);
      expect(icon.width, listTokens.leadingIconSize);
      expect(text.left - icon.right, gap);
      expect(row.right - mark.right, listTokens.containerPaddingInlineEnd);
      expect(mark.size, Size.square(listTokens.markSize));
      expect(mark.left - own.right, gap);
      expect(own.left - trailing.right, gap);
      expect(trailing.width, listTokens.trailingIconSize);
      expect(trailing.left - count.right, gap);
      // The text column takes the remaining width.
      final Rect column = tester.getRect(
        find.ancestor(of: find.text('Bug'), matching: find.byType(ExcludeSemantics)).first,
      );
      expect(column.left, text.left);
    });

    testWidgets('LST-16: in right-to-left the row mirrors, and a ripple still grows from the '
        'point of contact', (WidgetTester tester) async {
      await tester.pumpWidget(full(TextDirection.rtl));
      final Rect row = tester.getRect(tileOf('Bug'));
      final Rect icon = tester.getRect(find.byKey(lead));
      final Rect text = tester.getRect(find.text('Bug'));
      final Rect mark = tester.getRect(
        find.descendant(
          of: tileOf('Bug'),
          matching: find.byWidgetPredicate(
            (Widget w) => w is CustomPaint && w.painter is TanreiCheckMarkPainter,
          ),
        ),
      );
      expect(row.right - icon.right, listTokens.containerPaddingInlineStart);
      expect(icon.left - text.right, listTokens.containerGap);
      expect(mark.left - row.left, listTokens.containerPaddingInlineEnd);

      await tester.pumpWidget(full(TextDirection.rtl, of: m3LikeSystem));
      final Rect box = tester.getRect(containerOfTile('Bug'));
      const Offset contact = Offset(24, 10);
      final TestGesture touch = await tester.startGesture(box.topLeft + contact);
      await tester.pump();
      expect(decorationOf(tester, 'Bug').ripple!.origin, contact);
      await touch.up();
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
    });

    testWidgets('LST-17: an item is one-line, two-line or three-line tall by its lines of text, '
        'padded by padding-block, and grows with enlarged text without clipping', (
      WidgetTester tester,
    ) async {
      Future<double> heightOf(TanreiListTile<String> tile, {double scale = 1}) async {
        await tester.pumpWidget(
          tanreiTestApp(
            MediaQuery(
              data: MediaQueryData(textScaler: TextScaler.linear(scale)),
              child: list(children: <Widget>[tile]),
            ),
          ),
        );
        expect(tester.takeException(), isNull);
        return tester.getSize(find.byType(TanreiListTile<String>)).height;
      }

      expect(await heightOf(const TanreiListTile<String>(title: 'A')), 48);
      expect(
        await heightOf(const TanreiListTile<String>(title: 'A', overline: 'B')),
        listTokens.containerHeightTwoLine,
      );
      expect(
        await heightOf(const TanreiListTile<String>(title: 'A', subtitle: 'B')),
        listTokens.containerHeightTwoLine,
      );
      expect(
        await heightOf(const TanreiListTile<String>(title: 'A', subtitle: 'B\nC')),
        listTokens.containerHeightThreeLine,
      );
      expect(
        await heightOf(const TanreiListTile<String>(title: 'A', overline: 'O', subtitle: 'B')),
        listTokens.containerHeightThreeLine,
      );
      expect(listTokens.containerHeightOneLine, 48);
      expect(listTokens.containerHeightTwoLine, 64);
      expect(listTokens.containerHeightThreeLine, 80);

      // At 200 % the row grows past its minimum and keeps padding-block below the text.
      const TanreiListTile<String> three = TanreiListTile<String>(
        title: 'A',
        overline: 'O',
        subtitle: 'B\nC',
      );
      final double large = await heightOf(three, scale: 2);
      expect(large, greaterThan(listTokens.containerHeightThreeLine));
      final Rect row = tester.getRect(find.byType(TanreiListTile<String>));
      final Rect last = tester.getRect(find.text('B\nC'));
      expect(row.bottom - last.bottom, moreOrLessEquals(listTokens.containerPaddingBlock));
      expect(tester.getRect(find.text('O')).top - row.top, listTokens.containerPaddingBlock);
    });

    testWidgets('LST-17: leading and trailing elements are centered on the text in a one- or '
        'two-line item and aligned with its top in a taller one', (WidgetTester tester) async {
      const Key media = Key('media');
      Future<void> pump(String subtitle) => tester.pumpWidget(
        tanreiTestApp(
          list(
            children: <Widget>[
              TanreiListTile<String>(
                title: 'Ada',
                subtitle: subtitle,
                trailingText: '9',
                leadingMedia: TanreiListLeadingMedia.image,
                leading: const SizedBox.expand(key: media),
              ),
            ],
          ),
        ),
      );
      await pump('One');
      Rect text = tester
          .getRect(find.text('Ada'))
          .expandToInclude(tester.getRect(find.text('One')));
      expect(tester.getRect(find.byKey(media)).center.dy, moreOrLessEquals(text.center.dy));
      expect(tester.getRect(find.text('9')).center.dy, moreOrLessEquals(text.center.dy));
      await pump('One\nTwo');
      text = tester.getRect(find.text('Ada'));
      expect(tester.getRect(find.byKey(media)).top, text.top);
      expect(tester.getRect(find.text('9')).top, text.top);
    });

    testWidgets('LST-18: headline, overline, supporting and trailing text in their text styles; '
        'the headline wraps; the supporting text ends with an ellipsis after subtitleMaxLines and '
        'its full text still reaches assistive technology', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      const String long = 'The plan for the next quarter, with milestones, owners and the risks.';
      await tester.pumpWidget(
        tanreiTestApp(
          list(
            children: <Widget>[
              TanreiListTile<String>(
                title: 'A headline long enough to wrap onto a second line',
                overline: 'Engineering',
                subtitle: long,
                subtitleMaxLines: 2,
                trailingText: '9:41',
                onTap: () {},
              ),
            ],
          ),
        ),
      );
      void expectStyle(String text, TanreiTextStyle token) {
        final TextStyle style = textStyleOf(tester, text);
        expect(style.fontSize, token.size, reason: text);
        expect(style.height, token.lineHeight / token.size, reason: text);
      }

      expectStyle(
        'A headline long enough to wrap onto a second line',
        listTokens.headlineTypescale,
      );
      expectStyle('Engineering', listTokens.overlineTypescale);
      expectStyle(long, listTokens.supportingTextTypescale);
      expectStyle('9:41', listTokens.trailingTextTypescale);
      final Text headline = tester.widget(
        find.text('A headline long enough to wrap onto a second line'),
      );
      expect(headline.maxLines, isNull);
      expect(
        tester.getSize(find.text('A headline long enough to wrap onto a second line')).height,
        greaterThan(listTokens.headlineTypescale.lineHeight),
      );
      final Text supporting = tester.widget(find.text(long));
      expect(supporting.maxLines, 2);
      expect(supporting.overflow, TextOverflow.ellipsis);
      expect(
        tester.getSize(find.text(long)).height,
        2 * listTokens.supportingTextTypescale.lineHeight,
      );
      expect(find.semantics.byHint('Engineering\n$long\n9:41'), findsOne);
      handle.dispose();
    });

    testWidgets('LST-19: the icons are drawn through the icon helper at their sizes, with the '
        'selection of the item; an empty one draws nothing and leaves no space', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(
          list(
            selectionMode: TanreiListSelectionMode.single,
            selected: const <String>{'bug'},
            children: const <Widget>[
              TanreiListTile<String>(
                value: 'bug',
                title: 'Bug',
                leadingIcon: Text('L'),
                trailingIcon: Text('T'),
              ),
              TanreiListTile<String>(value: 'docs', title: 'Docs', leadingIcon: Text('D')),
              TanreiListTile<String>(value: 'none', title: 'None'),
            ],
          ),
        ),
      );
      List<TanreiControlIcon> iconsOf(String title) => tester
          .widgetList<TanreiControlIcon>(
            find.descendant(of: tileOf(title), matching: find.byType(TanreiControlIcon)),
          )
          .toList();
      final List<TanreiControlIcon> bug = iconsOf('Bug');
      expect(bug.map((TanreiControlIcon i) => i.size), <double>[
        listTokens.leadingIconSize,
        listTokens.trailingIconSize,
      ]);
      expect(bug.every((TanreiControlIcon i) => i.selected), isTrue);
      final TanreiListConditionStateTokens selected = listTokens.conditions.selected.enabled;
      expect(bug.first.color, lightTheme.paint(selected.leadingIconColor));
      expect(bug.last.color, lightTheme.paint(selected.trailingIconColor));
      expect(iconsOf('Docs').single.selected, isFalse);
      expect(iconsOf('None'), isEmpty);
      expect(
        tester.getRect(find.text('None')).left - tester.getRect(tileOf('None')).left,
        listTokens.containerPaddingInlineStart,
      );
    });

    testWidgets('LST-20: an avatar or an image frames the leading slot in its box and shape, '
        'filled with the media container color and handing it the media content color; an '
        'avatar\'s monogram is centred in the headline style; with none the slot is not drawn, and '
        'media replaces the leading icon', (WidgetTester tester) async {
      const Key slot = Key('slot');
      Future<void> pump(TanreiListLeadingMedia media) => tester.pumpWidget(
        tanreiTestApp(
          list(
            children: <Widget>[
              TanreiListTile<String>(
                title: 'Ada',
                leadingMedia: media,
                leadingIcon: const Text('I'),
                leading: const Text('A', key: slot),
              ),
            ],
          ),
        ),
      );
      for (final (TanreiListLeadingMedia media, double size, double radius)
          in <(TanreiListLeadingMedia, double, double)>[
            (TanreiListLeadingMedia.avatar, listTokens.avatarSize, listTokens.avatarShape),
            (TanreiListLeadingMedia.image, listTokens.imageSize, listTokens.imageShape),
          ]) {
        await pump(media);
        final Finder box = find.ancestor(of: find.byKey(slot), matching: find.byType(ClipPath));
        expect(tester.getSize(box), Size.square(size), reason: media.name);
        final CustomClipper<Path> clipper = tester.widget<ClipPath>(box).clipper!;
        expect(
          clipper.getClip(Size.square(size)).getBounds(),
          TanreiCornerShape(
            smoothing: 0,
            radius: radius,
          ).path(Offset.zero & Size.square(size)).getBounds(),
        );
        expect(
          tester
              .widget<ColoredBox>(
                find.ancestor(of: find.byKey(slot), matching: find.byType(ColoredBox)).first,
              )
              .color,
          light.surfaceContainerHighest,
        );
        expect(textColor(tester, 'A'), lightTheme.paint(listTokens.mediaContentColor));
        if (media == TanreiListLeadingMedia.avatar) {
          // A monogram is centred and set in the headline's style.
          expect(tester.getCenter(find.byKey(slot)), tester.getCenter(box));
          expect(textStyleOf(tester, 'A').fontSize, listTokens.headlineTypescale.size);
          expect(
            textStyleOf(tester, 'A').height,
            listTokens.headlineTypescale.lineHeight / listTokens.headlineTypescale.size,
          );
        }
        expect(find.text('I'), findsNothing, reason: 'media replaces the icon');
      }
      await pump(TanreiListLeadingMedia.none);
      expect(find.byKey(slot), findsNothing);
      expect(find.text('I'), findsOneWidget);
    });

    testWidgets('LST-21: every option reserves the mark box; a selected one strokes the check at '
        'mark.width in its mark color, drawn in over the state motion — at once where motion is '
        'reduced', (WidgetTester tester) async {
      Future<void> pump(Set<String> selected, {bool reduce = false}) => tester.pumpWidget(
        tanreiTestApp(
          list(
            selectionMode: TanreiListSelectionMode.single,
            selected: selected,
            children: <Widget>[option('Light'), option('Dark')],
          ),
          disableAnimations: reduce,
        ),
      );
      await pump(const <String>{'light'});
      final TanreiCheckMarkPainter on = markOf(tester, 'Light');
      expect(on.progress, 1);
      expect(on.width, listTokens.markWidth);
      expect(on.color, lightTheme.paint(listTokens.conditions.selected.enabled.markColor));
      expect(on.color, light.primary);
      final TanreiCheckMarkPainter off = markOf(tester, 'Dark');
      expect(off.progress, 0);
      expect(off.color.a, 0);
      expect(
        tester.getSize(
          find.descendant(
            of: tileOf('Dark'),
            matching: find.byWidgetPredicate(
              (Widget w) => w is CustomPaint && w.painter is TanreiCheckMarkPainter,
            ),
          ),
        ),
        Size.square(listTokens.markSize),
      );
      // Pixels: the check is drawn in the mark color.
      final Color fill = lightTheme.paint(listTokens.conditions.selected.enabled.containerColor);
      expect(fillOf(tester, 'Light'), fill);

      await pump(const <String>{'dark'});
      await tester.pump(tanreiDuration(listTokens.motionStateDuration) ~/ 2);
      final double midway = listTokens.motionStateEasing.toCurve().transform(0.5);
      expect(markOf(tester, 'Dark').progress, moreOrLessEquals(midway));
      expect(markOf(tester, 'Light').progress, moreOrLessEquals(1 - midway));
      expect(fillOf(tester, 'Dark'), isNot(fill));
      await tester.pumpAndSettle();
      expect(markOf(tester, 'Dark').progress, 1);
      expect(fillOf(tester, 'Dark'), fill);

      await pump(const <String>{'light'}, reduce: true);
      await tester.pump();
      expect(markOf(tester, 'Light').progress, 1);
      expect(markOf(tester, 'Dark').progress, 0);
    });

    testWidgets(
      'LST-22: a divider is drawn along the bottom of the item from the start of the text '
      'column to the row end, in its color in every state, and is not exposed',
      (WidgetTester tester) async {
        final SemanticsHandle handle = tester.ensureSemantics();
        final Widget subject = list(
          children: <Widget>[
            action('Inbox', leadingIcon: const Text('I'), divider: true),
            action('Sent'),
          ],
        );
        final GlobalKey boundary = await pumpFixtureFrame(
          tester,
          system: system,
          surface: listGoldenSurface,
          child: subject,
        );
        FramePixels pixels = await captureFrame(tester, boundary);
        final Rect frame = tester.getRect(find.byType(RepaintBoundary).first);
        final Rect row = tester.getRect(tileOf('Inbox')).shift(-frame.topLeft);
        final double start =
            listTokens.containerPaddingInlineStart +
            listTokens.leadingIconSize +
            listTokens.containerGap;
        final double y = row.bottom - listTokens.dividerThickness / 2;
        final Color line = lightTheme.paint(listTokens.dividerColor);
        expect(
          pixels.atLogical(Offset(row.left + start + 2, y)),
          looksLike(Color.alphaBlend(line, light.surface)),
        );
        expect(
          pixels.atLogical(Offset(row.right - 1, y)),
          looksLike(Color.alphaBlend(line, light.surface)),
        );
        expect(pixels.atLogical(Offset(row.left + start - 2, y)), looksLike(light.surface));
        // Hovered, the row is filled and the line keeps its color.
        await hoverOver(tester, tileOf('Inbox'));
        final Color hovered = fillOf(tester, 'Inbox');
        expect(hovered.a, greaterThan(0));
        pixels = await captureFrame(tester, boundary);
        // The same line over the hovered row.
        expect(
          pixels.atLogical(Offset(row.left + start + 2, y)),
          looksLike(Color.alphaBlend(line, Color.alphaBlend(hovered, light.surface))),
        );
        // Only the two items are exposed: the line is painted, not a node.
        expect(
          nodesBelow(nodeWithRole(tester, SemanticsRole.list))
              .where((SemanticsNode n) => n.getSemanticsData().label.isNotEmpty)
              .map((SemanticsNode n) => n.getSemanticsData().label),
          <String>['Inbox', 'Sent'],
        );
        handle.dispose();
      },
    );
  });

  group('motion', () {
    testWidgets(
      'LST-25: a change of state animates the colors over comp.list.motion.state-duration '
      'with its easing, and at once where motion is reduced',
      (WidgetTester tester) async {
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        final TanreiListConditionTokens unselected = listTokens.conditions.unselected;
        final Color resting = lightTheme.paint(unselected.enabled.containerColor);
        final Color hovered = lightTheme.paint(unselected.hovered.containerColor);
        final Duration third = Duration(milliseconds: listTokens.motionStateDuration ~/ 3);
        Future<TestGesture> hover({required bool reduce}) async {
          await tester.pumpWidget(
            tanreiTestApp(
              list(children: <Widget>[action('Wi-Fi', key: UniqueKey())]),
              disableAnimations: reduce,
            ),
          );
          final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
          await mouse.addPointer(location: Offset.zero);
          await mouse.moveTo(tester.getCenter(tileOf('Wi-Fi')));
          await tester.pump();
          return mouse;
        }

        final TestGesture mouse = await hover(reduce: false);
        await tester.pump(third);
        final double progress = listTokens.motionStateEasing.toCurve().transform(1 / 3);
        expect(fillOf(tester, 'Wi-Fi'), isSameColorAs(tanreiLerpColor(resting, hovered, progress)));
        await tester.pump(tanreiDuration(listTokens.motionStateDuration));
        expect(fillOf(tester, 'Wi-Fi'), hovered);
        await mouse.removePointer();

        final TestGesture again = await hover(reduce: true);
        expect(fillOf(tester, 'Wi-Fi'), hovered);
        await again.removePointer();
      },
    );
  });

  group('a design system drives rendering', () {
    test('the tokens the widget reads: their default values', () {
      expect(listTokens.containerPaddingInlineStart, system.space.space200);
      expect(listTokens.containerPaddingInlineEnd, system.space.space200);
      expect(listTokens.containerPaddingBlock, system.space.space100);
      expect(listTokens.containerGap, system.space.space150);
      expect(listTokens.headlineTypescale, system.typescale.body);
      expect(listTokens.avatarSize, 40);
      expect(listTokens.imageSize, 48);
      expect(
        lightTheme.paint(listTokens.conditions.selected.enabled.containerColor),
        light.secondaryContainer,
      );
      expect(lightTheme.paint(listTokens.conditions.unselected.enabled.containerColor).a, 0);
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": options at rest draw the enabled tokens of that system', (
        WidgetTester tester,
      ) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        await tester.pumpWidget(
          tanreiTestApp(
            list(
              selectionMode: TanreiListSelectionMode.single,
              selected: const <String>{'light'},
              children: <Widget>[option('Light'), option('Dark')],
            ),
            theme: theme,
          ),
        );
        for (final (String title, TanreiListCondition condition) in <(String, TanreiListCondition)>[
          ('Light', TanreiListCondition.selected),
          ('Dark', TanreiListCondition.unselected),
        ]) {
          final TanreiListConditionStateTokens rest = shipped.list.conditions[condition].enabled;
          expect(fillOf(tester, title), theme.paint(rest.containerColor));
          expect(textColor(tester, title), theme.paint(rest.headlineColor));
          expect(decorationOf(tester, title).shape.smoothing, shipped.shape.cornerSmoothing);
          expect(
            tester.getSize(tileOf(title)).height,
            math.max(shipped.list.containerHeightOneLine, shipped.measure.targetTouch),
          );
        }
      });
    }
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('list');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'one-line',
        'leading-icon',
        'two-line-avatar',
        'three-line-image',
        'interactive',
        'dividers',
        'interactive-disabled',
        'single-selected',
        'multiple-selected',
        'selected-disabled',
        'unselected-disabled',
      ]);
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          surface: listGoldenSurface,
          child: fixtureList(fixture),
          file: 'goldens/list/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: the multiple-select list shows
    // the preset's row heights, paddings, text styles, icons, selected fill and check at once.
    const String recorded = 'multiple-selected';
    for (final TanreiSystem preset in <TanreiSystem>[
      m3LikeSystem,
      m3ExpressiveLikeSystem,
      cupertinoSystem,
    ]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: listGoldenSurface,
          child: fixtureList(fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded)),
          file: 'goldens/list/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
