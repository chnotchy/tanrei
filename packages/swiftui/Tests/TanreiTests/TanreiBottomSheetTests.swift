import AcmeFixture
import SwiftUI
import Testing

@_spi(Fixtures) @testable import Tanrei

// Covers specs/bottom-sheet.spec.json. Each behavior id (BSH-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file. BSH-13 … BSH-19 are BTN-3/4/8/9/10 for the drag handle.
//
// The fixtures draw the sheet in place — for a modal sheet its scrim too — in a 400 × 720 stage over the page's surface
// (`TanreiBottomSheetSurface(inPlace:)`), with no system insets, because a render of the presenting view does not include a
// presented window. The presentation itself (the full-screen cover, VoiceOver, the escape gesture, touch drags and the
// scroll hand-off on a phone) is the platform's and is exercised by the Gallery's UI tests; opening, closing, the drag, the
// settle and the handle are driven here in a hosted macOS window with real mouse events (on macOS the modal sheet is an
// overlay of the view the modifier is attached to).
//
// Accessibility semantics (BSH-11, BSH-22): the macOS accessibility tree is not available to unit tests
// (packages/swiftui/AGENTS.md); what the sheet hands SwiftUI is tested here as rules and reports, and the tree as VoiceOver
// gets it in the Gallery's UI tests (`testBottomSheetSemanticsAndHandle`).

private let suiteName = "TanreiBottomSheetTests"

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
private let stage = CGSize(width: 400, height: 720)
/// A color no token has: what the content blocks are drawn in, so the content can be found in a render.
private let probe = Color(red: 0, green: 0.6, blue: 0)

/// A value outside any view — what a `Binding` in a real app points at — recording its writes. Observable, so a test that
/// changes it from outside (a product opening the sheet) redraws what reads it. `accepts` false declines every write.
@MainActor
@Observable
private final class Store<Value: Sendable> {
  var value: Value
  var writes: [Value] = []
  var accepts = true
  init(_ value: Value) { self.value = value }

  var binding: Binding<Value> {
    Binding(
      get: { MainActor.assumeIsolated { self.value } },
      set: { newValue in
        MainActor.assumeIsolated {
          self.writes.append(newValue)
          if self.accepts { self.value = newValue }
        }
      })
  }
}

/// A block of content `height` high across the content's width, in the probe color.
private struct Block: View {
  var height: CGFloat
  var width: CGFloat?

  var body: some View {
    Rectangle().fill(probe).frame(width: width, height: height)
  }
}

/// The sheet in place over a stage, as the fixtures draw it.
@MainActor
private func surface(
  _ variant: TanreiBottomSheetVariant = .modal, detent: TanreiBottomSheetDetent = .partial, handle: Bool = true, inset: Bool = true,
  size: CGSize = stage, @ViewBuilder content: () -> some View
) -> some View {
  TanreiBottomSheetSurface(inPlace: variant, detent: detent, handle: handle, handleLabel: "Resize sheet", inset: inset, label: "Sheet", content: content)
    .frame(width: size.width, height: size.height)
}

/// The first y (points, inset included) on column `x` where the render is `color`, scanning down.
@MainActor
private func firstY(_ bitmap: Bitmap, x: CGFloat, color: Bitmap.RGBA, from: CGFloat = Snapshot.inset, to: CGFloat? = nil, tolerance: Int = 6) -> CGFloat? {
  let end = to ?? CGFloat(bitmap.height) / Snapshot.scale
  return stride(from: from, to: end, by: 0.5).first { pixel(bitmap, x: x, y: $0).isClose(to: color, tolerance: tolerance) }
}

/// The first and last x (points) on row `y` whose pixel is `color`.
@MainActor
private func horizontalExtent(_ bitmap: Bitmap, y: CGFloat, color: Bitmap.RGBA, tolerance: Int = 6) -> (min: CGFloat, max: CGFloat)? {
  let xs = stride(from: CGFloat.zero, to: CGFloat(bitmap.width) / Snapshot.scale, by: 0.5).filter {
    pixel(bitmap, x: $0, y: y).isClose(to: color, tolerance: tolerance)
  }
  guard let first = xs.first, let last = xs.last else { return nil }
  return (first, last + 0.5)
}

/// The top edge of the sheet in a render: where its container color starts, away from its corners and the grip.
@MainActor
private func sheetTop(_ bitmap: Bitmap) -> CGFloat? {
  firstY(bitmap, x: Snapshot.inset + 30, color: light[.surfaceContainerLow].rgba8())
}

// MARK: - Rules (BSH-5, BSH-6, BSH-9, BSH-10, BSH-11, BSH-22, BSH-25)

@MainActor
@Suite("TanreiBottomSheet rules")
struct TanreiBottomSheetRulesTests {
  let tokens = TanreiSystem.tanrei.bottomSheet

  private func heights(area: CGFloat = 720, natural: CGFloat) -> TanreiBottomSheetHeights {
    TanreiBottomSheetRules.heights(area: area, natural: natural, fraction: tokens.containerPartialFraction, marginBlockStart: tokens.containerMarginBlockStart)
  }

  /// BSH-6 — two heights only while the content wants more than the partial height: partial is the fraction of the area,
  /// full the area less the top margin, never taller than wanted; a short sheet has one height and detent changes nothing;
  /// a smaller area (the keyboard shown) gives smaller heights.
  @Test("BSH-6 partial, full and one height; detent changes nothing at one height; a smaller area gives smaller heights")
  func heightsOfAnArea() {
    let short = heights(natural: 108)
    #expect(!short.twoHeights && short.lowest == 108 && short.highest == 108)
    #expect(short.rest(.partial) == 108 && short.rest(.full) == 108)
    let long = heights(natural: 2000)
    #expect(long.twoHeights && long.lowest == 360 && long.highest == 672)
    #expect(long.rest(.partial) == 360 && long.rest(.full) == 672)
    // Taller than partial, shorter than full: the full height is what it wants.
    let middle = heights(natural: 500)
    #expect(middle.twoHeights && middle.lowest == 360 && middle.highest == 500)
    // More than the full height would be: held at it.
    #expect(heights(area: 100, natural: 2000).highest == 52)
    // The keyboard: the area ends at its top, and both heights come from the smaller area.
    let keyboard = heights(area: 400, natural: 2000)
    #expect(keyboard.lowest == 200 && keyboard.highest == 352)
    // Drawn: never above the highest; below the lowest it keeps that height and moves down.
    #expect(long.drawn(requested: 900) == 672 && long.drawn(requested: 100) == 360 && long.below(requested: 100) == 260)
  }

  /// BSH-9 — a fling is faster than 0.5 points per millisecond; the touch slop is 8 points (SwiftUI names neither).
  @Test("BSH-9 the fling velocity and the touch slop for a platform that names none")
  func thresholds() {
    #expect(TanreiSheetDrag.touchSlop == 8 && TanreiSheetDrag.flingVelocity == 0.5)
    #expect(!TanreiSheetDrag.isFling(500) && TanreiSheetDrag.isFling(501) && TanreiSheetDrag.isFling(-501))
  }

  /// BSH-9 — where a released drag settles: the next height in the direction of a fling, else the nearest; below half the
  /// lowest height, or flung down from it, it asks to close.
  @Test("BSH-9 a release settles at the next height of a fling, else the nearest; low or flung down from the lowest closes")
  func release() {
    let two = heights(natural: 2000)
    func release(_ height: CGFloat, _ velocity: CGFloat, chosen: TanreiBottomSheetDetent = .partial) -> TanreiBottomSheetRules.Release {
      TanreiBottomSheetRules.release(height: height, velocity: velocity, heights: two, chosen: chosen)
    }
    #expect(release(400, 0) == .init(target: .partial, asksToClose: false))
    #expect(release(600, 0) == .init(target: .full, asksToClose: false))
    #expect(release(400, -800) == .init(target: .full, asksToClose: false))
    #expect(release(640, 800, chosen: .full) == .init(target: .partial, asksToClose: false))
    #expect(release(350, 800) == .init(target: .partial, asksToClose: true))
    #expect(release(200, 0) == .init(target: .partial, asksToClose: false))
    #expect(release(170, 0) == .init(target: .partial, asksToClose: true))
    // Flung up from below the lowest: back to the lowest height above it.
    #expect(release(200, -800) == .init(target: .partial, asksToClose: false))
    // One height: back to it, or closed.
    let one = heights(natural: 108)
    #expect(TanreiBottomSheetRules.release(height: 100, velocity: 0, heights: one, chosen: .full) == .init(target: .full, asksToClose: false))
    #expect(TanreiBottomSheetRules.release(height: 50, velocity: 0, heights: one, chosen: .partial) == .init(target: .partial, asksToClose: true))
    #expect(TanreiBottomSheetRules.release(height: 100, velocity: 900, heights: one, chosen: .partial).asksToClose)
  }

  /// BSH-10 — on content that scrolls, a drag up is the sheet's while it is below its full height and a drag down while
  /// the content is at its top; the sheet takes a scroll over once the content is back at its top and the finger still
  /// moves down. A drag on the handle's row, and any drag where a drag does not scroll (a mouse on macOS), is the sheet's.
  @Test("BSH-10 who has a drag on the content: the sheet below full height or at the content's top, else the scroll")
  func handOff() {
    func owns(onContent: Bool = true, upward: Bool, belowFull: Bool, atTop: Bool, scrolls: Bool = true) -> Bool {
      TanreiBottomSheetRules.ownsDrag(startsOnContent: onContent, upward: upward, isBelowFull: belowFull, isContentAtTop: atTop, dragScrolls: scrolls)
    }
    #expect(owns(upward: true, belowFull: true, atTop: false))
    #expect(!owns(upward: true, belowFull: false, atTop: true))
    #expect(owns(upward: false, belowFull: false, atTop: true))
    #expect(!owns(upward: false, belowFull: false, atTop: false))
    #expect(owns(onContent: false, upward: true, belowFull: false, atTop: false))
    #expect(owns(upward: true, belowFull: false, atTop: false, scrolls: false))
    #expect(TanreiBottomSheetRules.takesOver(movesDown: true, isContentAtTop: true))
    #expect(!TanreiBottomSheetRules.takesOver(movesDown: true, isContentAtTop: false) && !TanreiBottomSheetRules.takesOver(movesDown: false, isContentAtTop: true))
  }

  /// BSH-5 — while dismissible and open, a request writes false to the binding first and then calls onClose with the
  /// reason, once; otherwise nothing.
  @Test("BSH-5 BSH-20 a close writes false, then reports its reason, once; nothing while not dismissible; a declined close stays open")
  func close() {
    let open = Store(true)
    var heard: [(TanreiSheetCloseReason, Bool)] = []
    let onClose: @MainActor (TanreiSheetCloseReason) -> Void = { heard.append(($0, open.value)) }
    #expect(TanreiSheetRules.close(open.binding, dismissible: true, reason: .scrim, onClose: onClose))
    #expect(!TanreiSheetRules.close(open.binding, dismissible: true, reason: .escape, onClose: onClose))
    #expect(open.writes == [false] && heard.count == 1 && heard[0].0 == .scrim && heard[0].1 == false)
    let locked = Store(true)
    #expect(!TanreiSheetRules.close(locked.binding, dismissible: false, reason: .drag, onClose: onClose))
    #expect(locked.writes.isEmpty && heard.count == 1)
    #expect(TanreiSheetCloseReason.allCases.map(\.rawValue) == ["close", "scrim", "escape", "back", "drag"])
    // BSH-20: a binding that declines the write still hears the close, and stays open — the sheet then settles back (the
    // Gallery's `testBottomSheetDeclinedDragSettlesBack` drags one).
    let declining = Store(true)
    declining.accepts = false
    #expect(TanreiSheetRules.close(declining.binding, dismissible: true, reason: .drag, onClose: onClose))
    #expect(declining.writes == [false] && declining.value && heard.last?.0 == .drag)
  }

  /// BSH-11 — the handle moves the sheet to its other height; an interactive handle without a label is reported, a handle
  /// at one height is not. BSH-22 — an empty label is reported.
  @Test("BSH-11 BSH-22 the other height; a nameless interactive handle and a nameless sheet are reported")
  func names() {
    #expect(TanreiBottomSheetDetent.partial.other == .full && TanreiBottomSheetDetent.full.other == .partial)
    let nameless = TanreiBottomSheetConfiguration(handleLabel: "", label: " ")
    #expect(nameless.problems.contains { $0.contains("BSH-22") })
    #expect(nameless.handleProblems(isInteractive: true).contains { $0.contains("BSH-11") })
    #expect(nameless.handleProblems(isInteractive: false).isEmpty)
    let named = TanreiBottomSheetConfiguration(handleLabel: "Resize sheet", label: "Share photo")
    #expect(named.problems.isEmpty && named.handleProblems(isInteractive: true).isEmpty)
    #expect(TanreiBottomSheetConfiguration(handle: false, handleLabel: "").handleProblems(isInteractive: true).isEmpty)
    // Only `modal` is a modal overlay.
    #expect(TanreiBottomSheetConfiguration(variant: .modal).isModal && !TanreiBottomSheetConfiguration(variant: .standard).isModal)
  }

  /// BSH-25 — a name the sheet does not define is the default, and is reported.
  @Test("BSH-25 unknown variant and detent names are the defaults and are reported")
  func unknownValues() {
    let (variant, reports) = Reports.collecting { TanreiBottomSheetVariant(named: "floating") }
    #expect(variant == .modal && reports.mention("floating"))
    let (detent, detentReports) = Reports.collecting { TanreiBottomSheetDetent(named: "half") }
    #expect(detent == .partial && detentReports.mention("half"))
    let (known, none) = Reports.collecting { (TanreiBottomSheetVariant(named: "standard"), TanreiBottomSheetDetent(named: "full")) }
    #expect(known == (.standard, .full) && none.messages.isEmpty)
  }
}

// MARK: - Token bindings (BSH-13, BSH-17, BSH-18, BSH-19)

@MainActor
@Suite("TanreiBottomSheet token bindings")
struct TanreiBottomSheetTokenBindingTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiBottomSheetTokens { system.bottomSheet }

  private func appearance(
    _ state: TanreiInteraction = .enabled, tokens: TanreiBottomSheetTokens? = nil, feedback: TanreiPressedFeedback = .overlay, beneath: TanreiInteraction = .enabled
  ) -> TanreiBottomSheetHandleAppearance {
    TanreiBottomSheetHandleAppearance(tokens: tokens ?? self.tokens, state: state, feedback: feedback, beneath: beneath)
  }

  /// BSH-13 — every state from that state's tokens of the drag handle: the box mixes the state layer (the grip's color) in
  /// at the state's amount; the grip keeps its color; at rest nothing is drawn in the box.
  @Test("BSH-13 each state binds that state's tokens of the drag handle")
  func states() {
    let control = tokens.controls.dragHandle
    let rest = appearance()
    #expect(rest.container == TanreiPaint.none && rest.grip == .role(.outline) && rest.opacity == 1 && rest.ripple == nil)
    for state in [TanreiInteraction.hovered, .focused, .pressed] {
      let drawn = appearance(state)
      #expect(drawn.container == control[state: state]?.containerColor && drawn.grip == control[state: state]?.gripColor)
      #expect(drawn.opacity == tokens[state: state]?.opacity)
    }
    #expect(appearance(.hovered).container == .mix(base: .none, with: control.enabled.stateLayerColor, amount: system.state.hoverStateLayerOpacity))
    // BSH-13 (verify): under acme, hovered, focused and pressed differ.
    let acme = [TanreiInteraction.hovered, .focused, .pressed].map { appearance($0, tokens: TanreiSystem.acme.bottomSheet) }
    #expect(Set(acme.map { "\($0.container)|\($0.grip)|\($0.opacity)" }).count == 3)
  }

  /// BSH-13 — the values drive the result: a modified system changes what each state resolves to.
  @Test("BSH-13 a modified system changes what each state resolves to")
  func modifiedSystem() {
    var custom = tokens
    custom.controls.dragHandle.enabled.containerColor = .role(.primary)
    custom.controls.dragHandle.hovered.containerColor = .role(.error)
    custom.controls.dragHandle.focused.gripColor = .role(.warning)
    custom.controls.dragHandle.pressed.gripColor = .role(.success)
    custom.pressed.opacity = 0.5
    #expect(appearance(tokens: custom).container == .role(.primary))
    #expect(appearance(.hovered, tokens: custom).container == .role(.error))
    #expect(appearance(.focused, tokens: custom).grip == .role(.warning))
    #expect(appearance(.pressed, tokens: custom).grip == .role(.success) && appearance(.pressed, tokens: custom).opacity == 0.5)
    // An unknown control key reads the drag handle's tokens, and is reported.
    let (fallback, reports) = Reports.collecting { custom.controls[TanreiBottomSheetControl(rawValue: "grabber")] }
    #expect(fallback == custom.controls.dragHandle && reports.mention("grabber"))
  }

  /// BSH-17 — which tokens a press reads under each choice; the shipped systems: m3-like ripples, cupertino dims, the
  /// default overlays.
  @Test("BSH-17 each choice binds the pressed tokens its own way", arguments: TanreiPressedFeedback.allCases)
  func feedback(feedback: TanreiPressedFeedback) {
    var custom = tokens
    custom.controls.dragHandle.pressed.containerColor = .role(.error)
    custom.controls.dragHandle.pressed.gripColor = .role(.warning)
    custom.pressed.opacity = 0.5
    let pressed = appearance(.pressed, tokens: custom, feedback: feedback, beneath: .hovered)
    let hovered = custom.controls.dragHandle.hovered
    switch feedback {
    case .overlay: #expect(pressed.container == .role(.error) && pressed.ripple == nil && pressed.grip == .role(.warning) && pressed.opacity == 0.5)
    case .ripple: #expect(pressed.container == hovered.containerColor && pressed.ripple == .role(.error) && pressed.grip == .role(.warning) && pressed.opacity == 0.5)
    case .dim: #expect(pressed.container == hovered.containerColor && pressed.ripple == nil && pressed.grip == .role(.warning) && pressed.opacity == 0.5)
    case .none: #expect(pressed == appearance(.hovered, tokens: custom))
    }
    func shipped(_ system: TanreiSystem) -> TanreiBottomSheetHandleAppearance {
      TanreiBottomSheetHandleAppearance(tokens: system.bottomSheet, state: .pressed, feedback: system.behavior.pressedFeedback)
    }
    #expect(shipped(.m3Like).ripple != nil && shipped(.cupertino).ripple == nil && shipped(.tanrei).ripple == nil)
    #expect(TanreiSystem.cupertino.behavior.pressedFeedback == .dim && TanreiSystem.tanrei.behavior.pressedFeedback == .overlay)
  }

  /// BSH-17 — rendered: the pressed handle under each choice (overlay and ripple fill the box with the pressed color — a
  /// ripple drawn grown in a render that never saw the press begin —, dim and none do not).
  @Test("BSH-17 each choice renders as it says", arguments: TanreiPressedFeedback.allCases)
  func rendered(feedback: TanreiPressedFeedback) throws {
    var custom = TanreiSystem.tanrei
    custom.behavior.pressedFeedback = feedback
    custom.bottomSheet.controls.dragHandle.pressed.containerColor = .role(.error)
    let chrome = TanreiBottomSheetHandleChrome(isPressed: true, isFocused: false)
    let tokens = custom.bottomSheet
    // Inside the box, beside the grip.
    let point = (x: Snapshot.inset + tokens.handleContainerWidth / 2 + tokens.handleGripWidth / 2 + 3, y: Snapshot.inset + tokens.handleMarginBlock + 4)
    let actual = pixel(try Snapshot.render(chrome, theme: theme(custom)), x: point.x, y: point.y)
    switch feedback {
    case .overlay, .ripple: #expect(actual.isClose(to: light[.error].rgba8(), tolerance: 6), "\(actual)")
    case .dim, .none: #expect(actual.isClose(to: light[.surface].rgba8(), tolerance: 6), "\(actual)")
    }
  }

  /// BSH-18 — the container's top corners and the handle's box follow the corner smoothing; keyboard focus follows the
  /// focus style (ring or glow). BSH-14 — the ring is drawn for keyboard focus only.
  @Test("BSH-18 BSH-14 corner smoothing reaches the container and the box; the focus style reaches the ring")
  func cornersAndFocusStyle() throws {
    func sheet(_ amount: Double) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      custom.bottomSheet.containerShape = 28
      custom.bottomSheet.containerElevation = []
      return try Snapshot.renderExact(surface(.standard, size: CGSize(width: 200, height: 200)) { Block(height: 40) }, theme: theme(custom))
    }
    let continuous = try sheet(0.6)
    #expect(try sheet(0).mismatch(against: continuous, channelTolerance: 0) > 0)
    #expect(try sheet(1).mismatch(against: continuous, channelTolerance: 0) == 0)
    func handle(_ amount: Double, focused: Bool = false, style: TanreiFocusStyle = .ring) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      custom.bottomSheet.handleContainerShape = 8
      custom.bottomSheet.controls.dragHandle.enabled.containerColor = .role(.primary)
      custom.behavior.focusStyle = style
      return try Snapshot.renderExact(TanreiBottomSheetHandleChrome(isPressed: false, isFocused: focused), theme: theme(custom))
    }
    #expect(try handle(0).mismatch(against: try handle(0.6), channelTolerance: 0) > 0)
    #expect(try handle(0.6, focused: true).mismatch(against: try handle(0.6), channelTolerance: 0) > 0)
    #expect(try handle(0.6, focused: true, style: .glow).mismatch(against: try handle(0.6, focused: true), channelTolerance: 0) > 0)
    #expect(TanreiSystem.cupertino.shape.roundedCornerStyle == .continuous && TanreiSystem.acme.behavior.focusStyle == .glow)
  }

  /// BSH-1, BSH-9, BSH-17, BSH-19, BSH-21 — the state motion, the ripple's growth, the enter and exit motions and the settle
  /// come from the sheet's tokens; under Reduce Motion the state, the ripple and the settle are at once, and the enter and
  /// exit motions remain (the sheet fades in place instead of sliding).
  @Test("BSH-1 BSH-19 BSH-17 BSH-9 BSH-21 the motions come from the tokens; Reduce Motion")
  func motion() {
    var custom = tokens
    custom.motionStateDuration = 400
    custom.motionStateEasing = TanreiCubicBezier(0, 0, 1, 1)
    custom.motionFeedbackDuration = 900
    custom.motionEnterDuration = 700
    custom.motionEnterEasing = TanreiCubicBezier(0.1, 0.2, 0.3, 0.4)
    custom.motionExitDuration = 250
    custom.motionExitEasing = TanreiCubicBezier(0.4, 0.3, 0.2, 0.1)
    #expect(custom.stateMotion(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.4))
    #expect(custom.rippleGrowth(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.9))
    #expect(custom.enterMotion() == Animation.timingCurve(0.1, 0.2, 0.3, 0.4, duration: 0.7))
    #expect(custom.settleMotion(reduceMotion: false) == Animation.timingCurve(0.1, 0.2, 0.3, 0.4, duration: 0.7))
    #expect(custom.exitMotion() == Animation.timingCurve(0.4, 0.3, 0.2, 0.1, duration: 0.25))
    #expect([custom.stateMotion(reduceMotion: true), custom.rippleGrowth(reduceMotion: true), custom.settleMotion(reduceMotion: true)].allSatisfy { $0 == nil })
    #expect(custom.handleRowHeight == 2 * custom.handleMarginBlock + custom.handleContainerHeight)
  }
}

// MARK: - Rendered (BSH-1, BSH-2, BSH-4, BSH-6 … BSH-8, BSH-12, BSH-22, BSH-24, BSH-26)

@MainActor
@Suite("TanreiBottomSheet rendered")
struct TanreiBottomSheetRenderedTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiBottomSheetTokens { system.bottomSheet }
  var container: Bitmap.RGBA { light[.surfaceContainerLow].rgba8() }

  /// BSH-1, BSH-2 — a modal sheet's scrim covers the whole stage in `scrim.color`; BSH-4 — a standard sheet draws none.
  @Test("BSH-1 BSH-2 BSH-4 the modal sheet's scrim covers the stage; a standard sheet draws none")
  func scrim() throws {
    let scrim = light[.scrim].rgba8(over: light[.surface])
    let modal = try Snapshot.render(surface { Block(height: 40) })
    #expect(pixel(modal, x: Snapshot.inset + 2, y: Snapshot.inset + 2).isClose(to: scrim))
    #expect(pixel(modal, x: Snapshot.inset + 398, y: Snapshot.inset + 300).isClose(to: scrim))
    let standard = try Snapshot.render(surface(.standard) { Block(height: 40) })
    #expect(pixel(standard, x: Snapshot.inset + 2, y: Snapshot.inset + 2).isClose(to: light[.surface].rgba8()))
    var custom = system
    custom.bottomSheet.scrimColor = .role(.error)
    #expect(pixel(try Snapshot.render(surface { Block(height: 40) }, theme: theme(custom)), x: Snapshot.inset + 2, y: Snapshot.inset + 2).isClose(to: light[.error].rgba8()))
  }

  /// BSH-6 — as tall as its row and content (one height: detent changes nothing), or its partial height, or its full height;
  /// the fraction and the top margin are the tokens'.
  @Test("BSH-6 the sheet's height: its content, partial, full; the fraction and the margin drive it")
  func heights() throws {
    let bottom = Snapshot.inset + stage.height
    let natural = tokens.handleRowHeight + 100 + tokens.containerPadding
    let short = try Snapshot.render(surface { Block(height: 100) })
    #expect(sheetTop(short) == bottom - natural)
    #expect(try Snapshot.renderExact(surface(detent: .full) { Block(height: 100) }).pixels == (try Snapshot.renderExact(surface { Block(height: 100) })).pixels)
    #expect(sheetTop(try Snapshot.render(surface { Block(height: 1000) })) == bottom - stage.height * tokens.containerPartialFraction)
    #expect(sheetTop(try Snapshot.render(surface(detent: .full) { Block(height: 1000) })) == Snapshot.inset + tokens.containerMarginBlockStart)
    var custom = system
    custom.bottomSheet.containerPartialFraction = 0.25
    custom.bottomSheet.containerMarginBlockStart = 100
    #expect(sheetTop(try Snapshot.render(surface { Block(height: 1000) }, theme: theme(custom))) == bottom - 180)
    #expect(sheetTop(try Snapshot.render(surface(detent: .full) { Block(height: 1000) }, theme: theme(custom))) == Snapshot.inset + 100)
  }

  /// BSH-7 — at the bottom edge, as wide as the area but no wider than `container.max-width`, centred; its color; its top
  /// corners rounded and its bottom corners square; raised by its elevation.
  @Test("BSH-7 docked, centred, no wider than the maximum width; top corners rounded, bottom square; color and elevation")
  func dockedContainer() throws {
    // The container in a color of its own, so that its extent stands out from the page.
    var red = system
    red.bottomSheet.containerColor = .role(.error)
    let fill = light[.error].rgba8()
    let wide = CGSize(width: 800, height: 400)
    let rendered = try Snapshot.render(surface(size: wide) { Block(height: 40) }, theme: theme(red))
    let top = try #require(firstY(rendered, x: Snapshot.inset + 400 + 30, color: fill))
    let extent = try #require(horizontalExtent(rendered, y: top + 30, color: fill))
    #expect(extent.min == Snapshot.inset + 80 && extent.max == Snapshot.inset + 720, "\(extent)")
    #expect(top == Snapshot.inset + wide.height - tokens.handleRowHeight - 40 - tokens.containerPadding)
    // Rounded at the top (the scrim shows at the corner), square at the bottom.
    #expect(!pixel(rendered, x: Snapshot.inset + 81, y: top + 1).isClose(to: fill))
    #expect(pixel(rendered, x: Snapshot.inset + 81, y: Snapshot.inset + wide.height - 1).isClose(to: fill))
    // Narrower than the maximum: the whole width.
    let narrow = try Snapshot.render(surface(size: CGSize(width: 300, height: 400)) { Block(height: 40) }, theme: theme(red))
    let narrowExtent = try #require(horizontalExtent(narrow, y: Snapshot.inset + 400 - 5, color: fill))
    #expect(narrowExtent.min == Snapshot.inset && narrowExtent.max == Snapshot.inset + 300, "\(narrowExtent)")
    // The tokens drive it: the maximum width, and the default color.
    red.bottomSheet.containerMaxWidth = 500
    let narrower = try Snapshot.render(surface(size: wide) { Block(height: 40) }, theme: theme(red))
    #expect(try #require(horizontalExtent(narrower, y: top + 30, color: fill)).min == Snapshot.inset + 150)
    let plain = try Snapshot.render(surface(size: wide) { Block(height: 40) })
    #expect(pixel(plain, x: Snapshot.inset + 400 + 30, y: top + 30).isClose(to: container))
    // The elevation: without it, the edge above the sheet is drawn otherwise.
    var flat = system
    flat.bottomSheet.containerElevation = []
    let raised = try Snapshot.renderExact(surface(.standard) { Block(height: 40) })
    #expect(try Snapshot.renderExact(surface(.standard) { Block(height: 40) }, theme: theme(flat)).mismatch(against: raised, channelTolerance: 0) > 0)
  }

  /// BSH-8 — the content below the handle's row, inset by `container.padding` from its start, end and bottom (and top without
  /// a handle); flush with `inset` false; handed the content color and the body text style; clipped to the sheet.
  @Test("BSH-8 the content's insets, flush content, the content color and the body style, clipped")
  func content() throws {
    let bottom = Snapshot.inset + stage.height
    let padding = tokens.containerPadding
    let green = probe.rgba8()
    let inset = try Snapshot.render(surface { Block(height: 100) })
    let top = try #require(sheetTop(inset))
    #expect(pixel(inset, x: Snapshot.inset + padding + 1, y: top + tokens.handleRowHeight + 1).isClose(to: green))
    #expect(pixel(inset, x: Snapshot.inset + padding - 1, y: top + tokens.handleRowHeight + 10).isClose(to: container))
    #expect(pixel(inset, x: Snapshot.inset + stage.width - padding + 1, y: top + tokens.handleRowHeight + 10).isClose(to: container))
    #expect(pixel(inset, x: Snapshot.inset + 200, y: bottom - padding + 1).isClose(to: container))
    #expect(pixel(inset, x: Snapshot.inset + 200, y: top + tokens.handleRowHeight - 1).isClose(to: container))
    // Without a handle: `container.padding` from the top too.
    let noHandle = try Snapshot.render(surface(handle: false) { Block(height: 100) })
    let noHandleTop = bottom - 100 - 2 * padding
    #expect(pixel(noHandle, x: Snapshot.inset + 200, y: noHandleTop + padding + 1).isClose(to: green))
    #expect(pixel(noHandle, x: Snapshot.inset + 200, y: noHandleTop + padding - 1).isClose(to: container))
    // Flush: to the edges, right below the row.
    let flush = try Snapshot.render(surface(inset: false) { Block(height: 100) })
    let flushTop = bottom - tokens.handleRowHeight - 100
    #expect(pixel(flush, x: Snapshot.inset + 1, y: flushTop + tokens.handleRowHeight + 1).isClose(to: green))
    #expect(pixel(flush, x: Snapshot.inset + 399, y: bottom - 1).isClose(to: green))
    // The content color as the foreground style; the body style as the font.
    var custom = system
    custom.bottomSheet.contentColor = .role(.error)
    let foreground = try Snapshot.render(surface { Rectangle().fill(.foreground).frame(height: 40) }, theme: theme(custom))
    #expect(pixel(foreground, x: Snapshot.inset + 200, y: bottom - padding - 20).isClose(to: light[.error].rgba8()))
    let onSurface = try Snapshot.render(surface { Rectangle().fill(.foreground).frame(height: 40) })
    #expect(pixel(onSurface, x: Snapshot.inset + 200, y: bottom - padding - 20).isClose(to: light[.onSurface].rgba8()))
    let text = "Choose where to save the photo."
    let handed = try Snapshot.renderExact(surface { Text(verbatim: text) })
    #expect(handed.pixels == (try Snapshot.renderExact(surface { Text(verbatim: text).tanreiFont(system.typescale.body) })).pixels)
    var larger = system
    larger.typescale.body.size += 6
    #expect(handed.mismatch(against: try Snapshot.renderExact(surface { Text(verbatim: text) }, theme: theme(larger)), channelTolerance: 0) > 0)
    // Clipped: content far taller than the sheet draws nothing above it.
    let tall = try Snapshot.render(surface { Block(height: 2000) })
    let tallTop = try #require(sheetTop(tall))
    #expect(!pixel(tall, x: Snapshot.inset + 200, y: tallTop - 2).isClose(to: green))
  }

  /// BSH-12 — the handle's row: the box `handle.container-*` centred across the sheet `handle.margin-block` below its top,
  /// filled with the box's color (nothing at rest), and the grip `handle.grip-*` centred in it in the grip's color.
  @Test("BSH-12 the handle's box and grip: sizes, place, colors")
  func handle() throws {
    let rendered = try Snapshot.render(surface { Block(height: 100) })
    let top = try #require(sheetTop(rendered))
    let center = Snapshot.inset + 200
    let gripY = top + tokens.handleMarginBlock + tokens.handleContainerHeight / 2
    let outline = light[.outline].rgba8()
    #expect(pixel(rendered, x: center, y: gripY).isClose(to: outline))
    #expect(pixel(rendered, x: center + tokens.handleGripWidth / 2 - 1, y: gripY).isClose(to: outline, tolerance: 12))
    #expect(pixel(rendered, x: center + tokens.handleGripWidth / 2 + 1, y: gripY).isClose(to: container))
    #expect(pixel(rendered, x: center, y: gripY - tokens.handleGripHeight / 2 - 1).isClose(to: container))
    var custom = system
    custom.bottomSheet.handleGripWidth = 60
    custom.bottomSheet.controls.dragHandle.enabled.gripColor = .role(.error)
    custom.bottomSheet.controls.dragHandle.enabled.containerColor = .role(.warning)
    custom.bottomSheet.handleContainerWidth = 100
    let changed = try Snapshot.render(surface { Block(height: 100) }, theme: theme(custom))
    #expect(pixel(changed, x: center + 28, y: gripY).isClose(to: light[.error].rgba8()))
    #expect(pixel(changed, x: center + 40, y: gripY).isClose(to: light[.warning].rgba8()))
    #expect(pixel(changed, x: center + 52, y: gripY).isClose(to: container))
  }

  /// BSH-24 — the drag handle is not scaled with the text: under the largest text size its row, box and grip are drawn as
  /// at the default size. (That the content grows the sheet is measured in the Gallery on iOS,
  /// `testBottomSheetGrowsWithDynamicType`: macOS has no Dynamic Type.)
  @Test("BSH-24 larger text leaves the handle as it is")
  func dynamicType() throws {
    let regular = try Snapshot.renderExact(TanreiBottomSheetHandleChrome(isPressed: false, isFocused: false))
    let large = try Snapshot.renderExact(TanreiBottomSheetHandleChrome(isPressed: false, isFocused: false).environment(\.dynamicTypeSize, .accessibility5))
    #expect(regular.pixels == large.pixels && regular.width == large.width && regular.height == large.height)
  }

  /// BSH-26 — right to left, the container and the handle stay centred; the content follows the layout direction.
  @Test("BSH-26 right to left: centred container and handle; the content mirrored")
  func rightToLeft() throws {
    var red = system
    red.bottomSheet.containerColor = .role(.error)
    let fill = light[.error].rgba8()
    let wide = CGSize(width: 800, height: 400)
    let rendered = try Snapshot.render(
      surface(size: wide) { Block(height: 40, width: 50).frame(maxWidth: .infinity, alignment: .leading) }.environment(\.layoutDirection, .rightToLeft),
      theme: theme(red))
    let top = try #require(firstY(rendered, x: Snapshot.inset + 400 + 30, color: fill))
    let extent = try #require(horizontalExtent(rendered, y: top + 30, color: fill))
    #expect(extent.min == Snapshot.inset + 80 && extent.max == Snapshot.inset + 720, "\(extent)")
    #expect(pixel(rendered, x: Snapshot.inset + 400, y: top + tokens.handleMarginBlock + tokens.handleContainerHeight / 2).isClose(to: light[.outline].rgba8()))
    let contentY = Snapshot.inset + wide.height - tokens.containerPadding - 20
    #expect(pixel(rendered, x: Snapshot.inset + 720 - tokens.containerPadding - 10, y: contentY).isClose(to: probe.rgba8()))
    #expect(!pixel(rendered, x: Snapshot.inset + 80 + tokens.containerPadding + 10, y: contentY).isClose(to: probe.rgba8()))
  }

  /// BSH-22 — a sheet without a label still renders, and is reported; an interactive handle without a label too (BSH-11).
  @Test("BSH-22 BSH-11 a nameless sheet and a nameless interactive handle render and are reported")
  func nameless() throws {
    #if os(macOS)
    let (rendered, reports) = Reports.collecting {
      let hosted = HostedView(
        TanreiBottomSheetSurface(inPlace: .modal, handleLabel: "", label: "") { Block(height: 1000) }
          .frame(width: stage.width, height: stage.height).tanreiTheme(Snapshot.theme))
      hosted.settle(0.2)
      return hosted.color(at: CGPoint(x: 30, y: stage.height - 5))
    }
    #expect(rendered?.isClose(to: probe.rgba8()) == true || rendered?.isClose(to: container) == true)
    #expect(reports.mention("BSH-22") && reports.mention("BSH-11"))
    #endif
  }
}

// MARK: - Interaction (hosted, macOS)

/// Driven with real mouse events in a hosted window. SwiftUI's own gestures — the scrim's tap and the sheet's drag — are not
/// reached by a synthetic event there (the navigation drawer's suite found the same): their rules are tested above, and the
/// gestures themselves with touches in the Gallery's UI tests (`testBottomSheetModalClosesAndDrags`).
@MainActor
@Suite("TanreiBottomSheet interaction", .serialized)
struct TanreiBottomSheetInteractionTests {
  #if os(macOS)
  let tokens = TanreiSystem.tanrei.bottomSheet

  /// The default system with the container in a color of its own and no elevation, so that the sheet's edge is found.
  static var sheetSystem: TanreiSystem {
    var system = TanreiSystem.tanrei
    system.bottomSheet.containerColor = .role(.info)
    system.bottomSheet.containerElevation = []
    return system
  }

  var fill: Bitmap.RGBA { light[.info].rgba8() }

  /// The page a sheet covers — a button at its top-left that counts its presses — with the sheet attached, as an app writes
  /// it; padded by the snapshot inset. The content is two blocks, green then blue, `contentHeight` in all.
  private struct Page: View {
    let open: Store<Bool>
    let detent: Store<TanreiBottomSheetDetent>
    var variant: TanreiBottomSheetVariant = .modal
    var contentHeight: CGFloat = 1000
    let closes: Store<[TanreiSheetCloseReason]>
    let pagePresses: Store<Int>

    var body: some View {
      VStack(alignment: .leading) {
        Button {
          pagePresses.value += 1
        } label: {
          Text(verbatim: "Page").frame(width: 120, height: 60).contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        Spacer()
      }
      .frame(width: stage.width, height: stage.height, alignment: .topLeading)
      .tanreiBottomSheet(
        isPresented: open.binding, variant: variant, detent: detent.binding, handleLabel: "Resize sheet", label: "Sheet",
        onClose: { closes.value.append($0) }
      ) {
        VStack(spacing: 0) {
          Block(height: contentHeight / 2)
          Rectangle().fill(Color(red: 0, green: 0, blue: 0.7)).frame(height: contentHeight / 2)
        }
      }
    }
  }

  private struct Fixture {
    let hosted: HostedView<AnyView>
    let open: Store<Bool>
    let detent: Store<TanreiBottomSheetDetent>
    let closes: Store<[TanreiSheetCloseReason]>
    let pagePresses: Store<Int>
  }

  private func page(
    open: Bool = true, detent: TanreiBottomSheetDetent = .partial, variant: TanreiBottomSheetVariant = .modal, contentHeight: CGFloat = 1000,
    system: TanreiSystem = sheetSystem, reduced: Bool = true
  ) -> Fixture {
    let openStore = Store(open)
    let detentStore = Store(detent)
    let closes = Store<[TanreiSheetCloseReason]>([])
    let presses = Store(0)
    let view = Page(open: openStore, detent: detentStore, variant: variant, contentHeight: contentHeight, closes: closes, pagePresses: presses)
      .padding(Snapshot.inset)
      .background(system.colors.light[.surface])
      .tanreiTheme(theme(system))
      .environment(\._accessibilityReduceMotion, reduced)
    return Fixture(hosted: HostedView(AnyView(view)), open: openStore, detent: detentStore, closes: closes, pagePresses: presses)
  }

  /// Lets what the sheet scheduled on the main actor run: suspending does, spinning the run loop alone does not.
  private func pause(_ hosted: HostedView<AnyView>, _ milliseconds: Int = 300) async {
    try? await Task.sleep(for: .milliseconds(milliseconds))
    hosted.settle(0.1)
  }

  /// Where the sheet's top edge is in the window: the first point on the column 30 points into the stage in its color.
  private func top(_ hosted: HostedView<AnyView>) -> CGFloat? {
    guard let bitmap = hosted.bitmap() else { return nil }
    let scale = CGFloat(bitmap.width) / hosted.size.width
    return stride(from: CGFloat.zero, to: hosted.size.height, by: 1).first { y in
      bitmap[Int((Snapshot.inset + 30) * scale), min(bitmap.height - 1, Int(y * scale))].isClose(to: fill, tolerance: 6)
    }
  }

  private var bottom: CGFloat { Snapshot.inset + stage.height }
  private var partialTop: CGFloat { bottom - stage.height * tokens.containerPartialFraction }
  private var fullTop: CGFloat { Snapshot.inset + tokens.containerMarginBlockStart }
  /// A point on the handle's row of a sheet whose top is `top`, `x` into the stage.
  private func row(_ top: CGFloat, x: CGFloat = 200) -> CGPoint { CGPoint(x: Snapshot.inset + x, y: top + tokens.handleRowHeight / 2) }

  /// BSH-1 — opening slides the sheet up from below the bottom edge over the enter motion; closing slides it out over the
  /// exit motion; under Reduce Motion it fades in place; mounted open, it is in place at once.
  @Test("BSH-1 slides in and out; fades in place under Reduce Motion; mounted open appears in place")
  func motion() async {
    var system = Self.sheetSystem
    system.bottomSheet.motionEnterDuration = 4000
    system.bottomSheet.motionEnterEasing = TanreiCubicBezier(0, 0, 1, 1)
    system.bottomSheet.motionExitDuration = 4000
    system.bottomSheet.motionExitEasing = TanreiCubicBezier(0, 0, 1, 1)
    // Mounted open: in place at once, even with a four-second motion.
    let mounted = page(open: true, system: system, reduced: false)
    #expect(top(mounted.hosted) == partialTop)
    for reduced in [false, true] {
      let fixture = page(open: false, system: system, reduced: reduced)
      #expect(top(fixture.hosted) == nil)
      fixture.open.value = true
      await pause(fixture.hosted, 1000)
      let opening = top(fixture.hosted)
      let atRest = fixture.hosted.color(at: CGPoint(x: Snapshot.inset + 30, y: partialTop + 10))
      if reduced {
        // Fading in place: at its height, not yet its color.
        #expect(opening == nil && atRest.map { !$0.isClose(to: fill, tolerance: 6) && !$0.isClose(to: light[.surface].rgba8(), tolerance: 6) } == true, "reduced: \(String(describing: atRest))")
      } else {
        #expect(opening.map { $0 > partialTop + 5 && $0 < bottom - 5 } == true, "opening: \(String(describing: opening))")
      }
      fixture.open.value = false
      await pause(fixture.hosted, 1000)
      let closing = top(fixture.hosted)
      if reduced {
        #expect(closing == nil, "reduced: \(String(describing: closing))")
      } else {
        #expect(closing.map { $0 > partialTop + 5 } == true, "closing: \(String(describing: closing))")
      }
      #expect(fixture.open.writes.isEmpty)
    }
  }

  /// BSH-2 — the page behind a modal sheet takes no press; BSH-4 — a standard sheet draws no scrim and leaves the page above
  /// it usable, and never closes itself on a press.
  @Test("BSH-2 BSH-4 the page behind a modal sheet is inert; above a standard one it is usable")
  func inert() async {
    let modal = page()
    await pause(modal.hosted)
    modal.hosted.click(at: CGPoint(x: Snapshot.inset + 40, y: Snapshot.inset + 30))
    await pause(modal.hosted)
    #expect(modal.pagePresses.value == 0)
    let standard = page(variant: .standard)
    await pause(standard.hosted)
    #expect(standard.hosted.color(at: CGPoint(x: Snapshot.inset + 300, y: Snapshot.inset + 100))?.isClose(to: light[.surface].rgba8(), tolerance: 6) == true)
    standard.hosted.click(at: CGPoint(x: Snapshot.inset + 40, y: Snapshot.inset + 30))
    await pause(standard.hosted)
    #expect(standard.pagePresses.value == 1 && standard.open.writes.isEmpty && standard.closes.value.isEmpty)
    #expect(top(standard.hosted) == partialTop)
  }

  /// BSH-11 — a click on the handle moves the sheet to its other height and writes it once; at one height the handle does
  /// nothing. BSH-15 — the hit area is the row across the box, not the rest of the row.
  @Test("BSH-11 BSH-15 the handle toggles the height, once per click; its hit area is the box's row")
  func handle() async {
    let fixture = page()
    await pause(fixture.hosted)
    #expect(top(fixture.hosted) == partialTop)
    // Beside the box, outside its hit area: nothing.
    fixture.hosted.click(at: row(partialTop, x: 200 + 60))
    await pause(fixture.hosted)
    #expect(fixture.detent.writes.isEmpty)
    // At the edge of the hit area, near the row's top.
    fixture.hosted.click(at: CGPoint(x: Snapshot.inset + 200 + tokens.handleContainerWidth / 2 - 2, y: partialTop + 2))
    await pause(fixture.hosted)
    #expect(fixture.detent.writes == [.full] && top(fixture.hosted) == fullTop, "\(String(describing: top(fixture.hosted)))")
    fixture.hosted.click(at: row(fullTop))
    await pause(fixture.hosted)
    #expect(fixture.detent.writes == [.full, .partial] && top(fixture.hosted) == partialTop)
    // One height: the handle is drawn, and does nothing.
    let short = page(contentHeight: 100)
    await pause(short.hosted)
    let shortTop = bottom - tokens.handleRowHeight - 100 - tokens.containerPadding
    #expect(top(short.hosted) == shortTop)
    short.hosted.click(at: row(shortTop))
    await pause(short.hosted)
    #expect(short.detent.writes.isEmpty && top(short.hosted) == shortTop)
  }

  /// BSH-15 — where the minimum target is taller than the handle's row, the hit area reaches over the content from the
  /// row's top.
  @Test("BSH-15 a row shorter than the minimum target: the hit area reaches over the content")
  func shortRow() async {
    var system = Self.sheetSystem
    system.bottomSheet.handleMarginBlock = 0
    system.bottomSheet.handleContainerHeight = 16
    let fixture = page(system: system)
    await pause(fixture.hosted)
    let target = TanreiHitTarget.minimum(in: system.measure)
    fixture.hosted.click(at: CGPoint(x: Snapshot.inset + 200, y: partialTop + target - 4))
    await pause(fixture.hosted)
    #expect(fixture.detent.writes == [.full])
  }

  /// BSH-21 — the product sets detent: the sheet moves there over the enter motion (at once under Reduce Motion) and writes
  /// nothing.
  @Test("BSH-21 the product's detent moves the sheet and is not written back")
  func productDetent() async {
    var system = Self.sheetSystem
    system.bottomSheet.motionEnterDuration = 4000
    system.bottomSheet.motionEnterEasing = TanreiCubicBezier(0, 0, 1, 1)
    let fixture = page(system: system, reduced: false)
    await pause(fixture.hosted)
    fixture.detent.value = .full
    await pause(fixture.hosted, 1000)
    let moving = top(fixture.hosted)
    #expect(moving.map { $0 < partialTop - 5 && $0 > fullTop + 5 } == true, "moving: \(String(describing: moving))")
    #expect(fixture.detent.writes.isEmpty)
    let reduced = page(system: system, reduced: true)
    await pause(reduced.hosted)
    reduced.detent.value = .full
    await pause(reduced.hosted)
    #expect(top(reduced.hosted) == fullTop && reduced.detent.writes.isEmpty)
  }

  /// BSH-13 — hovering the handle draws its box in the hovered tokens; BSH-16 — a quick click shows the pressed state at
  /// once and keeps it after the release for press-hold.
  @Test("BSH-13 BSH-16 hover, and a press held after a quick click")
  func states() async {
    var system = Self.sheetSystem
    system.bottomSheet.controls.dragHandle.hovered.containerColor = .role(.warning)
    system.bottomSheet.controls.dragHandle.pressed.containerColor = .role(.success)
    system.motion.duration.pressHold = 1500
    let colors = system.colors.light
    let fixture = page(system: system)
    await pause(fixture.hosted)
    // Inside the box, beside the grip, level with it.
    let box = CGPoint(x: Snapshot.inset + 200 + tokens.handleGripWidth / 2 + 4, y: partialTop + tokens.handleMarginBlock + tokens.handleContainerHeight / 2)
    fixture.hosted.hover(at: box)
    await pause(fixture.hosted)
    #expect(fixture.hosted.color(at: box)?.isClose(to: colors[.warning].rgba8(), tolerance: 10) == true, "\(String(describing: fixture.hosted.color(at: box)))")
    fixture.hosted.mouse(.leftMouseDown, at: box)
    fixture.hosted.settle()
    #expect(fixture.hosted.color(at: box)?.isClose(to: colors[.success].rgba8(), tolerance: 10) == true, "\(String(describing: fixture.hosted.color(at: box)))")
    fixture.hosted.mouse(.leftMouseUp, at: box)
    fixture.hosted.settle(0.2)
    // The click moved the sheet to its full height: the box is there now, still pressed.
    let moved = CGPoint(x: box.x, y: fullTop + tokens.handleMarginBlock + tokens.handleContainerHeight / 2)
    #expect(await fixture.hosted.wait(atMost: 1) { fixture.hosted.color(at: moved)?.isClose(to: colors[.success].rgba8(), tolerance: 10) == true })
    #expect(await fixture.hosted.wait(atMost: 5) { fixture.hosted.color(at: moved)?.isClose(to: colors[.success].rgba8(), tolerance: 10) == false })
  }

  /// BSH-10 — the content taller than the room scrolls inside the sheet (on macOS with the wheel, at either height); BSH-12 —
  /// the handle's row stays in place while it scrolls.
  @Test("BSH-10 BSH-12 the content scrolls below the handle's row, which stays")
  func scrolls() async {
    let fixture = page()
    await pause(fixture.hosted)
    let blue = Bitmap.RGBA(r: 0, g: 0, b: 179, a: 255)
    let inContent = CGPoint(x: Snapshot.inset + 200, y: partialTop + tokens.handleRowHeight + 20)
    #expect(fixture.hosted.color(at: inContent)?.isClose(to: probe.rgba8(), tolerance: 8) == true, "\(String(describing: fixture.hosted.color(at: inContent)))")
    #expect(fixture.hosted.scroll(toY: 600))
    #expect(fixture.hosted.color(at: inContent)?.isClose(to: blue, tolerance: 8) == true, "\(String(describing: fixture.hosted.color(at: inContent)))")
    #expect(top(fixture.hosted) == partialTop)
    let grip = fixture.hosted.color(at: CGPoint(x: Snapshot.inset + 200, y: partialTop + tokens.handleRowHeight / 2))
    #expect(grip?.isClose(to: light[.outline].rgba8(), tolerance: 12) == true, "\(String(describing: grip))")
  }

  /// BSH-3, BSH-23 — a modal sheet mounted open counts itself as an open Tanrei modal, as if it had just opened; a dialog
  /// opened from it stacks above it (two modals), and closing each counts it out.
  @Test("BSH-3 BSH-23 a modal sheet counts as an open modal; a dialog from it stacks above it")
  func modalCount() async {
    let before = TanreiModalCoordinator.shared.openModals
    let open = Store(true)
    let asks = Store(false)
    let hosted = HostedView(
      AnyView(
        Color.clear.frame(width: stage.width, height: stage.height)
          .tanreiBottomSheet(isPresented: open.binding, label: "Sheet") {
            Color.clear.frame(height: 100)
              .tanreiDialog("Discard?", isPresented: asks.binding) { TanreiButton("OK", variant: .text) {} }
          }
          .tanreiTheme(Snapshot.theme).environment(\._accessibilityReduceMotion, true)))
    await pause(hosted)
    #expect(TanreiModalCoordinator.shared.openModals == before + 1)
    asks.value = true
    await pause(hosted)
    #expect(TanreiModalCoordinator.shared.openModals == before + 2)
    asks.value = false
    open.value = false
    await pause(hosted, 600)
    #expect(TanreiModalCoordinator.shared.openModals == before)
  }
  #endif
}

// MARK: - Fixtures (one per spec fixture)

/// Draws a fixture of specs/bottom-sheet.spec.json as the spec's harness says: the sheet in place (and, for a modal sheet,
/// its scrim) in a 400 × 720 stage with no system insets, its props applied and its content as plain text.
@MainActor
enum TanreiBottomSheetFixtures {
  static let stage = CGSize(width: 400, height: 720)

  static func view(_ fixture: SpecFixture) -> some View {
    TanreiBottomSheetSurface(
      inPlace: TanreiBottomSheetVariant(named: fixture.string("variant") ?? TanreiBottomSheetVariant.modal.rawValue),
      detent: TanreiBottomSheetDetent(named: fixture.string("detent") ?? TanreiBottomSheetDetent.partial.rawValue),
      dismissible: fixture.bool("dismissible") ?? true, handle: fixture.bool("handle") ?? true, handleLabel: fixture.string("handleLabel") ?? "",
      inset: fixture.bool("inset") ?? true, label: fixture.string("label") ?? ""
    ) {
      if let content = fixture.content { Text(verbatim: content) }
    }
    .frame(width: stage.width, height: stage.height)
  }
}

@MainActor
@Suite("TanreiBottomSheet snapshots")
struct TanreiBottomSheetSnapshotTests {
  /// Mirrors `fixtures` in specs/bottom-sheet.spec.json.
  nonisolated static let fixtures = ["modal", "modal-partial", "modal-full", "no-handle", "standard"]

  static func fixture(_ id: String) throws -> SpecFixture {
    try #require(try SpecFixture.load(spec: "bottom-sheet").first { $0.id == id })
  }

  @Test("BSH-6 BSH-7 BSH-8 BSH-12 fixture matches its baseline", arguments: fixtures)
  func fixture(_ id: String) throws {
    try Snapshot.assert(TanreiBottomSheetFixtures.view(try Self.fixture(id)), named: id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    #expect(try SpecFixture.load(spec: "bottom-sheet").map(\.id) == Self.fixtures)
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiBottomSheetTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiBottomSheet preset snapshots")
struct TanreiBottomSheetPresetSnapshotTests {
  /// The modal sheet whose content fits: the preset's scrim, container color, elevation, top corners and drag handle.
  nonisolated static let fixtureId = "modal"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .m3ExpressiveLike, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiBottomSheetSnapshotTests.fixtures.contains(Self.fixtureId))
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try TanreiBottomSheetSnapshotTests.fixture(Self.fixtureId)
    try Snapshot.assert(TanreiBottomSheetFixtures.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}

