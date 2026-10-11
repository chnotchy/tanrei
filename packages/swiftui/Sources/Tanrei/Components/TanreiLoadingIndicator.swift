import SwiftUI

// Spec: specs/loading-indicator.spec.json — tokens: TanreiLoadingIndicatorTokens (comp.loading-indicator), read from the
// design system in the environment (`system.loadingIndicator`). Every design value in this file comes from a token; the
// arc's length (a quarter of the circle) is the spec's drawing, not a value. The loop is `TanreiCycle`, the
// arc `TanreiArc` — the primitives the indeterminate progress ring uses too.

/// Shows that a short wait of unknown length is under way: a quarter arc that turns, inline or on a raised container.
///
///     TanreiLoadingIndicator("Loading messages")                            // next to text
///     TanreiLoadingIndicator("Saving", size: .small)                        // in place of an icon in a control
///     TanreiLoadingIndicator("Refreshing", size: .large, contained: true)   // over content
///
/// Follows `ProgressView(_:)` without a value: assistive technology hears a progress element in its busy state, named
/// by `label` (required — LDG-10 reports an empty one in debug builds). Under Reduce Motion the arc stops turning and
/// the whole circle pulses its opacity instead (LDG-4); the loop does not run while the indicator is not on screen
/// (LDG-7).
public struct TanreiLoadingIndicator: View {
  private let label: Text
  private let size: TanreiLoadingIndicatorSize
  private let contained: Bool

  private init(label: Text, isLabelEmpty: Bool, size: TanreiLoadingIndicatorSize, contained: Bool) {
    // LDG-10: still drawn, but a moving mark alone is not a name — reported in debug builds only.
    if isLabelEmpty {
      TanreiDiagnostics.report("Tanrei: a loading indicator has an empty label; it has no accessible name (LDG-10). Pass what is loading.")
    }
    self.label = label
    self.size = size
    self.contained = contained
  }

  /// - Parameters:
  ///   - label: the accessible name: what is loading.
  ///   - size: `.small`, `.medium` (default), `.large`, or a size the design system adds.
  ///   - contained: draws the indicator on a raised container of its own, where it floats over content.
  public init<S: StringProtocol>(_ label: S, size: TanreiLoadingIndicatorSize = .medium, contained: Bool = false) {
    self.init(label: Text(label), isLabelEmpty: label.isEmpty, size: size, contained: contained)
  }

  /// A loading indicator with a localized label.
  public init(_ labelKey: LocalizedStringKey, size: TanreiLoadingIndicatorSize = .medium, contained: Bool = false) {
    self.init(label: Text(labelKey), isLabelEmpty: labelKey == "", size: size, contained: contained)
  }

  public var body: some View {
    TanreiLoadingIndicatorChrome(size: size, contained: contained)
      // LDG-5, LDG-6: a progress element in its busy state, named by the label, with no value; never focusable, and
      // nothing is announced when it appears or disappears.
      .accessibilityRepresentation { ProgressView { label } }
      .accessibilityLabel(label)
  }
}

// MARK: - Token bindings

/// Which token values a loading indicator draws. Pure data read from a `TanreiLoadingIndicatorTokens`, so the bindings
/// can be tested without rendering.
struct TanreiLoadingIndicatorAppearance: Equatable {
  /// LDG-1: the indicator's square and the arc's stroke.
  let indicatorSize: CGFloat
  let thickness: CGFloat
  /// LDG-2 / LDG-3: the arc's color — `indicator.color`, or `contained.indicator.color` on the container.
  let indicator: TanreiPaint
  /// LDG-3: the container, `nil` when not contained.
  let container: Container?

  struct Container: Equatable {
    let size: CGFloat
    let cornerRadius: CGFloat
    let color: TanreiPaint
    let elevation: [TanreiShadowLayer]
  }

  init(tokens: TanreiLoadingIndicatorTokens, size: TanreiLoadingIndicatorSize, contained: Bool) {
    // LDG-9: the lookup is total — an unknown size reads the default size's tokens (and is reported).
    let metrics = tokens.sizes[size]
    indicatorSize = metrics.indicatorSize
    thickness = metrics.indicatorThickness
    indicator = contained ? tokens.containedIndicatorColor : tokens.indicatorColor
    container = contained
      ? Container(size: metrics.containerSize, cornerRadius: tokens.containerShape, color: tokens.containedContainerColor, elevation: tokens.containedContainerElevation)
      : nil
  }

  /// LDG-2 / LDG-3: the component's box — the indicator's square, or the container's.
  var boxSize: CGFloat { container?.size ?? indicatorSize }
}

/// The geometry of the turning arc (LDG-1) at a phase of the cycle.
enum TanreiLoadingMotion {
  /// LDG-1: a quarter of the circle.
  static let arcLength = 1.0 / 4.0

  /// The arc, in fractions of a turn clockwise from the top: it turns once per cycle at constant speed (`easing` is
  /// `sys.motion.easing.linear`).
  static func arc(phase: Double, easing: TanreiCubicBezier) -> ClosedRange<Double> {
    let start = TanreiCycleClock.eased(phase, easing)
    return start...(start + arcLength)
  }
}

// MARK: - Drawing

struct TanreiLoadingIndicatorChrome: View {
  let size: TanreiLoadingIndicatorSize
  let contained: Bool

  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors

  var body: some View {
    let tokens = system.loadingIndicator
    let appearance = TanreiLoadingIndicatorAppearance(tokens: tokens, size: size, contained: contained)
    let color = colors[appearance.indicator]
    TanreiCycle(durationMs: tokens.motionCycleDuration) { phase in
      // LDG-1: a quarter arc with round caps, its outer edge on the square, no track. LDG-4: under Reduce Motion, the
      // whole circle, still, its opacity pulsing with `sys.motion.easing.standard`.
      TanreiArc(
        range: reduceMotion ? 0...1 : TanreiLoadingMotion.arc(phase: phase, easing: system.motion.easing.linear),
        inset: appearance.thickness / 2
      )
      .stroke(color, style: StrokeStyle(lineWidth: appearance.thickness, lineCap: .round))
      .opacity(reduceMotion ? TanreiCycleClock.pulseOpacity(phase: phase, easing: system.motion.easing.standard) : TanreiIdentity.opacity)
    }
    .frame(width: appearance.indicatorSize, height: appearance.indicatorSize)
    // LDG-8: never mirrored — SwiftUI mirrors a shape in a right-to-left layout; the arc turns clockwise in every
    // direction.
    .environment(\.layoutDirection, .leftToRight)
    // LDG-2: exactly the indicator's square; LDG-3: centered on the container, which stays still and opaque.
    .frame(width: appearance.boxSize, height: appearance.boxSize)
    .background {
      if let container = appearance.container {
        TanreiElevationSurface(container.elevation, fill: colors[container.color], cornerRadius: container.cornerRadius)
      }
    }
  }
}
