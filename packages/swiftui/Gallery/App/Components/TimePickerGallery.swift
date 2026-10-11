import SwiftUI
@_spi(Fixtures) import Tanrei

// specs/time-picker.spec.json in the gallery: each fixture is the open picker drawn in place (`TanreiTimePickerSurface`,
// TMP-1's verify) from its props (`value`, `hourCycle`, `entryMode`, `unit`, `layout`, `locale`, `label`) on a stage a phone row
// has room for — narrower than the spec's 480, so the vertical surface is the window's width less its margins (the time display
// runs into its padding); text entry on a shorter stage. The horizontal fixture keeps its
// 720 × 480 stage in a row that scrolls sideways. `fire` counts committed times (change). Below them, a picker presented from a button, as a product writes one: the UI tests open it, close
// it on its scrim, open it again and commit a time.

extension GalleryComponent {
  static let timePicker = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(GalleryTimePickerFixture(fixture: fixture, fire: fire))
    },
    explore: { _ in
      [
        GalleryExploration(
          title: "A time picker presented from a button",
          examples: [GalleryExample(id: "presented", caption: "tap to open · OK fires") { fire in AnyView(GalleryPresentedTimePicker(fire: fire)) }])
      ]
    },
    // The picker moves keyboard focus among its own parts (and its fields hold it): the row does not bind the gallery's `-focus`.
    managesFocus: true
  )
}

enum GalleryTimePickerStage {
  /// A phone row's room beside the captions.
  static let width: CGFloat = 336
  static let height: CGFloat = 520
  /// Text entry has no dial: a shorter stage keeps its row on the first screen, where the audit reads it without a scroll
  /// (after a scroll it misreports).
  static let textHeight: CGFloat = 320
  /// The horizontal fixture's stage, as the spec draws it.
  static let horizontal = CGSize(width: 720, height: 480)
  /// XCUITest reports the surface's frame with the drawing surface of its shadow: room for it at the row's start keeps
  /// the row wholly on screen for the audit.
  static let shadowRoom: CGFloat = 8
}

/// "HH:MM" ↔ the time at the API: an hour and a minute.
enum GalleryTimePickerTimes {
  static func components(_ text: String?) -> DateComponents? {
    guard let parts = text?.split(separator: ":").compactMap({ Int($0) }), parts.count == 2 else { return nil }
    return DateComponents(hour: parts[0], minute: parts[1])
  }

  static func text(_ components: DateComponents?) -> String {
    guard let hour = components?.hour, let minute = components?.minute else { return "" }
    return String(format: "%02d:%02d", hour, minute)
  }
}

/// One fixture, drawn in place from its props.
private struct GalleryTimePickerFixture: View {
  let fixture: GalleryFixture
  let fire: @MainActor () -> Void

  var body: some View {
    let surface = TanreiTimePickerSurface(
      selection: GalleryTimePickerTimes.components(fixture.string("value")),
      hourCycle: TanreiTimePickerHourCycle(named: fixture.string("hourCycle") ?? "locale"),
      entryMode: TanreiTimePickerEntryMode(named: fixture.string("entryMode") ?? "dial"),
      unit: TanreiTimePickerUnit(named: fixture.string("unit") ?? "hour"), layout: TanreiTimePickerLayout(named: fixture.string("layout") ?? "auto"),
      locale: fixture.string("locale").map { Locale(identifier: $0) },
      labels: TanreiTimePickerLabels(label: fixture.string("label") ?? TanreiTimePickerLabels().label), onChange: { _ in fire() })
    if fixture.string("layout") == "horizontal" {
      ScrollView(.horizontal) {
        surface.frame(width: GalleryTimePickerStage.horizontal.width, height: GalleryTimePickerStage.horizontal.height)
      }
      .frame(width: GalleryTimePickerStage.width, height: GalleryTimePickerStage.horizontal.height)
      .padding(.leading, GalleryTimePickerStage.shadowRoom)
    } else {
      surface
        .frame(
          width: GalleryTimePickerStage.width,
          height: fixture.string("entryMode") == "text" ? GalleryTimePickerStage.textHeight : GalleryTimePickerStage.height)
        .padding(.leading, GalleryTimePickerStage.shadowRoom)
    }
  }
}

/// A button that presents the picker, as a product writes one; OK fires when it commits a time. Its value is the chosen time.
private struct GalleryPresentedTimePicker: View {
  let fire: @MainActor () -> Void
  @State private var isPresented = false
  @State private var alarm: DateComponents? = DateComponents(hour: 7, minute: 30)

  var body: some View {
    TanreiButton("Set alarm", action: { isPresented = true })
      .accessibilityValue(GalleryTimePickerTimes.text(alarm))
      .tanreiTimePicker(isPresented: $isPresented, selection: $alarm, hourCycle: .h12, locale: Locale(identifier: "en_US"))
      .onChange(of: alarm) { fire() }
  }
}
