import SwiftUI

// What Tanrei's sheets share (the bottom sheet, BSH-2, BSH-5 and BSH-9; the side sheet, SSH-2, SSH-4 and SSH-5): why a sheet
// asks to be closed, what closing through the binding does, the drag thresholds SwiftUI does not name, how a modal sheet is
// presented (`TanreiSheetCover`), and how it hears Escape and the escape gesture (`TanreiSheetEscape`). No design value
// lives here: the thresholds are gesture constants the specs fix for a platform that names none (BSH-9), not tokens.

/// Why a Tanrei sheet asks to be closed — the reason its `onClose` receives (the spec's `close` event).
public enum TanreiSheetCloseReason: String, CaseIterable, Sendable {
  /// The sheet's own close button (a side sheet's; a bottom sheet has none).
  case close
  /// A press on a modal sheet's scrim.
  case scrim
  /// Escape on a hardware keyboard, on a modal sheet.
  case escape
  /// The platform's back: on iOS the accessibility escape gesture (the two-finger scrub), on a modal sheet.
  case back
  /// A released drag that asked the sheet to close.
  case drag
}

/// The sheets' rules, pure, so they are tested without a render.
enum TanreiSheetRules {
  /// BSH-5 (SSH-4): a request to close. While `dismissible`, and only while the sheet is presented, it writes `false` to
  /// `isPresented` and then calls `onClose` with the reason — once; otherwise it does nothing. Returns whether it closed.
  @MainActor
  @discardableResult
  static func close(
    _ isPresented: Binding<Bool>, dismissible: Bool, reason: TanreiSheetCloseReason, onClose: (@MainActor (TanreiSheetCloseReason) -> Void)?
  ) -> Bool {
    guard dismissible, isPresented.wrappedValue else { return false }
    isPresented.wrappedValue = false
    onClose?(reason)
    return true
  }
}

/// BSH-9 — the drag thresholds for a platform that names none (SwiftUI names neither a touch slop nor a fling velocity): a
/// sheet follows a drag only beyond 8 points, and a release faster than 0.5 points per millisecond is a fling.
enum TanreiSheetDrag {
  static let touchSlop: CGFloat = 8
  /// Points per millisecond.
  static let flingVelocity: CGFloat = 0.5
  /// Points per second in a point per millisecond: a unit, not a design value.
  static let millisecondsPerSecond: CGFloat = 1000

  /// Whether a release at `velocity` (points per second, either sign) is a fling: faster than the fling velocity.
  static func isFling(_ velocity: CGFloat) -> Bool {
    abs(velocity) / millisecondsPerSecond > flingVelocity
  }
}

// MARK: - Presentation

/// How a modal Tanrei sheet is presented (BSH-2, SSH-2), as `tanreiDialog` is: on iOS in a `.fullScreenCover` on
/// a clear background with the system's transition off — the sheet draws its own scrim and motion —, which makes the rest of
/// the app inert to touch, VoiceOver and the keyboard; on macOS, which has no full-screen cover, over the view the modifier
/// is attached to, which is disabled, hidden from VoiceOver and out of hit testing meanwhile (nothing in it can be pressed
/// or take keyboard focus, which keeps focus in the sheet). The cover is taken away once the sheet has had `exitDuration`
/// milliseconds to leave, unless it was presented again meanwhile. `sheet` is told whether the sheet was presented with the
/// view (mounted open), when it appears in place rather than moving in.
struct TanreiSheetCover<Sheet: View>: ViewModifier {
  let isPresented: Binding<Bool>
  /// The sheet's exit motion, in milliseconds.
  let exitDuration: Double
  @ViewBuilder let sheet: (_ mountedOpen: Bool) -> Sheet

  /// Whether the sheet is presented at all (it stays while it leaves).
  @State private var isCovering = false
  /// The sheet was presented with the view (mounted open).
  @State private var coversInPlace = false

  func body(content: Content) -> some View {
    content
      #if os(iOS)
      .fullScreenCover(isPresented: coverBinding) { sheet(coversInPlace).presentationBackground(.clear) }
      #else
      .disabled(isCovering)
      .allowsHitTesting(!isCovering)
      .accessibilityHidden(isCovering)
      .overlay { if isCovering { sheet(coversInPlace) } }
      #endif
      .onChange(of: isPresented.wrappedValue, initial: true) { old, open in
        // The first call (`initial`) has nothing to compare: the view appeared with the sheet open.
        open ? cover(inPlace: old == open) : uncover()
      }
  }

  /// The cover's own binding: SwiftUI writes `false` to it only when it dismisses the cover itself.
  private var coverBinding: Binding<Bool> {
    Binding(get: { isCovering }, set: { value in if !value { isCovering = false } })
  }

  private func cover(inPlace: Bool) {
    guard !isCovering else { return }
    coversInPlace = inPlace
    // The system's transition is off: the motion is the sheet's.
    var transaction = Transaction()
    transaction.disablesAnimations = true
    withTransaction(transaction) { isCovering = true }
  }

  private func uncover() {
    guard isCovering else { return }
    let exit = exitDuration
    Task { @MainActor in
      try? await Task.sleep(for: .milliseconds(Int(exit)))
      guard !isPresented.wrappedValue else { return }
      var transaction = Transaction()
      transaction.disablesAnimations = true
      withTransaction(transaction) { isCovering = false }
    }
  }
}

/// BSH-5, SSH-4: a modal sheet asks to close on Escape (with focus in it) and on the accessibility escape gesture — the
/// platform's back on iOS; a standard sheet ignores both (BSH-4, SSH-1). A dialog or menu presented above it has the keys
/// first, so Escape closes only the topmost overlay (SSH-15).
struct TanreiSheetEscape: ViewModifier {
  let isModal: Bool
  let close: @MainActor (TanreiSheetCloseReason) -> Bool

  func body(content: Content) -> some View {
    if isModal {
      content
        .onKeyPress(.escape) {
          _ = close(.escape)
          return .handled
        }
        #if os(macOS)
        .onExitCommand { _ = close(.escape) }
        #endif
        .accessibilityAction(.escape) { _ = close(.back) }
    } else {
      content
    }
  }
}

/// A tooltip inside a modal sheet is drawn above it (TIP-13): the presented window has no layer of its own.
struct TanreiSheetTooltipLayer: ViewModifier {
  let isModal: Bool

  func body(content: Content) -> some View {
    if isModal { content.tanreiTooltipLayer() } else { content }
  }
}
