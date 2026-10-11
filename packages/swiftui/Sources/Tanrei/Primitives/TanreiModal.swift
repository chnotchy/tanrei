import Observation
import SwiftUI

// What a Tanrei modal overlay tells the rest of the app while it is open: a snackbar host pauses its timeout
// and holds back the next snackbar while a Tanrei modal dialog covers it (SNK-9, SNK-12). No design value lives here.

/// How many Tanrei modal overlays are open right now. A dialog counts itself in while it is presented and out when it
/// closes; a snackbar host watches the count. One count for the app: a modal dialog makes everything else inert, so it
/// covers every host.
@MainActor
@Observable
final class TanreiModalCoordinator {
  static let shared = TanreiModalCoordinator()

  private(set) var openModals = 0

  /// Whether a Tanrei modal overlay covers the app.
  var isCovered: Bool { openModals > 0 }

  func opened() { openModals += 1 }

  func closed() { openModals = max(.zero, openModals - 1) }
}
