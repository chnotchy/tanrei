import SwiftUI

/// Minimum hit-target math. The visual size never changes; only the interactive area grows.
public enum TanreiHitTarget {
  /// The platform minimum of a design system: `targetPointer` on macOS, `targetTouch`
  /// everywhere else.
  public static func minimum(in measure: TanreiMeasure) -> CGFloat {
    #if os(macOS)
    measure.targetPointer
    #else
    measure.targetTouch
    #endif
  }

  /// How far the hit area extends past each edge of a visual of `size`. Zero on an axis
  /// that already meets the minimum.
  public static func outsets(for size: CGSize, minimum: CGFloat) -> TanreiHitTargetOutsets {
    TanreiHitTargetOutsets(
      horizontal: max(0, minimum - size.width) / 2,
      vertical: max(0, minimum - size.height) / 2
    )
  }

  /// `rect` grown symmetrically so that each side is at least `minimum`.
  public static func rect(for rect: CGRect, minimum: CGFloat) -> CGRect {
    let outsets = outsets(for: rect.size, minimum: minimum)
    return rect.insetBy(dx: -outsets.horizontal, dy: -outsets.vertical)
  }
}

public struct TanreiHitTargetOutsets: Sendable, Equatable {
  public var horizontal: CGFloat
  public var vertical: CGFloat

  public static let zero = TanreiHitTargetOutsets(horizontal: 0, vertical: 0)

  public init(horizontal: CGFloat, vertical: CGFloat) {
    self.horizontal = horizontal
    self.vertical = vertical
  }
}

/// Gives a control the minimum hit target without changing its visual or layout size.
///
/// SwiftUI only hit-tests a control inside its own layout frame — a `contentShape` that
/// reaches past the frame is ignored — so the control really has to be laid out at the
/// expanded size. This container keeps that out of the surrounding layout, statelessly:
///
/// - `sizing` is an invisible, inert copy of the control's *visual*. It alone defines the
///   layout size.
/// - `control` is centred over it and may overflow. Inside the control (at the end of a
///   `ButtonStyle` body, or just before a gesture modifier) apply
///   `tanreiHitTargetExpansion()` so its frame grows to the minimum.
public struct TanreiMinimumHitTarget<Sizing: View, Control: View>: View {
  private let sizing: Sizing
  private let control: Control

  public init(@ViewBuilder sizing: () -> Sizing, @ViewBuilder control: () -> Control) {
    self.sizing = sizing()
    self.control = control()
  }

  public var body: some View {
    sizing
      .hidden()
      .allowsHitTesting(false)
      .accessibilityHidden(true)
      .overlay(alignment: .center) { control }
  }
}

private struct TanreiHitTargetExpansionModifier: ViewModifier {
  let override: CGFloat?
  @Environment(\.tanreiSystem) private var system

  func body(content: Content) -> some View {
    let minimum = override ?? TanreiHitTarget.minimum(in: system.measure)
    content
      .frame(minWidth: minimum, minHeight: minimum)
      .contentShape(.interaction, Rectangle())
  }
}

extension View {
  /// Grows this view's frame (not its content) to the minimum target, centred, and makes
  /// the whole frame interactive. Use inside a control wrapped in `TanreiMinimumHitTarget`.
  /// The minimum comes from the design system's `sys.target` tokens unless given.
  public func tanreiHitTargetExpansion(minimum: CGFloat? = nil) -> some View {
    modifier(TanreiHitTargetExpansionModifier(override: minimum))
  }
}
