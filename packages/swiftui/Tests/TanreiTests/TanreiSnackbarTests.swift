import AcmeFixture
import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/snackbar.spec.json. Each behavior id (SNK-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file. SNK-4 … SNK-7 are BTN-5 … BTN-10 for the snackbar's controls: the primitives
// they rest on are tested once in TanreiButtonTests / TanreiPrimitivesTests; here each is proven to reach the controls.
// The fixtures draw the snackbar in place (SNK-19) in a 400-point frame, `container.margin` around it.

private let suiteName = "TanreiSnackbarTests"

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

private func content(
  _ message: String = "Conversation archived", action: String = "", closable: Bool = false, closeLabel: String = "Close",
  duration: TanreiSnackbarDuration = .auto
) -> TanreiSnackbarContent {
  TanreiSnackbarContent(message: message, actionLabel: action, withCloseButton: closable, closeLabel: closeLabel, duration: duration)
}

/// The size of a render without the snapshot inset, in points.
@MainActor
private func visualSize(_ bitmap: Bitmap) -> CGSize {
  CGSize(width: CGFloat(bitmap.width) / Snapshot.scale - 2 * Snapshot.inset, height: CGFloat(bitmap.height) / Snapshot.scale - 2 * Snapshot.inset)
}

/// A control's chrome alone.
@MainActor
private func control(_ kind: TanreiSnackbarControl, pressed: Bool = false, focused: Bool = false) -> some View {
  TanreiSnackbarControlChrome(control: kind, isPressed: pressed, isFocused: focused) {
    if kind == .close { TanreiChipGlyph(kind: .close).tanreiIconContext(size: TanreiSystem.tanrei.snackbar.controlsIconSize, selected: false) } else { Text("Undo") }
  }
}

// MARK: - Rules (SNK-8 … SNK-12, SNK-20)

@MainActor
@Suite("TanreiSnackbar rules")
struct TanreiSnackbarRulesTests {
  let tokens = TanreiSystem.tanrei.snackbar

  /// SNK-8 — auto is short without an action and indefinite with one; short and long are the timeout tokens; indefinite
  /// never; a snackbar with an action never times out while VoiceOver runs.
  @Test("SNK-8 how long each duration stays")
  func timeouts() {
    #expect(content().timeout(tokens: tokens, voiceOver: false) == tokens.timeoutShort)
    #expect(content(action: "Undo").timeout(tokens: tokens, voiceOver: false) == nil)
    #expect(content(duration: .short).timeout(tokens: tokens, voiceOver: false) == tokens.timeoutShort)
    #expect(content(duration: .long).timeout(tokens: tokens, voiceOver: false) == tokens.timeoutLong)
    #expect(content(duration: .indefinite).timeout(tokens: tokens, voiceOver: false) == nil)
    #expect(content(action: "Undo", duration: .long).timeout(tokens: tokens, voiceOver: false) == tokens.timeoutLong)
    #expect(content(action: "Undo", duration: .long).timeout(tokens: tokens, voiceOver: true) == nil)
    #expect(content(duration: .short).timeout(tokens: tokens, voiceOver: true) == tokens.timeoutShort)
    var custom = tokens
    custom.timeoutShort = 1234
    #expect(content().timeout(tokens: custom, voiceOver: false) == 1234)
    #expect(TanreiSnackbarDuration.allCases.map(\.rawValue) == ["auto", "short", "long", "indefinite"])
    let (named, reports) = Reports.collecting { TanreiSnackbarDuration(named: "forever") }
    #expect(named == .auto && reports.mention("forever"))
  }

  /// SNK-9 — paused while hovered, while focus is inside, while the app is not active, while a Tanrei modal dialog covers
  /// the host.
  @Test("SNK-9 what pauses the timeout")
  func pauses() {
    #expect(!TanreiSnackbarRules.isPaused(hovered: false, focusInside: false, active: true, covered: false))
    #expect(TanreiSnackbarRules.isPaused(hovered: true, focusInside: false, active: true, covered: false))
    #expect(TanreiSnackbarRules.isPaused(hovered: false, focusInside: true, active: true, covered: false))
    #expect(TanreiSnackbarRules.isPaused(hovered: false, focusInside: false, active: false, covered: false))
    #expect(TanreiSnackbarRules.isPaused(hovered: false, focusInside: false, active: true, covered: true))
  }

  /// SNK-10 — what is announced: the message, then the action's label.
  @Test("SNK-10 the announcement is the message, then the action")
  func announcement() {
    #expect(content().announcement == "Conversation archived")
    #expect(content(action: "Undo").announcement == "Conversation archived, Undo")
  }

  /// SNK-1, SNK-11, SNK-12 — the results and reasons have the spec's names.
  @Test("SNK-1 SNK-11 the results: action, or dismiss with close, escape, timeout or host")
  func reasons() {
    #expect(TanreiSnackbarDismissReason.allCases.map(\.rawValue) == ["close", "escape", "timeout", "host"])
    #expect(TanreiSnackbarResult.dismissed(.escape) != .action)
  }

  /// SNK-12 — one at a time, in order; each resolves once it has closed; the next shows after the fade; the product's close
  /// resolves with host and the next shows; clearing drops the waiting ones; nothing new shows while a dialog covers.
  @Test("SNK-12 the host's queue")
  func queue() {
    let host = TanreiSnackbarHost()
    var results: [String: [TanreiSnackbarResult]] = [:]
    func request(_ message: String) -> TanreiSnackbarHost.Request {
      TanreiSnackbarHost.Request(content: content(message), resume: { results[message, default: []].append($0) })
    }
    host.enqueue(request("A"))
    host.enqueue(request("B"))
    host.enqueue(request("C"))
    #expect(host.current?.content.message == "A" && host.waiting.map(\.content.message) == ["B", "C"])
    host.close(.action)
    host.close(.dismissed(.close))  // once only
    #expect(results["A"] == [.action] && host.isClosing && host.current?.content.message == "A")
    // The next waits for the fade-out.
    #expect(host.waiting.map(\.content.message) == ["B", "C"])
    host.finishClosing()
    #expect(host.current?.content.message == "B" && !host.isClosing)
    host.dismissCurrent()
    #expect(results["B"] == [.dismissed(.host)])
    // Covered by a dialog: the next one waits until it closes.
    host.hold(true)
    host.finishClosing()
    #expect(host.current == nil && host.waiting.map(\.content.message) == ["C"])
    host.hold(false)
    #expect(host.current?.content.message == "C")
    host.enqueue(request("D"))
    host.clear()
    #expect(results["C"] == [.dismissed(.host)] && results["D"] == [.dismissed(.host)] && host.waiting.isEmpty)
  }

  /// SNK-12 — `show` returns once its snackbar has closed, with how it closed.
  @Test("SNK-12 show returns how the snackbar closed")
  func showReturns() async {
    let host = TanreiSnackbarHost()
    async let result = host.show(message: "Conversation archived", actionLabel: "Undo")
    for _ in 0..<100 where host.current == nil { try? await Task.sleep(for: .milliseconds(10)) }
    host.close(.action)
    #expect(await result == .action)
  }

  /// SNK-20 — reported: an empty message, a close button without a name, a timed action. The snackbar still renders.
  @Test("SNK-20 empty message, nameless close button and timed actions are reported; it still renders")
  func problems() throws {
    #expect(content().problems.isEmpty && content(action: "Undo", closable: true).problems.isEmpty)
    #expect(content("").problems.contains { $0.contains("message is empty") })
    #expect(content(closable: true, closeLabel: "").problems.contains { $0.contains("no accessible name") })
    #expect(content(action: "Undo", duration: .short).problems.contains { $0.contains("offer it elsewhere") })
    let (bitmap, reports) = try Reports.collecting { try Snapshot.render(TanreiSnackbar(message: "", withCloseButton: true)) }
    #expect(reports.mention("SNK-20") && visualSize(bitmap).height == TanreiSystem.tanrei.snackbar.containerMinHeight)
  }
}

// MARK: - The controls (SNK-2 … SNK-7)

@MainActor
@Suite("TanreiSnackbar controls")
struct TanreiSnackbarControlTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiSnackbarTokens { system.snackbar }

  /// SNK-2 — each state of each control from that control's tokens: at rest no fill and its content color; hovered,
  /// focused and pressed mix its state-layer color into its container.
  @Test("SNK-2 each state of each control binds its tokens", arguments: TanreiSnackbarControl.core)
  func states(kind: TanreiSnackbarControl) {
    let rest = TanreiSnackbarControlAppearance(tokens: tokens, control: kind, state: .enabled)
    #expect(rest.container == TanreiPaint.none && rest.content == (kind == .action ? .role(.inversePrimary) : .role(.inverseOnSurface)))
    #expect(rest.opacity == 1 && rest.cornerRadius == tokens.controlsShape)
    let layer = tokens.controls[kind].enabled.stateLayerColor
    for (state, amount) in [
      (TanreiInteraction.hovered, system.state.hoverStateLayerOpacity), (.focused, system.state.focusStateLayerOpacity), (.pressed, system.state.pressedStateLayerOpacity),
    ] {
      let drawn = TanreiSnackbarControlAppearance(tokens: tokens, control: kind, state: state)
      #expect(drawn.container == .mix(base: rest.container, with: layer, amount: amount) && drawn.content == rest.content)
    }
    var custom = tokens
    custom.controls.close.focused.contentColor = .role(.error)
    custom.hovered.opacity = 0.5
    custom.controlsShape = 12
    #expect(TanreiSnackbarControlAppearance(tokens: custom, control: .close, state: .focused).content == .role(.error))
    #expect(TanreiSnackbarControlAppearance(tokens: custom, control: .action, state: .hovered).opacity == 0.5)
    #expect(TanreiSnackbarControlAppearance(tokens: custom, control: .action, state: .enabled).cornerRadius == 12)
    // A control the system does not have reads the action's tokens (and is reported).
    let (unknown, reports) = Reports.collecting { TanreiSnackbarControlAppearance(tokens: tokens, control: TanreiSnackbarControl(rawValue: "more"), state: .hovered) }
    #expect(unknown == TanreiSnackbarControlAppearance(tokens: tokens, control: .action, state: .hovered) && reports.mention("more"))
  }

  /// SNK-2 (verify) — under acme, hovered, focused and pressed differ.
  @Test("SNK-2 under acme, hovered, focused and pressed differ")
  func acme() {
    for kind in TanreiSnackbarControl.core {
      let containers = [TanreiInteraction.hovered, .focused, .pressed].map {
        TanreiSnackbarControlAppearance(tokens: TanreiSystem.acme.snackbar, control: kind, state: $0).container
      }
      #expect(Set(containers.map { "\($0)" }).count == 3, "\(kind)")
    }
  }

  /// SNK-3 — the focus ring around the control, for keyboard focus only, not changing its size.
  @Test("SNK-3 the focus ring is drawn around the focused control")
  func focusRing() throws {
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.controlsShape, measure: system.measure)
    let y = Snapshot.inset + tokens.controlsHeight / 2
    let x = Snapshot.inset - metrics.outerCenterlineOutset
    let focused = try Snapshot.render(control(.close, focused: true))
    #expect(pixel(focused, x: x, y: y).isClose(to: light[.focusRing].rgba8(), tolerance: 40))
    #expect(!pixel(try Snapshot.render(control(.close)), x: x, y: y).isClose(to: light[.focusRing].rgba8(), tolerance: 40))
    #expect(visualSize(focused) == CGSize(width: tokens.controlsHeight, height: tokens.controlsHeight))
  }

  /// SNK-6 — which tokens a press reads under each choice; the shipped systems: m3-like ripples, cupertino dims.
  @Test("SNK-6 each choice binds the pressed tokens its own way", arguments: TanreiPressedFeedback.allCases)
  func feedback(feedback: TanreiPressedFeedback) {
    var custom = tokens
    custom.controls.action.pressed.containerColor = .role(.error)
    custom.controls.action.pressed.contentColor = .role(.warning)
    custom.pressed.opacity = 0.5
    let pressed = TanreiSnackbarControlAppearance(tokens: custom, control: .action, state: .pressed, feedback: feedback, beneath: .hovered)
    let hovered = custom.controls.action.hovered
    switch feedback {
    case .overlay: #expect(pressed.container == .role(.error) && pressed.ripple == nil && pressed.content == .role(.warning))
    case .ripple: #expect(pressed.container == hovered.containerColor && pressed.ripple == .role(.error) && pressed.opacity == 0.5)
    case .dim: #expect(pressed.container == hovered.containerColor && pressed.ripple == nil && pressed.opacity == 0.5 && pressed.content == .role(.warning))
    case .none: #expect(pressed == TanreiSnackbarControlAppearance(tokens: custom, control: .action, state: .hovered))
    }
    func shipped(_ system: TanreiSystem) -> TanreiSnackbarControlAppearance {
      TanreiSnackbarControlAppearance(tokens: system.snackbar, control: .action, state: .pressed, feedback: system.behavior.pressedFeedback)
    }
    #expect(shipped(.m3Like).ripple != nil && shipped(.cupertino).ripple == nil && shipped(.tanrei).ripple == nil)
  }

  /// SNK-6 — rendered: the pressed control under each choice.
  @Test("SNK-6 each choice renders as it says", arguments: TanreiPressedFeedback.allCases)
  func rendered(feedback: TanreiPressedFeedback) throws {
    var custom = TanreiSystem.tanrei
    custom.behavior.pressedFeedback = feedback
    custom.snackbar.controls.close.pressed.containerColor = .role(.error)
    custom.snackbar.pressed.opacity = 0.5
    let actual = pixel(try Snapshot.render(control(.close, pressed: true), theme: theme(custom)), x: Snapshot.inset + 3, y: Snapshot.inset + 18)
    switch feedback {
    case .overlay, .ripple: #expect(actual.isClose(to: light[.error].opacity(0.5).rgba8(over: light[.surface])))
    case .dim, .none: #expect(actual.isClose(to: light[.surface].rgba8()))
    }
  }

  /// SNK-7 — the bar's and the controls' corners follow the corner smoothing; focus follows the focus style.
  @Test("SNK-7 corner smoothing and focus style reach the bar and its controls")
  func cornersAndFocusStyle() throws {
    func render(_ amount: Double, focused: Bool = false, style: TanreiFocusStyle = .ring, bar: Bool = false) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      custom.snackbar.controlsShape = 16
      custom.snackbar.containerShape = 20
      custom.snackbar.controls.close.enabled.containerColor = .role(.error)
      custom.behavior.focusStyle = style
      if bar { return try Snapshot.renderExact(TanreiSnackbar(message: "Photo saved"), theme: theme(custom)) }
      return try Snapshot.renderExact(control(.close, focused: focused), theme: theme(custom))
    }
    #expect(try render(0).mismatch(against: try render(0.6), channelTolerance: 0) > 0)
    #expect(try render(1).mismatch(against: try render(0.6), channelTolerance: 0) == 0)
    #expect(try render(0, bar: true).mismatch(against: try render(0.6, bar: true), channelTolerance: 0) > 0)
    #expect(try render(0.6, focused: true, style: .glow).mismatch(against: try render(0.6, focused: true, style: .ring), channelTolerance: 0) > 0)
  }

  /// SNK-17 — the entrance and the fade-out come from the tokens and keep their fade where motion is reduced; the ripple
  /// and the state motion stop there.
  @Test("SNK-17 SNK-6 the motions come from the tokens")
  func motion() {
    var custom = tokens
    custom.motionEnterDuration = 300
    custom.motionEnterEasing = TanreiCubicBezier(0, 0, 1, 1)
    custom.motionExitDuration = 200
    custom.motionExitEasing = TanreiCubicBezier(0.5, 0, 1, 1)
    custom.motionFeedbackDuration = 900
    custom.motionStateDuration = 400
    #expect(custom.enterMotion(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.3))
    #expect(custom.enterMotion(reduceMotion: true) == Animation.timingCurve(0, 0, 1, 1, duration: 0.3))
    #expect(custom.exitMotion() == Animation.timingCurve(0.5, 0, 1, 1, duration: 0.2))
    #expect(custom.rippleGrowth(reduceMotion: false) == Animation.timingCurve(custom.motionStateEasing.x1, custom.motionStateEasing.y1, custom.motionStateEasing.x2, custom.motionStateEasing.y2, duration: 0.9))
    #expect(custom.rippleGrowth(reduceMotion: true) == nil && custom.stateMotion(reduceMotion: true) == nil)
  }
}

// MARK: - The bar (SNK-13 … SNK-16, SNK-18)

@MainActor
@Suite("TanreiSnackbar layout")
struct TanreiSnackbarLayoutTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiSnackbarTokens { system.snackbar }

  /// SNK-14 — between the minimum and maximum widths, never wider than offered; at least the minimum height; its color.
  @Test("SNK-14 width bounds, minimum height and container")
  func bounds() throws {
    let short = visualSize(try Snapshot.render(TanreiSnackbar(message: "Saved")))
    #expect(short.width == tokens.containerMinWidth && short.height == tokens.containerMinHeight)
    let long = String(repeating: "A long message that keeps going. ", count: 8)
    #expect(visualSize(try Snapshot.render(TanreiSnackbar(message: long))).width == tokens.containerMaxWidth)
    #expect(visualSize(try Snapshot.render(TanreiSnackbar(message: long).frame(width: 300))).width == 300)
    let rendered = try Snapshot.render(TanreiSnackbar(message: "Saved"))
    #expect(pixel(rendered, x: Snapshot.inset + 4, y: Snapshot.inset + tokens.containerMinHeight / 2).isClose(to: light[.inverseSurface].rgba8(), tolerance: 6))
    var custom = system
    custom.snackbar.containerMinWidth = 320
    custom.snackbar.containerMinHeight = 60
    #expect(visualSize(try Snapshot.render(TanreiSnackbar(message: "Saved"), theme: theme(custom))) == CGSize(width: 320, height: 60))
  }

  /// SNK-14, SNK-15 — the message starts after `padding-inline-start`; the controls end at `padding-inline-end-with-controls`,
  /// `controls.gap` apart, `container.gap` after the message; the close button is a `controls.height` square.
  @Test("SNK-14 SNK-15 paddings, gaps and the controls' sizes")
  func paddingsAndControls() throws {
    let ink = light[.inverseOnSurface].rgba8()
    let bar = try Snapshot.render(TanreiSnackbar(message: "Conversation archived", withCloseButton: true, closeLabel: "Close"))
    let size = visualSize(bar)
    let middle = Snapshot.inset + size.height / 2
    let first = try #require(stride(from: Snapshot.inset, to: Snapshot.inset + 60, by: 0.5).first { pixel(bar, x: $0, y: middle).isClose(to: ink, tolerance: 90) })
    #expect(first >= Snapshot.inset + tokens.containerPaddingInlineStart && first < Snapshot.inset + tokens.containerPaddingInlineStart + 4)
    // The cross's last ink: inside the close square, which ends `padding-inline-end-with-controls` before the bar's end.
    let squareEnd = Snapshot.inset + size.width - tokens.containerPaddingInlineEndWithControls
    let last = try #require(stride(from: Snapshot.inset + size.width - 2, to: Snapshot.inset, by: -0.5).first { pixel(bar, x: $0, y: middle).isClose(to: ink, tolerance: 90) })
    #expect(last < squareEnd && last > squareEnd - tokens.controlsHeight)
    // The close square: `controls.height` wide, as the modified system says.
    var custom = system
    custom.snackbar.controlsHeight = 44
    custom.snackbar.containerMinWidth = 0
    let wider = visualSize(try Snapshot.render(TanreiSnackbar(message: "Saved", withCloseButton: true, closeLabel: "Close"), theme: theme(custom)))
    let narrow = visualSize(try Snapshot.render(TanreiSnackbar(message: "Saved", withCloseButton: true, closeLabel: "Close"), theme: theme({ var s = system; s.snackbar.containerMinWidth = 0; return s }())))
    #expect(wider.width - narrow.width == 44 - tokens.controlsHeight)
  }

  /// SNK-16 — two lines beside the action stay in one row; more move the action to its own row, at the end, below the
  /// message; the message is never cut.
  @Test("SNK-16 the action moves to its own row when the message needs more than two lines")
  func ownRow() throws {
    let line = tokens.supportingTextTypescale.lineHeight
    func size(_ message: String, _ action: String) throws -> CGSize {
      visualSize(try Snapshot.render(TanreiSnackbar(message: message, actionLabel: action).frame(width: 368)))
    }
    let two = try size("Your changes were saved, but the shared copy is out of date.", "Retry")
    #expect(two.height == 2 * line + 2 * tokens.containerPaddingBlock)
    let own = try size("Three files could not be uploaded because they are larger than the limit for this folder.", "Review files that failed")
    #expect(own.height == tokens.containerPaddingBlock + 2 * line + tokens.containerGap + tokens.controlsHeight + tokens.containerPaddingInlineEndWithControls)
  }

  /// SNK-18 — right to left, the message at the right and the controls at the left.
  @Test("SNK-18 right to left, the layout is mirrored")
  func rightToLeft() throws {
    let ink = light[.inverseOnSurface].rgba8()
    let bar = try Snapshot.render(TanreiSnackbar(message: "Saved", withCloseButton: true, closeLabel: "Close").environment(\.layoutDirection, .rightToLeft))
    let size = visualSize(bar)
    let middle = Snapshot.inset + size.height / 2
    let first = try #require(stride(from: Snapshot.inset, to: Snapshot.inset + size.width, by: 0.5).first { pixel(bar, x: $0, y: middle).isClose(to: ink, tolerance: 90) })
    // The first ink from the left is the close glyph, inside the close square at the left end.
    #expect(first < Snapshot.inset + tokens.containerPaddingInlineEndWithControls + tokens.controlsHeight)
    let last = try #require(stride(from: Snapshot.inset + size.width, to: Snapshot.inset, by: -0.5).first { pixel(bar, x: $0, y: middle).isClose(to: ink, tolerance: 90) })
    #expect(last > Snapshot.inset + size.width - tokens.containerPaddingInlineStart - 4)
  }

  /// SNK-13 — a host places the snackbar at the bottom, centred, `container.margin` above the bottom edge.
  @Test("SNK-13 the host places it at the bottom, centred, a margin up")
  func hostPlacement() throws {
    let host = TanreiSnackbarHost()
    host.enqueue(TanreiSnackbarHost.Request(content: content("Photo saved"), resume: { _ in }))
    let rendered = try Snapshot.render(Color.clear.frame(width: 400, height: 300).tanreiSnackbarHost(host))
    let bar = light[.inverseSurface].rgba8()
    let margin = tokens.containerMargin
    #expect(pixel(rendered, x: Snapshot.inset + 200, y: Snapshot.inset + 300 - margin - 2).isClose(to: bar, tolerance: 6))
    #expect(!pixel(rendered, x: Snapshot.inset + 200, y: Snapshot.inset + 300 - margin + 2).isClose(to: bar, tolerance: 6))
    // Centred: the bar is the minimum width, as far from each side.
    let left = Snapshot.inset + (400 - tokens.containerMinWidth) / 2
    #expect(pixel(rendered, x: left + 2, y: Snapshot.inset + 300 - margin - 20).isClose(to: bar, tolerance: 6))
    #expect(!pixel(rendered, x: left - 2, y: Snapshot.inset + 300 - margin - 20).isClose(to: bar, tolerance: 6))
    // Nothing without a request.
    let empty = try Snapshot.render(Color.clear.frame(width: 400, height: 300).tanreiSnackbarHost(TanreiSnackbarHost()))
    #expect(!pixel(empty, x: Snapshot.inset + 200, y: Snapshot.inset + 300 - margin - 2).isClose(to: bar, tolerance: 6))
  }
}

// MARK: - End to end (SNK-1, SNK-4, SNK-5, SNK-8, SNK-19)

@MainActor
@Suite("TanreiSnackbar hosted", .serialized)
struct TanreiSnackbarHostedTests {
  #if os(macOS)
  /// SNK-1 — a click on the action emits action once; on the close button, dismiss with close once. SNK-19 — drawn in
  /// place, it still emits them. SNK-4 — a click in the close button's extended hit area counts.
  @Test("SNK-1 SNK-19 SNK-4 clicks on the action and the close button emit once each")
  func clicks() throws {
    var results: [TanreiSnackbarResult] = []
    let hosted = HostedView(
      // At its natural size: a window that asks a snackbar to fit a width of zero lays it out as a column.
      TanreiSnackbar(message: "Conversation archived", actionLabel: "Undo", withCloseButton: true, closeLabel: "Close") { results.append($0) }
        .fixedSize().padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    let tokens = TanreiSystem.tanrei.snackbar
    let middle = hosted.size.height / 2
    let closeCenter = hosted.size.width - Snapshot.inset - tokens.containerPaddingInlineEndWithControls - tokens.controlsHeight / 2
    hosted.click(at: CGPoint(x: closeCenter, y: middle))
    #expect(results == [.dismissed(.close)])
    let actionPoint = CGPoint(x: closeCenter - tokens.controlsHeight / 2 - tokens.controlsGap - 12, y: middle)
    hosted.click(at: actionPoint)
    #expect(results == [.dismissed(.close), .action])
    // SNK-4: outside the close square's visual box but inside the minimum target (on macOS the pointer target).
    let outset = (TanreiHitTarget.minimum(in: TanreiSystem.tanrei.measure) - tokens.controlsHeight) / 2
    if outset > 1 {
      hosted.click(at: CGPoint(x: closeCenter, y: middle - tokens.controlsHeight / 2 - outset / 2))
      #expect(results.last == .dismissed(.close) && results.count == 3)
    }
  }

  /// SNK-5 end to end: pressed at once, held for press-hold after a quick click.
  @Test("SNK-5 a quick click shows the pressed state at once and keeps it after the release")
  func quickClickIsHeld() throws {
    var system = TanreiSystem.tanrei
    system.motion.duration.pressHold = 1500
    system.snackbar.motionStateDuration = 0
    system.snackbar.controls.close.pressed.containerColor = .role(.error)
    let colors = system.colors.light
    var results: [TanreiSnackbarResult] = []
    let hosted = HostedView(
      TanreiSnackbar(message: "Saved", withCloseButton: true, closeLabel: "Close") { results.append($0) }
        .fixedSize().padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let tokens = system.snackbar
    let point = CGPoint(
      x: hosted.size.width - Snapshot.inset - tokens.containerPaddingInlineEndWithControls - tokens.controlsHeight + 3, y: hosted.size.height / 2)
    hosted.hover(at: point)
    hosted.mouse(.leftMouseDown, at: point)
    hosted.settle()
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8(over: colors[.inverseSurface])))
    hosted.mouse(.leftMouseUp, at: point)
    hosted.settle()
    #expect(results == [.dismissed(.close)])
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8(over: colors[.inverseSurface])))
  }

  /// SNK-8 — a host closes a timed snackbar by itself (dismiss, timeout); SNK-17 — the next shows after the fade-out;
  /// SNK-19 — in place, the same snackbar never times out.
  @Test("SNK-8 SNK-17 SNK-19 a host times a snackbar out; in place it stays")
  func timeout() async throws {
    var system = TanreiSystem.tanrei
    system.snackbar.timeoutShort = 100
    system.snackbar.motionExitDuration = 50
    let host = TanreiSnackbarHost()
    var results: [TanreiSnackbarResult] = []
    var inPlace: [TanreiSnackbarResult] = []
    let hosted = HostedView(
      VStack {
        Color.clear.frame(width: 400, height: 200).tanreiSnackbarHost(host)
        TanreiSnackbar(message: "In place", duration: .short) { inPlace.append($0) }.fixedSize()
      }
      // A window outside any scene has no active phase, which pauses the timeout (SNK-9): this one is active.
      .environment(\.scenePhase, .active)
      .tanreiTheme(theme(system)))
    let first = Task { @MainActor in results.append(await host.show(message: "First")) }
    let second = Task { @MainActor in results.append(await host.show(message: "Second", duration: .short)) }
    #expect(await hosted.wait(atMost: 10) { results == [.dismissed(.timeout), .dismissed(.timeout)] }, "\(results)")
    #expect(await hosted.wait(atMost: 5) { host.current == nil })
    #expect(inPlace.isEmpty)
    // Never left waiting: a request still open is closed by the product (host).
    host.clear()
    await first.value
    await second.value
  }
  #endif
}

// MARK: - Fixtures (one per spec fixture)

/// Draws a fixture of specs/snackbar.spec.json in place (SNK-19): in a 400-point frame, at its resting position —
/// centred, `container.margin` from the frame's edges.
@MainActor
enum TanreiSnackbarFixtures {
  static let width: CGFloat = 400

  static func view(_ fixture: SpecFixture, onResult: @escaping @MainActor (TanreiSnackbarResult) -> Void = { _ in }) -> some View {
    TanreiSnackbar(
      message: fixture.string("message") ?? "", actionLabel: fixture.string("action") ?? "", withCloseButton: fixture.bool("closable") ?? false,
      closeLabel: fixture.string("closeLabel") ?? "", duration: TanreiSnackbarDuration(named: fixture.string("duration") ?? "auto"), onResult: onResult
    )
    .padding(TanreiSystem.tanrei.snackbar.containerMargin)
    .frame(width: width)
  }
}

@MainActor
@Suite("TanreiSnackbar snapshots")
struct TanreiSnackbarSnapshotTests {
  /// Mirrors `fixtures` in specs/snackbar.spec.json.
  nonisolated static let fixtures = ["message", "action", "closable", "action-closable", "two-lines", "action-own-row"]

  static func fixture(_ id: String) throws -> SpecFixture {
    try #require(try SpecFixture.load(spec: "snackbar").first { $0.id == id })
  }

  @Test("SNK-14 SNK-15 SNK-16 SNK-19 fixture matches its baseline", arguments: fixtures)
  func fixture(_ id: String) throws {
    try Snapshot.assert(TanreiSnackbarFixtures.view(try Self.fixture(id)), named: id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    #expect(try SpecFixture.load(spec: "snackbar").map(\.id) == Self.fixtures)
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiSnackbarTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiSnackbar preset snapshots")
struct TanreiSnackbarPresetSnapshotTests {
  /// The action and the close button: the preset's bar, its elevation and corners, the message and both controls.
  nonisolated static let fixtureId = "action-closable"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiSnackbarSnapshotTests.fixtures.contains(Self.fixtureId))
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try TanreiSnackbarSnapshotTests.fixture(Self.fixtureId)
    try Snapshot.assert(TanreiSnackbarFixtures.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
