import SwiftUI

// Spec: specs/divider.spec.json — tokens: TanreiDividerTokens (comp.divider), read from the design system in the
// environment (`system.divider`). Every design value in this file comes from a token: the line's color, its thickness
// and the inset. The one number that is not a token is the device pixel (DIV-8), which is the screen's, not a design
// value. A divider has no states, no input and no container: it is one line.

/// How far a divider's line is shortened to line up with content (spec prop `inset`). A closed set: it is structural,
/// not a token axis, so a design system cannot add a value (it changes the length through `comp.divider.line.inset`).
public enum TanreiDividerInset: String, CaseIterable, Sendable {
  /// The full length of the container.
  case none
  /// Shortened at its start — the leading edge of a horizontal divider (the right one in right-to-left layouts), the
  /// top of a vertical one — to line up with an inset list's text.
  case start
  /// Shortened at both ends: a middle divider.
  case both

  /// The inset a spec value names, for UI built from data (`"none"`, `"start"`, `"both"`). DIV-7: any other name is
  /// `.none`, the default, and is reported in debug builds (`TanreiDiagnostics`).
  public init(named name: String) {
    if let inset = TanreiDividerInset(rawValue: name) {
      self = inset
    } else {
      TanreiDiagnostics.report("Tanrei: a divider has no inset \"\(name)\"; using \"none\" (DIV-7)")
      self = .none
    }
  }
}

extension Axis {
  /// The axis a divider's spec `orientation` names, for UI built from data (`"horizontal"`, `"vertical"`). DIV-7: any
  /// other name is `.horizontal`, the default, and is reported in debug builds (`TanreiDiagnostics`).
  public init(tanreiDividerOrientation name: String) {
    switch name {
    case "horizontal": self = .horizontal
    case "vertical": self = .vertical
    default:
      TanreiDiagnostics.report("Tanrei: a divider has no orientation \"\(name)\"; using \"horizontal\" (DIV-7)")
      self = .horizontal
    }
  }
}

/// Separates groups of content in a list, a layout or a toolbar with a thin line.
///
///     VStack(spacing: system.space.space100) {
///       row
///       TanreiDivider()                                  // horizontal, full width, decorative
///       row
///     }
///     HStack { group; TanreiDivider(axis: .vertical, inset: .both); group }
///     TanreiDivider(isDecorative: false)                 // a separator assistive technology is told about
///
/// A horizontal divider fills the width its layout proposes and is exactly `comp.divider.line.thickness` high; a
/// vertical one fills the height and is that thick (DIV-1, DIV-2). SwiftUI's own `Divider` takes its axis from the
/// enclosing stack; this one states it, so it looks the same wherever it is placed. It adds no space around itself:
/// the gap belongs to the layout that places it.
public struct TanreiDivider: View {
  private let axis: Axis
  private let inset: TanreiDividerInset
  private let isDecorative: Bool

  @Environment(\.tanreiSystem) private var system
  @Environment(\.displayScale) private var displayScale
  @TanreiPalette private var colors

  /// - Parameters:
  ///   - axis: the spec's `orientation` — `.horizontal` (default) separates stacked content, `.vertical` content in a row.
  ///   - inset: shortens the line at its start or at both ends by `comp.divider.line.inset`.
  ///   - isDecorative: `true` (default) hides the divider from assistive technology; `false` exposes it as a separator,
  ///     for groups whose grouping is meaningful (a toolbar's, a menu's).
  public init(axis: Axis = .horizontal, inset: TanreiDividerInset = .none, isDecorative: Bool = true) {
    self.axis = axis
    self.inset = inset
    self.isDecorative = isDecorative
  }

  public var body: some View {
    let appearance = TanreiDividerAppearance(tokens: system.divider, axis: axis, inset: inset, displayScale: displayScale)
    // DIV-1 / DIV-2: the line fills the length its layout proposes and takes exactly its thickness across; no margin.
    // DIV-3 / DIV-4: the inset stretch is padding, so it draws nothing, and `.leading` is the start in either direction
    // (the right end of a horizontal divider in right-to-left layouts); a vertical divider's start is its top.
    Rectangle()
      .fill(colors[appearance.color])
      .frame(
        width: axis == .vertical ? appearance.thickness : nil,
        height: axis == .horizontal ? appearance.thickness : nil)
      .frame(maxWidth: axis == .horizontal ? .infinity : nil, maxHeight: axis == .vertical ? .infinity : nil)
      .padding(appearance.insetEdges, appearance.inset)
      // A divider takes no input (not a splitter): nothing it covers loses a tap.
      .allowsHitTesting(false)
      .modifier(TanreiDividerAccessibility(semantics: TanreiDividerSemantics(isDecorative: isDecorative, axis: axis)))
  }
}

// MARK: - Token bindings

/// Which token values a divider draws. Pure data read from a `TanreiDividerTokens`, so the bindings can be tested
/// without rendering.
struct TanreiDividerAppearance: Equatable {
  /// `comp.divider.line.color`.
  let color: TanreiPaint
  /// `comp.divider.line.thickness`, snapped to whole device pixels and never below one (DIV-8).
  let thickness: CGFloat
  /// `comp.divider.line.inset`, or 0 when the inset is `.none`.
  let inset: CGFloat
  /// The ends the inset shortens (DIV-3): none, the start, or both ends of the divider's own axis.
  let insetEdges: Edge.Set

  init(tokens: TanreiDividerTokens, axis: Axis, inset: TanreiDividerInset, displayScale: CGFloat) {
    color = tokens.lineColor
    thickness = Self.snapped(tokens.lineThickness, displayScale: displayScale)
    switch (inset, axis) {
    case (.none, _): insetEdges = []
    case (.start, .horizontal): insetEdges = .leading
    case (.start, .vertical): insetEdges = .top
    case (.both, .horizontal): insetEdges = .horizontal
    case (.both, .vertical): insetEdges = .vertical
    }
    self.inset = inset == .none ? 0 : tokens.lineInset
  }

  /// DIV-8: a whole number of device pixels, at least one — so a hairline is never spread over two partial rows or
  /// columns. SwiftUI places a view at whole device pixels, so a line of whole pixels is aligned to the grid.
  static func snapped(_ thickness: CGFloat, displayScale: CGFloat) -> CGFloat {
    let scale = displayScale > 0 ? displayScale : 1
    return max(1, (thickness * scale).rounded()) / scale
  }
}

// MARK: - Accessibility

/// What assistive technology is told about a divider (DIV-5, DIV-6).
enum TanreiDividerSemantics: Equatable {
  /// DIV-5: not in the accessibility tree.
  case hidden
  /// DIV-6: an element of its own, with no name, whose orientation is exposed. Neither UIKit nor SwiftUI has a
  /// separator role (SwiftUI's `Divider` is never exposed), so the orientation is the element's only attribute.
  case separator(Axis)

  init(isDecorative: Bool, axis: Axis) {
    self = isDecorative ? .hidden : .separator(axis)
  }

  /// DIV-5 / DIV-6: never focusable — a divider is not a control, exposed or not.
  var isFocusable: Bool { false }
}

private struct TanreiDividerAccessibility: ViewModifier {
  let semantics: TanreiDividerSemantics

  func body(content: Content) -> some View {
    switch semantics {
    case .hidden:
      content.accessibilityHidden(true)
    case .separator(let axis):
      content
        .accessibilityElement()
        .accessibilityValue(Text(verbatim: axis == .horizontal ? "horizontal" : "vertical"))
    }
  }
}
