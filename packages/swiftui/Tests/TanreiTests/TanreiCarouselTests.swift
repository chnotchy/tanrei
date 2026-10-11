import AcmeFixture
import Observation
import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/carousel.spec.json. Each behavior id (CRL-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file. CRL-5, CRL-6 and CRL-7 are BTN-8, BTN-9 and BTN-10 for the item: the primitives
// they rest on are tested once in TanreiButtonTests / TanreiPrimitivesTests; here each is proven to reach the item. The
// fixtures render a carousel 400 wide (W 368) and 200 tall on a `surface` page, at rest (the spec's harness note).
//
// Icons: baselines render with `Snapshot.theme` (`fontFamilyPolicy: .system`), under which a `TanreiIconGlyph` draws
// nothing, so a fixture's glyph name draws the SF Symbol a product would pass for it (`platform-symbol-sets`), at
// `sys.icon.large`, unselected.
//
// Scrolling, settling, the keyboard and assistive technology on a device are the Gallery UI tests' (GalleryUITests,
// "carousel"): here the geometry and the rules are tested pure, and scrolling through AppKit's scroll view (macOS).

private let suiteName = "TanreiCarouselTests"

@MainActor
private func theme(_ system: TanreiSystem) -> TanreiTheme {
  var theme = Snapshot.theme
  theme.system = system
  return theme
}

@MainActor
private func pixel(_ bitmap: Bitmap, x: CGFloat, y: CGFloat) -> Bitmap.RGBA {
  bitmap[Int(x * Snapshot.scale), Int(y * Snapshot.scale)]
}

/// The size of a render without the snapshot inset, in points.
@MainActor
private func visualSize(_ bitmap: Bitmap) -> CGSize {
  CGSize(width: CGFloat(bitmap.width) / Snapshot.scale - 2 * Snapshot.inset, height: CGFloat(bitmap.height) / Snapshot.scale - 2 * Snapshot.inset)
}

private let light = TanreiSystem.tanrei.colors.light

/// The six walks of the multi-browse fixture.
private let labels = ["Coast path", "Old forest", "Lake shore", "City park", "Dunes", "Summit"]

/// The default tokens' geometry for a carousel `width` wide (CRL-10's verify: g 8, small 40–56, padding 16).
private func geometry(_ width: CGFloat, large: CGFloat = 200, layout: TanreiCarouselLayout = .multiBrowse, count: Int = 6) -> TanreiCarouselGeometry {
  TanreiCarouselGeometry(width: width, padding: 16, gap: 8, largeWidth: large, smallMin: 40, smallMax: 56, layout: layout, count: count)
}

/// Hundredths, as the spec's worked examples are written.
private func round2(_ value: CGFloat) -> CGFloat { (value * 100).rounded() / 100 }

/// A carousel of `count` items (the fixture's labels) whose content is `content`, `width` wide.
@MainActor
private func carousel(
  _ count: Int = 6, layout: TanreiCarouselLayout = .multiBrowse, itemWidth: CGFloat? = nil, width: CGFloat = 400,
  actions: [@MainActor () -> Void]? = nil, content: @escaping (Int) -> AnyView = { _ in AnyView(Color.clear) }
) -> some View {
  TanreiCarousel("Walks near you", layout: layout, itemWidth: itemWidth) {
    ForEach(0..<count, id: \.self) { index in
      TanreiCarouselItem(labels[index % labels.count], action: { actions?[index]() }) { content(index) }
    }
  }
  .frame(width: width)
}

/// One item's chrome, alone: what the carousel draws for an item `width` wide whose content is laid out `contentWidth`
/// wide. Its hit area is its own width here.
@MainActor
private func chrome(
  width: CGFloat = 200, contentWidth: CGFloat = 200, pressed: Bool = false, focused: Bool = false, content: AnyView = AnyView(Color.clear)
) -> some View {
  TanreiCarouselItemChrome(width: width, contentWidth: contentWidth, height: 200, isPressed: pressed, isFocused: focused) { content }
    .frame(width: width, height: 200)
}

// MARK: - The geometry (CRL-8 – CRL-13), as the spec's worked examples state it

@Suite("TanreiCarousel geometry")
struct TanreiCarouselGeometryTests {
  /// CRL-10 — n large slots, a medium and a small one filling W exactly, unrounded: the verify note's four examples.
  @Test("CRL-10 the worked examples: n large slots, a medium and a small one filling W, unrounded")
  func multiBrowse() {
    #expect(geometry(400).slots.map(round2) == [200, 101.33, 50.67])
    #expect(geometry(400, large: 120).slots.map(round2) == [120, 120, 64, 40])
    #expect(geometry(800).slots.map(round2) == [200, 200, 200, 90.67, 45.33])
    // M would exceed L: M is L, and S takes the rest — the one case it exceeds small-max-width.
    #expect(geometry(492, large: 120).slots.map(round2) == [120, 120, 120, 76])
    let g = geometry(400)
    #expect(g.slots[1] != g.slots[1].rounded())
    #expect(g.large == 1 && geometry(400, large: 120).large == 2)
    // Filling W exactly: the slots and the gaps between them add up to W.
    for example in [geometry(400), geometry(400, large: 120), geometry(800), geometry(492, large: 120)] {
      #expect(abs(example.slots.reduce(0, +) + CGFloat(example.slots.count - 1) * 8 - example.inner) < 1e-9)
    }
  }

  /// CRL-11 — hero: one slot W − g − small-max-width wide and one small-max-width wide, whatever the large width.
  @Test("CRL-11 hero is one slot W − g − small-max-width wide and one small-max-width wide; itemWidth is ignored")
  func hero() {
    #expect(geometry(400, layout: .hero).slots == [304, 56])
    #expect(geometry(400, large: 90, layout: .hero).slots == [304, 56])
    #expect(geometry(400, layout: .hero).content == 304)
  }

  /// CRL-9 — L is at most W − 2 × (small-min + g) in multi-browse and W uncontained; a row narrower than three small items
  /// and two gaps lays every item out W wide, in every layout, as the hero layout's one slot.
  @Test("CRL-9 the large width is held to its limit; a narrow row is one slot W wide in every layout")
  func limits() {
    #expect(geometry(400, large: 1000).slots == [272, 40, 40])
    #expect(geometry(400, large: 1000, layout: .uncontained, count: 3).content == 368)
    for layout in TanreiCarouselLayout.allCases {
      let narrow = geometry(150, layout: layout)
      #expect(narrow.slots == [118] && narrow.content == 118 && narrow.snaps, "\(layout)")
    }
  }

  /// CRL-8 — the inner width is the carousel's less the padding twice; CRL-12 — slots −1 to K and the items at p = 0.5, as
  /// the verify note has them; at the end of the range the last item is large at slot 0 and the slots after it are empty.
  @Test("CRL-8 CRL-12 slots −1 to K and the items at p = 0.5, as the verify note has them")
  func positions() {
    let g = geometry(400)
    #expect(g.inner == 368 && g.padding == 16)
    #expect(g.step == 208 && g.maxPosition == 5 && g.range == 1040)
    #expect([-1, 0, 1, 2, 3].map { round2(g.slot($0).start) } == [-66.67, 0, 208, 317.33, 384])
    #expect([-1, 0, 1, 2, 3].map { round2(g.slot($0).width) } == [50.67, 200, 101.33, 50.67, 50.67])
    let at = (0...3).map { g.item($0, offset: 104) }.map { [round2($0.start), round2($0.width)] }
    #expect(at == [[-33.33, 125.33], [104, 150.67], [262.67, 76], [350.67, 50.67]])
    // Items 4 and 5 are out of view: past slot K, which starts at the carousel's end edge (W + padding).
    #expect(g.item(4, offset: 104).start >= 384 && g.item(5, offset: 104).start > g.item(4, offset: 104).start)
    // At p = 0 the row is the resting arrangement.
    #expect((0...2).map { g.item($0, offset: 0) } == (0...2).map { g.slot($0) })
    // At the end of the range the last item is large, at slot 0, and the slots after it are empty.
    #expect(g.item(5, offset: g.range) == TanreiCarouselGeometry.Box(start: 0, width: 200))
    // Out of range offsets are clamped (a bounce).
    #expect(g.position(-50) == 0 && g.position(5000) == 5)
    // Hero: n is 1.
    let hero = geometry(400, layout: .hero, count: 4)
    #expect(hero.maxPosition == 3 && hero.step == 312 && hero.range == 936)
  }

  /// CRL-13 — uncontained: every item L wide, g apart, from the inner start edge; the range ends where the last item ends
  /// at the inner end edge; while they fit, no range.
  @Test("CRL-13 uncontained scrolls freely to the last item at the inner end edge, and not at all when they fit")
  func uncontained() {
    let u = geometry(400, layout: .uncontained, count: 5)
    #expect(!u.snaps && u.slots.isEmpty)
    #expect(u.range == CGFloat(5 * 200 + 4 * 8 - 368))
    #expect(u.item(1, offset: 0) == TanreiCarouselGeometry.Box(start: 208, width: 200))
    #expect(u.item(4, offset: u.range).start + 200 == u.inner)
    #expect(geometry(800, layout: .uncontained, count: 3).range == 0)
  }
}

// MARK: - The rules (CRL-4, CRL-14, CRL-17, CRL-18, CRL-20, CRL-21, CRL-23, CRL-24)

@MainActor
@Suite("TanreiCarousel rules")
struct TanreiCarouselRulesTests {
  /// CRL-14 — a release at 0.5 points per millisecond or faster is a fling in its direction; a settle goes to the next whole
  /// position in the direction of a fling, or else to the nearest one.
  @Test("CRL-14 a fling goes on to the next position in its direction; a slow release to the nearest")
  func settle() {
    #expect(TanreiCarouselRules.flingDirection(0.5) == 1 && TanreiCarouselRules.flingDirection(-0.7) == -1)
    #expect(TanreiCarouselRules.flingDirection(0.49) == 0 && TanreiCarouselRules.flingDirection(-0.2) == 0)
    let m = geometry(400)
    #expect([m.settleOffset(60, direction: 0), m.settleOffset(60, direction: 1), m.settleOffset(150, direction: -1), m.settleOffset(150, direction: 0)] == [0, 208, 0, 208])
    // A whole position flung on goes one further; the ends hold.
    #expect(m.settleOffset(208, direction: 1) == 208 && m.settleOffset(210, direction: 1) == 416)
    #expect(m.settleOffset(m.range, direction: 1) == m.range && m.settleOffset(0, direction: -1) == 0)
    #expect(m.isWhole(416) && !m.isWhole(420))
  }

  /// CRL-17 — Right and Left Arrow move to the next and previous item without wrapping; Home and End to the ends; other keys
  /// are not the carousel's. CRL-23 — right to left, Left Arrow is the next item.
  @Test("CRL-17 CRL-23 the arrows move without wrapping (mirrored right to left); Home and End go to the ends")
  func keys() {
    func target(_ key: KeyEquivalent, from index: Int, _ direction: LayoutDirection = .leftToRight) -> Int? {
      TanreiCarouselRules.target(for: key, from: index, count: 6, layoutDirection: direction)
    }
    #expect(target(.rightArrow, from: 1) == 2 && target(.leftArrow, from: 1) == 0)
    #expect(target(.rightArrow, from: 5) == 5 && target(.leftArrow, from: 0) == 0)
    #expect(target(.home, from: 4) == 0 && target(.end, from: 1) == 5)
    #expect(target(.downArrow, from: 1) == nil && target(.upArrow, from: 1) == nil)
    #expect(target(.leftArrow, from: 1, .rightToLeft) == 2 && target(.rightArrow, from: 1, .rightToLeft) == 0)
    #expect(TanreiCarouselRules.target(for: .rightArrow, from: 0, count: 0, layoutDirection: .leftToRight) == nil)
    #expect(TanreiCarouselRules.keys == [.leftArrow, .rightArrow, .home, .end])
  }

  /// CRL-17 — one Tab stop: the item that last had keyboard focus, or else the item at slot 0 (multi-browse, hero) or the
  /// first item wholly in view (uncontained).
  @Test("CRL-17 the Tab stop is the item last focused, else the item in place")
  func tabStop() {
    let m = geometry(400)
    #expect(TanreiCarouselRules.tabStop(remembered: nil, geometry: m, offset: 0) == 0)
    #expect(TanreiCarouselRules.tabStop(remembered: nil, geometry: m, offset: 416) == 2)
    #expect(TanreiCarouselRules.tabStop(remembered: nil, geometry: m, offset: 300) == 1)
    #expect(TanreiCarouselRules.tabStop(remembered: 4, geometry: m, offset: 0) == 4)
    #expect(TanreiCarouselRules.tabStop(remembered: 9, geometry: m, offset: 0) == 0)
    let u = geometry(400, layout: .uncontained, count: 5)
    #expect(TanreiCarouselRules.tabStop(remembered: nil, geometry: u, offset: 100) == 1)
    #expect(TanreiCarouselRules.tabStop(remembered: nil, geometry: geometry(400, count: 0), offset: 0) == nil)
  }

  /// CRL-18 — focus brings an item to slot 0, or as near as the range allows (multi-browse, hero); wholly into view with the
  /// least scroll (uncontained).
  @Test("CRL-18 focus brings the item to slot 0 or as near as the range allows; uncontained scrolls as little as it needs")
  func reveal() {
    let m = geometry(400)
    #expect(m.revealOffset(2, offset: 0) == 416 && m.revealOffset(5, offset: 0) == 1040)
    let few = geometry(400, count: 2)
    // Two items and one large slot: the range ends at p 1.
    #expect(few.revealOffset(1, offset: 0) == 208)
    let u = geometry(400, layout: .uncontained, count: 5)
    #expect(u.revealOffset(1, offset: 0) == CGFloat(208 + 200 - 368))
    #expect(u.revealOffset(0, offset: 100) == 0 && u.revealOffset(1, offset: 100) == 100)
    #expect(u.revealOffset(4, offset: 0) == u.range)
  }

  /// CRL-21 — a new width or new items keep the item at slot 0 (or first in view) where it was, as far as the new range
  /// allows.
  @Test("CRL-21 a new width or new items keep the item in place where it was")
  func kept() {
    let before = geometry(400)
    // p 2 at 400 wide; 300 wide the step is 180 (L held to 172).
    let narrower = geometry(300)
    #expect(narrower.step == 180)
    #expect(TanreiCarouselRules.keptOffset(before: before, offset: 416, anchor: 2, next: narrower) == 360)
    // The first item removed: the item that was at slot 0 is now the second.
    #expect(TanreiCarouselRules.keptOffset(before: before, offset: 416, anchor: 1, next: geometry(400, count: 5)) == 208)
    // It is gone: the item now at its index takes its place; as far as the range allows.
    #expect(TanreiCarouselRules.keptOffset(before: before, offset: 1040, anchor: nil, next: geometry(400, count: 3)) == 416)
    // A fraction of a position is kept: at p 0.5 the item in place is item 1 (the nearest), half a position before slot 0.
    #expect(TanreiCarouselRules.keptOffset(before: before, offset: 104, anchor: 1, next: narrower) == 90)
    // Uncontained keeps the first item in view where it starts.
    let u = geometry(400, layout: .uncontained, count: 5)
    #expect(TanreiCarouselRules.keptOffset(before: u, offset: 250, anchor: 2, next: u) == 250)
  }

  /// CRL-23 — the scroll view is laid out left to right; the carousel mirrors offsets and the track itself: right to left,
  /// offset 0 is the track's right end and slot 0 is at the right.
  @Test("CRL-23 right to left the offsets and the track are mirrored")
  func mirrored() {
    let g = geometry(400)
    #expect(TanreiCarouselRules.physical(0, range: 1040, rightToLeft: true) == 1040)
    #expect(TanreiCarouselRules.logical(1040 - 104, range: 1040, rightToLeft: true) == 104)
    #expect(TanreiCarouselRules.physical(104, range: 1040, rightToLeft: false) == 104)
    let first = g.item(0, offset: 0)
    // Left to right: 16 in from the track's left edge. Right to left: 16 in from the view's right edge, at the track's end.
    #expect(TanreiCarouselRules.trackX(of: first, geometry: g, offset: 0, rightToLeft: false) == 16)
    #expect(TanreiCarouselRules.trackX(of: first, geometry: g, offset: 0, rightToLeft: true) == CGFloat(1040 + 400 - 16 - 200))
  }

  /// CRL-4 — the hit area is the item and half the gap on each side; a small item at small-min-width is the touch target
  /// with the default tokens; never below the minimum.
  @Test("CRL-4 the hit area is the item and half the gap on each side, never below the target")
  func hitArea() {
    let measure = TanreiSystem.tanrei.measure
    let tokens = TanreiSystem.tanrei.carousel
    #expect(TanreiCarouselRules.hitWidth(itemWidth: tokens.containerSmallMinWidth, gap: tokens.layoutGap, minimum: 0) == measure.targetTouch)
    #expect(TanreiCarouselRules.hitWidth(itemWidth: 120, gap: 8, minimum: 48) == 128)
    #expect(TanreiCarouselRules.hitWidth(itemWidth: 20, gap: 8, minimum: 48) == 48)
  }

  /// CRL-24 — an unknown layout is the default and is reported; an itemWidth that is not a positive number is nil and is
  /// reported; a good one passes silently.
  @Test("CRL-24 an unknown layout draws multi-browse and an itemWidth that is not positive is nil; both are reported")
  func unknownValues() {
    let (layout, reports) = Reports.collecting { TanreiCarouselLayout(named: "centered") }
    #expect(layout == .multiBrowse && reports.mention("CRL-24") && reports.mention("centered"))
    let (hero, silent) = Reports.collecting { TanreiCarouselLayout(named: "hero") }
    #expect(hero == .hero && silent.messages.isEmpty)
    for bad in [CGFloat(0), -10, .nan, .infinity] {
      let (width, reported) = Reports.collecting { TanreiCarouselRules.itemWidth(bad) }
      #expect(width == nil && reported.mention("CRL-24"), "\(bad)")
    }
    let (good, quiet) = Reports.collecting { TanreiCarouselRules.itemWidth(120) }
    #expect(good == 120 && quiet.messages.isEmpty)
    #expect(Reports.collecting { TanreiCarouselRules.itemWidth(nil) }.reports.messages.isEmpty)
    #expect(TanreiCarouselLayout.allCases.map(\.rawValue) == ["multi-browse", "hero", "uncontained"])
  }

  /// CRL-24 — rendered: a carousel whose itemWidth is not positive draws exactly as one without it.
  @Test("CRL-24 an itemWidth that is not positive draws as none")
  func unknownWidthRendered() throws {
    let (bad, _) = try Reports.collecting { try Snapshot.renderExact(carousel(itemWidth: -5)) }
    #expect(bad.mismatch(against: try Snapshot.renderExact(carousel()), channelTolerance: 0) == 0)
  }
}

// MARK: - Reading the items (CRL-19, CRL-20)

private final class EntriesBox: @unchecked Sendable {
  var entries: [TanreiCarouselEntry] = []
}

private struct EntriesRoot: _VariadicView_UnaryViewRoot {
  let box: EntriesBox
  func body(children: _VariadicView.Children) -> some View {
    box.entries = children.compactMap { $0[TanreiCarouselEntryKey.self] }
    return Color.clear.frame(width: 1, height: 1)
  }
}

@MainActor
private func read(@ViewBuilder _ content: () -> some View) -> [TanreiCarouselEntry] {
  let box = EntriesBox()
  _ = ImageRenderer(content: _VariadicView.Tree(EntriesRoot(box: box)) { content() }).cgImage
  return box.entries
}

@MainActor
@Suite("TanreiCarousel items")
struct TanreiCarouselItemTests {
  /// The item kind `item`: its label and its action are read from its own view, through `ForEach` and modifiers, in order.
  @Test("CRL-19 each item's label and action are read from its view, in order")
  func props() {
    var fired: [Int] = []
    let read = read {
      TanreiCarouselItem("Coast path", action: { fired.append(0) }) { Color.red }
      ForEach(1..<3, id: \.self) { index in
        TanreiCarouselItem(labels[index], action: { fired.append(index) }) { Color.blue }.padding(1)
      }
    }
    #expect(read.map(\.label) == ["Coast path", "Old forest", "Lake shore"])
    read.forEach { $0.action() }
    #expect(fired == [0, 1, 2])
  }

  /// CRL-20 — an item without a label and a carousel without one are reported in debug builds, and still render.
  @Test("CRL-20 empty labels are reported, and the items still render")
  func emptyLabels() throws {
    let (_, item) = Reports.collecting { _ = TanreiCarouselItem(" ", action: {}) { Color.clear } }
    #expect(item.mention("CRL-20") && item.mention("accessible name"))
    let (_, list) = Reports.collecting { _ = TanreiCarousel("") { TanreiCarouselItem("A", action: {}) { Color.clear } } }
    #expect(list.mention("CRL-20") && list.mention("list"))
    let (_, silent) = Reports.collecting { _ = TanreiCarousel("Walks") { TanreiCarouselItem("A", action: {}) { Color.clear } } }
    #expect(silent.messages.isEmpty)
    let (bitmap, _) = try Reports.collecting {
      try Snapshot.render(TanreiCarousel("") { TanreiCarouselItem("", action: {}) { Color.clear } }.frame(width: 400))
    }
    // One item alone: the one slot of a row with one item — drawn in the item's fill.
    #expect(pixel(bitmap, x: Snapshot.inset + 16 + 100, y: Snapshot.inset + 40).isClose(to: light[.surfaceContainerHighest].rgba8()))
  }
}

// MARK: - Token bindings (CRL-2, CRL-6, CRL-7, CRL-16, CRL-22)

@MainActor
@Suite("TanreiCarousel token bindings")
struct TanreiCarouselTokenBindingTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiCarouselTokens { system.carousel }

  private func appearance(
    _ state: TanreiInteraction, feedback: TanreiPressedFeedback = .overlay, beneath: TanreiInteraction = .enabled, in system: TanreiSystem? = nil
  ) -> TanreiCarouselItemAppearance {
    let system = system ?? self.system
    return TanreiCarouselItemAppearance(tokens: system.carousel, state: state, feedback: feedback, beneath: beneath, layers: system.state)
  }

  /// CRL-16 — at rest: the resting fill (surface-container-highest), the on-surface content color, no state layer, the
  /// container shape, not dimmed.
  @Test("CRL-16 at rest: the resting fill, the content color and no state layer")
  func rest() {
    let rest = appearance(.enabled)
    #expect(rest.container == tokens.parts.item.enabled.containerColor && rest.container == .role(.surfaceContainerHighest))
    #expect(rest.content == .role(.onSurface))
    #expect(rest.stateLayer == .none && rest.ripple == nil && rest.opacity == 1 && rest.cornerRadius == tokens.containerShape)
  }

  /// CRL-2, CRL-16 — each state binds its own tokens: the content color, opacity and shape of the state, the state layer of
  /// the state at its `sys.state` opacity over the content, and always the resting fill under it.
  @Test("CRL-2 CRL-16 each state binds that state's tokens; the fill stays at rest", arguments: [TanreiInteraction.hovered, .focused, .pressed])
  func states(state: TanreiInteraction) {
    let own = appearance(state)
    let part = tokens.parts.item[state: state]!
    let amount = system.state.carouselLayerOpacity(state)!
    #expect(own.container == tokens.parts.item.enabled.containerColor)
    #expect(own.content == part.contentColor)
    #expect(own.stateLayer == .alpha(of: part.stateLayerColor, amount: amount))
    #expect(own.opacity == tokens[state: state]!.opacity && own.cornerRadius == tokens[state: state]!.containerShape)
    let opacities = [TanreiInteraction.hovered: system.state.hoverStateLayerOpacity, .focused: system.state.focusStateLayerOpacity, .pressed: system.state.pressedStateLayerOpacity]
    #expect(amount == opacities[state])
  }

  /// CRL-2's verify — under the acme fixture system, which values hovered, focused and pressed differently: each state
  /// draws its own, so pressed over focused over hovered is visible.
  @Test("CRL-2 under acme, hovered, focused and pressed differ")
  func acme() {
    let states: [TanreiInteraction] = [.hovered, .focused, .pressed]
    let drawn = states.map { appearance($0, in: .acme) }
    #expect(Set(drawn.map { "\($0)" }).count == 3)
    // Precedence is the resolved state's: pressed wins over focus and hover, focus over hover.
    #expect(TanreiInteraction.resolve(isEnabled: true, isPressed: true, isFocused: true, isHovered: true) == .pressed)
    #expect(TanreiInteraction.resolve(isEnabled: true, isPressed: false, isFocused: true, isHovered: true) == .focused)
  }

  /// CRL-2, CRL-16 — a modified system changes what each state resolves to (every token the item reads drives it).
  @Test("CRL-2 CRL-16 a modified system changes what each state resolves to")
  func modified() {
    var custom = system
    custom.carousel.parts.item.enabled.containerColor = .role(.secondary)
    custom.carousel.parts.item.hovered.contentColor = .role(.error)
    custom.carousel.parts.item.hovered.stateLayerColor = .role(.warning)
    custom.state.hoverStateLayerOpacity = 0.25
    custom.carousel.hovered.opacity = 0.4
    custom.carousel.hovered.containerShape = 3
    custom.carousel.containerShape = 9
    let hovered = appearance(.hovered, in: custom)
    #expect(hovered.container == .role(.secondary) && hovered.content == .role(.error))
    #expect(hovered.stateLayer == .alpha(of: .role(.warning), amount: 0.25) && hovered.opacity == 0.4 && hovered.cornerRadius == 3)
    #expect(appearance(.enabled, in: custom).cornerRadius == 9)
  }

  /// CRL-6 — which tokens a press reads under each choice: overlay the pressed layer at once; ripple the layer of the state
  /// beneath and the pressed one grown over it; dim the pressed opacity and no ripple, the layer beneath; none the state
  /// beneath entirely. Content color, opacity and shape are the pressed ones except under none.
  @Test("CRL-6 each choice binds the pressed tokens its own way", arguments: TanreiPressedFeedback.allCases)
  func feedback(feedback: TanreiPressedFeedback) {
    var custom = system
    custom.carousel.parts.item.pressed.stateLayerColor = .role(.error)
    custom.carousel.parts.item.pressed.contentColor = .role(.warning)
    custom.carousel.pressed.opacity = 0.5
    let pressed = appearance(.pressed, feedback: feedback, beneath: .hovered, in: custom)
    let hoveredLayer = TanreiPaint.alpha(of: custom.carousel.parts.item.hovered.stateLayerColor, amount: custom.state.hoverStateLayerOpacity)
    let pressedLayer = TanreiPaint.alpha(of: .role(.error), amount: custom.state.pressedStateLayerOpacity)
    #expect(pressed.container == custom.carousel.parts.item.enabled.containerColor)
    switch feedback {
    case .overlay: #expect(pressed.stateLayer == pressedLayer && pressed.ripple == nil && pressed.content == .role(.warning) && pressed.opacity == 0.5)
    case .ripple: #expect(pressed.stateLayer == hoveredLayer && pressed.ripple == pressedLayer && pressed.content == .role(.warning) && pressed.opacity == 0.5)
    case .dim: #expect(pressed.stateLayer == hoveredLayer && pressed.ripple == nil && pressed.content == .role(.warning) && pressed.opacity == 0.5)
    case .none: #expect(pressed == appearance(.hovered, in: custom))
    }
    func shipped(_ system: TanreiSystem) -> TanreiCarouselItemAppearance {
      TanreiCarouselItemAppearance(tokens: system.carousel, state: .pressed, feedback: system.behavior.pressedFeedback, layers: system.state)
    }
    #expect(shipped(.m3Like).ripple != nil && shipped(.cupertino).ripple == nil && shipped(.cupertino).opacity < 1 && shipped(.tanrei).ripple == nil)
  }

  /// CRL-6 — rendered: the pressed item under each choice, over an opaque content. A fully opaque pressed layer covers the
  /// content under overlay and ripple; dim and none draw none.
  @Test("CRL-6 each choice renders as it says", arguments: TanreiPressedFeedback.allCases)
  func rendered(feedback: TanreiPressedFeedback) throws {
    var custom = TanreiSystem.tanrei
    custom.behavior.pressedFeedback = feedback
    custom.carousel.parts.item.pressed.stateLayerColor = .role(.error)
    custom.state.pressedStateLayerOpacity = 1
    let bitmap = try Snapshot.render(chrome(pressed: true, content: AnyView(Rectangle())), theme: theme(custom))
    let actual = pixel(bitmap, x: Snapshot.inset + 100, y: Snapshot.inset + 100)
    switch feedback {
    case .overlay, .ripple: #expect(actual.isClose(to: light[.error].rgba8()))
    case .dim, .none: #expect(!actual.isClose(to: light[.error].rgba8(), tolerance: 40))
    }
  }

  /// CRL-7 — the item's corners follow the corner smoothing; its keyboard focus follows the focus style (acme is glow).
  @Test("CRL-7 corner smoothing and focus style reach the item")
  func cornersAndFocusStyle() throws {
    func render(_ amount: Double, focused: Bool = false, style: TanreiFocusStyle = .ring) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      custom.carousel.containerShape = 24
      custom.carousel.focused.containerShape = 24
      custom.carousel.parts.item.enabled.containerColor = .role(.error)
      custom.behavior.focusStyle = style
      return try Snapshot.renderExact(chrome(focused: focused), theme: theme(custom))
    }
    let continuous = try render(0.6)
    #expect(try render(0).mismatch(against: continuous, channelTolerance: 0) > 0)
    #expect(try render(1).mismatch(against: continuous, channelTolerance: 0) == 0)
    #expect(try render(0.6, focused: true, style: .glow).mismatch(against: try render(0.6, focused: true, style: .ring), channelTolerance: 0) > 0)
    #expect(TanreiSystem.acme.behavior.focusStyle == .glow && TanreiSystem.cupertino.shape.cornerSmoothing > 0)
  }

  /// CRL-22, CRL-6, CRL-14, CRL-18 — the state motion, the ripple's growth and the scroll motion come from the tokens; none
  /// under Reduce Motion.
  @Test("CRL-22 CRL-6 CRL-18 the motions come from the tokens; none under Reduce Motion")
  func motion() {
    var custom = tokens
    custom.motionStateDuration = 400
    custom.motionStateEasing = TanreiCubicBezier(0, 0, 1, 1)
    custom.motionFeedbackDuration = 900
    custom.motionScrollDuration = 700
    custom.motionScrollEasing = TanreiCubicBezier(0.1, 0.2, 0.3, 0.4)
    #expect(custom.stateMotion(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.4))
    #expect(custom.rippleGrowth(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.9))
    #expect(custom.scrollMotion(reduceMotion: false) == Animation.timingCurve(0.1, 0.2, 0.3, 0.4, duration: 0.7))
    #expect(custom.stateMotion(reduceMotion: true) == nil && custom.rippleGrowth(reduceMotion: true) == nil && custom.scrollMotion(reduceMotion: true) == nil)
  }
}

// MARK: - Rendered (CRL-3, CRL-4, CRL-8, CRL-10 – CRL-13, CRL-15, CRL-16, CRL-23, CRL-25)

@MainActor
@Suite("TanreiCarousel rendered")
struct TanreiCarouselRenderedTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiCarouselTokens { system.carousel }
  var fill: Bitmap.RGBA { light[.surfaceContainerHighest].rgba8() }
  var surface: Bitmap.RGBA { light[.surface].rgba8() }

  /// Whether the render shows the item fill at `x` (points from the carousel's left edge), on a line clear of the glyphs.
  private func filled(_ bitmap: Bitmap, _ x: CGFloat, y: CGFloat = 40) -> Bool {
    pixel(bitmap, x: Snapshot.inset + x, y: Snapshot.inset + y).isClose(to: fill)
  }

  /// CRL-8 — as wide as its parent and layout.height tall; every item as tall; one row in order, g apart inside the
  /// padding; CRL-10 — multi-browse at rest is 200 · 101.33 · 50.67 from the inner start edge.
  @Test("CRL-8 CRL-10 as wide as its parent, layout.height tall, the items in one row g apart inside the padding")
  func arrangement() throws {
    let bitmap = try Snapshot.render(carousel())
    #expect(visualSize(bitmap) == CGSize(width: 400, height: tokens.layoutHeight))
    // The padding before the first item, the gaps between items (16 | 200 | 8 | 101.33 | 8 | 50.67 | 16).
    #expect(!filled(bitmap, 8) && filled(bitmap, 17) && filled(bitmap, 215))
    #expect(!filled(bitmap, 220) && filled(bitmap, 225) && filled(bitmap, 324))
    #expect(!filled(bitmap, 329) && filled(bitmap, 335) && filled(bitmap, 383) && !filled(bitmap, 392))
    // Every item as tall as the carousel (sampled on its middle column, clear of the corners).
    #expect(filled(bitmap, 116, y: 0.5) && filled(bitmap, 116, y: 199.5) && filled(bitmap, 358, y: 0.5))
  }

  /// CRL-9, CRL-10 — itemWidth 120: two large items, a medium 64 and a small 40.
  @Test("CRL-10 CRL-9 itemWidth sets the large width: 120 · 120 · 64 · 40")
  func narrowItems() throws {
    let bitmap = try Snapshot.render(carousel(itemWidth: 120))
    #expect(filled(bitmap, 135) && !filled(bitmap, 140) && filled(bitmap, 145) && filled(bitmap, 263))
    #expect(!filled(bitmap, 268) && filled(bitmap, 273) && filled(bitmap, 335) && !filled(bitmap, 340) && filled(bitmap, 345) && filled(bitmap, 383))
  }

  /// CRL-11 — hero: 304 and 56, whatever the large width.
  @Test("CRL-11 hero is 304 and 56 in a 400 carousel, whatever itemWidth")
  func hero() throws {
    for itemWidth in [nil, CGFloat(90)] {
      let bitmap = try Snapshot.render(carousel(4, layout: .hero, itemWidth: itemWidth))
      #expect(filled(bitmap, 319) && !filled(bitmap, 324) && filled(bitmap, 329) && filled(bitmap, 383) && !filled(bitmap, 390))
    }
  }

  /// CRL-13 — uncontained: every item L wide from the inner start edge; the second cut by the edge after 160.
  @Test("CRL-13 uncontained lays every item out L wide; the second is cut at the edge")
  func uncontained() throws {
    let bitmap = try Snapshot.render(carousel(5, layout: .uncontained))
    #expect(filled(bitmap, 215) && !filled(bitmap, 220) && filled(bitmap, 225) && filled(bitmap, 399.5))
  }

  /// CRL-15 — the content is laid out at the large slot's width and the item's height, centred on the item and clipped to
  /// it: the medium item shows the middle of a content whose ends are marked, the large one shows the ends too.
  @Test("CRL-15 the content is laid out at the large width, centred and clipped")
  func masked() throws {
    let marked = AnyView(
      HStack(spacing: 0) {
        Color.red.frame(width: 6)
        Spacer(minLength: 0)
        Color.blue.frame(width: 6)
        Spacer(minLength: 0)
        Color.red.frame(width: 6)
      })
    let bitmap = try Snapshot.render(carousel(content: { _ in marked }))
    let red = Color.red.rgba8()
    let blue = Color.blue.rgba8()
    func at(_ x: CGFloat) -> Bitmap.RGBA { pixel(bitmap, x: Snapshot.inset + x, y: Snapshot.inset + 100) }
    // The large item (16 … 216): both ends and the middle.
    #expect(at(18).isClose(to: red) && at(214).isClose(to: red) && at(116).isClose(to: blue))
    // The medium item (224 … 325.33): the middle only, at its centre; the ends are clipped away.
    #expect(at(274.67).isClose(to: blue) && !at(226).isClose(to: red, tolerance: 40) && !at(323).isClose(to: red, tolerance: 40))
    // The small item (333.33 … 384): the middle only.
    #expect(at(358.67).isClose(to: blue) && !at(336).isClose(to: red, tolerance: 40))
    // Clipped to the corners: the top-left corner of the large item shows the page, not the content.
    #expect(pixel(bitmap, x: Snapshot.inset + 16.5, y: Snapshot.inset + 0.5).isClose(to: surface, tolerance: 12))
  }

  /// CRL-16 — the content is handed the content color (a `Rectangle` fills with the foreground style); the resting fill
  /// shows where the content does not cover it, whatever the state's container token; the state layer is over the content.
  @Test("CRL-16 the content color is handed down; the resting fill under it; the state layer over it")
  func layers() throws {
    let content = try Snapshot.render(chrome(content: AnyView(Rectangle())))
    #expect(pixel(content, x: Snapshot.inset + 100, y: Snapshot.inset + 100).isClose(to: light[.onSurface].rgba8()))
    var custom = system
    custom.carousel.parts.item.focused.containerColor = .role(.secondary)
    custom.carousel.parts.item.focused.stateLayerColor = .role(.error)
    custom.state.focusStateLayerOpacity = 0
    // Focused over an empty content, with no layer: the fill is the resting one, not the focused container token.
    let empty = try Snapshot.render(chrome(focused: true), theme: theme(custom))
    #expect(pixel(empty, x: Snapshot.inset + 100, y: Snapshot.inset + 100).isClose(to: fill))
    custom.state.focusStateLayerOpacity = 1
    // Focused over an opaque content: the state layer is drawn over it.
    let focused = try Snapshot.render(chrome(focused: true, content: AnyView(Rectangle())), theme: theme(custom))
    #expect(pixel(focused, x: Snapshot.inset + 100, y: Snapshot.inset + 100).isClose(to: light[.error].rgba8()))
  }

  /// CRL-3 — keyboard focus: the ring inside the item's container, which the row would otherwise clip; not dimmed; the item
  /// keeps its size. Without focus there is none.
  @Test("CRL-3 the focus ring is drawn inside the item, not dimmed")
  func focusRing() throws {
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.containerShape, measure: system.measure)
    let ringX = Snapshot.inset + metrics.outerWidth / 2
    let y = Snapshot.inset + 100
    let focused = try Snapshot.render(chrome(focused: true))
    #expect(pixel(focused, x: ringX, y: y).isClose(to: light[.focusRing].rgba8(), tolerance: 40))
    #expect(pixel(focused, x: Snapshot.inset - 1, y: y).isClose(to: surface))
    #expect(visualSize(focused) == visualSize(try Snapshot.render(chrome())))
    #expect(!pixel(try Snapshot.render(chrome()), x: ringX, y: y).isClose(to: light[.focusRing].rgba8(), tolerance: 40))
    var dim = system
    dim.carousel.focused.opacity = 0.3
    #expect(pixel(try Snapshot.render(chrome(focused: true), theme: theme(dim)), x: ringX, y: y).isClose(to: light[.focusRing].rgba8(), tolerance: 40))
  }

  /// CRL-4 — the row is never below the target; a system whose height is smaller still has a row as tall as the target.
  @Test("CRL-4 the row is at least the target tall")
  func rowHeight() throws {
    var short = system
    short.carousel.layoutHeight = 20
    let bitmap = try Snapshot.render(carousel(), theme: theme(short))
    #expect(visualSize(bitmap).height == TanreiHitTarget.minimum(in: system.measure))
    var tall = system
    tall.carousel.layoutHeight = 240
    #expect(visualSize(try Snapshot.render(carousel(), theme: theme(tall))).height == 240)
  }

  /// CRL-8, CRL-9, CRL-10 — the geometry reads its tokens: padding, gap and the widths of a modified system move the items.
  @Test("CRL-8 CRL-10 the padding, the gap and the widths come from the tokens")
  func tokensDriveGeometry() throws {
    var custom = system
    custom.carousel.layoutPaddingInline = 40
    custom.carousel.layoutGap = 20
    custom.carousel.containerLargeWidth = 100
    let bitmap = try Snapshot.render(carousel(), theme: theme(custom))
    // W 320: room 320 − 2 × (40 + 20) = 200, n = 1 … L 100: n = floor(200 / 120) = 1; the first item 40 … 140.
    #expect(!filled(bitmap, 38) && filled(bitmap, 42) && filled(bitmap, 138) && !filled(bitmap, 150) && filled(bitmap, 162))
  }

  /// CRL-23 — right to left the row is mirrored: slot 0 at the right, the padding at the right; the content is not mirrored.
  @Test("CRL-23 right to left slot 0 is at the right and the content is not mirrored")
  func rightToLeft() throws {
    let marked = AnyView(HStack(spacing: 0) { Color.red.frame(width: 100); Color.blue.frame(width: 100) })
    let bitmap = try Snapshot.render(carousel(content: { _ in marked }).environment(\.layoutDirection, .rightToLeft))
    // The large item at 184 … 384: its content's left half is red and its right half blue, as left to right would draw it.
    let red = Color.red.rgba8()
    let blue = Color.blue.rgba8()
    func at(_ x: CGFloat) -> Bitmap.RGBA { pixel(bitmap, x: Snapshot.inset + x, y: Snapshot.inset + 100) }
    // An HStack in a right-to-left layout puts its first child at the right: the content keeps the product's direction.
    #expect(at(234).isClose(to: blue) && at(334).isClose(to: red))
    #expect(!at(392).isClose(to: red, tolerance: 60) && !at(392).isClose(to: blue, tolerance: 60))
    // The medium item left of it (74.67 … 176), the gap between them.
    #expect(!at(180).isClose(to: red, tolerance: 60) && !at(180).isClose(to: blue, tolerance: 60))
  }

  /// CRL-25 — enlarged text keeps the height, the slots and the items as they are.
  @Test("CRL-25 enlarged text changes nothing")
  func dynamicType() throws {
    let content = { (_: Int) in AnyView(Text("Coast")) }
    let large = try Snapshot.renderExact(carousel(content: content).environment(\.dynamicTypeSize, .large))
    let huge = try Snapshot.renderExact(carousel(content: content).environment(\.dynamicTypeSize, .accessibility5))
    #expect(large.width == huge.width && large.height == huge.height)
    // The slots: the gaps are where they were.
    #expect(!pixel(huge, x: Snapshot.inset + 220, y: Snapshot.inset + 20).isClose(to: fill) && pixel(huge, x: Snapshot.inset + 225, y: Snapshot.inset + 20).isClose(to: fill))
  }
}

// MARK: - Hosted: pointer and scrolling through AppKit (CRL-1, CRL-4, CRL-5, CRL-12, CRL-13, CRL-21, CRL-23)

/// What a hosted carousel shows: its width and its items, changed by a test as an app's state would be.
@MainActor
@Observable
private final class CarouselModel {
  var width: CGFloat = 400
  var labels = ["Coast path", "Old forest", "Lake shore", "City park", "Dunes", "Summit"]
}

private struct ModelCarousel: View {
  let model: CarouselModel
  var layout: TanreiCarouselLayout = .multiBrowse

  var body: some View {
    TanreiCarousel("Walks near you", layout: layout) {
      ForEach(model.labels, id: \.self) { label in
        TanreiCarouselItem(label, action: {}) { Color.clear }
      }
    }
    .frame(width: model.width)
    .frame(width: 400, alignment: .leading)
  }
}

@MainActor
@Suite("TanreiCarousel hosted", .serialized)
struct TanreiCarouselHostedTests {
  #if os(macOS)
  var fill: Bitmap.RGBA { light[.surfaceContainerHighest].rgba8() }

  private func hosted(_ view: some View, system: TanreiSystem = .tanrei) -> HostedView<some View> {
    HostedView(view.padding(Snapshot.inset).background(system.colors.light[.surface]).tanreiTheme(theme(system)))
  }

  private func filled(_ hosted: HostedView<some View>, _ x: CGFloat, y: CGFloat = 40) -> Bool {
    hosted.color(at: CGPoint(x: Snapshot.inset + x, y: Snapshot.inset + y))?.isClose(to: fill) == true
  }

  /// CRL-1 — a click activates the item under it exactly once; CRL-4 — a click in the half gap beside an item activates
  /// that item.
  @Test("CRL-1 CRL-4 a click fires the item's action once; a click in the half gap beside it too")
  func click() {
    var fired: [Int] = []
    let actions: [@MainActor () -> Void] = (0..<6).map { index in { fired.append(index) } }
    let view = hosted(carousel(actions: actions))
    let y = Snapshot.inset + 100
    view.click(at: CGPoint(x: Snapshot.inset + 100, y: y))
    #expect(fired == [0])
    view.click(at: CGPoint(x: Snapshot.inset + 274, y: y))
    #expect(fired == [0, 1])
    // 2 points right of the small item's left edge (333.33) is the item; 2 points left of it is the half gap before it,
    // which is the small item's too (the medium one's half gap ends at 329.33).
    view.click(at: CGPoint(x: Snapshot.inset + 331.5, y: y))
    #expect(fired == [0, 1, 2])
    view.click(at: CGPoint(x: Snapshot.inset + 327.5, y: y))
    #expect(fired == [0, 1, 2, 1])
  }

  /// CRL-5 — a quick click shows the pressed state at once and keeps it after the release; CRL-1 — one activation.
  @Test("CRL-5 CRL-1 a quick click shows the pressed state at once and keeps it after the release")
  func quickClickIsHeld() throws {
    var system = TanreiSystem.tanrei
    system.motion.duration.pressHold = 1500
    system.carousel.motionStateDuration = 0
    system.carousel.parts.item.pressed.stateLayerColor = .role(.error)
    system.carousel.parts.item.hovered.stateLayerColor = .role(.error)
    system.state.pressedStateLayerOpacity = 1
    system.state.hoverStateLayerOpacity = 0
    let colors = system.colors.light
    var fired = 0
    let view = hosted(carousel(actions: Array(repeating: { fired += 1 }, count: 6)), system: system)
    let point = CGPoint(x: Snapshot.inset + 100, y: Snapshot.inset + 100)
    view.hover(at: point)
    view.mouse(.leftMouseDown, at: point)
    view.settle()
    #expect(try #require(view.color(at: point)).isClose(to: colors[.error].rgba8()))
    view.mouse(.leftMouseUp, at: point)
    view.settle()
    #expect(try #require(view.color(at: point)).isClose(to: colors[.error].rgba8()))
    #expect(fired == 1)
  }

  /// CRL-12 end to end — scrolled by half a position (104 of 208), the items are where the verify note puts them:
  /// 125.33 wide at −33.33, 150.67 at 104, 76 at 262.67, 50.67 at 350.67 (from the inner start edge, 16 in).
  @Test("CRL-12 scrolled half a position, the items are the verify note's")
  func scrolledHalfAPosition() async {
    let view = hosted(carousel())
    #expect(view.scroll(toX: 104))
    _ = await view.wait(atMost: 2) { !self.filled(view, 114) }
    // Item 0 ends at 108 and item 1 starts at 120; item 1 ends at 270.67 and item 2 starts at 278.67; item 2 ends at 354.67
    // and item 3 starts at 366.67 and runs past the edge.
    #expect(filled(view, 105) && !filled(view, 114) && filled(view, 123))
    #expect(filled(view, 268) && !filled(view, 274.5) && filled(view, 281))
    #expect(filled(view, 352) && !filled(view, 360.5) && filled(view, 369) && filled(view, 398))
    #expect(view.scrolledX() == 104)
  }

  /// CRL-13 end to end — uncontained scrolled to the end of its range: the last item ends at the inner end edge.
  @Test("CRL-13 uncontained scrolls to where the last item ends at the inner end edge")
  func uncontainedEnd() async {
    let view = hosted(carousel(5, layout: .uncontained))
    let range: CGFloat = 5 * 200 + 4 * 8 - 368
    view.scroll(toX: range)
    _ = await view.wait(atMost: 2) { view.scrolledX() == range }
    #expect(view.scrolledX() == range)
    #expect(filled(view, 382) && !filled(view, 388))
  }

  /// CRL-21 — a new width, then new items, keep the item at slot 0 where it was, at once.
  @Test("CRL-21 a new width or new items keep the item at slot 0 where it was")
  func keepsItemInPlace() async {
    let model = CarouselModel()
    let view = hosted(ModelCarousel(model: model))
    view.scroll(toX: 416)
    _ = await view.wait(atMost: 2) { view.scrolledX() == 416 }
    model.width = 300
    // 300 wide: L 172, a step of 180 — "Lake shore" (index 2) stays at slot 0.
    #expect(await view.wait(atMost: 3) { view.scrolledX() == 360 })
    model.labels.removeFirst()
    // "Lake shore" is now the second item.
    #expect(await view.wait(atMost: 3) { view.scrolledX() == 180 })
  }

  /// CRL-23 end to end — right to left the row rests at its start, slot 0 at the right, and scrolling moves the items
  /// toward the right.
  @Test("CRL-23 right to left the row starts at the right and scrolls toward it")
  func rightToLeft() async {
    let view = hosted(carousel().environment(\.layoutDirection, .rightToLeft))
    let range: CGFloat = 1040
    _ = await view.wait(atMost: 2) { view.scrolledX() == range }
    #expect(view.scrolledX() == range)
    // The large item at 184 … 384, the medium one at 74.67 … 176.
    #expect(filled(view, 188) && filled(view, 380) && !filled(view, 180) && filled(view, 172) && !filled(view, 392))
    view.scroll(toX: range - 104)
    // Scrolled half a position: item 0 at 292 … 417.33 (cut at the edge), item 1 at 129.33 … 280.
    _ = await view.wait(atMost: 2) { !self.filled(view, 286) }
    #expect(filled(view, 295) && !filled(view, 286) && filled(view, 277))
  }
  #endif
}

// MARK: - Fixtures (one per spec fixture)

/// Draws a fixture of specs/carousel.spec.json as a product writes it (the harness note): a carousel 400 wide (its height
/// the token's) holding the fixture's items in order; layout, itemWidth and label apply to the carousel and each item's
/// label to that item. An item's content — a glyph name — is drawn centred in the content box at `sys.icon.large`,
/// unselected, as the SF Symbol a product would pass for it.
@MainActor
enum TanreiCarouselFixtures {
  static let symbols: [String: String] = [
    "landscape": "mountain.2", "forest": "tree", "water": "water.waves", "park": "leaf", "sunny": "sun.max", "filter_hdr": "flag",
  ]

  static let width: CGFloat = 400

  static func view(_ fixture: SpecFixture) -> some View {
    let items = fixture.items ?? []
    return TanreiCarousel(
      fixture.string("label") ?? "", layout: fixture.string("layout").map(TanreiCarouselLayout.init(named:)) ?? .multiBrowse,
      itemWidth: fixture.number("itemWidth").map { CGFloat($0) }
    ) {
      ForEach(items.indices, id: \.self) { index in
        TanreiCarouselItem(items[index].string("label") ?? "", action: {}) {
          FixtureGlyph(symbol: symbols[items[index].content ?? ""] ?? "questionmark")
        }
      }
    }
    .frame(width: width)
  }
}

/// A fixture item's content: the glyph at `sys.icon.large`, unselected, in the item's content color.
private struct FixtureGlyph: View {
  let symbol: String
  @Environment(\.tanreiSystem) private var system

  var body: some View {
    TanreiItemIconView(icon: .image(Image(systemName: symbol)), size: system.measure.iconLarge, selected: false)
  }
}

@MainActor
@Suite("TanreiCarousel snapshots")
struct TanreiCarouselSnapshotTests {
  /// Mirrors `fixtures` in specs/carousel.spec.json.
  nonisolated static let fixtures = ["multi-browse", "multi-browse-narrow-items", "hero", "uncontained"]

  static func fixture(_ id: String) throws -> SpecFixture {
    try #require(try SpecFixture.load(spec: "carousel").first { $0.id == id })
  }

  @Test("CRL-10 CRL-11 CRL-13 CRL-15 fixture matches its baseline", arguments: fixtures)
  func fixture(_ id: String) throws {
    try Snapshot.assert(TanreiCarouselFixtures.view(try Self.fixture(id)), named: id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    #expect(try SpecFixture.load(spec: "carousel").map(\.id) == Self.fixtures)
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiCarouselTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiCarousel preset snapshots")
struct TanreiCarouselPresetSnapshotTests {
  /// Multi-browse: the preset's item corners (m3-like's extra-large, cupertino's continuous large), fill and content color.
  nonisolated static let fixtureId = "multi-browse"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .m3ExpressiveLike, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiCarouselSnapshotTests.fixtures.contains(Self.fixtureId))
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try TanreiCarouselSnapshotTests.fixture(Self.fixtureId)
    try Snapshot.assert(TanreiCarouselFixtures.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}

