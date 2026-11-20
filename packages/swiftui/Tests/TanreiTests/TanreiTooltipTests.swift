import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/tooltip.spec.json. Each behavior id (TIP-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file. When a tooltip is open is a pure state machine (`TanreiTooltipMachine`), tested
// event by event with its timers as events — no clock; the view runs the timers from the tokens. Where it goes is pure
// too (`TanreiTooltipGeometry`). The fixtures draw a 320 × 200 stage with a medium standard icon button at its centre and
// the tooltip open beside it (the spec's harness), its layer on the stage.

private let suiteName = "TanreiTooltipTests"

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

private typealias Machine = TanreiTooltipMachine

/// Feeds events in order; returns every toggle emitted, in order.
private func run(_ machine: inout Machine, _ events: [Machine.Event]) -> [Bool] {
  events.compactMap { machine.handle($0).toggled }
}

// MARK: - When it is open (TIP-1 … TIP-8, TIP-16)

@MainActor
@Suite("TanreiTooltip rules")
struct TanreiTooltipRulesTests {
  /// TIP-1 — a pointer resting on the anchor for the show delay opens it; leaving starts the hide delay, which the pointer
  /// cancels by moving onto the tooltip; off both for the hide delay, it closes.
  @Test("TIP-1 hover opens after the show delay; the pointer may move onto the tooltip; the hide delay closes it")
  func hover() {
    var machine = Machine()
    let entered = machine.handle(.pointerEnteredAnchor(othersOpen: false))
    #expect(entered.start == [.show] && entered.toggled == nil && !machine.isOpen)
    #expect(machine.handle(.elapsed(.show)).toggled == true && machine.isOpen)
    #expect(machine.handle(.pointerLeftAnchor).start == [.hide])
    #expect(machine.handle(.pointerEnteredTooltip).stop.contains(.hide))
    #expect(machine.handle(.elapsed(.hide)).toggled == nil && machine.isOpen)  // a stale end: the pointer is on it
    #expect(machine.handle(.pointerLeftTooltip).start == [.hide])
    #expect(machine.handle(.elapsed(.hide)).toggled == false && !machine.isOpen)
    // Leaving before the delay: it never opens.
    var passing = Machine()
    #expect(run(&passing, [.pointerEnteredAnchor(othersOpen: false), .pointerLeftAnchor, .elapsed(.show)]).isEmpty && !passing.isOpen)
    #expect(passing.handle(.pointerLeftAnchor).stop.contains(.show))
  }

  /// TIP-2 — keyboard focus opens it at once, and losing focus closes it (unless the pointer still holds it).
  @Test("TIP-2 keyboard focus opens at once; losing it closes")
  func focus() {
    var machine = Machine()
    #expect(machine.handle(.focusGained).toggled == true)
    #expect(machine.handle(.focusLost).toggled == false)
    var hovered = Machine()
    _ = run(&hovered, [.pointerEnteredAnchor(othersOpen: false), .focusGained])
    #expect(hovered.handle(.focusLost).toggled == nil && hovered.isOpen)
  }

  /// TIP-3 — a long press opens it; the lift starts the touch timeout, which closes it; a touch elsewhere closes it sooner.
  @Test("TIP-3 a long press opens; it stays the touch timeout after the lift; a touch elsewhere closes it")
  func touch() {
    var machine = Machine()
    #expect(machine.handle(.longPressed).toggled == true && machine.byTouch)
    #expect(machine.handle(.touchLifted).start == [.touch])
    #expect(machine.handle(.elapsed(.touch)).toggled == false)
    var sooner = Machine()
    _ = run(&sooner, [.longPressed, .touchLifted])
    #expect(sooner.handle(.touchElsewhere).toggled == false && !sooner.isOpen)
    // A touch elsewhere does nothing to a tooltip the pointer or focus opened.
    var focused = Machine()
    _ = run(&focused, [.focusGained])
    #expect(focused.handle(.touchElsewhere).toggled == nil && focused.isOpen)
  }

  /// TIP-4 — Escape closes it; it stays closed until the pointer enters the anchor again or the anchor is focused again.
  @Test("TIP-4 Escape closes it until the anchor is entered or focused again")
  func escape() {
    var machine = Machine()
    _ = run(&machine, [.pointerEnteredAnchor(othersOpen: false), .elapsed(.show)])
    #expect(machine.handle(.escape).toggled == false && machine.suppressed)
    #expect(machine.handle(.elapsed(.show)).toggled == nil && !machine.isOpen)
    _ = machine.handle(.pointerLeftAnchor)
    #expect(run(&machine, [.pointerEnteredAnchor(othersOpen: false), .elapsed(.show)]) == [true])
    _ = run(&machine, [.escape, .focusLost])
    #expect(machine.handle(.focusGained).toggled == true)
    // Escape on a closed tooltip is not the tooltip's (the anchor does not consume it).
    var closed = Machine()
    #expect(closed.handle(.escape).toggled == nil)
  }

  /// TIP-5 — hovered or focused, nothing times it out: no timer runs while it is held.
  @Test("TIP-5 no time limit while the pointer or focus holds it")
  func noTimeout() {
    var machine = Machine()
    let effects = [machine.handle(.focusGained), machine.handle(.pointerEnteredAnchor(othersOpen: false))]
    #expect(effects.allSatisfy { !$0.start.contains(.hide) && !$0.start.contains(.touch) })
    #expect(machine.handle(.elapsed(.hide)).toggled == nil && machine.handle(.elapsed(.touch)).toggled == nil && machine.isOpen)
  }

  /// TIP-6 — an activation closes it, and the same hover does not open it again until the pointer leaves and returns.
  @Test("TIP-6 an activation closes it; the same hover does not reopen it")
  func activation() {
    var machine = Machine()
    _ = run(&machine, [.pointerEnteredAnchor(othersOpen: false), .elapsed(.show)])
    #expect(machine.handle(.activated).toggled == false)
    #expect(run(&machine, [.elapsed(.show), .elapsed(.hide)]).isEmpty && !machine.isOpen)
    #expect(run(&machine, [.pointerLeftAnchor, .pointerEnteredAnchor(othersOpen: false), .elapsed(.show)]) == [true])
  }

  /// TIP-7 — opening or closing by itself emits toggle; the product setting it emits nothing, and the rules go on.
  @Test("TIP-7 toggle only when it opens or closes by itself; the product's value is followed")
  func controlled() {
    var machine = Machine()
    #expect(machine.handle(.set(true)).toggled == nil && machine.isOpen)
    _ = machine.handle(.pointerEnteredAnchor(othersOpen: false))
    #expect(machine.handle(.pointerLeftAnchor).start == [.hide])
    #expect(machine.handle(.elapsed(.hide)).toggled == false)
    #expect(machine.handle(.set(true)).toggled == nil && machine.handle(.set(false)).toggled == nil && !machine.isOpen)
    // Starting open (a snapshot harness, a first-run hint).
    #expect(Machine(isOpen: true).isOpen)
  }

  /// TIP-8 — at most one open: another opening closes this one at once; while one is open the next opens without the
  /// show delay.
  @Test("TIP-8 one tooltip at a time; the next opens without the delay")
  func oneAtATime() {
    var machine = Machine()
    #expect(machine.handle(.pointerEnteredAnchor(othersOpen: true)).toggled == true)
    #expect(machine.handle(.otherOpened).toggled == false)
    let coordinator = TanreiTooltipCoordinator()
    var closed: [String] = []
    let a = UUID()
    let b = UUID()
    coordinator.opened(a) { closed.append("a") }
    #expect(coordinator.isOtherOpen(than: b) && !coordinator.isOtherOpen(than: a))
    coordinator.opened(b) { closed.append("b") }
    #expect(closed == ["a"] && !coordinator.isOtherOpen(than: b))
    coordinator.closed(a)
    #expect(coordinator.isOtherOpen(than: a))
    coordinator.closed(b)
    #expect(!coordinator.isOtherOpen(than: a))
  }

  /// TIP-13, TIP-9 — a press on the tooltip closes it; so does its anchor going away.
  @Test("TIP-13 TIP-9 a press on the tooltip or the anchor going away closes it")
  func pressAndGone() {
    var machine = Machine(isOpen: true)
    #expect(machine.handle(.pressedTooltip).toggled == false)
    var gone = Machine(isOpen: true)
    #expect(gone.handle(.anchorGone).toggled == false)
  }

  /// TIP-16 — an empty text never opens and describes nothing, and is reported; a plain tooltip's title is ignored and
  /// reported.
  @Test("TIP-16 an empty text never opens; a plain tooltip's title is reported")
  func empty() {
    var machine = Machine(isOpen: true, canOpen: false)
    #expect(!machine.isOpen)
    #expect(run(&machine, [.focusGained, .longPressed, .pointerEnteredAnchor(othersOpen: true), .set(true)]).isEmpty && !machine.isOpen)
    let empty = TanreiTooltipContent(text: " ", title: "", variant: .plain, placement: .top, describes: true)
    #expect(empty.isEmpty && empty.accessibilityDescription == nil && empty.problems.contains { $0.contains("TIP-16") })
    let titled = TanreiTooltipContent(text: "Move to trash", title: "Trash", variant: .plain, placement: .top, describes: true)
    #expect(titled.problems.count == 1 && titled.problems[0].contains("ignores its title") && titled.drawnTitle == nil)
    let (_, reports) = Reports.collecting { _ = Text("x").tanreiTooltip("", isPresented: .constant(true)) }
    #expect(reports.mention("TIP-16"))
  }

  /// TIP-14 — the description: the text, after the title for a rich tooltip; nothing while describes is false or the text
  /// is empty. The name is never touched (the modifier adds a hint only).
  @Test("TIP-14 the anchor's description is the text, after the title; nothing when describes is false")
  func description() {
    func content(_ variant: TanreiTooltipVariant, title: String = "", describes: Bool = true) -> TanreiTooltipContent {
      TanreiTooltipContent(text: "Trash still counts toward storage.", title: title, variant: variant, placement: .top, describes: describes)
    }
    #expect(content(.plain).accessibilityDescription == "Trash still counts toward storage.")
    #expect(content(.rich, title: "Storage").accessibilityDescription == "Storage. Trash still counts toward storage.")
    #expect(content(.rich).accessibilityDescription == "Trash still counts toward storage.")
    #expect(content(.plain, title: "Storage").accessibilityDescription == "Trash still counts toward storage.")
    #expect(content(.rich, title: "Storage", describes: false).accessibilityDescription == nil)
  }

  /// The spec's names: variant and placement, and an unknown name is the default, reported.
  @Test("TIP-9 TIP-10 spec names for variant and placement; unknown names are the defaults")
  func names() {
    #expect(TanreiTooltipVariant.allCases.map(\.rawValue) == ["plain", "rich"])
    #expect(TanreiTooltipPlacement.allCases.map(\.rawValue) == ["top", "bottom", "start", "end"])
    let (variant, reports) = Reports.collecting { TanreiTooltipVariant(named: "fancy") }
    #expect(variant == .plain && reports.mention("fancy"))
    let (placement, placementReports) = Reports.collecting { TanreiTooltipPlacement(named: "left") }
    #expect(placement == .top && placementReports.mention("left"))
  }
}

// MARK: - Where it goes (TIP-9)

@MainActor
@Suite("TanreiTooltip placement")
struct TanreiTooltipPlacementTests {
  let bounds = CGRect(x: 8, y: 8, width: 304, height: 184)
  let anchor = CGRect(x: 142, y: 82, width: 36, height: 36)
  let size = CGSize(width: 100, height: 24)

  /// TIP-9 — the preferred side, `offset` away, centred on the anchor along it.
  @Test("TIP-9 on the preferred side, offset away, centred")
  func preferred() {
    let top = TanreiTooltipGeometry.frame(size: size, anchor: anchor, bounds: bounds, preferred: .top, offset: 4)
    #expect(top.side == .top && top.frame == CGRect(x: 110, y: 54, width: 100, height: 24))
    let right = TanreiTooltipGeometry.frame(size: size, anchor: anchor, bounds: bounds, preferred: .right, offset: 4)
    #expect(right.side == .right && right.frame == CGRect(x: 182, y: 88, width: 100, height: 24))
  }

  /// TIP-9 — no room: it flips to the opposite side; room on neither: the side with more; and it shifts along the side to
  /// stay inside the margin.
  @Test("TIP-9 flips, picks the roomier side, and shifts inside the margin")
  func flipAndShift() {
    let nearTop = CGRect(x: 142, y: 10, width: 36, height: 36)
    #expect(TanreiTooltipGeometry.frame(size: size, anchor: nearTop, bounds: bounds, preferred: .top, offset: 4).side == .bottom)
    let tall = CGSize(width: 100, height: 120)
    #expect(TanreiTooltipGeometry.side(.top, size: tall, anchor: CGRect(x: 142, y: 120, width: 36, height: 36), bounds: bounds, offset: 4) == .top)
    #expect(TanreiTooltipGeometry.side(.top, size: tall, anchor: CGRect(x: 142, y: 40, width: 36, height: 36), bounds: bounds, offset: 4) == .bottom)
    let nearLeft = CGRect(x: 10, y: 82, width: 36, height: 36)
    let shifted = TanreiTooltipGeometry.frame(size: size, anchor: nearLeft, bounds: bounds, preferred: .top, offset: 4)
    #expect(shifted.frame.minX == bounds.minX)
    let nearRight = CGRect(x: 280, y: 82, width: 36, height: 36)
    #expect(TanreiTooltipGeometry.frame(size: size, anchor: nearRight, bounds: bounds, preferred: .bottom, offset: 4).frame.maxX == bounds.maxX)
    #expect(TanreiTooltipGeometry.frame(size: size, anchor: nearLeft, bounds: bounds, preferred: .left, offset: 4).side == .right)
  }

  /// TIP-9 — start and end follow the layout direction.
  @Test("TIP-9 start and end follow the layout direction")
  func startEnd() {
    #expect(TanreiTooltipPlacement.start.side(in: .leftToRight) == .left && TanreiTooltipPlacement.start.side(in: .rightToLeft) == .right)
    #expect(TanreiTooltipPlacement.end.side(in: .leftToRight) == .right && TanreiTooltipPlacement.end.side(in: .rightToLeft) == .left)
    #expect(TanreiTooltipPlacement.top.side(in: .rightToLeft) == .top)
  }

  /// TIP-9 — rendered: below the anchor for `bottom`; flipped below when the stage has no room above; the window margin
  /// and offset are values of the system; an anchor outside the layer draws nothing.
  @Test("TIP-9 rendered: the side, the flip, the tokens")
  func rendered() throws {
    let ink = light[.inverseSurface].rgba8()
    func stage(anchorAt y: CGFloat, placement: TanreiTooltipPlacement = .top, system: TanreiSystem = .tanrei) throws -> Bitmap {
      let view = ZStack(alignment: .top) {
        Color.clear
        Rectangle().fill(Color.clear).frame(width: 36, height: 36)
          .tanreiTooltip("Move to trash", placement: placement, isPresented: .constant(true))
          .padding(.top, y)
      }
      .frame(width: 320, height: 200)
      .tanreiTooltipLayer()
      return try Snapshot.render(view, theme: theme(system))
    }
    // Whether row `y` (points of the stage) holds the tooltip's container anywhere.
    func inked(_ bitmap: Bitmap, y: CGFloat) -> Bool {
      stride(from: Snapshot.inset, to: Snapshot.inset + 320, by: 1).contains { pixel(bitmap, x: $0, y: Snapshot.inset + y).isClose(to: ink) }
    }
    let below = try stage(anchorAt: 82, placement: .bottom)
    #expect(inked(below, y: 118 + 4 + 2) && !inked(below, y: 82 - 4 - 2))
    #expect(!inked(below, y: 118 + 2))  // the offset: nothing right under the anchor
    let flipped = try stage(anchorAt: 4)
    #expect(inked(flipped, y: 40 + 4 + 2) && !inked(flipped, y: 2))
    var far = TanreiSystem.tanrei
    far.tooltip.offset = 30
    let offset = try stage(anchorAt: 82, system: far)
    #expect(inked(offset, y: 82 - 30 - 2) && !inked(offset, y: 82 - 8))
    let outside = try stage(anchorAt: 400)
    #expect(!stride(from: CGFloat(2), to: 198, by: 2).contains { inked(outside, y: $0) })
  }
}

// MARK: - Drawn (TIP-10 … TIP-13, TIP-15)

@MainActor
@Suite("TanreiTooltip rendered")
struct TanreiTooltipRenderedTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiTooltipTokens { system.tooltip }

  /// The bubble alone, at its natural size inside `width`.
  private func bubble(_ text: String, title: String = "", variant: TanreiTooltipVariant = .plain, width: CGFloat? = nil) -> some View {
    let maxWidth = variant == .rich ? tokens.richContainerMaxWidth : tokens.plainContainerMaxWidth
    // As the layer proposes it: at most the maximum width; the bubble hugs its text inside.
    return TanreiTooltipBubble(content: TanreiTooltipContent(text: text, title: title, variant: variant, placement: .top, describes: true))
      .frame(width: width ?? maxWidth, alignment: .topLeading)
      .fixedSize(horizontal: false, vertical: true)
  }

  private func size(_ bitmap: Bitmap) -> CGSize {
    CGSize(width: CGFloat(bitmap.width) / Snapshot.scale - 2 * Snapshot.inset, height: CGFloat(bitmap.height) / Snapshot.scale - 2 * Snapshot.inset)
  }

  /// TIP-10 — plain: its container, text, corners, padding, minimum height and maximum width (wrapping); TIP-11 — rich:
  /// its container, title above the text a gap apart, padding and maximum width; no title, the text alone.
  @Test("TIP-10 TIP-11 each form binds its tokens")
  func bindings() {
    let plain = TanreiTooltipAppearance(tokens: tokens, variant: .plain)
    #expect(plain.container == .role(.inverseSurface) && plain.textColor == .role(.inverseOnSurface) && plain.elevation == system.elevation.level0)
    #expect(plain.cornerRadius == tokens.plainContainerShape && plain.minHeight == tokens.plainContainerMinHeight && plain.maxWidth == tokens.plainContainerMaxWidth)
    #expect(plain.paddingInline == tokens.plainContainerPaddingInline && plain.paddingBlock == tokens.plainContainerPaddingBlock)
    #expect(plain.textStyle == tokens.plainSupportingTextTypescale)
    let rich = TanreiTooltipAppearance(tokens: tokens, variant: .rich)
    #expect(rich.container == .role(.surfaceBright) && rich.textColor == .role(.onSurfaceVariant) && rich.elevation == system.elevation.level2)
    #expect(rich.minHeight == nil && rich.gap == tokens.richContainerGap && rich.maxWidth == tokens.richContainerMaxWidth)
    var custom = tokens
    custom.plainContainerColor = .role(.error)
    custom.richContainerGap = 30
    custom.richContainerPaddingInline = 2
    #expect(TanreiTooltipAppearance(tokens: custom, variant: .plain).container == .role(.error))
    #expect(TanreiTooltipAppearance(tokens: custom, variant: .rich).gap == 30 && TanreiTooltipAppearance(tokens: custom, variant: .rich).paddingInline == 2)
  }

  /// TIP-10 — rendered: a short text keeps the minimum height; a long one wraps at the maximum width and grows; the colors.
  @Test("TIP-10 plain: minimum height, maximum width and wrapping, colors")
  func plain() throws {
    let short = try Snapshot.render(bubble("OK"))
    #expect(size(short).height == max(tokens.plainContainerMinHeight, tokens.plainSupportingTextTypescale.lineHeight + 2 * tokens.plainContainerPaddingBlock))
    #expect(pixel(short, x: Snapshot.inset + 2, y: Snapshot.inset + size(short).height / 2).isClose(to: light[.inverseSurface].rgba8(), tolerance: 6))
    let long = try Snapshot.render(bubble("Move the selected files to the trash. They are deleted after 30 days."))
    #expect(size(long).height > 2 * tokens.plainSupportingTextTypescale.lineHeight)
    // Wrapped at the maximum width: the container ends before it.
    #expect(!pixel(long, x: Snapshot.inset + tokens.plainContainerMaxWidth + 1, y: Snapshot.inset + 4).isClose(to: light[.inverseSurface].rgba8(), tolerance: 6))
    var custom = system
    custom.tooltip.plainContainerMinHeight = 60
    #expect(size(try Snapshot.render(bubble("OK"), theme: theme(custom))).height == 60)
  }

  /// TIP-11 — rendered: the title above the text a gap apart; without a title the text alone (shorter by the title and
  /// the gap).
  @Test("TIP-11 rich: the title above the text; untitled, the text alone")
  func rich() throws {
    let titled = size(try Snapshot.render(bubble("Trash still counts toward storage.", title: "Storage", variant: .rich)))
    let untitled = size(try Snapshot.render(bubble("Trash still counts toward storage.", variant: .rich)))
    #expect(titled.height == untitled.height + tokens.richTitleTypescale.lineHeight + tokens.richContainerGap)
    #expect(untitled.height == tokens.richSupportingTextTypescale.lineHeight + 2 * tokens.richContainerPaddingBlock)
  }

  /// TIP-12 — corners follow the corner smoothing; text is start-aligned (right to left, it starts at the right edge); it
  /// grows with its text rather than clipping it.
  @Test("TIP-12 corners, start alignment, growth")
  func cornersAndAlignment() throws {
    func corners(_ amount: Double) throws -> Bitmap {
      var custom = system
      custom.shape.cornerSmoothing = amount
      custom.tooltip.plainContainerShape = 12
      return try Snapshot.renderExact(bubble("Move to trash"), theme: theme(custom))
    }
    #expect(try corners(0).mismatch(against: try corners(0.6), channelTolerance: 0) > 0)
    let text = light[.inverseOnSurface].rgba8()
    // The second, short line: at the start edge — the left, or right to left the right. Measured from the container's
    // left edge.
    func firstInk(_ bitmap: Bitmap) -> CGFloat? {
      let y = Snapshot.inset + tokens.plainContainerPaddingBlock + tokens.plainSupportingTextTypescale.lineHeight * 1.5
      let row = stride(from: Snapshot.inset, to: Snapshot.inset + 200, by: 0.5)
      guard let edge = row.first(where: { pixel(bitmap, x: $0, y: y).isClose(to: light[.inverseSurface].rgba8(), tolerance: 6) }) else { return nil }
      return row.first { $0 > edge && pixel(bitmap, x: $0, y: y).isClose(to: text, tolerance: 90) }.map { $0 - edge + Snapshot.inset }
    }
    let wide = bubble("A much longer first line\nShort", width: 200)
    let ltr = try #require(firstInk(try Snapshot.render(wide)))
    #expect(ltr < Snapshot.inset + tokens.plainContainerPaddingInline + 4)
    let rtl = try #require(firstInk(try Snapshot.render(wide.environment(\.layoutDirection, .rightToLeft))))
    #expect(rtl > ltr + 40)
    // It grows with its text: more lines, taller.
    #expect(size(try Snapshot.render(bubble("One\nTwo\nThree"))).height > size(try Snapshot.render(bubble("One"))).height)
  }

  /// TIP-13 — drawn above the content of its layer (a view drawn later, over the same place, does not cover it); it
  /// takes no focus (nothing in it is focusable: a text and its container).
  @Test("TIP-13 drawn above everything in its layer")
  func above() throws {
    let view = VStack(spacing: .zero) {
      Color.clear.frame(height: 82)
      Rectangle().fill(Color.clear).frame(width: 36, height: 36).tanreiTooltip("Move to trash", placement: .bottom, isPresented: .constant(true))
      Rectangle().fill(Color.red).frame(height: 82)
    }
    .frame(width: 320)
    .tanreiTooltipLayer()
    let rendered = try Snapshot.render(view)
    #expect(pixel(rendered, x: Snapshot.inset + 160, y: Snapshot.inset + 118 + 4 + 2).isClose(to: light[.inverseSurface].rgba8(), tolerance: 6))
    #expect(pixel(rendered, x: Snapshot.inset + 10, y: Snapshot.inset + 118 + 4 + 2).isClose(to: Color.red.rgba8()))
  }

  /// TIP-15 — the fade in and out come from the tokens and stay where motion is reduced (nothing moves).
  @Test("TIP-15 the fades come from the tokens")
  func fades() {
    var custom = tokens
    custom.motionEnterDuration = 300
    custom.motionEnterEasing = TanreiCubicBezier(0, 0, 1, 1)
    custom.motionExitDuration = 200
    custom.motionExitEasing = TanreiCubicBezier(0.5, 0, 1, 1)
    #expect(custom.fade(opening: true) == Animation.timingCurve(0, 0, 1, 1, duration: 0.3))
    #expect(custom.fade(opening: false) == Animation.timingCurve(0.5, 0, 1, 1, duration: 0.2))
  }
}

// MARK: - End to end (TIP-1, TIP-7)

/// What the hosted test's tooltips write to their bindings (their `toggle`).
@MainActor
private final class TooltipWrites {
  var first: [Bool] = []
  var second: [Bool] = []
}

/// Two anchors side by side, the first's tooltip open from the start (a product's first-run hint), each binding kept in
/// state as an app keeps it.
private struct TooltipPair: View {
  let writes: TooltipWrites
  @State private var first = true
  @State private var second = false

  var body: some View {
    HStack(spacing: 100) {
      Rectangle().fill(Color.gray).frame(width: 36, height: 36)
        .tanreiTooltip("Move to trash", isPresented: Binding(get: { first }, set: { first = $0; writes.first.append($0) }))
      Rectangle().fill(Color.gray).frame(width: 36, height: 36)
        .tanreiTooltip("Archive", isPresented: Binding(get: { second }, set: { second = $0; writes.second.append($0) }))
    }
    .frame(width: 320, height: 200)
    .tanreiTooltipLayer()
  }
}

@MainActor
@Suite("TanreiTooltip hosted", .serialized)
struct TanreiTooltipHostedTests {
  #if os(macOS)
  /// TIP-1 TIP-8 TIP-7 end to end, in a window: while one tooltip is open, a pointer entering another anchor opens that one
  /// at once — no show delay — and closes the first (at most one open); each writes its binding (toggle), the product's
  /// own value excepted. The timed paths (the show delay, the hide delay, the touch timeout) are the machine's, tested above
  /// event by event, and run for real in the gallery's UI test (the touch timeout): in a full run of this suite a
  /// component's main-actor timer can wake half a minute late (as the menu's press hold
  /// can), so no test here waits for one.
  @Test("TIP-1 TIP-7 TIP-8 hovering an anchor while another tooltip is open opens it at once and closes the other")
  func hover() async throws {
    let writes = TooltipWrites()
    let hosted = HostedView(TooltipPair(writes: writes).tanreiTheme(Snapshot.theme))
    _ = await hosted.wait(atMost: 1) { false }
    // Entering the second while the first is open: the second opens at once, and the first closes (its toggle).
    hosted.hover(at: CGPoint(x: 160 + 50 + 18, y: 100))
    #expect(await hosted.wait(atMost: 20) { writes.second == [true] && writes.first == [false] }, "\(writes.first) \(writes.second)")
  }
  #endif
}

// MARK: - Fixtures (one per spec fixture)

/// Draws a fixture of specs/tooltip.spec.json as the spec's harness says: a 320 × 200 stage, a medium standard icon button
/// labelled after the fixture's glyph at its centre (the SF Symbol a product would pass for it), and the tooltip open.
@MainActor
enum TanreiTooltipFixtures {
  static let symbols: [String: String] = ["delete": "trash", "info": "info.circle"]
  static let stage = CGSize(width: 320, height: 200)

  static func content(_ fixture: SpecFixture) -> TanreiTooltipContent {
    TanreiTooltipContent(
      text: fixture.string("text") ?? "", title: fixture.string("title") ?? "",
      variant: fixture.string("variant").map(TanreiTooltipVariant.init(named:)) ?? .plain,
      placement: fixture.string("placement").map(TanreiTooltipPlacement.init(named:)) ?? .top, describes: fixture.bool("describes") ?? true)
  }

  static func view(_ fixture: SpecFixture) -> some View {
    let glyph = fixture.content ?? ""
    let content = content(fixture)
    return ZStack {
      TanreiIconButton(glyph, action: {}) { Image(systemName: symbols[glyph] ?? glyph) }
        .tanreiTooltip(
          content.text, title: content.title, variant: content.variant, placement: content.placement, describes: content.describes,
          isPresented: .constant(fixture.bool("open") ?? false))
    }
    .frame(width: stage.width, height: stage.height)
    .tanreiTooltipLayer()
  }
}

@MainActor
@Suite("TanreiTooltip snapshots")
struct TanreiTooltipSnapshotTests {
  /// Mirrors `fixtures` in specs/tooltip.spec.json.
  nonisolated static let fixtures = ["plain", "plain-wrapped", "plain-bottom", "rich", "rich-untitled"]

  static func fixture(_ id: String) throws -> SpecFixture {
    try #require(try SpecFixture.load(spec: "tooltip").first { $0.id == id })
  }

  @Test("TIP-10 TIP-11 fixture matches its baseline", arguments: fixtures)
  func fixture(_ id: String) throws {
    try Snapshot.assert(TanreiTooltipFixtures.view(try Self.fixture(id)), named: id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    #expect(try SpecFixture.load(spec: "tooltip").map(\.id) == Self.fixtures)
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiTooltipTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiTooltip preset snapshots")
struct TanreiTooltipPresetSnapshotTests {
  /// The rich tooltip: the preset's raised surface, its elevation, corners, title and text styles.
  nonisolated static let fixtureId = "rich"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiTooltipSnapshotTests.fixtures.contains(Self.fixtureId))
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try TanreiTooltipSnapshotTests.fixture(Self.fixtureId)
    try Snapshot.assert(TanreiTooltipFixtures.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
