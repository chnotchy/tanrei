import AcmeFixture
import SwiftUI
import Testing

@_spi(Fixtures) @testable import Tanrei

// Covers specs/menu.spec.json. Each behavior id (MNU-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file. MNU-12, MNU-15, MNU-16 and MNU-17 are BTN-5, BTN-8, BTN-9 and BTN-10 for the
// menu item: the primitives they rest on are tested once in TanreiButtonTests / TanreiPrimitivesTests; here each is
// proven to reach the item. The fixtures draw the open menu in place (`TanreiMenu(inPlace:)`, MNU-19's verify); the
// presentation in a popover is the platform's and is exercised by the gallery's UI tests.

private let suiteName = "TanreiMenuTests"

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

@MainActor
private final class Counter {
  var count = 0
}

/// A value outside any view — what a `Binding` in a real app points at — counting its writes.
@MainActor
private final class Store<Value: Sendable> {
  var value: Value
  var writes = 0
  init(_ value: Value) { self.value = value }

  var binding: Binding<Value> {
    Binding(
      get: { MainActor.assumeIsolated { self.value } },
      set: { newValue in
        MainActor.assumeIsolated {
          self.value = newValue
          self.writes += 1
        }
      })
  }
}

/// A menu drawn in place whose `isPresented` is `binding`: what the popover holds, without the popover.
@MainActor
private func menu(isPresented: Binding<Bool> = .constant(true), @ViewBuilder _ content: () -> some View) -> some View {
  TanreiMenu(isPresented: isPresented, placement: .bottomStart, isInPlace: true, focusInside: nil, content: content())
}

private final class EntryBox: @unchecked Sendable {
  var entry: TanreiMenuEntry?
}

private struct EntryRoot: _VariadicView_UnaryViewRoot {
  let box: EntryBox
  func body(children: _VariadicView.Children) -> some View {
    box.entry = children.first?[TanreiMenuEntryKey.self]
    // Something to draw: a renderer of nothing evaluates nothing.
    return Color.clear.frame(width: 1, height: 1)
  }
}

/// An item as the menu's root reads it (its trait), in the section context `group`.
@MainActor
private func entry(_ view: some View, group: TanreiMenuGroupContext? = nil) -> TanreiMenuEntry {
  typealias Root = EntryRoot
  let box = EntryBox()
  _ = ImageRenderer(content: _VariadicView.Tree(Root(box: box)) { view }.environment(\.tanreiMenuGroup, group)).cgImage
  return box.entry!
}

/// The chrome of one item as the menu draws it, in a surface-less column at the minimum width.
@MainActor
private func chrome(
  _ info: TanreiMenuItemInfo = TanreiMenuItemInfo(title: "Copy", supportingText: "", leadingIcon: nil, trailingIcon: nil, trailingText: ""),
  condition: TanreiMenuCondition = .unselected, checkable: Bool = false, hasMark: Bool = false, hasIcon: Bool = false, isPressed: Bool = false,
  isFocused: Bool = false
) -> some View {
  TanreiMenuItemChrome(info: info, condition: condition, isCheckable: checkable, hasMark: hasMark, hasIcon: hasIcon, isPressed: isPressed, isFocused: isFocused)
    .frame(width: TanreiSystem.tanrei.menu.surfaceMinWidth)
}

private func info(_ title: String, supporting: String = "", leading: TanreiItemIcon? = nil, trailing: TanreiItemIcon? = nil, trailingText: String = "") -> TanreiMenuItemInfo {
  TanreiMenuItemInfo(title: title, supportingText: supporting, leadingIcon: leading, trailingIcon: trailing, trailingText: trailingText)
}

/// The size of a render without the snapshot inset, in points.
@MainActor
private func visualSize(_ bitmap: Bitmap) -> CGSize {
  CGSize(width: CGFloat(bitmap.width) / Snapshot.scale - 2 * Snapshot.inset, height: CGFloat(bitmap.height) / Snapshot.scale - 2 * Snapshot.inset)
}

/// The first x (from `from`, stepping 0.5) in row `y` whose pixel is close to `color`.
@MainActor
private func firstInk(_ bitmap: Bitmap, y: CGFloat, color: Bitmap.RGBA, from: CGFloat = Snapshot.inset, tolerance: Int = 60) -> CGFloat? {
  stride(from: from, to: CGFloat(bitmap.width) / Snapshot.scale, by: 0.5).first { pixel(bitmap, x: $0, y: y).isClose(to: color, tolerance: tolerance) }
}

// MARK: - Items and activation (MNU-6, MNU-9, MNU-18, MNU-24, MNU-26, MNU-29)

@MainActor
@Suite("TanreiMenu items", .serialized)
struct TanreiMenuItemTests {
  /// MNU-18 — the condition of each kind: a destructive action, a checked toggle, the option whose value its section
  /// holds; otherwise unselected.
  @Test("MNU-18 each kind's condition")
  func conditions() {
    #expect(entry(TanreiMenuItem("Copy", action: {})).condition == .unselected)
    #expect(entry(TanreiMenuItem("Delete", role: .destructive, action: {})).condition == .destructive)
    #expect(entry(TanreiMenuItem("Cancel", role: .cancel, action: {})).condition == .unselected)
    #expect(entry(TanreiMenuToggle("Show grid", isOn: .constant(true))).condition == .selected)
    #expect(entry(TanreiMenuToggle("Show grid", isOn: .constant(false))).condition == .unselected)
    let group = TanreiMenuGroupContext(id: TanreiMenuSectionID(), selection: TanreiMenuSelection(Binding.constant(Optional("date"))))
    #expect(entry(TanreiMenuOption("Date").tag("date"), group: group).condition == .selected)
    #expect(entry(TanreiMenuOption("Name").tag("name"), group: group).condition == .unselected)
    #expect(entry(TanreiMenuOption("Date").tag("date")).condition == .unselected)
    #expect(TanreiMenuCondition.core == [.unselected, .selected, .destructive] && TanreiMenuCondition.fallback == .unselected)
  }

  /// MNU-6 — an action calls its action once and closes; a toggle switches and closes unless Space; an option writes its
  /// value once and closes unless Space; a checked option writes nothing but closes all the same. MNU-9: disabled, nothing.
  @Test("MNU-6 MNU-9 activation of each kind; Space keeps the menu open after a toggle or an option")
  func activation() {
    let counter = Counter()
    let action = entry(TanreiMenuItem("Copy", action: { counter.count += 1 }))
    #expect(action.activate(by: .pointer) && counter.count == 1)
    #expect(action.activate(by: .space) && counter.count == 2)
    let toggle = Store(false)
    let toggleEntry = entry(TanreiMenuToggle("Show grid", isOn: toggle.binding))
    #expect(toggleEntry.activate(by: .enter) && toggle.value && toggle.writes == 1)
    #expect(!toggleEntry.activate(by: .space) && !toggle.value && toggle.writes == 2)
    let sort = Store<String?>("name")
    let group = TanreiMenuGroupContext(id: TanreiMenuSectionID(), selection: TanreiMenuSelection(sort.binding))
    let date = entry(TanreiMenuOption("Date").tag("date"), group: group)
    #expect(date.activate(by: .pointer) && sort.value == "date" && sort.writes == 1)
    let checked = entry(TanreiMenuOption("Name").tag("name"), group: TanreiMenuGroupContext(id: TanreiMenuSectionID(), selection: TanreiMenuSelection(Binding.constant(Optional("name")))))
    #expect(checked.activate(by: .enter))
    #expect(!checked.activate(by: .space))
    // MNU-9: a disabled item emits nothing and does not close.
    let disabled = entry(TanreiMenuItem("Paste", action: { counter.count += 1 }).disabled(true))
    #expect(!disabled.isEnabled && !disabled.activate(by: .pointer) && counter.count == 2)
    let disabledToggle = entry(TanreiMenuToggle("Show grid", isOn: toggle.binding).disabled(true))
    #expect(!disabledToggle.activate(by: .pointer) && toggle.writes == 2)
    let disabledOption = entry(TanreiMenuOption("Size").tag("size").disabled(true), group: group)
    #expect(!disabledOption.activate(by: .pointer) && sort.writes == 1)
  }

  #if os(macOS)
  /// MNU-6 end to end: a click on an action calls it once and closes the menu through its binding; a click on a checkbox
  /// item switches it and closes; MNU-9: a disabled item does neither; MNU-12: the whole row is the hit area.
  @Test("MNU-6 MNU-9 MNU-12 a click activates an item and closes the menu; a disabled item does nothing")
  func click() {
    let counter = Counter()
    let open = Store(true)
    let grid = Store(false)
    let hosted = HostedView(
      menu(isPresented: open.binding) {
        TanreiMenuItem("Paste", action: { counter.count += 1 }).disabled(true)
        TanreiMenuItem("Copy", action: { counter.count += 1 })
        TanreiMenuToggle("Show grid", isOn: grid.binding)
      }
      .padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    let tokens = TanreiSystem.tanrei.menu
    let row = max(tokens.containerHeight, TanreiHitTarget.minimum(in: TanreiSystem.tanrei.measure))
    let top = Snapshot.inset + tokens.surfacePaddingBlock
    hosted.click(at: CGPoint(x: Snapshot.inset + tokens.surfacePaddingInline + 2, y: top + row / 2))
    #expect(counter.count == 0 && open.writes == 0)
    hosted.click(at: CGPoint(x: Snapshot.inset + tokens.surfacePaddingInline + 2, y: top + row * 1.5))
    #expect(counter.count == 1 && !open.value && open.writes == 1)
    hosted.click(at: CGPoint(x: hosted.size.width - Snapshot.inset - tokens.surfacePaddingInline - 2, y: top + row * 2.5))
    #expect(grid.value && grid.writes == 1 && open.writes == 2)
  }
  #endif

  /// MNU-24 — a checkbox item is a toggle (on: selected), a radio item is selected while checked, an action is a plain
  /// button; each is named by its label, described by its supporting and trailing text, with its position.
  @Test("MNU-24 each kind's semantics, description and position")
  func semantics() {
    #expect(entry(TanreiMenuItem("Copy", action: {})).traits == [])
    #expect(entry(TanreiMenuToggle("Show grid", isOn: .constant(true))).traits == [.isToggle, .isSelected])
    #expect(entry(TanreiMenuToggle("Show grid", isOn: .constant(false))).traits == .isToggle)
    let group = TanreiMenuGroupContext(id: TanreiMenuSectionID(), selection: TanreiMenuSelection(Binding.constant(Optional("date"))))
    #expect(entry(TanreiMenuOption("Date").tag("date"), group: group).traits == .isSelected)
    #expect(entry(TanreiMenuOption("Name").tag("name"), group: group).traits == [])
    #expect(info("Share link", supporting: "Anyone with the link can view", trailingText: "⌘L").accessibilityDescription == "Anyone with the link can view, ⌘L")
    #expect(TanreiMenuRules.positionText(index: 1, count: 3) == "2 of 3")
    #expect(entry(TanreiMenuItem("Copy", action: {})).accessibilityPosition(index: 1, count: 3) == "2 of 3")
    #expect(entry(TanreiMenuOption("Date").tag("date"), group: group).accessibilityPosition(index: 0, count: 3) == "1 of 3")
    // A toggle's value is its on or off: a position would replace it.
    #expect(entry(TanreiMenuToggle("Show grid", isOn: .constant(true))).accessibilityPosition(index: 0, count: 3) == nil)
  }

  /// MNU-26 — an empty label is reported, and the item still renders.
  @Test("MNU-26 an empty label is reported and still rendered")
  func emptyLabel() throws {
    let (_, reports) = Reports.collecting { _ = TanreiMenuItem("", action: {}) }
    #expect(reports.mention("MNU-26"))
    let (bitmap, _) = try Reports.collecting { try Snapshot.render(menu { TanreiMenuItem("", action: {}) }) }
    let tokens = TanreiSystem.tanrei.menu
    #expect(visualSize(bitmap).height >= tokens.containerHeight + 2 * tokens.surfacePaddingBlock)
  }

  /// MNU-29 — a radio item outside a section with a selection, a selection naming none of its items, and two items sharing
  /// a value are reported; a section in a section is reported and drawn as the outer one's items, with no title or divider.
  @Test("MNU-29 radio items outside a section, unknown and shared values, nested sections")
  func problems() throws {
    let sort = TanreiMenuSelection(Binding.constant(Optional("size")))
    let id = TanreiMenuSectionID()
    let group = TanreiMenuGroupContext(id: id, selection: sort)
    let parts = [
      TanreiMenuPart(entry: entry(TanreiMenuOption("Loose").tag("loose")), section: nil, title: nil),
      TanreiMenuPart(entry: nil, section: id, title: "Sort by"),
      TanreiMenuPart(entry: entry(TanreiMenuOption("Name").tag("name"), group: group), section: id, title: nil),
      TanreiMenuPart(entry: entry(TanreiMenuOption("Name again").tag("name"), group: group), section: id, title: nil),
    ]
    let problems = TanreiMenuContent(parts: parts).problems
    #expect(problems.count == 3)
    #expect(problems.contains { $0.contains("\"Loose\"") })
    #expect(problems.contains { $0.contains("share the value \"name\"") })
    #expect(problems.contains { $0.contains("\"size\" names none") })
    // Both radio items sharing the chosen value are checked.
    let shared = TanreiMenuSelection(Binding.constant(Optional("name")))
    let sharedGroup = TanreiMenuGroupContext(id: id, selection: shared)
    #expect(entry(TanreiMenuOption("Name").tag("name"), group: sharedGroup).condition == .selected)
    #expect(entry(TanreiMenuOption("Name again").tag("name"), group: sharedGroup).condition == .selected)
    // Nested: reported, and drawn as one section — one title, no divider inside.
    let (nested, reports) = try Reports.collecting {
      try Snapshot.renderExact(menu { TanreiMenuSection("View") { TanreiMenuItem("A", action: {}); TanreiMenuSection("Inner") { TanreiMenuItem("B", action: {}) } } })
    }
    #expect(reports.mention("MNU-29"))
    let flat = try Snapshot.renderExact(menu { TanreiMenuSection("View") { TanreiMenuItem("A", action: {}); TanreiMenuItem("B", action: {}) } })
    #expect(nested.mismatch(against: flat, channelTolerance: 0) == 0)
  }
}

// MARK: - Structure (MNU-19, MNU-23, MNU-28)

@MainActor
@Suite("TanreiMenu structure")
struct TanreiMenuStructureTests {
  let tokens = TanreiSystem.tanrei.menu

  /// MNU-23 — blocks: runs of loose items and sections, with a divider between two blocks and none before the first or
  /// after the last; a section without items draws nothing.
  @Test("MNU-23 dividers between groups, never at the ends")
  func blocks() {
    let a = TanreiMenuSectionID()
    let b = TanreiMenuSectionID()
    let item = entry(TanreiMenuItem("Copy", action: {}))
    let content = TanreiMenuContent(parts: [
      TanreiMenuPart(entry: item, section: nil, title: nil),
      TanreiMenuPart(entry: item, section: nil, title: nil),
      TanreiMenuPart(entry: nil, section: a, title: "View"),
      TanreiMenuPart(entry: item, section: a, title: nil),
      TanreiMenuPart(entry: nil, section: b, title: ""),
      TanreiMenuPart(entry: item, section: b, title: nil),
      TanreiMenuPart(entry: nil, section: TanreiMenuSectionID(), title: "Empty"),
    ])
    #expect(content.blocks.map(\.rows) == [[0, 1], [2], [3]])
    #expect(content.blocks.map(\.title) == ["", "View", ""])
    #expect(content.blocks.indices.map(content.dividerBefore) == [false, true, true])
  }

  /// MNU-23 — rendered: the line in `divider.color`, `divider.thickness` thick, `divider.space` from the rows above and
  /// below, across the surface's inner width — inside `surface.padding-inline` on each side.
  @Test("MNU-23 the divider's color, thickness, space and inset")
  func dividerRendered() throws {
    var custom = TanreiSystem.tanrei
    custom.menu.dividerColor = .role(.error)
    custom.menu.dividerThickness = 3
    custom.menu.dividerSpace = 6
    custom.menu.surfacePaddingInline = 10
    let bitmap = try Snapshot.render(
      menu {
        TanreiMenuSection { TanreiMenuItem("Cut", action: {}) }
        TanreiMenuSection { TanreiMenuItem("Select all", action: {}) }
      }, theme: theme(custom))
    let row = max(tokens.containerHeight, TanreiHitTarget.minimum(in: custom.measure))
    let lineTop = Snapshot.inset + tokens.surfacePaddingBlock + row + 6
    #expect(pixel(bitmap, x: Snapshot.inset + 10 + 1, y: lineTop + 1.5).isClose(to: light[.error].rgba8()))
    #expect(!pixel(bitmap, x: Snapshot.inset + 10 + 1, y: lineTop - 1).isClose(to: light[.error].rgba8()))
    #expect(!pixel(bitmap, x: Snapshot.inset + 10 - 1, y: lineTop + 1.5).isClose(to: light[.error].rgba8()))
    #expect(visualSize(bitmap).height == 2 * tokens.surfacePaddingBlock + 2 * row + 2 * 6 + 3)
  }

  /// MNU-19 — while any item has a mark or an icon, every item reserves its column, so labels align; the columns are
  /// `mark.size` and `leading-icon.size` wide, `container.gap` apart, after `container.padding-inline`.
  @Test("MNU-19 empty columns keep their width; labels align")
  func columns() throws {
    var custom = TanreiSystem.tanrei
    custom.menu.conditions.unselected.enabled.labelColor = .role(.error)
    let labelStart = Snapshot.inset + tokens.surfacePaddingInline + tokens.containerPaddingInline
    let row = max(tokens.containerHeight, TanreiHitTarget.minimum(in: custom.measure))
    let y = Snapshot.inset + tokens.surfacePaddingBlock + row / 2
    let plain = try Snapshot.render(menu { TanreiMenuItem("Copy", action: {}) }, theme: theme(custom))
    let x0 = try #require(firstInk(plain, y: y, color: light[.error].rgba8()))
    #expect(x0 >= labelStart && x0 < labelStart + 3)
    let withToggle = try Snapshot.render(menu { TanreiMenuItem("Copy", action: {}); TanreiMenuToggle("Show grid", isOn: .constant(false)) }, theme: theme(custom))
    let x1 = try #require(firstInk(withToggle, y: y, color: light[.error].rgba8()))
    #expect(abs((x1 - x0) - (tokens.markSize + tokens.containerGap)) < 1)
    let withIcon = try Snapshot.render(
      menu { TanreiMenuItem("Copy", action: {}); TanreiMenuToggle("Show grid", isOn: .constant(false), leadingIcon: .image(Image(systemName: "square"))) }, theme: theme(custom))
    let x2 = try #require(firstInk(withIcon, y: y, color: light[.error].rgba8()))
    #expect(abs((x2 - x0) - TanreiMenuRowLayout.columnsWidth(tokens: tokens, hasMark: true, hasIcon: true)) < 1)
    #expect(TanreiMenuRowLayout.columnsWidth(tokens: tokens, hasMark: true, hasIcon: true) == tokens.markSize + tokens.leadingIconSize + 2 * tokens.containerGap)
  }

  /// MNU-19 — right to left, the row mirrors: the label ends `container.padding-inline` from the right.
  @Test("MNU-19 right to left, the row mirrors")
  func rightToLeft() throws {
    var custom = TanreiSystem.tanrei
    custom.menu.conditions.unselected.enabled.labelColor = .role(.error)
    let bitmap = try Snapshot.render(menu { TanreiMenuItem("Copy", action: {}) }.environment(\.layoutDirection, .rightToLeft), theme: theme(custom))
    let row = max(tokens.containerHeight, TanreiHitTarget.minimum(in: custom.measure))
    let y = Snapshot.inset + tokens.surfacePaddingBlock + row / 2
    let width = CGFloat(bitmap.width) / Snapshot.scale
    let rightmost = stride(from: width - Snapshot.inset, to: Snapshot.inset, by: -0.5).first { pixel(bitmap, x: $0, y: y).isClose(to: light[.error].rgba8(), tolerance: 60) }
    let end = width - Snapshot.inset - tokens.surfacePaddingInline - tokens.containerPaddingInline
    #expect(rightmost.map { $0 <= end && $0 > end - 3 } == true)
  }

  /// MNU-28 — a titled section draws its title where the labels start, in the title's style and color, padded by
  /// `container.padding-block`; it is not an item (the menu has one entry).
  @Test("MNU-28 the group title: its start, style, color and padding; not an item")
  func title() throws {
    var custom = TanreiSystem.tanrei
    custom.menu.groupTitleColor = .role(.error)
    let bitmap = try Snapshot.render(menu { TanreiMenuSection("Sort by") { TanreiMenuToggle("Name", isOn: .constant(true)) } }, theme: theme(custom))
    let titleHeight = tokens.groupTitleTypescale.lineHeight + 2 * tokens.containerPaddingBlock
    let y = Snapshot.inset + tokens.surfacePaddingBlock + titleHeight / 2
    let start = Snapshot.inset + tokens.surfacePaddingInline + tokens.containerPaddingInline + tokens.markSize + tokens.containerGap
    let x = try #require(firstInk(bitmap, y: y, color: light[.error].rgba8()))
    #expect(x >= start && x < start + 3)
    let row = max(tokens.containerHeight, TanreiHitTarget.minimum(in: custom.measure))
    #expect(visualSize(bitmap).height == 2 * tokens.surfacePaddingBlock + titleHeight + row)
  }

  /// MNU-3 — the surface: as wide as its widest item between `min-width` and `max-width` (a longer label wraps), padded,
  /// filled with `surface.color` and rounded by `surface.shape`.
  @Test("MNU-3 the surface's width bounds, padding, color and corners")
  func surface() throws {
    var custom = TanreiSystem.tanrei
    custom.menu.surfaceColor = .role(.error)
    custom.menu.surfaceElevation = custom.elevation.level0
    let short = try Snapshot.render(menu { TanreiMenuItem("Cut", action: {}) }, theme: theme(custom))
    #expect(visualSize(short).width == tokens.surfaceMinWidth)
    let long = try Snapshot.render(menu { TanreiMenuItem(String(repeating: "Duplicate the selection ", count: 4), action: {}) }, theme: theme(custom))
    #expect(visualSize(long).width == tokens.surfaceMaxWidth)
    #expect(visualSize(long).height > max(tokens.containerHeight, TanreiHitTarget.minimum(in: custom.measure)) + 2 * tokens.surfacePaddingBlock)
    // The padding shows the surface color; the corner is cut by the shape.
    #expect(pixel(short, x: Snapshot.inset + tokens.surfacePaddingInline / 2, y: Snapshot.inset + 20).isClose(to: light[.error].rgba8()))
    #expect(pixel(short, x: Snapshot.inset + 0.5, y: Snapshot.inset + 0.5).isClose(to: light[.surface].rgba8(), tolerance: 40))
    let medium = TanreiSystem.tanrei.menu.surfaceMinWidth
    #expect(medium < tokens.surfaceMaxWidth)
  }

  /// MNU-20 — an item is at least `container.height` (and the minimum target, MNU-12) tall; a supporting line and a
  /// wrapped label grow it, padded by `container.padding-block`.
  @Test("MNU-20 MNU-12 the row's minimum height and growth")
  func heights() throws {
    let row = max(tokens.containerHeight, TanreiHitTarget.minimum(in: TanreiSystem.tanrei.measure))
    #expect(visualSize(try Snapshot.render(chrome())).height == row)
    let supporting = visualSize(try Snapshot.render(chrome(info("Share link", supporting: "Anyone")))).height
    #expect(supporting == max(row, tokens.labelTypescale.lineHeight + tokens.supportingTextTypescale.lineHeight + 2 * tokens.containerPaddingBlock))
    var short = TanreiSystem.tanrei
    short.menu.containerHeight = 10
    short.menu.containerPaddingBlock = 0
    #expect(visualSize(try Snapshot.render(chrome(), theme: theme(short))).height == TanreiHitTarget.minimum(in: short.measure))
    #expect(visualSize(try Snapshot.render(chrome(info(String(repeating: "Duplicate ", count: 8))))).height > row)
  }

  /// MNU-21 — icons at `leading-icon.size` and `trailing-icon.size`, in the context of the item's condition; an empty name
  /// draws nothing.
  @Test("MNU-21 the icons' sizes and colors; an empty name draws nothing")
  func icons() throws {
    var custom = TanreiSystem.tanrei
    custom.menu.leadingIconSize = 24
    custom.menu.conditions.selected.enabled.leadingIconColor = .role(.error)
    custom.menu.conditions.unselected.enabled.trailingIconColor = .role(.success)
    let square = TanreiItemIcon.image(Image(systemName: "square.fill"))
    let selected = try Snapshot.render(
      chrome(info("Show grid", leading: square), condition: .selected, checkable: true, hasMark: false, hasIcon: true), theme: theme(custom))
    let row = max(custom.menu.containerHeight, TanreiHitTarget.minimum(in: custom.measure))
    let iconCenter = CGPoint(x: Snapshot.inset + tokens.containerPaddingInline + 12, y: Snapshot.inset + row / 2)
    #expect(pixel(selected, x: iconCenter.x, y: iconCenter.y).isClose(to: light[.error].rgba8(), tolerance: 40))
    let trailing = try Snapshot.render(chrome(info("Open", trailing: square)), theme: theme(custom))
    let trailingX = Snapshot.inset + tokens.surfaceMinWidth - tokens.containerPaddingInline - tokens.trailingIconSize / 2
    #expect(pixel(trailing, x: trailingX, y: Snapshot.inset + row / 2).isClose(to: light[.success].rgba8(), tolerance: 40))
    let empty = try Snapshot.renderExact(chrome(info("Open", trailing: "")))
    #expect(empty.mismatch(against: try Snapshot.renderExact(chrome(info("Open"))), channelTolerance: 0) == 0)
  }

  /// MNU-22 — the check in the mark column only while a checkbox or radio item is checked, in its condition's mark color.
  @Test("MNU-22 the check is drawn only while checked")
  func check() throws {
    var custom = TanreiSystem.tanrei
    custom.menu.conditions.selected.enabled.markColor = .role(.error)
    custom.menu.conditions.unselected.enabled.markColor = .role(.error)
    let row = max(tokens.containerHeight, TanreiHitTarget.minimum(in: custom.measure))
    let box = CGRect(x: Snapshot.inset + tokens.containerPaddingInline, y: Snapshot.inset + (row - tokens.markSize) / 2, width: tokens.markSize, height: tokens.markSize)
    func ink(_ bitmap: Bitmap) -> Bool {
      stride(from: box.minX, to: box.maxX, by: 0.5).contains { x in stride(from: box.minY, to: box.maxY, by: 0.5).contains { pixel(bitmap, x: x, y: $0).isClose(to: light[.error].rgba8(), tolerance: 40) } }
    }
    #expect(ink(try Snapshot.render(chrome(condition: .selected, checkable: true, hasMark: true), theme: theme(custom))))
    #expect(!ink(try Snapshot.render(chrome(condition: .unselected, checkable: true, hasMark: true), theme: theme(custom))))
    #expect(!ink(try Snapshot.render(chrome(condition: .selected, checkable: false, hasMark: true), theme: theme(custom))))
  }

  /// MNU-25 — the menu draws no scrim: in place it is its surface alone, and outside the surface is the page.
  @Test("MNU-25 no scrim: outside the surface is the page")
  func noScrim() throws {
    let bitmap = try Snapshot.render(menu { TanreiMenuItem("Cut", action: {}) })
    #expect(pixel(bitmap, x: 1, y: 1).isClose(to: light[.surface].rgba8(), tolerance: 0))
  }
}

// MARK: - Keyboard, focus and placement (MNU-1, MNU-2, MNU-4, MNU-5, MNU-7, MNU-8, MNU-11, MNU-14)

@MainActor
@Suite("TanreiMenu keyboard and placement")
struct TanreiMenuKeyboardTests {
  /// MNU-7 — the arrows wrap and pass through groups (the entries are one list); Home and End; typeahead on labels;
  /// SwiftUI cannot focus a disabled button, so the keys pass over one.
  @Test("MNU-7 the arrows wrap; Home and End; typeahead; disabled items are passed over")
  func keys() {
    let entries = [
      entry(TanreiMenuItem("Cut", action: {})), entry(TanreiMenuItem("Copy", action: {}).disabled(true)), entry(TanreiMenuItem("Paste", action: {})),
    ]
    let items = TanreiMenuRules.roving(entries)
    #expect(items.map(\.focusable) == [true, false, true])
    var keys = TanreiRovingKeys(wraps: true)
    #expect(keys.target(for: .downArrow, from: 2, in: items) == 0)
    #expect(keys.target(for: .upArrow, from: 0, in: items) == 2)
    #expect(keys.target(for: .downArrow, from: 0, in: items) == 2)
    #expect(keys.target(for: .home, from: 2, in: items) == 0 && keys.target(for: .end, from: 0, in: items) == 2)
    #expect(keys.target(typing: "p", at: 0, from: 0, in: items) == .some(2))
  }

  /// MNU-1 — focus moves to the first enabled item; MNU-5 — Escape and Tab close, with their reasons; the reasons have the
  /// spec's names.
  @Test("MNU-1 MNU-5 the first enabled item takes focus; Escape and Tab close")
  func focusAndClose() {
    let entries = [entry(TanreiMenuItem("Paste", action: {}).disabled(true)), entry(TanreiMenuItem("Copy", action: {}))]
    #expect(TanreiMenuRules.initialFocus(entries) == 1)
    #expect(TanreiMenuRules.initialFocus([entries[0]]) == nil)
    #expect(TanreiMenuRules.closeReason(for: .escape) == .escape && TanreiMenuRules.closeReason(for: .tab) == .tab)
    #expect(TanreiMenuRules.closeReason(for: .downArrow) == nil)
    #expect(["escape", "back", "outside", "tab", "focus-out", "item"].allSatisfy { TanreiMenuCloseReason(rawValue: $0) != nil })
  }

  /// MNU-8 — focus the pointer moved to an item shows neither the focused state nor the ring; MNU-11 — keyboard focus
  /// shows the ring inside the row.
  @Test("MNU-8 MNU-11 pointer focus is no keyboard focus; the ring is inside the row")
  func pointerFocus() throws {
    #expect(TanreiMenuRules.isKeyboardFocused(1, focused: 1, byPointer: false))
    #expect(!TanreiMenuRules.isKeyboardFocused(1, focused: 1, byPointer: true))
    #expect(!TanreiMenuRules.isKeyboardFocused(0, focused: 1, byPointer: false))
    let tokens = TanreiSystem.tanrei.menu
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.containerShape, measure: TanreiSystem.tanrei.measure)
    let row = max(tokens.containerHeight, TanreiHitTarget.minimum(in: TanreiSystem.tanrei.measure))
    let focused = try Snapshot.render(chrome(isFocused: true))
    #expect(pixel(focused, x: Snapshot.inset + metrics.outerWidth / 2, y: Snapshot.inset + row / 2).isClose(to: light[.focusRing].rgba8(), tolerance: 40))
    #expect(pixel(focused, x: Snapshot.inset - 1, y: Snapshot.inset + row / 2).isClose(to: light[.surface].rgba8()))
    #expect(!pixel(try Snapshot.render(chrome()), x: Snapshot.inset + metrics.outerWidth / 2, y: Snapshot.inset + row / 2).isClose(to: light[.focusRing].rgba8(), tolerance: 40))
  }

  /// MNU-2 — the popover is attached to the anchor's bottom or top edge at its start or end (mirrored right to left),
  /// with its arrow edge facing the anchor. MNU-14 — an unknown placement is bottom-start, reported.
  @Test("MNU-2 MNU-14 placement: attachment point and edge; an unknown name is bottom-start")
  func placement() {
    #expect(TanreiMenuPlacement.bottomStart.attachmentPoint(layoutDirection: .leftToRight) == .bottomLeading)
    #expect(TanreiMenuPlacement.bottomStart.attachmentPoint(layoutDirection: .rightToLeft) == .bottomTrailing)
    #expect(TanreiMenuPlacement.bottomEnd.attachmentPoint(layoutDirection: .leftToRight) == .bottomTrailing)
    #expect(TanreiMenuPlacement.topStart.attachmentPoint(layoutDirection: .leftToRight) == .topLeading)
    #expect(TanreiMenuPlacement.topEnd.attachmentPoint(layoutDirection: .rightToLeft) == .topLeading)
    #expect(TanreiMenuPlacement.bottomEnd.arrowEdge == .top && TanreiMenuPlacement.topStart.arrowEdge == .bottom)
    #expect(TanreiMenuPlacement.allCases.map(\.rawValue) == ["bottom-start", "bottom-end", "top-start", "top-end"])
    // It flips to the other side when its own has less room than the menu needs (after the offset, within the viewport
    // margin) and the other side has more; the start or end edge stays.
    let nearBottom = TanreiMenuRoom(anchor: CGRect(x: 16, y: 780, width: 60, height: 48), window: 874, menu: 200)
    #expect(nearBottom.flips(below: true, offset: 4, margin: 8))
    #expect(!nearBottom.flips(below: false, offset: 4, margin: 8))
    let nearTop = TanreiMenuRoom(anchor: CGRect(x: 16, y: 60, width: 60, height: 48), window: 874, menu: 200)
    #expect(!nearTop.flips(below: true, offset: 4, margin: 8) && nearTop.flips(below: false, offset: 4, margin: 8))
    // Room for exactly the menu is enough; with no room either side it stays; unknown sizes never flip.
    #expect(!TanreiMenuRoom(anchor: CGRect(x: 0, y: 100, width: 10, height: 10), window: 322, menu: 200).flips(below: true, offset: 4, margin: 8))
    #expect(!TanreiMenuRoom(anchor: CGRect(x: 0, y: 100, width: 10, height: 10), window: 210, menu: 400).flips(below: true, offset: 4, margin: 8))
    #expect(!TanreiMenuRoom(anchor: nearBottom.anchor, window: 0, menu: 200).flips(below: true, offset: 4, margin: 8))
    #expect(TanreiMenuPlacement.bottomEnd.flipped(when: true) == .topEnd && TanreiMenuPlacement.topStart.flipped(when: true) == .bottomStart)
    #expect(TanreiMenuPlacement.bottomEnd.flipped(when: false) == .bottomEnd)
    let (value, reports) = Reports.collecting { TanreiMenuPlacement(named: "left") }
    #expect(value == .bottomStart && reports.mention("MNU-14"))
    let (known, silent) = Reports.collecting { TanreiMenuPlacement(named: "top-end") }
    #expect(known == .topEnd && silent.messages.isEmpty)
  }

  /// MNU-4 — the open motion is the tokens'; none under Reduce Motion; the in-place menu shows no motion.
  @Test("MNU-4 the open motion comes from the tokens; none under Reduce Motion")
  func openMotion() {
    var tokens = TanreiSystem.tanrei.menu
    tokens.motionOpenDuration = 300
    tokens.motionOpenEasing = TanreiCubicBezier(0, 0, 1, 1)
    #expect(tokens.openMotion(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.3))
    #expect(tokens.openMotion(reduceMotion: true) == nil)
  }
}

// MARK: - Token bindings (MNU-10, MNU-13, MNU-16, MNU-17, MNU-27)

@MainActor
@Suite("TanreiMenu token bindings")
struct TanreiMenuTokenBindingTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiMenuTokens { system.menu }

  private func appearance(_ condition: TanreiMenuCondition, _ state: TanreiInteraction, tokens: TanreiMenuTokens? = nil) -> TanreiMenuItemAppearance {
    TanreiMenuItemAppearance(tokens: tokens ?? self.tokens, condition: condition, state: state)
  }

  /// At rest: no fill; on-surface label (error when destructive); the check in primary for a checked item.
  @Test("MNU-10 at rest each condition binds the expected values")
  func rest() {
    #expect(appearance(.unselected, .enabled).container == TanreiPaint.none && appearance(.unselected, .enabled).label == .role(.onSurface))
    #expect(appearance(.unselected, .enabled).mark == TanreiPaint.none && appearance(.selected, .enabled).mark == .role(.primary))
    #expect(appearance(.destructive, .enabled).label == .role(.error) && appearance(.destructive, .enabled).leadingIcon == .role(.error))
    #expect(appearance(.selected, .enabled).leadingIcon == .role(.onSurface) && appearance(.unselected, .enabled).cornerRadius == system.shape.small)
  }

  /// MNU-10 — hovered, focused and pressed mix the state-layer color (the label's) into the row; the rest keeps its value.
  @Test("MNU-10 each state binds that state's tokens", arguments: TanreiMenuCondition.core)
  func states(condition: TanreiMenuCondition) {
    let rest = appearance(condition, .enabled)
    let layer = tokens.conditions[condition].enabled.stateLayerColor
    #expect(layer == rest.label)
    for (state, amount) in [
      (TanreiInteraction.hovered, system.state.hoverStateLayerOpacity), (.focused, system.state.focusStateLayerOpacity), (.pressed, system.state.pressedStateLayerOpacity),
    ] {
      let drawn = appearance(condition, state)
      #expect(drawn.container == .mix(base: rest.container, with: layer, amount: amount))
      #expect(drawn.label == rest.label && drawn.mark == rest.mark && drawn.opacity == 1)
    }
  }

  /// MNU-10 (verify) — under acme, hovered, focused and pressed differ.
  @Test("MNU-10 under acme, hovered, focused and pressed differ")
  func acme() {
    for condition in TanreiMenuCondition.core {
      let containers = [TanreiInteraction.hovered, .focused, .pressed].map { TanreiMenuItemAppearance(tokens: TanreiSystem.acme.menu, condition: condition, state: $0).container }
      #expect(Set(containers.map { "\($0)" }).count == 3, "\(condition)")
    }
  }

  /// MNU-13 — disabled: no fill; content faded; the check of an unchecked or destructive item stays undrawn, a checked
  /// one's fades.
  @Test("MNU-13 disabled bindings")
  func disabled() {
    for condition in TanreiMenuCondition.core {
      #expect(appearance(condition, .disabled).container == appearance(condition, .enabled).container)
    }
    #expect(appearance(.unselected, .disabled).mark == TanreiPaint.none && appearance(.destructive, .disabled).mark == TanreiPaint.none)
    #expect(appearance(.selected, .disabled).mark != TanreiPaint.none && appearance(.selected, .disabled).mark != appearance(.selected, .enabled).mark)
    #expect(appearance(.destructive, .disabled).label == appearance(.unselected, .disabled).label)
  }

  /// MNU-10 MNU-13 — the values drive the result; an unknown condition reads unselected's tokens, reported.
  @Test("MNU-10 MNU-13 a modified system changes what each state resolves to")
  func modifiedSystem() {
    var custom = tokens
    custom.conditions.unselected.hovered.containerColor = .role(.error)
    custom.conditions.destructive.focused.labelColor = .role(.warning)
    custom.conditions.selected.pressed.markColor = .role(.success)
    custom.pressed.opacity = 0.5
    custom.pressed.containerShape = 12
    #expect(appearance(.unselected, .hovered, tokens: custom).container == .role(.error))
    #expect(appearance(.destructive, .focused, tokens: custom).label == .role(.warning))
    #expect(appearance(.selected, .pressed, tokens: custom).mark == .role(.success))
    #expect(appearance(.unselected, .pressed, tokens: custom).opacity == 0.5 && appearance(.unselected, .pressed, tokens: custom).cornerRadius == 12)
    let (value, reports) = Reports.collecting { appearance(TanreiMenuCondition(rawValue: "mixed"), .hovered) }
    #expect(value == appearance(.unselected, .hovered) && reports.mention("menu condition \"mixed\""))
  }

  /// MNU-16 — which tokens a press reads under each choice; the shipped systems: m3-like ripples, cupertino dims.
  @Test("MNU-16 each choice binds the pressed tokens its own way", arguments: TanreiPressedFeedback.allCases)
  func feedback(feedback: TanreiPressedFeedback) {
    var custom = tokens
    custom.conditions.unselected.pressed.containerColor = .role(.error)
    custom.pressed.opacity = 0.5
    let pressed = TanreiMenuItemAppearance(tokens: custom, condition: .unselected, state: .pressed, feedback: feedback, beneath: .hovered)
    let hovered = custom.conditions.unselected.hovered
    switch feedback {
    case .overlay: #expect(pressed.container == .role(.error) && pressed.ripple == nil)
    case .ripple: #expect(pressed.container == hovered.containerColor && pressed.ripple == .role(.error) && pressed.opacity == 0.5)
    case .dim: #expect(pressed.container == hovered.containerColor && pressed.ripple == nil && pressed.opacity == 0.5)
    case .none: #expect(pressed == TanreiMenuItemAppearance(tokens: custom, condition: .unselected, state: .hovered))
    }
    func shipped(_ system: TanreiSystem) -> TanreiMenuItemAppearance {
      TanreiMenuItemAppearance(tokens: system.menu, condition: .unselected, state: .pressed, feedback: system.behavior.pressedFeedback)
    }
    #expect(shipped(.m3Like).ripple != nil && shipped(.cupertino).ripple == nil && shipped(.cupertino).opacity < 1 && shipped(.tanrei).ripple == nil)
  }

  /// MNU-16 — rendered: the pressed row under each choice.
  @Test("MNU-16 each choice renders as it says", arguments: TanreiPressedFeedback.allCases)
  func rendered(feedback: TanreiPressedFeedback) throws {
    var custom = TanreiSystem.tanrei
    custom.behavior.pressedFeedback = feedback
    custom.menu.conditions.unselected.pressed.containerColor = .role(.error)
    custom.menu.pressed.opacity = 0.5
    let actual = pixel(try Snapshot.render(chrome(isPressed: true), theme: theme(custom)), x: Snapshot.inset + 3, y: Snapshot.inset + 20)
    switch feedback {
    case .overlay, .ripple: #expect(actual.isClose(to: light[.error].opacity(0.5).rgba8(over: light[.surface])))
    case .dim, .none: #expect(actual.isClose(to: light[.surface].rgba8()))
    }
  }

  /// MNU-17 — the row's corners follow the corner smoothing; focus follows the focus style.
  @Test("MNU-17 corner smoothing and focus style reach the item")
  func cornersAndFocusStyle() throws {
    func render(_ amount: Double, focused: Bool = false, style: TanreiFocusStyle = .ring) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      custom.menu.containerShape = 16
      custom.menu.conditions.unselected.enabled.containerColor = .role(.error)
      custom.behavior.focusStyle = style
      return try Snapshot.renderExact(chrome(isFocused: focused), theme: theme(custom))
    }
    let continuous = try render(0.6)
    #expect(try render(0).mismatch(against: continuous, channelTolerance: 0) > 0)
    #expect(try render(1).mismatch(against: continuous, channelTolerance: 0) == 0)
    #expect(try render(0.6, focused: true, style: .glow).mismatch(against: try render(0.6, focused: true, style: .ring), channelTolerance: 0) > 0)
  }

  /// MNU-22 MNU-27 — the state motion and the ripple's growth come from the tokens; none under Reduce Motion.
  @Test("MNU-22 MNU-27 the state motion comes from the tokens; none under Reduce Motion")
  func motion() {
    var custom = tokens
    custom.motionStateDuration = 400
    custom.motionStateEasing = TanreiCubicBezier(0, 0, 1, 1)
    custom.motionFeedbackDuration = 900
    #expect(custom.stateMotion(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.4))
    #expect(custom.rippleGrowth(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.9))
    #expect(custom.stateMotion(reduceMotion: true) == nil && custom.rippleGrowth(reduceMotion: true) == nil)
  }
}

// MARK: - Press (MNU-15)

@MainActor
@Suite("TanreiMenu press", .serialized)
struct TanreiMenuPressTests {
  #if os(macOS)
  /// MNU-15 end to end: pressed at once, held for press-hold after a quick click, then at rest; one activation (MNU-6).
  @Test("MNU-15 MNU-6 a quick click shows the pressed state at once and keeps it after the release")
  func quickClickIsHeld() throws {
    var system = TanreiSystem.tanrei
    system.motion.duration.pressHold = 1500
    system.menu.motionStateDuration = 0
    system.menu.conditions.unselected.pressed.containerColor = .role(.error)
    let colors = system.colors.light
    let grid = Store(false)
    let hosted = HostedView(
      menu { TanreiMenuToggle("Show grid", isOn: grid.binding) }.padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let point = CGPoint(x: Snapshot.inset + system.menu.surfacePaddingInline + 2, y: Snapshot.inset + system.menu.surfacePaddingBlock + 4)
    // The pointer arrives before it presses, as a real one does: its arrival moves focus to the item (MNU-8). (Sent in the
    // same instant as the press — which only a synthetic event does — the focus change left the button pressed.)
    hosted.hover(at: point)
    hosted.mouse(.leftMouseDown, at: point)
    hosted.settle()
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    hosted.mouse(.leftMouseUp, at: point)
    hosted.settle()
    #expect(grid.writes == 1)
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    // The hold's end is the shared primitive's (`TanreiPressHold`, whose end TanreiButtonTests and TanreiListTests watch in
    // a hosted window). Here it is not waited for: it is a main-actor task, and in a full run the menu's hosted window sat
    // behind every other suite's renders on the main actor for up to half a minute before it ran — alone it ends after
    // press-hold.
  }
  #endif
}

// MARK: - Fixtures (one per spec fixture)

/// Draws a fixture of specs/menu.spec.json as a product writes it, in place (MNU-19 verify): the fixture's items are the
/// menu's items in order, a group item holding its own; a glyph name draws the SF Symbol a product would pass for it.
@MainActor
enum TanreiMenuFixtures {
  static let symbols: [String: String] = [
    "content_cut": "scissors", "content_copy": "doc.on.doc", "content_paste": "doc.on.clipboard", "link": "link", "open_in_new": "arrow.up.right.square",
    "archive": "archivebox", "delete": "trash",
  ]

  static func icon(_ name: String?) -> TanreiItemIcon? {
    guard let name, !name.isEmpty else { return nil }
    guard let symbol = symbols[name] else { return TanreiItemIcon(name) }
    return .image(Image(systemName: symbol))
  }

  static func item(_ spec: SpecItem, fire: @escaping @MainActor () -> Void) -> AnyView {
    let title = spec.string("label") ?? ""
    let supporting = spec.string("supportingText") ?? ""
    let leading = icon(spec.string("leadingIcon"))
    let trailing = icon(spec.string("trailingIcon"))
    let trailingText = spec.string("trailingText") ?? ""
    let view: AnyView
    switch spec.kind {
    case "checkbox-item":
      view = AnyView(
        TanreiMenuToggle(
          title, isOn: .constant(spec.bool("checked") ?? false), supportingText: supporting, leadingIcon: leading, trailingIcon: trailing,
          trailingText: trailingText))
    case "radio-item":
      view = AnyView(
        TanreiMenuOption(title, supportingText: supporting, leadingIcon: leading, trailingIcon: trailing, trailingText: trailingText)
          .tag(spec.string("value") ?? ""))
    case "group":
      let items = spec.items ?? []
      let rows = ForEach(items.indices, id: \.self) { index in item(items[index], fire: fire) }
      view = AnyView(TanreiMenuSection(spec.string("title") ?? "", selection: .constant(spec.string("value"))) { rows })
    default:
      view = AnyView(
        TanreiMenuItem(
          title, role: spec.bool("destructive") == true ? .destructive : nil, supportingText: supporting, leadingIcon: leading, trailingIcon: trailing,
          trailingText: trailingText, action: fire))
    }
    return AnyView(view.disabled(spec.bool("disabled") ?? false))
  }

  static func view(_ fixture: SpecFixture, fire: @escaping @MainActor () -> Void = {}) -> some View {
    let items = fixture.items ?? []
    return TanreiMenu(inPlace: {
      ForEach(items.indices, id: \.self) { index in item(items[index], fire: fire) }
    })
  }
}

@MainActor
@Suite("TanreiMenu snapshots")
struct TanreiMenuSnapshotTests {
  /// Mirrors `fixtures` in specs/menu.spec.json.
  nonisolated static let fixtures = [
    "actions", "icons-shortcut", "groups", "group-titles", "supporting-text", "trailing-icon", "checkbox-checked", "checkbox-unchecked", "radio-checked",
    "destructive", "disabled", "checked-disabled", "destructive-disabled",
  ]

  static func fixture(_ id: String) throws -> SpecFixture {
    try #require(try SpecFixture.load(spec: "menu").first { $0.id == id })
  }

  @Test("MNU-19 fixture matches its baseline", arguments: fixtures)
  func fixture(_ id: String) throws {
    try Snapshot.assert(TanreiMenuFixtures.view(try Self.fixture(id)), named: id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    #expect(try SpecFixture.load(spec: "menu").map(\.id) == Self.fixtures)
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiMenuTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiMenu preset snapshots")
struct TanreiMenuPresetSnapshotTests {
  /// Group titles: it shows the preset's surface, rows, label and title styles, the check and the divider between groups.
  nonisolated static let fixtureId = "group-titles"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .m3ExpressiveLike, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiMenuSnapshotTests.fixtures.contains(Self.fixtureId))
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try TanreiMenuSnapshotTests.fixture(Self.fixtureId)
    try Snapshot.assert(TanreiMenuFixtures.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
