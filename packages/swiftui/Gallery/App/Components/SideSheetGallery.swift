import SwiftUI
@_spi(Fixtures) import Tanrei

// specs/side-sheet.spec.json in the gallery: each fixture is the sheet drawn in place — a standard sheet at the trailing end
// of a row whose other part is empty, a modal sheet over its scrim — in a 340 × 440 stage (`TanreiSideSheetSurface(inPlace:)`,
// not modal, so the gallery around it stays live), with the fixture's props (`variant`, `headline`, `closable`,
// `closeLabel`), its content as plain text and its `actions` slot as text Buttons. A close the sheet asks for (its
// close button, a modal sheet's scrim or a drag) and an action's press fire; the sheet stays open, as one whose product
// declines the close does. Below them, a modal sheet presented from a button and a standard one beside a small page, as a
// product writes them: the UI tests open, drag and close them.

extension GalleryComponent {
  static let sideSheet = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(
        TanreiSideSheetSurface(
          inPlace: fixture.string("headline") ?? "",
          variant: fixture.key("variant", default: TanreiSideSheetVariant.fallback),
          closable: fixture.bool("closable") ?? false, closeLabel: fixture.string("closeLabel") ?? "", onClose: { _ in fire() }
        ) {
          if let content = fixture.content { Text(verbatim: content) }
        } actions: {
          ForEach(fixture.slot("actions"), id: \.self) { TanreiButton($0, variant: .text, action: fire) }
        }
        .frame(width: GallerySideSheetStage.width, height: GallerySideSheetStage.height)
        // XCUITest reports the container's frame with the drawing surface of its shadow; room for
        // it keeps the row wholly on screen for the audit.
        .padding(.horizontal, GallerySideSheetStage.shadowRoom))
    },
    explore: { _ in
      [
        GalleryExploration(
          title: "Side sheets as a product writes them",
          examples: [
            GalleryExample(id: "presented", caption: "tap to open · a close fires") { fire in AnyView(GalleryPresentedSideSheet(fire: fire)) },
            GalleryExample(id: "standard-page", caption: "tap Filters to show and hide") { fire in AnyView(GalleryStandardSideSheet(fire: fire)) },
          ])
      ]
    },
    // The sheet's close button, its actions and the product's content take focus of their own.
    managesFocus: true
  )
}

private enum GallerySideSheetStage {
  static let width: CGFloat = 340
  static let height: CGFloat = 440
  /// Past the default system's `level2` shadow (the modal container's elevation) as XCUITest measures it.
  static let shadowRoom: CGFloat = 24
}

private let gallerySideSheetText = "Show results from the last 30 days with every selected label."

/// A button that presents a modal sheet, as a product writes one; the sheet's "Apply" closes it from its actions. Every close
/// the sheet asks for fires. Its value says whether the sheet is open.
private struct GalleryPresentedSideSheet: View {
  let fire: @MainActor () -> Void
  @State private var isPresented = false

  var body: some View {
    TanreiButton("Filter results", action: { isPresented = true })
      .accessibilityValue(isPresented ? "open" : "closed")
      .tanreiSideSheet("Sort and filter", isPresented: $isPresented, closable: true, closeLabel: "Close sort and filter", onClose: { _ in fire() }) {
        Text(verbatim: gallerySideSheetText)
      } actions: {
        TanreiButton("Apply", variant: .text) { isPresented = false }
      }
  }
}

/// A small page with a standard sheet at its trailing end, shown and hidden by the page's own button, which stays usable
/// while the sheet is open (SSH-1). A close the sheet asks for (its close button) fires.
private struct GalleryStandardSideSheet: View {
  let fire: @MainActor () -> Void
  @State private var isPresented = false

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      TanreiButton("Filters", variant: .tonal) { isPresented.toggle() }
        .accessibilityValue(isPresented ? "open" : "closed")
      HStack(spacing: 0) {
        Text(verbatim: "Results")
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        TanreiSideSheet("Refine results", isPresented: $isPresented, closable: true, closeLabel: "Close refine results", onClose: { _ in fire() }) {
          Text(verbatim: gallerySideSheetText)
        }
      }
      .frame(width: GallerySideSheetStage.width, height: GallerySideSheetStage.height / 2)
      .clipped()
    }
  }
}
