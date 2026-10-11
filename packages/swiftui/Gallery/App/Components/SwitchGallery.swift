import SwiftUI
import Tanrei

// specs/switch.spec.json in the gallery: its fixtures (props `selected`, `disabled`, `label`, `labelHidden`,
// `selectedIcon`, `unselectedIcon`). Each fixture owns its value, as an app does; `fire` counts changes, and the UI tests
// read on / off from the selected trait (SWT-14). A glyph is the icon font's where the device has it, otherwise the
// SF Symbol a product would pass for it (the simulator has no icon font). The switch has no axis to explore.

extension GalleryComponent {
  static let `switch` = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(
        GallerySwitch(
          label: fixture.string("label") ?? "",
          initiallyOn: fixture.bool("selected") ?? false,
          selectedIcon: fixture.string("selectedIcon") ?? "",
          unselectedIcon: fixture.string("unselectedIcon") ?? "",
          labelHidden: fixture.bool("labelHidden") ?? false,
          fire: fire
        )
        .disabled(fixture.bool("disabled") ?? false)
      )
    }
  )
}

private struct GallerySwitch: View {
  let label: String
  let selectedIcon: String
  let unselectedIcon: String
  let labelHidden: Bool
  let fire: @MainActor () -> Void
  @State private var isOn: Bool

  init(label: String, initiallyOn: Bool, selectedIcon: String, unselectedIcon: String, labelHidden: Bool, fire: @escaping @MainActor () -> Void) {
    self.label = label
    self.selectedIcon = selectedIcon
    self.unselectedIcon = unselectedIcon
    self.labelHidden = labelHidden
    self.fire = fire
    _isOn = State(initialValue: initiallyOn)
  }

  var body: some View {
    let binding = Binding(get: { isOn }, set: { isOn = $0; fire() })
    Group {
      if selectedIcon.isEmpty && unselectedIcon.isEmpty {
        TanreiSwitch(label, isOn: binding)
      } else {
        TanreiSwitch(label, isOn: binding) {
          GallerySwitchGlyph(glyph: selectedIcon, selected: true)
        } unselectedIcon: {
          GallerySwitchGlyph(glyph: unselectedIcon, selected: false)
        }
      }
    }
    .modifier(GalleryLabelsHidden(hidden: labelHidden))
  }
}

private struct GalleryLabelsHidden: ViewModifier {
  let hidden: Bool
  func body(content: Content) -> some View {
    if hidden { content.labelsHidden() } else { content }
  }
}

/// The glyph of the system's icon font when this device has it, otherwise the SF Symbol a product would use, at the
/// small scale (a symbol fills its size; the icon font's glyphs keep a margin).
private struct GallerySwitchGlyph: View {
  let glyph: String
  let selected: Bool
  @Environment(\.tanreiSystem) private var system

  private static let symbols = ["check": "checkmark", "close": "xmark"]

  var body: some View {
    if glyph.isEmpty {
      EmptyView()
    } else if system.icon.installedFamily(selected: selected) != nil {
      TanreiIconGlyph(glyph)
    } else {
      Image(systemName: Self.symbols[glyph] ?? "questionmark").imageScale(.small)
    }
  }
}
