import Observation
import SwiftUI

// Spec: specs/snackbar.spec.json — tokens: TanreiSnackbarTokens (comp.snackbar), read from the design system in the
// environment (`system.snackbar`). Every design value in this file comes from a token; there are no literals, and no
// state's look is computed here. The action and the close button are the values of the control axis, each
// pressed like Button: press, hold, ripple, focus ring, container layers and the minimum target are the
// shared primitives, and SNK-4 … SNK-7 are BTN-5 … BTN-10 for the snackbar's controls.
//
// A snackbar is a READ overlay: it is announced politely and never takes focus. A host
// (`TanreiSnackbarHost`, attached with `.tanreiSnackbarHost(_:)` to the view whose bottom edge it uses) shows one at a
// time in an overlay of that view — not in a sheet, which would be modal —, and `await host.show(…)` returns how it
// closed. `TanreiSnackbar` draws one in place (SNK-19): the snapshot harness and a documentation page.

/// How long a snackbar stays by itself (spec prop `duration`).
public enum TanreiSnackbarDuration: String, CaseIterable, Sendable {
  /// Short without an action, indefinite with one (WCAG 2.2.1).
  case auto
  /// `comp.snackbar.timeout.short`.
  case short
  /// `comp.snackbar.timeout.long`.
  case long
  /// Until it is closed.
  case indefinite

  /// The duration a spec value names, for UI built from data. Any other name is `.auto`, the default, and is reported in
  /// debug builds.
  public init(named name: String) {
    if let duration = TanreiSnackbarDuration(rawValue: name) {
      self = duration
    } else {
      TanreiDiagnostics.report("Tanrei: a snackbar has no duration \"\(name)\"; using \"auto\"")
      self = .auto
    }
  }
}

/// Why a snackbar closed without its action (the spec's `dismiss` reason).
public enum TanreiSnackbarDismissReason: String, CaseIterable, Sendable {
  /// The close button.
  case close
  /// Escape while focus was inside it.
  case escape
  /// Its duration ran out.
  case timeout
  /// The product closed it, or cleared the queue.
  case host
}

/// How a snackbar closed: the spec's `action` event is `TanreiSnackbarResult.action`, and its `dismiss` event
/// `TanreiSnackbarResult.dismissed(reason)`.
public enum TanreiSnackbarResult: Equatable, Sendable {
  case action
  case dismissed(TanreiSnackbarDismissReason)
}

/// What one snackbar says and does.
struct TanreiSnackbarContent: Equatable, Sendable {
  let message: String
  let actionLabel: String
  let withCloseButton: Bool
  let closeLabel: String
  let duration: TanreiSnackbarDuration

  var hasAction: Bool { !actionLabel.isEmpty }

  /// SNK-8: how long it stays by itself, in milliseconds — `nil` for never. Auto is short without an action and
  /// indefinite with one; a snackbar with an action never times out while VoiceOver runs.
  func timeout(tokens: TanreiSnackbarTokens, voiceOver: Bool) -> Double? {
    if hasAction && voiceOver { return nil }
    switch duration {
    case .auto: return hasAction ? nil : tokens.timeoutShort
    case .short: return tokens.timeoutShort
    case .long: return tokens.timeoutLong
    case .indefinite: return nil
    }
  }

  /// SNK-10: what is announced — the message, then the action's label.
  var announcement: String {
    [message, actionLabel].filter { !$0.isEmpty }.joined(separator: ", ")
  }

  /// SNK-20: an empty message, a close button without a name, and a timed action.
  var problems: [String] {
    var problems: [String] = []
    if message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { problems.append("a snackbar's message is empty (SNK-20)") }
    if withCloseButton && closeLabel.trimmingCharacters(in: .whitespaces).isEmpty {
      problems.append("a snackbar's close button has no closeLabel, so it has no accessible name (SNK-20)")
    }
    if hasAction && (duration == .short || duration == .long) {
      problems.append("a snackbar times out its action \"\(actionLabel)\"; offer it elsewhere too, since a person may not reach it in time (SNK-20)")
    }
    return problems
  }
}

// MARK: - The host

/// Shows a product's snackbars one at a time, at the bottom of the view it is attached to (`.tanreiSnackbarHost(_:)`).
///
///     @State private var snackbars = TanreiSnackbarHost()
///     ContentView()
///       .tanreiSnackbarHost(snackbars)
///     …
///     if await snackbars.show(message: "Conversation archived", actionLabel: "Undo") == .action { unarchive() }
///
/// SNK-12: a snackbar requested while another is showing (or fading out) waits for it, and one not yet shown waits while a
/// Tanrei modal dialog covers the host; `show` returns once its snackbar has closed, with `.action` or `.dismissed(reason)`.
/// `dismissCurrent()` closes the one showing (`.dismissed(.host)`) and the next shows; `clear()` also drops every waiting one.
/// The host needs its view on screen: a request made to a host that is not attached waits.
@MainActor
@Observable
public final class TanreiSnackbarHost {
  struct Request: Identifiable {
    let id = UUID()
    let content: TanreiSnackbarContent
    let resume: @MainActor (TanreiSnackbarResult) -> Void
  }

  /// The one showing, fading in or shown until it closes.
  private(set) var current: Request?
  /// True once the current one has closed: it fades out, and the next waits for the fade.
  private(set) var isClosing = false
  /// Waiting, in the order they were requested.
  private(set) var waiting: [Request] = []
  /// A Tanrei modal dialog covers the host: nothing new shows (SNK-12).
  private(set) var isHeld = false

  public init() {}

  /// Shows a snackbar once those before it have closed, and returns how it closed (SNK-12).
  ///
  /// - Parameters:
  ///   - message: what happened (required; plain text, announced in full).
  ///   - actionLabel: the one action's label ("Undo"); empty draws none.
  ///   - withCloseButton: draws a close button (the spec's `closable`), named `closeLabel` in the product's language.
  ///   - duration: `.auto` (short without an action, never timing out with one), `.short`, `.long` or `.indefinite`.
  @discardableResult
  public func show(
    message: String, actionLabel: String = "", withCloseButton: Bool = false, closeLabel: String = "", duration: TanreiSnackbarDuration = .auto
  ) async -> TanreiSnackbarResult {
    let content = TanreiSnackbarContent(
      message: message, actionLabel: actionLabel, withCloseButton: withCloseButton, closeLabel: closeLabel, duration: duration)
    content.problems.forEach { TanreiDiagnostics.report("Tanrei: \($0)") }
    return await withCheckedContinuation { continuation in
      enqueue(Request(content: content, resume: { continuation.resume(returning: $0) }))
    }
  }

  /// Closes the snackbar showing, with `.dismissed(.host)`; the next waiting one then shows.
  public func dismissCurrent() {
    close(.dismissed(.host))
  }

  /// Closes the snackbar showing and drops every waiting one, each with `.dismissed(.host)`.
  public func clear() {
    let dropped = waiting
    waiting = []
    dropped.forEach { $0.resume(.dismissed(.host)) }
    close(.dismissed(.host))
  }

  func enqueue(_ request: Request) {
    waiting.append(request)
    advance()
  }

  /// SNK-1, SNK-8, SNK-11: the showing snackbar closed with `result`; it resolves now and fades out. Once only.
  func close(_ result: TanreiSnackbarResult) {
    guard let current, !isClosing else { return }
    isClosing = true
    current.resume(result)
  }

  /// SNK-17: the fade-out is over; the next one shows.
  func finishClosing() {
    guard isClosing else { return }
    current = nil
    isClosing = false
    advance()
  }

  /// SNK-12: a Tanrei modal dialog covers the host, or no longer does.
  func hold(_ held: Bool) {
    isHeld = held
    advance()
  }

  private func advance() {
    guard current == nil, !isHeld, !waiting.isEmpty else { return }
    current = waiting.removeFirst()
  }
}

extension View {
  /// Shows `host`'s snackbars at the bottom of this view, centred, `container.margin` above its bottom edge and from its
  /// sides, inside the safe area and above the keyboard, over this view's content (SNK-13). Its place in the focus order
  /// is this view's (SNK-11).
  public func tanreiSnackbarHost(_ host: TanreiSnackbarHost) -> some View {
    overlay(alignment: .bottom) { TanreiSnackbarHostView(host: host) }
  }
}

/// SNK-9 — whether the timeout is paused: the pointer is over the snackbar, focus is inside it, the app is in the
/// background, or a Tanrei modal dialog covers the host.
enum TanreiSnackbarRules {
  static func isPaused(hovered: Bool, focusInside: Bool, active: Bool, covered: Bool) -> Bool {
    hovered || focusInside || !active || covered
  }
}

/// The host's overlay: the current snackbar, its entrance, its timeout, its announcement and its fade-out.
private struct TanreiSnackbarHostView: View {
  let host: TanreiSnackbarHost

  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.accessibilityVoiceOverEnabled) private var voiceOver
  @Environment(\.scenePhase) private var scenePhase
  @State private var hovered = false
  @State private var focusInside = false

  var body: some View {
    let tokens = system.snackbar
    let covered = TanreiModalCoordinator.shared.isCovered
    ZStack(alignment: .bottom) {
      if let current = host.current {
        let paused = TanreiSnackbarRules.isPaused(hovered: hovered, focusInside: focusInside, active: scenePhase == .active, covered: covered)
        TanreiSnackbarBar(
          content: current.content, onResult: { host.close($0) }, onHover: { hovered = $0 }, onFocusInside: { focusInside = $0 }
        )
        .padding(tokens.containerMargin)
        .id(current.id)
        // SNK-17: out, it fades in place over the exit motion; the next shows after it.
        .opacity(host.isClosing ? .zero : 1)
        .animation(tokens.exitMotion(), value: host.isClosing)
        .allowsHitTesting(!host.isClosing)
        // SNK-17: in, it rises from below by its height and margin while fading — only fading under Reduce Motion.
        .transition(tokens.entrance(reduceMotion: reduceMotion))
        // SNK-8, SNK-9: the timeout, restarted from its whole length whenever it resumes.
        .task(id: TanreiSnackbarTimerKey(request: current.id, running: !paused && !host.isClosing)) {
          guard !paused, !host.isClosing, let timeout = current.content.timeout(tokens: tokens, voiceOver: voiceOver) else { return }
          try? await Task.sleep(for: .milliseconds(Int(timeout)))
          guard !Task.isCancelled else { return }
          host.close(.dismissed(.timeout))
        }
        // SNK-17: the next one waits for the fade-out.
        .task(id: TanreiSnackbarTimerKey(request: current.id, running: host.isClosing)) {
          guard host.isClosing else { return }
          try? await Task.sleep(for: .milliseconds(Int(tokens.motionExitDuration)))
          guard !Task.isCancelled else { return }
          hovered = false
          focusInside = false
          host.finishClosing()
        }
        // SNK-10: announced once, politely, after what is being read; focus stays where it is.
        .onAppear { AccessibilityNotification.Announcement(current.content.announcement).post() }
      }
    }
    .frame(maxWidth: .infinity)
    .animation(tokens.enterMotion(reduceMotion: reduceMotion), value: host.current?.id)
    // SNK-12: a snackbar not yet shown waits while a Tanrei modal dialog covers the host.
    .onChange(of: covered, initial: true) { _, now in host.hold(now) }
  }
}

private struct TanreiSnackbarTimerKey: Hashable {
  let request: UUID
  let running: Bool
}

extension TanreiSnackbarTokens {
  /// SNK-17: in over `motion.enter-*`. Reduced motion keeps it: only the rise is left out.
  func enterMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionEnterDuration, easing: motionEnterEasing, reduceMotion: false)
  }

  /// SNK-17: out over `motion.exit-*`, a fade in place, also under Reduce Motion.
  func exitMotion() -> Animation? {
    TanreiMotion.animation(durationMs: motionExitDuration, easing: motionExitEasing, reduceMotion: false)
  }

  /// SNK-17: rising from below the host's bottom edge by its own height plus its margin (the padded bar's height) while
  /// fading in; only fading where motion is reduced. It leaves by its fade, already over when it is removed.
  func entrance(reduceMotion: Bool) -> AnyTransition {
    .asymmetric(insertion: reduceMotion ? .opacity : .move(edge: .bottom).combined(with: .opacity), removal: .identity)
  }

  /// How the SNK-6 ripple grows: over `motion.feedback-duration`, with the state easing; `nil` under Reduce Motion.
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// A change of a control's state over the state motion; `nil` under Reduce Motion.
  func stateMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionStateDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }
}

// MARK: - In place

/// A snackbar drawn in place, at its resting position (SNK-19): for a snapshot harness or a documentation page. It does
/// not time out, queue, animate its entrance or announce itself, and still reports its action and its close button
/// through `onResult`. Show snackbars to people through a `TanreiSnackbarHost`.
///
///     TanreiSnackbar(message: "Conversation archived", actionLabel: "Undo", withCloseButton: true, closeLabel: "Close")
public struct TanreiSnackbar: View {
  let content: TanreiSnackbarContent
  let onResult: @MainActor (TanreiSnackbarResult) -> Void

  public init(
    message: String, actionLabel: String = "", withCloseButton: Bool = false, closeLabel: String = "", duration: TanreiSnackbarDuration = .auto,
    onResult: @escaping @MainActor (TanreiSnackbarResult) -> Void = { _ in }
  ) {
    content = TanreiSnackbarContent(
      message: message, actionLabel: actionLabel, withCloseButton: withCloseButton, closeLabel: closeLabel, duration: duration)
    self.onResult = onResult
    content.problems.forEach { TanreiDiagnostics.report("Tanrei: \($0)") }
  }

  public var body: some View {
    TanreiSnackbarBar(content: content, onResult: onResult)
  }
}

// MARK: - The bar

/// The bar: the message and its controls laid out by `TanreiSnackbarLayout` on the container (SNK-14 … SNK-16), Escape
/// while focus is inside (SNK-11), and what pauses its timeout reported to the host (SNK-9).
struct TanreiSnackbarBar: View {
  let content: TanreiSnackbarContent
  let onResult: @MainActor (TanreiSnackbarResult) -> Void
  var onHover: @MainActor (Bool) -> Void = { _ in }
  var onFocusInside: @MainActor (Bool) -> Void = { _ in }

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @TanreiPalette private var colors
  @FocusState private var focused: TanreiSnackbarControl?

  var body: some View {
    let tokens = theme.system.snackbar
    let line = tokens.supportingTextTypescale.resolved(policy: theme.fontFamilyPolicy, dynamicTypeSize: dynamicTypeSize).lineHeight
    TanreiSnackbarLayout(
      paddingStart: tokens.containerPaddingInlineStart, paddingEnd: tokens.containerPaddingInlineEnd,
      paddingEndWithControls: tokens.containerPaddingInlineEndWithControls, paddingBlock: tokens.containerPaddingBlock, gap: tokens.containerGap,
      controlsGap: tokens.controlsGap, minWidth: tokens.containerMinWidth, maxWidth: tokens.containerMaxWidth, minHeight: tokens.containerMinHeight,
      lineHeight: line
    ) {
      // SNK-15: the message, wrapping and never truncated (SNK-16), start-aligned.
      Text(verbatim: content.message)
        .multilineTextAlignment(.leading)
        .fixedSize(horizontal: false, vertical: true)
        .tanreiTextStyle(tokens.supportingTextTypescale)
        .foregroundStyle(colors[tokens.supportingTextColor])
        .layoutValue(key: TanreiSnackbarLayout.PartKey.self, value: .message)
      if content.hasAction {
        control(.action) {
          // SNK-16: the action's label never wraps or is cut.
          Text(verbatim: content.actionLabel)
            .lineLimit(1)
            .fixedSize()
            .tanreiTextStyle(tokens.controlsLabelTypescale)
        }
        .layoutValue(key: TanreiSnackbarLayout.PartKey.self, value: .action)
      }
      if content.withCloseButton {
        control(.close) {
          // SNK-15: the close glyph at the icon size, with the family and fill of an unselected icon (or the drawn cross
          // where the icon font is not there).
          TanreiChipGlyph(kind: .close)
            .tanreiIconContext(size: tokens.controlsIconSize, selected: false)
        }
        .layoutValue(key: TanreiSnackbarLayout.PartKey.self, value: .close)
      }
    }
    // SNK-10: the message is text in a container of the controls; the bar itself is not a stop. (The container is the bar
    // alone: its shadow's drawing surface, which reaches past it, is not part of its frame.)
    .accessibilityElement(children: .contain)
    // SNK-14: the container — its color, elevation and corners, eased by the corner smoothing.
    .background {
      TanreiElevationSurface(tokens.containerElevation, fill: colors[tokens.containerColor], cornerRadius: tokens.containerShape)
    }
    .onHover { onHover($0) }
    .onChange(of: focused) { _, now in onFocusInside(now != nil) }
    // SNK-11: Escape while focus is inside closes it.
    .onKeyPress(.escape) {
      guard focused != nil else { return .ignored }
      onResult(.dismissed(.escape))
      return .handled
    }
    #if os(macOS)
    .onExitCommand { if focused != nil { onResult(.dismissed(.escape)) } }
    #endif
  }

  private func control(_ kind: TanreiSnackbarControl, @ViewBuilder label: () -> some View) -> some View {
    TanreiSnackbarControlButton(
      control: kind, name: kind == .close ? content.closeLabel : content.actionLabel, isFocused: focused == kind,
      activate: { onResult(kind == .close ? .dismissed(.close) : .action) }, label: label
    )
    .focused($focused, equals: kind)
  }
}

/// SNK-14 … SNK-16 — the bar's layout, stateless so it is right on the first pass; mirrored right to left by SwiftUI
/// (SNK-18).
///
/// As wide as its content between `minWidth` and `maxWidth`, never wider than it is offered (the host less its margins).
/// One row: the start padding, the message, `gap`, the action and the close button `controlsGap` apart and centred on the
/// message's first line, then the end padding (`paddingEndWithControls` after a control). When the message would need more
/// than two lines beside the controls, or the action would not fit beside any of it, the action moves to its own row:
/// `gap` below the message's text, at the end, `paddingEndWithControls` above the bar's bottom edge, while the close button
/// stays at the end of the first row. At least `minHeight` tall; the message's first line is centred in a bar of one line.
struct TanreiSnackbarLayout: Layout {
  let paddingStart: CGFloat
  let paddingEnd: CGFloat
  let paddingEndWithControls: CGFloat
  let paddingBlock: CGFloat
  let gap: CGFloat
  let controlsGap: CGFloat
  let minWidth: CGFloat
  let maxWidth: CGFloat
  let minHeight: CGFloat
  /// The message's line, as Dynamic Type scales it.
  let lineHeight: CGFloat

  enum Part: Sendable {
    case message
    case action
    case close
  }

  struct PartKey: LayoutValueKey {
    static let defaultValue = Part.message
  }

  struct Arrangement: Equatable {
    var size: CGSize
    var frames: [CGRect]
    /// SNK-16: the action is on its own row.
    var actionOnOwnRow: Bool
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    arrange(width: proposal.width, subviews: subviews).size
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    let arrangement = arrange(width: bounds.width, subviews: subviews)
    for (subview, frame) in zip(subviews, arrangement.frames) {
      subview.place(
        at: CGPoint(x: bounds.minX + frame.minX, y: bounds.minY + frame.minY), anchor: .topLeading,
        proposal: ProposedViewSize(width: frame.width, height: frame.height))
    }
  }

  func arrange(width proposed: CGFloat?, subviews: Subviews) -> Arrangement {
    let parts = subviews.map { $0[PartKey.self] }
    let sizes = subviews.map { $0.sizeThatFits(.unspecified) }
    func index(_ part: Part) -> Int? { parts.firstIndex(of: part) }
    let message = index(.message)
    let action = index(.action)
    let close = index(.close)
    let hasControls = action != nil || close != nil
    let end = hasControls ? paddingEndWithControls : paddingEnd
    let actionWidth = action.map { sizes[$0].width } ?? .zero
    let closeWidth = close.map { sizes[$0].width } ?? .zero
    let controlsWidth = actionWidth + closeWidth + (action != nil && close != nil ? controlsGap : .zero)
    let beside = hasControls ? gap + controlsWidth : .zero
    let ideal = paddingStart + (message.map { sizes[$0].width } ?? .zero) + beside + end
    let limit = min(maxWidth, proposed.flatMap { $0.isFinite ? $0 : nil } ?? maxWidth)
    let width = max(min(ideal, limit), min(minWidth, limit))

    func messageSize(_ available: CGFloat) -> CGSize {
      message.map { subviews[$0].sizeThatFits(ProposedViewSize(width: max(.zero, available), height: nil)) } ?? .zero
    }
    // One row: does the message fit in two lines beside the controls?
    let rowAvailable = width - paddingStart - end - beside
    let rowMessage = messageSize(rowAvailable)
    let lines = lineHeight > .zero ? (rowMessage.height / lineHeight).rounded() : 1
    let ownRow = action != nil && (lines > 2 || rowAvailable <= .zero)

    var frames = Array(repeating: CGRect.zero, count: subviews.count)
    let firstLineCenter = paddingBlock + lineHeight / 2
    var bottom: CGFloat
    if ownRow, let action {
      let firstRowControls = close.map { gap + sizes[$0].width } ?? .zero
      let text = messageSize(width - paddingStart - end - firstRowControls)
      if let message { frames[message] = CGRect(x: paddingStart, y: paddingBlock, width: text.width, height: text.height) }
      if let close {
        frames[close] = CGRect(origin: CGPoint(x: width - end - sizes[close].width, y: firstLineCenter - sizes[close].height / 2), size: sizes[close])
      }
      let actionTop = paddingBlock + text.height + gap
      frames[action] = CGRect(origin: CGPoint(x: width - end - sizes[action].width, y: actionTop), size: sizes[action])
      bottom = actionTop + sizes[action].height + paddingEndWithControls
    } else {
      if let message { frames[message] = CGRect(x: paddingStart, y: paddingBlock, width: rowMessage.width, height: rowMessage.height) }
      var x = width - end
      bottom = paddingBlock + rowMessage.height + paddingBlock
      for control in [close, action].compactMap({ $0 }) {
        x -= sizes[control].width
        frames[control] = CGRect(origin: CGPoint(x: x, y: firstLineCenter - sizes[control].height / 2), size: sizes[control])
        x -= controlsGap
      }
    }
    // A control taller than the first line's box would rise above the bar: everything moves down instead.
    let top = frames.filter { $0 != .zero }.map(\.minY).min() ?? .zero
    if top < .zero {
      frames = frames.map { $0 == .zero ? $0 : $0.offsetBy(dx: .zero, dy: -top) }
      bottom -= top
    }
    bottom = max(bottom, frames.map(\.maxY).max() ?? .zero)
    let height = max(minHeight, bottom)
    // A bar the minimum height makes taller than its content keeps the content centred.
    if height > bottom {
      frames = frames.map { $0 == .zero ? $0 : $0.offsetBy(dx: .zero, dy: (height - bottom) / 2) }
    }
    return Arrangement(size: CGSize(width: width, height: height), frames: frames, actionOnOwnRow: ownRow)
  }
}

// MARK: - The controls

/// The action or the close button: a Tanrei-drawn button of the control axis, at least the minimum target (SNK-4).
private struct TanreiSnackbarControlButton<Label: View>: View {
  let control: TanreiSnackbarControl
  /// The accessible name: the action's label, or the close label.
  let name: String
  let isFocused: Bool
  let activate: @MainActor () -> Void
  @ViewBuilder let label: Label

  /// Counts activations by key: each one starts a press that no pointer held down (SNK-5).
  @State private var keyboardPresses = 0

  var body: some View {
    TanreiMinimumHitTarget {
      TanreiSnackbarControlChrome(control: control, isPressed: false, isFocused: false) { label }
    } control: {
      Button(action: activate) { label }
        .buttonStyle(TanreiSnackbarControlStyle(control: control, isFocused: isFocused, keyboardPresses: keyboardPresses))
        // Tanrei draws its own ring (SNK-3); the system focus effect would double it.
        .focusEffectDisabled()
        // SNK-1, SNK-5: Enter and Space activate, once per key press, and show the press from the center.
        .tanreiKeyActivation(isEnabled: true) {
          keyboardPresses += 1
          activate()
        }
        .accessibilityLabel(Text(verbatim: name))
    }
  }
}

private struct TanreiSnackbarControlStyle: ButtonStyle {
  let control: TanreiSnackbarControl
  let isFocused: Bool
  var keyboardPresses = 0

  func makeBody(configuration: Configuration) -> some View {
    TanreiSnackbarControlChrome(control: control, isPressed: configuration.isPressed, isFocused: isFocused, keyboardPresses: keyboardPresses) {
      configuration.label
    }
    // SNK-4: the hit area reaches the minimum target on both axes; the visual size does not change.
    .tanreiHitTargetExpansion()
  }
}

/// One control's visual: the action's label padded to `controls.height`, or the close glyph in a `controls.height`
/// square, on its container, drawn from the tokens of its one resolved state (SNK-2).
struct TanreiSnackbarControlChrome<Label: View>: View {
  let control: TanreiSnackbarControl
  let isPressed: Bool
  let isFocused: Bool
  var keyboardPresses = 0
  @ViewBuilder let label: Label

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    let feedback = theme.system.behavior.pressedFeedback
    // SNK-5: a press stays visible at least `duration.press-hold`; SNK-6: the point of contact only under `ripple`.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyboardPresses, watchesContact: feedback == .ripple) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let tokens = theme.system.snackbar
    // SNK-2: exactly one state — pressed > focused > hovered. A snackbar's controls are never disabled.
    let state = TanreiInteraction.resolve(isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let appearance = TanreiSnackbarControlAppearance(tokens: tokens, control: control, state: state, feedback: feedback, beneath: beneath)
    let ripple = appearance.ripple.map {
      TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion))
    }
    let isClose = control == .close
    return label
      .foregroundStyle(colors[appearance.content])
      .padding(.horizontal, isClose ? .zero : tokens.controlsPaddingInline)
      .frame(minWidth: tokens.controlsHeight, minHeight: tokens.controlsHeight)
      .frame(width: isClose ? tokens.controlsHeight : nil)
      // SNK-6, SNK-7: the container, ripple and opacity; corners eased by the corner smoothing.
      .modifier(
        TanreiContainerLayers(
          fill: colors[appearance.container], elevation: TanreiIdentity.elevation, cornerRadius: appearance.cornerRadius, outline: .clear,
          outlineWidth: .zero, ripple: ripple, opacity: appearance.opacity))
      .animation(tokens.stateMotion(reduceMotion: reduceMotion), value: state)
      // SNK-3: around the control, for keyboard focus only, never animated or dimmed.
      .tanreiFocusRing(isFocused, cornerRadius: appearance.cornerRadius)
      .onHover { isHovered = $0 }
  }
}

/// Which token values a control draws in one state. Pure data read from a `TanreiSnackbarTokens`. SNK-2: every state is
/// drawn from that state's tokens of that control; SNK-6: the press as `pressed-feedback` says.
struct TanreiSnackbarControlAppearance: Equatable {
  let container: TanreiPaint
  let ripple: TanreiPaint?
  let content: TanreiPaint
  let opacity: Double
  let cornerRadius: CGFloat

  init(
    tokens: TanreiSnackbarTokens, control: TanreiSnackbarControl, state: TanreiInteraction, feedback: TanreiPressedFeedback = .overlay,
    beneath: TanreiInteraction = .enabled
  ) {
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    // The control lookup is total: a control this system does not have reads the action's tokens (and is reported).
    let controlTokens = tokens.controls[control]
    // A snackbar's controls have no disabled state: it draws at rest.
    let own = controlTokens[state: layers.state] ?? controlTokens.enabled
    container = (controlTokens[state: layers.container] ?? controlTokens.enabled).containerColor
    ripple = layers.ripple.map { (controlTokens[state: $0] ?? controlTokens.enabled).containerColor }
    content = own.contentColor
    // The vocabulary has no rest-state `opacity` token: a control at rest is not dimmed.
    opacity = tokens[state: layers.state]?.opacity ?? TanreiIdentity.opacity
    cornerRadius = tokens.controlsShape
  }
}
