import SwiftUI
#if os(iOS)
import UIKit
#endif

// Spec: specs/menu.spec.json — tokens: TanreiMenuTokens (comp.menu), read from the design system in the environment
// (`system.menu`). Every design value in this file comes from a token; there are no literals, and no state's look is
// computed here. An item is pressed like Button: press, hold, ripple, focus ring and container layers are
// the shared primitives (`TanreiItemRowContainer` is the list's too), and MNU-12, MNU-15, MNU-16 and MNU-17 are BTN-5,
// BTN-8, BTN-9 and BTN-10 for the menu item. The item kinds are `TanreiMenuItem` (an action),
// `TanreiMenuToggle` (checkbox-item), `TanreiMenuOption` (radio-item) and `TanreiMenuSection` (group).
//
// The menu reads its content as data: each item puts what it is into a trait of its own view (its title, icons, texts,
// action or binding, and whether it is enabled — `.disabled(_:)` applied to it is seen), a section marks its items and
// its title, and the menu draws every row itself from that list. So everything a row needs from the whole menu — the mark
// and icon columns every row reserves (MNU-19), the dividers between groups (MNU-23), each item's position (MNU-24) —
// is known on the first layout pass. SwiftUI's own `Menu` is not used: its items cannot be tokenised.

/// Where the menu's surface goes against its anchor (spec prop `placement`): below or above it, with its start or end
/// edge aligned to the anchor's. A closed set.
public enum TanreiMenuPlacement: String, CaseIterable, Sendable {
  case bottomStart = "bottom-start"
  case bottomEnd = "bottom-end"
  case topStart = "top-start"
  case topEnd = "top-end"

  /// The placement a spec value names, for UI built from data (`"bottom-end"`). MNU-14: any other name is
  /// `.bottomStart`, the default, and is reported in debug builds (`TanreiDiagnostics`).
  public init(named name: String) {
    if let placement = TanreiMenuPlacement(rawValue: name) {
      self = placement
    } else {
      TanreiDiagnostics.report("Tanrei: a menu has no placement \"\(name)\"; using \"bottom-start\" (MNU-14)")
      self = .bottomStart
    }
  }

  /// Below the anchor (`bottom-…`) or above it.
  var isBelow: Bool { self == .bottomStart || self == .bottomEnd }

  /// Aligned with the anchor's start edge (`…-start`) or its end edge.
  var isStart: Bool { self == .bottomStart || self == .topStart }

  /// MNU-2: the point of the anchor the popover is attached to — its bottom or top edge at its start or end, the start
  /// mirrored right to left.
  func attachmentPoint(layoutDirection: LayoutDirection) -> UnitPoint {
    let leading = isStart == (layoutDirection == .leftToRight)
    switch (isBelow, leading) {
    case (true, true): return .bottomLeading
    case (true, false): return .bottomTrailing
    case (false, true): return .topLeading
    case (false, false): return .topTrailing
    }
  }

  /// The edge of the popover that faces the anchor, where its arrow is: the top for a menu below its anchor.
  var arrowEdge: Edge { isBelow ? .top : .bottom }

  /// MNU-2: the same start or end edge on the other side of the anchor, when `flips`.
  func flipped(when flips: Bool) -> TanreiMenuPlacement {
    guard flips else { return self }
    switch self {
    case .bottomStart: return .topStart
    case .bottomEnd: return .topEnd
    case .topStart: return .bottomStart
    case .topEnd: return .bottomEnd
    }
  }
}

/// Why a menu closed (the spec's `close` event, named escape, back, outside, tab, focus-out or item). On SwiftUI the menu
/// closes itself through its `isPresented` binding (MNU-5); the reason is not exposed.
enum TanreiMenuCloseReason: String, Sendable {
  case escape
  case back
  case outside
  case tab
  case focusOut = "focus-out"
  case item
}

extension View {
  /// Presents a Tanrei menu from this view — its anchor, the product's own button, icon button or field — while
  /// `isPresented` is true, as `.popover` does (MNU-1): in a popover that stays a popover on iPhone
  /// (`presentationCompactAdaptation(.popover)`), placed against the anchor as `placement` says.
  ///
  ///     @State private var showsMenu = false
  ///     TanreiIconButton("More", action: { showsMenu = true }) { Image(systemName: "ellipsis") }
  ///       .tanreiMenu(isPresented: $showsMenu) {
  ///         TanreiMenuItem("Cut", leadingIcon: "content_cut", trailingText: "⌘X", action: cut)
  ///         TanreiMenuItem("Delete", role: .destructive, action: delete)
  ///         TanreiMenuSection("View") {
  ///           TanreiMenuToggle("Show grid", isOn: $showsGrid)
  ///         }
  ///         TanreiMenuSection("Sort by", selection: $sort) {
  ///           TanreiMenuOption("Name").tag(Sort.name)
  ///           TanreiMenuOption("Date").tag(Sort.date)
  ///         }
  ///       }
  ///
  /// The menu closes itself through the binding (the spec's `close`, MNU-5, MNU-6): after an action; after a toggle or an
  /// option chosen by pointer, touch or Enter (Space leaves it open); on Escape, Tab or a press outside. A press outside
  /// does not reach what is under it (a popover's rule). Focus moves to the first enabled item when it opens and back to
  /// the anchor when it closes.
  public func tanreiMenu<Content: View>(
    isPresented: Binding<Bool>, placement: TanreiMenuPlacement = .bottomStart, @ViewBuilder content: @escaping () -> Content
  ) -> some View {
    modifier(TanreiMenuAnchor(isPresented: isPresented, placement: placement, menu: content))
  }
}

/// The anchor's side of a menu: the popover, the side it opens on, and focus back to the anchor when the menu closes with
/// focus inside it.
private struct TanreiMenuAnchor<Menu: View>: ViewModifier {
  let isPresented: Binding<Bool>
  let placement: TanreiMenuPlacement
  let menu: () -> Menu

  @Environment(\.layoutDirection) private var layoutDirection
  @Environment(\.tanreiSystem) private var system
  @FocusState private var anchorFocused: Bool
  @State private var focusInside = TanreiMenuFocusFlag()
  /// MNU-2: where the anchor is in its window, how tall the window is, and how tall the menu is.
  @State private var room = TanreiMenuRoom()

  func body(content: Content) -> some View {
    let tokens = system.menu
    // MNU-2: the side placement names, or the other one when it has more room and this one too little.
    let side = placement.flipped(
      when: room.flips(below: placement.isBelow, offset: tokens.surfaceOffset, margin: tokens.surfaceViewportMargin))
    content
      .focused($anchorFocused)
      .popover(isPresented: isPresented, attachmentAnchor: .point(side.attachmentPoint(layoutDirection: layoutDirection)), arrowEdge: side.arrowEdge) {
        TanreiMenu(isPresented: isPresented, placement: side, isInPlace: false, focusInside: focusInside, content: menu())
          .presentationCompactAdaptation(.popover)
          .presentationBackground(.clear)
      }
      .background {
        // What MNU-2 measures: the anchor's frame in its window, the window's height, and the menu's own height (an
        // unseen copy of the menu, drawn in place).
        GeometryReader { proxy in
          Color.clear
            .onAppear { room.anchor = proxy.frame(in: .global) }
            .onChange(of: proxy.frame(in: .global)) { _, frame in room.anchor = frame }
        }
        TanreiWindowHeightReader { room.window = $0 }
        TanreiMenu(isPresented: .constant(false), placement: placement, isInPlace: true, focusInside: nil, content: menu())
          .fixedSize()
          .background {
            GeometryReader { proxy in
              Color.clear
                .onAppear { room.menu = proxy.size.height }
                .onChange(of: proxy.size.height) { _, height in room.menu = height }
            }
          }
          .hidden()
          .allowsHitTesting(false)
          .accessibilityHidden(true)
          .frame(width: .zero, height: .zero, alignment: .topLeading)
      }
      // MNU-1: when the menu closes with focus inside it, focus returns to the anchor.
      .onChange(of: isPresented.wrappedValue) { _, open in
        guard !open, focusInside.value else { return }
        focusInside.value = false
        Task { @MainActor in anchorFocused = true }
      }
  }
}

/// MNU-2 — the room above and below an anchor, and the menu's height: whether the menu flips to the other side.
struct TanreiMenuRoom: Equatable {
  /// The anchor's frame in its window's coordinates.
  var anchor: CGRect = .zero
  /// The window's height; 0 while unknown (then the menu never flips — the popover still keeps itself on screen).
  var window: CGFloat = .zero
  /// The menu's natural height.
  var menu: CGFloat = .zero

  /// Whether the menu opens on the other side: the side placement names has less room than the menu needs within the
  /// viewport margin (after the offset from the anchor), and the other side has more.
  func flips(below: Bool, offset: CGFloat, margin: CGFloat) -> Bool {
    guard window > .zero, menu > .zero else { return false }
    let roomBelow = window - anchor.maxY - offset - margin
    let roomAbove = anchor.minY - offset - margin
    let (preferred, other) = below ? (roomBelow, roomAbove) : (roomAbove, roomBelow)
    return preferred < menu && other > preferred
  }
}

/// Reports the height of the window the view is in (iOS); nothing elsewhere. The search's docked view reads it too (SRC-7).
struct TanreiWindowHeightReader: View {
  let report: (CGFloat) -> Void

  var body: some View {
    #if os(iOS)
    TanreiWindowHeightProbe(report: report)
      .frame(width: .zero, height: .zero)
      .allowsHitTesting(false)
      .accessibilityHidden(true)
    #else
    Color.clear.frame(width: .zero, height: .zero)
    #endif
  }
}

#if os(iOS)
private struct TanreiWindowHeightProbe: UIViewRepresentable {
  let report: (CGFloat) -> Void

  func makeUIView(context: Context) -> ProbeView { ProbeView() }

  func updateUIView(_ view: ProbeView, context: Context) {
    view.report = report
  }

  final class ProbeView: UIView {
    var report: ((CGFloat) -> Void)?

    override func didMoveToWindow() {
      super.didMoveToWindow()
      tell()
    }

    override func layoutSubviews() {
      super.layoutSubviews()
      tell()
    }

    private func tell() {
      guard let height = window?.bounds.height else { return }
      let report = self.report
      Task { @MainActor in report?(height) }
    }
  }
}
#endif

/// MNU-8: the item the pointer entered last. A reference, not observed: the pointer's arrival redraws nothing (a redraw
/// arriving as a press began left the hosted button pressed), and the keys read it when they move.
@MainActor
final class TanreiMenuPointer {
  var item: Int?
}

/// Whether keyboard focus is inside the menu: a reference the menu sets and the anchor reads when it closes.
@MainActor
final class TanreiMenuFocusFlag {
  var value = false
}

// MARK: - The menu

/// The menu's surface and its items (spec `menu`). Presented by `.tanreiMenu(isPresented:placement:content:)`; the
/// fixtures draw it in place with the test-only `init(inPlace:)` (`@_spi(Fixtures)`): at its natural size, with its
/// elevation, and without an anchor, placement or open motion (MNU-19's verify).
public struct TanreiMenu<Content: View>: View {
  let isPresented: Binding<Bool>
  let placement: TanreiMenuPlacement
  let isInPlace: Bool
  let focusInside: TanreiMenuFocusFlag?
  let content: Content

  init(isPresented: Binding<Bool>, placement: TanreiMenuPlacement, isInPlace: Bool, focusInside: TanreiMenuFocusFlag?, content: Content) {
    self.isPresented = isPresented
    self.placement = placement
    self.isInPlace = isInPlace
    self.focusInside = focusInside
    self.content = content
  }

  /// The menu drawn in place, open (fixtures and galleries only).
  @_spi(Fixtures)
  public init(inPlace content: () -> Content) {
    self.init(isPresented: .constant(true), placement: .bottomStart, isInPlace: true, focusInside: nil, content: content())
  }

  public var body: some View {
    _VariadicView.Tree(
      TanreiMenuRoot(
        close: { [isPresented] _ in isPresented.wrappedValue = false }, placement: placement, isInPlace: isInPlace, focusInside: focusInside)
    ) {
      content
    }
  }
}

/// Reads the menu's content — every item's and section's trait, in order — and hands the rows to `TanreiMenuSurface`.
private struct TanreiMenuRoot: _VariadicView_UnaryViewRoot {
  let close: @MainActor (TanreiMenuCloseReason) -> Void
  let placement: TanreiMenuPlacement
  let isInPlace: Bool
  let focusInside: TanreiMenuFocusFlag?

  func body(children: _VariadicView.Children) -> some View {
    let parts = children.map { TanreiMenuPart(entry: $0[TanreiMenuEntryKey.self], section: $0[TanreiMenuSectionKey.self], title: $0[TanreiMenuTitleKey.self]) }
    return TanreiMenuSurface(
      model: TanreiMenuContent(parts: parts), close: close, placement: placement, isInPlace: isInPlace, focusInside: focusInside)
  }
}

// MARK: - Items

/// An action of a menu (the spec's item kind `item`): it does something and closes the menu, as `Button` in a `Menu`.
/// `role: .destructive` draws it in the destructive condition (the error color). `disabled` follows `.disabled(_:)`.
///
///     TanreiMenuItem("Copy", leadingIcon: "content_copy", trailingText: "⌘C", action: copy)
///     TanreiMenuItem("Delete", role: .destructive, action: delete)
public struct TanreiMenuItem: View {
  let entry: TanreiMenuItemInfo
  let role: ButtonRole?
  let action: @MainActor () -> Void

  @Environment(\.isEnabled) private var isEnabled

  public init<S: StringProtocol>(
    _ title: S, role: ButtonRole? = nil, supportingText: String = "", leadingIcon: TanreiItemIcon? = nil, trailingIcon: TanreiItemIcon? = nil,
    trailingText: String = "", action: @escaping @MainActor () -> Void
  ) {
    entry = TanreiMenuItemInfo(title: String(title), supportingText: supportingText, leadingIcon: leadingIcon, trailingIcon: trailingIcon, trailingText: trailingText)
    self.role = role
    self.action = action
  }

  /// MNU-18: destructive while `role` is `.destructive`.
  var isDestructive: Bool { role == .destructive }

  public var body: some View {
    TanreiMenuPlaceholder(entry: TanreiMenuEntry(info: entry, kind: .action(action, destructive: isDestructive), isEnabled: isEnabled, group: nil))
  }
}

/// An option of a menu that is switched on or off on its own (the spec's item kind `checkbox-item`), as `Toggle` in a
/// `Menu`: activating it writes `isOn` (the spec's `change`). `disabled` follows `.disabled(_:)`.
///
///     TanreiMenuToggle("Show grid", isOn: $showsGrid)
public struct TanreiMenuToggle: View {
  let entry: TanreiMenuItemInfo
  let isOn: Binding<Bool>

  @Environment(\.isEnabled) private var isEnabled

  public init<S: StringProtocol>(
    _ title: S, isOn: Binding<Bool>, supportingText: String = "", leadingIcon: TanreiItemIcon? = nil, trailingIcon: TanreiItemIcon? = nil,
    trailingText: String = ""
  ) {
    entry = TanreiMenuItemInfo(title: String(title), supportingText: supportingText, leadingIcon: leadingIcon, trailingIcon: trailingIcon, trailingText: trailingText)
    self.isOn = isOn
  }

  public var body: some View {
    TanreiMenuPlaceholder(entry: TanreiMenuEntry(info: entry, kind: .toggle(isOn), isEnabled: isEnabled, group: nil))
  }
}

/// One choice of several in a `TanreiMenuSection(_:selection:)` (the spec's item kind `radio-item`), as a `Picker`'s
/// tagged option: it is checked while the section's selection holds its tag (`.tag(_:)`, applied to the option itself),
/// and activating it writes the tag to the selection (the section's `change`). `disabled` follows `.disabled(_:)`.
///
///     TanreiMenuSection("Sort by", selection: $sort) {
///       TanreiMenuOption("Name").tag(Sort.name)
///       TanreiMenuOption("Date").tag(Sort.date)
///     }
public struct TanreiMenuOption: View {
  let entry: TanreiMenuItemInfo
  var value: AnyHashable?

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiMenuGroup) private var group

  public init<S: StringProtocol>(
    _ title: S, supportingText: String = "", leadingIcon: TanreiItemIcon? = nil, trailingIcon: TanreiItemIcon? = nil, trailingText: String = ""
  ) {
    entry = TanreiMenuItemInfo(title: String(title), supportingText: supportingText, leadingIcon: leadingIcon, trailingIcon: trailingIcon, trailingText: trailingText)
  }

  /// The option's value (the spec's radio item `value`): the section's selection checks the option whose tag it holds.
  /// Apply it to the `TanreiMenuOption` itself, before any other modifier.
  public func tag<V: Hashable>(_ tag: V) -> TanreiMenuOption {
    var option = self
    option.value = AnyHashable(tag)
    return option
  }

  public var body: some View {
    TanreiMenuPlaceholder(entry: TanreiMenuEntry(info: entry, kind: .option(value), isEnabled: isEnabled, group: group))
  }
}

/// A run of related items (the spec's item kind `group`), as `Section` in a `Menu`: the menu draws a divider between it
/// and what is next to it (MNU-23), and its title — when it has one — above its items (MNU-28). With `selection:` its
/// `TanreiMenuOption`s are one set of choices, as an inline `Picker`: writing the binding is the group's `change`.
///
///     TanreiMenuSection("View") { TanreiMenuToggle("Show grid", isOn: $showsGrid) }
///     TanreiMenuSection("Sort by", selection: $sort) { … }
///
/// A section inside another is drawn as the outer section's items, with no title or divider of its own (MNU-29).
public struct TanreiMenuSection<Content: View>: View {
  let title: String
  let selection: TanreiMenuSelection?
  let content: Content

  @Environment(\.tanreiMenuGroup) private var enclosing
  @State private var id = TanreiMenuSectionID()

  /// A section titled `title` (empty: untitled).
  public init<S: StringProtocol>(_ title: S, @ViewBuilder content: () -> Content) {
    self.title = String(title)
    selection = nil
    self.content = content()
  }

  /// An untitled section.
  public init(@ViewBuilder content: () -> Content) {
    self.init("", content: content)
  }

  /// A section of options: the one whose tag `selection` holds is checked; `nil` checks none.
  public init<S: StringProtocol, V: Hashable>(_ title: S, selection: Binding<V?>, @ViewBuilder content: () -> Content) {
    self.title = String(title)
    self.selection = TanreiMenuSelection(selection)
    self.content = content()
  }

  /// An untitled section of options.
  public init<V: Hashable>(selection: Binding<V?>, @ViewBuilder content: () -> Content) {
    self.init("", selection: selection, content: content)
  }

  public var body: some View {
    if let enclosing {
      // MNU-29: a section in a section is drawn as the outer one's items — its options stay in the outer one's group.
      let _ = TanreiDiagnostics.report("Tanrei: a menu section holds another section; its items are drawn as the outer section's, with no title or divider of its own (MNU-29)")
      content.environment(\.tanreiMenuGroup, enclosing)
    } else {
      let group = TanreiMenuGroupContext(id: id, selection: selection)
      Group {
        // The section's start: it carries the title (empty: none) even when the section holds no items.
        Color.clear
          .frame(width: .zero, height: .zero)
          ._trait(TanreiMenuTitleKey.self, title)
        content
          .environment(\.tanreiMenuGroup, group)
      }
      ._trait(TanreiMenuSectionKey.self, id)
    }
  }
}

/// What every item shows.
struct TanreiMenuItemInfo {
  let title: String
  let supportingText: String
  let leadingIcon: TanreiItemIcon?
  let trailingIcon: TanreiItemIcon?
  let trailingText: String

  init(title: String, supportingText: String, leadingIcon: TanreiItemIcon?, trailingIcon: TanreiItemIcon?, trailingText: String) {
    self.title = title
    self.supportingText = supportingText
    self.leadingIcon = leadingIcon
    self.trailingIcon = trailingIcon
    self.trailingText = trailingText
    // MNU-26: an item without a label has no accessible name.
    if title.trimmingCharacters(in: .whitespaces).isEmpty {
      TanreiDiagnostics.report("Tanrei: a menu item's label is empty, so it has no accessible name (MNU-26); give it a label")
    }
  }

  /// MNU-24: the supporting text and the trailing text (SwiftUI has no keyboard-shortcut property to read), in order.
  var accessibilityDescription: String {
    [supportingText, trailingText].filter { !$0.isEmpty }.joined(separator: ", ")
  }
}

/// A radio section's selection, typed away: which value is chosen, and the route to the binding.
struct TanreiMenuSelection {
  let value: AnyHashable?
  let choose: @MainActor (AnyHashable) -> Void

  @MainActor
  init<V: Hashable>(_ binding: Binding<V?>) {
    value = binding.wrappedValue.map { AnyHashable($0) }
    let write = TanreiMenuSelectionWriter(binding: binding)
    choose = { value in write.write(value) }
  }

  init(value: AnyHashable?, choose: @escaping @MainActor (AnyHashable) -> Void) {
    self.value = value
    self.choose = choose
  }
}

/// Writes a typed binding from a value typed away: a value of another type writes nothing.
@MainActor
private struct TanreiMenuSelectionWriter<V: Hashable> {
  let binding: Binding<V?>

  func write(_ value: AnyHashable) {
    if let typed = value.base as? V { binding.wrappedValue = typed }
  }
}

/// The section an item is in, as its items see it.
struct TanreiMenuGroupContext {
  let id: TanreiMenuSectionID
  let selection: TanreiMenuSelection?
}

struct TanreiMenuSectionID: Hashable, Sendable {
  let raw = UUID()
}

private struct TanreiMenuGroupKey: EnvironmentKey {
  static var defaultValue: TanreiMenuGroupContext? { nil }
}

extension EnvironmentValues {
  /// The section the items below are in; `nil` outside one.
  var tanreiMenuGroup: TanreiMenuGroupContext? {
    get { self[TanreiMenuGroupKey.self] }
    set { self[TanreiMenuGroupKey.self] = newValue }
  }
}

/// One item as the menu reads it.
struct TanreiMenuEntry {
  enum Kind {
    case action(@MainActor () -> Void, destructive: Bool)
    case toggle(Binding<Bool>)
    case option(AnyHashable?)
  }

  let info: TanreiMenuItemInfo
  let kind: Kind
  let isEnabled: Bool
  /// The section the item is in (a radio item's group); `nil` outside any.
  let group: TanreiMenuGroupContext?

  /// A checkbox or radio item: it has a mark (MNU-19).
  var isCheckable: Bool {
    if case .action = kind { return false }
    return true
  }

  /// MNU-18: destructive for a destructive action, selected for a checked checkbox item and for a radio item whose value
  /// its group's value equals, otherwise unselected.
  var condition: TanreiMenuCondition {
    switch kind {
    case .action(_, let destructive): return destructive ? .destructive : .unselected
    case .toggle(let isOn): return isOn.wrappedValue ? .selected : .unselected
    case .option(let value):
      guard let value, let chosen = group?.selection?.value else { return .unselected }
      return value == chosen ? .selected : .unselected
    }
  }

  /// MNU-24: the position the item states as its accessibility value — except a checkbox item's, whose value is its on
  /// or off (a toggle's value; a position would replace it).
  func accessibilityPosition(index: Int, count: Int) -> String? {
    if case .toggle = kind { return nil }
    return TanreiMenuRules.positionText(index: index, count: count)
  }

  /// MNU-24: a menu item, a menu item checkbox (a toggle) or a menu item radio (a selectable button).
  var traits: AccessibilityTraits {
    let checked = condition == .selected
    switch kind {
    case .action: return []
    case .toggle: return checked ? [.isToggle, .isSelected] : .isToggle
    case .option: return checked ? .isSelected : []
    }
  }
}

/// How an activation came: Space leaves the menu open after a checkbox or radio item (MNU-6).
enum TanreiMenuActivation: Sendable {
  case pointer
  case enter
  case space
}

extension TanreiMenuEntry {
  /// The single route to an activation (MNU-6, MNU-9): an enabled action calls its action and closes; a checkbox item
  /// switches `isOn`; a radio item writes its value to its group unless it is already checked; both then close unless the
  /// activation came from Space. A disabled item does nothing. Returns whether the menu closes.
  @MainActor
  func activate(by activation: TanreiMenuActivation) -> Bool {
    guard isEnabled else { return false }
    switch kind {
    case .action(let action, _):
      action()
      return true
    case .toggle(let isOn):
      isOn.wrappedValue.toggle()
    case .option(let value):
      if let value, let selection = group?.selection, selection.value != value { selection.choose(value) }
    }
    return activation != .space
  }
}

struct TanreiMenuEntryKey: _ViewTraitKey {
  static var defaultValue: TanreiMenuEntry? { nil }
}

struct TanreiMenuSectionKey: _ViewTraitKey {
  static var defaultValue: TanreiMenuSectionID? { nil }
}

struct TanreiMenuTitleKey: _ViewTraitKey {
  static var defaultValue: String? { nil }
}

/// What an item draws in its own place: nothing — the menu draws its row from the trait.
private struct TanreiMenuPlaceholder: View {
  let entry: TanreiMenuEntry

  var body: some View {
    Color.clear
      .frame(width: .zero, height: .zero)
      .accessibilityHidden(true)
      ._trait(TanreiMenuEntryKey.self, entry)
  }
}

// MARK: - The menu's content, as data

/// One child of the menu's content: an item, or a section's start (with its title), and the section it is in.
struct TanreiMenuPart {
  let entry: TanreiMenuEntry?
  let section: TanreiMenuSectionID?
  let title: String?
}

/// The menu's rows, grouped: runs of items outside any section, and sections (MNU-23, MNU-28, MNU-29).
struct TanreiMenuContent {
  struct Block {
    let section: TanreiMenuSectionID?
    let title: String
    var rows: [Int]
  }

  let entries: [TanreiMenuEntry]
  let blocks: [Block]

  init(parts: [TanreiMenuPart]) {
    var entries: [TanreiMenuEntry] = []
    var blocks: [Block] = []
    for part in parts {
      if let title = part.title {
        // A section's start: a new block, even after the same section's items (a section never repeats).
        blocks.append(Block(section: part.section, title: title, rows: []))
        continue
      }
      guard let entry = part.entry else { continue }
      let index = entries.count
      entries.append(entry)
      if let last = blocks.last, last.section == part.section {
        blocks[blocks.count - 1].rows.append(index)
      } else {
        blocks.append(Block(section: part.section, title: "", rows: [index]))
      }
    }
    self.entries = entries
    // A section with no items draws nothing (no title, no divider).
    self.blocks = blocks.filter { !$0.rows.isEmpty }
  }

  /// MNU-19: the mark column, while any item is a checkbox or radio item.
  var hasMark: Bool { entries.contains { $0.isCheckable } }

  /// MNU-19: the leading icon column, while any item has a leading icon.
  var hasIcon: Bool { entries.contains { $0.info.leadingIcon.drawn != nil } }

  /// MNU-23: a divider before block `index`: between two blocks, one of which is always a section.
  func dividerBefore(_ index: Int) -> Bool { index > 0 }

  /// MNU-29: a radio item outside any section with a selection, a section whose selection names none of its radio
  /// items, and two radio items of one section sharing a value.
  var problems: [String] {
    var problems: [String] = []
    var bySection: [TanreiMenuSectionID: [AnyHashable]] = [:]
    var selections: [TanreiMenuSectionID: AnyHashable] = [:]
    for entry in entries {
      guard case .option(let value) = entry.kind else { continue }
      guard let group = entry.group, let selection = group.selection else {
        problems.append("the radio item \"\(entry.info.title)\" is not in a section with a selection, so it is never checked")
        continue
      }
      if let value {
        if bySection[group.id, default: []].contains(value) {
          problems.append("two radio items of one section share the value \"\(value.base)\"; both are checked while it is chosen")
        }
        bySection[group.id, default: []].append(value)
      }
      if let chosen = selection.value { selections[group.id] = chosen }
    }
    for (section, chosen) in selections where !(bySection[section] ?? []).contains(chosen) {
      problems.append("a section's selection \"\(chosen.base)\" names none of its radio items")
    }
    return problems
  }
}

// MARK: - The surface

/// MNU-3: the surface — its color, corners eased by the corner smoothing, elevation and padding, as wide as its widest
/// item between the width bounds — holding the blocks of rows with dividers between them and the groups' titles; and the
/// keyboard (MNU-7), the pointer's focus (MNU-8) and the open motion (MNU-4).
struct TanreiMenuSurface: View {
  let model: TanreiMenuContent
  let close: @MainActor (TanreiMenuCloseReason) -> Void
  let placement: TanreiMenuPlacement
  let isInPlace: Bool
  let focusInside: TanreiMenuFocusFlag?

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @FocusState private var focused: Int?
  /// MNU-8: the item the pointer entered last — where the arrow keys continue from — while the pointer leads; then no item
  /// shows the focused state or the ring. SwiftUI's own focus is not moved by the pointer: moving it, or redrawing the rows,
  /// as a press began left the button pressed (the hosted press test caught it).
  @State private var pointer = TanreiMenuPointer()
  @State private var keys = TanreiRovingKeys(wraps: true)
  @State private var hasOpened = false

  var body: some View {
    let tokens = theme.system.menu
    let problems = model.problems
    if !problems.isEmpty {
      let _ = problems.forEach { TanreiDiagnostics.report("Tanrei: a menu's \($0) (MNU-29)") }
    }
    let shape = TanreiCornerShape(cornerRadius: tokens.surfaceShape, style: theme.system.shape.roundedCornerStyle)
    let column = VStack(alignment: .leading, spacing: .zero) {
      ForEach(Array(model.blocks.enumerated()), id: \.offset) { index, block in
        if model.dividerBefore(index) {
          // MNU-23: across the surface's inner width, `divider.space` above and below; a separator that takes no focus
          // (hidden: SwiftUI has no separator role).
          Rectangle()
            .fill(colors[tokens.dividerColor])
            .frame(height: tokens.dividerThickness)
            .padding(.vertical, tokens.dividerSpace)
            .accessibilityHidden(true)
        }
        blockView(block, tokens: tokens)
      }
    }
    .padding(.vertical, tokens.surfacePaddingBlock)
    .padding(.horizontal, tokens.surfacePaddingInline)
    .modifier(TanreiMenuWidth(minimum: tokens.surfaceMinWidth, maximum: tokens.surfaceMaxWidth))

    let open = TanreiMotion.animation(durationMs: tokens.motionOpenDuration, easing: tokens.motionOpenEasing, reduceMotion: reduceMotion)
    return Group {
      if isInPlace {
        column
      } else {
        // MNU-2: taller than the room left, the items scroll.
        ViewThatFits(in: .vertical) {
          column
          ScrollView(.vertical) { column }
        }
      }
    }
    .clipShape(shape)
    .background { TanreiElevationSurface(tokens.surfaceElevation, fill: colors[tokens.surfaceColor], cornerRadius: tokens.surfaceShape) }
    // MNU-4: in, it fades and grows from the edge that faces the anchor (at once under Reduce Motion).
    .opacity(isInPlace || hasOpened ? 1 : .zero)
    .scaleEffect(x: 1, y: isInPlace || hasOpened ? 1 : .zero, anchor: placement.isBelow ? .top : .bottom)
    .onAppear {
      guard !isInPlace else { return }
      withAnimation(open) { hasOpened = true }
      // MNU-1: focus moves to the first enabled item.
      if let first = TanreiMenuRules.initialFocus(model.entries) {
        Task { @MainActor in focused = first }
      }
    }
    .onChange(of: focused) { _, now in focusInside?.value = now != nil }
    // MNU-24: a container of the items (SwiftUI has no menu role).
    .accessibilityElement(children: .contain)
  }

  @ViewBuilder
  private func blockView(_ block: TanreiMenuContent.Block, tokens: TanreiMenuTokens) -> some View {
    let rows = VStack(alignment: .leading, spacing: .zero) {
      if block.section != nil && !block.title.isEmpty {
        // MNU-28: the title where the labels start, `container.padding-inline` from the end, padded above and below; it
        // takes no focus and names the group instead of being read.
        Text(verbatim: block.title)
          .fixedSize(horizontal: false, vertical: true)
          .tanreiTextStyle(tokens.groupTitleTypescale)
          .foregroundStyle(colors[tokens.groupTitleColor])
          .padding(.vertical, tokens.containerPaddingBlock)
          .padding(.leading, tokens.containerPaddingInline + TanreiMenuRowLayout.columnsWidth(tokens: tokens, hasMark: model.hasMark, hasIcon: model.hasIcon))
          .padding(.trailing, tokens.containerPaddingInline)
          .frame(maxWidth: .infinity, alignment: .leading)
          .accessibilityElement(children: .ignore)
          .accessibilityHidden(true)
      }
      ForEach(block.rows, id: \.self) { index in
        row(index)
      }
    }
    if block.section != nil {
      // MNU-24: a group, named by its title where it has one.
      rows
        .accessibilityElement(children: .contain)
        .modifier(TanreiMenuGroupName(title: block.title))
    } else {
      rows
    }
  }

  private func row(_ index: Int) -> some View {
    TanreiMenuRow(
      entry: model.entries[index], index: index, count: model.entries.count, hasMark: model.hasMark, hasIcon: model.hasIcon,
      isKeyboardFocused: TanreiMenuRules.isKeyboardFocused(index, focused: focused, byPointer: pointer.item != nil),
      focus: $focused,
      activate: { activation in
        if model.entries[index].activate(by: activation) { close(.item) }
      },
      key: { key in handle(key, from: index) },
      type: { characters in type(characters, from: index) },
      pointerEntered: {
        // MNU-8: the arrow keys continue from the item the pointer entered, and no ring shows.
        pointer.item = index
      })
  }

  /// MNU-5, MNU-7: the menu's own keys on item `index`; whether one was.
  private func handle(_ key: KeyEquivalent, from index: Int) -> Bool {
    if let reason = TanreiMenuRules.closeReason(for: key) {
      close(reason)
      return true
    }
    guard let target = keys.target(for: key, from: pointer.item ?? index, in: roving) else { return false }
    pointer.item = nil
    focused = target
    return true
  }

  /// MNU-7: typeahead on item `index`; whether the characters were the menu's.
  private func type(_ characters: String, from index: Int) -> Bool {
    guard let target = keys.target(typing: characters, at: Date.timeIntervalSinceReferenceDate, from: pointer.item ?? index, in: roving) else { return false }
    if let target {
      pointer.item = nil
      focused = target
    }
    return true
  }

  /// MNU-7 on SwiftUI: the items the keys move through. SwiftUI never gives keyboard focus to a disabled button, so a
  /// disabled item cannot be reached.
  private var roving: [TanreiRovingItem] {
    TanreiMenuRules.roving(model.entries)
  }
}

/// MNU-3: as wide as the widest item (its ideal width), kept between `minimum` and `maximum` whatever the menu is offered;
/// the items then wrap to that width and the height follows.
private struct TanreiMenuWidth: ViewModifier {
  let minimum: CGFloat
  let maximum: CGFloat

  func body(content: Content) -> some View {
    TanreiMenuWidthLayout(minimum: minimum, maximum: maximum) { content }
  }
}

struct TanreiMenuWidthLayout: Layout {
  let minimum: CGFloat
  let maximum: CGFloat

  func width(of subviews: Subviews) -> CGFloat {
    let ideal = subviews.map { $0.sizeThatFits(.unspecified).width }.max() ?? .zero
    return min(max(ideal, minimum), max(minimum, maximum))
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let width = width(of: subviews)
    let height = subviews.map { $0.sizeThatFits(ProposedViewSize(width: width, height: nil)).height }.max() ?? .zero
    return CGSize(width: width, height: height)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    for subview in subviews {
      subview.place(at: bounds.origin, anchor: .topLeading, proposal: ProposedViewSize(width: bounds.width, height: bounds.height))
    }
  }
}

/// The rules of a menu, pure.
enum TanreiMenuRules {
  static func roving(_ entries: [TanreiMenuEntry]) -> [TanreiRovingItem] {
    entries.map { TanreiRovingItem(focusable: $0.isEnabled, label: $0.info.title) }
  }

  /// MNU-1: the item focus moves to when the menu opens: the first enabled one (else none:
  /// SwiftUI cannot focus a disabled button).
  static func initialFocus(_ entries: [TanreiMenuEntry]) -> Int? {
    entries.indices.first { entries[$0].isEnabled }
  }

  /// MNU-5: the keys that close the menu from an item, and the reason each is.
  static func closeReason(for key: KeyEquivalent) -> TanreiMenuCloseReason? {
    switch key {
    case .escape: return .escape
    case .tab: return .tab
    default: return nil
    }
  }

  /// MNU-8, MNU-11: item `index` shows the focused state and the ring only for keyboard focus, never while the pointer
  /// leads.
  static func isKeyboardFocused(_ index: Int, focused: Int?, byPointer: Bool) -> Bool {
    focused == index && !byPointer
  }

  /// MNU-24: an item's position in the menu and the menu's size (in English).
  static func positionText(index: Int, count: Int) -> String {
    "\(index + 1) of \(count)"
  }
}

private struct TanreiMenuGroupName: ViewModifier {
  let title: String

  func body(content: Content) -> some View {
    if title.isEmpty { content } else { content.accessibilityLabel(Text(verbatim: title)) }
  }
}

// MARK: - The row

/// One item's row: a button drawn by `TanreiMenuItemStyle`, focusable, with the menu's keys.
private struct TanreiMenuRow: View {
  let entry: TanreiMenuEntry
  let index: Int
  let count: Int
  let hasMark: Bool
  let hasIcon: Bool
  let isKeyboardFocused: Bool
  let focus: FocusState<Int?>.Binding
  let activate: @MainActor (TanreiMenuActivation) -> Void
  let key: @MainActor (KeyEquivalent) -> Bool
  let type: @MainActor (String) -> Bool
  let pointerEntered: @MainActor () -> Void

  /// Counts activations by key: each one starts a press that no pointer held down (MNU-15).
  @State private var keyboardPresses = 0

  var body: some View {
    Button(action: { activate(.pointer) }) { Text(verbatim: entry.info.title) }
      .buttonStyle(
        TanreiMenuItemStyle(
          entry: entry, hasMark: hasMark, hasIcon: hasIcon, isFocused: isKeyboardFocused, keyboardPresses: keyboardPresses, pointerEntered: pointerEntered))
      .disabled(!entry.isEnabled)
      .focused(focus, equals: index)
      // Tanrei draws its own ring (MNU-11); the system focus effect would double it.
      .focusEffectDisabled()
      // MNU-6, MNU-15: Enter and Space activate, once per key press, and show the press from the center; Space leaves the
      // menu open after a checkbox or radio item.
      .onKeyPress(keys: TanreiActivationKeys.button, phases: .down) { press in
        guard entry.isEnabled else { return .ignored }
        keyboardPresses += 1
        activate(press.key == .space ? .space : .enter)
        return .handled
      }
      // MNU-7: typeahead — nearer the button than the activation, so a Space that continues a search is typed.
      .onKeyPress(phases: .down) { press in
        guard press.modifiers.isDisjoint(with: [.command, .control, .option]) else { return .ignored }
        return type(press.characters) ? .handled : .ignored
      }
      // MNU-5, MNU-7: the arrows (wrapping), Home and End, Escape and Tab.
      .onKeyPress(keys: TanreiRovingKeys.movementKeys.union([.escape, .tab]), phases: .down) { press in
        key(press.key) ? .handled : .ignored
      }
      #if os(macOS)
      .onExitCommand { _ = key(.escape) }
      #endif
      // MNU-24: named by its label, described by its supporting and trailing text, with its position; a checkbox item is
      // a toggle, on or off; a radio item is selected while checked.
      .accessibilityLabel(Text(verbatim: entry.info.title))
      .modifier(TanreiMenuDescription(description: entry.info.accessibilityDescription))
      .modifier(TanreiOptionalAccessibilityValue(value: entry.accessibilityPosition(index: index, count: count)))
      .accessibilityAddTraits(entry.traits)
  }
}

private struct TanreiMenuDescription: ViewModifier {
  let description: String

  func body(content: Content) -> some View {
    if description.isEmpty { content } else { content.accessibilityHint(Text(verbatim: description)) }
  }
}

// MARK: - Token bindings

extension TanreiMenuTokens {
  /// How the MNU-16 ripple grows: over `comp.menu.motion.feedback-duration`, with the state easing. `nil` under Reduce
  /// Motion — the layer appears whole.
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// MNU-22, MNU-27: a change of state or of condition — colors and the check — over the state motion; `nil` under Reduce
  /// Motion.
  func stateMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionStateDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// MNU-4: the open motion; `nil` under Reduce Motion.
  func openMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionOpenDuration, easing: motionOpenEasing, reduceMotion: reduceMotion)
  }
}

/// Which token values an item draws for one condition × state. Pure data read from a `TanreiMenuTokens`, so the bindings
/// can be tested without rendering. MNU-10 / MNU-13: every state, disabled included, is drawn from that condition's tokens
/// in that state.
struct TanreiMenuItemAppearance: Equatable {
  let container: TanreiPaint
  /// MNU-16 `ripple`: the pressed container paint, grown from the point of contact over `container`.
  let ripple: TanreiPaint?
  let label: TanreiPaint
  let supportingText: TanreiPaint
  let trailingText: TanreiPaint
  let leadingIcon: TanreiPaint
  let trailingIcon: TanreiPaint
  let mark: TanreiPaint
  let opacity: Double
  let cornerRadius: CGFloat

  init(
    tokens: TanreiMenuTokens, condition: TanreiMenuCondition, state: TanreiInteraction, feedback: TanreiPressedFeedback = .overlay,
    beneath: TanreiInteraction = .enabled
  ) {
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    // The condition lookup is total: a condition this system does not have reads `unselected` (and is reported).
    let conditionTokens = tokens.conditions[condition]
    let own = conditionTokens[state: layers.state]
    container = conditionTokens[state: layers.container].containerColor
    ripple = layers.ripple.map { conditionTokens[state: $0].containerColor }
    label = own.labelColor
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

// MARK: - Layout

/// MNU-19, MNU-20: one row — `container.padding-inline` from each edge, the mark column (while the menu has one), the
/// leading icon column (while any item has an icon), the label with the supporting text below it taking the remaining
/// width, then the trailing text and the trailing icon, each `container.gap` from the next. An empty column keeps its
/// width. Every column is centered on the label's FIRST line — the taller of the label's line and the glyph boxes — so a
/// wrapping label keeps its check and icon beside its first line; the content is centered in a row at least
/// `container.height` (and the minimum target) tall, padded by `container.padding-block`, growing with it. Stateless, so
/// it is right on the first layout pass; SwiftUI mirrors it right to left.
struct TanreiMenuRowLayout: Layout {
  let paddingInline: CGFloat
  let paddingBlock: CGFloat
  let gap: CGFloat
  let minimumHeight: CGFloat
  /// The label's line, as Dynamic Type scales it.
  let labelLine: CGFloat
  /// The height of the first line's box: the label's line and every glyph box.
  let firstLine: CGFloat

  enum Part: Sendable {
    case mark
    case leading
    case label
    case supporting
    case trailing
  }

  struct PartKey: LayoutValueKey {
    static let defaultValue = Part.trailing
  }

  /// MNU-28: how far the labels start after the start padding — the mark and icon columns and their gaps.
  static func columnsWidth(tokens: TanreiMenuTokens, hasMark: Bool, hasIcon: Bool) -> CGFloat {
    (hasMark ? tokens.markSize + tokens.containerGap : .zero) + (hasIcon ? tokens.leadingIconSize + tokens.containerGap : .zero)
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

  func arrange(width proposed: CGFloat?, subviews: Subviews) -> (size: CGSize, frames: [CGRect]) {
    let parts = subviews.map { $0[PartKey.self] }
    let isText: (Part) -> Bool = { $0 == .label || $0 == .supporting }
    var sizes = subviews.map { subview in isText(subview[PartKey.self]) ? CGSize.zero : subview.sizeThatFits(.unspecified) }
    let columnsWidth = zip(parts, sizes).filter { !isText($0.0) }.reduce(CGFloat.zero) { $0 + $1.1.width + gap }
    let textWidth: CGFloat
    if let proposed, proposed.isFinite {
      textWidth = max(.zero, proposed - 2 * paddingInline - columnsWidth)
    } else {
      textWidth = subviews.indices.filter { isText(parts[$0]) }.map { subviews[$0].sizeThatFits(.unspecified).width }.max() ?? .zero
    }
    var textHeight: CGFloat = .zero
    for index in subviews.indices where isText(parts[index]) {
      let size = subviews[index].sizeThatFits(ProposedViewSize(width: textWidth, height: nil))
      sizes[index] = CGSize(width: textWidth, height: size.height)
      textHeight += size.height
    }
    // The text starts where the label's first line is centered on the first line's box.
    let textTop = (firstLine - labelLine) / 2
    let columnBottoms = zip(parts, sizes).filter { !isText($0.0) }.map { (firstLine - $0.1.height) / 2 + $0.1.height }
    let contentHeight = max(firstLine, textTop + textHeight, columnBottoms.max() ?? .zero)
    let height = max(minimumHeight, contentHeight + 2 * paddingBlock)
    let top = (height - contentHeight) / 2
    let width = proposed.flatMap { $0.isFinite ? $0 : nil } ?? (2 * paddingInline + columnsWidth + textWidth)

    var frames = Array(repeating: CGRect.zero, count: subviews.count)
    var x = paddingInline
    for index in subviews.indices where parts[index] == .mark || parts[index] == .leading {
      frames[index] = CGRect(origin: CGPoint(x: x, y: top + (firstLine - sizes[index].height) / 2), size: sizes[index])
      x += sizes[index].width + gap
    }
    var y = top + textTop
    for index in subviews.indices where isText(parts[index]) {
      frames[index] = CGRect(x: x, y: y, width: textWidth, height: sizes[index].height)
      y += sizes[index].height
    }
    x += textWidth + gap
    for index in subviews.indices where parts[index] == .trailing {
      frames[index] = CGRect(origin: CGPoint(x: x, y: top + (firstLine - sizes[index].height) / 2), size: sizes[index])
      x += sizes[index].width + gap
    }
    return (CGSize(width: width, height: height), frames)
  }
}

// MARK: - Style

struct TanreiMenuItemStyle: ButtonStyle {
  let entry: TanreiMenuEntry
  let hasMark: Bool
  let hasIcon: Bool
  let isFocused: Bool
  var keyboardPresses = 0
  /// MNU-8: the pointer entered the item.
  var pointerEntered: @MainActor () -> Void = {}

  func makeBody(configuration: Configuration) -> some View {
    TanreiMenuItemChrome(
      info: entry.info, condition: entry.condition, isCheckable: entry.isCheckable, hasMark: hasMark, hasIcon: hasIcon, isPressed: configuration.isPressed,
      isFocused: isFocused, keyboardPresses: keyboardPresses, pointerEntered: pointerEntered)
  }
}

/// The visual of one item: the row with its columns, the container with its state layer and the focus ring inside it,
/// drawn from the tokens of the one resolved state of the condition.
struct TanreiMenuItemChrome: View {
  let info: TanreiMenuItemInfo
  let condition: TanreiMenuCondition
  /// A checkbox or radio item: it draws its check in the mark column while selected.
  let isCheckable: Bool
  let hasMark: Bool
  let hasIcon: Bool
  let isPressed: Bool
  /// Keyboard focus (focus the pointer moved is not, MNU-8).
  let isFocused: Bool
  var keyboardPresses = 0
  /// MNU-8: told when the pointer enters the item.
  var pointerEntered: @MainActor () -> Void = {}

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiTheme) private var theme
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    let feedback = theme.system.behavior.pressedFeedback
    // MNU-15: a press stays visible at least `duration.press-hold`; MNU-16: the point of contact only under `ripple`.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyboardPresses, watchesContact: feedback == .ripple) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let system = theme.system
    let tokens = system.menu
    // MNU-10: exactly one state — pressed > focused > hovered; MNU-13: disabled is a state too.
    let state = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let appearance = TanreiMenuItemAppearance(tokens: tokens, condition: condition, state: state, feedback: feedback, beneath: beneath)
    let ripple = appearance.ripple.map {
      TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion))
    }
    let labelLine = tokens.labelTypescale.resolved(policy: theme.fontFamilyPolicy, dynamicTypeSize: dynamicTypeSize).lineHeight
    let layout = TanreiMenuRowLayout(
      paddingInline: tokens.containerPaddingInline, paddingBlock: tokens.containerPaddingBlock, gap: tokens.containerGap,
      minimumHeight: max(tokens.containerHeight, TanreiHitTarget.minimum(in: system.measure)), labelLine: labelLine,
      firstLine: max(labelLine, tokens.markSize, tokens.leadingIconSize, tokens.trailingIconSize))
    let isSelected = condition == .selected

    return layout {
      if hasMark {
        // MNU-22: the check in the mark column, drawn along its path while checked; the column is reserved in every item.
        TanreiItemCheck(isChecked: isCheckable && isSelected, color: colors[appearance.mark], size: tokens.markSize, width: tokens.markWidth)
          .layoutValue(key: TanreiMenuRowLayout.PartKey.self, value: .mark)
      }
      if hasIcon {
        // MNU-21: the family and fill of the item's condition; an empty column keeps its width (MNU-19).
        Group {
          if let icon = info.leadingIcon.drawn {
            TanreiItemIconView(icon: icon, size: tokens.leadingIconSize, selected: isSelected)
          } else {
            Color.clear
          }
        }
        .frame(width: tokens.leadingIconSize, height: tokens.leadingIconSize)
        .foregroundStyle(colors[appearance.leadingIcon])
        .layoutValue(key: TanreiMenuRowLayout.PartKey.self, value: .leading)
      }
      text(info.title, style: tokens.labelTypescale, color: appearance.label)
        .layoutValue(key: TanreiMenuRowLayout.PartKey.self, value: .label)
      if !info.supportingText.isEmpty {
        text(info.supportingText, style: tokens.supportingTextTypescale, color: appearance.supportingText)
          .layoutValue(key: TanreiMenuRowLayout.PartKey.self, value: .supporting)
      }
      if !info.trailingText.isEmpty {
        Text(verbatim: info.trailingText)
          .fixedSize()
          .tanreiTextStyle(tokens.trailingTextTypescale)
          .foregroundStyle(colors[appearance.trailingText])
          .layoutValue(key: TanreiMenuRowLayout.PartKey.self, value: .trailing)
      }
      if let icon = info.trailingIcon.drawn {
        TanreiItemIconView(icon: icon, size: tokens.trailingIconSize, selected: isSelected)
          .foregroundStyle(colors[appearance.trailingIcon])
          .layoutValue(key: TanreiMenuRowLayout.PartKey.self, value: .trailing)
      }
    }
    // MNU-13, MNU-16, MNU-17: the row's fill and state layer, its corners eased by the corner smoothing, the ripple and the
    // state's opacity; MNU-22, MNU-27: colors and the check change over the state motion (at once under Reduce Motion);
    // MNU-11: the ring inside the row, which the surface would otherwise clip — keyboard focus only, never animated;
    // MNU-12: the whole row is the item's hit area.
    .modifier(
      TanreiItemRowContainer(
        fill: colors[appearance.container], ripple: ripple, cornerRadius: appearance.cornerRadius, opacity: appearance.opacity,
        motion: tokens.stateMotion(reduceMotion: reduceMotion), state: state, condition: condition, showsFocusRing: isFocused && isEnabled))
    .onHover { hovering in
      isHovered = hovering
      if hovering { pointerEntered() }
    }
  }

  /// MNU-20: a text of the row in its role and color; it wraps rather than truncates.
  private func text(_ string: String, style: TanreiTextStyle, color: TanreiPaint) -> some View {
    Text(verbatim: string)
      .multilineTextAlignment(.leading)
      .fixedSize(horizontal: false, vertical: true)
      .tanreiTextStyle(style)
      .foregroundStyle(colors[color])
      .frame(maxWidth: .infinity, alignment: .leading)
  }
}
