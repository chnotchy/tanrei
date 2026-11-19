import AcmeFixture
import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/card.spec.json. Each behavior id (CRD-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file. CRD-5, CRD-8, CRD-9 and CRD-10 are BTN-5, BTN-8, BTN-9 and BTN-10 for an
// interactive card: the primitives they rest on are tested once in TanreiButtonTests / TanreiPrimitivesTests; here each
// is proven to reach the card.
//
// Geometry: a render is the card plus `Snapshot.inset` on every side. Most tests fill the card with a `Block` — a
// rectangle of known size drawn in the content color (the foreground style the card hands down) — so every pixel of the
// container, the padding, the content and the outline can be told apart.

private let suiteName = "TanreiCardTests"

/// A test content block: `side` × `height` points, filled with the inherited foreground style.
private struct Block: View {
  var width: CGFloat = 120
  var height: CGFloat = 40
  var body: some View { Rectangle().frame(width: width, height: height) }
}

@MainActor
private final class Counter {
  var count = 0
}

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

private let light = TanreiSystem.tanrei.colors.light

/// The chrome alone, as the style draws it, around a `Block`.
@MainActor
private func chrome(
  _ variant: TanreiCardVariant = .filled, inset: Bool = true, interactive: Bool = true, isPressed: Bool = false, isFocused: Bool = false,
  block: Block = Block()
) -> some View {
  TanreiCardChrome(variant: variant, inset: inset, isInteractive: interactive, isPressed: isPressed, isFocused: isFocused) { block }
}

/// A point of the container's padding: half-way between the container's leading edge and the content, mid-height.
@MainActor
private func paddingPoint(_ tokens: TanreiCardTokens, block: Block = Block()) -> CGPoint {
  CGPoint(x: Snapshot.inset + tokens.containerPadding / 2, y: Snapshot.inset + tokens.containerPadding + block.height / 2)
}

// MARK: - Activation and semantics (CRD-1, CRD-2, CRD-11, CRD-14, CRD-15)

@MainActor
@Suite("TanreiCard activation", .serialized)
struct TanreiCardActivationTests {
  /// CRD-1 — an interactive card emits click once per activation; CRD-2 — disabled, never.
  @Test("CRD-1 CRD-2 activation emits once; never while disabled")
  func activation() {
    let counter = Counter()
    let card = TanreiCard(label: Text("Quarterly report"), action: { counter.count += 1 }) { Block() }
    #expect(card.isInteractive)
    card.activate(isEnabled: true) { counter.count += 1 }
    #expect(counter.count == 1)
    card.activate(isEnabled: false) { counter.count += 1 }
    #expect(counter.count == 1)
  }

  /// CRD-11 — a card without `action:` is not an action; CRD-14 — an interactive card without a label is reported (its
  /// content becomes its name); a labelled one, or a container, is not.
  @Test("CRD-11 CRD-14 a container is not interactive; an unlabelled interactive card is reported")
  func semantics() {
    #expect(!TanreiCard { Block() }.isInteractive)
    let (_, reports) = Reports.collecting { _ = TanreiCard(action: {}) { Block() } }
    #expect(reports.messages.count == 1 && reports.mention("CRD-14") && reports.mention("no label"))
    let (_, silent) = Reports.collecting {
      _ = TanreiCard(label: Text("Quarterly report"), action: {}) { Block() }
      _ = TanreiCard { Block() }
      _ = TanreiCard(label: Text("Quarterly report")) { Block() }
    }
    #expect(silent.messages.isEmpty)
  }

  #if os(macOS)
  /// CRD-1 by pointer, CRD-15: a click anywhere on the content is the card's (the content is part of the one button);
  /// CRD-2: disabled, nothing.
  @Test("CRD-1 CRD-2 CRD-15 a click on the content activates the card once; never when disabled", arguments: [true, false])
  func pointerClick(isEnabled: Bool) {
    let counter = Counter()
    let hosted = HostedView(
      TanreiCard(variant: .outlined, label: Text("Quarterly report"), action: { counter.count += 1 }) { Block() }
        .disabled(!isEnabled).padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: hosted.size.height / 2))  // on the block
    #expect(counter.count == (isEnabled ? 1 : 0))
    hosted.click(at: paddingPoint(Snapshot.theme.system.card))  // on the padding
    #expect(counter.count == (isEnabled ? 2 : 0))
  }

  /// CRD-5 — a card smaller than the minimum target is hit-tested at the target; its container keeps its size.
  @Test("CRD-5 a small card's hit area reaches the minimum target; its container does not grow")
  func extendedHitArea() throws {
    let counter = Counter()
    let system = Snapshot.theme.system
    let side = system.measure.iconSmall
    let small = Block(width: side, height: side)
    let hosted = HostedView(
      TanreiCard(variant: .filled, inset: false, label: Text("Tiny"), action: { counter.count += 1 }) { small }.padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    let minimum = TanreiHitTarget.minimum(in: system.measure)
    #expect(minimum > side)
    let middle = CGPoint(x: hosted.size.width / 2, y: hosted.size.height / 2)
    hosted.click(at: CGPoint(x: middle.x, y: middle.y - side / 2 - (minimum - side) / 4))  // above the container
    #expect(counter.count == 1)
    hosted.click(at: CGPoint(x: middle.x, y: middle.y - minimum / 2 - 2))  // beyond the target
    #expect(counter.count == 1)
    // The container is still `side` tall: just above it is the surface.
    let bitmap = try Snapshot.render(TanreiCard(variant: .filled, inset: false, label: Text("Tiny"), action: {}) { small })
    let height = CGFloat(bitmap.height) / Snapshot.scale
    #expect(pixel(bitmap, x: CGFloat(bitmap.width) / Snapshot.scale / 2, y: height / 2 - side / 2 - 1).isClose(to: light[.surface].rgba8()))
    #expect(pixel(bitmap, x: CGFloat(bitmap.width) / Snapshot.scale / 2, y: height / 2 - side / 2 + 1).isClose(to: light[.onSurface].rgba8()))
  }
  #endif
}

// MARK: - Token bindings (CRD-3, CRD-6, CRD-7, CRD-11, CRD-16)

@MainActor
@Suite("TanreiCard token bindings")
struct TanreiCardTokenBindingTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiCardTokens { system.card }

  private func appearance(
    _ variant: TanreiCardVariant, _ state: TanreiInteraction, interactive: Bool = true, tokens: TanreiCardTokens? = nil
  ) -> TanreiCardAppearance {
    TanreiCardAppearance(tokens: tokens ?? self.tokens, variant: variant, isInteractive: interactive, state: state)
  }

  /// At rest: elevated is surface-container-lowest at level2;
  /// filled surface-container-highest, flat; outlined surface with an outline-variant hairline; content on-surface.
  @Test("CRD-3 at rest each variant binds the expected values")
  func rest() {
    let elevated = appearance(.elevated, .enabled)
    let filled = appearance(.filled, .enabled)
    let outlined = appearance(.outlined, .enabled)
    #expect(elevated.container == .role(.surfaceContainerLowest) && elevated.elevation == system.elevation.level2 && elevated.outline == TanreiPaint.none)
    #expect(filled.container == .role(.surfaceContainerHighest) && filled.elevation == system.elevation.level0)
    #expect(outlined.container == .role(.surface) && outlined.outline == .role(.outlineVariant) && outlined.outlineWidth == system.measure.borderHairline)
    for variant in TanreiCardVariant.core {
      let rest = appearance(variant, .enabled)
      #expect(rest.content == .role(.onSurface) && rest.opacity == 1 && rest.ripple == nil)
      #expect(rest.cornerRadius == system.shape.medium && rest.padding == system.space.space200)
      #expect(tokens.variants[variant].enabled.stateLayerColor == rest.content)
    }
    #expect(TanreiCardVariant.fallback == .outlined && TanreiCardVariant.core == [.elevated, .filled, .outlined])
  }

  /// CRD-3 — hovered, focused and pressed mix the state-layer color into the container; the elevated card rises to
  /// level3 while hovered; the content and outline keep their resting values.
  @Test("CRD-3 each state binds that state's tokens", arguments: TanreiCardVariant.core)
  func states(variant: TanreiCardVariant) {
    let rest = appearance(variant, .enabled)
    let layer = tokens.variants[variant].enabled.stateLayerColor
    for (state, amount) in [(TanreiInteraction.hovered, system.state.hoverStateLayerOpacity), (.focused, system.state.focusStateLayerOpacity), (.pressed, system.state.pressedStateLayerOpacity)] {
      let drawn = appearance(variant, state)
      #expect(drawn.container == .mix(base: rest.container, with: layer, amount: amount))
      #expect(drawn.content == rest.content && drawn.outline == rest.outline && drawn.opacity == 1)
      #expect(drawn.elevation == tokens.variants[variant][state: state].containerElevation)
    }
    #expect(appearance(.elevated, .hovered).elevation == system.elevation.level3)
  }

  /// CRD-3 (verify) — under acme, hovered, focused and pressed are three different values.
  @Test("CRD-3 under acme, hovered, focused and pressed differ")
  func acme() {
    for variant in TanreiCardVariant.core {
      let containers = [TanreiInteraction.hovered, .focused, .pressed].map { TanreiCardAppearance(tokens: TanreiSystem.acme.card, variant: variant, state: $0).container }
      #expect(Set(containers.map { "\($0)" }).count == 3, "\(variant)")
    }
  }

  /// CRD-6 — disabled: the colors of rest, the elevated card at level1, and the disabled opacity on the whole card.
  @Test("CRD-6 disabled bindings", arguments: TanreiCardVariant.core)
  func disabled(variant: TanreiCardVariant) {
    let rest = appearance(variant, .enabled)
    let drawn = appearance(variant, .disabled)
    #expect(drawn.container == rest.container && drawn.content == rest.content && drawn.outline == rest.outline)
    #expect(drawn.opacity == tokens.disabled.opacity && drawn.opacity == system.state.disabledContentOpacity)
    #expect(drawn.elevation == tokens.variants[variant].disabled.containerElevation)
    #expect(appearance(.elevated, .disabled).elevation == system.elevation.level1)
  }

  /// CRD-11 — a card that is not interactive is drawn at rest in every state, disabled included.
  @Test("CRD-11 a container ignores every state", arguments: TanreiInteraction.allCases)
  func notInteractive(state: TanreiInteraction) {
    for variant in TanreiCardVariant.core {
      #expect(appearance(variant, state, interactive: false) == appearance(variant, .enabled))
    }
  }

  /// CRD-3 CRD-6 — the values drive the result.
  @Test("CRD-3 CRD-6 a modified system changes what each state resolves to")
  func modifiedSystem() {
    var custom = tokens
    custom.variants.filled.hovered.containerColor = .role(.error)
    custom.variants.filled.focused.contentColor = .role(.warning)
    custom.variants.outlined.pressed.outlineColor = .role(.success)
    custom.variants.elevated.pressed.containerElevation = system.elevation.level4
    custom.pressed.opacity = 0.5
    custom.containerPadding = 4
    custom.containerShape = 20
    custom.outlineWidth = 3
    #expect(appearance(.filled, .hovered, tokens: custom).container == .role(.error))
    #expect(appearance(.filled, .focused, tokens: custom).content == .role(.warning))
    #expect(appearance(.outlined, .pressed, tokens: custom).outline == .role(.success))
    #expect(appearance(.elevated, .pressed, tokens: custom).elevation == system.elevation.level4)
    #expect(appearance(.filled, .pressed, tokens: custom).opacity == 0.5)
    let geometry = appearance(.outlined, .enabled, tokens: custom)
    #expect(geometry.padding == 4 && geometry.cornerRadius == 20 && geometry.outlineWidth == 3)
    #expect(TanreiCardAppearance(tokens: custom, variant: .outlined, inset: false, state: .enabled).padding == 0)
    #expect(appearance(.filled, .enabled, tokens: custom).container == appearance(.filled, .enabled).container)
  }

  /// CRD-7 — a variant the system does not have draws the default value's tokens and is reported; a value a system adds
  /// is used.
  @Test("CRD-7 an unknown variant binds the default's tokens and is reported", arguments: TanreiInteraction.allCases)
  func unknownVariant(state: TanreiInteraction) {
    let unknown = TanreiCardVariant(rawValue: "sparkly")
    let (value, reports) = Reports.collecting { TanreiCardAppearance(tokens: tokens, variant: unknown, state: state) }
    #expect(value == TanreiCardAppearance(tokens: tokens, variant: .outlined, state: state))
    #expect(reports.mention("card variant \"sparkly\""))
    var custom = tokens
    var added = tokens.variants.filled
    added.enabled.containerColor = .role(.warning)
    custom.variants.extra[unknown] = added
    let (value2, silent) = Reports.collecting { TanreiCardAppearance(tokens: custom, variant: unknown, state: .enabled) }
    #expect(value2.container == .role(.warning) && silent.messages.isEmpty)
  }

  /// CRD-16 — state changes move over the card's state motion; at once under Reduce Motion.
  @Test("CRD-16 the state motion comes from the tokens; none under Reduce Motion")
  func motion() {
    var custom = tokens
    custom.motionStateDuration = 400
    custom.motionStateEasing = TanreiCubicBezier(0, 0, 1, 1)
    #expect(custom.stateMotion(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.4))
    #expect(custom.stateMotion(reduceMotion: true) == nil && custom.rippleGrowth(reduceMotion: true) == nil)
    custom.motionFeedbackDuration = 900
    #expect(custom.rippleGrowth(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.9))
  }
}

// MARK: - Rendered (CRD-3, CRD-4, CRD-6, CRD-10, CRD-11, CRD-12, CRD-13, CRD-17)

@MainActor
@Suite("TanreiCard rendered")
struct TanreiCardRenderedTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiCardTokens { system.card }

  /// CRD-12 — inset: the content sits `container.padding` inside the container on every side; the card is the
  /// content plus the padding (no height of its own). Flush: the content reaches the edges, clipped to the corners.
  @Test("CRD-12 CRD-13 the padding, the content color, the clip and the card's size")
  func insetAndClip() throws {
    let block = Block()
    let inset = try Snapshot.render(chrome(.filled))
    let padding = tokens.containerPadding
    #expect(CGFloat(inset.width) == (block.width + 2 * padding + 2 * Snapshot.inset) * Snapshot.scale)
    #expect(CGFloat(inset.height) == (block.height + 2 * padding + 2 * Snapshot.inset) * Snapshot.scale)
    let pad = paddingPoint(tokens)
    #expect(pixel(inset, x: pad.x, y: pad.y).isClose(to: light[.surfaceContainerHighest].rgba8()))
    // CRD-13: the content is drawn in the content color.
    #expect(pixel(inset, x: Snapshot.inset + padding + 1, y: pad.y).isClose(to: light[.onSurface].rgba8()))
    // Flush: the content at the edge, and cut by the corner.
    let flush = try Snapshot.render(chrome(.filled, inset: false))
    #expect(CGFloat(flush.width) == (block.width + 2 * Snapshot.inset) * Snapshot.scale)
    #expect(pixel(flush, x: Snapshot.inset + 1, y: Snapshot.inset + block.height / 2).isClose(to: light[.onSurface].rgba8()))
    #expect(pixel(flush, x: Snapshot.inset + 0.5, y: Snapshot.inset + 0.5).isClose(to: light[.surface].rgba8()))
  }

  /// CRD-12 — the outline of the outlined variant lies above the content.
  @Test("CRD-12 the outline is drawn above the content")
  func outlineAbove() throws {
    var custom = system
    custom.card.outlineWidth = 3
    custom.card.variants.outlined.enabled.outlineColor = .role(.error)
    let flush = try Snapshot.render(chrome(.outlined, inset: false), theme: theme(custom))
    #expect(pixel(flush, x: Snapshot.inset + 1.5, y: Snapshot.inset + Block().height / 2).isClose(to: light[.error].rgba8()))
    #expect(pixel(flush, x: Snapshot.inset + 4, y: Snapshot.inset + Block().height / 2).isClose(to: light[.onSurface].rgba8()))
  }

  /// CRD-13 — plain text given as content takes `sys.typescale.body`: the card hands its content the body font.
  @Test("CRD-13 the content's font is sys.typescale.body")
  func bodyFont() throws {
    final class Probe: @unchecked Sendable {
      var font: Font?
    }
    struct Reader: View {
      let probe: Probe
      @Environment(\.font) private var font
      var body: some View {
        probe.font = font
        return Color.clear.frame(width: 1, height: 1)
      }
    }
    let probe = Probe()
    _ = try Snapshot.render(TanreiCardChrome(variant: .filled, inset: true, isInteractive: false, isPressed: false, isFocused: false) { Reader(probe: probe) })
    let expected = system.typescale.body.resolved(policy: Snapshot.theme.fontFamilyPolicy, dynamicTypeSize: .large).font
    #expect(probe.font == expected)
  }

  /// CRD-3 — the state shows on the container: hovered/focused/pressed paint the container of that state.
  @Test("CRD-3 the state paints the container; pressed wins over focused")
  func stateContainer() throws {
    let pad = paddingPoint(tokens)
    let pressed = try Snapshot.render(chrome(.filled, isPressed: true))
    #expect(pixel(pressed, x: pad.x, y: pad.y).isClose(to: light[tokens.variants.filled.pressed.containerColor].rgba8()))
    var custom = system
    custom.card.variants.filled.pressed.containerColor = .role(.error)
    custom.card.variants.filled.focused.containerColor = .role(.success)
    #expect(pixel(try Snapshot.render(chrome(.filled, isPressed: true, isFocused: true), theme: theme(custom)), x: pad.x, y: pad.y).isClose(to: light[.error].rgba8()))
    #expect(pixel(try Snapshot.render(chrome(.filled, isFocused: true), theme: theme(custom)), x: pad.x, y: pad.y).isClose(to: light[.success].rgba8()))
  }

  /// CRD-11 — a card that is not interactive draws no state: pressed, focused and disabled render as rest.
  @Test("CRD-11 a container renders at rest whatever its state")
  func containerIgnoresStates() throws {
    let rest = try Snapshot.renderExact(chrome(.elevated, interactive: false))
    #expect(try Snapshot.renderExact(chrome(.elevated, interactive: false, isPressed: true, isFocused: true)).mismatch(against: rest, channelTolerance: 0) == 0)
    #expect(try Snapshot.renderExact(TanreiCard(variant: .elevated) { Block() }.disabled(true)).mismatch(against: try Snapshot.renderExact(TanreiCard(variant: .elevated) { Block() }), channelTolerance: 0) == 0)
  }

  /// CRD-4 — the focus ring around the container of an interactive card; never for a container, never when disabled,
  /// never dimmed; outside the layout.
  @Test("CRD-4 the focus ring")
  func focusRing() throws {
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.containerShape, measure: system.measure)
    let x = Snapshot.inset - metrics.outerCenterlineOutset
    let y = paddingPoint(tokens).y
    let focused = try Snapshot.render(chrome(.filled, isFocused: true))
    #expect(pixel(focused, x: x, y: y).isClose(to: light[.focusRing].rgba8()))
    #expect(!pixel(try Snapshot.render(chrome(.filled, interactive: false, isFocused: true)), x: x, y: y).isClose(to: light[.focusRing].rgba8()))
    #expect(!pixel(try Snapshot.render(chrome(.filled, isFocused: true).disabled(true)), x: x, y: y).isClose(to: light[.focusRing].rgba8()))
    var dim = system
    dim.card.focused.opacity = 0.3
    #expect(pixel(try Snapshot.render(chrome(.filled, isFocused: true), theme: theme(dim)), x: x, y: y).isClose(to: light[.focusRing].rgba8()))
    #expect(focused.width == (try Snapshot.render(chrome(.filled))).width)
  }

  /// CRD-6 — rendered: the disabled opacity dims the whole card, content included.
  @Test("CRD-6 disabled dims the whole card")
  func disabledRender() throws {
    var custom = system
    custom.card.disabled.opacity = 0.5
    custom.card.variants.filled.disabled.containerColor = .role(.error)
    custom.card.variants.filled.disabled.contentColor = .role(.primary)
    let bitmap = try Snapshot.render(chrome(.filled).disabled(true), theme: theme(custom))
    let pad = paddingPoint(tokens)
    #expect(pixel(bitmap, x: pad.x, y: pad.y).isClose(to: light[.error].opacity(0.5).rgba8(over: light[.surface])))
    #expect(pixel(bitmap, x: Snapshot.inset + tokens.containerPadding + 2, y: pad.y).isClose(to: light[.primary].opacity(0.5).rgba8(over: light[.surface])))
  }

  /// CRD-6 CRD-3 — the elevation is the state's: the elevated card casts a shadow at rest, a filled one does not.
  @Test("CRD-3 CRD-6 the elevation of the state is drawn")
  func elevation() throws {
    let below = CGPoint(x: Snapshot.inset + 60, y: Snapshot.inset + 2 * tokens.containerPadding + Block().height + 2)
    let elevated = try Snapshot.render(chrome(.elevated))
    let filled = try Snapshot.render(chrome(.filled))
    #expect(!pixel(elevated, x: below.x, y: below.y).isClose(to: light[.surface].rgba8(), tolerance: 0))
    #expect(pixel(filled, x: below.x, y: below.y).isClose(to: light[.surface].rgba8(), tolerance: 0))
    // The shadow is the level's: a modified system with no shadow draws none.
    var flat = system
    flat.card.variants.elevated.enabled.containerElevation = system.elevation.level0
    #expect(pixel(try Snapshot.render(chrome(.elevated), theme: theme(flat)), x: below.x, y: below.y).isClose(to: light[.surface].rgba8(), tolerance: 0))
  }

  /// CRD-10 — the corners follow the corner smoothing; focus follows the focus style.
  @Test("CRD-10 corner smoothing and focus style reach the card")
  func cornersAndFocusStyle() throws {
    func render(_ amount: Double, focused: Bool = false, style: TanreiFocusStyle = .ring) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      custom.card.containerShape = 16
      custom.behavior.focusStyle = style
      return try Snapshot.renderExact(chrome(.filled, isFocused: focused), theme: theme(custom))
    }
    let continuous = try render(0.6)
    #expect(try render(0).mismatch(against: continuous, channelTolerance: 0) > 0)
    #expect(try render(1).mismatch(against: continuous, channelTolerance: 0) == 0)
    #expect(try render(0.6, focused: true, style: .glow).mismatch(against: try render(0.6, focused: true, style: .ring), channelTolerance: 0) > 0)
  }

  /// CRD-17 — right to left, the content follows the layout direction (the card does not mirror it itself), and the
  /// padding is logical.
  @Test("CRD-17 right to left: logical padding, the content follows the direction")
  func rightToLeft() throws {
    let content = HStack(spacing: 0) {
      Rectangle().frame(width: 20, height: 20)
      Color.clear.frame(width: 100, height: 20)
    }
    let rtl = try Snapshot.render(
      TanreiCardChrome(variant: .filled, inset: true, isInteractive: false, isPressed: false, isFocused: false) { content }
        .environment(\.layoutDirection, .rightToLeft))
    let width = CGFloat(rtl.width) / Snapshot.scale
    let y = Snapshot.inset + tokens.containerPadding + 10
    #expect(pixel(rtl, x: width - Snapshot.inset - tokens.containerPadding - 2, y: y).isClose(to: light[.onSurface].rgba8()))
    #expect(pixel(rtl, x: width - Snapshot.inset - tokens.containerPadding / 2, y: y).isClose(to: light[.surfaceContainerHighest].rgba8()))
    #expect(pixel(rtl, x: Snapshot.inset + tokens.containerPadding + 2, y: y).isClose(to: light[.surfaceContainerHighest].rgba8()))
  }

  /// "Text size does not clip a card: it grows with its content at 200% text size."
  @Test("the card grows with Dynamic Type")
  func dynamicType() throws {
    func render(_ size: DynamicTypeSize) throws -> Bitmap {
      try Snapshot.render(TanreiCard { Text(verbatim: "Quarterly report").tanreiTextStyle(TanreiSystem.tanrei.typescale.body) }.environment(\.dynamicTypeSize, size))
    }
    let regular = try render(.large)
    let huge = try render(.accessibility5)
    #expect(huge.height >= regular.height)
  }
}

// MARK: - Press (CRD-8, CRD-9)

@MainActor
@Suite("TanreiCard press", .serialized)
struct TanreiCardPressTests {
  private func distinct(_ feedback: TanreiPressedFeedback) -> TanreiSystem {
    var system = TanreiSystem.tanrei
    system.behavior.pressedFeedback = feedback
    system.card.variants.filled.pressed.containerColor = .role(.error)
    system.card.variants.filled.pressed.contentColor = .role(.warning)
    system.card.variants.filled.focused.containerColor = .role(.success)
    system.card.pressed.opacity = 0.5
    return system
  }

  /// CRD-9 — which tokens a press reads under each choice.
  @Test("CRD-9 each choice binds the pressed tokens its own way", arguments: TanreiPressedFeedback.allCases)
  func bindings(feedback: TanreiPressedFeedback) {
    let tokens = distinct(feedback).card
    let filled = tokens.variants.filled
    for beneath in [TanreiInteraction.enabled, .hovered, .focused] {
      let appearance = TanreiCardAppearance(tokens: tokens, variant: .filled, state: .pressed, feedback: feedback, beneath: beneath)
      switch feedback {
      case .overlay:
        #expect(appearance.container == filled.pressed.containerColor && appearance.ripple == nil && appearance.content == filled.pressed.contentColor)
      case .ripple:
        #expect(appearance.container == filled[state: beneath].containerColor && appearance.ripple == filled.pressed.containerColor)
        #expect(appearance.content == filled.pressed.contentColor && appearance.opacity == tokens.pressed.opacity)
      case .dim:
        #expect(appearance.container == filled[state: beneath].containerColor && appearance.ripple == nil && appearance.opacity == tokens.pressed.opacity)
      case .none:
        #expect(appearance == TanreiCardAppearance(tokens: tokens, variant: .filled, state: beneath))
      }
    }
  }

  /// CRD-9 — rendered under a system that sets each value.
  @Test("CRD-9 each choice renders as it says", arguments: TanreiPressedFeedback.allCases)
  func rendered(feedback: TanreiPressedFeedback) throws {
    let system = distinct(feedback)
    let colors = system.colors.light
    let pad = paddingPoint(system.card)
    let actual = pixel(try Snapshot.render(chrome(.filled, isPressed: true), theme: theme(system)), x: pad.x, y: pad.y)
    switch feedback {
    case .overlay, .ripple: #expect(actual.isClose(to: colors[.error].opacity(0.5).rgba8(over: colors[.surface])))
    case .dim: #expect(actual.isClose(to: colors[.surfaceContainerHighest].opacity(0.5).rgba8(over: colors[.surface])))
    case .none: #expect(actual.isClose(to: colors[.surfaceContainerHighest].rgba8()))
    }
  }

  /// CRD-9 — the shipped systems: m3-like ripples, cupertino dims, the default overlays.
  @Test("CRD-9 m3-like ripples, cupertino dims, the default overlays")
  func shipped() {
    func pressed(_ system: TanreiSystem) -> TanreiCardAppearance {
      TanreiCardAppearance(tokens: system.card, variant: .filled, state: .pressed, feedback: system.behavior.pressedFeedback)
    }
    #expect(pressed(.m3Like).ripple == TanreiSystem.m3Like.card.variants.filled.pressed.containerColor)
    #expect(pressed(.cupertino).ripple == nil && pressed(.cupertino).opacity < 1)
    #expect(pressed(.tanrei).ripple == nil)
  }

  #if os(macOS)
  /// CRD-8 end to end: pressed at once, held for press-hold after a quick click, then at rest; one click (CRD-1).
  @Test("CRD-8 CRD-1 a quick click shows the pressed state at once and keeps it for press-hold")
  func quickClickIsHeld() async throws {
    var system = TanreiSystem.tanrei
    system.motion.duration.pressHold = 1500
    system.card.motionStateDuration = 0
    system.card.variants.filled.pressed.containerColor = .role(.error)
    let colors = system.colors.light
    let counter = Counter()
    let hosted = HostedView(
      TanreiCard(variant: .filled, label: Text("Report"), action: { counter.count += 1 }) { Block() }.padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let pad = paddingPoint(system.card)
    #expect(try #require(hosted.color(at: pad)).isClose(to: colors[.surfaceContainerHighest].rgba8()))
    hosted.mouse(.leftMouseDown, at: pad)
    hosted.settle()
    #expect(try #require(hosted.color(at: pad)).isClose(to: colors[.error].rgba8()))
    hosted.mouse(.leftMouseUp, at: pad)
    hosted.settle()
    #expect(counter.count == 1)
    #expect(try #require(hosted.color(at: pad)).isClose(to: colors[.error].rgba8()))
    // The hold ends once press-hold has passed (checked with slack: the machine may be loaded).
    #expect(await hosted.wait(atMost: 6) { hosted.color(at: pad)?.isClose(to: colors[.error].rgba8()) == false })
  }

  /// CRD-1 under `ripple`: watching the point of contact does not take the click away.
  @Test("CRD-1 CRD-9 a click still emits exactly once under ripple")
  func clickUnderRipple() {
    let counter = Counter()
    let hosted = HostedView(TanreiCard(label: Text("Report"), action: { counter.count += 1 }) { Block() }.padding(Snapshot.inset).tanreiTheme(theme(.m3Like)))
    hosted.click(at: CGPoint(x: hosted.size.width / 2, y: hosted.size.height / 2))
    #expect(counter.count == 1)
  }
  #endif
}

// MARK: - Presets

@MainActor
@Suite("TanreiCard under the shipped presets")
struct TanreiCardPresetTests {
  /// The presets' values: m3-like and cupertino rest at level1; cupertino never moves (no hover on
  /// Apple platforms), m3-like rises to level2 on hover as Material does, and neither drops its shadow when disabled.
  @Test("CRD-3 CRD-6 the presets' elevated card rests at level1")
  func presetElevation() {
    for system in [TanreiSystem.m3Like, .cupertino] {
      for state in TanreiInteraction.allCases where state != .hovered {
        #expect(TanreiCardAppearance(tokens: system.card, variant: .elevated, state: state).elevation == system.elevation.level1, "\(system.id) \(state)")
      }
    }
    #expect(TanreiCardAppearance(tokens: TanreiSystem.cupertino.card, variant: .elevated, state: .hovered).elevation == TanreiSystem.cupertino.elevation.level1)
    #expect(TanreiCardAppearance(tokens: TanreiSystem.m3Like.card, variant: .elevated, state: .hovered).elevation == TanreiSystem.m3Like.elevation.level2)
  }
}

// MARK: - Snapshots (one per spec fixture)

@MainActor
@Suite("TanreiCard snapshots")
struct TanreiCardSnapshotTests {
  struct Fixture: Sendable, CustomTestStringConvertible {
    let id: String
    let variant: TanreiCardVariant
    var inset = true
    var interactive = false
    var disabled = false
    var label: String?
    var testDescription: String { id }
  }

  /// Mirrors `fixtures` in specs/card.spec.json.
  nonisolated static let fixtures: [Fixture] = [
    Fixture(id: "outlined", variant: .outlined),
    Fixture(id: "filled", variant: .filled),
    Fixture(id: "elevated", variant: .elevated),
    Fixture(id: "outlined-flush", variant: .outlined, inset: false),
    Fixture(id: "outlined-interactive", variant: .outlined, interactive: true, label: "Quarterly report"),
    Fixture(id: "outlined-disabled", variant: .outlined, interactive: true, disabled: true, label: "Quarterly report"),
    Fixture(id: "elevated-disabled", variant: .elevated, interactive: true, disabled: true, label: "Quarterly report"),
  ]

  static let content = "Quarterly report. Revenue grew 12% over the previous quarter."
  /// The width a product would lay the card out at (a phone column): the text wraps, as on the other platforms.
  static let width: CGFloat = 328

  /// The fixture as a product writes it: the content text, filling the card's width.
  static func view(_ fixture: Fixture) -> some View {
    let text = Text(Self.content).frame(maxWidth: .infinity, alignment: .leading)
    return Group {
      if fixture.interactive {
        TanreiCard(variant: fixture.variant, inset: fixture.inset, label: fixture.label.map { Text($0) }, action: {}) { text }
      } else {
        TanreiCard(variant: fixture.variant, inset: fixture.inset, label: fixture.label.map { Text($0) }) { text }
      }
    }
    .disabled(fixture.disabled)
    .frame(width: Self.width)
  }

  @Test("fixture matches its baseline", arguments: fixtures)
  func fixture(_ fixture: Fixture) throws {
    try Snapshot.assert(Self.view(fixture), named: fixture.id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    let spec = try SpecFixture.load(spec: "card")
    #expect(spec.map(\.id) == Self.fixtures.map(\.id))
    for (theirs, ours) in zip(spec, Self.fixtures) {
      #expect(theirs.string("variant") == ours.variant.rawValue, "\(ours.id)")
      #expect((theirs.bool("inset") ?? true) == ours.inset, "\(ours.id)")
      #expect((theirs.bool("interactive") ?? false) == ours.interactive, "\(ours.id)")
      #expect((theirs.bool("disabled") ?? false) == ours.disabled, "\(ours.id)")
      #expect(theirs.string("label") == ours.label, "\(ours.id)")
      #expect(theirs.content == Self.content, "\(ours.id)")
    }
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiCardTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiCard preset snapshots")
struct TanreiCardPresetSnapshotTests {
  /// Elevated: it shows the preset's container, shadow, corner, padding and content type.
  nonisolated static let fixtureId = "elevated"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiCardSnapshotTests.fixtures.contains { $0.id == Self.fixtureId })
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try #require(TanreiCardSnapshotTests.fixtures.first { $0.id == Self.fixtureId })
    try Snapshot.assert(TanreiCardSnapshotTests.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
