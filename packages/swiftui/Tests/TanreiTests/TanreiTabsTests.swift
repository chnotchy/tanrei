import AcmeFixture
import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/tabs.spec.json. Each behavior id (TAB-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file. TAB-5, TAB-8, TAB-9 and TAB-10 are BTN-5, BTN-8, BTN-9 and BTN-10 for the tab:
// the primitives they rest on are tested once in TanreiButtonTests / TanreiPrimitivesTests; here each is proven to reach
// the tab. The fixtures render one row of tabs 360 wide and no panel (TAB-14's verify).
//
// Icons: baselines render with `Snapshot.theme` (`fontFamilyPolicy: .system`), under which a `TanreiIconGlyph` draws
// nothing, so a fixture's glyph name draws the SF Symbol a product would pass for it — its `.fill` form on the selected tab,
// as a product using SF Symbols chooses the symbol of each state itself (`platform-symbol-sets`).

private let suiteName = "TanreiTabsTests"

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

private let light = TanreiSystem.tanrei.colors.light

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

/// Entries as a row reads them: titles "A", "B", "C" … with values "a", "b", "c" …; `disabled` lists the disabled indices.
private func entries(_ count: Int = 3, disabled: Set<Int> = [], values: [String?]? = nil) -> [TanreiTabEntry] {
  (0..<count).map { index in
    let letter = String(UnicodeScalar(UInt8(65 + index)))
    let value = values.map { $0[index] } ?? letter.lowercased()
    return TanreiTabEntry(title: letter, isEnabled: !disabled.contains(index), value: value.map { AnyHashable($0) })
  }
}

/// One tab's chrome, alone, at `width`: what the row draws for a tab.
@MainActor
private func chrome(
  _ entry: TanreiTabEntry = TanreiTabEntry(title: "Overview"), variant: TanreiTabsVariant = .primary, selected: Bool = false, pressed: Bool = false,
  focused: Bool = false, scrollable: Bool = false, width: CGFloat? = 120
) -> some View {
  TanreiTabChrome(entry: entry, variant: variant, scrollable: scrollable, isSelected: selected, isPressed: pressed, isFocused: focused)
    .frame(width: width)
}

/// A row of three text tabs ("Overview", "Activity", "Settings") 360 wide, the first selected unless told.
@MainActor
private func row(
  variant: TanreiTabsVariant = .primary, selection: Binding<String?> = .constant("overview"), disabled: Set<Int> = [], scrollable: Bool = false,
  panels: Bool = false
) -> some View {
  let names = ["Overview", "Activity", "Settings"]
  return TanreiTabs(selection: selection, variant: variant, scrollable: scrollable, label: "Project") {
    ForEach(names.indices, id: \.self) { index in
      TanreiTab(names[index]) {
        if panels { Rectangle().fill([Color.red, Color.green, Color.blue][index]).frame(height: 40) }
      }
      .tag(names[index].lowercased())
      .disabled(disabled.contains(index))
    }
  }
  .frame(width: TanreiTabsFixtures.width)
}

/// The size of a render without the snapshot inset, in points.
@MainActor
private func visualSize(_ bitmap: Bitmap) -> CGSize {
  CGSize(width: CGFloat(bitmap.width) / Snapshot.scale - 2 * Snapshot.inset, height: CGFloat(bitmap.height) / Snapshot.scale - 2 * Snapshot.inset)
}

// MARK: - The rules (TAB-1, TAB-2, TAB-11, TAB-12, TAB-13, TAB-19, TAB-21)

@MainActor
@Suite("TanreiTabs rules")
struct TanreiTabsRulesTests {
  /// TAB-11 — the tab whose value equals the selection; while it is nil, the first enabled tab; a value naming no tab
  /// selects none. The first of two tabs sharing a value is the one it selects.
  @Test("TAB-11 which tab is selected: by value, the first enabled for nil, none for an unknown value")
  func selected() {
    #expect(TanreiTabsRules.selectedIndex(entries(), selection: "b") == 1)
    #expect(TanreiTabsRules.selectedIndex(entries(disabled: [0]), selection: nil) == 1)
    #expect(TanreiTabsRules.selectedIndex(entries(), selection: "z") == nil)
    #expect(TanreiTabsRules.selectedIndex(entries(values: ["a", "b", "a"]), selection: "a") == 0)
    // A disabled tab the product selected is still the selected one (the fixture primary-selected-disabled).
    #expect(TanreiTabsRules.selectedIndex(entries(disabled: [2]), selection: "c") == 2)
  }

  /// TAB-11 — reported in debug builds: a selection naming no tab, a tab without a value, a value two tabs share; TAB-19 — a
  /// hidden label without an icon. A consistent row reports nothing.
  @Test("TAB-11 TAB-19 unknown selections, missing and repeated values and hidden labels without icons are reported")
  func problems() {
    #expect(TanreiTabsRules.problems(entries(), selection: "b").isEmpty)
    #expect(TanreiTabsRules.problems(entries(), selection: nil).isEmpty)
    let unknown = TanreiTabsRules.problems(entries(), selection: "z")
    #expect(unknown.count == 1 && unknown[0].contains("names none") && unknown[0].contains("TAB-11"))
    #expect(TanreiTabsRules.problems(entries(values: ["a", nil, "c"]), selection: "a").contains { $0.contains("\"B\" has no value") })
    #expect(TanreiTabsRules.problems(entries(values: ["a", "a", "a"]), selection: "a").filter { $0.contains("more than one tab") }.count == 1)
    let hidden = [TanreiTabEntry(title: "A", labelHidden: true, value: "a"), TanreiTabEntry(title: "B", icon: "star", labelHidden: true, value: "b")]
    let reports = TanreiTabsRules.problems(hidden, selection: "a")
    #expect(reports.count == 1 && reports[0].contains("\"A\"") && reports[0].contains("TAB-19"))
  }

  /// TAB-1 — only an enabled tab that is not selected changes the selection; the selected tab emits nothing. TAB-2 — a
  /// disabled tab never does.
  @Test("TAB-1 TAB-2 activating changes the selection only for an enabled tab that is not selected")
  func changes() {
    let row = entries(disabled: [2])
    #expect(TanreiTabsRules.changes(row, activating: 1, selected: 0))
    #expect(!TanreiTabsRules.changes(row, activating: 0, selected: 0))
    #expect(!TanreiTabsRules.changes(row, activating: 2, selected: 0))
    #expect(!TanreiTabsRules.changes(entries(values: ["a", nil, "c"]), activating: 1, selected: 0))
    #expect(!TanreiTabsRules.changes(row, activating: 7, selected: 0))
  }

  /// TAB-12 — one Tab stop, the selected tab; TAB-2 — never a disabled one (then the first enabled tab).
  @Test("TAB-12 TAB-2 the Tab stop is the selected tab, never a disabled one")
  func tabStop() {
    #expect(TanreiTabsRules.tabStop(entries(), selected: 1) == 1)
    #expect(TanreiTabsRules.tabStop(entries(disabled: [0, 2]), selected: 2) == 1)
    #expect(TanreiTabsRules.tabStop(entries(disabled: [0]), selected: nil) == 1)
    #expect(TanreiTabsRules.tabStop(entries(disabled: [0, 1, 2]), selected: 0) == nil)
  }

  /// TAB-12 — Right and Left Arrow move to the next and previous enabled tab, wrapping; Home and End to the first and last
  /// enabled tab; TAB-2 — disabled tabs are skipped; other keys are not the row's.
  @Test("TAB-12 TAB-2 the arrows wrap and skip disabled tabs; Home and End go to the enabled ends")
  func keys() {
    let row = entries(4, disabled: [0, 2])
    #expect(TanreiTabsRules.target(for: .rightArrow, from: 1, in: row, layoutDirection: .leftToRight) == 3)
    #expect(TanreiTabsRules.target(for: .rightArrow, from: 3, in: row, layoutDirection: .leftToRight) == 1)
    #expect(TanreiTabsRules.target(for: .leftArrow, from: 1, in: row, layoutDirection: .leftToRight) == 3)
    #expect(TanreiTabsRules.target(for: .home, from: 3, in: row, layoutDirection: .leftToRight) == 1)
    #expect(TanreiTabsRules.target(for: .end, from: 1, in: row, layoutDirection: .leftToRight) == 3)
    #expect(TanreiTabsRules.target(for: .downArrow, from: 1, in: row, layoutDirection: .leftToRight) == nil)
    #expect(TanreiTabsRules.target(for: .rightArrow, from: 0, in: entries(disabled: [0, 1, 2]), layoutDirection: .leftToRight) == nil)
    #expect(TanreiTabsRules.keys == [.leftArrow, .rightArrow, .home, .end])
  }

  /// TAB-21 (and TAB-12) — right to left, Left Arrow moves to the next tab and Right Arrow to the previous one.
  @Test("TAB-21 TAB-12 right to left, the arrows are mirrored")
  func rightToLeftKeys() {
    let row = entries(3)
    #expect(TanreiTabsRules.target(for: .leftArrow, from: 0, in: row, layoutDirection: .rightToLeft) == 1)
    #expect(TanreiTabsRules.target(for: .rightArrow, from: 0, in: row, layoutDirection: .rightToLeft) == 2)
    #expect(TanreiTabsRules.movement(for: .home, layoutDirection: .rightToLeft) == .home)
  }

  /// TAB-13 — a tab states its position and the number of tabs where the platform does not (iOS's tab bar trait does).
  @Test("TAB-13 each tab's position and the row's size")
  func position() {
    #if os(iOS)
    #expect(TanreiTabsRules.positionText(index: 1, count: 3) == nil)
    #else
    #expect(TanreiTabsRules.positionText(index: 1, count: 3) == "2 of 3")
    #endif
  }
}

// MARK: - Reading the tabs (TAB-2, TAB-13, TAB-19, TAB-22)

private final class EntriesBox: @unchecked Sendable {
  var entries: [TanreiTabEntry] = []
}

private struct EntriesRoot: _VariadicView_UnaryViewRoot {
  let box: EntriesBox
  func body(children: _VariadicView.Children) -> some View {
    box.entries = children.compactMap { $0[TanreiTabEntryKey.self] }
    return Color.clear.frame(width: 1, height: 1)
  }
}

/// The tabs as the row reads them from its content.
@MainActor
private func read(@ViewBuilder _ content: () -> some View) -> [TanreiTabEntry] {
  let box = EntriesBox()
  _ = ImageRenderer(content: _VariadicView.Tree(EntriesRoot(box: box)) { content() }).cgImage
  return box.entries
}

@MainActor
@Suite("TanreiTabs items")
struct TanreiTabsItemTests {
  /// The item kind `tab`: title, icon, tag (value), `.labelStyle(.iconOnly)` (labelHidden) and `.disabled(_:)` — read from
  /// the tab's own view, through `ForEach` and modifiers; a tab without a panel has none.
  @Test("TAB-2 TAB-19 each tab's props are read from its view: value, icon, labelHidden, disabled")
  func props() {
    let read = read {
      TanreiTab("Overview", icon: "dashboard") { Text("panel") }.tag("overview")
      TanreiTab("Activity", icon: "history").tag("activity").labelStyle(.iconOnly)
      TanreiTab("Billing").tag("billing").disabled(true)
      TanreiTab("Other", icon: "").tag(7).labelStyle(.titleAndIcon)
    }
    #expect(read.map(\.title) == ["Overview", "Activity", "Billing", "Other"])
    #expect(read.map(\.value) == ["overview", "activity", "billing", AnyHashable(7)])
    #expect(read.map(\.labelHidden) == [false, true, false, false])
    #expect(read.map(\.isEnabled) == [true, true, false, true])
    #expect(read.map { $0.icon != nil } == [true, true, false, false])
    #expect(read.map { $0.panel != nil } == [true, false, false, false])
    #expect(read.map(\.drawsLabel) == [true, false, true, true])
  }

  /// TAB-22 — an empty label is reported in debug builds, and the tab still renders.
  @Test("TAB-22 an empty label is reported and the tab is still rendered")
  func emptyLabel() throws {
    let (_, reports) = Reports.collecting { _ = TanreiTab(" ").tag("a") }
    #expect(reports.mention("TAB-22") && reports.mention("accessible name"))
    let (_, silent) = Reports.collecting { _ = TanreiTab("Overview").tag("a") }
    #expect(silent.messages.isEmpty)
    let (bitmap, _) = try Reports.collecting {
      try Snapshot.render(TanreiTabs(selection: .constant("a"), variant: .secondary) { TanreiTab("").tag("a") }.frame(width: 120))
    }
    let tokens = TanreiSystem.tanrei.tabs
    #expect(visualSize(bitmap).height == max(tokens.containerHeight, TanreiHitTarget.minimum(in: TanreiSystem.tanrei.measure)))
    // Its indicator is drawn (secondary's spans the whole tab; primary's spans the empty content): it is still the selected tab.
    #expect(pixel(bitmap, x: Snapshot.inset + 60, y: Snapshot.inset + tokens.containerHeight - 1).isClose(to: light[.primary].rgba8(), tolerance: 12))
  }

  /// TAB-19 — a hidden label with no icon is drawn anyway (and reported); with an icon, only the icon is drawn.
  @Test("TAB-19 labelHidden draws the icon alone; without an icon, the label is drawn anyway and reported")
  func labelHidden() throws {
    let (plain, reports) = try Reports.collecting {
      try Snapshot.render(TanreiTabs(selection: .constant("a")) { TanreiTab("Overview").tag("a").labelStyle(.iconOnly) }.frame(width: 120))
    }
    #expect(reports.mention("TAB-19"))
    let label = try Snapshot.render(TanreiTabs(selection: .constant("a")) { TanreiTab("Overview").tag("a") }.frame(width: 120))
    #expect(plain.mismatch(against: label, channelTolerance: Snapshot.channelTolerance) <= Snapshot.allowedMismatch)
    let icon = TanreiItemIcon.image(Image(systemName: "square.fill"))
    let iconOnly = try Snapshot.render(TanreiTabs(selection: .constant("a")) { TanreiTab("Overview", icon: icon).tag("a").labelStyle(.iconOnly) }.frame(width: 120))
    let both = try Snapshot.render(TanreiTabs(selection: .constant("a")) { TanreiTab("Overview", icon: icon).tag("a") }.frame(width: 120))
    // Icon only: a text tab's height (no stacked label), and the icon at the tab's center.
    let tokens = TanreiSystem.tanrei.tabs
    #expect(visualSize(iconOnly).height == tokens.containerHeight && visualSize(both).height == tokens.containerHeightWithIcon)
    #expect(pixel(iconOnly, x: Snapshot.inset + 60, y: Snapshot.inset + tokens.containerHeight / 2).isClose(to: light[.onSurface].rgba8(), tolerance: 24))
  }
}

// MARK: - Activation by pointer (TAB-1, TAB-2, TAB-8)

@MainActor
@Suite("TanreiTabs activation", .serialized)
struct TanreiTabsActivationTests {
  #if os(macOS)
  /// TAB-1 — a click on an enabled tab that is not selected sets the selection once; a click on the selected tab emits
  /// nothing; TAB-2 — a click on a disabled tab emits nothing. (Enter and Space go through the same route, `activate`; the
  /// simulator gives no keyboard focus under automation.)
  @Test("TAB-1 TAB-2 a click selects once; the selected and disabled tabs emit nothing")
  func click() {
    let store = Store<String?>("overview")
    let hosted = HostedView(row(selection: store.binding, disabled: [2]).padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    let y = Snapshot.inset + TanreiSystem.tanrei.tabs.containerHeight / 2
    hosted.click(at: CGPoint(x: Snapshot.inset + 60, y: y))
    #expect(store.writes.isEmpty)
    hosted.click(at: CGPoint(x: Snapshot.inset + 180, y: y))
    #expect(store.writes == ["activity"] && store.value == "activity")
    hosted.click(at: CGPoint(x: Snapshot.inset + 300, y: y))
    #expect(store.writes == ["activity"])
  }

  /// TAB-15 end to end, in a real scroll view: a scrollable row that first appears with its selected tab out of view
  /// scrolls it into view at once; a row whose selected tab is in view stays at its start edge (TAB-14).
  @Test("TAB-15 TAB-14 a scrollable row reveals its selected tab when it first appears")
  func revealsSelectedTab() async throws {
    let fixture = try TanreiTabsSnapshotTests.fixture("primary-scrollable")
    let bottom = Snapshot.inset + TanreiSystem.tanrei.tabs.containerHeight - 1
    let indigo = light[.primary].rgba8()
    func indicatorXs(_ selected: String) async -> [CGFloat] {
      let hosted = HostedView(
        TanreiTabsFixtures.view(fixture, selection: .constant(selected)).padding(Snapshot.inset).background(light[.surface]).tanreiTheme(Snapshot.theme))
      _ = await hosted.wait(atMost: 5) { hosted.color(at: CGPoint(x: 1, y: 1)) != nil }
      hosted.settle(0.3)
      return stride(from: Snapshot.inset, to: Snapshot.inset + TanreiTabsFixtures.width, by: 1).filter { x in
        hosted.color(at: CGPoint(x: x, y: bottom))?.isClose(to: indigo, tolerance: 12) == true
      }
    }
    let first = await indicatorXs("overview")
    #expect(first.first.map { $0 < Snapshot.inset + 40 } == true)
    // "settings", the last of six, starts far beyond 360 at rest: revealed, its indicator ends inside the row's right edge.
    let last = await indicatorXs("settings")
    #expect(!last.isEmpty && (last.last ?? 0) > Snapshot.inset + TanreiTabsFixtures.width / 2)
  }

  /// TAB-8 end to end: pressed at once, held for press-hold after a quick click; one change (TAB-1).
  @Test("TAB-8 TAB-1 a quick click shows the pressed state at once and keeps it after the release")
  func quickClickIsHeld() throws {
    var system = TanreiSystem.tanrei
    system.motion.duration.pressHold = 1500
    system.tabs.motionStateDuration = 0
    system.tabs.variants.primary.pressed.containerColor = .role(.error)
    let colors = system.colors.light
    let store = Store<String?>("overview")
    let hosted = HostedView(row(selection: store.binding).padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let point = CGPoint(x: Snapshot.inset + 124, y: Snapshot.inset + 6)
    hosted.hover(at: point)
    hosted.mouse(.leftMouseDown, at: point)
    hosted.settle()
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    hosted.mouse(.leftMouseUp, at: point)
    hosted.settle()
    #expect(store.writes == ["activity"])
  }
  #endif
}

// MARK: - Token bindings (TAB-3, TAB-6, TAB-7, TAB-9, TAB-10, TAB-11, TAB-23)

@MainActor
@Suite("TanreiTabs token bindings")
struct TanreiTabsTokenBindingTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiTabsTokens { system.tabs }

  private func appearance(
    _ variant: TanreiTabsVariant = .primary, selected: Bool = false, _ state: TanreiInteraction = .enabled, tokens: TanreiTabsTokens? = nil
  ) -> TanreiTabAppearance {
    TanreiTabAppearance(tokens: tokens ?? self.tokens, variant: variant, isSelected: selected, state: state)
  }

  /// TAB-11 — at rest: no fill; not selected on-surface-variant with no indicator; selected on-surface with the
  /// primary indicator; primary's indicator 3 thick and rounded, secondary's 2 and square.
  @Test("TAB-11 at rest each look binds its own parts")
  func rest() {
    for variant in [TanreiTabsVariant.primary, .secondary] {
      let plain = appearance(variant)
      let chosen = appearance(variant, selected: true)
      #expect(plain.container == TanreiPaint.none && chosen.container == TanreiPaint.none)
      #expect(plain.label == .role(.onSurfaceVariant) && plain.icon == .role(.onSurfaceVariant) && plain.indicator == TanreiPaint.none)
      #expect(chosen.label == .role(.onSurface) && chosen.icon == .role(.onSurface) && chosen.indicator == .role(.primary))
      #expect(plain.opacity == 1 && plain.cornerRadius == tokens.containerShape)
    }
    #expect(appearance(.primary).indicatorThickness == 3 && appearance(.primary).indicatorShape == system.shape.extraSmall)
    #expect(appearance(.secondary).indicatorThickness == system.measure.borderThick && appearance(.secondary).indicatorShape == .zero)
  }

  /// TAB-3 — hovered, focused and pressed mix each look's state-layer color into its container; the other parts keep
  /// their resting values, and the indicator keeps its thickness and corners.
  @Test("TAB-3 each state binds that state's tokens", arguments: [false, true])
  func states(selected: Bool) {
    let rest = appearance(selected: selected)
    let variant = tokens.variants.primary.enabled
    let layer = selected ? variant.selectedStateLayerColor : variant.stateLayerColor
    #expect(layer == rest.label)
    for (state, amount) in [
      (TanreiInteraction.hovered, system.state.hoverStateLayerOpacity), (.focused, system.state.focusStateLayerOpacity), (.pressed, system.state.pressedStateLayerOpacity),
    ] {
      let drawn = appearance(selected: selected, state)
      #expect(drawn.container == .mix(base: rest.container, with: layer, amount: amount))
      #expect(drawn.label == rest.label && drawn.icon == rest.icon && drawn.indicator == rest.indicator && drawn.opacity == 1)
      #expect(drawn.indicatorThickness == rest.indicatorThickness && drawn.indicatorShape == rest.indicatorShape)
    }
  }

  /// TAB-3 (verify) — under acme, hovered, focused and pressed differ.
  @Test("TAB-3 under acme, hovered, focused and pressed differ")
  func acme() {
    for selected in [false, true] {
      let containers = [TanreiInteraction.hovered, .focused, .pressed].map {
        TanreiTabAppearance(tokens: TanreiSystem.acme.tabs, variant: .primary, isSelected: selected, state: $0).container
      }
      #expect(Set(containers.map { "\($0)" }).count == 3, "selected: \(selected)")
    }
  }

  /// TAB-6 — disabled: no fill; label and icon faded; a tab that is not selected keeps no indicator, the selected one's
  /// fades.
  @Test("TAB-6 disabled bindings, for a tab and for the selected tab")
  func disabled() {
    for variant in [TanreiTabsVariant.primary, .secondary] {
      let plain = appearance(variant, .disabled)
      let chosen = appearance(variant, selected: true, .disabled)
      #expect(plain.container == TanreiPaint.none && chosen.container == TanreiPaint.none)
      #expect(plain.indicator == TanreiPaint.none)
      #expect(chosen.indicator != TanreiPaint.none && chosen.indicator != appearance(variant, selected: true).indicator)
      #expect(plain.label != appearance(variant).label && chosen.label != appearance(variant, selected: true).label)
      #expect(plain.opacity == (tokens.disabled.opacity))
    }
  }

  /// TAB-3 TAB-6 TAB-11 — the values drive the result, for every part of both looks.
  @Test("TAB-3 TAB-6 TAB-11 a modified system changes what each state resolves to")
  func modifiedSystem() {
    var custom = tokens
    custom.variants.primary.hovered.containerColor = .role(.error)
    custom.variants.primary.focused.selectedLabelColor = .role(.warning)
    custom.variants.secondary.pressed.selectedActiveIndicatorColor = .role(.success)
    custom.variants.secondary.disabled.iconColor = .role(.info)
    custom.variants.primary.enabled.activeIndicatorThickness = 7
    custom.variants.primary.enabled.activeIndicatorShape = 1
    custom.pressed.opacity = 0.5
    custom.containerShape = 12
    #expect(appearance(.primary, .hovered, tokens: custom).container == .role(.error))
    #expect(appearance(.primary, selected: true, .focused, tokens: custom).label == .role(.warning))
    #expect(appearance(.secondary, selected: true, .pressed, tokens: custom).indicator == .role(.success))
    #expect(appearance(.secondary, .disabled, tokens: custom).icon == .role(.info))
    #expect(appearance(.primary, tokens: custom).indicatorThickness == 7 && appearance(.primary, tokens: custom).indicatorShape == 1)
    #expect(appearance(.primary, .pressed, tokens: custom).opacity == 0.5 && appearance(.primary, tokens: custom).cornerRadius == 12)
  }

  /// TAB-7 — a variant the system does not have draws primary's tokens and is reported; a layer's own variant is read.
  @Test("TAB-7 an unknown variant draws primary's tokens and is reported")
  func unknownVariant() throws {
    let (value, reports) = Reports.collecting { appearance(TanreiTabsVariant(rawValue: "pill"), selected: true, .hovered) }
    #expect(value == appearance(.primary, selected: true, .hovered) && reports.mention("tabs variant \"pill\""))
    var custom = tokens
    var pill = custom.variants.primary
    pill.enabled.selectedActiveIndicatorColor = .role(.error)
    custom.variants.extra[TanreiTabsVariant(rawValue: "pill")] = pill
    let (known, silent) = Reports.collecting { appearance(TanreiTabsVariant(rawValue: "pill"), selected: true, tokens: custom) }
    #expect(known.indicator == .role(.error) && silent.messages.isEmpty)
    // Rendered: the row with an unknown variant is the primary row.
    let (unknown, _) = try Reports.collecting { try Snapshot.render(row(variant: TanreiTabsVariant(rawValue: "pill"))) }
    #expect(unknown.mismatch(against: try Snapshot.render(row()), channelTolerance: Snapshot.channelTolerance) <= Snapshot.allowedMismatch)
  }

  /// TAB-9 — which tokens a press reads under each choice; the shipped systems: m3-like ripples, cupertino dims.
  @Test("TAB-9 each choice binds the pressed tokens its own way", arguments: TanreiPressedFeedback.allCases)
  func feedback(feedback: TanreiPressedFeedback) {
    var custom = tokens
    custom.variants.primary.pressed.containerColor = .role(.error)
    custom.variants.primary.pressed.labelColor = .role(.warning)
    custom.pressed.opacity = 0.5
    let pressed = TanreiTabAppearance(tokens: custom, variant: .primary, isSelected: false, state: .pressed, feedback: feedback, beneath: .hovered)
    let hovered = custom.variants.primary.hovered
    switch feedback {
    case .overlay: #expect(pressed.container == .role(.error) && pressed.ripple == nil && pressed.label == .role(.warning))
    case .ripple: #expect(pressed.container == hovered.containerColor && pressed.ripple == .role(.error) && pressed.opacity == 0.5 && pressed.label == .role(.warning))
    case .dim: #expect(pressed.container == hovered.containerColor && pressed.ripple == nil && pressed.opacity == 0.5 && pressed.label == .role(.warning))
    case .none: #expect(pressed == TanreiTabAppearance(tokens: custom, variant: .primary, isSelected: false, state: .hovered))
    }
    func shipped(_ system: TanreiSystem) -> TanreiTabAppearance {
      TanreiTabAppearance(tokens: system.tabs, variant: .primary, isSelected: false, state: .pressed, feedback: system.behavior.pressedFeedback)
    }
    #expect(shipped(.m3Like).ripple != nil && shipped(.cupertino).ripple == nil && shipped(.cupertino).opacity < 1 && shipped(.tanrei).ripple == nil)
  }

  /// TAB-9 — rendered: the pressed tab under each choice.
  @Test("TAB-9 each choice renders as it says", arguments: TanreiPressedFeedback.allCases)
  func rendered(feedback: TanreiPressedFeedback) throws {
    var custom = TanreiSystem.tanrei
    custom.behavior.pressedFeedback = feedback
    custom.tabs.variants.primary.pressed.containerColor = .role(.error)
    custom.tabs.pressed.opacity = 0.5
    let actual = pixel(try Snapshot.render(chrome(pressed: true), theme: theme(custom)), x: Snapshot.inset + 3, y: Snapshot.inset + 6)
    switch feedback {
    case .overlay, .ripple: #expect(actual.isClose(to: light[.error].opacity(0.5).rgba8(over: light[.surface])))
    case .dim, .none: #expect(actual.isClose(to: light[.surface].rgba8()))
    }
  }

  /// TAB-10 — the tab's corners follow the corner smoothing (when a system rounds them); focus follows the focus style.
  @Test("TAB-10 corner smoothing and focus style reach the tab")
  func cornersAndFocusStyle() throws {
    func render(_ amount: Double, focused: Bool = false, style: TanreiFocusStyle = .ring) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      custom.tabs.containerShape = 16
      custom.tabs.variants.primary.enabled.containerColor = .role(.error)
      custom.behavior.focusStyle = style
      return try Snapshot.renderExact(chrome(focused: focused), theme: theme(custom))
    }
    let continuous = try render(0.6)
    #expect(try render(0).mismatch(against: continuous, channelTolerance: 0) > 0)
    #expect(try render(1).mismatch(against: continuous, channelTolerance: 0) == 0)
    #expect(try render(0.6, focused: true, style: .glow).mismatch(against: try render(0.6, focused: true, style: .ring), channelTolerance: 0) > 0)
  }

  /// TAB-23, TAB-17, TAB-15, TAB-9 — the state motion, the indicator's slide (and a tab scrolled into view) and the ripple's
  /// growth come from the tokens; none under Reduce Motion.
  @Test("TAB-23 TAB-17 TAB-15 the motions come from the tokens; none under Reduce Motion")
  func motion() {
    var custom = tokens
    custom.motionStateDuration = 400
    custom.motionStateEasing = TanreiCubicBezier(0, 0, 1, 1)
    custom.motionFeedbackDuration = 900
    custom.motionIndicatorDuration = 700
    custom.motionIndicatorEasing = TanreiCubicBezier(0.1, 0.2, 0.3, 0.4)
    #expect(custom.stateMotion(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.4))
    #expect(custom.rippleGrowth(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.9))
    #expect(custom.indicatorMotion(reduceMotion: false) == Animation.timingCurve(0.1, 0.2, 0.3, 0.4, duration: 0.7))
    #expect(custom.stateMotion(reduceMotion: true) == nil && custom.rippleGrowth(reduceMotion: true) == nil && custom.indicatorMotion(reduceMotion: true) == nil)
  }
}

// MARK: - Rendered (TAB-4, TAB-5, TAB-11, TAB-13, TAB-14, TAB-16, TAB-17, TAB-18, TAB-20, TAB-21)

@MainActor
@Suite("TanreiTabs rendered")
struct TanreiTabsRenderedTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiTabsTokens { system.tabs }

  /// TAB-4 — the focus ring inside the tab (a scrolling row cannot clip it), keyboard focus only, not dimmed; the tab keeps
  /// its size.
  @Test("TAB-4 the focus ring is drawn inside the tab")
  func focusRing() throws {
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.containerShape, measure: system.measure)
    let ringX = Snapshot.inset + metrics.outerWidth / 2
    let y = Snapshot.inset + tokens.containerHeight / 2
    let focused = try Snapshot.render(chrome(focused: true))
    #expect(pixel(focused, x: ringX, y: y).isClose(to: light[.focusRing].rgba8(), tolerance: 40))
    #expect(pixel(focused, x: Snapshot.inset - 1, y: y).isClose(to: light[.surface].rgba8()))
    #expect(visualSize(focused) == visualSize(try Snapshot.render(chrome())))
    #expect(!pixel(try Snapshot.render(chrome()), x: ringX, y: y).isClose(to: light[.focusRing].rgba8(), tolerance: 40))
    var dim = system
    dim.tabs.focused.opacity = 0.3
    #expect(pixel(try Snapshot.render(chrome(focused: true), theme: theme(dim)), x: ringX, y: y).isClose(to: light[.focusRing].rgba8(), tolerance: 40))
  }

  /// TAB-5 — a tab is at least the minimum target wide and tall (it cannot reach over its neighbours or the panel); the
  /// target is a value of the design system.
  @Test("TAB-5 each tab is at least the minimum target wide and tall")
  func target() throws {
    var custom = system
    custom.measure.targetPointer = 90
    custom.measure.targetTouch = 90
    custom.tabs.containerHeight = 20
    let target = TanreiHitTarget.minimum(in: custom.measure)
    // Fixed: five tabs in 360 would be 72 wide; each is 90 instead, and 90 tall.
    let names = ["A", "B", "C", "D", "E"]
    let many = TanreiTabs(selection: .constant("a")) { ForEach(names, id: \.self) { TanreiTab($0).tag($0.lowercased()) } }
      .fixedSize()
    let size = visualSize(try Snapshot.render(many, theme: theme(custom)))
    #expect(size.height == target && size.width == target * 5)
    let geometry = TanreiTabGeometry(tokens: custom.tabs, variant: .primary, entry: TanreiTabEntry(title: "A"), measure: custom.measure)
    #expect(geometry.minimumWidth == target && geometry.minimumHeight == target)
  }

  /// TAB-11 — the selected tab draws its selected parts (text and indicator), the others their own; a selection naming no
  /// tab draws none selected.
  @Test("TAB-11 the selected tab draws the selected parts; an unknown selection selects none")
  func selectedLook() throws {
    var custom = system
    custom.tabs.variants.primary.enabled.selectedLabelColor = .role(.error)
    custom.tabs.variants.primary.enabled.labelColor = .role(.success)
    let bottom = Snapshot.inset + tokens.containerHeight - 1
    let rendered = try Snapshot.render(row(), theme: theme(custom))
    #expect(pixel(rendered, x: Snapshot.inset + 60, y: bottom).isClose(to: light[.primary].rgba8(), tolerance: 12))
    #expect(!pixel(rendered, x: Snapshot.inset + 180, y: bottom).isClose(to: light[.primary].rgba8(), tolerance: 12))
    func inks(_ bitmap: Bitmap, _ color: Bitmap.RGBA, from: CGFloat, to: CGFloat) -> Bool {
      stride(from: from, to: to, by: 0.5).contains { x in
        stride(from: Snapshot.inset + 14, to: Snapshot.inset + 34, by: 0.5).contains { pixel(bitmap, x: x, y: $0).isClose(to: color, tolerance: 40) }
      }
    }
    let error = light[.error].rgba8()
    let success = light[.success].rgba8()
    #expect(inks(rendered, error, from: Snapshot.inset, to: Snapshot.inset + 120) && !inks(rendered, success, from: Snapshot.inset, to: Snapshot.inset + 120))
    #expect(inks(rendered, success, from: Snapshot.inset + 120, to: Snapshot.inset + 240) && !inks(rendered, error, from: Snapshot.inset + 120, to: Snapshot.inset + 360))
    let (none, reports) = try Reports.collecting { try Snapshot.render(row(selection: .constant("missing")), theme: theme(custom)) }
    #expect(reports.mention("names none"))
    #expect(!inks(none, error, from: Snapshot.inset, to: Snapshot.inset + 360))
    #expect(!pixel(none, x: Snapshot.inset + 60, y: bottom).isClose(to: light[.primary].rgba8(), tolerance: 12))
    // nil: the first enabled tab is selected.
    let first = try Snapshot.render(row(selection: .constant(nil), disabled: [0]), theme: theme(custom))
    #expect(pixel(first, x: Snapshot.inset + 180, y: bottom).isClose(to: light[.primary].rgba8(), tolerance: 12))
  }

  /// TAB-13 — only the selected tab's panel is shown, below the row; none while no tab is selected; the panel changes
  /// with the selection (TAB-17: at once — `animation(nil)`).
  @Test("TAB-13 TAB-17 only the selected tab's panel is shown, below the row")
  func panels() throws {
    let height = tokens.containerHeight
    let below = Snapshot.inset + height + 20
    let first = try Snapshot.render(row(panels: true))
    #expect(visualSize(first).height == height + 40)
    #expect(pixel(first, x: Snapshot.inset + 180, y: below).isClose(to: Color.red.rgba8()))
    let second = try Snapshot.render(row(selection: .constant("activity"), panels: true))
    #expect(pixel(second, x: Snapshot.inset + 180, y: below).isClose(to: Color.green.rgba8()))
    let (none, _) = try Reports.collecting { try Snapshot.render(row(selection: .constant("missing"), panels: true)) }
    #expect(visualSize(none).height == height)
  }

  /// TAB-14 — fixed: the width divided equally, each tab at least the minimum target; a label that does not fit wraps and
  /// grows every tab of the row to the tallest. Scrollable: each tab its content on one line plus the padding.
  @Test("TAB-14 fixed rows divide the width and wrap; scrollable rows size each tab to its content")
  func layout() throws {
    // Equal widths: the selected (first) indicator of a secondary row spans exactly a third of 360.
    let secondary = try Snapshot.render(row(variant: .secondary))
    let bottom = Snapshot.inset + tokens.containerHeight - 1
    let indigo = light[.primary].rgba8()
    #expect(pixel(secondary, x: Snapshot.inset + 119, y: bottom).isClose(to: indigo, tolerance: 12))
    #expect(!pixel(secondary, x: Snapshot.inset + 121, y: bottom).isClose(to: indigo, tolerance: 12))
    // Wrapping: a long label in a narrow fixed row grows the row (every tab) above a single line.
    let long = TanreiTabs(selection: .constant("a")) {
      TanreiTab("A label far too long for one line").tag("a")
      TanreiTab("B").tag("b")
    }
    .frame(width: 200)
    let wrapped = visualSize(try Snapshot.render(long))
    let line = tokens.labelTypescale.lineHeight
    let clearance = tokens.variants.primary.enabled.activeIndicatorThickness
    #expect(wrapped.height > tokens.containerHeight && wrapped.height >= 2 * line + 2 * clearance)
    // Scrollable: a tab is its label on one line plus padding-inline on each side.
    let one = visualSize(try Snapshot.render(TanreiTabs(selection: .constant("a"), scrollable: true) { TanreiTab("Deployments").tag("a") }.fixedSize()))
    let text = visualSize(try Snapshot.render(Text(verbatim: "Deployments").tanreiTextStyle(tokens.labelTypescale).fixedSize()))
    #expect(abs(one.width - (text.width + 2 * tokens.containerPaddingInline)) <= 1)
    #expect(one.height == tokens.containerHeight)
  }

  /// TAB-16 — the indicator on the row's bottom edge: primary's spans the tab's content, 3 thick, its top corners rounded;
  /// secondary's the whole tab, 2 thick and square. The content stays clear of it (TAB-16's last sentence).
  @Test("TAB-16 the indicator's extent, thickness and corners")
  func indicator() throws {
    let bottom = Snapshot.inset + tokens.containerHeight
    let color = light[.primary].rgba8()
    let primary = try Snapshot.render(chrome(selected: true))
    let secondary = try Snapshot.render(chrome(variant: .secondary, selected: true))
    let primaryThickness = tokens.variants.primary.enabled.activeIndicatorThickness
    let secondaryThickness = tokens.variants.secondary.enabled.activeIndicatorThickness
    // Thickness.
    #expect(pixel(primary, x: Snapshot.inset + 60, y: bottom - primaryThickness + 0.5).isClose(to: color, tolerance: 12))
    #expect(!pixel(primary, x: Snapshot.inset + 60, y: bottom - primaryThickness - 0.5).isClose(to: color, tolerance: 12))
    #expect(pixel(secondary, x: Snapshot.inset + 60, y: bottom - secondaryThickness + 0.5).isClose(to: color, tolerance: 12))
    #expect(!pixel(secondary, x: Snapshot.inset + 60, y: bottom - secondaryThickness - 0.5).isClose(to: color, tolerance: 12))
    // Extent: secondary to the tab's edges; primary only under the content (inside the padding).
    #expect(pixel(secondary, x: Snapshot.inset + 0.5, y: bottom - 0.5).isClose(to: color, tolerance: 12))
    #expect(!pixel(primary, x: Snapshot.inset + tokens.containerPaddingInline, y: bottom - 0.5).isClose(to: color, tolerance: 12))
    // Corners: primary's top corners are rounded (the corner pixel is not filled), secondary's square.
    let start = try #require(stride(from: Snapshot.inset, to: Snapshot.inset + 60, by: 0.5).first { pixel(primary, x: $0, y: bottom - 0.5).isClose(to: color, tolerance: 12) })
    #expect(!pixel(primary, x: start, y: bottom - primaryThickness + 0.5).isClose(to: color, tolerance: 12))
    #expect(pixel(secondary, x: Snapshot.inset + 0.5, y: bottom - secondaryThickness + 0.5).isClose(to: color, tolerance: 12))
    // Clear of the indicator: a label that fills the tab still ends above it.
    var tall = system
    tall.tabs.containerHeight = 1
    let tight = try Snapshot.render(chrome(selected: true), theme: theme(tall))
    #expect(visualSize(tight).height >= tokens.labelTypescale.lineHeight + 2 * primaryThickness)
  }

  /// TAB-18 — heights (a text tab, a primary tab with its icon stacked above the label), the gap, and the icon and label
  /// sizes; a secondary tab places its icon before its label.
  @Test("TAB-18 heights, stacking and the icon's place")
  func arrangement() throws {
    let icon = TanreiItemIcon.image(Image(systemName: "square.fill"))
    let entry = TanreiTabEntry(title: "Overview", icon: icon)
    #expect(TanreiTabGeometry(tokens: tokens, variant: .primary, entry: entry, measure: system.measure).arrangement == .stacked)
    #expect(TanreiTabGeometry(tokens: tokens, variant: .secondary, entry: entry, measure: system.measure).arrangement == .inline)
    #expect(TanreiTabGeometry(tokens: tokens, variant: .primary, entry: TanreiTabEntry(title: "A"), measure: system.measure).arrangement == .labelOnly)
    let stacked = try Snapshot.render(chrome(entry))
    let inline = try Snapshot.render(chrome(entry, variant: .secondary))
    #expect(visualSize(stacked).height == tokens.containerHeightWithIcon)
    #expect(visualSize(inline).height == tokens.containerHeight)
    // Stacked: the icon (square, on-surface-variant) is centered horizontally above the label.
    let ink = light[.onSurfaceVariant].rgba8()
    let column = Snapshot.inset + 60
    let rows = stride(from: Snapshot.inset, to: Snapshot.inset + tokens.containerHeightWithIcon, by: 0.5).filter { pixel(stacked, x: column, y: $0).isClose(to: ink, tolerance: 30) }
    let iconTop = try #require(rows.first)
    #expect(iconTop < Snapshot.inset + tokens.containerHeightWithIcon / 2)
    // Inline: the icon at the start of the content, level with the label.
    let middle = Snapshot.inset + tokens.containerHeight / 2
    let first = try #require(stride(from: Snapshot.inset, to: Snapshot.inset + 120, by: 0.5).first { pixel(inline, x: $0, y: middle).isClose(to: ink, tolerance: 30) })
    #expect(first < Snapshot.inset + 40)
    // The values drive it: a larger gap and height move the label.
    var custom = system
    custom.tabs.containerHeightWithIcon = 90
    #expect(visualSize(try Snapshot.render(chrome(entry), theme: theme(custom))).height == 90)
  }

  /// TAB-20 — the divider along the bottom of the whole row, under the indicator, in its color and thickness, across the
  /// full width — also for a scrolling row.
  @Test("TAB-20 the divider spans the row, under the indicator, in its color and thickness")
  func divider() throws {
    var custom = system
    custom.tabs.dividerColor = .role(.error)
    custom.tabs.dividerThickness = 2
    let bottom = Snapshot.inset + tokens.containerHeight
    for scrollable in [false, true] {
      let rendered = try Snapshot.render(row(scrollable: scrollable), theme: theme(custom))
      #expect(pixel(rendered, x: Snapshot.inset + 358, y: bottom - 1).isClose(to: light[.error].rgba8()))
      #expect(pixel(rendered, x: Snapshot.inset + 200, y: bottom - 1.5).isClose(to: light[.error].rgba8()))
      #expect(!pixel(rendered, x: Snapshot.inset + 200, y: bottom - 2.5).isClose(to: light[.error].rgba8()))
      // Under the indicator: where it is drawn, the indicator shows.
      #expect(pixel(rendered, x: Snapshot.inset + 60, y: bottom - 1).isClose(to: light[.primary].rgba8(), tolerance: 12), "scrollable: \(scrollable)")
    }
  }

  /// TAB-21 — right to left, the tabs are ordered from the right (the first tab, selected, at the right edge) and a
  /// scrollable row starts at its right edge.
  @Test("TAB-21 right to left the row is mirrored and starts at its right edge")
  func rightToLeft() throws {
    let bottom = Snapshot.inset + tokens.containerHeight - 1
    for scrollable in [false, true] {
      let rendered = try Snapshot.render(row(variant: .secondary, scrollable: scrollable).environment(\.layoutDirection, .rightToLeft))
      #expect(pixel(rendered, x: Snapshot.inset + 358, y: bottom).isClose(to: light[.primary].rgba8(), tolerance: 12), "scrollable: \(scrollable)")
      #expect(!pixel(rendered, x: Snapshot.inset + 2, y: bottom).isClose(to: light[.primary].rgba8(), tolerance: 12), "scrollable: \(scrollable)")
    }
  }
}

// MARK: - Fixtures (one per spec fixture)

/// Draws a fixture of specs/tabs.spec.json as a product writes it (TAB-14's verify): one row of tabs 360 wide and no panel,
/// holding the fixture's tabs in order; variant, scrollable, selected and label apply to the row and each tab's props to
/// that tab.
@MainActor
enum TanreiTabsFixtures {
  static let symbols: [String: String] = ["dashboard": "square.grid.2x2", "history": "clock", "settings": "gearshape"]

  static let width: CGFloat = 360

  static func icon(_ name: String?, selected: Bool) -> TanreiItemIcon? {
    guard let name, !name.isEmpty else { return nil }
    guard let symbol = symbols[name] else { return TanreiItemIcon(name) }
    return .image(Image(systemName: selected ? "\(symbol).fill" : symbol))
  }

  static func tab(_ spec: SpecItem, selected: String?) -> some View {
    let value = spec.string("value") ?? ""
    let tab = TanreiTab(spec.string("label") ?? "", icon: icon(spec.string("icon"), selected: value == selected)).tag(value)
    return (spec.bool("labelHidden") == true ? tab.labelStyle(.iconOnly) : tab)
      .disabled(spec.bool("disabled") ?? false)
  }

  static func view(_ fixture: SpecFixture, selection: Binding<String?>? = nil) -> some View {
    let items = fixture.items ?? []
    let selected = fixture.string("selected")
    return TanreiTabs(
      selection: selection ?? .constant(selected), variant: fixture.string("variant").map(TanreiTabsVariant.init(rawValue:)) ?? .primary,
      scrollable: fixture.bool("scrollable") ?? false, label: LocalizedStringKey(fixture.string("label") ?? "")
    ) {
      ForEach(items.indices, id: \.self) { index in tab(items[index], selected: selected) }
    }
    .frame(width: width)
  }
}

@MainActor
@Suite("TanreiTabs snapshots")
struct TanreiTabsSnapshotTests {
  /// Mirrors `fixtures` in specs/tabs.spec.json.
  nonisolated static let fixtures = [
    "primary", "secondary", "primary-icons", "secondary-icons", "primary-icon-only", "primary-second-selected", "primary-scrollable",
    "secondary-scrollable", "primary-disabled", "secondary-disabled", "primary-selected-disabled",
  ]

  static func fixture(_ id: String) throws -> SpecFixture {
    try #require(try SpecFixture.load(spec: "tabs").first { $0.id == id })
  }

  @Test("TAB-14 fixture matches its baseline", arguments: fixtures)
  func fixture(_ id: String) throws {
    try Snapshot.assert(TanreiTabsFixtures.view(try Self.fixture(id)), named: id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    #expect(try SpecFixture.load(spec: "tabs").map(\.id) == Self.fixtures)
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiTabsTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiTabs preset snapshots")
struct TanreiTabsPresetSnapshotTests {
  /// Primary tabs with icons: the preset's indicator, its selected and unselected colors, icon size and label style.
  nonisolated static let fixtureId = "primary-icons"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .m3ExpressiveLike, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiTabsSnapshotTests.fixtures.contains(Self.fixtureId))
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try TanreiTabsSnapshotTests.fixture(Self.fixtureId)
    try Snapshot.assert(TanreiTabsFixtures.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
