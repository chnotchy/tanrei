import AcmeFixture
import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/navigation-rail.spec.json. Each behavior id (NVR-n) is named next to the test that covers it; the parity
// checker requires every id to appear in this file. The rail's destinations are the navigation bar's (the shared
// destination primitive, TanreiNavigationBarTests): here every behavior is proven to reach the rail, drawn from the rail's
// own tokens. NVR-8, NVR-9 and NVR-10 are BTN-8, BTN-9 and BTN-10 for a destination. The fixtures render one rail 400 high
// (the web's stage) with no system insets.
//
// Icons: baselines render with `Snapshot.theme` (`fontFamilyPolicy: .system`), under which a `TanreiIconGlyph` draws
// nothing, so a fixture's glyph name draws the SF Symbol a product would pass for it — its `.fill` form on the selected
// destination, as a product using SF Symbols chooses the symbol of each state itself (`platform-symbol-sets`).
//
// Accessibility semantics (NVR-20): the macOS accessibility tree is not available to unit tests (packages/swiftui/AGENTS.md);
// what the rail hands SwiftUI is tested here as rules (names, position, badge description), and the tree as VoiceOver gets it
// in the Gallery's UI tests (`testNavigationRailSemanticsAndActivation`).

private let suiteName = "TanreiNavigationRailTests"

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

/// Whether `color` inks any pixel of `rect` (points, from the render's top-left, the inset included).
@MainActor
private func inks(_ bitmap: Bitmap, _ color: Bitmap.RGBA, in rect: CGRect, tolerance: Int = 40) -> Bool {
  stride(from: rect.minX, to: rect.maxX, by: 0.5).contains { x in
    stride(from: rect.minY, to: rect.maxY, by: 0.5).contains { pixel(bitmap, x: x, y: $0).isClose(to: color, tolerance: tolerance) }
  }
}

/// The first and last x (points) on row `y` whose pixel is `color`. (Searches for the indicator stop short of the rail's end
/// edge: outline-variant is close to secondary-container in the default system.)
@MainActor
private func horizontalExtent(
  _ bitmap: Bitmap, y: CGFloat, from: CGFloat, to: CGFloat, color: Bitmap.RGBA, tolerance: Int = 12
) -> (min: CGFloat, max: CGFloat)? {
  let xs = stride(from: from, to: to, by: 0.5).filter { pixel(bitmap, x: $0, y: y).isClose(to: color, tolerance: tolerance) }
  guard let first = xs.first, let last = xs.last else { return nil }
  return (first, last + 0.5)
}

/// The first and last y (points) on column `x` whose pixel is `color`.
@MainActor
private func verticalExtent(
  _ bitmap: Bitmap, x: CGFloat, from: CGFloat, to: CGFloat, color: Bitmap.RGBA, tolerance: Int = 12
) -> (min: CGFloat, max: CGFloat)? {
  let ys = stride(from: from, to: to, by: 0.5).filter { pixel(bitmap, x: x, y: $0).isClose(to: color, tolerance: tolerance) }
  guard let first = ys.first, let last = ys.last else { return nil }
  return (first, last + 0.5)
}

private let light = TanreiSystem.tanrei.colors.light
private let names = ["Inbox", "Sent", "Starred", "Settings"]
private let height: CGFloat = 400

/// A value outside any view — what a `Binding` in a real app points at — recording its writes.
@MainActor
private final class Store<Value: Sendable> {
  var value: Value
  var writes: [Value] = []
  init(_ value: Value) { self.value = value }

  var binding: Binding<Value> {
    Binding(
      get: { MainActor.assumeIsolated { self.value } },
      set: { newValue in
        MainActor.assumeIsolated {
          self.value = newValue
          self.writes.append(newValue)
        }
      })
  }
}

/// Entries as a rail reads them: titles "A", "B", "C" … with values "a", "b", "c" …; `disabled` lists the disabled indices.
private func entries(_ count: Int = 4, disabled: Set<Int> = [], values: [String]? = nil, titles: [String]? = nil) -> [TanreiDestinationEntry] {
  (0..<count).map { index in
    let letter = String(UnicodeScalar(UInt8(65 + index)))
    return TanreiDestinationEntry(
      title: titles?[index] ?? letter, value: AnyHashable(values?[index] ?? letter.lowercased()), isEnabled: !disabled.contains(index))
  }
}

/// A rail of four destinations ("Inbox", "Sent", "Starred", "Settings", valued by their lowercased label) 400 high, without
/// a header.
@MainActor
private func rail(
  selection: Binding<String> = .constant("inbox"), visibility: TanreiNavigationLabelVisibility = .always, disabled: Set<Int> = [],
  icon: TanreiItemIcon = "", badges: [Int: TanreiNavigationBadge] = [:], titles: [String] = names, onReselect: (@MainActor (String) -> Void)? = nil
) -> some View {
  TanreiNavigationRail(selection: selection, labelVisibility: visibility, accessibilityLabel: "Main", onReselect: onReselect) {
    ForEach(titles.indices, id: \.self) { index in
      TanreiNavigationRailItem(titles[index], icon: icon, value: names[index % names.count].lowercased() + (index < names.count ? "" : "\(index)"), badge: badges[index])
        .disabled(disabled.contains(index))
    }
  }
  .frame(height: height)
}

/// The header the geometry tests use: a block of known size in the error color.
private let headerBlock = CGSize(width: 40, height: 20)

/// Where the parts of a destination are in a rail (points, inset included): cells stacked from `top`.
@MainActor
private struct Geometry {
  var tokens = TanreiSystem.tanrei.navigationRail
  var hasHeader = false
  /// NVR-6: the height of a cell — its destination and the gap — at least the touch target.
  var labelShown = true

  var minimumCell: CGFloat { TanreiSystem.tanrei.measure.targetTouch }

  func cellHeight(labelShown: Bool) -> CGFloat {
    let group = labelShown ? tokens.itemContainerHeight + tokens.itemGap + tokens.itemLabelTypescale.lineHeight : tokens.itemContainerHeight
    return max(minimumCell, group + tokens.containerGap)
  }

  var cell: CGFloat { cellHeight(labelShown: labelShown) }

  /// NVR-12: the header `container.padding-block` below the top; the destinations `header.gap` below it, or
  /// `container.padding-block` below the top without one — the cell carries half the gap above its destination.
  var firstCellTop: CGFloat {
    let above = hasHeader ? tokens.containerPaddingBlock + headerBlock.height + tokens.headerGap : tokens.containerPaddingBlock
    return Snapshot.inset + above - tokens.containerGap / 2
  }

  func cellTop(_ index: Int) -> CGFloat { firstCellTop + cell * CGFloat(index) }

  var centerX: CGFloat { Snapshot.inset + tokens.containerWidth / 2 }

  /// NVR-13, NVR-14: the item container's top — the group (container, gap, one line of label) centered in the cell.
  func containerTop(_ index: Int) -> CGFloat {
    let group = labelShown ? tokens.itemContainerHeight + tokens.itemGap + tokens.itemLabelTypescale.lineHeight : tokens.itemContainerHeight
    return cellTop(index) + (cell - group) / 2
  }

  func containerCenterY(_ index: Int) -> CGFloat { containerTop(index) + tokens.itemContainerHeight / 2 }

  /// A point inside the item container, clear of its icon and its rounded corners: near its start edge, level with its center.
  func fill(_ index: Int) -> CGPoint {
    CGPoint(x: centerX - tokens.itemContainerWidth / 2 + 4, y: containerCenterY(index))
  }

  /// The label's line under the item container.
  func labelRect(_ index: Int) -> CGRect {
    CGRect(
      x: Snapshot.inset, y: containerTop(index) + tokens.itemContainerHeight + tokens.itemGap, width: tokens.containerWidth - 1,
      height: tokens.itemLabelTypescale.lineHeight)
  }
}

/// One destination's chrome, alone, in a cell of 80 × 60: what the rail draws for a destination.
@MainActor
private func chrome(
  _ entry: TanreiDestinationEntry = TanreiDestinationEntry(title: "Inbox", value: "inbox"), selected: Bool = false, labelShown: Bool = true,
  pressed: Bool = false, focused: Bool = false, tokens: TanreiNavigationRailTokens = TanreiSystem.tanrei.navigationRail
) -> some View {
  TanreiDestinationChrome(entry: entry, style: tokens.destinationStyle, isSelected: selected, labelShown: labelShown, isPressed: pressed, isFocused: focused)
    .frame(width: 80, height: 60)
}

// MARK: - The rules (NVR-1, NVR-2, NVR-3, NVR-14, NVR-17, NVR-18, NVR-20, NVR-21, NVR-23)

@MainActor
@Suite("TanreiNavigationRail rules")
struct TanreiNavigationRailRulesTests {
  let ids = TanreiNavigationRailView.reportIds

  /// NVR-3 — the destination whose value equals the rail's; an empty value (or nil) and a value naming none select none.
  /// NVR-23 — the first of two sharing a value is the one it selects.
  @Test("NVR-3 NVR-23 which destination is selected: by value, the first of a repeated value, none for empty or unknown")
  func selected() {
    #expect(TanreiDestinationRules.selectedIndex(entries(), selection: "b") == 1)
    #expect(TanreiDestinationRules.selectedIndex(entries(), selection: "") == nil)
    #expect(TanreiDestinationRules.selectedIndex(entries(), selection: nil) == nil)
    #expect(TanreiDestinationRules.selectedIndex(entries(), selection: "z") == nil)
    #expect(TanreiDestinationRules.selectedIndex(entries(values: ["a", "b", "a", "d"]), selection: "a") == 0)
    #expect(TanreiDestinationRules.selectedIndex(entries(disabled: [2]), selection: "c") == 2)
  }

  /// NVR-1 — activating a destination that is not selected is `change` with its value; the selected one is `reselect`
  /// with its value. NVR-2 — a disabled destination emits nothing.
  @Test("NVR-1 NVR-2 change for another destination, reselect for the selected one, nothing for a disabled one")
  func activation() {
    let rail = entries(disabled: [2])
    #expect(TanreiDestinationRules.activation(rail, activating: 1, selected: 0) == .change("b"))
    #expect(TanreiDestinationRules.activation(rail, activating: 0, selected: 0) == .reselect("a"))
    #expect(TanreiDestinationRules.activation(rail, activating: 2, selected: 0) == nil)
    #expect(TanreiDestinationRules.activation(rail, activating: 1, selected: nil) == .change("b"))
    // NVR-23: the second of two sharing the selected value is not the selected destination: activating it is a change.
    #expect(TanreiDestinationRules.activation(entries(values: ["a", "b", "a", "d"]), activating: 2, selected: 0) == .change("a"))
  }

  /// NVR-3, NVR-18, NVR-21, NVR-23 — reported in debug builds, with the rail's ids: a value naming no destination, a count
  /// outside three to seven, an empty label, a repeated value. A consistent rail reports nothing.
  @Test("NVR-3 NVR-18 NVR-21 NVR-23 unknown values, counts outside 3…7, empty labels and repeated values are reported")
  func problems() {
    #expect(TanreiDestinationRules.problems(entries(), selection: "b", ids: ids).isEmpty)
    #expect(TanreiDestinationRules.problems(entries(), selection: "", ids: ids).isEmpty)
    #expect(TanreiDestinationRules.problems(entries(3), selection: nil, ids: ids).isEmpty)
    #expect(TanreiDestinationRules.problems(entries(7), selection: "a", ids: ids).isEmpty)
    let unknown = TanreiDestinationRules.problems(entries(), selection: "z", ids: ids)
    #expect(unknown.count == 1 && unknown[0].contains("\"z\"") && unknown[0].contains("NVR-3"))
    for count in [1, 2, 8] {
      let reports = TanreiDestinationRules.problems(entries(count), selection: "a", ids: ids)
      #expect(reports.count == 1 && reports[0].contains("holds \(count)") && reports[0].contains("3 to 7") && reports[0].contains("NVR-18"), "\(count)")
    }
    let empty = TanreiDestinationRules.problems(entries(titles: ["A", "", "C", "D"]), selection: "a", ids: ids)
    #expect(empty.count == 1 && empty[0].contains("value \"b\"") && empty[0].contains("NVR-21"))
    let repeated = TanreiDestinationRules.problems(entries(values: ["a", "a", "c", "d"]), selection: "a", ids: ids)
    #expect(repeated.count == 1 && repeated[0].contains("more than one") && repeated[0].contains("NVR-23"))
  }

  /// NVR-14 — always draws every label, selected only the selected destination's, never none.
  @Test("NVR-14 which destinations draw their label")
  func labelVisibility() {
    #expect(TanreiNavigationLabelVisibility.always.showsLabel(selected: false) && TanreiNavigationLabelVisibility.always.showsLabel(selected: true))
    #expect(!TanreiNavigationLabelVisibility.selected.showsLabel(selected: false) && TanreiNavigationLabelVisibility.selected.showsLabel(selected: true))
    #expect(!TanreiNavigationLabelVisibility.never.showsLabel(selected: false) && !TanreiNavigationLabelVisibility.never.showsLabel(selected: true))
  }

  /// NVR-20 — a destination states its position among the destinations where the platform does not (iOS's tab bar trait
  /// does), then (NVR-17) its badge's description: its label, or the displayed count.
  @Test("NVR-20 NVR-17 each destination's position, then its badge's description")
  func accessibilityValue() {
    #if os(iOS)
    #expect(TanreiDestinationRules.positionText(index: 1, count: 4) == nil)
    #else
    #expect(TanreiDestinationRules.positionText(index: 1, count: 4) == "2 of 4")
    #endif
    let locale = Locale(identifier: "en_US")
    #expect(TanreiDestinationRules.badgeDescription(TanreiNavigationBadge(count: 3, label: "3 unread"), locale: locale) == "3 unread")
    #expect(TanreiDestinationRules.badgeDescription(TanreiNavigationBadge(count: 1200), locale: locale) == "999+")
    #expect(TanreiDestinationRules.badgeDescription(TanreiNavigationBadge(label: "New"), locale: locale) == "New")
    #expect(TanreiDestinationRules.badgeDescription(TanreiNavigationBadge(count: 0, label: "none"), locale: locale) == nil)
    #expect(TanreiDestinationRules.accessibilityValue(position: "1 of 4", badge: "3 unread") == "1 of 4, 3 unread")
  }
}

// MARK: - Reading the destinations and the header (NVR-2, NVR-12, NVR-17, NVR-21)

private final class EntriesBox: @unchecked Sendable {
  var entries: [TanreiDestinationEntry] = []
}

private struct EntriesRoot: _VariadicView_UnaryViewRoot {
  let box: EntriesBox
  func body(children: _VariadicView.Children) -> some View {
    box.entries = children.compactMap { $0[TanreiDestinationEntryKey.self] }
    return Color.clear.frame(width: 1, height: 1)
  }
}

/// The destinations as the rail reads them from its content.
@MainActor
private func read(@ViewBuilder _ content: () -> some View) -> [TanreiDestinationEntry] {
  let box = EntriesBox()
  _ = ImageRenderer(content: _VariadicView.Tree(EntriesRoot(box: box)) { content() }).cgImage
  return box.entries
}

private enum Screen: Hashable { case home, profile }

@MainActor
@Suite("TanreiNavigationRail items")
struct TanreiNavigationRailItemTests {
  /// The item kind `destination`: title, icon (a glyph by name, an image, or none), value of any Hashable type, badge and
  /// `.disabled(_:)` — read from each item's own view, through `ForEach` and modifiers.
  @Test("NVR-2 NVR-17 each destination's props are read from its view: title, icon, value, badge, disabled")
  func props() {
    let read = read {
      TanreiNavigationRailItem("Inbox", icon: "inbox", value: "inbox", badge: TanreiNavigationBadge(count: 3, label: "3 unread"))
      TanreiNavigationRailItem("Home", icon: .image(Image(systemName: "house")), value: Screen.home)
      TanreiNavigationRailItem("Starred", icon: "star", value: 7).disabled(true)
      ForEach(["a", "b"], id: \.self) { TanreiNavigationRailItem($0.uppercased(), icon: "", value: $0) }
    }
    #expect(read.map(\.title) == ["Inbox", "Home", "Starred", "A", "B"])
    #expect(read.map(\.value) == ["inbox", AnyHashable(Screen.home), AnyHashable(7), "a", "b"])
    #expect(read.map(\.isEnabled) == [true, true, false, true, true])
    #expect(read.map { $0.icon != nil } == [true, true, true, false, false])
    #expect(read.map(\.badge) == [TanreiNavigationBadge(count: 3, label: "3 unread"), nil, nil, nil, nil])
  }

  /// NVR-21 — an empty label is reported in debug builds, and the destination still renders (its item container is drawn,
  /// selected, centered in its cell as without a label).
  @Test("NVR-21 an empty label is reported and the destination is still rendered")
  func emptyLabel() throws {
    let (bitmap, reports) = try Reports.collecting {
      try Snapshot.render(
        TanreiNavigationRail(selection: .constant("a")) {
          TanreiNavigationRailItem("", icon: "", value: "a")
          TanreiNavigationRailItem("B", icon: "", value: "b")
          TanreiNavigationRailItem("C", icon: "", value: "c")
        }
        .frame(height: height))
    }
    #expect(reports.mention("NVR-21") && reports.mention("accessible name"))
    let geometry = Geometry(labelShown: false)
    #expect(pixel(bitmap, x: geometry.fill(0).x, y: geometry.containerCenterY(0)).isClose(to: light[.secondaryContainer].rgba8(), tolerance: 6))
  }

  /// NVR-18 — fewer than three or more than seven destinations still render, and the count is reported.
  @Test("NVR-18 two or eight destinations still render and are reported")
  func count() throws {
    for count in [2, 8] {
      let (bitmap, reports) = try Reports.collecting {
        try Snapshot.render(
          TanreiNavigationRail(selection: .constant("v0")) {
            ForEach(0..<count, id: \.self) { TanreiNavigationRailItem("D\($0)", icon: "", value: "v\($0)") }
          }
          .frame(height: 600))
      }
      #expect(reports.mention("NVR-18") && reports.mention("holds \(count)"), "\(count)")
      let geometry = Geometry()
      #expect(pixel(bitmap, x: geometry.fill(0).x, y: geometry.containerCenterY(0)).isClose(to: light[.secondaryContainer].rgba8(), tolerance: 6))
    }
  }
}

// MARK: - Activation by pointer (NVR-1, NVR-2, NVR-4, NVR-6, NVR-8, NVR-16, NVR-18)

/// A rail that owns its selection, as an app does: a click on another destination selects it.
private struct SelectingRail: View {
  @State var selection = "inbox"
  var visibility: TanreiNavigationLabelVisibility = .always
  var body: some View {
    rail(selection: $selection, visibility: visibility)
  }
}

@MainActor
@Suite("TanreiNavigationRail activation", .serialized)
struct TanreiNavigationRailActivationTests {
  #if os(macOS)
  /// NVR-1 — a click on the selected destination calls onReselect once with its value and writes nothing; a click on
  /// another writes its value once. NVR-2 — a click on a disabled destination emits nothing.
  @Test("NVR-1 NVR-2 a click reselects or changes once; a disabled destination emits nothing")
  func click() {
    let store = Store<String>("inbox")
    var reselected: [String] = []
    let hosted = HostedView(
      rail(selection: store.binding, disabled: [2], onReselect: { reselected.append($0) }).padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    let geometry = Geometry()
    hosted.click(at: CGPoint(x: geometry.centerX, y: geometry.containerCenterY(0)))
    #expect(reselected == ["inbox"] && store.writes.isEmpty)
    hosted.click(at: CGPoint(x: geometry.centerX, y: geometry.containerCenterY(1)))
    #expect(store.writes == ["sent"] && reselected == ["inbox"])
    hosted.click(at: CGPoint(x: geometry.centerX, y: geometry.containerCenterY(2)))
    #expect(store.writes == ["sent"] && reselected == ["inbox"])
  }

  /// NVR-6 — the whole cell is the hit area: the rail's full width and the half gaps above and below its destination. A
  /// click at a corner of the cell, in the gap, activates it; hover there answers on the item container (NVR-4).
  @Test("NVR-6 NVR-4 a click anywhere in the cell, its gaps included, activates it; hover there shows on the item container")
  func wholeCell() {
    var system = TanreiSystem.tanrei
    system.navigationRail.motionStateDuration = 0
    system.navigationRail.conditions.unselected.hovered.itemContainerColor = .role(.error)
    let colors = system.colors.light
    let store = Store<String>("inbox")
    let hosted = HostedView(rail(selection: store.binding).padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let geometry = Geometry()
    // The top-start corner of the fourth cell, in the half gap above its destination.
    let corner = CGPoint(x: Snapshot.inset + 2, y: geometry.cellTop(3) + 1)
    hosted.hover(at: corner)
    hosted.settle(0.1)
    #expect(hosted.color(at: geometry.fill(3))?.isClose(to: colors[.error].rgba8(), tolerance: 6) == true)
    #expect(hosted.color(at: geometry.fill(2))?.isClose(to: colors[.surface].rgba8(), tolerance: 6) == true)
    hosted.click(at: corner)
    #expect(store.writes == ["settings"])
    // The bottom-end corner of the second cell, in the half gap below it.
    hosted.click(at: CGPoint(x: Snapshot.inset + geometry.tokens.containerWidth - 3, y: geometry.cellTop(2) - 1))
    #expect(store.writes == ["settings", "sent"])
  }

  /// NVR-8 end to end: pressed at once, held for press-hold after a quick click; one change (NVR-1).
  @Test("NVR-8 NVR-1 a quick click shows the pressed state at once and keeps it after the release")
  func quickClickIsHeld() throws {
    var system = TanreiSystem.tanrei
    system.motion.duration.pressHold = 1500
    system.navigationRail.motionStateDuration = 0
    system.navigationRail.conditions.unselected.pressed.itemContainerColor = .role(.error)
    let colors = system.colors.light
    let store = Store<String>("inbox")
    let hosted = HostedView(rail(selection: store.binding).padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let point = Geometry().fill(1)
    hosted.hover(at: point)
    hosted.mouse(.leftMouseDown, at: point)
    hosted.settle()
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8(), tolerance: 6))
    hosted.mouse(.leftMouseUp, at: point)
    hosted.settle()
    #expect(store.writes == ["sent"])
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8(), tolerance: 6), "held after the release")
  }

  /// NVR-16 end to end: when the selection changes, the new active indicator grows in width from the center of its item
  /// container at its full height, and the previous one fades out, over the selection motion; where motion is reduced the
  /// new selection is shown at once.
  @Test("NVR-16 the new indicator grows from the center, the old one fades; at once where motion is reduced")
  func selectionMotion() {
    var system = TanreiSystem.tanrei
    system.navigationRail.motionSelectionDuration = 4000
    system.navigationRail.motionSelectionEasing = TanreiCubicBezier(0, 0, 1, 1)
    system.navigationRail.conditions.selected.enabled.itemContainerColor = .role(.error)
    system.navigationRail.conditions.selected.hovered.itemContainerColor = .role(.error)
    system.navigationRail.conditions.selected.pressed.itemContainerColor = .role(.error)
    system.motion.duration.pressHold = 0
    let colors = system.colors.light
    let error = colors[.error].rgba8()
    let surface = colors[.surface].rgba8()
    let geometry = Geometry()
    let tokens = system.navigationRail
    for reduced in [false, true] {
      let hosted = HostedView(
        SelectingRail().padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)).environment(\._accessibilityReduceMotion, reduced))
      #expect(hosted.color(at: geometry.fill(0))?.isClose(to: error, tolerance: 6) == true)
      // At the end of the second cell, in its half gap: the ripple and the press of the click stay clear of the samples.
      hosted.click(at: CGPoint(x: Snapshot.inset + tokens.containerWidth - 3, y: geometry.cellTop(2) - 1))
      hosted.settle(0.3)
      let center = CGPoint(x: geometry.centerX - 1, y: geometry.containerTop(1) + 2)
      let edge = CGPoint(x: geometry.centerX - tokens.itemContainerWidth / 2 + 2, y: geometry.containerCenterY(1))
      let old = hosted.color(at: geometry.fill(0))
      if reduced {
        #expect(hosted.color(at: edge)?.isClose(to: error, tolerance: 6) == true, "reduced: the new indicator is whole at once")
        #expect(old?.isClose(to: surface, tolerance: 6) == true, "reduced: the old indicator is gone at once")
      } else {
        // Growing: its center is filled at its full height, its edge not yet; the old indicator still shows, fading.
        withKnownIssue("CI runner timing: the growing indicator is sampled 0.3 s in on the wall clock; on GitHub's macOS runner it is not where that moment puts it", isIntermittent: true) {
          #expect(hosted.color(at: center)?.isClose(to: error, tolerance: 40) == true, "\(String(describing: hosted.color(at: center)))")
          #expect(hosted.color(at: edge)?.isClose(to: surface, tolerance: 6) == true, "\(String(describing: hosted.color(at: edge)))")
        }
        #expect(old.map { !$0.isClose(to: surface, tolerance: 20) } == true, "fading: \(String(describing: old))")
      }
    }
  }

  /// NVR-16 — under `.selected` the destinations move as the labels come and go, over the selection motion; at once where
  /// motion is reduced.
  @Test("NVR-16 under labelVisibility selected the destinations move over the selection motion; at once where motion is reduced")
  func destinationsMove() {
    var system = TanreiSystem.tanrei
    system.navigationRail.motionSelectionDuration = 4000
    system.navigationRail.motionSelectionEasing = TanreiCubicBezier(0, 0, 1, 1)
    system.navigationRail.conditions.unselected.enabled.itemContainerColor = .role(.warning)
    system.navigationRail.conditions.unselected.hovered.itemContainerColor = .role(.warning)
    system.motion.duration.pressHold = 0
    let colors = system.colors.light
    let warning = colors[.warning].rgba8()
    let tokens = system.navigationRail
    let labelled = Geometry().cellHeight(labelShown: true)
    let bare = Geometry().cellHeight(labelShown: false)
    // The second destination's item container: below a labelled first cell, then below a bare one.
    let first = Geometry().firstCellTop
    let before = first + labelled + (bare - tokens.itemContainerHeight) / 2
    let after = first + bare + (bare - tokens.itemContainerHeight) / 2
    for reduced in [false, true] {
      let hosted = HostedView(
        SelectingRail(visibility: .selected).padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system))
          .environment(\._accessibilityReduceMotion, reduced))
      func top() -> CGFloat? {
        let x = Geometry().fill(1).x
        return stride(from: first + labelled - 4, to: first + labelled + bare, by: 0.5).first {
          hosted.color(at: CGPoint(x: x, y: $0))?.isClose(to: warning, tolerance: 6) == true
        }
      }
      #expect(top().map { abs($0 - before) <= 1 } == true, "\(String(describing: top())) vs \(before)")
      // Select the third destination by its cell's end, clear of the sampled column.
      hosted.click(at: CGPoint(x: Snapshot.inset + tokens.containerWidth - 3, y: first + labelled + bare + bare / 2))
      hosted.settle(reduced ? 0.3 : 1)
      let moved = top()
      if reduced {
        #expect(moved.map { abs($0 - after) <= 1 } == true, "reduced: \(String(describing: moved)) vs \(after)")
      } else {
        #expect(moved.map { $0 < before - 1 && $0 > after + 1 } == true, "moving: \(String(describing: moved)) between \(after) and \(before)")
      }
    }
  }

  /// NVR-18 — a rail too short for its destinations scrolls them; the header stays in place.
  @Test("NVR-18 the destinations scroll, the header stays")
  func scrolls() throws {
    var system = TanreiSystem.tanrei
    system.navigationRail.conditions.selected.enabled.itemContainerColor = .role(.error)
    let colors = system.colors.light
    let short = TanreiNavigationRail(selection: .constant("v1")) {
      ForEach(0..<7, id: \.self) { TanreiNavigationRailItem("D\($0)", icon: "", value: "v\($0)") }
    } header: {
      Rectangle().fill(colors[.success]).frame(width: headerBlock.width, height: headerBlock.height)
    }
    .frame(height: 300)
    let hosted = HostedView(short.padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let geometry = Geometry(hasHeader: true)
    let header = CGPoint(x: geometry.centerX, y: Snapshot.inset + system.navigationRail.containerPaddingBlock + headerBlock.height / 2)
    #expect(hosted.color(at: header)?.isClose(to: colors[.success].rgba8(), tolerance: 6) == true)
    #expect(hosted.color(at: geometry.fill(1))?.isClose(to: colors[.error].rgba8(), tolerance: 6) == true)
    #expect(hosted.scroll(toY: geometry.cell))
    // The second destination is now where the first was; the header has not moved.
    #expect(hosted.color(at: geometry.fill(0))?.isClose(to: colors[.error].rgba8(), tolerance: 6) == true)
    #expect(hosted.color(at: header)?.isClose(to: colors[.success].rgba8(), tolerance: 6) == true)
  }
  #endif
}

// MARK: - Token bindings (NVR-3, NVR-4, NVR-7, NVR-9, NVR-10, NVR-16)

@MainActor
@Suite("TanreiNavigationRail token bindings")
struct TanreiNavigationRailTokenBindingTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiNavigationRailTokens { system.navigationRail }

  private func appearance(
    selected: Bool = false, _ state: TanreiInteraction = .enabled, tokens: TanreiNavigationRailTokens? = nil, feedback: TanreiPressedFeedback = .overlay,
    beneath: TanreiInteraction = .enabled
  ) -> TanreiDestinationAppearance {
    TanreiDestinationAppearance(style: (tokens ?? self.tokens).destinationStyle, isSelected: selected, state: state, feedback: feedback, beneath: beneath)
  }

  /// NVR-3 — at rest: an unselected destination draws no item container, its icon and label
  /// on-surface-variant; the selected one the secondary-container indicator, its icon on-secondary-container and its label
  /// on-surface. NVR-13 — the geometry the destinations are drawn with, the label on at most two lines.
  @Test("NVR-3 NVR-13 at rest each condition binds its own parts; the rail's geometry")
  func rest() {
    let plain = appearance()
    let chosen = appearance(selected: true)
    #expect(plain.container == TanreiPaint.none && plain.icon == .role(.onSurfaceVariant) && plain.label == .role(.onSurfaceVariant))
    #expect(chosen.container == .role(.secondaryContainer) && chosen.icon == .role(.onSecondaryContainer) && chosen.label == .role(.onSurface))
    #expect(plain.opacity == 1 && chosen.opacity == 1 && plain.ripple == nil)
    let style = tokens.destinationStyle
    #expect(style.containerWidth == 56 && style.containerHeight == 32 && style.containerShape == tokens.itemContainerShape)
    #expect(style.gap == system.space.space50 && style.iconSize == 24 && style.labelTypescale == system.typescale.labelSmall && style.labelLineLimit == 2)
  }

  /// NVR-4 — hovered, focused and pressed mix each condition's state-layer color into its item container; icon and label
  /// keep their resting values; opacity stays 1.
  @Test("NVR-4 each state binds that state's tokens", arguments: [false, true])
  func states(selected: Bool) {
    let rest = appearance(selected: selected)
    let condition = tokens.conditions[selected ? .selected : .unselected]
    for (state, amount) in [
      (TanreiInteraction.hovered, system.state.hoverStateLayerOpacity), (.focused, system.state.focusStateLayerOpacity), (.pressed, system.state.pressedStateLayerOpacity),
    ] {
      let drawn = appearance(selected: selected, state)
      #expect(drawn.container == .mix(base: rest.container, with: condition.enabled.itemStateLayerColor, amount: amount))
      #expect(drawn.icon == rest.icon && drawn.label == rest.label && drawn.opacity == 1)
    }
  }

  /// NVR-4 (verify) — under the acme fixture system, hovered, focused and pressed differ, for both conditions.
  @Test("NVR-4 under acme, hovered, focused and pressed differ")
  func acme() {
    for selected in [false, true] {
      let containers = [TanreiInteraction.hovered, .focused, .pressed].map {
        TanreiDestinationAppearance(style: TanreiSystem.acme.navigationRail.destinationStyle, isSelected: selected, state: $0).container
      }
      #expect(Set(containers.map { "\($0)" }).count == 3, "selected: \(selected)")
    }
  }

  /// NVR-7 — disabled: no item container for an unselected destination; icon and label from the disabled tokens; the
  /// disabled opacity.
  @Test("NVR-7 disabled bindings, for a destination and for the selected one")
  func disabled() {
    let plain = appearance(.disabled)
    let chosen = appearance(selected: true, .disabled)
    #expect(plain.container == TanreiPaint.none)
    #expect(plain.icon == tokens.conditions.unselected.disabled.itemIconColor && plain.label == tokens.conditions.unselected.disabled.itemLabelColor)
    #expect(chosen.container == tokens.conditions.selected.disabled.itemContainerColor && chosen.label == tokens.conditions.selected.disabled.itemLabelColor)
    #expect(plain.opacity == tokens.disabled.opacity && chosen.opacity == tokens.disabled.opacity)
  }

  /// NVR-3 NVR-4 NVR-7 — the values drive the result, for every part of both conditions, and are the rail's (not the bar's).
  @Test("NVR-3 NVR-4 NVR-7 a modified system changes what each state resolves to")
  func modifiedSystem() {
    var custom = tokens
    custom.conditions.unselected.hovered.itemContainerColor = .role(.error)
    custom.conditions.selected.focused.itemLabelColor = .role(.warning)
    custom.conditions.selected.pressed.itemIconColor = .role(.success)
    custom.conditions.unselected.disabled.itemIconColor = .role(.info)
    custom.conditions.selected.enabled.itemContainerColor = .role(.primary)
    custom.pressed.opacity = 0.5
    #expect(appearance(.hovered, tokens: custom).container == .role(.error))
    #expect(appearance(selected: true, .focused, tokens: custom).label == .role(.warning))
    #expect(appearance(selected: true, .pressed, tokens: custom).icon == .role(.success))
    #expect(appearance(.disabled, tokens: custom).icon == .role(.info))
    #expect(appearance(selected: true, tokens: custom).container == .role(.primary))
    #expect(appearance(.pressed, tokens: custom).opacity == 0.5)
    // The rail's own tokens: changing the bar's changes nothing here.
    var bar = system
    bar.navigationBar.conditions.selected.enabled.itemContainerColor = .role(.error)
    #expect(TanreiDestinationAppearance(style: bar.navigationRail.destinationStyle, isSelected: true, state: .enabled).container == .role(.secondaryContainer))
  }

  /// NVR-9 — which tokens a press reads under each choice; the shipped systems: m3-like ripples, cupertino dims, the
  /// default overlays.
  @Test("NVR-9 each choice binds the pressed tokens its own way", arguments: TanreiPressedFeedback.allCases)
  func feedback(feedback: TanreiPressedFeedback) {
    var custom = tokens
    custom.conditions.unselected.pressed.itemContainerColor = .role(.error)
    custom.conditions.unselected.pressed.itemIconColor = .role(.warning)
    custom.pressed.opacity = 0.5
    let pressed = appearance(.pressed, tokens: custom, feedback: feedback, beneath: .hovered)
    let hovered = custom.conditions.unselected.hovered
    switch feedback {
    case .overlay: #expect(pressed.container == .role(.error) && pressed.ripple == nil && pressed.icon == .role(.warning) && pressed.opacity == 0.5)
    case .ripple: #expect(pressed.container == hovered.itemContainerColor && pressed.ripple == .role(.error) && pressed.opacity == 0.5 && pressed.icon == .role(.warning))
    case .dim: #expect(pressed.container == hovered.itemContainerColor && pressed.ripple == nil && pressed.opacity == 0.5 && pressed.icon == .role(.warning))
    case .none: #expect(pressed == appearance(.hovered, tokens: custom))
    }
    func shipped(_ system: TanreiSystem) -> TanreiDestinationAppearance {
      TanreiDestinationAppearance(style: system.navigationRail.destinationStyle, isSelected: false, state: .pressed, feedback: system.behavior.pressedFeedback)
    }
    #expect(shipped(.m3Like).ripple != nil && shipped(.cupertino).ripple == nil && shipped(.cupertino).opacity < 1 && shipped(.tanrei).ripple == nil)
  }

  /// NVR-9 — rendered: the pressed destination under each choice (overlay and ripple fill the item container with the
  /// pressed color — a ripple drawn grown in a render that never saw the press begin —, dim and none do not).
  @Test("NVR-9 each choice renders as it says", arguments: TanreiPressedFeedback.allCases)
  func rendered(feedback: TanreiPressedFeedback) throws {
    var custom = TanreiSystem.tanrei
    custom.behavior.pressedFeedback = feedback
    custom.navigationRail.conditions.unselected.pressed.itemContainerColor = .role(.error)
    // The group (32 + 4 + 16) centered in the 60 high cell: the item container from 4 to 36.
    let point = CGPoint(x: Snapshot.inset + 40 - 24, y: Snapshot.inset + 20)
    let actual = pixel(try Snapshot.render(chrome(pressed: true, tokens: custom.navigationRail), theme: theme(custom)), x: point.x, y: point.y)
    switch feedback {
    case .overlay, .ripple: #expect(actual.isClose(to: light[.error].rgba8(), tolerance: 6), "\(actual)")
    case .dim, .none: #expect(actual.isClose(to: light[.surface].rgba8(), tolerance: 6), "\(actual)")
    }
  }

  /// NVR-10 — the item container's corners follow the corner smoothing; keyboard focus follows the focus style (ring or
  /// glow).
  @Test("NVR-10 corner smoothing and focus style reach the item container")
  func cornersAndFocusStyle() throws {
    func render(_ amount: Double, focused: Bool = false, style: TanreiFocusStyle = .ring) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      custom.navigationRail.itemContainerShape = 12
      custom.behavior.focusStyle = style
      return try Snapshot.renderExact(chrome(selected: true, focused: focused, tokens: custom.navigationRail), theme: theme(custom))
    }
    let continuous = try render(0.6)
    #expect(try render(0).mismatch(against: continuous, channelTolerance: 0) > 0)
    #expect(try render(1).mismatch(against: continuous, channelTolerance: 0) == 0)
    #expect(try render(0.6, focused: true, style: .glow).mismatch(against: try render(0.6, focused: true, style: .ring), channelTolerance: 0) > 0)
    #expect(TanreiSystem.cupertino.shape.roundedCornerStyle == .continuous && TanreiSystem.acme.behavior.focusStyle == .glow)
  }

  /// NVR-4, NVR-9, NVR-16 — the state motion, the ripple's growth and the selection motion come from the rail's tokens; none
  /// under Reduce Motion.
  @Test("NVR-16 NVR-9 NVR-4 the motions come from the tokens; none under Reduce Motion")
  func motion() {
    var custom = tokens
    custom.motionStateDuration = 400
    custom.motionStateEasing = TanreiCubicBezier(0, 0, 1, 1)
    custom.motionFeedbackDuration = 900
    custom.motionSelectionDuration = 700
    custom.motionSelectionEasing = TanreiCubicBezier(0.1, 0.2, 0.3, 0.4)
    let style = custom.destinationStyle
    #expect(style.stateMotion(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.4))
    #expect(style.rippleGrowth(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.9))
    #expect(style.selectionMotion(reduceMotion: false) == Animation.timingCurve(0.1, 0.2, 0.3, 0.4, duration: 0.7))
    #expect(style.stateMotion(reduceMotion: true) == nil && style.rippleGrowth(reduceMotion: true) == nil && style.selectionMotion(reduceMotion: true) == nil)
  }
}

// MARK: - Rendered (NVR-5, NVR-6, NVR-11 … NVR-15, NVR-17, NVR-19, NVR-22)

@MainActor
@Suite("TanreiNavigationRail rendered")
struct TanreiNavigationRailRenderedTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiNavigationRailTokens { system.navigationRail }

  /// NVR-11 — `container.width` wide, the parent's full height, in the container color, the end edge in its color and
  /// width; right to left the rail is at the right edge with its edge on its left.
  @Test("NVR-11 container width, full height and color, the end edge; mirrored right to left")
  func container() throws {
    var custom = system
    custom.navigationRail.containerColor = .role(.error)
    custom.navigationRail.outlineColor = .role(.success)
    custom.navigationRail.outlineWidth = 2
    let rendered = try Snapshot.render(rail(), theme: theme(custom))
    #expect(visualSize(rendered) == CGSize(width: tokens.containerWidth, height: height))
    let red = light[.error].rgba8()
    let green = light[.success].rgba8()
    #expect(pixel(rendered, x: Snapshot.inset + 2, y: Snapshot.inset + height - 2).isClose(to: red))
    // The end edge, the rail's full height, inside its width.
    for y in [Snapshot.inset + 1, Snapshot.inset + 200, Snapshot.inset + height - 1] {
      #expect(pixel(rendered, x: Snapshot.inset + tokens.containerWidth - 1, y: y).isClose(to: green), "\(y)")
      #expect(pixel(rendered, x: Snapshot.inset + tokens.containerWidth - 2.5, y: y).isClose(to: red), "\(y)")
    }
    // At the leading edge of a row: left to right at the left edge; right to left at the right edge, its edge on its left.
    let ltr = try Snapshot.render(HStack(spacing: 0) { rail(); Spacer(minLength: 0) }.frame(width: 300), theme: theme(custom))
    let rtl = try Snapshot.render(
      HStack(spacing: 0) { rail(); Spacer(minLength: 0) }.frame(width: 300).environment(\.layoutDirection, .rightToLeft), theme: theme(custom))
    #expect(pixel(ltr, x: Snapshot.inset + 10, y: Snapshot.inset + 200).isClose(to: red))
    #expect(pixel(rtl, x: Snapshot.inset + 300 - 10, y: Snapshot.inset + 200).isClose(to: red))
    #expect(!pixel(rtl, x: Snapshot.inset + 10, y: Snapshot.inset + 200).isClose(to: red))
    #expect(pixel(rtl, x: Snapshot.inset + 300 - tokens.containerWidth + 1, y: Snapshot.inset + 200).isClose(to: green))
    #expect(pixel(rtl, x: Snapshot.inset + 300 - 1, y: Snapshot.inset + 200).isClose(to: red))
  }

  /// NVR-11 — the container's elevation is drawn (a system that raises the rail casts its shadow past its end edge).
  @Test("NVR-11 the container's elevation")
  func elevation() throws {
    var custom = system
    custom.navigationRail.containerElevation = [TanreiShadowLayer(x: 4, y: 0, blur: 4, spread: 0, role: .error)]
    let raised = try Snapshot.render(rail(), theme: theme(custom))
    let flat = try Snapshot.render(rail())
    let beyond = CGPoint(x: Snapshot.inset + tokens.containerWidth + 3, y: Snapshot.inset + 200)
    #expect(pixel(flat, x: beyond.x, y: beyond.y).isClose(to: light[.surface].rgba8()))
    #expect(!pixel(raised, x: beyond.x, y: beyond.y).isClose(to: light[.surface].rgba8(), tolerance: 6))
  }

  /// NVR-12 — the header's content centered and stacked `container.padding-block` below the top; the destinations
  /// `header.gap` below it, `container.gap` apart, horizontally centered; without a header the first destination
  /// `container.padding-block` below the top.
  @Test("NVR-12 the header, and the destinations header.gap below it, container.gap apart; padding-block without a header")
  func placement() throws {
    var custom = system
    custom.navigationRail.conditions.unselected.enabled.itemContainerColor = .role(.warning)
    let indicator = light[.secondaryContainer].rgba8()
    let warning = light[.warning].rgba8()
    let withHeader = TanreiNavigationRail(selection: .constant("inbox")) {
      ForEach(names, id: \.self) { TanreiNavigationRailItem($0, icon: "", value: $0.lowercased()) }
    } header: {
      Rectangle().fill(light[.error]).frame(width: headerBlock.width, height: headerBlock.height)
      Rectangle().fill(light[.success]).frame(width: headerBlock.width, height: headerBlock.height)
    }
    .frame(height: height)
    let rendered = try Snapshot.render(withHeader, theme: theme(custom))
    let centerX = Snapshot.inset + tokens.containerWidth / 2
    // The header's two items: centered, the first padding-block below the top, the second container.gap below it.
    let first = try #require(verticalExtent(rendered, x: centerX, from: Snapshot.inset, to: Snapshot.inset + 100, color: light[.error].rgba8()))
    #expect(abs(first.min - (Snapshot.inset + tokens.containerPaddingBlock)) <= 0.5 && abs(first.max - first.min - headerBlock.height) <= 0.5, "\(first)")
    let across = try #require(horizontalExtent(rendered, y: first.min + 2, from: Snapshot.inset, to: Snapshot.inset + tokens.containerWidth, color: light[.error].rgba8()))
    #expect(abs((across.min + across.max) / 2 - centerX) <= 0.5)
    let second = try #require(verticalExtent(rendered, x: centerX, from: Snapshot.inset, to: Snapshot.inset + 150, color: light[.success].rgba8()))
    #expect(abs(second.min - (first.max + tokens.containerGap)) <= 0.5, "\(second)")
    // The first destination header.gap below the header's last item; the next container.gap below it.
    let destination = try #require(verticalExtent(rendered, x: centerX - 20, from: second.max, to: second.max + 80, color: indicator))
    #expect(abs(destination.min - (second.max + tokens.headerGap)) <= 0.5, "\(destination)")
    let labelled = tokens.itemContainerHeight + tokens.itemGap + tokens.itemLabelTypescale.lineHeight
    let next = try #require(verticalExtent(rendered, x: centerX - 20, from: destination.max + 1, to: destination.max + 80, color: warning))
    #expect(abs(next.min - (destination.min + labelled + tokens.containerGap)) <= 0.5, "\(next)")
    let box = try #require(horizontalExtent(rendered, y: destination.min + 2, from: Snapshot.inset, to: Snapshot.inset + tokens.containerWidth - 2, color: indicator))
    #expect(abs((box.min + box.max) / 2 - centerX) <= 0.5)
    // Without a header: padding-block below the top.
    let bare = try Snapshot.render(rail(), theme: theme(custom))
    let top = try #require(verticalExtent(bare, x: centerX - 20, from: Snapshot.inset, to: Snapshot.inset + 78, color: indicator))
    #expect(abs(top.min - (Snapshot.inset + tokens.containerPaddingBlock)) <= 0.5, "\(top)")
    // An empty header builder takes no room.
    let empty = TanreiNavigationRail(selection: .constant("inbox")) {
      ForEach(names, id: \.self) { TanreiNavigationRailItem($0, icon: "", value: $0.lowercased()) }
    } header: {
      if Bool(false) { Color.red }
    }
    .frame(height: height)
    let emptyTop = try #require(verticalExtent(try Snapshot.render(empty, theme: theme(custom)), x: centerX - 20, from: Snapshot.inset, to: Snapshot.inset + 78, color: indicator))
    #expect(emptyTop.min == top.min)
    #expect(TanreiNavigationRailMetrics(tokens: tokens, hasHeader: false, measure: system.measure).destinationsTop == tokens.containerPaddingBlock - tokens.containerGap / 2)
  }

  /// NVR-13 — the item container is `item.container.width` × `.height`; the label is below it, `item.gap` away, centered;
  /// a label too long for one line takes two, the destination grows with it, and a longer one is cut after two lines.
  @Test("NVR-13 the item container's size, the label under it, two lines at most")
  func geometry() throws {
    var custom = system
    custom.navigationRail.conditions.selected.enabled.itemLabelColor = .role(.error)
    let rendered = try Snapshot.render(rail(), theme: theme(custom))
    let geometry = Geometry()
    let indicator = light[.secondaryContainer].rgba8()
    let across = try #require(horizontalExtent(rendered, y: geometry.containerCenterY(0), from: Snapshot.inset, to: Snapshot.inset + 78, color: indicator))
    #expect(abs((across.max - across.min) - tokens.itemContainerWidth) <= 0.5)
    let down = try #require(verticalExtent(rendered, x: geometry.centerX - 20, from: Snapshot.inset, to: geometry.labelRect(0).minY - 1, color: indicator))
    #expect(abs(down.min - geometry.containerTop(0)) <= 0.5 && abs((down.max - down.min) - tokens.itemContainerHeight) <= 0.5, "\(down)")
    let label = geometry.labelRect(0)
    let error = light[.error].rgba8()
    #expect(inks(rendered, error, in: label))
    let ink = try #require(horizontalExtent(rendered, y: label.midY, from: label.minX, to: label.maxX, color: error, tolerance: 60))
    #expect(abs((ink.min + ink.max) / 2 - geometry.centerX) <= 2)
    // Heights of three destinations, laid out at their ideal height: one line, two lines, and a label cut after two.
    func railHeight(_ titles: [String]) throws -> CGFloat {
      let rail = TanreiNavigationRail(selection: .constant("")) {
        ForEach(titles.indices, id: \.self) { TanreiNavigationRailItem(titles[$0], icon: "", value: "\($0)") }
      }
      return visualSize(try Snapshot.render(rail.fixedSize())).height
    }
    let ends = 2 * (tokens.containerPaddingBlock - tokens.containerGap / 2)
    let line = tokens.itemLabelTypescale.lineHeight
    let one = tokens.itemContainerHeight + tokens.itemGap + line + tokens.containerGap
    #expect(try railHeight(["A", "B", "C"]) == ends + 3 * one)
    #expect(try railHeight(["Shared with me", "B", "C"]) == ends + 3 * one + line)
    #expect(try railHeight(["A label far too long to be drawn on two lines of the rail", "B", "C"]) == ends + 3 * one + line)
    // The long label stays inside the rail's width.
    var long = custom
    long.navigationRail.conditions.selected.enabled.itemLabelColor = .role(.error)
    let cut = try Snapshot.render(
      TanreiNavigationRail(selection: .constant("a")) {
        TanreiNavigationRailItem("A label far too long to be drawn on two lines of the rail", icon: "", value: "a")
        TanreiNavigationRailItem("B", icon: "", value: "b")
        TanreiNavigationRailItem("C", icon: "", value: "c")
      }
      .frame(height: height), theme: theme(long))
    #expect(!inks(cut, error, in: CGRect(x: Snapshot.inset + tokens.containerWidth, y: Snapshot.inset, width: 10, height: 120)))
    #expect(!inks(cut, error, in: CGRect(x: Snapshot.inset - 10, y: Snapshot.inset, width: 10, height: 120)))
  }

  /// NVR-14 — always: every label; selected: only the selected destination's, the others' item containers centered in their
  /// (shorter) cells; never: none, every item container centered.
  @Test("NVR-14 always, selected and never draw the labels they say; a destination without one centers its container")
  func labelVisibility() throws {
    var custom = system
    custom.navigationRail.conditions.unselected.enabled.itemLabelColor = .role(.error)
    custom.navigationRail.conditions.selected.enabled.itemLabelColor = .role(.success)
    custom.navigationRail.conditions.unselected.enabled.itemContainerColor = .role(.warning)
    let error = light[.error].rgba8()
    let success = light[.success].rgba8()
    let warning = light[.warning].rgba8()
    let geometry = Geometry()
    let always = try Snapshot.render(rail(selection: .constant("inbox")), theme: theme(custom))
    #expect(inks(always, success, in: geometry.labelRect(0)) && inks(always, error, in: geometry.labelRect(1)))
    // Selected: the first (selected) cell with its label, the second without, its item container centered in a cell of the
    // touch target.
    let selected = try Snapshot.render(rail(selection: .constant("inbox"), visibility: .selected), theme: theme(custom))
    #expect(inks(selected, success, in: geometry.labelRect(0)))
    #expect(!inks(selected, error, in: CGRect(x: Snapshot.inset, y: geometry.cellTop(1), width: 79, height: 200)))
    let bare = Geometry(labelShown: false).cellHeight(labelShown: false)
    let secondTop = geometry.cellTop(1) + (bare - tokens.itemContainerHeight) / 2
    let found = try #require(verticalExtent(selected, x: geometry.fill(1).x, from: geometry.cellTop(1) - 2, to: geometry.cellTop(1) + bare, color: warning))
    #expect(abs(found.min - secondTop) <= 0.5, "\(found) vs \(secondTop)")
    let never = try Snapshot.render(rail(selection: .constant("inbox"), visibility: .never), theme: theme(custom))
    #expect(!inks(never, success, in: CGRect(x: Snapshot.inset, y: Snapshot.inset, width: 79, height: 300)))
    #expect(!inks(never, error, in: CGRect(x: Snapshot.inset, y: Snapshot.inset, width: 79, height: 300)))
  }

  /// NVR-15 — each icon is drawn at `item.icon.size`, in the icon color of its condition, with the family and fill of its
  /// condition: the icon slot is told its size and whether it is selected.
  @Test("NVR-15 the icon's size, color and selection state")
  func icon() throws {
    @MainActor final class Probe { var contexts: [TanreiIconContext?] = [] }
    struct ProbeView: View {
      let probe: Probe
      @Environment(\.tanreiIconContext) private var context
      var body: some View {
        probe.contexts.append(context)
        return Color.clear
      }
    }
    let probe = Probe()
    var sized = system
    sized.navigationRail.itemIconSize = 28
    _ = try Snapshot.render(
      TanreiNavigationRail(selection: .constant("b")) {
        TanreiNavigationRailItem("A", icon: .view(ProbeView(probe: probe)), value: "a")
        TanreiNavigationRailItem("B", icon: .view(ProbeView(probe: probe)), value: "b")
        TanreiNavigationRailItem("C", icon: "", value: "c")
      }
      .frame(height: height), theme: theme(sized))
    #expect(probe.contexts.contains(TanreiIconContext(size: 28, selected: false)))
    #expect(probe.contexts.contains(TanreiIconContext(size: 28, selected: true)))
    #expect(probe.contexts.allSatisfy { $0?.size == 28 })
    var custom = system
    custom.navigationRail.conditions.unselected.enabled.itemIconColor = .role(.error)
    custom.navigationRail.itemIconSize = 20
    let rendered = try Snapshot.render(rail(selection: .constant(""), icon: .view(Rectangle())), theme: theme(custom))
    let geometry = Geometry()
    let red = light[.error].rgba8()
    let across = try #require(horizontalExtent(rendered, y: geometry.containerCenterY(0), from: Snapshot.inset, to: Snapshot.inset + 80, color: red))
    #expect(abs((across.max - across.min) - 20) <= 0.5 && abs((across.min + across.max) / 2 - geometry.centerX) <= 0.5)
    let down = try #require(verticalExtent(rendered, x: geometry.centerX, from: Snapshot.inset, to: geometry.cellTop(1), color: red))
    #expect(abs((down.max - down.min) - 20) <= 0.5 && abs((down.min + down.max) / 2 - geometry.containerCenterY(0)) <= 0.5)
  }

  /// NVR-5 — the focus ring around the item container (outside it, with the gap of `sys.focus`), keyboard focus only, not
  /// dimmed by the state's opacity; the destination keeps its size.
  @Test("NVR-5 the focus ring around the item container, not dimmed")
  func focusRing() throws {
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.itemContainerShape, measure: system.measure)
    let x = Snapshot.inset + 40 - tokens.itemContainerWidth / 2 - metrics.outerCenterlineOutset
    let y = Snapshot.inset + 20
    let ring = light[.focusRing].rgba8()
    let focused = try Snapshot.render(chrome(focused: true))
    #expect(pixel(focused, x: x, y: y).isClose(to: ring, tolerance: 40))
    #expect(!pixel(try Snapshot.render(chrome()), x: x, y: y).isClose(to: ring, tolerance: 40))
    #expect(visualSize(focused) == visualSize(try Snapshot.render(chrome())))
    var dim = system
    dim.navigationRail.focused.opacity = 0.3
    #expect(pixel(try Snapshot.render(chrome(focused: true, tokens: dim.navigationRail), theme: theme(dim)), x: x, y: y).isClose(to: ring, tolerance: 40))
  }

  /// NVR-6 — a cell is never lower than `sys.target.touch`, even when its label is not drawn: under `.never` the cells are
  /// the touch target apart.
  @Test("NVR-6 each cell is at least the touch target high without its label")
  func target() throws {
    var custom = system
    custom.measure.targetTouch = 70
    custom.navigationRail.conditions.unselected.enabled.itemContainerColor = .role(.warning)
    let rendered = try Snapshot.render(rail(selection: .constant(""), visibility: .never), theme: theme(custom))
    let x = Geometry().fill(0).x
    let warning = light[.warning].rgba8()
    var tops: [CGFloat] = []
    var y = Snapshot.inset
    while y < Snapshot.inset + 300, tops.count < 3 {
      if pixel(rendered, x: x, y: y).isClose(to: warning, tolerance: 6), !pixel(rendered, x: x, y: y - 0.5).isClose(to: warning, tolerance: 6) { tops.append(y) }
      y += 0.5
    }
    #expect(tops.count == 3 && tops[1] - tops[0] == 70 && tops[2] - tops[1] == 70, "\(tops)")
    let metrics = TanreiNavigationRailMetrics(tokens: tokens, hasHeader: true, measure: custom.measure)
    #expect(metrics.minimumCellHeight == 70 && metrics.cellPadding == tokens.containerGap)
  }

  /// NVR-17 — a badge on the icon as the badge component draws it (a count's pill, a dot), kept while the destination is
  /// disabled; none without a badge.
  @Test("NVR-17 the badge on the icon: a count, a dot, kept while disabled")
  func badge() throws {
    var custom = system
    custom.badge.containerColor = .role(.error)
    let red = light[.error].rgba8()
    let geometry = Geometry()
    let badges = [0: TanreiNavigationBadge(count: 3, label: "3 unread"), 1: TanreiNavigationBadge(label: "New"), 2: TanreiNavigationBadge(count: 5)]
    let (rendered, _) = try Reports.collecting {
      try Snapshot.render(rail(disabled: [2], icon: .view(Color.clear), badges: badges), theme: theme(custom))
    }
    func badgeArea(_ index: Int) -> CGRect {
      let iconTop = geometry.containerCenterY(index) - tokens.itemIconSize / 2
      return CGRect(x: geometry.centerX, y: iconTop - 10, width: tokens.itemIconSize / 2 + 16, height: 20)
    }
    #expect(inks(rendered, red, in: badgeArea(0)) && inks(rendered, red, in: badgeArea(1)) && inks(rendered, red, in: badgeArea(2)))
    #expect(!inks(rendered, red, in: badgeArea(3)))
  }

  /// NVR-19 — the container reaches under the leading, top and bottom system insets; the header and the destinations stay
  /// inside them.
  @Test("NVR-19 the container reaches under the system insets, the destinations stay inside them")
  func insets() throws {
    var custom = system
    custom.navigationRail.containerColor = .role(.error)
    let inset: CGFloat = 20
    let inside = rail()
      .safeAreaPadding(.leading, inset)
      .safeAreaPadding(.vertical, inset)
    let rendered = try Snapshot.render(inside, theme: theme(custom))
    let red = light[.error].rgba8()
    #expect(visualSize(rendered) == CGSize(width: tokens.containerWidth + inset, height: height + 2 * inset))
    // Under the leading, top and bottom insets, the container's color.
    #expect(pixel(rendered, x: Snapshot.inset + 2, y: Snapshot.inset + 200).isClose(to: red))
    #expect(pixel(rendered, x: Snapshot.inset + inset + 40, y: Snapshot.inset + 2).isClose(to: red))
    #expect(pixel(rendered, x: Snapshot.inset + inset + 40, y: Snapshot.inset + height + 2 * inset - 2).isClose(to: red))
    // The destinations inside them: the first item container centered in the rail's width beside the leading inset,
    // padding-block below the top inset.
    let indicator = light[.secondaryContainer].rgba8()
    let x = Snapshot.inset + inset + tokens.containerWidth / 2
    let down = try #require(verticalExtent(rendered, x: x - 20, from: Snapshot.inset, to: Snapshot.inset + 100, color: indicator))
    #expect(abs(down.min - (Snapshot.inset + inset + tokens.containerPaddingBlock)) <= 0.5, "\(down)")
    let across = try #require(horizontalExtent(rendered, y: down.min + 2, from: Snapshot.inset, to: Snapshot.inset + inset + 78, color: indicator))
    #expect(abs((across.min + across.max) / 2 - x) <= 0.5)
  }

  /// NVR-22 — enlarged text keeps the rail's width, lets labels take their lines and grows each destination's height with
  /// them; item containers and icons keep their size. (Only iOS has Dynamic Type — macOS scales nothing —, so the label's
  /// line is enlarged through its token here, as the resolved style at an accessibility size is; the large-content viewer
  /// is iOS's and exercised in the Gallery.)
  @Test("NVR-22 a taller label line grows the destinations; the width, item containers and icons keep their size")
  func enlargedText() throws {
    var custom = system
    custom.navigationRail.itemLabelTypescale.lineHeight = 40
    let grown = try Snapshot.render(
      TanreiNavigationRail(selection: .constant("a")) {
        ForEach(["a", "b", "c"], id: \.self) { TanreiNavigationRailItem($0.uppercased(), icon: "", value: $0) }
      }
      .fixedSize(horizontal: false, vertical: true), theme: theme(custom))
    let ends = 2 * (tokens.containerPaddingBlock - tokens.containerGap / 2)
    #expect(visualSize(grown) == CGSize(width: tokens.containerWidth, height: ends + 3 * (tokens.itemContainerHeight + tokens.itemGap + 40 + tokens.containerGap)))
    let indicator = light[.secondaryContainer].rgba8()
    let top = Snapshot.inset + tokens.containerPaddingBlock
    let across = try #require(horizontalExtent(grown, y: top + tokens.itemContainerHeight / 2, from: Snapshot.inset, to: Snapshot.inset + 78, color: indicator))
    #expect(abs((across.max - across.min) - tokens.itemContainerWidth) <= 0.5)
    let resolved = tokens.itemLabelTypescale.resolved(policy: .system, dynamicTypeSize: .accessibility3).lineHeight
    #if os(iOS)
    #expect(resolved > tokens.itemLabelTypescale.lineHeight)
    #else
    #expect(resolved >= tokens.itemLabelTypescale.lineHeight)
    #endif
  }
}

// MARK: - Fixtures (one per spec fixture)

/// Draws a fixture of specs/navigation-rail.spec.json as a product writes it: one rail 400 high with no system insets; its
/// `header-button` items are standard medium `TanreiIconButton`s in the header, named by their label and drawing their
/// glyph (the item's content), and its `destination` items the rail's destinations in order; value, labelVisibility and
/// label apply to the rail and each destination's props to that destination.
@MainActor
enum TanreiNavigationRailFixtures {
  /// The fixtures' glyphs as SF Symbols, and whether the symbol has a `.fill` form.
  static let symbols: [String: (name: String, fills: Bool)] = [
    "inbox": ("tray", true), "send": ("paperplane", true), "star": ("star", true), "settings": ("gearshape", true), "chat": ("bubble.left", true),
    "folder": ("folder", true), "group": ("person.2", true), "schedule": ("clock", true), "delete": ("trash", true), "menu": ("line.3.horizontal", false),
  ]

  static let height: CGFloat = 400

  static func icon(_ name: String, selected: Bool) -> TanreiItemIcon {
    guard let symbol = symbols[name] else { return TanreiItemIcon(name) }
    return .image(Image(systemName: selected && symbol.fills ? "\(symbol.name).fill" : symbol.name))
  }

  static func destination(_ spec: SpecItem, selected: String) -> some View {
    let value = spec.string("value") ?? ""
    let badge = spec.bool("badge") == true ? TanreiNavigationBadge(count: spec.number("badgeCount").map { Int($0) }, label: spec.string("badgeLabel") ?? "") : nil
    return TanreiNavigationRailItem(spec.string("label") ?? "", icon: icon(spec.string("icon") ?? "", selected: value == selected), value: value, badge: badge)
      .disabled(spec.bool("disabled") ?? false)
  }

  static func headerButton(_ spec: SpecItem) -> some View {
    TanreiIconButton(spec.string("label") ?? "", action: {}) { Image(systemName: symbols[spec.content ?? ""]?.name ?? "questionmark") }
  }

  static func view(_ fixture: SpecFixture) -> some View {
    let items = fixture.items ?? []
    // NVR-12: a header-button item goes to the header wherever it stands among the items.
    let headerItems = items.filter { $0.kind == "header-button" }
    let destinations = items.filter { $0.kind == "destination" }
    let selected = fixture.string("value") ?? ""
    return TanreiNavigationRail(
      selection: .constant(selected), labelVisibility: fixture.string("labelVisibility").flatMap(TanreiNavigationLabelVisibility.init(rawValue:)) ?? .always,
      accessibilityLabel: LocalizedStringKey(fixture.string("label") ?? "")
    ) {
      ForEach(destinations.indices, id: \.self) { index in destination(destinations[index], selected: selected) }
    } header: {
      ForEach(headerItems.indices, id: \.self) { index in headerButton(headerItems[index]) }
    }
    .frame(height: height)
  }
}

@MainActor
@Suite("TanreiNavigationRail snapshots")
struct TanreiNavigationRailSnapshotTests {
  /// Mirrors `fixtures` in specs/navigation-rail.spec.json.
  nonisolated static let fixtures = ["four-destinations", "no-header", "labels-selected", "labels-never", "badges", "disabled", "long-label"]

  static func fixture(_ id: String) throws -> SpecFixture {
    try #require(try SpecFixture.load(spec: "navigation-rail").first { $0.id == id })
  }

  /// Differ from their baselines on GitHub's macOS runner only.
  nonisolated static let runnerOnlyDiffs: Set<String> = ["long-label"]

  @Test("NVR-11 NVR-12 fixture matches its baseline", arguments: fixtures)
  func fixture(_ id: String) throws {
    let view = TanreiNavigationRailFixtures.view(try Self.fixture(id))
    guard Self.runnerOnlyDiffs.contains(id) else { return try Snapshot.assert(view, named: id, suite: suiteName) }
    try withKnownIssue("CI runner rendering: long-label differs from its baseline on GitHub's macOS runner only (1.2% of pixels)", isIntermittent: true) {
      try Snapshot.assert(view, named: id, suite: suiteName)
    } matching: { isSnapshotDiff($0) }
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    #expect(try SpecFixture.load(spec: "navigation-rail").map(\.id) == Self.fixtures)
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiNavigationRailTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiNavigationRail preset snapshots")
struct TanreiNavigationRailPresetSnapshotTests {
  /// Four destinations under a menu button: the preset's container, end edge, header, indicator, both conditions' colors
  /// and the label style (the web's preset fixture too).
  nonisolated static let fixtureId = "four-destinations"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .m3ExpressiveLike, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiNavigationRailSnapshotTests.fixtures.contains(Self.fixtureId))
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try TanreiNavigationRailSnapshotTests.fixture(Self.fixtureId)
    try Snapshot.assert(TanreiNavigationRailFixtures.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
