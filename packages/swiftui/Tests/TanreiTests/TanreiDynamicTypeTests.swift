import AcmeFixture
import CoreText
import SwiftUI
import Testing

@testable import Tanrei

// Dynamic Type. A Tanrei text is a font PLUS a line box and tracking
// that Tanrei scales itself; if the glyphs were scaled any other way than the line box, the text would no
// longer have the token's line height. These tests prove that cannot happen: at every Dynamic Type size,
// for every text style of every system, the size SwiftUI really draws at (`Font.resolve`) is the size the
// factor was derived from — in a named family and in the platform font.
//
// This suite is what ruled out `Font.custom(_:size:relativeTo: .body)`: with it, 39 of the cases below
// failed on iOS 26.5 (SwiftUI's scaled size is a point below `UIFontMetrics`' from 47pt up, at some
// Dynamic Type sizes). The fonts are therefore built at the scaled size.
//
// The suite is platform-neutral. `swift test` (macOS) proves that nothing scales there; the same suite on
// an iOS simulator proves the iOS numbers (run from the repository root):
//   xcodebuild test -scheme Tanrei -destination 'platform=iOS Simulator,name=iPhone 17' \
//     -only-testing:TanreiTests/TanreiDynamicTypeTests

/// `Font.resolve(in:)` — what SwiftUI really draws with — exists from OS 26 on.
private let canResolveFonts: Bool = {
  if #available(iOS 26.0, macOS 26.0, *) { return true }
  return false
}()

@Suite("Dynamic Type: glyphs, tracking and the line box scale by one factor")
@MainActor
struct TanreiDynamicTypeTests {
  /// Ships with iOS and macOS, so the named-family path runs on a machine without Inter.
  static let deviceFamily = "Helvetica Neue"

  static let systems: [TanreiSystem] = ShippedSystem.allCases.map(\.system) + [.acme]

  /// Every text style anywhere in a system — the type scale, extensions, component label styles — found
  /// by walking the value.
  static func textStyles(of system: TanreiSystem) -> [TanreiTextStyle] {
    var found: [TanreiTextStyle] = []
    func walk(_ value: Any) {
      if let style = value as? TanreiTextStyle {
        found.append(style)
        return
      }
      for child in Mirror(reflecting: value).children { walk(child.value) }
    }
    walk(system)
    return found
  }

  /// The styles of every system, and a sweep of sizes no system uses today (halves included), each
  /// once with a weight a product pins between the named ones.
  static var styles: [TanreiTextStyle] {
    var all = systems.flatMap(textStyles(of:))
    let stack = TanreiFontStack(families: [], generic: .sansSerif, system: true)
    for half in stride(from: 12, through: 192, by: 1) {
      let size = CGFloat(half) / 2
      all.append(TanreiTextStyle(font: stack, size: size, weight: half % 2 == 0 ? 450 : 550, tracking: 0.01 * size, lineHeight: (size * 1.45).rounded(), family: .body))
    }
    return all
  }

  /// The style, drawn in a family this machine has.
  static func named(_ style: TanreiTextStyle) -> TanreiTextStyle {
    var style = style
    style.font = TanreiFontStack(families: [deviceFamily], generic: style.font.generic, system: false)
    return style
  }

  /// The sixteen core type roles, as the vocabulary struct names them.
  static let coreRoles: [KeyPath<TanreiTypescale, TanreiTextStyle>] = [
    \.display, \.heading1, \.heading2, \.heading3, \.heading4, \.heading5, \.heading6,
    \.bodyLarge, \.body, \.bodySmall, \.label, \.labelSmall, \.caption, \.code, \.codeSmall, \.eyebrow,
  ]

  @Test("the walk finds every text style: the sixteen roles, what a system adds, the component label styles")
  func stylesAreFound() {
    for system in Self.systems {
      let styles = Self.textStyles(of: system)
      // Every named field of the typescale is one of the sixteen roles — no more, no less.
      let named = Mirror(reflecting: system.typescale).children.compactMap { $0.value as? TanreiTextStyle }
      #expect(named.count == 16 && Self.coreRoles.count == 16, "\(system.id)")
      for role in Self.coreRoles { #expect(styles.contains(system.typescale[keyPath: role]), "\(system.id)") }
      // A role a system adds (cupertino's `body-callout`, `body-subhead`, `caption-small`) comes through `extra`.
      for (key, style) in system.typescale.extra { #expect(styles.contains(style), "\(system.id) \(key)") }
      for size in system.button.sizes.keys { #expect(styles.contains(system.button.sizes[size].labelTypescale), "\(system.id) \(size)") }
      #expect(styles.count >= 16 + system.typescale.extra.count + system.button.sizes.keys.count, "\(system.id)")
    }
    #expect(Set(TanreiSystem.cupertino.typescale.extra.keys) == ["body-callout", "body-subhead", "caption-small"])
    #expect(Set(TanreiSystem.m3Like.typescale.extra.keys) == ["display-large", "display-small"])
    #expect(Self.named(TanreiSystem.tanrei.typescale.bodySmall).installedFamily == Self.deviceFamily)
  }

  /// Emphasis is a weight step, not a role. `emphasized` adds the family's step of
  /// `typescale.emphasis` to the weight — at the default size and at an accessibility size alike — and
  /// changes nothing else: Dynamic Type keeps its one factor, and that factor never touches the weight.
  @Test("emphasized adds the family's step to the weight and nothing else, at the default and an accessibility size")
  func emphasized() {
    for system in Self.systems {
      let emphasis = system.typescale.emphasis
      for style in Self.textStyles(of: system) + Self.textStyles(of: system).map(Self.named) {
        for dynamicTypeSize in [DynamicTypeSize.large, .accessibility3] {
          let plain = style.resolved(policy: .tokens, dynamicTypeSize: dynamicTypeSize)
          let strong = style.resolved(policy: .tokens, dynamicTypeSize: dynamicTypeSize, emphasis: emphasis)
          #expect(plain.weight == style.weight && !plain.emphasized, "\(system.id) \(dynamicTypeSize)")
          #expect(strong.weight == style.weight + emphasis[style.family] && strong.emphasized, "\(system.id) \(dynamicTypeSize)")
          #expect(strong.pointSize == plain.pointSize && strong.scale == plain.scale, "\(system.id) \(dynamicTypeSize)")
          #expect(strong.tracking == plain.tracking && strong.lineHeight == plain.lineHeight, "\(system.id) \(dynamicTypeSize)")
          #expect(strong.lineSpacing == plain.lineSpacing && strong.verticalInset == plain.verticalInset, "\(system.id) \(dynamicTypeSize)")
          // The pure form agrees with the resolution.
          #expect(style.emphasized(by: emphasis).resolved(policy: .tokens, dynamicTypeSize: dynamicTypeSize).weight == strong.weight)
          // The font differs exactly when the nearest named weight does (SwiftUI has nine).
          let differs = TanreiTextStyle.fontWeight(nearest: plain.weight) != TanreiTextStyle.fontWeight(nearest: strong.weight)
          #expect((strong.font != plain.font) == differs, "\(system.id) \(style.weight) + \(emphasis[style.family])")
        }
      }
    }
    // The families: the first segment of the role's name; `caption`, `code*` and `eyebrow` take the label step.
    let typescale = TanreiSystem.tanrei.typescale
    #expect(typescale.display.family == .display)
    #expect([typescale.heading1, typescale.heading2, typescale.heading3, typescale.heading4, typescale.heading5, typescale.heading6].allSatisfy { $0.family == .heading })
    #expect([typescale.bodyLarge, typescale.body, typescale.bodySmall].allSatisfy { $0.family == .body })
    #expect([typescale.label, typescale.labelSmall, typescale.caption, typescale.code, typescale.codeSmall, typescale.eyebrow].allSatisfy { $0.family == .label })
    #expect(TanreiSystem.cupertino.typescale.extra["body-callout"]?.family == .body && TanreiSystem.cupertino.typescale.extra["caption-small"]?.family == .label)
    #expect(TanreiSystem.m3Like.typescale.extra["display-large"]?.family == .display)
    // The numbers the brief names: emphasized heading-1 is 500 + the heading step; under m3-like a label gains 200.
    #expect(TanreiSystem.tanrei.typescale.heading1.weight == 500 && TanreiSystem.tanrei.typescale.emphasis.heading == 100)
    #expect(TanreiSystem.tanrei.typescale.heading1.emphasized(by: TanreiSystem.tanrei.typescale.emphasis).weight == 600)
    #expect(TanreiSystem.m3Like.typescale.label.weight == 500 && TanreiSystem.m3Like.typescale.emphasis.label == 200)
    #expect(TanreiSystem.m3Like.typescale.label.emphasized(by: TanreiSystem.m3Like.typescale.emphasis).weight == 700)
    // A modified step drives the result: the value, not the family, is what is added.
    var emphasis = TanreiSystem.tanrei.typescale.emphasis
    emphasis.label = 0
    emphasis.heading = 300
    #expect(typescale.caption.emphasized(by: emphasis).weight == typescale.caption.weight)
    #expect(typescale.heading3.emphasized(by: emphasis).weight == typescale.heading3.weight + 300)
    #expect(emphasis[.label] == 0 && emphasis[.heading] == 300 && emphasis[.display] == 100 && emphasis[.body] == 100)
  }

  /// The proof. What SwiftUI draws (`Font.resolve`) is compared with what the line box and the tracking
  /// were scaled from — for a named family and for the platform font.
  @Test("the size SwiftUI draws at is the size the line box and tracking were scaled from — at every Dynamic Type size", .enabled(if: canResolveFonts))
  func drawnSizeIsTheScaledSize() throws {
    guard #available(iOS 26.0, macOS 26.0, *) else { return }
    var checked = 0
    for dynamicTypeSize in DynamicTypeSize.allCases {
      var environment = EnvironmentValues()
      environment.dynamicTypeSize = dynamicTypeSize
      let context = environment.fontResolutionContext
      for style in Self.styles {
        for (candidate, policy) in [(Self.named(style), TanreiFontFamilyPolicy.tokens), (style, .system)] {
          let resolved = candidate.resolved(policy: policy, dynamicTypeSize: dynamicTypeSize)
          let drawn = resolved.font.resolve(in: context)
          let what = "\(policy) \(style.size)pt at \(dynamicTypeSize)"
          #expect(drawn.pointSize == resolved.pointSize, "\(what)")
          // One factor: the drawn size ÷ the token size. Line height and tracking are the token's × it.
          let factor = drawn.pointSize / style.size
          #expect(resolved.scale == factor, "\(what)")
          #expect(resolved.lineHeight == style.lineHeight * factor, "\(what)")
          #expect(resolved.tracking == style.tracking * factor, "\(what)")
          // … so the token's proportion of line height to size survives (the division only adds rounding noise).
          #expect(abs(resolved.lineHeight / drawn.pointSize - style.lineHeight / style.size) < 1e-9, "\(what)")
          #if os(iOS)
          // The size is the platform's own for a font of that size "relative to body": whole points.
          #expect(drawn.pointSize == drawn.pointSize.rounded() || dynamicTypeSize == .large, "\(what)")
          #else
          #expect(drawn.pointSize == style.size, "\(what)")
          #endif
          if policy == .tokens {
            #expect(CTFontCopyFamilyName(drawn.ctFont) as String == Self.deviceFamily, "\(what)")
          }
          checked += 1
        }
      }
    }
    #expect(checked == DynamicTypeSize.allCases.count * Self.styles.count * 2 && DynamicTypeSize.allCases.count == 12)
  }

  /// A weight a product pins between the named ones keeps its handling: the nearest named weight, ties
  /// toward the lighter one (450 → regular, 550 → medium) — whichever way the font is scaled.
  @Test("450 draws regular and 550 draws medium, in a named family and in the platform font, at every Dynamic Type size", .enabled(if: canResolveFonts))
  func pinnedWeights() {
    guard #available(iOS 26.0, macOS 26.0, *) else { return }
    for dynamicTypeSize in DynamicTypeSize.allCases {
      var environment = EnvironmentValues()
      environment.dynamicTypeSize = dynamicTypeSize
      let context = environment.fontResolutionContext
      for (weight, expected, other) in [(CGFloat(450), Font.Weight.regular, Font.Weight.medium), (550, .medium, .regular)] {
        var style = TanreiSystem.tanrei.typescale.label
        style.weight = weight
        let size = TanreiDynamicType.scaledPointSize(style.size, at: dynamicTypeSize)
        let named = Self.named(style).resolved(policy: .tokens, dynamicTypeSize: dynamicTypeSize).font.resolve(in: context)
        #expect(named == Font.custom(Self.deviceFamily, fixedSize: size).weight(expected).resolve(in: context), "\(weight) at \(dynamicTypeSize)")
        #expect(named != Font.custom(Self.deviceFamily, fixedSize: size).weight(other).resolve(in: context), "\(weight) at \(dynamicTypeSize)")
        let platform = style.resolved(policy: .system, dynamicTypeSize: dynamicTypeSize).font.resolve(in: context)
        #expect(platform == Font.system(size: size, weight: expected).resolve(in: context), "\(weight) at \(dynamicTypeSize)")
        #expect(platform != Font.system(size: size, weight: other).resolve(in: context), "\(weight) at \(dynamicTypeSize)")
      }
    }
  }

  @Test("the factor: 1 at the default size; on iOS every token size follows Dynamic Type from xSmall to accessibility5, on macOS nothing scales")
  func factor() {
    for size: CGFloat in [11, 12, 13, 14, 16, 22, 57] {
      #expect(TanreiDynamicType.scale(forSize: size, at: .large) == 1)
      let sizes = DynamicTypeSize.allCases.map { TanreiDynamicType.scaledPointSize(size, at: $0) }
      #if os(iOS)
      #expect(zip(sizes, sizes.dropFirst()).allSatisfy { $0 <= $1 }, "\(size): \(sizes)")
      // Around the default too — where a factor made from `@ScaledMetric` of 1 stayed 1.0.
      #expect(TanreiDynamicType.scaledPointSize(size, at: .small) < size, "\(size)")
      #expect(TanreiDynamicType.scaledPointSize(size, at: .xLarge) > size, "\(size)")
      #expect(TanreiDynamicType.scale(forSize: size, at: .accessibility5) > 2.5, "\(size)")
      #expect(Set(sizes).count >= 10, "\(size): \(sizes)")
      #else
      #expect(sizes.allSatisfy { $0 == size }, "\(size): \(sizes)")
      #endif
    }
    #expect(TanreiDynamicType.scale(forSize: 0, at: .accessibility5) == 1)  // no division by zero
  }

  /// The size SwiftUI lays a view out at, in points.
  private func layoutSize(_ view: some View, theme: TanreiTheme, at dynamicTypeSize: DynamicTypeSize) -> CGSize {
    let renderer = ImageRenderer(content: view.tanreiTheme(theme).environment(\.dynamicTypeSize, dynamicTypeSize))
    var measured = CGSize.zero
    renderer.render { size, _ in measured = size }
    return measured
  }

  /// End to end: the laid-out text, not the numbers it was made from.
  @Test("a rendered line is the token line height × the factor, two lines are twice that — in a named family and in the platform font")
  func renderedLineBox() {
    let base = TanreiSystem.tanrei.typescale.bodySmall
    for dynamicTypeSize in DynamicTypeSize.allCases {
      for (style, policy) in [(Self.named(base), TanreiFontFamilyPolicy.tokens), (base, .system)] {
        let theme = TanreiTheme(appearance: .light, contrast: .standard, fontFamilyPolicy: policy)
        let expected = base.lineHeight * TanreiDynamicType.scale(forSize: base.size, at: dynamicTypeSize)
        let one = layoutSize(Text(verbatim: "Deploy").tanreiTextStyle(style), theme: theme, at: dynamicTypeSize)
        let two = layoutSize(Text(verbatim: "Deploy\nnow").tanreiTextStyle(style), theme: theme, at: dynamicTypeSize)
        #expect(abs(one.height - expected) < 0.001, "\(policy) at \(dynamicTypeSize): \(one.height) vs \(expected)")
        #expect(abs(two.height - 2 * expected) < 0.001, "\(policy) at \(dynamicTypeSize): \(two.height) vs \(2 * expected)")
      }
    }
    #if os(iOS)
    let theme = TanreiTheme(appearance: .light, contrast: .standard, fontFamilyPolicy: .system)
    let widths = [DynamicTypeSize.small, .large, .xLarge].map {
      layoutSize(Text(verbatim: "Deploy").tanreiTextStyle(base), theme: theme, at: $0).width
    }
    #expect(widths[0] < widths[1] && widths[1] < widths[2], "\(widths)")
    #endif
  }

  @Test("a button's icon grows by the factor of its label")
  func buttonIcon() {
    let system = TanreiSystem.tanrei
    let metrics = system.button.sizes[.medium]
    let theme = TanreiTheme(system: system, appearance: .light, contrast: .standard, fontFamilyPolicy: .system)
    for dynamicTypeSize in DynamicTypeSize.allCases {
      let plain = layoutSize(TanreiButton("Deploy", variant: .outlined) {}, theme: theme, at: dynamicTypeSize)
      let withIcon = layoutSize(
        TanreiButton("Deploy", variant: .outlined) {} icon: { Image(systemName: "arrow.up") }, theme: theme, at: dynamicTypeSize)
      let factor = TanreiDynamicType.scale(forSize: metrics.labelTypescale.size, at: dynamicTypeSize)
      let expected =
        metrics.iconSize * factor + metrics.containerGap + metrics.containerPaddingInlineStartWithIcon - metrics.containerPaddingInlineStart
      #expect(abs(withIcon.width - plain.width - expected) < 0.001, "at \(dynamicTypeSize): \(withIcon.width - plain.width) vs \(expected)")
    }
  }
}
