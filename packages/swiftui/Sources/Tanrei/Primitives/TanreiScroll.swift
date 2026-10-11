import SwiftUI

// A scrolling region of a component (a scrollable row of tabs, TAB-14; a dialog's long content, DLG-9) and the one way
// snapshots draw it. `ImageRenderer` draws a `ScrollView` on macOS as nothing — its content is an AppKit scroll view's —, so
// a render with `\.tanreiScrollsInPlace` set (the snapshot harness sets it) draws the content where a scroll view at rest
// would show it instead: from its start, clipped to the region. No design value lives here.

private struct TanreiScrollsInPlaceKey: EnvironmentKey {
  static var defaultValue: Bool { false }
}

extension EnvironmentValues {
  /// Snapshots only: scrolling regions draw their content in place, at rest, instead of in a `ScrollView`.
  var tanreiScrollsInPlace: Bool {
    get { self[TanreiScrollsInPlaceKey.self] }
    set { self[TanreiScrollsInPlaceKey.self] = newValue }
  }
}

/// A `ScrollView` along `axis` without scroll indicators — or, under `\.tanreiScrollsInPlace`, its content at rest: from
/// its start edge (the leading edge, mirrored right to left, or the top), clipped to the space the region has.
struct TanreiScrollRegion<Content: View>: View {
  let axis: Axis
  @ViewBuilder let content: Content

  @Environment(\.tanreiScrollsInPlace) private var inPlace

  var body: some View {
    if inPlace {
      switch axis {
      case .horizontal:
        content
          .fixedSize(horizontal: true, vertical: false)
          .frame(minWidth: .zero, maxWidth: .infinity, alignment: .leading)
          .clipped()
      case .vertical:
        content
          .fixedSize(horizontal: false, vertical: true)
          .frame(minHeight: .zero, maxHeight: .infinity, alignment: .top)
          .clipped()
      }
    } else {
      ScrollView(axis == .horizontal ? .horizontal : .vertical, showsIndicators: false) { content }
    }
  }
}
