import SwiftUI
import Tanrei

// specs/snackbar.spec.json in the gallery: each fixture is the snackbar drawn in place (SNK-19) — `message`, `action`,
// `closable`, `closeLabel`, `duration` — in the row's width; `fire` counts its action and its close button. Below them, a
// host as a product attaches one: a button asks it to show a snackbar with an action, and `fire` counts the action.

extension GalleryComponent {
  static let snackbar = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(
        TanreiSnackbar(
          message: fixture.string("message") ?? "", actionLabel: fixture.string("action") ?? "", withCloseButton: fixture.bool("closable") ?? false,
          closeLabel: fixture.string("closeLabel") ?? "", duration: TanreiSnackbarDuration(named: fixture.string("duration") ?? "auto"),
          onResult: { _ in fire() }
        )
        .frame(width: GallerySnackbarWidth.value)
        // XCUITest reports an element's frame with the drawing surface of its shadow, which reaches past the bar; room for
        // it keeps the row wholly on screen for the audit.
        .padding(.horizontal, GallerySnackbarWidth.shadowRoom))
    },
    explore: { _ in
      [
        GalleryExploration(
          title: "A snackbar shown by its host",
          examples: [GalleryExample(id: "hosted", caption: "tap Archive · Undo fires") { fire in AnyView(GalleryHostedSnackbar(fire: fire)) }])
      ]
    },
    managesFocus: true
  )
}

private enum GallerySnackbarWidth {
  static let value: CGFloat = 240
  /// Past the default system's `level3` shadow (the bar's elevation) as XCUITest measures it.
  static let shadowRoom: CGFloat = 24
}

/// A button that asks a host to show a snackbar, as a product does; its action fires.
private struct GalleryHostedSnackbar: View {
  let fire: @MainActor () -> Void
  @State private var host = TanreiSnackbarHost()

  var body: some View {
    VStack {
      TanreiButton("Archive") {
        Task { @MainActor in
          if await host.show(message: "Conversation archived", actionLabel: "Undo") == .action { fire() }
        }
      }
      Spacer()
    }
    .frame(width: GallerySnackbarWidth.value, height: 160)
    .tanreiSnackbarHost(host)
  }
}
