import SwiftUI
import Tanrei

// specs/chip.spec.json in the gallery: its fixtures (props `kind`, `variant`, `size`, `selected`, `disabled`, `label`,
// `removeLabel`; content = the icon's glyph name, or `avatar` for an input chip's avatar), then every size and variant
// the selected system has. `fire` counts the chip's own clicks; a filter chip also flips (CHP-11), which the UI tests
// read from the selected trait; an input chip's remove action counts on its own row (`removed.<key>`), since it never
// clicks the chip (CHP-18).

extension GalleryComponent {
  static let chip = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(
        GalleryChip(
          kind: fixture.string("kind") ?? "action",
          label: fixture.string("label") ?? "",
          removeLabel: fixture.string("removeLabel") ?? "",
          content: fixture.content,
          variant: fixture.key("variant", default: TanreiChipVariant.fallback),
          size: fixture.key("size", default: TanreiChipSize.fallback),
          initiallySelected: fixture.bool("selected") ?? false,
          removedId: "removed.chip.\(fixture.id)",
          fire: fire
        )
        .disabled(fixture.bool("disabled") ?? false)
      )
    },
    explore: { system in
      let tokens = system.chip
      let sizes = tokens.sizes.keys.map { size in
        GalleryExample(id: "size-\(size.rawValue)", caption: "\(size.rawValue) · \(Int(tokens.sizes[size].containerHeight))pt") { fire in
          AnyView(TanreiChip("Add to calendar", size: size, action: fire) { GalleryIcon(glyph: "event") })
        }
      }
      let variants = tokens.variants.keys.map { variant in
        GalleryExample(id: "variant-\(variant.rawValue)", caption: "\(variant.rawValue) · filter") { fire in
          AnyView(
            GalleryChip(
              kind: "filter", label: "Vegetarian", removeLabel: "", content: nil, variant: variant, size: .medium, initiallySelected: false,
              removedId: "removed.chip.variant-\(variant.rawValue)", fire: fire))
        }
      }
      return [
        GalleryExploration(title: "Every chip size of \(system.id)", examples: sizes),
        GalleryExploration(title: "Every chip variant of \(system.id), as a filter", examples: variants),
      ]
    }
  )
}

/// One chip fixture: owns a filter chip's selection, and counts an input chip's removals, as an app would.
private struct GalleryChip: View {
  let kind: String
  let label: String
  let removeLabel: String
  let content: String?
  let variant: TanreiChipVariant
  let size: TanreiChipSize
  let removedId: String
  let fire: @MainActor () -> Void
  @State private var isSelected: Bool
  @State private var removed = 0

  init(
    kind: String, label: String, removeLabel: String, content: String?, variant: TanreiChipVariant, size: TanreiChipSize,
    initiallySelected: Bool, removedId: String, fire: @escaping @MainActor () -> Void
  ) {
    self.kind = kind
    self.label = label
    self.removeLabel = removeLabel
    self.content = content
    self.variant = variant
    self.size = size
    self.removedId = removedId
    self.fire = fire
    _isSelected = State(initialValue: initiallySelected)
  }

  var body: some View {
    switch kind {
    case "filter":
      if let content {
        TanreiChip(label, isSelected: $isSelected, variant: variant, size: size, action: fire) { GalleryIcon(glyph: content, selected: isSelected) }
      } else {
        TanreiChip(label, isSelected: $isSelected, variant: variant, size: size, action: fire)
      }
    case "input":
      HStack {
        Group {
          if content == "avatar" {
            TanreiChip(label, removeLabel: removeLabel, variant: variant, size: size, action: fire, avatar: { GalleryAvatar() }, onRemove: { removed += 1 })
          } else if let content {
            TanreiChip(label, removeLabel: removeLabel, variant: variant, size: size, action: fire, onRemove: { removed += 1 }) { GalleryIcon(glyph: content) }
          } else {
            TanreiChip(label, removeLabel: removeLabel, variant: variant, size: size, action: fire, onRemove: { removed += 1 })
          }
        }
        Text("removed \(removed)").accessibilityIdentifier(removedId)
      }
      // The row's identifier names this container; the chip and its remove action stay two buttons inside it (CHP-18).
      .accessibilityElement(children: .contain)
    default:
      if let content {
        TanreiChip(label, variant: variant, size: size, action: fire) { GalleryIcon(glyph: content) }
      } else {
        TanreiChip(label, variant: variant, size: size, action: fire)
      }
    }
  }
}

/// The fixtures' `avatar`: one neutral grey disc, the same stand-in as the snapshot tests'.
private struct GalleryAvatar: View {
  var body: some View {
    Color(red: 0x9E / 255.0, green: 0x9E / 255.0, blue: 0x9E / 255.0)
  }
}
