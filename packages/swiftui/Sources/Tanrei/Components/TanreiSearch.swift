import SwiftUI
#if os(iOS)
import UIKit
#elseif os(macOS)
import AppKit
#endif

// Spec: specs/search.spec.json — tokens: TanreiSearchTokens (comp.search), read from the design system in the environment
// (`system.search`), and `comp.text-field.selection.color` for selected text (SRC-3). Every design value in this file comes
// from a token; there are no literals, and no state's look is computed here.
//
// The bar edits text in SwiftUI's own `TextField`, as the text field does, and answers focus with its edge:
// the focused outline is its indicator. It also answers a press (SRC-19, SRC-20): a clear button behind the row
// — and over the input while the input has no focus — is the bar's press, through `TanreiPressTracking`. Its suggestions are
// read as data (each `TanreiSearchSuggestion` puts itself into a trait, as a menu's items do) so that the search knows them
// to move the active one (SRC-14), name them with their position (SRC-24) and emit `onSelect` with a value (SRC-15); each
// row is a button drawn with the list's and menu's row container (`TanreiItemRowContainer`). Focus stays in the input while
// the docked view is open (SRC-8): the rows take no keyboard focus, and the active suggestion is the search's
// own state. SwiftUI's `.searchable` is not used: its field and suggestions cannot take the tokens.
//
// The docked view is drawn in an overlay of the bar, not in a popover (which is modal at compact widths and would take focus
// from the field, SRC-8): it follows the bar, and SwiftUI draws it above what comes before the search and what the search's
// own container holds after it. The full-screen view is Tanrei's modal overlay:
// `.fullScreenCover` with the system transition off on iOS, as the dialog's; a sheet on macOS.

/// Where the search's view opens (spec prop `presentation`): docked under the bar (a large screen), or over the whole window
/// with its own header (a small screen). A closed set: `init(named:)` reads a spec name, and an unknown one is `.docked`,
/// reported in debug builds (SRC-27).
public enum TanreiSearchPresentation: String, CaseIterable, Sendable {
  case docked
  case fullScreen = "full-screen"

  /// The presentation a spec value names (`"full-screen"`); any other name is `.docked`, reported in debug builds (SRC-27).
  public init(named name: String) {
    if let presentation = TanreiSearchPresentation(rawValue: name) {
      self = presentation
    } else {
      TanreiDiagnostics.report("Tanrei: a search has no presentation \"\(name)\"; it is drawn docked (SRC-27)")
      self = .docked
    }
  }
}

/// Why the search closed its view (the spec's `toggle` reason, SRC-6), in Swift's casing.
public enum TanreiSearchToggleReason: String, CaseIterable, Sendable {
  case escape
  case back
  case select
  case submit
  case outside
  case tab
  case focusOut = "focus-out"
}

/// Lets people search the product from a bar, and offers suggestions while they type — in a view docked under the bar or
/// over the whole window (`presentation`).
///
///     @State private var query = ""
///     @State private var isSearching = false
///     TanreiSearch("Search mail", text: $query, isExpanded: $isSearching, prompt: Text("Search mail"), clearLabel: "Clear search",
///                  onSubmit: search, onSelect: open) {
///       TanreiSearchSuggestion("invoices", leadingIcon: "history", value: "invoices")
///       TanreiSearchSuggestion("Invoices", supportingText: "Folder · 24 messages", leadingIcon: "folder", value: "folder:invoices")
///     } leading: {
///       TanreiIconButton("Menu", icon: "menu", action: openDrawer)
///     } trailing: {
///       TanreiIconButton("Voice search", icon: "mic", action: listen)
///     } content: {
///       Text("No messages match.")
///     }
///
/// Every edit writes `text` — that is the spec's `input` (typing, deleting, pasting, the clear button, Escape); a value the
/// product writes is shown and emits nothing. Opening and closing the view write `isExpanded` — the spec's `toggle` — and call
/// `onToggle` with the new value and, when closing, the reason. The search opens it when the bar is pressed, when the
/// person types, or on Down Arrow, never on focus alone (SRC-5); it closes it on Escape, back, a choice, a submit, and while
/// docked on a press outside, Tab or focus leaving (SRC-6); the value stays. `onSubmit` is the action key with no suggestion
/// active (it carries the value, SRC-13); `onSelect` a suggestion chosen (it carries the suggestion's value, SRC-15) — the
/// search does not change `text` then: the product sets the value it wants. `disabled` follows `.disabled(_:)`, which also
/// reaches the icon buttons of the slots.
///
/// - Parameters:
///   - label: names the field, its view and its suggestions for assistive technology; never drawn. Required (SRC-27).
///   - prompt: the placeholder, shown while the value is empty; never the name.
///   - clearLabel: the clear button's name ("Clear search"); required while it can show (SRC-10).
///   - backLabel: the full-screen view's back button's name ("Back"); required for `.fullScreen` (SRC-11).
///   - suggestions: `TanreiSearchSuggestion`s, in order.
///   - leading: one icon button in place of the search glyph. `trailing`: up to two icon buttons at the bar's end.
///   - content: the product's own content in the view, after the suggestions (results, or a message when there are none).
public struct TanreiSearch<Suggestions: View, Leading: View, Trailing: View, Content: View>: View {
  let configuration: TanreiSearchConfiguration
  let text: Binding<String>
  let isExpanded: Binding<Bool>
  let suggestions: Suggestions
  let leading: Leading
  let trailing: Trailing
  let content: Content
  var isInPlace = false

  public init<S: StringProtocol>(
    _ label: S, text: Binding<String>, isExpanded: Binding<Bool>, presentation: TanreiSearchPresentation = .docked, prompt: Text? = nil,
    clearLabel: String = "", backLabel: String = "", onSubmit: @escaping @MainActor (String) -> Void = { _ in },
    onSelect: @escaping @MainActor (String) -> Void = { _ in }, onToggle: @escaping @MainActor (Bool, TanreiSearchToggleReason?) -> Void = { _, _ in },
    @ViewBuilder suggestions: () -> Suggestions, @ViewBuilder leading: () -> Leading, @ViewBuilder trailing: () -> Trailing,
    @ViewBuilder content: () -> Content
  ) {
    configuration = TanreiSearchConfiguration(
      label: String(label), presentation: presentation, prompt: prompt, clearLabel: clearLabel, backLabel: backLabel, onSubmit: onSubmit,
      onSelect: onSelect, onToggle: onToggle)
    self.text = text
    self.isExpanded = isExpanded
    self.suggestions = suggestions()
    self.leading = leading()
    self.trailing = trailing()
    self.content = content()
  }

  /// The search with its view drawn in place while expanded (fixtures and galleries only): a docked view under the bar, in the
  /// flow, at its natural height; a full-screen view filling the space it is given, without presenting anything (SRC-7's and
  /// SRC-9's verify).
  @_spi(Fixtures)
  public func inPlace() -> TanreiSearch {
    var search = self
    search.isInPlace = true
    return search
  }

  public var body: some View {
    _VariadicView.Tree(
      TanreiSearchRoot(
        configuration: configuration, text: text, isExpanded: isExpanded, leading: leading, trailing: trailing, content: content, isInPlace: isInPlace)
    ) {
      suggestions
    }
  }
}

extension TanreiSearch where Leading == EmptyView, Trailing == EmptyView, Content == EmptyView {
  /// A search with suggestions only.
  public init<S: StringProtocol>(
    _ label: S, text: Binding<String>, isExpanded: Binding<Bool>, presentation: TanreiSearchPresentation = .docked, prompt: Text? = nil,
    clearLabel: String = "", backLabel: String = "", onSubmit: @escaping @MainActor (String) -> Void = { _ in },
    onSelect: @escaping @MainActor (String) -> Void = { _ in }, onToggle: @escaping @MainActor (Bool, TanreiSearchToggleReason?) -> Void = { _, _ in },
    @ViewBuilder suggestions: () -> Suggestions
  ) {
    self.init(
      label, text: text, isExpanded: isExpanded, presentation: presentation, prompt: prompt, clearLabel: clearLabel, backLabel: backLabel,
      onSubmit: onSubmit, onSelect: onSelect, onToggle: onToggle, suggestions: suggestions, leading: { EmptyView() }, trailing: { EmptyView() },
      content: { EmptyView() })
  }
}

extension TanreiSearch where Leading == EmptyView, Trailing == EmptyView {
  /// A search with suggestions and the product's own content in its view.
  public init<S: StringProtocol>(
    _ label: S, text: Binding<String>, isExpanded: Binding<Bool>, presentation: TanreiSearchPresentation = .docked, prompt: Text? = nil,
    clearLabel: String = "", backLabel: String = "", onSubmit: @escaping @MainActor (String) -> Void = { _ in },
    onSelect: @escaping @MainActor (String) -> Void = { _ in }, onToggle: @escaping @MainActor (Bool, TanreiSearchToggleReason?) -> Void = { _, _ in },
    @ViewBuilder suggestions: () -> Suggestions, @ViewBuilder content: () -> Content
  ) {
    self.init(
      label, text: text, isExpanded: isExpanded, presentation: presentation, prompt: prompt, clearLabel: clearLabel, backLabel: backLabel,
      onSubmit: onSubmit, onSelect: onSelect, onToggle: onToggle, suggestions: suggestions, leading: { EmptyView() }, trailing: { EmptyView() },
      content: content)
  }
}

extension TanreiSearch where Content == EmptyView {
  /// A search with suggestions and icon buttons in its slots.
  public init<S: StringProtocol>(
    _ label: S, text: Binding<String>, isExpanded: Binding<Bool>, presentation: TanreiSearchPresentation = .docked, prompt: Text? = nil,
    clearLabel: String = "", backLabel: String = "", onSubmit: @escaping @MainActor (String) -> Void = { _ in },
    onSelect: @escaping @MainActor (String) -> Void = { _ in }, onToggle: @escaping @MainActor (Bool, TanreiSearchToggleReason?) -> Void = { _, _ in },
    @ViewBuilder suggestions: () -> Suggestions, @ViewBuilder leading: () -> Leading, @ViewBuilder trailing: () -> Trailing
  ) {
    self.init(
      label, text: text, isExpanded: isExpanded, presentation: presentation, prompt: prompt, clearLabel: clearLabel, backLabel: backLabel,
      onSubmit: onSubmit, onSelect: onSelect, onToggle: onToggle, suggestions: suggestions, leading: leading, trailing: trailing,
      content: { EmptyView() })
  }
}

/// Everything a search is given besides its value, its expanded state, its suggestions and its slots.
struct TanreiSearchConfiguration {
  let label: String
  let presentation: TanreiSearchPresentation
  let prompt: Text?
  let clearLabel: String
  let backLabel: String
  let onSubmit: @MainActor (String) -> Void
  let onSelect: @MainActor (String) -> Void
  let onToggle: @MainActor (Bool, TanreiSearchToggleReason?) -> Void
}

// MARK: - Suggestions

/// A choice offered while the person types (the spec's item kind `suggestion`): a query they searched before, a completion,
/// or a result the product can open. Named by its headline and described by its supporting text; choosing it calls the
/// search's `onSelect` with `value`.
///
///     TanreiSearchSuggestion("invoices", leadingIcon: "history", value: "invoices")
///     TanreiSearchSuggestion("Invoices", supportingText: "Folder · 24 messages", leadingIcon: .image(Image(systemName: "folder")),
///                            value: "folder:invoices")
public struct TanreiSearchSuggestion: View {
  let entry: TanreiSearchEntry

  /// - Parameters:
  ///   - headline: the suggestion's text, and its accessible name.
  ///   - supportingText: a second line under the headline, and its description.
  ///   - leadingIcon: a glyph of the icon font by name (`"history"`), or an image; `nil` or an empty name draws none.
  ///   - value: identifies the suggestion — `onSelect` carries it. Unique among the suggestions (SRC-27).
  public init<S: StringProtocol>(_ headline: S, supportingText: String = "", leadingIcon: TanreiItemIcon? = nil, value: String = "") {
    entry = TanreiSearchEntry(value: value, headline: String(headline), supportingText: supportingText, leadingIcon: leadingIcon)
  }

  public var body: some View {
    // The search draws the row itself from the trait.
    Color.clear
      .frame(width: .zero, height: .zero)
      .accessibilityHidden(true)
      ._trait(TanreiSearchEntryKey.self, entry)
  }
}

/// One suggestion as the search reads it.
struct TanreiSearchEntry {
  let value: String
  let headline: String
  let supportingText: String
  let leadingIcon: TanreiItemIcon?

  /// What identifies the suggestions as a list: a change of it leaves none active (SRC-14).
  var identity: String { "\(value)\u{1F}\(headline)" }
}

struct TanreiSearchEntryKey: _ViewTraitKey {
  static var defaultValue: TanreiSearchEntry? { nil }
}

/// Reads the suggestions — every `TanreiSearchSuggestion`'s trait, in order — and hands them to the search's body.
private struct TanreiSearchRoot<Leading: View, Trailing: View, Content: View>: _VariadicView_UnaryViewRoot {
  let configuration: TanreiSearchConfiguration
  let text: Binding<String>
  let isExpanded: Binding<Bool>
  let leading: Leading
  let trailing: Trailing
  let content: Content
  let isInPlace: Bool

  func body(children: _VariadicView.Children) -> some View {
    TanreiSearchBody(
      configuration: configuration, entries: children.compactMap { $0[TanreiSearchEntryKey.self] }, text: text, isExpanded: isExpanded,
      leading: leading, trailing: trailing, content: content, isInPlace: isInPlace)
  }
}

/// SRC-27: the trailing slot's icon buttons in a row, `container.gap` apart — more than two still laid out, and reported.
private struct TanreiSearchTrailingRoot: _VariadicView_UnaryViewRoot {
  let gap: CGFloat

  @ViewBuilder
  func body(children: _VariadicView.Children) -> some View {
    if children.count > TanreiSearchRules.maximumTrailing {
      let _ = TanreiDiagnostics.report(
        "Tanrei: a search's trailing slot holds \(children.count) elements; it takes at most \(TanreiSearchRules.maximumTrailing) (SRC-27)")
    }
    HStack(spacing: gap) {
      ForEach(children) { $0 }
    }
  }
}

// MARK: - Rules

/// The search's rules, pure: they are tested without a view.
enum TanreiSearchRules {
  /// SRC-27: the trailing slot's capacity.
  static let maximumTrailing = 2

  /// SRC-18: disabled, else pressed (held) over focused — by keyboard, pointer or touch: a field shows where typing goes —
  /// over hovered.
  static func barState(isEnabled: Bool, isPressed: Bool, isFocused: Bool, isHovered: Bool) -> TanreiInteraction {
    TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: isPressed, isFocused: isFocused, isHovered: isHovered)
  }

  /// SRC-17: pressed over active over hovered; the active suggestion takes the focused tokens. A pointer never makes one active.
  static func suggestionState(isEnabled: Bool, isPressed: Bool, isActive: Bool, isHovered: Bool) -> TanreiInteraction {
    TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: isPressed, isFocused: isActive, isHovered: isHovered)
  }

  /// SRC-10: the clear button shows while there is a value and the search is enabled.
  static func showsClear(value: String, isEnabled: Bool) -> Bool {
    !value.isEmpty && isEnabled
  }

  /// SRC-7: the docked view is drawn while expanded and it has content — a suggestion, or the product's own; SRC-26: never
  /// while disabled.
  static func showsDockedView(isExpanded: Bool, isEnabled: Bool, hasSuggestions: Bool, hasContent: Bool) -> Bool {
    isExpanded && isEnabled && (hasSuggestions || hasContent)
  }

  /// SRC-14 — Down Arrow: the next suggestion, the first while none is, staying on the last.
  static func next(after active: Int?, count: Int) -> Int? {
    guard count > 0 else { return nil }
    guard let active else { return 0 }
    return min(active + 1, count - 1)
  }

  /// SRC-14 — Up Arrow: the previous suggestion; none from the first (the input again), and none while none is.
  static func previous(before active: Int?, count: Int) -> Int? {
    guard count > 0, let active, active > 0 else { return nil }
    return min(active - 1, count - 1)
  }

  /// What Escape does in the input.
  enum EscapeAction: Equatable {
    /// SRC-6: expanded — close, reason escape.
    case close
    /// SRC-12: collapsed with a value — empty it, as a native search input does.
    case clear
    /// SRC-12: collapsed and empty — nothing; the key goes on to the enclosing element.
    case pass
  }

  static func escape(isExpanded: Bool, value: String) -> EscapeAction {
    if isExpanded { return .close }
    return value.isEmpty ? .pass : .clear
  }

  /// What the action key does in the input.
  enum EnterAction: Equatable {
    /// SRC-15: choose the active suggestion.
    case select(Int)
    /// SRC-13: submit the value.
    case submit
  }

  static func enter(active: Int?, count: Int) -> EnterAction {
    if let active, active >= 0, active < count { return .select(active) }
    return .submit
  }

  /// SRC-1: from the bar's start edge to its first element — the leading slot's icon button, or the search glyph.
  static func leadingPadding(hasLeadingButton: Bool, tokens: TanreiSearchTokens) -> CGFloat {
    hasLeadingButton ? tokens.containerPaddingInlineWithButton : tokens.containerPaddingInline
  }

  /// SRC-1: from the bar's last element to its end edge — an icon button (the clear button or the trailing slot's), or the
  /// input.
  static func trailingPadding(endsWithButton: Bool, tokens: TanreiSearchTokens) -> CGFloat {
    endsWithButton ? tokens.containerPaddingInlineWithButton : tokens.containerPaddingInline
  }

  /// SRC-24: a suggestion's position in the list (in English), as the menu says it.
  static func positionText(index: Int, count: Int) -> String {
    TanreiMenuRules.positionText(index: index, count: count)
  }

  /// SRC-27, SRC-10, SRC-11: what a search reports in debug builds.
  static func problems(
    label: String, entries: [TanreiSearchEntry], showsClear: Bool, clearLabel: String, drawsBack: Bool, backLabel: String
  ) -> [String] {
    var problems: [String] = []
    if label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      problems.append("a search's label is empty, so it has no accessible name (SRC-27); give it a label")
    }
    if showsClear && clearLabel.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      problems.append("a search's clear button shows but clearLabel is empty, so it has no accessible name (SRC-10)")
    }
    if drawsBack && backLabel.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      problems.append("a full-screen search's back button has no accessible name: backLabel is empty (SRC-11)")
    }
    var seen: Set<String> = []
    for entry in entries {
      if entry.value.isEmpty {
        problems.append("the suggestion \"\(entry.headline)\" has an empty value (SRC-27)")
      } else if !seen.insert(entry.value).inserted {
        problems.append("two suggestions share the value \"\(entry.value)\" (SRC-27)")
      }
      if entry.headline.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
        problems.append("a suggestion's headline is empty, so it has no accessible name (SRC-27)")
      }
    }
    return problems
  }
}

// MARK: - Token bindings

extension TanreiSearchTokens {
  /// SRC-18: colors and widths change over the state motion; `nil` under Reduce Motion.
  func stateMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionStateDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// SRC-20: the ripple grows over `motion.feedback-duration` with the state easing; `nil` under Reduce Motion (whole at once).
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// SRC-23: the view fades (and a docked one grows) in over the open motion; `nil` under Reduce Motion.
  func openMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionOpenDuration, easing: motionOpenEasing, reduceMotion: reduceMotion)
  }

  /// SRC-23: the view fades out over the close motion; `nil` under Reduce Motion.
  func closeMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionCloseDuration, easing: motionCloseEasing, reduceMotion: reduceMotion)
  }
}

/// Which token values the bar draws in one state, under one pressed feedback. Pure data read from a `TanreiSearchTokens`.
/// SRC-18 / SRC-26: every part from the tokens of the resolved state of the search's one condition; SRC-20: under `ripple`
/// and `dim` the container keeps the state beneath the press (and `ripple` grows the pressed container over it), under
/// `none` everything does.
struct TanreiSearchBarAppearance: Equatable {
  let container: TanreiPaint
  let ripple: TanreiPaint?
  let elevation: [TanreiShadowLayer]
  let outline: TanreiPaint
  let outlineWidth: CGFloat
  let leadingIcon: TanreiPaint
  let input: TanreiPaint
  let placeholder: TanreiPaint
  let caret: TanreiPaint
  /// SRC-3: selected text, the product's one selection color for text entry (`comp.text-field.selection.color`).
  let selection: TanreiPaint
  let opacity: Double
  let cornerRadius: CGFloat

  init(
    tokens: TanreiSearchTokens, selection: TanreiPaint, state: TanreiInteraction, feedback: TanreiPressedFeedback = .overlay,
    beneath: TanreiInteraction = .enabled, condition: TanreiSearchCondition = .fallback
  ) {
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    let conditionTokens = tokens.conditions[condition]
    let own = conditionTokens[state: layers.state]
    container = conditionTokens[state: layers.container].containerColor
    ripple = layers.ripple.map { conditionTokens[state: $0].containerColor }
    elevation = own.containerElevation
    outline = own.outlineColor
    leadingIcon = own.leadingIconColor
    input = own.inputColor
    placeholder = own.placeholderColor
    caret = own.caretColor
    self.selection = selection
    let shared = tokens[state: layers.state]
    // The vocabulary has no rest-state opacity or outline width group: at rest the bar is not dimmed and its edge has the
    // resting width.
    opacity = shared?.opacity ?? TanreiIdentity.opacity
    outlineWidth = shared?.outlineWidth ?? tokens.outlineWidth
    cornerRadius = tokens.containerShape
  }
}

/// Which token values a suggestion row draws in one state (SRC-17, SRC-20): its container, leading icon, headline,
/// supporting text and opacity from the tokens of its resolved state — the active one takes the focused tokens.
struct TanreiSearchSuggestionAppearance: Equatable {
  let container: TanreiPaint
  let ripple: TanreiPaint?
  let leadingIcon: TanreiPaint
  let headline: TanreiPaint
  let supportingText: TanreiPaint
  let opacity: Double
  let cornerRadius: CGFloat

  init(
    tokens: TanreiSearchTokens, state: TanreiInteraction, feedback: TanreiPressedFeedback = .overlay, beneath: TanreiInteraction = .enabled,
    condition: TanreiSearchCondition = .fallback
  ) {
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    let conditionTokens = tokens.conditions[condition]
    let own = conditionTokens[state: layers.state]
    container = conditionTokens[state: layers.container].suggestionContainerColor
    ripple = layers.ripple.map { conditionTokens[state: $0].suggestionContainerColor }
    leadingIcon = own.suggestionLeadingIconColor
    headline = own.suggestionHeadlineColor
    supportingText = own.suggestionSupportingTextColor
    opacity = tokens[state: layers.state]?.opacity ?? TanreiIdentity.opacity
    cornerRadius = tokens.suggestionContainerShape
  }
}

/// SRC-7 — where the docked view goes: below the bar, or above it when the room below (within the viewport margin of the
/// window's edge and of the on-screen keyboard) is less than the view needs and the room above is more (the menu's rule,
/// `TanreiMenuRoom`); and how tall it may be — the room on that side, beyond which it scrolls.
struct TanreiSearchRoom: Equatable {
  /// The bar's frame in its window's coordinates.
  var bar: CGRect = .zero
  /// The window's height; 0 while unknown (then the view opens below at its natural height).
  var window: CGFloat = .zero
  /// The top of the on-screen keyboard in the window; `nil` while there is none.
  var keyboardTop: CGFloat?
  /// The view's natural height.
  var view: CGFloat = .zero

  struct Placement: Equatable {
    let below: Bool
    /// The most the view may be; `nil`: its natural height.
    let height: CGFloat?
  }

  func placement(offset: CGFloat, margin: CGFloat) -> Placement {
    guard window > .zero else { return Placement(below: true, height: nil) }
    let bottom = min(window, keyboardTop ?? window)
    let flips = TanreiMenuRoom(anchor: bar, window: bottom, menu: view).flips(below: true, offset: offset, margin: margin)
    let room = flips ? bar.minY - offset - margin : bottom - bar.maxY - offset - margin
    return Placement(below: !flips, height: max(.zero, room))
  }
}

// MARK: - The search

/// The search's state and behaviour: the bar, the docked view, the full-screen presentation.
private struct TanreiSearchBody<Leading: View, Trailing: View, Content: View>: View {
  let configuration: TanreiSearchConfiguration
  let entries: [TanreiSearchEntry]
  let text: Binding<String>
  let isExpanded: Binding<Bool>
  let leading: Leading
  let trailing: Trailing
  let content: Content
  let isInPlace: Bool

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiTheme) private var theme
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.tanreiStaticTextInput) private var staticInput
  @TanreiPalette private var colors
  @FocusState private var inputFocused: Bool
  /// What the bar's text element holds (TXF-1): a change the person makes differs from `text` and is written to it once.
  @State private var draft: String
  /// SRC-14: the active suggestion, while the input keeps focus.
  @State private var active: Int?
  @State private var isHovered = false
  /// The platform's pressed state of the bar's press button (SRC-19).
  @State private var barPressDown = false
  /// SRC-19: Enter chose the active suggestion — its row shows the press.
  @State private var enterPress = TanreiSearchEnterPress()
  @State private var room = TanreiSearchRoom()
  @State private var outside = TanreiSearchOutsideWatch()
  #if os(macOS)
  @State private var clicks = TanreiTooltipEventMonitor()
  @State private var viewFrame: CGRect = .zero
  @State private var sheetSize: CGSize = .zero
  #endif
  /// The full-screen view: presented at all (it stays while it fades out), and shown (in) or fading out.
  @State private var isCovering = false
  @State private var isCoverShown = false

  init(
    configuration: TanreiSearchConfiguration, entries: [TanreiSearchEntry], text: Binding<String>, isExpanded: Binding<Bool>, leading: Leading,
    trailing: Trailing, content: Content, isInPlace: Bool
  ) {
    self.configuration = configuration
    self.entries = entries
    self.text = text
    self.isExpanded = isExpanded
    self.leading = leading
    self.trailing = trailing
    self.content = content
    self.isInPlace = isInPlace
    _draft = State(initialValue: text.wrappedValue)
  }

  private var tokens: TanreiSearchTokens { theme.system.search }
  private var presentation: TanreiSearchPresentation { configuration.presentation }
  private var hasContent: Bool { !TanreiSlotContent.isEmpty(content) }
  private var showsClear: Bool { TanreiSearchRules.showsClear(value: text.wrappedValue, isEnabled: isEnabled) }

  private var showsDockedView: Bool {
    presentation == .docked
      && TanreiSearchRules.showsDockedView(isExpanded: isExpanded.wrappedValue, isEnabled: isEnabled, hasSuggestions: !entries.isEmpty, hasContent: hasContent)
  }

  /// SRC-9: the full-screen view is presented while expanded, enabled and full-screen.
  private var showsFullScreen: Bool {
    presentation == .fullScreen && isExpanded.wrappedValue && isEnabled
  }

  var body: some View {
    let problems = TanreiSearchRules.problems(
      label: configuration.label, entries: entries, showsClear: showsClear, clearLabel: configuration.clearLabel,
      drawsBack: showsFullScreen && (isInPlace || isCovering), backLabel: configuration.backLabel)
    if !problems.isEmpty {
      let _ = problems.forEach { TanreiDiagnostics.report("Tanrei: \($0)") }
    }
    Group {
      if isInPlace {
        inPlaceBody
      } else {
        liveBody
      }
    }
    .onChange(of: draft) { _, newDraft in draftChanged(to: newDraft) }
    .onChange(of: text.wrappedValue) { _, value in
      // TXF-1: a value the product sets is shown and emits nothing.
      if value != draft { draft = value }
    }
    // SRC-14: a change of the suggestions leaves none active.
    .onChange(of: entries.map(\.identity)) { active = nil }
    .onChange(of: isExpanded.wrappedValue) { _, expanded in
      if !expanded { active = nil }
    }
  }

  // MARK: Fixtures

  /// SRC-7's and SRC-9's verify: the open view in place.
  @ViewBuilder
  private var inPlaceBody: some View {
    if showsFullScreen {
      fullScreenView(isModal: false, isShown: true)
    } else if showsDockedView {
      VStack(spacing: tokens.viewOffset) {
        bar
        dockedSurface(maxHeight: nil)
      }
    } else {
      bar
    }
  }

  // MARK: Live

  private var liveBody: some View {
    bar
      .overlay(alignment: .top) { dockedLayer }
      .background {
        // SRC-7: where the bar is in its window, how tall the window is, and where the keyboard is.
        GeometryReader { proxy in
          Color.clear
            .onAppear { room.bar = proxy.frame(in: .global) }
            .onChange(of: proxy.frame(in: .global)) { _, frame in room.bar = frame }
        }
        TanreiWindowHeightReader { room.window = $0 }
      }
      #if os(iOS)
      .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillChangeFrameNotification)) { note in
        guard let frame = note.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else { return }
        room.keyboardTop = frame.minY < room.window || room.window == .zero ? frame.minY : nil
      }
      .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)) { _ in room.keyboardTop = nil }
      #endif
      .onChange(of: inputFocused) { _, focused in
        guard !focused else { return }
        // SRC-6: focus left the docked search's input. Decided a turn later, so that a submit or a choice made by the same key
        // closes with its own reason first.
        Task { @MainActor in
          guard !inputFocused, isExpanded.wrappedValue, presentation == .docked else { return }
          close(.focusOut)
        }
      }
      #if os(macOS)
      .onChange(of: showsDockedView, initial: true) { _, open in
        // SRC-6: a press outside the bar and the view closes the docked view; it still reaches what is under it.
        if open {
          clicks.start { event in
            if case .press(let point) = event, !room.bar.contains(point), !viewFrame.contains(point) { close(.outside) }
            return false
          }
        } else {
          clicks.stop()
        }
      }
      .onDisappear { clicks.stop() }
      .sheet(isPresented: coverBinding) {
        // The window's content size, read when the view opened: a sheet is as large as the window it covers.
        fullScreenView(isModal: true, isShown: isCoverShown)
          .frame(width: sheetSize.width > .zero ? sheetSize.width : nil, height: sheetSize.height > .zero ? sheetSize.height : nil)
      }
      #else
      .fullScreenCover(isPresented: coverBinding) {
        fullScreenView(isModal: true, isShown: isCoverShown)
          .presentationBackground(.clear)
      }
      #endif
      .onChange(of: showsFullScreen, initial: true) { _, open in open ? presentFullScreen() : dismissFullScreen() }
      .onDisappear { if isCovering { TanreiModalCoordinator.shared.closed() } }
  }

  /// The docked view in the bar's overlay: below the bar (or above it, SRC-7), as wide as it, faded and grown in from the edge
  /// that faces the bar and faded out (SRC-23).
  @ViewBuilder
  private var dockedLayer: some View {
    GeometryReader { proxy in
      let placement = room.placement(offset: tokens.viewOffset, margin: tokens.viewViewportMargin)
      let layer = ZStack(alignment: placement.below ? .top : .bottom) {
        if showsDockedView {
          dockedSurface(maxHeight: placement.height)
            .transition(
              .asymmetric(
                insertion: .modifier(
                  active: TanreiSearchReveal(progress: .zero, below: placement.below),
                  identity: TanreiSearchReveal(progress: TanreiSearchReveal.shown, below: placement.below)
                ).animation(tokens.openMotion(reduceMotion: reduceMotion)),
                removal: .opacity.animation(tokens.closeMotion(reduceMotion: reduceMotion))))
        }
      }
      if let height = placement.height {
        layer
          .frame(width: proxy.size.width, height: height, alignment: placement.below ? .top : .bottom)
          .offset(y: placement.below ? proxy.size.height + tokens.viewOffset : -(tokens.viewOffset + height))
      } else {
        // The window is not known (macOS): below the bar, at its natural height.
        layer
          .frame(width: proxy.size.width)
          .fixedSize(horizontal: false, vertical: true)
          .offset(y: proxy.size.height + tokens.viewOffset)
      }
    }
  }

  /// The full-screen cover's own binding: SwiftUI writes `false` to it only when it dismisses the cover itself.
  private var coverBinding: Binding<Bool> {
    Binding(get: { isCovering }, set: { value in if !value { isCovering = false } })
  }

  private func presentFullScreen() {
    guard !isCovering else { return }
    TanreiModalCoordinator.shared.opened()
    #if os(macOS)
    sheetSize = NSApp.keyWindow?.contentLayoutRect.size ?? .zero
    #endif
    // The system's transition is off: Tanrei's motion is the view's (SRC-23).
    var transaction = Transaction()
    transaction.disablesAnimations = true
    withTransaction(transaction) { isCovering = true }
    Task(priority: .userInitiated) { @MainActor in
      withAnimation(tokens.openMotion(reduceMotion: reduceMotion)) { isCoverShown = true }
    }
  }

  private func dismissFullScreen() {
    guard isCovering else { return }
    TanreiModalCoordinator.shared.closed()
    // SRC-9 / SRC-23: focus returns to the bar's input when the view closes, not when the motion ends — and does not open the
    // view again (SRC-5: focus alone never does).
    inputFocused = true
    withAnimation(tokens.closeMotion(reduceMotion: reduceMotion)) { isCoverShown = false }
    let duration = reduceMotion ? .zero : tokens.motionCloseDuration
    Task(priority: .userInitiated) { @MainActor in
      try? await Task.sleep(for: .milliseconds(Int(duration)))
      guard !showsFullScreen else { return }
      var transaction = Transaction()
      transaction.disablesAnimations = true
      withTransaction(transaction) { isCovering = false }
      inputFocused = true
    }
  }

  // MARK: Behaviour

  /// SRC-5: ask to open — once; never while disabled.
  private func open() {
    guard isEnabled, !isExpanded.wrappedValue else { return }
    isExpanded.wrappedValue = true
    configuration.onToggle(true, nil)
  }

  /// SRC-6: ask to close, for `reason` — once; the value stays.
  private func close(_ reason: TanreiSearchToggleReason) {
    guard isExpanded.wrappedValue else { return }
    active = nil
    isExpanded.wrappedValue = false
    configuration.onToggle(false, reason)
  }

  /// The text element's binding (SRC-4 / TXF-1): every edit it writes is the value as it is written. Not from
  /// `onChange(of: draft)` alone: that runs once per update of the view, with the last of the edits made since the one
  /// before, so two keys that arrive between two updates would write `text` once. A disabled field's draft is put back
  /// by `draftChanged`, after the update.
  private var draftBinding: Binding<String> {
    Binding(
      get: { draft },
      set: { newDraft in
        guard newDraft != draft else { return }
        draft = newDraft
        if isEnabled { draftChanged(to: newDraft) }
      })
  }

  /// SRC-4 / TXF-1: a new draft from the text element — the person's edit — is the value, written once; it leaves no
  /// suggestion active and, while collapsed, opens the view (SRC-5, SRC-14). Called as the element writes it
  /// (`draftBinding`) and again once the view has updated with it, when it is already the value and does nothing.
  private func draftChanged(to newDraft: String) {
    guard newDraft != text.wrappedValue else { return }
    guard isEnabled else {
      draft = text.wrappedValue
      return
    }
    text.wrappedValue = newDraft
    active = nil
    open()
  }

  /// SRC-10 / SRC-12: empty the value — input once — and leave the view as it is.
  private func clearValue() {
    guard isEnabled, !text.wrappedValue.isEmpty else { return }
    draft = ""
    text.wrappedValue = ""
    active = nil
  }

  /// SRC-5: a press on the bar outside its buttons focuses the input and opens the view.
  private func pressBar() {
    guard isEnabled else { return }
    inputFocused = true
    open()
  }

  /// SRC-13 / SRC-15: the action key — the active suggestion, else submit, then close.
  private func enter() {
    guard isEnabled else { return }
    switch TanreiSearchRules.enter(active: active, count: entries.count) {
    case .select(let index):
      enterPress.press(index)
      select(index)
    case .submit:
      configuration.onSubmit(text.wrappedValue)
      close(.submit)
    }
  }

  /// SRC-15: select, then close; the value is the product's to change.
  private func select(_ index: Int) {
    guard isEnabled, entries.indices.contains(index) else { return }
    configuration.onSelect(entries[index].value)
    close(.select)
  }

  /// SRC-5, SRC-6, SRC-12, SRC-14: the keys of the input. `focus` moves focus to the input they were pressed in.
  private func key(_ press: KeyPress, focus: @escaping @MainActor () -> Void) -> KeyPress.Result {
    guard isEnabled else { return .ignored }
    switch press.key {
    case .downArrow:
      guard isExpanded.wrappedValue else {
        focus()
        open()
        return .handled
      }
      guard !entries.isEmpty else { return .ignored }
      active = TanreiSearchRules.next(after: active, count: entries.count)
      return .handled
    case .upArrow:
      guard isExpanded.wrappedValue, !entries.isEmpty else { return .ignored }
      active = TanreiSearchRules.previous(before: active, count: entries.count)
      return .handled
    case .escape:
      return escape() ? .handled : .ignored
    case .tab:
      tab()
      return .ignored
    case .leftArrow, .rightArrow, .home, .end:
      // SRC-14: moving the caret leaves none active.
      active = nil
      return .ignored
    default:
      // Shift+Tab arrives as the back-tab character.
      if press.characters == TanreiSearchKeys.backTab { tab() }
      return .ignored
    }
  }

  /// SRC-6: Tab or Shift+Tab closes the docked view, and then moves focus on as it would have (the key is not the search's).
  /// In the full-screen view focus stays inside it.
  private func tab() {
    guard presentation == .docked else { return }
    close(.tab)
  }

  /// SRC-6 / SRC-12: Escape; whether it was the search's.
  private func escape() -> Bool {
    switch TanreiSearchRules.escape(isExpanded: isExpanded.wrappedValue, value: text.wrappedValue) {
    case .close:
      close(.escape)
      return true
    case .clear:
      clearValue()
      return true
    case .pass:
      return false
    }
  }

  // MARK: The bar

  private var bar: some View {
    let feedback = theme.system.behavior.pressedFeedback
    // SRC-19: a press stays visible at least `duration.press-hold`; SRC-20: the point of contact only under `ripple`.
    return TanreiPressTracking(isPressed: barPressDown, watchesContact: feedback == .ripple) { press in
      barChrome(press: press, feedback: feedback)
    }
  }

  private func barChrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let tokens = self.tokens
    let state = TanreiSearchRules.barState(isEnabled: isEnabled, isPressed: press.isPressed, isFocused: inputFocused, isHovered: isHovered)
    let beneath = TanreiSearchRules.barState(isEnabled: isEnabled, isPressed: false, isFocused: inputFocused, isHovered: isHovered)
    let appearance = TanreiSearchBarAppearance(
      tokens: tokens, selection: theme.system.textField.selectionColor, state: state, feedback: feedback, beneath: beneath)
    let ripple = appearance.ripple.map { TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion)) }
    let hasLeading = !TanreiSlotContent.isEmpty(leading)
    let hasTrailing = !TanreiSlotContent.isEmpty(trailing)
    let showsClear = self.showsClear
    let row = HStack(spacing: tokens.containerGap) {
      if hasLeading {
        // SRC-25: the product's icon button, from its own tokens, its own focus stop before the input.
        leading
      } else {
        // SRC-2: the search glyph, unselected, decorative.
        TanreiSearchGlyph(kind: .search)
          .tanreiIconContext(size: tokens.leadingIconSize, selected: false)
          .foregroundStyle(colors[appearance.leadingIcon])
          .allowsHitTesting(false)
      }
      TanreiSearchField(
        label: configuration.label, prompt: configuration.prompt, draft: draftBinding, focus: $inputFocused, input: colors[appearance.input],
        placeholder: colors[appearance.placeholder], caret: colors[appearance.caret], typescale: tokens.inputTypescale, isStatic: staticInput,
        onKey: { key($0, focus: { inputFocused = true }) }, onSubmit: enter
      )
      .frame(maxWidth: .infinity)
      .overlay {
        // SRC-5: while the input has no focus, a press on it is the bar's: it shows the press and opens the view. Focused, the
        // input takes its own presses (the caret, the selection).
        if !inputFocused && isEnabled { pressButton(expandsTarget: false) }
      }
      if showsClear {
        clearButton(size: .small, focus: { inputFocused = true })
      }
      if hasTrailing {
        // SRC-25: after the clear button, each its own focus stop.
        _VariadicView.Tree(TanreiSearchTrailingRoot(gap: tokens.containerGap)) { trailing }
      }
    }
    .padding(.leading, TanreiSearchRules.leadingPadding(hasLeadingButton: hasLeading, tokens: tokens))
    .padding(.trailing, TanreiSearchRules.trailingPadding(endsWithButton: showsClear || hasTrailing, tokens: tokens))
    // SRC-1 / SRC-28: as wide as it is given, at least the container height, growing with one line of the input.
    .frame(maxWidth: .infinity, minHeight: tokens.containerHeight)

    // SRC-5 / SRC-19 / SRC-22: the bar's press behind the row, its hit area reaching the minimum target above and below.
    return row
      .background { pressButton(expandsTarget: true) }
      // SRC-18 / SRC-20 / SRC-21: the fill, elevation, ripple and edge (inside the bar's edge: its focus indicator) of the
      // state, corners eased by the corner smoothing, and the state's opacity on the whole bar.
      .modifier(
        TanreiContainerLayers(
          fill: colors[appearance.container], elevation: appearance.elevation, cornerRadius: appearance.cornerRadius, outline: colors[appearance.outline],
          outlineWidth: appearance.outlineWidth, ripple: ripple, opacity: appearance.opacity))
      .animation(tokens.stateMotion(reduceMotion: reduceMotion), value: state)
      // SRC-18: no focus ring around the bar — its edge is the indicator; under `glow`, the glow around it too.
      .tanreiFocusRing(theme.system.behavior.focusStyle == .glow && state == .focused, cornerRadius: appearance.cornerRadius)
      .onHover { isHovered = $0 }
      #if os(iOS)
      .background {
        // SRC-6: a touch outside the bar and the view closes the docked view.
        if showsDockedView && !isInPlace { TanreiTouchObserver { point in outside.touch(inside: point != nil) { close(.outside) } } }
      }
      #endif
  }

  /// The bar's press: a button that draws nothing and is no element of its own (the field is), and takes no keyboard focus.
  private func pressButton(expandsTarget: Bool) -> some View {
    Button(action: pressBar) { Color.clear.contentShape(Rectangle()) }
      .buttonStyle(TanreiSearchPressStyle(isPressed: $barPressDown, expandsTarget: expandsTarget))
      .focusable(false)
      .accessibilityHidden(true)
  }

  /// SRC-10: a standard Tanrei icon button showing close, named by `clearLabel`; it empties the value and moves focus to its
  /// input, opening and closing nothing.
  private func clearButton(size: TanreiIconButtonSize, focus: @escaping @MainActor () -> Void) -> some View {
    TanreiIconButton(configuration.clearLabel, size: size, action: {
      clearValue()
      focus()
    }) {
      TanreiChipGlyph(kind: .close)
    }
  }

  // MARK: The view

  /// SRC-7: the docked view's surface — its color, elevation and corners, the content clipped to them and inset — holding the
  /// suggestions and the product's content, scrolling beyond `maxHeight`.
  private func dockedSurface(maxHeight: CGFloat?) -> some View {
    let tokens = self.tokens
    let shape = TanreiCornerShape(cornerRadius: tokens.viewContainerShape, style: theme.system.shape.roundedCornerStyle)
    return Group {
      if let maxHeight {
        ViewThatFits(in: .vertical) {
          viewColumn(scrolls: false)
          viewColumn(scrolls: true)
        }
        .frame(maxHeight: maxHeight)
      } else {
        viewColumn(scrolls: false)
      }
    }
    .clipShape(shape)
    .background { TanreiElevationSurface(tokens.viewContainerElevation, fill: colors[tokens.viewContainerColor], cornerRadius: tokens.viewContainerShape) }
    .background {
      GeometryReader { proxy in
        Color.clear
          .onAppear { measureView(proxy) }
          .onChange(of: proxy.frame(in: .global)) { measureView(proxy) }
      }
    }
    #if os(iOS)
    .background {
      if !isInPlace { TanreiTouchObserver { point in outside.touch(inside: point != nil) { close(.outside) } } }
    }
    #endif
  }

  private func measureView(_ proxy: GeometryProxy) {
    #if os(macOS)
    viewFrame = proxy.frame(in: .global)
    #endif
  }

  /// The suggestions and the product's content, in the view's padding; scrolling (and scrolling the active suggestion into
  /// view, SRC-14) when `scrolls`.
  private func viewColumn(scrolls: Bool) -> some View {
    let column = TanreiSearchViewColumn(
      label: configuration.label, entries: entries, active: active, enterPress: enterPress, content: content, hasContent: hasContent,
      select: select
    )
    .background {
      GeometryReader { proxy in
        Color.clear
          .onAppear { room.view = proxy.size.height }
          .onChange(of: proxy.size.height) { _, height in room.view = height }
      }
    }
    return Group {
      if scrolls {
        ScrollViewReader { reader in
          TanreiScrollRegion(axis: .vertical) { column }
            .onChange(of: active) { _, index in if let index { reader.scrollTo(index) } }
        }
      } else {
        column
      }
    }
  }

  /// SRC-9: the full-screen view.
  private func fullScreenView(isModal: Bool, isShown: Bool) -> some View {
    TanreiSearchFullScreen(
      configuration: configuration, entries: entries, draft: draftBinding, value: text.wrappedValue, active: active, enterPress: enterPress,
      content: content,
      hasContent: hasContent, isModal: isModal, isShown: isShown, showsClear: showsClear,
      onKey: { press, focus in key(press, focus: focus) }, onSubmit: enter, onSelect: select, onBack: { close(.back) },
      onEscape: { _ = escape() }, onClear: clearValue)
  }
}

/// The press of the bar: reports the platform's pressed state to the bar, whose chrome draws it; `expandsTarget` grows the
/// button's frame to the minimum target (SRC-22).
private struct TanreiSearchPressStyle: ButtonStyle {
  let isPressed: Binding<Bool>
  let expandsTarget: Bool

  func makeBody(configuration: Configuration) -> some View {
    let label = configuration.label
      .onChange(of: configuration.isPressed) { _, down in isPressed.wrappedValue = down }
    if expandsTarget {
      label.tanreiHitTargetExpansion()
    } else {
      label
    }
  }
}

/// Keys the SwiftUI key names do not cover.
enum TanreiSearchKeys {
  /// Shift+Tab, as AppKit delivers it.
  static let backTab = "\u{19}"
}

/// SRC-19: Enter chose suggestion `index`; each press counts.
struct TanreiSearchEnterPress: Equatable {
  private(set) var index: Int?
  private(set) var count = 0

  mutating func press(_ index: Int) {
    self.index = index
    count += 1
  }

  /// The key presses row `index` shows.
  func presses(of index: Int) -> Int {
    self.index == index ? count : .zero
  }
}

/// SRC-6 on iOS — a touch outside the bar and the view: each of them watches the touches of the window and says whether one
/// began inside it; a touch that none of them holds closes the docked view. It still reaches what is under it.
@MainActor
final class TanreiSearchOutsideWatch {
  private var inside = false
  private var isPending = false

  func touch(inside isInside: Bool, close: @escaping @MainActor () -> Void) {
    inside = inside || isInside
    guard !isPending else { return }
    isPending = true
    // Every watcher hears a touch in the same event: decide once they all have.
    Task { @MainActor in
      if !self.inside { close() }
      self.inside = false
      self.isPending = false
    }
  }
}

/// SRC-23: the docked view growing from its edge that faces the bar, and fading.
private struct TanreiSearchReveal: ViewModifier {
  static let shown: CGFloat = 1

  let progress: CGFloat
  let below: Bool

  func body(content: Content) -> some View {
    content
      .opacity(Double(progress))
      .scaleEffect(x: Self.shown, y: progress, anchor: below ? .top : .bottom)
  }
}

// MARK: - The input

/// SRC-3 / SRC-4 / SRC-24: the platform's own text element on one line, in the input's text style and colors, with the
/// placeholder under it while the value is empty (never the name), the caret in the caret color, the search keyboard, and
/// exposed as a search field named by the label.
private struct TanreiSearchField: View {
  let label: String
  let prompt: Text?
  @Binding var draft: String
  let focus: FocusState<Bool>.Binding
  let input: Color
  let placeholder: Color
  let caret: Color
  let typescale: TanreiTextStyle
  /// Snapshots only: the text element drawn as text (`ImageRenderer` cannot draw it).
  let isStatic: Bool
  let onKey: @MainActor (KeyPress) -> KeyPress.Result
  let onSubmit: @MainActor () -> Void

  var body: some View {
    ZStack(alignment: .leading) {
      if draft.isEmpty, let prompt {
        prompt
          .tanreiTextStyle(typescale)
          .foregroundStyle(placeholder)
          .lineLimit(1)
          .accessibilityHidden(true)
          .allowsHitTesting(false)
      }
      Group {
        if isStatic {
          Text(verbatim: draft)
            .lineLimit(1)
            .frame(maxWidth: .infinity, alignment: .leading)
        } else {
          TextField(text: $draft) { Text(verbatim: label) }
        }
      }
      .textFieldStyle(.plain)
      .labelsHidden()
      .lineLimit(1)
      .tanreiTextStyle(typescale)
      .foregroundStyle(input)
      // SRC-3: the caret color. SwiftUI draws the selection highlight from the same tint, not from
      // `comp.text-field.selection.color`.
      .tint(caret)
      .focused(focus)
      .modifier(TanreiSearchFieldTraits())
      // SRC-13 / SRC-15: the action key.
      .onSubmit(onSubmit)
      // SRC-5, SRC-6, SRC-12, SRC-14: arrows, Escape, Tab.
      .onKeyPress(phases: .down, action: onKey)
      // SRC-24: a search field named by the label, never by the placeholder.
      .accessibilityLabel(Text(verbatim: label))
      .accessibilityAddTraits(.isSearchField)
    }
  }
}

/// SRC-4 / TXF-20 for the search type: a general keyboard whose action key reads as search, with the corrections of a search.
private struct TanreiSearchFieldTraits: ViewModifier {
  func body(content: Content) -> some View {
    #if os(iOS)
    content
      .keyboardType(TanreiTextFieldPlatform.keyboard(.search))
      .textInputAutocapitalization(TanreiTextFieldPlatform.capitalizes(.search) ? .sentences : .never)
      .autocorrectionDisabled(!TanreiTextFieldPlatform.corrects(.search))
      .submitLabel(.search)
    #else
    content
      .autocorrectionDisabled(!TanreiTextFieldPlatform.corrects(.search))
    #endif
  }
}

// MARK: - The view's column

/// The suggestions as rows across the view, then the product's content inset by the rows' padding (SRC-29), in the view's
/// padding (SRC-7). The suggestions are a group named by the label (SRC-24).
private struct TanreiSearchViewColumn<Content: View>: View {
  let label: String
  let entries: [TanreiSearchEntry]
  let active: Int?
  let enterPress: TanreiSearchEnterPress
  let content: Content
  let hasContent: Bool
  let select: @MainActor (Int) -> Void

  @Environment(\.tanreiTheme) private var theme
  @TanreiPalette private var colors

  var body: some View {
    let tokens = theme.system.search
    // SRC-16: the icon column in every row while any suggestion has an icon.
    let hasIcon = entries.contains { $0.leadingIcon.drawn != nil }
    VStack(alignment: .leading, spacing: .zero) {
      if !entries.isEmpty {
        VStack(spacing: .zero) {
          ForEach(Array(entries.enumerated()), id: \.offset) { index, entry in
            TanreiSearchSuggestionRow(
              entry: entry, index: index, count: entries.count, hasIcon: hasIcon, isActive: active == index,
              keyPresses: enterPress.presses(of: index), select: { select(index) }
            )
            .id(index)
          }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(Text(verbatim: label))
      }
      if hasContent {
        // SRC-29: the product's content in the headline color as its foreground, plain text in the body style, inset as the
        // rows' content is.
        content
          .foregroundStyle(colors[tokens.conditions[.fallback].enabled.suggestionHeadlineColor])
          .tanreiFont(theme.system.typescale.body)
          .padding(.horizontal, tokens.suggestionContainerPaddingInline)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
    }
    .padding(.vertical, tokens.viewPaddingBlock)
    .padding(.horizontal, tokens.viewPaddingInline)
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

// MARK: - A suggestion

/// One suggestion's row: a button drawn by `TanreiSearchSuggestionStyle` that takes no keyboard focus (the input keeps it,
/// SRC-8), named by its headline, described by its supporting text, with its position in the list (SRC-24).
private struct TanreiSearchSuggestionRow: View {
  let entry: TanreiSearchEntry
  let index: Int
  let count: Int
  let hasIcon: Bool
  let isActive: Bool
  let keyPresses: Int
  let select: @MainActor () -> Void

  var body: some View {
    Button(action: select) { Text(verbatim: entry.headline) }
      .buttonStyle(TanreiSearchSuggestionStyle(entry: entry, hasIcon: hasIcon, isActive: isActive, keyPresses: keyPresses))
      .focusable(false)
      .accessibilityLabel(Text(verbatim: entry.headline))
      .modifier(TanreiSearchHint(text: entry.supportingText))
      .accessibilityValue(Text(verbatim: TanreiSearchRules.positionText(index: index, count: count)))
  }
}

private struct TanreiSearchHint: ViewModifier {
  let text: String

  func body(content: Content) -> some View {
    if text.isEmpty { content } else { content.accessibilityHint(Text(verbatim: text)) }
  }
}

struct TanreiSearchSuggestionStyle: ButtonStyle {
  let entry: TanreiSearchEntry
  let hasIcon: Bool
  let isActive: Bool
  var keyPresses = 0

  func makeBody(configuration: Configuration) -> some View {
    TanreiSearchSuggestionChrome(entry: entry, hasIcon: hasIcon, isActive: isActive, isPressed: configuration.isPressed, keyPresses: keyPresses)
  }
}

/// SRC-16 / SRC-17 / SRC-19 / SRC-20: the row — the icon column, the headline over the supporting text, both wrapping — in the
/// row container of its state (fill, ripple, corners, opacity, the focus ring inside it while active, never animated).
struct TanreiSearchSuggestionChrome: View {
  let entry: TanreiSearchEntry
  let hasIcon: Bool
  let isActive: Bool
  let isPressed: Bool
  var keyPresses = 0

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiTheme) private var theme
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    let feedback = theme.system.behavior.pressedFeedback
    // SRC-19: a press — by pointer, touch or Enter — stays visible at least `duration.press-hold`.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyPresses, watchesContact: feedback == .ripple) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let system = theme.system
    let tokens = system.search
    let state = TanreiSearchRules.suggestionState(isEnabled: isEnabled, isPressed: press.isPressed, isActive: isActive, isHovered: isHovered)
    let beneath = TanreiSearchRules.suggestionState(isEnabled: isEnabled, isPressed: false, isActive: isActive, isHovered: isHovered)
    let appearance = TanreiSearchSuggestionAppearance(tokens: tokens, state: state, feedback: feedback, beneath: beneath)
    let ripple = appearance.ripple.map { TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion)) }
    return HStack(alignment: .center, spacing: tokens.suggestionContainerGap) {
      if hasIcon {
        // SRC-16: the family and fill of an unselected icon; an empty column keeps its width.
        Group {
          if let icon = entry.leadingIcon.drawn {
            TanreiItemIconView(icon: icon, size: tokens.suggestionLeadingIconSize, selected: false)
          } else {
            Color.clear
          }
        }
        .frame(width: tokens.suggestionLeadingIconSize, height: tokens.suggestionLeadingIconSize)
        .foregroundStyle(colors[appearance.leadingIcon])
      }
      VStack(alignment: .leading, spacing: .zero) {
        text(entry.headline, style: tokens.suggestionHeadlineTypescale, color: appearance.headline)
        if !entry.supportingText.isEmpty {
          text(entry.supportingText, style: tokens.suggestionSupportingTextTypescale, color: appearance.supportingText)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(.horizontal, tokens.suggestionContainerPaddingInline)
    .padding(.vertical, tokens.suggestionContainerPaddingBlock)
    // SRC-16: at least the row height and the minimum target; rows grow with their text.
    .frame(maxWidth: .infinity, minHeight: max(tokens.suggestionContainerHeight, TanreiHitTarget.minimum(in: system.measure)), alignment: .leading)
    .modifier(
      TanreiItemRowContainer(
        fill: colors[appearance.container], ripple: ripple, cornerRadius: appearance.cornerRadius, opacity: appearance.opacity,
        motion: tokens.stateMotion(reduceMotion: reduceMotion), state: state, condition: TanreiSearchCondition.fallback,
        showsFocusRing: isActive && isEnabled))
    .onHover { isHovered = $0 }
  }

  /// SRC-16: a text of the row in its role and color; it wraps rather than being cut.
  private func text(_ string: String, style: TanreiTextStyle, color: TanreiPaint) -> some View {
    Text(verbatim: string)
      .multilineTextAlignment(.leading)
      .fixedSize(horizontal: false, vertical: true)
      .tanreiTextStyle(style)
      .foregroundStyle(colors[color])
  }
}

// MARK: - The full-screen view

/// SRC-9: the view over the whole window — the view's color to every edge, and inside the safe area its header (the back
/// button, the input with the same value, the clear button), a divider across it, and the suggestions and the product's
/// content, scrolling. Modal: a modal element named by the label, focus moved to its input as it opens; the escape gesture
/// closes it.
private struct TanreiSearchFullScreen<Content: View>: View {
  let configuration: TanreiSearchConfiguration
  let entries: [TanreiSearchEntry]
  @Binding var draft: String
  let value: String
  let active: Int?
  let enterPress: TanreiSearchEnterPress
  let content: Content
  let hasContent: Bool
  let isModal: Bool
  let isShown: Bool
  let showsClear: Bool
  let onKey: @MainActor (KeyPress, @escaping @MainActor () -> Void) -> KeyPress.Result
  let onSubmit: @MainActor () -> Void
  let onSelect: @MainActor (Int) -> Void
  let onBack: @MainActor () -> Void
  let onEscape: @MainActor () -> Void
  let onClear: @MainActor () -> Void

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.tanreiStaticTextInput) private var staticInput
  @TanreiPalette private var colors
  @FocusState private var focused: Bool

  var body: some View {
    let tokens = theme.system.search
    // The header's input is no bar: it is drawn in the colors of the resting state.
    let rest = tokens.conditions[.fallback].enabled
    VStack(spacing: .zero) {
      HStack(spacing: tokens.containerGap) {
        // SRC-11: back, mirrored right to left, named by backLabel.
        TanreiIconButton(configuration.backLabel, size: .medium, action: onBack) { TanreiSearchGlyph(kind: .back) }
        TanreiSearchField(
          label: configuration.label, prompt: configuration.prompt, draft: $draft, focus: $focused, input: colors[rest.inputColor],
          placeholder: colors[rest.placeholderColor], caret: colors[rest.caretColor], typescale: tokens.inputTypescale, isStatic: staticInput,
          onKey: { onKey($0, { focused = true }) }, onSubmit: onSubmit
        )
        .frame(maxWidth: .infinity)
        if showsClear {
          // SRC-10: medium in the header.
          TanreiIconButton(configuration.clearLabel, size: .medium, action: {
            onClear()
            focused = true
          }) {
            TanreiChipGlyph(kind: .close)
          }
        }
      }
      .padding(.horizontal, tokens.headerPaddingInline)
      // SRC-28: at least the header height, growing to hold one line of the input.
      .frame(maxWidth: .infinity, minHeight: tokens.headerHeight)
      // SRC-9: the divider across the window; decorative.
      Rectangle()
        .fill(colors[tokens.dividerColor])
        .frame(height: tokens.dividerThickness)
        .accessibilityHidden(true)
      ScrollViewReader { reader in
        TanreiScrollRegion(axis: .vertical) {
          TanreiSearchViewColumn(
            label: configuration.label, entries: entries, active: active, enterPress: enterPress, content: content, hasContent: hasContent,
            select: onSelect)
        }
        .onChange(of: active) { _, index in if let index { reader.scrollTo(index) } }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .background {
      Rectangle()
        .fill(colors[tokens.viewContainerColor])
        .ignoresSafeArea()
    }
    // SRC-23: the fade (at once where motion is reduced: the presenter's animation is then none).
    .opacity(isShown ? TanreiSearchReveal.shown : .zero)
    // SRC-24: a modal dialog named by the label (SwiftUI has no dialog role).
    .accessibilityElement(children: .contain)
    .accessibilityAddTraits(isModal ? .isModal : [])
    .accessibilityLabel(Text(verbatim: configuration.label))
    // SRC-6: the escape gesture closes it.
    .accessibilityAction(.escape) { onEscape() }
    .onAppear {
      // SRC-9: focus moves to the header's input as the view opens (the caret goes to the end of the value).
      if isModal { focused = true }
    }
  }
}

// MARK: - Glyphs

/// A glyph the search draws itself (SRC-2, SRC-11): the search glyph and the back arrow. With the icon font — the family,
/// fill, weight and optical size of the slot's context — its `search` / `arrow_back` glyph; without it (or under the
/// platform-font policy) a vector in the same box, stroked at `sys.border.thick` as the chip's drawn glyphs are. The back
/// arrow mirrors in a right-to-left layout; the search glyph does not.
struct TanreiSearchGlyph: View {
  enum Kind: String, Sendable {
    case search
    case back = "arrow_back"
  }

  let kind: Kind

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.tanreiIconContext) private var context

  var body: some View {
    let context = context ?? TanreiIconContext(size: theme.system.search.leadingIconSize, selected: false)
    let stroke = StrokeStyle(lineWidth: theme.system.measure.borderThick, lineCap: .square, lineJoin: .miter)
    Group {
      if theme.system.icon.slotFont(context, policy: theme.fontFamilyPolicy) != nil {
        // A glyph of the font is text: it mirrors only when told to.
        TanreiIconGlyph(kind.rawValue)
          .flipsForRightToLeftLayoutDirection(kind == .back)
      } else {
        switch kind {
        case .search:
          // SwiftUI would mirror the shape: the magnifier keeps its handle at the bottom right.
          TanreiSearchMagnifierShape().stroke(style: stroke)
            .environment(\.layoutDirection, .leftToRight)
        case .back:
          TanreiSearchBackArrowShape().stroke(style: stroke)
        }
      }
    }
    .frame(width: context.size, height: context.size)
    .accessibilityHidden(true)
  }
}

/// The icon set's `search` in fractions of its box: a ring and its handle (the shape of a glyph, not a design value).
struct TanreiSearchMagnifierShape: Shape {
  static let center: CGFloat = 0.42
  static let radius: CGFloat = 0.25
  static let handleEnd: CGFloat = 0.84

  func path(in rect: CGRect) -> Path {
    func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: rect.minX + x * rect.width, y: rect.minY + y * rect.height) }
    var path = Path()
    let center = point(Self.center, Self.center)
    let radius = Self.radius * min(rect.width, rect.height)
    path.addEllipse(in: CGRect(x: center.x - radius, y: center.y - radius, width: 2 * radius, height: 2 * radius))
    // The handle starts on the ring, at 45°.
    let start = Self.center + Self.radius / CGFloat(2).squareRoot()
    path.move(to: point(start, start))
    path.addLine(to: point(Self.handleEnd, Self.handleEnd))
    return path
  }
}

/// The icon set's `arrow_back` in fractions of its box: a shaft and its head, pointing to the start (the shape of a glyph,
/// not a design value). SwiftUI mirrors it right to left.
struct TanreiSearchBackArrowShape: Shape {
  static let tip: CGFloat = 0.2
  static let tail: CGFloat = 0.8
  static let head: CGFloat = 0.3

  func path(in rect: CGRect) -> Path {
    func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: rect.minX + x * rect.width, y: rect.minY + y * rect.height) }
    var path = Path()
    path.move(to: point(Self.tail, 0.5))
    path.addLine(to: point(Self.tip, 0.5))
    path.move(to: point(Self.tip + Self.head, 0.5 - Self.head))
    path.addLine(to: point(Self.tip, 0.5))
    path.addLine(to: point(Self.tip + Self.head, 0.5 + Self.head))
    return path
  }
}
