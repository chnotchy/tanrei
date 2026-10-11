import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/enum_by_name.dart';
import '../primitives/ring.dart';
import '../theme/motion.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// The form of a [TanreiProgressIndicator] (the spec's `variant`): a structural choice drawn by
/// code, not a token axis — a design system cannot add a form by values.
enum TanreiProgressIndicatorVariant {
  /// A bar that fills the width its layout gives it (the default).
  linear,

  /// A ring of a fixed size.
  circular;

  /// The variant named [name] (`linear` or `circular`), for a prop that arrives as text. An unknown
  /// name is [linear], reported in debug builds (PRG-12).
  static TanreiProgressIndicatorVariant fromName(String name) =>
      tanreiEnumByName(values, name, fallback: linear, kind: 'progress-indicator variant');
}

/// Shows how far a task has come, or that it is under way when how far is unknown, as a bar or a
/// ring.
///
/// Implements `specs/progress-indicator.spec.json` with the idiom of Flutter's
/// `ProgressIndicator`: a null [value] is indeterminate, and [semanticsLabel] / [semanticsValue]
/// are the names of the accessible name and value text. Unlike Flutter's (a fraction from 0 to 1),
/// [value] is read between [min] and [max], as `Slider` reads it.
///
/// * Determinate, the indicator covers the fraction `(value − min) / (max − min)` of the track from
///   its start — the inline start of a bar, the top of a ring turning clockwise (PRG-1). Between
///   [min] and [max] a gap of `comp.progress-indicator.track.gap` separates it from the rest of
///   the track — after a bar's indicator, at both ends of a ring's arc — and a bar draws a stop
///   dot of `stop-indicator.size` centered half the thickness before the track's end (PRG-5).
///   A new value eases there over `motion.value-duration` with `motion.value-easing` (PRG-6).
/// * Indeterminate, a bar moves a segment two fifths of the track long from beyond its start to
///   beyond its end once per `motion.cycle-duration` with `motion.cycle-easing`; a ring turns a
///   quarter arc clockwise once per cycle at constant speed (PRG-2).
/// * A bar is `linear.thickness` high across the width its layout gives it; a ring fills a
///   `circular.size` square with a stroke of `circular.thickness` (PRG-3). Track and indicator are
///   `track.color` and `indicator.color`; a bar's ends are rounded by `track.shape` (at most half
///   the thickness) and a ring's arcs have round caps unless `track.shape` is 0 (PRG-4).
/// * Where `MediaQuery.disableAnimationsOf` asks for reduced motion, a value change is immediate
///   and the indeterminate form stands still: the indicator covers the whole track and its opacity
///   eases from 1 to 0 and back once per cycle (PRG-7).
/// * Semantics are those of Flutter's own progress indicators: [semanticsLabel] is the name and,
///   when determinate, the value is [semanticsValue] or else the clamped percentage (PRG-8,
///   PRG-9). Flutter 3.32 cannot say "progressbar", a range or "busy". Never
///   focusable, never a live region (PRG-10).
/// * A value outside [min]…[max] is drawn and exposed clamped; a [max] not above [min] draws the
///   track alone and exposes 0 %; debug builds report both (PRG-11). A [size] the design system
///   does not have renders as medium (PRG-12). A right-to-left bar fills from the right; a ring is
///   never mirrored (PRG-13). The animation runs through tickers, so it stops wherever `TickerMode`
///   is off — a route that is not visible — and while the app is in the background (PRG-14). An
///   empty [semanticsLabel] still renders and is reported in debug builds (PRG-15).
///
/// Every design value comes from the `TanreiProgressIndicatorTokens` of the active design system
/// (`TanreiTheme.of(context).system.progressIndicator`).
class TanreiProgressIndicator extends StatefulWidget {
  /// Creates a progress indicator. A null [value] makes it indeterminate.
  const TanreiProgressIndicator({
    super.key,
    required this.semanticsLabel,
    this.value,
    this.min = 0,
    this.max = 1,
    this.variant = TanreiProgressIndicatorVariant.linear,
    this.size = TanreiProgressIndicatorSize.medium,
    this.semanticsValue = '',
  });

  /// How far the task has come, between [min] and [max]. Null: indeterminate.
  final double? value;

  /// The value at which nothing is done.
  final double min;

  /// The value at which the task is done.
  final double max;

  /// A bar ([TanreiProgressIndicatorVariant.linear]) or a ring.
  final TanreiProgressIndicatorVariant variant;

  /// The bar's thickness or the ring's box. An open key: a design system may add sizes.
  final TanreiProgressIndicatorSize size;

  /// The accessible name: what is in progress ("Uploading report.pdf"). Required; an empty one is
  /// reported in debug builds.
  final String semanticsLabel;

  /// How assistive technology reads the value when a percentage is not the natural reading ("3 of
  /// 10 files"). Empty reads the percentage.
  final String semanticsValue;

  /// Whether the indicator shows a value.
  bool get isDeterminate => value != null;

  @override
  State<TanreiProgressIndicator> createState() => _TanreiProgressIndicatorState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(EnumProperty<TanreiProgressIndicatorVariant>('variant', variant))
      ..add(StringProperty('size', size.name, quoted: false))
      ..add(DoubleProperty('value', value, ifNull: 'indeterminate'))
      ..add(DoubleProperty('min', min, defaultValue: 0.0))
      ..add(DoubleProperty('max', max, defaultValue: 1.0))
      ..add(StringProperty('semanticsLabel', semanticsLabel))
      ..add(StringProperty('semanticsValue', semanticsValue, defaultValue: ''));
  }
}

/// [value], [min] and [max] as PRG-11 reads them: the fraction of the track to cover (null while
/// indeterminate), and what was not valid.
({double? fraction, List<(String, String, String)> problems}) _fractionOf(
  double? value,
  double min,
  double max,
) {
  final List<(String, String, String)> problems = <(String, String, String)>[];
  if (value == null) {
    return (fraction: null, problems: problems);
  }
  if (!(max > min) || !min.isFinite || !max.isFinite) {
    problems.add(('progress-indicator range', '$min…$max', '0…1, value 0'));
    return (fraction: 0, problems: problems);
  }
  if (value.isNaN) {
    problems.add(('progress-indicator value', '$value', '$min'));
    return (fraction: 0, problems: problems);
  }
  final double clamped = value.clamp(min, max);
  if (clamped != value) {
    problems.add(('progress-indicator value', '$value', '$clamped'));
  }
  return (fraction: (clamped - min) / (max - min), problems: problems);
}

bool _same(double? a, double? b) => a == b || (a != null && b != null && a.isNaN && b.isNaN);

class _TanreiProgressIndicatorState extends State<TanreiProgressIndicator>
    with TickerProviderStateMixin<TanreiProgressIndicator> {
  /// One indeterminate cycle, repeated (PRG-2, PRG-7).
  late final AnimationController _cycle = AnimationController(vsync: this);

  /// A value change (PRG-6): from [_from] to the current fraction.
  late final AnimationController _change = AnimationController(vsync: this, value: 1);
  double _from = 0;

  TanreiProgressIndicatorTokens get _tokens => TanreiTheme.of(context).system.progressIndicator;

  @override
  void initState() {
    super.initState();
    _debugReport(null);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _syncCycle();
  }

  @override
  void didUpdateWidget(TanreiProgressIndicator oldWidget) {
    super.didUpdateWidget(oldWidget);
    _debugReport(oldWidget);
    final double? before = _fractionOf(oldWidget.value, oldWidget.min, oldWidget.max).fraction;
    final double? after = _fractionOf(widget.value, widget.min, widget.max).fraction;
    if (before != null && after != null && before != after) {
      // PRG-6: from where the indicator's end is drawn now; PRG-7: at once under reduced motion.
      _from = _displayed(before);
      if (MediaQuery.disableAnimationsOf(context)) {
        _change.value = 1;
      } else {
        _change
          ..duration = tanreiDuration(_tokens.motionValueDuration)
          ..forward(from: 0);
      }
    } else if (before == null || after == null) {
      // PRG-6: a switch between determinate and indeterminate takes effect at once.
      _change.value = 1;
    }
    _syncCycle();
  }

  /// The fraction drawn for a target of [target] at this point of a value change.
  double _displayed(double target) {
    if (_change.value >= 1) {
      return target;
    }
    final double t = _tokens.motionValueEasing.toCurve().transform(_change.value);
    return _from + (target - _from) * t;
  }

  /// Runs the cycle while indeterminate, at the cycle duration of the system in the theme.
  void _syncCycle() {
    final Duration duration = tanreiDuration(_tokens.motionCycleDuration);
    if (widget.isDeterminate) {
      _cycle
        ..stop()
        ..value = 0;
    } else if (!_cycle.isAnimating || _cycle.duration != duration) {
      _cycle
        ..duration = duration
        ..repeat();
    }
  }

  void _debugReport(TanreiProgressIndicator? oldWidget) {
    assert(() {
      final bool changed =
          oldWidget == null ||
          !_same(oldWidget.value, widget.value) ||
          !_same(oldWidget.min, widget.min) ||
          !_same(oldWidget.max, widget.max);
      if (changed) {
        for (final (String kind, String key, String fallback) in _fractionOf(
          widget.value,
          widget.min,
          widget.max,
        ).problems) {
          debugTanreiReportUnknownValue(kind, key, fallback);
        }
      }
      // PRG-15: reported when first built without a name, and when it loses the one it had.
      final bool had = oldWidget == null || tanreiIsAccessibleName(oldWidget.semanticsLabel);
      if (had && !tanreiIsAccessibleName(widget.semanticsLabel)) {
        debugTanreiReportMissingName('progress-indicator', widget);
      }
      return true;
    }());
  }

  @override
  void dispose() {
    _cycle.dispose();
    _change.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiProgressIndicatorTokens tokens = theme.system.progressIndicator;
    // Total lookup: an unknown size renders as medium and is reported (PRG-12).
    final TanreiProgressIndicatorSizeTokens size = tokens.sizes[widget.size];
    final double? fraction = _fractionOf(widget.value, widget.min, widget.max).fraction;
    final bool reducedMotion = MediaQuery.disableAnimationsOf(context);
    final bool linear = widget.variant == TanreiProgressIndicatorVariant.linear;

    final _ProgressPainter painter = _ProgressPainter(
      linear: linear,
      fraction: fraction == null ? null : () => _displayed(fraction),
      cycle: _cycle,
      change: _change,
      reducedMotion: reducedMotion,
      trackColor: theme.paint(tokens.trackColor),
      indicatorColor: theme.paint(tokens.indicatorColor),
      thickness: linear ? size.linearThickness : size.circularThickness,
      shape: tokens.trackShape,
      gap: tokens.trackGap,
      stopSize: tokens.stopIndicatorSize,
      cycleCurve: tokens.motionCycleEasing.toCurve(),
      // PRG-2: a ring turns at constant speed, `sys.motion.easing.linear`.
      turnCurve: theme.system.motion.easing.linear.toCurve(),
      // PRG-13: a bar follows the direction, a ring never does.
      rtl: linear && Directionality.maybeOf(context) == TextDirection.rtl,
    );

    // PRG-8 / PRG-9: Flutter's progress indicator semantics — the name, and a value only while
    // determinate. PRG-10: no focus, no live region.
    final String? semanticValue = fraction == null
        ? null
        : widget.semanticsValue.isNotEmpty
        ? widget.semanticsValue
        : '${(fraction * 100).round()}%';

    return Semantics(
      container: true,
      label: widget.semanticsLabel,
      value: semanticValue,
      child: linear
          ? LimitedBox(
              // PRG-3: the full width its layout gives it (none when it gives no bound); the
              // size's thickness across.
              maxWidth: 0,
              child: SizedBox(
                width: double.infinity,
                height: size.linearThickness,
                child: CustomPaint(painter: painter),
              ),
            )
          : SizedBox.square(
              dimension: size.circularSize,
              child: CustomPaint(painter: painter),
            ),
    );
  }
}

/// Draws the track and the indicator of one frame.
class _ProgressPainter extends CustomPainter {
  _ProgressPainter({
    required this.linear,
    required this.fraction,
    required this.cycle,
    required this.change,
    required this.reducedMotion,
    required this.trackColor,
    required this.indicatorColor,
    required this.thickness,
    required this.shape,
    required this.gap,
    required this.stopSize,
    required this.cycleCurve,
    required this.turnCurve,
    required this.rtl,
  }) : super(repaint: Listenable.merge(<Listenable>[cycle, change]));

  final bool linear;

  /// The fraction to draw now; null while indeterminate.
  final double Function()? fraction;
  final Animation<double> cycle;
  final Animation<double> change;
  final bool reducedMotion;
  final Color trackColor;
  final Color indicatorColor;
  final double thickness;
  final double shape;
  final double gap;
  final double stopSize;
  final Curve cycleCurve;
  final Curve turnCurve;
  final bool rtl;

  @override
  void paint(Canvas canvas, Size size) {
    if (linear) {
      _paintBar(canvas, size);
    } else {
      _paintRing(canvas, size);
    }
  }

  void _paintBar(Canvas canvas, Size size) {
    final double width = size.width;
    final double height = size.height;
    if (width <= 0 || height <= 0) {
      return;
    }
    // PRG-4: the ends are rounded by the track shape, at most half the thickness.
    final Radius radius = Radius.circular(math.min(shape, height / 2));
    // A segment from [start] to [end] along the bar, mirrored in a right-to-left layout.
    void segment(double start, double end, Color color) {
      final double from = start.clamp(0, width);
      final double to = end.clamp(0, width);
      if (to <= from || color.a == 0) {
        return;
      }
      final Rect rect = rtl
          ? Rect.fromLTRB(width - to, 0, width - from, height)
          : Rect.fromLTRB(from, 0, to, height);
      canvas.drawRRect(RRect.fromRectAndRadius(rect, radius), Paint()..color = color);
    }

    final double? value = fraction?.call();
    if (value == null) {
      segment(0, width, trackColor);
      final double t = cycle.value;
      if (reducedMotion) {
        // PRG-7: still, over the whole track, pulsing.
        segment(0, width, tanreiFade(indicatorColor, tanreiPulseOpacity(cycleCurve, t)));
      } else {
        // PRG-2: two fifths of the track, from beyond its start to beyond its end.
        final double length = width * 2 / 5;
        final double start = -length + cycleCurve.transform(t) * (width + length);
        segment(start, start + length, indicatorColor);
      }
      return;
    }
    final double end = width * value;
    if (gap > 0 && value > 0 && value < 1) {
      // PRG-5: empty space between the indicator's end and the rest of the track.
      segment(end + gap, width, trackColor);
    } else {
      segment(0, width, trackColor);
    }
    segment(0, end, indicatorColor);
    if (stopSize > 0 && indicatorColor.a > 0) {
      // PRG-5: the stop dot, centered in the thickness half the thickness before the track's end
      // (concentric with the rounded end).
      final double x = width - height / 2;
      canvas.drawCircle(
        Offset(rtl ? width - x : x, height / 2),
        stopSize / 2,
        Paint()..color = indicatorColor,
      );
    }
  }

  void _paintRing(Canvas canvas, Size size) {
    // PRG-3: the stroke's outer edge touches the square.
    final TanreiRing ring = TanreiRing(size, thickness);
    // PRG-4: round caps unless the track shape is none.
    final StrokeCap cap = shape > 0 ? StrokeCap.round : StrokeCap.butt;
    const double top = TanreiRing.top;
    const double turn = TanreiRing.turn;
    void arc(double start, double sweep, Color color) =>
        ring.arc(canvas, start, sweep, color, cap: cap);

    final double? value = fraction?.call();
    if (value == null) {
      arc(top, turn, trackColor);
      final double t = cycle.value;
      if (reducedMotion) {
        // PRG-7: the whole circle, still, pulsing.
        arc(top, turn, tanreiFade(indicatorColor, tanreiPulseOpacity(cycleCurve, t)));
      } else {
        // PRG-2: a quarter arc turning clockwise at constant speed (never mirrored, PRG-13).
        arc(top + turn * turnCurve.transform(t), turn / 4, indicatorColor);
      }
      return;
    }
    final double sweep = turn * value;
    if (gap > 0 && value > 0 && value < 1) {
      // PRG-5: on a ring the gap is at both ends of the indicator's arc — empty space along the
      // track, past the round caps, which reach half the stroke beyond each end of an arc.
      final double caps = cap == StrokeCap.round ? ring.stroke : 0;
      final double skip = (gap + caps) / ring.radius;
      arc(top + sweep + skip, turn - sweep - 2 * skip, trackColor);
    } else {
      arc(top, turn, trackColor);
    }
    arc(top, sweep, indicatorColor);
  }

  @override
  bool shouldRepaint(_ProgressPainter oldDelegate) =>
      oldDelegate.linear != linear ||
      (oldDelegate.fraction == null) != (fraction == null) ||
      oldDelegate.fraction?.call() != fraction?.call() ||
      oldDelegate.reducedMotion != reducedMotion ||
      oldDelegate.trackColor != trackColor ||
      oldDelegate.indicatorColor != indicatorColor ||
      oldDelegate.thickness != thickness ||
      oldDelegate.shape != shape ||
      oldDelegate.gap != gap ||
      oldDelegate.stopSize != stopSize ||
      oldDelegate.cycleCurve != cycleCurve ||
      oldDelegate.turnCurve != turnCurve ||
      oldDelegate.rtl != rtl;
}
