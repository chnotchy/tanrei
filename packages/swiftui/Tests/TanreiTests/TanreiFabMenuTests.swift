import AcmeFixture
import SwiftUI
import Testing

@_spi(Fixtures) @testable import Tanrei

// Covers specs/fab-menu.spec.json. Each behavior id (FBM-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file. FBM-8, FBM-9 and FBM-10 are BTN-8, BTN-9 and BTN-10 for the toggle and each
// item: the primitives they rest on are tested once in TanreiButtonTests / TanreiPrimitivesTests; here each is proven to
// reach the FAB menu. The fixtures draw the FAB menu in place (`.inPlace()`, FBM-13's verify) on a 320 × 320 stage, the
// toggle 16 from its inline-end bottom corner: a stage of 320 less the snapshot's own inset on each side. The presentation
// in a popover, the keyboard and the accessibility tree are the platform's and are exercised by the gallery's UI tests.
//
// Icons: Tanrei does not bundle the icon font, and baselines render with `Snapshot.theme` (`fontFamilyPolicy: .system`),
// under which a glyph draws nothing. The fixtures' glyph names are drawn with the SF Symbol a product would pass for
// them; the open toggle's close glyph is the icon set's `close`, drawn as a cross without the font (as the chip's).

private let suiteName = "TanreiFabMenuTests"

/// What a hosted FAB menu asked for, in order; observed, so the menu redraws when its binding is written.
@MainActor
@Observable
private final class Log {
  var events: [String] = []
  var isPresented = false

  var binding: Binding<Bool> {
    Binding(get: { self.isPresented }, set: { self.isPresented = $0; self.events.append("isPresented \($0)") })
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

/// Whether no two colors of `colors` are the same.
private func allDistinct(_ colors: [Bitmap.RGBA]) -> Bool {
  colors.indices.allSatisfy { i in colors.indices.allSatisfy { j in i == j || colors[i] != colors[j] } }
}

private let light = TanreiSystem.tanrei.colors.light
private let documentFolderUpload = ["Document", "Folder", "Upload"]

/// A FAB menu drawn in place with items named `titles` whose icon draws nothing, and a toggle icon that draws nothing
/// unless given: every sampled point of a container is the container.
@MainActor
private func menu(
  _ variant: TanreiFabMenuVariant = .filled, size: TanreiFabMenuSize = .medium, isPresented: Binding<Bool>, titles: [String] = documentFolderUpload,
  action: @escaping @MainActor (String) -> Void = { _ in }
) -> some View {
  TanreiFabMenu("Create", variant: variant, size: size, isPresented: isPresented) {
    ForEach(titles, id: \.self) { title in
      TanreiFabMenuItem(title, icon: .view(Color.clear), action: { action(title) })
    }
  } icon: {
    Color.clear
  }
  .inPlace()
}

/// The stage of FBM-13's verify: 320 × 320 with the snapshot's inset around it, the toggle in its inline-end bottom corner.
@MainActor
private func onStage(_ content: some View) -> some View {
  let inner = TanreiFabMenuFixtures.stage - 2 * Snapshot.inset
  return Color.clear.frame(width: inner, height: inner).overlay(alignment: .bottomTrailing) { content }
}

/// The toggle chrome alone, with an icon view that draws nothing unless given.
@MainActor
private func toggle(
  _ variant: TanreiFabMenuVariant = .filled, size: TanreiFabMenuSize = .medium, isOpen: Bool = false, isPressed: Bool = false, isFocused: Bool = false
) -> some View {
  TanreiFabMenuToggleChrome(variant: variant, size: size, isOpen: isOpen, isPressed: isPressed, isFocused: isFocused) { Color.clear }
}

/// One item's chrome alone.
@MainActor
private func item(
  _ title: String = "Upload", icon: TanreiItemIcon = .view(Color.clear), variant: TanreiFabMenuVariant = .filled, isPressed: Bool = false,
  isFocused: Bool = false
) -> some View {
  TanreiFabMenuItemChrome(title: title, icon: icon, variant: variant, isPressed: isPressed, isFocused: isFocused)
}

/// The geometry of an in-place FAB menu on the stage, in render points (tanrei's tokens unless given).
@MainActor
private struct StageGeometry {
  let tokens: TanreiFabMenuTokens
  let side: CGFloat
  let itemHeight: CGFloat
  /// The toggle's frame.
  let toggle: CGRect

  init(system: TanreiSystem = .tanrei, size: TanreiFabMenuSize = .medium, rightToLeft: Bool = false) {
    tokens = system.fabMenu
    side = tokens.sizes[size].containerSize
    itemHeight = max(tokens.itemHeight, TanreiHitTarget.minimum(in: system.measure))
    let end = TanreiFabMenuFixtures.stage - Snapshot.inset
    let x = rightToLeft ? Snapshot.inset : end - side
    toggle = CGRect(x: x, y: end - side, width: side, height: side)
  }

  /// The top of item `index` of `count` (the first at the top).
  func itemTop(_ index: Int, of count: Int = 3) -> CGFloat {
    toggle.minY - tokens.listOffset - CGFloat(count - index) * itemHeight - CGFloat(count - 1 - index) * tokens.listGap
  }

  func itemMidY(_ index: Int, of count: Int = 3) -> CGFloat { itemTop(index, of: count) + itemHeight / 2 }
}

// MARK: - Fixtures (one per spec fixture)

/// Draws a fixture of specs/fab-menu.spec.json as a product writes it, in place (FBM-13 verify): the icon slot's glyph and
/// the items' glyphs as the SF Symbols a product would pass for them, the items the fixture's items in order.
@MainActor
enum TanreiFabMenuFixtures {
  /// FBM-13 verify: the stage's side.
  static let stage: CGFloat = 320

  static let symbols: [String: String] = [
    "add": "plus", "description": "doc.text", "create_new_folder": "folder.badge.plus", "upload": "square.and.arrow.up",
  ]

  static func icon(_ name: String) -> TanreiItemIcon {
    guard let symbol = symbols[name] else { return TanreiItemIcon(name) }
    return .image(Image(systemName: symbol))
  }

  static func view(_ fixture: SpecFixture) -> some View {
    let variant = TanreiFabMenuVariant(rawValue: fixture.string("variant") ?? TanreiFabMenuVariant.fallback.rawValue)
    let size = TanreiFabMenuSize(rawValue: fixture.string("size") ?? TanreiFabMenuSize.fallback.rawValue)
    let items = fixture.items ?? []
    let glyph = fixture.slot("icon").first ?? ""
    let menu = TanreiFabMenu(fixture.string("label") ?? "", variant: variant, size: size, isPresented: .constant(fixture.bool("open") ?? false)) {
      ForEach(items.indices, id: \.self) { index in
        TanreiFabMenuItem(items[index].string("label") ?? "", icon: icon(items[index].string("icon") ?? ""), action: {})
      }
    } icon: {
      Image(systemName: symbols[glyph] ?? glyph)
    }
    .inPlace()
    .disabled(fixture.bool("disabled") ?? false)
    return onStage(menu)
  }
}

@MainActor
@Suite("TanreiFabMenu snapshots")
struct TanreiFabMenuSnapshotTests {
  /// Mirrors `fixtures` in specs/fab-menu.spec.json.
  nonisolated static let fixtures = [
    "filled-closed", "tonal-closed", "surface-closed", "small-closed", "large-closed", "filled-open", "tonal-open", "surface-open", "filled-disabled",
  ]

  static func fixture(_ id: String) throws -> SpecFixture {
    try #require(try SpecFixture.load(spec: "fab-menu").first { $0.id == id })
  }

  @Test("FBM-13 fixture matches its baseline", arguments: fixtures)
  func fixture(_ id: String) throws {
    try Snapshot.assert(TanreiFabMenuFixtures.view(try Self.fixture(id)), named: id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    let spec = try SpecFixture.load(spec: "fab-menu")
    #expect(spec.map(\.id) == Self.fixtures)
    for fixture in spec {
      #expect(fixture.string("label") == "Create" && fixture.slot("icon") == ["add"], "\(fixture.id)")
      #expect(fixture.items?.map { $0.string("label") } == documentFolderUpload, "\(fixture.id)")
    }
  }

  /// FBM-13 verify: an open fixture takes 232 of the stage's height (three items, two gaps, the offset, the toggle and the
  /// margin), and the stage is 320 square.
  @Test("FBM-13 an open fixture's items start 232 above the stage's bottom edge")
  func openFixtureGeometry() throws {
    let bitmap = try Snapshot.render(TanreiFabMenuFixtures.view(try Self.fixture("filled-open")))
    #expect(CGFloat(bitmap.width) == TanreiFabMenuFixtures.stage * Snapshot.scale && CGFloat(bitmap.height) == TanreiFabMenuFixtures.stage * Snapshot.scale)
    let geometry = StageGeometry()
    #expect(TanreiFabMenuFixtures.stage - geometry.itemTop(0) == 232)
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiFabMenuTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiFabMenu preset snapshots")
struct TanreiFabMenuPresetSnapshotTests {
  /// Filled, open: it shows the preset's open toggle (colors, round corners, size) and its items (height, corners, label
  /// style, gaps, elevation).
  nonisolated static let fixtureId = "filled-open"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiFabMenuSnapshotTests.fixtures.contains(Self.fixtureId))
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try TanreiFabMenuSnapshotTests.fixture(Self.fixtureId)
    try Snapshot.assert(TanreiFabMenuFixtures.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}

// MARK: - Rules (FBM-1, FBM-2, FBM-13, FBM-15, FBM-17, FBM-19, FBM-20, FBM-23)

@MainActor
@Suite("TanreiFabMenu rules")
struct TanreiFabMenuRuleTests {
  /// FBM-1 — the toggle asks for the opposite of open, once; FBM-2 — never while disabled.
  @Test("FBM-1 FBM-2 the toggle asks for the opposite of open; nothing while disabled")
  func toggle() {
    #expect(TanreiFabMenuRules.toggled(isOpen: false, isEnabled: true) == true)
    #expect(TanreiFabMenuRules.toggled(isOpen: true, isEnabled: true) == false)
    #expect(TanreiFabMenuRules.toggled(isOpen: false, isEnabled: false) == nil)
    #expect(TanreiFabMenuRules.toggled(isOpen: true, isEnabled: false) == nil)
  }

  /// FBM-2 — a disabled FAB menu is closed whatever `isPresented` says.
  @Test("FBM-2 disabled is closed, whatever isPresented says")
  func disabledIsClosed() {
    #expect(TanreiFabMenuRules.isOpen(true, isEnabled: true))
    #expect(!TanreiFabMenuRules.isOpen(true, isEnabled: false))
    #expect(!TanreiFabMenuRules.isOpen(false, isEnabled: true))
  }

  /// FBM-1, FBM-13 — Down Arrow on the closed toggle opens the menu with focus to the first item, Up Arrow to the last (the
  /// one nearest the toggle); neither does anything while open or disabled, and no other key opens it.
  @Test("FBM-1 FBM-13 Down or Up Arrow opens a closed menu; focus to the first or the last item")
  func arrowsOpen() {
    #expect(TanreiFabMenuRules.opening(for: .downArrow, isOpen: false, isEnabled: true) == TanreiFabMenuOpening(entry: .first, byKey: true))
    #expect(TanreiFabMenuRules.opening(for: .upArrow, isOpen: false, isEnabled: true) == TanreiFabMenuOpening(entry: .last, byKey: true))
    #expect(TanreiFabMenuRules.opening(for: .downArrow, isOpen: true, isEnabled: true) == nil)
    #expect(TanreiFabMenuRules.opening(for: .upArrow, isOpen: false, isEnabled: false) == nil)
    #expect(TanreiFabMenuRules.opening(for: .home, isOpen: false, isEnabled: true) == nil)
    #expect(TanreiFabMenuRules.initialFocus(count: 3, entry: .first) == 0)
    #expect(TanreiFabMenuRules.initialFocus(count: 3, entry: .last) == 2)
    #expect(TanreiFabMenuRules.initialFocus(count: 0, entry: .last) == nil)
  }

  /// FBM-15 — Escape and Tab (Shift+Tab is Tab with a modifier) close the menu from an item, with their reasons; no other
  /// key does. FBM-16's reason is `item`.
  @Test("FBM-15 FBM-16 Escape and Tab close with their reasons")
  func closeKeys() {
    #expect(TanreiFabMenuRules.closeReason(for: .escape) == .escape)
    #expect(TanreiFabMenuRules.closeReason(for: .tab) == .tab)
    #expect(TanreiFabMenuRules.closeReason(for: .downArrow) == nil)
    #expect(TanreiFabMenuRules.closeReason(for: .return) == nil)
    #expect(TanreiMenuCloseReason.item.rawValue == "item" && TanreiMenuCloseReason.outside.rawValue == "outside")
    #expect(TanreiMenuCloseReason.focusOut.rawValue == "focus-out")
  }

  /// FBM-17 — Down and Up move to the next and previous item, wrapping at the ends; Home and End to the first and last.
  @Test("FBM-17 the arrows wrap; Home and End reach the ends")
  func roving() {
    let keys = TanreiRovingKeys(wraps: true)
    func target(_ key: KeyEquivalent, _ from: Int) -> Int? { TanreiFabMenuRules.target(for: key, from: from, count: 3, keys: keys) }
    #expect(target(.downArrow, 0) == 1 && target(.downArrow, 2) == 0)
    #expect(target(.upArrow, 1) == 0 && target(.upArrow, 0) == 2)
    #expect(target(.home, 2) == 0 && target(.end, 0) == 2)
    #expect(target(.leftArrow, 1) == nil)
    // No typeahead: a letter moves nothing (the menu's key handler only asks `target(for:)`).
    #expect(target(KeyEquivalent("f"), 0) == nil)
  }

  /// FBM-3, FBM-4 — focus that moved in after a pointer opened the menu shows neither the focused state nor the ring until
  /// a key leads; the keyboard's own focus does.
  @Test("FBM-3 FBM-4 focus moved in after a pointer shows no ring until the keyboard leads")
  func keyboardLeads() {
    #expect(!TanreiFabMenuRules.keyboardLeads(opening: TanreiFabMenuOpening(entry: .first, byKey: false), isInPlace: false))
    #expect(TanreiFabMenuRules.keyboardLeads(opening: TanreiFabMenuOpening(entry: .first, byKey: true), isInPlace: false))
    #expect(TanreiFabMenuRules.keyboardLeads(opening: TanreiFabMenuOpening(), isInPlace: true))
    #expect(!TanreiFabMenuRules.showsFocus(0, focused: 0, keyboardLeads: false))
    #expect(TanreiFabMenuRules.showsFocus(0, focused: 0, keyboardLeads: true))
    #expect(!TanreiFabMenuRules.showsFocus(1, focused: 0, keyboardLeads: true))
  }

  /// FBM-20 — each item states its position and the number of items.
  @Test("FBM-20 each item states its position among the items")
  func positions() {
    #expect(TanreiFabMenuRules.positionText(index: 0, count: 3) == "1 of 3")
    #expect(TanreiFabMenuRules.positionText(index: 2, count: 3) == "3 of 3")
  }

  /// FBM-23 — fewer than two or more than six items, an empty label, an empty item label or icon: still drawn, reported.
  @Test("FBM-23 an empty label, an empty item label or icon, and fewer than two or more than six items are reported")
  func problems() throws {
    #expect(TanreiFabMenuRules.countProblem(1) != nil && TanreiFabMenuRules.countProblem(7) != nil)
    #expect(TanreiFabMenuRules.countProblem(2) == nil && TanreiFabMenuRules.countProblem(6) == nil)

    let (_, empty) = Reports.collecting {
      _ = TanreiFabMenu("", icon: "add", isPresented: .constant(false)) { TanreiFabMenuItem("A", icon: "a", action: {}) }
      _ = TanreiFabMenuItem("", icon: "upload", action: {})
      _ = TanreiFabMenuItem("Upload", icon: "", action: {})
    }
    #expect(empty.messages.count == 3)
    #expect(empty.mention("FAB menu has an empty label") && empty.mention("label is empty") && empty.mention("icon is empty") && empty.mention("FBM-23"))

    let (_, silent) = Reports.collecting {
      _ = TanreiFabMenu("Create", icon: "add", isPresented: .constant(false)) { TanreiFabMenuItem("A", icon: "a", action: {}) }
      _ = TanreiFabMenuItem("Upload", icon: "upload", action: {})
    }
    #expect(silent.messages.isEmpty)

    // Rendered: one item and seven items still draw, and the count is reported; three are not.
    for (count, reported) in [(1, true), (3, false), (7, true)] {
      let titles = (1...count).map { "Item \($0)" }
      let (bitmap, reports) = try Reports.collecting { try Snapshot.render(onStage(menu(isPresented: .constant(true), titles: titles))) }
      #expect(bitmap.width > 0)
      #expect(reports.mention("holds \(count) item") == reported, "\(count)")
      // The nearest item is drawn above the toggle.
      let geometry = StageGeometry()
      let point = CGPoint(x: geometry.toggle.maxX - geometry.tokens.itemPaddingInlineEnd / 2, y: geometry.itemMidY(count - 1, of: count))
      #expect(pixel(bitmap, x: point.x, y: point.y).isClose(to: light[.primary].rgba8()), "\(count)")
    }
  }

  /// FBM-19 — the stagger starts with the item nearest the toggle (the last).
  @Test("FBM-19 the stagger starts with the item nearest the toggle")
  func staggerOrder() {
    #expect((0..<3).map { TanreiFabMenuRules.staggerOrder(index: $0, count: 3) } == [2, 1, 0])
  }
}

// MARK: - Token bindings (FBM-3, FBM-6, FBM-7, FBM-11, FBM-21)

@MainActor
@Suite("TanreiFabMenu token bindings")
struct TanreiFabMenuTokenBindingTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiFabMenuTokens { system.fabMenu }

  /// The default system's values: closed (container, icon), open (container, icon), items
  /// (container, label, icon).
  static let expected: [TanreiFabMenuVariant: [TanreiColorRole]] = [
    .filled: [.primary, .onPrimary, .secondaryContainer, .onSecondaryContainer, .primary, .onPrimary, .onPrimary],
    .tonal: [.secondaryContainer, .onSecondaryContainer, .primary, .onPrimary, .secondaryContainer, .onSecondaryContainer, .onSecondaryContainer],
    .surface: [.surfaceContainerLowest, .primary, .secondaryContainer, .onSecondaryContainer, .surfaceContainerLowest, .onSurface, .primary],
  ]

  private func toggleLook(
    _ variant: TanreiFabMenuVariant, open: Bool, _ state: TanreiInteraction, size: TanreiFabMenuSize = .medium, tokens: TanreiFabMenuTokens? = nil
  ) -> TanreiFabMenuToggleAppearance {
    TanreiFabMenuToggleAppearance(tokens: tokens ?? self.tokens, variant: variant, size: size, isOpen: open, state: state)
  }

  private func itemLook(_ variant: TanreiFabMenuVariant, _ state: TanreiInteraction, tokens: TanreiFabMenuTokens? = nil) -> TanreiFabMenuItemAppearance {
    TanreiFabMenuItemAppearance(tokens: tokens ?? self.tokens, variant: variant, state: state)
  }

  /// FBM-3, FBM-11, FBM-21 — at rest each variant's three looks bind their roles; the toggle casts level3 closed and open,
  /// the items level2; the open toggle takes the variant's other look.
  @Test("FBM-3 FBM-21 at rest each variant's closed, open and item looks bind the expected roles and elevations", arguments: TanreiFabMenuVariant.core)
  func roles(variant: TanreiFabMenuVariant) throws {
    let roles = try #require(Self.expected[variant])
    let closed = toggleLook(variant, open: false, .enabled)
    let open = toggleLook(variant, open: true, .enabled)
    let item = itemLook(variant, .enabled)
    #expect(closed.container == .role(roles[0]) && closed.icon == .role(roles[1]))
    #expect(open.container == .role(roles[2]) && open.icon == .role(roles[3]))
    #expect(item.container == .role(roles[4]) && item.label == .role(roles[5]) && item.icon == .role(roles[6]))
    #expect(closed.elevation == system.elevation.level3 && open.elevation == system.elevation.level3)
    #expect(item.elevation == system.elevation.level2)
    #expect(closed.opacity == 1 && open.opacity == 1 && item.opacity == 1)
    #expect(closed.ripple == nil && open.ripple == nil && item.ripple == nil)
    // Each look's state-layer color aliases its content color.
    let rest = tokens.variants[variant].enabled
    #expect(rest.stateLayerColor == rest.iconColor && rest.openStateLayerColor == rest.openIconColor && rest.itemStateLayerColor == rest.itemLabelColor)
  }

  /// FBM-19 — the open toggle's fill differs from the closed one's, light and dark, and the three variants
  /// differ at rest.
  @Test("FBM-3 open differs from closed, and the variants differ at rest, light and dark")
  func looksDiffer() {
    for scheme in [system.colors.light, system.colors.dark] {
      for variant in TanreiFabMenuVariant.core {
        #expect(scheme[toggleLook(variant, open: true, .enabled).container].rgba8() != scheme[toggleLook(variant, open: false, .enabled).container].rgba8())
      }
      #expect(allDistinct(TanreiFabMenuVariant.core.map { scheme[toggleLook($0, open: false, .enabled).container].rgba8() }))
    }
  }

  /// FBM-11 — each size binds its square, corner and icon box (40 / 48 / 64, corners 8 / 12 / 16, icons 20 / 24 / 24);
  /// open, the corners are `container.shape-open`, held to half the side.
  @Test("FBM-11 each size binds its side, closed corner and icon; open corners are shape-open held to half the side")
  func sizes() {
    for size in TanreiFabMenuSize.core {
      let metrics = tokens.sizes[size]
      let closed = toggleLook(.filled, open: false, .enabled, size: size)
      let open = toggleLook(.filled, open: true, .enabled, size: size)
      #expect(closed.containerSize == metrics.containerSize && closed.iconSize == metrics.iconSize && closed.cornerRadius == metrics.containerShape)
      #expect(open.containerSize == metrics.containerSize && open.cornerRadius == metrics.containerSize / 2)
    }
    let sizes = [tokens.sizes.small, tokens.sizes.medium, tokens.sizes.large]
    #expect(sizes.map(\.containerSize) == [40, 48, 64])
    #expect(sizes.map(\.containerShape) == [system.shape.medium, system.shape.large, system.shape.extraLarge])
    #expect(sizes.map(\.iconSize) == [system.measure.iconMedium, system.measure.iconLarge, system.measure.iconLarge])
    #expect(tokens.containerShapeOpen == system.shape.full)
    // A shape-open below half the side is used as it is.
    var custom = tokens
    custom.containerShapeOpen = 6
    custom.sizes.large.containerShape = 3
    #expect(toggleLook(.filled, open: true, .enabled, size: .large, tokens: custom).cornerRadius == 6)
    #expect(toggleLook(.filled, open: false, .enabled, size: .large, tokens: custom).cornerRadius == 3)
  }

  /// FBM-3, FBM-21 — every state reads that state's tokens of its look: the look's state-layer color mixed into its
  /// container (a value of this system); hover lifts the toggle to level4, closed and open, and leaves the items at level2.
  @Test("FBM-3 FBM-21 each state binds that state's tokens of each look; hover lifts the toggle only", arguments: TanreiFabMenuVariant.core)
  func stateBindings(variant: TanreiFabMenuVariant) {
    let v = tokens.variants[variant]
    let amounts: [(TanreiInteraction, Double)] = [
      (.hovered, system.state.hoverStateLayerOpacity), (.focused, system.state.focusStateLayerOpacity), (.pressed, system.state.pressedStateLayerOpacity),
    ]
    for (state, amount) in amounts {
      let closed = toggleLook(variant, open: false, state)
      let open = toggleLook(variant, open: true, state)
      let item = itemLook(variant, state)
      #expect(closed.container == .mix(base: v.enabled.containerColor, with: v.enabled.stateLayerColor, amount: amount), "\(variant) \(state)")
      #expect(open.container == .mix(base: v.enabled.openContainerColor, with: v.enabled.openStateLayerColor, amount: amount), "\(variant) \(state)")
      #expect(item.container == .mix(base: v.enabled.itemContainerColor, with: v.enabled.itemStateLayerColor, amount: amount), "\(variant) \(state)")
      #expect(closed.container == v[state: state].containerColor && open.container == v[state: state].openContainerColor)
      #expect(item.container == v[state: state].itemContainerColor && item.label == v[state: state].itemLabelColor)
      let lift = state == .hovered ? system.elevation.level4 : system.elevation.level3
      #expect(closed.elevation == lift && open.elevation == lift, "\(variant) \(state)")
      #expect(item.elevation == system.elevation.level2, "\(variant) \(state)")
    }
  }

  /// FBM-3 (verify) — under the acme fixture system, hovered, focused and pressed are three different values, for the
  /// closed toggle, the open toggle and the items.
  @Test("FBM-3 under acme, hovered, focused and pressed differ in every look")
  func acme() {
    let tokens = TanreiSystem.acme.fabMenu
    let colors = TanreiSystem.acme.colors.light
    let states: [TanreiInteraction] = [.hovered, .focused, .pressed]
    for variant in TanreiFabMenuVariant.core {
      for open in [false, true] {
        let containers = states.map { TanreiFabMenuToggleAppearance(tokens: tokens, variant: variant, size: .medium, isOpen: open, state: $0).container }
        #expect(allDistinct(containers.map { colors[$0].rgba8() }), "\(variant) open \(open)")
      }
      let items = states.map { TanreiFabMenuItemAppearance(tokens: tokens, variant: variant, state: $0).container }
      #expect(allDistinct(items.map { colors[$0].rgba8() }), "\(variant) items")
    }
  }

  /// FBM-6 — disabled draws the closed parts' disabled tokens: an on-surface fill, the icon as disabled content, level0.
  @Test("FBM-6 disabled binds the closed parts' disabled tokens", arguments: TanreiFabMenuVariant.core)
  func disabled(variant: TanreiFabMenuVariant) {
    let drawn = toggleLook(variant, open: false, .disabled)
    let own = tokens.variants[variant].disabled
    #expect(drawn.container == .alpha(of: .role(.onSurface), amount: system.state.disabledContainerOpacity))
    #expect(drawn.icon == .alpha(of: .role(.onSurface), amount: system.state.disabledContentOpacity))
    #expect(drawn.elevation.isEmpty)
    #expect(drawn.container == own.containerColor && drawn.icon == own.iconColor && drawn.opacity == tokens.disabled.opacity)
  }

  /// FBM-3 FBM-6 FBM-21 — the values drive the result: change one token of one state of one look and exactly that changes.
  @Test("FBM-3 FBM-6 FBM-21 a modified system changes what each look resolves to")
  func modifiedSystem() {
    var custom = tokens
    custom.variants.filled.hovered.containerColor = .role(.error)
    custom.variants.filled.hovered.openContainerColor = .role(.success)
    custom.variants.filled.hovered.itemContainerColor = .role(.warning)
    custom.variants.filled.focused.openIconColor = .role(.error)
    custom.variants.filled.pressed.itemLabelColor = .role(.success)
    custom.variants.filled.pressed.openContainerElevation = system.elevation.level5
    custom.pressed.opacity = 0.4
    custom.variants.filled.disabled.containerColor = .role(.surfaceDim)
    #expect(toggleLook(.filled, open: false, .hovered, tokens: custom).container == .role(.error))
    #expect(toggleLook(.filled, open: true, .hovered, tokens: custom).container == .role(.success))
    #expect(itemLook(.filled, .hovered, tokens: custom).container == .role(.warning))
    #expect(toggleLook(.filled, open: true, .focused, tokens: custom).icon == .role(.error))
    #expect(itemLook(.filled, .pressed, tokens: custom).label == .role(.success))
    #expect(toggleLook(.filled, open: true, .pressed, tokens: custom).elevation == system.elevation.level5)
    #expect(toggleLook(.filled, open: false, .pressed, tokens: custom).elevation == system.elevation.level3)
    #expect(itemLook(.filled, .pressed, tokens: custom).opacity == 0.4 && toggleLook(.filled, open: true, .pressed, tokens: custom).opacity == 0.4)
    #expect(toggleLook(.filled, open: false, .disabled, tokens: custom).container == .role(.surfaceDim))
    // Nothing else moved.
    #expect(toggleLook(.filled, open: false, .enabled, tokens: custom) == toggleLook(.filled, open: false, .enabled))
    #expect(toggleLook(.tonal, open: true, .hovered, tokens: custom) == toggleLook(.tonal, open: true, .hovered))
  }

  /// FBM-7 — a variant or size the system does not have draws the default value's tokens in every state and look, and
  /// is reported in debug builds; known values are not.
  @Test("FBM-7 an unknown size and variant bind the default value's tokens, and are reported", arguments: TanreiInteraction.allCases)
  func unknownValues(state: TanreiInteraction) {
    let size = TanreiFabMenuSize(rawValue: "colossal")
    let variant = TanreiFabMenuVariant(rawValue: "sparkly")
    for open in [false, true] {
      let (drawn, reports) = Reports.collecting {
        TanreiFabMenuToggleAppearance(tokens: tokens, variant: variant, size: size, isOpen: open, state: state)
      }
      #expect(drawn == toggleLook(.filled, open: open, state))
      #expect(reports.mention("fab-menu size \"colossal\"") && reports.mention("fab-menu variant \"sparkly\""))
    }
    let (item, reports) = Reports.collecting { TanreiFabMenuItemAppearance(tokens: tokens, variant: variant, state: state) }
    #expect(item == itemLook(.filled, state) && reports.mention("sparkly"))
    let (_, silent) = Reports.collecting {
      for variant in TanreiFabMenuVariant.core {
        for size in TanreiFabMenuSize.core { _ = TanreiFabMenuToggleAppearance(tokens: tokens, variant: variant, size: size, isOpen: false, state: state) }
      }
    }
    #expect(silent.messages.isEmpty)
  }

  /// FBM-7 — rendered: an unknown size and variant draw exactly like the default, closed and open (`renderExact`).
  @Test("FBM-7 an unknown size and variant render exactly like the default")
  func unknownValuesRender() throws {
    for open in [false, true] {
      let expected = try Snapshot.renderExact(onStage(menu(.filled, size: .medium, isPresented: .constant(open))))
      let (actual, reports) = try Reports.collecting {
        try Snapshot.renderExact(onStage(menu(TanreiFabMenuVariant(rawValue: "sparkly"), size: TanreiFabMenuSize(rawValue: "colossal"), isPresented: .constant(open))))
      }
      #expect(actual.mismatch(against: expected, channelTolerance: 0) == 0, "open \(open)")
      #expect(reports.mention("colossal") && reports.mention("sparkly"))
    }
    // An added value is read from `extra`.
    var custom = tokens
    custom.variants.extra[TanreiFabMenuVariant(rawValue: "sparkly")] = tokens.variants.tonal
    let (added, reports) = Reports.collecting {
      TanreiFabMenuToggleAppearance(tokens: custom, variant: TanreiFabMenuVariant(rawValue: "sparkly"), size: .medium, isOpen: false, state: .enabled)
    }
    #expect(added == toggleLook(.tonal, open: false, .enabled) && reports.messages.isEmpty)
  }

  /// FBM-19, FBM-21 — the motions: state changes over the state motion, the toggle's turn over the open or close motion,
  /// each item's entrance over the open motion delayed by `motion.stagger` per place; every one `nil` under Reduce Motion.
  @Test("FBM-19 FBM-21 open, close, turn, stagger and state motions come from the tokens; none under Reduce Motion")
  func motions() {
    var tokens = self.tokens
    func curve(_ ms: Double, _ easing: TanreiCubicBezier) -> Animation { .timingCurve(easing.x1, easing.y1, easing.x2, easing.y2, duration: ms / 1000) }
    #expect(tokens.stateMotion(reduceMotion: false) == curve(tokens.motionStateDuration, tokens.motionStateEasing))
    #expect(tokens.openMotion(reduceMotion: false) == curve(tokens.motionOpenDuration, tokens.motionOpenEasing))
    #expect(tokens.closeMotion(reduceMotion: false) == curve(tokens.motionCloseDuration, tokens.motionCloseEasing))
    #expect(tokens.turnMotion(toOpen: true, reduceMotion: false) == tokens.openMotion(reduceMotion: false))
    #expect(tokens.turnMotion(toOpen: false, reduceMotion: false) == tokens.closeMotion(reduceMotion: false))
    #expect(tokens.itemEntrance(order: 0, reduceMotion: false) == curve(tokens.motionOpenDuration, tokens.motionOpenEasing).delay(0))
    #expect(tokens.motionStagger == 100)
    #expect(tokens.itemEntrance(order: 2, reduceMotion: false) == curve(tokens.motionOpenDuration, tokens.motionOpenEasing).delay(0.2))
    for reduce in [tokens.stateMotion(reduceMotion: true), tokens.openMotion(reduceMotion: true), tokens.closeMotion(reduceMotion: true),
      tokens.turnMotion(toOpen: true, reduceMotion: true), tokens.itemEntrance(order: 1, reduceMotion: true), tokens.rippleGrowth(reduceMotion: true)]
    {
      #expect(reduce == nil)
    }
    tokens.motionStagger = 40
    tokens.motionOpenDuration = 700
    tokens.motionOpenEasing = TanreiCubicBezier(0, 0, 1, 1)
    #expect(tokens.itemEntrance(order: 3, reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.7).delay(0.12))
  }
}

// MARK: - Rendered (FBM-2, FBM-4, FBM-5, FBM-6, FBM-10, FBM-11, FBM-12, FBM-13, FBM-14, FBM-18, FBM-21, FBM-22)

@MainActor
@Suite("TanreiFabMenu rendered")
struct TanreiFabMenuRenderedTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiFabMenuTokens { system.fabMenu }
  let inset = Snapshot.inset

  /// FBM-12 — the FAB menu lays out at the toggle's own square, closed or open: the items are drawn above it and move
  /// nothing.
  @Test("FBM-12 it lays out at the toggle's square, open or closed", arguments: TanreiFabMenuSize.core)
  func layoutSize(size: TanreiFabMenuSize) throws {
    let side = (tokens.sizes[size].containerSize + 2 * inset) * Snapshot.scale
    for open in [false, true] {
      let bitmap = try Snapshot.render(menu(size: size, isPresented: .constant(open)))
      #expect(CGFloat(bitmap.width) == side && CGFloat(bitmap.height) == side, "\(size) open \(open)")
    }
  }

  /// FBM-13 — open, the items are a column above the toggle: `list.offset` from its top edge, `list.gap` apart, the first
  /// at the top, every item's end edge on the toggle's end edge. FBM-14 — no scrim: the rest of the stage is unchanged.
  @Test("FBM-13 FBM-14 the items stack above the toggle, end-aligned, offset and gapped; no scrim")
  func column() throws {
    let geometry = StageGeometry()
    let open = try Snapshot.render(onStage(menu(isPresented: .constant(true))))
    let closed = try Snapshot.render(onStage(menu(isPresented: .constant(false))))
    let primary = light[.primary].rgba8()
    let inside = geometry.toggle.maxX - tokens.itemPaddingInlineEnd / 2
    for index in 0..<3 {
      let top = geometry.itemTop(index)
      #expect(pixel(open, x: inside, y: top + 1).isClose(to: primary), "item \(index) top")
      #expect(pixel(open, x: inside, y: top + geometry.itemHeight - 1).isClose(to: primary), "item \(index) bottom")
      #expect(!pixel(open, x: inside, y: top - 1).isClose(to: primary, tolerance: 20), "item \(index) above")
      #expect(!pixel(open, x: inside, y: top + geometry.itemHeight + 1).isClose(to: primary, tolerance: 20), "item \(index) below")
      // End-aligned: the container reaches the toggle's end edge and stops there.
      #expect(pixel(open, x: geometry.toggle.maxX - 1, y: geometry.itemMidY(index)).isClose(to: primary), "item \(index) end")
      #expect(!pixel(open, x: geometry.toggle.maxX + 1, y: geometry.itemMidY(index)).isClose(to: primary, tolerance: 20), "item \(index) past end")
      #expect(!pixel(closed, x: inside, y: geometry.itemMidY(index)).isClose(to: primary, tolerance: 20), "closed \(index)")
    }
    // The nearest item's bottom edge is list.offset above the toggle.
    #expect(geometry.toggle.minY - (geometry.itemTop(2) + geometry.itemHeight) == tokens.listOffset)
    // FBM-14: no scrim — far from the items and the toggle the stage is exactly the closed one.
    #expect(pixel(open, x: inset + 4, y: inset + 4) == pixel(closed, x: inset + 4, y: inset + 4))
    #expect(pixel(open, x: inset + 4, y: inset + 4).isClose(to: light[.surface].rgba8()))
    #expect(TanreiModalCoordinator.shared.openModals == 0)
  }

  /// FBM-13 — the values drive the column: a larger offset and gap move the items.
  @Test("FBM-13 a modified system moves the column")
  func modifiedColumn() throws {
    var custom = system
    custom.fabMenu.listOffset = 20
    custom.fabMenu.listGap = 16
    let geometry = StageGeometry(system: custom)
    let bitmap = try Snapshot.render(onStage(menu(isPresented: .constant(true))), theme: theme(custom))
    let inside = geometry.toggle.maxX - custom.fabMenu.itemPaddingInlineEnd / 2
    for index in 0..<3 {
      #expect(pixel(bitmap, x: inside, y: geometry.itemTop(index) + 1).isClose(to: light[.primary].rgba8()), "\(index)")
      #expect(!pixel(bitmap, x: inside, y: geometry.itemTop(index) - 1).isClose(to: light[.primary].rgba8(), tolerance: 20), "\(index)")
    }
  }

  /// FBM-11, FBM-19 — closed, the toggle is its closed look with the slot's glyph; open, the open look, round corners and
  /// the close glyph (a cross through the center) — the slot's glyph faded out.
  @Test("FBM-11 closed shows the slot's glyph; open shows the open look, round corners and the close glyph")
  func toggleLooks() throws {
    let side = tokens.sizes.medium.containerSize
    let center = CGPoint(x: inset + side / 2, y: inset + side / 2)
    let edge = CGPoint(x: inset + 4, y: inset + side / 2)
    func render(open: Bool) throws -> Bitmap {
      try Snapshot.render(TanreiFabMenuToggleChrome(variant: .filled, size: .medium, isOpen: open, isPressed: false, isFocused: false) { Rectangle() })
    }
    let closed = try render(open: false)
    #expect(pixel(closed, x: edge.x, y: edge.y).isClose(to: light[.primary].rgba8()))
    #expect(pixel(closed, x: center.x, y: center.y).isClose(to: light[.onPrimary].rgba8()))
    #expect(pixel(closed, x: center.x, y: center.y + 5).isClose(to: light[.onPrimary].rgba8()))
    let open = try render(open: true)
    #expect(pixel(open, x: edge.x, y: edge.y).isClose(to: light[.secondaryContainer].rgba8()))
    // The cross's strokes meet at the center; off them, inside the icon box, is the container: the slot's glyph is gone.
    #expect(pixel(open, x: center.x, y: center.y).isClose(to: light[.onSecondaryContainer].rgba8(), tolerance: 40))
    #expect(pixel(open, x: center.x, y: center.y + 5).isClose(to: light[.secondaryContainer].rgba8()))
    // Round corners: with square closed corners, a point by the corner is the container closed and not open.
    var square = system
    square.fabMenu.sizes.medium.containerShape = 0
    let corner = CGPoint(x: inset + 1, y: inset + 1)
    let squareClosed = try Snapshot.render(toggle(), theme: theme(square))
    let roundOpen = try Snapshot.render(toggle(isOpen: true), theme: theme(square))
    #expect(pixel(squareClosed, x: corner.x, y: corner.y).isClose(to: light[.primary].rgba8()))
    #expect(pixel(roundOpen, x: corner.x, y: corner.y).isClose(to: light[.surface].rgba8(), tolerance: 20))
  }

  /// FBM-11 — the icon slot is handed the size's icon box, unselected, and the close glyph is drawn in the same context.
  @Test("FBM-11 the icon slot is handed the size's icon size, unselected")
  func iconContext() throws {
    for size in TanreiFabMenuSize.core {
      let probe = TanreiFabMenuIconProbe.Probe()
      _ = try Snapshot.render(TanreiFabMenuToggleChrome(variant: .filled, size: size, isOpen: false, isPressed: false, isFocused: false) {
        TanreiFabMenuIconProbe(probe: probe)
      })
      #expect(probe.context == TanreiIconContext(size: tokens.sizes[size].iconSize, selected: false), "\(size)")
    }
    // The icon font of an unselected icon: family, fill, weight and optical size clamped to the tokens.
    let icon = system.icon
    for size in TanreiFabMenuSize.core {
      let box = tokens.sizes[size].iconSize
      let drawing = icon.drawing(size: box, selected: false)
      #expect(drawing.family == icon.families.unselected && drawing.axes.fill == icon.fillUnselected)
      #expect(drawing.axes.opticalSize == Double(min(max(box, icon.opticalSizeMin), icon.opticalSizeMax)))
    }
  }

  /// FBM-2, FBM-6 — disabled: drawn closed from the closed parts' disabled tokens, no items whatever `isPresented` says,
  /// no elevation.
  @Test("FBM-2 FBM-6 disabled draws the closed disabled toggle and no items, even when isPresented is true")
  func disabled() throws {
    let geometry = StageGeometry()
    let bitmap = try Snapshot.render(onStage(menu(isPresented: .constant(true)).disabled(true)))
    let inside = geometry.toggle.maxX - tokens.itemPaddingInlineEnd / 2
    for index in 0..<3 {
      #expect(pixel(bitmap, x: inside, y: geometry.itemMidY(index)).isClose(to: light[.surface].rgba8()), "\(index)")
    }
    let point = CGPoint(x: geometry.toggle.minX + 6, y: geometry.toggle.midY)
    let disabled = tokens.variants.filled.disabled
    #expect(pixel(bitmap, x: point.x, y: point.y).isClose(to: light[disabled.containerColor].rgba8(over: light[.surface])))
    // No elevation: just below the toggle is the surface.
    #expect(pixel(bitmap, x: geometry.toggle.midX, y: geometry.toggle.maxY + 3).isClose(to: light[.surface].rgba8(), tolerance: 0))
    var custom = system
    custom.fabMenu.variants.filled.disabled.containerColor = .role(.error)
    custom.fabMenu.disabled.opacity = 0.5
    let dimmed = try Snapshot.render(onStage(menu(isPresented: .constant(true)).disabled(true)), theme: theme(custom))
    #expect(pixel(dimmed, x: point.x, y: point.y).isClose(to: light[.error].opacity(0.5).rgba8(over: light[.surface])))
  }

  /// FBM-3 — pressed and focused toggles render the state's container of their look; precedence pressed over focused.
  @Test("FBM-3 pressed and focused render the state's container of the look")
  func stateContainers() throws {
    let point = CGPoint(x: inset + 6, y: inset + tokens.sizes.medium.containerSize / 2)
    var custom = system
    custom.fabMenu.variants.filled.pressed.containerColor = .role(.error)
    custom.fabMenu.variants.filled.focused.containerColor = .role(.success)
    custom.fabMenu.variants.filled.pressed.openContainerColor = .role(.warning)
    func at(_ view: some View) throws -> Bitmap.RGBA { pixel(try Snapshot.render(view, theme: theme(custom)), x: point.x, y: point.y) }
    #expect(try at(toggle(isPressed: true, isFocused: true)).isClose(to: light[.error].rgba8()))
    #expect(try at(toggle(isFocused: true)).isClose(to: light[.success].rgba8()))
    #expect(try at(toggle(isOpen: true, isPressed: true)).isClose(to: light[.warning].rgba8()))
    // An item: its own item parts.
    custom.fabMenu.variants.filled.pressed.itemContainerColor = .role(.error)
    custom.fabMenu.variants.filled.focused.itemContainerColor = .role(.success)
    let itemPoint = CGPoint(x: inset + 3, y: inset + 24)
    #expect(pixel(try Snapshot.render(item(isPressed: true, isFocused: true), theme: theme(custom)), x: itemPoint.x, y: itemPoint.y).isClose(to: light[.error].rgba8()))
    #expect(pixel(try Snapshot.render(item(isFocused: true), theme: theme(custom)), x: itemPoint.x, y: itemPoint.y).isClose(to: light[.success].rgba8()))
    // Opacity: the whole control is dimmed by the state's opacity token.
    custom.fabMenu.pressed.opacity = 0.4
    #expect(try at(toggle(isPressed: true)).isClose(to: light[.error].opacity(0.4).rgba8(over: light[.surface])))
  }

  /// FBM-21 — the toggle casts the elevation of its look and state outside the container; none when disabled; a deeper
  /// level casts a darker shadow. An item casts its item elevation (FBM-18).
  @Test("FBM-21 FBM-18 the toggle's and the items' elevations are cast outside their containers")
  func elevation() throws {
    let side = tokens.sizes.medium.containerSize
    let below = CGPoint(x: inset + side / 2, y: inset + side + 3)
    let surface = light[.surface].rgba8()
    #expect(!pixel(try Snapshot.render(toggle()), x: below.x, y: below.y).isClose(to: surface, tolerance: 0))
    #expect(!pixel(try Snapshot.render(toggle(isOpen: true)), x: below.x, y: below.y).isClose(to: surface, tolerance: 0))
    #expect(pixel(try Snapshot.render(toggle().disabled(true)), x: below.x, y: below.y).isClose(to: surface, tolerance: 0))
    var flat = system
    flat.fabMenu.variants.filled.enabled.openContainerElevation = system.elevation.level0
    #expect(pixel(try Snapshot.render(toggle(isOpen: true), theme: theme(flat)), x: below.x, y: below.y).isClose(to: surface, tolerance: 0))
    // An item.
    let height = max(tokens.itemHeight, TanreiHitTarget.minimum(in: system.measure))
    let underItem = CGPoint(x: inset + 20, y: inset + height + 2)
    #expect(!pixel(try Snapshot.render(item()), x: underItem.x, y: underItem.y).isClose(to: surface, tolerance: 0))
    flat.fabMenu.variants.filled.enabled.itemContainerElevation = system.elevation.level0
    #expect(pixel(try Snapshot.render(item(), theme: theme(flat)), x: underItem.x, y: underItem.y).isClose(to: surface, tolerance: 0))
    var deep = system
    deep.fabMenu.variants.filled.enabled.itemContainerElevation = system.elevation.level5
    let deeper = pixel(try Snapshot.render(item(), theme: theme(deep)), x: underItem.x, y: underItem.y + 3)
    let shallow = pixel(try Snapshot.render(item()), x: underItem.x, y: underItem.y + 3)
    #expect(Int(deeper.r) < Int(shallow.r))
  }

  /// FBM-4 — the ring around the toggle's own shape and around an item's, for keyboard focus only; outside the layout,
  /// never dimmed by a state's opacity.
  @Test("FBM-4 the focus ring surrounds the focused toggle or item")
  func focusRing() throws {
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.sizes.medium.containerShape, measure: system.measure)
    let ringX = inset - metrics.outerCenterlineOutset
    let midY = inset + tokens.sizes.medium.containerSize / 2
    let ring = light[.focusRing].rgba8()
    let focused = try Snapshot.render(toggle(isFocused: true))
    #expect(pixel(focused, x: ringX, y: midY).isClose(to: ring))
    #expect(!pixel(try Snapshot.render(toggle()), x: ringX, y: midY).isClose(to: ring))
    #expect(pixel(try Snapshot.render(toggle(isOpen: true, isFocused: true)), x: ringX, y: midY).isClose(to: ring))
    // Disabled: no ring.
    #expect(!pixel(try Snapshot.render(toggle(isFocused: true).disabled(true)), x: ringX, y: midY).isClose(to: ring))
    var dim = system
    dim.fabMenu.focused.opacity = 0.3
    #expect(pixel(try Snapshot.render(toggle(isFocused: true), theme: theme(dim)), x: ringX, y: midY).isClose(to: ring))
    // An item.
    let itemMid = inset + max(tokens.itemHeight, TanreiHitTarget.minimum(in: system.measure)) / 2
    #expect(pixel(try Snapshot.render(item(isFocused: true)), x: ringX, y: itemMid).isClose(to: ring))
    #expect(!pixel(try Snapshot.render(item()), x: ringX, y: itemMid).isClose(to: ring))
  }

  /// FBM-10 — corners follow `sys.shape.corner-smoothing` (every amount above 0 is the OS's continuous curve) and focus
  /// follows `sys.behavior.focus-style`, on the toggle and on an item; cupertino is continuous, acme is glow.
  @Test("FBM-10 corner smoothing and focus style reach the toggle and the items")
  func cornersAndFocusStyle() throws {
    func render(_ view: some View, _ amount: Double, style: TanreiFocusStyle = .ring) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      custom.behavior.focusStyle = style
      return try Snapshot.renderExact(view, theme: theme(custom))
    }
    for view in [AnyView(toggle(isFocused: true)), AnyView(item(isFocused: true))] {
      let continuous = try render(view, 0.6)
      #expect(try render(view, 0).mismatch(against: continuous, channelTolerance: 0) > 0)
      #expect(try render(view, 1).mismatch(against: continuous, channelTolerance: 0) == 0)
      #expect(try render(view, 0.6, style: .glow).mismatch(against: continuous, channelTolerance: 0) > 0)
    }
    #expect(TanreiSystem.cupertino.shape.roundedCornerStyle == .continuous)
    #expect(TanreiSystem.acme.behavior.focusStyle == .glow)
  }

  /// FBM-18 — an item: at least `item.height` tall, its icon `item.padding-inline-start` from its start, `item.gap` before
  /// the label, `item.padding-inline-end` after it; each value drives the drawing.
  @Test("FBM-18 an item's height, paddings, gap and icon come from the tokens")
  func itemGeometry() throws {
    let square: TanreiItemIcon = .view(Rectangle())
    func size(_ bitmap: Bitmap) -> CGSize {
      CGSize(width: CGFloat(bitmap.width) / Snapshot.scale - 2 * inset, height: CGFloat(bitmap.height) / Snapshot.scale - 2 * inset)
    }
    var custom = system
    custom.fabMenu.variants.filled.enabled.itemIconColor = .role(.error)
    let base = try Snapshot.render(item(icon: square), theme: theme(custom))
    let baseSize = size(base)
    #expect(baseSize.height == max(tokens.itemHeight, TanreiHitTarget.minimum(in: system.measure)))
    // The icon box: from padding-inline-start, item.icon.size wide, centred on the item.
    let iconStart = inset + tokens.itemPaddingInlineStart
    let midY = inset + baseSize.height / 2
    #expect(pixel(base, x: iconStart + 0.5, y: midY).isClose(to: light[.error].rgba8()))
    #expect(pixel(base, x: iconStart - 0.5, y: midY).isClose(to: light[.primary].rgba8()))
    #expect(pixel(base, x: iconStart + tokens.itemIconSize - 0.5, y: midY).isClose(to: light[.error].rgba8()))
    #expect(pixel(base, x: iconStart + tokens.itemIconSize + 0.5, y: midY).isClose(to: light[.primary].rgba8()))
    #expect(pixel(base, x: iconStart + 1, y: midY - tokens.itemIconSize / 2 - 0.5).isClose(to: light[.primary].rgba8()))
    // Each value moves the drawing by exactly its change.
    for change in [\TanreiFabMenuTokens.itemPaddingInlineStart, \.itemPaddingInlineEnd, \.itemGap] {
      var wider = custom
      wider.fabMenu[keyPath: change] += 10
      #expect(size(try Snapshot.render(item(icon: square), theme: theme(wider))).width == baseSize.width + 10)
    }
    var taller = custom
    taller.fabMenu.itemHeight = 60
    #expect(size(try Snapshot.render(item(icon: square), theme: theme(taller))).height == 60)
    var bigger = custom
    bigger.fabMenu.itemIconSize = 30
    #expect(size(try Snapshot.render(item(icon: square), theme: theme(bigger))).width == baseSize.width + 10)
    var larger = custom
    larger.fabMenu.itemLabelTypescale = system.typescale.heading1
    #expect(size(try Snapshot.render(item(icon: square), theme: theme(larger))).width > baseSize.width)
    // An empty icon takes no room (FBM-23 still draws the item).
    let (bare, _) = try Reports.collecting { try Snapshot.render(item(icon: ""), theme: theme(custom)) }
    #expect(size(bare).width == baseSize.width - tokens.itemIconSize - tokens.itemGap)
  }

  /// FBM-18 — as wide as its content: one line while it fits; given less width it wraps and grows instead of truncating.
  @Test("FBM-18 an item is as wide as its label and wraps rather than truncates")
  func itemWraps() throws {
    func size(_ bitmap: Bitmap) -> CGSize {
      CGSize(width: CGFloat(bitmap.width) / Snapshot.scale - 2 * inset, height: CGFloat(bitmap.height) / Snapshot.scale - 2 * inset)
    }
    let height = max(tokens.itemHeight, TanreiHitTarget.minimum(in: system.measure))
    let short = size(try Snapshot.render(item("Doc")))
    let long = size(try Snapshot.render(item("A much longer document title")))
    #expect(long.width > short.width && long.height == height && short.height == height)
    let narrow = size(try Snapshot.render(item("A much longer document title that wraps").frame(width: 140)))
    #expect(narrow.width <= 140 && narrow.height > height)
  }

  /// FBM-18 — the item's corners are `item.shape`, and its fill is its container color.
  @Test("FBM-18 an item's corners come from item.shape")
  func itemCorners() throws {
    var squared = system
    squared.fabMenu.itemShape = 0
    var rounded = system
    rounded.fabMenu.itemShape = 20
    let corner = CGPoint(x: inset + 1, y: inset + 1)
    #expect(pixel(try Snapshot.render(item(), theme: theme(squared)), x: corner.x, y: corner.y).isClose(to: light[.primary].rgba8()))
    #expect(!pixel(try Snapshot.render(item(), theme: theme(rounded)), x: corner.x, y: corner.y).isClose(to: light[.primary].rgba8(), tolerance: 20))
  }

  /// FBM-5 — each item is at least the minimum target tall (stacked items cannot extend a hit area over each other).
  @Test("FBM-5 an item is at least the minimum target tall")
  func itemTarget() throws {
    var custom = system
    custom.measure.targetPointer = 64
    custom.measure.targetTouch = 64
    let bitmap = try Snapshot.render(item(), theme: theme(custom))
    #expect(CGFloat(bitmap.height) / Snapshot.scale - 2 * inset == 64)
  }

  /// FBM-22 — right to left: the toggle is in the inline-end (left) corner, the items' end edges on its left edge, each
  /// item's icon at its right, `padding-inline-start` from its right edge.
  @Test("FBM-22 right to left mirrors the column and each item")
  func rightToLeft() throws {
    let geometry = StageGeometry(rightToLeft: true)
    let bitmap = try Snapshot.render(onStage(menu(isPresented: .constant(true))).environment(\.layoutDirection, .rightToLeft))
    let primary = light[.primary].rgba8()
    for index in 0..<3 {
      #expect(pixel(bitmap, x: geometry.toggle.minX + 1, y: geometry.itemMidY(index)).isClose(to: primary), "\(index)")
      #expect(!pixel(bitmap, x: geometry.toggle.minX - 1, y: geometry.itemMidY(index)).isClose(to: primary, tolerance: 20), "\(index)")
    }
    #expect(pixel(bitmap, x: geometry.toggle.minX + 6, y: geometry.toggle.midY).isClose(to: light[.secondaryContainer].rgba8()))
    // One item: the icon box at the right.
    var custom = system
    custom.fabMenu.variants.filled.enabled.itemIconColor = .role(.error)
    let rtl = try Snapshot.render(item(icon: .view(Rectangle())).environment(\.layoutDirection, .rightToLeft), theme: theme(custom))
    let width = CGFloat(rtl.width) / Snapshot.scale
    let midY = CGFloat(rtl.height) / Snapshot.scale / 2
    let iconEnd = width - inset - tokens.itemPaddingInlineStart
    #expect(pixel(rtl, x: iconEnd - 0.5, y: midY).isClose(to: light[.error].rgba8()))
    #expect(pixel(rtl, x: iconEnd + 0.5, y: midY).isClose(to: light[.primary].rgba8()))
    #expect(pixel(rtl, x: inset + tokens.itemPaddingInlineStart + 0.5, y: midY).isClose(to: light[.primary].rgba8()))
  }
}

/// Records the icon context the toggle hands its slot (FBM-11).
struct TanreiFabMenuIconProbe: View {
  @MainActor
  final class Probe {
    var context: TanreiIconContext?
  }

  let probe: Probe
  @Environment(\.tanreiIconContext) private var context

  var body: some View {
    probe.context = context
    return Color.clear
  }
}

// MARK: - Press (FBM-8, FBM-9)

@MainActor
@Suite("TanreiFabMenu press", .serialized)
struct TanreiFabMenuPressTests {
  /// A system whose pressed tokens differ from rest in every part of every look.
  private func distinct(_ feedback: TanreiPressedFeedback) -> TanreiSystem {
    var system = TanreiSystem.tanrei
    system.behavior.pressedFeedback = feedback
    system.fabMenu.variants.filled.pressed.containerColor = .role(.error)
    system.fabMenu.variants.filled.pressed.iconColor = .role(.warning)
    system.fabMenu.variants.filled.pressed.openContainerColor = .role(.error)
    system.fabMenu.variants.filled.pressed.itemContainerColor = .role(.error)
    system.fabMenu.variants.filled.pressed.itemLabelColor = .role(.warning)
    system.fabMenu.variants.filled.focused.containerColor = .role(.success)
    system.fabMenu.pressed.opacity = 0.5
    return system
  }

  /// FBM-9 — which tokens a press reads under each choice, for the toggle (closed and open) and an item.
  @Test("FBM-9 each choice binds the pressed tokens its own way", arguments: TanreiPressedFeedback.allCases)
  func bindings(feedback: TanreiPressedFeedback) {
    let tokens = distinct(feedback).fabMenu
    let filled = tokens.variants.filled
    for beneath in [TanreiInteraction.enabled, .hovered, .focused] {
      for open in [false, true] {
        let drawn = TanreiFabMenuToggleAppearance(tokens: tokens, variant: .filled, size: .medium, isOpen: open, state: .pressed, feedback: feedback, beneath: beneath)
        let pressedFill = open ? filled.pressed.openContainerColor : filled.pressed.containerColor
        let underFill = open ? filled[state: beneath].openContainerColor : filled[state: beneath].containerColor
        switch feedback {
        case .overlay:
          #expect(drawn.container == pressedFill && drawn.ripple == nil && drawn.opacity == tokens.pressed.opacity)
        case .ripple:
          #expect(drawn.container == underFill && drawn.ripple == pressedFill && drawn.opacity == tokens.pressed.opacity)
        case .dim:
          #expect(drawn.container == underFill && drawn.ripple == nil && drawn.opacity == tokens.pressed.opacity)
        case .none:
          #expect(drawn == TanreiFabMenuToggleAppearance(tokens: tokens, variant: .filled, size: .medium, isOpen: open, state: beneath))
        }
      }
      let item = TanreiFabMenuItemAppearance(tokens: tokens, variant: .filled, state: .pressed, feedback: feedback, beneath: beneath)
      switch feedback {
      case .overlay:
        #expect(item.container == filled.pressed.itemContainerColor && item.ripple == nil && item.label == filled.pressed.itemLabelColor)
      case .ripple:
        #expect(item.container == filled[state: beneath].itemContainerColor && item.ripple == filled.pressed.itemContainerColor)
        #expect(item.label == filled.pressed.itemLabelColor)
      case .dim:
        #expect(item.container == filled[state: beneath].itemContainerColor && item.ripple == nil && item.opacity == tokens.pressed.opacity)
        #expect(item.label == filled.pressed.itemLabelColor)
      case .none:
        #expect(item == TanreiFabMenuItemAppearance(tokens: tokens, variant: .filled, state: beneath))
      }
    }
  }

  /// FBM-9 — rendered under a system that sets each value: the toggle and an item.
  @Test("FBM-9 each choice renders as it says", arguments: TanreiPressedFeedback.allCases)
  func rendered(feedback: TanreiPressedFeedback) throws {
    let system = distinct(feedback)
    let colors = system.colors.light
    let inset = Snapshot.inset
    let togglePoint = CGPoint(x: inset + 6, y: inset + system.fabMenu.sizes.medium.containerSize / 2)
    let itemPoint = CGPoint(x: inset + 3, y: inset + 24)
    let toggleColor = pixel(try Snapshot.render(toggle(isPressed: true), theme: theme(system)), x: togglePoint.x, y: togglePoint.y)
    let itemColor = pixel(try Snapshot.render(item(isPressed: true), theme: theme(system)), x: itemPoint.x, y: itemPoint.y)
    switch feedback {
    case .overlay, .ripple:
      // A render that never saw the press begin shows the ripple grown: the same pixels as overlay.
      #expect(toggleColor.isClose(to: colors[.error].opacity(0.5).rgba8(over: colors[.surface])))
      #expect(itemColor.isClose(to: colors[.error].opacity(0.5).rgba8(over: colors[.surface])))
    case .dim:
      #expect(toggleColor.isClose(to: colors[.primary].opacity(0.5).rgba8(over: colors[.surface])))
      #expect(itemColor.isClose(to: colors[.primary].opacity(0.5).rgba8(over: colors[.surface])))
    case .none:
      #expect(toggleColor.isClose(to: colors[.primary].rgba8()))
      #expect(itemColor.isClose(to: colors[.primary].rgba8()))
    }
  }

  /// FBM-9 — the shipped systems, by their own values: m3-like ripples, cupertino dims, the default overlays.
  @Test("FBM-9 m3-like ripples, cupertino dims, the default overlays")
  func shipped() {
    func pressed(_ system: TanreiSystem) -> (TanreiFabMenuToggleAppearance, TanreiFabMenuItemAppearance) {
      (
        TanreiFabMenuToggleAppearance(tokens: system.fabMenu, variant: .filled, size: .medium, isOpen: false, state: .pressed, feedback: system.behavior.pressedFeedback),
        TanreiFabMenuItemAppearance(tokens: system.fabMenu, variant: .filled, state: .pressed, feedback: system.behavior.pressedFeedback)
      )
    }
    let m3 = pressed(.m3Like)
    #expect(m3.0.ripple == TanreiSystem.m3Like.fabMenu.variants.filled.pressed.containerColor && m3.1.ripple != nil)
    let cupertino = pressed(.cupertino)
    #expect(cupertino.0.ripple == nil && cupertino.0.opacity < 1 && cupertino.1.opacity == cupertino.0.opacity)
    let tanrei = pressed(.tanrei)
    #expect(tanrei.0.ripple == nil && tanrei.0.container == TanreiSystem.tanrei.fabMenu.variants.filled.pressed.containerColor)
    // FBM-21: cupertino has no hover lift, closed or open.
    let hovered = TanreiSystem.cupertino.fabMenu.variants.filled
    #expect(hovered.hovered.containerElevation == hovered.enabled.containerElevation)
    #expect(hovered.hovered.openContainerElevation == hovered.enabled.openContainerElevation)
  }

  /// FBM-9 — the ripple grows over comp.fab-menu.motion.feedback-duration with the state easing; whole under Reduce Motion.
  @Test("FBM-9 the ripple grows over the FAB menu's own feedback duration")
  func rippleTiming() {
    var tokens = TanreiSystem.m3Like.fabMenu
    let easing = tokens.motionStateEasing
    #expect(tokens.rippleGrowth(reduceMotion: false) == Animation.timingCurve(easing.x1, easing.y1, easing.x2, easing.y2, duration: tokens.motionFeedbackDuration / 1000))
    tokens.motionFeedbackDuration = 900
    tokens.motionStateEasing = TanreiCubicBezier(0, 0, 1, 1)
    #expect(tokens.rippleGrowth(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.9))
  }

  #if os(macOS)
  /// FBM-8 end to end with real mouse events: pressed at once on mouse-down, still pressed after a quick release, at rest
  /// again once press-hold has passed — and the toggle asked once (FBM-1).
  @Test("FBM-8 FBM-1 a quick click on the toggle shows the pressed state at once and keeps it for press-hold")
  func quickClickIsHeld() async throws {
    var system = TanreiSystem.tanrei
    system.motion.duration.pressHold = 1500
    system.fabMenu.motionStateDuration = 0
    system.fabMenu.motionOpenDuration = 0
    system.fabMenu.motionCloseDuration = 0
    system.fabMenu.variants.filled.pressed.containerColor = .role(.error)
    system.fabMenu.variants.filled.pressed.openContainerColor = .role(.error)
    let colors = system.colors.light
    let log = Log()
    let hosted = HostedView(menu(isPresented: log.binding).padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let point = CGPoint(x: Snapshot.inset + 6, y: Snapshot.inset + system.fabMenu.sizes.medium.containerSize / 2)
    let middle = CGPoint(x: Snapshot.inset + system.fabMenu.sizes.medium.containerSize / 2, y: Snapshot.inset + system.fabMenu.sizes.medium.containerSize / 2)
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.primary].rgba8()))
    hosted.mouse(.leftMouseDown, at: middle)
    hosted.settle()
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    hosted.mouse(.leftMouseUp, at: middle)
    hosted.settle()
    #expect(log.events == ["isPresented true"])
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    let released = await hosted.wait(atMost: 5) { hosted.color(at: point)?.isClose(to: colors[.secondaryContainer].rgba8()) == true }
    #expect(released && log.events == ["isPresented true"])
  }
  #endif
}

// MARK: - Activation (FBM-1, FBM-2, FBM-5, FBM-15, FBM-16)

#if os(macOS)
@MainActor
@Suite("TanreiFabMenu activation", .serialized)
struct TanreiFabMenuActivationTests {
  let inset = Snapshot.inset

  /// FBM-1 — a click on the toggle writes the opposite of open, once: it opens the closed menu, and a click on the open
  /// toggle closes it (a press on the toggle is not a press outside, FBM-15).
  @Test("FBM-1 FBM-15 a click on the toggle opens a closed menu and closes an open one")
  func toggleClick() {
    let log = Log()
    let hosted = HostedView(onStage(menu(isPresented: log.binding)).padding(inset).tanreiTheme(Snapshot.theme))
    let geometry = StageGeometry()
    let center = CGPoint(x: geometry.toggle.midX + inset, y: geometry.toggle.midY + inset)
    hosted.click(at: center)
    #expect(log.events == ["isPresented true"])
    hosted.click(at: center)
    #expect(log.events == ["isPresented true", "isPresented false"])
  }

  /// FBM-2 — disabled: a click asks nothing.
  @Test("FBM-2 a disabled toggle asks nothing")
  func disabledClick() {
    let log = Log()
    let hosted = HostedView(onStage(menu(isPresented: log.binding).disabled(true)).padding(inset).tanreiTheme(Snapshot.theme))
    let geometry = StageGeometry()
    hosted.click(at: CGPoint(x: geometry.toggle.midX + inset, y: geometry.toggle.midY + inset))
    #expect(log.events.isEmpty)
  }

  /// FBM-16 — a click on an item emits its click once and then closes the menu, in that order; the items then go.
  @Test("FBM-16 an item's click comes first, then the menu closes")
  func itemClick() {
    let log = Log()
    log.isPresented = true
    let hosted = HostedView(
      onStage(menu(isPresented: log.binding, action: { log.events.append("click \($0)") })).padding(inset).tanreiTheme(Snapshot.theme))
    let geometry = StageGeometry()
    let folder = CGPoint(x: geometry.toggle.maxX + inset - 30, y: geometry.itemMidY(1) + inset)
    hosted.click(at: folder)
    #expect(log.events == ["click Folder", "isPresented false"])
    hosted.settle()
    let after = hosted.color(at: folder)
    #expect(after?.isClose(to: light[.primary].rgba8(), tolerance: 20) == false)
  }

  /// FBM-5 end to end: the small toggle (40) is below the pointer target; a click beside it, inside the target, toggles.
  @Test("FBM-5 a click in the toggle's extended hit area toggles it")
  func extendedHitArea() {
    let log = Log()
    let hosted = HostedView(menu(size: .small, isPresented: log.binding).padding(inset).tanreiTheme(Snapshot.theme))
    let system = Snapshot.theme.system
    let side = system.fabMenu.sizes.small.containerSize
    let outset = (TanreiHitTarget.minimum(in: system.measure) - side) / 2
    #expect(outset > 0)
    // Beyond the target first (while closed, nothing is drawn above the toggle), then inside it.
    hosted.click(at: CGPoint(x: inset + side / 2, y: inset - outset - 1))
    #expect(log.events.isEmpty)
    hosted.click(at: CGPoint(x: inset + side / 2, y: inset - outset / 2))
    #expect(log.events == ["isPresented true"])
  }
}
#endif
