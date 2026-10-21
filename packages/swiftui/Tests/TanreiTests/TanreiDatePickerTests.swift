import AcmeFixture
import SwiftUI
import Testing

@_spi(Fixtures) @testable import Tanrei

// Covers specs/date-picker.spec.json. Each behavior id (DTP-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file.
//
// Four kinds of test:
// - Rules, the model and the locale, pure: calendar arithmetic, conditions, keys, choices, text entry, the header's words,
//   geometry and placement.
// - Appearances, pure: which token draws which part of a day, a year or the view toggle in each condition and state.
// - Renders (`Snapshot.render`) for layout, colors and baselines: the surface drawn in place on the fixture's stage
//   (`TanreiDatePickerSurface`, DTP-1's verify); the text fields draw their text as text (`\.tanreiStaticTextInput`).
// - Hosted pickers (macOS, `HostedView`) with real key and mouse events: opening, focus, the keys, choosing, committing and
//   closing. The full-screen presentation (a full-screen cover on iOS) and the accessibility tree are exercised by the
//   gallery's UI tests.

private let suiteName = "TanreiDatePickerTests"
private let tokens = TanreiSystem.tanrei.datePicker
private let light = TanreiSystem.tanrei.colors.light

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

private func date(_ iso: String) -> TanreiCalendarDate { TanreiCalendarDate(iso: iso)! }
private func components(_ iso: String?) -> DateComponents? { iso.flatMap { TanreiCalendarDate(iso: $0)?.components } }

private let enUS = Locale(identifier: "en-US")

/// DTP-1's verify: a modal fixture on a 480 × 640 stage, a docked one centred on a 400 × 440 stage of the surface color.
private enum Stage {
  static let modal = CGSize(width: 480, height: 640)
  static let docked = CGSize(width: 400, height: 440)
}

// MARK: - Fixtures

/// Draws a fixture of specs/date-picker.spec.json: its props on the in-place surface, on its stage.
@MainActor
enum TanreiDatePickerFixtures {
  static func surface(_ fixture: SpecFixture) -> TanreiDatePickerSurface {
    let defaults = TanreiDatePickerLabels()
    return TanreiDatePickerSurface(
      presentation: TanreiDatePickerPresentation(named: fixture.string("presentation") ?? "modal"),
      mode: TanreiDatePickerMode(named: fixture.string("mode") ?? "single"), selection: components(fixture.string("value")),
      range: TanreiDateRange(start: components(fixture.string("start")), end: components(fixture.string("end"))),
      minDate: components(fixture.string("min")), maxDate: components(fixture.string("max")),
      disabledDates: Set((fixture.strings("disabledDates") ?? []).compactMap { components($0) }), today: components(fixture.string("today")),
      firstDayOfWeek: TanreiDatePickerFirstDayOfWeek(named: fixture.string("firstDayOfWeek") ?? "locale"),
      locale: fixture.string("locale").map { Locale(identifier: $0) },
      entryMode: TanreiDatePickerEntryMode(named: fixture.string("entryMode") ?? "calendar"),
      startView: TanreiDatePickerStartView(named: fixture.string("startView") ?? "day"),
      labels: TanreiDatePickerLabels(label: fixture.string("label") ?? defaults.label))
  }

  static func view(_ fixture: SpecFixture) -> some View {
    let docked = fixture.string("presentation") == "docked"
    return Group {
      if docked {
        surface(fixture).frame(width: Stage.docked.width, height: Stage.docked.height)
      } else {
        surface(fixture).frame(width: Stage.modal.width, height: Stage.modal.height)
      }
    }
    .environment(\.tanreiStaticTextInput, true)
  }
}

// MARK: - Fixtures (one per spec fixture)

@MainActor
@Suite("TanreiDatePicker snapshots")
struct TanreiDatePickerSnapshotTests {
  /// Mirrors `fixtures` in specs/date-picker.spec.json.
  nonisolated static let fixtures = [
    "modal", "modal-range", "modal-range-start", "modal-range-empty", "modal-text", "modal-text-range", "modal-year", "docked", "docked-monday",
    "docked-unavailable", "docked-range-unavailable",
  ]

  static func fixture(_ id: String) throws -> SpecFixture {
    try #require(try SpecFixture.load(spec: "date-picker").first { $0.id == id })
  }

  @Test("DTP-1 DTP-2 DTP-10 DTP-12 fixture matches its baseline", arguments: fixtures)
  func fixture(_ id: String) throws {
    try Snapshot.assert(TanreiDatePickerFixtures.view(try Self.fixture(id)), named: id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    #expect(try SpecFixture.load(spec: "date-picker").map(\.id) == Self.fixtures)
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiDatePickerTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiDatePicker preset snapshots")
struct TanreiDatePickerPresetSnapshotTests {
  /// The modal range: the preset's surface, header, divider, navigation row, weekday row, selected days, band, today's ring
  /// and actions.
  nonisolated static let fixtureId = "modal-range"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiDatePickerSnapshotTests.fixtures.contains(Self.fixtureId))
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try TanreiDatePickerSnapshotTests.fixture(Self.fixtureId)
    try Snapshot.assert(TanreiDatePickerFixtures.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}

// MARK: - Calendar dates and the locale

@MainActor
@Suite("TanreiDatePicker calendar and locale")
struct TanreiDatePickerCalendarTests {
  private let en = TanreiDatePickerLocale.shared(enUS, firstDayOfWeek: .locale)

  @Test("DTP-37 dates are Gregorian calendar dates: ISO strings, components, days that exist, day and month arithmetic")
  func dates() {
    #expect(TanreiCalendarDate(iso: "2026-09-17") == TanreiCalendarDate(year: 2026, month: 9, day: 17))
    #expect(TanreiCalendarDate(iso: "2026-02-29") == nil && TanreiCalendarDate(iso: "2024-02-29") != nil)
    #expect(TanreiCalendarDate(iso: "2026-9-17") == nil && TanreiCalendarDate(iso: "2026-09-17T00:00") == nil)
    #expect(date("2026-09-17").description == "2026-09-17")
    #expect(date("2026-09-17").components == DateComponents(year: 2026, month: 9, day: 17))
    #expect(TanreiCalendarDate(components: DateComponents(year: 2026, month: 9)) == nil)
    #expect(date("2026-09-17").weekday == 5, "a Thursday")
    #expect(date("2026-09-30").adding(days: 1) == date("2026-10-01"))
    #expect(date("2024-12-31").adding(days: 60) == date("2025-03-01"))
    #expect(date("2026-01-31").adding(months: 1) == date("2026-02-28"), "the last day when the month is shorter")
    #expect(date("2024-02-29").adding(months: 12) == date("2025-02-28"))
    #expect(TanreiCalendarDate(ordinal: date("1900-03-01").ordinal) == date("1900-03-01"))
  }

  @Test("DTP-11 six rows of seven cells from the first day of the week; the first day in its weekday's column")
  func cells() {
    let september = TanreiCalendarMonth(year: 2026, month: 9)
    let sunday = september.cells(firstWeekday: 1)
    #expect(sunday.count == 42)
    #expect(sunday[0] == nil && sunday[1] == nil && sunday[2] == date("2026-09-01"), "September 2026 starts on a Tuesday")
    #expect(sunday[31] == date("2026-09-30") && sunday[32] == nil && sunday[41] == nil, "empty cells after the last day; six rows kept")
    let monday = september.cells(firstWeekday: 2)
    #expect(monday[0] == nil && monday[1] == date("2026-09-01"))
  }

  @Test("DTP-37 the first day of the week comes from the locale, or from firstDayOfWeek")
  func firstDay() {
    #expect(en.firstWeekday == 1)
    #expect(TanreiDatePickerLocale.shared(Locale(identifier: "de-DE"), firstDayOfWeek: .locale).firstWeekday == 2)
    #expect(TanreiDatePickerLocale.shared(Locale(identifier: "ja-JP"), firstDayOfWeek: .locale).firstWeekday == 1)
    #expect(TanreiDatePickerLocale.shared(enUS, firstDayOfWeek: .monday).firstWeekday == 2)
    #expect(TanreiDatePickerLocale.shared(enUS, firstDayOfWeek: .saturday).firstWeekday == 7)
  }

  @Test("DTP-13 DTP-15 DTP-36 DTP-37 names, month and year, and full dates in the locale's words and digits")
  func names() {
    #expect(en.narrowWeekdays.prefix(2) == ["S", "M"])
    #expect(en.fullWeekdays.first == "Sunday")
    let ja = TanreiDatePickerLocale.shared(Locale(identifier: "ja-JP"), firstDayOfWeek: .locale)
    #expect(ja.narrowWeekdays.prefix(2) == ["日", "月"])
    #expect(en.monthYear(TanreiCalendarMonth(year: 2026, month: 9)) == "September 2026")
    #expect(ja.monthYear(TanreiCalendarMonth(year: 2026, month: 9)) == "2026年9月")
    #expect(en.fullDate(date("2026-09-17")) == "Thursday, September 17, 2026")
    let arabic = TanreiDatePickerLocale.shared(Locale(identifier: "ar-EG"), firstDayOfWeek: .locale)
    #expect(arabic.number(17) == "١٧", "the locale's digits")
    #expect(en.number(2026) == "2026", "never grouped")
  }

  @Test("DTP-37 while today is empty the device's current date in its own time zone")
  func deviceToday() {
    let now = Calendar(identifier: .gregorian).dateComponents(in: .current, from: Date())
    #expect(TanreiDatePickerLocale.deviceToday() == TanreiCalendarDate(components: now))
  }

  @Test("DTP-23 the header's dates: weekday, month and day, with the year when it is not today's")
  func header() {
    let today = date("2026-09-24")
    let labels = TanreiDatePickerLabels()
    func text(_ parts: [TanreiDatePickerRules.HeaderPart]) -> String { parts.map(\.text).joined(separator: TanreiDatePickerRules.rangeDash) }
    #expect(text(TanreiDatePickerRules.header(pending: .init(date: date("2026-09-17")), mode: .single, today: today, labels: labels, locale: en)) == "Thu, Sep 17")
    #expect(
      text(TanreiDatePickerRules.header(pending: .init(date: date("2026-09-17")), mode: .single, today: date("2027-01-15"), labels: labels, locale: en))
        == "Thu, Sep 17, 2026")
    let range = TanreiDatePickerRules.header(pending: .init(start: date("2026-09-10"), end: date("2026-09-16")), mode: .range, today: today, labels: labels, locale: en)
    #expect(text(range) == "Sep 10 \u{2013} Sep 16" && range.allSatisfy { !$0.isPlaceholder })
    let started = TanreiDatePickerRules.header(pending: .init(start: date("2026-09-10")), mode: .range, today: today, labels: labels, locale: en)
    #expect(started == [.init(text: "Sep 10", isPlaceholder: false), .init(text: "End date", isPlaceholder: true)])
    let empty = TanreiDatePickerRules.header(pending: .none, mode: .range, today: today, labels: labels, locale: en)
    #expect(empty.map(\.text) == ["Start date", "End date"] && empty.allSatisfy(\.isPlaceholder))
    #expect(TanreiDatePickerRules.header(pending: .none, mode: .single, today: today, labels: labels, locale: en) == [.init(text: "Date", isPlaceholder: true)])
    let ja = TanreiDatePickerLocale.shared(Locale(identifier: "ja-JP"), firstDayOfWeek: .locale)
    #expect(text(TanreiDatePickerRules.header(pending: .init(date: date("2026-09-17")), mode: .single, today: today, labels: labels, locale: ja)) == "9月17日(木)")
  }

  @Test("DTP-25 the placeholder: the numeric pattern with yyyy, mm and dd in the locale's order and separator")
  func pattern() {
    #expect(en.numericPattern == "mm/dd/yyyy")
    #expect(TanreiDatePickerLocale.shared(Locale(identifier: "ja-JP"), firstDayOfWeek: .locale).numericPattern == "yyyy/mm/dd")
    #expect(TanreiDatePickerLocale.shared(Locale(identifier: "de-DE"), firstDayOfWeek: .locale).numericPattern == "dd.mm.yyyy")
    #expect(TanreiDatePickerLocale.numericParts(of: "d 'de' MMMM") == [.month, .literal("/"), .day, .literal("/"), .year], "no year: the English form")
    #expect(TanreiDatePickerLocale.numericParts(of: "yyyy'年'MM'月'dd'日'") == [.year, .literal("年"), .month, .literal("月"), .day, .literal("日")])
  }

  @Test("DTP-26 a field's text: the numeric form written, and read in the locale's order with any separators")
  func numeric() {
    #expect(en.numericText(date("2026-09-07")) == "09/07/2026")
    #expect(en.parse("9/17/2026") == date("2026-09-17"))
    #expect(en.parse("09-17-2026") == date("2026-09-17"))
    #expect(en.parse("9 17 2026") == date("2026-09-17"))
    #expect(en.parse(" 9 / 17 / 2026 ") == date("2026-09-17"))
    #expect(en.parse("17/09/2026") == nil, "the locale's order: month 17 does not exist")
    #expect(en.parse("2/29/2026") == nil, "a day that does not exist")
    #expect(en.parse("9/1/26") == nil, "a four-digit year")
    #expect(en.parse("9/17") == nil && en.parse("9/17/2026/1") == nil, "exactly three groups")
    #expect(en.parse("009/17/2026") == nil)
    let de = TanreiDatePickerLocale.shared(Locale(identifier: "de-DE"), firstDayOfWeek: .locale)
    #expect(de.parse("17.9.2026") == date("2026-09-17") && de.numericText(date("2026-09-17")) == "17.09.2026")
    let ja = TanreiDatePickerLocale.shared(Locale(identifier: "ja-JP"), firstDayOfWeek: .locale)
    #expect(ja.parse("2026/9/17") == date("2026-09-17"))
    let arabic = TanreiDatePickerLocale.shared(Locale(identifier: "ar-EG"), firstDayOfWeek: .locale)
    let written = arabic.numericText(date("2026-09-17"))
    #expect(arabic.parse(written) == date("2026-09-17"), "the locale's digits: \(written)")
  }
}

// MARK: - Rules

@Suite("TanreiDatePicker rules")
struct TanreiDatePickerRulesTests {
  private let today = date("2026-09-24")

  @Test("DTP-10 a day's condition by precedence: selected, in-range, today, unselected; a year's")
  func conditions() {
    let range = TanreiDatePickerSelection(start: date("2026-09-10"), end: date("2026-09-24"))
    #expect(TanreiDatePickerRules.condition(of: date("2026-09-10"), pending: range, today: today) == .selected)
    #expect(TanreiDatePickerRules.condition(of: date("2026-09-24"), pending: range, today: today) == .selected, "selected over today")
    #expect(TanreiDatePickerRules.condition(of: date("2026-09-15"), pending: range, today: date("2026-09-15")) == .inRange, "in-range over today")
    #expect(TanreiDatePickerRules.condition(of: date("2026-09-24"), pending: .none, today: today) == .today)
    #expect(TanreiDatePickerRules.condition(of: date("2026-09-25"), pending: .init(date: date("2026-09-17")), today: today) == .unselected)
    #expect(TanreiDatePickerRules.condition(ofYear: 2026, displayed: 2026, today: today) == .selected)
    #expect(TanreiDatePickerRules.condition(ofYear: 2026, displayed: 2027, today: today) == .today)
    #expect(TanreiDatePickerRules.condition(ofYear: 2025, displayed: 2027, today: today) == .unselected)
  }

  @Test("DTP-12 a range's ends run half a cell toward each other while they differ; DTP-36 every day of a range is selected")
  func band() {
    let range = TanreiDatePickerSelection(start: date("2026-09-10"), end: date("2026-09-16"))
    #expect(TanreiDatePickerRules.halfBand(of: date("2026-09-10"), pending: range) == .trailing)
    #expect(TanreiDatePickerRules.halfBand(of: date("2026-09-16"), pending: range) == .leading)
    #expect(TanreiDatePickerRules.halfBand(of: date("2026-09-12"), pending: range) == nil)
    #expect(TanreiDatePickerRules.halfBand(of: date("2026-09-10"), pending: .init(start: date("2026-09-10"), end: date("2026-09-10"))) == nil)
    #expect(TanreiDatePickerRules.halfBand(of: date("2026-09-10"), pending: .init(start: date("2026-09-10"))) == nil)
    #expect(TanreiDatePickerRules.isSelected(date("2026-09-13"), pending: range) && !TanreiDatePickerRules.isSelected(date("2026-09-17"), pending: range))
    #expect(TanreiDatePickerRules.dayDescription(date("2026-09-10"), pending: range, labels: .init()) == "Start date")
    #expect(TanreiDatePickerRules.dayDescription(date("2026-09-16"), pending: range, labels: .init()) == "End date")
    #expect(TanreiDatePickerRules.dayDescription(date("2026-09-12"), pending: range, labels: .init()) == nil)
  }

  @Test("DTP-8 DTP-9 choosing: a date in single mode; a range starts, ends on or after the start, and starts again")
  func choosing() {
    let bounds = TanreiDatePickerBounds(disabled: [date("2026-09-13")])
    #expect(TanreiDatePickerRules.choose(date("2026-09-17"), pending: .none, mode: .single, bounds: bounds) == .init(date: date("2026-09-17")))
    let started = TanreiDatePickerRules.choose(date("2026-09-10"), pending: .none, mode: .range, bounds: bounds)
    #expect(started == .init(start: date("2026-09-10")))
    let ended = TanreiDatePickerRules.choose(date("2026-09-16"), pending: started!, mode: .range, bounds: bounds)
    #expect(ended == .init(start: date("2026-09-10"), end: date("2026-09-16")), "13, unavailable, stays inside the span")
    #expect(TanreiDatePickerRules.choose(date("2026-09-10"), pending: started!, mode: .range, bounds: bounds) == .init(start: date("2026-09-10"), end: date("2026-09-10")), "a one-day range")
    #expect(TanreiDatePickerRules.choose(date("2026-09-05"), pending: started!, mode: .range, bounds: bounds) == .init(start: date("2026-09-05")), "before the start: a new start")
    #expect(TanreiDatePickerRules.choose(date("2026-09-20"), pending: ended!, mode: .range, bounds: bounds) == .init(start: date("2026-09-20")), "both chosen: a new start")
    #expect(TanreiDatePickerRules.choose(date("2026-09-13"), pending: .none, mode: .single, bounds: bounds) == nil, "DTP-30: unavailable is never chosen")
  }

  @Test("DTP-29 DTP-30 unavailable: before min, after max, listed or named by the predicate")
  func unavailable() {
    let bounds = TanreiDatePickerBounds(
      min: date("2026-09-03"), max: date("2026-09-22"), disabled: [date("2026-09-12")], predicate: { $0.day == 20 })
    #expect(bounds.isUnavailable(date("2026-09-02")) && bounds.isUnavailable(date("2026-09-23")))
    #expect(bounds.isUnavailable(date("2026-09-12")) && bounds.isUnavailable(date("2026-09-20")))
    #expect(!bounds.isUnavailable(date("2026-09-03")) && !bounds.isUnavailable(date("2026-09-22")))
  }

  @Test("DTP-29 it opens on the month of the choice, otherwise today's, within min's and max's months")
  func homeMonth() {
    let open = TanreiDatePickerBounds()
    #expect(TanreiDatePickerRules.homeMonth(pending: .init(date: date("2026-03-02")), today: today, bounds: open) == TanreiCalendarMonth(year: 2026, month: 3))
    #expect(TanreiDatePickerRules.homeMonth(pending: .init(start: date("2025-12-31")), today: today, bounds: open) == TanreiCalendarMonth(year: 2025, month: 12))
    #expect(TanreiDatePickerRules.homeMonth(pending: .none, today: today, bounds: open) == TanreiCalendarMonth(year: 2026, month: 9))
    let later = TanreiDatePickerBounds(min: date("2027-02-10"))
    #expect(TanreiDatePickerRules.homeMonth(pending: .none, today: today, bounds: later) == TanreiCalendarMonth(year: 2027, month: 2))
  }

  @Test("DTP-17 the active day: the choice in the month, otherwise today, otherwise the first available day, otherwise the first")
  func activeDay() {
    let september = TanreiCalendarMonth(year: 2026, month: 9)
    let open = TanreiDatePickerBounds()
    #expect(TanreiDatePickerRules.activeDay(in: september, pending: .init(date: date("2026-09-17")), today: today, bounds: open) == date("2026-09-17"))
    #expect(TanreiDatePickerRules.activeDay(in: september, pending: .init(start: date("2026-09-10")), today: today, bounds: open) == date("2026-09-10"))
    #expect(TanreiDatePickerRules.activeDay(in: september, pending: .init(date: date("2026-10-01")), today: today, bounds: open) == today)
    let october = TanreiCalendarMonth(year: 2026, month: 10)
    let firstBooked = TanreiDatePickerBounds(disabled: [date("2026-10-01"), date("2026-10-02")])
    #expect(TanreiDatePickerRules.activeDay(in: october, pending: .none, today: today, bounds: firstBooked) == date("2026-10-03"))
    let closed = TanreiDatePickerBounds(predicate: { _ in true })
    #expect(TanreiDatePickerRules.activeDay(in: october, pending: .none, today: today, bounds: closed) == date("2026-10-01"))
  }

  @Test("DTP-18 DTP-39 the grid's keys: a day in the arrow's direction (mirrored right to left), a week, the row's ends, a month, a year")
  func keys() {
    let active = date("2026-09-17")
    let open = TanreiDatePickerBounds()
    func move(_ key: KeyEquivalent, shift: Bool = false, rtl: Bool = false, first: Int = 1, from: TanreiCalendarDate = active, bounds: TanreiDatePickerBounds = open) -> String? {
      TanreiDatePickerRules.move(from, key: key, shift: shift, rightToLeft: rtl, firstWeekday: first, bounds: bounds)?.description
    }
    #expect(move(.rightArrow) == "2026-09-18" && move(.leftArrow) == "2026-09-16")
    #expect(move(.rightArrow, rtl: true) == "2026-09-16" && move(.leftArrow, rtl: true) == "2026-09-18")
    #expect(move(.downArrow) == "2026-09-24" && move(.upArrow) == "2026-09-10")
    #expect(move(.home) == "2026-09-13" && move(.end) == "2026-09-19", "Sunday to Saturday")
    #expect(move(.home, first: 2) == "2026-09-14" && move(.end, first: 2) == "2026-09-20", "Monday to Sunday")
    #expect(move(.pageDown) == "2026-10-17" && move(.pageUp) == "2026-08-17")
    #expect(move(.pageDown, shift: true) == "2027-09-17" && move(.pageUp, shift: true) == "2025-09-17")
    #expect(move(.pageDown, from: date("2026-01-31")) == "2026-02-28", "the last day when the month is shorter")
    let bounded = TanreiDatePickerBounds(min: date("2026-09-03"), max: date("2026-09-22"))
    #expect(move(.pageDown, bounds: bounded) == "2026-09-22" && move(.upArrow, from: date("2026-09-05"), bounds: bounded) == "2026-09-03", "never past min or max")
    #expect(move(.rightArrow, from: date("2026-09-18"), bounds: TanreiDatePickerBounds(disabled: [date("2026-09-19")])) == "2026-09-19", "unavailable days are reached")
    #expect(move(.tab) == nil && move(.return) == nil)
  }

  @Test("DTP-19 the year list's keys: a year in the arrow's direction (mirrored right to left), a row, the ends")
  func yearKeys() {
    let years = 1900...2100
    #expect(TanreiDatePickerRules.moveYear(2026, key: .rightArrow, rightToLeft: false, years: years) == 2027)
    #expect(TanreiDatePickerRules.moveYear(2026, key: .rightArrow, rightToLeft: true, years: years) == 2025)
    #expect(TanreiDatePickerRules.moveYear(2026, key: .downArrow, rightToLeft: false, years: years) == 2029)
    #expect(TanreiDatePickerRules.moveYear(2026, key: .upArrow, rightToLeft: false, years: years) == 2023)
    #expect(TanreiDatePickerRules.moveYear(2026, key: .home, rightToLeft: false, years: years) == 1900)
    #expect(TanreiDatePickerRules.moveYear(2026, key: .end, rightToLeft: false, years: years) == 2100)
    #expect(TanreiDatePickerRules.moveYear(2100, key: .downArrow, rightToLeft: false, years: years) == 2100)
    #expect(TanreiDatePickerRules.moveYear(2026, key: .pageDown, rightToLeft: false, years: years) == nil)
  }

  @Test("DTP-16 the years from min's to max's (1900 to 2100 without them); the displayed year's row third in view; a chosen year's month")
  func years() {
    #expect(TanreiDatePickerBounds().years == 1900...2100)
    #expect(TanreiDatePickerBounds(min: date("2020-01-01"), max: date("2030-12-31")).years == 2020...2030)
    #expect(TanreiDatePickerBounds(max: date("1850-01-01")).years == 1900...1900)
    #expect(TanreiDatePickerRules.firstYearRow(displayed: 2026, years: 1900...2100, rowsInView: 7) == 40, "2020's row, so 2026's is third")
    #expect(TanreiDatePickerRules.firstYearRow(displayed: 1901, years: 1900...2100, rowsInView: 7) == 0)
    #expect(TanreiDatePickerRules.firstYearRow(displayed: 2100, years: 1900...2100, rowsInView: 7) == 60, "as near as the list's end allows")
    let september = TanreiCalendarMonth(year: 2026, month: 9)
    #expect(TanreiDatePickerRules.month(choosing: 2030, from: september, bounds: .init()) == TanreiCalendarMonth(year: 2030, month: 9))
    #expect(TanreiDatePickerRules.month(choosing: 2030, from: september, bounds: .init(max: date("2030-05-10"))) == TanreiCalendarMonth(year: 2030, month: 5))
  }

  @Test("DTP-14 DTP-20 paging: not before min's month nor after max's; the active day keeps its number")
  func paging() {
    let september = TanreiCalendarMonth(year: 2026, month: 9)
    let bounded = TanreiDatePickerBounds(min: date("2026-09-03"), max: date("2026-10-22"))
    #expect(!TanreiDatePickerRules.canPage(september, by: -1, bounds: bounded) && TanreiDatePickerRules.canPage(september, by: 1, bounds: bounded))
    #expect(!TanreiDatePickerRules.canPage(september.adding(1), by: 1, bounds: bounded))
    #expect(TanreiDatePickerRules.activeDay(paging: date("2026-08-31"), to: september, bounds: .init()) == date("2026-09-30"))
    #expect(TanreiDatePickerRules.activeDay(paging: date("2026-09-30"), to: september.adding(1), bounds: bounded) == date("2026-10-22"))
  }

  @Test("DTP-36 a day is named by its full date, with todayLabel after today's")
  @MainActor
  func dayName() {
    let en = TanreiDatePickerLocale.shared(enUS, firstDayOfWeek: .locale)
    #expect(TanreiDatePickerRules.dayName(date("2026-09-17"), today: today, labels: .init(), locale: en) == "Thursday, September 17, 2026")
    #expect(TanreiDatePickerRules.dayName(today, today: today, labels: .init(), locale: en) == "Thursday, September 24, 2026, Today")
    #expect(TanreiDatePickerRules.dayName(today, today: today, labels: .init(todayLabel: "Heute"), locale: en).hasSuffix(", Heute"))
  }

  @Test("DTP-38 a narrow window takes the margins, then the padding, then narrows the cells; never wider than the window")
  func narrow() {
    func metrics(_ widest: CGFloat?, line: CGFloat = 20) -> TanreiDatePickerMetrics {
      TanreiDatePickerMetrics.resolve(tokens: tokens, target: 48, dayLine: line, widest: widest, margin: tokens.modalContainerMargin)
    }
    #expect(metrics(nil).surfaceWidth == 360 && metrics(nil).margin == tokens.modalContainerMargin)
    #expect(metrics(480) == TanreiDatePickerMetrics(cellWidth: 48, cellHeight: 48, paddingInline: 12, margin: 16, daySide: 36))
    #expect(metrics(380).margin == 10 && metrics(380).paddingInline == 12, "the margins give way first")
    #expect(metrics(350).margin == 0 && metrics(350).paddingInline == 7 && metrics(350).cellWidth == 48, "then the padding")
    let narrowest = metrics(320)
    #expect(narrowest.paddingInline == 0 && abs(narrowest.surfaceWidth - 320) < 0.001, "then the cells narrow equally")
    #expect(narrowest.cellHeight == 48 && narrowest.daySide == 36, "keeping their height and their numbers' size")
    let grown = metrics(480, line: 60)
    #expect(grown.cellHeight == 60 && grown.daySide == 48, "a day's container grows to hold its number, never past its cell")
    #expect(TanreiDatePickerMetrics.resolve(tokens: tokens, target: 56, dayLine: 20, widest: nil, margin: 0).cellWidth == 56, "never under the target (DTP-11)")
  }

  @Test("DTP-2 DTP-38 a docked picker below its anchor, start edges aligned; flipped above; shifted in; limited to the room")
  func placement() {
    let size = CGSize(width: 360, height: 400)
    let window = CGSize(width: 800, height: 900)
    func place(_ anchor: CGRect, window: CGSize = window, rtl: Bool = false) -> TanreiDatePickerDockedPlacement.Placement {
      TanreiDatePickerDockedPlacement.place(anchor: anchor, window: window, size: size, offset: 4, margin: 8, rightToLeft: rtl)
    }
    #expect(place(CGRect(x: 100, y: 100, width: 200, height: 40)) == .init(frame: CGRect(x: 100, y: 144, width: 360, height: 400), below: true))
    #expect(place(CGRect(x: 100, y: 700, width: 200, height: 40)) == .init(frame: CGRect(x: 100, y: 296, width: 360, height: 400), below: false))
    #expect(place(CGRect(x: 600, y: 100, width: 100, height: 40)).frame.minX == 432, "shifted to stay within the margin")
    #expect(place(CGRect(x: 400, y: 100, width: 200, height: 40), rtl: true).frame.maxX == 600, "right to left: the end edges")
    #expect(place(CGRect(x: 10, y: 100, width: 100, height: 40), window: CGSize(width: 340, height: 900)).frame.minX == -10, "wider than the room: centred")
    let short = place(CGRect(x: 100, y: 100, width: 200, height: 40), window: CGSize(width: 800, height: 300))
    #expect(short.below && short.frame.height == 148, "the room below is the larger: limited to it, and it scrolls")
    let unknown = place(CGRect(x: 100, y: 100, width: 200, height: 40), window: .zero)
    #expect(unknown.below && unknown.frame.height == 400)
  }
}

// MARK: - Configuration and the model

@MainActor
@Suite("TanreiDatePicker configuration and model")
struct TanreiDatePickerModelTests {
  private let en = TanreiDatePickerLocale.shared(enUS, firstDayOfWeek: .locale)
  private let today = date("2026-09-24")

  private func options(
    _ presentation: TanreiDatePickerPresentation = .modal, mode: TanreiDatePickerMode = .single, min: String? = nil, max: String? = nil,
    entry: TanreiDatePickerEntryMode = .calendar, start: TanreiDatePickerStartView = .day, label: String = "Select date"
  ) -> TanreiDatePickerOptions {
    TanreiDatePickerOptions(
      presentation: presentation, mode: mode, minDate: components(min), maxDate: components(max), disabledDates: [], isDateDisabled: nil,
      today: components("2026-09-24"), firstDayOfWeek: .locale, locale: enUS, entryMode: entry, startView: start, labels: .init(label: label))
  }

  private func model(_ options: TanreiDatePickerOptions, _ input: TanreiDatePickerInput = .init()) -> (TanreiDatePickerModel, TanreiDatePickerConfiguration) {
    let configuration = TanreiDatePickerConfiguration(options, input: input)
    return (TanreiDatePickerModel(configuration: configuration, today: today, numeric: en.numericText), configuration)
  }

  @Test("DTP-40 unknown names behave as the defaults, reported in debug builds")
  func unknownNames() {
    let (values, reports) = Reports.collecting {
      (
        TanreiDatePickerPresentation(named: "sheet"), TanreiDatePickerMode(named: "multiple"), TanreiDatePickerEntryMode(named: "voice"),
        TanreiDatePickerStartView(named: "month"), TanreiDatePickerFirstDayOfWeek(named: "someday")
      )
    }
    #expect(values.0 == .modal && values.1 == .single && values.2 == .calendar && values.3 == .day && values.4 == .locale)
    #expect(reports.messages.count == 5 && reports.messages.allSatisfy { $0.contains("DTP-40") })
    #expect(TanreiDatePickerPresentation(named: "docked") == .docked && TanreiDatePickerFirstDayOfWeek(named: "monday") == .monday)
  }

  @Test("DTP-40 dates that are not calendar dates, an end before the start, a value in the other mode, min after max and an empty label are ignored and reported")
  func problems() {
    let bad = TanreiDatePickerConfiguration(
      options(mode: .range, min: "2026-10-01", max: "2026-09-01", label: " "),
      input: .init(value: components("2026-09-17"), start: components("2026-09-16"), end: components("2026-09-10")))
    #expect(bad.bounds.min == nil && bad.bounds.max == nil, "min after max: both ignored")
    #expect(bad.selection == .init(start: date("2026-09-16")), "the end before the start is ignored")
    let text = bad.problems.joined(separator: "\n")
    #expect(text.contains("after maxDate") && text.contains("before its start") && text.contains("value is set in range mode") && text.contains("label is empty"))
    let single = TanreiDatePickerConfiguration(options(), input: .init(value: DateComponents(year: 2026, month: 2, day: 30), start: components("2026-09-01")))
    #expect(single.selection == .none && single.problems.count == 2, "\(single.problems)")
    let (_, reports) = Reports.collecting { single.report() }
    #expect(reports.messages.count == 2 && reports.mention("DTP-40"))
  }

  @Test("DTP-28 a docked picker has the calendar only; entryMode text is reported")
  func dockedText() {
    let configuration = TanreiDatePickerConfiguration(options(.docked, entry: .text), input: .init())
    #expect(configuration.entryMode == .calendar && configuration.problems.contains { $0.contains("DTP-28") })
  }

  @Test("DTP-6 the pending choice: OK only while it is complete; change only when it differs from the one it opened with")
  func pending() {
    var (single, configuration) = model(options(), .init(value: components("2026-09-17")))
    #expect(single.canConfirm(parse: en.parse, bounds: configuration.bounds) && !single.differs)
    let chose = single.choose(date("2026-09-18"), bounds: configuration.bounds)
    #expect(chose == .completed && single.differs)
    var (range, rangeConfiguration) = model(options(mode: .range))
    #expect(!range.canConfirm(parse: en.parse, bounds: rangeConfiguration.bounds), "nothing chosen")
    let started = range.choose(date("2026-09-10"), bounds: rangeConfiguration.bounds)
    #expect(started == .started)
    #expect(!range.canConfirm(parse: en.parse, bounds: rangeConfiguration.bounds), "no end")
    let ended = range.choose(date("2026-09-12"), bounds: rangeConfiguration.bounds)
    #expect(ended == .completed)
    #expect(range.canConfirm(parse: en.parse, bounds: rangeConfiguration.bounds) && range.pending == .init(start: date("2026-09-10"), end: date("2026-09-12")))
    let ignored = single.choose(date("2026-08-01"), bounds: TanreiDatePickerBounds(min: date("2026-09-01")))
    #expect(ignored == .ignored)
  }

  @Test("DTP-29 DTP-16 DTP-3 it opens on the choice's month, or on the year view where startView is year")
  func opening() {
    let (days, _) = model(options(), .init(value: components("2026-03-02")))
    #expect(days.month == TanreiCalendarMonth(year: 2026, month: 3) && days.pane == .days && days.active == date("2026-03-02"))
    let (years, _) = model(options(start: .year), .init(value: components("2026-03-02")))
    #expect(years.pane == .years && years.activeYear == 2026)
    let (text, _) = model(options(entry: .text), .init(value: components("2026-09-17")))
    #expect(text.entry == .text && text.texts == ["09/17/2026"])
  }

  @Test("DTP-20 DTP-18 paging and keys move the month and the active day")
  func moving() {
    var (model, configuration) = model(options(max: "2026-10-15"), .init(value: components("2026-09-30")))
    let paged = model.page(by: 1, bounds: configuration.bounds)
    #expect(paged && model.month == TanreiCalendarMonth(year: 2026, month: 10))
    #expect(model.active == date("2026-10-15"), "the same day number, within max")
    let pagedPast = model.page(by: 1, bounds: configuration.bounds)
    #expect(!pagedPast, "not after max's month")
    let moved = model.move(key: .pageUp, shift: false, rightToLeft: false, firstWeekday: 1, bounds: configuration.bounds)
    #expect(moved)
    #expect(model.month == TanreiCalendarMonth(year: 2026, month: 9) && model.active == date("2026-09-15"), "the new active day's month is shown")
  }

  @Test("DTP-15 DTP-16 the view toggle and a chosen year: the day view of that month, the choice unchanged")
  func yearView() {
    var (model, configuration) = model(options(), .init(value: components("2026-09-17")))
    model.togglePane()
    #expect(model.pane == .years && model.activeYear == 2026)
    let movedYear = model.moveYear(key: .downArrow, rightToLeft: false, years: configuration.bounds.years)
    #expect(movedYear && model.activeYear == 2029)
    model.chooseYear(model.activeYear, bounds: configuration.bounds)
    #expect(model.pane == .days && model.month == TanreiCalendarMonth(year: 2029, month: 9) && model.active == date("2029-09-01"))
    #expect(model.pending == .init(date: date("2026-09-17")), "the choice is unchanged")
    model.togglePane()
    model.togglePane()
    #expect(model.pane == .days && model.month == TanreiCalendarMonth(year: 2029, month: 9), "the toggle shows the day view unchanged")
  }

  @Test("DTP-26 text entry: an edit that reads as an available date is the pending date; a commit that does not is an error until the next edit")
  func textEntry() {
    let bounds = TanreiDatePickerBounds(min: date("2026-09-03"))
    var (model, _) = model(options(entry: .text), .init(value: components("2026-09-17")))
    model.edit(0, text: "9/2", parse: en.parse, bounds: bounds)
    #expect(model.texts == ["9/2"] && model.pending.date == date("2026-09-17"), "not a date yet: typing is never reformatted")
    model.edit(0, text: "9/20/2026", parse: en.parse, bounds: bounds)
    #expect(model.pending.date == date("2026-09-20"))
    model.edit(0, text: "9/2/2026", parse: en.parse, bounds: bounds)
    #expect(model.pending.date == date("2026-09-20"), "an unavailable date is not taken while typing")
    model.commit(0, parse: en.parse, labels: .init(), bounds: bounds)
    #expect(model.errors == ["This date can't be chosen"] && model.pending.date == nil)
    #expect(!model.canConfirm(parse: en.parse, bounds: bounds))
    model.edit(0, text: "9/2/2026x", parse: en.parse, bounds: bounds)
    #expect(model.errors == [""], "the next edit clears the error")
    model.edit(0, text: "13/40/2026", parse: en.parse, bounds: bounds)
    model.commit(0, parse: en.parse, labels: .init(), bounds: bounds)
    #expect(model.errors == ["Enter a valid date"])
    model.edit(0, text: "", parse: en.parse, bounds: bounds)
    model.commit(0, parse: en.parse, labels: .init(), bounds: bounds)
    #expect(model.errors == [""] && model.pending.date == nil, "an emptied field clears its date and is no error")
  }

  @Test("DTP-26 range text entry: an end before the start is invalid")
  func rangeText() {
    let bounds = TanreiDatePickerBounds()
    var (model, _) = model(options(mode: .range, entry: .text), .init(start: components("2026-09-10"), end: components("2026-09-16")))
    #expect(model.texts == ["09/10/2026", "09/16/2026"])
    model.edit(1, text: "9/1/2026", parse: en.parse, bounds: bounds)
    #expect(model.pending.end == date("2026-09-16"))
    model.commit(1, parse: en.parse, labels: .init(), bounds: bounds)
    #expect(model.errors == ["", "Enter a valid date"] && model.pending.end == nil)
  }

  @Test("DTP-28 the entry-mode toggle keeps the pending choice, fills the fields and shows its month")
  func toggleEntry() {
    let bounds = TanreiDatePickerBounds()
    var (model, _) = model(options(), .init(value: components("2026-09-17")))
    _ = model.page(by: 2, bounds: bounds)
    model.toggleEntry(bounds: bounds, numeric: en.numericText)
    #expect(model.entry == .text && model.texts == ["09/17/2026"])
    model.edit(0, text: "12/25/2026", parse: en.parse, bounds: bounds)
    model.toggleEntry(bounds: bounds, numeric: en.numericText)
    #expect(model.entry == .calendar && model.pending.date == date("2026-12-25") && model.month == TanreiCalendarMonth(year: 2026, month: 12))
  }
}

// MARK: - Appearance

@Suite("TanreiDatePicker appearance")
struct TanreiDatePickerAppearanceTests {
  private func appearance(
    _ condition: TanreiDatePickerCondition, _ state: TanreiInteraction, feedback: TanreiPressedFeedback = .overlay, beneath: TanreiInteraction = .enabled,
    tokens: TanreiDatePickerTokens = tokens
  ) -> TanreiDatePickerCellAppearance {
    TanreiDatePickerCellAppearance(tokens: tokens, condition: condition, state: state, feedback: feedback, beneath: beneath)
  }

  @Test("DTP-10 DTP-12 at rest each condition binds its own container, label and outline", arguments: TanreiDatePickerCondition.core)
  func rest(_ condition: TanreiDatePickerCondition) {
    let own = tokens.conditions[condition].enabled
    let resting = appearance(condition, .enabled)
    #expect(resting.container == own.containerColor && resting.label == own.labelColor && resting.outline == own.outlineColor)
    #expect(resting.opacity == 1 && resting.ripple == nil)
  }

  @Test("DTP-10 the default's conditions: a plain day draws nothing, today a ring, selected a fill, in-range the band")
  func defaults() {
    #expect(appearance(.unselected, .enabled).container == .none && appearance(.unselected, .enabled).outline == .none)
    #expect(appearance(.today, .enabled).outline == .role(.primary) && appearance(.today, .enabled).container == .none)
    #expect(appearance(.selected, .enabled).container == .role(.primary) && appearance(.selected, .enabled).label == .role(.onPrimary))
    #expect(appearance(.inRange, .enabled).container == .role(.surfaceDim))
  }

  @Test("DTP-30 an unavailable day is drawn from the disabled tokens of its condition, a chosen one from selected's", arguments: TanreiDatePickerCondition.core)
  func disabled(_ condition: TanreiDatePickerCondition) {
    let own = tokens.conditions[condition].disabled
    let drawn = appearance(condition, .disabled)
    #expect(drawn.container == own.containerColor && drawn.label == own.labelColor && drawn.outline == own.outlineColor)
    #expect(drawn.opacity == tokens.disabled.opacity)
  }

  @Test("DTP-31 hovered, focused and pressed paint that state's tokens of the condition (acme values them apart)")
  func states() {
    let acme = TanreiSystem.acme.datePicker
    for condition in TanreiDatePickerCondition.core {
      let states = [TanreiInteraction.hovered, .focused, .pressed].map { appearance(condition, $0, tokens: acme) }
      for (state, drawn) in zip([TanreiInteraction.hovered, .focused, .pressed], states) {
        #expect(drawn.container == acme.conditions[condition][state: state].containerColor, "\(condition) \(state)")
        #expect(drawn.label == acme.conditions[condition][state: state].labelColor)
      }
      #expect(Set(states.map { "\($0.container)" }).count == 3, "\(condition): acme's three states differ")
    }
    // Precedence: pressed over focused over hovered; disabled over everything.
    #expect(TanreiInteraction.resolve(isPressed: true, isFocused: true, isHovered: true) == .pressed)
    #expect(TanreiInteraction.resolve(isPressed: false, isFocused: true, isHovered: true) == .focused)
    #expect(TanreiInteraction.resolve(isEnabled: false, isPressed: true, isFocused: true, isHovered: true) == .disabled)
  }

  @Test("DTP-34 which state draws which layer under each pressed feedback")
  func feedback() {
    let overlay = appearance(.selected, .pressed, feedback: .overlay, beneath: .hovered)
    #expect(overlay.container == tokens.conditions.selected.pressed.containerColor && overlay.ripple == nil)
    let ripple = appearance(.selected, .pressed, feedback: .ripple, beneath: .hovered)
    #expect(ripple.container == tokens.conditions.selected.hovered.containerColor && ripple.ripple == tokens.conditions.selected.pressed.containerColor)
    #expect(ripple.label == tokens.conditions.selected.pressed.labelColor, "label and outline still come from the pressed tokens")
    let dim = appearance(.selected, .pressed, feedback: .dim, beneath: .focused)
    #expect(dim.container == tokens.conditions.selected.focused.containerColor && dim.ripple == nil && dim.opacity == tokens.pressed.opacity)
    let none = appearance(.selected, .pressed, feedback: .none, beneath: .focused)
    #expect(none == appearance(.selected, .focused), "every part stays with the state under the press")
    #expect(TanreiSystem.m3Like.behavior.pressedFeedback == .ripple && TanreiSystem.cupertino.behavior.pressedFeedback == .dim)
  }

  @Test("DTP-40 a condition the system does not have reads unselected's, reported")
  func unknownCondition() {
    let (drawn, reports) = Reports.collecting { appearance(TanreiDatePickerCondition(rawValue: "holiday"), .enabled) }
    #expect(drawn == appearance(.unselected, .enabled) && reports.mention("holiday"))
  }

  @Test("DTP-21 DTP-22 DTP-31 DTP-34 the motions come from the tokens; reduced motion changes at once, and a modal picker still fades")
  func motion() {
    #expect(tokens.stateMotion(reduceMotion: false) != nil && tokens.stateMotion(reduceMotion: true) == nil)
    #expect(tokens.pageMotion(reduceMotion: false) != nil && tokens.pageMotion(reduceMotion: true) == nil)
    #expect(tokens.rippleGrowth(reduceMotion: true) == nil)
    #expect(tokens.presentationMotion(.modal, opening: true, reduceMotion: true) != nil, "a modal picker fades without growing")
    #expect(tokens.presentationMotion(.docked, opening: true, reduceMotion: true) == nil, "a docked one appears at once")
    #expect(tokens.hiddenScale(reduceMotion: false) == CGFloat(tokens.modalMotionEnterScale) && tokens.hiddenScale(reduceMotion: true) == 1)
    #expect(tokens.closeDuration(.modal, reduceMotion: false) == tokens.modalMotionCloseDuration)
    #expect(tokens.closeDuration(.docked, reduceMotion: false) == tokens.dockedMotionCloseDuration && tokens.closeDuration(.docked, reduceMotion: true) == 0)
  }
}

// MARK: - Renders

/// The docked fixture's geometry: the surface centred on its 400 × 440 stage, inside the snapshot's inset.
@MainActor
private enum Docked {
  static let origin = CGPoint(x: Snapshot.inset + (Stage.docked.width - 360) / 2, y: Snapshot.inset + (Stage.docked.height - 400) / 2)

  /// The centre of the cell in `row` (0 is the first row of days) and `column` (from the first day of the week).
  static func cell(row: Int, column: Int, cell: CGFloat = 48) -> CGPoint {
    CGPoint(
      x: origin.x + tokens.containerPaddingInline + (CGFloat(column) + 0.5) * cell,
      y: origin.y + tokens.containerPaddingBlock + 2 * cell + (CGFloat(row) + 0.5) * cell)
  }
}

@MainActor
private func dockedFixture(_ id: String, system: TanreiSystem = .tanrei, direction: LayoutDirection = .leftToRight) throws -> Bitmap {
  let fixture = try TanreiDatePickerSnapshotTests.fixture(id)
  return try Snapshot.render(TanreiDatePickerFixtures.view(fixture).environment(\.layoutDirection, direction), theme: theme(system))
}

@MainActor
private func expectColor(_ actual: Bitmap.RGBA, _ paint: TanreiPaint, over backdrop: TanreiPaint = .role(.surfaceBright), _ comment: Comment? = nil, sourceLocation: SourceLocation = #_sourceLocation) {
  let expected = light[paint].rgba8(over: light[backdrop])
  #expect(actual.isClose(to: expected, tolerance: 6), "\(comment?.description ?? "") \(actual) vs \(expected)", sourceLocation: sourceLocation)
}

@MainActor
@Suite("TanreiDatePicker rendered")
struct TanreiDatePickerRenderedTests {
  @Test("DTP-11 DTP-24 the docked surface: 360 wide, a navigation row, a weekday row and six rows of cells, no actions")
  func dockedSize() throws {
    // Centred on its stage: where its days are says how large it is.
    let bitmap = try Snapshot.render(
      TanreiDatePickerSurface(presentation: .docked, selection: components("2026-09-01"), today: components("2026-09-24"), locale: enUS)
        .frame(width: Stage.docked.width, height: Stage.docked.height))
    let first = Docked.cell(row: 0, column: 2)
    expectColor(pixel(bitmap, x: first.x - 15, y: first.y - 15), .role(.primary), "September 1 where a 360 × 400 surface puts it")
    expectColor(pixel(bitmap, x: first.x - 15, y: first.y + 48 * 5 + 30), .role(.surfaceBright), "six rows, then the padding: no actions")
  }

  @Test("DTP-10 DTP-12 selected is filled, today ringed, empty cells blank; the first day in its weekday's column")
  func conditions() throws {
    let bitmap = try dockedFixture("docked")
    let seventeen = Docked.cell(row: 2, column: 4)
    expectColor(pixel(bitmap, x: seventeen.x - 15, y: seventeen.y - 15), .role(.primary), "the selected day's fill")
    expectColor(pixel(bitmap, x: seventeen.x - 22, y: seventeen.y - 15), .role(.surfaceBright), "outside its square")
    let twentyFour = Docked.cell(row: 3, column: 4)
    expectColor(pixel(bitmap, x: twentyFour.x - tokens.dayContainerSize / 2 + 0.5, y: twentyFour.y), .role(.primary), "today's ring")
    expectColor(pixel(bitmap, x: twentyFour.x - 12, y: twentyFour.y - 12), .role(.surfaceBright), "today has no fill")
    let empty = Docked.cell(row: 0, column: 0)
    expectColor(pixel(bitmap, x: empty.x, y: empty.y), .role(.surfaceBright), "an empty cell")
  }

  @Test("DTP-12 DTP-9 the band joins a range across whole cells, runs half a cell into its ends, breaks at a row's end; an unavailable day stays on it")
  func band() throws {
    let bitmap = try dockedFixture("docked-range-unavailable")
    let band = TanreiPaint.role(.surfaceDim)
    let eleven = Docked.cell(row: 1, column: 5)
    expectColor(pixel(bitmap, x: eleven.x + 22, y: eleven.y), band, "an in-range day's band spans its cell")
    let ten = Docked.cell(row: 1, column: 4)
    expectColor(pixel(bitmap, x: ten.x + 22, y: ten.y), band, "the start runs into the band")
    expectColor(pixel(bitmap, x: ten.x - 22, y: ten.y), .role(.surfaceBright), "not away from it")
    let sixteen = Docked.cell(row: 2, column: 3)
    expectColor(pixel(bitmap, x: sixteen.x - 22, y: sixteen.y), band)
    expectColor(pixel(bitmap, x: sixteen.x + 22, y: sixteen.y), .role(.surfaceBright))
    let thirteen = Docked.cell(row: 2, column: 0)
    expectColor(pixel(bitmap, x: thirteen.x - 22, y: thirteen.y), band, "13, unavailable, is on the band")
    expectColor(pixel(bitmap, x: thirteen.x, y: thirteen.y - tokens.dayContainerSize / 2 - 2), .role(.surfaceBright), "the band is a day's container tall")
  }

  @Test("DTP-30 a chosen day that is unavailable is drawn chosen, from the selected condition's disabled tokens")
  func unavailableChoice() throws {
    let bitmap = try dockedFixture("docked-unavailable")
    let twelve = Docked.cell(row: 1, column: 6)
    let expected = light[tokens.conditions.selected.disabled.containerColor].rgba8(over: light[.surfaceBright])
    #expect(pixel(bitmap, x: twelve.x - 15, y: twelve.y - 15).isClose(to: expected, tolerance: 6))
  }

  @Test("DTP-39 right to left the grid mirrors: the first day of the week in the rightmost column")
  func rightToLeft() throws {
    let bitmap = try dockedFixture("docked", direction: .rightToLeft)
    let seventeen = Docked.cell(row: 2, column: 2)
    expectColor(pixel(bitmap, x: seventeen.x + 15, y: seventeen.y - 15), .role(.primary), "Thursday is the third column from the left")
    let leftToRight = try Snapshot.renderExact(TanreiDatePickerFixtures.view(try TanreiDatePickerSnapshotTests.fixture("docked")))
    let mirrored = try Snapshot.renderExact(TanreiDatePickerFixtures.view(try TanreiDatePickerSnapshotTests.fixture("docked")).environment(\.layoutDirection, .rightToLeft))
    #expect(leftToRight.pixels != mirrored.pixels)
  }

  @Test("DTP-25 range text entry: the fields' containers are equally tall and level when one label wraps (TXF-13)")
  func rangeFieldsLevel() throws {
    var custom = TanreiSystem.tanrei
    custom.textField.variants.outlined.enabled.outlineColor = .role(.success)
    custom.textField.variants.outlined.enabled.labelColor = .role(.error)
    func render(start: String) throws -> Bitmap {
      try Snapshot.render(
        TanreiDatePickerSurface(
          presentation: .modal, mode: .range, today: components("2026-09-24"), locale: enUS, entryMode: .text,
          labels: TanreiDatePickerLabels(startLabel: start, endLabel: "End date")
        )
        .frame(width: Stage.modal.width, height: Stage.modal.height)
        .environment(\.tanreiStaticTextInput, true),
        theme: theme(custom))
    }
    let centre = Int((Snapshot.inset + Stage.modal.width / 2) * Snapshot.scale)
    /// The rows of a field's top and bottom edges, left or right of the stage's centre: rows the outline crosses.
    func edges(_ bitmap: Bitmap, left: Bool) -> (top: Int, bottom: Int)? {
      let columns = left ? 0..<centre : centre..<bitmap.width
      let rows = (0..<bitmap.height).filter { y in
        columns.filter { bitmap[$0, y].isClose(to: light[.success].rgba8(), tolerance: 20) }.count > Int(40 * Snapshot.scale)
      }
      guard let top = rows.first, let bottom = rows.last else { return nil }
      return (top, bottom)
    }
    let wrapped = try render(start: "First night of the stay")
    let start = try #require(edges(wrapped, left: true))
    let end = try #require(edges(wrapped, left: false))
    #expect(start.top == end.top && start.bottom == end.bottom, "level and equally tall: \(start) \(end)")
    // The start label did wrap: its field is taller than with the default labels, which fit.
    let plain = try render(start: "Start date")
    let plainStart = try #require(edges(plain, left: true))
    #expect(start.bottom - start.top > plainStart.bottom - plainStart.top)
  }

  @Test("DTP-25 an error line below one range field does not count: the containers stay equally tall and level")
  func rangeFieldsLevelWithError() throws {
    var custom = TanreiSystem.tanrei
    custom.textField.variants.outlined.enabled.outlineColor = .role(.success)
    custom.textField.variants.outlined.enabled.errorOutlineColor = .role(.success)
    let fieldWidth: CGFloat = 160
    // The range fields as the date picker lays them out (DTP-25): side by side, top-aligned, in one label room.
    let bitmap = try Snapshot.render(
      HStack(alignment: .top, spacing: tokens.inputGap) {
        TanreiTextField("First night of the stay", text: .constant(""), errorText: "Enter a date", error: true).frame(width: fieldWidth)
        TanreiTextField("End date", text: .constant("")).frame(width: fieldWidth)
      }
      .environment(\.tanreiTextFieldLabelRoom, [Text(verbatim: "First night of the stay"), Text(verbatim: "End date")])
      .environment(\.tanreiStaticTextInput, true),
      theme: theme(custom))
    let split = Int((Snapshot.inset + fieldWidth + tokens.inputGap / 2) * Snapshot.scale)
    func edges(left: Bool) -> (top: Int, bottom: Int)? {
      let columns = left ? 0..<split : split..<bitmap.width
      let rows = (0..<bitmap.height).filter { y in
        columns.filter { bitmap[$0, y].isClose(to: light[.success].rgba8(), tolerance: 20) }.count > Int(40 * Snapshot.scale)
      }
      guard let top = rows.first, let bottom = rows.last else { return nil }
      return (top, bottom)
    }
    let start = try #require(edges(left: true))
    let end = try #require(edges(left: false))
    #expect(start.top == end.top && start.bottom == end.bottom, "\(start) \(end)")
    // The error line is drawn below the start field's container, so the start field is the taller one overall.
    let supporting = TanreiSystem.tanrei.textField.supportingTextTypescale.lineHeight
    #expect(CGFloat(bitmap.height) / Snapshot.scale >= CGFloat(start.bottom) / Snapshot.scale + supporting)
  }

  @Test("DTP-1 DTP-23 the modal surface: the scrim over the stage, the container centred, the header and its divider")
  func modal() throws {
    let bitmap = try Snapshot.render(TanreiDatePickerFixtures.view(try TanreiDatePickerSnapshotTests.fixture("modal")))
    let scrim = light[tokens.modalScrimColor].rgba8(over: light[.surface])
    #expect(pixel(bitmap, x: Snapshot.inset + 4, y: Snapshot.inset + 4).isClose(to: scrim, tolerance: 6), "the scrim over the stage")
    let middle = CGPoint(x: Snapshot.inset + Stage.modal.width / 2, y: Snapshot.inset + Stage.modal.height / 2)
    expectColor(pixel(bitmap, x: middle.x - 360 / 2 + 4, y: middle.y), .role(.surfaceBright), "the container is 360 wide and centred")
    let outside = pixel(bitmap, x: middle.x - 360 / 2 - 4, y: middle.y)
    #expect(outside.isClose(to: scrim, tolerance: 6))
    // The divider below the header: find a row of its color across the container.
    let x = middle.x
    let divider = light[tokens.dividerColor].rgba8(over: light[.surfaceBright])
    let rows = stride(from: Snapshot.inset, to: middle.y, by: 0.5).filter { pixel(bitmap, x: x, y: $0).isClose(to: divider, tolerance: 4) }
    #expect(!rows.isEmpty, "a hairline of the divider's color across the container")
  }

  @Test("DTP-38 on a 320-wide window the surface is never wider than it")
  func narrowWindow() throws {
    let bitmap = try Snapshot.render(
      TanreiDatePickerSurface(presentation: .modal, selection: components("2026-09-17"), today: components("2026-09-24"), locale: enUS)
        .frame(width: 320, height: 640))
    let middleY = Snapshot.inset + 320
    expectColor(pixel(bitmap, x: Snapshot.inset + 1, y: middleY), .role(.surfaceBright), "the container reaches the window's edge")
    expectColor(pixel(bitmap, x: Snapshot.inset + 319, y: middleY), .role(.surfaceBright))
  }

  @Test("DTP-35 corner smoothing reaches the days' containers; focus shows as the system's focus style")
  func cornersAndFocus() throws {
    func cell(smoothing: Double, focused: Bool = false, system: TanreiSystem = .tanrei) throws -> Bitmap {
      var system = system
      system.shape.cornerSmoothing = smoothing
      let metrics = TanreiDatePickerMetrics.resolve(tokens: system.datePicker, target: 48, dayLine: 20, widest: nil, margin: 0)
      return try Snapshot.renderExact(
        Button(action: {}) { Text(verbatim: "17") }
          .buttonStyle(TanreiDatePickerCellStyle(kind: .day, condition: .selected, halfBand: nil, isFocused: focused, keyPresses: 0, metrics: metrics)),
        theme: theme(system))
    }
    #expect(try cell(smoothing: 0).pixels != cell(smoothing: 0.6).pixels, "circular vs continuous corners")
    #expect(TanreiSystem.cupertino.shape.roundedCornerStyle == .continuous && TanreiSystem.tanrei.shape.roundedCornerStyle == .circular)
    #expect(try cell(smoothing: 0, focused: true, system: .acme).pixels != cell(smoothing: 0, focused: true).pixels, "acme shows focus as a glow")
    #expect(TanreiSystem.acme.behavior.focusStyle == .glow)
  }

  @Test("DTP-32 keyboard focus shows the ring around the square — an in-range day's too —, never around the band")
  func focusRing() throws {
    let metrics = TanreiDatePickerMetrics.resolve(tokens: tokens, target: 48, dayLine: 20, widest: nil, margin: 0)
    func render(_ kind: TanreiDatePickerCellStyle.Kind, focused: Bool) throws -> Bitmap {
      try Snapshot.render(
        Button(action: {}) { Text(verbatim: "12") }
          .buttonStyle(TanreiDatePickerCellStyle(kind: kind, condition: kind == .band ? .inRange : .unselected, halfBand: nil, isFocused: focused, keyPresses: 0, metrics: metrics))
          .padding(8))
    }
    let ring = light[.focusRing].rgba8(over: light[.surface])
    let ringMetrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.dayContainerShape, measure: TanreiSystem.tanrei.measure)
    let center = CGPoint(x: Snapshot.inset + 8 + 24, y: Snapshot.inset + 8 + 24)
    for kind in [TanreiDatePickerCellStyle.Kind.day, .band] {
      let focused = try render(kind, focused: true)
      let y = center.y - tokens.dayContainerSize / 2 - ringMetrics.outerCenterlineOutset
      #expect(pixel(focused, x: center.x, y: y).isClose(to: ring, tolerance: 40), "\(kind): the ring above the square")
      let rest = try render(kind, focused: false)
      #expect(!pixel(rest, x: center.x, y: y).isClose(to: ring, tolerance: 40), "\(kind): no ring without focus")
    }
  }

  @Test("DTP-21 a later month slides in from the end and the old one out toward the start; the reverse for an earlier one")
  func slide() throws {
    let pager = TanreiDatePickerPager()
    func render(arriving: Bool, direction: CGFloat, layout: LayoutDirection) throws -> Bitmap {
      pager.direction = direction
      return try Snapshot.renderExact(
        Rectangle().fill(Color.red).frame(width: 10, height: 10)
          .modifier(TanreiDatePickerPageSlide(pager: pager, arriving: arriving, width: 10))
          .frame(width: 30, height: 10)
          .environment(\.layoutDirection, layout))
    }
    func redAt(_ bitmap: Bitmap, x: CGFloat) -> Bool { pixel(bitmap, x: Snapshot.inset + x, y: Snapshot.inset + 5).r > 200 && pixel(bitmap, x: Snapshot.inset + x, y: Snapshot.inset + 5).g < 80 }
    #expect(redAt(try render(arriving: true, direction: 1, layout: .leftToRight), x: 25), "a later month comes from the end")
    #expect(redAt(try render(arriving: false, direction: 1, layout: .leftToRight), x: 5), "and the old one leaves toward the start")
    #expect(redAt(try render(arriving: true, direction: -1, layout: .leftToRight), x: 5), "an earlier month comes from the start")
    #expect(redAt(try render(arriving: true, direction: 1, layout: .rightToLeft), x: 5), "mirrored right to left")
  }

  @Test("tokens drive the rendering: a modified system's selected fill and cell size are what is drawn")
  func modifiedSystem() throws {
    var system = TanreiSystem.tanrei
    system.datePicker.conditions.selected.enabled.containerColor = .role(.error)
    let bitmap = try dockedFixture("docked", system: system)
    let seventeen = Docked.cell(row: 2, column: 4)
    expectColor(pixel(bitmap, x: seventeen.x - 15, y: seventeen.y - 15), .role(.error))
    var larger = TanreiSystem.tanrei
    larger.datePicker.cellSize = 56
    let stage = CGSize(width: 460, height: 500)
    let wide = try Snapshot.render(
      TanreiDatePickerSurface(presentation: .docked, selection: components("2026-09-17"), today: components("2026-09-24"), locale: enUS)
        .frame(width: stage.width, height: stage.height),
      theme: theme(larger))
    let surface = CGSize(width: 7 * 56 + 2 * tokens.containerPaddingInline, height: 2 * tokens.containerPaddingBlock + 8 * 56)
    let origin = CGPoint(x: Snapshot.inset + (stage.width - surface.width) / 2, y: Snapshot.inset + (stage.height - surface.height) / 2)
    let day = CGPoint(x: origin.x + tokens.containerPaddingInline + 4.5 * 56, y: origin.y + tokens.containerPaddingBlock + 2 * 56 + 2.5 * 56)
    expectColor(pixel(wide, x: day.x - 15, y: day.y - 15), .role(.primary), "the cells are cell.size wide and tall")
  }
}

// MARK: - Hosted

#if os(macOS)
/// Everything a hosted picker reports, in order.
@MainActor
private final class Log {
  var events: [String] = []
}

private func iso(_ components: DateComponents?) -> String {
  TanreiCalendarDate(components: components)?.description ?? "-"
}

/// A button anchoring a picker that owns its choice and its open state in `@State`, as an app does, and logs every event; a
/// button far below it (a place outside the picker, which logs its presses) and a text field to move focus to.
private struct DockedHost: View {
  let log: Log
  var presentation: TanreiDatePickerPresentation = .docked
  var mode: TanreiDatePickerMode = .single
  var entryMode: TanreiDatePickerEntryMode = .calendar
  var min: String? = nil
  var disabled: Set<String> = []
  @State var value: DateComponents?
  @State var range = TanreiDateRange()
  @State var isOpen = true
  @State private var other = ""

  var body: some View {
    let selection = Binding(get: { value }, set: { value = $0; log.events.append("change \(iso($0))") })
    let rangeBinding = Binding(get: { range }, set: { range = $0; log.events.append("change \(iso($0.start))…\(iso($0.end))") })
    let close: @MainActor (TanreiDatePickerCloseReason) -> Void = { log.events.append("close \($0.rawValue)") }
    // A docked picker is anchored to the button; a modal one is attached to the root (on macOS it is drawn over the view the
    // modifier is attached to).
    let docked = presentation == .docked
    let anchor = Button("Anchor") { log.events.append("anchor") }
      .frame(width: HostStage.anchor.width, height: HostStage.anchor.height)
    let root = VStack(alignment: .leading, spacing: .zero) {
      if docked {
        picker(anchor, selection: selection, range: rangeBinding, close: close)
      } else {
        anchor
      }
      Color.clear.frame(width: HostStage.width, height: HostStage.room)
      HStack {
        Button("Elsewhere") { log.events.append("elsewhere") }.frame(width: HostStage.anchor.width, height: HostStage.anchor.height)
        TextField("Other", text: $other).frame(width: HostStage.anchor.width)
      }
    }
    .padding(Snapshot.inset)
    .frame(width: HostStage.width + 2 * Snapshot.inset, alignment: .topLeading)
    .background(light[.surface])
    return Group {
      if docked { root } else { picker(root, selection: selection, range: rangeBinding, close: close) }
    }
    .tanreiTheme(Snapshot.theme)
  }

  @ViewBuilder
  private func picker(
    _ content: some View, selection: Binding<DateComponents?>, range: Binding<TanreiDateRange>, close: @escaping @MainActor (TanreiDatePickerCloseReason) -> Void
  ) -> some View {
    if mode == .single {
      content.tanreiDatePicker(
        isPresented: $isOpen, selection: selection, presentation: presentation, minDate: components(min), disabledDates: Set(disabled.compactMap { components($0) }),
        today: components("2026-09-24"), locale: enUS, entryMode: entryMode, onClose: close)
    } else {
      content.tanreiDatePicker(
        isPresented: $isOpen, range: range, presentation: presentation, today: components("2026-09-24"), locale: enUS, entryMode: entryMode,
        labels: TanreiDatePickerLabels(label: "Select dates"), onClose: close)
    }
  }
}

@MainActor
private enum HostStage {
  static let width: CGFloat = 480
  static let anchor = CGSize(width: 120, height: 40)
  /// Below the anchor: room for the docked surface (and, for a modal picker, a window to centre in).
  static let room: CGFloat = 600
  /// The docked surface's top-left in the hosted view.
  static var surface: CGPoint { CGPoint(x: Snapshot.inset, y: Snapshot.inset + anchor.height + tokens.dockedOffset) }
  /// A place far from the picker: the "Elsewhere" button.
  static var elsewhere: CGPoint { CGPoint(x: Snapshot.inset + anchor.width / 2, y: Snapshot.inset + anchor.height + room + anchor.height / 2) }
}

/// Key presses AppKit delivers: the function-key characters and their virtual key codes (the keyboard's layout, not design
/// values).
private enum Key {
  static func function(_ scalar: Int, _ code: UInt16) -> (String, UInt16) { (String(Character(UnicodeScalar(scalar)!)), code) }
  static let right = function(NSRightArrowFunctionKey, 124)
  static let left = function(NSLeftArrowFunctionKey, 123)
  static let down = function(NSDownArrowFunctionKey, 125)
  static let up = function(NSUpArrowFunctionKey, 126)
  static let home = function(NSHomeFunctionKey, 115)
  static let end = function(NSEndFunctionKey, 119)
  static let pageUp = function(NSPageUpFunctionKey, 116)
  static let pageDown = function(NSPageDownFunctionKey, 121)
  static let enter = ("\r", UInt16(36))
  static let space = (" ", UInt16(49))
  static let escape = ("\u{1B}", UInt16(53))
  static let tab = ("\t", UInt16(48))
}

/// The hosted window made last: `HostedView` places its windows far off-screen.
@MainActor
private func hostedWindow() -> NSWindow? {
  NSApp.windows.filter { $0.isVisible && $0.frame.minX < -1_000 }.max { $0.windowNumber < $1.windowNumber }
}

extension HostedView {
  /// One key press (down and up), with Shift when asked.
  fileprivate func press(_ key: (String, UInt16), shift: Bool = false) {
    guard let window = hostedWindow() else { return }
    for type in [NSEvent.EventType.keyDown, .keyUp] {
      guard
        let event = NSEvent.keyEvent(
          with: type, location: .zero, modifierFlags: shift ? [.shift] : [], timestamp: ProcessInfo.processInfo.systemUptime,
          windowNumber: window.windowNumber, context: nil, characters: key.0, charactersIgnoringModifiers: key.0, isARepeat: false, keyCode: key.1)
      else { continue }
      window.sendEvent(event)
    }
    settle()
  }

  /// A click sent through the application, as the window server delivers one, so that local event monitors see it.
  fileprivate func appClick(at point: CGPoint) {
    guard let window = hostedWindow() else { return }
    for type in [NSEvent.EventType.leftMouseDown, .leftMouseUp] {
      guard
        let event = NSEvent.mouseEvent(
          with: type, location: CGPoint(x: point.x, y: size.height - point.y), modifierFlags: [], timestamp: ProcessInfo.processInfo.systemUptime,
          windowNumber: window.windowNumber, context: nil, eventNumber: 0, clickCount: 1, pressure: type == .leftMouseDown ? 1 : 0)
      else { continue }
      NSApp.sendEvent(event)
      settle()
    }
  }
}

@MainActor
private func host(_ host: DockedHost) async -> HostedView<DockedHost> {
  let hosted = HostedView(host)
  hosted.makeKey()
  // The picker opens, and focus moves in, a turn after it appears.
  _ = await hosted.wait(atMost: 1) { false }
  return hosted
}

/// What a test flips to open a picker.
@MainActor
@Observable
private final class Opener {
  var isOpen = false
}

/// A text field anchoring a docked picker, as a product's date field is.
private struct FieldAnchorHost: View {
  let log: Log
  let opener: Opener
  @State private var text = ""
  @State private var value: DateComponents?

  var body: some View {
    @Bindable var opener = opener
    VStack(alignment: .leading, spacing: .zero) {
      TextField("Due date", text: $text)
        .frame(width: HostStage.anchor.width)
        .tanreiDatePicker(
          isPresented: $opener.isOpen, selection: $value, presentation: .docked, today: components("2026-09-24"), locale: enUS,
          onClose: { log.events.append("close \($0.rawValue)") })
      Color.clear.frame(width: HostStage.width, height: HostStage.room)
    }
    .padding(Snapshot.inset)
    .background(light[.surface])
    .tanreiTheme(Snapshot.theme)
  }
}

@MainActor
@Suite("TanreiDatePicker hosted", .serialized)
struct TanreiDatePickerHostedTests {
  @Test("DTP-3 DTP-4 focus moves into the picker when it opens and back to its anchor when it closes")
  func focusReturns() async {
    let log = Log()
    let opener = Opener()
    let hosted = HostedView(FieldAnchorHost(log: log, opener: opener))
    hosted.makeKey()
    #expect(hosted.focusTextField())
    func fieldHasFocus() -> Bool { (hostedWindow()?.firstResponder as? NSTextView)?.isFieldEditor == true }
    #expect(fieldHasFocus())
    opener.isOpen = true
    #expect(await hosted.wait(atMost: 2) { !fieldHasFocus() }, "focus moved into the picker")
    hosted.press(Key.escape)
    #expect(await hosted.wait(atMost: 2) { log.events == ["close escape"] && fieldHasFocus() }, "\(log.events)")
  }

  @Test("DTP-3 DTP-7 DTP-8 DTP-17 DTP-18 a docked picker focuses its active day; the arrows move it; Enter commits it, then closes with select")
  func dockedKeys() async {
    let log = Log()
    let hosted = await host(DockedHost(log: log, value: components("2026-09-17")))
    hosted.press(Key.right)
    hosted.press(Key.down)
    #expect(log.events.isEmpty, "moving never chooses")
    hosted.press(Key.enter)
    #expect(await hosted.wait(atMost: 2) { log.events == ["change 2026-09-25", "close select"] }, "\(log.events)")
  }

  @Test("DTP-18 Home, End, Page Down and Shift+Page Down move the active day and show its month")
  func dockedPageKeys() async {
    let log = Log()
    let hosted = await host(DockedHost(log: log, value: components("2026-09-17")))
    hosted.press(Key.home)
    hosted.press(Key.end)
    hosted.press(Key.pageDown)
    hosted.press(Key.pageDown, shift: true)
    hosted.press(Key.space)
    #expect(await hosted.wait(atMost: 2) { log.events == ["change 2027-10-19", "close select"] }, "\(log.events)")
  }

  @Test("DTP-18 DTP-30 an unavailable day is reached but not chosen; the active day never passes min")
  func dockedUnavailable() async {
    let log = Log()
    let hosted = await host(DockedHost(log: log, min: "2026-09-16", disabled: ["2026-09-18"], value: components("2026-09-17")))
    hosted.press(Key.right)
    hosted.press(Key.enter)
    #expect(log.events.isEmpty, "18 is unavailable: \(log.events)")
    hosted.press(Key.up)
    hosted.press(Key.enter)
    #expect(await hosted.wait(atMost: 2) { log.events == ["change 2026-09-16", "close select"] }, "Up stops at min: \(log.events)")
  }

  @Test("DTP-9 DTP-7 a docked range: the start emits nothing; the end commits the range, then closes")
  func dockedRange() async {
    let log = Log()
    let hosted = await host(DockedHost(log: log, mode: .range))
    hosted.press(Key.enter)
    #expect(log.events.isEmpty, "a range's start emits nothing")
    hosted.press(Key.right)
    hosted.press(Key.right)
    hosted.press(Key.enter)
    #expect(await hosted.wait(atMost: 2) { log.events == ["change 2026-09-24…2026-09-26", "close select"] }, "\(log.events)")
  }

  @Test("DTP-5 Escape closes with escape and commits nothing")
  func escape() async {
    let log = Log()
    let hosted = await host(DockedHost(log: log, value: components("2026-09-17")))
    hosted.press(Key.right)
    hosted.press(Key.escape)
    #expect(await hosted.wait(atMost: 2) { log.events == ["close escape"] }, "\(log.events)")
  }

  @Test("DTP-5 Tab out of a docked picker closes it with tab")
  func tab() async {
    let log = Log()
    let hosted = await host(DockedHost(log: log, value: components("2026-09-17")))
    hosted.press(Key.tab)
    #expect(await hosted.wait(atMost: 2) { log.events == ["close tab"] }, "\(log.events)")
  }

  @Test("DTP-5 a press outside a docked picker and its anchor closes it with outside, and still reaches what is under it")
  func outside() async {
    let log = Log()
    let hosted = await host(DockedHost(log: log, value: components("2026-09-17")))
    hosted.appClick(at: HostStage.elsewhere)
    #expect(await hosted.wait(atMost: 2) { log.events.contains("close outside") && log.events.contains("elsewhere") }, "\(log.events)")
    #expect(log.events.filter { $0.hasPrefix("close") }.count == 1)
  }

  @Test("DTP-20 DTP-14 the next-month button shows the next month and keeps the active day's number; focus stays out of the grid's way")
  func nextMonth() async {
    let log = Log()
    let hosted = await host(DockedHost(log: log, value: components("2026-09-17")))
    let medium = TanreiSystem.tanrei.iconButton.sizes[.medium].containerSize
    let next = CGPoint(
      x: HostStage.surface.x + 360 - tokens.containerPaddingInline - medium / 2,
      y: HostStage.surface.y + tokens.containerPaddingBlock + 24)
    hosted.appClick(at: next)
    #expect(log.events.isEmpty, "\(log.events)")
    hosted.press(Key.enter)
    #expect(await hosted.wait(atMost: 2) { log.events == ["change 2026-10-17", "close select"] }, "\(log.events)")
  }

  @Test("DTP-15 DTP-16 DTP-19 the view toggle (pressed above its container, in its hit area) opens the year view; its keys move the year; Enter shows that month")
  func yearView() async {
    let log = Log()
    let hosted = await host(DockedHost(log: log, value: components("2026-09-17")))
    let toggle = CGPoint(x: HostStage.surface.x + tokens.containerPaddingInline + 40, y: HostStage.surface.y + tokens.containerPaddingBlock + 3)
    hosted.appClick(at: toggle)
    _ = await hosted.wait(atMost: 1) { false }
    hosted.press(Key.down)
    hosted.press(Key.right)
    hosted.press(Key.enter)
    _ = await hosted.wait(atMost: 1) { false }
    #expect(log.events.isEmpty, "choosing a year does not change the choice: \(log.events)")
    hosted.press(Key.enter)
    #expect(await hosted.wait(atMost: 2) { log.events == ["change 2030-09-01", "close select"] }, "\(log.events)")
  }

  @Test("DTP-5 focus moving out of a docked picker closes it with focus-out")
  func focusOut() async {
    let log = Log()
    let hosted = await host(DockedHost(log: log, value: components("2026-09-17")))
    hosted.focusTextField()
    #expect(await hosted.wait(atMost: 2) { log.events == ["close focus-out"] }, "\(log.events)")
  }

  @Test("DTP-1 DTP-5 DTP-6 a modal picker makes what it covers inert, holds a pending choice, and a press on its scrim closes it with outside, committing nothing")
  func modalScrim() async {
    let log = Log()
    let hosted = await host(DockedHost(log: log, presentation: .modal, value: components("2026-09-17")))
    hosted.press(Key.right)
    hosted.press(Key.enter)
    #expect(log.events.isEmpty, "a modal picker's choice is pending: \(log.events)")
    hosted.appClick(at: HostStage.elsewhere)
    #expect(await hosted.wait(atMost: 2) { log.events == ["close outside"] }, "the scrim, not the button under it: \(log.events)")
  }

  @Test("DTP-3 DTP-6 DTP-26 DTP-27 text entry: focus in the field; a typed date and the action key activate OK — change, then close with confirm")
  func modalText() async {
    let log = Log()
    let hosted = await host(DockedHost(log: log, presentation: .modal, entryMode: .text))
    hosted.type("9/20/2026")
    hosted.press(Key.enter)
    #expect(await hosted.wait(atMost: 2) { log.events == ["change 2026-09-20", "close confirm"] }, "\(log.events)")
  }

  @Test("DTP-26 DTP-6 text that is not a date is an error on commit, and OK stays disabled")
  func modalInvalidText() async {
    let log = Log()
    let hosted = await host(DockedHost(log: log, presentation: .modal, entryMode: .text))
    hosted.type("13/45/2026")
    hosted.press(Key.enter)
    _ = await hosted.wait(atMost: 1) { false }
    #expect(log.events.isEmpty, "\(log.events)")
    hosted.press(Key.escape)
    #expect(await hosted.wait(atMost: 2) { log.events == ["close escape"] }, "\(log.events)")
  }

  @Test("DTP-27 range text entry: the action key moves to the end field, then activates OK")
  func modalRangeText() async {
    let log = Log()
    let hosted = await host(DockedHost(log: log, presentation: .modal, mode: .range, entryMode: .text))
    hosted.type("9/10/2026")
    hosted.press(Key.enter)
    _ = await hosted.wait(atMost: 1) { false }
    hosted.type("9/12/2026")
    hosted.press(Key.enter)
    #expect(await hosted.wait(atMost: 2) { log.events == ["change 2026-09-10…2026-09-12", "close confirm"] }, "\(log.events)")
  }

  /// The modal fixture's surface, hosted: where its controls are on the 480 × 640 stage (read from its baseline).
  private enum ModalStage {
    static let cancel = CGPoint(x: 314, y: 567)
    static let ok = CGPoint(x: 383, y: 567)
    static let entryToggle = CGPoint(x: 389, y: 105)
  }

  private func surface(_ log: Log, range: Bool = false, start: String? = nil) -> some View {
    TanreiDatePickerSurface(
      presentation: .modal, mode: range ? .range : .single, selection: range ? nil : components("2026-09-17"),
      range: TanreiDateRange(start: components(start)), today: components("2026-09-24"), locale: enUS,
      onChange: { value, range in log.events.append("change \(iso(value)) \(iso(range.start))…\(iso(range.end))") },
      onClose: { log.events.append("close \($0.rawValue)") }
    )
    .frame(width: Stage.modal.width, height: Stage.modal.height)
    .tanreiTheme(Snapshot.theme)
  }

  @Test("DTP-24 DTP-6 Cancel closes with cancel; OK closes with confirm, and emits change only when the choice differs; OK is disabled while it is incomplete")
  func actions() async {
    let log = Log()
    let cancel = HostedView(surface(log))
    cancel.click(at: ModalStage.cancel)
    #expect(log.events == ["close cancel"])
    log.events = []
    let ok = HostedView(surface(log))
    ok.click(at: ModalStage.ok)
    #expect(log.events == ["close confirm"], "the choice is the one it opened with: no change")
    log.events = []
    let incomplete = HostedView(surface(log, range: true, start: "2026-09-10"))
    incomplete.click(at: ModalStage.ok)
    #expect(log.events.isEmpty, "no end: OK is disabled")
  }

  @Test("DTP-28 DTP-3 the entry-mode toggle switches to text entry, focus in the first field, and keeps the pending choice")
  func entryToggle() async {
    let log = Log()
    let hosted = HostedView(surface(log))
    hosted.makeKey()
    hosted.click(at: ModalStage.entryToggle)
    #expect(await hosted.wait(atMost: 2) { (hostedWindow()?.firstResponder as? NSTextView)?.isFieldEditor == true }, "focus in the field")
    hosted.press(Key.enter)
    #expect(await hosted.wait(atMost: 2) { log.events == ["close confirm"] }, "the field holds the pending date, 09/17/2026: \(log.events)")
  }

  @Test("DTP-33 a quick press of a day shows the pressed state at once and keeps it for press-hold")
  func pressHeld() async throws {
    var system = TanreiSystem.tanrei
    system.datePicker.conditions.unselected.pressed.containerColor = .role(.error)
    system.motion.duration.pressHold = 1500
    // No fade: a color read is the state, not a frame of a transition.
    system.datePicker.motionStateDuration = 0
    let metrics = TanreiDatePickerMetrics.resolve(tokens: system.datePicker, target: 48, dayLine: 20, widest: nil, margin: 0)
    let hosted = HostedView(
      Button(action: {}) { Text(verbatim: "12") }
        .buttonStyle(TanreiDatePickerCellStyle(kind: .day, condition: .unselected, halfBand: nil, isFocused: false, keyPresses: 0, metrics: metrics))
        .padding(8)
        .background(light[.surface])
        .tanreiTheme(theme(system)))
    let center = CGPoint(x: 8 + 24, y: 8 + 24)
    let corner = CGPoint(x: center.x - 15, y: center.y - 15)
    let error = light[.error].rgba8()
    hosted.mouse(.leftMouseDown, at: center)
    hosted.settle()
    #expect(hosted.color(at: corner)?.isClose(to: error, tolerance: 12) == true, "shown at once: \(String(describing: hosted.color(at: corner)))")
    hosted.mouse(.leftMouseUp, at: center)
    hosted.settle()
    #expect(hosted.color(at: corner)?.isClose(to: error, tolerance: 12) == true, "still held: \(String(describing: hosted.color(at: corner)))")
    #expect(await hosted.wait(atMost: 5) { hosted.color(at: corner)?.isClose(to: error, tolerance: 12) == false }, "released after the hold")
  }

  @Test("DTP-31 hover paints the hovered tokens of the day's condition")
  func hover() throws {
    var system = TanreiSystem.tanrei
    system.datePicker.conditions.unselected.hovered.containerColor = .role(.error)
    system.datePicker.motionStateDuration = 0
    let metrics = TanreiDatePickerMetrics.resolve(tokens: system.datePicker, target: 48, dayLine: 20, widest: nil, margin: 0)
    let hosted = HostedView(
      Button(action: {}) { Text(verbatim: "12") }
        .buttonStyle(TanreiDatePickerCellStyle(kind: .day, condition: .unselected, halfBand: nil, isFocused: false, keyPresses: 0, metrics: metrics))
        .padding(8)
        .background(light[.surface])
        .tanreiTheme(theme(system)))
    let center = CGPoint(x: 8 + 24, y: 8 + 24)
    hosted.hover(at: center)
    _ = RunLoop.main.run(mode: .default, before: Date().addingTimeInterval(0.4))
    #expect(hosted.color(at: CGPoint(x: center.x - 15, y: center.y - 15))?.isClose(to: light[.error].rgba8(), tolerance: 12) == true)
  }
}
#endif

// MARK: - Semantics that need no host

@MainActor
@Suite("TanreiDatePicker semantics")
struct TanreiDatePickerSemanticsTests {
  @Test("DTP-36 DTP-13 the grid is named by its month and year; weekday headers by their full names; the surface by label")
  func names() {
    let en = TanreiDatePickerLocale.shared(enUS, firstDayOfWeek: .monday)
    #expect(en.monthYear(TanreiCalendarMonth(year: 2026, month: 9)) == "September 2026")
    let columns = (0..<7).map { (en.firstWeekday - 1 + $0) % 7 }
    #expect(columns.map { en.fullWeekdays[$0] }.first == "Monday", "the column headers from the first day of the week")
    #expect(TanreiDatePickerLabels().label == "Select date" && TanreiDatePickerLabels().yearViewLabel == "Choose a year")
  }

  @Test("DTP-4 DTP-22 closing: the modal count comes back, and the surface leaves after the close motion")
  func modalCount() {
    let before = TanreiModalCoordinator.shared.openModals
    TanreiModalCoordinator.shared.opened()
    #expect(TanreiModalCoordinator.shared.isCovered)
    TanreiModalCoordinator.shared.closed()
    #expect(TanreiModalCoordinator.shared.openModals == before)
  }
}


