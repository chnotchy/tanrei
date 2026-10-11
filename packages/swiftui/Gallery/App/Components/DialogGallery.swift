import SwiftUI
@_spi(Fixtures) import Tanrei

// specs/dialog.spec.json in the gallery: each fixture is the dialog's surface — scrim and container — drawn in place in the
// row (`TanreiDialogSurface(inPlace:)`), with the fixture's props (`headline`, `supportingText`, `alert`, `dismissible`), its
// slots filled with their fixture kinds (the icon a glyph, the actions text-variant Tanrei Buttons) and its content as
// plain text; `fire` counts its actions and a press on its scrim. Below them, a dialog presented from a button, as a
// product opens one: the UI tests open it, dismiss it on its scrim, open it again and answer it ("Delete it" fires).

extension GalleryComponent {
  static let dialog = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(
        TanreiDialogSurface(
          inPlace: fixture.string("headline") ?? "", supportingText: fixture.string("supportingText") ?? "", alert: fixture.bool("alert") ?? false,
          dismissible: fixture.bool("dismissible") ?? true, onDismiss: fire
        ) {
          if let glyph = fixture.slot("icon").first { GalleryIcon(glyph: glyph) }
        } actions: {
          ForEach(fixture.slot("actions"), id: \.self) { TanreiButton($0, variant: .text, action: fire) }
        } content: {
          if let content = fixture.content { Text(verbatim: content) }
        }
        .frame(width: GalleryDialogStage.width, height: GalleryDialogStage.height)
        // XCUITest reports the container's frame with the drawing surface of its shadow; room for
        // it keeps the row wholly on screen for the audit.
        .padding(.horizontal, GalleryDialogStage.shadowRoom))
    },
    explore: { _ in
      [
        GalleryExploration(
          title: "A dialog presented from a button",
          examples: [GalleryExample(id: "presented", caption: "tap to open · Delete fires") { fire in AnyView(GalleryPresentedDialog(fire: fire)) }])
      ]
    },
    managesFocus: true
  )
}

private enum GalleryDialogStage {
  static let width: CGFloat = 240
  static let height: CGFloat = 360
  /// Past the default system's `level3` shadow (the container's elevation) as XCUITest measures it.
  static let shadowRoom: CGFloat = 24
}

/// A button that presents a dialog, as a product writes one; "Delete" fires and closes it, "Cancel" closes it. Its value
/// says whether the dialog is open.
private struct GalleryPresentedDialog: View {
  let fire: @MainActor () -> Void
  @State private var isPresented = false

  var body: some View {
    TanreiButton("Delete project", action: { isPresented = true })
      .accessibilityValue(isPresented ? "open" : "closed")
      .tanreiDialog(
        "Delete this project?", isPresented: $isPresented, supportingText: "Everything in it will be deleted. This cannot be undone.",
        icon: { GalleryIcon(glyph: "delete") }
      ) {
        TanreiButton("Cancel", variant: .text) { isPresented = false }
        TanreiButton("Delete it", variant: .text) {
          fire()
          isPresented = false
        }
      }
  }
}
