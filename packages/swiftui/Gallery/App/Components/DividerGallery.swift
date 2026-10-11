import SwiftUI
import Tanrei

// specs/divider.spec.json in the gallery: its fixtures (props `orientation`, `inset`, `decorative`), each drawn between
// two groups of content — a divider exists to separate something, and the row needs an element to carry its
// identifier: a decorative divider is not in the accessibility tree (DIV-5), so `fixture.divider.<id>` is the group
// that holds it. A divider never fires.

extension GalleryComponent {
  static let divider = GalleryComponent(
    fixture: { fixture, _ in
      // DIV-7: the fixture's names are read the way UI built from data reads them.
      let axis = Axis(tanreiDividerOrientation: fixture.string("orientation") ?? "horizontal")
      let inset = TanreiDividerInset(named: fixture.string("inset") ?? "none")
      let isDecorative = fixture.bool("decorative") ?? true
      return AnyView(GalleryDividedGroups(axis: axis) { TanreiDivider(axis: axis, inset: inset, isDecorative: isDecorative) })
    }
  )
}

/// Two groups with a divider between them: stacked for a horizontal divider, side by side for a vertical one. The
/// groups' sizes are the gallery's, not the divider's; the divider spans them (DIV-1).
private struct GalleryDividedGroups<Divider: View>: View {
  let axis: Axis
  @ViewBuilder let divider: Divider
  @Environment(\.tanreiSystem) private var system
  @TanreiPalette private var colors

  var body: some View {
    Group {
      if axis == .horizontal {
        VStack(alignment: .leading, spacing: system.space.space100) {
          group("Inbox")
          divider
          group("Archive")
        }
        .frame(width: system.space.space800 * 2)
      } else {
        HStack(spacing: system.space.space100) {
          group("Inbox")
          divider
          group("Archive")
        }
        .frame(height: system.space.space800)
      }
    }
    .accessibilityElement(children: .contain)
  }

  private func group(_ title: String) -> some View {
    Text(title)
      .tanreiTextStyle(system.typescale.body)
      .foregroundStyle(colors[.onSurface])
      .padding(.vertical, system.space.space100)
  }
}
