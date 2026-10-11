import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/container_decoration.dart';
import '../primitives/corner_shape.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// Marks an anchor — an icon, an icon button, a navigation item, an avatar — with a dot or a small
/// count to show that something is waiting.
///
/// Implements `specs/badge.spec.json` with the idiom of Flutter's `Badge.count`: the anchor is
/// [child], and a null [count] is the dot (Flutter's plain `Badge`).
///
/// * [count] null draws a dot — a circle of diameter `comp.badge.dot.size`, whatever the
///   container's corners — whose center sits `comp.badge.dot.offset` inside the anchor's top-end
///   corner (BDG-1). Above 0 it draws a pill at least `comp.badge.container.height` high and as
///   wide as high, with corners of `comp.badge.container.shape` and
///   `comp.badge.container.padding-inline` either side of the number, whose leading circle (a
///   square of its drawn height at its start — of the grown pill at enlarged text) is centered `comp.badge.container.offset` inside the top-end corner, so a longer count grows away
///   from the anchor (BDG-2, BDG-3). A count above [max] shows as [max] followed by a plus sign
///   (BDG-4). 0 draws nothing and leaves the anchor exactly as it is without a badge (BDG-5).
/// * An outline of `comp.badge.outline.width` in `comp.badge.outline.color` is drawn outside the dot
///   or the pill, without moving or growing it (BDG-6).
/// * The badge takes no space and no input: the anchor keeps its size and position, the badge may
///   extend past it, and a pointer over it reaches the anchor (BDG-7).
/// * Assistive technology does not see the drawn dot or number. [semanticLabel] (the spec's
///   `label`, "3 unread") is added to the anchor's semantics **value** — the anchor and the badge
///   become one node, announced as the anchor's name followed by the label; without a label the
///   displayed text (`999+`) is added instead (BDG-8). A dot without a label still renders and is
///   reported in debug builds through `debugTanreiReportMissingName` (BDG-9). A change updates the
///   value and is never announced by itself (BDG-10).
/// * In a right-to-left layout the top-end corner is the top-left one and a longer count grows to
///   the left; the number is laid out left to right on its own, so `999+` keeps its plus sign after
///   the digits (BDG-11).
/// * The number is written in the digits of the current locale (`Localizations.localeOf`), with no
///   grouping separator and with tabular figures (BDG-12), and grows with the text size — the dot
///   does not (BDG-13).
/// * A negative [count] renders as 0, a fractional one rounded down, and a [max] below 1 as 999;
///   debug builds report each through `debugTanreiReportUnknownValue` (BDG-14).
///
/// Every design value comes from the `TanreiBadgeTokens` of the active design system
/// (`TanreiTheme.of(context).system.badge`).
class TanreiBadge extends StatefulWidget {
  /// Creates a badge on [child]. A null [count] is the dot.
  const TanreiBadge({
    super.key,
    this.count,
    this.max = defaultMax,
    this.semanticLabel = '',
    required this.child,
  });

  /// The spec's default for [max].
  static const int defaultMax = 999;

  /// How many things are waiting. Null draws the dot (something is new), 0 draws nothing, above 0
  /// draws the number.
  final num? count;

  /// The largest count shown as it is; a larger one shows as [max] followed by a plus sign.
  final num max;

  /// What assistive technology reads after the anchor's own name ("3 unread"). Without it the
  /// displayed count is read; a dot needs one.
  final String semanticLabel;

  /// The anchor the badge sits on.
  final Widget child;

  /// The text a badge with [count] and [max] shows in [locale]: null for the dot and for nothing
  /// drawn (0 or less), the count, or [max] followed by a plus sign. The values are read as BDG-14
  /// says; nothing is reported here.
  static String? displayText(num? count, {num max = defaultMax, Locale? locale}) {
    final _Resolved resolved = _resolve(count, max);
    return resolved.text(locale);
  }

  @override
  State<TanreiBadge> createState() => _TanreiBadgeState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DiagnosticsProperty<num>('count', count, ifNull: 'dot'))
      ..add(DiagnosticsProperty<num>('max', max, defaultValue: defaultMax))
      ..add(StringProperty('semanticLabel', semanticLabel, defaultValue: ''));
  }
}

/// [TanreiBadge.count] and [TanreiBadge.max] as BDG-14 reads them.
@immutable
class _Resolved {
  const _Resolved({required this.count, required this.max, this.problems = const <String>[]});

  /// Null: the dot. 0: nothing. Above 0: a number, capped by [max] when drawn.
  final int? count;
  final int max;

  /// What was not a valid value, as `kind|value|fallback`.
  final List<String> problems;

  bool get isDot => count == null;
  bool get isNothing => count != null && count! <= 0;

  String? text(Locale? locale) {
    final int? value = count;
    if (value == null || value <= 0) {
      return null;
    }
    return value > max ? '${_digits(max, locale)}+' : _digits(value, locale);
  }
}

_Resolved _resolve(num? count, num max) {
  final List<String> problems = <String>[];
  int resolvedMax;
  if (max.isNaN || max < 1) {
    resolvedMax = TanreiBadge.defaultMax;
    problems.add('badge max|$max|${TanreiBadge.defaultMax}');
  } else if (max.isInfinite) {
    resolvedMax = TanreiBadge.defaultMax;
    problems.add('badge max|$max|${TanreiBadge.defaultMax}');
  } else {
    resolvedMax = max.floor();
    if (resolvedMax != max) {
      problems.add('badge max|$max|$resolvedMax');
    }
  }
  if (count == null) {
    return _Resolved(count: null, max: resolvedMax, problems: problems);
  }
  int resolvedCount;
  if (count.isNaN || count < 0) {
    resolvedCount = 0;
    problems.add('badge count|$count|0');
  } else if (count.isInfinite) {
    // Larger than any max: drawn capped.
    resolvedCount = resolvedMax + 1;
    problems.add('badge count|$count|${resolvedMax + 1}');
  } else {
    resolvedCount = count.floor();
    if (resolvedCount != count) {
      problems.add('badge count|$count|$resolvedCount');
    }
  }
  return _Resolved(count: resolvedCount, max: resolvedMax, problems: problems);
}

/// The zero digit of the default numbering system of [locale] when it is not the Latin one — the
/// CLDR `defaultNumberingSystem` of the locales whose default is not `latn` (BDG-12). Flutter has
/// no number formatting without `package:intl`; this is the subset a count needs: digits, no
/// grouping.
int? _zeroDigit(Locale? locale) {
  if (locale == null) {
    return null;
  }
  const int arab = 0x0660; // Arabic-Indic
  const int arabext = 0x06F0; // Extended Arabic-Indic
  const int beng = 0x09E6; // Bengali
  const int deva = 0x0966; // Devanagari
  const int mymr = 0x1040; // Myanmar
  const int tibt = 0x0F20; // Tibetan
  final String? region = locale.countryCode;
  final String? script = locale.scriptCode;
  if (script == 'Latn') {
    return null;
  }
  return switch (locale.languageCode) {
    'ar' => const <String>{'DZ', 'EH', 'LY', 'MA', 'TN'}.contains(region) ? null : arab,
    'ckb' || 'sd' => arab,
    'fa' || 'ps' || 'ks' => arabext,
    'ur' => region == 'IN' ? arabext : null,
    'uz' || 'pa' => script == 'Arab' ? arabext : null,
    'bn' || 'as' || 'mni' => beng,
    'mr' || 'ne' => deva,
    'my' => mymr,
    'dz' => tibt,
    _ => null,
  };
}

/// [value] in the digits of [locale], with no grouping separator.
String _digits(int value, Locale? locale) {
  final String latin = value.toString();
  final int? zero = _zeroDigit(locale);
  if (zero == null) {
    return latin;
  }
  return String.fromCharCodes(latin.codeUnits.map((int unit) => zero + unit - 0x30));
}

/// Whether [a] and [b] are the same value; NaN is the same as NaN (it is reported once).
bool _sameValue(num? a, num? b) => a == b || (a != null && b != null && a.isNaN && b.isNaN);

class _TanreiBadgeState extends State<TanreiBadge> {
  @override
  void initState() {
    super.initState();
    _debugReport(null);
  }

  @override
  void didUpdateWidget(TanreiBadge oldWidget) {
    super.didUpdateWidget(oldWidget);
    _debugReport(oldWidget);
  }

  /// BDG-9 and BDG-14, in debug builds: reported when the badge is first built with a value, and
  /// again only when the value changes — never on every build.
  void _debugReport(TanreiBadge? oldWidget) {
    assert(() {
      if (oldWidget == null ||
          !_sameValue(oldWidget.count, widget.count) ||
          !_sameValue(oldWidget.max, widget.max)) {
        for (final String problem in _resolve(widget.count, widget.max).problems) {
          final List<String> parts = problem.split('|');
          debugTanreiReportUnknownValue(parts[0], parts[1], parts[2]);
        }
      }
      final bool silentDot = widget.count == null && !tanreiIsAccessibleName(widget.semanticLabel);
      final bool wasSilentDot =
          oldWidget != null &&
          oldWidget.count == null &&
          !tanreiIsAccessibleName(oldWidget.semanticLabel);
      if (silentDot && !wasSilentDot) {
        debugTanreiReportMissingName('badge', widget);
      }
      return true;
    }());
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiBadgeTokens tokens = theme.system.badge;
    final _Resolved resolved = _resolve(widget.count, widget.max);
    final String? text = resolved.text(Localizations.maybeLocaleOf(context));
    final TextDirection direction = Directionality.maybeOf(context) ?? TextDirection.ltr;

    // BDG-8: the label, or without one the displayed text, joins the anchor's semantics. Nothing
    // for 0 (BDG-5), and nothing for a dot without a label (reported, BDG-9).
    final String? description = resolved.isNothing
        ? null
        : tanreiIsAccessibleName(widget.semanticLabel)
        ? widget.semanticLabel
        : text;

    // The pill's corners are the container shape; the dot is a circle whatever they are (BDG-1).
    Decoration decoration(double radius) => TanreiContainerDecoration(
      shape: TanreiCornerShape(smoothing: theme.system.shape.cornerSmoothing, radius: radius),
      color: theme.paint(tokens.containerColor),
      // BDG-6: outside the edge, so it neither grows nor moves the badge.
      border: Border.all(
        color: theme.paint(tokens.outlineColor),
        width: tokens.outlineWidth,
        strokeAlign: BorderSide.strokeAlignOutside,
      ),
    );

    final Widget mark;
    if (resolved.isDot) {
      // BDG-1 / BDG-13: a circle of the dot's diameter; it is not text and keeps its size.
      mark = DecoratedBox(
        decoration: decoration(tokens.dotSize / 2),
        child: SizedBox.square(dimension: tokens.dotSize),
      );
    } else if (text != null) {
      // BDG-2 / BDG-13: at least the token height and as wide as high; grows with the text.
      mark = DecoratedBox(
        decoration: decoration(tokens.containerShape),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            minHeight: tokens.containerHeight,
            minWidth: tokens.containerHeight,
          ),
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: tokens.containerPaddingInline),
            child: Center(
              widthFactor: 1,
              heightFactor: 1,
              child: Text(
                text,
                // BDG-11: the number is isolated from the surrounding direction.
                textDirection: TextDirection.ltr,
                textAlign: TextAlign.center,
                maxLines: 1,
                softWrap: false,
                // BDG-12: tabular figures, where the font has them.
                style: theme
                    .textStyle(tokens.labelTypescale, color: theme.paint(tokens.labelColor))
                    .copyWith(fontFeatures: const <FontFeature>[FontFeature.tabularFigures()]),
              ),
            ),
          ),
        ),
      );
    } else {
      // BDG-5: nothing at all.
      mark = const SizedBox.shrink();
    }

    return _AnchorDescription(
      description: description,
      textDirection: direction,
      // BDG-7: the anchor keeps the constraints it would have without a badge (passthrough), and
      // the badge is laid over it without taking space or input.
      child: Stack(
        fit: StackFit.passthrough,
        clipBehavior: Clip.none,
        children: <Widget>[
          widget.child,
          Positioned.fill(
            child: IgnorePointer(
              child: ExcludeSemantics(
                child: CustomSingleChildLayout(
                  delegate: _BadgePlacement(
                    // BDG-1 / BDG-3: the dot's center, or the pill's leading circle's.
                    offset: resolved.isDot ? tokens.dotOffset : tokens.containerOffset,
                    textDirection: direction,
                  ),
                  child: mark,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Places the dot or the pill on the anchor: the center of the dot, or of the pill's leading circle
/// (a square of its height at its start), [offset] inside the top-end corner on both axes; a
/// longer pill grows toward the end (BDG-1, BDG-3, BDG-11).
class _BadgePlacement extends SingleChildLayoutDelegate {
  const _BadgePlacement({required this.offset, required this.textDirection});

  final double offset;
  final TextDirection textDirection;

  @override
  BoxConstraints getConstraintsForChild(BoxConstraints constraints) => const BoxConstraints();

  @override
  Offset getPositionForChild(Size size, Size childSize) {
    final double radius = childSize.height / 2;
    final double top = offset - radius;
    return switch (textDirection) {
      TextDirection.ltr => Offset(size.width - offset - radius, top),
      TextDirection.rtl => Offset(offset + radius - childSize.width, top),
    };
  }

  @override
  bool shouldRelayout(_BadgePlacement oldDelegate) =>
      oldDelegate.offset != offset || oldDelegate.textDirection != textDirection;
}

/// Makes the anchor and the badge one semantics node whose value is [description] (BDG-8); with
/// no description it adds nothing, and the anchor is announced as it is (BDG-5).
class _AnchorDescription extends SingleChildRenderObjectWidget {
  const _AnchorDescription({
    required this.description,
    required this.textDirection,
    required super.child,
  });

  final String? description;
  final TextDirection textDirection;

  @override
  _RenderAnchorDescription createRenderObject(BuildContext context) =>
      _RenderAnchorDescription(description, textDirection);

  @override
  void updateRenderObject(BuildContext context, _RenderAnchorDescription renderObject) {
    renderObject
      ..description = description
      ..textDirection = textDirection;
  }
}

class _RenderAnchorDescription extends RenderProxyBox {
  _RenderAnchorDescription(this._description, this._textDirection);

  TextDirection get textDirection => _textDirection;
  TextDirection _textDirection;
  set textDirection(TextDirection value) {
    if (value != _textDirection) {
      _textDirection = value;
      markNeedsSemanticsUpdate();
    }
  }

  String? get description => _description;
  String? _description;
  set description(String? value) {
    if (value != _description) {
      _description = value;
      markNeedsSemanticsUpdate();
    }
  }

  @override
  void describeSemanticsConfiguration(SemanticsConfiguration config) {
    super.describeSemanticsConfiguration(config);
    final String? description = _description;
    if (description == null) {
      return;
    }
    // BDG-10: a value, not a live region: a change is read when the anchor is reached, never
    // announced by itself.
    config
      ..isSemanticBoundary = true
      ..isMergingSemanticsOfDescendants = true
      ..value = description
      ..textDirection = _textDirection;
  }
}
