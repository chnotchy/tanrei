import SwiftUI
@_spi(Fixtures) import Tanrei

// specs/navigation-drawer.spec.json in the gallery: each fixture is one drawer holding the fixture's items —
// its `destination` items as TanreiNavigationDrawerItems and its `section` items as TanreiNavigationDrawerSections holding
// theirs, in order — with the drawer's props (`variant`, `open`, `value`, `label`) and each item's (`value`, `label`,
// `icon`, `disabled`, `badge`; `heading`, `divider`). A standard drawer is 440 high beside its caption (tall enough for
// every fixture's rows: a row the scroll view cuts fails the audit's contrast check); the modal one is drawn in place over
// a 300 × 440 stage (`inPlace()`: its scrim over the stage, without the modal trait, so the gallery
// around it stays live). The drawer owns its selection, as an app does, and `fire` counts its events: a change, a reselect
// and a close alike. Below them, a modal drawer presented from a button, as a product opens one: the UI tests open it,
// close it on its scrim and by a swipe toward its edge, and choose a destination, which closes it. Glyphs are the icon
// font's where the device has it, else the SF Symbol a product would pass, filled when selected (App/GalleryIcon.swift).

extension GalleryComponent {
  static let navigationDrawer = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(GalleryNavigationDrawer(fixture: fixture, fire: fire))
    },
    explore: { _ in
      [
        GalleryExploration(
          title: "A modal drawer presented from a button",
          examples: [
            GalleryExample(id: "presented", caption: "tap to open · a destination fires") { fire in AnyView(GalleryPresentedNavigationDrawer(fire: fire)) }
          ])
      ]
    },
    // The drawer moves keyboard focus itself (NVD-19, NVD-28).
    managesFocus: true
  )
}

private enum GalleryNavigationDrawerStage {
  static let height: CGFloat = 440
  static let modalWidth: CGFloat = 300
}

private struct GalleryNavigationDrawer: View {
  let fixture: GalleryFixture
  let fire: @MainActor () -> Void
  @State private var selection: String

  init(fixture: GalleryFixture, fire: @escaping @MainActor () -> Void) {
    self.fixture = fixture
    self.fire = fire
    _selection = State(initialValue: fixture.string("value") ?? "")
  }

  var body: some View {
    let variant = TanreiNavigationDrawerVariant(rawValue: fixture.string("variant") ?? TanreiNavigationDrawerVariant.fallback.rawValue)
    let drawer = TanreiNavigationDrawer(
      variant: variant,
      // A close (the modal one's scrim, a destination) is counted; the fixture stays open.
      isPresented: Binding(get: { fixture.bool("open") ?? false }, set: { open in if !open { fire() } }),
      selection: Binding(get: { selection }, set: { selection = $0; fire() }),
      accessibilityLabel: LocalizedStringKey(fixture.string("label") ?? ""),
      onReselect: { _ in fire() }
    ) {
      GalleryNavigationDrawerItems(items: fixture.items, selection: selection)
    }
    if variant == .modal {
      drawer.inPlace().frame(width: GalleryNavigationDrawerStage.modalWidth, height: GalleryNavigationDrawerStage.height)
    } else {
      drawer.frame(height: GalleryNavigationDrawerStage.height)
    }
  }
}

/// A fixture's items as the drawer's items: destinations, and sections holding theirs.
private struct GalleryNavigationDrawerItems: View {
  let items: [GalleryItem]
  let selection: String
  @Environment(\.tanreiSystem) private var system

  var body: some View {
    ForEach(Array(items.enumerated()), id: \.offset) { _, item in
      if item.kind == "section" {
        TanreiNavigationDrawerSection(item.string("heading") ?? "", divider: item.bool("divider") ?? false) {
          ForEach(Array(item.items.enumerated()), id: \.offset) { _, destination in
            self.destination(destination)
          }
        }
      } else {
        destination(item)
      }
    }
  }

  private func destination(_ item: GalleryItem) -> some View {
    let value = item.string("value") ?? ""
    let title = item.string("label") ?? ""
    let badge = item.string("badge") ?? ""
    return Group {
      if let icon = GalleryIcon.itemIcon(item.string("icon"), selected: value == selection, system: system) {
        TanreiNavigationDrawerItem(title, icon: icon, value: value, badge: badge)
      } else {
        TanreiNavigationDrawerItem(title, value: value, badge: badge)
      }
    }
    .disabled(item.bool("disabled") ?? false)
  }
}

/// A button that presents a modal drawer, as a product writes one; choosing a destination other than the selected one fires
/// (and closes the drawer). Its value says whether the drawer is open.
private struct GalleryPresentedNavigationDrawer: View {
  let fire: @MainActor () -> Void
  @State private var isPresented = false
  @State private var folder = "inbox"
  @Environment(\.tanreiSystem) private var system

  var body: some View {
    TanreiButton("Open drawer", action: { isPresented = true })
      .accessibilityValue(isPresented ? "open" : "closed")
      .tanreiNavigationDrawer(
        isPresented: $isPresented, selection: Binding(get: { folder }, set: { folder = $0; fire() }), accessibilityLabel: "Folders"
      ) {
        TanreiNavigationDrawerSection("Mail") {
          ForEach([("Inbox", "inbox", "inbox"), ("Sent", "send", "sent"), ("Trash", "delete", "trash")], id: \.2) { title, glyph, value in
            TanreiNavigationDrawerItem(title, icon: GalleryIcon.itemIcon(glyph, selected: value == folder, system: system) ?? "", value: value)
          }
        }
      }
  }
}
