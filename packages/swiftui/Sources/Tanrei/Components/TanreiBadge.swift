import SwiftUI

// Spec: specs/badge.spec.json — tokens: TanreiBadgeTokens (comp.badge), read from the design system in the environment
// (`system.badge`). Every design value in this file comes from a token; `TanreiBadge.defaultMax` is the spec's default
// for the `max` prop (a count, not a design value). A badge has no states and takes no input: it decorates its anchor.

/// Marks an anchor — an icon, an icon button, a navigation item, an avatar — with a dot or a small count.
///
///     TanreiBadge(count: nil, label: "New messages") { Image(systemName: "bell") }     // a dot
///     TanreiBadge(count: unread, label: "\(unread) unread") { inboxButton }            // a count; 0 shows nothing
///     Image(systemName: "bell").tanreiBadge(1200, label: "More than 999 unread")      // the same as a modifier: 999+
///
/// `count` chooses the form: `nil` draws the dot, 0 draws nothing, above 0 the number (above `max`, `max` followed by a
/// plus sign). The badge sits on the anchor's top-end corner, takes no space in the layout, and takes no input: a tap
/// on it reaches the anchor.
///
/// **Accessibility.** The drawn dot and number are hidden. `label` — or, when it is empty, the displayed count — becomes
/// the anchor's accessibility VALUE, so VoiceOver reads the anchor's own name followed by it ("Inbox, button, 3 unread").
/// The anchor should therefore be one accessibility element (an image with a label, a button); its own value, if it had
/// one, is replaced. A dot with no label tells assistive technology nothing and is reported in debug builds.
public struct TanreiBadge<Anchor: View>: View {
  /// The spec's default `max`: a larger count shows as `999+`.
  nonisolated public static var defaultMax: Int { 999 }

  private let count: Int?
  private let max: Int
  private let label: String
  private let anchor: Anchor

  @Environment(\.locale) private var locale

  /// - Parameters:
  ///   - count: how many things are waiting. `nil` draws the dot; 0 draws nothing and adds nothing; above 0 the number.
  ///   - max: the largest count shown as it is; a larger one shows as `max` followed by a plus sign.
  ///   - label: what assistive technology reads after the anchor's own name ("3 unread"). Empty reads the displayed
  ///     count; a dot needs one.
  ///   - anchor: what the badge sits on.
  public init(count: Int?, max: Int = TanreiBadge.defaultMax, label: String = "", @ViewBuilder anchor: () -> Anchor) {
    let resolved = TanreiBadgeInput(count: count, max: max, label: label)
    self.count = resolved.count
    self.max = resolved.max
    self.label = label
    self.anchor = anchor()
  }

  public var body: some View {
    let content = TanreiBadgeContent(count: count, max: max, locale: locale)
    // BDG-7: an overlay takes no space and never moves or resizes its anchor; the mark ignores input.
    return anchor
      .overlay(alignment: .topTrailing) {
        TanreiBadgeMark(content: content)
          .allowsHitTesting(false)
          // BDG-8: the drawn dot or number is never read; its words reach the anchor as its value.
          .accessibilityHidden(true)
      }
      // BDG-8, BDG-10: the value follows count and label as they change, and nothing is announced.
      .modifier(TanreiBadgeAccessibilityValue(value: content.accessibilityValue(label: label)))
  }
}

extension View {
  /// Marks this view with a badge: a dot (`count: nil`), nothing (0) or a count on its top-end corner. The same as
  /// wrapping it in `TanreiBadge(count:max:label:)`.
  public func tanreiBadge(_ count: Int?, max: Int = TanreiBadge<Self>.defaultMax, label: String = "") -> some View {
    TanreiBadge(count: count, max: max, label: label) { self }
  }
}

// MARK: - Content

/// The props after BDG-9 and BDG-14: what the badge draws from, and the reports of values it corrected.
struct TanreiBadgeInput: Equatable {
  let count: Int?
  let max: Int

  init(count: Int?, max: Int, label: String) {
    // BDG-14: a negative count renders as 0, a max below 1 is the default; both are reported in debug builds. (A count
    // that is not a whole number cannot be passed: the type is `Int`.)
    if let count, count < 0 {
      TanreiDiagnostics.report("Tanrei: a badge's count is \(count); a negative count renders as 0 (BDG-14)")
      self.count = 0
    } else {
      self.count = count
    }
    if max < 1 {
      TanreiDiagnostics.report("Tanrei: a badge's max is \(max); a max below 1 uses the default \(TanreiBadge<EmptyView>.defaultMax) (BDG-14)")
      self.max = TanreiBadge<EmptyView>.defaultMax
    } else {
      self.max = max
    }
    // BDG-9: still drawn, but a dot conveys its meaning by color and position only.
    if self.count == nil && label.isEmpty {
      TanreiDiagnostics.report("Tanrei: a badge dot has an empty label; it tells assistive technology nothing (BDG-9). Pass what it means (\"New messages\").")
    }
  }
}

/// What a badge draws: nothing, the dot, or the text of the count.
enum TanreiBadgeContent: Equatable {
  /// BDG-5: a count of 0.
  case none
  /// BDG-1: no count.
  case dot
  /// BDG-2, BDG-4, BDG-12: the count as displayed — in the locale's digits, with no grouping, capped at `max` + "+".
  case count(String)

  init(count: Int?, max: Int, locale: Locale) {
    guard let count else {
      self = .dot
      return
    }
    guard count > 0 else {
      self = .none
      return
    }
    // BDG-12: the locale's digits, no grouping separator (1000, never 1,000). BDG-4: above max, max and a plus sign.
    let format = IntegerFormatStyle<Int>.number.grouping(.never).locale(locale)
    self = .count(count > max ? "\(max.formatted(format))+" : count.formatted(format))
  }

  /// BDG-8: the words added to the anchor — the label, or without one the displayed text; BDG-5: nothing for 0, and
  /// nothing for a dot without a label (BDG-9 reports it).
  func accessibilityValue(label: String) -> String? {
    switch self {
    case .none: return nil
    case .dot: return label.isEmpty ? nil : label
    case .count(let text): return label.isEmpty ? text : label
    }
  }

  /// BDG-11: the displayed text isolated from the surrounding direction (U+2068 FIRST STRONG ISOLATE … U+2069 POP
  /// DIRECTIONAL ISOLATE), so a capped count keeps its plus sign after the digits in a right-to-left layout.
  var isolatedText: String? {
    guard case .count(let text) = self else { return nil }
    return "\u{2068}\(text)\u{2069}"
  }
}

// MARK: - Token bindings

/// Which token values a badge draws, and where. Pure data read from a `TanreiBadgeTokens`, so the bindings can be tested
/// without rendering.
struct TanreiBadgeAppearance: Equatable {
  let container: TanreiPaint
  let label: TanreiPaint
  let outline: TanreiPaint
  let outlineWidth: CGFloat
  let cornerRadius: CGFloat
  let dotSize: CGFloat
  let dotOffset: CGFloat
  let paddingInline: CGFloat
  let containerOffset: CGFloat
  /// BDG-2, BDG-13: the pill's height — `container.height`, or the label's line when enlarged text makes it taller —
  /// and its minimum width, so a single digit sits in a circle.
  let pillHeight: CGFloat

  /// - Parameter labelLineHeight: the label's line height as resolved for the current Dynamic Type size.
  init(tokens: TanreiBadgeTokens, labelLineHeight: CGFloat) {
    container = tokens.containerColor
    label = tokens.labelColor
    outline = tokens.outlineColor
    outlineWidth = tokens.outlineWidth
    cornerRadius = tokens.containerShape
    dotSize = tokens.dotSize
    dotOffset = tokens.dotOffset
    paddingInline = tokens.containerPaddingInline
    containerOffset = tokens.containerOffset
    pillHeight = Swift.max(tokens.containerHeight, labelLineHeight)
  }

  /// BDG-1: the dot's center sits `dot.offset` inside the anchor's top-end corner on both axes. BDG-3: the center of
  /// the pill's leading circle (a `height` square at its start) sits `container.offset` inside it, so a longer count
  /// grows toward the end. `height` is the mark's laid-out height, so the placement holds when enlarged text grows the
  /// pill (BDG-13). The mark is aligned `.topTrailing`: these are its trailing and top guides.
  func trailingGuide(for content: TanreiBadgeContent, height: CGFloat) -> CGFloat {
    height / 2 + (content == .dot ? dotOffset : containerOffset)
  }

  func topGuide(for content: TanreiBadgeContent, height: CGFloat) -> CGFloat {
    height / 2 - (content == .dot ? dotOffset : containerOffset)
  }
}

// MARK: - Drawing

/// The dot or the pill, placed on the anchor's top-end corner by alignment guides (an overlay aligned `.topTrailing`).
struct TanreiBadgeMark: View {
  let content: TanreiBadgeContent

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @TanreiPalette private var colors

  var body: some View {
    let tokens = theme.system.badge
    // BDG-13: the label's line at the current text size; the pill grows with it, the dot does not.
    let line = tokens.labelTypescale.resolved(policy: theme.fontFamilyPolicy, dynamicTypeSize: dynamicTypeSize).lineHeight
    let appearance = TanreiBadgeAppearance(tokens: tokens, labelLineHeight: line)
    // The guides are set on the whole mark: explicit alignment guides set inside one branch of a `switch` do not reach
    // the overlay.
    return shape(appearance)
      .alignmentGuide(.trailing) { d in appearance.trailingGuide(for: content, height: d.height) }
      .alignmentGuide(.top) { d in appearance.topGuide(for: content, height: d.height) }
  }

  @ViewBuilder
  private func shape(_ appearance: TanreiBadgeAppearance) -> some View {
    let style = theme.system.shape.roundedCornerStyle
    switch content {
    case .none:
      EmptyView()
    case .dot:
      // BDG-1: a circle of `dot.size` in the container color, no label.
      Circle()
        .fill(colors[appearance.container])
        .frame(width: appearance.dotSize, height: appearance.dotSize)
        // BDG-6: the outline is outside the edge; the dot's size and position do not change.
        .background(Circle().fill(colors[appearance.outline]).padding(-appearance.outlineWidth))
    case .count:
      // BDG-2: the label centered, `padding-inline` on each side, at least `height` high and as wide as it is high.
      Text(verbatim: content.isolatedText ?? "")
        // BDG-12: tabular figures where the font has them, so a changing count does not shift its neighbours.
        .monospacedDigit()
        .lineLimit(1)
        .fixedSize()
        .tanreiTextStyle(theme.system.badge.labelTypescale)
        .foregroundStyle(colors[appearance.label])
        .padding(.horizontal, appearance.paddingInline)
        .frame(minWidth: appearance.pillHeight, minHeight: appearance.pillHeight)
        // The overlay proposes the anchor's size; the pill takes its own, however small the anchor (BDG-7).
        .fixedSize()
        .background(RoundedRectangle(cornerRadius: appearance.cornerRadius, style: style).fill(colors[appearance.container]))
        // BDG-6: outside the edge, concentric with the corners; the pill's size and position do not change.
        .background(
          RoundedRectangle(cornerRadius: appearance.cornerRadius + appearance.outlineWidth, style: style)
            .fill(colors[appearance.outline])
            .padding(-appearance.outlineWidth))
    }
  }
}

/// BDG-8: the badge's words as the anchor's accessibility value; BDG-5: none for a count of 0.
private struct TanreiBadgeAccessibilityValue: ViewModifier {
  let value: String?

  func body(content: Content) -> some View {
    if #available(iOS 18, macOS 15, *) {
      // Leaves the anchor's own value alone while there is nothing to add.
      content.accessibilityValue(Text(verbatim: value ?? ""), isEnabled: value != nil)
    } else {
      content.accessibilityValue(Text(verbatim: value ?? ""))
    }
  }
}
