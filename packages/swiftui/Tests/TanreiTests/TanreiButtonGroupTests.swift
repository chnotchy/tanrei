import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/button-group.spec.json. Each behavior id (BGR-n) is named next to the test that covers it; the parity
// checker requires every id to appear in this file. The items are TanreiButton and TanreiIconButton, whose own behavior
// is TanreiButtonTests' and TanreiIconButtonTests'; here the group's reach into them (BTN-10, ICB-10) is proven, and that
// it reaches no further.
//
// The fixtures render the group at its natural width, start-aligned and vertically centred on a 400 × 96 stage (BGR-1
// verify). Their icon buttons are drawn at the width of the input type this harness has — macOS, a fine pointer, so
// `sys.target.pointer` — and their glyphs as the SF Symbols a product would pass (edit → pencil, share →
// square.and.arrow.up, delete → trash, format_bold → bold, format_italic → italic, format_underlined → underline):
// baselines render with `fontFamilyPolicy: .system`, under which a Tanrei glyph draws nothing (TanreiIconButtonTests).
// The accessibility tree (BGR-6) and the keyboard (BGR-5) are checked in the Gallery's UI tests, where they exist.

private let suiteName = "TanreiButtonGroupTests"

@MainActor
private final class Counter {
  var counts: [String: Int] = [:]
  func fire(_ id: String) -> @MainActor () -> Void { { self.counts[id, default: 0] += 1 } }
}

/// A toggle's state, outside any view: what a `Binding` in a real app points at.
@MainActor
private final class Flag {
  var isOn: Bool
  init(_ isOn: Bool) { self.isOn = isOn }

  var binding: Binding<Bool> {
    Binding(get: { MainActor.assumeIsolated { self.isOn } }, set: { value in MainActor.assumeIsolated { self.isOn = value } })
  }
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

/// The horizontal extents (points) along row `y` where the render is `color` — each item's container, read off the
/// pixels.
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

/// The vertical extents (points) along column `x` where the render is `color`.
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

private let colors = TanreiSystem.tanrei.colors.light
private let tokens = TanreiSystem.tanrei.buttonGroup
private let buttonTokens = TanreiSystem.tanrei.button
private let target = TanreiHitTarget.minimum(in: TanreiSystem.tanrei.measure)

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

/// The place a group gives item `index` of `count`.
private func place(_ index: Int, of count: Int, _ variant: TanreiButtonGroupVariant = .connected) -> TanreiJoinedPlace {
  TanreiButtonGroupArrangement(tokens: tokens, variant: variant, target: target).places(count: count)[index]
}

// MARK: - Token bindings and places (BGR-1 … BGR-4, BGR-11)

@MainActor
@Suite("TanreiButtonGroup token bindings")
struct TanreiButtonGroupTokenTests {
  /// BGR-1 — standard reads `standard.gap`, connected `connected.gap`; BGR-2 — `connected.inner-shape`; BGR-3 — the
  /// platform's target.
  @Test("BGR-1 BGR-2 BGR-3 each variant reads its own tokens")
  func bindings() {
    let standard = TanreiButtonGroupArrangement(tokens: tokens, variant: .standard, target: target)
    let connected = TanreiButtonGroupArrangement(tokens: tokens, variant: .connected, target: target)
    #expect(standard.gap == tokens.standardGap && connected.gap == tokens.connectedGap)
    #expect(standard.gap != connected.gap)
    #expect(connected.innerRadius == tokens.connectedInnerShape)
    #expect(connected.target == TanreiHitTarget.minimum(in: TanreiSystem.tanrei.measure))
  }

  /// BGR-2, BGR-3 — only a connected item gets inner corners and a minimum width, and only at the sides that face a
  /// neighbour; the first item's leading corners and the last item's trailing ones stay its own. BGR-4 — a hit area may
  /// reach half the gap toward a neighbour and without limit at an end of the row.
  @Test("BGR-2 BGR-3 BGR-4 the place of each item")
  func places() {
    let connected = TanreiButtonGroupArrangement(tokens: tokens, variant: .connected, target: target).places(count: 3)
    #expect(connected.map(\.innerLeading) == [false, true, true])
    #expect(connected.map(\.innerTrailing) == [true, true, false])
    #expect(connected.allSatisfy { $0.minimumWidth == target && $0.isConnected })
    #expect(connected[0].corners(own: 6) == TanreiSideCorners(leading: 6, trailing: tokens.connectedInnerShape))
    #expect(connected[1].corners(own: 6) == TanreiSideCorners(leading: tokens.connectedInnerShape, trailing: tokens.connectedInnerShape))
    #expect(connected[2].corners(own: 6) == TanreiSideCorners(leading: tokens.connectedInnerShape, trailing: 6))
    #expect(connected[0].reachLeading == .infinity && connected[0].reachTrailing == tokens.connectedGap / 2)
    #expect(connected[2].reachLeading == tokens.connectedGap / 2 && connected[2].reachTrailing == .infinity)

    let standard = TanreiButtonGroupArrangement(tokens: tokens, variant: .standard, target: target).places(count: 3)
    #expect(standard.allSatisfy { $0.corners(own: 6) == nil && $0.minimumWidth == 0 && !$0.isConnected })
    #expect(standard[1].reachLeading == tokens.standardGap / 2 && standard[1].reachTrailing == tokens.standardGap / 2)
  }

  /// BGR-11 — the places are those of the items there are: removing one makes its neighbour's facing side an outer one;
  /// a single item has no inner corner.
  @Test("BGR-11 places follow the items there are")
  func placesFollowTheItems() {
    let arrangement = TanreiButtonGroupArrangement(tokens: tokens, variant: .connected, target: target)
    #expect(arrangement.places(count: 2)[1].innerTrailing == false)
    #expect(arrangement.places(count: 3)[1].innerTrailing == true)
    #expect(arrangement.places(count: 1)[0].corners(own: 6) == nil)
    #expect(arrangement.places(count: 0).isEmpty)
  }

  /// BGR-4 — the sideways reach: half of what is missing on each side, no more than the allowance; the side that may
  /// reach further takes what the other cannot; nothing when the item is already the target wide.
  @Test("BGR-4 hit area reach")
  func reach() {
    let free = TanreiJoinedPlace.reach(visual: 32, target: 48, leading: .infinity, trailing: .infinity)
    #expect(free.leading == 8 && free.trailing == 8)
    let middle = TanreiJoinedPlace.reach(visual: 32, target: 48, leading: 4, trailing: 4)
    #expect(middle.leading == 4 && middle.trailing == 4)
    let first = TanreiJoinedPlace.reach(visual: 32, target: 48, leading: .infinity, trailing: 4)
    #expect(first.leading == 12 && first.trailing == 4)
    let last = TanreiJoinedPlace.reach(visual: 32, target: 48, leading: 4, trailing: .infinity)
    #expect(last.leading == 4 && last.trailing == 12)
    let wide = TanreiJoinedPlace.reach(visual: 60, target: 48, leading: 4, trailing: 4)
    #expect(wide.leading == 0 && wide.trailing == 0)
  }

  /// BGR-4 — under the default system `standard.gap` is `sys.target.touch` minus the small icon button: an icon
  /// button of every size, between two neighbours, reaches its whole target on both sides, under a touch as under a pointer.
  @Test("BGR-4 the default gap keeps every icon button's whole target between neighbours")
  func defaultGapKeepsWholeTargets() {
    let system = TanreiSystem.tanrei
    #expect(tokens.standardGap >= system.measure.targetTouch - system.iconButton.sizes.small.containerSize)
    let middle = TanreiButtonGroupArrangement(tokens: tokens, variant: .standard, target: target).places(count: 3)[1]
    for size in system.iconButton.sizes.keys {
      let side = system.iconButton.sizes[size].containerSize
      for minimum in [system.measure.targetTouch, system.measure.targetPointer] {
        let reach = TanreiJoinedPlace.reach(visual: side, target: minimum, leading: middle.reachLeading, trailing: middle.reachTrailing)
        let half = max(0, minimum - side) / 2
        #expect(reach.leading == half && reach.trailing == half, "\(size) at \(minimum): \(reach)")
      }
    }
  }

  /// BGR-7 — narrowing: in proportion to the widths, none below its least width; an item whose least is its natural
  /// width (an icon button) keeps it; a row that fits is untouched; one that cannot fit keeps the least widths.
  @Test("BGR-7 widths narrow in proportion, down to the least")
  func widths() {
    let natural: [CGFloat] = [100, 50, 40]
    let least: [CGFloat] = [60, 30, 40]
    // Fits: untouched.
    #expect(TanreiButtonGroupArrangement.widths(natural: natural, least: least, gap: 8, available: 206) == natural)
    #expect(TanreiButtonGroupArrangement.widths(natural: natural, least: least, gap: 8, available: nil) == natural)
    // 30 too wide: the two Buttons give 20 and 10 (100 : 50); the icon button keeps its 40.
    let narrowed = TanreiButtonGroupArrangement.widths(natural: natural, least: least, gap: 8, available: 176)
    #expect(abs(narrowed[0] - 80) < 0.01 && abs(narrowed[1] - 40) < 0.01 && narrowed[2] == 40)
    // 60 too wide: the second is held at 30, the first takes the rest.
    let held = TanreiButtonGroupArrangement.widths(natural: natural, least: least, gap: 8, available: 146)
    #expect(held[1] == 30 && abs(held[0] - 60) < 0.01 && held[2] == 40)
    // Cannot fit: every item at its least.
    #expect(TanreiButtonGroupArrangement.widths(natural: natural, least: least, gap: 8, available: 50) == least)
  }

  /// BGR-9 — a variant named from data that the group does not define is standard, and reported; every value the spec
  /// defines is a case.
  @Test("BGR-9 an unknown variant is standard and reported")
  func unknownVariant() throws {
    #expect(TanreiButtonGroupVariant.allCases.map(\.rawValue) == ["standard", "connected"])
    #expect(TanreiButtonGroupVariant(named: "connected") == .connected)
    let (variant, reports) = Reports.collecting { TanreiButtonGroupVariant(named: "split") }
    #expect(variant == .standard)
    #expect(reports.mention("\"split\"") && reports.mention("BGR-9"))
    // Rendered: exactly the standard group.
    func group(_ variant: TanreiButtonGroupVariant) -> some View {
      TanreiButtonGroup(variant: variant) {
        TanreiButton("Cut", variant: .outlined, action: {})
        TanreiButton("Copy", variant: .outlined, action: {})
      }
    }
    let unknown = try Reports.collecting { try Snapshot.renderExact(group(TanreiButtonGroupVariant(named: "split"))) }.value
    #expect(unknown.pixels == (try Snapshot.renderExact(group(.standard))).pixels)
  }

  /// BGR-10 — fewer than two items, and content that is not a Tanrei Button or icon button, are reported.
  @Test("BGR-10 what a debug build reports about the content")
  func problems() {
    #expect(TanreiButtonGroupArrangement.problems(kinds: [true, true]).isEmpty)
    #expect(TanreiButtonGroupArrangement.problems(kinds: [true]).count == 1)
    #expect(TanreiButtonGroupArrangement.problems(kinds: []).first?.contains("BGR-10") == true)
    let foreign = TanreiButtonGroupArrangement.problems(kinds: [true, false, true])
    #expect(foreign.count == 1 && foreign[0].contains("item 2") && foreign[0].contains("BGR-10"))
  }
}

// MARK: - Layout (BGR-1, BGR-3, BGR-7, BGR-8)

@MainActor
@Suite("TanreiButtonGroup layout")
struct TanreiButtonGroupLayoutTests {
  /// BGR-1 — standard: in order, `standard.gap` apart, each at its own width.
  @Test("BGR-1 standard items are standard.gap apart, in order, each at its own width")
  func standardGap() throws {
    let bitmap = try Snapshot.render(
      TanreiButtonGroup {
        TanreiButton("Cancel", action: {})
        TanreiButton("Save draft", action: {})
        TanreiButton("Publish", action: {})
      })
    let fill = colors[.primary].rgba8()
    let found = runs(bitmap, y: Snapshot.inset + 5, color: fill)
    #expect(found.count == 3, "\(found)")
    guard found.count == 3 else { return }
    for i in 0..<2 {
      #expect(abs(found[i + 1].lowerBound - found[i].upperBound - tokens.standardGap) <= 1, "\(found)")
    }
    let natural = try measure(TanreiButton("Save draft", action: {}), width: nil).width
    #expect(abs((found[1].upperBound - found[1].lowerBound) - natural) <= 1)
    #expect(abs(found[0].lowerBound - Snapshot.inset) <= 0.5)
  }

  /// BGR-1 — a modified system's gaps drive the row.
  @Test("BGR-1 a modified system drives both gaps")
  func modifiedGaps() throws {
    var custom = TanreiSystem.tanrei
    custom.buttonGroup.standardGap = 20
    custom.buttonGroup.connectedGap = 6
    for (variant, gap) in [(TanreiButtonGroupVariant.standard, CGFloat(20)), (.connected, 6)] {
      let bitmap = try Snapshot.render(
        TanreiButtonGroup(variant: variant) {
          TanreiButton("One", action: {})
          TanreiButton("Two", action: {})
        }, theme: theme(custom))
      let found = runs(bitmap, y: Snapshot.inset + 5, color: colors[.primary].rgba8())
      #expect(found.count == 2 && abs(found[1].lowerBound - found[0].upperBound - gap) <= 1, "\(variant): \(found)")
    }
  }

  /// BGR-1 — standard items are centred on the row's middle; connected items are all stretched to the tallest (a
  /// Button's height is a minimum), so the joined shape stays even when a label wraps.
  @Test("BGR-1 standard centres, connected stretches to the tallest")
  func heights() throws {
    func group(_ variant: TanreiButtonGroupVariant) -> some View {
      TanreiButtonGroup(variant: variant) {
        TanreiButton("Two\nlines", action: {})
        TanreiButton("One", action: {})
      }
    }
    let fill = colors[.primary].rgba8()
    let height = buttonTokens.sizes.medium.containerHeight
    // Standard: the one-line Button keeps its height, centred beside the taller one.
    let standard = try Snapshot.render(group(.standard))
    let rows = try #require(runs(standard, y: Snapshot.inset + 5, color: fill).first)
    let tall = columnRuns(standard, x: rows.lowerBound + 8, color: fill)
    let tallExtent = try #require(tall.first?.lowerBound).distance(to: try #require(tall.last?.upperBound))
    #expect(tallExtent > height + 4)
    // Near the one-line Button's top, where neither label is.
    let standardRuns = runs(standard, y: Snapshot.inset + tallExtent / 2 - height / 2 + 4, color: fill)
    let one = try #require(standardRuns.last)
    let short = columnRuns(standard, x: one.lowerBound + 8, color: fill)
    let shortTop = try #require(short.first?.lowerBound)
    let shortBottom = try #require(short.last?.upperBound)
    #expect(abs(shortBottom - shortTop - height) <= 1)
    #expect(abs((shortTop + shortBottom) / 2 - (Snapshot.inset + tallExtent / 2)) <= 1)
    // Connected: both as tall as the tallest.
    let connected = try Snapshot.render(group(.connected))
    let joined = runs(connected, y: Snapshot.inset + 5, color: fill)
    #expect(joined.count == 2, "\(joined)")
    for run in joined {
      let column = columnRuns(connected, x: run.lowerBound + 8, color: fill)
      let extent = try #require(column.first?.lowerBound).distance(to: try #require(column.last?.upperBound))
      #expect(abs(extent - tallExtent) <= 1, "\(column)")
    }
  }

  /// BGR-3 — a connected icon button is at least the target wide, its icon centred; outside a connected group it keeps its
  /// square. A connected Button already wider keeps its width.
  @Test("BGR-3 connected icon buttons widen to the target around a centred icon")
  func connectedMinimumWidth() throws {
    let side = TanreiSystem.tanrei.iconButton.sizes.medium.containerSize
    #expect(side < target)
    func group(_ variant: TanreiButtonGroupVariant) -> some View {
      TanreiButtonGroup(variant: variant) {
        TanreiIconButton("Bold", variant: .filled, action: {}) { Rectangle().frame(width: 4, height: 4) }
        TanreiIconButton("Italic", variant: .filled, action: {}) { Rectangle().frame(width: 4, height: 4) }
      }
    }
    let fill = colors[.primary].rgba8()
    let y = Snapshot.inset + side / 4
    let connected = runs(try Snapshot.render(group(.connected)), y: y, color: fill)
    #expect(connected.count == 2 && connected.allSatisfy { abs($0.upperBound - $0.lowerBound - target) <= 1 }, "\(connected)")
    let standard = runs(try Snapshot.render(group(.standard)), y: y, color: fill)
    #expect(standard.count == 2 && standard.allSatisfy { abs($0.upperBound - $0.lowerBound - side) <= 1 }, "\(standard)")
    // The icon is centred in the widened container: the first run of the icon's color inside the first item.
    let bitmap = try Snapshot.render(group(.connected))
    let icon = runs(bitmap, y: Snapshot.inset + side / 2, color: colors[.onPrimary].rgba8())
    let first = try #require(icon.first { $0.lowerBound > Snapshot.inset + 1 })
    #expect(abs((first.lowerBound + first.upperBound) / 2 - (Snapshot.inset + target / 2)) <= 1, "\(icon)")
  }

  /// BGR-7 — a Button's least width in a group is its longest word and its padding: the label wraps between words and
  /// never inside one. Outside a group nothing changes (a Button given less than a word breaks it, as `Text` does).
  @Test("BGR-7 a grouped Button is never narrower than its longest word")
  func longestWord() throws {
    let grouped = try measure(TanreiButton("Save draft", action: {}).environment(\.tanreiJoinedPlace, place(0, of: 2, .standard)), width: 0)
    let words = max(try measure(TanreiButton("Save", action: {}), width: nil).width, try measure(TanreiButton("draft", action: {}), width: nil).width)
    #expect(abs(grouped.width - words) <= 0.5, "\(grouped) vs \(words)")
    let alone = try measure(TanreiButton("Save draft", action: {}), width: 0)
    #expect(alone.width < words)
  }

  /// BGR-7 — a row wider than its space narrows its Buttons (their labels wrap: the row grows taller), keeps its icon
  /// buttons, stays one row; one that still does not fit overflows and is reported.
  @Test("BGR-7 a row that does not fit narrows its Buttons, never wraps, and reports what still does not fit")
  func narrowing() throws {
    func group() -> some View {
      TanreiButtonGroup {
        TanreiButton("Save draft", action: {})
        TanreiButton("Publish now", action: {})
        TanreiIconButton("Share", action: {}) { Rectangle().frame(width: 4, height: 4) }
      }
    }
    let natural = try measure(group(), width: nil)
    let height = buttonTokens.sizes.medium.containerHeight
    #expect(abs(natural.height - height) <= 0.5)
    let (narrow, fits) = try Reports.collecting { try measure(group(), width: natural.width - 40) }
    #expect(narrow.width <= natural.width - 40 + 0.5)
    #expect(narrow.height > height + 4, "the labels wrap: \(narrow)")
    #expect(fits.messages.isEmpty, "\(fits.messages)")
    // Rendered in a space too narrow for even the longest words: one row, overflowing, reported.
    let (bitmap, reports) = try Reports.collecting { try Snapshot.render(group().frame(width: 60, alignment: .leading)) }
    #expect(reports.mention("BGR-7"), "\(reports.messages)")
    #expect(CGFloat(bitmap.height) / Snapshot.scale < 2 * Snapshot.inset + 3 * height)
  }

  /// BGR-8 — right to left: the first item is on the right, with its outer corners on its right; the inner corners
  /// mirror with it.
  @Test("BGR-8 right to left orders from the right and mirrors the inner corners")
  func rightToLeft() throws {
    let first = colors[.primary].rgba8()
    let second = colors[TanreiButtonAppearance(tokens: buttonTokens, variant: .tonal, size: .medium, state: .enabled).container].rgba8()
    func group() -> some View {
      TanreiButtonGroup(variant: .connected) {
        TanreiButton("One", variant: .filled, action: {})
        TanreiButton("Two", variant: .tonal, action: {})
      }
    }
    let ltr = try Snapshot.render(group())
    let rtl = try Snapshot.render(group().environment(\.layoutDirection, .rightToLeft))
    let y = Snapshot.inset + 5
    let ltrFirst = try #require(runs(ltr, y: y, color: first).first)
    let ltrSecond = try #require(runs(ltr, y: y, color: second).first)
    #expect(ltrFirst.upperBound < ltrSecond.lowerBound)
    let rtlFirst = try #require(runs(rtl, y: y, color: first).first)
    let rtlSecond = try #require(runs(rtl, y: y, color: second).first)
    #expect(rtlSecond.upperBound < rtlFirst.lowerBound)
    // The corners: 1.25 points in from a corner is inside the inner radius (3) and outside the own one (6).
    let d: CGFloat = 1.25
    let top = Snapshot.inset + d
    // Right to left, the first item's inner corner is its LEFT one, its own corner its right one.
    #expect(pixel(rtl, x: rtlFirst.lowerBound + d, y: top).isClose(to: first, tolerance: 24))
    #expect(pixel(rtl, x: rtlFirst.upperBound - d, y: top).isClose(to: colors[.surface].rgba8(), tolerance: 24))
    #expect(pixel(ltr, x: ltrFirst.upperBound - d, y: top).isClose(to: first, tolerance: 24))
    #expect(pixel(ltr, x: ltrFirst.lowerBound + d, y: top).isClose(to: colors[.surface].rgba8(), tolerance: 24))
  }
}

// MARK: - Corners (BGR-2, BGR-11)

@MainActor
@Suite("TanreiButtonGroup corners")
struct TanreiButtonGroupCornerTests {
  /// `d` points in from a corner along its diagonal is inside a rounded corner of radius r when d ≥ r (1 − 1/√2).
  static let d: CGFloat = 1.25

  /// BGR-2 — connected: the corners that face a neighbour are `connected.inner-shape`, the outer ones the item's own; the
  /// fill and the outline follow. Standard: every corner is the item's own.
  @Test("BGR-2 inner corners in the fill and the outline; standard leaves every corner")
  func innerCorners() throws {
    let fill = colors[.primary].rgba8()
    let surface = colors[.surface].rgba8()
    func group(_ variant: TanreiButtonGroupVariant, _ buttonVariant: TanreiButtonVariant) -> some View {
      TanreiButtonGroup(variant: variant) {
        TanreiButton("One", variant: buttonVariant, action: {})
        TanreiButton("Two", variant: buttonVariant, action: {})
      }
    }
    let connected = try Snapshot.render(group(.connected, .filled))
    let items = runs(connected, y: Snapshot.inset + 5, color: fill)
    #expect(items.count == 2)
    let top = Snapshot.inset + Self.d
    let height = buttonTokens.sizes.medium.containerHeight
    let bottom = Snapshot.inset + height - Self.d
    for y in [top, bottom] {
      #expect(pixel(connected, x: items[0].lowerBound + Self.d, y: y).isClose(to: surface, tolerance: 24))  // own
      #expect(pixel(connected, x: items[0].upperBound - Self.d, y: y).isClose(to: fill, tolerance: 24))  // inner
      #expect(pixel(connected, x: items[1].lowerBound + Self.d, y: y).isClose(to: fill, tolerance: 24))  // inner
      #expect(pixel(connected, x: items[1].upperBound - Self.d, y: y).isClose(to: surface, tolerance: 24))  // own
    }
    let standard = try Snapshot.render(group(.standard, .filled))
    let separate = runs(standard, y: Snapshot.inset + 5, color: fill)
    #expect(pixel(standard, x: separate[0].upperBound - Self.d, y: top).isClose(to: surface, tolerance: 24))
    // The outline of an outlined item follows the inner corner: at the inner corner's edge, the outline color.
    let outline = colors[TanreiButtonAppearance(tokens: buttonTokens, variant: .outlined, size: .medium, state: .enabled).outline].rgba8()
    let outlined = try Snapshot.render(group(.connected, .outlined))
    // The first item's sides: the outline's vertical lines, at mid height.
    let sides = runs(outlined, y: Snapshot.inset + height / 2, color: outline, tolerance: 40)
    let start = try #require(sides.first?.lowerBound)
    let end = try #require(sides.dropFirst().first?.upperBound)
    // Along its top edge the outline reaches closer to the inner (trailing) edge than to the leading one.
    let edge = try #require(runs(outlined, y: Snapshot.inset + 0.25, color: outline, tolerance: 40).first)
    #expect(edge.lowerBound - start > end - edge.upperBound + 1, "\(edge) in \(start)…\(end)")
  }

  /// BGR-2 — the focus ring follows the joined shape: concentric with the inner corner where the item meets its neighbour.
  /// BTN-10 / ICB-10: the item draws it, from the channel.
  @Test("BGR-2 the focus ring follows the inner corners")
  func focusRing() throws {
    let place = place(0, of: 2)
    func chrome(_ place: TanreiJoinedPlace?) -> some View {
      TanreiButtonChrome(variant: .filled, size: .medium, isPressed: false, isFocused: true) { Text("One") }
        .environment(\.tanreiJoinedPlace, place)
        .padding(8)
    }
    let joined = try Snapshot.render(chrome(place))
    let alone = try Snapshot.render(chrome(nil))
    let ring = colors[.focusRing].rgba8()
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: buttonTokens.containerShape, measure: TanreiSystem.tanrei.measure)
    // The outer stroke's centre line, `c` outside the container, rounded by the corner's radius + c. On the diagonal of the
    // trailing top corner, `t` in from the corner of that line: on the stroke of the inner corner's ring, outside the own one's.
    let c = metrics.outerCenterlineOutset
    let w = metrics.outerWidth
    let inner = tokens.connectedInnerShape + c
    let own = buttonTokens.containerShape + c
    let onInner = (inner - (inner + w / 2) / 2.squareRoot())...(inner - (inner - w / 2) / 2.squareRoot())
    let ownStarts = own - (own + w / 2) / 2.squareRoot()
    #expect(onInner.lowerBound < ownStarts)
    let t = (onInner.lowerBound + min(onInner.upperBound, ownStarts)) / 2
    let width = CGFloat(alone.width) / Snapshot.scale
    let x = width - Snapshot.inset - 8 + c - t
    let y = Snapshot.inset + 8 - c + t
    #expect(pixel(joined, x: x, y: y).isClose(to: ring, tolerance: 60), "\(pixel(joined, x: x, y: y))")
    #expect(!pixel(alone, x: x, y: y).isClose(to: ring, tolerance: 60), "\(pixel(alone, x: x, y: y))")
  }

  /// BGR-2 — under `ripple` the pressed layer is clipped to the joined shape too (m3-like: pill ends, inner corners 8).
  @Test("BGR-2 the ripple follows the inner corners")
  func ripple() throws {
    let system = TanreiSystem.m3Like
    let colors = system.colors.light
    let place = TanreiButtonGroupArrangement(tokens: system.buttonGroup, variant: .connected, target: target).places(count: 2)[0]
    let appearance = TanreiButtonAppearance(tokens: system.button, variant: .filled, size: .medium, state: .pressed, feedback: .ripple)
    #expect(appearance.ripple != nil)
    let bitmap = try Snapshot.render(
      TanreiButtonChrome(variant: .filled, size: .medium, isPressed: true, isFocused: false) { Text("One") }
        .environment(\.tanreiJoinedPlace, place), theme: theme(system))
    let width = CGFloat(bitmap.width) / Snapshot.scale
    // 3 points in on the diagonal: inside the inner corner (8), far outside the pill's end.
    let d: CGFloat = 3
    #expect(system.behavior.pressedFeedback == .ripple)
    #expect(!pixel(bitmap, x: width - Snapshot.inset - d, y: Snapshot.inset + d).isClose(to: colors[.surface].rgba8(), tolerance: 24))
    #expect(pixel(bitmap, x: Snapshot.inset + d, y: Snapshot.inset + d).isClose(to: colors[.surface].rgba8(), tolerance: 24))
  }

  /// BGR-2 — a modified inner shape drives the corners.
  @Test("BGR-2 a modified system drives the inner corner")
  func modifiedInnerShape() throws {
    var custom = TanreiSystem.tanrei
    custom.buttonGroup.connectedInnerShape = custom.button.containerShape
    let fill = colors[.primary].rgba8()
    let bitmap = try Snapshot.render(
      TanreiButtonGroup(variant: .connected) {
        TanreiButton("One", action: {})
        TanreiButton("Two", action: {})
      }, theme: theme(custom))
    let items = runs(bitmap, y: Snapshot.inset + 5, color: fill)
    #expect(pixel(bitmap, x: items[0].upperBound - Self.d, y: Snapshot.inset + Self.d).isClose(to: colors[.surface].rgba8(), tolerance: 24))
  }

  /// BGR-11 — a disabled item keeps its place, its gap and its corners: the connected-disabled fixture's items sit where
  /// the connected fixture's do.
  @Test("BGR-11 a disabled item keeps its place, gap and corners")
  func disabledKeepsItsPlace() throws {
    func group(disabled: Bool) -> some View {
      TanreiButtonGroup(variant: .connected) {
        TanreiButton("Cut", variant: .outlined, action: {})
        TanreiButton("Copy", variant: .outlined, action: {}).disabled(disabled)
        TanreiButton("Paste", variant: .outlined, action: {})
      }
    }
    let y = Snapshot.inset + buttonTokens.sizes.medium.containerHeight / 2
    let enabled = runs(try Snapshot.render(group(disabled: false)), y: y, color: colors[.outline].rgba8(), tolerance: 40)
    let disabled = runs(try Snapshot.render(group(disabled: true)), y: y, color: colors[.outline].rgba8(), tolerance: 40)
    // The outer items' edges are where they were (the disabled one's outline is dimmed and may not match the color).
    #expect(enabled.first == disabled.first && enabled.last == disabled.last, "\(enabled) / \(disabled)")
  }

  #if os(macOS)
  /// BGR-11 — an item removed inside an animated transaction: its neighbour's corner becomes an outer one at once, never
  /// animated.
  @Test("BGR-11 corners change at once when an item is removed, even in an animation")
  func removalIsNotAnimated() async throws {
    final class Model: ObservableObject {
      @Published var showsLast = true
    }
    struct Row: View {
      @ObservedObject var model: Model
      var body: some View {
        TanreiButtonGroup(variant: .connected) {
          TanreiButton("One", variant: .outlined, action: {})
          TanreiButton("Two", action: {})
          if model.showsLast { TanreiButton("Three", variant: .outlined, action: {}) }
        }
      }
    }
    let model = Model()
    let hosted = HostedView(
      Row(model: model).padding(Snapshot.inset).frame(width: 300, alignment: .leading).background(colors[.surface]).tanreiTheme(Snapshot.theme))
    // The hosted window may be backed at 1× or 2×: read its bitmap in points.
    let bitmap = try #require(hosted.bitmap())
    let scale = CGFloat(bitmap.width) / hosted.size.width
    let row = Int((Snapshot.inset + 5) * scale)
    let filled = (0..<bitmap.width).filter { bitmap[$0, row].isClose(to: colors[.primary].rgba8(), tolerance: 8) }
    let secondEnd = CGFloat(try #require(filled.last) + 1) / scale
    // The filled item's trailing corner: inner while "Three" follows it, its own once "Three" is gone.
    let corner = CGPoint(x: secondEnd - 1.5, y: Snapshot.inset + 1.5)
    #expect(hosted.color(at: corner)?.isClose(to: colors[.primary].rgba8(), tolerance: 40) == true, "\(String(describing: hosted.color(at: corner)))")
    withAnimation(.linear(duration: 10)) { model.showsLast = false }
    hosted.settle(0.2)
    // At once: the own (larger) corner leaves the point mostly outside the fill, 0.2 s into a 10 s animation.
    #expect(hosted.color(at: corner)?.isClose(to: colors[.primary].rgba8(), tolerance: 40) == false, "\(String(describing: hosted.color(at: corner)))")
  }
  #endif
}

// MARK: - Items stay themselves (BGR-4, BGR-5, BGR-10)

@MainActor
@Suite("TanreiButtonGroup items", .serialized)
struct TanreiButtonGroupItemTests {
  /// BGR-5 — a standard group restyles nothing: an item draws exactly as it does alone.
  @Test("BGR-5 a standard item draws exactly as it does alone")
  func standardItemIsUntouched() throws {
    let alone = try Snapshot.renderExact(TanreiButton("Cut", variant: .outlined, action: {}).frame(width: 120, alignment: .leading))
    let grouped = try Reports.collecting {
      try Snapshot.renderExact(TanreiButtonGroup { TanreiButton("Cut", variant: .outlined, action: {}) }.frame(width: 120, alignment: .leading))
    }
    #expect(grouped.reports.mention("BGR-10"))
    #expect(grouped.value.pixels == alone.pixels)
    let icon = try Snapshot.renderExact(TanreiIconButton("Share", variant: .tonal, action: {}) { Image(systemName: "square.and.arrow.up") }.frame(width: 60, alignment: .leading))
    let groupedIcon = try Reports.collecting {
      try Snapshot.renderExact(
        TanreiButtonGroup { TanreiIconButton("Share", variant: .tonal, action: {}) { Image(systemName: "square.and.arrow.up") } }.frame(width: 60, alignment: .leading))
    }
    #expect(groupedIcon.value.pixels == icon.pixels)
  }

  /// BGR-5 — each item renders from its own tokens: a modified Button token reaches a grouped Button, and the group has no
  /// token that could restyle it.
  @Test("BGR-5 items render from their own tokens")
  func ownTokens() throws {
    var custom = TanreiSystem.tanrei
    custom.button.variants.filled.enabled.containerColor = .role(.error)
    let bitmap = try Snapshot.render(
      TanreiButtonGroup(variant: .connected) {
        TanreiButton("One", action: {})
        TanreiButton("Two", variant: .tonal, action: {})
      }, theme: theme(custom))
    #expect(runs(bitmap, y: Snapshot.inset + 5, color: colors[.error].rgba8()).count == 1)
    let tonal = colors[TanreiButtonAppearance(tokens: buttonTokens, variant: .tonal, size: .medium, state: .enabled).container].rgba8()
    #expect(runs(bitmap, y: Snapshot.inset + 5, color: tonal).count == 1)
  }

  /// BGR-6 — a label names the group and draws nothing: a named group renders exactly as an unnamed one. (That the named
  /// group is one container holding its items and the unnamed one adds no element is read from the accessibility tree in
  /// the Gallery: `testButtonGroupSemanticsAndActivation`; macOS builds no tree for a unit test.)
  @Test("BGR-6 a label names the group and draws nothing")
  func labelDrawsNothing() throws {
    func group(_ label: String) -> some View {
      TanreiButtonGroup(variant: .connected, label: label) {
        TanreiButton("Cut", variant: .outlined, action: {})
        TanreiButton("Copy", variant: .outlined, action: {})
      }
    }
    #expect(try Snapshot.renderExact(group("Clipboard")).pixels == Snapshot.renderExact(group("")).pixels)
  }

  /// BGR-10 — content that is not a Tanrei button, and a group of one, still render, and are reported in debug builds.
  @Test("BGR-10 foreign content and a lone item render and are reported")
  func foreignContent() throws {
    let (bitmap, reports) = try Reports.collecting {
      try Snapshot.render(
        TanreiButtonGroup(variant: .connected) {
          TanreiButton("One", action: {})
          Rectangle().fill(Color.black).frame(width: 30, height: 30)
        })
    }
    #expect(reports.mention("not a TanreiButton") && reports.mention("item 2"))
    #expect(runs(bitmap, y: Snapshot.inset + 10, color: Bitmap.RGBA(r: 0, g: 0, b: 0, a: 255)).count == 1)
    let (_, lone) = try Reports.collecting { try Snapshot.render(TanreiButtonGroup { TanreiButton("One", action: {}) }) }
    #expect(lone.mention("1 item") && lone.mention("BGR-10"))
    // ForEach and `if` are read as the items they make: no report for two.
    let (_, made) = try Reports.collecting {
      try Snapshot.render(TanreiButtonGroup { ForEach(["One", "Two"], id: \.self) { TanreiButton($0, action: {}) } })
    }
    #expect(made.messages.isEmpty, "\(made.messages)")
  }

  #if os(macOS)
  /// BGR-5 — each item answers its own press and emits its own events: a click on each fires its action once; a toggle
  /// flips only itself; the group keeps no selection.
  @Test("BGR-5 every item emits its own events")
  func ownEvents() {
    let counter = Counter()
    let bold = Flag(true)
    let italic = Flag(false)
    let hosted = HostedView(
      TanreiButtonGroup(variant: .connected, label: "Text style") {
        TanreiIconButton("Bold", isSelected: bold.binding, variant: .tonal, action: counter.fire("bold")) { Image(systemName: "bold") }
        TanreiIconButton("Italic", isSelected: italic.binding, variant: .tonal, action: counter.fire("italic")) { Image(systemName: "italic") }
        TanreiButton("Clear", variant: .outlined, action: counter.fire("clear"))
      }
      .padding(Snapshot.inset)
      .tanreiTheme(Snapshot.theme))
    let y = hosted.size.height / 2
    hosted.click(at: CGPoint(x: Snapshot.inset + target / 2, y: y))
    #expect(counter.counts == ["bold": 1] && !bold.isOn && !italic.isOn)
    hosted.click(at: CGPoint(x: Snapshot.inset + target + tokens.connectedGap + target / 2, y: y))
    #expect(counter.counts == ["bold": 1, "italic": 1] && italic.isOn && !bold.isOn)
    hosted.click(at: CGPoint(x: hosted.size.width - Snapshot.inset - 10, y: y))
    #expect(counter.counts == ["bold": 1, "italic": 1, "clear": 1])
  }

  /// BGR-4 — standard, under the default system: `standard.gap` is at least `sys.target.touch` minus the small icon button
  /// so no hit areas overlap and every item keeps its whole target on every side, between its neighbours too:
  /// a press up to half the target from an item's centre, along the row or across it, is that item's.
  @Test("BGR-4 under the default system every item keeps its whole target between neighbours")
  func wholeTargetsBetweenNeighbours() {
    let side = TanreiSystem.tanrei.iconButton.sizes.small.containerSize
    #expect(tokens.standardGap >= TanreiSystem.tanrei.measure.targetTouch - side)
    #expect((target - side) / 2 <= tokens.standardGap / 2, "no hit areas overlap")
    let counter = Counter()
    let hosted = HostedView(
      TanreiButtonGroup {
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
      let x = Snapshot.inset + side / 2 + CGFloat(index) * (side + tokens.standardGap)
      for point in [CGPoint(x: x - reach, y: y), CGPoint(x: x + reach, y: y), CGPoint(x: x, y: y - reach), CGPoint(x: x, y: y + reach)] {
        hosted.click(at: point)
      }
      #expect(counter.counts[id] == 4, "\(id): \(counter.counts)")
    }
    #expect(counter.counts == ["edit": 4, "share": 4, "delete": 4])
  }

  /// BGR-4 — standard, with hit areas that overlap (a layer that narrows `standard.gap` to 8: the small icon button's
  /// target reaches past half of it): a press on an item's visible bounds is that item's, a press in the gap goes to the
  /// nearer item — the hit areas meet at the middle of the gap.
  @Test("BGR-4 a press in the gap goes to the nearer item, never across a visible edge")
  func overlappingHitAreas() {
    let side = TanreiSystem.tanrei.iconButton.sizes.small.containerSize
    var custom = TanreiSystem.tanrei
    custom.buttonGroup.standardGap = 8
    let gap = custom.buttonGroup.standardGap
    #expect((target - side) / 2 > gap / 2, "the hit areas this test needs overlap")
    let counter = Counter()
    let hosted = HostedView(
      TanreiButtonGroup {
        TanreiIconButton("Edit", size: .small, action: counter.fire("edit")) { Image(systemName: "pencil") }
        TanreiIconButton("Share", size: .small, action: counter.fire("share")) { Image(systemName: "square.and.arrow.up") }
      }
      .padding(Snapshot.inset)
      .tanreiTheme(theme(custom)))
    let y = hosted.size.height / 2
    let firstEnd = Snapshot.inset + side
    let secondStart = firstEnd + gap
    // In the gap: 1 point from each visible edge.
    hosted.click(at: CGPoint(x: firstEnd + 1, y: y))
    #expect(counter.counts == ["edit": 1])
    hosted.click(at: CGPoint(x: secondStart - 1, y: y))
    #expect(counter.counts == ["edit": 1, "share": 1])
    // On the visible bounds, next to the neighbour.
    hosted.click(at: CGPoint(x: firstEnd - 1, y: y))
    hosted.click(at: CGPoint(x: secondStart + 1, y: y))
    #expect(counter.counts == ["edit": 2, "share": 2])
    // On either side of the middle of the gap: the nearer item.
    let middle = firstEnd + gap / 2
    hosted.click(at: CGPoint(x: middle - 1, y: y))
    hosted.click(at: CGPoint(x: middle + 1, y: y))
    #expect(counter.counts == ["edit": 3, "share": 3])
    // The outer end still reaches the whole way (BTN-5 / ICB-5): half the missing target and what the inner side gives up.
    hosted.click(at: CGPoint(x: Snapshot.inset - (target - side - gap / 2) + 1, y: y))
    #expect(counter.counts == ["edit": 4, "share": 3])
  }

  /// BGR-3 — above and below the row, the items extend their hit areas as BTN-5 and ICB-5 say; sideways a connected item
  /// is the target wide already.
  @Test("BGR-3 hit areas extend above and below the row")
  func hitAboveAndBelow() {
    let counter = Counter()
    let hosted = HostedView(
      TanreiButtonGroup(variant: .connected) {
        TanreiButton("One", size: .small, action: counter.fire("one"))
        TanreiButton("Two", size: .small, action: counter.fire("two"))
      }
      .padding(Snapshot.inset)
      .tanreiTheme(Snapshot.theme))
    let height = buttonTokens.sizes.small.containerHeight
    let outset = (target - height) / 2
    #expect(outset > 0)
    hosted.click(at: CGPoint(x: Snapshot.inset + 10, y: Snapshot.inset - outset / 2))
    hosted.click(at: CGPoint(x: hosted.size.width - Snapshot.inset - 10, y: Snapshot.inset + height + outset / 2))
    #expect(counter.counts == ["one": 1, "two": 1])
  }
  #endif
}

// MARK: - Snapshots (one per spec fixture)

@MainActor
@Suite("TanreiButtonGroup snapshots")
struct TanreiButtonGroupSnapshotTests {
  /// Mirrors `fixtures` in specs/button-group.spec.json; the items are read from the spec itself.
  nonisolated static let fixtures = [
    "standard", "standard-icon-buttons", "connected", "connected-icon-buttons", "connected-large", "connected-disabled",
  ]

  /// The SF Symbol a product would pass for each of the fixtures' glyph names (see the file header).
  static let symbols = [
    "edit": "pencil", "share": "square.and.arrow.up", "delete": "trash", "format_bold": "bold", "format_italic": "italic",
    "format_underlined": "underline",
  ]

  /// One item, as a product writes it: a Button's content is its label, an icon button's its glyph.
  @ViewBuilder
  static func item(_ item: SpecItem) -> some View {
    let disabled = item.bool("disabled") ?? false
    if item.kind == "icon-button" {
      let variant = TanreiIconButtonVariant(rawValue: item.string("variant") ?? TanreiIconButtonVariant.fallback.rawValue)
      let size = TanreiIconButtonSize(rawValue: item.string("size") ?? TanreiIconButtonSize.fallback.rawValue)
      let symbol = Image(systemName: symbols[item.content ?? ""] ?? "questionmark")
      if item.bool("toggle") ?? false {
        TanreiIconButton(item.string("label") ?? "", isSelected: .constant(item.bool("selected") ?? false), variant: variant, size: size) { symbol }
          .disabled(disabled)
      } else {
        TanreiIconButton(item.string("label") ?? "", variant: variant, size: size, action: {}) { symbol }
          .disabled(disabled)
      }
    } else {
      TanreiButton(
        item.content ?? "", variant: TanreiButtonVariant(rawValue: item.string("variant") ?? TanreiButtonVariant.fallback.rawValue),
        size: TanreiButtonSize(rawValue: item.string("size") ?? TanreiButtonSize.fallback.rawValue), action: {}
      )
      .disabled(disabled)
    }
  }

  /// The fixture on its 400 × 96 stage, start-aligned and vertically centred (BGR-1 verify).
  static func view(_ fixture: SpecFixture) -> some View {
    TanreiButtonGroup(variant: TanreiButtonGroupVariant(named: fixture.string("variant") ?? "standard"), label: fixture.string("label") ?? "") {
      ForEach(Array((fixture.items ?? []).enumerated()), id: \.offset) { _, spec in item(spec) }
    }
    .frame(width: 400, height: 96, alignment: .leading)
  }

  static func fixture(_ id: String) throws -> SpecFixture {
    try #require(try SpecFixture.load(spec: "button-group").first { $0.id == id })
  }

  @Test("fixture matches its baseline", arguments: fixtures)
  func fixture(_ id: String) throws {
    try Snapshot.assert(Self.view(try Self.fixture(id)), named: id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    let spec = try SpecFixture.load(spec: "button-group")
    #expect(spec.map(\.id) == Self.fixtures)
    // Every item kind and glyph a fixture uses is drawn.
    for fixture in spec {
      for item in fixture.items ?? [] {
        #expect(["button", "icon-button"].contains(item.kind), "\(fixture.id)")
        if item.kind == "icon-button" { #expect(Self.symbols[item.content ?? ""] != nil, "\(fixture.id): \(item.content ?? "")") }
      }
    }
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiButtonGroupTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiButtonGroup preset snapshots")
struct TanreiButtonGroupPresetSnapshotTests {
  /// Outlined Buttons joined: the preset's inner corner against its own (pill ends in the m3 presets), the outlines
  /// following the joined shape.
  nonisolated static let fixtureId = "connected"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiButtonGroupSnapshotTests.fixtures.contains(Self.fixtureId))
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try TanreiButtonGroupSnapshotTests.fixture(Self.fixtureId)
    try Snapshot.assert(TanreiButtonGroupSnapshotTests.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
