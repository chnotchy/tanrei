import 'dart:ui' show PointerDeviceKind, SemanticsRole;

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
import '../systems.dart';
import 'fixture_golden.dart';
import 'navigation_harness.dart';
import 'sheet_harness.dart';

const TanreiSystem system = tanreiSystem;
final TanreiCarouselTokens carouselTokens = system.carousel;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The stage of every carousel fixture: 400 x 200; the carousel fills it (W 368).
const Size stage = Size(400, 200);

/// The frame of the carousel baselines: the stage in the `space200` padding of every baseline.
final Size carouselGoldenSurface = Size(
  stage.width + 2 * system.space.space200,
  stage.height + 2 * system.space.space200,
);

final List<Map<String, dynamic>> fixtures = specFixtures('carousel');

/// The fixtures' glyphs, as Material Symbols code points (drawn as text by the icon helper).
const Map<String, int> carouselGlyphs = <String, int>{
  'landscape': 0xe3f7,
  'forest': 0xea99,
  'water': 0xf084,
  'park': 0xea63,
  'sunny': 0xe81a,
  'filter_hdr': 0xe3d3,
};

/// A fixture item's content: its glyph centred at `sys.icon.large`, unselected, in the content
/// color the item hands down.
Widget glyphContent(String name) => Center(
  child: Builder(
    builder: (BuildContext context) => TanreiControlIcon(
      icon: Text(String.fromCharCode(carouselGlyphs[name] ?? 0x3f)),
      size: TanreiTheme.of(context).system.measure.iconLarge,
      selected: false,
      color: IconTheme.of(context).color!,
    ),
  ),
);

/// The carousel a fixture describes, filling the stage.
Widget fixtureCarousel(Map<String, dynamic> fixture) {
  final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
  return SizedBox.fromSize(
    size: stage,
    child: TanreiCarousel(
      layout: TanreiCarouselLayout.fromName(props['layout'] as String? ?? 'multi-browse'),
      itemWidth: (props['itemWidth'] as num?)?.toDouble(),
      semanticLabel: props['label'] as String? ?? '',
      children: <TanreiCarouselItem>[
        for (final Map<String, dynamic> item
            in (fixture['items'] as List<dynamic>).cast<Map<String, dynamic>>())
          TanreiCarouselItem(
            label: (item['props'] as Map<String, dynamic>)['label'] as String? ?? '',
            onTap: () {},
            child: glyphContent(item['content'] as String),
          ),
      ],
    ),
  );
}

/// [count] items labelled 'Item 0' …, each recording its taps in [taps].
List<TanreiCarouselItem> items(int count, {List<int>? taps, List<Key>? keys}) =>
    <TanreiCarouselItem>[
      for (int i = 0; i < count; i++)
        TanreiCarouselItem(
          key: keys?[i],
          label: 'Item $i',
          onTap: () => taps?.add(i),
          child: Center(child: Text('$i')),
        ),
    ];

/// A carousel [width] wide at the top start of the window, above a Before and an After button.
Widget carouselPage(Widget carousel, {double width = 400, bool buttons = false}) => Align(
  alignment: AlignmentDirectional.topStart,
  child: SizedBox(
    width: width,
    child: buttons
        ? Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              TanreiButton(onPressed: () {}, child: const Text('Before')),
              carousel,
              TanreiButton(onPressed: () {}, child: const Text('After')),
            ],
          )
        : carousel,
  ),
);

Future<void> pumpCarousel(WidgetTester tester, Widget app, {Size window = const Size(800, 400)}) =>
    pumpInWindow(tester, app, window);

Finder itemFinder(int i) => find.byType(TanreiCarouselItem).at(i);

/// Item [i]'s drawn rect, relative to the carousel's left edge.
Rect itemRect(WidgetTester tester, int i) =>
    tester.getRect(itemFinder(i)).shift(-tester.getTopLeft(find.byType(TanreiCarousel)));

Finder itemContainer(int i) => find.descendant(
  of: itemFinder(i),
  matching: find.byWidgetPredicate(
    (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
  ),
);

/// The item's state layer over its content (with the ripple).
TanreiContainerDecoration itemDecoration(WidgetTester tester, int i) =>
    tester.widget<DecoratedBox>(itemContainer(i).at(1)).decoration as TanreiContainerDecoration;

/// The state layer's color (clear for none).
Color itemLayer(WidgetTester tester, int i) =>
    itemDecoration(tester, i).color ?? const Color(0x00000000);

/// The resting fill under the item's content.
Color itemFill(WidgetTester tester, int i) =>
    (tester.widget<DecoratedBox>(itemContainer(i).first).decoration as TanreiContainerDecoration)
        .color ??
    const Color(0x00000000);

/// CRL-16: the state layer of [state] in [theme]: the part's state-layer color at the system's
/// state-layer opacity, clear at rest.
Color expectedLayer(TanreiThemeData theme, TanreiInteractionState state) {
  final TanreiState opacities = theme.system.state;
  final double opacity = switch (state) {
    TanreiInteractionState.hovered => opacities.hoverStateLayerOpacity,
    TanreiInteractionState.focused => opacities.focusStateLayerOpacity,
    TanreiInteractionState.pressed => opacities.pressedStateLayerOpacity,
    TanreiInteractionState.enabled || TanreiInteractionState.disabled => 0,
  };
  final Color color = theme.paint(theme.system.carousel.parts.item.of(state).stateLayerColor);
  return color.withValues(alpha: color.a * opacity);
}

double itemOpacity(WidgetTester tester, int i) => tester
    .widget<Opacity>(find.descendant(of: itemFinder(i), matching: find.byType(Opacity)).first)
    .opacity;

TanreiFocusRing itemRing(WidgetTester tester, int i) => tester.widget<TanreiFocusRing>(
  find.descendant(of: itemFinder(i), matching: find.byType(TanreiFocusRing)),
);

ScrollPosition carouselPosition(WidgetTester tester) => tester
    .state<ScrollableState>(
      find.descendant(of: find.byType(TanreiCarousel), matching: find.byType(Scrollable)),
    )
    .position;

String focusedItemLabel() {
  final BuildContext? context = FocusManager.instance.primaryFocus?.context;
  if (context == null) {
    return '';
  }
  String? found;
  context.visitAncestorElements((Element element) {
    final Widget widget = element.widget;
    if (widget is TanreiCarouselItem) {
      found = widget.label;
      return false;
    }
    if (widget is TanreiButton) {
      found = (widget.child as Text?)?.data;
      return false;
    }
    return true;
  });
  return found ?? '';
}

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  final double pad = carouselTokens.layoutPaddingInline;
  final double gap = carouselTokens.layoutGap;
  final Duration hold = tanreiDuration(system.motion.duration.pressHold);
  final Duration scroll = tanreiDuration(carouselTokens.motionScrollDuration);
  const Duration tick = Duration(milliseconds: 1);

  /// The drawn widths of the items in view (inside the carousel), in order.
  List<double> widthsInView(WidgetTester tester, int count, double width) => <double>[
    for (int i = 0; i < count; i++)
      if (itemRect(tester, i).right > 0.01 && itemRect(tester, i).left < width - 0.01)
        itemRect(tester, i).width,
  ];

  group('layout', () {
    testWidgets('CRL-8: as wide as its parent and layout.height tall, items as tall, in order, gap '
        'apart inside padding-inline, scrolling under the padding and clipped at the edges', (
      WidgetTester tester,
    ) async {
      await pumpCarousel(
        tester,
        sheetApp(carouselPage(TanreiCarousel(semanticLabel: 'Walks', children: items(6)))),
      );
      expect(tester.getSize(find.byType(TanreiCarousel)), Size(400, carouselTokens.layoutHeight));
      expect(itemRect(tester, 0).left, pad);
      expect(itemRect(tester, 0).height, carouselTokens.layoutHeight);
      expect(itemRect(tester, 1).left - itemRect(tester, 0).right, moreOrLessEquals(gap));
      expect(itemRect(tester, 2).left - itemRect(tester, 1).right, moreOrLessEquals(gap));
      expect(itemRect(tester, 2).right, moreOrLessEquals(400 - pad));
      // Scrolled a little, the first item passes under the padding to the edge.
      carouselPosition(tester).jumpTo(20);
      await tester.pump();
      expect(itemRect(tester, 0).left, lessThan(pad));

      // A tight height from the parent is taken.
      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(
            SizedBox(
              height: 120,
              child: TanreiCarousel(key: UniqueKey(), semanticLabel: 'Walks', children: items(6)),
            ),
          ),
        ),
      );
      expect(tester.getSize(find.byType(TanreiCarousel)).height, 120);
      expect(itemRect(tester, 0).height, 120);
    });

    testWidgets('CRL-9: itemWidth sets the large width, capped to leave two small slots in '
        'multi-browse and to W uncontained; a row narrower than three small slots lays every item '
        'out W wide in every layout', (WidgetTester tester) async {
      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(TanreiCarousel(itemWidth: 1000, semanticLabel: 'Walks', children: items(4))),
        ),
      );
      // W 368: L at most 368 - 2 * (40 + 8) = 272.
      expect(itemRect(tester, 0).width, moreOrLessEquals(272));
      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(
            TanreiCarousel(
              key: UniqueKey(),
              layout: TanreiCarouselLayout.uncontained,
              itemWidth: 1000,
              semanticLabel: 'Walks',
              children: items(4),
            ),
          ),
        ),
      );
      expect(itemRect(tester, 0).width, moreOrLessEquals(368));
      // W 100 < 3 * 40 + 2 * 8: one slot W wide.
      for (final TanreiCarouselLayout layout in TanreiCarouselLayout.values) {
        await pumpCarousel(
          tester,
          sheetApp(
            carouselPage(
              TanreiCarousel(
                key: UniqueKey(),
                layout: layout,
                semanticLabel: 'Walks',
                children: items(4),
              ),
              width: 132,
            ),
          ),
        );
        expect(itemRect(tester, 0).width, moreOrLessEquals(100), reason: '$layout');
        expect(itemRect(tester, 1).left, moreOrLessEquals(132), reason: '$layout: slot K');
      }
    });

    testWidgets('CRL-10: multi-browse fills W with n large, one medium and one small slot: the '
        'worked examples', (WidgetTester tester) async {
      Future<List<double>> widths(double inner, double? itemWidth) async {
        final double width = inner + 2 * pad;
        await pumpCarousel(
          tester,
          sheetApp(
            carouselPage(
              TanreiCarousel(
                key: UniqueKey(),
                itemWidth: itemWidth,
                semanticLabel: 'Walks',
                children: items(8),
              ),
              width: width,
            ),
          ),
        );
        return widthsInView(tester, 8, width);
      }

      void expectWidths(List<double> actual, List<double> expected) {
        expect(actual, hasLength(expected.length));
        for (int i = 0; i < expected.length; i++) {
          expect(actual[i], moreOrLessEquals(expected[i], epsilon: 0.01));
        }
      }

      expectWidths(await widths(368, null), <double>[200, 101.33, 50.67]);
      expectWidths(await widths(368, 120), <double>[120, 120, 64, 40]);
      expectWidths(await widths(768, null), <double>[200, 200, 200, 90.67, 45.33]);
      expectWidths(await widths(460, 120), <double>[120, 120, 120, 76]);
    });

    testWidgets('CRL-11: hero lays out one large slot W - g - small-max-width and one small slot '
        'small-max-width, and ignores itemWidth', (WidgetTester tester) async {
      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(
            TanreiCarousel(
              layout: TanreiCarouselLayout.hero,
              itemWidth: 120,
              semanticLabel: 'Featured',
              children: items(4),
            ),
          ),
        ),
      );
      final List<double> inView = widthsInView(tester, 4, 400);
      expect(inView, hasLength(2));
      expect(inView[0], moreOrLessEquals(304));
      expect(inView[1], moreOrLessEquals(56));
    });

    testWidgets('CRL-12: items sit at slot i - p, interpolated between the slots around it; the '
        'worked example at p 0.5; at the end of the range the last item is large', (
      WidgetTester tester,
    ) async {
      await pumpCarousel(
        tester,
        sheetApp(carouselPage(TanreiCarousel(semanticLabel: 'Walks', children: items(6)))),
      );
      final double step = 200 + gap;
      carouselPosition(tester).jumpTo(step / 2);
      await tester.pump();
      void expectItem(int i, double width, double start) {
        expect(
          itemRect(tester, i).width,
          moreOrLessEquals(width, epsilon: 0.01),
          reason: 'item $i',
        );
        expect(
          itemRect(tester, i).left,
          moreOrLessEquals(pad + start, epsilon: 0.01),
          reason: 'item $i',
        );
      }

      expectItem(0, 125.33, -33.33);
      expectItem(1, 150.67, 104);
      expectItem(2, 76, 262.67);
      expectItem(3, 50.67, 350.67);
      expect(itemRect(tester, 4).left, greaterThanOrEqualTo(400));
      expect(itemRect(tester, 5).left, greaterThanOrEqualTo(400));

      expect(carouselPosition(tester).maxScrollExtent, moreOrLessEquals(5 * step));
      carouselPosition(tester).jumpTo(5 * step);
      await tester.pump();
      expect(itemRect(tester, 5).width, moreOrLessEquals(200));
      expect(itemRect(tester, 5).left, moreOrLessEquals(pad));
    });

    testWidgets(
      'CRL-13: uncontained lays every item out L wide, gap apart from the inner start, '
      'scrolls freely to where the last item ends at the inner end, and not at all when they fit',
      (WidgetTester tester) async {
        await pumpCarousel(
          tester,
          sheetApp(
            carouselPage(
              TanreiCarousel(
                layout: TanreiCarouselLayout.uncontained,
                semanticLabel: 'Walks',
                children: items(5),
              ),
            ),
          ),
        );
        expect(itemRect(tester, 0), Rect.fromLTWH(pad, 0, 200, carouselTokens.layoutHeight));
        expect(itemRect(tester, 1).left, pad + 200 + gap);
        expect(carouselPosition(tester).maxScrollExtent, 5 * 200 + 4 * gap - 368);
        await tester.timedDragFrom(
          const Offset(200, 100),
          const Offset(-70, 0),
          const Duration(seconds: 1),
        );
        await tester.pump();
        final double released = carouselPosition(tester).pixels;
        expect(released, greaterThan(40));
        await tester.pumpAndSettle();
        expect(carouselPosition(tester).pixels, released, reason: 'free: no settling');

        await pumpCarousel(
          tester,
          sheetApp(
            carouselPage(
              TanreiCarousel(
                key: UniqueKey(),
                layout: TanreiCarouselLayout.uncontained,
                itemWidth: 100,
                semanticLabel: 'Walks',
                children: items(3),
              ),
            ),
          ),
        );
        expect(carouselPosition(tester).maxScrollExtent, 0);
      },
    );

    testWidgets('CRL-15: each item\'s content is laid out at the large slot\'s width and the full '
        'height, centred on the container and clipped to its shape', (WidgetTester tester) async {
      await pumpCarousel(
        tester,
        sheetApp(carouselPage(TanreiCarousel(semanticLabel: 'Walks', children: items(6)))),
      );
      for (final int i in <int>[0, 1, 2]) {
        final Finder box = find.descendant(of: itemFinder(i), matching: find.byType(OverflowBox));
        final Rect content = tester.getRect(
          find.descendant(of: box, matching: find.byType(Center)).first,
        );
        expect(content.width, moreOrLessEquals(200), reason: 'item $i');
        expect(content.height, carouselTokens.layoutHeight);
        expect(content.center.dx, moreOrLessEquals(tester.getRect(itemFinder(i)).center.dx));
      }
      expect(find.descendant(of: itemFinder(2), matching: find.byType(ClipPath)), findsOneWidget);
    });

    testWidgets('CRL-16: each item\'s container is filled with item.container.color under its '
        'content, and the content gets item.content.color as its text and icon color', (
      WidgetTester tester,
    ) async {
      await pumpCarousel(
        tester,
        sheetApp(carouselPage(TanreiCarousel(semanticLabel: 'Walks', children: items(3)))),
      );
      final TanreiCarouselPartStateTokens rest = carouselTokens.parts.item.enabled;
      expect(itemFill(tester, 0), lightTheme.paint(rest.containerColor));
      expect(itemLayer(tester, 0).a, 0, reason: 'no state layer at rest');
      // The state layer is drawn over the content, the resting fill under it.
      final TestGesture press = await tester.startGesture(tester.getCenter(itemFinder(0)));
      await tester.pump();
      expect(itemFill(tester, 0), lightTheme.paint(rest.containerColor));
      expect(itemLayer(tester, 0), expectedLayer(lightTheme, TanreiInteractionState.pressed));
      expect(
        tester.widget<DecoratedBox>(itemContainer(0).at(1)).position,
        DecorationPosition.foreground,
      );
      await press.up();
      await tester.pumpAndSettle();
      final TextStyle style = tester
          .widget<RichText>(find.descendant(of: itemFinder(0), matching: find.byType(RichText)))
          .text
          .style!;
      expect(style.color, lightTheme.paint(rest.contentColor));
      expect(
        IconTheme.of(
          tester.element(find.descendant(of: itemFinder(0), matching: find.text('0'))),
        ).color,
        lightTheme.paint(rest.contentColor),
      );
    });

    testWidgets('CRL-21: a new width or new items keep the item in place where it was, without '
        'motion', (WidgetTester tester) async {
      final List<Key> keys = <Key>[for (int i = 0; i < 8; i++) ValueKey<int>(i)];
      late StateSetter setPage;
      double width = 400;
      List<TanreiCarouselItem> children = items(8, keys: keys);
      await pumpCarousel(
        tester,
        sheetApp(
          StatefulBuilder(
            builder: (BuildContext context, StateSetter set) {
              setPage = set;
              return carouselPage(
                TanreiCarousel(semanticLabel: 'Walks', children: children),
                width: width,
              );
            },
          ),
        ),
      );
      carouselPosition(tester).jumpTo(2 * (200 + gap));
      await tester.pump();
      expect(itemRect(tester, 2).left, pad);
      setPage(() => width = 600);
      await tester.pump();
      expect(itemRect(tester, 2).left, moreOrLessEquals(pad), reason: 'same item in place');
      // An item inserted before it.
      setPage(() {
        children = <TanreiCarouselItem>[
          TanreiCarouselItem(
            key: const ValueKey<String>('new'),
            label: 'New',
            onTap: () {},
            child: const SizedBox(),
          ),
          ...items(8, keys: keys),
        ];
      });
      await tester.pump();
      await tester.pump();
      expect(itemRect(tester, 3).left, moreOrLessEquals(pad));
      expect(tester.widget<TanreiCarouselItem>(itemFinder(3)).label, 'Item 2');
    });

    testWidgets(
      'CRL-23: right to left the row is mirrored: slot 0 at the right, items moving right '
      'as p grows; a ripple still grows from the point of contact; content is not mirrored',
      (WidgetTester tester) async {
        await pumpCarousel(
          tester,
          sheetApp(
            carouselPage(TanreiCarousel(semanticLabel: 'Walks', children: items(6))),
            textDirection: TextDirection.rtl,
            theme: const TanreiThemeData(system: m3LikeSystem),
          ),
          window: const Size(400, 400),
        );
        expect(itemRect(tester, 0).right, moreOrLessEquals(400 - pad));
        expect(itemRect(tester, 1).right, moreOrLessEquals(400 - pad - 200 - gap));
        final double before = itemRect(tester, 1).left;
        carouselPosition(tester).jumpTo(50);
        await tester.pump();
        expect(itemRect(tester, 1).right, greaterThan(400 - pad - 200 - gap));
        expect(itemRect(tester, 1).left, isNot(before));
        carouselPosition(tester).jumpTo(0);
        await tester.pump();
        // Dragging to the right scrolls forward.
        await tester.timedDragFrom(
          const Offset(200, 100),
          const Offset(60, 0),
          const Duration(seconds: 1),
        );
        await tester.pump();
        expect(carouselPosition(tester).pixels, greaterThan(0));
        await tester.pumpAndSettle();
        final Rect box = tester.getRect(itemContainer(0).first);
        const Offset contact = Offset(30, 40);
        final TestGesture touch = await tester.startGesture(box.topLeft + contact);
        await tester.pump();
        expect(itemDecoration(tester, 0).ripple!.origin, contact);
        await touch.up();
        await tester.pumpAndSettle();
      },
    );

    testWidgets('CRL-25: enlarged text keeps the height, slots and items', (
      WidgetTester tester,
    ) async {
      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(TanreiCarousel(semanticLabel: 'Walks', children: items(6))),
          textScaler: const TextScaler.linear(2),
        ),
      );
      expect(tester.getSize(find.byType(TanreiCarousel)).height, carouselTokens.layoutHeight);
      expect(widthsInView(tester, 6, 400), hasLength(3));
      expect(itemRect(tester, 0).width, 200);
    });
  });

  group('scrolling and focus', () {
    testWidgets('CRL-14: a drag follows the finger and settles at the nearest whole position over '
        'the scroll motion, a fling at the next one; the wheel with Shift scrolls; at once where '
        'motion is reduced', (WidgetTester tester) async {
      await pumpCarousel(
        tester,
        sheetApp(carouselPage(TanreiCarousel(semanticLabel: 'Walks', children: items(6)))),
      );
      final double step = 200 + gap;
      final TestGesture drag = await tester.startGesture(const Offset(300, 100));
      await drag.moveBy(const Offset(-30, 0));
      await drag.moveBy(const Offset(-60, 0));
      await tester.pump();
      final double followed = carouselPosition(tester).pixels;
      expect(followed, greaterThan(50));
      await tester.pump(const Duration(seconds: 1));
      await drag.up();
      await tester.pump();
      await tester.pump(scroll ~/ 2);
      final double middle = carouselPosition(tester).pixels;
      expect(middle, lessThan(followed), reason: 'settling back toward 0');
      expect(middle, greaterThan(0));
      await tester.pumpAndSettle();
      expect(carouselPosition(tester).pixels, 0);

      // Released past the middle: the next one.
      await tester.timedDragFrom(
        const Offset(300, 100),
        Offset(-step * 0.6 - kTouchSlop, 0),
        const Duration(seconds: 2),
      );
      await tester.pumpAndSettle();
      expect(carouselPosition(tester).pixels, moreOrLessEquals(step));
      // A short fling: the next one in its direction.
      await tester.flingFrom(const Offset(300, 100), const Offset(-60, 0), 1000);
      await tester.pumpAndSettle();
      expect(carouselPosition(tester).pixels, moreOrLessEquals(2 * step));

      // Shift with a vertical wheel scrolls it, and it settles.
      await tester.sendKeyDownEvent(LogicalKeyboardKey.shiftLeft);
      final TestPointer mouse = TestPointer(1, PointerDeviceKind.mouse);
      await tester.sendEventToBinding(mouse.hover(const Offset(200, 100)));
      await tester.sendEventToBinding(mouse.scroll(const Offset(0, 150)));
      await tester.sendKeyUpEvent(LogicalKeyboardKey.shiftLeft);
      await tester.pumpAndSettle();
      expect(carouselPosition(tester).pixels, moreOrLessEquals(3 * step));

      // Reduced motion: a release settles at once.
      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(
            TanreiCarousel(key: UniqueKey(), semanticLabel: 'Walks', children: items(6)),
          ),
          disableAnimations: true,
        ),
      );
      await tester.timedDragFrom(
        const Offset(300, 100),
        const Offset(-80, 0),
        const Duration(seconds: 1),
      );
      await tester.pump();
      await tester.pump();
      expect(carouselPosition(tester).pixels, 0);
    });

    testWidgets('CRL-17: the carousel is one Tab stop — the item in place, or the last focused; '
        'Right and Left Arrow move to the next and previous item without wrapping, Home and End '
        'to the ends; mirrored right to left', (WidgetTester tester) async {
      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(TanreiCarousel(semanticLabel: 'Walks', children: items(5)), buttons: true),
        ),
      );
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tabTimes(tester, 2);
      expect(focusedItemLabel(), 'Item 0');
      await tabTimes(tester, 1);
      expect(focusedItemLabel(), 'After', reason: 'one Tab stop');
      await tabTimes(tester, 1, shift: true);
      expect(focusedItemLabel(), 'Item 0');
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
      await tester.pumpAndSettle();
      expect(focusedItemLabel(), 'Item 0', reason: 'no wrap');
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await tester.pumpAndSettle();
      expect(focusedItemLabel(), 'Item 1');
      await tester.sendKeyEvent(LogicalKeyboardKey.end);
      await tester.pumpAndSettle();
      expect(focusedItemLabel(), 'Item 4');
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await tester.pumpAndSettle();
      expect(focusedItemLabel(), 'Item 4', reason: 'no wrap');
      await tester.sendKeyEvent(LogicalKeyboardKey.home);
      await tester.pumpAndSettle();
      expect(focusedItemLabel(), 'Item 0');
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await tester.pumpAndSettle();
      // Leave and come back: the last focused item.
      await tabTimes(tester, 1);
      await tabTimes(tester, 1, shift: true);
      expect(focusedItemLabel(), 'Item 1');

      // Right to left: Left Arrow is next.
      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(
            TanreiCarousel(key: UniqueKey(), semanticLabel: 'Walks', children: items(5)),
          ),
          textDirection: TextDirection.rtl,
        ),
      );
      await tabTimes(tester, 1);
      expect(focusedItemLabel(), 'Item 0');
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
      await tester.pumpAndSettle();
      expect(focusedItemLabel(), 'Item 1');

      // Scrolled by hand, the item in place is the Tab stop.
      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(
            TanreiCarousel(key: UniqueKey(), semanticLabel: 'Walks', children: items(5)),
            buttons: true,
          ),
        ),
      );
      carouselPosition(tester).jumpTo(2 * (200 + gap));
      await tester.pumpAndSettle();
      await tabTimes(tester, 2);
      expect(focusedItemLabel(), 'Item 2');
    });

    testWidgets('CRL-18: keyboard focus brings the item to slot 0 over the scroll motion, as near '
        'as the range allows; uncontained, just into view; assistive-technology focus too', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle semantics = tester.ensureSemantics();
      await pumpCarousel(
        tester,
        sheetApp(carouselPage(TanreiCarousel(semanticLabel: 'Walks', children: items(5)))),
      );
      final double step = 200 + gap;
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tabTimes(tester, 1);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await tester.pump();
      await tester.pump(scroll ~/ 2);
      final double t = carouselTokens.motionScrollEasing.toCurve().transform(0.5);
      expect(carouselPosition(tester).pixels, moreOrLessEquals(step * t, epsilon: 1));
      await tester.pumpAndSettle();
      expect(carouselPosition(tester).pixels, moreOrLessEquals(step));
      expect(itemRect(tester, 1).left, moreOrLessEquals(pad));
      await tester.sendKeyEvent(LogicalKeyboardKey.end);
      await tester.pumpAndSettle();
      expect(
        carouselPosition(tester).pixels,
        moreOrLessEquals(carouselPosition(tester).maxScrollExtent),
      );

      // Uncontained: as little as needed.
      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(
            TanreiCarousel(
              key: UniqueKey(),
              layout: TanreiCarouselLayout.uncontained,
              semanticLabel: 'Walks',
              children: items(5),
            ),
          ),
        ),
      );
      await tabTimes(tester, 1);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await tester.pumpAndSettle();
      // Item 1 ends at 16 + 200 + 8 + 200 = 424: the row scrolls until it ends at 384.
      expect(carouselPosition(tester).pixels, moreOrLessEquals(2 * 200 + gap - 368));

      // Assistive technology: focusing an item's node brings it into place.
      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(
            TanreiCarousel(key: UniqueKey(), semanticLabel: 'Walks', children: items(5)),
          ),
        ),
      );
      final SemanticsNode item3 = nodesBelow(
        semanticsRoot(tester),
      ).firstWhere((SemanticsNode n) => n.getSemanticsData().label == 'Item 3');
      tester
          .renderObject(find.byType(WidgetsApp))
          .owner!
          .semanticsOwner!
          .performAction(item3.id, SemanticsAction.didGainAccessibilityFocus);
      await tester.pumpAndSettle();
      expect(carouselPosition(tester).pixels, moreOrLessEquals(3 * step));
      semantics.dispose();
    });

    testWidgets('CRL-19: a list named by its label; each item a button named by its label with its '
        'index and the count; content hidden; items out of view still exposed, in order', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle semantics = tester.ensureSemantics();
      await pumpCarousel(
        tester,
        sheetApp(carouselPage(TanreiCarousel(semanticLabel: 'Walks near you', children: items(6)))),
      );
      final List<SemanticsNode> nodes = nodesBelow(semanticsRoot(tester));
      final List<SemanticsData> data = nodes
          .map((SemanticsNode n) => n.getSemanticsData())
          .toList();
      expect(data.where((SemanticsData d) => d.label == 'Walks near you'), hasLength(1));
      expect(data.any((SemanticsData d) => d.scrollChildCount == 6), isTrue);
      final List<SemanticsNode> buttons = nodes
          .where((SemanticsNode n) => n.getSemanticsData().hasFlag(SemanticsFlag.isButton))
          .toList();
      expect(buttons.map((SemanticsNode n) => n.getSemanticsData().label), <String>[
        for (int i = 0; i < 6; i++) 'Item $i',
      ]);
      final List<int?> indexes = <int?>[
        for (final SemanticsNode node in nodes)
          if (node.indexInParent != null) node.indexInParent,
      ];
      expect(indexes, <int>[0, 1, 2, 3, 4, 5]);
      // The content ('0', '1' …) is not read.
      expect(data.where((SemanticsData d) => d.label == '0' || d.value == '0'), isEmpty);
      expect(
        nodesWithRole(tester, SemanticsRole.list),
        isEmpty,
        reason: 'a scrollable with a count',
      );
      semantics.dispose();
    });

    testWidgets('CRL-20: an item without a label, and a carousel without one, still render and '
        'are reported', (WidgetTester tester) async {
      final List<String> reports = collectMissingNames();
      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(
            TanreiCarousel(
              children: <TanreiCarouselItem>[
                TanreiCarouselItem(label: '', onTap: () {}, child: const SizedBox()),
                ...items(2),
              ],
            ),
          ),
        ),
      );
      expect(reports, containsAll(<String>['carousel', 'carousel item']));
      expect(find.byType(TanreiCarouselItem), findsNWidgets(3));
    });
  });

  group('items', () {
    testWidgets('CRL-1: a press, Enter or Space activates an item once; a press that becomes a '
        'scroll activates nothing', (WidgetTester tester) async {
      final List<int> taps = <int>[];
      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(
            TanreiCarousel(
              semanticLabel: 'Walks',
              children: items(5, taps: taps),
            ),
          ),
        ),
      );
      await tester.tap(itemFinder(1));
      await tester.pumpAndSettle();
      expect(taps, <int>[1]);
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tabTimes(tester, 1);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pumpAndSettle();
      expect(taps, <int>[1, 0, 0]);
      await tester.timedDragFrom(
        tester.getCenter(itemFinder(0)),
        const Offset(-100, 0),
        const Duration(milliseconds: 500),
      );
      await tester.pumpAndSettle();
      expect(taps, hasLength(3));
    });

    testWidgets('CRL-2: under the acme system hovered, focused and pressed draw their own tokens, '
        'pressed over focused over hovered; pointer focus draws no focused state', (
      WidgetTester tester,
    ) async {
      const TanreiThemeData acme = TanreiThemeData(system: acmeSystem);
      Color fill(TanreiInteractionState state) => expectedLayer(acme, state);
      expect(<Color>{
        fill(TanreiInteractionState.hovered),
        fill(TanreiInteractionState.focused),
        fill(TanreiInteractionState.pressed),
      }, hasLength(3));
      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(TanreiCarousel(semanticLabel: 'Walks', children: items(4))),
          theme: acme,
        ),
      );
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tabTimes(tester, 1);
      await tester.pumpAndSettle();
      expect(itemLayer(tester, 0), fill(TanreiInteractionState.focused));
      final TestGesture mouse = await hoverOver(tester, itemFinder(0));
      expect(itemLayer(tester, 0), fill(TanreiInteractionState.focused));
      await mouse.down(tester.getCenter(itemFinder(0)));
      await tester.pump();
      expect(itemLayer(tester, 0), fill(TanreiInteractionState.pressed));
      await mouse.up();
      await tester.pumpAndSettle();
      await mouse.moveTo(tester.getCenter(itemFinder(1)));
      await tester.pumpAndSettle();
      expect(itemLayer(tester, 1), fill(TanreiInteractionState.hovered));
      await mouse.moveTo(const Offset(700, 350));
      await tester.pumpAndSettle();

      FocusManager.instance.primaryFocus?.unfocus();
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      await tester.tap(itemFinder(1));
      await tester.pumpAndSettle();
      expect(itemLayer(tester, 1).a, 0, reason: 'at rest');
    });

    testWidgets('CRL-3: keyboard focus shows the focus ring inside the item\'s container, at once; '
        'touch focus shows none', (WidgetTester tester) async {
      await pumpCarousel(
        tester,
        sheetApp(carouselPage(TanreiCarousel(semanticLabel: 'Walks', children: items(4)))),
      );
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tabTimes(tester, 1);
      expect(itemRing(tester, 0).visible, isTrue);
      expect(itemRing(tester, 0).inside, isTrue);
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      await tester.pump();
      expect(itemRing(tester, 0).visible, isFalse);
    });

    testWidgets('CRL-4: the hit area is the container with half the gap on each side — the touch '
        'target for a small item at small-min-width — and the row is no lower than the target', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle semantics = tester.ensureSemantics();
      final List<int> taps = <int>[];
      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(
            TanreiCarousel(
              itemWidth: 120,
              semanticLabel: 'Walks',
              children: items(6, taps: taps),
            ),
          ),
        ),
      );
      // 120 · 120 · 64 · 40: item 3 is the small one, at small-min-width.
      final Rect small = tester.getRect(itemFinder(3));
      expect(small.width, moreOrLessEquals(carouselTokens.containerSmallMinWidth));
      await tester.tapAt(Offset(small.left - gap / 2 + 1, small.center.dy));
      await tester.pumpAndSettle();
      expect(taps, <int>[3]);
      final SemanticsNode node = nodesBelow(
        semanticsRoot(tester),
      ).firstWhere((SemanticsNode n) => n.getSemanticsData().label == 'Item 3');
      expect(node.rect.width, moreOrLessEquals(system.measure.targetTouch));
      expect(small.width + gap, system.measure.targetTouch);

      // A system whose row is lower than the target still gets a row as high as the target.
      final TanreiSystem low = system.copyWith(
        carousel: system.carousel.copyWith(layoutHeight: 30),
      );
      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(
            TanreiCarousel(key: UniqueKey(), semanticLabel: 'Walks', children: items(3)),
          ),
          theme: TanreiThemeData(system: low),
        ),
      );
      expect(tester.getSize(find.byType(TanreiCarousel)).height, system.measure.targetTouch);
      semantics.dispose();
    });

    testWidgets('CRL-5: a press shows the pressed state at once and keeps it for the press-hold', (
      WidgetTester tester,
    ) async {
      const TanreiThemeData acme = TanreiThemeData(system: acmeSystem);
      final Color pressed = expectedLayer(acme, TanreiInteractionState.pressed);
      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(TanreiCarousel(semanticLabel: 'Walks', children: items(4))),
          theme: acme,
        ),
      );
      final TestGesture touch = await tester.startGesture(tester.getCenter(itemFinder(0)));
      await tester.pump();
      expect(itemLayer(tester, 0), pressed, reason: 'without delay');
      await touch.up();
      await tester.pump(hold - tick);
      expect(itemLayer(tester, 0), pressed);
      await tester.pump(tick);
      await tester.pumpAndSettle();
      expect(itemLayer(tester, 0), isNot(pressed));
    });

    testWidgets('CRL-6: overlay (default) fills the pressed container; ripple (m3-like) grows from '
        'the point of contact; dim (cupertino) dims with no state layer; none draws no answer', (
      WidgetTester tester,
    ) async {
      await pumpCarousel(
        tester,
        sheetApp(carouselPage(TanreiCarousel(semanticLabel: 'Walks', children: items(4)))),
      );
      TestGesture touch = await tester.startGesture(tester.getCenter(itemFinder(0)));
      await tester.pump();
      expect(itemLayer(tester, 0), expectedLayer(lightTheme, TanreiInteractionState.pressed));
      expect(itemDecoration(tester, 0).ripple, isNull);
      await touch.up();
      await tester.pumpAndSettle();

      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(
            TanreiCarousel(key: UniqueKey(), semanticLabel: 'Walks', children: items(4)),
          ),
          theme: const TanreiThemeData(system: m3LikeSystem),
        ),
      );
      final Rect box = tester.getRect(itemContainer(0).first);
      const Offset contact = Offset(50, 30);
      touch = await tester.startGesture(box.topLeft + contact);
      await tester.pump();
      expect(itemDecoration(tester, 0).ripple!.origin, contact);
      await touch.up();
      await tester.pumpAndSettle();

      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(
            TanreiCarousel(key: UniqueKey(), semanticLabel: 'Walks', children: items(4)),
          ),
          theme: const TanreiThemeData(system: cupertinoSystem),
        ),
      );
      touch = await tester.startGesture(tester.getCenter(itemFinder(0)));
      await tester.pump();
      expect(itemOpacity(tester, 0), cupertinoSystem.carousel.pressed.opacity);
      expect(itemLayer(tester, 0).a, 0, reason: 'dim draws no state layer');
      await touch.up();
      await tester.pumpAndSettle();

      final TanreiThemeData none = TanreiThemeData(
        system: acmeSystem.copyWith(
          behavior: acmeSystem.behavior.copyWith(pressedFeedback: TanreiPressedFeedback.none),
        ),
      );
      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(
            TanreiCarousel(key: UniqueKey(), semanticLabel: 'Walks', children: items(4)),
          ),
          theme: none,
        ),
      );
      touch = await tester.startGesture(tester.getCenter(itemFinder(0)));
      await tester.pump();
      expect(itemLayer(tester, 0).a, 0, reason: 'none draws no answer');
      await touch.up();
      await tester.pumpAndSettle();
    });

    testWidgets(
      'CRL-7: the corner smoothing eases each container; the focus ring follows the focus '
      'style',
      (WidgetTester tester) async {
        await pumpCarousel(
          tester,
          sheetApp(
            carouselPage(TanreiCarousel(semanticLabel: 'Walks', children: items(4))),
            theme: const TanreiThemeData(system: cupertinoSystem),
          ),
        );
        expect(itemDecoration(tester, 0).shape.smoothing, cupertinoSystem.shape.cornerSmoothing);
        expect(itemDecoration(tester, 0).shape.radius, cupertinoSystem.carousel.containerShape);
        expect(acmeSystem.behavior.focusStyle, TanreiFocusStyle.glow);
        await pumpCarousel(
          tester,
          sheetApp(
            carouselPage(
              TanreiCarousel(key: UniqueKey(), semanticLabel: 'Walks', children: items(4)),
            ),
            theme: const TanreiThemeData(system: acmeSystem),
          ),
        );
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        await tabTimes(tester, 1);
        expect(itemRing(tester, 0).visible, isTrue);
      },
    );

    testWidgets('CRL-22: an item\'s colors ease between states over state-duration, and change at '
        'once where motion is reduced', (WidgetTester tester) async {
      const TanreiThemeData acme = TanreiThemeData(system: acmeSystem);
      final Color rest = expectedLayer(acme, TanreiInteractionState.enabled);
      final Color hovered = expectedLayer(acme, TanreiInteractionState.hovered);
      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(TanreiCarousel(semanticLabel: 'Walks', children: items(4))),
          theme: acme,
        ),
      );
      final TestGesture mouse = await hoverOver(tester, find.byType(TanreiCarousel));
      await mouse.moveTo(const Offset(700, 350));
      await tester.pumpAndSettle();
      await mouse.moveTo(tester.getCenter(itemFinder(0)));
      await tester.pump();
      await tester.pump(tanreiDuration(acmeSystem.carousel.motionStateDuration) ~/ 2);
      expect(itemLayer(tester, 0), isNot(rest));
      expect(itemLayer(tester, 0), isNot(hovered));
      await tester.pumpAndSettle();
      expect(itemLayer(tester, 0), hovered);
      await mouse.moveTo(const Offset(700, 350));
      await tester.pumpAndSettle();

      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(
            TanreiCarousel(key: UniqueKey(), semanticLabel: 'Walks', children: items(4)),
          ),
          theme: acme,
          disableAnimations: true,
        ),
      );
      await mouse.moveTo(tester.getCenter(itemFinder(0)));
      await tester.pump();
      expect(itemLayer(tester, 0), hovered);
    });

    testWidgets('CRL-24: a layout name the carousel does not define renders as multi-browse and is '
        'reported; an itemWidth that is not a positive number is treated as null and reported', (
      WidgetTester tester,
    ) async {
      final List<String> unknown = collectUnknownValues();
      expect(TanreiCarouselLayout.fromName('fullscreen'), TanreiCarouselLayout.multiBrowse);
      expect(unknown, <String>['carousel layout "fullscreen" -> multi-browse']);
      final List<String> ignored = collectIgnoredValues();
      await pumpCarousel(
        tester,
        sheetApp(
          carouselPage(TanreiCarousel(itemWidth: -5, semanticLabel: 'Walks', children: items(4))),
        ),
      );
      expect(ignored, hasLength(1));
      expect(ignored.single, startsWith('carousel itemWidth'));
      expect(itemRect(tester, 0).width, carouselTokens.containerLargeWidth);
    });

    testWidgets('guidelines: carousel', (WidgetTester tester) async {
      final SemanticsHandle semantics = tester.ensureSemantics();
      for (final TanreiCarouselLayout layout in TanreiCarouselLayout.values) {
        for (final TanreiThemeData theme in <TanreiThemeData>[
          TanreiThemeData.light,
          TanreiThemeData.dark,
        ]) {
          await pumpCarousel(
            tester,
            sheetApp(
              carouselPage(
                TanreiCarousel(
                  key: UniqueKey(),
                  layout: layout,
                  itemWidth: 120,
                  semanticLabel: 'Walks',
                  children: items(6),
                ),
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
      semantics.dispose();
    });
  });

  group('a design system drives rendering', () {
    test('the tokens the widget reads: their default values', () {
      expect(carouselTokens.layoutHeight, 200);
      expect(carouselTokens.layoutPaddingInline, 16);
      expect(carouselTokens.layoutGap, 8);
      expect(carouselTokens.containerLargeWidth, 200);
      expect(carouselTokens.containerSmallMinWidth, 40);
      expect(carouselTokens.containerSmallMaxWidth, 56);
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": the carousel draws that system\'s height, widths, shape and '
          'colors', (WidgetTester tester) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        final TanreiCarouselTokens tokens = shipped.carousel;
        await pumpCarousel(
          tester,
          sheetApp(
            carouselPage(TanreiCarousel(semanticLabel: 'Walks', children: items(6))),
            theme: theme,
          ),
        );
        expect(tester.getSize(find.byType(TanreiCarousel)).height, tokens.layoutHeight);
        expect(itemRect(tester, 0).left, tokens.layoutPaddingInline);
        expect(itemDecoration(tester, 0).shape.radius, tokens.containerShape);
        expect(itemDecoration(tester, 0).shape.smoothing, shipped.shape.cornerSmoothing);
        expect(itemFill(tester, 0), theme.paint(tokens.parts.item.enabled.containerColor));
      });
    }
  });

  group('goldens', () {
    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'multi-browse',
        'multi-browse-narrow-items',
        'hero',
        'uncontained',
      ]);
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          surface: carouselGoldenSurface,
          child: fixtureCarousel(fixture),
          file: 'goldens/carousel/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: multi-browse shows the preset's
    // height, widths, corners and item colors at once.
    const String recorded = 'multi-browse';
    for (final TanreiSystem preset in <TanreiSystem>[
      m3LikeSystem,
      m3ExpressiveLikeSystem,
      cupertinoSystem,
    ]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: carouselGoldenSurface,
          child: fixtureCarousel(
            fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded),
          ),
          file: 'goldens/carousel/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
