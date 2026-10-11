import SwiftUI
import Tanrei

// specs/slider.spec.json in the gallery: its fixtures (props `value`, `startValue`, `range`, `min`, `max`, `step`, `origin`,
// `stops`, `size`, `orientation`, `valueIndicator`, `disabled`, `label`, `startLabel`, `valueText`, `startValueText`), then
// every size the selected system has. Each fixture owns its value, as an app does; `fire` counts finished changes (the
// spec's `change`, `onCommit`), and the UI tests read each handle's value from its element (SLD-19). A slider is as long as
// its layout gives it: the gallery gives a horizontal one a fixed width and a vertical one a fixed height.

extension GalleryComponent {
  static let slider = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(GallerySlider(fixture: fixture, fire: fire))
    },
    explore: { system in
      let examples = system.slider.sizes.keys.map { size in
        GalleryExample(id: "size-\(size.rawValue)", caption: "\(size.rawValue) · \(Int(system.slider.sizes[size].trackThickness))pt") { fire in
          AnyView(GallerySliderValue(size: size, fire: fire))
        }
      }
      return [GalleryExploration(title: "Every slider size of \(system.id)", examples: examples)]
    },
    // The handles hold their own keyboard focus.
    managesFocus: true
  )
}

/// The width of a horizontal slider and the height of a vertical one, in a row beside its caption.
private enum GallerySliderLength {
  static let length: CGFloat = 240
}

private struct GallerySlider: View {
  let fixture: GalleryFixture
  let fire: @MainActor () -> Void
  @State private var value: Double
  @State private var range: ClosedRange<Double>

  init(fixture: GalleryFixture, fire: @escaping @MainActor () -> Void) {
    self.fixture = fixture
    self.fire = fire
    let value = fixture.number("value") ?? 0
    _value = State(initialValue: value)
    _range = State(initialValue: min(fixture.number("startValue") ?? 0, value)...value)
  }

  var body: some View {
    // SLD-23: the fixture's names are read the way UI built from data reads them.
    let size = fixture.key("size", default: TanreiSliderSize.fallback)
    let orientation = TanreiSliderOrientation(named: fixture.string("orientation") ?? "horizontal")
    let indicator = TanreiSliderValueIndicator(named: fixture.string("valueIndicator") ?? "none")
    let bounds = (fixture.number("min") ?? 0)...(fixture.number("max") ?? 100)
    let step = fixture.number("step") ?? 0
    let stops = fixture.bool("stops") ?? false
    let label = fixture.string("label") ?? ""
    Group {
      if fixture.bool("range") == true {
        TanreiSlider(
          label, startLabel: fixture.string("startLabel") ?? "", value: $range, in: bounds, step: step, size: size, orientation: orientation,
          showsStops: stops, valueIndicator: indicator, valueText: fixture.string("valueText") ?? "",
          startValueText: fixture.string("startValueText") ?? "", onCommit: { _ in fire() })
      } else {
        TanreiSlider(
          label, value: $value, in: bounds, step: step, origin: fixture.number("origin"), size: size, orientation: orientation, showsStops: stops,
          valueIndicator: indicator, valueText: fixture.string("valueText") ?? "", onCommit: { _ in fire() })
      }
    }
    .frame(width: orientation == .horizontal ? GallerySliderLength.length : nil, height: orientation == .vertical ? GallerySliderLength.length : nil)
    .disabled(fixture.bool("disabled") ?? false)
  }
}

/// One size of the selected system, with its value shown while it is active.
private struct GallerySliderValue: View {
  let size: TanreiSliderSize
  let fire: @MainActor () -> Void
  @State private var value = 40.0

  var body: some View {
    TanreiSlider("Volume", value: $value, size: size, valueIndicator: .active, onCommit: { _ in fire() })
      .frame(width: GallerySliderLength.length)
  }
}
