import 'dart:math' as math;
import 'dart:ui' show SemanticsRole, lerpDouble;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/container_decoration.dart';
import '../primitives/control_icon.dart';
import '../primitives/corner_shape.dart';
import '../primitives/elevation.dart';
import '../primitives/focus_ring.dart';
import '../primitives/glyphs.dart';
import '../primitives/ignored_value.dart';
import '../primitives/item_group.dart';
import '../primitives/pressable.dart';
import '../primitives/selection_control.dart';
import '../theme/motion.dart';
import '../theme/text_style.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// Lets people choose one option, or several, from two to five related options drawn side by side
/// as the joined segments of one control.
///
/// Implements `specs/segmented-button.spec.json` in the shape of Flutter's `SegmentedButton<T>`,
/// built with the widgets library:
///
/// * [segments] are [TanreiSegment]s (the spec's item kind `segment`), in order;
/// * [selected] is the spec's `value` (while [multiSelectionEnabled] is false: zero or one value)
///   and `values` (while it is true). The segmented button keeps no selection of its own: it calls
///   [onSelectionChanged] (the spec's `change`) with the selection after the change, and draws the
///   selection it is given — the owner stores it and passes it back;
/// * [multiSelectionEnabled] is the spec's `selection` (`single` = false, `multiple` = true);
/// * [size] (an open key) and [semanticLabel] (the spec's `label`, the question the
///   options answer).
///
/// Single selection (SEG-1): activating an enabled segment that is not selected selects it and
/// calls [onSelectionChanged] once with it; the selected segment emits nothing — a single choice is
/// never cleared by its own segment. Multiple selection (SEG-2): activating a segment adds its
/// value or removes it, and calls [onSelectionChanged] once; the selection may become empty.
///
/// The set is one Tab stop (SEG-18, SEG-19): the selected segment (single), or the segment focused
/// last, else the first selected one (multiple), else the first enabled one. Right and Down Arrow
/// move focus to the next enabled segment, Left and Up Arrow to the previous one (Left and Right
/// swapped in a right-to-left layout), wrapping, and Home and End to the first and last; with
/// single selection each move also selects the segment it reaches. Disabled segments are skipped
/// and never the Tab stop (SEG-3).
///
/// Every design value comes from the `TanreiSegmentedButtonTokens` of the active design system
/// (`TanreiTheme.of(context).system.segmentedButton`). Each segment resolves its interaction state
/// and its condition (`selected` or `unselected`, the component's condition axis) and draws its
/// container, label, icon, check, elevation and opacity from that state's tokens; it never
/// computes how a state looks. The set draws its fill, its outline inside its edge and the dividers
/// between the segments, which keep their colors in every state (SEG-7, SEG-17).
///
/// Presses, keyboard focus (the ring inside the segment), the press-hold, `pressedFeedback`,
/// `focusStyle` and corner smoothing behave as `TanreiButton`'s (SEG-4…11).
class TanreiSegmentedButton<T> extends StatefulWidget {
  /// Creates a segmented button of [segments].
  const TanreiSegmentedButton({
    super.key,
    required this.segments,
    required this.selected,
    this.onSelectionChanged,
    this.multiSelectionEnabled = false,
    this.size = TanreiSegmentedButtonSize.medium,
    this.semanticLabel = '',
  });

  /// The options, in order: two to five.
  final List<TanreiSegment<T>> segments;

  /// The values of the selected segments. Zero or one value while [multiSelectionEnabled] is false.
  final Set<T> selected;

  /// Called with the selection after a change the user made. Store it and pass it back as
  /// [selected].
  final ValueChanged<Set<T>>? onSelectionChanged;

  /// False: one option at a time, as a radio group. True: each option switched on and off.
  final bool multiSelectionEnabled;

  /// Visual height (32 / 36 / 40 in the default system), matching Button's. The hit area always
  /// meets the minimum target.
  final TanreiSegmentedButtonSize size;

  /// The accessible name of the set: the question its options answer ("Range").
  final String semanticLabel;

  @override
  State<TanreiSegmentedButton<T>> createState() => _TanreiSegmentedButtonState<T>();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(IterableProperty<T>('selected', selected))
      ..add(
        FlagProperty(
          'multiSelectionEnabled',
          value: multiSelectionEnabled,
          ifTrue: 'multiple',
          ifFalse: 'single',
        ),
      )
      ..add(StringProperty('size', size.name, quoted: false))
      ..add(StringProperty('semanticLabel', semanticLabel, defaultValue: ''));
  }
}

/// One option of a [TanreiSegmentedButton] (the spec's item kind `segment`), as a `ButtonSegment`:
/// [value] identifies it, [label] is its text and its accessible name — drawn or not
/// ([labelHidden]) — and [icon] an optional glyph before the label. [enabled] false disables it: it
/// cannot be chosen or cleared, and the arrow keys skip it.
@immutable
class TanreiSegment<T> {
  /// Creates a segment.
  const TanreiSegment({
    required this.value,
    required this.label,
    this.icon,
    this.labelHidden = false,
    this.enabled = true,
  });

  /// Identifies the segment: the set's selection names it by this. Unique within the set.
  final T value;

  /// The segment's text and its accessible name. Required, even when [labelHidden] is true.
  final String label;

  /// The glyph before the label, drawn through the system's icon style (the selected family and
  /// fill while the segment is selected). Give every segment of a set an icon, or none.
  final Widget? icon;

  /// Draws the icon alone and keeps [label] as the accessible name.
  final bool labelHidden;

  /// Whether the segment can be chosen.
  final bool enabled;
}

/// What a segment needs from its set.
abstract interface class _SegmentHost {
  void choose(int index);
}

/// The set's state as each segment sees it.
class _SegmentedScope extends InheritedWidget {
  const _SegmentedScope({
    required this.host,
    required this.selected,
    required this.multiple,
    required this.count,
    required this.size,
    required super.child,
  });

  final _SegmentHost host;

  /// Which segments are selected, by index.
  final List<bool> selected;
  final bool multiple;
  final int count;
  final TanreiSegmentedButtonSize size;

  @override
  bool updateShouldNotify(_SegmentedScope oldWidget) =>
      host != oldWidget.host ||
      !listEquals(selected, oldWidget.selected) ||
      multiple != oldWidget.multiple ||
      count != oldWidget.count ||
      size != oldWidget.size;
}

class _TanreiSegmentedButtonState<T> extends State<TanreiSegmentedButton<T>>
    with TanreiItemGroupMixin<TanreiSegmentedButton<T>>
    implements _SegmentHost {
  /// What the last debug check reported, so a report is made once per change, never per build.
  String _reported = '';

  // SEG-18, SEG-19: wrapping, Right / Left (mirrored) and Down / Up; nothing is found by typing.
  @override
  bool get wrapsFocus => true;

  @override
  Axis get itemAxis => Axis.horizontal;

  @override
  bool get verticalArrowsInRow => true;

  @override
  bool get typeaheadEnabled => false;

  /// SEG-12: which segments the selection selects — for each selected value, the first segment
  /// that has it; with single selection, only the first selected value that names a segment.
  List<bool> get _selectedMask {
    final List<TanreiSegment<T>> segments = widget.segments;
    final List<bool> mask = List<bool>.filled(segments.length, false);
    for (final T value in widget.selected) {
      final int index = segments.indexWhere((TanreiSegment<T> s) => s.value == value);
      if (index >= 0) {
        mask[index] = true;
        if (!widget.multiSelectionEnabled) {
          break;
        }
      }
    }
    return mask;
  }

  @override
  void didUpdateWidget(TanreiSegmentedButton<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!setEquals(oldWidget.selected, widget.selected) ||
        oldWidget.multiSelectionEnabled != widget.multiSelectionEnabled ||
        oldWidget.segments.length != widget.segments.length) {
      scheduleTabStops();
    }
  }

  // SEG-1, SEG-2, SEG-3: one change per activation of an enabled segment; nothing for the selected
  // segment of a single choice.
  @override
  void choose(int index) {
    if (index < 0 || index >= widget.segments.length) {
      return;
    }
    final TanreiSegment<T> segment = widget.segments[index];
    if (!segment.enabled) {
      return;
    }
    final ValueChanged<Set<T>>? changed = widget.onSelectionChanged;
    if (widget.multiSelectionEnabled) {
      final Set<T> next = Set<T>.of(widget.selected);
      if (!next.remove(segment.value)) {
        next.add(segment.value);
      }
      changed?.call(next);
    } else if (!_selectedMask[index]) {
      changed?.call(<T>{segment.value});
    }
  }

  // SEG-18, SEG-19: the one Tab stop. Only enabled segments take focus (SEG-3).
  @override
  TanreiGroupItem? tabStop(List<TanreiGroupItem> items, TanreiGroupItem? lastFocused) {
    if (items.isEmpty) {
      return null;
    }
    final List<_SegmentState> segments = items.whereType<_SegmentState>().toList();
    final List<bool> mask = _selectedMask;
    bool selected(_SegmentState s) => s.index >= 0 && s.index < mask.length && mask[s.index];
    if (widget.multiSelectionEnabled) {
      return lastFocused ?? segments.where(selected).firstOrNull ?? items.first;
    }
    return segments.where(selected).firstOrNull ?? items.first;
  }

  // SEG-18: with single selection, the segment focus moves to is selected.
  @override
  void focusItem(TanreiGroupItem item) {
    super.focusItem(item);
    if (!widget.multiSelectionEnabled && item is _SegmentState) {
      choose(item.index);
    }
  }

  /// SEG-12, SEG-22: in debug builds, report a selection that names no segment, a single selection
  /// of several values, a segment whose value is empty or repeats another's, an empty set label,
  /// and a set of fewer than two or more than five segments — once for each state of the set that
  /// has them.
  void _debugCheck() {
    assert(() {
      final List<String> problems = <String>[];
      final List<TanreiSegment<T>> segments = widget.segments;
      final Set<T> seen = <T>{};
      for (final TanreiSegment<T> segment in segments) {
        final T value = segment.value;
        if (value == null || value == '') {
          problems.add(
            'A segment ("${segment.label}") has no value: nothing can select it by value.',
          );
        } else if (!seen.add(value)) {
          problems.add(
            'Two segments have the value "$value": the first is the one it selects, and change '
            'cannot tell them apart.',
          );
        }
      }
      for (final T value in widget.selected) {
        if (!segments.any((TanreiSegment<T> s) => s.value == value)) {
          problems.add('The selected value "$value" names no segment: it selects nothing.');
        }
      }
      if (!widget.multiSelectionEnabled && widget.selected.length > 1) {
        problems.add(
          'A single-choice set was given ${widget.selected.length} selected values: only the '
          'first that names a segment is selected.',
        );
      }
      if (segments.length < 2 || segments.length > 5) {
        problems.add(
          'A segmented button holds two to five segments; this one holds ${segments.length}. It '
          'is drawn as it is.',
        );
      }
      final String signature = problems.join('|');
      if (signature != _reported) {
        _reported = signature;
        for (final String problem in problems) {
          debugTanreiReportIgnoredValue('segmented-button', 'selected', problem, widget);
        }
      }
      return true;
    }());
  }

  bool _reportedMissingName = false;

  /// SEG-22: an empty set label is reported once, when first built so or when it loses its name.
  void _debugReportMissingName() {
    assert(() {
      final bool missing = !tanreiIsAccessibleName(widget.semanticLabel);
      if (missing && !_reportedMissingName) {
        debugTanreiReportMissingName('segmented button', widget);
      }
      _reportedMissingName = missing;
      return true;
    }());
  }

  @override
  Widget build(BuildContext context) {
    _debugCheck();
    _debugReportMissingName();
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiSegmentedButtonTokens tokens = theme.system.segmentedButton;
    // A total lookup: a size the system does not have resolves to medium and is reported (SEG-8).
    final TanreiSegmentedButtonSizeTokens size = tokens.sizes[widget.size];
    final List<bool> mask = _selectedMask;
    final bool multiple = widget.multiSelectionEnabled;

    final Widget set = _SegmentedSet(
      selected: mask,
      setColor: theme.paint(tokens.setColor),
      setShape: TanreiCornerShape(
        smoothing: theme.system.shape.cornerSmoothing,
        radius: tokens.setShape,
      ),
      setPadding: tokens.setPadding,
      outlineColor: theme.paint(tokens.outlineColor),
      outlineWidth: tokens.outlineWidth,
      dividerColor: theme.paint(tokens.dividerColor),
      dividerWidth: tokens.dividerWidth,
      minSetHeight: size.containerHeight,
      target: theme.system.measure.targetTouch,
      textDirection: Directionality.of(context),
      children: <Widget>[
        for (int i = 0; i < widget.segments.length; i++)
          _SegmentSlot(
            child: _Segment<T>(index: i, segment: widget.segments[i]),
          ),
      ],
    );

    // SEG-20: a radio group (single) or a group (multiple) named by the label; the segments are its
    // children.
    return Semantics(
      container: true,
      explicitChildNodes: true,
      role: multiple ? null : SemanticsRole.radioGroup,
      label: tanreiIsAccessibleName(widget.semanticLabel) ? widget.semanticLabel : null,
      child: buildItemGroup(
        child: _SegmentedScope(
          host: this,
          selected: mask,
          multiple: multiple,
          count: widget.segments.length,
          size: widget.size,
          child: set,
        ),
      ),
    );
  }
}

/// Where one segment is in its set.
class _Segment<T> extends StatefulWidget {
  const _Segment({super.key, required this.index, required this.segment});

  final int index;
  final TanreiSegment<T> segment;

  @override
  State<_Segment<T>> createState() => _SegmentStateImpl<T>();
}

/// How a segment looks in one state and condition.
@immutable
class _SegmentVisuals {
  const _SegmentVisuals({
    required this.container,
    required this.label,
    required this.icon,
    required this.elevation,
    required this.opacity,
    required this.shape,
    required this.check,
  });

  final Color container;
  final Color label;

  /// The icon and the check.
  final Color icon;
  final TanreiResolvedElevation elevation;
  final double opacity;

  /// The corners that are not the set's outer ones (`container.shape` of the state).
  final double shape;

  /// How much of the check is shown, 0–1 (SEG-16).
  final double check;

  static _SegmentVisuals lerp(_SegmentVisuals a, _SegmentVisuals b, double t) => _SegmentVisuals(
    container: tanreiLerpColor(a.container, b.container, t),
    label: tanreiLerpColor(a.label, b.label, t),
    icon: tanreiLerpColor(a.icon, b.icon, t),
    elevation: TanreiResolvedElevation.lerp(a.elevation, b.elevation, t),
    opacity: lerpDouble(a.opacity, b.opacity, t)!,
    shape: lerpDouble(a.shape, b.shape, t)!,
    check: lerpDouble(a.check, b.check, t)!,
  );
}

/// The ends of a change of condition, and of a part being shown: not design values.
const double _hidden = 0;
const double _shown = 1;

/// A segment's state as its set sees it, whatever the segment's value type.
abstract interface class _SegmentState implements TanreiGroupItem {
  int get index;
}

class _SegmentStateImpl<T> extends State<_Segment<T>>
    with
        TickerProviderStateMixin<_Segment<T>>,
        TanreiPressableStateMixin<_Segment<T>, _SegmentVisuals>,
        TanreiSelectionTransitionMixin<_Segment<T>, _SegmentVisuals>
    implements _SegmentState {
  _SegmentedScope? _scope;
  TanreiItemGroupMixin<StatefulWidget>? _group;
  final FocusNode _focusNode = FocusNode(debugLabel: 'TanreiSegment');
  bool _reportedHiddenLabel = false;

  @override
  int get index => widget.index;

  bool get _selected {
    final List<bool>? mask = _scope?.selected;
    return mask != null && index < mask.length && mask[index];
  }

  @override
  FocusNode get focusNode => _focusNode;

  @override
  String get typeaheadText => widget.segment.label;

  // SEG-3: the arrow keys skip a disabled segment, which is never the Tab stop.
  @override
  bool get takesFocus => widget.segment.enabled;

  TanreiSegmentedButtonTokens get _tokens => TanreiTheme.of(context).system.segmentedButton;

  @override
  VoidCallback? get onPressed => widget.segment.enabled ? () => _scope?.host.choose(index) : null;

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  // SEG-10: a ripple grows over the component's feedback duration.
  @override
  Duration get rippleDuration => tanreiDuration(_tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => _tokens.motionStateEasing.toCurve();

  @override
  _SegmentVisuals lerpVisuals(_SegmentVisuals a, _SegmentVisuals b, double t) =>
      _SegmentVisuals.lerp(a, b, t);

  // SEG-16: a change of condition eases over the selection motion; SEG-23: a change of state over
  // the state motion.
  @override
  Object get selectionCondition => _selected;

  @override
  Duration get selectionDuration => tanreiDuration(_tokens.motionSelectionDuration);

  @override
  Curve get selectionCurve => _tokens.motionSelectionEasing.toCurve();

  @override
  _SegmentVisuals lerpSelection(_SegmentVisuals a, _SegmentVisuals b, double t) =>
      _SegmentVisuals.lerp(a, b, t);

  @override
  void initState() {
    super.initState();
    _debugReportMissingName(null);
  }

  @override
  void didChangeDependencies() {
    // The set first: the mixins read the selection.
    _scope = context.dependOnInheritedWidgetOfExactType<_SegmentedScope>();
    final TanreiItemGroupMixin<StatefulWidget>? group = TanreiItemGroupMixin.maybeOf(context);
    if (!identical(group, _group)) {
      _group?.unregisterItem(this);
      _group = group;
      _group?.registerItem(this);
    }
    super.didChangeDependencies();
  }

  @override
  void didUpdateWidget(_Segment<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    _debugReportMissingName(oldWidget);
    if (oldWidget.segment.enabled != widget.segment.enabled) {
      _group?.scheduleTabStops();
    }
  }

  @override
  void dispose() {
    _group?.unregisterItem(this);
    _focusNode.dispose();
    super.dispose();
  }

  /// SEG-22: an empty label is reported in debug builds — when first built so, and when it loses
  /// the one it had.
  void _debugReportMissingName(_Segment<T>? oldWidget) {
    assert(() {
      if ((oldWidget == null || tanreiIsAccessibleName(oldWidget.segment.label)) &&
          !tanreiIsAccessibleName(widget.segment.label)) {
        debugTanreiReportMissingName('segment', context.widget);
      }
      return true;
    }());
  }

  /// SEG-22: a hidden label without an icon is drawn anyway, and reported once.
  void _debugReportHiddenLabel(bool ignored) {
    assert(() {
      if (ignored && !_reportedHiddenLabel) {
        debugTanreiReportIgnoredValue(
          'segmented-button',
          'labelHidden',
          'A segment without an icon cannot hide its label: nothing else would be drawn, so the '
              'label is drawn.',
          context.widget,
        );
      }
      _reportedHiddenLabel = ignored;
      return true;
    }());
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiSegmentedButtonTokens tokens = theme.system.segmentedButton;
    final TanreiSegmentedButtonSizeTokens size =
        tokens.sizes[_scope?.size ?? TanreiSegmentedButtonSize.medium];
    final bool selected = _selected;
    final bool multiple = _scope?.multiple ?? false;
    final int count = _scope?.count ?? 1;
    final TanreiSegment<T> segment = widget.segment;

    // SEG-4, SEG-7, SEG-10, SEG-12: the drawn state's tokens of the condition, the container color
    // of the state the pressed feedback names.
    final TanreiSegmentedButtonConditionTokens condition =
        tokens.conditions[selected
            ? TanreiSegmentedButtonCondition.selected
            : TanreiSegmentedButtonCondition.unselected];
    final TanreiSegmentedButtonConditionStateTokens drawn = condition.of(drawnState);
    final TanreiSegmentedButtonStateTokens? state = tokens.stateTokens(drawnState);

    // SEG-16: the check is drawn only where the label is, and where the size's check is not 0.
    final Widget? icon = segment.icon;
    final bool labelDrawn = !segment.labelHidden || icon == null;
    _debugReportHiddenLabel(segment.labelHidden && icon == null);
    final bool checks = labelDrawn && size.checkSize > 0;

    final _SegmentVisuals visuals = animateVisuals(
      animateSelection(
        _SegmentVisuals(
          container: theme.paint(condition.of(containerState).containerColor),
          label: theme.paint(drawn.labelColor),
          icon: theme.paint(drawn.iconColor),
          elevation: TanreiResolvedElevation.resolve(drawn.containerElevation, theme.colors),
          // At rest (no state tokens) nothing dims the segment and the corners are the resting
          // token.
          opacity: state?.opacity ?? _shown,
          shape: state?.containerShape ?? tokens.containerShape,
          check: selected && checks ? _shown : _hidden,
        ),
      ),
    );

    // SEG-13: the outer corners of the first and last segment are the set's less its padding, so
    // the curves stay concentric; every other corner is the state's container shape.
    final double outer = math.max(0, tokens.setShape - tokens.setPadding);
    final TanreiCornerShape shape = TanreiCornerShape.only(
      smoothing: theme.system.shape.cornerSmoothing,
      corners: TanreiCornerRadii.directional(
        start: index == 0 ? outer : visuals.shape,
        end: index == count - 1 ? outer : visuals.shape,
        textDirection: Directionality.of(context),
      ),
    );

    final Widget content = _content(
      size,
      visuals,
      icon: icon,
      labelDrawn: labelDrawn,
      checks: checks,
    );

    // SEG-5: the ring inside the segment, and inside the set's outline where the segment meets it.
    final double ringInset = math.max(0, tokens.outlineWidth - tokens.setPadding);
    final Widget body = Opacity(
      opacity: visuals.opacity,
      child: DecoratedBox(
        key: pressContainerKey,
        decoration: TanreiContainerDecoration(
          shape: shape,
          color: visuals.container.a > 0 ? visuals.container : null,
          border: visuals.elevation.ring,
          boxShadow: visuals.elevation.shadows.isEmpty ? null : visuals.elevation.shadows,
          // SEG-10: from the point of contact, or the center for a press in the added target space
          // above or below the set.
          ripple: _rippleOf(
            rippleFor(
              pressedContainer: () => theme.paint(condition.of(interactionState).containerColor),
              container: visuals.container,
            ),
          ),
        ),
        child: Padding(
          padding: EdgeInsets.all(ringInset),
          child: TanreiFocusRing(
            visible: isKeyboardFocused,
            inside: true,
            borderRadius: shape.radii.grow(-ringInset).toBorderRadius(),
            child: ConstrainedBox(
              // SEG-13, SEG-14: at least the set's height less its padding; content padded by the
              // size's paddings, growing with wrapped labels.
              constraints: BoxConstraints(
                minHeight: math.max(
                  0,
                  size.containerHeight - 2 * tokens.setPadding - 2 * ringInset,
                ),
              ),
              child: Padding(
                padding: EdgeInsetsDirectional.symmetric(
                  horizontal: math.max(0, size.containerPaddingInline - ringInset),
                  vertical: math.max(0, size.containerPaddingBlock - ringInset),
                ),
                child: Center(widthFactor: 1, heightFactor: 1, child: content),
              ),
            ),
          ),
        ),
      ),
    );

    // SEG-20: a radio (single) with its checked state, or a toggle button (multiple) with its
    // toggled state, named by its label drawn or not. (Flutter exposes no position in the set or
    // number of segments.)
    // The node itself is the segment's slot in the set (`_SegmentSlot`), whose bounds are the
    // segment's hit area (SEG-6).
    return Semantics(
      enabled: segment.enabled,
      checked: multiple ? null : selected,
      inMutuallyExclusiveGroup: multiple ? null : true,
      button: multiple ? true : null,
      toggled: multiple ? selected : null,
      label: tanreiIsAccessibleName(segment.label) ? segment.label : null,
      child: buildPressable(focusNode: _focusNode, child: body),
    );
  }

  /// The ripple, moved to the center when the press landed outside the segment's box (in the
  /// target space the set adds above and below it, SEG-6).
  TanreiRipple? _rippleOf(TanreiRipple? ripple) {
    final RenderObject? box = pressContainerKey.currentContext?.findRenderObject();
    if (ripple == null || box is! RenderBox || !box.hasSize) {
      return ripple;
    }
    return tanreiRippleInside(ripple, box.size);
  }

  /// SEG-15, SEG-16: the leading glyph, then the label, centered, in reading order (SEG-21 mirrors
  /// it). The check takes the icon's place while selected, or grows in before the label where the
  /// segment has no icon; the segment's width is measured as if it were selected (SEG-14).
  Widget _content(
    TanreiSegmentedButtonSizeTokens size,
    _SegmentVisuals visuals, {
    required Widget? icon,
    required bool labelDrawn,
    required bool checks,
  }) {
    final bool selected = _selected;
    final double check = visuals.check;
    final double gap = size.containerGap;

    Widget glyph(Widget slot, double side, {required bool selected}) =>
        TanreiControlIcon(icon: slot, size: side, selected: selected, color: visuals.icon);

    final Widget? label = labelDrawn
        ? ExcludeSemantics(
            child: Text(
              widget.segment.label,
              style: size.labelTypescale.toTextStyle(color: visuals.label),
              textAlign: TextAlign.center,
              softWrap: true,
              textWidthBasis: TextWidthBasis.longestLine,
            ),
          )
        : null;

    // The leading part now, and as it is while selected (SEG-14's measure).
    final List<Widget> leading;
    double drawnWidth;
    final double selectedWidth;
    if (icon != null && checks) {
      // SEG-16: the check in place of the icon, the one fading into the other; the slot eases from
      // the icon size to the check size.
      final double shown = check.clamp(_hidden, _shown);
      final double side = lerpDouble(size.iconSize, size.checkSize, shown)!;
      drawnWidth = side + gap;
      selectedWidth = size.checkSize + gap;
      leading = <Widget>[
        SizedBox(
          width: side,
          height: math.max(size.iconSize, size.checkSize),
          child: Stack(
            alignment: Alignment.center,
            clipBehavior: Clip.none,
            children: <Widget>[
              if (shown < _shown)
                Opacity(
                  opacity: _shown - shown,
                  child: glyph(icon, size.iconSize, selected: false),
                ),
              if (shown > _hidden)
                Opacity(
                  opacity: shown,
                  child: glyph(const Text(tanreiCheckGlyph), size.checkSize, selected: true),
                ),
            ],
          ),
        ),
        SizedBox(width: gap),
      ];
    } else if (icon != null) {
      // An icon-only segment, or a system without a check: the icon keeps its place, filled while
      // selected (SEG-15, SEG-16).
      drawnWidth = size.iconSize + (label == null ? 0 : gap);
      selectedWidth = drawnWidth;
      leading = <Widget>[
        glyph(icon, size.iconSize, selected: selected),
        if (label != null) SizedBox(width: gap),
      ];
    } else if (checks) {
      // SEG-16: the check grows in before the label, re-centring the content.
      final double shown = math.max(_hidden, check);
      drawnWidth = (size.checkSize + gap) * shown;
      selectedWidth = size.checkSize + gap;
      leading = <Widget>[
        if (shown > _hidden)
          ClipRect(
            child: Align(
              alignment: AlignmentDirectional.centerStart,
              widthFactor: shown,
              child: Opacity(
                opacity: shown.clamp(_hidden, _shown),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    glyph(const Text(tanreiCheckGlyph), size.checkSize, selected: true),
                    SizedBox(width: gap),
                  ],
                ),
              ),
            ),
          ),
      ];
    } else {
      drawnWidth = 0;
      selectedWidth = 0;
      leading = const <Widget>[];
    }
    if (drawnWidth < 0) {
      drawnWidth = 0;
    }

    return _WidthAsSelected(
      extra: selectedWidth - drawnWidth,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          ...leading,
          if (label != null) Flexible(child: label),
        ],
      ),
    );
  }
}

/// Reports its child's intrinsic widths plus [extra]: a segment measured as if it were selected
/// (SEG-14), so that the check coming and going never changes a width.
class _WidthAsSelected extends SingleChildRenderObjectWidget {
  const _WidthAsSelected({required this.extra, required Widget super.child});

  final double extra;

  @override
  RenderObject createRenderObject(BuildContext context) => _RenderWidthAsSelected(extra);

  @override
  void updateRenderObject(BuildContext context, _RenderWidthAsSelected renderObject) {
    renderObject.extra = extra;
  }
}

class _RenderWidthAsSelected extends RenderProxyBox {
  _RenderWidthAsSelected(this._extra);

  double _extra;
  set extra(double value) {
    if (value != _extra) {
      _extra = value;
      markNeedsLayout();
    }
  }

  @override
  double computeMinIntrinsicWidth(double height) => super.computeMinIntrinsicWidth(height) + _extra;

  @override
  double computeMaxIntrinsicWidth(double height) => super.computeMaxIntrinsicWidth(height) + _extra;
}

extension on TanreiCornerRadii {
  BorderRadius toBorderRadius() => BorderRadius.only(
    topLeft: Radius.circular(topLeft),
    topRight: Radius.circular(topRight),
    bottomRight: Radius.circular(bottomRight),
    bottomLeft: Radius.circular(bottomLeft),
  );
}

/// One segment's place in the set: its accessibility node, whose bounds the set extends above and
/// below the segment to its hit area (SEG-6), so that assistive technology and the tap-target
/// checks see the target the segment answers.
class _SegmentSlot extends SingleChildRenderObjectWidget {
  const _SegmentSlot({required Widget super.child});

  @override
  RenderObject createRenderObject(BuildContext context) => _RenderSegmentSlot();
}

class _RenderSegmentSlot extends RenderProxyBox {
  /// How far the hit area reaches beyond the segment: above it and below it.
  double _above = 0;
  double _below = 0;

  void extend({required double above, required double below}) {
    if (above != _above || below != _below) {
      _above = above;
      _below = below;
      markNeedsSemanticsUpdate();
    }
  }

  @override
  Rect get semanticBounds => Rect.fromLTRB(0, -_above, size.width, size.height + _below);

  @override
  void describeSemanticsConfiguration(SemanticsConfiguration config) {
    super.describeSemanticsConfiguration(config);
    config.isSemanticBoundary = true;
  }
}

/// The set (SEG-6, SEG-13, SEG-14, SEG-17, SEG-24): lays the segments out in one row of equal
/// widths, draws the set's fill, the dividers and the outline around them, raises the selected
/// segments above their neighbours, and extends each segment's hit area above and below the set to
/// the touch target.
class _SegmentedSet extends MultiChildRenderObjectWidget {
  const _SegmentedSet({
    required this.selected,
    required this.setColor,
    required this.setShape,
    required this.setPadding,
    required this.outlineColor,
    required this.outlineWidth,
    required this.dividerColor,
    required this.dividerWidth,
    required this.minSetHeight,
    required this.target,
    required this.textDirection,
    required super.children,
  });

  final List<bool> selected;
  final Color setColor;
  final TanreiCornerShape setShape;
  final double setPadding;
  final Color outlineColor;
  final double outlineWidth;
  final Color dividerColor;
  final double dividerWidth;
  final double minSetHeight;
  final double target;
  final TextDirection textDirection;

  @override
  RenderTanreiSegmentedSet createRenderObject(BuildContext context) => RenderTanreiSegmentedSet._(
    selected: selected,
    setColor: setColor,
    setShape: setShape,
    setPadding: setPadding,
    outlineColor: outlineColor,
    outlineWidth: outlineWidth,
    dividerColor: dividerColor,
    dividerWidth: dividerWidth,
    minSetHeight: minSetHeight,
    target: target,
    textDirection: textDirection,
  );

  @override
  void updateRenderObject(BuildContext context, RenderTanreiSegmentedSet renderObject) {
    renderObject
      ..selected = selected
      ..setColor = setColor
      ..setShape = setShape
      ..setPadding = setPadding
      ..outlineColor = outlineColor
      ..outlineWidth = outlineWidth
      ..dividerColor = dividerColor
      ..dividerWidth = dividerWidth
      ..minSetHeight = minSetHeight
      ..target = target
      ..textDirection = textDirection;
  }
}

class _SetParentData extends ContainerBoxParentData<RenderBox> {}

/// The render object of a [TanreiSegmentedButton]'s set, as tests see it.
class RenderTanreiSegmentedSet extends RenderBox
    with
        ContainerRenderObjectMixin<RenderBox, _SetParentData>,
        RenderBoxContainerDefaultsMixin<RenderBox, _SetParentData> {
  RenderTanreiSegmentedSet._({
    required List<bool> selected,
    required Color setColor,
    required TanreiCornerShape setShape,
    required double setPadding,
    required Color outlineColor,
    required double outlineWidth,
    required Color dividerColor,
    required double dividerWidth,
    required double minSetHeight,
    required double target,
    required TextDirection textDirection,
  }) : _selected = selected,
       _setColor = setColor,
       _setShape = setShape,
       _setPadding = setPadding,
       _outlineColor = outlineColor,
       _outlineWidth = outlineWidth,
       _dividerColor = dividerColor,
       _dividerWidth = dividerWidth,
       _minSetHeight = minSetHeight,
       _target = target,
       _textDirection = textDirection;

  List<bool> _selected;
  set selected(List<bool> value) {
    if (!listEquals(value, _selected)) {
      _selected = value;
      markNeedsPaint();
    }
  }

  Color _setColor;
  set setColor(Color value) => _repaint(value != _setColor, () => _setColor = value);

  TanreiCornerShape _setShape;
  set setShape(TanreiCornerShape value) => _repaint(value != _setShape, () => _setShape = value);

  double _setPadding;
  set setPadding(double value) => _relayout(value != _setPadding, () => _setPadding = value);

  Color _outlineColor;
  set outlineColor(Color value) => _repaint(value != _outlineColor, () => _outlineColor = value);

  double _outlineWidth;
  set outlineWidth(double value) => _repaint(value != _outlineWidth, () => _outlineWidth = value);

  Color _dividerColor;
  set dividerColor(Color value) => _repaint(value != _dividerColor, () => _dividerColor = value);

  double _dividerWidth;
  set dividerWidth(double value) => _relayout(value != _dividerWidth, () => _dividerWidth = value);

  double _minSetHeight;
  set minSetHeight(double value) => _relayout(value != _minSetHeight, () => _minSetHeight = value);

  double _target;
  set target(double value) => _relayout(value != _target, () => _target = value);

  TextDirection _textDirection;
  set textDirection(TextDirection value) =>
      _relayout(value != _textDirection, () => _textDirection = value);

  void _repaint(bool changed, VoidCallback apply) {
    if (changed) {
      apply();
      markNeedsPaint();
    }
  }

  void _relayout(bool changed, VoidCallback apply) {
    if (changed) {
      apply();
      markNeedsLayout();
    }
  }

  /// The set itself (its fill, outline and corners), in this box's coordinates.
  Rect get setRect => _setRect;
  Rect _setRect = Rect.zero;

  /// The dividers between the segments, in this box's coordinates, in reading order.
  List<Rect> get dividerRects => List<Rect>.unmodifiable(_dividers);
  final List<Rect> _dividers = <Rect>[];

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _SetParentData) {
      child.parentData = _SetParentData();
    }
  }

  /// SEG-14: the natural width of a segment — the widest one's content and padding, at least the
  /// touch target (SEG-6).
  double _naturalSegmentWidth() {
    double widest = _target;
    for (RenderBox? child = firstChild; child != null; child = childAfter(child)) {
      widest = math.max(widest, child.getMaxIntrinsicWidth(double.infinity));
    }
    return widest;
  }

  int get _count => childCount;

  double _setWidthFor(double segment) =>
      _count * segment + math.max(0, _count - 1) * _dividerWidth + 2 * _setPadding;

  /// SEG-14: the width each segment gets under [constraints]: the natural width, or the room
  /// divided equally where the layout gives the set more or less.
  double _segmentWidthFor(BoxConstraints constraints) {
    if (_count == 0) {
      return 0;
    }
    final double natural = _naturalSegmentWidth();
    final double fixed = math.max(0, _count - 1) * _dividerWidth + 2 * _setPadding;
    final double wanted = _setWidthFor(natural);
    final double width = constraints.constrainWidth(wanted);
    return width == wanted ? natural : math.max(0, (width - fixed) / _count);
  }

  @override
  double computeMinIntrinsicWidth(double height) => _setWidthFor(_naturalSegmentWidth());

  @override
  double computeMaxIntrinsicWidth(double height) => _setWidthFor(_naturalSegmentWidth());

  @override
  double computeMinIntrinsicHeight(double width) => _heightFor(width, dry: true);

  @override
  double computeMaxIntrinsicHeight(double width) => _heightFor(width, dry: true);

  double _heightFor(double width, {required bool dry}) {
    if (_count == 0) {
      return math.max(_minSetHeight, _target);
    }
    final double segment = width.isFinite
        ? math.max(0, (width - math.max(0, _count - 1) * _dividerWidth - 2 * _setPadding) / _count)
        : _naturalSegmentWidth();
    double tallest = math.max(0, _minSetHeight - 2 * _setPadding);
    for (RenderBox? child = firstChild; child != null; child = childAfter(child)) {
      tallest = math.max(tallest, child.getMinIntrinsicHeight(segment));
    }
    return math.max(tallest + 2 * _setPadding, _target);
  }

  @override
  Size computeDryLayout(BoxConstraints constraints) {
    final double segment = _segmentWidthFor(constraints);
    double tallest = math.max(0, _minSetHeight - 2 * _setPadding);
    for (RenderBox? child = firstChild; child != null; child = childAfter(child)) {
      tallest = math.max(
        tallest,
        child.getDryLayout(BoxConstraints.tightFor(width: segment)).height,
      );
    }
    return constraints.constrain(
      Size(_setWidthFor(segment), math.max(tallest + 2 * _setPadding, _target)),
    );
  }

  @override
  void performLayout() {
    final BoxConstraints constraints = this.constraints;
    final double segment = _segmentWidthFor(constraints);
    // SEG-14: every segment as tall as the tallest, at least the set's height less its padding.
    double tallest = math.max(0, _minSetHeight - 2 * _setPadding);
    for (RenderBox? child = firstChild; child != null; child = childAfter(child)) {
      child.layout(BoxConstraints.tightFor(width: segment), parentUsesSize: true);
      tallest = math.max(tallest, child.size.height);
    }
    for (RenderBox? child = firstChild; child != null; child = childAfter(child)) {
      if (child.size.height != tallest) {
        child.layout(BoxConstraints.tight(Size(segment, tallest)), parentUsesSize: true);
      }
    }
    final double setWidth = _setWidthFor(segment);
    final double setHeight = tallest + 2 * _setPadding;
    // SEG-6: the box is at least the touch target tall; the set is centered in it.
    size = constraints.constrain(Size(setWidth, math.max(setHeight, _target)));
    final double top = (size.height - setHeight) / 2;
    _setRect = Rect.fromLTWH(0, top, setWidth, setHeight);
    _dividers.clear();
    final bool rtl = _textDirection == TextDirection.rtl;
    int i = 0;
    for (RenderBox? child = firstChild; child != null; child = childAfter(child), i++) {
      // SEG-21: from the right in a right-to-left layout.
      final int slot = rtl ? _count - 1 - i : i;
      final double left = _setPadding + slot * (segment + _dividerWidth);
      (child.parentData! as _SetParentData).offset = Offset(left, top + _setPadding);
      if (child is _RenderSegmentSlot) {
        child.extend(above: top + _setPadding, below: top + _setPadding);
      }
      if (i > 0) {
        final double dividerLeft = rtl ? left + segment : left - _dividerWidth;
        _dividers.add(Rect.fromLTWH(dividerLeft, top + _setPadding, _dividerWidth, tallest));
      }
    }
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    final Canvas canvas = context.canvas;
    final Rect set = _setRect.shift(offset);
    // SEG-13: the set's fill.
    if (_setColor.a > 0) {
      _setShape.paint(canvas, set, Paint()..color = _setColor);
    }
    // SEG-24: the unselected segments, then the selected ones, whose elevation lies above their
    // neighbours.
    for (final bool raised in <bool>[false, true]) {
      int i = 0;
      for (RenderBox? child = firstChild; child != null; child = childAfter(child), i++) {
        final bool selected = i < _selected.length && _selected[i];
        if (selected == raised) {
          context.paintChild(child, (child.parentData! as _SetParentData).offset + offset);
        }
      }
    }
    // SEG-17: the dividers, in their own color and at full opacity whatever the segments' states.
    final Canvas top = context.canvas;
    if (_dividerColor.a > 0 && _dividerWidth > 0) {
      final Paint divider = Paint()..color = _dividerColor;
      for (final Rect rect in _dividers) {
        top.drawRect(rect.shift(offset), divider);
      }
    }
    // SEG-13: the outline, inside the set's edge, over the segments.
    if (_outlineColor.a > 0 && _outlineWidth > 0) {
      _setShape.paintBand(
        top,
        set,
        Paint()..color = _outlineColor,
        inner: -_outlineWidth,
        outer: 0,
      );
    }
  }

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) {
    if (defaultHitTestChildren(result, position: position)) {
      return true;
    }
    // SEG-6: a press above or below the set, in its padding or on a divider goes to the segment
    // in that column: to the nearest point inside it.
    RenderBox? nearest;
    double distance = double.infinity;
    for (RenderBox? child = firstChild; child != null; child = childAfter(child)) {
      final Offset origin = (child.parentData! as _SetParentData).offset;
      final Rect rect = origin & child.size;
      final double d = position.dx < rect.left
          ? rect.left - position.dx
          : (position.dx > rect.right ? position.dx - rect.right : 0);
      if (d < distance) {
        distance = d;
        nearest = child;
      }
    }
    if (nearest == null || !size.contains(position)) {
      return false;
    }
    final RenderBox child = nearest;
    final Offset origin = (child.parentData! as _SetParentData).offset;
    // Half a pixel inside the edge: a box does not contain its right and bottom edges.
    const double inset = 0.5;
    final Offset inside = Offset(
      (position.dx - origin.dx).clamp(inset, math.max(inset, child.size.width - inset)).toDouble(),
      (position.dy - origin.dy).clamp(inset, math.max(inset, child.size.height - inset)).toDouble(),
    );
    return result.addWithRawTransform(
      transform: MatrixUtils.forceToPoint(inside),
      position: inside,
      hitTest: (BoxHitTestResult result, Offset position) =>
          child.hitTest(result, position: inside),
    );
  }
}
