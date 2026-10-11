import SwiftUI
@_spi(Fixtures) import Tanrei

// specs/split-button.spec.json in the gallery: each fixture is one split button at its natural width (SPB-12's verify),
// drawn from its props (`variant`, `size`, `label`, `menuLabel`, `open`, `disabled`) and its icon slot (`glyph` —
// the icon font's glyph where the device has it, else the SF Symbol a product would pass, App/GalleryIcon.swift). A fixture
// cannot fill the menu slot (SPB-15), so the fixtures are drawn through the fixture initializer: the trailing half really
// toggles the row's own open value (starting from the fixture's), draws the open form and presents no menu (SPB-20). `fire`
// counts the leading half's clicks. Below them, one split button with a menu, as a product writes it: the UI tests open it,
// choose an item (which fires) and see it close.

extension GalleryComponent {
  static let splitButton = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(GallerySplitButtonFixture(fixture: fixture, fire: fire))
    },
    explore: { _ in
      [
        GalleryExploration(
          title: "A split button with its menu",
          examples: [GalleryExample(id: "with-menu", caption: "Save as… fires · bottom-end") { fire in AnyView(GallerySplitButtonWithMenu(fire: fire)) }])
      ]
    },
    // Two halves, two keyboard stops of their own: the row does not bind the gallery's `-focus`.
    managesFocus: true
  )
}

/// One fixture, owning its open value as an app does.
private struct GallerySplitButtonFixture: View {
  let fixture: GalleryFixture
  let fire: @MainActor () -> Void
  @State private var isOpen: Bool

  init(fixture: GalleryFixture, fire: @escaping @MainActor () -> Void) {
    self.fixture = fixture
    self.fire = fire
    _isOpen = State(initialValue: fixture.bool("open") ?? false)
  }

  var body: some View {
    let glyph = fixture.slot("icon").first
    TanreiSplitButton(
      fixture: fixture.string("label") ?? "", icon: { if let glyph { GalleryIcon(glyph: glyph) } }, menuLabel: fixture.string("menuLabel") ?? "",
      isMenuPresented: $isOpen, variant: fixture.key("variant", default: TanreiSplitButtonVariant.fallback),
      size: fixture.key("size", default: TanreiSplitButtonSize.fallback), action: fire
    )
    .disabled(fixture.bool("disabled") ?? false)
    .fixedSize()
  }
}

/// A split button with a menu: "Save as…" fires.
private struct GallerySplitButtonWithMenu: View {
  let fire: @MainActor () -> Void
  @State private var isOpen = false
  @State private var keepsBackup = true

  var body: some View {
    TanreiSplitButton("Save", icon: { GalleryIcon(glyph: "save") }, menuLabel: "More save options", isMenuPresented: $isOpen, action: {}) {
      TanreiMenuItem("Save as…", action: fire)
      TanreiMenuItem("Save a copy", action: {})
      TanreiMenuSection("Options") {
        TanreiMenuToggle("Keep a backup", isOn: $keepsBackup)
      }
    }
    .fixedSize()
  }
}
