import SwiftUI
import Tanrei

// specs/progress-indicator.spec.json in the gallery: its fixtures (props `variant`, `size`, `value`, `min`, `max`,
// `label`, `valueText`), then every size the selected system has, determinate and not. A bar fills the width its
// layout gives it: the gallery gives it a fixed one. A progress indicator never fires.

extension GalleryComponent {
  static let progressIndicator = GalleryComponent(
    fixture: { fixture, _ in
      // PRG-12: the fixture's names are read the way UI built from data reads them.
      let variant = TanreiProgressIndicatorVariant(named: fixture.string("variant") ?? "linear")
      let size = fixture.key("size", default: TanreiProgressIndicatorSize.fallback)
      let bounds = (fixture.number("min") ?? 0)...(fixture.number("max") ?? 1)
      return AnyView(
        GalleryProgressWidth(variant: variant) {
          TanreiProgressIndicator(
            fixture.string("label") ?? "", value: fixture.number("value"), in: bounds,
            currentValueLabel: fixture.string("valueText"), variant: variant, size: size)
        })
    },
    explore: { system in
      let tokens = system.progressIndicator
      let examples = tokens.sizes.keys.flatMap { size in
        TanreiProgressIndicatorVariant.allCases.map { variant in
          GalleryExample(
            id: "size-\(size.rawValue)-\(variant.rawValue)",
            caption: "\(size.rawValue) · \(variant.rawValue) · \(Int(variant == .linear ? tokens.sizes[size].linearThickness : tokens.sizes[size].circularSize))pt"
          ) { _ in
            AnyView(GalleryProgressWidth(variant: variant) { TanreiProgressIndicator("Uploading", value: 0.6, variant: variant, size: size) })
          }
        }
      }
      return [GalleryExploration(title: "Every progress indicator size of \(system.id)", examples: examples)]
    }
  )
}

/// A bar's width in the gallery; a ring takes its own size.
private struct GalleryProgressWidth<Content: View>: View {
  let variant: TanreiProgressIndicatorVariant
  @ViewBuilder let content: Content
  @Environment(\.tanreiSystem) private var system

  var body: some View {
    content.frame(width: variant == .linear ? system.space.space800 * 2 : nil)
  }
}
