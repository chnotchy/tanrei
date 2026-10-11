import SwiftUI
import Tanrei

// specs/radio-button.spec.json in the gallery: its fixtures (props `selected`, `value`, `name`, `disabled`, `label`,
// `labelHidden`), each one option of a `TanreiRadioGroup` named by the fixture's `name`, owning its selection as an app
// does; `fire` counts changes (RAD-1: a selected option never fires again). Below them, one group of three options — the
// last disabled — for the group's behaviour (RAD-3, RAD-6, RAD-16): the UI tests tap through it and read each option's
// position.

extension GalleryComponent {
  static let radioButton = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(
        GalleryRadioQuestion(
          name: fixture.string("name") ?? "",
          options: [GalleryRadioOption(value: fixture.string("value") ?? "", label: fixture.string("label") ?? "", disabled: false)],
          initial: (fixture.bool("selected") ?? false) ? fixture.string("value") : nil,
          labelHidden: fixture.bool("labelHidden") ?? false,
          fire: fire
        )
        .disabled(fixture.bool("disabled") ?? false)
      )
    },
    explore: { _ in
      [
        GalleryExploration(
          title: "A group of three options",
          examples: [
            GalleryExample(id: "group", caption: "frequency · the last disabled") { fire in
              AnyView(
                GalleryRadioQuestion(
                  name: "Email frequency",
                  options: [
                    GalleryRadioOption(value: "daily", label: "Daily", disabled: false),
                    GalleryRadioOption(value: "weekly", label: "Weekly", disabled: false),
                    GalleryRadioOption(value: "never", label: "Never", disabled: true),
                  ],
                  initial: "daily", labelHidden: false, fire: fire))
            }
          ])
      ]
    }
  )
}

private struct GalleryRadioOption {
  let value: String
  let label: String
  let disabled: Bool
}

/// A question: a group that owns its selection, as an app does.
private struct GalleryRadioQuestion: View {
  let name: String
  let options: [GalleryRadioOption]
  let labelHidden: Bool
  let fire: @MainActor () -> Void
  @State private var selection: String?

  init(name: String, options: [GalleryRadioOption], initial: String?, labelHidden: Bool, fire: @escaping @MainActor () -> Void) {
    self.name = name
    self.options = options
    self.labelHidden = labelHidden
    self.fire = fire
    _selection = State(initialValue: initial)
  }

  var body: some View {
    let binding = Binding(
      get: { selection },
      set: { value in
        selection = value
        fire()
      })
    TanreiRadioGroup(name) {
      ForEach(options, id: \.value) { option in
        Group {
          if labelHidden {
            TanreiRadioButton(option.label, value: option.value, selection: binding).labelsHidden()
          } else {
            TanreiRadioButton(option.label, value: option.value, selection: binding)
          }
        }
        .disabled(option.disabled)
      }
    }
  }
}
