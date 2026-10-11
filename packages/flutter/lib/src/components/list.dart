import 'dart:ui' show SemanticsRole, lerpDouble;

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/check_mark.dart';
import '../primitives/container_decoration.dart';
import '../primitives/control_icon.dart';
import '../primitives/corner_shape.dart';
import '../primitives/enum_by_name.dart';
import '../primitives/focus_ring.dart';
import '../primitives/ignored_value.dart';
import '../primitives/item_group.dart';
import '../primitives/item_row.dart';
import '../primitives/pressable.dart';
import '../primitives/selection_control.dart';
import '../theme/motion.dart';
import '../theme/text_style.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// Whether people choose items in a [TanreiList] (the spec's `selection`).
enum TanreiListSelectionMode {
  /// A list that shows or opens things: static and interactive items.
  none,

  /// A listbox that chooses one option.
  single,

  /// A listbox that chooses any number of options.
  multiple;

  /// The mode named [name], or [none] — reported in debug builds — for a name the list does not
  /// define (LST-7).
  static TanreiListSelectionMode fromName(String name) => tanreiEnumByName(
    values,
    name,
    fallback: TanreiListSelectionMode.none,
    kind: 'list selection',
  );
}

/// How a [TanreiListTile] frames its [TanreiListTile.leading] slot (the spec's `leadingMedia`).
enum TanreiListLeadingMedia {
  /// No leading media: the leading icon, if any.
  none,

  /// A round box of `comp.list.avatar.size`.
  avatar,

  /// A rounded square of `comp.list.image.size`.
  image;

  /// The value named [name], or [none] — reported in debug builds — for a name the list does not
  /// define (LST-7).
  static TanreiListLeadingMedia fromName(String name) => tanreiEnumByName(
    values,
    name,
    fallback: TanreiListLeadingMedia.none,
    kind: 'list leading media',
  );
}

/// Shows a column of related items — a line or more of text with an icon, an avatar or an image —
/// that people read, open one by one, or choose from.
///
/// Implements `specs/list.spec.json` with the idiom of Flutter's `SegmentedButton` for the
/// selection and `ListTile` for the items:
///
/// * [children] are [TanreiListTile]s (the spec's item kind `list-item`);
/// * [selectionMode] is the spec's `selection`: [TanreiListSelectionMode.none] makes a list of
///   static and interactive tiles, `single` and `multiple` a listbox of options;
/// * [selected] is both the spec's `value` and `values`: one `Set<T>` holds the values of the
///   selected options, with at most one member while [selectionMode] is `single` (a second one is
///   ignored and reported in debug builds);
/// * [onSelectionChanged] is the spec's `change`: the list keeps no selection of its own — it calls
///   this with the new set and the owner stores it (LST-13, LST-14);
/// * [semanticLabel] is the spec's `label`: what the items are. A selectable list without one is
///   reported in debug builds (LST-23).
///
/// The list draws nothing of its own, adds no space around its items and does not scroll: put it
/// on a surface, in a card, or in the product's scroll view.
///
/// A list that holds interactive tiles or options is one Tab stop — the tile focused last, else
/// the first selected option, else the first enabled tile — and moves focus with Down and Up Arrow
/// (without wrapping), Home and End, and typeahead on the headlines; disabled tiles are reached but
/// never activate. Moving focus never changes the selection; Space or Enter activates (LST-15).
class TanreiList<T> extends StatefulWidget {
  /// Creates a list of [children].
  const TanreiList({
    super.key,
    this.selectionMode = TanreiListSelectionMode.none,
    this.selected = const <Never>{},
    this.onSelectionChanged,
    this.semanticLabel = '',
    required this.children,
  });

  /// Whether people choose items, and how many.
  final TanreiListSelectionMode selectionMode;

  /// The values of the selected options.
  final Set<T> selected;

  /// Called with the new selection when the user chooses an option.
  final ValueChanged<Set<T>>? onSelectionChanged;

  /// The accessible name of the list. Required for a selectable list.
  final String semanticLabel;

  /// The items: [TanreiListTile]s.
  final List<Widget> children;

  /// Whether the list is a listbox.
  bool get isSelectable => selectionMode != TanreiListSelectionMode.none;

  @override
  State<TanreiList<T>> createState() => _TanreiListState<T>();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(EnumProperty<TanreiListSelectionMode>('selectionMode', selectionMode))
      ..add(IterableProperty<T>('selected', selected))
      ..add(StringProperty('semanticLabel', semanticLabel));
  }
}

/// What a tile needs from its list.
abstract interface class _ListHost {
  TanreiListSelectionMode get selectionMode;
  bool isSelected(Object? value);
  void choose(Object? value);
}

class _TanreiListState<T> extends State<TanreiList<T>>
    with TanreiItemGroupMixin<TanreiList<T>>
    implements _ListHost {
  /// What the last debug check reported, so a report is made once per change, never per build.
  String _reported = '';

  @override
  bool get wrapsFocus => false;

  @override
  TanreiListSelectionMode get selectionMode => widget.selectionMode;

  /// The selection that counts: at most one value while single.
  Set<T> get _effective => switch (widget.selectionMode) {
    TanreiListSelectionMode.none => <T>{},
    TanreiListSelectionMode.single => widget.selected.take(1).toSet(),
    TanreiListSelectionMode.multiple => widget.selected,
  };

  @override
  bool isSelected(Object? value) => _effective.contains(value);

  // LST-13, LST-14: single selects an unselected option (the selected one changes nothing);
  // multiple switches the option in or out.
  @override
  void choose(Object? value) {
    final Set<T> current = _effective;
    switch (widget.selectionMode) {
      case TanreiListSelectionMode.none:
        return;
      case TanreiListSelectionMode.single:
        if (!current.contains(value)) {
          widget.onSelectionChanged?.call(<T>{value as T});
        }
      case TanreiListSelectionMode.multiple:
        widget.onSelectionChanged?.call(
          current.contains(value)
              ? (Set<T>.of(current)..remove(value))
              : (Set<T>.of(current)..add(value as T)),
        );
    }
  }

  // LST-15: the tile focused last, else the first selected option, else the first enabled tile.
  @override
  TanreiGroupItem? tabStop(List<TanreiGroupItem> items, TanreiGroupItem? lastFocused) {
    if (items.isEmpty) {
      return null;
    }
    final Iterable<_TanreiListTileState<Object?>> tiles = items
        .whereType<_TanreiListTileState<Object?>>();
    return lastFocused ??
        tiles.where((_TanreiListTileState<Object?> t) => t._selected).firstOrNull ??
        tiles.where((_TanreiListTileState<Object?> t) => t.isEnabled).firstOrNull ??
        items.first;
  }

  @override
  void didUpdateWidget(TanreiList<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!setEquals(oldWidget.selected, widget.selected) ||
        oldWidget.selectionMode != widget.selectionMode) {
      scheduleTabStops();
    }
  }

  /// LST-23, LST-26: in debug builds, report a selectable list without a name, a selection that
  /// names no option (or a second value while single), and an option whose value is missing or
  /// repeated — once for each state of the list that has them.
  void _debugCheck() {
    assert(() {
      final List<String> problems = <String>[];
      if (widget.isSelectable) {
        final List<Object?> values = <Object?>[
          for (final Widget child in widget.children)
            if (child is TanreiListTile) child.value,
        ];
        final Set<Object?> seen = <Object?>{};
        for (final Object? value in values) {
          if (value == null || value == '') {
            problems.add('An option has no value: nothing can select it.');
          } else if (!seen.add(value)) {
            problems.add('Two options have the value "$value": they are selected together.');
          }
        }
        for (final T value in _effective) {
          if (!values.contains(value)) {
            problems.add(
              'The selection names "$value", which no option has: nothing is selected '
              'for it.',
            );
          }
        }
        if (widget.selectionMode == TanreiListSelectionMode.single && widget.selected.length > 1) {
          problems.add(
            'A single-select list was given ${widget.selected.length} values: only the '
            'first, "${widget.selected.first}", is selected.',
          );
        }
      }
      final String signature =
          '${widget.isSelectable && !tanreiIsAccessibleName(widget.semanticLabel)}|'
          '${problems.join('|')}';
      if (signature != _reported) {
        final bool wasNamed = !_reported.startsWith('true');
        _reported = signature;
        if (wasNamed && signature.startsWith('true')) {
          debugTanreiReportMissingName('list', widget);
        }
        for (final String problem in problems) {
          debugTanreiReportIgnoredValue('list', 'selected', problem, widget);
        }
      }
      return true;
    }());
  }

  @override
  Widget build(BuildContext context) {
    _debugCheck();
    // LST-12: the list role (Flutter has no listbox role: a selectable list is a list of options,
    // each with its selected state), named by the label.
    return Semantics(
      container: true,
      explicitChildNodes: true,
      role: SemanticsRole.list,
      label: tanreiIsAccessibleName(widget.semanticLabel) ? widget.semanticLabel : null,
      child: buildItemGroup(
        child: _TanreiListScope(
          host: this,
          selectionMode: widget.selectionMode,
          selected: _effective,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: widget.children,
          ),
        ),
      ),
    );
  }
}

class _TanreiListScope extends InheritedWidget {
  const _TanreiListScope({
    required this.host,
    required this.selectionMode,
    required this.selected,
    required super.child,
  });

  final _ListHost host;
  final TanreiListSelectionMode selectionMode;
  final Set<Object?> selected;

  @override
  bool updateShouldNotify(_TanreiListScope oldWidget) =>
      host != oldWidget.host ||
      selectionMode != oldWidget.selectionMode ||
      !setEquals(selected, oldWidget.selected);
}

/// One row of a [TanreiList]: a headline with optional overline, supporting text, leading icon or
/// media, and trailing text, icon or control (the spec's item kind `list-item`).
///
/// Named with `ListTile`'s names: [title] is the spec's `headline`, [subtitle] its
/// `supportingText` and [subtitleMaxLines] its `supportingMaxLines` (0 shows all of it; the full
/// text still reaches assistive technology). A tile is one of three kinds of row, chosen by its
/// list and its props (LST-11, LST-12):
///
/// * **static** — the list's `selectionMode` is none and [onTap] is null: it shows content, takes
///   no focus, draws no state answer and ignores [enabled]; a control in [trailing] keeps its own
///   tokens, semantics and focus stop;
/// * **interactive** — a non-null [onTap] (the spec's `interactive`, and its `click`): the row is
///   one button inside its list item;
/// * **option** — in a selectable list, every tile: [value] identifies it (the list's `selected`
///   holds the values of the selected ones), activating it selects it, and [onTap] is ignored.
///
/// [enabled] false is the spec's `disabled` (as `ListTile`): the row is drawn from the disabled
/// tokens and dims as a whole, its media included; it stays reachable with the arrow keys but never
/// activates (LST-2, LST-6).
///
/// [leadingIcon] and [trailingIcon] are icon slots drawn through `TanreiControlIcon` at
/// `comp.list.leading-icon.size` and `trailing-icon.size`, with the family and fill of the tile's
/// condition (LST-19). [leadingMedia] frames [leading] — the product's avatar or image content —
/// in a round or rounded-square box and replaces [leadingIcon] (LST-20); [leading] is drawn only
/// then. [trailing] is the product's control at the end of a static tile.
///
/// The content of an interactive tile or an option is presentational: its name is [title], its
/// description [overline], [subtitle] and [trailingText] in reading order (LST-23). **Put no
/// interactive element in the slots of an interactive tile or an option** (LST-24): Flutter cannot
/// tell whether a subtree is interactive, so the tile does not check.
class TanreiListTile<T> extends StatefulWidget {
  /// Creates a tile of the enclosing [TanreiList].
  const TanreiListTile({
    super.key,
    this.value,
    required this.title,
    this.overline = '',
    this.subtitle = '',
    this.subtitleMaxLines = 0,
    this.trailingText = '',
    this.leadingIcon,
    this.trailingIcon,
    this.leadingMedia = TanreiListLeadingMedia.none,
    this.leading,
    this.trailing,
    this.onTap,
    this.enabled = true,
    this.divider = false,
    this.focusNode,
  });

  /// Identifies the option in a selectable list. Unique within the list; unused otherwise.
  final T? value;

  /// The headline: the tile's main text and its accessible name. An empty one still renders and
  /// is reported in debug builds.
  final String title;

  /// A short line above the headline.
  final String overline;

  /// The supporting text below the headline.
  final String subtitle;

  /// The lines of [subtitle] shown before it ends with an ellipsis; 0 shows all of it.
  final int subtitleMaxLines;

  /// A short value at the end of the row.
  final String trailingText;

  /// The icon at the start of the row. Not drawn while [leadingMedia] is avatar or image.
  final Widget? leadingIcon;

  /// The icon at the end of the row.
  final Widget? trailingIcon;

  /// How [leading] is framed.
  final TanreiListLeadingMedia leadingMedia;

  /// The avatar's or image's content, drawn while [leadingMedia] is avatar or image.
  final Widget? leading;

  /// A control of the product's own at the end of a static tile.
  final Widget? trailing;

  /// Non-null makes the tile interactive: called exactly once per activation. Ignored in a
  /// selectable list.
  final VoidCallback? onTap;

  /// Whether an interactive tile or an option reacts to input. Ignored for a static tile.
  final bool enabled;

  /// Draws a hairline along the bottom of the tile.
  final bool divider;

  /// An optional focus node to use instead of an internal one. The list sets its `skipTraversal`
  /// (one Tab stop).
  final FocusNode? focusNode;

  @override
  State<TanreiListTile<T>> createState() => _TanreiListTileState<T>();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DiagnosticsProperty<T>('value', value, defaultValue: null))
      ..add(StringProperty('title', title))
      ..add(StringProperty('overline', overline, defaultValue: ''))
      ..add(StringProperty('subtitle', subtitle, defaultValue: ''))
      ..add(IntProperty('subtitleMaxLines', subtitleMaxLines, defaultValue: 0))
      ..add(StringProperty('trailingText', trailingText, defaultValue: ''))
      ..add(EnumProperty<TanreiListLeadingMedia>('leadingMedia', leadingMedia))
      ..add(FlagProperty('interactive', value: onTap != null, ifTrue: 'interactive'))
      ..add(FlagProperty('enabled', value: enabled, ifFalse: 'disabled', defaultValue: true))
      ..add(FlagProperty('divider', value: divider, ifTrue: 'divider'));
  }
}

/// How a tile looks in one condition and state: its tokens, evaluated in the current scheme.
@immutable
class _ListVisuals {
  const _ListVisuals({
    required this.container,
    required this.headline,
    required this.overline,
    required this.supporting,
    required this.trailingText,
    required this.leadingIcon,
    required this.trailingIcon,
    required this.mark,
    required this.opacity,
    required this.shape,
    required this.check,
  });

  final Color container;
  final Color headline;
  final Color overline;
  final Color supporting;
  final Color trailingText;
  final Color leadingIcon;
  final Color trailingIcon;
  final Color mark;
  final double opacity;
  final double shape;

  /// How much of the check is drawn, 0–1.
  final double check;

  static _ListVisuals lerp(_ListVisuals a, _ListVisuals b, double t) => _ListVisuals(
    container: tanreiLerpColor(a.container, b.container, t),
    headline: tanreiLerpColor(a.headline, b.headline, t),
    overline: tanreiLerpColor(a.overline, b.overline, t),
    supporting: tanreiLerpColor(a.supporting, b.supporting, t),
    trailingText: tanreiLerpColor(a.trailingText, b.trailingText, t),
    leadingIcon: tanreiLerpColor(a.leadingIcon, b.leadingIcon, t),
    trailingIcon: tanreiLerpColor(a.trailingIcon, b.trailingIcon, t),
    mark: tanreiLerpColor(a.mark, b.mark, t),
    opacity: lerpDouble(a.opacity, b.opacity, t)!,
    shape: lerpDouble(a.shape, b.shape, t)!,
    check: lerpDouble(a.check, b.check, t)!,
  );
}

/// A resting row is not dimmed.
const double _opaque = 1;

class _TanreiListTileState<T> extends State<TanreiListTile<T>>
    with
        TickerProviderStateMixin<TanreiListTile<T>>,
        TanreiPressableStateMixin<TanreiListTile<T>, _ListVisuals>,
        TanreiSelectionTransitionMixin<TanreiListTile<T>, _ListVisuals>
    implements TanreiGroupItem {
  _TanreiListScope? _scope;
  TanreiItemGroupMixin<StatefulWidget>? _group;
  FocusNode? _internalFocusNode;

  @override
  FocusNode get focusNode => widget.focusNode ?? (_internalFocusNode ??= FocusNode());

  @override
  String get typeaheadText => widget.title;

  TanreiListSelectionMode get _mode => _scope?.selectionMode ?? TanreiListSelectionMode.none;

  bool get _isOption => _mode != TanreiListSelectionMode.none;

  /// A static tile: not an action, not an option (LST-11).
  bool get _isStatic => !_isOption && widget.onTap == null;

  bool get _selected => _isOption && (_scope?.host.isSelected(widget.value) ?? false);

  @override
  bool get takesFocus => !_isStatic;

  TanreiListTokens get _tokens => TanreiTheme.of(context).system.list;

  @override
  VoidCallback? get onPressed {
    if (!widget.enabled || _isStatic) {
      return null;
    }
    // LST-12: in a selectable list every tile is an option, and onTap is ignored.
    return _isOption ? _choose : widget.onTap;
  }

  void _choose() => _scope?.host.choose(widget.value);

  // LST-2: a disabled tile stays reachable by the arrow keys.
  @override
  bool get focusableWhileDisabled => !_isStatic;

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  // LST-9: a ripple grows over the component's feedback duration.
  @override
  Duration get rippleDuration => tanreiDuration(_tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => _tokens.motionStateEasing.toCurve();

  @override
  _ListVisuals lerpVisuals(_ListVisuals a, _ListVisuals b, double t) => _ListVisuals.lerp(a, b, t);

  // LST-21: a change of selection eases over the state motion (the list has no selection motion).
  @override
  Object get selectionCondition => _selected;

  @override
  Duration get selectionDuration => tanreiDuration(_tokens.motionStateDuration);

  @override
  Curve get selectionCurve => _tokens.motionStateEasing.toCurve();

  @override
  _ListVisuals lerpSelection(_ListVisuals a, _ListVisuals b, double t) =>
      _ListVisuals.lerp(a, b, t);

  @override
  void initState() {
    super.initState();
    _debugReportMissingName(null);
  }

  @override
  void didChangeDependencies() {
    // The list first: the mixins read the selection and whether the tile is enabled.
    _scope = context.dependOnInheritedWidgetOfExactType<_TanreiListScope>();
    assert(_scope != null, 'A TanreiListTile needs a TanreiList ancestor: the list holds it.');
    final TanreiItemGroupMixin<StatefulWidget>? group = TanreiItemGroupMixin.maybeOf(context);
    if (!identical(group, _group)) {
      _group?.unregisterItem(this);
      _group = group;
      _group?.registerItem(this);
    }
    super.didChangeDependencies();
  }

  @override
  void didUpdateWidget(TanreiListTile<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    _debugReportMissingName(oldWidget);
    if (oldWidget.focusNode != widget.focusNode) {
      _group?.unregisterItem(this);
      _group?.registerItem(this);
    } else if (oldWidget.enabled != widget.enabled ||
        (oldWidget.onTap == null) != (widget.onTap == null)) {
      _group?.scheduleTabStops();
    }
  }

  @override
  void dispose() {
    _group?.unregisterItem(this);
    _internalFocusNode?.dispose();
    super.dispose();
  }

  /// LST-23: an empty headline is reported in debug builds — when the tile is first built without
  /// one, and when it loses the one it had.
  void _debugReportMissingName(TanreiListTile<T>? oldWidget) {
    assert(() {
      final bool had = oldWidget == null || tanreiIsAccessibleName(oldWidget.title);
      if (had && !tanreiIsAccessibleName(widget.title)) {
        debugTanreiReportMissingName('list item', widget);
      }
      return true;
    }());
  }

  _ListVisuals _resolve(
    TanreiThemeData theme,
    TanreiListConditionStateTokens drawn, {
    required TanreiPaint container,
    required double opacity,
    required double shape,
    required bool selected,
  }) => _ListVisuals(
    container: theme.paint(container),
    headline: theme.paint(drawn.headlineColor),
    overline: theme.paint(drawn.overlineColor),
    supporting: theme.paint(drawn.supportingTextColor),
    trailingText: theme.paint(drawn.trailingTextColor),
    leadingIcon: theme.paint(drawn.leadingIconColor),
    trailingIcon: theme.paint(drawn.trailingIconColor),
    mark: theme.paint(drawn.markColor),
    opacity: opacity,
    shape: shape,
    check: selected ? 1 : 0,
  );

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiListTokens tokens = theme.system.list;
    final bool selected = _selected;
    final TanreiListConditionTokens condition =
        tokens.conditions[selected ? TanreiListCondition.selected : TanreiListCondition.unselected];

    final _ListVisuals visuals;
    if (_isStatic) {
      // LST-11: the resting tokens of the unselected condition, whatever enabled says.
      visuals = _resolve(
        theme,
        condition.enabled,
        container: condition.enabled.containerColor,
        opacity: _opaque,
        shape: tokens.containerShape,
        selected: false,
      );
    } else {
      // LST-3, LST-6, LST-9: the drawn state's tokens of the condition, the container of the state
      // the pressed feedback names; LST-21, LST-25: condition and state changes ease.
      final TanreiListStateTokens? state = tokens.stateTokens(drawnState);
      visuals = animateVisuals(
        animateSelection(
          _resolve(
            theme,
            condition.of(drawnState),
            container: condition.of(containerState).containerColor,
            opacity: state?.opacity ?? _opaque,
            shape: state?.containerShape ?? tokens.containerShape,
            selected: selected,
          ),
        ),
      );
    }
    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: theme.system.shape.cornerSmoothing,
      radius: visuals.shape,
    );

    final Widget row = _buildRow(theme, tokens, visuals, selected: selected);
    Widget item = DecoratedBox(
      key: pressContainerKey,
      decoration: TanreiContainerDecoration(
        shape: shape,
        color: visuals.container.a > 0 ? visuals.container : null,
        ripple: _isStatic
            ? null
            : rippleFor(
                pressedContainer: () => theme.paint(condition.of(interactionState).containerColor),
                container: visuals.container,
              ),
      ),
      child: row,
    );
    if (!_isStatic) {
      // LST-4, LST-10: the focus indicator inside the row, as the focus style says; LST-6: the
      // state's opacity dims the whole row, its media included.
      item = Opacity(
        opacity: visuals.opacity,
        child: TanreiFocusRing(
          visible: isKeyboardFocused,
          inside: true,
          borderRadius: BorderRadius.circular(shape.radius),
          child: item,
        ),
      );
    }
    if (widget.divider) {
      // LST-22: along the bottom edge, inside the height, from the text's start to the row's end;
      // outside the opacity, so it keeps its color in every state; painted, so it is not read.
      item = CustomPaint(
        foregroundPainter: _DividerPainter(
          start: tokens.containerPaddingInlineStart + _leadingExtent(tokens),
          thickness: tokens.dividerThickness,
          color: theme.paint(tokens.dividerColor),
          textDirection: Directionality.of(context),
        ),
        child: item,
      );
    }

    // LST-23: the headline names the row; overline, supporting and trailing text describe it.
    final String description = <String>[
      widget.overline,
      widget.subtitle,
      widget.trailingText,
    ].where((String text) => text.isNotEmpty).join('\n');
    final String? hint = description.isEmpty ? null : description;

    if (_isStatic) {
      // LST-12: a list item; a control in its trailing slot is its own node inside it.
      return Semantics(
        container: true,
        explicitChildNodes: true,
        role: SemanticsRole.listItem,
        label: widget.title,
        hint: hint,
        child: item,
      );
    }
    final Widget pressable = buildPressable(
      focusNode: focusNode,
      // The content is presentational: the node carries the name and the description.
      child: ExcludeSemantics(child: item),
    );
    if (_isOption) {
      // LST-12: an option, with its selected state (the list item node itself).
      return Semantics(
        container: true,
        role: SemanticsRole.listItem,
        selected: selected,
        enabled: isEnabled,
        label: widget.title,
        hint: hint,
        child: pressable,
      );
    }
    // LST-12: an interactive item is one button inside its list item.
    return Semantics(
      container: true,
      explicitChildNodes: true,
      role: SemanticsRole.listItem,
      child: Semantics(
        container: true,
        button: true,
        enabled: isEnabled,
        label: widget.title,
        hint: hint,
        child: pressable,
      ),
    );
  }

  /// The width of the leading element and its gap: where the text column starts, from the start
  /// padding.
  double _leadingExtent(TanreiListTokens tokens) {
    final double? width = switch (widget.leadingMedia) {
      TanreiListLeadingMedia.avatar => tokens.avatarSize,
      TanreiListLeadingMedia.image => tokens.imageSize,
      TanreiListLeadingMedia.none => widget.leadingIcon == null ? null : tokens.leadingIconSize,
    };
    return width == null ? 0 : width + tokens.containerGap;
  }

  Widget _buildRow(
    TanreiThemeData theme,
    TanreiListTokens tokens,
    _ListVisuals visuals, {
    required bool selected,
  }) {
    final double smoothing = theme.system.shape.cornerSmoothing;
    Widget? media(double size, double radius, {required bool centred}) => SizedBox.square(
      dimension: size,
      child: ClipPath(
        clipper: _ShapeClipper(TanreiCornerShape(smoothing: smoothing, radius: radius)),
        child: ColoredBox(
          color: theme.paint(tokens.mediaContainerColor),
          // LST-20: the content gets the media content color as its foreground. An avatar
          // centres it, and a monogram is set in the headline's style; an image is fitted into
          // the box (tight constraints).
          child: IconTheme.merge(
            data: IconThemeData(color: theme.paint(tokens.mediaContentColor)),
            child: DefaultTextStyle(
              style: tokens.headlineTypescale.toTextStyle(
                color: theme.paint(tokens.mediaContentColor),
              ),
              textAlign: TextAlign.center,
              child: centred
                  ? Center(child: widget.leading)
                  : SizedBox.expand(child: widget.leading),
            ),
          ),
        ),
      ),
    );

    // LST-19, LST-20: media replaces the icon; an empty slot draws nothing and leaves no space.
    final Widget? leading = switch (widget.leadingMedia) {
      TanreiListLeadingMedia.avatar => media(tokens.avatarSize, tokens.avatarShape, centred: true),
      TanreiListLeadingMedia.image => media(tokens.imageSize, tokens.imageShape, centred: false),
      TanreiListLeadingMedia.none => switch (widget.leadingIcon) {
        final Widget icon => TanreiControlIcon(
          icon: icon,
          size: tokens.leadingIconSize,
          selected: selected,
          color: visuals.leadingIcon,
        ),
        null => null,
      },
    };

    // LST-16: trailing text, trailing icon, the trailing control and — in a selectable list —
    // the mark, each a gap from the next.
    final List<Widget> trailing = <Widget>[
      if (widget.trailingText.isNotEmpty)
        Flexible(
          child: ExcludeSemantics(
            child: Text(
              widget.trailingText,
              style: tokens.trailingTextTypescale.toTextStyle(color: visuals.trailingText),
              softWrap: true,
            ),
          ),
        ),
      if (widget.trailingIcon case final Widget icon)
        TanreiControlIcon(
          icon: icon,
          size: tokens.trailingIconSize,
          selected: selected,
          color: visuals.trailingIcon,
        ),
      if (widget.trailing case final Widget control) control,
      // LST-21: the mark's box is reserved in every option.
      if (_isOption)
        CustomPaint(
          size: Size.square(tokens.markSize),
          painter: TanreiCheckMarkPainter(
            color: visuals.mark,
            width: tokens.markWidth,
            progress: visuals.check,
          ),
        ),
    ];

    // LST-18: the headline, overline and trailing text wrap; the supporting text ends with an
    // ellipsis after subtitleMaxLines. The texts are read through the row's own semantics.
    Widget text(String value, TanreiTextStyle style, Color color, {int maxLines = 0}) =>
        ExcludeSemantics(
          child: Text(
            value,
            style: style.toTextStyle(color: color),
            softWrap: true,
            maxLines: maxLines > 0 ? maxLines : null,
            overflow: maxLines > 0 ? TextOverflow.ellipsis : null,
          ),
        );

    return TanreiItemRow(
      leading: leading == null ? null : ExcludeSemantics(child: leading),
      overline: widget.overline.isEmpty
          ? null
          : text(widget.overline, tokens.overlineTypescale, visuals.overline),
      headline: text(widget.title, tokens.headlineTypescale, visuals.headline),
      supporting: widget.subtitle.isEmpty
          ? null
          : text(
              widget.subtitle,
              tokens.supportingTextTypescale,
              visuals.supporting,
              maxLines: widget.subtitleMaxLines,
            ),
      trailing: trailing.isEmpty
          ? null
          : Row(mainAxisSize: MainAxisSize.min, spacing: tokens.containerGap, children: trailing),
      paddingStart: tokens.containerPaddingInlineStart,
      paddingEnd: tokens.containerPaddingInlineEnd,
      paddingBlock: tokens.containerPaddingBlock,
      gap: tokens.containerGap,
      minHeights: <double>[
        tokens.containerHeightOneLine,
        tokens.containerHeightTwoLine,
        tokens.containerHeightThreeLine,
      ],
      // LST-5: an interactive row or an option is at least the touch target tall (Flutter cannot
      // tell a fine pointer before it arrives).
      minTarget: _isStatic ? 0 : theme.system.measure.targetTouch,
      alignment: TanreiItemRowAlignment.centerThenTop,
    );
  }
}

/// Draws a list item's divider: [thickness] in [color] along the bottom edge, from [start] (from
/// the start edge) to the end edge.
class _DividerPainter extends CustomPainter {
  const _DividerPainter({
    required this.start,
    required this.thickness,
    required this.color,
    required this.textDirection,
  });

  final double start;
  final double thickness;
  final Color color;
  final TextDirection textDirection;

  @override
  void paint(Canvas canvas, Size size) {
    if (color.a == 0 || thickness <= 0) {
      return;
    }
    final double from = start.clamp(0, size.width).toDouble();
    final Rect line = textDirection == TextDirection.rtl
        ? Rect.fromLTWH(0, size.height - thickness, size.width - from, thickness)
        : Rect.fromLTWH(from, size.height - thickness, size.width - from, thickness);
    canvas.drawRect(line, Paint()..color = color);
  }

  @override
  bool shouldRepaint(_DividerPainter oldDelegate) =>
      start != oldDelegate.start ||
      thickness != oldDelegate.thickness ||
      color != oldDelegate.color ||
      textDirection != oldDelegate.textDirection;
}

/// Clips media to its shape, corner smoothing included.
class _ShapeClipper extends CustomClipper<Path> {
  const _ShapeClipper(this.shape);

  final TanreiCornerShape shape;

  @override
  Path getClip(Size size) => shape.path(Offset.zero & size);

  @override
  bool shouldReclip(_ShapeClipper oldClipper) => oldClipper.shape != shape;
}
