import SwiftUI

// Spec: specs/tabs.spec.json — tokens: TanreiTabsTokens (comp.tabs), read from the design system in the environment
// (`system.tabs`). Every design value in this file comes from a token; there are no literals, and no state's look is
// computed here. A tab is pressed like Button: press, hold, ripple, focus ring and container layers are the
// shared primitives (`TanreiItemRowContainer` is the list's and the menu's too), and TAB-8, TAB-9 and TAB-10 are BTN-8,
// BTN-9 and BTN-10 for the tab. The item kind `tab` is `TanreiTab`, tagged by value as `TabView`'s tabs are.
//
// The tabs read their content as data, as the menu does: each `TanreiTab` puts what it is into a trait of its own view
// (its title, icon, value, whether its label is hidden and whether it is enabled — `.disabled(_:)` applied to it is seen —
// and its panel), and the row draws every tab itself from that list. So everything a tab needs from the whole row — the
// equal widths and the common height (TAB-14), which tab is the one selected (TAB-11), its position (TAB-13), the Tab stop
// (TAB-12) — is known on the first layout pass. SwiftUI's `TabView` is an app's tab bar (a navigation bar), not this.

/// Switches between views of the same subject with a row of labelled tabs, one of them selected, above the view it shows.
///
///     @State private var tab = "overview"
///     TanreiTabs(selection: $tab, label: "Project") {
///       TanreiTab("Overview", icon: "dashboard") { OverviewPanel() }.tag("overview")
///       TanreiTab("Activity", icon: "history") { ActivityPanel() }.tag("activity")
///       TanreiTab("Settings", icon: "settings") { SettingsPanel() }.tag("settings")
///         .disabled(!canEdit)
///     }
///
/// Each tab carries its panel, and only the selected tab's panel is shown, below the row (TAB-13); a tab without a panel
/// shows nothing there. The binding holds the selected tab's tag: activating another tab — by pointer, touch, Enter or
/// Space, or by moving to it with the arrow keys, Home or End (automatic activation) — writes it, which is the spec's
/// `change` (TAB-1, TAB-12). With a `Binding<V?>`, `nil` selects the first enabled tab. **Apply `.tag(_:)` and
/// `.labelStyle(.iconOnly)` directly to the `TanreiTab`**, before any other modifier: the tab reads them itself.
///
/// `variant` is a `TanreiTabsVariant` (`.primary`, the main views of a screen: an icon above the label and the indicator
/// under the content; `.secondary`, the views inside one of them: the icon before the label and the indicator under the
/// whole tab), a generated open key: a value the design system does not have draws primary's tokens and is
/// reported in debug builds (TAB-7). `scrollable` false divides the row's width equally among the tabs; true sizes each
/// tab to its content and scrolls the row sideways (TAB-14). `label` names the row (TAB-13).
///
/// The row draws no background: it sits on the surface of the screen or of an app bar, and draws only the divider under
/// its tabs and the selected tab's indicator.
public struct TanreiTabs<SelectionValue: Hashable, Content: View>: View {
  private let selection: TanreiTabsSelection
  private let variant: TanreiTabsVariant
  private let scrollable: Bool
  private let label: LocalizedStringKey
  private let content: Content

  /// A row of tabs whose selected tab's tag `selection` holds.
  public init(
    selection: Binding<SelectionValue>, variant: TanreiTabsVariant = .primary, scrollable: Bool = false, label: LocalizedStringKey = "",
    @ViewBuilder content: () -> Content
  ) {
    self.init(selection: TanreiTabsSelection(selection), variant: variant, scrollable: scrollable, label: label, content: content())
  }

  /// A row of tabs whose selected tab's tag `selection` holds; `nil` selects the first enabled tab (TAB-11).
  public init(
    selection: Binding<SelectionValue?>, variant: TanreiTabsVariant = .primary, scrollable: Bool = false, label: LocalizedStringKey = "",
    @ViewBuilder content: () -> Content
  ) {
    self.init(selection: TanreiTabsSelection(selection), variant: variant, scrollable: scrollable, label: label, content: content())
  }

  private init(selection: TanreiTabsSelection, variant: TanreiTabsVariant, scrollable: Bool, label: LocalizedStringKey, content: Content) {
    self.selection = selection
    self.variant = variant
    self.scrollable = scrollable
    self.label = label
    self.content = content
  }

  public var body: some View {
    _VariadicView.Tree(TanreiTabsRoot(selection: selection, variant: variant, scrollable: scrollable, label: label)) {
      content
    }
  }
}

/// Reads the row's content — every tab's trait, in order — and hands the tabs to `TanreiTabsView`.
private struct TanreiTabsRoot: _VariadicView_UnaryViewRoot {
  let selection: TanreiTabsSelection
  let variant: TanreiTabsVariant
  let scrollable: Bool
  let label: LocalizedStringKey

  func body(children: _VariadicView.Children) -> some View {
    let entries = children.compactMap { $0[TanreiTabEntryKey.self] }
    return TanreiTabsView(entries: entries, selection: selection, variant: variant, scrollable: scrollable, label: label)
  }
}

/// The row's selection, typed away: the value it holds (`nil` for a `Binding<V?>` holding `nil`) and the route to the
/// binding. A value of another type than the binding's writes nothing.
struct TanreiTabsSelection {
  let value: AnyHashable?
  let write: @MainActor (AnyHashable) -> Void

  @MainActor
  init<V: Hashable>(_ binding: Binding<V>) {
    value = AnyHashable(binding.wrappedValue)
    write = { value in if let typed = value.base as? V { binding.wrappedValue = typed } }
  }

  @MainActor
  init<V: Hashable>(_ binding: Binding<V?>) {
    value = binding.wrappedValue.map { AnyHashable($0) }
    write = { value in if let typed = value.base as? V { binding.wrappedValue = typed } }
  }

  init(value: AnyHashable?, write: @escaping @MainActor (AnyHashable) -> Void) {
    self.value = value
    self.write = write
  }
}

// MARK: - The tab

/// One tab of a `TanreiTabs` row (the spec's item kind `tab`): a title, an optional icon, the value that selects it (its
/// tag) and the panel it shows while selected.
///
///     TanreiTab("Overview", icon: "dashboard") { OverviewPanel() }.tag("overview")
///     TanreiTab("Starred", icon: .image(Image(systemName: "star"))) { StarredPanel() }.tag(Section.starred)
///     TanreiTab("Settings", icon: "settings") { SettingsPanel() }.tag("settings").labelStyle(.iconOnly)
///     TanreiTab("Billing") { BillingPanel() }.tag("billing").disabled(true)
///
/// `title` is the tab's text and its accessible name, required even when `.labelStyle(.iconOnly)` hides it (TAB-19,
/// TAB-22). `icon` is a glyph of the icon font by name, or an image of the product's own (`TanreiItemIcon`); give every tab
/// of a row an icon, or none. `disabled` follows `.disabled(_:)`: a disabled tab cannot be selected, the arrow keys skip it
/// and it is never the Tab stop (TAB-2).
///
/// A tab draws nothing where it is written: the row draws it from what it reads, and shows its panel below the row while it
/// is selected.
public struct TanreiTab<Panel: View>: View {
  let title: String
  let icon: TanreiItemIcon?
  let panel: Panel
  /// The value that selects it: set by `.tag(_:)`.
  var value: AnyHashable?
  /// `.labelStyle(.iconOnly)`: the spec's `labelHidden`.
  var labelHidden = false

  @Environment(\.isEnabled) private var isEnabled

  /// A tab with a panel.
  public init<S: StringProtocol>(_ title: S, icon: TanreiItemIcon? = nil, @ViewBuilder content: () -> Panel) {
    self.title = String(title)
    self.icon = icon
    panel = content()
    // TAB-22: still rendered, but an empty label is no name — reported in debug builds only.
    if self.title.trimmingCharacters(in: .whitespaces).isEmpty {
      TanreiDiagnostics.report("Tanrei: a tab's label is empty, so it has no accessible name (TAB-22); give it a label")
    }
  }

  /// The tab's value (the spec's item prop `value`): the row's selection selects the tab whose tag it holds, and writing
  /// it is `change`. Apply it to the `TanreiTab` itself, before any other modifier: the tab reads it, SwiftUI's own `tag`
  /// does not reach it (TAB-11 reports a tab without one in debug builds).
  public func tag<V: Hashable>(_ tag: V) -> TanreiTab {
    var tab = self
    tab.value = AnyHashable(tag)
    return tab
  }

  /// `.labelStyle(.iconOnly)` draws the icon alone and keeps the title as the accessible name (the spec's `labelHidden`,
  /// TAB-19); any other style draws the title. Apply it to the `TanreiTab` itself.
  public func labelStyle<S: LabelStyle>(_ style: S) -> TanreiTab {
    var tab = self
    tab.labelHidden = style is IconOnlyLabelStyle
    return tab
  }

  public var body: some View {
    let panel: AnyView? = TanreiSlotContent.isEmpty(self.panel) ? nil : AnyView(self.panel)
    Color.clear
      .frame(width: .zero, height: .zero)
      .accessibilityHidden(true)
      ._trait(
        TanreiTabEntryKey.self,
        TanreiTabEntry(title: title, icon: icon.drawn, labelHidden: labelHidden, isEnabled: isEnabled, value: value, panel: panel))
  }
}

extension TanreiTab where Panel == EmptyView {
  /// A tab without a panel: the product shows the selected tab's view itself.
  public init<S: StringProtocol>(_ title: S, icon: TanreiItemIcon? = nil) {
    self.init(title, icon: icon) { EmptyView() }
  }
}

/// One tab as the row reads it.
struct TanreiTabEntry {
  let title: String
  /// The icon to draw; `nil` when there is none (an empty name included).
  let icon: TanreiItemIcon?
  let labelHidden: Bool
  let isEnabled: Bool
  let value: AnyHashable?
  let panel: AnyView?

  init(title: String, icon: TanreiItemIcon? = nil, labelHidden: Bool = false, isEnabled: Bool = true, value: AnyHashable? = nil, panel: AnyView? = nil) {
    self.title = title
    self.icon = icon
    self.labelHidden = labelHidden
    self.isEnabled = isEnabled
    self.value = value
    self.panel = panel
  }

  /// TAB-19: the label is drawn unless it is hidden AND there is an icon to draw instead.
  var drawsLabel: Bool { !labelHidden || icon == nil }
}

struct TanreiTabEntryKey: _ViewTraitKey {
  static var defaultValue: TanreiTabEntry? { nil }
}

// MARK: - The rules, pure

/// The rules of a row of tabs, pure, so they are tested without a keyboard or a render.
enum TanreiTabsRules {
  /// TAB-11: the tab that is selected — the first whose value equals `selection`; while `selection` is `nil`, the first
  /// enabled tab. `nil` when the value names no tab.
  static func selectedIndex(_ entries: [TanreiTabEntry], selection: AnyHashable?) -> Int? {
    guard let selection else { return entries.indices.first { entries[$0].isEnabled } }
    return entries.indices.first { entries[$0].value == selection }
  }

  /// TAB-12, TAB-2: the one Tab stop — the selected tab, unless it is disabled or there is none; then the first enabled
  /// tab. `nil` when no tab is enabled.
  static func tabStop(_ entries: [TanreiTabEntry], selected: Int?) -> Int? {
    if let selected, entries.indices.contains(selected), entries[selected].isEnabled { return selected }
    return entries.indices.first { entries[$0].isEnabled }
  }

  /// TAB-1, TAB-2: whether activating tab `index` changes the selection — it is enabled, it has a value, and it is not the
  /// selected tab already.
  static func changes(_ entries: [TanreiTabEntry], activating index: Int, selected: Int?) -> Bool {
    guard entries.indices.contains(index) else { return false }
    let entry = entries[index]
    return entry.isEnabled && entry.value != nil && index != selected
  }

  /// The keys the row hears from a focused tab.
  static let keys: Set<KeyEquivalent> = [.leftArrow, .rightArrow, .home, .end]

  /// TAB-12, TAB-21: Right Arrow is the next tab and Left Arrow the previous one — mirrored right to left —, Home and End
  /// the ends; as `TanreiRovingKeys` moves (down = next).
  static func movement(for key: KeyEquivalent, layoutDirection: LayoutDirection) -> KeyEquivalent? {
    let forward: KeyEquivalent = layoutDirection == .rightToLeft ? .leftArrow : .rightArrow
    let backward: KeyEquivalent = layoutDirection == .rightToLeft ? .rightArrow : .leftArrow
    switch key {
    case forward: return .downArrow
    case backward: return .upArrow
    case .home: return .home
    case .end: return .end
    default: return nil
    }
  }

  /// TAB-12: where `key` moves focus from tab `index` — the next or previous enabled tab, wrapping, or the first or last;
  /// disabled tabs are skipped (TAB-2). `nil` when it is not one of the row's keys or no tab is enabled.
  static func target(for key: KeyEquivalent, from index: Int?, in entries: [TanreiTabEntry], layoutDirection: LayoutDirection) -> Int? {
    guard let movement = movement(for: key, layoutDirection: layoutDirection) else { return nil }
    let items = entries.map { TanreiRovingItem(focusable: $0.isEnabled, label: $0.title) }
    return TanreiRovingKeys(wraps: true).target(for: movement, from: index, in: items)
  }

  /// TAB-11, TAB-19: a selection naming no tab, tabs without a value or sharing one, and hidden labels with no icon.
  static func problems(_ entries: [TanreiTabEntry], selection: AnyHashable?) -> [String] {
    var problems: [String] = []
    var seen: Set<AnyHashable> = []
    var reported: Set<AnyHashable> = []
    for entry in entries {
      guard let value = entry.value else {
        problems.append("the tab \"\(entry.title)\" has no value (apply .tag(_:) to the TanreiTab itself), so it cannot be selected (TAB-11)")
        continue
      }
      if !seen.insert(value).inserted && reported.insert(value).inserted {
        problems.append("the value \"\(value.base)\" is given to more than one tab; the first of them is the one it selects (TAB-11)")
      }
    }
    if let selection, !entries.isEmpty, !entries.contains(where: { $0.value == selection }) {
      problems.append("the selection \"\(selection.base)\" names none of its tabs, so none is selected and no panel is shown (TAB-11)")
    }
    for entry in entries where entry.labelHidden && entry.icon == nil {
      problems.append("the tab \"\(entry.title)\" hides its label but has no icon, so its label is drawn (TAB-19)")
    }
    return problems
  }

  /// TAB-13: a tab's position in the row and the row's size, as its accessibility value where the platform does not state
  /// it itself (in English). On iOS a container with the tab bar trait makes
  /// VoiceOver say "tab, 2 of 3" itself, so there is none.
  static func positionText(index: Int, count: Int) -> String? {
    #if os(iOS)
    nil
    #else
    "\(index + 1) of \(count)"
    #endif
  }
}

// MARK: - The row

/// The row and the selected tab's panel below it: the tabs laid out fixed or scrolling (TAB-14), the divider under them
/// (TAB-20), the keyboard (TAB-12), scrolling a tab into view (TAB-15) and the semantics of the tab list (TAB-13).
struct TanreiTabsView: View {
  let entries: [TanreiTabEntry]
  let selection: TanreiTabsSelection
  let variant: TanreiTabsVariant
  let scrollable: Bool
  let label: LocalizedStringKey

  @Environment(\.tanreiSystem) private var system
  @Environment(\.layoutDirection) private var layoutDirection
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @FocusState private var focused: Int?
  @Namespace private var indicator

  var body: some View {
    let tokens = system.tabs
    let problems = TanreiTabsRules.problems(entries, selection: selection.value)
    if !problems.isEmpty {
      let _ = problems.forEach { TanreiDiagnostics.report("Tanrei: a row of tabs: \($0)") }
    }
    let selected = TanreiTabsRules.selectedIndex(entries, selection: selection.value)
    VStack(alignment: .leading, spacing: .zero) {
      row(tokens: tokens, selected: selected)
      // TAB-13, TAB-17: only the selected tab's panel, at once, named by its tab. SwiftUI has no tab panel role and cannot
      // associate it with its tab; it follows the row in reading order (README).
      if let selected, let panel = entries[selected].panel {
        panel
          .frame(maxWidth: .infinity, alignment: .topLeading)
          .accessibilityElement(children: .contain)
          .accessibilityLabel(Text(verbatim: entries[selected].title))
          .id(selected)
          .transition(.identity)
          .animation(nil, value: selected)
      }
    }
    // One element for the row and its panel, so that the product's modifiers (an identifier) name the whole.
    .accessibilityElement(children: .contain)
  }

  @ViewBuilder
  private func row(tokens: TanreiTabsTokens, selected: Int?) -> some View {
    let tabStop = TanreiTabsRules.tabStop(entries, selected: selected)
    let layout = TanreiTabsRowLayout(scrollable: scrollable, minimumWidth: TanreiHitTarget.minimum(in: system.measure))
    let tabs = layout {
      ForEach(entries.indices, id: \.self) { index in
        tab(index, selected: selected, tabStop: tabStop)
          .id(index)
      }
    }
    let reveal = tokens.indicatorMotion(reduceMotion: reduceMotion)
    Group {
      if scrollable {
        // TAB-14: sized to the content, starting at the start edge, scrolling sideways. TAB-15: a tab that becomes
        // selected or takes keyboard focus is scrolled until it is wholly in view — over the indicator's motion, at once
        // where motion is reduced and when the row first appears.
        ScrollViewReader { proxy in
          TanreiScrollRegion(axis: .horizontal) { tabs }
            .onAppear { if let selected { proxy.scrollTo(selected) } }
            .onChange(of: selected) { _, now in
              guard let now else { return }
              withAnimation(reveal) { proxy.scrollTo(now) }
            }
            .onChange(of: focused) { _, now in
              guard let now else { return }
              withAnimation(reveal) { proxy.scrollTo(now) }
            }
        }
      } else {
        tabs
      }
    }
    // TAB-20: the divider along the bottom of the whole row, under the tabs and the indicator, across its full width even
    // while it scrolls; decorative.
    .background(alignment: .bottom) {
      Rectangle()
        .fill(colors[tokens.dividerColor])
        .frame(height: tokens.dividerThickness)
        .accessibilityHidden(true)
    }
    // TAB-13: the tab list, named by the row's label. SwiftUI has no tab list role; the tab bar trait is the nearest one.
    .accessibilityElement(children: .contain)
    .accessibilityAddTraits(.isTabBar)
    .modifier(TanreiTabsName(label: label))
  }

  private func tab(_ index: Int, selected: Int?, tabStop: Int?) -> some View {
    let entry = entries[index]
    let isSelected = index == selected
    return TanreiTabButton(
      entry: entry, variant: variant, scrollable: scrollable, isSelected: isSelected, isKeyboardFocused: focused == index,
      indicator: indicator, activate: { activate(index, selected: selected) }
    )
    .focused($focused, equals: index)
    // TAB-12: one Tab stop, the selected tab (TAB-2: never a disabled one).
    .focusable(index == tabStop)
    // TAB-12: the arrows (wrapping, mirrored right to left), Home and End move focus and select the tab they reach.
    .onKeyPress(keys: TanreiTabsRules.keys, phases: .down) { press in
      guard let target = TanreiTabsRules.target(for: press.key, from: index, in: entries, layoutDirection: layoutDirection) else { return .ignored }
      activate(target, selected: selected)
      Task { @MainActor in focused = target }
      return .handled
    }
    // TAB-13: a tab named by its label, drawn or not, with its selected state and — where the platform does not state it
    // itself — its position.
    .accessibilityLabel(Text(verbatim: entry.title))
    .modifier(TanreiOptionalAccessibilityValue(value: TanreiTabsRules.positionText(index: index, count: entries.count)))
    .accessibilityAddTraits(isSelected ? .isSelected : [])
  }

  /// TAB-1, TAB-2: the single route to the binding — once, only for an enabled tab that is not selected.
  private func activate(_ index: Int, selected: Int?) {
    guard TanreiTabsRules.changes(entries, activating: index, selected: selected), let value = entries[index].value else { return }
    selection.write(value)
  }
}

private struct TanreiTabsName: ViewModifier {
  let label: LocalizedStringKey

  func body(content: Content) -> some View {
    if label == "" { content } else { content.accessibilityLabel(Text(label)) }
  }
}

/// TAB-14: the tabs in one row, every one as tall as the tallest (a wrapping label grows them all). Fixed: the width divided
/// equally, each at least `minimumWidth` (the minimum target, TAB-5); scrollable: each tab its own width (its content on one
/// line plus the padding), at least `minimumWidth`, the row as wide as their sum. Stateless, so it is right on the first
/// layout pass; SwiftUI mirrors it right to left (TAB-21).
struct TanreiTabsRowLayout: Layout {
  let scrollable: Bool
  let minimumWidth: CGFloat

  func widths(proposal: ProposedViewSize, subviews: Subviews) -> [CGFloat] {
    guard !subviews.isEmpty else { return [] }
    if scrollable {
      return subviews.map { max($0.sizeThatFits(.unspecified).width, minimumWidth) }
    }
    let count = CGFloat(subviews.count)
    let total: CGFloat
    if let width = proposal.width, width.isFinite {
      total = width
    } else {
      total = (subviews.map { $0.sizeThatFits(.unspecified).width }.max() ?? .zero) * count
    }
    return Array(repeating: max(total / count, minimumWidth), count: subviews.count)
  }

  func height(widths: [CGFloat], subviews: Subviews) -> CGFloat {
    zip(subviews, widths).map { $0.sizeThatFits(ProposedViewSize(width: $1, height: nil)).height }.max() ?? .zero
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let widths = widths(proposal: proposal, subviews: subviews)
    return CGSize(width: widths.reduce(.zero, +), height: height(widths: widths, subviews: subviews))
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    let widths = widths(proposal: ProposedViewSize(width: bounds.width, height: bounds.height), subviews: subviews)
    let height = self.height(widths: widths, subviews: subviews)
    var x = bounds.minX
    for (subview, width) in zip(subviews, widths) {
      subview.place(at: CGPoint(x: x, y: bounds.minY), anchor: .topLeading, proposal: ProposedViewSize(width: width, height: height))
      x += width
    }
  }
}

// MARK: - One tab

/// One tab: a button drawn by `TanreiTabStyle`, activated by pointer, touch, Enter and Space.
private struct TanreiTabButton: View {
  let entry: TanreiTabEntry
  let variant: TanreiTabsVariant
  let scrollable: Bool
  let isSelected: Bool
  let isKeyboardFocused: Bool
  let indicator: Namespace.ID
  let activate: @MainActor () -> Void

  /// Counts activations by key: each one starts a press that no pointer held down (TAB-8).
  @State private var keyboardPresses = 0

  var body: some View {
    Button(action: activate) { Text(verbatim: entry.title) }
      .buttonStyle(
        TanreiTabStyle(
          entry: entry, variant: variant, scrollable: scrollable, isSelected: isSelected, isFocused: isKeyboardFocused,
          keyboardPresses: keyboardPresses, indicator: indicator))
      .disabled(!entry.isEnabled)
      // Tanrei draws its own ring (TAB-4); the system focus effect would double it.
      .focusEffectDisabled()
      // TAB-1, TAB-8: Enter and Space activate, once per key press, and show the press from the center.
      .tanreiKeyActivation(isEnabled: entry.isEnabled) {
        keyboardPresses += 1
        activate()
      }
  }
}

struct TanreiTabStyle: ButtonStyle {
  let entry: TanreiTabEntry
  let variant: TanreiTabsVariant
  let scrollable: Bool
  let isSelected: Bool
  let isFocused: Bool
  var keyboardPresses = 0
  let indicator: Namespace.ID?

  func makeBody(configuration: Configuration) -> some View {
    TanreiTabChrome(
      entry: entry, variant: variant, scrollable: scrollable, isSelected: isSelected, isPressed: configuration.isPressed, isFocused: isFocused,
      keyboardPresses: keyboardPresses, indicator: indicator)
  }
}

/// The name of the selected tab's indicator in the row's namespace: it slides from one tab to the next (TAB-17).
enum TanreiTabsIndicatorID: Hashable {
  case selected
}

/// The visual of one tab: its content (icon and label), its container with the state layer and the focus ring inside it,
/// and its active indicator, drawn from the tokens of the one resolved state of its look.
struct TanreiTabChrome: View {
  let entry: TanreiTabEntry
  let variant: TanreiTabsVariant
  let scrollable: Bool
  let isSelected: Bool
  let isPressed: Bool
  /// Keyboard focus: SwiftUI never moves focus to a button on a click or tap (TAB-3, TAB-4).
  let isFocused: Bool
  var keyboardPresses = 0
  /// The row's namespace, in which the selected indicator slides; `nil` draws it in place.
  var indicator: Namespace.ID? = nil

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiTheme) private var theme
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    let feedback = theme.system.behavior.pressedFeedback
    // TAB-8: a press stays visible at least `duration.press-hold`; TAB-9: the point of contact only under `ripple`.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyboardPresses, watchesContact: feedback == .ripple) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let system = theme.system
    let tokens = system.tabs
    // TAB-3: exactly one state — pressed > focused > hovered; TAB-6: disabled is a state too.
    let state = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let appearance = TanreiTabAppearance(tokens: tokens, variant: variant, isSelected: isSelected, state: state, feedback: feedback, beneath: beneath)
    let ripple = appearance.ripple.map {
      TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion))
    }
    let geometry = TanreiTabGeometry(tokens: tokens, variant: variant, entry: entry, measure: system.measure)
    let stateMotion = tokens.stateMotion(reduceMotion: reduceMotion)

    // TAB-16: the indicator on the tab's bottom edge (the row's), its corners away from the divider rounded; TAB-17: the
    // selected one slides from the old tab to the new over the indicator's motion (at once where motion is reduced).
    let bar = UnevenRoundedRectangle(
      topLeadingRadius: appearance.indicatorShape, bottomLeadingRadius: .zero, bottomTrailingRadius: .zero,
      topTrailingRadius: appearance.indicatorShape, style: system.shape.roundedCornerStyle)
    let indicatorLayer = ZStack {
      if isSelected {
        bar.fill(colors[appearance.indicator])
          .modifier(TanreiTabIndicatorMatch(namespace: indicator))
          .transition(.identity)
      } else {
        bar.fill(colors[appearance.indicator])
      }
    }
    .frame(height: appearance.indicatorThickness)
    .animation(tokens.indicatorMotion(reduceMotion: reduceMotion), value: isSelected)
    .accessibilityHidden(true)

    return TanreiTabLayout(
      paddingInline: tokens.containerPaddingInline, clearance: geometry.clearance, minimumWidth: geometry.minimumWidth,
      minimumHeight: geometry.minimumHeight, spansContent: geometry.indicatorSpansContent
    ) {
      content(tokens: tokens, appearance: appearance, geometry: geometry)
        .animation(stateMotion, value: state)
        .animation(stateMotion, value: isSelected)
      indicatorLayer
    }
    // TAB-3, TAB-6, TAB-9, TAB-10: the tab's fill and state layer, its corners eased by the corner smoothing, the ripple and
    // the state's opacity on the whole tab (its indicator included); TAB-23: a change of state or of selection over the
    // state motion (at once under Reduce Motion); TAB-4: the ring inside the tab, which a scrolling row would otherwise
    // clip — keyboard focus only, never animated.
    .modifier(
      TanreiItemRowContainer(
        fill: colors[appearance.container], ripple: ripple, cornerRadius: appearance.cornerRadius, opacity: appearance.opacity,
        motion: stateMotion, state: state, condition: isSelected, showsFocusRing: isFocused && isEnabled))
    .onHover { isHovered = $0 }
  }

  /// TAB-18, TAB-19: the icon above the label (primary) or before it (secondary), or either alone.
  @ViewBuilder
  private func content(tokens: TanreiTabsTokens, appearance: TanreiTabAppearance, geometry: TanreiTabGeometry) -> some View {
    let icon = entry.icon.map { icon in
      // TAB-18: the family and fill of the tab's selection, at the icon size (an icon is not text: it does not scale).
      TanreiItemIconView(icon: icon, size: tokens.iconSize, selected: isSelected)
        .foregroundStyle(colors[appearance.icon])
    }
    let text = entry.drawsLabel ? label(tokens: tokens, color: appearance.label) : nil
    switch geometry.arrangement {
    case .iconOnly:
      icon
    case .labelOnly:
      text
    case .stacked:
      VStack(spacing: tokens.containerGap) {
        icon
        text
      }
    case .inline:
      // The icon beside the label's FIRST line: a wrapping label keeps its icon by its first line.
      let line = tokens.labelTypescale.resolved(policy: theme.fontFamilyPolicy, dynamicTypeSize: dynamicTypeSize).lineHeight
      HStack(alignment: .top, spacing: tokens.containerGap) {
        icon.padding(.top, max(.zero, (line - tokens.iconSize) / 2))
        text.padding(.top, max(.zero, (tokens.iconSize - line) / 2))
      }
    }
  }

  /// TAB-14: a fixed tab's label wraps (centered); a scrollable tab keeps it on one line and grows wider.
  private func label(tokens: TanreiTabsTokens, color: TanreiPaint) -> some View {
    Text(verbatim: entry.title)
      .multilineTextAlignment(.center)
      .lineLimit(scrollable ? 1 : nil)
      .fixedSize(horizontal: scrollable, vertical: true)
      .tanreiTextStyle(tokens.labelTypescale)
      .foregroundStyle(colors[color])
  }
}

/// The selected indicator's identity in the row's namespace, when there is one.
private struct TanreiTabIndicatorMatch: ViewModifier {
  let namespace: Namespace.ID?

  func body(content: Content) -> some View {
    if let namespace { content.matchedGeometryEffect(id: TanreiTabsIndicatorID.selected, in: namespace) } else { content }
  }
}

/// What a tab's layout depends on: how its content is arranged, how tall and wide it is at least, and how far its content
/// keeps from its edges.
struct TanreiTabGeometry: Equatable {
  enum Arrangement: Equatable {
    case labelOnly
    case iconOnly
    /// Primary: the icon above the label.
    case stacked
    /// Secondary: the icon before the label.
    case inline
  }

  let arrangement: Arrangement
  /// TAB-18: `container.height`, or `container.height-with-icon` for a primary tab with its icon above a drawn label; and
  /// at least the minimum target (TAB-5).
  let minimumHeight: CGFloat
  /// TAB-5: the minimum target.
  let minimumWidth: CGFloat
  /// TAB-16: the content stays clear of the indicator — inset above and below by the variant's resting thickness, which
  /// changes nothing while the content is shorter than the tab.
  let clearance: CGFloat
  /// TAB-16: primary's indicator spans the tab's content; secondary's the whole tab. A variant a layer adds takes primary's
  /// form.
  let indicatorSpansContent: Bool

  init(tokens: TanreiTabsTokens, variant: TanreiTabsVariant, entry: TanreiTabEntry, measure: TanreiMeasure) {
    let secondary = variant == .secondary
    switch (entry.icon != nil, entry.drawsLabel) {
    case (true, false): arrangement = .iconOnly
    case (true, true): arrangement = secondary ? .inline : .stacked
    default: arrangement = .labelOnly
    }
    let target = TanreiHitTarget.minimum(in: measure)
    minimumHeight = max(arrangement == .stacked ? tokens.containerHeightWithIcon : tokens.containerHeight, target)
    minimumWidth = target
    clearance = tokens.variants[variant].enabled.activeIndicatorThickness
    indicatorSpansContent = !secondary
  }
}

/// One tab's box: at least `minimumWidth` × `minimumHeight` (and as wide and tall as the row proposes), its content inset
/// by `paddingInline` on each side and by `clearance` above and below, and centered; then the indicator (the second
/// subview) on the bottom edge, as wide as the content placed (`spansContent`) or as the whole tab. Stateless; mirrored
/// right to left by SwiftUI.
struct TanreiTabLayout: Layout {
  let paddingInline: CGFloat
  let clearance: CGFloat
  let minimumWidth: CGFloat
  let minimumHeight: CGFloat
  let spansContent: Bool

  private func contentSize(proposal: ProposedViewSize, subviews: Subviews) -> CGSize {
    guard let content = subviews.first else { return .zero }
    let available = proposal.width.flatMap { $0.isFinite ? max(.zero, $0 - 2 * paddingInline) : nil }
    return content.sizeThatFits(ProposedViewSize(width: available, height: nil))
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let content = contentSize(proposal: proposal, subviews: subviews)
    var width = max(minimumWidth, content.width + 2 * paddingInline)
    if let proposed = proposal.width, proposed.isFinite { width = max(width, proposed) }
    var height = max(minimumHeight, content.height + 2 * clearance)
    if let proposed = proposal.height, proposed.isFinite { height = max(height, proposed) }
    return CGSize(width: width, height: height)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    guard let content = subviews.first else { return }
    let size = contentSize(proposal: ProposedViewSize(width: bounds.width, height: nil), subviews: subviews)
    let origin = CGPoint(x: bounds.midX - size.width / 2, y: bounds.midY - size.height / 2)
    content.place(at: origin, anchor: .topLeading, proposal: ProposedViewSize(size))
    for bar in subviews.dropFirst() {
      let width = spansContent ? size.width : bounds.width
      let height = bar.sizeThatFits(ProposedViewSize(width: width, height: nil)).height
      bar.place(
        at: CGPoint(x: spansContent ? origin.x : bounds.minX, y: bounds.maxY - height), anchor: .topLeading,
        proposal: ProposedViewSize(width: width, height: height))
    }
  }
}

// MARK: - Token bindings

extension TanreiTabsTokens {
  /// How the TAB-9 ripple grows: over `comp.tabs.motion.feedback-duration`, with the state easing. `nil` under Reduce
  /// Motion — the layer appears whole.
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// TAB-23: a change of state or of selection — the colors — over the state motion; `nil` under Reduce Motion.
  func stateMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionStateDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// TAB-15, TAB-17: the indicator's slide and a tab scrolled into view; `nil` under Reduce Motion.
  func indicatorMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionIndicatorDuration, easing: motionIndicatorEasing, reduceMotion: reduceMotion)
  }
}

/// The colors of one look (not selected, or selected) in one state.
struct TanreiTabParts: Equatable {
  let container: TanreiPaint
  let label: TanreiPaint
  let icon: TanreiPaint
  let indicator: TanreiPaint
}

extension TanreiTabsVariantStateTokens {
  /// TAB-11: the parts of a look — the variant's own for a tab that is not selected, its `selected.` parts for the selected
  /// tab. (The look's `state-layer.color` is not read: it is what the design system mixed into this state's
  /// container.)
  func parts(selected: Bool) -> TanreiTabParts {
    selected
      ? TanreiTabParts(container: selectedContainerColor, label: selectedLabelColor, icon: selectedIconColor, indicator: selectedActiveIndicatorColor)
      : TanreiTabParts(container: containerColor, label: labelColor, icon: iconColor, indicator: activeIndicatorColor)
  }
}

/// Which token values a tab draws for one variant × look × state. Pure data read from a `TanreiTabsTokens`, so the
/// bindings can be tested without rendering. TAB-3 / TAB-6: every state, disabled included, is drawn from that state's
/// tokens of the tab's look (TAB-11).
struct TanreiTabAppearance: Equatable {
  let container: TanreiPaint
  /// TAB-9 `ripple`: the pressed container paint of the look, grown from the point of contact over `container`.
  let ripple: TanreiPaint?
  let label: TanreiPaint
  let icon: TanreiPaint
  let indicator: TanreiPaint
  let indicatorThickness: CGFloat
  let indicatorShape: CGFloat
  /// Opacity of the whole tab.
  let opacity: Double
  let cornerRadius: CGFloat

  init(
    tokens: TanreiTabsTokens, variant: TanreiTabsVariant, isSelected: Bool, state: TanreiInteraction, feedback: TanreiPressedFeedback = .overlay,
    beneath: TanreiInteraction = .enabled
  ) {
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    // TAB-7: the lookup is total — an unknown variant reads primary's tokens (and is reported).
    let variantTokens = tokens.variants[variant]
    let own = variantTokens[state: layers.state]
    let parts = own.parts(selected: isSelected)
    container = variantTokens[state: layers.container].parts(selected: isSelected).container
    ripple = layers.ripple.map { variantTokens[state: $0].parts(selected: isSelected).container }
    label = parts.label
    icon = parts.icon
    indicator = parts.indicator
    indicatorThickness = own.activeIndicatorThickness
    indicatorShape = own.activeIndicatorShape
    // The vocabulary has no rest-state `opacity` token: a tab at rest is not dimmed.
    opacity = tokens[state: layers.state]?.opacity ?? TanreiIdentity.opacity
    cornerRadius = tokens.containerShape
  }
}
