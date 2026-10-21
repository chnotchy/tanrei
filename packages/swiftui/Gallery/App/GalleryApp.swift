import SwiftUI
import Tanrei

// The SwiftUI fixture gallery: every fixture of every
// spec SwiftUI draws (`GalleryRegistry`, read from the bundled `specs/`) under every shipped design
// system — and `acme`, a system generated the way a product generates its own — with theme and contrast
// switches. It is also the host app of the UI tests: keyboard activation (BTN-1, BTN-2) and the
// accessibility audit need a real app, not a unit-test bundle.
//
// Not a product and not shipped: nothing here is public API. Design values come from the system in the
// environment, as in any app that uses Tanrei.

@main
struct GalleryApp: App {
  var body: some Scene {
    WindowGroup {
      GalleryView(launch: GalleryLaunch(defaults: .standard))
    }
  }
}

/// What a UI test (or a person) may ask for on the command line: `-system m3-like -appearance dark
/// -contrast high -focus button.filled-medium -freezeLoops YES -component divider -noExplore YES -noSwitches YES`. Launch arguments land in `UserDefaults`' argument domain.
struct GalleryLaunch {
  var system: String?
  var appearance: TanreiAppearance?
  var contrast: TanreiContrast?
  /// The row to give keyboard focus to once the gallery is on screen: `<component>.<fixture-id>`.
  var focus: String?
  /// `-touchProbe YES`: report what the window received of the last touch (`GalleryTouchProbe`).
  var touchProbe = false
  /// `-freezeLoops YES`: looping animations are drawn at the start of their cycle (`GalleryLoops.swift`).
  var freezeLoops = false
  /// `-component <spec name>`: only that spec's section (the switches stay). `performAccessibilityAudit()` does not
  /// complete in time once the whole gallery is in the tree.
  var component: String?
  /// `-noExplore YES`: the spec's fixtures only, without the rows of every size and variant of the selected system.
  var noExplore = false
  /// `-fixtures id,id,…`: only those fixtures of the shown specs — so that a section too long for one screen can be
  /// audited a screen's worth at a time (after a scroll the audit misreports).
  var fixtures: Set<String>?
  /// `-noSwitches YES`: without the system, theme and contrast switches and the captions under them, so that the fixtures
  /// start at the top of the screen. The accessibility audit reads one screen that must hold its rows without a scroll;
  /// the switches take about 210 of an iPhone's 874 points, and a tall stage (the
  /// modal date picker's, the time picker's dial) does not fit under them.
  var noSwitches = false

  init(defaults: UserDefaults) {
    system = defaults.string(forKey: "system")
    appearance = defaults.string(forKey: "appearance").flatMap(TanreiAppearance.init(rawValue:))
    contrast = defaults.string(forKey: "contrast").flatMap(TanreiContrast.init(rawValue:))
    focus = defaults.string(forKey: "focus")
    touchProbe = defaults.bool(forKey: "touchProbe")
    freezeLoops = defaults.bool(forKey: "freezeLoops")
    component = defaults.string(forKey: "component")
    noExplore = defaults.bool(forKey: "noExplore")
    fixtures = defaults.string(forKey: "fixtures").map { Set($0.split(separator: ",").map(String.init)) }
    noSwitches = defaults.bool(forKey: "noSwitches")
  }
}

/// The design systems the gallery can show: what the package ships, and the fixture system `acme`.
struct GallerySystem: Identifiable, Hashable {
  let system: TanreiSystem
  var id: String { system.id }

  static let all: [GallerySystem] = [.tanrei, .m3Like, .cupertino, .acme].map(GallerySystem.init(system:))

  static func == (a: GallerySystem, b: GallerySystem) -> Bool { a.id == b.id }
  func hash(into hasher: inout Hasher) { hasher.combine(id) }
}
