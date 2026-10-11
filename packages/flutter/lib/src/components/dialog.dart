import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' show SemanticsRole, lerpDouble;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/container_decoration.dart';
import '../primitives/control_icon.dart';
import '../primitives/corner_shape.dart';
import '../primitives/elevation.dart';
import '../primitives/modal_overlays.dart';
import '../theme/motion.dart';
import '../theme/text_style.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';
import 'tooltip.dart' show tanreiTooltipTookKey;

/// Presents a [TanreiDialog] (what [builder] returns) as a modal route over everything in the
/// navigator — the spec's `open` — and completes with the value the dialog's route is popped with.
///
/// Implements the presentation half of `specs/dialog.spec.json` with the idiom of Flutter's
/// `showDialog`:
///
/// * the route draws the scrim, `comp.dialog.scrim.color`, over the whole navigator behind the
///   dialog, and makes everything behind it inert: its barrier takes every press and wheel, it hides
///   what is behind from assistive technology, and it keeps Tab inside the dialog (DLG-1, DLG-3);
/// * [barrierDismissible] is the spec's `dismissible`: while true, Escape, the platform's back and a
///   press on the scrim pop the route with null — the spec's `dismiss` (DLG-5); while false they do
///   nothing. An action closes the dialog with `Navigator.pop(context, value)`; nothing closes it by
///   itself (DLG-6);
/// * focus moves in when it opens — to the widget marked `autofocus: true`, else to the dialog's
///   container (DLG-2) — and back to where it was when it closes (DLG-4), at the start of the
///   motion; a dialog opened from a dialog stacks above it with its own scrim (DLG-15);
/// * it fades the scrim and the dialog in, growing the dialog from `motion.enter-scale`, and fades
///   both out (DLG-13): with animations disabled it fades without growing, and on Android, whose
///   setting removes every animation, it opens and closes at once.
///
/// While it is shown the route counts as a Tanrei modal overlay (`TanreiModalOverlays`): a snackbar
/// host pauses and holds back its queue.
Future<T?> showTanreiDialog<T>({
  required BuildContext context,
  required WidgetBuilder builder,
  bool barrierDismissible = true,
  String? barrierLabel,
  bool useRootNavigator = true,
  RouteSettings? routeSettings,
}) {
  final NavigatorState navigator = Navigator.of(context, rootNavigator: useRootNavigator);
  final bool disable = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
  final TanreiDialogTokens tokens = TanreiTheme.of(context).system.dialog;
  final bool atOnce = disable && defaultTargetPlatform == TargetPlatform.android;
  return navigator.push<T>(
    _TanreiDialogRoute<T>(
      builder: builder,
      dismissible: barrierDismissible,
      label: barrierLabel,
      settings: routeSettings,
      enter: atOnce ? Duration.zero : tanreiDuration(tokens.motionEnterDuration),
      exit: atOnce ? Duration.zero : tanreiDuration(tokens.motionExitDuration),
      grows: !disable,
    ),
  );
}

class _TanreiDialogRoute<T> extends PopupRoute<T> {
  _TanreiDialogRoute({
    required this.builder,
    required this.dismissible,
    required this.label,
    required this.enter,
    required this.exit,
    required this.grows,
    super.settings,
  });

  final WidgetBuilder builder;
  final bool dismissible;
  final String? label;
  final Duration enter;
  final Duration exit;

  /// Whether the dialog grows as it enters (false where motion is reduced: DLG-13).
  final bool grows;

  bool _counted = false;

  @override
  bool get barrierDismissible => dismissible;

  // The scrim is drawn with the dialog's own motion (buildTransitions); the barrier only takes the
  // presses behind the dialog.
  @override
  Color? get barrierColor => null;

  @override
  String? get barrierLabel => label;

  @override
  Duration get transitionDuration => enter;

  @override
  Duration get reverseTransitionDuration => exit;

  // DLG-5: the platform's back does nothing while the dialog is not dismissible.
  @override
  RoutePopDisposition get popDisposition =>
      dismissible ? super.popDisposition : RoutePopDisposition.doNotPop;

  @override
  void install() {
    super.install();
    _counted = true;
    TanreiModalOverlays.instance.add();
  }

  void _uncount() {
    if (_counted) {
      _counted = false;
      TanreiModalOverlays.instance.remove();
    }
  }

  @override
  bool didPop(T? result) {
    _uncount();
    return super.didPop(result);
  }

  @override
  void dispose() {
    _uncount();
    super.dispose();
  }

  @override
  Widget buildPage(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
  ) => Builder(builder: builder);

  @override
  Widget buildTransitions(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiDialogTokens tokens = theme.system.dialog;
    return _DialogTransition(
      animation: animation,
      enter: tokens.motionEnterEasing.toCurve(),
      exit: tokens.motionExitEasing.toCurve(),
      enterScale: grows ? tokens.motionEnterScale : 1,
      scrim: theme.paint(tokens.scrimColor),
      child: child,
    );
  }
}

/// DLG-1, DLG-13: the scrim over the whole route and the dialog above it, faded in (the dialog
/// growing about its centre) and out, with the enter and exit easings.
class _DialogTransition extends StatefulWidget {
  const _DialogTransition({
    required this.animation,
    required this.enter,
    required this.exit,
    required this.enterScale,
    required this.scrim,
    required this.child,
  });

  final Animation<double> animation;
  final Curve enter;
  final Curve exit;
  final double enterScale;
  final Color scrim;
  final Widget child;

  @override
  State<_DialogTransition> createState() => _DialogTransitionState();
}

class _DialogTransitionState extends State<_DialogTransition> {
  late final CurvedAnimation _curve = CurvedAnimation(
    parent: widget.animation,
    curve: widget.enter,
    // The close runs the parent from 1 to 0: flipped, the exit easing eases the close's own
    // progress.
    reverseCurve: widget.exit.flipped,
  );

  @override
  void dispose() {
    _curve.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Stack(
    fit: StackFit.expand,
    children: <Widget>[
      // The scrim takes no press itself: the barrier under it does (DLG-5).
      IgnorePointer(
        child: FadeTransition(
          opacity: _curve,
          child: ColoredBox(color: widget.scrim),
        ),
      ),
      AnimatedBuilder(
        animation: _curve,
        builder: (BuildContext context, Widget? child) {
          // It grows only while it opens; it closes by fading alone.
          final bool closing = widget.animation.status == AnimationStatus.reverse;
          final double scale = closing
              ? 1
              : lerpDouble(widget.enterScale, 1, _curve.value.clamp(0, 1))!;
          return Opacity(
            opacity: _curve.value.clamp(0, 1),
            child: Transform.scale(scale: scale, child: child),
          );
        },
        child: widget.child,
      ),
    ],
  );
}

/// Stops a person for a decision or a few details that the task cannot go on without, in a surface
/// that dims and blocks everything behind it until it is answered or dismissed.
///
/// Implements the surface of `specs/dialog.spec.json` with the idiom of Flutter's `AlertDialog`;
/// present it with [showTanreiDialog] from its `builder`:
///
/// * [headline] names the dialog and [supportingText] describes it (DLG-14); [alert] makes it an
///   alert dialog, whose headline and supporting text are announced when it opens;
/// * [icon] is a glyph above the headline — with one, the icon and the headline are centred (DLG-9);
/// * [child] is the custom content below the supporting text, drawn in `content.color` (DLG-8);
/// * [actions] are Tanrei Buttons, confirming action last, laid out in a row at the end — or a
///   column when they do not fit — and never restyled (DLG-10).
///
/// It centres its container in the safe area, `container.margin` from every edge and the keyboard,
/// as wide as its content between the width tokens (DLG-7). When its parts do not fit the height it
/// scrolls the supporting text and the content between the headline and the actions, with a divider
/// on each side while something is scrolled out of view there (DLG-11) — or scrolls everything
/// together when the headline and the actions alone leave no room (DLG-12).
class TanreiDialog extends StatefulWidget {
  /// Creates a dialog surface.
  const TanreiDialog({
    super.key,
    required this.headline,
    this.supportingText = '',
    this.alert = false,
    this.icon,
    this.actions = const <Widget>[],
    this.child,
  });

  /// The question or statement: the dialog's accessible name. Required.
  final String headline;

  /// What will happen, or what the person needs to know: the accessible description.
  final String supportingText;

  /// Whether the dialog interrupts with something urgent: an alert dialog, announced on opening.
  final bool alert;

  /// A glyph above the headline.
  final Widget? icon;

  /// The Tanrei Buttons that answer the dialog, confirming action last.
  final List<Widget> actions;

  /// The custom content, below the supporting text.
  final Widget? child;

  @override
  State<TanreiDialog> createState() => _TanreiDialogState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('headline', headline))
      ..add(StringProperty('supportingText', supportingText, defaultValue: ''))
      ..add(FlagProperty('alert', value: alert, ifTrue: 'alert'));
  }
}

class _TanreiDialogState extends State<TanreiDialog> {
  final FocusNode _container = FocusNode(debugLabel: 'TanreiDialog', skipTraversal: true);
  final ScrollController _scroll = ScrollController();

  /// DLG-12: everything scrolls together.
  bool _whole = false;
  Size? _window;
  double? _textScale;

  @override
  void initState() {
    super.initState();
    _debugReportMissingName(null);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      // DLG-2: without an element marked for initial focus, the container takes it. Checked after
      // the focus manager applied this frame's autofocus (a microtask after the frame).
      scheduleMicrotask(() {
        final FocusNode? focused = FocusManager.instance.primaryFocus;
        if (mounted && (focused == null || !_isInside(focused))) {
          _container.requestFocus();
        }
      });
      // DLG-14: an alert dialog is read at once.
      if (widget.alert) {
        SemanticsService.announce(
          <String>[
            widget.headline,
            widget.supportingText,
          ].where((String s) => s.isNotEmpty).join('\n'),
          Directionality.maybeOf(context) ?? TextDirection.ltr,
          assertiveness: Assertiveness.assertive,
        );
      }
    });
  }

  /// Whether [node] is in this dialog (an element the product marked with `autofocus`).
  bool _isInside(FocusNode node) {
    final BuildContext? nodeContext = node.context;
    return nodeContext != null &&
        identical(nodeContext.findAncestorStateOfType<_TanreiDialogState>(), this);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // DLG-12: a new window size or text size is measured again from the usual layout.
    final Size? window = MediaQuery.maybeSizeOf(context);
    final double scale = MediaQuery.maybeTextScalerOf(context)?.scale(1) ?? 1;
    if (window != _window || scale != _textScale) {
      _window = window;
      _textScale = scale;
      _whole = false;
    }
  }

  @override
  void didUpdateWidget(TanreiDialog oldWidget) {
    super.didUpdateWidget(oldWidget);
    _debugReportMissingName(oldWidget);
  }

  @override
  void dispose() {
    _container.dispose();
    _scroll.dispose();
    super.dispose();
  }

  /// DLG-14: an empty headline is reported — when first built so, and when it loses the one it had.
  void _debugReportMissingName(TanreiDialog? oldWidget) {
    assert(() {
      if ((oldWidget == null || tanreiIsAccessibleName(oldWidget.headline)) &&
          !tanreiIsAccessibleName(widget.headline)) {
        debugTanreiReportMissingName('dialog', widget);
      }
      return true;
    }());
  }

  void _handleNeedsWhole(bool whole) {
    if (mounted && whole != _whole) {
      setState(() => _whole = whole);
    }
  }

  // The Escape a tooltip took closes only the tooltip (TIP-4).
  KeyEventResult _handleKey(FocusNode node, KeyEvent event) =>
      tanreiTooltipTookKey(event) ? KeyEventResult.handled : KeyEventResult.ignored;

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiDialogTokens tokens = theme.system.dialog;
    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: theme.system.shape.cornerSmoothing,
      radius: tokens.containerShape,
    );
    final TanreiResolvedElevation elevation = TanreiResolvedElevation.resolve(
      tokens.containerElevation,
      theme.colors,
    );
    final bool centred = widget.icon != null;

    // DLG-8, DLG-9: the parts, each left out when empty; the texts are the node's name and
    // description, so they are not read again.
    final Widget? iconPart = widget.icon == null
        ? null
        : TanreiControlIcon(
            icon: widget.icon!,
            size: tokens.iconSize,
            selected: false,
            color: theme.paint(tokens.iconColor),
          );
    final Widget? headlinePart = widget.headline.isEmpty
        ? null
        : ExcludeSemantics(
            child: Text(
              widget.headline,
              style: tokens.headlineTypescale.toTextStyle(color: theme.paint(tokens.headlineColor)),
              textAlign: centred ? TextAlign.center : TextAlign.start,
              softWrap: true,
            ),
          );
    final Widget? supportingPart = widget.supportingText.isEmpty
        ? null
        : ExcludeSemantics(
            child: Text(
              widget.supportingText,
              style: tokens.supportingTextTypescale.toTextStyle(
                color: theme.paint(tokens.supportingTextColor),
              ),
              textAlign: TextAlign.start,
              softWrap: true,
            ),
          );
    final Color content = theme.paint(tokens.contentColor);
    final Widget? contentPart = widget.child == null
        ? null
        // DLG-8: the content color as the default text and icon color, and plain text in the body
        // style (Flutter's `Text` has no style of its own to fall back on), as the card's (CRD-13).
        : DefaultTextStyle.merge(
            style: theme.textStyle(theme.system.typescale.body, color: content),
            child: IconTheme.merge(
              data: IconThemeData(color: content),
              child: widget.child!,
            ),
          );

    Widget column(List<Widget?> parts, {CrossAxisAlignment align = CrossAxisAlignment.stretch}) =>
        Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: align,
          spacing: tokens.containerGap,
          children: parts.whereType<Widget>().toList(),
        );

    final List<Widget?> topParts = <Widget?>[iconPart, headlinePart];
    final List<Widget?> middleParts = <Widget?>[supportingPart, contentPart];
    final bool hasTop = topParts.any((Widget? w) => w != null);
    final bool hasMiddle = middleParts.any((Widget? w) => w != null);
    final Widget top = column(
      topParts,
      align: centred ? CrossAxisAlignment.center : CrossAxisAlignment.stretch,
    );
    // DLG-10: a row at the end, or a column at the end when the row does not fit; order kept.
    final Widget? actions = widget.actions.isEmpty
        ? null
        : OverflowBar(
            spacing: tokens.actionsGap,
            overflowSpacing: tokens.actionsGap,
            alignment: MainAxisAlignment.end,
            overflowAlignment: OverflowBarAlignment.end,
            children: widget.actions,
          );

    final Widget frame = _whole
        ? _DialogFrame(
            // DLG-12: everything together.
            middle: SingleChildScrollView(
              controller: _scroll,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  if (hasTop) top,
                  if (hasTop && hasMiddle) SizedBox(height: tokens.containerGap),
                  if (hasMiddle) column(middleParts),
                  if (actions != null && (hasTop || hasMiddle))
                    SizedBox(height: tokens.actionsMarginBlockStart),
                  ?actions,
                ],
              ),
            ),
            tokens: tokens,
            dividerColor: theme.paint(tokens.dividerColor),
            scroll: _scroll,
            whole: true,
            onNeedsWhole: _handleNeedsWhole,
          )
        : _DialogFrame(
            top: hasTop ? top : null,
            middle: hasMiddle
                ? SingleChildScrollView(controller: _scroll, child: column(middleParts))
                : null,
            actions: actions,
            tokens: tokens,
            dividerColor: theme.paint(tokens.dividerColor),
            scroll: _scroll,
            whole: false,
            onNeedsWhole: _handleNeedsWhole,
          );

    final EdgeInsets safe = MediaQuery.maybePaddingOf(context) ?? EdgeInsets.zero;
    final EdgeInsets keyboard = MediaQuery.maybeViewInsetsOf(context) ?? EdgeInsets.zero;
    final double margin = tokens.containerMargin;
    // DLG-7: centred in the safe area, margin from every edge and from the keyboard.
    return Padding(
      padding: EdgeInsets.fromLTRB(
        safe.left + margin,
        safe.top + margin,
        safe.right + margin,
        math.max(safe.bottom, keyboard.bottom) + margin,
      ),
      child: Center(
        // DLG-14: a modal dialog (an alert dialog), named by its headline and described by its
        // supporting text; it scopes and names the route, so assistive technology stays in it.
        child: Semantics(
          container: true,
          explicitChildNodes: true,
          scopesRoute: true,
          namesRoute: true,
          role: widget.alert ? SemanticsRole.alertDialog : SemanticsRole.dialog,
          label: tanreiIsAccessibleName(widget.headline) ? widget.headline : null,
          hint: widget.supportingText.isEmpty ? null : widget.supportingText,
          child: Focus(
            focusNode: _container,
            includeSemantics: false,
            onKeyEvent: _handleKey,
            child: DecoratedBox(
              decoration: TanreiContainerDecoration(
                shape: shape,
                color: theme.paint(tokens.containerColor),
                border: elevation.ring,
                boxShadow: elevation.shadows.isEmpty ? null : elevation.shadows,
              ),
              child: frame,
            ),
          ),
        ),
      ),
    );
  }
}

/// The slots of a [_DialogFrame].
enum _Part { top, middle, actions }

/// The inside of the dialog's container (DLG-7, DLG-8, DLG-11, DLG-12): as wide as its widest
/// part plus the padding, between the width tokens and the room; the top part, `gap`, the middle
/// (a scroll view) and, `actions.margin-block-start` below, the actions, inside the padding. The
/// middle takes what height is left; while it is scrolled from its top a divider is drawn across the
/// container above it, and while more of it lies below, one above the actions. When the top and the
/// actions alone leave it no room it asks for everything to scroll together ([onNeedsWhole]).
class _DialogFrame extends SlottedMultiChildRenderObjectWidget<_Part, RenderBox> {
  const _DialogFrame({
    this.top,
    this.middle,
    this.actions,
    required this.tokens,
    required this.dividerColor,
    required this.scroll,
    required this.whole,
    required this.onNeedsWhole,
  });

  final Widget? top;
  final Widget? middle;
  final Widget? actions;
  final TanreiDialogTokens tokens;
  final Color dividerColor;
  final ScrollController scroll;
  final bool whole;
  final ValueChanged<bool> onNeedsWhole;

  @override
  Iterable<_Part> get slots => _Part.values;

  @override
  Widget? childForSlot(_Part slot) => switch (slot) {
    _Part.top => top,
    _Part.middle => middle,
    _Part.actions => actions,
  };

  @override
  _RenderDialogFrame createRenderObject(BuildContext context) => _RenderDialogFrame(
    tokens: tokens,
    dividerColor: dividerColor,
    scroll: scroll,
    whole: whole,
    onNeedsWhole: onNeedsWhole,
  );

  @override
  void updateRenderObject(BuildContext context, _RenderDialogFrame renderObject) {
    renderObject
      ..tokens = tokens
      ..dividerColor = dividerColor
      ..scroll = scroll
      ..whole = whole
      ..onNeedsWhole = onNeedsWhole;
  }
}

/// The render object of a dialog's container, as tests see it.
abstract interface class RenderTanreiDialogFrame implements RenderObject {
  /// Whether the divider below the headline was drawn in the last paint (DLG-11).
  bool get topDividerShown;

  /// Whether the divider above the actions was drawn in the last paint (DLG-11).
  bool get bottomDividerShown;

  /// Whether every part scrolls together (DLG-12).
  bool get scrollsWhole;
}

class _RenderDialogFrame extends RenderBox
    with SlottedContainerRenderObjectMixin<_Part, RenderBox>
    implements RenderTanreiDialogFrame {
  _RenderDialogFrame({
    required TanreiDialogTokens tokens,
    required Color dividerColor,
    required ScrollController scroll,
    required bool whole,
    required this.onNeedsWhole,
  }) : _tokens = tokens,
       _dividerColor = dividerColor,
       _scroll = scroll,
       _whole = whole;

  TanreiDialogTokens _tokens;
  set tokens(TanreiDialogTokens value) {
    if (!identical(_tokens, value)) {
      _tokens = value;
      markNeedsLayout();
    }
  }

  Color _dividerColor;
  set dividerColor(Color value) {
    if (_dividerColor != value) {
      _dividerColor = value;
      markNeedsPaint();
    }
  }

  ScrollController _scroll;
  set scroll(ScrollController value) {
    if (_scroll != value) {
      if (attached) {
        _scroll.removeListener(markNeedsPaint);
        value.addListener(markNeedsPaint);
      }
      _scroll = value;
      markNeedsPaint();
    }
  }

  bool _whole;
  set whole(bool value) {
    if (_whole != value) {
      _whole = value;
      _reportedWhole = false;
      markNeedsLayout();
    }
  }

  ValueChanged<bool> onNeedsWhole;
  bool _reportedWhole = false;

  @override
  bool get scrollsWhole => _whole;

  @override
  bool get topDividerShown => _topDivider;
  bool _topDivider = false;

  @override
  bool get bottomDividerShown => _bottomDivider;
  bool _bottomDivider = false;

  Rect? _middleRect;

  @override
  void attach(PipelineOwner owner) {
    super.attach(owner);
    _scroll.addListener(markNeedsPaint);
  }

  @override
  void detach() {
    _scroll.removeListener(markNeedsPaint);
    super.detach();
  }

  RenderBox? get _top => childForSlot(_Part.top);
  RenderBox? get _middle => childForSlot(_Part.middle);
  RenderBox? get _actions => childForSlot(_Part.actions);

  double _widest() {
    double widest = 0;
    for (final RenderBox child in children) {
      widest = math.max(widest, child.getMaxIntrinsicWidth(double.infinity));
    }
    return widest;
  }

  double _width(BoxConstraints constraints) {
    final double padding = _tokens.containerPadding;
    final double room = constraints.maxWidth;
    final double max = math.min(_tokens.containerMaxWidth, room);
    final double min = math.min(_tokens.containerMinWidth, max);
    return constraints.constrainWidth((_widest() + 2 * padding).clamp(min, max).toDouble());
  }

  @override
  double computeMinIntrinsicWidth(double height) => _width(const BoxConstraints());

  @override
  double computeMaxIntrinsicWidth(double height) => computeMinIntrinsicWidth(height);

  @override
  double computeMinIntrinsicHeight(double width) =>
      _layout(BoxConstraints(maxWidth: width), dry: true).height;

  @override
  double computeMaxIntrinsicHeight(double width) => computeMinIntrinsicHeight(width);

  @override
  Size computeDryLayout(covariant BoxConstraints constraints) => _layout(constraints, dry: true);

  @override
  void performLayout() {
    size = _layout(constraints, dry: false);
  }

  Size _layout(BoxConstraints constraints, {required bool dry}) {
    Size sizeOf(RenderBox? child, BoxConstraints c) {
      if (child == null) {
        return Size.zero;
      }
      if (dry) {
        return child.getDryLayout(c);
      }
      child.layout(c, parentUsesSize: true);
      return child.size;
    }

    final double padding = _tokens.containerPadding;
    final double width = _width(constraints);
    final double inner = math.max(0, width - 2 * padding);
    final RenderBox? top = _top;
    final RenderBox? middle = _middle;
    final RenderBox? actions = _actions;
    final Size topSize = sizeOf(top, BoxConstraints.tightFor(width: inner));
    final Size actionsSize = sizeOf(actions, BoxConstraints.tightFor(width: inner));
    final double gapAfterTop = top != null && middle != null ? _tokens.containerGap : 0;
    final double actionsMargin = actions != null && (top != null || middle != null)
        ? _tokens.actionsMarginBlockStart
        : 0;
    final double fixed =
        2 * padding + topSize.height + gapAfterTop + actionsMargin + actionsSize.height;
    final double room = constraints.maxHeight - fixed;
    // DLG-12: the headline and the actions leave the middle no room — everything scrolls.
    final bool needsWhole = !_whole && middle != null && room <= 0;
    final Size middleSize = sizeOf(
      middle,
      BoxConstraints(
        minWidth: inner,
        maxWidth: inner,
        maxHeight: constraints.hasBoundedHeight ? math.max(0, room) : double.infinity,
      ),
    );
    final Size size = constraints.constrain(Size(width, fixed + middleSize.height));
    if (!dry) {
      double y = padding;
      if (top != null) {
        (top.parentData! as BoxParentData).offset = Offset(padding, y);
        y += topSize.height + gapAfterTop;
      }
      if (middle != null) {
        (middle.parentData! as BoxParentData).offset = Offset(padding, y);
        _middleRect = Rect.fromLTWH(0, y, size.width, middleSize.height);
        y += middleSize.height;
      } else {
        _middleRect = null;
      }
      if (actions != null) {
        y += actionsMargin;
        (actions.parentData! as BoxParentData).offset = Offset(padding, y);
      }
      if (needsWhole && !_reportedWhole) {
        _reportedWhole = true;
        SchedulerBinding.instance.addPostFrameCallback((_) => onNeedsWhole(true));
      }
    }
    return size;
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    for (final RenderBox child in children) {
      context.paintChild(child, offset + (child.parentData! as BoxParentData).offset);
    }
    // DLG-11: the dividers, while the middle is scrolled from its top or has more below.
    _topDivider = false;
    _bottomDivider = false;
    final Rect? middle = _middleRect;
    if (_whole || middle == null || !_scroll.hasClients) {
      return;
    }
    final ScrollPosition position = _scroll.position;
    if (!position.hasContentDimensions || position.maxScrollExtent <= position.minScrollExtent) {
      return;
    }
    final Paint paint = Paint()..color = _dividerColor;
    final double line = _tokens.dividerWidth;
    if (position.pixels > position.minScrollExtent) {
      _topDivider = true;
      context.canvas.drawRect(
        Rect.fromLTWH(middle.left, middle.top, middle.width, line).shift(offset),
        paint,
      );
    }
    if (position.pixels < position.maxScrollExtent) {
      _bottomDivider = true;
      context.canvas.drawRect(
        Rect.fromLTWH(middle.left, middle.bottom - line, middle.width, line).shift(offset),
        paint,
      );
    }
  }

  @override
  bool hitTestSelf(Offset position) => true;

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
