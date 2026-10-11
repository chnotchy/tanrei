import SwiftUI

// Spec: specs/navigation-drawer.spec.json — tokens: TanreiNavigationDrawerTokens (comp.navigation-drawer), read from the
// design system in the environment (`system.navigationDrawer`). Every design value in this file comes from a token; there
// are no literals, and no state's look is computed here. The only numbers that are not tokens are NVD-20's drag thresholds,
// which the spec itself fixes for a platform that names none (SwiftUI names neither a touch slop nor a fling velocity).
//
// A destination is a list-like row, pressed like Button: press, hold, ripple, the row's container layers and
// the state motion are the shared primitives (`TanreiPressTracking`, `TanreiItemRowContainer`), and NVD-8, NVD-9 and NVD-10
// are BTN-8, BTN-9 and BTN-10 for it. Selection, activation and the debug reports are the navigation bar's and rail's rules
// (`TanreiDestinationRules`), with the drawer's ids.
//
// Two forms: a standard drawer is a layout region at the leading edge, taking its width while it is presented;
// a modal drawer is a modal overlay. SwiftUI has no side presentation: `.tanreiNavigationDrawer(…)` presents
// the modal drawer as the dialog is presented — `.fullScreenCover` on a clear background on iOS (the rest of the app inert
// to touch, VoiceOver and the keyboard), over the view it is attached to on macOS (that view inert) — and Tanrei draws the
// scrim and the slide. The drawer counts itself in `TanreiModalCoordinator` while it is presented, as a dialog does.

// MARK: - The drawer

/// Lists a product's destinations in a panel at the leading edge, grouped under headings: beside the content on a large
/// screen (`.standard`), over it on a compact one (`.modal`).
///
///     @State private var folder = "inbox"
///     @State private var showsDrawer = true
///     HStack(spacing: 0) {
///       TanreiNavigationDrawer(isPresented: $showsDrawer, selection: $folder, accessibilityLabel: "Mail") {
///         TanreiNavigationDrawerSection("Mail") {
///           TanreiNavigationDrawerItem("Inbox", icon: "inbox", value: "inbox", badge: "24")
///           TanreiNavigationDrawerItem("Sent", icon: "send", value: "sent")
///         }
///         TanreiNavigationDrawerSection("Labels", divider: true) {
///           TanreiNavigationDrawerItem("Family", icon: "label", value: "family")
///         }
///       } header: {
///         Text("Mail")
///       }
///       MailboxView(folder: folder)
///     }
///
///     // Compact: a modal drawer over the content, opened from a menu button; it closes itself (writes `false`).
///     MailboxView(folder: folder)
///       .tanreiNavigationDrawer(isPresented: $showsDrawer, selection: $folder, accessibilityLabel: "Mail") { … }
///
/// - `variant` is a `TanreiNavigationDrawerVariant`: `.standard` (default), `.modal`, or a value a design system adds (drawn
///   from its tokens and laid out as a standard drawer). A value the design system does not have is drawn as `.standard`
///   and reported in debug builds (NVD-26).
/// - `isPresented` is the spec's `open`. A standard drawer takes its width while it is `true` and none — and no focus or
///   presence to assistive technology — while it is `false`, sliding as it changes (NVD-18). A modal drawer is presented
///   while it is `true`; it closes itself by writing `false` (the spec's `close`): on the scrim, Escape, the accessibility
///   escape gesture, a drag toward its leading edge, and after a destination was activated (NVD-20, NVD-21). A standard
///   drawer never writes it.
/// - `selection` holds the selected destination's value (the spec's `value`), in a section or not. Activating another
///   destination writes its value (the spec's `change`); activating the selected one calls `onReselect` with its value and
///   writes nothing (NVD-1). A value that names no destination, or an empty one (`""`, or `nil` with a `Binding<V?>`),
///   selects none (NVD-3).
/// - `accessibilityLabel` names the drawer (the spec's `label`): its container, and a modal drawer as a whole (NVD-23).
/// - `content` holds `TanreiNavigationDrawerItem`s and `TanreiNavigationDrawerSection`s, in reading order (`ForEach` works).
/// - `header` holds the spec's `header` slot, above the destinations; the drawer does not restyle it and scrolls it with
///   them (NVD-12).
///
/// Written as a view with the `.modal` variant, the drawer draws its scrim over the space it is given and its panel at that
/// space's leading edge, with the modal trait, and makes nothing outside that space inert: present a modal drawer with
/// `.tanreiNavigationDrawer(…)`.
public struct TanreiNavigationDrawer<SelectionValue: Hashable, Content: View, Header: View>: View {
  private let variant: TanreiNavigationDrawerVariant
  private let isPresented: Binding<Bool>
  private let selection: TanreiTabsSelection
  private let accessibilityLabel: LocalizedStringKey
  private let onReselect: (@MainActor (AnyHashable) -> Void)?
  private let content: Content
  private let header: Header
  /// Fixtures and galleries only: a modal drawer drawn open, in place, without the modal trait (`inPlace()`).
  var isInPlace = false

  /// A drawer whose selected destination's value `selection` holds, under a header.
  public init(
    variant: TanreiNavigationDrawerVariant = .standard, isPresented: Binding<Bool>, selection: Binding<SelectionValue>,
    accessibilityLabel: LocalizedStringKey = "", onReselect: (@MainActor (SelectionValue) -> Void)? = nil, @ViewBuilder content: () -> Content,
    @ViewBuilder header: () -> Header
  ) {
    self.init(
      variant: variant, isPresented: isPresented, selection: TanreiTabsSelection(selection), accessibilityLabel: accessibilityLabel,
      onReselect: Self.erase(onReselect), content: content(), header: header())
  }

  /// A drawer whose selected destination's value `selection` holds, under a header; `nil` selects none.
  public init(
    variant: TanreiNavigationDrawerVariant = .standard, isPresented: Binding<Bool>, selection: Binding<SelectionValue?>,
    accessibilityLabel: LocalizedStringKey = "", onReselect: (@MainActor (SelectionValue) -> Void)? = nil, @ViewBuilder content: () -> Content,
    @ViewBuilder header: () -> Header
  ) {
    self.init(
      variant: variant, isPresented: isPresented, selection: TanreiTabsSelection(selection), accessibilityLabel: accessibilityLabel,
      onReselect: Self.erase(onReselect), content: content(), header: header())
  }

  init(
    variant: TanreiNavigationDrawerVariant, isPresented: Binding<Bool>, selection: TanreiTabsSelection, accessibilityLabel: LocalizedStringKey,
    onReselect: (@MainActor (AnyHashable) -> Void)?, content: Content, header: Header
  ) {
    self.variant = variant
    self.isPresented = isPresented
    self.selection = selection
    self.accessibilityLabel = accessibilityLabel
    self.onReselect = onReselect
    self.content = content
    self.header = header
  }

  /// `onReselect` typed away: a value of another type than the drawer's calls nothing.
  static func erase(_ onReselect: (@MainActor (SelectionValue) -> Void)?) -> (@MainActor (AnyHashable) -> Void)? {
    guard let onReselect else { return nil }
    return { value in if let typed = value.base as? SelectionValue { onReselect(typed) } }
  }

  /// Fixtures and galleries only: a modal drawer drawn open and at rest in the space it is given — its scrim over all of
  /// it —, without the modal trait, so the page around it stays live. A standard drawer is unchanged.
  @_spi(Fixtures)
  public func inPlace() -> Self {
    var drawer = self
    drawer.isInPlace = true
    return drawer
  }

  public var body: some View {
    let variant = variant
    let isPresented = isPresented
    let selection = selection
    let accessibilityLabel = accessibilityLabel
    let onReselect = onReselect
    let isInPlace = isInPlace
    let header = header
    _VariadicView.Tree(
      TanreiNavigationDrawerItemsRoot { parts in
        // The header's content, read as views: an empty header (none given, or a builder that produced nothing) takes no
        // room (NVD-12).
        _VariadicView.Tree(
          TanreiNavigationDrawerHeaderRoot { children in
            TanreiNavigationDrawerView(
              model: TanreiNavigationDrawerModel(parts: parts), header: children, variant: variant, isPresented: isPresented, selection: selection,
              accessibilityLabel: accessibilityLabel, onReselect: onReselect, isInPlace: isInPlace)
          }
        ) {
          header
        }
      }
    ) {
      content
    }
  }
}

extension TanreiNavigationDrawer where Header == EmptyView {
  /// A drawer without a header, whose selected destination's value `selection` holds.
  public init(
    variant: TanreiNavigationDrawerVariant = .standard, isPresented: Binding<Bool>, selection: Binding<SelectionValue>,
    accessibilityLabel: LocalizedStringKey = "", onReselect: (@MainActor (SelectionValue) -> Void)? = nil, @ViewBuilder content: () -> Content
  ) {
    self.init(
      variant: variant, isPresented: isPresented, selection: selection, accessibilityLabel: accessibilityLabel, onReselect: onReselect,
      content: content
    ) {
      EmptyView()
    }
  }

  /// A drawer without a header, whose selected destination's value `selection` holds; `nil` selects none.
  public init(
    variant: TanreiNavigationDrawerVariant = .standard, isPresented: Binding<Bool>, selection: Binding<SelectionValue?>,
    accessibilityLabel: LocalizedStringKey = "", onReselect: (@MainActor (SelectionValue) -> Void)? = nil, @ViewBuilder content: () -> Content
  ) {
    self.init(
      variant: variant, isPresented: isPresented, selection: selection, accessibilityLabel: accessibilityLabel, onReselect: onReselect,
      content: content
    ) {
      EmptyView()
    }
  }
}

extension View {
  /// Presents a Tanrei navigation drawer with this view: a modal drawer over it (the default), or a standard one beside it,
  /// at its leading edge.
  ///
  ///     MailboxView(folder: folder)
  ///       .tanreiNavigationDrawer(isPresented: $showsDrawer, selection: $folder, accessibilityLabel: "Mail") {
  ///         TanreiNavigationDrawerItem("Inbox", icon: "inbox", value: "inbox")
  ///         TanreiNavigationDrawerItem("Sent", icon: "send", value: "sent")
  ///       }
  ///
  /// A modal drawer is presented while `isPresented` is `true`, above this view — on iOS above the whole app, as a full-screen
  /// cover whose background is clear; on macOS over this view, which is inert meanwhile (attach it to the window's root) —
  /// with the modal trait, and closes itself by writing `false` (NVD-19 … NVD-22). With any other variant the drawer is laid
  /// out beside this view as `TanreiNavigationDrawer` is, the view taking the rest of the width and resizing as the drawer
  /// slides (NVD-18). The arguments are `TanreiNavigationDrawer`'s.
  public func tanreiNavigationDrawer<V: Hashable, Items: View, Header: View>(
    variant: TanreiNavigationDrawerVariant = .modal, isPresented: Binding<Bool>, selection: Binding<V>, accessibilityLabel: LocalizedStringKey = "",
    onReselect: (@MainActor (V) -> Void)? = nil, @ViewBuilder content: @escaping () -> Items, @ViewBuilder header: @escaping () -> Header
  ) -> some View {
    let erased = TanreiNavigationDrawer<V, Items, Header>.erase(onReselect)
    let selection = TanreiTabsSelection(selection)
    return modifier(
      TanreiNavigationDrawerPresenter(variant: variant, isPresented: isPresented) {
        TanreiNavigationDrawer<V, Items, Header>(
          variant: variant, isPresented: isPresented, selection: selection, accessibilityLabel: accessibilityLabel, onReselect: erased,
          content: content(), header: header())
      })
  }

  /// A drawer with this view, whose selected destination's value `selection` holds; `nil` selects none.
  public func tanreiNavigationDrawer<V: Hashable, Items: View, Header: View>(
    variant: TanreiNavigationDrawerVariant = .modal, isPresented: Binding<Bool>, selection: Binding<V?>, accessibilityLabel: LocalizedStringKey = "",
    onReselect: (@MainActor (V) -> Void)? = nil, @ViewBuilder content: @escaping () -> Items, @ViewBuilder header: @escaping () -> Header
  ) -> some View {
    let erased = TanreiNavigationDrawer<V, Items, Header>.erase(onReselect)
    let selection = TanreiTabsSelection(selection)
    return modifier(
      TanreiNavigationDrawerPresenter(variant: variant, isPresented: isPresented) {
        TanreiNavigationDrawer<V, Items, Header>(
          variant: variant, isPresented: isPresented, selection: selection, accessibilityLabel: accessibilityLabel, onReselect: erased,
          content: content(), header: header())
      })
  }

  /// A drawer without a header, with this view.
  public func tanreiNavigationDrawer<V: Hashable, Items: View>(
    variant: TanreiNavigationDrawerVariant = .modal, isPresented: Binding<Bool>, selection: Binding<V>, accessibilityLabel: LocalizedStringKey = "",
    onReselect: (@MainActor (V) -> Void)? = nil, @ViewBuilder content: @escaping () -> Items
  ) -> some View {
    tanreiNavigationDrawer(
      variant: variant, isPresented: isPresented, selection: selection, accessibilityLabel: accessibilityLabel, onReselect: onReselect, content: content,
      header: { EmptyView() })
  }

  /// A drawer without a header, with this view; `nil` selects none.
  public func tanreiNavigationDrawer<V: Hashable, Items: View>(
    variant: TanreiNavigationDrawerVariant = .modal, isPresented: Binding<Bool>, selection: Binding<V?>, accessibilityLabel: LocalizedStringKey = "",
    onReselect: (@MainActor (V) -> Void)? = nil, @ViewBuilder content: @escaping () -> Items
  ) -> some View {
    tanreiNavigationDrawer(
      variant: variant, isPresented: isPresented, selection: selection, accessibilityLabel: accessibilityLabel, onReselect: onReselect, content: content,
      header: { EmptyView() })
  }
}

// MARK: - The item kinds

/// One destination of a `TanreiNavigationDrawer` (the spec's item kind `destination`): a row with an optional icon, a label
/// that wraps rather than truncates, and optional badge text at its end.
///
///     TanreiNavigationDrawerItem("Inbox", icon: "inbox", value: "inbox", badge: "24")
///     TanreiNavigationDrawerItem("Deployments", value: Page.deployments)
///     TanreiNavigationDrawerItem("Profile", icon: .image(Image(systemName: "person")), value: "profile")
///     TanreiNavigationDrawerItem("Drafts", icon: "draft", value: "drafts").disabled(true)
///
/// - `title` is its label: drawn in the row and its accessible name. An empty one still renders and is reported in debug
///   builds (NVD-24).
/// - `icon` is the name of a glyph of the design system's icon font, drawn outlined while unselected and filled while
///   selected (NVD-14); or, with the `TanreiItemIcon` overload, an image of the product's own (an SF Symbol, which does not
///   follow the selection). `nil` or an empty name draws none; give every destination of a drawer an icon, or none.
/// - `value` identifies it: the drawer's `selection` selects the destination whose value equals it. Unique within the
///   drawer (the first of two sharing one is the one it selects, and it is reported in debug builds, NVD-29).
/// - `badge` is short text at the row's end, a count or a word ("24", "New"), in the row's own colors; also read after the
///   destination's name and state. Empty draws none (NVD-15).
/// - `disabled` follows `.disabled(_:)` on the item: it keeps its place and its badge, draws its disabled look, cannot be
///   activated and takes no focus (NVD-2, NVD-7).
///
/// An item draws nothing where it is written: the drawer draws it from what it reads.
public struct TanreiNavigationDrawerItem: View {
  private let title: String
  private let icon: TanreiItemIcon?
  private let value: AnyHashable
  private let badge: String

  /// A destination whose icon is a glyph of the icon font, by name; `nil` or an empty name draws none.
  public init<Value: Hashable>(_ title: String, icon: String? = nil, value: Value, badge: String = "") {
    self.init(title, icon: icon.map { TanreiItemIcon($0) }, value: value, badge: badge)
  }

  /// A destination whose icon is a glyph by name or an image of the product's own.
  public init<Value: Hashable>(_ title: String, icon: TanreiItemIcon, value: Value, badge: String = "") {
    self.init(title, icon: Optional(icon), value: value, badge: badge)
  }

  private init<Value: Hashable>(_ title: String, icon: TanreiItemIcon?, value: Value, badge: String) {
    self.title = title
    self.icon = icon
    self.value = AnyHashable(value)
    self.badge = badge
  }

  public var body: some View {
    TanreiNavigationDrawerDestinationTrait(title: title, icon: icon, value: value, badge: badge)
  }
}

/// A group of a `TanreiNavigationDrawer`'s destinations (the spec's item kind `section`), as SwiftUI's `Section`: an optional
/// divider before it, an optional heading, and its destinations.
///
///     TanreiNavigationDrawerSection("Labels", divider: true) {
///       ForEach(labels) { TanreiNavigationDrawerItem($0.name, icon: "label", value: $0.id) }
///     }
///
/// - `heading` names the destinations under it, drawn in the heading style and exposed as a header that takes no focus;
///   empty draws no heading row (NVD-16).
/// - `divider` draws a `TanreiDivider` before the section, across the drawer's inner width (NVD-17).
///
/// It holds destinations only: sections do not nest. A section inside a section draws only its destinations, in its place,
/// and is reported in debug builds (NVD-17). `.disabled(_:)` on a section disables its destinations.
public struct TanreiNavigationDrawerSection<Content: View>: View {
  private let heading: String
  private let divider: Bool
  private let content: Content

  public init(_ heading: String = "", divider: Bool = false, @ViewBuilder content: () -> Content) {
    self.heading = heading
    self.divider = divider
    self.content = content()
  }

  public var body: some View {
    // The drawer reads its content as one flat list: the section's start, its destinations, its end.
    TanreiNavigationDrawerSectionMarker(mark: .start(heading: heading, divider: divider))
    content
    TanreiNavigationDrawerSectionMarker(mark: .end)
  }
}

// MARK: - Reading the items

/// One destination as the drawer reads it (the spec's item kind `destination`).
struct TanreiNavigationDrawerEntry {
  let title: String
  /// The icon to draw; `nil` when there is none (an empty name included).
  let icon: TanreiItemIcon?
  let value: AnyHashable
  let badge: String
  let isEnabled: Bool

  init(title: String, icon: TanreiItemIcon? = nil, value: AnyHashable, badge: String = "", isEnabled: Bool = true) {
    self.title = title
    self.icon = icon.drawn
    self.value = value
    self.badge = badge
    self.isEnabled = isEnabled
  }

  /// The entry as the destination rules read it (selection, activation, reports).
  var rule: TanreiDestinationEntry {
    TanreiDestinationEntry(title: title, icon: icon, value: value, isEnabled: isEnabled)
  }
}

/// Where a section starts and ends in the drawer's flat list of items.
enum TanreiNavigationDrawerSectionMark: Equatable {
  case start(heading: String, divider: Bool)
  case end
}

/// One element of the drawer's content as it reads it: a destination, a section's start or end.
enum TanreiNavigationDrawerPart {
  case destination(TanreiNavigationDrawerEntry)
  case section(TanreiNavigationDrawerSectionMark)
}

struct TanreiNavigationDrawerEntryKey: _ViewTraitKey {
  static var defaultValue: TanreiNavigationDrawerEntry? { nil }
}

struct TanreiNavigationDrawerSectionKey: _ViewTraitKey {
  static var defaultValue: TanreiNavigationDrawerSectionMark? { nil }
}

/// What a destination draws where it is written: nothing, and its entry in a trait the drawer reads. It reads `isEnabled`
/// here, so `.disabled(_:)` on the item — or on its section — reaches the drawer.
struct TanreiNavigationDrawerDestinationTrait: View {
  let title: String
  let icon: TanreiItemIcon?
  let value: AnyHashable
  let badge: String

  @Environment(\.isEnabled) private var isEnabled

  var body: some View {
    Color.clear
      .frame(width: .zero, height: .zero)
      .accessibilityHidden(true)
      ._trait(TanreiNavigationDrawerEntryKey.self, TanreiNavigationDrawerEntry(title: title, icon: icon, value: value, badge: badge, isEnabled: isEnabled))
  }
}

/// A section's start or end, as a trait the drawer reads.
struct TanreiNavigationDrawerSectionMarker: View {
  let mark: TanreiNavigationDrawerSectionMark

  var body: some View {
    Color.clear
      .frame(width: .zero, height: .zero)
      .accessibilityHidden(true)
      ._trait(TanreiNavigationDrawerSectionKey.self, mark)
  }
}

/// Reads the drawer's content — every destination and section mark, in order — and hands them to `body`.
struct TanreiNavigationDrawerItemsRoot<Region: View>: _VariadicView_UnaryViewRoot {
  let region: ([TanreiNavigationDrawerPart]) -> Region

  func body(children: _VariadicView.Children) -> some View {
    region(
      children.compactMap { child in
        if let entry = child[TanreiNavigationDrawerEntryKey.self] { return .destination(entry) }
        if let mark = child[TanreiNavigationDrawerSectionKey.self] { return .section(mark) }
        return nil
      })
  }
}

/// Reads the header's content as views and hands them to `body`.
struct TanreiNavigationDrawerHeaderRoot<Region: View>: _VariadicView_UnaryViewRoot {
  let region: (_VariadicView.Children) -> Region

  func body(children: _VariadicView.Children) -> some View {
    region(children)
  }
}

/// One element the drawer lays out, in reading order (NVD-12): a destination outside any section, or a section.
enum TanreiNavigationDrawerElement: Equatable {
  /// The destination at this index of `entries`.
  case destination(Int)
  /// A section: its heading, its divider and the indices of its destinations in `entries`.
  case section(heading: String, divider: Bool, destinations: [Int])
}

/// The drawer's content, read: every destination in reading order (in sections or not — the selection and the positions
/// count them all, NVD-3, NVD-23), what is laid out, and the nesting reports of NVD-17. Pure.
struct TanreiNavigationDrawerModel {
  let entries: [TanreiNavigationDrawerEntry]
  let elements: [TanreiNavigationDrawerElement]
  let problems: [String]

  init(parts: [TanreiNavigationDrawerPart]) {
    var entries: [TanreiNavigationDrawerEntry] = []
    var elements: [TanreiNavigationDrawerElement] = []
    var problems: [String] = []
    /// The open section: its heading, divider and destinations so far, and how deep inner sections go in it.
    var open: (heading: String, divider: Bool, destinations: [Int])?
    var depth = 0
    for part in parts {
      switch part {
      case .destination(let entry):
        entries.append(entry)
        if open != nil { open?.destinations.append(entries.count - 1) } else { elements.append(.destination(entries.count - 1)) }
      case .section(.start(let heading, let divider)):
        if open == nil {
          open = (heading, divider, [])
        } else {
          // NVD-17: an inner section's destinations are drawn in its place; its heading and divider are not.
          depth += 1
          problems.append("a section holds a section; sections do not nest, so the inner one draws only its destinations, in its place (NVD-17)")
        }
      case .section(.end):
        if depth > 0 {
          depth -= 1
        } else if let section = open {
          elements.append(.section(heading: section.heading, divider: section.divider, destinations: section.destinations))
          open = nil
        }
      }
    }
    if let section = open {
      elements.append(.section(heading: section.heading, divider: section.divider, destinations: section.destinations))
    }
    self.entries = entries
    self.elements = elements
    self.problems = problems
  }
}

// MARK: - The rules

/// The drawer's rules, pure, so they are tested without a render.
enum TanreiNavigationDrawerRules {
  /// NVD-3, NVD-24, NVD-29: what the destination rules report, with the drawer's ids. A drawer holds any number of
  /// destinations, so the count is never reported.
  static let reportIds = TanreiDestinationReportIds(unknownValue: "NVD-3", emptyLabel: "NVD-24", duplicate: "NVD-29", count: "NVD-12", range: 0...Int.max)

  /// Only the `modal` value is presented as a modal overlay; any other — a value a design system adds included — is a
  /// layout region.
  static func isModal(_ variant: TanreiNavigationDrawerVariant) -> Bool {
    variant == .modal
  }

  /// NVD-3, NVD-17, NVD-24, NVD-29: everything a drawer reports in debug builds. A consistent drawer reports nothing.
  static func problems(_ model: TanreiNavigationDrawerModel, selection: AnyHashable?, isModal: Bool, hasLabel: Bool) -> [String] {
    var problems = model.problems
    problems += TanreiDestinationRules.problems(model.entries.map(\.rule), selection: selection, ids: reportIds)
    if isModal && !hasLabel {
      problems.append("its accessibilityLabel is empty, so the modal drawer is a dialog without a name (NVD-24); give it a label")
    }
    return problems
  }

  /// NVD-19, NVD-28: where focus goes when the drawer opens — the selected destination, else the first that is enabled.
  static func initialFocus(_ entries: [TanreiNavigationDrawerEntry], selected: Int?) -> Int? {
    if let selected, entries.indices.contains(selected), entries[selected].isEnabled { return selected }
    return entries.firstIndex(where: \.isEnabled)
  }

  /// NVD-23: a destination's position among all the drawer's destinations, in sections or not (in
  /// English). A drawer is a list of places, not a tab bar: no trait states it.
  static func positionText(index: Int, count: Int) -> String {
    "\(index + 1) of \(count)"
  }

  /// NVD-15, NVD-23: what a destination adds after its name and state: its position, then its badge text.
  static func accessibilityValue(index: Int, count: Int, badge: String) -> String {
    ([positionText(index: index, count: count)] + (badge.isEmpty ? [] : [badge])).joined(separator: ", ")
  }

  /// NVD-20, NVD-21: what closing a modal drawer does — the scrim, Escape, the escape gesture, a drag, a destination's
  /// activation: writes `false` (the spec's `close`) once, while it is presented; nothing otherwise.
  @MainActor
  static func dismiss(_ isPresented: Binding<Bool>) {
    guard isPresented.wrappedValue else { return }
    isPresented.wrappedValue = false
  }

  /// NVD-20: how far past the touch slop a drag toward the start edge must go to close the drawer — half its width.
  static func closesByDistance(_ distance: CGFloat, width: CGFloat) -> Bool {
    distance > width / 2
  }

  /// NVD-20 — the drag thresholds for a platform that names none (SwiftUI names neither): the drawer follows a drag only
  /// beyond 8 points, and a release faster than 0.5 points per millisecond toward the start edge is a fling.
  static let touchSlop: CGFloat = 8
  static let flingVelocity: CGFloat = 0.5
  /// Points per second in a point per millisecond: a unit, not a design value.
  static let millisecondsPerSecond: CGFloat = 1000

  /// NVD-20: whether a release closes the drawer — dragged `distance` toward the start edge past half of `width`, or
  /// released at `velocity` (points per second, toward the start edge) at least the fling velocity.
  static func closes(distance: CGFloat, velocity: CGFloat, width: CGFloat) -> Bool {
    closesByDistance(distance, width: width) || velocity / millisecondsPerSecond >= flingVelocity
  }
}

// MARK: - Token bindings

extension TanreiNavigationDrawerTokens {
  /// NVD-4, NVD-9: a change of state over the state motion; `nil` under Reduce Motion.
  func stateMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionStateDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// NVD-9 `ripple`: grows over the feedback duration with the state easing; `nil` under Reduce Motion (it appears whole).
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// NVD-18, NVD-19: in over `motion.enter-*`; `nil` under Reduce Motion (at once).
  func enterMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionEnterDuration, easing: motionEnterEasing, reduceMotion: reduceMotion)
  }

  /// NVD-18, NVD-22: out over `motion.exit-*`; `nil` under Reduce Motion (at once).
  func exitMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionExitDuration, easing: motionExitEasing, reduceMotion: reduceMotion)
  }
}

/// Which token values a destination draws for one condition × state, under `sys.behavior.pressed-feedback`. Pure data, so
/// the bindings are tested without rendering. NVD-3: the selected parts for the selected destination, the unselected parts
/// for every other; NVD-4, NVD-7: every state, disabled included, from that state's tokens of the destination's condition;
/// NVD-9: under ripple and dim only the item container stays with the state under the press.
struct TanreiNavigationDrawerItemAppearance: Equatable {
  /// The item container: the state layer's box and, while selected, the active indicator.
  let container: TanreiPaint
  /// NVD-9 `ripple`: the pressed item container paint of the condition, grown from the point of contact over `container`.
  let ripple: TanreiPaint?
  let icon: TanreiPaint
  let label: TanreiPaint
  let badge: TanreiPaint
  /// The opacity of the whole destination.
  let opacity: Double

  init(
    tokens: TanreiNavigationDrawerTokens, isSelected: Bool, state: TanreiInteraction, feedback: TanreiPressedFeedback = .overlay,
    beneath: TanreiInteraction = .enabled
  ) {
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    // (A condition's `item.state-layer.color` is not read: it is what the design system mixed into the state's
    // container.)
    let condition = tokens.conditions[isSelected ? TanreiNavigationDrawerCondition.selected : .unselected]
    let parts = condition[state: layers.state]
    container = condition[state: layers.container].itemContainerColor
    ripple = layers.ripple.map { condition[state: $0].itemContainerColor }
    icon = parts.itemIconColor
    label = parts.itemLabelColor
    badge = parts.itemBadgeColor
    // The vocabulary has no rest-state `opacity` token: a destination at rest is not dimmed.
    opacity = tokens[state: layers.state]?.opacity ?? TanreiIdentity.opacity
  }
}

/// The drawer's geometry from its tokens (NVD-6, NVD-12).
struct TanreiNavigationDrawerMetrics: Equatable {
  /// NVD-6, NVD-12: what each laid-out element carries above and below it — half of `container.gap` —, so two of them are
  /// `container.gap` apart and a destination's hit area is its row with half the gap above and below.
  let halfGap: CGFloat
  /// NVD-12: above the first element and below the last: `container.padding-block`, less the half gap it carries.
  let paddingBlock: CGFloat
  /// NVD-6: the least height of a destination's hit area — `sys.target.pointer` on macOS, `sys.target.touch` elsewhere.
  let minimumTarget: CGFloat

  init(tokens: TanreiNavigationDrawerTokens, measure: TanreiMeasure) {
    halfGap = tokens.containerGap / 2
    paddingBlock = max(.zero, tokens.containerPaddingBlock - tokens.containerGap / 2)
    minimumTarget = TanreiHitTarget.minimum(in: measure)
  }
}

// MARK: - The drawer, read

/// The drawer from what it read: the reports, the selection, and the standard or modal form.
struct TanreiNavigationDrawerView: View {
  let model: TanreiNavigationDrawerModel
  let header: _VariadicView.Children
  let variant: TanreiNavigationDrawerVariant
  let isPresented: Binding<Bool>
  let selection: TanreiTabsSelection
  let accessibilityLabel: LocalizedStringKey
  let onReselect: (@MainActor (AnyHashable) -> Void)?
  let isInPlace: Bool

  var body: some View {
    let isModal = TanreiNavigationDrawerRules.isModal(variant)
    let problems = TanreiNavigationDrawerRules.problems(model, selection: selection.value, isModal: isModal, hasLabel: accessibilityLabel != "")
    if !problems.isEmpty {
      let _ = problems.forEach { TanreiDiagnostics.report("Tanrei: a navigation drawer: \($0)") }
    }
    let selected = TanreiDestinationRules.selectedIndex(model.entries.map(\.rule), selection: selection.value)
    let panel = TanreiNavigationDrawerPanelContent(
      model: model, header: header, variant: variant, selected: selected, accessibilityLabel: accessibilityLabel,
      activate: { index in activate(index, selected: selected, isModal: isModal) })
    if isModal {
      TanreiNavigationDrawerModal(isPresented: isPresented, isInPlace: isInPlace, initialFocus: TanreiNavigationDrawerRules.initialFocus(model.entries, selected: selected), panel: panel)
    } else {
      TanreiNavigationDrawerRegion(isPresented: isPresented.wrappedValue, initialFocus: TanreiNavigationDrawerRules.initialFocus(model.entries, selected: selected), panel: panel)
    }
  }

  /// NVD-1, NVD-2: the single route to `change` (the binding) and `reselect` — once per activation, never for a disabled
  /// destination; NVD-21: then a modal drawer closes (writes `false`, the spec's `close`).
  private func activate(_ index: Int, selected: Int?, isModal: Bool) {
    guard let activation = TanreiDestinationRules.activation(model.entries.map(\.rule), activating: index, selected: selected) else { return }
    switch activation {
    case .change(let value): selection.write(value)
    case .reselect(let value): onReselect?(value)
    }
    if isModal { TanreiNavigationDrawerRules.dismiss(isPresented) }
  }
}

/// What the standard and the modal form both draw: the panel's content and surface, handed the focus of the form that
/// holds it.
struct TanreiNavigationDrawerPanelContent {
  let model: TanreiNavigationDrawerModel
  let header: _VariadicView.Children
  let variant: TanreiNavigationDrawerVariant
  let selected: Int?
  let accessibilityLabel: LocalizedStringKey
  let activate: @MainActor (Int) -> Void

  @MainActor
  func view(focus: FocusState<Int?>.Binding) -> TanreiNavigationDrawerPanel {
    TanreiNavigationDrawerPanel(content: self, focus: focus)
  }
}

// MARK: - The standard drawer: a layout region

/// NVD-18, NVD-28: a standard drawer takes its width in the layout while it is presented and none while it is not, sliding
/// in and out over the enter and exit motions while the content beside it resizes (the change is animated where the state
/// changes, so the whole layout moves with it); closed, it is out of the focus order and the accessibility tree at once,
/// and gone once it has slid out. Opening it moves focus to the selected destination (or the first enabled one); closing it
/// with focus inside lets focus go. No scrim, no focus trap, no close.
struct TanreiNavigationDrawerRegion: View {
  let isPresented: Bool
  let initialFocus: Int?
  let panel: TanreiNavigationDrawerPanelContent

  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// Taking its width: follows `isPresented` inside an animated transaction.
  @State private var isOpen: Bool
  /// Drawn: from the moment it opens until it has slid out.
  @State private var isMounted: Bool
  @FocusState private var focus: Int?

  init(isPresented: Bool, initialFocus: Int?, panel: TanreiNavigationDrawerPanelContent) {
    self.isPresented = isPresented
    self.initialFocus = initialFocus
    self.panel = panel
    _isOpen = State(initialValue: isPresented)
    _isMounted = State(initialValue: isPresented)
  }

  var body: some View {
    let tokens = system.navigationDrawer
    ZStack(alignment: .trailing) {
      if isMounted {
        panel.view(focus: $focus)
          // NVD-18: closed, no presence to assistive technology or the pointer, while it slides out.
          .accessibilityHidden(!isPresented)
          .allowsHitTesting(isPresented)
      }
    }
    // NVD-11, NVD-18: `container.width` wide while open, nothing while closed; the panel slides out past the leading edge.
    .frame(width: isOpen ? tokens.containerWidth : .zero, alignment: .trailing)
    .frame(maxHeight: .infinity)
    .onChange(of: isPresented) { _, open in open ? self.open() : close() }
  }

  private func open() {
    isMounted = true
    withAnimation(system.navigationDrawer.enterMotion(reduceMotion: reduceMotion)) { isOpen = true }
    // NVD-28: focus in, to the selected destination or the first enabled one, once the rows are there.
    let target = initialFocus
    Task { @MainActor in focus = target }
  }

  private func close() {
    // NVD-28: focus inside is let go; SwiftUI names no element to give it back to, so it goes where the platform puts
    // it by default.
    if focus != nil { focus = nil }
    withAnimation(system.navigationDrawer.exitMotion(reduceMotion: reduceMotion)) { isOpen = false }
    let exit = reduceMotion ? .zero : system.navigationDrawer.motionExitDuration
    Task { @MainActor in
      try? await Task.sleep(for: .milliseconds(Int(exit)))
      if !isPresented { isMounted = false }
    }
  }
}

// MARK: - The modal drawer: a modal overlay

/// NVD-19 … NVD-22: the scrim over the space it is given and the panel at its leading edge, sliding in from there while the
/// scrim fades in over the enter motion, and out over the exit motion (at once under Reduce Motion). The scrim, Escape, the
/// accessibility escape gesture and a drag toward the leading edge close it. Presented (not in place), it is a modal
/// container named by the drawer's label, it moves focus in when it opens and lets it go when it closes, and it counts
/// itself as an open Tanrei modal.
struct TanreiNavigationDrawerModal: View {
  let isPresented: Binding<Bool>
  let isInPlace: Bool
  let initialFocus: Int?
  let panel: TanreiNavigationDrawerPanelContent

  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.layoutDirection) private var layoutDirection
  @TanreiPalette private var colors
  /// Drawn: from the moment it opens until it has slid out.
  @State private var isMounted: Bool
  /// In (slid in, the scrim shown), or out.
  @State private var isShown: Bool
  /// NVD-20: how far a drag that the drawer follows has moved it toward its leading edge.
  @State private var dragged: CGFloat = .zero
  /// Counted in `TanreiModalCoordinator`.
  @State private var isCounted = false
  @FocusState private var focus: Int?

  init(isPresented: Binding<Bool>, isInPlace: Bool, initialFocus: Int?, panel: TanreiNavigationDrawerPanelContent) {
    self.isPresented = isPresented
    self.isInPlace = isInPlace
    self.initialFocus = initialFocus
    self.panel = panel
    // In place (a fixture), it is drawn open and at rest; presented, it slides in once it is there.
    let open = isInPlace && isPresented.wrappedValue
    _isMounted = State(initialValue: open)
    _isShown = State(initialValue: open)
  }

  var body: some View {
    let tokens = system.navigationDrawer
    GeometryReader { proxy in
      if isMounted {
        // How far the panel moves to be wholly past the leading edge: its width and the inset its color reaches under.
        let away = tokens.containerWidth + proxy.safeAreaInsets.leading
        ZStack(alignment: .leading) {
          // NVD-19: the scrim over the rest of the window; NVD-20: pressing it closes the drawer. Decorative.
          Rectangle()
            .fill(colors[tokens.scrimColor])
            .ignoresSafeArea()
            .contentShape(Rectangle())
            .onTapGesture { dismiss() }
            .accessibilityHidden(true)
            .opacity(isShown ? 1 : .zero)
          panel.view(focus: $focus)
            .offset(x: -(isShown ? dragged : away))
            // NVD-23: a modal container named by the drawer's label (SwiftUI has no dialog role).
            .accessibilityAddTraits(isInPlace ? [] : .isModal)
            // NVD-20: Escape, and the accessibility escape gesture.
            .onKeyPress(.escape) {
              dismiss()
              return .handled
            }
            #if os(macOS)
            .onExitCommand { dismiss() }
            #endif
            .accessibilityAction(.escape) { dismiss() }
            .simultaneousGesture(drag(width: tokens.containerWidth))
        }
      }
    }
    .onChange(of: isPresented.wrappedValue, initial: true) { _, open in open ? present() : withdraw() }
    .onDisappear { uncount() }
  }

  /// NVD-20: closes the drawer — writes `false`, the spec's `close` — once, while it is presented.
  private func dismiss() {
    TanreiNavigationDrawerRules.dismiss(isPresented)
  }

  /// NVD-19: slides in and fades the scrim in; focus moves in.
  private func present() {
    guard !isInPlace else { return }
    if !isCounted {
      isCounted = true
      TanreiModalCoordinator.shared.opened()
    }
    isMounted = true
    dragged = .zero
    let target = initialFocus
    let motion = system.navigationDrawer.enterMotion(reduceMotion: reduceMotion)
    Task { @MainActor in
      withAnimation(motion) { isShown = true }
      focus = target
    }
  }

  /// NVD-22: slides out and fades the scrim out; focus inside is let go.
  private func withdraw() {
    guard !isInPlace else { return }
    uncount()
    if focus != nil { focus = nil }
    withAnimation(system.navigationDrawer.exitMotion(reduceMotion: reduceMotion)) {
      isShown = false
      dragged = .zero
    }
    let exit = reduceMotion ? .zero : system.navigationDrawer.motionExitDuration
    Task { @MainActor in
      try? await Task.sleep(for: .milliseconds(Int(exit)))
      if !isPresented.wrappedValue { isMounted = false }
    }
  }

  private func uncount() {
    guard isCounted else { return }
    isCounted = false
    TanreiModalCoordinator.shared.closed()
  }

  /// NVD-20: the drawer follows a drag toward its leading edge beyond the touch slop, and closes when it is released past
  /// half its width or flung that way; otherwise it settles back over the enter motion. Measured in the window's
  /// coordinates, which do not mirror: toward the start is leftward, or rightward right to left.
  private func drag(width: CGFloat) -> some Gesture {
    DragGesture(minimumDistance: TanreiNavigationDrawerRules.touchSlop, coordinateSpace: .global)
      .onChanged { value in
        guard isPresented.wrappedValue else { return }
        dragged = max(.zero, towardStart(value.translation.width))
      }
      .onEnded { value in
        guard isPresented.wrappedValue else { return }
        let distance = max(.zero, towardStart(value.translation.width))
        if TanreiNavigationDrawerRules.closes(distance: distance, velocity: towardStart(value.velocity.width), width: width) {
          dismiss()
        } else {
          withAnimation(system.navigationDrawer.enterMotion(reduceMotion: reduceMotion)) { dragged = .zero }
        }
      }
  }

  private func towardStart(_ dx: CGFloat) -> CGFloat {
    layoutDirection == .rightToLeft ? dx : -dx
  }
}

/// The side of the view `.tanreiNavigationDrawer(…)` is attached to. A standard drawer is laid out beside it. A modal
/// drawer is presented over it as a dialog is (DLG-1): on iOS in a full-screen cover on a clear background, the system's
/// transition off — the drawer draws its own slide and scrim —, which makes the rest of the app inaccessible to VoiceOver,
/// touch and the keyboard; on macOS over the view, which is inert meanwhile. The cover is taken away once the drawer has
/// slid out.
struct TanreiNavigationDrawerPresenter<Drawer: View>: ViewModifier {
  let variant: TanreiNavigationDrawerVariant
  let isPresented: Binding<Bool>
  @ViewBuilder let drawer: () -> Drawer

  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// Whether the drawer is presented at all (it stays while it slides out).
  @State private var isCovering = false

  func body(content: Content) -> some View {
    if TanreiNavigationDrawerRules.isModal(variant) {
      content
        #if os(iOS)
        .fullScreenCover(isPresented: coverBinding) { drawer().presentationBackground(.clear) }
        #else
        // NVD-19: nothing in the view can be pressed, it is hidden from VoiceOver, and — disabled — nothing in it takes
        // keyboard focus, which keeps focus in the drawer.
        .disabled(isCovering)
        .allowsHitTesting(!isCovering)
        .accessibilityHidden(isCovering)
        .overlay { if isCovering { drawer() } }
        #endif
        .onChange(of: isPresented.wrappedValue, initial: true) { _, open in open ? cover() : uncover() }
    } else {
      // NVD-18: a layout region at the leading edge, the view taking the rest of the width.
      HStack(spacing: .zero) {
        drawer()
        content.frame(maxWidth: .infinity, maxHeight: .infinity)
      }
    }
  }

  /// The cover's own binding: SwiftUI writes `false` to it only when it dismisses the cover itself.
  private var coverBinding: Binding<Bool> {
    Binding(get: { isCovering }, set: { value in if !value { isCovering = false } })
  }

  private func cover() {
    guard !isCovering else { return }
    var transaction = Transaction()
    transaction.disablesAnimations = true
    withTransaction(transaction) { isCovering = true }
  }

  private func uncover() {
    guard isCovering else { return }
    let exit = reduceMotion ? .zero : system.navigationDrawer.motionExitDuration
    Task { @MainActor in
      try? await Task.sleep(for: .milliseconds(Int(exit)))
      guard !isPresented.wrappedValue else { return }
      var transaction = Transaction()
      transaction.disablesAnimations = true
      withTransaction(transaction) { isCovering = false }
    }
  }
}

// MARK: - The panel

/// The panel (NVD-11, NVD-12, NVD-16, NVD-17, NVD-23, NVD-25): `container.width` wide beside the leading inset and the full
/// height it is offered, on its variant's color and elevation, its trailing corners rounded by its variant's shape and its
/// leading corners square, edged at its trailing side by `outline.width` of its variant's outline color; inside,
/// `container.padding-inline` from its sides and `container.padding-block` from its top and bottom, the header and then the
/// destinations and sections, `container.gap` apart, scrolling together. Its color reaches under the leading, top and bottom
/// system insets; its content stays inside them.
struct TanreiNavigationDrawerPanel: View {
  let content: TanreiNavigationDrawerPanelContent
  let focus: FocusState<Int?>.Binding

  @Environment(\.tanreiSystem) private var system
  @TanreiPalette private var colors

  var body: some View {
    let tokens = system.navigationDrawer
    // NVD-26: a variant the design system does not have reads the default's tokens, and is reported.
    let surface = tokens.variants[content.variant]
    let metrics = TanreiNavigationDrawerMetrics(tokens: tokens, measure: system.measure)
    let model = content.model
    TanreiScrollRegion(axis: .vertical) {
      VStack(alignment: .leading, spacing: .zero) {
        if !content.header.isEmpty {
          // The header's content, as the product wrote it; the drawer does not restyle it.
          VStack(alignment: .leading, spacing: .zero) {
            ForEach(content.header) { $0 }
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.vertical, metrics.halfGap)
        }
        ForEach(model.elements.indices, id: \.self) { index in
          switch model.elements[index] {
          case .destination(let entry):
            row(entry, metrics: metrics)
          case .section(let heading, let divider, let destinations):
            section(heading: heading, divider: divider, destinations: destinations, tokens: tokens, metrics: metrics)
          }
        }
      }
      .padding(.horizontal, tokens.containerPaddingInline)
      .padding(.vertical, metrics.paddingBlock)
    }
    // NVD-11: `container.width` wide beside the leading inset (never scaled with the text, NVD-27), the full height.
    .frame(width: tokens.containerWidth)
    .frame(maxHeight: .infinity, alignment: .top)
    // NVD-11, NVD-25: the container in its variant's color and elevation, reaching under the leading, top and bottom insets.
    .background {
      TanreiNavigationDrawerSurface(tokens: surface)
        .ignoresSafeArea(.container, edges: [.leading, .vertical])
    }
    // NVD-11: the trailing edge (the left one right to left), over the rows, its full height; decorative.
    .overlay(alignment: .trailing) {
      Rectangle()
        .fill(colors[surface.outlineColor])
        .frame(width: tokens.outlineWidth)
        .ignoresSafeArea(.container, edges: .vertical)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
    // NVD-23: the drawer, named by its label, holding the header, the sections and the destinations.
    .accessibilityElement(children: .contain)
    .modifier(TanreiNavigationDrawerName(label: content.accessibilityLabel))
  }

  private func row(_ index: Int, metrics: TanreiNavigationDrawerMetrics) -> some View {
    TanreiNavigationDrawerCellLayout(minimumHeight: metrics.minimumTarget) {
      TanreiNavigationDrawerDestination(
        entry: content.model.entries[index], isSelected: index == content.selected, index: index, count: content.model.entries.count,
        halfGap: metrics.halfGap, focus: focus, activate: { content.activate(index) })
    }
  }

  /// NVD-16, NVD-17: the divider across the inner width, the heading and the section's destinations, in that order,
  /// `container.gap` apart.
  private func section(
    heading: String, divider: Bool, destinations: [Int], tokens: TanreiNavigationDrawerTokens, metrics: TanreiNavigationDrawerMetrics
  ) -> some View {
    VStack(alignment: .leading, spacing: .zero) {
      if divider {
        // The divider component, as it draws itself.
        TanreiDivider()
          .padding(.vertical, metrics.halfGap)
      }
      if !heading.isEmpty {
        // NVD-16: at least `heading.height` high, the text centered in it and starting where the rows' content starts;
        // a header that takes no focus.
        Text(verbatim: heading)
          .fixedSize(horizontal: false, vertical: true)
          .tanreiTextStyle(tokens.headingTypescale)
          .foregroundStyle(colors[tokens.headingColor])
          .padding(.horizontal, tokens.itemPaddingInline)
          .frame(maxWidth: .infinity, minHeight: tokens.headingHeight, alignment: .leading)
          .accessibilityAddTraits(.isHeader)
          .padding(.vertical, metrics.halfGap)
      }
      ForEach(destinations, id: \.self) { index in
        row(index, metrics: metrics)
      }
    }
    // A section is a group of its heading and its destinations.
    .accessibilityElement(children: .contain)
  }
}

private struct TanreiNavigationDrawerName: ViewModifier {
  let label: LocalizedStringKey

  func body(content: Content) -> some View {
    if label == "" { content } else { content.accessibilityLabel(Text(label)) }
  }
}

/// NVD-11: the panel's surface — its variant's color and elevation, its trailing corners rounded by its variant's shape and
/// its leading corners square. The rounded surface reaches past the leading edge by its corner radius and is cut there
/// with its shadow, so the leading corners are square and nothing is drawn past that edge; its shadow on every other side is
/// kept.
struct TanreiNavigationDrawerSurface: View {
  let tokens: TanreiNavigationDrawerVariantTokens

  @TanreiPalette private var colors

  var body: some View {
    // How far the elevation paints past the container: what the cut must leave on the other three sides.
    let reach = tokens.containerElevation.map(TanreiElevationPlan.reach).max() ?? .zero
    TanreiElevationSurface(tokens.containerElevation, fill: colors[tokens.containerColor], cornerRadius: tokens.containerShape)
      .padding(.leading, -tokens.containerShape)
      .clipShape(TanreiLeadingCut(reach: reach))
      .accessibilityHidden(true)
  }
}

/// Everything from a view's leading edge on, and `reach` past its other three edges: what clips away only what lies before
/// the leading edge. A shape, so it mirrors right to left.
struct TanreiLeadingCut: Shape {
  let reach: CGFloat

  func path(in rect: CGRect) -> Path {
    Path(CGRect(x: rect.minX, y: rect.minY - reach, width: rect.width + reach, height: rect.height + 2 * reach))
  }
}

/// NVD-6: one destination's cell — its row with half of `container.gap` above and below, as tall as that and no taller in
/// the layout — whose hit area is at least `minimumHeight` high, centered on the row: where the row and gap give less, the
/// destination is laid out taller than its cell and reaches over its neighbors' half gaps, without changing the drawn row.
/// Stateless, so it is right on the first layout pass.
struct TanreiNavigationDrawerCellLayout: Layout {
  let minimumHeight: CGFloat

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    guard let subview = subviews.first else { return .zero }
    let natural = subview.sizeThatFits(ProposedViewSize(width: proposal.width, height: nil))
    return CGSize(width: proposal.width.flatMap { $0.isFinite ? $0 : nil } ?? natural.width, height: natural.height)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    guard let subview = subviews.first else { return }
    let height = max(bounds.height, minimumHeight)
    subview.place(at: CGPoint(x: bounds.minX, y: bounds.midY), anchor: .leading, proposal: ProposedViewSize(width: bounds.width, height: height))
  }
}

// MARK: - One destination

/// One destination: a button drawn by `TanreiNavigationDrawerDestinationStyle`, activated by pointer, touch, Enter and
/// Space; one element named by its label with its selected state, its position and its badge text (NVD-23).
struct TanreiNavigationDrawerDestination: View {
  let entry: TanreiNavigationDrawerEntry
  let isSelected: Bool
  /// Its position among all the drawer's destinations, 0-based, and how many there are.
  let index: Int
  let count: Int
  let halfGap: CGFloat
  let focus: FocusState<Int?>.Binding
  let activate: @MainActor () -> Void

  /// Counts activations by key: each one starts a press that no pointer held down (NVD-8).
  @State private var keyboardPresses = 0

  var body: some View {
    Button(action: activate) { Text(verbatim: entry.title) }
      .buttonStyle(
        TanreiNavigationDrawerDestinationStyle(
          entry: entry, isSelected: isSelected, halfGap: halfGap, isFocused: focus.wrappedValue == index, keyboardPresses: keyboardPresses))
      // NVD-2: a disabled destination cannot be activated, takes no focus and is exposed as disabled.
      .disabled(!entry.isEnabled)
      // NVD-5: SwiftUI never moves focus to a button on a click or tap, so this is keyboard focus.
      .focused(focus, equals: index)
      // Tanrei draws its own ring (NVD-5); the system focus effect would double it.
      .focusEffectDisabled()
      // NVD-1, NVD-8: Enter and Space activate, once per key press, and show the press from the center.
      .tanreiKeyActivation(isEnabled: entry.isEnabled) {
        keyboardPresses += 1
        activate()
      }
      // NVD-23: one element named by its label, with its selected state; its position, then (NVD-15) its badge text, after
      // them. Its icon is hidden.
      .accessibilityLabel(Text(verbatim: entry.title))
      .accessibilityValue(Text(verbatim: TanreiNavigationDrawerRules.accessibilityValue(index: index, count: count, badge: entry.badge)))
      .accessibilityAddTraits(isSelected ? .isSelected : [])
  }
}

struct TanreiNavigationDrawerDestinationStyle: ButtonStyle {
  let entry: TanreiNavigationDrawerEntry
  let isSelected: Bool
  let halfGap: CGFloat
  let isFocused: Bool
  var keyboardPresses = 0

  func makeBody(configuration: Configuration) -> some View {
    TanreiNavigationDrawerDestinationChrome(
      entry: entry, isSelected: isSelected, halfGap: halfGap, isPressed: configuration.isPressed, isFocused: isFocused, keyboardPresses: keyboardPresses)
  }
}

/// The visual of one destination: its cell (the whole hit area, NVD-6) and in it the row — the item container with its
/// icon, label and badge — drawn from the tokens of the one resolved state of its condition.
struct TanreiNavigationDrawerDestinationChrome: View {
  let entry: TanreiNavigationDrawerEntry
  let isSelected: Bool
  let halfGap: CGFloat
  let isPressed: Bool
  /// Keyboard focus: SwiftUI never moves focus to a button on a click or tap (NVD-4, NVD-5).
  let isFocused: Bool
  var keyboardPresses = 0

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    let feedback = system.behavior.pressedFeedback
    // NVD-8: a press stays visible at least `duration.press-hold`; NVD-9: the point of contact only under `ripple`,
    // measured in the item container, so a press in the half gaps grows the ripple from its center.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyboardPresses, watchesContact: feedback == .ripple, contactArea: .part) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let tokens = system.navigationDrawer
    // NVD-4: exactly one state — pressed > focused > hovered; NVD-7: disabled is a state too.
    let state = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let appearance = TanreiNavigationDrawerItemAppearance(tokens: tokens, isSelected: isSelected, state: state, feedback: feedback, beneath: beneath)
    let ripple = appearance.ripple.map {
      TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion))
    }
    let condition: TanreiNavigationDrawerCondition = isSelected ? .selected : .unselected

    // NVD-13: the icon while there is one, the label (wrapping), the badge text at the end while there is one,
    // `item.gap` apart and `item.padding-inline` from the row's ends; mirrored right to left.
    return HStack(spacing: tokens.itemGap) {
      if let icon = entry.icon {
        // NVD-14: `item.icon.size`, the family and fill of the condition; not scaled with the text (NVD-27); centered on
        // the row, taking no height. Hidden: the destination is named by its label.
        TanreiIconSlot(size: tokens.itemIconSize) {
          TanreiItemIconView(icon: icon, size: tokens.itemIconSize, selected: isSelected)
            .foregroundStyle(colors[appearance.icon])
        }
      }
      Text(verbatim: entry.title)
        .multilineTextAlignment(.leading)
        .fixedSize(horizontal: false, vertical: true)
        .tanreiTextStyle(tokens.itemLabelTypescale)
        .foregroundStyle(colors[appearance.label])
        .frame(maxWidth: .infinity, alignment: .leading)
      if !entry.badge.isEmpty {
        // NVD-15: drawn in the row's own colors, kept while disabled; its words are the destination's value.
        Text(verbatim: entry.badge)
          .monospacedDigit()
          .fixedSize()
          .tanreiTextStyle(tokens.itemBadgeTypescale)
          .foregroundStyle(colors[appearance.badge])
          .accessibilityHidden(true)
      }
    }
    .padding(.horizontal, tokens.itemPaddingInline)
    // NVD-13: across the drawer's inner width, at least `item.container.height` high (a minimum: it grows with its text,
    // NVD-27).
    .frame(maxWidth: .infinity, minHeight: tokens.itemContainerHeight, alignment: .leading)
    // NVD-4, NVD-7, NVD-9, NVD-10: the item container's fill and state layer, its corners eased by the corner smoothing,
    // the ripple, and the state's opacity on the whole row; colors change over the state motion (at once under Reduce
    // Motion). The ring is drawn outside it, below.
    .modifier(
      TanreiItemRowContainer(
        fill: colors[appearance.container], ripple: ripple, cornerRadius: tokens.itemContainerShape, opacity: appearance.opacity,
        motion: tokens.stateMotion(reduceMotion: reduceMotion), state: state, condition: condition, showsFocusRing: false))
    .tanreiContactArea()
    // NVD-5, NVD-10: the ring (or the glow) around the item container, keyboard focus only, never animated, never dimmed.
    .tanreiFocusRing(isFocused && isEnabled, cornerRadius: tokens.itemContainerShape)
    // NVD-6: the cell — the row with half the gap above and below — is the hit area, at least as tall as it is laid out.
    .padding(.vertical, halfGap)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .contentShape(Rectangle())
    .onHover { isHovered = $0 }
  }
}
