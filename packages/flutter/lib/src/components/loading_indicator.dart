import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/container_decoration.dart';
import '../primitives/corner_shape.dart';
import '../primitives/elevation.dart';
import '../primitives/ring.dart';
import '../theme/motion.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// Shows that a short wait of unknown length is under way, inline or over content.
///
/// Implements `specs/loading-indicator.spec.json`; [semanticsLabel] is named as Flutter's
/// progress indicators name it.
///
/// * It draws, in an `indicator.size` square of its [size], an arc a quarter of the circle long
///   with round caps and a stroke of `indicator.thickness`, whose outer edge touches the square,
///   turning clockwise once per `motion.cycle-duration` at constant speed
///   (`sys.motion.easing.linear`); there is no track (LDG-1).
/// * Not [contained], it is exactly that square, in `indicator.color` (LDG-2). [contained], it is a
///   `container.size` square: a container with corners of `container.shape`, filled with
///   `contained.container.color` and raised by `contained.container.elevation`, with the arc
///   centered on it in `contained.indicator.color` (LDG-3).
/// * Where `MediaQuery.disableAnimationsOf` asks for reduced motion it does not turn: the whole
///   circle is drawn and its opacity eases from 1 to 0 and back once per cycle with
///   `sys.motion.easing.standard`; the container stays still and opaque (LDG-4).
/// * Semantics: [semanticsLabel] is the name, with no value — Flutter's own indeterminate
///   indicator. Flutter 3.32 cannot say "progressbar" or "busy" (LDG-5). Never focusable, never a live region, and it announces nothing
///   when it appears or disappears (LDG-6).
/// * The animation runs on a ticker: it stops wherever `TickerMode` is off (a route that is not
///   visible) and while the app is in the background, and resumes after (LDG-7).
/// * It is never mirrored: it turns clockwise in every direction (LDG-8). A [size] the design
///   system does not have renders as medium, reported in debug builds (LDG-9). An empty
///   [semanticsLabel] still renders and is reported in debug builds (LDG-10).
///
/// Every design value comes from the `TanreiLoadingIndicatorTokens` of the active design system
/// (`TanreiTheme.of(context).system.loadingIndicator`).
class TanreiLoadingIndicator extends StatefulWidget {
  /// Creates a loading indicator named [semanticsLabel].
  const TanreiLoadingIndicator({
    super.key,
    required this.semanticsLabel,
    this.size = TanreiLoadingIndicatorSize.medium,
    this.contained = false,
  });

  /// The accessible name: what is loading ("Loading messages"). Required; an empty one is reported
  /// in debug builds.
  final String semanticsLabel;

  /// The indicator's box, and the container's when [contained]. An open key: a design system may
  /// add sizes.
  final TanreiLoadingIndicatorSize size;

  /// Whether the indicator is drawn on a raised container of its own, for places where it floats
  /// over content.
  final bool contained;

  @override
  State<TanreiLoadingIndicator> createState() => _TanreiLoadingIndicatorState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('size', size.name, quoted: false))
      ..add(FlagProperty('contained', value: contained, ifTrue: 'contained'))
      ..add(StringProperty('semanticsLabel', semanticsLabel));
  }
}

class _TanreiLoadingIndicatorState extends State<TanreiLoadingIndicator>
    with SingleTickerProviderStateMixin<TanreiLoadingIndicator> {
  /// One turn (or one pulse), repeated (LDG-1, LDG-4).
  late final AnimationController _cycle = AnimationController(vsync: this);

  @override
  void initState() {
    super.initState();
    _debugReportMissingName(null);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // The cycle of the system in the theme; a theme change restarts it at the new length.
    final Duration duration = tanreiDuration(
      TanreiTheme.of(context).system.loadingIndicator.motionCycleDuration,
    );
    if (_cycle.duration != duration || !_cycle.isAnimating) {
      _cycle
        ..duration = duration
        ..repeat();
    }
  }

  @override
  void didUpdateWidget(TanreiLoadingIndicator oldWidget) {
    super.didUpdateWidget(oldWidget);
    _debugReportMissingName(oldWidget);
  }

  /// LDG-10: reported when first built without a name, and when it loses the one it had.
  void _debugReportMissingName(TanreiLoadingIndicator? oldWidget) {
    assert(() {
      final bool had = oldWidget == null || tanreiIsAccessibleName(oldWidget.semanticsLabel);
      if (had && !tanreiIsAccessibleName(widget.semanticsLabel)) {
        debugTanreiReportMissingName('loading-indicator', widget);
      }
      return true;
    }());
  }

  @override
  void dispose() {
    _cycle.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiSystem system = theme.system;
    final TanreiLoadingIndicatorTokens tokens = system.loadingIndicator;
    // Total lookup: an unknown size renders as medium and is reported (LDG-9).
    final TanreiLoadingIndicatorSizeTokens size = tokens.sizes[widget.size];

    Widget mark = SizedBox.square(
      dimension: size.indicatorSize,
      child: CustomPaint(
        painter: _ArcPainter(
          cycle: _cycle,
          color: theme.paint(
            widget.contained ? tokens.containedIndicatorColor : tokens.indicatorColor,
          ),
          thickness: size.indicatorThickness,
          reducedMotion: MediaQuery.disableAnimationsOf(context),
          turnCurve: system.motion.easing.linear.toCurve(),
          pulseCurve: system.motion.easing.standard.toCurve(),
        ),
      ),
    );

    if (widget.contained) {
      // LDG-3: the raised container, the arc centered on it. It stays still and opaque (LDG-4).
      final TanreiResolvedElevation elevation = TanreiResolvedElevation.resolve(
        tokens.containedContainerElevation,
        theme.colors,
      );
      final Color fill = theme.paint(tokens.containedContainerColor);
      mark = SizedBox.square(
        dimension: size.containerSize,
        child: DecoratedBox(
          decoration: TanreiContainerDecoration(
            shape: TanreiCornerShape(
              smoothing: system.shape.cornerSmoothing,
              radius: tokens.containerShape,
            ),
            color: fill.a > 0 ? fill : null,
            border: elevation.ring,
            boxShadow: elevation.shadows.isEmpty ? null : elevation.shadows,
          ),
          child: OverflowBox(
            // A system whose mark is larger than its container still centers it.
            minWidth: 0,
            minHeight: 0,
            maxWidth: double.infinity,
            maxHeight: double.infinity,
            child: mark,
          ),
        ),
      );
    }

    // LDG-5 / LDG-6: the name and nothing else — no value, no focus, no live region.
    return Semantics(container: true, label: widget.semanticsLabel, child: mark);
  }
}

/// The turning quarter arc, or under reduced motion the pulsing circle.
class _ArcPainter extends CustomPainter {
  _ArcPainter({
    required this.cycle,
    required this.color,
    required this.thickness,
    required this.reducedMotion,
    required this.turnCurve,
    required this.pulseCurve,
  }) : super(repaint: cycle);

  final Animation<double> cycle;
  final Color color;
  final double thickness;
  final bool reducedMotion;
  final Curve turnCurve;
  final Curve pulseCurve;

  @override
  void paint(Canvas canvas, Size size) {
    final TanreiRing ring = TanreiRing(size, thickness);
    final double t = cycle.value;
    if (reducedMotion) {
      // LDG-4: the whole circle, still, pulsing.
      ring.arc(
        canvas,
        TanreiRing.top,
        TanreiRing.turn,
        tanreiFade(color, tanreiPulseOpacity(pulseCurve, t)),
        cap: StrokeCap.round,
      );
    } else {
      // LDG-1 / LDG-8: a quarter arc with round caps, clockwise in every direction.
      ring.arc(
        canvas,
        TanreiRing.top + TanreiRing.turn * turnCurve.transform(t),
        TanreiRing.turn / 4,
        color,
        cap: StrokeCap.round,
      );
    }
  }

  @override
  bool shouldRepaint(_ArcPainter oldDelegate) =>
      oldDelegate.color != color ||
      oldDelegate.thickness != thickness ||
      oldDelegate.reducedMotion != reducedMotion ||
      oldDelegate.turnCurve != turnCurve ||
      oldDelegate.pulseCurve != pulseCurve;
}
