import SwiftUI

// Spec: specs/button-group.spec.json — tokens: TanreiButtonGroupTokens (comp.button-group), read from the design system
// in the environment (`system.buttonGroup`): the standard gap, the connected gap and the connected inner corner. The
// group draws nothing of its own: its items are Tanrei Buttons and icon buttons, drawn from their own tokens (BGR-5).
// It reaches into them through the internal channel of `TanreiJoinedItem.swift` (BTN-10, ICB-10), and only there.

/// How a button group lays out its buttons (spec prop `variant`). A closed set: the two forms differ in structure — which
/// corners the group sets — not only in values, so a design system does not add one.
public enum TanreiButtonGroupVariant: String, CaseIterable, Sendable {
  /// The buttons spaced apart by `comp.button-group.standard.gap`, each drawn as it is anywhere.
  case standard
  /// The buttons joined into one shape: `comp.button-group.connected.gap` apart, the corners where two meet rounded to
  /// `connected.inner-shape`, each at least a target wide and all as tall as the tallest. For a closely related set
  /// (Bold, Italic, Underline; Previous, Today, Next).
  case connected

  /// The variant a spec value names, for UI built from data (`"standard"`, `"connected"`). BGR-9: any other name is
  /// `.standard`, the default, and is reported in debug builds (`TanreiDiagnostics`).
  public init(named name: String) {
    if let variant = TanreiButtonGroupVariant(rawValue: name) {
      self = variant
    } else {
      TanreiDiagnostics.report("Tanrei: a button group has no variant \"\(name)\"; using \"standard\" (BGR-9)")
      self = .standard
    }
  }
}

/// Lays out a few related buttons and icon buttons in one row, spaced apart or joined into one shape, and names them as a
/// group.
///
///     TanreiButtonGroup {
///       TanreiButton("Cancel", variant: .outlined, action: cancel)
///       TanreiButton("Publish", action: publish)
///     }
///     TanreiButtonGroup(variant: .connected, label: "Text style") {
///       TanreiIconButton("Bold", isSelected: $bold, variant: .tonal) { Image(systemName: "bold") }
///       TanreiIconButton("Italic", isSelected: $italic, variant: .tonal) { Image(systemName: "italic") }
///     }
///
/// The content is `TanreiButton`s and `TanreiIconButton`s, toggles included, as anywhere (`ForEach` and `if` work): each
/// keeps its own tokens, states, action, accessibility and keyboard focus (BGR-5). Give every button of a group the same
/// size. Anything else, or fewer than two items, still renders and is reported in debug builds (BGR-10). A row wider than
/// the space it is given narrows its Buttons — their labels wrap — and never wraps onto a second line (BGR-7).
public struct TanreiButtonGroup<Content: View>: View {
  private let variant: TanreiButtonGroupVariant
  private let label: Text?
  private let content: Content

  @Environment(\.tanreiSystem) private var system

  /// A button group; `label` names it to assistive technology ("Text style") — leave it empty for a group whose items are
  /// named well enough by themselves.
  public init(variant: TanreiButtonGroupVariant = .standard, label: LocalizedStringKey = "", @ViewBuilder content: () -> Content) {
    self.variant = variant
    self.label = label == "" ? nil : Text(label)
    self.content = content()
  }

  /// A button group named by a string.
  public init<S: StringProtocol>(variant: TanreiButtonGroupVariant = .standard, label: S, @ViewBuilder content: () -> Content) {
    self.variant = variant
    self.label = label.isEmpty ? nil : Text(label)
    self.content = content()
  }

  public var body: some View {
    let arrangement = TanreiButtonGroupArrangement(tokens: system.buttonGroup, variant: variant, target: TanreiHitTarget.minimum(in: system.measure))
    _VariadicView.Tree(TanreiButtonGroupRoot(arrangement: arrangement)) { content }
      .environment(\.tanreiInJoinedRow, true)
      .modifier(TanreiButtonGroupSemantics(label: label))
  }
}

// MARK: - Token bindings

/// What a group of one variant reads from its tokens: pure data, so the bindings can be tested without rendering.
struct TanreiButtonGroupArrangement: Equatable {
  let variant: TanreiButtonGroupVariant
  /// BGR-1: the space between two items' visible bounds.
  let gap: CGFloat
  /// BGR-2: the radius of a corner that faces a neighbour (connected only).
  let innerRadius: CGFloat
  /// BGR-3: the platform's target — `sys.target.pointer` on macOS, `sys.target.touch` everywhere else.
  let target: CGFloat

  init(tokens: TanreiButtonGroupTokens, variant: TanreiButtonGroupVariant, target: CGFloat) {
    self.variant = variant
    gap = variant == .connected ? tokens.connectedGap : tokens.standardGap
    innerRadius = tokens.connectedInnerShape
    self.target = target
  }

  var isConnected: Bool { variant == .connected }

  /// The place of each of `count` items, in reading order (BGR-2, BGR-3, BGR-4, BGR-11: recomputed from the items there
  /// are, whenever they change).
  func places(count: Int) -> [TanreiJoinedPlace] {
    (0..<count).map { TanreiJoinedPlace.item(at: $0, of: count, isConnected: isConnected, gap: gap, innerRadius: innerRadius, target: target) }
  }

  /// BGR-10: what a debug build reports about the content. `kinds[i]` is whether item `i` is a Tanrei Button or icon button.
  static func problems(kinds: [Bool]) -> [String] {
    var problems: [String] = []
    if kinds.count < 2 {
      problems.append("Tanrei: a button group holds \(kinds.count) item\(kinds.count == 1 ? "" : "s"); a button group holds two or more (BGR-10)")
    }
    let foreign = kinds.indices.filter { !kinds[$0] }
    if !foreign.isEmpty {
      problems.append(
        "Tanrei: a button group holds content that is not a TanreiButton or TanreiIconButton (item \(foreign.map { String($0 + 1) }.joined(separator: ", "))); it is laid out, but its corners and width are its own (BGR-10)")
    }
    return problems
  }

  /// BGR-7: the widths the items are given in a row `available` wide (`nil`: unbounded) — each at its `natural` width; if
  /// the row is wider, every item that can shrink narrows in proportion to its width, none below its `least` (a Button's
  /// longest word, an icon button's own width). The row is never wrapped; one that still does not fit keeps the least
  /// widths.
  static func widths(natural: [CGFloat], least: [CGFloat], gap: CGFloat, available: CGFloat?) -> [CGFloat] {
    var widths = natural
    guard let available, available.isFinite, !natural.isEmpty else { return widths }
    let gaps = gap * CGFloat(natural.count - 1)
    // Each pass either fits the row or holds one more item at its least width, so `count` passes are enough.
    for _ in natural.indices {
      let excess = widths.reduce(.zero, +) + gaps - available
      guard excess > Self.tolerance else { break }
      let room = widths.indices.filter { widths[$0] > least[$0] + Self.tolerance }
      guard !room.isEmpty else { break }
      let weight = room.reduce(CGFloat.zero) { $0 + widths[$1] }
      var held = false
      for i in room {
        let narrowed = widths[i] - excess * widths[i] / weight
        if narrowed < least[i] {
          widths[i] = least[i]
          held = true
        } else {
          widths[i] = narrowed
        }
      }
      if !held { break }
    }
    return widths
  }

  /// Layout slack: a width within this of another is the same width (text measures in fractions of a point).
  static let tolerance: CGFloat = 0.5
}

// MARK: - Accessibility (BGR-6)

/// BGR-6: with a label the group is one container named by it, holding its items; without one it adds nothing to the
/// accessibility tree, only its items.
struct TanreiButtonGroupSemantics: ViewModifier {
  let label: Text?

  func body(content: Content) -> some View {
    if let label {
      content
        .accessibilityElement(children: .contain)
        .accessibilityLabel(label)
    } else {
      content
    }
  }
}

// MARK: - Content

/// Reads the group's items — whatever the view builder made of `ForEach` and `if` — and gives each its place (BGR-2 …
/// BGR-4), then lays them out in one row (BGR-1, BGR-7). Its body runs again whenever the items change, so an item that
/// is added, removed or disabled changes the other items' corners at once (BGR-11).
private struct TanreiButtonGroupRoot: _VariadicView_UnaryViewRoot {
  let arrangement: TanreiButtonGroupArrangement

  func body(children: _VariadicView.Children) -> some View {
    // BGR-10: reported in debug builds; the content is drawn all the same.
    TanreiButtonGroupArrangement.problems(kinds: children.map { $0[TanreiJoinedItemKey.self] }).forEach { TanreiDiagnostics.report($0) }
    let places = arrangement.places(count: children.count)
    let indices = Dictionary(uniqueKeysWithValues: children.enumerated().map { ($0.element.id, $0.offset) })
    return TanreiButtonGroupLayout(gap: arrangement.gap, stretches: arrangement.isConnected) {
      ForEach(children) { child in
        child.environment(\.tanreiJoinedPlace, indices[child.id].map { places[$0] })
      }
    }
  }
}

// MARK: - Layout (BGR-1, BGR-7, BGR-8)

/// The row: each item at its own visible width (a Tanrei button's layout size is its visual; its hit area overflows it),
/// `gap` apart, from the leading edge — SwiftUI mirrors the placement in a right-to-left layout, so the first item is on
/// the right there (BGR-8) —, every item centred on the row's middle; stretched to the tallest when `stretches`
/// (connected). A row wider than it is given narrows the items that can narrow (BGR-7); one that still does not fit
/// overflows its trailing end and is reported in debug builds.
struct TanreiButtonGroupLayout: Layout {
  let gap: CGFloat
  let stretches: Bool

  struct Row {
    var widths: [CGFloat]
    var sizes: [CGSize]
    var height: CGFloat
    /// The width the items and gaps need, and the least they could need.
    var width: CGFloat
    var leastWidth: CGFloat
  }

  func row(_ subviews: Subviews, available: CGFloat?) -> Row {
    let natural = subviews.map { $0.sizeThatFits(.unspecified).width }
    let least = subviews.indices.map { min(subviews[$0].sizeThatFits(ProposedViewSize(width: .zero, height: nil)).width, natural[$0]) }
    let widths = TanreiButtonGroupArrangement.widths(natural: natural, least: least, gap: gap, available: available)
    var sizes = subviews.indices.map { subviews[$0].sizeThatFits(ProposedViewSize(width: widths[$0], height: nil)) }
    let tallest = sizes.map(\.height).max() ?? .zero
    if stretches {
      sizes = subviews.indices.map { subviews[$0].sizeThatFits(ProposedViewSize(width: widths[$0], height: tallest)) }
    }
    let gaps = gap * CGFloat(max(subviews.count - 1, 0))
    return Row(
      widths: widths, sizes: sizes, height: sizes.map(\.height).max() ?? .zero, width: sizes.map(\.width).reduce(.zero, +) + gaps,
      leastWidth: least.reduce(.zero, +) + gaps)
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let row = row(subviews, available: proposal.width)
    // A row that does not fit takes what it is given and overflows it (BGR-7: never wrapped, never scrolled).
    return CGSize(width: proposal.width.map { min(row.width, $0) } ?? row.width, height: row.height)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    let row = row(subviews, available: bounds.width)
    // A row placed in no width at all is not shown (a collapsed container, a renderer's first pass): nothing to report.
    if bounds.width > .zero, row.width > bounds.width + TanreiButtonGroupArrangement.tolerance {
      TanreiDiagnostics.report(
        "Tanrei: a button group needs \(Int(row.width.rounded(.up))) points but has \(Int(bounds.width)); even with its Buttons at their longest words it overflows its end (BGR-7). Use fewer or shorter items.")
    }
    var x = bounds.minX
    for index in subviews.indices {
      let size = row.sizes[index]
      subviews[index].place(at: CGPoint(x: x, y: bounds.midY), anchor: .leading, proposal: ProposedViewSize(width: row.widths[index], height: size.height))
      x += size.width + gap
    }
  }
}
