import Observation
import SwiftUI

#if os(iOS)
import UIKit
#endif

// Spec: specs/app-bar.spec.json — tokens: TanreiAppBarTokens (comp.app-bar), read from the design system in the environment
// (`system.appBar`). Every design value in this file comes from a token; there are no literals.
//
// The app bar is a layout region, not a control: it draws its container in its condition (`flat` or `scrolled`:
// container color, elevation, bottom edge), lays out the product's own icon buttons and its title, and never takes focus
// itself (APB-11). It is placed with `.safeAreaInset(edge: .top)` in a `NavigationStack` whose system bar is hidden; its
// container reaches under the system insets and its content stays inside them (APB-10). A scrolling view is connected with
// `.tanreiAppBarScrollSource()`, applied to the scroll view AFTER the `.safeAreaInset` that holds the bar, so that the bar is
// inside what it marks (see `tanreiAppBarScrollSource()`).

/// Where the top row's title sits (APB-6): after the navigation button, or centered on the bar.
public enum TanreiAppBarTitleAlignment: String, CaseIterable, Sendable {
  /// After the navigation slot (or `title.inset` from the start edge), its text start-aligned. The default.
  case start
  /// Centered on the bar's full width, narrowed equally on both sides so that it never runs under the buttons.
  case center
}

/// Names the current screen at its top edge and holds the way back and the screen's most used actions — flat while the
/// content is at its top, set apart once content scrolls under it.
///
///     NavigationStack {
///       ScrollView { … }
///         .safeAreaInset(edge: .top, spacing: 0) {
///           TanreiAppBar("Inbox", size: .large) {
///             TanreiIconButton("Menu", action: openMenu) { Image(systemName: "line.3.horizontal") }
///           } actions: {
///             TanreiIconButton("Search", action: search) { Image(systemName: "magnifyingglass") }
///           }
///         }
///         .tanreiAppBarScrollSource()          // after the inset: the bar follows this scroll view
///         .toolbar(.hidden, for: .navigationBar)
///     }
///
/// - `title` is the screen's name and its heading for assistive technology (APB-12); empty draws no title and exposes no
///   heading (APB-13). `subtitle` is one line under it, read after it; empty draws none.
/// - `size` is a `TanreiAppBarSize`: `.small` (default), one row; `.large`, a larger title in a row of its own that
///   collapses into the top row as the content scrolls. Open: a size the design system adds is drawn from its
///   tokens — with a title row of its own when it is taller than small —, and one it does not have draws small's tokens and
///   is reported in debug builds (APB-14).
/// - `isScrolled`: `nil` (default) follows the scroll view marked `.tanreiAppBarScrollSource()` around the bar, or is flat
///   without one; a value overrides it. While scrolled, a large bar is drawn collapsed (APB-9).
/// - `navigation`: one `TanreiIconButton` at the start (back, menu, close). `actions`: up to three `TanreiIconButton`s at the
///   end, in reading order. The bar lays them out in cells of at least the minimum target and never restyles them
///   (APB-11); more than one navigation button or three actions still render and are reported in debug builds (APB-13).
///
/// On iOS the bar keeps the navigation controller's interactive back swipe working while the system bar is hidden.
public struct TanreiAppBar<Navigation: View, Actions: View>: View {
  private let title: String
  private let subtitle: String
  private let size: TanreiAppBarSize
  private let titleAlignment: TanreiAppBarTitleAlignment
  private let isScrolled: Bool?
  private let navigation: Navigation
  private let actions: Actions

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.tanreiAppBarScroll) private var connection
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  /// Connected only: the geometry the layout produced last, read back for the scrolled condition, the top row's fade and
  /// which title is exposed (APB-8, APB-9, APB-12).
  @State private var measured = TanreiAppBarMeasurement()

  /// An app bar with a navigation button and actions.
  public init(
    _ title: String,
    subtitle: String = "",
    size: TanreiAppBarSize = .small,
    titleAlignment: TanreiAppBarTitleAlignment = .start,
    isScrolled: Bool? = nil,
    @ViewBuilder navigation: () -> Navigation,
    @ViewBuilder actions: () -> Actions
  ) {
    self.title = title
    self.subtitle = subtitle
    self.size = size
    self.titleAlignment = titleAlignment
    self.isScrolled = isScrolled
    self.navigation = navigation()
    self.actions = actions()
  }

  public var body: some View {
    let tokens = theme.system.appBar
    let appearance = TanreiAppBarAppearance(tokens: tokens, size: size)
    let state = TanreiAppBarRules.state(
      isScrolled: isScrolled, offset: connection?.offset, expands: appearance.expands, hasTitle: !title.isEmpty, measured: measured)
    let condition = appearance.condition(scrolled: state.scrolled)
    let minimum = TanreiHitTarget.minimum(in: theme.system.measure)
    let motion = tokens.conditionMotion(reduceMotion: reduceMotion)
    let hasTitle = !title.isEmpty
    TanreiAppBarLayout(
      metrics: appearance.metrics, alignment: titleAlignment, expands: appearance.expands, isConnected: connection != nil, collapse: state.request
    ) {
      // APB-1, APB-2, APB-10: the container in its condition, reaching under the top and side system insets; APB-3: a change
      // of condition moves over the condition motion (none under Reduce Motion).
      TanreiElevationSurface(condition.containerElevation, fill: colors[condition.containerColor], cornerRadius: .zero)
        .ignoresSafeArea(.container, edges: [.top, .horizontal])
        .animation(motion, value: state.scrolled)
        .layoutValue(key: TanreiAppBarPartKey.self, value: .surface)
      // APB-4, APB-11: the product's icon buttons, each in a cell of at least the minimum target, never restyled.
      _VariadicView.Tree(TanreiAppBarSlot(part: .navigation, minimum: minimum)) { navigation }
      if hasTitle {
        // APB-5, APB-6: the top row's title block. A large bar shows it once its own title is covered, fading in with the
        // covered part (APB-8), and exposes it only once the expanded title is wholly covered (APB-12).
        titleBlock(appearance.topTitle, alignment: titleAlignment, exposed: state.exposesTopTitle)
          .opacity(state.topTitleOpacity)
          .layoutValue(key: TanreiAppBarPartKey.self, value: .title)
      }
      _VariadicView.Tree(TanreiAppBarSlot(part: .action, minimum: minimum)) { actions }
      // APB-9: an unconnected bar drawn collapsed has no title row at all (nothing clipped away is left in the tree). A
      // connected one keeps it, clipped down to nothing, so that its expanded height — the scroll view's inset — holds.
      if appearance.expands && hasTitle && !(connection == nil && state.request == .collapsed) {
        // APB-7, APB-8: the large title row, its block at the bar's bottom edge, clipped under the top row.
        titleBlock(appearance.expandedTitle, alignment: .start, exposed: state.exposesExpandedTitle, measuresTitle: connection != nil)
          .padding(.horizontal, tokens.titleInset)
          .padding(.bottom, tokens.containerPaddingBlockEnd)
          .fixedSize(horizontal: false, vertical: true)
          // The row is as tall as the layout says, down to nothing (a flexible frame without a minimum never gets smaller
          // than what it holds); the block keeps its height at the row's bottom and is clipped at its top (APB-8).
          .frame(minWidth: .zero, maxWidth: .infinity, minHeight: .zero, maxHeight: .infinity, alignment: .bottomLeading)
          .clipped()
          .modifier(TanreiAppBarMeasuring(isOn: connection != nil) { measured.region = $0 })
          .layoutValue(key: TanreiAppBarPartKey.self, value: .expanded)
      }
      // APB-1, APB-2: the bottom edge, inside the bar, over everything it draws.
      Rectangle()
        .fill(colors[condition.outlineColor])
        .frame(height: tokens.outlineWidth)
        .animation(motion, value: state.scrolled)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .layoutValue(key: TanreiAppBarPartKey.self, value: .outline)
    }
    .coordinateSpace(.named(TanreiAppBarMeasurement.space))
    .modifier(TanreiAppBarMeasuring(isOn: connection != nil) { measured.height = $0.height })
    #if os(iOS)
    // The system bar is hidden under this one: keep the navigation controller's edge swipe back working.
    .background { TanreiAppBarBackSwipe().frame(width: .zero, height: .zero).accessibilityHidden(true) }
    #endif
  }

  /// APB-5, APB-7, APB-12, APB-15: the title (a heading) and the subtitle read after it, each on one line truncated at the end.
  private func titleBlock(
    _ styles: TanreiAppBarTitleStyles, alignment: TanreiAppBarTitleAlignment, exposed: Bool, measuresTitle: Bool = false
  ) -> some View {
    let tokens = theme.system.appBar
    let horizontal: HorizontalAlignment = alignment == .center ? .center : .leading
    let text: TextAlignment = alignment == .center ? .center : .leading
    let frame: Alignment = alignment == .center ? .center : .leading
    return VStack(alignment: horizontal, spacing: .zero) {
      Text(verbatim: title)
        .lineLimit(1)
        .truncationMode(.tail)
        .multilineTextAlignment(text)
        .tanreiTextStyle(styles.title)
        .foregroundStyle(colors[tokens.titleColor])
        // APB-8: a connected bar reads back where its expanded title is (the covered part).
        .modifier(TanreiAppBarMeasuring(isOn: measuresTitle) { measured.expandedTitle = $0 })
        .frame(maxWidth: .infinity, alignment: frame)
        // APB-12: one element — the whole title, even when truncated —, a heading, hidden while the other copy is the one
        // exposed. One element first: a modifier on a text's line box (a layout of two views) would reach each view (as
        // TanreiList found).
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(verbatim: title))
        .accessibilityAddTraits([.isHeader, .isStaticText])
        .accessibilityHidden(!exposed)
      if !subtitle.isEmpty {
        Text(verbatim: subtitle)
          .lineLimit(1)
          .truncationMode(.tail)
          .multilineTextAlignment(text)
          .tanreiTextStyle(styles.subtitle)
          .foregroundStyle(colors[tokens.subtitleColor])
          .frame(maxWidth: .infinity, alignment: frame)
          // APB-12: plain text, read after the title.
          .accessibilityElement(children: .ignore)
          .accessibilityLabel(Text(verbatim: subtitle))
          .accessibilityAddTraits(.isStaticText)
          .accessibilityHidden(!exposed)
      }
    }
  }
}

extension TanreiAppBar where Actions == EmptyView {
  /// An app bar with a navigation button and no actions.
  public init(
    _ title: String, subtitle: String = "", size: TanreiAppBarSize = .small, titleAlignment: TanreiAppBarTitleAlignment = .start,
    isScrolled: Bool? = nil, @ViewBuilder navigation: () -> Navigation
  ) {
    self.init(title, subtitle: subtitle, size: size, titleAlignment: titleAlignment, isScrolled: isScrolled, navigation: navigation, actions: { EmptyView() })
  }
}

extension TanreiAppBar where Navigation == EmptyView {
  /// An app bar with actions and no navigation button: the title starts `title.inset` from the start edge. Name the closure
  /// (`TanreiAppBar("Inbox", actions: { … })`): a single trailing closure is the navigation slot.
  @_disfavoredOverload
  public init(
    _ title: String, subtitle: String = "", size: TanreiAppBarSize = .small, titleAlignment: TanreiAppBarTitleAlignment = .start,
    isScrolled: Bool? = nil, @ViewBuilder actions: () -> Actions
  ) {
    self.init(title, subtitle: subtitle, size: size, titleAlignment: titleAlignment, isScrolled: isScrolled, navigation: { EmptyView() }, actions: actions)
  }
}

extension TanreiAppBar where Navigation == EmptyView, Actions == EmptyView {
  /// An app bar with a title only.
  public init(
    _ title: String, subtitle: String = "", size: TanreiAppBarSize = .small, titleAlignment: TanreiAppBarTitleAlignment = .start,
    isScrolled: Bool? = nil
  ) {
    self.init(
      title, subtitle: subtitle, size: size, titleAlignment: titleAlignment, isScrolled: isScrolled, navigation: { EmptyView() }, actions: { EmptyView() })
  }
}

// MARK: - The scroll connection (APB-8, APB-9)

extension View {
  /// Connects this scroll view to the `TanreiAppBar` inside it (APB-8, APB-9): the bar takes its scrolled condition while
  /// content lies under it, and a large bar collapses one for one with the scroll and expands again as the content returns
  /// to its top. Apply it to the scroll view AFTER the `.safeAreaInset(edge: .top)` that holds the bar — the bar must be
  /// inside the view it marks —:
  ///
  ///     ScrollView { … }
  ///       .safeAreaInset(edge: .top, spacing: 0) { TanreiAppBar("Inbox") }
  ///       .tanreiAppBarScrollSource()
  ///
  /// A bar whose `isScrolled` is set does not take scrolled from it. Needs iOS 18 or macOS 15 (`onScrollGeometryChange`);
  /// before, nothing is connected and the bar draws what `isScrolled` says.
  public func tanreiAppBarScrollSource() -> some View {
    modifier(TanreiAppBarScrollSource())
  }
}

/// How far the connected content has scrolled from its top: what a bar inside the scroll source reads.
@MainActor
@Observable
final class TanreiAppBarScrollConnection {
  /// Points scrolled from the top; 0 at the top and while pulled past it.
  var offset: CGFloat = .zero

  /// The distance from a scroll view's geometry: its offset past its top inset (the safe area and the bar's inset).
  nonisolated static func distance(contentOffsetY: CGFloat, topInset: CGFloat) -> CGFloat {
    max(.zero, contentOffsetY + topInset)
  }
}

private struct TanreiAppBarScrollKey: EnvironmentKey {
  static var defaultValue: TanreiAppBarScrollConnection? { nil }
}

extension EnvironmentValues {
  /// The scroll view a `TanreiAppBar` follows, set by `tanreiAppBarScrollSource()`; `nil` without one.
  var tanreiAppBarScroll: TanreiAppBarScrollConnection? {
    get { self[TanreiAppBarScrollKey.self] }
    set { self[TanreiAppBarScrollKey.self] = newValue }
  }
}

private struct TanreiAppBarScrollSource: ViewModifier {
  @State private var connection = TanreiAppBarScrollConnection()

  func body(content: Content) -> some View {
    if #available(iOS 18, macOS 15, *) {
      content
        .onScrollGeometryChange(for: CGFloat.self) { geometry in
          TanreiAppBarScrollConnection.distance(contentOffsetY: geometry.contentOffset.y, topInset: geometry.contentInsets.top)
        } action: { _, distance in
          connection.offset = distance
        }
        .environment(\.tanreiAppBarScroll, connection)
    } else {
      content
    }
  }
}

// MARK: - Tokens and rules

/// The title and subtitle styles of one of the bar's title blocks.
struct TanreiAppBarTitleStyles: Equatable {
  let title: TanreiTextStyle
  let subtitle: TanreiTextStyle
}

/// The token values the layout reads (APB-4, APB-7).
struct TanreiAppBarMetrics: Equatable {
  /// The top row's minimum height: small's `container.height` (a large bar's top row is always the small height).
  let rowHeight: CGFloat
  /// The size's `container.height`: the bar's minimum height, expanded.
  let expandedHeight: CGFloat
  let paddingInline: CGFloat
  let gap: CGFloat
  let actionsGap: CGFloat
  let titleInset: CGFloat
}

/// Props → tokens, pure (APB-1, APB-2, APB-5, APB-7, APB-14).
struct TanreiAppBarAppearance {
  let tokens: TanreiAppBarTokens
  let size: TanreiAppBarSize
  /// The size's tokens; the default's for a size this system does not have (reported in debug builds, APB-14).
  let sizeTokens: TanreiAppBarSizeTokens

  init(tokens: TanreiAppBarTokens, size: TanreiAppBarSize) {
    self.tokens = tokens
    self.size = size
    sizeTokens = tokens.sizes[size]
  }

  /// APB-7: a size taller than small has a title row of its own (large, and a size a layer adds as tall) — read from the
  /// tokens, never from the size's name.
  var expands: Bool { sizeTokens.containerHeight > tokens.sizes.small.containerHeight }

  /// APB-5: the top row's title and subtitle are always small's.
  var topTitle: TanreiAppBarTitleStyles {
    TanreiAppBarTitleStyles(title: tokens.sizes.small.titleTypescale, subtitle: tokens.sizes.small.subtitleTypescale)
  }

  /// APB-7: the expanded row's, in the size's own styles.
  var expandedTitle: TanreiAppBarTitleStyles {
    TanreiAppBarTitleStyles(title: sizeTokens.titleTypescale, subtitle: sizeTokens.subtitleTypescale)
  }

  /// APB-1, APB-2: the condition's container color, elevation and bottom-edge color.
  func condition(scrolled: Bool) -> TanreiAppBarConditionTokens {
    scrolled ? tokens.conditions.scrolled : tokens.conditions.flat
  }

  var metrics: TanreiAppBarMetrics {
    TanreiAppBarMetrics(
      rowHeight: tokens.sizes.small.containerHeight, expandedHeight: sizeTokens.containerHeight, paddingInline: tokens.containerPaddingInline,
      gap: tokens.containerGap, actionsGap: tokens.actionsGap, titleInset: tokens.titleInset)
  }
}

extension TanreiAppBarTokens {
  /// APB-3: a change of condition moves over `motion.condition-*`; at once under Reduce Motion.
  func conditionMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionConditionDuration, easing: motionConditionEasing, reduceMotion: reduceMotion)
  }
}

/// How far the layout draws a bar with a title row of its own collapsed.
enum TanreiAppBarCollapseRequest: Equatable {
  /// Expanded: nothing connected and not scrolled, or a bar without a title row of its own.
  case expanded
  /// Fully collapsed: scrolled (APB-9).
  case collapsed
  /// Following a connected scroll view: collapsed by the distance scrolled, up to the whole title row (APB-8).
  case following(CGFloat)
}

/// What the layout produced last, for a connected bar (APB-8, APB-9, APB-12), in the bar's coordinate space: the bar's
/// height (constant while connected: its expanded height), the expanded title row's frame (it starts under the top row) and
/// the expanded title's frame (it moves up with the bottom edge; clipping does not change it).
struct TanreiAppBarMeasurement: Equatable {
  static let space = "tanrei.app-bar"

  var height: CGFloat?
  var region: CGRect?
  var expandedTitle: CGRect?

  /// How far the bar can collapse: its expanded height less its top row. `nil` until measured.
  var limit: CGFloat? {
    guard let height, let region else { return nil }
    return max(.zero, height - region.minY)
  }

  /// The part of the expanded title that lies under the top row, 0 to 1 (APB-8). `nil` until measured.
  var coveredPart: CGFloat? {
    guard let region, let expandedTitle, expandedTitle.height > .zero else { return nil }
    return min(1, max(.zero, (region.minY - expandedTitle.minY) / expandedTitle.height))
  }
}

/// Reports a view's frame in the bar's coordinate space while `isOn` (a connected bar only).
private struct TanreiAppBarMeasuring: ViewModifier {
  let isOn: Bool
  let report: (CGRect) -> Void

  func body(content: Content) -> some View {
    if isOn {
      content.onGeometryChange(for: CGRect.self, of: { $0.frame(in: .named(TanreiAppBarMeasurement.space)) }, action: report)
    } else {
      content
    }
  }
}

/// The bar's condition and collapse, pure (APB-8, APB-9, APB-12).
struct TanreiAppBarState: Equatable {
  /// The scrolled condition (APB-1, APB-2).
  var scrolled: Bool
  /// How the layout collapses a bar with a title row of its own.
  var request: TanreiAppBarCollapseRequest
  /// The part of the expanded title covered by the top row, 0 to 1; 1 for a bar without a title row of its own.
  var covered: CGFloat

  /// APB-8: the top row's title is invisible while the expanded title is wholly visible and fades in linearly with the part
  /// of it that is covered.
  var topTitleOpacity: Double { Double(covered) }
  /// APB-12: the expanded title is exposed while any of it is visible…
  var exposesExpandedTitle: Bool { covered < 1 }
  /// …and the top row's once it is wholly covered.
  var exposesTopTitle: Bool { !exposesExpandedTitle }
}

enum TanreiAppBarRules {
  /// APB-13: the most actions a bar holds before the rest belong in an overflow menu — the spec's number, not a design value.
  static let maximumActions = 3
  /// A scroll distance within half a point of a limit is at it.
  static let slack: CGFloat = 0.5

  /// APB-8, APB-9: `isScrolled` overrides; otherwise a connected view sets it — true once content lies under the bar, for a
  /// bar with a title row of its own only once it has collapsed fully —, and without one it is false. While scrolled a
  /// large bar is drawn collapsed; connected, it collapses one for one with the scroll; otherwise it stays expanded.
  static func state(isScrolled: Bool?, offset: CGFloat?, expands: Bool, hasTitle: Bool, measured: TanreiAppBarMeasurement) -> TanreiAppBarState {
    let limit: CGFloat? = expands ? measured.limit : .zero
    let followed: Bool = {
      guard let offset, let limit else { return false }
      return offset > limit + slack
    }()
    let scrolled = isScrolled ?? followed
    guard expands else { return TanreiAppBarState(scrolled: scrolled, request: .expanded, covered: 1) }
    if scrolled { return TanreiAppBarState(scrolled: true, request: .collapsed, covered: 1) }
    guard let offset else { return TanreiAppBarState(scrolled: false, request: .expanded, covered: .zero) }
    // Connected: what lies under the top row, measured from the layout's last pass (the fade may trail it by a frame).
    let covered = hasTitle ? (measured.coveredPart ?? .zero) : .zero
    return TanreiAppBarState(scrolled: false, request: .following(offset), covered: covered)
  }

  /// APB-13: what is reported about the items, in debug builds.
  static func problems(navigation: Int, actions: Int) -> [String] {
    var problems: [String] = []
    if navigation > 1 {
      problems.append("an app bar holds \(navigation) navigation buttons; a bar has one navigation button (APB-13)")
    }
    if actions > maximumActions {
      problems.append("an app bar holds \(actions) actions; more than \(maximumActions) belong in an overflow menu (APB-13)")
    }
    return problems
  }
}

// MARK: - Items

/// Which part of the bar a subview is.
enum TanreiAppBarPart: Sendable {
  case surface
  case navigation
  case title
  case action
  case expanded
  case outline
}

struct TanreiAppBarPartKey: LayoutValueKey {
  static let defaultValue = TanreiAppBarPart.action
}

/// A slot's items, each in a cell of at least the minimum target (APB-4, APB-11); too many are reported (APB-13).
private struct TanreiAppBarSlot: _VariadicView_MultiViewRoot {
  let part: TanreiAppBarPart
  let minimum: CGFloat

  func body(children: _VariadicView.Children) -> some View {
    let problems = TanreiAppBarRules.problems(navigation: part == .navigation ? children.count : .zero, actions: part == .action ? children.count : .zero)
    problems.forEach { TanreiDiagnostics.report("Tanrei: \($0)") }
    return ForEach(children) { child in
      child
        .frame(minWidth: minimum, minHeight: minimum)
        .layoutValue(key: TanreiAppBarPartKey.self, value: part)
    }
  }
}

// MARK: - Layout (APB-4, APB-6, APB-7, APB-8, APB-15)

/// The frames of the bar's parts, pure: what `TanreiAppBarLayout` places, and what the tests check.
struct TanreiAppBarArrangement: Equatable {
  var size: CGSize
  /// How tall the bar is drawn: the container and its bottom edge. Less than `size.height` while a connected bar collapses.
  var visibleHeight: CGFloat
  var topRow: CGFloat
  var navigation: [CGRect]
  var title: CGRect?
  var actions: [CGRect]
  var expanded: CGRect?
  /// The expanded title row's natural height (block and bottom padding) — how far a bar can collapse is the bar's expanded
  /// height less its top row.
  var limit: CGFloat

  /// Lays out a bar `width` wide.
  /// - `navigation` / `actions`: each item cell's size. `title(width)`: the top row's title block at that width (`nil`: no
  ///   title). `expanded(width)`: the expanded row's natural height at that width (`nil`: none).
  static func arrange(
    width: CGFloat, metrics: TanreiAppBarMetrics, alignment: TanreiAppBarTitleAlignment, expands: Bool, isConnected: Bool,
    collapse: TanreiAppBarCollapseRequest, navigation: [CGSize], actions: [CGSize], title: ((CGFloat) -> CGSize)?,
    expanded: ((CGFloat) -> CGFloat)?
  ) -> TanreiAppBarArrangement {
    func run(_ sizes: [CGSize], gap: CGFloat) -> CGFloat {
      sizes.isEmpty ? .zero : sizes.reduce(.zero) { $0 + $1.width } + gap * CGFloat(sizes.count - 1)
    }
    let navigationWidth = run(navigation, gap: metrics.actionsGap)
    let actionsWidth = run(actions, gap: metrics.actionsGap)
    // APB-4: the title block after the navigation slot (or at the inset), up to the actions (or the inset from the end).
    let start = navigation.isEmpty ? metrics.titleInset : metrics.paddingInline + navigationWidth + metrics.gap
    let end = actions.isEmpty ? width - metrics.titleInset : width - metrics.paddingInline - actionsWidth - metrics.gap
    let mid = width / 2
    // APB-6: centered on the full width, narrowed equally on both sides so that it never runs under either slot.
    let available: CGFloat
    switch alignment {
    case .start: available = max(.zero, end - start)
    case .center: available = max(.zero, 2 * min(mid - start, end - mid))
    }
    let titleSize = title?(available)
    // APB-4, APB-15: at least small's height, growing with what it holds.
    let topRow = ([metrics.rowHeight, titleSize?.height ?? .zero] + navigation.map(\.height) + actions.map(\.height)).max() ?? metrics.rowHeight

    // APB-7: the expanded row under the top row; its block ends padding-block-end above the bottom edge.
    let block = expands ? (expanded?(max(.zero, width)) ?? .zero) : .zero
    let expandedHeight = expands ? max(metrics.expandedHeight, topRow + block) : max(metrics.expandedHeight, topRow)
    let limit = expands ? expandedHeight - topRow : .zero
    // APB-8, APB-9: collapsed by the scroll, one for one, or wholly while scrolled.
    let collapsed: CGFloat
    switch collapse {
    case .expanded: collapsed = .zero
    case .collapsed: collapsed = limit
    case .following(let offset): collapsed = min(limit, max(.zero, offset))
    }
    let visible = expandedHeight - collapsed
    // Connected, the bar keeps its expanded height in the layout, so that the scroll view's inset — and the distance it
    // reports — does not move while it collapses; the content scrolls up under the part it no longer draws.
    let height = isConnected && expands ? expandedHeight : visible

    var x = metrics.paddingInline
    var navigationFrames: [CGRect] = []
    for item in navigation {
      navigationFrames.append(CGRect(x: x, y: (topRow - item.height) / 2, width: item.width, height: item.height))
      x += item.width + metrics.actionsGap
    }
    x = width - metrics.paddingInline - actionsWidth
    var actionFrames: [CGRect] = []
    for item in actions {
      actionFrames.append(CGRect(x: x, y: (topRow - item.height) / 2, width: item.width, height: item.height))
      x += item.width + metrics.actionsGap
    }
    let titleFrame = titleSize.map { size -> CGRect in
      let titleX = alignment == .center ? mid - available / 2 : start
      return CGRect(x: titleX, y: (topRow - size.height) / 2, width: available, height: size.height)
    }
    let expandedFrame = expands && expanded != nil ? CGRect(x: .zero, y: topRow, width: width, height: max(.zero, visible - topRow)) : nil
    return TanreiAppBarArrangement(
      size: CGSize(width: width, height: height), visibleHeight: visible, topRow: topRow, navigation: navigationFrames, title: titleFrame,
      actions: actionFrames, expanded: expandedFrame, limit: limit)
  }
}

/// The bar's layout, stateless (right on the first pass, which snapshots draw): the full width it is offered; the surface and
/// the bottom edge over the drawn height; the top row; the expanded row.
struct TanreiAppBarLayout: Layout {
  let metrics: TanreiAppBarMetrics
  let alignment: TanreiAppBarTitleAlignment
  let expands: Bool
  let isConnected: Bool
  let collapse: TanreiAppBarCollapseRequest

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    arrange(width: proposal.width, subviews: subviews).size
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    let arrangement = arrange(width: bounds.width, subviews: subviews)
    var navigation = arrangement.navigation.makeIterator()
    var actions = arrangement.actions.makeIterator()
    func place(_ subview: LayoutSubview, _ frame: CGRect) {
      subview.place(
        at: CGPoint(x: bounds.minX + frame.minX, y: bounds.minY + frame.minY), anchor: .topLeading,
        proposal: ProposedViewSize(width: frame.width, height: frame.height))
    }
    for subview in subviews {
      switch subview[TanreiAppBarPartKey.self] {
      case .surface:
        place(subview, CGRect(x: .zero, y: .zero, width: bounds.width, height: arrangement.visibleHeight))
      case .outline:
        let height = subview.sizeThatFits(ProposedViewSize(width: bounds.width, height: nil)).height
        place(subview, CGRect(x: .zero, y: arrangement.visibleHeight - height, width: bounds.width, height: height))
      case .navigation:
        if let frame = navigation.next() { place(subview, frame) }
      case .action:
        if let frame = actions.next() { place(subview, frame) }
      case .title:
        if let frame = arrangement.title { place(subview, frame) }
      case .expanded:
        if let frame = arrangement.expanded { place(subview, frame) }
      }
    }
  }

  private func arrange(width proposed: CGFloat?, subviews: Subviews) -> TanreiAppBarArrangement {
    // APB-4: the full width of its parent. Asked for an ideal, the least that holds its items and insets.
    let parts = subviews.map { $0[TanreiAppBarPartKey.self] }
    func sizes(_ part: TanreiAppBarPart) -> [CGSize] {
      zip(subviews, parts).filter { $0.1 == part }.map { $0.0.sizeThatFits(.unspecified) }
    }
    let navigation = sizes(.navigation)
    let actions = sizes(.action)
    let titleView = zip(subviews, parts).first { $0.1 == .title }?.0
    let expandedView = zip(subviews, parts).first { $0.1 == .expanded }?.0
    let width = proposed.flatMap { $0.isFinite ? $0 : nil } ?? idealWidth(navigation: navigation, actions: actions)
    return TanreiAppBarArrangement.arrange(
      width: width, metrics: metrics, alignment: alignment, expands: expands, isConnected: isConnected, collapse: collapse, navigation: navigation,
      actions: actions,
      title: titleView.map { view in { view.sizeThatFits(ProposedViewSize(width: $0, height: nil)) } },
      expanded: expandedView.map { view in { view.sizeThatFits(ProposedViewSize(width: $0, height: nil)).height } })
  }

  private func idealWidth(navigation: [CGSize], actions: [CGSize]) -> CGFloat {
    func run(_ sizes: [CGSize]) -> CGFloat {
      sizes.isEmpty ? .zero : sizes.reduce(.zero) { $0 + $1.width } + metrics.actionsGap * CGFloat(sizes.count - 1)
    }
    let start = navigation.isEmpty ? metrics.titleInset : metrics.paddingInline + run(navigation) + metrics.gap
    let end = actions.isEmpty ? metrics.titleInset : metrics.paddingInline + run(actions) + metrics.gap
    return start + end
  }
}

// MARK: - The back swipe (iOS)

#if os(iOS)
/// Keeps the enclosing navigation controller's interactive pop gesture working while its bar is hidden under a Tanrei app
/// bar: UIKit's own delegate refuses the edge swipe once the navigation bar is hidden. The swipe begins whenever a screen
/// lies under the top one and no transition runs; with the system bar shown, UIKit's delegate decides as before.
private struct TanreiAppBarBackSwipe: UIViewRepresentable {
  func makeUIView(context: Context) -> Probe { Probe() }
  func updateUIView(_ uiView: Probe, context: Context) {}

  final class Probe: UIView {
    override func didMoveToWindow() {
      super.didMoveToWindow()
      guard window != nil else { return }
      // After this pass: the hosting controller is in the navigation controller by then.
      Task { @MainActor [weak self] in self?.install() }
    }

    private func install() {
      var responder: UIResponder? = self
      while let current = responder, !(current is UIViewController) { responder = current.next }
      guard let controller = responder as? UIViewController, let navigation = controller.navigationController else { return }
      TanreiAppBarBackSwipeDelegate.install(on: navigation)
    }
  }
}

@MainActor
final class TanreiAppBarBackSwipeDelegate: NSObject, UIGestureRecognizerDelegate {
  private static let installed = NSMapTable<UINavigationController, TanreiAppBarBackSwipeDelegate>.weakToStrongObjects()

  private weak var navigation: UINavigationController?
  private weak var original: UIGestureRecognizerDelegate?

  private init(navigation: UINavigationController, original: UIGestureRecognizerDelegate?) {
    self.navigation = navigation
    self.original = original
  }

  static func install(on navigation: UINavigationController) {
    guard let gesture = navigation.interactivePopGestureRecognizer else { return }
    if let delegate = installed.object(forKey: navigation) {
      // SwiftUI may set its own again: take it back, keeping it as the one that decides while the bar is shown.
      if gesture.delegate !== delegate {
        delegate.original = gesture.delegate
        gesture.delegate = delegate
      }
      return
    }
    let delegate = TanreiAppBarBackSwipeDelegate(navigation: navigation, original: gesture.delegate)
    installed.setObject(delegate, forKey: navigation)
    gesture.delegate = delegate
    gesture.isEnabled = true
  }

  func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
    guard let navigation else { return false }
    if !navigation.isNavigationBarHidden, let original {
      return original.gestureRecognizerShouldBegin?(gestureRecognizer) ?? true
    }
    return navigation.viewControllers.count > 1 && navigation.transitionCoordinator == nil
  }

  func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool {
    original?.gestureRecognizer?(gestureRecognizer, shouldRecognizeSimultaneouslyWith: other) ?? false
  }

  func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldBeRequiredToFailBy other: UIGestureRecognizer) -> Bool {
    // A scroll view's pan waits for the edge swipe, as under the system bar.
    other is UIPanGestureRecognizer && !(other is UIScreenEdgePanGestureRecognizer)
  }
}
#endif
