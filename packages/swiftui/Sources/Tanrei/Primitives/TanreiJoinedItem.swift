import SwiftUI

// The internal channel a button group reaches its items through (specs/button-group.spec.json BGR-2, BGR-3, BGR-4,
// BGR-7; one sentence each in BTN-10 and ICB-10). Not part of any public surface: `TanreiButton` and `TanreiIconButton`
// read `\.tanreiJoinedPlace`; outside a group it is `nil` and they draw exactly as they always have — the same views,
// the same modifiers.
//
// The group reaches in the ways the spec names and no other: when connected, the corners that face a neighbour and a
// minimum width, and every item stretched to the row's height; in either form, how far an item's hit area may reach
// sideways (to the middle of the gap, BGR-4) and that a Button's label is never narrowed below its longest word (BGR-7).
//
// A toolbar (specs/toolbar.spec.json) places its items through the same channel as an unconnected row (`TanreiJoinedPlace
// .row`): the hit area meets its neighbour's at the middle of the gap, above and below in a vertical toolbar (TBR-9), and
// the row is one Tab stop moved through with the arrow keys (`TanreiJoinedRoving`, `TanreiJoinedFocusStop`, TBR-10).

/// Where a button group has placed one of its items.
struct TanreiJoinedPlace: Equatable, Sendable {
  /// Connected (BGR-1 … BGR-3): inner corners, a minimum width, stretched to the tallest item.
  var isConnected: Bool
  /// The item faces a neighbour at its leading / trailing side (connected only: a standard item has no inner corner).
  var innerLeading: Bool
  var innerTrailing: Bool
  /// `comp.button-group.connected.inner-shape`.
  var innerRadius: CGFloat
  /// BGR-3: the item's least VISIBLE width when connected — the platform's target (`TanreiHitTarget.minimum`) —, 0 in a
  /// standard group.
  var minimumWidth: CGFloat
  /// BGR-4: how far the item's hit area may reach past its visible bounds at its leading / trailing side — half the gap
  /// toward a neighbour, without limit at an end of the row. Along `axis`: in a column, above / below.
  var reachLeading: CGFloat
  var reachTrailing: CGFloat
  /// The direction the row runs: `.vertical` in a vertical toolbar (TBR-6, TBR-9), where the reach is limited above and
  /// below and the hit area is the full target sideways. A button group's row is always horizontal.
  var axis: Axis = .horizontal
  /// A row that is one Tab stop, moved through with the arrow keys (a toolbar, TBR-10); `nil` in a button group, whose
  /// items are each their own stop.
  var roving: TanreiJoinedRoving? = nil

  /// The place of item `index` of `count`, in reading order.
  static func item(at index: Int, of count: Int, isConnected: Bool, gap: CGFloat, innerRadius: CGFloat, target: CGFloat) -> TanreiJoinedPlace {
    let isFirst = index == 0
    let isLast = index == count - 1
    return TanreiJoinedPlace(
      isConnected: isConnected,
      innerLeading: isConnected && !isFirst,
      innerTrailing: isConnected && !isLast,
      innerRadius: innerRadius,
      minimumWidth: isConnected ? target : .zero,
      reachLeading: isFirst ? .infinity : gap / 2,
      reachTrailing: isLast ? .infinity : gap / 2)
  }

  /// The place of item `index` of `count` in a row that restyles nothing (a toolbar, TBR-9): no inner corner, no minimum
  /// width; the hit area reaches toward a neighbour no further than the middle of the space between their visible bounds
  /// (`before` / `after`, `nil` where there is no neighbour: without limit), along `axis`.
  static func row(at index: Int, of count: Int, axis: Axis, before: CGFloat?, after: CGFloat?, roving: TanreiJoinedRoving?) -> TanreiJoinedPlace {
    TanreiJoinedPlace(
      isConnected: false, innerLeading: false, innerTrailing: false, innerRadius: .zero, minimumWidth: .zero,
      reachLeading: index == 0 ? .infinity : max(before ?? .zero, .zero) / 2,
      reachTrailing: index == count - 1 ? .infinity : max(after ?? .zero, .zero) / 2,
      axis: axis, roving: roving)
  }

  /// BGR-2: the corners of an item whose own corners are `own` (its state's container shape): the inner radius at each
  /// side that faces a neighbour. `nil` when no side does — the item draws its own corners, as anywhere.
  func corners(own: CGFloat) -> TanreiSideCorners? {
    guard innerLeading || innerTrailing else { return nil }
    return TanreiSideCorners(leading: innerLeading ? innerRadius : own, trailing: innerTrailing ? innerRadius : own)
  }

  /// BGR-4: how far a hit area reaches past a visible width `visual` to be `target` wide — half of what is missing on
  /// each side, no more than the allowance of that side; the side that may reach further takes what the other cannot.
  static func reach(visual: CGFloat, target: CGFloat, leading allowLeading: CGFloat, trailing allowTrailing: CGFloat) -> (leading: CGFloat, trailing: CGFloat) {
    let missing = max(.zero, target - visual)
    let first = min(missing / 2, allowLeading)
    let trailing = min(missing - first, allowTrailing)
    let leading = min(missing - trailing, allowLeading)
    return (leading, trailing)
  }
}

private struct TanreiJoinedPlaceKey: EnvironmentKey {
  static let defaultValue: TanreiJoinedPlace? = nil
}

private struct TanreiInJoinedRowKey: EnvironmentKey {
  static let defaultValue = false
}

private struct TanreiJoinedSizeKey: EnvironmentKey {
  static let defaultValue: CGSize? = nil
}

extension EnvironmentValues {
  /// The place a button group gave the Tanrei button this is read in; `nil` outside a group, and inside an item's own
  /// label or icon.
  ///
  /// The group sets it on each of its items as it lays them out (`_VariadicView` children). SwiftUI evaluates the body of
  /// such an item — and every view its body reaches without passing a container — where the item was WRITTEN, before the
  /// group gave it its place, so a read there sees `nil`. A Tanrei button in a group therefore reads it only below a
  /// container (`TanreiButtonTarget`); its own body reads `tanreiInJoinedRow`, which the group sets around all its
  /// content.
  var tanreiJoinedPlace: TanreiJoinedPlace? {
    get { self[TanreiJoinedPlaceKey.self] }
    set { self[TanreiJoinedPlaceKey.self] = newValue }
  }

  /// Whether the Tanrei button this is read in is an item of a button group: set by the group around all of its content,
  /// so it is right in an item's own body. `false` inside an item's label or icon.
  var tanreiInJoinedRow: Bool {
    get { self[TanreiInJoinedRowKey.self] }
    set { self[TanreiInJoinedRowKey.self] = newValue }
  }

  /// The size a grouped item's layout was given (its sizing copy's), handed to the control that draws it; `nil`
  /// elsewhere — the sizing copy itself included.
  var tanreiJoinedSize: CGSize? {
    get { self[TanreiJoinedSizeKey.self] }
    set { self[TanreiJoinedSizeKey.self] = newValue }
  }
}

/// A grouped item's container, drawn at the size the group laid the item out at (`tanreiJoinedSize`): a connected item
/// stretched to the tallest (BGR-1), a Button narrowed (BGR-7). A stretching container fills whatever height it is
/// proposed, and the control is proposed its own, larger, hit-area size again once laid out; a size fixed from the item's
/// layout cannot drift with that. Anywhere else nothing.
struct TanreiJoinedSizeFrame: ViewModifier {
  @Environment(\.tanreiJoinedSize) private var size

  func body(content: Content) -> some View {
    if let size {
      content.frame(width: size.width, height: size.height)
    } else {
      content
    }
  }
}

/// The hit target of a Tanrei Button or icon button: `TanreiMinimumHitTarget` anywhere; in a button group, the same
/// sizing copy and control, below a container — so that everything in them reads the place the group gave the item (see
/// `tanreiJoinedPlace`) — and with the control told the size its sizing copy was given (`tanreiJoinedSize`), so that it
/// draws at exactly the size the group laid the item out at: stretched to the tallest (BGR-1), narrowed (BGR-7). A
/// container that stretches fills whatever it is proposed, and a control is proposed its own, larger, hit-area size again
/// once laid out; a size read from the item's layout cannot drift with that. A one-child `VStack` changes neither size,
/// position nor alignment guides.
struct TanreiButtonTarget<Sizing: View, Control: View>: View {
  let inJoinedRow: Bool
  @ViewBuilder let sizing: Sizing
  @ViewBuilder let control: Control

  var body: some View {
    if inJoinedRow {
      VStack(spacing: .zero) {
        sizing
          .hidden()
          .allowsHitTesting(false)
          .accessibilityHidden(true)
          .overlay(alignment: .center) {
            GeometryReader { geometry in
              control
                .environment(\.tanreiJoinedSize, geometry.size)
                .frame(width: geometry.size.width, height: geometry.size.height)
            }
          }
      }
    } else {
      TanreiMinimumHitTarget { sizing } control: { control }
    }
  }
}

extension View {
  /// An item's own content — a label, an icon — is not an item of the group.
  func tanreiOutsideJoinedRow() -> some View {
    environment(\.tanreiJoinedPlace, nil).environment(\.tanreiInJoinedRow, false).environment(\.tanreiJoinedSize, nil)
  }
}

/// Marks a view as a Tanrei Button or icon button to the button group that holds it (BGR-10: anything else is reported).
struct TanreiJoinedItemKey: _ViewTraitKey {
  static let defaultValue = false
}

// MARK: - Corners (BGR-2)

/// The corners of a container whose leading and trailing corners differ — a joined item's (BGR-2): both corners of a side
/// share one radius.
struct TanreiSideCorners: Equatable, Sendable {
  var leading: CGFloat
  var trailing: CGFloat

  /// The corners of a line `outset` outside the container, concentric with its own (a focus ring, a shadow's spread);
  /// never negative.
  func grown(by outset: CGFloat) -> TanreiSideCorners {
    TanreiSideCorners(leading: max(leading + outset, .zero), trailing: max(trailing + outset, .zero))
  }
}

/// A rectangle with one radius at its leading corners and another at its trailing ones, eased as `style` says
/// (`sys.shape.corner-smoothing`, BTN-10). Like `RoundedRectangle`, a radius larger than half the shorter side is held
/// there, so a pill's end stays a half circle however tall the item grows (BGR-1 stretches it). It mirrors in a
/// right-to-left layout, as every shape does, so the leading corners are on the right there (BGR-8).
struct TanreiSideRoundedRectangle: InsettableShape {
  var corners: TanreiSideCorners
  var style: RoundedCornerStyle
  var insetAmount: CGFloat = .zero

  init(_ corners: TanreiSideCorners, style: RoundedCornerStyle) {
    self.corners = corners
    self.style = style
  }

  nonisolated var animatableData: AnimatablePair<CGFloat, CGFloat> {
    get { AnimatablePair(corners.leading, corners.trailing) }
    set { corners = TanreiSideCorners(leading: newValue.first, trailing: newValue.second) }
  }

  nonisolated func path(in rect: CGRect) -> Path {
    let rect = rect.insetBy(dx: insetAmount, dy: insetAmount)
    guard rect.width > 0, rect.height > 0 else { return Path() }
    let limit = min(rect.width, rect.height) / 2
    let leading = min(max(corners.leading - insetAmount, .zero), limit)
    let trailing = min(max(corners.trailing - insetAmount, .zero), limit)
    return UnevenRoundedRectangle(
      topLeadingRadius: leading, bottomLeadingRadius: leading, bottomTrailingRadius: trailing, topTrailingRadius: trailing, style: style
    ).path(in: rect)
  }

  nonisolated func inset(by amount: CGFloat) -> TanreiSideRoundedRectangle {
    var shape = self
    shape.insetAmount += amount
    return shape
  }
}

// MARK: - Width (BGR-3)

/// BGR-3: a connected item is at least `place.minimumWidth` wide, its content centred; anywhere else nothing. Never
/// narrower than its content, whatever it is proposed — which `.frame(minWidth:)` would be: its width follows a proposal
/// smaller than the content.
struct TanreiJoinedMinimumWidth: ViewModifier {
  let place: TanreiJoinedPlace?

  func body(content: Content) -> some View {
    if let place, place.minimumWidth > .zero {
      TanreiMinimumWidthLayout(minimum: place.minimumWidth) { content }
    } else {
      content
    }
  }
}

/// Its one subview, at least `minimum` wide and centred.
private struct TanreiMinimumWidthLayout: Layout {
  let minimum: CGFloat

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    guard let content = subviews.first else { return .zero }
    let size = content.sizeThatFits(proposal)
    return CGSize(width: max(size.width, minimum), height: size.height)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    subviews.first?.place(at: CGPoint(x: bounds.midX, y: bounds.midY), anchor: .center, proposal: proposal)
  }
}

// MARK: - Hit area (BGR-3, BGR-4)

/// A grouped item's hit area, in place of `tanreiHitTargetExpansion()`: the minimum target above and below as anywhere
/// (BTN-5, ICB-5), and sideways no further than the group allows (`TanreiJoinedPlace.reach…`), so that a press on an
/// item's visible bounds is always that item's and a press in a gap goes to the nearer item (BGR-4).
///
/// Subviews: the hit area (a clear view with an interaction shape), then the visual. The frame stays centred on the
/// visual — the item's `TanreiMinimumHitTarget` centres it over its sizing copy — and is as wide as the larger reach
/// on both sides; only the hit area is uneven. In a column (`place.axis` vertical, a vertical toolbar, TBR-9) the same
/// holds above and below, and the hit area is the minimum target wide.
struct TanreiJoinedHitLayout: Layout {
  let minimum: CGFloat
  let place: TanreiJoinedPlace

  private func reach(_ visual: CGSize) -> (leading: CGFloat, trailing: CGFloat) {
    let along = place.axis == .horizontal ? visual.width : visual.height
    return TanreiJoinedPlace.reach(visual: along, target: minimum, leading: place.reachLeading, trailing: place.reachTrailing)
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    guard subviews.count == 2 else { return .zero }
    let visual = subviews[1].sizeThatFits(proposal)
    let reach = reach(visual)
    if place.axis == .vertical {
      return CGSize(width: max(visual.width, minimum), height: visual.height + 2 * max(reach.leading, reach.trailing))
    }
    return CGSize(width: visual.width + 2 * max(reach.leading, reach.trailing), height: max(visual.height, minimum))
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    guard subviews.count == 2 else { return }
    let visual = subviews[1].sizeThatFits(proposal)
    let reach = reach(visual)
    if place.axis == .vertical {
      let width = max(visual.width, minimum)
      subviews[0].place(
        at: CGPoint(x: bounds.midX - width / 2, y: bounds.midY - visual.height / 2 - reach.leading), anchor: .topLeading,
        proposal: ProposedViewSize(width: width, height: visual.height + reach.leading + reach.trailing))
    } else {
      let height = max(visual.height, minimum)
      subviews[0].place(
        at: CGPoint(x: bounds.midX - visual.width / 2 - reach.leading, y: bounds.midY - height / 2), anchor: .topLeading,
        proposal: ProposedViewSize(width: visual.width + reach.leading + reach.trailing, height: height))
    }
    subviews[1].place(at: CGPoint(x: bounds.midX, y: bounds.midY), anchor: .center, proposal: ProposedViewSize(visual))
  }
}

extension View {
  /// The end of a Tanrei button's style body: `tanreiHitTargetExpansion()` outside a group, the group's hit area inside
  /// one (BGR-4).
  @ViewBuilder
  func tanreiJoinedHitTarget(_ place: TanreiJoinedPlace?, minimum: CGFloat) -> some View {
    if let place {
      TanreiJoinedHitLayout(minimum: minimum, place: place) {
        Color.clear.contentShape(.interaction, Rectangle())
        self
      }
    } else {
      tanreiHitTargetExpansion()
    }
  }
}

// MARK: - A Button's label (BGR-7)

/// A grouped Button's label: the text, never laid out narrower than its longest word, so a group that narrows its
/// Buttons wraps their labels between words and never inside one (BGR-7). SwiftUI's `Text` breaks a word it is given
/// less width than, and has no option against it, so the words are measured here: subviews are the text, then each word
/// in the text's style, hidden. A Button's width proposed as zero is therefore its longest word and its padding — the
/// least the group may give it.
struct TanreiWordFloorLayout: Layout {
  private func floor(_ subviews: Subviews) -> CGFloat {
    subviews.dropFirst().map { $0.sizeThatFits(.unspecified).width }.max() ?? .zero
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    guard let text = subviews.first else { return .zero }
    let width = proposal.width.map { max($0, floor(subviews)) }
    return text.sizeThatFits(ProposedViewSize(width: width, height: proposal.height))
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    guard let text = subviews.first else { return }
    text.place(at: bounds.origin, anchor: .topLeading, proposal: ProposedViewSize(width: bounds.width, height: bounds.height))
    for word in subviews.dropFirst() {
      word.place(at: bounds.origin, anchor: .topLeading, proposal: .unspecified)
    }
  }

  /// The words of a label, as a line may break between them.
  static func words(_ text: some StringProtocol) -> [String] {
    String(text).split(whereSeparator: { $0.isWhitespace }).map(String.init)
  }
}

// MARK: - One Tab stop (TBR-10)

/// A row whose items are one Tab stop (a toolbar, TBR-10), as its items see it: the row's shared state, where this item is
/// and how many there are. Equal when it is the same row's state at the same index.
struct TanreiJoinedRoving: Equatable, Sendable {
  let model: TanreiJoinedRovingModel
  let index: Int
  let count: Int

  static func == (lhs: TanreiJoinedRoving, rhs: TanreiJoinedRoving) -> Bool {
    lhs.model === rhs.model && lhs.index == rhs.index && lhs.count == rhs.count
  }
}

/// TBR-10 — the rules of a row that is one Tab stop, pure: which item is the stop and where a key moves focus.
enum TanreiJoinedRovingRules {
  /// The keys the row reads (the others are the item's own: Enter and Space activate it).
  static let keys: Set<KeyEquivalent> = [.leftArrow, .rightArrow, .upArrow, .downArrow, .home, .end]

  /// What `key` means along a row running along `axis`: `.downArrow` the next item, `.upArrow` the previous one, `.home` and
  /// `.end` the first and last — Right and Left Arrow in a row (swapped right to left), Down and Up Arrow in a column;
  /// `nil` for a key the row does not read.
  static func movement(_ key: KeyEquivalent, axis: Axis, layoutDirection: LayoutDirection) -> KeyEquivalent? {
    switch key {
    case .home, .end:
      return key
    case .rightArrow where axis == .horizontal:
      return layoutDirection == .leftToRight ? .downArrow : .upArrow
    case .leftArrow where axis == .horizontal:
      return layoutDirection == .leftToRight ? .upArrow : .downArrow
    case .downArrow where axis == .vertical, .upArrow where axis == .vertical:
      return key
    default:
      return nil
    }
  }

  /// The Tab stop: the item that had keyboard focus last while it is there and enabled, else the first enabled item;
  /// `nil` when none is enabled.
  static func tabStop(last: Int?, enabled: [Bool]) -> Int? {
    if let last, enabled.indices.contains(last), enabled[last] { return last }
    return enabled.firstIndex(of: true)
  }

  /// Where `movement` (see `movement(_:axis:layoutDirection:)`) goes from `index`: the next or previous enabled item,
  /// wrapping at the ends, or the first or last enabled item; disabled items are skipped.
  static func target(for movement: KeyEquivalent, from index: Int, enabled: [Bool]) -> Int? {
    TanreiRovingKeys(wraps: true).target(for: movement, from: index, in: enabled.map { TanreiRovingItem(focusable: $0, label: "") })
  }
}

/// A row's state for its one Tab stop: which items are enabled (as they report it, `TanreiJoinedRovingEntriesKey`), the
/// item focused last, and each item's way to take focus.
@MainActor
@Observable
final class TanreiJoinedRovingModel {
  /// Whether each item takes focus, by index; an item not reported yet counts as enabled.
  private(set) var enabled: [Int: Bool] = [:]
  /// The item that had keyboard focus last (TBR-10); also what a scrolling row brings into view (TBR-8).
  private(set) var last: Int?
  @ObservationIgnored private var actions: [Int: @MainActor () -> Void] = [:]

  func update(_ enabled: [Int: Bool]) {
    guard enabled != self.enabled else { return }
    self.enabled = enabled
  }

  /// Called by an item each time it is drawn (not observed: registering never redraws anything).
  func register(_ index: Int, focus: @escaping @MainActor () -> Void) {
    actions[index] = focus
  }

  func flags(count: Int) -> [Bool] {
    (0..<count).map { enabled[$0] ?? true }
  }

  func isTabStop(_ index: Int, count: Int) -> Bool {
    TanreiJoinedRovingRules.tabStop(last: last, enabled: flags(count: count)) == index
  }

  /// An item took keyboard focus — by Tab, by an arrow key, or programmatically.
  func didFocus(_ index: Int) {
    if last != index { last = index }
  }

  /// TBR-10: moves keyboard focus by `movement` from item `index` of `count`, never activating anything. The target becomes
  /// the Tab stop at once and takes focus once it can (it is focusable only as the stop). Whether the row used the key.
  @discardableResult
  func move(from index: Int, count: Int, movement: KeyEquivalent) -> Bool {
    guard let target = TanreiJoinedRovingRules.target(for: movement, from: index, enabled: flags(count: count)) else { return false }
    last = target
    if target != index, let action = actions[target] {
      Task { @MainActor in action() }
    }
    return true
  }
}

/// What the items of a row that is one Tab stop report: whether each, by index, is enabled.
struct TanreiJoinedRovingEntriesKey: PreferenceKey {
  static var defaultValue: [Int: Bool] { [:] }
  static func reduce(value: inout [Int: Bool], nextValue: () -> [Int: Bool]) {
    value.merge(nextValue()) { $1 }
  }
}

/// TBR-10: a Tanrei Button or icon button as an item of a row that is one Tab stop — focusable only as the stop, the
/// row's arrow keys and Home / End, and its focus and enabled state reported to the row; anywhere else (a button group,
/// alone) nothing. Applied to the item's `Button`, below `TanreiButtonTarget`'s container, where the row's place is known.
/// `focus` gives the item keyboard focus.
struct TanreiJoinedFocusStop: ViewModifier {
  let isFocused: Bool
  let focus: @MainActor () -> Void

  @Environment(\.tanreiJoinedPlace) private var place
  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.layoutDirection) private var layoutDirection

  func body(content: Content) -> some View {
    if let place, let roving = place.roving {
      let _ = roving.model.register(roving.index, focus: focus)
      content
        .focusable(roving.model.isTabStop(roving.index, count: roving.count))
        .onKeyPress(keys: TanreiJoinedRovingRules.keys, phases: .down) { press in
          guard isEnabled, press.modifiers.isDisjoint(with: [.command, .option, .control]),
            let movement = TanreiJoinedRovingRules.movement(press.key, axis: place.axis, layoutDirection: layoutDirection)
          else { return .ignored }
          return roving.model.move(from: roving.index, count: roving.count, movement: movement) ? .handled : .ignored
        }
        .onChange(of: isFocused, initial: true) { _, focused in
          if focused { roving.model.didFocus(roving.index) }
        }
        .preference(key: TanreiJoinedRovingEntriesKey.self, value: [roving.index: isEnabled])
    } else {
      content
    }
  }
}
