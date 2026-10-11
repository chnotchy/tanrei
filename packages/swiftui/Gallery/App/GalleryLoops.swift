import SwiftUI
@testable import Tanrei

// `-freezeLoops YES`: every looping animation (the indeterminate progress indicator, the loading indicator) is drawn
// at the start of its cycle instead of running. `performAccessibilityAudit()` never completes while a view redraws on
// every display frame ("Audit failed to complete in time"), so the audit of those components' rows launches the
// gallery with it. It reaches Tanrei's internal `tanreiCyclePhase` — what snapshots freeze too — through a testable
// import: the gallery is a Debug-only test host, not a product.

extension View {
  /// Freezes Tanrei's looping animations below when `frozen` is true.
  func galleryFreezingLoops(_ frozen: Bool) -> some View {
    environment(\.tanreiCyclePhase, frozen ? 0 : nil)
  }
}
