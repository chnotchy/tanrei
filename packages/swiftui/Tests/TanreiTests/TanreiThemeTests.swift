import SwiftUI
import Testing

@testable import Tanrei

// On the main actor: its `#expect`s compare whole themes, and with every component's tokens a `TanreiSystem` copy is
// large enough that those temporaries overflowed a cooperative thread's stack.
@MainActor
@Suite("TanreiTheme")
struct TanreiThemeTests {
  let system = TanreiSystem.tanrei

  @Test("theme × contrast selects one of the six generated schemes")
  func explicitSchemes() {
    let schemes = system.colors
    let cases: [(TanreiAppearance, TanreiContrast, TanreiColors)] = [
      (.light, .standard, schemes.light), (.light, .medium, schemes.lightMedium), (.light, .high, schemes.lightHigh),
      (.dark, .standard, schemes.dark), (.dark, .medium, schemes.darkMedium), (.dark, .high, schemes.darkHigh),
    ]
    // The six schemes really are six different sets of values.
    for (index, (_, _, scheme)) in cases.enumerated() {
      for (_, _, other) in cases[(index + 1)...] { #expect(scheme != other) }
    }
    for (appearance, contrast, expected) in cases {
      let theme = TanreiTheme(appearance: appearance, contrast: contrast)
      // Explicit values win over whatever the system says.
      #expect(theme.colors(systemScheme: .dark, systemContrast: .increased) == expected)
      #expect(theme.colors(systemScheme: .light, systemContrast: .standard) == expected)
    }
  }

  @Test("the default theme follows the system scheme and contrast (increased → high)")
  func followsSystem() {
    let theme = TanreiTheme.system
    #expect(theme.system == .tanrei)
    #expect(theme.colors(systemScheme: .light, systemContrast: .standard) == system.colors.light)
    #expect(theme.colors(systemScheme: .dark, systemContrast: .standard) == system.colors.dark)
    #expect(theme.colors(systemScheme: .light, systemContrast: .increased) == system.colors.lightHigh)
    #expect(theme.colors(systemScheme: .dark, systemContrast: .increased) == system.colors.darkHigh)
    #expect(theme.forcedColorScheme == nil)
    #expect(TanreiTheme(appearance: .dark).forcedColorScheme == .dark)
  }

  @Test("the theme carries the design system: another system changes what the environment resolves")
  func carriesSystem() {
    var other = TanreiSystem.tanrei
    other.id = "acme"
    other.colors.dark.values[.primary] = TanreiColorValue(red: 1, green: 0, blue: 0, opacity: 1)
    other.space.space200 = 99
    let theme = TanreiTheme(system: other, appearance: .dark, contrast: .standard)
    #expect(theme != TanreiTheme(appearance: .dark, contrast: .standard))
    #expect(theme.colors(systemScheme: .light, systemContrast: .standard).value(.primary).red == 1)
    var environment = EnvironmentValues()
    #expect(environment.tanreiSystem == .tanrei)
    environment.tanreiTheme = theme
    #expect(environment.tanreiSystem.id == "acme")
    #expect(environment.tanreiSystem.space.space200 == 99)
  }

  @Test("role lookup goes through the scheme; every scheme defines every role of the system")
  func roleLookup() {
    let light = system.colors.light
    #expect(!light.roles.isEmpty)
    for role in light.roles {
      #expect(light.color(role) == light[role])
      #expect(light[role] == light.value(role).color)
    }
    let schemes = [system.colors.lightMedium, system.colors.lightHigh, system.colors.dark, system.colors.darkMedium, system.colors.darkHigh]
    for scheme in schemes { #expect(scheme.roles == light.roles) }
    #expect(!system.intents.isEmpty)
    for intent in system.intents {
      for name in [intent.rawValue, "on-\(intent.rawValue)", "\(intent.rawValue)-container", "on-\(intent.rawValue)-container"] {
        #expect(light.values[TanreiColorRole(rawValue: name)] != nil)
      }
    }
  }

  @Test("roles are open-ended: an unknown role falls back to the matching primary role")
  func unknownRoleFallback() {
    #expect(TanreiColors.fallback(for: TanreiColorRole(rawValue: "tertiary")) == .primary)
    #expect(TanreiColors.fallback(for: TanreiColorRole(rawValue: "on-tertiary")) == .onPrimary)
    #expect(TanreiColors.fallback(for: TanreiColorRole(rawValue: "tertiary-container")) == .primaryContainer)
    #expect(TanreiColors.fallback(for: TanreiColorRole(rawValue: "on-tertiary-container")) == .onPrimaryContainer)
    // A system that declares the palette simply has the key.
    var colors = system.colors.light
    let tertiary = TanreiColorRole(rawValue: "tertiary")
    colors.values[tertiary] = TanreiColorValue(red: 0.5, green: 0.25, blue: 0.75, opacity: 1)
    #expect(colors.value(tertiary).blue == 0.75)
    #expect(TanreiPaint.role(tertiary).resolve(in: colors) == colors.value(tertiary))
  }

  @Test("numeric weights map to the nearest named weight")
  func weights() {
    func style(_ weight: CGFloat) -> TanreiTextStyle {
      TanreiTextStyle(font: TanreiFontStack(families: [], generic: .sansSerif, system: true), size: 14, weight: weight, tracking: 0, lineHeight: 20, family: .label)
    }
    #expect(style(400).fontWeight == .regular)
    #expect(style(450).fontWeight == .regular)  // tie → lighter
    #expect(style(500).fontWeight == .medium)
    #expect(style(550).fontWeight == .medium)
    #expect(style(600).fontWeight == .semibold)
    #expect(style(1000).fontWeight == .black)
    #expect(style(1).fontWeight == .ultraLight)
  }

  @Test("text styles resolve tracking and a non-negative line spacing that scales")
  func textStyleResolution() {
    let label = system.typescale.label
    let resolved = label.resolved(policy: .system)
    #expect(resolved.tracking == label.tracking)
    #expect(resolved.lineSpacing >= 0 && resolved.lineSpacing < label.lineHeight)
    #expect(resolved.verticalInset == resolved.lineSpacing / 2)

    // One factor for glyphs, tracking and line height (the proof at every Dynamic Type size is in
    // TanreiDynamicTypeTests).
    #expect(resolved.pointSize == label.size * resolved.scale && resolved.lineHeight == label.lineHeight * resolved.scale)

    // The generic class comes from the IR's reading of the stack; nothing here parses a name.
    #expect(system.typescale.code.font.generic == .monospace)
    #expect(system.typescale.body.font.generic == .sansSerif)
    // Eyebrow is on the plain face; the mono faces are the two code roles.
    #expect(system.typescale.eyebrow.font.generic == .sansSerif && system.typescale.codeSmall.font.generic == .monospace)
    #expect(TanreiFontGeneric.monospace.design == .monospaced && TanreiFontGeneric.serif.design == .serif && TanreiFontGeneric.sansSerif.design == .default)
  }

  @Test("a line of text is exactly the token line height, whatever the font metrics round to")
  func lineBox() {
    let box = TanreiLineBox(lineHeight: 20, extraLeading: 3.5)
    #expect(box.height(forContentHeight: 17, measuredLine: 17) == 20)
    #expect(box.height(forContentHeight: 16, measuredLine: 16) == 20)
    #expect(box.height(forContentHeight: 37, measuredLine: 17) == 40)  // two lines: 2 × 17 + 3.5, rounded down
    #expect(box.height(forContentHeight: 58, measuredLine: 17) == 60)
    // SwiftUI's line can be well above the estimate the leading came from (15pt: 19 vs 17.67).
    #expect(TanreiLineBox(lineHeight: 20, extraLeading: 2.33).height(forContentHeight: 19, measuredLine: 19) == 20)
    // Lines are counted with the measured line, so a long text is not miscounted; it is never clipped.
    let twenty = 20 * 17 + 19 * 3.5
    #expect(box.height(forContentHeight: CGFloat(twenty), measuredLine: 17) == CGFloat(twenty))
    #expect(twenty > 400)
    // The line box is for text. Content that is not text-sized keeps its own height and gets NO leading
    // (a line's leading, 26 → 29.5, would grow a button with a tall icon past its token height). Rendered
    // proof: TanreiButtonIconHeightTests.
    #expect(box.height(forContentHeight: 26, measuredLine: 17) == 26)
    #expect(box.height(forContentHeight: 12, measuredLine: 17) == 20)  // never below one line
    // A font taller than the line height has no extra leading and is never clipped.
    #expect(TanreiLineBox(lineHeight: 64, extraLeading: 0).height(forContentHeight: 75, measuredLine: 75) == 75)
    #expect(TanreiLineBox(lineHeight: 0, extraLeading: 0).height(forContentHeight: 12, measuredLine: 12) == 12)
  }

  /// Rendered: one line is the token line height at every size SwiftUI rounds differently.
  @MainActor
  @Test("a rendered line is exactly the token line height", arguments: [11, 12, 13, 14, 15, 16, 17] as [CGFloat])
  func renderedLine(size: CGFloat) throws {
    let style = TanreiTextStyle(font: TanreiFontStack(families: [], generic: .sansSerif, system: true), size: size, weight: 600, tracking: 0, lineHeight: 20, family: .body)
    let bitmap = try Snapshot.render(Text(verbatim: "Deploy").tanreiTextStyle(style))
    #expect(CGFloat(bitmap.height) == (style.lineHeight + 2 * Snapshot.inset) * Snapshot.scale)
    // Emphasized, the line is still exactly the token line height: only the weight changed.
    let strong = try Snapshot.render(Text(verbatim: "Deploy").tanreiTextStyle(style, emphasized: true))
    #expect(strong.height == bitmap.height)
  }

  /// Rendered: `emphasized` draws the family's step of the CURRENT system's `typescale.emphasis`
  /// (read from the environment); a system whose step is 0 draws the same pixels as plain text, one whose step
  /// reaches another named weight draws different ones — so the value drives the rendering.
  @MainActor
  @Test("emphasized text is drawn with the system's emphasis step")
  func emphasizedRendered() throws {
    let text = { (emphasized: Bool) in Text(verbatim: "Deploy").tanreiTextStyle(TanreiSystem.tanrei.typescale.heading5, emphasized: emphasized) }
    var theme = Snapshot.theme
    let plain = try Snapshot.renderExact(text(false), theme: theme)
    let strong = try Snapshot.renderExact(text(true), theme: theme)
    // A heavier face is wider; the line box is the same token line height (size and leading unchanged).
    #expect(strong.height == plain.height)
    #expect(strong.mismatch(against: plain, channelTolerance: 0) > 0)
    // `heading5` belongs to the heading family: zeroing that step alone makes emphasized text plain again,
    // and zeroing every OTHER step changes nothing.
    var system = TanreiSystem.tanrei
    system.typescale.emphasis.heading = 0
    theme.system = system
    #expect(try Snapshot.renderExact(text(true), theme: theme).mismatch(against: plain, channelTolerance: 0) == 0)
    system.typescale.emphasis = TanreiTypeEmphasis(display: 0, heading: TanreiSystem.tanrei.typescale.emphasis.heading, body: 0, label: 0)
    theme.system = system
    #expect(try Snapshot.renderExact(text(true), theme: theme).mismatch(against: strong, channelTolerance: 0) == 0)
  }

  @Test("the package version is exposed")
  func version() {
    #expect(!TanreiVersion.current.isEmpty)
  }
}
