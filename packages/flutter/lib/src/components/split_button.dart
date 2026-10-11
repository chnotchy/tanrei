import 'dart:math' as math;
import 'dart:ui' show lerpDouble;

import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/container_decoration.dart';
import '../primitives/control_content.dart';
import '../primitives/control_icon.dart';
import '../primitives/control_visuals.dart';
import '../primitives/corner_shape.dart';
import '../primitives/focus_ring.dart';
import '../primitives/glyphs.dart';
import '../primitives/ignored_value.dart';
import '../primitives/menu_anchor_semantics.dart';
import '../primitives/pressable.dart';
import '../primitives/selection_control.dart';
import '../theme/motion.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';
import 'menu.dart';

/// A main action and a chevron that opens a menu of related actions, joined as one control.
///
/// Implements `specs/split-button.spec.json` with the widgets library:
/// `TanreiSplitButton(label:, icon:, menuSemanticLabel:, onPressed:, menuController:, menuChildren:,
/// onMenuToggle:, onMenuClose:, variant:, size:)`.
///
/// * The **leading half** performs the main action: [onPressed] is the spec's `click`. A null
///   [onPressed] disables both halves (the spec's `disabled`): neither is focusable, both are
///   exposed as disabled, and no menu is presented whatever [menuController] says (SPB-3).
/// * The **trailing half** opens and closes the menu. Activating it — pointer, touch, Enter or
///   Space, or Down Arrow while closed — calls [onMenuToggle] with the open value it asks for (the
///   spec's `toggle`) and then opens or closes the menu through [menuController] (the spec's
///   `open`: a `TanreiMenuController`, internal when null) (SPB-2).
/// * [menuChildren] are the menu's items (`TanreiMenuItem`, `TanreiCheckboxMenuItem`,
///   `TanreiRadioMenuItem`, `TanreiMenuGroup`), presented as a Tanrei Menu anchored to the whole
///   split button at `bottomEnd`, with the trailing half as the element focus returns to (SPB-15).
///   When the menu asks to be closed, [onMenuClose] is called once with its reason and the menu
///   closes itself through the controller; an action item's `onPressed` comes first (SPB-16).
/// * [label] is the leading half's text and accessible name, [menuSemanticLabel] the trailing
///   half's name ("More save options"); [icon] an optional glyph before the label.
///
/// Every design value comes from the `TanreiSplitButtonTokens` of the active design system
/// (`TanreiTheme.of(context).system.splitButton`). Each half resolves its **own** interaction
/// state and draws its container, label or chevron, outline, elevation and opacity from its
/// variant's tokens of that state (SPB-4). The leading half's start corners and the trailing half's
/// end corners are `container.shape` (the state's); where the halves meet, `container.inner-shape`
/// — and while open, the trailing half's inner corners ease to `container.inner-shape-open` and its
/// chevron turns half a turn over the open motion (SPB-13).
///
/// Presses, keyboard focus (a ring around the focused half's own shape), the press-hold,
/// `pressedFeedback`, `focusStyle` and corner smoothing behave as `TanreiButton`'s (SPB-5…11).
/// Each half's hit area reaches the touch target: above and below, outward past the split
/// button's start or end, and toward the other half no further than the middle of the gap (SPB-6).
///
/// [variant] and [size] are open keys; a value the active system does not have renders
/// as the default (`filled`, `medium`) and is reported in debug builds (SPB-8).
class TanreiSplitButton extends StatefulWidget {
  /// Creates a split button. Pass a null [onPressed] to disable it.
  const TanreiSplitButton({
    super.key,
    required this.label,
    this.icon,
    required this.menuSemanticLabel,
    required this.onPressed,
    this.menuController,
    required this.menuChildren,
    this.onMenuToggle,
    this.onMenuClose,
    this.variant = TanreiSplitButtonVariant.filled,
    this.size = TanreiSplitButtonSize.medium,
    this.focusNode,
    this.autofocus = false,
  });

  /// The leading half's text and accessible name ("Save").
  final String label;

  /// An optional glyph before the label, drawn through the icon helper.
  final Widget? icon;

  /// The trailing half's accessible name ("More save options"): the chevron alone is not a name.
  final String menuSemanticLabel;

  /// Called once per activation of the leading half. Null disables the split button.
  final VoidCallback? onPressed;

  /// Opens and closes the menu (the spec's `open`); an internal one when null.
  final TanreiMenuController? menuController;

  /// The menu's items.
  final List<Widget> menuChildren;

  /// Called with the open value the trailing half asks for, before the menu opens or closes.
  final ValueChanged<bool>? onMenuToggle;

  /// Called once with the menu's reason when the menu asks to be closed.
  final ValueChanged<TanreiMenuCloseReason>? onMenuClose;

  /// Emphasis, as Button's variants of the same names.
  final TanreiSplitButtonVariant variant;

  /// Visual height (32 / 36 / 40 in the default system). The hit area always meets the minimum
  /// target.
  final TanreiSplitButtonSize size;

  /// An optional focus node for the leading half.
  final FocusNode? focusNode;

  /// Whether to focus the leading half when nothing else is focused.
  final bool autofocus;

  /// Whether the split button reacts to input.
  bool get enabled => onPressed != null;

  @override
  State<TanreiSplitButton> createState() => _TanreiSplitButtonState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('label', label))
      ..add(StringProperty('menuSemanticLabel', menuSemanticLabel))
      ..add(StringProperty('variant', variant.name, quoted: false))
      ..add(StringProperty('size', size.name, quoted: false))
      ..add(FlagProperty('enabled', value: enabled, ifFalse: 'disabled'));
  }
}

class _TanreiSplitButtonState extends State<TanreiSplitButton>
    with SingleTickerProviderStateMixin<TanreiSplitButton> {
  TanreiMenuController? _ownController;
  final FocusNode _trailingNode = FocusNode(debugLabel: 'TanreiSplitButton trailing');
  final GlobalKey _rowKey = GlobalKey(debugLabel: 'TanreiSplitButton row');
  final _SplitLink _link = _SplitLink();

  /// Runs 0 → 1 while the trailing half takes its open form (SPB-13).
  late final AnimationController _open = AnimationController(vsync: this);

  bool _reportedLabel = false;
  bool _reportedMenuLabel = false;
  bool _reportedEmptyMenu = false;

  TanreiMenuController get _controller =>
      widget.menuController ?? (_ownController ??= TanreiMenuController());

  /// Whether a menu can be presented: enabled, with items (SPB-3, SPB-20).
  bool get _presents => widget.enabled && widget.menuChildren.isNotEmpty;

  /// Whether the trailing half draws its open form (SPB-13): open and enabled.
  bool get _drawnOpen => widget.enabled && _controller.isOpen;

  bool get _reduceMotion => MediaQuery.maybeDisableAnimationsOf(context) ?? false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_handleController);
    _open.value = _controller.isOpen && widget.enabled ? _open.upperBound : _open.lowerBound;
    _open.addListener(_rebuild);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _open.duration = tanreiDuration(TanreiTheme.of(context).system.splitButton.motionOpenDuration);
  }

  @override
  void didUpdateWidget(TanreiSplitButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    final TanreiMenuController old = oldWidget.menuController ?? _ownController!;
    if (!identical(old, _controller)) {
      old.removeListener(_handleController);
      _controller.addListener(_handleController);
    }
    _handleController();
  }

  @override
  void dispose() {
    _controller.removeListener(_handleController);
    _ownController?.dispose();
    _open.dispose();
    _trailingNode.dispose();
    super.dispose();
  }

  void _rebuild() => setState(() {});

  // SPB-13: the open form eases in and out over the open motion; at once where motion is reduced.
  void _handleController() {
    if (!mounted) {
      return;
    }
    final bool open = _drawnOpen;
    final double target = open ? _open.upperBound : _open.lowerBound;
    if (_open.value == target && !_open.isAnimating) {
      setState(() {});
      return;
    }
    if (_reduceMotion) {
      _open.value = target;
    } else if (open) {
      _open.forward();
    } else {
      _open.reverse();
    }
    setState(() {});
  }

  // SPB-2: toggle with the opposite of open, then open or close through the controller.
  void _toggle() {
    if (!widget.enabled) {
      return;
    }
    final bool open = !_controller.isOpen;
    widget.onMenuToggle?.call(open);
    if (open) {
      _controller.open();
    } else {
      _controller.close();
    }
  }

  // SPB-2: Down Arrow on the trailing half opens a closed menu.
  void _openFromKeyboard() {
    if (widget.enabled && !_controller.isOpen) {
      _toggle();
    }
  }

  // SPB-16: the menu's reason, once; the menu then closes itself through the controller.
  void _handleClose(TanreiMenuCloseReason reason) {
    if (widget.enabled) {
      widget.onMenuClose?.call(reason);
    }
  }

  /// SPB-20: an empty label or menu label, and an empty menu, each reported once when it becomes
  /// so.
  void _debugReport() {
    assert(() {
      final bool label = !tanreiIsAccessibleName(widget.label);
      if (label && !_reportedLabel) {
        debugTanreiReportMissingName('split button', widget);
      }
      _reportedLabel = label;
      final bool menuLabel = !tanreiIsAccessibleName(widget.menuSemanticLabel);
      if (menuLabel && !_reportedMenuLabel) {
        debugTanreiReportMissingName('split button menu', widget);
      }
      _reportedMenuLabel = menuLabel;
      final bool empty = widget.menuChildren.isEmpty;
      if (empty && !_reportedEmptyMenu) {
        debugTanreiReportIgnoredValue(
          'split-button',
          'menuChildren',
          'The menu has no items: the trailing half still toggles and draws its open form, but no '
              'menu is presented.',
          widget,
        );
      }
      _reportedEmptyMenu = empty;
      return true;
    }());
  }

  @override
  Widget build(BuildContext context) {
    _debugReport();
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiSplitButtonTokens tokens = theme.system.splitButton;
    final bool enabled = widget.enabled;
    final double open = tokens.motionOpenEasing.toCurve().transform(_open.value);

    Widget row = _SplitRow(
      key: _rowKey,
      link: _link,
      gap: tokens.containerInnerGap,
      textDirection: Directionality.of(context),
      children: <Widget>[
        _SplitSlot(
          child: _SplitHalf(
            leading: true,
            variant: widget.variant,
            size: widget.size,
            onPressed: widget.onPressed,
            focusNode: widget.focusNode,
            autofocus: widget.autofocus,
            innerRadius: tokens.containerInnerShape,
            semanticLabel: widget.label,
            icon: widget.icon,
            label: widget.label,
          ),
        ),
        _SplitSlot(
          child: CallbackShortcuts(
            bindings: <ShortcutActivator, VoidCallback>{
              const SingleActivator(LogicalKeyboardKey.arrowDown): _openFromKeyboard,
            },
            child: _SplitHalf(
              leading: false,
              variant: widget.variant,
              size: widget.size,
              onPressed: enabled ? _toggle : null,
              focusNode: _trailingNode,
              innerRadius: tokens.containerInnerShape,
              innerRadiusOpen: tokens.containerInnerShapeOpen,
              open: open,
              expanded: enabled ? _controller.isOpen : null,
              semanticLabel: widget.menuSemanticLabel,
            ),
          ),
        ),
      ],
    );

    // SPB-15: the menu, anchored to the whole split button, focus returning to the trailing half.
    // Its semantics are the trailing half's own (SPB-17): no node around the two halves.
    if (_presents) {
      final Widget anchor = TanreiMenuAnchor(
        controller: _controller,
        placement: TanreiMenuPlacement.bottomEnd,
        onClose: _handleClose,
        childFocusNode: _trailingNode,
        menuChildren: widget.menuChildren,
        child: row,
      );
      row = TanreiMenuAnchorOwnSemantics(anchor: anchor);
    }
    // SPB-6: the halves' hit areas, around the drawn split button (which the menu is anchored to).
    return _SplitTarget(
      link: _link,
      target: theme.system.measure.targetTouch,
      textDirection: Directionality.of(context),
      child: row,
    );
  }
}

/// One half of a split button: a pressable with its own state (SPB-4), drawn from the variant's
/// tokens of that state.
class _SplitHalf extends StatefulWidget {
  const _SplitHalf({
    required this.leading,
    required this.variant,
    required this.size,
    required this.onPressed,
    required this.focusNode,
    this.autofocus = false,
    required this.innerRadius,
    this.innerRadiusOpen,
    this.open = 0,
    this.expanded,
    this.icon,
    this.label,
    required this.semanticLabel,
  });

  final bool leading;
  final TanreiSplitButtonVariant variant;
  final TanreiSplitButtonSize size;
  final VoidCallback? onPressed;
  final FocusNode? focusNode;
  final bool autofocus;
  final double innerRadius;
  final double? innerRadiusOpen;

  /// How far the trailing half is in its open form, 0–1 (the eased open motion).
  final double open;
  final bool? expanded;

  /// The leading half's icon slot.
  final Widget? icon;

  /// The leading half's label; null for the trailing half, which draws the chevron.
  final String? label;
  final String semanticLabel;

  @override
  State<_SplitHalf> createState() => _SplitHalfState();
}

class _SplitHalfState extends State<_SplitHalf>
    with
        TickerProviderStateMixin<_SplitHalf>,
        TanreiPressableStateMixin<_SplitHalf, TanreiControlVisuals> {
  TanreiSplitButtonTokens get _tokens => TanreiTheme.of(context).system.splitButton;

  @override
  VoidCallback? get onPressed => widget.onPressed;

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  // SPB-10: a ripple grows over the component's feedback duration.
  @override
  Duration get rippleDuration => tanreiDuration(_tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => _tokens.motionStateEasing.toCurve();

  @override
  TanreiControlVisuals lerpVisuals(TanreiControlVisuals a, TanreiControlVisuals b, double t) =>
      TanreiControlVisuals.lerp(a, b, t);

  /// The half's size in the last frame, which limits the corners that ease between two radii (a
  /// radius beyond half the shorter side draws as that half).
  Size? get _lastSize {
    final RenderObject? box = pressContainerKey.currentContext?.findRenderObject();
    return box is RenderBox && box.hasSize ? box.size : null;
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiSplitButtonTokens tokens = theme.system.splitButton;
    // Total lookups: a size or variant the system does not have resolves to the default's tokens
    // and is reported in debug builds (SPB-8).
    final TanreiSplitButtonSizeTokens size = tokens.sizes[widget.size];
    final TanreiSplitButtonVariantTokens variant = tokens.variants[widget.variant];

    // SPB-4, SPB-7, SPB-10: this half's own state.
    final TanreiSplitButtonVariantStateTokens drawn = variant.of(drawnState);
    final TanreiSplitButtonStateTokens? state = tokens.stateTokens(drawnState);
    final TanreiControlVisuals visuals = animateVisuals(
      TanreiControlVisuals.resolve(
        theme,
        containerColor: variant.of(containerState).containerColor,
        labelColor: drawn.labelColor,
        outlineColor: drawn.outlineColor,
        elevation: drawn.containerElevation,
        opacity: state?.opacity,
        shape: state?.containerShape ?? tokens.containerShape,
      ),
    );

    // SPB-13: the outer corners are the state's shape; where the halves meet, the inner shape —
    // and, for the trailing half, the open inner shape as far as it is open.
    final Size? last = _lastSize;
    final double limit = last == null ? double.infinity : last.shortestSide / 2;
    final double inner = widget.innerRadiusOpen == null
        ? widget.innerRadius
        : math.max(
            0,
            lerpDouble(
              math.min(widget.innerRadius, limit),
              math.min(widget.innerRadiusOpen!, limit),
              widget.open,
            )!,
          );
    final TanreiCornerShape shape = TanreiCornerShape.only(
      smoothing: theme.system.shape.cornerSmoothing,
      corners: TanreiCornerRadii.directional(
        start: widget.leading ? visuals.shape : inner,
        end: widget.leading ? inner : visuals.shape,
        textDirection: Directionality.of(context),
      ),
    );

    // SPB-12: the leading half's paddings, or the trailing half's around the chevron.
    final EdgeInsetsDirectional padding = widget.leading
        ? EdgeInsetsDirectional.only(
            start: widget.icon != null
                ? size.leadingPaddingInlineStartWithIcon
                : size.leadingPaddingInlineStart,
            end: size.leadingPaddingInlineEnd,
            top: size.containerPaddingBlock,
            bottom: size.containerPaddingBlock,
          )
        : EdgeInsetsDirectional.symmetric(
            horizontal: size.trailingPaddingInline,
            vertical: size.containerPaddingBlock,
          );

    final Widget container = TanreiControlContainer(
      key: pressContainerKey,
      visuals: visuals,
      shape: shape,
      outlineWidth: size.outlineWidth,
      // SPB-10: from the point of contact, or the center for a press in the added target space.
      ripple: _rippleInside(
        rippleFor(
          pressedContainer: () => theme.paint(variant.of(interactionState).containerColor),
          container: visuals.container,
        ),
      ),
      child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: size.containerHeight),
        child: Padding(
          padding: padding,
          child: Center(widthFactor: 1, heightFactor: 1, child: _content(size, visuals.label)),
        ),
      ),
    );

    // SPB-17: a button named by its label; the trailing half also says whether its menu is open.
    // The node is the half's slot in the row (`_SplitSlot`), whose bounds are its hit area.
    return Semantics(
      button: true,
      enabled: isEnabled,
      expanded: widget.expanded,
      label: tanreiIsAccessibleName(widget.semanticLabel) ? widget.semanticLabel : null,
      child: buildPressable(
        focusNode: widget.focusNode,
        autofocus: widget.autofocus,
        child: Opacity(
          opacity: visuals.opacity,
          child: TanreiFocusRing(
            visible: isKeyboardFocused,
            borderRadius: shape.borderRadius,
            child: container,
          ),
        ),
      ),
    );
  }

  /// SPB-14: the icon and the label (leading), or the chevron (trailing), in this half's label
  /// color, the glyphs through the icon helper with the family and fill of an unselected icon.
  Widget _content(TanreiSplitButtonSizeTokens size, Color color) {
    Widget glyph(Widget slot) =>
        TanreiControlIcon(icon: slot, size: size.iconSize, selected: false, color: color);
    final String? label = widget.label;
    if (label == null) {
      // SPB-13, SPB-19: the chevron turns half a turn while open; it is not mirrored.
      return Transform.rotate(
        angle: math.pi * widget.open,
        child: glyph(const Text(tanreiArrowDownGlyph)),
      );
    }
    // SPB-14: one line while it fits, wrapping when the layout gives less width; never truncated.
    return TanreiControlContent(
      icon: widget.icon == null ? null : glyph(widget.icon!),
      label: Text(label, softWrap: true),
      gap: size.containerGap,
      iconSize: size.iconSize,
      labelTypescale: size.labelTypescale,
      color: color,
      excludeLabelSemantics: true,
    );
  }

  TanreiRipple? _rippleInside(TanreiRipple? ripple) {
    final Size? last = _lastSize;
    return ripple == null || last == null ? ripple : tanreiRippleInside(ripple, last);
  }
}

/// Where the row tells the target around it how wide each half is, and the target tells the row
/// how far each half's hit area reaches beyond it (SPB-6).
class _SplitLink {
  double leadingWidth = 0;
  double trailingWidth = 0;
  double gap = 0;
  _RenderSplitRow? row;
}

/// One half's place in the row: its accessibility node, whose bounds the row extends to the half's
/// hit area (SPB-6, SPB-17).
class _SplitSlot extends SingleChildRenderObjectWidget {
  const _SplitSlot({required Widget super.child});

  @override
  RenderObject createRenderObject(BuildContext context) => _RenderSplitSlot();
}

class _RenderSplitSlot extends RenderProxyBox {
  EdgeInsets _reach = EdgeInsets.zero;

  void reach(EdgeInsets value) {
    if (value != _reach) {
      _reach = value;
      markNeedsSemanticsUpdate();
    }
  }

  @override
  Rect get semanticBounds => _reach.inflateRect(Offset.zero & size);

  @override
  void describeSemanticsConfiguration(SemanticsConfiguration config) {
    super.describeSemanticsConfiguration(config);
    config.isSemanticBoundary = true;
  }
}

/// The two halves in one row, [gap] apart, as tall as the taller (SPB-12, SPB-19). The leading
/// half narrows (its label wraps) when the row is given less than its width.
class _SplitRow extends MultiChildRenderObjectWidget {
  const _SplitRow({
    super.key,
    required this.link,
    required this.gap,
    required this.textDirection,
    required super.children,
  });

  final _SplitLink link;
  final double gap;
  final TextDirection textDirection;

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderSplitRow(link: link, gap: gap, textDirection: textDirection);

  @override
  void updateRenderObject(BuildContext context, _RenderSplitRow renderObject) {
    renderObject
      ..link = link
      ..gap = gap
      ..textDirection = textDirection;
  }
}

class _SplitParentData extends ContainerBoxParentData<RenderBox> {}

class _RenderSplitRow extends RenderBox
    with
        ContainerRenderObjectMixin<RenderBox, _SplitParentData>,
        RenderBoxContainerDefaultsMixin<RenderBox, _SplitParentData> {
  _RenderSplitRow({
    required _SplitLink link,
    required double gap,
    required TextDirection textDirection,
  }) : _link = link,
       _gap = gap,
       _textDirection = textDirection;

  _SplitLink _link;
  set link(_SplitLink value) {
    if (!identical(value, _link)) {
      _link = value;
      markNeedsLayout();
    }
  }

  double _gap;
  set gap(double value) {
    if (value != _gap) {
      _gap = value;
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
  void attach(PipelineOwner owner) {
    super.attach(owner);
    _link.row = this;
  }

  @override
  void detach() {
    if (identical(_link.row, this)) {
      _link.row = null;
    }
    super.detach();
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _SplitParentData) {
      child.parentData = _SplitParentData();
    }
  }

  RenderBox? get _leading => firstChild;
  RenderBox? get _trailing => lastChild == firstChild ? null : lastChild;

  @override
  double computeMinIntrinsicWidth(double height) =>
      (_leading?.getMinIntrinsicWidth(height) ?? 0) +
      _gap +
      (_trailing?.getMaxIntrinsicWidth(height) ?? 0);

  @override
  double computeMaxIntrinsicWidth(double height) =>
      (_leading?.getMaxIntrinsicWidth(height) ?? 0) +
      _gap +
      (_trailing?.getMaxIntrinsicWidth(height) ?? 0);

  @override
  double computeMinIntrinsicHeight(double width) => math.max(
    _leading?.getMinIntrinsicHeight(double.infinity) ?? 0,
    _trailing?.getMinIntrinsicHeight(double.infinity) ?? 0,
  );

  @override
  double computeMaxIntrinsicHeight(double width) => math.max(
    _leading?.getMaxIntrinsicHeight(double.infinity) ?? 0,
    _trailing?.getMaxIntrinsicHeight(double.infinity) ?? 0,
  );

  ({double leading, double trailing}) _widths(BoxConstraints constraints) {
    final double trailing = _trailing?.getMaxIntrinsicWidth(double.infinity) ?? 0;
    final double natural = _leading?.getMaxIntrinsicWidth(double.infinity) ?? 0;
    final double room = constraints.maxWidth - _gap - trailing;
    return (leading: math.max(0, math.min(natural, room)), trailing: trailing);
  }

  @override
  Size computeDryLayout(BoxConstraints constraints) {
    final ({double leading, double trailing}) w = _widths(constraints);
    final double height = math.max(
      _leading?.getDryLayout(BoxConstraints.tightFor(width: w.leading)).height ?? 0,
      _trailing?.getDryLayout(BoxConstraints.tightFor(width: w.trailing)).height ?? 0,
    );
    return constraints.constrain(Size(w.leading + _gap + w.trailing, height));
  }

  @override
  void performLayout() {
    final ({double leading, double trailing}) w = _widths(constraints);
    final RenderBox? leading = _leading;
    final RenderBox? trailing = _trailing;
    leading?.layout(BoxConstraints.tightFor(width: w.leading), parentUsesSize: true);
    trailing?.layout(BoxConstraints.tightFor(width: w.trailing), parentUsesSize: true);
    // SPB-12: the trailing half as tall as the leading half (and both as tall as the taller).
    final double height = math.max(leading?.size.height ?? 0, trailing?.size.height ?? 0);
    if (leading != null && leading.size.height != height) {
      leading.layout(BoxConstraints.tight(Size(w.leading, height)), parentUsesSize: true);
    }
    if (trailing != null && trailing.size.height != height) {
      trailing.layout(BoxConstraints.tight(Size(w.trailing, height)), parentUsesSize: true);
    }
    size = constraints.constrain(Size(w.leading + _gap + w.trailing, height));
    // SPB-19: the trailing half on the left in a right-to-left layout.
    final bool rtl = _textDirection == TextDirection.rtl;
    if (leading != null) {
      (leading.parentData! as _SplitParentData).offset = Offset(
        rtl ? size.width - w.leading : 0,
        0,
      );
    }
    if (trailing != null) {
      (trailing.parentData! as _SplitParentData).offset = Offset(rtl ? 0 : w.leading + _gap, 0);
    }
    _link
      ..leadingWidth = w.leading
      ..trailingWidth = w.trailing
      ..gap = _gap;
  }

  /// SPB-6: how far each half's hit area reaches beyond it, by logical side: set by the target
  /// around the row after its layout.
  void reach({
    required double above,
    required double below,
    required double start,
    required double end,
  }) {
    final bool rtl = _textDirection == TextDirection.rtl;
    final double half = _gap / 2;
    EdgeInsets sides({required double startSide, required double endSide}) =>
        EdgeInsets.fromLTRB(rtl ? endSide : startSide, above, rtl ? startSide : endSide, below);
    final RenderBox? leading = _leading;
    final RenderBox? trailing = _trailing;
    if (leading is _RenderSplitSlot) {
      leading.reach(sides(startSide: start, endSide: half));
    }
    if (trailing is _RenderSplitSlot) {
      trailing.reach(sides(startSide: half, endSide: end));
    }
  }

  @override
  void paint(PaintingContext context, Offset offset) => defaultPaint(context, offset);

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) {
    if (defaultHitTestChildren(result, position: position)) {
      return true;
    }
    // SPB-6: a press in the gap goes to the half on its side of the gap's middle.
    final RenderBox? leading = _leading;
    final RenderBox? trailing = _trailing;
    if (leading == null) {
      return false;
    }
    final Offset leadingAt = (leading.parentData! as _SplitParentData).offset;
    final double middle = _textDirection == TextDirection.rtl
        ? leadingAt.dx - _gap / 2
        : leadingAt.dx + leading.size.width + _gap / 2;
    final bool onLeading = _textDirection == TextDirection.rtl
        ? position.dx >= middle
        : position.dx < middle;
    final RenderBox child = onLeading || trailing == null ? leading : trailing;
    final Offset origin = (child.parentData! as _SplitParentData).offset;
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

/// Grows the split button's layout to the halves' hit areas (SPB-6): at least the touch target
/// tall, and — where a half is narrower than the target — outward past the split button's start or
/// end edge. A press in the added space goes to the drawn split button at the nearest point, where
/// the row gives it to the half on that side.
class _SplitTarget extends SingleChildRenderObjectWidget {
  const _SplitTarget({
    required this.link,
    required this.target,
    required this.textDirection,
    required Widget super.child,
  });

  final _SplitLink link;
  final double target;
  final TextDirection textDirection;

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderSplitTarget(link: link, target: target, textDirection: textDirection);

  @override
  void updateRenderObject(BuildContext context, _RenderSplitTarget renderObject) {
    renderObject
      ..link = link
      ..target = target
      ..textDirection = textDirection;
  }
}

class _RenderSplitTarget extends RenderShiftedBox {
  _RenderSplitTarget({
    required this.link,
    required double target,
    required TextDirection textDirection,
  }) : _target = target,
       _textDirection = textDirection,
       super(null);

  _SplitLink link;

  double _target;
  set target(double value) {
    if (value != _target) {
      _target = value;
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

  /// How far the hit areas reach beyond the drawn split button, by logical side.
  ({double start, double end}) _outward() => (
    start: math.max(0, _target - link.leadingWidth - link.gap / 2),
    end: math.max(0, _target - link.trailingWidth - link.gap / 2),
  );

  @override
  double computeMinIntrinsicWidth(double height) =>
      (child?.getMinIntrinsicWidth(height) ?? 0) + _outward().start + _outward().end;

  @override
  double computeMaxIntrinsicWidth(double height) =>
      (child?.getMaxIntrinsicWidth(height) ?? 0) + _outward().start + _outward().end;

  @override
  double computeMinIntrinsicHeight(double width) =>
      math.max(child?.getMinIntrinsicHeight(width) ?? 0, _target);

  @override
  double computeMaxIntrinsicHeight(double width) =>
      math.max(child?.getMaxIntrinsicHeight(width) ?? 0, _target);

  @override
  Size computeDryLayout(BoxConstraints constraints) {
    // The reach of the last layout: a dry layout cannot lay the row out to learn it.
    final ({double start, double end}) out = _outward();
    final Size inner = child?.getDryLayout(constraints.loosen()) ?? Size.zero;
    return constraints.constrain(
      Size(inner.width + out.start + out.end, math.max(inner.height, _target)),
    );
  }

  @override
  void performLayout() {
    final RenderBox? child = this.child;
    if (child == null) {
      size = constraints.constrain(Size(_target, _target));
      return;
    }
    // A first pass tells the row's widths; the outward reach comes from them.
    child.layout(constraints.loosen(), parentUsesSize: true);
    ({double start, double end}) out = _outward();
    final double maxWidth = constraints.maxWidth - out.start - out.end;
    if (maxWidth.isFinite && child.size.width > maxWidth) {
      child.layout(
        constraints.loosen().copyWith(maxWidth: math.max(0, maxWidth)),
        parentUsesSize: true,
      );
      out = _outward();
    }
    size = constraints.constrain(
      Size(child.size.width + out.start + out.end, math.max(child.size.height, _target)),
    );
    final double left = _textDirection == TextDirection.rtl ? out.end : out.start;
    final double top = (size.height - child.size.height) / 2;
    (child.parentData! as BoxParentData).offset = Offset(left, top);
    link.row?.reach(above: top, below: top, start: out.start, end: out.end);
  }

  @override
  bool hitTest(BoxHitTestResult result, {required Offset position}) {
    if (!size.contains(position)) {
      return false;
    }
    if (hitTestChildren(result, position: position)) {
      result.add(BoxHitTestEntry(this, position));
      return true;
    }
    final RenderBox? child = this.child;
    if (child == null) {
      return false;
    }
    // SPB-6: the nearest point of the drawn split button.
    final Offset origin = (child.parentData! as BoxParentData).offset;
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
