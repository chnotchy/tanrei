import AcmeFixture
import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/list.spec.json. Each behavior id (LST-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file. LST-5, LST-8, LST-9 and LST-10 are BTN-5, BTN-8, BTN-9 and BTN-10 for the
// list item: the primitives they rest on are tested once in TanreiButtonTests / TanreiPrimitivesTests; here each is
// proven to reach the item. The list's rules (tab stop, keys, positions, LST-26's checks) are tested as pure rules and
// through its model, as the radio group's are: the simulator gives no keyboard focus under automation.

private let suiteName = "TanreiListTests"

@MainActor
private final class Counter {
  var count = 0
}

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

/// The width every fixture is drawn at (LST-16 verify: "each renders one list 360 wide").
private let fixtureWidth: CGFloat = 360

/// A list's selection outside any view — what a `Binding` in a real app points at — counting its writes (`change`).
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

/// One item's chrome, as the list draws it, at the fixture width.
@MainActor
private func chrome(
  _ row: TanreiListRow = TanreiListRow(headline: "Inbox"), condition: TanreiListCondition = .unselected, isActive: Bool = true, showsMark: Bool = false,
  isPressed: Bool = false, isFocused: Bool = false
) -> some View {
  TanreiListItemChrome(
    row: row, condition: condition, isActive: isActive, showsMark: showsMark, isPressed: isPressed, isFocused: isFocused, leading: EmptyView(),
    trailing: EmptyView()
  )
  .frame(width: fixtureWidth)
}

/// The height of a render without the snapshot inset, in points.
@MainActor
private func visualHeight(_ bitmap: Bitmap) -> CGFloat {
  CGFloat(bitmap.height) / Snapshot.scale - 2 * Snapshot.inset
}

private let longText = "The plan for the next quarter, with milestones, owners and the risks we already know about, and more besides."

// MARK: - Activation and selection (LST-1, LST-2, LST-11, LST-12, LST-13, LST-14, LST-24, LST-26)

@MainActor
@Suite("TanreiList activation", .serialized)
struct TanreiListActivationTests {
  /// LST-1 — an interactive item calls its action once per activation; LST-2 — never while disabled; LST-11 — a static
  /// item has nothing to activate.
  @Test("LST-1 LST-2 LST-11 an interactive item activates once; never while disabled; a static item never")
  func activation() {
    let counter = Counter()
    let item = TanreiListItem("Wi-Fi", action: { counter.count += 1 })
    #expect(item.kind == .interactive)
    item.activate(isEnabled: true)
    #expect(counter.count == 1)
    item.activate(isEnabled: false)
    #expect(counter.count == 1)
    let still = TanreiListItem("Inbox")
    #expect(still.kind == .static)
    still.activate(isEnabled: true)
    #expect(counter.count == 1)
  }

  /// LST-13 — single: activating an unselected option writes its value once; the selected one writes nothing (a single
  /// choice is never cleared by its own option); a value of another type selects nothing.
  @Test("LST-13 single selection: the option's value is written once; the selected option writes nothing")
  func single() {
    let store = Store<String?>("light")
    let list = TanreiList(selection: store.binding, label: "Theme") { EmptyView() }
    #expect(list.selectionMode == .single)
    list.choose(AnyHashable("dark"))
    #expect(store.value == "dark" && store.writes == 1)
    list.choose(AnyHashable("dark"))
    #expect(store.writes == 1)
    list.choose(AnyHashable(3))
    #expect(store.value == "dark" && store.writes == 1)
  }

  /// LST-14 — multiple: activating an option adds its value, or removes it when held, once each time.
  @Test("LST-14 multiple selection: an option's value is added or removed")
  func multiple() {
    let store = Store<Set<String>>(["bug"])
    let list = TanreiList(selection: store.binding, label: "Labels") { EmptyView() }
    #expect(list.selectionMode == .multiple)
    list.choose(AnyHashable("docs"))
    #expect(store.value == ["bug", "docs"] && store.writes == 1)
    list.choose(AnyHashable("bug"))
    #expect(store.value == ["docs"] && store.writes == 2)
  }

  /// LST-12 — the three kinds of row: an option in a list with a binding (interactive ignored), else interactive with
  /// `action:`, else static; the list without a binding is selection none.
  @Test("LST-12 the kind of row follows the list's selection and the item's action")
  func kinds() {
    #expect(TanreiList { EmptyView() }.selectionMode == .none)
    #expect(TanreiListSelectionMode(rawValue: "single") == .single && TanreiListSelectionMode(rawValue: "multiple") == .multiple)
    let model = TanreiListModel()
    var environment = EnvironmentValues()
    environment.tanreiListContext = TanreiListContext(mode: .single, selected: [AnyHashable("light")], model: model, choose: { _ in })
    // Outside a list: interactive with `action:`, else static.
    #expect(TanreiListItem("Wi-Fi", action: {}).kind == .interactive)
    #expect(TanreiListItem("Inbox").kind == .static)
    // The tag is the item's own value; an optional tag of nil is none.
    #expect(TanreiListItem("Light").tag("light").value == AnyHashable("light"))
    #expect(TanreiListItem("Light").tag(String?.none).value == nil)
    #expect(TanreiListItem("Light").tag(Optional("light")).value == AnyHashable("light"))
  }

  #if os(macOS)
  /// LST-1 by pointer, LST-5: a click anywhere on the row — its padding, the trailing icon — activates it once; LST-2:
  /// disabled, nothing.
  @Test("LST-1 LST-2 LST-5 a click anywhere on an interactive row activates it once; never when disabled", arguments: [true, false])
  func pointerClick(isEnabled: Bool) {
    let counter = Counter()
    let hosted = HostedView(
      TanreiList {
        TanreiListItem("Wi-Fi", supportingText: "Connected", trailingIcon: .image(Image(systemName: "chevron.right")), action: { counter.count += 1 })
          .disabled(!isEnabled)
      }
      .frame(width: fixtureWidth).padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    hosted.click(at: CGPoint(x: Snapshot.inset + 4, y: hosted.size.height / 2))  // the start padding
    #expect(counter.count == (isEnabled ? 1 : 0))
    hosted.click(at: CGPoint(x: Snapshot.inset + fixtureWidth - 26, y: hosted.size.height / 2))  // the trailing icon
    #expect(counter.count == (isEnabled ? 2 : 0))
  }

  /// LST-13 end to end: a click on an unselected option writes the binding once; on the selected one, nothing.
  @Test("LST-13 LST-26 a click on an option selects it; on the selected option, nothing")
  func clickOption() {
    let store = Store<String?>("light")
    let hosted = HostedView(
      TanreiList(selection: store.binding, label: "Theme") {
        TanreiListItem("Light").tag("light")
        TanreiListItem("Dark").tag("dark")
      }
      .frame(width: fixtureWidth).padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    let row = TanreiSystem.tanrei.list.containerHeightOneLine
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: Snapshot.inset + row / 2))
    #expect(store.writes == 0)
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: Snapshot.inset + row * 1.5))
    #expect(store.value == "dark" && store.writes == 1)
  }

  /// LST-14 end to end: clicks add and remove values; LST-2: a disabled option writes nothing.
  @Test("LST-14 LST-2 clicks switch options of a multiple list; a disabled option writes nothing")
  func clickMultiple() {
    let store = Store<Set<String>>([])
    let hosted = HostedView(
      TanreiList(selection: store.binding, label: "Labels") {
        TanreiListItem("Bug").tag("bug")
        TanreiListItem("Feature").tag("feature").disabled(true)
      }
      .frame(width: fixtureWidth).padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    let row = TanreiSystem.tanrei.list.containerHeightOneLine
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: Snapshot.inset + row / 2))
    #expect(store.value == ["bug"])
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: Snapshot.inset + row / 2))
    #expect(store.value.isEmpty && store.writes == 2)
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: Snapshot.inset + row * 1.5))
    #expect(store.writes == 2)
  }

  /// LST-11 — a static item's trailing control keeps its own semantics and activation: a click on the switch toggles it,
  /// and the row itself is not a button.
  @Test("LST-11 a control in a static item's trailing slot is its own control")
  func trailingControl() {
    let store = Store(false)
    let hosted = HostedView(
      TanreiList {
        TanreiListItem("Airplane mode", trailing: { TanreiSwitch("Airplane mode", isOn: store.binding).labelsHidden() })
      }
      .frame(width: fixtureWidth).padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    hosted.click(at: CGPoint(x: Snapshot.inset + 30, y: hosted.size.height / 2))  // the headline: nothing
    #expect(store.writes == 0)
    let track = TanreiSystem.tanrei.switch.trackWidth
    hosted.click(at: CGPoint(x: Snapshot.inset + fixtureWidth - TanreiSystem.tanrei.list.containerPaddingInlineEnd - track / 2, y: hosted.size.height / 2))
    #expect(store.value && store.writes == 1)
  }
  #endif

  /// LST-24 — an interactive item has no trailing slot (the initializer with `action:` takes none), and SwiftUI cannot
  /// look inside the leading slot to report an interactive element: the README and the docs page state the rule.
  @Test("LST-24 an interactive item offers no trailing slot")
  func noInteractiveSlots() {
    let item = TanreiListItem("Wi-Fi", leadingMedia: .avatar, action: {}) { Text("W") }
    #expect(item.kind == .interactive && TanreiSlotContent.isEmpty(item.trailing))
  }

  /// LST-23 — an empty headline is reported (and the item still renders); a selectable list without a label is reported.
  @Test("LST-23 an empty headline and an unnamed listbox are reported in debug builds")
  func names() throws {
    let (_, headline) = Reports.collecting { _ = TanreiListItem("") }
    #expect(headline.mention("LST-23") && headline.mention("headline is empty"))
    let (_, listbox) = Reports.collecting { _ = TanreiList(selection: .constant(String?.none), label: "") { EmptyView() } }
    #expect(listbox.mention("LST-23") && listbox.mention("no label"))
    let (_, silent) = Reports.collecting {
      _ = TanreiList { TanreiListItem("Inbox") }
      _ = TanreiList(selection: .constant(Set<String>()), label: "Labels") { EmptyView() }
    }
    #expect(silent.messages.isEmpty)
    let (bitmap, _) = try Reports.collecting { try Snapshot.render(chrome(TanreiListRow(headline: ""))) }
    #expect(visualHeight(bitmap) == TanreiSystem.tanrei.list.containerHeightOneLine)
  }

  /// LST-23 — the description is the overline, supporting text and trailing text in reading order, in full.
  @Test("LST-23 the description is the overline, the supporting text and the trailing text, in full")
  func description() {
    let row = TanreiListRow(headline: "Roadmap", overline: "Engineering", supportingText: longText, supportingLineLimit: 1, trailingText: "9:41")
    #expect(row.accessibilityDescription == "Engineering, \(longText), 9:41")
    #expect(TanreiListRow(headline: "Inbox").accessibilityDescription.isEmpty)
  }
}

// MARK: - The list's rules (LST-2, LST-12, LST-15, LST-26)

@MainActor
@Suite("TanreiList rules")
struct TanreiListRuleTests {
  private func entry(
    _ headline: String, focusable: Bool = true, enabled: Bool = true, option: Bool = false, value: String? = nil, selected: Bool = false
  ) -> TanreiListEntry {
    TanreiListEntry(id: TanreiListItemID(), headline: headline, isFocusable: focusable, isEnabled: enabled, isOption: option, value: value, isSelected: selected)
  }

  /// LST-15 — the tab stop: the item focused last, else the first selected option, else the first enabled item; static
  /// items never.
  @Test("LST-15 the tab stop is the item focused last, else the first selected option, else the first enabled item")
  func tabStop() {
    let items = [entry("Static", focusable: false), entry("Off", enabled: false), entry("A"), entry("B", selected: true), entry("C")]
    #expect(TanreiListRules.tabStop(items, lastFocused: nil) == items[3].id)
    #expect(TanreiListRules.tabStop(items, lastFocused: items[4].id) == items[4].id)
    #expect(TanreiListRules.tabStop(items, lastFocused: items[0].id) == items[3].id)
    let none = [entry("Static", focusable: false), entry("Off", enabled: false), entry("A")]
    #expect(TanreiListRules.tabStop(none, lastFocused: nil) == none[2].id)
    let allDisabled = [entry("Off", enabled: false), entry("Also off", enabled: false)]
    #expect(TanreiListRules.tabStop(allDisabled, lastFocused: nil) == allDisabled[0].id)
    #expect(TanreiListRules.tabStop([entry("Static", focusable: false)], lastFocused: nil) == nil)
  }

  /// LST-15 — Down and Up move without wrapping, Home and End to the ends; static items are skipped. LST-2: SwiftUI never
  /// gives a disabled button keyboard focus, so the SwiftUI list moves past a disabled item; the rule itself reaches one when it takes focus.
  @Test("LST-15 LST-2 the arrow keys stop at the ends; Home and End; static items are skipped")
  func keys() {
    let keys = TanreiRovingKeys(wraps: false)
    let items = [TanreiRovingItem(focusable: true, label: "A"), TanreiRovingItem(focusable: false, label: "Static"), TanreiRovingItem(focusable: true, label: "B")]
    #expect(keys.target(for: .downArrow, from: 0, in: items) == 2)
    #expect(keys.target(for: .downArrow, from: 2, in: items) == 2)
    #expect(keys.target(for: .upArrow, from: 0, in: items) == 0)
    #expect(keys.target(for: .upArrow, from: 2, in: items) == 0)
    #expect(keys.target(for: .home, from: 2, in: items) == 0 && keys.target(for: .end, from: 0, in: items) == 2)
    #expect(keys.target(for: .downArrow, from: nil, in: items) == 0 && keys.target(for: .upArrow, from: nil, in: items) == 2)
    #expect(keys.target(for: .leftArrow, from: 0, in: items) == nil)
    let disabled = [entry("A"), entry("Off", enabled: false), entry("B")]
    #expect(TanreiListRules.roving(disabled).map(\.focusable) == [true, false, true])
  }

  /// LST-15 — typeahead: the next headline that begins with the characters typed within a second, case-insensitive; a
  /// Space starts no search (it activates) but continues one; with no match focus stays.
  @Test("LST-15 typeahead moves to the next matching headline; a Space only continues a search")
  func typeahead() {
    var keys = TanreiRovingKeys(wraps: false)
    let items = ["Inbox", "Starred", "Sent", "Sent mail"].map { TanreiRovingItem(focusable: true, label: $0) }
    #expect(keys.target(typing: "s", at: 0, from: 0, in: items) == .some(1))
    #expect(keys.target(typing: "e", at: 0.5, from: 1, in: items) == .some(2))
    #expect(keys.target(typing: "n", at: 0.9, from: 2, in: items) == .some(2))
    #expect(keys.target(typing: "t", at: 1.2, from: 2, in: items) == .some(2))
    #expect(keys.target(typing: " ", at: 1.5, from: 2, in: items) == .some(3))
    #expect(keys.target(typing: "S", at: 5, from: 3, in: items) == .some(1))
    #expect(keys.target(typing: "z", at: 10, from: 1, in: items) == .some(1))
    #expect(keys.target(typing: " ", at: 20, from: 1, in: items) == nil)
    #expect(keys.target(typing: "\u{F700}", at: 30, from: 1, in: items) == nil)
    #expect(keys.target(typing: "ab", at: 40, from: 1, in: items) == nil)
  }

  /// LST-15 — a move through the model makes the target the tab stop at once and never selects.
  @Test("LST-15 a key moves the tab stop without selecting")
  func modelMove() {
    let model = TanreiListModel()
    let items = [entry("Light", option: true, value: "light", selected: true), entry("Dark", option: true, value: "dark")]
    model.update(items, selected: ["light"])
    var focused: [Int] = []
    model.register(items[0].id, focus: { focused.append(0) })
    model.register(items[1].id, focus: { focused.append(1) })
    #expect(model.isTabStop(items[0].id))
    #expect(model.move(from: items[0].id, key: .downArrow))
    #expect(model.isTabStop(items[1].id) && !model.isTabStop(items[0].id))
    #expect(!model.move(from: items[0].id, key: .leftArrow))
    #expect(model.type("l", from: items[1].id))
    #expect(model.isTabStop(items[0].id))
    #expect(model.entries.map(\.isSelected) == [true, false])
  }

  /// LST-12 — each item's position and the list's size.
  @Test("LST-12 each item has its position and the list's size")
  func positions() {
    let items = [entry("A", focusable: false), entry("B"), entry("C")]
    #expect(TanreiListRules.positionText(of: items[1].id, in: items) == "2 of 3")
    #expect(TanreiListRules.positionText(of: TanreiListItemID(), in: items) == nil)
  }

  /// LST-26 — an option without a value, two options with one value, and a selection that names no option are reported;
  /// a list of valid options reports nothing.
  @Test("LST-26 missing, repeated and unknown values are reported")
  func problems() {
    let items = [
      entry("Light", option: true, value: "light"), entry("Dark", option: true, value: nil), entry("Dim", option: true, value: "light"),
    ]
    let problems = TanreiListRules.problems(items, selected: ["light", "sepia"])
    #expect(problems.count == 3)
    #expect(problems.contains { $0.contains("\"Dark\"") && $0.contains("no value") })
    #expect(problems.contains { $0.contains("\"Dim\"") && $0.contains("repeats") })
    #expect(problems.contains { $0.contains("\"sepia\"") })
    #expect(TanreiListRules.problems([entry("Light", option: true, value: "light")], selected: ["light"]).isEmpty)
    #expect(TanreiListRules.problems([entry("Inbox")], selected: []).isEmpty)
  }

  /// LST-26 — rendered: the option whose value the binding holds is selected; a value naming no option selects nothing;
  /// an option with a repeated value is still drawn.
  @Test("LST-26 the binding selects the option holding its value; an unknown value selects nothing")
  func renderedSelection() throws {
    let selectedFill = light[TanreiSystem.tanrei.list.conditions.selected.enabled.containerColor].rgba8()
    func list(_ value: String?) -> some View {
      TanreiList(selection: .constant(value), label: "Theme") {
        TanreiListItem("Light").tag("light")
        TanreiListItem("Dark").tag("dark")
        TanreiListItem("Dark again").tag("dark")
      }
      .frame(width: fixtureWidth)
    }
    let row = TanreiSystem.tanrei.list.containerHeightOneLine
    // The repeated value is reported (LST-26): collected, so the debug assertion does not trap.
    let (dark, reports) = try Reports.collecting { try Snapshot.render(list("dark")) }
    #expect(reports.mention("repeats the value \"dark\""))
    #expect(!pixel(dark, x: Snapshot.inset + 4, y: Snapshot.inset + row / 2).isClose(to: selectedFill))
    #expect(pixel(dark, x: Snapshot.inset + 4, y: Snapshot.inset + row * 1.5).isClose(to: selectedFill))
    #expect(pixel(dark, x: Snapshot.inset + 4, y: Snapshot.inset + row * 2.5).isClose(to: selectedFill))
    let (none, unknown) = try Reports.collecting { try Snapshot.render(list("sepia")) }
    #expect(unknown.mention("\"sepia\""))
    #expect(visualHeight(none) == 3 * row)
    for index in 0..<3 {
      #expect(!pixel(none, x: Snapshot.inset + 4, y: Snapshot.inset + row * (CGFloat(index) + 0.5)).isClose(to: selectedFill))
    }
  }
}

// MARK: - Token bindings (LST-3, LST-6, LST-7, LST-9, LST-11, LST-21, LST-25)

@MainActor
@Suite("TanreiList token bindings")
struct TanreiListTokenBindingTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiListTokens { system.list }

  private func appearance(
    _ condition: TanreiListCondition, _ state: TanreiInteraction, active: Bool = true, tokens: TanreiListTokens? = nil
  ) -> TanreiListItemAppearance {
    TanreiListItemAppearance(tokens: tokens ?? self.tokens, condition: condition, isActive: active, state: state)
  }

  /// At rest: unselected has no fill, on-surface headline, on-surface-variant texts and icons, no check;
  /// selected has the secondary-container fill, on-secondary-container headline and leading icon, and a primary check.
  @Test("LST-3 LST-21 at rest each condition binds the expected values")
  func rest() {
    let unselected = appearance(.unselected, .enabled)
    #expect(unselected.container == TanreiPaint.none && unselected.headline == .role(.onSurface) && unselected.mark == TanreiPaint.none)
    #expect(unselected.overline == .role(.onSurfaceVariant) && unselected.supportingText == .role(.onSurfaceVariant))
    #expect(unselected.trailingText == .role(.onSurfaceVariant) && unselected.leadingIcon == .role(.onSurfaceVariant))
    #expect(unselected.trailingIcon == .role(.onSurfaceVariant) && unselected.opacity == 1 && unselected.cornerRadius == system.shape.none)
    let selected = appearance(.selected, .enabled)
    #expect(selected.container == .role(.secondaryContainer) && selected.headline == .role(.onSecondaryContainer))
    #expect(selected.leadingIcon == .role(.onSecondaryContainer) && selected.mark == .role(.primary))
    #expect(TanreiListCondition.core == [.unselected, .selected] && TanreiListCondition.fallback == .unselected)
  }

  /// LST-3 — hovered, focused and pressed mix the state-layer color (the headline's) into the row; every other part keeps
  /// its resting value.
  @Test("LST-3 each state binds that state's tokens", arguments: TanreiListCondition.core)
  func states(condition: TanreiListCondition) {
    let rest = appearance(condition, .enabled)
    let layer = tokens.conditions[condition].enabled.stateLayerColor
    #expect(layer == rest.headline)
    for (state, amount) in [
      (TanreiInteraction.hovered, system.state.hoverStateLayerOpacity), (.focused, system.state.focusStateLayerOpacity), (.pressed, system.state.pressedStateLayerOpacity),
    ] {
      let drawn = appearance(condition, state)
      #expect(drawn.container == .mix(base: rest.container, with: layer, amount: amount))
      #expect(drawn.headline == rest.headline && drawn.mark == rest.mark && drawn.leadingIcon == rest.leadingIcon && drawn.opacity == 1)
    }
  }

  /// LST-3 (verify) — under acme, hovered, focused and pressed are three different values.
  @Test("LST-3 under acme, hovered, focused and pressed differ")
  func acme() {
    for condition in TanreiListCondition.core {
      let containers = [TanreiInteraction.hovered, .focused, .pressed].map {
        TanreiListItemAppearance(tokens: TanreiSystem.acme.list, condition: condition, state: $0).container
      }
      #expect(Set(containers.map { "\($0)" }).count == 3, "\(condition)")
    }
  }

  /// LST-6 — disabled keeps each condition's resting colors (no grey bar under an unselected row, the fill of a selected
  /// one) and dims the whole item by the disabled opacity.
  @Test("LST-6 disabled bindings", arguments: TanreiListCondition.core)
  func disabled(condition: TanreiListCondition) {
    let rest = appearance(condition, .enabled)
    let drawn = appearance(condition, .disabled)
    #expect(drawn.container == rest.container && drawn.headline == rest.headline && drawn.mark == rest.mark && drawn.leadingIcon == rest.leadingIcon)
    #expect(drawn.opacity == tokens.disabled.opacity && drawn.opacity == system.state.disabledContentOpacity)
  }

  /// LST-11 — a static item is drawn from the resting tokens of unselected, whatever its state.
  @Test("LST-11 a static item ignores every state and condition", arguments: TanreiInteraction.allCases)
  func staticItem(state: TanreiInteraction) {
    #expect(appearance(.selected, state, active: false) == appearance(.unselected, .enabled))
  }

  /// LST-3 LST-6 — the values drive the result.
  @Test("LST-3 LST-6 a modified system changes what each state resolves to")
  func modifiedSystem() {
    var custom = tokens
    custom.conditions.unselected.hovered.containerColor = .role(.error)
    custom.conditions.unselected.focused.headlineColor = .role(.warning)
    custom.conditions.selected.pressed.markColor = .role(.success)
    custom.conditions.selected.disabled.overlineColor = .role(.primary)
    custom.pressed.opacity = 0.5
    custom.pressed.containerShape = 12
    #expect(appearance(.unselected, .hovered, tokens: custom).container == .role(.error))
    #expect(appearance(.unselected, .focused, tokens: custom).headline == .role(.warning))
    #expect(appearance(.selected, .pressed, tokens: custom).mark == .role(.success))
    #expect(appearance(.selected, .disabled, tokens: custom).overline == .role(.primary))
    #expect(appearance(.unselected, .pressed, tokens: custom).opacity == 0.5 && appearance(.unselected, .pressed, tokens: custom).cornerRadius == 12)
    #expect(appearance(.unselected, .enabled, tokens: custom) == appearance(.unselected, .enabled))
  }

  /// LST-7 — a leadingMedia name the list does not define is none, and is reported; a condition a system does not have
  /// reads unselected's tokens, and is reported. `selection` is the type of the binding, so it cannot name an unknown value.
  @Test("LST-7 an unknown leadingMedia is none; an unknown condition reads unselected's tokens; both reported")
  func unknownValues() {
    let (media, reports) = Reports.collecting { TanreiListLeadingMedia(named: "video") }
    #expect(media == TanreiListLeadingMedia.none && reports.mention("LST-7") && reports.mention("video"))
    let (known, silent) = Reports.collecting { TanreiListLeadingMedia(named: "avatar") }
    #expect(known == .avatar && silent.messages.isEmpty)
    #expect(TanreiListLeadingMedia.allCases.map(\.rawValue) == ["none", "avatar", "image"])
    let (value, conditionReports) = Reports.collecting { appearance(TanreiListCondition(rawValue: "starred"), .hovered) }
    #expect(value == appearance(.unselected, .hovered) && conditionReports.mention("list condition \"starred\""))
  }

  /// LST-21 LST-25 — state and condition changes, and the check, move over the list's state motion; at once under Reduce
  /// Motion; the ripple over the feedback duration.
  @Test("LST-21 LST-25 the state motion comes from the tokens; none under Reduce Motion")
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

// MARK: - Rendered (LST-4, LST-6, LST-10, LST-16 … LST-22)

@MainActor
@Suite("TanreiList rendered")
struct TanreiListRenderedTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiListTokens { system.list }

  /// LST-17 — the minimum heights: one line, one more line (an overline, or supporting text on one line), two or more;
  /// LST-5: an interactive item or an option is at least the minimum target tall.
  @Test("LST-17 LST-5 one-, two- and three-line heights; an action is at least the target tall")
  func heights() throws {
    #expect(visualHeight(try Snapshot.render(chrome(TanreiListRow(headline: "Inbox")))) == tokens.containerHeightOneLine)
    #expect(visualHeight(try Snapshot.render(chrome(TanreiListRow(headline: "Inbox", overline: "Mail")))) == tokens.containerHeightTwoLine)
    #expect(visualHeight(try Snapshot.render(chrome(TanreiListRow(headline: "Inbox", supportingText: "12 new")))) == tokens.containerHeightTwoLine)
    #expect(visualHeight(try Snapshot.render(chrome(TanreiListRow(headline: "Inbox", overline: "Mail", supportingText: "12 new")))) == tokens.containerHeightThreeLine)
    #expect(visualHeight(try Snapshot.render(chrome(TanreiListRow(headline: "Inbox", supportingText: longText, supportingLineLimit: 2)))) == tokens.containerHeightThreeLine)
    // LST-5: shorter rows, then the target: a static one keeps the token height, an action grows to the target.
    var short = system
    short.list.containerHeightOneLine = 10
    short.list.containerPaddingBlock = 0
    let target = TanreiHitTarget.minimum(in: system.measure)
    let line = tokens.headlineTypescale.lineHeight
    #expect(target > line)
    #expect(visualHeight(try Snapshot.render(chrome(isActive: false), theme: theme(short))) == line)
    #expect(visualHeight(try Snapshot.render(chrome(isActive: true), theme: theme(short))) == target)
  }

  /// LST-17 — the row grows past its minimum with its content (a wrapped headline, padded by `padding-block`), never
  /// clipping it; LST-18: the headline wraps rather than truncates.
  @Test("LST-17 LST-18 the row grows with a wrapped headline, padded by padding-block")
  func grows() throws {
    let tall = try Snapshot.render(chrome(TanreiListRow(headline: longText + " " + longText)))
    let lines = (visualHeight(tall) - 2 * tokens.containerPaddingBlock) / tokens.headlineTypescale.lineHeight
    #expect(visualHeight(tall) > tokens.containerHeightOneLine)
    #expect(abs(lines - lines.rounded()) < 0.01 && lines >= 3)
  }

  /// LST-18 — supportingLineLimit cuts the supporting text after that many lines; 0 or nil shows all of it.
  @Test("LST-18 supportingLineLimit cuts the supporting text; 0 shows all of it")
  func lineLimit() throws {
    let one = visualHeight(try Snapshot.render(chrome(TanreiListRow(headline: "Roadmap", supportingText: longText + longText, supportingLineLimit: 1))))
    let all = visualHeight(try Snapshot.render(chrome(TanreiListRow(headline: "Roadmap", supportingText: longText + longText, supportingLineLimit: 0))))
    #expect(one == tokens.containerHeightTwoLine)
    #expect(all > tokens.containerHeightThreeLine)
    #expect(TanreiListRow(headline: "A", supportingLineLimit: 0).lineLimit == nil && TanreiListRow(headline: "A", supportingLineLimit: 3).lineLimit == 3)
  }

  /// LST-18 — each text in its role: a modified system's headline line height changes the one-line row's content.
  @Test("LST-18 the texts take their type styles")
  func typeStyles() throws {
    var custom = system
    custom.list.headlineTypescale.lineHeight = 60
    custom.list.supportingTextTypescale.lineHeight = 40
    let row = TanreiListRow(headline: "Inbox", supportingText: "12 new")
    #expect(visualHeight(try Snapshot.render(chrome(row), theme: theme(custom))) == 60 + 40 + 2 * tokens.containerPaddingBlock)
  }

  /// LST-16 — the row: the start padding, the leading icon, the gap, the text; the trailing text ends at the end padding;
  /// the mark's box at the very end of an option. Right to left, the row mirrors.
  @Test("LST-16 the row's order and spacing, mirrored right to left", arguments: [LayoutDirection.leftToRight, .rightToLeft])
  func order(direction: LayoutDirection) throws {
    var custom = system
    custom.list.conditions.selected.enabled.leadingIconColor = .role(.error)
    custom.list.conditions.selected.enabled.markColor = .role(.success)
    custom.list.conditions.selected.enabled.containerColor = .none
    let row = TanreiListRow(headline: "Inbox", leadingIcon: .image(Image(systemName: "square.fill")))
    let bitmap = try Snapshot.render(chrome(row, condition: .selected, showsMark: true).environment(\.layoutDirection, direction), theme: theme(custom))
    let y = Snapshot.inset + tokens.containerHeightOneLine / 2
    let mirror: (CGFloat) -> CGFloat = { direction == .leftToRight ? Snapshot.inset + $0 : Snapshot.inset + fixtureWidth - $0 }
    let icon = tokens.containerPaddingInlineStart + tokens.leadingIconSize / 2
    #expect(pixel(bitmap, x: mirror(icon), y: y).isClose(to: light[.error].rgba8(), tolerance: 40))
    #expect(pixel(bitmap, x: mirror(tokens.containerPaddingInlineStart / 2), y: y).isClose(to: light[.surface].rgba8()))
    // The check's box: the last `mark.size` before the end padding; its stroke crosses its middle column near the bottom.
    let markStart = fixtureWidth - tokens.containerPaddingInlineEnd - tokens.markSize
    var found = false
    for step in stride(from: CGFloat(0), through: tokens.markSize, by: 0.5) {
      let sample = pixel(bitmap, x: mirror(markStart + tokens.markSize * 0.4), y: Snapshot.inset + (tokens.containerHeightOneLine - tokens.markSize) / 2 + step)
      if sample.isClose(to: light[.success].rgba8(), tolerance: 40) { found = true }
    }
    #expect(found)
    #expect(pixel(bitmap, x: mirror(fixtureWidth - tokens.containerPaddingInlineEnd / 2), y: y).isClose(to: light[.surface].rgba8()))
  }

  /// LST-16 — the fixtures' list draws nothing of its own and adds no space: its height is the sum of its rows.
  @Test("LST-16 the list adds no space around its items")
  func noSpace() throws {
    let bitmap = try Snapshot.render(TanreiList { TanreiListItem("Inbox"); TanreiListItem("Sent") }.frame(width: fixtureWidth))
    #expect(visualHeight(bitmap) == 2 * tokens.containerHeightOneLine)
    #expect(pixel(bitmap, x: Snapshot.inset + 2, y: Snapshot.inset + 2).isClose(to: light[.surface].rgba8()))
  }

  /// LST-17 — the leading and trailing elements are centered in a one- or two-line row and aligned with the top of the
  /// text column in a three-line row.
  @Test("LST-17 leading elements centered in two lines, at the top in three")
  func alignment() throws {
    var custom = system
    custom.list.conditions.unselected.enabled.leadingIconColor = .role(.error)
    let icon = TanreiItemIcon.image(Image(systemName: "square.fill"))
    let x = Snapshot.inset + tokens.containerPaddingInlineStart + tokens.leadingIconSize / 2
    let two = try Snapshot.render(chrome(TanreiListRow(headline: "Inbox", supportingText: "12 new", leadingIcon: icon), isActive: false), theme: theme(custom))
    #expect(pixel(two, x: x, y: Snapshot.inset + tokens.containerHeightTwoLine / 2).isClose(to: light[.error].rgba8(), tolerance: 40))
    let three = try Snapshot.render(
      chrome(TanreiListRow(headline: "Inbox", overline: "Mail", supportingText: "12 new", leadingIcon: icon), isActive: false), theme: theme(custom))
    #expect(pixel(three, x: x, y: Snapshot.inset + tokens.containerPaddingBlock + tokens.leadingIconSize / 2).isClose(to: light[.error].rgba8(), tolerance: 40))
    #expect(!pixel(three, x: x, y: Snapshot.inset + tokens.containerHeightThreeLine - tokens.containerPaddingBlock - 2).isClose(to: light[.error].rgba8(), tolerance: 40))
  }

  /// LST-19 — the leading icon's box is `leading-icon.size`, and it moves the text by its width and the gap; an empty
  /// name draws nothing and leaves no space. The icon takes its condition's color.
  @Test("LST-19 the icon boxes come from the tokens; an empty name takes no space")
  func iconSizes() throws {
    var custom = system
    custom.list.leadingIconSize = 36
    custom.list.conditions.unselected.enabled.headlineColor = .role(.error)
    let x = Snapshot.inset + tokens.containerPaddingInlineStart + 36 + tokens.containerGap + 1
    func headlineInk(_ bitmap: Bitmap, from: CGFloat) -> Bool {
      stride(from: from, to: from + 12, by: 0.5).contains { x in
        stride(from: CGFloat(18), to: 30, by: 0.5).contains { pixel(bitmap, x: x, y: Snapshot.inset + $0).isClose(to: light[.error].rgba8(), tolerance: 60) }
      }
    }
    let withIcon = try Snapshot.render(chrome(TanreiListRow(headline: "Inbox", leadingIcon: .image(Image(systemName: "tray"))), isActive: false), theme: theme(custom))
    #expect(!headlineInk(withIcon, from: Snapshot.inset + tokens.containerPaddingInlineStart))
    #expect(headlineInk(withIcon, from: x - 1))
    let emptyName = try Snapshot.renderExact(chrome(TanreiListRow(headline: "Inbox", leadingIcon: ""), isActive: false), theme: theme(custom))
    let noIcon = try Snapshot.renderExact(chrome(TanreiListRow(headline: "Inbox"), isActive: false), theme: theme(custom))
    #expect(emptyName.mismatch(against: noIcon, channelTolerance: 0) == 0)
  }

  /// LST-19 — the glyph is drawn with the family and fill of the item's condition: a selected option hands its icons
  /// the selected icon context, an unselected one the unselected.
  @Test("LST-19 icons follow the item's condition")
  func iconSelection() throws {
    final class Probe: @unchecked Sendable {
      var contexts: [TanreiIconContext] = []
    }
    struct Reader: View {
      let probe: Probe
      @Environment(\.tanreiIconContext) private var context
      var body: some View {
        if let context { probe.contexts.append(context) }
        return Color.clear
      }
    }
    let probe = Probe()
    for selected in [false, true] {
      _ = try Snapshot.render(TanreiItemIconView(icon: .view(Reader(probe: probe)), size: tokens.leadingIconSize, selected: selected))
    }
    #expect(probe.contexts.map(\.selected).contains(true) && probe.contexts.map(\.selected).contains(false))
    #expect(probe.contexts.allSatisfy { $0.size == tokens.leadingIconSize })
    #expect(TanreiItemIcon("").isEmpty && !TanreiItemIcon("inbox").isEmpty && !TanreiItemIcon.image(Image(systemName: "tray")).isEmpty)
  }

  /// LST-20 — an avatar is a round box of `avatar.size` filled with the media color behind its content; an image a square
  /// of `image.size` with `image.shape` corners; either replaces the leading icon, and a monogram takes the headline
  /// style. With no media, the leading slot is not drawn.
  @Test("LST-20 avatar and image boxes, their fill, shape and the monogram's style")
  func media() throws {
    var custom = system
    custom.list.mediaContainerColor = .role(.error)
    let avatarCenter = CGPoint(x: Snapshot.inset + tokens.containerPaddingInlineStart + tokens.avatarSize / 2, y: Snapshot.inset + tokens.containerHeightOneLine / 2)
    let avatar = try Snapshot.render(
      TanreiListItem("Ada", leadingIcon: .image(Image(systemName: "star.fill")), leadingMedia: .avatar, leading: { EmptyView() }, trailing: { EmptyView() })
        .frame(width: fixtureWidth), theme: theme(custom))
    #expect(pixel(avatar, x: avatarCenter.x, y: avatarCenter.y).isClose(to: light[.error].rgba8()))
    // Round: the box's corner shows the surface.
    #expect(pixel(avatar, x: avatarCenter.x - tokens.avatarSize / 2 + 1, y: avatarCenter.y - tokens.avatarSize / 2 + 1).isClose(to: light[.surface].rgba8()))
    #expect(pixel(avatar, x: avatarCenter.x + tokens.avatarSize / 2 + 1, y: avatarCenter.y).isClose(to: light[.surface].rgba8()))
    let imageCenter = CGPoint(x: Snapshot.inset + tokens.containerPaddingInlineStart + tokens.imageSize / 2, y: Snapshot.inset + tokens.containerHeightOneLine / 2)
    let image = try Snapshot.render(TanreiListItem("Roadmap", leadingMedia: .image) { EmptyView() }.frame(width: fixtureWidth), theme: theme(custom))
    #expect(pixel(image, x: imageCenter.x - tokens.imageSize / 2 + 1, y: imageCenter.y).isClose(to: light[.error].rgba8()))
    #expect(pixel(image, x: imageCenter.x - tokens.imageSize / 2 + 0.5, y: imageCenter.y - tokens.imageSize / 2 + 0.5).isClose(to: light[.surface].rgba8(), tolerance: 60))
    // The monogram's font is the headline's.
    final class Probe: @unchecked Sendable {
      var font: Font?
    }
    struct Reader: View {
      let probe: Probe
      @Environment(\.font) private var font
      var body: some View {
        probe.font = font
        return Color.clear
      }
    }
    let probe = Probe()
    _ = try Snapshot.render(TanreiListItem("Ada", leadingMedia: .avatar) { Reader(probe: probe) }.frame(width: fixtureWidth))
    #expect(probe.font == tokens.headlineTypescale.resolved(policy: Snapshot.theme.fontFamilyPolicy, dynamicTypeSize: .large).font)
    // No media: the leading slot is not drawn.
    let plain = try Snapshot.renderExact(TanreiListItem("Ada", leading: { Rectangle() }, trailing: { EmptyView() }).frame(width: fixtureWidth))
    #expect(plain.mismatch(against: try Snapshot.renderExact(TanreiListItem("Ada").frame(width: fixtureWidth)), channelTolerance: 0) == 0)
    #expect(TanreiListRow(headline: "Ada", leadingIcon: "star", leadingMedia: .avatar).drawnLeadingIcon == nil)
  }

  /// LST-21 — every option reserves the mark's box, so texts line up; only a selected one draws the check.
  @Test("LST-21 the mark's box is reserved in every option; the check only while selected")
  func mark() throws {
    var custom = system
    custom.list.conditions.selected.enabled.markColor = .role(.error)
    custom.list.conditions.selected.enabled.containerColor = .none
    custom.list.conditions.unselected.enabled.markColor = .role(.error)
    let row = TanreiListRow(headline: "Light", trailingText: "Default")
    let selected = try Snapshot.render(chrome(row, condition: .selected, showsMark: true), theme: theme(custom))
    let unselected = try Snapshot.render(chrome(row, condition: .unselected, showsMark: true), theme: theme(custom))
    let plain = try Snapshot.render(chrome(row, condition: .unselected, showsMark: false), theme: theme(custom))
    let markBox = CGRect(x: Snapshot.inset + fixtureWidth - tokens.containerPaddingInlineEnd - tokens.markSize, y: Snapshot.inset + (tokens.containerHeightOneLine - tokens.markSize) / 2, width: tokens.markSize, height: tokens.markSize)
    func ink(_ bitmap: Bitmap, in rect: CGRect) -> Bool {
      stride(from: rect.minX, to: rect.maxX, by: 0.5).contains { x in stride(from: rect.minY, to: rect.maxY, by: 0.5).contains { pixel(bitmap, x: x, y: $0).isClose(to: light[.error].rgba8(), tolerance: 40) } }
    }
    #expect(ink(selected, in: markBox))
    #expect(!ink(unselected, in: markBox))
    // The trailing text moves by the reserved box and the gap in every option, selected or not.
    #expect(selected.mismatch(against: unselected, channelTolerance: 3) > 0)
    #expect(unselected.mismatch(against: plain, channelTolerance: 3) > 0)
  }

  /// LST-22 — the divider: `divider.thickness` in `divider.color` along the bottom, inside the height, from the start of
  /// the text column to the end edge; at full opacity under a disabled item; hidden from assistive technology.
  @Test("LST-22 the divider runs from the text's start to the end, at full strength even when disabled")
  func divider() throws {
    var custom = system
    custom.list.dividerColor = .role(.error)
    custom.list.dividerThickness = 2
    let icon = TanreiItemIcon.image(Image(systemName: "tray"))
    let row = TanreiListRow(headline: "Inbox", leadingIcon: icon, divider: true)
    let y = Snapshot.inset + tokens.containerHeightOneLine - 1
    let textStart = tokens.containerPaddingInlineStart + tokens.leadingIconSize + tokens.containerGap
    for bitmap in [try Snapshot.render(chrome(row), theme: theme(custom)), try Snapshot.render(chrome(row).disabled(true), theme: theme(custom))] {
      #expect(visualHeight(bitmap) == tokens.containerHeightOneLine)
      #expect(pixel(bitmap, x: Snapshot.inset + textStart + 1, y: y).isClose(to: light[.error].rgba8()))
      #expect(pixel(bitmap, x: Snapshot.inset + fixtureWidth - 1, y: y).isClose(to: light[.error].rgba8()))
      #expect(pixel(bitmap, x: Snapshot.inset + textStart - 1, y: y).isClose(to: light[.surface].rgba8()))
      #expect(pixel(bitmap, x: Snapshot.inset + textStart + 1, y: y - 2.5).isClose(to: light[.surface].rgba8()))
    }
  }

  /// LST-6 — rendered: the disabled opacity dims the whole item, its leading media included.
  @Test("LST-6 disabled dims the whole item, media included")
  func disabledRender() throws {
    var custom = system
    custom.list.disabled.opacity = 0.5
    custom.list.mediaContainerColor = .role(.error)
    let bitmap = try Snapshot.render(
      TanreiListItem("Ada", leadingMedia: .avatar, action: {}) { EmptyView() }.disabled(true).frame(width: fixtureWidth), theme: theme(custom))
    let center = CGPoint(x: Snapshot.inset + tokens.containerPaddingInlineStart + tokens.avatarSize / 2, y: Snapshot.inset + tokens.containerHeightOneLine / 2)
    #expect(pixel(bitmap, x: center.x, y: center.y).isClose(to: light[.error].opacity(0.5).rgba8(over: light[.surface])))
  }

  /// LST-11 — a static item draws no state: pressed, focused and disabled render as rest.
  @Test("LST-11 a static item renders at rest whatever its state")
  func staticIgnoresStates() throws {
    let rest = try Snapshot.renderExact(chrome(isActive: false))
    #expect(try Snapshot.renderExact(chrome(isActive: false, isPressed: true, isFocused: true)).mismatch(against: rest, channelTolerance: 0) == 0)
    #expect(try Snapshot.renderExact(chrome(isActive: false).disabled(true)).mismatch(against: rest, channelTolerance: 0) == 0)
  }

  /// LST-3 — rendered: the state paints the row; pressed wins over focused.
  @Test("LST-3 the state paints the row; pressed wins over focused")
  func stateContainer() throws {
    var custom = system
    custom.list.conditions.unselected.pressed.containerColor = .role(.error)
    custom.list.conditions.unselected.focused.containerColor = .role(.success)
    let point = CGPoint(x: Snapshot.inset + 4, y: Snapshot.inset + 4)
    #expect(pixel(try Snapshot.render(chrome(isPressed: true, isFocused: true), theme: theme(custom)), x: point.x, y: point.y).isClose(to: light[.error].rgba8()))
    #expect(pixel(try Snapshot.render(chrome(isFocused: true), theme: theme(custom)), x: point.x, y: point.y).isClose(to: light[.success].rgba8()))
  }

  /// LST-4 — the focus ring inside the row (a scrolling ancestor cannot clip it), never outside it, not for a static
  /// item, not dimmed; the row keeps its size.
  @Test("LST-4 the focus ring is drawn inside the row")
  func focusRing() throws {
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.containerShape, measure: system.measure)
    let inset = max(0, metrics.outerOutset)
    // The ring's outer edge is the row's edge: its outer stroke's centre line lies half its width inside.
    let ringX = Snapshot.inset + metrics.outerWidth / 2
    #expect(inset == metrics.outerOutset)
    let y = Snapshot.inset + tokens.containerHeightOneLine / 2
    let focused = try Snapshot.render(chrome(isFocused: true))
    #expect(pixel(focused, x: ringX, y: y).isClose(to: light[.focusRing].rgba8(), tolerance: 40))
    #expect(pixel(focused, x: Snapshot.inset - 1, y: y).isClose(to: light[.surface].rgba8()))
    #expect(visualHeight(focused) == tokens.containerHeightOneLine)
    #expect(!pixel(try Snapshot.render(chrome(isActive: false, isFocused: true)), x: ringX, y: y).isClose(to: light[.focusRing].rgba8(), tolerance: 40))
    var dim = system
    dim.list.focused.opacity = 0.3
    #expect(pixel(try Snapshot.render(chrome(isFocused: true), theme: theme(dim)), x: ringX, y: y).isClose(to: light[.focusRing].rgba8(), tolerance: 40))
  }

  /// LST-10 — the row's corners follow the corner smoothing (when a system rounds them); focus follows the focus style.
  @Test("LST-10 corner smoothing and focus style reach the item")
  func cornersAndFocusStyle() throws {
    func render(_ amount: Double, focused: Bool = false, style: TanreiFocusStyle = .ring) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      custom.list.containerShape = 16
      custom.list.conditions.unselected.enabled.containerColor = .role(.error)
      custom.behavior.focusStyle = style
      return try Snapshot.renderExact(chrome(isFocused: focused), theme: theme(custom))
    }
    let continuous = try render(0.6)
    #expect(try render(0).mismatch(against: continuous, channelTolerance: 0) > 0)
    #expect(try render(1).mismatch(against: continuous, channelTolerance: 0) == 0)
    #expect(try render(0.6, focused: true, style: .glow).mismatch(against: try render(0.6, focused: true, style: .ring), channelTolerance: 0) > 0)
  }

  /// "Text size does not clip an item: rows grow at 200% text size and the headline wraps."
  @Test("LST-17 the row grows with Dynamic Type")
  func dynamicType() throws {
    func render(_ size: DynamicTypeSize) throws -> Bitmap {
      try Snapshot.render(TanreiList { TanreiListItem("Inbox", supportingText: "12 new") }.frame(width: fixtureWidth).environment(\.dynamicTypeSize, size))
    }
    #expect(try render(.accessibility5).height >= (try render(.large)).height)
  }
}

// MARK: - Press (LST-8, LST-9)

@MainActor
@Suite("TanreiList press", .serialized)
struct TanreiListPressTests {
  private func distinct(_ feedback: TanreiPressedFeedback) -> TanreiSystem {
    var system = TanreiSystem.tanrei
    system.behavior.pressedFeedback = feedback
    system.list.conditions.unselected.pressed.containerColor = .role(.error)
    system.list.conditions.unselected.pressed.headlineColor = .role(.warning)
    system.list.conditions.unselected.focused.containerColor = .role(.success)
    system.list.pressed.opacity = 0.5
    return system
  }

  /// LST-9 — which tokens a press reads under each choice.
  @Test("LST-9 each choice binds the pressed tokens its own way", arguments: TanreiPressedFeedback.allCases)
  func bindings(feedback: TanreiPressedFeedback) {
    let tokens = distinct(feedback).list
    let unselected = tokens.conditions.unselected
    for beneath in [TanreiInteraction.enabled, .hovered, .focused] {
      let appearance = TanreiListItemAppearance(tokens: tokens, condition: .unselected, state: .pressed, feedback: feedback, beneath: beneath)
      switch feedback {
      case .overlay:
        #expect(appearance.container == unselected.pressed.containerColor && appearance.ripple == nil && appearance.headline == unselected.pressed.headlineColor)
      case .ripple:
        #expect(appearance.container == unselected[state: beneath].containerColor && appearance.ripple == unselected.pressed.containerColor)
        #expect(appearance.headline == unselected.pressed.headlineColor && appearance.opacity == tokens.pressed.opacity)
      case .dim:
        #expect(appearance.container == unselected[state: beneath].containerColor && appearance.ripple == nil && appearance.opacity == tokens.pressed.opacity)
      case .none:
        #expect(appearance == TanreiListItemAppearance(tokens: tokens, condition: .unselected, state: beneath))
      }
    }
  }

  /// LST-9 — rendered under a system that sets each value.
  @Test("LST-9 each choice renders as it says", arguments: TanreiPressedFeedback.allCases)
  func rendered(feedback: TanreiPressedFeedback) throws {
    let system = distinct(feedback)
    let colors = system.colors.light
    let actual = pixel(try Snapshot.render(chrome(isPressed: true), theme: theme(system)), x: Snapshot.inset + 4, y: Snapshot.inset + 4)
    switch feedback {
    case .overlay, .ripple: #expect(actual.isClose(to: colors[.error].opacity(0.5).rgba8(over: colors[.surface])))
    case .dim, .none: #expect(actual.isClose(to: colors[.surface].rgba8()))
    }
  }

  /// LST-9 — the shipped systems: m3-like ripples, cupertino dims, the default overlays.
  @Test("LST-9 m3-like ripples, cupertino dims, the default overlays")
  func shipped() {
    func pressed(_ system: TanreiSystem) -> TanreiListItemAppearance {
      TanreiListItemAppearance(tokens: system.list, condition: .unselected, state: .pressed, feedback: system.behavior.pressedFeedback)
    }
    #expect(pressed(.m3Like).ripple == TanreiSystem.m3Like.list.conditions.unselected.pressed.containerColor)
    #expect(pressed(.cupertino).ripple == nil && pressed(.cupertino).opacity < 1)
    #expect(pressed(.tanrei).ripple == nil)
  }

  #if os(macOS)
  /// LST-8 end to end: pressed at once, held for press-hold after a quick click, then at rest; one click (LST-1).
  @Test("LST-8 LST-1 a quick click shows the pressed state at once and keeps it for press-hold")
  func quickClickIsHeld() async throws {
    var system = TanreiSystem.tanrei
    system.motion.duration.pressHold = 1500
    system.list.motionStateDuration = 0
    system.list.conditions.unselected.pressed.containerColor = .role(.error)
    let colors = system.colors.light
    let counter = Counter()
    let hosted = HostedView(
      TanreiList { TanreiListItem("Wi-Fi", action: { counter.count += 1 }) }
        .frame(width: fixtureWidth).padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let point = CGPoint(x: Snapshot.inset + 4, y: Snapshot.inset + 4)
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.surface].rgba8()))
    hosted.mouse(.leftMouseDown, at: point)
    hosted.settle()
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    hosted.mouse(.leftMouseUp, at: point)
    hosted.settle()
    #expect(counter.count == 1)
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    #expect(await hosted.wait(atMost: 6) { hosted.color(at: point)?.isClose(to: colors[.error].rgba8()) == false })
  }

  /// LST-1 under `ripple`: watching the point of contact does not take the click away.
  @Test("LST-1 LST-9 a click still activates exactly once under ripple")
  func clickUnderRipple() {
    let counter = Counter()
    let hosted = HostedView(TanreiList { TanreiListItem("Wi-Fi", action: { counter.count += 1 }) }.frame(width: fixtureWidth).padding(Snapshot.inset).tanreiTheme(theme(.m3Like)))
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: hosted.size.height / 2))
    #expect(counter.count == 1)
  }
  #endif
}

// MARK: - Fixtures (one per spec fixture)

/// Draws a fixture of specs/list.spec.json as a product writes it: one list 360 wide holding the fixture's items in order;
/// the fixture's props apply to the list and each item's props to that item (LST-16 verify). A glyph name draws the SF
/// Symbol a product would pass for it (the icon font is not bundled), filled for a selected option as a product passes
/// it; an avatar holds the headline's first letter, an image nothing.
@MainActor
enum TanreiListFixtures {
  static let symbols: [String: String] = [
    "inbox": "tray", "star": "star", "send": "paperplane", "wifi": "wifi", "bluetooth": "antenna.radiowaves.left.and.right",
    "chevron_right": "chevron.right", "archive": "archivebox", "delete": "trash", "label": "tag",
  ]

  static func icon(_ name: String?, selected: Bool) -> TanreiItemIcon? {
    guard let name, !name.isEmpty else { return nil }
    guard let symbol = symbols[name] else { return TanreiItemIcon(name) }
    return .image(Image(systemName: selected && symbol != "chevron.right" ? "\(symbol).fill" : symbol))
  }

  static func item(_ spec: SpecItem, selectedValues: Set<String>, fire: @escaping @MainActor () -> Void = {}) -> AnyView {
    let headline = spec.string("headline") ?? ""
    let value = spec.string("value")
    let selected = value.map { selectedValues.contains($0) } ?? false
    let overline = spec.string("overline") ?? ""
    let supporting = spec.string("supportingText") ?? ""
    let limit = spec.number("supportingMaxLines").map { Int($0) }
    let trailingText = spec.string("trailingText") ?? ""
    let leadingIcon = icon(spec.string("leadingIcon"), selected: selected)
    let trailingIcon = icon(spec.string("trailingIcon"), selected: selected)
    let media = spec.string("leadingMedia").map { TanreiListLeadingMedia(named: $0) } ?? .none
    let divider = spec.bool("divider") ?? false
    let disabled = spec.bool("disabled") ?? false
    let monogram = String(headline.prefix(1))
    let view: AnyView
    if spec.bool("interactive") ?? false {
      if media == .none {
        view = AnyView(
          TanreiListItem(
            headline, overline: overline, supportingText: supporting, supportingLineLimit: limit, trailingText: trailingText, leadingIcon: leadingIcon,
            trailingIcon: trailingIcon, divider: divider, action: fire
          ).tag(value))
      } else {
        view = AnyView(
          TanreiListItem(
            headline, overline: overline, supportingText: supporting, supportingLineLimit: limit, trailingText: trailingText, trailingIcon: trailingIcon,
            leadingMedia: media, divider: divider, action: fire
          ) { if media == .avatar { Text(monogram) } }.tag(value))
      }
    } else if media == .none {
      view = AnyView(
        TanreiListItem(
          headline, overline: overline, supportingText: supporting, supportingLineLimit: limit, trailingText: trailingText, leadingIcon: leadingIcon,
          trailingIcon: trailingIcon, divider: divider
        ).tag(value))
    } else {
      view = AnyView(
        TanreiListItem(
          headline, overline: overline, supportingText: supporting, supportingLineLimit: limit, trailingText: trailingText, trailingIcon: trailingIcon,
          leadingMedia: media, divider: divider
        ) { if media == .avatar { Text(monogram) } }.tag(value))
    }
    return AnyView(view.disabled(disabled))
  }

  static func view(_ fixture: SpecFixture, fire: @escaping @MainActor () -> Void = {}) -> some View {
    let items = fixture.items ?? []
    let label = fixture.string("label") ?? ""
    let selection = fixture.string("selection") ?? "none"
    let selected: Set<String> =
      selection == "single" ? Set([fixture.string("value")].compactMap { $0 }) : selection == "multiple" ? Set(fixture.strings("values") ?? []) : []
    let rows = ForEach(items.indices, id: \.self) { index in item(items[index], selectedValues: selected, fire: fire) }
    return Group {
      switch selection {
      case "single": TanreiList(selection: .constant(fixture.string("value")), label: LocalizedStringKey(label)) { rows }
      case "multiple": TanreiList(selection: .constant(selected), label: LocalizedStringKey(label)) { rows }
      default: TanreiList(label: LocalizedStringKey(label)) { rows }
      }
    }
    .frame(width: fixtureWidth)
  }
}

@MainActor
@Suite("TanreiList snapshots")
struct TanreiListSnapshotTests {
  /// Mirrors `fixtures` in specs/list.spec.json.
  nonisolated static let fixtures = [
    "one-line", "leading-icon", "two-line-avatar", "three-line-image", "interactive", "dividers", "interactive-disabled", "single-selected",
    "multiple-selected", "selected-disabled", "unselected-disabled",
  ]

  static func fixture(_ id: String) throws -> SpecFixture {
    try #require(try SpecFixture.load(spec: "list").first { $0.id == id })
  }

  @Test("LST-16 fixture matches its baseline", arguments: fixtures)
  func fixture(_ id: String) throws {
    try Snapshot.assert(TanreiListFixtures.view(try Self.fixture(id)), named: id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    #expect(try SpecFixture.load(spec: "list").map(\.id) == Self.fixtures)
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiListTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiList preset snapshots")
struct TanreiListPresetSnapshotTests {
  /// Multiple-selected: it shows the preset's row heights, paddings, text styles, icons, fill and check of a selected
  /// option, and two-line rows.
  nonisolated static let fixtureId = "multiple-selected"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .m3ExpressiveLike, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiListSnapshotTests.fixtures.contains(Self.fixtureId))
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try TanreiListSnapshotTests.fixture(Self.fixtureId)
    try Snapshot.assert(TanreiListFixtures.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
