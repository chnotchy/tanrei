import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/app-bar.spec.json. Each behavior id (APB-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file. The fixtures draw the bar 360 wide with no system insets over the page's surface,
// each item a standard medium TanreiIconButton in its slot (`platforms.swiftui.items`). A fixture with `scrolled` passes
// `isScrolled: true`: nothing is connected, so a large bar is drawn collapsed (APB-9). The collapse itself is tested through a
// connected scroll view in a hosted window, not a snapshot.
//
// Icons: baselines render with `Snapshot.theme` (`fontFamilyPolicy: .system`), under which a `TanreiIconGlyph` draws nothing,
// so a fixture's glyph name draws the SF Symbol a product would pass for it (`TanreiAppBarFixtures.symbols`).

private let suiteName = "TanreiAppBarTests"

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

/// The size of a render without the snapshot inset, in points.
@MainActor
private func visualSize(_ bitmap: Bitmap) -> CGSize {
  CGSize(width: CGFloat(bitmap.width) / Snapshot.scale - 2 * Snapshot.inset, height: CGFloat(bitmap.height) / Snapshot.scale - 2 * Snapshot.inset)
}

private let light = TanreiSystem.tanrei.colors.light
private let tokens = TanreiSystem.tanrei.appBar
private let width: CGFloat = 360

/// The minimum target on the platform the tests run on (the pointer's on macOS).
@MainActor
private var target: CGFloat { TanreiHitTarget.minimum(in: TanreiSystem.tanrei.measure) }

private let metrics = TanreiAppBarAppearance(tokens: tokens, size: .small).metrics
private let largeMetrics = TanreiAppBarAppearance(tokens: tokens, size: .large).metrics

/// A square of `side` in `color`: an item whose extent a render shows.
@MainActor
private func block(_ color: Color, _ side: CGFloat = 20) -> some View {
  color.frame(width: side, height: side)
}

/// A system whose conditions are told apart by their container colors (flat: surface, scrolled: primary) and whose bottom
/// edge is drawn in error while scrolled, 4 thick.
private func marked() -> TanreiSystem {
  var system = TanreiSystem.tanrei
  system.appBar.conditions.scrolled.containerColor = .role(.primary)
  system.appBar.conditions.scrolled.outlineColor = .role(.error)
  system.appBar.outlineWidth = 4
  return system
}

// MARK: - The rules (APB-8, APB-9, APB-12, APB-13)

@MainActor
@Suite("TanreiAppBar rules")
struct TanreiAppBarRulesTests {
  private let rest = TanreiAppBarMeasurement()

  /// A connected large bar's last layout: 112 high, its title row from 56, its expanded title 40 high at `titleY`.
  private func measured(titleY: CGFloat) -> TanreiAppBarMeasurement {
    TanreiAppBarMeasurement(height: 112, region: CGRect(x: 0, y: 56, width: 360, height: 56), expandedTitle: CGRect(x: 16, y: titleY, width: 100, height: 40))
  }

  /// APB-9 — without a connection a small bar is what `isScrolled` says (false for nil); APB-2 — true selects the scrolled
  /// condition.
  @Test("APB-9 APB-2 without a connection, scrolled is what isScrolled says")
  func unconnectedSmall() {
    #expect(!TanreiAppBarRules.state(isScrolled: nil, offset: nil, expands: false, hasTitle: true, measured: rest).scrolled)
    #expect(!TanreiAppBarRules.state(isScrolled: false, offset: nil, expands: false, hasTitle: true, measured: rest).scrolled)
    let scrolled = TanreiAppBarRules.state(isScrolled: true, offset: nil, expands: false, hasTitle: true, measured: rest)
    #expect(scrolled.scrolled && scrolled.request == .expanded && scrolled.covered == 1)
  }

  /// APB-9 — connected, a small bar is scrolled while any content lies under it and not at the top (half a point of slack).
  @Test("APB-9 connected, a small bar is scrolled once content lies under it")
  func connectedSmall() {
    #expect(!TanreiAppBarRules.state(isScrolled: nil, offset: 0, expands: false, hasTitle: true, measured: rest).scrolled)
    #expect(!TanreiAppBarRules.state(isScrolled: nil, offset: 0.4, expands: false, hasTitle: true, measured: rest).scrolled)
    #expect(TanreiAppBarRules.state(isScrolled: nil, offset: 12, expands: false, hasTitle: true, measured: rest).scrolled)
    // A value overrides the connection.
    #expect(!TanreiAppBarRules.state(isScrolled: false, offset: 300, expands: false, hasTitle: true, measured: rest).scrolled)
    #expect(TanreiAppBarRules.state(isScrolled: true, offset: 0, expands: false, hasTitle: true, measured: rest).scrolled)
  }

  /// APB-9 — a large bar: without a connection it stays expanded while scrolled is false and is drawn collapsed while true;
  /// connected, it follows the scroll (APB-8) and is scrolled only once it has fully collapsed.
  @Test("APB-9 APB-8 a large bar collapses while scrolled, follows a connection, and is scrolled only once collapsed")
  func large() {
    let expanded = TanreiAppBarRules.state(isScrolled: nil, offset: nil, expands: true, hasTitle: true, measured: rest)
    #expect(expanded == TanreiAppBarState(scrolled: false, request: .expanded, covered: 0))
    let collapsed = TanreiAppBarRules.state(isScrolled: true, offset: nil, expands: true, hasTitle: true, measured: rest)
    #expect(collapsed == TanreiAppBarState(scrolled: true, request: .collapsed, covered: 1))
    // Connected, before the first layout: follows, not scrolled.
    #expect(TanreiAppBarRules.state(isScrolled: nil, offset: 30, expands: true, hasTitle: true, measured: rest).request == .following(30))
    #expect(!TanreiAppBarRules.state(isScrolled: nil, offset: 300, expands: true, hasTitle: true, measured: rest).scrolled)
    // Measured (limit 56): scrolled only past the collapse.
    let m = measured(titleY: 60)
    #expect(!TanreiAppBarRules.state(isScrolled: nil, offset: 56, expands: true, hasTitle: true, measured: m).scrolled)
    #expect(TanreiAppBarRules.state(isScrolled: nil, offset: 57, expands: true, hasTitle: true, measured: m).request == .collapsed)
  }

  /// APB-8 — the top row's title fades in linearly with the part of the expanded title that is covered; APB-12 — the
  /// expanded title is exposed while any of it is visible, the top row's once it is wholly covered.
  @Test("APB-8 APB-12 the top title fades in with the covered part, and one title is exposed at a time")
  func handOver() {
    func state(_ titleY: CGFloat) -> TanreiAppBarState {
      TanreiAppBarRules.state(isScrolled: nil, offset: 10, expands: true, hasTitle: true, measured: measured(titleY: titleY))
    }
    #expect(state(60).covered == 0 && state(60).topTitleOpacity == 0 && state(60).exposesExpandedTitle && !state(60).exposesTopTitle)
    #expect(state(46).covered == 0.25 && state(46).topTitleOpacity == 0.25 && state(46).exposesExpandedTitle)
    #expect(state(16).covered == 1 && !state(16).exposesExpandedTitle && state(16).exposesTopTitle)
    // A small bar has one title, exposed and opaque.
    let small = TanreiAppBarRules.state(isScrolled: nil, offset: 10, expands: false, hasTitle: true, measured: rest)
    #expect(small.exposesTopTitle && small.topTitleOpacity == 1)
  }

  /// APB-13 — more than one navigation button or three actions is reported, not refused.
  @Test("APB-13 extra navigation buttons and actions are reported")
  func problems() {
    #expect(TanreiAppBarRules.problems(navigation: 1, actions: 3).isEmpty)
    #expect(TanreiAppBarRules.problems(navigation: 0, actions: 0).isEmpty)
    let reports = TanreiAppBarRules.problems(navigation: 2, actions: 4)
    #expect(reports.count == 2 && reports[0].contains("one navigation button") && reports[1].contains("overflow menu"))
  }
}

// MARK: - The layout (APB-4, APB-6, APB-7, APB-8, APB-15)

@MainActor
@Suite("TanreiAppBar layout")
struct TanreiAppBarLayoutTests {
  private let cell = CGSize(width: 44, height: 44)

  private func arrange(
    alignment: TanreiAppBarTitleAlignment = .start, navigation: Int = 1, actions: Int = 2, title: CGSize? = CGSize(width: 60, height: 26),
    expands: Bool = false, connected: Bool = false, collapse: TanreiAppBarCollapseRequest = .expanded, block: CGFloat? = nil
  ) -> TanreiAppBarArrangement {
    TanreiAppBarArrangement.arrange(
      width: width, metrics: expands ? largeMetrics : metrics, alignment: alignment, expands: expands, isConnected: connected, collapse: collapse,
      navigation: Array(repeating: cell, count: navigation), actions: Array(repeating: cell, count: actions),
      title: title.map { size in { CGSize(width: min(size.width, $0), height: size.height) } }, expanded: block.map { value in { _ in value } })
  }

  /// APB-4 — the full width; a top row of small's height; the navigation item padding-inline from the start, the actions
  /// padding-inline from the end, container.gap to the title block and actions.gap between two actions, all centered in the row.
  @Test("APB-4 the top row: items at the insets, gaps between, centered")
  func row() {
    let a = arrange()
    #expect(a.size == CGSize(width: width, height: tokens.sizes.small.containerHeight))
    #expect(a.navigation == [CGRect(x: tokens.containerPaddingInline, y: 6, width: 44, height: 44)])
    #expect(a.actions.last!.maxX == width - tokens.containerPaddingInline)
    #expect(a.actions[1].minX - a.actions[0].maxX == tokens.actionsGap)
    #expect(a.title!.minX == a.navigation[0].maxX + tokens.containerGap)
    #expect(a.title!.maxX == a.actions[0].minX - tokens.containerGap)
    #expect(a.title!.midY == a.topRow / 2 && a.navigation[0].midY == a.topRow / 2)
  }

  /// APB-4 — without a navigation item the title block starts title.inset from the start edge; without actions it ends
  /// title.inset from the end edge.
  @Test("APB-4 without items, the title block is inset by title.inset")
  func insets() {
    let bare = arrange(navigation: 0, actions: 0)
    #expect(bare.title!.minX == tokens.titleInset && bare.title!.maxX == width - tokens.titleInset)
  }

  /// APB-6 — center: the title block is centered on the full width and narrowed equally on both sides so that it never runs
  /// under either slot.
  @Test("APB-6 a centered title block is centered on the bar and clear of both slots")
  func center() {
    let a = arrange(alignment: .center)
    #expect(a.title!.midX == width / 2)
    #expect(a.title!.minX >= a.navigation[0].maxX + tokens.containerGap && a.title!.maxX <= a.actions[0].minX - tokens.containerGap)
    // The side with more beside it decides: two actions narrow it equally on the navigation's side too.
    #expect(a.title!.maxX == a.actions[0].minX - tokens.containerGap)
    #expect(arrange(alignment: .center, navigation: 0, actions: 0).title!.width == width - 2 * tokens.titleInset)
  }

  /// APB-7 — a large bar is at least large's height; its title row lies under the top row; APB-15 — a block taller than that
  /// grows the bar (its heights are minimums).
  @Test("APB-7 APB-15 a large bar's expanded row and minimum height")
  func largeBar() {
    let a = arrange(expands: true, block: 52)
    #expect(a.size.height == tokens.sizes.large.containerHeight && a.topRow == tokens.sizes.small.containerHeight)
    #expect(a.expanded == CGRect(x: 0, y: a.topRow, width: width, height: a.size.height - a.topRow))
    #expect(a.limit == tokens.sizes.large.containerHeight - tokens.sizes.small.containerHeight)
    let tall = arrange(expands: true, block: 100)
    #expect(tall.size.height == tall.topRow + 100 && tall.limit == 100)
    // APB-15: a taller title block grows the top row.
    #expect(arrange(title: CGSize(width: 60, height: 80)).topRow == 80)
  }

  /// APB-8 — connected, the bar is drawn shorter by the distance scrolled, one for one, down to its top row; it keeps its
  /// expanded height in the layout. APB-9 — collapsed while scrolled; not connected, it is as tall as it is drawn.
  @Test("APB-8 APB-9 the collapse: one for one with the scroll, down to the top row")
  func collapse() {
    let expanded = tokens.sizes.large.containerHeight
    let following = arrange(expands: true, connected: true, collapse: .following(20), block: 52)
    #expect(following.size.height == expanded && following.visibleHeight == expanded - 20)
    #expect(following.expanded!.height == expanded - 20 - following.topRow)
    let past = arrange(expands: true, connected: true, collapse: .following(500), block: 52)
    #expect(past.visibleHeight == past.topRow && past.expanded!.height == 0)
    #expect(arrange(expands: true, connected: true, collapse: .following(-30), block: 52).visibleHeight == expanded)
    let collapsed = arrange(expands: true, collapse: .collapsed, block: 52)
    #expect(collapsed.size.height == collapsed.topRow && collapsed.visibleHeight == collapsed.topRow)
  }
}

// MARK: - Token bindings (APB-1, APB-2, APB-3, APB-5, APB-7, APB-14)

@MainActor
@Suite("TanreiAppBar token bindings")
struct TanreiAppBarTokenTests {
  /// APB-1, APB-2 — each condition binds its own container color, elevation and bottom-edge color.
  @Test("APB-1 APB-2 each condition binds its own parts")
  func conditions() {
    let appearance = TanreiAppBarAppearance(tokens: tokens, size: .small)
    #expect(appearance.condition(scrolled: false) == tokens.conditions.flat)
    #expect(appearance.condition(scrolled: true) == tokens.conditions.scrolled)
    #expect(tokens.conditions.flat.outlineColor == .none && tokens.conditions.scrolled.outlineColor == .role(.outlineVariant))
  }

  /// APB-5, APB-7 — the top row always draws small's styles; the expanded row the size's own.
  @Test("APB-5 APB-7 title and subtitle styles per row")
  func styles() {
    let large = TanreiAppBarAppearance(tokens: tokens, size: .large)
    #expect(large.expands && !TanreiAppBarAppearance(tokens: tokens, size: .small).expands)
    #expect(large.topTitle == TanreiAppBarTitleStyles(title: tokens.sizes.small.titleTypescale, subtitle: tokens.sizes.small.subtitleTypescale))
    #expect(large.expandedTitle == TanreiAppBarTitleStyles(title: tokens.sizes.large.titleTypescale, subtitle: tokens.sizes.large.subtitleTypescale))
    #expect(large.metrics.rowHeight == tokens.sizes.small.containerHeight && large.metrics.expandedHeight == tokens.sizes.large.containerHeight)
  }

  /// APB-14 — a size the system does not have draws small's tokens, has no title row of its own, and is reported.
  @Test("APB-14 an unknown size draws small's tokens and is reported")
  func unknownSize() throws {
    let (appearance, reports) = Reports.collecting { TanreiAppBarAppearance(tokens: tokens, size: TanreiAppBarSize(rawValue: "huge")) }
    #expect(appearance.sizeTokens == tokens.sizes.small && !appearance.expands)
    #expect(reports.mention("huge"))
    let (bitmap, rendered) = try Reports.collecting {
      try Snapshot.render(TanreiAppBar("Inbox", size: TanreiAppBarSize(rawValue: "huge")).frame(width: width))
    }
    #expect(visualSize(bitmap).height == tokens.sizes.small.containerHeight && rendered.mention("huge"))
  }

  /// APB-14 — a size a system adds is drawn from its tokens, with a title row of its own when it is taller than small (the
  /// shipped systems add none; here one is added the way a layer adds it).
  @Test("APB-14 a size a system adds is drawn from its own tokens")
  func addedSize() throws {
    var system = TanreiSystem.tanrei
    var medium = system.appBar.sizes.large
    medium.containerHeight = 84
    system.appBar.sizes.extra[TanreiAppBarSize(rawValue: "medium")] = medium
    let (bitmap, reports) = try Reports.collecting {
      try Snapshot.render(TanreiAppBar("Inbox", size: TanreiAppBarSize(rawValue: "medium")).frame(width: width), theme: theme(system))
    }
    #expect(reports.messages.isEmpty)
    // Its own height is a minimum: the title row (40 + 12) under a 56 top row makes it 108.
    #expect(visualSize(bitmap).height == max(84, tokens.sizes.small.containerHeight + 40 + tokens.containerPaddingBlockEnd))
  }

  /// APB-3 — a change of condition moves over motion.condition-duration with motion.condition-easing; at once under Reduce
  /// Motion.
  @Test("APB-3 the condition motion comes from the tokens; none under Reduce Motion")
  func motion() {
    #expect(tokens.conditionMotion(reduceMotion: false) == .timingCurve(0.2, 0, 0, 1, duration: tokens.motionConditionDuration / 1000))
    #expect(tokens.conditionMotion(reduceMotion: true) == nil)
    var system = TanreiSystem.tanrei
    system.appBar.motionConditionDuration = 450
    #expect(system.appBar.conditionMotion(reduceMotion: false) == .timingCurve(0.2, 0, 0, 1, duration: 0.45))
  }

  /// APB-1, APB-2 — rendered: the container color of each condition fills the bar; the bottom edge is outline.width thick in
  /// the condition's color (none while flat).
  @Test("APB-1 APB-2 the rendered container and bottom edge follow the condition", arguments: [false, true])
  func rendered(scrolled: Bool) throws {
    let system = marked()
    let bitmap = try Snapshot.render(TanreiAppBar("Inbox", isScrolled: scrolled).frame(width: width), theme: theme(system))
    let colors = system.colors.light
    let height = tokens.sizes.small.containerHeight
    let fill = scrolled ? colors[.primary].rgba8() : colors[.surface].rgba8()
    #expect(pixel(bitmap, x: Snapshot.inset + 300, y: Snapshot.inset + 10).isClose(to: fill))
    let edge = pixel(bitmap, x: Snapshot.inset + 300, y: Snapshot.inset + height - 2)
    #expect(edge.isClose(to: scrolled ? colors[.error].rgba8() : colors[.surface].rgba8()))
    // Above the edge, the container.
    #expect(pixel(bitmap, x: Snapshot.inset + 300, y: Snapshot.inset + height - 6).isClose(to: fill))
    #expect(visualSize(bitmap).height == height)
  }

  /// APB-1 — the elevation of a condition reaches the render: a raised flat bar casts a shadow below its bottom edge.
  @Test("APB-1 a condition's elevation is drawn")
  func elevation() throws {
    var system = TanreiSystem.tanrei
    system.appBar.conditions.flat.containerElevation = system.elevation.level3
    let flat = try Snapshot.render(TanreiAppBar("Inbox").frame(width: width).padding(.bottom, 20), theme: theme(system))
    let plain = try Snapshot.render(TanreiAppBar("Inbox").frame(width: width).padding(.bottom, 20))
    let below = Snapshot.inset + tokens.sizes.small.containerHeight + 3
    #expect(!pixel(flat, x: Snapshot.inset + 180, y: below).isClose(to: pixel(plain, x: Snapshot.inset + 180, y: below), tolerance: 2))
  }

  /// APB-5, APB-7 — the title and subtitle colors reach the render.
  @Test("APB-5 the title and subtitle colors are the tokens'")
  func textColors() throws {
    var system = TanreiSystem.tanrei
    system.appBar.titleColor = .role(.primary)
    system.appBar.subtitleColor = .role(.error)
    let colors = system.colors.light
    func inks(_ bitmap: Bitmap, _ color: Bitmap.RGBA, rows: ClosedRange<CGFloat>) -> Bool {
      stride(from: rows.lowerBound, through: rows.upperBound, by: 1).contains { y in
        stride(from: CGFloat(16), through: 150, by: 0.5).contains { x in pixel(bitmap, x: Snapshot.inset + x, y: Snapshot.inset + y).isClose(to: color, tolerance: 24) }
      }
    }
    let bitmap = try Snapshot.render(TanreiAppBar("Quarterly", subtitle: "Edited now").frame(width: width), theme: theme(system))
    // Title 26 + subtitle 20 = 46, centered in 56: title rows 5…31, subtitle 31…51.
    #expect(inks(bitmap, colors[.primary].rgba8(), rows: 8...28))
    #expect(inks(bitmap, colors[.error].rgba8(), rows: 34...48))
    #expect(!inks(bitmap, colors[.error].rgba8(), rows: 8...28))
  }
}

// MARK: - Rendered (APB-4, APB-5, APB-6, APB-10, APB-11, APB-13, APB-15)

@MainActor
@Suite("TanreiAppBar rendered")
struct TanreiAppBarRenderedTests {
  /// APB-4 — rendered: the navigation item at the start, the actions at the end, each in a cell of the minimum target;
  /// a navigation item goes to the start and actions to the end wherever they stand. Right to left, the order is mirrored.
  @Test("APB-4 items in their places; right to left mirrors them", arguments: [LayoutDirection.leftToRight, .rightToLeft])
  func places(direction: LayoutDirection) throws {
    let bar = TanreiAppBar("Inbox") { block(.red) } actions: { block(.green); block(.blue) }
      .frame(width: width)
      .environment(\.layoutDirection, direction)
    let bitmap = try Snapshot.render(bar)
    let mid = tokens.sizes.small.containerHeight / 2
    func x(_ ltr: CGFloat) -> CGFloat { Snapshot.inset + (direction == .leftToRight ? ltr : width - ltr) }
    let navigation = tokens.containerPaddingInline + target / 2
    let last = width - tokens.containerPaddingInline - target / 2
    let first = last - target - tokens.actionsGap
    #expect(pixel(bitmap, x: x(navigation), y: Snapshot.inset + mid).isClose(to: Color.red.rgba8()))
    #expect(pixel(bitmap, x: x(first), y: Snapshot.inset + mid).isClose(to: Color.green.rgba8()))
    #expect(pixel(bitmap, x: x(last), y: Snapshot.inset + mid).isClose(to: Color.blue.rgba8()))
    // The cell is the target, the item keeps its own size: next to the square, the bar.
    #expect(pixel(bitmap, x: x(navigation + 15), y: Snapshot.inset + mid).isClose(to: light[.surface].rgba8()))
  }

  /// APB-5 — the title stays on one line, truncated at the end, however long it is; APB-15 — so does the subtitle.
  @Test("APB-5 APB-15 a long title and subtitle stay on one line each")
  func oneLine() throws {
    let long = String(repeating: "Quarterly report ", count: 8)
    let bitmap = try Snapshot.render(TanreiAppBar(long, subtitle: long) { block(.red) } actions: { block(.green) }.frame(width: width))
    #expect(visualSize(bitmap).height == tokens.sizes.small.containerHeight)
    let expanded = try Snapshot.render(TanreiAppBar(long, subtitle: long, size: .large).frame(width: width))
    let line = tokens.sizes.large.titleTypescale.lineHeight + tokens.sizes.large.subtitleTypescale.lineHeight
    #expect(visualSize(expanded).height == tokens.sizes.small.containerHeight + line + tokens.containerPaddingBlockEnd)
  }

  /// APB-6 — rendered: a centered title's ink is symmetric about the bar's middle even with two actions and one navigation
  /// item.
  @Test("APB-6 a centered title is drawn about the bar's middle")
  func centered() throws {
    var system = TanreiSystem.tanrei
    system.appBar.titleColor = .role(.primary)
    let bitmap = try Snapshot.render(
      TanreiAppBar("Inbox", titleAlignment: .center) { block(.red) } actions: { block(.green); block(.blue) }.frame(width: width), theme: theme(system))
    let ink = system.colors.light[.primary].rgba8()
    var xs: [CGFloat] = []
    for y in stride(from: CGFloat(18), through: 38, by: 1) {
      for x in stride(from: CGFloat(60), through: 300, by: 0.5) where pixel(bitmap, x: Snapshot.inset + x, y: Snapshot.inset + y).isClose(to: ink, tolerance: 40) {
        xs.append(x)
      }
    }
    let minX = try #require(xs.min()), maxX = try #require(xs.max())
    #expect(abs((minX + maxX) / 2 - width / 2) <= 2, "ink \(minX)…\(maxX)")
  }

  /// APB-10 — the container reaches under the top and side system insets while its content stays inside them.
  @Test("APB-10 the container reaches under the system insets; the content does not")
  func insets() throws {
    let system = marked()
    let inset: CGFloat = 24
    let bar = VStack(spacing: 0) {
      TanreiAppBar("Inbox", isScrolled: true) { block(.red) }
      Color.clear.frame(height: 40)
    }
    .safeAreaPadding(.top, inset)
    .safeAreaPadding(.horizontal, inset)
    .frame(width: width)
    let bitmap = try Snapshot.render(bar, theme: theme(system))
    let fill = system.colors.light[.primary].rgba8()
    // The color at the top edge and at both side edges, inside the insets.
    #expect(pixel(bitmap, x: Snapshot.inset + 180, y: Snapshot.inset + 2).isClose(to: fill))
    #expect(pixel(bitmap, x: Snapshot.inset + 2, y: Snapshot.inset + inset + 20).isClose(to: fill))
    #expect(pixel(bitmap, x: Snapshot.inset + width - 2, y: Snapshot.inset + inset + 20).isClose(to: fill))
    // The navigation item below the top inset and inside the start inset.
    let navigation = CGPoint(x: inset + tokens.containerPaddingInline + target / 2, y: inset + tokens.sizes.small.containerHeight / 2)
    #expect(pixel(bitmap, x: Snapshot.inset + navigation.x, y: Snapshot.inset + navigation.y).isClose(to: Color.red.rgba8()))
  }

  /// APB-11 — the items render as the icon buttons they are, from their own tokens: a filled icon button's container is its
  /// own color inside the bar, and the bar's condition does not change it.
  @Test("APB-11 the bar does not restyle its icon buttons", arguments: [false, true])
  func notRestyled(scrolled: Bool) throws {
    let bar = TanreiAppBar("Inbox", isScrolled: scrolled) {
      TanreiIconButton("Back", variant: .filled, action: {}) { Image(systemName: "arrow.left") }
    }
    .frame(width: width)
    let bitmap = try Snapshot.render(bar, theme: theme(marked()))
    let center = tokens.containerPaddingInline + target / 2
    let edge = center - TanreiSystem.tanrei.iconButton.sizes.medium.containerSize / 2 + 3
    #expect(pixel(bitmap, x: Snapshot.inset + edge, y: Snapshot.inset + tokens.sizes.small.containerHeight / 2).isClose(to: light[.primary].rgba8()))
  }

  /// APB-11 — the items keep their own semantics: a click on an action calls its action once; nothing of the bar's takes it.
  @Test("APB-11 a click on an item is the item's")
  func clicks() throws {
    #if os(macOS)
    final class Counter { var back = 0, search = 0 }
    let counter = Counter()
    let hosted = HostedView(
      TanreiAppBar("Inbox") {
        TanreiIconButton("Back", action: { counter.back += 1 }) { Image(systemName: "arrow.left") }
      } actions: {
        TanreiIconButton("Search", action: { counter.search += 1 }) { Image(systemName: "magnifyingglass") }
      }
      .frame(width: width)
      .tanreiTheme(Snapshot.theme))
    let mid = tokens.sizes.small.containerHeight / 2
    hosted.click(at: CGPoint(x: width - tokens.containerPaddingInline - target / 2, y: mid))
    hosted.click(at: CGPoint(x: tokens.containerPaddingInline + target / 2, y: mid))
    // On the title: nothing.
    hosted.click(at: CGPoint(x: width / 2, y: mid))
    #expect(counter.back == 1 && counter.search == 1)
    #endif
  }

  /// APB-13 — an empty title draws no title block: a large bar keeps an empty title row of its minimum height. More than
  /// one navigation button or three actions still render, and are reported.
  @Test("APB-13 no title draws no block; extra items still render and are reported")
  func emptyAndExtra() throws {
    var system = TanreiSystem.tanrei
    system.appBar.titleColor = .role(.error)
    let empty = try Snapshot.render(TanreiAppBar("", size: .large).frame(width: width), theme: theme(system))
    #expect(visualSize(empty).height == tokens.sizes.large.containerHeight)
    let error = system.colors.light[.error].rgba8()
    var inked = false
    for y in stride(from: CGFloat(0), to: tokens.sizes.large.containerHeight, by: 2) {
      for x in stride(from: CGFloat(0), to: width, by: 2) where pixel(empty, x: Snapshot.inset + x, y: Snapshot.inset + y).isClose(to: error, tolerance: 40) {
        inked = true
      }
    }
    #expect(!inked)

    let (bitmap, reports) = try Reports.collecting {
      try Snapshot.render(
        TanreiAppBar("Inbox") { block(.red); block(.red) } actions: { block(.green); block(.green); block(.green); block(.blue) }.frame(width: 480))
    }
    #expect(reports.mention("navigation button") && reports.mention("overflow menu"))
    let last = 480 - tokens.containerPaddingInline - target / 2
    #expect(pixel(bitmap, x: Snapshot.inset + last, y: Snapshot.inset + tokens.sizes.small.containerHeight / 2).isClose(to: Color.blue.rgba8()))
    let second = tokens.containerPaddingInline + target + tokens.actionsGap + target / 2
    #expect(pixel(bitmap, x: Snapshot.inset + second, y: Snapshot.inset + tokens.sizes.small.containerHeight / 2).isClose(to: Color.red.rgba8()))
  }

  /// APB-15 — heights are minimums: a larger title style grows the top row (and a large bar's title row), the text stays
  /// on one line, and the icon buttons keep their size.
  @Test("APB-15 enlarged text grows the rows, not the items")
  func enlargedText() throws {
    var system = TanreiSystem.tanrei
    system.appBar.sizes.small.titleTypescale.size = 40
    system.appBar.sizes.small.titleTypescale.lineHeight = 72
    system.appBar.sizes.large.titleTypescale.lineHeight = 90
    let small = try Snapshot.render(
      TanreiAppBar("Inbox") { TanreiIconButton("Back", variant: .filled, action: {}) { Image(systemName: "arrow.left") } }.frame(width: width),
      theme: theme(system))
    #expect(visualSize(small).height == 72)
    // The filled button is still its own 40: 8 above and below its container, the bar's surface.
    let center = tokens.containerPaddingInline + target / 2
    let side = TanreiSystem.tanrei.iconButton.sizes.medium.containerSize
    #expect(pixel(small, x: Snapshot.inset + center, y: Snapshot.inset + 36 - side / 2 - 3).isClose(to: light[.surface].rgba8()))
    #expect(pixel(small, x: Snapshot.inset + center - side / 2 + 3, y: Snapshot.inset + 36).isClose(to: light[.primary].rgba8()))
    let large = try Snapshot.render(TanreiAppBar("Inbox", size: .large).frame(width: width), theme: theme(system))
    #expect(visualSize(large).height == 72 + 90 + tokens.containerPaddingBlockEnd)
  }

  /// APB-12 — a large bar exposes one title: while expanded the top row's copy is hidden (and invisible), while scrolled the
  /// expanded one is not drawn at all.
  @Test("APB-12 APB-7 a large bar draws the top row's title only once collapsed")
  func oneTitle() throws {
    var system = TanreiSystem.tanrei
    system.appBar.titleColor = .role(.primary)
    let ink = system.colors.light[.primary].rgba8()
    func inks(_ bitmap: Bitmap, rows: ClosedRange<CGFloat>) -> Bool {
      stride(from: rows.lowerBound, through: rows.upperBound, by: 1).contains { y in
        stride(from: CGFloat(60), through: 200, by: 0.5).contains { x in pixel(bitmap, x: Snapshot.inset + x, y: Snapshot.inset + y).isClose(to: ink, tolerance: 40) }
      }
    }
    let expanded = try Snapshot.render(TanreiAppBar("Inbox", size: .large) { block(.red) }.frame(width: width), theme: theme(system))
    #expect(!inks(expanded, rows: 10...46))
    #expect(inks(expanded, rows: 64...96))
    let collapsed = try Snapshot.render(TanreiAppBar("Inbox", size: .large, isScrolled: true) { block(.red) }.frame(width: width), theme: theme(system))
    #expect(visualSize(collapsed).height == tokens.sizes.small.containerHeight)
    #expect(inks(collapsed, rows: 10...46))
    // Nothing of the expanded title is drawn below the collapsed bar (its row is clipped down to nothing).
    #expect(!inks(collapsed, rows: 58...70))
  }
}

// MARK: - A connected scroll view (APB-8, APB-9)

#if os(macOS)
/// A screen 360 × 400: rows of gray under a bar in the scroll view's top inset, the source marking the scroll view (after the
/// inset). The test scrolls it through AppKit, as a person does.
@MainActor
private func screen(_ size: TanreiAppBarSize, isScrolled: Bool? = nil) -> some View {
  ScrollView {
    VStack(spacing: 0) {
      ForEach(0..<60, id: \.self) { _ in Color.gray.frame(height: 40) }
    }
  }
  .safeAreaInset(edge: .top, spacing: 0) { TanreiAppBar("Inbox", size: size, isScrolled: isScrolled) }
  .tanreiAppBarScrollSource()
  .frame(width: width, height: 400)
  .tanreiTheme(theme(marked()))
}

@MainActor
private func isFill(_ color: Bitmap.RGBA?) -> Bool {
  color?.isClose(to: marked().colors.light[.primary].rgba8(), tolerance: 6) ?? false
}

@MainActor
private func isFlat(_ color: Bitmap.RGBA?) -> Bool {
  color?.isClose(to: light[.surface].rgba8(), tolerance: 6) ?? false
}

@MainActor
private func isContent(_ color: Bitmap.RGBA?) -> Bool {
  color?.isClose(to: Color.gray.rgba8(), tolerance: 12) ?? false
}

@MainActor
@Suite("TanreiAppBar connected", .serialized)
struct TanreiAppBarConnectedTests {
  /// APB-9 — connected, a small bar takes the scrolled condition once content lies under it and loses it back at the top.
  @Test("APB-9 a connected small bar is scrolled while content lies under it")
  func small() async throws {
    guard #available(macOS 15, *) else { return }
    let hosted = HostedView(screen(.small))
    let probe = CGPoint(x: 300, y: 10)
    #expect(isFlat(hosted.color(at: probe)))
    #expect(hosted.scroll(toY: 80))
    #expect(await hosted.wait(atMost: 3) { isFill(hosted.color(at: probe)) })
    #expect(hosted.scroll(toY: 0))
    #expect(await hosted.wait(atMost: 3) { isFlat(hosted.color(at: probe)) })
  }

  /// APB-8 — connected, a large bar shrinks one for one with the scroll down to its top row and expands again as the content
  /// returns; APB-9 — it is scrolled only once it has fully collapsed.
  @Test("APB-8 APB-9 a connected large bar collapses one for one, then is scrolled")
  func large() async throws {
    guard #available(macOS 15, *) else { return }
    let hosted = HostedView(screen(.large))
    let expanded = tokens.sizes.large.containerHeight
    let row = tokens.sizes.small.containerHeight
    #expect(isFlat(hosted.color(at: CGPoint(x: 300, y: expanded - 4))))
    // 20 down: the bar ends 20 higher, the content shows below it; still flat.
    #expect(hosted.scroll(toY: 20))
    #expect(await hosted.wait(atMost: 3) { isContent(hosted.color(at: CGPoint(x: 300, y: expanded - 10))) })
    #expect(isFlat(hosted.color(at: CGPoint(x: 300, y: expanded - 26))))
    #expect(isFlat(hosted.color(at: CGPoint(x: 300, y: 10))))
    // Past the collapse: the top row alone, scrolled.
    #expect(hosted.scroll(toY: 200))
    #expect(await hosted.wait(atMost: 3) { isFill(hosted.color(at: CGPoint(x: 300, y: 10))) })
    #expect(isContent(hosted.color(at: CGPoint(x: 300, y: row + 6))))
    // Back at the top: expanded and flat again.
    #expect(hosted.scroll(toY: 0))
    #expect(await hosted.wait(atMost: 3) { isFlat(hosted.color(at: CGPoint(x: 300, y: expanded - 4))) })
    #expect(isFlat(hosted.color(at: CGPoint(x: 300, y: 10))))
  }

  /// APB-9 — `isScrolled: false` overrides a connection: the bar stays flat however far the content scrolls.
  @Test("APB-9 isScrolled overrides the connection")
  func override() async throws {
    guard #available(macOS 15, *) else { return }
    let hosted = HostedView(screen(.small, isScrolled: false))
    #expect(hosted.scroll(toY: 200))
    _ = await hosted.wait(atMost: 1) { false }
    #expect(isFlat(hosted.color(at: CGPoint(x: 300, y: 10))))
    #expect(isContent(hosted.color(at: CGPoint(x: 300, y: tokens.sizes.small.containerHeight + 20))))
  }
}
#endif

// MARK: - Fixtures (one per spec fixture)

/// Draws a fixture of specs/app-bar.spec.json as a product writes it: the bar 360 wide, its props on the bar, its items as
/// standard medium TanreiIconButtons in their slots (navigation first, the actions in order), no system insets.
@MainActor
enum TanreiAppBarFixtures {
  /// The fixtures' glyph names as the SF Symbols a product on Apple platforms would pass.
  static let symbols: [String: String] = [
    "arrow_back": "arrow.left", "search": "magnifyingglass", "more_vert": "ellipsis", "share": "square.and.arrow.up", "menu": "line.3.horizontal",
    "account_circle": "person.crop.circle",
  ]

  static func button(_ item: SpecItem) -> some View {
    TanreiIconButton(item.string("label") ?? "", action: {}) { Image(systemName: symbols[item.content ?? ""] ?? "questionmark") }
  }

  static func view(_ fixture: SpecFixture) -> some View {
    let items = fixture.items ?? []
    let navigation = items.filter { $0.kind == "navigation" }
    let actions = items.filter { $0.kind == "action" }
    return TanreiAppBar(
      fixture.string("title") ?? "", subtitle: fixture.string("subtitle") ?? "", size: fixture.string("size").map(TanreiAppBarSize.init(rawValue:)) ?? .small,
      titleAlignment: fixture.string("titleAlignment").flatMap(TanreiAppBarTitleAlignment.init(rawValue:)) ?? .start,
      isScrolled: fixture.bool("scrolled") ?? false
    ) {
      ForEach(navigation.indices, id: \.self) { button(navigation[$0]) }
    } actions: {
      ForEach(actions.indices, id: \.self) { button(actions[$0]) }
    }
    .frame(width: width)
  }
}

@MainActor
@Suite("TanreiAppBar snapshots")
struct TanreiAppBarSnapshotTests {
  /// Mirrors `fixtures` in specs/app-bar.spec.json.
  nonisolated static let fixtures = ["small", "small-scrolled", "small-center", "small-subtitle", "small-title-only", "large", "large-subtitle", "large-scrolled"]

  static func fixture(_ id: String) throws -> SpecFixture {
    try #require(try SpecFixture.load(spec: "app-bar").first { $0.id == id })
  }

  @Test("APB-4 fixture matches its baseline", arguments: fixtures)
  func fixture(_ id: String) throws {
    try Snapshot.assert(TanreiAppBarFixtures.view(try Self.fixture(id)), named: id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    #expect(try SpecFixture.load(spec: "app-bar").map(\.id) == Self.fixtures)
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiAppBarTests/<system-id>/<fixture-id>.png` — picked for what each preset changes, as on Compose:
/// m3-like's scrolled bar (its tinted container), m3-expressive-like's large bar with a subtitle, cupertino's large title.
@MainActor
@Suite("TanreiAppBar preset snapshots")
struct TanreiAppBarPresetSnapshotTests {
  nonisolated static let representatives: [ShippedSystem: String] = [.m3Like: "small-scrolled", .m3ExpressiveLike: "large-subtitle", .cupertino: "large"]
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .m3ExpressiveLike, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(Self.presets.allSatisfy { TanreiAppBarSnapshotTests.fixtures.contains(Self.representatives[$0]!) })
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try TanreiAppBarSnapshotTests.fixture(Self.representatives[preset]!)
    try Snapshot.assert(TanreiAppBarFixtures.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
