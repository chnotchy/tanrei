import SwiftUI
import Testing

@_spi(Fixtures) @testable import Tanrei

// Covers specs/toolbar.spec.json. Each behavior id (TBR-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file. The items are TanreiIconButton and TanreiButton, whose own behavior is
// TanreiIconButtonTests' and TanreiButtonTests'; here the toolbar's reach into them (the joined-item channel: the hit area
// between neighbours, TBR-9, and the one Tab stop, TBR-10) is proven, and that it reaches no further.
//
// The fixtures are drawn on the spec's stages: docked 360 × 56 (TBR-1), a horizontal floating toolbar centered in 360 × 96
// (TBR-4), the vertical one centered in 96 × 240 (TBR-6). Glyphs are the SF Symbols a product would pass (the table
// `symbols` below): baselines render with `fontFamilyPolicy: .system`, under which a Tanrei glyph draws nothing
// (TanreiIconButtonTests). The hit areas here are macOS's — a fine pointer, `sys.target.pointer`. The accessibility tree
// (TBR-11) is read in the Gallery's UI tests; the keyboard (TBR-10) as the row's pure rules and its state, because the
// simulator gives no keyboard focus under automation.

private let suiteName = "TanreiToolbarTests"

@MainActor
private final class Counter {
  var counts: [String: Int] = [:]
  func fire(_ id: String) -> @MainActor () -> Void { { self.counts[id, default: 0] += 1 } }
}

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

/// The extents (points) along row `y` where the render is `color`.
@MainActor
private func runs(_ bitmap: Bitmap, y: CGFloat, color: Bitmap.RGBA, tolerance: Int = 8) -> [ClosedRange<CGFloat>] {
  let row = Int(y * Snapshot.scale)
  var result: [ClosedRange<CGFloat>] = []
  var start: Int?
  for x in 0...bitmap.width {
    let match = x < bitmap.width && bitmap[x, row].isClose(to: color, tolerance: tolerance)
    if match, start == nil { start = x }
    if !match, let first = start {
      result.append(CGFloat(first) / Snapshot.scale...CGFloat(x) / Snapshot.scale)
      start = nil
    }
  }
  return result
}

/// The extents (points) along column `x` where the render is `color`.
@MainActor
private func columnRuns(_ bitmap: Bitmap, x: CGFloat, color: Bitmap.RGBA, tolerance: Int = 8) -> [ClosedRange<CGFloat>] {
  let column = Int(x * Snapshot.scale)
  var result: [ClosedRange<CGFloat>] = []
  var start: Int?
  for y in 0...bitmap.height {
    let match = y < bitmap.height && bitmap[column, y].isClose(to: color, tolerance: tolerance)
    if match, start == nil { start = y }
    if !match, let first = start {
      result.append(CGFloat(first) / Snapshot.scale...CGFloat(y) / Snapshot.scale)
      start = nil
    }
  }
  return result
}

/// The bounding box (points) of every pixel of the render that is `color`; `nil` when there is none.
@MainActor
private func extent(_ bitmap: Bitmap, color: Bitmap.RGBA, tolerance: Int = 8) -> CGRect? {
  var minX = Int.max, minY = Int.max, maxX = -1, maxY = -1
  for y in 0..<bitmap.height {
    for x in 0..<bitmap.width where bitmap[x, y].isClose(to: color, tolerance: tolerance) {
      minX = min(minX, x)
      maxX = max(maxX, x)
      minY = min(minY, y)
      maxY = max(maxY, y)
    }
  }
  guard maxX >= 0 else { return nil }
  let s = Snapshot.scale
  return CGRect(x: CGFloat(minX) / s, y: CGFloat(minY) / s, width: CGFloat(maxX - minX + 1) / s, height: CGFloat(maxY - minY + 1) / s)
}

private let light = TanreiSystem.tanrei.colors.light
private let tokens = TanreiSystem.tanrei.toolbar
private let target = TanreiHitTarget.minimum(in: TanreiSystem.tanrei.measure)
private let medium = TanreiSystem.tanrei.iconButton.sizes.medium.containerSize
private let small = TanreiSystem.tanrei.iconButton.sizes.small.containerSize
@MainActor private var red: Bitmap.RGBA { light[.error].rgba8() }
@MainActor private var green: Bitmap.RGBA { light[.success].rgba8() }
/// The container of a filled icon button, at rest.
@MainActor private var filledIcon: Bitmap.RGBA {
  light[
    TanreiIconButtonAppearance(tokens: TanreiSystem.tanrei.iconButton, variant: .filled, size: .medium, state: .enabled).container
  ].rgba8()
}
/// The container of a filled Button, at rest.
@MainActor private var filledButton: Bitmap.RGBA {
  light[TanreiButtonAppearance(tokens: TanreiSystem.tanrei.button, variant: .filled, size: .medium, state: .enabled).container].rgba8()
}

/// A size read out of a layout pass.
private final class SizeBox: @unchecked Sendable {
  var size = CGSize.zero
}

/// Asks its one subview for its size at `width` (height unspecified) and records the answer.
private struct SizeProbe: Layout {
  let box: SizeBox
  let width: CGFloat?
  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    box.size = subviews[0].sizeThatFits(ProposedViewSize(width: width, height: nil))
    return box.size
  }
  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    subviews[0].place(at: bounds.origin, proposal: ProposedViewSize(bounds.size))
  }
}

/// What `sizeThatFits` answers for `view` at `width`, in the snapshot environment.
@MainActor
private func measure(_ view: some View, width: CGFloat?, theme: TanreiTheme = Snapshot.theme) throws -> CGSize {
  let box = SizeBox()
  _ = try Snapshot.render(SizeProbe(box: box, width: width) { view }, theme: theme)
  return box.size
}

#if os(macOS)
/// What `view` reports once laid out in a window (the TBR-8 report is made from the row as laid out).
@MainActor
private func hostedReports(_ view: some View, theme: TanreiTheme = Snapshot.theme) -> Reports {
  Reports.collecting {
    let hosted = HostedView(view.padding(Snapshot.inset).tanreiTheme(theme))
    hosted.settle(0.2)
  }.reports
}
#endif

/// `count` filled icon buttons of `size`, with no glyph: a row through them reads each container whole.
@MainActor
private func filledActions(_ count: Int, size: TanreiIconButtonSize = .medium) -> some View {
  ForEach(0..<count, id: \.self) { index in
    TanreiIconButton("Action \(index + 1)", variant: .filled, size: size, action: {}) { EmptyView() }
  }
}

// MARK: - Token bindings and rules (TBR-1, TBR-4, TBR-6, TBR-12, TBR-13)

@MainActor
@Suite("TanreiToolbar token bindings")
struct TanreiToolbarBindingTests {
  /// TBR-1 / TBR-4 — each variant reads its own tokens; the edge's width is the component's.
  @Test("TBR-1 TBR-4 each variant reads its own tokens")
  func bindings() {
    let docked = TanreiToolbarArrangement(tokens: tokens, variant: .docked, orientation: .horizontal)
    #expect(!docked.isFloating && docked.spreads && docked.axis == .horizontal)
    #expect(docked.containerColor == tokens.variants.docked.containerColor && docked.elevation == tokens.variants.docked.containerElevation)
    #expect(docked.cornerRadius == tokens.variants.docked.containerShape && docked.size == tokens.variants.docked.containerSize)
    #expect(docked.padding == tokens.variants.docked.containerPaddingInline && docked.gap == tokens.variants.docked.containerGap)
    #expect(docked.outlineColor == tokens.variants.docked.outlineColor && docked.outlineWidth == tokens.outlineWidth)
    let floating = TanreiToolbarArrangement(tokens: tokens, variant: .floating, orientation: .horizontal)
    #expect(floating.isFloating && !floating.spreads)
    #expect(floating.containerColor == tokens.variants.floating.containerColor && floating.elevation == tokens.variants.floating.containerElevation)
    #expect(floating.cornerRadius == tokens.variants.floating.containerShape && floating.size == tokens.variants.floating.containerSize)
    #expect(floating.padding == tokens.variants.floating.containerPaddingInline && floating.gap == tokens.variants.floating.containerGap)
    #expect(floating.outlineColor == tokens.variants.floating.outlineColor && floating.outlineWidth == tokens.outlineWidth)
    // The default system: docked and floating differ at rest (the token rule).
    #expect(docked.elevation != floating.elevation && docked.cornerRadius != floating.cornerRadius && docked.size != floating.size)
  }

  /// TBR-9 — under the default system both gaps are at least `sys.target.touch` minus the small icon button: an
  /// icon button of every size, between two neighbours the gap token apart, reaches its whole target on both sides, under
  /// a touch as under a pointer.
  @Test("TBR-9 the default gaps keep every icon button's whole target between neighbours")
  func defaultGapsKeepWholeTargets() {
    let system = TanreiSystem.tanrei
    for variant in [TanreiToolbarVariant.docked, .floating] {
      let gap = TanreiToolbarArrangement(tokens: tokens, variant: variant, orientation: .horizontal).gap
      #expect(gap >= system.measure.targetTouch - small, "\(variant)")
      let middle = TanreiJoinedPlace.row(at: 1, of: 3, axis: .horizontal, before: gap, after: gap, roving: nil)
      for size in system.iconButton.sizes.keys {
        let side = system.iconButton.sizes[size].containerSize
        for minimum in [system.measure.targetTouch, system.measure.targetPointer] {
          let reach = TanreiJoinedPlace.reach(visual: side, target: minimum, leading: middle.reachLeading, trailing: middle.reachTrailing)
          let half = max(0, minimum - side) / 2
          #expect(reach.leading == half && reach.trailing == half, "\(variant) \(size) at \(minimum): \(reach)")
        }
      }
    }
  }

  /// TBR-6 — vertical is a column only for a floating toolbar; a docked one lays out as a row and says so.
  @Test("TBR-6 a vertical floating toolbar is a column; a vertical docked one is a row and is reported")
  func orientation() {
    #expect(TanreiToolbarArrangement(tokens: tokens, variant: .floating, orientation: .vertical).axis == .vertical)
    #expect(TanreiToolbarArrangement(tokens: tokens, variant: .docked, orientation: .vertical).axis == .horizontal)
    let problems = TanreiToolbarArrangement.problems(isLabelEmpty: false, variant: .docked, orientation: .vertical)
    #expect(problems.count == 1 && problems[0].contains("TBR-6") && problems[0].contains("docked"))
    #expect(TanreiToolbarArrangement.problems(isLabelEmpty: false, variant: .floating, orientation: .vertical).isEmpty)
    #expect(TanreiToolbarArrangement.problems(isLabelEmpty: false, variant: .docked, orientation: .horizontal).isEmpty)
  }

  /// TBR-13 — a variant the system does not have draws docked (reported); an orientation the component does not define is
  /// horizontal (reported); a variant a layer ADDS takes the docked structure with its own values.
  @Test("TBR-13 unknown values fall back and are reported; an added variant is docked with its own values")
  func unknownValues() {
    let (unknown, reports) = Reports.collecting {
      TanreiToolbarArrangement(tokens: tokens, variant: TanreiToolbarVariant(rawValue: "bottom"), orientation: .horizontal)
    }
    #expect(reports.mention("\"bottom\"") && reports.mention("docked"))
    #expect(unknown == TanreiToolbarArrangement(tokens: tokens, variant: .docked, orientation: .horizontal))
    let (orientation, named) = Reports.collecting { TanreiToolbarOrientation(named: "diagonal") }
    #expect(orientation == .horizontal && named.mention("TBR-13") && named.mention("diagonal"))
    #expect(Reports.collecting { TanreiToolbarOrientation(named: "vertical") }.value == .vertical)

    var layered = tokens
    var added = tokens.variants.floating
    added.containerColor = .role(.error)
    let vibrant = TanreiToolbarVariant(rawValue: "vibrant")
    layered.variants.extra[vibrant] = added
    let (arrangement, none) = Reports.collecting { TanreiToolbarArrangement(tokens: layered, variant: vibrant, orientation: .vertical) }
    #expect(none.messages.isEmpty, "\(none.messages)")
    // Docked structure: spread, a row even when asked for a column, the added values.
    #expect(!arrangement.isFloating && arrangement.spreads && arrangement.axis == .horizontal)
    #expect(arrangement.containerColor == .role(.error) && arrangement.size == added.containerSize && arrangement.cornerRadius == added.containerShape)
  }

  /// TBR-12 — an empty label, no item, and content that is not an icon button or a Button are reported.
  @Test("TBR-12 what a debug build reports about the label and the content")
  func problems() {
    let empty = TanreiToolbarArrangement.problems(isLabelEmpty: true, variant: .floating, orientation: .horizontal)
    #expect(empty.count == 1 && empty[0].contains("TBR-12") && empty[0].contains("accessible name"))
    #expect(TanreiToolbarArrangement.contentProblems(kinds: []).first?.contains("no item") == true)
    let foreign = TanreiToolbarArrangement.contentProblems(kinds: [true, false, true, false])
    #expect(foreign.count == 1 && foreign[0].contains("item 2, 4") && foreign[0].contains("TBR-12"))
    #expect(TanreiToolbarArrangement.contentProblems(kinds: [true, true]).isEmpty)
  }
}

// MARK: - Layout (TBR-1 … TBR-8, TBR-14)

@MainActor
@Suite("TanreiToolbar layout")
struct TanreiToolbarLayoutTests {
  /// TBR-2 / TBR-4 — where the items start: spread from padding to padding with equal space between, a lone item centred;
  /// packed at the gap, centred as a group in a longer row.
  @Test("TBR-2 TBR-4 the starts of the items along the axis")
  func starts() {
    #expect(TanreiToolbarLayout.needed(lengths: [36, 36, 36], padding: 8, gap: 8) == 140)
    #expect(TanreiToolbarLayout.starts(lengths: [36, 36, 36], length: 200, padding: 8, gap: 8, spreads: true) == [8, 82, 156])
    #expect(TanreiToolbarLayout.starts(lengths: [80], length: 360, padding: 8, gap: 8, spreads: true) == [140])
    #expect(TanreiToolbarLayout.starts(lengths: [36, 36], length: 90, padding: 6, gap: 8, spreads: false) == [6, 50])
    #expect(TanreiToolbarLayout.starts(lengths: [36, 36], length: 100, padding: 6, gap: 8, spreads: false) == [10, 54])
    // Not enough room: never less than the gap (the row scrolls, TBR-8).
    #expect(TanreiToolbarLayout.starts(lengths: [36, 36], length: 40, padding: 8, gap: 8, spreads: true) == [8, 52])
    #expect(TanreiToolbarLayout.space(between: CGRect(x: 0, y: 0, width: 10, height: 10), and: CGRect(x: 30, y: 0, width: 10, height: 10), axis: .horizontal) == 20)
    #expect(TanreiToolbarLayout.space(between: CGRect(x: 30, y: 0, width: 10, height: 10), and: CGRect(x: 0, y: 0, width: 10, height: 10), axis: .horizontal) == 20)
    #expect(TanreiToolbarLayout.space(between: CGRect(x: 0, y: 0, width: 10, height: 10), and: CGRect(x: 0, y: 14, width: 10, height: 10), axis: .vertical) == 4)
  }

  /// TBR-1 — docked: the parent's full width, `size.docked` high, filled with `color.docked`, the top edge `outline.width`
  /// thick in `outline.color.docked`. Every value is read from the system in the environment.
  @Test("TBR-1 docked spans the width, its size high, its color, its top edge")
  func docked() throws {
    var custom = TanreiSystem.tanrei
    custom.toolbar.variants.docked.containerColor = .role(.error)
    custom.toolbar.variants.docked.outlineColor = .role(.success)
    custom.toolbar.outlineWidth = 2
    let rendered = try Snapshot.render(TanreiToolbar("Actions") { filledActions(3) }.frame(width: 360), theme: theme(custom))
    let box = try #require(extent(rendered, color: red))
    #expect(box == CGRect(x: Snapshot.inset, y: Snapshot.inset + 2, width: 360, height: tokens.variants.docked.containerSize - 2))
    // The edge across the top, 2 thick; below it the container.
    #expect(pixel(rendered, x: Snapshot.inset + 1, y: Snapshot.inset + 0.5).isClose(to: green))
    #expect(pixel(rendered, x: Snapshot.inset + 359, y: Snapshot.inset + 1.5).isClose(to: green))
    #expect(pixel(rendered, x: Snapshot.inset + 1, y: Snapshot.inset + 2.5).isClose(to: red))
    // A modified size drives the height.
    custom.toolbar.variants.docked.containerSize = 80
    let taller = try Snapshot.render(TanreiToolbar("Actions") { filledActions(3) }.frame(width: 360), theme: theme(custom))
    #expect(try #require(extent(taller, color: red)).height == 78)
  }

  /// TBR-1 — the docked corners and elevation are the variant's tokens (none in the default system).
  @Test("TBR-1 a modified system drives the docked corners and elevation")
  func dockedShapeAndElevation() throws {
    var custom = TanreiSystem.tanrei
    custom.toolbar.variants.docked.containerColor = .role(.error)
    let square = try Snapshot.render(TanreiToolbar("Actions") { filledActions(1) }.frame(width: 360), theme: theme(custom))
    #expect(pixel(square, x: Snapshot.inset + 0.5, y: Snapshot.inset + 55.5).isClose(to: red))
    let below = pixel(square, x: Snapshot.inset + 180, y: Snapshot.inset + 56 + 4)
    custom.toolbar.variants.docked.containerShape = 16
    custom.toolbar.variants.docked.containerElevation = TanreiSystem.tanrei.elevation.level3
    let rounded = try Snapshot.render(TanreiToolbar("Actions") { filledActions(1) }.frame(width: 360), theme: theme(custom))
    #expect(!pixel(rounded, x: Snapshot.inset + 0.5, y: Snapshot.inset + 55.5).isClose(to: red))
    #expect(pixel(rounded, x: Snapshot.inset + 180, y: Snapshot.inset + 56 + 4) != below)
  }

  /// TBR-2 — docked items: the first `padding-inline.docked` from the start, the last as far from the end, equal space
  /// between (never less than the gap), each centred in the row; one item centred.
  @Test("TBR-2 docked spreads its items; one item is centred")
  func spread() throws {
    let rendered = try Snapshot.render(TanreiToolbar("Actions") { filledActions(4) }.frame(width: 360))
    let row = runs(rendered, y: Snapshot.inset + 28, color: filledIcon)
    let padding = tokens.variants.docked.containerPaddingInline
    #expect(row.count == 4)
    #expect(abs(row[0].lowerBound - (Snapshot.inset + padding)) <= 0.5)
    #expect(abs(row[3].upperBound - (Snapshot.inset + 360 - padding)) <= 0.5)
    let spaces = (1..<4).map { row[$0].lowerBound - row[$0 - 1].upperBound }
    #expect(spaces.allSatisfy { abs($0 - spaces[0]) <= 0.5 && $0 >= tokens.variants.docked.containerGap })
    let column = columnRuns(rendered, x: row[0].lowerBound + 18, color: filledIcon)
    #expect(column.count == 1 && abs((column[0].lowerBound + column[0].upperBound) / 2 - (Snapshot.inset + 28)) <= 0.5)
    // One item: centred.
    let one = try Snapshot.render(TanreiToolbar("Reply") { TanreiButton("Reply", action: {}) }.frame(width: 360))
    let button = try #require(extent(one, color: filledButton))
    #expect(abs(button.midX - (Snapshot.inset + 180)) <= 0.5 && abs(button.midY - (Snapshot.inset + 28)) <= 0.5)
  }

  /// TBR-2 / TBR-8 — the docked padding and gap are read: a larger padding moves the first item, a larger gap makes the
  /// same items do not fit (they scroll, and it is reported).
  @Test("TBR-2 a modified system drives the docked padding and gap")
  func dockedPaddingAndGap() throws {
    var custom = TanreiSystem.tanrei
    custom.toolbar.variants.docked.containerPaddingInline = 24
    let padded = try Snapshot.render(TanreiToolbar("Actions") { filledActions(4) }.frame(width: 360), theme: theme(custom))
    #expect(abs(runs(padded, y: Snapshot.inset + 28, color: filledIcon)[0].lowerBound - (Snapshot.inset + 24)) <= 0.5)
    #if os(macOS)
    custom = TanreiSystem.tanrei
    custom.toolbar.variants.docked.containerGap = 100
    var gapped = Snapshot.theme
    gapped.system = custom
    #expect(hostedReports(TanreiToolbar("Actions") { filledActions(4) }.frame(width: 360), theme: gapped).mention("TBR-8"))
    #expect(hostedReports(TanreiToolbar("Actions") { filledActions(4) }.frame(width: 360)).messages.isEmpty)
    #endif
  }

  /// TBR-3 — docked: the color reaches under the bottom and side system insets; the items stay above and inside them.
  @Test("TBR-3 docked reaches under the system insets, its items stay inside them")
  func insets() throws {
    var custom = TanreiSystem.tanrei
    custom.toolbar.variants.docked.containerColor = .role(.error)
    let inset: CGFloat = 20
    let rendered = try Snapshot.render(
      TanreiToolbar("Reply") { TanreiButton("Reply", action: {}) }
        .safeAreaPadding(.bottom, inset)
        .safeAreaPadding(.horizontal, inset)
        .frame(width: 360),
      theme: theme(custom))
    let size = tokens.variants.docked.containerSize
    let box = try #require(extent(rendered, color: red))
    // Under the bottom inset and the side insets: the container's color, to the edges.
    #expect(box.minX == Snapshot.inset && box.width == 360 && box.maxY == Snapshot.inset + size + inset)
    // The item above the bottom inset, centred between the side insets.
    let button = try #require(extent(rendered, color: filledButton))
    #expect(abs(button.midX - (Snapshot.inset + inset + (360 - 2 * inset) / 2)) <= 0.5 && abs(button.midY - (Snapshot.inset + size / 2)) <= 0.5)
    // A start-aligned item keeps inside the side inset.
    let start = try Snapshot.render(
      TanreiToolbar("Actions") { filledActions(2) }.safeAreaPadding(.horizontal, inset).frame(width: 360), theme: theme(custom))
    let first = try #require(runs(start, y: Snapshot.inset + size / 2, color: filledIcon).first)
    #expect(abs(first.lowerBound - (Snapshot.inset + inset + tokens.variants.docked.containerPaddingInline)) <= 0.5)
  }

  /// TBR-4 — floating: its color, corners, an edge around the whole shape, as long as its items need (padding at each end,
  /// the gap between), `size.floating` across; every value read from the system.
  @Test("TBR-4 floating: color, corners, edge, length from its items, size across")
  func floating() throws {
    var custom = TanreiSystem.tanrei
    custom.toolbar.variants.floating.containerColor = .role(.error)
    func toolbar() -> some View { TanreiToolbar("Tools", variant: .floating) { filledActions(3) } }
    let rendered = try Snapshot.render(toolbar(), theme: theme(custom))
    let floating = tokens.variants.floating
    let length = 3 * medium + 2 * floating.containerGap + 2 * floating.containerPaddingInline
    let box = try #require(extent(rendered, color: red))
    #expect(abs(box.width - length) <= 0.5 && abs(box.height - floating.containerSize) <= 0.5)
    // Fully rounded: the corner of the bounds is not the container.
    #expect(!pixel(rendered, x: box.minX + 0.5, y: box.minY + 0.5).isClose(to: red))
    let row = runs(rendered, y: box.midY, color: filledIcon)
    #expect(row.count == 3 && abs(row[0].lowerBound - (box.minX + floating.containerPaddingInline)) <= 0.5)
    #expect(abs(row[1].lowerBound - row[0].upperBound - floating.containerGap) <= 0.5)

    custom.toolbar.variants.floating.containerShape = 0
    custom.toolbar.variants.floating.containerSize = 60
    custom.toolbar.variants.floating.containerPaddingInline = 20
    custom.toolbar.variants.floating.containerGap = 20
    custom.toolbar.variants.floating.outlineColor = .role(.success)
    custom.toolbar.outlineWidth = 3
    let changed = try Snapshot.render(toolbar(), theme: theme(custom))
    let outer = try #require(extent(changed, color: green))
    #expect(abs(outer.width - (3 * medium + 2 * 20 + 2 * 20)) <= 0.5 && abs(outer.height - 60) <= 0.5)
    // Square corners; the edge 3 thick around the whole shape.
    #expect(pixel(changed, x: outer.minX + 0.5, y: outer.minY + 0.5).isClose(to: green))
    #expect(pixel(changed, x: outer.minX + 2.5, y: outer.midY).isClose(to: green))
    #expect(pixel(changed, x: outer.maxX - 2.5, y: outer.midY).isClose(to: green))
    #expect(pixel(changed, x: outer.minX + 3.5, y: outer.minY + 3.5).isClose(to: red))
  }

  /// TBR-4 — the floating elevation is read: level3 casts a shadow below the toolbar; level0 none.
  @Test("TBR-4 a modified system drives the floating elevation")
  func floatingElevation() throws {
    func toolbar() -> some View { TanreiToolbar("Tools", variant: .floating) { filledActions(2) }.frame(width: 200, height: 96) }
    let raised = try Snapshot.render(toolbar())
    let background = light[.surface].rgba8()
    // Below the toolbar's bottom edge (centred in the 96 stage: 24 … 72).
    #expect(!pixel(raised, x: Snapshot.inset + 100, y: Snapshot.inset + 72 + 3).isClose(to: background, tolerance: 1))
    var custom = TanreiSystem.tanrei
    custom.toolbar.variants.floating.containerElevation = TanreiSystem.tanrei.elevation.level0
    let flat = try Snapshot.render(toolbar(), theme: theme(custom))
    #expect(pixel(flat, x: Snapshot.inset + 100, y: Snapshot.inset + 72 + 3).isClose(to: background, tolerance: 1))
  }

  /// TBR-5 — floating: at its own size where the layout that holds it places it; nothing outside it but its shadow; no
  /// reach under a system inset.
  @Test("TBR-5 floating lays out at its own size, where it is placed, and reaches under no inset")
  func placedByItsLayout() throws {
    var custom = TanreiSystem.tanrei
    custom.toolbar.variants.floating.containerColor = .role(.error)
    custom.toolbar.variants.floating.containerElevation = TanreiSystem.tanrei.elevation.level0
    let size = try measure(TanreiToolbar("Tools", variant: .floating) { filledActions(2) }, width: 360, theme: theme(custom))
    let floating = tokens.variants.floating
    #expect(size == CGSize(width: 2 * medium + floating.containerGap + 2 * floating.containerPaddingInline, height: floating.containerSize))
    let placed = try Snapshot.render(
      TanreiToolbar("Tools", variant: .floating) { filledActions(2) }
        .safeAreaPadding(.bottom, 20)
        .frame(width: 360, height: 120, alignment: .bottomLeading),
      theme: theme(custom))
    let box = try #require(extent(placed, color: red))
    #expect(box.minX == Snapshot.inset && abs(box.maxY - (Snapshot.inset + 100)) <= 0.5 && abs(box.width - size.width) <= 0.5)
  }

  /// TBR-6 — a vertical floating toolbar: its items top to bottom, the floating padding and gap along the column, at least
  /// `size.floating` wide.
  @Test("TBR-6 a vertical floating toolbar stacks its items")
  func vertical() throws {
    var custom = TanreiSystem.tanrei
    custom.toolbar.variants.floating.containerColor = .role(.error)
    let rendered = try Snapshot.render(
      TanreiToolbar("Map", variant: .floating, orientation: .vertical) {
        TanreiIconButton("Zoom in", variant: .filled, action: {}) { EmptyView() }
        TanreiIconButton("Zoom out", action: {}) { EmptyView() }
        TanreiIconButton("Here", variant: .filled, action: {}) { EmptyView() }
      }, theme: theme(custom))
    let floating = tokens.variants.floating
    let box = try #require(extent(rendered, color: red))
    #expect(abs(box.width - floating.containerSize) <= 0.5)
    #expect(abs(box.height - (3 * medium + 2 * floating.containerGap + 2 * floating.containerPaddingInline)) <= 0.5)
    let column = columnRuns(rendered, x: box.midX, color: filledIcon)
    #expect(column.count == 2)
    #expect(abs(column[0].lowerBound - (box.minY + floating.containerPaddingInline)) <= 0.5)
    #expect(abs(column[1].lowerBound - (box.minY + floating.containerPaddingInline + 2 * (medium + floating.containerGap))) <= 0.5)
  }

  /// TBR-7 — right to left, a row starts at the right edge, in reading order; a column keeps its order.
  @Test("TBR-7 right to left mirrors a row and keeps a column")
  func rightToLeft() throws {
    func row(_ direction: LayoutDirection) -> some View {
      TanreiToolbar("Compose") {
        TanreiButton("Send", action: {})
        TanreiIconButton("Attach", action: {}) { Image(systemName: "paperclip") }
        TanreiIconButton("Link", action: {}) { Image(systemName: "link") }
      }
      .frame(width: 360)
      .environment(\.layoutDirection, direction)
    }
    let padding = tokens.variants.docked.containerPaddingInline
    let ltr = try #require(extent(try Snapshot.render(row(.leftToRight)), color: filledButton))
    #expect(abs(ltr.minX - (Snapshot.inset + padding)) <= 0.5)
    let rtl = try #require(extent(try Snapshot.render(row(.rightToLeft)), color: filledButton))
    #expect(abs(rtl.maxX - (Snapshot.inset + 360 - padding)) <= 0.5)

    func column(_ direction: LayoutDirection) -> some View {
      TanreiToolbar("Map", variant: .floating, orientation: .vertical) {
        TanreiIconButton("Zoom in", variant: .filled, action: {}) { Image(systemName: "plus") }
        TanreiIconButton("Zoom out", action: {}) { Image(systemName: "minus") }
      }
      .environment(\.layoutDirection, direction)
    }
    let top = try #require(columnRuns(try Snapshot.render(column(.leftToRight)), x: Snapshot.inset + 24, color: filledIcon).first)
    let mirrored = try #require(columnRuns(try Snapshot.render(column(.rightToLeft)), x: Snapshot.inset + 24, color: filledIcon).first)
    #expect(abs(top.lowerBound - mirrored.lowerBound) <= 0.5 && abs(top.lowerBound - (Snapshot.inset + tokens.variants.floating.containerPaddingInline)) <= 0.5)
  }

  /// TBR-8 — items that need more length than the toolbar has keep their own size and the least gap, are not wrapped,
  /// shrunk or hidden — the row scrolls (at rest, from its start) — and it is reported in debug builds.
  @Test("TBR-8 items that do not fit keep their size and scroll, and it is reported")
  func overflow() throws {
    // A render may lay the row out again once it has measured it, and report then: collected, not asserted.
    let rendered = try Reports.collecting { try Snapshot.render(TanreiToolbar("Actions", variant: .floating) { filledActions(6) }.frame(width: 150)) }.value
    #if os(macOS)
    // Reported from the row as laid out in a window.
    let reports = hostedReports(TanreiToolbar("Actions", variant: .floating) { filledActions(6) }.frame(width: 150))
    #expect(reports.mention("TBR-8") && reports.mention("overflow menu"))
    #expect(hostedReports(TanreiToolbar("Actions", variant: .floating) { filledActions(6) }.frame(width: 360)).messages.isEmpty)
    // Fixtures and galleries only: a fixed stage may silence it.
    #expect(hostedReports(TanreiToolbar("Actions", variant: .floating) { filledActions(6) }.frame(width: 150).tanreiToolbarReportsOverflow(false)).messages.isEmpty)
    #endif
    let floating = tokens.variants.floating
    let row = runs(rendered, y: Snapshot.inset + floating.containerSize / 2, color: filledIcon)
    // From the start: the padding, then whole items at the gap; one row only.
    #expect(row.count >= 3)
    #expect(abs(row[0].lowerBound - (Snapshot.inset + floating.containerPaddingInline)) <= 0.5)
    #expect(row.dropLast().allSatisfy { abs($0.upperBound - $0.lowerBound - medium) <= 0.5 })
    #expect(abs(row[1].lowerBound - row[0].upperBound - floating.containerGap) <= 0.5)
    let size = try Reports.collecting { try measure(TanreiToolbar("Actions", variant: .floating) { filledActions(6) }.frame(width: 150), width: nil) }.value
    #expect(abs(size.height - floating.containerSize) <= 0.5 && size.width == 150)
  }

  #if os(macOS)
  /// TBR-8 — an item that receives keyboard focus is brought fully into view: moving the Tab stop to the last item scrolls
  /// the row so that it shows.
  @Test("TBR-8 an item that takes focus is scrolled into view")
  func focusedItemIsRevealed() throws {
    let focus = TanreiJoinedRovingModel()
    let (_, reports) = Reports.collecting {
      let hosted = HostedView(
        TanreiToolbar("Actions", variant: .floating, focus: focus) {
          ForEach(0..<6, id: \.self) { index in
            TanreiIconButton("Action \(index + 1)", action: {}) { Image(systemName: "star") }
          }
          TanreiButton("Send", action: {})
        }
        .frame(width: 150)
        .padding(Snapshot.inset)
        .background(light[.surface])
        .tanreiTheme(Snapshot.theme))
      let y = Snapshot.inset + tokens.variants.floating.containerSize / 2
      let end = Snapshot.inset + 150 - tokens.variants.floating.containerPaddingInline - 4
      #expect(hosted.color(at: CGPoint(x: end, y: y)).map { $0.isClose(to: filledButton, tolerance: 12) } == false)
      focus.move(from: 0, count: 7, movement: .end)
      hosted.settle(0.3)
      #expect(focus.last == 6)
      #expect(hosted.color(at: CGPoint(x: end, y: y)).map { $0.isClose(to: filledButton, tolerance: 12) } == true)
      return ()
    }
    #expect(reports.mention("TBR-8"))
  }
  #endif

  /// TBR-14 — with enlarged text the toolbar grows across its axis to hold its items (its size is a minimum); it does not
  /// scale the items itself: icon buttons keep their size.
  @Test("TBR-14 larger text grows the toolbar around its items; icon buttons keep their size")
  func dynamicType() throws {
    // Only iOS has Dynamic Type (macOS scales nothing), so the Button's label is enlarged through its token here.
    var custom = TanreiSystem.tanrei
    custom.button.sizes.medium.labelTypescale.size *= 3
    custom.button.sizes.medium.labelTypescale.lineHeight *= 3
    let grown = try measure(TanreiToolbar("Reply") { TanreiButton("Reply", action: {}) }, width: 360, theme: theme(custom))
    let button = try measure(TanreiButton("Reply", action: {}), width: nil, theme: theme(custom))
    #expect(button.height > tokens.variants.docked.containerSize)
    #expect(grown.height == button.height && grown.width == 360)
    let icons = try measure(TanreiToolbar("Tools", variant: .floating) { filledActions(3) }.environment(\.dynamicTypeSize, .accessibility5), width: nil)
    #expect(icons.height == tokens.variants.floating.containerSize)
  }
}

// MARK: - Items stay themselves (TBR-9, TBR-11, TBR-12)

@MainActor
@Suite("TanreiToolbar items", .serialized)
struct TanreiToolbarItemTests {
  /// TBR-9 — the toolbar restyles nothing: a lone item draws exactly as it does alone, centred on the same surface.
  @Test("TBR-9 an item draws exactly as it does alone")
  func itemIsUntouched() throws {
    var custom = TanreiSystem.tanrei
    custom.toolbar.variants.docked.outlineColor = .none
    for variant in [TanreiIconButtonVariant.standard, .filled, .outlined] {
      let alone = try Snapshot.renderExact(
        TanreiIconButton("Archive", variant: variant, action: {}) { Image(systemName: "archivebox") }.frame(width: 360, height: 56), theme: theme(custom))
      let placed = try Snapshot.renderExact(
        TanreiToolbar("Actions") { TanreiIconButton("Archive", variant: variant, action: {}) { Image(systemName: "archivebox") } }.frame(width: 360, height: 56),
        theme: theme(custom))
      #expect(placed.pixels == alone.pixels, "\(variant)")
    }
    let alone = try Snapshot.renderExact(TanreiButton("Send", variant: .tonal, action: {}).frame(width: 360, height: 56), theme: theme(custom))
    let placed = try Snapshot.renderExact(
      TanreiToolbar("Compose") { TanreiButton("Send", variant: .tonal, action: {}) }.frame(width: 360, height: 56), theme: theme(custom))
    #expect(placed.pixels == alone.pixels)
    // A toggle stays a toggle, on or off, drawn as anywhere.
    let on = try Snapshot.renderExact(
      TanreiIconButton("Bold", isSelected: .constant(true), action: {}) { Image(systemName: "bold") }.frame(width: 360, height: 56), theme: theme(custom))
    let placedOn = try Snapshot.renderExact(
      TanreiToolbar("Formatting") { TanreiIconButton("Bold", isSelected: .constant(true), action: {}) { Image(systemName: "bold") } }
        .frame(width: 360, height: 56), theme: theme(custom))
    #expect(placedOn.pixels == on.pixels)
  }

  /// TBR-9 — each item renders from its own tokens: a modified icon-button or Button token reaches an item in a toolbar,
  /// and the toolbar has no token that could restyle it.
  @Test("TBR-9 items render from their own tokens")
  func ownTokens() throws {
    var custom = TanreiSystem.tanrei
    custom.iconButton.variants.filled.enabled.containerColor = .role(.error)
    custom.button.variants.tonal.enabled.containerColor = .role(.success)
    let rendered = try Snapshot.render(
      TanreiToolbar("Actions") {
        TanreiIconButton("Archive", variant: .filled, action: {}) { Image(systemName: "archivebox") }
        TanreiButton("Reply", variant: .tonal, action: {})
      }.frame(width: 360), theme: theme(custom))
    #expect(abs(try #require(extent(rendered, color: red)).width - medium) <= 0.5)
    #expect(try #require(extent(rendered, color: green)).minX > Snapshot.inset + 180)
  }

  /// TBR-11 — the label names the toolbar and is never drawn: a named toolbar draws exactly as one named otherwise. (That
  /// it is one container named by the label, holding its items in order, is read from the accessibility tree in the
  /// Gallery: `testToolbarSemanticsAndActivation`; macOS builds no tree for a unit test.)
  @Test("TBR-11 the label is never drawn")
  func labelDrawsNothing() throws {
    func toolbar(_ label: String) -> some View { TanreiToolbar(label, variant: .floating) { filledActions(2) } }
    #expect(try Snapshot.renderExact(toolbar("Formatting")).pixels == Snapshot.renderExact(toolbar("Drawing tools")).pixels)
  }

  /// TBR-12 — an empty label, no item, and content that is not an icon button or a Button still render and are reported.
  @Test("TBR-12 an empty label, no item and foreign content render and are reported")
  func foreignContent() throws {
    let (bitmap, reports) = try Reports.collecting {
      try Snapshot.render(
        TanreiToolbar("", variant: .floating) {
          TanreiIconButton("Bold", action: {}) { Image(systemName: "bold") }
          Rectangle().fill(Color.black).frame(width: 30, height: 30)
        })
    }
    #expect(reports.mention("accessible name") && reports.mention("item 2") && reports.mention("TBR-12"))
    #expect(runs(bitmap, y: Snapshot.inset + tokens.variants.floating.containerSize / 2, color: Bitmap.RGBA(r: 0, g: 0, b: 0, a: 255)).count == 1)
    let (_, empty) = try Reports.collecting { try Snapshot.render(TanreiToolbar("Nothing") {}.frame(width: 360)) }
    #expect(empty.mention("no item"))
    // ForEach and `if` are read as the items they make: nothing to report.
    let (_, made) = try Reports.collecting {
      try Snapshot.render(TanreiToolbar("Actions") { ForEach(["a", "b"], id: \.self) { TanreiButton($0, action: {}) } }.frame(width: 360))
    }
    #expect(made.messages.isEmpty, "\(made.messages)")
  }

  #if os(macOS)
  /// TBR-9 — each item keeps its own press and events: a click on each fires its own action once; a toggle flips only
  /// itself; a disabled item never fires.
  @Test("TBR-9 every item emits its own events; a disabled one none")
  func ownEvents() {
    let counter = Counter()
    var bold = true
    let binding = Binding(get: { bold }, set: { bold = $0 })
    let hosted = HostedView(
      TanreiToolbar("Formatting", variant: .floating) {
        TanreiIconButton("Bold", isSelected: binding, action: counter.fire("bold")) { Image(systemName: "bold") }
        TanreiIconButton("Delete", action: counter.fire("delete")) { Image(systemName: "trash") }.disabled(true)
        TanreiButton("Done", action: counter.fire("done"))
      }
      .padding(Snapshot.inset)
      .tanreiTheme(Snapshot.theme))
    let floating = tokens.variants.floating
    let y = hosted.size.height / 2
    let first = Snapshot.inset + floating.containerPaddingInline + medium / 2
    hosted.click(at: CGPoint(x: first, y: y))
    #expect(counter.counts == ["bold": 1] && !bold)
    hosted.click(at: CGPoint(x: first + medium + floating.containerGap, y: y))
    #expect(counter.counts == ["bold": 1])
    hosted.click(at: CGPoint(x: hosted.size.width - Snapshot.inset - floating.containerPaddingInline - 10, y: y))
    #expect(counter.counts == ["bold": 1, "done": 1])
  }

  /// TBR-9 — floating, under the default system: the gap is at least `sys.target.touch` minus the small icon button (ADR
  /// 0027), so no targets overlap and every item keeps its whole target on every side, between its neighbours too — a
  /// press up to half the target from an item's centre, along the row or across it, is that item's.
  @Test("TBR-9 under the default system every item keeps its whole target between neighbours")
  func wholeTargetsBetweenNeighbours() {
    let floating = tokens.variants.floating
    let touch = TanreiSystem.tanrei.measure.targetTouch
    #expect(floating.containerGap >= touch - small && tokens.variants.docked.containerGap >= touch - small)
    #expect((target - small) / 2 <= floating.containerGap / 2, "no targets overlap")
    let counter = Counter()
    let hosted = HostedView(
      TanreiToolbar("Tools", variant: .floating) {
        TanreiIconButton("Edit", size: .small, action: counter.fire("edit")) { Image(systemName: "pencil") }
        TanreiIconButton("Share", size: .small, action: counter.fire("share")) { Image(systemName: "square.and.arrow.up") }
        TanreiIconButton("Delete", size: .small, action: counter.fire("delete")) { Image(systemName: "trash") }
      }
      .padding(Snapshot.inset)
      .tanreiTheme(Snapshot.theme))
    let y = hosted.size.height / 2
    // 1 point inside the edge of the whole target, on each of its four sides.
    let reach = target / 2 - 1
    for (index, id) in ["edit", "share", "delete"].enumerated() {
      let x = Snapshot.inset + floating.containerPaddingInline + small / 2 + CGFloat(index) * (small + floating.containerGap)
      for point in [CGPoint(x: x - reach, y: y), CGPoint(x: x + reach, y: y), CGPoint(x: x, y: y - reach), CGPoint(x: x, y: y + reach)] {
        hosted.click(at: point)
      }
      #expect(counter.counts[id] == 4, "\(id): \(counter.counts)")
    }
    #expect(counter.counts == ["edit": 4, "share": 4, "delete": 4])
  }

  /// TBR-9 — floating, small icon buttons in a layer that narrows the gap to 8 (their targets would overlap in it): the hit
  /// areas meet at the middle of the gap and never overlap; an item keeps its full target where it has no neighbour.
  @Test("TBR-9 hit areas meet at the middle of the gap")
  func hitAreasMeet() {
    let side = small
    var custom = TanreiSystem.tanrei
    custom.toolbar.variants.floating.containerGap = 8
    let floating = custom.toolbar.variants.floating
    #expect((target - side) / 2 > floating.containerGap / 2, "the targets this test needs overlap")
    let counter = Counter()
    let hosted = HostedView(
      TanreiToolbar("Tools", variant: .floating) {
        TanreiIconButton("Edit", size: .small, action: counter.fire("edit")) { Image(systemName: "pencil") }
        TanreiIconButton("Share", size: .small, action: counter.fire("share")) { Image(systemName: "square.and.arrow.up") }
      }
      .padding(Snapshot.inset)
      .tanreiTheme(theme(custom)))
    let y = hosted.size.height / 2
    let firstEnd = Snapshot.inset + floating.containerPaddingInline + side
    let middle = firstEnd + floating.containerGap / 2
    hosted.click(at: CGPoint(x: middle - 1, y: y))
    #expect(counter.counts == ["edit": 1])
    hosted.click(at: CGPoint(x: middle + 1, y: y))
    #expect(counter.counts == ["edit": 1, "share": 1])
    // Where it has no neighbour the whole target: half of what is missing, and what the inner side gives up.
    let outer = Snapshot.inset + floating.containerPaddingInline - (target - side - floating.containerGap / 2) + 1
    hosted.click(at: CGPoint(x: outer, y: y))
    #expect(counter.counts == ["edit": 2, "share": 1])
  }

  /// TBR-9 — docked: the space between spread items is measured, so each hit area reaches its full target where the gap
  /// allows — under the default system, and in a layer that narrows the gap token to 8, where the full target is further
  /// than half the token.
  @Test("TBR-9 docked items spread apart keep their full target")
  func spreadItemsKeepTheirTarget() {
    let reach = (target - small) / 2
    var narrow = TanreiSystem.tanrei
    narrow.toolbar.variants.docked.containerGap = 8
    #expect(reach > narrow.toolbar.variants.docked.containerGap / 2, "the reach this test needs is more than half the gap token")
    for system in [TanreiSystem.tanrei, narrow] {
      let counter = Counter()
      let hosted = HostedView(
        TanreiToolbar("Tools") {
          TanreiIconButton("Edit", size: .small, action: counter.fire("edit")) { Image(systemName: "pencil") }
          TanreiIconButton("Share", size: .small, action: counter.fire("share")) { Image(systemName: "square.and.arrow.up") }
        }
        .frame(width: 360)
        .padding(Snapshot.inset)
        .tanreiTheme(theme(system)))
      hosted.settle(0.2)
      let y = hosted.size.height / 2
      let docked = system.toolbar.variants.docked
      let firstEnd = Snapshot.inset + docked.containerPaddingInline + small
      hosted.click(at: CGPoint(x: firstEnd + reach - 1, y: y))
      #expect(counter.counts == ["edit": 1], "gap \(docked.containerGap)")
      let secondStart = Snapshot.inset + 360 - docked.containerPaddingInline - small
      hosted.click(at: CGPoint(x: secondStart - reach + 1, y: y))
      #expect(counter.counts == ["edit": 1, "share": 1], "gap \(docked.containerGap)")
    }
  }

  /// TBR-9 / TBR-6 — in a vertical toolbar every item keeps its whole target above and below under the default system, and
  /// in a layer that narrows the gap to 8 the hit areas meet at the middle of it; sideways they reach the full target.
  @Test("TBR-9 a column's hit areas meet above and below")
  func verticalHitAreas() {
    func column(_ counter: Counter) -> some View {
      TanreiToolbar("Map", variant: .floating, orientation: .vertical) {
        TanreiIconButton("Zoom in", size: .small, action: counter.fire("in")) { Image(systemName: "plus") }
        TanreiIconButton("Zoom out", size: .small, action: counter.fire("out")) { Image(systemName: "minus") }
      }
    }
    // The default system: 1 point inside the edge of each item's whole target, above and below it, and sideways.
    do {
      let reach = target / 2 - 1
      let defaults = tokens.variants.floating
      let whole = Counter()
      let standard = HostedView(column(whole).padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
      let centre = standard.size.width / 2
      for (index, id) in ["in", "out"].enumerated() {
        let y = Snapshot.inset + defaults.containerPaddingInline + small / 2 + CGFloat(index) * (small + defaults.containerGap)
        for point in [CGPoint(x: centre, y: y - reach), CGPoint(x: centre, y: y + reach), CGPoint(x: centre - reach, y: y), CGPoint(x: centre + reach, y: y)] {
          standard.click(at: point)
        }
        #expect(whole.counts[id] == 4, "\(id): \(whole.counts)")
      }
    }

    // A layer with a narrower gap, in which the targets would overlap.
    var custom = TanreiSystem.tanrei
    custom.toolbar.variants.floating.containerGap = 8
    let floating = custom.toolbar.variants.floating
    #expect((target - small) / 2 > floating.containerGap / 2, "the targets this test needs overlap")
    let counter = Counter()
    let hosted = HostedView(column(counter).padding(Snapshot.inset).tanreiTheme(theme(custom)))
    let x = hosted.size.width / 2
    let middle = Snapshot.inset + floating.containerPaddingInline + small + floating.containerGap / 2
    hosted.click(at: CGPoint(x: x, y: middle - 1))
    #expect(counter.counts == ["in": 1])
    hosted.click(at: CGPoint(x: x, y: middle + 1))
    #expect(counter.counts == ["in": 1, "out": 1])
    // Sideways, the whole target: past the icon button's edge by nearly half of what is missing.
    let left = x - small / 2 - (target - small) / 2 + 1
    hosted.click(at: CGPoint(x: left, y: middle + 1 + small / 2))
    #expect(counter.counts == ["in": 1, "out": 2])
  }
  #endif
}

// MARK: - Keyboard (TBR-10)

@MainActor
@Suite("TanreiToolbar keyboard")
struct TanreiToolbarKeyboardTests {
  /// TBR-10 — Right and Left Arrow in a row (swapped right to left), Down and Up Arrow in a column, Home and End; nothing
  /// else is the toolbar's (Enter and Space are the item's own).
  @Test("TBR-10 TBR-7 which keys move along which axis, mirrored right to left")
  func keys() {
    typealias Rules = TanreiJoinedRovingRules
    #expect(Rules.movement(.rightArrow, axis: .horizontal, layoutDirection: .leftToRight) == .downArrow)
    #expect(Rules.movement(.leftArrow, axis: .horizontal, layoutDirection: .leftToRight) == .upArrow)
    #expect(Rules.movement(.rightArrow, axis: .horizontal, layoutDirection: .rightToLeft) == .upArrow)
    #expect(Rules.movement(.leftArrow, axis: .horizontal, layoutDirection: .rightToLeft) == .downArrow)
    #expect(Rules.movement(.downArrow, axis: .horizontal, layoutDirection: .leftToRight) == nil)
    #expect(Rules.movement(.upArrow, axis: .horizontal, layoutDirection: .leftToRight) == nil)
    #expect(Rules.movement(.downArrow, axis: .vertical, layoutDirection: .rightToLeft) == .downArrow)
    #expect(Rules.movement(.upArrow, axis: .vertical, layoutDirection: .leftToRight) == .upArrow)
    #expect(Rules.movement(.rightArrow, axis: .vertical, layoutDirection: .leftToRight) == nil)
    #expect(Rules.movement(.home, axis: .vertical, layoutDirection: .leftToRight) == .home)
    #expect(Rules.movement(.end, axis: .horizontal, layoutDirection: .rightToLeft) == .end)
    #expect(Rules.movement(.return, axis: .horizontal, layoutDirection: .leftToRight) == nil)
    #expect(Rules.movement(.space, axis: .horizontal, layoutDirection: .leftToRight) == nil)
    #expect(!Rules.keys.contains(.return) && !Rules.keys.contains(.space))
  }

  /// TBR-10 — one Tab stop: the item focused last while it is enabled, else the first enabled item; never a disabled one.
  @Test("TBR-10 the Tab stop is the item focused last, else the first enabled one")
  func tabStop() {
    typealias Rules = TanreiJoinedRovingRules
    #expect(Rules.tabStop(last: nil, enabled: [true, true, true]) == 0)
    #expect(Rules.tabStop(last: nil, enabled: [false, true, true]) == 1)
    #expect(Rules.tabStop(last: 2, enabled: [true, true, true]) == 2)
    #expect(Rules.tabStop(last: 2, enabled: [true, true, false]) == 0)
    #expect(Rules.tabStop(last: 5, enabled: [true, true]) == 0)
    #expect(Rules.tabStop(last: nil, enabled: [false, false]) == nil)
  }

  /// TBR-10 — the next and previous enabled item, wrapping at the ends; Home and End the first and last enabled item;
  /// disabled items are skipped.
  @Test("TBR-10 the arrows wrap and skip disabled items; Home and End go to the enabled ends")
  func targets() {
    typealias Rules = TanreiJoinedRovingRules
    let enabled = [false, true, false, true, true, false]
    #expect(Rules.target(for: .downArrow, from: 1, enabled: enabled) == 3)
    #expect(Rules.target(for: .downArrow, from: 4, enabled: enabled) == 1)
    #expect(Rules.target(for: .upArrow, from: 1, enabled: enabled) == 4)
    #expect(Rules.target(for: .upArrow, from: 3, enabled: enabled) == 1)
    #expect(Rules.target(for: .home, from: 4, enabled: enabled) == 1)
    #expect(Rules.target(for: .end, from: 1, enabled: enabled) == 4)
    #expect(Rules.target(for: .downArrow, from: 0, enabled: [false, false]) == nil)
  }

  /// TBR-10 — the row's state: a move makes the target the Tab stop at once and gives it focus (through the item's own
  /// focus) without activating anything; an item that takes focus becomes the stop; a disabled item reported by its view
  /// is skipped and never the stop.
  @Test("TBR-10 a move makes the target the Tab stop and focuses it, activating nothing")
  func model() async {
    let model = TanreiJoinedRovingModel()
    var focused: [Int] = []
    for index in 0..<4 { model.register(index) { focused.append(index) } }
    #expect(model.isTabStop(0, count: 4))
    model.update([0: true, 1: false, 2: true, 3: true])
    #expect(model.move(from: 0, count: 4, movement: .downArrow))
    #expect(model.last == 2 && model.isTabStop(2, count: 4) && !model.isTabStop(0, count: 4))
    await Task.yield()
    await Task.yield()
    #expect(focused == [2])
    model.didFocus(3)
    #expect(model.isTabStop(3, count: 4))
    model.update([0: true, 1: false, 2: true, 3: false])
    #expect(model.isTabStop(0, count: 4))
  }

  #if os(macOS)
  /// TBR-10 / TBR-2 — the items report whether they are enabled to the toolbar that holds them, through the view tree: a
  /// disabled item is never the Tab stop; moving focus activates nothing.
  @Test("TBR-10 the items report their enabled state; moving focus activates nothing")
  func itemsReport() {
    let counter = Counter()
    let focus = TanreiJoinedRovingModel()
    let hosted = HostedView(
      TanreiToolbar("Message actions", focus: focus) {
        TanreiIconButton("Archive", action: counter.fire("archive")) { Image(systemName: "archivebox") }.disabled(true)
        TanreiIconButton("Delete", action: counter.fire("delete")) { Image(systemName: "trash") }
        TanreiButton("Reply", action: counter.fire("reply"))
      }
      .frame(width: 360)
      .tanreiTheme(Snapshot.theme))
    hosted.settle(0.2)
    #expect(focus.enabled == [0: false, 1: true, 2: true])
    #expect(focus.isTabStop(1, count: 3) && !focus.isTabStop(0, count: 3))
    focus.move(from: 1, count: 3, movement: .downArrow)
    focus.move(from: 2, count: 3, movement: .downArrow)
    hosted.settle(0.2)
    #expect(focus.last == 1)
    #expect(counter.counts.isEmpty)
  }
  #endif
}

// MARK: - Snapshots (one per spec fixture)

@MainActor
@Suite("TanreiToolbar snapshots")
struct TanreiToolbarSnapshotTests {
  /// Mirrors `fixtures` in specs/toolbar.spec.json; the items are read from the spec itself.
  nonisolated static let fixtures = [
    "docked", "docked-button", "docked-one-item", "docked-disabled-item", "floating", "floating-filled-action", "floating-vertical",
  ]

  /// The SF Symbol a product would pass for each of the fixtures' glyph names (see the file header).
  static let symbols = [
    "archive": "archivebox", "delete": "trash", "mark_email_unread": "envelope.badge", "drive_file_move": "folder",
    "attach_file": "paperclip", "image": "photo", "link": "link", "format_bold": "bold", "format_italic": "italic",
    "format_underlined": "underline", "edit": "pencil", "ink_highlighter": "highlighter", "ink_eraser": "eraser", "check": "checkmark",
    "add": "plus", "remove": "minus", "my_location": "scope",
  ]

  /// One item, as a product writes it: an action's content is its glyph, a Button's its label.
  @ViewBuilder
  static func item(_ item: SpecItem) -> some View {
    let disabled = item.bool("disabled") ?? false
    if item.kind == "action" {
      let variant = TanreiIconButtonVariant(rawValue: item.string("variant") ?? TanreiIconButtonVariant.fallback.rawValue)
      let symbol = Image(systemName: symbols[item.content ?? ""] ?? "questionmark")
      if item.bool("toggle") ?? false {
        TanreiIconButton(item.string("label") ?? "", isSelected: .constant(item.bool("selected") ?? false), variant: variant) { symbol }
          .disabled(disabled)
      } else {
        TanreiIconButton(item.string("label") ?? "", variant: variant, action: {}) { symbol }
          .disabled(disabled)
      }
    } else {
      TanreiButton(item.content ?? "", variant: TanreiButtonVariant(rawValue: item.string("variant") ?? TanreiButtonVariant.fallback.rawValue), action: {})
        .disabled(disabled)
    }
  }

  /// The fixture on its stage: docked 360 × 56 (TBR-1), floating centered in 360 × 96 (TBR-4), vertical in 96 × 240 (TBR-6).
  static func view(_ fixture: SpecFixture) -> some View {
    let variant = TanreiToolbarVariant(rawValue: fixture.string("variant") ?? TanreiToolbarVariant.fallback.rawValue)
    let orientation = TanreiToolbarOrientation(named: fixture.string("orientation") ?? "horizontal")
    let stage =
      variant != .floating ? CGSize(width: 360, height: 56) : orientation == .vertical ? CGSize(width: 96, height: 240) : CGSize(width: 360, height: 96)
    return TanreiToolbar(fixture.string("label") ?? "", variant: variant, orientation: orientation) {
      ForEach(Array((fixture.items ?? []).enumerated()), id: \.offset) { _, spec in item(spec) }
    }
    .frame(width: stage.width, height: stage.height)
  }

  static func fixture(_ id: String) throws -> SpecFixture {
    try #require(try SpecFixture.load(spec: "toolbar").first { $0.id == id })
  }

  @Test("fixture matches its baseline", arguments: fixtures)
  func fixture(_ id: String) throws {
    try Snapshot.assert(Self.view(try Self.fixture(id)), named: id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    let spec = try SpecFixture.load(spec: "toolbar")
    #expect(spec.map(\.id) == Self.fixtures)
    // Every item kind and glyph a fixture uses is drawn.
    for fixture in spec {
      for item in fixture.items ?? [] {
        #expect(["action", "button"].contains(item.kind), "\(fixture.id)")
        if item.kind == "action" { #expect(Self.symbols[item.content ?? ""] != nil, "\(fixture.id): \(item.content ?? "")") }
      }
    }
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiToolbarTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiToolbar preset snapshots")
struct TanreiToolbarPresetSnapshotTests {
  /// The floating toolbar: the preset's raised surface, its corners and elevation, with toggles on and off.
  nonisolated static let fixtureId = "floating"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiToolbarSnapshotTests.fixtures.contains(Self.fixtureId))
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try TanreiToolbarSnapshotTests.fixture(Self.fixtureId)
    try Snapshot.assert(TanreiToolbarSnapshotTests.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}

