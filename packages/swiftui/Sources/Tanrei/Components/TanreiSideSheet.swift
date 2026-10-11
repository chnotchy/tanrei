import SwiftUI

// Spec: specs/side-sheet.spec.json (SSH-1 … SSH-15) — tokens: TanreiSideSheetTokens (comp.side-sheet), read from the design
// system in the environment (`system.sideSheet`). Every design value in this file comes from a token; there are no literals.
// The only numbers that are not tokens are SSH-4's drag thresholds (`TanreiSheetDrag`, BSH-9's), which the spec fixes for a
// platform that names none.
//
// Two forms. A `standard` sheet is a layout region: `TanreiSideSheet(…)` is a view the product places at the end
// of an `HStack`; it takes `container.width` while it is presented and none while it is not, sliding at the trailing edge
// while the content beside it resizes; no scrim, no focus trap, Escape and drags ignored. A `modal` sheet is a modal
// overlay: `.tanreiSideSheet(…)` on the view it covers presents it as the dialog and the bottom sheet are
// (`TanreiSheetCover`: a full-screen cover on a clear background on iOS, an overlay of that view on macOS), and Tanrei
// draws the scrim, the slide and the drag. The close reasons, writing `false` before `onClose`, the drag thresholds,
// Escape and the escape gesture are the sheets' shared primitive (Primitives/TanreiSheet.swift). The close button is
// `TanreiIconButton` (standard, medium), placed and never restyled; the actions are the product's Tanrei Buttons, laid
// out and never restyled. `TanreiSideSheetSurface(inPlace:…)` draws the sheet (and a modal sheet's scrim) in place, at
// rest, for the fixtures.

// MARK: - The sheet

/// Shows supplementary content or a secondary task in a panel at the trailing edge, with a headline, an optional close
/// button and optional actions (specs/side-sheet.spec.json): beside the content on a wide screen (`.standard`), over it on a
/// compact one (`.modal`).
///
///     @State private var showsFilters = true
///     HStack(spacing: 0) {
///       ResultsList()
///       TanreiSideSheet("Filters", isPresented: $showsFilters, closable: true, closeLabel: "Close filters") {
///         FilterControls()
///       } actions: {
///         TanreiButton("Apply", variant: .text, action: apply)
///         TanreiButton("Reset", variant: .text, action: reset)
///       }
///     }
///
///     // Compact: a modal sheet over the results, opened from a button; it closes itself (writes `false`).
///     ResultsList()
///       .tanreiSideSheet("Filters", isPresented: $showsFilters, closable: true, closeLabel: "Close filters") { FilterControls() }
///
/// - `headline` is what the sheet is about ("Filters"): drawn in its header, wrapping rather than truncating, exposed as a
///   heading, and the sheet's accessible name. Required: an empty one still renders and is reported in debug builds (SSH-12).
/// - `variant` is a `TanreiSideSheetVariant`: `.standard` (default), `.modal`, or a value a design system adds (drawn from
///   its tokens and laid out as a standard sheet). A value the design system does not have is drawn with `.standard`'s
///   tokens and reported in debug builds (SSH-13).
/// - `isPresented` is the spec's `open`. A standard sheet takes its width while it is `true` and none — and no presence to
///   assistive technology or the pointer — while it is `false`, sliding as it changes (SSH-1). The sheet writes `false` itself
///   when it asks to close, then calls `onClose` with the reason (SSH-6).
/// - `closable` draws a standard, medium `TanreiIconButton` with the close glyph at the end of the header, named by
///   `closeLabel` ("Close filters"); it closes the sheet with the reason `.close`, in either variant (SSH-5). A standard sheet
///   has no other way for the person to close it.
/// - `initialFocus` is the VoiceOver focus of the control the sheet moves to when it opens (bind the same state with
///   `.accessibilityFocused(_:)` on that control); without one, VoiceOver moves to the headline (SSH-3). For keyboard focus,
///   mark a control in the content with `.defaultFocus(_:_:)`.
/// - `onClose` is the spec's `close`: `.close` from the close button, and for a modal sheet `.scrim`, `.escape`, `.back` (the
///   iOS accessibility escape gesture) and `.drag`, called once, after `isPresented` has been written `false`.
/// - `content` is handed `content.color` as its foreground style and the body text style, inset, and scrolled between the
///   header and the actions (SSH-10). `actions` holds Tanrei Buttons, main action first, laid out in a row from the leading
///   edge under a divider, or stacked when they do not fit (SSH-11).
///
/// Written as a view with the `.modal` variant, the sheet draws its scrim over the space it is given and its panel at that
/// space's trailing edge, with the modal trait, and makes nothing outside that space inert: present a modal sheet with
/// `.tanreiSideSheet(…)`.
public struct TanreiSideSheet<Content: View, Actions: View>: View {
  private let configuration: TanreiSideSheetConfiguration
  private let isPresented: Binding<Bool>
  private let initialFocus: AccessibilityFocusState<Bool>.Binding?
  private let onClose: (@MainActor (TanreiSheetCloseReason) -> Void)?
  private let content: Content
  private let actions: Actions
  /// Fixtures and galleries only: drawn open, in place, without the modal trait, moving no focus (`TanreiSideSheetSurface`).
  var isInPlace = false
  /// Whether the sheet was presented with its view (mounted open): it is then in place at once. `nil`: whether `isPresented`
  /// is `true` when the view is made. The modal presentation sets it (a cover is made when the sheet opens).
  var startsShown: Bool?

  /// A side sheet with actions.
  public init(
    _ headline: String, variant: TanreiSideSheetVariant = .standard, isPresented: Binding<Bool>, closable: Bool = false, closeLabel: String = "",
    initialFocus: AccessibilityFocusState<Bool>.Binding? = nil, onClose: (@MainActor (TanreiSheetCloseReason) -> Void)? = nil,
    @ViewBuilder content: () -> Content, @ViewBuilder actions: () -> Actions
  ) {
    configuration = TanreiSideSheetConfiguration(headline: headline, variant: variant, closable: closable, closeLabel: closeLabel)
    self.isPresented = isPresented
    self.initialFocus = initialFocus
    self.onClose = onClose
    self.content = content()
    self.actions = actions()
  }

  public var body: some View {
    let configuration = configuration
    let isPresented = isPresented
    let initialFocus = initialFocus
    let onClose = onClose
    let content = content
    let isInPlace = isInPlace
    let startsShown = startsShown ?? isPresented.wrappedValue
    // The actions, read as views: an empty builder (none given, or an `if` that produced nothing) draws no divider and no
    // row (SSH-8, SSH-11).
    _VariadicView.Tree(
      TanreiSideSheetActionsRoot { children in
        TanreiSideSheetForm(
          configuration: configuration, isPresented: isPresented, initialFocus: initialFocus, onClose: onClose, actions: children, content: content,
          isInPlace: isInPlace, startsShown: startsShown)
      }
    ) {
      actions
    }
  }
}

extension TanreiSideSheet where Actions == EmptyView {
  /// A side sheet without actions.
  public init(
    _ headline: String, variant: TanreiSideSheetVariant = .standard, isPresented: Binding<Bool>, closable: Bool = false, closeLabel: String = "",
    initialFocus: AccessibilityFocusState<Bool>.Binding? = nil, onClose: (@MainActor (TanreiSheetCloseReason) -> Void)? = nil,
    @ViewBuilder content: () -> Content
  ) {
    self.init(
      headline, variant: variant, isPresented: isPresented, closable: closable, closeLabel: closeLabel, initialFocus: initialFocus, onClose: onClose,
      content: content
    ) {
      EmptyView()
    }
  }
}

extension View {
  /// Presents a Tanrei side sheet with this view: a modal sheet over it (the default), or a standard one beside it, at its
  /// trailing edge (specs/side-sheet.spec.json).
  ///
  ///     ResultsList()
  ///       .tanreiSideSheet("Filters", isPresented: $showsFilters, closable: true, closeLabel: "Close filters") {
  ///         FilterControls()
  ///       } actions: {
  ///         TanreiButton("Apply", variant: .text) { apply(); showsFilters = false }
  ///       }
  ///
  /// A modal sheet is presented while `isPresented` is `true`, above this view — on iOS above the whole app, as a full-screen
  /// cover whose background is clear; on macOS over this view, which is inert meanwhile (attach it to the window's root) —
  /// with the modal trait (SSH-2). It closes itself by writing `false`, then calls `onClose` with the reason: its close
  /// button, the scrim, Escape, the accessibility escape gesture and a drag toward the trailing edge (SSH-4 … SSH-6). With any
  /// other variant the sheet is laid out beside this view as `TanreiSideSheet` is, the view taking the rest of the width and
  /// resizing as the sheet slides (SSH-1). The arguments are `TanreiSideSheet`'s.
  public func tanreiSideSheet<Content: View, Actions: View>(
    _ headline: String, variant: TanreiSideSheetVariant = .modal, isPresented: Binding<Bool>, closable: Bool = false, closeLabel: String = "",
    initialFocus: AccessibilityFocusState<Bool>.Binding? = nil, onClose: (@MainActor (TanreiSheetCloseReason) -> Void)? = nil,
    @ViewBuilder content: @escaping () -> Content, @ViewBuilder actions: @escaping () -> Actions
  ) -> some View {
    modifier(
      TanreiSideSheetPresenter(variant: variant, isPresented: isPresented) { mountedOpen in
        var sheet = TanreiSideSheet(
          headline, variant: variant, isPresented: isPresented, closable: closable, closeLabel: closeLabel, initialFocus: initialFocus, onClose: onClose,
          content: content, actions: actions)
        sheet.startsShown = mountedOpen
        return sheet
      })
  }

  /// A side sheet without actions, with this view.
  public func tanreiSideSheet<Content: View>(
    _ headline: String, variant: TanreiSideSheetVariant = .modal, isPresented: Binding<Bool>, closable: Bool = false, closeLabel: String = "",
    initialFocus: AccessibilityFocusState<Bool>.Binding? = nil, onClose: (@MainActor (TanreiSheetCloseReason) -> Void)? = nil,
    @ViewBuilder content: @escaping () -> Content
  ) -> some View {
    tanreiSideSheet(
      headline, variant: variant, isPresented: isPresented, closable: closable, closeLabel: closeLabel, initialFocus: initialFocus, onClose: onClose,
      content: content, actions: { EmptyView() })
  }
}

// MARK: - The surface (fixtures)

/// The sheet drawn in place, open and at rest, not modal, filling the space it is given: a standard sheet at the trailing
/// end of a row whose other part is empty, or a modal sheet's scrim over all of it and its panel at its trailing edge. What
/// the fixtures and the gallery draw (a render of the presenting view does not include a presented window). A close it asks
/// for (its close button, and for a modal sheet the scrim, Escape and a drag) is reported to `onClose`; it stays open.
public struct TanreiSideSheetSurface<Content: View, Actions: View>: View {
  private let sheet: TanreiSideSheet<Content, Actions>
  private let isModal: Bool

  /// The sheet in place (fixtures and galleries only).
  @_spi(Fixtures)
  public init(
    inPlace headline: String, variant: TanreiSideSheetVariant = .standard, closable: Bool = false, closeLabel: String = "",
    onClose: (@MainActor (TanreiSheetCloseReason) -> Void)? = nil, @ViewBuilder content: () -> Content, @ViewBuilder actions: () -> Actions
  ) {
    var sheet = TanreiSideSheet(
      headline, variant: variant, isPresented: .constant(true), closable: closable, closeLabel: closeLabel, onClose: onClose, content: content,
      actions: actions)
    sheet.isInPlace = true
    sheet.startsShown = true
    self.sheet = sheet
    isModal = TanreiSideSheetRules.isModal(variant)
  }

  public var body: some View {
    if isModal {
      sheet
    } else {
      HStack(spacing: .zero) {
        Color.clear.frame(maxWidth: .infinity, maxHeight: .infinity)
        sheet
      }
    }
  }
}

extension TanreiSideSheetSurface where Actions == EmptyView {
  /// The sheet in place, without actions (fixtures and galleries only).
  @_spi(Fixtures)
  public init(
    inPlace headline: String, variant: TanreiSideSheetVariant = .standard, closable: Bool = false, closeLabel: String = "",
    onClose: (@MainActor (TanreiSheetCloseReason) -> Void)? = nil, @ViewBuilder content: () -> Content
  ) {
    self.init(inPlace: headline, variant: variant, closable: closable, closeLabel: closeLabel, onClose: onClose, content: content) { EmptyView() }
  }
}

// MARK: - Configuration and rules

/// Everything a sheet is given besides its binding, its focus mark, its content and its actions.
struct TanreiSideSheetConfiguration: Equatable, Sendable {
  var headline = ""
  var variant: TanreiSideSheetVariant = .standard
  var closable = false
  var closeLabel = ""

  /// Only `modal` is a modal overlay; any other value — one a design system adds included — is a layout region.
  var isModal: Bool { TanreiSideSheetRules.isModal(variant) }

  /// SSH-8: the header is drawn while there is a headline or a close button.
  var hasHeader: Bool { !headline.isEmpty || closable }

  /// SSH-12: an empty headline; SSH-5: a close button without a name.
  var problems: [String] {
    var problems: [String] = []
    if headline.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      problems.append("a side sheet's headline is empty, so the sheet has no accessible name (SSH-12)")
    }
    if closable && closeLabel.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      problems.append("a side sheet's close button has no closeLabel, so the button has no accessible name (SSH-5)")
    }
    return problems
  }
}

/// The sheet's rules, pure, so they are tested without a render.
enum TanreiSideSheetRules {
  /// Only the `modal` value is presented as a modal overlay.
  static func isModal(_ variant: TanreiSideSheetVariant) -> Bool {
    variant == .modal
  }

  /// SSH-7: the sheet's width beside the trailing inset — `container.width`; for a modal sheet never wider than the window
  /// (`window` wide, its insets included) less `sys.target.touch`, so that a strip of scrim stays pressable.
  static func width(containerWidth: CGFloat, isModal: Bool, window: CGFloat, touchTarget: CGFloat) -> CGFloat {
    guard isModal else { return containerWidth }
    return max(.zero, min(containerWidth, window - touchTarget))
  }

  /// SSH-4: whether a released drag asks to close — dragged `distance` toward the trailing edge past half the sheet's
  /// `width`, or released at `velocity` (points per second, toward the trailing edge positive) faster than the fling.
  static func dragCloses(distance: CGFloat, velocity: CGFloat, width: CGFloat) -> Bool {
    distance > width / 2 || (velocity > .zero && TanreiSheetDrag.isFling(velocity))
  }

  /// SSH-3: whether the sheet moves focus in when it appears already open — a modal sheet does (it makes everything behind
  /// it unfocusable, so focus must be somewhere it can reach), a standard sheet does not.
  static func movesFocusWhenMountedOpen(isModal: Bool) -> Bool {
    isModal
  }

  /// SSH-11: whether actions of `widths` fit in one row `gap` apart in `available` points.
  static func actionsFitInRow(widths: [CGFloat], gap: CGFloat, available: CGFloat) -> Bool {
    let row = widths.reduce(.zero, +) + gap * CGFloat(max(0, widths.count - 1))
    return row <= available + slack
  }

  /// Half a point: what two measured widths may differ by and still be the same.
  static let slack: CGFloat = 0.5
}

// MARK: - Token bindings

extension TanreiSideSheetTokens {
  /// SSH-1, SSH-4: in (a standard sheet opening, a modal sheet sliding back after a drag) over `motion.enter-*`; `nil` (at
  /// once) under Reduce Motion.
  func enterMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionEnterDuration, easing: motionEnterEasing, reduceMotion: reduceMotion)
  }

  /// SSH-1: out (a standard sheet closing) over `motion.exit-*`; `nil` (at once) under Reduce Motion.
  func exitMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionExitDuration, easing: motionExitEasing, reduceMotion: reduceMotion)
  }

  /// SSH-2: a modal sheet in over `motion.enter-*` — a slide, or under Reduce Motion a fade in place, so never `nil`.
  func presentMotion() -> Animation? {
    enterMotion(reduceMotion: false)
  }

  /// SSH-2: a modal sheet out over `motion.exit-*` — a slide from wherever it is, or under Reduce Motion a fade in place.
  func withdrawMotion() -> Animation? {
    exitMotion(reduceMotion: false)
  }
}

// MARK: - The sheet, read

/// Reads the actions as views and hands them to `body`.
struct TanreiSideSheetActionsRoot<Region: View>: _VariadicView_UnaryViewRoot {
  let region: (_VariadicView.Children) -> Region

  func body(children: _VariadicView.Children) -> some View {
    region(children)
  }
}

/// The sheet from what it read: the reports, the close route, and the standard or modal form.
struct TanreiSideSheetForm<Content: View>: View {
  let configuration: TanreiSideSheetConfiguration
  let isPresented: Binding<Bool>
  let initialFocus: AccessibilityFocusState<Bool>.Binding?
  let onClose: (@MainActor (TanreiSheetCloseReason) -> Void)?
  let actions: _VariadicView.Children
  let content: Content
  let isInPlace: Bool
  let startsShown: Bool

  var body: some View {
    // SSH-5, SSH-12: still rendered; reported in debug builds.
    if !configuration.problems.isEmpty {
      let _ = configuration.problems.forEach { TanreiDiagnostics.report("Tanrei: \($0)") }
    }
    let configuration = configuration
    let actions = actions
    let content = content
    let isInPlace = isInPlace
    let close = close
    let panel = { (width: CGFloat, headlineFocus: AccessibilityFocusState<Bool>.Binding) in
      TanreiSideSheetPanel(
        configuration: configuration, actions: actions, content: content, width: width, isInPlace: isInPlace, headlineFocus: headlineFocus,
        close: close)
    }
    if configuration.isModal {
      TanreiSideSheetModal(
        isPresented: isPresented, isInPlace: isInPlace, startsShown: startsShown, initialFocus: initialFocus, close: close, panel: panel)
    } else {
      TanreiSideSheetRegion(isPresented: isPresented.wrappedValue, isInPlace: isInPlace, initialFocus: initialFocus, panel: panel)
    }
  }

  /// SSH-6: a request to close — writes `false` to `isPresented`, then calls `onClose` with the reason, once, while it is
  /// presented. Returns whether it closed.
  private var close: @MainActor (TanreiSheetCloseReason) -> Bool {
    let isPresented = isPresented
    let onClose = onClose
    return { reason in TanreiSheetRules.close(isPresented, dismissible: true, reason: reason, onClose: onClose) }
  }
}

// MARK: - The standard sheet: a layout region

/// SSH-1, SSH-3: a standard sheet takes `container.width` in the layout while it is presented and none while it is not,
/// sliding in and out at the trailing edge over the enter and exit motions while the content beside it resizes (the change
/// is animated where the state changes, so the whole row moves with it; at once under Reduce Motion); closed, it is out of
/// the accessibility tree and the pointer's reach at once, and gone once it has slid out. Opening it moves VoiceOver to the
/// product's mark or the headline; a sheet presented with its view moves nothing. No scrim, no focus trap, no Escape, no
/// drag.
struct TanreiSideSheetRegion<Panel: View>: View {
  let isPresented: Bool
  let isInPlace: Bool
  let initialFocus: AccessibilityFocusState<Bool>.Binding?
  let panel: (_ width: CGFloat, _ headlineFocus: AccessibilityFocusState<Bool>.Binding) -> Panel

  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// Taking its width: follows `isPresented` inside an animated transaction.
  @State private var isOpen: Bool
  /// Drawn: from the moment it opens until it has slid out.
  @State private var isMounted: Bool
  @AccessibilityFocusState private var headlineFocused: Bool

  init(
    isPresented: Bool, isInPlace: Bool, initialFocus: AccessibilityFocusState<Bool>.Binding?,
    panel: @escaping (_ width: CGFloat, _ headlineFocus: AccessibilityFocusState<Bool>.Binding) -> Panel
  ) {
    self.isPresented = isPresented
    self.isInPlace = isInPlace
    self.initialFocus = initialFocus
    self.panel = panel
    // SSH-3: presented with its view, it is in place at once and moves no focus.
    _isOpen = State(initialValue: isPresented)
    _isMounted = State(initialValue: isPresented)
  }

  var body: some View {
    let tokens = system.sideSheet
    ZStack(alignment: .leading) {
      if isMounted {
        panel(tokens.containerWidth, $headlineFocused)
          // SSH-1: closed, no presence to assistive technology or the pointer, while it slides out.
          .accessibilityHidden(!isPresented)
          .allowsHitTesting(isPresented)
      }
    }
    // SSH-1, SSH-7: `container.width` wide while open, nothing while closed; the panel slides out past the trailing edge.
    .frame(width: isOpen ? tokens.containerWidth : .zero, alignment: .leading)
    .frame(maxHeight: .infinity)
    .onChange(of: isPresented) { _, open in open ? self.open() : close() }
  }

  private func open() {
    isMounted = true
    withAnimation(system.sideSheet.enterMotion(reduceMotion: reduceMotion)) { isOpen = true }
    guard !isInPlace else { return }
    // SSH-3: VoiceOver moves in when the sheet opens, not when its motion ends — once the panel is there.
    let initialFocus = initialFocus
    Task { @MainActor in
      if let initialFocus { initialFocus.wrappedValue = true } else { headlineFocused = true }
    }
  }

  private func close() {
    // SSH-3: VoiceOver focus inside is let go; SwiftUI names no element to give it back to.
    if headlineFocused { headlineFocused = false }
    withAnimation(system.sideSheet.exitMotion(reduceMotion: reduceMotion)) { isOpen = false }
    let exit = reduceMotion ? .zero : system.sideSheet.motionExitDuration
    Task { @MainActor in
      try? await Task.sleep(for: .milliseconds(Int(exit)))
      if !isPresented { isMounted = false }
    }
  }
}

// MARK: - The modal sheet: a modal overlay

/// SSH-2, SSH-4, SSH-6, SSH-7: the scrim over the space it is given and the panel at its trailing edge, sliding in from there
/// while the scrim fades in over the enter motion, and out from wherever it is over the exit motion (fading in place under
/// Reduce Motion). The scrim, Escape, the accessibility escape gesture and a drag toward the trailing edge ask to close; a
/// drag that does not slides back. Presented (not in place), it is a modal container named by the headline, it moves
/// VoiceOver in when it opens — mounted open included (SSH-3) — and it counts itself as an open Tanrei modal.
struct TanreiSideSheetModal<Panel: View>: View {
  let isPresented: Binding<Bool>
  let isInPlace: Bool
  let initialFocus: AccessibilityFocusState<Bool>.Binding?
  let close: @MainActor (TanreiSheetCloseReason) -> Bool
  let panel: (_ width: CGFloat, _ headlineFocus: AccessibilityFocusState<Bool>.Binding) -> Panel

  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.layoutDirection) private var layoutDirection
  @TanreiPalette private var colors
  /// Drawn: from the moment it opens until it has slid out.
  @State private var isMounted: Bool
  /// In (slid in, the scrim shown), or out.
  @State private var isShown: Bool
  /// SSH-4: how far a drag that the sheet follows has moved it toward the trailing edge.
  @State private var dragged: CGFloat = .zero
  /// Counted in `TanreiModalCoordinator`.
  @State private var isCounted = false
  @AccessibilityFocusState private var headlineFocused: Bool

  init(
    isPresented: Binding<Bool>, isInPlace: Bool, startsShown: Bool, initialFocus: AccessibilityFocusState<Bool>.Binding?,
    close: @escaping @MainActor (TanreiSheetCloseReason) -> Bool,
    panel: @escaping (_ width: CGFloat, _ headlineFocus: AccessibilityFocusState<Bool>.Binding) -> Panel
  ) {
    self.isPresented = isPresented
    self.isInPlace = isInPlace
    self.initialFocus = initialFocus
    self.close = close
    self.panel = panel
    // Presented with its view (or in place, a fixture), it is drawn open and at rest; otherwise it slides in once it is there.
    let open = startsShown && isPresented.wrappedValue
    _isMounted = State(initialValue: open)
    _isShown = State(initialValue: open)
  }

  var body: some View {
    let tokens = system.sideSheet
    GeometryReader { proxy in
      if isMounted {
        let insets = proxy.safeAreaInsets
        // SSH-7: never wider than the window less a touch target.
        let width = TanreiSideSheetRules.width(
          containerWidth: tokens.containerWidth, isModal: true, window: proxy.size.width + insets.leading + insets.trailing,
          touchTarget: system.measure.targetTouch)
        // How far the panel moves to be wholly past the trailing edge: its width, the inset its color reaches under and its
        // shadow.
        let reach = tokens.variants[.modal].containerElevation.map(TanreiElevationPlan.reach).max() ?? .zero
        let away = width + insets.trailing + reach
        let slides = !isShown && !reduceMotion
        ZStack(alignment: .trailing) {
          // SSH-2: the scrim over the rest of the window, fading with the sheet; SSH-4: a press on it asks to close.
          // Decorative.
          Rectangle()
            .fill(colors[tokens.scrimColor])
            .ignoresSafeArea()
            .contentShape(Rectangle())
            .onTapGesture { _ = close(.scrim) }
            .accessibilityHidden(true)
            .opacity(isShown ? 1 : .zero)
          panel(width, $headlineFocused)
            // A press anywhere on the sheet is the sheet's: it never reaches the scrim.
            .contentShape(Rectangle())
            // SSH-4: a drag toward the trailing edge.
            .simultaneousGesture(drag(width: width))
            // SSH-12: a modal container named by the headline (SwiftUI has no dialog role).
            .accessibilityAddTraits(isInPlace ? [] : .isModal)
            // SSH-4: Escape and the accessibility escape gesture.
            .modifier(TanreiSheetEscape(isModal: true, close: close))
            // SSH-2: in from the trailing edge, or — under Reduce Motion — faded in place; a drag moves it toward the edge. An
            // offset mirrors right to left: positive is toward the trailing edge either way.
            .offset(x: slides ? away : (isShown ? dragged : .zero))
            .opacity(reduceMotion && !isShown ? .zero : 1)
        }
        .frame(width: proxy.size.width, height: proxy.size.height, alignment: .trailing)
      }
    }
    // A tooltip inside the sheet is drawn above it (TIP-13).
    .modifier(TanreiSheetTooltipLayer(isModal: !isInPlace))
    .onAppear { appear() }
    .onChange(of: isPresented.wrappedValue) { _, open in open ? present() : withdraw() }
    .onDisappear { uncount() }
  }

  /// A horizontal distance in the window's coordinates, which do not mirror, as a distance toward the trailing edge:
  /// rightward, or leftward right to left.
  private func towardEnd(_ dx: CGFloat) -> CGFloat {
    layoutDirection == .rightToLeft ? -dx : dx
  }

  private func appear() {
    guard !isInPlace else { return }
    if isShown {
      // SSH-3: presented with its view, it counts itself and moves focus in as if it had just opened, without motion.
      count()
      if TanreiSideSheetRules.movesFocusWhenMountedOpen(isModal: true) { moveFocusIn() }
    } else if isPresented.wrappedValue {
      present()
    }
  }

  /// SSH-2: mounted past the trailing edge, then slid in (faded in place under Reduce Motion) and the scrim faded in; SSH-3:
  /// VoiceOver moves in when it opens, not when its motion ends.
  private func present() {
    guard !isInPlace, !(isMounted && isShown) else { return }
    count()
    dragged = .zero
    isMounted = true
    let motion = system.sideSheet.presentMotion()
    Task { @MainActor in
      withAnimation(motion) { isShown = true }
      moveFocusIn()
    }
  }

  /// SSH-2, SSH-6: slid out from wherever it is (a drag included; faded under Reduce Motion) and the scrim faded out; gone
  /// once it is out. VoiceOver focus is let go; on iOS the cover hands it back.
  private func withdraw() {
    guard !isInPlace, isMounted else { return }
    uncount()
    if headlineFocused { headlineFocused = false }
    withAnimation(system.sideSheet.withdrawMotion()) {
      isShown = false
      dragged = .zero
    }
    let exit = system.sideSheet.motionExitDuration
    Task { @MainActor in
      try? await Task.sleep(for: .milliseconds(Int(exit)))
      if !isPresented.wrappedValue { isMounted = false }
    }
  }

  private func moveFocusIn() {
    if let initialFocus { initialFocus.wrappedValue = true } else { headlineFocused = true }
  }

  /// SSH-15 (and SNK-12): a presented modal sheet counts as an open Tanrei modal.
  private func count() {
    guard !isInPlace, !isCounted else { return }
    isCounted = true
    TanreiModalCoordinator.shared.opened()
  }

  private func uncount() {
    guard isCounted else { return }
    isCounted = false
    TanreiModalCoordinator.shared.closed()
  }

  /// SSH-4, SSH-6: the sheet follows a drag toward its trailing edge beyond the touch slop, measured in the window's
  /// coordinates (which do not mirror); released past half its width or flung that way, it asks to close, holds where it
  /// was left for a frame, and then slides out from there — or, where the binding declined, back. Any other release slides
  /// back over the enter motion (at once under Reduce Motion).
  private func drag(width: CGFloat) -> some Gesture {
    DragGesture(minimumDistance: TanreiSheetDrag.touchSlop, coordinateSpace: .global)
      .onChanged { value in
        guard isShown, isPresented.wrappedValue else { return }
        dragged = min(max(.zero, towardEnd(value.translation.width)), width)
      }
      .onEnded { value in
        guard isShown, isPresented.wrappedValue else { return }
        let distance = max(.zero, towardEnd(value.translation.width))
        let settle = system.sideSheet.enterMotion(reduceMotion: reduceMotion)
        if TanreiSideSheetRules.dragCloses(distance: distance, velocity: towardEnd(value.velocity.width), width: width), close(.drag) {
          Task { @MainActor in
            // One frame where the drag left it; then, if it is still open (the product declined), back.
            await Task.yield()
            if isPresented.wrappedValue { withAnimation(settle) { dragged = .zero } }
          }
          return
        }
        withAnimation(settle) { dragged = .zero }
      }
  }
}

/// The side of the view `.tanreiSideSheet(…)` is attached to. A modal sheet is presented over it (`TanreiSheetCover`); any
/// other is laid out beside it, at its trailing end, the view taking the rest of the width (SSH-1).
struct TanreiSideSheetPresenter<Sheet: View>: ViewModifier {
  let variant: TanreiSideSheetVariant
  let isPresented: Binding<Bool>
  @ViewBuilder let sheet: (_ mountedOpen: Bool) -> Sheet

  @Environment(\.tanreiSystem) private var system

  func body(content: Content) -> some View {
    if TanreiSideSheetRules.isModal(variant) {
      content.modifier(TanreiSheetCover(isPresented: isPresented, exitDuration: system.sideSheet.motionExitDuration, sheet: sheet))
    } else {
      HStack(spacing: .zero) {
        content.frame(maxWidth: .infinity, maxHeight: .infinity)
        sheet(isPresented.wrappedValue)
      }
    }
  }
}

// MARK: - The panel

/// The panel (SSH-5, SSH-7 … SSH-12, SSH-14): `width` wide beside the trailing inset and the full height it is offered, on its
/// variant's color and elevation, its leading corners rounded by its variant's shape (eased by the corner smoothing) and its
/// trailing corners square, edged at its leading side by `outline.width` of its variant's outline color; inside, the header
/// (the headline and the close button), the content scrolled between the header and the actions, and the divider and the
/// actions at the bottom. Its color reaches under the trailing, top and bottom system insets; what it holds stays inside
/// them. Right to left, it is mirrored.
struct TanreiSideSheetPanel<Content: View>: View {
  let configuration: TanreiSideSheetConfiguration
  let actions: _VariadicView.Children
  let content: Content
  let width: CGFloat
  let isInPlace: Bool
  let headlineFocus: AccessibilityFocusState<Bool>.Binding
  let close: @MainActor (TanreiSheetCloseReason) -> Bool

  @Environment(\.tanreiSystem) private var system
  @TanreiPalette private var colors

  var body: some View {
    let tokens = system.sideSheet
    // SSH-13: a variant the design system does not have reads the default's tokens, and is reported.
    let look = tokens.variants[configuration.variant]
    VStack(alignment: .leading, spacing: .zero) {
      if configuration.hasHeader {
        TanreiSideSheetHeader(configuration: configuration, isInPlace: isInPlace, headlineFocus: headlineFocus, close: close)
      } else {
        // SSH-8: without a header, the content starts `container.padding-block` below the top edge.
        Color.clear.frame(height: tokens.containerPaddingBlock)
      }
      // SSH-10: the content, inset, handed the content color and the body text style, scrolled between the header and the
      // actions; a scroll view is reachable by VoiceOver and keyboard focus.
      TanreiScrollRegion(axis: .vertical) {
        content
          .foregroundStyle(colors[tokens.contentColor])
          .tanreiFont(system.typescale.body)
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.horizontal, tokens.containerPaddingInline)
      }
      .frame(maxHeight: .infinity, alignment: .top)
      if actions.isEmpty {
        // SSH-8: without actions, `container.padding-block` below the content.
        Color.clear.frame(height: tokens.containerPaddingBlock)
      } else {
        // SSH-11: the divider across the whole sheet, decorative.
        Rectangle()
          .fill(colors[tokens.dividerColor])
          .frame(height: tokens.dividerWidth)
          .accessibilityHidden(true)
        // SSH-11: the buttons as they are, in a row from the leading edge — or stacked when they do not fit.
        TanreiSideSheetActionsLayout(gap: tokens.actionsGap) {
          ForEach(actions) { $0 }
        }
        .padding(.horizontal, tokens.containerPaddingInline)
        .padding(.vertical, tokens.actionsPaddingBlock)
      }
    }
    // SSH-7, SSH-14: `width` wide beside the trailing inset (never scaled with the text), the full height.
    .frame(width: width)
    .frame(maxHeight: .infinity, alignment: .top)
    // SSH-7: the container in its variant's color and elevation, reaching under the trailing, top and bottom insets.
    .background {
      TanreiSideSheetContainer(tokens: look)
        .ignoresSafeArea(.container, edges: [.trailing, .vertical])
    }
    // SSH-7: the leading edge (the right one right to left), toward the content, over everything the sheet holds (the
    // divider included), its full height; decorative.
    .overlay {
      TanreiSideSheetEdge(tokens: look, width: tokens.outlineWidth)
        .ignoresSafeArea(.container, edges: [.trailing, .vertical])
    }
    // SSH-12: the sheet, named by its headline, holding the header, the content and the actions (SwiftUI has neither a
    // dialog nor a region role: a container).
    .accessibilityElement(children: .contain)
    .accessibilityLabel(Text(verbatim: configuration.headline))
  }

}

/// SSH-5, SSH-8, SSH-9: the header — a row at least `header.height` high: the headline from `container.padding-inline` after
/// the leading edge (`headline.typescale`, `headline.color`, wrapping and growing the row, a heading) and, while closable, a
/// standard medium `TanreiIconButton` with the close glyph `header.gap` after it, ending `header.padding-inline-end` before the
/// trailing edge; both centred in the row.
struct TanreiSideSheetHeader: View {
  let configuration: TanreiSideSheetConfiguration
  let isInPlace: Bool
  let headlineFocus: AccessibilityFocusState<Bool>.Binding
  let close: @MainActor (TanreiSheetCloseReason) -> Bool

  @Environment(\.tanreiSystem) private var system
  @Environment(\.tanreiScrollsInPlace) private var scrollsInPlace
  @TanreiPalette private var colors

  var body: some View {
    let tokens = system.sideSheet
    HStack(alignment: .center, spacing: tokens.headerGap) {
      if configuration.headline.isEmpty {
        Spacer(minLength: .zero)
      } else {
        Text(verbatim: configuration.headline)
          .multilineTextAlignment(.leading)
          .fixedSize(horizontal: false, vertical: true)
          .tanreiTextStyle(tokens.headlineTypescale)
          .foregroundStyle(colors[tokens.headlineColor])
          .frame(maxWidth: .infinity, alignment: .leading)
          .accessibilityAddTraits(.isHeader)
          // SSH-3: where VoiceOver goes when the sheet opens without a mark of the product's — bound only on the live path
          // (`ImageRenderer` draws a view carrying it as nothing).
          .modifier(TanreiSideSheetSpokenFocus(isWatched: !isInPlace && !scrollsInPlace, focus: headlineFocus))
      }
      if configuration.closable {
        // SSH-5: the icon-button component, standard and medium, unrestyled; its close glyph (the icon font's, or the drawn
        // cross without it).
        TanreiIconButton(configuration.closeLabel, variant: .standard, size: .medium, action: { _ = close(.close) }) {
          TanreiChipGlyph(kind: .close)
        }
      }
    }
    .padding(.leading, tokens.containerPaddingInline)
    .padding(.trailing, configuration.closable ? tokens.headerPaddingInlineEnd : tokens.containerPaddingInline)
    .frame(maxWidth: .infinity, minHeight: tokens.headerHeight, alignment: .leading)
  }
}

/// SSH-3: binds the headline to the sheet's VoiceOver focus, where it is watched.
private struct TanreiSideSheetSpokenFocus: ViewModifier {
  let isWatched: Bool
  let focus: AccessibilityFocusState<Bool>.Binding

  func body(content: Content) -> some View {
    if isWatched { content.accessibilityFocused(focus) } else { content }
  }
}

/// SSH-11: the actions in one row from the leading edge, `gap` apart, in order, each at its own size and centred in the row;
/// or, when they do not fit the width offered, in a column aligned to the leading edge, `gap` apart, in the same order (a
/// button wider than the column is offered the column's width). Stateless, so it is right on the first layout pass; a
/// `Layout` is placed mirrored right to left.
struct TanreiSideSheetActionsLayout: Layout {
  let gap: CGFloat

  private func arrangement(_ proposal: ProposedViewSize, _ subviews: Subviews) -> (row: Bool, width: CGFloat, sizes: [CGSize]) {
    let natural = subviews.map { $0.sizeThatFits(.unspecified) }
    let widths = natural.map(\.width)
    let rowWidth = widths.reduce(.zero, +) + gap * CGFloat(max(0, subviews.count - 1))
    guard let available = proposal.width, available.isFinite else { return (true, rowWidth, natural) }
    if TanreiSideSheetRules.actionsFitInRow(widths: widths, gap: gap, available: available) { return (true, available, natural) }
    let sizes = zip(subviews, natural).map { subview, size in
      size.width <= available ? size : subview.sizeThatFits(ProposedViewSize(width: available, height: nil))
    }
    return (false, available, sizes)
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let (row, width, sizes) = arrangement(proposal, subviews)
    let heights = sizes.map(\.height)
    let height = row ? heights.max() ?? .zero : heights.reduce(.zero, +) + gap * CGFloat(max(0, sizes.count - 1))
    return CGSize(width: width, height: height)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    let (row, _, sizes) = arrangement(ProposedViewSize(width: bounds.width, height: nil), subviews)
    var x = bounds.minX
    var y = bounds.minY
    for (subview, size) in zip(subviews, sizes) {
      if row {
        subview.place(at: CGPoint(x: x, y: bounds.midY), anchor: .leading, proposal: ProposedViewSize(size))
        x += size.width + gap
      } else {
        subview.place(at: CGPoint(x: bounds.minX, y: y), anchor: .topLeading, proposal: ProposedViewSize(size))
        y += size.height + gap
      }
    }
  }
}

/// SSH-7: the container — its variant's color and elevation, its leading corners rounded by its variant's shape (eased by the
/// corner smoothing) and its trailing corners square. The rounded surface reaches past the trailing edge by its corner
/// radius and is cut there with its shadow, so the trailing corners are square and nothing is drawn past that edge; its
/// shadow on every other side is kept. Decorative.
struct TanreiSideSheetContainer: View {
  let tokens: TanreiSideSheetVariantTokens

  @TanreiPalette private var colors

  var body: some View {
    let reach = tokens.containerElevation.map(TanreiElevationPlan.reach).max() ?? .zero
    TanreiElevationSurface(tokens.containerElevation, fill: colors[tokens.containerColor], cornerRadius: tokens.containerShape)
      .padding(.trailing, -tokens.containerShape)
      .clipShape(TanreiTrailingCut(reach: reach))
      .allowsHitTesting(false)
      .accessibilityHidden(true)
  }
}

/// SSH-7: the edge at the container's leading side — `width` of its variant's outline color, the container's full height,
/// inside its rounded leading corners. Decorative.
struct TanreiSideSheetEdge: View {
  let tokens: TanreiSideSheetVariantTokens
  let width: CGFloat

  @Environment(\.tanreiSystem) private var system
  @TanreiPalette private var colors

  var body: some View {
    Rectangle()
      .fill(colors[tokens.outlineColor])
      .frame(width: width)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      .clipShape(UnevenRoundedRectangle(topLeadingRadius: tokens.containerShape, bottomLeadingRadius: tokens.containerShape, style: system.shape.roundedCornerStyle))
      .allowsHitTesting(false)
      .accessibilityHidden(true)
  }
}

/// Everything up to a view's trailing edge, and `reach` past its other three edges: what clips away only what lies past the
/// trailing edge. A shape, so it mirrors right to left.
struct TanreiTrailingCut: Shape {
  let reach: CGFloat

  func path(in rect: CGRect) -> Path {
    Path(CGRect(x: rect.minX - reach, y: rect.minY - reach, width: rect.width + reach, height: rect.height + 2 * reach))
  }
}
