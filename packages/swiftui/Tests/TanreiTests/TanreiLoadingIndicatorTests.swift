import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/loading-indicator.spec.json. Each behavior id (LDG-n) is named next to the test that covers it; the
// parity checker requires every id to appear in this file.
//
// The turning arc is drawn at a fixed phase (`\.tanreiCyclePhase`), so a render is deterministic; the fixtures are
// recorded as LDG-4's `verify` says — with Reduce Motion requested, at the start of a cycle (the whole circle, opaque).
// Accessibility (LDG-5, LDG-6) is tested on the view's semantics here and end to end in the gallery's UI tests.

private let suiteName = "TanreiLoadingIndicatorTests"

/// The snapshot theme with another design system.
@MainActor
private func theme(_ system: TanreiSystem) -> TanreiTheme {
  var theme = Snapshot.theme
  theme.system = system
  return theme
}

/// Device pixel for a point given in layout points from the top-left of the render.
@MainActor
private func pixel(_ bitmap: Bitmap, x: CGFloat, y: CGFloat) -> Bitmap.RGBA {
  bitmap[Int(x * Snapshot.scale), Int(y * Snapshot.scale)]
}

private let light = TanreiSystem.tanrei.colors.light

@MainActor
private func indicator(_ size: TanreiLoadingIndicatorSize = .medium, contained: Bool = false, phase: Double = 0, reduceMotion: Bool = false) -> some View {
  TanreiLoadingIndicator("Loading", size: size, contained: contained)
    .environment(\._accessibilityReduceMotion, reduceMotion)
    .environment(\.tanreiCyclePhase, phase)
}

/// The pixel on the arc's centerline at `turn` (fractions of a turn clockwise from the top), in a box of `box` points
/// whose indicator square is `size` with a stroke of `thickness`.
@MainActor
private func onTheArc(_ bitmap: Bitmap, turn: Double, box: CGFloat, size: CGFloat, thickness: CGFloat) -> Bitmap.RGBA {
  let radius = (size - thickness) / 2
  let center = Snapshot.inset + box / 2
  let angle = 2 * Double.pi * turn
  return pixel(bitmap, x: center + radius * CGFloat(sin(angle)), y: center - radius * CGFloat(cos(angle)))
}

// MARK: - Drawing (LDG-1, LDG-2, LDG-3, LDG-8)

@MainActor
@Suite("TanreiLoadingIndicator drawing")
struct TanreiLoadingIndicatorDrawingTests {
  let tokens = TanreiSystem.tanrei.loadingIndicator
  var mark: Bitmap.RGBA { light[.onSurfaceVariant].rgba8() }
  var surface: Bitmap.RGBA { light[.surface].rgba8() }

  /// LDG-1 — a quarter arc, its outer edge on the indicator's square, turning clockwise from where the phase puts it;
  /// no track.
  @Test("LDG-1 a quarter arc of indicator.thickness, outer edge on indicator.size, and no track", arguments: TanreiLoadingIndicatorSize.core)
  func arc(size: TanreiLoadingIndicatorSize) throws {
    let metrics = tokens.sizes[size]
    let bitmap = try Snapshot.render(indicator(size))
    #expect(CGFloat(bitmap.width) == (metrics.indicatorSize + 2 * Snapshot.inset) * Snapshot.scale)
    // At phase 0 the arc runs from the top a quarter turn clockwise.
    for turn in [0.05, 0.125, 0.2] {
      #expect(onTheArc(bitmap, turn: turn, box: metrics.indicatorSize, size: metrics.indicatorSize, thickness: metrics.indicatorThickness).isClose(to: mark, tolerance: 16), "\(turn)")
    }
    // No track: the rest of the circle is the surface.
    for turn in [0.4, 0.6, 0.8] {
      #expect(onTheArc(bitmap, turn: turn, box: metrics.indicatorSize, size: metrics.indicatorSize, thickness: metrics.indicatorThickness).isClose(to: surface, tolerance: 16), "\(turn)")
    }
    // The stroke is `indicator.thickness` wide and touches the square: along the vertical through the center, at the
    // top.
    let x = Int((Snapshot.inset + metrics.indicatorSize / 2) * Snapshot.scale)
    let top = Int(Snapshot.inset * Snapshot.scale)
    let stroke = (0..<Int(metrics.indicatorSize * Snapshot.scale / 2)).filter { bitmap[x, top + $0].isClose(to: mark, tolerance: 24) }
    #expect(stroke.first == 0)
    #expect(abs(CGFloat(stroke.count) / Snapshot.scale - metrics.indicatorThickness) <= 1 / Snapshot.scale)
  }

  /// LDG-1 — the arc turns once per cycle at constant speed, clockwise.
  @Test("LDG-1 the arc turns clockwise once per cycle at constant speed")
  func turning() throws {
    let linear = TanreiSystem.tanrei.motion.easing.linear
    #expect(TanreiLoadingMotion.arc(phase: 0, easing: linear) == 0...0.25)
    for phase in [0.1, 0.3, 0.5, 0.75, 0.9] {
      let arc = TanreiLoadingMotion.arc(phase: phase, easing: linear)
      #expect(abs(arc.lowerBound - phase) < 1e-6 && abs(arc.upperBound - arc.lowerBound - 0.25) < 1e-9, "\(phase)")
    }
    // Rendered at a quarter of the cycle: the arc is on the right-bottom quarter (3 o'clock to 6 o'clock).
    let metrics = tokens.sizes.large
    let bitmap = try Snapshot.render(indicator(.large, phase: 0.25))
    #expect(onTheArc(bitmap, turn: 0.375, box: metrics.indicatorSize, size: metrics.indicatorSize, thickness: metrics.indicatorThickness).isClose(to: mark, tolerance: 16))
    #expect(onTheArc(bitmap, turn: 0.125, box: metrics.indicatorSize, size: metrics.indicatorSize, thickness: metrics.indicatorThickness).isClose(to: surface, tolerance: 16))
    // Positions at fixed times of a cycle of `motion.cycle-duration`.
    let start = Date(timeIntervalSinceReferenceDate: 0)
    #expect(TanreiCycleClock.phase(at: start.addingTimeInterval(0.4), since: start, durationMs: tokens.motionCycleDuration) == 0.4)
  }

  /// LDG-2 — not contained: exactly the indicator's square, no container, the arc in `indicator.color`.
  @Test("LDG-2 uncontained: exactly the indicator square, no container, indicator.color")
  func uncontained() throws {
    let appearance = TanreiLoadingIndicatorAppearance(tokens: tokens, size: .medium, contained: false)
    #expect(appearance.container == nil && appearance.boxSize == tokens.sizes.medium.indicatorSize)
    #expect(appearance.indicator == tokens.indicatorColor)
    let bitmap = try Snapshot.render(indicator(.medium))
    #expect(CGFloat(bitmap.width) == (tokens.sizes.medium.indicatorSize + 2 * Snapshot.inset) * Snapshot.scale)
    // Inside the circle: nothing drawn.
    let center = Snapshot.inset + tokens.sizes.medium.indicatorSize / 2
    #expect(pixel(bitmap, x: center, y: center).isClose(to: surface))
  }

  /// LDG-3 — contained: a container of `container.size` with `container.shape`, in the contained color, raised; the
  /// indicator centered on it in the contained indicator color.
  @Test("LDG-3 contained: the container's size, shape, color and elevation; the indicator centered on it", arguments: TanreiLoadingIndicatorSize.core)
  func contained(size: TanreiLoadingIndicatorSize) throws {
    let metrics = tokens.sizes[size]
    let appearance = TanreiLoadingIndicatorAppearance(tokens: tokens, size: size, contained: true)
    #expect(appearance.container == .init(size: metrics.containerSize, cornerRadius: tokens.containerShape, color: tokens.containedContainerColor, elevation: tokens.containedContainerElevation))
    #expect(appearance.indicator == tokens.containedIndicatorColor && appearance.boxSize == metrics.containerSize)

    var custom = TanreiSystem.tanrei
    custom.loadingIndicator.containedContainerColor = .role(.primaryContainer)
    custom.loadingIndicator.containedIndicatorColor = .role(.error)
    custom.loadingIndicator.containedContainerElevation = []  // flat, so the container's edge is exact
    let bitmap = try Snapshot.render(indicator(size, contained: true), theme: theme(custom))
    #expect(CGFloat(bitmap.width) == (metrics.containerSize + 2 * Snapshot.inset) * Snapshot.scale)
    let fill = light[.primaryContainer].rgba8()
    let center = Snapshot.inset + metrics.containerSize / 2
    #expect(pixel(bitmap, x: center, y: center).isClose(to: fill))
    // The mark is centered in the container: its top is (container − indicator) / 2 below the container's top.
    let margin = (metrics.containerSize - metrics.indicatorSize) / 2
    #expect(onTheArc(bitmap, turn: 0.1, box: metrics.containerSize, size: metrics.indicatorSize, thickness: metrics.indicatorThickness).isClose(to: light[.error].rgba8(), tolerance: 16))
    #expect(pixel(bitmap, x: center, y: Snapshot.inset + margin / 2).isClose(to: fill))
    // Full corners: the container's bounding-box corner is not filled.
    #expect(!pixel(bitmap, x: Snapshot.inset + 0.5, y: Snapshot.inset + 0.5).isClose(to: fill, tolerance: 8))
    #expect(pixel(bitmap, x: center, y: Snapshot.inset + 0.5).isClose(to: fill, tolerance: 8))
  }

  /// LDG-3 — the container is raised by `contained.container.elevation`: its shadow is below it.
  @Test("LDG-3 the contained container casts its elevation's shadow")
  func elevation() throws {
    let metrics = tokens.sizes.large
    let raised = try Snapshot.render(indicator(.large, contained: true))
    var flatSystem = TanreiSystem.tanrei
    flatSystem.loadingIndicator.containedContainerElevation = []
    let flat = try Snapshot.render(indicator(.large, contained: true), theme: theme(flatSystem))
    // Outside the container, the raised render differs from the flat one (the level's ring and shadow); inside, the
    // container is the same.
    #expect(raised.mismatch(against: flat, channelTolerance: 0) > 0)
    let below = CGPoint(x: Snapshot.inset + metrics.containerSize / 2, y: Snapshot.inset + metrics.containerSize + 1)
    #expect(pixel(flat, x: below.x, y: below.y).isClose(to: surface, tolerance: 0))
    #expect(pixel(raised, x: below.x, y: below.y) != pixel(flat, x: below.x, y: below.y))
    let center = Snapshot.inset + metrics.containerSize / 2
    #expect(pixel(raised, x: center, y: center) == pixel(flat, x: center, y: center))
  }

  /// LDG-8 — right to left, nothing is mirrored: the arc turns clockwise from the top in every direction.
  @Test("LDG-8 right-to-left draws exactly the same pixels", arguments: [false, true])
  func rightToLeft(contained: Bool) throws {
    for phase in [0.1, 0.6] {
      let ltr = try Snapshot.renderExact(indicator(.large, contained: contained, phase: phase))
      let rtl = try Snapshot.renderExact(indicator(.large, contained: contained, phase: phase).environment(\.layoutDirection, .rightToLeft))
      #expect(rtl.mismatch(against: ltr, channelTolerance: 0) == 0, "\(phase)")
    }
  }
}

// MARK: - Reduced motion and visibility (LDG-4, LDG-7)

@MainActor
@Suite("TanreiLoadingIndicator motion")
struct TanreiLoadingIndicatorMotionTests {
  let tokens = TanreiSystem.tanrei.loadingIndicator
  var mark: Bitmap.RGBA { light[.onSurfaceVariant].rgba8() }

  /// LDG-4 — Reduce Motion: no turning; the whole circle at the indicator's size and stroke, its opacity easing
  /// 1 → 0 → 1 once per cycle with `sys.motion.easing.standard`; the container stays still and opaque.
  @Test("LDG-4 under Reduce Motion the whole circle pulses and the container stays")
  func reducedMotion() throws {
    let standard = TanreiSystem.tanrei.motion.easing.standard
    #expect(TanreiCycleClock.pulseOpacity(phase: 0, easing: standard) == 1)
    #expect(abs(TanreiCycleClock.pulseOpacity(phase: 0.5, easing: standard)) < 1e-9)
    #expect(abs(TanreiCycleClock.pulseOpacity(phase: 0.25, easing: standard) - (1 - TanreiCycleClock.eased(0.5, standard))) < 1e-9)

    let metrics = tokens.sizes.large
    let start = try Snapshot.render(indicator(.large, phase: 0, reduceMotion: true))
    for turn in stride(from: 0.05, to: 1, by: 0.1) {
      #expect(onTheArc(start, turn: turn, box: metrics.indicatorSize, size: metrics.indicatorSize, thickness: metrics.indicatorThickness).isClose(to: mark, tolerance: 16), "\(turn)")
    }
    // Mid-cycle the circle is invisible; the phase does not move anything (two phases with the same opacity match).
    let middle = try Snapshot.render(indicator(.large, phase: 0.5, reduceMotion: true))
    #expect(onTheArc(middle, turn: 0.1, box: metrics.indicatorSize, size: metrics.indicatorSize, thickness: metrics.indicatorThickness).isClose(to: light[.surface].rgba8(), tolerance: 2))
    // Nothing turns: at the end of a cycle (opacity back to about 1) the circle is where it was at the start.
    let end = try Snapshot.render(indicator(.large, phase: 0.9999, reduceMotion: true))
    #expect(end.mismatch(against: start, channelTolerance: Snapshot.channelTolerance) <= Snapshot.allowedMismatch)

    // The container stays still and opaque at every phase.
    let containerColor = light[.surfaceContainerLowest].rgba8()
    for phase in [0, 0.5] {
      let bitmap = try Snapshot.render(indicator(.large, contained: true, phase: phase, reduceMotion: true))
      let center = Snapshot.inset + metrics.containerSize / 2
      #expect(pixel(bitmap, x: center, y: center).isClose(to: containerColor), "\(phase)")
    }
  }

  /// LDG-7 — the loop runs only while in the hierarchy and scrolled into view (the shared `TanreiCycle`).
  @Test("LDG-7 the animation runs only while visible")
  func visibility() {
    #expect(TanreiCycleVisibility().isRunning)
    #expect(!TanreiCycleVisibility(isInHierarchy: false, isScrolledIntoView: true).isRunning)
    #expect(!TanreiCycleVisibility(isInHierarchy: true, isScrolledIntoView: false).isRunning)
  }

  #if os(macOS)
  /// LDG-1 LDG-7 — on screen, the arc turns: a moment later it is somewhere else.
  @Test("LDG-1 LDG-7 on screen, the arc turns")
  func turnsOnScreen() async throws {
    let hosted = HostedView(TanreiLoadingIndicator("Loading", size: .large).padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    let first = try #require(hosted.bitmap())
    try await Task.sleep(for: .milliseconds(230))
    hosted.settle()
    let second = try #require(hosted.bitmap())
    #expect(first.mismatch(against: second, channelTolerance: 3) > 0)
  }
  #endif
}

// MARK: - Accessibility and unknown values (LDG-5, LDG-6, LDG-9, LDG-10)

@MainActor
@Suite("TanreiLoadingIndicator semantics")
struct TanreiLoadingIndicatorSemanticsTests {
  let tokens = TanreiSystem.tanrei.loadingIndicator

  /// LDG-5 LDG-6 — the progress role in its busy state with the label as its name and no value, never focusable,
  /// never announcing: the view borrows an indeterminate `ProgressView`'s semantics (checked on the simulator by the
  /// gallery's UI tests). Here: the semantics change nothing that is drawn.
  @Test("LDG-5 LDG-6 the semantics change nothing that is drawn")
  func semanticsDoNotDraw() throws {
    let labelled = try Snapshot.renderExact(indicator(.large, phase: 0.3))
    let chrome = try Snapshot.renderExact(
      TanreiLoadingIndicatorChrome(size: .large, contained: false).environment(\.tanreiCyclePhase, 0.3).environment(\._accessibilityReduceMotion, false))
    #expect(labelled.mismatch(against: chrome, channelTolerance: 0) == 0)
  }

  /// LDG-10 — an empty label is reported, and the indicator still renders.
  @Test("LDG-10 an empty label is reported and the indicator still renders")
  func emptyLabel() throws {
    let (_, reports) = Reports.collecting {
      _ = TanreiLoadingIndicator("")
      _ = TanreiLoadingIndicator(LocalizedStringKey(""), contained: true)
    }
    #expect(reports.messages.count == 2 && reports.mention("empty label") && reports.mention("LDG-10"))
    let (_, silent) = Reports.collecting { _ = TanreiLoadingIndicator("Loading") }
    #expect(silent.messages.isEmpty)
    let (bitmap, _) = try Reports.collecting { try Snapshot.render(TanreiLoadingIndicator("").environment(\.tanreiCyclePhase, 0)) }
    #expect(CGFloat(bitmap.width) == (tokens.sizes.medium.indicatorSize + 2 * Snapshot.inset) * Snapshot.scale)
  }

  @Test("the size axis is the spec's: small/medium/large, default medium")
  func axis() {
    #expect(TanreiLoadingIndicatorSize.core == [.small, .medium, .large] && TanreiLoadingIndicatorSize.fallback == .medium)
  }

  /// LDG-9 — a size the system does not have reads the default size's tokens and is reported; one it adds is used.
  @Test("LDG-9 an unknown size renders the default and is reported; an added size is used")
  func unknownSize() throws {
    let unknown = TanreiLoadingIndicatorSize(rawValue: "colossal")
    let (appearance, reports) = Reports.collecting { TanreiLoadingIndicatorAppearance(tokens: tokens, size: unknown, contained: true) }
    #expect(appearance == TanreiLoadingIndicatorAppearance(tokens: tokens, size: .medium, contained: true))
    #expect(reports.mention("loading-indicator size \"colossal\""))
    let expected = try Snapshot.renderExact(indicator(.medium, contained: true, phase: 0.2))
    let (actual, _) = try Reports.collecting { try Snapshot.renderExact(indicator(unknown, contained: true, phase: 0.2)) }
    #expect(actual.mismatch(against: expected, channelTolerance: 0) == 0)

    var custom = tokens
    custom.sizes.extra[unknown] = TanreiLoadingIndicatorSizeTokens(indicatorSize: 64, indicatorThickness: 6, containerSize: 80)
    let (added, silent) = Reports.collecting { TanreiLoadingIndicatorAppearance(tokens: custom, size: unknown, contained: true) }
    #expect(added.indicatorSize == 64 && added.thickness == 6 && added.boxSize == 80 && silent.messages.isEmpty)
  }
}

// MARK: - Token bindings

@MainActor
@Suite("TanreiLoadingIndicator token bindings")
struct TanreiLoadingIndicatorTokenBindingTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiLoadingIndicatorTokens { system.loadingIndicator }

  /// The default system's values.
  @Test("LDG-1 LDG-3 the default system's values")
  func defaults() {
    let sizes = tokens.sizes
    #expect([sizes.small, sizes.medium, sizes.large].map(\.indicatorSize) == [16, 24, 40])
    #expect([sizes.small, sizes.medium, sizes.large].map(\.containerSize) == [24, 32, 48])
    #expect([sizes.small, sizes.medium, sizes.large].map(\.indicatorThickness) == [2, 2, 2].map { _ in system.measure.borderThick })
    #expect(tokens.indicatorColor == .role(.onSurfaceVariant) && tokens.containedIndicatorColor == .role(.onSurfaceVariant))
    #expect(tokens.containedContainerColor == .role(.surfaceContainerLowest) && tokens.containedContainerElevation == system.elevation.level2)
    #expect(tokens.containerShape == system.shape.full && tokens.motionCycleDuration == system.motion.duration.extraLong4)
  }

  @Test("the paints resolve to the generated colors in light and dark")
  func colorsInLightAndDark() {
    for (appearance, scheme) in [(TanreiAppearance.light, system.colors.light), (.dark, system.colors.dark)] {
      let colors = TanreiTheme(appearance: appearance, contrast: .standard).colors(systemScheme: .light, systemContrast: .standard)
      #expect(tokens.indicatorColor.resolve(in: colors) == scheme.value(.onSurfaceVariant))
      #expect(tokens.containedContainerColor.resolve(in: colors) == scheme.value(.surfaceContainerLowest))
    }
  }

  /// The values drive the result.
  @Test("LDG-1 LDG-2 a modified system changes what is drawn")
  func modifiedSystem() throws {
    var custom = system
    custom.loadingIndicator.indicatorColor = .role(.error)
    custom.loadingIndicator.sizes.medium.indicatorSize = 30
    custom.loadingIndicator.sizes.medium.indicatorThickness = 4
    let bitmap = try Snapshot.render(indicator(.medium), theme: theme(custom))
    #expect(CGFloat(bitmap.width) == (30 + 2 * Snapshot.inset) * Snapshot.scale)
    #expect(onTheArc(bitmap, turn: 0.125, box: 30, size: 30, thickness: 4).isClose(to: light[.error].rgba8(), tolerance: 16))
  }

  @Test("LDG-2 the dark scheme draws the dark indicator color")
  func darkRender() throws {
    var dark = Snapshot.theme
    dark.appearance = .dark
    let metrics = tokens.sizes.large
    let bitmap = try Snapshot.render(indicator(.large), theme: dark)
    #expect(onTheArc(bitmap, turn: 0.125, box: metrics.indicatorSize, size: metrics.indicatorSize, thickness: metrics.indicatorThickness).isClose(to: system.colors.dark[.onSurfaceVariant].rgba8(), tolerance: 16))
  }
}

// MARK: - Presets

@MainActor
@Suite("TanreiLoadingIndicator under the shipped presets")
struct TanreiLoadingIndicatorPresetTests {
  /// The presets' values (m3-like's contained circles are 32 / 48 / 56 around marks of 24 / 38 / 48).
  @Test("LDG-1 LDG-3 the presets' own values reach the loading indicator")
  func presetValues() throws {
    let m3 = TanreiSystem.m3Like.loadingIndicator
    #expect([m3.sizes.small, m3.sizes.medium, m3.sizes.large].map(\.indicatorSize) == [24, 38, 48])
    #expect([m3.sizes.small, m3.sizes.medium, m3.sizes.large].map(\.containerSize) == [32, 48, 56])
    #expect(m3.sizes.medium.indicatorThickness == 4 && m3.indicatorColor == .role(.primary))
    // Every shipped system's mark fits its container.
    for shipped in ShippedSystem.allCases {
      for size in shipped.system.loadingIndicator.sizes.keys {
        let metrics = shipped.system.loadingIndicator.sizes[size]
        #expect(metrics.indicatorSize <= metrics.containerSize, "\(shipped.rawValue) \(size.rawValue)")
      }
    }
    #expect(m3.containedContainerColor == .role(.primaryContainer) && m3.containedIndicatorColor == .role(.onPrimaryContainer))
    #expect(m3.containedContainerElevation == TanreiSystem.m3Like.elevation.level0)
    let cupertino = TanreiSystem.cupertino.loadingIndicator
    #expect(cupertino.sizes.medium.indicatorSize == 20 && cupertino.sizes.large.indicatorSize == 36)
    // Rendered: m3-like's contained medium is its 48-point container.
    let bitmap = try Snapshot.render(indicator(.medium, contained: true), theme: theme(.m3Like))
    #expect(CGFloat(bitmap.width) == (48 + 2 * Snapshot.inset) * Snapshot.scale)
  }
}

// MARK: - Snapshots (one per spec fixture)

@MainActor
@Suite("TanreiLoadingIndicator snapshots")
struct TanreiLoadingIndicatorSnapshotTests {
  struct Fixture: Sendable, CustomTestStringConvertible {
    let id: String
    var size: TanreiLoadingIndicatorSize = .medium
    var contained = false
    var testDescription: String { id }
  }

  /// Mirrors `fixtures` in specs/loading-indicator.spec.json (label "Loading").
  nonisolated static let fixtures: [Fixture] = [
    Fixture(id: "small", size: .small),
    Fixture(id: "medium"),
    Fixture(id: "large", size: .large),
    Fixture(id: "contained-small", size: .small, contained: true),
    Fixture(id: "contained-medium", contained: true),
    Fixture(id: "contained-large", size: .large, contained: true),
  ]

  /// The fixture as a product writes it, recorded as LDG-4's `verify` says: Reduce Motion, at the start of a cycle.
  static func view(_ fixture: Fixture) -> some View {
    indicator(fixture.size, contained: fixture.contained, phase: 0, reduceMotion: true)
  }

  @Test("fixture matches its baseline", arguments: fixtures)
  func fixture(_ fixture: Fixture) throws {
    try Snapshot.assert(Self.view(fixture), named: fixture.id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    let spec = try SpecFixture.load(spec: "loading-indicator")
    #expect(spec.map(\.id) == Self.fixtures.map(\.id))
    for (theirs, ours) in zip(spec, Self.fixtures) {
      #expect((theirs.string("size") ?? "medium") == ours.size.rawValue, "\(ours.id)")
      #expect((theirs.bool("contained") ?? false) == ours.contained, "\(ours.id)")
      #expect(theirs.string("label") == "Loading", "\(ours.id)")
    }
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiLoadingIndicatorTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiLoadingIndicator preset snapshots")
struct TanreiLoadingIndicatorPresetSnapshotTests {
  /// The contained medium indicator: it shows the preset's mark size and stroke, container size, color and elevation.
  nonisolated static let fixtureId = "contained-medium"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiLoadingIndicatorSnapshotTests.fixtures.contains { $0.id == Self.fixtureId })
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try #require(TanreiLoadingIndicatorSnapshotTests.fixtures.first { $0.id == Self.fixtureId })
    try Snapshot.assert(TanreiLoadingIndicatorSnapshotTests.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
