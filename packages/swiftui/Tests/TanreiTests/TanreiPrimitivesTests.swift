import SwiftUI
import Testing

@testable import Tanrei

// On the main actor: its tests read whole shipped systems, whose one-time initialization and copies need more
// stack than a cooperative thread has.
@MainActor
@Suite("Tanrei primitives")
struct TanreiPrimitivesTests {
  let system = TanreiSystem.tanrei

  /// BTN-9 as a primitive: which state's tokens draw which layer, for every pressable component.
  @Test("pressed feedback: which state draws the control, its container and its ripple", arguments: TanreiPressedFeedback.allCases)
  func pressLayers(feedback: TanreiPressedFeedback) {
    for beneath in [TanreiInteraction.enabled, .hovered, .focused] {
      let layers = TanreiPressLayers(state: .pressed, feedback: feedback, beneath: beneath)
      switch feedback {
      case .overlay:
        #expect(layers == TanreiPressLayers(state: .pressed, feedback: .overlay, beneath: .enabled))
        #expect(layers.state == .pressed && layers.container == .pressed && layers.ripple == nil)
      case .ripple:
        #expect(layers.state == .pressed && layers.container == beneath && layers.ripple == .pressed)
      case .dim:
        #expect(layers.state == .pressed && layers.container == beneath && layers.ripple == nil)
      case .none:
        #expect(layers.state == beneath && layers.container == beneath && layers.ripple == nil)
      }
    }
    // A state that is not a press is drawn from its own tokens whatever the choice.
    for state in TanreiInteraction.allCases where state != .pressed {
      let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: .enabled)
      #expect(layers.state == state && layers.container == state && layers.ripple == nil)
    }
  }

  @Test("elevation: the first layer is the ring, the rest are shadows")
  func elevationPlan() {
    let level0 = TanreiElevationPlan(layers: system.elevation.level0)
    #expect(level0.ring == nil && level0.shadows.isEmpty)

    let level1 = TanreiElevationPlan(layers: system.elevation.level1)
    #expect(level1.ring?.role == .elevationRing && level1.shadows.isEmpty)

    let level2 = TanreiElevationPlan(layers: system.elevation.level2)
    #expect(level2.ring == system.elevation.level2.first)
    #expect(level2.shadows == Array(system.elevation.level2.dropFirst()))

    let level5 = TanreiElevationPlan(layers: system.elevation.level5)
    #expect(level5.ring != nil && level5.shadows.count == system.elevation.level5.count - 1)

    let shadow = TanreiShadowLayer(x: 0, y: 4, blur: 8, spread: -4, role: .elevationShadow1)
    #expect(TanreiElevationPlan.shadowRadius(shadow) == 4)
    #expect(TanreiElevationPlan(layers: [shadow]).ring == nil)
  }

  /// `elevation.level0` is an empty list in every system: nothing to
  /// plan, nothing to draw — not a no-op shadow.
  @Test("level0 is empty and draws nothing", arguments: ShippedSystem.allCases)
  @MainActor
  func level0(shipped: ShippedSystem) throws {
    let system = shipped.system
    #expect(system.elevation.level0.isEmpty)
    #expect(system.elevation["level0"] == [])
    let plan = TanreiElevationPlan(layers: system.elevation.level0)
    #expect(plan.ring == nil && plan.shadows.isEmpty)
    var theme = Snapshot.theme
    theme.system = system
    let colors = system.colors.light
    let fill = colors[.surfaceContainerLowest]
    let shape = RoundedRectangle(cornerRadius: system.shape.small, style: system.shape.roundedCornerStyle)
    let surface = try Snapshot.renderExact(TanreiElevationSurface(system.elevation.level0, fill: fill, cornerRadius: system.shape.small).frame(width: 80, height: 40), theme: theme)
    let plain = try Snapshot.renderExact(shape.fill(fill).frame(width: 80, height: 40), theme: theme)
    #expect(surface.mismatch(against: plain, channelTolerance: 0) == 0)
  }

  // MARK: shadow blur

  /// The documented conversion: a token blur is a CSS box-shadow blur radius, σ = blur / 2, and
  /// SwiftUI's shadow radius is σ.
  @Test("a CSS blur converts to σ = blur / 2, which is the SwiftUI shadow radius")
  func blurConversion() {
    #expect(TanreiShadowBlur.cssBlurPerSigma == 2)
    #expect(TanreiShadowBlur.sigma(cssBlur: 8) == 4)
    #expect(TanreiShadowBlur.sigma(cssBlur: 3) == 1.5)
    #expect(TanreiShadowBlur.sigma(cssBlur: 0) == 0)
    #expect(TanreiShadowBlur.sigma(cssBlur: -2) == 0)  // CSS does not allow a negative blur
    #expect(TanreiShadowBlur.shadowRadius(cssBlur: 8) == TanreiShadowBlur.sigma(cssBlur: 8))
    #expect(TanreiShadowBlur.extent(cssBlur: 8) == 12)
    // Every layer of every shipped level goes through it.
    for shipped in ShippedSystem.allCases {
      for key in ["level0", "level1", "level2", "level3", "level4", "level5"] {
        for layer in shipped.system.elevation[key] ?? [] { #expect(TanreiElevationPlan.shadowRadius(layer) == layer.blur / 2) }
      }
    }
  }

  /// MEASURED, so that "SwiftUI's radius is σ" is not an assumption: a long straight edge casts a
  /// shadow whose profile across the edge is a Gaussian CDF; its 15.87 % and 84.13 % crossings are
  /// 2σ apart. With radius = blur / 2 the measured σ must be blur / 2.
  @Test("measured: a shadow drawn with the converted radius has σ = blur / 2", arguments: [4, 8, 16] as [CGFloat])
  @MainActor
  func shadowRadiusIsSigma(blur: CGFloat) throws {
    let width: CGFloat = 160
    let height: CGFloat = 40
    let view = Canvas { context, size in
      context.addFilter(.shadow(color: .black, radius: TanreiShadowBlur.shadowRadius(cssBlur: blur), x: 0, y: 0, options: .shadowOnly))
      // An opaque half plane: its edge runs down the middle, far from every other edge.
      context.fill(Path(CGRect(x: -400, y: -400, width: 400 + size.width / 2, height: size.height + 800)), with: .color(.black))
    }
    .frame(width: width, height: height)
    .background(Color.white)
    let renderer = ImageRenderer(content: view)
    renderer.scale = 4
    let bitmap = try #require(renderer.cgImage.flatMap { Bitmap($0) })
    let row = bitmap.height / 2
    let darkness = (0..<bitmap.width).map { 1 - Double(bitmap[$0, row].r) / 255 }
    func crossing(_ level: Double) -> Double? {
      for x in 1..<darkness.count where (darkness[x - 1] - level) * (darkness[x] - level) <= 0 && darkness[x - 1] != darkness[x] {
        return Double(x - 1) + (darkness[x - 1] - level) / (darkness[x - 1] - darkness[x])
      }
      return nil
    }
    let upper = try #require(crossing(0.8413))
    let lower = try #require(crossing(0.1587))
    let sigma = abs(lower - upper) / 2 / 4
    #expect(abs(sigma - Double(blur) / 2) < 0.06 * Double(blur) / 2 + 0.05, "blur \(blur): measured σ \(sigma)")
  }

  // MARK: springs

  /// `sys.motion.spring` has the one shape of everything a layer may extend: named core fields, `extra`,
  /// a keyed lookup — at both levels (scheme → name).
  @Test("springs accept added names: named core fields, extra, a keyed lookup")
  func springsAreOpen() {
    var springs = system.motion.spring
    #expect(springs["standard"] == springs.standard && springs["expressive"] == springs.expressive)
    #expect(springs.standard["fast-effects"] == springs.standard.fastEffects)
    #expect(springs.standard["wobble"] == nil && springs["playful"] == nil)
    #expect(springs.extra.isEmpty && springs.standard.extra.isEmpty)

    let wobble = TanreiSpringSpec(damping: 0.4, stiffness: 300, easing: TanreiCubicBezier(0.3, 1.5, 0.3, 1), durationMs: 600)
    springs.standard.extra["wobble"] = wobble
    #expect(springs.standard["wobble"] == wobble && springs.expressive["wobble"] == nil)
    var playful = springs.expressive
    playful.fastSpatial = wobble
    springs.extra["playful"] = playful
    #expect(springs["playful"]?.fastSpatial == wobble)
    #expect(TanreiMotion.animation(spring: wobble, reduceMotion: false) != nil)
  }

  @Test("focus indicator: offset, optional inner stroke, outer stroke — concentric with the corner")
  func focusRingMetrics() {
    let radius = system.shape.small
    let measure = system.measure
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: radius, measure: measure)
    #expect(metrics.offset == measure.focusOffset)
    #expect(metrics.innerWidth == measure.focusInnerWidth)
    #expect(metrics.outerWidth == measure.focusOuterWidth)
    // The default system has no inner stroke: a gap, then one ring.
    #expect(!metrics.hasInnerStroke)
    #expect(metrics.outerCenterlineOutset == measure.focusOffset + measure.focusOuterWidth / 2)
    #expect(metrics.outerOutset == measure.focusOffset + measure.focusOuterWidth)
    #expect(metrics.cornerRadius(atOutset: metrics.outerCenterlineOutset) == radius + metrics.outerCenterlineOutset)

    // The values drive the geometry: an inner stroke pushes the outer stroke outwards.
    var twoTone = measure
    twoTone.focusInnerWidth = 1
    twoTone.focusOuterWidth = 3
    let double = TanreiFocusRingMetrics(containerCornerRadius: radius, measure: twoTone)
    #expect(double.hasInnerStroke)
    #expect(double.innerCenterlineOutset == measure.focusOffset + 0.5)
    #expect(double.innerEdgeOutset == measure.focusOffset + 1)
    #expect(double.outerCenterlineOutset == measure.focusOffset + 1 + 1.5)
    #expect(double.outerOutset == measure.focusOffset + 4)

    // A negative offset puts the indicator inside the control; radii never go negative.
    let inside = TanreiFocusRingMetrics(containerCornerRadius: 2, offset: -4, innerWidth: 0, outerWidth: 2)
    #expect(inside.outerCenterlineOutset == -3)
    #expect(inside.outerOutset == -2)
    #expect(inside.cornerRadius(atOutset: inside.outerCenterlineOutset) == 0)
  }

  @Test("hit target: the minimum comes from the design system's sys.target tokens")
  func hitTargetMinimum() {
    var measure = system.measure
    measure.targetPointer = 30
    measure.targetTouch = 60
    #if os(macOS)
    #expect(TanreiHitTarget.minimum(in: measure) == 30)
    #else
    #expect(TanreiHitTarget.minimum(in: measure) == 60)
    #endif
  }

  // MARK: slots

  /// What a slot's view builder makes of its content, as a product writes it.
  private func slot<Content: View>(@ViewBuilder _ content: () -> Content) -> Content { content() }

  /// A slot written from data that has none draws nothing, as `EmptyView` and an `if` without a match do: every component
  /// that sizes its parts from whether a slot is filled (text field and search slots, switch icons, dialog icon …) reads it
  /// here.
  @Test("a slot is empty for EmptyView, an if without a match, a ForEach over no data, and an if around one of them")
  func slotEmptiness() {
    let none: [String] = []
    let some = ["heart", "star"]
    var shown = false
    #expect(TanreiSlotContent.isEmpty(slot { EmptyView() }))
    #expect(TanreiSlotContent.isEmpty(slot { if shown { Image(systemName: "heart") } }))
    // A slot written from data: empty with no data, whether or not an `if` guards it.
    #expect(TanreiSlotContent.isEmpty(slot { ForEach(none, id: \.self) { Image(systemName: $0) } }))
    #expect(TanreiSlotContent.isEmpty(slot { if !none.isEmpty { ForEach(none, id: \.self) { Image(systemName: $0) } } }))
    shown = true
    #expect(TanreiSlotContent.isEmpty(slot { if shown { ForEach(none, id: \.self) { Image(systemName: $0) } } }))
    #expect(TanreiSlotContent.isEmpty(slot { if shown { EmptyView() } }))
    // Content.
    #expect(!TanreiSlotContent.isEmpty(slot { ForEach(some, id: \.self) { Image(systemName: $0) } }))
    #expect(!TanreiSlotContent.isEmpty(slot { if shown { ForEach(some, id: \.self) { Image(systemName: $0) } } }))
    #expect(!TanreiSlotContent.isEmpty(slot { if shown { Image(systemName: "heart") } }))
    #expect(!TanreiSlotContent.isEmpty(slot { Text("") }))
    #expect(!TanreiSlotContent.isEmpty(slot { Color.clear }))
  }

  @Test("motion: Reduce Motion removes the animation")
  func motion() {
    #expect(TanreiMotion.animation(durationMs: system.motion.duration.short3, easing: system.motion.easing.standard, reduceMotion: true) == nil)
    #expect(TanreiMotion.animation(durationMs: system.motion.duration.short3, easing: system.motion.easing.standard, reduceMotion: false) != nil)
    #expect(TanreiMotion.animation(spring: system.motion.spring.standard.fastEffects, reduceMotion: true) == nil)
    #expect(TanreiMotion.animation(spring: system.motion.spring.standard.fastEffects, reduceMotion: false) != nil)
  }
}
