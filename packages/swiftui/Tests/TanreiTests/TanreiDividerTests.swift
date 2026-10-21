import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/divider.spec.json. Each behavior id (DIV-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file.
//
// A divider fills what its layout gives it, so every render here places it in a container of a fixed size (the
// `length` below — a test constant, not a design value): a horizontal divider in a container `length` wide, a vertical
// one in a container `length` high. Accessibility (DIV-5, DIV-6) is tested on the semantics value the view applies, and
// end to end in the gallery's UI tests (the macOS accessibility tree is not available to unit tests).

private let suiteName = "TanreiDividerTests"

@MainActor
private final class Counter {
  var count = 0
}

/// The container a divider is rendered in: its length along the divider's axis, in points.
private let length: CGFloat = 120

/// The snapshot theme with another design system.
@MainActor
private func theme(_ system: TanreiSystem) -> TanreiTheme {
  var theme = Snapshot.theme
  theme.system = system
  return theme
}

/// A divider in its container: `length` along its axis.
@MainActor
private func placed(_ divider: TanreiDivider, axis: Axis) -> some View {
  divider.frame(width: axis == .horizontal ? length : nil, height: axis == .vertical ? length : nil)
}

/// Device pixel for a point given in layout points from the top-left of the render.
@MainActor
private func pixel(_ bitmap: Bitmap, x: CGFloat, y: CGFloat) -> Bitmap.RGBA {
  bitmap[Int(x * Snapshot.scale), Int(y * Snapshot.scale)]
}

/// `outline-variant` is a translucent role (black at a low alpha in Tanrei): the line is that color over the surface.
@MainActor
private var lineColor: Bitmap.RGBA { TanreiSystem.tanrei.colors.light[.outlineVariant].rgba8(over: TanreiSystem.tanrei.colors.light[.surface]) }
@MainActor
private var surface: Bitmap.RGBA { TanreiSystem.tanrei.colors.light[.surface].rgba8() }

/// The device pixels along the line's axis, one per pixel of the container, on the row (or column) through the line.
@MainActor
private func alongTheLine(_ bitmap: Bitmap, axis: Axis) -> [Bitmap.RGBA] {
  let start = Int(Snapshot.inset * Snapshot.scale)
  let count = Int(length * Snapshot.scale)
  return (0..<count).map { i in axis == .horizontal ? bitmap[start + i, start] : bitmap[start, start + i] }
}

// MARK: - Geometry (DIV-1, DIV-2, DIV-3, DIV-4, DIV-8)

@MainActor
@Suite("TanreiDivider geometry")
struct TanreiDividerGeometryTests {
  let tokens = TanreiSystem.tanrei.divider

  /// DIV-1 — one straight line in the line color along the whole length of its container, on either axis.
  @Test("DIV-1 the line spans the container's full length in comp.divider.line.color", arguments: [Axis.horizontal, .vertical])
  func fullLength(axis: Axis) throws {
    let bitmap = try Snapshot.render(placed(TanreiDivider(axis: axis), axis: axis))
    let line = alongTheLine(bitmap, axis: axis)
    #expect(line.allSatisfy { $0.isClose(to: lineColor) }, "\(axis)")
    // Nothing beyond the container: the padding around the render is surface.
    let beyond = Snapshot.inset + length + 1
    #expect(pixel(bitmap, x: axis == .horizontal ? beyond : Snapshot.inset, y: axis == .horizontal ? Snapshot.inset : beyond).isClose(to: surface))
    #expect(pixel(bitmap, x: Snapshot.inset / 2, y: Snapshot.inset / 2).isClose(to: surface))
  }

  /// DIV-2 — exactly `line.thickness` across and no margin or padding of its own: the render is the container's length
  /// by the thickness (plus the snapshot's own padding), and in a stack with no spacing the line touches its neighbours.
  @Test("DIV-2 the divider takes exactly the line thickness across and adds no space", arguments: [Axis.horizontal, .vertical])
  func crossAxis(axis: Axis) throws {
    let bitmap = try Snapshot.render(placed(TanreiDivider(axis: axis), axis: axis))
    let across = (tokens.lineThickness + 2 * Snapshot.inset) * Snapshot.scale
    let along = (length + 2 * Snapshot.inset) * Snapshot.scale
    #expect(CGFloat(axis == .horizontal ? bitmap.height : bitmap.width) == across)
    #expect(CGFloat(axis == .horizontal ? bitmap.width : bitmap.height) == along)

    // Between two blocks in a stack with no spacing: block, line, block, with nothing in between.
    let colors = TanreiSystem.tanrei.colors.light
    let block = Rectangle().fill(colors[.primary]).frame(width: 8, height: 8)
    let stacked = try Snapshot.render(
      VStack(spacing: 0) { block; TanreiDivider().frame(width: 8); block })
    let x = Snapshot.inset + 4
    let thickness = tokens.lineThickness
    #expect(pixel(stacked, x: x, y: Snapshot.inset + 8 - 0.25).isClose(to: colors[.primary].rgba8()))
    #expect(pixel(stacked, x: x, y: Snapshot.inset + 8 + thickness / 2).isClose(to: lineColor))
    #expect(pixel(stacked, x: x, y: Snapshot.inset + 8 + thickness + 0.25).isClose(to: colors[.primary].rgba8()))
    #expect(CGFloat(stacked.height) == (16 + thickness + 2 * Snapshot.inset) * Snapshot.scale)
  }

  /// DIV-3 — inset start leaves `line.inset` undrawn at the start (the leading end of a horizontal divider, the top of a
  /// vertical one); inset both at each end. The inset stretch draws nothing.
  @Test("DIV-3 start shortens the line at its start, both at each end", arguments: [Axis.horizontal, .vertical])
  func insets(axis: Axis) throws {
    let inset = Int(tokens.lineInset * Snapshot.scale)
    let count = Int(length * Snapshot.scale)
    for (kind, undrawnAtStart, undrawnAtEnd) in [(TanreiDividerInset.none, 0, 0), (.start, inset, 0), (.both, inset, inset)] {
      let line = alongTheLine(try Snapshot.render(placed(TanreiDivider(axis: axis, inset: kind), axis: axis)), axis: axis)
      for (i, pixel) in line.enumerated() {
        let drawn = i >= undrawnAtStart && i < count - undrawnAtEnd
        #expect(pixel.isClose(to: drawn ? lineColor : surface), "\(axis) \(kind) pixel \(i)")
      }
    }
  }

  /// DIV-4 — right-to-left: a horizontal divider's start inset is at its right end; a vertical divider's does not move.
  @Test("DIV-4 right-to-left moves a horizontal start inset to the right end, never a vertical one")
  func rightToLeft() throws {
    let inset = Int(tokens.lineInset * Snapshot.scale)
    let count = Int(length * Snapshot.scale)
    let horizontal = alongTheLine(
      try Snapshot.render(placed(TanreiDivider(inset: .start), axis: .horizontal).environment(\.layoutDirection, .rightToLeft)), axis: .horizontal)
    for (i, pixel) in horizontal.enumerated() {
      #expect(pixel.isClose(to: i < count - inset ? lineColor : surface), "pixel \(i)")
    }
    // Vertical: the same pixels in either direction (bit-stable render), inset at the top.
    for kind in TanreiDividerInset.allCases {
      let ltr = try Snapshot.renderExact(placed(TanreiDivider(axis: .vertical, inset: kind), axis: .vertical))
      let rtl = try Snapshot.renderExact(placed(TanreiDivider(axis: .vertical, inset: kind), axis: .vertical).environment(\.layoutDirection, .rightToLeft))
      #expect(rtl.mismatch(against: ltr, channelTolerance: 0) == 0, "\(kind)")
    }
    // And a horizontal divider with no inset or both insets is symmetrical: nothing to mirror.
    for kind in [TanreiDividerInset.none, .both] {
      let ltr = try Snapshot.renderExact(placed(TanreiDivider(inset: kind), axis: .horizontal))
      let rtl = try Snapshot.renderExact(placed(TanreiDivider(inset: kind), axis: .horizontal).environment(\.layoutDirection, .rightToLeft))
      #expect(rtl.mismatch(against: ltr, channelTolerance: 0) == 0, "\(kind)")
    }
  }

  /// DIV-8 — the thickness is a whole number of device pixels, never below one.
  @Test("DIV-8 the thickness snaps to whole device pixels, at least one")
  func snapping() {
    #expect(TanreiDividerAppearance.snapped(1, displayScale: 2) == 1)
    #expect(TanreiDividerAppearance.snapped(1, displayScale: 3) == 1)
    #expect(TanreiDividerAppearance.snapped(0.3, displayScale: 2) == 0.5)  // one device pixel, not 0.6 of one
    #expect(TanreiDividerAppearance.snapped(0.3, displayScale: 3) == CGFloat(1) / 3)
    #expect(TanreiDividerAppearance.snapped(0, displayScale: 2) == 0.5)  // never thinner than a device pixel
    #expect(TanreiDividerAppearance.snapped(0.75, displayScale: 2) == 1)  // 1.5 px → 2 px
    #expect(TanreiDividerAppearance.snapped(1.2, displayScale: 3) == CGFloat(4) / 3)  // 3.6 px → 4 px
    #expect(TanreiDividerAppearance.snapped(2, displayScale: 1) == 2)
  }

  /// DIV-8 — rendered: a thickness of a fraction of a pixel, placed at a fractional position, is one whole row of
  /// device pixels in the full line color: no row of the line is a partial blend with the surface.
  @Test("DIV-8 a sub-pixel line at a sub-pixel position draws whole device pixels", arguments: [CGFloat(0), 0.3, 0.7, 1.25])
  func pixelGrid(offset: CGFloat) throws {
    var system = TanreiSystem.tanrei
    system.divider.lineThickness = 0.3
    let view = placed(TanreiDivider(), axis: .horizontal)
      .padding(.top, offset)
      .environment(\.displayScale, Snapshot.scale)
    let bitmap = try Snapshot.render(view, theme: theme(system))
    let x = Int((Snapshot.inset + length / 2) * Snapshot.scale)
    // The render's own last row is partly outside a view of fractional height; only the rows the view covers count.
    let covered = Int(((2 * Snapshot.inset + offset + 0.5) * Snapshot.scale).rounded(.down))
    let column = (0..<covered).map { bitmap[x, $0] }
    let full = column.filter { $0.isClose(to: lineColor) }.count
    let partial = column.filter { !$0.isClose(to: lineColor) && !$0.isClose(to: surface) }.count
    #expect(full == 1, "offset \(offset): \(full) full rows")
    #expect(partial == 0, "offset \(offset): \(partial) blended rows")
  }

  /// DIV-8 — the display scale the view is shown at is the one it snaps to.
  @Test("DIV-8 the divider reads the display scale of its environment")
  func readsDisplayScale() throws {
    var system = TanreiSystem.tanrei
    system.divider.lineThickness = 0.3
    // At 1× a device pixel is a point: the line is 1pt thick, so the render (at 2×) is two rows taller than at 2×.
    let atOne = try Snapshot.render(placed(TanreiDivider(), axis: .horizontal).environment(\.displayScale, 1), theme: theme(system))
    let atTwo = try Snapshot.render(placed(TanreiDivider(), axis: .horizontal).environment(\.displayScale, 2), theme: theme(system))
    #expect(atOne.height == Int((1 + 2 * Snapshot.inset) * Snapshot.scale))
    #expect(atTwo.height == Int((0.5 + 2 * Snapshot.inset) * Snapshot.scale))
  }
}

// MARK: - Token bindings

@MainActor
@Suite("TanreiDivider token bindings")
struct TanreiDividerTokenBindingTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiDividerTokens { system.divider }

  /// The default system's values: outline-variant, the hairline, the 16-point list inset.
  @Test("DIV-1 DIV-3 the default system binds outline-variant, sys.border.hairline and sys.space.space200")
  func defaults() {
    #expect(tokens.lineColor == .role(.outlineVariant))
    #expect(tokens.lineThickness == system.measure.borderHairline)
    #expect(tokens.lineInset == system.space.space200)
    for axis in [Axis.horizontal, .vertical] {
      for inset in TanreiDividerInset.allCases {
        let appearance = TanreiDividerAppearance(tokens: tokens, axis: axis, inset: inset, displayScale: 2)
        #expect(appearance.color == tokens.lineColor)
        #expect(appearance.thickness == tokens.lineThickness)
        #expect(appearance.inset == (inset == .none ? 0 : tokens.lineInset))
      }
    }
    #expect(TanreiDividerAppearance(tokens: tokens, axis: .horizontal, inset: .start, displayScale: 2).insetEdges == .leading)
    #expect(TanreiDividerAppearance(tokens: tokens, axis: .vertical, inset: .start, displayScale: 2).insetEdges == .top)
    #expect(TanreiDividerAppearance(tokens: tokens, axis: .horizontal, inset: .both, displayScale: 2).insetEdges == .horizontal)
    #expect(TanreiDividerAppearance(tokens: tokens, axis: .vertical, inset: .both, displayScale: 2).insetEdges == .vertical)
    #expect(TanreiDividerAppearance(tokens: tokens, axis: .vertical, inset: .none, displayScale: 2).insetEdges == [])
  }

  @Test("the line color resolves to the generated colors in light and dark")
  func colorsInLightAndDark() {
    for (appearance, scheme) in [(TanreiAppearance.light, system.colors.light), (.dark, system.colors.dark)] {
      let colors = TanreiTheme(appearance: appearance, contrast: .standard).colors(systemScheme: .light, systemContrast: .standard)
      #expect(tokens.lineColor.resolve(in: colors) == scheme.value(.outlineVariant))
    }
  }

  /// The values drive the result: a modified system changes the drawn color, thickness and inset.
  @Test("DIV-1 DIV-2 DIV-3 a modified system changes the color, thickness and inset drawn")
  func modifiedSystem() throws {
    var custom = system
    custom.divider.lineColor = .role(.error)
    custom.divider.lineThickness = 4
    custom.divider.lineInset = 40
    let bitmap = try Snapshot.render(placed(TanreiDivider(inset: .start), axis: .horizontal), theme: theme(custom))
    let error = custom.colors.light[.error].rgba8(over: custom.colors.light[.surface])
    #expect(CGFloat(bitmap.height) == (4 + 2 * Snapshot.inset) * Snapshot.scale)
    #expect(pixel(bitmap, x: Snapshot.inset + 40 - 1, y: Snapshot.inset + 2).isClose(to: surface))
    #expect(pixel(bitmap, x: Snapshot.inset + 40 + 1, y: Snapshot.inset + 2).isClose(to: error))
    #expect(pixel(bitmap, x: Snapshot.inset + length - 1, y: Snapshot.inset + 3.5).isClose(to: error))
  }

  /// The dark scheme draws the dark outline-variant.
  @Test("DIV-1 the dark scheme draws the dark line color")
  func darkRender() throws {
    var dark = Snapshot.theme
    dark.appearance = .dark
    let bitmap = try Snapshot.render(placed(TanreiDivider(), axis: .horizontal), theme: dark)
    #expect(pixel(bitmap, x: Snapshot.inset + length / 2, y: Snapshot.inset + 0.25).isClose(to: system.colors.dark[.outlineVariant].rgba8(over: system.colors.dark[.surface])))
  }
}

// MARK: - Accessibility (DIV-5, DIV-6)

@MainActor
@Suite("TanreiDivider accessibility")
struct TanreiDividerAccessibilityTests {
  /// DIV-5 — decorative (the default): hidden from assistive technology, not focusable.
  @Test("DIV-5 a decorative divider is hidden and not focusable")
  func decorative() {
    #expect(TanreiDividerSemantics(isDecorative: true, axis: .horizontal) == .hidden)
    #expect(TanreiDividerSemantics(isDecorative: true, axis: .vertical) == .hidden)
    #expect(!TanreiDividerSemantics.hidden.isFocusable)
  }

  /// DIV-6 — not decorative: an element of its own that exposes its orientation, with no name, not focusable.
  @Test("DIV-6 a divider that is not decorative exposes its orientation, has no name and is not focusable")
  func separator() {
    #expect(TanreiDividerSemantics(isDecorative: false, axis: .horizontal) == .separator(.horizontal))
    #expect(TanreiDividerSemantics(isDecorative: false, axis: .vertical) == .separator(.vertical))
    #expect(!TanreiDividerSemantics.separator(.horizontal).isFocusable)
  }

  /// DIV-5 DIV-6 — semantics change nothing that is drawn.
  @Test("DIV-5 DIV-6 decorative and separator dividers draw the same pixels")
  func sameDrawing() throws {
    for axis in [Axis.horizontal, .vertical] {
      let decorative = try Snapshot.renderExact(placed(TanreiDivider(axis: axis), axis: axis))
      let separator = try Snapshot.renderExact(placed(TanreiDivider(axis: axis, isDecorative: false), axis: axis))
      #expect(separator.mismatch(against: decorative, channelTolerance: 0) == 0)
    }
  }

  #if os(macOS)
  /// DIV-5 DIV-6 — a divider takes no input: a click on it reaches what is under it.
  @Test("DIV-5 DIV-6 a click on the line reaches the view beneath it", arguments: [true, false])
  func noInput(isDecorative: Bool) {
    let box = Counter()
    let hosted = HostedView(
      ZStack {
        Button(action: { box.count += 1 }) { Color.clear.frame(width: length, height: 24).contentShape(Rectangle()) }
          .buttonStyle(.plain)
        TanreiDivider(isDecorative: isDecorative).frame(width: length)
      }
      .padding(Snapshot.inset)
      .tanreiTheme(Snapshot.theme)
    )
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: hosted.size.height / 2))
    #expect(box.count == 1)
  }
  #endif
}

// MARK: - Unknown values (DIV-7)

@MainActor
@Suite("TanreiDivider unknown values")
struct TanreiDividerUnknownValueTests {
  /// DIV-7 — an orientation or inset the divider does not define is the default, reported in debug builds. Swift's
  /// types make an unknown value unrepresentable in code; UI built from data names them, through these initializers.
  @Test("DIV-7 an unknown orientation or inset name reads the default and is reported")
  func unknownNames() {
    let (inset, insetReports) = Reports.collecting { TanreiDividerInset(named: "middle") }
    #expect(inset == .none)
    #expect(insetReports.mention("inset \"middle\"") && insetReports.mention("DIV-7"))
    let (axis, axisReports) = Reports.collecting { Axis(tanreiDividerOrientation: "diagonal") }
    #expect(axis == .horizontal)
    #expect(axisReports.mention("orientation \"diagonal\"") && axisReports.mention("DIV-7"))
  }

  @Test("DIV-7 the spec's names are read without a report")
  func knownNames() {
    let (values, reports) = Reports.collecting {
      (TanreiDividerInset.allCases.map { TanreiDividerInset(named: $0.rawValue) }, [Axis(tanreiDividerOrientation: "horizontal"), Axis(tanreiDividerOrientation: "vertical")])
    }
    #expect(values.0 == TanreiDividerInset.allCases)
    #expect(values.1 == [.horizontal, .vertical])
    #expect(reports.messages.isEmpty)
  }

  /// DIV-7 — rendered: what an unknown name draws is exactly the default divider.
  @Test("DIV-7 unknown names render exactly like the default")
  func unknownRendersDefault() throws {
    let expected = try Snapshot.renderExact(placed(TanreiDivider(), axis: .horizontal))
    let (actual, _) = try Reports.collecting {
      try Snapshot.renderExact(placed(TanreiDivider(axis: Axis(tanreiDividerOrientation: "sideways"), inset: TanreiDividerInset(named: "wide")), axis: .horizontal))
    }
    #expect(actual.mismatch(against: expected, channelTolerance: 0) == 0)
  }
}

// MARK: - Presets

@MainActor
@Suite("TanreiDivider under the shipped presets")
struct TanreiDividerPresetTests {
  /// Every shipped system draws its own line color, thickness and inset (the presets: none of them changes the
  /// defaults today, so each is read from its instance, not assumed).
  @Test("DIV-1 DIV-2 DIV-3 each shipped system's values reach the divider", arguments: ShippedSystem.allCases)
  func presetValues(shipped: ShippedSystem) throws {
    let system = shipped.system
    let bitmap = try Snapshot.render(placed(TanreiDivider(inset: .start), axis: .horizontal), theme: theme(system))
    let thickness = TanreiDividerAppearance.snapped(system.divider.lineThickness, displayScale: Snapshot.scale)
    #expect(CGFloat(bitmap.height) == (thickness + 2 * Snapshot.inset) * Snapshot.scale)
    let color = system.divider.lineColor.resolve(in: system.colors.light).color.rgba8(over: system.colors.light[.surface])
    #expect(pixel(bitmap, x: Snapshot.inset + system.divider.lineInset + 2, y: Snapshot.inset + thickness / 2).isClose(to: color))
    #expect(pixel(bitmap, x: Snapshot.inset + system.divider.lineInset - 2, y: Snapshot.inset + thickness / 2).isClose(to: system.colors.light[.surface].rgba8()))
  }
}

// MARK: - Snapshots (one per spec fixture)

@MainActor
@Suite("TanreiDivider snapshots")
struct TanreiDividerSnapshotTests {
  struct Fixture: Sendable, CustomTestStringConvertible {
    let id: String
    var axis: Axis = .horizontal
    var inset: TanreiDividerInset = .none
    var isDecorative = true
    var testDescription: String { id }
  }

  /// Mirrors `fixtures` in specs/divider.spec.json.
  nonisolated static let fixtures: [Fixture] = [
    Fixture(id: "horizontal"),
    Fixture(id: "horizontal-inset-start", inset: .start),
    Fixture(id: "horizontal-inset-both", inset: .both),
    Fixture(id: "vertical", axis: .vertical),
    Fixture(id: "vertical-inset-start", axis: .vertical, inset: .start),
    Fixture(id: "vertical-inset-both", axis: .vertical, inset: .both),
    Fixture(id: "horizontal-separator", isDecorative: false),
  ]

  /// The fixture in a container `length` long (see the file header).
  static func view(_ fixture: Fixture) -> some View {
    placed(TanreiDivider(axis: fixture.axis, inset: fixture.inset, isDecorative: fixture.isDecorative), axis: fixture.axis)
  }

  @Test("fixture matches its baseline", arguments: fixtures)
  func fixture(_ fixture: Fixture) throws {
    try Snapshot.assert(Self.view(fixture), named: fixture.id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    let spec = try SpecFixture.load(spec: "divider")
    #expect(spec.map(\.id) == Self.fixtures.map(\.id))
    for (theirs, ours) in zip(spec, Self.fixtures) {
      #expect((theirs.string("orientation") ?? "horizontal") == (ours.axis == .horizontal ? "horizontal" : "vertical"), "\(ours.id)")
      #expect((theirs.string("inset") ?? "none") == ours.inset.rawValue, "\(ours.id)")
      #expect((theirs.bool("decorative") ?? true) == ours.isDecorative, "\(ours.id)")
    }
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiDividerTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiDivider preset snapshots")
struct TanreiDividerPresetSnapshotTests {
  /// An inset line: it shows the preset's color, thickness and inset.
  nonisolated static let fixtureId = "horizontal-inset-start"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiDividerSnapshotTests.fixtures.contains { $0.id == Self.fixtureId })
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try #require(TanreiDividerSnapshotTests.fixtures.first { $0.id == Self.fixtureId })
    try Snapshot.assert(TanreiDividerSnapshotTests.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
