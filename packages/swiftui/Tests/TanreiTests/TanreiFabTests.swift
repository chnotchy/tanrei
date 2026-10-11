import AcmeFixture
import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/fab.spec.json. Each behavior id (FAB-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file. FAB-1…10 are BTN-1…10 for this component: the primitives they rest on
// (press hold, ripple, contact point, focus ring, hit target, container layers, elevation surface) are tested once in
// TanreiButtonTests / TanreiPrimitivesTests; here each is proven to reach the floating action button.
//
// Icons: Tanrei does not bundle the icon font, and baselines render with `Snapshot.theme` (`fontFamilyPolicy:
// .system`), under which a glyph draws nothing. The fixtures' content "add" is therefore drawn with the SF Symbol a
// product would pass for it, `plus` (see TanreiIconButtonTests). Baselines leave room around the FAB for its shadow
// (FAB-12: cast outside the container, never clipped), as the other platforms' do.

private let suiteName = "TanreiFabTests"

@MainActor
private final class Counter {
  var count = 0
}

/// The snapshot theme with another design system.
@MainActor
private func theme(_ system: TanreiSystem, policy: TanreiFontFamilyPolicy = .system) -> TanreiTheme {
  var theme = Snapshot.theme
  theme.system = system
  theme.fontFamilyPolicy = policy
  return theme
}

/// Device pixel for a point given in layout points from the top-left of the render.
@MainActor
private func pixel(_ bitmap: Bitmap, x: CGFloat, y: CGFloat) -> Bitmap.RGBA {
  bitmap[Int(x * Snapshot.scale), Int(y * Snapshot.scale)]
}

/// The chrome alone, with an icon view that draws nothing (so every point inside is the container) unless given.
@MainActor
private func chrome(_ variant: TanreiFabVariant = .filled, size: TanreiFabSize = .medium, isPressed: Bool = false, isFocused: Bool = false) -> some View {
  TanreiFabChrome(variant: variant, size: size, isPressed: isPressed, isFocused: isFocused) { Color.clear }
}

/// The chrome with a square icon: the whole icon box is drawn in the icon color.
@MainActor
private func boxChrome(_ variant: TanreiFabVariant = .filled, size: TanreiFabSize = .medium) -> some View {
  TanreiFabChrome(variant: variant, size: size, isPressed: false, isFocused: false) { Rectangle() }
}

/// The center of the square of `size` in a render (the icon's center).
@MainActor
private func center(_ tokens: TanreiFabTokens, _ size: TanreiFabSize = .medium) -> CGPoint {
  let side = tokens.sizes[size].containerSize
  return CGPoint(x: Snapshot.inset + side / 2, y: Snapshot.inset + side / 2)
}

/// A point of the container outside the icon box: half-way between the box and the leading edge, mid-height.
@MainActor
private func containerPoint(_ tokens: TanreiFabTokens, _ size: TanreiFabSize = .medium) -> CGPoint {
  let metrics = tokens.sizes[size]
  return CGPoint(x: Snapshot.inset + (metrics.containerSize - metrics.iconSize) / 4, y: Snapshot.inset + metrics.containerSize / 2)
}

/// Whether no two colors of `colors` are the same.
@MainActor
private func allDistinct(_ colors: [Bitmap.RGBA]) -> Bool {
  colors.indices.allSatisfy { i in colors.indices.allSatisfy { j in i == j || colors[i] != colors[j] } }
}

// MARK: - Activation (FAB-1, FAB-2, FAB-5, FAB-14)

@MainActor
@Suite("TanreiFloatingActionButton activation", .serialized)
struct TanreiFabActivationTests {
  /// FAB-1 — one activation emits `action` exactly once; FAB-2 — never while disabled.
  @Test("FAB-1 FAB-2 activation emits action exactly once; never while disabled")
  func activationEmitsOnce() {
    let counter = Counter()
    let button = TanreiFloatingActionButton("Create", icon: "add", action: { counter.count += 1 })
    button.activate(isEnabled: true)
    #expect(counter.count == 1)
    button.activate(isEnabled: true)
    #expect(counter.count == 2)
    button.activate(isEnabled: false)
    #expect(counter.count == 2)
  }

  /// FAB-14 — an empty label is reported in debug builds, and the button still renders.
  @Test("FAB-14 an empty label is reported and the button still renders")
  func emptyLabel() throws {
    let (_, reports) = Reports.collecting {
      _ = TanreiFloatingActionButton("", icon: "add", action: {})
      _ = TanreiFloatingActionButton(LocalizedStringKey(""), icon: "add", action: {})
      _ = TanreiFloatingActionButton("", action: {}) { Image(systemName: "plus") }
    }
    #expect(reports.messages.count == 3)
    #expect(reports.mention("empty label") && reports.mention("accessible name") && reports.mention("FAB-14"))

    let (_, silent) = Reports.collecting {
      _ = TanreiFloatingActionButton("Create", icon: "add", action: {})
      _ = TanreiFloatingActionButton(LocalizedStringKey("Create"), icon: "add", action: {})
    }
    #expect(silent.messages.isEmpty)

    let tokens = TanreiSystem.tanrei.fab
    let (bitmap, _) = try Reports.collecting { try Snapshot.render(TanreiFloatingActionButton("", action: {}) { Image(systemName: "plus") }) }
    #expect(CGFloat(bitmap.width) == (tokens.sizes.medium.containerSize + 2 * Snapshot.inset) * Snapshot.scale)
    let point = containerPoint(tokens)
    #expect(pixel(bitmap, x: point.x, y: point.y).isClose(to: TanreiSystem.tanrei.colors.light[.primary].rgba8()))
  }

  #if os(macOS)
  /// FAB-1 by pointer, FAB-2 by pointer: a real click in the middle of the button.
  @Test("FAB-1 FAB-2 pointer click emits once when enabled, never when disabled", arguments: [true, false])
  func pointerClick(isEnabled: Bool) {
    let counter = Counter()
    let hosted = HostedView(
      TanreiFloatingActionButton("Create", icon: "add", action: { counter.count += 1 })
        .disabled(!isEnabled)
        .padding(Snapshot.inset)
        .tanreiTheme(Snapshot.theme)
    )
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: hosted.size.height / 2))
    #expect(counter.count == (isEnabled ? 1 : 0))
  }

  /// FAB-5 end to end, on BOTH axes: a click outside the square but inside the minimum target activates it; beyond the
  /// target nothing happens. The small FAB (40) is below the pointer target (44).
  @Test("FAB-5 a click in the extended hit area activates the button, above and beside it")
  func extendedHitAreaClick() {
    let counter = Counter()
    let hosted = HostedView(
      TanreiFloatingActionButton("Create", icon: "add", size: .small, action: { counter.count += 1 })
        .padding(Snapshot.inset)
        .tanreiTheme(Snapshot.theme)
    )
    let system = Snapshot.theme.system
    let side = system.fab.sizes.small.containerSize
    let outset = (TanreiHitTarget.minimum(in: system.measure) - side) / 2
    #expect(outset > 0)
    let middle = Snapshot.inset + side / 2
    hosted.click(at: CGPoint(x: middle, y: Snapshot.inset - outset / 2))  // above
    #expect(counter.count == 1)
    hosted.click(at: CGPoint(x: Snapshot.inset - outset / 2, y: middle))  // beside
    #expect(counter.count == 2)
    hosted.click(at: CGPoint(x: middle, y: Snapshot.inset - outset - 1))
    hosted.click(at: CGPoint(x: Snapshot.inset - outset - 1, y: middle))
    #expect(counter.count == 2)
  }

  /// FAB-5 — the target size is a value of the design system.
  @Test("FAB-5 a modified system drives the hit area")
  func modifiedSystemHitArea() {
    var custom = Snapshot.theme
    let side = custom.system.fab.sizes.small.containerSize
    let defaultOutset = (TanreiHitTarget.minimum(in: custom.system.measure) - side) / 2
    custom.system.measure.targetPointer = side
    custom.system.measure.targetTouch = side
    let counter = Counter()
    let hosted = HostedView(
      TanreiFloatingActionButton("Create", icon: "add", size: .small, action: { counter.count += 1 })
        .padding(Snapshot.inset)
        .tanreiTheme(custom)
    )
    hosted.click(at: CGPoint(x: Snapshot.inset + side / 2, y: Snapshot.inset - defaultOutset / 2))
    #expect(counter.count == 0)
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: hosted.size.height / 2))
    #expect(counter.count == 1)
  }
  #endif
}

// MARK: - Token bindings (FAB-3, FAB-6, FAB-11, FAB-12)

@MainActor
@Suite("TanreiFloatingActionButton token bindings")
struct TanreiFabTokenBindingTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiFabTokens { system.fab }

  /// The default system's values.
  static let expected: [TanreiFabVariant: (container: TanreiColorRole, icon: TanreiColorRole)] = [
    .filled: (.primary, .onPrimary),
    .tonal: (.secondaryContainer, .onSecondaryContainer),
    .surface: (.surfaceContainerLowest, .primary),
  ]

  private func appearance(_ variant: TanreiFabVariant, _ state: TanreiInteraction, size: TanreiFabSize = .medium, tokens: TanreiFabTokens? = nil) -> TanreiFabAppearance {
    TanreiFabAppearance(tokens: tokens ?? self.tokens, variant: variant, size: size, state: state)
  }

  /// At rest each variant binds its container and icon colors, level3, full opacity and the size's corner.
  @Test("FAB-3 FAB-12 at rest each variant binds the expected color roles and level3", arguments: TanreiFabVariant.core)
  func roles(variant: TanreiFabVariant) throws {
    let expected = try #require(Self.expected[variant])
    let rest = appearance(variant, .enabled)
    #expect(rest.container == .role(expected.container))
    #expect(rest.icon == .role(expected.icon))
    #expect(rest.elevation == system.elevation.level3)
    #expect(rest.opacity == 1)
    #expect(rest.cornerRadius == tokens.sizes.medium.containerShape)
    #expect(rest.ripple == nil)
    // The state-layer color aliases the icon color.
    #expect(tokens.variants[variant].enabled.stateLayerColor == rest.icon)
  }

  /// The three variants differ in container color at rest, light and dark.
  @Test("FAB-3 the three variants differ at rest, light and dark")
  func variantsDiffer() {
    for scheme in [system.colors.light, system.colors.dark] {
      let containers = TanreiFabVariant.core.map { scheme[appearance($0, .enabled).container] }
      #expect(allDistinct(containers.map { $0.rgba8() }))
    }
  }

  @Test("paints resolve to the generated colors in light and dark", arguments: TanreiFabVariant.core)
  func colorsInLightAndDark(variant: TanreiFabVariant) throws {
    let expected = try #require(Self.expected[variant])
    let rest = appearance(variant, .enabled)
    for (themeAppearance, scheme) in [(TanreiAppearance.light, system.colors.light), (.dark, system.colors.dark)] {
      let colors = TanreiTheme(appearance: themeAppearance, contrast: .standard).colors(systemScheme: .light, systemContrast: .standard)
      #expect(colors == scheme)
      #expect(rest.icon.resolve(in: colors) == scheme.value(expected.icon))
      #expect(rest.container.resolve(in: colors) == scheme.value(expected.container))
    }
  }

  /// FAB-11 — each size binds its square, corner and icon box; the tokens: 40 / 48 / 64 with corners 8 / 12 / 16 and
  /// icons 20 / 24 / 24.
  @Test("FAB-11 each size binds its container size, corner and icon size")
  func sizes() {
    for size in TanreiFabSize.core {
      let rest = appearance(.filled, .enabled, size: size)
      #expect(rest.containerSize == tokens.sizes[size].containerSize)
      #expect(rest.cornerRadius == tokens.sizes[size].containerShape)
      #expect(rest.iconSize == tokens.sizes[size].iconSize)
      // A FAB does not change shape per state.
      for state in TanreiInteraction.allCases { #expect(appearance(.filled, state, size: size).cornerRadius == rest.cornerRadius) }
    }
    let sizes = [tokens.sizes.small, tokens.sizes.medium, tokens.sizes.large]
    #expect(sizes.map(\.containerSize) == [40, 48, 64])
    #expect(sizes.map(\.containerShape) == [system.shape.medium, system.shape.large, system.shape.extraLarge])
    #expect(sizes.map(\.iconSize) == [system.measure.iconMedium, system.measure.iconLarge, system.measure.iconLarge])
    // Each size reads its own values.
    var custom = tokens
    custom.sizes.large.containerSize = 80
    custom.sizes.large.containerShape = 3
    custom.sizes.large.iconSize = 30
    let large = appearance(.filled, .enabled, size: .large, tokens: custom)
    let medium = appearance(.filled, .enabled, size: .medium, tokens: custom)
    #expect(large.containerSize == 80 && large.cornerRadius == 3 && large.iconSize == 30)
    #expect(medium == appearance(.filled, .enabled, size: .medium))
  }

  /// FAB-3 — every state reads that state's tokens. In the default system a state is the state-layer color mixed into
  /// the container (a VALUE of this system); hover also raises the FAB to level4, focus and press keep level3.
  @Test("FAB-3 FAB-12 each state binds that state's tokens; hover rises to level4", arguments: TanreiFabVariant.core)
  func stateBindings(variant: TanreiFabVariant) {
    let rest = appearance(variant, .enabled)
    let layer = tokens.variants[variant].enabled.stateLayerColor
    let amounts: [(TanreiInteraction, Double, [TanreiShadowLayer])] = [
      (.hovered, system.state.hoverStateLayerOpacity, system.elevation.level4),
      (.focused, system.state.focusStateLayerOpacity, system.elevation.level3),
      (.pressed, system.state.pressedStateLayerOpacity, system.elevation.level3),
    ]
    for (state, amount, elevation) in amounts {
      let drawn = appearance(variant, state)
      #expect(drawn.container == .mix(base: rest.container, with: layer, amount: amount), "\(variant) \(state)")
      #expect(drawn.container == tokens.variants[variant][state: state].containerColor)
      #expect(drawn.icon == rest.icon && drawn.opacity == 1)
      #expect(drawn.elevation == elevation, "\(variant) \(state)")
    }
  }

  /// FAB-3 (verify) — under the acme fixture system, hovered, focused and pressed are three different values.
  @Test("FAB-3 under acme, hovered, focused and pressed differ")
  func acme() {
    for variant in TanreiFabVariant.core {
      let containers = [TanreiInteraction.hovered, .focused, .pressed].map { TanreiFabAppearance(tokens: TanreiSystem.acme.fab, variant: variant, size: .medium, state: $0).container }
      #expect(allDistinct(containers.map { TanreiSystem.acme.colors.light[$0].rgba8() }), "\(variant)")
    }
  }

  /// FAB-6 — disabled draws from the disabled tokens of its variant: an on-surface fill at the disabled container
  /// opacity, the icon as disabled content, no elevation.
  @Test("FAB-6 disabled bindings", arguments: TanreiFabVariant.core)
  func disabled(variant: TanreiFabVariant) {
    let drawn = appearance(variant, .disabled)
    let own = tokens.variants[variant].disabled
    #expect(drawn.container == .alpha(of: .role(.onSurface), amount: system.state.disabledContainerOpacity))
    #expect(drawn.icon == .alpha(of: .role(.onSurface), amount: system.state.disabledContentOpacity))
    #expect(drawn.elevation == system.elevation.level0 && drawn.elevation.isEmpty)
    #expect(drawn.container == own.containerColor && drawn.icon == own.iconColor && drawn.elevation == own.containerElevation)
    #expect(drawn.opacity == tokens.disabled.opacity)
  }

  /// FAB-3 FAB-6 FAB-12 — the values drive the result: change one token of one state and exactly that state changes.
  @Test("FAB-3 FAB-6 FAB-12 a modified system changes what each state resolves to")
  func modifiedSystem() {
    var custom = tokens
    custom.variants.filled.hovered.containerColor = .role(.error)
    custom.variants.filled.focused.iconColor = .role(.warning)
    custom.variants.filled.pressed.containerElevation = system.elevation.level5
    custom.pressed.opacity = 0.4
    custom.disabled.opacity = 0.5
    custom.variants.filled.disabled.containerColor = .role(.surfaceDim)
    #expect(appearance(.filled, .hovered, tokens: custom).container == .role(.error))
    #expect(appearance(.filled, .focused, tokens: custom).icon == .role(.warning))
    #expect(appearance(.filled, .pressed, tokens: custom).elevation == system.elevation.level5)
    #expect(appearance(.filled, .pressed, tokens: custom).opacity == 0.4)
    #expect(appearance(.filled, .disabled, tokens: custom).opacity == 0.5)
    #expect(appearance(.filled, .disabled, tokens: custom).container == .role(.surfaceDim))
    // Nothing else moved: rest, and the same state of another variant.
    #expect(appearance(.filled, .enabled, tokens: custom) == appearance(.filled, .enabled))
    #expect(appearance(.tonal, .hovered, tokens: custom) == appearance(.tonal, .hovered))
    #expect(appearance(.filled, .hovered, tokens: custom).elevation == appearance(.filled, .hovered).elevation)
  }

  /// The generated lookups: one exhaustive switch per group, emitted from the IR.
  @Test("the generated state lookups read each state's own group")
  func generatedLookups() {
    for variant in TanreiFabVariant.core {
      let v = tokens.variants[variant]
      #expect(v[state: .enabled] == v.enabled && v[state: .hovered] == v.hovered && v[state: .focused] == v.focused)
      #expect(v[state: .pressed] == v.pressed && v[state: .disabled] == v.disabled)
    }
    #expect(tokens[state: .enabled] == nil)
    #expect(tokens[state: .hovered] == tokens.hovered && tokens[state: .pressed] == tokens.pressed && tokens[state: .disabled] == tokens.disabled)
  }
}

// MARK: - Open axes (FAB-7)

@MainActor
@Suite("TanreiFloatingActionButton open size and variant")
struct TanreiFabOpenAxisTests {
  let tokens = TanreiSystem.tanrei.fab
  let unknownSize = TanreiFabSize(rawValue: "colossal")
  let unknownVariant = TanreiFabVariant(rawValue: "sparkly")

  @Test("the axes are the spec's: filled/tonal/surface, small/medium/large; defaults filled and medium")
  func axes() {
    #expect(TanreiFabVariant.core == [.filled, .tonal, .surface] && TanreiFabVariant.fallback == .filled)
    #expect(TanreiFabSize.core == [.small, .medium, .large] && TanreiFabSize.fallback == .medium)
    #expect(tokens.sizes.extra.isEmpty && tokens.variants.extra.isEmpty)
  }

  /// FAB-7 — a size or variant the design system does not have draws the default value's tokens in every state, and
  /// the unknown value is reported (debug builds only).
  @Test("FAB-7 an unknown size and an unknown variant bind the default value's tokens", arguments: TanreiInteraction.allCases)
  func unknownValuesBindTheDefault(state: TanreiInteraction) {
    let (appearance, reports) = Reports.collecting {
      TanreiFabAppearance(tokens: tokens, variant: unknownVariant, size: unknownSize, state: state)
    }
    #expect(appearance == TanreiFabAppearance(tokens: tokens, variant: .filled, size: .medium, state: state))
    #expect(reports.mention("fab size \"colossal\"") && reports.mention("fab variant \"sparkly\""))
  }

  @Test("FAB-7 known values are not reported")
  func knownValuesAreSilent() {
    let (_, reports) = Reports.collecting {
      for variant in TanreiFabVariant.core {
        for size in TanreiFabSize.core { _ = TanreiFabAppearance(tokens: tokens, variant: variant, size: size, state: .enabled) }
      }
    }
    #expect(reports.messages.isEmpty)
  }

  /// FAB-7 — rendered: pixel-identical to the default, and disabled too (`renderExact`, bit-stable).
  @Test("FAB-7 an unknown size and variant render exactly like the default")
  func unknownValuesRenderTheDefault() throws {
    func button(_ variant: TanreiFabVariant, _ size: TanreiFabSize, disabled: Bool = false) -> some View {
      TanreiFloatingActionButton("Create", variant: variant, size: size, action: {}) { Image(systemName: "plus") }.disabled(disabled)
    }
    for disabled in [false, true] {
      let expected = try Snapshot.renderExact(button(.filled, .medium, disabled: disabled))
      let (actual, reports) = try Reports.collecting { try Snapshot.renderExact(button(unknownVariant, unknownSize, disabled: disabled)) }
      #expect(actual.width == expected.width && actual.height == expected.height)
      #expect(actual.mismatch(against: expected, channelTolerance: 0) == 0)
      #expect(reports.mention("colossal") && reports.mention("sparkly"))
    }
  }

  /// FAB-7 — the fallback is the DEFAULT value of the axis in the current system; a value a system adds is read from
  /// `extra`, not the fallback.
  @Test("FAB-7 the fallback follows the system's default value; an added value is used")
  func fallbackAndAddedValues() {
    var custom = tokens
    custom.sizes.medium.containerSize = 99
    custom.variants.filled.enabled.iconColor = .role(.success)
    let (fallback, _) = Reports.collecting { TanreiFabAppearance(tokens: custom, variant: unknownVariant, size: unknownSize, state: .enabled) }
    #expect(fallback.containerSize == 99 && fallback.icon == .role(.success))

    var huge = tokens.sizes.large
    huge.containerSize = 96
    custom.sizes.extra[unknownSize] = huge
    var sparkly = tokens.variants.tonal
    sparkly.pressed.containerColor = .role(.warning)
    custom.variants.extra[unknownVariant] = sparkly
    let (added, reports) = Reports.collecting { TanreiFabAppearance(tokens: custom, variant: unknownVariant, size: unknownSize, state: .pressed) }
    #expect(added.containerSize == 96 && added.container == .role(.warning))
    #expect(reports.messages.isEmpty)
  }
}

// MARK: - Icon (FAB-11)

@MainActor
@Suite("TanreiFloatingActionButton icon")
struct TanreiFabIconTests {
  let system = TanreiSystem.tanrei

  /// Records what the icon slot is handed, while it is drawn (on the main actor).
  @MainActor
  final class Probe {
    var context: TanreiIconContext?
  }

  struct ProbeView: View {
    let probe: Probe
    @Environment(\.tanreiIconContext) private var context
    var body: some View {
      probe.context = context
      return Color.clear
    }
  }

  /// FAB-11 — the slot is handed the icon box of the size and an unselected icon (a FAB has no selection).
  @Test("FAB-11 the icon slot is handed the size's icon size, unselected")
  func slotContext() throws {
    let tokens = system.fab
    for size in TanreiFabSize.core {
      let probe = Probe()
      _ = try Snapshot.render(TanreiFloatingActionButton("Create", size: size, action: {}) { ProbeView(probe: probe) })
      #expect(probe.context == TanreiIconContext(size: tokens.sizes[size].iconSize, selected: false), "\(size)")
    }
  }

  /// FAB-11 — the icon font of an unselected icon: its family and fill, sys.icon.weight, and `opsz` = the box clamped
  /// to sys.icon.optical-size.min…max.
  @Test("FAB-11 family, fill, weight and optical size clamped to the tokens")
  func drawing() {
    let icon = system.icon
    for size in TanreiFabSize.core {
      let box = system.fab.sizes[size].iconSize
      let drawing = icon.drawing(size: box, selected: false)
      #expect(drawing.family == icon.families.unselected && drawing.axes.fill == icon.fillUnselected && drawing.axes.weight == Double(icon.weight))
      #expect(drawing.axes.opticalSize == Double(min(max(box, icon.opticalSizeMin), icon.opticalSizeMax)))
    }
  }

  /// FAB-11 — the icon is centred in the square and drawn in the icon color across its box.
  @Test("FAB-11 the icon box is centred in the square, in the icon color", arguments: TanreiFabSize.core)
  func iconCentred(size: TanreiFabSize) throws {
    let tokens = system.fab
    let colors = system.colors.light
    let bitmap = try Snapshot.render(boxChrome(size: size))
    let middle = center(tokens, size)
    let half = tokens.sizes[size].iconSize / 2
    #expect(pixel(bitmap, x: middle.x, y: middle.y).isClose(to: colors[.onPrimary].rgba8()))
    #expect(pixel(bitmap, x: middle.x - half + 0.5, y: middle.y).isClose(to: colors[.onPrimary].rgba8()))
    #expect(pixel(bitmap, x: middle.x - half - 0.5, y: middle.y).isClose(to: colors[.primary].rgba8()))
    #expect(pixel(bitmap, x: middle.x + half - 0.5, y: middle.y).isClose(to: colors[.onPrimary].rgba8()))
    #expect(pixel(bitmap, x: middle.x + half + 0.5, y: middle.y).isClose(to: colors[.primary].rgba8()))
    #expect(pixel(bitmap, x: middle.x, y: middle.y - half - 0.5).isClose(to: colors[.primary].rgba8()))
    #expect(pixel(bitmap, x: middle.x, y: middle.y + half + 0.5).isClose(to: colors[.primary].rgba8()))
  }

  /// Without the icon font (or under the platform-font policy of the baselines) a glyph draws nothing — never the
  /// glyph's name in a text font — and the button is still its square.
  @Test("FAB-11 a glyph without the icon font draws nothing")
  func glyphWithoutFont() throws {
    let empty = try Snapshot.renderExact(TanreiFloatingActionButton("Create", action: {}) { Color.clear })
    let glyph = try Snapshot.renderExact(TanreiFloatingActionButton("Create", icon: "add", action: {}))
    #expect(glyph.mismatch(against: empty, channelTolerance: 0) == 0)
  }

  /// With the icon font registered (this machine may have Material Symbols; CI does not), the glyph is drawn inside
  /// the icon box, nowhere else on the square.
  @Test("FAB-11 with the icon font installed, the glyph is drawn inside the icon box")
  func glyphWithFont() throws {
    guard system.icon.installedFamily(selected: false) != nil else { return }
    let tokens = system.fab
    let colors = system.colors.light
    let drawn = try Snapshot.render(TanreiFloatingActionButton("Create", icon: "add", size: .large, action: {}), theme: theme(system, policy: .tokens))
    let side = tokens.sizes.large.containerSize
    let box = tokens.sizes.large.iconSize
    let margin = (side - box) / 2
    var inside = 0
    var outside = 0
    for y in 0..<drawn.height {
      for x in 0..<drawn.width where drawn[x, y].isClose(to: colors[.onPrimary].rgba8(), tolerance: 8) {
        let px = CGFloat(x) / Snapshot.scale - Snapshot.inset
        let py = CGFloat(y) / Snapshot.scale - Snapshot.inset
        // Only the square, off its rounded corners and edge: around it is the surface, which in this system is the
        // icon's own color.
        let radius = tokens.sizes.large.containerShape
        guard px >= 1 && px < side - 1 && py >= 1 && py < side - 1 else { continue }
        guard (px >= radius && px <= side - radius) || (py >= radius && py <= side - radius) else { continue }
        if px >= margin - 1 && px <= side - margin + 1 && py >= margin - 1 && py <= side - margin + 1 { inside += 1 } else { outside += 1 }
      }
    }
    #expect(inside > 0 && outside == 0)
  }

  /// "Text size does not change the square: an icon is not text" (spec, accessibility notes).
  @Test("FAB-11 the square and the icon box do not grow with Dynamic Type")
  func noDynamicType() throws {
    func render(_ size: DynamicTypeSize) throws -> Bitmap {
      try Snapshot.renderExact(TanreiFloatingActionButton("Create", action: {}) { Rectangle() }.environment(\.dynamicTypeSize, size))
    }
    let regular = try render(.large)
    let huge = try render(.accessibility5)
    #expect(huge.width == regular.width && huge.height == regular.height)
    #expect(huge.mismatch(against: regular, channelTolerance: 0) == 0)
  }
}

// MARK: - Rendered states (FAB-3, FAB-4, FAB-6, FAB-10, FAB-12, FAB-13)

@MainActor
@Suite("TanreiFloatingActionButton rendered states")
struct TanreiFabRenderedStateTests {
  let system = TanreiSystem.tanrei
  let colors = TanreiSystem.tanrei.colors.light
  let inset = Snapshot.inset
  var tokens: TanreiFabTokens { system.fab }

  /// FAB-13 — the FAB lays out at its own size (the square), at every size: the icon never grows it, nor does the hit
  /// area (FAB-5) or the shadow (FAB-12).
  @Test("FAB-13 FAB-5 the layout size is the square of each size", arguments: TanreiFabSize.core)
  func square(size: TanreiFabSize) throws {
    let bitmap = try Snapshot.render(TanreiFloatingActionButton("Create", size: size, action: {}) { Rectangle().frame(width: 200, height: 200) })
    let side = (tokens.sizes[size].containerSize + 2 * inset) * Snapshot.scale
    #expect(CGFloat(bitmap.width) == side && CGFloat(bitmap.height) == side)
  }

  /// FAB-13 — placed by the caller: in an overlay aligned bottom-trailing it sits in that corner, and the content under
  /// it is neither moved nor covered by a scrim.
  @Test("FAB-13 the caller places it; it draws no scrim and moves no content")
  func placedByTheCaller() throws {
    let side = tokens.sizes.medium.containerSize
    let content = CGSize(width: side * 4, height: side * 3)
    let screen = Rectangle().fill(colors[.surfaceContainer]).frame(width: content.width, height: content.height)
    let alone = try Snapshot.render(screen)
    let withFab = try Snapshot.render(screen.overlay(alignment: .bottomTrailing) { TanreiFloatingActionButton("Create", action: {}) { Color.clear } })
    #expect(withFab.width == alone.width && withFab.height == alone.height)
    // The FAB's container is in the bottom-trailing corner…
    let corner = CGPoint(x: inset + content.width - side / 2, y: inset + content.height - side / 2)
    #expect(pixel(withFab, x: corner.x, y: corner.y).isClose(to: colors[.primary].rgba8()))
    // …and the rest of the screen is unchanged (no scrim): the top-leading corner matches the screen alone.
    #expect(pixel(withFab, x: inset + 4, y: inset + 4).isClose(to: pixel(alone, x: inset + 4, y: inset + 4), tolerance: 0))
    #expect(pixel(withFab, x: inset + content.width / 2, y: inset + 4).isClose(to: colors[.surfaceContainer].rgba8()))
  }

  /// FAB-3 — pressed and focused containers are the state's container paint.
  @Test("FAB-3 pressed and focused render the state's container color")
  func stateContainer() throws {
    let point = containerPoint(tokens)
    let rest = try Snapshot.render(chrome())
    #expect(pixel(rest, x: point.x, y: point.y).isClose(to: colors[.primary].rgba8()))
    let pressed = try Snapshot.render(chrome(isPressed: true))
    #expect(pixel(pressed, x: point.x, y: point.y).isClose(to: colors[tokens.variants.filled.pressed.containerColor].rgba8()))
    let focused = try Snapshot.render(chrome(isFocused: true))
    #expect(pixel(focused, x: point.x, y: point.y).isClose(to: colors[tokens.variants.filled.focused.containerColor].rgba8()))
    // Precedence: pressed over focused.
    var custom = system
    custom.fab.variants.filled.pressed.containerColor = .role(.error)
    custom.fab.variants.filled.focused.containerColor = .role(.success)
    let both = try Snapshot.render(chrome(isPressed: true, isFocused: true), theme: theme(custom))
    #expect(pixel(both, x: point.x, y: point.y).isClose(to: colors[.error].rgba8()))
    let focusedOnly = try Snapshot.render(chrome(isFocused: true), theme: theme(custom))
    #expect(pixel(focusedOnly, x: point.x, y: point.y).isClose(to: colors[.success].rgba8()))
    // Opacity: the whole control is dimmed by the state's opacity token.
    custom.fab.pressed.opacity = 0.4
    let dimmed = try Snapshot.render(chrome(isPressed: true), theme: theme(custom))
    #expect(pixel(dimmed, x: point.x, y: point.y).isClose(to: colors[.error].opacity(0.4).rgba8(over: colors[.surface])))
  }

  /// FAB-12 — the elevation of the state is cast outside the container and not clipped: below the square there is a
  /// shadow at rest (level3), none when disabled (level0), and none when a modified system flattens rest.
  @Test("FAB-12 FAB-6 the state's elevation is cast outside the container")
  func elevation() throws {
    let side = tokens.sizes.medium.containerSize
    let below = CGPoint(x: inset + side / 2, y: inset + side + 3)
    let surface = colors[.surface].rgba8()
    let rest = try Snapshot.render(chrome())
    #expect(!pixel(rest, x: below.x, y: below.y).isClose(to: surface, tolerance: 0))
    let disabled = try Snapshot.render(chrome().disabled(true))
    #expect(pixel(disabled, x: below.x, y: below.y).isClose(to: surface, tolerance: 0))
    var flat = system
    flat.fab.variants.filled.enabled.containerElevation = system.elevation.level0
    #expect(pixel(try Snapshot.render(chrome(), theme: theme(flat)), x: below.x, y: below.y).isClose(to: surface, tolerance: 0))
    // A deeper level casts a darker shadow at the same point (the value drives the drawing).
    var deep = system
    deep.fab.variants.filled.enabled.containerElevation = system.elevation.level5
    let deeper = pixel(try Snapshot.render(chrome(), theme: theme(deep)), x: below.x, y: below.y + 4)
    let shallow = pixel(rest, x: below.x, y: below.y + 4)
    #expect(Int(deeper.r) < Int(shallow.r))
  }

  /// FAB-12 — the change of colors and elevation between states uses the state motion, and none under Reduce Motion.
  @Test("FAB-12 state changes animate over the state motion; at once under Reduce Motion")
  func stateMotion() {
    var tokens = self.tokens
    let easing = tokens.motionStateEasing
    #expect(tokens.stateMotion(reduceMotion: false) == Animation.timingCurve(easing.x1, easing.y1, easing.x2, easing.y2, duration: tokens.motionStateDuration / 1000))
    #expect(tokens.stateMotion(reduceMotion: true) == nil)
    tokens.motionStateDuration = 700
    tokens.motionStateEasing = TanreiCubicBezier(0, 0, 1, 1)
    #expect(tokens.stateMotion(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.7))
  }

  /// FAB-4 — offset, then the outer stroke in the focusRing role, concentric with the square; absent without focus and
  /// when disabled; outside the layout.
  @Test("FAB-4 the focus indicator is an offset then a ring in the focusRing color")
  func focusRing() throws {
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.sizes.medium.containerShape, measure: system.measure)
    let midY = center(tokens).y
    let ringX = inset - metrics.outerCenterlineOutset
    let gapX = inset - metrics.offset / 2
    let focused = try Snapshot.render(chrome(isFocused: true))
    #expect(pixel(focused, x: ringX, y: midY).isClose(to: colors[.focusRing].rgba8()))
    #expect(!pixel(focused, x: gapX, y: midY).isClose(to: colors[.focusRing].rgba8()))
    let rest = try Snapshot.render(chrome())
    #expect(!pixel(rest, x: ringX, y: midY).isClose(to: colors[.focusRing].rgba8()))
    #expect(focused.width == rest.width && focused.height == rest.height)
    let focusedDisabled = try Snapshot.render(chrome(isFocused: true).disabled(true))
    #expect(focusedDisabled.mismatch(against: try Snapshot.render(chrome().disabled(true)), channelTolerance: Snapshot.channelTolerance) == 0)
    // Not dimmed by the state's opacity.
    var dim = system
    dim.fab.focused.opacity = 0.3
    let dimmed = try Snapshot.render(chrome(isFocused: true), theme: theme(dim))
    #expect(pixel(dimmed, x: ringX, y: midY).isClose(to: colors[.focusRing].rgba8()))
  }

  /// FAB-6 — rendered: the disabled tokens of the variant.
  @Test("FAB-6 disabled renders from the disabled tokens")
  func disabledRender() throws {
    let point = containerPoint(tokens)
    let disabled = try Snapshot.render(chrome().disabled(true))
    #expect(pixel(disabled, x: point.x, y: point.y).isClose(to: colors[tokens.variants.filled.disabled.containerColor].rgba8(over: colors[.surface])))
    var custom = system
    custom.fab.variants.filled.disabled.containerColor = .role(.primary)
    custom.fab.disabled.opacity = 0.5
    let dimmed = try Snapshot.render(chrome().disabled(true), theme: theme(custom))
    #expect(pixel(dimmed, x: point.x, y: point.y).isClose(to: colors[.primary].opacity(0.5).rgba8(over: colors[.surface])))
  }

  /// FAB-10 — corners follow `sys.shape.corner-smoothing` (every amount above 0 is the OS's continuous curve) and focus
  /// follows `sys.behavior.focus-style`; acme is glow.
  @Test("FAB-10 corner smoothing and focus style reach the FAB")
  func cornersAndFocusStyle() throws {
    func render(_ amount: Double, focused: Bool = false, style: TanreiFocusStyle = .ring) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      custom.behavior.focusStyle = style
      return try Snapshot.renderExact(chrome(isFocused: focused), theme: theme(custom))
    }
    let continuous = try render(0.6)
    #expect(try render(0).mismatch(against: continuous, channelTolerance: 0) > 0)
    #expect(try render(0.3).mismatch(against: continuous, channelTolerance: 0) == 0)
    #expect(try render(1).mismatch(against: continuous, channelTolerance: 0) == 0)
    #expect(try render(0.6, focused: true, style: .glow).mismatch(against: try render(0.6, focused: true, style: .ring), channelTolerance: 0) > 0)
    #expect(TanreiSystem.cupertino.shape.roundedCornerStyle == .continuous)
    #expect(TanreiSystem.acme.behavior.focusStyle == .glow)
  }
}

// MARK: - FAB-8, FAB-9

@MainActor
@Suite("TanreiFloatingActionButton press", .serialized)
struct TanreiFabPressTests {
  /// A system whose pressed tokens differ from rest in every part, so each choice is told apart.
  private func distinct(_ feedback: TanreiPressedFeedback) -> TanreiSystem {
    var system = TanreiSystem.tanrei
    system.behavior.pressedFeedback = feedback
    system.fab.variants.filled.pressed.containerColor = .role(.error)
    system.fab.variants.filled.pressed.iconColor = .role(.warning)
    system.fab.variants.filled.pressed.containerElevation = system.elevation.level5
    system.fab.variants.filled.focused.containerColor = .role(.success)
    system.fab.pressed.opacity = 0.5
    return system
  }

  /// FAB-9 — which tokens a press reads under each choice.
  @Test("FAB-9 each choice binds the pressed tokens its own way", arguments: TanreiPressedFeedback.allCases)
  func bindings(feedback: TanreiPressedFeedback) {
    let tokens = distinct(feedback).fab
    let filled = tokens.variants.filled
    for beneath in [TanreiInteraction.enabled, .hovered, .focused] {
      let appearance = TanreiFabAppearance(tokens: tokens, variant: .filled, size: .medium, state: .pressed, feedback: feedback, beneath: beneath)
      let under = filled[state: beneath]
      switch feedback {
      case .overlay:
        #expect(appearance.container == filled.pressed.containerColor && appearance.ripple == nil)
        #expect(appearance.icon == filled.pressed.iconColor && appearance.elevation == filled.pressed.containerElevation)
        #expect(appearance.opacity == tokens.pressed.opacity)
      case .ripple:
        #expect(appearance.container == under.containerColor && appearance.ripple == filled.pressed.containerColor)
        #expect(appearance.icon == filled.pressed.iconColor && appearance.elevation == filled.pressed.containerElevation)
        #expect(appearance.opacity == tokens.pressed.opacity)
      case .dim:
        #expect(appearance.container == under.containerColor && appearance.ripple == nil)
        #expect(appearance.icon == filled.pressed.iconColor && appearance.elevation == filled.pressed.containerElevation)
        #expect(appearance.opacity == tokens.pressed.opacity)
      case .none:
        #expect(appearance == TanreiFabAppearance(tokens: tokens, variant: .filled, size: .medium, state: beneath))
      }
    }
    for state in TanreiInteraction.allCases where state != .pressed {
      #expect(
        TanreiFabAppearance(tokens: tokens, variant: .filled, size: .medium, state: state, feedback: feedback)
          == TanreiFabAppearance(tokens: tokens, variant: .filled, size: .medium, state: state))
    }
  }

  /// FAB-9 — rendered under a system that sets each value.
  @Test("FAB-9 each choice renders as it says", arguments: TanreiPressedFeedback.allCases)
  func rendered(feedback: TanreiPressedFeedback) throws {
    let system = distinct(feedback)
    let colors = system.colors.light
    let point = containerPoint(system.fab)
    let bitmap = try Snapshot.render(chrome(isPressed: true), theme: theme(system))
    let actual = pixel(bitmap, x: point.x, y: point.y)
    switch feedback {
    case .overlay, .ripple:
      // A render that never saw the press begin shows the ripple grown: the same pixels as overlay.
      #expect(actual.isClose(to: colors[.error].opacity(0.5).rgba8(over: colors[.surface])))
    case .dim:
      #expect(actual.isClose(to: colors[.primary].opacity(0.5).rgba8(over: colors[.surface])))
    case .none:
      #expect(actual.isClose(to: colors[.primary].rgba8()))
    }
    if feedback == .dim || feedback == .none {
      let focused = try Snapshot.render(chrome(isPressed: true, isFocused: true), theme: theme(system))
      let expected = feedback == .dim ? colors[.success].opacity(0.5).rgba8(over: colors[.surface]) : colors[.success].rgba8()
      #expect(pixel(focused, x: point.x, y: point.y).isClose(to: expected))
    }
  }

  /// FAB-9 — the shipped systems, by their own values: m3-like ripples, cupertino dims, the default overlays.
  @Test("FAB-9 m3-like ripples, cupertino dims, the default overlays")
  func shipped() {
    func pressed(_ system: TanreiSystem) -> TanreiFabAppearance {
      TanreiFabAppearance(tokens: system.fab, variant: .filled, size: .medium, state: .pressed, feedback: system.behavior.pressedFeedback)
    }
    #expect(pressed(.m3Like).ripple == TanreiSystem.m3Like.fab.variants.filled.pressed.containerColor)
    #expect(pressed(.m3Like).container == TanreiSystem.m3Like.fab.variants.filled.enabled.containerColor)
    let cupertino = pressed(.cupertino)
    #expect(cupertino.ripple == nil && cupertino.opacity == TanreiSystem.cupertino.fab.pressed.opacity && cupertino.opacity < 1)
    #expect(pressed(.tanrei).ripple == nil && pressed(.tanrei).container == TanreiSystem.tanrei.fab.variants.filled.pressed.containerColor)
  }

  /// FAB-9 — the ripple grows over comp.fab.motion.feedback-duration with the state easing, and appears whole under
  /// Reduce Motion.
  @Test("FAB-9 the ripple grows over the FAB's own feedback duration; whole under Reduce Motion")
  func rippleTiming() {
    var tokens = TanreiSystem.m3Like.fab
    let easing = tokens.motionStateEasing
    #expect(tokens.rippleGrowth(reduceMotion: false) == Animation.timingCurve(easing.x1, easing.y1, easing.x2, easing.y2, duration: tokens.motionFeedbackDuration / 1000))
    #expect(tokens.rippleGrowth(reduceMotion: true) == nil)
    tokens.motionFeedbackDuration = 900
    tokens.motionStateEasing = TanreiCubicBezier(0, 0, 1, 1)
    #expect(tokens.rippleGrowth(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.9))
  }

  #if os(macOS)
  private func holdSystem(holdMs: Double) -> TanreiSystem {
    var system = TanreiSystem.tanrei
    system.motion.duration.pressHold = holdMs
    system.fab.motionStateDuration = 0  // no fade: a color read is the state, not a frame of a transition
    system.fab.variants.filled.pressed.containerColor = .role(.error)
    return system
  }

  /// FAB-8 end to end with real mouse events: pressed at once on mouse-down, still pressed after a quick release, at
  /// rest again once press-hold has passed — and the action fired exactly once (FAB-1).
  @Test("FAB-8 FAB-1 a quick click shows the pressed state at once and keeps it for press-hold")
  func quickClickIsHeld() async throws {
    let system = holdSystem(holdMs: 1500)
    let colors = system.colors.light
    var count = 0
    let hosted = HostedView(
      TanreiFloatingActionButton("Create", action: { count += 1 }) { Color.clear }
        .padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let point = containerPoint(system.fab)
    let middle = CGPoint(x: hosted.size.width / 2, y: hosted.size.height / 2)
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.primary].rgba8()))
    hosted.mouse(.leftMouseDown, at: middle)
    hosted.settle()
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    hosted.mouse(.leftMouseUp, at: middle)
    hosted.settle()
    #expect(count == 1)
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    // The end of the hold is scheduled on the main actor: wait for it (bounded) rather than read once after a fixed sleep,
    // which a loaded machine delays.
    let released = await hosted.wait(atMost: 5) { hosted.color(at: point)?.isClose(to: colors[.primary].rgba8()) == true }
    #expect(released && count == 1)
  }

  /// FAB-1 under `ripple`: recording the point of contact must not take the click away from the button.
  @Test("FAB-1 FAB-9 a click still emits exactly once under ripple")
  func clickUnderRipple() {
    var count = 0
    let hosted = HostedView(
      TanreiFloatingActionButton("Create", icon: "add", action: { count += 1 }).padding(Snapshot.inset).tanreiTheme(theme(.m3Like)))
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: hosted.size.height / 2))
    #expect(count == 1)
  }
  #endif
}

// MARK: - Presets

@MainActor
@Suite("TanreiFloatingActionButton under the shipped presets")
struct TanreiFabPresetTests {
  /// FAB-5 FAB-11 — every size of every shipped system renders its own square, whatever its value.
  @Test("FAB-11 layout follows each system's tokens at every size", arguments: ShippedSystem.allCases)
  func sizes(shipped: ShippedSystem) throws {
    let system = shipped.system
    for size in system.fab.sizes.keys {
      let bitmap = try Snapshot.render(TanreiFloatingActionButton("Create", size: size, action: {}) { Image(systemName: "plus") }, theme: theme(system))
      let side = (system.fab.sizes[size].containerSize + 2 * Snapshot.inset) * Snapshot.scale
      #expect(CGFloat(bitmap.width) == side && CGFloat(bitmap.height) == side, "\(shipped.rawValue) \(size.rawValue)")
    }
  }

  /// The presets' values, read from the instances: m3-like 40 / 56 / 96 with icons 24 / 24 / 36 and
  /// corners 12 / 16 / 28, tonal on primary-container; cupertino a circle at every size and no hover lift.
  @Test("FAB-3 FAB-11 FAB-12 the presets' own values reach the FAB")
  func presetValues() throws {
    let m3 = TanreiSystem.m3Like.fab
    #expect([m3.sizes.small, m3.sizes.medium, m3.sizes.large].map(\.containerSize) == [40, 56, 96])
    #expect([m3.sizes.small, m3.sizes.medium, m3.sizes.large].map(\.iconSize) == [24, 24, 36])
    #expect([m3.sizes.small, m3.sizes.medium, m3.sizes.large].map(\.containerShape) == [12, 16, 28])
    #expect(TanreiFabAppearance(tokens: m3, variant: .tonal, size: .medium, state: .enabled).container == .role(.primaryContainer))
    #expect(TanreiFabAppearance(tokens: m3, variant: .surface, size: .medium, state: .enabled).container == .role(.surfaceContainerHigh))
    #expect(TanreiFabAppearance(tokens: m3, variant: .filled, size: .medium, state: .hovered).elevation == TanreiSystem.m3Like.elevation.level4)

    let cupertino = TanreiSystem.cupertino.fab
    for size in TanreiFabSize.core {
      let rest = TanreiFabAppearance(tokens: cupertino, variant: .filled, size: size, state: .enabled)
      #expect(rest.cornerRadius >= rest.containerSize / 2, "\(size): a circle")
      // No hover lift, and no state layer: hover and focus draw exactly what rest draws.
      #expect(TanreiFabAppearance(tokens: cupertino, variant: .filled, size: size, state: .hovered) == rest)
      #expect(TanreiFabAppearance(tokens: cupertino, variant: .filled, size: size, state: .focused) == rest)
    }

    // Rendered: the cupertino FAB is a circle of the system's primary.
    let colors = TanreiSystem.cupertino.colors.light
    let bitmap = try Snapshot.render(chrome(), theme: theme(.cupertino))
    let side = cupertino.sizes.medium.containerSize
    #expect(pixel(bitmap, x: Snapshot.inset + side / 2, y: Snapshot.inset + 1).isClose(to: colors[.primary].rgba8()))
    #expect(!pixel(bitmap, x: Snapshot.inset + side * 0.1, y: Snapshot.inset + side * 0.1).isClose(to: colors[.primary].rgba8()))
  }
}

// MARK: - Snapshots (one per spec fixture)

@MainActor
@Suite("TanreiFloatingActionButton snapshots")
struct TanreiFabSnapshotTests {
  struct Fixture: Sendable, CustomTestStringConvertible {
    let id: String
    var variant: TanreiFabVariant = .filled
    var size: TanreiFabSize = .medium
    var disabled = false
    var testDescription: String { id }
  }

  /// Mirrors `fixtures` in specs/fab.spec.json (label "Create", content "add").
  nonisolated static let fixtures: [Fixture] = [
    Fixture(id: "filled-medium", variant: .filled),
    Fixture(id: "tonal-medium", variant: .tonal),
    Fixture(id: "surface-medium", variant: .surface),
    Fixture(id: "filled-small", variant: .filled, size: .small),
    Fixture(id: "filled-large", variant: .filled, size: .large),
    Fixture(id: "filled-disabled", variant: .filled, disabled: true),
  ]

  /// Room around the FAB for its shadow (FAB-12 casts it outside the container): how far the farthest layer of its
  /// highest level (hovered) visibly reaches — offset, spread and three standard deviations of blur — beyond the
  /// snapshot's own inset. A test value, not a design value.
  static func shadowRoom(_ system: TanreiSystem) -> CGFloat {
    let layers = system.fab.variants.filled.hovered.containerElevation
    let reach = layers.map { max(abs($0.x), abs($0.y)) + max(0, $0.spread) + TanreiShadowBlur.extent(cssBlur: $0.blur) }.max() ?? 0
    return max(0, reach - Snapshot.inset).rounded(.up)
  }

  /// The fixture as a product writes it; "add" is drawn as the SF Symbol `plus` (see the file header).
  static func view(_ fixture: Fixture, system: TanreiSystem = .tanrei) -> some View {
    TanreiFloatingActionButton("Create", variant: fixture.variant, size: fixture.size, action: {}) { Image(systemName: "plus") }
      .disabled(fixture.disabled)
      .padding(shadowRoom(system))
  }

  @Test("fixture matches its baseline", arguments: fixtures)
  func fixture(_ fixture: Fixture) throws {
    try Snapshot.assert(Self.view(fixture), named: fixture.id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    let spec = try SpecFixture.load(spec: "fab")
    #expect(spec.map(\.id) == Self.fixtures.map(\.id))
    for (theirs, ours) in zip(spec, Self.fixtures) {
      #expect(theirs.string("variant") == ours.variant.rawValue, "\(ours.id)")
      #expect((theirs.string("size") ?? "medium") == ours.size.rawValue, "\(ours.id)")
      #expect((theirs.bool("disabled") ?? false) == ours.disabled, "\(ours.id)")
      #expect(theirs.string("label") == "Create" && theirs.content == "add", "\(ours.id)")
    }
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiFabTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiFloatingActionButton preset snapshots")
struct TanreiFabPresetSnapshotTests {
  /// The large filled FAB: it shows the preset's side, corner, icon size and shadow (m3-like's 96 with a 36 icon).
  nonisolated static let fixtureId = "filled-large"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .m3ExpressiveLike, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiFabSnapshotTests.fixtures.contains { $0.id == Self.fixtureId })
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try #require(TanreiFabSnapshotTests.fixtures.first { $0.id == Self.fixtureId })
    try Snapshot.assert(
      TanreiFabSnapshotTests.view(fixture, system: preset.system), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
