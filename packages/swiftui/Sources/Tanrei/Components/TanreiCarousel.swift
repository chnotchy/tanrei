import SwiftUI

// Spec: specs/carousel.spec.json — tokens: TanreiCarouselTokens (comp.carousel), read from the design system in the
// environment (`system.carousel`). Every design value in this file comes from a token; there are no literals, and no
// state's look is computed here. An item is pressed like Button: press, hold, ripple and focus ring are the
// shared primitives, and CRL-5, CRL-6 and CRL-7 are BTN-8, BTN-9 and BTN-10 for the item. The item kind `item`
// is `TanreiCarouselItem`.
//
// The carousel reads its items as data, as the tabs and the menu do: each `TanreiCarouselItem` puts its label, its action
// and its content into a trait of its own view, and the carousel draws every item itself, so the slots (CRL-10 – CRL-13),
// the Tab stop (CRL-17) and each item's place (CRL-12) are known on the first layout pass.
//
// The row is a horizontal `ScrollView` whose content is a track as long as the scroll range (the carousel's width plus the
// range); the items are placed on the track from the scroll offset by `TanreiCarouselGeometry`, the spec's arithmetic
// (the web's `carousel-geometry.ts`, ported), so that each item keeps its place in the view while the track scrolls under
// it. The scroll view and the track are laid out LEFT TO RIGHT in every layout direction and the carousel mirrors the
// geometry itself (CRL-23): offsets, the settle target and a scroll to an offset are then physical, whatever SwiftUI does
// with a right-to-left scroll view; each item's content gets the product's layout direction back.

// MARK: - Public API

/// How a carousel arranges its items (spec prop `layout`). A closed set: the layouts are geometry read from the same
/// tokens, not looks, so a design system adds none.
public enum TanreiCarouselLayout: String, CaseIterable, Sendable {
  /// As many large items as fit, then a medium and a small one that grow as they scroll toward the start: browsing many
  /// items (CRL-10).
  case multiBrowse = "multi-browse"
  /// One large item and a small one after it: one featured item at a time (CRL-11). `itemWidth` is ignored.
  case hero
  /// Every item the same width, the last one in view cut by the edge: a plain scrolling row (CRL-13).
  case uncontained

  /// The layout a spec value names, for UI built from data (`"multi-browse"`, `"hero"`, `"uncontained"`). CRL-24: any
  /// other name is `.multiBrowse`, the default, and is reported in debug builds (`TanreiDiagnostics`).
  public init(named name: String) {
    if let layout = TanreiCarouselLayout(rawValue: name) {
      self = layout
    } else {
      TanreiDiagnostics.report("Tanrei: a carousel has no layout \"\(name)\"; using \"multi-browse\" (CRL-24)")
      self = .multiBrowse
    }
  }
}

/// Lets people browse a row of visual items that scrolls sideways: several at a glance with the next ones shrinking toward
/// the edge (`.multiBrowse`), one featured item at a time (`.hero`), or a plain row cut at the edge (`.uncontained`), each
/// item opening what it shows.
///
///     TanreiCarousel("Recently played") {
///       ForEach(albums) { album in
///         TanreiCarouselItem(album.title, action: { open(album) }) {
///           Image(album.cover).resizable().scaledToFill()
///         }
///       }
///     }
///
/// `label` names the carousel's list for assistive technology and is required (CRL-19, CRL-20). `itemWidth` is the width
/// of a large item in points (multi-browse, uncontained); `nil` takes `comp.carousel.container.large-width`, and a value that
/// is not a positive number is treated as `nil` and reported in debug builds (CRL-24). The hero layout ignores it.
///
/// The carousel is as wide as its parent and `comp.carousel.layout.height` tall (at least the minimum target), and every
/// item is as tall as the carousel (CRL-8). It scrolls by touch, trackpad and wheel as a `ScrollView` does; multi-browse
/// and hero settle at a whole item when a scroll ends (CRL-14). It is one keyboard stop; the arrow keys, Home and End move
/// between items and bring the focused one into place (CRL-17, CRL-18).
public struct TanreiCarousel<Content: View>: View {
  private let label: String
  private let layout: TanreiCarouselLayout
  private let itemWidth: CGFloat?
  private let content: Content

  /// A carousel named by `label`, its items the `TanreiCarouselItem`s of `content`, in order.
  public init(_ label: String, layout: TanreiCarouselLayout = .multiBrowse, itemWidth: CGFloat? = nil, @ViewBuilder content: () -> Content) {
    self.label = label
    self.layout = layout
    self.itemWidth = TanreiCarouselRules.itemWidth(itemWidth)
    self.content = content()
    // CRL-20: still rendered, but a list without a name — reported in debug builds only.
    if label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      TanreiDiagnostics.report("Tanrei: a carousel's label is empty, so its list has no accessible name (CRL-20); give it a label (\"Recently played\")")
    }
  }

  public var body: some View {
    _VariadicView.Tree(TanreiCarouselRoot(label: label, layout: layout, itemWidth: itemWidth)) {
      content
    }
  }
}

/// One item of a `TanreiCarousel` (the spec's item kind `item`): the product's content in a rounded box, one action named
/// by its label.
///
///     TanreiCarouselItem("Coast path, 12 photos", action: { open(walk) }) {
///       Image(walk.photo).resizable().scaledToFill()
///     }
///
/// `label` is the item's accessible name: what its content shows. It is required; the content itself is not read (CRL-19,
/// CRL-20). `action` is the item's `click`: pointer, touch, Enter, Space or assistive technology (CRL-1).
///
/// The content is laid out at a large item's width and the carousel's height, centred and clipped to the item's corners, so
/// a narrower item shows its middle (CRL-15); it is handed `comp.carousel.item.content.color` as its foreground style
/// (CRL-16). **It must hold nothing interactive**: an item is one action (CRL-20). An item draws nothing where it is
/// written: the carousel draws it from what it reads.
public struct TanreiCarouselItem<Content: View>: View {
  let label: String
  let action: @MainActor () -> Void
  let content: Content

  public init(_ label: String, action: @escaping @MainActor () -> Void, @ViewBuilder content: () -> Content) {
    self.label = label
    self.action = action
    self.content = content()
    // CRL-20: still rendered, but an item without a name — reported in debug builds only.
    if label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      TanreiDiagnostics.report("Tanrei: a carousel item's label is empty, so it has no accessible name (CRL-20); give it a label that says what its content shows")
    }
  }

  public var body: some View {
    Color.clear
      .frame(width: .zero, height: .zero)
      .accessibilityHidden(true)
      ._trait(TanreiCarouselEntryKey.self, TanreiCarouselEntry(label: label, action: action, content: AnyView(content)))
  }
}

/// One item as the carousel reads it.
struct TanreiCarouselEntry {
  let label: String
  let action: @MainActor () -> Void
  let content: AnyView
}

struct TanreiCarouselEntryKey: _ViewTraitKey {
  static var defaultValue: TanreiCarouselEntry? { nil }
}

/// Reads the carousel's content — every item's trait, in order, with the identity SwiftUI gives it — and hands the items to
/// `TanreiCarouselView`.
private struct TanreiCarouselRoot: _VariadicView_UnaryViewRoot {
  let label: String
  let layout: TanreiCarouselLayout
  let itemWidth: CGFloat?

  func body(children: _VariadicView.Children) -> some View {
    let items = children.compactMap { child in child[TanreiCarouselEntryKey.self].map { TanreiCarouselView.Item(id: child.id, entry: $0) } }
    return TanreiCarouselView(items: items, label: label, layout: layout, itemWidth: itemWidth)
  }
}

// MARK: - The geometry, pure (CRL-8 – CRL-13)

/// Where the items of a carousel are for a width and a scroll offset (CRL-8 – CRL-13): the spec's arithmetic, the web's
/// `carousel-geometry.ts` ported. Every length is in points, in the row's inner coordinates — 0 is the inner start edge,
/// after `comp.carousel.layout.padding-inline` — and along the reading direction. Nothing is rounded (CRL-10).
struct TanreiCarouselGeometry: Equatable, Sendable {
  /// One item as drawn: its start (inner coordinates) and its width.
  struct Box: Equatable, Sendable {
    var start: CGFloat
    var width: CGFloat
  }

  /// Slack for the whole-number search of CRL-10, so that a width that fits exactly is not lost to rounding.
  static let epsilon: CGFloat = 1e-9
  /// A position within this of a whole one counts as whole (a scroll offset is stored in device pixels).
  static let wholeSlack: CGFloat = 1e-3

  /// The carousel's width.
  let width: CGFloat
  /// W, the inner width.
  let inner: CGFloat
  let padding: CGFloat
  let gap: CGFloat
  /// The widths of slots 0 … K − 1 (empty for uncontained).
  let slots: [CGFloat]
  /// Where each slot starts.
  let starts: [CGFloat]
  /// n, the number of large slots (1 for hero and the one-slot row).
  let large: Int
  /// The width every item's content is laid out at (CRL-15): the large slot's.
  let content: CGFloat
  /// Whether the row places items by the scroll position p and settles at a whole one (multi-browse, hero, CRL-9's row).
  let snaps: Bool
  /// N, the number of items.
  let count: Int

  /// - Parameters: `largeWidth` is L — `itemWidth`, or `comp.carousel.container.large-width` while it is `nil` (CRL-9).
  init(width: CGFloat, padding: CGFloat, gap g: CGFloat, largeWidth: CGFloat, smallMin: CGFloat, smallMax: CGFloat, layout: TanreiCarouselLayout, count: Int) {
    let w = max(.zero, width - 2 * padding)
    self.width = width
    inner = w
    self.padding = padding
    gap = g
    self.count = count
    var slots: [CGFloat]
    var large = 1
    var content: CGFloat
    var snaps = true
    if w < 3 * smallMin + 2 * g {
      // CRL-9: too narrow for a small slot — every item W wide, in every layout, as the hero layout's one slot.
      slots = [w]
      content = w
    } else {
      switch layout {
      case .hero:
        // CRL-11: one large slot and, g after it, one small slot of the greatest small width; itemWidth is ignored.
        slots = [w - g - smallMax, smallMax]
        content = w - g - smallMax
      case .uncontained:
        // CRL-9, CRL-13: every item L wide (at most W), no slots.
        slots = []
        content = min(largeWidth, w)
        snaps = false
      case .multiBrowse:
        // CRL-9, CRL-10: n large slots, one medium and one small, filling W exactly.
        let room = w - 2 * (smallMin + g)
        let l = min(largeWidth, room)
        large = max(1, Int(((room + Self.epsilon) / (l + g)).rounded(.down)))
        let r = w - CGFloat(large) * (l + g)
        var s = min(max((r - g) / 3, smallMin), smallMax)
        var m = r - g - s
        if m > l {
          m = l
          s = r - g - l
        }
        slots = Array(repeating: l, count: large) + [m, s]
        content = l
      }
    }
    var starts: [CGFloat] = []
    var at: CGFloat = .zero
    for slot in slots {
      starts.append(at)
      at += slot + g
    }
    self.slots = slots
    self.starts = starts
    self.large = large
    self.content = content
    self.snaps = snaps
  }

  /// The geometry of a carousel `width` wide from its tokens (CRL-8 – CRL-11): `itemWidth` is already a positive number or
  /// `nil` (CRL-24).
  init(tokens: TanreiCarouselTokens, width: CGFloat, itemWidth: CGFloat?, layout: TanreiCarouselLayout, count: Int) {
    self.init(
      width: width, padding: tokens.layoutPaddingInline, gap: tokens.layoutGap, largeWidth: itemWidth ?? tokens.containerLargeWidth,
      smallMin: tokens.containerSmallMinWidth, smallMax: tokens.containerSmallMaxWidth, layout: layout, count: count)
  }

  /// How far the row scrolls for one position: the large slot plus the gap (CRL-12), or one item and the gap (uncontained).
  var step: CGFloat { content + gap }

  /// The greatest p (CRL-12): the greater of 0 and N − n.
  var maxPosition: Int { max(0, count - large) }

  /// The scroll range: CRL-12's step times the greatest p, or CRL-13's distance to the last item ending at the inner end
  /// edge.
  var range: CGFloat {
    if snaps { return CGFloat(maxPosition) * step }
    return max(.zero, CGFloat(count) * content + CGFloat(max(0, count - 1)) * gap - inner)
  }

  /// The scroll position p for a scroll offset (CRL-12): clamped to the range, and whole when it is within a hair of it.
  func position(_ offset: CGFloat) -> CGFloat {
    guard step > 0 else { return .zero }
    let p = min(max(offset / step, .zero), CGFloat(maxPosition))
    let whole = p.rounded()
    return abs(p - whole) < Self.wholeSlack ? whole : p
  }

  /// Slot `k`'s start and width, for k from −1 to K (CRL-12): the slots beyond the ends are as wide as slot K − 1.
  func slot(_ k: Int) -> Box {
    let last = slots.count - 1
    if k < 0 { return Box(start: -padding - slots[last], width: slots[last]) }
    if k > last { return Box(start: inner + padding, width: slots[last]) }
    return Box(start: starts[k], width: slots[k])
  }

  /// Item `index` at scroll offset `offset` (CRL-12, CRL-13). An item beyond slot −1 or slot K is out of view: it keeps the
  /// width of those slots and goes on at the same pitch, past the carousel's edges, where it is clipped.
  func item(_ index: Int, offset: CGFloat) -> Box {
    if !snaps { return Box(start: CGFloat(index) * step - offset, width: content) }
    let k = slots.count
    let s = CGFloat(index) - position(offset)
    if s <= -1 {
      let edge = slot(-1)
      return Box(start: edge.start + (s + 1) * (edge.width + gap), width: edge.width)
    }
    if s >= CGFloat(k) {
      let edge = slot(k)
      return Box(start: edge.start + (s - CGFloat(k)) * (edge.width + gap), width: edge.width)
    }
    let at = Int(s.rounded(.down))
    let f = s - CGFloat(at)
    let (a, b) = (slot(at), slot(at + 1))
    return Box(start: a.start + (b.start - a.start) * f, width: a.width + (b.width - a.width) * f)
  }

  /// CRL-17: the item at slot 0 (a row that settles), or the first item wholly in view (uncontained).
  func restingIndex(_ offset: CGFloat) -> Int {
    guard count > 0 else { return 0 }
    if snaps { return min(max(Int(position(offset).rounded()), 0), count - 1) }
    let half: CGFloat = 0.5
    for index in 0..<count {
      let box = item(index, offset: offset)
      if box.start >= -padding - half && box.start + box.width <= inner + padding + half { return index }
    }
    return min(max(Int((offset / step).rounded(.down)), 0), count - 1)
  }

  /// CRL-18: the offset that brings item `index` into place — slot 0, or as near as the range allows (a row that settles),
  /// or wholly between the inner edges with the least scroll (uncontained).
  func revealOffset(_ index: Int, offset: CGFloat) -> CGFloat {
    if snaps { return CGFloat(min(max(index, 0), maxPosition)) * step }
    let box = item(index, offset: offset)
    var target = offset
    if box.start < 0 {
      target = offset + box.start
    } else if box.start + box.width > inner {
      target = offset + box.start + box.width - inner
    }
    return min(max(target, .zero), range)
  }

  /// CRL-14: where a row that settles comes to rest from `offset`: the next whole position in the direction of a fling
  /// (`direction` 1 toward the end, −1 toward the start), or else the nearest one.
  func settleOffset(_ offset: CGFloat, direction: Int) -> CGFloat {
    let p = position(offset)
    let target: CGFloat
    if direction > 0 {
      target = (p - Self.wholeSlack).rounded(.up)
    } else if direction < 0 {
      target = (p + Self.wholeSlack).rounded(.down)
    } else {
      target = p.rounded()
    }
    return min(max(target, .zero), CGFloat(maxPosition)) * step
  }

  /// Whether `offset` rests at a whole position (a row that settles).
  func isWhole(_ offset: CGFloat) -> Bool {
    guard step > 0 else { return true }
    let p = offset / step
    return abs(p - p.rounded()) < Self.wholeSlack
  }
}

// MARK: - The rules, pure

/// The rules of a carousel that are not geometry, pure, so they are tested without a keyboard or a render.
enum TanreiCarouselRules {
  /// CRL-14: a release at least this fast is a fling, in points per millisecond. SwiftUI names no minimum fling velocity of
  /// its own, so the spec's 0.5. A behaviour of the spec, not a design value.
  static let flingVelocity: CGFloat = 0.5

  /// CRL-24: `itemWidth` while it is a positive number, else `nil` — reported in debug builds.
  static func itemWidth(_ width: CGFloat?) -> CGFloat? {
    guard let width else { return nil }
    guard width.isFinite, width > 0 else {
      TanreiDiagnostics.report("Tanrei: a carousel's itemWidth \(width) is not a positive number of points; comp.carousel.container.large-width is used instead (CRL-24)")
      return nil
    }
    return width
  }

  /// CRL-14: the direction of a release `velocity` along the reading direction (points per millisecond; positive toward the
  /// end): 1 or −1 for a fling, 0 for a release slower than `flingVelocity`.
  static func flingDirection(_ velocity: CGFloat) -> Int {
    guard abs(velocity) >= flingVelocity else { return 0 }
    return velocity > 0 ? 1 : -1
  }

  /// The keys the carousel hears from a focused item.
  static let keys: Set<KeyEquivalent> = [.leftArrow, .rightArrow, .home, .end]

  /// CRL-17, CRL-23: Right Arrow is the next item and Left Arrow the previous one — mirrored right to left —, Home and End
  /// the ends; as `TanreiRovingKeys` moves (down = next).
  static func movement(for key: KeyEquivalent, layoutDirection: LayoutDirection) -> KeyEquivalent? {
    let forward: KeyEquivalent = layoutDirection == .rightToLeft ? .leftArrow : .rightArrow
    let backward: KeyEquivalent = layoutDirection == .rightToLeft ? .rightArrow : .leftArrow
    switch key {
    case forward: return .downArrow
    case backward: return .upArrow
    case .home: return .home
    case .end: return .end
    default: return nil
    }
  }

  /// CRL-17: where `key` moves focus from item `index` of `count` — the next or previous item without wrapping, or the first
  /// or last. `nil` when it is not one of the carousel's keys or there is no item.
  static func target(for key: KeyEquivalent, from index: Int?, count: Int, layoutDirection: LayoutDirection) -> Int? {
    guard let movement = movement(for: key, layoutDirection: layoutDirection) else { return nil }
    let items = Array(repeating: TanreiRovingItem(focusable: true, label: ""), count: count)
    return TanreiRovingKeys(wraps: false).target(for: movement, from: index, in: items)
  }

  /// CRL-17: the one Tab stop — the item that last had keyboard focus while it is still an item, or else the item at slot 0
  /// (multi-browse, hero) or the first wholly in view (uncontained). `nil` without items.
  static func tabStop(remembered: Int?, geometry: TanreiCarouselGeometry, offset: CGFloat) -> Int? {
    guard geometry.count > 0 else { return nil }
    if let remembered, remembered >= 0, remembered < geometry.count { return remembered }
    return geometry.restingIndex(offset)
  }

  /// CRL-21: the offset that keeps the item that was in place — at slot 0, or first in view — where it was after the
  /// carousel's width or its items changed, as far as the new range allows. `anchor` is where that item now is among the
  /// items (`nil`: it is gone, and the item now at its old index takes its place).
  static func keptOffset(before: TanreiCarouselGeometry, offset: CGFloat, anchor: Int?, next: TanreiCarouselGeometry) -> CGFloat {
    let index = before.restingIndex(offset)
    let at = anchor ?? min(index, max(0, next.count - 1))
    let fraction = before.snaps ? before.position(offset) - CGFloat(index) : .zero
    let start = before.snaps ? .zero : before.item(index, offset: offset).start
    let target = next.snaps ? (CGFloat(at) + fraction) * next.step : CGFloat(at) * next.step - start
    return min(max(target, .zero), next.range)
  }

  /// CRL-23: the scroll offset along the reading direction from the physical one (the scroll view is laid out left to
  /// right), and back: right to left, offset 0 is the track's right end.
  static func logical(_ physical: CGFloat, range: CGFloat, rightToLeft: Bool) -> CGFloat {
    rightToLeft ? range - physical : physical
  }

  static func physical(_ logical: CGFloat, range: CGFloat, rightToLeft: Bool) -> CGFloat {
    rightToLeft ? range - logical : logical
  }

  /// CRL-8, CRL-12, CRL-23: where item box `box` (inner coordinates, at `offset`) lies on the track, from the track's LEFT
  /// edge: `padding` in from the view's start edge, carried with the scroll, mirrored right to left.
  static func trackX(of box: TanreiCarouselGeometry.Box, geometry: TanreiCarouselGeometry, offset: CGFloat, rightToLeft: Bool) -> CGFloat {
    let start = offset + geometry.padding + box.start
    return rightToLeft ? geometry.width + geometry.range - start - box.width : start
  }

  /// CRL-4: an item's hit area — its container and half the gap on each side, and never below `minimum` — centred on it.
  static func hitWidth(itemWidth: CGFloat, gap: CGFloat, minimum: CGFloat) -> CGFloat {
    max(itemWidth + gap, minimum)
  }
}

// MARK: - The carousel

/// The row: the geometry for the carousel's width, the scroll view and its track, the settle (CRL-14), the keyboard
/// (CRL-17), the scroll into place (CRL-18), a change of width or items (CRL-21) and the list's semantics (CRL-19).
struct TanreiCarouselView: View {
  struct Item {
    let id: AnyHashable
    let entry: TanreiCarouselEntry
  }

  let items: [Item]
  let label: String
  let layout: TanreiCarouselLayout
  let itemWidth: CGFloat?

  @Environment(\.tanreiSystem) private var system

  var body: some View {
    let tokens = system.carousel
    // CRL-8: the carousel's height; CRL-4: never below the target. CRL-25: text size changes neither.
    let height = max(tokens.layoutHeight, TanreiHitTarget.minimum(in: system.measure))
    GeometryReader { proxy in
      let geometry = TanreiCarouselGeometry(tokens: tokens, width: proxy.size.width, itemWidth: itemWidth, layout: layout, count: items.count)
      TanreiCarouselRow(items: items, geometry: geometry, height: height)
    }
    .frame(height: height)
    // CRL-19: a list named by label. SwiftUI has no list role for a custom container; its items are its elements, in order.
    .accessibilityElement(children: .contain)
    .accessibilityLabel(Text(verbatim: label))
  }
}

/// The name of the track in the carousel's scroll view: `scrollTo` aims at it with a unit anchor to reach any offset.
private enum TanreiCarouselTrackID: Hashable {
  case track
}

/// The row for one geometry: the scroll view (or, in snapshots, the track at rest) and what moves it.
private struct TanreiCarouselRow: View {
  let items: [TanreiCarouselView.Item]
  let geometry: TanreiCarouselGeometry
  let height: CGFloat

  @Environment(\.tanreiSystem) private var system
  @Environment(\.layoutDirection) private var layoutDirection
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.tanreiScrollsInPlace) private var inPlace
  @FocusState private var focused: Int?
  @AccessibilityFocusState private var spoken: Int?
  /// The physical scroll offset, as the scroll view last reported it; `nil` before it has (at rest).
  @State private var physical: CGFloat?
  /// CRL-17: the item that last had keyboard focus, by identity.
  @State private var remembered: AnyHashable?

  private static let space = "tanrei.carousel"

  private var rightToLeft: Bool { layoutDirection == .rightToLeft }

  /// The scroll offset along the reading direction.
  private var offset: CGFloat {
    guard let physical else { return .zero }
    return min(max(TanreiCarouselRules.logical(physical, range: geometry.range, rightToLeft: rightToLeft), .zero), geometry.range)
  }

  private var rememberedIndex: Int? {
    remembered.flatMap { id in items.firstIndex { $0.id == id } }
  }

  var body: some View {
    if inPlace {
      // Snapshots: the track at rest (offset 0), clipped to the carousel — `ImageRenderer` draws a scroll view as nothing.
      track(offset: .zero, tabStop: nil)
        .offset(x: -TanreiCarouselRules.physical(.zero, range: geometry.range, rightToLeft: rightToLeft))
        .frame(width: geometry.width, height: height, alignment: .leading)
        .clipped()
        .environment(\.layoutDirection, .leftToRight)
    } else {
      scroller
    }
  }

  private var scroller: some View {
    let offset = self.offset
    let tabStop = TanreiCarouselRules.tabStop(remembered: rememberedIndex, geometry: geometry, offset: offset)
    let key = TanreiCarouselArrangement(geometry: geometry, ids: items.map(\.id), rightToLeft: rightToLeft)
    return ScrollViewReader { proxy in
      ScrollView(.horizontal, showsIndicators: false) {
        track(offset: offset, tabStop: tabStop)
          .id(TanreiCarouselTrackID.track)
          // CRL-12: the offset the items are placed from, as the person scrolls.
          .onGeometryChange(for: CGFloat.self) { proxy in -proxy.frame(in: .named(Self.space)).minX } action: { physical = $0 }
      }
      .coordinateSpace(.named(Self.space))
      // CRL-14: multi-browse and hero settle at a whole position; uncontained scrolls freely (CRL-13).
      .scrollTargetBehavior(TanreiCarouselSettle(geometry: geometry, offset: offset, rightToLeft: rightToLeft))
      // CRL-13: a row whose items fit does not scroll.
      .scrollBounceBehavior(.basedOnSize, axes: .horizontal)
      // CRL-23: at rest the row shows its start — the track's right end, right to left.
      .defaultScrollAnchor(rightToLeft ? .trailing : .leading)
      .environment(\.layoutDirection, .leftToRight)
      // CRL-17, CRL-18: keyboard focus makes the item the Tab stop and brings it into place.
      .onChange(of: focused) { _, now in
        guard let now, items.indices.contains(now) else { return }
        remembered = items[now].id
        scroll(proxy, to: geometry.revealOffset(now, offset: self.offset), animated: true)
      }
      // CRL-18: assistive-technology focus brings the item into place too.
      .onChange(of: spoken) { _, now in
        guard let now, items.indices.contains(now) else { return }
        scroll(proxy, to: geometry.revealOffset(now, offset: self.offset), animated: true)
      }
      // CRL-21: a new width, new items or a new layout keep the item in place where it was, without motion.
      .onChange(of: key) { before, next in
        guard physical != nil, before.geometry.count > 0 else { return }
        let offset = min(max(TanreiCarouselRules.logical(physical ?? .zero, range: before.geometry.range, rightToLeft: before.rightToLeft), .zero), before.geometry.range)
        let anchorId = before.ids.indices.contains(before.geometry.restingIndex(offset)) ? before.ids[before.geometry.restingIndex(offset)] : nil
        let anchor = anchorId.flatMap { id in next.ids.firstIndex(of: id) }
        let kept = TanreiCarouselRules.keptOffset(before: before.geometry, offset: offset, anchor: anchor, next: next.geometry)
        physical = TanreiCarouselRules.physical(kept, range: next.geometry.range, rightToLeft: next.rightToLeft)
        scroll(proxy, to: kept, animated: false)
      }
    }
  }

  /// Scrolls to the reading-direction offset `logical` — over `comp.carousel.motion.scroll-*`, or at once where motion is
  /// reduced or `animated` is false. A unit anchor on the whole track reaches any offset: its point at x aligns with the
  /// view's point at x, which scrolls x × the range.
  private func scroll(_ proxy: ScrollViewProxy, to logical: CGFloat, animated: Bool) {
    let range = geometry.range
    guard range > 0 else { return }
    let target = TanreiCarouselRules.physical(min(max(logical, .zero), range), range: range, rightToLeft: rightToLeft)
    let motion = animated ? system.carousel.scrollMotion(reduceMotion: reduceMotion) : nil
    var transaction = Transaction(animation: motion)
    transaction.disablesAnimations = motion == nil
    withTransaction(transaction) {
      proxy.scrollTo(TanreiCarouselTrackID.track, anchor: UnitPoint(x: target / range, y: .zero))
    }
  }

  /// The track: as wide as the carousel plus the scroll range, every item placed on it for `offset` (CRL-12, CRL-13).
  private func track(offset: CGFloat, tabStop: Int?) -> some View {
    let minimum = TanreiHitTarget.minimum(in: system.measure)
    let boxes = items.indices.map { geometry.item($0, offset: offset) }
    let frames = boxes.map { box in
      let hit = TanreiCarouselRules.hitWidth(itemWidth: box.width, gap: geometry.gap, minimum: minimum)
      let x = TanreiCarouselRules.trackX(of: box, geometry: geometry, offset: offset, rightToLeft: rightToLeft)
      return CGRect(x: x - (hit - box.width) / 2, y: .zero, width: hit, height: height)
    }
    return TanreiCarouselTrack(size: CGSize(width: geometry.width + geometry.range, height: height), frames: frames) {
      ForEach(Array(items.enumerated()), id: \.element.id) { index, _ in
        item(index, width: boxes[index].width, isTabStop: index == tabStop)
      }
    }
  }

  private func item(_ index: Int, width: CGFloat, isTabStop: Bool) -> some View {
    let entry = items[index].entry
    return TanreiCarouselItemButton(
      entry: entry, width: width, contentWidth: geometry.content, height: height, isKeyboardFocused: focused == index,
      contentDirection: layoutDirection
    )
    .focused($focused, equals: index)
    // CRL-18: assistive-technology focus is watched in the scroll view only: `ImageRenderer` draws a view that carries
    // `accessibilityFocused` as nothing (macOS 26), and a snapshot has no assistive technology.
    .modifier(TanreiCarouselSpokenFocus(isWatched: !inPlace, spoken: $spoken, index: index))
    // CRL-17: one Tab stop.
    .focusable(isTabStop)
    // CRL-17: the arrows (without wrapping, mirrored right to left), Home and End move focus.
    .onKeyPress(keys: TanreiCarouselRules.keys, phases: .down) { press in
      guard let target = TanreiCarouselRules.target(for: press.key, from: index, count: items.count, layoutDirection: layoutDirection) else {
        return .ignored
      }
      if target != index { Task { @MainActor in focused = target } }
      return .handled
    }
  }
}

/// CRL-18: binds an item to the carousel's assistive-technology focus, where it is watched.
private struct TanreiCarouselSpokenFocus: ViewModifier {
  let isWatched: Bool
  let spoken: AccessibilityFocusState<Int?>.Binding
  let index: Int

  func body(content: Content) -> some View {
    if isWatched { content.accessibilityFocused(spoken, equals: index) } else { content }
  }
}

/// What a change of which rearranges the carousel without motion (CRL-21): its geometry, its items and its direction.
private struct TanreiCarouselArrangement: Equatable {
  let geometry: TanreiCarouselGeometry
  let ids: [AnyHashable]
  let rightToLeft: Bool
}

/// The track: a fixed size, each subview at its frame (from the track's left edge; the carousel lays it out left to right).
/// Stateless, so it is right on the first layout pass.
struct TanreiCarouselTrack: Layout {
  let size: CGSize
  let frames: [CGRect]

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    size
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    for (subview, frame) in zip(subviews, frames) {
      subview.place(at: CGPoint(x: bounds.minX + frame.minX, y: bounds.minY + frame.minY), anchor: .topLeading, proposal: ProposedViewSize(frame.size))
    }
  }
}

/// CRL-14: a scroll that ends settles multi-browse and hero at a whole position — the next one in the direction of a fling,
/// or else the nearest one to where it was released. A target that is already whole is the carousel's own scroll (CRL-18,
/// CRL-21) and is kept. The motion of the settle is the scroll view's.
private struct TanreiCarouselSettle: ScrollTargetBehavior {
  let geometry: TanreiCarouselGeometry
  /// The reading-direction offset when the behaviour was last updated: where the person let go.
  let offset: CGFloat
  let rightToLeft: Bool

  func updateTarget(_ target: inout ScrollTarget, context: TargetContext) {
    guard geometry.snaps, geometry.range > 0 else { return }
    let range = geometry.range
    let proposed = TanreiCarouselRules.logical(target.rect.minX, range: range, rightToLeft: rightToLeft)
    if geometry.isWhole(proposed) && context.velocity == .zero { return }
    // UIKit's release velocity is in points per millisecond, positive toward the physical right.
    let velocity = rightToLeft ? -context.velocity.dx : context.velocity.dx
    let settled = geometry.settleOffset(offset, direction: TanreiCarouselRules.flingDirection(velocity))
    target.rect.origin.x = TanreiCarouselRules.physical(settled, range: range, rightToLeft: rightToLeft)
  }
}

// MARK: - One item

/// One item: a button drawn by `TanreiCarouselItemStyle`, activated by pointer, touch, Enter and Space.
private struct TanreiCarouselItemButton: View {
  let entry: TanreiCarouselEntry
  let width: CGFloat
  let contentWidth: CGFloat
  let height: CGFloat
  let isKeyboardFocused: Bool
  let contentDirection: LayoutDirection

  /// Counts activations by key: each one starts a press that no pointer held down (CRL-5).
  @State private var keyboardPresses = 0

  var body: some View {
    Button(action: entry.action) { entry.content }
      .buttonStyle(
        TanreiCarouselItemStyle(
          width: width, contentWidth: contentWidth, height: height, isFocused: isKeyboardFocused, keyboardPresses: keyboardPresses,
          contentDirection: contentDirection))
      // Tanrei draws its own ring (CRL-3); the system focus effect would double it.
      .focusEffectDisabled()
      // CRL-1, CRL-5: Enter and Space activate, once per key press, and show the press from the center.
      .tanreiKeyActivation(isEnabled: true) {
        keyboardPresses += 1
        entry.action()
      }
      // CRL-19: one button named by its label; its content is not read.
      .accessibilityLabel(Text(verbatim: entry.label))
  }
}

struct TanreiCarouselItemStyle: ButtonStyle {
  let width: CGFloat
  let contentWidth: CGFloat
  let height: CGFloat
  let isFocused: Bool
  var keyboardPresses = 0
  var contentDirection: LayoutDirection = .leftToRight

  func makeBody(configuration: Configuration) -> some View {
    TanreiCarouselItemChrome(
      width: width, contentWidth: contentWidth, height: height, isPressed: configuration.isPressed, isFocused: isFocused,
      keyboardPresses: keyboardPresses, contentDirection: contentDirection
    ) {
      configuration.label
    }
  }
}

/// The visual of one item: the resting fill, the content at the large width, centred and clipped (CRL-15), the state layer
/// and the ripple over the content (CRL-16), the corners of its state (CRL-7), the state's opacity on the whole item, the
/// focus ring inside it (CRL-3), and around it the hit area (CRL-4) — all drawn from the one resolved state.
struct TanreiCarouselItemChrome<Content: View>: View {
  /// The drawn item's width (CRL-12); the chrome itself is the hit area, as wide as its frame.
  let width: CGFloat
  /// CRL-15: the width the content is laid out at.
  let contentWidth: CGFloat
  let height: CGFloat
  let isPressed: Bool
  /// Keyboard focus: SwiftUI never moves focus to a button on a click or tap (CRL-2, CRL-3).
  let isFocused: Bool
  var keyboardPresses = 0
  /// The product's layout direction, handed back to the content (the row is laid out left to right, CRL-23).
  var contentDirection: LayoutDirection = .leftToRight
  @ViewBuilder let content: Content

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    let feedback = theme.system.behavior.pressedFeedback
    // CRL-5: a press stays visible at least `duration.press-hold`; CRL-6: the point of contact only under `ripple`, on the
    // drawn item — a press in the gap beside it grows from its center.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyboardPresses, watchesContact: feedback == .ripple, contactArea: .part) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let system = theme.system
    let tokens = system.carousel
    // CRL-2: exactly one state — pressed > focused > hovered.
    let state = TanreiInteraction.resolve(isEnabled: true, isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isEnabled: true, isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let appearance = TanreiCarouselItemAppearance(tokens: tokens, state: state, feedback: feedback, beneath: beneath, layers: system.state)
    let stateMotion = tokens.stateMotion(reduceMotion: reduceMotion)
    let shape = RoundedRectangle(cornerRadius: appearance.cornerRadius, style: system.shape.roundedCornerStyle)
    let ring = TanreiFocusRingMetrics(containerCornerRadius: appearance.cornerRadius, measure: system.measure)
    let inset = max(.zero, ring.outerOutset)

    return ZStack {
      // CRL-16: the resting fill, under the content.
      Rectangle().fill(colors[appearance.container])
      // CRL-15: the content at the large width and the full height, centred on the item (a narrower item shows its
      // middle); CRL-16: handed the content color; CRL-19: not read; CRL-23: in the product's direction, not mirrored.
      Color.clear
        .overlay {
          content
            .frame(width: contentWidth, height: height)
            .foregroundStyle(colors[appearance.content])
            .environment(\.layoutDirection, contentDirection)
            .accessibilityHidden(true)
        }
      // CRL-16: the state layer over the content, so hover, focus and press show on any content.
      Rectangle().fill(colors[appearance.stateLayer])
        .allowsHitTesting(false)
      // CRL-6 ripple: the pressed layer, in the same layer, from the point of contact.
      if let ripple = appearance.ripple {
        TanreiRipple(
          origin: press.contact, color: colors[ripple], animation: tokens.rippleGrowth(reduceMotion: reduceMotion), startsGrown: !press.hasBegun
        )
        .id(press.generation)
        .transition(.opacity)
        .allowsHitTesting(false)
      }
    }
    .frame(width: width, height: height)
    // CRL-15: clipped to the corners of the state; CRL-7: eased by the corner smoothing.
    .clipShape(shape)
    .tanreiContactArea()
    // CRL-6 dim: the state's opacity on the whole item, flattened first.
    .compositingGroup()
    .opacity(appearance.opacity)
    // CRL-22: the colors, opacity and shape of a new state over the state motion (at once under Reduce Motion).
    .animation(stateMotion, value: state)
    .animation(stateMotion, value: appearance.ripple == nil)
    .onHover { isHovered = $0 }
    // CRL-3: the ring inside the item's container, which the row would otherwise clip — keyboard focus only, never
    // animated, never dimmed.
    .overlay {
      Color.clear
        .tanreiFocusRing(isFocused, cornerRadius: max(.zero, appearance.cornerRadius - inset))
        .padding(inset)
    }
    // CRL-4: the hit area — the item and half the gap on each side, at least the target — around the drawn item.
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .contentShape(Rectangle())
  }
}

// MARK: - Token bindings

extension TanreiCarouselTokens {
  /// How the CRL-6 ripple grows: over `comp.carousel.motion.feedback-duration`, with the state easing. `nil` under Reduce
  /// Motion — the layer appears whole.
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// CRL-22: a change of state over the state motion; `nil` under Reduce Motion.
  func stateMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionStateDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// CRL-14, CRL-18: a scroll into place over the scroll motion; `nil` under Reduce Motion.
  func scrollMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionScrollDuration, easing: motionScrollEasing, reduceMotion: reduceMotion)
  }
}

extension TanreiState {
  /// CRL-16: `sys.state`'s state-layer opacity of `state`; `nil` where no layer is drawn (at rest).
  func carouselLayerOpacity(_ state: TanreiInteraction) -> Double? {
    switch state {
    case .hovered: return hoverStateLayerOpacity
    case .focused: return focusStateLayerOpacity
    case .pressed: return pressedStateLayerOpacity
    case .enabled, .disabled: return nil
    }
  }
}

/// Which token values an item draws in one state. Pure data read from a `TanreiCarouselTokens`, so the bindings can be
/// tested without rendering.
///
/// CRL-2 / CRL-6: the content color, opacity and shape come from the state `TanreiPressLayers` names for them (the pressed
/// state's under overlay, ripple and dim; the state beneath under none). CRL-16: the container is the resting fill only;
/// the state layer over the content is the `state-layer.color` of the state the container would take (the state beneath
/// under ripple and dim) at its `sys.state` opacity, and the ripple is the pressed one at the pressed opacity.
struct TanreiCarouselItemAppearance: Equatable {
  let container: TanreiPaint
  let content: TanreiPaint
  /// Over the content; `.none` at rest.
  let stateLayer: TanreiPaint
  /// CRL-6 `ripple`: grown from the point of contact over the state layer.
  let ripple: TanreiPaint?
  /// Opacity of the whole item.
  let opacity: Double
  let cornerRadius: CGFloat

  init(
    tokens: TanreiCarouselTokens, state: TanreiInteraction, feedback: TanreiPressedFeedback = .overlay, beneath: TanreiInteraction = .enabled,
    layers: TanreiState
  ) {
    let pressLayers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    let part = tokens.parts[.item]
    let rest = part.enabled
    container = rest.containerColor
    content = (part[state: pressLayers.state] ?? rest).contentColor
    let layerState = pressLayers.container
    if let amount = layers.carouselLayerOpacity(layerState) {
      stateLayer = .alpha(of: (part[state: layerState] ?? rest).stateLayerColor, amount: amount)
    } else {
      stateLayer = .none
    }
    ripple = pressLayers.ripple.flatMap { rippleState in
      layers.carouselLayerOpacity(rippleState).map { .alpha(of: (part[state: rippleState] ?? rest).stateLayerColor, amount: $0) }
    }
    // The vocabulary has no rest-state `opacity` token: an item at rest is not dimmed.
    opacity = tokens[state: pressLayers.state]?.opacity ?? TanreiIdentity.opacity
    cornerRadius = tokens[state: pressLayers.state]?.containerShape ?? tokens.containerShape
  }
}
