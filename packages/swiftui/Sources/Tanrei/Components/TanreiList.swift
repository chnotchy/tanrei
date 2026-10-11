import SwiftUI

// Spec: specs/list.spec.json — tokens: TanreiListTokens (comp.list), read from the design system in the environment
// (`system.list`). Every design value in this file comes from a token; there are no literals, and no state's look is
// computed here. An interactive item or an option is pressed like Button: press, hold, ripple, focus ring
// and container layers are the shared primitives, and LST-8, LST-9 and LST-10 are BTN-8, BTN-9 and BTN-10 for the list
// item. The item kind `list-item` is `TanreiListItem`; the list's `selection` (none, single, multiple) is the
// type of its binding, as SwiftUI's `List(selection:)` has it.

/// How an item's leading slot is framed (spec item prop `leadingMedia`). A closed set: a frame is drawn by code, not
/// chosen by values.
public enum TanreiListLeadingMedia: String, CaseIterable, Sendable {
  /// The leading slot is not drawn; `leadingIcon` is.
  case none
  /// A round box of `comp.list.avatar.size`, for a person's photo or monogram.
  case avatar
  /// A rounded square of `comp.list.image.size`, for a thumbnail.
  case image

  /// The frame a spec value names, for UI built from data (`"avatar"`, `"image"`). LST-7: any other name is `.none`,
  /// the default, and is reported in debug builds (`TanreiDiagnostics`).
  public init(named name: String) {
    if let media = TanreiListLeadingMedia(rawValue: name) {
      self = media
    } else {
      TanreiDiagnostics.report("Tanrei: a list item has no leadingMedia \"\(name)\"; using \"none\" (LST-7)")
      self = .none
    }
  }
}

/// Whether people choose a list's items (spec prop `selection`: none, single, multiple). On SwiftUI it is the type of
/// the list's binding: none without one, single with a `Binding<V?>`, multiple with a `Binding<Set<V>>`.
enum TanreiListSelectionMode: String, Sendable {
  case none
  case single
  case multiple
}

/// A column of related items that people read, open one by one, or choose from.
///
///     TanreiList {                                                        // selection none: static and interactive rows
///       TanreiListItem("Wi-Fi", supportingText: "Connected", leadingIcon: "wifi", trailingIcon: "chevron_right", action: openWifi)
///       TanreiListItem("Airplane mode", trailing: { TanreiSwitch("Airplane mode", isOn: $airplane).labelsHidden() })
///     }
///     TanreiList(selection: $theme, label: "Theme") {                     // single: a Binding<V?>
///       TanreiListItem("Light").tag("light")
///       TanreiListItem("Dark").tag("dark")
///     }
///     TanreiList(selection: $labels, label: "Labels") { … }              // multiple: a Binding<Set<V>>
///
/// The list draws nothing and adds no space around its items (LST-16): place it on a surface, in a card, or in your own
/// `ScrollView` / `LazyVStack` — it neither scrolls nor virtualizes. With a binding every item is an option, selected
/// while the binding holds its tag (`.tag(_:)`, applied to the `TanreiListItem` itself); activating one writes the
/// binding, which is the spec's `change` (LST-13, LST-14). `label` names the list (required with a binding, LST-23).
///
/// Keyboard (LST-15): a list with interactive items or options is one tab stop; Up and Down Arrow move without
/// wrapping, Home and End to the ends, typing to the next headline that begins with what was typed; Space and Enter
/// activate. Moving focus never changes the selection.
public struct TanreiList<SelectionValue: Hashable, Content: View>: View {
  private let mode: TanreiListSelectionMode
  private let label: LocalizedStringKey
  private let hasLabel: Bool
  private let single: Binding<SelectionValue?>?
  private let multiple: Binding<Set<SelectionValue>>?
  private let content: Content

  @State private var model = TanreiListModel()

  /// A list whose items are single-selected: the option whose tag `selection` holds is selected; `nil` selects none.
  public init(selection: Binding<SelectionValue?>, label: LocalizedStringKey, @ViewBuilder content: () -> Content) {
    self.init(mode: .single, label: label, single: selection, multiple: nil, content: content())
  }

  /// A list whose items are multiple-selected: every option whose tag `selection` holds is selected.
  public init(selection: Binding<Set<SelectionValue>>, label: LocalizedStringKey, @ViewBuilder content: () -> Content) {
    self.init(mode: .multiple, label: label, single: nil, multiple: selection, content: content())
  }

  fileprivate init(
    mode: TanreiListSelectionMode, label: LocalizedStringKey, single: Binding<SelectionValue?>?, multiple: Binding<Set<SelectionValue>>?,
    content: Content
  ) {
    self.mode = mode
    self.label = label
    hasLabel = label != ""
    self.single = single
    self.multiple = multiple
    self.content = content
    // LST-23: a listbox without a name.
    if mode != .none && !hasLabel {
      TanreiDiagnostics.report("Tanrei: a selectable list has no label, so the listbox has no accessible name (LST-23); say what the options are")
    }
  }

  public var body: some View {
    let model = self.model
    let selected = self.selected
    VStack(alignment: .leading, spacing: .zero) { content }
      .environment(\.tanreiListContext, TanreiListContext(mode: mode, selected: selected, model: model, choose: choose))
      .onPreferenceChange(TanreiListEntriesKey.self) { entries in
        MainActor.assumeIsolated { model.update(entries, selected: selected.map(TanreiListEntry.key(of:))) }
      }
      .onChange(of: selected) { _, now in model.update(model.entries, selected: now.map(TanreiListEntry.key(of:))) }
      // The items belong to this list only: an enclosing list does not count them.
      .transformPreference(TanreiListEntriesKey.self) { $0 = [] }
      // LST-12: a container named by label. SwiftUI has no list or listbox role.
      .accessibilityElement(children: .contain)
      .modifier(TanreiListName(label: hasLabel ? label : nil))
  }

  /// LST-26: the values the binding selects now.
  var selected: Set<AnyHashable> {
    switch mode {
    case .none: return []
    case .single: return single?.wrappedValue.map { [AnyHashable($0)] } ?? []
    case .multiple: return Set(multiple?.wrappedValue.map { AnyHashable($0) } ?? [])
    }
  }

  var selectionMode: TanreiListSelectionMode { mode }

  /// The single route to the binding (LST-13, LST-14): single writes the option's value unless it is already selected (a
  /// single choice is never cleared by its own option); multiple adds or removes it. A value of another type than the
  /// binding's selects nothing.
  func choose(_ value: AnyHashable) {
    guard let typed = value.base as? SelectionValue else { return }
    switch mode {
    case .none:
      return
    case .single:
      guard let single, single.wrappedValue != typed else { return }
      single.wrappedValue = typed
    case .multiple:
      guard let multiple else { return }
      var values = multiple.wrappedValue
      if values.contains(typed) { values.remove(typed) } else { values.insert(typed) }
      multiple.wrappedValue = values
    }
  }
}

extension TanreiList where SelectionValue == Never {
  /// A list whose items are not chosen (selection none): static items, and interactive ones (`TanreiListItem(…, action:)`).
  /// `label` names the list for assistive technology; optional.
  public init(label: LocalizedStringKey = "", @ViewBuilder content: () -> Content) {
    self.init(mode: .none, label: label, single: nil, multiple: nil, content: content())
  }
}

private struct TanreiListName: ViewModifier {
  let label: LocalizedStringKey?

  func body(content: Content) -> some View {
    if let label { content.accessibilityLabel(Text(label)) } else { content }
  }
}

// MARK: - The item

/// One row of a `TanreiList` (the spec's item kind `list-item`): a headline with an optional overline, supporting text,
/// leading icon or media and trailing text, icon or control.
///
///     TanreiListItem("Inbox", leadingIcon: "inbox", trailingText: "12")                                 // static
///     TanreiListItem("Ada Lovelace", supportingText: "Edited the roadmap", leadingMedia: .avatar) { Text("A") }
///     TanreiListItem("Wi-Fi", supportingText: "Connected", trailingIcon: "chevron_right", action: openWifi)  // interactive
///     TanreiListItem("Light").tag("light")                                                               // an option
///
/// Three kinds of row (LST-12): in a list with a selection binding every item is an option, chosen by its `.tag(_:)`;
/// otherwise the initializer with `action:` makes it one button (as `Button`), and one without is static — it draws no
/// state, is not focusable, ignores `disabled`, and may hold the product's own control in `trailing:`. `disabled`
/// follows `.disabled(_:)`.
///
/// **An interactive item or an option must hold no interactive element** in its slots (LST-24): the whole row is one
/// button, so VoiceOver could not reach such an element, and SwiftUI cannot look inside a slot to report one.
public struct TanreiListItem<Leading: View, Trailing: View>: View {
  let row: TanreiListRow
  let action: (@MainActor () -> Void)?
  let leading: Leading
  let trailing: Trailing
  /// The option's value: set by `.tag(_:)`.
  var value: AnyHashable?

  @Environment(\.tanreiListContext) private var context
  @Environment(\.isEnabled) private var isEnabled
  @FocusState private var isFocused: Bool
  /// Counts activations by key: each one starts a press that no pointer held down (LST-8).
  @State private var keyboardPresses = 0
  @State private var id = TanreiListItemID()

  /// A static item with both slots: the leading slot's content framed by `leadingMedia`, and a control of the product's
  /// own at the end of the row.
  public init<S: StringProtocol>(
    _ headline: S, overline: String = "", supportingText: String = "", supportingLineLimit: Int? = nil, trailingText: String = "",
    leadingIcon: TanreiItemIcon? = nil, trailingIcon: TanreiItemIcon? = nil, leadingMedia: TanreiListLeadingMedia = .none, divider: Bool = false,
    @ViewBuilder leading: () -> Leading, @ViewBuilder trailing: () -> Trailing
  ) {
    self.row = TanreiListRow(
      headline: String(headline), overline: overline, supportingText: supportingText, supportingLineLimit: supportingLineLimit, trailingText: trailingText,
      leadingIcon: leadingIcon, trailingIcon: trailingIcon, leadingMedia: leadingMedia, divider: divider)
    self.action = nil
    self.leading = leading()
    self.trailing = trailing()
  }

  /// LST-1 (the spec's `interactive` and `click`): the whole row is one button that calls `action`. The leading slot is
  /// framed by `leadingMedia`; an interactive item has no trailing slot (LST-24).
  public init<S: StringProtocol>(
    _ headline: S, overline: String = "", supportingText: String = "", supportingLineLimit: Int? = nil, trailingText: String = "",
    leadingIcon: TanreiItemIcon? = nil, trailingIcon: TanreiItemIcon? = nil, leadingMedia: TanreiListLeadingMedia = .none, divider: Bool = false,
    action: @escaping @MainActor () -> Void, @ViewBuilder leading: () -> Leading
  ) where Trailing == EmptyView {
    self.row = TanreiListRow(
      headline: String(headline), overline: overline, supportingText: supportingText, supportingLineLimit: supportingLineLimit, trailingText: trailingText,
      leadingIcon: leadingIcon, trailingIcon: trailingIcon, leadingMedia: leadingMedia, divider: divider)
    self.action = action
    self.leading = leading()
    self.trailing = EmptyView()
  }

  /// The option's value (the spec's item prop `value`): the list's selection binding selects the option whose tag it
  /// holds. Apply it to the `TanreiListItem` itself, before any other modifier: the item reads it, SwiftUI's own `tag`
  /// does not reach it (LST-26 reports an option without one in debug builds).
  public func tag<V: Hashable>(_ tag: V) -> TanreiListItem {
    var item = self
    item.value = AnyHashable(tag)
    return item
  }

  /// An optional tag: `nil` gives the option no value.
  public func tag<V: Hashable>(_ tag: V?) -> TanreiListItem {
    var item = self
    item.value = tag.map { AnyHashable($0) }
    return item
  }

  public var body: some View {
    let kind = self.kind
    let isSelected = self.isSelected
    let condition: TanreiListCondition = isSelected ? .selected : .unselected
    let model = context?.model
    // The list's actions for this item: give it keyboard focus (LST-15).
    if kind != .static { model?.register(id, focus: { isFocused = true }) }
    let entry = TanreiListEntry(
      id: id, headline: row.headline, isFocusable: kind != .static, isEnabled: isEnabled, isOption: kind == .option,
      value: value.map(TanreiListEntry.key(of:)), isSelected: isSelected)
    return Group {
      if kind == .static {
        // LST-11: not focusable, no state, `disabled` ignored; a control in the trailing slot keeps its own semantics.
        TanreiListItemChrome(row: row, condition: .unselected, isActive: false, showsMark: false, isPressed: false, isFocused: false, leading: leading, trailing: trailing)
          .modifier(TanreiListStaticSemantics(row: row, position: model?.positionText(of: id)))
      } else {
        Button(action: { activate(isEnabled: isEnabled) }) { Text(verbatim: row.headline) }
          .buttonStyle(
            TanreiListItemStyle(
              row: row, condition: condition, showsMark: kind == .option, isFocused: isFocused, keyboardPresses: keyboardPresses, leading: leading))
          .focused($isFocused)
          // Tanrei draws its own ring (LST-4); the system focus effect would double it.
          .focusEffectDisabled()
          // LST-15: in a list, only its tab stop takes keyboard focus.
          .modifier(TanreiListTabStop(isTabStop: model.map { $0.isTabStop(id) }))
          // LST-1 / LST-8: Enter and Space activate, once per key press, and show the press from the center.
          .tanreiKeyActivation(isEnabled: isEnabled) {
            keyboardPresses += 1
            activate(isEnabled: isEnabled)
          }
          // LST-15: typeahead — nearer the button than the activation, so a Space that continues a search is typed.
          .onKeyPress(phases: .down) { press in
            guard let model, press.modifiers.isDisjoint(with: [.command, .control, .option]) else { return .ignored }
            return model.type(press.characters, from: id) ? .handled : .ignored
          }
          // LST-15: Up and Down Arrow, Home and End move focus without wrapping; they never select.
          .onKeyPress(keys: TanreiRovingKeys.movementKeys, phases: .down) { press in
            guard let model else { return .ignored }
            return model.move(from: id, key: press.key) ? .handled : .ignored
          }
          .onChange(of: isFocused) { _, focused in if focused { model?.didFocus(id) } }
          // LST-23: named by the headline, described by the overline, supporting and trailing text (in full, even when
          // cut), with its position; LST-12: an option has its selected state.
          .accessibilityLabel(Text(verbatim: row.headline))
          .modifier(TanreiListDescription(description: row.accessibilityDescription))
          .modifier(TanreiOptionalAccessibilityValue(value: model?.positionText(of: id)))
          .accessibilityAddTraits(isSelected ? .isSelected : [])
      }
    }
    .preference(key: TanreiListEntriesKey.self, value: [entry])
  }

  /// LST-12: an option in a list with a selection binding, else one action while it has `action:`, else static.
  var kind: TanreiListItemKind {
    if let context, context.mode != .none { return .option }
    return action == nil ? .static : .interactive
  }

  /// LST-26: selected while the list's binding holds the option's value.
  var isSelected: Bool {
    guard kind == .option, let value, let context else { return false }
    return context.selected.contains(value)
  }

  /// The single route to an activation (LST-1, LST-2, LST-13, LST-14): once, never while disabled; an interactive item
  /// calls its action, an option writes the list's binding.
  func activate(isEnabled: Bool) {
    guard isEnabled else { return }
    switch kind {
    case .static: return
    case .interactive: action?()
    case .option:
      if let value { context?.choose(value) }
    }
  }
}

extension TanreiListItem where Leading == EmptyView, Trailing == EmptyView {
  /// A static item: text, icons and trailing text.
  public init<S: StringProtocol>(
    _ headline: S, overline: String = "", supportingText: String = "", supportingLineLimit: Int? = nil, trailingText: String = "",
    leadingIcon: TanreiItemIcon? = nil, trailingIcon: TanreiItemIcon? = nil, divider: Bool = false
  ) {
    self.init(
      headline, overline: overline, supportingText: supportingText, supportingLineLimit: supportingLineLimit, trailingText: trailingText,
      leadingIcon: leadingIcon, trailingIcon: trailingIcon, divider: divider, leading: { EmptyView() }, trailing: { EmptyView() })
  }

  /// An interactive item: the whole row is one button that calls `action` (the spec's `click`).
  public init<S: StringProtocol>(
    _ headline: S, overline: String = "", supportingText: String = "", supportingLineLimit: Int? = nil, trailingText: String = "",
    leadingIcon: TanreiItemIcon? = nil, trailingIcon: TanreiItemIcon? = nil, divider: Bool = false, action: @escaping @MainActor () -> Void
  ) {
    self.init(
      headline, overline: overline, supportingText: supportingText, supportingLineLimit: supportingLineLimit, trailingText: trailingText,
      leadingIcon: leadingIcon, trailingIcon: trailingIcon, divider: divider, action: action, leading: { EmptyView() })
  }
}

extension TanreiListItem where Trailing == EmptyView {
  /// A static item whose leading slot holds media framed by `leadingMedia` (an avatar's photo or monogram, an image).
  public init<S: StringProtocol>(
    _ headline: S, overline: String = "", supportingText: String = "", supportingLineLimit: Int? = nil, trailingText: String = "",
    trailingIcon: TanreiItemIcon? = nil, leadingMedia: TanreiListLeadingMedia, divider: Bool = false, @ViewBuilder leading: () -> Leading
  ) {
    self.init(
      headline, overline: overline, supportingText: supportingText, supportingLineLimit: supportingLineLimit, trailingText: trailingText,
      trailingIcon: trailingIcon, leadingMedia: leadingMedia, divider: divider, leading: leading, trailing: { EmptyView() })
  }
}

extension TanreiListItem where Leading == EmptyView {
  /// A static item with a control of the product's own at the end of the row (a switch named by the headline).
  public init<S: StringProtocol>(
    _ headline: S, overline: String = "", supportingText: String = "", supportingLineLimit: Int? = nil, trailingText: String = "",
    leadingIcon: TanreiItemIcon? = nil, trailingIcon: TanreiItemIcon? = nil, divider: Bool = false, @ViewBuilder trailing: () -> Trailing
  ) {
    self.init(
      headline, overline: overline, supportingText: supportingText, supportingLineLimit: supportingLineLimit, trailingText: trailingText,
      leadingIcon: leadingIcon, trailingIcon: trailingIcon, divider: divider, leading: { EmptyView() }, trailing: trailing)
  }
}

/// LST-12: which of the three kinds of row an item is.
enum TanreiListItemKind: Sendable {
  case `static`
  case interactive
  case option
}

/// The text and decoration of one row: what every kind of item draws.
struct TanreiListRow {
  let headline: String
  let overline: String
  let supportingText: String
  /// LST-18: the lines of supporting text shown before an ellipsis; `nil` or 0 shows all of it.
  let supportingLineLimit: Int?
  let trailingText: String
  let leadingIcon: TanreiItemIcon?
  let trailingIcon: TanreiItemIcon?
  let leadingMedia: TanreiListLeadingMedia
  let divider: Bool

  init(
    headline: String, overline: String = "", supportingText: String = "", supportingLineLimit: Int? = nil, trailingText: String = "",
    leadingIcon: TanreiItemIcon? = nil, trailingIcon: TanreiItemIcon? = nil, leadingMedia: TanreiListLeadingMedia = .none, divider: Bool = false
  ) {
    self.headline = headline
    self.overline = overline
    self.supportingText = supportingText
    self.supportingLineLimit = supportingLineLimit
    self.trailingText = trailingText
    self.leadingIcon = leadingIcon
    self.trailingIcon = trailingIcon
    self.leadingMedia = leadingMedia
    self.divider = divider
    // LST-23: an item without a headline has no accessible name.
    if headline.trimmingCharacters(in: .whitespaces).isEmpty {
      TanreiDiagnostics.report("Tanrei: a list item's headline is empty, so it has no accessible name (LST-23); give it a headline")
    }
  }

  /// LST-18: the line limit SwiftUI takes (`nil` = all of it).
  var lineLimit: Int? {
    guard let supportingLineLimit, supportingLineLimit > 0 else { return nil }
    return supportingLineLimit
  }

  /// LST-20: the leading icon is drawn only while there is no leading media, and only with a name.
  var drawnLeadingIcon: TanreiItemIcon? {
    leadingMedia == .none ? leadingIcon.drawn : nil
  }

  /// LST-23: the overline, supporting text and trailing text, in reading order — the full text, even when it is cut.
  var accessibilityDescription: String {
    [overline, supportingText, trailingText].filter { !$0.isEmpty }.joined(separator: ", ")
  }
}

private struct TanreiListDescription: ViewModifier {
  let description: String

  func body(content: Content) -> some View {
    if description.isEmpty { content } else { content.accessibilityHint(Text(verbatim: description)) }
  }
}

/// LST-12, LST-23 for a static item: its text is one element named by the headline, described by the rest, with its
/// position; icons, media, the mark and the divider are hidden; a control in the trailing slot stays its own element.
private struct TanreiListStaticSemantics: ViewModifier {
  let row: TanreiListRow
  let position: String?

  func body(content: Content) -> some View {
    content
      .environment(\.tanreiListStaticText, TanreiListStaticText(description: row.accessibilityDescription, position: position))
      .accessibilityElement(children: .contain)
  }
}

/// What a static item's headline carries for assistive technology.
struct TanreiListStaticText: Equatable {
  let description: String
  let position: String?
}

private struct TanreiListStaticTextKey: EnvironmentKey {
  static var defaultValue: TanreiListStaticText? { nil }
}

extension EnvironmentValues {
  fileprivate(set) var tanreiListStaticText: TanreiListStaticText? {
    get { self[TanreiListStaticTextKey.self] }
    set { self[TanreiListStaticTextKey.self] = newValue }
  }
}

/// LST-15: in a list, only the tab stop is focusable. Outside a list (`nil`) the button keeps its own focus rule.
private struct TanreiListTabStop: ViewModifier {
  let isTabStop: Bool?

  func body(content: Content) -> some View {
    if let isTabStop { content.focusable(isTabStop) } else { content }
  }
}

// MARK: - The list's model

/// The identity of one item in its list.
struct TanreiListItemID: Hashable, Sendable {
  let raw = UUID()
}

/// What an item tells its list, in view order, through `TanreiListEntriesKey`.
struct TanreiListEntry: Equatable, Sendable {
  let id: TanreiListItemID
  let headline: String
  /// An interactive item or an option (LST-15); a static item is not.
  let isFocusable: Bool
  let isEnabled: Bool
  let isOption: Bool
  /// The option's value as text (for the checks of LST-26); `nil` without a tag.
  let value: String?
  let isSelected: Bool

  /// How a value is compared in the checks: its description, which is what a debug report can name.
  static func key(of value: AnyHashable) -> String {
    String(describing: value.base)
  }
}

struct TanreiListEntriesKey: PreferenceKey {
  static var defaultValue: [TanreiListEntry] { [] }
  static func reduce(value: inout [TanreiListEntry], nextValue: () -> [TanreiListEntry]) {
    value.append(contentsOf: nextValue())
  }
}

/// What a list tells its items: whether they are options, which values are selected, and the route to the binding.
struct TanreiListContext {
  let mode: TanreiListSelectionMode
  let selected: Set<AnyHashable>
  let model: TanreiListModel
  let choose: @MainActor (AnyHashable) -> Void
}

private struct TanreiListContextKey: EnvironmentKey {
  static var defaultValue: TanreiListContext? { nil }
}

extension EnvironmentValues {
  /// The list the items below belong to; `nil` outside a `TanreiList`.
  var tanreiListContext: TanreiListContext? {
    get { self[TanreiListContextKey.self] }
    set { self[TanreiListContextKey.self] = newValue }
  }
}

/// The rules of a list, pure: which item is the tab stop, where a key moves focus, and what a debug build reports.
enum TanreiListRules {
  /// LST-15: the item that had focus last, else the first selected option, else the first enabled item that takes focus
  /// (else the first that takes focus, so that a column of disabled items is still reached).
  static func tabStop(_ entries: [TanreiListEntry], lastFocused: TanreiListItemID?) -> TanreiListItemID? {
    let candidates = entries.filter(\.isFocusable)
    if let lastFocused, candidates.contains(where: { $0.id == lastFocused }) { return lastFocused }
    return (candidates.first { $0.isSelected } ?? candidates.first { $0.isEnabled } ?? candidates.first)?.id
  }

  /// LST-15 on SwiftUI: what the arrow keys and typeahead move through. SwiftUI never gives keyboard focus to a disabled
  /// button, so a disabled item cannot be reached.
  static func roving(_ entries: [TanreiListEntry]) -> [TanreiRovingItem] {
    entries.map { TanreiRovingItem(focusable: $0.isFocusable && $0.isEnabled, label: $0.headline) }
  }

  /// LST-12: an item's position in the list and the list's size, as VoiceOver reads it (in English).
  static func positionText(of id: TanreiListItemID, in entries: [TanreiListEntry]) -> String? {
    guard let index = entries.firstIndex(where: { $0.id == id }) else { return nil }
    return "\(index + 1) of \(entries.count)"
  }

  /// LST-26: an option without a value, a value two options share, and a selected value that names no option.
  static func problems(_ entries: [TanreiListEntry], selected: [String]) -> [String] {
    let options = entries.enumerated().filter { $0.element.isOption }
    guard !options.isEmpty || !selected.isEmpty else { return [] }
    var problems: [String] = []
    var seen = Set<String>()
    for (index, option) in options {
      guard let value = option.value, !value.isEmpty else {
        problems.append("option \(index + 1) (\"\(option.headline)\") has no value, so it can never be selected; apply .tag(_:) to the TanreiListItem itself")
        continue
      }
      if seen.contains(value) {
        problems.append("option \(index + 1) (\"\(option.headline)\") repeats the value \"\(value)\"; values must be unique within the list")
      }
      seen.insert(value)
    }
    for value in selected.sorted() where !seen.contains(value) {
      problems.append("the selection names \"\(value)\", which no option has as its value")
    }
    return problems
  }
}

/// A list's state: its items in view order (from the preference), the item that had focus last, a tab stop that follows
/// a keyboard move before the items report it, what was typed, and each item's focus action.
@MainActor
@Observable
final class TanreiListModel {
  private(set) var entries: [TanreiListEntry] = []
  private var lastFocused: TanreiListItemID?
  @ObservationIgnored private var keys = TanreiRovingKeys(wraps: false)
  @ObservationIgnored private var actions: [TanreiListItemID: @MainActor () -> Void] = [:]
  @ObservationIgnored private var reported: [String] = []

  /// The items reported themselves, or the selection changed: keep them, and report what LST-26 says once per change.
  func update(_ entries: [TanreiListEntry], selected: [String]) {
    if entries != self.entries {
      self.entries = entries
      let present = Set(entries.map(\.id))
      actions = actions.filter { present.contains($0.key) }
    }
    let problems = TanreiListRules.problems(entries, selected: selected)
    if problems != reported {
      reported = problems
      for problem in problems { TanreiDiagnostics.report("Tanrei: a list's \(problem) (LST-26)") }
    }
  }

  /// Called by an item each time it is drawn (not observed: registering never redraws anything).
  func register(_ id: TanreiListItemID, focus: @escaping @MainActor () -> Void) {
    actions[id] = focus
  }

  func isTabStop(_ id: TanreiListItemID) -> Bool {
    TanreiListRules.tabStop(entries, lastFocused: lastFocused) == id
  }

  func positionText(of id: TanreiListItemID) -> String? {
    TanreiListRules.positionText(of: id, in: entries)
  }

  /// LST-15: the item that had focus last stays the list's tab stop.
  func didFocus(_ id: TanreiListItemID) {
    if lastFocused != id { lastFocused = id }
  }

  /// LST-15: an arrow key, Home or End from item `id`; whether it was the list's.
  func move(from id: TanreiListItemID, key: KeyEquivalent) -> Bool {
    let current = entries.firstIndex { $0.id == id }
    guard let target = keys.target(for: key, from: current, in: TanreiListRules.roving(entries)) else { return false }
    focus(target)
    return true
  }

  /// LST-15: a printable character typed on item `id`; whether it was the list's.
  func type(_ characters: String, from id: TanreiListItemID) -> Bool {
    let current = entries.firstIndex { $0.id == id }
    guard let target = keys.target(typing: characters, at: Date.timeIntervalSinceReferenceDate, from: current, in: TanreiListRules.roving(entries)) else {
      return false
    }
    if let target { focus(target) }
    return true
  }

  /// Makes item `index` the tab stop at once, and gives it keyboard focus once it can take it.
  private func focus(_ index: Int) {
    let target = entries[index].id
    guard let action = actions[target] else { return }
    lastFocused = target
    Task { @MainActor in action() }
  }
}

// MARK: - Token bindings

extension TanreiListTokens {
  /// How the LST-9 ripple grows: over `comp.list.motion.feedback-duration`, with the state easing. `nil` under Reduce
  /// Motion — the layer appears whole.
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// LST-21, LST-25: a change of state or of condition — colors and the check — over the state motion; `nil` under
  /// Reduce Motion.
  func stateMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionStateDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }
}

/// Which token values an item draws for one condition × state. Pure data read from a `TanreiListTokens`, so the bindings
/// can be tested without rendering. LST-3 / LST-6: every state, disabled included, is drawn from that condition's tokens
/// in that state; LST-11: a static item is always drawn from the resting tokens of `unselected`.
struct TanreiListItemAppearance: Equatable {
  let container: TanreiPaint
  /// LST-9 `ripple`: the pressed container paint, grown from the point of contact over `container`.
  let ripple: TanreiPaint?
  let headline: TanreiPaint
  let overline: TanreiPaint
  let supportingText: TanreiPaint
  let trailingText: TanreiPaint
  let leadingIcon: TanreiPaint
  let trailingIcon: TanreiPaint
  let mark: TanreiPaint
  /// The opacity of the whole item, its leading media included (LST-6).
  let opacity: Double
  let cornerRadius: CGFloat

  /// - Parameters:
  ///   - isActive: an interactive item or an option; a static one answers no state (LST-11).
  ///   - feedback: `sys.behavior.pressed-feedback` (LST-9); it matters only while `state` is `.pressed`.
  ///   - beneath: the state the item would be in without the press.
  init(
    tokens: TanreiListTokens, condition: TanreiListCondition, isActive: Bool = true, state: TanreiInteraction, feedback: TanreiPressedFeedback = .overlay,
    beneath: TanreiInteraction = .enabled
  ) {
    let state = isActive ? state : .enabled
    let condition = isActive ? condition : .unselected
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: isActive ? beneath : .enabled)
    // The condition lookup is total: a condition this system does not have reads `unselected` (and is reported).
    let conditionTokens = tokens.conditions[condition]
    let own = conditionTokens[state: layers.state]
    container = conditionTokens[state: layers.container].containerColor
    ripple = layers.ripple.map { conditionTokens[state: $0].containerColor }
    headline = own.headlineColor
    overline = own.overlineColor
    supportingText = own.supportingTextColor
    trailingText = own.trailingTextColor
    leadingIcon = own.leadingIconColor
    trailingIcon = own.trailingIconColor
    mark = own.markColor
    let shared = tokens[state: layers.state]
    // The vocabulary has no rest-state `opacity` token: an item at rest is not dimmed.
    opacity = shared?.opacity ?? TanreiIdentity.opacity
    cornerRadius = shared?.containerShape ?? tokens.containerShape
  }
}

/// LST-16, LST-17: the row's geometry, from the tokens.
struct TanreiListRowMetrics: Equatable {
  let paddingStart: CGFloat
  let paddingEnd: CGFloat
  let paddingBlock: CGFloat
  let gap: CGFloat
  let oneLine: CGFloat
  let twoLine: CGFloat
  let threeLine: CGFloat
  /// LST-5: the minimum target an interactive item or an option is at least as tall as; 0 for a static item.
  let minimumTarget: CGFloat
  /// One line of supporting text, as Dynamic Type scales it: what the supporting text's lines are counted in.
  let supportingLineHeight: CGFloat

  init(tokens: TanreiListTokens, minimumTarget: CGFloat, supportingLineHeight: CGFloat) {
    paddingStart = tokens.containerPaddingInlineStart
    paddingEnd = tokens.containerPaddingInlineEnd
    paddingBlock = tokens.containerPaddingBlock
    gap = tokens.containerGap
    oneLine = tokens.containerHeightOneLine
    twoLine = tokens.containerHeightTwoLine
    threeLine = tokens.containerHeightThreeLine
    self.minimumTarget = minimumTarget
    self.supportingLineHeight = supportingLineHeight
  }

  /// LST-17: the minimum height of a row with `extraLines` lines of text beyond the headline.
  func minimumHeight(extraLines: Int) -> CGFloat {
    let lines = extraLines == 0 ? oneLine : extraLines == 1 ? twoLine : threeLine
    return max(lines, minimumTarget)
  }
}

// MARK: - Layout

/// LST-16, LST-17: one row — `padding-inline-start`, the leading element, the text column (overline, headline and
/// supporting text, stacked) taking the remaining width, then each trailing element, `gap` apart, and
/// `padding-inline-end`. At least the height of its lines (one-line with the headline alone, two-line with one more line
/// — an overline, or supporting text on one line — three-line with two or more, counted as laid out), its content padded
/// by `padding-block`, growing with it and never clipping it. The leading and trailing elements are centered on the text
/// column in a one- or two-line row and aligned with its top in a taller one. Stateless, so it is right on the first
/// layout pass (snapshots). SwiftUI mirrors it in a right-to-left layout, as it does every layout.
struct TanreiListRowLayout: Layout {
  let metrics: TanreiListRowMetrics

  enum Part: Sendable {
    case leading
    case overline
    case headline
    case supporting
    case trailing
  }

  struct PartKey: LayoutValueKey {
    static let defaultValue = Part.trailing
  }

  struct Arrangement {
    var size: CGSize
    var frames: [CGRect]
    /// Lines of text beyond the headline (LST-17).
    var extraLines: Int
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    arrange(width: proposal.width, subviews: subviews).size
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    let arrangement = arrange(width: bounds.width, subviews: subviews)
    for (subview, frame) in zip(subviews, arrangement.frames) {
      subview.place(
        at: CGPoint(x: bounds.minX + frame.minX, y: bounds.minY + frame.minY), anchor: .topLeading,
        proposal: ProposedViewSize(width: frame.width, height: frame.height))
    }
  }

  func arrange(width proposed: CGFloat?, subviews: Subviews) -> Arrangement {
    let parts = subviews.map { $0[PartKey.self] }
    let isText: (Part) -> Bool = { $0 == .overline || $0 == .headline || $0 == .supporting }
    // The leading and trailing elements take their own size.
    var sizes = subviews.map { subview in isText(subview[PartKey.self]) ? CGSize.zero : subview.sizeThatFits(.unspecified) }
    let others = zip(parts, sizes).filter { !isText($0.0) }
    let othersWidth = others.reduce(CGFloat.zero) { $0 + $1.1.width + metrics.gap }
    let textWidth: CGFloat
    if let proposed, proposed.isFinite {
      textWidth = max(.zero, proposed - metrics.paddingStart - metrics.paddingEnd - othersWidth)
    } else {
      textWidth = subviews.indices.filter { isText(parts[$0]) }.map { subviews[$0].sizeThatFits(.unspecified).width }.max() ?? .zero
    }
    var textHeight: CGFloat = .zero
    var extraLines = 0
    for index in subviews.indices where isText(parts[index]) {
      let size = subviews[index].sizeThatFits(ProposedViewSize(width: textWidth, height: nil))
      sizes[index] = CGSize(width: textWidth, height: size.height)
      textHeight += size.height
      switch parts[index] {
      case .overline: extraLines += 1
      case .supporting:
        let lines = metrics.supportingLineHeight > 0 ? (size.height / metrics.supportingLineHeight).rounded() : 1
        extraLines += max(1, Int(lines))
      default: break
      }
    }
    let contentHeight = max(textHeight, others.map(\.1.height).max() ?? .zero)
    let height = max(metrics.minimumHeight(extraLines: extraLines), contentHeight + 2 * metrics.paddingBlock)
    let width = proposed.flatMap { $0.isFinite ? $0 : nil } ?? (metrics.paddingStart + textWidth + othersWidth + metrics.paddingEnd)
    let alignsTop = extraLines >= 2
    let top: (CGFloat) -> CGFloat = { alignsTop ? metrics.paddingBlock : (height - $0) / 2 }

    var frames = Array(repeating: CGRect.zero, count: subviews.count)
    var x = metrics.paddingStart
    for index in subviews.indices where parts[index] == .leading {
      frames[index] = CGRect(origin: CGPoint(x: x, y: top(sizes[index].height)), size: sizes[index])
      x += sizes[index].width + metrics.gap
    }
    var y = top(textHeight)
    for index in subviews.indices where isText(parts[index]) {
      frames[index] = CGRect(x: x, y: y, width: textWidth, height: sizes[index].height)
      y += sizes[index].height
    }
    x += textWidth + metrics.gap
    for index in subviews.indices where parts[index] == .trailing {
      frames[index] = CGRect(origin: CGPoint(x: x, y: top(sizes[index].height)), size: sizes[index])
      x += sizes[index].width + metrics.gap
    }
    return Arrangement(size: CGSize(width: width, height: height), frames: frames, extraLines: extraLines)
  }
}

// MARK: - Style

struct TanreiListItemStyle<Leading: View>: ButtonStyle {
  let row: TanreiListRow
  let condition: TanreiListCondition
  let showsMark: Bool
  let isFocused: Bool
  var keyboardPresses = 0
  let leading: Leading

  func makeBody(configuration: Configuration) -> some View {
    TanreiListItemChrome(
      row: row, condition: condition, isActive: true, showsMark: showsMark, isPressed: configuration.isPressed, isFocused: isFocused,
      keyboardPresses: keyboardPresses, leading: leading, trailing: EmptyView())
  }
}

/// The visual of one item: the row with its parts, the container with its state layer, the focus ring inside it, and the
/// divider below it, drawn from the tokens of the one resolved state of the condition.
struct TanreiListItemChrome<Leading: View, Trailing: View>: View {
  let row: TanreiListRow
  let condition: TanreiListCondition
  /// An interactive item or an option: it answers hover, focus and press.
  let isActive: Bool
  /// LST-21: an option reserves the mark's box.
  let showsMark: Bool
  let isPressed: Bool
  let isFocused: Bool
  /// Activations by key so far; a change starts a press with no pointer behind it (LST-8).
  var keyboardPresses = 0
  let leading: Leading
  let trailing: Trailing

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiTheme) private var theme
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.tanreiListStaticText) private var staticText
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    let feedback = theme.system.behavior.pressedFeedback
    // LST-8: a press stays visible at least `duration.press-hold`; LST-9: the point of contact only under `ripple`.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyboardPresses, watchesContact: isActive && feedback == .ripple) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let system = theme.system
    let tokens = system.list
    // LST-3: exactly one state — pressed > focused > hovered; LST-6: disabled is a state too; LST-11: a static item is
    // drawn at rest. SwiftUI focus is keyboard focus: a click or tap never focuses a button (LST-4).
    let state = isActive ? TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered) : .enabled
    let beneath = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let appearance = TanreiListItemAppearance(tokens: tokens, condition: condition, isActive: isActive, state: state, feedback: feedback, beneath: beneath)
    let ripple = appearance.ripple.map {
      TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion))
    }
    let supportingLine = tokens.supportingTextTypescale.resolved(policy: theme.fontFamilyPolicy, dynamicTypeSize: dynamicTypeSize).lineHeight
    let metrics = TanreiListRowMetrics(
      tokens: tokens, minimumTarget: isActive ? TanreiHitTarget.minimum(in: system.measure) : .zero, supportingLineHeight: supportingLine)
    let isSelected = condition == .selected
    let motion = tokens.stateMotion(reduceMotion: reduceMotion)

    return TanreiListRowLayout(metrics: metrics) {
      leadingElement(tokens: tokens, appearance: appearance, isSelected: isSelected)
      if !row.overline.isEmpty {
        text(row.overline, style: tokens.overlineTypescale, color: appearance.overline)
          .layoutValue(key: TanreiListRowLayout.PartKey.self, value: .overline)
      }
      text(row.headline, style: tokens.headlineTypescale, color: appearance.headline, isElement: true)
        .modifier(TanreiListStaticHeadline(text: staticText, headline: row.headline))
        .layoutValue(key: TanreiListRowLayout.PartKey.self, value: .headline)
      if !row.supportingText.isEmpty {
        // LST-18: an ellipsis after `supportingLineLimit` lines; the full text is the item's description (LST-23).
        text(row.supportingText, style: tokens.supportingTextTypescale, color: appearance.supportingText, lineLimit: row.lineLimit)
          .layoutValue(key: TanreiListRowLayout.PartKey.self, value: .supporting)
      }
      if !row.trailingText.isEmpty {
        text(row.trailingText, style: tokens.trailingTextTypescale, color: appearance.trailingText, alignment: .trailing)
          .layoutValue(key: TanreiListRowLayout.PartKey.self, value: .trailing)
      }
      if let icon = row.trailingIcon.drawn {
        // LST-19: the family and fill of the item's condition.
        TanreiItemIconView(icon: icon, size: tokens.trailingIconSize, selected: isSelected)
          .foregroundStyle(colors[appearance.trailingIcon])
          .layoutValue(key: TanreiListRowLayout.PartKey.self, value: .trailing)
      }
      if !TanreiSlotContent.isEmpty(trailing) {
        trailing
          .layoutValue(key: TanreiListRowLayout.PartKey.self, value: .trailing)
      }
      if showsMark {
        mark(tokens: tokens, color: appearance.mark, isSelected: isSelected)
          .layoutValue(key: TanreiListRowLayout.PartKey.self, value: .trailing)
      }
    }
    // LST-6, LST-9, LST-10: the row's fill and state layer, its corners eased by the corner smoothing, the ripple, and the
    // state's opacity on the whole item — leading media included; LST-21, LST-25: colors and the check change over the
    // state motion (at once under Reduce Motion); LST-4: the ring inside the row, so a scrolling ancestor cannot clip it —
    // keyboard focus only, never animated, never dimmed; LST-5: the whole row is the item's hit area.
    .modifier(
      TanreiItemRowContainer(
        fill: colors[appearance.container], ripple: ripple, cornerRadius: appearance.cornerRadius, opacity: appearance.opacity, motion: motion,
        state: state, condition: condition, showsFocusRing: isActive && isFocused && isEnabled))
    // LST-22: the divider, outside the item's opacity: it keeps its color and full opacity in every state and condition.
    .overlay(alignment: .bottomLeading) {
      if row.divider {
        Rectangle()
          .fill(colors[tokens.dividerColor])
          .frame(height: tokens.dividerThickness)
          .padding(.leading, metrics.paddingStart + leadingWidth(tokens: tokens))
          .allowsHitTesting(false)
          .accessibilityHidden(true)
      }
    }
    .onHover { if isActive { isHovered = $0 } }
  }

  /// LST-22: where the text column starts after the start padding — the leading element and the gap, when there is one.
  func leadingWidth(tokens: TanreiListTokens) -> CGFloat {
    switch row.leadingMedia {
    case .avatar: return tokens.avatarSize + tokens.containerGap
    case .image: return tokens.imageSize + tokens.containerGap
    case .none: return row.drawnLeadingIcon == nil ? .zero : tokens.leadingIconSize + tokens.containerGap
    }
  }

  /// LST-19, LST-20: the leading icon, or the leading slot framed as an avatar or an image.
  @ViewBuilder
  private func leadingElement(tokens: TanreiListTokens, appearance: TanreiListItemAppearance, isSelected: Bool) -> some View {
    switch row.leadingMedia {
    case .avatar, .image:
      let side = row.leadingMedia == .avatar ? tokens.avatarSize : tokens.imageSize
      let corner = row.leadingMedia == .avatar ? tokens.avatarShape : tokens.imageShape
      // LST-20: the fill behind the content (the box is drawn even when the slot is empty); the content's foreground and
      // a monogram's type style, centred; clipped to the box's shape.
      ZStack {
        Rectangle().fill(colors[tokens.mediaContainerColor])
        leading
          .foregroundStyle(colors[tokens.mediaContentColor])
          .tanreiFont(tokens.headlineTypescale)
      }
        .frame(width: side, height: side)
        .clipShape(TanreiCornerShape(cornerRadius: corner, style: theme.system.shape.roundedCornerStyle))
        // LST-23: hidden from assistive technology — the whole box, as one element.
        .accessibilityElement(children: .ignore)
        .accessibilityHidden(true)
        .layoutValue(key: TanreiListRowLayout.PartKey.self, value: .leading)
    case .none:
      if let icon = row.drawnLeadingIcon {
        TanreiItemIconView(icon: icon, size: tokens.leadingIconSize, selected: isSelected)
          .foregroundStyle(colors[appearance.leadingIcon])
          .layoutValue(key: TanreiListRowLayout.PartKey.self, value: .leading)
      }
    }
  }

  /// LST-18: a text of the row in its role and color; it wraps rather than truncates unless a line limit cuts it.
  private func text(
    _ string: String, style: TanreiTextStyle, color: TanreiPaint, lineLimit: Int? = nil, alignment: TextAlignment = .leading, isElement: Bool = false
  ) -> some View {
    Text(verbatim: string)
      .lineLimit(lineLimit)
      .truncationMode(.tail)
      .multilineTextAlignment(alignment)
      .fixedSize(horizontal: false, vertical: true)
      .tanreiTextStyle(style)
      .foregroundStyle(colors[color])
      .frame(maxWidth: .infinity, alignment: alignment == .trailing ? .trailing : .leading)
      // LST-23: only the headline is an element (a static item's); the other texts are its description. One element or
      // none: an accessibility modifier on the text's line box (a layout of two views) would otherwise reach each view.
      .accessibilityElement(children: .ignore)
      .accessibilityHidden(!isElement)
  }

  /// LST-21: the box of the check, reserved in every option; the check drawn along its path while selected. The check's
  /// geometry is the checkbox's.
  private func mark(tokens: TanreiListTokens, color: TanreiPaint, isSelected: Bool) -> some View {
    TanreiItemCheck(isChecked: isSelected, color: colors[color], size: tokens.markSize, width: tokens.markWidth)
  }
}

/// LST-23 for a static item: the headline is the element, named by itself, described by the rest, with its position.
private struct TanreiListStaticHeadline: ViewModifier {
  let text: TanreiListStaticText?
  let headline: String

  func body(content: Content) -> some View {
    if let text {
      content
        .accessibilityLabel(Text(verbatim: headline))
        .modifier(TanreiListDescription(description: text.description))
        .modifier(TanreiOptionalAccessibilityValue(value: text.position))
    } else {
      content
    }
  }
}
