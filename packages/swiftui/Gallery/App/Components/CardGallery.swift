import SwiftUI
import Tanrei

// specs/card.spec.json in the gallery: its fixtures (props `variant`, `inset`, `interactive`, `disabled`, `label`;
// content = the card's text), at a phone column's width so the text wraps as a product's would. An interactive fixture
// fires from its action (CRD-1); the others never fire. Then every variant the selected system has, interactive.

extension GalleryComponent {
  static let card = GalleryComponent(
    fixture: { fixture, fire in
      let variant = fixture.key("variant", default: TanreiCardVariant.fallback)
      let inset = fixture.bool("inset") ?? true
      let label = fixture.string("label").map { Text($0) }
      let text = Text(fixture.content ?? "").frame(maxWidth: .infinity, alignment: .leading)
      return AnyView(
        Group {
          if fixture.bool("interactive") ?? false {
            TanreiCard(variant: variant, inset: inset, label: label, action: fire) { text }
          } else {
            TanreiCard(variant: variant, inset: inset, label: label) { text }
          }
        }
        .disabled(fixture.bool("disabled") ?? false)
        .frame(width: GalleryCardWidth.value)
      )
    },
    explore: { system in
      let variants = system.card.variants.keys.map { variant in
        GalleryExample(id: "variant-\(variant.rawValue)", caption: "\(variant.rawValue) · interactive") { fire in
          AnyView(
            TanreiCard(variant: variant, label: Text("Quarterly report"), action: fire) {
              Text("Quarterly report").frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(width: GalleryCardWidth.value))
        }
      }
      return [GalleryExploration(title: "Every card variant of \(system.id)", examples: variants)]
    }
  )
}

/// A card's width in the gallery: a phone column, leaving room for the row's caption.
private enum GalleryCardWidth {
  static let value: CGFloat = 240
}
