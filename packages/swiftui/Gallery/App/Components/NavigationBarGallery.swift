import SwiftUI
import Tanrei

// specs/navigation-bar.spec.json in the gallery: each fixture is one bar (260 wide, beside its caption; the unit tests'
// fixtures are 360), holding the fixture's destinations in order — the bar's props (`value`,
// `labelVisibility`, `label`) and each destination's (`value`, `label`, `icon`, `disabled`, `badge`, `badgeCount`,
// `badgeLabel`). The bar owns its selection, as an app does, and `fire` counts its events: a change (NVB-1) and a
// reselect (the selected destination activated again) alike. Glyphs are the icon font's where the device has it, else the
// SF Symbol a product would pass, filled when selected (App/GalleryIcon.swift).

extension GalleryComponent {
  static let navigationBar = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(GalleryNavigationBar(fixture: fixture, fire: fire))
    }
  )
}

private struct GalleryNavigationBar: View {
  let fixture: GalleryFixture
  let fire: @MainActor () -> Void
  @State private var selection: String
  @Environment(\.tanreiSystem) private var system

  init(fixture: GalleryFixture, fire: @escaping @MainActor () -> Void) {
    self.fixture = fixture
    self.fire = fire
    _selection = State(initialValue: fixture.string("value") ?? "")
  }

  var body: some View {
    TanreiNavigationBar(
      selection: Binding(get: { selection }, set: { selection = $0; fire() }),
      labelVisibility: fixture.string("labelVisibility").flatMap(TanreiNavigationLabelVisibility.init(rawValue:)) ?? .always,
      accessibilityLabel: LocalizedStringKey(fixture.string("label") ?? ""),
      onReselect: { _ in fire() }
    ) {
      ForEach(Array(fixture.items.enumerated()), id: \.offset) { _, item in
        destination(item)
      }
    }
    .frame(width: GalleryNavigationBarWidth.value)
  }

  private func destination(_ item: GalleryItem) -> some View {
    let value = item.string("value") ?? ""
    let icon = GalleryIcon.itemIcon(item.string("icon"), selected: value == selection, system: system) ?? ""
    let badge = item.bool("badge") == true
      ? TanreiNavigationBadge(count: item.number("badgeCount").map { Int($0) }, label: item.string("badgeLabel") ?? "") : nil
    return TanreiNavigationBarItem(item.string("label") ?? "", icon: icon, value: value, badge: badge)
      .disabled(item.bool("disabled") ?? false)
  }
}

private enum GalleryNavigationBarWidth {
  static let value: CGFloat = 260
}
