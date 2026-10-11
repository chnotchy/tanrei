import SwiftUI
import Tanrei

// specs/tooltip.spec.json in the gallery: each fixture is its anchor — a medium standard icon button labelled after the
// fixture's glyph, as the spec's harness has it — with the fixture's tooltip (`variant`, `text`, `title`, `placement`,
// `describes`), drawn in the gallery's tooltip layer (`.tanreiTheme` at its root). `open` is the row's own state, as an app
// keeps it: the fixture's value first, then whatever the tooltip writes (its `toggle`), which `fire` counts. At most one
// tooltip is open at a time (TIP-8), so of the fixtures that start open the last one shown stays open.

extension GalleryComponent {
  static let tooltip = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(GalleryTooltip(fixture: fixture, fire: fire))
    }
  )
}

private struct GalleryTooltip: View {
  let fixture: GalleryFixture
  let fire: @MainActor () -> Void
  @State private var isPresented: Bool

  init(fixture: GalleryFixture, fire: @escaping @MainActor () -> Void) {
    self.fixture = fixture
    self.fire = fire
    _isPresented = State(initialValue: fixture.bool("open") ?? false)
  }

  var body: some View {
    let glyph = fixture.content ?? ""
    TanreiIconButton(glyph, action: {}) { GalleryIcon(glyph: glyph) }
      .tanreiTooltip(
        fixture.string("text") ?? "", title: fixture.string("title") ?? "",
        variant: TanreiTooltipVariant(named: fixture.string("variant") ?? "plain"),
        placement: TanreiTooltipPlacement(named: fixture.string("placement") ?? "top"), describes: fixture.bool("describes") ?? true,
        isPresented: Binding(get: { isPresented }, set: { isPresented = $0; fire() }))
      .accessibilityValue(isPresented ? "open" : "closed")
  }
}
