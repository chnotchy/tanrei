import 'dart:ui' show SemanticsRole, lerpDouble;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/container_decoration.dart';
import '../primitives/control_icon.dart';
import '../primitives/corner_shape.dart';
import '../primitives/edge.dart';
import '../primitives/elevation.dart';
import '../primitives/focus_ring.dart';
import '../primitives/ignored_value.dart';
import '../primitives/modal_overlays.dart';
import '../primitives/pressable.dart';
import '../primitives/selection_control.dart';
import '../theme/motion.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';
import 'divider.dart';

/// An item of a [TanreiNavigationDrawer]'s `children`: a [TanreiNavigationDrawerDestination] or a
/// [TanreiNavigationDrawerSection] (the spec's item kinds `destination` and `section`).
@immutable
sealed class TanreiNavigationDrawerChild {
  const TanreiNavigationDrawerChild();
}

/// One destination of a [TanreiNavigationDrawer] (the spec's item kind `destination`), as a
/// `NavigationDrawerDestination` in `NavigationDrawer.children`: its value is its index among the
/// drawer's destinations, counted in reading order through the sections.
///
/// [icon] is the glyph's name (or its code point) in the system's icon font, drawn at the row's
/// start outlined while unselected and filled while selected; null or empty draws none (give every
/// destination an icon, or none). [label] is its name, drawn and used as its accessible name;
/// [badge] short text at the row's end ("24", "New"), empty for none; [enabled] false disables it
/// (the spec's `disabled`).
class TanreiNavigationDrawerDestination extends TanreiNavigationDrawerChild {
  /// Describes a destination.
  const TanreiNavigationDrawerDestination({
    this.icon,
    required this.label,
    this.badge = '',
    this.enabled = true,
  });

  /// The glyph's name (or code point) in the system's icon font; null or empty for none.
  final String? icon;

  /// The destination's name.
  final String label;

  /// Short text at the row's end; empty for none.
  final String badge;

  /// Whether it can be activated and focused.
  final bool enabled;
}

/// A group of destinations under an optional [heading], with an optional [divider] before it (the
/// spec's item kind `section`). It holds destinations; sections do not nest (a section in a
/// section has its destinations drawn in its place, and is reported in debug builds).
class TanreiNavigationDrawerSection extends TanreiNavigationDrawerChild {
  /// Describes a section.
  const TanreiNavigationDrawerSection({
    this.heading = '',
    this.divider = false,
    required this.children,
  });

  /// The text that names the destinations under it, exposed as a heading; empty draws none.
  final String heading;

  /// Whether a `TanreiDivider` is drawn before the section.
  final bool divider;

  /// The section's destinations, in order.
  final List<TanreiNavigationDrawerChild> children;
}

/// Moves between a product's destinations from a panel at the start edge: text-led rows, grouped in
/// sections, beside the content (standard) or over it (modal).
///
/// Implements `specs/navigation-drawer.spec.json` with the idiom of Flutter's `NavigationDrawer`:
///
/// * [children] are `TanreiNavigationDrawerDestination`s and `TanreiNavigationDrawerSection`s (the
///   spec's item kinds); a destination's value is its index among the destinations, counted in
///   reading order through the sections;
/// * [selectedIndex] is the spec's `value`, null for none; an index that names no destination
///   selects none and is reported in debug builds (NVD-3);
/// * [onDestinationSelected] is both `change` and `reselect` (the selected destination too — the
///   caller compares) and [onClose] the spec's `close`;
/// * [variant] (`TanreiNavigationDrawerVariant.standard`, `modal`, or a value a design system adds;
///   an unknown one is drawn and behaves as standard), [open], [semanticLabel] (the spec's `label`)
///   and [header] (the `header` slot, not restyled).
///
/// A **standard** drawer is a layout region: put it first in a `Row` beside the content.
/// While [open] it takes its width and slides in as the content resizes; while not it takes no
/// width and is neither seen nor focused. Opening it moves focus to the selected destination (or
/// its first focusable element); closing it while focus is inside returns focus to where it was.
/// Tab leaves it without closing it, and it never calls [onClose].
///
/// A **modal** drawer is a modal overlay, placed as a `Scaffold` places its drawer:
/// as the last child of a `Stack` that fills the window, above the page. While [open] it slides in
/// from the start edge over a scrim, takes focus (the selected destination, or its first focusable
/// element), keeps Tab inside, and makes everything behind it inert; a press on the scrim, Escape,
/// the platform's back action (through the enclosing route), dragging it toward its start edge past
/// half its width or flinging it, and activating a destination call [onClose] once. It is
/// controlled: it closes when the owner sets [open] to false, sliding out and returning focus to
/// where it was.
class TanreiNavigationDrawer extends StatefulWidget {
  /// Creates a navigation drawer.
  const TanreiNavigationDrawer({
    super.key,
    this.variant = TanreiNavigationDrawerVariant.standard,
    this.open = false,
    this.selectedIndex,
    this.onDestinationSelected,
    this.onClose,
    this.semanticLabel = '',
    this.header,
    required this.children,
  });

  /// Standard (in the layout) or modal (over the content).
  final TanreiNavigationDrawerVariant variant;

  /// Whether the drawer is shown.
  final bool open;

  /// The index of the selected destination among all destinations; null selects none.
  final int? selectedIndex;

  /// Called with the index of the destination the user activated, whether or not it is selected.
  final ValueChanged<int>? onDestinationSelected;

  /// Called once when a modal drawer asks its owner to close it.
  final VoidCallback? onClose;

  /// The drawer's accessible name ("Mail"): the modal dialog's name.
  final String semanticLabel;

  /// What the product puts above the destinations: a title, an account switcher.
  final Widget? header;

  /// The destinations and sections, in order.
  final List<TanreiNavigationDrawerChild> children;

  @override
  State<TanreiNavigationDrawer> createState() => _TanreiNavigationDrawerState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('variant', variant.name, quoted: false))
      ..add(FlagProperty('open', value: open, ifTrue: 'open', ifFalse: 'closed'))
      ..add(IntProperty('selectedIndex', selectedIndex, ifNull: 'none'))
      ..add(StringProperty('semanticLabel', semanticLabel, defaultValue: ''));
  }
}

/// A drawer is fully open at 1 and gone at 0.
const double _shown = 1;
const double _gone = 0;

class _TanreiNavigationDrawerState extends State<TanreiNavigationDrawer>
    with SingleTickerProviderStateMixin<TanreiNavigationDrawer> {
  late final AnimationController _slide = AnimationController(
    vsync: this,
    value: widget.open ? _shown : _gone,
  )..addStatusListener(_handleStatus);
  late final CurvedAnimation _curve = CurvedAnimation(parent: _slide, curve: Curves.linear);

  /// The modal panel's focus scope: Tab stays inside it.
  final FocusScopeNode _scope = FocusScopeNode(debugLabel: 'TanreiNavigationDrawer');

  /// The standard panel's focus: not a scope, so Tab moves on to the content (NVD-28).
  final FocusNode _group = FocusNode(
    debugLabel: 'TanreiNavigationDrawer panel',
    skipTraversal: true,
    canRequestFocus: false,
  );

  FocusNode get _panelFocus => _modal ? _scope : _group;

  /// One focus node per destination, by index.
  final List<FocusNode> _destinationNodes = <FocusNode>[];

  /// Where focus was when the drawer opened (NVD-22, NVD-28).
  FocusNode? _previousFocus;

  /// Whether the modal drawer has asked its owner to close it and waits for [open] to turn false.
  bool _closeRequested = false;

  /// Whether the modal drawer counts as an open modal overlay.
  bool _counted = false;

  /// Where a drag toward the start edge began (the slide's value then).
  double? _dragStart;

  String _reported = '';

  bool get _modal =>
      widget.variant == TanreiNavigationDrawerVariant.modal &&
      TanreiTheme.of(context).system.navigationDrawer.variants.has(widget.variant);

  bool get _reduceMotion => MediaQuery.maybeDisableAnimationsOf(context) ?? false;

  @override
  void initState() {
    super.initState();
    if (widget.open) {
      // A modal drawer that is open from the start takes focus as it appears (NVD-19); a standard
      // one does not take it from the page.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && widget.open && _modal) {
          _count(true);
          _takeFocus();
        }
      });
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final TanreiNavigationDrawerTokens tokens = TanreiTheme.of(context).system.navigationDrawer;
    _slide
      ..duration = tanreiDuration(tokens.motionEnterDuration)
      ..reverseDuration = tanreiDuration(tokens.motionExitDuration);
    _curve
      ..curve = tokens.motionEnterEasing.toCurve()
      // The close runs from 1 to 0: flipped, the exit easing eases the close's own progress.
      ..reverseCurve = tokens.motionExitEasing.toCurve().flipped;
  }

  @override
  void didUpdateWidget(TanreiNavigationDrawer oldWidget) {
    super.didUpdateWidget(oldWidget);
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
    _curve.dispose();
    _slide.dispose();
    _scope.dispose();
    _group.dispose();
    for (final FocusNode node in _destinationNodes) {
      node.dispose();
    }
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

  void _handleStatus(AnimationStatus status) {
    if (status == AnimationStatus.dismissed && mounted) {
      setState(() {});
    }
  }

  // NVD-18, NVD-19: slide in over the enter motion (at once where motion is reduced), and take
  // focus once the panel is built.
  void _open() {
    _previousFocus = FocusManager.instance.primaryFocus;
    if (_modal) {
      _count(true);
    }
    if (_reduceMotion) {
      _slide.value = _shown;
    } else {
      _slide.forward();
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && widget.open) {
        _takeFocus();
      }
    });
  }

  // NVD-18, NVD-22: slide out over the exit motion, and give focus back at the start of it.
  void _close() {
    _count(false);
    final FocusNode panel = _panelFocus;
    if (panel.hasFocus) {
      final FocusNode? previous = _previousFocus;
      // A scope had focus when it opened when nothing in particular did.
      if (previous != null &&
          previous is! FocusScopeNode &&
          previous.context != null &&
          previous.canRequestFocus) {
        previous.requestFocus();
      } else {
        // Where the platform puts focus by default: nowhere in particular.
        FocusManager.instance.primaryFocus?.unfocus();
      }
    }
    _previousFocus = null;
    if (_reduceMotion) {
      _slide.value = _gone;
    } else {
      _slide.reverse();
    }
  }

  /// NVD-19, NVD-28: focus the selected destination, or else the first focusable element.
  void _takeFocus() {
    final int? selected = widget.selectedIndex;
    final List<_Entry> destinations = _destinations;
    if (selected != null &&
        selected >= 0 &&
        selected < destinations.length &&
        destinations[selected].destination.enabled &&
        selected < _destinationNodes.length) {
      _destinationNodes[selected].requestFocus();
      return;
    }
    final FocusNode? first = _panelFocus.traversalDescendants
        .where((FocusNode node) => node.canRequestFocus && !node.skipTraversal)
        .firstOrNull;
    first?.requestFocus();
  }

  /// NVD-20, NVD-21: ask the owner to close the modal drawer — once, until [open] changes.
  void _requestClose() {
    if (!_modal || !widget.open || _closeRequested) {
      return;
    }
    _closeRequested = true;
    widget.onClose?.call();
    // A controlled drawer stays open until its owner closes it: one that did not is put back.
    SchedulerBinding.instance.addPostFrameCallback((_) {
      if (mounted && widget.open && _closeRequested) {
        _closeRequested = false;
        if (_slide.value < _shown) {
          _slide.forward();
        }
      }
    });
  }

  void _activate(int index) {
    widget.onDestinationSelected?.call(index);
    // NVD-21: a modal drawer closes after a destination is chosen.
    _requestClose();
  }

  /// The destinations in reading order, each with its section's nesting (NVD-17).
  List<_Entry> get _destinations => <_Entry>[
    for (final _Entry entry in _flatten(widget.children, 0))
      if (entry.destination case TanreiNavigationDrawerDestination _) entry,
  ];

  static Iterable<_Entry> _flatten(List<TanreiNavigationDrawerChild> children, int depth) sync* {
    for (final TanreiNavigationDrawerChild child in children) {
      switch (child) {
        case TanreiNavigationDrawerDestination():
          yield _Entry(child, depth);
        case TanreiNavigationDrawerSection():
          yield* _flatten(child.children, depth + 1);
      }
    }
  }

  void _syncNodes(int count) {
    while (_destinationNodes.length < count) {
      _destinationNodes.add(FocusNode(debugLabel: 'TanreiNavigationDrawer destination'));
    }
    while (_destinationNodes.length > count) {
      _destinationNodes.removeLast().dispose();
    }
  }

  /// NVD-3, NVD-17, NVD-24: in debug builds, report an index that names no destination, a section
  /// in a section, and a modal drawer without a name — once for each state that has them.
  void _debugCheck(List<_Entry> destinations) {
    assert(() {
      final List<String> problems = <String>[
        if (widget.selectedIndex case final int index
            when index < 0 || index >= destinations.length)
          'The selectedIndex $index names no destination: none is selected.',
        if (destinations.any((_Entry entry) => entry.depth > 1))
          'Sections do not nest: the destinations of a section inside a section are drawn in its '
              'place.',
      ];
      final String signature = problems.join('|');
      if (signature != _reported) {
        _reported = signature;
        for (final String problem in problems) {
          debugTanreiReportIgnoredValue('navigation-drawer', 'children', problem, widget);
        }
      }
      return true;
    }());
  }

  bool _reportedName = false;

  void _debugReportName() {
    assert(() {
      final bool missing = _modal && !tanreiIsAccessibleName(widget.semanticLabel);
      if (missing && !_reportedName) {
        debugTanreiReportMissingName('navigation drawer', widget);
      }
      _reportedName = missing;
      return true;
    }());
  }

  // NVD-20: a drag toward the start edge moves the drawer with it; past half its width, or a fling
  // that way, closes it.
  void _dragUpdate(DragUpdateDetails details, double width, bool rtl) {
    if (width <= 0) {
      return;
    }
    _dragStart ??= _slide.value;
    final double towardStart = rtl ? details.primaryDelta! : -details.primaryDelta!;
    _slide.value = clampDouble(_slide.value - towardStart / width, _gone, _shown);
  }

  void _dragEnd(DragEndDetails details, bool rtl) {
    _dragStart = null;
    final double velocity = details.primaryVelocity ?? 0;
    final double towardStart = rtl ? velocity : -velocity;
    if (towardStart > kMinFlingVelocity || _slide.value < _shown / 2) {
      _requestClose();
    } else {
      _slide.forward();
    }
  }

  @override
  Widget build(BuildContext context) {
    final List<_Entry> destinations = _destinations;
    _debugCheck(destinations);
    _debugReportName();
    _syncNodes(destinations.length);
    final bool modal = _modal;
    final bool showing = widget.open || _slide.status != AnimationStatus.dismissed;
    if (!showing) {
      // NVD-18: a closed drawer takes no width and has no presence.
      return const SizedBox.shrink();
    }
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiNavigationDrawerTokens tokens = theme.system.navigationDrawer;
    final TextDirection direction = Directionality.of(context);
    final bool rtl = direction == TextDirection.rtl;
    final EdgeInsets insets = MediaQuery.paddingOf(context);
    final double startInset = rtl ? insets.right : insets.left;
    final double width = tokens.containerWidth + startInset;

    Widget panel = _DrawerPanel(
      tokens: tokens,
      variant: widget.variant,
      direction: direction,
      insets: insets,
      header: widget.header,
      children: widget.children,
      selectedIndex: widget.selectedIndex,
      nodes: _destinationNodes,
      onActivate: _activate,
    );
    panel = SizedBox(width: width, child: panel);

    if (!modal) {
      // NVD-18: the standard drawer's width grows and shrinks with the slide, the panel moving in
      // from the start edge while the content beside it resizes; closing, it takes no focus.
      return FocusTraversalGroup(
        child: Focus(
          focusNode: _group,
          // A group, not a trap: Tab moves on to the content (NVD-28).
          canRequestFocus: false,
          skipTraversal: true,
          includeSemantics: false,
          child: ExcludeFocus(
            excluding: !widget.open,
            child: AnimatedBuilder(
              animation: _curve,
              builder: (BuildContext context, Widget? child) => ClipRect(
                child: Align(
                  alignment: AlignmentDirectional.centerEnd,
                  widthFactor: clampDouble(_curve.value, _gone, _shown),
                  child: child,
                ),
              ),
              child: panel,
            ),
          ),
        ),
      );
    }

    // NVD-19, NVD-20, NVD-22, NVD-23: the modal drawer over a scrim, a modal dialog named by the
    // label, holding focus, closing on the scrim, Escape, back and a drag.
    final Color scrim = theme.paint(tokens.scrimColor);
    panel = Semantics(
      container: true,
      explicitChildNodes: true,
      scopesRoute: true,
      namesRoute: true,
      role: SemanticsRole.dialog,
      label: tanreiIsAccessibleName(widget.semanticLabel) ? widget.semanticLabel : null,
      child: Actions(
        actions: <Type, Action<Intent>>{
          DismissIntent: CallbackAction<DismissIntent>(onInvoke: (_) => _requestClose()),
        },
        child: Shortcuts(
          shortcuts: const <ShortcutActivator, Intent>{
            SingleActivator(LogicalKeyboardKey.escape): DismissIntent(),
          },
          child: FocusScope(node: _scope, child: panel),
        ),
      ),
    );
    panel = GestureDetector(
      // The drag counts from where the finger went down, the slop included.
      dragStartBehavior: DragStartBehavior.down,
      onHorizontalDragUpdate: widget.open
          ? (DragUpdateDetails details) => _dragUpdate(details, width, rtl)
          : null,
      onHorizontalDragEnd: widget.open ? (DragEndDetails details) => _dragEnd(details, rtl) : null,
      child: panel,
    );
    return PopScope<Object?>(
      // The platform's back closes the open drawer instead of the page (NVD-20).
      canPop: !widget.open,
      onPopInvokedWithResult: (bool didPop, Object? result) {
        if (!didPop) {
          _requestClose();
        }
      },
      child: BlockSemantics(
        child: SizedBox.expand(
          child: Stack(
            children: <Widget>[
              // The scrim: every press behind the drawer lands here and closes it.
              Positioned.fill(
                child: ExcludeSemantics(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: _requestClose,
                    child: FadeTransition(
                      opacity: _curve,
                      child: ColoredBox(color: scrim),
                    ),
                  ),
                ),
              ),
              PositionedDirectional(
                start: 0,
                top: 0,
                bottom: 0,
                child: AnimatedBuilder(
                  animation: _dragStart == null ? _curve : _slide,
                  builder: (BuildContext context, Widget? child) => FractionalTranslation(
                    translation: Offset(
                      (rtl ? 1 : -1) *
                          (_shown - (_dragStart == null ? _curve.value : _slide.value)),
                      0,
                    ),
                    child: child,
                  ),
                  child: panel,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A destination in reading order, with how deep in sections it stands.
class _Entry {
  const _Entry(this.destination, this.depth);

  final TanreiNavigationDrawerDestination destination;
  final int depth;
}

/// The drawer's panel: the container in its variant's color, elevation, end corners and end edge,
/// reaching under the insets, holding the header and the items, which scroll together.
class _DrawerPanel extends StatelessWidget {
  const _DrawerPanel({
    required this.tokens,
    required this.variant,
    required this.direction,
    required this.insets,
    required this.header,
    required this.children,
    required this.selectedIndex,
    required this.nodes,
    required this.onActivate,
  });

  final TanreiNavigationDrawerTokens tokens;
  final TanreiNavigationDrawerVariant variant;
  final TextDirection direction;
  final EdgeInsets insets;
  final Widget? header;
  final List<TanreiNavigationDrawerChild> children;
  final int? selectedIndex;
  final List<FocusNode> nodes;
  final ValueChanged<int> onActivate;

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    // NVD-26: a variant the system does not have is drawn with the default's tokens, reported.
    final TanreiNavigationDrawerVariantTokens look = tokens.variants[variant];
    final bool rtl = direction == TextDirection.rtl;
    int next = 0;

    Widget destination(TanreiNavigationDrawerDestination destination) {
      final int index = next++;
      return _DrawerDestination(
        key: ValueKey<int>(index),
        tokens: tokens,
        destination: destination,
        selected: index == selectedIndex,
        focusNode: index < nodes.length ? nodes[index] : null,
        onPressed: () => onActivate(index),
      );
    }

    // NVD-12, NVD-16, NVD-17: destinations; a section's divider, heading and destinations; a
    // section in a section is drawn in its place.
    List<Widget> build(List<TanreiNavigationDrawerChild> items) => <Widget>[
      for (final TanreiNavigationDrawerChild item in items)
        ...switch (item) {
          TanreiNavigationDrawerDestination() => <Widget>[destination(item)],
          TanreiNavigationDrawerSection() => <Widget>[
            if (item.divider) const TanreiDivider(),
            if (item.heading.isNotEmpty) _SectionHeading(tokens: tokens, text: item.heading),
            ...build(item.children),
          ],
        },
    ];

    // NVD-12, NVD-25: padding-inline and padding-block inside the insets; the header, then the
    // items; all of it scrolls while it is taller than the drawer.
    final Widget content = SingleChildScrollView(
      padding: EdgeInsets.only(
        left: tokens.containerPaddingInline + (rtl ? 0 : insets.left),
        right: tokens.containerPaddingInline + (rtl ? insets.right : 0),
        top: tokens.containerPaddingBlock + insets.top,
        bottom: tokens.containerPaddingBlock + insets.bottom,
      ),
      child: MediaQuery.removePadding(
        context: context,
        removeTop: true,
        removeBottom: true,
        removeLeft: true,
        removeRight: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[if (header != null) header!, ...build(children)],
        ),
      ),
    );

    final TanreiResolvedElevation elevation = TanreiResolvedElevation.resolve(
      look.containerElevation,
      theme.colors,
    );
    final Color color = theme.paint(look.containerColor);
    final double radius = look.containerShape;
    // NVD-10, NVD-11: the end corners rounded by the variant's shape, eased by the system's
    // smoothing; the start corners square, by drawing the container past the start edge by the
    // radius and clipping it there (the shadows stay, off the start edge nothing is seen).
    final Widget container = Positioned.directional(
      textDirection: direction,
      start: -radius,
      end: 0,
      top: 0,
      bottom: 0,
      child: DecoratedBox(
        decoration: TanreiContainerDecoration(
          shape: TanreiCornerShape(smoothing: theme.system.shape.cornerSmoothing, radius: radius),
          color: color.a > 0 ? color : null,
          border: elevation.ring,
          boxShadow: elevation.shadows.isEmpty ? null : elevation.shadows,
        ),
      ),
    );
    return Semantics(
      container: true,
      explicitChildNodes: true,
      child: ClipRect(
        clipper: _StartEdgeClipper(direction),
        child: Stack(
          clipBehavior: Clip.none,
          children: <Widget>[
            container,
            Positioned.fill(
              child: CustomPaint(
                foregroundPainter: TanreiEdgePainter(
                  color: theme.paint(look.outlineColor),
                  width: tokens.outlineWidth,
                  side: TanreiEdgeSide.end,
                  textDirection: direction,
                ),
                child: content,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Clips only at the start edge (and far beyond the other three), so a container drawn past the
/// start edge loses its start corners and keeps its shadow on the other sides.
class _StartEdgeClipper extends CustomClipper<Rect> {
  const _StartEdgeClipper(this.direction);

  final TextDirection direction;

  @override
  Rect getClip(Size size) {
    final double far = size.longestSide + size.shortestSide;
    return direction == TextDirection.rtl
        ? Rect.fromLTRB(-far, -far, size.width, size.height + far)
        : Rect.fromLTRB(0, -far, size.width + far, size.height + far);
  }

  @override
  bool shouldReclip(_StartEdgeClipper oldClipper) => oldClipper.direction != direction;
}

/// NVD-16: a section's heading, a heading row that is not focusable.
class _SectionHeading extends StatelessWidget {
  const _SectionHeading({required this.tokens, required this.text});

  final TanreiNavigationDrawerTokens tokens;
  final String text;

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    return Semantics(
      container: true,
      header: true,
      child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: tokens.headingHeight),
        child: Padding(
          // Where the destinations' content starts.
          padding: EdgeInsetsDirectional.symmetric(horizontal: tokens.itemPaddingInline),
          child: Align(
            alignment: AlignmentDirectional.centerStart,
            widthFactor: 1,
            child: Text(
              text,
              style: theme.textStyle(
                tokens.headingTypescale,
                color: theme.paint(tokens.headingColor),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// How a drawer destination looks in one state and condition.
@immutable
class _RowVisuals {
  const _RowVisuals({
    required this.container,
    required this.icon,
    required this.label,
    required this.badge,
    required this.opacity,
  });

  final Color container;
  final Color icon;
  final Color label;
  final Color badge;
  final double opacity;

  static _RowVisuals lerp(_RowVisuals a, _RowVisuals b, double t) => _RowVisuals(
    container: tanreiLerpColor(a.container, b.container, t),
    icon: tanreiLerpColor(a.icon, b.icon, t),
    label: tanreiLerpColor(a.label, b.label, t),
    badge: tanreiLerpColor(a.badge, b.badge, t),
    opacity: lerpDouble(a.opacity, b.opacity, t)!,
  );
}

/// A resting destination is not dimmed.
const double _opaque = 1;

/// One destination row: the item container across the inner width, holding the icon, the label
/// (wrapping) and the badge text; pressed as a button; its hit area the row with half the gap above
/// and below.
class _DrawerDestination extends StatefulWidget {
  const _DrawerDestination({
    super.key,
    required this.tokens,
    required this.destination,
    required this.selected,
    required this.focusNode,
    required this.onPressed,
  });

  final TanreiNavigationDrawerTokens tokens;
  final TanreiNavigationDrawerDestination destination;
  final bool selected;
  final FocusNode? focusNode;
  final VoidCallback onPressed;

  @override
  State<_DrawerDestination> createState() => _DrawerDestinationState();
}

class _DrawerDestinationState extends State<_DrawerDestination>
    with
        TickerProviderStateMixin<_DrawerDestination>,
        TanreiPressableStateMixin<_DrawerDestination, _RowVisuals> {
  TanreiNavigationDrawerTokens get _tokens => widget.tokens;

  @override
  VoidCallback? get onPressed => widget.destination.enabled ? widget.onPressed : null;

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  @override
  Duration get rippleDuration => tanreiDuration(_tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => _tokens.motionStateEasing.toCurve();

  @override
  _RowVisuals lerpVisuals(_RowVisuals a, _RowVisuals b, double t) => _RowVisuals.lerp(a, b, t);

  @override
  void initState() {
    super.initState();
    _debugReportMissingName(null);
  }

  @override
  void didUpdateWidget(_DrawerDestination oldWidget) {
    super.didUpdateWidget(oldWidget);
    _debugReportMissingName(oldWidget);
  }

  /// NVD-24: an empty label is reported in debug builds, once.
  void _debugReportMissingName(_DrawerDestination? oldWidget) {
    assert(() {
      if ((oldWidget == null || tanreiIsAccessibleName(oldWidget.destination.label)) &&
          !tanreiIsAccessibleName(widget.destination.label)) {
        debugTanreiReportMissingName('navigation destination', widget);
      }
      return true;
    }());
  }

  TanreiNavigationDrawerConditionStateTokens _parts(TanreiInteractionState state) => _tokens
      .conditions[widget.selected
          ? TanreiNavigationDrawerCondition.selected
          : TanreiNavigationDrawerCondition.unselected]
      .of(state);

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiNavigationDrawerTokens tokens = _tokens;
    final TanreiNavigationDrawerDestination destination = widget.destination;
    final TanreiNavigationDrawerConditionStateTokens drawn = _parts(drawnState);
    // NVD-3, NVD-4, NVD-7, NVD-9: the condition's parts in the drawn state, the container of the
    // state the pressed feedback names.
    final _RowVisuals visuals = animateVisuals(
      _RowVisuals(
        container: theme.paint(_parts(containerState).itemContainerColor),
        icon: theme.paint(drawn.itemIconColor),
        label: theme.paint(drawn.itemLabelColor),
        badge: theme.paint(drawn.itemBadgeColor),
        opacity: tokens.stateTokens(drawnState)?.opacity ?? _opaque,
      ),
    );
    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: theme.system.shape.cornerSmoothing,
      radius: tokens.itemContainerShape,
    );
    final String icon = destination.icon ?? '';
    // NVD-13: icon, label (wrapping), badge text at the end, item.gap apart, padding-inline in.
    final Widget row = Padding(
      padding: EdgeInsetsDirectional.symmetric(horizontal: tokens.itemPaddingInline),
      child: Row(
        spacing: tokens.itemGap,
        children: <Widget>[
          if (icon.isNotEmpty)
            TanreiControlIcon(
              icon: Text(icon),
              size: tokens.itemIconSize,
              selected: widget.selected,
              color: visuals.icon,
            ),
          Expanded(
            child: Text(
              destination.label,
              style: theme.textStyle(tokens.itemLabelTypescale, color: visuals.label),
              softWrap: true,
            ),
          ),
          if (destination.badge.isNotEmpty)
            Text(
              destination.badge,
              style: theme.textStyle(tokens.itemBadgeTypescale, color: visuals.badge),
            ),
        ],
      ),
    );
    final Widget container = TanreiFocusRing(
      visible: isKeyboardFocused,
      borderRadius: BorderRadius.circular(shape.radius),
      child: DecoratedBox(
        key: pressContainerKey,
        decoration: TanreiContainerDecoration(
          shape: shape,
          color: visuals.container.a > 0 ? visuals.container : null,
          ripple: rippleFor(
            pressedContainer: () => theme.paint(_parts(interactionState).itemContainerColor),
            container: visuals.container,
          ),
        ),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: tokens.itemContainerHeight),
          child: Align(alignment: AlignmentDirectional.centerStart, heightFactor: 1, child: row),
        ),
      ),
    );
    final double target = theme.system.measure.targetTouch;
    // NVD-23, NVD-15: a button with its selected state, named by its label, the badge text read
    // after it; the icon hidden.
    return Semantics(
      container: true,
      button: true,
      selected: widget.selected,
      enabled: destination.enabled,
      label: tanreiIsAccessibleName(destination.label) ? destination.label : null,
      value: destination.badge.isEmpty ? null : destination.badge,
      child: buildPressable(
        focusNode: widget.focusNode,
        child: Opacity(
          opacity: visuals.opacity,
          child: ConstrainedBox(
            // NVD-6: the row with half the gap above and below, never below the touch target.
            constraints: BoxConstraints(minHeight: target),
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: tokens.containerGap / 2),
              child: Center(heightFactor: 1, child: ExcludeSemantics(child: container)),
            ),
          ),
        ),
      ),
    );
  }
}
