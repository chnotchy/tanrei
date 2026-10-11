import SwiftUI

// Spec: specs/navigation-bar.spec.json — tokens: TanreiNavigationBarTokens (comp.navigation-bar), read from the design
// system in the environment (`system.navigationBar`). Every design value in this file comes from a token; there are no
// literals, and no state's look is computed here. A destination is pressed like Button: press, hold, ripple,
// focus ring and container layers are the shared primitives, and NVB-8, NVB-9 and NVB-10 are BTN-8, BTN-9 and BTN-10 for
// the destination. The item kind `destination` is `TanreiNavigationBarItem`; what a destination draws and does
// is the shared destination of the bar and the rail (`Primitives/TanreiNavigationDestination.swift`).
//
// A bar of its own rather than a restyled `TabView`, whose bar the tokens cannot reach (indicator, geometry, colors). It is
// a layout region: placed with `.safeAreaInset(edge: .bottom)`, its color reaches under the bottom and side
// system insets and its destinations stay inside them (NVB-18).

/// Which destinations of a navigation bar (or rail) draw their label (NVB-13): every one (`always`, the default), only
/// the selected one (`selected`) or none (`never`). A label that is not drawn is still the destination's accessible name.
public enum TanreiNavigationLabelVisibility: String, CaseIterable, Sendable {
  /// Every destination's label.
  case always
  /// Only the selected destination's label; the others center their item container in the cell.
  case selected
  /// No label; every item container is centered in its cell.
  case never

  /// NVB-13: whether a destination draws its label, given whether it is the selected one.
  func showsLabel(selected: Bool) -> Bool {
    switch self {
    case .always: true
    case .selected: selected
    case .never: false
    }
  }
}

/// A Tanrei badge on a navigation destination's icon (NVB-16), with the badge component's rules: `count` `nil` draws the
/// dot, 0 nothing, above 0 the number (above 999 as `999+`); `label` is what assistive technology reads after the
/// destination's name and state ("3 unread"; a dot needs one). The bar and the rail take the same one.
public struct TanreiNavigationBadge: Hashable, Sendable {
  /// The spec's `badgeCount`.
  public var count: Int?
  /// The spec's `badgeLabel`.
  public var label: String

  public init(count: Int? = nil, label: String = "") {
    self.count = count
    self.label = label
  }
}

/// Moves between three to five top-level destinations from the bottom edge of a compact screen, and shows which one is
/// current.
///
///     @State private var tab = "inbox"
///     ContentView()
///       .safeAreaInset(edge: .bottom, spacing: 0) {
///         TanreiNavigationBar(selection: $tab, accessibilityLabel: "Main", onReselect: { scrollToTop($0) }) {
///           TanreiNavigationBarItem("Inbox", icon: "inbox", value: "inbox", badge: TanreiNavigationBadge(count: 3, label: "3 unread"))
///           TanreiNavigationBarItem("Sent", icon: "send", value: "sent")
///           TanreiNavigationBarItem("Starred", icon: "star", value: "starred")
///             .disabled(!signedIn)
///           TanreiNavigationBarItem("Settings", icon: "settings", value: "settings")
///         }
///       }
///
/// - `selection` holds the selected destination's value (the spec's `value`). Activating another destination — by
///   pointer, touch, Enter or Space — writes its value, which is the spec's `change`; activating the selected one calls
///   `onReselect` with its value (a product may scroll that screen to its top) and writes nothing (NVB-1). A value that
///   names no destination, or an empty one (`""`, or `nil` with a `Binding<V?>`), selects none (NVB-3).
/// - `labelVisibility` is a `TanreiNavigationLabelVisibility`: `.always` (default), `.selected` or `.never` (NVB-13).
/// - `accessibilityLabel` names the bar itself ("Main"), the spec's `label`.
///
/// The bar spans the width it is offered, divides it into equal cells in reading order (mirrored right to left), and is at
/// least `container.height` high above the bottom system inset; it grows when enlarged text needs it, while its item
/// containers and icons keep their size (NVB-11, NVB-21). To assistive technology it is a tab bar, each destination a
/// button with the selected trait (NVB-19).
public struct TanreiNavigationBar<SelectionValue: Hashable, Content: View>: View {
  private let selection: TanreiTabsSelection
  private let labelVisibility: TanreiNavigationLabelVisibility
  private let accessibilityLabel: LocalizedStringKey
  private let onReselect: (@MainActor (AnyHashable) -> Void)?
  private let content: Content

  /// A bar whose selected destination's value `selection` holds.
  public init(
    selection: Binding<SelectionValue>, labelVisibility: TanreiNavigationLabelVisibility = .always, accessibilityLabel: LocalizedStringKey = "",
    onReselect: (@MainActor (SelectionValue) -> Void)? = nil, @ViewBuilder content: () -> Content
  ) {
    self.init(
      selection: TanreiTabsSelection(selection), labelVisibility: labelVisibility, accessibilityLabel: accessibilityLabel,
      onReselect: Self.erase(onReselect), content: content())
  }

  /// A bar whose selected destination's value `selection` holds; `nil` selects none.
  public init(
    selection: Binding<SelectionValue?>, labelVisibility: TanreiNavigationLabelVisibility = .always, accessibilityLabel: LocalizedStringKey = "",
    onReselect: (@MainActor (SelectionValue) -> Void)? = nil, @ViewBuilder content: () -> Content
  ) {
    self.init(
      selection: TanreiTabsSelection(selection), labelVisibility: labelVisibility, accessibilityLabel: accessibilityLabel,
      onReselect: Self.erase(onReselect), content: content())
  }

  private init(
    selection: TanreiTabsSelection, labelVisibility: TanreiNavigationLabelVisibility, accessibilityLabel: LocalizedStringKey,
    onReselect: (@MainActor (AnyHashable) -> Void)?, content: Content
  ) {
    self.selection = selection
    self.labelVisibility = labelVisibility
    self.accessibilityLabel = accessibilityLabel
    self.onReselect = onReselect
    self.content = content
  }

  /// `onReselect` typed away: a value of another type than the bar's calls nothing.
  private static func erase(_ onReselect: (@MainActor (SelectionValue) -> Void)?) -> (@MainActor (AnyHashable) -> Void)? {
    guard let onReselect else { return nil }
    return { value in if let typed = value.base as? SelectionValue { onReselect(typed) } }
  }

  public var body: some View {
    let selection = selection
    let labelVisibility = labelVisibility
    let accessibilityLabel = accessibilityLabel
    let onReselect = onReselect
    _VariadicView.Tree(
      TanreiDestinationsRoot { entries in
        TanreiNavigationBarView(
          entries: entries, selection: selection, labelVisibility: labelVisibility, accessibilityLabel: accessibilityLabel, onReselect: onReselect)
      }
    ) {
      content
    }
  }
}

/// One destination of a `TanreiNavigationBar` (the spec's item kind `destination`): an icon, a label under it and
/// optionally a badge on the icon.
///
///     TanreiNavigationBarItem("Inbox", icon: "inbox", value: "inbox", badge: TanreiNavigationBadge(count: 3, label: "3 unread"))
///     TanreiNavigationBarItem("Profile", icon: .image(Image(systemName: "person")), value: Screen.profile)
///     TanreiNavigationBarItem("Starred", icon: "star", value: "starred").disabled(true)
///
/// - `title` is its label: drawn under the icon (see the bar's `labelVisibility`) and always its accessible name. An empty
///   one still renders and is reported in debug builds (NVB-20).
/// - `icon` is the name of a glyph of the design system's icon font, drawn outlined while unselected and filled while
///   selected (NVB-14); or, with the `TanreiItemIcon` overload, an image of the product's own (an SF Symbol, which does not
///   follow the selection: pass the `.fill` symbol for the selected destination yourself).
/// - `value` identifies it: the bar's `selection` selects the destination whose value equals it. Unique within the bar
///   (the first of two sharing one is the one it selects, and it is reported in debug builds, NVB-22).
/// - `badge` draws a Tanrei badge on the icon from its `count` and `label` (NVB-16); `nil` draws none.
/// - `disabled` follows `.disabled(_:)` on the item: it keeps its place, draws its disabled look, cannot be activated and
///   takes no focus (NVB-2, NVB-7).
///
/// An item draws nothing where it is written: the bar draws it from what it reads.
public struct TanreiNavigationBarItem: View {
  private let title: String
  private let icon: TanreiItemIcon
  private let value: AnyHashable
  private let badge: TanreiNavigationBadge?

  /// A destination whose icon is a glyph of the icon font, by name.
  public init<Value: Hashable>(_ title: String, icon: String, value: Value, badge: TanreiNavigationBadge? = nil) {
    self.init(title, icon: TanreiItemIcon(icon), value: value, badge: badge)
  }

  /// A destination whose icon is a glyph by name or an image of the product's own.
  public init<Value: Hashable>(_ title: String, icon: TanreiItemIcon, value: Value, badge: TanreiNavigationBadge? = nil) {
    self.title = title
    self.icon = icon
    self.value = AnyHashable(value)
    self.badge = badge
  }

  public var body: some View {
    TanreiDestinationTrait(title: title, icon: icon, value: value, badge: badge)
  }
}

// MARK: - The bar

/// The bar (NVB-11, NVB-18, NVB-19, NVB-21): its container, top edge and equal cells, the destinations in them, the reports
/// of NVB-3, NVB-17, NVB-20 and NVB-22, and the semantics of the tab bar.
struct TanreiNavigationBarView: View {
  let entries: [TanreiDestinationEntry]
  let selection: TanreiTabsSelection
  let labelVisibility: TanreiNavigationLabelVisibility
  let accessibilityLabel: LocalizedStringKey
  let onReselect: (@MainActor (AnyHashable) -> Void)?

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @TanreiPalette private var colors

  /// NVB-17: what a bar is made for.
  static let reportIds = TanreiDestinationReportIds(unknownValue: "NVB-3", emptyLabel: "NVB-20", duplicate: "NVB-22", count: "NVB-17", range: 3...5)

  var body: some View {
    let system = theme.system
    let tokens = system.navigationBar
    let style = tokens.destinationStyle
    let problems = TanreiDestinationRules.problems(entries, selection: selection.value, ids: Self.reportIds)
    if !problems.isEmpty {
      let _ = problems.forEach { TanreiDiagnostics.report("Tanrei: a navigation bar: \($0)") }
    }
    let selected = TanreiDestinationRules.selectedIndex(entries, selection: selection.value)
    let line = tokens.itemLabelTypescale.resolved(policy: theme.fontFamilyPolicy, dynamicTypeSize: dynamicTypeSize).lineHeight
    let metrics = TanreiNavigationBarMetrics(tokens: tokens, labelVisibility: labelVisibility, labelLineHeight: line, measure: system.measure)
    TanreiNavigationBarRowLayout(minimumCellWidth: metrics.minimumCellWidth, minimumHeight: metrics.minimumHeight) {
      ForEach(entries.indices, id: \.self) { index in
        TanreiDestinationButton(
          entry: entries[index], style: style, isSelected: index == selected, labelShown: labelVisibility.showsLabel(selected: index == selected),
          index: index, count: entries.count, activate: { activate(index, selected: selected) })
      }
    }
    // NVB-11: the full width of its parent.
    .frame(maxWidth: .infinity)
    // NVB-11, NVB-18: the container in its color and elevation, reaching under the bottom and side system insets.
    .background {
      TanreiElevationSurface(tokens.containerElevation, fill: colors[tokens.containerColor], cornerRadius: .zero)
        .ignoresSafeArea(.container, edges: [.bottom, .horizontal])
        .accessibilityHidden(true)
    }
    // NVB-11: the top edge, inside the bar, over its cells; decorative.
    .overlay(alignment: .top) {
      Rectangle()
        .fill(colors[tokens.outlineColor])
        .frame(height: tokens.outlineWidth)
        .ignoresSafeArea(.container, edges: .horizontal)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
    // NVB-19: a tab bar of destinations, named by the bar's label.
    .accessibilityElement(children: .contain)
    .accessibilityAddTraits(.isTabBar)
    .modifier(TanreiNavigationBarName(label: accessibilityLabel))
  }

  /// NVB-1, NVB-2: the single route to `change` (the binding) and `reselect` — once per activation, never for a disabled
  /// destination.
  private func activate(_ index: Int, selected: Int?) {
    switch TanreiDestinationRules.activation(entries, activating: index, selected: selected) {
    case .change(let value): selection.write(value)
    case .reselect(let value): onReselect?(value)
    case nil: break
    }
  }
}

private struct TanreiNavigationBarName: ViewModifier {
  let label: LocalizedStringKey

  func body(content: Content) -> some View {
    if label == "" { content } else { content.accessibilityLabel(Text(label)) }
  }
}

/// The bar's geometry from its tokens (NVB-6, NVB-11, NVB-21).
struct TanreiNavigationBarMetrics: Equatable {
  /// NVB-6: the least width a cell asks for when the bar is offered no width (its ideal size). Offered a width, the cells
  /// share it equally, below this where the destinations do not fit (NVB-6).
  let minimumCellWidth: CGFloat
  /// NVB-11: at least `container.height` (and the minimum target, NVB-6). NVB-21: while labels are drawn at all, room for a
  /// destination with its label on one line at the current text size — so the bar grows with enlarged text, and keeps its
  /// height while labels come and go (`selected`).
  let minimumHeight: CGFloat

  init(tokens: TanreiNavigationBarTokens, labelVisibility: TanreiNavigationLabelVisibility, labelLineHeight: CGFloat, measure: TanreiMeasure) {
    let target = TanreiHitTarget.minimum(in: measure)
    let withLabel = labelVisibility == .never ? tokens.itemContainerHeight : tokens.itemContainerHeight + tokens.itemGap + labelLineHeight
    minimumCellWidth = target
    minimumHeight = max(tokens.containerHeight, target, withLabel)
  }
}

/// NVB-11: the destinations in one row of equal cells — the offered width divided by their number — every one the bar's
/// full height: at least `minimumHeight`, and as tall as the tallest destination needs. NVB-6: an equal share narrower than
/// the target is kept (the cells narrow, the bar is never wider than it is offered); only asked for its ideal size (no
/// width offered) does a cell ask for `minimumCellWidth`. Stateless, so it is right on the first layout pass; SwiftUI
/// mirrors it right to left.
struct TanreiNavigationBarRowLayout: Layout {
  let minimumCellWidth: CGFloat
  let minimumHeight: CGFloat

  func cellWidth(proposal: ProposedViewSize, subviews: Subviews) -> CGFloat {
    guard !subviews.isEmpty else { return .zero }
    // NVB-6: offered a width, the equal share of it, however narrow.
    if let width = proposal.width, width.isFinite { return width / CGFloat(subviews.count) }
    return max(subviews.map { $0.sizeThatFits(.unspecified).width }.max() ?? .zero, minimumCellWidth)
  }

  func height(cellWidth: CGFloat, subviews: Subviews) -> CGFloat {
    let tallest = subviews.map { $0.sizeThatFits(ProposedViewSize(width: cellWidth, height: nil)).height }.max() ?? .zero
    return max(minimumHeight, tallest)
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let width = cellWidth(proposal: proposal, subviews: subviews)
    return CGSize(width: width * CGFloat(subviews.count), height: height(cellWidth: width, subviews: subviews))
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    let width = cellWidth(proposal: ProposedViewSize(width: bounds.width, height: bounds.height), subviews: subviews)
    let height = max(bounds.height, self.height(cellWidth: width, subviews: subviews))
    var x = bounds.minX
    for subview in subviews {
      subview.place(at: CGPoint(x: x, y: bounds.minY), anchor: .topLeading, proposal: ProposedViewSize(width: width, height: height))
      x += width
    }
  }
}

// MARK: - Token bindings

extension TanreiNavigationBarTokens {
  /// The bar's tokens as its destinations read them (NVB-3, NVB-4, NVB-7, NVB-9, NVB-12, NVB-14, NVB-15).
  var destinationStyle: TanreiDestinationStyle {
    let conditions = conditions
    let tokens = self
    return TanreiDestinationStyle(
      containerWidth: itemContainerWidth, containerHeight: itemContainerHeight, containerShape: itemContainerShape, gap: itemGap,
      iconSize: itemIconSize, labelTypescale: itemLabelTypescale, labelLineLimit: 1, feedbackDuration: motionFeedbackDuration,
      stateDuration: motionStateDuration, stateEasing: motionStateEasing, selectionDuration: motionSelectionDuration,
      selectionEasing: motionSelectionEasing,
      parts: { selected, state in
        // NVB-3: the selected parts for the selected destination, the unselected parts for every other. (A condition's
        // `item.state-layer.color` is not read: it is what the design system mixed into the state's container.)
        let parts = conditions[selected ? TanreiNavigationBarCondition.selected : .unselected][state: state]
        return TanreiDestinationParts(container: parts.itemContainerColor, icon: parts.itemIconColor, label: parts.itemLabelColor)
      },
      opacity: { tokens[state: $0]?.opacity })
  }
}
