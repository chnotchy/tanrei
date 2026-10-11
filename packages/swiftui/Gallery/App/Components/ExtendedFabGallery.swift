import SwiftUI
import Tanrei

// specs/extended-fab.spec.json in the gallery: its fixtures (props `variant`, `size`, `expanded`, `disabled`, `label`;
// content = the icon's glyph name, none for `filled-no-icon`), then every size and every variant the selected system
// has, and one that collapses and expands on each tap (EFB-14). `fire` counts clicks.

extension GalleryComponent {
  static let extendedFab = GalleryComponent(
    fixture: { fixture, fire in
      let variant = fixture.key("variant", default: TanreiExtendedFabVariant.fallback)
      let size = fixture.key("size", default: TanreiExtendedFabSize.fallback)
      let label = fixture.string("label") ?? ""
      let expanded = fixture.bool("expanded") ?? true
      return AnyView(
        Group {
          if let glyph = fixture.content {
            TanreiExtendedFloatingActionButton(label, variant: variant, size: size, isExpanded: expanded, action: fire) { GalleryIcon(glyph: glyph) }
          } else {
            TanreiExtendedFloatingActionButton(label, variant: variant, size: size, isExpanded: expanded, action: fire)
          }
        }
        .disabled(fixture.bool("disabled") ?? false)
      )
    },
    explore: { system in
      let tokens = system.extendedFab
      let sizes = tokens.sizes.keys.map { size in
        GalleryExample(id: "size-\(size.rawValue)", caption: "\(size.rawValue) · \(Int(tokens.sizes[size].containerHeight))pt") { fire in
          AnyView(TanreiExtendedFloatingActionButton("Compose", size: size, action: fire) { GalleryIcon(glyph: "edit") })
        }
      }
      let variants = tokens.variants.keys.map { variant in
        GalleryExample(id: "variant-\(variant.rawValue)", caption: variant.rawValue) { fire in
          AnyView(TanreiExtendedFloatingActionButton("Compose", variant: variant, action: fire) { GalleryIcon(glyph: "edit") })
        }
      }
      let toggle = GalleryExample(id: "collapse", caption: "tap to collapse / expand") { fire in
        AnyView(GalleryCollapsingFab(fire: fire))
      }
      return [
        GalleryExploration(title: "Every extended FAB size of \(system.id)", examples: sizes),
        GalleryExploration(title: "Every extended FAB variant of \(system.id)", examples: variants),
        GalleryExploration(title: "Collapsing (EFB-14)", examples: [toggle]),
      ]
    }
  )
}

/// An extended FAB that collapses and expands on each tap, as a screen would while its content scrolls.
private struct GalleryCollapsingFab: View {
  let fire: @MainActor () -> Void
  @State private var isExpanded = true

  var body: some View {
    TanreiExtendedFloatingActionButton("Compose", isExpanded: isExpanded, action: {
      isExpanded.toggle()
      fire()
    }) { GalleryIcon(glyph: "edit") }
  }
}
