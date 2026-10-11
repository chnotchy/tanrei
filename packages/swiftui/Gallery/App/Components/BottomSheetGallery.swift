import SwiftUI
@_spi(Fixtures) import Tanrei

// specs/bottom-sheet.spec.json in the gallery: each fixture is the sheet drawn in place — for a modal sheet its scrim too —
// over a 240 × 440 stage (`TanreiBottomSheetSurface(inPlace:)`, not modal, so the gallery around it stays live), with the
// fixture's props (`variant`, `detent`, `dismissible`, `handle`, `handleLabel`, `inset`, `label`) and its content as plain
// text (the default slot). The in-place sheet keeps its own height: its handle and a drag move it, and `fire`
// counts every close it asks for and every height the person chose; it stays open, as a sheet whose product declines the
// close does (BSH-20). Below them, a modal sheet presented from a button and a standard one shown over a small page, as a
// product writes them: the UI tests open, resize, drag and close them.

extension GalleryComponent {
  static let bottomSheet = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(
        TanreiBottomSheetSurface(
          inPlace: TanreiBottomSheetVariant(named: fixture.string("variant") ?? TanreiBottomSheetVariant.modal.rawValue),
          detent: TanreiBottomSheetDetent(named: fixture.string("detent") ?? TanreiBottomSheetDetent.partial.rawValue),
          dismissible: fixture.bool("dismissible") ?? true, handle: fixture.bool("handle") ?? true,
          handleLabel: fixture.string("handleLabel") ?? "", inset: fixture.bool("inset") ?? true, label: fixture.string("label") ?? "",
          onClose: { _ in fire() }, onDetentChange: { _ in fire() }
        ) {
          if let content = fixture.content { Text(verbatim: content) }
        }
        .frame(width: GalleryBottomSheetStage.width, height: GalleryBottomSheetStage.height)
        // XCUITest reports the container's frame with the drawing surface of its shadow; room for
        // it keeps the row wholly on screen for the audit.
        .padding(.horizontal, GalleryBottomSheetStage.shadowRoom))
    },
    explore: { _ in
      [
        GalleryExploration(
          title: "Bottom sheets as a product writes them",
          examples: [
            GalleryExample(id: "presented", caption: "tap to open · a close fires") { fire in AnyView(GalleryPresentedBottomSheet(fire: fire)) },
            GalleryExample(id: "standard-page", caption: "tap Nearby to show and hide") { fire in AnyView(GalleryStandardBottomSheet(fire: fire)) },
          ])
      ]
    },
    // The sheet's handle and the product's content take focus of their own.
    managesFocus: true
  )
}

private enum GalleryBottomSheetStage {
  static let width: CGFloat = 240
  static let height: CGFloat = 440
  /// Past the default system's `level2` shadow (the container's elevation) as XCUITest measures it.
  static let shadowRoom: CGFloat = 24
}

/// A long text, so that the sheet has two heights.
private let galleryBottomSheetText = Array(
  repeating: "Pick where the photo goes: an album on this device, a shared album, or a message to someone.", count: 30
).joined(separator: " ")

/// A button that presents a modal sheet, as a product writes one; the sheet's "Done" closes it from its content. Every close
/// the sheet asks for fires. Its value says whether the sheet is open.
private struct GalleryPresentedBottomSheet: View {
  let fire: @MainActor () -> Void
  @State private var isPresented = false
  @State private var detent = TanreiBottomSheetDetent.partial

  var body: some View {
    // Opened again at the partial height, as a product chooses to.
    TanreiButton("Share photo", action: {
      detent = .partial
      isPresented = true
    })
      .accessibilityValue(isPresented ? "open" : "closed")
      .tanreiBottomSheet(
        isPresented: $isPresented, detent: $detent, handleLabel: "Resize sheet", label: "Share photo", onClose: { _ in fire() }
      ) {
        VStack(alignment: .leading, spacing: 16) {
          TanreiButton("Done", variant: .text) { isPresented = false }
          Text(verbatim: galleryBottomSheetText)
        }
      }
  }
}

/// A small page with a standard sheet over its bottom, shown and hidden by the page's own button, which stays usable while
/// the sheet is open (BSH-4). A close the sheet asks for (a drag) fires.
private struct GalleryStandardBottomSheet: View {
  let fire: @MainActor () -> Void
  @State private var isPresented = false

  var body: some View {
    VStack {
      TanreiButton("Nearby", variant: .tonal) { isPresented.toggle() }
        .accessibilityValue(isPresented ? "open" : "closed")
      Spacer()
    }
    .frame(width: GalleryBottomSheetStage.width, height: GalleryBottomSheetStage.height / 2)
    .tanreiBottomSheet(
      isPresented: $isPresented, variant: .standard, handleLabel: "Resize sheet", label: "Nearby places", onClose: { _ in fire() }
    ) {
      Text(verbatim: "Three cafés and a bakery are open within a ten-minute walk.")
    }
    .clipped()
  }
}
