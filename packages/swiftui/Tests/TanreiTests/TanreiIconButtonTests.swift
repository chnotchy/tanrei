import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/icon-button.spec.json. Each behavior id (ICB-n) is named next to the test that covers it; the parity
// checker requires every id to appear in this file. ICB-1…10 are BTN-1…10 for this component: the primitives they rest
// on (press hold, ripple, contact point, focus ring, hit target, container layers) are tested once in
// TanreiButtonTests / TanreiPrimitivesTests; here each is proven to reach the icon button.
//
// Icons: Tanrei does not bundle the icon font, and baselines render with `Snapshot.theme` (`fontFamilyPolicy:
// .system`), under which a component's icon slot gets the platform font and a `TanreiIconGlyph` draws nothing (so a
// machine with Material Symbols installed records what CI renders). The fixtures' content "favorite" is therefore
// drawn with the SF Symbol a product would pass for it — `heart`, and `heart.fill` for a toggle that is on (a product
// using SF Symbols chooses the symbol of each state itself: `platform-symbol-sets`). The glyph path is tested apart,
// and against the real font where this machine has it.

private let suiteName = "TanreiIconButtonTests"

@MainActor
private final class Counter {
  var count = 0
}

/// A toggle's state, outside any view: what a `Binding` in a real app points at.
@MainActor
private final class Switch {
  var isOn: Bool
  var changes: [Bool] = []
  init(_ isOn: Bool) { self.isOn = isOn }

  var binding: Binding<Bool> {
    Binding(
      get: { MainActor.assumeIsolated { self.isOn } },
      set: { value in
        MainActor.assumeIsolated {
          self.isOn = value
          self.changes.append(value)
        }
      })
  }
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
private func chrome(
  _ variant: TanreiIconButtonVariant = .filled, size: TanreiIconButtonSize = .medium, look: TanreiIconButtonLook = .plain,
  isPressed: Bool = false, isFocused: Bool = false
) -> some View {
  TanreiIconButtonChrome(variant: variant, size: size, look: look, isPressed: isPressed, isFocused: isFocused) { Color.clear }
}

/// The chrome with a square icon: the whole icon box is drawn in the icon color.
@MainActor
private func boxChrome(_ variant: TanreiIconButtonVariant = .filled, size: TanreiIconButtonSize = .medium, look: TanreiIconButtonLook = .plain) -> some View {
  TanreiIconButtonChrome(variant: variant, size: size, look: look, isPressed: false, isFocused: false) { Rectangle() }
}

/// The center of the square of `size` in a render (the icon's center).
@MainActor
private func center(_ tokens: TanreiIconButtonTokens, _ size: TanreiIconButtonSize = .medium) -> CGPoint {
  let side = tokens.sizes[size].containerSize
  return CGPoint(x: Snapshot.inset + side / 2, y: Snapshot.inset + side / 2)
}

/// A point of the container outside the icon box: half-way between the box and the leading edge, mid-height.
@MainActor
private func containerPoint(_ tokens: TanreiIconButtonTokens, _ size: TanreiIconButtonSize = .medium) -> CGPoint {
  let metrics = tokens.sizes[size]
  return CGPoint(x: Snapshot.inset + (metrics.containerSize - metrics.iconSize) / 4, y: Snapshot.inset + metrics.containerSize / 2)
}

// MARK: - Activation (ICB-1, ICB-2, ICB-11, ICB-14)

@MainActor
@Suite("TanreiIconButton activation", .serialized)
struct TanreiIconButtonActivationTests {
  /// ICB-1 — one activation emits `action` exactly once.
  @Test("ICB-1 activation emits action exactly once")
  func activationEmitsOnce() {
    let counter = Counter()
    let button = TanreiIconButton("Favorite", icon: "favorite", action: { counter.count += 1 })
    button.activate(isEnabled: true)
    #expect(counter.count == 1)
    button.activate(isEnabled: true)
    #expect(counter.count == 2)
    #expect(button.look == .plain)
  }

  /// ICB-2 — a disabled icon button emits neither click nor change.
  @Test("ICB-2 disabled: no click, no change")
  func disabledDoesNotEmit() {
    let counter = Counter()
    let toggle = Switch(false)
    TanreiIconButton("Favorite", icon: "favorite", action: { counter.count += 1 }).activate(isEnabled: false)
    TanreiIconButton("Favorite", isSelected: toggle.binding, icon: "favorite", action: { counter.count += 1 }).activate(isEnabled: false)
    #expect(counter.count == 0)
    #expect(!toggle.isOn && toggle.changes.isEmpty)
  }

  /// ICB-11 — a toggle emits click and then change with the opposite of selected, once per activation, in that order.
  @Test("ICB-11 a toggle emits action (click) and then flips isSelected (change), once per activation, in that order")
  func toggleFlips() {
    let counter = Counter()
    let toggle = Switch(false)
    let off = TanreiIconButton("Favorite", isSelected: toggle.binding, icon: "favorite", action: { counter.count += 1 })
    #expect(off.look == .unselected)
    off.activate(isEnabled: true)
    #expect(toggle.isOn && toggle.changes == [true] && counter.count == 1)
    let on = TanreiIconButton("Favorite", isSelected: toggle.binding, icon: "favorite", action: { counter.count += 1 })
    #expect(on.look == .selected)
    on.activate(isEnabled: true)
    #expect(!toggle.isOn && toggle.changes == [true, false] && counter.count == 2)
    // Click comes first: the action still sees the old value, and the change follows it (72092ba).
    var seen: [Bool] = []
    TanreiIconButton("Favorite", isSelected: toggle.binding, action: { seen.append(toggle.isOn) }) { Image(systemName: "heart") }
      .activate(isEnabled: true)
    #expect(seen == [false])
    #expect(toggle.isOn && toggle.changes == [true, false, true])
  }

  /// ICB-11 — a toggle is exposed as a toggle, selected while on; an action exposes no pressed state.
  @Test("ICB-11 the selected trait only for a toggle that is on; the toggle trait only for a toggle")
  func traits() {
    #expect(TanreiIconButtonLook.plain.accessibilityTraits == [])
    #expect(TanreiIconButtonLook.unselected.accessibilityTraits == .isToggle)
    #expect(TanreiIconButtonLook.selected.accessibilityTraits == [.isToggle, .isSelected])
    #expect(!TanreiIconButtonLook.plain.accessibilityTraits.contains(.isSelected))
    #expect(!TanreiIconButtonLook.unselected.accessibilityTraits.contains(.isSelected))
    #expect(TanreiIconButtonLook(isToggle: false, isSelected: true) == .plain)  // `selected` is ignored unless toggle
    #expect(TanreiIconButtonLook(isToggle: true, isSelected: false) == .unselected)
    #expect(TanreiIconButtonLook(isToggle: true, isSelected: true) == .selected)
  }

  /// ICB-14 — an empty label is reported in debug builds, and the button still renders.
  @Test("ICB-14 an empty label is reported and the button still renders")
  func emptyLabel() throws {
    let toggle = Switch(false)
    let (_, reports) = Reports.collecting {
      _ = TanreiIconButton("", icon: "favorite", action: {})
      _ = TanreiIconButton(LocalizedStringKey(""), icon: "favorite", action: {})
      _ = TanreiIconButton("", isSelected: toggle.binding) { Image(systemName: "heart") }
    }
    #expect(reports.messages.count == 3)
    #expect(reports.mention("empty label") && reports.mention("accessible name"))

    let (_, silent) = Reports.collecting {
      _ = TanreiIconButton("Favorite", icon: "favorite", action: {})
      _ = TanreiIconButton(LocalizedStringKey("Favorite"), icon: "favorite", action: {})
    }
    #expect(silent.messages.isEmpty)

    let (bitmap, _) = try Reports.collecting { try Snapshot.render(TanreiIconButton("", variant: .filled, action: {}) { Image(systemName: "heart") }) }
    let side = TanreiSystem.tanrei.iconButton.sizes.medium.containerSize
    #expect(CGFloat(bitmap.width) == (side + 2 * Snapshot.inset) * Snapshot.scale)
    #expect(pixel(bitmap, x: containerPoint(TanreiSystem.tanrei.iconButton).x, y: containerPoint(TanreiSystem.tanrei.iconButton).y).isClose(to: TanreiSystem.tanrei.colors.light[.primary].rgba8()))
  }

  #if os(macOS)
  /// ICB-1 by pointer, ICB-2 by pointer: a real click in the middle of the button.
  @Test("ICB-1 ICB-2 pointer click emits once when enabled, never when disabled", arguments: [true, false])
  func pointerClick(isEnabled: Bool) {
    let counter = Counter()
    let hosted = HostedView(
      TanreiIconButton("Favorite", icon: "favorite", action: { counter.count += 1 })
        .disabled(!isEnabled)
        .padding(Snapshot.inset)
        .tanreiTheme(Snapshot.theme)
    )
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: hosted.size.height / 2))
    #expect(counter.count == (isEnabled ? 1 : 0))
  }

  /// ICB-11 by pointer: a click on a toggle flips it once and emits once; disabled, neither.
  @Test("ICB-11 ICB-2 a click on a toggle flips it once, never when disabled", arguments: [true, false])
  func pointerClickOnToggle(isEnabled: Bool) {
    let counter = Counter()
    let toggle = Switch(false)
    let hosted = HostedView(
      TanreiIconButton("Favorite", isSelected: toggle.binding, variant: .filled, action: { counter.count += 1 }) { Image(systemName: "heart") }
        .disabled(!isEnabled)
        .padding(Snapshot.inset)
        .tanreiTheme(Snapshot.theme)
    )
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: hosted.size.height / 2))
    #expect(toggle.changes == (isEnabled ? [true] : []))
    #expect(counter.count == (isEnabled ? 1 : 0))
  }

  /// ICB-5 end to end, on BOTH axes: a click outside the square but inside the minimum target activates it; beyond
  /// the target nothing happens.
  @Test("ICB-5 a click in the extended hit area activates the button, above and beside it")
  func extendedHitAreaClick() {
    let counter = Counter()
    let hosted = HostedView(
      TanreiIconButton("Favorite", icon: "favorite", size: .small, action: { counter.count += 1 })
        .padding(Snapshot.inset)
        .tanreiTheme(Snapshot.theme)
    )
    let system = Snapshot.theme.system
    let side = system.iconButton.sizes.small.containerSize
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

  /// ICB-5 — the target size is a value of the design system.
  @Test("ICB-5 a modified system drives the hit area")
  func modifiedSystemHitArea() {
    var custom = Snapshot.theme
    let side = custom.system.iconButton.sizes.small.containerSize
    let defaultOutset = (TanreiHitTarget.minimum(in: custom.system.measure) - side) / 2
    custom.system.measure.targetPointer = side
    custom.system.measure.targetTouch = side
    let counter = Counter()
    let hosted = HostedView(
      TanreiIconButton("Favorite", icon: "favorite", size: .small, action: { counter.count += 1 })
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

// MARK: - Token bindings (ICB-3, ICB-6, ICB-12)

// On the main actor: its tests read whole shipped systems, whose one-time initialization and copies need more
// stack than a cooperative thread has.
@MainActor
@Suite("TanreiIconButton token bindings")
struct TanreiIconButtonTokenBindingTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiIconButtonTokens { system.iconButton }

  struct Expected: Sendable {
    let container: TanreiColorRole?
    let icon: TanreiColorRole
    let outline: TanreiColorRole?
  }

  struct Case: Sendable, CustomTestStringConvertible {
    let variant: TanreiIconButtonVariant
    let look: TanreiIconButtonLook
    var testDescription: String { "\(variant.rawValue)/\(look)" }
  }

  /// The default system's values: plain, toggle off, toggle on.
  static let expected: [String: Expected] = [
    "standard/plain": Expected(container: nil, icon: .onSurfaceVariant, outline: nil),
    "standard/unselected": Expected(container: nil, icon: .onSurfaceVariant, outline: nil),
    "standard/selected": Expected(container: nil, icon: .onSurface, outline: nil),
    "filled/plain": Expected(container: .primary, icon: .onPrimary, outline: nil),
    "filled/unselected": Expected(container: .surfaceContainerHighest, icon: .onSurfaceVariant, outline: nil),
    "filled/selected": Expected(container: .primary, icon: .onPrimary, outline: nil),
    "tonal/plain": Expected(container: .secondaryContainer, icon: .onSecondaryContainer, outline: nil),
    "tonal/unselected": Expected(container: .surfaceContainerHighest, icon: .onSurfaceVariant, outline: nil),
    "tonal/selected": Expected(container: .secondary, icon: .onSecondary, outline: nil),
    "outlined/plain": Expected(container: nil, icon: .onSurfaceVariant, outline: .outline),
    "outlined/unselected": Expected(container: nil, icon: .onSurfaceVariant, outline: .outline),
    "outlined/selected": Expected(container: .inverseSurface, icon: .inverseOnSurface, outline: nil),
  ]

  nonisolated static let cases: [Case] = TanreiIconButtonVariant.core.flatMap { variant in TanreiIconButtonLook.allCases.map { Case(variant: variant, look: $0) } }

  private func paint(_ role: TanreiColorRole?) -> TanreiPaint { role.map { .role($0) } ?? TanreiPaint.none }

  private func appearance(_ item: Case, _ state: TanreiInteraction, tokens: TanreiIconButtonTokens? = nil) -> TanreiIconButtonAppearance {
    TanreiIconButtonAppearance(tokens: tokens ?? self.tokens, variant: item.variant, size: .medium, look: item.look, state: state)
  }

  /// The color hover, focus and press mix into the container of a look, at rest.
  private func stateLayer(_ item: Case) -> TanreiPaint {
    let rest = tokens.variants[item.variant].enabled
    switch item.look {
    case .plain: return rest.stateLayerColor
    case .unselected: return rest.unselectedStateLayerColor
    case .selected: return rest.selectedStateLayerColor
    }
  }

  /// ICB-12 — at rest each variant draws its own parts for an action, and the `unselected.` / `selected.` parts for a
  /// toggle that is off / on.
  @Test("ICB-12 at rest each variant and look binds the expected color roles", arguments: cases)
  func roles(item: Case) throws {
    let expected = try #require(Self.expected[item.testDescription])
    let rest = appearance(item, .enabled)
    #expect(rest.container == paint(expected.container))
    #expect(rest.icon == paint(expected.icon))
    #expect(rest.outline == paint(expected.outline))
    #expect(rest.opacity == 1)
    #expect(rest.cornerRadius == tokens.containerShape)
    #expect(rest.ripple == nil)
    // Each look's state-layer color aliases its icon color.
    #expect(stateLayer(item) == rest.icon)
  }

  /// ICB-12 — the three looks are really three sets of tokens: a toggle that is off is quieter than one that is on
  /// (a different container or icon), and change only when their own tokens change.
  @Test("ICB-12 a modified system changes exactly the look whose tokens changed")
  func looksAreSeparate() {
    let filled = Case(variant: .filled, look: .plain)
    let off = Case(variant: .filled, look: .unselected)
    let on = Case(variant: .filled, look: .selected)
    #expect(appearance(off, .enabled).container != appearance(on, .enabled).container)
    var custom = tokens
    custom.variants.filled.enabled.selectedContainerColor = .role(.error)
    custom.variants.filled.enabled.unselectedIconColor = .role(.warning)
    custom.variants.filled.enabled.outlineColor = .role(.success)
    #expect(appearance(on, .enabled, tokens: custom).container == .role(.error))
    #expect(appearance(off, .enabled, tokens: custom).icon == .role(.warning))
    #expect(appearance(filled, .enabled, tokens: custom).outline == .role(.success))
    // Nothing else moved.
    #expect(appearance(on, .enabled, tokens: custom).icon == appearance(on, .enabled).icon)
    #expect(appearance(off, .enabled, tokens: custom).container == appearance(off, .enabled).container)
    #expect(appearance(filled, .enabled, tokens: custom).container == appearance(filled, .enabled).container)
    #expect(appearance(on, .enabled, tokens: custom).outline == appearance(on, .enabled).outline)
  }

  @Test("paints resolve to the generated colors in light and dark", arguments: cases)
  func colorsInLightAndDark(item: Case) throws {
    let expected = try #require(Self.expected[item.testDescription])
    let rest = appearance(item, .enabled)
    for (themeAppearance, scheme) in [(TanreiAppearance.light, system.colors.light), (.dark, system.colors.dark)] {
      let colors = TanreiTheme(appearance: themeAppearance, contrast: .standard).colors(systemScheme: .light, systemContrast: .standard)
      #expect(colors == scheme)
      #expect(rest.icon.resolve(in: colors) == scheme.value(expected.icon))
      #expect(rest.container.resolve(in: colors) == expected.container.map { scheme.value($0) } ?? .clear)
    }
  }

  /// Each size binds its square, icon box and outline width.
  @Test("each size binds its container size, icon size and outline width")
  func sizes() {
    for size in TanreiIconButtonSize.core {
      let rest = TanreiIconButtonAppearance(tokens: tokens, variant: .outlined, size: size, state: .enabled)
      #expect(rest.containerSize == tokens.sizes[size].containerSize)
      #expect(rest.iconSize == tokens.sizes[size].iconSize)
      #expect(rest.outlineWidth == tokens.sizes[size].outlineWidth)
    }
    // The tokens: the squares match Button's heights (32 / 36 / 40), the icons are sys.icon.small / medium / large.
    let sizes = tokens.sizes
    #expect([sizes.small, sizes.medium, sizes.large].map(\.containerSize) == [32, 36, 40])
    #expect([sizes.small, sizes.medium, sizes.large].map(\.containerSize) == [system.button.sizes.small, system.button.sizes.medium, system.button.sizes.large].map(\.containerHeight))
    #expect([sizes.small, sizes.medium, sizes.large].map(\.iconSize) == [system.measure.iconSmall, system.measure.iconMedium, system.measure.iconLarge])
    #expect([sizes.small, sizes.medium, sizes.large].map(\.outlineWidth) == [1, 1, 1].map { _ in system.measure.borderHairline })
    // Each size reads its own values.
    var custom = tokens
    custom.sizes.large.containerSize = 64
    custom.sizes.large.iconSize = 30
    custom.sizes.large.outlineWidth = 3
    let large = TanreiIconButtonAppearance(tokens: custom, variant: .outlined, size: .large, state: .enabled)
    let medium = TanreiIconButtonAppearance(tokens: custom, variant: .outlined, size: .medium, state: .enabled)
    #expect(large.containerSize == 64 && large.iconSize == 30 && large.outlineWidth == 3)
    #expect(medium.containerSize == 36 && medium.iconSize == 20 && medium.outlineWidth == 1)
  }

  /// ICB-3 — every state reads that state's tokens, for every variant and look. In the default system a state is the
  /// look's state-layer color mixed into its container: a VALUE of this system, not something the component does.
  @Test("ICB-3 each state binds that state's tokens", arguments: cases)
  func stateBindings(item: Case) {
    let rest = appearance(item, .enabled)
    let amounts: [(TanreiInteraction, Double)] = [
      (.hovered, system.state.hoverStateLayerOpacity), (.focused, system.state.focusStateLayerOpacity), (.pressed, system.state.pressedStateLayerOpacity),
    ]
    for (state, amount) in amounts {
      let drawn = appearance(item, state)
      #expect(drawn.container == .mix(base: rest.container, with: stateLayer(item), amount: amount), "\(item.testDescription) \(state)")
      #expect(drawn.icon == rest.icon && drawn.outline == rest.outline)
      #expect(drawn.opacity == 1 && drawn.cornerRadius == tokens.containerShape)
      #expect(drawn.iconSelected == (item.look == .selected))
    }
  }

  /// ICB-6 — disabled draws from the disabled tokens of its variant and, for a toggle, of its selection. The values
  /// are the default system's: content fades to on-surface at the disabled content opacity; a part that is drawn at
  /// rest (a fill, an outline) becomes on-surface at the disabled container opacity, and a part that is not drawn at
  /// rest stays undrawn.
  @Test("ICB-6 disabled bindings", arguments: cases)
  func disabled(item: Case) {
    let rest = appearance(item, .enabled)
    let drawn = appearance(item, .disabled)
    let faded = TanreiPaint.alpha(of: .role(.onSurface), amount: system.state.disabledContainerOpacity)
    let variantTokens = tokens.variants[item.variant].disabled
    #expect(drawn.icon == .alpha(of: .role(.onSurface), amount: system.state.disabledContentOpacity))
    #expect(drawn.container == (rest.container == .none ? .none : faded), "\(item.testDescription)")
    #expect(drawn.outline == (rest.outline == .none ? .none : faded), "\(item.testDescription)")
    #expect(drawn.container == variantTokens.parts(item.look).container && drawn.outline == variantTokens.parts(item.look).outline)
    #expect(drawn.opacity == tokens.disabled.opacity)
    #expect(drawn.cornerRadius == tokens.disabled.containerShape)
  }

  /// ICB-3 ICB-6 — the values drive the result: change one token of one state and exactly that state changes.
  @Test("ICB-3 ICB-6 a modified system changes what each state resolves to")
  func modifiedSystem() {
    var custom = tokens
    custom.variants.filled.hovered.containerColor = .role(.error)
    custom.variants.filled.focused.iconColor = .role(.warning)
    custom.variants.filled.pressed.selectedOutlineColor = .role(.success)
    custom.pressed.containerShape = 2
    custom.pressed.opacity = 0.4
    custom.disabled.opacity = 0.5
    custom.variants.filled.disabled.unselectedContainerColor = .role(.surfaceDim)
    let plain = Case(variant: .filled, look: .plain)
    #expect(appearance(plain, .hovered, tokens: custom).container == .role(.error))
    #expect(appearance(plain, .focused, tokens: custom).icon == .role(.warning))
    #expect(appearance(Case(variant: .filled, look: .selected), .pressed, tokens: custom).outline == .role(.success))
    #expect(appearance(plain, .pressed, tokens: custom).cornerRadius == 2)
    #expect(appearance(plain, .pressed, tokens: custom).opacity == 0.4)
    #expect(appearance(plain, .disabled, tokens: custom).opacity == 0.5)
    #expect(appearance(Case(variant: .filled, look: .unselected), .disabled, tokens: custom).container == .role(.surfaceDim))
    // Nothing else moved: the other states of filled, and the same state of another variant.
    #expect(appearance(plain, .enabled, tokens: custom) == appearance(plain, .enabled))
    #expect(appearance(plain, .hovered, tokens: custom).cornerRadius == tokens.hovered.containerShape)
    #expect(appearance(Case(variant: .tonal, look: .plain), .hovered, tokens: custom) == appearance(Case(variant: .tonal, look: .plain), .hovered))
  }

  /// The generated lookups: one exhaustive switch per group,
  /// emitted from the IR. Every state reads its own named group; the shared values have none at rest.
  @Test("the generated state lookups read each state's own group")
  func generatedLookups() {
    for variant in TanreiIconButtonVariant.core {
      let v = tokens.variants[variant]
      #expect(v[state: .enabled] == v.enabled && v[state: .hovered] == v.hovered && v[state: .focused] == v.focused)
      #expect(v[state: .pressed] == v.pressed && v[state: .disabled] == v.disabled)
    }
    #expect(tokens[state: .enabled] == nil)
    #expect(tokens[state: .hovered] == tokens.hovered && tokens[state: .focused] == tokens.focused)
    #expect(tokens[state: .pressed] == tokens.pressed && tokens[state: .disabled] == tokens.disabled)
    // Button reads through the same generated lookups.
    let button = system.button
    #expect(button[state: .enabled] == nil && button[state: .pressed] == button.pressed)
    #expect(button.variants.text[state: .focused] == button.variants.text.focused)
    // Distinct groups are really told apart (a swapped case would fail here).
    var custom = tokens
    custom.variants.standard.focused.iconColor = .role(.error)
    custom.pressed.opacity = 0.25
    #expect(custom.variants.standard[state: .focused].iconColor == .role(.error))
    #expect(custom.variants.standard[state: .hovered].iconColor != .role(.error))
    #expect(custom[state: .pressed]?.opacity == 0.25 && custom[state: .hovered]?.opacity != 0.25)
  }
}

// MARK: - Open axes (ICB-7)

@MainActor
@Suite("TanreiIconButton open size and variant")
struct TanreiIconButtonOpenAxisTests {
  let tokens = TanreiSystem.tanrei.iconButton
  let unknownSize = TanreiIconButtonSize(rawValue: "colossal")
  let unknownVariant = TanreiIconButtonVariant(rawValue: "sparkly")

  @Test("the axes are the spec's: standard/filled/tonal/outlined, small/medium/large; defaults standard and medium")
  func axes() {
    #expect(TanreiIconButtonVariant.core == [.standard, .filled, .tonal, .outlined] && TanreiIconButtonVariant.fallback == .standard)
    #expect(TanreiIconButtonSize.core == [.small, .medium, .large] && TanreiIconButtonSize.fallback == .medium)
    #expect(tokens.sizes.extra.isEmpty && tokens.variants.extra.isEmpty)
    #expect(tokens.sizes[.small] == tokens.sizes.small && tokens.variants[.outlined] == tokens.variants.outlined)
  }

  /// ICB-7 — a size or variant the design system does not have draws the default value's tokens in every state and
  /// look, and the unknown value is reported (debug builds only).
  @Test("ICB-7 an unknown size and an unknown variant bind the default value's tokens", arguments: TanreiInteraction.allCases)
  func unknownValuesBindTheDefault(state: TanreiInteraction) {
    for look in TanreiIconButtonLook.allCases {
      let (appearance, reports) = Reports.collecting {
        TanreiIconButtonAppearance(tokens: tokens, variant: unknownVariant, size: unknownSize, look: look, state: state)
      }
      #expect(appearance == TanreiIconButtonAppearance(tokens: tokens, variant: .standard, size: .medium, look: look, state: state))
      #expect(reports.mention("icon-button size \"colossal\"") && reports.mention("icon-button variant \"sparkly\""))
    }
  }

  @Test("ICB-7 known values are not reported")
  func knownValuesAreSilent() {
    let (_, reports) = Reports.collecting {
      for variant in TanreiIconButtonVariant.core {
        for size in TanreiIconButtonSize.core { _ = TanreiIconButtonAppearance(tokens: tokens, variant: variant, size: size, look: .selected, state: .enabled) }
      }
    }
    #expect(reports.messages.isEmpty)
  }

  /// ICB-7 — rendered: pixel-identical to the default, disabled and as a toggle too (`renderExact`, bit-stable).
  @Test("ICB-7 an unknown size and variant render exactly like the default")
  func unknownValuesRenderTheDefault() throws {
    func button(_ variant: TanreiIconButtonVariant, _ size: TanreiIconButtonSize) -> some View {
      TanreiIconButton("Favorite", variant: variant, size: size, action: {}) { Image(systemName: "heart") }
    }
    let expected = try Snapshot.renderExact(button(.standard, .medium))
    let (actual, reports) = try Reports.collecting { try Snapshot.renderExact(button(unknownVariant, unknownSize)) }
    #expect(actual.width == expected.width && actual.height == expected.height)
    #expect(actual.mismatch(against: expected, channelTolerance: 0) == 0)
    #expect(reports.mention("colossal") && reports.mention("sparkly"))

    let toggle = Switch(true)
    func on(_ variant: TanreiIconButtonVariant, _ size: TanreiIconButtonSize) -> some View {
      TanreiIconButton("Favorite", isSelected: toggle.binding, variant: variant, size: size) { Image(systemName: "heart.fill") }.disabled(true)
    }
    let expectedOn = try Snapshot.renderExact(on(.standard, .medium))
    let (actualOn, _) = try Reports.collecting { try Snapshot.renderExact(on(unknownVariant, unknownSize)) }
    #expect(actualOn.mismatch(against: expectedOn, channelTolerance: 0) == 0)
  }

  /// ICB-7 — the fallback is the DEFAULT value of the axis in the current system, whatever it holds; a value a system
  /// adds is read from `extra`, not the fallback.
  @Test("ICB-7 the fallback follows the system's default value; an added value is used")
  func fallbackAndAddedValues() {
    var custom = tokens
    custom.sizes.medium.containerSize = 99
    custom.variants.standard.enabled.selectedIconColor = .role(.success)
    let (fallback, _) = Reports.collecting {
      TanreiIconButtonAppearance(tokens: custom, variant: unknownVariant, size: unknownSize, look: .selected, state: .enabled)
    }
    #expect(fallback.containerSize == 99 && fallback.icon == .role(.success))

    var huge = tokens.sizes.large
    huge.containerSize = 56
    custom.sizes.extra[unknownSize] = huge
    var sparkly = tokens.variants.filled
    sparkly.pressed.selectedContainerColor = .role(.warning)
    custom.variants.extra[unknownVariant] = sparkly
    let (added, reports) = Reports.collecting {
      TanreiIconButtonAppearance(tokens: custom, variant: unknownVariant, size: unknownSize, look: .selected, state: .pressed)
    }
    #expect(added.containerSize == 56 && added.container == .role(.warning))
    #expect(reports.messages.isEmpty)
  }
}

// MARK: - Icon (ICB-13)

@MainActor
@Suite("TanreiIconButton icon")
struct TanreiIconButtonIconTests {
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

  /// ICB-13 — the icon box is the size's icon size; the family and fill are the selected state's only when toggle
  /// and selected are both true.
  @Test("ICB-13 the icon box is the size's icon size; selected only for a toggle that is on", arguments: TanreiIconButtonSize.core)
  func iconSizeAndSelection(size: TanreiIconButtonSize) {
    let tokens = system.iconButton
    for look in TanreiIconButtonLook.allCases {
      let appearance = TanreiIconButtonAppearance(tokens: tokens, variant: .standard, size: size, look: look, state: .enabled)
      #expect(appearance.iconSize == tokens.sizes[size].iconSize)
      #expect(appearance.iconSelected == (look == .selected))
    }
  }

  /// ICB-13 — the slot is handed exactly that context: the box of the size, and the selection of the look.
  @Test("ICB-13 the icon slot is handed the icon size and the selection of its look")
  func slotContext() throws {
    let tokens = system.iconButton
    for size in TanreiIconButtonSize.core {
      for look in TanreiIconButtonLook.allCases {
        let probe = Probe()
        _ = try Snapshot.render(TanreiIconButtonChrome(variant: .tonal, size: size, look: look, isPressed: false, isFocused: false) { ProbeView(probe: probe) })
        #expect(probe.context == TanreiIconContext(size: tokens.sizes[size].iconSize, selected: look == .selected), "\(size) \(look)")
      }
    }
    // Through the public initializers too: a toggle that is on hands down `selected`, an action never does.
    let probe = Probe()
    let on = Switch(true)
    _ = try Snapshot.render(TanreiIconButton("Favorite", isSelected: on.binding, size: .large) { ProbeView(probe: probe) })
    #expect(probe.context == TanreiIconContext(size: tokens.sizes.large.iconSize, selected: true))
    _ = try Snapshot.render(TanreiIconButton("Favorite", size: .small, action: {}) { ProbeView(probe: probe) })
    #expect(probe.context == TanreiIconContext(size: tokens.sizes.small.iconSize, selected: false))
  }

  /// ICB-13 — what the icon font is drawn with, per size and selection: the family and fill of the state,
  /// sys.icon.weight, and `opsz` = the box clamped to sys.icon.optical-size.min…max (16 → 20 in the default system).
  @Test("ICB-13 family, fill, weight and optical size clamped to the tokens")
  func drawing() {
    let icon = system.icon
    let tokens = system.iconButton
    let small = icon.drawing(size: tokens.sizes.small.iconSize, selected: false)
    #expect(small.family == icon.families.unselected && small.axes.fill == icon.fillUnselected && small.axes.weight == Double(icon.weight))
    #expect(small.axes.opticalSize == Double(icon.opticalSizeMin))  // 16 is below the font's range: clamped up
    #expect(tokens.sizes.small.iconSize < icon.opticalSizeMin)
    let large = icon.drawing(size: tokens.sizes.large.iconSize, selected: true)
    #expect(large.family == icon.families.selected && large.axes.fill == icon.fillSelected)
    #expect(large.axes.opticalSize == Double(tokens.sizes.large.iconSize))
    // A modified system drives it: a static set (two families) and another optical range.
    var custom = system
    custom.icon.families.selected = TanreiFontStack(families: ["Helvetica Neue"], generic: .sansSerif, system: false)
    custom.icon.opticalSizeMin = 8
    custom.icon.opticalSizeMax = 18
    #expect(custom.icon.drawing(size: tokens.sizes.large.iconSize, selected: true).family.families == ["Helvetica Neue"])
    #expect(custom.icon.drawing(size: tokens.sizes.large.iconSize, selected: true).axes.opticalSize == 18)
    #expect(custom.icon.drawing(size: tokens.sizes.small.iconSize, selected: false).axes.opticalSize == 16)
  }

  /// ICB-13 — the slot font: the icon font of the context only when the theme uses named families and one is
  /// registered; the platform font at the box size otherwise (and then a glyph draws nothing).
  @Test("ICB-13 the slot font follows the family policy and what is installed")
  func slotFont() {
    let context = TanreiIconContext(size: 24, selected: true)
    #expect(system.icon.slotFont(context, policy: .system) == nil)
    var missing = system.icon
    missing.families.selected.families = ["No Such Icon Family 0"]
    #expect(missing.slotFont(context, policy: .tokens) == nil)
    #expect((system.icon.slotFont(context, policy: .tokens) != nil) == (system.icon.installedFamily(selected: true) != nil))
  }

  /// Without the icon font (or under the platform-font policy of the baselines) a glyph draws nothing — never the
  /// glyph's name in a text font — and the button is still its square.
  @Test("ICB-13 a glyph without the icon font draws nothing")
  func glyphWithoutFont() throws {
    let empty = try Snapshot.renderExact(TanreiIconButton("Favorite", variant: .filled, action: {}) { Color.clear })
    let glyph = try Snapshot.renderExact(TanreiIconButton("Favorite", icon: "favorite", variant: .filled, action: {}))
    #expect(glyph.mismatch(against: empty, channelTolerance: 0) == 0)
    var custom = system
    custom.icon.families.unselected.families = ["No Such Icon Family 0"]
    let missing = try Snapshot.renderExact(TanreiIconButton("Favorite", icon: "favorite", variant: .filled, action: {}), theme: theme(custom, policy: .tokens))
    let missingEmpty = try Snapshot.renderExact(TanreiIconButton("Favorite", variant: .filled, action: {}) { Color.clear }, theme: theme(custom, policy: .tokens))
    #expect(missing.mismatch(against: missingEmpty, channelTolerance: 0) == 0)
  }

  /// With the icon font registered (this machine may have Material Symbols; CI does not), the glyph is drawn in the
  /// icon color, inside the icon box, and the selected state draws it differently (FILL 1).
  @Test("ICB-13 with the icon font installed, the glyph is drawn filled only when selected")
  func glyphWithFont() throws {
    guard system.icon.installedFamily(selected: false) != nil, system.icon.installedFamily(selected: true) != nil else { return }
    let tokens = system.iconButton
    let colors = system.colors.light
    let off = Switch(false)
    let on = Switch(true)
    let unselected = try Snapshot.render(TanreiIconButton("Favorite", isSelected: off.binding, icon: "favorite", size: .large), theme: theme(system, policy: .tokens))
    let selected = try Snapshot.render(TanreiIconButton("Favorite", isSelected: on.binding, icon: "favorite", size: .large), theme: theme(system, policy: .tokens))
    let blank = try Snapshot.render(TanreiIconButton("Favorite", isSelected: off.binding, size: .large) { Color.clear }, theme: theme(system, policy: .tokens))
    #expect(unselected.mismatch(against: blank, channelTolerance: Snapshot.channelTolerance) > 0)
    #expect(selected.mismatch(against: unselected, channelTolerance: Snapshot.channelTolerance) > 0)
    // Glyph pixels only inside the icon box.
    let side = tokens.sizes.large.containerSize
    let box = tokens.sizes.large.iconSize
    let margin = (side - box) / 2
    let iconColor = colors[tokens.variants.standard.enabled.selectedIconColor].rgba8()
    var inside = 0
    var outside = 0
    for y in 0..<selected.height {
      for x in 0..<selected.width where selected[x, y].isClose(to: iconColor, tolerance: 8) {
        let px = CGFloat(x) / Snapshot.scale - Snapshot.inset
        let py = CGFloat(y) / Snapshot.scale - Snapshot.inset
        if px >= margin - 1 && px <= side - margin + 1 && py >= margin - 1 && py <= side - margin + 1 { inside += 1 } else { outside += 1 }
      }
    }
    #expect(inside > 0 && outside == 0)
  }

  /// "Text size does not change the icon's box: an icon is not text" (spec, accessibility notes).
  @Test("the square and the icon box do not grow with Dynamic Type")
  func noDynamicType() throws {
    func render(_ size: DynamicTypeSize) throws -> Bitmap {
      try Snapshot.renderExact(TanreiIconButton("Favorite", variant: .filled, action: {}) { Rectangle() }.environment(\.dynamicTypeSize, size))
    }
    let regular = try render(.large)
    let huge = try render(.accessibility5)
    #expect(huge.width == regular.width && huge.height == regular.height)
    #expect(huge.mismatch(against: regular, channelTolerance: 0) == 0)
  }
}

// MARK: - Rendered states (ICB-3, ICB-4, ICB-6, ICB-10, ICB-12)

@MainActor
@Suite("TanreiIconButton rendered states")
struct TanreiIconButtonRenderedStateTests {
  let system = TanreiSystem.tanrei
  let colors = TanreiSystem.tanrei.colors.light
  let inset = Snapshot.inset
  var tokens: TanreiIconButtonTokens { system.iconButton }

  /// The render is the square plus the inset, at every size: the icon never grows it (ICB-5: nor does the hit area).
  @Test("ICB-5 the rendered size is the square of each size", arguments: TanreiIconButtonSize.core)
  func square(size: TanreiIconButtonSize) throws {
    let bitmap = try Snapshot.render(TanreiIconButton("Favorite", size: size, action: {}) { Rectangle().frame(width: 200, height: 200) })
    let side = (tokens.sizes[size].containerSize + 2 * inset) * Snapshot.scale
    #expect(CGFloat(bitmap.width) == side && CGFloat(bitmap.height) == side)
  }

  /// ICB-3 — pressed and focused containers are the state's container paint.
  @Test("ICB-3 pressed and focused render the state's container color")
  func stateContainer() throws {
    let point = containerPoint(tokens)
    let rest = try Snapshot.render(chrome())
    #expect(pixel(rest, x: point.x, y: point.y).isClose(to: colors[.primary].rgba8()))
    let pressed = try Snapshot.render(chrome(isPressed: true))
    #expect(pixel(pressed, x: point.x, y: point.y).isClose(to: colors[.onPrimary].opacity(system.state.pressedStateLayerOpacity).rgba8(over: colors[.primary])))
    #expect(pixel(pressed, x: point.x, y: point.y).isClose(to: colors[tokens.variants.filled.pressed.containerColor].rgba8()))
    let focused = try Snapshot.render(chrome(isFocused: true))
    #expect(pixel(focused, x: point.x, y: point.y).isClose(to: colors[.onPrimary].opacity(system.state.focusStateLayerOpacity).rgba8(over: colors[.primary])))
  }

  /// ICB-3 — rendering follows the values, with precedence pressed > focused, for each look.
  @Test("ICB-3 ICB-12 a modified system drives the rendered state of each look")
  func modifiedSystemRenders() throws {
    var custom = system
    custom.iconButton.variants.filled.pressed.selectedContainerColor = .role(.error)
    custom.iconButton.variants.filled.focused.selectedContainerColor = .role(.success)
    custom.iconButton.variants.filled.pressed.unselectedContainerColor = .role(.warning)
    let point = containerPoint(tokens)
    let pressedOn = try Snapshot.render(chrome(look: .selected, isPressed: true, isFocused: true), theme: theme(custom))
    #expect(pixel(pressedOn, x: point.x, y: point.y).isClose(to: colors[.error].rgba8()))
    let focusedOn = try Snapshot.render(chrome(look: .selected, isFocused: true), theme: theme(custom))
    #expect(pixel(focusedOn, x: point.x, y: point.y).isClose(to: colors[.success].rgba8()))
    let pressedOff = try Snapshot.render(chrome(look: .unselected, isPressed: true), theme: theme(custom))
    #expect(pixel(pressedOff, x: point.x, y: point.y).isClose(to: colors[.warning].rgba8()))
    // The plain look did not move.
    let plain = try Snapshot.renderExact(chrome(isPressed: true), theme: theme(custom))
    #expect(plain.mismatch(against: try Snapshot.renderExact(chrome(isPressed: true)), channelTolerance: 0) == 0)

    // Opacity: the whole control is dimmed by the state's opacity token; shape: the pressed radius.
    custom.iconButton.pressed.opacity = 0.4
    let dimmed = try Snapshot.render(chrome(look: .selected, isPressed: true), theme: theme(custom))
    #expect(pixel(dimmed, x: point.x, y: point.y).isClose(to: colors[.error].opacity(0.4).rgba8(over: colors[.surface])))
    custom.iconButton.pressed.opacity = 1
    custom.iconButton.pressed.containerShape = 0
    let corner = inset + 0.75
    #expect(pixel(pressedOn, x: corner, y: corner).isClose(to: colors[.surface].rgba8()))
    let square = try Snapshot.render(chrome(look: .selected, isPressed: true), theme: theme(custom))
    #expect(pixel(square, x: corner, y: corner).isClose(to: colors[.error].rgba8()))
  }

  /// ICB-12, rendered: a filled toggle is surface-container-highest while off and primary while on; the icon is
  /// drawn in the look's icon color across the icon box.
  @Test("ICB-12 ICB-13 a filled toggle renders its unselected and selected parts; the icon fills its box in the icon color")
  func looksRendered() throws {
    let point = containerPoint(tokens)
    let middle = center(tokens)
    let half = tokens.sizes.medium.iconSize / 2
    let off = try Snapshot.render(boxChrome(look: .unselected))
    let on = try Snapshot.render(boxChrome(look: .selected))
    #expect(pixel(off, x: point.x, y: point.y).isClose(to: colors[.surfaceContainerHighest].rgba8()))
    #expect(pixel(off, x: middle.x, y: middle.y).isClose(to: colors[.onSurfaceVariant].rgba8()))
    #expect(pixel(on, x: point.x, y: point.y).isClose(to: colors[.primary].rgba8()))
    #expect(pixel(on, x: middle.x, y: middle.y).isClose(to: colors[.onPrimary].rgba8()))
    // The box: icon color half a point inside its edge, container color half a point outside.
    #expect(pixel(on, x: middle.x - half + 0.5, y: middle.y).isClose(to: colors[.onPrimary].rgba8()))
    #expect(pixel(on, x: middle.x - half - 0.5, y: middle.y).isClose(to: colors[.primary].rgba8()))
    #expect(pixel(on, x: middle.x, y: middle.y + half - 0.5).isClose(to: colors[.onPrimary].rgba8()))
    #expect(pixel(on, x: middle.x, y: middle.y + half + 0.5).isClose(to: colors[.primary].rgba8()))
    // The outlined toggle drops its outline when on and fills with inverse-surface.
    let outlinedOn = try Snapshot.render(chrome(.outlined, look: .selected))
    let outlinedOff = try Snapshot.render(chrome(.outlined, look: .unselected))
    let edge = inset + tokens.sizes.medium.outlineWidth / 2
    #expect(pixel(outlinedOff, x: edge, y: middle.y).isClose(to: colors[.outline].rgba8()))
    #expect(pixel(outlinedOn, x: edge, y: middle.y).isClose(to: colors[.inverseSurface].rgba8()))
  }

  /// The outline is `outlineWidth` points of the outline color, per size.
  @Test("a modified system drives the per-size outline width")
  func outlineWidth() throws {
    var custom = system
    let width = tokens.sizes.medium.outlineWidth
    custom.iconButton.sizes.medium.outlineWidth = width * 4
    custom.iconButton.variants.outlined.enabled.outlineColor = .role(.error)
    var thin = system
    thin.iconButton.variants.outlined.enabled.outlineColor = .role(.error)
    let midY = center(tokens).y
    let probe = inset + width * 2.5
    #expect(pixel(try Snapshot.render(chrome(.outlined), theme: theme(custom)), x: probe, y: midY).isClose(to: colors[.error].rgba8()))
    #expect(!pixel(try Snapshot.render(chrome(.outlined), theme: theme(thin)), x: probe, y: midY).isClose(to: colors[.error].rgba8()))
    #expect(pixel(try Snapshot.render(chrome(.outlined), theme: theme(thin)), x: inset + width / 2, y: midY).isClose(to: colors[.error].rgba8()))
  }

  /// ICB-4 — offset, then the outer stroke in the focusRing role, concentric with the square; absent without focus
  /// and when disabled; outside the layout.
  @Test("ICB-4 the focus indicator is an offset then a ring in the focusRing color")
  func focusRing() throws {
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.focused.containerShape, measure: system.measure)
    let midY = center(tokens).y
    let ringX = inset - metrics.outerCenterlineOutset
    let gapX = inset - metrics.offset / 2
    let focused = try Snapshot.render(chrome(isFocused: true))
    #expect(pixel(focused, x: ringX, y: midY).isClose(to: colors[.focusRing].rgba8()))
    #expect(pixel(focused, x: gapX, y: midY).isClose(to: colors[.surface].rgba8()))
    let rest = try Snapshot.render(chrome())
    #expect(pixel(rest, x: ringX, y: midY).isClose(to: colors[.surface].rgba8()))
    #expect(focused.width == rest.width && focused.height == rest.height)
    let focusedDisabled = try Snapshot.render(chrome(isFocused: true).disabled(true))
    #expect(focusedDisabled.mismatch(against: try Snapshot.render(chrome().disabled(true)), channelTolerance: Snapshot.channelTolerance) == 0)
  }

  /// ICB-4 — the focus ring and the state change respect Reduce Motion: no animation tokens reach the ring.
  @Test("ICB-4 no animation under Reduce Motion")
  func reduceMotion() {
    #expect(TanreiMotion.animation(durationMs: tokens.motionStateDuration, easing: tokens.motionStateEasing, reduceMotion: true) == nil)
    #expect(tokens.rippleGrowth(reduceMotion: true) == nil)
    #expect(tokens.rippleGrowth(reduceMotion: false) != nil)
  }

  /// ICB-6 — rendered: the disabled tokens of the variant and of the selection.
  @Test("ICB-6 disabled renders from the disabled tokens")
  func disabledRender() throws {
    let point = containerPoint(tokens)
    let disabled = try Snapshot.render(chrome(look: .selected).disabled(true))
    #expect(pixel(disabled, x: point.x, y: point.y).isClose(to: colors[tokens.variants.filled.disabled.selectedContainerColor].rgba8(over: colors[.surface])))
    var custom = system
    custom.iconButton.variants.filled.disabled.selectedContainerColor = .role(.primary)
    custom.iconButton.disabled.opacity = 0.5
    let dimmed = try Snapshot.render(chrome(look: .selected).disabled(true), theme: theme(custom))
    #expect(pixel(dimmed, x: point.x, y: point.y).isClose(to: colors[.primary].opacity(0.5).rgba8(over: colors[.surface])))
  }

  /// ICB-10 — corners follow `sys.shape.corner-smoothing` (every amount above 0 is the OS's continuous curve) and
  /// focus follows `sys.behavior.focus-style`.
  @Test("ICB-10 corner smoothing and focus style reach the icon button")
  func cornersAndFocusStyle() throws {
    func render(_ amount: Double, focused: Bool = false, style: TanreiFocusStyle = .ring) throws -> Bitmap {
      var custom = TanreiSystem.cupertino
      custom.shape.cornerSmoothing = amount
      custom.iconButton.containerShape = custom.shape.medium
      custom.iconButton.focused.containerShape = custom.shape.medium
      custom.behavior.focusStyle = style
      return try Snapshot.renderExact(chrome(isFocused: focused), theme: theme(custom))
    }
    let continuous = try render(0.6)
    #expect(try render(0).mismatch(against: continuous, channelTolerance: 0) > 0)
    #expect(try render(0.3).mismatch(against: continuous, channelTolerance: 0) == 0)
    #expect(try render(1).mismatch(against: continuous, channelTolerance: 0) == 0)
    #expect(try render(0.6, focused: true, style: .glow).mismatch(against: try render(0.6, focused: true, style: .ring), channelTolerance: 0) > 0)
  }
}

// MARK: - ICB-8, ICB-9

@MainActor
@Suite("TanreiIconButton press", .serialized)
struct TanreiIconButtonPressTests {
  /// A system whose pressed tokens differ from rest in every part, so each choice is told apart.
  private func distinct(_ feedback: TanreiPressedFeedback) -> TanreiSystem {
    var system = TanreiSystem.tanrei
    system.behavior.pressedFeedback = feedback
    system.iconButton.variants.filled.pressed.selectedContainerColor = .role(.error)
    system.iconButton.variants.filled.pressed.selectedIconColor = .role(.warning)
    system.iconButton.variants.filled.pressed.selectedOutlineColor = .role(.success)
    system.iconButton.variants.filled.focused.selectedContainerColor = .role(.success)
    system.iconButton.pressed.opacity = 0.5
    return system
  }

  /// ICB-9 — which tokens a press reads under each choice, for the look drawn.
  @Test("ICB-9 each choice binds the pressed tokens of the look its own way", arguments: TanreiPressedFeedback.allCases)
  func bindings(feedback: TanreiPressedFeedback) {
    let tokens = distinct(feedback).iconButton
    let filled = tokens.variants.filled
    for beneath in [TanreiInteraction.enabled, .hovered, .focused] {
      let appearance = TanreiIconButtonAppearance(tokens: tokens, variant: .filled, size: .medium, look: .selected, state: .pressed, feedback: feedback, beneath: beneath)
      let under = filled[state: beneath]
      switch feedback {
      case .overlay:
        #expect(appearance.container == filled.pressed.selectedContainerColor && appearance.ripple == nil)
        #expect(appearance.icon == filled.pressed.selectedIconColor && appearance.outline == filled.pressed.selectedOutlineColor)
        #expect(appearance.opacity == tokens.pressed.opacity)
      case .ripple:
        #expect(appearance.container == under.selectedContainerColor && appearance.ripple == filled.pressed.selectedContainerColor)
        #expect(appearance.icon == filled.pressed.selectedIconColor && appearance.opacity == tokens.pressed.opacity)
      case .dim:
        #expect(appearance.container == under.selectedContainerColor && appearance.ripple == nil)
        #expect(appearance.icon == filled.pressed.selectedIconColor && appearance.outline == filled.pressed.selectedOutlineColor)
        #expect(appearance.cornerRadius == tokens.pressed.containerShape && appearance.opacity == tokens.pressed.opacity)
      case .none:
        #expect(appearance == TanreiIconButtonAppearance(tokens: tokens, variant: .filled, size: .medium, look: .selected, state: beneath))
      }
    }
    for state in TanreiInteraction.allCases where state != .pressed {
      #expect(
        TanreiIconButtonAppearance(tokens: tokens, variant: .filled, size: .medium, look: .selected, state: state, feedback: feedback)
          == TanreiIconButtonAppearance(tokens: tokens, variant: .filled, size: .medium, look: .selected, state: state))
    }
  }

  /// ICB-9 — rendered under a system that sets each value.
  @Test("ICB-9 each choice renders as it says", arguments: TanreiPressedFeedback.allCases)
  func rendered(feedback: TanreiPressedFeedback) throws {
    let system = distinct(feedback)
    let colors = system.colors.light
    let point = containerPoint(system.iconButton)
    let bitmap = try Snapshot.render(chrome(look: .selected, isPressed: true), theme: theme(system))
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
      let focused = try Snapshot.render(chrome(look: .selected, isPressed: true, isFocused: true), theme: theme(system))
      let expected = feedback == .dim ? colors[.success].opacity(0.5).rgba8(over: colors[.surface]) : colors[.success].rgba8()
      #expect(pixel(focused, x: point.x, y: point.y).isClose(to: expected))
    }
  }

  /// ICB-9 — the shipped systems, by their own values.
  @Test("ICB-9 m3-like ripples, cupertino dims, the default overlays")
  func shipped() {
    func pressed(_ system: TanreiSystem) -> TanreiIconButtonAppearance {
      TanreiIconButtonAppearance(tokens: system.iconButton, variant: .filled, size: .medium, state: .pressed, feedback: system.behavior.pressedFeedback)
    }
    #expect(pressed(.m3Like).ripple == TanreiSystem.m3Like.iconButton.variants.filled.pressed.containerColor)
    #expect(pressed(.m3Like).container == TanreiSystem.m3Like.iconButton.variants.filled.enabled.containerColor)
    let cupertino = pressed(.cupertino)
    #expect(cupertino.ripple == nil && cupertino.opacity == TanreiSystem.cupertino.iconButton.pressed.opacity && cupertino.opacity < 1)
    #expect(pressed(.tanrei).ripple == nil && pressed(.tanrei).container == TanreiSystem.tanrei.iconButton.variants.filled.pressed.containerColor)
  }

  /// ICB-9 — the ripple grows over comp.icon-button.motion.feedback-duration with the state easing.
  @Test("ICB-9 the ripple grows over the icon button's own feedback duration")
  func rippleTiming() {
    var tokens = TanreiSystem.m3Like.iconButton
    let easing = tokens.motionStateEasing
    #expect(tokens.rippleGrowth(reduceMotion: false) == Animation.timingCurve(easing.x1, easing.y1, easing.x2, easing.y2, duration: tokens.motionFeedbackDuration / 1000))
    tokens.motionFeedbackDuration = 900
    tokens.motionStateEasing = TanreiCubicBezier(0, 0, 1, 1)
    #expect(tokens.rippleGrowth(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.9))
  }

  #if os(macOS)
  private func holdSystem(holdMs: Double) -> TanreiSystem {
    var system = TanreiSystem.tanrei
    system.motion.duration.pressHold = holdMs
    system.iconButton.motionStateDuration = 0  // no fade: a color read is the state, not a frame of a transition
    system.iconButton.variants.filled.pressed.containerColor = .role(.error)
    return system
  }

  /// ICB-8 end to end with real mouse events: pressed at once on mouse-down, still pressed after a quick release, at
  /// rest again once press-hold has passed — and the action fired exactly once (ICB-1).
  @Test("ICB-8 ICB-1 a quick click shows the pressed state at once and keeps it for press-hold")
  func quickClickIsHeld() async throws {
    let system = holdSystem(holdMs: 1500)
    let colors = system.colors.light
    var count = 0
    let hosted = HostedView(
      TanreiIconButton("Favorite", variant: .filled, action: { count += 1 }) { Color.clear }
        .padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let point = containerPoint(system.iconButton)
    let middle = CGPoint(x: hosted.size.width / 2, y: hosted.size.height / 2)
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.primary].rgba8()))
    hosted.mouse(.leftMouseDown, at: middle)
    hosted.settle()
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    hosted.mouse(.leftMouseUp, at: middle)
    hosted.settle()
    #expect(count == 1)
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    // Waited for, bounded, not read once after a fixed sleep, which a loaded machine delays.
    #expect(await hosted.wait(atMost: 5) { hosted.color(at: point)?.isClose(to: colors[.primary].rgba8()) == true })
    #expect(count == 1)
  }

  /// ICB-1 under `ripple`: recording the point of contact must not take the click away from the button.
  @Test("ICB-1 ICB-9 a click still emits exactly once under ripple")
  func clickUnderRipple() {
    var count = 0
    let hosted = HostedView(
      TanreiIconButton("Favorite", icon: "favorite", action: { count += 1 }).padding(Snapshot.inset).tanreiTheme(theme(.m3Like)))
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: hosted.size.height / 2))
    #expect(count == 1)
  }
  #endif
}

// MARK: - Presets

@MainActor
@Suite("TanreiIconButton under the shipped presets")
struct TanreiIconButtonPresetTests {
  /// ICB-5 — every size of every shipped system renders its own square, whatever its value.
  @Test("ICB-5 layout follows each system's tokens at every size", arguments: ShippedSystem.allCases)
  func sizes(shipped: ShippedSystem) throws {
    let system = shipped.system
    for size in system.iconButton.sizes.keys {
      let bitmap = try Snapshot.render(TanreiIconButton("Favorite", size: size, action: {}) { Image(systemName: "heart") }, theme: theme(system))
      let side = (system.iconButton.sizes[size].containerSize + 2 * Snapshot.inset) * Snapshot.scale
      #expect(CGFloat(bitmap.width) == side && CGFloat(bitmap.height) == side, "\(shipped.rawValue) \(size.rawValue)")
    }
  }

  /// The presets' values, read from the instances: m3-like squares of 32 / 40 / 48 with 20 / 24 / 24 icons and a
  /// round shape; cupertino 28 / 34 / 44; the toggle-on standard icon is the tint.
  @Test("ICB-3 ICB-12 the presets' own values reach the icon button")
  func presetValues() throws {
    let m3 = TanreiSystem.m3Like.iconButton
    #expect([m3.sizes.small, m3.sizes.medium, m3.sizes.large].map(\.containerSize) == [32, 40, 48])
    #expect([m3.sizes.small, m3.sizes.medium, m3.sizes.large].map(\.iconSize) == [20, 24, 24])
    let pill = TanreiIconButtonAppearance(tokens: m3, variant: .filled, size: .medium, state: .enabled)
    #expect(pill.cornerRadius >= pill.containerSize / 2)
    let m3On = TanreiIconButtonAppearance(tokens: m3, variant: .standard, size: .medium, look: .selected, state: .enabled)
    #expect(m3On.icon == .role(.primary))
    let cupertino = TanreiSystem.cupertino.iconButton
    #expect([cupertino.sizes.small, cupertino.sizes.medium, cupertino.sizes.large].map(\.containerSize) == [28, 34, 44])
    #expect(TanreiIconButtonAppearance(tokens: cupertino, variant: .standard, size: .medium, state: .enabled).icon == .role(.primary))
    // Cupertino has no hover or focus state layer: those states draw exactly what rest draws.
    for look in TanreiIconButtonLook.allCases {
      let rest = TanreiIconButtonAppearance(tokens: cupertino, variant: .filled, size: .medium, look: look, state: .enabled)
      #expect(TanreiIconButtonAppearance(tokens: cupertino, variant: .filled, size: .medium, look: look, state: .hovered) == rest)
      #expect(TanreiIconButtonAppearance(tokens: cupertino, variant: .filled, size: .medium, look: look, state: .focused) == rest)
    }

    // Rendered: the m3-like filled button is a circle of the system's primary.
    let colors = TanreiSystem.m3Like.colors.light
    let bitmap = try Snapshot.render(chrome(), theme: theme(.m3Like))
    let side = m3.sizes.medium.containerSize
    #expect(pixel(bitmap, x: Snapshot.inset + side / 2, y: Snapshot.inset + 1).isClose(to: colors[.primary].rgba8()))
    #expect(pixel(bitmap, x: Snapshot.inset + side * 0.1, y: Snapshot.inset + side * 0.1).isClose(to: colors[.surface].rgba8()))
  }
}

// MARK: - Snapshots (one per spec fixture)

@MainActor
@Suite("TanreiIconButton snapshots")
struct TanreiIconButtonSnapshotTests {
  struct Fixture: Sendable, CustomTestStringConvertible {
    let id: String
    var variant: TanreiIconButtonVariant = .standard
    var size: TanreiIconButtonSize = .medium
    var toggle = false
    var selected = false
    var disabled = false
    var testDescription: String { id }
  }

  /// Mirrors `fixtures` in specs/icon-button.spec.json (label "Favorite", content "favorite").
  nonisolated static let fixtures: [Fixture] = [
    Fixture(id: "standard-medium", variant: .standard),
    Fixture(id: "filled-medium", variant: .filled),
    Fixture(id: "tonal-medium", variant: .tonal),
    Fixture(id: "outlined-medium", variant: .outlined),
    Fixture(id: "standard-small", variant: .standard, size: .small),
    Fixture(id: "standard-large", variant: .standard, size: .large),
    Fixture(id: "standard-disabled", variant: .standard, disabled: true),
    Fixture(id: "standard-selected", variant: .standard, toggle: true, selected: true),
    Fixture(id: "filled-unselected", variant: .filled, toggle: true, selected: false),
    Fixture(id: "filled-selected", variant: .filled, toggle: true, selected: true),
    Fixture(id: "tonal-selected", variant: .tonal, toggle: true, selected: true),
    Fixture(id: "outlined-selected", variant: .outlined, toggle: true, selected: true),
    Fixture(id: "outlined-disabled", variant: .outlined, disabled: true),
    Fixture(id: "standard-unselected", variant: .standard, toggle: true, selected: false),
  ]

  /// The fixture as a product writes it; "favorite" is drawn as the SF Symbol of its state (see the file header).
  static func view(_ fixture: Fixture) -> some View {
    let symbol = fixture.toggle && fixture.selected ? "heart.fill" : "heart"
    return Group {
      if fixture.toggle {
        TanreiIconButton("Favorite", isSelected: .constant(fixture.selected), variant: fixture.variant, size: fixture.size) { Image(systemName: symbol) }
      } else {
        TanreiIconButton("Favorite", variant: fixture.variant, size: fixture.size, action: {}) { Image(systemName: symbol) }
      }
    }
    .disabled(fixture.disabled)
  }

  @Test("fixture matches its baseline", arguments: fixtures)
  func fixture(_ fixture: Fixture) throws {
    try Snapshot.assert(Self.view(fixture), named: fixture.id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    var root = URL(fileURLWithPath: #filePath)
    for _ in 0..<5 { root.deleteLastPathComponent() }
    let data = try Data(contentsOf: root.appendingPathComponent("specs/icon-button.spec.json"))
    struct Spec: Decodable {
      struct Fixture: Decodable {
        let id: String
        let props: [String: Props]
        let content: String?
      }
      enum Props: Decodable, Equatable {
        case string(String), bool(Bool)
        init(from decoder: Decoder) throws {
          let c = try decoder.singleValueContainer()
          if let b = try? c.decode(Bool.self) { self = .bool(b) } else { self = .string(try c.decode(String.self)) }
        }
      }
      let fixtures: [Fixture]
    }
    let spec = try JSONDecoder().decode(Spec.self, from: data)
    #expect(spec.fixtures.map(\.id) == Self.fixtures.map(\.id))
    // And each fixture's props are the ones mirrored here.
    for (theirs, ours) in zip(spec.fixtures, Self.fixtures) {
      #expect(theirs.props["variant"] == .string(ours.variant.rawValue), "\(ours.id)")
      #expect((theirs.props["size"] ?? .string("medium")) == .string(ours.size.rawValue), "\(ours.id)")
      #expect((theirs.props["toggle"] ?? .bool(false)) == .bool(ours.toggle), "\(ours.id)")
      #expect((theirs.props["selected"] ?? .bool(false)) == .bool(ours.selected), "\(ours.id)")
      #expect((theirs.props["disabled"] ?? .bool(false)) == .bool(ours.disabled), "\(ours.id)")
      #expect(theirs.props["label"] == .string("Favorite") && theirs.content == "favorite", "\(ours.id)")
    }
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiIconButtonTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiIconButton preset snapshots")
struct TanreiIconButtonPresetSnapshotTests {
  /// A toggle that is on: it shows the preset's shape, size, the selected look and the selected icon.
  nonisolated static let fixtureId = "filled-selected"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiIconButtonSnapshotTests.fixtures.contains { $0.id == Self.fixtureId })
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try #require(TanreiIconButtonSnapshotTests.fixtures.first { $0.id == Self.fixtureId })
    try Snapshot.assert(TanreiIconButtonSnapshotTests.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
