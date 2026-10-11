import SwiftUI
import Tanrei

// specs/navigation-rail.spec.json in the gallery: each fixture is one rail (360 high, beside its caption; the unit tests'
// fixtures are 400), holding the fixture's items — its `header-button` items as standard medium
// TanreiIconButtons in the header, named by their label and drawing their glyph (the item's content), wherever they stand
// among the items (NVR-12), and its `destination` items in order, with the rail's props (`value`, `labelVisibility`,
// `label`) and each destination's (`value`, `label`, `icon`, `disabled`, `badge`, `badgeCount`, `badgeLabel`). The rail
// owns its selection, as an app does, and `fire` counts its events: a change (NVR-1), a reselect (the selected destination
// activated again) and a header button's click alike. Glyphs are the icon font's where the device has it, else the SF
// Symbol a product would pass, filled when selected (App/GalleryIcon.swift).

extension GalleryComponent {
  static let navigationRail = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(GalleryNavigationRail(fixture: fixture, fire: fire))
    }
  )
}

private struct GalleryNavigationRail: View {
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
    let headerItems = fixture.items.filter { $0.kind == "header-button" }
    let destinations = fixture.items.filter { $0.kind == "destination" }
    TanreiNavigationRail(
      selection: Binding(get: { selection }, set: { selection = $0; fire() }),
      labelVisibility: fixture.string("labelVisibility").flatMap(TanreiNavigationLabelVisibility.init(rawValue:)) ?? .always,
      accessibilityLabel: LocalizedStringKey(fixture.string("label") ?? ""),
      onReselect: { _ in fire() }
    ) {
      ForEach(Array(destinations.enumerated()), id: \.offset) { _, item in
        destination(item)
      }
    } header: {
      ForEach(Array(headerItems.enumerated()), id: \.offset) { _, item in
        TanreiIconButton(item.string("label") ?? "", action: fire) { GalleryIcon(glyph: item.content ?? "") }
      }
    }
    .frame(height: GalleryNavigationRailHeight.value)
  }

  private func destination(_ item: GalleryItem) -> some View {
    let value = item.string("value") ?? ""
    let icon = GalleryIcon.itemIcon(item.string("icon"), selected: value == selection, system: system) ?? ""
    let badge = item.bool("badge") == true
      ? TanreiNavigationBadge(count: item.number("badgeCount").map { Int($0) }, label: item.string("badgeLabel") ?? "") : nil
    return TanreiNavigationRailItem(item.string("label") ?? "", icon: icon, value: value, badge: badge)
      .disabled(item.bool("disabled") ?? false)
  }
}

private enum GalleryNavigationRailHeight {
  static let value: CGFloat = 360
}
