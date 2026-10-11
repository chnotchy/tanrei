import SwiftUI
import Tanrei

// specs/button.spec.json in the gallery: its fixtures (props `variant`, `size`, `disabled`, content = the
// label), then every size — with an icon — and every variant the selected system has, added values included.

extension GalleryComponent {
  static let button = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(
        TanreiButton(
          fixture.content ?? "",
          variant: fixture.key("variant", default: TanreiButtonVariant.fallback),
          size: fixture.key("size", default: TanreiButtonSize.fallback),
          action: fire
        )
        .disabled(fixture.bool("disabled") ?? false)
      )
    },
    explore: { system in
      let sizes = system.button.sizes.keys.map { size in
        GalleryExample(id: "size-\(size.rawValue)", caption: "\(size.rawValue) · \(Int(system.button.sizes[size].containerHeight))pt") { fire in
          AnyView(TanreiButton("Deploy", variant: .outlined, size: size, action: fire) { Image(systemName: "arrow.up") })
        }
      }
      let variants = system.button.variants.keys.map { variant in
        GalleryExample(id: "variant-\(variant.rawValue)", caption: variant.rawValue) { fire in
          AnyView(TanreiButton("Deploy", variant: variant, action: fire))
        }
      }
      return [
        GalleryExploration(title: "Every size of \(system.id), with an icon", examples: sizes),
        GalleryExploration(title: "Every variant of \(system.id)", examples: variants),
      ]
    }
  )
}
