import SwiftUI

// Spec: specs/progress-indicator.spec.json — tokens: TanreiProgressIndicatorTokens (comp.progress-indicator), read from
// the design system in the environment (`system.progressIndicator`). Every design value in this file comes from a token.
// The numbers that are not tokens are the spec's own geometry of the indeterminate forms — a segment two fifths of the
// track long, an arc a quarter of the circle (drawing, not values) — and the unit circle.

/// The form of a progress indicator (spec prop `variant`). A closed set: a form is drawn by code, not chosen by values,
/// so a design system cannot add one.
public enum TanreiProgressIndicatorVariant: String, CaseIterable, Sendable {
  /// A bar that fills the width its layout gives it, for content and pages.
  case linear
  /// A ring of a fixed size, for tight places and next to text.
  case circular

  /// The variant a spec value names, for UI built from data (`"linear"`, `"circular"`). PRG-12: any other name is
  /// `.linear`, the default, and is reported in debug builds (`TanreiDiagnostics`).
  public init(named name: String) {
    if let variant = TanreiProgressIndicatorVariant(rawValue: name) {
      self = variant
    } else {
      TanreiDiagnostics.report("Tanrei: a progress indicator has no variant \"\(name)\"; using \"linear\" (PRG-12)")
      self = .linear
    }
  }
}

/// Shows how far a task has come — or, with no value, that it is under way — as a bar or a ring.
///
///     TanreiProgressIndicator("Uploading report.pdf", value: 0.4)                        // a bar at 40 %
///     TanreiProgressIndicator("Uploading", value: 3, in: 0...10, currentValueLabel: "3 of 10 files")
///     TanreiProgressIndicator("Loading", variant: .circular, size: .small)               // an indeterminate ring
///
/// The initialisers follow `ProgressView`: `value: nil` (the default) is indeterminate, and `bounds` carries the
/// spec's `min` and `max` as `Slider`'s `in:` does. `label` is the accessible name and is required (PRG-15 reports an
/// empty one in debug builds); `currentValueLabel` is what assistive technology reads instead of the percentage
/// ("3 of 10 files").
///
/// A value change eases to the new value; under Reduce Motion it is shown at once and an indeterminate indicator stops
/// moving and pulses its opacity instead (PRG-6, PRG-7). The indeterminate animation does not run while the indicator
/// is not on screen (PRG-14).
public struct TanreiProgressIndicator: View {
  private let label: Text
  private let value: Double?
  private let bounds: ClosedRange<Double>
  private let currentValueLabel: String?
  private let variant: TanreiProgressIndicatorVariant
  private let size: TanreiProgressIndicatorSize

  private init(
    label: Text, isLabelEmpty: Bool, value: Double?, bounds: ClosedRange<Double>, currentValueLabel: String?,
    variant: TanreiProgressIndicatorVariant, size: TanreiProgressIndicatorSize
  ) {
    // PRG-15: still drawn, but a bar alone is not a name — reported in debug builds only.
    if isLabelEmpty {
      TanreiDiagnostics.report("Tanrei: a progress indicator has an empty label; it has no accessible name (PRG-15). Pass what is in progress.")
    }
    self.label = label
    self.value = value
    self.bounds = bounds
    self.currentValueLabel = currentValueLabel
    self.variant = variant
    self.size = size
  }

  /// - Parameters:
  ///   - label: the accessible name: what is in progress.
  ///   - value: how far the task has come, within `bounds`; `nil` is indeterminate.
  ///   - bounds: the spec's `min` and `max`.
  ///   - currentValueLabel: the spec's `valueText`: how assistive technology reads the value when a percentage is not
  ///     the natural reading. `nil` or empty reads the platform's percentage.
  ///   - variant: `.linear` (default) or `.circular`.
  ///   - size: `.small`, `.medium` (default), `.large`, or a size the design system adds.
  public init<S: StringProtocol>(
    _ label: S,
    value: Double? = nil,
    in bounds: ClosedRange<Double> = 0...1,
    currentValueLabel: String? = nil,
    variant: TanreiProgressIndicatorVariant = .linear,
    size: TanreiProgressIndicatorSize = .medium
  ) {
    self.init(
      label: Text(label), isLabelEmpty: label.isEmpty, value: value, bounds: bounds, currentValueLabel: currentValueLabel,
      variant: variant, size: size)
  }

  /// A progress indicator with a localized label.
  public init(
    _ labelKey: LocalizedStringKey,
    value: Double? = nil,
    in bounds: ClosedRange<Double> = 0...1,
    currentValueLabel: String? = nil,
    variant: TanreiProgressIndicatorVariant = .linear,
    size: TanreiProgressIndicatorSize = .medium
  ) {
    self.init(
      label: Text(labelKey), isLabelEmpty: labelKey == "", value: value, bounds: bounds, currentValueLabel: currentValueLabel,
      variant: variant, size: size)
  }

  public var body: some View {
    let progress = TanreiProgress(value: value, bounds: bounds)
    TanreiProgressIndicatorChrome(variant: variant, size: size, fraction: progress.fraction)
      .modifier(TanreiProgressAccessibility(label: label, progress: progress, valueText: currentValueLabel))
  }
}

// MARK: - Value

/// The value after PRG-11: the fraction drawn and what assistive technology is told. Reports what it corrected.
struct TanreiProgress: Equatable {
  /// 0…1 of the track, from its start; `nil` while indeterminate (PRG-1, PRG-2).
  let fraction: Double?
  /// The clamped value (PRG-8), `nil` while indeterminate (PRG-9).
  let value: Double?
  /// The range exposed with it.
  let bounds: ClosedRange<Double>

  /// The range exposed when max is not greater than min (PRG-11).
  static let unitRange: ClosedRange<Double> = 0...1

  init(value: Double?, bounds: ClosedRange<Double>) {
    guard let value else {
      fraction = nil
      self.value = nil
      self.bounds = bounds
      return
    }
    // PRG-11: max not greater than min draws the track with no indicator and exposes 0 in 0…1.
    guard bounds.upperBound > bounds.lowerBound else {
      TanreiDiagnostics.report("Tanrei: a progress indicator's max (\(bounds.upperBound)) is not greater than its min (\(bounds.lowerBound)); drawing no indicator (PRG-11)")
      fraction = 0
      self.value = Self.unitRange.lowerBound
      self.bounds = Self.unitRange
      return
    }
    // PRG-11: a value outside the range is drawn and exposed clamped to it.
    if !bounds.contains(value) {
      TanreiDiagnostics.report("Tanrei: a progress indicator's value \(value) is outside \(bounds.lowerBound)…\(bounds.upperBound); clamping it (PRG-11)")
    }
    let clamped = min(bounds.upperBound, max(bounds.lowerBound, value))
    fraction = (clamped - bounds.lowerBound) / (bounds.upperBound - bounds.lowerBound)
    self.value = clamped
    self.bounds = bounds
  }
}

// MARK: - Token bindings

/// Which token values a progress indicator draws. Pure data read from a `TanreiProgressIndicatorTokens`, so the bindings
/// can be tested without rendering.
struct TanreiProgressIndicatorAppearance: Equatable {
  let track: TanreiPaint
  let indicator: TanreiPaint
  /// The bar's height (PRG-3).
  let linearThickness: CGFloat
  /// The ring's box and stroke (PRG-3).
  let circularSize: CGFloat
  let circularThickness: CGFloat
  /// PRG-4: the corner radius of the bar's ends and of the indicator's ends, clamped to half the thickness.
  let barCornerRadius: CGFloat
  /// PRG-4: a ring's arcs have round caps unless `track.shape` is `sys.shape.corner.none`.
  let ringHasRoundCaps: Bool
  /// PRG-5.
  let trackGap: CGFloat
  let stopIndicatorSize: CGFloat

  init(tokens: TanreiProgressIndicatorTokens, size: TanreiProgressIndicatorSize, cornerNone: CGFloat) {
    // PRG-12: the lookup is total — an unknown size reads the default size's tokens (and is reported).
    let metrics = tokens.sizes[size]
    track = tokens.trackColor
    indicator = tokens.indicatorColor
    linearThickness = metrics.linearThickness
    circularSize = metrics.circularSize
    circularThickness = metrics.circularThickness
    barCornerRadius = min(tokens.trackShape, metrics.linearThickness / 2)
    ringHasRoundCaps = tokens.trackShape != cornerNone
    trackGap = tokens.trackGap
    stopIndicatorSize = tokens.stopIndicatorSize
  }

  /// PRG-5: a determinate indicator strictly between the ends leaves the gap.
  static func hasGap(_ fraction: Double) -> Bool { fraction > 0 && fraction < 1 }

  /// The bar's parts along its length, as fractions of the track (0 = start, 1 = end), for a determinate `fraction`
  /// on a track `length` points long: the indicator from the start, and the rest of the track after the gap (PRG-1,
  /// PRG-5). The gap is empty space between the two; with no gap the track runs under the indicator.
  func barParts(fraction: Double, length: CGFloat) -> (indicator: ClosedRange<Double>?, track: ClosedRange<Double>?) {
    let indicator: ClosedRange<Double>? = fraction > 0 ? 0...fraction : nil
    guard Self.hasGap(fraction), trackGap > 0, length > 0 else { return (indicator, 0...1) }
    let start = fraction + Double(trackGap / length)
    return (indicator, start < 1 ? start...1 : nil)
  }

  /// The ring's parts around the circle, as fractions of a turn clockwise from the top, for a determinate `fraction`
  /// (PRG-1, PRG-5): the indicator's arc from the top, and the rest of the track with the gap at BOTH ends of the
  /// indicator's arc. The gap is empty space along the track, so round caps (which reach half the stroke past an arc's
  /// end) are added to it.
  func ringParts(fraction: Double) -> (indicator: ClosedRange<Double>?, track: ClosedRange<Double>?) {
    let indicator: ClosedRange<Double>? = fraction > 0 ? 0...fraction : nil
    guard Self.hasGap(fraction), trackGap > 0 else { return (indicator, 0...1) }
    let centerline = Double.pi * Double(circularSize - circularThickness)
    guard centerline > 0 else { return (indicator, 0...1) }
    let caps = ringHasRoundCaps ? circularThickness : 0
    let gap = Double(trackGap + caps) / centerline
    let start = fraction + gap
    let end = 1 - gap
    return (indicator, start < end ? start...end : nil)
  }
}

extension TanreiProgressIndicatorTokens {
  /// PRG-6: how the indicator's end moves to a new value — over `motion.value-duration` with `motion.value-easing`;
  /// `nil` (at once) under Reduce Motion (PRG-7).
  func valueChange(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionValueDuration, easing: motionValueEasing, reduceMotion: reduceMotion)
  }
}

/// The geometry of the indeterminate forms (PRG-2) and of the reduced-motion pulse (PRG-7), at a phase of the cycle.
enum TanreiProgressMotion {
  /// PRG-2: the bar's moving segment is two fifths of the track long.
  static let segmentLength = 2.0 / 5.0
  /// PRG-2: the ring's arc is a quarter of the circle.
  static let arcLength = 1.0 / 4.0

  /// The bar's segment, in fractions of the track: it enters from beyond the start and leaves beyond the end once per
  /// cycle, with `easing` (`motion.cycle-easing`). Parts outside 0…1 are not drawn.
  static func segment(phase: Double, easing: TanreiCubicBezier) -> ClosedRange<Double> {
    let start = -segmentLength + (1 + segmentLength) * TanreiCycleClock.eased(phase, easing)
    return start...(start + segmentLength)
  }

  /// The ring's arc, in fractions of a turn clockwise from the top: it turns once per cycle at constant speed (`easing`
  /// is `sys.motion.easing.linear`).
  static func arc(phase: Double, easing: TanreiCubicBezier) -> ClosedRange<Double> {
    let start = TanreiCycleClock.eased(phase, easing)
    return start...(start + arcLength)
  }
}

// MARK: - Drawing

/// The bar or the ring, determinate or not, drawn from the tokens.
struct TanreiProgressIndicatorChrome: View {
  let variant: TanreiProgressIndicatorVariant
  let size: TanreiProgressIndicatorSize
  /// `nil` while indeterminate.
  let fraction: Double?

  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors

  var body: some View {
    let tokens = system.progressIndicator
    let appearance = TanreiProgressIndicatorAppearance(tokens: tokens, size: size, cornerNone: system.shape.none)
    let track = colors[appearance.track]
    let indicator = colors[appearance.indicator]
    // PRG-6: a value change eases to the new value; a switch between determinate and indeterminate is another view,
    // so it takes effect at once. PRG-7: under Reduce Motion, at once.
    let valueMotion = tokens.valueChange(reduceMotion: reduceMotion)
    switch (variant, fraction) {
    case (.linear, let fraction?):
      TanreiDeterminateBar(fraction: fraction, appearance: appearance, track: track, indicator: indicator)
        .animation(valueMotion, value: fraction)
    case (.linear, nil):
      TanreiCycle(durationMs: tokens.motionCycleDuration) { phase in
        TanreiIndeterminateBar(
          appearance: appearance, track: track, indicator: indicator,
          segment: reduceMotion ? 0...1 : TanreiProgressMotion.segment(phase: phase, easing: tokens.motionCycleEasing),
          opacity: reduceMotion ? TanreiCycleClock.pulseOpacity(phase: phase, easing: tokens.motionCycleEasing) : TanreiIdentity.opacity)
      }
    case (.circular, let fraction?):
      TanreiDeterminateRing(fraction: fraction, appearance: appearance, track: track, indicator: indicator)
        .animation(valueMotion, value: fraction)
    case (.circular, nil):
      TanreiCycle(durationMs: tokens.motionCycleDuration) { phase in
        TanreiRing(
          appearance: appearance, track: track, trackArc: 0...1, indicator: indicator,
          indicatorArc: reduceMotion ? 0...1 : TanreiProgressMotion.arc(phase: phase, easing: system.motion.easing.linear),
          opacity: reduceMotion ? TanreiCycleClock.pulseOpacity(phase: phase, easing: tokens.motionCycleEasing) : TanreiIdentity.opacity)
      }
    }
  }
}

/// One stretch of a bar, `range` of its length (fractions; parts outside 0…1 are not drawn), with rounded ends.
private struct TanreiBarStretch: Shape {
  var range: ClosedRange<Double>
  let cornerRadius: CGFloat

  func path(in rect: CGRect) -> Path {
    let start = max(0, range.lowerBound), end = min(1, range.upperBound)
    guard end > start else { return Path() }
    let stretch = CGRect(x: rect.minX + rect.width * start, y: rect.minY, width: rect.width * (end - start), height: rect.height)
    return RoundedRectangle(cornerRadius: cornerRadius).path(in: stretch)
  }
}

/// PRG-1, PRG-3, PRG-4, PRG-5: the determinate bar, animatable in its fraction (PRG-6). Right to left, SwiftUI draws
/// it mirrored, as it draws every shape: it fills from the right (PRG-13).
private struct TanreiDeterminateBar: View, Animatable {
  var fraction: Double
  let appearance: TanreiProgressIndicatorAppearance
  let track: Color
  let indicator: Color

  nonisolated var animatableData: Double {
    get { fraction }
    set { fraction = newValue }
  }

  var body: some View {
    // Shapes measure the bar themselves (no GeometryReader): the gap is in points, the fractions in parts of the length.
    ZStack {
      TanreiBarPart(appearance: appearance, fraction: fraction, part: .track).fill(track)
      TanreiBarPart(appearance: appearance, fraction: fraction, part: .indicator).fill(indicator)
      // PRG-5: the stop indicator, its center half the thickness before the track's end (concentric with a round end).
      TanreiBarPart(appearance: appearance, fraction: fraction, part: .stop).fill(indicator)
    }
    .frame(height: appearance.linearThickness)
  }
}

/// One part of a determinate bar, laid out in the bar's own rect.
private struct TanreiBarPart: Shape {
  enum Part { case track, indicator, stop }
  let appearance: TanreiProgressIndicatorAppearance
  let fraction: Double
  let part: Part

  func path(in rect: CGRect) -> Path {
    let parts = appearance.barParts(fraction: fraction, length: rect.width)
    switch part {
    case .track:
      return parts.track.map { TanreiBarStretch(range: $0, cornerRadius: appearance.barCornerRadius).path(in: rect) } ?? Path()
    case .indicator:
      return parts.indicator.map { TanreiBarStretch(range: $0, cornerRadius: appearance.barCornerRadius).path(in: rect) } ?? Path()
    case .stop:
      let size = appearance.stopIndicatorSize
      guard size > 0 else { return Path() }
      let center = CGPoint(x: rect.maxX - appearance.linearThickness / 2, y: rect.midY)
      return Path(ellipseIn: CGRect(x: center.x - size / 2, y: center.y - size / 2, width: size, height: size))
    }
  }
}

/// PRG-2, PRG-7: the indeterminate bar — the track, and the moving segment (or, under Reduce Motion, the whole track
/// at the pulse's opacity). Mirrored right to left, as SwiftUI draws every shape: the segment moves from right to left
/// (PRG-13).
private struct TanreiIndeterminateBar: View {
  let appearance: TanreiProgressIndicatorAppearance
  let track: Color
  let indicator: Color
  let segment: ClosedRange<Double>
  let opacity: Double

  var body: some View {
    ZStack {
      TanreiBarStretch(range: 0...1, cornerRadius: appearance.barCornerRadius).fill(track)
      TanreiBarStretch(range: segment, cornerRadius: appearance.barCornerRadius).fill(indicator).opacity(opacity)
    }
    .frame(height: appearance.linearThickness)
  }
}

/// PRG-1, PRG-5: the determinate ring, animatable in its fraction (PRG-6).
private struct TanreiDeterminateRing: View, Animatable {
  var fraction: Double
  let appearance: TanreiProgressIndicatorAppearance
  let track: Color
  let indicator: Color

  nonisolated var animatableData: Double {
    get { fraction }
    set { fraction = newValue }
  }

  var body: some View {
    let parts = appearance.ringParts(fraction: fraction)
    TanreiRing(
      appearance: appearance, track: track, trackArc: parts.track, indicator: indicator, indicatorArc: parts.indicator,
      opacity: TanreiIdentity.opacity)
  }
}

/// A ring whose outer edge fills the size's square (PRG-3): the track's arc and the indicator's arc over it, as
/// fractions of a turn clockwise from the top. Never mirrored (PRG-13): a ring turns clockwise, as a clock does.
private struct TanreiRing: View {
  let appearance: TanreiProgressIndicatorAppearance
  let track: Color
  let trackArc: ClosedRange<Double>?
  let indicator: Color
  let indicatorArc: ClosedRange<Double>?
  let opacity: Double

  var body: some View {
    let style = StrokeStyle(lineWidth: appearance.circularThickness, lineCap: appearance.ringHasRoundCaps ? .round : .butt)
    ZStack {
      if let trackArc {
        TanreiArc(range: trackArc, inset: appearance.circularThickness / 2).stroke(track, style: style)
      }
      if let indicatorArc {
        TanreiArc(range: indicatorArc, inset: appearance.circularThickness / 2).stroke(indicator, style: style).opacity(opacity)
      }
    }
    .frame(width: appearance.circularSize, height: appearance.circularSize)
    // PRG-13: SwiftUI mirrors a shape in a right-to-left layout; a ring is drawn left to right in every direction.
    .environment(\.layoutDirection, .leftToRight)
  }
}

// MARK: - Accessibility

/// PRG-8, PRG-9, PRG-10: the progress role, borrowed from SwiftUI's `ProgressView` (a progress element with a value
/// and a range, or with none — busy — while indeterminate), the label as its name, `valueText` as its value's text, and
/// the frequently-updating trait. Never focusable; nothing is announced.
struct TanreiProgressSemantics: Equatable {
  let value: Double?
  let bounds: ClosedRange<Double>
  /// Replaces the platform's percentage, when given.
  let valueText: String?

  init(progress: TanreiProgress, valueText: String?) {
    value = progress.value
    bounds = progress.bounds
    self.valueText = valueText.flatMap { $0.isEmpty ? nil : $0 }
  }

  var isIndeterminate: Bool { value == nil }

  /// What `ProgressView(value:total:)` is given: the value above the range's start, of the range's length.
  var progressViewValue: (value: Double, total: Double)? {
    value.map { ($0 - bounds.lowerBound, bounds.upperBound - bounds.lowerBound) }
  }
}

private struct TanreiProgressAccessibility: ViewModifier {
  let label: Text
  let semantics: TanreiProgressSemantics

  init(label: Text, progress: TanreiProgress, valueText: String?) {
    self.label = label
    semantics = TanreiProgressSemantics(progress: progress, valueText: valueText)
  }

  func body(content: Content) -> some View {
    content
      .accessibilityRepresentation {
        if let determinate = semantics.progressViewValue {
          ProgressView(value: determinate.value, total: determinate.total) { label }
        } else {
          ProgressView { label }
        }
      }
      .accessibilityLabel(label)
      .modifier(TanreiProgressValueText(text: semantics.valueText))
      .accessibilityAddTraits(.updatesFrequently)
  }
}

/// PRG-8: `valueText` replaces the percentage as the spoken value; without it the percentage stays.
private struct TanreiProgressValueText: ViewModifier {
  let text: String?

  func body(content: Content) -> some View {
    if #available(iOS 18, macOS 15, *) {
      content.accessibilityValue(Text(verbatim: text ?? ""), isEnabled: text != nil)
    } else if let text {
      content.accessibilityValue(Text(verbatim: text))
    } else {
      content
    }
  }
}
