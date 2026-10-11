import SwiftUI

// The clock of a looping animation (the indeterminate progress indicator, PRG-2 / PRG-7 / PRG-14; the loading
// indicator, LDG-1 / LDG-4 / LDG-7): one phase in 0..<1 per cycle, read from the display's timeline, and the curves
// both components draw from it. Nothing here is a design value: the cycle's duration and every easing are tokens the
// caller passes.

/// Draws `content` at the phase of a cycle of `durationMs` — 0 at the start of a cycle, approaching 1 at its end —
/// on every display frame while it is on screen.
///
/// It does not run while it is not visible: removed from the hierarchy (`onDisappear`), scrolled out of view (iOS 18 /
/// macOS 15, `onScrollVisibilityChange`), or in an app in the background (the display's timeline does not tick there).
/// It resumes where the clock is when it is shown again.
struct TanreiCycle<Content: View>: View {
  let durationMs: Double
  let content: (_ phase: Double) -> Content

  /// A fixed phase instead of the clock: what snapshots and tests draw (`\.tanreiCyclePhase`).
  @Environment(\.tanreiCyclePhase) private var fixedPhase
  @State private var start = Date()
  @State private var visibility = TanreiCycleVisibility()

  init(durationMs: Double, @ViewBuilder content: @escaping (_ phase: Double) -> Content) {
    self.durationMs = durationMs
    self.content = content
  }

  var body: some View {
    if let fixedPhase {
      content(fixedPhase)
    } else {
      TimelineView(.animation(minimumInterval: nil, paused: !visibility.isRunning)) { timeline in
        content(TanreiCycleClock.phase(at: timeline.date, since: start, durationMs: durationMs))
      }
      .onAppear { visibility.isInHierarchy = true }
      .onDisappear { visibility.isInHierarchy = false }
      .modifier(TanreiScrollVisibility(isVisible: $visibility.isScrolledIntoView))
    }
  }
}

/// Whether a looping animation runs (PRG-14, LDG-7): only while it is in the view hierarchy and scrolled into view.
struct TanreiCycleVisibility: Equatable {
  var isInHierarchy = true
  var isScrolledIntoView = true
  var isRunning: Bool { isInHierarchy && isScrolledIntoView }
}

/// Reports whether the view is scrolled into view, where the OS can say (iOS 18 / macOS 15); earlier, always visible.
private struct TanreiScrollVisibility: ViewModifier {
  @Binding var isVisible: Bool

  func body(content: Content) -> some View {
    if #available(iOS 18, macOS 15, *) {
      // Any part on screen counts as visible.
      content.onScrollVisibilityChange(threshold: .ulpOfOne) { isVisible = $0 }
    } else {
      content
    }
  }
}

/// The phase arithmetic and the curves drawn from it, as pure functions (tests read positions at fixed times).
enum TanreiCycleClock {
  private static let millisecondsPerSecond: Double = 1000

  /// The phase, in 0..<1, `date` is at in a cycle of `durationMs` that started at `start`.
  static func phase(at date: Date, since start: Date, durationMs: Double) -> Double {
    guard durationMs > 0 else { return 0 }
    let elapsed = max(0, date.timeIntervalSince(start)) * millisecondsPerSecond
    return elapsed.truncatingRemainder(dividingBy: durationMs) / durationMs
  }

  /// `easing` at `progress` (0…1): the eased progress, as CSS `cubic-bezier()` computes it.
  static func eased(_ progress: Double, _ easing: TanreiCubicBezier) -> Double {
    let clamped = min(1, max(0, progress))
    return UnitCurve.bezier(
      startControlPoint: UnitPoint(x: easing.x1, y: easing.y1),
      endControlPoint: UnitPoint(x: easing.x2, y: easing.y2)
    ).value(at: clamped)
  }

  /// PRG-7, LDG-4: the reduced-motion pulse — the opacity eases from 1 to 0 over the first half of a cycle and back to
  /// 1 over the second, with `easing`. 1 at the start of a cycle.
  static func pulseOpacity(phase: Double, easing: TanreiCubicBezier) -> Double {
    let half = 0.5
    let p = phase - phase.rounded(.down)
    return p < half ? 1 - eased(p / half, easing) : eased((p - half) / half, easing)
  }
}

private struct TanreiCyclePhaseKey: EnvironmentKey {
  static let defaultValue: Double? = nil
}

extension EnvironmentValues {
  /// Freezes every `TanreiCycle` below at this phase (0..<1). `nil` (the default) runs the clock. For snapshots and
  /// tests: a baseline is drawn at the start of a cycle.
  var tanreiCyclePhase: Double? {
    get { self[TanreiCyclePhaseKey.self] }
    set { self[TanreiCyclePhaseKey.self] = newValue }
  }
}
