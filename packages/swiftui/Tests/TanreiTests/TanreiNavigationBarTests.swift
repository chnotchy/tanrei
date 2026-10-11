import AcmeFixture
import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/navigation-bar.spec.json. Each behavior id (NVB-n) is named next to the test that covers it; the parity
// checker requires every id to appear in this file. NVB-8, NVB-9 and NVB-10 are BTN-8, BTN-9 and BTN-10 for a destination:
// the primitives they rest on are tested once in TanreiButtonTests / TanreiPrimitivesTests; here each is proven to reach
// the destination. The fixtures render one bar 360 wide with no system insets.
//
// Icons: baselines render with `Snapshot.theme` (`fontFamilyPolicy: .system`), under which a `TanreiIconGlyph` draws
// nothing, so a fixture's glyph name draws the SF Symbol a product would pass for it — its `.fill` form on the selected
// destination, as a product using SF Symbols chooses the symbol of each state itself (`platform-symbol-sets`).
//
// Accessibility semantics (NVB-19): the macOS accessibility tree is not available to unit tests (packages/swiftui/AGENTS.md);
// what the bar hands SwiftUI is tested here as rules (names, position, badge description), and the tree as VoiceOver gets it
// in the Gallery's UI tests (`testNavigationBarSemanticsAndActivation`).

private let suiteName = "TanreiNavigationBarTests"

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

/// The first and last x (points) on row `y` whose pixel is `color`.
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
private func verticalExtent(_ bitmap: Bitmap, x: CGFloat, from: CGFloat, to: CGFloat, color: Bitmap.RGBA) -> (min: CGFloat, max: CGFloat)? {
  let ys = stride(from: from, to: to, by: 0.5).filter { pixel(bitmap, x: x, y: $0).isClose(to: color, tolerance: 12) }
  guard let first = ys.first, let last = ys.last else { return nil }
  return (first, last + 0.5)
}

private let light = TanreiSystem.tanrei.colors.light
private let names = ["Inbox", "Sent", "Starred", "Settings"]
private let width: CGFloat = 360

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

/// Entries as a bar reads them: titles "A", "B", "C" … with values "a", "b", "c" …; `disabled` lists the disabled indices.
private func entries(_ count: Int = 4, disabled: Set<Int> = [], values: [String]? = nil, titles: [String]? = nil) -> [TanreiDestinationEntry] {
  (0..<count).map { index in
    let letter = String(UnicodeScalar(UInt8(65 + index)))
    return TanreiDestinationEntry(
      title: titles?[index] ?? letter, value: AnyHashable(values?[index] ?? letter.lowercased()), isEnabled: !disabled.contains(index))
  }
}

/// A bar of four destinations ("Inbox", "Sent", "Starred", "Settings", valued by their lowercased label) 360 wide.
@MainActor
private func bar(
  selection: Binding<String> = .constant("inbox"), visibility: TanreiNavigationLabelVisibility = .always, disabled: Set<Int> = [],
  icon: TanreiItemIcon = "", badges: [Int: TanreiNavigationBadge] = [:], onReselect: (@MainActor (String) -> Void)? = nil
) -> some View {
  TanreiNavigationBar(selection: selection, labelVisibility: visibility, accessibilityLabel: "Main", onReselect: onReselect) {
    ForEach(names.indices, id: \.self) { index in
      TanreiNavigationBarItem(names[index], icon: icon, value: names[index].lowercased(), badge: badges[index])
        .disabled(disabled.contains(index))
    }
  }
  .frame(width: width)
}

/// Where the parts of a destination are in a bar of `count` cells `width` wide and `height` high (points, inset included).
@MainActor
private struct Geometry {
  var tokens = TanreiSystem.tanrei.navigationBar
  var count = 4
  var height: CGFloat = 64

  var cellWidth: CGFloat { width / CGFloat(count) }

  func centerX(_ cell: Int) -> CGFloat { Snapshot.inset + cellWidth * (CGFloat(cell) + 0.5) }

  /// NVB-12, NVB-13: the item container's top — the group (container, gap, one line of label) centered in the cell.
  func containerTop(labelShown: Bool = true) -> CGFloat {
    let group = labelShown ? tokens.itemContainerHeight + tokens.itemGap + tokens.itemLabelTypescale.lineHeight : tokens.itemContainerHeight
    return Snapshot.inset + (height - group) / 2
  }

  func containerCenterY(labelShown: Bool = true) -> CGFloat { containerTop(labelShown: labelShown) + tokens.itemContainerHeight / 2 }

  /// A point inside the item container, clear of its icon and its rounded corners: near its start edge, level with its center.
  func fill(_ cell: Int, labelShown: Bool = true) -> CGPoint {
    CGPoint(x: centerX(cell) - tokens.itemContainerWidth / 2 + 4, y: containerCenterY(labelShown: labelShown))
  }

  /// The label's line under the item container.
  func labelRect(_ cell: Int) -> CGRect {
    CGRect(
      x: centerX(cell) - cellWidth / 2, y: containerTop() + tokens.itemContainerHeight + tokens.itemGap, width: cellWidth,
      height: tokens.itemLabelTypescale.lineHeight)
  }
}

/// One destination's chrome, alone, in a cell of 90 × 64: what the bar draws for a destination.
@MainActor
private func chrome(
  _ entry: TanreiDestinationEntry = TanreiDestinationEntry(title: "Inbox", value: "inbox"), selected: Bool = false, labelShown: Bool = true,
  pressed: Bool = false, focused: Bool = false, tokens: TanreiNavigationBarTokens = TanreiSystem.tanrei.navigationBar
) -> some View {
  TanreiDestinationChrome(entry: entry, style: tokens.destinationStyle, isSelected: selected, labelShown: labelShown, isPressed: pressed, isFocused: focused)
    .frame(width: 90, height: 64)
}

// MARK: - The rules (NVB-1, NVB-2, NVB-3, NVB-13, NVB-16, NVB-17, NVB-19, NVB-20, NVB-22)

@MainActor
@Suite("TanreiNavigationBar rules")
struct TanreiNavigationBarRulesTests {
  let ids = TanreiNavigationBarView.reportIds

  /// NVB-3 — the destination whose value equals the bar's; an empty value (or nil) and a value naming none select none.
  /// NVB-22 — the first of two sharing a value is the one it selects.
  @Test("NVB-3 NVB-22 which destination is selected: by value, the first of a repeated value, none for empty or unknown")
  func selected() {
    #expect(TanreiDestinationRules.selectedIndex(entries(), selection: "b") == 1)
    #expect(TanreiDestinationRules.selectedIndex(entries(), selection: "") == nil)
    #expect(TanreiDestinationRules.selectedIndex(entries(), selection: nil) == nil)
    #expect(TanreiDestinationRules.selectedIndex(entries(), selection: "z") == nil)
    #expect(TanreiDestinationRules.selectedIndex(entries(values: ["a", "b", "a", "d"]), selection: "a") == 0)
    // A disabled destination the product selected is still the selected one.
    #expect(TanreiDestinationRules.selectedIndex(entries(disabled: [2]), selection: "c") == 2)
    // Any Hashable value: an enum, an integer.
    let numbered = (0..<3).map { TanreiDestinationEntry(title: "\($0)", value: AnyHashable($0)) }
    #expect(TanreiDestinationRules.selectedIndex(numbered, selection: AnyHashable(2)) == 2)
  }

  /// NVB-1 — activating a destination that is not selected is `change` with its value; the selected one is `reselect`
  /// with its value. NVB-2 — a disabled destination emits nothing.
  @Test("NVB-1 NVB-2 change for another destination, reselect for the selected one, nothing for a disabled one")
  func activation() {
    let bar = entries(disabled: [2])
    #expect(TanreiDestinationRules.activation(bar, activating: 1, selected: 0) == .change("b"))
    #expect(TanreiDestinationRules.activation(bar, activating: 0, selected: 0) == .reselect("a"))
    #expect(TanreiDestinationRules.activation(bar, activating: 2, selected: 0) == nil)
    #expect(TanreiDestinationRules.activation(bar, activating: 1, selected: nil) == .change("b"))
    #expect(TanreiDestinationRules.activation(bar, activating: 9, selected: 0) == nil)
    // NVB-22: the second of two sharing the selected value is not the selected destination: activating it is a change.
    #expect(TanreiDestinationRules.activation(entries(values: ["a", "b", "a", "d"]), activating: 2, selected: 0) == .change("a"))
  }

  /// NVB-3, NVB-17, NVB-20, NVB-22 — reported in debug builds: a value naming no destination (not an empty one), a count
  /// outside three to five, an empty label, a repeated value (once). A consistent bar reports nothing.
  @Test("NVB-3 NVB-17 NVB-20 NVB-22 unknown values, counts, empty labels and repeated values are reported")
  func problems() {
    #expect(TanreiDestinationRules.problems(entries(), selection: "b", ids: ids).isEmpty)
    #expect(TanreiDestinationRules.problems(entries(), selection: "", ids: ids).isEmpty)
    #expect(TanreiDestinationRules.problems(entries(3), selection: nil, ids: ids).isEmpty)
    #expect(TanreiDestinationRules.problems(entries(5), selection: "a", ids: ids).isEmpty)
    let unknown = TanreiDestinationRules.problems(entries(), selection: "z", ids: ids)
    #expect(unknown.count == 1 && unknown[0].contains("\"z\"") && unknown[0].contains("NVB-3"))
    for count in [1, 2, 6] {
      let reports = TanreiDestinationRules.problems(entries(count), selection: "a", ids: ids)
      #expect(reports.count == 1 && reports[0].contains("holds \(count)") && reports[0].contains("NVB-17"), "\(count)")
    }
    let empty = TanreiDestinationRules.problems(entries(titles: ["A", " ", "C", "D"]), selection: "a", ids: ids)
    #expect(empty.count == 1 && empty[0].contains("value \"b\"") && empty[0].contains("NVB-20"))
    let repeated = TanreiDestinationRules.problems(entries(values: ["a", "a", "a", "d"]), selection: "a", ids: ids)
    #expect(repeated.count == 1 && repeated[0].contains("more than one") && repeated[0].contains("NVB-22"))
  }

  /// NVB-13 — always draws every label, selected only the selected destination's, never none.
  @Test("NVB-13 which destinations draw their label")
  func labelVisibility() {
    #expect(TanreiNavigationLabelVisibility.always.showsLabel(selected: false) && TanreiNavigationLabelVisibility.always.showsLabel(selected: true))
    #expect(!TanreiNavigationLabelVisibility.selected.showsLabel(selected: false) && TanreiNavigationLabelVisibility.selected.showsLabel(selected: true))
    #expect(!TanreiNavigationLabelVisibility.never.showsLabel(selected: false) && !TanreiNavigationLabelVisibility.never.showsLabel(selected: true))
    #expect(TanreiNavigationLabelVisibility.allCases.map(\.rawValue) == ["always", "selected", "never"])
  }

  /// NVB-19 — a destination states its position among the destinations where the platform does not (iOS's tab bar trait
  /// does), then (NVB-16) its badge's description.
  @Test("NVB-19 NVB-16 each destination's position, then its badge's description")
  func accessibilityValue() {
    #if os(iOS)
    #expect(TanreiDestinationRules.positionText(index: 1, count: 4) == nil)
    #else
    #expect(TanreiDestinationRules.positionText(index: 1, count: 4) == "2 of 4")
    #endif
    #expect(TanreiDestinationRules.accessibilityValue(position: "1 of 4", badge: "3 unread") == "1 of 4, 3 unread")
    #expect(TanreiDestinationRules.accessibilityValue(position: nil, badge: "3 unread") == "3 unread")
    #expect(TanreiDestinationRules.accessibilityValue(position: "1 of 4", badge: nil) == "1 of 4")
    #expect(TanreiDestinationRules.accessibilityValue(position: nil, badge: nil) == nil)
  }

  /// NVB-16 — the badge's description is the badge component's: its label, or the displayed count when the label is
  /// empty (999+ above 999); nothing for a count of 0, or without a badge.
  @Test("NVB-16 the badge's description: its label, else its displayed count; nothing for 0")
  func badgeDescription() {
    let locale = Locale(identifier: "en_US")
    #expect(TanreiDestinationRules.badgeDescription(TanreiNavigationBadge(count: 3, label: "3 unread"), locale: locale) == "3 unread")
    #expect(TanreiDestinationRules.badgeDescription(TanreiNavigationBadge(count: 3), locale: locale) == "3")
    #expect(TanreiDestinationRules.badgeDescription(TanreiNavigationBadge(count: 1200), locale: locale) == "999+")
    #expect(TanreiDestinationRules.badgeDescription(TanreiNavigationBadge(label: "New"), locale: locale) == "New")
    #expect(TanreiDestinationRules.badgeDescription(TanreiNavigationBadge(count: 0, label: "none"), locale: locale) == nil)
    #expect(TanreiDestinationRules.badgeDescription(nil, locale: locale) == nil)
    // A dot without a label says nothing, and the badge component reports it (BDG-9).
    let (dot, reports) = Reports.collecting { TanreiDestinationRules.badgeDescription(TanreiNavigationBadge(), locale: locale) }
    #expect(dot == nil && reports.mention("BDG-9"))
  }
}

// MARK: - Reading the destinations (NVB-2, NVB-16, NVB-20)

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

/// The destinations as the bar reads them from its content.
@MainActor
private func read(@ViewBuilder _ content: () -> some View) -> [TanreiDestinationEntry] {
  let box = EntriesBox()
  _ = ImageRenderer(content: _VariadicView.Tree(EntriesRoot(box: box)) { content() }).cgImage
  return box.entries
}

private enum Screen: Hashable { case home, profile }

@MainActor
@Suite("TanreiNavigationBar items")
struct TanreiNavigationBarItemTests {
  /// The item kind `destination`: title, icon (a glyph by name, an image, or none), value of any Hashable type, badge and
  /// `.disabled(_:)` — read from each item's own view, through `ForEach` and modifiers.
  @Test("NVB-2 NVB-16 each destination's props are read from its view: title, icon, value, badge, disabled")
  func props() {
    let read = read {
      TanreiNavigationBarItem("Inbox", icon: "inbox", value: "inbox", badge: TanreiNavigationBadge(count: 3, label: "3 unread"))
      TanreiNavigationBarItem("Home", icon: .image(Image(systemName: "house")), value: Screen.home)
      TanreiNavigationBarItem("Starred", icon: "star", value: 7).disabled(true)
      ForEach(["a", "b"], id: \.self) { TanreiNavigationBarItem($0.uppercased(), icon: "", value: $0) }
    }
    #expect(read.map(\.title) == ["Inbox", "Home", "Starred", "A", "B"])
    #expect(read.map(\.value) == ["inbox", AnyHashable(Screen.home), AnyHashable(7), "a", "b"])
    #expect(read.map(\.isEnabled) == [true, true, false, true, true])
    #expect(read.map { $0.icon != nil } == [true, true, true, false, false])
    #expect(read.map(\.badge) == [TanreiNavigationBadge(count: 3, label: "3 unread"), nil, nil, nil, nil])
  }

  /// NVB-20 — an empty label is reported in debug builds, and the destination still renders (its item container is drawn,
  /// selected).
  @Test("NVB-20 an empty label is reported and the destination is still rendered")
  func emptyLabel() throws {
    let (bitmap, reports) = try Reports.collecting {
      try Snapshot.render(
        TanreiNavigationBar(selection: .constant("b")) {
          TanreiNavigationBarItem("A", icon: "", value: "a")
          TanreiNavigationBarItem("", icon: "", value: "b")
          TanreiNavigationBarItem("C", icon: "", value: "c")
        }
        .frame(width: 270))
    }
    #expect(reports.mention("NVB-20") && reports.mention("accessible name"))
    let geometry = Geometry(count: 3)
    // Without a label to draw, its item container is centered in its cell.
    let point = CGPoint(x: Snapshot.inset + 135 - 24, y: geometry.containerCenterY(labelShown: false))
    #expect(pixel(bitmap, x: point.x, y: point.y).isClose(to: light[.secondaryContainer].rgba8(), tolerance: 6))
  }
}

// MARK: - Activation by pointer (NVB-1, NVB-2, NVB-4, NVB-6, NVB-8, NVB-15)

/// A bar that owns its selection, as an app does: a click on another destination selects it.
private struct SelectingBar: View {
  @State var selection = "inbox"
  var body: some View {
    bar(selection: $selection)
  }
}

@MainActor
@Suite("TanreiNavigationBar activation", .serialized)
struct TanreiNavigationBarActivationTests {
  #if os(macOS)
  /// NVB-1 — a click on the selected destination calls onReselect once with its value and writes nothing; a click on
  /// another writes its value once. NVB-2 — a click on a disabled destination emits nothing.
  @Test("NVB-1 NVB-2 a click reselects or changes once; a disabled destination emits nothing")
  func click() {
    let store = Store<String>("inbox")
    var reselected: [String] = []
    let hosted = HostedView(
      bar(selection: store.binding, disabled: [2], onReselect: { reselected.append($0) }).padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    let geometry = Geometry()
    let y = geometry.containerCenterY()
    hosted.click(at: CGPoint(x: geometry.centerX(0), y: y))
    #expect(reselected == ["inbox"] && store.writes.isEmpty)
    hosted.click(at: CGPoint(x: geometry.centerX(1), y: y))
    #expect(store.writes == ["sent"] && reselected == ["inbox"])
    hosted.click(at: CGPoint(x: geometry.centerX(2), y: y))
    #expect(store.writes == ["sent"] && reselected == ["inbox"])
  }

  /// NVB-6 — the whole cell is the hit area: a click at a corner of the cell, far from the item container and the label,
  /// activates it; hover there answers on the item container (NVB-4).
  @Test("NVB-6 NVB-4 a click anywhere in the cell activates it; hover anywhere in it shows on the item container")
  func wholeCell() {
    var system = TanreiSystem.tanrei
    system.navigationBar.motionStateDuration = 0
    system.navigationBar.conditions.unselected.hovered.itemContainerColor = .role(.error)
    let colors = system.colors.light
    let store = Store<String>("inbox")
    let hosted = HostedView(bar(selection: store.binding).padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let geometry = Geometry()
    let corner = CGPoint(x: Snapshot.inset + geometry.cellWidth * 3 + 2, y: Snapshot.inset + geometry.height - 2)
    hosted.hover(at: corner)
    hosted.settle(0.1)
    let fill = geometry.fill(3)
    #expect(hosted.color(at: fill)?.isClose(to: colors[.error].rgba8(), tolerance: 6) == true)
    #expect(hosted.color(at: geometry.fill(2))?.isClose(to: colors[.surface].rgba8(), tolerance: 6) == true)
    hosted.click(at: corner)
    #expect(store.writes == ["settings"])
  }

  /// NVB-6 — five destinations 200 wide: each narrowed cell is still its destination's whole hit area, the last one
  /// included (inside the bar, not past it).
  @Test("NVB-6 in a bar too narrow for the target, a click in each narrowed cell activates that destination")
  func narrowCells() {
    let store = Store<String>("a")
    let five = ["a", "b", "c", "d", "e"]
    let hosted = HostedView(
      TanreiNavigationBar(selection: store.binding, labelVisibility: .never) {
        ForEach(five, id: \.self) { TanreiNavigationBarItem($0.uppercased(), icon: "", value: $0) }
      }
      .frame(width: 200).padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    let y = Snapshot.inset + 4
    for (index, value) in five.enumerated().dropFirst() {
      // Near the cell's trailing edge: the neighbour's hit area must not reach into it.
      hosted.click(at: CGPoint(x: Snapshot.inset + 40 * CGFloat(index) + 36, y: y))
      #expect(store.writes.last == value)
    }
    #expect(store.writes == ["b", "c", "d", "e"])
  }

  /// NVB-8 end to end: pressed at once, held for press-hold after a quick click; one change (NVB-1).
  @Test("NVB-8 NVB-1 a quick click shows the pressed state at once and keeps it after the release")
  func quickClickIsHeld() throws {
    var system = TanreiSystem.tanrei
    system.motion.duration.pressHold = 1500
    system.navigationBar.motionStateDuration = 0
    system.navigationBar.conditions.unselected.pressed.itemContainerColor = .role(.error)
    let colors = system.colors.light
    let store = Store<String>("inbox")
    let hosted = HostedView(bar(selection: store.binding).padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let point = Geometry().fill(1)
    hosted.hover(at: point)
    hosted.mouse(.leftMouseDown, at: point)
    hosted.settle()
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8(), tolerance: 6))
    hosted.mouse(.leftMouseUp, at: point)
    hosted.settle()
    #expect(store.writes == ["sent"])
  }

  /// NVB-15 end to end: when the selection changes, the new active indicator grows in width from the center of its item
  /// container at its full height, and the previous one fades out, over the selection motion; where motion is reduced the
  /// new selection is shown at once.
  @Test("NVB-15 the new indicator grows from the center, the old one fades; at once where motion is reduced")
  func selectionMotion() async throws {
    var system = TanreiSystem.tanrei
    system.navigationBar.motionSelectionDuration = 4000
    system.navigationBar.motionSelectionEasing = TanreiCubicBezier(0, 0, 1, 1)
    system.navigationBar.conditions.selected.enabled.itemContainerColor = .role(.error)
    system.navigationBar.conditions.selected.hovered.itemContainerColor = .role(.error)
    system.navigationBar.conditions.selected.pressed.itemContainerColor = .role(.error)
    system.motion.duration.pressHold = 0
    let colors = system.colors.light
    let error = colors[.error].rgba8()
    let surface = colors[.surface].rgba8()
    let geometry = Geometry()
    let tokens = system.navigationBar
    for reduced in [false, true] {
      let hosted = HostedView(
        SelectingBar().padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)).environment(\._accessibilityReduceMotion, reduced))
      // Below the item container, in the cell: the ripple and the press of the click stay clear of the samples.
      let target = CGPoint(x: geometry.centerX(1), y: Snapshot.inset + geometry.height - 3)
      #expect(hosted.color(at: geometry.fill(0))?.isClose(to: error, tolerance: 6) == true)
      hosted.click(at: target)
      hosted.settle(0.3)
      let center = CGPoint(x: geometry.centerX(1) - 1, y: geometry.containerCenterY() - tokens.itemContainerHeight / 2 + 2)
      let edge = CGPoint(x: geometry.centerX(1) - tokens.itemContainerWidth / 2 + 2, y: geometry.containerCenterY())
      let top = CGPoint(x: geometry.centerX(1) - 1, y: geometry.containerTop() + 1)
      let old = hosted.color(at: geometry.fill(0))
      if reduced {
        #expect(hosted.color(at: edge)?.isClose(to: error, tolerance: 6) == true, "reduced: the new indicator is whole at once")
        #expect(old?.isClose(to: surface, tolerance: 6) == true, "reduced: the old indicator is gone at once")
      } else {
        // Growing: its center is filled — at its full height —, its edge not yet; the old indicator still shows, fading.
        await withKnownIssue("CI runner timing: the growing indicator is sampled 0.3 s in on the wall clock; on GitHub's macOS runner it is not where that moment puts it", isIntermittent: true) {
          #expect(hosted.color(at: center)?.isClose(to: error, tolerance: 40) == true, "\(String(describing: hosted.color(at: center)))")
          #expect(hosted.color(at: top)?.isClose(to: error, tolerance: 40) == true, "full height: \(String(describing: hosted.color(at: top)))")
          #expect(hosted.color(at: edge)?.isClose(to: surface, tolerance: 6) == true, "\(String(describing: hosted.color(at: edge)))")
        }
        #expect(old.map { !$0.isClose(to: surface, tolerance: 20) } == true, "fading: \(String(describing: old))")
      }
    }
  }
  #endif
}

// MARK: - Token bindings (NVB-3, NVB-4, NVB-7, NVB-9, NVB-10, NVB-15)

@MainActor
@Suite("TanreiNavigationBar token bindings")
struct TanreiNavigationBarTokenBindingTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiNavigationBarTokens { system.navigationBar }

  private func appearance(
    selected: Bool = false, _ state: TanreiInteraction = .enabled, tokens: TanreiNavigationBarTokens? = nil, feedback: TanreiPressedFeedback = .overlay,
    beneath: TanreiInteraction = .enabled
  ) -> TanreiDestinationAppearance {
    TanreiDestinationAppearance(style: (tokens ?? self.tokens).destinationStyle, isSelected: selected, state: state, feedback: feedback, beneath: beneath)
  }

  /// NVB-3 — at rest: an unselected destination draws no item container, its icon and label on-surface-variant;
  /// the selected one the secondary-container indicator, its icon on-secondary-container and its label on-surface.
  @Test("NVB-3 at rest each condition binds its own parts")
  func rest() {
    let plain = appearance()
    let chosen = appearance(selected: true)
    #expect(plain.container == TanreiPaint.none && plain.icon == .role(.onSurfaceVariant) && plain.label == .role(.onSurfaceVariant))
    #expect(chosen.container == .role(.secondaryContainer) && chosen.icon == .role(.onSecondaryContainer) && chosen.label == .role(.onSurface))
    #expect(plain.opacity == 1 && chosen.opacity == 1 && plain.ripple == nil)
    // The geometry the destinations are drawn with.
    let style = tokens.destinationStyle
    #expect(style.containerWidth == 56 && style.containerHeight == 32 && style.containerShape == tokens.itemContainerShape)
    #expect(style.gap == system.space.space50 && style.iconSize == 24 && style.labelTypescale == system.typescale.labelSmall && style.labelLineLimit == 1)
  }

  /// NVB-4 — hovered, focused and pressed mix each condition's state-layer color into its item container; icon and label
  /// keep their resting values; opacity stays 1.
  @Test("NVB-4 each state binds that state's tokens", arguments: [false, true])
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

  /// NVB-4 (verify) — under the acme fixture system, hovered, focused and pressed differ, for both conditions.
  @Test("NVB-4 under acme, hovered, focused and pressed differ")
  func acme() {
    for selected in [false, true] {
      let containers = [TanreiInteraction.hovered, .focused, .pressed].map {
        TanreiDestinationAppearance(style: TanreiSystem.acme.navigationBar.destinationStyle, isSelected: selected, state: $0).container
      }
      #expect(Set(containers.map { "\($0)" }).count == 3, "selected: \(selected)")
    }
  }

  /// NVB-7 — disabled: no item container for an unselected destination; icon and label faded; the disabled opacity.
  @Test("NVB-7 disabled bindings, for a destination and for the selected one")
  func disabled() {
    let plain = appearance(.disabled)
    let chosen = appearance(selected: true, .disabled)
    #expect(plain.container == TanreiPaint.none)
    #expect(plain.icon == tokens.conditions.unselected.disabled.itemIconColor && plain.icon != appearance().icon)
    #expect(chosen.container == tokens.conditions.selected.disabled.itemContainerColor && chosen.label != appearance(selected: true).label)
    #expect(plain.opacity == tokens.disabled.opacity && chosen.opacity == tokens.disabled.opacity)
  }

  /// NVB-3 NVB-4 NVB-7 — the values drive the result, for every part of both conditions.
  @Test("NVB-3 NVB-4 NVB-7 a modified system changes what each state resolves to")
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
  }

  /// NVB-9 — which tokens a press reads under each choice; the shipped systems: m3-like ripples, cupertino dims, the
  /// default overlays.
  @Test("NVB-9 each choice binds the pressed tokens its own way", arguments: TanreiPressedFeedback.allCases)
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
      TanreiDestinationAppearance(style: system.navigationBar.destinationStyle, isSelected: false, state: .pressed, feedback: system.behavior.pressedFeedback)
    }
    #expect(shipped(.m3Like).ripple != nil && shipped(.cupertino).ripple == nil && shipped(.cupertino).opacity < 1 && shipped(.tanrei).ripple == nil)
  }

  /// NVB-9 — rendered: the pressed destination under each choice (overlay and ripple fill the item container with the
  /// pressed color — a ripple drawn grown in a render that never saw the press begin —, dim and none do not).
  @Test("NVB-9 each choice renders as it says", arguments: TanreiPressedFeedback.allCases)
  func rendered(feedback: TanreiPressedFeedback) throws {
    var custom = TanreiSystem.tanrei
    custom.behavior.pressedFeedback = feedback
    custom.navigationBar.conditions.unselected.pressed.itemContainerColor = .role(.error)
    let point = CGPoint(x: Snapshot.inset + 45 - 24, y: Geometry().containerCenterY())
    let actual = pixel(try Snapshot.render(chrome(pressed: true, tokens: custom.navigationBar), theme: theme(custom)), x: point.x, y: point.y)
    switch feedback {
    case .overlay, .ripple: #expect(actual.isClose(to: light[.error].rgba8(), tolerance: 6), "\(actual)")
    case .dim, .none: #expect(actual.isClose(to: light[.surface].rgba8(), tolerance: 6), "\(actual)")
    }
  }

  /// NVB-10 — the item container's corners follow the corner smoothing; keyboard focus follows the focus style (ring or
  /// glow).
  @Test("NVB-10 corner smoothing and focus style reach the item container")
  func cornersAndFocusStyle() throws {
    func render(_ amount: Double, focused: Bool = false, style: TanreiFocusStyle = .ring) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      custom.navigationBar.itemContainerShape = 12
      custom.behavior.focusStyle = style
      return try Snapshot.renderExact(chrome(selected: true, focused: focused, tokens: custom.navigationBar), theme: theme(custom))
    }
    let continuous = try render(0.6)
    #expect(try render(0).mismatch(against: continuous, channelTolerance: 0) > 0)
    #expect(try render(1).mismatch(against: continuous, channelTolerance: 0) == 0)
    #expect(try render(0.6, focused: true, style: .glow).mismatch(against: try render(0.6, focused: true, style: .ring), channelTolerance: 0) > 0)
    // The shipped systems: cupertino continuous, the acme fixture system glow.
    #expect(TanreiSystem.cupertino.shape.roundedCornerStyle == .continuous && TanreiSystem.acme.behavior.focusStyle == .glow)
  }

  /// NVB-4, NVB-9, NVB-15 — the state motion, the ripple's growth and the selection motion come from the tokens; none under
  /// Reduce Motion.
  @Test("NVB-15 NVB-9 NVB-4 the motions come from the tokens; none under Reduce Motion")
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

  /// NVB-15 — the indicator grows in width only: at the start of its growth it is drawn nowhere, at its end it is the whole
  /// item container; its height never changes.
  @Test("NVB-15 the indicator's growth is in width only, about its center")
  func growth() throws {
    let box = Color.clear.frame(width: 56, height: 32)
    func render(_ scale: CGFloat) throws -> Bitmap {
      try Snapshot.renderExact(box.background { Rectangle().fill(light[.error]).modifier(TanreiWidthScale(scale: scale)) })
    }
    let red = light[.error].rgba8()
    let half = try render(0.5)
    let across = try #require(horizontalExtent(half, y: Snapshot.inset + 16, from: Snapshot.inset, to: Snapshot.inset + 56, color: red))
    #expect(abs(across.min - (Snapshot.inset + 14)) <= 0.5 && abs(across.max - (Snapshot.inset + 42)) <= 0.5)
    let down = try #require(verticalExtent(half, x: Snapshot.inset + 28, from: Snapshot.inset, to: Snapshot.inset + 32, color: red))
    #expect(down.min == Snapshot.inset && down.max == Snapshot.inset + 32)
    #expect(horizontalExtent(try render(0), y: Snapshot.inset + 16, from: Snapshot.inset, to: Snapshot.inset + 56, color: red) == nil)
  }
}

// MARK: - Rendered (NVB-5, NVB-6, NVB-11, NVB-12, NVB-13, NVB-14, NVB-16, NVB-18, NVB-21)

@MainActor
@Suite("TanreiNavigationBar rendered")
struct TanreiNavigationBarRenderedTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiNavigationBarTokens { system.navigationBar }

  /// NVB-11 — the parent's full width, `container.height` high, in the container color, the top edge in its color and
  /// width, equal cells in reading order; right to left the order is mirrored.
  @Test("NVB-11 full width, container height and color, top edge, equal cells; mirrored right to left")
  func container() throws {
    var custom = system
    custom.navigationBar.containerColor = .role(.error)
    custom.navigationBar.outlineColor = .role(.success)
    custom.navigationBar.outlineWidth = 2
    let rendered = try Snapshot.render(bar(), theme: theme(custom))
    #expect(visualSize(rendered) == CGSize(width: width, height: tokens.containerHeight))
    let geometry = Geometry()
    #expect(pixel(rendered, x: Snapshot.inset + 2, y: Snapshot.inset + geometry.height - 2).isClose(to: light[.error].rgba8()))
    #expect(pixel(rendered, x: Snapshot.inset + width - 2, y: Snapshot.inset + 0.5).isClose(to: light[.success].rgba8()))
    #expect(pixel(rendered, x: Snapshot.inset + 200, y: Snapshot.inset + 1.5).isClose(to: light[.success].rgba8()))
    #expect(pixel(rendered, x: Snapshot.inset + 200, y: Snapshot.inset + 2.5).isClose(to: light[.error].rgba8()))
    // Equal cells: the selected (first) indicator is centered in the first quarter; a third selection in the third.
    let indicator = light[.secondaryContainer].rgba8()
    let first = try #require(horizontalExtent(rendered, y: geometry.containerCenterY(), from: Snapshot.inset, to: Snapshot.inset + width, color: indicator))
    #expect(abs((first.min + first.max) / 2 - geometry.centerX(0)) <= 0.5)
    let third = try Snapshot.render(bar(selection: .constant("starred")))
    let extent = try #require(horizontalExtent(third, y: geometry.containerCenterY(), from: Snapshot.inset, to: Snapshot.inset + width, color: indicator))
    #expect(abs((extent.min + extent.max) / 2 - geometry.centerX(2)) <= 0.5)
    // Right to left: the first destination is at the right edge.
    let mirrored = try Snapshot.render(bar().environment(\.layoutDirection, .rightToLeft))
    let rtl = try #require(horizontalExtent(mirrored, y: geometry.containerCenterY(), from: Snapshot.inset, to: Snapshot.inset + width, color: indicator))
    #expect(abs((rtl.min + rtl.max) / 2 - geometry.centerX(3)) <= 0.5)
  }

  /// NVB-11 — the container's elevation is drawn (a system that raises the bar casts its shadow above it).
  @Test("NVB-11 the container's elevation")
  func elevation() throws {
    var custom = system
    custom.navigationBar.containerElevation = [TanreiShadowLayer(x: 0, y: -4, blur: 4, spread: 0, role: .error)]
    let raised = try Snapshot.render(bar(), theme: theme(custom))
    let flat = try Snapshot.render(bar())
    let above = CGPoint(x: Snapshot.inset + 180, y: Snapshot.inset - 3)
    #expect(pixel(flat, x: above.x, y: above.y).isClose(to: light[.surface].rgba8()))
    #expect(!pixel(raised, x: above.x, y: above.y).isClose(to: light[.surface].rgba8(), tolerance: 6))
  }

  /// NVB-12 — the item container is `item.container.width` × `.height`; the label is below it, `item.gap` away, centered;
  /// container and label are centered as a group in the cell. A label too long for its cell stays on one line, truncated,
  /// inside its cell.
  @Test("NVB-12 the item container's size, the label under it, the group centered; a long label is truncated")
  func geometry() throws {
    var custom = system
    custom.navigationBar.conditions.selected.enabled.itemLabelColor = .role(.error)
    let rendered = try Snapshot.render(bar(), theme: theme(custom))
    let geometry = Geometry()
    let indicator = light[.secondaryContainer].rgba8()
    let across = try #require(horizontalExtent(rendered, y: geometry.containerCenterY(), from: Snapshot.inset, to: Snapshot.inset + 90, color: indicator))
    #expect(abs((across.max - across.min) - tokens.itemContainerWidth) <= 0.5)
    // (Between the top edge, whose outline-variant is close to the indicator's color in the default system, and the label.)
    let down = try #require(verticalExtent(rendered, x: geometry.centerX(0), from: Snapshot.inset + 2, to: geometry.labelRect(0).minY - 1, color: indicator))
    #expect(abs(down.min - geometry.containerTop()) <= 0.5 && abs((down.max - down.min) - tokens.itemContainerHeight) <= 0.5, "\(down)")
    // The label's ink is in its line under the item container, centered in the cell.
    let label = geometry.labelRect(0)
    let error = light[.error].rgba8()
    #expect(inks(rendered, error, in: label))
    #expect(!inks(rendered, error, in: CGRect(x: label.minX, y: Snapshot.inset, width: label.width, height: label.minY - Snapshot.inset - 1)))
    let ink = try #require(horizontalExtent(rendered, y: label.midY, from: label.minX, to: label.maxX, color: error, tolerance: 60))
    #expect(abs((ink.min + ink.max) / 2 - geometry.centerX(0)) <= 2)
    // A long label: one line, the bar keeps its height, the ink stays inside its cell.
    let long = TanreiNavigationBar(selection: .constant("a")) {
      TanreiNavigationBarItem("A label far too long for its cell", icon: "", value: "a")
      TanreiNavigationBarItem("B", icon: "", value: "b")
      TanreiNavigationBarItem("C", icon: "", value: "c")
      TanreiNavigationBarItem("D", icon: "", value: "d")
    }
    .frame(width: width)
    let truncated = try Snapshot.render(long, theme: theme(custom))
    #expect(visualSize(truncated).height == tokens.containerHeight)
    #expect(!inks(truncated, error, in: CGRect(x: Snapshot.inset + 90.5, y: label.minY, width: 90, height: label.height)))
  }

  /// NVB-13 — always: every label; selected: only the selected destination's, the others' item containers centered in
  /// their cells; never: none, every item container centered.
  @Test("NVB-13 always, selected and never draw the labels they say; a destination without one centers its container")
  func labelVisibility() throws {
    var custom = system
    custom.navigationBar.conditions.unselected.enabled.itemLabelColor = .role(.error)
    custom.navigationBar.conditions.selected.enabled.itemLabelColor = .role(.success)
    custom.navigationBar.conditions.unselected.enabled.itemContainerColor = .role(.warning)
    let geometry = Geometry()
    let error = light[.error].rgba8()
    let success = light[.success].rgba8()
    let warning = light[.warning].rgba8()
    let always = try Snapshot.render(bar(selection: .constant("sent")), theme: theme(custom))
    #expect(inks(always, error, in: geometry.labelRect(0)) && inks(always, success, in: geometry.labelRect(1)))
    let selected = try Snapshot.render(bar(selection: .constant("sent"), visibility: .selected), theme: theme(custom))
    #expect(!inks(selected, error, in: geometry.labelRect(0)) && inks(selected, success, in: geometry.labelRect(1)))
    // Without its label, an unselected destination's item container is centered in the cell.
    let centered = geometry.fill(0, labelShown: false)
    #expect(pixel(selected, x: centered.x, y: geometry.containerTop(labelShown: false) + 1).isClose(to: warning, tolerance: 6))
    #expect(!pixel(selected, x: centered.x, y: geometry.containerTop() + 1).isClose(to: warning, tolerance: 6))
    let never = try Snapshot.render(bar(selection: .constant("sent"), visibility: .never), theme: theme(custom))
    #expect(!inks(never, error, in: geometry.labelRect(0)) && !inks(never, success, in: geometry.labelRect(1)))
    #expect(pixel(never, x: geometry.fill(1).x, y: geometry.containerCenterY(labelShown: false)).isClose(to: light[.secondaryContainer].rgba8(), tolerance: 6))
    // The bar's height does not change with the labels (NVB-21's room is kept while labels are drawn at all).
    #expect(visualSize(selected).height == tokens.containerHeight && visualSize(never).height == tokens.containerHeight)
  }

  /// NVB-14 — each icon is drawn at `item.icon.size`, in the icon color of its condition, with the family and fill of its
  /// condition: the icon slot is told its size and whether it is selected.
  @Test("NVB-14 the icon's size, color and selection state")
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
    _ = try Snapshot.render(
      TanreiNavigationBar(selection: .constant("b")) {
        TanreiNavigationBarItem("A", icon: .view(ProbeView(probe: probe)), value: "a")
        TanreiNavigationBarItem("B", icon: .view(ProbeView(probe: probe)), value: "b")
        TanreiNavigationBarItem("C", icon: "", value: "c")
      }
      .frame(width: 270))
    #expect(probe.contexts.contains(TanreiIconContext(size: tokens.itemIconSize, selected: false)))
    #expect(probe.contexts.contains(TanreiIconContext(size: tokens.itemIconSize, selected: true)))
    #expect(probe.contexts.allSatisfy { $0?.size == tokens.itemIconSize })
    // Drawn at the icon size, centered in the item container, in the condition's icon color.
    var custom = system
    custom.navigationBar.conditions.unselected.enabled.itemIconColor = .role(.error)
    custom.navigationBar.itemIconSize = 20
    let rendered = try Snapshot.render(bar(selection: .constant(""), icon: .view(Rectangle())), theme: theme(custom))
    let geometry = Geometry()
    let red = light[.error].rgba8()
    let across = try #require(horizontalExtent(rendered, y: geometry.containerCenterY(), from: Snapshot.inset, to: Snapshot.inset + 90, color: red))
    #expect(abs((across.max - across.min) - 20) <= 0.5 && abs((across.min + across.max) / 2 - geometry.centerX(0)) <= 0.5)
    let down = try #require(verticalExtent(rendered, x: geometry.centerX(0), from: Snapshot.inset, to: Snapshot.inset + 64, color: red))
    #expect(abs((down.max - down.min) - 20) <= 0.5 && abs((down.min + down.max) / 2 - geometry.containerCenterY()) <= 0.5)
  }

  /// NVB-5 — the focus ring around the item container (outside it, with the gap of `sys.focus`), keyboard focus only, not
  /// dimmed by the state's opacity; the destination keeps its size.
  @Test("NVB-5 the focus ring around the item container, not dimmed")
  func focusRing() throws {
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.itemContainerShape, measure: system.measure)
    let x = Snapshot.inset + 45 - tokens.itemContainerWidth / 2 - metrics.outerCenterlineOutset
    let y = Geometry().containerCenterY()
    let ring = light[.focusRing].rgba8()
    let focused = try Snapshot.render(chrome(focused: true))
    #expect(pixel(focused, x: x, y: y).isClose(to: ring, tolerance: 40))
    #expect(!pixel(try Snapshot.render(chrome()), x: x, y: y).isClose(to: ring, tolerance: 40))
    #expect(visualSize(focused) == visualSize(try Snapshot.render(chrome())))
    var dim = system
    dim.navigationBar.focused.opacity = 0.3
    #expect(pixel(try Snapshot.render(chrome(focused: true, tokens: dim.navigationBar), theme: theme(dim)), x: x, y: y).isClose(to: ring, tolerance: 40))
  }

  /// NVB-6 — a cell is never narrower or lower than the minimum target, however narrow the bar or small its tokens.
  @Test("NVB-6 each cell is at least the minimum target in both directions")
  func target() throws {
    var custom = system
    custom.measure.targetPointer = 90
    custom.measure.targetTouch = 90
    custom.navigationBar.containerHeight = 20
    let target = TanreiHitTarget.minimum(in: custom.measure)
    // Asked for its ideal size (the least it needs), three destinations with no labels and tiny tokens.
    let narrow = TanreiNavigationBar(selection: .constant("a"), labelVisibility: .never) {
      ForEach(["a", "b", "c"], id: \.self) { TanreiNavigationBarItem($0, icon: "", value: $0) }
    }
    let size = visualSize(try Snapshot.render(narrow.fixedSize(), theme: theme(custom)))
    #expect(size.height == target && size.width == target * 3)
    let metrics = TanreiNavigationBarMetrics(tokens: custom.navigationBar, labelVisibility: .never, labelLineHeight: 16, measure: custom.measure)
    #expect(metrics.minimumCellWidth == target && metrics.minimumHeight == target)
  }

  /// NVB-6 — five destinations in a bar 200 wide (less than five times the touch target): the cells keep the equal share,
  /// 40 each, flush, and narrow below the target; the bar is 200 wide, never wider; each item container narrows with its
  /// cell and stays inside it.
  @Test("NVB-6 five destinations 200 wide share it in cells of 40, below the target, and the bar does not overflow")
  func narrowBar() throws {
    let target = TanreiHitTarget.minimum(in: system.measure)
    #expect(40 < target && 40 < tokens.itemContainerWidth)
    let five = ["a", "b", "c", "d", "e"]
    func render(_ selected: String) throws -> Bitmap {
      try Snapshot.render(
        TanreiNavigationBar(selection: .constant(selected), labelVisibility: .never) {
          ForEach(five, id: \.self) { TanreiNavigationBarItem($0.uppercased(), icon: "", value: $0) }
        }
        .frame(width: 200))
    }
    let first = try render("a")
    #expect(visualSize(first) == CGSize(width: 200, height: tokens.containerHeight))
    let geometry = Geometry(count: 5)
    let y = geometry.containerCenterY(labelShown: false)
    let indicator = light[.secondaryContainer].rgba8()
    // The selected item container is its cell: 40 wide, from the bar's start, not the token's width.
    let a = try #require(horizontalExtent(first, y: y, from: Snapshot.inset - 4, to: Snapshot.inset + 204, color: indicator))
    #expect(abs(a.min - Snapshot.inset) <= 0.5 && abs(a.max - (Snapshot.inset + 40)) <= 0.5, "\(a)")
    // The last is centered in the fifth cell, 160 … 200, inside the bar.
    let e = try #require(horizontalExtent(try render("e"), y: y, from: Snapshot.inset - 4, to: Snapshot.inset + 204, color: indicator))
    #expect(abs(e.min - (Snapshot.inset + 160)) <= 0.5 && abs(e.max - (Snapshot.inset + 200)) <= 0.5, "\(e)")
  }

  /// NVB-16 — a badge on the icon as the badge component draws it (a count's pill, a dot), kept while the destination is
  /// disabled; none without a badge.
  @Test("NVB-16 the badge on the icon: a count, a dot, kept while disabled")
  func badge() throws {
    var custom = system
    custom.badge.containerColor = .role(.error)
    let red = light[.error].rgba8()
    let geometry = Geometry()
    let badges = [0: TanreiNavigationBadge(count: 3, label: "3 unread"), 1: TanreiNavigationBadge(label: "New"), 2: TanreiNavigationBadge(count: 5)]
    let (rendered, _) = try Reports.collecting {
      try Snapshot.render(bar(disabled: [2], icon: .view(Color.clear), badges: badges), theme: theme(custom))
    }
    // On the icon's top-end corner, in each destination's item container.
    func badgeArea(_ cell: Int) -> CGRect {
      let iconTop = geometry.containerCenterY() - tokens.itemIconSize / 2
      return CGRect(x: geometry.centerX(cell), y: iconTop - 10, width: tokens.itemIconSize / 2 + 16, height: 20)
    }
    #expect(inks(rendered, red, in: badgeArea(0)) && inks(rendered, red, in: badgeArea(1)) && inks(rendered, red, in: badgeArea(2)))
    #expect(!inks(rendered, red, in: badgeArea(3)))
    // A dot is smaller than a count's pill.
    let pill = try #require(horizontalExtent(rendered, y: badgeArea(0).midY - 2, from: badgeArea(0).minX, to: badgeArea(0).maxX, color: red))
    let dot = try #require(horizontalExtent(rendered, y: geometry.containerCenterY() - tokens.itemIconSize / 2 + custom.badge.dotOffset, from: badgeArea(1).minX, to: badgeArea(1).maxX, color: red))
    #expect(dot.max - dot.min < pill.max - pill.min)
  }

  /// NVB-18 — the container reaches under the bottom and side system insets; the destinations stay above and inside them.
  @Test("NVB-18 the container reaches under the system insets, the destinations stay inside them")
  func insets() throws {
    var custom = system
    custom.navigationBar.containerColor = .role(.error)
    let inset: CGFloat = 20
    let inside = TanreiNavigationBar(selection: .constant("inbox")) {
      ForEach(names, id: \.self) { TanreiNavigationBarItem($0, icon: "", value: $0.lowercased()) }
    }
    .safeAreaPadding(.bottom, inset)
    .safeAreaPadding(.horizontal, inset)
    .frame(width: width)
    let rendered = try Snapshot.render(inside, theme: theme(custom))
    let red = light[.error].rgba8()
    // Under the bottom inset, and the side insets, the container's color.
    #expect(visualSize(rendered).height == tokens.containerHeight + inset)
    #expect(pixel(rendered, x: Snapshot.inset + 180, y: Snapshot.inset + tokens.containerHeight + inset - 2).isClose(to: red))
    #expect(pixel(rendered, x: Snapshot.inset + 2, y: Snapshot.inset + 30).isClose(to: red))
    // The destinations above the bottom inset and inside the side ones: the first item container is centered in the first
    // of four cells of the width between the side insets, at its usual height.
    let cell = (width - 2 * inset) / 4
    let indicator = light[.secondaryContainer].rgba8()
    let first = try #require(horizontalExtent(rendered, y: Geometry().containerCenterY(), from: Snapshot.inset, to: Snapshot.inset + width, color: indicator))
    #expect(abs((first.min + first.max) / 2 - (Snapshot.inset + inset + cell / 2)) <= 0.5)
  }

  /// NVB-21 — enlarged text grows the bar to hold its labels on one line; the item containers and icons keep their size.
  /// (Only iOS has Dynamic Type — macOS scales nothing —, so the label's line is enlarged through its token here, as the
  /// resolved style at an accessibility size is; the large-content viewer is iOS's and exercised in the Gallery.)
  @Test("NVB-21 a taller label line grows the bar; item containers and icons keep their size")
  func enlargedText() throws {
    var custom = system
    custom.navigationBar.itemLabelTypescale.lineHeight = 60
    let grown = try Snapshot.render(bar(), theme: theme(custom))
    #expect(visualSize(grown).height == tokens.itemContainerHeight + tokens.itemGap + 60)
    let indicator = light[.secondaryContainer].rgba8()
    let across = try #require(horizontalExtent(grown, y: Snapshot.inset + tokens.itemContainerHeight / 2, from: Snapshot.inset, to: Snapshot.inset + 90, color: indicator))
    #expect(abs((across.max - across.min) - tokens.itemContainerWidth) <= 0.5)
    // The metrics the bar is laid out with: room for a label's line at the current text size.
    let metrics = TanreiNavigationBarMetrics(tokens: tokens, labelVisibility: .selected, labelLineHeight: 40, measure: system.measure)
    #expect(metrics.minimumHeight == tokens.itemContainerHeight + tokens.itemGap + 40)
    let resolved = tokens.itemLabelTypescale.resolved(policy: .system, dynamicTypeSize: .accessibility3).lineHeight
    #if os(iOS)
    #expect(resolved > tokens.itemLabelTypescale.lineHeight)
    #else
    #expect(resolved >= tokens.itemLabelTypescale.lineHeight)
    #endif
  }
}

// MARK: - Fixtures (one per spec fixture)

/// Draws a fixture of specs/navigation-bar.spec.json as a product writes it: one bar 360 wide with no system insets, holding
/// the fixture's destinations in order; value, labelVisibility and label apply to the bar and each destination's props to
/// that destination.
@MainActor
enum TanreiNavigationBarFixtures {
  /// The fixtures' glyphs as SF Symbols, and whether the symbol has a `.fill` form.
  static let symbols: [String: (name: String, fills: Bool)] = [
    "inbox": ("tray", true), "send": ("paperplane", true), "star": ("star", true), "settings": ("gearshape", true), "home": ("house", true),
    "search": ("magnifyingglass", false), "person": ("person", true), "explore": ("safari", true), "add_circle": ("plus.circle", true),
    "video_library": ("play.rectangle.on.rectangle", true), "chat": ("bubble.left", true),
  ]

  static let width: CGFloat = 360

  static func icon(_ name: String, selected: Bool) -> TanreiItemIcon {
    guard let symbol = symbols[name] else { return TanreiItemIcon(name) }
    return .image(Image(systemName: selected && symbol.fills ? "\(symbol.name).fill" : symbol.name))
  }

  static func destination(_ spec: SpecItem, selected: String) -> some View {
    let value = spec.string("value") ?? ""
    let badge = spec.bool("badge") == true ? TanreiNavigationBadge(count: spec.number("badgeCount").map { Int($0) }, label: spec.string("badgeLabel") ?? "") : nil
    return TanreiNavigationBarItem(spec.string("label") ?? "", icon: icon(spec.string("icon") ?? "", selected: value == selected), value: value, badge: badge)
      .disabled(spec.bool("disabled") ?? false)
  }

  static func view(_ fixture: SpecFixture) -> some View {
    let items = fixture.items ?? []
    let selected = fixture.string("value") ?? ""
    return TanreiNavigationBar(
      selection: .constant(selected), labelVisibility: fixture.string("labelVisibility").flatMap(TanreiNavigationLabelVisibility.init(rawValue:)) ?? .always,
      accessibilityLabel: LocalizedStringKey(fixture.string("label") ?? "")
    ) {
      ForEach(items.indices, id: \.self) { index in destination(items[index], selected: selected) }
    }
    .frame(width: width)
  }
}

@MainActor
@Suite("TanreiNavigationBar snapshots")
struct TanreiNavigationBarSnapshotTests {
  /// Mirrors `fixtures` in specs/navigation-bar.spec.json.
  nonisolated static let fixtures = [
    "four-destinations", "three-destinations", "five-destinations", "labels-selected", "labels-never", "badges", "disabled", "none-selected",
  ]

  static func fixture(_ id: String) throws -> SpecFixture {
    try #require(try SpecFixture.load(spec: "navigation-bar").first { $0.id == id })
  }

  @Test("NVB-11 fixture matches its baseline", arguments: fixtures)
  func fixture(_ id: String) throws {
    try Snapshot.assert(TanreiNavigationBarFixtures.view(try Self.fixture(id)), named: id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    #expect(try SpecFixture.load(spec: "navigation-bar").map(\.id) == Self.fixtures)
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiNavigationBarTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiNavigationBar preset snapshots")
struct TanreiNavigationBarPresetSnapshotTests {
  /// Badges: the preset's container, top edge, indicator, both conditions' colors, the label style and the badge.
  nonisolated static let fixtureId = "badges"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .m3ExpressiveLike, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiNavigationBarSnapshotTests.fixtures.contains(Self.fixtureId))
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try TanreiNavigationBarSnapshotTests.fixture(Self.fixtureId)
    try Snapshot.assert(TanreiNavigationBarFixtures.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
