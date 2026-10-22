import SwiftUI

// Spec: specs/bottom-sheet.spec.json (BSH-1 … BSH-26) — tokens: TanreiBottomSheetTokens (comp.bottom-sheet), read from the
// design system in the environment (`system.bottomSheet`). Every design value in this file comes from a token; there are
// no literals. The only numbers that are not tokens are BSH-9's drag thresholds (`TanreiSheetDrag`), which the spec fixes
// for a platform that names none, and half a point of slack in comparisons of measured heights.
//
// `.tanreiBottomSheet(isPresented:…)` is a view modifier on the view the sheet covers, as `.sheet` is. A `modal` sheet is a
// modal overlay, presented as `tanreiDialog` is: on iOS in a `.fullScreenCover` on a clear background with the
// system transition off (Tanrei draws the scrim, the sheet and the motion), which makes the rest of the app inert to touch,
// VoiceOver and the keyboard; on macOS, which has no full-screen cover, over the view the modifier is attached to, which is
// inert meanwhile. A `standard` sheet is a layout region: an overlay at the bottom of the modified
// view, with no scrim and no focus trap, leaving the part above it to the content. Not the native `.sheet`: its dim cannot
// take the scrim token, and on iPad in a regular width it becomes a centred form. `TanreiBottomSheetSurface(inPlace:…)`
// draws the scrim and the sheet in place, at rest, for the fixtures.

/// How a Tanrei bottom sheet relates to the content it covers (spec prop `variant`): a structural choice drawn by code, not
/// a token axis — both forms read the same container tokens; the scrim and the behaviour set them apart.
public enum TanreiBottomSheetVariant: String, CaseIterable, Sendable {
  /// Over the bottom of the view it covers while the content above stays usable: a layout region.
  case standard
  /// Over the whole window with a scrim, holding focus until it closes: a modal overlay.
  case modal

  /// The variant a spec value names, for UI built from data. Any other name is `.modal`, the default, and is reported in
  /// debug builds (BSH-25).
  public init(named name: String) {
    if let variant = TanreiBottomSheetVariant(rawValue: name) {
      self = variant
    } else {
      TanreiDiagnostics.report("Tanrei: a bottom sheet has no variant \"\(name)\"; using \"modal\" (BSH-25)")
      self = .modal
    }
  }
}

/// The height a Tanrei bottom sheet rests at while its content is taller than its partial height (spec prop `detent`,
/// BSH-6).
public enum TanreiBottomSheetDetent: String, CaseIterable, Sendable {
  /// `container.partial-fraction` of the area it covers.
  case partial
  /// Up to `container.margin-block-start` below the area's top.
  case full

  /// The detent a spec value names, for UI built from data. Any other name is `.partial`, the default, and is reported in
  /// debug builds (BSH-25).
  public init(named name: String) {
    if let detent = TanreiBottomSheetDetent(rawValue: name) {
      self = detent
    } else {
      TanreiDiagnostics.report("Tanrei: a bottom sheet has no detent \"\(name)\"; using \"partial\" (BSH-25)")
      self = .partial
    }
  }

  /// BSH-11: the other height, which the drag handle moves the sheet to.
  var other: TanreiBottomSheetDetent { self == .full ? .partial : .full }
}

extension View {
  /// Presents a Tanrei bottom sheet while `isPresented` is true: supplementary content or a short task in a surface that
  /// rises from the bottom edge (specs/bottom-sheet.spec.json).
  ///
  ///     @State private var sharing = false
  ///     @State private var height = TanreiBottomSheetDetent.partial
  ///     PhotoView()
  ///       .tanreiBottomSheet(isPresented: $sharing, detent: $height, handleLabel: "Resize sheet", label: "Share photo") {
  ///         ShareTargets()
  ///       }
  ///
  /// - Parameters:
  ///   - isPresented: the spec's `open`. The sheet writes `false` to it when it closes itself (BSH-5): a drag below its
  ///     lowest height and, for a modal sheet, a press on the scrim, Escape and the accessibility escape gesture — only while
  ///     `dismissible`. A binding that declines the write keeps the sheet open: it settles back (BSH-20).
  ///   - variant: `.modal` (default) dims and blocks everything else; `.standard` covers the bottom of this view while the
  ///     part above stays usable (BSH-4).
  ///   - detent: the height it rests at while its content is taller than its partial height (BSH-6); the sheet writes the
  ///     height the person chose to it (the spec's `detentChange`, BSH-9, BSH-11), and setting it moves the sheet (BSH-21).
  ///   - dismissible: whether a drag below the lowest height and, for a modal sheet, the scrim, Escape and the accessibility
  ///     escape gesture close it (default true).
  ///   - handle: draws the drag handle at the top (default true).
  ///   - handleLabel: the drag handle's accessible name ("Resize sheet"); required while the sheet has two heights (BSH-11).
  ///   - inset: insets the content by `container.padding` (default true); false for content that pads itself.
  ///   - label: names the sheet for assistive technology ("Share photo"); required (BSH-22).
  ///   - onClose: called after the sheet has written `false`, with why it closed (the spec's `close`).
  ///   - content: the sheet's content, handed `content.color` as its foreground style and the body text style, and scrolled
  ///     by the sheet when it is taller than the room (BSH-8, BSH-10).
  ///
  /// Initial focus (BSH-3): mark a control in the content with `.defaultFocus(_:_:)` (keyboard) or give VoiceOver focus
  /// with `@AccessibilityFocusState`.
  public func tanreiBottomSheet<Content: View>(
    isPresented: Binding<Bool>, variant: TanreiBottomSheetVariant = .modal, detent: Binding<TanreiBottomSheetDetent>, dismissible: Bool = true,
    handle: Bool = true, handleLabel: String = "", inset: Bool = true, label: String = "",
    onClose: (@MainActor (TanreiSheetCloseReason) -> Void)? = nil, @ViewBuilder content: @escaping () -> Content
  ) -> some View {
    modifier(
      TanreiBottomSheetPresenter(
        configuration: TanreiBottomSheetConfiguration(
          variant: variant, dismissible: dismissible, handle: handle, handleLabel: handleLabel, inset: inset, label: label),
        isPresented: isPresented, detent: detent, onClose: onClose, sheet: content))
  }

  /// A bottom sheet that keeps the height the person chooses itself, starting at `.partial` each time it is presented.
  public func tanreiBottomSheet<Content: View>(
    isPresented: Binding<Bool>, variant: TanreiBottomSheetVariant = .modal, dismissible: Bool = true, handle: Bool = true, handleLabel: String = "",
    inset: Bool = true, label: String = "", onClose: (@MainActor (TanreiSheetCloseReason) -> Void)? = nil,
    @ViewBuilder content: @escaping () -> Content
  ) -> some View {
    modifier(
      TanreiBottomSheetOwnDetent(
        configuration: TanreiBottomSheetConfiguration(
          variant: variant, dismissible: dismissible, handle: handle, handleLabel: handleLabel, inset: inset, label: label),
        isPresented: isPresented, onClose: onClose, sheet: content))
  }
}

// MARK: - Configuration and rules

/// Everything a sheet is given besides its bindings and its content.
struct TanreiBottomSheetConfiguration: Equatable, Sendable {
  var variant: TanreiBottomSheetVariant = .modal
  var dismissible = true
  var handle = true
  var handleLabel = ""
  var inset = true
  var label = ""

  /// Only `modal` is a modal overlay; `standard` is a layout region (BSH-4).
  var isModal: Bool { variant == .modal }

  /// BSH-22: an empty label.
  var problems: [String] {
    label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      ? ["a bottom sheet's label is empty, so the sheet has no accessible name (BSH-22)"] : []
  }

  /// BSH-11: an interactive drag handle without a name.
  func handleProblems(isInteractive: Bool) -> [String] {
    isInteractive && handle && handleLabel.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      ? ["a bottom sheet's drag handle has no handleLabel, so the control has no accessible name (BSH-11)"] : []
  }
}

/// BSH-6 — the heights of a sheet in an area: its lowest (partial, or its one height) and its highest (full, or its one
/// height), and whether it has two.
struct TanreiBottomSheetHeights: Equatable, Sendable {
  let twoHeights: Bool
  let lowest: CGFloat
  let highest: CGFloat

  /// The height it rests at for `detent`: the detent's while there are two, else its one height (detent changes nothing).
  func rest(_ detent: TanreiBottomSheetDetent) -> CGFloat {
    twoHeights && detent == .full ? highest : lowest
  }

  /// How tall it is drawn when a drag or a settle asks for `requested`: never above its highest; below its lowest it keeps
  /// that height and moves down instead (`below`).
  func drawn(requested: CGFloat) -> CGFloat {
    min(max(requested, lowest), highest)
  }

  /// How far below its lowest height a drag has moved it down.
  func below(requested: CGFloat) -> CGFloat {
    max(.zero, lowest - requested)
  }
}

/// The sheet's rules, pure, so they are tested without a render.
enum TanreiBottomSheetRules {
  /// Half a point: what two measured heights may differ by and still be the same.
  static let slack: CGFloat = 0.5

  /// BSH-6: the heights of a sheet whose handle's row and content (with its insets and the bottom inset) want `natural`, in
  /// an area `area` high: partial is `fraction` of it, full is it less `marginBlockStart`; the sheet has two heights only
  /// while it wants more than its partial height, and is never taller than it wants.
  static func heights(area: CGFloat, natural: CGFloat, fraction: Double, marginBlockStart: CGFloat) -> TanreiBottomSheetHeights {
    let partial = area * CGFloat(fraction)
    let full = max(.zero, area - marginBlockStart)
    let two = natural > partial + slack && full > partial
    let lowest = two ? partial : min(natural, full)
    return TanreiBottomSheetHeights(twoHeights: two, lowest: lowest, highest: two ? min(natural, full) : lowest)
  }

  /// BSH-9, BSH-10: whether the sheet follows a drag that has just passed the touch slop. One that starts on the handle's
  /// row is always the sheet's, and so is any drag where a drag does not scroll (a mouse on macOS). On content a drag
  /// scrolls: up, it is the sheet's while the sheet is below its full height (it raises the sheet, and the content scrolls
  /// with the next drag); down, while the content is at its top — else the content scrolls, and the sheet takes the drag
  /// over once the content is back at its top (`takesOver`).
  static func ownsDrag(startsOnContent: Bool, upward: Bool, isBelowFull: Bool, isContentAtTop: Bool, dragScrolls: Bool) -> Bool {
    guard dragScrolls, startsOnContent else { return true }
    return upward ? isBelowFull : isContentAtTop
  }

  /// BSH-10: a drag the content's scroll has is taken over by the sheet once the content is at its top and the finger still
  /// moves down.
  static func takesOver(movesDown: Bool, isContentAtTop: Bool) -> Bool {
    movesDown && isContentAtTop
  }

  /// Where a released drag takes the sheet (BSH-9): the height it settles at, and whether it asks to close.
  struct Release: Equatable, Sendable {
    let target: TanreiBottomSheetDetent
    let asksToClose: Bool
  }

  /// BSH-9: a drag released at `height` with `velocity` (points per second, down positive) settles at the next height in
  /// the direction of a fling, else at the nearest; below half of its lowest height, or flung down from its lowest height,
  /// it asks to close (and would settle at its lowest height if it stays).
  static func release(height: CGFloat, velocity: CGFloat, heights: TanreiBottomSheetHeights, chosen: TanreiBottomSheetDetent) -> Release {
    let stops: [(detent: TanreiBottomSheetDetent, height: CGFloat)] =
      heights.twoHeights ? [(.partial, heights.lowest), (.full, heights.highest)] : [(chosen, heights.lowest)]
    let lowest = stops[0]
    if TanreiSheetDrag.isFling(velocity) && velocity > .zero {
      // Down: the next height below where it was released, or — from the lowest — closed.
      if let next = stops.last(where: { $0.height < height - slack }) { return Release(target: next.detent, asksToClose: false) }
      return Release(target: lowest.detent, asksToClose: true)
    }
    if TanreiSheetDrag.isFling(velocity) {
      let next = stops.first { $0.height > height + slack } ?? stops[stops.count - 1]
      return Release(target: next.detent, asksToClose: false)
    }
    let nearest = stops.min { abs($0.height - height) < abs($1.height - height) } ?? lowest
    return Release(target: nearest.detent, asksToClose: height < heights.lowest / 2)
  }
}

// MARK: - Token bindings

extension TanreiBottomSheetTokens {
  /// BSH-19: the handle's colors change over the state motion; `nil` under Reduce Motion.
  func stateMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionStateDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// BSH-17 `ripple`: grows over the feedback duration with the state easing; `nil` under Reduce Motion (it appears whole).
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// BSH-1: in over `motion.enter-*` — a slide, or under Reduce Motion a fade in place, so never `nil`.
  func enterMotion() -> Animation? {
    TanreiMotion.animation(durationMs: motionEnterDuration, easing: motionEnterEasing, reduceMotion: false)
  }

  /// BSH-1: out over `motion.exit-*` — a slide, or under Reduce Motion a fade in place.
  func exitMotion() -> Animation? {
    TanreiMotion.animation(durationMs: motionExitDuration, easing: motionExitEasing, reduceMotion: false)
  }

  /// BSH-9, BSH-11, BSH-21: to another height, or back after a drag, over `motion.enter-*`; `nil` (at once) under Reduce
  /// Motion.
  func settleMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionEnterDuration, easing: motionEnterEasing, reduceMotion: reduceMotion)
  }

  /// BSH-12: the handle's row — its box with `handle.margin-block` above and below.
  var handleRowHeight: CGFloat { handleMarginBlock * 2 + handleContainerHeight }
}

/// Which token values the drag handle draws in one state (BSH-13, BSH-17). Pure data, so the bindings are tested without
/// rendering: every state from that state's tokens of the `drag-handle` control; under ripple and dim only the box's color
/// stays with the state beneath the press.
struct TanreiBottomSheetHandleAppearance: Equatable {
  /// The handle's box.
  let container: TanreiPaint
  /// BSH-17 `ripple`: the pressed box color, grown from the point of contact over `container`.
  let ripple: TanreiPaint?
  let grip: TanreiPaint
  /// The state's opacity of the whole handle.
  let opacity: Double

  init(tokens: TanreiBottomSheetTokens, state: TanreiInteraction, feedback: TanreiPressedFeedback = .overlay, beneath: TanreiInteraction = .enabled) {
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    let control = tokens.controls[.dragHandle]
    // The handle is never disabled: a state without tokens draws at rest.
    let own = control[state: layers.state] ?? control.enabled
    container = (control[state: layers.container] ?? control.enabled).containerColor
    ripple = layers.ripple.map { (control[state: $0] ?? control.enabled).containerColor }
    grip = own.gripColor
    // The vocabulary has no rest-state `opacity` token: a handle at rest is not dimmed.
    opacity = tokens[state: layers.state]?.opacity ?? TanreiIdentity.opacity
  }
}

// MARK: - Presentation

/// A sheet presented without a detent binding keeps the person's choice here.
private struct TanreiBottomSheetOwnDetent<Sheet: View>: ViewModifier {
  let configuration: TanreiBottomSheetConfiguration
  let isPresented: Binding<Bool>
  let onClose: (@MainActor (TanreiSheetCloseReason) -> Void)?
  let sheet: () -> Sheet

  @State private var detent = TanreiBottomSheetDetent.partial

  func body(content: Content) -> some View {
    content
      .modifier(TanreiBottomSheetPresenter(configuration: configuration, isPresented: isPresented, detent: $detent, onClose: onClose, sheet: sheet))
      // Presented again: from the partial height, not where it was left.
      .onChange(of: isPresented.wrappedValue) { _, open in if open { detent = .partial } }
  }
}

/// The side of the view the modifier is attached to. A standard sheet is an overlay at its bottom; a modal sheet is
/// presented over it as a dialog is (DLG-1): on iOS in a full-screen cover on a clear background, the system's transition
/// off; on macOS over the view, which is inert meanwhile. The cover is taken away once the sheet has slid out.
struct TanreiBottomSheetPresenter<Sheet: View>: ViewModifier {
  let configuration: TanreiBottomSheetConfiguration
  let isPresented: Binding<Bool>
  let detent: Binding<TanreiBottomSheetDetent>
  let onClose: (@MainActor (TanreiSheetCloseReason) -> Void)?
  let sheet: () -> Sheet

  @Environment(\.tanreiSystem) private var system

  func body(content: Content) -> some View {
    if configuration.isModal {
      // BSH-2: presented as a dialog is (`TanreiSheetCover`); BSH-1, BSH-3: a sheet presented with the view (mounted open)
      // appears in place, without motion.
      content.modifier(
        TanreiSheetCover(isPresented: isPresented, exitDuration: system.bottomSheet.motionExitDuration) { mountedOpen in
          TanreiBottomSheetView(
            configuration: configuration, isPresented: isPresented, detent: detent, onClose: onClose, isInPlace: false, startsShown: mountedOpen,
            content: sheet())
        })
    } else {
      // BSH-4: a layout region over the bottom of the view; the part above it is the content's.
      content.overlay(alignment: .bottom) {
        TanreiBottomSheetView(
          configuration: configuration, isPresented: isPresented, detent: detent, onClose: onClose, isInPlace: false,
          startsShown: isPresented.wrappedValue, content: sheet())
      }
    }
  }
}

// MARK: - The surface (fixtures)

/// The sheet drawn in place — for a modal sheet its scrim over the space it is given, and the sheet at its bottom edge —,
/// open and at rest, not modal: what the fixtures and the gallery draw (a render of the presenting view does not include a
/// presented window). The handle and a drag move it between its heights, and a close is reported to `onClose`; it stays.
public struct TanreiBottomSheetSurface<Content: View>: View {
  let configuration: TanreiBottomSheetConfiguration
  let onClose: (@MainActor (TanreiSheetCloseReason) -> Void)?
  let onDetentChange: (@MainActor (TanreiBottomSheetDetent) -> Void)?
  let content: Content

  @State private var detent: TanreiBottomSheetDetent

  /// The sheet in place (fixtures and galleries only), filling the space it is given.
  @_spi(Fixtures)
  public init(
    inPlace variant: TanreiBottomSheetVariant = .modal, detent: TanreiBottomSheetDetent = .partial, dismissible: Bool = true, handle: Bool = true,
    handleLabel: String = "", inset: Bool = true, label: String = "", onClose: (@MainActor (TanreiSheetCloseReason) -> Void)? = nil,
    onDetentChange: (@MainActor (TanreiBottomSheetDetent) -> Void)? = nil, @ViewBuilder content: () -> Content
  ) {
    configuration = TanreiBottomSheetConfiguration(
      variant: variant, dismissible: dismissible, handle: handle, handleLabel: handleLabel, inset: inset, label: label)
    self.onClose = onClose
    self.onDetentChange = onDetentChange
    self.content = content()
    _detent = State(initialValue: detent)
  }

  public var body: some View {
    TanreiBottomSheetView(
      configuration: configuration, isPresented: .constant(true),
      detent: Binding(
        get: { detent },
        set: { value in
          detent = value
          onDetentChange?(value)
        }), onClose: onClose, isInPlace: true, startsShown: true, content: content)
  }
}

// MARK: - The sheet

/// BSH-6, BSH-7: the area a sheet covers — the space it is given and the bottom inset it reaches under — and that inset.
struct TanreiBottomSheetArea: Equatable {
  var height: CGFloat = .zero
  var strip: CGFloat = .zero
}

/// A drag, and whether the sheet follows it.
struct TanreiBottomSheetDragState: Equatable {
  /// Whether it has passed the touch slop and been given to the sheet or to the content's scroll.
  var isDecided = false
  /// Whether the sheet follows it.
  var isOwned = false
  /// Whether it started on the content (below the handle's row).
  var startsOnContent = false
  /// The drag's translation when the sheet took it, and the offset the sheet had then.
  var base: CGFloat = .zero
  var startOffset: CGFloat = .zero
  /// The last translation seen, for the direction of a move.
  var last: CGFloat = .zero
  /// The detent it started from.
  var from: TanreiBottomSheetDetent = .partial
}

/// The scrim and the sheet over the space they are given (BSH-1, BSH-2, BSH-4 … BSH-10, BSH-20 … BSH-22): the scrim over
/// all of it for a modal sheet, and the sheet at its bottom edge, sliding in when it opens and out when it closes (fading in
/// place under Reduce Motion). It follows a drag, settles, and asks to close. Presented (not in place), a modal sheet
/// carries the modal trait and counts itself as an open Tanrei modal.
struct TanreiBottomSheetView<Content: View>: View {
  let configuration: TanreiBottomSheetConfiguration
  let isPresented: Binding<Bool>
  let detent: Binding<TanreiBottomSheetDetent>
  let onClose: (@MainActor (TanreiSheetCloseReason) -> Void)?
  /// Drawn in place (fixtures and galleries): open, not modal, never withdrawn.
  let isInPlace: Bool
  let content: Content

  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  /// Drawn: from the moment it opens until it has slid out.
  @State private var isMounted: Bool
  /// In (slid in, the scrim shown), or out.
  @State private var isShown: Bool
  /// How far a drag or a settle has moved the sheet from its rest height; up is positive.
  @State private var offset: CGFloat = .zero
  @State private var drag = TanreiBottomSheetDragState()
  /// The content with its insets, measured: its height, and where it is scrolled to (its top in the scroll view).
  @State private var contentFrame: CGRect = .zero
  /// The top of the content's region in the window: a drag that starts below it starts on the content.
  @State private var contentTop: CGFloat = .zero
  /// The bottom container inset without the keyboard (iOS): what tells the keyboard from the home indicator.
  @State private var containerBottom: CGFloat?
  /// BSH-21: a detent the sheet wrote itself, so that its change is not taken for the product's.
  @State private var ownDetent: TanreiBottomSheetDetent?
  /// A drag moved the sheet during the current press: the handle's button does not also toggle it (BSH-13).
  @State private var suppressesToggle = false
  /// Counted in `TanreiModalCoordinator`.
  @State private var isCounted = false
  /// The area of the last layout (BSH-6).
  @State private var area = TanreiBottomSheetArea()

  init(
    configuration: TanreiBottomSheetConfiguration, isPresented: Binding<Bool>, detent: Binding<TanreiBottomSheetDetent>,
    onClose: (@MainActor (TanreiSheetCloseReason) -> Void)?, isInPlace: Bool, startsShown: Bool, content: Content
  ) {
    self.configuration = configuration
    self.isPresented = isPresented
    self.detent = detent
    self.onClose = onClose
    self.isInPlace = isInPlace
    self.content = content
    // BSH-1: a sheet mounted open appears in place, without motion.
    _isMounted = State(initialValue: startsShown)
    _isShown = State(initialValue: startsShown)
  }

  var body: some View {
    let tokens = system.bottomSheet
    GeometryReader { proxy in
      let strip = bottomStrip(proxy)
      ZStack(alignment: .bottom) {
        if isMounted {
          if configuration.isModal { scrim(tokens: tokens) }
          sheet(tokens: tokens, heights: heights, layoutArea: proxy.size.height + strip, strip: strip)
        }
      }
      .frame(width: proxy.size.width, height: proxy.size.height, alignment: .bottom)
      .onChange(of: TanreiBottomSheetArea(height: proxy.size.height + strip, strip: strip), initial: true) { _, measured in area = measured }
    }
    #if os(iOS)
    // BSH-6, BSH-7: the bottom inset without the keyboard, to tell the keyboard (the area ends on it) from the home
    // indicator (the sheet's color reaches under it).
    .background {
      Color.clear
        .ignoresSafeArea(.keyboard)
        .onGeometryChange(for: CGFloat.self) { $0.safeAreaInsets.bottom } action: { containerBottom = $0 }
    }
    #endif
    .onAppear { appear() }
    .onChange(of: isPresented.wrappedValue) { _, open in open ? present() : withdraw() }
    .onChange(of: detent.wrappedValue) { old, new in detentChanged(from: old, to: new) }
    .onDisappear { uncount() }
  }

  // MARK: Geometry

  /// BSH-7: the bottom system inset the sheet's color reaches under and its content stays above — none while the keyboard
  /// is shown, when the sheet sits on it.
  private func bottomStrip(_ proxy: GeometryProxy) -> CGFloat {
    let bottom = proxy.safeAreaInsets.bottom
    guard let containerBottom else { return bottom }
    return bottom > containerBottom + TanreiBottomSheetRules.slack ? .zero : bottom
  }

  /// BSH-6: the heights of the last layout — the area it was given and the content it measured —, for the drag, the handle
  /// and a settle. The layout measures its own, so that a render is right on its first pass.
  private var heights: TanreiBottomSheetHeights {
    let tokens = system.bottomSheet
    let row = configuration.handle ? tokens.handleRowHeight : .zero
    return TanreiBottomSheetRules.heights(
      area: area.height, natural: row + contentFrame.height + area.strip, fraction: tokens.containerPartialFraction,
      marginBlockStart: tokens.containerMarginBlockStart)
  }

  // MARK: Parts

  /// BSH-1, BSH-2: the scrim over everything, fading with the sheet; BSH-5: a press on it asks to close. Decorative.
  private func scrim(tokens: TanreiBottomSheetTokens) -> some View {
    Rectangle()
      .fill(colors[tokens.scrimColor])
      .ignoresSafeArea()
      .contentShape(Rectangle())
      .onTapGesture { close(.scrim) }
      .accessibilityHidden(true)
      .opacity(isShown ? 1 : .zero)
  }

  private func sheet(tokens: TanreiBottomSheetTokens, heights: TanreiBottomSheetHeights, layoutArea: CGFloat, strip: CGFloat) -> some View {
    let style = system.shape.roundedCornerStyle
    let requested = heights.rest(detent.wrappedValue) + offset
    let isInteractive = configuration.handle && heights.twoHeights
    let isBelowFull = heights.twoHeights && requested < heights.highest - TanreiBottomSheetRules.slack
    let reach = tokens.containerElevation.map(TanreiElevationPlan.reach).max() ?? .zero
    let slides = !isShown && !reduceMotion
    return TanreiBottomSheetLayout(
      offset: offset, detent: detent.wrappedValue, area: layoutArea, rowHeight: configuration.handle ? tokens.handleRowHeight : .zero, strip: strip,
      fraction: tokens.containerPartialFraction, marginBlockStart: tokens.containerMarginBlockStart
    ) {
      if configuration.handle {
        TanreiBottomSheetHandle(
          isInteractive: isInteractive, isExpanded: detent.wrappedValue == .full, label: configuration.handleLabel, isDragging: drag.isOwned,
          toggle: { toggle(heights: heights) }
        )
        .layoutValue(key: TanreiBottomSheetLayout.PartKey.self, value: .handle)
        // BSH-15: where its hit area is taller than its row, it lies over the content.
        .zIndex(1)
      }
      scrollingContent(tokens: tokens, isBelowFull: isBelowFull)
        .layoutValue(key: TanreiBottomSheetLayout.PartKey.self, value: .content)
    }
    // BSH-8: the content is clipped to the container's shape — its top corners rounded, eased by the corner smoothing.
    .clipShape(UnevenRoundedRectangle(topLeadingRadius: tokens.containerShape, topTrailingRadius: tokens.containerShape, style: style))
    // BSH-7: the raised surface, its color reaching under the bottom inset.
    .background(alignment: .top) {
      TanreiBottomSheetContainerSurface(tokens: tokens, strip: strip)
    }
    // A press anywhere on the sheet is the sheet's: it never reaches the scrim. BSH-9, BSH-10: its drags.
    .contentShape(Rectangle())
    .simultaneousGesture(dragGesture(heights: heights))
    // BSH-22: a modal dialog, or a region, named by the label. SwiftUI has neither role: a container, modal or not.
    .accessibilityElement(children: .contain)
    .accessibilityLabel(Text(verbatim: configuration.label))
    .accessibilityAddTraits(configuration.isModal && !isInPlace ? .isModal : [])
    .modifier(TanreiSheetEscape(isModal: configuration.isModal, close: close))
    .onChange(of: isInteractive, initial: true) { _, interactive in
      configuration.handleProblems(isInteractive: interactive).forEach { TanreiDiagnostics.report("Tanrei: \($0)") }
    }
    // BSH-7: no wider than `container.max-width`, centred.
    .frame(maxWidth: tokens.containerMaxWidth)
    // BSH-9: below its lowest height a drag moves it down.
    .offset(y: heights.below(requested: requested))
    // BSH-1: out of view below the bottom edge while not shown — or, under Reduce Motion, faded out in place.
    .visualEffect { effect, proxy in
      effect.offset(y: slides ? proxy.size.height + strip + reach : .zero)
    }
    .opacity(reduceMotion && !isShown ? .zero : 1)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
    // A tooltip inside a modal sheet is drawn above it (TIP-13).
    .modifier(TanreiSheetTooltipLayer(isModal: configuration.isModal))
  }

  /// BSH-8, BSH-10: the content below the handle's row, inset (unless `inset` is false), handed the content color and the
  /// body text style, scrolled when it is taller than the room. On iOS a scroll view below the full height does not
  /// scroll: a drag on it moves the sheet (BSH-10), and so does a drag the sheet has taken.
  private func scrollingContent(tokens: TanreiBottomSheetTokens, isBelowFull: Bool) -> some View {
    let padding = tokens.containerPadding
    let insets =
      configuration.inset
      ? EdgeInsets(top: configuration.handle ? .zero : padding, leading: padding, bottom: padding, trailing: padding) : EdgeInsets()
    #if os(iOS)
    let locked = isBelowFull || drag.isOwned
    #else
    // A mouse drag never scrolls on macOS: the wheel scrolls at either height.
    let locked = drag.isOwned
    #endif
    return TanreiScrollRegion(axis: .vertical) {
      content
        .foregroundStyle(colors[tokens.contentColor])
        .tanreiFont(system.typescale.body)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(insets)
        .onGeometryChange(for: CGRect.self) { $0.frame(in: .named(TanreiBottomSheetLayout.scrollSpace)) } action: { contentFrame = $0 }
    }
    .coordinateSpace(.named(TanreiBottomSheetLayout.scrollSpace))
    .scrollDisabled(locked)
    .onGeometryChange(for: CGFloat.self) { $0.frame(in: .global).minY } action: { contentTop = $0 }
  }

  // MARK: Drag (BSH-9, BSH-10, BSH-20)

  /// Whether the content is scrolled to its top.
  private var isContentAtTop: Bool { contentFrame.minY >= -TanreiBottomSheetRules.slack }

  /// BSH-9: the sheet follows a vertical drag beyond the touch slop, never above its full height, measured in the window's
  /// coordinates (the sheet moves with it). BSH-10 on iOS: on the content, a drag up is the sheet's while it is below its
  /// full height, and a drag down while the content is at its top — the sheet takes over once the content has scrolled
  /// back to its top; any other drag is the content's scroll.
  private func dragGesture(heights: TanreiBottomSheetHeights) -> some Gesture {
    DragGesture(minimumDistance: TanreiSheetDrag.touchSlop, coordinateSpace: .global)
      .onChanged { value in
        guard isShown else { return }
        let dy = value.translation.height
        if !drag.isDecided {
          drag.isDecided = true
          drag.startsOnContent = value.startLocation.y >= contentTop
          if owns(upward: dy < .zero, heights: heights) { take(at: dy, heights: heights) }
        } else if !drag.isOwned {
          // BSH-10: the content has scrolled back to its top and the finger still moves down: the sheet takes it over.
          if TanreiBottomSheetRules.takesOver(movesDown: dy > drag.last, isContentAtTop: isContentAtTop) { take(at: dy, heights: heights) }
        }
        drag.last = dy
        guard drag.isOwned else { return }
        let rest = heights.rest(detent.wrappedValue)
        offset = min(max(drag.startOffset - (dy - drag.base), -rest), heights.highest - rest)
      }
      .onEnded { value in
        let ended = drag
        drag = TanreiBottomSheetDragState()
        // The handle's button may hear the same release: it does not toggle for a drag (BSH-13).
        Task { @MainActor in suppressesToggle = false }
        guard ended.isOwned else { return }
        release(velocity: value.velocity.height, from: ended.from, heights: heights)
      }
  }

  /// BSH-10: whether a drag that has just passed the slop is the sheet's.
  private func owns(upward: Bool, heights: TanreiBottomSheetHeights) -> Bool {
    #if os(iOS)
    let dragScrolls = true
    #else
    // A mouse drag never scrolls on macOS.
    let dragScrolls = false
    #endif
    let requested = heights.rest(detent.wrappedValue) + offset
    return TanreiBottomSheetRules.ownsDrag(
      startsOnContent: drag.startsOnContent, upward: upward,
      isBelowFull: heights.twoHeights && requested < heights.highest - TanreiBottomSheetRules.slack, isContentAtTop: isContentAtTop,
      dragScrolls: dragScrolls)
  }

  private func take(at translation: CGFloat, heights: TanreiBottomSheetHeights) {
    drag.isOwned = true
    drag.base = translation
    drag.startOffset = offset
    drag.from = detent.wrappedValue
    suppressesToggle = true
  }

  /// BSH-9, BSH-20: a released drag settles at the next height in the direction of a fling, else the nearest; one that
  /// asks to close closes a dismissible sheet, holds where it was left for a frame, and then slides out — or, where the
  /// binding declined, settles back at the lowest height. A sheet that is not dismissible settles at its lowest height.
  private func release(velocity: CGFloat, from: TanreiBottomSheetDetent, heights: TanreiBottomSheetHeights) {
    let height = heights.rest(detent.wrappedValue) + offset
    let release = TanreiBottomSheetRules.release(height: height, velocity: velocity, heights: heights, chosen: detent.wrappedValue)
    if release.asksToClose, close(.drag) {
      Task { @MainActor in
        // One frame where the drag left it; then, if it is still open, back.
        await Task.yield()
        if isPresented.wrappedValue { settle(to: release.target, from: from, heights: heights) }
      }
      return
    }
    settle(to: release.target, from: from, heights: heights)
  }

  /// BSH-9, BSH-11: to `target` over the enter motion (at once under Reduce Motion), from wherever it is; a height other than
  /// the one it started from is written to `detent` — the spec's `detentChange`, once.
  private func settle(to target: TanreiBottomSheetDetent, from: TanreiBottomSheetDetent, heights: TanreiBottomSheetHeights) {
    let height = heights.rest(detent.wrappedValue) + offset
    if heights.twoHeights, target != from || target != detent.wrappedValue {
      ownDetent = target
      detent.wrappedValue = target
    }
    // Where the binding took it (or declined it), from where the sheet is now.
    offset = height - heights.rest(detent.wrappedValue)
    withAnimation(system.bottomSheet.settleMotion(reduceMotion: reduceMotion)) { offset = .zero }
  }

  /// BSH-11: the handle moves the sheet to its other height.
  private func toggle(heights: TanreiBottomSheetHeights) {
    guard !suppressesToggle else {
      suppressesToggle = false
      return
    }
    guard heights.twoHeights else { return }
    settle(to: detent.wrappedValue.other, from: detent.wrappedValue, heights: heights)
  }

  /// BSH-21: the product set `detent` — the sheet moves there over the enter motion and writes nothing; a detent the sheet
  /// wrote itself has moved it already.
  private func detentChanged(from old: TanreiBottomSheetDetent, to new: TanreiBottomSheetDetent) {
    if ownDetent == new {
      ownDetent = nil
      return
    }
    ownDetent = nil
    guard isMounted, !drag.isOwned else { return }
    offset = heights.rest(old) + offset - heights.rest(new)
    withAnimation(system.bottomSheet.settleMotion(reduceMotion: reduceMotion)) { offset = .zero }
  }

  // MARK: Open and close (BSH-1, BSH-3, BSH-5)

  /// BSH-5: a request to close — through the binding, then `onClose`, once, while dismissible and open.
  @discardableResult
  private func close(_ reason: TanreiSheetCloseReason) -> Bool {
    TanreiSheetRules.close(isPresented, dismissible: configuration.dismissible, reason: reason, onClose: onClose)
  }

  private func appear() {
    if isInPlace {
      configuration.problems.forEach { TanreiDiagnostics.report("Tanrei: \($0)") }
      return
    }
    if isShown {
      // Mounted open: counted and reported as if it had just opened, without motion (BSH-1, BSH-3).
      count()
      configuration.problems.forEach { TanreiDiagnostics.report("Tanrei: \($0)") }
    } else if isPresented.wrappedValue {
      present()
    }
  }

  /// BSH-1: mounted below the bottom edge, then slid in (faded in place under Reduce Motion) and the scrim faded in.
  private func present() {
    guard !isInPlace, !(isMounted && isShown) else { return }
    count()
    configuration.problems.forEach { TanreiDiagnostics.report("Tanrei: \($0)") }
    drag = TanreiBottomSheetDragState()
    offset = .zero
    isMounted = true
    let motion = system.bottomSheet.enterMotion()
    Task { @MainActor in
      withAnimation(motion) { isShown = true }
    }
  }

  /// BSH-1: slid out from wherever it is (faded under Reduce Motion) and the scrim faded out; gone once it is out.
  private func withdraw() {
    guard !isInPlace, isMounted else { return }
    uncount()
    drag = TanreiBottomSheetDragState()
    withAnimation(system.bottomSheet.exitMotion()) { isShown = false }
    let exit = system.bottomSheet.motionExitDuration
    Task { @MainActor in
      try? await Task.sleep(for: .milliseconds(Int(exit)))
      guard !isPresented.wrappedValue else { return }
      isMounted = false
      offset = .zero
    }
  }

  /// BSH-23 (and SNK-12): a presented modal sheet counts as an open Tanrei modal.
  private func count() {
    guard configuration.isModal, !isInPlace, !isCounted else { return }
    isCounted = true
    TanreiModalCoordinator.shared.opened()
  }

  private func uncount() {
    guard isCounted else { return }
    isCounted = false
    TanreiModalCoordinator.shared.closed()
  }
}

// MARK: - Layout and surface

/// BSH-6, BSH-8, BSH-12: the sheet's column, stateless so that a render is right on its first pass. Given the `area` it
/// covers (the bottom inset `strip` it reaches under counted in; not its proposal, which is its own height once placed), it
/// measures what the handle's row and the content (with its insets) want, takes the heights of that area
/// (`TanreiBottomSheetRules.heights`), and is as tall as
/// its height at `detent` moved by `offset` — never above the highest, never below the lowest (a drag moves it down
/// instead) — less the strip. The handle's row stays at the top; the content fills the rest, scrolling when it wants more.
struct TanreiBottomSheetLayout: Layout {
  var offset: CGFloat
  let detent: TanreiBottomSheetDetent
  let area: CGFloat
  let rowHeight: CGFloat
  let strip: CGFloat
  let fraction: Double
  let marginBlockStart: CGFloat

  static let scrollSpace = "tanrei.bottom-sheet.scroll"

  /// A settle moves the sheet: its offset is animated.
  var animatableData: CGFloat {
    get { offset }
    set { offset = newValue }
  }

  enum Part: Sendable {
    case handle
    case content
  }

  struct PartKey: LayoutValueKey {
    static let defaultValue = Part.content
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let content = subviews.first { $0[PartKey.self] == .content }
    let width = proposal.width.flatMap { $0.isFinite ? $0 : nil } ?? content?.sizeThatFits(.unspecified).width ?? .zero
    let natural = rowHeight + (content?.sizeThatFits(ProposedViewSize(width: width, height: nil)).height ?? .zero) + strip
    let heights = TanreiBottomSheetRules.heights(area: area, natural: natural, fraction: fraction, marginBlockStart: marginBlockStart)
    let drawn = heights.drawn(requested: heights.rest(detent) + offset)
    return CGSize(width: width, height: max(.zero, drawn - strip))
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    for subview in subviews {
      switch subview[PartKey.self] {
      case .handle:
        subview.place(at: bounds.origin, anchor: .topLeading, proposal: ProposedViewSize(width: bounds.width, height: rowHeight))
      case .content:
        subview.place(
          at: CGPoint(x: bounds.minX, y: bounds.minY + rowHeight), anchor: .topLeading,
          proposal: ProposedViewSize(width: bounds.width, height: max(.zero, bounds.height - rowHeight)))
      }
    }
  }
}

/// BSH-7: the sheet's surface — `container.color` at `container.elevation`, its top corners rounded by `container.shape`
/// (eased by the corner smoothing) and its bottom corners square — reaching `strip` below the sheet, under the bottom inset.
/// The rounded surface reaches past its bottom edge by its corner radius and is cut there with its shadow, so the bottom
/// corners are square; its shadow on the other sides is kept.
struct TanreiBottomSheetContainerSurface: View {
  let tokens: TanreiBottomSheetTokens
  let strip: CGFloat

  @TanreiPalette private var colors

  var body: some View {
    let reach = tokens.containerElevation.map(TanreiElevationPlan.reach).max() ?? .zero
    TanreiElevationSurface(tokens.containerElevation, fill: colors[tokens.containerColor], cornerRadius: tokens.containerShape)
      .padding(.bottom, -tokens.containerShape)
      .clipShape(TanreiBottomCut(reach: reach))
      .padding(.bottom, -strip)
      .allowsHitTesting(false)
      .accessibilityHidden(true)
  }
}

/// Everything above a view's bottom edge, and `reach` past its other three edges: what clips away only what lies below the
/// bottom edge.
struct TanreiBottomCut: Shape {
  let reach: CGFloat

  func path(in rect: CGRect) -> Path {
    Path(CGRect(x: rect.minX - reach, y: rect.minY - reach, width: rect.width + 2 * reach, height: rect.height + reach))
  }
}

// MARK: - The drag handle

/// The drag handle's row (BSH-11 … BSH-19): `handle.margin-block`, the box and `handle.margin-block` again, the box centred
/// across the sheet and the grip centred in it. While the sheet has two heights it is one button named by the handle label,
/// whose value says whether the sheet is expanded, that moves the sheet to its other height; its hit area is the row across
/// the box and at least the minimum target on both axes, from the row's top (over the content where it is taller). At one
/// height it is drawn at rest and is not focusable, pressable or exposed.
struct TanreiBottomSheetHandle: View {
  let isInteractive: Bool
  let isExpanded: Bool
  let label: String
  /// The sheet follows a drag: a press that started on the handle is not shown (BSH-13).
  let isDragging: Bool
  let toggle: @MainActor () -> Void

  @Environment(\.tanreiSystem) private var system
  @FocusState private var isFocused: Bool
  /// Counts activations by key: each one starts a press that no pointer held down (BSH-16).
  @State private var keyboardPresses = 0

  var body: some View {
    let tokens = system.bottomSheet
    let minimum = TanreiHitTarget.minimum(in: system.measure)
    let hit = CGSize(width: max(tokens.handleContainerWidth, minimum), height: max(tokens.handleRowHeight, minimum))
    Color.clear
      .frame(height: tokens.handleRowHeight)
      .frame(maxWidth: .infinity)
      .overlay(alignment: .top) {
        if isInteractive {
          Button(action: toggle) { Color.clear }
            .buttonStyle(
              TanreiBottomSheetHandleStyle(isFocused: isFocused, isDragging: isDragging, keyboardPresses: keyboardPresses, hit: hit))
            .focused($isFocused)
            // Tanrei draws its own ring (BSH-14); the system focus effect would double it.
            .focusEffectDisabled()
            // BSH-11, BSH-16: Enter and Space move the sheet, once per key press, and show the press from the center.
            .tanreiKeyActivation(isEnabled: true) {
              keyboardPresses += 1
              toggle()
            }
            // BSH-11: a button named by the handle label; SwiftUI has no expanded state, so the value says it (in
            // English).
            .accessibilityLabel(Text(verbatim: label))
            .accessibilityValue(Text(verbatim: isExpanded ? "expanded" : "collapsed"))
        } else {
          // BSH-11: one height — drawn at rest; not focusable, not pressable, not exposed.
          TanreiBottomSheetHandleChrome(isPressed: false, isFocused: false)
            .frame(width: hit.width, height: hit.height, alignment: .top)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
        }
      }
  }
}

private struct TanreiBottomSheetHandleStyle: ButtonStyle {
  let isFocused: Bool
  let isDragging: Bool
  var keyboardPresses = 0
  let hit: CGSize

  func makeBody(configuration: Configuration) -> some View {
    // BSH-13: a press that the sheet's drag has taken over is no longer shown.
    TanreiBottomSheetHandleChrome(isPressed: configuration.isPressed && !isDragging, isFocused: isFocused, keyboardPresses: keyboardPresses)
      // BSH-15: the row across the box, at least the minimum target wide and high, from the row's top.
      .frame(width: hit.width, height: hit.height, alignment: .top)
      .contentShape(.interaction, Rectangle())
  }
}

/// The handle's visual: the box (`handle.container-*`) `handle.margin-block` below the row's top and the grip
/// (`handle.grip-*`) centred in it, drawn from the tokens of the handle's one resolved state (BSH-12, BSH-13, BSH-17).
struct TanreiBottomSheetHandleChrome: View {
  let isPressed: Bool
  /// Keyboard focus: SwiftUI never moves focus to a button on a click or tap (BSH-13, BSH-14).
  let isFocused: Bool
  var keyboardPresses = 0

  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    let feedback = system.behavior.pressedFeedback
    // BSH-16: a press stays visible at least `duration.press-hold`; BSH-17: the point of contact only under `ripple`,
    // measured in the box, so a press on the rest of the hit area grows the ripple from the box's center.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyboardPresses, watchesContact: feedback == .ripple, contactArea: .part) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let tokens = system.bottomSheet
    // BSH-13: exactly one state — pressed > focused > hovered. The handle is never disabled.
    let state = TanreiInteraction.resolve(isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let appearance = TanreiBottomSheetHandleAppearance(tokens: tokens, state: state, feedback: feedback, beneath: beneath)
    let ripple = appearance.ripple.map {
      TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion))
    }
    let style = system.shape.roundedCornerStyle
    // BSH-12, BSH-22: the grip, decorative, centred in the box, with round ends (a Handle's line, HDL-1): the box's full corner.
    return RoundedRectangle(cornerRadius: tokens.handleContainerShape, style: style)
      .fill(colors[appearance.grip])
      .frame(width: tokens.handleGripWidth, height: tokens.handleGripHeight)
      .accessibilityHidden(true)
      .frame(width: tokens.handleContainerWidth, height: tokens.handleContainerHeight)
      // BSH-13, BSH-17, BSH-18, BSH-19: the box's fill, the ripple and the state's opacity on the whole handle, its corners
      // eased by the corner smoothing; its colors change over the state motion (at once under Reduce Motion).
      .modifier(
        TanreiContainerLayers(
          fill: colors[appearance.container], elevation: TanreiIdentity.elevation, cornerRadius: tokens.handleContainerShape, outline: .clear,
          outlineWidth: .zero, ripple: ripple, opacity: appearance.opacity))
      .animation(tokens.stateMotion(reduceMotion: reduceMotion), value: state)
      .tanreiContactArea()
      // BSH-14, BSH-18: the ring (or the glow) around the box, keyboard focus only, never animated, never dimmed.
      .tanreiFocusRing(isFocused, cornerRadius: tokens.handleContainerShape)
      .padding(.top, tokens.handleMarginBlock)
      .onHover { isHovered = $0 }
  }
}
