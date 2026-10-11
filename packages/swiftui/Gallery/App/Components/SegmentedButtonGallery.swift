import SwiftUI
import Tanrei

// specs/segmented-button.spec.json in the gallery: each fixture is one set at its natural width (SEG-14's verify), holding
// the fixture's segments in order —
// the set's props (`selection`, `value` or `values`, `size`, `label`) and each segment's (`value`, `label`, `icon`,
// `labelHidden`, `disabled`). The set owns its selection, as an app does, and `fire` counts its changes (SEG-1, SEG-2,
// SEG-18). Glyphs are the icon font's where the device has it, else the SF Symbol a product would pass, filled when
// selected (App/GalleryIcon.swift).

extension GalleryComponent {
  static let segmentedButton = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(GallerySegmentedButton(fixture: fixture, fire: fire))
    },
    managesFocus: true
  )
}

private struct GallerySegmentedButton: View {
  let fixture: GalleryFixture
  let fire: @MainActor () -> Void
  @State private var value: String?
  @State private var values: Set<String>
  @Environment(\.tanreiSystem) private var system

  init(fixture: GalleryFixture, fire: @escaping @MainActor () -> Void) {
    self.fixture = fixture
    self.fire = fire
    _value = State(initialValue: fixture.string("value"))
    _values = State(initialValue: Set(fixture.strings("values") ?? []))
  }

  var body: some View {
    // At its natural width (SEG-14's verify), beside its caption.
    segments.fixedSize(horizontal: true, vertical: false)
  }

  @ViewBuilder
  private var segments: some View {
    let size = fixture.key("size", default: TanreiSegmentedButtonSize.fallback)
    let label = fixture.string("label") ?? ""
    if fixture.string("selection") == "multiple" {
      TanreiSegmentedButton(label, selection: Binding(get: { values }, set: { values = $0; fire() }), size: size) {
        ForEach(Array(fixture.items.enumerated()), id: \.offset) { _, item in
          segment(item, selected: values.contains(item.string("value") ?? ""))
        }
      }
    } else {
      TanreiSegmentedButton(label, selection: Binding(get: { value }, set: { value = $0; fire() }), size: size) {
        ForEach(Array(fixture.items.enumerated()), id: \.offset) { _, item in
          segment(item, selected: value == item.string("value"))
        }
      }
    }
  }

  private func segment(_ item: GalleryItem, selected: Bool) -> some View {
    let icon = GalleryIcon.itemIcon(item.string("icon"), selected: selected, system: system)
    let segment = TanreiSegment(item.string("label") ?? "", icon: icon).tag(item.string("value") ?? "")
    return (item.bool("labelHidden") == true ? segment.labelStyle(.iconOnly) : segment)
      .disabled(item.bool("disabled") ?? false)
  }
}
