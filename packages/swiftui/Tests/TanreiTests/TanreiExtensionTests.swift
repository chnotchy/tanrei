import AcmeFixture
import SwiftUI
import Testing

@testable import Tanrei

// A design system may EXTEND the vocabulary: a step in a series, a color role, a size
// or variant of a component, tokens of its own namespace. `TanreiSystem.acme` is such a system,
// generated from packages/tokens-build/test/fixtures/acme.system.json the way a product generates
// its own (`node packages/swiftui/scripts/generate-acme-fixture.mjs`) and compiled as ANOTHER
// module (`AcmeFixture`), so everything it uses of Tanrei is public API.

// On the main actor: its tests read whole shipped systems, whose one-time initialization and copies need more
// stack than a cooperative thread has.
@MainActor
@Suite("Extended system: values")
struct TanreiExtendedSystemValueTests {
  let acme = TanreiSystem.acme

  @Test("an added size carries its own tokens: cloned from large, scaled, one member overridden")
  func addedSize() throws {
    let size = try #require(acme.button.sizes.value(for: .size3x))
    #expect(size.containerHeight == 60)
    #expect(size.containerPaddingInlineStart == 24 && size.containerPaddingInlineEnd == 24)
    #expect(size.containerPaddingInlineStartWithIcon == 24)
    #expect(size.containerPaddingBlock == 16)  // overridden by the layer, not 6 × 1.5
    #expect(size.labelTypescale == acme.button.sizes.large.labelTypescale)  // a text style is cloned as it is
    #expect(acme.button.sizes[.size3x] == size)
    #expect(acme.button.sizes[TanreiButtonSize(rawValue: "3x")] == size)  // the key stays usable as a string
    #expect(acme.button.sizes.keys == [.small, .medium, .large, .size3x])
    // The core values are untouched.
    #expect(acme.button.sizes.medium == TanreiSystem.tanrei.button.sizes.medium)
  }

  @Test("an added variant has every state, valued by the system's pattern rules")
  func addedVariant() throws {
    let danger = try #require(acme.button.variants.value(for: .danger))
    #expect(danger.enabled.containerColor == .role(.error))
    #expect(danger.enabled.labelColor == .role(.onError))
    for scheme in acme.schemes {
      let rest = danger.enabled.containerColor.resolve(in: scheme.colors)
      #expect(rest == scheme.colors.value(.error))
      for state in [danger.hovered, danger.focused, danger.pressed, danger.disabled] {
        #expect(state.containerColor.resolve(in: scheme.colors) != rest, "\(scheme.name)")
        #expect(state.containerColor.resolve(in: scheme.colors).isVisible)
      }
    }
    #expect(acme.button.variants.keys == [.filled, .tonal, .elevated, .outlined, .text, .danger])
    // The core variants keep the parent's colors; acme only revalues the three state-layer strengths.
    #expect(acme.button.variants.filled.enabled == TanreiSystem.tanrei.button.variants.filled.enabled)
    #expect(acme.button.variants.filled.disabled == TanreiSystem.tanrei.button.variants.filled.disabled)
  }

  @Test("an added series step is read through the typed accessor and the keyed lookup")
  func addedStep() {
    #expect(acme.space.space1200 == 96)
    #expect(acme.space["space1200"] == 96)
    #expect(acme.space.extra == ["space1200": 96])
    // Core steps answer the keyed lookup too; an unknown key is nil.
    #expect(acme.space["space100"] == acme.space.space100)
    #expect(acme.space["space9999"] == nil)
    // A system without the step: the lookup is nil, the accessor is total (the declaring
    // system's value) and says so in debug builds.
    #expect(TanreiSystem.tanrei.space["space1200"] == nil)
    let (value, reports) = Reports.collecting { TanreiSystem.tanrei.space.space1200 }
    #expect(value == 96 && reports.mention("space1200"))
    let (_, silent) = Reports.collecting { acme.space.space1200 }
    #expect(silent.messages.isEmpty)
  }

  /// Acme adds the spring `bouncy` to both spring schemes.
  @Test("an added spring is read through the typed accessor and the keyed lookup, per scheme")
  func addedSpring() {
    let springs = acme.motion.spring
    #expect(springs.standard["bouncy"]?.damping == 0.5 && springs.expressive["bouncy"]?.damping == 0.4)
    #expect(springs.expressive["bouncy"]?.stiffness == 500)
    #expect(springs.standard.bouncy == springs.standard["bouncy"] && springs.expressive.bouncy == springs.expressive["bouncy"])
    #expect(Set(springs.standard.extra.keys) == ["bouncy"] && springs.extra.isEmpty)
    // The core springs are untouched.
    #expect(springs.standard.fastEffects == TanreiSystem.tanrei.motion.spring.standard.fastEffects)
    // A system without it: the lookup is nil, the accessor never throws — it returns the value acme
    // declared (item 6 of the brief: series extensions never throw) and says so in debug builds.
    #expect(TanreiSystem.tanrei.motion.spring.standard["bouncy"] == nil)
    let (value, reports) = Reports.collecting { TanreiSystem.tanrei.motion.spring.standard.bouncy }
    #expect([springs.standard.bouncy, springs.expressive.bouncy].contains(value) && reports.mention("bouncy"))
    let (_, silent) = Reports.collecting { acme.motion.spring.standard.bouncy }
    #expect(silent.messages.isEmpty)
    #expect(TanreiMotion.animation(spring: springs.standard.bouncy, reduceMotion: false) != nil)
  }

  @Test("an added color role resolves in all six schemes")
  func addedRole() {
    #expect(TanreiColorRole.brandGlow.rawValue == "brand-glow")
    for scheme in acme.schemes {
      let value = scheme.colors.values[.brandGlow]
      #expect(value != nil, "\(scheme.name)")
      #expect(TanreiPaint.role(.brandGlow).resolve(in: scheme.colors) == value)
    }
    #expect(acme.colors.light.values[.brandGlow] != acme.colors.dark.values[.brandGlow])
    #expect(TanreiSystem.tanrei.colors.light.values[.brandGlow] == nil)
    #expect(acme.unknownRoles == [])
  }

  @Test("a layer's own tokens are a typed object outside TanreiSystem; colors follow the scheme")
  func ownTokens() {
    let tokens = AcmeTokens.acme
    #expect(tokens.rating.star.size == 20)
    #expect(tokens.rating.gap == acme.space.space50)
    #expect(tokens.rating.star.color == .role(.warning))
    for scheme in acme.schemes {
      #expect(tokens.rating.star.color.resolve(in: scheme.colors) == scheme.colors.value(.warning))
    }
    #expect(tokens.rating.star.color.resolve(in: acme.colors.light) != tokens.rating.star.color.resolve(in: acme.colors.dark))
  }
}

// MARK: - What acme CHOOSES: a static icon set, a glow for focus, three state strengths

// On the main actor: its `#expect`s copy whole systems, which overflow a cooperative thread's stack, since every
// component's tokens are in `TanreiSystem`.
@MainActor
@Suite("Extended system: choices")
struct TanreiExtendedSystemChoiceTests {
  let acme = TanreiSystem.acme

  /// A static icon set tells selected from unselected with a second FAMILY, not an axis.
  @Test("acme draws the static Material Icons set: the family follows the selection state")
  func staticIconSet() {
    #expect(acme.icon.families.unselected.families == ["Material Icons Outlined"])
    #expect(acme.icon.families.selected.families == ["Material Icons"])
    #expect(acme.icon.weight == 400)
    let unselected = acme.icon.drawing(size: 24, selected: false)
    let selected = acme.icon.drawing(size: 24, selected: true)
    #expect(unselected.family.families == ["Material Icons Outlined"] && selected.family.families == ["Material Icons"])
    #expect(unselected.family != selected.family)
    // The axes are still delivered — harmless for a font that has none: fill, weight, optical size, grade 0.
    #expect(selected.axes == TanreiIconAxes(fill: acme.icon.fillSelected, weight: 400, opticalSize: 24, grade: 0))
    #expect(unselected.axes == TanreiIconAxes(fill: acme.icon.fillUnselected, weight: 400, opticalSize: 24, grade: 0))
    // Not installed here (Tanrei bundles no font): no font, so a caller falls back to its own icons.
    if acme.icon.installedFamily(selected: true) == nil { #expect(acme.icon.font(size: 24, selected: true) == nil) }
    // The typeface `icon` is untouched by the layer: the icon style is what changed.
    #expect(acme.typefaces.icon == TanreiSystem.tanrei.typefaces.icon)
  }

  @Test("acme chooses glow; everything else is the parent's choice")
  func behavior() {
    #expect(acme.behavior == TanreiBehavior(focusStyle: .glow, pressedFeedback: .overlay))
    #expect(acme.shape.cornerSmoothing == TanreiSystem.tanrei.shape.cornerSmoothing)
    #expect(acme.typescale.emphasis == TanreiSystem.tanrei.typescale.emphasis)
  }

  /// BTN-3 — the default system gives pressed and focused the same strength (0.1), so precedence
  /// cannot be seen with it. Acme values hovered, focused and pressed differently (0.06 / 0.12 / 0.2):
  /// the three states are three different paints, WITHOUT overriding anything in memory.
  @Test("BTN-3 acme values hovered, focused and pressed differently", arguments: TanreiButtonVariant.core)
  func statesDiffer(variant: TanreiButtonVariant) {
    #expect([acme.state.hoverStateLayerOpacity, acme.state.focusStateLayerOpacity, acme.state.pressedStateLayerOpacity] == [0.06, 0.12, 0.2])
    let tokens = acme.button.variants[variant]
    let paints = [tokens.enabled, tokens.hovered, tokens.focused, tokens.pressed].map(\.containerColor)
    #expect(Set(paints.map { "\($0)" }).count == 4)
    for scheme in acme.schemes {
      let resolved = paints.map { $0.resolve(in: scheme.colors) }
      for i in resolved.indices { for j in resolved.indices where i < j { #expect(resolved[i] != resolved[j], "\(scheme.name) \(i) \(j)") } }
    }
  }
}

@MainActor
@Suite("Extended system: rendering")
struct TanreiExtendedSystemRenderTests {
  let acme = TanreiSystem.acme
  let inset = Snapshot.inset

  private var theme: TanreiTheme {
    var theme = Snapshot.theme
    theme.system = acme
    return theme
  }

  private func pixel(_ bitmap: Bitmap, x: CGFloat, y: CGFloat) -> Bitmap.RGBA {
    bitmap[Int(x * Snapshot.scale), Int(y * Snapshot.scale)]
  }

  @Test("a button with an added size and an added variant is drawn from their tokens")
  func addedSizeAndVariantRender() throws {
    let (bitmap, reports) = try Reports.collecting {
      try Snapshot.render(TanreiButton("Delete", variant: .danger, size: .size3x, action: {}), theme: theme)
    }
    #expect(reports.messages.isEmpty)
    let size = acme.button.sizes[.size3x]
    #expect(CGFloat(bitmap.height) == (size.containerHeight + 2 * inset) * Snapshot.scale)
    #expect(size.containerHeight == 60)
    let colors = acme.colors.light
    let point = CGPoint(x: inset + size.containerPaddingInlineStart / 2, y: inset + size.containerHeight / 2)
    #expect(pixel(bitmap, x: point.x, y: point.y).isClose(to: colors[.error].rgba8()))

    // The inline padding is the added size's: 2 × (24 − 16) wider than the same label at `large`.
    let large = try Snapshot.render(TanreiButton("Delete", variant: .danger, size: .large, action: {}), theme: theme)
    let padding = size.containerPaddingInlineStart + size.containerPaddingInlineEnd - acme.button.sizes.large.containerPaddingInlineStart - acme.button.sizes.large.containerPaddingInlineEnd
    #expect(CGFloat(bitmap.width - large.width) == padding * Snapshot.scale)

    // Pressed and disabled come from the added variant's own state tokens.
    let pressed = try Snapshot.render(
      TanreiButtonChrome(variant: .danger, size: .size3x, isPressed: true, isFocused: false) { Text(verbatim: "Delete") },
      theme: theme
    )
    let danger = acme.button.variants[.danger]
    #expect(pixel(pressed, x: point.x, y: point.y).isClose(to: colors[danger.pressed.containerColor].rgba8()))
    #expect(!pixel(pressed, x: point.x, y: point.y).isClose(to: colors[.error].rgba8()))
  }

  /// BTN-3 — precedence, OBSERVED with real tokens: pressed over focused over hovered. Under acme the
  /// three containers are three colors, so each combination shows which state won.
  @Test("BTN-3 pressed wins over focused, rendered under acme without overriding a value")
  func precedenceIsObservable() throws {
    let colors = acme.colors.light
    let filled = acme.button.variants.filled
    let sizes = acme.button.sizes.medium
    let point = CGPoint(x: inset + sizes.containerPaddingInlineStart / 2, y: inset + sizes.containerHeight / 2)
    func render(isPressed: Bool, isFocused: Bool) throws -> Bitmap.RGBA {
      let chrome = TanreiButtonChrome(variant: .filled, size: .medium, isPressed: isPressed, isFocused: isFocused) { Text(verbatim: "Deploy") }
      return pixel(try Snapshot.render(chrome, theme: theme), x: point.x, y: point.y)
    }
    let pressed = colors[filled.pressed.containerColor].rgba8()
    let focused = colors[filled.focused.containerColor].rgba8()
    let rest = colors[filled.enabled.containerColor].rgba8()
    // The three are far enough apart to be told apart in 8 bits.
    #expect(!pressed.isClose(to: focused) && !focused.isClose(to: rest) && !pressed.isClose(to: rest))
    #expect(try render(isPressed: false, isFocused: false).isClose(to: rest))
    #expect(try render(isPressed: false, isFocused: true).isClose(to: focused))
    #expect(try render(isPressed: true, isFocused: false).isClose(to: pressed))
    #expect(try render(isPressed: true, isFocused: true).isClose(to: pressed))  // pressed over focused
    // The resolver is the same one the view uses; hover cannot be injected into a render, so its rank is checked here.
    #expect(TanreiInteraction.resolve(isPressed: false, isFocused: true, isHovered: true) == .focused)
    #expect(TanreiInteraction.resolve(isPressed: true, isFocused: false, isHovered: true) == .pressed)
    let hovered = TanreiButtonAppearance(tokens: acme.button, variant: .filled, size: .medium, state: .hovered).container
    #expect(hovered == filled.hovered.containerColor && !colors[hovered].rgba8().isClose(to: rest, tolerance: 1))
  }

  /// BTN-10 — `focus-style: glow`: the same focus color as a soft halo instead of a hard line. A hard
  /// ring is the full focus color on its center line and untouched surface right outside it; a glow is
  /// a PARTIAL blend of that color, strongest where the line would be, fading over about the ring width.
  @Test("BTN-10 acme draws keyboard focus as a glow; the parent draws a ring")
  func glow() throws {
    let colors = acme.colors.light
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: acme.button.focused.containerShape, measure: acme.measure)
    let midY = inset + acme.button.sizes.medium.containerHeight / 2
    let chrome = TanreiButtonChrome(variant: .filled, size: .medium, isPressed: false, isFocused: true) { Text(verbatim: "Deploy") }
    let glow = try Snapshot.render(chrome, theme: theme)
    var ringTheme = theme
    ringTheme.system.behavior.focusStyle = .ring
    let ring = try Snapshot.render(chrome, theme: ringTheme)
    #expect(glow.width == ring.width && glow.height == ring.height)  // neither affects layout

    let focus = colors[.focusRing].rgba8()
    let surface = colors[.surface].rgba8()
    let lineX = inset - metrics.outerCenterlineOutset
    let outsideX = inset - metrics.outerOutset - metrics.outerWidth / 2  // half a ring width past the hard edge
    // Ring: the focus color on the line, clean surface just outside.
    #expect(pixel(ring, x: lineX, y: midY).isClose(to: focus))
    #expect(pixel(ring, x: outsideX, y: midY).isClose(to: surface))
    // Glow: the same hue, never the full color (it is blurred), and it reaches past the hard edge.
    func distance(_ a: Bitmap.RGBA, _ b: Bitmap.RGBA) -> Int { abs(Int(a.r) - Int(b.r)) + abs(Int(a.g) - Int(b.g)) + abs(Int(a.b) - Int(b.b)) }
    let onLine = pixel(glow, x: lineX, y: midY)
    let outside = pixel(glow, x: outsideX, y: midY)
    #expect(!onLine.isClose(to: focus) && !onLine.isClose(to: surface))
    #expect(!outside.isClose(to: surface))
    #expect(distance(onLine, surface) > distance(outside, surface))  // strongest where the line would be
    // …and it has faded out well within the snapshot inset.
    #expect(pixel(glow, x: inset - metrics.outerOutset - 3 * metrics.outerWidth, y: midY).isClose(to: surface))
    // Without focus there is no glow at all.
    let rest = try Snapshot.render(TanreiButtonChrome(variant: .filled, size: .medium, isPressed: false, isFocused: false) { Text(verbatim: "Deploy") }, theme: theme)
    #expect(pixel(rest, x: lineX, y: midY).isClose(to: surface))
  }

  /// BTN-7 — the same product code under a design system WITHOUT those values: the default's look.
  @Test("BTN-7 added values fall back to the default under a system that lacks them")
  func fallbackUnderAnotherSystem() throws {
    let expected = try Snapshot.renderExact(TanreiButton("Delete", action: {}))
    let (actual, reports) = try Reports.collecting {
      try Snapshot.renderExact(TanreiButton("Delete", variant: .danger, size: .size3x, action: {}))
    }
    #expect(actual.mismatch(against: expected, channelTolerance: 0) == 0)
    #expect(reports.mention("3x") && reports.mention("danger"))
  }

  @Test("core buttons look the same under the extended system as under its parent")
  func coreUnchanged() throws {
    for variant in TanreiButtonVariant.core {
      // Identity → the bit-stable render (see `Snapshot.render` for why the fast path is not).
      let parent = try Snapshot.renderExact(TanreiButton("Deploy", variant: variant, action: {}))
      let extended = try Snapshot.renderExact(TanreiButton("Deploy", variant: variant, action: {}), theme: theme)
      #expect(extended.mismatch(against: parent, channelTolerance: 0) == 0)
    }
  }
}

// MARK: - Complexity is paid only by those who extend

// On the main actor: its tests read whole shipped systems, whose one-time initialization and copies need more
// stack than a cooperative thread has.
@MainActor
@Suite("Systems without extensions")
struct TanreiUnextendedSystemTests {
  private static func generated(_ name: String, in directory: String = "Sources/Tanrei/Generated") throws -> String {
    // …/packages/swiftui/Tests/TanreiTests/<file> → packages/swiftui
    var package = URL(fileURLWithPath: #filePath)
    for _ in 0..<3 { package.deleteLastPathComponent() }
    return try String(contentsOf: package.appendingPathComponent(directory).appendingPathComponent(name), encoding: .utf8)
  }

  /// The generated VALUES of a system that adds nothing carry no trace of the feature. In Swift the
  /// one legitimate "extension" is the declaration that holds the value, `extension TanreiSystem {`.
  /// (The default system: core is what it declares, so it can never have extensions. A preset may gain some.)
  @Test("the generated values file of the default system mentions none of it")
  func noTrace() throws {
    let text = try Self.generated("TanreiSystem+Tanrei.swift")
    let lines = text.split(separator: "\n").map(String.init)
    #expect(lines.filter { $0 == "extension TanreiSystem {" }.count == 1)
    let rest = lines.filter { $0 != "extension TanreiSystem {" }.joined(separator: "\n").lowercased()
    #expect(!rest.contains("extension"))
    #expect(!rest.contains("acme"))
    #expect(!rest.contains("diagnostics"))
    // `extra` only as part of a core step's name (`extraLarge`, `extraLong1` …), never the map.
    #expect(!rest.contains("extra:") && !rest.contains("extra ") && !rest.contains("rawvalue: \"3x\""))
  }

  /// The guard above really detects the feature: the extended system's file has all of it.
  @Test("the extended system's file has the map, the accessors and the own tokens")
  func extendedHasIt() throws {
    let text = try Self.generated("TanreiSystem+Acme.swift", in: "Tests/AcmeFixture")
    #expect(text.contains("extra: [") && text.contains("extension TanreiSpace {") && text.contains("public struct AcmeTokens"))
    #expect(text.components(separatedBy: "// ── Vocabulary extensions of \"acme\"").count == 2)  // ONE marked section
    #expect(text.contains("\nimport Tanrei\n"))
  }

  /// Structure, for every shipped system: the core values are there, every key the system lists
  /// resolves without a report, and `extra` never shadows a core value.
  @Test("every shipped system has the core sizes and variants, and every listed key resolves", arguments: ShippedSystem.allCases)
  func shippedSystemsResolve(shipped: ShippedSystem) {
    let button = shipped.system.button
    #expect(Array(button.sizes.keys.prefix(TanreiButtonSize.core.count)) == TanreiButtonSize.core)
    #expect(Array(button.variants.keys.prefix(TanreiButtonVariant.core.count)) == TanreiButtonVariant.core)
    #expect(Set(button.sizes.extra.keys).isDisjoint(with: TanreiButtonSize.core))
    #expect(Set(button.variants.extra.keys).isDisjoint(with: TanreiButtonVariant.core))
    let (_, reports) = Reports.collecting {
      for size in button.sizes.keys { #expect(button.sizes[size] == button.sizes.value(for: size)) }
      for variant in button.variants.keys { #expect(button.variants[variant] == button.variants.value(for: variant)) }
    }
    #expect(reports.messages.isEmpty)
  }
}
