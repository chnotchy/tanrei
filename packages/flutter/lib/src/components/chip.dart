import 'dart:math' as math;
import 'dart:ui' show lerpDouble;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/control_icon.dart';
import '../primitives/control_visuals.dart';
import '../primitives/corner_shape.dart';
import '../primitives/elevation.dart';
import '../primitives/focus_ring.dart';
import '../primitives/glyphs.dart';
import '../primitives/ignored_value.dart';
import '../primitives/pressable.dart';
import '../primitives/selection_control.dart';
import '../primitives/tap_target.dart';
import '../theme/motion.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// What a chip does (the spec's `kind`), chosen by the constructor: `TanreiChip / TanreiChip.filter
/// / TanreiChip.input`.
enum TanreiChipKind {
  /// A button that performs or suggests something (`TanreiChip`).
  action,

  /// A two-state control, on or off (`TanreiChip.filter`).
  filter,

  /// An item the user entered, which the user can remove (`TanreiChip.input`).
  input,
}

/// A small labelled control in a row: an action, a filter that is on or off, or an item the user
/// entered and can remove.
///
/// Implements `specs/chip.spec.json` with the idiom of Flutter's chips — the kind is chosen by
/// constructor (`TanreiChip / TanreiChip.filter / TanreiChip.input`), with `FilterChip`'s and
/// `InputChip`'s callback names:
///
/// * `TanreiChip(...)` is an **action** chip: [onPressed] is called once per activation (the spec's
///   `click`);
/// * `TanreiChip.filter(...)` is a **filter** chip: a toggle button that draws and announces the
///   [selected] it is given. Activation calls [onSelected] with the opposite value (the spec's
///   `change`; the owner keeps the value) and [onPressed]. Selected, it shows a check in the
///   leading position and the `selected…` parts of its variant (CHP-11…13);
/// * `TanreiChip.input(...)` is an **input** chip: a trailing remove action — a separate button
///   named by [removeSemanticLabel], reached by Tab after the chip — calls [onDeleted] (the spec's
///   `remove`), as do Backspace and Delete while the chip itself has focus. The chip never removes
///   itself and never moves focus: its owner does both (CHP-18, CHP-19, CHP-22);
/// * [isEnabled] `false` disables it, the remove action included (the spec's `disabled`, as
///   Flutter's chips name it);
/// * [label] is the visible text and the accessible name; an empty one still renders and is
///   reported in debug builds, as is an input chip's empty [removeSemanticLabel] (CHP-26).
///
/// Every design value comes from the `TanreiChipTokens` of the active design system
/// (`TanreiTheme.of(context).system.chip`). The chip resolves which interaction state it is in and
/// draws container, outline, label, icon, elevation and opacity from that state's tokens — of its
/// variant, or its variant's `selected…` parts for a selected filter chip — and never computes how a
/// state looks. The remove action tracks its **own** interaction state and draws its round
/// container and glyph from the `remove…` parts of that state, leaving the chip's parts at the
/// chip's state (CHP-20).
///
/// Layout (CHP-16): one row — leading icon, check or avatar, label, remove action — separated by
/// the size's `containerGap`; each end padded by `containerPaddingInlineWithIcon` where it holds a
/// glyph, `containerPaddingInlineWithAvatar` where it holds an avatar, `containerPaddingInline`
/// where the label meets it; at least `containerHeight` high. The label stays on one line and is
/// truncated with an ellipsis only when the layout gives the chip less width (CHP-17). An [avatar]
/// is drawn only by an input chip (CHP-15); another kind ignores it and debug builds report it
/// through `debugTanreiReportIgnoredValue`.
///
/// The check and the remove glyph are drawn by the chip itself, as the `check` and `close` glyphs
/// of the system's icon set (Material Symbols in every shipped system), with the icon style of
/// their selection (CHP-14).
///
/// The chip is one tab stop — an input chip two — and handles no arrow keys: a row of chips is the
/// layout's (CHP-23). Presses, keyboard focus, the minimum target and corner smoothing behave as
/// `TanreiButton`'s (CHP-1…10 are BTN-1…10). The remove action's hit area is at least the touch
/// target on both axes, around its glyph: toward the label it reaches no further than the gap
/// before the glyph, and outward it extends beyond the chip as far as it needs; the chip's layout
/// grows at its end where the area reaches beyond it (CHP-21).
///
/// [variant] and [size] are open keys: `TanreiChipVariant.outlined` and `elevated`,
/// `TanreiChipSize.small` and `medium` are the core values. A value the active system does not
/// have renders as the default (`outlined`, `medium`) and is reported in debug builds (CHP-7).
class TanreiChip extends StatefulWidget {
  /// Creates an **action** chip.
  const TanreiChip({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.avatar,
    this.variant = TanreiChipVariant.outlined,
    this.size = TanreiChipSize.medium,
    this.isEnabled = true,
    this.focusNode,
    this.autofocus = false,
  }) : kind = TanreiChipKind.action,
       selected = false,
       onSelected = null,
       onDeleted = null,
       removeSemanticLabel = '';

  /// Creates a **filter** chip, on when [selected].
  const TanreiChip.filter({
    super.key,
    required this.label,
    required this.selected,
    this.onSelected,
    this.onPressed,
    this.icon,
    this.avatar,
    this.variant = TanreiChipVariant.outlined,
    this.size = TanreiChipSize.medium,
    this.isEnabled = true,
    this.focusNode,
    this.autofocus = false,
  }) : kind = TanreiChipKind.filter,
       onDeleted = null,
       removeSemanticLabel = '';

  /// Creates an **input** chip with a remove action named [removeSemanticLabel].
  const TanreiChip.input({
    super.key,
    required this.label,
    required this.removeSemanticLabel,
    this.onDeleted,
    this.onPressed,
    this.icon,
    this.avatar,
    this.variant = TanreiChipVariant.outlined,
    this.size = TanreiChipSize.medium,
    this.isEnabled = true,
    this.focusNode,
    this.autofocus = false,
  }) : kind = TanreiChipKind.input,
       selected = false,
       onSelected = null;

  /// What the chip does: chosen by the constructor.
  final TanreiChipKind kind;

  /// The visible text and the accessible name.
  final String label;

  /// Called once per activation of the chip itself (pointer, touch, Enter, Space or assistive
  /// technology) — never by an input chip's remove action.
  final VoidCallback? onPressed;

  /// Whether a filter chip is on. Always false for the other kinds.
  final bool selected;

  /// Called when a filter chip is activated, with the opposite of [selected]: flip it here.
  final ValueChanged<bool>? onSelected;

  /// Called when the user asks to remove an input chip — by its remove action, or by Backspace or
  /// Delete while the chip has focus. The chip does not remove itself.
  final VoidCallback? onDeleted;

  /// The accessible name of an input chip's remove action. Name the item: "Remove Ada Lovelace".
  final String removeSemanticLabel;

  /// The leading icon: an `Icon`, or a glyph of the system's icon font drawn as text. Decorative.
  final Widget? icon;

  /// An input chip's leading image (a person, a file), in place of [icon]; clipped to the avatar
  /// shape and hidden from assistive technology. Other kinds ignore it.
  final Widget? avatar;

  /// Look: outlined sits flat on a plain surface; elevated is raised over media or a busy
  /// background.
  final TanreiChipVariant variant;

  /// Visual height (24 / 32 in the default system). The hit area always meets the minimum target.
  final TanreiChipSize size;

  /// Whether the chip — and an input chip's remove action — react to input.
  final bool isEnabled;

  /// An optional focus node for the chip itself.
  final FocusNode? focusNode;

  /// Whether to focus the chip when nothing else is focused.
  final bool autofocus;

  /// Whether the chip reacts to input.
  bool get enabled => isEnabled;

  /// Whether the chip draws its selected look (CHP-12): only a filter chip that is on.
  bool get isSelectedFilter => kind == TanreiChipKind.filter && selected;

  @override
  State<TanreiChip> createState() => _TanreiChipState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(EnumProperty<TanreiChipKind>('kind', kind))
      ..add(StringProperty('variant', variant.name, quoted: false))
      ..add(StringProperty('size', size.name, quoted: false))
      ..add(FlagProperty('isEnabled', value: isEnabled, ifFalse: 'disabled'))
      ..add(FlagProperty('selected', value: selected, ifTrue: 'selected'))
      ..add(StringProperty('label', label))
      ..add(StringProperty('removeSemanticLabel', removeSemanticLabel, defaultValue: ''));
  }
}

/// The chip's own check and remove glyph (`glyphs.dart`), drawn as text so they take the family,
/// fill, weight and optical size of the system (CHP-14).
const String _checkGlyph = tanreiCheckGlyph;
const String _closeGlyph = tanreiCloseGlyph;

/// The ends of a change of condition, and of a part being shown: not design values.
const double _hidden = 0;
const double _shown = 1;

/// One look of a chip in one state: its tokens, evaluated in the current scheme.
@immutable
class _ChipVisuals {
  const _ChipVisuals({
    required this.container,
    required this.outline,
    required this.label,
    required this.icon,
    required this.elevation,
    required this.opacity,
    required this.check,
  });

  final Color container;
  final Color outline;
  final Color label;
  final Color icon;
  final TanreiResolvedElevation elevation;
  final double opacity;

  /// How much of the check is shown, 0–1 (CHP-13).
  final double check;

  static _ChipVisuals lerp(_ChipVisuals a, _ChipVisuals b, double t) => _ChipVisuals(
    container: tanreiLerpColor(a.container, b.container, t),
    outline: tanreiLerpColor(a.outline, b.outline, t),
    label: tanreiLerpColor(a.label, b.label, t),
    icon: tanreiLerpColor(a.icon, b.icon, t),
    elevation: TanreiResolvedElevation.lerp(a.elevation, b.elevation, t),
    opacity: lerpDouble(a.opacity, b.opacity, t)!,
    check: lerpDouble(a.check, b.check, t)!,
  );

  /// The container's visuals, for `TanreiControlContainer`.
  TanreiControlVisuals control(double shape) => TanreiControlVisuals(
    container: container,
    label: label,
    outline: outline,
    elevation: elevation,
    opacity: opacity,
    shape: shape,
  );
}

/// The paints of one look (CHP-12): a chip's own parts, or a selected filter chip's `selected…`.
typedef _Parts = ({
  TanreiPaint container,
  List<TanreiShadowLayer> elevation,
  TanreiPaint outline,
  TanreiPaint label,
  TanreiPaint icon,
});

_Parts _partsOf(TanreiChipVariantStateTokens tokens, {required bool selected}) => selected
    ? (
        container: tokens.selectedContainerColor,
        elevation: tokens.selectedContainerElevation,
        outline: tokens.selectedOutlineColor,
        label: tokens.selectedLabelColor,
        icon: tokens.selectedIconColor,
      )
    : (
        container: tokens.containerColor,
        elevation: tokens.containerElevation,
        outline: tokens.outlineColor,
        label: tokens.labelColor,
        icon: tokens.iconColor,
      );

class _TanreiChipState extends State<TanreiChip>
    with
        TickerProviderStateMixin<TanreiChip>,
        TanreiPressableStateMixin<TanreiChip, _ChipVisuals>,
        TanreiSelectionTransitionMixin<TanreiChip, _ChipVisuals> {
  TanreiChipTokens get _tokens => TanreiTheme.of(context).system.chip;

  /// Where the remove glyph sits in the chip, for the remove action laid over it.
  final _RemoveAnchorLink _anchor = _RemoveAnchorLink();

  @override
  VoidCallback? get onPressed => widget.isEnabled ? _activate : null;

  // CHP-1 / CHP-11: a filter chip emits click and change; the other kinds click only.
  void _activate() {
    widget.onPressed?.call();
    if (widget.kind == TanreiChipKind.filter) {
      widget.onSelected?.call(!widget.selected);
    }
  }

  // CHP-19: Backspace or Delete on the focused input chip asks to remove it.
  void _remove() {
    if (widget.isEnabled) {
      widget.onDeleted?.call();
    }
  }

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  // CHP-9: a ripple grows over the component's feedback duration.
  @override
  Duration get rippleDuration => tanreiDuration(_tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => _tokens.motionStateEasing.toCurve();

  @override
  _ChipVisuals lerpVisuals(_ChipVisuals a, _ChipVisuals b, double t) => _ChipVisuals.lerp(a, b, t);

  // CHP-13: a change of selection eases over the selection motion; a change of state over the
  // state motion.
  @override
  Object get selectionCondition => widget.isSelectedFilter;

  @override
  Duration get selectionDuration => tanreiDuration(_tokens.motionSelectionDuration);

  @override
  Curve get selectionCurve => _tokens.motionSelectionEasing.toCurve();

  @override
  _ChipVisuals lerpSelection(_ChipVisuals a, _ChipVisuals b, double t) =>
      _ChipVisuals.lerp(a, b, t);

  @override
  void initState() {
    super.initState();
    _debugReport(null);
  }

  @override
  void didUpdateWidget(TanreiChip oldWidget) {
    super.didUpdateWidget(oldWidget);
    _debugReport(oldWidget);
  }

  /// CHP-26 and CHP-15, in debug builds: an empty label, an input chip's empty remove label, and an
  /// avatar on a chip that is not an input chip — each when the chip is first built so, and when it
  /// becomes so again; never on every build.
  void _debugReport(TanreiChip? oldWidget) {
    assert(() {
      if ((oldWidget == null || tanreiIsAccessibleName(oldWidget.label)) &&
          !tanreiIsAccessibleName(widget.label)) {
        debugTanreiReportMissingName('chip', widget);
      }
      bool unnamedRemove(TanreiChip chip) =>
          chip.kind == TanreiChipKind.input && !tanreiIsAccessibleName(chip.removeSemanticLabel);
      if ((oldWidget == null || !unnamedRemove(oldWidget)) && unnamedRemove(widget)) {
        debugTanreiReportMissingName('chip remove action', widget);
      }
      bool ignoresAvatar(TanreiChip chip) =>
          chip.kind != TanreiChipKind.input && chip.avatar != null;
      if ((oldWidget == null || !ignoresAvatar(oldWidget)) && ignoresAvatar(widget)) {
        debugTanreiReportIgnoredValue(
          'chip',
          'avatar',
          'Only an input chip draws an avatar; a ${widget.kind.name} chip ignores it. Use icon '
              'for a leading glyph.',
          widget,
        );
      }
      return true;
    }());
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiChipTokens tokens = theme.system.chip;
    // Total lookups: a size or variant the system does not have resolves to the default's tokens
    // and is reported in debug builds (CHP-7).
    final TanreiChipSizeTokens size = tokens.sizes[widget.size];
    final TanreiChipVariantTokens variant = tokens.variants[widget.variant];
    final bool selected = widget.isSelectedFilter;

    // CHP-3 / CHP-6 / CHP-9 / CHP-12: the drawn state's tokens of the look, the container color of
    // the state the pressed feedback names.
    final _Parts drawn = _partsOf(variant.of(drawnState), selected: selected);
    final TanreiChipStateTokens? state = tokens.stateTokens(drawnState);
    final _ChipVisuals visuals = animateVisuals(
      animateSelection(
        _ChipVisuals(
          container: theme.paint(
            _partsOf(variant.of(containerState), selected: selected).container,
          ),
          outline: theme.paint(drawn.outline),
          label: theme.paint(drawn.label),
          icon: theme.paint(drawn.icon),
          elevation: TanreiResolvedElevation.resolve(drawn.elevation, theme.colors),
          // At rest (no state tokens) nothing dims the chip.
          opacity: state?.opacity ?? _shown,
          check: selected ? _shown : _hidden,
        ),
      ),
    );
    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: theme.system.shape.cornerSmoothing,
      radius: tokens.containerShape,
    );
    final bool input = widget.kind == TanreiChipKind.input;

    final Widget container = TanreiControlContainer(
      key: pressContainerKey,
      visuals: visuals.control(tokens.containerShape),
      shape: shape,
      outlineWidth: tokens.outlineWidth,
      ripple: rippleFor(
        pressedContainer: () =>
            theme.paint(_partsOf(variant.of(interactionState), selected: selected).container),
        container: visuals.container,
      ),
      child: ConstrainedBox(
        // A minimum: the chip grows in height with larger text (CHP-17).
        constraints: BoxConstraints(minHeight: size.containerHeight),
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: size.containerPaddingBlock),
          child: Center(
            widthFactor: 1,
            heightFactor: 1,
            child: _content(theme, tokens, size, visuals, input: input),
          ),
        ),
      ),
    );

    Widget chip = Semantics(
      container: true,
      button: true,
      enabled: isEnabled,
      // CHP-11: a filter chip is a toggle button — its value as selected / not selected (the
      // selected trait on Apple platforms, Flutter's toggle-button idiom); the other kinds expose
      // no such state.
      selected: widget.kind == TanreiChipKind.filter ? widget.selected : null,
      label: widget.label,
      sortKey: const OrdinalSortKey(0),
      child: TanreiTapTarget(
        child: buildPressable(
          focusNode: widget.focusNode,
          autofocus: widget.autofocus,
          child: Opacity(
            opacity: visuals.opacity,
            child: TanreiFocusRing(
              visible: isKeyboardFocused,
              borderRadius: BorderRadius.circular(shape.radius),
              child: container,
            ),
          ),
        ),
      ),
    );
    if (!input) {
      return chip;
    }
    // CHP-19: only while the chip itself has focus — not its remove action.
    chip = CallbackShortcuts(
      bindings: <ShortcutActivator, VoidCallback>{
        const SingleActivator(LogicalKeyboardKey.backspace): _remove,
        const SingleActivator(LogicalKeyboardKey.delete): _remove,
      },
      child: chip,
    );
    final double target = theme.system.measure.targetTouch;
    // CHP-21: the remove glyph's center lies this far inside the start of its hit area: toward the
    // label the area reaches no further than the gap before the glyph (and no further than half the
    // target), and it extends outward as far as the target needs.
    final double inset = math.min(target / 2, size.iconSize / 2 + size.containerGap);
    // CHP-23: the chip, then its remove action, whatever the geometry.
    return FocusTraversalGroup(
      policy: WidgetOrderTraversalPolicy(),
      child: _ChipFrame(
        anchor: _anchor,
        target: target,
        glyphSize: size.iconSize,
        glyphInset: inset,
        textDirection: Directionality.of(context),
        children: <Widget>[
          chip,
          _ChipRemoveAction(
            enabled: isEnabled,
            onPressed: widget.onDeleted,
            semanticLabel: widget.removeSemanticLabel,
            variant: widget.variant,
            size: widget.size,
            target: target,
            glyphInset: inset,
            chipOpacity: visuals.opacity,
          ),
        ],
      ),
    );
  }

  /// The row inside the container (CHP-16), in reading order so right-to-left mirrors it (CHP-25):
  /// start padding, the leading part, the label, and for an input chip the place of the remove
  /// glyph (the remove action itself is laid over it by `_ChipFrame`) and the end padding.
  Widget _content(
    TanreiThemeData theme,
    TanreiChipTokens tokens,
    TanreiChipSizeTokens size,
    _ChipVisuals visuals, {
    required bool input,
  }) {
    final double check = visuals.check;
    final Widget? avatar = input ? widget.avatar : null;
    final Widget? icon = widget.icon;
    final bool filter = widget.kind == TanreiChipKind.filter;

    Widget glyph(Widget slot, {required bool selected}) =>
        TanreiControlIcon(icon: slot, size: size.iconSize, selected: selected, color: visuals.icon);

    // The leading part and the padding before it.
    final List<Widget> leading;
    if (avatar != null) {
      // CHP-15: the avatar in place of an icon, clipped to its shape, decorative; faded like
      // disabled content while disabled (CHP-6).
      leading = <Widget>[
        SizedBox(width: size.containerPaddingInlineWithAvatar),
        ExcludeSemantics(
          child: Opacity(
            opacity: isEnabled ? _shown : theme.system.state.disabledContentOpacity,
            child: ClipPath(
              clipper: _ShapeClipper(
                TanreiCornerShape(
                  smoothing: theme.system.shape.cornerSmoothing,
                  radius: tokens.avatarShape,
                ),
              ),
              child: SizedBox.square(dimension: size.avatarSize, child: avatar),
            ),
          ),
        ),
        SizedBox(width: size.containerGap),
      ];
    } else if (filter && icon != null) {
      // CHP-13: the check in place of the icon, the one fading into the other.
      final double shown = check.clamp(_hidden, _shown);
      leading = <Widget>[
        SizedBox(width: size.containerPaddingInlineWithIcon),
        Stack(
          alignment: Alignment.center,
          children: <Widget>[
            if (shown < _shown)
              Opacity(opacity: _shown - shown, child: glyph(icon, selected: false)),
            if (shown > _hidden)
              Opacity(opacity: shown, child: glyph(const Text(_checkGlyph), selected: true)),
          ],
        ),
        SizedBox(width: size.containerGap),
      ];
    } else if (filter) {
      // CHP-13: the check grows the chip from the start as it appears, and narrows it as it goes.
      final double shown = math.max(_hidden, check);
      leading = <Widget>[
        SizedBox(
          width: lerpDouble(
            size.containerPaddingInline,
            size.containerPaddingInlineWithIcon,
            shown,
          ),
        ),
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
                    glyph(const Text(_checkGlyph), selected: true),
                    SizedBox(width: size.containerGap),
                  ],
                ),
              ),
            ),
          ),
      ];
    } else if (icon != null) {
      leading = <Widget>[
        SizedBox(width: size.containerPaddingInlineWithIcon),
        glyph(icon, selected: false),
        SizedBox(width: size.containerGap),
      ];
    } else {
      leading = <Widget>[SizedBox(width: size.containerPaddingInline)];
    }

    return DefaultTextStyle(
      style: theme.textStyle(size.labelTypescale, color: visuals.label),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          ...leading,
          // CHP-17: one line, an ellipsis only when the chip is given less width; the full label
          // stays the accessible name (the chip's Semantics).
          Flexible(
            child: ExcludeSemantics(
              child: Text(
                widget.label,
                maxLines: 1,
                softWrap: false,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ),
          if (input) ...<Widget>[
            SizedBox(width: size.containerGap),
            _RemoveAnchor(
              link: _anchor,
              child: SizedBox.square(dimension: size.iconSize),
            ),
            SizedBox(width: size.containerPaddingInlineWithIcon),
          ] else
            SizedBox(width: size.containerPaddingInline),
        ],
      ),
    );
  }
}

/// An input chip's remove action (CHP-18, CHP-20): a separate button — its own semantics node,
/// focus stop and interaction state — drawn as a round container of the size's
/// `removeContainerSize` behind a close glyph, from the `remove…` parts of its own state. Its box
/// is its hit area: [target] square, the glyph [glyphInset] inside its start.
class _ChipRemoveAction extends StatefulWidget {
  const _ChipRemoveAction({
    required this.enabled,
    required this.onPressed,
    required this.semanticLabel,
    required this.variant,
    required this.size,
    required this.target,
    required this.glyphInset,
    required this.chipOpacity,
  });

  final bool enabled;
  final VoidCallback? onPressed;
  final String semanticLabel;
  final TanreiChipVariant variant;
  final TanreiChipSize size;
  final double target;
  final double glyphInset;

  /// The chip's own opacity: a dimmed or disabled chip dims its remove action too.
  final double chipOpacity;

  @override
  State<_ChipRemoveAction> createState() => _ChipRemoveActionState();
}

class _ChipRemoveActionState extends State<_ChipRemoveAction>
    with
        TickerProviderStateMixin<_ChipRemoveAction>,
        TanreiPressableStateMixin<_ChipRemoveAction, TanreiControlVisuals> {
  TanreiChipTokens get _tokens => TanreiTheme.of(context).system.chip;

  // CHP-18: remove, exactly once, never click.
  @override
  VoidCallback? get onPressed => widget.enabled ? (widget.onPressed ?? _nothing) : null;

  static void _nothing() {}

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  @override
  Duration get rippleDuration => tanreiDuration(_tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => _tokens.motionStateEasing.toCurve();

  @override
  TanreiControlVisuals lerpVisuals(TanreiControlVisuals a, TanreiControlVisuals b, double t) =>
      TanreiControlVisuals.lerp(a, b, t);

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiChipTokens tokens = theme.system.chip;
    final TanreiChipSizeTokens size = tokens.sizes[widget.size];
    final TanreiChipVariantTokens variant = tokens.variants[widget.variant];
    final TanreiChipVariantStateTokens drawn = variant.of(drawnState);
    final TanreiChipStateTokens? state = tokens.stateTokens(drawnState);
    // CHP-20: the remove parts of the remove action's own state.
    final TanreiControlVisuals visuals = animateVisuals(
      TanreiControlVisuals.resolve(
        theme,
        containerColor: variant.of(containerState).removeContainerColor,
        labelColor: drawn.removeIconColor,
        outlineColor: const TanreiPaint.none(),
        elevation: const <TanreiShadowLayer>[],
        opacity: state?.opacity,
        shape: tokens.removeContainerShape,
      ),
    );
    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: theme.system.shape.cornerSmoothing,
      radius: visuals.shape,
    );
    final Size round = Size.square(size.removeContainerSize);
    final TextDirection direction = Directionality.of(context);
    final double fromLeft = direction == TextDirection.ltr
        ? widget.glyphInset
        : widget.target - widget.glyphInset;

    return Semantics(
      container: true,
      button: true,
      enabled: isEnabled,
      label: widget.semanticLabel,
      sortKey: const OrdinalSortKey(1),
      child: buildPressable(
        child: SizedBox.square(
          dimension: widget.target,
          child: Stack(
            children: <Widget>[
              Positioned(
                left: fromLeft - round.width / 2,
                top: (widget.target - round.height) / 2,
                // The chip's dim or disabled opacity and the remove action's own: the lower one.
                child: Opacity(
                  opacity: math.min(widget.chipOpacity, visuals.opacity),
                  // CHP-20: the focus ring around the round container, not the chip.
                  child: TanreiFocusRing(
                    visible: isKeyboardFocused,
                    borderRadius: BorderRadius.circular(shape.radius),
                    child: Stack(
                      alignment: Alignment.center,
                      children: <Widget>[
                        TanreiStateLayer(
                          key: pressContainerKey,
                          size: size.removeContainerSize,
                          shape: shape,
                          color: visuals.container,
                          // A press in the added target space grows from the center.
                          ripple: tanreiRippleInside(
                            rippleFor(
                              pressedContainer: () =>
                                  theme.paint(variant.of(interactionState).removeContainerColor),
                              container: visuals.container,
                            ),
                            round,
                          ),
                        ),
                        TanreiControlIcon(
                          icon: const Text(_closeGlyph),
                          size: size.iconSize,
                          selected: false,
                          color: visuals.label,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Clips to a corner shape, smoothing included (the avatar).
class _ShapeClipper extends CustomClipper<Path> {
  const _ShapeClipper(this.shape);

  final TanreiCornerShape shape;

  @override
  Path getClip(Size size) => shape.path(Offset.zero & size);

  @override
  bool shouldReclip(_ShapeClipper oldClipper) => oldClipper.shape != shape;
}

/// Where the remove glyph's place was laid out inside the chip: `_RemoveAnchor` registers its
/// render box, `_ChipFrame` reads it after laying the chip out.
class _RemoveAnchorLink {
  RenderBox? box;
}

class _RemoveAnchor extends SingleChildRenderObjectWidget {
  const _RemoveAnchor({required this.link, required Widget super.child});

  final _RemoveAnchorLink link;

  @override
  RenderObject createRenderObject(BuildContext context) => _RenderRemoveAnchor(link);

  @override
  void updateRenderObject(BuildContext context, _RenderRemoveAnchor renderObject) {
    renderObject.link = link;
  }
}

class _RenderRemoveAnchor extends RenderProxyBox {
  _RenderRemoveAnchor(this._link);

  _RemoveAnchorLink _link;
  set link(_RemoveAnchorLink value) {
    if (identical(value, _link)) {
      return;
    }
    if (identical(_link.box, this)) {
      _link.box = null;
    }
    _link = value;
    if (attached) {
      _link.box = this;
    }
  }

  @override
  void attach(PipelineOwner owner) {
    super.attach(owner);
    _link.box = this;
  }

  @override
  void detach() {
    if (identical(_link.box, this)) {
      _link.box = null;
    }
    super.detach();
  }
}

/// Lays an input chip out with its remove action over it (CHP-18, CHP-21): the chip first (its
/// own target included), then the remove action's hit area — at least [target] on both axes,
/// around the remove glyph, [glyphInset] from its start to the glyph's center, so that toward the
/// label it reaches no further than the gap before the glyph — which extends outward beyond the
/// chip's end; the frame grows to hold it, so it can be hit. The remove action is painted and
/// hit-tested above the chip, so a pointer or a press in its area never reaches the chip: the chip
/// is not hovered or pressed while the remove action is (CHP-20).
class _ChipFrame extends MultiChildRenderObjectWidget {
  const _ChipFrame({
    required this.anchor,
    required this.target,
    required this.glyphSize,
    required this.glyphInset,
    required this.textDirection,
    required super.children,
  });

  final _RemoveAnchorLink anchor;
  final double target;

  /// The side of the remove glyph's box (the size's `iconSize`).
  final double glyphSize;
  final double glyphInset;
  final TextDirection textDirection;

  @override
  RenderObject createRenderObject(BuildContext context) => _RenderChipFrame(
    anchor: anchor,
    target: target,
    glyphSize: glyphSize,
    glyphInset: glyphInset,
    textDirection: textDirection,
  );

  @override
  void updateRenderObject(BuildContext context, _RenderChipFrame renderObject) {
    renderObject
      ..anchor = anchor
      ..target = target
      ..glyphSize = glyphSize
      ..glyphInset = glyphInset
      ..textDirection = textDirection;
  }
}

class _ChipFrameParentData extends ContainerBoxParentData<RenderBox> {}

class _RenderChipFrame extends RenderBox
    with
        ContainerRenderObjectMixin<RenderBox, _ChipFrameParentData>,
        RenderBoxContainerDefaultsMixin<RenderBox, _ChipFrameParentData> {
  _RenderChipFrame({
    required _RemoveAnchorLink anchor,
    required double target,
    required double glyphSize,
    required double glyphInset,
    required TextDirection textDirection,
  }) : _anchor = anchor,
       _target = target,
       _glyphSize = glyphSize,
       _glyphInset = glyphInset,
       _textDirection = textDirection;

  _RemoveAnchorLink _anchor;
  set anchor(_RemoveAnchorLink value) {
    if (!identical(value, _anchor)) {
      _anchor = value;
      markNeedsLayout();
    }
  }

  double _target;
  set target(double value) {
    if (value != _target) {
      _target = value;
      markNeedsLayout();
    }
  }

  double _glyphSize;
  set glyphSize(double value) {
    if (value != _glyphSize) {
      _glyphSize = value;
      markNeedsLayout();
    }
  }

  double _glyphInset;
  set glyphInset(double value) {
    if (value != _glyphInset) {
      _glyphInset = value;
      markNeedsLayout();
    }
  }

  TextDirection _textDirection;
  set textDirection(TextDirection value) {
    if (value != _textDirection) {
      _textDirection = value;
      markNeedsLayout();
    }
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _ChipFrameParentData) {
      child.parentData = _ChipFrameParentData();
    }
  }

  @override
  void performLayout() {
    final RenderBox chip = firstChild!;
    final RenderBox remove = childAfter(chip)!;
    chip.layout(constraints.loosen(), parentUsesSize: true);
    Rect chipRect = Offset.zero & chip.size;
    // The remove glyph's place, in the chip's coordinates.
    final RenderBox? anchor = _anchor.box;
    // Its origin, then half the glyph box: a parent may not read the size of a render object it
    // did not lay out.
    final Offset glyph = anchor == null || !anchor.attached
        ? chip.size.centerRight(Offset.zero)
        : MatrixUtils.transformPoint(anchor.getTransformTo(chip), Offset.zero) +
              Offset(_glyphSize / 2, _glyphSize / 2);
    final double start = _textDirection == TextDirection.ltr
        ? glyph.dx - _glyphInset
        : glyph.dx - (_target - _glyphInset);
    Rect removeRect = Rect.fromLTWH(start, glyph.dy - _target / 2, _target, _target);
    // Shift both so that nothing lies at a negative offset.
    final Rect bounds = chipRect.expandToInclude(removeRect);
    chipRect = chipRect.shift(-bounds.topLeft);
    removeRect = removeRect.shift(-bounds.topLeft);
    remove.layout(BoxConstraints.tight(removeRect.size));
    (chip.parentData! as _ChipFrameParentData).offset = chipRect.topLeft;
    (remove.parentData! as _ChipFrameParentData).offset = removeRect.topLeft;
    size = constraints.constrain(bounds.size);
  }

  @override
  Size computeDryLayout(BoxConstraints constraints) {
    // The remove action may reach beyond the chip; a dry layout cannot place the glyph, so it
    // answers the chip's size with the target added at its end (an upper bound).
    final Size chip = firstChild!.getDryLayout(constraints.loosen());
    return constraints.constrain(Size(chip.width + _target / 2, math.max(chip.height, _target)));
  }

  @override
  void paint(PaintingContext context, Offset offset) => defaultPaint(context, offset);

  // The last child — the remove action — is tested first, so its area is its own.
  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) =>
      defaultHitTestChildren(result, position: position);
}
