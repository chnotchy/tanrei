import SwiftUI
import Tanrei

// specs/tabs.spec.json in the gallery: each fixture is one row of tabs (TAB-14's verify: 360 wide there; the gallery's row
// is narrower, beside its caption), holding the fixture's tabs in order — the row's props (`variant`,
// `scrollable`, `selected`, `label`) and each tab's (`value`, `label`, `icon`, `labelHidden`, `disabled`). The row owns its
// selection, as an app does, and `fire` counts its changes (TAB-1, TAB-12). Each tab's panel is a line of text naming it,
// so the panel's swap is visible.

extension GalleryComponent {
  static let tabs = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(GalleryTabs(fixture: fixture, fire: fire))
    },
    managesFocus: true
  )
}

private struct GalleryTabs: View {
  let fixture: GalleryFixture
  let fire: @MainActor () -> Void
  @State private var selection: String?
  @Environment(\.tanreiSystem) private var system
  @TanreiPalette private var colors

  init(fixture: GalleryFixture, fire: @escaping @MainActor () -> Void) {
    self.fixture = fixture
    self.fire = fire
    _selection = State(initialValue: fixture.string("selected"))
  }

  var body: some View {
    TanreiTabs(
      selection: Binding(get: { selection }, set: { selection = $0; fire() }),
      variant: fixture.key("variant", default: TanreiTabsVariant.fallback), scrollable: fixture.bool("scrollable") ?? false,
      label: LocalizedStringKey(fixture.string("label") ?? "")
    ) {
      ForEach(Array(fixture.items.enumerated()), id: \.offset) { _, item in
        tab(item)
      }
    }
    .frame(width: GalleryTabsWidth.value)
  }

  private func tab(_ item: GalleryItem) -> some View {
    let value = item.string("value") ?? ""
    let title = item.string("label") ?? ""
    let icon = GalleryIcon.itemIcon(item.string("icon"), selected: value == selection, system: system)
    let tab = TanreiTab(title, icon: icon) {
      Text(verbatim: "\(title) panel")
        .tanreiTextStyle(system.typescale.bodySmall)
        .foregroundStyle(colors[.onSurfaceVariant])
    }
    .tag(value)
    return (item.bool("labelHidden") == true ? tab.labelStyle(.iconOnly) : tab)
      .disabled(item.bool("disabled") ?? false)
  }
}

private enum GalleryTabsWidth {
  static let value: CGFloat = 260
}
