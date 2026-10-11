import SwiftUI
import Tanrei

// specs/loading-indicator.spec.json in the gallery: its fixtures (props `size`, `contained`, `label`), then every size
// the selected system has, inline and contained. A loading indicator never fires. Its arc turns on the display's
// timeline; the audit freezes it (`-freezeLoops YES`, GalleryLoops.swift).

extension GalleryComponent {
  static let loadingIndicator = GalleryComponent(
    fixture: { fixture, _ in
      AnyView(
        TanreiLoadingIndicator(
          fixture.string("label") ?? "",
          size: fixture.key("size", default: TanreiLoadingIndicatorSize.fallback),
          contained: fixture.bool("contained") ?? false))
    },
    explore: { system in
      let tokens = system.loadingIndicator
      let examples = tokens.sizes.keys.flatMap { size in
        [false, true].map { contained in
          GalleryExample(
            id: "size-\(size.rawValue)\(contained ? "-contained" : "")",
            caption: "\(size.rawValue)\(contained ? " · contained" : "") · \(Int(contained ? tokens.sizes[size].containerSize : tokens.sizes[size].indicatorSize))pt"
          ) { _ in
            AnyView(TanreiLoadingIndicator("Loading", size: size, contained: contained))
          }
        }
      }
      return [GalleryExploration(title: "Every loading indicator size of \(system.id)", examples: examples)]
    }
  )
}
