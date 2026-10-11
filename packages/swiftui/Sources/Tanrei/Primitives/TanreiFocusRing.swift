import SwiftUI

/// Geometry of the focus indicator around a rounded control, from the control outwards:
/// a signed `offset` (negative = inside the control), an optional inner stroke, then the
/// outer stroke. With `innerWidth` 0 it is a single ring and a positive offset leaves the
/// surface visible as a gap.
public struct TanreiFocusRingMetrics: Sendable, Equatable {
  public let containerCornerRadius: CGFloat
  /// Distance from the control's edge to the start of the indicator. Negative = inside.
  public let offset: CGFloat
  /// Width of the inner stroke (`focus-ring-inner` role). 0 = none.
  public let innerWidth: CGFloat
  /// Width of the outer stroke (`focus-ring` role).
  public let outerWidth: CGFloat

  public init(containerCornerRadius: CGFloat, offset: CGFloat, innerWidth: CGFloat, outerWidth: CGFloat) {
    self.containerCornerRadius = containerCornerRadius
    self.offset = offset
    self.innerWidth = innerWidth
    self.outerWidth = outerWidth
  }

  /// Metrics from a design system's `sys.focus` tokens.
  public init(containerCornerRadius: CGFloat, measure: TanreiMeasure) {
    self.init(
      containerCornerRadius: containerCornerRadius,
      offset: measure.focusOffset,
      innerWidth: measure.focusInnerWidth,
      outerWidth: measure.focusOuterWidth
    )
  }

  public var hasInnerStroke: Bool { innerWidth > 0 }

  /// How far the centre line of the inner stroke sits outside the control's edge.
  public var innerCenterlineOutset: CGFloat { offset + innerWidth / 2 }
  /// Where the inner stroke ends and the outer stroke begins.
  public var innerEdgeOutset: CGFloat { offset + innerWidth }
  /// How far the centre line of the outer stroke sits outside the control's edge.
  public var outerCenterlineOutset: CGFloat { innerEdgeOutset + outerWidth / 2 }
  /// How far the outer edge of the indicator sits outside the control's edge.
  public var outerOutset: CGFloat { innerEdgeOutset + outerWidth }

  /// Corner radius of a stroke centre line at `outset`, concentric with the control's corner.
  /// Never negative (a stroke far inside a small radius has square corners).
  public func cornerRadius(atOutset outset: CGFloat) -> CGFloat {
    max(containerCornerRadius + outset, .zero)
  }
}

private struct TanreiFocusRingModifier: ViewModifier {
  let isVisible: Bool
  let cornerRadius: CGFloat
  /// A joined item's corners (BGR-2): the ring is concentric with each side's own. `nil` — anywhere else — is
  /// `cornerRadius` at every corner.
  var sides: TanreiSideCorners? = nil
  @Environment(\.tanreiSystem) private var system
  @TanreiPalette private var colors

  func body(content: Content) -> some View {
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: cornerRadius, measure: system.measure)
    content.overlay {
      if isVisible {
        ZStack {
          if metrics.hasInnerStroke {
            stroke(colors.value(.focusRingInner), width: metrics.innerWidth, outset: metrics.innerCenterlineOutset, metrics: metrics)
          }
          stroke(colors.value(.focusRing), width: metrics.outerWidth, outset: metrics.outerCenterlineOutset, metrics: metrics)
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        // The indicator appears and disappears instantly, whatever transaction is in flight.
        .transition(.identity)
        .transaction { $0.animation = nil }
      }
    }
  }

  /// One stroke of the indicator, drawn as `sys.behavior.focus-style` names (BTN-10): `ring` is the
  /// hard line; `glow` is the SAME line in the same color as a soft halo whose blur is the line's
  /// width (a CSS blur, converted by `TanreiShadowBlur` like every blur).
  @ViewBuilder
  private func stroke(_ color: TanreiColorValue, width: CGFloat, outset: CGFloat, metrics: TanreiFocusRingMetrics) -> some View {
    let corners = system.shape.roundedCornerStyle
    if let sides {
      stroke(color, width: width, outset: outset, line: TanreiSideRoundedRectangle(sides.grown(by: outset), style: corners))
    } else {
      stroke(color, width: width, outset: outset, line: RoundedRectangle(cornerRadius: metrics.cornerRadius(atOutset: outset), style: corners))
    }
  }

  /// One stroke of the indicator along `line`, the container's corners at the stroke's outset.
  @ViewBuilder
  private func stroke(_ color: TanreiColorValue, width: CGFloat, outset: CGFloat, line: some Shape) -> some View {
    switch system.behavior.focusStyle {
    case .ring:
      line
        .stroke(color.color, lineWidth: width)
        .padding(-outset)
    case .glow:
      // How far the halo paints beyond the line's center: half the line, then the blur's extent.
      let reach = (width / 2 + TanreiShadowBlur.extent(cssBlur: width)).rounded(.up)
      Canvas { context, size in
        let rect = CGRect(origin: .zero, size: size).insetBy(dx: reach, dy: reach)
        guard rect.width > 0, rect.height > 0 else { return }
        context.addFilter(.shadow(color: color.color, radius: TanreiShadowBlur.shadowRadius(cssBlur: width), options: .shadowOnly))
        // Only the blurred copy is drawn (`shadowOnly`); the caster is opaque so the halo has the token's alpha.
        context.stroke(line.path(in: rect), with: .color(color.opaque.color), lineWidth: width)
      }
      .padding(-(outset + reach))
    }
  }
}

extension View {
  /// Draws the Tanrei focus indicator around this view from the design system's `sys.focus`
  /// tokens: offset, optional inner stroke (`focusRingInner`), outer stroke (`focusRing`).
  /// It does not affect layout and is never animated. Show it for keyboard focus only.
  public func tanreiFocusRing(_ isVisible: Bool, cornerRadius: CGFloat) -> some View {
    modifier(TanreiFocusRingModifier(isVisible: isVisible, cornerRadius: cornerRadius))
  }

  /// The focus indicator around a container whose leading and trailing corners may differ: a joined item of a button
  /// group (BGR-2). With `sides` `nil` it is exactly `tanreiFocusRing(_:cornerRadius:)`.
  func tanreiFocusRing(_ isVisible: Bool, cornerRadius: CGFloat, sides: TanreiSideCorners?) -> some View {
    modifier(TanreiFocusRingModifier(isVisible: isVisible, cornerRadius: cornerRadius, sides: sides))
  }
}
