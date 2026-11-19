import AcmeFixture
import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/text-field.spec.json. Each behavior id (TXF-n) is named next to the test that covers it; the parity
// checker requires every id to appear in this file.
//
// Two kinds of test:
// - Renders (`Snapshot.render`) for layout, colors and baselines. `ImageRenderer` cannot draw the platform's text element
//   (an AppKit-backed field draws as a placeholder), so every render sets the internal `\.tanreiStaticTextInput`, which
//   draws the input's text as text in the same style; everything else is the real field.
// - Hosted fields (macOS, `HostedView`) with real key events, for focus, typing, commit and submit — the real
//   `TextField`. Focus is given as a click into the field gives it (`focusTextField()` makes AppKit's field the first
//   responder; a synthetic click into it cannot be used: AppKit tracks the mouse inside its mouse-down). A press on the
//   field outside its text (TXF-8) and Tab are tested in the gallery's UI tests.

private let suiteName = "TanreiTextFieldTests"

/// The width of a field in the tests and the baselines: a phone column.
private let width: CGFloat = 280

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

/// A field as the renders draw it: the static input, at the test width.
@MainActor
private func rendered(_ field: some View) -> some View {
  field.frame(width: width).environment(\.tanreiStaticTextInput, true)
}

/// Everything a hosted field reports.
@MainActor
private final class Log {
  var inputs: [String] = []
  var commits: [String] = []
  var events: [String] = []
}

/// A field that owns its value in `@State`, as an app does, and logs input, change and action.
private struct Host: View {
  let log: Log
  var initial = ""
  var maxLength = 0
  var axis: Axis = .horizontal
  var readOnly = false
  var system: TanreiSystem = .tanrei
  @State private var text: String

  init(log: Log, initial: String = "", maxLength: Int = 0, axis: Axis = .horizontal, readOnly: Bool = false, system: TanreiSystem = .tanrei) {
    self.log = log
    self.initial = initial
    self.maxLength = maxLength
    self.axis = axis
    self.readOnly = readOnly
    self.system = system
    _text = State(initialValue: initial)
  }

  var body: some View {
    let binding = Binding(
      get: { text },
      set: { value in
        text = value
        log.inputs.append(value)
        log.events.append("input")
      })
    TanreiTextField(
      "Email", text: binding, readOnly: readOnly, axis: axis, maxLength: maxLength,
      onCommit: { value in
        log.commits.append(value)
        log.events.append("change")
      },
      onSubmit: { log.events.append("action") })
    .frame(width: width)
    .padding(Snapshot.inset)
    .background(system.colors.light[.surface])
    .tanreiTheme(theme(system))
  }
}

#if os(macOS)
@MainActor
private func host(_ log: Log, initial: String = "", maxLength: Int = 0, axis: Axis = .horizontal, readOnly: Bool = false, system: TanreiSystem = .tanrei) -> HostedView<Host> {
  let hosted = HostedView(Host(log: log, initial: initial, maxLength: maxLength, axis: axis, readOnly: readOnly, system: system))
  hosted.makeKey()
  return hosted
}
#endif

private func appearance(
  _ variant: TanreiTextFieldVariant = .outlined, _ state: TanreiInteraction = .enabled, size: TanreiTextFieldSize = .medium, error: Bool = false,
  tokens: TanreiTextFieldTokens = TanreiSystem.tanrei.textField
) -> TanreiTextFieldAppearance {
  TanreiTextFieldAppearance(tokens: tokens, variant: variant, size: size, state: state, error: error)
}

private func metrics(
  _ a: TanreiTextFieldAppearance, labelDrawn: Bool = true, leading: Bool = false, trailing: Bool = false, multiline: Bool = false
) -> TanreiTextFieldMetrics {
  TanreiTextFieldMetrics(appearance: a, variant: .outlined, labelDrawn: labelDrawn, hasLeadingIcon: leading, hasTrailingIcon: trailing, isMultiline: multiline) {
    $0.lineHeight
  }
}

/// TXF-13: the ink of one color in a render, in points: its rows grouped into lines (runs of rows with ink), each with
/// its horizontal extent.
private struct Ink {
  struct Line {
    var top: CGFloat
    var bottom: CGFloat
    var left: CGFloat
    var right: CGFloat
  }

  private(set) var lines: [Line] = []

  @MainActor
  init(_ bitmap: Bitmap, color: Bitmap.RGBA, tolerance: Int = 60) {
    var current: Line?
    for y in 0..<bitmap.height {
      let xs = (0..<bitmap.width).filter { bitmap[$0, y].isClose(to: color, tolerance: tolerance) }
      guard let first = xs.first, let last = xs.last else {
        if let line = current { lines.append(line) }
        current = nil
        continue
      }
      let (top, bottom) = (CGFloat(y) / Snapshot.scale, CGFloat(y + 1) / Snapshot.scale)
      let (left, right) = (CGFloat(first) / Snapshot.scale, CGFloat(last + 1) / Snapshot.scale)
      if var line = current {
        line.bottom = bottom
        line.left = min(line.left, left)
        line.right = max(line.right, right)
        current = line
      } else {
        current = Line(top: top, bottom: bottom, left: left, right: right)
      }
    }
    if let line = current { lines.append(line) }
  }

  var top: CGFloat { lines.first?.top ?? .infinity }
  var bottom: CGFloat { lines.last?.bottom ?? -.infinity }
  var left: CGFloat { lines.map(\.left).min() ?? .infinity }
  var right: CGFloat { lines.map(\.right).max() ?? -.infinity }
  var widest: CGFloat { lines.map { $0.right - $0.left }.max() ?? .zero }
}

// MARK: - Input, change, action (TXF-1 … TXF-4, TXF-18)

@MainActor
@Suite("TanreiTextField editing", .serialized)
struct TanreiTextFieldEditingTests {
  #if os(macOS)
  /// TXF-1 — each change the user makes writes `text` once; TXF-2 — the action key commits the changed value once;
  /// TXF-3 — then emits action (`onSubmit:`), after the change.
  @Test("TXF-1 TXF-2 TXF-3 typing emits input per change; Return commits once, then emits action")
  func typingAndSubmit() {
    let log = Log()
    let hosted = host(log)
    hosted.focusTextField()
    hosted.type("ab")
    #expect(log.inputs == ["a", "ab"])
    hosted.type("\r", keyCode: 36)
    #expect(log.commits == ["ab"])
    #expect(log.events == ["input", "input", "change", "action"])
    // Return again without a change: action, but no second change.
    hosted.type("\r", keyCode: 36)
    #expect(log.commits == ["ab"] && log.events.last == "action")
  }

  /// TXF-1 — two keys that arrive before the view updates are two changes, and write `text` twice: the input is emitted
  /// as the text element writes it, not once per update of the view (on a GitHub-hosted runner, "ab" typed
  /// into one update and the field emitted one input).
  @Test("TXF-1 keys that arrive together emit input once per change")
  func keysTogether() {
    let log = Log()
    let hosted = host(log)
    hosted.focusTextField()
    hosted.type("ab", together: true)
    #expect(log.inputs == ["a", "ab"])
    hosted.type("\r", keyCode: 36)
    #expect(log.events == ["input", "input", "change", "action"])
  }

  /// TXF-18 — keys that arrive together are limited each against the value before it: the limit still holds.
  @Test("TXF-18 keys that arrive together stop at maxLength")
  func maxLengthKeysTogether() {
    let log = Log()
    let hosted = host(log, maxLength: 3)
    hosted.focusTextField()
    hosted.type("abcd", together: true)
    #expect(log.inputs == ["a", "ab", "abc"])
  }

  /// TXF-1 — a value the product sets is shown and emits neither input nor change.
  @Test("TXF-1 a value the product sets emits nothing")
  func productValue() {
    let log = Log()
    let hosted = host(log, initial: "ada@example.com")
    hosted.focusTextField()
    hosted.type("\r", keyCode: 36)
    #expect(log.inputs.isEmpty && log.commits.isEmpty)
  }

  /// TXF-18 — typing past maxLength is refused; the value is never longer than the limit.
  @Test("TXF-18 typing stops at maxLength")
  func maxLengthTyping() {
    let log = Log()
    let hosted = host(log, maxLength: 3)
    hosted.focusTextField()
    hosted.type("abcd")
    #expect(log.inputs == ["a", "ab", "abc"])
  }

  /// TXF-10 — a read-only field changes nothing and emits nothing when typed into.
  @Test("TXF-10 a read-only field emits nothing")
  func readOnlyTyping() {
    let log = Log()
    let hosted = host(log, initial: "ada@example.com", readOnly: true)
    hosted.focusTextField()
    hosted.type("x")
    hosted.type("\r", keyCode: 36)
    #expect(log.inputs.isEmpty && log.commits.isEmpty)
  }

  /// TXF-5 — a disabled field takes no focus and no input.
  @Test("TXF-5 a disabled field takes no input")
  func disabledTyping() {
    let log = Log()
    let hosted = HostedView(Host(log: log).disabled(true))
    hosted.makeKey()
    hosted.focusTextField()
    hosted.type("x")
    #expect(log.inputs.isEmpty)
  }
  #endif

  /// TXF-2 — change only for a value different from the one last committed.
  @Test("TXF-2 change only for a new value")
  func commitRule() {
    #expect(TanreiTextFieldBehavior.shouldCommit(value: "ab", committed: "a"))
    #expect(!TanreiTextFieldBehavior.shouldCommit(value: "ab", committed: "ab"))
  }

  /// TXF-18 — the limit counts user-perceived characters (an emoji, a letter with its accent, count once), refuses an edit
  /// once the value is full, shortens a paste to fit, and never applies to a value the product sets (the rule is only
  /// applied to the user's draft).
  @Test("TXF-18 the limit counts grapheme clusters, refuses at the limit, shortens a paste")
  func limit() {
    #expect(TanreiTextFieldBehavior.limit("abc", previous: "ab", maxLength: 3) == "abc")
    #expect(TanreiTextFieldBehavior.limit("abcd", previous: "abc", maxLength: 3) == "abc")
    #expect(TanreiTextFieldBehavior.limit("a pasted text", previous: "a", maxLength: 5) == "a pas")
    #expect(TanreiTextFieldBehavior.limit("👩‍👩‍👧é🇯🇵", previous: "", maxLength: 3) == "👩‍👩‍👧é🇯🇵")
    #expect("👩‍👩‍👧é🇯🇵".count == 3)
    #expect(TanreiTextFieldBehavior.limit("anything", previous: "", maxLength: 0) == "anything")
  }

  /// TXF-4 — SwiftUI's `TextField` gives no signal while an input method is composing, so the field cannot tell a
  /// composition from a commit: `maxLength` applies to the draft SwiftUI hands over. What it can hold is held: a value the product sets is shown without an input and
  /// without shortening, and nothing but the user's draft is ever limited.
  @Test("TXF-4 only the user's draft is limited; a product value is not shortened")
  func compositionGap() {
    let options = TanreiTextFieldOptions(
      prompt: nil, variant: .outlined, size: .medium, type: .text, supportingText: "", errorText: "", error: false, readOnly: false, required: false,
      axis: .horizontal, lineLimit: nil, maxLength: 3, counter: true, prefix: "", suffix: "", textContentType: nil, onCommit: nil)
    // A product value longer than the limit is shown whole (the counter reads it as it is).
    #expect(options.counterText(for: "longer than three") == "17/3")
  }
}

// MARK: - Rules (TXF-9, TXF-11 … TXF-15, TXF-17, TXF-19 … TXF-21, TXF-23, TXF-24)

@MainActor
@Suite("TanreiTextField rules")
struct TanreiTextFieldRuleTests {
  /// TXF-6 — one state: disabled, else focused over hovered; a field has no pressed state; focus by any means counts.
  @Test("TXF-6 TXF-5 the state: disabled, focused over hovered, never pressed")
  func state() {
    #expect(TanreiTextFieldBehavior.state(isEnabled: false, isFocused: true, isHovered: true) == .disabled)
    #expect(TanreiTextFieldBehavior.state(isEnabled: true, isFocused: true, isHovered: true) == .focused)
    #expect(TanreiTextFieldBehavior.state(isEnabled: true, isFocused: false, isHovered: true) == .hovered)
    #expect(TanreiTextFieldBehavior.state(isEnabled: true, isFocused: false, isHovered: false) == .enabled)
    // A press is not an action: pressed draws as focused (the press focuses the input, TXF-8).
    #expect(appearance(.filled, .pressed) == appearance(.filled, .focused))
  }

  /// TXF-13 / TXF-21 — the label floats while focused or filled (an autofilled value is a value).
  @Test("TXF-13 TXF-21 the label floats while focused or filled")
  func floats() {
    #expect(!TanreiTextFieldBehavior.labelFloats(isFocused: false, value: ""))
    #expect(TanreiTextFieldBehavior.labelFloats(isFocused: true, value: ""))
    #expect(TanreiTextFieldBehavior.labelFloats(isFocused: false, value: "autofilled@example.com"))
  }

  /// TXF-15 — placeholder, prefix and suffix show only while the label is floated or not drawn.
  @Test("TXF-15 affixes and placeholder only while the label is floated or hidden")
  func affixes() {
    #expect(!TanreiTextFieldBehavior.showsAffixes(isFloated: false, labelDrawn: true))
    #expect(TanreiTextFieldBehavior.showsAffixes(isFloated: true, labelDrawn: true))
    #expect(TanreiTextFieldBehavior.showsAffixes(isFloated: false, labelDrawn: false))
  }

  /// TXF-11 / TXF-15 / TXF-19 — the description: affixes while shown, the shown supporting or error text, the count.
  @Test("TXF-11 TXF-15 TXF-19 the description and the counter text")
  func description() {
    #expect(TanreiTextFieldBehavior.description(prefix: "$", suffix: "USD", supporting: "", counter: "") == "$, USD")
    #expect(TanreiTextFieldBehavior.description(prefix: "", suffix: "", supporting: "Enter a complete email address.", counter: "4/40") == "Enter a complete email address., 4/40")
    var options = TanreiTextFieldOptions(
      prompt: nil, variant: .outlined, size: .medium, type: .text, supportingText: "Help", errorText: "Wrong", error: false, readOnly: false,
      required: false, axis: .horizontal, lineLimit: nil, maxLength: 40, counter: true, prefix: "", suffix: "", textContentType: nil, onCommit: nil)
    #expect(options.shownSupportingText == "Help")
    options.error = true
    #expect(options.shownSupportingText == "Wrong")
    options.errorText = ""
    #expect(options.shownSupportingText == "Help")
    #expect(options.counterText(for: "Ada Lovelace") == "12/40")
    options.maxLength = 0
    #expect(options.counterText(for: "👩‍👩‍👧") == "1")
    #expect(TanreiTextFieldBehavior.countAnnouncementDelay == 1)
  }

  /// TXF-12 — an error is announced when set or changed while the input has focus; not without focus.
  @Test("TXF-12 an error is announced only while focused")
  func errorAnnouncement() {
    #expect(TanreiTextFieldBehavior.errorToAnnounce("Enter a complete email address.", isFocused: true) == "Enter a complete email address.")
    #expect(TanreiTextFieldBehavior.errorToAnnounce("Enter a complete email address.", isFocused: false) == nil)
    #expect(TanreiTextFieldBehavior.errorToAnnounce(nil, isFocused: true) == nil)
    #expect(TanreiTextFieldBehavior.errorToAnnounce("", isFocused: true) == nil)
  }

  /// TXF-17 — multi-line starts at minRows (2 by default), grows to maxRows (no limit by default; at minRows when maxRows is
  /// smaller); a password stays single-line and is reported.
  @Test("TXF-17 the line range, and a multi-line password")
  func lines() {
    var options = TanreiTextFieldOptions(
      prompt: nil, variant: .outlined, size: .medium, type: .text, supportingText: "", errorText: "", error: false, readOnly: false, required: false,
      axis: .vertical, lineLimit: nil, maxLength: 0, counter: false, prefix: "", suffix: "", textContentType: nil, onCommit: nil)
    #expect(options.isMultiline && options.lineRange == 2...Int.max)
    options.lineLimit = 3...8
    #expect(options.lineRange == 3...8)
    options.type = .password
    #expect(!options.isMultiline)
    let (_, reports) = Reports.collecting { _ = TanreiTextField("Password", text: .constant(""), type: .password, axis: .vertical) }
    #expect(reports.mention("TXF-17"))
  }

  /// TXF-9 — an unknown type name behaves as text and is reported.
  @Test("TXF-9 an unknown type is text, reported")
  func unknownType() {
    let (type, reports) = Reports.collecting { TanreiTextFieldType(named: "colour") }
    #expect(type == .text && reports.mention("colour") && reports.mention("TXF-9"))
    let (known, silent) = Reports.collecting { TanreiTextFieldType(named: "email") }
    #expect(known == .email && silent.messages.isEmpty)
  }

  /// TXF-20 — autocorrection and capitalization are off for every type but text and search; the keyboards (iOS).
  @Test("TXF-20 the keyboard and corrections of each type")
  func types() {
    for type in TanreiTextFieldType.allCases {
      let general = type == .text || type == .search
      #expect(TanreiTextFieldPlatform.corrects(type) == general && TanreiTextFieldPlatform.capitalizes(type) == general, "\(type)")
    }
    #if os(iOS)
    #expect(TanreiTextFieldPlatform.keyboard(.email) == .emailAddress && TanreiTextFieldPlatform.keyboard(.number) == .decimalPad)
    #expect(TanreiTextFieldPlatform.keyboard(.tel) == .phonePad && TanreiTextFieldPlatform.keyboard(.url) == .URL)
    #endif
  }

  /// TXF-21 — HTML autofill names map to the platform's content types; an unknown one to none.
  @Test("TXF-21 autocomplete names map to the platform's content types")
  func autofill() {
    #expect(TanreiTextFieldPlatform.contentType(forAutocomplete: "current-password") == .password)
    #expect(TanreiTextFieldPlatform.contentType(forAutocomplete: "one-time-code") == .oneTimeCode)
    #expect(TanreiTextFieldPlatform.contentType(forAutocomplete: "no-such-field") == nil)
    #if os(iOS)
    #expect(TanreiTextFieldPlatform.contentType(forAutocomplete: "email") == .emailAddress)
    #expect(TanreiTextFieldPlatform.contentType(forAutocomplete: "new-password") == .newPassword)
    #endif
  }

  /// TXF-23 — an empty label is reported and the field still renders; TXF-24 — which values read left to right.
  @Test("TXF-23 an empty label is reported; TXF-24 the left-to-right types")
  func labelAndDirection() throws {
    let (_, reports) = Reports.collecting { _ = TanreiTextField("", text: .constant("")) }
    #expect(reports.mention("TXF-23") && reports.mention("accessible name"))
    let (bitmap, _) = try Reports.collecting { try Snapshot.render(rendered(TanreiTextField("", text: .constant("")))) }
    #expect(bitmap.height > 0)
    #expect(TanreiTextFieldType.allCases.filter(\.readsLeftToRight) == [.email, .password, .number, .tel, .url])
  }
}

// MARK: - Token bindings (TXF-5, TXF-6, TXF-9, TXF-10, TXF-11, TXF-14, TXF-16)

@MainActor
@Suite("TanreiTextField token bindings")
struct TanreiTextFieldTokenBindingTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiTextFieldTokens { system.textField }

  /// At rest: outlined draws an outline edge on no container, filled a surface-container-highest box with an
  /// outline indicator; label on-surface-variant, input on-surface, caret primary.
  @Test("TXF-6 at rest each variant binds the expected roles")
  func rest() {
    let outlined = appearance(.outlined)
    let filled = appearance(.filled)
    #expect(outlined.container == TanreiPaint.none && outlined.outline == .role(.outline) && outlined.activeIndicator == TanreiPaint.none)
    #expect(filled.container == .role(.surfaceContainerHighest) && filled.activeIndicator == .role(.outline) && filled.outline == TanreiPaint.none)
    for a in [outlined, filled] {
      #expect(a.label == .role(.onSurfaceVariant) && a.input == .role(.onSurface) && a.caret == .role(.primary))
      #expect(a.outlineWidth == system.measure.borderHairline && a.activeIndicatorWidth == system.measure.borderHairline && a.opacity == 1)
    }
    #expect(!outlined.isFilled && filled.isFilled)
    #expect(filled.bottomCornerRadius == tokens.containerShapeBottom && outlined.bottomCornerRadius == tokens.containerShape)
    #expect(appearance().selection == tokens.selectionColor)
  }

  /// TXF-6 — focused: the edge becomes focus-ring and thick, the label primary, the container unchanged;
  /// hovered: a filled container carries the state layer, an outlined one does not, the edge darkens.
  @Test("TXF-6 TXF-7 focused thickens and recolors the edge; hovered tints a filled container")
  func states() {
    for variant in TanreiTextFieldVariant.core {
      let rest = appearance(variant)
      let focused = appearance(variant, .focused)
      #expect(focused.container == rest.container, "\(variant): the edge is the focus indicator")
      #expect(focused.label == .role(.primary))
      #expect(focused.outlineWidth == tokens.focused.outlineWidth && focused.activeIndicatorWidth == tokens.focused.activeIndicatorWidth)
      #expect(tokens.focused.outlineWidth == system.measure.borderThick && tokens.focused.activeIndicatorWidth == system.measure.borderThick)
    }
    #expect(appearance(.outlined, .focused).outline == .role(.focusRing) && appearance(.filled, .focused).activeIndicator == .role(.focusRing))
    #expect(appearance(.filled, .hovered).container == .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: system.state.hoverStateLayerOpacity))
    #expect(appearance(.outlined, .hovered).container == TanreiPaint.none)
    #expect(appearance(.outlined, .hovered).outline == .role(.onSurface) && appearance(.filled, .hovered).activeIndicator == .role(.onSurface))
  }

  /// TXF-6 (verify) — under acme the states are its own values.
  @Test("TXF-6 acme's values reach the field")
  func acme() {
    let acme = TanreiSystem.acme.textField
    #expect(TanreiTextFieldAppearance(tokens: acme, variant: .filled, size: .medium, state: .hovered).container == acme.variants.filled.hovered.containerColor)
    #expect(TanreiTextFieldAppearance(tokens: acme, variant: .outlined, size: .medium, state: .focused).outline == acme.variants.outlined.focused.outlineColor)
  }

  /// TXF-11 — in error every part comes from the `error.` parts, in every state.
  @Test("TXF-11 error parts in every state", arguments: [TanreiInteraction.enabled, .hovered, .focused, .disabled])
  func error(state: TanreiInteraction) {
    for variant in TanreiTextFieldVariant.core {
      let parts = tokens.variants[variant][state: state]!
      let a = appearance(variant, state, error: true)
      #expect(a.container == parts.errorContainerColor && a.outline == parts.errorOutlineColor && a.activeIndicator == parts.errorActiveIndicatorColor)
      #expect(a.label == parts.errorLabelColor && a.supportingText == parts.errorSupportingTextColor && a.caret == parts.errorCaretColor)
      #expect(a.trailingIcon == parts.errorTrailingIconColor && a.counter == parts.errorCounterColor && a.affix == parts.errorAffixColor)
    }
    if state == .enabled {
      #expect(appearance(.outlined, error: true).outline == .role(.error) && appearance(.filled, error: true).activeIndicator == .role(.error))
      #expect(appearance(.outlined, error: true).supportingText == .role(.error))
    }
  }

  /// TXF-5 — disabled: the disabled tokens (the same with or without error) and the disabled opacity.
  @Test("TXF-5 disabled bindings")
  func disabled() {
    let content = TanreiPaint.alpha(of: .role(.onSurface), amount: system.state.disabledContentOpacity)
    for variant in TanreiTextFieldVariant.core {
      let a = appearance(variant, .disabled)
      #expect(a.label == content && a.input == content && a.supportingText == content)
      #expect(a.opacity == (tokens.disabled.opacity))
      let e = appearance(variant, .disabled, error: true)
      #expect(e.label == a.label && e.outline == a.outline && e.activeIndicator == a.activeIndicator && e.supportingText == a.supportingText)
    }
    #expect(appearance(.outlined, .disabled).outline == .alpha(of: .role(.onSurface), amount: system.state.disabledContainerOpacity))
  }

  /// TXF-10 — a read-only field is drawn as an enabled one: the appearance depends on the state only, which a read-only
  /// field resolves as any enabled field does (hovered, focused).
  @Test("TXF-10 read-only is drawn as enabled")
  func readOnly() {
    #expect(TanreiTextFieldBehavior.state(isEnabled: true, isFocused: true, isHovered: false) == .focused)
    #expect(appearance(.outlined, .enabled) != appearance(.outlined, .disabled))
  }

  /// TXF-16 — the geometry: heights 36 / 40 (Button's medium and large), paddings, gaps, type styles, icon sizes.
  @Test("TXF-16 TXF-22 each size binds its geometry")
  func sizes() {
    let medium = appearance(size: .medium)
    let large = appearance(size: .large)
    #expect(medium.containerHeight == 36 && large.containerHeight == 40)
    #expect([medium.containerHeight, large.containerHeight] == [system.button.sizes.medium.containerHeight, system.button.sizes.large.containerHeight])
    #expect(medium.paddingInline == 12 && medium.paddingInlineWithIcon == 8 && large.paddingInline == 16 && large.paddingInlineWithIcon == 12)
    #expect(medium.inputTypescale == system.typescale.body && large.inputTypescale == system.typescale.bodyLarge)
    #expect(medium.labelTypescale == system.typescale.label && medium.labelFloatedTypescale == system.typescale.labelSmall)
    #expect(medium.iconSize == system.measure.iconMedium && large.iconSize == system.measure.iconLarge)
    #expect(medium.cornerRadius == system.shape.small && medium.notchPadding == tokens.outlineNotchPadding && medium.affixGap == tokens.affixGap)
    var custom = tokens
    custom.sizes.large.containerHeight = 56
    custom.sizes.large.iconSize = 30
    #expect(appearance(size: .large, tokens: custom).containerHeight == 56 && appearance(size: .large, tokens: custom).iconSize == 30)
    #expect(appearance(size: .medium, tokens: custom).containerHeight == 36)
  }

  /// TXF-9 — an unknown variant or size draws the default value's tokens and is reported; an added value is used.
  @Test("TXF-9 unknown variant and size bind the defaults and are reported")
  func unknownAxes() {
    let (value, reports) = Reports.collecting {
      TanreiTextFieldAppearance(tokens: tokens, variant: TanreiTextFieldVariant(rawValue: "sparkly"), size: TanreiTextFieldSize(rawValue: "colossal"), state: .focused)
    }
    #expect(value == appearance(.outlined, .focused, size: .medium))
    #expect(reports.mention("text-field variant \"sparkly\"") && reports.mention("text-field size \"colossal\""))
    #expect(TanreiTextFieldVariant.fallback == .outlined && TanreiTextFieldSize.fallback == .medium)
    var custom = tokens
    var huge = tokens.sizes.large
    huge.containerHeight = 64
    custom.sizes.extra[TanreiTextFieldSize(rawValue: "colossal")] = huge
    let (added, silent) = Reports.collecting { TanreiTextFieldAppearance(tokens: custom, variant: .filled, size: TanreiTextFieldSize(rawValue: "colossal"), state: .enabled) }
    #expect(added.containerHeight == 64 && silent.messages.isEmpty)
  }

  /// TXF-14 — the label moves over the label motion and states over the state motion; both at once under Reduce Motion.
  @Test("TXF-14 the label and state motions come from the tokens; none under Reduce Motion")
  func motions() {
    var custom = tokens
    custom.motionLabelDuration = 300
    custom.motionLabelEasing = TanreiCubicBezier(0, 0, 1, 1)
    custom.motionStateDuration = 500
    #expect(custom.labelMotion(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.3))
    let easing = custom.motionStateEasing
    #expect(custom.stateMotion(reduceMotion: false) == Animation.timingCurve(easing.x1, easing.y1, easing.x2, easing.y2, duration: 0.5))
    #expect(custom.labelMotion(reduceMotion: true) == nil && custom.stateMotion(reduceMotion: true) == nil)
  }

  /// TXF-13 / TXF-16 — where the label goes and how tall the container is, from the tokens.
  @Test("TXF-13 TXF-16 the label's places and the container's height")
  func placement() {
    let outlined = appearance(.outlined)
    let o = metrics(outlined)
    #expect(o.minimumHeight == 36)
    #expect(o.restingLabelOrigin == CGPoint(x: outlined.paddingInline, y: 18 - o.labelLine / 2))  // centred in the input line
    #expect(o.floatedLabelOrigin == CGPoint(x: outlined.paddingInline, y: -o.floatedLine / 2))  // centred on the top edge
    // Beside a leading icon: resting at the input text, floated at padding-inline, over the icon.
    let icon = metrics(outlined, leading: true)
    #expect(icon.restingLabelOrigin.x == outlined.paddingInlineWithIcon + outlined.iconSize + outlined.containerGap)
    #expect(icon.floatedLabelOrigin.x == outlined.paddingInline)
    // A filled field that draws its label: 2 × padding-with-label + a floated line + an input line (46), the label at the
    // top when floated and centred when resting, at the input text in both.
    let filled = appearance(.filled)
    let f = TanreiTextFieldMetrics(appearance: filled, variant: .filled, labelDrawn: true, hasLeadingIcon: true, hasTrailingIcon: false, isMultiline: false) { $0.lineHeight }
    #expect(f.minimumHeight == 2 * filled.paddingBlockWithLabel + f.floatedLine + f.inputLine && f.minimumHeight == 46)
    #expect(f.floatedLabelOrigin == CGPoint(x: f.inputStart, y: filled.paddingBlockWithLabel))
    #expect(f.restingLabelOrigin == CGPoint(x: f.inputStart, y: (f.minimumHeight - f.labelLine) / 2))
    // Without a drawn label a filled field is its plain height.
    let plain = TanreiTextFieldMetrics(appearance: filled, variant: .filled, labelDrawn: false, hasLeadingIcon: false, hasTrailingIcon: false, isMultiline: false) { $0.lineHeight }
    #expect(plain.minimumHeight == 36)
    // Large: 50.
    let large = TanreiTextFieldMetrics(appearance: appearance(.filled, size: .large), variant: .filled, labelDrawn: true, hasLeadingIcon: false, hasTrailingIcon: false, isMultiline: false) { $0.lineHeight }
    #expect(large.minimumHeight == 50)
    // Multi-line: the label and icons align with the first line.
    let multi = metrics(outlined, multiline: true)
    #expect(multi.rowTop == outlined.paddingBlock && multi.restingLabelOrigin.y == outlined.paddingBlock + multi.inputLine / 2 - multi.labelLine / 2)
  }

  /// TXF-13 — the room a wrapped label takes: a resting label wraps inside a container that grows; a filled field's
  /// floated lines sit above the input line; an outlined field holds the floated lines above the last above its
  /// container. One plan, resting or floated.
  @Test("TXF-13 the room a label on several lines takes")
  func wrappedRoom() {
    let outlined = appearance(.outlined)
    let o = metrics(outlined)
    // One line each: exactly the one-line field.
    let one = o.room(resting: o.labelLine, floated: o.floatedLine)
    #expect(one == TanreiTextFieldRoom(base: 36, rowTop: o.rowTop, rowBottom: o.rowBottom, reservedAbove: 0, contentFloor: 0))
    // Two lines each: the container holds the resting lines and padding-block above and below; the input line stays
    // centred; the floated label's first line is held above the container.
    let two = o.room(resting: 2 * o.labelLine, floated: 2 * o.floatedLine)
    #expect(two.base == 2 * outlined.paddingBlock + 2 * o.labelLine && two.base == 52)
    #expect(two.rowTop == (52 - o.inputLine) / 2 && two.reservedAbove == o.floatedLine)
    #expect(o.restingLabelTop(height: 2 * o.labelLine, room: two) == outlined.paddingBlock)
    #expect(o.floatedLabelTop(height: 2 * o.floatedLine, room: two) == o.floatedLine / 2 - 2 * o.floatedLine)
    #expect(two.containerHeight(rowHeight: o.inputLine) == 52)
    // Filled: the floated lines above the input line, inside the container; the resting label centred in it.
    let filled = appearance(.filled)
    let f = TanreiTextFieldMetrics(appearance: filled, variant: .filled, labelDrawn: true, hasLeadingIcon: false, hasTrailingIcon: false, isMultiline: false) { $0.lineHeight }
    let fTwo = f.room(resting: 2 * f.labelLine, floated: 2 * f.floatedLine)
    #expect(fTwo.base == 2 * filled.paddingBlockWithLabel + 2 * f.floatedLine + f.inputLine && fTwo.reservedAbove == 0)
    #expect(fTwo.rowTop == filled.paddingBlockWithLabel + 2 * f.floatedLine)
    #expect(f.floatedLabelTop(height: 2 * f.floatedLine, room: fTwo) == filled.paddingBlockWithLabel)
    // Three resting lines outgrow the floated band: the band and the input line are centred in what they add.
    let fThree = f.room(resting: 3 * f.labelLine, floated: 2 * f.floatedLine)
    let band = 2 * f.floatedLine + f.inputLine
    #expect(fThree.base == 2 * filled.paddingBlockWithLabel + 3 * f.labelLine)
    #expect(fThree.rowTop == (fThree.base - band) / 2 + 2 * f.floatedLine && fThree.containerHeight(rowHeight: f.inputLine) == fThree.base)
    // Multi-line: the resting label's first line on the first input line, its lines below inside the row.
    let multi = metrics(outlined, multiline: true)
    let mTwo = multi.room(resting: 2 * multi.labelLine, floated: multi.floatedLine)
    #expect(mTwo.contentFloor == (multi.inputLine - multi.labelLine) / 2 + 2 * multi.labelLine)
    #expect(multi.restingLabelTop(height: 2 * multi.labelLine, room: mTwo) == multi.restingLabelOrigin.y)
    // The widths the label wraps in: the input's, resting; from where it floats to, floated.
    #expect(o.restingLabelWidth(in: 96) == 96 - 2 * outlined.paddingInline && o.floatedLabelWidth(in: 96) == 96 - 2 * outlined.paddingInline)
    let icon = metrics(outlined, leading: true, trailing: true)
    #expect(icon.restingLabelWidth(in: 200) == 200 - 2 * (outlined.paddingInlineWithIcon + outlined.iconSize + outlined.containerGap))
    #expect(icon.floatedLabelWidth(in: 200) == 200 - outlined.paddingInline - (outlined.paddingInlineWithIcon + outlined.iconSize + outlined.containerGap))
    // Without a drawn label nothing is reserved.
    let plain = metrics(outlined, labelDrawn: false)
    #expect(plain.room(resting: 100, floated: 100).reservedAbove == 0 && plain.room(resting: 100, floated: 100).base == 36)
  }

  /// TXF-22 — an interactive element in a slot stays in the accessibility tree; a decorative icon does not.
  @Test("TXF-22 an interactive element in a slot is told from a decorative icon")
  func interactiveSlot() {
    #expect(TanreiTextFieldSlot.isInteractive(TanreiIconButton("Clear", action: {}) { Image(systemName: "xmark") }))
    #expect(TanreiTextFieldSlot.isInteractive(TanreiIconButton("Clear", action: {}) { Image(systemName: "xmark") }.padding(2)))
    #expect(TanreiTextFieldSlot.isInteractive(Button("Clear") {}))
    #expect(!TanreiTextFieldSlot.isInteractive(Image(systemName: "magnifyingglass")))
    #expect(!TanreiTextFieldSlot.isInteractive(Rectangle()))
  }
}

// MARK: - Rendered (TXF-6, TXF-7, TXF-8, TXF-13, TXF-15, TXF-16, TXF-17, TXF-19, TXF-22, TXF-24)

@MainActor
@Suite("TanreiTextField rendered", .serialized)
struct TanreiTextFieldRenderedTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiTextFieldTokens { system.textField }

  /// TXF-16 / TXF-13 — the heights, the outline's gap under a floated label, the filled indicator and corners.
  @Test("TXF-13 TXF-16 heights, the outline's gap, the filled field's indicator and corners")
  func geometry() throws {
    let outlinedEmpty = try Snapshot.render(rendered(TanreiTextField("Email", text: .constant(""))))
    let outlinedFilled = try Snapshot.render(rendered(TanreiTextField("Email", text: .constant("ada@example.com"))))
    let filled = try Snapshot.render(rendered(TanreiTextField("Email", text: .constant("ada@example.com"), variant: .filled)))
    let large = try Snapshot.render(rendered(TanreiTextField("Email", text: .constant("ada@example.com"), size: .large)))
    func height(_ b: Bitmap) -> CGFloat { CGFloat(b.height) / Snapshot.scale - 2 * Snapshot.inset }
    #expect(height(outlinedEmpty) == 36 && height(outlinedFilled) == 36 && height(filled) == 46 && height(large) == 40)
    // The outline's top edge: drawn at the far end, open over the floated label (a gap), closed while it rests.
    let top = Snapshot.inset + tokens.outlineWidth / 2
    let labelMiddle = Snapshot.inset + tokens.sizes.medium.containerPaddingInline + 10
    let farEnd = Snapshot.inset + width - 20
    #expect(pixel(outlinedFilled, x: farEnd, y: top).isClose(to: light[.outline].rgba8()))
    #expect(!pixel(outlinedFilled, x: labelMiddle - 12, y: top).isClose(to: light[.outline].rgba8(), tolerance: 20))
    #expect(pixel(outlinedEmpty, x: labelMiddle - 12, y: top).isClose(to: light[.outline].rgba8()))
    // The filled field: its container, its indicator along the bottom, square bottom corners, rounded top corners.
    let bottom = Snapshot.inset + 46 - tokens.activeIndicatorWidth / 2
    #expect(pixel(filled, x: farEnd, y: bottom).isClose(to: light[.outline].rgba8()))
    #expect(pixel(filled, x: farEnd, y: Snapshot.inset + 3).isClose(to: light[.surfaceContainerHighest].rgba8()))
    #expect(pixel(filled, x: Snapshot.inset + 0.5, y: bottom - 1).isClose(to: light[.surfaceContainerHighest].rgba8(), tolerance: 12))
    #expect(pixel(filled, x: Snapshot.inset + 0.5, y: Snapshot.inset + 0.5).isClose(to: light[.surface].rgba8()))
  }

  /// TXF-16 — corners ease by the corner smoothing.
  @Test("TXF-16 corner smoothing reaches the field")
  func corners() throws {
    func render(_ amount: Double) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      custom.textField.containerShape = 12
      return try Snapshot.renderExact(rendered(TanreiTextField("Email", text: .constant(""), variant: .filled)), theme: theme(custom))
    }
    #expect(try render(0).mismatch(against: try render(0.6), channelTolerance: 0) > 0)
    #expect(try render(1).mismatch(against: try render(0.6), channelTolerance: 0) == 0)
  }

  /// TXF-15 — the placeholder shows only while the label is floated or hidden; the prefix and suffix likewise, in the
  /// affix color, the suffix at the end of the input line.
  @Test("TXF-15 placeholder, prefix and suffix")
  func affixesRendered() throws {
    var custom = system
    custom.textField.variants.outlined.enabled.placeholderColor = .role(.error)
    custom.textField.variants.outlined.enabled.affixColor = .role(.success)
    let resting = try Snapshot.render(rendered(TanreiTextField("Search", text: .constant(""), prompt: Text("█████"))), theme: theme(custom))
    let hidden = try Snapshot.render(rendered(TanreiTextField("Search", text: .constant(""), prompt: Text("█████")).labelsHidden()), theme: theme(custom))
    let x = Snapshot.inset + tokens.sizes.medium.containerPaddingInline + 4
    let y = Snapshot.inset + 18
    #expect(!pixel(resting, x: x, y: y).isClose(to: light[.error].rgba8(), tolerance: 8))
    if #available(macOS 15, iOS 18, *) {
      #expect(pixel(hidden, x: x, y: y).isClose(to: light[.error].rgba8(), tolerance: 8))
    }
    let amount = try Snapshot.render(rendered(TanreiTextField("Amount", text: .constant("120"), type: .number, prefix: "█", suffix: "█")), theme: theme(custom))
    #expect(pixel(amount, x: x, y: y).isClose(to: light[.success].rgba8(), tolerance: 8))
    let end = Snapshot.inset + width - tokens.sizes.medium.containerPaddingInline - 4
    #expect(pixel(amount, x: end, y: y).isClose(to: light[.success].rgba8(), tolerance: 8))
  }

  /// TXF-19 — the supporting row: `supporting-text.gap` below the container, the text at the input's start, the counter at
  /// the end, in their colors.
  @Test("TXF-19 the supporting row")
  func supportingRow() throws {
    var custom = system
    custom.textField.variants.outlined.enabled.supportingTextColor = .role(.error)
    custom.textField.variants.outlined.enabled.counterColor = .role(.success)
    custom.textField.supportingTextGap = 10
    let bitmap = try Snapshot.render(
      rendered(TanreiTextField("Name", text: .constant("██"), supportingText: "████", maxLength: 40, counter: true)), theme: theme(custom))
    let rowCentre = Snapshot.inset + 36 + 10 + tokens.supportingTextTypescale.lineHeight / 2
    #expect(pixel(bitmap, x: Snapshot.inset + tokens.sizes.medium.containerPaddingInline + 3, y: rowCentre).isClose(to: light[.error].rgba8(), tolerance: 8))
    let counterXs = (0..<bitmap.width).filter { bitmap[$0, Int(rowCentre * Snapshot.scale)].isClose(to: light[.success].rgba8(), tolerance: 30) }
    #expect(!counterXs.isEmpty)
    #expect(CGFloat(counterXs.max() ?? 0) / Snapshot.scale > Snapshot.inset + width - tokens.sizes.medium.containerPaddingInline - 4)
    #expect(CGFloat(bitmap.height) / Snapshot.scale >= 2 * Snapshot.inset + 36 + 10 + tokens.supportingTextTypescale.lineHeight)
  }

  /// TXF-22 — icons at the size's icon size, `padding-inline-with-icon` from the edge, in their parts' colors.
  @Test("TXF-22 the icons")
  func icons() throws {
    var custom = system
    custom.textField.variants.outlined.enabled.leadingIconColor = .role(.error)
    custom.textField.variants.outlined.enabled.trailingIconColor = .role(.success)
    let bitmap = try Snapshot.render(rendered(TanreiTextField("Search", text: .constant("x")) { Rectangle() } trailingIcon: { Rectangle() }), theme: theme(custom))
    let m = tokens.sizes.medium
    let y = Snapshot.inset + 18
    #expect(pixel(bitmap, x: Snapshot.inset + m.containerPaddingInlineWithIcon + 1, y: y).isClose(to: light[.error].rgba8()))
    #expect(pixel(bitmap, x: Snapshot.inset + m.containerPaddingInlineWithIcon + m.iconSize - 1, y: y).isClose(to: light[.error].rgba8()))
    #expect(!pixel(bitmap, x: Snapshot.inset + m.containerPaddingInlineWithIcon - 1, y: y).isClose(to: light[.error].rgba8()))
    #expect(pixel(bitmap, x: Snapshot.inset + width - m.containerPaddingInlineWithIcon - 1, y: y).isClose(to: light[.success].rgba8()))
  }

  /// TXF-24 — right to left: the leading icon on the right, the trailing on the left.
  @Test("TXF-24 right to left mirrors the field")
  func rightToLeft() throws {
    var custom = system
    custom.textField.variants.outlined.enabled.leadingIconColor = .role(.error)
    let bitmap = try Snapshot.render(
      rendered(TanreiTextField("Search", text: .constant("x")) { Rectangle() } trailingIcon: { EmptyView() }).environment(\.layoutDirection, .rightToLeft),
      theme: theme(custom))
    let m = tokens.sizes.medium
    #expect(pixel(bitmap, x: Snapshot.inset + width - m.containerPaddingInlineWithIcon - 1, y: Snapshot.inset + 18).isClose(to: light[.error].rgba8()))
    #expect(!pixel(bitmap, x: Snapshot.inset + m.containerPaddingInlineWithIcon + 1, y: Snapshot.inset + 18).isClose(to: light[.error].rgba8()))
  }

  /// TXF-13 (verify) — a field 96 wide whose label needs two lines, both variants, resting and floated: every line is
  /// drawn, inside the field, none over the input line; the field is taller than with a one-line label and keeps one
  /// height whether the label rests or floats; an outlined field holds the floated first line above its container and
  /// opens its gap by the widest line.
  @Test("TXF-13 a label that does not fit wraps, resting and floated, and the field grows (96 wide)", arguments: [TanreiTextFieldVariant.outlined, .filled])
  func wrappingLabel(_ variant: TanreiTextFieldVariant) throws {
    var custom = system
    custom.textField.variants.outlined.enabled.labelColor = .role(.error)
    custom.textField.variants.outlined.enabled.inputColor = .role(.success)
    custom.textField.variants.filled.enabled.labelColor = .role(.error)
    custom.textField.variants.filled.enabled.inputColor = .role(.success)
    let narrow: CGFloat = 96
    func render(_ label: String, _ value: String) throws -> Bitmap {
      try Snapshot.render(
        TanreiTextField(label, text: .constant(value), variant: variant).frame(width: narrow).environment(\.tanreiStaticTextInput, true),
        theme: theme(custom))
    }
    func height(_ b: Bitmap) -> CGFloat { CGFloat(b.height) / Snapshot.scale - 2 * Snapshot.inset }
    let resting = try render("Billing address", "")
    let floated = try render("Billing address", "██")
    let oneLine = try render("Name", "")
    let m = tokens.sizes.medium
    let floatedLine = m.labelFloatedTypescale.lineHeight

    // The field grows, and keeps one height whether the label rests or floats.
    #expect(height(resting) > height(oneLine))
    #expect(height(resting) == height(floated))

    // Every line drawn, inside the field, where the text runs.
    let restInk = Ink(resting, color: light[.error].rgba8())
    let floatInk = Ink(floated, color: light[.error].rgba8())
    let input = Ink(floated, color: light[.success].rgba8())
    #expect(restInk.lines.count == 2 && floatInk.lines.count == 2)
    for ink in [restInk, floatInk] {
      #expect(ink.left >= Snapshot.inset && ink.right <= Snapshot.inset + narrow - m.containerPaddingInline + 1)
    }
    // Floated, never over the input line.
    #expect(!input.lines.isEmpty && floatInk.bottom <= input.top)

    // The container's top edge: the first row of the outline (outlined) or of the fill (filled) in the middle.
    let edgeColor = variant == .outlined ? light[.outline].rgba8() : light[.surfaceContainerHighest].rgba8()
    let middle = Int((Snapshot.inset + narrow / 2) * Snapshot.scale)
    let edgeTolerance = variant == .outlined ? 20 : 3  // the fill is close to the page's surface
    let edgeRow = try #require((0..<resting.height).first { resting[middle, $0].isClose(to: edgeColor, tolerance: edgeTolerance) })
    let containerTop = CGFloat(edgeRow) / Snapshot.scale
    // A resting label wraps inside the container.
    #expect(restInk.top >= containerTop && restInk.bottom <= Snapshot.inset + height(resting))
    if variant == .outlined {
      // The floated label's first line is held above the container; its last line is centred on the top edge.
      #expect(abs(containerTop - (Snapshot.inset + floatedLine)) <= 0.5)
      let last = try #require(floatInk.lines.last)
      #expect(floatInk.lines[0].bottom <= containerTop && last.top < containerTop && last.bottom > containerTop)
      // The gap: the run of the top edge the outline does not draw, around the label, is as wide as the widest line
      // and its padding on each side.
      let row = Int((containerTop + tokens.outlineWidth / 2) * Snapshot.scale)
      let centre = Int((last.left + last.right) / 2 * Snapshot.scale)
      let isOutline = { (x: Int) in floated[x, row].isClose(to: light[.outline].rgba8(), tolerance: 20) }
      let gapLeft = CGFloat(((0..<centre).last { isOutline($0) } ?? 0) + 1) / Snapshot.scale
      let gapRight = CGFloat((centre..<floated.width).first { isOutline($0) } ?? floated.width) / Snapshot.scale
      #expect(abs((gapRight - gapLeft) - (floatInk.widest + 2 * tokens.outlineNotchPadding)) <= 3)
    } else {
      // A filled field's floated lines are inside its container, above the input line.
      #expect(abs(containerTop - Snapshot.inset) <= 0.5 && floatInk.top >= containerTop)
    }
  }

  /// TXF-17 — a multi-line field reserves minRows lines.
  @Test("TXF-17 a multi-line field starts at minRows lines")
  func multiline() throws {
    let bitmap = try Snapshot.render(rendered(TanreiTextField("Message", text: .constant(""), axis: .vertical, lineLimit: 3...Int.max)))
    let m = tokens.sizes.medium
    #expect(CGFloat(bitmap.height) / Snapshot.scale == 2 * Snapshot.inset + 2 * m.containerPaddingBlock + 3 * m.inputTypescale.lineHeight)
  }

  #if os(macOS)
  /// TXF-6 (verify) / TXF-7 — focus given as a click into the field gives it selects the focused state: the outline
  /// becomes focus-ring and thick; no focus ring is drawn under `ring`, a glow under `glow`. (TXF-8 — a press on the
  /// field outside its text, and in the extended hit area, focuses it — is tested in the gallery's UI tests: a synthetic
  /// click cannot reach SwiftUI's tap handling here.)
  @Test("TXF-6 TXF-7 focus shows on the field's edge; a glow only under glow")
  func focusedEdge() {
    for style in [TanreiFocusStyle.ring, .glow] {
      var system = TanreiSystem.tanrei
      system.textField.motionStateDuration = 0
      system.textField.motionLabelDuration = 0
      system.behavior.focusStyle = style
      let colors = system.colors.light
      let log = Log()
      let hosted = host(log, system: system)
      let edge = CGPoint(x: Snapshot.inset + width - 20, y: Snapshot.inset + system.measure.borderThick / 2)
      let outside = CGPoint(x: Snapshot.inset + width - 20, y: Snapshot.inset - 3)
      #expect(!(hosted.color(at: edge)?.isClose(to: colors[.focusRing].rgba8()) ?? true))
      #expect(hosted.focusTextField())
      hosted.settle(0.2)
      #expect(hosted.color(at: edge)?.isClose(to: colors[.focusRing].rgba8(), tolerance: 10) == true, "\(style)")
      let beyond = hosted.color(at: outside)
      if style == .ring {
        #expect(beyond?.isClose(to: colors[.surface].rgba8(), tolerance: 2) == true)
      } else {
        #expect(beyond?.isClose(to: colors[.surface].rgba8(), tolerance: 2) == false)
      }
      hosted.type("x")
      #expect(log.inputs == ["x"], "\(style)")
    }
  }
  #endif
}

// MARK: - Presets

@MainActor
@Suite("TanreiTextField under the shipped presets")
struct TanreiTextFieldPresetTests {
  /// Each preset's own values reach the field (no preset restates the focused container).
  @Test("TXF-6 TXF-16 the presets' own values reach the field", arguments: ShippedSystem.allCases)
  func presets(shipped: ShippedSystem) {
    let tokens = shipped.system.textField
    for variant in TanreiTextFieldVariant.core {
      let rest = appearance(variant, tokens: tokens)
      #expect(appearance(variant, .focused, tokens: tokens).container == rest.container, "\(shipped.rawValue) \(variant)")
      #expect(rest.containerHeight == tokens.sizes.medium.containerHeight)
    }
  }
}

// MARK: - Snapshots (one per spec fixture)

@MainActor
@Suite("TanreiTextField snapshots")
struct TanreiTextFieldSnapshotTests {
  struct Fixture: Sendable, CustomTestStringConvertible {
    let id: String
    var variant: TanreiTextFieldVariant = .outlined
    var size: TanreiTextFieldSize = .medium
    var type: TanreiTextFieldType = .text
    var label = "Email"
    var value = ""
    var labelHidden = false
    var placeholder = ""
    var supportingText = ""
    var errorText = ""
    var error = false
    var disabled = false
    var readOnly = false
    var multiline = false
    var minRows = 2
    var maxLength = 0
    var counter = false
    var prefix = ""
    var suffix = ""
    var icons = false
    var testDescription: String { id }
  }

  /// Mirrors `fixtures` in specs/text-field.spec.json.
  nonisolated static let fixtures: [Fixture] = [
    Fixture(id: "outlined-empty"),
    Fixture(id: "outlined-filled", value: "ada@example.com"),
    Fixture(id: "filled-empty", variant: .filled),
    Fixture(id: "filled-filled", variant: .filled, value: "ada@example.com"),
    Fixture(id: "outlined-large", size: .large, value: "ada@example.com"),
    Fixture(id: "filled-large", variant: .filled, size: .large, value: "ada@example.com"),
    Fixture(id: "outlined-label-hidden", type: .search, label: "Search", labelHidden: true, placeholder: "Search components"),
    Fixture(id: "outlined-supporting", value: "ada@example.com", supportingText: "We only use it to sign you in."),
    Fixture(id: "outlined-error", value: "ada@", errorText: "Enter a complete email address.", error: true),
    Fixture(id: "filled-error", variant: .filled, value: "ada@", errorText: "Enter a complete email address.", error: true),
    Fixture(id: "outlined-disabled", value: "ada@example.com", disabled: true),
    Fixture(id: "filled-disabled", variant: .filled, value: "ada@example.com", disabled: true),
    Fixture(id: "outlined-read-only", value: "ada@example.com", readOnly: true),
    Fixture(id: "outlined-icons", label: "Search", value: "tanrei", icons: true),
    Fixture(id: "outlined-affixes", type: .number, label: "Amount", value: "120", prefix: "$", suffix: "USD"),
    Fixture(id: "outlined-counter", label: "Display name", value: "Ada Lovelace", maxLength: 40, counter: true),
    Fixture(id: "outlined-multiline", label: "Message", value: "Thanks for the review.\nThe new tokens are in.", multiline: true, minRows: 3),
    Fixture(id: "filled-multiline", variant: .filled, label: "Message", value: "Thanks for the review.\nThe new tokens are in.", multiline: true, minRows: 3),
    Fixture(id: "outlined-password", type: .password, label: "Password", value: "correct horse"),
  ]

  /// The fixture as a product writes it, at a phone column's width. The icons of `outlined-icons` ("search", "close")
  /// are the SF Symbols a product would pass.
  static func view(_ fixture: Fixture) -> some View {
    let prompt = fixture.placeholder.isEmpty ? nil : Text(fixture.placeholder)
    let lines: ClosedRange<Int>? = fixture.multiline ? fixture.minRows...Int.max : nil
    return Group {
      if fixture.icons {
        TanreiTextField(
          fixture.label, text: .constant(fixture.value), prompt: prompt, variant: fixture.variant, size: fixture.size, type: fixture.type,
          supportingText: fixture.supportingText, errorText: fixture.errorText, error: fixture.error, readOnly: fixture.readOnly,
          axis: fixture.multiline ? .vertical : .horizontal, lineLimit: lines, maxLength: fixture.maxLength, counter: fixture.counter,
          prefix: fixture.prefix, suffix: fixture.suffix
        ) {
          Image(systemName: "magnifyingglass")
        } trailingIcon: {
          Image(systemName: "xmark")
        }
      } else if fixture.labelHidden {
        TanreiTextField(
          fixture.label, text: .constant(fixture.value), prompt: prompt, variant: fixture.variant, size: fixture.size, type: fixture.type
        )
        .labelsHidden()
      } else {
        TanreiTextField(
          fixture.label, text: .constant(fixture.value), prompt: prompt, variant: fixture.variant, size: fixture.size, type: fixture.type,
          supportingText: fixture.supportingText, errorText: fixture.errorText, error: fixture.error, readOnly: fixture.readOnly,
          axis: fixture.multiline ? .vertical : .horizontal, lineLimit: lines, maxLength: fixture.maxLength, counter: fixture.counter,
          prefix: fixture.prefix, suffix: fixture.suffix)
      }
    }
    .disabled(fixture.disabled)
    .frame(width: width)
    .environment(\.tanreiStaticTextInput, true)
  }

  @Test("fixture matches its baseline", arguments: fixtures)
  func fixture(_ fixture: Fixture) throws {
    try Snapshot.assert(Self.view(fixture), named: fixture.id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    let spec = try SpecFixture.load(spec: "text-field")
    #expect(spec.map(\.id) == Self.fixtures.map(\.id))
    for (theirs, ours) in zip(spec, Self.fixtures) {
      #expect(theirs.string("variant") == ours.variant.rawValue, "\(ours.id)")
      #expect((theirs.string("size") ?? "medium") == ours.size.rawValue, "\(ours.id)")
      #expect((theirs.string("type") ?? "text") == ours.type.rawValue, "\(ours.id)")
      #expect(theirs.string("label") == ours.label && (theirs.string("value") ?? "") == ours.value, "\(ours.id)")
      #expect((theirs.bool("labelHidden") ?? false) == ours.labelHidden && (theirs.string("placeholder") ?? "") == ours.placeholder, "\(ours.id)")
      #expect((theirs.string("supportingText") ?? "") == ours.supportingText && (theirs.string("errorText") ?? "") == ours.errorText, "\(ours.id)")
      #expect((theirs.bool("error") ?? false) == ours.error && (theirs.bool("disabled") ?? false) == ours.disabled, "\(ours.id)")
      #expect((theirs.bool("readOnly") ?? false) == ours.readOnly && (theirs.bool("multiline") ?? false) == ours.multiline, "\(ours.id)")
      #expect(Int(theirs.number("minRows") ?? 2) == ours.minRows && Int(theirs.number("maxLength") ?? 0) == ours.maxLength, "\(ours.id)")
      #expect((theirs.bool("counter") ?? false) == ours.counter, "\(ours.id)")
      #expect((theirs.string("prefixText") ?? "") == ours.prefix && (theirs.string("suffixText") ?? "") == ours.suffix, "\(ours.id)")
      #expect((theirs.content == "leading-icon=search trailing-icon=close") == ours.icons, "\(ours.id)")
    }
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiTextFieldTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiTextField preset snapshots")
struct TanreiTextFieldPresetSnapshotTests {
  /// A filled field with a value and a floated label: the preset's container, indicator, corners, label and type.
  nonisolated static let fixtureId = "filled-filled"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiTextFieldSnapshotTests.fixtures.contains { $0.id == Self.fixtureId })
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try #require(TanreiTextFieldSnapshotTests.fixtures.first { $0.id == Self.fixtureId })
    try Snapshot.assert(TanreiTextFieldSnapshotTests.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
