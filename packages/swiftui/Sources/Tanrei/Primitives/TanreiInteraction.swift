import SwiftUI

/// The single state a component is drawn in. Only one applies at a time: disabled wins over
/// everything, then pressed over focused over hovered. The cases are the spec's `states`.
///
/// A component resolves its state with `resolve` and then draws from **that state's tokens**, read with the
/// generated lookups (`system.button.variants[variant][state: state].containerColor`,
/// `system.button[state: state]?.opacity`). How a state looks — a state-layer mix,
/// an explicit color, a dim, or nothing — is a value decision of the design system; components
/// never compute it.
public enum TanreiInteraction: String, CaseIterable, Sendable {
  case enabled
  case hovered
  /// Keyboard focus. Focus gained by pointer or touch never selects this state.
  case focused
  case pressed
  case disabled

  /// Picks the one state to draw.
  public static func resolve(
    isEnabled: Bool = true,
    isPressed: Bool,
    isFocused: Bool,
    isHovered: Bool
  ) -> TanreiInteraction {
    guard isEnabled else { return .disabled }
    if isPressed { return .pressed }
    if isFocused { return .focused }
    if isHovered { return .hovered }
    return .enabled
  }
}

/// Not design values: what applies when a design system has no token for something.
enum TanreiIdentity {
  /// The opacity of a control that is not dimmed (the vocabulary has no rest-state `opacity` token).
  static let opacity: Double = 1
  /// The elevation of a container whose component has no elevation token (an icon button): flat, no shadow layer
  /// (`sys.elevation.level0` is the same empty list).
  static let elevation: [TanreiShadowLayer] = []
  /// The scale of a view that is not grown or shrunk (a dialog at rest, DLG-13).
  static let scale: CGFloat = 1
}
