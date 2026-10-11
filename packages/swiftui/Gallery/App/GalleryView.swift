import SwiftUI
import Tanrei

struct GalleryView: View {
  let catalog = GallerySpec.loadAll()
  @State private var selection: GallerySystem
  @State private var appearance: TanreiAppearance
  @State private var contrast: TanreiContrast
  @State private var counts: [String: Int] = [:]
  @FocusState private var focus: String?
  @State private var touchReport: GalleryTouchReport?
  private let initialFocus: String?
  private let touchProbe: Bool
  private let freezeLoops: Bool
  private let component: String?
  private let noExplore: Bool
  private let fixtures: Set<String>?
  private let noSwitches: Bool

  init(launch: GalleryLaunch) {
    _selection = State(initialValue: GallerySystem.all.first { $0.id == launch.system } ?? GallerySystem.all[0])
    _appearance = State(initialValue: launch.appearance ?? .system)
    _contrast = State(initialValue: launch.contrast ?? .system)
    initialFocus = launch.focus
    touchProbe = launch.touchProbe
    freezeLoops = launch.freezeLoops
    component = launch.component
    noExplore = launch.noExplore
    fixtures = launch.fixtures
    noSwitches = launch.noSwitches
  }

  private var theme: TanreiTheme {
    TanreiTheme(system: selection.system, appearance: appearance, contrast: contrast)
  }

  var body: some View {
    GalleryContent(
      specs: component.map { only in catalog.specs.filter { $0.name == only } } ?? catalog.specs, failures: catalog.failures, selection: $selection, appearance: $appearance, contrast: $contrast,
      counts: $counts, focus: $focus, touchReport: touchProbe ? (touchReport?.label ?? "none") : nil, showsExplorations: !noExplore,
      onlyFixtures: fixtures, showsSwitches: !noSwitches
    )
    .background {
      if touchProbe { GalleryTouchProbe { touchReport = $0 } }
    }
    .tanreiTheme(theme)
    .galleryFreezingLoops(freezeLoops)
    .task {
      // After the first layout: focus moves only to something that is on screen.
      if let initialFocus { focus = initialFocus }
    }
  }
}

/// Inside the theme, so that the gallery's own chrome is drawn from the selected system too.
private struct GalleryContent: View {
  let specs: [GallerySpec]
  let failures: [String]
  @Binding var selection: GallerySystem
  @Binding var appearance: TanreiAppearance
  @Binding var contrast: TanreiContrast
  @Binding var counts: [String: Int]
  var focus: FocusState<String?>.Binding
  /// The last touch as the window saw it, when the gallery was launched with `-touchProbe YES`.
  var touchReport: String?
  /// `false` under `-noExplore YES`.
  var showsExplorations = true
  /// `-fixtures`: only these fixture ids; `nil`, all.
  var onlyFixtures: Set<String>?
  /// `false` under `-noSwitches YES`.
  var showsSwitches = true

  @Environment(\.tanreiSystem) private var system
  @TanreiPalette private var colors

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: system.space.space300) {
        if showsSwitches {
          switches
        }
        ForEach(failures, id: \.self) { failure in
          caption("Could not read \(failure)").accessibilityIdentifier("unreadable-spec")
        }
        ForEach(specs) { spec in
          if let component = GalleryRegistry.components[spec.name] {
            section("Fixtures of specs/\(spec.name).spec.json") {
              ForEach(spec.fixtures.filter { onlyFixtures?.contains($0.id) ?? true }) { fixture in
                row(component: spec.name, id: fixture.id, caption: fixture.id, managesFocus: component.managesFocus) { fire in
                  component.fixture(fixture, fire)
                }
              }
            }
            ForEach(Array(((showsExplorations ? component.explore?(system) : nil) ?? []).enumerated()), id: \.offset) { _, exploration in
              section(exploration.title) {
                ForEach(exploration.examples) { example in
                  row(component: spec.name, id: example.id, caption: example.caption, managesFocus: component.managesFocus, content: example.view)
                }
              }
            }
          } else if spec.isImplemented {
            // SwiftUI claims the component and the gallery cannot draw it: register it in GalleryRegistry.
            caption("specs/\(spec.name).spec.json is \(spec.swiftUIStatus ?? "?") on SwiftUI but has no gallery entry")
              .accessibilityIdentifier("unregistered.\(spec.name)")
          }
        }
      }
      .padding(system.space.space200)
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .background(colors[.surface])
    .accessibilityIdentifier("gallery")
  }

  private var switches: some View {
    VStack(alignment: .leading, spacing: system.space.space100) {
      Picker("Design system", selection: $selection) {
        ForEach(GallerySystem.all) { Text($0.id).tag($0) }
      }
      .accessibilityIdentifier("switch.system")
      Picker("Theme", selection: $appearance) {
        ForEach(TanreiAppearance.allCases, id: \.self) { Text($0.rawValue).tag($0) }
      }
      .pickerStyle(.segmented)
      .accessibilityIdentifier("switch.appearance")
      Picker("Contrast", selection: $contrast) {
        ForEach(TanreiContrast.allCases, id: \.self) { Text($0.rawValue).tag($0) }
      }
      .pickerStyle(.segmented)
      .accessibilityIdentifier("switch.contrast")
      Text("pressed-feedback: \(system.behavior.pressedFeedback.rawValue) · corner-smoothing: \(system.shape.cornerSmoothing.formatted()) · focus-style: \(system.behavior.focusStyle.rawValue)")
        .tanreiTextStyle(system.typescale.bodySmall)
        .foregroundStyle(colors[.onSurfaceVariant])
        .accessibilityIdentifier("behavior")
      if let touchReport {
        caption("touch: \(touchReport)").accessibilityIdentifier("touch-probe")
      }
      HStack(spacing: system.space.space200) {
        // Which fixture has keyboard focus, as SwiftUI sees it: what the keyboard UI tests wait for.
        Text("focus: \(focus.wrappedValue ?? "none")")
          .tanreiTextStyle(system.typescale.bodySmall)
          .foregroundStyle(colors[.onSurfaceVariant])
          .accessibilityIdentifier("focus")
        // A text style whose stack names a family this device HAS: the simulator has none of the families
        // the shipped systems name (Tanrei bundles no font), so without it only the platform-font path
        // would ever run under the accessibility audit and the Dynamic Type test.
        Text(verbatim: Self.deviceFamily)
          .tanreiTextStyle(namedFamilyStyle)
          .foregroundStyle(colors[.onSurfaceVariant])
          .accessibilityIdentifier("named-family")
      }
    }
  }

  /// Ships with iOS and macOS.
  private static let deviceFamily = "Helvetica Neue"

  private var namedFamilyStyle: TanreiTextStyle {
    var style = system.typescale.bodySmall
    style.font = TanreiFontStack(families: [Self.deviceFamily], generic: style.font.generic, system: false)
    return style
  }

  private func section(_ title: String, @ViewBuilder content: () -> some View) -> some View {
    VStack(alignment: .leading, spacing: system.space.space150) {
      Text(title)
        .tanreiTextStyle(system.typescale.heading6)
        .foregroundStyle(colors[.onSurface])
        .accessibilityAddTraits(.isHeader)
      content()
    }
  }

  private func caption(_ text: String) -> some View {
    Text(text)
      .tanreiTextStyle(system.typescale.bodySmall)
      .foregroundStyle(colors[.onSurfaceVariant])
  }

  /// One component, its caption, and how many times its event has fired (what the UI tests read). The
  /// key `<component>.<id>` is unique across components: identifiers `fixture.<key>` and `count.<key>`,
  /// and the `-focus` launch argument names it.
  private func row(
    component: String, id: String, caption: String, managesFocus: Bool = false, content: (_ fire: @escaping @MainActor () -> Void) -> AnyView
  ) -> some View {
    let key = "\(component).\(id)"
    return HStack(spacing: system.space.space200) {
      Group {
        if managesFocus {
          content { counts[key, default: 0] += 1 }
        } else {
          content { counts[key, default: 0] += 1 }
            .focused(focus, equals: key)
        }
      }
        .accessibilityIdentifier("fixture.\(key)")
      VStack(alignment: .leading) {
        self.caption(caption)
        self.caption("fired \(counts[key, default: 0])")
          .accessibilityIdentifier("count.\(key)")
      }
    }
  }
}
