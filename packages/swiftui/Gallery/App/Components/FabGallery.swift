import SwiftUI
import Tanrei

// specs/fab.spec.json in the gallery: its fixtures (props `variant`, `size`, `disabled`, `label`; content = the icon's
// glyph name), then every size and every variant the selected system has, added values included. `fire` counts clicks.

extension GalleryComponent {
  static let fab = GalleryComponent(
    fixture: { fixture, fire in
      let variant = fixture.key("variant", default: TanreiFabVariant.fallback)
      let size = fixture.key("size", default: TanreiFabSize.fallback)
      return AnyView(
        TanreiFloatingActionButton(fixture.string("label") ?? "", variant: variant, size: size, action: fire) {
          GalleryIcon(glyph: fixture.content ?? "")
        }
        .disabled(fixture.bool("disabled") ?? false)
      )
    },
    explore: { system in
      let tokens = system.fab
      let sizes = tokens.sizes.keys.map { size in
        GalleryExample(id: "size-\(size.rawValue)", caption: "\(size.rawValue) · \(Int(tokens.sizes[size].containerSize))pt") { fire in
          AnyView(TanreiFloatingActionButton("Create", size: size, action: fire) { GalleryIcon(glyph: "add") })
        }
      }
      let variants = tokens.variants.keys.map { variant in
        GalleryExample(id: "variant-\(variant.rawValue)", caption: variant.rawValue) { fire in
          AnyView(TanreiFloatingActionButton("Create", variant: variant, action: fire) { GalleryIcon(glyph: "add") })
        }
      }
      return [
        GalleryExploration(title: "Every FAB size of \(system.id)", examples: sizes),
        GalleryExploration(title: "Every FAB variant of \(system.id)", examples: variants),
      ]
    }
  )
}
