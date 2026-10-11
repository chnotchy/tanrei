import SwiftUI
import Tanrei

// specs/badge.spec.json in the gallery: its fixtures (props `count`, `max`, `label`; content = the anchor's glyph name).
// As the spec's default slot says, a fixture's anchor is the glyph the content names, at `sys.icon.large` in
// on-surface-variant, and its accessible name is that glyph name ("notifications"); the badge adds the fixture's label
// to it as its value ("notifications, 3 unread"). It is drawn as the SF Symbol a product would use (a glyph of the icon font at `icon.large` needs the component icon context, which is not public; the simulator
// has no icon font either). The anchor is one accessibility element,
// so the row's identifier lands on it, and the UI tests read the badge's words as its value (BDG-8). A badge never
// fires.

extension GalleryComponent {
  static let badge = GalleryComponent(
    fixture: { fixture, _ in
      let count = fixture.number("count").map { Int($0) }
      let max = fixture.number("max").map { Int($0) } ?? TanreiBadge<EmptyView>.defaultMax
      let label = fixture.string("label") ?? ""
      let glyph = fixture.content ?? ""
      return AnyView(GalleryBadgeRoom { TanreiBadge(count: count, max: max, label: label) { GalleryBadgeAnchor(glyph: glyph) } })
    }
  )
}

/// Room for the badge, which extends past its anchor and takes no space of its own (BDG-7).
private struct GalleryBadgeRoom<Content: View>: View {
  @ViewBuilder let content: Content
  @Environment(\.tanreiSystem) private var system

  var body: some View {
    content
      .padding(.top, system.space.space100)
      .padding(.trailing, system.space.space400)
  }
}

/// The fixture's anchor: the glyph the content names, named by that glyph name.
private struct GalleryBadgeAnchor: View {
  let glyph: String
  @Environment(\.tanreiSystem) private var system
  @TanreiPalette private var colors

  /// The spec fixtures' glyph names, as SF Symbols.
  private static let symbols = ["notifications": "bell"]

  var body: some View {
    Image(systemName: Self.symbols[glyph] ?? "questionmark")
      .resizable()
      .scaledToFit()
      .frame(width: system.measure.iconLarge, height: system.measure.iconLarge)
      .foregroundStyle(colors[.onSurfaceVariant])
      .accessibilityLabel(glyph)
  }
}
