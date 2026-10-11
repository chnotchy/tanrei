import 'dart:math' as math;
import 'dart:ui' show lerpDouble;

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/control_icon.dart';
import '../primitives/control_visuals.dart';
import '../primitives/corner_shape.dart';
import '../primitives/focus_ring.dart';
import '../primitives/ignored_value.dart';
import '../primitives/pressable.dart';
import '../primitives/tap_target.dart';
import '../theme/motion.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// The floating action button with its name written out next to its icon; it collapses to the
/// icon when the room goes away.
///
/// Implements `specs/extended-fab.spec.json` with the idiom of Flutter's
/// `FloatingActionButton.extended` — a separate class rather than a named constructor of
/// `TanreiFloatingActionButton`, because it has its own tokens:
///
/// * a null [onPressed] disables it (the spec's `disabled`);
/// * [label] is the visible text **and** the accessible name, shown or collapsed away. An empty one
///   still renders and is reported in debug builds (EFB-19) through
///   `debugTanreiReportMissingName`;
/// * [isExtended] is the spec's `expanded`: false collapses the button to a square holding only its
///   [icon] (EFB-13), for example while the content scrolls. Without an icon it cannot collapse:
///   it stays extended and debug builds report it through `debugTanreiReportIgnoredValue`
///   (EFB-15);
/// * it does not position itself (EFB-17): the layout that holds it places it, and decides which
///   edge stays put while it changes width (EFB-14).
///
/// Every design value comes from the `TanreiExtendedFabTokens` of the active design system
/// (`TanreiTheme.of(context).system.extendedFab`). Extended, the container is at least the size's
/// `containerHeight` high and as wide as its content: the start padding (`...WithIcon` when there
/// is an icon), the icon, the size's `containerGap`, the label in the size's `labelTypescale`, and
/// the end padding (EFB-11). The label never truncates: it wraps when the layout gives it less
/// width, and the container grows in both axes with it (EFB-12). The icon takes the label color,
/// at the size's `iconSize`, unselected, with `sys.icon.weight` and a clamped optical size.
///
/// A change of [isExtended] changes the width over `motionResizeDuration` with
/// `motionResizeEasing` — the label fading out as it narrows and in as it widens — and applies at
/// once where animations are disabled (EFB-14). A change of state changes colors and elevation over
/// `motionStateDuration` (EFB-16). In right-to-left the icon and label swap sides and the paddings
/// follow the logical start and end (EFB-18).
///
/// Presses, keyboard focus, the minimum target and corner smoothing behave exactly as
/// `TanreiButton`'s (EFB-1…10 are BTN-1…10), through the same primitives.
///
/// [variant] and [size] are open keys: `TanreiExtendedFabVariant.filled`, `tonal` and
/// `surface`, `TanreiExtendedFabSize.small`, `medium` and `large` are the core values. A value the
/// active system does not have renders as the default (`filled`, `medium`) and is reported in
/// debug builds (EFB-7).
class TanreiExtendedFloatingActionButton extends StatefulWidget {
  /// Creates an extended floating action button. Pass a null [onPressed] to disable it.
  const TanreiExtendedFloatingActionButton({
    super.key,
    required this.onPressed,
    required this.label,
    this.icon,
    this.isExtended = true,
    this.variant = TanreiExtendedFabVariant.filled,
    this.size = TanreiExtendedFabSize.medium,
    this.focusNode,
    this.autofocus = false,
  });

  /// Called exactly once per activation (pointer, touch, Enter, Space or assistive technology).
  /// When null the button is disabled: it is not focusable and is exposed as disabled.
  final VoidCallback? onPressed;

  /// The visible text and the accessible name, whether it is shown or collapsed away.
  final String label;

  /// The optional leading icon: an `Icon`, or a glyph of the system's icon font drawn as text. It is
  /// decorative to assistive technology, and required to collapse.
  final Widget? icon;

  /// Whether the label is shown (the spec's `expanded`). False collapses the button to a square
  /// holding its icon; without an icon it stays extended.
  final bool isExtended;

  /// Emphasis, with the floating action button's meanings.
  final TanreiExtendedFabVariant variant;

  /// Visual size: height, corners, paddings, gap, label style and icon. The hit area always meets
  /// the minimum target.
  final TanreiExtendedFabSize size;

  /// An optional focus node to use instead of an internal one.
  final FocusNode? focusNode;

  /// Whether to focus this button when nothing else is focused.
  final bool autofocus;

  /// Whether the button reacts to input.
  bool get enabled => onPressed != null;

  /// Whether the button can collapse: only with an icon (EFB-15).
  bool get canCollapse => icon != null;

  @override
  State<TanreiExtendedFloatingActionButton> createState() =>
      _TanreiExtendedFloatingActionButtonState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('variant', variant.name, quoted: false))
      ..add(StringProperty('size', size.name, quoted: false))
      ..add(FlagProperty('enabled', value: enabled, ifFalse: 'disabled'))
      ..add(FlagProperty('isExtended', value: isExtended, ifFalse: 'collapsed'))
      ..add(StringProperty('label', label));
  }
}

/// An extended FAB has no outline part: nothing to draw, at no width (not design values).
const TanreiPaint _noOutline = TanreiPaint.none();
const double _noOutlineWidth = 0;

/// The extent of the label while collapsed and while extended: how much of it is shown (not
/// design values — the two ends of the resize).
const double _collapsed = 0;
const double _extended = 1;

class _TanreiExtendedFloatingActionButtonState extends State<TanreiExtendedFloatingActionButton>
    with
        TickerProviderStateMixin<TanreiExtendedFloatingActionButton>,
        TanreiPressableStateMixin<TanreiExtendedFloatingActionButton, TanreiControlVisuals> {
  TanreiExtendedFabTokens get _tokens => TanreiTheme.of(context).system.extendedFab;

  /// Runs 0 → 1 while the label's extent moves from [_from] to [_to] (EFB-14).
  late final AnimationController _resize = AnimationController(vsync: this, value: 1)
    ..addListener(() => setState(() {}));
  late double _from = _target;
  late double _to = _target;
  Curve _resizeCurve = Curves.linear;
  bool _disableAnimations = false;

  /// The label's extent the widget asks for: collapsed only with an icon (EFB-15).
  double get _target => widget.isExtended || !widget.canCollapse ? _extended : _collapsed;

  /// The label's extent now: 0 collapsed, 1 extended, and — with a springy easing — a little past
  /// either end on the way.
  double get _extent => lerpDouble(_from, _to, _resizeCurve.transform(_resize.value))!;

  @override
  VoidCallback? get onPressed => widget.onPressed;

  // EFB-16: colors and elevation change over the component's state motion.
  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  // EFB-9: a ripple grows over the component's feedback duration.
  @override
  Duration get rippleDuration => tanreiDuration(_tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => _tokens.motionStateEasing.toCurve();

  @override
  TanreiControlVisuals lerpVisuals(TanreiControlVisuals a, TanreiControlVisuals b, double t) =>
      TanreiControlVisuals.lerp(a, b, t);

  @override
  void initState() {
    super.initState();
    _debugReport(null);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final TanreiExtendedFabTokens tokens = _tokens;
    _resize.duration = tanreiDuration(tokens.motionResizeDuration);
    _resizeCurve = tokens.motionResizeEasing.toCurve();
    _disableAnimations = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (_disableAnimations && _resize.isAnimating) {
      _resize.value = _resize.upperBound;
    }
  }

  @override
  void didUpdateWidget(TanreiExtendedFloatingActionButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    _debugReport(oldWidget);
    // Read here too: when the widget and the media query change in one frame, didUpdateWidget runs
    // before didChangeDependencies.
    _disableAnimations = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    final double target = _target;
    if (target != _to) {
      // EFB-14: from wherever the label is now, so a reversal mid-way does not jump.
      _from = _extent;
      _to = target;
      if (_disableAnimations) {
        _resize.value = _resize.upperBound;
      } else {
        _resize.forward(from: _resize.lowerBound);
      }
    }
  }

  @override
  void dispose() {
    _resize.dispose();
    super.dispose();
  }

  /// EFB-19 and EFB-15, in debug builds: an empty label, and a collapse without an icon — each
  /// when the button is first built so, and when it becomes so again; never on every build.
  void _debugReport(TanreiExtendedFloatingActionButton? oldWidget) {
    assert(() {
      final bool hadName = oldWidget == null || tanreiIsAccessibleName(oldWidget.label);
      if (hadName && !tanreiIsAccessibleName(widget.label)) {
        debugTanreiReportMissingName('extended-fab', widget);
      }
      bool ignoresCollapse(TanreiExtendedFloatingActionButton w) => !w.isExtended && !w.canCollapse;
      if ((oldWidget == null || !ignoresCollapse(oldWidget)) && ignoresCollapse(widget)) {
        debugTanreiReportIgnoredValue(
          'extended-fab',
          'isExtended',
          'An extended FAB cannot collapse without an icon: it stays extended. Give it an icon, or '
              'keep isExtended true.',
          widget,
        );
      }
      return true;
    }());
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiExtendedFabTokens tokens = theme.system.extendedFab;
    // Total lookups: a size or variant the system does not have resolves to the default's tokens
    // and is reported in debug builds (EFB-7).
    final TanreiExtendedFabSizeTokens size = tokens.sizes[widget.size];
    final TanreiExtendedFabVariantTokens variant = tokens.variants[widget.variant];

    // How a press is answered is a choice of the design system (EFB-9).
    final TanreiExtendedFabVariantStateTokens drawn = variant.of(drawnState);
    final TanreiExtendedFabStateTokens? state = tokens.stateTokens(drawnState);
    final TanreiControlVisuals visuals = animateVisuals(
      TanreiControlVisuals.resolve(
        theme,
        containerColor: variant.of(containerState).containerColor,
        labelColor: drawn.labelColor,
        outlineColor: _noOutline,
        elevation: drawn.containerElevation,
        // At rest (no state tokens) nothing dims the control; the corners are the size's.
        opacity: state?.opacity,
        shape: size.containerShape,
      ),
    );
    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: theme.system.shape.cornerSmoothing,
      radius: visuals.shape,
    );

    final Widget container = TanreiControlContainer(
      key: pressContainerKey,
      visuals: visuals,
      shape: shape,
      outlineWidth: _noOutlineWidth,
      ripple: rippleFor(
        pressedContainer: () => theme.paint(variant.of(interactionState).containerColor),
        container: visuals.container,
      ),
      child: ConstrainedBox(
        // A minimum, not a fixed height: the container grows with large text (EFB-12).
        constraints: BoxConstraints(minHeight: size.containerHeight),
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: size.containerPaddingBlock),
          child: Center(
            widthFactor: 1,
            heightFactor: 1,
            child: DefaultTextStyle(
              style: theme.textStyle(size.labelTypescale, color: visuals.label),
              textAlign: TextAlign.center,
              child: _content(size, visuals.label),
            ),
          ),
        ),
      ),
    );

    return Semantics(
      container: true,
      button: true,
      enabled: isEnabled,
      // EFB-13: the label names the button whether it is shown or collapsed away.
      label: widget.label,
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
  }

  /// The row of the container: start padding, icon, and the label part (gap, label, end padding),
  /// in reading order, so right-to-left mirrors it (EFB-18). While the label's extent is below 1
  /// the label part is clipped to that share of its width and height and faded by it, and the
  /// padding around the icon moves towards centering it in a square of the container height
  /// (EFB-13, EFB-14).
  Widget _content(TanreiExtendedFabSizeTokens size, Color color) {
    final Widget label = ExcludeSemantics(child: Text(widget.label));
    final Widget? slot = widget.icon;
    if (slot == null) {
      // EFB-15: no icon, no collapse.
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          SizedBox(width: size.containerPaddingInlineStart),
          Flexible(child: label),
          SizedBox(width: size.containerPaddingInlineEnd),
        ],
      );
    }
    final double extent = _extent;
    // Past 1 the spring widens the label part a little; below 0 nothing is left to narrow.
    final double shown = math.max(_collapsed, extent);
    final double fade = extent.clamp(_collapsed, _extended);
    // Collapsed, the icon is centered in a square whose side is the container height.
    final double centered = (size.containerHeight - size.iconSize) / 2;
    final Widget labelPart = Padding(
      padding: EdgeInsetsDirectional.only(
        start: size.containerGap,
        end: size.containerPaddingInlineEnd,
      ),
      child: label,
    );
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        SizedBox(width: lerpDouble(centered, size.containerPaddingInlineStartWithIcon, shown)),
        TanreiControlIcon(icon: slot, size: size.iconSize, selected: false, color: color),
        Flexible(
          child: extent == _extended
              ? labelPart
              : ClipRect(
                  child: Align(
                    alignment: AlignmentDirectional.centerStart,
                    widthFactor: shown,
                    heightFactor: math.min(shown, _extended),
                    child: Opacity(opacity: fade, child: labelPart),
                  ),
                ),
        ),
        SizedBox(width: centered * math.max(_collapsed, _extended - shown)),
      ],
    );
  }
}
