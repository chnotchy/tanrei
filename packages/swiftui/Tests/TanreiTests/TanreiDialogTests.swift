import SwiftUI
import Testing

@_spi(Fixtures) @testable import Tanrei

// Covers specs/dialog.spec.json. Each behavior id (DLG-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file. The fixtures draw the dialog's surface — scrim and container — in place in a
// 480 × 640 frame over the page's surface (`TanreiDialogSurface(inPlace:)`), because a render of the presenting view does
// not include a presented window; the presentation itself (the full-screen cover, focus and the escape gesture) is the
// platform's and is exercised by the gallery's UI tests.

private let suiteName = "TanreiDialogTests"

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

/// A value outside any view — what a `Binding` in a real app points at — counting its writes.
@MainActor
private final class Store<Value: Sendable> {
  var value: Value
  var writes: [Value] = []
  init(_ value: Value) { self.value = value }

  var binding: Binding<Value> {
    Binding(
      get: { MainActor.assumeIsolated { self.value } },
      set: { newValue in
        MainActor.assumeIsolated {
          self.value = newValue
          self.writes.append(newValue)
        }
      })
  }
}

/// The size of a render without the snapshot inset, in points.
@MainActor
private func visualSize(_ bitmap: Bitmap) -> CGSize {
  CGSize(width: CGFloat(bitmap.width) / Snapshot.scale - 2 * Snapshot.inset, height: CGFloat(bitmap.height) / Snapshot.scale - 2 * Snapshot.inset)
}

/// The container alone, centred in a `width` × `height` stage of gray (so its surface stands out), as the surface places it.
@MainActor
private func container<Icon: View, Actions: View, Content: View>(
  _ headline: String = "Discard draft?", supporting: String = "The message you were writing will be deleted from this device.",
  width: CGFloat = 480, height: CGFloat = 640, @ViewBuilder icon: () -> Icon, @ViewBuilder actions: () -> Actions, @ViewBuilder content: () -> Content
) -> some View {
  ZStack {
    TanreiDialogContainer(
      dialog: TanreiDialogContent(headline: headline, supportingText: supporting, alert: false, dismissible: true), icon: icon(), actions: actions(),
      content: content())
  }
  .frame(width: width, height: height)
  .background(Color.gray)
}

@MainActor
private func plain(
  _ headline: String = "Discard draft?", supporting: String = "The message you were writing will be deleted from this device.", width: CGFloat = 480,
  height: CGFloat = 640
) -> some View {
  container(headline, supporting: supporting, width: width, height: height, icon: { EmptyView() }, actions: { EmptyView() }, content: { EmptyView() })
}

/// Where the container is in a render of `container(…)`: the extent of its surface along the stage's middle row and column,
/// in points of the render.
@MainActor
private func frame(_ bitmap: Bitmap, width: CGFloat = 480, height: CGFloat = 640) -> CGRect {
  let fill = light[.surfaceBright].rgba8()
  let row = Snapshot.inset + height / 2
  let column = Snapshot.inset + width / 2
  let xs = stride(from: Snapshot.inset, to: Snapshot.inset + width, by: 0.5).filter { pixel(bitmap, x: $0, y: row).isClose(to: fill, tolerance: 2) }
  let ys = stride(from: Snapshot.inset, to: Snapshot.inset + height, by: 0.5).filter { pixel(bitmap, x: column, y: $0).isClose(to: fill, tolerance: 2) }
  guard let minX = xs.first, let maxX = xs.last, let minY = ys.first, let maxY = ys.last else { return .zero }
  return CGRect(x: minX, y: minY, width: maxX - minX + 0.5, height: maxY - minY + 0.5)
}

// MARK: - Rules (DLG-5, DLG-13, DLG-14, DLG-15)

@MainActor
@Suite("TanreiDialog rules")
struct TanreiDialogRulesTests {
  /// DLG-5 — while dismissible, a dismissal writes false once; otherwise nothing.
  @Test("DLG-5 a dismissal writes false once, only while dismissible")
  func dismiss() {
    let open = Store(true)
    TanreiDialogRules.dismiss(open.binding, dismissible: true)
    TanreiDialogRules.dismiss(open.binding, dismissible: true)
    #expect(open.writes == [false])
    let locked = Store(true)
    TanreiDialogRules.dismiss(locked.binding, dismissible: false)
    #expect(locked.writes.isEmpty && locked.value)
  }

  /// DLG-14 — an alert reads its headline, then its supporting text; an empty headline is reported.
  @Test("DLG-14 an alert's announcement; an empty headline is reported")
  func announcement() {
    let dialog = TanreiDialogContent(headline: "Discard draft?", supportingText: "It will be deleted.", alert: true, dismissible: true)
    #expect(dialog.announcement == "Discard draft?. It will be deleted." && dialog.problems.isEmpty)
    #expect(TanreiDialogContent(headline: "Lost connection", supportingText: "", alert: true, dismissible: true).announcement == "Lost connection")
    #expect(TanreiDialogContent(headline: " ", supportingText: "", alert: false, dismissible: true).problems.contains { $0.contains("DLG-14") })
  }

  /// DLG-13 — the motions and the entrance's scale come from the tokens; under Reduce Motion it fades without growing.
  @Test("DLG-13 the motions and the scale come from the tokens")
  func motion() {
    var tokens = TanreiSystem.tanrei.dialog
    tokens.motionEnterDuration = 300
    tokens.motionEnterEasing = TanreiCubicBezier(0, 0, 1, 1)
    tokens.motionExitDuration = 200
    tokens.motionExitEasing = TanreiCubicBezier(0.5, 0, 1, 1)
    tokens.motionEnterScale = 0.8
    #expect(tokens.enterMotion() == Animation.timingCurve(0, 0, 1, 1, duration: 0.3))
    #expect(tokens.exitMotion() == Animation.timingCurve(0.5, 0, 1, 1, duration: 0.2))
    #expect(tokens.hiddenScale(reduceMotion: false) == 0.8 && tokens.hiddenScale(reduceMotion: true) == 1)
  }

  /// DLG-15 (and SNK-12) — the modal count: dialogs stack, and the app stays covered until the last one closes.
  @Test("DLG-15 stacked dialogs keep the app covered until the last closes")
  func stacking() {
    let coordinator = TanreiModalCoordinator()
    coordinator.opened()
    coordinator.opened()
    #expect(coordinator.openModals == 2 && coordinator.isCovered)
    coordinator.closed()
    #expect(coordinator.isCovered)
    coordinator.closed()
    coordinator.closed()
    #expect(!coordinator.isCovered && coordinator.openModals == 0)
  }

  /// DLG-11 — the dividers' conditions: below the headline once scrolled from the top; above the actions while more lies
  /// below (unknown before the first measure).
  @Test("DLG-11 when each divider shows")
  func dividers() {
    var scroll = TanreiDialogScroll()
    #expect(!scroll.isAwayFromTop && scroll.hasMoreBelow == nil)
    scroll.viewport = 200
    scroll.content = CGRect(x: 0, y: 0, width: 300, height: 600)
    #expect(!scroll.isAwayFromTop && scroll.hasMoreBelow == true)
    scroll.content.origin.y = -100
    #expect(scroll.isAwayFromTop && scroll.hasMoreBelow == true)
    scroll.content.origin.y = -400
    #expect(scroll.isAwayFromTop && scroll.hasMoreBelow == false)
  }
}

// MARK: - The surface and the container (DLG-1, DLG-7 … DLG-12, DLG-16)

@MainActor
@Suite("TanreiDialog rendered")
struct TanreiDialogRenderedTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiDialogTokens { system.dialog }

  /// DLG-1 — the scrim covers the whole surface in `scrim.color`, the container above it; DLG-7 — centred, the container in
  /// its color.
  @Test("DLG-1 DLG-7 the scrim covers everything; the container is centred above it")
  func scrimAndCentre() throws {
    let fixture = try TanreiDialogSnapshotTests.fixture("basic")
    let rendered = try Snapshot.render(TanreiDialogFixtures.view(fixture))
    let scrim = light[.scrim].rgba8(over: light[.surface])
    #expect(pixel(rendered, x: Snapshot.inset + 2, y: Snapshot.inset + 2).isClose(to: scrim))
    #expect(pixel(rendered, x: Snapshot.inset + 478, y: Snapshot.inset + 638).isClose(to: scrim))
    #expect(pixel(rendered, x: Snapshot.inset + 240, y: Snapshot.inset + 320).isClose(to: light[.surfaceBright].rgba8(), tolerance: 6))
    var custom = system
    custom.dialog.scrimColor = .role(.error)
    #expect(pixel(try Snapshot.render(TanreiDialogFixtures.view(fixture), theme: theme(custom)), x: Snapshot.inset + 2, y: Snapshot.inset + 2).isClose(to: light[.error].rgba8()))
  }

  /// DLG-7 — as wide as its content between the width bounds, never wider than offered; a margin from the edges.
  @Test("DLG-7 width bounds and the margin")
  func widths() throws {
    #expect(frame(try Snapshot.render(plain("OK?", supporting: ""))).width == tokens.containerMinWidth)
    let long = String(repeating: "A long explanation that keeps going. ", count: 10)
    #expect(frame(try Snapshot.render(plain(supporting: long, width: 800)), width: 800).width == tokens.containerMaxWidth)
    #expect(frame(try Snapshot.render(plain(supporting: long, width: 300)), width: 300).width == 300)
    // In the surface, the container keeps `container.margin` from the edges.
    let fixture = try TanreiDialogSnapshotTests.fixture("scrolling")
    let rendered = try Snapshot.render(TanreiDialogFixtures.view(fixture))
    let scrim = light[.scrim].rgba8(over: light[.surface])
    let fill = light[.surfaceBright].rgba8()
    #expect(!pixel(rendered, x: Snapshot.inset + tokens.containerMargin - 2, y: Snapshot.inset + 320).isClose(to: fill, tolerance: 6))
    #expect(pixel(rendered, x: Snapshot.inset + tokens.containerMargin + 2, y: Snapshot.inset + 320).isClose(to: fill, tolerance: 6))
    #expect(!pixel(rendered, x: Snapshot.inset + 240, y: Snapshot.inset + tokens.containerMargin - 2).isClose(to: fill, tolerance: 6))
    #expect(pixel(rendered, x: Snapshot.inset + 2, y: Snapshot.inset + 2).isClose(to: scrim))
  }

  /// DLG-7 — the container's corners follow the corner smoothing.
  @Test("DLG-7 the corners follow the corner smoothing")
  func corners() throws {
    func render(_ amount: Double) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      custom.dialog.containerShape = 24
      return try Snapshot.renderExact(plain(), theme: theme(custom))
    }
    #expect(try render(0).mismatch(against: try render(0.6), channelTolerance: 0) > 0)
    #expect(try render(1).mismatch(against: try render(0.6), channelTolerance: 0) == 0)
  }

  /// DLG-8 — the padding, the gap between the parts and the actions' margin; the content's color.
  @Test("DLG-8 padding, gaps and the content's foreground")
  func stacking() throws {
    let line = tokens.headlineTypescale.lineHeight
    let body = tokens.supportingTextTypescale.lineHeight
    #expect(frame(try Snapshot.render(plain("Sign out?", supporting: ""))).height == 2 * tokens.containerPadding + line)
    #expect(frame(try Snapshot.render(plain("Sign out?", supporting: "Everywhere."))).height == 2 * tokens.containerPadding + line + tokens.containerGap + body)
    let action = Color.red.frame(width: 60, height: 40)
    let withActions = frame(try Snapshot.render(container("Sign out?", supporting: "", icon: { EmptyView() }, actions: { action }, content: { EmptyView() })))
    #expect(withActions.height == 2 * tokens.containerPadding + line + tokens.actionsMarginBlockStart + 40)
    // The content's foreground is `content.color`, `container.padding` in from the container's start.
    func contentPixel(_ system: TanreiSystem) throws -> Bitmap.RGBA {
      let rendered = try Snapshot.render(
        container("Sign out?", supporting: "", icon: { EmptyView() }, actions: { EmptyView() }, content: { Rectangle().frame(height: 20) }), theme: theme(system))
      let box = frame(rendered)
      return pixel(rendered, x: box.minX + system.dialog.containerPadding + 2, y: box.minY + system.dialog.containerPadding + line + tokens.containerGap + 10)
    }
    #expect(try contentPixel(system).isClose(to: light[.onSurface].rgba8()))
    var custom = system
    custom.dialog.contentColor = .role(.error)
    custom.dialog.containerPadding = 40
    #expect(try contentPixel(custom).isClose(to: light[.error].rgba8()))
  }

  /// DLG-9 — the icon at `icon.size` in `icon.color`, centred with the headline; without it, the headline starts at the
  /// start.
  @Test("DLG-9 the icon and the headline centred; without an icon, at the start")
  func icon() throws {
    let rendered = try Snapshot.render(container("Delete?", supporting: "", icon: { Rectangle() }, actions: { EmptyView() }, content: { EmptyView() }))
    let box = frame(rendered)
    let iconMiddle = box.minY + tokens.containerPadding + tokens.iconSize / 2
    #expect(pixel(rendered, x: box.midX, y: iconMiddle).isClose(to: light[.secondary].rgba8()))
    #expect(!pixel(rendered, x: box.midX - tokens.iconSize / 2 - 1, y: iconMiddle).isClose(to: light[.secondary].rgba8()))
    #expect(box.height == 2 * tokens.containerPadding + tokens.iconSize + tokens.containerGap + tokens.headlineTypescale.lineHeight)
    // Centred headline: its ink starts well after the padding; without an icon, right at it.
    let ink = light[.onSurface].rgba8()
    func firstInk(_ bitmap: Bitmap, box: CGRect, y: CGFloat) -> CGFloat? {
      stride(from: box.minX, to: box.maxX, by: 0.5).first { pixel(bitmap, x: $0, y: y).isClose(to: ink, tolerance: 90) }
    }
    let centred = try #require(firstInk(rendered, box: box, y: box.minY + tokens.containerPadding + tokens.iconSize + tokens.containerGap + tokens.headlineTypescale.lineHeight / 2))
    let plainRender = try Snapshot.render(plain("Delete?", supporting: ""))
    let plainBox = frame(plainRender)
    let start = try #require(firstInk(plainRender, box: plainBox, y: plainBox.minY + tokens.containerPadding + tokens.headlineTypescale.lineHeight / 2))
    #expect(start - plainBox.minX < tokens.containerPadding + 4 && centred - box.minX > tokens.containerPadding + 40)
  }

  /// DLG-10 — the actions in one row at the end, `actions.gap` apart, in order; in a column at the end when they do not fit.
  @Test("DLG-10 actions in a row at the end, or a column when they do not fit")
  func actions() throws {
    let row = try Snapshot.render(
      container("Sign out?", supporting: "", icon: { EmptyView() }, actions: { Color.red.frame(width: 60, height: 40); Color.blue.frame(width: 60, height: 40) }, content: { EmptyView() }))
    let box = frame(row)
    let y = box.maxY - tokens.containerPadding - 20
    let end = box.maxX - tokens.containerPadding
    #expect(pixel(row, x: end - 30, y: y).isClose(to: Color.blue.rgba8()))
    #expect(pixel(row, x: end - 60 - tokens.actionsGap - 30, y: y).isClose(to: Color.red.rgba8()))
    let between = pixel(row, x: end - 60 - tokens.actionsGap / 2, y: y)
    #expect(!between.isClose(to: Color.red.rgba8()) && !between.isClose(to: Color.blue.rgba8()))
    // Too wide for one row: a column, in order, at the end.
    let column = try Snapshot.render(
      container(
        "Sign out?", supporting: "", width: 300, icon: { EmptyView() },
        actions: { Color.red.frame(width: 200, height: 40); Color.blue.frame(width: 200, height: 40) }, content: { EmptyView() }), theme: Snapshot.theme)
    let columnBox = frame(column, width: 300)
    #expect(columnBox.height == 2 * tokens.containerPadding + tokens.headlineTypescale.lineHeight + tokens.actionsMarginBlockStart + 80 + tokens.actionsGap)
    let columnEnd = columnBox.maxX - tokens.containerPadding - 5
    #expect(pixel(column, x: columnEnd, y: columnBox.maxY - tokens.containerPadding - 20).isClose(to: Color.blue.rgba8()))
    #expect(pixel(column, x: columnEnd, y: columnBox.maxY - tokens.containerPadding - 40 - tokens.actionsGap - 20).isClose(to: Color.red.rgba8()))
  }

  /// DLG-11 — when the parts do not fit, the header and the actions stay and the body scrolls between them; the divider
  /// above the actions shows (more lies below), the one below the headline does not (at the top); when everything fits,
  /// neither.
  @Test("DLG-11 a long body scrolls between the headline and the actions, with the lower divider")
  func scrolling() throws {
    let long = String(repeating: "Please read these terms before you continue. ", count: 30)
    let action = Color.red.frame(width: 60, height: 40)
    let rendered = try Snapshot.render(container("Terms", supporting: long, height: 400, icon: { EmptyView() }, actions: { action }, content: { EmptyView() }))
    let box = frame(rendered, height: 400)
    #expect(box.height == 400)
    // The actions stay at the bottom.
    #expect(pixel(rendered, x: box.maxX - tokens.containerPadding - 30, y: box.maxY - tokens.containerPadding - 20).isClose(to: Color.red.rgba8()))
    // The lower divider, right above the actions' margin, across the container.
    let divider = light[.outlineVariant].rgba8(over: light[.surfaceBright])
    let lower = box.maxY - tokens.containerPadding - 40 - tokens.actionsMarginBlockStart + tokens.dividerWidth / 2
    #expect(pixel(rendered, x: box.minX + 2, y: lower).isClose(to: divider, tolerance: 12))
    // No upper divider at the top.
    let upper = box.minY + tokens.containerPadding + tokens.headlineTypescale.lineHeight + tokens.containerGap - tokens.dividerWidth / 2
    #expect(!pixel(rendered, x: box.minX + 2, y: upper).isClose(to: divider, tolerance: 12))
    // Everything fits: no divider.
    let fits = try Snapshot.render(container("Terms", supporting: "Short.", icon: { EmptyView() }, actions: { action }, content: { EmptyView() }))
    let fitsBox = frame(fits)
    let fitsLower = fitsBox.maxY - tokens.containerPadding - 40 - tokens.actionsMarginBlockStart + tokens.dividerWidth / 2
    #expect(!pixel(fits, x: fitsBox.minX + 2, y: fitsLower).isClose(to: divider, tolerance: 12))
  }

  /// DLG-12 — when the headline and the actions alone leave no room, everything scrolls together: the actions are no
  /// longer held at the bottom.
  @Test("DLG-12 with no room left, everything scrolls together")
  func everythingScrolls() throws {
    let long = String(repeating: "Please read these terms before you continue. ", count: 30)
    let height = 2 * tokens.containerPadding + tokens.headlineTypescale.lineHeight + tokens.actionsMarginBlockStart + 40
    let rendered = try Snapshot.render(
      container("Terms", supporting: long, height: height, icon: { EmptyView() }, actions: { Color.red.frame(width: 60, height: 40) }, content: { EmptyView() }))
    let box = frame(rendered, height: height)
    #expect(box.height <= height)
    #expect(!stride(from: box.minY, to: box.maxY, by: 1).contains { pixel(rendered, x: box.maxX - tokens.containerPadding - 30, y: $0).isClose(to: Color.red.rgba8()) })
  }

  /// DLG-16 — right to left: the headline at the right, the actions at the left.
  @Test("DLG-16 right to left, the layout is mirrored")
  func rightToLeft() throws {
    let rendered = try Snapshot.render(
      container("Sign out?", supporting: "", icon: { EmptyView() }, actions: { Color.red.frame(width: 60, height: 40) }, content: { EmptyView() })
        .environment(\.layoutDirection, .rightToLeft))
    let box = frame(rendered)
    #expect(pixel(rendered, x: box.minX + tokens.containerPadding + 30, y: box.maxY - tokens.containerPadding - 20).isClose(to: Color.red.rgba8()))
    let ink = light[.onSurface].rgba8()
    let y = box.minY + tokens.containerPadding + tokens.headlineTypescale.lineHeight / 2
    let last = try #require(stride(from: box.maxX, to: box.minX, by: -0.5).first { pixel(rendered, x: $0, y: y).isClose(to: ink, tolerance: 90) })
    #expect(last > box.maxX - tokens.containerPadding - 4)
  }
}

// MARK: - Presented (DLG-1, DLG-2, DLG-4, DLG-6)

/// What the presented test counts.
@MainActor
private final class Taps {
  var behind = 0
  var keep = 0
}

/// A view that presents a dialog from a button, as a product does: its one action counts, and closes it the second time.
private struct Presenting: View {
  let taps: Taps
  @State private var open = false

  var body: some View {
    VStack(spacing: .zero) {
      TanreiButton("Open", action: { open = true })
      TanreiButton("Behind", variant: .elevated, action: { taps.behind += 1 })
    }
    .frame(width: 480, height: 640)
    .tanreiDialog("Hold on", isPresented: $open, dismissible: false) {
      TanreiButton("Keep", variant: .filled) {
        taps.keep += 1
        if taps.keep == 2 { open = false }
      }
    }
  }
}

@MainActor
@Suite("TanreiDialog presented", .serialized)
struct TanreiDialogPresentedTests {
  #if os(macOS)
  /// DLG-1 — presented, the dialog covers the view and makes it inert (a click on what is behind it does nothing) and
  /// counts as a modal (a snackbar host holds its next one, SNK-12); DLG-6 — an action does not close it; the product
  /// closes it from an action, and after the exit fade it is gone and uncounted, the view behind working again (DLG-4).
  /// DLG-2 — the dialog moves no keyboard focus of its own: the product's mark (`.defaultFocus`) decides. DLG-3 — on a Mac
  /// the view behind is disabled while covered, so none of it takes keyboard focus (on iOS the full-screen cover keeps
  /// focus in the presented view): the button behind it neither fires nor, disabled, can be focused.
  @Test("DLG-1 DLG-2 DLG-3 DLG-4 DLG-6 presented from a button: inert behind; actions do not close it; the product does")
  func presented() async throws {
    var system = TanreiSystem.tanrei
    system.dialog.motionExitDuration = 0
    system.dialog.motionEnterDuration = 0
    let taps = Taps()
    let hosted = HostedView(Presenting(taps: taps).tanreiTheme(theme(system)))
    let before = TanreiModalCoordinator.shared.openModals
    let button = system.button.sizes.medium.containerHeight
    // The two buttons are stacked in the middle of the view: "Open" above "Behind".
    let open = CGPoint(x: 240, y: 320 - button / 2)
    let behind = CGPoint(x: 240, y: 320 + button / 2)
    hosted.click(at: open)
    #expect(await hosted.wait(atMost: 5) { TanreiModalCoordinator.shared.openModals == before + 1 })
    // The entrance is scheduled on the main actor: suspend, so that it runs (spinning the run loop alone does not).
    try await Task.sleep(for: .milliseconds(300))
    hosted.settle(0.2)
    // Inert: the click lands on the scrim (not dismissible here), not on the button behind it.
    hosted.click(at: behind)
    #expect(taps.behind == 0 && TanreiModalCoordinator.shared.openModals == before + 1)
    // The container: the minimum width, centred; its one action at the end of its last row.
    let tokens = system.dialog
    let height = 2 * tokens.containerPadding + tokens.headlineTypescale.lineHeight + tokens.actionsMarginBlockStart + button
    let keep = CGPoint(x: 240 + tokens.containerMinWidth / 2 - tokens.containerPadding - 12, y: 320 + height / 2 - tokens.containerPadding - button / 2)
    hosted.click(at: keep)
    #expect(taps.keep == 1)
    try await Task.sleep(for: .milliseconds(200))
    hosted.settle(0.2)
    #expect(TanreiModalCoordinator.shared.openModals == before + 1)
    // The product closes it from the action.
    hosted.click(at: keep)
    #expect(taps.keep == 2)
    #expect(await hosted.wait(atMost: 5) { TanreiModalCoordinator.shared.openModals == before })
    #expect(await hosted.wait(atMost: 5) {
      hosted.click(at: behind)
      return taps.behind > 0
    })
  }
  #endif
}

// MARK: - Fixtures (one per spec fixture)

/// Draws a fixture of specs/dialog.spec.json in place: the surface in a 480 × 640 frame, its slots filled as the spec
/// says — the icon a glyph (the SF Symbol a product would pass for it), the actions text-variant Tanrei Buttons — and the
/// fixture's content as plain text.
@MainActor
enum TanreiDialogFixtures {
  static let symbols: [String: String] = ["delete": "trash"]
  static let stage = CGSize(width: 480, height: 640)

  static func view(_ fixture: SpecFixture, onDismiss: @escaping @MainActor () -> Void = {}) -> some View {
    let glyph = fixture.slot("icon").first
    let actions = fixture.slot("actions")
    return TanreiDialogSurface(
      inPlace: fixture.string("headline") ?? "", supportingText: fixture.string("supportingText") ?? "", alert: fixture.bool("alert") ?? false,
      dismissible: fixture.bool("dismissible") ?? true, onDismiss: onDismiss
    ) {
      if let glyph { Image(systemName: symbols[glyph] ?? glyph) }
    } actions: {
      ForEach(actions, id: \.self) { TanreiButton($0, variant: .text, action: {}) }
    } content: {
      if let content = fixture.content { Text(verbatim: content) }
    }
    .frame(width: stage.width, height: stage.height)
  }
}

@MainActor
@Suite("TanreiDialog snapshots")
struct TanreiDialogSnapshotTests {
  /// Mirrors `fixtures` in specs/dialog.spec.json.
  nonisolated static let fixtures = ["basic", "icon", "headline-only", "content", "scrolling"]

  static func fixture(_ id: String) throws -> SpecFixture {
    try #require(try SpecFixture.load(spec: "dialog").first { $0.id == id })
  }

  @Test("DLG-7 DLG-8 DLG-11 fixture matches its baseline", arguments: fixtures)
  func fixture(_ id: String) throws {
    try Snapshot.assert(TanreiDialogFixtures.view(try Self.fixture(id)), named: id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    #expect(try SpecFixture.load(spec: "dialog").map(\.id) == Self.fixtures)
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiDialogTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiDialog preset snapshots")
struct TanreiDialogPresetSnapshotTests {
  /// The icon fixture: the preset's scrim, surface, corners, elevation, headline and text styles, icon and actions.
  nonisolated static let fixtureId = "icon"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .m3ExpressiveLike, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiDialogSnapshotTests.fixtures.contains(Self.fixtureId))
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try TanreiDialogSnapshotTests.fixture(Self.fixtureId)
    try Snapshot.assert(TanreiDialogFixtures.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
