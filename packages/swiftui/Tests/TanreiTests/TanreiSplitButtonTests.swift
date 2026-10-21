import AcmeFixture
import SwiftUI
import Testing

@_spi(Fixtures) @testable import Tanrei

// Covers specs/split-button.spec.json. Each behavior id (SPB-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file. SPB-9, SPB-10 and SPB-11 are BTN-8, BTN-9 and BTN-10 for the half: the
// primitives they rest on are tested once in TanreiButtonTests / TanreiPrimitivesTests; here each is proven to reach the
// half. The fixtures render the split button at its natural width, start-aligned and vertically centred on a 320 × 96 stage
// (SPB-12's verify), through the fixture initializer (`init(fixture:…)`): a fixture cannot fill the menu slot (SPB-15), so
// the `open` fixtures draw the open form and present no menu.
//
// Icons: baselines render with `Snapshot.theme` (`fontFamilyPolicy: .system`), under which a `TanreiIconGlyph` draws nothing,
// so the icon slot's `save` draws the SF Symbol a product would pass for it (`square.and.arrow.down`), and the chevron draws
// its vector form (the icon font's `keyboard_arrow_down` where the font is installed).
//
// The accessibility tree cannot be read here (macOS builds it only for an assistive client), nor can the menu's popover be
// presented: SPB-15's presentation, SPB-16's close and SPB-17's semantics are tested as rules below and end to end in the
// gallery's UI tests (`testSplitButton…`).

private let suiteName = "TanreiSplitButtonTests"

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

/// The horizontal extents (points) along row `y` where the render is `color`.
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

/// Whether any pixel of the rectangle (points) is `color`.
@MainActor
private func inks(_ bitmap: Bitmap, _ color: Bitmap.RGBA, x: ClosedRange<CGFloat>, y: ClosedRange<CGFloat>, tolerance: Int = 40) -> Bool {
  stride(from: x.lowerBound, through: x.upperBound, by: 0.5).contains { px in
    stride(from: y.lowerBound, through: y.upperBound, by: 0.5).contains { pixel(bitmap, x: px, y: $0).isClose(to: color, tolerance: tolerance) }
  }
}

private let light = TanreiSystem.tanrei.colors.light
private let tokens = TanreiSystem.tanrei.splitButton
private let medium = tokens.sizes.medium

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

@MainActor
private final class Log {
  var events: [String] = []
}

/// A split button as a fixture draws it: no menu (and no report of it), at its natural width.
@MainActor
private func fixtureButton(
  _ title: String = "Save", menuLabel: String = "More save options", open: Binding<Bool> = .constant(false), variant: TanreiSplitButtonVariant = .filled,
  size: TanreiSplitButtonSize = .medium, icon: String? = nil, action: @escaping @MainActor () -> Void = {}
) -> some View {
  TanreiSplitButton(
    fixture: title, icon: { if let icon { Image(systemName: icon) } }, menuLabel: menuLabel, isMenuPresented: open, variant: variant, size: size,
    action: action
  )
  .fixedSize()
}

/// One half's chrome alone, at its natural size, padded so that a focus ring fits.
@MainActor
private func chrome(
  _ half: TanreiSplitButtonHalf, variant: TanreiSplitButtonVariant = .filled, open: Bool = false, pressed: Bool = false, focused: Bool = false
) -> some View {
  TanreiSplitButtonChrome(half: half, variant: variant, size: .medium, isOpen: open, isPressed: pressed, isFocused: focused) {
    if half == .leading {
      Text("Save").tanreiTextStyle(medium.labelTypescale)
    } else {
      TanreiIconSlot(size: medium.iconSize) { TanreiSplitButtonChevron(isOpen: open, size: medium.iconSize) }
    }
  }
  .fixedSize()
  .padding(8)
}

/// The size of a render without the snapshot inset, in points.
@MainActor
private func visualSize(_ bitmap: Bitmap) -> CGSize {
  CGSize(width: CGFloat(bitmap.width) / Snapshot.scale - 2 * Snapshot.inset, height: CGFloat(bitmap.height) / Snapshot.scale - 2 * Snapshot.inset)
}

/// The two halves' extents along the row `y` (points below the render's top), in the fill of the filled variant.
@MainActor
private func halves(_ bitmap: Bitmap, y: CGFloat = Snapshot.inset + 5, color: Bitmap.RGBA = light[.primary].rgba8()) -> [ClosedRange<CGFloat>] {
  runs(bitmap, y: y, color: color)
}

// MARK: - The rules (SPB-2, SPB-3, SPB-6, SPB-7, SPB-15, SPB-16, SPB-20)

@MainActor
@Suite("TanreiSplitButton rules")
struct TanreiSplitButtonRuleTests {
  /// SPB-2 — the trailing half asks for the opposite of the open value; Down Arrow opens a closed menu, and is not the split
  /// button's on an open or a disabled one.
  @Test("SPB-2 toggle asks for the opposite; Down Arrow opens a closed menu")
  func toggle() {
    #expect(TanreiSplitButtonRules.toggled(false) == true && TanreiSplitButtonRules.toggled(true) == false)
    #expect(TanreiSplitButtonRules.opensOnDownArrow(isMenuPresented: false, isEnabled: true))
    #expect(!TanreiSplitButtonRules.opensOnDownArrow(isMenuPresented: true, isEnabled: true))
    #expect(!TanreiSplitButtonRules.opensOnDownArrow(isMenuPresented: false, isEnabled: false))
  }

  /// SPB-3, SPB-7, SPB-13, SPB-15, SPB-20 — the open form is drawn while open and enabled, with or without items; a menu is
  /// presented only while open, enabled and holding an item. Disabled: no menu and the closed form, whatever open says.
  @Test("SPB-3 SPB-7 SPB-15 SPB-20 what is drawn open and what is presented")
  func openAndPresented() {
    #expect(TanreiSplitButtonRules.drawsOpen(isMenuPresented: true, isEnabled: true))
    #expect(!TanreiSplitButtonRules.drawsOpen(isMenuPresented: true, isEnabled: false))
    #expect(!TanreiSplitButtonRules.drawsOpen(isMenuPresented: false, isEnabled: true))
    #expect(TanreiSplitButtonRules.presentsMenu(isMenuPresented: true, isEnabled: true, hasItems: true))
    #expect(!TanreiSplitButtonRules.presentsMenu(isMenuPresented: true, isEnabled: true, hasItems: false))
    #expect(!TanreiSplitButtonRules.presentsMenu(isMenuPresented: true, isEnabled: false, hasItems: true))
    #expect(!TanreiSplitButtonRules.presentsMenu(isMenuPresented: false, isEnabled: true, hasItems: true))
  }

  /// SPB-15, SPB-16, SPB-3 — the menu's binding: it reads as presented while the menu is shown; the menu closes by writing
  /// `false` to `isMenuPresented`; while disabled nothing is written (no close).
  @Test("SPB-15 SPB-16 SPB-3 the menu presents through and closes by the binding")
  func menuBinding() {
    let store = Store(true)
    let enabled = TanreiSplitButtonRules.menuBinding(store.binding, isEnabled: true, hasItems: true)
    #expect(enabled.wrappedValue)
    enabled.wrappedValue = false
    #expect(store.writes == [false] && !store.value)
    let empty = TanreiSplitButtonRules.menuBinding(Store(true).binding, isEnabled: true, hasItems: false)
    #expect(!empty.wrappedValue)
    let disabledStore = Store(true)
    let disabled = TanreiSplitButtonRules.menuBinding(disabledStore.binding, isEnabled: false, hasItems: true)
    #expect(!disabled.wrappedValue)
    disabled.wrappedValue = false
    #expect(disabledStore.writes.isEmpty && disabledStore.value)
  }

  /// SPB-16 — an action item lets its click come first, then the menu closes with the reason item: the menu's route
  /// (`TanreiMenuEntry.activate`, then the menu's close through the split button's binding).
  @Test("SPB-16 an item's click first, then close")
  func itemThenClose() throws {
    let log = Log()
    let store = Store(true)
    let presented = TanreiSplitButtonRules.menuBinding(
      Binding(get: { MainActor.assumeIsolated { store.value } }, set: { value in MainActor.assumeIsolated { log.events.append("close \(value)"); store.value = value } }),
      isEnabled: true, hasItems: true)
    let entry = try #require(menuEntries(TanreiMenuItem("Save as…", action: { log.events.append("click") })).first)
    // What `TanreiMenuSurface` does with an activated row: the item first; if it closes the menu, `close(.item)` — the
    // presented binding written false.
    if entry.activate(by: .pointer) { presented.wrappedValue = false }
    #expect(log.events == ["click", "close false"])
    #expect(!store.value)
  }

  /// SPB-20 — each half without a name, and an empty menu slot, are reported; a fixture's empty slot is not.
  @Test("SPB-20 what a debug build reports")
  func problems() {
    #expect(TanreiSplitButtonRules.problems(titleIsEmpty: false, menuLabelIsEmpty: false, hasItems: true, reportsEmptyMenu: true).isEmpty)
    let all = TanreiSplitButtonRules.problems(titleIsEmpty: true, menuLabelIsEmpty: true, hasItems: false, reportsEmptyMenu: true)
    #expect(all.count == 3 && all.allSatisfy { $0.contains("SPB-20") })
    #expect(all[0].contains("leading half") && all[1].contains("trailing half") && all[2].contains("menu holds no item"))
    #expect(TanreiSplitButtonRules.problems(titleIsEmpty: false, menuLabelIsEmpty: false, hasItems: false, reportsEmptyMenu: false).isEmpty)
    #expect(TanreiSplitButtonRules.isBlank("") && TanreiSplitButtonRules.isBlank("  ") && !TanreiSplitButtonRules.isBlank("Save"))
  }

  /// SPB-6 — the hit area reaches without limit outward (the leading half's start, the trailing half's end) and toward the
  /// other half to the middle of the gap.
  @Test("SPB-6 each half's sideways reach")
  func reach() {
    let gap = tokens.containerInnerGap
    let leading = TanreiSplitButtonRules.hitPlace(.leading, gap: gap)
    let trailing = TanreiSplitButtonRules.hitPlace(.trailing, gap: gap)
    #expect(leading.reachLeading == .infinity && leading.reachTrailing == gap / 2)
    #expect(trailing.reachLeading == gap / 2 && trailing.reachTrailing == .infinity)
    #expect(!leading.isConnected && leading.corners(own: 6) == nil)
    // A trailing half narrower than the target: nearly all of what is missing goes outward.
    let target: CGFloat = 48
    let width = 2 * medium.trailingPaddingInline + medium.iconSize
    let split = TanreiJoinedPlace.reach(visual: width, target: target, leading: trailing.reachLeading, trailing: trailing.reachTrailing)
    #expect(split.leading == gap / 2 && split.trailing == target - width - gap / 2)
  }
}

/// The entries a menu reads from `content`, as `TanreiMenu` reads them.
@MainActor
private func menuEntries(_ content: some View) -> [TanreiMenuEntry] {
  let box = EntriesBox()
  _ = ImageRenderer(content: _VariadicView.Tree(EntriesRoot(box: box)) { content }).cgImage
  return box.entries
}

private final class EntriesBox: @unchecked Sendable {
  var entries: [TanreiMenuEntry] = []
}

private struct EntriesRoot: _VariadicView_UnaryViewRoot {
  let box: EntriesBox
  func body(children: _VariadicView.Children) -> some View {
    box.entries = children.compactMap { $0[TanreiMenuEntryKey.self] }
    // Something to draw: a renderer of nothing evaluates nothing.
    return Color.clear.frame(width: 1, height: 1)
  }
}

// MARK: - The menu slot (SPB-15, SPB-20)

@MainActor
@Suite("TanreiSplitButton menu slot", .serialized)
struct TanreiSplitButtonMenuSlotTests {
  /// SPB-15, SPB-20 — the menu slot is read as the menu reads it: items, and items in a section, are items; an empty slot,
  /// or one holding only an empty section, is reported and still drawn — exactly as a split button with a menu.
  @Test("SPB-15 SPB-20 the menu slot is read as the menu reads it; an empty one is reported and still drawn")
  func slot() throws {
    let (withItems, quiet) = try Reports.collecting {
      try Snapshot.renderExact(
        TanreiSplitButton("Save", menuLabel: "More save options", isMenuPresented: .constant(false), action: {}) {
          TanreiMenuItem("Save as…", action: {})
        }.fixedSize())
    }
    #expect(quiet.messages.isEmpty, "\(quiet.messages)")
    let (_, sectioned) = try Reports.collecting {
      try Snapshot.render(
        TanreiSplitButton("Save", menuLabel: "More save options", isMenuPresented: .constant(false), action: {}) {
          TanreiMenuSection("Formats") { TanreiMenuToggle("Keep a backup", isOn: .constant(true)) }
        })
    }
    #expect(sectioned.messages.isEmpty, "\(sectioned.messages)")
    let (empty, reports) = try Reports.collecting {
      try Snapshot.renderExact(TanreiSplitButton("Save", menuLabel: "More save options", isMenuPresented: .constant(false), action: {}) {}.fixedSize())
    }
    #expect(reports.mention("menu holds no item") && reports.mention("SPB-20"))
    #expect(empty.pixels == withItems.pixels)
    let (_, emptySection) = try Reports.collecting {
      try Snapshot.render(TanreiSplitButton("Save", menuLabel: "More save options", isMenuPresented: .constant(false), action: {}) { TanreiMenuSection("Formats") {} })
    }
    #expect(emptySection.mention("menu holds no item"))
    // A fixture's slot cannot be filled (SPB-15): not reported.
    let (fixture, silent) = try Reports.collecting { try Snapshot.renderExact(fixtureButton()) }
    #expect(silent.messages.isEmpty && fixture.pixels == withItems.pixels)
  }

  /// SPB-20 — a half without a name still renders and is reported, each half on its own.
  @Test("SPB-20 an empty title or menuLabel is reported and still rendered")
  func missingNames() throws {
    let (bitmap, reports) = try Reports.collecting { try Snapshot.render(fixtureButton("", menuLabel: " ")) }
    #expect(reports.mention("leading half has no accessible name") && reports.mention("trailing half has no accessible name"))
    #expect(halves(bitmap).count == 2)
    let (_, localized) = try Reports.collecting {
      try Snapshot.render(TanreiSplitButton(LocalizedStringKey(""), menuLabel: LocalizedStringKey("More"), isMenuPresented: .constant(false), action: {}) {
        TanreiMenuItem("Save as…", action: {})
      })
    }
    #expect(localized.mention("leading half has no accessible name") && !localized.mention("trailing half"))
  }

  /// SPB-20 — an open split button with an empty menu slot draws the open form (and presents nothing).
  @Test("SPB-20 an empty menu still draws the open form")
  func emptyOpen() throws {
    let open = try Reports.collecting {
      try Snapshot.renderExact(TanreiSplitButton("Save", menuLabel: "More", isMenuPresented: .constant(true), action: {}) {}.fixedSize())
    }.value
    #expect(open.pixels == (try Snapshot.renderExact(fixtureButton(menuLabel: "More", open: .constant(true)))).pixels)
    #expect(open.pixels != (try Snapshot.renderExact(fixtureButton(menuLabel: "More"))).pixels)
  }

  /// SPB-17 — the names draw nothing: a split button renders the same whatever its menuLabel says; the title is the
  /// leading half's visible text. (That each half is a button named by its title and menuLabel, and that the icon and the
  /// chevron are hidden, is read from the accessibility tree in the Gallery: `testSplitButtonSemanticsAndActivation`.)
  @Test("SPB-17 menuLabel names the trailing half and draws nothing")
  func names() throws {
    let a = try Snapshot.renderExact(fixtureButton(menuLabel: "More save options"))
    let b = try Snapshot.renderExact(fixtureButton(menuLabel: "Other ways to save"))
    #expect(a.pixels == b.pixels)
    #expect(a.pixels != (try Snapshot.renderExact(fixtureButton("Send"))).pixels)
  }
}

// MARK: - Activation (SPB-1, SPB-2, SPB-3, SPB-4, SPB-6, SPB-9)

@MainActor
@Suite("TanreiSplitButton activation", .serialized)
struct TanreiSplitButtonActivationTests {
  #if os(macOS)
  /// SPB-1 — a click on the leading half emits click exactly once and never touches the open value; SPB-2 — a click on the
  /// trailing half asks for the opposite of it, once per click. (Enter and Space go through the same routes; keyboard focus
  /// cannot be given here; the Gallery tries.)
  @Test("SPB-1 SPB-2 the leading half clicks, the trailing half toggles")
  func click() {
    var clicks = 0
    let store = Store(false)
    let hosted = HostedView(fixtureButton(open: store.binding, action: { clicks += 1 }).padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    let y = hosted.size.height / 2
    hosted.click(at: CGPoint(x: Snapshot.inset + 10, y: y))
    #expect(clicks == 1 && store.writes.isEmpty)
    let trailing = hosted.size.width - Snapshot.inset - (2 * medium.trailingPaddingInline + medium.iconSize) / 2
    hosted.click(at: CGPoint(x: trailing, y: y))
    #expect(store.writes == [true] && clicks == 1)
    hosted.click(at: CGPoint(x: trailing, y: y))
    #expect(store.writes == [true, false] && clicks == 1)
  }

  /// SPB-3 — disabled: neither half emits anything.
  @Test("SPB-3 disabled emits nothing")
  func disabled() {
    var clicks = 0
    let store = Store(false)
    let hosted = HostedView(fixtureButton(open: store.binding, action: { clicks += 1 }).disabled(true).padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    let y = hosted.size.height / 2
    hosted.click(at: CGPoint(x: Snapshot.inset + 10, y: y))
    hosted.click(at: CGPoint(x: hosted.size.width - Snapshot.inset - 10, y: y))
    #expect(clicks == 0 && store.writes.isEmpty)
  }

  /// SPB-6 end to end: where a half is smaller than the target, a click above or below it within half the target of its
  /// centre activates it; the halves keep their visual size; a click in the gap goes to the nearer half, never across a
  /// visible edge; outward, the trailing half reaches past the split button's end. (The target is made larger than both
  /// halves; at the pointer target of the default system the leading half is already wider than it and reaches nowhere
  /// sideways.)
  @Test("SPB-6 the hit areas reach above, below and outward, and meet in the middle of the gap")
  func hitAreas() throws {
    var system = TanreiSystem.tanrei
    system.measure.targetPointer = 100
    system.measure.targetTouch = 100
    system.splitButton.containerInnerGap = 8
    var clicks = 0
    let store = Store(false)
    let margin: CGFloat = 60
    let hosted = HostedView(fixtureButton(open: store.binding, action: { clicks += 1 }).padding(margin).background(light[.surface]).tanreiTheme(theme(system)))
    #expect(hosted.size.height == medium.containerHeight + 2 * margin)
    let height = medium.containerHeight
    let trailingWidth = 2 * medium.trailingPaddingInline + medium.iconSize
    let trailingEnd = hosted.size.width - margin
    let trailingStart = trailingEnd - trailingWidth
    let leadingEnd = trailingStart - 8
    #expect(leadingEnd - margin < 100, "the leading half is smaller than the target")
    // Only the hit area grows: the leading half is still drawn at its height.
    #expect(try #require(hosted.color(at: CGPoint(x: margin + 10, y: margin - 4))).isClose(to: light[.surface].rgba8()))
    #expect(try #require(hosted.color(at: CGPoint(x: margin + 10, y: margin + 4))).isClose(to: light[.primary].rgba8(), tolerance: 4))
    // 20 above the leading half: inside the 100-point target around the 36-point half (32 above it).
    hosted.click(at: CGPoint(x: margin + 10, y: margin - 20))
    #expect(clicks == 1)
    // Below the trailing half.
    hosted.click(at: CGPoint(x: trailingStart + trailingWidth / 2, y: margin + height + 20))
    #expect(store.writes == [true])
    // In the gap, 1 point from each visible edge: the nearer half.
    hosted.click(at: CGPoint(x: leadingEnd + 1, y: margin + height / 2))
    #expect(clicks == 2)
    hosted.click(at: CGPoint(x: trailingStart - 1, y: margin + height / 2))
    #expect(store.writes == [true, false])
    // Outward past the end: the trailing half is 36 wide, the target 100 — it reaches 60 past its end (the gap side gives 4).
    hosted.click(at: CGPoint(x: trailingEnd + 40, y: margin + height / 2))
    #expect(store.writes == [true, false, true])
    // Outward past the start: the leading half reaches what the gap side cannot give.
    hosted.click(at: CGPoint(x: margin - 20, y: margin + height / 2))
    #expect(clicks == 3)
    // 40 above: outside.
    hosted.click(at: CGPoint(x: margin + 10, y: margin - 40))
    #expect(clicks == 3)
  }

  /// SPB-4 (verify: under acme, which values hovered, focused and pressed differently) — the hovered half draws its hovered
  /// container; the other half keeps its own state.
  @Test("SPB-4 a hovered half draws its hovered tokens; the other keeps its own")
  func hoverIsPerHalf() async throws {
    let system = TanreiSystem.acme
    let colors = system.colors.light
    let variant = system.splitButton.variants.filled
    let hosted = HostedView(fixtureButton().padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let leading = CGPoint(x: Snapshot.inset + 10, y: Snapshot.inset + 4)
    let trailing = CGPoint(x: hosted.size.width - Snapshot.inset - 6, y: Snapshot.inset + 4)
    #expect(colors[variant.hovered.containerColor].rgba8() != colors[variant.enabled.containerColor].rgba8())
    hosted.hover(at: CGPoint(x: Snapshot.inset + 10, y: hosted.size.height / 2))
    #expect(await hosted.wait(atMost: 2) { hosted.color(at: leading)?.isClose(to: colors[variant.hovered.containerColor].rgba8(), tolerance: 4) == true })
    #expect(try #require(hosted.color(at: trailing)).isClose(to: colors[variant.enabled.containerColor].rgba8(), tolerance: 4))
    // Off screen, moving within the view ends no hover: the pointer leaves the view, then enters the trailing half.
    hosted.leave()
    hosted.hover(at: CGPoint(x: hosted.size.width - Snapshot.inset - 6, y: hosted.size.height / 2))
    #expect(await hosted.wait(atMost: 2) { hosted.color(at: trailing)?.isClose(to: colors[variant.hovered.containerColor].rgba8(), tolerance: 4) == true })
    #expect(try #require(hosted.color(at: leading)).isClose(to: colors[variant.enabled.containerColor].rgba8(), tolerance: 4))
  }

  /// SPB-9 end to end: the trailing half shows the pressed state at once and keeps it for press-hold after a quick click;
  /// one toggle (SPB-2); the leading half is not pressed (SPB-4).
  @Test("SPB-9 SPB-2 a quick click shows the pressed state at once and keeps it after the release")
  func quickClickIsHeld() async throws {
    var system = TanreiSystem.tanrei
    system.motion.duration.pressHold = 1500
    system.splitButton.motionStateDuration = 0
    system.splitButton.variants.filled.pressed.containerColor = .role(.error)
    let colors = system.colors.light
    let store = Store(false)
    let hosted = HostedView(fixtureButton(open: store.binding).padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let point = CGPoint(x: hosted.size.width - Snapshot.inset - 6, y: Snapshot.inset + 4)
    let leading = CGPoint(x: Snapshot.inset + 10, y: Snapshot.inset + 4)
    hosted.hover(at: point)
    hosted.mouse(.leftMouseDown, at: point)
    hosted.settle()
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    hosted.mouse(.leftMouseUp, at: point)
    hosted.settle()
    #expect(store.writes == [true])
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    #expect(try #require(hosted.color(at: leading)).isClose(to: colors[.primary].rgba8(), tolerance: 4))
    // And released once press-hold has passed.
    #expect(await hosted.wait(atMost: 5) { hosted.color(at: point)?.isClose(to: colors[.error].rgba8()) == false })
  }
  #endif
}

// MARK: - Token bindings (SPB-4, SPB-7, SPB-8, SPB-10, SPB-11, SPB-12, SPB-13, SPB-18)

@MainActor
@Suite("TanreiSplitButton token bindings")
struct TanreiSplitButtonTokenBindingTests {
  private func appearance(
    _ half: TanreiSplitButtonHalf = .leading, _ variant: TanreiSplitButtonVariant = .filled, _ state: TanreiInteraction = .enabled,
    size: TanreiSplitButtonSize = .medium, hasIcon: Bool = false, open: Bool = false, tokens custom: TanreiSplitButtonTokens? = nil
  ) -> TanreiSplitButtonAppearance {
    TanreiSplitButtonAppearance(tokens: custom ?? tokens, variant: variant, size: size, half: half, state: state, hasIcon: hasIcon, isOpen: open)
  }

  /// At rest: filled primary / on-primary, tonal secondary-container, elevated surface-container-lowest raised
  /// to level 2, outlined clear with an outline; the label is the state layer's color; not dimmed.
  @Test("at rest each variant binds the expected values", arguments: TanreiSplitButtonVariant.core)
  func rest(variant: TanreiSplitButtonVariant) {
    let drawn = appearance(.leading, variant)
    let expected = tokens.variants[variant].enabled
    #expect(drawn.container == expected.containerColor && drawn.label == expected.labelColor && drawn.outline == expected.outlineColor)
    #expect(drawn.elevation == expected.containerElevation && drawn.opacity == 1 && drawn.ripple == nil)
    #expect(expected.stateLayerColor == expected.labelColor)
    switch variant {
    case .filled: #expect(drawn.container == .role(.primary) && drawn.label == .role(.onPrimary))
    case .tonal: #expect(drawn.container == .role(.secondaryContainer))
    case .elevated: #expect(drawn.container == .role(.surfaceContainerLowest) && !drawn.elevation.isEmpty)
    default: #expect(drawn.container == TanreiPaint.none && drawn.outline == .role(.outline))
    }
    // Both halves share one look.
    #expect(appearance(.trailing, variant).container == drawn.container && appearance(.trailing, variant).label == drawn.label)
  }

  /// SPB-4 — each half draws from its own state's tokens of the variant: hovered, focused and pressed mix the state layer
  /// into the container; label, outline and elevation are the state's.
  @Test("SPB-4 each state binds that state's tokens", arguments: TanreiSplitButtonVariant.core)
  func states(variant: TanreiSplitButtonVariant) {
    for state in [TanreiInteraction.hovered, .focused, .pressed] {
      for half in [TanreiSplitButtonHalf.leading, .trailing] {
        let drawn = appearance(half, variant, state)
        let expected = tokens.variants[variant][state: state]
        #expect(drawn.container == expected.containerColor && drawn.label == expected.labelColor, "\(variant) \(state) \(half)")
        #expect(drawn.outline == expected.outlineColor && drawn.elevation == expected.containerElevation)
        #expect(drawn.opacity == tokens[state: state]?.opacity && drawn.outerRadius == tokens[state: state]?.containerShape)
      }
    }
    #expect(appearance(.leading, variant, .hovered).container != appearance(.leading, variant).container)
  }

  /// SPB-4 (verify) — under acme, hovered, focused and pressed differ.
  @Test("SPB-4 under acme, hovered, focused and pressed differ")
  func acme() {
    for variant in TanreiSplitButtonVariant.core {
      let containers = [TanreiInteraction.hovered, .focused, .pressed].map {
        TanreiSplitButtonAppearance(tokens: TanreiSystem.acme.splitButton, variant: variant, size: .medium, half: .leading, state: $0).container
      }
      #expect(Set(containers.map { "\($0)" }).count == 3, "\(variant)")
    }
  }

  /// SPB-7 — disabled: both halves from the disabled tokens (content reads as disabled, nothing raised); the outlined
  /// variant keeps a faded border.
  @Test("SPB-7 disabled bindings", arguments: TanreiSplitButtonVariant.core)
  func disabled(variant: TanreiSplitButtonVariant) {
    for half in [TanreiSplitButtonHalf.leading, .trailing] {
      let drawn = appearance(half, variant, .disabled)
      let expected = tokens.variants[variant].disabled
      #expect(drawn.container == expected.containerColor && drawn.label == expected.labelColor && drawn.outline == expected.outlineColor)
      #expect(drawn.elevation.isEmpty && drawn.opacity == tokens.disabled.opacity)
      #expect(drawn.label != appearance(half, variant).label)
    }
    if variant == .outlined { #expect(appearance(.leading, .outlined, .disabled).outline != TanreiPaint.none) }
  }

  /// SPB-4, SPB-7 — the values drive the result, for every part and the shared state values.
  @Test("SPB-4 SPB-7 a modified system changes what each state resolves to")
  func modifiedSystem() {
    var custom = tokens
    custom.variants.filled.hovered.containerColor = .role(.error)
    custom.variants.tonal.focused.labelColor = .role(.warning)
    custom.variants.outlined.pressed.outlineColor = .role(.success)
    custom.variants.elevated.disabled.labelColor = .role(.info)
    custom.variants.filled.enabled.containerElevation = TanreiSystem.tanrei.elevation.level3
    custom.pressed.opacity = 0.5
    custom.hovered.containerShape = 12
    custom.containerShape = 3
    #expect(appearance(.leading, .filled, .hovered, tokens: custom).container == .role(.error))
    #expect(appearance(.trailing, .tonal, .focused, tokens: custom).label == .role(.warning))
    #expect(appearance(.trailing, .outlined, .pressed, tokens: custom).outline == .role(.success))
    #expect(appearance(.leading, .elevated, .disabled, tokens: custom).label == .role(.info))
    #expect(appearance(.leading, .filled, tokens: custom).elevation == TanreiSystem.tanrei.elevation.level3)
    #expect(appearance(.leading, .filled, .pressed, tokens: custom).opacity == 0.5)
    #expect(appearance(.leading, .filled, .hovered, tokens: custom).outerRadius == 12 && appearance(tokens: custom).outerRadius == 3)
  }

  /// SPB-8 — a variant or size the system does not have draws the default's tokens and is reported; rendered, exactly
  /// the default split button. A value a layer adds is read.
  @Test("SPB-8 an unknown variant and size draw the default's tokens and are reported")
  func unknownValues() throws {
    let huge = TanreiSplitButtonSize(rawValue: "huge")
    let neon = TanreiSplitButtonVariant(rawValue: "neon")
    let (value, reports) = Reports.collecting { appearance(.leading, neon, size: huge) }
    #expect(value == appearance())
    #expect(reports.mention("split-button size \"huge\"") && reports.mention("split-button variant \"neon\""))
    let (unknown, _) = try Reports.collecting { try Snapshot.renderExact(fixtureButton(variant: neon, size: huge)) }
    #expect(unknown.pixels == (try Snapshot.renderExact(fixtureButton())).pixels)
    var custom = tokens
    var added = medium
    added.containerHeight = 64
    custom.sizes.extra[huge] = added
    let (known, silent) = Reports.collecting { appearance(size: huge, tokens: custom) }
    #expect(known.height == 64 && silent.messages.isEmpty)
  }

  /// SPB-12 — each size binds its height, paddings, gap, text style, icon size and outline width; an icon selects the
  /// leading half's with-icon start padding; the trailing half pads the chevron on both sides.
  @Test("SPB-12 each size binds its layout tokens", arguments: TanreiSplitButtonSize.core)
  func sizes(size: TanreiSplitButtonSize) {
    let metrics = tokens.sizes[size]
    var custom = tokens
    custom.sizes.medium.leadingPaddingInlineStartWithIcon = 30
    let leading = appearance(.leading, size: size)
    #expect(leading.height == metrics.containerHeight && leading.paddingBlock == metrics.containerPaddingBlock && leading.gap == metrics.containerGap)
    #expect(leading.paddingStart == metrics.leadingPaddingInlineStart && leading.paddingEnd == metrics.leadingPaddingInlineEnd)
    #expect(appearance(.leading, size: size, hasIcon: true).paddingStart == metrics.leadingPaddingInlineStartWithIcon)
    #expect(appearance(.leading, hasIcon: true, tokens: custom).paddingStart == 30 && appearance(.leading, tokens: custom).paddingStart != 30)
    let trailing = appearance(.trailing, size: size)
    #expect(trailing.paddingStart == metrics.trailingPaddingInline && trailing.paddingEnd == metrics.trailingPaddingInline)
    #expect(leading.labelTypescale == metrics.labelTypescale && leading.iconSize == metrics.iconSize && leading.outlineWidth == metrics.outlineWidth)
  }

  /// SPB-13 — the leading half rounds its start corners by the state's container shape and its end corners by inner-shape;
  /// the trailing half the other way round, with inner-shape-open while open.
  @Test("SPB-13 each half's corners, closed and open")
  func corners() {
    var custom = tokens
    custom.containerShape = 10
    custom.containerInnerShape = 2
    custom.containerInnerShapeOpen = 7
    #expect(appearance(.leading, tokens: custom).corners == TanreiSideCorners(leading: 10, trailing: 2))
    #expect(appearance(.leading, open: true, tokens: custom).corners == TanreiSideCorners(leading: 10, trailing: 2))
    #expect(appearance(.trailing, tokens: custom).corners == TanreiSideCorners(leading: 2, trailing: 10))
    #expect(appearance(.trailing, open: true, tokens: custom).corners == TanreiSideCorners(leading: 7, trailing: 10))
    custom.pressed.containerShape = 14
    #expect(appearance(.trailing, .filled, .pressed, open: true, tokens: custom).corners == TanreiSideCorners(leading: 7, trailing: 14))
  }

  /// SPB-10 — which tokens a press reads under each choice; the shipped systems: m3-like ripples, cupertino dims, the
  /// default overlays.
  @Test("SPB-10 each choice binds the pressed tokens its own way", arguments: TanreiPressedFeedback.allCases)
  func feedback(feedback: TanreiPressedFeedback) {
    var custom = tokens
    custom.variants.filled.pressed.containerColor = .role(.error)
    custom.variants.filled.pressed.labelColor = .role(.warning)
    custom.pressed.opacity = 0.5
    let pressed = TanreiSplitButtonAppearance(tokens: custom, variant: .filled, size: .medium, half: .trailing, state: .pressed, feedback: feedback, beneath: .hovered)
    let hovered = custom.variants.filled.hovered
    switch feedback {
    case .overlay: #expect(pressed.container == .role(.error) && pressed.ripple == nil && pressed.label == .role(.warning))
    case .ripple:
      #expect(pressed.container == hovered.containerColor && pressed.ripple == .role(.error) && pressed.opacity == 0.5 && pressed.label == .role(.warning))
    case .dim: #expect(pressed.container == hovered.containerColor && pressed.ripple == nil && pressed.opacity == 0.5 && pressed.label == .role(.warning))
    case .none: #expect(pressed == TanreiSplitButtonAppearance(tokens: custom, variant: .filled, size: .medium, half: .trailing, state: .hovered))
    }
    func shipped(_ system: TanreiSystem) -> TanreiSplitButtonAppearance {
      TanreiSplitButtonAppearance(
        tokens: system.splitButton, variant: .filled, size: .medium, half: .leading, state: .pressed, feedback: system.behavior.pressedFeedback)
    }
    #expect(shipped(.m3Like).ripple != nil && shipped(.cupertino).ripple == nil && shipped(.cupertino).opacity < 1 && shipped(.tanrei).ripple == nil)
  }

  /// SPB-10 — rendered: the pressed half under each choice.
  @Test("SPB-10 each choice renders as it says", arguments: TanreiPressedFeedback.allCases)
  func rendered(feedback: TanreiPressedFeedback) throws {
    var custom = TanreiSystem.tanrei
    custom.behavior.pressedFeedback = feedback
    custom.splitButton.variants.filled.pressed.containerColor = .role(.error)
    custom.splitButton.pressed.opacity = 0.5
    let actual = pixel(try Snapshot.render(chrome(.leading, pressed: true), theme: theme(custom)), x: Snapshot.inset + 8 + 6, y: Snapshot.inset + 8 + 4)
    switch feedback {
    case .overlay, .ripple: #expect(actual.isClose(to: light[.error].opacity(0.5).rgba8(over: light[.surface])), "\(actual)")
    case .dim: #expect(actual.isClose(to: light[.primary].opacity(0.5).rgba8(over: light[.surface])), "\(actual)")
    case .none: #expect(actual.isClose(to: light[.primary].rgba8()), "\(actual)")
    }
  }

  /// SPB-11 — the half's corners follow the corner smoothing; its focus follows the focus style (`cupertino` is continuous;
  /// the `acme` fixture system is glow).
  @Test("SPB-11 corner smoothing and focus style reach the half")
  func cornersAndFocusStyle() throws {
    func render(_ amount: Double, focused: Bool = false, style: TanreiFocusStyle = .ring) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      custom.splitButton.containerShape = 16
      custom.behavior.focusStyle = style
      return try Snapshot.renderExact(chrome(.leading, focused: focused), theme: theme(custom))
    }
    let continuous = try render(0.6)
    #expect(try render(0).mismatch(against: continuous, channelTolerance: 0) > 0)
    #expect(try render(1).mismatch(against: continuous, channelTolerance: 0) == 0)
    #expect(try render(0.6, focused: true, style: .glow).mismatch(against: try render(0.6, focused: true, style: .ring), channelTolerance: 0) > 0)
    #expect(TanreiSystem.cupertino.shape.roundedCornerStyle == .continuous && TanreiSystem.acme.behavior.focusStyle == .glow)
  }

  /// SPB-18, SPB-10, SPB-13 — the state motion, the ripple's growth and the open motion come from the tokens; none under
  /// Reduce Motion (the change is at once, the ripple whole).
  @Test("SPB-18 SPB-10 SPB-13 the motions come from the tokens; none under Reduce Motion")
  func motion() {
    var custom = tokens
    custom.motionStateDuration = 400
    custom.motionStateEasing = TanreiCubicBezier(0, 0, 1, 1)
    custom.motionFeedbackDuration = 900
    custom.motionOpenDuration = 700
    custom.motionOpenEasing = TanreiCubicBezier(0.1, 0.2, 0.3, 0.4)
    #expect(custom.stateMotion(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.4))
    #expect(custom.rippleGrowth(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.9))
    #expect(custom.openMotion(reduceMotion: false) == Animation.timingCurve(0.1, 0.2, 0.3, 0.4, duration: 0.7))
    #expect(custom.stateMotion(reduceMotion: true) == nil && custom.rippleGrowth(reduceMotion: true) == nil && custom.openMotion(reduceMotion: true) == nil)
  }
}

// MARK: - Rendered (SPB-5, SPB-7, SPB-12, SPB-13, SPB-14, SPB-18, SPB-19)

@MainActor
@Suite("TanreiSplitButton rendered")
struct TanreiSplitButtonRenderedTests {
  /// `d` points in from a corner along its diagonal is inside a rounded corner of radius r when d ≥ r (1 − 1/√2): outside
  /// the outer corner (6), inside the inner one (3).
  static let d: CGFloat = 1.25

  /// SPB-12 — one row: the leading half as wide as its padding and label, the trailing half its padding and chevron,
  /// inner-gap apart, both the size's height; a modified system drives each.
  @Test("SPB-12 the row: widths, gap and height from the tokens")
  func row() throws {
    let bitmap = try Snapshot.render(fixtureButton())
    let found = halves(bitmap)
    #expect(found.count == 2, "\(found)")
    guard found.count == 2 else { return }
    #expect(abs(found[0].lowerBound - Snapshot.inset) <= 0.5)
    #expect(abs(found[1].lowerBound - found[0].upperBound - tokens.containerInnerGap) <= 1, "\(found)")
    #expect(abs(found[1].upperBound - found[1].lowerBound - (2 * medium.trailingPaddingInline + medium.iconSize)) <= 1, "\(found)")
    let label = try Snapshot.render(Text("Save").tanreiTextStyle(medium.labelTypescale).fixedSize())
    let labelWidth = visualSize(label).width
    #expect(abs(found[0].upperBound - found[0].lowerBound - (medium.leadingPaddingInlineStart + labelWidth + medium.leadingPaddingInlineEnd)) <= 1.5, "\(found)")
    #expect(visualSize(bitmap).height == medium.containerHeight)
    for run in found {
      let column = columnRuns(bitmap, x: run.lowerBound + 8, color: light[.primary].rgba8())
      #expect(abs(try #require(column.first?.lowerBound).distance(to: try #require(column.last?.upperBound)) - medium.containerHeight) <= 1, "\(column)")
    }
    // A modified system drives the gap, the trailing padding and the height.
    var custom = TanreiSystem.tanrei
    custom.splitButton.containerInnerGap = 10
    custom.splitButton.sizes.medium.trailingPaddingInline = 20
    custom.splitButton.sizes.medium.containerHeight = 50
    let modified = try Snapshot.render(fixtureButton(), theme: theme(custom))
    let grown = halves(modified)
    #expect(grown.count == 2 && abs(grown[1].lowerBound - grown[0].upperBound - 10) <= 1 && abs(grown[1].upperBound - grown[1].lowerBound - 56) <= 1, "\(grown)")
    #expect(visualSize(modified).height == 50)
  }

  /// SPB-12, SPB-14 — given less width than it needs, the leading half's label wraps (never truncates) and both halves grow
  /// in height together; the icon comes before the label, the with-icon start padding before it.
  @Test("SPB-12 SPB-14 a narrow row wraps the label; the halves grow together")
  func wrapping() throws {
    let natural = visualSize(try Snapshot.render(fixtureButton("Save all drafts")))
    let narrow = try Snapshot.render(
      TanreiSplitButton(fixture: "Save all drafts", icon: {}, menuLabel: "More", isMenuPresented: .constant(false), action: {})
        .frame(width: natural.width - 40, alignment: .leading)
        .fixedSize(horizontal: false, vertical: true))
    let size = visualSize(narrow)
    #expect(size.height > medium.containerHeight + 8, "\(size)")
    let found = halves(narrow)
    #expect(found.count == 2)
    for run in found {
      let column = columnRuns(narrow, x: run.lowerBound + 8, color: light[.primary].rgba8())
      #expect(abs(try #require(column.first?.lowerBound).distance(to: try #require(column.last?.upperBound)) - size.height) <= 1, "\(column)")
    }
  }

  /// SPB-13 — the leading half's start corners are the outer shape, its end corners the inner shape; the trailing half's
  /// the other way round; open, the trailing half's inner corners are inner-shape-open. The outline follows (outlined).
  @Test("SPB-13 outer and inner corners, and the open inner corners")
  func corners() throws {
    let fill = light[.primary].rgba8()
    let surface = light[.surface].rgba8()
    let d = Self.d
    let top = Snapshot.inset + d
    let bottom = Snapshot.inset + medium.containerHeight - d
    let closed = try Snapshot.render(fixtureButton())
    let items = halves(closed)
    #expect(items.count == 2)
    for y in [top, bottom] {
      #expect(pixel(closed, x: items[0].lowerBound + d, y: y).isClose(to: surface, tolerance: 24))  // outer
      #expect(pixel(closed, x: items[0].upperBound - d, y: y).isClose(to: fill, tolerance: 24))  // inner
      #expect(pixel(closed, x: items[1].lowerBound + d, y: y).isClose(to: fill, tolerance: 24))  // inner
      #expect(pixel(closed, x: items[1].upperBound - d, y: y).isClose(to: surface, tolerance: 24))  // outer
    }
    let open = try Snapshot.render(fixtureButton(open: .constant(true)))
    let openItems = halves(open)
    #expect(openItems.count == 2)
    // The same places; at this row the open corner has begun (it is the outer radius), so the run starts a little later.
    #expect(abs(openItems[0].upperBound - items[0].upperBound) <= 0.5 && abs(openItems[1].upperBound - items[1].upperBound) <= 0.5)
    for y in [top, bottom] {
      #expect(pixel(open, x: openItems[0].upperBound - d, y: y).isClose(to: fill, tolerance: 24))  // the leading half is unchanged
      #expect(pixel(open, x: openItems[1].lowerBound + d, y: y).isClose(to: surface, tolerance: 24))  // inner-shape-open
    }
    // Outlined: the outline follows the inner corner — along the leading half's top edge it reaches nearer its end.
    let outline = light[.outline].rgba8()
    let outlined = try Snapshot.render(fixtureButton(variant: .outlined))
    let sides = runs(outlined, y: Snapshot.inset + medium.containerHeight / 2, color: outline, tolerance: 40)
    let start = try #require(sides.first?.lowerBound)
    let end = try #require(sides.dropFirst().first?.upperBound)
    let edge = try #require(runs(outlined, y: Snapshot.inset + 0.25, color: outline, tolerance: 40).first)
    #expect(edge.lowerBound - start > end - edge.upperBound + 1, "\(edge) in \(start)…\(end)")
    // A modified system drives the open corner: aliased to inner-shape, open and closed corners are the same.
    var custom = TanreiSystem.tanrei
    custom.splitButton.containerInnerShapeOpen = custom.splitButton.containerInnerShape
    let quiet = try Snapshot.render(fixtureButton(open: .constant(true)), theme: theme(custom))
    #expect(pixel(quiet, x: halves(quiet)[1].lowerBound + d, y: top).isClose(to: fill, tolerance: 24))
  }

  /// SPB-13, SPB-14 — the chevron points down while closed and up while open, in the label color, at the icon size, drawn
  /// through the icon helper (the vector form without the icon font).
  @Test("SPB-13 SPB-14 the chevron: down closed, up open, in the label color")
  func chevron() throws {
    let content = light[.onPrimary].rgba8()
    let box = medium.iconSize
    func render(_ open: Bool) throws -> (Bitmap, CGFloat, CGFloat) {
      let bitmap = try Snapshot.render(fixtureButton(open: .constant(open)))
      let trailing = try #require(halves(bitmap).last)
      let x = (trailing.lowerBound + trailing.upperBound) / 2
      return (bitmap, x, Snapshot.inset + (medium.containerHeight - box) / 2)
    }
    let (closed, cx, boxTop) = try render(false)
    // Closed: the tip is low in the box (0.62), the arms high (0.39); open, turned half a turn.
    let tipDown = boxTop + box * TanreiSplitButtonChevronShape.tip - 0.5
    let tipUp = boxTop + box * (1 - TanreiSplitButtonChevronShape.tip) + 0.5
    #expect(inks(closed, content, x: (cx - 0.5)...(cx + 0.5), y: (tipDown - 0.5)...tipDown))
    #expect(!inks(closed, content, x: (cx - 0.5)...(cx + 0.5), y: tipUp...(tipUp + 0.5), tolerance: 24))
    let (open, _, _) = try render(true)
    #expect(inks(open, content, x: (cx - 0.5)...(cx + 0.5), y: tipUp...(tipUp + 0.5)))
    #expect(!inks(open, content, x: (cx - 0.5)...(cx + 0.5), y: (tipDown - 0.5)...tipDown, tolerance: 24))
    // The icon size drives the box: a larger box widens the trailing half.
    var custom = TanreiSystem.tanrei
    custom.splitButton.sizes.medium.iconSize = 24
    let wide = try #require(halves(try Snapshot.render(fixtureButton(), theme: theme(custom))).last)
    #expect(abs(wide.upperBound - wide.lowerBound - (2 * medium.trailingPaddingInline + 24)) <= 1)
  }

  /// SPB-14 — the label, the icon and the chevron are drawn in the label color of their own half's state; the label in the
  /// size's text style.
  @Test("SPB-14 label, icon and chevron in their half's label color; the label's text style")
  func content() throws {
    var custom = TanreiSystem.tanrei
    custom.splitButton.variants.filled.enabled.labelColor = .role(.error)
    let bitmap = try Snapshot.render(fixtureButton(icon: "square.and.arrow.down"), theme: theme(custom))
    let found = halves(bitmap)
    let error = light[.error].rgba8()
    let middle = (Snapshot.inset + 6)...(Snapshot.inset + medium.containerHeight - 6)
    // The icon, right after the with-icon start padding.
    let iconStart = found[0].lowerBound + medium.leadingPaddingInlineStartWithIcon
    #expect(inks(bitmap, error, x: iconStart...(iconStart + medium.iconSize), y: middle))
    // The label, after the icon and the gap.
    let labelStart = iconStart + medium.iconSize + medium.containerGap
    #expect(inks(bitmap, error, x: labelStart...(labelStart + 10), y: middle))
    #expect(inks(bitmap, error, x: found[1].lowerBound...found[1].upperBound, y: middle))
    // The chevron follows its own half's state: pressed trailing half with a pressed label color.
    var pressed = TanreiSystem.tanrei
    pressed.splitButton.variants.filled.pressed.labelColor = .role(.success)
    let chevron = try Snapshot.render(chrome(.trailing, pressed: true), theme: theme(pressed))
    #expect(inks(chevron, light[.success].rgba8(), x: (Snapshot.inset + 8)...(Snapshot.inset + 44), y: (Snapshot.inset + 8)...(Snapshot.inset + 44)))
    // The text style drives the label: a larger one widens the leading half.
    var large = TanreiSystem.tanrei
    large.splitButton.sizes.medium.labelTypescale = large.typescale.heading1
    let wide = halves(try Snapshot.render(fixtureButton(), theme: theme(large)), color: light[.primary].rgba8())
    #expect(try #require(wide.first).upperBound - (try #require(wide.first)).lowerBound > found[0].upperBound - found[0].lowerBound)
  }

  /// SPB-5 — the focus ring around the focused half's own shape (the inner corner too), keyboard focus only, not dimmed by
  /// the state's opacity; the half keeps its size.
  @Test("SPB-5 the focus ring is around the half's own shape")
  func focusRing() throws {
    let ring = TanreiFocusRingMetrics(containerCornerRadius: tokens.containerShape, measure: TanreiSystem.tanrei.measure)
    let y = Snapshot.inset + 8 + medium.containerHeight / 2
    let x = Snapshot.inset + 8 - ring.outerCenterlineOutset
    let focused = try Snapshot.render(chrome(.leading, focused: true))
    #expect(pixel(focused, x: x, y: y).isClose(to: light[.focusRing].rgba8(), tolerance: 40))
    #expect(!pixel(try Snapshot.render(chrome(.leading)), x: x, y: y).isClose(to: light[.focusRing].rgba8(), tolerance: 40))
    #expect(visualSize(focused) == visualSize(try Snapshot.render(chrome(.leading))))
    var dim = TanreiSystem.tanrei
    dim.splitButton.focused.opacity = 0.3
    #expect(pixel(try Snapshot.render(chrome(.leading, focused: true), theme: theme(dim)), x: x, y: y).isClose(to: light[.focusRing].rgba8(), tolerance: 40))
    // The ring follows the half's corners: the trailing half's ring differs from the leading half's mirrored.
    let trailing = try Snapshot.renderExact(chrome(.trailing, focused: true))
    let trailingOpen = try Snapshot.renderExact(chrome(.trailing, open: true, focused: true))
    #expect(trailing.pixels != trailingOpen.pixels)
  }

  /// SPB-7 — disabled: both halves from the disabled tokens; a disabled split button draws its closed form whatever open
  /// says.
  @Test("SPB-7 disabled draws the disabled tokens and the closed form")
  func disabled() throws {
    let bitmap = try Snapshot.render(fixtureButton().disabled(true))
    let expected = light[tokens.variants.filled.disabled.containerColor].rgba8(over: light[.surface])
    #expect(halves(bitmap, color: expected).count == 2)
    let open = try Snapshot.renderExact(fixtureButton(open: .constant(true)).disabled(true))
    #expect(open.pixels == (try Snapshot.renderExact(fixtureButton().disabled(true))).pixels)
  }

  /// SPB-18 — each half casts its elevation outside itself (elevated at rest; a modified elevation drives it).
  @Test("SPB-18 each half casts its elevation outside it")
  func elevation() throws {
    var custom = TanreiSystem.tanrei
    custom.splitButton.variants.filled.enabled.containerElevation = [TanreiShadowLayer(x: 0, y: 4, blur: 0, spread: 0, role: .error)]
    let bitmap = try Snapshot.render(fixtureButton().padding(.bottom, 8), theme: theme(custom))
    let found = halves(bitmap)
    for run in found {
      #expect(pixel(bitmap, x: (run.lowerBound + run.upperBound) / 2, y: Snapshot.inset + medium.containerHeight + 2).isClose(to: light[.error].rgba8(), tolerance: 12))
    }
    // The elevated variant is raised: below it is not the surface.
    let elevated = try Snapshot.render(fixtureButton(variant: .elevated).padding(.bottom, 8))
    #expect(!pixel(elevated, x: Snapshot.inset + 20, y: Snapshot.inset + medium.containerHeight + 1).isClose(to: light[.surface].rgba8(), tolerance: 1))
    let filled = try Snapshot.render(fixtureButton().padding(.bottom, 8))
    #expect(pixel(filled, x: Snapshot.inset + 20, y: Snapshot.inset + medium.containerHeight + 1).isClose(to: light[.surface].rgba8(), tolerance: 1))
  }

  /// SPB-19 — right to left: the trailing half is on the left, its outer corners on its left; the leading half's icon is
  /// on its right (its start); the chevron is not mirrored.
  @Test("SPB-19 right to left: the trailing half on the left; the chevron not mirrored")
  func rightToLeft() throws {
    let ltr = try Snapshot.render(fixtureButton(icon: "square.and.arrow.down"))
    let rtl = try Snapshot.render(fixtureButton(icon: "square.and.arrow.down").environment(\.layoutDirection, .rightToLeft))
    let trailingWidth = 2 * medium.trailingPaddingInline + medium.iconSize
    let ltrHalves = halves(ltr)
    let rtlHalves = halves(rtl)
    #expect(abs(ltrHalves[1].upperBound - ltrHalves[1].lowerBound - trailingWidth) <= 1)
    #expect(abs(rtlHalves[0].upperBound - rtlHalves[0].lowerBound - trailingWidth) <= 1, "\(rtlHalves)")
    // The trailing half's outer corner is its left one right to left.
    let d = Self.d
    #expect(pixel(rtl, x: rtlHalves[0].lowerBound + d, y: Snapshot.inset + d).isClose(to: light[.surface].rgba8(), tolerance: 24))
    #expect(pixel(rtl, x: rtlHalves[0].upperBound - d, y: Snapshot.inset + d).isClose(to: light[.primary].rgba8(), tolerance: 24))
    // The icon at the leading half's start: its right, right to left.
    let content = light[.onPrimary].rgba8()
    let middle = (Snapshot.inset + 10)...(Snapshot.inset + medium.containerHeight - 10)
    let iconEnd = rtlHalves[1].upperBound - medium.leadingPaddingInlineStartWithIcon
    #expect(inks(rtl, content, x: (iconEnd - medium.iconSize)...iconEnd, y: middle))
    // The chevron draws the same in both directions (it is pinned left to right).
    let chevronLTR = try Snapshot.renderExact(TanreiSplitButtonChevron(isOpen: false, size: 16).foregroundStyle(.black))
    let chevronRTL = try Snapshot.renderExact(TanreiSplitButtonChevron(isOpen: false, size: 16).foregroundStyle(.black).environment(\.layoutDirection, .rightToLeft))
    #expect(chevronLTR.pixels == chevronRTL.pixels)
  }
}

// MARK: - Snapshots (one per spec fixture)

@MainActor
@Suite("TanreiSplitButton snapshots")
struct TanreiSplitButtonSnapshotTests {
  /// Mirrors `fixtures` in specs/split-button.spec.json.
  nonisolated static let fixtures = [
    "filled-medium", "tonal-medium", "elevated-medium", "outlined-medium", "filled-small", "filled-large", "filled-icon", "filled-open",
    "outlined-open", "filled-disabled", "outlined-disabled",
  ]

  /// The SF Symbol a product would pass for each glyph the fixtures put in the icon slot (see the file header).
  static let symbols = ["save": "square.and.arrow.down"]

  /// The fixture on its 320 × 96 stage, start-aligned and vertically centred (SPB-12 verify). The menu slot stays empty
  /// (SPB-15): the `open` fixtures draw the open form and present no menu.
  static func view(_ fixture: SpecFixture) -> some View {
    let glyph = fixture.slot("icon").first
    return TanreiSplitButton(
      fixture: fixture.string("label") ?? "", icon: { if let glyph { Image(systemName: symbols[glyph] ?? "questionmark") } },
      menuLabel: fixture.string("menuLabel") ?? "", isMenuPresented: .constant(fixture.bool("open") ?? false),
      variant: TanreiSplitButtonVariant(rawValue: fixture.string("variant") ?? TanreiSplitButtonVariant.fallback.rawValue),
      size: TanreiSplitButtonSize(rawValue: fixture.string("size") ?? TanreiSplitButtonSize.fallback.rawValue), action: {}
    )
    .disabled(fixture.bool("disabled") ?? false)
    .frame(width: 320, height: 96, alignment: .leading)
  }

  static func fixture(_ id: String) throws -> SpecFixture {
    try #require(try SpecFixture.load(spec: "split-button").first { $0.id == id })
  }

  @Test("SPB-12 fixture matches its baseline", arguments: fixtures)
  func fixture(_ id: String) throws {
    try Snapshot.assert(Self.view(try Self.fixture(id)), named: id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    let spec = try SpecFixture.load(spec: "split-button")
    #expect(spec.map(\.id) == Self.fixtures)
    // Every glyph a fixture puts in the icon slot is drawn; no fixture fills the menu slot (SPB-15).
    for fixture in spec {
      for glyph in fixture.slot("icon") { #expect(Self.symbols[glyph] != nil, "\(fixture.id): \(glyph)") }
      #expect(fixture.slot("menu").isEmpty, "\(fixture.id)")
    }
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiSplitButtonTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiSplitButton preset snapshots")
struct TanreiSplitButtonPresetSnapshotTests {
  /// The filled split button with an icon: the preset's corners (outer and inner), paddings, gap and chevron.
  nonisolated static let fixtureId = "filled-icon"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiSplitButtonSnapshotTests.fixtures.contains(Self.fixtureId))
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try TanreiSplitButtonSnapshotTests.fixture(Self.fixtureId)
    try Snapshot.assert(TanreiSplitButtonSnapshotTests.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
