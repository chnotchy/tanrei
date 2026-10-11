import SwiftUI
import Tanrei

// specs/carousel.spec.json in the gallery: each fixture is one carousel (the harness note's stage is 400 wide; the gallery's
// is narrower, beside its caption), holding the fixture's items in order — the carousel's props (`layout`,
// `itemWidth`, `label`) and each item's `label`. An item's content is its glyph, drawn in the middle of the content box at
// `sys.icon.large`, unselected (the item kind's slot note): the icon font's glyph where the device has the font, else the
// SF Symbol a product would pass for it. `fire` counts the items' clicks together (CRL-1).

extension GalleryComponent {
  static let carousel = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(GalleryCarousel(fixture: fixture, fire: fire))
    },
    // The carousel moves keyboard focus between its items itself (CRL-17).
    managesFocus: true
  )
}

private struct GalleryCarousel: View {
  let fixture: GalleryFixture
  let fire: @MainActor () -> Void

  var body: some View {
    TanreiCarousel(
      fixture.string("label") ?? "", layout: TanreiCarouselLayout(named: fixture.string("layout") ?? TanreiCarouselLayout.multiBrowse.rawValue),
      itemWidth: fixture.number("itemWidth").map { CGFloat($0) }
    ) {
      ForEach(Array(fixture.items.enumerated()), id: \.offset) { _, item in
        TanreiCarouselItem(item.string("label") ?? "", action: fire) {
          GalleryCarouselGlyph(glyph: item.content ?? "")
        }
      }
    }
    .frame(width: GalleryCarouselWidth.value)
  }
}

/// A fixture item's content: its glyph at `sys.icon.large`, in the item's content color.
private struct GalleryCarouselGlyph: View {
  let glyph: String
  @Environment(\.tanreiSystem) private var system

  var body: some View {
    GalleryIcon(glyph: glyph)
      .font(.system(size: system.measure.iconLarge))
      .frame(width: system.measure.iconLarge, height: system.measure.iconLarge)
  }
}

private enum GalleryCarouselWidth {
  static let value: CGFloat = 260
}
