import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/container_decoration.dart';
import '../primitives/corner_shape.dart';
import '../primitives/edge.dart';
import '../primitives/elevation.dart';
import '../primitives/glyphs.dart';
import '../primitives/modal_overlays.dart';
import '../primitives/sheet.dart';
import '../primitives/tap_target.dart';
import '../theme/motion.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';
import 'icon_button.dart';

/// Shows supplementary content or a secondary task (filters, the details of a selection) in a
/// panel at the end edge: beside the content (standard) or over it (modal).
///
/// Implements `specs/side-sheet.spec.json`, controlled:
///
/// * [variant] — `TanreiSideSheetVariant.standard` (the default), `.modal`, or a value a design
///   system adds (an unknown one is drawn with standard's tokens, reported, and behaves as
///   standard, SSH-13);
/// * [open] — whether it is shown; the caller sets it to false from [onClose], which carries the
///   [TanreiSheetCloseReason] (`close`, `scrim`, `escape`, `back` or `drag`; the spec's `close`);
/// * [headline] — drawn in the header, a heading, and the sheet's accessible name;
/// * [showCloseButton] and [closeButtonSemanticLabel] (the spec's `closable` and `closeLabel`): a
///   standard, medium `TanreiIconButton` showing the close glyph at the end of the header;
/// * [actions] — Tanrei Buttons, main action first (the `actions` slot), laid out and never
///   restyled; [child] is the content.
///
/// A **standard** sheet is a layout region: put it last in a `Row` beside the content.
/// While [open] it takes its width and slides in at the end edge as the content resizes; while not
/// it takes none and is neither seen nor focused. Tab leaves it without closing it, and it ignores
/// Escape, back and drags; only its close button asks to close.
///
/// A **modal** sheet is a modal overlay, placed as the last child of a `Stack` that
/// fills the window, above the page. While [open] it slides in from the end edge over a scrim, keeps
/// Tab in its `FocusScope`, blocks presses and the semantics behind it and counts in
/// [TanreiModalOverlays]; the scrim, Escape, the platform's back (through the enclosing route), a
/// drag toward the end edge past half its width or a fling that way, and the close button ask it to
/// close.
///
/// Opening either moves focus to the content's `autofocus: true` widget or, without one, to the
/// sheet's own focus scope; closing with focus inside returns it to where it was. A sheet mounted
/// with [open] true does not move focus.
class TanreiSideSheet extends StatefulWidget {
  /// Creates a side sheet.
  const TanreiSideSheet({
    super.key,
    this.variant = TanreiSideSheetVariant.standard,
    this.open = false,
    this.onClose,
    this.headline = '',
    this.showCloseButton = false,
    this.closeButtonSemanticLabel = '',
    this.actions = const <Widget>[],
    required this.child,
  });

  /// Standard (in the layout) or modal (over the content).
  final TanreiSideSheetVariant variant;

  /// Whether the sheet is shown.
  final bool open;

  /// Called once when the person asks the sheet to close, with the reason; the caller closes it by
  /// setting [open] to false.
  final ValueChanged<TanreiSheetCloseReason>? onClose;

  /// What the sheet is about ("Filters"): drawn in the header and its accessible name.
  final String headline;

  /// Whether the close button is drawn at the end of the header.
  final bool showCloseButton;

  /// The close button's accessible name ("Close filters").
  final String closeButtonSemanticLabel;

  /// Tanrei Buttons below the content, main action first; empty for none.
  final List<Widget> actions;

  /// The content.
  final Widget child;

  @override
  State<TanreiSideSheet> createState() => _TanreiSideSheetState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('variant', variant.name, quoted: false))
      ..add(FlagProperty('open', value: open, ifTrue: 'open', ifFalse: 'closed'))
      ..add(StringProperty('headline', headline, defaultValue: ''))
      ..add(FlagProperty('showCloseButton', value: showCloseButton, ifTrue: 'closable'))
      ..add(StringProperty('closeButtonSemanticLabel', closeButtonSemanticLabel, defaultValue: ''));
  }
}

/// A sheet is shown at 1 and gone at 0.
const double _shown = 1;
const double _gone = 0;

/// A drag past this part of the sheet's width asks to close (SSH-4).
const double _half = 0.5;

class _TanreiSideSheetState extends State<TanreiSideSheet> with TickerProviderStateMixin {
  /// The enter and exit motion: shown at 1. Slides the sheet (or, where motion is reduced, fades
  /// a modal one) and fades the scrim; a standard sheet's width follows it.
  late final AnimationController _presence = AnimationController(
    vsync: this,
    value: widget.open ? _shown : _gone,
  )..addStatusListener(_handlePresenceStatus);

  /// How far a drag pushed a modal sheet toward its end edge, as a fraction of its width.
  late final AnimationController _drag = AnimationController(vsync: this);

  /// The sheet's focus: a trap for a modal sheet, a scope Tab leaves for a standard one. It is
  /// what takes focus when the content marks nothing (SSH-3).
  final FocusScopeNode _scope = FocusScopeNode(debugLabel: 'TanreiSideSheet', skipTraversal: true);

  /// Where focus was when the sheet opened (SSH-3).
  FocusNode? _previousFocus;

  /// Whether the sheet asked to close and waits for [TanreiSideSheet.open] to turn false.
  bool _closeRequested = false;

  /// Whether the modal sheet counts as an open modal overlay.
  bool _counted = false;

  /// The drawn width of the panel, for a drag.
  double _width = 0;

  bool _reportedName = false;

  /// SSH-13: a variant the system does not have behaves as standard.
  bool get _modal =>
      widget.variant == TanreiSideSheetVariant.modal &&
      TanreiTheme.of(context).system.sideSheet.variants.has(widget.variant);

  bool get _reduceMotion => MediaQuery.maybeDisableAnimationsOf(context) ?? false;

  /// SSH-2: Android's reduced-motion setting removes every animation.
  bool get _atOnce => _reduceMotion && defaultTargetPlatform == TargetPlatform.android;

  TanreiSideSheetTokens get _tokens => TanreiTheme.of(context).system.sideSheet;

  @override
  void initState() {
    super.initState();
    if (widget.open) {
      // SSH-3: a sheet mounted open appears in place. A standard one does not move focus; a modal
      // one moves focus in as if it had just opened, because nothing behind it can hold focus.
      // Where focus is now; a modal sheet gives it back when it closes (read before the theme is).
      _previousFocus = FocusManager.instance.primaryFocus;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && widget.open && _modal) {
          _count(true);
          // The scope forwards focus to the content's autofocus widget, or keeps it itself.
          _scope.requestFocus();
        }
      });
    }
  }

  @override
  void didUpdateWidget(TanreiSideSheet oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.variant != widget.variant) {
      _count(widget.open && _modal);
    }
    if (oldWidget.open != widget.open) {
      _closeRequested = false;
      if (widget.open) {
        _open();
      } else {
        _close();
      }
    }
  }

  @override
  void dispose() {
    _count(false);
    _presence.dispose();
    _drag.dispose();
    _scope.dispose();
    super.dispose();
  }

  void _count(bool open) {
    if (open && !_counted) {
      _counted = true;
      TanreiModalOverlays.instance.add();
    } else if (!open && _counted) {
      _counted = false;
      TanreiModalOverlays.instance.remove();
    }
  }

  void _handlePresenceStatus(AnimationStatus status) {
    if (status == AnimationStatus.dismissed && mounted) {
      setState(() {});
    }
  }

  Duration get _enterDuration => tanreiDuration(_tokens.motionEnterDuration);

  Curve get _enterCurve => _tokens.motionEnterEasing.toCurve();

  /// A standard sheet opens and closes at once wherever motion is reduced; a modal one fades
  /// there, except on Android (SSH-1, SSH-2).
  bool get _noMotion => _modal ? _atOnce : _reduceMotion;

  // SSH-1, SSH-2, SSH-3: slide in, and move focus in when the sheet opens, not when its motion
  // ends.
  void _open() {
    _previousFocus = FocusManager.instance.primaryFocus;
    _count(_modal);
    _drag.value = _gone;
    if (_noMotion) {
      _presence.value = _shown;
    } else {
      _presence.animateTo(_shown, duration: _enterDuration, curve: _enterCurve);
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && widget.open) {
        // The scope forwards focus to the content's autofocus widget, or keeps it itself.
        _scope.requestFocus();
      }
    });
  }

  // SSH-1, SSH-2, SSH-3: slide out from wherever the sheet is, and give focus back at once.
  void _close() {
    _count(false);
    if (_scope.hasFocus) {
      tanreiReturnFocus(_previousFocus, region: _scope);
    }
    _previousFocus = null;
    if (!_reduceMotion && _drag.value > 0) {
      // Continue from where the drag left it.
      _presence.value = math.max(_gone, _presence.value - _drag.value);
      _drag.value = _gone;
    }
    _drag.stop();
    if (_noMotion) {
      _presence.value = _gone;
    } else {
      _presence.animateBack(
        _gone,
        duration: tanreiDuration(_tokens.motionExitDuration),
        curve: _tokens.motionExitEasing.toCurve(),
      );
    }
  }

  /// SSH-4 – SSH-6: ask the owner to close the sheet — once, until [TanreiSideSheet.open] changes.
  /// Where the owner does not close it, a dragged sheet slides back one frame later.
  bool _requestClose(TanreiSheetCloseReason reason) {
    if (!widget.open || _closeRequested) {
      return false;
    }
    _closeRequested = true;
    widget.onClose?.call(reason);
    SchedulerBinding.instance.addPostFrameCallback((_) {
      if (mounted && widget.open && _closeRequested) {
        _closeRequested = false;
        _slideBack();
      }
    });
    SchedulerBinding.instance.ensureVisualUpdate();
    return true;
  }

  /// A modal-only request (the scrim, Escape, back, a drag).
  void _requestModalClose(TanreiSheetCloseReason reason) {
    if (_modal) {
      _requestClose(reason);
    }
  }

  /// SSH-4: back into place over the enter motion (at once where motion is reduced).
  void _slideBack() {
    if (_drag.value <= _gone) {
      return;
    }
    if (_reduceMotion) {
      _drag.value = _gone;
    } else {
      _drag.animateTo(_gone, duration: _enterDuration, curve: _enterCurve);
    }
  }

  bool _rtl(BuildContext context) => Directionality.of(context) == TextDirection.rtl;

  // SSH-4: a drag toward the end edge moves the sheet with it.
  void _dragUpdate(DragUpdateDetails details) {
    if (!widget.open || _width <= 0) {
      return;
    }
    _drag.stop();
    final double towardEnd = _rtl(context) ? -details.primaryDelta! : details.primaryDelta!;
    _drag.value = clampDouble(_drag.value + towardEnd / _width, _gone, _shown);
  }

  void _dragEnd(DragEndDetails details) {
    if (!widget.open) {
      return;
    }
    final double velocity = details.primaryVelocity ?? 0;
    final double towardEnd = _rtl(context) ? -velocity : velocity;
    if ((towardEnd > kMinFlingVelocity || _drag.value > _half) &&
        _requestClose(TanreiSheetCloseReason.drag)) {
      // SSH-6: held for one frame; the owner's answer decides.
      return;
    }
    _slideBack();
  }

  void _debugReportName() {
    assert(() {
      final bool missing = !tanreiIsAccessibleName(widget.headline);
      if (missing && !_reportedName) {
        debugTanreiReportMissingName('side sheet', widget);
      }
      _reportedName = missing;
      return true;
    }());
  }

  @override
  Widget build(BuildContext context) {
    final bool showing = widget.open || !_presence.isDismissed;
    if (!showing) {
      // SSH-1: a closed sheet takes no width and has no presence.
      return const SizedBox.shrink();
    }
    _debugReportName();
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiSideSheetTokens tokens = theme.system.sideSheet;
    final bool modal = _modal;
    final TextDirection direction = Directionality.of(context);
    final bool rtl = direction == TextDirection.rtl;
    final EdgeInsets insets = MediaQuery.paddingOf(context);
    final double endInset = rtl ? insets.left : insets.right;

    Widget panel = _SidePanel(
      tokens: tokens,
      variant: widget.variant,
      direction: direction,
      insets: insets,
      headline: widget.headline,
      closeButton: widget.showCloseButton
          ? TanreiIconButton(
              onPressed: () => _requestClose(TanreiSheetCloseReason.close),
              icon: const Text(tanreiCloseGlyph),
              semanticLabel: widget.closeButtonSemanticLabel,
            )
          : null,
      actions: widget.actions,
      child: widget.child,
    );

    final String? name = tanreiIsAccessibleName(widget.headline) ? widget.headline : null;
    // SSH-1, SSH-2: a trap for a modal sheet; a scope Tab leaves for a standard one.
    _scope.traversalEdgeBehavior = modal
        ? TraversalEdgeBehavior.closedLoop
        : TraversalEdgeBehavior.parentScope;
    panel = FocusScope(node: _scope, child: panel);
    // SSH-12: a modal dialog, or a region, named by the headline.
    panel = Semantics(
      container: true,
      explicitChildNodes: true,
      scopesRoute: modal ? true : null,
      namesRoute: modal ? true : null,
      role: modal ? SemanticsRole.dialog : null,
      label: name,
      child: panel,
    );

    if (!modal) {
      // SSH-1: the standard sheet's width grows and shrinks with the motion, the panel moving in
      // at the end edge while the content beside it resizes; closing, it takes no focus.
      return LayoutBuilder(
        builder: (BuildContext context, BoxConstraints constraints) => SizedBox(
          height: constraints.hasBoundedHeight ? constraints.maxHeight : null,
          child: ExcludeFocus(
            excluding: !widget.open,
            child: AnimatedBuilder(
              animation: _presence,
              builder: (BuildContext context, Widget? child) => ClipRect(
                child: Align(
                  alignment: AlignmentDirectional.centerStart,
                  widthFactor: clampDouble(_presence.value, _gone, _shown),
                  child: child,
                ),
              ),
              child: SizedBox(width: tokens.containerWidth + endInset, child: panel),
            ),
          ),
        ),
      );
    }

    // SSH-2, SSH-4: over a scrim, holding focus, closing on the scrim, Escape, back and a drag.
    panel = Actions(
      actions: <Type, Action<Intent>>{
        DismissIntent: CallbackAction<DismissIntent>(
          onInvoke: (_) => _requestModalClose(TanreiSheetCloseReason.escape),
        ),
      },
      child: Shortcuts(
        shortcuts: const <ShortcutActivator, Intent>{
          SingleActivator(LogicalKeyboardKey.escape): DismissIntent(),
        },
        child: panel,
      ),
    );
    panel = GestureDetector(
      // The drag counts from where the finger went down, the slop included.
      dragStartBehavior: DragStartBehavior.down,
      onHorizontalDragUpdate: widget.open ? _dragUpdate : null,
      onHorizontalDragEnd: widget.open ? _dragEnd : null,
      child: panel,
    );
    final Color scrim = theme.paint(tokens.scrimColor);
    final bool slide = !_reduceMotion;
    return PopScope<Object?>(
      // SSH-4: the platform's back asks the open sheet to close instead of leaving the page.
      canPop: !widget.open,
      onPopInvokedWithResult: (bool didPop, Object? result) {
        if (!didPop) {
          _requestModalClose(TanreiSheetCloseReason.back);
        }
      },
      child: BlockSemantics(
        child: LayoutBuilder(
          builder: (BuildContext context, BoxConstraints constraints) {
            // SSH-7: never wider than the window less the touch target, so a strip of scrim stays.
            final double width = math.max(
              _gone,
              math.min(
                tokens.containerWidth + endInset,
                constraints.maxWidth - theme.system.measure.targetTouch,
              ),
            );
            _width = width;
            return SizedBox.expand(
              child: Stack(
                children: <Widget>[
                  // SSH-2: every press behind the sheet lands on the scrim.
                  Positioned.fill(
                    child: ExcludeSemantics(
                      child: GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: () => _requestModalClose(TanreiSheetCloseReason.scrim),
                        child: AnimatedBuilder(
                          animation: Listenable.merge(<Listenable>[_presence, _drag]),
                          builder: (BuildContext context, Widget? child) => Opacity(
                            opacity: clampDouble(
                              _presence.value * (_shown - _drag.value),
                              _gone,
                              _shown,
                            ),
                            child: child,
                          ),
                          child: ColoredBox(color: scrim),
                        ),
                      ),
                    ),
                  ),
                  PositionedDirectional(
                    end: 0,
                    top: 0,
                    bottom: 0,
                    width: width,
                    child: AnimatedBuilder(
                      animation: Listenable.merge(<Listenable>[_presence, _drag]),
                      builder: (BuildContext context, Widget? child) {
                        // SSH-2: slides from the end edge; where motion is reduced it fades in
                        // place (a drag still moves it).
                        final double away =
                            (slide ? _shown - _presence.value : _gone) + _drag.value;
                        final Widget moved = FractionalTranslation(
                          translation: Offset((rtl ? -1 : 1) * away, 0),
                          child: child,
                        );
                        return slide ? moved : Opacity(opacity: _presence.value, child: moved);
                      },
                      child: panel,
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

/// The sheet's panel: the container in its variant's color, elevation, start corners and start
/// edge, reaching under the insets at its end, top and bottom; the header, the scrolling content
/// and the actions inside the insets.
class _SidePanel extends StatelessWidget {
  const _SidePanel({
    required this.tokens,
    required this.variant,
    required this.direction,
    required this.insets,
    required this.headline,
    required this.closeButton,
    required this.actions,
    required this.child,
  });

  final TanreiSideSheetTokens tokens;
  final TanreiSideSheetVariant variant;
  final TextDirection direction;
  final EdgeInsets insets;
  final String headline;
  final Widget? closeButton;
  final List<Widget> actions;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    // SSH-13: a variant the system does not have is drawn with the default's tokens, reported.
    final TanreiSideSheetVariantTokens look = tokens.variants[variant];
    final bool rtl = direction == TextDirection.rtl;
    final double inline = tokens.containerPaddingInline;
    final double block = tokens.containerPaddingBlock;
    final bool hasHeader = tanreiIsAccessibleName(headline) || closeButton != null;
    final bool hasActions = actions.isNotEmpty;
    final Color contentColor = theme.paint(tokens.contentColor);

    // SSH-8, SSH-9, SSH-14: the header, at least header.height, the headline wrapping from
    // padding-inline after the start edge, the close button padding-inline-end before the end edge,
    // header.gap after the headline, both centred.
    final Widget? header = hasHeader
        ? ConstrainedBox(
            constraints: BoxConstraints(minHeight: tokens.headerHeight),
            child: Padding(
              padding: EdgeInsetsDirectional.only(
                start: inline,
                end: closeButton == null ? inline : tokens.headerPaddingInlineEnd,
              ),
              child: Row(
                children: <Widget>[
                  Expanded(
                    child: Semantics(
                      header: true,
                      child: Text(
                        headline,
                        softWrap: true,
                        style: theme.textStyle(
                          tokens.headlineTypescale,
                          color: theme.paint(tokens.headlineColor),
                        ),
                      ),
                    ),
                  ),
                  if (closeButton case final Widget button) ...<Widget>[
                    SizedBox(width: tokens.headerGap),
                    // SSH-5: the icon button laid out by what it draws, its target reaching
                    // past it.
                    TanreiVisibleSize(child: button),
                  ],
                ],
              ),
            ),
          )
        : null;

    // SSH-10: the content color and the body style as the inherited foreground; the content
    // scrolls between the header and the actions.
    final Widget content = SingleChildScrollView(
      padding: EdgeInsetsDirectional.only(
        start: inline,
        end: inline,
        top: hasHeader ? 0 : block,
        bottom: hasActions ? 0 : block,
      ),
      child: DefaultTextStyle.merge(
        style: theme.textStyle(theme.system.typescale.body, color: contentColor),
        child: IconTheme.merge(
          data: IconThemeData(color: contentColor),
          child: child,
        ),
      ),
    );

    // SSH-11: the divider across the sheet, then the buttons in a row from the start edge, stacked
    // when they do not fit, in the order given.
    final List<Widget> footer = hasActions
        ? <Widget>[
            ExcludeSemantics(
              child: SizedBox(
                height: tokens.dividerWidth,
                child: ColoredBox(color: theme.paint(tokens.dividerColor)),
              ),
            ),
            Padding(
              padding: EdgeInsets.symmetric(
                horizontal: inline,
                vertical: tokens.actionsPaddingBlock,
              ),
              child: OverflowBar(
                spacing: tokens.actionsGap,
                overflowSpacing: tokens.actionsGap,
                overflowAlignment: OverflowBarAlignment.start,
                children: actions,
              ),
            ),
          ]
        : const <Widget>[];

    final Widget body = Padding(
      // SSH-8: the parts inside the insets at the end, top and bottom.
      padding: EdgeInsets.only(
        left: rtl ? insets.left : 0,
        right: rtl ? 0 : insets.right,
        top: insets.top,
        bottom: insets.bottom,
      ),
      child: MediaQuery.removePadding(
        context: context,
        removeTop: true,
        removeBottom: true,
        removeLeft: true,
        removeRight: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            ?header,
            Expanded(child: content),
            ...footer,
          ],
        ),
      ),
    );

    final TanreiResolvedElevation elevation = TanreiResolvedElevation.resolve(
      look.containerElevation,
      theme.colors,
    );
    final Color color = theme.paint(look.containerColor);
    final double radius = look.containerShape;
    // SSH-7: the start corners rounded by the variant's shape, eased by the system's smoothing; the
    // end corners square, by drawing the container past the end edge by the radius and clipping it
    // there (the shadows on the other sides stay); the start edge in the variant's outline color.
    return ClipRect(
      clipper: TanreiEdgeClipper(side: TanreiEdgeSide.end, textDirection: direction),
      child: Stack(
        clipBehavior: Clip.none,
        children: <Widget>[
          Positioned.directional(
            textDirection: direction,
            start: 0,
            end: -radius,
            top: 0,
            bottom: 0,
            child: DecoratedBox(
              decoration: TanreiContainerDecoration(
                shape: TanreiCornerShape(
                  smoothing: theme.system.shape.cornerSmoothing,
                  radius: radius,
                ),
                color: color.a > 0 ? color : null,
                border: elevation.ring,
                boxShadow: elevation.shadows.isEmpty ? null : elevation.shadows,
              ),
            ),
          ),
          Positioned.fill(
            child: CustomPaint(
              foregroundPainter: TanreiEdgePainter(
                color: theme.paint(look.outlineColor),
                width: tokens.outlineWidth,
                side: TanreiEdgeSide.start,
                textDirection: direction,
              ),
              child: body,
            ),
          ),
        ],
      ),
    );
  }
}
