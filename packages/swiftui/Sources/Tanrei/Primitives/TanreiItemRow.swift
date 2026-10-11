import SwiftUI

// What the pressable rows of a list and a menu, and the tabs of a row, share (LST-3 … LST-10, LST-21; MNU-10 … MNU-17,
// MNU-22; TAB-3 … TAB-10): the row's
// container with its state layer, ripple and whole-row opacity, the state motion, the focus ring drawn INSIDE the row (a
// scrolling ancestor or the menu's surface would clip one outside it), and the check of a selected option. Every value
// is handed in from the component's tokens.

/// The container of one item row: `TanreiContainerLayers` (fill, ripple, corners eased by the corner smoothing, the
/// state's opacity on the whole row), the state motion on a change of state or of condition, the focus ring inside the
/// row — its outer edge on the row's edge, never animated, never dimmed — and the whole row as the hit area.
struct TanreiItemRowContainer<Condition: Equatable>: ViewModifier {
  let fill: Color
  let ripple: TanreiContainerRipple?
  let cornerRadius: CGFloat
  /// The state's opacity of the whole row.
  let opacity: Double
  /// The state motion; `nil` under Reduce Motion.
  let motion: Animation?
  let state: TanreiInteraction
  let condition: Condition
  /// Keyboard focus on an item that answers it.
  let showsFocusRing: Bool

  @Environment(\.tanreiSystem) private var system

  func body(content: Content) -> some View {
    let ring = TanreiFocusRingMetrics(containerCornerRadius: cornerRadius, measure: system.measure)
    let inset = max(.zero, ring.outerOutset)
    content
      .frame(maxWidth: .infinity, alignment: .leading)
      .modifier(
        TanreiContainerLayers(
          fill: fill, elevation: TanreiIdentity.elevation, cornerRadius: cornerRadius, outline: .clear, outlineWidth: .zero, ripple: ripple,
          opacity: opacity))
      .animation(motion, value: state)
      .animation(motion, value: condition)
      .overlay {
        Color.clear
          .tanreiFocusRing(showsFocusRing, cornerRadius: max(.zero, cornerRadius - inset))
          .padding(inset)
      }
      .contentShape(Rectangle())
  }
}

/// The check of a selected option in a box of `size` (LST-21, MNU-22): the checkbox's check (`TanreiCheckboxMarkShape`),
/// stroked at `width`, drawn along its path while `isChecked` and taken back when not — over the enclosing state motion.
/// It does not mirror right to left: a check is not a direction. Decorative.
struct TanreiItemCheck: View {
  let isChecked: Bool
  let color: Color
  let size: CGFloat
  let width: CGFloat

  var body: some View {
    TanreiCheckboxMarkShape(kind: .check, progress: isChecked ? TanreiCheckboxMarkShape.drawn : .zero)
      .stroke(color, style: StrokeStyle(lineWidth: width, lineCap: .square, lineJoin: .miter))
      .frame(width: size, height: size)
      .environment(\.layoutDirection, .leftToRight)
      .accessibilityHidden(true)
  }
}
