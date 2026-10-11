import AcmeFixture
import SwiftUI
import Testing

@testable @_spi(Fixtures) import Tanrei

// Covers specs/navigation-drawer.spec.json. Each behavior id (NVD-n) is named next to the test that covers it; the parity
// checker requires every id to appear in this file. NVD-8, NVD-9 and NVD-10 are BTN-8, BTN-9 and BTN-10 for a destination.
// The standard fixtures render one drawer 560 high (the web's stage) with no system insets; the modal fixture renders the
// modal drawer in place over a 480 × 640 stage (the web's viewport), its scrim over all of it.
//
// Icons: baselines render with `Snapshot.theme` (`fontFamilyPolicy: .system`), under which a `TanreiIconGlyph` draws
// nothing, so a fixture's glyph name draws the SF Symbol a product would pass for it — its `.fill` form on the selected
// destination, as a product using SF Symbols chooses the symbol of each state itself (`platform-symbol-sets`).
//
// Accessibility semantics (NVD-23): the macOS accessibility tree is not available to unit tests (packages/swiftui/AGENTS.md);
// what the drawer hands SwiftUI is tested here as rules (names, positions, badge text, reports), and the tree as VoiceOver
// gets it in the Gallery's UI tests (`testNavigationDrawerSemanticsAndActivation`).

private let suiteName = "TanreiNavigationDrawerTests"

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
private func verticalExtent(
  _ bitmap: Bitmap, x: CGFloat, from: CGFloat, to: CGFloat, color: Bitmap.RGBA, tolerance: Int = 12
) -> (min: CGFloat, max: CGFloat)? {
  let ys = stride(from: from, to: to, by: 0.5).filter { pixel(bitmap, x: x, y: $0).isClose(to: color, tolerance: tolerance) }
  guard let first = ys.first, let last = ys.last else { return nil }
  return (first, last + 0.5)
}

private let light = TanreiSystem.tanrei.colors.light
private let names = ["Inbox", "Sent", "Drafts", "Trash"]
private let height: CGFloat = 560

/// A value outside any view — what a `Binding` in a real app points at — recording its writes. Observable, so a test that
/// changes it from outside (a product opening the drawer) redraws what reads it.
@MainActor
@Observable
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

/// Entries as a drawer reads them: titles "A", "B", "C" … with values "a", "b", "c" …; `disabled` lists the disabled indices.
private func entries(_ count: Int = 4, disabled: Set<Int> = [], values: [String]? = nil, titles: [String]? = nil) -> [TanreiNavigationDrawerEntry] {
  (0..<count).map { index in
    let letter = String(UnicodeScalar(UInt8(65 + index)))
    return TanreiNavigationDrawerEntry(
      title: titles?[index] ?? letter, value: AnyHashable(values?[index] ?? letter.lowercased()), isEnabled: !disabled.contains(index))
  }
}

/// A standard drawer of four destinations ("Inbox", "Sent", "Drafts", "Trash", valued by their lowercased label), outside any
/// section, 560 high, without a header.
@MainActor
private func drawer(
  selection: Binding<String> = .constant("inbox"), isPresented: Binding<Bool> = .constant(true), variant: TanreiNavigationDrawerVariant = .standard,
  disabled: Set<Int> = [], icon: TanreiItemIcon? = nil, badges: [Int: String] = [:], titles: [String] = names,
  onReselect: (@MainActor (String) -> Void)? = nil, inPlace: Bool = false, stage: CGSize? = nil
) -> some View {
  let base = TanreiNavigationDrawer(variant: variant, isPresented: isPresented, selection: selection, accessibilityLabel: "Mail", onReselect: onReselect) {
    ForEach(titles.indices, id: \.self) { index in
      Group {
        if let icon {
          TanreiNavigationDrawerItem(titles[index], icon: icon, value: names[index % names.count].lowercased(), badge: badges[index] ?? "")
        } else {
          TanreiNavigationDrawerItem(titles[index], value: names[index % names.count].lowercased(), badge: badges[index] ?? "")
        }
      }
      .disabled(disabled.contains(index))
    }
  }
  return (inPlace ? base.inPlace() : base).frame(width: stage?.width, height: stage?.height ?? height)
}

/// Where the parts of a drawer of destinations outside any section are (points, inset included).
@MainActor
private struct Geometry {
  var tokens = TanreiSystem.tanrei.navigationDrawer
  /// What is above the first row: its top is `container.padding-block` below the drawer's top, plus this.
  var above: CGFloat = 0

  /// NVD-12, NVD-13: the rows `item.container.height` high, `container.gap` apart, `container.padding-block` below the top.
  func rowTop(_ index: Int) -> CGFloat {
    Snapshot.inset + tokens.containerPaddingBlock + above + CGFloat(index) * (tokens.itemContainerHeight + tokens.containerGap)
  }

  func rowCenterY(_ index: Int) -> CGFloat { rowTop(index) + tokens.itemContainerHeight / 2 }

  /// The row's start (`container.padding-inline` inside the drawer) and width (the drawer's inner width).
  var rowX: CGFloat { Snapshot.inset + tokens.containerPaddingInline }
  var rowWidth: CGFloat { tokens.containerWidth - 2 * tokens.containerPaddingInline }

  /// A point inside the item container, clear of its content and its rounded corners: near its end, level with its center.
  func fill(_ index: Int) -> CGPoint {
    CGPoint(x: rowX + rowWidth - 6, y: rowCenterY(index))
  }

  /// A point inside the item container near its start, before any icon.
  func start(_ index: Int) -> CGPoint {
    CGPoint(x: rowX + 4, y: rowCenterY(index))
  }
}

// MARK: - The rules (NVD-1, NVD-2, NVD-3, NVD-15, NVD-17, NVD-19, NVD-20, NVD-23, NVD-24, NVD-26, NVD-28, NVD-29)

@MainActor
@Suite("TanreiNavigationDrawer rules")
struct TanreiNavigationDrawerRulesTests {
  let ids = TanreiNavigationDrawerRules.reportIds

  /// NVD-3 — the destination whose value equals the drawer's, wherever it stands; an empty value (or nil) and a value
  /// naming none select none. NVD-29 — the first of two sharing a value is the one it selects.
  @Test("NVD-3 NVD-29 which destination is selected: by value, the first of a repeated value, none for empty or unknown")
  func selected() {
    let rules = entries().map(\.rule)
    #expect(TanreiDestinationRules.selectedIndex(rules, selection: "b") == 1)
    #expect(TanreiDestinationRules.selectedIndex(rules, selection: "") == nil)
    #expect(TanreiDestinationRules.selectedIndex(rules, selection: nil) == nil)
    #expect(TanreiDestinationRules.selectedIndex(rules, selection: "z") == nil)
    #expect(TanreiDestinationRules.selectedIndex(entries(values: ["a", "b", "a", "d"]).map(\.rule), selection: "a") == 0)
  }

  /// NVD-1 — activating a destination that is not selected is `change` with its value; the selected one is `reselect`
  /// with its value. NVD-2 — a disabled destination emits nothing.
  @Test("NVD-1 NVD-2 change for another destination, reselect for the selected one, nothing for a disabled one")
  func activation() {
    let drawer = entries(disabled: [2]).map(\.rule)
    #expect(TanreiDestinationRules.activation(drawer, activating: 1, selected: 0) == .change("b"))
    #expect(TanreiDestinationRules.activation(drawer, activating: 0, selected: 0) == .reselect("a"))
    #expect(TanreiDestinationRules.activation(drawer, activating: 2, selected: 0) == nil)
    #expect(TanreiDestinationRules.activation(drawer, activating: 1, selected: nil) == .change("b"))
  }

  /// NVD-3, NVD-24, NVD-29 — reported in debug builds, with the drawer's ids: a value naming no destination, an empty
  /// destination label, a repeated value, and a modal drawer without a label. Any number of destinations is fine. A
  /// consistent drawer reports nothing.
  @Test("NVD-3 NVD-24 NVD-29 unknown values, empty labels, repeated values and a nameless modal drawer are reported")
  func problems() {
    func problems(_ entries: [TanreiNavigationDrawerEntry], _ selection: AnyHashable?, modal: Bool = false, label: Bool = true) -> [String] {
      TanreiNavigationDrawerRules.problems(
        TanreiNavigationDrawerModel(parts: entries.map { .destination($0) }), selection: selection, isModal: modal, hasLabel: label)
    }
    #expect(problems(entries(), "b").isEmpty)
    #expect(problems(entries(), "").isEmpty)
    #expect(problems(entries(1), "a").isEmpty && problems(entries(12), "a").isEmpty)
    #expect(problems(entries(), "b", modal: false, label: false).isEmpty)
    let unknown = problems(entries(), "z")
    #expect(unknown.count == 1 && unknown[0].contains("\"z\"") && unknown[0].contains("NVD-3"))
    let empty = problems(entries(titles: ["A", "", "C", "D"]), "a")
    #expect(empty.count == 1 && empty[0].contains("value \"b\"") && empty[0].contains("NVD-24"))
    let repeated = problems(entries(values: ["a", "a", "c", "d"]), "a")
    #expect(repeated.count == 1 && repeated[0].contains("more than one") && repeated[0].contains("NVD-29"))
    let nameless = problems(entries(), "a", modal: true, label: false)
    #expect(nameless.count == 1 && nameless[0].contains("NVD-24") && nameless[0].contains("without a name"))
  }

  /// NVD-17 — the content is read in order into destinations and sections; a section inside a section gives its
  /// destinations to the outer one in its place (its heading and divider are dropped) and is reported. NVD-12 — the order
  /// of what is laid out is reading order. NVD-3, NVD-23 — every destination counts, in a section or not.
  @Test("NVD-17 NVD-12 sections and destinations in reading order; a nested section is flattened into its parent and reported")
  func model() {
    let a = TanreiNavigationDrawerEntry(title: "A", value: "a")
    let b = TanreiNavigationDrawerEntry(title: "B", value: "b")
    let c = TanreiNavigationDrawerEntry(title: "C", value: "c")
    let d = TanreiNavigationDrawerEntry(title: "D", value: "d")
    let flat = TanreiNavigationDrawerModel(parts: [
      .destination(a), .section(.start(heading: "Mail", divider: false)), .destination(b), .destination(c), .section(.end), .destination(d),
    ])
    #expect(flat.entries.map(\.title) == ["A", "B", "C", "D"])
    #expect(flat.elements == [.destination(0), .section(heading: "Mail", divider: false, destinations: [1, 2]), .destination(3)])
    #expect(flat.problems.isEmpty)
    let nested = TanreiNavigationDrawerModel(parts: [
      .section(.start(heading: "Outer", divider: true)), .destination(a), .section(.start(heading: "Inner", divider: true)), .destination(b),
      .section(.end), .destination(c), .section(.end), .destination(d),
    ])
    #expect(nested.elements == [.section(heading: "Outer", divider: true, destinations: [0, 1, 2]), .destination(3)])
    #expect(nested.problems.count == 1 && nested.problems[0].contains("NVD-17") && nested.problems[0].contains("do not nest"))
  }

  /// NVD-23 — each destination states its position among all the drawer's destinations; NVD-15 — its badge text after it.
  @Test("NVD-23 NVD-15 each destination's position among all destinations, then its badge text")
  func accessibilityValue() {
    #expect(TanreiNavigationDrawerRules.accessibilityValue(index: 0, count: 6, badge: "24") == "1 of 6, 24")
    #expect(TanreiNavigationDrawerRules.accessibilityValue(index: 5, count: 6, badge: "") == "6 of 6")
  }

  /// NVD-19, NVD-28 — opening moves focus to the selected destination, else to the first enabled one; a disabled selected
  /// destination cannot take focus, so the first enabled one does.
  @Test("NVD-19 NVD-28 focus moves to the selected destination, else the first enabled one")
  func initialFocus() {
    #expect(TanreiNavigationDrawerRules.initialFocus(entries(), selected: 2) == 2)
    #expect(TanreiNavigationDrawerRules.initialFocus(entries(disabled: [0]), selected: nil) == 1)
    #expect(TanreiNavigationDrawerRules.initialFocus(entries(disabled: [2]), selected: 2) == 0)
    #expect(TanreiNavigationDrawerRules.initialFocus(entries(disabled: [0, 1, 2, 3]), selected: nil) == nil)
  }

  /// NVD-20 — a release closes the drawer past half its width, or flung toward the start at 0.5 points per millisecond or
  /// more (500 points per second); the drag is followed beyond 8 points.
  @Test("NVD-20 past half the width or a fling closes; the slop is 8 points")
  func dragThresholds() {
    #expect(TanreiNavigationDrawerRules.closes(distance: 141, velocity: 0, width: 280))
    #expect(!TanreiNavigationDrawerRules.closes(distance: 140, velocity: 0, width: 280))
    #expect(TanreiNavigationDrawerRules.closes(distance: 20, velocity: 500, width: 280))
    #expect(!TanreiNavigationDrawerRules.closes(distance: 20, velocity: 499, width: 280))
    #expect(!TanreiNavigationDrawerRules.closes(distance: 0, velocity: -2000, width: 280))
    #expect(TanreiNavigationDrawerRules.touchSlop == 8 && TanreiNavigationDrawerRules.flingVelocity == 0.5)
  }

  /// NVD-20 — closing writes `false` once while the drawer is presented, and nothing once it is closed (close is emitted
  /// exactly once), whatever closed it.
  @Test("NVD-20 closing writes false exactly once")
  func dismiss() {
    let open = Store<Bool>(true)
    TanreiNavigationDrawerRules.dismiss(open.binding)
    TanreiNavigationDrawerRules.dismiss(open.binding)
    #expect(open.writes == [false])
  }

  /// NVD-26 — only `modal` is presented as a modal overlay; any other value, one a design system adds included, is a
  /// layout region; a variant the system does not have reads the standard tokens and is reported.
  @Test("NVD-26 an unknown variant reads the standard tokens and is reported; only modal is modal")
  func unknownVariant() {
    #expect(TanreiNavigationDrawerRules.isModal(.modal))
    #expect(!TanreiNavigationDrawerRules.isModal(.standard) && !TanreiNavigationDrawerRules.isModal(TanreiNavigationDrawerVariant(rawValue: "floating")))
    let (tokens, reports) = Reports.collecting { TanreiSystem.tanrei.navigationDrawer.variants[TanreiNavigationDrawerVariant(rawValue: "floating")] }
    #expect(tokens == TanreiSystem.tanrei.navigationDrawer.variants.standard)
    #expect(reports.mention("\"floating\""))
  }
}

// MARK: - Reading the destinations and the sections (NVD-2, NVD-15, NVD-17, NVD-24)

private final class PartsBox: @unchecked Sendable {
  var parts: [TanreiNavigationDrawerPart] = []
}

private struct PartsRoot: _VariadicView_UnaryViewRoot {
  let box: PartsBox
  func body(children: _VariadicView.Children) -> some View {
    box.parts = children.compactMap { child in
      if let entry = child[TanreiNavigationDrawerEntryKey.self] { return .destination(entry) }
      if let mark = child[TanreiNavigationDrawerSectionKey.self] { return .section(mark) }
      return nil
    }
    return Color.clear.frame(width: 1, height: 1)
  }
}

/// The drawer's content, read as the drawer reads it.
@MainActor
private func read(@ViewBuilder _ content: () -> some View) -> TanreiNavigationDrawerModel {
  let box = PartsBox()
  _ = ImageRenderer(content: _VariadicView.Tree(PartsRoot(box: box)) { content() }).cgImage
  return TanreiNavigationDrawerModel(parts: box.parts)
}

private enum Page: Hashable { case overview, settings }

@MainActor
@Suite("TanreiNavigationDrawer items")
struct TanreiNavigationDrawerItemTests {
  /// The item kinds: a destination's title, icon (a glyph by name, an image, none), value of any Hashable type, badge and
  /// `.disabled(_:)`, and a section's heading, divider and destinations — read from each view, through `ForEach`, modifiers
  /// and sections; `.disabled(_:)` on a section reaches its destinations.
  @Test("NVD-2 NVD-15 NVD-17 each item's props are read from its view, through sections: title, icon, value, badge, disabled")
  func props() {
    let model = read {
      TanreiNavigationDrawerItem("Overview", value: Page.overview)
      TanreiNavigationDrawerSection("Mail") {
        TanreiNavigationDrawerItem("Inbox", icon: "inbox", value: "inbox", badge: "24")
        TanreiNavigationDrawerItem("Profile", icon: .image(Image(systemName: "person")), value: 7)
        TanreiNavigationDrawerItem("Drafts", icon: "", value: "drafts").disabled(true)
      }
      TanreiNavigationDrawerSection(divider: true) {
        ForEach(["a", "b"], id: \.self) { TanreiNavigationDrawerItem($0.uppercased(), icon: nil, value: $0) }
      }
      .disabled(true)
      TanreiNavigationDrawerItem("Settings", value: Page.settings)
    }
    #expect(model.entries.map(\.title) == ["Overview", "Inbox", "Profile", "Drafts", "A", "B", "Settings"])
    #expect(model.entries.map(\.value) == [AnyHashable(Page.overview), "inbox", AnyHashable(7), "drafts", "a", "b", AnyHashable(Page.settings)])
    #expect(model.entries.map(\.isEnabled) == [true, true, true, false, false, false, true])
    #expect(model.entries.map { $0.icon != nil } == [false, true, true, false, false, false, false])
    #expect(model.entries.map(\.badge) == ["", "24", "", "", "", "", ""])
    #expect(
      model.elements == [
        .destination(0), .section(heading: "Mail", divider: false, destinations: [1, 2, 3]), .section(heading: "", divider: true, destinations: [4, 5]),
        .destination(6),
      ])
  }

  /// NVD-17 — a section written inside a section: its destinations are drawn in its place, and it is reported.
  @Test("NVD-17 a nested section is reported and its destinations are still drawn")
  func nested() throws {
    var custom = TanreiSystem.tanrei
    custom.navigationDrawer.conditions.unselected.enabled.itemContainerColor = .role(.warning)
    let (bitmap, reports) = try Reports.collecting {
      try Snapshot.render(
        TanreiNavigationDrawer(isPresented: .constant(true), selection: .constant("")) {
          TanreiNavigationDrawerSection {
            TanreiNavigationDrawerItem("A", value: "a")
            TanreiNavigationDrawerSection("Inner", divider: true) {
              TanreiNavigationDrawerItem("B", value: "b")
            }
          }
        }
        .frame(height: 200), theme: theme(custom))
    }
    #expect(reports.mention("NVD-17"))
    let geometry = Geometry()
    // The inner section's destination follows the outer one's, `container.gap` below, with no heading or divider between.
    #expect(pixel(bitmap, x: geometry.fill(1).x, y: geometry.fill(1).y).isClose(to: light[.warning].rgba8(), tolerance: 6))
  }

  /// NVD-24 — an empty label is reported in debug builds, and the destination still renders (its row is drawn, selected).
  @Test("NVD-24 an empty label is reported and the destination is still rendered")
  func emptyLabel() throws {
    let (bitmap, reports) = try Reports.collecting {
      try Snapshot.render(
        TanreiNavigationDrawer(isPresented: .constant(true), selection: .constant("a")) {
          TanreiNavigationDrawerItem("", value: "a")
          TanreiNavigationDrawerItem("B", value: "b")
        }
        .frame(height: 200))
    }
    #expect(reports.mention("NVD-24") && reports.mention("accessible name"))
    let geometry = Geometry()
    #expect(pixel(bitmap, x: geometry.fill(0).x, y: geometry.fill(0).y).isClose(to: light[.secondaryContainer].rgba8(), tolerance: 6))
  }

  /// NVD-3 — a value naming no destination draws every destination unselected and is reported; NVD-29 — a repeated value
  /// selects the first and is reported; NVD-24 — a modal drawer without a label is reported.
  @Test("NVD-3 NVD-29 NVD-24 rendered: an unknown value selects none; a repeated one the first; a nameless modal drawer")
  func reported() throws {
    let geometry = Geometry()
    let indicator = light[.secondaryContainer].rgba8()
    let (unknown, unknownReports) = try Reports.collecting { try Snapshot.render(drawer(selection: .constant("nowhere"))) }
    #expect(unknownReports.mention("NVD-3"))
    #expect((0..<4).allSatisfy { !pixel(unknown, x: geometry.fill($0).x, y: geometry.fill($0).y).isClose(to: indicator, tolerance: 6) })
    let (repeated, repeatedReports) = try Reports.collecting {
      try Snapshot.render(
        TanreiNavigationDrawer(isPresented: .constant(true), selection: .constant("a")) {
          TanreiNavigationDrawerItem("A", value: "a")
          TanreiNavigationDrawerSection { TanreiNavigationDrawerItem("A again", value: "a") }
        }
        .frame(height: 200))
    }
    #expect(repeatedReports.mention("NVD-29"))
    #expect(pixel(repeated, x: geometry.fill(0).x, y: geometry.fill(0).y).isClose(to: indicator, tolerance: 6))
    #expect(!pixel(repeated, x: geometry.fill(1).x, y: geometry.fill(1).y).isClose(to: indicator, tolerance: 6))
    let (_, nameless) = try Reports.collecting {
      try Snapshot.render(
        TanreiNavigationDrawer(variant: .modal, isPresented: .constant(true), selection: .constant("a")) { TanreiNavigationDrawerItem("A", value: "a") }
          .inPlace()
          .frame(width: 400, height: 200))
    }
    #expect(nameless.mention("NVD-24") && nameless.mention("without a name"))
  }

  /// NVD-26 — rendered: an unknown variant is drawn with the standard tokens (its container color and end edge) and
  /// reported.
  @Test("NVD-26 an unknown variant renders as standard and is reported")
  func unknownVariant() throws {
    let (unknown, reports) = try Reports.collecting { try Snapshot.render(drawer(variant: TanreiNavigationDrawerVariant(rawValue: "floating"))) }
    #expect(reports.mention("\"floating\""))
    #expect(unknown.mismatch(against: try Snapshot.render(drawer()), channelTolerance: Snapshot.channelTolerance) <= Snapshot.allowedMismatch)
  }
}

// MARK: - Token bindings (NVD-3, NVD-4, NVD-7, NVD-9, NVD-10, NVD-18, NVD-19, NVD-22)

@MainActor
@Suite("TanreiNavigationDrawer token bindings")
struct TanreiNavigationDrawerTokenBindingTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiNavigationDrawerTokens { system.navigationDrawer }

  private func appearance(
    selected: Bool = false, _ state: TanreiInteraction = .enabled, tokens: TanreiNavigationDrawerTokens? = nil, feedback: TanreiPressedFeedback = .overlay,
    beneath: TanreiInteraction = .enabled
  ) -> TanreiNavigationDrawerItemAppearance {
    TanreiNavigationDrawerItemAppearance(tokens: tokens ?? self.tokens, isSelected: selected, state: state, feedback: feedback, beneath: beneath)
  }

  /// NVD-3 — at rest: an unselected destination draws no item container, its icon, label and badge on-surface-variant; the
  /// selected one the secondary-container indicator, its icon, label and badge on-secondary-container.
  @Test("NVD-3 at rest each condition binds its own parts")
  func rest() {
    let plain = appearance()
    let chosen = appearance(selected: true)
    #expect(plain.container == TanreiPaint.none && plain.icon == .role(.onSurfaceVariant) && plain.label == .role(.onSurfaceVariant))
    #expect(plain.badge == .role(.onSurfaceVariant))
    #expect(chosen.container == .role(.secondaryContainer) && chosen.icon == .role(.onSecondaryContainer) && chosen.label == .role(.onSecondaryContainer))
    #expect(chosen.badge == .role(.onSecondaryContainer))
    #expect(plain.opacity == 1 && chosen.opacity == 1 && plain.ripple == nil)
  }

  /// NVD-4 — hovered, focused and pressed mix each condition's state-layer color into its item container; icon, label and
  /// badge keep their resting values; opacity stays 1.
  @Test("NVD-4 each state binds that state's tokens", arguments: [false, true])
  func states(selected: Bool) {
    let rest = appearance(selected: selected)
    let condition = tokens.conditions[selected ? .selected : .unselected]
    for (state, amount) in [
      (TanreiInteraction.hovered, system.state.hoverStateLayerOpacity), (.focused, system.state.focusStateLayerOpacity), (.pressed, system.state.pressedStateLayerOpacity),
    ] {
      let drawn = appearance(selected: selected, state)
      #expect(drawn.container == .mix(base: rest.container, with: condition.enabled.itemStateLayerColor, amount: amount))
      #expect(drawn.icon == rest.icon && drawn.label == rest.label && drawn.badge == rest.badge && drawn.opacity == 1)
    }
  }

  /// NVD-4 (verify) — under the acme fixture system, hovered, focused and pressed differ, for both conditions.
  @Test("NVD-4 under acme, hovered, focused and pressed differ")
  func acme() {
    for selected in [false, true] {
      let containers = [TanreiInteraction.hovered, .focused, .pressed].map {
        TanreiNavigationDrawerItemAppearance(tokens: TanreiSystem.acme.navigationDrawer, isSelected: selected, state: $0).container
      }
      #expect(Set(containers.map { "\($0)" }).count == 3, "selected: \(selected)")
    }
  }

  /// NVD-7 — disabled: no item container for an unselected destination; icon, label and badge from the disabled tokens;
  /// the disabled opacity.
  @Test("NVD-7 disabled bindings, for a destination and for the selected one")
  func disabled() {
    let plain = appearance(.disabled)
    let chosen = appearance(selected: true, .disabled)
    #expect(plain.container == TanreiPaint.none)
    #expect(plain.icon == tokens.conditions.unselected.disabled.itemIconColor && plain.label == tokens.conditions.unselected.disabled.itemLabelColor)
    #expect(plain.badge == tokens.conditions.unselected.disabled.itemBadgeColor)
    #expect(chosen.container == tokens.conditions.selected.disabled.itemContainerColor && chosen.label == tokens.conditions.selected.disabled.itemLabelColor)
    #expect(plain.opacity == tokens.disabled.opacity && chosen.opacity == tokens.disabled.opacity)
  }

  /// NVD-3 NVD-4 NVD-7 — the values drive the result, for every part of both conditions, and are the drawer's (not the
  /// rail's).
  @Test("NVD-3 NVD-4 NVD-7 a modified system changes what each state resolves to")
  func modifiedSystem() {
    var custom = tokens
    custom.conditions.unselected.hovered.itemContainerColor = .role(.error)
    custom.conditions.selected.focused.itemLabelColor = .role(.warning)
    custom.conditions.selected.pressed.itemIconColor = .role(.success)
    custom.conditions.unselected.disabled.itemBadgeColor = .role(.info)
    custom.conditions.selected.enabled.itemContainerColor = .role(.primary)
    custom.pressed.opacity = 0.5
    #expect(appearance(.hovered, tokens: custom).container == .role(.error))
    #expect(appearance(selected: true, .focused, tokens: custom).label == .role(.warning))
    #expect(appearance(selected: true, .pressed, tokens: custom).icon == .role(.success))
    #expect(appearance(.disabled, tokens: custom).badge == .role(.info))
    #expect(appearance(selected: true, tokens: custom).container == .role(.primary))
    #expect(appearance(.pressed, tokens: custom).opacity == 0.5)
    var rail = system
    rail.navigationRail.conditions.selected.enabled.itemContainerColor = .role(.error)
    #expect(TanreiNavigationDrawerItemAppearance(tokens: rail.navigationDrawer, isSelected: true, state: .enabled).container == .role(.secondaryContainer))
  }

  /// NVD-9 — which tokens a press reads under each choice; the shipped systems: m3-like ripples, cupertino dims, the
  /// default overlays.
  @Test("NVD-9 each choice binds the pressed tokens its own way", arguments: TanreiPressedFeedback.allCases)
  func feedback(feedback: TanreiPressedFeedback) {
    var custom = tokens
    custom.conditions.unselected.pressed.itemContainerColor = .role(.error)
    custom.conditions.unselected.pressed.itemBadgeColor = .role(.warning)
    custom.pressed.opacity = 0.5
    let pressed = appearance(.pressed, tokens: custom, feedback: feedback, beneath: .hovered)
    let hovered = custom.conditions.unselected.hovered
    switch feedback {
    case .overlay: #expect(pressed.container == .role(.error) && pressed.ripple == nil && pressed.badge == .role(.warning) && pressed.opacity == 0.5)
    case .ripple: #expect(pressed.container == hovered.itemContainerColor && pressed.ripple == .role(.error) && pressed.opacity == 0.5 && pressed.badge == .role(.warning))
    case .dim: #expect(pressed.container == hovered.itemContainerColor && pressed.ripple == nil && pressed.opacity == 0.5 && pressed.badge == .role(.warning))
    case .none: #expect(pressed == appearance(.hovered, tokens: custom))
    }
    func shipped(_ system: TanreiSystem) -> TanreiNavigationDrawerItemAppearance {
      TanreiNavigationDrawerItemAppearance(tokens: system.navigationDrawer, isSelected: false, state: .pressed, feedback: system.behavior.pressedFeedback)
    }
    #expect(shipped(.m3Like).ripple != nil && shipped(.cupertino).ripple == nil && shipped(.cupertino).opacity < 1 && shipped(.tanrei).ripple == nil)
  }

  /// NVD-9 — rendered: the pressed destination under each choice (overlay and ripple fill the item container with the
  /// pressed color — a ripple drawn grown in a render that never saw the press begin —, dim and none do not).
  @Test("NVD-9 each choice renders as it says", arguments: TanreiPressedFeedback.allCases)
  func rendered(feedback: TanreiPressedFeedback) throws {
    var custom = TanreiSystem.tanrei
    custom.behavior.pressedFeedback = feedback
    custom.navigationDrawer.conditions.unselected.pressed.itemContainerColor = .role(.error)
    let chrome = TanreiNavigationDrawerDestinationChrome(
      entry: TanreiNavigationDrawerEntry(title: "Inbox", value: "inbox"), isSelected: false, halfGap: 2, isPressed: true, isFocused: false)
      .frame(width: 256)
    let actual = pixel(try Snapshot.render(chrome, theme: theme(custom)), x: Snapshot.inset + 250, y: Snapshot.inset + 24)
    switch feedback {
    case .overlay, .ripple: #expect(actual.isClose(to: light[.error].rgba8(), tolerance: 6), "\(actual)")
    case .dim, .none: #expect(actual.isClose(to: light[.surface].rgba8(), tolerance: 6), "\(actual)")
    }
  }

  /// NVD-10 — the item container's corners follow the corner smoothing, and so do a modal drawer's trailing corners;
  /// keyboard focus follows the focus style (ring or glow).
  @Test("NVD-10 corner smoothing reaches the rows and the modal drawer's corners; the focus style reaches the ring")
  func cornersAndFocusStyle() throws {
    func row(_ amount: Double, focused: Bool = false, style: TanreiFocusStyle = .ring) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      custom.navigationDrawer.itemContainerShape = 16
      custom.behavior.focusStyle = style
      let chrome = TanreiNavigationDrawerDestinationChrome(
        entry: TanreiNavigationDrawerEntry(title: "Inbox", value: "inbox"), isSelected: true, halfGap: 2, isPressed: false, isFocused: focused)
        .frame(width: 200)
      return try Snapshot.renderExact(chrome, theme: theme(custom))
    }
    let continuous = try row(0.6)
    #expect(try row(0).mismatch(against: continuous, channelTolerance: 0) > 0)
    #expect(try row(1).mismatch(against: continuous, channelTolerance: 0) == 0)
    #expect(try row(0.6, focused: true, style: .glow).mismatch(against: try row(0.6, focused: true, style: .ring), channelTolerance: 0) > 0)
    func surface(_ amount: Double) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      custom.navigationDrawer.variants.modal.containerShape = 28
      custom.navigationDrawer.variants.modal.containerElevation = []
      return try Snapshot.renderExact(TanreiNavigationDrawerSurface(tokens: custom.navigationDrawer.variants.modal).frame(width: 100, height: 100), theme: theme(custom))
    }
    #expect(try surface(0).mismatch(against: try surface(0.6), channelTolerance: 0) > 0)
    #expect(TanreiSystem.cupertino.shape.roundedCornerStyle == .continuous && TanreiSystem.acme.behavior.focusStyle == .glow)
  }

  /// NVD-4, NVD-9, NVD-18, NVD-19, NVD-22 — the state motion, the ripple's growth, and the enter and exit motions come from
  /// the drawer's tokens; none under Reduce Motion.
  @Test("NVD-18 NVD-19 NVD-22 NVD-9 NVD-4 the motions come from the tokens; none under Reduce Motion")
  func motion() {
    var custom = tokens
    custom.motionStateDuration = 400
    custom.motionStateEasing = TanreiCubicBezier(0, 0, 1, 1)
    custom.motionFeedbackDuration = 900
    custom.motionEnterDuration = 700
    custom.motionEnterEasing = TanreiCubicBezier(0.1, 0.2, 0.3, 0.4)
    custom.motionExitDuration = 250
    custom.motionExitEasing = TanreiCubicBezier(0.4, 0.3, 0.2, 0.1)
    #expect(custom.stateMotion(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.4))
    #expect(custom.rippleGrowth(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.9))
    #expect(custom.enterMotion(reduceMotion: false) == Animation.timingCurve(0.1, 0.2, 0.3, 0.4, duration: 0.7))
    #expect(custom.exitMotion(reduceMotion: false) == Animation.timingCurve(0.4, 0.3, 0.2, 0.1, duration: 0.25))
    #expect([custom.stateMotion(reduceMotion: true), custom.rippleGrowth(reduceMotion: true), custom.enterMotion(reduceMotion: true), custom.exitMotion(reduceMotion: true)].allSatisfy { $0 == nil })
  }
}

// MARK: - Rendered (NVD-5, NVD-6, NVD-11 … NVD-17, NVD-19, NVD-25, NVD-27)

@MainActor
@Suite("TanreiNavigationDrawer rendered")
struct TanreiNavigationDrawerRenderedTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiNavigationDrawerTokens { system.navigationDrawer }

  /// NVD-11 — `container.width` wide, the parent's full height, in the standard container color, the end edge in its color
  /// and width inside the drawer; right to left the drawer is at the right edge with its edge on its left.
  @Test("NVD-11 container width, full height and color, the end edge; mirrored right to left")
  func container() throws {
    var custom = system
    custom.navigationDrawer.variants.standard.containerColor = .role(.error)
    custom.navigationDrawer.variants.standard.outlineColor = .role(.success)
    custom.navigationDrawer.outlineWidth = 2
    let rendered = try Snapshot.render(drawer(selection: .constant("")), theme: theme(custom))
    #expect(visualSize(rendered) == CGSize(width: tokens.containerWidth, height: height))
    let red = light[.error].rgba8()
    let green = light[.success].rgba8()
    #expect(pixel(rendered, x: Snapshot.inset + 2, y: Snapshot.inset + height - 2).isClose(to: red))
    for y in [Snapshot.inset + 1, Snapshot.inset + 300, Snapshot.inset + height - 1] {
      #expect(pixel(rendered, x: Snapshot.inset + tokens.containerWidth - 1, y: y).isClose(to: green), "\(y)")
      #expect(pixel(rendered, x: Snapshot.inset + tokens.containerWidth - 2.5, y: y).isClose(to: red), "\(y)")
    }
    let ltr = try Snapshot.render(HStack(spacing: 0) { drawer(selection: .constant("")); Spacer(minLength: 0) }.frame(width: 400), theme: theme(custom))
    let rtl = try Snapshot.render(
      HStack(spacing: 0) { drawer(selection: .constant("")); Spacer(minLength: 0) }.frame(width: 400).environment(\.layoutDirection, .rightToLeft),
      theme: theme(custom))
    #expect(pixel(ltr, x: Snapshot.inset + 10, y: Snapshot.inset + 300).isClose(to: red))
    #expect(pixel(rtl, x: Snapshot.inset + 400 - 10, y: Snapshot.inset + 300).isClose(to: red))
    #expect(!pixel(rtl, x: Snapshot.inset + 10, y: Snapshot.inset + 300).isClose(to: red))
    #expect(pixel(rtl, x: Snapshot.inset + 400 - tokens.containerWidth + 1, y: Snapshot.inset + 300).isClose(to: green))
    #expect(pixel(rtl, x: Snapshot.inset + 400 - 1, y: Snapshot.inset + 300).isClose(to: red))
  }

  /// NVD-11 — the modal variant: its own color, its elevation (a shadow past its end edge), its trailing corners rounded by
  /// its shape and its leading corners square; nothing drawn past its leading edge. Right to left, mirrored.
  @Test("NVD-11 NVD-19 the modal variant's color, elevation and end corners; square start corners; the scrim; mirrored")
  func modal() throws {
    var custom = system
    custom.navigationDrawer.variants.modal.containerColor = .role(.error)
    custom.navigationDrawer.variants.modal.containerShape = 24
    // Centred: an elevation's x offset is physical (as a CSS box-shadow's), not mirrored right to left.
    custom.navigationDrawer.variants.modal.containerElevation = [TanreiShadowLayer(x: 0, y: 0, blur: 6, spread: 2, role: .success)]
    custom.navigationDrawer.scrimColor = .role(.warning)
    func render(_ direction: LayoutDirection) throws -> Bitmap {
      try Snapshot.render(
        drawer(variant: .modal, inPlace: true, stage: CGSize(width: 480, height: 400)).environment(\.layoutDirection, direction), theme: theme(custom))
    }
    let red = light[.error].rgba8()
    let warning = light[.warning].rgba8()
    let surface = light[.surface].rgba8()
    for direction in [LayoutDirection.leftToRight, .rightToLeft] {
      let rendered = try render(direction)
      // Mirror an x (points from the stage's start) into the render.
      func x(_ fromStart: CGFloat) -> CGFloat { direction == .leftToRight ? Snapshot.inset + fromStart : Snapshot.inset + 480 - fromStart }
      // The start corners are square: the panel's color right at its top and bottom start corners.
      #expect(pixel(rendered, x: x(0.5), y: Snapshot.inset + 0.5).isClose(to: red), "\(direction)")
      #expect(pixel(rendered, x: x(0.5), y: Snapshot.inset + 399.5).isClose(to: red), "\(direction)")
      // The end corners are rounded: the scrim at the top end corner.
      #expect(!pixel(rendered, x: x(tokens.containerWidth - 1), y: Snapshot.inset + 1).isClose(to: red, tolerance: 20), "\(direction)")
      #expect(pixel(rendered, x: x(tokens.containerWidth - 1), y: Snapshot.inset + 200).isClose(to: red), "\(direction)")
      // The shadow past the end edge, over the scrim; the scrim beyond.
      #expect(!pixel(rendered, x: x(tokens.containerWidth + 3), y: Snapshot.inset + 200).isClose(to: warning, tolerance: 6), "\(direction)")
      #expect(pixel(rendered, x: x(400), y: Snapshot.inset + 200).isClose(to: warning), "\(direction)")
      // Nothing is drawn past the start edge: the inset there is the page's surface.
      #expect(pixel(rendered, x: x(-2), y: Snapshot.inset + 200).isClose(to: surface), "\(direction)")
    }
  }

  /// NVD-12 — the header, then the destinations and sections: `container.padding-block` below the top and
  /// `container.padding-inline` from each side, `container.gap` between two destinations, and between the header and the
  /// first element; an empty header takes no room.
  @Test("NVD-12 the header, then the items, padding inside, container.gap apart; an empty header takes no room")
  func placement() throws {
    var custom = system
    custom.navigationDrawer.conditions.unselected.enabled.itemContainerColor = .role(.warning)
    let warning = light[.warning].rgba8()
    let indicator = light[.secondaryContainer].rgba8()
    let block = CGSize(width: 40, height: 20)
    let withHeader = TanreiNavigationDrawer(isPresented: .constant(true), selection: .constant("inbox")) {
      ForEach(names, id: \.self) { TanreiNavigationDrawerItem($0, value: $0.lowercased()) }
    } header: {
      Rectangle().fill(light[.error]).frame(width: block.width, height: block.height)
    }
    .frame(height: height)
    let rendered = try Snapshot.render(withHeader, theme: theme(custom))
    let geometry = Geometry(above: block.height + tokens.containerGap)
    // The header at the start, padding-block below the top.
    let header = try #require(verticalExtent(rendered, x: geometry.rowX + 2, from: Snapshot.inset, to: Snapshot.inset + 60, color: light[.error].rgba8()))
    #expect(abs(header.min - (Snapshot.inset + tokens.containerPaddingBlock)) <= 0.5, "\(header)")
    let across = try #require(horizontalExtent(rendered, y: header.min + 2, from: Snapshot.inset, to: Snapshot.inset + 100, color: light[.error].rgba8()))
    #expect(abs(across.min - geometry.rowX) <= 0.5, "\(across)")
    // The first row container.gap below it, the next container.gap below that.
    let first = try #require(verticalExtent(rendered, x: geometry.fill(0).x, from: header.max, to: header.max + 80, color: indicator))
    #expect(abs(first.min - geometry.rowTop(0)) <= 0.5 && abs(first.max - first.min - tokens.itemContainerHeight) <= 0.5, "\(first)")
    let second = try #require(verticalExtent(rendered, x: geometry.fill(1).x, from: first.max, to: first.max + 80, color: warning))
    #expect(abs(second.min - geometry.rowTop(1)) <= 0.5, "\(second)")
    // Without a header — or with an empty one — the first row padding-block below the top.
    let bare = try Snapshot.render(drawer(), theme: theme(custom))
    let top = try #require(verticalExtent(bare, x: Geometry().fill(0).x, from: Snapshot.inset, to: Snapshot.inset + 80, color: indicator))
    #expect(abs(top.min - Geometry().rowTop(0)) <= 0.5, "\(top)")
    let empty = TanreiNavigationDrawer(isPresented: .constant(true), selection: .constant("inbox")) {
      ForEach(names, id: \.self) { TanreiNavigationDrawerItem($0, value: $0.lowercased()) }
    } header: {
      if Bool(false) { Color.red }
    }
    .frame(height: height)
    let emptyTop = try #require(verticalExtent(try Snapshot.render(empty, theme: theme(custom)), x: Geometry().fill(0).x, from: Snapshot.inset, to: Snapshot.inset + 80, color: indicator))
    #expect(emptyTop.min == top.min)
  }

  /// NVD-13 — each row across the inner width, `item.container.height` high, its corners; the icon `item.padding-inline`
  /// from its start, the label `item.gap` after it, the badge `item.padding-inline` from its end; a long label wraps and
  /// grows the row; right to left the order is mirrored.
  @Test("NVD-13 the row's size, the icon, label and badge in order; a long label wraps; mirrored right to left")
  func row() throws {
    var custom = system
    custom.navigationDrawer.conditions.selected.enabled.itemIconColor = .role(.error)
    custom.navigationDrawer.conditions.selected.enabled.itemLabelColor = .role(.success)
    custom.navigationDrawer.conditions.selected.enabled.itemBadgeColor = .role(.info)
    let geometry = Geometry()
    let indicator = light[.secondaryContainer].rgba8()
    let rendered = try Snapshot.render(drawer(icon: .view(Rectangle()), badges: [0: "24"]), theme: theme(custom))
    // Below the corners' curve, above the icon and the text.
    let across = try #require(
      horizontalExtent(rendered, y: geometry.rowTop(0) + tokens.itemContainerShape + 1, from: Snapshot.inset, to: Snapshot.inset + tokens.containerWidth - 2, color: indicator))
    #expect(abs(across.min - geometry.rowX) <= 0.5 && abs(across.max - (geometry.rowX + geometry.rowWidth)) <= 0.5, "\(across)")
    let down = try #require(verticalExtent(rendered, x: geometry.fill(0).x, from: Snapshot.inset, to: Snapshot.inset + 100, color: indicator))
    #expect(abs(down.max - down.min - tokens.itemContainerHeight) <= 0.5, "\(down)")
    // The icon: `item.icon.size`, `item.padding-inline` from the row's start, centered on the row.
    let icon = try #require(horizontalExtent(rendered, y: geometry.rowCenterY(0), from: geometry.rowX, to: geometry.rowX + 60, color: light[.error].rgba8()))
    #expect(abs(icon.min - (geometry.rowX + tokens.itemPaddingInline)) <= 0.5 && abs(icon.max - icon.min - tokens.itemIconSize) <= 0.5, "\(icon)")
    // The label `item.gap` after the icon; the badge before the row's end, `item.padding-inline` from it.
    let label = try #require(horizontalExtent(rendered, y: geometry.rowCenterY(0), from: icon.max, to: geometry.rowX + 150, color: light[.success].rgba8(), tolerance: 90))
    #expect(label.min >= icon.max + tokens.itemGap - 0.5 && label.min <= icon.max + tokens.itemGap + 2, "\(label) after \(icon)")
    let badge = try #require(horizontalExtent(rendered, y: geometry.rowCenterY(0), from: geometry.rowX + 150, to: geometry.rowX + geometry.rowWidth, color: light[.info].rgba8(), tolerance: 90))
    #expect(badge.max <= geometry.rowX + geometry.rowWidth - tokens.itemPaddingInline + 0.5 && badge.max >= geometry.rowX + geometry.rowWidth - tokens.itemPaddingInline - 3, "\(badge)")
    // Right to left: the icon at the row's right end, the badge at its left.
    let rtl = try Snapshot.render(drawer(icon: .view(Rectangle()), badges: [0: "24"]).environment(\.layoutDirection, .rightToLeft), theme: theme(custom))
    let mirroredIcon = try #require(horizontalExtent(rtl, y: geometry.rowCenterY(0), from: Snapshot.inset + 150, to: Snapshot.inset + tokens.containerWidth, color: light[.error].rgba8()))
    #expect(abs(mirroredIcon.max - (Snapshot.inset + tokens.containerWidth - tokens.containerPaddingInline - tokens.itemPaddingInline)) <= 0.5, "\(mirroredIcon)")
    #expect(inks(rtl, light[.info].rgba8(), in: CGRect(x: geometry.rowX, y: geometry.rowTop(0), width: 60, height: tokens.itemContainerHeight), tolerance: 90))
    // A long label wraps rather than truncating: the row grows by a line, the next row moves down with it.
    func contentHeight(_ titles: [String]) throws -> CGFloat {
      var custom = system
      custom.navigationDrawer.conditions.unselected.enabled.itemContainerColor = .role(.warning)
      let view = TanreiNavigationDrawer(isPresented: .constant(true), selection: .constant("")) {
        ForEach(titles.indices, id: \.self) { TanreiNavigationDrawerItem(titles[$0], value: "\($0)") }
      }
      .frame(height: height)
      let bitmap = try Snapshot.render(view, theme: theme(custom))
      let last = try #require(verticalExtent(bitmap, x: geometry.fill(0).x, from: Snapshot.inset, to: Snapshot.inset + height, color: light[.warning].rgba8(), tolerance: 6))
      return last.max
    }
    let line = tokens.itemLabelTypescale.lineHeight
    let short = try contentHeight(["A", "B"])
    let long = try contentHeight(["A label long enough to wrap onto a second and then a third line of the drawer's row, never cut", "B"])
    // Two lines fit in the row's minimum height; a label of three lines or more grows it by whole lines.
    let lines = (long - short + tokens.itemContainerHeight) / line
    #expect(lines >= 3 && abs(lines - lines.rounded()) <= 0.05, "\(long) vs \(short)")
  }

  /// NVD-14 — each icon at `item.icon.size`, in its condition's icon color, with the family and fill of its condition: the
  /// icon slot is told its size and whether it is selected; not scaled with the text.
  @Test("NVD-14 the icon's size, color and selection state")
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
    sized.navigationDrawer.itemIconSize = 28
    _ = try Snapshot.render(
      TanreiNavigationDrawer(isPresented: .constant(true), selection: .constant("b")) {
        TanreiNavigationDrawerItem("A", icon: .view(ProbeView(probe: probe)), value: "a")
        TanreiNavigationDrawerItem("B", icon: .view(ProbeView(probe: probe)), value: "b")
      }
      .frame(height: 200), theme: theme(sized))
    #expect(probe.contexts.contains(TanreiIconContext(size: 28, selected: false)))
    #expect(probe.contexts.contains(TanreiIconContext(size: 28, selected: true)))
    #expect(probe.contexts.allSatisfy { $0?.size == 28 })
    var custom = system
    custom.navigationDrawer.conditions.unselected.enabled.itemIconColor = .role(.error)
    let rendered = try Snapshot.render(drawer(selection: .constant(""), icon: .view(Rectangle())), theme: theme(custom))
    let geometry = Geometry()
    let down = try #require(verticalExtent(rendered, x: geometry.rowX + tokens.itemPaddingInline + 2, from: Snapshot.inset, to: geometry.rowTop(1), color: light[.error].rgba8()))
    #expect(abs((down.max - down.min) - tokens.itemIconSize) <= 0.5 && abs((down.min + down.max) / 2 - geometry.rowCenterY(0)) <= 0.5, "\(down)")
  }

  /// NVD-15 — the badge text is drawn at the end in the row's own colors, and kept while the destination is disabled.
  @Test("NVD-15 the badge text, kept while disabled")
  func badge() throws {
    var custom = system
    custom.navigationDrawer.conditions.unselected.enabled.itemBadgeColor = .role(.error)
    custom.navigationDrawer.conditions.unselected.disabled.itemBadgeColor = .role(.error)
    custom.navigationDrawer.disabled.opacity = 1
    let geometry = Geometry()
    let rendered = try Snapshot.render(drawer(selection: .constant(""), disabled: [1], badges: [0: "24", 1: "New"]), theme: theme(custom))
    func area(_ index: Int) -> CGRect {
      CGRect(x: geometry.rowX + geometry.rowWidth - 60, y: geometry.rowTop(index), width: 60, height: tokens.itemContainerHeight)
    }
    #expect(inks(rendered, light[.error].rgba8(), in: area(0), tolerance: 90) && inks(rendered, light[.error].rgba8(), in: area(1), tolerance: 90))
    #expect(!inks(rendered, light[.error].rgba8(), in: area(2), tolerance: 90))
  }

  /// NVD-16 — a section's heading: at least `heading.height` high, in the heading's style and color, its text centered in
  /// it and starting where the rows' content starts; an empty heading draws no row. NVD-17 — a section's divider: the
  /// divider component across the inner width, before the heading, `container.gap` from what is above and below it.
  @Test("NVD-16 NVD-17 the heading row and the divider before a section")
  func sections() throws {
    var custom = system
    custom.navigationDrawer.headingColor = .role(.error)
    custom.divider.lineColor = .role(.success)
    custom.navigationDrawer.conditions.unselected.enabled.itemContainerColor = .role(.warning)
    let view = TanreiNavigationDrawer(isPresented: .constant(true), selection: .constant("")) {
      TanreiNavigationDrawerSection("Mail") {
        TanreiNavigationDrawerItem("Inbox", value: "inbox")
      }
      TanreiNavigationDrawerSection("Labels", divider: true) {
        TanreiNavigationDrawerItem("Work", value: "work")
      }
      TanreiNavigationDrawerSection(divider: false) {
        TanreiNavigationDrawerItem("Trash", value: "trash")
      }
    }
    .frame(height: height)
    let rendered = try Snapshot.render(view, theme: theme(custom))
    let geometry = Geometry()
    let top = Snapshot.inset + tokens.containerPaddingBlock
    let heading = tokens.headingHeight
    let lineHeight = tokens.headingTypescale.lineHeight
    // "Mail": in the heading row, from the row content's start.
    let mail = CGRect(x: geometry.rowX + tokens.itemPaddingInline, y: top + (heading - lineHeight) / 2, width: 40, height: lineHeight)
    #expect(inks(rendered, light[.error].rgba8(), in: mail, tolerance: 90))
    #expect(!inks(rendered, light[.error].rgba8(), in: CGRect(x: geometry.rowX, y: top, width: tokens.itemPaddingInline - 1, height: heading), tolerance: 90))
    // The first row container.gap below the heading row.
    let warning = light[.warning].rgba8()
    let inbox = try #require(
      verticalExtent(rendered, x: geometry.fill(0).x, from: top, to: top + heading + tokens.containerGap + tokens.itemContainerHeight + 1, color: warning, tolerance: 6))
    #expect(abs(inbox.min - (top + heading + tokens.containerGap)) <= 0.5, "\(inbox)")
    // The divider container.gap below it, across the inner width; the "Labels" heading container.gap below the divider.
    let green = light[.success].rgba8()
    let divider = try #require(verticalExtent(rendered, x: geometry.rowX + 1, from: inbox.max, to: inbox.max + 20, color: green, tolerance: 6))
    #expect(abs(divider.min - (inbox.max + tokens.containerGap)) <= 0.5, "\(divider)")
    let line = try #require(horizontalExtent(rendered, y: divider.min + 0.25, from: Snapshot.inset, to: Snapshot.inset + tokens.containerWidth - 2, color: green, tolerance: 6))
    #expect(abs(line.min - geometry.rowX) <= 0.5 && abs(line.max - (geometry.rowX + geometry.rowWidth)) <= 0.5, "\(line)")
    let labelsTop = divider.max + tokens.containerGap
    #expect(inks(rendered, light[.error].rgba8(), in: CGRect(x: geometry.rowX + tokens.itemPaddingInline, y: labelsTop, width: 50, height: heading), tolerance: 90))
    let work = try #require(
      verticalExtent(rendered, x: geometry.fill(0).x, from: labelsTop, to: labelsTop + heading + tokens.containerGap + tokens.itemContainerHeight + 1, color: warning, tolerance: 6))
    #expect(abs(work.min - (labelsTop + heading + tokens.containerGap)) <= 0.5, "\(work)")
    // A section without a heading or a divider: its row container.gap below the last one.
    let trash = try #require(verticalExtent(rendered, x: geometry.fill(0).x, from: work.max + 1, to: work.max + 80, color: warning, tolerance: 6))
    #expect(abs(trash.min - (work.max + tokens.containerGap)) <= 0.5, "\(trash)")
  }

  /// NVD-5 — the focus ring around the item container (outside it, with the gap of `sys.focus`), keyboard focus only, not
  /// dimmed by the state's opacity; the row keeps its size.
  @Test("NVD-5 the focus ring around the item container, not dimmed")
  func focusRing() throws {
    func chrome(focused: Bool, tokens: TanreiNavigationDrawerTokens = TanreiSystem.tanrei.navigationDrawer) -> some View {
      TanreiNavigationDrawerDestinationChrome(
        entry: TanreiNavigationDrawerEntry(title: "Inbox", value: "inbox"), isSelected: false, halfGap: 8, isPressed: false, isFocused: focused)
        .frame(width: 200)
        .padding(.horizontal, 8)
    }
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.itemContainerShape, measure: system.measure)
    let x = Snapshot.inset + 100
    let y = Snapshot.inset + 8 - metrics.outerCenterlineOutset
    let ring = light[.focusRing].rgba8()
    let focused = try Snapshot.render(chrome(focused: true))
    #expect(pixel(focused, x: x, y: y).isClose(to: ring, tolerance: 40))
    #expect(!pixel(try Snapshot.render(chrome(focused: false)), x: x, y: y).isClose(to: ring, tolerance: 40))
    #expect(visualSize(focused) == visualSize(try Snapshot.render(chrome(focused: false))))
    var dim = system
    dim.navigationDrawer.focused.opacity = 0.3
    #expect(pixel(try Snapshot.render(chrome(focused: true, tokens: dim.navigationDrawer), theme: theme(dim)), x: x, y: y).isClose(to: ring, tolerance: 40))
  }

  /// NVD-6 — the cell (the row with half the gap above and below) is laid out as tall as that, whatever the minimum
  /// target: a system whose row and gap give less extends the hit area (tested by a click in the hosted suite) without
  /// changing the drawn rows, which stay `container.gap` apart. With the default tokens a row and its gap are the touch target.
  @Test("NVD-6 the minimum target does not move the rows; the default row and gap are the touch target")
  func target() throws {
    var custom = system
    custom.measure.targetTouch = 90
    custom.measure.targetPointer = 90
    custom.navigationDrawer.conditions.unselected.enabled.itemContainerColor = .role(.warning)
    let rendered = try Snapshot.render(drawer(selection: .constant("")), theme: theme(custom))
    let geometry = Geometry()
    for index in 0..<3 {
      #expect(pixel(rendered, x: geometry.fill(index).x, y: geometry.rowTop(index) + 1).isClose(to: light[.warning].rgba8(), tolerance: 6), "\(index)")
    }
    #expect(tokens.itemContainerHeight + tokens.containerGap == system.measure.targetTouch)
    let metrics = TanreiNavigationDrawerMetrics(tokens: tokens, measure: custom.measure)
    #expect(metrics.minimumTarget == 90 && metrics.halfGap == tokens.containerGap / 2)
  }

  /// NVD-25 — the container reaches under the leading, top and bottom system insets; the destinations stay inside them.
  @Test("NVD-25 the container reaches under the system insets, the destinations stay inside them")
  func insets() throws {
    var custom = system
    custom.navigationDrawer.variants.standard.containerColor = .role(.error)
    let inset: CGFloat = 20
    let inside = drawer().safeAreaPadding(.leading, inset).safeAreaPadding(.vertical, inset)
    let rendered = try Snapshot.render(inside, theme: theme(custom))
    let red = light[.error].rgba8()
    #expect(visualSize(rendered) == CGSize(width: tokens.containerWidth + inset, height: height + 2 * inset))
    #expect(pixel(rendered, x: Snapshot.inset + 2, y: Snapshot.inset + 200).isClose(to: red))
    #expect(pixel(rendered, x: Snapshot.inset + inset + 100, y: Snapshot.inset + 2).isClose(to: red))
    #expect(pixel(rendered, x: Snapshot.inset + inset + 100, y: Snapshot.inset + height + 2 * inset - 2).isClose(to: red))
    let indicator = light[.secondaryContainer].rgba8()
    let down = try #require(verticalExtent(rendered, x: Snapshot.inset + inset + 200, from: Snapshot.inset, to: Snapshot.inset + 100, color: indicator))
    #expect(abs(down.min - (Snapshot.inset + inset + tokens.containerPaddingBlock)) <= 0.5, "\(down)")
    let across = try #require(horizontalExtent(rendered, y: down.min + tokens.itemContainerHeight / 2, from: Snapshot.inset, to: Snapshot.inset + inset + 100, color: indicator))
    #expect(abs(across.min - (Snapshot.inset + inset + tokens.containerPaddingInline)) <= 0.5, "\(across)")
  }

  /// NVD-27 — enlarged text keeps the drawer's width and grows each row and heading with its text (their heights are
  /// minimums); icons keep their size. (Only iOS has Dynamic Type — macOS scales nothing —, so the lines are enlarged
  /// through their tokens here, as the resolved style at an accessibility size is; the Gallery measures the real thing.)
  @Test("NVD-27 taller text grows the rows and headings; the width and the icons keep their size")
  func enlargedText() throws {
    var custom = system
    custom.navigationDrawer.itemLabelTypescale.lineHeight = 60
    custom.navigationDrawer.headingTypescale.lineHeight = 50
    custom.navigationDrawer.conditions.selected.enabled.itemIconColor = .role(.error)
    let grown = try Snapshot.render(
      TanreiNavigationDrawer(isPresented: .constant(true), selection: .constant("a")) {
        TanreiNavigationDrawerSection("Mail") {
          TanreiNavigationDrawerItem("A", icon: .view(Rectangle()), value: "a")
          TanreiNavigationDrawerItem("B", value: "b")
        }
      }
      .frame(height: height), theme: theme(custom))
    #expect(visualSize(grown).width == tokens.containerWidth)
    let indicator = light[.secondaryContainer].rgba8()
    let geometry = Geometry()
    let top = Snapshot.inset + tokens.containerPaddingBlock + 50 + tokens.containerGap
    let row = try #require(verticalExtent(grown, x: geometry.fill(0).x, from: Snapshot.inset, to: Snapshot.inset + 200, color: indicator))
    #expect(abs(row.min - top) <= 0.5 && abs(row.max - row.min - 60) <= 0.5, "\(row)")
    let icon = try #require(verticalExtent(grown, x: geometry.rowX + tokens.itemPaddingInline + 2, from: row.min, to: row.max, color: light[.error].rgba8()))
    #expect(abs(icon.max - icon.min - tokens.itemIconSize) <= 0.5, "\(icon)")
    let resolved = tokens.itemLabelTypescale.resolved(policy: .system, dynamicTypeSize: .accessibility3).lineHeight
    #if os(iOS)
    #expect(resolved > tokens.itemLabelTypescale.lineHeight)
    #else
    #expect(resolved >= tokens.itemLabelTypescale.lineHeight)
    #endif
  }

  /// NVD-18 — a standard drawer that is not presented takes no width and draws nothing.
  @Test("NVD-18 a closed standard drawer takes no width")
  func closed() throws {
    let rendered = try Snapshot.render(HStack(spacing: 0) { drawer(isPresented: .constant(false)); Color.clear.frame(width: 10) })
    #expect(visualSize(rendered).width == 10)
  }
}

// MARK: - In a window (NVD-1, NVD-2, NVD-6, NVD-8, NVD-18 … NVD-22)

/// A standard drawer that owns its selection and whether it is presented, as an app does.
private struct SelectingDrawer: View {
  @State var selection = "inbox"
  @Binding var isPresented: Bool
  var body: some View {
    HStack(spacing: 0) {
      drawer(selection: $selection, isPresented: $isPresented)
      Rectangle().fill(TanreiSystem.tanrei.colors.light[.success]).frame(width: 100, height: height)
    }
  }
}

/// A modal drawer whose selection and presentation live outside it, redrawn when they change, as an app's are.
private struct ModalHost: View {
  let open: Store<Bool>
  let selection: Store<String>
  let reselected: Store<[String]>
  var body: some View {
    drawer(
      selection: selection.binding, isPresented: open.binding, variant: .modal, onReselect: { reselected.value.append($0) },
      stage: CGSize(width: 480, height: 400))
  }
}

@MainActor
@Suite("TanreiNavigationDrawer activation", .serialized)
struct TanreiNavigationDrawerActivationTests {
  #if os(macOS)
  /// NVD-1 — a click on the selected destination calls onReselect once with its value and writes nothing; a click on
  /// another writes its value once. NVD-2 — a click on a disabled destination emits nothing.
  @Test("NVD-1 NVD-2 a click reselects or changes once; a disabled destination emits nothing")
  func click() {
    let store = Store<String>("inbox")
    var reselected: [String] = []
    let hosted = HostedView(
      drawer(selection: store.binding, disabled: [2], onReselect: { reselected.append($0) }).padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    let geometry = Geometry()
    hosted.click(at: geometry.start(0))
    #expect(reselected == ["inbox"] && store.writes.isEmpty)
    hosted.click(at: geometry.start(1))
    #expect(store.writes == ["sent"] && reselected == ["inbox"])
    hosted.click(at: geometry.start(2))
    #expect(store.writes == ["sent"] && reselected == ["inbox"])
  }

  /// NVD-6 — the hit area is the row with half the gap above and below: a click in the gap activates the nearer row; a
  /// system whose row and gap give less than the minimum target extends it past the gap without moving the rows. NVD-4 —
  /// hover there answers on the item container.
  @Test("NVD-6 NVD-4 a click in the half gap activates the row; a larger minimum reaches further; hover shows on the row")
  func hitArea() {
    var system = TanreiSystem.tanrei
    system.navigationDrawer.motionStateDuration = 0
    system.navigationDrawer.conditions.unselected.hovered.itemContainerColor = .role(.error)
    let colors = system.colors.light
    let store = Store<String>("inbox")
    let hosted = HostedView(drawer(selection: store.binding).padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let geometry = Geometry()
    // Just above the fourth row, in its half of the gap.
    let gap = CGPoint(x: geometry.rowX + 2, y: geometry.rowTop(3) - 1)
    hosted.hover(at: gap)
    hosted.settle(0.1)
    #expect(hosted.color(at: geometry.fill(3))?.isClose(to: colors[.error].rgba8(), tolerance: 6) == true)
    #expect(hosted.color(at: geometry.fill(2))?.isClose(to: colors[.surface].rgba8(), tolerance: 6) == true)
    hosted.click(at: gap)
    #expect(store.writes == ["trash"])
    // A minimum target of 80: a click 16 points below the third row still reaches it, without the rows moving.
    var tall = TanreiSystem.tanrei
    tall.measure.targetPointer = 80
    let tallStore = Store<String>("inbox")
    let tallHosted = HostedView(drawer(selection: tallStore.binding, titles: ["Inbox", "Sent", "Drafts"]).padding(Snapshot.inset).tanreiTheme(theme(tall)))
    tallHosted.click(at: CGPoint(x: geometry.rowX + 2, y: geometry.rowTop(2) + tokens.itemContainerHeight + 16))
    #expect(tallStore.writes == ["drafts"])
  }

  private var tokens: TanreiNavigationDrawerTokens { TanreiSystem.tanrei.navigationDrawer }

  /// NVD-8 end to end: pressed at once, held for press-hold after a quick click; one change (NVD-1).
  @Test("NVD-8 NVD-1 a quick click shows the pressed state at once and keeps it after the release")
  func quickClickIsHeld() throws {
    var system = TanreiSystem.tanrei
    system.motion.duration.pressHold = 1500
    system.navigationDrawer.motionStateDuration = 0
    system.navigationDrawer.conditions.unselected.pressed.itemContainerColor = .role(.error)
    let colors = system.colors.light
    let store = Store<String>("inbox")
    let hosted = HostedView(drawer(selection: store.binding).padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
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

  /// NVD-12 — a drawer too short for its content scrolls it, the header with the destinations.
  @Test("NVD-12 the header and the destinations scroll together")
  func scrolls() {
    var system = TanreiSystem.tanrei
    system.navigationDrawer.conditions.selected.enabled.itemContainerColor = .role(.error)
    let colors = system.colors.light
    let short = TanreiNavigationDrawer(isPresented: .constant(true), selection: .constant("v1")) {
      ForEach(0..<12, id: \.self) { TanreiNavigationDrawerItem("D\($0)", value: "v\($0)") }
    } header: {
      Rectangle().fill(colors[.success]).frame(width: 40, height: 20)
    }
    .frame(height: 300)
    let hosted = HostedView(short.padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let geometry = Geometry(above: 20 + tokens.containerGap)
    let header = CGPoint(x: geometry.rowX + 10, y: Snapshot.inset + tokens.containerPaddingBlock + 10)
    #expect(hosted.color(at: header)?.isClose(to: colors[.success].rgba8(), tolerance: 6) == true)
    #expect(hosted.color(at: geometry.fill(1))?.isClose(to: colors[.error].rgba8(), tolerance: 6) == true)
    let pitch = tokens.itemContainerHeight + tokens.containerGap
    #expect(hosted.scroll(toY: pitch))
    // The second destination is now where the first was, and the header has moved up with it.
    #expect(hosted.color(at: geometry.fill(0))?.isClose(to: colors[.error].rgba8(), tolerance: 6) == true)
    #expect(hosted.color(at: header)?.isClose(to: colors[.success].rgba8(), tolerance: 6) != true)
  }

  /// Lets what the drawer scheduled on the main actor run: suspending does, spinning the run loop alone does not.
  private func pause(_ hosted: HostedView<some View>, _ milliseconds: Int = 300) async {
    try? await Task.sleep(for: .milliseconds(milliseconds))
    hosted.settle(0.1)
  }

  /// NVD-18 — opening a standard drawer slides it in over the enter motion while the content beside it resizes; closing
  /// slides it out over the exit motion; where motion is reduced both happen at once. It never writes its binding.
  @Test("NVD-18 a standard drawer slides in and out while the content beside it resizes; at once where motion is reduced")
  func standardSlides() async {
    var system = TanreiSystem.tanrei
    system.navigationDrawer.motionEnterDuration = 4000
    system.navigationDrawer.motionEnterEasing = TanreiCubicBezier(0, 0, 1, 1)
    system.navigationDrawer.motionExitDuration = 4000
    system.navigationDrawer.motionExitEasing = TanreiCubicBezier(0, 0, 1, 1)
    let colors = system.colors.light
    let green = colors[.success].rgba8()
    for reduced in [false, true] {
      let store = Store<Bool>(false)
      let hosted = HostedView(
        SelectingDrawer(isPresented: store.binding).frame(width: 500, alignment: .leading).padding(Snapshot.inset).background(colors[.surface])
          .tanreiTheme(theme(system)).environment(\._accessibilityReduceMotion, reduced))
      func contentStart() -> CGFloat? {
        stride(from: Snapshot.inset, to: Snapshot.inset + 400, by: 1).first { hosted.color(at: CGPoint(x: $0, y: 100))?.isClose(to: green, tolerance: 6) == true }
      }
      // Closed: the content at the start.
      #expect(contentStart() == Snapshot.inset)
      store.value = true
      await pause(hosted, 600)
      let opening = contentStart()
      if reduced {
        #expect(opening.map { abs($0 - (Snapshot.inset + tokens.containerWidth)) <= 1 } == true, "reduced: \(String(describing: opening))")
      } else {
        #expect(opening.map { $0 > Snapshot.inset + 5 && $0 < Snapshot.inset + tokens.containerWidth - 5 } == true, "opening: \(String(describing: opening))")
      }
      store.value = false
      await pause(hosted, reduced ? 300 : 600)
      let closing = contentStart()
      if reduced {
        #expect(closing == Snapshot.inset, "reduced: \(String(describing: closing))")
      } else {
        #expect(closing.map { $0 > Snapshot.inset + 1 } == true, "closing: \(String(describing: closing))")
      }
      #expect(store.writes.isEmpty)
    }
  }

  /// A modal drawer on a stage, presented by a binding, as an app presents one.
  private func modal(store: Store<Bool>, selection: Store<String>, system: TanreiSystem, reduced: Bool = true, direction: LayoutDirection = .leftToRight) -> HostedView<some View> {
    HostedView(
      drawer(selection: selection.binding, isPresented: store.binding, variant: .modal, stage: CGSize(width: 480, height: 400))
        .padding(Snapshot.inset).background(system.colors.light[.surface]).tanreiTheme(theme(system))
        .environment(\._accessibilityReduceMotion, reduced).environment(\.layoutDirection, direction))
  }

  /// NVD-19 — opening a modal drawer slides it in from its start edge and fades the scrim in over the enter motion; at once
  /// where motion is reduced; right to left it comes from the right. NVD-22 — closing slides it out and fades the scrim.
  @Test("NVD-19 NVD-22 a modal drawer slides in from its start edge and out again; at once where motion is reduced; mirrored")
  func modalSlides() async {
    var system = TanreiSystem.tanrei
    system.navigationDrawer.motionEnterDuration = 4000
    system.navigationDrawer.motionEnterEasing = TanreiCubicBezier(0, 0, 1, 1)
    system.navigationDrawer.motionExitDuration = 4000
    system.navigationDrawer.motionExitEasing = TanreiCubicBezier(0, 0, 1, 1)
    system.navigationDrawer.variants.modal.containerColor = .role(.error)
    system.navigationDrawer.variants.modal.containerElevation = []
    system.navigationDrawer.scrimColor = .role(.warning)
    let red = system.colors.light[.error].rgba8()
    let warning = system.colors.light[.warning].rgba8()
    for (reduced, direction) in [(true, LayoutDirection.leftToRight), (false, .leftToRight), (false, .rightToLeft)] {
      let store = Store<Bool>(false)
      let hosted = modal(store: store, selection: Store("inbox"), system: system, reduced: reduced, direction: direction)
      func x(_ fromStart: CGFloat) -> CGFloat { direction == .leftToRight ? Snapshot.inset + fromStart : Snapshot.inset + 480 - fromStart }
      func isRed(_ fromStart: CGFloat) -> Bool { hosted.color(at: CGPoint(x: x(fromStart), y: 200))?.isClose(to: red, tolerance: 6) == true }
      #expect(!isRed(10) && hosted.color(at: CGPoint(x: x(400), y: 200))?.isClose(to: warning, tolerance: 6) != true)
      store.value = true
      await pause(hosted, 600)
      let scrim = hosted.color(at: CGPoint(x: x(400), y: 200))
      if reduced {
        #expect(isRed(10) && isRed(tokens.containerWidth - 10), "reduced: whole at once")
        #expect(scrim?.isClose(to: warning, tolerance: 6) == true, "reduced: the scrim at once")
      } else {
        // Sliding in from the start edge: its end edge shows near the start, its start is still out of view.
        #expect(!isRed(tokens.containerWidth - 10), "\(direction): not yet in")
        #expect(stride(from: CGFloat(1), to: tokens.containerWidth, by: 2).contains { isRed($0) }, "\(direction): partly in from the start")
        #expect(scrim.map { !$0.isClose(to: warning, tolerance: 6) && !$0.isClose(to: system.colors.light[.surface].rgba8(), tolerance: 6) } == true, "\(direction): fading in")
      }
      store.value = false
      await pause(hosted, reduced ? 300 : 600)
      if reduced {
        #expect(!isRed(10) && !isRed(tokens.containerWidth - 10), "reduced: gone at once")
      } else {
        #expect(isRed(1) && !isRed(tokens.containerWidth - 10), "\(direction): sliding out toward the start")
      }
    }
  }

  /// NVD-21 — activating a destination of a modal drawer emits change, then closes it (writes `false` once); the selected
  /// one reselects, then closes. (A press on the scrim and a drag are SwiftUI gestures, which a synthetic event cannot reach
  /// here: their route, `TanreiNavigationDrawerRules.dismiss` and `closes`, is tested above, and the gestures themselves in
  /// the Gallery's UI tests, `testNavigationDrawerModalCloses`.)
  @Test("NVD-21 a destination's activation changes, then closes the modal drawer; reselect too")
  func modalCloses() async {
    let system = TanreiSystem.tanrei
    let open = Store<Bool>(true)
    let selection = Store<String>("inbox")
    let reselected = Store<[String]>([])
    let hosted = HostedView(
      ModalHost(open: open, selection: selection, reselected: reselected)
        .padding(Snapshot.inset).background(system.colors.light[.surface]).tanreiTheme(theme(system)).environment(\._accessibilityReduceMotion, true))
    await pause(hosted)
    hosted.click(at: Geometry().start(1))
    #expect(selection.writes == ["sent"] && open.writes == [false])
    // Presented again: the selected one reselects, then closes.
    open.value = true
    selection.value = "sent"
    await pause(hosted)
    hosted.click(at: Geometry().start(1))
    #expect(selection.writes == ["sent"] && reselected.value == ["sent"] && open.writes == [false, false])
  }

  /// NVD-18 — a standard drawer draws no scrim and never writes its binding, whatever is clicked.
  @Test("NVD-18 a standard drawer draws no scrim and never closes itself")
  func standardNeverCloses() {
    let open = Store<Bool>(true)
    let selection = Store<String>("inbox")
    let hosted = HostedView(
      HStack(spacing: 0) { drawer(selection: selection.binding, isPresented: open.binding); Color.clear.frame(width: 100) }
        .padding(Snapshot.inset).background(light[.surface]).tanreiTheme(Snapshot.theme))
    hosted.click(at: Geometry().start(1))
    hosted.click(at: CGPoint(x: Snapshot.inset + tokens.containerWidth + 50, y: 200))
    #expect(selection.writes == ["sent"] && open.writes.isEmpty)
    #expect(hosted.color(at: CGPoint(x: Snapshot.inset + tokens.containerWidth + 50, y: 200))?.isClose(to: light[.surface].rgba8(), tolerance: 6) == true)
  }

  /// NVD-19 — a presented modal drawer counts itself as an open Tanrei modal (a snackbar host waits), and counts itself out
  /// when it closes.
  @Test("NVD-19 a presented modal drawer counts itself as an open modal while it is open")
  func modalCount() async {
    let before = TanreiModalCoordinator.shared.openModals
    let open = Store<Bool>(true)
    let hosted = modal(store: open, selection: Store("inbox"), system: .tanrei)
    await pause(hosted)
    #expect(TanreiModalCoordinator.shared.openModals == before + 1)
    open.value = false
    await pause(hosted)
    #expect(TanreiModalCoordinator.shared.openModals == before)
  }
  #endif
}

// MARK: - Fixtures (one per spec fixture)

/// Draws a fixture of specs/navigation-drawer.spec.json as a product writes it: a standard drawer 560 high with no system
/// insets, or a modal drawer in place over a 480 × 640 stage; its `destination` items as `TanreiNavigationDrawerItem`s and
/// its `section` items as `TanreiNavigationDrawerSection`s holding theirs, in order; variant, open, value and label apply to
/// the drawer and each item's props to that item.
@MainActor
enum TanreiNavigationDrawerFixtures {
  /// The fixtures' glyphs as SF Symbols, and whether the symbol has a `.fill` form.
  static let symbols: [String: (name: String, fills: Bool)] = [
    "inbox": ("tray", true), "send": ("paperplane", true), "draft": ("doc", true), "delete": ("trash", true), "label": ("tag", true),
  ]

  static let height: CGFloat = 560
  static let modalStage = CGSize(width: 480, height: 640)

  static func icon(_ name: String, selected: Bool) -> TanreiItemIcon? {
    guard !name.isEmpty else { return nil }
    guard let symbol = symbols[name] else { return TanreiItemIcon(name) }
    return .image(Image(systemName: selected && symbol.fills ? "\(symbol.name).fill" : symbol.name))
  }

  @ViewBuilder
  static func destination(_ spec: SpecItem, selected: String) -> some View {
    let value = spec.string("value") ?? ""
    let label = spec.string("label") ?? ""
    let badge = spec.string("badge") ?? ""
    Group {
      if let icon = icon(spec.string("icon") ?? "", selected: value == selected) {
        TanreiNavigationDrawerItem(label, icon: icon, value: value, badge: badge)
      } else {
        TanreiNavigationDrawerItem(label, value: value, badge: badge)
      }
    }
    .disabled(spec.bool("disabled") ?? false)
  }

  @ViewBuilder
  static func item(_ spec: SpecItem, selected: String) -> some View {
    if spec.kind == "section" {
      let items = spec.items ?? []
      TanreiNavigationDrawerSection(spec.string("heading") ?? "", divider: spec.bool("divider") ?? false) {
        ForEach(items.indices, id: \.self) { index in destination(items[index], selected: selected) }
      }
    } else {
      destination(spec, selected: selected)
    }
  }

  @ViewBuilder
  static func view(_ fixture: SpecFixture) -> some View {
    let items = fixture.items ?? []
    let selected = fixture.string("value") ?? ""
    let variant = TanreiNavigationDrawerVariant(rawValue: fixture.string("variant") ?? TanreiNavigationDrawerVariant.fallback.rawValue)
    let drawer = TanreiNavigationDrawer(
      variant: variant, isPresented: .constant(fixture.bool("open") ?? false), selection: .constant(selected),
      accessibilityLabel: LocalizedStringKey(fixture.string("label") ?? "")
    ) {
      ForEach(items.indices, id: \.self) { index in item(items[index], selected: selected) }
    }
    if variant == .modal {
      drawer.inPlace().frame(width: modalStage.width, height: modalStage.height)
    } else {
      drawer.frame(height: height)
    }
  }
}

@MainActor
@Suite("TanreiNavigationDrawer snapshots")
struct TanreiNavigationDrawerSnapshotTests {
  /// Mirrors `fixtures` in specs/navigation-drawer.spec.json.
  nonisolated static let fixtures = ["standard", "standard-no-icons", "standard-disabled", "modal"]

  static func fixture(_ id: String) throws -> SpecFixture {
    try #require(try SpecFixture.load(spec: "navigation-drawer").first { $0.id == id })
  }

  @Test("NVD-11 NVD-12 NVD-13 fixture matches its baseline", arguments: fixtures)
  func fixture(_ id: String) throws {
    try Snapshot.assert(TanreiNavigationDrawerFixtures.view(try Self.fixture(id)), named: id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    #expect(try SpecFixture.load(spec: "navigation-drawer").map(\.id) == Self.fixtures)
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiNavigationDrawerTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiNavigationDrawer preset snapshots")
struct TanreiNavigationDrawerPresetSnapshotTests {
  /// Two sections with headings and a divider, icons, badges and a selected destination: the preset's container, end edge,
  /// heading, indicator, both conditions' colors and the label style (the web's preset fixture too).
  nonisolated static let fixtureId = "standard"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .m3ExpressiveLike, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiNavigationDrawerSnapshotTests.fixtures.contains(Self.fixtureId))
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try TanreiNavigationDrawerSnapshotTests.fixture(Self.fixtureId)
    try Snapshot.assert(TanreiNavigationDrawerFixtures.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
