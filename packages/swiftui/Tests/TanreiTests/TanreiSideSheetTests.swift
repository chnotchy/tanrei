import AcmeFixture
import SwiftUI
import Testing

@_spi(Fixtures) @testable import Tanrei

// Covers specs/side-sheet.spec.json. Each behavior id (SSH-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file.
//
// The fixtures draw the sheet in place — for a modal sheet its scrim too — in a 720 × 480 stage over the page's surface
// (`TanreiSideSheetSurface(inPlace:)`), with no system insets, because a render of the presenting view does not include a
// presented window. The presentation itself (the full-screen cover, VoiceOver, the escape gesture and touch drags on a
// phone) is the platform's and is exercised by the Gallery's UI tests; opening, closing, the slide, the close button, Escape
// and the modal count are driven here in a hosted macOS window with real mouse and key events (on macOS the modal sheet is an
// overlay of the view the modifier is attached to).
//
// Accessibility semantics (SSH-9, SSH-11, SSH-12): the macOS accessibility tree is not available to unit tests
// (packages/swiftui/AGENTS.md); what the sheet hands SwiftUI is tested here as rules and reports, and the tree as VoiceOver
// gets it in the Gallery's UI tests (`testSideSheetSemantics`).

private let suiteName = "TanreiSideSheetTests"

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
private let stage = CGSize(width: 720, height: 480)
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

/// A block of content `height` high across the content's width (or `width` wide), in the probe color.
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
  _ headline: String = "Filters", variant: TanreiSideSheetVariant = .standard, closable: Bool = false, closeLabel: String = "Close filters",
  size: CGSize = stage, @ViewBuilder content: () -> some View
) -> some View {
  TanreiSideSheetSurface(inPlace: headline, variant: variant, closable: closable, closeLabel: closeLabel, content: content)
    .frame(width: size.width, height: size.height)
}

/// The sheet in place with two text actions.
@MainActor
private func withActions(
  _ headline: String = "Filters", variant: TanreiSideSheetVariant = .standard, size: CGSize = stage, labels: [String] = ["Apply", "Reset"],
  @ViewBuilder content: () -> some View
) -> some View {
  TanreiSideSheetSurface(inPlace: headline, variant: variant, content: content) {
    ForEach(labels, id: \.self) { TanreiButton($0, variant: .text) {} }
  }
  .frame(width: size.width, height: size.height)
}

/// The first and last x (points, inset included) on row `y` whose pixel is `color`.
@MainActor
private func horizontalExtent(_ bitmap: Bitmap, y: CGFloat, color: Bitmap.RGBA, tolerance: Int = 6) -> (min: CGFloat, max: CGFloat)? {
  let xs = stride(from: CGFloat.zero, to: CGFloat(bitmap.width) / Snapshot.scale, by: 0.5).filter {
    pixel(bitmap, x: $0, y: y).isClose(to: color, tolerance: tolerance)
  }
  guard let first = xs.first, let last = xs.last else { return nil }
  return (first, last + 0.5)
}

/// The first y (points, inset included) on column `x` where the render is `color`, scanning down from `from`.
@MainActor
private func firstY(_ bitmap: Bitmap, x: CGFloat, color: Bitmap.RGBA, from: CGFloat = Snapshot.inset, tolerance: Int = 6) -> CGFloat? {
  stride(from: from, to: CGFloat(bitmap.height) / Snapshot.scale, by: 0.5).first { pixel(bitmap, x: x, y: $0).isClose(to: color, tolerance: tolerance) }
}

/// The last y on column `x` where the render is `color`.
@MainActor
private func lastY(_ bitmap: Bitmap, x: CGFloat, color: Bitmap.RGBA, tolerance: Int = 6) -> CGFloat? {
  stride(from: CGFloat(bitmap.height) / Snapshot.scale - 0.5, to: .zero, by: -0.5).first { pixel(bitmap, x: x, y: $0).isClose(to: color, tolerance: tolerance) }
}

/// The first x on row `y`, scanning from `from` to `to`, whose pixel is not `color`.
@MainActor
private func firstX(_ bitmap: Bitmap, y: CGFloat, from: CGFloat, to: CGFloat, notColor color: Bitmap.RGBA, tolerance: Int = 12) -> CGFloat? {
  let step: CGFloat = from < to ? 0.5 : -0.5
  return stride(from: from, to: to, by: step).first { !pixel(bitmap, x: $0, y: y).isClose(to: color, tolerance: tolerance) }
}

// MARK: - Rules (SSH-3, SSH-4, SSH-5, SSH-6, SSH-7, SSH-8, SSH-11, SSH-12, SSH-13)

@MainActor
@Suite("TanreiSideSheet rules")
struct TanreiSideSheetRulesTests {
  let tokens = TanreiSystem.tanrei.sideSheet
  let touch = TanreiSystem.tanrei.measure.targetTouch

  /// SSH-7 — `container.width` wide; a modal sheet is never wider than the window less `sys.target.touch`, so that a strip
  /// of scrim stays (on a 360-wide phone, 312 and a 48 strip); a standard one keeps its width.
  @Test("SSH-7 the width: the token; a modal sheet leaves a touch target of scrim on a narrow window")
  func width() {
    #expect(tokens.containerWidth == 320 && touch == 48)
    #expect(TanreiSideSheetRules.width(containerWidth: 320, isModal: true, window: 720, touchTarget: touch) == 320)
    #expect(TanreiSideSheetRules.width(containerWidth: 320, isModal: true, window: 360, touchTarget: touch) == 312)
    #expect(TanreiSideSheetRules.width(containerWidth: 320, isModal: false, window: 360, touchTarget: touch) == 320)
    #expect(TanreiSideSheetRules.width(containerWidth: 320, isModal: true, window: 20, touchTarget: touch) == 0)
  }

  /// SSH-4 — a released drag asks to close past half the sheet's width toward the trailing edge, or flung that way faster
  /// than 0.5 points per millisecond (BSH-9's fling); the touch slop is 8 points. A fling away from the edge never closes.
  @Test("SSH-4 a drag closes past half the width or flung toward the edge; the slop and the fling are BSH-9's")
  func drag() {
    #expect(TanreiSheetDrag.touchSlop == 8 && TanreiSheetDrag.flingVelocity == 0.5)
    #expect(!TanreiSideSheetRules.dragCloses(distance: 160, velocity: 0, width: 320))
    #expect(TanreiSideSheetRules.dragCloses(distance: 161, velocity: 0, width: 320))
    #expect(!TanreiSideSheetRules.dragCloses(distance: 20, velocity: 500, width: 320))
    #expect(TanreiSideSheetRules.dragCloses(distance: 20, velocity: 501, width: 320))
    #expect(!TanreiSideSheetRules.dragCloses(distance: 20, velocity: -900, width: 320))
  }

  /// SSH-6 (and SSH-4, SSH-5) — a close writes false to the binding first and then calls onClose with the reason, once; a
  /// binding that declines the write still hears it, and stays open. The reasons are the spec's, `close` included.
  @Test("SSH-6 a close writes false, then reports its reason, once; a declined close stays open")
  func close() {
    let open = Store(true)
    var heard: [(TanreiSheetCloseReason, Bool)] = []
    let onClose: @MainActor (TanreiSheetCloseReason) -> Void = { heard.append(($0, open.value)) }
    #expect(TanreiSheetRules.close(open.binding, dismissible: true, reason: .close, onClose: onClose))
    #expect(!TanreiSheetRules.close(open.binding, dismissible: true, reason: .scrim, onClose: onClose))
    #expect(open.writes == [false] && heard.count == 1 && heard[0].0 == .close && heard[0].1 == false)
    let declining = Store(true)
    declining.accepts = false
    #expect(TanreiSheetRules.close(declining.binding, dismissible: true, reason: .drag, onClose: onClose))
    #expect(declining.writes == [false] && declining.value && heard.last?.0 == .drag)
    #expect(TanreiSheetCloseReason.allCases.map(\.rawValue) == ["close", "scrim", "escape", "back", "drag"])
  }

  /// SSH-12 — an empty headline is reported; SSH-5 — a close button without a label is reported, and only while closable.
  /// SSH-8 — the header is drawn while there is a headline or a close button.
  @Test("SSH-12 SSH-5 SSH-8 nameless sheets and close buttons are reported; when the header is drawn")
  func names() {
    let nameless = TanreiSideSheetConfiguration(headline: " ", closable: true, closeLabel: "")
    #expect(nameless.problems.contains { $0.contains("SSH-12") } && nameless.problems.contains { $0.contains("SSH-5") })
    #expect(TanreiSideSheetConfiguration(headline: "Filters", closable: false, closeLabel: "").problems.isEmpty)
    #expect(TanreiSideSheetConfiguration(headline: "Filters", closable: true, closeLabel: "Close filters").problems.isEmpty)
    #expect(TanreiSideSheetConfiguration(headline: "Filters").hasHeader)
    #expect(TanreiSideSheetConfiguration(headline: "", closable: true).hasHeader)
    #expect(!TanreiSideSheetConfiguration(headline: "", closable: false).hasHeader)
  }

  /// SSH-13 — a variant the design system does not have reads the default's tokens and is reported; only `modal` is a
  /// modal overlay: a value a design system adds is laid out as a standard sheet. SSH-3 — a modal sheet mounted
  /// open moves focus in as if it had just opened; a standard one does not.
  @Test("SSH-13 SSH-3 an unknown variant reads the default's tokens and is reported; which forms are modal")
  func variants() {
    let (look, reports) = Reports.collecting { tokens.variants[TanreiSideSheetVariant(rawValue: "detached")] }
    #expect(look == tokens.variants.standard && reports.mention("\"detached\""))
    #expect(TanreiSideSheetRules.isModal(.modal) && !TanreiSideSheetRules.isModal(.standard))
    #expect(!TanreiSideSheetRules.isModal(TanreiSideSheetVariant(rawValue: "detached")))
    #expect(TanreiSideSheetRules.movesFocusWhenMountedOpen(isModal: true) && !TanreiSideSheetRules.movesFocusWhenMountedOpen(isModal: false))
    #expect(TanreiSideSheetVariant.fallback == .standard)
  }

  /// SSH-11 — the actions stay in one row while their widths and gaps fit, and stack otherwise.
  @Test("SSH-11 the actions fit in a row, or stack")
  func actionsRow() {
    #expect(TanreiSideSheetRules.actionsFitInRow(widths: [80, 80], gap: 8, available: 168))
    #expect(!TanreiSideSheetRules.actionsFitInRow(widths: [80, 80], gap: 8, available: 167))
    #expect(TanreiSideSheetRules.actionsFitInRow(widths: [300], gap: 8, available: 300))
    #expect(TanreiSideSheetRules.actionsFitInRow(widths: [], gap: 8, available: 0))
  }
}

// MARK: - Token bindings (SSH-1, SSH-2, SSH-4)

@MainActor
@Suite("TanreiSideSheet token bindings")
struct TanreiSideSheetTokenBindingTests {
  /// SSH-1, SSH-2, SSH-4 — the enter and exit motions come from the sheet's tokens; under Reduce Motion a standard sheet and a
  /// drag's slide back are at once, while a modal sheet keeps its motions (it fades in place instead of sliding).
  @Test("SSH-1 SSH-2 SSH-4 the motions come from the tokens; Reduce Motion")
  func motion() {
    var custom = TanreiSystem.tanrei.sideSheet
    custom.motionEnterDuration = 700
    custom.motionEnterEasing = TanreiCubicBezier(0.1, 0.2, 0.3, 0.4)
    custom.motionExitDuration = 250
    custom.motionExitEasing = TanreiCubicBezier(0.4, 0.3, 0.2, 0.1)
    #expect(custom.enterMotion(reduceMotion: false) == Animation.timingCurve(0.1, 0.2, 0.3, 0.4, duration: 0.7))
    #expect(custom.exitMotion(reduceMotion: false) == Animation.timingCurve(0.4, 0.3, 0.2, 0.1, duration: 0.25))
    #expect(custom.presentMotion() == Animation.timingCurve(0.1, 0.2, 0.3, 0.4, duration: 0.7))
    #expect(custom.withdrawMotion() == Animation.timingCurve(0.4, 0.3, 0.2, 0.1, duration: 0.25))
    #expect(custom.enterMotion(reduceMotion: true) == nil && custom.exitMotion(reduceMotion: true) == nil)
    // The default system: medium2 in with emphasized-decelerate, short4 out with emphasized-accelerate.
    let tokens = TanreiSystem.tanrei.sideSheet
    #expect(tokens.motionEnterDuration == TanreiSystem.tanrei.motion.duration.medium2)
    #expect(tokens.motionExitDuration == TanreiSystem.tanrei.motion.duration.short4)
  }
}

// MARK: - Rendered (SSH-2, SSH-5, SSH-7 … SSH-14)

@MainActor
@Suite("TanreiSideSheet rendered")
struct TanreiSideSheetRenderedTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiSideSheetTokens { system.sideSheet }
  var right: CGFloat { Snapshot.inset + stage.width }
  var sheetLeft: CGFloat { right - tokens.containerWidth }

  /// SSH-7 — a standard sheet: `container.width` wide at the trailing end of its row, the full height, in the standard
  /// container color, edged at its leading side by `outline.width` of the standard outline color; no scrim.
  @Test("SSH-7 SSH-1 the standard sheet: width, height, color, the leading edge; no scrim")
  func standardContainer() throws {
    var red = system
    red.sideSheet.variants.standard.containerColor = .role(.error)
    let fill = light[.error].rgba8()
    let rendered = try Snapshot.render(surface { Block(height: 40) }, theme: theme(red))
    let extent = try #require(horizontalExtent(rendered, y: Snapshot.inset + 300, color: fill))
    #expect(extent.min == sheetLeft + tokens.outlineWidth && extent.max == right, "\(extent)")
    #expect(firstY(rendered, x: right - 10, color: fill) == Snapshot.inset)
    #expect(lastY(rendered, x: right - 10, color: fill) == Snapshot.inset + stage.height - 0.5)
    // The edge toward the content, the full height; the page beside it is the page's own surface (no scrim).
    let plain = try Snapshot.render(surface { Block(height: 40) })
    #expect(pixel(plain, x: sheetLeft + 0.25, y: Snapshot.inset + 300).isClose(to: light[.outlineVariant].rgba8(over: light[.surface]), tolerance: 12))
    #expect(pixel(plain, x: sheetLeft + 0.25, y: Snapshot.inset + 1).isClose(to: light[.outlineVariant].rgba8(over: light[.surface]), tolerance: 12))
    #expect(pixel(plain, x: sheetLeft + 10, y: Snapshot.inset + 300).isClose(to: light[.surface].rgba8()))
    #expect(pixel(plain, x: Snapshot.inset + 10, y: Snapshot.inset + 10).isClose(to: light[.surface].rgba8()))
    // The tokens drive it: the width, the edge's color and width.
    var custom = system
    custom.sideSheet.containerWidth = 200
    custom.sideSheet.variants.standard.containerColor = .role(.error)
    custom.sideSheet.variants.standard.outlineColor = .role(.warning)
    custom.sideSheet.outlineWidth = 4
    let narrow = try Snapshot.render(surface { Block(height: 40) }, theme: theme(custom))
    #expect(try #require(horizontalExtent(narrow, y: Snapshot.inset + 300, color: fill)).min == right - 200 + 4)
    #expect(try #require(horizontalExtent(narrow, y: Snapshot.inset + 300, color: light[.warning].rgba8())) == (right - 200, right - 196))
  }

  /// SSH-2, SSH-7 — a modal sheet: its scrim over the rest of the stage in `scrim.color`, the modal container color, its
  /// leading corners rounded by the modal shape and its trailing corners square, raised by its elevation; no visible edge.
  @Test("SSH-2 SSH-7 the modal sheet: scrim, color, rounded leading corners, square trailing ones, elevation")
  func modalContainer() throws {
    let scrim = light[.scrim].rgba8(over: light[.surface])
    let container = light[.surfaceContainerLow].rgba8()
    let rendered = try Snapshot.render(surface(variant: .modal) { Block(height: 40) })
    #expect(pixel(rendered, x: Snapshot.inset + 2, y: Snapshot.inset + 2).isClose(to: scrim))
    #expect(pixel(rendered, x: sheetLeft - 30, y: Snapshot.inset + 300).isClose(to: scrim))
    #expect(pixel(rendered, x: sheetLeft + 10, y: Snapshot.inset + 300).isClose(to: container))
    #expect(pixel(rendered, x: sheetLeft + 0.25, y: Snapshot.inset + 300).isClose(to: container, tolerance: 8))
    // Rounded at the leading corners (the scrim shows there), square at the trailing ones.
    let shape = system.sideSheet.variants.modal.containerShape
    #expect(shape > 0)
    #expect(!pixel(rendered, x: sheetLeft + 1, y: Snapshot.inset + 1).isClose(to: container))
    #expect(!pixel(rendered, x: sheetLeft + 1, y: Snapshot.inset + stage.height - 1).isClose(to: container))
    #expect(pixel(rendered, x: right - 1, y: Snapshot.inset + 1).isClose(to: container))
    #expect(pixel(rendered, x: right - 1, y: Snapshot.inset + stage.height - 1).isClose(to: container))
    // The tokens drive it: the scrim, the modal color, and the elevation.
    var custom = system
    custom.sideSheet.scrimColor = .role(.error)
    custom.sideSheet.variants.modal.containerColor = .role(.warning)
    let changed = try Snapshot.render(surface(variant: .modal) { Block(height: 40) }, theme: theme(custom))
    #expect(pixel(changed, x: Snapshot.inset + 2, y: Snapshot.inset + 2).isClose(to: light[.error].rgba8()))
    #expect(pixel(changed, x: sheetLeft + 10, y: Snapshot.inset + 300).isClose(to: light[.warning].rgba8()))
    var flat = system
    flat.sideSheet.variants.modal.containerElevation = []
    let raised = try Snapshot.renderExact(surface(variant: .modal) { Block(height: 40) })
    #expect(try Snapshot.renderExact(surface(variant: .modal) { Block(height: 40) }, theme: theme(flat)).mismatch(against: raised, channelTolerance: 0) > 0)
    var edged = system
    edged.sideSheet.variants.modal.outlineColor = .role(.error)
    #expect(pixel(try Snapshot.render(surface(variant: .modal) { Block(height: 40) }, theme: theme(edged)), x: sheetLeft + 0.25, y: Snapshot.inset + 300).isClose(to: light[.error].rgba8(), tolerance: 12))
  }

  /// SSH-7 — on a narrow window a modal sheet gives way so that a touch target of scrim stays (360 wide: 312 and 48); a
  /// standard one keeps its width.
  @Test("SSH-7 a narrow window: the modal sheet leaves a touch target of scrim")
  func narrowWindow() throws {
    var red = system
    red.sideSheet.variants.modal.containerColor = .role(.error)
    red.sideSheet.variants.modal.containerElevation = []
    let narrow = CGSize(width: 360, height: 480)
    let rendered = try Snapshot.render(surface(variant: .modal, size: narrow) { Block(height: 40) }, theme: theme(red))
    let extent = try #require(horizontalExtent(rendered, y: Snapshot.inset + 300, color: light[.error].rgba8()))
    #expect(extent.min == Snapshot.inset + 48 && extent.max == Snapshot.inset + 360, "\(extent)")
  }

  /// SSH-7 — the corner smoothing reaches the modal sheet's rounded corners.
  @Test("SSH-7 corner smoothing reaches the leading corners")
  func cornerSmoothing() throws {
    func sheet(_ amount: Double) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      custom.sideSheet.variants.modal.containerShape = 28
      custom.sideSheet.variants.modal.containerElevation = []
      return try Snapshot.renderExact(surface(variant: .modal, size: CGSize(width: 400, height: 200)) { Block(height: 40) }, theme: theme(custom))
    }
    let continuous = try sheet(0.6)
    #expect(try sheet(0).mismatch(against: continuous, channelTolerance: 0) > 0)
    #expect(try sheet(1).mismatch(against: continuous, channelTolerance: 0) == 0)
  }

  /// SSH-8, SSH-9 — the header: at least `header.height`, the headline `container.padding-inline` after the leading edge,
  /// centred in the row, in the headline color; the close button ending `header.padding-inline-end` before the trailing
  /// edge (SSH-5: a standard medium icon button, its glyph in the icon button's own color); the content right below.
  @Test("SSH-8 SSH-9 SSH-5 the header: height, headline place and color, the close button's place; the content below")
  func header() throws {
    var custom = system
    custom.sideSheet.headlineColor = .role(.error)
    let rendered = try Snapshot.render(surface(closable: true) { Block(height: 40) }, theme: theme(custom))
    let red = light[.error].rgba8()
    let background = light[.surface].rgba8()
    // The headline's ink starts at the padding (a glyph's side bearing aside) and sits in the row's middle.
    let rowMiddle = Snapshot.inset + tokens.headerHeight / 2
    let ink = try #require(stride(from: sheetLeft, to: sheetLeft + 80, by: 0.5).first { x in
      stride(from: Snapshot.inset, to: Snapshot.inset + tokens.headerHeight, by: 0.5).contains { pixel(rendered, x: x, y: $0).isClose(to: red, tolerance: 60) }
    })
    #expect(ink >= sheetLeft + tokens.containerPaddingInline && ink < sheetLeft + tokens.containerPaddingInline + 3, "\(ink)")
    let inkTop = try #require(firstY(rendered, x: ink + 1, color: red, tolerance: 60))
    #expect(inkTop > rowMiddle - 12 && inkTop < rowMiddle, "\(inkTop)")
    // The close button: its glyph in the standard icon button's icon color, centred in its box, which ends
    // `header.padding-inline-end` before the trailing edge.
    let box = system.iconButton.sizes.medium.containerSize
    let glyphCenter = CGPoint(x: right - tokens.headerPaddingInlineEnd - box / 2, y: rowMiddle)
    let iconColor = light[.onSurfaceVariant].rgba8()
    let glyph = stride(from: glyphCenter.x - 6, to: glyphCenter.x + 6, by: 0.5).contains { pixel(rendered, x: $0, y: glyphCenter.y).isClose(to: iconColor, tolerance: 40) }
    #expect(glyph)
    #expect(pixel(rendered, x: right - tokens.headerPaddingInlineEnd + 2, y: rowMiddle).isClose(to: background))
    // The content starts right below the header, `container.padding-inline` in.
    #expect(pixel(rendered, x: sheetLeft + tokens.containerPaddingInline + 1, y: Snapshot.inset + tokens.headerHeight + 1).isClose(to: probe.rgba8()))
    #expect(pixel(rendered, x: sheetLeft + tokens.containerPaddingInline + 1, y: Snapshot.inset + tokens.headerHeight - 1).isClose(to: background))
    #expect(pixel(rendered, x: sheetLeft + tokens.containerPaddingInline - 1, y: Snapshot.inset + tokens.headerHeight + 10).isClose(to: background))
    #expect(pixel(rendered, x: right - tokens.containerPaddingInline + 1, y: Snapshot.inset + tokens.headerHeight + 10).isClose(to: background))
    // The tokens drive the header's height.
    var taller = system
    taller.sideSheet.headerHeight = 100
    let moved = try Snapshot.render(surface(closable: true) { Block(height: 40) }, theme: theme(taller))
    #expect(firstY(moved, x: sheetLeft + 100, color: probe.rgba8()) == Snapshot.inset + 100)
  }

  /// SSH-8 — without a header (no headline, not closable), the content starts `container.padding-block` below the top edge;
  /// without actions, `container.padding-block` stays below it (the content's region ends there).
  @Test("SSH-8 no header: the content below the top padding")
  func noHeader() throws {
    // (A sheet without a headline is reported, SSH-12.)
    let (rendered, _) = try Reports.collecting { try Snapshot.render(surface("") { Block(height: 40) }) }
    #expect(firstY(rendered, x: sheetLeft + 100, color: probe.rgba8()) == Snapshot.inset + tokens.containerPaddingBlock)
    // Content taller than the room is clipped `container.padding-block` above the bottom edge.
    let tall = try Snapshot.render(surface { Block(height: 2000) })
    #expect(lastY(tall, x: sheetLeft + 100, color: probe.rgba8()) == Snapshot.inset + stage.height - tokens.containerPaddingBlock - 0.5)
  }

  /// SSH-9 — a long headline wraps rather than truncating and grows the header: the content moves down.
  @Test("SSH-9 SSH-14 a long headline wraps and grows the header")
  func wrappingHeadline() throws {
    let long = "Filters for every result of this search in the last thirty days, with every label you have selected so far"
    let rendered = try Snapshot.render(surface(long, closable: true) { Block(height: 40) })
    let top = try #require(firstY(rendered, x: sheetLeft + 100, color: probe.rgba8()))
    #expect(top > Snapshot.inset + tokens.headerHeight + 10, "\(top)")
  }

  /// SSH-10 — the content is handed `content.color` as its foreground style and the body text style.
  @Test("SSH-10 the content color and the body style")
  func contentStyle() throws {
    var custom = system
    custom.sideSheet.contentColor = .role(.error)
    let y = Snapshot.inset + tokens.headerHeight + 20
    let foreground = try Snapshot.render(surface { Rectangle().fill(.foreground).frame(height: 40) }, theme: theme(custom))
    #expect(pixel(foreground, x: sheetLeft + 100, y: y).isClose(to: light[.error].rgba8()))
    let onSurface = try Snapshot.render(surface { Rectangle().fill(.foreground).frame(height: 40) })
    #expect(pixel(onSurface, x: sheetLeft + 100, y: y).isClose(to: light[.onSurface].rgba8()))
    let text = "Show results from the last 30 days."
    let handed = try Snapshot.renderExact(surface { Text(verbatim: text) })
    #expect(handed.pixels == (try Snapshot.renderExact(surface { Text(verbatim: text).tanreiFont(system.typescale.body) })).pixels)
    var larger = system
    larger.typescale.body.size += 6
    #expect(handed.mismatch(against: try Snapshot.renderExact(surface { Text(verbatim: text) }, theme: theme(larger)), channelTolerance: 0) > 0)
  }

  /// SSH-11 — the divider across the whole sheet, `divider.width` of `divider.color`, with the actions below it
  /// `actions.padding-block` above and below, in one row from the leading edge `container.padding-inline` in, in order; the
  /// content's region ends at the divider.
  @Test("SSH-11 the divider and the row of actions")
  func actions() throws {
    var custom = system
    custom.sideSheet.dividerColor = .role(.error)
    custom.sideSheet.dividerWidth = 2
    let rendered = try Snapshot.render(withActions { Block(height: 2000) }, theme: theme(custom))
    let buttonHeight = system.button.sizes.medium.containerHeight
    let dividerTop = Snapshot.inset + stage.height - 2 * tokens.actionsPaddingBlock - buttonHeight - 2
    let extent = try #require(horizontalExtent(rendered, y: dividerTop + 1, color: light[.error].rgba8()))
    #expect(extent.min == sheetLeft + tokens.outlineWidth && extent.max == right, "\(extent)")
    #expect(lastY(rendered, x: sheetLeft + 100, color: probe.rgba8()) == dividerTop - 0.5)
    // The row: the first action's label starts after the leading padding, and the second after the first, in order.
    let labelY = dividerTop + 2 + tokens.actionsPaddingBlock + buttonHeight / 2
    let background = light[.surface].rgba8()
    let firstInk = try #require(firstX(rendered, y: labelY, from: sheetLeft + 2, to: right, notColor: background, tolerance: 40))
    #expect(firstInk > sheetLeft + tokens.containerPaddingInline && firstInk < sheetLeft + tokens.containerPaddingInline + 40, "\(firstInk)")
    // Reordered, the row reads the other way: the first label's ink is where the first given starts.
    let swapped = try Snapshot.renderExact(withActions(labels: ["Reset", "Apply"]) { Block(height: 40) })
    #expect(try Snapshot.renderExact(withActions { Block(height: 40) }).mismatch(against: swapped, channelTolerance: 0) > 0)
    // The gap and the padding are the tokens'.
    var spaced = system
    spaced.sideSheet.actionsPaddingBlock = 40
    let taller = try Snapshot.render(withActions { Block(height: 2000) }, theme: theme(spaced))
    #expect(lastY(taller, x: sheetLeft + 100, color: probe.rgba8()) == Snapshot.inset + stage.height - 80 - buttonHeight - tokens.dividerWidth - 0.5)
  }

  /// SSH-11 — actions that do not fit in one row stack in a column aligned to the leading edge, `actions.gap` apart, in
  /// order.
  @Test("SSH-11 actions that do not fit stack in a column")
  func stackedActions() throws {
    var narrow = system
    narrow.sideSheet.containerWidth = 180
    // Each fits the 132-point column; together they do not.
    let labels = ["Apply filters", "Reset"]
    let buttonHeight = system.button.sizes.medium.containerHeight
    let rendered = try Snapshot.render(withActions(labels: labels) { Block(height: 2000) }, theme: theme(narrow))
    let bottom = Snapshot.inset + stage.height
    let secondY = bottom - tokens.actionsPaddingBlock - buttonHeight / 2
    let firstY = secondY - buttonHeight - tokens.actionsGap
    let left = right - 180
    let background = light[.surface].rgba8()
    let secondInk = try #require(firstX(rendered, y: secondY, from: left + 2, to: right, notColor: background, tolerance: 40))
    let firstInk = try #require(firstX(rendered, y: firstY, from: left + 2, to: right, notColor: background, tolerance: 40))
    #expect(secondInk < left + tokens.containerPaddingInline + 40 && firstInk < left + tokens.containerPaddingInline + 40, "\(firstInk) \(secondInk)")
    // The content's region ends above both.
    #expect(lastY(rendered, x: left + 60, color: probe.rgba8()) == bottom - 2 * tokens.actionsPaddingBlock - 2 * buttonHeight - tokens.actionsGap - tokens.dividerWidth - 0.5)
  }

  /// SSH-7 — right to left: the sheet at the left edge, its edge toward the content at its right; the modal sheet's rounded
  /// corners face the content; the content, the header and the actions mirrored.
  @Test("SSH-7 right to left: at the left edge, mirrored")
  func rightToLeft() throws {
    var red = system
    red.sideSheet.variants.standard.containerColor = .role(.error)
    let rendered = try Snapshot.render(
      surface(closable: true) { Block(height: 40, width: 50).frame(maxWidth: .infinity, alignment: .leading) }.environment(\.layoutDirection, .rightToLeft),
      theme: theme(red))
    let fill = light[.error].rgba8()
    let left = Snapshot.inset
    let extent = try #require(horizontalExtent(rendered, y: Snapshot.inset + 300, color: fill))
    #expect(extent.min == left && extent.max == left + tokens.containerWidth - tokens.outlineWidth, "\(extent)")
    let plain = try Snapshot.render(surface { Block(height: 40) }.environment(\.layoutDirection, .rightToLeft))
    #expect(pixel(plain, x: left + tokens.containerWidth - 0.25, y: Snapshot.inset + 300).isClose(to: light[.outlineVariant].rgba8(over: light[.surface]), tolerance: 12))
    // The content from the right, inside the padding.
    let contentY = Snapshot.inset + tokens.headerHeight + 20
    #expect(pixel(rendered, x: left + tokens.containerWidth - tokens.containerPaddingInline - 10, y: contentY).isClose(to: probe.rgba8()))
    #expect(!pixel(rendered, x: left + tokens.containerPaddingInline + 10, y: contentY).isClose(to: probe.rgba8()))
    // The modal sheet's rounded corners face the content (right), its square ones the screen's edge (left).
    let modal = try Snapshot.render(surface(variant: .modal) { Block(height: 40) }.environment(\.layoutDirection, .rightToLeft))
    let container = light[.surfaceContainerLow].rgba8()
    #expect(pixel(modal, x: left + 1, y: Snapshot.inset + 1).isClose(to: container))
    #expect(!pixel(modal, x: left + tokens.containerWidth - 1, y: Snapshot.inset + 1).isClose(to: container))
    #expect(pixel(modal, x: left + tokens.containerWidth + 30, y: Snapshot.inset + 300).isClose(to: light[.scrim].rgba8(over: light[.surface])))
  }

  /// SSH-14 — under the largest text size the sheet keeps its width, and the close button its size.
  @Test("SSH-14 larger text keeps the width and the close button")
  func dynamicType() throws {
    var red = system
    red.sideSheet.variants.standard.containerColor = .role(.error)
    let large = try Snapshot.render(surface(closable: true) { Block(height: 40) }.environment(\.dynamicTypeSize, .accessibility5), theme: theme(red))
    let extent = try #require(horizontalExtent(large, y: Snapshot.inset + 300, color: light[.error].rgba8()))
    #expect(extent.max - extent.min == tokens.containerWidth - tokens.outlineWidth)
  }

  /// SSH-12, SSH-5 — a sheet without a headline and a close button without a label still render, and are reported.
  @Test("SSH-12 SSH-5 a nameless sheet and a nameless close button render and are reported")
  func nameless() throws {
    let (rendered, reports) = try Reports.collecting { try Snapshot.render(surface("", closable: true, closeLabel: "") { Block(height: 40) }) }
    #expect(reports.mention("SSH-12") && reports.mention("SSH-5"))
    #expect(firstY(rendered, x: sheetLeft + 100, color: probe.rgba8()) == Snapshot.inset + tokens.headerHeight)
  }

  /// SSH-13 — a variant the design system does not have draws exactly as the default (standard) and is reported.
  @Test("SSH-13 an unknown variant draws as standard and is reported")
  func unknownVariant() throws {
    let (unknown, reports) = try Reports.collecting { try Snapshot.renderExact(surface(variant: TanreiSideSheetVariant(rawValue: "detached")) { Block(height: 40) }) }
    #expect(reports.mention("detached"))
    #expect(unknown.pixels == (try Snapshot.renderExact(surface { Block(height: 40) })).pixels)
  }
}

// MARK: - Interaction (hosted, macOS)

/// Driven with real mouse and key events in a hosted window. SwiftUI's own gestures — the scrim's tap and the sheet's drag —
/// are not reached by a synthetic event there (the navigation drawer's and the bottom sheet's suites found the same): their
/// rules are tested above, and the gestures themselves with touches in the Gallery's UI tests
/// (`testSideSheetModalClosesAndDrags`).
@MainActor
@Suite("TanreiSideSheet interaction", .serialized)
struct TanreiSideSheetInteractionTests {
  #if os(macOS)
  let tokens = TanreiSystem.tanrei.sideSheet

  /// The default system with each variant's container in a color of its own and no elevation, so that the sheet is found.
  static var sheetSystem: TanreiSystem {
    var system = TanreiSystem.tanrei
    system.sideSheet.variants.standard.containerColor = .role(.info)
    system.sideSheet.variants.modal.containerColor = .role(.info)
    system.sideSheet.variants.modal.containerElevation = []
    return system
  }

  var fill: Bitmap.RGBA { light[.info].rgba8() }
  var page: Bitmap.RGBA { light[.warning].rgba8() }

  /// A page with a button at its top-left that counts its presses, filling its space in the warning color; the sheet beside
  /// it (standard, in an `HStack`) or over it (modal, the modifier), as an app writes it; padded by the snapshot inset.
  private struct Page: View {
    let open: Store<Bool>
    var variant: TanreiSideSheetVariant = .standard
    let closes: Store<[TanreiSheetCloseReason]>
    let pagePresses: Store<Int>

    var body: some View {
      Group {
        if variant == .modal {
          pageContent.tanreiSideSheet(
            "Filters", isPresented: open.binding, closable: true, closeLabel: "Close filters", onClose: { closes.value.append($0) }
          ) {
            Block(height: 40)
          }
        } else {
          HStack(spacing: 0) {
            pageContent
            TanreiSideSheet(
              "Filters", variant: variant, isPresented: open.binding, closable: true, closeLabel: "Close filters", onClose: { closes.value.append($0) }
            ) {
              Block(height: 40)
            }
          }
        }
      }
      .frame(width: stage.width, height: stage.height)
    }

    private var pageContent: some View {
      VStack(alignment: .leading) {
        Button {
          pagePresses.value += 1
        } label: {
          Text(verbatim: "Page").frame(width: 120, height: 60).contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        Spacer()
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      .background(TanreiSystem.tanrei.colors.light[.warning])
    }
  }

  private struct Fixture {
    let hosted: HostedView<AnyView>
    let open: Store<Bool>
    let closes: Store<[TanreiSheetCloseReason]>
    let pagePresses: Store<Int>
  }

  private func page(
    open: Bool = true, variant: TanreiSideSheetVariant = .standard, system: TanreiSystem = sheetSystem, reduced: Bool = true,
    direction: LayoutDirection = .leftToRight
  ) -> Fixture {
    let openStore = Store(open)
    let closes = Store<[TanreiSheetCloseReason]>([])
    let presses = Store(0)
    let view = Page(open: openStore, variant: variant, closes: closes, pagePresses: presses)
      .padding(Snapshot.inset)
      .background(system.colors.light[.surface])
      .tanreiTheme(theme(system))
      .environment(\._accessibilityReduceMotion, reduced)
      .environment(\.layoutDirection, direction)
    return Fixture(hosted: HostedView(AnyView(view)), open: openStore, closes: closes, pagePresses: presses)
  }

  /// Lets what the sheet scheduled on the main actor run: suspending does, spinning the run loop alone does not.
  private func pause(_ hosted: HostedView<AnyView>, _ milliseconds: Int = 300) async {
    try? await Task.sleep(for: .milliseconds(milliseconds))
    hosted.settle(0.1)
  }

  /// The sheet's leading edge in the window: the first x on the row 300 points down, from the left, in its color.
  private func sheetLeft(_ hosted: HostedView<AnyView>) -> CGFloat? {
    guard let bitmap = hosted.bitmap() else { return nil }
    let scale = CGFloat(bitmap.width) / hosted.size.width
    return stride(from: CGFloat.zero, to: hosted.size.width, by: 1).first { x in
      bitmap[min(bitmap.width - 1, Int(x * scale)), Int((Snapshot.inset + 300) * scale)].isClose(to: fill, tolerance: 6)
    }
  }

  /// Where the page ends: the last x on the row 300 points down in the page's color.
  private func pageRight(_ hosted: HostedView<AnyView>) -> CGFloat? {
    guard let bitmap = hosted.bitmap() else { return nil }
    let scale = CGFloat(bitmap.width) / hosted.size.width
    return stride(from: hosted.size.width - 1, to: .zero, by: -1).first { x in
      bitmap[Int(x * scale), Int((Snapshot.inset + 300) * scale)].isClose(to: page, tolerance: 6)
    }.map { $0 + 1 }
  }

  private var right: CGFloat { Snapshot.inset + stage.width }
  private var restLeft: CGFloat { right - tokens.containerWidth + tokens.outlineWidth }
  /// The close button's center in a sheet whose leading edge is at rest.
  private var closeButton: CGPoint {
    let box = TanreiSystem.tanrei.iconButton.sizes.medium.containerSize
    return CGPoint(x: right - tokens.headerPaddingInlineEnd - box / 2, y: Snapshot.inset + tokens.headerHeight / 2)
  }

  /// SSH-1 — a standard sheet takes its width at the end of the row while open and none while closed, the page beside it
  /// resizing; it slides over the enter and exit motions, at once under Reduce Motion; mounted open, it is in place at once.
  /// It never writes the binding on its own.
  @Test("SSH-1 the standard sheet takes its width, slides, resizes the page; at once under Reduce Motion")
  func standardRegion() async {
    var system = Self.sheetSystem
    system.sideSheet.motionEnterDuration = 4000
    system.sideSheet.motionEnterEasing = TanreiCubicBezier(0, 0, 1, 1)
    system.sideSheet.motionExitDuration = 4000
    system.sideSheet.motionExitEasing = TanreiCubicBezier(0, 0, 1, 1)
    let mounted = page(open: true, system: system, reduced: false)
    #expect(sheetLeft(mounted.hosted) == restLeft && pageRight(mounted.hosted) == right - tokens.containerWidth)
    for reduced in [false, true] {
      let fixture = page(open: false, system: system, reduced: reduced)
      #expect(sheetLeft(fixture.hosted) == nil && pageRight(fixture.hosted) == right)
      fixture.open.value = true
      await pause(fixture.hosted, 1000)
      let opening = pageRight(fixture.hosted)
      if reduced {
        #expect(opening == right - tokens.containerWidth, "reduced: \(String(describing: opening))")
      } else {
        #expect(opening.map { $0 > right - tokens.containerWidth + 5 && $0 < right - 5 } == true, "opening: \(String(describing: opening))")
      }
      #expect(
        await fixture.hosted.wait(atMost: 8) { sheetLeft(fixture.hosted) == restLeft && pageRight(fixture.hosted) == right - tokens.containerWidth },
        "\(String(describing: sheetLeft(fixture.hosted))) \(String(describing: pageRight(fixture.hosted)))")
      fixture.open.value = false
      await pause(fixture.hosted, 1000)
      let closing = pageRight(fixture.hosted)
      if reduced {
        #expect(closing == right, "reduced: \(String(describing: closing))")
      } else {
        #expect(closing.map { $0 > right - tokens.containerWidth + 5 && $0 < right - 5 } == true, "closing: \(String(describing: closing))")
      }
      #expect(fixture.open.writes.isEmpty && fixture.closes.value.isEmpty)
    }
  }

  /// SSH-1 — beside a standard sheet the page stays usable; SSH-5, SSH-6 — its close button writes false and reports
  /// `.close` once, and the sheet then gives its width back.
  @Test("SSH-1 SSH-5 SSH-6 beside a standard sheet the page works; the close button closes it once")
  func standardClose() async {
    let fixture = page()
    await pause(fixture.hosted)
    fixture.hosted.click(at: CGPoint(x: Snapshot.inset + 40, y: Snapshot.inset + 30))
    await pause(fixture.hosted)
    #expect(fixture.pagePresses.value == 1)
    fixture.hosted.click(at: closeButton)
    await pause(fixture.hosted)
    #expect(fixture.open.writes == [false] && fixture.closes.value == [.close])
    #expect(pageRight(fixture.hosted) == right && sheetLeft(fixture.hosted) == nil)
  }

  /// SSH-2 — a modal sheet slides in from the trailing edge over the enter motion and out over the exit motion; under Reduce
  /// Motion it fades in place; mounted open, it is in place at once. The page behind it takes no press.
  @Test("SSH-2 the modal sheet slides in and out, fades under Reduce Motion; the page behind is inert")
  func modal() async {
    var system = Self.sheetSystem
    system.sideSheet.motionEnterDuration = 4000
    system.sideSheet.motionEnterEasing = TanreiCubicBezier(0, 0, 1, 1)
    system.sideSheet.motionExitDuration = 4000
    system.sideSheet.motionExitEasing = TanreiCubicBezier(0, 0, 1, 1)
    let mounted = page(open: true, variant: .modal, system: system, reduced: false)
    await pause(mounted.hosted)
    // (The modal edge is transparent: the container's color starts at the sheet's edge.)
    let restLeft = right - tokens.containerWidth
    #expect(sheetLeft(mounted.hosted) == restLeft)
    mounted.hosted.click(at: CGPoint(x: Snapshot.inset + 40, y: Snapshot.inset + 30))
    await pause(mounted.hosted)
    #expect(mounted.pagePresses.value == 0)
    for reduced in [false, true] {
      let fixture = page(open: false, variant: .modal, system: system, reduced: reduced)
      #expect(sheetLeft(fixture.hosted) == nil)
      fixture.open.value = true
      await pause(fixture.hosted, 1000)
      let opening = sheetLeft(fixture.hosted)
      let atRest = fixture.hosted.color(at: CGPoint(x: restLeft + 10, y: Snapshot.inset + 300))
      if reduced {
        // Fading in place: where it rests, not yet its color.
        #expect(atRest.map { !$0.isClose(to: fill, tolerance: 6) } == true, "reduced: \(String(describing: atRest))")
      } else {
        #expect(opening.map { $0 > restLeft + 5 && $0 < right - 5 } == true, "opening: \(String(describing: opening))")
      }
      fixture.open.value = false
      await pause(fixture.hosted, 1000)
      let closing = sheetLeft(fixture.hosted)
      if reduced {
        #expect(closing == nil || fixture.hosted.color(at: CGPoint(x: restLeft + 10, y: Snapshot.inset + 300)).map { !$0.isClose(to: fill, tolerance: 6) } == true)
      } else {
        #expect(closing.map { $0 > restLeft + 5 } == true, "closing: \(String(describing: closing))")
      }
      #expect(fixture.open.writes.isEmpty)
    }
  }

  /// SSH-2, SSH-7 — right to left, a modal sheet rests at the left edge and slides out past it.
  @Test("SSH-2 SSH-7 right to left, the modal sheet slides out past the left edge")
  func modalRightToLeft() async {
    var system = Self.sheetSystem
    system.sideSheet.motionExitDuration = 4000
    system.sideSheet.motionExitEasing = TanreiCubicBezier(0, 0, 1, 1)
    let fixture = page(open: true, variant: .modal, system: system, reduced: false, direction: .rightToLeft)
    await pause(fixture.hosted)
    let edge = Snapshot.inset + tokens.containerWidth
    #expect(fixture.hosted.color(at: CGPoint(x: Snapshot.inset + 10, y: Snapshot.inset + 300))?.isClose(to: fill, tolerance: 6) == true)
    #expect(fixture.hosted.color(at: CGPoint(x: edge - 10, y: Snapshot.inset + 300))?.isClose(to: fill, tolerance: 6) == true)
    fixture.open.value = false
    await pause(fixture.hosted, 1500)
    // Moving left: its left part still drawn, its right part gone.
    #expect(fixture.hosted.color(at: CGPoint(x: Snapshot.inset + 10, y: Snapshot.inset + 300))?.isClose(to: fill, tolerance: 6) == true)
    #expect(fixture.hosted.color(at: CGPoint(x: edge - 10, y: Snapshot.inset + 300))?.isClose(to: fill, tolerance: 6) == false)
  }

  /// SSH-5, SSH-6 — a modal sheet's close button writes false and reports `.close` once. (Escape is not reached here: a
  /// hosted macOS window gives no SwiftUI control keyboard focus without Full Keyboard Access; the Gallery's UI tests press
  /// it with a hardware keyboard, `testSideSheetModalClosesAndDrags`.)
  @Test("SSH-5 SSH-6 the modal sheet's close button closes it once")
  func modalClose() async {
    let button = page(variant: .modal)
    await pause(button.hosted)
    button.hosted.click(at: closeButton)
    await pause(button.hosted)
    #expect(button.open.writes == [false] && button.closes.value == [.close])
  }

  /// SSH-15, SSH-3 — a modal sheet mounted open counts itself as an open Tanrei modal, as if it had just opened; a dialog
  /// opened from it stacks above it (two modals), and closing each counts it out.
  @Test("SSH-15 SSH-3 a modal sheet counts as an open modal; a dialog from it stacks above it")
  func modalCount() async {
    let before = TanreiModalCoordinator.shared.openModals
    let open = Store(true)
    let asks = Store(false)
    let hosted = HostedView(
      AnyView(
        Color.clear.frame(width: stage.width, height: stage.height)
          .tanreiSideSheet("Filters", isPresented: open.binding) {
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

/// Draws a fixture of specs/side-sheet.spec.json as the spec's harness says: the sheet in place (and, for a modal sheet, its
/// scrim) in a 720 × 480 stage over the page's surface with no system insets, its props applied, its content as plain text
/// and its `actions` slot as text Buttons.
@MainActor
enum TanreiSideSheetFixtures {
  static let stage = CGSize(width: 720, height: 480)

  static func view(_ fixture: SpecFixture) -> some View {
    TanreiSideSheetSurface(
      inPlace: fixture.string("headline") ?? "",
      variant: TanreiSideSheetVariant(rawValue: fixture.string("variant") ?? TanreiSideSheetVariant.fallback.rawValue),
      closable: fixture.bool("closable") ?? false, closeLabel: fixture.string("closeLabel") ?? ""
    ) {
      if let content = fixture.content { Text(verbatim: content) }
    } actions: {
      ForEach(fixture.slot("actions"), id: \.self) { TanreiButton($0, variant: .text) {} }
    }
    .frame(width: stage.width, height: stage.height)
  }
}

@MainActor
@Suite("TanreiSideSheet snapshots")
struct TanreiSideSheetSnapshotTests {
  /// Mirrors `fixtures` in specs/side-sheet.spec.json.
  nonisolated static let fixtures = ["standard", "standard-actions", "modal"]

  static func fixture(_ id: String) throws -> SpecFixture {
    try #require(try SpecFixture.load(spec: "side-sheet").first { $0.id == id })
  }

  @Test("SSH-7 SSH-8 SSH-9 SSH-11 fixture matches its baseline", arguments: fixtures)
  func fixture(_ id: String) throws {
    try Snapshot.assert(TanreiSideSheetFixtures.view(try Self.fixture(id)), named: id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    #expect(try SpecFixture.load(spec: "side-sheet").map(\.id) == Self.fixtures)
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiSideSheetTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiSideSheet preset snapshots")
struct TanreiSideSheetPresetSnapshotTests {
  /// The modal sheet with every part: the preset's scrim, container color, elevation, leading corners, header, close button,
  /// divider and actions.
  nonisolated static let fixtureId = "modal"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .m3ExpressiveLike, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiSideSheetSnapshotTests.fixtures.contains(Self.fixtureId))
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try TanreiSideSheetSnapshotTests.fixture(Self.fixtureId)
    try Snapshot.assert(TanreiSideSheetFixtures.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
