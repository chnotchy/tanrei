import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/button.spec.json. Each behavior id (BTN-n) is named next to the test that
// covers it; the parity checker requires every id to appear in this file.

private let suiteName = "TanreiButtonTests"

@MainActor
private final class Counter {
  var count = 0
}

// MARK: - Activation

@MainActor
@Suite("TanreiButton activation", .serialized)
struct TanreiButtonActivationTests {
  /// BTN-1 — one activation emits `action` exactly once.
  @Test("BTN-1 activation emits action exactly once")
  func activationEmitsOnce() {
    let counter = Counter()
    let button = TanreiButton("Deploy", variant: .filled, size: .medium, action: { counter.count += 1 })
    button.activate(isEnabled: true)
    #expect(counter.count == 1)
    button.activate(isEnabled: true)
    #expect(counter.count == 2)
  }

  /// BTN-2 — a disabled button never emits `action`.
  @Test("BTN-2 disabled button does not emit action")
  func disabledDoesNotEmit() {
    let counter = Counter()
    let button = TanreiButton("Deploy", action: { counter.count += 1 })
    button.activate(isEnabled: false)
    #expect(counter.count == 0)
  }

  #if os(macOS)
  /// BTN-1 by pointer, BTN-2 by pointer: a real click in the middle of the button.
  @Test("BTN-1 BTN-2 pointer click emits once when enabled, never when disabled", arguments: [true, false])
  func pointerClick(isEnabled: Bool) {
    let counter = Counter()
    let hosted = HostedView(
      TanreiButton("Deploy", action: { counter.count += 1 })
        .disabled(!isEnabled)
        .padding(Snapshot.inset)
        .tanreiTheme(Snapshot.theme)
    )
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: hosted.size.height / 2))
    #expect(counter.count == (isEnabled ? 1 : 0))
  }

  /// BTN-5 end to end: a click outside the visual container but inside the minimum target
  /// still activates a small button.
  @Test("BTN-5 click in the extended hit area activates the button")
  func extendedHitAreaClick() {
    let counter = Counter()
    let hosted = HostedView(
      TanreiButton("Deploy", size: .small, action: { counter.count += 1 })
        .padding(Snapshot.inset)
        .tanreiTheme(Snapshot.theme)
    )
    let system = Snapshot.theme.system
    let outset = (TanreiHitTarget.minimum(in: system.measure) - system.button.sizes.small.containerHeight) / 2
    #expect(outset > 0)
    // Half-way into the extension above the container (the padding leaves room for it).
    let y = Snapshot.inset - outset / 2
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: y))
    #expect(counter.count == 1)
    // Beyond the minimum target nothing happens.
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: Snapshot.inset - outset - 1))
    #expect(counter.count == 1)
  }

  /// BTN-5 — the target size is a value of the design system: with a smaller sys.target the
  /// same click lands outside the hit area.
  @Test("BTN-5 a modified system drives the hit area")
  func modifiedSystemHitArea() {
    var custom = Snapshot.theme
    let height = custom.system.button.sizes.small.containerHeight
    let defaultOutset = (TanreiHitTarget.minimum(in: custom.system.measure) - height) / 2
    custom.system.measure.targetPointer = height
    custom.system.measure.targetTouch = height
    let counter = Counter()
    let hosted = HostedView(
      TanreiButton("Deploy", size: .small, action: { counter.count += 1 })
        .padding(Snapshot.inset)
        .tanreiTheme(custom)
    )
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: Snapshot.inset - defaultOutset / 2))
    #expect(counter.count == 0)
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: hosted.size.height / 2))
    #expect(counter.count == 1)
  }
  #endif
}

// MARK: - Token bindings

// On the main actor: its tests read whole shipped systems, whose one-time initialization and copies need more
// stack than a cooperative thread has.
@MainActor
@Suite("TanreiButton token bindings")
struct TanreiButtonTokenBindingTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiButtonTokens { system.button }

  struct Expected {
    let container: TanreiColorRole?
    let label: TanreiColorRole
    let outline: TanreiColorRole?
  }

  static let expected: [TanreiButtonVariant: Expected] = [
    // Filled binds `primary` directly: there are no emphasis roles, and a recolored button is a variant.
    .filled: Expected(container: .primary, label: .onPrimary, outline: nil),
    .tonal: Expected(container: .secondaryContainer, label: .onSecondaryContainer, outline: nil),
    .elevated: Expected(container: .surfaceContainerLowest, label: .onSurface, outline: nil),
    .outlined: Expected(container: nil, label: .onSurface, outline: .outline),
    .text: Expected(container: nil, label: .onSurface, outline: nil),
  ]

  private func paint(_ role: TanreiColorRole?) -> TanreiPaint { role.map { .role($0) } ?? TanreiPaint.none }

  @Test("at rest each variant binds the expected color roles", arguments: TanreiButtonVariant.core)
  func roles(variant: TanreiButtonVariant) throws {
    let expected = try #require(Self.expected[variant])
    let appearance = TanreiButtonAppearance(tokens: tokens, variant: variant, size: .medium, state: .enabled)
    #expect(appearance.container == paint(expected.container))
    #expect(appearance.label == paint(expected.label))
    #expect(appearance.outline == paint(expected.outline))
    #expect(appearance.opacity == 1)
    #expect(appearance.cornerRadius == tokens.containerShape)
    #expect(appearance.elevation == (variant == .elevated ? system.elevation.level2 : system.elevation.level0))
  }

  @Test("paints resolve to the generated colors in light and dark", arguments: TanreiButtonVariant.core)
  func colorsInLightAndDark(variant: TanreiButtonVariant) throws {
    let expected = try #require(Self.expected[variant])
    let appearance = TanreiButtonAppearance(tokens: tokens, variant: variant, size: .medium, state: .enabled)
    let schemes: [(TanreiAppearance, TanreiColors)] = [(.light, system.colors.light), (.dark, system.colors.dark)]
    for (themeAppearance, scheme) in schemes {
      let colors = TanreiTheme(appearance: themeAppearance, contrast: .standard)
        .colors(systemScheme: .light, systemContrast: .standard)
      #expect(colors == scheme)
      #expect(appearance.label.resolve(in: colors) == scheme.value(expected.label))
      #expect(appearance.container.resolve(in: colors) == expected.container.map { scheme.value($0) } ?? .clear)
    }
    // The filled container really is different between the two themes.
    #expect(system.colors.light[.primary] != system.colors.dark[.primary])
  }

  @Test("each size binds its height and padding tokens; an icon selects the with-icon start padding")
  func sizes() {
    func appearance(_ size: TanreiButtonSize, hasIcon: Bool = false) -> TanreiButtonAppearance {
      TanreiButtonAppearance(tokens: tokens, variant: .filled, size: size, state: .enabled, hasIcon: hasIcon)
    }
    let (small, medium, large) = (appearance(.small), appearance(.medium), appearance(.large))
    #expect(small.height == tokens.sizes.small.containerHeight)
    #expect(medium.height == tokens.sizes.medium.containerHeight)
    #expect(large.height == tokens.sizes.large.containerHeight)
    #expect([small.height, medium.height, large.height] == [32, 36, 40])
    #expect(small.paddingStart == tokens.sizes.small.containerPaddingInlineStart)
    #expect(medium.paddingStart == tokens.sizes.medium.containerPaddingInlineStart)
    #expect(large.paddingStart == tokens.sizes.large.containerPaddingInlineStart)
    #expect(small.paddingEnd == tokens.sizes.small.containerPaddingInlineEnd)
    #expect(medium.paddingEnd == tokens.sizes.medium.containerPaddingInlineEnd)
    #expect(large.paddingEnd == tokens.sizes.large.containerPaddingInlineEnd)
    #expect(small.paddingBlock == tokens.sizes.small.containerPaddingBlock)
    #expect(medium.paddingBlock == tokens.sizes.medium.containerPaddingBlock)
    #expect(large.paddingBlock == tokens.sizes.large.containerPaddingBlock)

    // The four paddings are separate tokens: give each its own value and see which one is read.
    var custom = tokens
    custom.sizes.medium.containerPaddingInlineStart = 1
    custom.sizes.medium.containerPaddingInlineStartWithIcon = 2
    custom.sizes.medium.containerPaddingInlineEnd = 3
    custom.sizes.medium.containerPaddingBlock = 4
    let plain = TanreiButtonAppearance(tokens: custom, variant: .filled, size: .medium, state: .enabled)
    let withIcon = TanreiButtonAppearance(tokens: custom, variant: .filled, size: .medium, state: .enabled, hasIcon: true)
    #expect([plain.paddingStart, plain.paddingEnd, plain.paddingBlock] == [1, 3, 4])
    #expect([withIcon.paddingStart, withIcon.paddingEnd, withIcon.paddingBlock] == [2, 3, 4])

    // The gap and the outline width are per size: each size reads its own.
    for size in TanreiButtonSize.core {
      #expect(appearance(size).gap == tokens.sizes[size].containerGap)
      #expect(appearance(size).outlineWidth == tokens.sizes[size].outlineWidth)
    }
    custom = tokens
    custom.sizes.large.containerGap = 5
    custom.sizes.large.outlineWidth = 7
    let large5 = TanreiButtonAppearance(tokens: custom, variant: .outlined, size: .large, state: .enabled)
    let medium5 = TanreiButtonAppearance(tokens: custom, variant: .outlined, size: .medium, state: .enabled)
    #expect(large5.gap == 5 && large5.outlineWidth == 7)
    #expect(medium5.gap == tokens.sizes.medium.containerGap && medium5.outlineWidth == tokens.sizes.medium.outlineWidth)
  }

  /// BTN-3 — every state reads that state's tokens, for every variant.
  @Test("BTN-3 each state binds that state's tokens", arguments: TanreiButtonVariant.core)
  func stateBindings(variant: TanreiButtonVariant) throws {
    let expected = try #require(Self.expected[variant])
    let state = system.state
    let amounts: [(TanreiInteraction, Double)] = [
      (.hovered, state.hoverStateLayerOpacity), (.focused, state.focusStateLayerOpacity), (.pressed, state.pressedStateLayerOpacity),
    ]
    for (interaction, amount) in amounts {
      let appearance = TanreiButtonAppearance(tokens: tokens, variant: variant, size: .medium, state: interaction)
      // In the default system a state is a mix of the label color into the container. That is a
      // VALUE of this system (tokens/systems/tanrei.system.json), not something the component does.
      #expect(appearance.container == .mix(base: paint(expected.container), with: paint(expected.label), amount: amount))
      #expect(appearance.label == paint(expected.label))
      #expect(appearance.outline == paint(expected.outline))
      #expect(appearance.opacity == 1)
      #expect(appearance.cornerRadius == tokens.containerShape)
    }
  }

  /// BTN-6 — disabled draws from the disabled tokens of its variant.
  @Test("BTN-6 disabled bindings", arguments: TanreiButtonVariant.core)
  func disabled(variant: TanreiButtonVariant) throws {
    let expected = try #require(Self.expected[variant])
    let appearance = TanreiButtonAppearance(tokens: tokens, variant: variant, size: .medium, state: .disabled)
    let dimmed = TanreiPaint.alpha(of: .role(.onSurface), amount: system.state.disabledContainerOpacity)
    #expect(appearance.label == .alpha(of: .role(.onSurface), amount: system.state.disabledContentOpacity))
    #expect(appearance.container == (expected.container == nil ? TanreiPaint.none : dimmed))
    #expect(appearance.outline == (expected.outline == nil ? TanreiPaint.none : dimmed))
    #expect(appearance.elevation == system.elevation.level0)
    #expect(TanreiElevationPlan(layers: appearance.elevation).shadows.isEmpty)
    #expect(appearance.opacity == tokens.disabled.opacity)
    #expect(appearance.cornerRadius == tokens.disabled.containerShape)
  }

  /// BTN-3 BTN-6 — the values drive the result: change one token of one state in a copy of the
  /// system and exactly that state of that variant changes.
  @Test("BTN-3 BTN-6 a modified system changes what each state resolves to")
  func modifiedSystem() {
    var custom = tokens
    custom.variants.filled.hovered.containerColor = .role(.error)
    custom.variants.filled.hovered.labelColor = .literal(TanreiColorValue(red: 1, green: 1, blue: 0, opacity: 1))
    custom.variants.filled.focused.outlineColor = .role(.focusRing)
    custom.variants.filled.pressed.containerElevation = system.elevation.level3
    custom.pressed.containerShape = 2
    custom.pressed.opacity = 0.4
    custom.disabled.opacity = 0.5
    custom.variants.filled.disabled.containerColor = .role(.surfaceDim)
    custom.sizes.medium.containerPaddingInlineStart = tokens.sizes.medium.containerPaddingInlineStart * 2

    func appearance(_ state: TanreiInteraction, variant: TanreiButtonVariant = .filled) -> TanreiButtonAppearance {
      TanreiButtonAppearance(tokens: custom, variant: variant, size: .medium, state: state)
    }
    #expect(appearance(.hovered).container == .role(.error))
    #expect(appearance(.hovered).label == .literal(TanreiColorValue(red: 1, green: 1, blue: 0, opacity: 1)))
    #expect(appearance(.focused).outline == .role(.focusRing))
    #expect(appearance(.pressed).elevation == system.elevation.level3)
    #expect(appearance(.pressed).cornerRadius == 2)
    #expect(appearance(.pressed).opacity == 0.4)
    #expect(appearance(.disabled).opacity == 0.5)
    #expect(appearance(.disabled).container == .role(.surfaceDim))
    #expect(appearance(.enabled).paddingStart == tokens.sizes.medium.containerPaddingInlineStart * 2)
    #expect(appearance(.enabled).paddingEnd == tokens.sizes.medium.containerPaddingInlineEnd)

    // Nothing else moved: the other states of filled, and the same state of another variant.
    let original = TanreiButtonAppearance(tokens: tokens, variant: .filled, size: .medium, state: .enabled)
    #expect(appearance(.enabled).container == original.container)
    #expect(appearance(.enabled).cornerRadius == original.cornerRadius && appearance(.enabled).opacity == 1)
    #expect(appearance(.hovered).cornerRadius == tokens.hovered.containerShape)
    #expect(appearance(.hovered, variant: .tonal) == TanreiButtonAppearance(tokens: {
      var t = tokens
      t.sizes.medium.containerPaddingInlineStart = custom.sizes.medium.containerPaddingInlineStart
      return t
    }(), variant: .tonal, size: .medium, state: .hovered))
  }
}

// MARK: - Open axes

@MainActor
@Suite("TanreiButton open size and variant")
struct TanreiButtonOpenAxisTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiButtonTokens { system.button }
  let unknownSize = TanreiButtonSize(rawValue: "colossal")
  let unknownVariant = TanreiButtonVariant(rawValue: "sparkly")

  /// The axis shape carries exactly the values the flat fields had (`containerHeightMedium` …,
  /// one `labelTypescale`, one `iconSize`): moving to axes changed no value of the default system.
  @Test("the default system's axis values are the old flat values")
  func axisValuesAreTheFlatValues() {
    let sizes = tokens.sizes
    #expect([sizes.small, sizes.medium, sizes.large].map(\.containerHeight) == [32, 36, 40])
    #expect([sizes.small, sizes.medium, sizes.large].map(\.containerPaddingInlineStart) == [12, 14, 16])
    #expect([sizes.small, sizes.medium, sizes.large].map(\.containerPaddingInlineEnd) == [12, 14, 16])
    #expect([sizes.small, sizes.medium, sizes.large].map(\.containerPaddingInlineStartWithIcon) == [12, 14, 16])
    #expect([sizes.small, sizes.medium, sizes.large].map(\.containerPaddingBlock) == [6, 6, 6])
    // `label.typescale` and `icon.size` were single tokens: every size has that one value.
    for size in TanreiButtonSize.core {
      #expect(sizes[size].labelTypescale == system.typescale.label)
      #expect(sizes[size].iconSize == system.measure.iconSmall)
      #expect(sizes[size].iconSize == 16)
      // `container.gap` and `outline.width` were single tokens too before they joined the size axis.
      #expect(sizes[size].containerGap == system.space.space100 && sizes[size].containerGap == 8)
      #expect(sizes[size].outlineWidth == system.measure.borderHairline && sizes[size].outlineWidth == 1)
    }
    #expect(TanreiButtonSize.core == [.small, .medium, .large] && TanreiButtonSize.fallback == .medium)
    #expect(TanreiButtonVariant.core == [.filled, .tonal, .elevated, .outlined, .text] && TanreiButtonVariant.fallback == .filled)
    // A system that adds nothing has nothing beyond the core.
    #expect(sizes.extra.isEmpty && tokens.variants.extra.isEmpty)
    #expect(sizes.keys == TanreiButtonSize.core && tokens.variants.keys == TanreiButtonVariant.core)
  }

  @Test("the keyed lookup and the named fields are the same values")
  func lookupMatchesFields() {
    #expect(tokens.sizes[.small] == tokens.sizes.small && tokens.sizes[.medium] == tokens.sizes.medium && tokens.sizes[.large] == tokens.sizes.large)
    let variants = tokens.variants
    #expect(variants[.filled] == variants.filled && variants[.tonal] == variants.tonal && variants[.elevated] == variants.elevated)
    #expect(variants[.outlined] == variants.outlined && variants[.text] == variants.text)
    #expect(tokens.sizes.value(for: unknownSize) == nil && variants.value(for: unknownVariant) == nil)
  }

  /// BTN-7 — a size or variant the design system does not have draws the default value's tokens
  /// in every state, and the unknown value is reported (debug builds only).
  @Test("BTN-7 an unknown size and an unknown variant bind the default value's tokens", arguments: TanreiInteraction.allCases)
  func unknownValuesBindTheDefault(state: TanreiInteraction) {
    let (appearance, reports) = Reports.collecting {
      TanreiButtonAppearance(tokens: tokens, variant: unknownVariant, size: unknownSize, state: state, hasIcon: true)
    }
    #expect(appearance == TanreiButtonAppearance(tokens: tokens, variant: .filled, size: .medium, state: state, hasIcon: true))
    #expect(reports.mention("button size \"colossal\"") && reports.mention("button variant \"sparkly\""))
  }

  /// BTN-7 — known values report nothing.
  @Test("BTN-7 known values are not reported")
  func knownValuesAreSilent() {
    let (_, reports) = Reports.collecting {
      for variant in TanreiButtonVariant.core {
        for size in TanreiButtonSize.core { _ = TanreiButtonAppearance(tokens: tokens, variant: variant, size: size, state: .enabled) }
      }
    }
    #expect(reports.messages.isEmpty)
  }

  /// BTN-7 — rendered: pixel-identical to the default button, and nothing crashes. Identity is
  /// asserted on `renderExact` (bit-stable); see `Snapshot.render` for why the fast path is not.
  @Test("BTN-7 an unknown size and variant render exactly like the default")
  func unknownValuesRenderTheDefault() throws {
    let expected = try Snapshot.renderExact(TanreiButton("Deploy", action: {}))
    let (actual, reports) = try Reports.collecting {
      try Snapshot.renderExact(TanreiButton("Deploy", variant: unknownVariant, size: unknownSize, action: {}))
    }
    #expect(actual.width == expected.width && actual.height == expected.height)
    #expect(actual.mismatch(against: expected, channelTolerance: 0) == 0)
    #expect(reports.mention("colossal") && reports.mention("sparkly"))

    // With an icon and disabled, too: the icon size and the disabled tokens are the default's.
    func button(_ variant: TanreiButtonVariant, _ size: TanreiButtonSize) -> some View {
      TanreiButton("Deploy", variant: variant, size: size, action: {}) { Image(systemName: "arrow.up") }.disabled(true)
    }
    let expectedDisabled = try Snapshot.renderExact(button(.filled, .medium))
    let (actualDisabled, _) = try Reports.collecting { try Snapshot.renderExact(button(unknownVariant, unknownSize)) }
    #expect(actualDisabled.mismatch(against: expectedDisabled, channelTolerance: 0) == 0)
  }

  /// BTN-7 — the fallback is the DEFAULT value of the axis in the current system, whatever it holds.
  @Test("BTN-7 the fallback follows the system's default value")
  func fallbackFollowsTheSystem() {
    var custom = tokens
    custom.sizes.medium.containerHeight = 99
    custom.variants.filled.enabled.containerColor = .role(.success)
    let (appearance, _) = Reports.collecting {
      TanreiButtonAppearance(tokens: custom, variant: unknownVariant, size: unknownSize, state: .enabled)
    }
    #expect(appearance.height == 99 && appearance.container == .role(.success))
  }

  /// A value a design system adds is read from `extra` and drives the button like a core value.
  @Test("a value added to `extra` is used, not the fallback")
  func addedValuesAreUsed() {
    var custom = tokens
    var huge = tokens.sizes.large
    huge.containerHeight = 64
    custom.sizes.extra[unknownSize] = huge
    var sparkly = tokens.variants.filled
    sparkly.pressed.containerColor = .role(.warning)
    custom.variants.extra[unknownVariant] = sparkly
    let (appearance, reports) = Reports.collecting {
      TanreiButtonAppearance(tokens: custom, variant: unknownVariant, size: unknownSize, state: .pressed)
    }
    #expect(appearance.height == 64 && appearance.container == .role(.warning))
    #expect(reports.messages.isEmpty)
    #expect(custom.sizes.keys == TanreiButtonSize.core + [unknownSize])
  }
}

// MARK: - Rendered states

@MainActor
@Suite("TanreiButton rendered states")
struct TanreiButtonRenderedStateTests {
  let system = TanreiSystem.tanrei
  let colors = TanreiSystem.tanrei.colors.light
  let inset = Snapshot.inset
  var tokens: TanreiButtonTokens { system.button }

  private func chrome(isPressed: Bool = false, isFocused: Bool = false) -> some View {
    TanreiButtonChrome(variant: .filled, size: .medium, isPressed: isPressed, isFocused: isFocused) {
      Text(verbatim: "Deploy")
    }
  }

  /// The snapshot theme with another design system.
  private func theme(_ system: TanreiSystem) -> TanreiTheme {
    var theme = Snapshot.theme
    theme.system = system
    return theme
  }

  /// Device pixel for a point given in layout points from the top-left of the render.
  private func pixel(_ bitmap: Bitmap, x: CGFloat, y: CGFloat) -> Bitmap.RGBA {
    bitmap[Int(x * Snapshot.scale), Int(y * Snapshot.scale)]
  }

  /// A point inside the container's inline padding: container color, no glyphs.
  private var containerPoint: CGPoint {
    CGPoint(x: inset + tokens.sizes.medium.containerPaddingInlineStart / 2, y: inset + tokens.sizes.medium.containerHeight / 2)
  }

  /// BTN-3 — the default system's pressed and focused containers look exactly like the state
  /// layer they replace: the label color at the sys.state opacity over the container.
  @Test("BTN-3 pressed and focused render the state's container color")
  func stateContainer() throws {
    let rest = try Snapshot.render(chrome())
    #expect(pixel(rest, x: containerPoint.x, y: containerPoint.y).isClose(to: colors[.primary].rgba8()))

    let pressed = try Snapshot.render(chrome(isPressed: true))
    let pressedExpected = colors[.onPrimary].opacity(system.state.pressedStateLayerOpacity).rgba8(over: colors[.primary])
    #expect(pixel(pressed, x: containerPoint.x, y: containerPoint.y).isClose(to: pressedExpected))
    #expect(pixel(pressed, x: containerPoint.x, y: containerPoint.y).isClose(to: colors[tokens.variants.filled.pressed.containerColor].rgba8()))

    let focused = try Snapshot.render(chrome(isFocused: true))
    let focusedExpected = colors[.onPrimary].opacity(system.state.focusStateLayerOpacity).rgba8(over: colors[.primary])
    #expect(pixel(focused, x: containerPoint.x, y: containerPoint.y).isClose(to: focusedExpected))
  }

  /// BTN-3 — rendering follows the values: another system's pressed state is drawn as that
  /// system says (explicit color, dim, other shape), with no component change.
  @Test("BTN-3 a modified system drives the rendered state")
  func modifiedSystemRenders() throws {
    var custom = system
    custom.button.variants.filled.pressed.containerColor = .role(.error)
    custom.button.variants.filled.focused.containerColor = .role(.success)
    let recolored = try Snapshot.render(chrome(isPressed: true), theme: theme(custom))
    #expect(pixel(recolored, x: containerPoint.x, y: containerPoint.y).isClose(to: colors[.error].rgba8()))
    // Precedence: pressed wins over focused; focused alone draws the focused tokens.
    let both = try Snapshot.render(chrome(isPressed: true, isFocused: true), theme: theme(custom))
    #expect(pixel(both, x: containerPoint.x, y: containerPoint.y).isClose(to: colors[.error].rgba8()))
    let focused = try Snapshot.render(chrome(isFocused: true), theme: theme(custom))
    #expect(pixel(focused, x: containerPoint.x, y: containerPoint.y).isClose(to: colors[.success].rgba8()))
    // At rest nothing changed.
    let rest = try Snapshot.renderExact(chrome(), theme: theme(custom))
    #expect(rest.mismatch(against: try Snapshot.renderExact(chrome()), channelTolerance: 0) == 0)

    // Opacity: the whole control is dimmed by the state's opacity token.
    custom.button.pressed.opacity = 0.4
    let dimmed = try Snapshot.render(chrome(isPressed: true), theme: theme(custom))
    let dimmedExpected = colors[.error].opacity(0.4).rgba8(over: colors[.surface])
    #expect(pixel(dimmed, x: containerPoint.x, y: containerPoint.y).isClose(to: dimmedExpected))

    // Shape: a point just inside the corner is outside the default radius and inside a radius of 2.
    custom.button.pressed.opacity = 1
    custom.button.pressed.containerShape = 2
    let corner = inset + 1
    #expect(pixel(recolored, x: corner, y: corner).isClose(to: colors[.surface].rgba8()))
    let squarer = try Snapshot.render(chrome(isPressed: true), theme: theme(custom))
    #expect(pixel(squarer, x: corner, y: corner).isClose(to: colors[.error].rgba8()))
  }

  /// Layout follows the values too: doubling padding-inline-start widens the button by exactly it.
  @Test("a modified system drives layout: padding-inline-start, padding-block, height as a minimum")
  func modifiedSystemLayout() throws {
    let rest = try Snapshot.render(chrome())
    var custom = system
    custom.button.sizes.medium.containerPaddingInlineStart = tokens.sizes.medium.containerPaddingInlineStart * 2
    let wider = try Snapshot.render(chrome(), theme: theme(custom))
    #expect(CGFloat(wider.width - rest.width) == tokens.sizes.medium.containerPaddingInlineStart * Snapshot.scale)
    #expect(wider.height == rest.height)
    // The with-icon padding is not read without an icon…
    custom = system
    custom.button.sizes.medium.containerPaddingInlineStartWithIcon = tokens.sizes.medium.containerPaddingInlineStartWithIcon * 2
    let unchanged = try Snapshot.render(chrome(), theme: theme(custom))
    #expect(unchanged.width == rest.width)
    // …and is read with one.
    func iconChrome() -> some View {
      TanreiButtonChrome(variant: .filled, size: .medium, hasIcon: true, isPressed: false, isFocused: false) {
        Text(verbatim: "Deploy")
      }
    }
    let iconRest = try Snapshot.render(iconChrome())
    let iconWider = try Snapshot.render(iconChrome(), theme: theme(custom))
    #expect(CGFloat(iconWider.width - iconRest.width) == tokens.sizes.medium.containerPaddingInlineStartWithIcon * Snapshot.scale)

    // Height is a minimum: a block padding larger than the slack makes the container grow.
    custom = system
    custom.button.sizes.medium.containerPaddingBlock = tokens.sizes.medium.containerHeight
    let taller = try Snapshot.render(chrome(), theme: theme(custom))
    #expect(taller.height > rest.height)
    #expect(taller.width == rest.width)
  }

  /// The gap between icon and label and the outline width belong to the SIZE: changing them on one
  /// size changes that size's rendering and no other's.
  @Test("a modified system drives the per-size gap and outline width")
  func modifiedGapAndOutlineWidth() throws {
    func button(_ size: TanreiButtonSize) -> some View {
      TanreiButton("Deploy", variant: .outlined, size: size, action: {}) { Image(systemName: "arrow.up") }
    }
    let rest = try Snapshot.render(button(.medium))
    let restLarge = try Snapshot.render(button(.large))
    var custom = system
    let gap = tokens.sizes.medium.containerGap
    custom.button.sizes.medium.containerGap = gap * 3
    let wider = try Snapshot.render(button(.medium), theme: theme(custom))
    #expect(CGFloat(wider.width - rest.width) == gap * 2 * Snapshot.scale)
    let otherSize = try Snapshot.render(button(.large), theme: theme(custom))
    #expect(otherSize.width == restLarge.width && otherSize.height == restLarge.height)

    // The outline: `width` points of the outline color from the leading edge inward, mid-height.
    custom = system
    let width = tokens.sizes.medium.outlineWidth
    custom.button.sizes.medium.outlineWidth = width * 4
    custom.button.variants.outlined.enabled.outlineColor = .role(.error)
    var thin = system
    thin.button.variants.outlined.enabled.outlineColor = .role(.error)
    let thick = try Snapshot.render(button(.medium), theme: theme(custom))
    let thinBitmap = try Snapshot.render(button(.medium), theme: theme(thin))
    let midY = inset + tokens.sizes.medium.containerHeight / 2
    let probe = inset + width * 2.5  // inside the 4× outline, past the 1× one
    #expect(pixel(thick, x: probe, y: midY).isClose(to: colors[.error].rgba8()))
    #expect(!pixel(thinBitmap, x: probe, y: midY).isClose(to: colors[.error].rgba8()))
    #expect(pixel(thinBitmap, x: inset + width / 2, y: midY).isClose(to: colors[.error].rgba8()))
    #expect(thick.width == thinBitmap.width && thick.height == thinBitmap.height)
    // Another size keeps its own width.
    #expect(!pixel(try Snapshot.render(button(.large), theme: theme(custom)), x: probe, y: inset + tokens.sizes.large.containerHeight / 2).isClose(to: colors[.error].rgba8()))
  }

  /// BTN-3 — only one state at a time: pressed > focused > hovered; disabled wins over all.
  @Test("BTN-3 state priority")
  func statePriority() {
    typealias I = TanreiInteraction
    #expect(I.resolve(isPressed: true, isFocused: true, isHovered: true) == .pressed)
    #expect(I.resolve(isPressed: false, isFocused: true, isHovered: true) == .focused)
    #expect(I.resolve(isPressed: false, isFocused: false, isHovered: true) == .hovered)
    #expect(I.resolve(isPressed: false, isFocused: false, isHovered: false) == .enabled)
    #expect(I.resolve(isEnabled: false, isPressed: true, isFocused: true, isHovered: true) == .disabled)
    #expect(I.resolve(isEnabled: false, isPressed: false, isFocused: false, isHovered: false) == .disabled)
    // The cases are the spec's states, verbatim.
    #expect(I.allCases.map(\.rawValue) == ["enabled", "hovered", "focused", "pressed", "disabled"])
  }

  /// BTN-4 — offset, then the outer stroke in the focusRing role; absent without focus.
  @Test("BTN-4 focus indicator is an offset then a ring in the focusRing color")
  func focusRing() throws {
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.focused.containerShape, measure: system.measure)
    let midY = inset + tokens.sizes.medium.containerHeight / 2
    let ringX = inset - metrics.outerCenterlineOutset
    let gapX = inset - metrics.offset / 2

    let focused = try Snapshot.render(chrome(isFocused: true))
    #expect(pixel(focused, x: ringX, y: midY).isClose(to: colors[.focusRing].rgba8()))
    #expect(pixel(focused, x: gapX, y: midY).isClose(to: colors[.surface].rgba8()))

    let rest = try Snapshot.render(chrome())
    #expect(pixel(rest, x: ringX, y: midY).isClose(to: colors[.surface].rgba8()))
    // The ring draws outside the layout: focus does not change the rendered size.
    #expect(focused.width == rest.width && focused.height == rest.height)
  }

  /// BTN-4 — the indicator follows sys.focus: an inner stroke in focus-ring-inner, then the outer
  /// stroke; a negative offset draws inside the control.
  @Test("BTN-4 a modified system drives the focus indicator: inner stroke and signed offset")
  func modifiedFocusRing() throws {
    let midY = inset + tokens.sizes.medium.containerHeight / 2
    var custom = system
    custom.measure.focusInnerWidth = 1
    custom.measure.focusOuterWidth = 3
    custom.colors.light.values[.focusRingInner] = colors.value(.error)
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.focused.containerShape, measure: custom.measure)
    let twoTone = try Snapshot.render(chrome(isFocused: true), theme: theme(custom))
    #expect(pixel(twoTone, x: inset - metrics.offset / 2, y: midY).isClose(to: colors[.surface].rgba8()))
    #expect(pixel(twoTone, x: inset - metrics.innerCenterlineOutset, y: midY).isClose(to: colors[.error].rgba8()))
    #expect(pixel(twoTone, x: inset - metrics.outerCenterlineOutset, y: midY).isClose(to: colors[.focusRing].rgba8()))
    #expect(pixel(twoTone, x: inset - metrics.outerOutset - 1, y: midY).isClose(to: colors[.surface].rgba8()))
    // The default system has inner-width 0: where the inner stroke would be there is only the gap.
    let single = try Snapshot.render(chrome(isFocused: true))
    #expect(pixel(single, x: inset - metrics.innerCenterlineOutset + 0.25, y: midY).isClose(to: colors[.focusRing].rgba8()))

    // Negative offset: the ring is inside the container, and nothing is drawn outside it.
    custom = system
    custom.measure.focusOffset = -4
    let inside = try Snapshot.render(chrome(isFocused: true), theme: theme(custom))
    let insideMetrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.focused.containerShape, measure: custom.measure)
    #expect(insideMetrics.outerCenterlineOutset < 0)
    #expect(pixel(inside, x: inset - insideMetrics.outerCenterlineOutset, y: midY).isClose(to: colors[.focusRing].rgba8()))
    #expect(pixel(inside, x: inset - 1, y: midY).isClose(to: colors[.surface].rgba8()))
  }

  /// BTN-4 — the focus ring has no motion tokens and state changes respect Reduce Motion.
  @Test("BTN-4 no animation under Reduce Motion")
  func reduceMotion() {
    #expect(TanreiMotion.animation(durationMs: tokens.motionStateDuration, easing: tokens.motionStateEasing, reduceMotion: true) == nil)
    #expect(TanreiMotion.animation(durationMs: tokens.motionStateDuration, easing: tokens.motionStateEasing, reduceMotion: false) != nil)
  }

  /// BTN-6 — rendered: the default system's disabled container is on-surface at
  /// disabled-container-opacity over the surface.
  @Test("BTN-6 disabled renders from the disabled tokens")
  func disabledRender() throws {
    let disabled = try Snapshot.render(chrome().disabled(true))
    let expected = colors[.onSurface].opacity(system.state.disabledContainerOpacity).rgba8(over: colors[.surface])
    #expect(pixel(disabled, x: containerPoint.x, y: containerPoint.y).isClose(to: expected))
    // Focus is never shown on a disabled button.
    let focusedDisabled = try Snapshot.render(chrome(isFocused: true).disabled(true))
    #expect(focusedDisabled.mismatch(against: disabled, channelTolerance: Snapshot.channelTolerance) == 0)

    // Another system dims the whole control instead: explicit container, opacity 0.5.
    var custom = system
    custom.button.variants.filled.disabled.containerColor = .role(.primary)
    custom.button.disabled.opacity = 0.5
    let dimmed = try Snapshot.render(chrome().disabled(true), theme: theme(custom))
    let dimmedExpected = colors[.primary].opacity(0.5).rgba8(over: colors[.surface])
    #expect(pixel(dimmed, x: containerPoint.x, y: containerPoint.y).isClose(to: dimmedExpected))
  }
}

// MARK: - Hit target

@MainActor
@Suite("TanreiButton hit target")
struct TanreiButtonHitTargetTests {
  /// BTN-5 — the hit area reaches the minimum target, centred, and never shrinks.
  @Test("BTN-5 hit target math")
  func math() {
    let measure = TanreiSystem.tanrei.measure
    let tokens = TanreiSystem.tanrei.button
    let minimum = TanreiHitTarget.minimum(in: measure)
    #if os(macOS)
    #expect(minimum == measure.targetPointer)
    #else
    #expect(minimum == measure.targetTouch)
    #endif

    for height in [tokens.sizes.small.containerHeight, tokens.sizes.medium.containerHeight, tokens.sizes.large.containerHeight] {
      let visual = CGRect(x: 10, y: 20, width: 80, height: height)
      let hit = TanreiHitTarget.rect(for: visual, minimum: minimum)
      #expect(hit.height == max(height, minimum))
      #expect(hit.width == visual.width)  // already wide enough: untouched
      #expect(hit.midX == visual.midX && hit.midY == visual.midY)
      #expect(hit.contains(visual))
    }

    let tiny = TanreiHitTarget.rect(for: CGRect(x: 0, y: 0, width: 20, height: 20), minimum: measure.targetTouch)
    #expect(tiny == CGRect(x: -14, y: -14, width: 48, height: 48))
    let big = CGRect(x: 0, y: 0, width: 200, height: 100)
    #expect(TanreiHitTarget.rect(for: big, minimum: measure.targetTouch) == big)

    let outsets = TanreiHitTarget.outsets(for: CGSize(width: 80, height: 32), minimum: measure.targetTouch)
    #expect(outsets == TanreiHitTargetOutsets(horizontal: 0, vertical: 8))
  }

  /// BTN-5 — the visual (and layout) size stays at the token height for every size.
  @Test("BTN-5 visual size is unchanged by the hit target", arguments: TanreiButtonSize.core)
  func visualSize(size: TanreiButtonSize) throws {
    let bitmap = try Snapshot.render(TanreiButton("Deploy", size: size, action: {}))
    let height = TanreiButtonAppearance(tokens: TanreiSystem.tanrei.button, variant: .filled, size: size, state: .enabled).height
    #expect(CGFloat(bitmap.height) == (height + 2 * Snapshot.inset) * Snapshot.scale)
  }
}

// MARK: - Snapshots (one per spec fixture)

@MainActor
@Suite("TanreiButton snapshots")
struct TanreiButtonSnapshotTests {
  struct Fixture: Sendable, CustomTestStringConvertible {
    let id: String
    var variant: TanreiButtonVariant = .filled
    var size: TanreiButtonSize = .medium
    var disabled = false
    var testDescription: String { id }
  }

  /// Mirrors `fixtures` in specs/button.spec.json (content: "Deploy").
  nonisolated static let fixtures: [Fixture] = [
    Fixture(id: "filled-medium", variant: .filled),
    Fixture(id: "tonal-medium", variant: .tonal),
    Fixture(id: "elevated-medium", variant: .elevated),
    Fixture(id: "outlined-medium", variant: .outlined),
    Fixture(id: "text-medium", variant: .text),
    Fixture(id: "filled-small", variant: .filled, size: .small),
    Fixture(id: "filled-large", variant: .filled, size: .large),
    Fixture(id: "filled-disabled", variant: .filled, disabled: true),
  ]

  @Test("fixture matches its baseline", arguments: fixtures)
  func fixture(_ fixture: Fixture) throws {
    let view = TanreiButton("Deploy", variant: fixture.variant, size: fixture.size, action: {})
      .disabled(fixture.disabled)
    try Snapshot.assert(view, named: fixture.id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    // …/packages/swiftui/Tests/TanreiTests/<file> → repository root
    var root = URL(fileURLWithPath: #filePath)
    for _ in 0..<5 { root.deleteLastPathComponent() }
    let data = try Data(contentsOf: root.appendingPathComponent("specs/button.spec.json"))
    struct Spec: Decodable {
      struct Fixture: Decodable { let id: String }
      let fixtures: [Fixture]
    }
    let spec = try JSONDecoder().decode(Spec.self, from: data)
    #expect(spec.fixtures.map(\.id) == Self.fixtures.map(\.id))
  }
}

// MARK: - BTN-8, BTN-9, BTN-10 and the icon's height
//
// BTN-8 (a press is shown at once and held), BTN-9 (`sys.behavior.pressed-feedback`), BTN-10
// (`sys.shape.corner-smoothing`, `focus-style`). Every expectation is read from a system instance; nothing here (and
// nothing in Sources/) branches on a system's id. `focus-style: glow` and BTN-3's precedence under the
// `acme` fixture system are in TanreiExtensionTests (the module that can see `TanreiSystem.acme`).

/// The snapshot theme with another design system.
@MainActor
private func theme(_ system: TanreiSystem) -> TanreiTheme {
  var theme = Snapshot.theme
  theme.system = system
  return theme
}

@MainActor
private func pixel(_ bitmap: Bitmap, x: CGFloat, y: CGFloat) -> Bitmap.RGBA {
  bitmap[Int(x * Snapshot.scale), Int(y * Snapshot.scale)]
}

// MARK: - Choices of kind on the system instance

// On the main actor: its tests read whole shipped systems, whose one-time initialization and copies need more
// stack than a cooperative thread has.
@MainActor
@Suite("Behavior choices")
struct TanreiBehaviorChoiceTests {
  /// Typed enumerations, required like every core token; the index never reaches Swift.
  @Test("the shipped systems choose their focus style and pressed feedback")
  func shippedValues() {
    #expect(TanreiSystem.tanrei.behavior == TanreiBehavior(focusStyle: .ring, pressedFeedback: .overlay))
    #expect(TanreiSystem.m3Like.behavior.pressedFeedback == .ripple)
    #expect(TanreiSystem.m3ExpressiveLike.behavior.pressedFeedback == .ripple)  // inherited from m3-like
    #expect(TanreiSystem.cupertino.behavior == TanreiBehavior(focusStyle: .ring, pressedFeedback: .dim))
  }

  @Test("the lists of names are the vocabulary's, first value first")
  func names() {
    #expect(TanreiPressedFeedback.allCases.map(\.rawValue) == ["overlay", "ripple", "dim", "none"])
    #expect(TanreiFocusStyle.allCases.map(\.rawValue) == ["ring", "glow"])
  }

  /// Corner smoothing is an amount, not a choice of kind. SwiftUI has only the OS's curve, so the amount
  /// rounds to it: `.circular` at 0, `.continuous` for anything above.
  @Test("BTN-10 corner smoothing is an amount the shipped systems set; SwiftUI rounds it to the OS's curve")
  func cornerSmoothing() {
    #expect(TanreiSystem.tanrei.shape.cornerSmoothing == 0)
    #expect(TanreiSystem.m3Like.shape.cornerSmoothing == 0)
    #expect(TanreiSystem.cupertino.shape.cornerSmoothing == 0.6)
    var shape = TanreiSystem.tanrei.shape
    for amount in [0.0, 0.3, 0.6, 1.0] {
      shape.cornerSmoothing = amount
      #expect(shape.roundedCornerStyle == (amount > 0 ? .continuous : .circular), "\(amount)")
    }
  }
}

// MARK: - BTN-9

@MainActor
@Suite("TanreiButton pressed feedback")
struct TanreiButtonPressedFeedbackTests {
  let inset = Snapshot.inset

  private func chrome(_ variant: TanreiButtonVariant = .filled, isPressed: Bool = true, isFocused: Bool = false) -> some View {
    TanreiButtonChrome(variant: variant, size: .medium, isPressed: isPressed, isFocused: isFocused) { Text(verbatim: "Deploy") }
  }

  private func containerPoint(_ tokens: TanreiButtonTokens) -> CGPoint {
    CGPoint(x: inset + tokens.sizes.medium.containerPaddingInlineStart / 2, y: inset + tokens.sizes.medium.containerHeight / 2)
  }

  /// A system whose pressed tokens differ from rest in EVERY part, so each choice is told apart.
  private func distinct(_ feedback: TanreiPressedFeedback) -> TanreiSystem {
    var system = TanreiSystem.tanrei
    system.behavior.pressedFeedback = feedback
    system.button.variants.filled.pressed.containerColor = .role(.error)
    system.button.variants.filled.pressed.labelColor = .role(.warning)
    system.button.variants.filled.pressed.outlineColor = .role(.success)
    system.button.variants.filled.focused.containerColor = .role(.success)
    system.button.pressed.opacity = 0.5
    return system
  }

  /// BTN-9 — which tokens a press reads under each choice. The pressed tokens always decide the
  /// colors and the opacity; the choice decides how (and whether) they appear.
  @Test("BTN-9 each choice binds the pressed tokens its own way", arguments: TanreiPressedFeedback.allCases)
  func bindings(feedback: TanreiPressedFeedback) {
    let tokens = distinct(feedback).button
    let filled = tokens.variants.filled
    for beneath in [TanreiInteraction.enabled, .hovered, .focused] {
      let appearance = TanreiButtonAppearance(tokens: tokens, variant: .filled, size: .medium, state: .pressed, feedback: feedback, beneath: beneath)
      let under = filled[state: beneath]
      switch feedback {
      case .overlay:
        // The pressed tokens on the whole container at once.
        #expect(appearance.container == filled.pressed.containerColor && appearance.ripple == nil)
        #expect(appearance.label == filled.pressed.labelColor && appearance.outline == filled.pressed.outlineColor)
        #expect(appearance.opacity == tokens.pressed.opacity)
      case .ripple:
        // The pressed state layer (the pressed container paint) grows over the container beneath.
        #expect(appearance.container == under.containerColor && appearance.ripple == filled.pressed.containerColor)
        #expect(appearance.label == filled.pressed.labelColor && appearance.outline == filled.pressed.outlineColor)
        #expect(appearance.opacity == tokens.pressed.opacity)
      case .dim:
        // The pressed opacity on the whole control and NO state layer: the container beneath; label and
        // outline (like elevation and shape) are still the pressed tokens'.
        #expect(appearance.container == under.containerColor && appearance.ripple == nil)
        #expect(appearance.label == filled.pressed.labelColor && appearance.outline == filled.pressed.outlineColor)
        #expect(appearance.elevation == filled.pressed.containerElevation && appearance.cornerRadius == tokens.pressed.containerShape)
        #expect(appearance.opacity == tokens.pressed.opacity)
      case .none:
        // No answer to the press: exactly the state beneath.
        #expect(appearance == TanreiButtonAppearance(tokens: tokens, variant: .filled, size: .medium, state: beneath))
      }
    }
    // The choice matters only while pressed.
    for state in TanreiInteraction.allCases where state != .pressed {
      #expect(
        TanreiButtonAppearance(tokens: tokens, variant: .filled, size: .medium, state: state, feedback: feedback)
          == TanreiButtonAppearance(tokens: tokens, variant: .filled, size: .medium, state: state))
    }
  }

  /// BTN-9 — rendered, under a system that sets each value.
  @Test("BTN-9 each choice renders as it says", arguments: TanreiPressedFeedback.allCases)
  func rendered(feedback: TanreiPressedFeedback) throws {
    let system = distinct(feedback)
    let colors = system.colors.light
    let point = containerPoint(system.button)
    let bitmap = try Snapshot.render(chrome(), theme: theme(system))
    let actual = pixel(bitmap, x: point.x, y: point.y)
    switch feedback {
    case .overlay, .ripple:
      // A render that never saw the press begin shows the ripple grown: the same pixels as overlay.
      #expect(actual.isClose(to: colors[.error].opacity(0.5).rgba8(over: colors[.surface])))
    case .dim:
      #expect(actual.isClose(to: colors[.primary].opacity(0.5).rgba8(over: colors[.surface])))
    case .none:
      #expect(actual.isClose(to: colors[.primary].rgba8()))
      #expect(bitmap.mismatch(against: try Snapshot.render(chrome(isPressed: false), theme: theme(system)), channelTolerance: Snapshot.channelTolerance) == 0)
    }
    // Pressed while keyboard-focused: `dim` and `none` keep the FOCUSED colors beneath.
    if feedback == .dim || feedback == .none {
      let focused = try Snapshot.render(chrome(isFocused: true), theme: theme(system))
      let expected = feedback == .dim ? colors[.success].opacity(0.5).rgba8(over: colors[.surface]) : colors[.success].rgba8()
      #expect(pixel(focused, x: point.x, y: point.y).isClose(to: expected))
    }
  }

  /// BTN-9 — the shipped systems, by their own values: m3-like ripples, cupertino dims, the default overlays.
  @Test("BTN-9 m3-like ripples, cupertino dims, the default overlays")
  func shipped() {
    func pressed(_ system: TanreiSystem) -> TanreiButtonAppearance {
      TanreiButtonAppearance(tokens: system.button, variant: .filled, size: .medium, state: .pressed, feedback: system.behavior.pressedFeedback)
    }
    let m3 = pressed(.m3Like)
    #expect(m3.ripple == TanreiSystem.m3Like.button.variants.filled.pressed.containerColor)
    #expect(m3.container == TanreiSystem.m3Like.button.variants.filled.enabled.containerColor)
    let cupertino = pressed(.cupertino)
    #expect(cupertino.ripple == nil && cupertino.opacity == TanreiSystem.cupertino.button.pressed.opacity && cupertino.opacity < 1)
    let tanrei = pressed(.tanrei)
    #expect(tanrei.ripple == nil && tanrei.container == TanreiSystem.tanrei.button.variants.filled.pressed.containerColor)
  }

  /// BTN-9 `ripple` — the layer is a circle around the point of contact that ends up covering the
  /// container: its full radius is the distance to the farthest corner.
  @Test("BTN-9 the ripple grows from the point of contact to the farthest corner; from the center without one")
  func rippleGeometry() {
    let rect = CGRect(x: 0, y: 0, width: 80, height: 36)
    #expect(TanreiRippleShape.coveringRadius(of: rect, from: CGPoint(x: 0, y: 0)) == hypot(80, 36))
    #expect(TanreiRippleShape.coveringRadius(of: rect, from: CGPoint(x: 40, y: 18)) == hypot(40, 18))
    #expect(TanreiRippleShape.coveringRadius(of: rect, from: CGPoint(x: 70, y: 30)) == hypot(70, 30))

    let contact = CGPoint(x: 10, y: 30)
    let half = TanreiRippleShape(origin: contact, progress: 0.5).path(in: rect).boundingRect
    #expect(abs(half.midX - contact.x) < 0.001 && abs(half.midY - contact.y) < 0.001)
    #expect(abs(half.width / 2 - TanreiRippleShape.coveringRadius(of: rect, from: contact) / 2) < 0.001)
    // A key press has no point of contact: the center.
    let keyboard = TanreiRippleShape(origin: nil, progress: 0.5).path(in: rect).boundingRect
    #expect(abs(keyboard.midX - rect.midX) < 0.001 && abs(keyboard.midY - rect.midY) < 0.001)
    #expect(TanreiRippleShape(origin: contact, progress: 0).path(in: rect).boundingRect.width == 0)
    #expect(TanreiRippleShape(origin: contact, progress: TanreiRippleShape.grown).path(in: rect).contains(CGPoint(x: 79, y: 1)))
  }

  /// BTN-9 `ripple` — one timing rule on every platform: it grows over `motion.feedback-duration` with the
  /// state easing (the fade-out is the state change itself: `motion.state-duration`), and not at all
  /// under Reduce Motion.
  @Test("BTN-9 the ripple grows over motion.feedback-duration with the state easing; whole under Reduce Motion")
  func rippleTiming() {
    var tokens = TanreiSystem.m3Like.button
    let easing = tokens.motionStateEasing
    #expect(tokens.motionFeedbackDuration == TanreiSystem.m3Like.motion.duration.long1)  // the alias the default gives it
    #expect(tokens.rippleGrowth(reduceMotion: false) == Animation.timingCurve(easing.x1, easing.y1, easing.x2, easing.y2, duration: tokens.motionFeedbackDuration / 1000))
    tokens.motionFeedbackDuration = 900
    tokens.motionStateEasing = TanreiCubicBezier(0, 0, 1, 1)
    #expect(tokens.rippleGrowth(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.9))
    #expect(tokens.rippleGrowth(reduceMotion: true) == nil)
  }

  /// BTN-9 `ripple` — rendered half-way: the pressed color around the point of contact, the rest
  /// color far from it, and nothing outside the container's shape.
  @Test("BTN-9 a growing ripple is the pressed color near the contact, clipped to the container")
  func rippleRendered() throws {
    let system = TanreiSystem.m3Like
    let colors = system.colors.light
    let size = CGSize(width: 120, height: 40)
    let contact = CGPoint(x: 20, y: 20)
    let shape = RoundedRectangle(cornerRadius: size.height / 2, style: system.shape.roundedCornerStyle)
    let pressed = colors[system.button.variants.filled.pressed.containerColor]
    let view = ZStack {
      shape.fill(colors[.primary])
      TanreiRippleShape(origin: contact, progress: 0.3).fill(pressed).clipShape(shape)
    }
    .frame(width: size.width, height: size.height)
    let bitmap = try Snapshot.render(view, theme: theme(system))
    #expect(pixel(bitmap, x: inset + contact.x, y: inset + contact.y).isClose(to: pressed.rgba8()))
    #expect(pixel(bitmap, x: inset + 100, y: inset + 20).isClose(to: colors[.primary].rgba8()))
    // The circle reaches past the pill's end cap; the clip keeps the surface clean.
    #expect(pixel(bitmap, x: inset + 1, y: inset + 1).isClose(to: colors[.surface].rgba8()))
    #expect(!pressed.rgba8().isClose(to: colors[.primary].rgba8()))
  }

  #if os(macOS)
  /// BTN-1 under `ripple`: recording the point of contact must not take the click away from the button.
  @Test("BTN-1 BTN-9 a click still emits exactly once under ripple", arguments: [true, false])
  func clickUnderRipple(isEnabled: Bool) {
    var count = 0
    let hosted = HostedView(
      TanreiButton("Deploy", action: { count += 1 })
        .disabled(!isEnabled)
        .padding(Snapshot.inset)
        .tanreiTheme(theme(.m3Like))
    )
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: hosted.size.height / 2))
    #expect(count == (isEnabled ? 1 : 0))
  }
  #endif
}

// MARK: - BTN-8

@MainActor
@Suite("TanreiButton press hold", .serialized)
struct TanreiButtonPressHoldTests {
  /// BTN-8 — the rule, without a clock: a press is held until `press-hold` has passed since it BEGAN.
  @Test("BTN-8 a press that ends early is held for the rest of press-hold; a long press is not held further")
  func rule() {
    var hold = TanreiPressHold()
    #expect(!hold.isHeld && !hold.hasBegun)
    hold.begin(at: 10)
    #expect(hold.isHeld && hold.hasBegun)
    #expect(abs(hold.remaining(at: 10.02, minimumMs: 100) - 0.08) < 1e-9)  // released after 20 ms: 80 ms to go
    #expect(hold.remaining(at: 10.1, minimumMs: 100) < 1e-9)
    #expect(hold.remaining(at: 12, minimumMs: 100) == 0)  // a long press ends when it ends
    #expect(hold.remaining(at: 10, minimumMs: 0) == 0)  // a system may ask for no hold
    let first = hold.generation
    hold.begin(at: 10.05)  // a second press before the first hold ran out…
    hold.end(generation: first)  // …is not ended by the first one's timer
    #expect(hold.isHeld)
    hold.end(generation: hold.generation)
    #expect(!hold.isHeld)
  }

  @Test("BTN-8 the hold is the design system's duration.press-hold")
  func token() {
    #expect(TanreiSystem.tanrei.motion.duration.pressHold == 100)
    #expect(TanreiSystem.tanrei.motion.duration["press-hold"] == 100)
  }

  #if os(macOS)
  private func system(holdMs: Double) -> TanreiSystem {
    var system = TanreiSystem.tanrei
    system.motion.duration.pressHold = holdMs
    system.button.motionStateDuration = 0  // no fade: a color read is the state, not a frame of a transition
    system.button.variants.filled.pressed.containerColor = .role(.error)
    return system
  }

  /// The end of a hold is scheduled on the main actor, which a test that only spins the run loop never
  /// yields: suspend (so the scheduled end can run), then let SwiftUI draw the result.
  private var containerPoint: CGPoint {
    let sizes = TanreiSystem.tanrei.button.sizes.medium
    return CGPoint(x: Snapshot.inset + sizes.containerPaddingInlineStart / 2, y: Snapshot.inset + sizes.containerHeight / 2)
  }

  /// BTN-8 end to end with real mouse events: pressed at once on mouse-down, still pressed after a
  /// quick release, at rest again once press-hold has passed — and the action fired exactly once.
  @Test("BTN-8 BTN-1 a quick click shows the pressed state at once and keeps it for press-hold")
  func quickClickIsHeld() async throws {
    let system = system(holdMs: 1500)
    let colors = system.colors.light
    var count = 0
    let hosted = HostedView(
      TanreiButton("Deploy", action: { count += 1 }).padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let center = CGPoint(x: hosted.size.width / 2, y: hosted.size.height / 2)
    #expect(try #require(hosted.color(at: containerPoint)).isClose(to: colors[.primary].rgba8()))

    hosted.mouse(.leftMouseDown, at: center)
    hosted.settle()
    #expect(try #require(hosted.color(at: containerPoint)).isClose(to: colors[.error].rgba8()))  // without delay
    hosted.mouse(.leftMouseUp, at: center)
    hosted.settle()
    #expect(count == 1)
    #expect(try #require(hosted.color(at: containerPoint)).isClose(to: colors[.error].rgba8()))  // released, still shown
    // The end of the hold is scheduled on the main actor: wait for it, bounded, rather than read once after a fixed
    // sleep, which a loaded machine delays.
    #expect(await hosted.wait(atMost: 5) { hosted.color(at: containerPoint)?.isClose(to: colors[.primary].rgba8()) == true })
    #expect(count == 1)
  }

  @Test("BTN-8 with press-hold 0 the pressed state ends with the press")
  func noHold() throws {
    let system = system(holdMs: 0)
    let colors = system.colors.light
    let hosted = HostedView(
      TanreiButton("Deploy", action: {}).padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: hosted.size.height / 2))
    #expect(try #require(hosted.color(at: containerPoint)).isClose(to: colors[.primary].rgba8()))
  }

  @MainActor
  private final class Keys: ObservableObject {
    @Published var presses = 0
  }

  private struct KeyHost: View {
    @ObservedObject var keys: Keys
    var body: some View {
      TanreiButtonChrome(variant: .filled, size: .medium, isPressed: false, isFocused: true, keyboardPresses: keys.presses) {
        Text(verbatim: "Deploy")
      }
    }
  }

  /// BTN-8 — Enter / Space: a key press has no "down" that lasts, so without the hold nothing would
  /// be seen at all. (That the keys reach the button and fire once is the UI test's job: Gallery.)
  @Test("BTN-8 a key activation shows the pressed state for press-hold")
  func keyActivationIsHeld() async throws {
    let system = system(holdMs: 1500)
    let colors = system.colors.light
    let keys = Keys()
    let hosted = HostedView(KeyHost(keys: keys).padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let focused = colors[system.button.variants.filled.focused.containerColor].rgba8()
    #expect(try #require(hosted.color(at: containerPoint)).isClose(to: focused))
    keys.presses += 1
    hosted.settle()
    #expect(try #require(hosted.color(at: containerPoint)).isClose(to: colors[.error].rgba8()))
    #expect(await hosted.wait(atMost: 5) { hosted.color(at: containerPoint)?.isClose(to: focused) == true })
  }
  #endif
}

// MARK: - BTN-10 corner smoothing

@MainActor
@Suite("TanreiButton corner smoothing")
struct TanreiButtonCornerSmoothingTests {
  let inset = Snapshot.inset

  /// BTN-10 — an amount above 0 draws SwiftUI's own continuous corner at the SAME radius (the amount
  /// rounds to the OS's curve): it leaves the straight edge earlier than a circular arc, so a point just inside
  /// the arc's start is surface at 0.6 and container at 0. Everything away from the corners is equal.
  @Test("BTN-10 corners eased by the amount differ from circular ones only at the corners")
  func continuousCorners() throws {
    func render(_ amount: Double) throws -> Bitmap {
      var system = TanreiSystem.cupertino
      system.shape.cornerSmoothing = amount
      return try Snapshot.render(
        TanreiButtonChrome(variant: .filled, size: .medium, isPressed: false, isFocused: false) { Text(verbatim: "Deploy") }, theme: theme(system))
    }
    #expect(TanreiSystem.cupertino.shape.cornerSmoothing == 0.6)
    let circular = try render(0)
    let continuous = try render(0.6)
    // Only the OS's curve exists here: every amount above 0 is that one curve (`renderExact`, bit-stable).
    func exact(_ amount: Double) throws -> Bitmap {
      var system = TanreiSystem.cupertino
      system.shape.cornerSmoothing = amount
      return try Snapshot.renderExact(
        TanreiButtonChrome(variant: .filled, size: .medium, isPressed: false, isFocused: false) { Text(verbatim: "Deploy") }, theme: theme(system))
    }
    let reference = try exact(0.6)
    for amount in [0.3, 1.0] {
      #expect(try exact(amount).mismatch(against: reference, channelTolerance: 0) == 0, "\(amount)")
    }
    #expect(circular.width == continuous.width && circular.height == continuous.height)

    let tokens = TanreiSystem.cupertino.button
    let radius = tokens.containerShape
    let height = tokens.sizes.medium.containerHeight
    var differing = 0
    var differingAwayFromCorners = 0
    var continuousIsSmaller = true
    let primary = TanreiSystem.cupertino.colors.light[.primary].rgba8()
    for y in 0..<circular.height {
      for x in 0..<circular.width where circular[x, y] != continuous[x, y] {
        differing += 1
        let px = CGFloat(x) / Snapshot.scale - inset
        let py = CGFloat(y) / Snapshot.scale - inset
        let width = CGFloat(circular.width) / Snapshot.scale - 2 * inset
        // A continuous corner of radius r starts bending about 1.53 r before the corner.
        let reach = radius * 1.6
        let nearCornerX = px < reach || px > width - reach
        let nearCornerY = py < reach || py > height - reach
        if !(nearCornerX && nearCornerY) { differingAwayFromCorners += 1 }
        // Where they differ, the continuous shape has LESS fill (it cuts inside the arc) or an equal antialiased edge.
        if continuous[x, y].isClose(to: primary, tolerance: 0) && !circular[x, y].isClose(to: primary, tolerance: 0) { continuousIsSmaller = false }
      }
    }
    #expect(differing > 0)
    #expect(differingAwayFromCorners == 0)
    #expect(continuousIsSmaller)
  }
}

// MARK: - Icon height

@MainActor
@Suite("TanreiButton height with an icon")
struct TanreiButtonIconHeightTests {
  struct Case: Sendable, CustomTestStringConvertible {
    let shipped: ShippedSystem
    let size: TanreiButtonSize
    var testDescription: String { "\(shipped.rawValue)/\(size.rawValue)" }
  }

  /// Every size of every shipped system, the sizes a system adds included.
  nonisolated static let cases: [Case] = LargeStack.run {
    ShippedSystem.allCases.flatMap { shipped in
      shipped.system.button.sizes.keys.map { Case(shipped: shipped, size: $0) }
    }
  }

  /// Sizes whose own LABEL does not fit the height token (block padding + one line > height). None today:
  /// the token build refuses such values (6ca2125). Kept so that a product system tested here says so
  /// explicitly instead of blaming the icon.
  nonisolated static let labelTallerThanToken: Set<String> = []

  private func height(_ view: some View, _ system: TanreiSystem) throws -> CGFloat {
    var theme = Snapshot.theme
    theme.system = system
    return CGFloat(try Snapshot.render(view, theme: theme).height) / Snapshot.scale - 2 * Snapshot.inset
  }

  /// An icon — the size's own, or one far taller than the container — never changes the height: the
  /// container is its height token (a minimum the LABEL may exceed), with or without an icon.
  /// Before the fix: m3-expressive-like `xsmall` (32) with its 20pt icon rendered 36.
  @Test("an icon never grows the container: every size of every shipped system keeps its token height", arguments: cases)
  func tokenHeight(item: Case) throws {
    let system = item.shipped.system
    let metrics = system.button.sizes[item.size]
    let plain = try height(TanreiButton("Deploy", size: item.size, action: {}), system)
    let withIcon = try height(TanreiButton("Deploy", size: item.size, action: {}) { Image(systemName: "arrow.up") }, system)
    let withBox = try height(TanreiButton("Deploy", size: item.size, action: {}) { Rectangle() }, system)  // fills the whole icon box
    #expect(withIcon == plain && withBox == plain, "\(item)")

    let label = 2 * metrics.containerPaddingBlock + metrics.labelTypescale.lineHeight
    if Self.labelTallerThanToken.contains(item.testDescription) {
      #expect(label > metrics.containerHeight && plain == label, "\(item)")
    } else {
      #expect(withIcon == metrics.containerHeight && withBox == metrics.containerHeight, "\(item): \(withIcon) vs \(metrics.containerHeight)")
    }
  }

  @Test("the cases cover the sizes a preset adds, and the reported one: m3-expressive-like xsmall is 32 with a 20pt icon")
  func reportedCase() throws {
    #expect(Self.cases.contains { $0.shipped == .m3ExpressiveLike && $0.size == .xsmall })
    #expect(Self.cases.contains { $0.shipped == .m3ExpressiveLike && $0.size == .xlarge })
    let sizes = TanreiSystem.m3ExpressiveLike.button.sizes
    #expect(sizes[.xsmall].containerHeight == 32 && sizes[.xsmall].iconSize == 20)
    let rendered = try height(TanreiButton("Deploy", size: .xsmall, action: {}) { Rectangle() }, .m3ExpressiveLike)
    #expect(rendered == 32)
  }

  /// The icon is centered in the container and keeps its size; an icon taller than the container
  /// overflows it rather than growing it.
  @Test("the icon is centered vertically and drawn at its token size")
  func iconIsCentered() throws {
    var system = TanreiSystem.tanrei
    system.button.sizes.medium.iconSize = 24
    var theme = Snapshot.theme
    theme.system = system
    let colors = system.colors.light
    let bitmap = try Snapshot.render(
      TanreiButton("Deploy", action: {}) { Rectangle().fill(colors[.error]) }, theme: theme)
    let metrics = system.button.sizes.medium
    #expect(CGFloat(bitmap.height) == (metrics.containerHeight + 2 * Snapshot.inset) * Snapshot.scale)
    let x = Snapshot.inset + metrics.containerPaddingInlineStartWithIcon + metrics.iconSize / 2
    let midY = Snapshot.inset + metrics.containerHeight / 2
    let error = colors[.error].rgba8()
    #expect(pixel(bitmap, x: x, y: midY).isClose(to: error))
    #expect(pixel(bitmap, x: x, y: midY - 11.5).isClose(to: error) && pixel(bitmap, x: x, y: midY + 11.5).isClose(to: error))
    #expect(!pixel(bitmap, x: x, y: midY - 12.5).isClose(to: error) && !pixel(bitmap, x: x, y: midY + 12.5).isClose(to: error))
  }
}
