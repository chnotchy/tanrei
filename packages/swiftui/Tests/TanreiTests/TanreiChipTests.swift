import AcmeFixture
import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/chip.spec.json. Each behavior id (CHP-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file. CHP-1…10 are BTN-1…10 for this component: the primitives they rest on
// (press hold, ripple, contact point, focus ring, hit target, container layers, elevation surface) are tested once in
// TanreiButtonTests / TanreiPrimitivesTests; here each is proven to reach the chip — and, for an input chip, its remove
// action.
//
// Glyphs: baselines render with `Snapshot.theme` (`fontFamilyPolicy: .system`), under which the icon font is not used,
// so the fixtures' content "event" is drawn with the SF Symbol a product would pass for it, `calendar`, and the check
// and the close glyph are the chip's own vectors (the check is the checkbox's mark). `avatar` is a neutral grey disc
// (no shared fixture image exists), as on the other platforms.

private let suiteName = "TanreiChipTests"

@MainActor
private final class Counter {
  var count = 0
}

/// A filter chip's selection, outside any view: what a `Binding` in a real app points at. Records the order of events.
@MainActor
private final class Selection {
  var isOn: Bool
  var events: [String] = []
  init(_ isOn: Bool) { self.isOn = isOn }

  var binding: Binding<Bool> {
    Binding(
      get: { MainActor.assumeIsolated { self.isOn } },
      set: { value in
        MainActor.assumeIsolated {
          self.isOn = value
          self.events.append("change(\(value))")
        }
      })
  }
}

@MainActor
private func theme(_ system: TanreiSystem, policy: TanreiFontFamilyPolicy = .system) -> TanreiTheme {
  var theme = Snapshot.theme
  theme.system = system
  theme.fontFamilyPolicy = policy
  return theme
}

@MainActor
private func pixel(_ bitmap: Bitmap, x: CGFloat, y: CGFloat) -> Bitmap.RGBA {
  bitmap[Int(x * Snapshot.scale), Int(y * Snapshot.scale)]
}

@MainActor
private func allDistinct(_ colors: [Bitmap.RGBA]) -> Bool {
  colors.indices.allSatisfy { i in colors.indices.allSatisfy { j in i == j || colors[i] != colors[j] } }
}

/// The size of a render without the snapshot inset, in points.
@MainActor
private func visualSize(_ bitmap: Bitmap) -> CGSize {
  CGSize(width: CGFloat(bitmap.width) / Snapshot.scale - 2 * Snapshot.inset, height: CGFloat(bitmap.height) / Snapshot.scale - 2 * Snapshot.inset)
}

/// The fixture avatar: one neutral grey. A test image, not a design value.
private let avatarGrey = Color(red: 0x9E / 255.0, green: 0x9E / 255.0, blue: 0x9E / 255.0)

/// The chip's chrome alone around a row of `kind`, as the style draws it.
@MainActor
private func chrome(
  _ variant: TanreiChipVariant = .outlined, kind: TanreiChipKind = .action, look: TanreiChipLook = .plain, size: TanreiChipSize = .medium,
  icon: Bool = false, isPressed: Bool = false, isFocused: Bool = false, title: String = "Vegetarian"
) -> some View {
  let parts = TanreiChipParts(kind: kind, hasIcon: icon, hasAvatar: false)
  return TanreiChipChrome(variant: variant, size: size, look: look, isPressed: isPressed, isFocused: isFocused) {
    TanreiChipRow(size: size, kind: kind, look: look, parts: parts, title: Text(title), icon: Group { if icon { Rectangle() } }, avatar: EmptyView())
  }
}

/// A point of the chip's container inside its start padding, mid-height.
@MainActor
private func startPoint(_ size: TanreiChipSize = .medium, system: TanreiSystem = .tanrei) -> CGPoint {
  let metrics = system.chip.sizes[size]
  return CGPoint(x: Snapshot.inset + metrics.containerPaddingInlineWithIcon / 2, y: Snapshot.inset + metrics.containerHeight / 2)
}

// MARK: - Activation and events (CHP-1, CHP-2, CHP-11, CHP-15, CHP-18, CHP-19, CHP-22, CHP-23, CHP-26)

@MainActor
@Suite("TanreiChip activation", .serialized)
struct TanreiChipActivationTests {
  /// CHP-1 — an action chip emits click once per activation; CHP-2 — never while disabled.
  @Test("CHP-1 CHP-2 activation emits action exactly once; never while disabled")
  func activation() {
    let counter = Counter()
    let chip = TanreiChip("Add to calendar", icon: "event", action: { counter.count += 1 })
    chip.activate(isEnabled: true)
    chip.activate(isEnabled: true)
    #expect(counter.count == 2)
    chip.activate(isEnabled: false)
    #expect(counter.count == 2)
    #expect(chip.look == .plain)
  }

  /// CHP-11 — a filter chip emits click, then change with the opposite of selected; disabled, neither (CHP-2).
  @Test("CHP-11 CHP-2 a filter chip emits click, then change with the opposite of selected")
  func filter() {
    let selection = Selection(false)
    let off = TanreiChip("Vegetarian", isSelected: selection.binding, action: { selection.events.append("click") })
    #expect(off.look == .plain)
    off.activate(isEnabled: true)
    #expect(selection.events == ["click", "change(true)"] && selection.isOn)
    let on = TanreiChip("Vegetarian", isSelected: selection.binding, action: { selection.events.append("click") })
    #expect(on.look == .selected)
    on.activate(isEnabled: true)
    #expect(selection.events == ["click", "change(true)", "click", "change(false)"] && !selection.isOn)
    on.activate(isEnabled: false)
    #expect(selection.events.count == 4)
  }

  /// CHP-11 — the pressed state (the toggle and selected traits) only for a filter chip; the others ignore `selected`.
  @Test("CHP-11 a filter chip is a toggle, selected while on; the other kinds expose no pressed state")
  func traits() {
    #expect(TanreiChipLook.plain.accessibilityTraits(kind: .filter) == .isToggle)
    #expect(TanreiChipLook.selected.accessibilityTraits(kind: .filter) == [.isToggle, .isSelected])
    for kind in [TanreiChipKind.action, .input] {
      #expect(TanreiChipLook(kind: kind, isSelected: true) == .plain, "\(kind) ignores selected")
      #expect(TanreiChipLook.plain.accessibilityTraits(kind: kind) == [])
    }
    #expect(TanreiChipKind.allCases.map(\.rawValue) == ["action", "filter", "input"])
  }

  /// CHP-18 — the remove action emits remove once and never click; CHP-2 — never while disabled; CHP-22 — the chip
  /// does not remove itself: `onRemove` only asks its owner.
  @Test("CHP-18 CHP-22 CHP-2 the remove route emits remove once, never click, never while disabled")
  func removeRoute() {
    let clicks = Counter()
    let removes = Counter()
    let chip = TanreiChip("Ada Lovelace", removeLabel: "Remove Ada Lovelace", action: { clicks.count += 1 }, onRemove: { removes.count += 1 })
    chip.remove(isEnabled: true)
    #expect(removes.count == 1 && clicks.count == 0)
    chip.remove(isEnabled: false)
    #expect(removes.count == 1)
    // The other kinds have no remove action and never emit remove.
    TanreiChip("Add to calendar", action: {}).remove(isEnabled: true)
    #expect(TanreiChip("Add to calendar", action: {}).parts.hasRemove == false)
    #expect(chip.parts.hasRemove)
  }

  /// CHP-19 — Backspace and Delete remove a focused input chip; CHP-23 — no arrow key is handled by the chip.
  @Test("CHP-19 CHP-23 Backspace and Delete are the removal keys; the chip handles no arrow key")
  func keys() {
    #expect(TanreiChipKeys.remove == [.delete, .deleteForward])
    let arrows: Set<KeyEquivalent> = [.upArrow, .downArrow, .leftArrow, .rightArrow]
    #expect(TanreiChipKeys.remove.isDisjoint(with: arrows) && TanreiActivationKeys.button.isDisjoint(with: arrows))
  }

  /// CHP-26 — an empty label is reported, and an input chip's empty removeLabel too; both still render.
  @Test("CHP-26 an empty label or removeLabel is reported and the chip still renders")
  func emptyNames() throws {
    let (_, reports) = Reports.collecting {
      _ = TanreiChip("", action: {})
      _ = TanreiChip("", isSelected: .constant(false))
      _ = TanreiChip("Ada Lovelace", removeLabel: "", onRemove: {})
    }
    #expect(reports.messages.count == 3)
    #expect(reports.mention("chip has an empty label") && reports.mention("chip's remove action has an empty label") && reports.mention("CHP-26"))
    let (_, silent) = Reports.collecting {
      _ = TanreiChip("Add to calendar", action: {})
      _ = TanreiChip("Ada Lovelace", removeLabel: "Remove Ada Lovelace", onRemove: {})
    }
    #expect(silent.messages.isEmpty)
    let (bitmap, _) = try Reports.collecting { try Snapshot.render(TanreiChip("", action: {})) }
    #expect(visualSize(bitmap).height == TanreiSystem.tanrei.chip.sizes.medium.containerHeight)
  }

  /// CHP-15 — only an input chip draws an avatar; another kind given one ignores it and reports it.
  @Test("CHP-15 an avatar on a chip that is not an input chip is reported and not drawn")
  func avatarOnlyForInput() throws {
    let (chip, reports) = Reports.collecting {
      TanreiChip(
        kind: .action, title: TanreiControlTitle("Add", component: "chip", behavior: "CHP-26"), variant: .outlined, size: .medium, isSelected: nil,
        removeLabel: nil, action: {}, onRemove: nil, icon: EmptyView(), avatar: avatarGrey)
    }
    #expect(reports.mention("only an input chip draws an avatar") && reports.mention("CHP-15"))
    #expect(chip.parts.leading == .none)
    let input = TanreiChip("Ada Lovelace", removeLabel: "Remove Ada Lovelace", avatar: { avatarGrey }, onRemove: {})
    #expect(input.parts.leading == .avatar)
  }

  #if os(macOS)
  /// CHP-1 CHP-2 by pointer, and CHP-18 CHP-21: a click on the label activates the chip; a click on the remove glyph
  /// removes it and does not click it; beyond the chip's end, in the remove action's hit area, it removes too.
  @Test("CHP-1 CHP-18 CHP-21 a click on the chip clicks it; on the remove glyph, or past the chip's end, removes it")
  func pointer() {
    let clicks = Counter()
    let removes = Counter()
    let hosted = HostedView(
      TanreiChip("Ada Lovelace", removeLabel: "Remove Ada Lovelace", action: { clicks.count += 1 }, onRemove: { removes.count += 1 })
        .padding(Snapshot.inset)
        .tanreiTheme(Snapshot.theme)
    )
    let tokens = Snapshot.theme.system.chip
    let metrics = tokens.sizes.medium
    let midY = hosted.size.height / 2
    let chipEnd = hosted.size.width - Snapshot.inset
    let glyphCenter = chipEnd - metrics.containerPaddingInlineWithIcon - metrics.iconSize / 2
    hosted.click(at: CGPoint(x: Snapshot.inset + metrics.containerPaddingInline + 10, y: midY))  // the label
    #expect(clicks.count == 1 && removes.count == 0)
    hosted.click(at: CGPoint(x: glyphCenter, y: midY))  // the glyph
    #expect(clicks.count == 1 && removes.count == 1)
    let geometry = TanreiChipRemoveGeometry(tokens: tokens, size: .medium, measure: Snapshot.theme.system.measure)
    #expect(geometry.overhang > 0)
    hosted.click(at: CGPoint(x: chipEnd + geometry.overhang / 2, y: midY))  // past the chip's end
    #expect(clicks.count == 1 && removes.count == 2)
    // CHP-21: toward the label, the remove action reaches no further than the gap before its glyph.
    hosted.click(at: CGPoint(x: glyphCenter - geometry.inward - 2, y: midY))
    #expect(clicks.count == 2 && removes.count == 2)
  }

  /// CHP-2 — a disabled chip and its remove action never emit.
  @Test("CHP-2 a disabled input chip emits neither click nor remove")
  func disabledPointer() {
    let clicks = Counter()
    let removes = Counter()
    let hosted = HostedView(
      TanreiChip("Ada Lovelace", removeLabel: "Remove Ada Lovelace", action: { clicks.count += 1 }, onRemove: { removes.count += 1 })
        .disabled(true)
        .padding(Snapshot.inset)
        .tanreiTheme(Snapshot.theme)
    )
    let metrics = Snapshot.theme.system.chip.sizes.medium
    let glyphCenter = hosted.size.width - Snapshot.inset - metrics.containerPaddingInlineWithIcon - metrics.iconSize / 2
    hosted.click(at: CGPoint(x: Snapshot.inset + 20, y: hosted.size.height / 2))
    hosted.click(at: CGPoint(x: glyphCenter, y: hosted.size.height / 2))
    #expect(clicks.count == 0 && removes.count == 0)
  }

  /// CHP-11 by pointer: a click on a filter chip emits click, then change, once.
  @Test("CHP-11 a click on a filter chip emits click then change once")
  func filterPointer() {
    let selection = Selection(false)
    let hosted = HostedView(
      TanreiChip("Vegetarian", isSelected: selection.binding, action: { selection.events.append("click") })
        .padding(Snapshot.inset)
        .tanreiTheme(Snapshot.theme)
    )
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: hosted.size.height / 2))
    #expect(selection.events == ["click", "change(true)"])
  }

  /// CHP-5 end to end: the small chip (24) is below the pointer target (44); a click above it, inside the target,
  /// activates it; beyond the target nothing happens.
  @Test("CHP-5 a click in the extended hit area activates the chip")
  func extendedHitArea() {
    let counter = Counter()
    let hosted = HostedView(TanreiChip("Add to calendar", size: .small, action: { counter.count += 1 }).padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    let system = Snapshot.theme.system
    let height = system.chip.sizes.small.containerHeight
    let outset = (TanreiHitTarget.minimum(in: system.measure) - height) / 2
    #expect(outset > 0)
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: Snapshot.inset - outset / 2))
    #expect(counter.count == 1)
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: Snapshot.inset - outset - 1))
    #expect(counter.count == 1)
  }

  /// CHP-22 — after asking for removal the chip is still drawn: it does not remove itself.
  @Test("CHP-22 the chip is still there after it asked to be removed")
  func doesNotRemoveItself() throws {
    let removes = Counter()
    let colors = TanreiSystem.tanrei.colors.light
    let hosted = HostedView(
      TanreiChip("Ada Lovelace", removeLabel: "Remove Ada Lovelace", variant: .elevated, onRemove: { removes.count += 1 })
        .padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(Snapshot.theme))
    let metrics = TanreiSystem.tanrei.chip.sizes.medium
    let glyphCenter = hosted.size.width - Snapshot.inset - metrics.containerPaddingInlineWithIcon - metrics.iconSize / 2
    hosted.click(at: CGPoint(x: glyphCenter, y: hosted.size.height / 2))
    #expect(removes.count == 1)
    #expect(try #require(hosted.color(at: CGPoint(x: Snapshot.inset + 3, y: hosted.size.height / 2))).isClose(to: colors[.surfaceContainerLowest].rgba8()))
  }
  #endif
}

// MARK: - Token bindings (CHP-3, CHP-6, CHP-12, CHP-14, CHP-20, CHP-24)

@MainActor
@Suite("TanreiChip token bindings")
struct TanreiChipTokenBindingTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiChipTokens { system.chip }

  struct Expected {
    let container: TanreiColorRole?
    let outline: TanreiColorRole?
    let label: TanreiColorRole
    let icon: TanreiColorRole
    let elevation: [TanreiShadowLayer]
  }

  /// The default system's values.
  var expected: [String: Expected] {
    [
      "outlined/plain": Expected(container: nil, outline: .outline, label: .onSurface, icon: .onSurfaceVariant, elevation: system.elevation.level0),
      "outlined/selected": Expected(container: .secondaryContainer, outline: nil, label: .onSecondaryContainer, icon: .onSecondaryContainer, elevation: system.elevation.level0),
      "elevated/plain": Expected(container: .surfaceContainerLowest, outline: nil, label: .onSurface, icon: .onSurfaceVariant, elevation: system.elevation.level2),
      "elevated/selected": Expected(container: .secondaryContainer, outline: nil, label: .onSecondaryContainer, icon: .onSecondaryContainer, elevation: system.elevation.level2),
    ]
  }

  private func paint(_ role: TanreiColorRole?) -> TanreiPaint { role.map { .role($0) } ?? TanreiPaint.none }

  private func appearance(_ variant: TanreiChipVariant, _ look: TanreiChipLook, _ state: TanreiInteraction, tokens: TanreiChipTokens? = nil) -> TanreiChipAppearance {
    TanreiChipAppearance(tokens: tokens ?? self.tokens, variant: variant, look: look, state: state)
  }

  /// CHP-12 — at rest each variant draws its own parts, and a filter chip that is on its `selected.` parts.
  @Test("CHP-12 at rest each variant and look binds the expected roles")
  func roles() throws {
    for variant in TanreiChipVariant.core {
      for look in TanreiChipLook.allCases {
        let key = "\(variant.rawValue)/\(look)"
        let expected = try #require(expected[key])
        let rest = appearance(variant, look, .enabled)
        #expect(rest.container == paint(expected.container) && rest.outline == paint(expected.outline), "\(key)")
        #expect(rest.label == paint(expected.label) && rest.icon == paint(expected.icon), "\(key)")
        #expect(rest.elevation == expected.elevation && rest.opacity == 1 && rest.ripple == nil, "\(key)")
        #expect(rest.cornerRadius == tokens.containerShape && rest.outlineWidth == tokens.outlineWidth)
      }
      // The state-layer colors alias the label colors and the remove glyph's.
      let rest = tokens.variants[variant].enabled
      #expect(rest.stateLayerColor == rest.labelColor && rest.selectedStateLayerColor == rest.selectedLabelColor)
      #expect(rest.removeStateLayerColor == rest.removeIconColor && rest.removeContainerColor == TanreiPaint.none)
    }
    // The four looks differ (in container, outline or elevation), light and dark.
    for scheme in [system.colors.light, system.colors.dark] {
      let looks = TanreiChipVariant.core.flatMap { variant in TanreiChipLook.allCases.map { appearance(variant, $0, .enabled) } }
      let fills = looks.map { scheme[$0.container].rgba8(over: scheme[TanreiPaint.role(.surface)]) }
      #expect(fills[0] != fills[1] && fills[2] != fills[3] && fills[1] == fills[3])  // off/on apart; on is one fill
      #expect(looks[0].outline != looks[2].outline || looks[0].elevation != looks[2].elevation)
    }
  }

  /// CHP-3 — every state reads that state's tokens: the look's state-layer color mixed into its container, the other
  /// parts at rest; the elevated chip rises to level3 under hover, selected or not.
  @Test("CHP-3 CHP-24 each state binds that state's tokens; the elevated chip rises under hover")
  func states() {
    let amounts: [(TanreiInteraction, Double)] = [
      (.hovered, system.state.hoverStateLayerOpacity), (.focused, system.state.focusStateLayerOpacity), (.pressed, system.state.pressedStateLayerOpacity),
    ]
    for variant in TanreiChipVariant.core {
      for look in TanreiChipLook.allCases {
        let rest = appearance(variant, look, .enabled)
        let layer = look == .selected ? tokens.variants[variant].enabled.selectedStateLayerColor : tokens.variants[variant].enabled.stateLayerColor
        for (state, amount) in amounts {
          let drawn = appearance(variant, look, state)
          #expect(drawn.container == .mix(base: rest.container, with: layer, amount: amount), "\(variant) \(look) \(state)")
          #expect(drawn.outline == rest.outline && drawn.label == rest.label && drawn.icon == rest.icon && drawn.opacity == 1)
          let elevation = variant == .elevated && state == .hovered ? system.elevation.level3 : rest.elevation
          #expect(drawn.elevation == elevation, "\(variant) \(look) \(state)")
        }
      }
    }
  }

  /// CHP-3 (verify) — under acme, hovered, focused and pressed are three different values.
  @Test("CHP-3 under acme, hovered, focused and pressed differ")
  func acme() {
    for variant in TanreiChipVariant.core {
      for look in TanreiChipLook.allCases {
        let containers = [TanreiInteraction.hovered, .focused, .pressed].map {
          TanreiChipAppearance(tokens: TanreiSystem.acme.chip, variant: variant, look: look, state: $0).container
        }
        let colors = TanreiSystem.acme.colors.light
        #expect(allDistinct(containers.map { colors[$0].rgba8(over: colors[TanreiPaint.role(.surface)]) }), "\(variant) \(look)")
      }
    }
  }

  /// CHP-6 — disabled: the outlined chip keeps no fill and fades its border; the elevated and selected chips are an
  /// on-surface fill; a look without a border grows none; content reads as disabled; nothing is raised; the remove
  /// action's container stays invisible and its glyph reads as disabled content.
  @Test("CHP-6 disabled bindings of every look and of the remove action")
  func disabled() {
    let faded = TanreiPaint.alpha(of: .role(.onSurface), amount: system.state.disabledContainerOpacity)
    let content = TanreiPaint.alpha(of: .role(.onSurface), amount: system.state.disabledContentOpacity)
    let outlined = appearance(.outlined, .plain, .disabled)
    #expect(outlined.container == TanreiPaint.none && outlined.outline == faded)
    let elevated = appearance(.elevated, .plain, .disabled)
    #expect(elevated.container == faded && elevated.outline == TanreiPaint.none)
    for variant in TanreiChipVariant.core {
      let selected = appearance(variant, .selected, .disabled)
      #expect(selected.container == faded && selected.outline == TanreiPaint.none, "\(variant)")
      for look in TanreiChipLook.allCases {
        let drawn = appearance(variant, look, .disabled)
        #expect(drawn.label == content && drawn.icon == content && drawn.elevation.isEmpty && drawn.opacity == tokens.disabled.opacity)
      }
      let remove = TanreiChipRemoveAppearance(tokens: tokens, variant: variant, state: .disabled)
      #expect(remove.container == TanreiPaint.none && remove.glyph == content)
    }
  }

  /// CHP-20 — the remove action draws its round container and glyph from the remove parts of ITS OWN state: the remove
  /// state-layer color mixed into its (invisible) container; the glyph keeps its color.
  @Test("CHP-20 the remove action binds the remove parts of its own state")
  func removeStates() {
    let amounts: [(TanreiInteraction, Double)] = [
      (.hovered, system.state.hoverStateLayerOpacity), (.focused, system.state.focusStateLayerOpacity), (.pressed, system.state.pressedStateLayerOpacity),
    ]
    for variant in TanreiChipVariant.core {
      let rest = TanreiChipRemoveAppearance(tokens: tokens, variant: variant, state: .enabled)
      #expect(rest.container == TanreiPaint.none && rest.glyph == .role(.onSurfaceVariant) && rest.ripple == nil)
      for (state, amount) in amounts {
        let drawn = TanreiChipRemoveAppearance(tokens: tokens, variant: variant, state: state)
        #expect(drawn.container == .mix(base: .none, with: tokens.variants[variant].enabled.removeStateLayerColor, amount: amount), "\(variant) \(state)")
        #expect(drawn.glyph == rest.glyph)
      }
    }
    // Its press answers as CHP-9 names, from its own tokens.
    var custom = tokens
    custom.variants.outlined.pressed.removeContainerColor = .role(.error)
    custom.pressed.opacity = 0.5
    let ripple = TanreiChipRemoveAppearance(tokens: custom, variant: .outlined, state: .pressed, feedback: .ripple, beneath: .hovered)
    #expect(ripple.ripple == .role(.error) && ripple.container == custom.variants.outlined.hovered.removeContainerColor && ripple.opacity == 0.5)
    let dim = TanreiChipRemoveAppearance(tokens: custom, variant: .outlined, state: .pressed, feedback: .dim)
    #expect(dim.ripple == nil && dim.container == TanreiPaint.none && dim.opacity == 0.5)
  }

  /// CHP-3 CHP-6 CHP-12 — the values drive the result: one token of one state and look changes exactly that.
  @Test("CHP-3 CHP-6 CHP-12 a modified system changes what each state resolves to")
  func modifiedSystem() {
    var custom = tokens
    custom.variants.outlined.hovered.containerColor = .role(.error)
    custom.variants.outlined.focused.selectedLabelColor = .role(.warning)
    custom.variants.elevated.pressed.containerElevation = system.elevation.level5
    custom.variants.outlined.disabled.outlineColor = .role(.success)
    custom.pressed.opacity = 0.4
    custom.containerShape = 3
    custom.outlineWidth = 2
    #expect(appearance(.outlined, .plain, .hovered, tokens: custom).container == .role(.error))
    #expect(appearance(.outlined, .selected, .focused, tokens: custom).label == .role(.warning))
    #expect(appearance(.elevated, .plain, .pressed, tokens: custom).elevation == system.elevation.level5)
    #expect(appearance(.outlined, .plain, .disabled, tokens: custom).outline == .role(.success))
    #expect(appearance(.outlined, .plain, .pressed, tokens: custom).opacity == 0.4)
    #expect(appearance(.outlined, .plain, .enabled, tokens: custom).cornerRadius == 3 && appearance(.outlined, .plain, .enabled, tokens: custom).outlineWidth == 2)
    // Nothing else moved.
    #expect(appearance(.outlined, .selected, .hovered, tokens: custom).container == appearance(.outlined, .selected, .hovered).container)
    var shapeOnly = tokens
    shapeOnly.containerShape = 3
    shapeOnly.outlineWidth = 2
    #expect(appearance(.elevated, .plain, .hovered, tokens: custom) == appearance(.elevated, .plain, .hovered, tokens: shapeOnly))
  }
}

// MARK: - Open axes (CHP-7)

@MainActor
@Suite("TanreiChip open size and variant")
struct TanreiChipOpenAxisTests {
  let tokens = TanreiSystem.tanrei.chip
  let unknownSize = TanreiChipSize(rawValue: "colossal")
  let unknownVariant = TanreiChipVariant(rawValue: "sparkly")

  @Test("the axes are the spec's: outlined/elevated, small/medium; defaults outlined and medium")
  func axes() {
    #expect(TanreiChipVariant.core == [.outlined, .elevated] && TanreiChipVariant.fallback == .outlined)
    #expect(TanreiChipSize.core == [.small, .medium] && TanreiChipSize.fallback == .medium)
  }

  /// CHP-7 — an unknown size or variant binds the default value's tokens in every state and look, and is reported.
  @Test("CHP-7 an unknown size and an unknown variant bind the default value's tokens", arguments: TanreiInteraction.allCases)
  func unknownValuesBindTheDefault(state: TanreiInteraction) {
    for look in TanreiChipLook.allCases {
      let (appearance, reports) = Reports.collecting { TanreiChipAppearance(tokens: tokens, variant: unknownVariant, look: look, state: state) }
      #expect(appearance == TanreiChipAppearance(tokens: tokens, variant: .outlined, look: look, state: state))
      #expect(reports.mention("chip variant \"sparkly\""))
    }
    let parts = TanreiChipParts(kind: .input, hasIcon: true, hasAvatar: false)
    let (geometry, reports) = Reports.collecting { TanreiChipGeometry(tokens: tokens, size: unknownSize, parts: parts, shown: 1) }
    #expect(geometry == TanreiChipGeometry(tokens: tokens, size: .medium, parts: parts, shown: 1))
    #expect(reports.mention("chip size \"colossal\""))
  }

  /// CHP-7 — rendered: pixel-identical to the default, for each kind (`renderExact`, bit-stable).
  @Test("CHP-7 an unknown size and variant render exactly like the default")
  func unknownValuesRenderTheDefault() throws {
    func chips(_ variant: TanreiChipVariant, _ size: TanreiChipSize) -> some View {
      VStack {
        TanreiChip("Add to calendar", variant: variant, size: size, action: {}) { Image(systemName: "calendar") }
        TanreiChip("Vegetarian", isSelected: .constant(true), variant: variant, size: size)
        TanreiChip("Ada Lovelace", removeLabel: "Remove Ada Lovelace", variant: variant, size: size, onRemove: {})
      }
    }
    let expected = try Snapshot.renderExact(chips(.outlined, .medium))
    let (actual, reports) = try Reports.collecting { try Snapshot.renderExact(chips(unknownVariant, unknownSize)) }
    #expect(actual.width == expected.width && actual.height == expected.height)
    #expect(actual.mismatch(against: expected, channelTolerance: 0) == 0)
    #expect(reports.mention("colossal") && reports.mention("sparkly"))
  }

  @Test("CHP-7 an added value is used, not the fallback")
  func addedValues() {
    var custom = tokens
    var tall = tokens.sizes.medium
    tall.containerHeight = 40
    custom.sizes.extra[unknownSize] = tall
    var sparkly = tokens.variants.elevated
    sparkly.enabled.labelColor = .role(.warning)
    custom.variants.extra[unknownVariant] = sparkly
    let (appearance, reports) = Reports.collecting { TanreiChipAppearance(tokens: custom, variant: unknownVariant, state: .enabled) }
    let (geometry, sizeReports) = Reports.collecting {
      TanreiChipGeometry(tokens: custom, size: unknownSize, parts: TanreiChipParts(kind: .action, hasIcon: false, hasAvatar: false), shown: 0)
    }
    #expect(appearance.label == .role(.warning) && geometry.height == 40 && reports.messages.isEmpty && sizeReports.messages.isEmpty)
  }
}

// MARK: - Layout (CHP-13, CHP-15, CHP-16, CHP-17, CHP-21, CHP-25)

@MainActor
@Suite("TanreiChip layout", .serialized)
struct TanreiChipLayoutTests {
  let system = TanreiSystem.tanrei
  let colors = TanreiSystem.tanrei.colors.light
  let inset = Snapshot.inset
  var tokens: TanreiChipTokens { system.chip }

  /// CHP-16 — each end is padded by its content: text, glyph or avatar; the leading element and the remove glyph
  /// each take their box and a gap; the chip is at least the size's height.
  @Test("CHP-16 the paddings, gaps and boxes of every part", arguments: TanreiChipSize.core)
  func geometry(size: TanreiChipSize) {
    let metrics = tokens.sizes[size]
    let plain = TanreiChipGeometry(tokens: tokens, size: size, parts: TanreiChipParts(kind: .action, hasIcon: false, hasAvatar: false), shown: 0)
    #expect(plain.start == metrics.containerPaddingInline && plain.end == metrics.containerPaddingInline && plain.leadingWidth == 0 && plain.trailingWidth == 0)
    let icon = TanreiChipGeometry(tokens: tokens, size: size, parts: TanreiChipParts(kind: .action, hasIcon: true, hasAvatar: false), shown: 0)
    #expect(icon.start == metrics.containerPaddingInlineWithIcon && icon.leadingWidth == metrics.iconSize && icon.leadingGap == metrics.containerGap)
    let input = TanreiChipGeometry(tokens: tokens, size: size, parts: TanreiChipParts(kind: .input, hasIcon: false, hasAvatar: true), shown: 0)
    #expect(input.start == metrics.containerPaddingInlineWithAvatar && input.leadingWidth == metrics.avatarSize)
    #expect(input.trailingGap == metrics.containerGap && input.trailingWidth == metrics.iconSize && input.end == metrics.containerPaddingInlineWithIcon)
    #expect([plain, icon, input].allSatisfy { $0.height == metrics.containerHeight && $0.paddingBlock == metrics.containerPaddingBlock })
    #expect(plain.labelTypescale == metrics.labelTypescale)
  }

  /// CHP-16 — rendered: an icon adds its box and gap and trades the text padding for the glyph padding; an input chip's
  /// remove glyph adds its gap and box at the end; every chip is the size's height.
  @Test("CHP-16 rendered widths add up part by part", arguments: TanreiChipSize.core)
  func renderedWidths(size: TanreiChipSize) throws {
    let metrics = tokens.sizes[size]
    let plain = visualSize(try Snapshot.render(TanreiChip("Sounds good", size: size, action: {})))
    let icon = visualSize(try Snapshot.render(TanreiChip("Sounds good", size: size, action: {}) { Rectangle() }))
    let input = visualSize(try Snapshot.render(TanreiChip("Sounds good", removeLabel: "Remove", size: size, onRemove: {})))
    #expect(plain.height == metrics.containerHeight && icon.height == metrics.containerHeight && input.height == metrics.containerHeight)
    #expect(abs(icon.width - plain.width - (metrics.iconSize + metrics.containerGap + metrics.containerPaddingInlineWithIcon - metrics.containerPaddingInline)) < 0.01)
    #expect(abs(input.width - plain.width - (metrics.iconSize + metrics.containerGap + metrics.containerPaddingInlineWithIcon - metrics.containerPaddingInline)) < 0.01)
  }

  /// CHP-13 — a filter chip without an icon grows by the check's box, its gap and the glyph padding when it is on; one
  /// with an icon keeps its width (the check takes the icon's place). The check is drawn in the selected icon color.
  @Test("CHP-13 the check shows in the leading position, and the width follows it")
  func check() throws {
    let metrics = tokens.sizes.medium
    let off = visualSize(try Snapshot.render(TanreiChip("Vegetarian", isSelected: .constant(false))))
    let on = visualSize(try Snapshot.render(TanreiChip("Vegetarian", isSelected: .constant(true))))
    #expect(abs(on.width - off.width - (metrics.iconSize + metrics.containerGap + metrics.containerPaddingInlineWithIcon - metrics.containerPaddingInline)) < 0.01)
    let iconOff = visualSize(try Snapshot.render(TanreiChip("Vegetarian", isSelected: .constant(false)) { Rectangle() }))
    let iconOn = visualSize(try Snapshot.render(TanreiChip("Vegetarian", isSelected: .constant(true)) { Rectangle() }))
    #expect(iconOn.width == iconOff.width)
    // Half-way, half the room (the width moves with the check).
    let half = TanreiChipGeometry(tokens: tokens, size: .medium, parts: TanreiChipParts(kind: .filter, hasIcon: false, hasAvatar: false), shown: 0.5)
    #expect(half.leadingWidth == metrics.iconSize / 2 && half.leadingGap == metrics.containerGap / 2)
    // The check is the checkbox's mark: its corner point, in the selected icon color.
    let bitmap = try Snapshot.render(TanreiChip("Vegetarian", isSelected: .constant(true)))
    let box = CGPoint(x: inset + metrics.containerPaddingInlineWithIcon, y: inset + (metrics.containerHeight - metrics.iconSize) / 2)
    let corner = TanreiCheckboxMarkShape.checkPoints[1]
    let checkColor = colors[tokens.variants.outlined.enabled.selectedIconColor].rgba8()
    #expect(pixel(bitmap, x: box.x + corner.x * metrics.iconSize, y: box.y + corner.y * metrics.iconSize - 0.5).isClose(to: checkColor, tolerance: 12))
    // With the icon it replaces, the icon is gone while on.
    let withIcon = try Snapshot.render(TanreiChip("Vegetarian", isSelected: .constant(true)) { Rectangle() })
    #expect(!pixel(withIcon, x: box.x + 1, y: box.y + 1).isClose(to: checkColor))
    let iconShown = try Snapshot.render(TanreiChip("Vegetarian", isSelected: .constant(false)) { Rectangle() })
    #expect(pixel(iconShown, x: box.x + 1, y: box.y + 1).isClose(to: colors[tokens.variants.outlined.enabled.iconColor].rgba8()))
  }

  /// CHP-13 CHP-24 — a change of selection moves over the selection motion, a change of state over the state motion;
  /// both at once under Reduce Motion.
  @Test("CHP-13 CHP-24 the selection and state motions; none under Reduce Motion")
  func motions() {
    let motion = tokens.motion(reduceMotion: false)
    let selection = tokens.motionSelectionEasing
    let state = tokens.motionStateEasing
    #expect(motion.selection == Animation.timingCurve(selection.x1, selection.y1, selection.x2, selection.y2, duration: tokens.motionSelectionDuration / 1000))
    #expect(motion.state == Animation.timingCurve(state.x1, state.y1, state.x2, state.y2, duration: tokens.motionStateDuration / 1000))
    let reduced = tokens.motion(reduceMotion: true)
    #expect(reduced.selection == nil && reduced.state == nil)
    var custom = tokens
    custom.motionSelectionDuration = 900
    #expect(custom.motion(reduceMotion: false).selection == Animation.timingCurve(selection.x1, selection.y1, selection.x2, selection.y2, duration: 0.9))
  }

  /// CHP-14 — the icon slot is handed the icon size of the size and the selection state (selected only for a filter
  /// chip that is on).
  @Test("CHP-14 the icon slot gets the size's icon size and the selection of the look")
  func iconContext() throws {
    @MainActor final class Probe { var context: TanreiIconContext? }
    struct ProbeView: View {
      let probe: Probe
      @Environment(\.tanreiIconContext) private var context
      var body: some View {
        probe.context = context
        return Color.clear
      }
    }
    for size in TanreiChipSize.core {
      let probe = Probe()
      _ = try Snapshot.render(TanreiChip("Add", size: size, action: {}) { ProbeView(probe: probe) })
      #expect(probe.context == TanreiIconContext(size: tokens.sizes[size].iconSize, selected: false))
      _ = try Snapshot.render(TanreiChip("Veg", isSelected: .constant(false), size: size) { ProbeView(probe: probe) })
      #expect(probe.context == TanreiIconContext(size: tokens.sizes[size].iconSize, selected: false))
      _ = try Snapshot.render(TanreiChip("Veg", isSelected: .constant(true), size: size) { ProbeView(probe: probe) })
      #expect(probe.context == TanreiIconContext(size: tokens.sizes[size].iconSize, selected: true))
    }
  }

  /// CHP-14 — the remove glyph is drawn at the icon size in the remove color, centred in its round container at the
  /// inline end; the leading icon in the icon color.
  @Test("CHP-14 CHP-18 the remove glyph in the remove color at the inline end")
  func removeGlyph() throws {
    var custom = system
    custom.chip.variants.outlined.enabled.removeIconColor = .role(.error)
    let bitmap = try Snapshot.render(TanreiChip("Ada Lovelace", removeLabel: "Remove Ada Lovelace", onRemove: {}), theme: theme(custom))
    let metrics = tokens.sizes.medium
    let width = visualSize(bitmap).width
    let glyph = CGPoint(x: inset + width - metrics.containerPaddingInlineWithIcon - metrics.iconSize / 2, y: inset + metrics.containerHeight / 2)
    #expect(pixel(bitmap, x: glyph.x, y: glyph.y).isClose(to: colors[.error].rgba8(), tolerance: 40))
    // The cross's arms reach the corners of its box's middle half.
    let arm = metrics.iconSize * (TanreiChipCrossShape.far - 0.5) - 1
    #expect(pixel(bitmap, x: glyph.x + arm, y: glyph.y + arm).isClose(to: colors[.error].rgba8(), tolerance: 60))
  }

  /// CHP-15 — the avatar at the avatar size, clipped to the avatar shape (round), at the start; at the disabled content
  /// opacity when disabled (CHP-6).
  @Test("CHP-15 CHP-6 the avatar at its size and shape; dimmed when disabled")
  func avatar() throws {
    let metrics = tokens.sizes.medium
    let bitmap = try Snapshot.render(TanreiChip("Ada Lovelace", removeLabel: "Remove Ada Lovelace", avatar: { avatarGrey }, onRemove: {}))
    let center = CGPoint(x: inset + metrics.containerPaddingInlineWithAvatar + metrics.avatarSize / 2, y: inset + metrics.containerHeight / 2)
    #expect(pixel(bitmap, x: center.x, y: center.y).isClose(to: avatarGrey.rgba8()))
    // Round: the corner of its box is not grey.
    let corner = CGPoint(x: center.x - metrics.avatarSize / 2 + 1, y: center.y - metrics.avatarSize / 2 + 1)
    #expect(!pixel(bitmap, x: corner.x, y: corner.y).isClose(to: avatarGrey.rgba8()))
    let disabled = try Snapshot.render(TanreiChip("Ada Lovelace", removeLabel: "Remove Ada Lovelace", avatar: { avatarGrey }, onRemove: {}).disabled(true))
    #expect(pixel(disabled, x: center.x, y: center.y).isClose(to: avatarGrey.opacity(system.state.disabledContentOpacity).rgba8(over: colors[.surface])))
  }

  /// CHP-17 — one line; given less width than the label needs, the chip is that width and the label truncates (the chip
  /// keeps its height). Larger text grows the chip's height (a larger text style here; Dynamic Type on iOS).
  @Test("CHP-17 one line, truncated only when the layout gives less width; taller text grows the chip")
  func truncation() throws {
    let metrics = tokens.sizes.medium
    let free = visualSize(try Snapshot.render(TanreiChip("A rather long chip label that does not fit", action: {})))
    let narrow = visualSize(try Snapshot.render(TanreiChip("A rather long chip label that does not fit", action: {}).frame(width: 120)))
    #expect(free.width > 120 && narrow.height == metrics.containerHeight)
    var custom = system
    custom.chip.sizes.medium.labelTypescale = system.typescale.heading1
    let tall = visualSize(try Snapshot.render(TanreiChip("Tall", action: {}), theme: theme(custom)))
    #expect(tall.height > metrics.containerHeight)
  }

  /// CHP-21 — the remove action's hit area: at least the minimum target on both axes, reaching toward the label no
  /// further than the gap before the glyph, the rest outward past the chip.
  @Test("CHP-21 the remove hit area meets the target, never covers the label, and reaches outward", arguments: TanreiChipSize.core)
  func removeHitArea(size: TanreiChipSize) {
    for measure in [system.measure, TanreiSystem.cupertino.measure] {
      let geometry = TanreiChipRemoveGeometry(tokens: tokens, size: size, measure: measure)
      let metrics = tokens.sizes[size]
      let target = TanreiHitTarget.minimum(in: measure)
      #expect(geometry.hitWidth >= target && geometry.hitHeight >= target)
      #expect(geometry.inward <= metrics.containerGap + metrics.iconSize / 2)
      #expect(geometry.overhang == geometry.hitWidth - geometry.inward - metrics.containerPaddingInlineWithIcon - metrics.iconSize / 2)
      #expect(geometry.containerSize == metrics.removeContainerSize && geometry.cornerRadius == tokens.removeContainerShape)
    }
  }

  /// CHP-25 — right to left, the row mirrors: the remove glyph sits at the left, the leading icon at the right.
  @Test("CHP-25 right to left, the remove action sits at the left and the icon at the right")
  func rightToLeft() throws {
    var custom = system
    custom.chip.variants.outlined.enabled.removeIconColor = .role(.error)
    custom.chip.variants.outlined.enabled.iconColor = .role(.success)
    let chip = TanreiChip("Ada Lovelace", removeLabel: "Remove Ada Lovelace", onRemove: {}) { Rectangle() }
    let rtl = try Snapshot.render(chip.environment(\.layoutDirection, .rightToLeft), theme: theme(custom))
    let metrics = tokens.sizes.medium
    let width = visualSize(rtl).width
    let midY = inset + metrics.containerHeight / 2
    let glyphX = inset + metrics.containerPaddingInlineWithIcon + metrics.iconSize / 2
    #expect(pixel(rtl, x: glyphX, y: midY).isClose(to: colors[.error].rgba8(), tolerance: 40))
    let iconX = inset + width - metrics.containerPaddingInlineWithIcon - metrics.iconSize / 2
    #expect(pixel(rtl, x: iconX, y: midY).isClose(to: colors[.success].rgba8()))
  }

  #if os(macOS)
  /// CHP-25 — right to left, the remove action's hit area is at the left, past the chip's left edge; the chip keeps the
  /// rest.
  @Test("CHP-25 CHP-21 right to left, the remove action is hit at the left")
  func rightToLeftHit() {
    let clicks = Counter()
    let removes = Counter()
    let hosted = HostedView(
      TanreiChip("Ada Lovelace", removeLabel: "Remove Ada Lovelace", action: { clicks.count += 1 }, onRemove: { removes.count += 1 })
        .environment(\.layoutDirection, .rightToLeft)
        .padding(Snapshot.inset)
        .tanreiTheme(Snapshot.theme))
    let metrics = tokens.sizes.medium
    let midY = hosted.size.height / 2
    hosted.click(at: CGPoint(x: Snapshot.inset + metrics.containerPaddingInlineWithIcon + metrics.iconSize / 2, y: midY))
    #expect(removes.count == 1 && clicks.count == 0)
    hosted.click(at: CGPoint(x: Snapshot.inset - 4, y: midY))
    #expect(removes.count == 2 && clicks.count == 0)
    hosted.click(at: CGPoint(x: hosted.size.width - Snapshot.inset - 20, y: midY))
    #expect(clicks.count == 1 && removes.count == 2)
  }

  /// CHP-25 CHP-9 — the ripple grows from the point of contact in right to left as in left to right.
  @Test("CHP-25 CHP-9 right to left, the chip's ripple grows from the point of contact", arguments: [LayoutDirection.leftToRight, .rightToLeft])
  func rippleFromContact(direction: LayoutDirection) async throws {
    var system = TanreiSystem.tanrei
    system.behavior.pressedFeedback = .ripple
    system.chip.motionFeedbackDuration = 8000
    system.chip.motionStateEasing = TanreiCubicBezier(0, 0, 1, 1)
    system.chip.variants.elevated.pressed.containerColor = .role(.error)
    let colors = system.colors.light
    let hosted = HostedView(
      TanreiChip("A longer chip label", variant: .elevated, action: {})
        .environment(\.layoutDirection, direction)
        .padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let midY = hosted.size.height / 2
    let near = CGPoint(x: Snapshot.inset + 5, y: midY)
    let far = CGPoint(x: hosted.size.width - Snapshot.inset - 5, y: midY)
    hosted.hover(at: near)
    hosted.mouse(.leftMouseDown, at: near)
    hosted.settle(0.6)
    let atContact = try #require(hosted.color(at: near))
    let opposite = try #require(hosted.color(at: far))
    hosted.mouse(.leftMouseUp, at: near)
    hosted.settle()
    #expect(atContact.isClose(to: colors[.error].rgba8(), tolerance: 24), "\(direction): \(atContact)")
    // On GitHub's macOS runner the ripple has already reached the far end when this is sampled (both directions).
    await withKnownIssue("CI runner timing: sampled mid-ripple on the wall clock; on GitHub's macOS runner the ripple has already covered the chip", isIntermittent: true) {
      #expect(!opposite.isClose(to: colors[.error].rgba8(), tolerance: 24), "\(direction): \(opposite)")
    }
  }

  /// CHP-20 — while the pointer is on the remove action, the chip is not hovered (its container keeps its rest look)
  /// and the remove action's round container shows its own hover; on the chip's label, the chip is hovered.
  @Test("CHP-20 hovering the remove action hovers it, not the chip")
  func removeHover() throws {
    var system = TanreiSystem.tanrei
    system.chip.motionStateDuration = 0
    system.chip.variants.elevated.hovered.containerColor = .role(.error)
    system.chip.variants.elevated.hovered.removeContainerColor = .role(.success)
    let colors = system.colors.light
    let hosted = HostedView(
      TanreiChip("Ada Lovelace", removeLabel: "Remove Ada Lovelace", variant: .elevated, onRemove: {})
        .padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let metrics = system.chip.sizes.medium
    let midY = hosted.size.height / 2
    let chipPoint = CGPoint(x: Snapshot.inset + 4, y: midY)
    let glyphCenter = hosted.size.width - Snapshot.inset - metrics.containerPaddingInlineWithIcon - metrics.iconSize / 2
    // A point of the remove action's round container off its glyph.
    let removePoint = CGPoint(x: glyphCenter, y: midY - metrics.removeContainerSize / 2 + 1.5)
    hosted.hover(at: CGPoint(x: Snapshot.inset + 30, y: midY))
    #expect(try #require(hosted.color(at: chipPoint)).isClose(to: colors[.error].rgba8()), "the chip is hovered")
    hosted.hover(at: CGPoint(x: glyphCenter, y: midY))
    #expect(try #require(hosted.color(at: chipPoint)).isClose(to: colors[.surfaceContainerLowest].rgba8()), "the chip is not hovered")
    #expect(try #require(hosted.color(at: removePoint)).isClose(to: colors[.success].rgba8(), tolerance: 12), "the remove action is")
  }

  /// CHP-8 end to end: pressed at once, held for press-hold after a quick release; CHP-1: once.
  @Test("CHP-8 CHP-1 a quick click shows the pressed state at once and keeps it for press-hold")
  func quickClickIsHeld() async throws {
    var system = TanreiSystem.tanrei
    system.motion.duration.pressHold = 1500
    system.chip.motionStateDuration = 0
    system.chip.variants.elevated.pressed.containerColor = .role(.error)
    let colors = system.colors.light
    var count = 0
    let hosted = HostedView(
      TanreiChip("Add to calendar", variant: .elevated, action: { count += 1 }).padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let point = CGPoint(x: Snapshot.inset + 4, y: hosted.size.height / 2)
    let middle = CGPoint(x: hosted.size.width / 2, y: hosted.size.height / 2)
    hosted.mouse(.leftMouseDown, at: middle)
    hosted.settle()
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    hosted.mouse(.leftMouseUp, at: middle)
    hosted.settle()
    #expect(count == 1)
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    let released = await hosted.wait(atMost: 5) { hosted.color(at: point)?.isClose(to: colors[.surfaceContainerLowest].rgba8()) == true }
    #expect(released && count == 1, "\(String(describing: hosted.color(at: point))) vs \(colors[.surfaceContainerLowest].rgba8())")
  }
  #endif
}

// MARK: - Rendered states (CHP-3, CHP-4, CHP-6, CHP-9, CHP-10, CHP-12, CHP-20, CHP-24)

@MainActor
@Suite("TanreiChip rendered states", .serialized)
struct TanreiChipRenderedStateTests {
  let system = TanreiSystem.tanrei
  let colors = TanreiSystem.tanrei.colors.light
  let inset = Snapshot.inset
  var tokens: TanreiChipTokens { system.chip }

  /// CHP-12 CHP-16 — rendered: the outlined chip's outline inside its edge, no fill; on, a fill and no edge; the
  /// elevated chip's fill and shadow.
  @Test("CHP-12 CHP-16 CHP-24 the looks render their container, outline and elevation")
  func looks() throws {
    let midY = inset + tokens.sizes.medium.containerHeight / 2
    let off = try Snapshot.render(chrome(kind: .filter))
    #expect(pixel(off, x: inset + tokens.outlineWidth / 2, y: midY).isClose(to: colors[.outline].rgba8()))
    #expect(pixel(off, x: inset + 4, y: midY).isClose(to: colors[.surface].rgba8()))
    let on = try Snapshot.render(chrome(kind: .filter, look: .selected))
    #expect(pixel(on, x: inset + tokens.outlineWidth / 2, y: midY).isClose(to: colors[.secondaryContainer].rgba8()))
    let elevated = try Snapshot.render(chrome(.elevated))
    #expect(pixel(elevated, x: inset + 4, y: midY).isClose(to: colors[.surfaceContainerLowest].rgba8()))
    let below = CGPoint(x: inset + 20, y: inset + tokens.sizes.medium.containerHeight + 1.5)
    #expect(!pixel(elevated, x: below.x, y: below.y).isClose(to: colors[.surface].rgba8(), tolerance: 0))
    #expect(pixel(try Snapshot.render(chrome()), x: below.x, y: below.y).isClose(to: colors[.surface].rgba8(), tolerance: 0))
    // A modified outline width reaches the render.
    var thick = system
    thick.chip.outlineWidth = 4
    #expect(pixel(try Snapshot.render(chrome(), theme: theme(thick)), x: inset + 3, y: midY).isClose(to: colors[.outline].rgba8()))
  }

  /// CHP-3 — pressed and focused render the state's container, pressed over focused, and a state's opacity dims the
  /// whole chip.
  @Test("CHP-3 pressed and focused render the state's container; pressed over focused")
  func stateContainer() throws {
    var custom = system
    custom.chip.variants.elevated.pressed.containerColor = .role(.error)
    custom.chip.variants.elevated.focused.containerColor = .role(.success)
    let point = startPoint()
    #expect(pixel(try Snapshot.render(chrome(.elevated, isPressed: true, isFocused: true), theme: theme(custom)), x: point.x, y: point.y).isClose(to: colors[.error].rgba8()))
    #expect(pixel(try Snapshot.render(chrome(.elevated, isFocused: true), theme: theme(custom)), x: point.x, y: point.y).isClose(to: colors[.success].rgba8()))
    custom.chip.pressed.opacity = 0.4
    #expect(pixel(try Snapshot.render(chrome(.elevated, isPressed: true), theme: theme(custom)), x: point.x, y: point.y).isClose(to: colors[.error].opacity(0.4).rgba8(over: colors[.surface])))
  }

  /// CHP-6 — rendered: the disabled outlined chip keeps no fill, its border fades; the selected one is a faded fill.
  @Test("CHP-6 disabled renders from the disabled tokens")
  func disabledRender() throws {
    let midY = inset + tokens.sizes.medium.containerHeight / 2
    let off = try Snapshot.render(chrome(kind: .filter).disabled(true))
    #expect(pixel(off, x: inset + 4, y: midY).isClose(to: colors[.surface].rgba8()))
    #expect(pixel(off, x: inset + tokens.outlineWidth / 2, y: midY).isClose(to: colors[tokens.variants.outlined.disabled.outlineColor].rgba8(over: colors[.surface])))
    let on = try Snapshot.render(chrome(kind: .filter, look: .selected).disabled(true))
    #expect(pixel(on, x: inset + 4, y: midY).isClose(to: colors[tokens.variants.outlined.disabled.selectedContainerColor].rgba8(over: colors[.surface])))
  }

  /// CHP-4 — the chip's ring: offset then the focus-ring stroke, never dimmed; absent when disabled. CHP-20: the remove
  /// action's ring is around its round container.
  @Test("CHP-4 CHP-20 the chip's focus ring around the chip; the remove action's around its round container")
  func focusRings() throws {
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.containerShape, measure: system.measure)
    let midY = inset + tokens.sizes.medium.containerHeight / 2
    let ringX = inset - metrics.outerCenterlineOutset
    #expect(pixel(try Snapshot.render(chrome(isFocused: true)), x: ringX, y: midY).isClose(to: colors[.focusRing].rgba8()))
    #expect(!pixel(try Snapshot.render(chrome()), x: ringX, y: midY).isClose(to: colors[.focusRing].rgba8()))
    #expect(!pixel(try Snapshot.render(chrome(isFocused: true).disabled(true)), x: ringX, y: midY).isClose(to: colors[.focusRing].rgba8()))
    var dim = system
    dim.chip.focused.opacity = 0.3
    #expect(pixel(try Snapshot.render(chrome(isFocused: true), theme: theme(dim)), x: ringX, y: midY).isClose(to: colors[.focusRing].rgba8()))

    let geometry = TanreiChipRemoveGeometry(tokens: tokens, size: .medium, measure: system.measure)
    let remove = try Snapshot.render(TanreiChipRemoveChrome(variant: .outlined, geometry: geometry, isPressed: false, isFocused: true))
    let ring = TanreiFocusRingMetrics(containerCornerRadius: geometry.cornerRadius, measure: system.measure)
    let center = CGPoint(x: inset + geometry.inward, y: inset + geometry.hitHeight / 2)
    #expect(pixel(remove, x: center.x, y: center.y - geometry.containerSize / 2 - ring.outerCenterlineOutset).isClose(to: colors[.focusRing].rgba8()))
  }

  /// CHP-20 — rendered: the remove action pressed or focused shows its own container; the chip's stays at rest.
  @Test("CHP-20 the remove action's own state shows in its round container")
  func removeRendered() throws {
    var custom = system
    custom.chip.variants.outlined.pressed.removeContainerColor = .role(.error)
    custom.chip.variants.outlined.focused.removeContainerColor = .role(.success)
    let geometry = TanreiChipRemoveGeometry(tokens: tokens, size: .medium, measure: system.measure)
    let point = CGPoint(x: inset + geometry.inward, y: inset + geometry.hitHeight / 2 - geometry.containerSize / 2 + 1.5)
    let pressed = try Snapshot.render(TanreiChipRemoveChrome(variant: .outlined, geometry: geometry, isPressed: true, isFocused: true), theme: theme(custom))
    #expect(pixel(pressed, x: point.x, y: point.y).isClose(to: colors[.error].rgba8()))
    let focused = try Snapshot.render(TanreiChipRemoveChrome(variant: .outlined, geometry: geometry, isPressed: false, isFocused: true), theme: theme(custom))
    #expect(pixel(focused, x: point.x, y: point.y).isClose(to: colors[.success].rgba8()))
    let rest = try Snapshot.render(TanreiChipRemoveChrome(variant: .outlined, geometry: geometry, isPressed: false, isFocused: false), theme: theme(custom))
    #expect(pixel(rest, x: point.x, y: point.y).isClose(to: colors[.surface].rgba8()))
  }

  /// CHP-10 — the corners follow the corner smoothing; the focus follows the focus style (acme is glow).
  @Test("CHP-10 corner smoothing and focus style reach the chip")
  func cornersAndFocusStyle() throws {
    func render(_ amount: Double, focused: Bool = false, style: TanreiFocusStyle = .ring) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      custom.chip.containerShape = 12
      custom.behavior.focusStyle = style
      return try Snapshot.renderExact(chrome(.elevated, isFocused: focused), theme: theme(custom))
    }
    let continuous = try render(0.6)
    #expect(try render(0).mismatch(against: continuous, channelTolerance: 0) > 0)
    #expect(try render(1).mismatch(against: continuous, channelTolerance: 0) == 0)
    #expect(try render(0.6, focused: true, style: .glow).mismatch(against: try render(0.6, focused: true, style: .ring), channelTolerance: 0) > 0)
    #expect(TanreiSystem.cupertino.shape.roundedCornerStyle == .continuous && TanreiSystem.acme.behavior.focusStyle == .glow)
  }

  /// CHP-9 — which tokens a press reads under each choice, for the look drawn.
  @Test("CHP-9 each choice binds the pressed tokens of the look its own way", arguments: TanreiPressedFeedback.allCases)
  func pressBindings(feedback: TanreiPressedFeedback) {
    var custom = tokens
    custom.variants.outlined.pressed.selectedContainerColor = .role(.error)
    custom.variants.outlined.pressed.selectedLabelColor = .role(.warning)
    custom.variants.outlined.focused.selectedContainerColor = .role(.success)
    custom.pressed.opacity = 0.5
    let outlined = custom.variants.outlined
    for beneath in [TanreiInteraction.enabled, .hovered, .focused] {
      let drawn = TanreiChipAppearance(tokens: custom, variant: .outlined, look: .selected, state: .pressed, feedback: feedback, beneath: beneath)
      let under = outlined[state: beneath]
      switch feedback {
      case .overlay: #expect(drawn.container == outlined.pressed.selectedContainerColor && drawn.ripple == nil)
      case .ripple: #expect(drawn.container == under.selectedContainerColor && drawn.ripple == outlined.pressed.selectedContainerColor)
      case .dim: #expect(drawn.container == under.selectedContainerColor && drawn.ripple == nil)
      case .none: #expect(drawn == TanreiChipAppearance(tokens: custom, variant: .outlined, look: .selected, state: beneath))
      }
      if feedback != .none {
        #expect(drawn.label == outlined.pressed.selectedLabelColor && drawn.opacity == 0.5)
      }
    }
  }

  /// CHP-9 — the shipped systems: m3-like ripples, cupertino dims, the default overlays; the ripple's own timing.
  @Test("CHP-9 m3-like ripples, cupertino dims, the default overlays")
  func shipped() {
    func pressed(_ system: TanreiSystem) -> TanreiChipAppearance {
      TanreiChipAppearance(tokens: system.chip, variant: .elevated, state: .pressed, feedback: system.behavior.pressedFeedback)
    }
    #expect(pressed(.m3Like).ripple == TanreiSystem.m3Like.chip.variants.elevated.pressed.containerColor)
    #expect(pressed(.cupertino).ripple == nil && pressed(.cupertino).opacity < 1)
    #expect(pressed(.tanrei).ripple == nil && pressed(.tanrei).container == TanreiSystem.tanrei.chip.variants.elevated.pressed.containerColor)
    var tokens = TanreiSystem.m3Like.chip
    tokens.motionFeedbackDuration = 900
    tokens.motionStateEasing = TanreiCubicBezier(0, 0, 1, 1)
    #expect(tokens.rippleGrowth(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.9))
    #expect(tokens.rippleGrowth(reduceMotion: true) == nil)
  }
}

// MARK: - Presets

@MainActor
@Suite("TanreiChip under the shipped presets")
struct TanreiChipPresetTests {
  /// The presets' values: m3-like's outline-variant edge, primary icons, 16 padding and 18 icons at medium, elevated at
  /// level1 rising to level2; cupertino's capsule, a selected chip on the tint, the elevated chip at level1 without a
  /// hover lift, caption for the small label.
  @Test("CHP-3 CHP-12 CHP-16 the presets' own values reach the chip")
  func presetValues() throws {
    let m3 = TanreiSystem.m3Like
    let plain = TanreiChipAppearance(tokens: m3.chip, variant: .outlined, state: .enabled)
    #expect(plain.outline == .role(.outlineVariant) && plain.label == .role(.onSurfaceVariant) && plain.icon == .role(.primary))
    #expect(m3.chip.sizes.medium.containerPaddingInline == 16 && m3.chip.sizes.medium.iconSize == 18)
    #expect(TanreiChipAppearance(tokens: m3.chip, variant: .elevated, state: .enabled).elevation == m3.elevation.level1)
    #expect(TanreiChipAppearance(tokens: m3.chip, variant: .elevated, state: .hovered).elevation == m3.elevation.level2)
    let cupertino = TanreiSystem.cupertino
    #expect(cupertino.chip.containerShape >= cupertino.chip.sizes.medium.containerHeight / 2)
    let on = TanreiChipAppearance(tokens: cupertino.chip, variant: .outlined, look: .selected, state: .enabled)
    #expect(on.container == .role(.primary) && on.label == .role(.onPrimary) && on.icon == .role(.onPrimary))
    #expect(TanreiChipAppearance(tokens: cupertino.chip, variant: .elevated, state: .hovered).elevation == cupertino.elevation.level1)
    #expect(cupertino.chip.sizes.small.labelTypescale == cupertino.typescale.caption)
    for shipped in ShippedSystem.allCases {
      for size in shipped.system.chip.sizes.keys {
        let bitmap = try Snapshot.render(TanreiChip("Add to calendar", size: size, action: {}), theme: theme(shipped.system))
        #expect(visualSize(bitmap).height == shipped.system.chip.sizes[size].containerHeight, "\(shipped) \(size)")
      }
    }
  }
}

// MARK: - Snapshots (one per spec fixture)

@MainActor
@Suite("TanreiChip snapshots")
struct TanreiChipSnapshotTests {
  struct Fixture: Sendable, CustomTestStringConvertible {
    let id: String
    let kind: TanreiChipKind
    var variant: TanreiChipVariant = .outlined
    var size: TanreiChipSize = .medium
    var selected = false
    var disabled = false
    let label: String
    var removeLabel: String?
    var content: String?
    var testDescription: String { id }
  }

  /// Mirrors `fixtures` in specs/chip.spec.json.
  nonisolated static let fixtures: [Fixture] = [
    Fixture(id: "action-outlined", kind: .action, label: "Add to calendar", content: "event"),
    Fixture(id: "action-elevated", kind: .action, variant: .elevated, label: "Add to calendar", content: "event"),
    Fixture(id: "action-small", kind: .action, size: .small, label: "Add to calendar", content: "event"),
    Fixture(id: "action-no-icon", kind: .action, label: "Sounds good"),
    Fixture(id: "action-disabled", kind: .action, disabled: true, label: "Add to calendar", content: "event"),
    Fixture(id: "filter-unselected", kind: .filter, label: "Vegetarian"),
    Fixture(id: "filter-selected", kind: .filter, selected: true, label: "Vegetarian"),
    Fixture(id: "filter-elevated-unselected", kind: .filter, variant: .elevated, label: "Vegetarian"),
    Fixture(id: "filter-elevated-selected", kind: .filter, variant: .elevated, selected: true, label: "Vegetarian"),
    Fixture(id: "filter-selected-small", kind: .filter, size: .small, selected: true, label: "Vegetarian"),
    Fixture(id: "filter-selected-disabled", kind: .filter, selected: true, disabled: true, label: "Vegetarian"),
    Fixture(id: "input", kind: .input, label: "Ada Lovelace", removeLabel: "Remove Ada Lovelace"),
    Fixture(id: "input-avatar", kind: .input, label: "Ada Lovelace", removeLabel: "Remove Ada Lovelace", content: "avatar"),
    Fixture(id: "input-small", kind: .input, size: .small, label: "Ada Lovelace", removeLabel: "Remove Ada Lovelace"),
    Fixture(id: "input-disabled", kind: .input, disabled: true, label: "Ada Lovelace", removeLabel: "Remove Ada Lovelace"),
  ]

  /// Room around the chip for the elevated chip's shadow, as in TanreiFabTests (a test value, not a design value).
  static func shadowRoom(_ system: TanreiSystem) -> CGFloat {
    let layers = system.chip.variants.elevated.hovered.containerElevation
    let reach = layers.map { max(abs($0.x), abs($0.y)) + max(0, $0.spread) + TanreiShadowBlur.extent(cssBlur: $0.blur) }.max() ?? 0
    return max(0, reach - Snapshot.inset).rounded(.up)
  }

  /// The fixture as a product writes it; "event" is the SF Symbol `calendar`, "avatar" the grey disc (file header).
  @ViewBuilder
  static func chip(_ fixture: Fixture) -> some View {
    switch fixture.kind {
    case .action:
      if fixture.content == "event" {
        TanreiChip(fixture.label, variant: fixture.variant, size: fixture.size, action: {}) { Image(systemName: "calendar") }
      } else {
        TanreiChip(fixture.label, variant: fixture.variant, size: fixture.size, action: {})
      }
    case .filter:
      TanreiChip(fixture.label, isSelected: .constant(fixture.selected), variant: fixture.variant, size: fixture.size)
    case .input:
      if fixture.content == "avatar" {
        TanreiChip(fixture.label, removeLabel: fixture.removeLabel ?? "", variant: fixture.variant, size: fixture.size, avatar: { avatarGrey }, onRemove: {})
      } else {
        TanreiChip(fixture.label, removeLabel: fixture.removeLabel ?? "", variant: fixture.variant, size: fixture.size, onRemove: {})
      }
    }
  }

  static func view(_ fixture: Fixture, system: TanreiSystem = .tanrei) -> some View {
    chip(fixture).disabled(fixture.disabled).padding(shadowRoom(system))
  }

  @Test("fixture matches its baseline", arguments: fixtures)
  func fixture(_ fixture: Fixture) throws {
    try Snapshot.assert(Self.view(fixture), named: fixture.id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    let spec = try SpecFixture.load(spec: "chip")
    #expect(spec.map(\.id) == Self.fixtures.map(\.id))
    for (theirs, ours) in zip(spec, Self.fixtures) {
      #expect(theirs.string("kind") == ours.kind.rawValue, "\(ours.id)")
      #expect((theirs.string("variant") ?? "outlined") == ours.variant.rawValue, "\(ours.id)")
      #expect((theirs.string("size") ?? "medium") == ours.size.rawValue, "\(ours.id)")
      #expect((theirs.bool("selected") ?? false) == ours.selected && (theirs.bool("disabled") ?? false) == ours.disabled, "\(ours.id)")
      #expect(theirs.string("label") == ours.label && theirs.string("removeLabel") == ours.removeLabel && theirs.content == ours.content, "\(ours.id)")
    }
  }
}

/// One representative fixture per shipped preset, light scheme.
@MainActor
@Suite("TanreiChip preset snapshots")
struct TanreiChipPresetSnapshotTests {
  /// The input chip with an avatar: the preset's corner, outline, label style, avatar and remove glyph.
  nonisolated static let fixtureId = "input-avatar"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiChipSnapshotTests.fixtures.contains { $0.id == Self.fixtureId })
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try #require(TanreiChipSnapshotTests.fixtures.first { $0.id == Self.fixtureId })
    try Snapshot.assert(
      TanreiChipSnapshotTests.view(fixture, system: preset.system), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
