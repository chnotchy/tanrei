import AcmeFixture
import SwiftUI
import Testing

@_spi(Fixtures) @testable import Tanrei

// Covers specs/time-picker.spec.json. Each behavior id (TMP-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file. TMP-19, TMP-20 and TMP-21 are BTN-8, BTN-9 and BTN-10 for the selectors and the
// period segments: the primitives they rest on are tested once in TanreiButtonTests / TanreiPrimitivesTests; here each is
// proven to reach the picker's parts.
//
// The fixtures draw the open picker in place (`TanreiTimePickerSurface`, TMP-1's verify): the surface centred on a stage of
// 480 × 640 (the horizontal fixture: 720 × 480) with the scrim over the `surface` page. Every fixture sets its locale and value.
// The text fields draw their text as text (`\.tanreiStaticTextInput`), unfocused. Icons: baselines render with
// `Snapshot.theme` (`fontFamilyPolicy: .system`), under which the entry-mode toggle's glyph is the picker's own vector.
//
// The keyboard on a device, VoiceOver and the presented picker on iOS are the Gallery UI tests' (GalleryUITests, "time
// picker"): here the rules are tested pure, the surface rendered, and presses, drags and the presentation driven on macOS.

private let suiteName = "TanreiTimePickerTests"

@MainActor
private func theme(_ system: TanreiSystem) -> TanreiTheme {
  var theme = Snapshot.theme
  theme.system = system
  return theme
}

@MainActor
private func pixel(_ bitmap: Bitmap, x: CGFloat, y: CGFloat) -> Bitmap.RGBA {
  bitmap[Int(x * Snapshot.scale), Int(y * Snapshot.scale)]
}

private let light = TanreiSystem.tanrei.colors.light
private let tokens = TanreiSystem.tanrei.timePicker
private let enUS = Locale(identifier: "en_US")

/// "HH:MM" → the time at the API.
private func components(_ value: String?) -> DateComponents? {
  guard let parts = value?.split(separator: ":").compactMap({ Int($0) }), parts.count == 2 else { return nil }
  return DateComponents(hour: parts[0], minute: parts[1])
}

private func time(_ hour: Int, _ minute: Int) -> TanreiTime { TanreiTime(hour: hour, minute: minute)! }

/// A configuration as a picker reads it when it opens.
private func configuration(
  _ value: String? = "07:30", hourCycle: TanreiTimePickerHourCycle = .h12, entryMode: TanreiTimePickerEntryMode = .dial,
  unit: TanreiTimePickerUnit = .hour, layout: TanreiTimePickerLayout = .auto, locale: Locale? = enUS, labels: TanreiTimePickerLabels = TanreiTimePickerLabels(),
  environmentLocale: Locale = enUS, device: Bool?? = .some(nil)
) -> TanreiTimePickerConfiguration {
  TanreiTimePickerConfiguration(
    TanreiTimePickerOptions(hourCycle: hourCycle, entryMode: entryMode, unit: unit, layout: layout, locale: locale, labels: labels),
    selection: components(value), environmentLocale: environmentLocale, device: device)
}

private func model(
  _ value: String? = "07:30", hourCycle: TanreiTimePickerHourCycle = .h12, entryMode: TanreiTimePickerEntryMode = .dial,
  unit: TanreiTimePickerUnit = .hour, locale: Locale = enUS, now: TanreiTime = TanreiTime(hour: 10, minute: 5)!
) -> TanreiTimePickerModel {
  TanreiTimePickerModel(configuration: configuration(value, hourCycle: hourCycle, entryMode: entryMode, unit: unit, locale: locale), now: now)
}

// MARK: - Fixtures (one per spec fixture)

/// Draws a fixture of specs/time-picker.spec.json in place: `TanreiTimePickerSurface` on the fixture's stage (TMP-1's verify),
/// its fields' text drawn as text and unfocused.
@MainActor
enum TanreiTimePickerFixtures {
  static let stage = CGSize(width: 480, height: 640)
  static let horizontalStage = CGSize(width: 720, height: 480)

  static func stage(_ fixture: SpecFixture) -> CGSize {
    fixture.string("layout") == "horizontal" ? horizontalStage : stage
  }

  static func view(
    _ fixture: SpecFixture, onChange: @escaping @MainActor (DateComponents) -> Void = { _ in },
    onClose: @escaping @MainActor (TanreiTimePickerCloseReason) -> Void = { _ in }
  ) -> some View {
    let stage = stage(fixture)
    return TanreiTimePickerSurface(
      selection: components(fixture.string("value")), hourCycle: TanreiTimePickerHourCycle(named: fixture.string("hourCycle") ?? "locale"),
      entryMode: TanreiTimePickerEntryMode(named: fixture.string("entryMode") ?? "dial"), unit: TanreiTimePickerUnit(named: fixture.string("unit") ?? "hour"),
      layout: TanreiTimePickerLayout(named: fixture.string("layout") ?? "auto"), locale: fixture.string("locale").map { Locale(identifier: $0) },
      labels: TanreiTimePickerLabels(label: fixture.string("label") ?? TanreiTimePickerLabels().label), onChange: onChange, onClose: onClose
    )
    .frame(width: stage.width, height: stage.height)
    .environment(\.tanreiStaticTextInput, true)
  }
}

@MainActor
@Suite("TanreiTimePicker snapshots")
struct TanreiTimePickerSnapshotTests {
  /// Mirrors `fixtures` in specs/time-picker.spec.json.
  nonisolated static let fixtures = ["dial-hour", "dial-hour-ja", "dial-minute", "dial-minute-between", "dial-24h", "text", "text-24h", "horizontal"]

  static func fixture(_ id: String) throws -> SpecFixture {
    try #require(try SpecFixture.load(spec: "time-picker").first { $0.id == id })
  }

  @Test("TMP-1 TMP-7 TMP-9 TMP-10 TMP-12 TMP-13 TMP-23 TMP-24 fixture matches its baseline", arguments: fixtures)
  func fixture(_ id: String) throws {
    try Snapshot.assert(TanreiTimePickerFixtures.view(try Self.fixture(id)), named: id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    #expect(try SpecFixture.load(spec: "time-picker").map(\.id) == Self.fixtures)
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiTimePickerTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiTimePicker preset snapshots")
struct TanreiTimePickerPresetSnapshotTests {
  /// The hour dial: the preset's surface, selectors in both conditions, the period, the dial and its handle, the actions.
  nonisolated static let fixtureId = "dial-hour"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiTimePickerSnapshotTests.fixtures.contains(Self.fixtureId))
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try TanreiTimePickerSnapshotTests.fixture(Self.fixtureId)
    try Snapshot.assert(TanreiTimePickerFixtures.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}

// MARK: - Geometry read from a render

/// A rendered fixture, read in stage points (the render's inset left out).
@MainActor
private struct Rendered {
  let bitmap: Bitmap
  let stage: CGSize

  init(_ view: some View, stage: CGSize = TanreiTimePickerFixtures.stage, theme: TanreiTheme = Snapshot.theme) throws {
    bitmap = try Snapshot.render(view, theme: theme)
    self.stage = stage
  }

  func color(_ x: CGFloat, _ y: CGFloat) -> Bitmap.RGBA { pixel(bitmap, x: Snapshot.inset + x, y: Snapshot.inset + y) }

  /// The stretches of a row (or a column) whose pixels are `color`, at half-point steps.
  func runs(row y: CGFloat, _ color: Bitmap.RGBA, tolerance: Int = 3) -> [ClosedRange<CGFloat>] {
    runs(along: stride(from: 0, to: stage.width, by: 0.5)) { self.color($0, y).isClose(to: color, tolerance: tolerance) }
  }

  func runs(column x: CGFloat, _ color: Bitmap.RGBA, tolerance: Int = 3) -> [ClosedRange<CGFloat>] {
    runs(along: stride(from: 0, to: stage.height, by: 0.5)) { self.color(x, $0).isClose(to: color, tolerance: tolerance) }
  }

  private func runs(along positions: StrideTo<CGFloat>, _ matches: (CGFloat) -> Bool) -> [ClosedRange<CGFloat>] {
    var result: [ClosedRange<CGFloat>] = []
    var start: CGFloat?
    var last: CGFloat = .zero
    for position in positions {
      if matches(position) {
        if start == nil { start = position }
        last = position
      } else if let begun = start {
        result.append(begun...last)
        start = nil
      }
    }
    if let start { result.append(start...last) }
    return result
  }

  /// The container: the extent of its color along the middle row and column.
  func container(_ fill: Bitmap.RGBA = light[.surfaceBright].rgba8()) -> CGRect {
    let xs = runs(row: stage.height / 2, fill, tolerance: 2).flatMap { [$0.lowerBound, $0.upperBound] }
    let ys = runs(column: stage.width / 2, fill, tolerance: 2).flatMap { [$0.lowerBound, $0.upperBound] }
    guard let minX = xs.min(), let maxX = xs.max(), let minY = ys.min(), let maxY = ys.max() else { return .zero }
    return CGRect(x: minX, y: minY, width: maxX - minX, height: maxY - minY)
  }

  /// The dial's top and bottom edges: the longest stretch of its face down a column `dialColumn` right of the middle (clear of
  /// the numbers at the top and the centre dot), widened to the circle's full height.
  func dial(face: Bitmap.RGBA = light[.surfaceDim].rgba8()) -> ClosedRange<CGFloat>? {
    guard let chord = runs(column: stage.width / 2 + Rendered.dialColumn, face).max(by: { ($0.upperBound - $0.lowerBound) < ($1.upperBound - $1.lowerBound) })
    else { return nil }
    let radius = tokens.dialContainerSize / 2
    let rise = radius - (radius * radius - Rendered.dialColumn * Rendered.dialColumn).squareRoot()
    return (chord.lowerBound - rise)...(chord.upperBound + rise)
  }

  /// How far right of the dial's centre `dial()` looks: between the numbers at the top (12, 00; 13 on the inner ring).
  static let dialColumn: CGFloat = 16
}

/// The dial's centre and the display's top in a vertical fixture on the default stage.
@MainActor
private func dialCentre(_ rendered: Rendered) throws -> CGPoint {
  let dial = try #require(rendered.dial())
  return CGPoint(x: rendered.stage.width / 2, y: dial.lowerBound + tokens.dialContainerSize / 2)
}

/// A point on the dial: `degrees` clockwise from the top, on the outer (or inner) ring.
private func onDial(_ centre: CGPoint, degrees: Double, inner: Bool = false) -> CGPoint {
  let geometry = TanreiTimePickerDialGeometry(tokens: tokens)
  return TanreiTimePickerDialGeometry.point(center: centre, degrees: degrees, radius: inner ? geometry.inner : geometry.outer)
}

@MainActor
private func fixture(_ id: String) throws -> SpecFixture { try TanreiTimePickerSnapshotTests.fixture(id) }

/// The length of a stretch.
private func width(_ range: ClosedRange<CGFloat>) -> CGFloat { range.upperBound - range.lowerBound }

// MARK: - Presentation and surface (TMP-1, TMP-3, TMP-4, TMP-25)

@MainActor
@Suite("TanreiTimePicker surface")
struct TanreiTimePickerSurfaceTests {
  /// TMP-1 — the scrim covers the whole stage in `scrim.color`; the container is centred on it in `container.color`, at least
  /// `container.margin` from every edge, with `container.shape` corners.
  @Test("TMP-1 the scrim covers the stage; the container is centred on it, in its color, within the margins")
  func surface() throws {
    let rendered = try Rendered(TanreiTimePickerFixtures.view(try fixture("dial-hour")))
    let scrim = light[tokens.scrimColor].rgba8(over: light[.surface])
    #expect(rendered.color(2, 2).isClose(to: scrim) && rendered.color(478, 638).isClose(to: scrim))
    let container = rendered.container()
    #expect(abs(container.midX - 240) <= 1 && abs(container.midY - 320) <= 1, "\(container)")
    #expect(container.minX >= tokens.containerMargin && container.minY >= tokens.containerMargin)
    // The corner is rounded: its very corner is the scrim, a point on the diagonal inside the radius the container.
    #expect(rendered.color(container.minX + 0.5, container.minY + 0.5).isClose(to: scrim, tolerance: 12))
    #expect(rendered.color(container.minX + tokens.containerShape, container.minY + tokens.containerShape).isClose(to: light[.surfaceBright].rgba8()))
  }

  /// TMP-1 — the horizontal fixture's stage: centred there too.
  @Test("TMP-1 the horizontal surface is centred on its 720 × 480 stage")
  func horizontalCentred() throws {
    let rendered = try Rendered(TanreiTimePickerFixtures.view(try fixture("horizontal")), stage: TanreiTimePickerFixtures.horizontalStage)
    let container = rendered.container()
    #expect(abs(container.midX - 360) <= 1 && abs(container.midY - 240) <= 1, "\(container)")
    #expect(container.width > container.height)
  }

  /// TMP-4 — each reason closes once: `onClose`, then `false` written to the binding; nothing while it is closed already.
  @Test("TMP-4 a close is reported once with its reason, then the binding is written false")
  func close() {
    var open = true
    var reasons: [TanreiTimePickerCloseReason] = []
    let binding = Binding(get: { open }, set: { open = $0 })
    for reason in TanreiTimePickerCloseReason.allCases {
      open = true
      TanreiTimePickerRules.close(binding, reason: reason) { reasons.append($0) }
      #expect(!open)
      TanreiTimePickerRules.close(binding, reason: reason) { reasons.append($0) }
    }
    #expect(reasons == [.escape, .back, .outside, .cancel, .confirm])
    #expect(TanreiTimePickerCloseReason.allCases.map(\.rawValue) == ["escape", "back", "outside", "cancel", "confirm"])
  }

  /// TMP-25 — in over `motion.open-*`, out over `motion.close-*`, growing from `motion.enter-scale`; under Reduce Motion it
  /// fades without growing.
  @Test("TMP-25 the motions and the scale come from the tokens; under Reduce Motion it fades without growing")
  func motion() {
    #expect(tokens.openMotion() == TanreiMotion.animation(durationMs: tokens.motionOpenDuration, easing: tokens.motionOpenEasing, reduceMotion: false))
    #expect(tokens.closeMotion() == TanreiMotion.animation(durationMs: tokens.motionCloseDuration, easing: tokens.motionCloseEasing, reduceMotion: false))
    #expect(tokens.hiddenScale(reduceMotion: false) == CGFloat(tokens.motionEnterScale))
    #expect(tokens.hiddenScale(reduceMotion: true) == 1)
    var modified = tokens
    modified.motionOpenDuration = 900
    modified.motionEnterScale = 0.5
    #expect(modified.openMotion() != tokens.openMotion() && modified.hiddenScale(reduceMotion: false) == 0.5)
  }
}

// MARK: - Clocks, locales and names (TMP-6, TMP-9, TMP-10, TMP-26, TMP-27, TMP-29)

@MainActor
@Suite("TanreiTimePicker locale")
struct TanreiTimePickerLocaleTests {
  /// TMP-6 — h12 and h23 say which clock; locale takes the device's choice where it is reported, else the locale's preferred
  /// clock (0 to 11 counts as 12-hour, 1 to 24 as 24-hour).
  @Test("TMP-6 the clock: h12, h23, or the device's choice over the locale's")
  func clock() {
    #expect(TanreiTimePickerRules.twelve(hourCycle: .h12, device: false, localeTwelve: false))
    #expect(!TanreiTimePickerRules.twelve(hourCycle: .h23, device: true, localeTwelve: true))
    #expect(TanreiTimePickerRules.twelve(hourCycle: .locale, device: true, localeTwelve: false))
    #expect(!TanreiTimePickerRules.twelve(hourCycle: .locale, device: false, localeTwelve: true))
    #expect(TanreiTimePickerRules.twelve(hourCycle: .locale, device: nil, localeTwelve: true))
    #expect(TanreiTimePickerLocale(enUS).localeTwelve)
    #expect(!TanreiTimePickerLocale(Locale(identifier: "en_GB")).localeTwelve)
    #expect(!TanreiTimePickerLocale(Locale(identifier: "de_DE")).localeTwelve)
    #expect(TanreiTimePickerLocale.isTwelve(TanreiTimePickerLocale.fields("K:mm a")) == true)
    #expect(TanreiTimePickerLocale.isTwelve(TanreiTimePickerLocale.fields("k:mm")) == false)
    // Through the configuration: the device's choice wins while hourCycle is locale; never over h12 or h23.
    #expect(configuration(hourCycle: .locale, locale: Locale(identifier: "de_DE"), device: .some(true)).twelve)
    #expect(!configuration(hourCycle: .locale, locale: enUS, device: .some(false)).twelve)
    #expect(configuration(hourCycle: .locale, locale: enUS, device: .some(nil)).twelve)
    #expect(configuration(hourCycle: .h12, locale: Locale(identifier: "de_DE"), device: .some(false)).twelve)
    // value is 24-hour in every cycle.
    #expect(model("19:30", hourCycle: .h12).pending == time(19, 30) && model("19:30", hourCycle: .h23).pending == time(19, 30))
  }

  /// TMP-9 — the hour as the locale writes an hour of the clock in use ("7" with h12, "07" with h23 in en-US), the minute with
  /// two digits, in the locale's digits; the separator the locale writes between hours and minutes.
  @Test("TMP-9 hours, minutes, digits and the separator come from the locale")
  func text() {
    #expect(model("07:30").shown(.hour) == "7" && model("07:30").shown(.minute) == "30")
    #expect(model("07:05", hourCycle: .h23).shown(.hour) == "07" && model("07:05", hourCycle: .h23).shown(.minute) == "05")
    #expect(model("00:00").shown(.hour) == "12" && model("12:00").shown(.hour) == "12" && model("13:00").shown(.hour) == "1")
    #expect(TanreiTimePickerLocale(enUS).separator == ":")
    #expect(TanreiTimePickerLocale(Locale(identifier: "fi_FI")).separator == ".")
    let arabic = TanreiTimePickerLocale(Locale(identifier: "ar_EG"))
    #expect(arabic.number(7, digits: 2) == "٠٧", "\(arabic.digits)")
    #expect(arabic.minuteText(45) == "٤٥")
  }

  /// TMP-10 — the period goes where the locale's 12-hour pattern writes it: after the minutes in English, before the hour in
  /// Japanese, Chinese and Korean; named as the locale names the periods.
  @Test("TMP-10 the period's place and names come from the locale's own pattern")
  func period() {
    #expect(!TanreiTimePickerLocale(enUS).periodBefore)
    for identifier in ["ja_JP", "zh_CN", "ko_KR"] { #expect(TanreiTimePickerLocale(Locale(identifier: identifier)).periodBefore, "\(identifier)") }
    #expect(TanreiTimePickerLocale(enUS).periodNames == ["AM", "PM"])
    #expect(TanreiTimePickerLocale(Locale(identifier: "ja_JP")).periodNames == ["午前", "午後"])
    // A pattern's fields and quoted literals.
    #expect(TanreiTimePickerLocale.fields("a h'h' mm").map(\.text) == ["a", " ", "h", "h ", "mm"])
    #expect(TanreiTimePickerLocale.fields("H.mm").map(\.isField) == [true, false, true])
  }

  /// TMP-26 — a selector's value is its text as drawn, the period's name added to the hour's on the 12-hour clock, where the
  /// locale writes it.
  @Test("TMP-26 the selectors' values as read")
  func spoken() {
    #expect(model("07:30").spokenValue(.hour) == "7 AM" && model("07:30").spokenValue(.minute) == "30")
    #expect(model("19:30", locale: Locale(identifier: "ja_JP")).spokenValue(.hour) == "午後 7")
    #expect(model("19:30", hourCycle: .h23).spokenValue(.hour) == "19")
  }

  /// TMP-27 — the locale is the prop's, or the `\.locale` environment's while it is empty.
  @Test("TMP-27 locale from the prop, else the environment")
  func locale() {
    let japanese = Locale(identifier: "ja_JP")
    #expect(configuration(locale: nil, environmentLocale: japanese).text.periodNames == ["午前", "午後"])
    #expect(configuration(locale: enUS, environmentLocale: japanese).text.periodNames == ["AM", "PM"])
  }

  /// TMP-29 — an unknown hourCycle, entryMode, unit or layout behaves as the default and is reported; a value that is not a
  /// time of day is empty, reported; an empty label still opens, reported.
  @Test("TMP-29 unknown names behave as the defaults; a bad value is empty; an empty label is reported")
  func unknown() throws {
    let (values, reports) = Reports.collecting {
      (
        TanreiTimePickerHourCycle(named: "h24"), TanreiTimePickerEntryMode(named: "wheel"), TanreiTimePickerUnit(named: "second"),
        TanreiTimePickerLayout(named: "diagonal")
      )
    }
    #expect(values.0 == .locale && values.1 == .dial && values.2 == .hour && values.3 == .auto)
    #expect(reports.messages.count == 4 && reports.messages.allSatisfy { $0.contains("TMP-29") })
    #expect(TanreiTimePickerHourCycle(named: "h23") == .h23 && TanreiTimePickerLayout(named: "horizontal") == .horizontal)
    let bad = configuration("24:00")
    #expect(bad.committed == nil && bad.problems.count == 1)
    #expect(configuration(nil).problems.isEmpty && TanreiTime(DateComponents(hour: 7)) == nil)
    let unnamed = configuration(labels: TanreiTimePickerLabels(label: ""))
    #expect(unnamed.problems.count == 1 && unnamed.problems[0].contains("accessible name"))
    let (_, reported) = Reports.collecting { bad.report() }
    #expect(reported.mention("TMP-29"))
    // It still opens and draws.
    let (drawn, _) = try Reports.collecting { try Rendered(TanreiTimePickerSurface(selection: nil, labels: TanreiTimePickerLabels(label: "")).frame(width: 480, height: 640)) }
    #expect(drawn.container().height > tokens.dialContainerSize)
  }
}

// MARK: - The model (TMP-2, TMP-5, TMP-11, TMP-14 … TMP-16, TMP-23, TMP-24)

@MainActor
@Suite("TanreiTimePicker behaviour")
struct TanreiTimePickerBehaviourTests {
  /// TMP-2 — focus moves in to the selector of unit while the dial is shown, to the hour field in text entry; the dial shows
  /// that unit.
  @Test("TMP-2 the opening focus is the selector of unit, or the hour field")
  func openingFocus() {
    #expect(model().openingFocus == .hour && model(unit: .minute).openingFocus == .minute)
    #expect(model(entryMode: .text).openingFocus == .field(0) && model(entryMode: .text, unit: .minute).openingFocus == .field(0))
    #expect(model(unit: .minute).unit == .minute)
  }

  /// TMP-5 — the pending time starts as the value or, while it is empty, as the device's time; OK writes it only when it
  /// differs (or the value was empty); OK is disabled while a field holds text that is not a number of its unit.
  @Test("TMP-5 the pending time, what OK commits, and when OK is disabled")
  func pending() {
    var picker = model("07:30")
    #expect(picker.pending == time(7, 30) && picker.change(from: time(7, 30)) == nil && picker.canConfirm)
    picker.set(time(8, 0))
    #expect(picker.change(from: time(7, 30)) == time(8, 0))
    picker.set(time(7, 30))
    #expect(picker.change(from: time(7, 30)) == nil)
    let empty = model(nil, now: time(10, 5))
    #expect(empty.pending == time(10, 5) && empty.change(from: nil) == time(10, 5))
    var text = model("07:30", entryMode: .text)
    text.edit(0, text: "")
    #expect(!text.canConfirm)
    text.edit(0, text: "9")
    #expect(text.canConfirm && text.change(from: time(7, 30)) == time(9, 30))
    // The device's time, to the minute.
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(identifier: "UTC")!
    #expect(TanreiTime.now(calendar: calendar, at: Date(timeIntervalSince1970: 3600 * 19 + 60 * 45 + 59)) == time(19, 45))
  }

  /// TMP-5 — a value the product sets while the picker is open does not change the pending time, and OK compares the pending
  /// time with the value as it is when OK is activated: confirming the time the person saw commits it. The value at OK is read
  /// from `selection` as the picker reads it there (a value that is not a time of day is empty, TMP-29).
  @Test("TMP-5 OK compares with the value as it is at OK, one set while the picker is open included")
  func valueSetWhileOpen() {
    // Opened on 07:30; the model is made once, when the picker opens.
    let picker = model("07:30")
    // The product sets 08:00 while it is open: the pending time stays 07:30, and OK commits it.
    let written = components("08:00").flatMap { TanreiTime($0) }
    #expect(written == time(8, 0))
    #expect(picker.pending == time(7, 30) && picker.shown(.hour) == "7" && picker.shown(.minute) == "30")
    #expect(picker.change(from: written) == time(7, 30))
    // The product sets the time the person confirms: nothing to commit.
    #expect(picker.change(from: time(7, 30)) == nil)
    // The product empties it, or sets a value that is not a time of day, while it is open: OK commits the pending time.
    #expect(picker.change(from: nil) == time(7, 30))
    #expect(picker.change(from: TanreiTime(DateComponents(hour: 24, minute: 0))) == time(7, 30))
  }

  /// TMP-11 — a period keeps the hour's number (7 before noon becomes 7 after noon, 19:00).
  @Test("TMP-11 choosing a period keeps the hour's number")
  func period() {
    var picker = model("07:00")
    picker.choosePeriod(1)
    #expect(picker.pending == time(19, 0) && picker.period == 1)
    picker.choosePeriod(0)
    #expect(picker.pending == time(7, 0))
    var midnight = model("00:15")
    midnight.choosePeriod(1)
    #expect(midnight.pending == time(12, 15))
  }

  /// TMP-14 — a press or a drag on the dial sets the value whose angle is nearest (on the 24-hour hour dial, on the nearer
  /// ring; any minute on the minute dial); its end on the hour dial shows the minute dial.
  @Test("TMP-14 the dial sets the nearest value; letting go of the hour dial shows the minutes")
  func dial() {
    let geometry = TanreiTimePickerDialGeometry(tokens: tokens)
    func value(_ degrees: Double, radius: CGFloat, unit: TanreiTimePickerUnit, from start: TanreiTime = time(7, 30), twelve: Bool = true) -> TanreiTime {
      let point = TanreiTimePickerDialGeometry.point(center: .zero, degrees: degrees, radius: radius)
      return TanreiTimePickerRules.dialValue(dx: point.x, dy: point.y, unit: unit, time: start, twelve: twelve, outer: geometry.outer, inner: geometry.inner)
    }
    #expect(value(90, radius: geometry.outer, unit: .hour) == time(3, 30))
    #expect(value(14, radius: geometry.outer, unit: .hour) == time(0, 30), "12 before noon")
    #expect(value(90, radius: geometry.outer, unit: .hour, from: time(19, 30)) == time(15, 30), "keeps the period")
    #expect(value(90, radius: geometry.outer, unit: .hour, twelve: false) == time(3, 30))
    #expect(value(90, radius: geometry.inner, unit: .hour, twelve: false) == time(15, 30))
    #expect(value(0, radius: geometry.inner + 2, unit: .hour, twelve: false) == time(12, 30))
    #expect(value(192, radius: geometry.outer, unit: .minute) == time(7, 32), "any minute")
    #expect(value(358, radius: 5, unit: .minute) == time(7, 0))
    var picker = model("07:30")
    picker.dialSet(time(3, 30))
    #expect(picker.dragging && picker.pending == time(3, 30) && picker.unit == .hour)
    let released = picker.dialReleased()
    #expect(released)
    #expect(!picker.dragging && picker.unit == .minute)
    picker.dialSet(time(3, 10))
    let again = picker.dialReleased()
    #expect(!again && picker.unit == .minute)
  }

  /// TMP-15 — the handle travels the shorter arc (unwrapped angles); under Reduce Motion the changes are immediate.
  @Test("TMP-15 the handle takes the shorter arc; no dial motion under Reduce Motion")
  func handle() {
    #expect(TanreiTimePickerRules.turn(from: 354, to: 0) == 360)
    #expect(TanreiTimePickerRules.turn(from: 6, to: 354) == -6)
    #expect(TanreiTimePickerRules.turn(from: 720, to: 90) == 810)
    var picker = model("07:59", unit: .minute)
    #expect(picker.handleAngle == 354)
    let pressed = picker.press(.up, on: .minute)
    #expect(pressed)
    #expect(picker.pending == time(7, 0) && picker.handleAngle == 360)
    picker.show(.hour)
    #expect(picker.handleAngle == 210, "7 is at 210 degrees: from 360 the shorter way is back")
    #expect(tokens.dialMotion(reduceMotion: true) == nil && tokens.dialMotion(reduceMotion: false) != nil)
    #expect(tokens.dialMotion(reduceMotion: false) == TanreiMotion.animation(durationMs: tokens.motionDialDuration, easing: tokens.motionDialEasing, reduceMotion: false))
  }

  /// TMP-16 — Up and Right one later, Down and Left one earlier, wrapping without changing the other unit or the period;
  /// Page Up and Down five minutes; Home and End the first and last value; the increment and decrement actions as Up and Down;
  /// a selector that is focused or pressed shows its unit.
  @Test("TMP-16 the selectors' keys and adjustable actions")
  func keys() {
    func after(_ key: TanreiTimePickerKey, _ unit: TanreiTimePickerUnit, _ start: String, hourCycle: TanreiTimePickerHourCycle = .h12) -> String? {
      var picker = model(start, hourCycle: hourCycle)
      return picker.press(key, on: unit) ? picker.pending.description : nil
    }
    #expect(after(.up, .hour, "11:30") == "00:30", "11 to 12, before noon")
    #expect(after(.up, .hour, "00:30") == "01:30", "12 to 1, before noon")
    #expect(after(.up, .hour, "12:30") == "13:30", "12 to 1, after noon")
    #expect(after(.down, .hour, "01:30") == "00:30", "1 to 12 keeps the period")
    #expect(after(.right, .hour, "23:30", hourCycle: .h23) == "00:30" && after(.left, .hour, "00:30", hourCycle: .h23) == "23:30")
    #expect(after(.up, .minute, "07:59") == "07:00" && after(.down, .minute, "07:00") == "07:59")
    #expect(after(.pageUp, .minute, "07:58") == "07:03" && after(.pageDown, .minute, "07:02") == "07:57")
    #expect(after(.pageUp, .hour, "07:30") == nil)
    #expect(after(.home, .hour, "19:30") == "13:30" && after(.end, .hour, "19:30") == "12:30")
    #expect(after(.home, .hour, "19:30", hourCycle: .h23) == "00:30" && after(.end, .hour, "07:30", hourCycle: .h23) == "23:30")
    #expect(after(.home, .minute, "07:30") == "07:00" && after(.end, .minute, "07:30") == "07:59")
    var picker = model("07:30")
    picker.adjust(.minute, increment: true)
    #expect(picker.pending == time(7, 31))
    picker.adjust(.hour, increment: false)
    #expect(picker.pending == time(6, 31))
    picker.show(.minute)
    #expect(picker.unit == .minute && TanreiTimePickerFocus.selector(.minute) == .minute)
    #expect(TanreiTimePickerKey(.upArrow) == .up && TanreiTimePickerKey(.end) == .end && TanreiTimePickerKey(.space) == nil)
    #expect(TanreiTimePickerKey.equivalents.count == TanreiTimePickerKey.allCases.count)
  }

  /// TMP-23 — a whole number of the field's unit (ASCII or the locale's digits) becomes the pending hour or minute; a commit
  /// of anything else, empty included, puts the field in error; the next edit clears it; typing never reformats.
  @Test("TMP-23 the fields: numbers of their unit, errors on commit, cleared by the next edit")
  func fields() {
    var picker = model("07:30", entryMode: .text)
    #expect(picker.texts == ["7", "30"])
    picker.edit(0, text: "99")
    #expect(picker.pending == time(7, 30) && picker.errors == [false, false] && picker.texts[0] == "99")
    picker.commit(0)
    #expect(picker.errors == [true, false] && !picker.canConfirm)
    picker.edit(0, text: "8")
    #expect(picker.errors == [false, false] && picker.pending == time(8, 30))
    picker.edit(1, text: "٥")
    #expect(picker.pending == time(8, 5) && picker.texts[1] == "٥")
    picker.edit(1, text: "")
    picker.commit(1)
    #expect(picker.errors == [false, true])
    #expect(TanreiTimePickerRules.fieldNumber(.hour, "0", twelve: true) == nil && TanreiTimePickerRules.fieldNumber(.hour, "12", twelve: true) == 12)
    #expect(TanreiTimePickerRules.fieldNumber(.hour, "0", twelve: false) == 0 && TanreiTimePickerRules.fieldNumber(.hour, "24", twelve: false) == nil)
    #expect(TanreiTimePickerRules.fieldNumber(.minute, "59", twelve: true) == 59 && TanreiTimePickerRules.fieldNumber(.minute, "5a", twelve: true) == nil)
    #expect(TanreiTimePickerRules.fieldNumber(.minute, " 7 ", twelve: true) == 7 && TanreiTimePickerRules.fieldNumber(.minute, "007", twelve: true) == nil)
    var afterNoon = model("19:30", entryMode: .text)
    afterNoon.edit(0, text: "8")
    #expect(afterNoon.pending == time(20, 30), "the period is kept")
    #expect(TanreiTimePickerRules.fieldMaxLength == 2)
  }

  /// TMP-24 — the toggle switches between the dial and text entry and keeps the pending time; the dial comes back on hours.
  @Test("TMP-24 the entry-mode toggle keeps the pending time")
  func toggle() {
    var picker = model("07:30", unit: .minute)
    picker.set(time(9, 15))
    picker.toggleEntry()
    #expect(picker.entry == .text && picker.texts == ["9", "15"] && picker.pending == time(9, 15))
    picker.edit(1, text: "40")
    picker.toggleEntry()
    #expect(picker.entry == .dial && picker.unit == .hour && picker.pending == time(9, 40))
  }
}

// MARK: - The dial (TMP-12, TMP-13, TMP-28)

@MainActor
@Suite("TanreiTimePicker dial")
struct TanreiTimePickerDialTests {
  /// TMP-12 — twelve numbers at twelve angles clockwise from the top: 12, 1 … 11 (12-hour); 00 … 11 outside and 12 … 23 on
  /// the inner ring (24-hour); 00, 05 … 55 (minutes). The rings' radii come from the tokens.
  @Test("TMP-12 the numbers and the rings")
  func numbers() {
    #expect(TanreiTimePickerRules.numbers(.hour, twelve: true).map(\.value) == [12] + Array(1...11))
    let day = TanreiTimePickerRules.numbers(.hour, twelve: false)
    #expect(day.filter { !$0.inner }.map(\.value) == Array(0...11) && day.filter(\.inner).map(\.value) == Array(12...23))
    #expect(TanreiTimePickerRules.numbers(.minute, twelve: true).map(\.value) == stride(from: 0, to: 60, by: 5).map { $0 })
    #expect(TanreiTimePickerRules.numbers(.minute, twelve: true)[3].degrees == 90)
    let geometry = TanreiTimePickerDialGeometry(tokens: tokens)
    #expect(geometry.outer == tokens.dialContainerSize / 2 - tokens.dialPadding - tokens.dialHandleSize / 2)
    #expect(geometry.inner == geometry.outer - tokens.dialHandleSize)
    // Clockwise from the top: 90 degrees is to the right.
    let right = geometry.point(degrees: 90, radius: 10)
    #expect(abs(right.x - (geometry.size / 2 + 10)) < 0.001 && abs(right.y - geometry.size / 2) < 0.001)
    #expect(model("07:30", hourCycle: .h23).text.number(7, digits: 2) == "07")
  }

  /// TMP-13 — the handle over the pending value (an hour at its number, on the inner ring for 12 to 23 on the 24-hour clock; a
  /// minute at six degrees a minute), the number under it in `dial.selected-label.color`, and a dot in the handle for a minute
  /// between two numbers.
  @Test("TMP-13 the handle over the value; its number in the selected label color; the dot between numbers")
  func handle() throws {
    #expect(TanreiTimePickerRules.dialPosition(.hour, time(19, 0), twelve: false) == (210, true))
    #expect(TanreiTimePickerRules.dialPosition(.hour, time(19, 0), twelve: true) == (210, false))
    #expect(TanreiTimePickerRules.dialPosition(.minute, time(7, 32), twelve: true) == (192, false))
    let rendered = try Rendered(TanreiTimePickerFixtures.view(try fixture("dial-hour")))
    let handle = onDial(try dialCentre(rendered), degrees: 210)
    let primary = light[.primary].rgba8()
    // The handle's edge is its color; somewhere in it the "7" is drawn in the selected label color.
    #expect(rendered.color(handle.x, handle.y - tokens.dialHandleSize / 2 + 3).isClose(to: primary, tolerance: 6))
    let inside = stride(from: handle.x - 6, through: handle.x + 6, by: 0.5).flatMap { x in
      stride(from: handle.y - 8, through: handle.y + 8, by: 0.5).map { rendered.color(x, $0) }
    }
    #expect(inside.contains { $0.isClose(to: light[.onPrimary].rgba8(), tolerance: 6) })
    let between = try Rendered(TanreiTimePickerFixtures.view(try fixture("dial-minute-between")))
    let dot = onDial(try dialCentre(between), degrees: 192)
    #expect(between.color(dot.x, dot.y).isClose(to: light[.onPrimary].rgba8(), tolerance: 6))
    let onFive = try Rendered(TanreiTimePickerFixtures.view(try fixture("dial-minute")))
    let noDot = onDial(try dialCentre(onFive), degrees: 270)
    #expect(!onFive.color(noDot.x + tokens.dialHandleSize / 2 - 4, noDot.y).isClose(to: light[.onPrimary].rgba8(), tolerance: 6))
  }

  /// TMP-12 / TMP-28 — the dial runs clockwise in every layout direction: right to left draws it identically.
  @Test("TMP-12 TMP-28 the dial is not mirrored right to left")
  func notMirrored() throws {
    let picker = model("07:30")
    let dial = TanreiTimePickerDial(model: picker, onSet: { _ in }, onRelease: {})
    let ltr = try Snapshot.renderExact(dial.environment(\.layoutDirection, .leftToRight))
    let rtl = try Snapshot.renderExact(dial.environment(\.layoutDirection, .rightToLeft))
    #expect(ltr.pixels == rtl.pixels)
  }

  /// TMP-28 — right to left mirrors the period's place (and the columns and the actions), never the order of the hour, the
  /// separator and the minute.
  @Test("TMP-28 right to left: the period moves to the other side; hour, separator and minute stay left to right")
  func rightToLeft() throws {
    func periodAndHour(_ direction: LayoutDirection) throws -> (period: CGFloat, hour: CGFloat, minute: CGFloat) {
      let rendered = try Rendered(TanreiTimePickerFixtures.view(try fixture("dial-hour")).environment(\.layoutDirection, direction))
      let dial = try #require(rendered.dial())
      let row = dial.lowerBound - tokens.containerGap - tokens.selectorContainerHeight + 4
      let period = try #require(rendered.runs(row: row, light[.primary].rgba8()).max { width($0) < width($1) })
      let boxes = rendered.runs(row: row, light[.surfaceDim].rgba8()).filter { $0.upperBound - $0.lowerBound > 40 }
      try #require(boxes.count == 2, "\(boxes)")
      // The hour selector is the one outlined (selected: its outline is primary just outside its fill).
      let outlined = boxes.first { rendered.color($0.lowerBound - 1, row).isClose(to: light[.primary].rgba8(), tolerance: 40) }
      let hour = try #require(outlined)
      let minute = try #require(boxes.first { $0 != hour })
      return ((period.lowerBound + period.upperBound) / 2, hour.lowerBound, minute.lowerBound)
    }
    let ltr = try periodAndHour(.leftToRight)
    let rtl = try periodAndHour(.rightToLeft)
    #expect(ltr.period > 240 && rtl.period < 240, "\(ltr) \(rtl)")
    #expect(ltr.hour < ltr.minute && rtl.hour < rtl.minute)
  }
}

// MARK: - States (TMP-17 … TMP-22)

@MainActor
@Suite("TanreiTimePicker states")
struct TanreiTimePickerStateTests {
  private func appearance(
    _ condition: TanreiTimePickerCondition, _ part: TanreiTimePickerPartKind, _ state: TanreiInteraction, in system: TanreiSystem = .tanrei,
    feedback: TanreiPressedFeedback = .overlay, beneath: TanreiInteraction = .enabled
  ) -> TanreiTimePickerAppearance {
    TanreiTimePickerAppearance(tokens: system.timePicker, condition: condition, part: part, state: state, feedback: feedback, beneath: beneath)
  }

  /// TMP-17 / TMP-9 / TMP-10 — every part of a selector and a segment comes from its condition's tokens in the state drawn;
  /// the selector whose unit the dial shows (and the chosen period) is selected. Proven with a modified system.
  @Test("TMP-17 TMP-9 TMP-10 each condition and state reads its own tokens")
  func tokensDriveTheParts() {
    var system = TanreiSystem.tanrei
    system.timePicker.conditions.selected.focused.selectorContainerColor = .role(.error)
    system.timePicker.conditions.selected.focused.selectorOutlineColor = .role(.onError)
    system.timePicker.conditions.selected.focused.selectorOutlineWidth = 5
    system.timePicker.conditions.unselected.hovered.periodContainerColor = .role(.secondary)
    system.timePicker.conditions.unselected.hovered.periodLabelColor = .role(.onSecondary)
    system.timePicker.focused.opacity = 0.5
    let focused = appearance(.selected, .selector, .focused, in: system)
    #expect(focused.container == .role(.error) && focused.outline == .role(.onError) && focused.outlineWidth == 5 && focused.opacity == 0.5)
    let hovered = appearance(.unselected, .period, .hovered, in: system)
    #expect(hovered.container == .role(.secondary) && hovered.label == .role(.onSecondary) && hovered.outline == .none && hovered.outlineWidth == 0)
    let rest = appearance(.selected, .selector, .enabled)
    #expect(rest.container == tokens.conditions.selected.enabled.selectorContainerColor && rest.opacity == 1)
    #expect(rest.outline == tokens.conditions.selected.enabled.selectorOutlineColor && rest.outline != appearance(.unselected, .selector, .enabled).outline)
    #expect(model("07:30").unit == .hour && model("07:30", unit: .minute).unit == .minute)
    // An unknown condition reads the default's tokens, reported.
    let (unknown, reports) = Reports.collecting { appearance(TanreiTimePickerCondition(rawValue: "armed"), .selector, .enabled) }
    #expect(unknown == appearance(.unselected, .selector, .enabled) && reports.mention("armed"))
  }

  /// TMP-17's verify — under the acme fixture system, which values hovered, focused and pressed differently, each state draws
  /// its own tokens; the colors change over the state motion, at once under Reduce Motion.
  @Test("TMP-17 under acme, hovered, focused and pressed differ; the state motion comes from the tokens")
  func acme() {
    for part in [TanreiTimePickerPartKind.selector, .period] {
      for condition in [TanreiTimePickerCondition.unselected, .selected] {
        let drawn = [TanreiInteraction.enabled, .hovered, .focused, .pressed].map { appearance(condition, part, $0, in: .acme) }
        #expect(Set(drawn.map { "\($0.container)" }).count == 4, "\(part) \(condition)")
      }
    }
    #expect(tokens.stateMotion(reduceMotion: true) == nil)
    #expect(tokens.stateMotion(reduceMotion: false) == TanreiMotion.animation(durationMs: tokens.motionStateDuration, easing: tokens.motionStateEasing, reduceMotion: false))
  }

  /// A selector (or a segment) drawn alone by its style.
  private func part(
    _ part: TanreiTimePickerPart, condition: TanreiTimePickerCondition = .selected, focused: Bool = false, text: String = "7"
  ) -> some View {
    Button(action: {}) { Text(verbatim: text) }
      .buttonStyle(TanreiTimePickerPartStyle(part: part, condition: condition, isFocused: focused, keyPresses: 0))
      .padding(TanreiSystem.tanrei.space.space200)
  }

  /// TMP-18 — keyboard focus shows the ring around the container, never animated; without focus there is none.
  @Test("TMP-18 keyboard focus shows the focus ring around the container")
  func focusRing() throws {
    let plain = try Snapshot.render(part(.selector))
    let focused = try Snapshot.render(part(.selector, focused: true))
    // Just outside the container's left edge, halfway down: the ring's outer stroke.
    let measure = TanreiSystem.tanrei.measure
    let x = Snapshot.inset + TanreiSystem.tanrei.space.space200 - measure.focusOffset - measure.focusInnerWidth - measure.focusOuterWidth / 2
    let y = Snapshot.inset + TanreiSystem.tanrei.space.space200 + tokens.selectorContainerHeight / 2
    #expect(pixel(focused, x: x, y: y).isClose(to: light[.focusRing].rgba8(), tolerance: 12))
    #expect(!pixel(plain, x: x, y: y).isClose(to: light[.focusRing].rgba8(), tolerance: 12))
  }

  /// TMP-20 — the pressed answer as `sys.behavior.pressed-feedback` names it: overlay draws the pressed tokens; ripple keeps
  /// the container of the state beneath and grows the pressed container as the ripple; dim keeps the container beneath and
  /// draws the pressed opacity; none draws the state beneath. m3-like is ripple, cupertino dim, the default overlay.
  @Test("TMP-20 the pressed answer under overlay, ripple, dim and none")
  func pressedFeedback() {
    let system = TanreiSystem.acme
    let pressed = system.timePicker.conditions.selected.pressed
    let focused = system.timePicker.conditions.selected.focused
    let overlay = appearance(.selected, .selector, .pressed, in: system, feedback: .overlay, beneath: .focused)
    #expect(overlay.container == pressed.selectorContainerColor && overlay.ripple == nil)
    let ripple = appearance(.selected, .period, .pressed, in: system, feedback: .ripple, beneath: .focused)
    #expect(ripple.container == focused.periodContainerColor && ripple.ripple == pressed.periodContainerColor && ripple.label == pressed.periodLabelColor)
    let dim = appearance(.selected, .selector, .pressed, in: system, feedback: .dim, beneath: .focused)
    #expect(dim.container == focused.selectorContainerColor && dim.ripple == nil && dim.opacity == system.timePicker.pressed.opacity)
    let none = appearance(.selected, .selector, .pressed, in: system, feedback: .none, beneath: .focused)
    #expect(none == appearance(.selected, .selector, .focused, in: system))
    #expect(TanreiSystem.m3Like.behavior.pressedFeedback == .ripple && TanreiSystem.cupertino.behavior.pressedFeedback == .dim)
    #expect(TanreiSystem.tanrei.behavior.pressedFeedback == .overlay)
    #expect(tokens.rippleGrowth(reduceMotion: true) == nil)
  }

  /// TMP-21 — the corners ease by the corner smoothing (continuous above 0) and keyboard focus follows the focus style (the
  /// acme fixture system is glow).
  @Test("TMP-21 corner smoothing and the focus style reach the selector and the segment")
  func cornersAndFocusStyle() throws {
    var round = TanreiSystem.tanrei
    round.shape.cornerSmoothing = 0
    var smooth = TanreiSystem.tanrei
    smooth.shape.cornerSmoothing = 0.6
    smooth.timePicker.selectorContainerShape = 20
    round.timePicker.selectorContainerShape = 20
    #expect(try Snapshot.renderExact(part(.selector), theme: theme(round)).pixels != Snapshot.renderExact(part(.selector), theme: theme(smooth)).pixels)
    var glow = TanreiSystem.tanrei
    glow.behavior.focusStyle = .glow
    let segment = part(.period(index: 0, reach: 0), focused: true, text: "AM")
    #expect(try Snapshot.renderExact(segment).pixels != Snapshot.renderExact(segment, theme: theme(glow)).pixels)
    #expect(TanreiSystem.acme.behavior.focusStyle == .glow && TanreiSystem.cupertino.shape.cornerSmoothing > 0)
  }

  /// TMP-22 — a selector is drawn at least the target in each dimension, a segment at least the target wide (both are also at
  /// least their own tokens).
  @Test("TMP-22 the selectors and the segments are at least the target")
  func target() throws {
    var system = TanreiSystem.tanrei
    system.measure.targetPointer = 90
    system.measure.targetTouch = 90
    func size(_ view: some View, _ system: TanreiSystem) throws -> CGSize {
      let bitmap = try Snapshot.render(view, theme: theme(system))
      let pad = TanreiSystem.tanrei.space.space200
      return CGSize(width: CGFloat(bitmap.width) / Snapshot.scale - 2 * Snapshot.inset - 2 * pad, height: CGFloat(bitmap.height) / Snapshot.scale - 2 * Snapshot.inset - 2 * pad)
    }
    #expect(try size(part(.selector), .tanrei) == CGSize(width: tokens.selectorContainerWidth, height: tokens.selectorContainerHeight))
    #expect(try size(part(.selector), system) == CGSize(width: 90, height: 90))
    #expect(try size(part(.period(index: 0, reach: 0), text: "AM").frame(height: 64), system).width == 90)
    #expect(try size(part(.period(index: 0, reach: 0), text: "AM").frame(height: 64), .tanrei).width == tokens.periodContainerWidth)
  }
}

// MARK: - Layouts and scrolling (TMP-7, TMP-8)

@MainActor
@Suite("TanreiTimePicker layout")
struct TanreiTimePickerLayoutTests {
  private func picker(_ layout: TanreiTimePickerLayout, entry: TanreiTimePickerEntryMode = .dial, stage: CGSize, dynamicType: DynamicTypeSize = .large) -> some View {
    TanreiTimePickerSurface(selection: DateComponents(hour: 7, minute: 30), hourCycle: .h12, entryMode: entry, layout: layout, locale: enUS)
      .frame(width: stage.width, height: stage.height)
      .environment(\.dynamicTypeSize, dynamicType)
      .environment(\.tanreiStaticTextInput, true)
  }

  /// TMP-7 — vertical stacks the label, the time and the dial (taller than wide); horizontal puts the dial beside them (wider
  /// than tall); auto is vertical where it fits, horizontal where only that fits, else vertical; text entry is always the
  /// vertical arrangement.
  @Test("TMP-7 vertical, horizontal and auto; text entry is vertical in every layout")
  func layouts() throws {
    let tall = CGSize(width: 480, height: 640)
    let wide = CGSize(width: 720, height: 480)
    let small = CGSize(width: 480, height: 400)
    func container(_ layout: TanreiTimePickerLayout, entry: TanreiTimePickerEntryMode = .dial, _ stage: CGSize) throws -> CGRect {
      try Rendered(picker(layout, entry: entry, stage: stage), stage: stage).container()
    }
    let vertical = try container(.vertical, wide)
    #expect(vertical.height > vertical.width, "\(vertical)")
    let horizontal = try container(.horizontal, wide)
    #expect(horizontal.width > horizontal.height, "\(horizontal)")
    #expect(try container(.auto, tall).height > container(.auto, tall).width)
    let autoWide = try container(.auto, wide)
    #expect(autoWide.width > autoWide.height, "too short for vertical and wide enough: horizontal \(autoWide)")
    let autoSmall = try container(.auto, small)
    #expect(autoSmall.height > autoSmall.width, "too narrow for horizontal: vertical \(autoSmall)")
    let text = try container(.horizontal, entry: .text, wide)
    #expect(abs(text.width - (try container(.vertical, entry: .text, wide)).width) < 1 && text.width < horizontal.width)
    // TMP-7: the label is drawn in its color; the actions `actions.margin-block-start` below the dial.
    let rendered = try Rendered(TanreiTimePickerFixtures.view(try fixture("dial-hour")))
    let dial = try #require(rendered.dial())
    let below = rendered.runs(column: 240, light[.surfaceBright].rgba8(), tolerance: 2).first { $0.lowerBound > dial.upperBound - 1 }
    #expect(abs(try #require(below).lowerBound - dial.upperBound) < 1.5, "\(dial) \(String(describing: below))")
    #expect(width(try #require(below)) >= tokens.actionsMarginBlockStart - 1)
  }

  /// TMP-8 — vertical: the label and the actions stay in place and what is between them scrolls, the container as tall as the
  /// window allows; horizontal: the whole surface scrolls as one; either way the surface never exceeds the window less the
  /// margins. With enlarged text the selectors grow rather than clip.
  @Test("TMP-8 a short window: the surface is limited to it and scrolls; enlarged text grows the selectors")
  func scrolling() throws {
    let short = CGSize(width: 480, height: 420)
    let rendered = try Rendered(picker(.vertical, stage: short), stage: short)
    let container = rendered.container()
    #expect(abs(container.height - (short.height - 2 * tokens.containerMargin)) <= 1, "\(container)")
    // The actions row is at the bottom: the dial's face does not reach into it.
    let dial = try #require(rendered.dial())
    #expect(dial.upperBound < container.maxY - tokens.containerPadding - tokens.selectorContainerHeight / 2, "\(dial) \(container)")
    let flat = CGSize(width: 720, height: 240)
    let horizontal = try Rendered(picker(.horizontal, stage: flat), stage: flat).container()
    #expect(abs(horizontal.height - (flat.height - 2 * tokens.containerMargin)) <= 1, "\(horizontal)")
    // Enlarged text: macOS has no Dynamic Type, so the selectors' growth is the Gallery UI tests' (GalleryUITests, "time
    // picker"); here, the selectors' text is never cut: it is laid out at its own size, the selector growing around it.
    let wideText = try Rendered(
      Button(action: {}) { Text(verbatim: "0000") }
        .buttonStyle(TanreiTimePickerPartStyle(part: .selector, condition: .unselected, isFocused: false, keyPresses: 0)),
      stage: CGSize(width: 400, height: 100))
    #expect(CGFloat(wideText.bitmap.width) / Snapshot.scale - 2 * Snapshot.inset > tokens.selectorContainerWidth)
  }
}

// MARK: - Hosted: pointer input through AppKit (TMP-1, TMP-3 … TMP-5, TMP-11, TMP-14, TMP-16 … TMP-19, TMP-22)

/// What a hosted picker reported, in order.
@MainActor
private final class Events {
  var log: [String] = []
}

/// Where the parts of a rendered vertical dial fixture are, in stage points.
@MainActor
private struct Places {
  let dialCentre: CGPoint
  let hour: CGPoint
  let minute: CGPoint
  let am: CGPoint
  let pm: CGPoint
  let cancel: CGPoint
  let ok: CGPoint

  init(_ rendered: Rendered) throws {
    let dial = try #require(rendered.dial())
    dialCentre = CGPoint(x: rendered.stage.width / 2, y: dial.lowerBound + tokens.dialContainerSize / 2)
    let top = dial.lowerBound - tokens.containerGap - tokens.selectorContainerHeight
    let row = top + 4
    let boxes = rendered.runs(row: row, light[.surfaceDim].rgba8()).filter { width($0) > 40 }
    try #require(boxes.count == 2, "\(boxes)")
    let middle = top + tokens.selectorContainerHeight / 2
    hour = CGPoint(x: (boxes[0].lowerBound + boxes[0].upperBound) / 2, y: middle)
    minute = CGPoint(x: (boxes[1].lowerBound + boxes[1].upperBound) / 2, y: middle)
    let chosen = try #require(rendered.runs(row: row, light[.primary].rgba8()).max { width($0) < width($1) })
    am = CGPoint(x: (chosen.lowerBound + chosen.upperBound) / 2, y: middle)
    pm = CGPoint(x: chosen.upperBound + width(chosen) / 2, y: middle)
    // The actions row: the words drawn in its end half are Cancel, then OK.
    let container = rendered.container()
    let buttons = TanreiSystem.tanrei.button.sizes.medium.containerHeight
    let actions = container.maxY - tokens.containerPadding - buttons / 2
    let ink = rendered.runs(row: actions, light[.surfaceBright].rgba8(), tolerance: 24)
    // The gaps between the container's own color: the words (and the toggle's glyph at the start).
    var words: [ClosedRange<CGFloat>] = []
    for (a, b) in zip(ink, ink.dropFirst()) where b.lowerBound > a.upperBound + 0.5 && a.upperBound > rendered.stage.width / 2 {
      if let last = words.last, a.upperBound - last.upperBound < 10 { words[words.count - 1] = last.lowerBound...b.lowerBound } else { words.append(a.upperBound...b.lowerBound) }
    }
    try #require(words.count >= 2, "\(ink)")
    cancel = CGPoint(x: (words[words.count - 2].lowerBound + words[words.count - 2].upperBound) / 2, y: actions)
    ok = CGPoint(x: (words[words.count - 1].lowerBound + words[words.count - 1].upperBound) / 2, y: actions)
  }
}

/// A button that presents the picker, as a product writes one.
private struct PresentingTimePicker: View {
  let events: Events
  @State private var open = false
  @State private var selection: DateComponents? = DateComponents(hour: 7, minute: 30)

  var body: some View {
    TanreiButton("Open", action: { open = true })
      .frame(width: 480, height: 640)
      .tanreiTimePicker(isPresented: $open, selection: $selection, hourCycle: .h12, locale: Locale(identifier: "en_US")) { reason in
        events.log.append("close \(reason.rawValue)")
      }
      .onChange(of: selection) { _, value in events.log.append("change \(value.flatMap(TanreiTime.init).map(\.description) ?? "nil")") }
      .onChange(of: open) { _, value in events.log.append("open \(value)") }
  }
}

@MainActor
@Suite("TanreiTimePicker hosted", .serialized)
struct TanreiTimePickerHostedTests {
  #if os(macOS)
  private func hosted(_ view: some View, system: TanreiSystem = .tanrei) -> HostedView<some View> {
    HostedView(
      view.padding(Snapshot.inset).background(system.colors.light[.surface]).tanreiTheme(theme(system)).environment(\.locale, enUS)
        .environment(\.layoutDirection, .leftToRight))
  }

  private func at(_ point: CGPoint) -> CGPoint { CGPoint(x: Snapshot.inset + point.x, y: Snapshot.inset + point.y) }

  private func picker(_ id: String, events: Events) throws -> some View {
    TanreiTimePickerFixtures.view(
      try fixture(id), onChange: { value in events.log.append("change \(TanreiTime(value)?.description ?? "nil")") },
      onClose: { events.log.append("close \($0.rawValue)") })
  }

  /// A system whose dial and states change at once, so that the window shows where things are without waiting.
  private var still: TanreiSystem {
    var system = TanreiSystem.tanrei
    system.timePicker.motionDialDuration = 0
    system.timePicker.motionStateDuration = 0
    return system
  }

  /// TMP-5 — OK with the time unchanged closes with confirm and writes nothing. (A drag on the dial, TMP-14, and a press on
  /// the scrim, TMP-4, are gestures a synthesized click does not reach on macOS:
  /// their rules are tested above, the gestures in GalleryUITests.)
  @Test("TMP-5 OK with the time unchanged closes with confirm and commits nothing")
  func unchanged() async throws {
    let events = Events()
    let places = try Places(Rendered(try picker("dial-hour", events: events)))
    let view = hosted(try picker("dial-hour", events: events))
    view.click(at: at(places.ok))
    #expect(await view.wait(atMost: 3) { events.log.count == 1 })
    #expect(events.log == ["close confirm"])
  }

  /// TMP-11 — a click on PM chooses it and keeps the hour's number; TMP-16 — a click on the minute selector shows the minute
  /// dial (its handle moves to the minute); TMP-5 — OK commits 19:30.
  @Test("TMP-11 TMP-16 PM keeps the hour; the minute selector shows the minutes; OK commits")
  func periodAndSelector() async throws {
    let events = Events()
    let rendered = try Rendered(try picker("dial-hour", events: events), theme: theme(still))
    let places = try Places(rendered)
    let view = hosted(try picker("dial-hour", events: events), system: still)
    view.click(at: at(places.pm))
    view.click(at: at(places.minute))
    // The handle now over 30 minutes, at the bottom; its edge is the handle's color.
    let edge = onDial(places.dialCentre, degrees: 180)
    #expect(await view.wait(atMost: 3) {
      view.color(at: at(CGPoint(x: edge.x - tokens.dialHandleSize / 2 + 3, y: edge.y)))?.isClose(to: light[.primary].rgba8(), tolerance: 12) == true
    })
    view.click(at: at(places.ok))
    #expect(await view.wait(atMost: 3) { events.log.count == 2 })
    #expect(events.log == ["change 19:30", "close confirm"])
  }

  /// TMP-4 — Cancel asks to close with cancel and commits nothing, whatever was chosen (TMP-5).
  @Test("TMP-4 Cancel closes with cancel; nothing is committed")
  func cancel() async throws {
    let events = Events()
    let places = try Places(Rendered(try picker("dial-hour", events: events)))
    let view = hosted(try picker("dial-hour", events: events))
    view.click(at: at(places.pm))
    view.click(at: at(places.cancel))
    #expect(await view.wait(atMost: 3) { events.log.count == 1 })
    #expect(events.log == ["close cancel"])
  }

  /// TMP-19 — a quick click shows the pressed state at once and keeps it after the release, for press-hold.
  @Test("TMP-19 a quick click on a selector shows the pressed state at once and keeps it after the release")
  func pressHold() throws {
    var system = still
    system.motion.duration.pressHold = 1500
    system.timePicker.conditions.selected.pressed.selectorContainerColor = .role(.error)
    let events = Events()
    let places = try Places(Rendered(try picker("dial-hour", events: events), theme: theme(system)))
    let view = hosted(try picker("dial-hour", events: events), system: system)
    // Inside the selector, clear of its digit and its outline.
    let point = at(CGPoint(x: places.hour.x - tokens.selectorContainerWidth / 2 + 8, y: places.hour.y - tokens.selectorContainerHeight / 2 + 8))
    view.mouse(.leftMouseDown, at: point)
    view.settle()
    #expect(try #require(view.color(at: point)).isClose(to: light[.error].rgba8()))
    view.mouse(.leftMouseUp, at: point)
    view.settle()
    #expect(try #require(view.color(at: point)).isClose(to: light[.error].rgba8()))
  }

  /// TMP-17 / TMP-18 — focus gained by a pointer never selects the focused state nor shows the ring.
  @Test("TMP-17 TMP-18 a click shows neither the focused state nor the focus ring")
  func pointerFocus() async throws {
    var system = still
    system.timePicker.conditions.selected.focused.selectorContainerColor = .role(.error)
    let events = Events()
    let places = try Places(Rendered(try picker("dial-hour", events: events), theme: theme(system)))
    let view = hosted(try picker("dial-hour", events: events), system: system)
    view.click(at: at(places.minute))
    view.leave()
    try await Task.sleep(for: .milliseconds(Int(system.motion.duration.pressHold) + 200))
    view.settle(0.2)
    let inside = at(CGPoint(x: places.minute.x - tokens.selectorContainerWidth / 2 + 8, y: places.minute.y - tokens.selectorContainerHeight / 2 + 8))
    #expect(try #require(view.color(at: inside)).isClose(to: light[tokens.conditions.selected.enabled.selectorContainerColor].rgba8()))
    let measure = TanreiSystem.tanrei.measure
    let ring = at(CGPoint(x: places.minute.x, y: places.minute.y - tokens.selectorContainerHeight / 2 - measure.focusOffset - measure.focusInnerWidth - measure.focusOuterWidth / 2))
    #expect(try #require(view.color(at: ring)).isClose(to: light[.surfaceBright].rgba8()))
  }

  /// TMP-22 — in text entry the period is drawn as tall as the fields, and a segment's hit area reaches the target's height
  /// above and below its drawing (here a 64-point target around a shorter field).
  @Test("TMP-22 in text entry a press just above the period's drawing chooses it")
  func periodReach() async throws {
    var system = still
    system.measure.targetPointer = 64
    system.measure.targetTouch = 64
    let events = Events()
    let rendered = try Rendered(try picker("text", events: events), theme: theme(system))
    let container = rendered.container()
    // The chosen segment (AM) is the one primary fill in the upper part of the surface.
    var am: CGRect?
    for y in stride(from: container.minY, to: container.minY + 140, by: 0.5) {
      for run in rendered.runs(row: y, light[.primary].rgba8()) where width(run) > 30 {
        let box = CGRect(x: run.lowerBound, y: y, width: width(run), height: 0.5)
        am = am.map { $0.union(box) } ?? box
      }
    }
    let segment = try #require(am)
    // Drawn as tall as the fields' containers (the fill inside the period's border).
    let appearance = TanreiTextFieldAppearance(tokens: system.textField, variant: .outlined, size: .large, state: .enabled)
    let field = TanreiTextFieldMetrics(
      appearance: appearance, variant: .outlined, labelDrawn: true, hasLeadingIcon: false, hasTrailingIcon: false, isMultiline: false,
      scale: { $0.lineHeight }
    ).minimumHeight
    #expect(abs(segment.height + 2 * tokens.periodOutlineWidth - field) <= 1.5, "drawn as tall as the fields: \(segment) \(field)")
    #expect(segment.width >= 64 - 3)
    let view = hosted(try picker("text", events: events), system: system)
    view.click(at: at(CGPoint(x: segment.maxX + segment.width / 2, y: segment.minY - 4)))
    let places = try Places.actions(rendered)
    view.click(at: at(places))
    #expect(await view.wait(atMost: 3) { events.log.count == 2 })
    #expect(events.log == ["change 19:30", "close confirm"])
  }

  /// TMP-1 — presented, the picker covers the view it is attached to with its scrim and counts as a modal; TMP-4 — Cancel
  /// asks to close with cancel and the picker writes false to the binding itself; TMP-3 — after it closes the view behind
  /// works again (its button opens the picker once more); TMP-25 — with the close motion over, it is gone and uncounted.
  @Test("TMP-1 TMP-3 TMP-4 TMP-25 presented from a button: modal and inert behind; it closes itself through its binding")
  func presented() async throws {
    var system = still
    system.timePicker.motionOpenDuration = 0
    system.timePicker.motionCloseDuration = 0
    let events = Events()
    let before = TanreiModalCoordinator.shared.openModals
    let view = hosted(PresentingTimePicker(events: events), system: system)
    let open = at(CGPoint(x: 240, y: 320))
    view.click(at: open)
    #expect(await view.wait(atMost: 5) { TanreiModalCoordinator.shared.openModals == before + 1 })
    try await Task.sleep(for: .milliseconds(300))
    view.settle(0.2)
    // Inert behind: the scrim covers the view (its button is under it).
    #expect(try #require(view.color(at: at(CGPoint(x: 8, y: 8)))).isClose(to: light[tokens.scrimColor].rgba8(over: light[.surface])))
    // The picker is the fixture's: Cancel where the dial-hour fixture draws it.
    let places = try Places(Rendered(try picker("dial-hour", events: Events()), theme: theme(system)))
    view.click(at: at(places.cancel))
    #expect(await view.wait(atMost: 5) { TanreiModalCoordinator.shared.openModals == before })
    #expect(events.log == ["open true", "close cancel", "open false"])
    // The view behind works again: its button opens the picker once more.
    try await Task.sleep(for: .milliseconds(300))
    view.settle(0.2)
    view.click(at: open)
    #expect(await view.wait(atMost: 5) { TanreiModalCoordinator.shared.openModals == before + 1 })
    try await Task.sleep(for: .milliseconds(300))
    view.settle(0.2)
    // OK: the pending time is the value it opened with, so nothing is written; it closes with confirm.
    view.click(at: at(places.ok))
    #expect(await view.wait(atMost: 5) { TanreiModalCoordinator.shared.openModals == before })
    #expect(events.log.suffix(3) == ["open true", "close confirm", "open false"])
  }
  #endif
}

extension Places {
  /// OK in a rendered fixture of any layout: the last word in the actions row.
  static func actions(_ rendered: Rendered) throws -> CGPoint {
    let container = rendered.container()
    let buttons = TanreiSystem.tanrei.button.sizes.medium.containerHeight
    let row = container.maxY - tokens.containerPadding - buttons / 2
    let ink = rendered.runs(row: row, light[.surfaceBright].rgba8(), tolerance: 24)
    let last = try #require(zip(ink, ink.dropFirst()).filter { $1.lowerBound > $0.upperBound + 0.5 }.last)
    // The last word ends where the last stretch of the container's color begins; it is a couple of letters wide.
    return CGPoint(x: last.1.lowerBound - 8, y: row)
  }
}

// MARK: - Every token drives the drawing

@MainActor
@Suite("TanreiTimePicker tokens")
struct TanreiTimePickerTokenTests {
  /// One change to the default system's time-picker tokens, and the fixture that shows it.
  struct Change: CustomTestStringConvertible, Sendable {
    let name: String
    let fixture: String
    let apply: @Sendable (inout TanreiTimePickerTokens) -> Void
    var testDescription: String { name }
  }

  nonisolated static let changes: [Change] = [
    Change(name: "container.color", fixture: "dial-hour") { $0.containerColor = .role(.error) },
    Change(name: "container.elevation", fixture: "dial-hour") { $0.containerElevation = [] },
    Change(name: "container.shape", fixture: "dial-hour") { $0.containerShape = 40 },
    Change(name: "container.padding", fixture: "dial-hour") { $0.containerPadding = 40 },
    Change(name: "container.gap", fixture: "dial-hour") { $0.containerGap = 32 },
    Change(name: "container.margin", fixture: "dial-hour") { $0.containerMargin = 200 },
    Change(name: "scrim.color", fixture: "dial-hour") { $0.scrimColor = .role(.error) },
    Change(name: "header.label.color", fixture: "dial-hour") { $0.headerLabelColor = .role(.error) },
    Change(name: "header.label.typescale", fixture: "dial-hour") { $0.headerLabelTypescale = TanreiSystem.tanrei.typescale.display },
    Change(name: "selector.container.width", fixture: "dial-hour") { $0.selectorContainerWidth = 100 },
    Change(name: "selector.container.height", fixture: "dial-hour") { $0.selectorContainerHeight = 80 },
    Change(name: "selector.container.shape", fixture: "dial-hour") { $0.selectorContainerShape = 30 },
    Change(name: "selector.label.typescale", fixture: "dial-hour") { $0.selectorLabelTypescale = TanreiSystem.tanrei.typescale.body },
    Change(name: "selector.gap", fixture: "dial-hour") { $0.selectorGap = 20 },
    Change(name: "separator.color", fixture: "dial-hour") { $0.separatorColor = .role(.error) },
    Change(name: "separator.typescale", fixture: "dial-hour") { $0.separatorTypescale = TanreiSystem.tanrei.typescale.body },
    Change(name: "period.container.width", fixture: "dial-hour") { $0.periodContainerWidth = 70 },
    Change(name: "period.container.shape", fixture: "dial-hour") { $0.periodContainerShape = 30 },
    Change(name: "period.outline.color", fixture: "dial-hour") { $0.periodOutlineColor = .role(.error) },
    Change(name: "period.outline.width", fixture: "dial-hour") { $0.periodOutlineWidth = 4 },
    Change(name: "period.label.typescale", fixture: "dial-hour") { $0.periodLabelTypescale = TanreiSystem.tanrei.typescale.display },
    Change(name: "period.margin-inline-start", fixture: "dial-hour") { $0.periodMarginInlineStart = 40 },
    Change(name: "dial.container.size", fixture: "dial-hour") { $0.dialContainerSize = 200 },
    Change(name: "dial.container.color", fixture: "dial-hour") { $0.dialContainerColor = .role(.error) },
    Change(name: "dial.padding", fixture: "dial-hour") { $0.dialPadding = 20 },
    Change(name: "dial.label.typescale", fixture: "dial-hour") { $0.dialLabelTypescale = TanreiSystem.tanrei.typescale.caption },
    Change(name: "dial.label.color", fixture: "dial-hour") { $0.dialLabelColor = .role(.error) },
    Change(name: "dial.selected-label.color", fixture: "dial-hour") { $0.dialSelectedLabelColor = .role(.error) },
    Change(name: "dial.handle.size", fixture: "dial-hour") { $0.dialHandleSize = 48 },
    Change(name: "dial.handle.color", fixture: "dial-hour") { $0.dialHandleColor = .role(.error) },
    Change(name: "dial.track.width", fixture: "dial-hour") { $0.dialTrackWidth = 6 },
    Change(name: "dial.track.color", fixture: "dial-hour") { $0.dialTrackColor = .role(.error) },
    Change(name: "dial.center.size", fixture: "dial-minute-between") { $0.dialCenterSize = 14 },
    Change(name: "actions.gap", fixture: "dial-hour") { $0.actionsGap = 30 },
    Change(name: "actions.margin-block-start", fixture: "dial-hour") { $0.actionsMarginBlockStart = 60 },
    Change(name: "selector.container.width (fields)", fixture: "text") { $0.selectorContainerWidth = 120 },
  ]

  /// Values drive the drawing: each token, changed, changes the fixture that shows it.
  @Test("TMP-1 TMP-7 TMP-9 TMP-10 TMP-12 TMP-13 TMP-23 TMP-24 each token changes the drawing", arguments: changes)
  func token(_ change: Change) throws {
    var system = TanreiSystem.tanrei
    change.apply(&system.timePicker)
    let view = TanreiTimePickerFixtures.view(try fixture(change.fixture))
    #expect(try Snapshot.renderExact(view).pixels != Snapshot.renderExact(view, theme: theme(system)).pixels, "\(change.name)")
  }
}
