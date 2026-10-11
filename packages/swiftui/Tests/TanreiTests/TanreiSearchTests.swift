import SwiftUI
import Testing

@_spi(Fixtures) @testable import Tanrei

// Covers specs/search.spec.json. Each behavior id (SRC-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file.
//
// Three kinds of test:
// - Rules and appearances, pure: the state, the keys, the placement, and which token draws which part in each state.
// - Renders (`Snapshot.render`) for layout, colors and baselines. `ImageRenderer` cannot draw the platform's text element, so
//   renders set the internal `\.tanreiStaticTextInput` (the input's text drawn as text in the same style) — as the text
//   field's tests do. The open views are drawn in place (`.inPlace()`, SRC-7's and SRC-9's verify).
// - Hosted searches (macOS, `HostedView`) with real mouse and key events, for focus, typing, the keys, presses and the
//   events. The full-screen presentation (a full-screen cover on iOS) and the semantics are exercised by the gallery's UI
//   tests.

private let suiteName = "TanreiSearchTests"

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
private let tokens = TanreiSystem.tanrei.search

/// SRC-1's verify: a bar 328 wide in a 360 × 72 stage; SRC-7's: the docked search in a 360 × 320 stage, 16 from its top and
/// sides; SRC-9's: the full-screen view filling a 360 × 480 stage.
private enum Stage {
  static let width: CGFloat = 360
  static let barWidth: CGFloat = 328
  static let barHeight: CGFloat = 72
  static let dockedHeight: CGFloat = 320
  static let fullScreenHeight: CGFloat = 480
  static let inset: CGFloat = 16
}

/// The SF Symbols the fixtures' glyph names stand for, as a product would pass them (the icon font is not in the baselines).
private let symbols: [String: String] = [
  "history": "clock", "folder": "folder", "menu": "line.3.horizontal", "mic": "mic", "account_circle": "person.crop.circle",
]

private func itemIcon(_ glyph: String?) -> TanreiItemIcon? {
  guard let glyph, !glyph.isEmpty else { return nil }
  return .image(Image(systemName: symbols[glyph] ?? glyph))
}

/// An icon button of a slot as the spec fills one: a standard Tanrei icon button showing the glyph, labelled by its name.
@MainActor
private func slotButton(_ glyph: String) -> some View {
  TanreiIconButton(glyph, action: {}) { Image(systemName: symbols[glyph] ?? glyph) }
}

// MARK: - Fixtures

/// Draws a fixture of specs/search.spec.json: its props, its suggestions (the fixture's items) and its slots,
/// in its stage, the open views in place.
@MainActor
enum TanreiSearchFixtures {
  static func search(_ fixture: SpecFixture) -> some View {
    let leading = fixture.slot("leading")
    let trailing = fixture.slot("trailing")
    return TanreiSearch(
      fixture.string("label") ?? "", text: .constant(fixture.string("value") ?? ""), isExpanded: .constant(fixture.bool("expanded") ?? false),
      presentation: TanreiSearchPresentation(named: fixture.string("presentation") ?? "docked"),
      prompt: fixture.string("placeholder").map { Text(verbatim: $0) }, clearLabel: fixture.string("clearLabel") ?? "",
      backLabel: fixture.string("backLabel") ?? ""
    ) {
      ForEach(Array((fixture.items ?? []).enumerated()), id: \.offset) { _, item in
        TanreiSearchSuggestion(
          item.string("headline") ?? "", supportingText: item.string("supportingText") ?? "", leadingIcon: itemIcon(item.string("leadingIcon")),
          value: item.string("value") ?? "")
      }
    } leading: {
      // An unfilled slot is empty (an `if` without a match), so the search draws its glyph and its plain padding.
      if let glyph = leading.first { slotButton(glyph) }
    } trailing: {
      if !trailing.isEmpty { ForEach(trailing, id: \.self) { slotButton($0) } }
    }
    .inPlace()
    .disabled(fixture.bool("disabled") ?? false)
  }

  static func view(_ fixture: SpecFixture) -> some View {
    let presentation = fixture.string("presentation") ?? "docked"
    let expanded = fixture.bool("expanded") ?? false
    return Group {
      if expanded && presentation == "full-screen" {
        search(fixture)
          .frame(width: Stage.width, height: Stage.fullScreenHeight)
      } else if expanded {
        search(fixture)
          .frame(width: Stage.barWidth)
          .padding(.top, Stage.inset)
          .frame(width: Stage.width, height: Stage.dockedHeight, alignment: .top)
      } else {
        search(fixture)
          .frame(width: Stage.barWidth)
          .frame(width: Stage.width, height: Stage.barHeight)
      }
    }
    .environment(\.tanreiStaticTextInput, true)
  }
}

// MARK: - Hosted

/// Everything a hosted search reports, in order.
@MainActor
private final class Log {
  var events: [String] = []
  var inputs: [String] = []
}

private let suggestions = [("invoices", "invoices", ""), ("invoice template", "invoice template", ""), ("folder:invoices", "Invoices", "Folder · 24 messages")]

/// A search that owns its value and its expanded state in `@State`, as an app does, and logs every event.
private struct Host: View {
  let log: Log
  var presentation: TanreiSearchPresentation = .docked
  var system: TanreiSystem = .tanrei
  var withSuggestions = true
  @State private var text: String
  @State private var expanded = false

  init(log: Log, initial: String = "", presentation: TanreiSearchPresentation = .docked, system: TanreiSystem = .tanrei, withSuggestions: Bool = true) {
    self.log = log
    self.presentation = presentation
    self.system = system
    self.withSuggestions = withSuggestions
    _text = State(initialValue: initial)
  }

  var body: some View {
    let binding = Binding(
      get: { text },
      set: { value in
        text = value
        log.inputs.append(value)
        log.events.append("input \(value)")
      })
    VStack(spacing: .zero) {
      TanreiSearch(
        "Search mail", text: binding, isExpanded: $expanded, presentation: presentation, prompt: Text("Search mail"), clearLabel: "Clear search",
        backLabel: "Back", onSubmit: { log.events.append("submit \($0)") }, onSelect: { log.events.append("select \($0)") },
        onToggle: { expanded, reason in log.events.append("toggle \(expanded) \(reason?.rawValue ?? "-")") }
      ) {
        if withSuggestions {
          ForEach(suggestions, id: \.0) { TanreiSearchSuggestion($0.1, supportingText: $0.2, value: $0.0) }
        }
      }
      .frame(width: Stage.barWidth)
      // Room below for the docked view, and a place outside it.
      Color.clear.frame(width: Stage.barWidth, height: 240)
    }
    .padding(Snapshot.inset)
    .background(system.colors.light[.surface])
    .tanreiTheme(theme(system))
  }
}

#if os(macOS)
@MainActor
private func host(
  _ log: Log, initial: String = "", presentation: TanreiSearchPresentation = .docked, system: TanreiSystem = .tanrei, withSuggestions: Bool = true
) -> HostedView<Host> {
  let hosted = HostedView(Host(log: log, initial: initial, presentation: presentation, system: system, withSuggestions: withSuggestions))
  hosted.makeKey()
  return hosted
}

/// Key presses AppKit delivers: the function-key characters and their virtual key codes (the keyboard's layout, not design
/// values).
private enum Keys {
  static let down = (String(Character(UnicodeScalar(NSDownArrowFunctionKey)!)), UInt16(125))
  static let up = (String(Character(UnicodeScalar(NSUpArrowFunctionKey)!)), UInt16(126))
  static let left = (String(Character(UnicodeScalar(NSLeftArrowFunctionKey)!)), UInt16(123))
  static let escape = ("\u{1B}", UInt16(53))
  static let enter = ("\r", UInt16(36))
  static let tab = ("\t", UInt16(48))
}

extension HostedView {
  fileprivate func press(_ key: (String, UInt16)) {
    type(key.0, keyCode: key.1)
  }
}

/// The middle of the bar, in the hosted view.
@MainActor
private var barCenter: CGPoint { CGPoint(x: Snapshot.inset + Stage.barWidth / 2, y: Snapshot.inset + tokens.containerHeight / 2) }


/// The hosted window made last: `HostedView` places its windows far off-screen (and the test process has no key window).
@MainActor
private func hostedWindow() -> NSWindow? {
  NSApp.windows.filter { $0.isVisible && $0.frame.minX < -1_000 }.max { $0.windowNumber < $1.windowNumber }
}

/// Gives keyboard focus to the `index`-th AppKit text field of the hosted window, as a click into it does.
@MainActor
@discardableResult
private func focusField(_ index: Int) -> Bool {
  func fields(_ view: NSView) -> [NSTextField] {
    ((view as? NSTextField).map { $0.isEditable ? [$0] : [] } ?? []) + view.subviews.flatMap(fields)
  }
  guard let window = hostedWindow(), let content = window.contentView else { return false }
  let all = fields(content)
  guard all.indices.contains(index) else { return false }
  let focused = window.makeFirstResponder(all[index])
  RunLoop.main.run(until: Date().addingTimeInterval(0.05))
  return focused
}

/// A click at `point` (from the top-left of the hosted view) sent through the application, as the window server delivers
/// one — so that local event monitors see it (`HostedView.click` hands it to the window directly).
@MainActor
private func appClick<Content: View>(_ hosted: HostedView<Content>, at point: CGPoint) {
  guard let window = hostedWindow() else { return }
  for type in [NSEvent.EventType.leftMouseDown, .leftMouseUp] {
    guard
      let event = NSEvent.mouseEvent(
        with: type, location: CGPoint(x: point.x, y: hosted.size.height - point.y), modifierFlags: [], timestamp: ProcessInfo.processInfo.systemUptime,
        windowNumber: window.windowNumber, context: nil, eventNumber: 0, clickCount: 1, pressure: type == .leftMouseDown ? 1 : 0)
    else { continue }
    NSApp.sendEvent(event)
    hosted.settle()
  }
}

/// A hosted search followed by a second field, to move focus to.
private struct HostWithField: View {
  let log: Log
  @State private var text = "inv"
  @State private var expanded = false
  @State private var other = ""

  var body: some View {
    VStack(spacing: .zero) {
      TanreiSearch(
        "Search mail", text: $text, isExpanded: $expanded, clearLabel: "Clear search",
        onToggle: { expanded, reason in log.events.append("toggle \(expanded) \(reason?.rawValue ?? "-")") }
      ) {
        TanreiSearchSuggestion("invoices", value: "invoices")
      }
      .frame(width: Stage.barWidth)
      Color.clear.frame(width: Stage.barWidth, height: 120)
      TextField("Other", text: $other).frame(width: Stage.barWidth)
    }
    .padding(Snapshot.inset)
    .tanreiTheme(theme(.tanrei))
  }
}

@MainActor
@Suite("TanreiSearch hosted", .serialized)
struct TanreiSearchHostedTests {
  /// SRC-4 / TXF-1 — each change the person makes writes `text` once; SRC-5 — typing opens the view, once; focus alone
  /// (here given as a click into the field gives it) does not.
  @Test("SRC-4 SRC-5 typing emits input once per change and opens the view once; focus alone does not")
  func typing() {
    let log = Log()
    let hosted = host(log)
    hosted.focusTextField()
    #expect(log.events.isEmpty)
    hosted.type("in")
    #expect(log.events == ["input i", "toggle true -", "input in"])
  }

  /// SRC-4 / TXF-1 — two keys that arrive before the view updates are two changes, and write `text` twice (the text
  /// field emitted one input for "ab" typed into one update on a GitHub-hosted runner).
  @Test("SRC-4 keys that arrive together emit input once per change")
  func keysTogether() {
    let log = Log()
    let hosted = host(log)
    hosted.focusTextField()
    hosted.type("in", together: true)
    #expect(log.events == ["input i", "toggle true -", "input in"])
  }

  /// SRC-4 / TXF-1 — a value the product sets is shown and emits nothing.
  @Test("SRC-4 a value the product sets emits nothing")
  func productValue() {
    let log = Log()
    let hosted = host(log, initial: "invoice")
    hosted.focusTextField()
    hosted.settle()
    #expect(log.events.isEmpty)
  }

  /// SRC-5 — Down Arrow in the input opens the view.
  @Test("SRC-5 Down Arrow opens the view")
  func downOpens() {
    let log = Log()
    let hosted = host(log)
    hosted.focusTextField()
    hosted.press(Keys.down)
    #expect(log.events == ["toggle true -"])
  }

  /// SRC-5 — a press on the bar outside its buttons focuses the input and opens the view (typing then edits); SRC-22 — the bar's
  /// hit area reaches the minimum target above it.
  @Test("SRC-5 SRC-22 a press on the bar focuses the input and opens the view; the hit area reaches the minimum target")
  func pressOpens() {
    let log = Log()
    let hosted = host(log)
    hosted.click(at: CGPoint(x: barCenter.x, y: barCenter.y))
    #expect(log.events == ["toggle true -"])
    hosted.type("a")
    #expect(log.events == ["toggle true -", "input a"])
    let other = Log()
    let second = host(other)
    let reach = (TanreiHitTarget.minimum(in: TanreiSystem.tanrei.measure) - tokens.containerHeight) / 2
    second.click(at: CGPoint(x: barCenter.x, y: Snapshot.inset - reach / 2))
    #expect(other.events == ["toggle true -"])
  }

  /// SRC-6 — Escape closes the open view (the value stays); SRC-12 — collapsed, Escape empties the value, input once.
  @Test("SRC-6 SRC-12 Escape closes the open view, then empties the value")
  func escape() {
    let log = Log()
    let hosted = host(log, initial: "inv")
    hosted.focusTextField()
    hosted.press(Keys.down)
    hosted.press(Keys.escape)
    #expect(log.events == ["toggle true -", "toggle false escape"])
    hosted.press(Keys.escape)
    #expect(log.events == ["toggle true -", "toggle false escape", "input "])
    // SRC-12: empty, Escape does nothing.
    hosted.press(Keys.escape)
    #expect(log.events.count == 3)
  }

  /// SRC-14 — Down Arrow makes the next suggestion active (the first while none is), staying on the last; Up Arrow the previous,
  /// none from the first; SRC-15 — Enter chooses the active one: select, then toggle; the value is not changed.
  @Test("SRC-14 SRC-15 the arrows move the active suggestion; Enter chooses it, then closes")
  func arrows() {
    let log = Log()
    let hosted = host(log, initial: "inv")
    hosted.focusTextField()
    hosted.press(Keys.down)
    hosted.press(Keys.down)
    hosted.press(Keys.down)
    hosted.press(Keys.enter)
    #expect(log.events == ["toggle true -", "select invoice template", "toggle false select"])
    // Staying on the last.
    hosted.press(Keys.down)
    for _ in 0..<5 { hosted.press(Keys.down) }
    hosted.press(Keys.enter)
    #expect(Array(log.events.suffix(2)) == ["select folder:invoices", "toggle false select"])
    #expect(log.inputs.isEmpty)
  }

  /// SRC-14 — Up Arrow on the first leaves none active; typing and moving the caret leave none active; SRC-13 — Enter with none
  /// active submits the value, then closes: toggle follows submit.
  @Test("SRC-13 SRC-14 with none active Enter submits, then closes")
  func submit() {
    let log = Log()
    let hosted = host(log, initial: "inv")
    hosted.focusTextField()
    hosted.press(Keys.down)
    hosted.press(Keys.down)
    hosted.press(Keys.up)
    hosted.press(Keys.enter)
    #expect(log.events == ["toggle true -", "submit inv", "toggle false submit"])
    hosted.press(Keys.down)
    hosted.press(Keys.down)
    hosted.press(Keys.left)
    hosted.press(Keys.enter)
    #expect(Array(log.events.suffix(2)) == ["submit inv", "toggle false submit"])
    hosted.press(Keys.down)
    hosted.press(Keys.down)
    // (AppKit selected the whole value when the field took focus: typing replaces it.)
    hosted.type("o")
    hosted.press(Keys.enter)
    #expect(Array(log.events.suffix(3)) == ["input o", "submit o", "toggle false submit"])
    // Collapsed, Enter submits alone.
    hosted.press(Keys.enter)
    #expect(log.events.last == "submit o")
  }

  /// SRC-6 — Tab closes the docked view, reason tab.
  @Test("SRC-6 Tab closes the docked view")
  func tab() {
    let log = Log()
    let hosted = host(log, initial: "inv")
    hosted.focusTextField()
    hosted.press(Keys.down)
    hosted.press(Keys.tab)
    #expect(log.events == ["toggle true -", "toggle false tab"])
  }

  /// SRC-6 — focus moving out of the search closes the docked view, reason focus-out.
  @Test("SRC-6 focus moving out closes the docked view")
  func focusOut() async {
    let log = Log()
    let hosted = HostedView(HostWithField(log: log))
    hosted.makeKey()
    focusField(0)
    hosted.press(Keys.down)
    focusField(1)
    #expect(await hosted.wait(atMost: 2) { log.events.count == 2 })
    #expect(log.events == ["toggle true -", "toggle false focus-out"])
  }

  /// SRC-6 — a press outside the bar and the view closes it, reason outside; SRC-8 — a press on the view does not take focus
  /// from the input; SRC-15 — a click on a suggestion: select, then toggle.
  @Test("SRC-6 SRC-8 SRC-15 a click outside closes; a click on a suggestion chooses it and focus stays in the input")
  func pointer() {
    let log = Log()
    let hosted = host(log, initial: "inv")
    hosted.focusTextField()
    hosted.press(Keys.down)
    appClick(hosted, at: CGPoint(x: barCenter.x, y: hosted.size.height - Snapshot.inset - 8))
    #expect(log.events == ["toggle true -", "toggle false outside"])
    hosted.press(Keys.down)
    let firstRow = Snapshot.inset + tokens.containerHeight + tokens.viewOffset + tokens.viewPaddingBlock + tokens.suggestionContainerHeight / 2
    hosted.click(at: CGPoint(x: barCenter.x, y: firstRow))
    #expect(Array(log.events.suffix(2)) == ["select invoices", "toggle false select"])
    // Focus stayed in the input: typing edits the value (AppKit selected all of it when the field took focus) and opens the view
    // again.
    hosted.type("o")
    #expect(Array(log.events.suffix(2)) == ["input o", "toggle true -"])
  }

  /// SRC-10 — the clear button empties the value, input once, opens and closes nothing, and focus stays in the input.
  @Test("SRC-10 the clear button empties the value and keeps focus")
  func clear() {
    let log = Log()
    let hosted = host(log, initial: "inv")
    hosted.focusTextField()
    let small = TanreiSystem.tanrei.iconButton.sizes.small.containerSize
    hosted.click(at: CGPoint(x: Snapshot.inset + Stage.barWidth - tokens.containerPaddingInlineWithButton - small / 2, y: barCenter.y))
    #expect(log.events == ["input "])
    hosted.type("x")
    #expect(log.events == ["input ", "input x", "toggle true -"])
  }

  /// SRC-26 — disabled: not focusable or editable, no view, no events.
  @Test("SRC-26 a disabled search emits nothing")
  func disabled() {
    let log = Log()
    let hosted = HostedView(Host(log: log, initial: "inv").disabled(true))
    hosted.makeKey()
    hosted.focusTextField()
    hosted.type("x")
    hosted.press(Keys.down)
    hosted.click(at: barCenter)
    #expect(log.events.isEmpty)
  }

  /// SRC-19 — a quick click on the bar shows its pressed state at once and keeps it after the release (press-hold).
  @Test("SRC-19 a quick click on the bar shows the pressed state at once and keeps it")
  func pressHeld() throws {
    var system = TanreiSystem.tanrei
    system.motion.duration.pressHold = 1500
    system.search.motionStateDuration = 0
    system.search.conditions.standard.pressed.containerColor = .role(.error)
    let colors = system.colors.light
    let log = Log()
    let hosted = host(log, system: system, withSuggestions: false)
    let point = CGPoint(x: Snapshot.inset + Stage.barWidth - tokens.containerPaddingInline / 2, y: barCenter.y)
    hosted.hover(at: point)
    hosted.mouse(.leftMouseDown, at: point)
    hosted.settle()
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    hosted.mouse(.leftMouseUp, at: point)
    hosted.settle()
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
  }

  /// SRC-18 — focus gained by pointer selects the focused state: the focused outline (thicker, the focus-ring color) inside
  /// the bar's edge, the container at rest; SRC-21 — under `glow`, the glow around the bar too.
  @Test("SRC-18 SRC-21 focus by pointer shows the focused edge; under glow, a glow around the bar")
  func focusedEdge() throws {
    var system = TanreiSystem.tanrei
    system.search.motionStateDuration = 0
    let colors = system.colors.light
    let log = Log()
    let hosted = host(log, system: system, withSuggestions: false)
    let edge = CGPoint(x: barCenter.x, y: Snapshot.inset + 0.5)
    #expect(try #require(hosted.color(at: CGPoint(x: barCenter.x, y: Snapshot.inset + 1.5))).isClose(to: colors[.surfaceContainerHighest].rgba8()))
    hosted.focusTextField()
    hosted.settle(0.2)
    #expect(try #require(hosted.color(at: edge)).isClose(to: colors[.focusRing].rgba8(), tolerance: 24))
    #expect(try #require(hosted.color(at: CGPoint(x: barCenter.x, y: Snapshot.inset + tokens.focused.outlineWidth + 1.5)))
      .isClose(to: colors[.surfaceContainerHighest].rgba8()))
    // Outside the bar: nothing under `ring`; the glow under `glow`.
    let outside = CGPoint(x: barCenter.x, y: Snapshot.inset - 2)
    #expect(try #require(hosted.color(at: outside)).isClose(to: colors[.surface].rgba8()))
    system.behavior.focusStyle = .glow
    let glowing = host(Log(), system: system, withSuggestions: false)
    glowing.focusTextField()
    glowing.settle(0.2)
    #expect(try !#require(glowing.color(at: outside)).isClose(to: colors[.surface].rgba8()))
  }
}
#endif

// MARK: - Rules

@Suite("TanreiSearch rules")
struct TanreiSearchRulesTests {
  /// SRC-14 — Down: the next, the first while none, staying on the last; Up: the previous, none from the first.
  @Test("SRC-14 the active suggestion moves and stops")
  func active() {
    #expect(TanreiSearchRules.next(after: nil, count: 3) == 0)
    #expect(TanreiSearchRules.next(after: 0, count: 3) == 1)
    #expect(TanreiSearchRules.next(after: 2, count: 3) == 2)
    #expect(TanreiSearchRules.next(after: nil, count: 0) == nil)
    #expect(TanreiSearchRules.previous(before: 2, count: 3) == 1)
    #expect(TanreiSearchRules.previous(before: 0, count: 3) == nil)
    #expect(TanreiSearchRules.previous(before: nil, count: 3) == nil)
  }

  /// SRC-6 / SRC-12 — Escape closes while expanded; collapsed it empties a value, or passes on.
  @Test("SRC-6 SRC-12 what Escape does")
  func escape() {
    #expect(TanreiSearchRules.escape(isExpanded: true, value: "inv") == .close)
    #expect(TanreiSearchRules.escape(isExpanded: true, value: "") == .close)
    #expect(TanreiSearchRules.escape(isExpanded: false, value: "inv") == .clear)
    #expect(TanreiSearchRules.escape(isExpanded: false, value: "") == .pass)
  }

  /// SRC-13 / SRC-15 — Enter chooses the active suggestion, else submits.
  @Test("SRC-13 SRC-15 what Enter does")
  func enter() {
    #expect(TanreiSearchRules.enter(active: 1, count: 3) == .select(1))
    #expect(TanreiSearchRules.enter(active: nil, count: 3) == .submit)
    #expect(TanreiSearchRules.enter(active: 3, count: 3) == .submit)
  }

  /// SRC-10 / SRC-26 — the clear button shows with a value, never while disabled; SRC-7 — the docked view needs content and
  /// shows nothing (while staying expanded) without it; never while disabled.
  @Test("SRC-7 SRC-10 SRC-26 when the clear button and the docked view show")
  func visibility() {
    #expect(TanreiSearchRules.showsClear(value: "inv", isEnabled: true))
    #expect(!TanreiSearchRules.showsClear(value: "", isEnabled: true))
    #expect(!TanreiSearchRules.showsClear(value: "inv", isEnabled: false))
    #expect(TanreiSearchRules.showsDockedView(isExpanded: true, isEnabled: true, hasSuggestions: true, hasContent: false))
    #expect(TanreiSearchRules.showsDockedView(isExpanded: true, isEnabled: true, hasSuggestions: false, hasContent: true))
    #expect(!TanreiSearchRules.showsDockedView(isExpanded: true, isEnabled: true, hasSuggestions: false, hasContent: false))
    #expect(!TanreiSearchRules.showsDockedView(isExpanded: false, isEnabled: true, hasSuggestions: true, hasContent: true))
    #expect(!TanreiSearchRules.showsDockedView(isExpanded: true, isEnabled: false, hasSuggestions: true, hasContent: true))
  }

  /// SRC-18 — pressed over focused over hovered, disabled over all; SRC-17 — for a suggestion, active is the focused state.
  @Test("SRC-17 SRC-18 the states")
  func states() {
    #expect(TanreiSearchRules.barState(isEnabled: true, isPressed: true, isFocused: true, isHovered: true) == .pressed)
    #expect(TanreiSearchRules.barState(isEnabled: true, isPressed: false, isFocused: true, isHovered: true) == .focused)
    #expect(TanreiSearchRules.barState(isEnabled: true, isPressed: false, isFocused: false, isHovered: true) == .hovered)
    #expect(TanreiSearchRules.barState(isEnabled: false, isPressed: true, isFocused: true, isHovered: true) == .disabled)
    #expect(TanreiSearchRules.suggestionState(isEnabled: true, isPressed: false, isActive: true, isHovered: true) == .focused)
    #expect(TanreiSearchRules.suggestionState(isEnabled: true, isPressed: true, isActive: true, isHovered: false) == .pressed)
    #expect(TanreiSearchRules.suggestionState(isEnabled: true, isPressed: false, isActive: false, isHovered: true) == .hovered)
  }

  /// SRC-1 — the paddings: the glyph at padding-inline, an icon button at padding-inline-with-button; the end likewise.
  @Test("SRC-1 the bar's paddings")
  func paddings() {
    #expect(TanreiSearchRules.leadingPadding(hasLeadingButton: false, tokens: tokens) == tokens.containerPaddingInline)
    #expect(TanreiSearchRules.leadingPadding(hasLeadingButton: true, tokens: tokens) == tokens.containerPaddingInlineWithButton)
    #expect(TanreiSearchRules.trailingPadding(endsWithButton: false, tokens: tokens) == tokens.containerPaddingInline)
    #expect(TanreiSearchRules.trailingPadding(endsWithButton: true, tokens: tokens) == tokens.containerPaddingInlineWithButton)
  }

  /// SRC-7 — below the bar, limited to the room left (the keyboard taken off the window); above it when the room below is less
  /// than the view needs and the room above is more.
  @Test("SRC-7 where the docked view goes and how tall it may be")
  func placement() {
    let bar = CGRect(x: 16, y: 100, width: 328, height: 40)
    let offset = tokens.viewOffset
    let margin = tokens.viewViewportMargin
    let below = TanreiSearchRoom(bar: bar, window: 800, keyboardTop: nil, view: 200).placement(offset: offset, margin: margin)
    #expect(below == .init(below: true, height: 800 - 140 - offset - margin))
    let keyboard = TanreiSearchRoom(bar: bar, window: 800, keyboardTop: 400, view: 200).placement(offset: offset, margin: margin)
    #expect(keyboard == .init(below: true, height: 400 - 140 - offset - margin))
    let low = CGRect(x: 16, y: 600, width: 328, height: 40)
    let above = TanreiSearchRoom(bar: low, window: 800, keyboardTop: nil, view: 300).placement(offset: offset, margin: margin)
    #expect(above == .init(below: false, height: 600 - offset - margin))
    #expect(TanreiSearchRoom(bar: bar, window: .zero, keyboardTop: nil, view: 200).placement(offset: offset, margin: margin) == .init(below: true, height: nil))
  }

  /// SRC-27 — an empty label, suggestion values that are empty or repeat, an empty headline; SRC-10 / SRC-11 — the clear and
  /// back buttons without a name; an unknown presentation is docked. All reported, none stops the search drawing.
  @Test("SRC-10 SRC-11 SRC-27 what a search reports")
  func problems() {
    let entries = [
      TanreiSearchEntry(value: "a", headline: "A", supportingText: "", leadingIcon: nil),
      TanreiSearchEntry(value: "a", headline: "A again", supportingText: "", leadingIcon: nil),
      TanreiSearchEntry(value: "", headline: " ", supportingText: "", leadingIcon: nil),
    ]
    let problems = TanreiSearchRules.problems(label: "", entries: entries, showsClear: true, clearLabel: "", drawsBack: true, backLabel: "")
    #expect(problems.count == 6)
    #expect(problems.contains { $0.contains("SRC-10") } && problems.contains { $0.contains("SRC-11") })
    #expect(TanreiSearchRules.problems(label: "Search", entries: [], showsClear: false, clearLabel: "", drawsBack: false, backLabel: "").isEmpty)
    let (presentation, reports) = Reports.collecting { TanreiSearchPresentation(named: "sheet") }
    #expect(presentation == .docked && reports.mention("SRC-27"))
    #expect(TanreiSearchPresentation(named: "full-screen") == .fullScreen)
  }

  /// SRC-24 — a suggestion's position in the list.
  @Test("SRC-24 the position text")
  func position() {
    #expect(TanreiSearchRules.positionText(index: 0, count: 3) == "1 of 3")
  }
}

// MARK: - Token bindings

@Suite("TanreiSearch appearance")
struct TanreiSearchAppearanceTests {
  private func bar(_ state: TanreiInteraction, feedback: TanreiPressedFeedback = .overlay, beneath: TanreiInteraction = .enabled, tokens: TanreiSearchTokens = tokens)
    -> TanreiSearchBarAppearance
  {
    TanreiSearchBarAppearance(tokens: tokens, selection: TanreiSystem.tanrei.textField.selectionColor, state: state, feedback: feedback, beneath: beneath)
  }

  /// SRC-1 / SRC-2 / SRC-3 — at rest: the filled bar, no edge, the glyph, the input, the placeholder and the caret in their
  /// roles, the selection in the text field's selection color.
  @Test("SRC-1 SRC-2 SRC-3 at rest the bar binds the expected roles")
  func rest() {
    let a = bar(.enabled)
    #expect(a.container == .role(.surfaceContainerHighest))
    #expect(a.ripple == nil)
    #expect(a.outline == .none)
    #expect(a.outlineWidth == tokens.outlineWidth)
    #expect(a.leadingIcon == .role(.onSurfaceVariant))
    #expect(a.input == .role(.onSurface))
    #expect(a.placeholder == .role(.onSurfaceVariant))
    #expect(a.caret == .role(.primary))
    #expect(a.selection == TanreiSystem.tanrei.textField.selectionColor)
    #expect(a.opacity == 1)
    #expect(a.cornerRadius == tokens.containerShape)
  }

  /// SRC-18's verify — focused: the outline is thicker and takes the focus-ring color, the container stays at rest.
  @Test("SRC-18 focused thickens and recolors the edge; the container stays at rest")
  func focused() {
    let a = bar(.focused)
    #expect(a.outline == .role(.focusRing))
    #expect(a.outlineWidth > bar(.enabled).outlineWidth)
    #expect(a.container == bar(.enabled).container)
    #expect(bar(.hovered).container != bar(.enabled).container)
  }

  /// SRC-20 — overlay: the pressed tokens at once; ripple: the container beneath, the pressed container as the ripple; dim: the
  /// container beneath, the pressed opacity; none: the state beneath.
  @Test("SRC-20 which state draws which layer under each pressed feedback")
  func feedback() {
    var t = tokens
    t.pressed.opacity = 0.5
    let pressed = t.conditions.standard.pressed
    let overlay = bar(.pressed, feedback: .overlay, beneath: .hovered, tokens: t)
    #expect(overlay.container == pressed.containerColor && overlay.ripple == nil && overlay.opacity == 0.5)
    let ripple = bar(.pressed, feedback: .ripple, beneath: .hovered, tokens: t)
    #expect(ripple.container == t.conditions.standard.hovered.containerColor && ripple.ripple == pressed.containerColor && ripple.opacity == 0.5)
    let dim = bar(.pressed, feedback: .dim, beneath: .focused, tokens: t)
    #expect(dim.container == t.conditions.standard.focused.containerColor && dim.ripple == nil && dim.opacity == 0.5)
    #expect(dim.outline == pressed.outlineColor)
    let none = bar(.pressed, feedback: .none, beneath: .focused, tokens: t)
    #expect(none == bar(.focused, tokens: t))
    let row = TanreiSearchSuggestionAppearance(tokens: t, state: .pressed, feedback: .ripple, beneath: .focused)
    #expect(row.container == t.conditions.standard.focused.suggestionContainerColor && row.ripple == pressed.suggestionContainerColor)
  }

  /// SRC-26 — disabled: container, outline, glyph, input, placeholder and opacity from the disabled tokens.
  @Test("SRC-26 disabled bindings")
  func disabled() {
    let a = bar(.disabled)
    let d = tokens.conditions.standard.disabled
    #expect(a.container == d.containerColor && a.outline == d.outlineColor && a.leadingIcon == d.leadingIconColor)
    #expect(a.input == d.inputColor && a.placeholder == d.placeholderColor && a.opacity == tokens.disabled.opacity)
  }

  /// SRC-17 — a suggestion's parts in each state; the active one takes the focused tokens.
  @Test("SRC-17 a suggestion's parts in each state", arguments: [TanreiInteraction.enabled, .hovered, .focused, .pressed])
  func suggestion(_ state: TanreiInteraction) {
    let a = TanreiSearchSuggestionAppearance(tokens: tokens, state: state)
    let own = tokens.conditions.standard[state: state]
    #expect(a.container == own.suggestionContainerColor)
    #expect(a.leadingIcon == own.suggestionLeadingIconColor)
    #expect(a.headline == own.suggestionHeadlineColor)
    #expect(a.supportingText == own.suggestionSupportingTextColor)
    #expect(a.cornerRadius == tokens.suggestionContainerShape)
  }

  /// SRC-18 / SRC-20 / SRC-23 — the state, ripple, open and close motions come from the tokens; none under Reduce Motion.
  @Test("SRC-18 SRC-20 SRC-23 the motions come from the tokens; none under Reduce Motion")
  func motion() {
    #expect(tokens.stateMotion(reduceMotion: false) == TanreiMotion.animation(durationMs: tokens.motionStateDuration, easing: tokens.motionStateEasing, reduceMotion: false))
    #expect(tokens.rippleGrowth(reduceMotion: false) == TanreiMotion.animation(durationMs: tokens.motionFeedbackDuration, easing: tokens.motionStateEasing, reduceMotion: false))
    #expect(tokens.openMotion(reduceMotion: false) == TanreiMotion.animation(durationMs: tokens.motionOpenDuration, easing: tokens.motionOpenEasing, reduceMotion: false))
    #expect(tokens.closeMotion(reduceMotion: false) == TanreiMotion.animation(durationMs: tokens.motionCloseDuration, easing: tokens.motionCloseEasing, reduceMotion: false))
    #expect(tokens.stateMotion(reduceMotion: true) == nil && tokens.rippleGrowth(reduceMotion: true) == nil)
    #expect(tokens.openMotion(reduceMotion: true) == nil && tokens.closeMotion(reduceMotion: true) == nil)
  }

  /// A condition this system does not have draws the standard one's tokens, reported.
  @Test("SRC-27 an unknown condition reads the standard tokens, reported")
  func unknownCondition() {
    let (a, reports) = Reports.collecting {
      TanreiSearchBarAppearance(tokens: tokens, selection: .none, state: .enabled, condition: TanreiSearchCondition(rawValue: "loud"))
    }
    #expect(a.container == tokens.conditions.standard.enabled.containerColor)
    #expect(reports.mention("loud"))
  }
}

// MARK: - Rendered

/// Bar fixture props, as a spec fixture would give them.
@MainActor
private func barView(
  value: String = "", disabled: Bool = false, system: TanreiSystem = .tanrei, direction: LayoutDirection = .leftToRight,
  @ViewBuilder leading: () -> some View = { EmptyView() }
) -> some View {
  TanreiSearch("Search mail", text: .constant(value), isExpanded: .constant(false), prompt: Text("Search mail"), clearLabel: "Clear search") {
    EmptyView()
  } leading: {
    leading()
  } trailing: {
    EmptyView()
  }
  .disabled(disabled)
  .frame(width: Stage.barWidth)
  .frame(width: Stage.width, height: Stage.barHeight)
  .environment(\.tanreiStaticTextInput, true)
  .environment(\.layoutDirection, direction)
}

/// The x of the first (or last) pixel of the bar's middle row close to `color`, in points of the stage.
@MainActor
private func ink(_ bitmap: Bitmap, _ color: Bitmap.RGBA, y: CGFloat, from: CGFloat, to: CGFloat, last: Bool = false, tolerance: Int = 40) -> CGFloat? {
  let xs = stride(from: from, to: to, by: 0.5).filter { pixel(bitmap, x: Snapshot.inset + $0, y: Snapshot.inset + y).isClose(to: color, tolerance: tolerance) }
  return last ? xs.last : xs.first
}

@MainActor
@Suite("TanreiSearch rendered")
struct TanreiSearchRenderedTests {
  private let barTop = (Stage.barHeight - tokens.containerHeight) / 2
  private let barStart = (Stage.width - Stage.barWidth) / 2

  /// SRC-1 — the bar as wide as it is given and the container height, filled, its row vertically centred; the glyph
  /// padding-inline from the start edge; right to left, mirrored.
  @Test("SRC-1 SRC-2 the bar's size, fill and glyph, mirrored right to left")
  func geometry() throws {
    var system = TanreiSystem.tanrei
    system.search.conditions.standard.enabled.leadingIconColor = .role(.error)
    let bitmap = try Snapshot.render(barView(system: system), theme: theme(system))
    let fill = light[.surfaceContainerHighest].rgba8()
    let column = barStart + Stage.barWidth / 2
    let ys = stride(from: CGFloat.zero, to: Stage.barHeight, by: 0.5).filter { pixel(bitmap, x: Snapshot.inset + column, y: Snapshot.inset + $0).isClose(to: fill, tolerance: 2) }
    let (top, bottom) = (try #require(ys.first), try #require(ys.last))
    #expect(top == barTop && bottom + 0.5 == barTop + tokens.containerHeight)
    let row = barTop + tokens.containerHeight / 2
    let xs = stride(from: CGFloat.zero, to: Stage.width, by: 0.5).filter { pixel(bitmap, x: Snapshot.inset + $0, y: Snapshot.inset + row).isClose(to: fill, tolerance: 2) }
    let (start, end) = (try #require(xs.first), try #require(xs.last))
    #expect(start == barStart && end + 0.5 == barStart + Stage.barWidth)
    // SRC-2: the glyph in its color, in its box.
    let error = light[.error].rgba8()
    let glyphStart = barStart + tokens.containerPaddingInline
    let first = try #require(ink(bitmap, error, y: row, from: barStart, to: barStart + Stage.barWidth / 2))
    #expect(first >= glyphStart && first < glyphStart + tokens.leadingIconSize)
    let mirrored = try Snapshot.render(barView(system: system, direction: .rightToLeft), theme: theme(system))
    let last = try #require(ink(mirrored, error, y: row, from: barStart + Stage.barWidth / 2, to: barStart + Stage.barWidth, last: true))
    #expect(last < barStart + Stage.barWidth - tokens.containerPaddingInline && last >= barStart + Stage.barWidth - tokens.containerPaddingInline - tokens.leadingIconSize)
  }

  /// SRC-2 — the magnifier does not mirror; SRC-11 — the back arrow does.
  @Test("SRC-2 SRC-11 the search glyph keeps its direction; the back arrow mirrors right to left")
  func glyphDirection() throws {
    func render(_ kind: TanreiSearchGlyph.Kind, _ direction: LayoutDirection) throws -> Bitmap {
      try Snapshot.renderExact(TanreiSearchGlyph(kind: kind).environment(\.layoutDirection, direction))
    }
    #expect(try render(.search, .leftToRight).pixels == render(.search, .rightToLeft).pixels)
    #expect(try render(.back, .leftToRight).pixels != render(.back, .rightToLeft).pixels)
  }

  /// SRC-3 — the placeholder in its color while empty; the value in the input color.
  @Test("SRC-3 the placeholder and the value in their colors")
  func text() throws {
    var system = TanreiSystem.tanrei
    system.search.conditions.standard.enabled.placeholderColor = .role(.error)
    system.search.conditions.standard.enabled.inputColor = .role(.success)
    let row = barTop + tokens.containerHeight / 2
    let inputStart = barStart + tokens.containerPaddingInline + tokens.leadingIconSize + tokens.containerGap
    let empty = try Snapshot.render(barView(system: system), theme: theme(system))
    #expect(ink(empty, light[.error].rgba8(), y: row, from: inputStart, to: inputStart + 100) != nil)
    let filled = try Snapshot.render(barView(value: "invoice", system: system), theme: theme(system))
    #expect(ink(filled, light[.error].rgba8(), y: row, from: inputStart, to: inputStart + 100) == nil)
    #expect(ink(filled, light[.success].rgba8(), y: row, from: inputStart, to: inputStart + 100) != nil)
  }

  /// SRC-10 — with a value, the clear button at the end, padding-inline-with-button from the end edge; SRC-26 — none while
  /// disabled, and the disabled tokens draw the bar.
  @Test("SRC-10 SRC-26 the clear button shows with a value, never while disabled")
  func clearButton() throws {
    var system = TanreiSystem.tanrei
    system.iconButton.variants.standard.enabled.iconColor = .role(.error)
    system.search.conditions.standard.disabled.leadingIconColor = .role(.success)
    let row = barTop + tokens.containerHeight / 2
    let small = system.iconButton.sizes.small.containerSize
    let end = barStart + Stage.barWidth - tokens.containerPaddingInlineWithButton
    let shown = try Snapshot.render(barView(value: "invoice", system: system), theme: theme(system))
    let x = try #require(ink(shown, light[.error].rgba8(), y: row, from: end - small, to: end))
    #expect(x > end - small)
    let disabled = try Snapshot.render(barView(value: "invoice", disabled: true, system: system), theme: theme(system))
    #expect(ink(disabled, light[.error].rgba8(), y: row, from: end - small, to: end) == nil)
    #expect(ink(disabled, light[.success].rgba8(), y: row, from: barStart, to: barStart + 48) != nil)
  }

  /// SRC-25 — the leading slot's icon button takes the glyph's place, padding-inline-with-button from the start, from its own
  /// tokens.
  @Test("SRC-25 the leading slot replaces the glyph")
  func leadingSlot() throws {
    var system = TanreiSystem.tanrei
    system.iconButton.variants.standard.enabled.iconColor = .role(.error)
    let bitmap = try Snapshot.render(
      barView(system: system) { TanreiIconButton("Menu", action: {}) { Rectangle() } }, theme: theme(system))
    let row = barTop + tokens.containerHeight / 2
    let medium = system.iconButton.sizes.medium
    let start = barStart + tokens.containerPaddingInlineWithButton + (medium.containerSize - medium.iconSize) / 2
    let first = try #require(ink(bitmap, light[.error].rgba8(), y: row, from: barStart, to: barStart + 60, tolerance: 4))
    #expect(abs(first - start) <= 0.5)
  }

  /// SRC-25, SRC-2 — a leading slot written from data that has none (a `ForEach` over no buttons) is empty: the bar draws
  /// its search glyph at its plain padding, exactly as with no slot.
  @Test("SRC-25 SRC-2 a leading slot from no data keeps the glyph")
  func leadingSlotFromNoData() throws {
    let buttons: [String] = []
    let empty = try Snapshot.renderExact(barView { ForEach(buttons, id: \.self) { TanreiIconButton($0, action: {}) { Rectangle() } } })
    #expect(empty.pixels == (try Snapshot.renderExact(barView())).pixels)
    let filled = try Snapshot.renderExact(barView { ForEach(["Menu"], id: \.self) { TanreiIconButton($0, action: {}) { Rectangle() } } })
    #expect(filled.pixels != empty.pixels)
  }

  /// SRC-21 — the bar's, the view's and a row's corners follow the corner smoothing.
  @Test("SRC-21 corner smoothing reaches the bar and the view")
  func corners() throws {
    func render(_ amount: Double) throws -> Bitmap {
      var system = TanreiSystem.tanrei
      system.shape.cornerSmoothing = amount
      system.search.containerShape = 12
      return try Snapshot.renderExact(barView(system: system), theme: theme(system))
    }
    #expect(try render(0).pixels != render(0.6).pixels)
  }

  /// SRC-28 — the heights are minimums: an input line taller than the container grows the bar.
  @Test("SRC-28 the bar grows to hold one line of the input")
  func grows() throws {
    var system = TanreiSystem.tanrei
    system.search.inputTypescale.lineHeight = tokens.containerHeight + 20
    let bitmap = try Snapshot.render(barView(system: system).frame(height: Stage.barHeight + 40), theme: theme(system))
    let fill = light[.surfaceContainerHighest].rgba8()
    let column = barStart + Stage.barWidth / 2
    let ys = stride(from: CGFloat.zero, to: Stage.barHeight + 40, by: 0.5).filter { pixel(bitmap, x: Snapshot.inset + column, y: Snapshot.inset + $0).isClose(to: fill, tolerance: 2) }
    let (top, bottom) = (try #require(ys.first), try #require(ys.last))
    #expect(bottom - top + 0.5 == tokens.containerHeight + 20)
  }
}

// MARK: - The view, rendered

/// The docked search's open view in place, with `entries` and optional content.
@MainActor
private func dockedView(
  _ entries: [(String, String, String?)] = [("invoices", "", "history"), ("Invoices", "Folder · 24 messages", "folder")], system: TanreiSystem = .tanrei,
  width: CGFloat = Stage.barWidth, @ViewBuilder content: () -> some View = { EmptyView() }
) -> some View {
  TanreiSearch("Search mail", text: .constant("inv"), isExpanded: .constant(true), clearLabel: "Clear search") {
    ForEach(entries, id: \.0) { TanreiSearchSuggestion($0.0, supportingText: $0.1, leadingIcon: itemIcon($0.2), value: $0.0) }
  } content: {
    content()
  }
  .inPlace()
  .frame(width: width)
  .environment(\.tanreiStaticTextInput, true)
}

@MainActor
@Suite("TanreiSearch view rendered")
struct TanreiSearchViewRenderedTests {
  /// SRC-7 — the docked view offset below the bar, as wide as it, on its surface; SRC-16 — each row at least the row height,
  /// the rows' text after the icon column.
  @Test("SRC-7 SRC-16 the docked view under the bar and its rows")
  func docked() throws {
    var system = TanreiSystem.tanrei
    system.search.conditions.standard.enabled.suggestionHeadlineColor = .role(.error)
    system.search.viewContainerColor = .role(.success)
    let bitmap = try Snapshot.render(dockedView(system: system), theme: theme(system))
    let fill = light[.success].rgba8()
    let top = tokens.containerHeight + tokens.viewOffset
    let column = stride(from: CGFloat.zero, to: top + 40, by: 0.5).filter { pixel(bitmap, x: Snapshot.inset + Stage.barWidth / 2, y: Snapshot.inset + $0).isClose(to: fill, tolerance: 2) }
    #expect(column.first == top)
    let row = stride(from: CGFloat.zero, to: Stage.barWidth + 8, by: 0.5).filter { pixel(bitmap, x: Snapshot.inset + $0, y: Snapshot.inset + top + 2).isClose(to: fill, tolerance: 2) }
    #expect(row.first == tokens.viewShape / 2 || (row.first ?? .zero) <= tokens.viewShape)
    let middle = stride(from: CGFloat.zero, to: Stage.barWidth + 8, by: 0.5).filter { pixel(bitmap, x: Snapshot.inset + $0, y: Snapshot.inset + top + 20).isClose(to: fill, tolerance: 2) }
    #expect(middle.first == .zero && (middle.last ?? .zero) + 0.5 == Stage.barWidth)
    // The first headline starts after the padding, the row's padding, the icon column and the gap.
    let rowCentre = top + tokens.viewPaddingBlock + max(tokens.suggestionContainerHeight, TanreiHitTarget.minimum(in: system.measure)) / 2
    let textStart = tokens.viewPaddingInline + tokens.suggestionContainerPaddingInline + tokens.suggestionLeadingIconSize + tokens.suggestionContainerGap
    let first = try #require(ink(bitmap, light[.error].rgba8(), y: rowCentre, from: 0, to: Stage.barWidth))
    #expect(first >= textStart && first < textStart + 4)
  }

  /// SRC-16 — no row has an icon: no column; a row without one keeps it while another has one.
  @Test("SRC-16 the icon column is kept in every row while any has an icon")
  func iconColumn() throws {
    var system = TanreiSystem.tanrei
    system.search.conditions.standard.enabled.suggestionHeadlineColor = .role(.error)
    let top = tokens.containerHeight + tokens.viewOffset + tokens.viewPaddingBlock
    let row = max(tokens.suggestionContainerHeight, TanreiHitTarget.minimum(in: system.measure))
    let plain = try Snapshot.render(dockedView([("Inbox", "", nil), ("Idle", "", nil)], system: system), theme: theme(system))
    let start = tokens.viewPaddingInline + tokens.suggestionContainerPaddingInline
    let first = try #require(ink(plain, light[.error].rgba8(), y: top + row / 2, from: 0, to: Stage.barWidth))
    #expect(first >= start && first < start + 4)
    let mixed = try Snapshot.render(dockedView([("Inbox", "", "history"), ("Idle", "", nil)], system: system), theme: theme(system))
    let second = try #require(ink(mixed, light[.error].rgba8(), y: top + row * 1.5, from: 0, to: Stage.barWidth))
    #expect(second >= start + tokens.suggestionLeadingIconSize + tokens.suggestionContainerGap)
  }

  /// SRC-16 — the text wraps and grows the row rather than being cut.
  @Test("SRC-16 SRC-28 a long headline wraps and grows its row")
  func wraps() throws {
    let long = String(repeating: "invoice ", count: 12)
    let one = try Snapshot.render(dockedView([("a", "", nil)]))
    let wrapped = try Snapshot.render(dockedView([(long, "", nil)]))
    #expect(wrapped.height > one.height)
  }

  /// SRC-29 — the product's content takes the headline color as its foreground, inset as the rows' content.
  @Test("SRC-29 the default slot's content: the headline color, inset")
  func content() throws {
    var system = TanreiSystem.tanrei
    system.search.conditions.standard.enabled.suggestionHeadlineColor = .role(.error)
    let bitmap = try Snapshot.render(dockedView([], system: system) { Rectangle().frame(height: 20) }, theme: theme(system))
    let y = tokens.containerHeight + tokens.viewOffset + tokens.viewPaddingBlock + 10
    let start = tokens.viewPaddingInline + tokens.suggestionContainerPaddingInline
    let first = try #require(ink(bitmap, light[.error].rgba8(), y: y, from: 0, to: Stage.barWidth, tolerance: 4))
    #expect(abs(first - start) <= 0.5)
  }

  /// SRC-7 — while the view has no content, no view is drawn (and the search stays expanded).
  @Test("SRC-7 no content, no view")
  func empty() throws {
    let bitmap = try Snapshot.render(dockedView([]))
    #expect(CGFloat(bitmap.height) / Snapshot.scale == tokens.containerHeight + 2 * Snapshot.inset)
  }

  /// SRC-17 — the active suggestion takes the focused tokens and shows the focus ring inside its row.
  @Test("SRC-17 the active row: focused tokens and the ring inside it")
  func activeRow() throws {
    var system = TanreiSystem.tanrei
    system.search.conditions.standard.focused.suggestionContainerColor = .role(.success)
    let entry = TanreiSearchEntry(value: "a", headline: "invoices", supportingText: "", leadingIcon: nil)
    let row = TanreiSearchSuggestionChrome(entry: entry, hasIcon: false, isActive: true, isPressed: false).frame(width: 200)
    let bitmap = try Snapshot.render(row, theme: theme(system))
    let colors = system.colors.light
    let height = max(tokens.suggestionContainerHeight, TanreiHitTarget.minimum(in: system.measure))
    #expect(pixel(bitmap, x: Snapshot.inset + 100, y: Snapshot.inset + height - 8).isClose(to: colors[.success].rgba8(), tolerance: 2))
    let ring = stride(from: CGFloat.zero, to: 6, by: 0.5).map { pixel(bitmap, x: Snapshot.inset + 100, y: Snapshot.inset + $0) }
    #expect(ring.contains { $0.isClose(to: colors[.focusRing].rgba8(), tolerance: 24) })
    #expect(!pixel(bitmap, x: Snapshot.inset + 100, y: Snapshot.inset - 1).isClose(to: colors[.focusRing].rgba8(), tolerance: 24))
  }

  /// SRC-9 — the full-screen view: the view's color to every edge, the header at least its height with the back button at
  /// padding-inline, the divider under it across the window.
  @Test("SRC-9 SRC-11 the full-screen view: header, back button, divider, fill")
  func fullScreen() throws {
    var system = TanreiSystem.tanrei
    system.iconButton.variants.standard.enabled.iconColor = .role(.error)
    system.search.dividerColor = .role(.success)
    let view = TanreiSearch(
      "Search mail", text: .constant("inv"), isExpanded: .constant(true), presentation: .fullScreen, clearLabel: "Clear search", backLabel: "Back"
    ) {
      TanreiSearchSuggestion("invoices", value: "invoices")
    }
    .inPlace()
    .frame(width: Stage.width, height: Stage.fullScreenHeight)
    .environment(\.tanreiStaticTextInput, true)
    let bitmap = try Snapshot.render(view, theme: theme(system))
    let colors = system.colors.light
    #expect(pixel(bitmap, x: Snapshot.inset + 1, y: Snapshot.inset + Stage.fullScreenHeight - 1).isClose(to: colors[.surfaceBright].rgba8(), tolerance: 2))
    #expect(pixel(bitmap, x: Snapshot.inset + Stage.width - 1, y: Snapshot.inset + 1).isClose(to: colors[.surfaceBright].rgba8(), tolerance: 2))
    #expect(pixel(bitmap, x: Snapshot.inset + Stage.width / 2, y: Snapshot.inset + tokens.headerHeight + tokens.dividerThickness / 2).isClose(to: colors[.success].rgba8(), tolerance: 2))
    #expect(pixel(bitmap, x: Snapshot.inset + 1, y: Snapshot.inset + tokens.headerHeight + tokens.dividerThickness / 2).isClose(to: colors[.success].rgba8(), tolerance: 2))
    let medium = system.iconButton.sizes.medium
    let backStart = tokens.headerPaddingInline + (medium.containerSize - medium.iconSize) / 2
    let first = try #require(ink(bitmap, colors[.error].rgba8(), y: tokens.headerHeight / 2, from: 0, to: 60))
    #expect(first >= backStart && first < backStart + medium.iconSize / 2)
  }

  /// SRC-24 / SRC-27 — a trailing slot of more than two is still laid out, and reported; an empty label is reported.
  @Test("SRC-24 SRC-27 too many trailing buttons and an empty label are reported, still drawn")
  func reports() throws {
    let (_, reports) = try Reports.collecting {
      try Snapshot.render(
        TanreiSearch("", text: .constant(""), isExpanded: .constant(false)) {
          EmptyView()
        } leading: {
          EmptyView()
        } trailing: {
          slotButton("mic")
          slotButton("account_circle")
          slotButton("menu")
        }
        .frame(width: Stage.barWidth))
    }
    #expect(reports.mention("SRC-27") && reports.mention("trailing"))
    #expect(reports.mention("label is empty"))
  }
}

extension TanreiSearchTokens {
  /// The docked view's corner, for sampling inside it.
  fileprivate var viewShape: CGFloat { viewContainerShape }
}

// MARK: - Fixtures (one per spec fixture)

@MainActor
@Suite("TanreiSearch snapshots")
struct TanreiSearchSnapshotTests {
  /// Mirrors `fixtures` in specs/search.spec.json.
  nonisolated static let fixtures = ["bar", "bar-value", "bar-slots", "bar-disabled", "docked", "full-screen"]

  static func fixture(_ id: String) throws -> SpecFixture {
    try #require(try SpecFixture.load(spec: "search").first { $0.id == id })
  }

  /// Differ from their baselines on GitHub's macOS runner only.
  nonisolated static let runnerOnlyDiffs: Set<String> = ["docked", "full-screen"]

  @Test("SRC-1 SRC-7 SRC-9 fixture matches its baseline", arguments: fixtures)
  func fixture(_ id: String) throws {
    let view = TanreiSearchFixtures.view(try Self.fixture(id))
    guard Self.runnerOnlyDiffs.contains(id) else { return try Snapshot.assert(view, named: id, suite: suiteName) }
    try withKnownIssue("CI runner rendering: the docked and full-screen views differ from their baselines on GitHub's macOS runner only (0.2-0.3% of pixels)", isIntermittent: true) {
      try Snapshot.assert(view, named: id, suite: suiteName)
    } matching: { isSnapshotDiff($0) }
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    #expect(try SpecFixture.load(spec: "search").map(\.id) == Self.fixtures)
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiSearchTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiSearch preset snapshots")
struct TanreiSearchPresetSnapshotTests {
  /// The docked fixture: the preset's bar (fill, corners, height, glyph, value, clear button) and view (surface, elevation,
  /// corners, rows, text styles).
  nonisolated static let fixtureId = "docked"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .m3ExpressiveLike, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiSearchSnapshotTests.fixtures.contains(Self.fixtureId))
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try TanreiSearchSnapshotTests.fixture(Self.fixtureId)
    let view = TanreiSearchFixtures.view(fixture)
    // The preset fixture is `docked`, which differs on GitHub's macOS runner only under every preset.
    guard TanreiSearchSnapshotTests.runnerOnlyDiffs.contains(fixture.id) else {
      return try Snapshot.assert(view, named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
    }
    try withKnownIssue("CI runner rendering: the docked view differs from its baseline on GitHub's macOS runner only, under every preset (0.25-0.27% of pixels)", isIntermittent: true) {
      try Snapshot.assert(view, named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
    } matching: { isSnapshotDiff($0) }
  }
}
