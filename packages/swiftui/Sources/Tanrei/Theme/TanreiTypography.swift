import CoreText
import SwiftUI
#if os(iOS)
import UIKit
#endif

/// A `TanreiTextStyle` resolved to what SwiftUI needs: a font, tracking and the
/// extra leading that turns the font's natural line height into the token's.
public struct TanreiResolvedTextStyle {
  public let font: Font
  /// The size the glyphs are drawn at: the token size as Dynamic Type scales it.
  public let pointSize: CGFloat
  /// `pointSize` ÷ the token size: the ONE factor tracking and line height are scaled by as well.
  public let scale: CGFloat
  /// The numeric weight the font was built with: the token's, plus the family's emphasis step when `emphasized`.
  /// Dynamic Type never changes it.
  public let weight: CGFloat
  /// Whether the family's emphasis step was added to the weight. Nothing else differs from the plain resolution.
  public let emphasized: Bool
  public let tracking: CGFloat
  /// The token line height × `scale`.
  public let lineHeight: CGFloat
  /// Extra space between lines (`View.lineSpacing`). Never negative.
  public let lineSpacing: CGFloat
  /// Half of the extra leading, applied above and below so a single line is `lineHeight` tall.
  public let verticalInset: CGFloat
}

/// Dynamic Type for token sizes.
///
/// A token size is scaled the way the platform scales a font "relative to body": on iOS
/// `UIFontMetrics(forTextStyle: .body).scaledFont(for:)`, which lands on whole points. ONE number — that
/// size ÷ the token size — scales the glyphs, the tracking, the line box and a button's icon, and the
/// font is built AT that size (`fixedSize`), per Dynamic Type size read from the environment. So there is
/// one scaling, and a text keeps the token's proportion of line height to size at every Dynamic Type size.
///
/// Two ways that look simpler are wrong:
/// - `@ScaledMetric` of a constant 1 is `UIFontMetrics.scaledValue(for: 1)`, rounded to a device pixel:
///   1.0 from `xSmall` to `xLarge` on a 3× screen, so text does not follow Dynamic Type at all there —
///   what the accessibility audit reports as "Dynamic Type font sizes are partially unsupported".
/// - `Font.custom(_:size:relativeTo: .body)` lets SwiftUI scale the glyphs while Tanrei scales the line
///   box: two scalings. They agree for small sizes and DISAGREE by a point from 47pt up (measured on
///   iOS 26.5 with `Font.resolve(in:)`: 47pt at `accessibility5` draws at 132, `UIFontMetrics` says 133;
///   73.5pt at `xSmall` 63 vs 64; 39 such cases between 6pt and 96pt in half-point steps), and nothing
///   before iOS 26 can ask SwiftUI which size it chose. The audit does not need it: it is behavioural —
///   it flags a text whose size does not follow the content size category, however the font was made.
///
/// macOS has no Dynamic Type: no SwiftUI font changes with `dynamicTypeSize` there (tested), so the
/// size is the token's.
enum TanreiDynamicType {
  #if os(iOS)
  private struct Key: Hashable, Sendable {
    let size: CGFloat
    let category: String
  }
  private static let cache = TanreiLockedCache<Key, CGFloat>()
  #endif

  /// The point size the platform draws a font of token size `size` at.
  static func scaledPointSize(_ size: CGFloat, at dynamicTypeSize: DynamicTypeSize) -> CGFloat {
    #if os(iOS)
    guard size > 0 else { return size }
    let category = UIContentSizeCategory(dynamicTypeSize)
    return cache.value(for: Key(size: size, category: category.rawValue)) {
      UIFontMetrics(forTextStyle: .body)
        .scaledFont(for: UIFont.systemFont(ofSize: size), compatibleWith: UITraitCollection(preferredContentSizeCategory: category))
        .pointSize
    }
    #else
    return size
    #endif
  }

  /// `scaledPointSize` ÷ `size`: what everything that belongs to a text of that size is multiplied by.
  static func scale(forSize size: CGFloat, at dynamicTypeSize: DynamicTypeSize) -> CGFloat {
    guard size > 0 else { return 1 }
    return scaledPointSize(size, at: dynamicTypeSize) / size
  }
}

extension TanreiTextStyle {
  /// The nearest `Font.Weight` to the numeric token weight.
  ///
  /// SwiftUI only has the nine named weights, so 450 resolves to `.regular` and 550 to
  /// `.medium` (ties round down, toward the lighter weight). An app that bundles the
  /// variable font can apply the exact value through the `wght` variation axis instead.
  public var fontWeight: Font.Weight { Self.fontWeight(nearest: weight) }

  /// The nearest of SwiftUI's nine named weights to a numeric weight (ties round down).
  static func fontWeight(nearest weight: CGFloat) -> Font.Weight {
    let named: [(CGFloat, Font.Weight)] = [
      (100, .ultraLight), (200, .thin), (300, .light), (400, .regular), (500, .medium),
      (600, .semibold), (700, .bold), (800, .heavy), (900, .black),
    ]
    var best = named[0]
    for candidate in named where abs(candidate.0 - weight) < abs(best.0 - weight) {
      best = candidate
    }
    return best.1
  }

  /// This style emphasized: the same role with `emphasis[family]` — the step of the family it belongs
  /// to — added to its weight. Emphasis is a weight, not a role: size, tracking, line height and font are unchanged.
  /// Pass `system.typescale.emphasis`; the `tanreiTextStyle(_:emphasized:)` modifier reads it from the environment.
  public func emphasized(by emphasis: TanreiTypeEmphasis) -> TanreiTextStyle {
    var style = self
    style.weight = weight + emphasis[family]
    return style
  }

  /// The family this style is drawn in: `font.installedFamily`. `nil` = the platform font of `font.generic`.
  public var installedFamily: String? { font.installedFamily }

  /// Resolves the style at a Dynamic Type size. Size, tracking and line height are all multiplied by the
  /// same factor (`TanreiResolvedTextStyle.scale`), so the token's proportions hold at every size.
  ///
  /// `emphasis` is the system's `typescale.emphasis`: given, the family's step is added to the weight and nothing
  /// else changes. Weight is not scaled: Dynamic Type has one factor, and it is for sizes.
  public func resolved(
    policy: TanreiFontFamilyPolicy = .tokens,
    dynamicTypeSize: DynamicTypeSize = .large,
    emphasis: TanreiTypeEmphasis? = nil
  ) -> TanreiResolvedTextStyle {
    let pointSize = TanreiDynamicType.scaledPointSize(size, at: dynamicTypeSize)
    let scale = size > 0 ? pointSize / size : 1
    let weight = emphasis.map { self.weight + $0[self.family] } ?? self.weight
    let fontWeight = Self.fontWeight(nearest: weight)
    let family = policy == .tokens ? installedFamily : nil
    let font: Font
    let natural: CGFloat
    // Both fonts are built AT the scaled size: the one scaling there is (see `TanreiDynamicType`).
    if let family {
      font = Font.custom(family, fixedSize: pointSize).weight(fontWeight)
      natural = TanreiFontRegistry.naturalLineHeight(family: family, size: pointSize)
    } else {
      font = Font.system(size: pointSize, weight: fontWeight, design: self.font.generic.design)
      natural = TanreiFontRegistry.naturalLineHeight(family: nil, size: pointSize)
    }
    let scaledLineHeight = lineHeight * scale
    let extra = max(0, scaledLineHeight - natural)
    return TanreiResolvedTextStyle(
      font: font,
      pointSize: pointSize,
      scale: scale,
      weight: weight,
      emphasized: emphasis != nil,
      tracking: tracking * scale,
      lineHeight: scaledLineHeight,
      lineSpacing: extra,
      verticalInset: extra / 2
    )
  }
}

extension TanreiFontStack {
  /// The family to draw with, read the one way every platform reads it: when the stack
  /// asks for the platform's own font first (`system`), none; otherwise the first of the named
  /// `families` that is registered with this process (bundled by the app or installed). `nil` means
  /// the platform font of class `generic`. Tanrei never bundles a font and never parses a CSS
  /// keyword: the IR has already read the stack.
  public var installedFamily: String? {
    if system { return nil }
    return families.first { TanreiFontRegistry.isInstalled(family: $0) }
  }
}

extension TanreiFontGeneric {
  /// The platform font of this class.
  public var design: Font.Design {
    switch self {
    case .sansSerif: return .default
    case .serif: return .serif
    case .monospace: return .monospaced
    }
  }
}

/// Font lookups backed by CoreText. Results are cached; font registration after the
/// first lookup of a family is picked up only for families not asked about before.
enum TanreiFontRegistry {
  private static let cache = TanreiLockedCache<String, Bool>()

  static func isInstalled(family: String) -> Bool {
    cache.value(for: family) {
      let attributes = [kCTFontFamilyNameAttribute: family] as CFDictionary
      let descriptor = CTFontDescriptorCreateWithAttributes(attributes)
      guard let matches = CTFontDescriptorCreateMatchingFontDescriptors(descriptor, nil) as? [CTFontDescriptor] else {
        return false
      }
      return matches.contains { match in
        (CTFontDescriptorCopyAttribute(match, kCTFontFamilyNameAttribute) as? String)?
          .caseInsensitiveCompare(family) == .orderedSame
      }
    }
  }

  static func naturalLineHeight(family: String?, size: CGFloat) -> CGFloat {
    let font: CTFont
    if let family {
      font = CTFontCreateWithName(family as CFString, size, nil)
    } else {
      font = CTFontCreateUIFontForLanguage(.system, size, nil) ?? CTFontCreateWithName("Helvetica" as CFString, size, nil)
    }
    return CTFontGetAscent(font) + CTFontGetDescent(font) + CTFontGetLeading(font)
  }
}

final class TanreiLockedCache<Key: Hashable & Sendable, Value: Sendable>: @unchecked Sendable {
  private let lock = NSLock()
  private var storage: [Key: Value] = [:]

  func value(for key: Key, compute: () -> Value) -> Value {
    lock.lock()
    defer { lock.unlock() }
    if let hit = storage[key] { return hit }
    let value = compute()
    storage[key] = value
    return value
  }
}

/// Makes text exactly a whole number of token line heights tall.
///
/// `lineSpacing` only adds leading *between* lines, and the height SwiftUI gives a line is not
/// the CoreText ascent + descent the extra leading is estimated from: it rounds the metrics its
/// own way, by up to a point and a half depending on the size (14pt → 17, 15pt → 19). That
/// matters once a container adds padding around the label (a 20pt line + 2 × 6pt padding must be
/// 32pt, not 33.5). So the height of one line is not estimated: the layout measures a hidden
/// one-line reference in the same font, counts the lines of its content with it, and reports
/// `lines × lineHeight`, centring the content in it. Stateless, so it is right on the first
/// layout pass (snapshots).
///
/// The line box is for TEXT. It is applied to a label's text, never to a row that also holds an icon
/// (an icon taller than a line would be given leading and grow a button past its
/// token height). Content that turns out not to be text-sized keeps its own height and gets no leading.
struct TanreiLineBox: Layout {
  /// The token line height, already scaled for Dynamic Type.
  let lineHeight: CGFloat
  /// The leading `lineSpacing` adds between lines.
  let extraLeading: CGFloat

  /// Marks the hidden one-line reference among the subviews.
  struct IsLineReference: LayoutValueKey {
    static let defaultValue = false
  }

  /// SwiftUI rounds the height of a block of text, not of each line.
  static let roundingSlackPerLine: CGFloat = 1

  /// The height to report for content `content` tall, when one line of the font measures `line`.
  func height(forContentHeight content: CGFloat, measuredLine line: CGFloat) -> CGFloat {
    guard lineHeight > 0, line > 0 else { return content }
    let pitch = line + extraLeading
    let lines = max(1, ((content + extraLeading) / pitch).rounded())
    let textHeight = lines * pitch - extraLeading
    guard abs(content - textHeight) <= lines * Self.roundingSlackPerLine else {
      // Not text-sized: leading belongs to lines of text, so this content keeps its own height.
      return max(content, lineHeight)
    }
    // A font taller than the token line height is never clipped.
    return max(lines * lineHeight, content)
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    var size = CGSize.zero
    var line: CGFloat = 0
    for subview in subviews {
      if subview[IsLineReference.self] {
        line = subview.sizeThatFits(.unspecified).height
        continue
      }
      let fit = subview.sizeThatFits(proposal)
      size.width = max(size.width, fit.width)
      size.height = max(size.height, fit.height)
    }
    return CGSize(width: size.width, height: height(forContentHeight: size.height, measuredLine: line))
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    let inner = ProposedViewSize(width: bounds.width, height: proposal.height)
    for subview in subviews {
      let isReference = subview[IsLineReference.self]
      subview.place(at: CGPoint(x: bounds.midX, y: bounds.midY), anchor: .center, proposal: isReference ? .unspecified : inner)
    }
  }
}

private struct TanreiTextStyleModifier: ViewModifier {
  let style: TanreiTextStyle
  let emphasized: Bool
  @Environment(\.tanreiTheme) private var theme
  /// Glyphs, tracking and the line box all follow this one value (`TanreiDynamicType`).
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize

  func body(content: Content) -> some View {
    let resolved = style.resolved(policy: theme.fontFamilyPolicy, dynamicTypeSize: dynamicTypeSize, emphasis: emphasized ? theme.system.typescale.emphasis : nil)
    TanreiLineBox(lineHeight: resolved.lineHeight, extraLeading: resolved.lineSpacing) {
      content
        .font(resolved.font)
        .tracking(resolved.tracking)
        .lineSpacing(resolved.lineSpacing)
      // One line of the same font, measured and never seen.
      Text(verbatim: " ")
        .font(resolved.font)
        .lineLimit(1)
        .fixedSize()
        .hidden()
        .accessibilityHidden(true)
        .allowsHitTesting(false)
        .layoutValue(key: TanreiLineBox.IsLineReference.self, value: true)
    }
  }
}

/// The font of a type style without its line box: what a container hands down to content that is not
/// (only) text — an icon slot next to a label, so that an SF Symbol there is sized like the label.
private struct TanreiFontModifier: ViewModifier {
  let style: TanreiTextStyle
  let emphasized: Bool
  @Environment(\.tanreiTheme) private var theme
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize

  func body(content: Content) -> some View {
    let resolved = style.resolved(policy: theme.fontFamilyPolicy, dynamicTypeSize: dynamicTypeSize, emphasis: emphasized ? theme.system.typescale.emphasis : nil)
    content
      .font(resolved.font)
      .tracking(resolved.tracking)
      .lineSpacing(resolved.lineSpacing)
  }
}

extension View {
  /// Applies a Tanrei type style to TEXT: font, tracking and the exact token line height, scaled with
  /// Dynamic Type. Apply it to the text itself, not to a row that also holds an icon.
  ///
  /// `emphasized` adds the family's step of the current system's `typescale.emphasis` to the weight —
  /// a selected tab, a key figure — and changes nothing else.
  public func tanreiTextStyle(_ style: TanreiTextStyle, emphasized: Bool = false) -> some View {
    modifier(TanreiTextStyleModifier(style: style, emphasized: emphasized))
  }

  /// Font, tracking and line spacing of a type style, with no effect on layout.
  func tanreiFont(_ style: TanreiTextStyle, emphasized: Bool = false) -> some View {
    modifier(TanreiFontModifier(style: style, emphasized: emphasized))
  }
}
