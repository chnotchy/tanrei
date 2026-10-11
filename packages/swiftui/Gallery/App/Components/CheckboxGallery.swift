import SwiftUI
import Tanrei

// specs/checkbox.spec.json in the gallery: its fixtures (props `checked`, `indeterminate`, `error`, `disabled`, `label`,
// `labelHidden`). Each fixture owns its value, as an app does; an indeterminate fixture is a select-all whose children
// the activation turns all on, so its data clears the indeterminate state (CHK-2). `fire` counts changes; the UI tests
// read the checked state from the selected trait and "mixed" from the value (CHK-14). The checkbox has no axis to
// explore.

extension GalleryComponent {
  static let checkbox = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(
        GalleryCheckbox(
          label: fixture.string("label") ?? "",
          initiallyOn: fixture.bool("checked") ?? false,
          initiallyIndeterminate: fixture.bool("indeterminate") ?? false,
          isError: fixture.bool("error") ?? false,
          labelHidden: fixture.bool("labelHidden") ?? false,
          fire: fire
        )
        .disabled(fixture.bool("disabled") ?? false)
      )
    }
  )
}

/// A checkbox fixture: owns its value and its indeterminate state, as an app does.
private struct GalleryCheckbox: View {
  let label: String
  let isError: Bool
  let labelHidden: Bool
  let fire: @MainActor () -> Void
  @State private var isOn: Bool
  @State private var isIndeterminate: Bool

  init(label: String, initiallyOn: Bool, initiallyIndeterminate: Bool, isError: Bool, labelHidden: Bool, fire: @escaping @MainActor () -> Void) {
    self.label = label
    self.isError = isError
    self.labelHidden = labelHidden
    self.fire = fire
    _isOn = State(initialValue: initiallyOn)
    _isIndeterminate = State(initialValue: initiallyIndeterminate)
  }

  var body: some View {
    let binding = Binding(
      get: { isOn },
      set: { value in
        isOn = value
        // The select-all's children all follow it: the data is no longer mixed.
        isIndeterminate = false
        fire()
      })
    if labelHidden {
      TanreiCheckbox(label, isOn: binding, isIndeterminate: isIndeterminate, isError: isError).labelsHidden()
    } else {
      TanreiCheckbox(label, isOn: binding, isIndeterminate: isIndeterminate, isError: isError)
    }
  }
}
