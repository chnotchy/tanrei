import SwiftUI

// The arc both circular indicators draw (the progress indicator's ring, PRG-1 / PRG-2; the loading indicator's mark,
// LDG-1): positions are fractions of a turn clockwise from the top, so the geometry is the spec's and not SwiftUI's
// (which measures angles from 3 o'clock). A shape is mirrored in a right-to-left layout; a caller that must not be
// (a ring turns clockwise in every direction) pins its layout direction.

/// An arc of the circle inscribed in the rect, inset by half the stroke so the stroke's outer edge touches it: `range`
/// in fractions of a turn clockwise from the top (it may pass 1).
struct TanreiArc: Shape {
  var range: ClosedRange<Double>
  let inset: CGFloat

  /// A turn, in radians; and the top of the circle, where a turn starts.
  private static let turn = 2 * Double.pi
  private static let top = -Double.pi / 2

  func path(in rect: CGRect) -> Path {
    let radius = min(rect.width, rect.height) / 2 - inset
    guard radius > 0, range.upperBound > range.lowerBound else { return Path() }
    var path = Path()
    path.addArc(
      center: CGPoint(x: rect.midX, y: rect.midY), radius: radius,
      startAngle: .radians(Self.top + range.lowerBound * Self.turn), endAngle: .radians(Self.top + range.upperBound * Self.turn),
      clockwise: false)
    return path
  }
}
