import SwiftUI
import Tanrei

// specs/icon-button.spec.json in the gallery: its fixtures (props `variant`, `size`, `toggle`, `selected`, `disabled`,
// `label`; content = the icon's glyph name), then every size and every variant the selected system has, added values
// included, as an action and as a toggle. `fire` counts clicks; a toggle also flips (ICB-11), which the UI tests read
// from the selected trait.

extension GalleryComponent {
  static let iconButton = GalleryComponent(
    fixture: { fixture, fire in
      let variant = fixture.key("variant", default: TanreiIconButtonVariant.fallback)
      let size = fixture.key("size", default: TanreiIconButtonSize.fallback)
      let label = fixture.string("label") ?? ""
      let glyph = fixture.content ?? ""
      return AnyView(
        Group {
          if fixture.bool("toggle") ?? false {
            GalleryIconToggle(label: label, glyph: glyph, variant: variant, size: size, initiallySelected: fixture.bool("selected") ?? false, fire: fire)
          } else {
            TanreiIconButton(label, variant: variant, size: size, action: fire) { GalleryIcon(glyph: glyph, selected: false) }
          }
        }
        .disabled(fixture.bool("disabled") ?? false)
      )
    },
    explore: { system in
      let tokens = system.iconButton
      let sizes = tokens.sizes.keys.map { size in
        GalleryExample(id: "size-\(size.rawValue)", caption: "\(size.rawValue) · \(Int(tokens.sizes[size].containerSize))pt") { fire in
          AnyView(TanreiIconButton("Favorite", variant: .filled, size: size, action: fire) { GalleryIcon(glyph: "favorite", selected: false) })
        }
      }
      let variants = tokens.variants.keys.map { variant in
        GalleryExample(id: "variant-\(variant.rawValue)", caption: "\(variant.rawValue) · toggle") { fire in
          AnyView(GalleryIconToggle(label: "Favorite", glyph: "favorite", variant: variant, size: .medium, initiallySelected: false, fire: fire))
        }
      }
      return [
        GalleryExploration(title: "Every icon button size of \(system.id)", examples: sizes),
        GalleryExploration(title: "Every icon button variant of \(system.id), as a toggle", examples: variants),
      ]
    }
  )
}

/// A toggle fixture: owns its selection, as an app does.
private struct GalleryIconToggle: View {
  let label: String
  let glyph: String
  let variant: TanreiIconButtonVariant
  let size: TanreiIconButtonSize
  let fire: @MainActor () -> Void
  @State private var isSelected: Bool

  init(label: String, glyph: String, variant: TanreiIconButtonVariant, size: TanreiIconButtonSize, initiallySelected: Bool, fire: @escaping @MainActor () -> Void) {
    self.label = label
    self.glyph = glyph
    self.variant = variant
    self.size = size
    self.fire = fire
    _isSelected = State(initialValue: initiallySelected)
  }

  var body: some View {
    TanreiIconButton(label, isSelected: $isSelected, variant: variant, size: size, action: fire) {
      GalleryIcon(glyph: glyph, selected: isSelected)
    }
  }
}
