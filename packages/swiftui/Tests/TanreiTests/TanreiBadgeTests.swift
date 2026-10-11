import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/badge.spec.json. Each behavior id (BDG-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file.
//
// Geometry is read from renders of a badge on a plain square anchor (`side` points, in `on-surface-variant`), so every
// pixel of the badge is told apart from the anchor and the surface. Where the pill's extent is measured, a modified
// system draws the label in the container color, so the pill is one solid shape. The fixtures' content "notifications"
// is drawn as the SF Symbol a product would pass for it (`bell`), at the icon size `sys.measure.icon-large`.
// Accessibility (BDG-8) is tested on the value the view hands its anchor, and end to end in the gallery's UI tests.

private let suiteName = "TanreiBadgeTests"

/// The side of the square anchor of the geometry tests (a test constant, not a design value).
private let side: CGFloat = 40

@MainActor
private final class Counter {
  var count = 0
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

private let light = TanreiSystem.tanrei.colors.light

/// The plain square anchor, drawn in a role of the current system.
private struct Square: View {
  @TanreiPalette private var colors
  var body: some View { Rectangle().fill(colors[.onSurfaceVariant]).frame(width: side, height: side) }
}

/// A badge on the square, with room around it for the badge to extend past the anchor.
@MainActor
private func badged(_ count: Int?, max: Int = 999, label: String = "Label") -> some View {
  TanreiBadge(count: count, max: max, label: label) { Square() }.padding(Snapshot.inset)
}

/// The top-left of the anchor in a render of `badged`, in points.
private let anchorOrigin = CGPoint(x: 2 * TanreiSystem.tanrei.space.space200, y: 2 * TanreiSystem.tanrei.space.space200)

/// A system whose badge label is drawn in the container color: the pill is one solid shape to measure.
private func solidPill(_ base: TanreiSystem = .tanrei) -> TanreiSystem {
  var system = base
  system.badge.labelColor = system.badge.containerColor
  return system
}

/// The extent, in points, of the pixels of `color` on the row `y` (points): the first and the last x.
@MainActor
private func horizontalExtent(_ bitmap: Bitmap, y: CGFloat, color: Bitmap.RGBA) -> (min: CGFloat, max: CGFloat)? {
  let row = Int(y * Snapshot.scale)
  let xs = (0..<bitmap.width).filter { bitmap[$0, row].isClose(to: color, tolerance: 8) }
  guard let first = xs.first, let last = xs.last else { return nil }
  return (CGFloat(first) / Snapshot.scale, CGFloat(last + 1) / Snapshot.scale)
}

/// The extent, in points, of the pixels of `color` on the column `x` (points).
@MainActor
private func verticalExtent(_ bitmap: Bitmap, x: CGFloat, color: Bitmap.RGBA) -> (min: CGFloat, max: CGFloat)? {
  let column = Int(x * Snapshot.scale)
  let ys = (0..<bitmap.height).filter { bitmap[column, $0].isClose(to: color, tolerance: 8) }
  guard let first = ys.first, let last = ys.last else { return nil }
  return (CGFloat(first) / Snapshot.scale, CGFloat(last + 1) / Snapshot.scale)
}

// MARK: - Content (BDG-4, BDG-5, BDG-12, BDG-14)

// On the main actor: its tests read whole shipped systems, whose one-time initialization and copies need more
// stack than a cooperative thread has.
@MainActor
@Suite("TanreiBadge content")
struct TanreiBadgeContentTests {
  let english = Locale(identifier: "en_US")

  /// BDG-4 — a count above max shows max and a plus sign; any other count is shown in full.
  @Test("BDG-4 a count above max shows max+; others are shown in full")
  func capping() {
    #expect(TanreiBadgeContent(count: 3, max: 999, locale: english) == .count("3"))
    #expect(TanreiBadgeContent(count: 42, max: 999, locale: english) == .count("42"))
    #expect(TanreiBadgeContent(count: 999, max: 999, locale: english) == .count("999"))
    #expect(TanreiBadgeContent(count: 1000, max: 999, locale: english) == .count("999+"))
    #expect(TanreiBadgeContent(count: 1200, max: 999, locale: english) == .count("999+"))
    #expect(TanreiBadgeContent(count: 120, max: 99, locale: english) == .count("99+"))
    #expect(TanreiBadgeContent(count: 99, max: 99, locale: english) == .count("99"))
    #expect(TanreiBadge<EmptyView>.defaultMax == 999)
  }

  /// BDG-1 BDG-5 — no count is the dot, 0 is nothing.
  @Test("BDG-1 BDG-5 nil is the dot and 0 is nothing")
  func forms() {
    #expect(TanreiBadgeContent(count: nil, max: 999, locale: english) == .dot)
    #expect(TanreiBadgeContent(count: 0, max: 999, locale: english) == .none)
  }

  /// BDG-12 — the locale's digits and no grouping separator.
  @Test("BDG-12 counts use the locale's digits and no grouping separator")
  func localeDigits() {
    #expect(TanreiBadgeContent(count: 1000, max: 9999, locale: english) == .count("1000"))
    #expect(TanreiBadgeContent(count: 12345, max: 99999, locale: Locale(identifier: "de_DE")) == .count("12345"))
    #expect(TanreiBadgeContent(count: 1200, max: 999, locale: Locale(identifier: "ar_EG")) == .count("٩٩٩+"))
    #expect(TanreiBadgeContent(count: 42, max: 999, locale: Locale(identifier: "ar_EG")) == .count("٤٢"))
    #expect(TanreiBadgeContent(count: 7, max: 999, locale: Locale(identifier: "hi_IN@numbers=deva")) == .count("७"))
  }

  /// BDG-14 — a negative count renders as 0 and a max below 1 is the default, each reported. A count that is not a
  /// whole number, or not a number at all (NaN), cannot be passed: `count` is an `Int?` (asserted below), so those two
  /// clauses of BDG-14 hold by type.
  @Test("BDG-14 a negative count is 0 and a max below 1 is 999, each reported")
  func invalidValues() {
    let (negative, negativeReports) = Reports.collecting { TanreiBadgeInput(count: -3, max: 999, label: "x") }
    #expect(negative.count == 0 && negative.max == 999)
    #expect(negativeReports.mention("count is -3") && negativeReports.mention("BDG-14"))
    let (zeroMax, maxReports) = Reports.collecting { TanreiBadgeInput(count: 5, max: 0, label: "x") }
    #expect(zeroMax.count == 5 && zeroMax.max == 999)
    #expect(maxReports.mention("max is 0") && maxReports.mention("BDG-14"))
    let (_, valid) = Reports.collecting { TanreiBadgeInput(count: 5, max: 1, label: "x") }
    #expect(valid.messages.isEmpty)
  }

  /// BDG-14 — not a number (NaN) and not a whole number cannot reach the badge: its `count` is an `Int?`, which holds
  /// neither (this compiles only while that is so; `TanreiBadge(count: Double.nan)` does not).
  @Test("BDG-14 NaN and fractions are unrepresentable: count is Int?")
  @MainActor
  func notANumber() {
    let make: @MainActor (Int?) -> TanreiBadge<EmptyView> = { TanreiBadge(count: $0, label: "x") { EmptyView() } }
    _ = make(nil)
    #expect(Int(exactly: Double.nan) == nil && Int(exactly: 2.5) == nil)
  }
}

// MARK: - Accessibility (BDG-8, BDG-9, BDG-10, BDG-5)

@MainActor
@Suite("TanreiBadge accessibility")
struct TanreiBadgeAccessibilityTests {
  let english = Locale(identifier: "en_US")

  /// BDG-8 — the label is what the anchor's description gains; without one, the displayed text.
  @Test("BDG-8 the label, or without one the displayed count, is added to the anchor")
  func value() {
    #expect(TanreiBadgeContent.dot.accessibilityValue(label: "New messages") == "New messages")
    #expect(TanreiBadgeContent.count("3").accessibilityValue(label: "3 unread") == "3 unread")
    #expect(TanreiBadgeContent.count("999+").accessibilityValue(label: "") == "999+")
    #expect(TanreiBadgeContent(count: 1200, max: 999, locale: english).accessibilityValue(label: "") == "999+")
  }

  /// BDG-5 — a count of 0 adds nothing, whatever the label says.
  @Test("BDG-5 a count of 0 exposes nothing")
  func zero() {
    #expect(TanreiBadgeContent.none.accessibilityValue(label: "No unread messages") == nil)
    #expect(TanreiBadgeContent.none.accessibilityValue(label: "") == nil)
  }

  /// BDG-9 — a dot with no label is still drawn, adds nothing, and is reported in debug builds.
  @Test("BDG-9 a dot without a label is reported and still renders")
  func dotWithoutLabel() throws {
    #expect(TanreiBadgeContent.dot.accessibilityValue(label: "") == nil)
    let (bitmap, reports) = try Reports.collecting { try Snapshot.render(badged(nil, label: "")) }
    #expect(reports.mention("empty label") && reports.mention("BDG-9"))
    let tokens = TanreiSystem.tanrei.badge
    let center = CGPoint(x: anchorOrigin.x + side - tokens.dotOffset, y: anchorOrigin.y + tokens.dotOffset)
    #expect(pixel(bitmap, x: center.x, y: center.y).isClose(to: light[.primary].rgba8()))
    // A labelled dot and a count are not reported.
    let (_, silent) = Reports.collecting {
      _ = TanreiBadge(count: nil, label: "New") { Square() }
      _ = TanreiBadge(count: 3) { Square() }
      _ = Square().tanreiBadge(0)
    }
    #expect(silent.messages.isEmpty)
  }

  /// BDG-10 — the description follows count and label; the badge never posts an announcement (there is no
  /// `AccessibilityNotification` in TanreiBadge.swift: the value is updated in place, and read when VoiceOver reaches
  /// the anchor).
  @Test("BDG-10 the description follows count and label changes")
  func changes() {
    let before = TanreiBadgeContent(count: 3, max: 999, locale: english)
    let after = TanreiBadgeContent(count: 4, max: 999, locale: english)
    #expect(before.accessibilityValue(label: "") == "3" && after.accessibilityValue(label: "") == "4")
    #expect(after.accessibilityValue(label: "4 unread") == "4 unread")
    #expect(TanreiBadgeContent(count: 0, max: 999, locale: english).accessibilityValue(label: "4 unread") == nil)
  }

  /// BDG-11 — the drawn text is isolated from the surrounding direction; the value read is the plain text.
  @Test("BDG-11 the drawn text is a first-strong isolate; the value is not")
  func isolation() {
    #expect(TanreiBadgeContent.count("999+").isolatedText == "\u{2068}999+\u{2069}")
    #expect(TanreiBadgeContent.count("999+").accessibilityValue(label: "") == "999+")
    #expect(TanreiBadgeContent.dot.isolatedText == nil)
  }
}

// MARK: - Geometry (BDG-1, BDG-2, BDG-3, BDG-6, BDG-7, BDG-11, BDG-12, BDG-13)

@MainActor
@Suite("TanreiBadge geometry")
struct TanreiBadgeGeometryTests {
  let tokens = TanreiSystem.tanrei.badge
  var primary: Bitmap.RGBA { light[.primary].rgba8() }
  var anchorColor: Bitmap.RGBA { light[.onSurfaceVariant].rgba8() }
  var surface: Bitmap.RGBA { light[.surface].rgba8() }

  /// BDG-1 — the dot: `dot.size` in the container color, its center `dot.offset` inside the anchor's top-end corner.
  @Test("BDG-1 the dot is dot.size, in container.color, centered dot.offset inside the top-end corner")
  func dot() throws {
    let bitmap = try Snapshot.render(badged(nil))
    let center = CGPoint(x: anchorOrigin.x + side - tokens.dotOffset, y: anchorOrigin.y + tokens.dotOffset)
    let across = try #require(horizontalExtent(bitmap, y: center.y, color: primary))
    let down = try #require(verticalExtent(bitmap, x: center.x, color: primary))
    #expect(across.max - across.min == tokens.dotSize && down.max - down.min == tokens.dotSize)
    #expect((across.min + across.max) / 2 == center.x && (down.min + down.max) / 2 == center.y)
  }

  /// BDG-1 — the dot is a circle whatever corners the container has: a system that squares the pill off does not
  /// square the dot.
  @Test("BDG-1 the dot stays a circle when container.shape squares the pill")
  func dotIsACircle() throws {
    var square = TanreiSystem.tanrei
    square.badge.containerShape = square.shape.none
    square.badge.dotSize = 12
    let bitmap = try Snapshot.render(badged(nil), theme: theme(square))
    let center = CGPoint(x: anchorOrigin.x + side - tokens.dotOffset, y: anchorOrigin.y + tokens.dotOffset)
    // A 12-point circle: its bounding box's corner is not filled, its center is.
    #expect(pixel(bitmap, x: center.x, y: center.y).isClose(to: primary))
    #expect(!pixel(bitmap, x: center.x + 5.5, y: center.y - 5.5).isClose(to: primary, tolerance: 8))
    // The same system's pill IS square-cornered.
    let pill = try Snapshot.render(badged(42), theme: theme(solidPill(square)))
    let across = try #require(horizontalExtent(pill, y: anchorOrigin.y, color: primary))
    #expect(pixel(pill, x: across.min + 0.25, y: anchorOrigin.y - tokens.containerHeight / 2 + 0.25).isClose(to: primary, tolerance: 8))
  }

  /// BDG-2 — the pill is at least `container.height` high, at least as wide as high (a single digit is a circle),
  /// `padding-inline` around a longer label, with full corners.
  @Test("BDG-2 the pill is container.height high, a circle for one digit, padded for more, fully rounded")
  func pill() throws {
    let system = solidPill()
    let corner = CGPoint(x: anchorOrigin.x + side, y: anchorOrigin.y)  // container.offset is 0 in Tanrei
    let one = try Snapshot.render(badged(3), theme: theme(system))
    let oneAcross = try #require(horizontalExtent(one, y: corner.y, color: primary))
    let oneDown = try #require(verticalExtent(one, x: corner.x, color: primary))
    #expect(oneDown.max - oneDown.min == tokens.containerHeight)
    #expect(oneAcross.max - oneAcross.min == tokens.containerHeight)
    // Full corners: the corner of the pill's bounding box is not filled.
    #expect(!pixel(one, x: oneAcross.min + 0.5, y: oneDown.min + 0.5).isClose(to: primary, tolerance: 8))

    let four = try Snapshot.render(badged(1200), theme: theme(system))
    let fourAcross = try #require(horizontalExtent(four, y: corner.y, color: primary))
    #expect(fourAcross.max - fourAcross.min > tokens.containerHeight)
    // The label's own width plus `padding-inline` on each side (the label is measured on its own).
    let text = try Snapshot.render(Text(verbatim: "999+").monospacedDigit().lineLimit(1).fixedSize().tanreiTextStyle(TanreiSystem.tanrei.typescale.labelSmall))
    let textWidth = CGFloat(text.width) / Snapshot.scale - 2 * Snapshot.inset
    #expect(abs((fourAcross.max - fourAcross.min) - (textWidth + 2 * tokens.containerPaddingInline)) <= 1 / Snapshot.scale)

    // The pill takes its own size whatever the anchor's: on an anchor narrower than the count it is just as wide (the
    // overlay proposes the anchor's size; a pill that took it cut "999+" to "999" on a 24-point icon).
    let small = try Snapshot.render(
      TanreiBadge(count: 1200, label: "x") { Rectangle().fill(Color.clear).frame(width: 8, height: 8) }.padding(2 * Snapshot.inset),
      theme: theme(system))
    let smallAcross = try #require(horizontalExtent(small, y: 3 * Snapshot.inset, color: primary))
    #expect(smallAcross.max - smallAcross.min == fourAcross.max - fourAcross.min)
  }

  /// BDG-2 — the label is centered, in the label color and the label type style.
  @Test("BDG-2 the count is drawn in label.color inside the pill")
  func labelColor() throws {
    let bitmap = try Snapshot.render(badged(8))
    let corner = CGPoint(x: anchorOrigin.x + side, y: anchorOrigin.y)
    let h = tokens.containerHeight
    let left = Int((corner.x - h / 2) * Snapshot.scale)
    let top = Int((corner.y - h / 2) * Snapshot.scale)
    let n = Int(h * Snapshot.scale)
    var inside: [Bitmap.RGBA] = []
    for dy in 0..<n {
      for dx in 0..<n { inside.append(bitmap[left + dx, top + dy]) }
    }
    #expect(inside.contains { $0.isClose(to: light[.onPrimary].rgba8()) })
    #expect(inside.contains { $0.isClose(to: primary) })
  }

  /// BDG-3 — the leading circle's center is `container.offset` inside the top-end corner, and a longer count grows
  /// toward the end: every count starts at the same x.
  @Test("BDG-3 the pill's leading circle is placed on the corner; longer counts grow toward the end")
  func pillPlacement() throws {
    for offset in [CGFloat(0), 3] {
      var system = solidPill()
      system.badge.containerOffset = offset
      let corner = CGPoint(x: anchorOrigin.x + side - offset, y: anchorOrigin.y + offset)
      var starts: [CGFloat] = []
      for count in [3, 42, 1200] {
        let bitmap = try Snapshot.render(badged(count), theme: theme(system))
        let across = try #require(horizontalExtent(bitmap, y: corner.y, color: primary))
        let down = try #require(verticalExtent(bitmap, x: across.min + tokens.containerHeight / 2, color: primary))
        #expect(across.min == corner.x - tokens.containerHeight / 2, "\(count) offset \(offset)")
        #expect((down.min + down.max) / 2 == corner.y, "\(count) offset \(offset)")
        starts.append(across.min)
      }
      #expect(Set(starts).count == 1)
    }
  }

  /// BDG-6 — the outline is `outline.width` of `outline.color` outside the edge, and changes neither the badge's size
  /// nor its position.
  @Test("BDG-6 the outline is drawn outside the dot and the pill without moving or resizing them")
  func outline() throws {
    var ringed = solidPill()
    ringed.badge.outlineColor = .role(.error)
    var bare = ringed
    bare.badge.outlineWidth = 0
    let error = light[.error].rgba8()
    for count in [nil, 42] as [Int?] {
      let withRing = try Snapshot.render(badged(count), theme: theme(ringed))
      let without = try Snapshot.render(badged(count), theme: theme(bare))
      let y = count == nil ? anchorOrigin.y + ringed.badge.dotOffset : anchorOrigin.y
      let filled = try #require(horizontalExtent(withRing, y: y, color: primary))
      let filledBare = try #require(horizontalExtent(without, y: y, color: primary))
      #expect(filled.min == filledBare.min && filled.max == filledBare.max, "\(String(describing: count))")
      let ring = try #require(horizontalExtent(withRing, y: y, color: error))
      #expect(ring.min == filled.min - ringed.badge.outlineWidth && ring.max == filled.max + ringed.badge.outlineWidth)
      #expect(horizontalExtent(without, y: y, color: error) == nil)
    }
  }

  /// BDG-7 — the badge takes no space: the anchor with a badge lays out exactly as without one, in the same place.
  @Test("BDG-7 the anchor's size and position do not change")
  func layout() throws {
    let alone = try Snapshot.render(Square().padding(Snapshot.inset))
    for count in [nil, 0, 3, 1200] as [Int?] {
      let bitmap = try Snapshot.render(badged(count))
      #expect(bitmap.width == alone.width && bitmap.height == alone.height)
      // The anchor's bottom-left, away from the badge, is where it was.
      #expect(pixel(bitmap, x: anchorOrigin.x + 1, y: anchorOrigin.y + side - 1).isClose(to: anchorColor))
      #expect(pixel(bitmap, x: anchorOrigin.x - 1, y: anchorOrigin.y + side - 1).isClose(to: surface))
    }
  }

  /// BDG-5 — a count of 0 draws nothing: exactly the anchor alone.
  @Test("BDG-5 a count of 0 renders exactly as the anchor alone")
  func zeroRendersNothing() throws {
    let alone = try Snapshot.renderExact(Square().padding(Snapshot.inset))
    let zero = try Snapshot.renderExact(badged(0, label: "No unread messages"))
    #expect(zero.mismatch(against: alone, channelTolerance: 0) == 0)
  }

  #if os(macOS)
  /// BDG-7 — the badge takes no input: a click on it reaches the anchor.
  @Test("BDG-7 a click on the badge reaches the anchor", arguments: [nil, 1200] as [Int?])
  func input(count: Int?) {
    let counter = Counter()
    let hosted = HostedView(
      TanreiBadge(count: count, label: "Unread") {
        Button(action: { counter.count += 1 }) { Square() }.buttonStyle(.plain)
      }
      .padding(Snapshot.inset)
      .tanreiTheme(Snapshot.theme)
    )
    // Inside the anchor, under the badge: the dot's center, or the pill's leading circle.
    let tokens = TanreiSystem.tanrei.badge
    let point = count == nil
      ? CGPoint(x: Snapshot.inset + side - tokens.dotOffset, y: Snapshot.inset + tokens.dotOffset)
      : CGPoint(x: Snapshot.inset + side - 2, y: Snapshot.inset + 2)
    hosted.click(at: point)
    #expect(counter.count == 1)
  }
  #endif

  /// BDG-11 — right-to-left: the top-end corner is the top-left; the dot sits `dot.offset` inside it and the pill grows
  /// toward the left.
  @Test("BDG-11 right-to-left: the badge takes the top-left corner and grows toward the left")
  func rightToLeft() throws {
    let rtl = try Snapshot.render(badged(nil).environment(\.layoutDirection, .rightToLeft))
    let center = CGPoint(x: anchorOrigin.x + tokens.dotOffset, y: anchorOrigin.y + tokens.dotOffset)
    let across = try #require(horizontalExtent(rtl, y: center.y, color: primary))
    #expect((across.min + across.max) / 2 == center.x)

    let system = solidPill()
    var ends: [CGFloat] = []
    for count in [3, 42, 1200] {
      let bitmap = try Snapshot.render(badged(count).environment(\.layoutDirection, .rightToLeft), theme: theme(system))
      let pill = try #require(horizontalExtent(bitmap, y: anchorOrigin.y, color: primary))
      #expect(pill.max == anchorOrigin.x + tokens.containerHeight / 2, "\(count)")
      ends.append(pill.max)
    }
    #expect(Set(ends).count == 1)
  }

  /// Whether the last glyph drawn (the rightmost) is the sparse "+", not a dense "9": label pixels in the rightmost
  /// quarter of the label's ink against the leftmost quarter, inside the pill.
  private func endsWithPlus(_ bitmap: Bitmap) throws -> Bool {
    let label = light[.onPrimary].rgba8()
    let mid = CGFloat(bitmap.height) / Snapshot.scale / 2
    let pill = try #require(horizontalExtent(bitmap, y: mid, color: primary))
    let rows = Int((mid - tokens.containerHeight / 4) * Snapshot.scale)..<Int((mid + tokens.containerHeight / 4) * Snapshot.scale)
    let columns = Int((pill.min + tokens.containerPaddingInline / 2) * Snapshot.scale)..<Int((pill.max - tokens.containerPaddingInline / 2) * Snapshot.scale)
    let ink = columns.filter { x in rows.contains { bitmap[x, $0].isClose(to: label, tolerance: 60) } }
    let first = try #require(ink.first), last = try #require(ink.last)
    let quarter = (last - first) / 4
    func count(_ xs: ClosedRange<Int>) -> Int { xs.reduce(0) { sum, x in sum + rows.filter { bitmap[x, $0].isClose(to: label, tolerance: 60) }.count } }
    return count((last - quarter)...last) < count(first...(first + quarter))
  }

  /// BDG-11 — the label keeps its plus sign after the digits in a right-to-left layout.
  @Test("BDG-11 a capped count reads 999+ in a right-to-left layout too")
  func isolatedLabel() throws {
    // The measure tells the two orders apart.
    #expect(try endsWithPlus(Snapshot.render(TanreiBadgeMark(content: .count("999+")))))
    #expect(try !endsWithPlus(Snapshot.render(TanreiBadgeMark(content: .count("+999")))))
    for content in [TanreiBadgeContent.count("999+"), TanreiBadgeContent(count: 1200, max: 999, locale: Locale(identifier: "en_US"))] {
      let rtl = try Snapshot.render(TanreiBadgeMark(content: content).environment(\.layoutDirection, .rightToLeft))
      #expect(try endsWithPlus(rtl))
    }
  }

  /// BDG-12 — tabular figures: counts of the same length are the same width.
  @Test("BDG-12 digits are tabular: 111 and 888 make pills of the same width")
  func tabularFigures() throws {
    let system = solidPill()
    var widths: [CGFloat] = []
    for count in [111, 888, 404] {
      let bitmap = try Snapshot.render(badged(count), theme: theme(system))
      let pill = try #require(horizontalExtent(bitmap, y: anchorOrigin.y, color: primary))
      widths.append(pill.max - pill.min)
    }
    #expect(Set(widths).count == 1, "\(widths)")
  }

  /// BDG-13 — rendered at an accessibility text size: the pill is as tall as its label's line and its leading circle
  /// stays on the corner; the dot stays `dot.size`. macOS has no Dynamic Type (nothing grows there); run on an iOS
  /// simulator to see it grow: `xcodebuild test -scheme Tanrei -destination 'platform=iOS Simulator,name=iPhone 17'
  /// -only-testing:TanreiTests/TanreiBadgeGeometryTests` from the repository root.
  @Test("BDG-13 rendered at an accessibility text size: the pill grows with its line, the dot does not")
  func enlargedTextRendered() throws {
    let size = DynamicTypeSize.accessibility3
    let line = tokens.labelTypescale.resolved(policy: .system, dynamicTypeSize: size).lineHeight
    let height = Swift.max(tokens.containerHeight, line)
    #if os(iOS)
    #expect(line > tokens.containerHeight)
    #endif
    let pill = try Snapshot.render(badged(3).environment(\.dynamicTypeSize, size), theme: theme(solidPill()))
    let corner = CGPoint(x: anchorOrigin.x + side, y: anchorOrigin.y)
    let down = try #require(verticalExtent(pill, x: corner.x, color: primary))
    let across = try #require(horizontalExtent(pill, y: corner.y, color: primary))
    #expect(abs((down.max - down.min) - height) <= 1 / Snapshot.scale)
    #expect(abs((down.min + down.max) / 2 - corner.y) <= 1 / Snapshot.scale)
    #expect(abs(across.min - (corner.x - (down.max - down.min) / 2)) <= 1 / Snapshot.scale)
    let dot = try Snapshot.render(badged(nil).environment(\.dynamicTypeSize, size))
    let center = CGPoint(x: anchorOrigin.x + side - tokens.dotOffset, y: anchorOrigin.y + tokens.dotOffset)
    let dotAcross = try #require(horizontalExtent(dot, y: center.y, color: primary))
    #expect(dotAcross.max - dotAcross.min == tokens.dotSize)
  }

  /// BDG-13 — enlarged text grows the pill with its label and keeps the leading circle's placement; the dot stays
  /// `dot.size`. (Only iOS has Dynamic Type; here the line height is given, as `TanreiBadgeMark` resolves it.)
  @Test("BDG-13 a taller label line grows the pill; the leading circle stays on the corner; the dot does not grow")
  func enlargedText() {
    let regular = TanreiBadgeAppearance(tokens: tokens, labelLineHeight: tokens.labelTypescale.lineHeight)
    #expect(regular.pillHeight == tokens.containerHeight)
    let enlarged = TanreiBadgeAppearance(tokens: tokens, labelLineHeight: 31)
    #expect(enlarged.pillHeight == 31)
    #expect(enlarged.dotSize == regular.dotSize)
    #expect(enlarged.trailingGuide(for: .dot, height: enlarged.dotSize) == regular.trailingGuide(for: .dot, height: regular.dotSize))
    // The leading circle is a `height` square: its center stays `container.offset` inside the corner.
    #expect(enlarged.trailingGuide(for: .count("3"), height: 31) == 31 / 2 + tokens.containerOffset)
    #expect(enlarged.topGuide(for: .count("3"), height: 31) == 31 / 2 - tokens.containerOffset)
    #expect(enlarged.trailingGuide(for: .dot, height: tokens.dotSize) == tokens.dotSize / 2 + tokens.dotOffset)
    #expect(enlarged.topGuide(for: .dot, height: tokens.dotSize) == tokens.dotSize / 2 - tokens.dotOffset)
    // The mark reads the line of the current Dynamic Type size.
    let resolved = tokens.labelTypescale.resolved(policy: .system, dynamicTypeSize: .accessibility3)
    #expect(TanreiBadgeAppearance(tokens: tokens, labelLineHeight: resolved.lineHeight).pillHeight >= tokens.containerHeight)
  }
}

// MARK: - Token bindings

@MainActor
@Suite("TanreiBadge token bindings")
struct TanreiBadgeTokenBindingTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiBadgeTokens { system.badge }

  /// The default system's values.
  @Test("BDG-1 BDG-2 BDG-6 the default system's values")
  func defaults() {
    #expect(tokens.dotSize == 6 && tokens.dotOffset == system.space.space25)
    #expect(tokens.containerHeight == 16 && tokens.containerPaddingInline == system.space.space50)
    #expect(tokens.containerOffset == system.space.space0 && tokens.containerShape == system.shape.full)
    #expect(tokens.containerColor == .role(.primary) && tokens.labelColor == .role(.onPrimary))
    #expect(tokens.labelTypescale == system.typescale.labelSmall)
    #expect(tokens.outlineColor == .role(.surface) && tokens.outlineWidth == system.measure.borderThick)
    let appearance = TanreiBadgeAppearance(tokens: tokens, labelLineHeight: tokens.labelTypescale.lineHeight)
    #expect(appearance.container == tokens.containerColor && appearance.label == tokens.labelColor && appearance.outline == tokens.outlineColor)
    #expect(appearance.outlineWidth == tokens.outlineWidth && appearance.cornerRadius == tokens.containerShape)
    #expect(appearance.paddingInline == tokens.containerPaddingInline && appearance.dotSize == tokens.dotSize)
  }

  @Test("the badge's paints resolve to the generated colors in light and dark")
  func colorsInLightAndDark() {
    for (appearance, scheme) in [(TanreiAppearance.light, system.colors.light), (.dark, system.colors.dark)] {
      let colors = TanreiTheme(appearance: appearance, contrast: .standard).colors(systemScheme: .light, systemContrast: .standard)
      #expect(tokens.containerColor.resolve(in: colors) == scheme.value(.primary))
      #expect(tokens.labelColor.resolve(in: colors) == scheme.value(.onPrimary))
      #expect(tokens.outlineColor.resolve(in: colors) == scheme.value(.surface))
    }
  }

  /// The values drive the result: a modified system changes the dot's size, offset and color, and the pill's height.
  @Test("BDG-1 BDG-2 a modified system changes what is drawn")
  func modifiedSystem() throws {
    var custom = system
    custom.badge.containerColor = .role(.error)
    custom.badge.dotSize = 10
    custom.badge.dotOffset = 5
    custom.badge.containerHeight = 24
    let error = light[.error].rgba8()
    let dot = try Snapshot.render(badged(nil), theme: theme(custom))
    let center = CGPoint(x: anchorOrigin.x + side - 5, y: anchorOrigin.y + 5)
    let across = try #require(horizontalExtent(dot, y: center.y, color: error))
    #expect(across.max - across.min == 10 && (across.min + across.max) / 2 == center.x)
    custom.badge.labelColor = custom.badge.containerColor
    let pill = try Snapshot.render(badged(3), theme: theme(custom))
    let down = try #require(verticalExtent(pill, x: anchorOrigin.x + side, color: error))
    #expect(down.max - down.min == 24)
  }

  /// The dark scheme draws the dark container.
  @Test("BDG-1 the dark scheme draws the dark container color")
  func darkRender() throws {
    var dark = Snapshot.theme
    dark.appearance = .dark
    let bitmap = try Snapshot.render(badged(nil), theme: dark)
    let center = CGPoint(x: anchorOrigin.x + side - tokens.dotOffset, y: anchorOrigin.y + tokens.dotOffset)
    #expect(pixel(bitmap, x: center.x, y: center.y).isClose(to: system.colors.dark[.primary].rgba8()))
  }

  /// The modifier is the same badge as the wrapper.
  @Test("BDG-1 BDG-2 .tanreiBadge draws exactly what TanreiBadge draws")
  func modifier() throws {
    for count in [nil, 0, 7, 1200] as [Int?] {
      let wrapped = try Snapshot.renderExact(TanreiBadge(count: count, label: "x") { Square() })
      let modified = try Snapshot.renderExact(Square().tanreiBadge(count, label: "x"))
      #expect(modified.mismatch(against: wrapped, channelTolerance: 0) == 0)
    }
  }
}

// MARK: - Presets

@MainActor
@Suite("TanreiBadge under the shipped presets")
struct TanreiBadgePresetTests {
  /// The presets' values: m3-like and cupertino fill the badge with the error color and draw no outline; cupertino's
  /// pill is 18 high.
  @Test("BDG-2 BDG-6 the presets' own values reach the badge")
  func presetValues() throws {
    for system in [TanreiSystem.m3Like, .m3ExpressiveLike, .cupertino] {
      #expect(system.badge.containerColor == .role(.error), "\(system.id)")
      #expect(system.badge.labelColor == .role(.onError), "\(system.id)")
      #expect(system.badge.outlineColor.resolve(in: system.colors.light).opacity == 0, "\(system.id)")
    }
    #expect(TanreiSystem.cupertino.badge.containerHeight == 18)
    // Rendered: cupertino's pill is its own height, in its error color.
    let cupertino = solidPill(.cupertino)
    let bitmap = try Snapshot.render(badged(3), theme: theme(cupertino))
    let down = try #require(verticalExtent(bitmap, x: anchorOrigin.x + side, color: TanreiSystem.cupertino.colors.light[.error].rgba8()))
    #expect(down.max - down.min == max(18, TanreiSystem.cupertino.typescale.labelSmall.lineHeight))
  }
}

// MARK: - Snapshots (one per spec fixture)

/// The fixtures' anchor (the spec's default slot): "notifications" as the SF Symbol `bell`, in an icon box of
/// `sys.measure.icon-large`, in on-surface-variant, named by its glyph name (the badge's label is its value).
private struct BellAnchor: View {
  let name: String
  @Environment(\.tanreiSystem) private var system
  @TanreiPalette private var colors
  var body: some View {
    Image(systemName: "bell")
      .resizable()
      .scaledToFit()
      .frame(width: system.measure.iconLarge, height: system.measure.iconLarge)
      .foregroundStyle(colors[.onSurfaceVariant])
      .accessibilityLabel(name)
  }
}

@MainActor
@Suite("TanreiBadge snapshots")
struct TanreiBadgeSnapshotTests {
  struct Fixture: Sendable, CustomTestStringConvertible {
    let id: String
    var count: Int?
    var max = 999
    let label: String
    /// The fixture's content: the anchor's glyph, and its accessible name.
    var glyph = "notifications"
    var testDescription: String { id }
  }

  /// Mirrors `fixtures` in specs/badge.spec.json (content "notifications").
  nonisolated static let fixtures: [Fixture] = [
    Fixture(id: "dot", count: nil, label: "New messages"),
    Fixture(id: "count-single", count: 3, label: "3 unread"),
    Fixture(id: "count-double", count: 42, label: "42 unread"),
    Fixture(id: "count-overflow", count: 1200, label: "More than 999 unread"),
    Fixture(id: "count-custom-max", count: 120, max: 99, label: "More than 99 unread"),
    Fixture(id: "count-zero", count: 0, label: "No unread messages"),
  ]

  /// The fixture as a product writes it, with room around the anchor for the badge.
  static func view(_ fixture: Fixture) -> some View {
    TanreiBadge(count: fixture.count, max: fixture.max, label: fixture.label) { BellAnchor(name: fixture.glyph) }
      .padding(Snapshot.inset)
      // The pill grows toward the end: room for "999+" and its outline.
      .padding(.trailing, Snapshot.inset)
  }

  @Test("fixture matches its baseline", arguments: fixtures)
  func fixture(_ fixture: Fixture) throws {
    try Snapshot.assert(Self.view(fixture), named: fixture.id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    let spec = try SpecFixture.load(spec: "badge")
    #expect(spec.map(\.id) == Self.fixtures.map(\.id))
    for (theirs, ours) in zip(spec, Self.fixtures) {
      #expect(theirs.number("count").map { Int($0) } == ours.count, "\(ours.id)")
      #expect(Int(theirs.number("max") ?? 999) == ours.max, "\(ours.id)")
      #expect(theirs.string("label") == ours.label, "\(ours.id)")
      #expect(theirs.content == ours.glyph, "\(ours.id)")
    }
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiBadgeTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiBadge preset snapshots")
struct TanreiBadgePresetSnapshotTests {
  /// A two-digit count: it shows the preset's colors, pill height, padding, outline and placement.
  nonisolated static let fixtureId = "count-double"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .m3ExpressiveLike, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiBadgeSnapshotTests.fixtures.contains { $0.id == Self.fixtureId })
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try #require(TanreiBadgeSnapshotTests.fixtures.first { $0.id == Self.fixtureId })
    try Snapshot.assert(TanreiBadgeSnapshotTests.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
