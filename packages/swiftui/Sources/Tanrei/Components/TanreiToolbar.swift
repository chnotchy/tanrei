import SwiftUI

// Spec: specs/toolbar.spec.json — tokens: TanreiToolbarTokens (comp.toolbar), read from the design system in the
// environment (`system.toolbar`): per variant the container's color, elevation, corners, cross-axis size, end padding and
// minimum gap and the edge's color, and the edge's width. The toolbar draws no text, glyph or state of its own and reads no
// state token. Its items are the product's `TanreiIconButton`s and `TanreiButton`s (the item kinds `action` and
// `button`), drawn from their own tokens with their own states and semantics (TBR-9). It reaches into them through the
// internal channel of `TanreiJoinedItem.swift` only: where each hit area meets its neighbour's (TBR-9), and the one Tab
// stop the row is (TBR-10). SwiftUI's own `.toolbar` with a bottom-bar placement is not used: its bar cannot take the
// tokens.
//
// A docked toolbar is a layout region, placed with `.safeAreaInset(edge: .bottom)`: its color reaches under the
// bottom and side system insets, its items stay inside them (TBR-3). A floating toolbar places itself nowhere (TBR-5).

/// The direction a toolbar's items run (spec prop `orientation`). A closed set: the component defines it.
public enum TanreiToolbarOrientation: String, CaseIterable, Sendable {
  /// In one row, in reading order (mirrored right to left). The default, and the only direction of a docked toolbar.
  case horizontal
  /// In one column, top to bottom in every layout direction: a floating toolbar beside the content on a large screen.
  case vertical

  /// The orientation a spec value names, for UI built from data. TBR-13: any other name is `.horizontal`, the default,
  /// and is reported in debug builds (`TanreiDiagnostics`).
  public init(named name: String) {
    if let orientation = TanreiToolbarOrientation(rawValue: name) {
      self = orientation
    } else {
      TanreiDiagnostics.report("Tanrei: a toolbar has no orientation \"\(name)\"; using \"horizontal\" (TBR-13)")
      self = .horizontal
    }
  }
}

/// Holds a short row of actions for the current screen or selection, docked across the bottom edge or floating over the
/// content.
///
///     ContentView()
///       .safeAreaInset(edge: .bottom, spacing: 0) {
///         TanreiToolbar("Message actions") {
///           TanreiIconButton("Archive", icon: "archive", action: archive)
///           TanreiIconButton("Delete", icon: "delete", action: delete)
///           TanreiButton("Reply", variant: .tonal, action: reply)
///         }
///       }
///     TanreiToolbar("Formatting", variant: .floating) {
///       TanreiIconButton("Bold", isSelected: $bold, icon: "format_bold")
///       TanreiIconButton("Italic", isSelected: $italic, icon: "format_italic")
///     }
///     TanreiToolbar("Map controls", variant: .floating, orientation: .vertical) { … }
///
/// - `label` names the toolbar for assistive technology ("Formatting"); it is never drawn, and an empty one is reported in
///   debug builds (TBR-12).
/// - `variant` is a `TanreiToolbarVariant`: `.docked` (default) spans the width it is offered, at least
///   `container.size.docked` high, its items spread across it; `.floating` is a rounded, raised surface as long as its
///   items. A variant a design system adds takes the docked structure with its own values; a value the system
///   does not have draws `.docked` and is reported (TBR-13).
/// - `orientation` is a `TanreiToolbarOrientation`; `.vertical` stacks a floating toolbar's items. A docked toolbar is
///   always horizontal (reported in debug builds, TBR-6).
///
/// The content is `TanreiIconButton`s and `TanreiButton`s (`ForEach` and `if` work), each drawn, pressed, focused and named
/// as it is anywhere (TBR-9). Anything else, or no item, is still laid out and is reported in debug builds (TBR-12). The
/// toolbar is one keyboard stop: the arrow keys along its axis move among its enabled items, Home and End go to the ends
/// (TBR-10). Items that do not fit scroll along its axis; put the extra actions in a menu (TBR-8).
public struct TanreiToolbar<Content: View>: View {
  private let label: Text
  private let isLabelEmpty: Bool
  private let variant: TanreiToolbarVariant
  private let orientation: TanreiToolbarOrientation
  private let content: Content

  @Environment(\.tanreiSystem) private var system
  /// The row's one Tab stop (TBR-10).
  @State private var focus = TanreiJoinedRovingModel()

  /// A toolbar named by `label`.
  public init<S: StringProtocol>(
    _ label: S,
    variant: TanreiToolbarVariant = .docked,
    orientation: TanreiToolbarOrientation = .horizontal,
    @ViewBuilder content: () -> Content
  ) {
    self.label = Text(label)
    self.isLabelEmpty = label.isEmpty
    self.variant = variant
    self.orientation = orientation
    self.content = content()
  }

  /// A toolbar named by a localized label.
  public init(
    _ labelKey: LocalizedStringKey,
    variant: TanreiToolbarVariant = .docked,
    orientation: TanreiToolbarOrientation = .horizontal,
    @ViewBuilder content: () -> Content
  ) {
    self.label = Text(labelKey)
    self.isLabelEmpty = labelKey == ""
    self.variant = variant
    self.orientation = orientation
    self.content = content()
  }

  /// Tests only: a toolbar whose one Tab stop is `focus`, so that a test can move it (TBR-8, TBR-10).
  init(
    _ label: String, variant: TanreiToolbarVariant = .docked, orientation: TanreiToolbarOrientation = .horizontal,
    focus: TanreiJoinedRovingModel, @ViewBuilder content: () -> Content
  ) {
    self.init(label, variant: variant, orientation: orientation, content: content)
    _focus = State(initialValue: focus)
  }

  public var body: some View {
    let arrangement = TanreiToolbarArrangement(tokens: system.toolbar, variant: variant, orientation: orientation)
    // TBR-6, TBR-12: reported in debug builds; the toolbar is drawn all the same.
    let _ = TanreiToolbarArrangement.problems(isLabelEmpty: isLabelEmpty, variant: variant, orientation: orientation)
      .forEach { TanreiDiagnostics.report($0) }
    let focus = self.focus
    _VariadicView.Tree(TanreiToolbarRoot(arrangement: arrangement, focus: focus)) { content }
      // The items' own bodies know they are in a row (`TanreiButtonTarget`); their place is read below it.
      .environment(\.tanreiInJoinedRow, true)
      .onPreferenceChange(TanreiJoinedRovingEntriesKey.self) { entries in
        MainActor.assumeIsolated { focus.update(entries) }
      }
      // The items belong to this toolbar only.
      .transformPreference(TanreiJoinedRovingEntriesKey.self) { $0 = [:] }
      .modifier(TanreiToolbarSurface(arrangement: arrangement))
      // TBR-11: SwiftUI has no toolbar role — a container named by the label, holding the items in order.
      .accessibilityElement(children: .contain)
      .accessibilityLabel(label)
  }
}

// MARK: - Token bindings

/// What a toolbar of one variant and orientation reads from its tokens and how it lays out: pure data, so the bindings
/// can be tested without rendering.
struct TanreiToolbarArrangement: Equatable {
  /// TBR-4 … TBR-6: floating — a raised surface as long as its items, at its own size — or docked — the full width, the
  /// items spread, reaching under the insets. Only `.floating` floats: every other value, one a layer adds included, has
  /// the docked structure with its own values (TBR-13).
  let isFloating: Bool
  /// TBR-6: a column only for a vertical floating toolbar.
  let axis: Axis
  let containerColor: TanreiPaint
  let elevation: [TanreiShadowLayer]
  let cornerRadius: CGFloat
  /// TBR-1 / TBR-4: the least extent across the axis.
  let size: CGFloat
  /// TBR-2 / TBR-4: from each end of the axis to the first and last item.
  let padding: CGFloat
  /// TBR-2 / TBR-4: between neighbours — exactly this floating, at least this docked.
  let gap: CGFloat
  let outlineColor: TanreiPaint
  let outlineWidth: CGFloat

  init(tokens: TanreiToolbarTokens, variant: TanreiToolbarVariant, orientation: TanreiToolbarOrientation) {
    // TBR-13: the lookup is total — a variant this system does not have reads docked's tokens, and is reported.
    let values = tokens.variants[variant]
    isFloating = variant == .floating
    axis = isFloating && orientation == .vertical ? .vertical : .horizontal
    containerColor = values.containerColor
    elevation = values.containerElevation
    cornerRadius = values.containerShape
    size = values.containerSize
    padding = values.containerPaddingInline
    gap = values.containerGap
    outlineColor = values.outlineColor
    outlineWidth = tokens.outlineWidth
  }

  /// TBR-2: a docked toolbar spreads its items across its length; a floating one packs them.
  var spreads: Bool { !isFloating }

  /// TBR-6, TBR-12: what a debug build reports about the props.
  static func problems(isLabelEmpty: Bool, variant: TanreiToolbarVariant, orientation: TanreiToolbarOrientation) -> [String] {
    var problems: [String] = []
    if isLabelEmpty {
      problems.append("Tanrei: a toolbar has an empty label, so it has no accessible name (TBR-12); name it (\"Formatting\", \"Message actions\")")
    }
    if orientation == .vertical, variant != .floating {
      problems.append("Tanrei: a \(variant.rawValue) toolbar is horizontal; orientation \"vertical\" is for a floating toolbar (TBR-6)")
    }
    return problems
  }

  /// TBR-12: what a debug build reports about the content. `kinds[i]` is whether item `i` is a Tanrei Button or icon button.
  static func contentProblems(kinds: [Bool]) -> [String] {
    if kinds.isEmpty {
      return ["Tanrei: a toolbar holds no item; a toolbar holds TanreiIconButtons and TanreiButtons (TBR-12)"]
    }
    let foreign = kinds.indices.filter { !kinds[$0] }
    guard !foreign.isEmpty else { return [] }
    return [
      "Tanrei: a toolbar holds content that is not a TanreiIconButton or TanreiButton (item \(foreign.map { String($0 + 1) }.joined(separator: ", "))); it is laid out, but a field or a slider would take the arrow keys the toolbar moves focus with (TBR-12)"
    ]
  }

  /// TBR-8: what a debug build reports when the items do not fit.
  static let overflowReport =
    "Tanrei: a toolbar's items need more length than it has along its axis, so they scroll; the extra actions belong in an overflow menu the product provides (a TanreiMenu opened from a \"More\" icon button) (TBR-8)"
}

// MARK: - Content

/// Reads the toolbar's items — whatever the view builder made of `ForEach` and `if` — and reports what a toolbar should not
/// hold (TBR-12).
private struct TanreiToolbarRoot: _VariadicView_UnaryViewRoot {
  let arrangement: TanreiToolbarArrangement
  let focus: TanreiJoinedRovingModel

  func body(children: _VariadicView.Children) -> some View {
    TanreiToolbarArrangement.contentProblems(kinds: children.map { $0[TanreiJoinedItemKey.self] }).forEach { TanreiDiagnostics.report($0) }
    return TanreiToolbarRow(children: children, arrangement: arrangement, focus: focus)
  }
}

/// The items, placed (TBR-2, TBR-4, TBR-6, TBR-8): one row (or column), as long as the toolbar is given (docked) or as its
/// items need, no longer than it is given (floating), and as thick as the row. Once laid out, a row that needs more length
/// than the toolbar has moves into a scroll view along the axis (a docked row inside it stays at least as long as the
/// scroll view, so it spreads its items when it fits again), and an item that takes keyboard focus is brought fully into
/// view, at once. A row that fits is in no scroll view: a scroll view hit-tests nothing outside its bounds, and an end
/// item's target may reach past the toolbar's (TBR-9). Snapshots (`\.tanreiScrollsInPlace`) draw the row in place, from
/// its start, clipped to the toolbar.
///
/// Each item is told its place in the row: how far its hit area may reach toward a neighbour — to the middle of the space
/// between their visible bounds, measured once laid out (a docked toolbar spreads its items); until then the least that
/// space can be, half the gap token (TBR-9) — and the row's one Tab stop (TBR-10).
private struct TanreiToolbarRow: View {
  let children: _VariadicView.Children
  let arrangement: TanreiToolbarArrangement
  let focus: TanreiJoinedRovingModel

  /// Each item's frame in the row, by item: the space between neighbours (TBR-9).
  @State private var frames: [AnyHashable: CGRect] = [:]
  /// TBR-8: the row's length and the toolbar's, as laid out.
  @State private var rowLength: CGFloat = .zero
  @State private var viewportLength: CGFloat = .zero
  @Namespace private var space
  @Environment(\.tanreiScrollsInPlace) private var inPlace
  @Environment(\.tanreiToolbarReportsOverflow) private var reportsOverflow

  var body: some View {
    let ids = children.map { AnyHashable($0.id) }
    let axis = arrangement.axis
    let overflows = viewportLength > .zero && rowLength > viewportLength + TanreiToolbarViewport.tolerance
    // TBR-8: reported from the row as it was laid out — a layout pass also places its subviews to answer a probe (an
    // HStack's alignment), so a length seen there may never be shown.
    let _ = overflows && reportsOverflow ? TanreiDiagnostics.report(TanreiToolbarArrangement.overflowReport) : ()
    let scrolls = !inPlace && overflows
    ScrollViewReader { proxy in
      TanreiToolbarViewport(axis: axis, hugs: arrangement.isFloating) {
        if scrolls {
          ScrollView(axis == .horizontal ? .horizontal : .vertical, showsIndicators: false) {
            if arrangement.spreads {
              TanreiToolbarSpread(axis: axis) {
                Color.clear.containerRelativeFrame(axis == .horizontal ? .horizontal : .vertical).accessibilityHidden(true)
                measured(row(ids: ids))
              }
            } else {
              measured(row(ids: ids))
            }
          }
        } else {
          measured(row(ids: ids))
        }
      }
      .modifier(TanreiToolbarInPlaceClip(isOn: inPlace))
      .onGeometryChange(for: CGFloat.self) { axis == .horizontal ? $0.size.width : $0.size.height } action: { viewportLength = $0 }
      .onChange(of: focus.last) { _, last in
        guard let last, ids.indices.contains(last) else { return }
        proxy.scrollTo(ids[last])
      }
    }
  }

  /// The row, its length along the axis recorded (TBR-8).
  private func measured(_ row: some View) -> some View {
    let axis = arrangement.axis
    return row.onGeometryChange(for: CGFloat.self) { axis == .horizontal ? $0.size.width : $0.size.height } action: { rowLength = $0 }
  }

  private func row(ids: [AnyHashable]) -> some View {
    let places = ids.indices.map { place($0, ids: ids) }
    let index = Dictionary(uniqueKeysWithValues: ids.enumerated().map { ($0.element, $0.offset) })
    let space = self.space
    return TanreiToolbarLayout(
      axis: arrangement.axis, spreads: arrangement.spreads, padding: arrangement.padding, gap: arrangement.gap,
      minimumAcross: arrangement.size
    ) {
      ForEach(children) { child in
        let id = AnyHashable(child.id)
        child
          .environment(\.tanreiJoinedPlace, index[id].map { places[$0] })
          .id(id)
          .onGeometryChange(for: CGRect.self) { $0.frame(in: .named(space)) } action: { frames[id] = $0 }
      }
    }
    .coordinateSpace(.named(space))
  }

  /// TBR-9 / TBR-10: the place of item `index`.
  private func place(_ index: Int, ids: [AnyHashable]) -> TanreiJoinedPlace {
    func space(_ a: Int, _ b: Int) -> CGFloat {
      guard let first = frames[ids[a]], let second = frames[ids[b]] else { return arrangement.gap }
      return TanreiToolbarLayout.space(between: first, and: second, axis: arrangement.axis)
    }
    let count = ids.count
    return TanreiJoinedPlace.row(
      at: index, of: count, axis: arrangement.axis,
      before: index > 0 ? space(index - 1, index) : nil,
      after: index < count - 1 ? space(index, index + 1) : nil,
      roving: TanreiJoinedRoving(model: focus, index: index, count: count))
  }
}

private struct TanreiToolbarReportsOverflowKey: EnvironmentKey {
  static let defaultValue = true
}

extension EnvironmentValues {
  /// Whether a toolbar below reports its items not fitting (TBR-8); `false` only under `tanreiToolbarReportsOverflow(false)`.
  var tanreiToolbarReportsOverflow: Bool {
    get { self[TanreiToolbarReportsOverflowKey.self] }
    set { self[TanreiToolbarReportsOverflowKey.self] = newValue }
  }
}

extension View {
  /// Fixtures and galleries only: the toolbars below do not report that their items need more length than they have
  /// (TBR-8). A fixture stage is fixed, and an accessibility audit enlarges the text until a Button no longer fits: the row
  /// scrolls as TBR-8 says, and a debug build would otherwise stop there.
  @_spi(Fixtures)
  public func tanreiToolbarReportsOverflow(_ reports: Bool) -> some View {
    environment(\.tanreiToolbarReportsOverflow, reports)
  }
}

/// The toolbar's length along its axis, around its one subview (the scroll view, or the row in place): what it is given
/// when it spans (docked, TBR-1), else what the items need, no more than it is given (floating, TBR-4); across the axis,
/// what the row needs.
struct TanreiToolbarViewport: Layout {
  let axis: Axis
  /// Floating: as long as the items, no longer than it is given.
  let hugs: Bool

  private func along(_ size: CGSize) -> CGFloat { axis == .horizontal ? size.width : size.height }
  private func across(_ size: CGSize) -> CGFloat { axis == .horizontal ? size.height : size.width }
  private func size(along: CGFloat, across: CGFloat) -> CGSize {
    axis == .horizontal ? CGSize(width: along, height: across) : CGSize(width: across, height: along)
  }

  /// What the items need: the subview asked with nothing proposed (a scroll view answers its content's size).
  private func ideal(_ subviews: Subviews) -> CGSize {
    subviews.first?.sizeThatFits(.unspecified) ?? .zero
  }

  static func length(ideal: CGFloat, offered: CGFloat?, hugs: Bool) -> CGFloat {
    guard let offered, offered.isFinite else { return ideal }
    return hugs ? min(ideal, offered) : offered
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let ideal = ideal(subviews)
    let offered = axis == .horizontal ? proposal.width : proposal.height
    return size(along: Self.length(ideal: along(ideal), offered: offered, hugs: hugs), across: across(ideal))
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    guard let content = subviews.first else { return }
    content.place(at: bounds.origin, anchor: .topLeading, proposal: ProposedViewSize(bounds.size))
  }

  /// Layout slack: text measures in fractions of a point.
  static let tolerance: CGFloat = 0.5
}

/// Snapshots: the row in place is clipped to the toolbar, as a scroll view at rest shows it.
private struct TanreiToolbarInPlaceClip: ViewModifier {
  let isOn: Bool

  func body(content: Content) -> some View {
    if isOn { content.clipped() } else { content }
  }
}

/// Inside a docked toolbar's scroll view: the row at least as long as the scroll view (its first subview, a probe sized to
/// the scroll view along the axis), so that it spreads its items (TBR-2); longer when the items need it (TBR-8).
private struct TanreiToolbarSpread: Layout {
  let axis: Axis

  private func along(_ size: CGSize) -> CGFloat { axis == .horizontal ? size.width : size.height }

  private func length(_ subviews: Subviews) -> CGFloat {
    guard subviews.count == 2 else { return .zero }
    let viewport = along(subviews[0].sizeThatFits(.unspecified))
    let needed = along(subviews[1].sizeThatFits(.unspecified))
    return viewport.isFinite ? max(viewport, needed) : needed
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    guard subviews.count == 2 else { return .zero }
    let length = length(subviews)
    let row = subviews[1].sizeThatFits(axis == .horizontal ? ProposedViewSize(width: length, height: nil) : ProposedViewSize(width: nil, height: length))
    return axis == .horizontal ? CGSize(width: length, height: row.height) : CGSize(width: row.width, height: length)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    guard subviews.count == 2 else { return }
    subviews[0].place(at: bounds.origin, anchor: .topLeading, proposal: .zero)
    subviews[1].place(at: bounds.origin, anchor: .topLeading, proposal: ProposedViewSize(bounds.size))
  }
}

// MARK: - Layout (TBR-1, TBR-2, TBR-4, TBR-6, TBR-7, TBR-14)

/// The row (or column): each item at its own size — a Tanrei button's layout size is its visual; its hit area overflows it
/// —, `padding` from each end, `gap` apart and, when `spreads` (docked), the length it is offered filled with equal space
/// between neighbours (one item centred); every item centred across the axis, which is at least `minimumAcross` and grows
/// to hold the largest item (TBR-14). SwiftUI mirrors the placement right to left, so a row's first item is on the right
/// there; a column keeps its top-to-bottom order (TBR-7).
struct TanreiToolbarLayout: Layout {
  let axis: Axis
  let spreads: Bool
  let padding: CGFloat
  let gap: CGFloat
  let minimumAcross: CGFloat

  private func along(_ size: CGSize) -> CGFloat { axis == .horizontal ? size.width : size.height }
  private func across(_ size: CGSize) -> CGFloat { axis == .horizontal ? size.height : size.width }

  /// The length the items need: their own lengths, the gap between neighbours and the padding at both ends.
  static func needed(lengths: [CGFloat], padding: CGFloat, gap: CGFloat) -> CGFloat {
    lengths.reduce(.zero, +) + gap * CGFloat(max(lengths.count - 1, 0)) + 2 * padding
  }

  /// Where each item starts along a row `length` long (TBR-2, TBR-4): packed from the padding (centred as a group in a
  /// longer row it did not ask for); spread, the first at the padding, the last as far from the end, the rest equally
  /// apart — and a lone item centred.
  static func starts(lengths: [CGFloat], length: CGFloat, padding: CGFloat, gap: CGFloat, spreads: Bool) -> [CGFloat] {
    guard !lengths.isEmpty else { return [] }
    if spreads, lengths.count == 1 { return [(length - lengths[0]) / 2] }
    let extra = max(length - needed(lengths: lengths, padding: padding, gap: gap), .zero)
    let between = gap + (spreads ? extra / CGFloat(lengths.count - 1) : .zero)
    var position = padding + (spreads ? .zero : extra / 2)
    return lengths.map { length in
      defer { position += length + between }
      return position
    }
  }

  /// The space between two items' frames along `axis` (TBR-9), whichever comes first.
  static func space(between first: CGRect, and second: CGRect, axis: Axis) -> CGFloat {
    axis == .horizontal
      ? max(second.minX - first.maxX, first.minX - second.maxX, .zero)
      : max(second.minY - first.maxY, first.minY - second.maxY, .zero)
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let sizes = subviews.map { $0.sizeThatFits(.unspecified) }
    var length = Self.needed(lengths: sizes.map(along), padding: padding, gap: gap)
    let offered = axis == .horizontal ? proposal.width : proposal.height
    if spreads, let offered, offered.isFinite { length = max(length, offered) }
    let thickness = max(minimumAcross, sizes.map(across).max() ?? .zero)
    return axis == .horizontal ? CGSize(width: length, height: thickness) : CGSize(width: thickness, height: length)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    let sizes = subviews.map { $0.sizeThatFits(.unspecified) }
    let lengths = sizes.map(along)
    let starts = Self.starts(lengths: lengths, length: along(bounds.size), padding: padding, gap: gap, spreads: spreads)
    for index in subviews.indices {
      let center = starts[index] + lengths[index] / 2
      let point =
        axis == .horizontal ? CGPoint(x: bounds.minX + center, y: bounds.midY) : CGPoint(x: bounds.midX, y: bounds.minY + center)
      subviews[index].place(at: point, anchor: .center, proposal: ProposedViewSize(sizes[index]))
    }
  }
}

// MARK: - Surface (TBR-1, TBR-3, TBR-4)

/// The container: floating, the variant's fill and elevation in its rounded shape (eased by the corner smoothing) with an
/// edge around the whole shape; docked, the fill and elevation reaching under the bottom and side system insets and an edge
/// across the top. Decorative: hidden from assistive technology, never hit.
private struct TanreiToolbarSurface: ViewModifier {
  let arrangement: TanreiToolbarArrangement
  @Environment(\.tanreiSystem) private var system
  @TanreiPalette private var colors

  func body(content: Content) -> some View {
    let surface = TanreiElevationSurface(arrangement.elevation, fill: colors[arrangement.containerColor], cornerRadius: arrangement.cornerRadius)
    if arrangement.isFloating {
      content
        .background { surface }
        .overlay {
          RoundedRectangle(cornerRadius: arrangement.cornerRadius, style: system.shape.roundedCornerStyle)
            .strokeBorder(colors[arrangement.outlineColor], lineWidth: arrangement.outlineWidth)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
        }
    } else {
      content
        // TBR-1: the full width of its parent.
        .frame(maxWidth: .infinity)
        // TBR-3: the color reaches the screen's bottom edge and the side edges; the items stay inside the insets.
        .background {
          surface.ignoresSafeArea(.container, edges: [.bottom, .horizontal])
        }
        // TBR-1: the top edge, inside the toolbar, over its items' surface.
        .overlay(alignment: .top) {
          Rectangle()
            .fill(colors[arrangement.outlineColor])
            .frame(height: arrangement.outlineWidth)
            .ignoresSafeArea(.container, edges: .horizontal)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
        }
    }
  }
}
