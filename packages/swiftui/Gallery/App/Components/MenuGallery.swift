import SwiftUI
@_spi(Fixtures) import Tanrei

// specs/menu.spec.json in the gallery: each fixture is the open menu drawn in place (`TanreiMenu(inPlace:)`, MNU-19's
// verify: its surface at its natural size, with its elevation, without an anchor), its items the fixture's items in order
// — a group item a `TanreiMenuSection` holding its own. Toggles and radio groups own their state, as an app
// does; `fire` counts an action's clicks and every change. Below them, one menu presented from a button, as a product
// opens one: the UI tests open it, choose an item and see it close.

extension GalleryComponent {
  static let menu = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(TanreiMenu(inPlace: { GalleryMenuItems(items: fixture.items, fire: fire) }))
    },
    explore: { _ in
      [
        GalleryExploration(
          title: "A menu opened from its anchor",
          examples: [GalleryExample(id: "anchored", caption: "tap to open · bottom-start") { fire in AnyView(GalleryAnchoredMenu(fire: fire)) }])
      ]
    },
    managesFocus: true
  )
}

/// A fixture's items as menu items, each owning its state.
private struct GalleryMenuItems: View {
  let items: [GalleryItem]
  let fire: @MainActor () -> Void

  var body: some View {
    ForEach(Array(items.enumerated()), id: \.offset) { _, item in
      GalleryMenuItem(item: item, fire: fire)
    }
  }
}

private struct GalleryMenuItem: View {
  let item: GalleryItem
  let fire: @MainActor () -> Void
  @State private var checked: Bool
  @State private var selection: String?
  @Environment(\.tanreiSystem) private var system

  init(item: GalleryItem, fire: @escaping @MainActor () -> Void) {
    self.item = item
    self.fire = fire
    _checked = State(initialValue: item.bool("checked") ?? false)
    _selection = State(initialValue: item.string("value"))
  }

  var body: some View {
    let title = item.string("label") ?? ""
    let supporting = item.string("supportingText") ?? ""
    let leading = GalleryIcon.itemIcon(item.string("leadingIcon"), selected: false, system: system)
    let trailing = GalleryIcon.itemIcon(item.string("trailingIcon"), selected: false, system: system)
    let trailingText = item.string("trailingText") ?? ""
    Group {
      switch item.kind {
      case "group":
        TanreiMenuSection(item.string("title") ?? "", selection: Binding(get: { selection }, set: { selection = $0; fire() })) {
          GalleryMenuItems(items: item.items, fire: fire)
        }
      case "checkbox-item":
        TanreiMenuToggle(
          title, isOn: Binding(get: { checked }, set: { checked = $0; fire() }), supportingText: supporting, leadingIcon: leading, trailingIcon: trailing,
          trailingText: trailingText)
      case "radio-item":
        TanreiMenuOption(title, supportingText: supporting, leadingIcon: leading, trailingIcon: trailing, trailingText: trailingText).tag(item.string("value") ?? "")
      default:
        TanreiMenuItem(
          title, role: item.bool("destructive") == true ? .destructive : nil, supportingText: supporting, leadingIcon: leading, trailingIcon: trailing,
          trailingText: trailingText, action: fire)
      }
    }
    .disabled(item.bool("disabled") ?? false)
  }
}

/// A button that opens a menu, as a product writes one; choosing "Rename" fires. Its value says whether the menu is open.
private struct GalleryAnchoredMenu: View {
  let fire: @MainActor () -> Void
  @State private var isPresented = false
  @State private var showsGrid = true

  var body: some View {
    TanreiButton("Edit", action: { isPresented = true })
      .tanreiMenu(isPresented: $isPresented) {
        TanreiMenuItem("Rename", action: fire)
        TanreiMenuItem("Move to trash", role: .destructive, action: {})
        TanreiMenuSection("View") {
          TanreiMenuToggle("Show details", isOn: $showsGrid)
        }
      }
      .accessibilityValue(isPresented ? "open" : "closed")
  }
}
