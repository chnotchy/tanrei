import SwiftUI
@_spi(Fixtures) import Tanrei

// specs/toolbar.spec.json in the gallery: each fixture is one toolbar with the fixture's props (`variant`, `orientation`,
// `label`) holding the fixture's items in order: an `action` is a TanreiIconButton (`label`, `variant`,
// `toggle`, `selected`, `disabled`; content = its glyph), a `button` a TanreiButton (`variant`, `disabled`; content = its
// label). A toggle owns its state, as an app does. `fire` counts every item's click (TBR-9: each item emits its own). A
// docked toolbar is `GalleryToolbarWidth` wide (a row of the gallery would otherwise squeeze it until its items scroll,
// TBR-8); a floating one is as long as its items. Glyphs are the icon font's where the device has it,
// else the SF Symbol a product would pass (App/GalleryIcon.swift). The accessibility audit enlarges the text until a docked
// fixture's Button no longer fits and its row scrolls (TBR-8, TBR-14): the stage does not report that
// (`tanreiToolbarReportsOverflow(false)`), or the debug build would stop. Below the fixtures, one toolbar per variant the selected
// system has (an added one is docked, TBR-13). The toolbar takes no focus of its own: its items keep theirs, so the row
// does not bind the gallery's `-focus`.

extension GalleryComponent {
  static let toolbar = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(
        TanreiToolbar(
          fixture.string("label") ?? "", variant: fixture.key("variant", default: TanreiToolbarVariant.fallback),
          orientation: TanreiToolbarOrientation(named: fixture.string("orientation") ?? "horizontal")
        ) {
          ForEach(Array(fixture.items.enumerated()), id: \.offset) { _, item in
            GalleryToolbarItem(item: item, fire: fire)
          }
        }
        .modifier(GalleryToolbarStage(isFloating: fixture.string("variant") == TanreiToolbarVariant.floating.rawValue)))
    },
    explore: { system in
      let examples = system.toolbar.variants.keys.map { variant in
        GalleryExample(id: "variant-\(variant.rawValue)", caption: variant.rawValue) { fire in
          AnyView(
            TanreiToolbar("\(variant.rawValue) toolbar", variant: variant) {
              TanreiIconButton("Archive", action: fire) { GalleryIcon(glyph: "archive") }
              TanreiIconButton("Delete", action: fire) { GalleryIcon(glyph: "delete") }
              TanreiIconButton("Share", action: fire) { GalleryIcon(glyph: "share") }
            }
            .modifier(GalleryToolbarStage(isFloating: variant == .floating)))
        }
      }
      return [GalleryExploration(title: "Every toolbar variant of \(system.id)", examples: examples)]
    },
    managesFocus: true
  )
}

/// A docked toolbar's width in a row of the gallery (it spans what it is given); a floating one at its own size.
private enum GalleryToolbarWidth {
  static let value: CGFloat = 260
}

private struct GalleryToolbarStage: ViewModifier {
  let isFloating: Bool

  func body(content: Content) -> some View {
    Group {
      if isFloating {
        content.fixedSize()
      } else {
        content.frame(width: GalleryToolbarWidth.value)
      }
    }
    .tanreiToolbarReportsOverflow(false)
  }
}

/// One item of a toolbar: a Tanrei icon button or Button, as a product writes it.
private struct GalleryToolbarItem: View {
  let item: GalleryItem
  let fire: @MainActor () -> Void
  @State private var isSelected: Bool

  init(item: GalleryItem, fire: @escaping @MainActor () -> Void) {
    self.item = item
    self.fire = fire
    _isSelected = State(initialValue: item.bool("selected") ?? false)
  }

  var body: some View {
    let disabled = item.bool("disabled") ?? false
    if item.kind == "action" {
      let variant = item.key("variant", default: TanreiIconButtonVariant.fallback)
      let label = item.string("label") ?? ""
      let glyph = item.content ?? ""
      if item.bool("toggle") ?? false {
        TanreiIconButton(label, isSelected: $isSelected, variant: variant, action: fire) { GalleryIcon(glyph: glyph, selected: isSelected) }
          .disabled(disabled)
      } else {
        TanreiIconButton(label, variant: variant, action: fire) { GalleryIcon(glyph: glyph, selected: false) }
          .disabled(disabled)
      }
    } else {
      TanreiButton(item.content ?? "", variant: item.key("variant", default: TanreiButtonVariant.fallback), action: fire)
        .disabled(disabled)
    }
  }
}
