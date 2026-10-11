import 'dart:math' as math;
import 'dart:ui' show lerpDouble;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/container_decoration.dart';
import '../primitives/corner_shape.dart';
import '../primitives/elevation.dart';
import '../primitives/enum_by_name.dart';
import '../primitives/focus_ring.dart';
import '../primitives/ignored_value.dart';
import '../primitives/pressable.dart';
import '../primitives/selection_control.dart';
import '../theme/motion.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// When a [TanreiSlider] shows a handle's value beside it (the spec's `valueIndicator`).
enum TanreiSliderValueIndicator {
  /// Never.
  none,

  /// While the handle is pressed or has keyboard focus.
  active,

  /// All the time.
  always;

  /// The value named [name] (`none`, `active` or `always`), for a prop that arrives as text. An
  /// unknown name is [none], reported in debug builds (SLD-23).
  static TanreiSliderValueIndicator fromName(String name) => tanreiEnumByName(
    TanreiSliderValueIndicator.values,
    name,
    fallback: TanreiSliderValueIndicator.none,
    kind: 'slider valueIndicator',
  );
}

/// Called with a range slider's two values: its start handle's and its end handle's.
typedef TanreiSliderRangeChanged = void Function(double start, double end);

/// Lets people choose a value, or a range of values, from a continuous or stepped scale by dragging
/// a handle along a track.
///
/// Implements `specs/slider.spec.json` with the idiom of Flutter's `Slider`:
///
/// * [value] and [onChanged] (the spec's `value` and `input`): the owner keeps the value and
///   rebuilds with the one [onChanged] reports, for every change during a drag, a key press or an
///   assistive-technology action; [onChangeEnd] (the spec's `change`) is called once when the
///   person has finished, always after the last [onChanged]. A null [onChanged] disables the slider
///   (the spec's `disabled`). Setting [value] never calls either.
/// * [TanreiSlider.range] is the spec's `range`: [start] (the spec's `startValue`) and `end` (its
///   `value`), reported together as `(start, end)`, since Flutter's `RangeValues` belongs to
///   Material.
/// * [min], [max] and [step]: `step` is a size (0 continuous), not Material's `divisions`.
///   [origin] starts the active track (null: at [min]); [showStops] (the spec's `stops`) draws a dot
///   at every step.
/// * [valueIndicator] shows a handle's value beside it; [semanticValue] and [startSemanticValue]
///   (the spec's `valueText` and `startValueText`) are the words for the value, spoken and shown
///   in place of the number. [semanticLabel] and [startSemanticLabel] (the spec's `label` and
///   `startLabel`) name the handles; they are never drawn.
/// * [size] is an open key (`TanreiSliderSize.small`, `medium`, `large`, or a size the
///   system adds); [orientation] is Flutter's `Axis`.
///
/// Each handle is its own `Semantics(slider: true)` node with increase and decrease actions and its
/// own focus node (a range's start handle first). Everything else — the tracks, the stop dots, the
/// round state layer and the value indicator — is drawn by the widgets library and hidden from
/// assistive technology. Every design value comes from `TanreiTheme.of(context).system.slider`.
class TanreiSlider extends StatefulWidget {
  /// Creates a slider with one handle at [value]. Pass a null [onChanged] to disable it.
  const TanreiSlider({
    super.key,
    required this.value,
    required this.onChanged,
    this.onChangeEnd,
    this.min = 0,
    this.max = 100,
    this.step = 0,
    this.origin,
    this.showStops = false,
    this.valueIndicator = TanreiSliderValueIndicator.none,
    this.size = TanreiSliderSize.small,
    this.orientation = Axis.horizontal,
    this.semanticLabel = '',
    this.semanticValue = '',
    this.focusNode,
    this.autofocus = false,
  }) : range = false,
       start = 0,
       onRangeChanged = null,
       onRangeChangeEnd = null,
       startSemanticLabel = '',
       startSemanticValue = '',
       startFocusNode = null;

  /// Creates a slider with two handles, choosing the range from [start] to `end`. Pass a null
  /// `onChanged` to disable it.
  const TanreiSlider.range({
    super.key,
    required this.start,
    required double end,
    required TanreiSliderRangeChanged? onChanged,
    TanreiSliderRangeChanged? onChangeEnd,
    this.min = 0,
    this.max = 100,
    this.step = 0,
    this.showStops = false,
    this.valueIndicator = TanreiSliderValueIndicator.none,
    this.size = TanreiSliderSize.small,
    this.orientation = Axis.horizontal,
    this.semanticLabel = '',
    this.startSemanticLabel = '',
    this.semanticValue = '',
    this.startSemanticValue = '',
    this.focusNode,
    this.startFocusNode,
    this.autofocus = false,
  }) : range = true,
       value = end,
       onRangeChanged = onChanged,
       onRangeChangeEnd = onChangeEnd,
       onChanged = null,
       onChangeEnd = null,
       origin = null;

  /// The value of the only handle, or of a range's end handle.
  final double value;

  /// A range's end value: [value].
  double get end => value;

  /// The value of a range's start handle; unused while [range] is false.
  final double start;

  /// Whether the slider has two handles ([TanreiSlider.range]).
  final bool range;

  /// The lowest value, at the track's start.
  final double min;

  /// The highest value, at the track's end.
  final double max;

  /// 0 is continuous; above 0 the values are [min] plus whole multiples of [step], up to [max].
  final double step;

  /// Where the active track starts; null starts it at [min]. Unused by a range.
  final double? origin;

  /// Whether a dot marks every value a discrete slider can take (the spec's `stops`).
  final bool showStops;

  /// When a handle shows its value beside it.
  final TanreiSliderValueIndicator valueIndicator;

  /// The track's weight and the handle's height.
  final TanreiSliderSize size;

  /// Horizontal runs from the inline start (min) to the inline end; vertical from the bottom up.
  final Axis orientation;

  /// Names the slider (a range's end handle) for assistive technology. Never drawn. Required.
  final String semanticLabel;

  /// Names a range's start handle. Required for a range.
  final String startSemanticLabel;

  /// The value as words ("40 %"), spoken and shown in place of the number; a range's end handle's.
  final String semanticValue;

  /// A range's start handle's [semanticValue].
  final String startSemanticValue;

  /// Called with the new value for every change the person makes (the spec's `input`). Null
  /// disables a one-handle slider.
  final ValueChanged<double>? onChanged;

  /// Called once with the value when the person has finished changing it (the spec's `change`).
  final ValueChanged<double>? onChangeEnd;

  /// A range's `onChanged`, with both values. Null disables a range slider.
  final TanreiSliderRangeChanged? onRangeChanged;

  /// A range's `onChangeEnd`, with both values.
  final TanreiSliderRangeChanged? onRangeChangeEnd;

  /// An optional focus node for the only handle, or a range's end handle.
  final FocusNode? focusNode;

  /// An optional focus node for a range's start handle.
  final FocusNode? startFocusNode;

  /// Whether to focus the handle (a range's start handle) when nothing else is focused.
  final bool autofocus;

  /// Whether the slider reacts to input.
  bool get enabled => range ? onRangeChanged != null : onChanged != null;

  /// The axis named [name] (`horizontal` or `vertical`), for a prop that arrives as text. An
  /// unknown name is [Axis.horizontal], reported in debug builds (SLD-23).
  static Axis orientationFromName(String name) =>
      tanreiEnumByName(Axis.values, name, fallback: Axis.horizontal, kind: 'slider orientation');

  @override
  State<TanreiSlider> createState() => _TanreiSliderState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DoubleProperty('value', value))
      ..add(FlagProperty('range', value: range, ifTrue: 'range'))
      ..add(DoubleProperty('start', start, defaultValue: 0))
      ..add(DoubleProperty('min', min, defaultValue: 0))
      ..add(DoubleProperty('max', max, defaultValue: 100))
      ..add(DoubleProperty('step', step, defaultValue: 0))
      ..add(DoubleProperty('origin', origin, defaultValue: null))
      ..add(FlagProperty('showStops', value: showStops, ifTrue: 'stops'))
      ..add(EnumProperty<TanreiSliderValueIndicator>('valueIndicator', valueIndicator))
      ..add(StringProperty('size', size.name, quoted: false))
      ..add(EnumProperty<Axis>('orientation', orientation, defaultValue: Axis.horizontal))
      ..add(FlagProperty('enabled', value: enabled, ifFalse: 'disabled'))
      ..add(StringProperty('semanticLabel', semanticLabel));
  }
}

/// The two handles of a slider; a one-handle slider has only [end].
enum _Handle { start, end }

/// The scale of a slider (SLD-1, SLD-3, SLD-18, SLD-22): its bounds, its step, snapping, and the
/// value's text.
@immutable
class _Scale {
  _Scale(TanreiSlider widget)
    : min = widget.min,
      max = widget.max,
      step = widget.step > 0 && widget.step.isFinite ? widget.step : 0;

  final double min;
  final double max;
  final double step;

  /// Whether the scale has a length (SLD-22: max above min).
  bool get valid => max > min && min.isFinite && max.isFinite;

  /// The highest value the slider can take: [max], or the last whole step below it.
  double get top => step > 0 ? _tidy(min + ((max - min) / step + 1e-9).floor() * step) : max;

  /// [value] clamped between [min] and [max] and, with a step, snapped to the nearest step.
  double snap(double value) {
    if (!valid) {
      return min;
    }
    double v = value.isNaN ? min : value.clamp(min, max);
    if (step > 0) {
      v = min + ((v - min) / step).round() * step;
      v = v.clamp(min, top);
    }
    return _tidy(v);
  }

  /// Where [value] lies between [min] (0) and [max] (1).
  double fraction(double value) => valid ? ((value - min) / (max - min)).clamp(0, 1) : 0;

  /// The value at [fraction] of the scale, snapped.
  double valueAt(double fraction) => snap(min + fraction * (max - min));

  /// One keyboard step (SLD-3): the step, or one hundredth of the scale.
  double get keyStep => step > 0 ? step : (valid ? (max - min) / 100 : 0);

  /// As many fraction digits as the keyboard step has, at most two (SLD-18).
  int get digits {
    for (int d = 0; d < 2; d++) {
      final double scaled = keyStep * math.pow(10, d);
      if ((scaled - scaled.roundToDouble()).abs() < 1e-6) {
        return d;
      }
    }
    return 2;
  }

  /// [value] as text (SLD-18).
  String format(double value) => value.toStringAsFixed(digits);

  /// The values a discrete slider can take (SLD-9's stops), as fractions.
  List<double> stopFractions() => <double>[
    if (valid && step > 0)
      for (double v = min; v <= top + 1e-9; v = _tidy(v + step)) fraction(v),
  ];

  static double _tidy(double v) => (v * 1e9).roundToDouble() / 1e9;
}

/// How one handle looks in its state (SLD-8, SLD-10, SLD-11): its tokens, evaluated in the scheme.
@immutable
class _HandleVisuals {
  const _HandleVisuals({
    required this.container,
    required this.handle,
    required this.handleWidth,
    required this.elevation,
    required this.track,
    required this.activeTrack,
    required this.stop,
    required this.activeStop,
    required this.opacity,
  });

  final Color container;
  final Color handle;
  final double handleWidth;
  final TanreiResolvedElevation elevation;
  final Color track;
  final Color activeTrack;
  final Color stop;
  final Color activeStop;
  final double opacity;

  static _HandleVisuals lerp(_HandleVisuals a, _HandleVisuals b, double t) => _HandleVisuals(
    container: tanreiLerpColor(a.container, b.container, t),
    handle: tanreiLerpColor(a.handle, b.handle, t),
    handleWidth: lerpDouble(a.handleWidth, b.handleWidth, t)!,
    elevation: TanreiResolvedElevation.lerp(a.elevation, b.elevation, t),
    track: tanreiLerpColor(a.track, b.track, t),
    activeTrack: tanreiLerpColor(a.activeTrack, b.activeTrack, t),
    stop: tanreiLerpColor(a.stop, b.stop, t),
    activeStop: tanreiLerpColor(a.activeStop, b.activeStop, t),
    opacity: lerpDouble(a.opacity, b.opacity, t)!,
  );
}

/// What a handle draws this frame, for the slider's painter.
@immutable
class _HandleReport {
  const _HandleReport({required this.state, required this.visuals, required this.ripple});

  /// The handle's interaction state (its precedence decides whose tokens the tracks take).
  final TanreiInteractionState state;
  final _HandleVisuals visuals;
  final TanreiRipple? ripple;
}

/// Precedence of a handle's state for the parts the handles share (SLD-11): disabled, then pressed
/// over focused over hovered.
int _precedence(TanreiInteractionState state) => switch (state) {
  TanreiInteractionState.disabled => 4,
  TanreiInteractionState.pressed => 3,
  TanreiInteractionState.focused => 2,
  TanreiInteractionState.hovered => 1,
  TanreiInteractionState.enabled => 0,
};

/// Where a slider's parts lie (SLD-7, SLD-21): along the axis from the min end, across it from the
/// top (horizontal) or the left (vertical).
@immutable
class _Geometry {
  const _Geometry({
    required this.length,
    required this.across,
    required this.inset,
    required this.thickness,
    required this.horizontal,
    required this.rtl,
  });

  /// The slider's extent along its axis.
  final double length;

  /// Its thickness across the axis.
  final double across;

  /// Half the container size: the track's inset from each end.
  final double inset;

  /// The track's thickness.
  final double thickness;
  final bool horizontal;
  final bool rtl;

  /// Where the track begins and ends along the axis.
  double get trackStart => inset;
  double get trackEnd => math.max(inset, length - inset);

  /// Where a handle's center travels between: half the track's thickness in from its ends.
  double get travelStart => math.min(trackStart + thickness / 2, trackEnd);
  double get travelEnd => math.max(travelStart, trackEnd - thickness / 2);

  /// The distance along the axis of the point at [fraction] of the travel.
  double along(double fraction) => travelStart + fraction * (travelEnd - travelStart);

  /// A point at [along] on the axis and [offset] from the midline, in the slider's coordinates.
  Offset point(double along, [double offset = 0]) {
    if (horizontal) {
      return Offset(rtl ? length - along : along, across / 2 + offset);
    }
    return Offset(across / 2 + offset, length - along);
  }

  /// A rectangle from [from] to [to] along the axis, [breadth] thick and centered across it.
  Rect span(double from, double to, double breadth) {
    final Offset a = point(from);
    final Offset b = point(to);
    return horizontal
        ? Rect.fromLTRB(
            math.min(a.dx, b.dx),
            across / 2 - breadth / 2,
            math.max(a.dx, b.dx),
            across / 2 + breadth / 2,
          )
        : Rect.fromLTRB(
            across / 2 - breadth / 2,
            math.min(a.dy, b.dy),
            across / 2 + breadth / 2,
            math.max(a.dy, b.dy),
          );
  }

  /// A rectangle [along] × [breadth] (along and across the axis) centered on [center].
  Rect box(Offset center, double along, double breadth) => Rect.fromCenter(
    center: center,
    width: horizontal ? along : breadth,
    height: horizontal ? breadth : along,
  );

  /// The fraction of the travel under [local], clamped.
  double fractionAt(Offset local) {
    final double a = horizontal ? (rtl ? length - local.dx : local.dx) : length - local.dy;
    final double travel = travelEnd - travelStart;
    return travel <= 0 ? 0 : ((a - travelStart) / travel).clamp(0, 1);
  }
}

/// A value moving to a new target over the value motion (SLD-16).
class _Motion {
  _Motion(TickerProvider vsync) : controller = AnimationController(vsync: vsync, value: 1);

  final AnimationController controller;
  double from = 0;
  double to = 0;
  Curve curve = Curves.linear;

  double get value =>
      controller.isCompleted ? to : lerpDouble(from, to, curve.transform(controller.value))!;

  void moveTo(double target, {required bool animate}) {
    if (target == to && (controller.isCompleted || animate)) {
      return;
    }
    from = value;
    to = target;
    if (animate) {
      controller.forward(from: 0);
    } else {
      controller.value = 1;
    }
  }
}

class _TanreiSliderState extends State<TanreiSlider> with TickerProviderStateMixin {
  final GlobalKey _boxKey = GlobalKey();
  final GlobalKey<_SliderHandleState> _startKey = GlobalKey<_SliderHandleState>();
  final GlobalKey<_SliderHandleState> _endKey = GlobalKey<_SliderHandleState>();
  final ValueNotifier<_HandleReport?> _startReport = ValueNotifier<_HandleReport?>(null);
  final ValueNotifier<_HandleReport?> _endReport = ValueNotifier<_HandleReport?>(null);
  FocusNode? _ownStartNode;
  FocusNode? _ownEndNode;
  late final _Motion _startMotion = _Motion(this)..controller.addListener(_rebuild);
  late final _Motion _endMotion = _Motion(this)..controller.addListener(_rebuild);

  late final TapGestureRecognizer _tap = TapGestureRecognizer(
    debugOwner: this,
    supportedDevices: const <PointerDeviceKind>{PointerDeviceKind.touch},
  )..onTapUp = _handleTapUp;
  DragGestureRecognizer? _drag;
  Axis? _dragAxis;

  /// The values the person has set during the current interaction (null outside one), and those
  /// it began with.
  (double, double)? _live;
  (double, double)? _began;

  /// The handle the current press moves, and its pointer.
  _Handle? _pressed;
  int? _pointer;
  bool _pointerIsTouch = false;

  /// Whether a press is dragging a handle: the handle follows it without motion (SLD-16).
  bool _dragging = false;

  _Handle? _hovered;
  String _reported = '';

  _Scale get _scale => _Scale(widget);

  FocusNode get _startNode =>
      widget.startFocusNode ?? (_ownStartNode ??= FocusNode(debugLabel: 'TanreiSlider start'));
  FocusNode get _endNode =>
      widget.focusNode ?? (_ownEndNode ??= FocusNode(debugLabel: 'TanreiSlider'));

  bool get _interactive => widget.enabled && _scale.valid;

  /// The values drawn and exposed (SLD-22): clamped and snapped, a start above the end drawn at the
  /// end.
  (double, double) get _shown {
    final _Scale scale = _scale;
    final double end = scale.snap(widget.value);
    final double start = widget.range ? math.min(scale.snap(widget.start), end) : scale.min;
    return (start, end);
  }

  /// The values the person is changing: those set during the interaction, else those shown.
  (double, double) get _current => _live ?? _shown;

  double _valueOf(_Handle handle, (double, double) values) =>
      handle == _Handle.start ? values.$1 : values.$2;

  void _rebuild() => setState(() {});

  @override
  void initState() {
    super.initState();
    _debugReport(null);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final TanreiSliderTokens tokens = TanreiTheme.of(context).system.slider;
    for (final _Motion motion in <_Motion>[_startMotion, _endMotion]) {
      motion.controller.duration = tanreiDuration(tokens.motionValueDuration);
      motion.curve = tokens.motionValueEasing.toCurve();
    }
    _retarget(animate: false);
  }

  @override
  void didUpdateWidget(TanreiSlider oldWidget) {
    super.didUpdateWidget(oldWidget);
    _debugReport(oldWidget);
    if (!widget.enabled && oldWidget.enabled) {
      _cancelInteraction();
    }
    _retarget(animate: true);
  }

  @override
  void dispose() {
    _tap.dispose();
    _drag?.dispose();
    _startMotion.controller.dispose();
    _endMotion.controller.dispose();
    _startReport.dispose();
    _endReport.dispose();
    _ownStartNode?.dispose();
    _ownEndNode?.dispose();
    super.dispose();
  }

  /// SLD-16: the handles move to the values shown — over the value motion, except while a drag
  /// follows the press or where motion is reduced.
  void _retarget({required bool animate}) {
    final _Scale scale = _scale;
    final (double start, double end) = _shown;
    final bool moves =
        animate && !_dragging && !(MediaQuery.maybeDisableAnimationsOf(context) ?? false);
    _startMotion.moveTo(scale.fraction(start), animate: moves);
    _endMotion.moveTo(scale.fraction(end), animate: moves);
  }

  /// SLD-19 and SLD-22, in debug builds: a handle without a name, and values the slider draws
  /// otherwise than it was given; each once, when it begins.
  void _debugReport(TanreiSlider? oldWidget) {
    assert(() {
      final bool hadName = oldWidget == null || tanreiIsAccessibleName(oldWidget.semanticLabel);
      if (hadName && !tanreiIsAccessibleName(widget.semanticLabel)) {
        debugTanreiReportMissingName('slider', widget);
      }
      if (widget.range) {
        final bool hadStart =
            oldWidget == null ||
            !oldWidget.range ||
            tanreiIsAccessibleName(oldWidget.startSemanticLabel);
        if (hadStart && !tanreiIsAccessibleName(widget.startSemanticLabel)) {
          debugTanreiReportMissingName('slider start handle', widget);
        }
      }
      final _Scale scale = _Scale(widget);
      String off(double v) => '$v is outside ${widget.min}–${widget.max} or off a step';
      final List<(String, String)> problems = <(String, String)>[
        if (!scale.valid)
          (
            'max',
            'max (${widget.max}) is not greater than min (${widget.min}): the handles are drawn at '
                "the track's start and the slider takes no input.",
          ),
        if (widget.step < 0)
          ('step', 'A step below 0 (${widget.step}) is treated as 0: the slider is continuous.'),
        if (scale.valid && scale.snap(widget.value) != widget.value)
          ('value', '${off(widget.value)}: it is drawn as ${scale.snap(widget.value)}.'),
        if (scale.valid && widget.range && scale.snap(widget.start) != widget.start)
          ('start', '${off(widget.start)}: it is drawn as ${scale.snap(widget.start)}.'),
        if (scale.valid && widget.range && scale.snap(widget.start) > scale.snap(widget.value))
          (
            'start',
            'start (${widget.start}) is above the end value: both handles are drawn there.',
          ),
        if (scale.valid &&
            !widget.range &&
            widget.origin != null &&
            scale.snap(widget.origin!) != widget.origin)
          ('origin', '${off(widget.origin!)}: it is drawn as ${scale.snap(widget.origin!)}.'),
      ];
      final String signature = problems.map(((String, String) p) => p.$2).join('|');
      if (signature != _reported) {
        _reported = signature;
        for (final (String prop, String why) in problems) {
          debugTanreiReportIgnoredValue('slider', prop, why, widget);
        }
      }
      return true;
    }());
  }

  // ---------------------------------------------------------------------------------------------
  // Changing values (SLD-1…5).

  /// Moves [handle] to [value], bounded by the other handle (SLD-5) and snapped (SLD-1); emits
  /// input when that changes a value. Returns whether it did.
  bool _move(_Handle handle, double value) {
    final _Scale scale = _scale;
    final (double start, double end) = _current;
    double v = scale.snap(value);
    if (widget.range) {
      v = handle == _Handle.start ? math.min(v, end) : math.max(v, start);
    }
    final (double, double) next = handle == _Handle.start ? (v, end) : (start, v);
    if (next == (start, end)) {
      return false;
    }
    _live = next;
    if (widget.range) {
      widget.onRangeChanged?.call(next.$1, next.$2);
    } else {
      widget.onChanged?.call(next.$2);
    }
    return true;
  }

  /// Emits change for the interaction that began with [_began], if it changed a value (SLD-2).
  void _finish() {
    final (double, double)? began = _began;
    final (double, double)? live = _live;
    _began = null;
    _live = null;
    _dragging = false;
    if (began != null && live != null && live != began) {
      if (widget.range) {
        widget.onRangeChangeEnd?.call(live.$1, live.$2);
      } else {
        widget.onChangeEnd?.call(live.$2);
      }
    }
    _retarget(animate: true);
  }

  /// One key press or assistive-technology action (SLD-3, SLD-4): input, then change, when it
  /// changes the value; nothing when it does not.
  void _adjust(_Handle handle, double Function(double current) target) {
    if (!_interactive) {
      return;
    }
    final (double, double) before = _current;
    _began = before;
    _move(handle, target(_valueOf(handle, before)));
    _finish();
  }

  void _step(_Handle handle, int steps) =>
      _adjust(handle, (double current) => current + steps * _scale.keyStep);

  /// Home and End (SLD-3): the lowest and highest value [handle] can take.
  void _edge(_Handle handle, {required bool highest}) {
    final _Scale scale = _scale;
    final (double start, double end) = _current;
    final double low = widget.range && handle == _Handle.end ? start : scale.min;
    final double high = widget.range && handle == _Handle.start ? end : scale.top;
    _adjust(handle, (_) => highest ? high : low);
  }

  // ---------------------------------------------------------------------------------------------
  // Pointer and touch (SLD-2, SLD-11, SLD-13).

  RenderBox? get _box => _boxKey.currentContext?.findRenderObject() as RenderBox?;

  _Geometry? _geometry;

  double _fractionAtGlobal(Offset global) {
    final RenderBox? box = _box;
    final _Geometry? geometry = _geometry;
    if (box == null || geometry == null) {
      return 0;
    }
    return geometry.fractionAt(box.globalToLocal(global));
  }

  /// The handle a press at [fraction] moves: the nearer one; where the handles meet, the one that
  /// can move toward the press (SLD-2).
  _Handle _handleFor(double fraction) {
    if (!widget.range) {
      return _Handle.end;
    }
    final _Scale scale = _scale;
    final (double start, double end) = _current;
    final double s = scale.fraction(start);
    final double e = scale.fraction(end);
    final double toStart = (fraction - s).abs();
    final double toEnd = (fraction - e).abs();
    if (toStart == toEnd) {
      return fraction < s ? _Handle.start : _Handle.end;
    }
    return toStart < toEnd ? _Handle.start : _Handle.end;
  }

  GlobalKey<_SliderHandleState> _keyOf(_Handle handle) =>
      handle == _Handle.start ? _startKey : _endKey;

  void _handlePointerDown(PointerDownEvent event) {
    if (!_interactive || _pointer != null) {
      return;
    }
    final double fraction = _fractionAtGlobal(event.position);
    final _Handle handle = _handleFor(fraction);
    _pointer = event.pointer;
    _pointerIsTouch = event.kind == PointerDeviceKind.touch;
    _pressed = handle;
    // SLD-13: the pressed state of the handle the press moves, without delay.
    _keyOf(handle).currentState
      ?..press()
      ..focusByPointer();
    if (_pointerIsTouch) {
      // Touch waits for the drag or the tap (SLD-2): a press that turns into a scroll changes
      // nothing.
      _tap.addPointer(event);
      _drag?.addPointer(event);
      return;
    }
    // A fine pointer moves the handle at once, over the value motion (a press that did not drag).
    _began = _current;
    _move(handle, _scale.valueAt(fraction));
  }

  void _handlePointerMove(PointerMoveEvent event) {
    if (event.pointer != _pointer || _pointerIsTouch || _pressed == null || _began == null) {
      return;
    }
    _dragging = true;
    _move(_pressed!, _scale.valueAt(_fractionAtGlobal(event.position)));
    _retarget(animate: false);
  }

  void _handlePointerEnd(PointerEvent event) {
    if (event.pointer != _pointer) {
      return;
    }
    final _Handle? handle = _pressed;
    _pointer = null;
    _pressed = null;
    if (handle != null) {
      _keyOf(handle).currentState?.release();
    }
    if (!_pointerIsTouch) {
      _finish();
    }
  }

  void _handleTapUp(TapUpDetails details) {
    final _Handle handle = _handleFor(_fractionAtGlobal(details.globalPosition));
    _began = _current;
    _move(handle, _scale.valueAt(_fractionAtGlobal(details.globalPosition)));
    _finish();
  }

  void _handleDragStart(DragStartDetails details) {
    if (!_interactive) {
      return;
    }
    final double fraction = _fractionAtGlobal(details.globalPosition);
    final _Handle handle = _pressed ?? _handleFor(fraction);
    _pressed ??= handle;
    _began = _current;
    _dragging = true;
    _move(handle, _scale.valueAt(fraction));
    _retarget(animate: false);
  }

  void _handleDragUpdate(DragUpdateDetails details) {
    final _Handle? handle = _pressed;
    if (handle == null || _began == null) {
      return;
    }
    _move(handle, _scale.valueAt(_fractionAtGlobal(details.globalPosition)));
    _retarget(animate: false);
  }

  void _handleDragEnd([Object? _]) {
    if (_began != null) {
      _finish();
    }
  }

  /// A disabled slider (SLD-20) ends the interaction it was in, without a change.
  void _cancelInteraction() {
    final _Handle? handle = _pressed;
    _pointer = null;
    _pressed = null;
    _began = null;
    _live = null;
    _dragging = false;
    if (handle != null) {
      _keyOf(handle).currentState?.release();
    }
    _setHovered(null);
  }

  DragGestureRecognizer _dragFor(Axis axis) {
    if (_dragAxis == axis && _drag != null) {
      return _drag!;
    }
    _drag?.dispose();
    _dragAxis = axis;
    final DragGestureRecognizer drag = switch (axis) {
      Axis.horizontal => HorizontalDragGestureRecognizer(
        debugOwner: this,
        supportedDevices: const <PointerDeviceKind>{PointerDeviceKind.touch},
      ),
      Axis.vertical => VerticalDragGestureRecognizer(
        debugOwner: this,
        supportedDevices: const <PointerDeviceKind>{PointerDeviceKind.touch},
      ),
    };
    drag
      ..onStart = _handleDragStart
      ..onUpdate = _handleDragUpdate
      ..onEnd = _handleDragEnd
      ..onCancel = _handleDragEnd;
    return _drag = drag;
  }

  /// SLD-11: the handle a press where the fine pointer is would move is hovered.
  void _handleHover(PointerEvent event) {
    _setHovered(_interactive ? _handleFor(_fractionAtGlobal(event.position)) : null);
  }

  void _setHovered(_Handle? handle) {
    if (handle == _hovered) {
      return;
    }
    _hovered = handle;
    _startKey.currentState?.hover(handle == _Handle.start);
    _endKey.currentState?.hover(handle == _Handle.end);
  }

  // ---------------------------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiSystem system = theme.system;
    final TanreiSliderTokens tokens = system.slider;
    // SLD-23: a size the system does not have is small, reported.
    final TanreiSliderSizeTokens size = tokens.sizes[widget.size];
    final bool horizontal = widget.orientation == Axis.horizontal;
    final bool rtl = Directionality.of(context) == TextDirection.rtl;
    final double across = math.max(tokens.containerSize, size.handleHeight);
    final _Scale scale = _scale;
    _dragFor(widget.orientation);

    Widget handle(_Handle which) {
      final bool isStart = which == _Handle.start;
      final double value = _valueOf(which, _current);
      final String words = isStart ? widget.startSemanticValue : widget.semanticValue;
      final (double low, double high) = widget.range
          ? (isStart ? (scale.min, _current.$2) : (_current.$1, scale.top))
          : (scale.min, scale.top);
      return _SliderHandle(
        key: _keyOf(which),
        report: isStart ? _startReport : _endReport,
        enabled: widget.enabled,
        adjustable: _interactive,
        focusNode: isStart ? _startNode : _endNode,
        autofocus: widget.autofocus && (isStart || !widget.range),
        handleHeight: size.handleHeight,
        horizontal: horizontal,
        rtl: rtl,
        valueIndicator: widget.valueIndicator,
        label: isStart ? widget.startSemanticLabel : widget.semanticLabel,
        valueText: words.isNotEmpty ? words : scale.format(value),
        increasedValue: scale.format(math.min(high, scale.snap(value + scale.keyStep))),
        decreasedValue: scale.format(math.max(low, scale.snap(value - scale.keyStep))),
        onStep: (int steps) => _step(which, steps),
        onEdge: (bool highest) => _edge(which, highest: highest),
      );
    }

    return _SliderHitArea(
      extent: system.measure.targetTouch,
      horizontal: horizontal,
      child: LayoutBuilder(
        builder: (BuildContext context, BoxConstraints constraints) {
          final double length = horizontal
              ? (constraints.hasBoundedWidth ? constraints.maxWidth : constraints.minWidth)
              : (constraints.hasBoundedHeight ? constraints.maxHeight : constraints.minHeight);
          final _Geometry geometry = _Geometry(
            length: length,
            across: across,
            inset: tokens.containerSize / 2,
            thickness: size.trackThickness,
            horizontal: horizontal,
            rtl: rtl,
          );
          _geometry = geometry;
          final double startFraction = _startMotion.value.clamp(0, 1);
          final double endFraction = _endMotion.value.clamp(0, 1);
          final double box = math.max(tokens.containerSize, system.measure.targetTouch);
          Widget place(_Handle which, double fraction) {
            final Offset center = geometry.point(geometry.along(fraction));
            return Positioned(
              left: center.dx - box / 2,
              top: center.dy - box / 2,
              width: box,
              height: box,
              child: handle(which),
            );
          }

          final double? origin = widget.range || widget.origin == null
              ? null
              : scale.fraction(scale.snap(widget.origin!));
          final Widget slider = SizedBox(
            key: _boxKey,
            width: horizontal ? length : across,
            height: horizontal ? across : length,
            child: CustomPaint(
              painter: _SliderPainter(
                geometry: geometry,
                reports: <ValueListenable<_HandleReport?>>[
                  if (widget.range) _startReport,
                  _endReport,
                ],
                fractions: <double>[if (widget.range) startFraction, endFraction],
                range: widget.range,
                origin: origin ?? 0,
                // SLD-9: every step while stops is true (a size of 0 draws none).
                stops: widget.showStops ? scale.stopFractions() : const <double>[],
                trackShape: size.trackShape,
                handleHeight: size.handleHeight,
                handleShape: tokens.handleShape,
                containerSize: tokens.containerSize,
                containerShape: tokens.containerShape,
                gap: tokens.trackGap,
                dotSize: tokens.stopIndicatorSize,
                smoothing: system.shape.cornerSmoothing,
                valid: scale.valid,
              ),
              // SLD-5: a range's start handle comes first in the focus order.
              child: FocusTraversalGroup(
                policy: WidgetOrderTraversalPolicy(),
                child: Stack(
                  clipBehavior: Clip.none,
                  children: <Widget>[
                    if (widget.range) place(_Handle.start, startFraction),
                    place(_Handle.end, endFraction),
                  ],
                ),
              ),
            ),
          );
          return MouseRegion(
            onEnter: _handleHover,
            onHover: _handleHover,
            onExit: (_) => _setHovered(null),
            cursor: _interactive ? SystemMouseCursors.click : MouseCursor.defer,
            child: Listener(
              onPointerDown: _handlePointerDown,
              onPointerMove: _handlePointerMove,
              onPointerUp: _handlePointerEnd,
              onPointerCancel: _handlePointerEnd,
              behavior: HitTestBehavior.opaque,
              child: slider,
            ),
          );
        },
      ),
    );
  }
}

/// SLD-7: the whole slider is its hit area, grown across the axis to [extent] without changing its
/// size; a press in the added space lands on the nearest point of the slider.
class _SliderHitArea extends SingleChildRenderObjectWidget {
  const _SliderHitArea({required this.extent, required this.horizontal, super.child});

  final double extent;
  final bool horizontal;

  @override
  _RenderSliderHitArea createRenderObject(BuildContext context) =>
      _RenderSliderHitArea(extent: extent, horizontal: horizontal);

  @override
  void updateRenderObject(BuildContext context, _RenderSliderHitArea renderObject) {
    renderObject
      ..extent = extent
      ..horizontal = horizontal;
  }
}

class _RenderSliderHitArea extends RenderProxyBox {
  _RenderSliderHitArea({required this.extent, required this.horizontal});

  double extent;
  bool horizontal;

  @override
  bool hitTest(BoxHitTestResult result, {required Offset position}) {
    final double grow = math.max(0, (extent - (horizontal ? size.height : size.width)) / 2);
    final Rect area = horizontal
        ? Rect.fromLTRB(0, -grow, size.width, size.height + grow)
        : Rect.fromLTRB(-grow, 0, size.width + grow, size.height);
    if (!area.contains(position)) {
      return false;
    }
    // Half a pixel inside the edge: a box does not contain its right and bottom edges.
    const double inside = 0.5;
    final Offset clamped = Offset(
      position.dx.clamp(0, math.max(0, size.width - inside)).toDouble(),
      position.dy.clamp(0, math.max(0, size.height - inside)).toDouble(),
    );
    hitTestChildren(result, position: clamped);
    result.add(BoxHitTestEntry(this, position));
    return true;
  }
}

/// Paints a slider's tracks, stop dots, state layers and handles (SLD-6…11, SLD-14), from what each
/// handle reports; the tracks, dots and opacity from the handle whose state takes precedence.
class _SliderPainter extends CustomPainter {
  _SliderPainter({
    required this.geometry,
    required this.reports,
    required this.fractions,
    required this.range,
    required this.origin,
    required this.stops,
    required this.trackShape,
    required this.handleHeight,
    required this.handleShape,
    required this.containerSize,
    required this.containerShape,
    required this.gap,
    required this.dotSize,
    required this.smoothing,
    required this.valid,
  }) : super(repaint: Listenable.merge(reports));

  final _Geometry geometry;
  final List<ValueListenable<_HandleReport?>> reports;
  final List<double> fractions;
  final bool range;
  final double origin;
  final List<double> stops;
  final double trackShape;
  final double handleHeight;
  final double handleShape;
  final double containerSize;
  final double containerShape;
  final double gap;
  final double dotSize;
  final double smoothing;
  final bool valid;

  @override
  void paint(Canvas canvas, Size size) {
    final List<_HandleReport> drawn = <_HandleReport>[
      for (final ValueListenable<_HandleReport?> report in reports)
        if (report.value case final _HandleReport r) r,
    ];
    if (drawn.length != fractions.length) {
      return;
    }
    // SLD-11: the tracks, dots and opacity from the highest-precedence state of any handle.
    final _HandleVisuals shared = drawn
        .reduce(
          (_HandleReport a, _HandleReport b) => _precedence(b.state) > _precedence(a.state) ? b : a,
        )
        .visuals;
    final bool dimmed = shared.opacity < 1;
    if (dimmed) {
      canvas.saveLayer(
        (Offset.zero & size).inflate(containerSize),
        Paint()..color = Color.fromRGBO(0, 0, 0, shared.opacity),
      );
    }
    final _Geometry g = geometry;
    final double thickness = g.thickness;
    final List<double> centers = <double>[for (final double f in fractions) g.along(f)];
    double cut(int i) => drawn[i].visuals.handleWidth / 2 + gap;

    // SLD-6, SLD-8: the pieces of the track, each rounded at its ends, the active one between the
    // origin (or the start handle) and the value, none under a handle or its gap.
    final double trackStart = g.trackStart;
    final double trackEnd = g.trackEnd;
    final List<(double, double, bool)> pieces = <(double, double, bool)>[];
    final double activeFrom;
    final double activeTo;
    if (range) {
      pieces
        ..add((trackStart, centers[0] - cut(0), false))
        ..add((centers[0] + cut(0), centers[1] - cut(1), true))
        ..add((centers[1] + cut(1), trackEnd, false));
      activeFrom = fractions[0];
      activeTo = fractions[1];
    } else {
      final double at = origin <= 0 ? trackStart : (origin >= 1 ? trackEnd : g.along(origin));
      final double value = centers[0];
      if (fractions[0] >= origin) {
        if (origin > 0) {
          pieces.add((trackStart, at, false));
        }
        pieces
          ..add((at, value - cut(0), true))
          ..add((value + cut(0), trackEnd, false));
      } else {
        pieces
          ..add((trackStart, value - cut(0), false))
          ..add((value + cut(0), at, true));
        if (origin < 1) {
          pieces.add((at, trackEnd, false));
        }
      }
      activeFrom = math.min(origin, fractions[0]);
      activeTo = math.max(origin, fractions[0]);
    }
    for (final (double from, double to, bool active) in pieces) {
      if (to - from <= 0) {
        continue;
      }
      final Color color = active ? shared.activeTrack : shared.track;
      if (color.a <= 0) {
        continue;
      }
      final Rect rect = g.span(from, to, thickness);
      TanreiCornerShape(
        smoothing: smoothing,
        radius: math.min(trackShape, thickness / 2),
      ).paint(canvas, rect, Paint()..color = color);
    }

    // SLD-9: a dot at each end of the travel that lies on the track, and at every step while stops
    // is true; none under a handle or its gap.
    if (dotSize > 0 && valid) {
      final Set<double> candidates = <double>{0, 1, ...stops};
      final bool everyStep = stops.isNotEmpty;
      for (final double at in candidates.toList()..sort()) {
        final bool onActive = at >= activeFrom - 1e-9 && at <= activeTo + 1e-9;
        final bool isEnd = at == 0 || at == 1;
        if (isEnd && onActive && !everyStep) {
          continue;
        }
        bool covered = false;
        for (int i = 0; i < centers.length; i++) {
          if ((g.along(at) - centers[i]).abs() < cut(i) + dotSize / 2) {
            covered = true;
          }
        }
        if (covered) {
          continue;
        }
        final Color color = onActive ? shared.activeStop : shared.stop;
        if (color.a > 0) {
          canvas.drawCircle(g.point(g.along(at)), dotSize / 2, Paint()..color = color);
        }
      }
    }

    // SLD-10: each handle's round state layer, behind the handles and above the tracks.
    if (containerSize > 0) {
      for (int i = 0; i < drawn.length; i++) {
        final _HandleVisuals v = drawn[i].visuals;
        final Rect rect = Rect.fromCenter(
          center: g.point(centers[i]),
          width: containerSize,
          height: containerSize,
        );
        TanreiContainerDecoration(
          shape: TanreiCornerShape(smoothing: smoothing, radius: containerShape),
          color: v.container.a > 0 ? v.container : null,
          ripple: drawn[i].ripple,
        ).createBoxPainter().paint(canvas, rect.topLeft, ImageConfiguration(size: rect.size));
      }
    }

    // SLD-8: each handle, raised by its elevation, above the tracks.
    for (int i = 0; i < drawn.length; i++) {
      final _HandleVisuals v = drawn[i].visuals;
      final Rect rect = g.box(g.point(centers[i]), v.handleWidth, handleHeight);
      TanreiContainerDecoration(
        shape: TanreiCornerShape(
          smoothing: smoothing,
          radius: math.min(handleShape, rect.shortestSide / 2),
        ),
        color: v.handle.a > 0 ? v.handle : null,
        border: v.elevation.ring,
        boxShadow: v.elevation.shadows.isEmpty ? null : v.elevation.shadows,
      ).createBoxPainter().paint(canvas, rect.topLeft, ImageConfiguration(size: rect.size));
    }
    if (dimmed) {
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_SliderPainter oldDelegate) => true;
}

class _SliderKeyIntent extends Intent {
  const _SliderKeyIntent.step(this.steps, {this.mirrored = false}) : highest = null;
  const _SliderKeyIntent.edge({required bool this.highest}) : steps = 0, mirrored = false;

  /// Keyboard steps up (positive) or down.
  final int steps;

  /// Whether the key names a side (Left and Right Arrow), swapped in a right-to-left horizontal
  /// slider.
  final bool mirrored;

  /// Home (false) or End (true); null for a step.
  final bool? highest;
}

/// SLD-3: the keys of a focused handle.
const Map<ShortcutActivator, Intent> _sliderKeys = <ShortcutActivator, Intent>{
  SingleActivator(LogicalKeyboardKey.arrowRight): _SliderKeyIntent.step(1, mirrored: true),
  SingleActivator(LogicalKeyboardKey.arrowLeft): _SliderKeyIntent.step(-1, mirrored: true),
  SingleActivator(LogicalKeyboardKey.arrowUp): _SliderKeyIntent.step(1),
  SingleActivator(LogicalKeyboardKey.arrowDown): _SliderKeyIntent.step(-1),
  SingleActivator(LogicalKeyboardKey.pageUp): _SliderKeyIntent.step(10),
  SingleActivator(LogicalKeyboardKey.pageDown): _SliderKeyIntent.step(-10),
  SingleActivator(LogicalKeyboardKey.home): _SliderKeyIntent.edge(highest: false),
  SingleActivator(LogicalKeyboardKey.end): _SliderKeyIntent.edge(highest: true),
};

/// One handle: its focus, keys, semantics, interaction state and value indicator. The slider's
/// painter draws what it reports.
class _SliderHandle extends StatefulWidget {
  const _SliderHandle({
    super.key,
    required this.report,
    required this.enabled,
    required this.adjustable,
    required this.focusNode,
    required this.autofocus,
    required this.handleHeight,
    required this.horizontal,
    required this.rtl,
    required this.valueIndicator,
    required this.label,
    required this.valueText,
    required this.increasedValue,
    required this.decreasedValue,
    required this.onStep,
    required this.onEdge,
  });

  final ValueNotifier<_HandleReport?> report;

  /// Whether the slider is enabled: the handle's looks and focus (SLD-20).
  final bool enabled;

  /// Whether keys and assistive technology can change the value: an enabled slider with a scale
  /// (SLD-22: none while max is not above min).
  final bool adjustable;
  final FocusNode focusNode;
  final bool autofocus;
  final double handleHeight;
  final bool horizontal;
  final bool rtl;
  final TanreiSliderValueIndicator valueIndicator;
  final String label;
  final String valueText;
  final String increasedValue;
  final String decreasedValue;
  final ValueChanged<int> onStep;
  final ValueChanged<bool> onEdge;

  @override
  State<_SliderHandle> createState() => _SliderHandleState();
}

class _SliderHandleState extends State<_SliderHandle>
    with
        TickerProviderStateMixin<_SliderHandle>,
        TanreiPressableStateMixin<_SliderHandle, _HandleVisuals> {
  final GlobalKey _handleKey = GlobalKey();
  final OverlayPortalController _overlay = OverlayPortalController(
    debugLabel: 'TanreiSlider value indicator',
  );
  late final AnimationController _indicator = AnimationController(vsync: this);

  /// Whether the value indicator has been built once (its first appearance is not faded).
  bool _indicatorShown = false;

  TanreiSliderTokens get _tokens => TanreiTheme.of(context).system.slider;

  static void _nothing() {}

  // The handle has no activation of its own: a press moves it, keys step it.
  @override
  VoidCallback? get onPressed => widget.enabled ? _nothing : null;

  @override
  bool get activatesAsButton => false;

  @override
  Map<ShortcutActivator, Intent> get activationShortcuts => const <ShortcutActivator, Intent>{};

  @override
  bool get pressedByTaps => false;

  @override
  bool get hoveredByPointer => false;

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  // SLD-14: a ripple grows over the component's feedback duration.
  @override
  Duration get rippleDuration => tanreiDuration(_tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => _tokens.motionStateEasing.toCurve();

  @override
  _HandleVisuals lerpVisuals(_HandleVisuals a, _HandleVisuals b, double t) =>
      _HandleVisuals.lerp(a, b, t);

  /// The slider hovers this handle, or stops (SLD-11).
  void hover(bool hovered) => setHovered(hovered);

  /// The slider's press moves this handle (SLD-13): from its center (SLD-14).
  void press() => beginPress(null);

  /// The press ended.
  void release() => endPress();

  /// SLD-11, SLD-12: a press gives the handle focus, so that the keys go on from it, without the
  /// focused state or the ring until the keyboard is used.
  void focusByPointer() {
    suppressFocusHighlight(true);
    widget.focusNode.requestFocus();
  }

  void _handleFocus() {
    if (!widget.focusNode.hasFocus) {
      suppressFocusHighlight(false);
    }
  }

  @override
  void initState() {
    super.initState();
    // Shown whenever there is an Overlay: the indicator itself fades in and out.
    _overlay.show();
    widget.focusNode.addListener(_handleFocus);
  }

  @override
  void didUpdateWidget(_SliderHandle oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.focusNode != widget.focusNode) {
      oldWidget.focusNode.removeListener(_handleFocus);
      widget.focusNode.addListener(_handleFocus);
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _indicator.duration = stateTransitionDuration;
  }

  @override
  void dispose() {
    widget.focusNode.removeListener(_handleFocus);
    _indicator.dispose();
    super.dispose();
  }

  /// SLD-17: the value indicator shows always, or while the handle is pressed or keyboard-focused;
  /// never while the slider is disabled (SLD-20). It fades over the state motion, at once where
  /// motion is reduced.
  void _syncIndicator() {
    final bool visible =
        isEnabled &&
        switch (widget.valueIndicator) {
          TanreiSliderValueIndicator.none => false,
          TanreiSliderValueIndicator.active => isPressed || isKeyboardFocused,
          TanreiSliderValueIndicator.always => true,
        };
    final double target = visible ? 1 : 0;
    if (_indicator.value == target && !_indicator.isAnimating) {
      _indicatorShown = true;
      return;
    }
    // The first build shows what it shows at once, as every state does.
    if (!_indicatorShown || (MediaQuery.maybeDisableAnimationsOf(context) ?? false)) {
      _indicatorShown = true;
      _indicator.value = target;
    } else if (_indicator.status != (visible ? AnimationStatus.forward : AnimationStatus.reverse)) {
      if (visible) {
        _indicator.forward();
      } else {
        _indicator.reverse();
      }
    }
  }

  Widget _buildIndicator(BuildContext context, {required Size window}) => AnimatedBuilder(
    animation: _indicator,
    builder: (BuildContext _, Widget? _) => _indicatorAt(context, window: window),
  );

  Widget _indicatorAt(BuildContext context, {required Size window}) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiSliderTokens tokens = theme.system.slider;
    final double opacity = stateCurve.transform(_indicator.value);
    if (opacity <= 0) {
      return const SizedBox.shrink();
    }
    return _IndicatorPlacement(
      anchor: () => _handleKey.currentContext?.findRenderObject() as RenderBox?,
      horizontal: widget.horizontal,
      rtl: widget.rtl,
      offset: tokens.valueIndicatorOffset,
      window: window,
      // SLD-17: a read overlay — no focus, no input, hidden from assistive technology.
      child: IgnorePointer(
        child: ExcludeSemantics(
          child: ExcludeFocus(
            child: Opacity(
              opacity: opacity,
              child: DecoratedBox(
                decoration: TanreiContainerDecoration(
                  shape: TanreiCornerShape(
                    smoothing: theme.system.shape.cornerSmoothing,
                    radius: tokens.valueIndicatorContainerShape,
                  ),
                  color: theme.paint(tokens.valueIndicatorContainerColor),
                ),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: tokens.valueIndicatorContainerHeight,
                    minWidth: tokens.valueIndicatorContainerHeight,
                  ),
                  child: Padding(
                    padding: EdgeInsets.symmetric(
                      horizontal: tokens.valueIndicatorContainerPaddingInline,
                    ),
                    child: Center(
                      widthFactor: 1,
                      heightFactor: 1,
                      child: Text(
                        widget.valueText,
                        maxLines: 1,
                        softWrap: false,
                        style: theme.textStyle(
                          tokens.valueIndicatorLabelTypescale,
                          color: theme.paint(tokens.valueIndicatorLabelColor),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiSliderTokens tokens = theme.system.slider;
    final TanreiSliderConditionTokens condition = tokens.conditions.standard;
    final TanreiSliderConditionStateTokens drawn = condition.of(drawnState);
    // SLD-11, SLD-14: the drawn state's tokens; the container color of the state under a ripple or
    // a dim.
    final _HandleVisuals visuals = animateVisuals(
      _HandleVisuals(
        container: theme.paint(condition.of(containerState).containerColor),
        handle: theme.paint(drawn.handleColor),
        handleWidth: drawn.handleWidth,
        elevation: TanreiResolvedElevation.resolve(drawn.handleElevation, theme.colors),
        track: theme.paint(drawn.trackColor),
        activeTrack: theme.paint(drawn.activeTrackColor),
        stop: theme.paint(drawn.stopIndicatorColor),
        activeStop: theme.paint(drawn.activeStopIndicatorColor),
        opacity: tokens.stateTokens(drawnState)?.opacity ?? 1,
      ),
    );
    final TanreiRipple? ripple = rippleFor(
      pressedContainer: () => theme.paint(condition.of(interactionState).containerColor),
      container: visuals.container,
    );
    widget.report.value = _HandleReport(
      state: isEnabled ? interactionState : TanreiInteractionState.disabled,
      visuals: visuals,
      ripple: ripple,
    );
    _syncIndicator();

    final Size handle = widget.horizontal
        ? Size(visuals.handleWidth, widget.handleHeight)
        : Size(widget.handleHeight, visuals.handleWidth);
    final double radius = math.min(tokens.handleShape, handle.shortestSide / 2);
    final Size window = MediaQuery.maybeSizeOf(context) ?? Size.infinite;
    final bool inOverlay = Overlay.maybeOf(context) != null;

    // SLD-12, SLD-15: the focus ring around the handle, keyboard focus only.
    Widget content = Center(
      child: Opacity(
        opacity: visuals.opacity,
        child: TanreiFocusRing(
          visible: isKeyboardFocused,
          borderRadius: BorderRadius.circular(radius),
          child: SizedBox.fromSize(key: _handleKey, size: handle),
        ),
      ),
    );
    if (!inOverlay) {
      // No Overlay above the slider: the indicator is drawn in place, outside the handle's box.
      content = Stack(
        clipBehavior: Clip.none,
        fit: StackFit.expand,
        children: <Widget>[
          content,
          Positioned(left: 0, top: 0, child: _buildIndicator(context, window: window)),
        ],
      );
    }

    Widget result = Shortcuts(
      shortcuts: widget.adjustable ? _sliderKeys : const <ShortcutActivator, Intent>{},
      child: Actions(
        actions: <Type, Action<Intent>>{
          _SliderKeyIntent: CallbackAction<_SliderKeyIntent>(
            onInvoke: (_SliderKeyIntent intent) {
              // The keyboard is in use: focus shows (SLD-12).
              suppressFocusHighlight(false);
              final bool? highest = intent.highest;
              if (highest != null) {
                widget.onEdge(highest);
              } else {
                final bool swap = intent.mirrored && widget.horizontal && widget.rtl;
                widget.onStep(swap ? -intent.steps : intent.steps);
              }
              return null;
            },
          ),
        },
        child: buildPressable(
          focusNode: widget.focusNode,
          autofocus: widget.autofocus,
          child: content,
        ),
      ),
    );
    if (inOverlay) {
      result = OverlayPortal(
        controller: _overlay,
        overlayChildBuilder: (BuildContext overlayContext) =>
            _buildIndicator(context, window: window),
        child: result,
      );
    }

    // SLD-19: a slider node named by its label, with its value text and the increase and decrease
    // actions of assistive technology (SLD-4); disabled, no actions (SLD-20).
    return Semantics(
      container: true,
      slider: true,
      enabled: isEnabled,
      label: widget.label,
      value: widget.valueText,
      increasedValue: widget.increasedValue,
      decreasedValue: widget.decreasedValue,
      textDirection: Directionality.of(context),
      onIncrease: widget.adjustable ? () => widget.onStep(1) : null,
      onDecrease: widget.adjustable ? () => widget.onStep(-1) : null,
      child: result,
    );
  }
}

/// Places a value indicator beside its handle (SLD-17): [offset] beyond the handle's edge — above
/// it in a horizontal slider, at its inline start in a vertical one — centered on it and moved
/// along the axis to stay inside [window]. The position is found when painting, from where the
/// handle is then.
class _IndicatorPlacement extends SingleChildRenderObjectWidget {
  const _IndicatorPlacement({
    required this.anchor,
    required this.horizontal,
    required this.rtl,
    required this.offset,
    required this.window,
    super.child,
  });

  final ValueGetter<RenderBox?> anchor;
  final bool horizontal;
  final bool rtl;
  final double offset;
  final Size window;

  @override
  _RenderIndicatorPlacement createRenderObject(BuildContext context) =>
      _RenderIndicatorPlacement(this);

  @override
  void updateRenderObject(BuildContext context, _RenderIndicatorPlacement renderObject) {
    renderObject
      ..config = this
      ..markNeedsPaint();
  }
}

class _RenderIndicatorPlacement extends RenderShiftedBox {
  _RenderIndicatorPlacement(this.config) : super(null);

  _IndicatorPlacement config;

  @override
  void performLayout() {
    final RenderBox? child = this.child;
    child?.layout(const BoxConstraints(), parentUsesSize: true);
    size = constraints.smallest;
  }

  @override
  bool hitTest(BoxHitTestResult result, {required Offset position}) => false;

  @override
  void paint(PaintingContext context, Offset offset) {
    final RenderBox? child = this.child;
    final RenderBox? anchor = config.anchor();
    if (child == null || anchor == null || !anchor.attached || !anchor.hasSize) {
      return;
    }
    final Rect handle = anchor.localToGlobal(Offset.zero) & anchor.size;
    final Size box = child.size;
    Offset at;
    if (config.horizontal) {
      at = Offset(handle.center.dx - box.width / 2, handle.top - config.offset - box.height);
      if (config.window.width.isFinite) {
        at = Offset(at.dx.clamp(0, math.max(0, config.window.width - box.width)).toDouble(), at.dy);
      }
    } else {
      final double x = config.rtl
          ? handle.right + config.offset
          : handle.left - config.offset - box.width;
      at = Offset(x, handle.center.dy - box.height / 2);
      if (config.window.height.isFinite) {
        at = Offset(
          at.dx,
          at.dy.clamp(0, math.max(0, config.window.height - box.height)).toDouble(),
        );
      }
    }
    final Offset local = globalToLocal(at);
    // Where it is painted is where it is: transforms (and tests) see the same place.
    (child.parentData! as BoxParentData).offset = local;
    context.paintChild(child, offset + local);
  }
}
