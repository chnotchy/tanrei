import SwiftUI

/// Turns motion tokens into SwiftUI animations.
public enum TanreiMotion {
  private static let millisecondsPerSecond: Double = 1000

  /// A timing-curve animation from a duration token (milliseconds) and an easing token.
  /// Returns `nil` — no animation — when Reduce Motion is on.
  public static func animation(
    durationMs: Double,
    easing: TanreiCubicBezier,
    reduceMotion: Bool
  ) -> Animation? {
    guard !reduceMotion else { return nil }
    return .timingCurve(easing.x1, easing.y1, easing.x2, easing.y2, duration: durationMs / millisecondsPerSecond)
  }

  /// A spring animation from a spring token. Returns `nil` when Reduce Motion is on.
  public static func animation(spring: TanreiSpringSpec, reduceMotion: Bool) -> Animation? {
    guard !reduceMotion else { return nil }
    // Tokens carry a damping *ratio*; SwiftUI wants the damping coefficient for mass 1.
    let damping = 2 * spring.damping * spring.stiffness.squareRoot()
    return .interpolatingSpring(mass: 1, stiffness: spring.stiffness, damping: damping)
  }
}
