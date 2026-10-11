import 'package:flutter/animation.dart';

import '../generated/tokens.g.dart';

/// Converts easing tokens to Flutter curves.
extension TanreiCubicBezierToCurve on TanreiCubicBezier {
  /// This easing as a [Cubic] curve.
  Cubic toCurve() => Cubic(x1, y1, x2, y2);
}

/// Converts a millisecond duration token (`system.motion.duration.*`, component motion tokens).
Duration tanreiDuration(int milliseconds) => Duration(milliseconds: milliseconds);
