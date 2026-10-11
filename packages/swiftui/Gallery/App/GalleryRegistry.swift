import SwiftUI
import Tanrei

// The one place a component joins the gallery: `specs/<name>.spec.json` → how to draw one fixture of
// it. Adding a component is one entry in `GalleryRegistry.components` (and, usually, one file in
// `App/Components/`); the spec, its fixtures and the rows come from the bundle. A spec that SwiftUI
// claims to implement (`platforms.swiftui.status` other than `planned`) and that has no entry here is
// shown as missing, and the UI tests fail on it.
//
// Accessibility identifiers are unique across components: `fixture.<component>.<fixture-id>` for the
// drawn component, `count.<component>.<fixture-id>` for how often its event fired.

enum GalleryRegistry {
  static let components: [String: GalleryComponent] = [
    "app-bar": .appBar,
    "badge": .badge,
    "bottom-sheet": .bottomSheet,
    "button": .button,
    "button-group": .buttonGroup,
    "card": .card,
    "carousel": .carousel,
    "checkbox": .checkbox,
    "chip": .chip,
    "date-picker": .datePicker,
    "dialog": .dialog,
    "divider": .divider,
    "extended-fab": .extendedFab,
    "fab": .fab,
    "fab-menu": .fabMenu,
    "icon-button": .iconButton,
    "list": .list,
    "menu": .menu,
    "navigation-bar": .navigationBar,
    "navigation-drawer": .navigationDrawer,
    "navigation-rail": .navigationRail,
    "loading-indicator": .loadingIndicator,
    "progress-indicator": .progressIndicator,
    "radio-button": .radioButton,
    "search": .search,
    "segmented-button": .segmentedButton,
    "side-sheet": .sideSheet,
    "slider": .slider,
    "snackbar": .snackbar,
    "split-button": .splitButton,
    "switch": .switch,
    "tabs": .tabs,
    "text-field": .textField,
    "time-picker": .timePicker,
    "toolbar": .toolbar,
    "tooltip": .tooltip,
  ]
}

/// How the gallery draws one component.
struct GalleryComponent {
  /// One fixture of the spec, drawn from its props. Call `fire` from the component's event.
  let fixture: @MainActor (_ fixture: GalleryFixture, _ fire: @escaping @MainActor () -> Void) -> AnyView
  /// What the selected system adds on the component's axes (every size, every variant …); rows below the fixtures.
  var explore: (@MainActor (_ system: TanreiSystem) -> [GalleryExploration])?
  /// A component that holds its own keyboard focus (a text field): the row does not bind it to the gallery's `-focus`,
  /// which would take the focus back from the component's input whenever the row redraws.
  var managesFocus = false
}

/// Extra rows for the selected system, under a heading.
struct GalleryExploration {
  let title: String
  let examples: [GalleryExample]
}

/// One row of the gallery: an id (unique within its component), a caption and the view.
struct GalleryExample: Identifiable {
  let id: String
  let caption: String
  let view: @MainActor (_ fire: @escaping @MainActor () -> Void) -> AnyView
}
