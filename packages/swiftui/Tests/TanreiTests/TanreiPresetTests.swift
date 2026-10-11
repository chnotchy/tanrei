import SwiftUI
import Testing

@testable import Tanrei

// Design systems differ in values, never in tokens. These tests run the shipped
// presets through the same vocabulary and the same component code as the default system, and
// assert against values READ FROM THE SYSTEM INSTANCE: nothing here (and nothing in Sources/)
// knows what "m3-like" or "cupertino" look like.

/// Every design system the package ships.
enum ShippedSystem: String, CaseIterable, Sendable, CustomTestStringConvertible {
  case tanrei
  case m3Like = "m3-like"
  case m3ExpressiveLike = "m3-expressive-like"
  case cupertino

  var system: TanreiSystem {
    switch self {
    case .tanrei: return .tanrei
    case .m3Like: return .m3Like
    case .m3ExpressiveLike: return .m3ExpressiveLike
    case .cupertino: return .cupertino
    }
  }

  var testDescription: String { rawValue }
}

extension TanreiSystem {
  /// Every color role a token of this system names: component paints (at any depth of a mix),
  /// elevation layers, intents — found by walking the value, so a new component's tokens are
  /// covered without touching this helper. The schemes themselves are skipped.
  var referencedRoles: Set<TanreiColorRole> {
    var roles: Set<TanreiColorRole> = []
    func walk(_ value: Any) {
      if let role = value as? TanreiColorRole {
        roles.insert(role)
        return
      }
      if value is TanreiColorSchemes { return }
      for child in Mirror(reflecting: value).children { walk(child.value) }
    }
    walk(self)
    return roles
  }

  /// The roles hand-written code reads by name (the focus indicator, the snapshot backdrop).
  static let rolesReadByName: Set<TanreiColorRole> = [.focusRing, .focusRingInner, .surface]

  var schemes: [(name: String, colors: TanreiColors)] {
    [
      ("light", colors.light), ("light-medium", colors.lightMedium), ("light-high", colors.lightHigh),
      ("dark", colors.dark), ("dark-medium", colors.darkMedium), ("dark-high", colors.darkHigh),
    ]
  }

  /// Referenced roles a scheme does not define, as `"<scheme>: <role>"`.
  var unknownRoles: [String] {
    let needed = referencedRoles.union(Self.rolesReadByName)
    return schemes.flatMap { scheme in
      needed.filter { scheme.colors.values[$0] == nil }.map { "\(scheme.name): \($0.rawValue)" }.sorted()
    }
  }
}

// MARK: - Structure

// On the main actor: its tests read whole shipped systems, whose one-time initialization and copies need more
// stack than a cooperative thread has.
@MainActor
@Suite("Shipped systems: structure")
struct TanreiShippedSystemStructureTests {
  @Test("the generated id is the system's id", arguments: ShippedSystem.allCases)
  func id(shipped: ShippedSystem) {
    #expect(shipped.system.id == shipped.rawValue)
  }

  @Test("every referenced color role exists in all six schemes", arguments: ShippedSystem.allCases)
  func referencedRolesExist(shipped: ShippedSystem) {
    let system = shipped.system
    // The walk really finds roles inside paints, mixes and shadow layers.
    let referenced = system.referencedRoles
    #expect(referenced.contains(.primary) && referenced.contains(.onPrimary))
    #expect(referenced.contains(.onSurface))  // only inside `.alpha(of:)` paints
    for layer in system.elevation.level2 { #expect(referenced.contains(layer.role)) }
    #expect(system.unknownRoles == [])
  }

  @Test("the role walk reports a role no scheme has")
  func walkFindsMissingRoles() {
    var system = TanreiSystem.m3Like
    let missing = TanreiColorRole(rawValue: "quaternary")
    system.button.variants.tonal.hovered.containerColor = .mix(base: .role(.surface), with: .alpha(of: .role(missing), amount: 0.5), amount: 0.1)
    #expect(system.unknownRoles.count == 6)
    #expect(system.unknownRoles.first == "light: quaternary")
  }

  @Test("every intent resolves to its four roles in all six schemes", arguments: ShippedSystem.allCases)
  func intents(shipped: ShippedSystem) {
    let system = shipped.system
    #expect(!system.intents.isEmpty)
    for intent in system.intents {
      let name = intent.rawValue
      for role in [name, "on-\(name)", "\(name)-container", "on-\(name)-container"] {
        for scheme in system.schemes {
          #expect(scheme.colors.values[TanreiColorRole(rawValue: role)] != nil, "\(shipped.rawValue) \(scheme.name): \(role)")
        }
      }
    }
  }

  @Test("all six schemes of a system define the same roles", arguments: ShippedSystem.allCases)
  func schemesAgree(shipped: ShippedSystem) {
    let system = shipped.system
    for scheme in system.schemes { #expect(scheme.colors.roles == system.colors.light.roles, "\(scheme.name)") }
  }

  /// A palette a system declares is an open key: `tertiary` exists only in m3-like (and in
  /// m3-expressive-like, which extends it), `accent` only in the default system, and both resolve without the unknown-role fallback.
  @Test("declared palettes are open role keys that resolve in the declaring system only")
  func openRoleKeys() {
    let tertiary = TanreiColorRole(rawValue: "tertiary")
    let accent = TanreiColorRole(rawValue: "accent")
    #expect(TanreiSystem.m3Like.intents.contains(tertiary))
    #expect(!TanreiSystem.m3Like.intents.contains(accent))
    #expect(TanreiSystem.m3ExpressiveLike.intents.contains(tertiary) && !TanreiSystem.m3ExpressiveLike.intents.contains(accent))
    #expect(TanreiSystem.tanrei.intents.contains(accent))
    #expect(!TanreiSystem.tanrei.intents.contains(tertiary))
    #expect(!TanreiSystem.cupertino.intents.contains(tertiary) && !TanreiSystem.cupertino.intents.contains(accent))

    for scheme in TanreiSystem.m3Like.schemes {
      let value = scheme.colors.values[tertiary]
      #expect(value != nil && scheme.colors.values[accent] == nil)
      #expect(TanreiPaint.role(tertiary).resolve(in: scheme.colors) == value)
      // Its own color, not the primary fallback an unknown role would get.
      #expect(value != scheme.colors.value(.primary))
    }
    for scheme in TanreiSystem.tanrei.schemes {
      let value = scheme.colors.values[accent]
      #expect(value != nil && scheme.colors.values[tertiary] == nil)
      #expect(TanreiPaint.role(accent).resolve(in: scheme.colors) == value)
    }
  }

  /// Font stacks arrive already read: named families, a generic class, and whether the
  /// platform's own font leads. The label font is the first INSTALLED named family, unless the
  /// stack asks for the platform font first; otherwise the platform font of the generic class.
  @Test("preset font stacks resolve sanely", arguments: ShippedSystem.allCases)
  func fontFallback(shipped: ShippedSystem) {
    let label = shipped.system.button.sizes.medium.labelTypescale
    if let family = label.installedFamily {
      #expect(TanreiFontRegistry.isInstalled(family: family))
      #expect(label.font.families.contains(family) && !label.font.system)
    }
    // Resolution never fails and keeps the token line height reachable.
    let resolved = label.resolved(policy: .tokens)
    #expect(resolved.lineSpacing >= 0 && resolved.lineSpacing < label.lineHeight)
    #expect(label.resolved(policy: .system).tracking == label.tracking)
  }

  @Test("a font stack is read as the IR read it: named families in order, unless the platform font leads")
  func fontStackReading() {
    func stack(_ families: [String], generic: TanreiFontGeneric = .sansSerif, system: Bool = false) -> TanreiFontStack {
      TanreiFontStack(families: families, generic: generic, system: system)
    }
    // Helvetica ships with every Apple OS, so it stands in for "an installed family".
    #expect(TanreiFontRegistry.isInstalled(family: "Helvetica"))
    #expect(stack(["Helvetica"]).installedFamily == "Helvetica")
    #expect(stack(["No Such Family 0", "Helvetica"]).installedFamily == "Helvetica")
    #expect(stack(["No Such Family 0"]).installedFamily == nil)
    #expect(stack([]).installedFamily == nil)
    // `system`: the platform font comes first, so a named family is never consulted, installed or not.
    #expect(stack(["Helvetica"], system: true).installedFamily == nil)
    // A generic keyword is not a family any more: it cannot be "installed" because it is never listed.
    for shipped in ShippedSystem.allCases {
      let faces = shipped.system.typefaces
      for face in [faces.brand, faces.plain, faces.mono, faces.icon] {
        #expect(!face.families.contains { ["system-ui", "-apple-system", "blinkmacsystemfont", "ui-monospace", "sans-serif", "serif", "monospace"].contains($0.lowercased()) })
      }
    }
  }

  /// What the shipped systems say, as delivered: the default names Inter then the Noto families and
  /// falls back to the platform sans; cupertino asks for the platform font first (SF on Apple
  /// platforms) and only lists Inter for platforms without one; mono is the monospace class.
  @Test("the typefaces of the shipped systems")
  func typefaces() {
    let tanrei = TanreiSystem.tanrei.typefaces
    #expect(tanrei.plain == TanreiFontStack(families: ["Inter", "Noto Sans JP", "Noto Sans"], generic: .sansSerif, system: false))
    #expect(tanrei.brand == tanrei.plain)
    #expect(tanrei.mono.generic == .monospace && tanrei.mono.families.first == "Roboto Mono" && !tanrei.mono.system)
    #expect(tanrei.icon.families == ["Material Symbols Rounded"])
    // Text styles carry the stack of the typeface they are built from.
    #expect(TanreiSystem.tanrei.typescale.label.font == tanrei.plain)
    #expect(TanreiSystem.tanrei.typescale.code.font == tanrei.mono)

    let cupertino = TanreiSystem.cupertino.typefaces
    #expect(cupertino.plain.system && cupertino.plain.generic == .sansSerif && cupertino.plain.families == ["Inter"])
    #expect(cupertino.mono.system && cupertino.mono.generic == .monospace)
    #expect(TanreiSystem.cupertino.button.sizes.medium.labelTypescale.installedFamily == nil)
    #expect(TanreiSystem.m3Like.typefaces.plain.families.first == "Roboto")
  }

  /// A modified system drives the font: re-pointing the stack changes what is resolved.
  @Test("a modified system drives the font family")
  func modifiedFontStack() {
    var system = TanreiSystem.tanrei
    system.typescale.label.font = TanreiFontStack(families: ["No Such Family 0", "Helvetica"], generic: .serif, system: false)
    #expect(system.typescale.label.installedFamily == "Helvetica")
    system.typescale.label.font.system = true
    #expect(system.typescale.label.installedFamily == nil)
  }
}

// MARK: - Button under the presets

/// BTN-3 — the same component, driven only by another system's values.
@MainActor
@Suite("TanreiButton under the shipped presets")
struct TanreiButtonPresetTests {
  let inset = Snapshot.inset

  private func theme(_ system: TanreiSystem) -> TanreiTheme {
    var theme = Snapshot.theme
    theme.system = system
    return theme
  }

  private func chrome(_ variant: TanreiButtonVariant, isPressed: Bool = false) -> some View {
    TanreiButtonChrome(variant: variant, size: .medium, isPressed: isPressed, isFocused: false) {
      Text(verbatim: "Deploy")
    }
  }

  private func appearance(_ system: TanreiSystem, _ variant: TanreiButtonVariant, _ state: TanreiInteraction) -> TanreiButtonAppearance {
    TanreiButtonAppearance(tokens: system.button, variant: variant, size: .medium, state: state)
  }

  private func pixel(_ bitmap: Bitmap, x: CGFloat, y: CGFloat) -> Bitmap.RGBA {
    bitmap[Int(x * Snapshot.scale), Int(y * Snapshot.scale)]
  }

  /// A point inside the container's inline padding, vertically centred: container color, no glyphs.
  private func containerPoint(_ tokens: TanreiButtonTokens) -> CGPoint {
    CGPoint(x: inset + tokens.sizes.medium.containerPaddingInlineStart / 2, y: inset + tokens.sizes.medium.containerHeight / 2)
  }

  private func contains(_ bitmap: Bitmap, _ color: Bitmap.RGBA) -> Bool {
    for y in 0..<bitmap.height {
      for x in 0..<bitmap.width where bitmap[x, y].isClose(to: color) { return true }
    }
    return false
  }

  // MARK: m3-like

  @Test("BTN-3 m3-like: the filled medium container is a pill filled with the system's primary")
  func m3LikeFilledPill() throws {
    let system = TanreiSystem.m3Like
    let colors = system.colors.light
    let tokens = system.button
    let rest = appearance(system, .filled, .enabled)
    #expect(rest.cornerRadius == system.shape.full)
    #expect(rest.cornerRadius >= rest.height / 2)
    #expect(rest.container.resolve(in: colors) == colors.value(.primary))
    #expect(rest.label.resolve(in: colors) == colors.value(.onPrimary))
    // The preset is chromatic: not the default system's primary.
    #expect(colors.value(.primary) != TanreiSystem.tanrei.colors.light.value(.primary))

    let bitmap = try Snapshot.render(chrome(.filled), theme: theme(system))
    #expect(CGFloat(bitmap.height) == (tokens.sizes.medium.containerHeight + 2 * inset) * Snapshot.scale)
    let point = containerPoint(tokens)
    #expect(pixel(bitmap, x: point.x, y: point.y).isClose(to: colors[.primary].rgba8()))
    // A pill: the end cap is a half circle, so the fill reaches the leading edge only at mid
    // height, and a point a fraction of the radius in from the corner is still the surface.
    let radius = tokens.sizes.medium.containerHeight / 2
    #expect(pixel(bitmap, x: inset + 1, y: inset + radius).isClose(to: colors[.primary].rgba8()))
    #expect(pixel(bitmap, x: inset + radius * 0.15, y: inset + radius * 0.15).isClose(to: colors[.surface].rgba8()))
    #expect(pixel(bitmap, x: inset + 1, y: inset + radius * 0.4).isClose(to: colors[.surface].rgba8()))
  }

  @Test("BTN-3 m3-like: pressed is a state layer — the system's mix, rendered")
  func m3LikePressedMix() throws {
    let system = TanreiSystem.m3Like
    let colors = system.colors.light
    let pressed = appearance(system, .filled, .pressed)
    #expect(pressed.container == .mix(base: .role(.primary), with: .role(.onPrimary), amount: system.state.pressedStateLayerOpacity))
    #expect(pressed.opacity == system.button.pressed.opacity)
    let bitmap = try Snapshot.render(chrome(.filled, isPressed: true), theme: theme(system))
    let expected = colors[.onPrimary].opacity(system.state.pressedStateLayerOpacity).rgba8(over: colors[.primary])
    let point = containerPoint(system.button)
    #expect(pixel(bitmap, x: point.x, y: point.y).isClose(to: expected))
  }

  // MARK: m3-expressive-like

  /// A shipped preset that EXTENDS the size axis and revalues every size, the gap and
  /// the outline width included. Expected numbers are asserted once against the system instance;
  /// the rendering is compared with what the instance says.
  @Test("BTN-3 BTN-5 m3-expressive-like: xlarge is 136 tall with a 3pt outline and a 16pt gap, xsmall 32 tall")
  func m3ExpressiveLikeSizes() throws {
    let system = TanreiSystem.m3ExpressiveLike
    let colors = system.colors.light
    let sizes = system.button.sizes
    #expect(sizes.keys == [.small, .medium, .large, .xlarge, .xsmall])  // core, then what was added by key
    let order: [TanreiButtonSize] = [.xsmall, .small, .medium, .large, .xlarge]
    #expect(order.map { sizes[$0].containerHeight } == [32, 40, 56, 96, 136])
    #expect(order.map { sizes[$0].iconSize } == [20, 20, 24, 32, 40])
    #expect(order.map { sizes[$0].containerGap } == [8, 8, 8, 12, 16])
    #expect(order.map { sizes[$0].outlineWidth } == [1, 1, 1, 2, 3])

    func button(_ size: TanreiButtonSize) -> some View {
      TanreiButton("Deploy", variant: .outlined, size: size, action: {}) { Image(systemName: "arrow.up") }
    }
    let xlarge = sizes[.xlarge]
    let (bitmap, reports) = try Reports.collecting { try Snapshot.render(button(.xlarge), theme: theme(system)) }
    #expect(reports.messages.isEmpty)  // an added size of THIS system: no fallback
    #expect(CGFloat(bitmap.height) == (xlarge.containerHeight + 2 * inset) * Snapshot.scale)
    #expect(xlarge.containerHeight == 136)

    // Outline: `outlineWidth` points of the outline paint from the leading edge at mid-height
    // (the straight part of any corner), then the surface — the outlined container draws nothing.
    let outline = colors[system.button.variants.outlined.enabled.outlineColor].rgba8()
    let midY = inset + xlarge.containerHeight / 2
    #expect(pixel(bitmap, x: inset + xlarge.outlineWidth - 0.5, y: midY).isClose(to: outline))
    #expect(!pixel(bitmap, x: inset + xlarge.outlineWidth + 0.5, y: midY).isClose(to: outline))
    #expect(xlarge.outlineWidth == 3)

    // Gap: without it the same button is exactly `containerGap` narrower.
    var noGap = system
    noGap.button.sizes.extra[.xlarge]?.containerGap = 0
    let narrower = try Snapshot.render(button(.xlarge), theme: theme(noGap))
    #expect(CGFloat(bitmap.width - narrower.width) == xlarge.containerGap * Snapshot.scale)
    #expect(xlarge.containerGap == 16)

    let xsmall = try Snapshot.render(TanreiButton("Deploy", variant: .outlined, size: .xsmall, action: {}), theme: theme(system))
    #expect(CGFloat(xsmall.height) == (sizes[.xsmall].containerHeight + 2 * inset) * Snapshot.scale)
    #expect(sizes[.xsmall].containerHeight == 32)

    // Under a system without these sizes the same code draws the default size (BTN-7).
    let (fallback, fallbackReports) = try Reports.collecting { try Snapshot.render(button(.xlarge), theme: theme(.m3Like)) }
    #expect(CGFloat(fallback.height) == (TanreiSystem.m3Like.button.sizes.medium.containerHeight + 2 * inset) * Snapshot.scale)
    #expect(fallbackReports.mention("xlarge"))
  }

  @Test("m3-like: elevation is soft shadows with no border ring")
  func m3LikeElevation() throws {
    let system = TanreiSystem.m3Like
    let colors = system.colors.light
    let tokens = system.button
    let rest = appearance(system, .elevated, .enabled)
    #expect(rest.elevation == system.elevation.level1)
    let plan = TanreiElevationPlan(layers: rest.elevation)
    // No layer of this system is a ring, so every layer is drawn as a shadow — spread included.
    #expect(plan.ring == nil)
    #expect(plan.shadows == system.elevation.level1)
    #expect(plan.shadows.contains { $0.spread > 0 })
    #expect(rest.outline == TanreiPaint.none)

    let bitmap = try Snapshot.render(chrome(.elevated), theme: theme(system))
    let surface = colors[.surface].rgba8()
    let midX = CGFloat(bitmap.width) / Snapshot.scale / 2
    let bottom = inset + tokens.sizes.medium.containerHeight
    // Below the container the shadow darkens the surface, softly: it is far from a solid line
    // and fades out within the blur.
    let below = pixel(bitmap, x: midX, y: bottom + 0.5)
    #expect(below.r < surface.r)
    #expect(Int(surface.r) - Int(below.r) < 96)
    let far = pixel(bitmap, x: midX, y: bottom + inset - 1)
    #expect(far.isClose(to: surface, tolerance: 6))
    // The shadows are offset downwards: above the container there is less of them than below,
    // and nothing like a ring — a little further out the surface is untouched.
    let above = pixel(bitmap, x: midX, y: inset - 0.5)
    #expect(above.r > below.r)
    #expect(pixel(bitmap, x: midX, y: inset - 4.5).isClose(to: surface, tolerance: 6))
    // The container is the system's surface-container-low, labelled in primary.
    let point = containerPoint(tokens)
    #expect(pixel(bitmap, x: point.x, y: point.y).isClose(to: colors[.surfaceContainerLow].rgba8()))
    #expect(contains(bitmap, colors[.primary].rgba8()))
  }

  @Test("a shadow layer's spread grows the shadow")
  func spreadIsDrawn() throws {
    var system = TanreiSystem.m3Like
    let shadow = TanreiColorRole.elevationShadow3
    func render(spread: CGFloat) throws -> Bitmap {
      system.button.variants.elevated.enabled.containerElevation = [TanreiShadowLayer(x: 0, y: 0, blur: 2, spread: spread, role: shadow)]
      return try Snapshot.render(chrome(.elevated), theme: theme(system))
    }
    let midY = inset + system.button.sizes.medium.containerHeight / 2
    let without = pixel(try render(spread: 0), x: inset - 3.5, y: midY)
    let with = pixel(try render(spread: 4), x: inset - 3.5, y: midY)
    let surface = system.colors.light[.surface].rgba8()
    #expect(without.isClose(to: surface))
    #expect(with.r < surface.r && !with.isClose(to: surface))
  }

  @Test("open role keys render: tertiary under m3-like, accent under the default system")
  func openRoleKeysRender() throws {
    for (base, name) in [(TanreiSystem.m3Like, "tertiary"), (TanreiSystem.tanrei, "accent")] {
      var system = base
      let role = TanreiColorRole(rawValue: name)
      system.button.variants.filled.enabled.containerColor = .role(role)
      let bitmap = try Snapshot.render(chrome(.filled), theme: theme(system))
      let point = containerPoint(system.button)
      let expected = try #require(system.colors.light.values[role]).color.rgba8()
      #expect(pixel(bitmap, x: point.x, y: point.y).isClose(to: expected))
      #expect(!expected.isClose(to: system.colors.light[.primary].rgba8()))
    }
  }

  // MARK: cupertino

  @Test("BTN-3 cupertino: hovered and focused draw exactly what rest draws", arguments: TanreiButtonVariant.core)
  func cupertinoNoHover(variant: TanreiButtonVariant) {
    let system = TanreiSystem.cupertino
    let rest = appearance(system, variant, .enabled)
    #expect(appearance(system, variant, .hovered) == rest)
    #expect(appearance(system, variant, .focused) == rest)
    // Whereas the default system and m3-like do have a hover.
    #expect(appearance(.tanrei, variant, .hovered) != appearance(.tanrei, variant, .enabled))
    #expect(appearance(.m3Like, variant, .hovered) != appearance(.m3Like, variant, .enabled))
  }

  @Test("BTN-3 cupertino: pressed keeps the colors and dims the whole control by the system's opacity")
  func cupertinoPressedOpacity() throws {
    let system = TanreiSystem.cupertino
    let colors = system.colors.light
    let tokens = system.button
    let rest = appearance(system, .filled, .enabled)
    let pressed = appearance(system, .filled, .pressed)
    #expect(pressed.opacity == tokens.pressed.opacity)
    #expect(pressed.opacity < 1 && pressed.opacity > 0)
    #expect(rest.opacity == 1)
    #expect(pressed.container == rest.container && pressed.label == rest.label)

    let point = containerPoint(tokens)
    let restBitmap = try Snapshot.render(chrome(.filled), theme: theme(system))
    #expect(pixel(restBitmap, x: point.x, y: point.y).isClose(to: colors[.primary].rgba8()))
    let pressedBitmap = try Snapshot.render(chrome(.filled, isPressed: true), theme: theme(system))
    let expected = colors[.primary].opacity(tokens.pressed.opacity).rgba8(over: colors[.surface])
    #expect(pixel(pressedBitmap, x: point.x, y: point.y).isClose(to: expected))
    #expect(!expected.isClose(to: colors[.primary].rgba8()))
  }

  @Test("cupertino: the tonal label is the system tint on a gray fill, not on-surface")
  func cupertinoTonalLabel() throws {
    let system = TanreiSystem.cupertino
    let colors = system.colors.light
    let tonal = appearance(system, .tonal, .enabled)
    #expect(tonal.label.resolve(in: colors) == colors.value(.primary))
    #expect(tonal.label.resolve(in: colors) != colors.value(.onSurface))
    #expect(tonal.container.resolve(in: colors) == colors.value(.secondaryContainer))
    // The filled label is white on the tint.
    #expect(appearance(system, .filled, .enabled).label.resolve(in: colors) == colors.value(.onPrimary))

    let bitmap = try Snapshot.render(chrome(.tonal), theme: theme(system))
    let point = containerPoint(system.button)
    let container = pixel(bitmap, x: point.x, y: point.y)
    #expect(container.isClose(to: colors[.secondaryContainer].rgba8()))
    // Gray: no channel stands out.
    #expect(abs(Int(container.r) - Int(container.b)) <= 12)
    // Only glyphs can be tinted, and they are; nothing is drawn in on-surface.
    #expect(contains(bitmap, colors[.primary].rgba8()))
    #expect(!contains(bitmap, colors[.onSurface].rgba8()))
  }

  @Test("cupertino: corners are the system's rounded-rectangle radius, not a pill")
  func cupertinoCorners() throws {
    let system = TanreiSystem.cupertino
    let colors = system.colors.light
    let tokens = system.button
    let rest = appearance(system, .filled, .enabled)
    #expect(rest.cornerRadius == tokens.containerShape)
    #expect(rest.cornerRadius == system.shape.medium)
    #expect(rest.cornerRadius > 0 && rest.cornerRadius < rest.height / 2)
    for state in TanreiInteraction.allCases { #expect(appearance(system, .filled, state).cornerRadius == rest.cornerRadius) }

    let bitmap = try Snapshot.render(chrome(.filled), theme: theme(system))
    let radius = rest.cornerRadius
    // The leading edge is straight from `radius` down: filled there (a pill is not)…
    #expect(pixel(bitmap, x: inset + 0.75, y: inset + radius + 1).isClose(to: colors[.primary].rgba8()))
    // …and the corner itself is cut.
    #expect(pixel(bitmap, x: inset + 0.75, y: inset + 0.75).isClose(to: colors[.surface].rgba8()))
    #expect(pixel(bitmap, x: inset + radius * 0.5, y: inset + radius * 0.5).isClose(to: colors[.primary].rgba8()))
    // Pure white surface, as the preset says of itself.
    #expect(colors.value(.surface) == TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1))
  }

  /// The container height is a minimum the label may exceed; in every shipped system it does not
  /// (the token build refuses a height that cannot hold its block padding and one label line), so
  /// the rendered height IS the height token at every size.
  @Test("BTN-5 layout follows each system's tokens at every size", arguments: ShippedSystem.allCases)
  func visualSize(shipped: ShippedSystem) throws {
    let system = shipped.system
    for size in system.button.sizes.keys {
      let bitmap = try Snapshot.render(TanreiButton("Deploy", size: size, action: {}), theme: theme(system))
      let appearance = TanreiButtonAppearance(tokens: system.button, variant: .filled, size: size, state: .enabled)
      #expect(2 * appearance.paddingBlock + appearance.labelTypescale.lineHeight <= appearance.height, "\(shipped.rawValue) \(size.rawValue)")
      #expect(CGFloat(bitmap.height) == (appearance.height + 2 * inset) * Snapshot.scale, "\(shipped.rawValue) \(size.rawValue)")
    }
  }
}

// MARK: - Preset baselines

/// Baselines of the presets, light scheme: `__Snapshots__/TanreiButtonTests/<system-id>/<fixture-id>.png`.
/// The default system's baselines stay where conventions.js puts them and are not touched here.
@MainActor
@Suite("TanreiButton preset snapshots")
struct TanreiButtonPresetSnapshotTests {
  struct Fixture: Sendable, CustomTestStringConvertible {
    let preset: ShippedSystem
    let fixture: TanreiButtonSnapshotTests.Fixture
    var testDescription: String { "\(preset.rawValue)/\(fixture.id)" }
  }

  nonisolated static let fixtureIds = ["filled-medium", "tonal-medium", "outlined-medium", "elevated-medium", "text-medium"]

  nonisolated static let fixtures: [Fixture] = [ShippedSystem.m3Like, .cupertino].flatMap { preset in
    fixtureIds.compactMap { id in
      TanreiButtonSnapshotTests.fixtures.first { $0.id == id }.map { Fixture(preset: preset, fixture: $0) }
    }
  }

  @Test("every preset fixture is one of the spec's fixtures")
  func fixtureList() {
    #expect(Self.fixtures.count == 2 * Self.fixtureIds.count)
  }

  @Test("preset fixture matches its baseline", arguments: fixtures)
  func fixture(_ item: Fixture) throws {
    var theme = Snapshot.theme
    theme.system = item.preset.system
    let view = TanreiButton("Deploy", variant: item.fixture.variant, size: item.fixture.size, action: {})
      .disabled(item.fixture.disabled)
    try Snapshot.assert(view, named: "\(item.preset.rawValue)/\(item.fixture.id)", suite: "TanreiButtonTests", theme: theme)
  }
}
