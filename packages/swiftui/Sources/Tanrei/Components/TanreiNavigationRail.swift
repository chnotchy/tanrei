import SwiftUI

// Spec: specs/navigation-rail.spec.json — tokens: TanreiNavigationRailTokens (comp.navigation-rail), read from the design
// system in the environment (`system.navigationRail`). Every design value in this file comes from a token; there are no
// literals, and no state's look is computed here. The rail is the navigation bar's destinations stacked along the start
// edge: what one destination draws and does — cell, item container, press, hold, ripple, focus ring, icon, badge, label,
// selection motion and semantics — is the shared destination (`Primitives/TanreiNavigationDestination.swift`), drawn from
// the rail's own tokens. NVR-8, NVR-9 and NVR-10 are BTN-8, BTN-9 and BTN-10 for the destination.
//
// A layout region: placed at the leading edge (an `HStack`, or `.safeAreaInset(edge: .leading)`), the full
// height of its parent; its color reaches under the leading, top and bottom system insets and its header and destinations
// stay inside them (NVR-19).

/// Moves between three to seven top-level destinations from the leading edge of a medium or large screen, shows which one
/// is current, and holds the screen's menu button or main action above them.
///
///     @State private var screen = "inbox"
///     HStack(spacing: 0) {
///       TanreiNavigationRail(selection: $screen, accessibilityLabel: "Main", onReselect: { scrollToTop($0) }) {
///         TanreiNavigationRailItem("Inbox", icon: "inbox", value: "inbox", badge: TanreiNavigationBadge(count: 3, label: "3 unread"))
///         TanreiNavigationRailItem("Sent", icon: "send", value: "sent")
///         TanreiNavigationRailItem("Starred", icon: "star", value: "starred")
///           .disabled(!signedIn)
///         TanreiNavigationRailItem("Settings", icon: "settings", value: "settings")
///       } header: {
///         TanreiIconButton("Menu", action: openDrawer) { TanreiIconGlyph("menu") }
///       }
///       ContentView()
///     }
///
/// - `selection` holds the selected destination's value (the spec's `value`). Activating another destination — by
///   pointer, touch, Enter or Space — writes its value, which is the spec's `change`; activating the selected one calls
///   `onReselect` with its value and writes nothing (NVR-1). A value that names no destination, or an empty one (`""`, or
///   `nil` with a `Binding<V?>`), selects none (NVR-3).
/// - `labelVisibility` is a `TanreiNavigationLabelVisibility`: `.always` (default), `.selected` or `.never` (NVR-14).
/// - `accessibilityLabel` names the rail itself ("Main"), the spec's `label`.
/// - `header` holds the spec's `header` slot: the header-button items (a `TanreiIconButton`, the menu) and a floating action
///   button, stacked and centered above the destinations, in that order; the rail does not restyle them (NVR-12).
///
/// The rail is `container.width` wide beside the leading system inset and the full height it is offered; its destinations
/// are stacked from the top in reading order and scroll when they do not fit, while the header stays (NVR-11, NVR-12,
/// NVR-18). Right to left it is at the right edge with its edge on its left. To assistive technology the header comes
/// first with its own semantics, then a tab bar whose destinations are buttons with the selected trait (NVR-20).
public struct TanreiNavigationRail<SelectionValue: Hashable, Content: View, Header: View>: View {
  private let selection: TanreiTabsSelection
  private let labelVisibility: TanreiNavigationLabelVisibility
  private let accessibilityLabel: LocalizedStringKey
  private let onReselect: (@MainActor (AnyHashable) -> Void)?
  private let content: Content
  private let header: Header

  /// A rail whose selected destination's value `selection` holds, under a header.
  public init(
    selection: Binding<SelectionValue>, labelVisibility: TanreiNavigationLabelVisibility = .always, accessibilityLabel: LocalizedStringKey = "",
    onReselect: (@MainActor (SelectionValue) -> Void)? = nil, @ViewBuilder content: () -> Content, @ViewBuilder header: () -> Header
  ) {
    self.init(
      selection: TanreiTabsSelection(selection), labelVisibility: labelVisibility, accessibilityLabel: accessibilityLabel,
      onReselect: Self.erase(onReselect), content: content(), header: header())
  }

  /// A rail whose selected destination's value `selection` holds, under a header; `nil` selects none.
  public init(
    selection: Binding<SelectionValue?>, labelVisibility: TanreiNavigationLabelVisibility = .always, accessibilityLabel: LocalizedStringKey = "",
    onReselect: (@MainActor (SelectionValue) -> Void)? = nil, @ViewBuilder content: () -> Content, @ViewBuilder header: () -> Header
  ) {
    self.init(
      selection: TanreiTabsSelection(selection), labelVisibility: labelVisibility, accessibilityLabel: accessibilityLabel,
      onReselect: Self.erase(onReselect), content: content(), header: header())
  }

  init(
    selection: TanreiTabsSelection, labelVisibility: TanreiNavigationLabelVisibility, accessibilityLabel: LocalizedStringKey,
    onReselect: (@MainActor (AnyHashable) -> Void)?, content: Content, header: Header
  ) {
    self.selection = selection
    self.labelVisibility = labelVisibility
    self.accessibilityLabel = accessibilityLabel
    self.onReselect = onReselect
    self.content = content
    self.header = header
  }

  /// `onReselect` typed away: a value of another type than the rail's calls nothing.
  private static func erase(_ onReselect: (@MainActor (SelectionValue) -> Void)?) -> (@MainActor (AnyHashable) -> Void)? {
    guard let onReselect else { return nil }
    return { value in if let typed = value.base as? SelectionValue { onReselect(typed) } }
  }

  public var body: some View {
    let selection = selection
    let labelVisibility = labelVisibility
    let accessibilityLabel = accessibilityLabel
    let onReselect = onReselect
    let header = header
    _VariadicView.Tree(
      TanreiDestinationsRoot { entries in
        // The header's content, read as views: an empty header (none given, or a builder that produced nothing) takes no
        // room (NVR-12).
        _VariadicView.Tree(
          TanreiNavigationRailHeaderRoot { children in
            TanreiNavigationRailView(
              entries: entries, header: children, selection: selection, labelVisibility: labelVisibility, accessibilityLabel: accessibilityLabel,
              onReselect: onReselect)
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

extension TanreiNavigationRail where Header == EmptyView {
  /// A rail without a header, whose selected destination's value `selection` holds.
  public init(
    selection: Binding<SelectionValue>, labelVisibility: TanreiNavigationLabelVisibility = .always, accessibilityLabel: LocalizedStringKey = "",
    onReselect: (@MainActor (SelectionValue) -> Void)? = nil, @ViewBuilder content: () -> Content
  ) {
    self.init(selection: selection, labelVisibility: labelVisibility, accessibilityLabel: accessibilityLabel, onReselect: onReselect, content: content) {
      EmptyView()
    }
  }

  /// A rail without a header, whose selected destination's value `selection` holds; `nil` selects none.
  public init(
    selection: Binding<SelectionValue?>, labelVisibility: TanreiNavigationLabelVisibility = .always, accessibilityLabel: LocalizedStringKey = "",
    onReselect: (@MainActor (SelectionValue) -> Void)? = nil, @ViewBuilder content: () -> Content
  ) {
    self.init(selection: selection, labelVisibility: labelVisibility, accessibilityLabel: accessibilityLabel, onReselect: onReselect, content: content) {
      EmptyView()
    }
  }
}

/// One destination of a `TanreiNavigationRail` (the spec's item kind `destination`): an icon, a label under it (at most two
/// lines) and optionally a badge on the icon. The same arguments as `TanreiNavigationBarItem`, so a product that switches
/// between the bar and the rail keeps its destinations.
///
///     TanreiNavigationRailItem("Inbox", icon: "inbox", value: "inbox", badge: TanreiNavigationBadge(count: 3, label: "3 unread"))
///     TanreiNavigationRailItem("Profile", icon: .image(Image(systemName: "person")), value: Screen.profile)
///     TanreiNavigationRailItem("Starred", icon: "star", value: "starred").disabled(true)
///
/// - `title` is its label: drawn under the icon (see the rail's `labelVisibility`) and always its accessible name. An empty
///   one still renders and is reported in debug builds (NVR-21).
/// - `icon` is the name of a glyph of the design system's icon font, drawn outlined while unselected and filled while
///   selected (NVR-15); or, with the `TanreiItemIcon` overload, an image of the product's own (an SF Symbol, which does not
///   follow the selection: pass the `.fill` symbol for the selected destination yourself).
/// - `value` identifies it: the rail's `selection` selects the destination whose value equals it. Unique within the rail
///   (the first of two sharing one is the one it selects, and it is reported in debug builds, NVR-23).
/// - `badge` draws a Tanrei badge on the icon from its `count` and `label` (NVR-17); `nil` draws none.
/// - `disabled` follows `.disabled(_:)` on the item: it keeps its place, draws its disabled look, cannot be activated and
///   takes no focus (NVR-2, NVR-7).
///
/// An item draws nothing where it is written: the rail draws it from what it reads.
public struct TanreiNavigationRailItem: View {
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

// MARK: - The rail

/// Reads the header's content as views and hands them to `body`.
struct TanreiNavigationRailHeaderRoot<Region: View>: _VariadicView_UnaryViewRoot {
  let region: (_VariadicView.Children) -> Region

  func body(children: _VariadicView.Children) -> some View {
    region(children)
  }
}

/// The rail (NVR-11, NVR-12, NVR-18 … NVR-20, NVR-22): its container and end edge, the header, the column of destinations
/// that scrolls under it, the reports of NVR-3, NVR-18, NVR-21 and NVR-23, and the semantics of the tab bar.
struct TanreiNavigationRailView: View {
  let entries: [TanreiDestinationEntry]
  let header: _VariadicView.Children
  let selection: TanreiTabsSelection
  let labelVisibility: TanreiNavigationLabelVisibility
  let accessibilityLabel: LocalizedStringKey
  let onReselect: (@MainActor (AnyHashable) -> Void)?

  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors

  /// NVR-18: what a rail is made for.
  static let reportIds = TanreiDestinationReportIds(unknownValue: "NVR-3", emptyLabel: "NVR-21", duplicate: "NVR-23", count: "NVR-18", range: 3...7)

  var body: some View {
    let tokens = system.navigationRail
    let style = tokens.destinationStyle
    let problems = TanreiDestinationRules.problems(entries, selection: selection.value, ids: Self.reportIds)
    if !problems.isEmpty {
      let _ = problems.forEach { TanreiDiagnostics.report("Tanrei: a navigation rail: \($0)") }
    }
    let selected = TanreiDestinationRules.selectedIndex(entries, selection: selection.value)
    let hasHeader = !header.isEmpty
    let metrics = TanreiNavigationRailMetrics(tokens: tokens, hasHeader: hasHeader, measure: system.measure)
    VStack(spacing: .zero) {
      // NVR-12: the header's content stacked and centered, `container.padding-block` below the top; NVR-20: first in
      // reading and focus order, with its own semantics.
      if hasHeader {
        VStack(spacing: metrics.headerItemGap) {
          ForEach(header) { $0 }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, tokens.containerPaddingBlock)
      }
      // NVR-18: the destinations scroll when the rail is too short for them; the header stays.
      TanreiScrollRegion(axis: .vertical) {
        TanreiNavigationRailColumnLayout(minimumCellHeight: metrics.minimumCellHeight, cellPadding: metrics.cellPadding) {
          ForEach(entries.indices, id: \.self) { index in
            TanreiDestinationButton(
              entry: entries[index], style: style, isSelected: index == selected, labelShown: labelVisibility.showsLabel(selected: index == selected),
              index: index, count: entries.count, activate: { activate(index, selected: selected) })
          }
        }
        // NVR-16: under `.selected` the labels come and go and the destinations move with them, over the selection motion.
        .animation(style.selectionMotion(reduceMotion: reduceMotion), value: selected)
        .padding(.top, metrics.destinationsTop)
        .padding(.bottom, metrics.destinationsBottom)
        // NVR-20: a tab bar of destinations; each is a button with the selected trait.
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(.isTabBar)
      }
    }
    // NVR-11: `container.width` wide beside the leading inset (never scaled with the text, NVR-22), the full height.
    .frame(width: tokens.containerWidth)
    .frame(maxHeight: .infinity, alignment: .top)
    // NVR-11, NVR-19: the container in its color and elevation, reaching under the leading, top and bottom system insets.
    .background {
      TanreiElevationSurface(tokens.containerElevation, fill: colors[tokens.containerColor], cornerRadius: .zero)
        .ignoresSafeArea(.container, edges: [.leading, .vertical])
        .accessibilityHidden(true)
    }
    // NVR-11: the end edge (the left one right to left), over the cells, from the top of the screen to its bottom;
    // decorative.
    .overlay(alignment: .trailing) {
      Rectangle()
        .fill(colors[tokens.outlineColor])
        .frame(width: tokens.outlineWidth)
        .ignoresSafeArea(.container, edges: .vertical)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
    // NVR-20: the rail, named by its label, holding the header and the tab bar.
    .accessibilityElement(children: .contain)
    .modifier(TanreiNavigationRailName(label: accessibilityLabel))
  }

  /// NVR-1, NVR-2: the single route to `change` (the binding) and `reselect` — once per activation, never for a disabled
  /// destination.
  private func activate(_ index: Int, selected: Int?) {
    switch TanreiDestinationRules.activation(entries, activating: index, selected: selected) {
    case .change(let value): selection.write(value)
    case .reselect(let value): onReselect?(value)
    case nil: break
    }
  }
}

private struct TanreiNavigationRailName: ViewModifier {
  let label: LocalizedStringKey

  func body(content: Content) -> some View {
    if label == "" { content } else { content.accessibilityLabel(Text(label)) }
  }
}

/// The rail's geometry from its tokens (NVR-6, NVR-12).
struct TanreiNavigationRailMetrics: Equatable {
  /// NVR-6: no cell lower than `sys.target.touch`, with or without its label.
  let minimumCellHeight: CGFloat
  /// NVR-6: a cell is its destination with half of `container.gap` above and below it, so two destinations are
  /// `container.gap` apart (NVR-12).
  let cellPadding: CGFloat
  /// NVR-12: between two items of the header (`container.gap`, as between two destinations — the spec names no
  /// distance).
  let headerItemGap: CGFloat
  /// NVR-12: above the first cell — `header.gap` below the header, or `container.padding-block` below the top without one —
  /// less the half gap the cell carries above its destination.
  let destinationsTop: CGFloat
  /// Below the last cell: `container.padding-block` less the half gap the cell carries below its destination.
  let destinationsBottom: CGFloat

  init(tokens: TanreiNavigationRailTokens, hasHeader: Bool, measure: TanreiMeasure) {
    let half = tokens.containerGap / 2
    minimumCellHeight = measure.targetTouch
    cellPadding = tokens.containerGap
    headerItemGap = tokens.containerGap
    destinationsTop = max(.zero, (hasHeader ? tokens.headerGap : tokens.containerPaddingBlock) - half)
    destinationsBottom = max(.zero, tokens.containerPaddingBlock - half)
  }
}

/// NVR-6, NVR-12: the destinations in one column of cells, in reading order, each the column's full width and its
/// destination's height plus `cellPadding` (half above, half below), at least `minimumCellHeight`. The destination is
/// offered the whole cell, so the whole cell is its hit area and its item container and label are centered in it. A
/// destination grows with its label's lines (NVR-13, NVR-22). Stateless, so it is right on the first layout pass.
struct TanreiNavigationRailColumnLayout: Layout {
  let minimumCellHeight: CGFloat
  let cellPadding: CGFloat

  func cellHeight(_ subview: LayoutSubview, width: CGFloat) -> CGFloat {
    max(minimumCellHeight, subview.sizeThatFits(ProposedViewSize(width: width, height: nil)).height + cellPadding)
  }

  func width(proposal: ProposedViewSize, subviews: Subviews) -> CGFloat {
    if let width = proposal.width, width.isFinite { return width }
    return subviews.map { $0.sizeThatFits(.unspecified).width }.max() ?? .zero
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let width = width(proposal: proposal, subviews: subviews)
    return CGSize(width: width, height: subviews.reduce(.zero) { $0 + cellHeight($1, width: width) })
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    var y = bounds.minY
    for subview in subviews {
      let height = cellHeight(subview, width: bounds.width)
      subview.place(at: CGPoint(x: bounds.minX, y: y), anchor: .topLeading, proposal: ProposedViewSize(width: bounds.width, height: height))
      y += height
    }
  }
}

// MARK: - Token bindings

extension TanreiNavigationRailTokens {
  /// The rail's tokens as its destinations read them (NVR-3, NVR-4, NVR-7, NVR-9, NVR-13, NVR-15, NVR-16).
  var destinationStyle: TanreiDestinationStyle {
    let conditions = conditions
    let tokens = self
    return TanreiDestinationStyle(
      containerWidth: itemContainerWidth, containerHeight: itemContainerHeight, containerShape: itemContainerShape, gap: itemGap,
      // NVR-13: a label takes at most two lines in the rail's fixed width.
      iconSize: itemIconSize, labelTypescale: itemLabelTypescale, labelLineLimit: 2, feedbackDuration: motionFeedbackDuration,
      stateDuration: motionStateDuration, stateEasing: motionStateEasing, selectionDuration: motionSelectionDuration,
      selectionEasing: motionSelectionEasing,
      parts: { selected, state in
        // NVR-3: the selected parts for the selected destination, the unselected parts for every other. (A condition's
        // `item.state-layer.color` is not read: it is what the design system mixed into the state's container.)
        let parts = conditions[selected ? TanreiNavigationRailCondition.selected : .unselected][state: state]
        return TanreiDestinationParts(container: parts.itemContainerColor, icon: parts.itemIconColor, label: parts.itemLabelColor)
      },
      opacity: { tokens[state: $0]?.opacity })
  }
}
