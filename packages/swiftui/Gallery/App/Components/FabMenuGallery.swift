import SwiftUI
@_spi(Fixtures) import Tanrei

// specs/fab-menu.spec.json in the gallery: each fixture on its stage (FBM-13's verify: 320 × 320, the toggle 16 in from the
// inline-end bottom corner), its toggle's glyph the `icon` slot's and its items the fixture's items in order.
// A closed fixture is a FAB menu as a product writes it: its toggle presents the items in a popover. An open
// fixture is drawn in place (`.inPlace()`), its items above the toggle. Each fixture owns its open state, as an app does;
// `fire` counts the items' clicks. The UI tests open, choose and close.

extension GalleryComponent {
  static let fabMenu = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(GalleryFabMenu(fixture: fixture, fire: fire))
    },
    explore: { system in
      let tokens = system.fabMenu
      let sizes = tokens.sizes.keys.map { size in
        GalleryExample(id: "size-\(size.rawValue)", caption: "\(size.rawValue) · \(Int(tokens.sizes[size].containerSize))pt") { fire in
          AnyView(GalleryFabMenuExample(size: size, fire: fire))
        }
      }
      let variants = tokens.variants.keys.map { variant in
        GalleryExample(id: "variant-\(variant.rawValue)", caption: variant.rawValue) { fire in
          AnyView(GalleryFabMenuExample(variant: variant, fire: fire))
        }
      }
      return [
        GalleryExploration(title: "Every FAB menu size of \(system.id)", examples: sizes),
        GalleryExploration(title: "Every FAB menu variant of \(system.id)", examples: variants),
      ]
    },
    // The FAB menu moves keyboard focus into its items and back to its toggle itself.
    managesFocus: true
  )
}

/// FBM-13's verify: the stage's side, and how far in from its inline-end bottom corner the toggle sits.
private enum GalleryFabMenuStage {
  static let side: CGFloat = 320
  static let margin: CGFloat = 16
}

private struct GalleryFabMenu: View {
  let fixture: GalleryFixture
  let fire: @MainActor () -> Void
  @State private var isPresented: Bool
  @Environment(\.tanreiSystem) private var system

  init(fixture: GalleryFixture, fire: @escaping @MainActor () -> Void) {
    self.fixture = fixture
    self.fire = fire
    _isPresented = State(initialValue: fixture.bool("open") ?? false)
  }

  var body: some View {
    let variant = fixture.key("variant", default: TanreiFabMenuVariant.fallback)
    let size = fixture.key("size", default: TanreiFabMenuSize.fallback)
    let menu = TanreiFabMenu(fixture.string("label") ?? "", variant: variant, size: size, isPresented: $isPresented) {
      ForEach(Array(fixture.items.enumerated()), id: \.offset) { _, item in
        TanreiFabMenuItem(
          item.string("label") ?? "", icon: GalleryIcon.itemIcon(item.string("icon"), selected: false, system: system) ?? "", action: fire)
      }
    } icon: {
      GalleryIcon(glyph: fixture.slot("icon").first ?? "")
    }
    Color.clear
      .frame(width: GalleryFabMenuStage.side, height: GalleryFabMenuStage.side)
      .overlay(alignment: .bottomTrailing) {
        Group {
          if fixture.bool("open") == true {
            menu.inPlace()
          } else {
            menu
          }
        }
        .padding(GalleryFabMenuStage.margin)
      }
      .disabled(fixture.bool("disabled") ?? false)
      .accessibilityElement(children: .contain)
  }
}

/// One size or variant of the selected system, presenting its items from the toggle.
private struct GalleryFabMenuExample: View {
  var variant = TanreiFabMenuVariant.fallback
  var size = TanreiFabMenuSize.fallback
  let fire: @MainActor () -> Void
  @State private var isPresented = false
  @Environment(\.tanreiSystem) private var system

  var body: some View {
    TanreiFabMenu("Create", variant: variant, size: size, isPresented: $isPresented) {
      TanreiFabMenuItem("Document", icon: GalleryIcon.itemIcon("description", selected: false, system: system) ?? "", action: fire)
      TanreiFabMenuItem("Folder", icon: GalleryIcon.itemIcon("create_new_folder", selected: false, system: system) ?? "", action: fire)
      TanreiFabMenuItem("Upload", icon: GalleryIcon.itemIcon("upload", selected: false, system: system) ?? "", action: fire)
    } icon: {
      GalleryIcon(glyph: "add")
    }
  }
}
