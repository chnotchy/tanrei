import SwiftUI
import Tanrei

// specs/button-group.spec.json in the gallery: each fixture is one group at its natural width (BGR-1's verify), holding
// the fixture's items in order — the group's props (`variant`, `label`) and each item's: a Button (`variant`,
// `size`, `disabled`; content = its label) or an icon button (`variant`, `size`, `toggle`, `selected`, `disabled`, `label`;
// content = its glyph). A toggle owns its state, as an app does. `fire` counts every item's click (BGR-5: each item emits
// its own). Glyphs are the icon font's where the device has it, else the SF Symbol a product would pass (App/GalleryIcon.swift).
// The group takes no focus of its own (BGR-5): its items keep theirs, so the row does not bind the gallery's `-focus`.

extension GalleryComponent {
  static let buttonGroup = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(
        TanreiButtonGroup(variant: TanreiButtonGroupVariant(named: fixture.string("variant") ?? "standard"), label: fixture.string("label") ?? "") {
          ForEach(Array(fixture.items.enumerated()), id: \.offset) { _, item in
            GalleryButtonGroupItem(item: item, fire: fire)
          }
        }
        .fixedSize(horizontal: true, vertical: false)
      )
    },
    managesFocus: true
  )
}

/// One item of a group: a Tanrei Button or icon button, as a product writes it.
private struct GalleryButtonGroupItem: View {
  let item: GalleryItem
  let fire: @MainActor () -> Void
  @State private var isSelected: Bool

  init(item: GalleryItem, fire: @escaping @MainActor () -> Void) {
    self.item = item
    self.fire = fire
    _isSelected = State(initialValue: item.bool("selected") ?? false)
  }

  var body: some View {
    if item.kind == "icon-button" {
      let variant = item.key("variant", default: TanreiIconButtonVariant.fallback)
      let size = item.key("size", default: TanreiIconButtonSize.fallback)
      let label = item.string("label") ?? ""
      let glyph = item.content ?? ""
      if item.bool("toggle") ?? false {
        TanreiIconButton(label, isSelected: $isSelected, variant: variant, size: size, action: fire) {
          GalleryIcon(glyph: glyph, selected: isSelected)
        }
        .disabled(item.bool("disabled") ?? false)
      } else {
        TanreiIconButton(label, variant: variant, size: size, action: fire) { GalleryIcon(glyph: glyph, selected: false) }
          .disabled(item.bool("disabled") ?? false)
      }
    } else {
      TanreiButton(
        item.content ?? "", variant: item.key("variant", default: TanreiButtonVariant.fallback),
        size: item.key("size", default: TanreiButtonSize.fallback), action: fire
      )
      .disabled(item.bool("disabled") ?? false)
    }
  }
}
