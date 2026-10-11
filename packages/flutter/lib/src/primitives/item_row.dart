import 'dart:math' as math;

import 'package:flutter/foundation.dart';

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

/// Where the leading and trailing elements of a [TanreiItemRow] sit against its text.
enum TanreiItemRowAlignment {
  /// Centered on the text in a row of one or two lines of text, and aligned with its top in a
  /// taller one (a list item, LST-17).
  centerThenTop,

  /// Centered on the first line of the headline, whichever of the two is shorter moved down, so a
  /// wrapping label keeps its control beside its first line (a menu item, as a checkbox's label
  /// and box; MNU-19).
  firstLine,
}

/// The slots of a [TanreiItemRow].
enum TanreiItemRowSlot {
  /// The leading element: an icon, an avatar, a check column.
  leading,

  /// The short line above the headline.
  overline,

  /// The item's main text.
  headline,

  /// The text below the headline.
  supporting,

  /// The trailing elements, in one widget.
  trailing,
}

/// One row of a list or a menu (LST-16, LST-17, MNU-19, MNU-20): [leading], then a text column
/// ([overline], [headline] and [supporting], stacked) taking the remaining width, then [trailing];
/// [gap] apart, [paddingStart] and [paddingEnd] from the edges and [paddingBlock] above and below,
/// mirrored in a right-to-left layout.
///
/// Its height is at least `minHeights[n]`, where n is the number of lines the overline and the
/// supporting text take beyond the headline (the last entry for more), and at least [minTarget]; it
/// grows with its content and with enlarged text beyond that, and never clips it. The lines are
/// counted from the laid-out text: a text slot that is a `Text` (a paragraph, through any proxies
/// such as `ExcludeSemantics`) counts its height in lines of its style; anything else counts one.
///
/// The headline and the supporting text wrap within the text column. [trailing] takes at most the
/// width the text column leaves beyond its longest word.
class TanreiItemRow extends SlottedMultiChildRenderObjectWidget<TanreiItemRowSlot, RenderBox> {
  /// Lays out one row.
  const TanreiItemRow({
    super.key,
    this.leading,
    this.overline,
    required this.headline,
    this.supporting,
    this.trailing,
    required this.paddingStart,
    required this.paddingEnd,
    required this.paddingBlock,
    required this.gap,
    required this.minHeights,
    this.minTarget = 0,
    required this.alignment,
  });

  /// The leading element (sized by its content).
  final Widget? leading;

  /// The line above the headline.
  final Widget? overline;

  /// The headline.
  final Widget headline;

  /// The text below the headline.
  final Widget? supporting;

  /// The trailing elements.
  final Widget? trailing;

  /// The space from the start edge to the first element.
  final double paddingStart;

  /// The space from the last element to the end edge.
  final double paddingEnd;

  /// The space above and below the content.
  final double paddingBlock;

  /// The space between the leading element, the text column and the trailing elements.
  final double gap;

  /// The minimum heights by the lines of text beyond the headline: one entry (a menu item) or
  /// three (a list item's one-, two- and three-line heights).
  final List<double> minHeights;

  /// The minimum target an interactive row grows to (0: none).
  final double minTarget;

  /// Where the leading and trailing elements sit against the text.
  final TanreiItemRowAlignment alignment;

  @override
  Iterable<TanreiItemRowSlot> get slots => TanreiItemRowSlot.values;

  @override
  Widget? childForSlot(TanreiItemRowSlot slot) => switch (slot) {
    TanreiItemRowSlot.leading => leading,
    TanreiItemRowSlot.overline => overline,
    TanreiItemRowSlot.headline => headline,
    TanreiItemRowSlot.supporting => supporting,
    TanreiItemRowSlot.trailing => trailing,
  };

  @override
  RenderTanreiItemRow createRenderObject(BuildContext context) => RenderTanreiItemRow(
    paddingStart: paddingStart,
    paddingEnd: paddingEnd,
    paddingBlock: paddingBlock,
    gap: gap,
    minHeights: minHeights,
    minTarget: minTarget,
    alignment: alignment,
    textDirection: Directionality.of(context),
  );

  @override
  void updateRenderObject(BuildContext context, RenderTanreiItemRow renderObject) {
    renderObject
      ..paddingStart = paddingStart
      ..paddingEnd = paddingEnd
      ..paddingBlock = paddingBlock
      ..gap = gap
      ..minHeights = minHeights
      ..minTarget = minTarget
      ..alignment = alignment
      ..textDirection = Directionality.of(context);
  }
}

/// Where each child of a row goes, and how large the row is.
class _RowLayout {
  _RowLayout(this.size, this.offsets, this.extraLines);

  final Size size;
  final Map<TanreiItemRowSlot, Offset> offsets;

  /// The lines of text beyond the headline.
  final int extraLines;
}

/// The render object of [TanreiItemRow].
class RenderTanreiItemRow extends RenderBox
    with SlottedContainerRenderObjectMixin<TanreiItemRowSlot, RenderBox> {
  /// Creates the render object.
  RenderTanreiItemRow({
    required double paddingStart,
    required double paddingEnd,
    required double paddingBlock,
    required double gap,
    required List<double> minHeights,
    required double minTarget,
    required TanreiItemRowAlignment alignment,
    required TextDirection textDirection,
  }) : _paddingStart = paddingStart,
       _paddingEnd = paddingEnd,
       _paddingBlock = paddingBlock,
       _gap = gap,
       _minHeights = minHeights,
       _minTarget = minTarget,
       _alignment = alignment,
       _textDirection = textDirection;

  double _paddingStart;
  set paddingStart(double value) => _set(_paddingStart != value, () => _paddingStart = value);

  double _paddingEnd;
  set paddingEnd(double value) => _set(_paddingEnd != value, () => _paddingEnd = value);

  double _paddingBlock;
  set paddingBlock(double value) => _set(_paddingBlock != value, () => _paddingBlock = value);

  double _gap;
  set gap(double value) => _set(_gap != value, () => _gap = value);

  List<double> _minHeights;
  set minHeights(List<double> value) =>
      _set(!listEquals(_minHeights, value), () => _minHeights = value);

  double _minTarget;
  set minTarget(double value) => _set(_minTarget != value, () => _minTarget = value);

  TanreiItemRowAlignment _alignment;
  set alignment(TanreiItemRowAlignment value) =>
      _set(_alignment != value, () => _alignment = value);

  TextDirection _textDirection;
  set textDirection(TextDirection value) =>
      _set(_textDirection != value, () => _textDirection = value);

  void _set(bool changed, VoidCallback apply) {
    if (changed) {
      apply();
      markNeedsLayout();
    }
  }

  /// The lines of text beyond the headline in the last layout (0 before one).
  int get extraLines => _extraLines;
  int _extraLines = 0;

  RenderBox? _child(TanreiItemRowSlot slot) => childForSlot(slot);

  static const List<TanreiItemRowSlot> _textSlots = <TanreiItemRowSlot>[
    TanreiItemRowSlot.overline,
    TanreiItemRowSlot.headline,
    TanreiItemRowSlot.supporting,
  ];

  /// The paragraph a text slot draws, through proxies (`ExcludeSemantics`, `Semantics`), if any.
  static RenderParagraph? _paragraphOf(RenderBox? child) {
    RenderObject? node = child;
    while (node is RenderProxyBox) {
      node = node.child;
    }
    return node is RenderParagraph ? node : null;
  }

  /// The height of one line of [paragraph]'s text: its style at its text scale, measured the way
  /// the paragraph measures a line.
  static double _lineHeightOf(RenderParagraph paragraph) {
    final TextPainter painter = TextPainter(
      text: TextSpan(text: ' ', style: paragraph.text.style),
      textDirection: paragraph.textDirection,
      textScaler: paragraph.textScaler,
      strutStyle: paragraph.strutStyle,
      textHeightBehavior: paragraph.textHeightBehavior,
    );
    final double height = painter.preferredLineHeight;
    painter.dispose();
    return height;
  }

  /// The lines [child] takes at [height]: its height in lines of its style, or one.
  static int _linesOf(RenderBox? child, double height) {
    if (child == null || height <= 0) {
      return 0;
    }
    final RenderParagraph? paragraph = _paragraphOf(child);
    final double line = paragraph == null ? 0 : _lineHeightOf(paragraph);
    return line > 0 ? math.max(1, (height / line).round()) : 1;
  }

  double _widthOf(RenderBox? child, double Function(RenderBox child) measure) =>
      child == null ? 0 : measure(child);

  double _horizontal(double Function(RenderBox child) measure) {
    double width = _paddingStart + _paddingEnd;
    for (final TanreiItemRowSlot slot in <TanreiItemRowSlot>[
      TanreiItemRowSlot.leading,
      TanreiItemRowSlot.trailing,
    ]) {
      final RenderBox? child = _child(slot);
      if (child != null) {
        width += measure(child) + _gap;
      }
    }
    double text = 0;
    for (final TanreiItemRowSlot slot in _textSlots) {
      text = math.max(text, _widthOf(_child(slot), measure));
    }
    return width + text;
  }

  @override
  double computeMinIntrinsicWidth(double height) =>
      _horizontal((RenderBox child) => child.getMinIntrinsicWidth(double.infinity));

  @override
  double computeMaxIntrinsicWidth(double height) =>
      _horizontal((RenderBox child) => child.getMaxIntrinsicWidth(double.infinity));

  @override
  double computeMinIntrinsicHeight(double width) =>
      _compute(BoxConstraints(maxWidth: width), dry: true).size.height;

  @override
  double computeMaxIntrinsicHeight(double width) => computeMinIntrinsicHeight(width);

  @override
  Size computeDryLayout(covariant BoxConstraints constraints) =>
      _compute(constraints, dry: true).size;

  _RowLayout _compute(BoxConstraints constraints, {required bool dry}) {
    Size sizeOf(RenderBox? child, BoxConstraints childConstraints) {
      if (child == null) {
        return Size.zero;
      }
      if (dry) {
        return child.getDryLayout(childConstraints);
      }
      child.layout(childConstraints, parentUsesSize: true);
      return child.size;
    }

    final bool bounded = constraints.hasBoundedWidth;
    final RenderBox? leading = _child(TanreiItemRowSlot.leading);
    final RenderBox? trailing = _child(TanreiItemRowSlot.trailing);

    final Size lead = sizeOf(leading, const BoxConstraints());
    double used = _paddingStart + _paddingEnd + (leading == null ? 0 : lead.width + _gap);
    // The text column keeps at least its longest word; the trailing elements take the rest.
    double textMin = 0;
    for (final TanreiItemRowSlot slot in _textSlots) {
      textMin = math.max(
        textMin,
        _widthOf(_child(slot), (RenderBox c) => c.getMinIntrinsicWidth(double.infinity)),
      );
    }
    final double trailMax = bounded
        ? math.max(0, constraints.maxWidth - used - textMin - _gap)
        : double.infinity;
    final Size trail = sizeOf(trailing, BoxConstraints(maxWidth: trailMax));
    used += trailing == null ? 0 : trail.width + _gap;

    double textWidth;
    if (bounded) {
      textWidth = math.max(0, constraints.maxWidth - used);
    } else {
      textWidth = 0;
      for (final TanreiItemRowSlot slot in _textSlots) {
        textWidth = math.max(
          textWidth,
          _widthOf(_child(slot), (RenderBox c) => c.getMaxIntrinsicWidth(double.infinity)),
        );
      }
    }
    final BoxConstraints textConstraints = BoxConstraints(maxWidth: textWidth);
    final Map<TanreiItemRowSlot, Size> texts = <TanreiItemRowSlot, Size>{
      for (final TanreiItemRowSlot slot in _textSlots) slot: sizeOf(_child(slot), textConstraints),
    };
    final Size overline = texts[TanreiItemRowSlot.overline]!;
    final Size headline = texts[TanreiItemRowSlot.headline]!;
    final Size supporting = texts[TanreiItemRowSlot.supporting]!;
    final double textHeight = overline.height + headline.height + supporting.height;
    final int extraLines =
        _linesOf(_child(TanreiItemRowSlot.overline), overline.height) +
        _linesOf(_child(TanreiItemRowSlot.supporting), supporting.height);

    // Vertical positions within the content box.
    double textTop;
    double leadTop;
    double trailTop;
    double contentHeight;
    switch (_alignment) {
      case TanreiItemRowAlignment.centerThenTop:
        contentHeight = math.max(textHeight, math.max(lead.height, trail.height));
        if (extraLines >= 2) {
          textTop = 0;
          leadTop = 0;
          trailTop = 0;
        } else {
          textTop = (contentHeight - textHeight) / 2;
          leadTop = (contentHeight - lead.height) / 2;
          trailTop = (contentHeight - trail.height) / 2;
        }
      case TanreiItemRowAlignment.firstLine:
        final RenderParagraph? paragraph = _paragraphOf(_child(TanreiItemRowSlot.headline));
        final double firstLine = paragraph == null ? headline.height : _lineHeightOf(paragraph);
        final double line = math.min(firstLine, headline.height);
        final double leadOffset = overline.height + (line - lead.height) / 2;
        final double trailOffset = overline.height + (line - trail.height) / 2;
        final double shift = math.max(0, math.max(-leadOffset, -trailOffset));
        textTop = shift;
        leadTop = leadOffset + shift;
        trailTop = trailOffset + shift;
        contentHeight = math.max(
          textTop + textHeight,
          math.max(leadTop + lead.height, trailTop + trail.height),
        );
    }

    final int index = math.min(extraLines, _minHeights.length - 1);
    final double minHeight = math.max(_minHeights.isEmpty ? 0 : _minHeights[index], _minTarget);
    final Size size = constraints.constrain(
      Size(
        bounded ? constraints.maxWidth : used + textWidth,
        math.max(minHeight, contentHeight + 2 * _paddingBlock),
      ),
    );
    final double top = (size.height - contentHeight) / 2;

    // Left-to-right positions, mirrored for right-to-left.
    final bool rtl = _textDirection == TextDirection.rtl;
    Offset place(double start, double y, double width) =>
        Offset(rtl ? size.width - start - width : start, y);
    final double textStart = _paddingStart + (leading == null ? 0 : lead.width + _gap);
    double y = top + textTop;
    final Map<TanreiItemRowSlot, Offset> offsets = <TanreiItemRowSlot, Offset>{
      TanreiItemRowSlot.leading: place(_paddingStart, top + leadTop, lead.width),
      TanreiItemRowSlot.trailing: place(
        size.width - _paddingEnd - trail.width,
        top + trailTop,
        trail.width,
      ),
    };
    for (final TanreiItemRowSlot slot in _textSlots) {
      final Size text = texts[slot]!;
      offsets[slot] = place(textStart, y, text.width);
      y += text.height;
    }
    return _RowLayout(size, offsets, extraLines);
  }

  @override
  void performLayout() {
    final _RowLayout layout = _compute(constraints, dry: false);
    size = layout.size;
    _extraLines = layout.extraLines;
    for (final TanreiItemRowSlot slot in TanreiItemRowSlot.values) {
      final RenderBox? child = _child(slot);
      if (child != null) {
        (child.parentData! as BoxParentData).offset = layout.offsets[slot]!;
      }
    }
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    for (final RenderBox child in children) {
      context.paintChild(child, offset + (child.parentData! as BoxParentData).offset);
    }
  }

  @override
  bool hitTestSelf(Offset position) => false;

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) {
    for (final RenderBox child in children.toList().reversed) {
      final BoxParentData parentData = child.parentData! as BoxParentData;
      final bool hit = result.addWithPaintOffset(
        offset: parentData.offset,
        position: position,
        hitTest: (BoxHitTestResult result, Offset transformed) =>
            child.hitTest(result, position: transformed),
      );
      if (hit) {
        return true;
      }
    }
    return false;
  }
}
