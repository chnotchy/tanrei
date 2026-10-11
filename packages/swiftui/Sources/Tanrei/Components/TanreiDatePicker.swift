import SwiftUI

#if os(iOS)
import UIKit
#elseif os(macOS)
import AppKit
#endif

// Spec: specs/date-picker.spec.json — tokens: TanreiDatePickerTokens (comp.date-picker), read from the design system in the
// environment (`system.datePicker`). Every design value in this file comes from a token; there are no literals, and no
// state's look is computed here. The controls the picker places are whole Tanrei components with their own tokens: the
// previous, next and entry-mode buttons are `TanreiIconButton`s (standard, medium), Cancel and OK are
// `TanreiButton`s (text, medium) and the text-entry fields are `TanreiTextField`s (outlined, medium, text).
//
// Two presentations of one picker (DTP-1, DTP-2):
// - modal: as the dialog — `.fullScreenCover` on a clear presentation background with the system transition off on iOS
//   (Tanrei draws the scrim and the motion; the rest of the app is inert, focus is kept in); on macOS drawn over the view the
//   modifier is attached to, which is inert meanwhile. It counts itself in `TanreiModalCoordinator`.
// - docked: an operated overlay that is not modal, drawn by Tanrei in its anchor's overlay — not a system popover,
//   which draws its own bubble, arrow and placement that the tokens cannot reach
//   — placed below the anchor (or above it), start-aligned, shifted to stay within the viewport margin.
//
// Dates are Gregorian calendar dates without a time or a time zone (DTP-37): `DateComponents` with a year, a month and a day
// at the API, `TanreiCalendarDate` inside. Every name, digit and date form comes from Foundation (`DateFormatter` templates,
// `Calendar`'s first weekday, `NumberFormatter`'s digits) for the picker's locale — never from a list of locales.

// MARK: - Public types

/// DTP-1, DTP-2 — how the picker is presented: a dialog over a scrim with a header, text entry and Cancel and OK (`modal`,
/// the default), or a surface below its anchor that commits a choice at once (`docked`). A closed set:
/// `TanreiDatePickerPresentation(named:)` reads a spec name from data, and an unknown one is `.modal`, reported in debug
/// builds (DTP-40).
public enum TanreiDatePickerPresentation: String, CaseIterable, Sendable {
  case modal, docked

  /// The presentation a spec name (`"modal"`, `"docked"`) stands for; an unknown name is `.modal`, reported (DTP-40).
  public init(named name: String) {
    self = TanreiDatePickerNames.read(name, as: Self.self, default: .modal, prop: "presentation")
  }
}

/// The spec's `mode`: one date (`single`) or one range of dates (`range`). On SwiftUI the overload of `.tanreiDatePicker` is the
/// mode — `selection:` for a date, `range:` for a range —; this type reads a spec name from data (galleries, fixtures): an
/// unknown one is `.single`, reported in debug builds (DTP-40).
public enum TanreiDatePickerMode: String, CaseIterable, Sendable {
  case single, range

  public init(named name: String) {
    self = TanreiDatePickerNames.read(name, as: Self.self, default: .single, prop: "mode")
  }
}

/// DTP-28 — how a modal picker opens: on the calendar or with text fields. A docked picker has the calendar only.
public enum TanreiDatePickerEntryMode: String, CaseIterable, Sendable {
  case calendar, text

  public init(named name: String) {
    self = TanreiDatePickerNames.read(name, as: Self.self, default: .calendar, prop: "entryMode")
  }
}

/// DTP-16, DTP-29 — whether the calendar opens on the days of a month or on the list of years.
public enum TanreiDatePickerStartView: String, CaseIterable, Sendable {
  case day, year

  public init(named name: String) {
    self = TanreiDatePickerNames.read(name, as: Self.self, default: .day, prop: "startView")
  }
}

/// DTP-37 — the weekday in the first column: the locale's (`locale`, the default: its calendar's `firstWeekday`), or a
/// named one.
public enum TanreiDatePickerFirstDayOfWeek: String, CaseIterable, Sendable {
  case locale, sunday, monday, tuesday, wednesday, thursday, friday, saturday

  public init(named name: String) {
    self = TanreiDatePickerNames.read(name, as: Self.self, default: .locale, prop: "firstDayOfWeek")
  }

  /// Foundation's weekday number (1 = Sunday … 7 = Saturday), or `nil` for the locale's.
  var weekday: Int? {
    switch self {
    case .locale: return nil
    case .sunday: return 1
    case .monday: return 2
    case .tuesday: return 3
    case .wednesday: return 4
    case .thursday: return 5
    case .friday: return 6
    case .saturday: return 7
    }
  }
}

/// DTP-5 — why the picker asks to be closed (the spec's `close` reasons, in Swift's casing). `onClose` receives it; the
/// picker then writes `false` to `isPresented` itself.
public enum TanreiDatePickerCloseReason: String, CaseIterable, Sendable {
  /// The Escape key.
  case escape
  /// The platform's back: the accessibility escape gesture.
  case back
  /// A press on the scrim of a modal picker, or outside a docked picker and its anchor.
  case outside
  /// Tab or Shift+Tab out of a docked picker.
  case tab
  /// Focus moved out of a docked picker.
  case focusOut = "focus-out"
  /// Cancel.
  case cancel
  /// OK, after the choice was committed.
  case confirm
  /// A completed choice in a docked picker, after it was committed.
  case select
}

/// The chosen range of a range picker: `start` and `end` as `DateComponents` (year, month, day, Gregorian), `end` never before
/// `start` and `nil` while only `start` is chosen.
public struct TanreiDateRange: Equatable, Hashable, Sendable {
  public var start: DateComponents?
  public var end: DateComponents?

  public init(start: DateComponents? = nil, end: DateComponents? = nil) {
    self.start = start
    self.end = end
  }
}

/// Every word the picker shows or announces that is not locale data (DTP-23, DTP-24, DTP-14, DTP-15, DTP-28, DTP-36, DTP-26).
/// The field names are the spec's; the defaults are its English words — a product in another language sets them.
public struct TanreiDatePickerLabels: Equatable, Sendable {
  /// Names the picker: its surface's accessible name, and the line above the chosen date in a modal picker's header.
  public var label: String
  /// Single mode: the text field's label, and what the header shows while no date is chosen.
  public var dateLabel: String
  /// Range mode: the start field's label, the header's placeholder for the start and the start day's description.
  public var startLabel: String
  /// Range mode: the end field's label, the header's placeholder for the end and the end day's description.
  public var endLabel: String
  /// OK.
  public var confirmLabel: String
  /// Cancel.
  public var cancelLabel: String
  /// The previous-month button's name.
  public var previousMonthLabel: String
  /// The next-month button's name.
  public var nextMonthLabel: String
  /// The description of the view toggle, whose name is the month and year it shows.
  public var yearViewLabel: String
  /// The entry-mode toggle's name while the calendar is shown.
  public var textEntryLabel: String
  /// The entry-mode toggle's name while text entry is shown.
  public var calendarEntryLabel: String
  /// Read after today's date and the current year (SwiftUI has no current-date trait).
  public var todayLabel: String
  /// The error of a field whose text is not a date, or whose end is before its start.
  public var invalidText: String
  /// The error of a field whose date is before min, after max or disabled.
  public var unavailableText: String

  public init(
    label: String = "Select date", dateLabel: String = "Date", startLabel: String = "Start date", endLabel: String = "End date",
    confirmLabel: String = "OK", cancelLabel: String = "Cancel", previousMonthLabel: String = "Previous month",
    nextMonthLabel: String = "Next month", yearViewLabel: String = "Choose a year", textEntryLabel: String = "Switch to text entry",
    calendarEntryLabel: String = "Switch to calendar", todayLabel: String = "Today", invalidText: String = "Enter a valid date",
    unavailableText: String = "This date can't be chosen"
  ) {
    self.label = label
    self.dateLabel = dateLabel
    self.startLabel = startLabel
    self.endLabel = endLabel
    self.confirmLabel = confirmLabel
    self.cancelLabel = cancelLabel
    self.previousMonthLabel = previousMonthLabel
    self.nextMonthLabel = nextMonthLabel
    self.yearViewLabel = yearViewLabel
    self.textEntryLabel = textEntryLabel
    self.calendarEntryLabel = calendarEntryLabel
    self.todayLabel = todayLabel
    self.invalidText = invalidText
    self.unavailableText = unavailableText
  }
}

/// Reads a closed enum from a spec name; an unknown name is the default, reported in debug builds (DTP-40).
enum TanreiDatePickerNames {
  static func read<Value: RawRepresentable>(_ name: String, as: Value.Type, default fallback: Value, prop: String) -> Value
  where Value.RawValue == String {
    if let value = Value(rawValue: name) { return value }
    TanreiDiagnostics.report("Tanrei: a date picker has no \(prop) \"\(name)\"; it behaves as \"\(fallback.rawValue)\" (DTP-40).")
    return fallback
  }
}

// MARK: - The modifiers

extension View {
  /// Presents a Tanrei date picker for one date while `isPresented` is true, as `.sheet` and `.popover` are.
  ///
  ///     @State private var due: DateComponents? = DateComponents(year: 2026, month: 9, day: 17)
  ///     @State private var picking = false
  ///     TanreiButton("Due date", action: { picking = true })
  ///       .tanreiDatePicker(isPresented: $picking, selection: $due)
  ///
  /// - `selection` is the chosen date (`nil`: none): year, month and day of a Gregorian date. Writing it is the spec's
  ///   `change` — by OK in a modal picker (DTP-6), by choosing a day in a docked one (DTP-7) —, and only when the choice
  ///   differs; it is written before `onClose`.
  /// - `presentation`: `.modal` (a dialog over a scrim, with a header, text entry and Cancel and OK) or `.docked` (below the
  ///   view this modifier is attached to — the anchor —, which the rest of the screen stays usable around).
  /// - `minDate`, `maxDate`, `disabledDates` and `isDateDisabled` make days unavailable (DTP-29); `today` pins the date drawn
  ///   as today (the device's own date while `nil`); `firstDayOfWeek` and `locale` (the environment's `\.locale` while `nil`)
  ///   the first column and every name, digit and date form (DTP-37).
  /// - `onClose` receives why the picker closes (DTP-5); the picker writes `false` to `isPresented` itself.
  public func tanreiDatePicker(
    isPresented: Binding<Bool>, selection: Binding<DateComponents?>, presentation: TanreiDatePickerPresentation = .modal,
    minDate: DateComponents? = nil, maxDate: DateComponents? = nil, disabledDates: Set<DateComponents> = [],
    isDateDisabled: ((DateComponents) -> Bool)? = nil, today: DateComponents? = nil,
    firstDayOfWeek: TanreiDatePickerFirstDayOfWeek = .locale, locale: Locale? = nil, entryMode: TanreiDatePickerEntryMode = .calendar,
    startView: TanreiDatePickerStartView = .day, labels: TanreiDatePickerLabels = TanreiDatePickerLabels(),
    onClose: (@MainActor (TanreiDatePickerCloseReason) -> Void)? = nil
  ) -> some View {
    let options = TanreiDatePickerOptions(
      presentation: presentation, mode: .single, minDate: minDate, maxDate: maxDate, disabledDates: disabledDates,
      isDateDisabled: isDateDisabled, today: today, firstDayOfWeek: firstDayOfWeek, locale: locale, entryMode: entryMode,
      startView: startView, labels: labels)
    return modifier(
      TanreiDatePickerPresenter(
        isPresented: isPresented, options: options,
        current: { TanreiDatePickerInput(value: selection.wrappedValue) },
        commit: { selection.wrappedValue = $0.date?.components },
        onClose: onClose))
  }

  /// Presents a Tanrei date picker for one range of dates while `isPresented` is true: the first day chosen is the start,
  /// the next one on or after it the end (DTP-9). `range` is written only when a choice completes (OK, or the end in a docked
  /// picker) and differs. Use `labels.label` "Select dates" or the product's own words.
  public func tanreiDatePicker(
    isPresented: Binding<Bool>, range: Binding<TanreiDateRange>, presentation: TanreiDatePickerPresentation = .modal,
    minDate: DateComponents? = nil, maxDate: DateComponents? = nil, disabledDates: Set<DateComponents> = [],
    isDateDisabled: ((DateComponents) -> Bool)? = nil, today: DateComponents? = nil,
    firstDayOfWeek: TanreiDatePickerFirstDayOfWeek = .locale, locale: Locale? = nil, entryMode: TanreiDatePickerEntryMode = .calendar,
    startView: TanreiDatePickerStartView = .day, labels: TanreiDatePickerLabels = TanreiDatePickerLabels(),
    onClose: (@MainActor (TanreiDatePickerCloseReason) -> Void)? = nil
  ) -> some View {
    let options = TanreiDatePickerOptions(
      presentation: presentation, mode: .range, minDate: minDate, maxDate: maxDate, disabledDates: disabledDates,
      isDateDisabled: isDateDisabled, today: today, firstDayOfWeek: firstDayOfWeek, locale: locale, entryMode: entryMode,
      startView: startView, labels: labels)
    return modifier(
      TanreiDatePickerPresenter(
        isPresented: isPresented, options: options,
        current: { TanreiDatePickerInput(start: range.wrappedValue.start, end: range.wrappedValue.end) },
        commit: { range.wrappedValue = TanreiDateRange(start: $0.start?.components, end: $0.end?.components) },
        onClose: onClose))
  }
}

// MARK: - Calendar dates

/// A Gregorian calendar date without a time or a time zone (DTP-37). Arithmetic is done on day counts, never through an
/// instant.
struct TanreiCalendarDate: Hashable, Comparable, Sendable, CustomStringConvertible {
  let year: Int
  /// 1 (January) … 12.
  let month: Int
  let day: Int

  /// A date from its parts, or `nil` when that day does not exist (February 30) or lies outside years 1 … 9999.
  init?(year: Int, month: Int, day: Int) {
    guard (1...9999).contains(year), (1...12).contains(month), day >= 1, day <= TanreiCalendarMonth.days(year: year, month: month) else { return nil }
    self.year = year
    self.month = month
    self.day = day
  }

  /// A date from `DateComponents` with a year, a month and a day; `nil` when one is missing or the day does not exist.
  init?(components: DateComponents?) {
    guard let components, let year = components.year, let month = components.month, let day = components.day else { return nil }
    self.init(year: year, month: month, day: day)
  }

  /// An ISO 8601 calendar date (`"2026-09-17"`); anything else is `nil`.
  init?(iso text: String) {
    let parts = text.split(separator: "-", omittingEmptySubsequences: false)
    guard parts.count == 3, parts[0].count == 4, parts[1].count == 2, parts[2].count == 2,
      parts.allSatisfy({ $0.allSatisfy { $0.isASCII && $0.isNumber } }),
      let year = Int(parts[0]), let month = Int(parts[1]), let day = Int(parts[2])
    else { return nil }
    self.init(year: year, month: month, day: day)
  }

  /// The date's `DateComponents`: year, month and day only, so that no time zone enters.
  var components: DateComponents { DateComponents(year: year, month: month, day: day) }

  var monthOf: TanreiCalendarMonth { TanreiCalendarMonth(year: year, month: month) }

  var description: String {
    let pad = { (value: Int, width: Int) in String(repeating: "0", count: max(0, width - String(value).count)) + String(value) }
    return "\(pad(year, 4))-\(pad(month, 2))-\(pad(day, 2))"
  }

  static func < (a: TanreiCalendarDate, b: TanreiCalendarDate) -> Bool {
    (a.year, a.month, a.day) < (b.year, b.month, b.day)
  }

  /// Days since 0001-01-01.
  var ordinal: Int {
    let y = year - 1
    var days = y * 365 + y / 4 - y / 100 + y / 400
    for m in 1..<month { days += TanreiCalendarMonth.days(year: year, month: m) }
    return days + day - 1
  }

  /// The date `count` days after 0001-01-01 (clamped to the years a date may have).
  init(ordinal count: Int) {
    var year = min(9999, max(1, Int(Double(count) / 365.2425) + 1))
    while year > 1 && TanreiCalendarDate(year: year, month: 1, day: 1)!.ordinal > count { year -= 1 }
    while year < 9999 && TanreiCalendarDate(year: year + 1, month: 1, day: 1)!.ordinal <= count { year += 1 }
    var rest = max(0, count - TanreiCalendarDate(year: year, month: 1, day: 1)!.ordinal)
    var month = 1
    while month < 12 && rest >= TanreiCalendarMonth.days(year: year, month: month) {
      rest -= TanreiCalendarMonth.days(year: year, month: month)
      month += 1
    }
    self.year = year
    self.month = month
    self.day = min(rest + 1, TanreiCalendarMonth.days(year: year, month: month))
  }

  func adding(days: Int) -> TanreiCalendarDate { TanreiCalendarDate(ordinal: ordinal + days) }

  /// The same day number `months` later — the last day of that month when it is shorter (DTP-18, DTP-20).
  func adding(months: Int) -> TanreiCalendarDate {
    monthOf.adding(months).clampedDay(day)
  }

  /// Foundation's weekday: 1 = Sunday … 7 = Saturday (0001-01-01 was a Monday).
  var weekday: Int { (ordinal + 1) % 7 + 1 }
}

/// A displayed month.
struct TanreiCalendarMonth: Hashable, Comparable, Sendable {
  let year: Int
  let month: Int

  static func < (a: TanreiCalendarMonth, b: TanreiCalendarMonth) -> Bool { (a.year, a.month) < (b.year, b.month) }

  static func days(year: Int, month: Int) -> Int {
    switch month {
    case 2: return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0 ? 29 : 28
    case 4, 6, 9, 11: return 30
    default: return 31
    }
  }

  var days: Int { Self.days(year: year, month: month) }

  var first: TanreiCalendarDate { TanreiCalendarDate(year: year, month: month, day: 1)! }

  func adding(_ months: Int) -> TanreiCalendarMonth {
    let index = min(9999 * 12 + 11, max(12, year * 12 + (month - 1) + months))
    return TanreiCalendarMonth(year: index / 12, month: index % 12 + 1)
  }

  /// Day `day` of this month, or its last day when it is shorter.
  func clampedDay(_ day: Int) -> TanreiCalendarDate {
    TanreiCalendarDate(year: year, month: month, day: min(max(1, day), days))!
  }

  func contains(_ date: TanreiCalendarDate?) -> Bool {
    guard let date else { return false }
    return date.year == year && date.month == month
  }

  /// DTP-11 — the 42 cells of the month: six rows of seven from `firstWeekday`; the first day in its weekday's column, `nil`
  /// before it and after the last day. Always six rows, so that the grid keeps its height.
  func cells(firstWeekday: Int) -> [TanreiCalendarDate?] {
    let lead = (first.weekday - firstWeekday + 7) % 7
    return (0..<TanreiDatePickerRules.cellCount).map { index in
      let day = index - lead + 1
      return day >= 1 && day <= days ? TanreiCalendarDate(year: year, month: month, day: day) : nil
    }
  }
}

// MARK: - The locale (DTP-37)

/// What the picker reads from its locale: the first day of the week, month and weekday names, digits and date forms. All of
/// it comes from Foundation for the locale; a date is formatted as the UTC midnight of its day, in UTC and the Gregorian
/// calendar, so that no time zone can move it.
final class TanreiDatePickerLocale {
  /// One per locale and first day, kept for the process: formatters are costly to make.
  @MainActor
  static func shared(_ locale: Locale, firstDayOfWeek: TanreiDatePickerFirstDayOfWeek) -> TanreiDatePickerLocale {
    let key = "\(locale.identifier)|\(firstDayOfWeek.rawValue)"
    if let known = TanreiDatePickerLocaleCache.locales[key] { return known }
    let made = TanreiDatePickerLocale(locale, firstDayOfWeek: firstDayOfWeek)
    TanreiDatePickerLocaleCache.locales[key] = made
    return made
  }

  let locale: Locale
  /// The weekday of the first column (1 = Sunday … 7 = Saturday).
  let firstWeekday: Int
  private let calendar: Calendar
  private var formatters: [String: DateFormatter] = [:]
  private(set) lazy var digits: [String] = {
    let formatter = NumberFormatter()
    formatter.locale = locale
    formatter.numberStyle = .none
    formatter.usesGroupingSeparator = false
    return (0...9).map { formatter.string(from: NSNumber(value: $0)) ?? String($0) }
  }()

  init(_ locale: Locale, firstDayOfWeek: TanreiDatePickerFirstDayOfWeek) {
    self.locale = locale
    var calendar = Calendar(identifier: .gregorian)
    calendar.locale = locale
    calendar.timeZone = Self.utc
    self.calendar = calendar
    firstWeekday = firstDayOfWeek.weekday ?? calendar.firstWeekday
  }

  /// UTC: the time zone a calendar date is formatted in (not a design value).
  private static let utc = TimeZone(secondsFromGMT: 0) ?? .gmt

  private func formatter(_ template: String) -> DateFormatter {
    if let known = formatters[template] { return known }
    let formatter = DateFormatter()
    formatter.locale = locale
    formatter.calendar = calendar
    formatter.timeZone = Self.utc
    formatter.setLocalizedDateFormatFromTemplate(template)
    formatters[template] = formatter
    return formatter
  }

  private func instant(_ date: TanreiCalendarDate) -> Date {
    calendar.date(from: date.components) ?? Date(timeIntervalSinceReferenceDate: .zero)
  }

  /// An integer in the locale's digits, at least `minimumDigits` long ("09" for 9 at two digits), never grouped.
  func number(_ value: Int, minimumDigits: Int = 1) -> String {
    let plain = String(abs(value))
    let padded = String(repeating: "0", count: max(0, minimumDigits - plain.count)) + plain
    return padded.map { character in character.wholeNumberValue.map { digits[$0] } ?? String(character) }.joined()
  }

  /// DTP-13: the weekdays' narrow names ("S", "M"; "日", "月"), Sunday first.
  var narrowWeekdays: [String] { formatter("EEEEE").veryShortStandaloneWeekdaySymbols }
  /// DTP-13: the weekdays' full names ("Sunday"), Sunday first — the column headers' names.
  var fullWeekdays: [String] { formatter("EEEE").standaloneWeekdaySymbols }

  /// DTP-15: the month and year in the locale's form ("September 2026", "2026年9月").
  func monthYear(_ month: TanreiCalendarMonth) -> String { formatter("yMMMM").string(from: instant(month.first)) }

  /// DTP-36: the full date ("Thursday, September 17, 2026").
  func fullDate(_ date: TanreiCalendarDate) -> String { formatter("yMMMMEEEEd").string(from: instant(date)) }

  /// DTP-23: a date in the header — the abbreviated weekday, month and day ("Thu, Sep 17"), with the year when it is not
  /// `currentYear`.
  func headerDate(_ date: TanreiCalendarDate, currentYear: Int) -> String {
    formatter(date.year == currentYear ? "MMMEd" : "yMMMEd").string(from: instant(date))
  }

  /// DTP-23: an end of a range in the header — the abbreviated month and day ("Sep 10"), with the year when it is not
  /// `currentYear`.
  func headerRangeDate(_ date: TanreiCalendarDate, currentYear: Int) -> String {
    formatter(date.year == currentYear ? "MMMd" : "yMMMd").string(from: instant(date))
  }

  /// One piece of the locale's numeric date form.
  enum NumericPart: Equatable {
    case year, month, day
    case literal(String)
  }

  /// DTP-25: the locale's numeric date — its year, month and day fields in its order and the literals between them — read
  /// from the pattern Foundation makes for the template `yyyyMMdd` ("MM/dd/yyyy" in en-US, "yyyy/MM/dd" in ja-JP,
  /// "dd.MM.yyyy" in de-DE). A pattern without each field once is the English form.
  private(set) lazy var numericParts: [NumericPart] = Self.numericParts(of: formatter("yyyyMMdd").dateFormat ?? "")

  static func numericParts(of pattern: String) -> [NumericPart] {
    var parts: [NumericPart] = []
    var literal = ""
    var quoted = false
    var characters = Array(pattern)[...]
    func flush() {
      if !literal.isEmpty { parts.append(.literal(literal)) }
      literal = ""
    }
    while let character = characters.popFirst() {
      if character == "'" {
        if characters.first == "'" {
          characters.removeFirst()
          literal.append("'")
        } else {
          quoted.toggle()
        }
        continue
      }
      if quoted || !character.isLetter {
        literal.append(character)
        continue
      }
      while characters.first == character { characters.removeFirst() }
      switch character {
      case "y", "Y", "u", "U", "r":
        flush()
        parts.append(.year)
      case "M", "L":
        flush()
        parts.append(.month)
      case "d":
        flush()
        parts.append(.day)
      default:
        literal.append(character)
      }
    }
    flush()
    let fields = parts.filter { if case .literal = $0 { return false } else { return true } }
    guard fields.count == 3, Set(fields.map { "\($0)" }).count == 3 else {
      return [.month, .literal("/"), .day, .literal("/"), .year]
    }
    return parts
  }

  /// DTP-25: a field's placeholder — the numeric pattern with yyyy, mm and dd in the locale's order ("mm/dd/yyyy").
  var numericPattern: String {
    numericParts.map { part in
      switch part {
      case .year: return "yyyy"
      case .month: return "mm"
      case .day: return "dd"
      case .literal(let text): return text
      }
    }.joined()
  }

  /// DTP-26: a date in the locale's numeric form, a two-digit day and month and a four-digit year ("09/17/2026").
  func numericText(_ date: TanreiCalendarDate) -> String {
    numericParts.map { part in
      switch part {
      case .year: return number(date.year, minimumDigits: 4)
      case .month: return number(date.month, minimumDigits: 2)
      case .day: return number(date.day, minimumDigits: 2)
      case .literal(let text): return text
      }
    }.joined()
  }

  /// DTP-26: a field's text as a date — exactly three groups of digits (ASCII or the locale's) separated by other characters,
  /// in the order of the locale's numeric form, with a four-digit year and a month and day that exist in that year; leading
  /// zeros optional. Anything else is `nil`.
  func parse(_ text: String) -> TanreiCalendarDate? {
    var groups: [String] = []
    var current = ""
    for character in text {
      let digit: Int? = character.isASCII ? character.wholeNumberValue : digits.firstIndex(of: String(character))
      if let digit {
        current.append(String(digit))
      } else if !current.isEmpty {
        groups.append(current)
        current = ""
      }
    }
    if !current.isEmpty { groups.append(current) }
    guard groups.count == 3 else { return nil }
    let order = numericParts.filter { if case .literal = $0 { return false } else { return true } }
    var year = "", month = "", day = ""
    for (part, group) in zip(order, groups) {
      switch part {
      case .year: year = group
      case .month: month = group
      case .day: day = group
      case .literal: break
      }
    }
    guard year.count == 4, (1...2).contains(month.count), (1...2).contains(day.count), let y = Int(year), let m = Int(month), let d = Int(day)
    else { return nil }
    return TanreiCalendarDate(year: y, month: m, day: d)
  }

  /// DTP-37: the device's current date in its own time zone, as a calendar date.
  static func deviceToday() -> TanreiCalendarDate {
    let parts = Calendar(identifier: .gregorian).dateComponents(in: .current, from: Date())
    return TanreiCalendarDate(components: parts) ?? TanreiCalendarDate(year: 2000, month: 1, day: 1)!
  }
}

/// The locales read so far, on the main actor.
@MainActor
enum TanreiDatePickerLocaleCache {
  static var locales: [String: TanreiDatePickerLocale] = [:]
}

// MARK: - Configuration (DTP-29, DTP-40)

/// What a product passes, before it is read.
struct TanreiDatePickerOptions {
  var presentation: TanreiDatePickerPresentation
  var mode: TanreiDatePickerMode
  var minDate: DateComponents?
  var maxDate: DateComponents?
  var disabledDates: Set<DateComponents>
  var isDateDisabled: ((DateComponents) -> Bool)?
  var today: DateComponents?
  var firstDayOfWeek: TanreiDatePickerFirstDayOfWeek
  var locale: Locale?
  var entryMode: TanreiDatePickerEntryMode
  var startView: TanreiDatePickerStartView
  var labels: TanreiDatePickerLabels
}

/// The choice as a binding holds it: a value (single mode) or a start and an end (range mode), unread.
struct TanreiDatePickerInput {
  var value: DateComponents?
  var start: DateComponents?
  var end: DateComponents?
}

/// A choice: the date of single mode, or the start and end of range mode.
struct TanreiDatePickerSelection: Equatable, Sendable {
  var date: TanreiCalendarDate?
  var start: TanreiCalendarDate?
  var end: TanreiCalendarDate?

  static let none = TanreiDatePickerSelection()

  /// DTP-6: complete — a date in single mode, a start and an end in range mode.
  func isComplete(_ mode: TanreiDatePickerMode) -> Bool {
    mode == .single ? date != nil : start != nil && end != nil
  }
}

/// Which days can be chosen (DTP-29): not before min, not after max, not listed, not named by the predicate.
struct TanreiDatePickerBounds {
  var min: TanreiCalendarDate?
  var max: TanreiCalendarDate?
  var disabled: Set<TanreiCalendarDate> = []
  var predicate: ((DateComponents) -> Bool)? = nil

  static var open: TanreiDatePickerBounds { TanreiDatePickerBounds() }

  /// DTP-29, DTP-30: unavailable — before min, after max, in `disabledDates` or named by `isDateDisabled`.
  func isUnavailable(_ date: TanreiCalendarDate) -> Bool {
    if let min, date < min { return true }
    if let max, date > max { return true }
    if disabled.contains(date) { return true }
    return predicate?(date.components) ?? false
  }

  /// DTP-18: never before min or after max.
  func clamp(_ date: TanreiCalendarDate) -> TanreiCalendarDate {
    if let min, date < min { return min }
    if let max, date > max { return max }
    return date
  }

  /// DTP-29: between min's month and max's month.
  func clamp(_ month: TanreiCalendarMonth) -> TanreiCalendarMonth {
    if let min, month < min.monthOf { return min.monthOf }
    if let max, month > max.monthOf { return max.monthOf }
    return month
  }

  /// DTP-16: min's year to max's year — 1900 and 2100 where either is empty.
  var years: ClosedRange<Int> {
    let lower = min?.year ?? TanreiDatePickerRules.firstYear
    let upper = Swift.max(lower, max?.year ?? TanreiDatePickerRules.lastYear)
    return lower...upper
  }
}

/// The picker's props, read: the dates checked (DTP-40), the bounds, the words, and what was reported.
struct TanreiDatePickerConfiguration {
  var presentation: TanreiDatePickerPresentation
  var mode: TanreiDatePickerMode
  var bounds: TanreiDatePickerBounds
  var today: TanreiCalendarDate?
  var firstDayOfWeek: TanreiDatePickerFirstDayOfWeek
  var locale: Locale?
  var entryMode: TanreiDatePickerEntryMode
  var startView: TanreiDatePickerStartView
  var labels: TanreiDatePickerLabels
  /// The choice the picker opens with, read from the binding (DTP-40: what is not a date is left out).
  var selection: TanreiDatePickerSelection
  /// DTP-28, DTP-40: what is reported in debug builds.
  var problems: [String]

  init(_ options: TanreiDatePickerOptions, input: TanreiDatePickerInput) {
    var problems: [String] = []
    func read(_ components: DateComponents?, _ name: String) -> TanreiCalendarDate? {
      guard let components else { return nil }
      guard let date = TanreiCalendarDate(components: components) else {
        problems.append("\(name) \(components) is not a calendar date with a year, a month and a day; it is ignored (DTP-40)")
        return nil
      }
      return date
    }
    var min = read(options.minDate, "minDate")
    var max = read(options.maxDate, "maxDate")
    if let low = min, let high = max, low > high {
      problems.append("minDate \(low) is after maxDate \(high); both are ignored (DTP-40)")
      min = nil
      max = nil
    }
    let disabled = Set(options.disabledDates.compactMap { read($0, "an entry of disabledDates") })
    let today = read(options.today, "today")
    var selection = TanreiDatePickerSelection.none
    switch options.mode {
    case .single:
      selection.date = read(input.value, "the selection")
      if input.start != nil || input.end != nil { problems.append("start or end is set in single mode; it is ignored (DTP-40)") }
    case .range:
      if input.value != nil { problems.append("a value is set in range mode; it is ignored (DTP-40)") }
      selection.start = read(input.start, "the range's start")
      let end = read(input.end, "the range's end")
      if let end, let start = selection.start, end < start {
        problems.append("the range's end \(end) is before its start \(start); the end is ignored (DTP-40)")
      } else if let end, selection.start == nil {
        problems.append("the range's end \(end) has no start; it is ignored (DTP-40)")
      } else {
        selection.end = end
      }
    }
    if options.labels.label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      problems.append("label is empty, so the picker has no accessible name; give it one in the product's language (DTP-40)")
    }
    if options.presentation == .docked && options.entryMode == .text {
      problems.append("entryMode \"text\" is set on a docked picker, which has the calendar only (DTP-28)")
    }
    presentation = options.presentation
    mode = options.mode
    bounds = TanreiDatePickerBounds(min: min, max: max, disabled: disabled, predicate: options.isDateDisabled)
    self.today = today
    firstDayOfWeek = options.firstDayOfWeek
    locale = options.locale
    entryMode = options.presentation == .docked ? .calendar : options.entryMode
    startView = options.startView
    labels = options.labels
    self.selection = selection
    self.problems = problems
  }

  func report() {
    problems.forEach { TanreiDiagnostics.report("Tanrei: a date picker's \($0)") }
  }
}

// MARK: - Rules

/// The picker's rules, pure: they are tested without a view.
enum TanreiDatePickerRules {
  /// DTP-11: six rows of seven — a fact of the spec, not a design value.
  static let columns = 7
  static let rows = 6
  static let cellCount = columns * rows
  /// DTP-16: rows of three years.
  static let yearColumns = 3
  /// DTP-16: the displayed year's row is the third row in view.
  static let yearRowInView = 2
  /// DTP-16: the years without min or max.
  static let firstYear = 1900
  static let lastYear = 2100
  /// DTP-23: what joins a range's start and end.
  static let rangeDash = " \u{2013} "

  /// DTP-10: the one condition a day is drawn from, by precedence — selected, in-range, today, unselected.
  static func condition(of date: TanreiCalendarDate, pending: TanreiDatePickerSelection, today: TanreiCalendarDate) -> TanreiDatePickerCondition {
    if date == pending.date || date == pending.start || date == pending.end { return .selected }
    if let start = pending.start, let end = pending.end, date > start, date < end { return .inRange }
    if date == today { return .today }
    return .unselected
  }

  /// DTP-10: a year — selected for the displayed year, today for the current year when it is not displayed.
  static func condition(ofYear year: Int, displayed: Int, today: TanreiCalendarDate) -> TanreiDatePickerCondition {
    if year == displayed { return .selected }
    if year == today.year { return .today }
    return .unselected
  }

  /// DTP-12: the part of a range's end cell that runs into the band — the half toward the other end, while they differ.
  enum HalfBand: Equatable, Sendable {
    /// Toward the later dates: the trailing half (the leading half right to left, which SwiftUI mirrors).
    case trailing
    case leading
  }

  static func halfBand(of date: TanreiCalendarDate, pending: TanreiDatePickerSelection) -> HalfBand? {
    guard let start = pending.start, let end = pending.end, start != end else { return nil }
    if date == start { return .trailing }
    if date == end { return .leading }
    return nil
  }

  /// DTP-36: exposed as selected — the chosen date, and every day of a range.
  static func isSelected(_ date: TanreiCalendarDate, pending: TanreiDatePickerSelection) -> Bool {
    if date == pending.date || date == pending.start || date == pending.end { return true }
    if let start = pending.start, let end = pending.end { return date >= start && date <= end }
    return false
  }

  /// DTP-29: the month the picker opens on — of the chosen date or start, otherwise of today, between min's and max's.
  static func homeMonth(pending: TanreiDatePickerSelection, today: TanreiCalendarDate, bounds: TanreiDatePickerBounds) -> TanreiCalendarMonth {
    bounds.clamp((pending.date ?? pending.start ?? today).monthOf)
  }

  /// DTP-17: the active day of `month` — the chosen date or start in it, otherwise today in it, otherwise its first available
  /// day, otherwise its first day.
  static func activeDay(in month: TanreiCalendarMonth, pending: TanreiDatePickerSelection, today: TanreiCalendarDate, bounds: TanreiDatePickerBounds) -> TanreiCalendarDate {
    if let chosen = pending.date ?? pending.start, month.contains(chosen) { return chosen }
    if month.contains(today) { return today }
    let days = (1...month.days).map { month.clampedDay($0) }
    return days.first { !bounds.isUnavailable($0) } ?? month.first
  }

  /// DTP-18: where a key moves the active day (clamped to min and max), or `nil` when it is not one of the grid's keys.
  static func move(
    _ active: TanreiCalendarDate, key: KeyEquivalent, shift: Bool, rightToLeft: Bool, firstWeekday: Int, bounds: TanreiDatePickerBounds
  ) -> TanreiCalendarDate? {
    let forward = rightToLeft ? -1 : 1
    let column = (active.weekday - firstWeekday + 7) % 7
    let target: TanreiCalendarDate
    switch key {
    case .rightArrow: target = active.adding(days: forward)
    case .leftArrow: target = active.adding(days: -forward)
    case .downArrow: target = active.adding(days: columns)
    case .upArrow: target = active.adding(days: -columns)
    case .home: target = active.adding(days: -column)
    case .end: target = active.adding(days: columns - 1 - column)
    case .pageDown: target = shift ? active.adding(months: 12) : active.adding(months: 1)
    case .pageUp: target = shift ? active.adding(months: -12) : active.adding(months: -1)
    default: return nil
    }
    return bounds.clamp(target)
  }

  /// DTP-19: where a key moves the focused year, or `nil` when it is not one of the list's keys.
  static func moveYear(_ year: Int, key: KeyEquivalent, rightToLeft: Bool, years: ClosedRange<Int>) -> Int? {
    let forward = rightToLeft ? -1 : 1
    let target: Int
    switch key {
    case .rightArrow: target = year + forward
    case .leftArrow: target = year - forward
    case .downArrow: target = year + yearColumns
    case .upArrow: target = year - yearColumns
    case .home: target = years.lowerBound
    case .end: target = years.upperBound
    default: return nil
    }
    return min(max(target, years.lowerBound), years.upperBound)
  }

  /// DTP-8, DTP-9: the choice after a day is chosen; `nil` when the day cannot be chosen (unavailable, DTP-30).
  static func choose(_ date: TanreiCalendarDate, pending: TanreiDatePickerSelection, mode: TanreiDatePickerMode, bounds: TanreiDatePickerBounds) -> TanreiDatePickerSelection? {
    guard !bounds.isUnavailable(date) else { return nil }
    switch mode {
    case .single:
      return TanreiDatePickerSelection(date: date)
    case .range:
      guard let start = pending.start, pending.end == nil, date >= start else {
        return TanreiDatePickerSelection(start: date)
      }
      return TanreiDatePickerSelection(start: start, end: date)
    }
  }

  /// DTP-16: the month a chosen year shows — the displayed month's number in that year, between min's and max's months.
  static func month(choosing year: Int, from month: TanreiCalendarMonth, bounds: TanreiDatePickerBounds) -> TanreiCalendarMonth {
    bounds.clamp(TanreiCalendarMonth(year: year, month: month.month))
  }

  /// DTP-16: the first row of years in view — the displayed year's row third, or as near to it as the list's ends allow.
  static func firstYearRow(displayed: Int, years: ClosedRange<Int>, rowsInView: Int) -> Int {
    let rows = (years.count + yearColumns - 1) / yearColumns
    let row = (displayed - years.lowerBound) / yearColumns
    return max(0, min(row - yearRowInView, rows - rowsInView))
  }

  /// DTP-14: whether the previous or next month can be shown.
  static func canPage(_ month: TanreiCalendarMonth, by months: Int, bounds: TanreiDatePickerBounds) -> Bool {
    let target = month.adding(months)
    if let min = bounds.min, target < min.monthOf { return false }
    if let max = bounds.max, target > max.monthOf { return false }
    return true
  }

  /// DTP-20: the active day after paging — the same day number in the new month (its last day when shorter), within the
  /// bounds.
  static func activeDay(paging active: TanreiCalendarDate, to month: TanreiCalendarMonth, bounds: TanreiDatePickerBounds) -> TanreiCalendarDate {
    bounds.clamp(month.clampedDay(active.day))
  }

  /// DTP-26: what a field's text reads as — an available date (not before the start, for the end field), or the error it
  /// would show when committed.
  enum Reading: Equatable {
    case date(TanreiCalendarDate)
    case invalid
    case unavailable
  }

  static func read(_ parsed: TanreiCalendarDate?, isEnd: Bool, start: TanreiCalendarDate?, bounds: TanreiDatePickerBounds) -> Reading {
    guard let parsed else { return .invalid }
    if isEnd, let start, parsed < start { return .invalid }
    if bounds.isUnavailable(parsed) { return .unavailable }
    return .date(parsed)
  }

  /// DTP-23: the header's value — the parts of the pending choice, each a date's text or the label of what is not chosen yet.
  struct HeaderPart: Equatable {
    let text: String
    let isPlaceholder: Bool
  }

  static func header(pending: TanreiDatePickerSelection, mode: TanreiDatePickerMode, today: TanreiCalendarDate, labels: TanreiDatePickerLabels, locale: TanreiDatePickerLocale) -> [HeaderPart] {
    switch mode {
    case .single:
      guard let date = pending.date else { return [HeaderPart(text: labels.dateLabel, isPlaceholder: true)] }
      return [HeaderPart(text: locale.headerDate(date, currentYear: today.year), isPlaceholder: false)]
    case .range:
      let part = { (date: TanreiCalendarDate?, label: String) in
        date.map { HeaderPart(text: locale.headerRangeDate($0, currentYear: today.year), isPlaceholder: false) }
          ?? HeaderPart(text: label, isPlaceholder: true)
      }
      return [part(pending.start, labels.startLabel), part(pending.end, labels.endLabel)]
    }
  }

  /// DTP-36: a day's accessible name — its full date, with todayLabel after today's.
  static func dayName(_ date: TanreiCalendarDate, today: TanreiCalendarDate, labels: TanreiDatePickerLabels, locale: TanreiDatePickerLocale) -> String {
    let name = locale.fullDate(date)
    return date == today && !labels.todayLabel.isEmpty ? "\(name), \(labels.todayLabel)" : name
  }

  /// DTP-36: a range end's description — startLabel or endLabel (the start's when they are the same day).
  static func dayDescription(_ date: TanreiCalendarDate, pending: TanreiDatePickerSelection, labels: TanreiDatePickerLabels) -> String? {
    if date == pending.start { return labels.startLabel }
    if date == pending.end { return labels.endLabel }
    return nil
  }
}

// MARK: - The model

/// What a picker holds from opening to closing (DTP-6, DTP-29): the pending choice, the displayed month and view, the entry,
/// the active day and year, and the fields' texts and errors.
struct TanreiDatePickerModel: Equatable {
  enum Pane: Equatable, Sendable {
    case days
    case years
  }

  /// DTP-7, DTP-8, DTP-9: what choosing a day did.
  enum Choice: Equatable {
    /// Unavailable: nothing (DTP-30).
    case ignored
    /// A range's start: the choice is not complete.
    case started
    /// A date, or a range's end: the choice is complete.
    case completed
  }

  let mode: TanreiDatePickerMode
  /// The choice the picker opened with (DTP-6: change only when the committed one differs).
  let opened: TanreiDatePickerSelection
  let today: TanreiCalendarDate
  var pending: TanreiDatePickerSelection
  var month: TanreiCalendarMonth
  var pane: Pane
  var entry: TanreiDatePickerEntryMode
  var active: TanreiCalendarDate
  var activeYear: Int
  /// DTP-26: the fields' texts (one in single mode, two in range mode) and their errors ("" for none).
  var texts: [String]
  var errors: [String]

  init(configuration: TanreiDatePickerConfiguration, today: TanreiCalendarDate, numeric: (TanreiCalendarDate) -> String) {
    mode = configuration.mode
    opened = configuration.selection
    pending = configuration.selection
    self.today = today
    month = TanreiDatePickerRules.homeMonth(pending: pending, today: today, bounds: configuration.bounds)
    pane = configuration.startView == .year ? .years : .days
    entry = configuration.entryMode
    active = TanreiDatePickerRules.activeDay(in: month, pending: pending, today: today, bounds: configuration.bounds)
    activeYear = month.year
    texts = []
    errors = []
    fillFields(numeric)
  }

  var fieldCount: Int { mode == .single ? 1 : 2 }

  /// DTP-26: the fields hold the pending dates in the locale's numeric form.
  mutating func fillFields(_ numeric: (TanreiCalendarDate) -> String) {
    let dates = mode == .single ? [pending.date] : [pending.start, pending.end]
    texts = dates.map { $0.map(numeric) ?? "" }
    errors = dates.map { _ in "" }
  }

  /// DTP-8, DTP-9: a day chosen by pointer, touch, Enter or Space.
  mutating func choose(_ date: TanreiCalendarDate, bounds: TanreiDatePickerBounds) -> Choice {
    guard let chosen = TanreiDatePickerRules.choose(date, pending: pending, mode: mode, bounds: bounds) else { return .ignored }
    pending = chosen
    active = date
    return chosen.isComplete(mode) ? .completed : .started
  }

  /// DTP-18: a key of the grid; whether it moved the active day (and the month shown).
  mutating func move(key: KeyEquivalent, shift: Bool, rightToLeft: Bool, firstWeekday: Int, bounds: TanreiDatePickerBounds) -> Bool {
    guard let target = TanreiDatePickerRules.move(active, key: key, shift: shift, rightToLeft: rightToLeft, firstWeekday: firstWeekday, bounds: bounds)
    else { return false }
    active = target
    if !month.contains(target) { month = target.monthOf }
    return true
  }

  /// DTP-20: the previous or next month, the active day keeping its number.
  mutating func page(by months: Int, bounds: TanreiDatePickerBounds) -> Bool {
    guard TanreiDatePickerRules.canPage(month, by: months, bounds: bounds) else { return false }
    month = month.adding(months)
    active = TanreiDatePickerRules.activeDay(paging: active, to: month, bounds: bounds)
    return true
  }

  /// DTP-15: the view toggle — the year view focusing the displayed year, or the day view unchanged.
  mutating func togglePane() {
    switch pane {
    case .days:
      pane = .years
      activeYear = month.year
    case .years:
      pane = .days
    }
  }

  /// DTP-16: a chosen year — the day view of the displayed month in that year (clamped), its active day; the choice stays.
  mutating func chooseYear(_ year: Int, bounds: TanreiDatePickerBounds) {
    month = TanreiDatePickerRules.month(choosing: year, from: month, bounds: bounds)
    pane = .days
    active = TanreiDatePickerRules.activeDay(in: month, pending: pending, today: today, bounds: bounds)
  }

  /// DTP-19: a key of the year list; whether it moved the focused year.
  mutating func moveYear(key: KeyEquivalent, rightToLeft: Bool, years: ClosedRange<Int>) -> Bool {
    guard let target = TanreiDatePickerRules.moveYear(activeYear, key: key, rightToLeft: rightToLeft, years: years) else { return false }
    activeYear = target
    return true
  }

  /// DTP-28: the entry-mode toggle — text entry filled with the pending dates, or the calendar on the month of the pending
  /// date or start (otherwise today's).
  mutating func toggleEntry(bounds: TanreiDatePickerBounds, numeric: (TanreiCalendarDate) -> String) {
    switch entry {
    case .calendar:
      entry = .text
      fillFields(numeric)
    case .text:
      entry = .calendar
      pane = .days
      month = TanreiDatePickerRules.homeMonth(pending: pending, today: today, bounds: bounds)
      active = TanreiDatePickerRules.activeDay(in: month, pending: pending, today: today, bounds: bounds)
    }
  }

  private func reading(_ index: Int, parse: (String) -> TanreiCalendarDate?, bounds: TanreiDatePickerBounds) -> TanreiDatePickerRules.Reading {
    TanreiDatePickerRules.read(parse(texts[index]), isEnd: mode == .range && index == 1, start: pending.start, bounds: bounds)
  }

  private mutating func setField(_ index: Int, _ date: TanreiCalendarDate?) {
    switch mode {
    case .single: pending = TanreiDatePickerSelection(date: date)
    case .range:
      if index == 0 { pending.start = date } else { pending.end = date }
    }
  }

  /// DTP-26: an edit — never reformatted; text that reads as an available date is the field's pending date, an emptied field
  /// clears it, and any edit clears the field's error.
  mutating func edit(_ index: Int, text: String, parse: (String) -> TanreiCalendarDate?, bounds: TanreiDatePickerBounds) {
    guard texts.indices.contains(index) else { return }
    texts[index] = text
    errors[index] = ""
    if text.isEmpty {
      setField(index, nil)
    } else if case .date(let date) = reading(index, parse: parse, bounds: bounds) {
      setField(index, date)
    }
  }

  /// DTP-26: a commit — a field whose text is not empty and not an available date is in error, its pending date cleared.
  mutating func commit(_ index: Int, parse: (String) -> TanreiCalendarDate?, labels: TanreiDatePickerLabels, bounds: TanreiDatePickerBounds) {
    guard texts.indices.contains(index), !texts[index].isEmpty else { return }
    switch reading(index, parse: parse, bounds: bounds) {
    case .date: return
    case .invalid: errors[index] = labels.invalidText
    case .unavailable: errors[index] = labels.unavailableText
    }
    setField(index, nil)
  }

  /// DTP-6: OK is enabled while the pending choice is complete and no field holds text that is not an available date.
  func canConfirm(parse: (String) -> TanreiCalendarDate?, bounds: TanreiDatePickerBounds) -> Bool {
    guard pending.isComplete(mode) else { return false }
    guard entry == .text else { return true }
    return texts.indices.allSatisfy { index in
      if texts[index].isEmpty { return true }
      if case .date = reading(index, parse: parse, bounds: bounds) { return true }
      return false
    }
  }

  /// DTP-6, DTP-7: whether committing the pending choice changes it.
  var differs: Bool { pending != opened }
}

// MARK: - Appearance

/// Which token values draw a day, a year or the view toggle in one condition and state (DTP-10, DTP-30, DTP-31, DTP-34): pure
/// data read from `TanreiDatePickerTokens`, so the bindings are tested without rendering. Every state, disabled included, is
/// drawn from that state's tokens of the condition.
struct TanreiDatePickerCellAppearance: Equatable {
  let container: TanreiPaint
  let label: TanreiPaint
  let outline: TanreiPaint
  /// Opacity of the whole control.
  let opacity: Double
  /// DTP-34 `ripple`: the pressed container paint, grown from the point of contact over `container`.
  let ripple: TanreiPaint?

  /// - Parameters:
  ///   - feedback: `sys.behavior.pressed-feedback` (DTP-34); it matters only while `state` is `.pressed`.
  ///   - beneath: the state without the press: what is drawn where the choice says the press draws nothing.
  init(
    tokens: TanreiDatePickerTokens, condition: TanreiDatePickerCondition, state: TanreiInteraction, feedback: TanreiPressedFeedback = .overlay,
    beneath: TanreiInteraction = .enabled
  ) {
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    // DTP-40: the lookup is total — a condition the system does not have reads unselected's, reported.
    let own = tokens.conditions[condition]
    let drawn = own[state: layers.state]
    container = own[state: layers.container].containerColor
    ripple = layers.ripple.map { own[state: $0].containerColor }
    label = drawn.labelColor
    outline = drawn.outlineColor
    // The vocabulary has no rest-state opacity: a control at rest is not dimmed.
    opacity = tokens[state: layers.state]?.opacity ?? TanreiIdentity.opacity
  }
}

extension TanreiDatePickerTokens {
  /// DTP-31: state changes over `motion.state-*`; at once under Reduce Motion.
  func stateMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionStateDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// DTP-34: the ripple grows over `motion.feedback-duration` with the state easing; whole under Reduce Motion.
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// DTP-21: paging and the cross-fade of the views over `motion.page-*`; at once under Reduce Motion.
  func pageMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionPageDuration, easing: motionPageEasing, reduceMotion: reduceMotion)
  }

  /// DTP-22: in and out, per presentation. A modal picker still fades under Reduce Motion (only its growth is left out); a
  /// docked one appears and disappears at once.
  func presentationMotion(_ presentation: TanreiDatePickerPresentation, opening: Bool, reduceMotion: Bool) -> Animation? {
    switch (presentation, opening) {
    case (.modal, true): return TanreiMotion.animation(durationMs: modalMotionOpenDuration, easing: modalMotionOpenEasing, reduceMotion: false)
    case (.modal, false): return TanreiMotion.animation(durationMs: modalMotionCloseDuration, easing: modalMotionCloseEasing, reduceMotion: false)
    case (.docked, true): return TanreiMotion.animation(durationMs: dockedMotionOpenDuration, easing: dockedMotionOpenEasing, reduceMotion: reduceMotion)
    case (.docked, false): return TanreiMotion.animation(durationMs: dockedMotionCloseDuration, easing: dockedMotionCloseEasing, reduceMotion: reduceMotion)
    }
  }

  /// DTP-22: how long closing takes, before the surface is removed.
  func closeDuration(_ presentation: TanreiDatePickerPresentation, reduceMotion: Bool) -> Double {
    switch presentation {
    case .modal: return modalMotionCloseDuration
    case .docked: return reduceMotion ? .zero : dockedMotionCloseDuration
    }
  }

  /// DTP-22: a modal container's scale while it is not shown — `modal.motion.enter-scale`, or 1 (no growth) under Reduce
  /// Motion.
  func hiddenScale(reduceMotion: Bool) -> CGFloat {
    reduceMotion ? TanreiIdentity.scale : CGFloat(modalMotionEnterScale)
  }
}

// MARK: - Geometry (DTP-11, DTP-38)

/// The grid's sizes: the cells (never under the minimum target), the inline padding, and — for a modal picker — the side
/// margin it keeps. DTP-38: where the window is too narrow, the margins give way first, then the padding, and below seven
/// minimum targets the cells narrow equally so that the grid fits, keeping their height and their numbers' size.
struct TanreiDatePickerMetrics: Equatable {
  let cellWidth: CGFloat
  let cellHeight: CGFloat
  let paddingInline: CGFloat
  let margin: CGFloat
  /// The side of a day's container: `day.container.size`, grown to hold its number (DTP-38), never wider than its cell.
  let daySide: CGFloat

  var gridWidth: CGFloat { CGFloat(TanreiDatePickerRules.columns) * cellWidth }
  var surfaceWidth: CGFloat { gridWidth + 2 * paddingInline }

  /// - Parameters:
  ///   - target: the platform's minimum target (`TanreiHitTarget.minimum`).
  ///   - dayLine: the line height of a day's number at the current text size.
  ///   - widest: the width the picker may take (the window's, inside its safe area); `nil` when unbounded.
  ///   - margin: the side margin a modal picker keeps from the window's edges; 0 for a docked one.
  static func resolve(tokens: TanreiDatePickerTokens, target: CGFloat, dayLine: CGFloat, widest: CGFloat?, margin: CGFloat) -> TanreiDatePickerMetrics {
    let cell = max(tokens.cellSize, target)
    let daySide = max(tokens.dayContainerSize, dayLine)
    let columns = CGFloat(TanreiDatePickerRules.columns)
    let height = max(cell, daySide)
    let padding = tokens.containerPaddingInline
    let natural = columns * cell + 2 * padding
    func metrics(cell width: CGFloat, padding: CGFloat, margin: CGFloat) -> TanreiDatePickerMetrics {
      TanreiDatePickerMetrics(cellWidth: width, cellHeight: height, paddingInline: padding, margin: margin, daySide: min(daySide, width))
    }
    guard let widest, widest.isFinite, widest > .zero else { return metrics(cell: cell, padding: padding, margin: margin) }
    if natural + 2 * margin <= widest { return metrics(cell: cell, padding: padding, margin: margin) }
    if natural <= widest { return metrics(cell: cell, padding: padding, margin: (widest - natural) / 2) }
    if columns * cell <= widest { return metrics(cell: cell, padding: (widest - columns * cell) / 2, margin: .zero) }
    return metrics(cell: widest / columns, padding: .zero, margin: .zero)
  }
}

/// DTP-2 — where a docked picker goes: `offset` below its anchor with the start edges aligned, or above it when the room below
/// (within `margin` of the window's edge) is less than the picker needs and the room above is more; shifted along the anchor
/// to stay within the margin (centred when it is wider than the room); its height limited to the room on its side (DTP-38).
/// Everything in window coordinates.
enum TanreiDatePickerDockedPlacement {
  struct Placement: Equatable {
    let frame: CGRect
    let below: Bool
  }

  static func place(anchor: CGRect, window: CGSize, size: CGSize, offset: CGFloat, margin: CGFloat, rightToLeft: Bool) -> Placement {
    let startX = rightToLeft ? anchor.maxX - size.width : anchor.minX
    guard window.width > .zero, window.height > .zero else {
      return Placement(frame: CGRect(x: startX, y: anchor.maxY + offset, width: size.width, height: size.height), below: true)
    }
    let roomBelow = window.height - anchor.maxY - offset - margin
    let roomAbove = anchor.minY - offset - margin
    let below = !(roomBelow < size.height && roomAbove > roomBelow)
    let height = max(.zero, min(size.height, below ? roomBelow : roomAbove))
    let x: CGFloat
    if size.width > window.width - 2 * margin {
      x = (window.width - size.width) / 2
    } else {
      x = min(max(startX, margin), window.width - margin - size.width)
    }
    let y = below ? anchor.maxY + offset : anchor.minY - offset - height
    return Placement(frame: CGRect(x: x, y: y, width: size.width, height: height), below: below)
  }
}

// MARK: - Presentation

/// The anchor's side of a picker (DTP-1, DTP-2, DTP-4, DTP-5, DTP-22): the presentation, the motion's phases, the modal count,
/// the docked placement and the presses outside, and focus back to the anchor.
private struct TanreiDatePickerPresenter: ViewModifier {
  let isPresented: Binding<Bool>
  let options: TanreiDatePickerOptions
  let current: @MainActor () -> TanreiDatePickerInput
  let commit: @MainActor (TanreiDatePickerSelection) -> Void
  let onClose: (@MainActor (TanreiDatePickerCloseReason) -> Void)?

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.layoutDirection) private var layoutDirection
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  /// Whether the surface is presented at all (it stays while it fades out), and whether it is shown (in) or fading out.
  @State private var isCovering = false
  @State private var isShown = false
  /// DTP-22: a docked picker has grown in (it fades out without shrinking).
  @State private var isGrown = false
  /// Read when the picker opens (DTP-29, DTP-37).
  @State private var configuration: TanreiDatePickerConfiguration?
  @State private var today = TanreiDatePickerLocale.deviceToday()
  /// DTP-4: whether the anchor had focus when the picker opened.
  @FocusState private var anchorFocused: Bool
  @State private var returnsFocus = false
  /// DTP-2: the anchor's frame in its window, and the window's size.
  @State private var anchorFrame: CGRect = .zero
  @State private var window: CGSize = .zero
  @State private var surfaceFrame: CGRect = .zero
  @State private var outside = TanreiSearchOutsideWatch()
  @State private var presses = TanreiDatePickerPresses()
  #if os(macOS)
  @State private var clicks = TanreiTooltipEventMonitor()
  #endif

  private var tokens: TanreiDatePickerTokens { theme.system.datePicker }

  func body(content: Content) -> some View {
    switch options.presentation {
    case .modal: modal(content)
    case .docked: docked(content)
    }
  }

  // MARK: Modal

  @ViewBuilder
  private func modal(_ content: Content) -> some View {
    content
      .focused($anchorFocused)
      #if os(iOS)
      .fullScreenCover(isPresented: coverBinding) { modalSurface.presentationBackground(.clear) }
      #else
      // macOS: over the view the modifier is attached to, which is inert meanwhile (DTP-1): nothing in it can be pressed, it is
      // hidden from VoiceOver, and — disabled — nothing in it takes keyboard focus, which keeps focus in the picker.
      .disabled(isCovering)
      .allowsHitTesting(!isCovering)
      .accessibilityHidden(isCovering)
      .overlay { if isCovering { modalSurface } }
      #endif
      .onChange(of: isPresented.wrappedValue, initial: true) { _, open in open ? present() : dismiss() }
      .onDisappear { if isCovering && options.presentation == .modal { TanreiModalCoordinator.shared.closed() } }
  }

  @ViewBuilder
  private var modalSurface: some View {
    if let configuration {
      TanreiDatePickerModalSurface(
        configuration: configuration, today: today, isShown: isShown, isModal: true, onCommit: commit, onClose: close)
    }
  }

  /// The cover's own binding: SwiftUI writes `false` to it only when it dismisses the cover itself.
  private var coverBinding: Binding<Bool> {
    Binding(get: { isCovering }, set: { value in if !value { isCovering = false } })
  }

  // MARK: Docked

  @ViewBuilder
  private func docked(_ content: Content) -> some View {
    content
      .focused($anchorFocused)
      .background {
        // DTP-2: where the anchor is in its window, and how large the window is.
        GeometryReader { proxy in
          Color.clear
            .onAppear { anchorFrame = proxy.frame(in: .global) }
            .onChange(of: proxy.frame(in: .global)) { _, frame in anchorFrame = frame }
        }
        TanreiDatePickerWindowReader { window = $0 }
        #if os(iOS)
        // DTP-5: a touch on the anchor is not outside.
        if isCovering { TanreiTouchObserver { point in outside.touch(inside: point != nil) { close(.outside) } } }
        #endif
      }
      .overlay(alignment: .topLeading) { dockedLayer }
      // Drawn above what follows the anchor in its own container.
      .zIndex(isCovering ? 1 : 0)
      .onChange(of: isPresented.wrappedValue, initial: true) { _, open in open ? present() : dismiss() }
      #if os(macOS)
      .onDisappear { clicks.stop() }
      #endif
  }

  @ViewBuilder
  private var dockedLayer: some View {
    if isCovering, let configuration {
      let metrics = dockedMetrics
      let natural = CGSize(width: metrics.surfaceWidth, height: dockedHeight(metrics))
      let placement = TanreiDatePickerDockedPlacement.place(
        anchor: anchorFrame, window: window, size: natural, offset: tokens.dockedOffset, margin: tokens.dockedViewportMargin,
        rightToLeft: layoutDirection == .rightToLeft)
      // The overlay's own coordinates are the anchor's, whose leading edge is on the right in a right-to-left layout.
      let x = layoutDirection == .rightToLeft ? anchorFrame.maxX - placement.frame.maxX : placement.frame.minX - anchorFrame.minX
      TanreiDatePickerContent(
        configuration: configuration, today: today, metrics: metrics, isInPlace: false,
        availableHeight: placement.frame.height < natural.height ? placement.frame.height : nil, presses: presses, onCommit: commit, onClose: close
      )
      .frame(width: placement.frame.width, height: placement.frame.height, alignment: placement.below ? .top : .bottom)
      // DTP-22: in, it fades and grows from the edge that faces the anchor; out, it fades. It grows by a reveal, not a scale:
      // AppKit cannot invert a transform of zero around the year list's scroll view.
      .modifier(TanreiDatePickerReveal(progress: isGrown ? TanreiDatePickerReveal.shown : .zero, fromTop: placement.below))
      .opacity(isShown ? 1 : .zero)
      .background {
        GeometryReader { proxy in
          Color.clear
            .onAppear { surfaceFrame = proxy.frame(in: .global) }
            .onChange(of: proxy.frame(in: .global)) { _, frame in surfaceFrame = frame }
        }
        #if os(iOS)
        TanreiTouchObserver { point in
          if point != nil { presses.pressedInside() }
          outside.touch(inside: point != nil) { close(.outside) }
        }
        #endif
      }
      .offset(x: x, y: placement.frame.minY - anchorFrame.minY)
      .fixedSize()
    }
  }

  private var dockedMetrics: TanreiDatePickerMetrics {
    TanreiDatePickerMetrics.resolve(
      tokens: tokens, target: TanreiHitTarget.minimum(in: theme.system.measure),
      dayLine: tokens.dayLabelTypescale.resolved(policy: theme.fontFamilyPolicy, dynamicTypeSize: dynamicTypeSize).lineHeight,
      widest: window.width > .zero ? window.width : nil, margin: .zero)
  }

  /// A docked surface's natural height: the paddings, the navigation row, the weekday row and six rows (DTP-11).
  private func dockedHeight(_ metrics: TanreiDatePickerMetrics) -> CGFloat {
    2 * tokens.containerPaddingBlock + CGFloat(TanreiDatePickerRules.rows + 2) * metrics.cellHeight
  }

  // MARK: Opening and closing

  private func present() {
    guard !isCovering else { return }
    let configuration = TanreiDatePickerConfiguration(options, input: current())
    configuration.report()
    self.configuration = configuration
    // DTP-37: while `today` is empty, the device's date when it opens.
    today = configuration.today ?? TanreiDatePickerLocale.deviceToday()
    returnsFocus = anchorFocused
    if options.presentation == .modal { TanreiModalCoordinator.shared.opened() }
    // The system's transition is off: Tanrei's motion is the surface's (DTP-22).
    var transaction = Transaction()
    transaction.disablesAnimations = true
    withTransaction(transaction) { isCovering = true }
    #if os(macOS)
    if options.presentation == .docked {
      // DTP-5: a press outside the picker and its anchor closes it; it still reaches what is under it.
      clicks.start { event in
        guard case .press(let point) = event else { return false }
        if surfaceFrame.contains(point) {
          presses.pressedInside()
        } else if !anchorFrame.contains(point) {
          close(.outside)
        }
        return false
      }
    }
    #endif
    Task(priority: .userInitiated) { @MainActor in
      withAnimation(tokens.presentationMotion(options.presentation, opening: true, reduceMotion: reduceMotion)) {
        isShown = true
        isGrown = true
      }
    }
  }

  private func dismiss() {
    guard isCovering else { return }
    if options.presentation == .modal { TanreiModalCoordinator.shared.closed() }
    #if os(macOS)
    clicks.stop()
    #endif
    // DTP-4: focus returns when it closes, not when the motion ends.
    if returnsFocus { anchorFocused = true }
    withAnimation(tokens.presentationMotion(options.presentation, opening: false, reduceMotion: reduceMotion)) { isShown = false }
    let duration = tokens.closeDuration(options.presentation, reduceMotion: reduceMotion)
    Task(priority: .userInitiated) { @MainActor in
      if duration > .zero { try? await Task.sleep(for: .milliseconds(Int(duration))) }
      guard !isPresented.wrappedValue else { return }
      var transaction = Transaction()
      transaction.disablesAnimations = true
      withTransaction(transaction) {
        isCovering = false
        isGrown = false
      }
      if returnsFocus { anchorFocused = true }
    }
  }

  /// DTP-5: close once, with its reason; the picker closes itself through the binding.
  private func close(_ reason: TanreiDatePickerCloseReason) {
    guard isPresented.wrappedValue else { return }
    onClose?(reason)
    isPresented.wrappedValue = false
  }
}

/// DTP-22: a docked picker growing from the edge that faces its anchor — the part of it shown, from that edge.
struct TanreiDatePickerReveal: ViewModifier, Animatable {
  static let shown: CGFloat = 1

  var progress: CGFloat
  let fromTop: Bool

  nonisolated var animatableData: CGFloat {
    get { progress }
    set { progress = newValue }
  }

  func body(content: Content) -> some View {
    content.mask(alignment: fromTop ? .top : .bottom) {
      GeometryReader { proxy in
        Rectangle()
          .frame(height: proxy.size.height * progress)
          .frame(maxHeight: .infinity, alignment: fromTop ? .top : .bottom)
      }
    }
  }
}

/// Reports the size of the window the view is in (iOS: the window's bounds; macOS: its content view's).
struct TanreiDatePickerWindowReader: View {
  let report: (CGSize) -> Void

  var body: some View {
    TanreiDatePickerWindowProbe(report: report)
      .frame(width: .zero, height: .zero)
      .allowsHitTesting(false)
      .accessibilityHidden(true)
  }
}

#if os(iOS)
private struct TanreiDatePickerWindowProbe: UIViewRepresentable {
  let report: (CGSize) -> Void

  func makeUIView(context: Context) -> ProbeView { ProbeView() }

  func updateUIView(_ view: ProbeView, context: Context) { view.report = report }

  final class ProbeView: UIView {
    var report: ((CGSize) -> Void)?

    override func didMoveToWindow() {
      super.didMoveToWindow()
      tell()
    }

    override func layoutSubviews() {
      super.layoutSubviews()
      tell()
    }

    private func tell() {
      guard let size = window?.bounds.size else { return }
      let report = self.report
      Task { @MainActor in report?(size) }
    }
  }
}
#elseif os(macOS)
private struct TanreiDatePickerWindowProbe: NSViewRepresentable {
  let report: (CGSize) -> Void

  func makeNSView(context: Context) -> ProbeView { ProbeView() }

  func updateNSView(_ view: ProbeView, context: Context) { view.report = report }

  final class ProbeView: NSView {
    var report: ((CGSize) -> Void)?

    override func viewDidMoveToWindow() {
      super.viewDidMoveToWindow()
      tell()
    }

    override func layout() {
      super.layout()
      tell()
    }

    private func tell() {
      guard let size = window?.contentView?.bounds.size else { return }
      let report = self.report
      Task { @MainActor in report?(size) }
    }
  }
}
#endif

// MARK: - The surface

/// The picker drawn in place, open and at rest, on a fixture's stage (DTP-1's verify; fixtures and galleries only): a modal
/// picker's scrim fills the space it is given with its container centred; a docked picker is its container at its natural
/// size, with its elevation and without an anchor, a placement or an open motion.
@_spi(Fixtures)
public struct TanreiDatePickerSurface: View {
  private let options: TanreiDatePickerOptions
  private let input: TanreiDatePickerInput
  private let onChange: @MainActor (DateComponents?, TanreiDateRange) -> Void
  private let onClose: @MainActor (TanreiDatePickerCloseReason) -> Void

  /// - Parameters:
  ///   - mode: single (`selection`) or range (`range`); a value set for the other mode is ignored and reported (DTP-40).
  ///   - onChange: a committed choice — the date, or the range.
  public init(
    presentation: TanreiDatePickerPresentation = .modal, mode: TanreiDatePickerMode = .single, selection: DateComponents? = nil,
    range: TanreiDateRange = TanreiDateRange(), minDate: DateComponents? = nil, maxDate: DateComponents? = nil,
    disabledDates: Set<DateComponents> = [], isDateDisabled: ((DateComponents) -> Bool)? = nil, today: DateComponents? = nil,
    firstDayOfWeek: TanreiDatePickerFirstDayOfWeek = .locale, locale: Locale? = nil, entryMode: TanreiDatePickerEntryMode = .calendar,
    startView: TanreiDatePickerStartView = .day, labels: TanreiDatePickerLabels = TanreiDatePickerLabels(),
    onChange: @escaping @MainActor (DateComponents?, TanreiDateRange) -> Void = { _, _ in },
    onClose: @escaping @MainActor (TanreiDatePickerCloseReason) -> Void = { _ in }
  ) {
    options = TanreiDatePickerOptions(
      presentation: presentation, mode: mode, minDate: minDate, maxDate: maxDate, disabledDates: disabledDates, isDateDisabled: isDateDisabled,
      today: today, firstDayOfWeek: firstDayOfWeek, locale: locale, entryMode: entryMode, startView: startView, labels: labels)
    input = TanreiDatePickerInput(value: selection, start: range.start, end: range.end)
    self.onChange = onChange
    self.onClose = onClose
  }

  public var body: some View {
    TanreiDatePickerInPlace(options: options, input: input, onChange: onChange, onClose: onClose)
  }
}

/// The in-place surface's state: the configuration is read once, as a presented picker reads it when it opens.
private struct TanreiDatePickerInPlace: View {
  let options: TanreiDatePickerOptions
  let input: TanreiDatePickerInput
  let onChange: @MainActor (DateComponents?, TanreiDateRange) -> Void
  let onClose: @MainActor (TanreiDatePickerCloseReason) -> Void

  @State private var configuration: TanreiDatePickerConfiguration
  @State private var today: TanreiCalendarDate
  @Environment(\.tanreiTheme) private var theme
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize

  init(
    options: TanreiDatePickerOptions, input: TanreiDatePickerInput, onChange: @escaping @MainActor (DateComponents?, TanreiDateRange) -> Void,
    onClose: @escaping @MainActor (TanreiDatePickerCloseReason) -> Void
  ) {
    self.options = options
    self.input = input
    self.onChange = onChange
    self.onClose = onClose
    let configuration = TanreiDatePickerConfiguration(options, input: input)
    configuration.report()
    _configuration = State(initialValue: configuration)
    _today = State(initialValue: configuration.today ?? TanreiDatePickerLocale.deviceToday())
  }

  var body: some View {
    let commit: @MainActor (TanreiDatePickerSelection) -> Void = { selection in
      onChange(selection.date?.components, TanreiDateRange(start: selection.start?.components, end: selection.end?.components))
    }
    switch configuration.presentation {
    case .modal:
      TanreiDatePickerModalSurface(configuration: configuration, today: today, isShown: true, isModal: false, onCommit: commit, onClose: onClose)
    case .docked:
      // At its natural size, centred in the space it is given — narrower when that space is (DTP-38).
      let tokens = theme.system.datePicker
      GeometryReader { proxy in
        TanreiDatePickerContent(
          configuration: configuration, today: today,
          metrics: TanreiDatePickerMetrics.resolve(
            tokens: tokens, target: TanreiHitTarget.minimum(in: theme.system.measure),
            dayLine: tokens.dayLabelTypescale.resolved(policy: theme.fontFamilyPolicy, dynamicTypeSize: dynamicTypeSize).lineHeight,
            widest: proxy.size.width, margin: .zero),
          isInPlace: true, availableHeight: nil, onCommit: commit, onClose: onClose
        )
        .frame(width: proxy.size.width, height: proxy.size.height)
      }
    }
  }
}

/// A modal picker as it is presented: the scrim over the whole window and the container centred in the safe area,
/// `modal.container.margin` from every edge and from the keyboard (DTP-1), faded and grown in (DTP-22).
struct TanreiDatePickerModalSurface: View {
  let configuration: TanreiDatePickerConfiguration
  let today: TanreiCalendarDate
  let isShown: Bool
  /// Presented (modal), or drawn in place for a fixture (the page around it is live).
  let isModal: Bool
  let onCommit: @MainActor (TanreiDatePickerSelection) -> Void
  let onClose: @MainActor (TanreiDatePickerCloseReason) -> Void

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @TanreiPalette private var colors

  var body: some View {
    let tokens = theme.system.datePicker
    GeometryReader { proxy in
      let metrics = TanreiDatePickerMetrics.resolve(
        tokens: tokens, target: TanreiHitTarget.minimum(in: theme.system.measure),
        dayLine: tokens.dayLabelTypescale.resolved(policy: theme.fontFamilyPolicy, dynamicTypeSize: dynamicTypeSize).lineHeight,
        widest: proxy.size.width, margin: tokens.modalContainerMargin)
      ZStack {
        // DTP-1: the scrim over the whole window; DTP-5: pressing it asks to close (outside). No element of its own, no focus.
        Button(action: { onClose(.outside) }) {
          Rectangle()
            .fill(colors[tokens.modalScrimColor])
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .focusable(false)
        .ignoresSafeArea()
        .accessibilityHidden(true)
        .opacity(isShown ? 1 : .zero)
        TanreiDatePickerContent(
          configuration: configuration, today: today, metrics: metrics, isInPlace: !isModal,
          availableHeight: max(.zero, proxy.size.height - 2 * tokens.modalContainerMargin), onCommit: onCommit,
          onClose: onClose
        )
        // DTP-22: in, it fades and grows about its centre from `enter-scale`; only fades under Reduce Motion.
        .opacity(isShown ? 1 : .zero)
        .scaleEffect(isShown ? TanreiIdentity.scale : tokens.hiddenScale(reduceMotion: reduceMotion))
        .padding(.horizontal, metrics.margin)
        .padding(.vertical, tokens.modalContainerMargin)
      }
      .frame(width: proxy.size.width, height: proxy.size.height)
    }
  }
}

// MARK: - The picker

/// Where keyboard focus is inside the picker.
enum TanreiDatePickerFocus: Hashable, Sendable {
  case entryToggle
  case viewToggle
  case previous
  case next
  /// The day grid: one tab stop, the active day (DTP-17).
  case grid
  /// The year list: one tab stop, the focused year (DTP-19).
  case years
  case field(Int)
  case cancel
  case confirm
}

/// DTP-21: which way the grid slides — read by the leaving page as well as the arriving one, so a change of direction
/// applies to both (a transition keeps what it was built with).
@MainActor
final class TanreiDatePickerPager {
  /// +1 for a later month (the new one comes in from the end), -1 for an earlier one.
  var direction: CGFloat = 1
}

/// DTP-5 — presses inside a docked picker. A click inside it (on a day, a navigation button, the view toggle) can take
/// SwiftUI's keyboard focus away from it without moving focus anywhere else; that is not focus leaving it.
@MainActor
final class TanreiDatePickerPresses {
  /// How long after a press inside the picker a loss of focus is the press's (a behaviour of this platform, not a design
  /// value).
  static let window: TimeInterval = 0.5

  private var insideAt: TimeInterval = -.infinity

  func pressedInside() { insideAt = Date.timeIntervalSinceReferenceDate }

  var isRecent: Bool { Date.timeIntervalSinceReferenceDate - insideAt <= Self.window }
}

/// DTP-33: Enter or Space pressed on a day or a year — its cell shows the press; each press counts.
struct TanreiDatePickerKeyPress: Equatable {
  private(set) var target: AnyHashable?
  private(set) var count = 0

  mutating func press(_ target: AnyHashable) {
    self.target = target
    count += 1
  }

  func presses(of target: AnyHashable) -> Int {
    self.target == target ? count : .zero
  }
}

/// The picker itself: its state and behaviour, and its parts — the header, the calendar (the navigation row, the weekday row
/// and the day grid, or the year list) or the fields, and the actions — on its surface.
struct TanreiDatePickerContent: View {
  let configuration: TanreiDatePickerConfiguration
  let today: TanreiCalendarDate
  let metrics: TanreiDatePickerMetrics
  let isInPlace: Bool
  /// DTP-38: the height it may take (the window's less the margins, or the room beside the anchor); `nil` when unbounded.
  let availableHeight: CGFloat?
  /// A docked picker's presses inside it (DTP-5); `nil` elsewhere.
  var presses: TanreiDatePickerPresses? = nil
  let onCommit: @MainActor (TanreiDatePickerSelection) -> Void
  let onClose: @MainActor (TanreiDatePickerCloseReason) -> Void

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.locale) private var environmentLocale
  @Environment(\.layoutDirection) private var layoutDirection
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @FocusState private var focus: TanreiDatePickerFocus?
  @State private var model: TanreiDatePickerModel?
  @State private var pager = TanreiDatePickerPager()
  @State private var keyPress = TanreiDatePickerKeyPress()
  @State private var viewTogglePresses = 0
  /// DTP-38: the heights of the header and the actions of a modal picker, and of its calendar or fields.
  @State private var fixedHeight: CGFloat = .zero
  @State private var bodyHeight: CGFloat = .zero

  private var tokens: TanreiDatePickerTokens { theme.system.datePicker }
  private var labels: TanreiDatePickerLabels { configuration.labels }
  private var bounds: TanreiDatePickerBounds { configuration.bounds }
  private var presentation: TanreiDatePickerPresentation { configuration.presentation }
  private var locale: TanreiDatePickerLocale {
    TanreiDatePickerLocale.shared(configuration.locale ?? environmentLocale, firstDayOfWeek: configuration.firstDayOfWeek)
  }

  var body: some View {
    let locale = self.locale
    let model = self.model ?? TanreiDatePickerModel(configuration: configuration, today: today, numeric: locale.numericText)
    Group {
      switch presentation {
      case .modal: modalContainer(model: model, locale: locale)
      case .docked: dockedContainer(model: model, locale: locale)
      }
    }
    .onAppear {
      if self.model == nil { self.model = model }
      guard !isInPlace else { return }
      // DTP-3: focus moves in when it opens — to the first field, the displayed year or the active day.
      let initial: TanreiDatePickerFocus = model.entry == .text ? .field(0) : model.pane == .years ? .years : .grid
      Task { @MainActor in focus = initial }
    }
    .onChange(of: focus) { old, new in
      // DTP-5: focus moving out of a docked picker closes it — decided a turn later, so that a move inside it lands first.
      guard presentation == .docked, !isInPlace, old != nil, new == nil else { return }
      Task { @MainActor in
        guard focus == nil else { return }
        if presses?.isRecent == true {
          // A press inside it, or its own change of view, took focus away without moving it anywhere: it stays open, and the
          // keys keep working (the view that takes focus may need a turn to appear).
          let target: TanreiDatePickerFocus = current().pane == .years ? .years : .grid
          focus = target
          Task { @MainActor in if focus == nil { focus = target } }
        } else {
          onClose(.focusOut)
        }
      }
    }
    // DTP-5: Escape, and the accessibility escape gesture (the platform's back).
    .onKeyPress(.escape) {
      guard !isInPlace else { return .ignored }
      onClose(.escape)
      return .handled
    }
    #if os(macOS)
    .onExitCommand { if !isInPlace { onClose(.escape) } }
    #endif
    .accessibilityAction(.escape) { onClose(.back) }
  }

  private func update(_ change: (inout TanreiDatePickerModel) -> Void) {
    var model = self.model ?? TanreiDatePickerModel(configuration: configuration, today: today, numeric: locale.numericText)
    change(&model)
    self.model = model
  }

  private func current() -> TanreiDatePickerModel {
    model ?? TanreiDatePickerModel(configuration: configuration, today: today, numeric: locale.numericText)
  }

  // MARK: Containers

  /// DTP-1, DTP-23, DTP-24, DTP-38: the header, the divider, the calendar or the fields, the actions, on the raised surface.
  /// When they do not fit, the header and the actions stay and the calendar scrolls between them; when those alone leave no
  /// room, everything scrolls together.
  private func modalContainer(model: TanreiDatePickerModel, locale: TanreiDatePickerLocale) -> some View {
    let header = header(model: model, locale: locale)
    let actions = actions(model: model, locale: locale)
    let entry = entry(model: model, locale: locale)
    let minimumBody = metrics.cellHeight
    let available = availableHeight
    let allScroll = available.map { fixedHeight > .zero && fixedHeight + minimumBody > $0 } ?? false
    let bodyLimit = available.map { max(minimumBody, $0 - fixedHeight) }
    let scrollsBody = !allScroll && bodyLimit.map { bodyHeight > $0 } ?? false
    let column = VStack(spacing: .zero) {
      VStack(spacing: .zero) {
        header
        divider
      }
      .background { heightReader { fixedPart(header: $0) } }
      Group {
        if scrollsBody, let bodyLimit {
          TanreiScrollRegion(axis: .vertical) { entry.background { heightReader { bodyHeight = $0 } } }
            .frame(height: bodyLimit)
        } else {
          entry.background { heightReader { bodyHeight = $0 } }
        }
      }
      actions.background { heightReader { fixedPart(actions: $0) } }
    }
    .frame(width: metrics.surfaceWidth)
    return Group {
      if allScroll, let available {
        TanreiScrollRegion(axis: .vertical) { column }.frame(width: metrics.surfaceWidth, height: available)
      } else {
        column
      }
    }
    .modifier(TanreiDatePickerSurfaceChrome(presentation: .modal, label: labels.label, isModal: !isInPlace))
  }

  @State private var headerHeight: CGFloat = .zero
  @State private var actionsHeight: CGFloat = .zero

  private func fixedPart(header: CGFloat? = nil, actions: CGFloat? = nil) {
    if let header { headerHeight = header }
    if let actions { actionsHeight = actions }
    fixedHeight = headerHeight + actionsHeight
  }

  private func heightReader(_ report: @escaping (CGFloat) -> Void) -> some View {
    GeometryReader { proxy in
      Color.clear
        .onAppear { report(proxy.size.height) }
        .onChange(of: proxy.size.height) { _, height in report(height) }
    }
  }

  /// DTP-2, DTP-38: the calendar on the docked surface; taller than the room beside its anchor, it scrolls.
  private func dockedContainer(model: TanreiDatePickerModel, locale: TanreiDatePickerLocale) -> some View {
    let calendar = calendar(model: model, locale: locale)
    return Group {
      if let availableHeight {
        TanreiScrollRegion(axis: .vertical) { calendar }.frame(width: metrics.surfaceWidth, height: availableHeight)
      } else {
        calendar
      }
    }
    .modifier(TanreiDatePickerSurfaceChrome(presentation: .docked, label: labels.label, isModal: false))
  }

  @ViewBuilder
  private func entry(model: TanreiDatePickerModel, locale: TanreiDatePickerLocale) -> some View {
    ZStack {
      if model.entry == .text {
        fields(model: model, locale: locale)
          .transition(.opacity)
      } else {
        calendar(model: model, locale: locale)
          .transition(.opacity)
      }
    }
  }

  // MARK: Header (DTP-23)

  private func header(model: TanreiDatePickerModel, locale: TanreiDatePickerLocale) -> some View {
    let parts = TanreiDatePickerRules.header(pending: model.pending, mode: model.mode, today: model.today, labels: labels, locale: locale)
    let value = colors[tokens.headerValueColor]
    let placeholder = colors[tokens.headerPlaceholderColor]
    var text = Text(verbatim: "")
    for (index, part) in parts.enumerated() {
      // The dash between a range's start and end is drawn in the value's color and style.
      if index > 0 { text = text + Text(verbatim: TanreiDatePickerRules.rangeDash).foregroundStyle(value) }
      text = text + Text(verbatim: part.text).foregroundStyle(part.isPlaceholder ? placeholder : value)
    }
    let isText = model.entry == .text
    return VStack(alignment: .leading, spacing: tokens.headerGap) {
      Text(verbatim: labels.label)
        .fixedSize(horizontal: false, vertical: true)
        .tanreiTextStyle(tokens.headerLabelTypescale)
        .foregroundStyle(colors[tokens.headerLabelColor])
        .accessibilityAddTraits(.isHeader)
      HStack(alignment: .center, spacing: .zero) {
        // The value wraps rather than being cut, and grows with enlarged text.
        text
          .fixedSize(horizontal: false, vertical: true)
          .tanreiTextStyle(tokens.headerValueTypescale)
          .frame(maxWidth: .infinity, alignment: .leading)
        // DTP-28: the entry-mode toggle, a standard medium Tanrei icon button at the end of the value's line.
        TanreiIconButton(isText ? labels.calendarEntryLabel : labels.textEntryLabel, action: toggleEntry) {
          TanreiDatePickerGlyph(kind: isText ? .calendar : .keyboard)
        }
        .focused($focus, equals: .entryToggle)
      }
    }
    .padding(.leading, tokens.headerPaddingInlineStart)
    .padding(.trailing, tokens.headerPaddingInlineEnd)
    .padding(.vertical, tokens.headerPaddingBlock)
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  private var divider: some View {
    Rectangle()
      .fill(colors[tokens.dividerColor])
      .frame(height: tokens.dividerWidth)
      .accessibilityHidden(true)
  }

  // MARK: Actions (DTP-24)

  private func actions(model: TanreiDatePickerModel, locale: TanreiDatePickerLocale) -> some View {
    let canConfirm = model.canConfirm(parse: locale.parse, bounds: bounds)
    return HStack(spacing: tokens.actionsGap) {
      TanreiButton(labels.cancelLabel, variant: .text, size: .medium) { onClose(.cancel) }
        .focused($focus, equals: .cancel)
      TanreiButton(labels.confirmLabel, variant: .text, size: .medium, action: confirm)
        .disabled(!canConfirm)
        .focused($focus, equals: .confirm)
    }
    .padding(.vertical, tokens.actionsPaddingBlock)
    .padding(.trailing, metrics.paddingInline)
    .frame(maxWidth: .infinity, alignment: .trailing)
  }

  // MARK: Calendar

  private func calendar(model: TanreiDatePickerModel, locale: TanreiDatePickerLocale) -> some View {
    VStack(spacing: .zero) {
      navigationRow(model: model, locale: locale)
      ZStack(alignment: .top) {
        if model.pane == .days {
          days(model: model, locale: locale)
            .transition(.opacity)
        } else {
          years(model: model, locale: locale)
            .transition(.opacity)
        }
      }
      .frame(height: CGFloat(TanreiDatePickerRules.rows + 1) * metrics.cellHeight, alignment: .top)
    }
    .padding(.horizontal, metrics.paddingInline)
    .padding(.vertical, tokens.containerPaddingBlock)
  }

  /// DTP-14: the view toggle at the start and, in the day view, the previous and next buttons at the end.
  private func navigationRow(model: TanreiDatePickerModel, locale: TanreiDatePickerLocale) -> some View {
    let rightToLeft = layoutDirection == .rightToLeft
    let isYears = model.pane == .years
    return HStack(spacing: tokens.navigationGap) {
      TanreiDatePickerViewToggle(
        text: locale.monthYear(model.month), description: labels.yearViewLabel, isExpanded: isYears, isFocused: focus == .viewToggle,
        keyPresses: viewTogglePresses, action: togglePane
      )
      .focused($focus, equals: .viewToggle)
      .onKeyPress(phases: .down) { press in
        // DTP-5: Shift+Tab out of a docked picker (the view toggle is its first stop).
        guard presentation == .docked, !isInPlace, press.key == .tab && press.modifiers.contains(.shift) || press.characters == TanreiSearchKeys.backTab
        else { return .ignored }
        tabOut()
        return .handled
      }
      .tanreiKeyActivation(isEnabled: true) {
        viewTogglePresses += 1
        togglePane()
      }
      Spacer(minLength: .zero)
      if !isYears {
        // Chevrons toward the start and the end: left and right, swapped right to left.
        TanreiIconButton(labels.previousMonthLabel, action: { page(by: -1) }) {
          TanreiDatePickerGlyph(kind: rightToLeft ? .chevronRight : .chevronLeft)
        }
        .disabled(!TanreiDatePickerRules.canPage(model.month, by: -1, bounds: bounds))
        .focused($focus, equals: .previous)
        TanreiIconButton(labels.nextMonthLabel, action: { page(by: 1) }) {
          TanreiDatePickerGlyph(kind: rightToLeft ? .chevronLeft : .chevronRight)
        }
        .disabled(!TanreiDatePickerRules.canPage(model.month, by: 1, bounds: bounds))
        .focused($focus, equals: .next)
      }
    }
    .frame(minHeight: metrics.cellHeight)
  }

  /// DTP-11, DTP-13: the weekday row, then six rows of seven cells.
  private func days(model: TanreiDatePickerModel, locale: TanreiDatePickerLocale) -> some View {
    let first = locale.firstWeekday
    let narrow = locale.narrowWeekdays
    let full = locale.fullWeekdays
    let columns = (0..<TanreiDatePickerRules.columns).map { (first - 1 + $0) % TanreiDatePickerRules.columns }
    return VStack(spacing: .zero) {
      HStack(spacing: .zero) {
        ForEach(columns, id: \.self) { weekday in
          // DTP-13: the narrow name centred in its column; a column header named by the full name; no focus.
          Text(verbatim: narrow[weekday])
            .tanreiTextStyle(tokens.weekdayTypescale)
            .foregroundStyle(colors[tokens.weekdayColor])
            .frame(width: metrics.cellWidth, height: metrics.cellHeight)
            .accessibilityLabel(Text(verbatim: full[weekday]))
            .accessibilityAddTraits(.isHeader)
        }
      }
      ZStack {
        grid(month: model.month, model: model, locale: locale)
          .id(model.month)
          .transition(
            .asymmetric(
              insertion: .modifier(
                active: TanreiDatePickerPageSlide(pager: pager, arriving: true, width: metrics.gridWidth),
                identity: TanreiDatePickerPageSlide(pager: pager, arriving: nil, width: metrics.gridWidth)),
              removal: .modifier(
                active: TanreiDatePickerPageSlide(pager: pager, arriving: false, width: metrics.gridWidth),
                identity: TanreiDatePickerPageSlide(pager: pager, arriving: nil, width: metrics.gridWidth))))
      }
      .frame(width: metrics.gridWidth, height: CGFloat(TanreiDatePickerRules.rows) * metrics.cellHeight)
      .clipped()
      // DTP-17, DTP-18: the grid is one tab stop — the active day —, moved by its keys.
      .focusable(!isInPlace)
      .focused($focus, equals: .grid)
      .focusEffectDisabled()
      .onKeyPress(phases: .down) { press in gridKey(press) }
      // DTP-36: the grid, named by the month and year it shows.
      .accessibilityElement(children: .contain)
      .accessibilityLabel(Text(verbatim: locale.monthYear(model.month)))
    }
  }

  private func grid(month: TanreiCalendarMonth, model: TanreiDatePickerModel, locale: TanreiDatePickerLocale) -> some View {
    let cells = month.cells(firstWeekday: locale.firstWeekday)
    return VStack(spacing: .zero) {
      ForEach(0..<TanreiDatePickerRules.rows, id: \.self) { row in
        HStack(spacing: .zero) {
          ForEach(0..<TanreiDatePickerRules.columns, id: \.self) { column in
            if let date = cells[row * TanreiDatePickerRules.columns + column] {
              day(date, model: model, locale: locale)
            } else {
              // DTP-11, DTP-36: an empty cell, hidden.
              Color.clear
                .frame(width: metrics.cellWidth, height: metrics.cellHeight)
                .accessibilityHidden(true)
            }
          }
        }
      }
    }
  }

  private func day(_ date: TanreiCalendarDate, model: TanreiDatePickerModel, locale: TanreiDatePickerLocale) -> some View {
    let pending = model.pending
    return TanreiDatePickerDay(
      date: date.components, disabled: bounds.isUnavailable(date),
      number: locale.number(date.day),
      condition: TanreiDatePickerRules.condition(of: date, pending: pending, today: model.today),
      halfBand: TanreiDatePickerRules.halfBand(of: date, pending: pending),
      name: TanreiDatePickerRules.dayName(date, today: model.today, labels: labels, locale: locale),
      description: TanreiDatePickerRules.dayDescription(date, pending: pending, labels: labels),
      isSelected: TanreiDatePickerRules.isSelected(date, pending: pending),
      isFocused: focus == .grid && model.active == date, keyPresses: keyPress.presses(of: date), metrics: metrics,
      action: { choose(date, byKey: false) })
  }

  /// DTP-16: the years in rows of three, the displayed year's row third in view.
  private func years(model: TanreiDatePickerModel, locale: TanreiDatePickerLocale) -> some View {
    let years = bounds.years
    let rowCount = (years.count + TanreiDatePickerRules.yearColumns - 1) / TanreiDatePickerRules.yearColumns
    let inView = TanreiDatePickerRules.rows + 1
    let first = TanreiDatePickerRules.firstYearRow(displayed: model.month.year, years: years, rowsInView: inView)
    let height = CGFloat(inView) * metrics.cellHeight
    return Group {
      if isInPlace {
        // Drawn at rest: the rows in view, the displayed year's third.
        VStack(spacing: .zero) {
          ForEach(first..<min(rowCount, first + inView), id: \.self) { yearRow($0, years: years, model: model, locale: locale) }
        }
        .frame(height: height, alignment: .top)
        .clipped()
      } else {
        ScrollViewReader { reader in
          ScrollView(.vertical, showsIndicators: false) {
            LazyVStack(spacing: .zero) {
              ForEach(0..<rowCount, id: \.self) { yearRow($0, years: years, model: model, locale: locale) }
            }
          }
          .frame(height: height)
          .onAppear { reader.scrollTo(first, anchor: .top) }
          .onChange(of: model.activeYear) { _, year in
            // DTP-19: the focused year scrolled into view.
            reader.scrollTo((year - years.lowerBound) / TanreiDatePickerRules.yearColumns)
          }
        }
      }
    }
    .frame(width: metrics.gridWidth)
    // DTP-19: the list is one tab stop — the displayed year —, moved by its keys.
    .focusable(!isInPlace)
    .focused($focus, equals: .years)
    .focusEffectDisabled()
    .onKeyPress(phases: .down) { press in yearKey(press) }
    .accessibilityElement(children: .contain)
  }

  private func yearRow(_ index: Int, years: ClosedRange<Int>, model: TanreiDatePickerModel, locale: TanreiDatePickerLocale) -> some View {
    HStack(spacing: .zero) {
      ForEach(0..<TanreiDatePickerRules.yearColumns, id: \.self) { column in
        let year = years.lowerBound + index * TanreiDatePickerRules.yearColumns + column
        if years.contains(year) {
          self.year(year, model: model, locale: locale)
        } else {
          Color.clear.frame(width: metrics.gridWidth / CGFloat(TanreiDatePickerRules.yearColumns), height: metrics.cellHeight)
            .accessibilityHidden(true)
        }
      }
    }
    .id(index)
  }

  private func year(_ year: Int, model: TanreiDatePickerModel, locale: TanreiDatePickerLocale) -> some View {
    let text = locale.number(year)
    let isCurrent = year == model.today.year
    return TanreiDatePickerYear(
      year: year, number: text,
      condition: TanreiDatePickerRules.condition(ofYear: year, displayed: model.month.year, today: model.today),
      name: isCurrent && !labels.todayLabel.isEmpty ? "\(text), \(labels.todayLabel)" : text, isSelected: year == model.month.year,
      isFocused: focus == .years && model.activeYear == year, keyPresses: keyPress.presses(of: year), metrics: metrics,
      action: { chooseYear(year) })
  }

  // MARK: Fields (DTP-25)

  private func fields(model: TanreiDatePickerModel, locale: TanreiDatePickerLocale) -> some View {
    let pattern = locale.numericPattern
    let names = model.mode == .single ? [labels.dateLabel] : [labels.startLabel, labels.endLabel]
    return HStack(alignment: .top, spacing: tokens.inputGap) {
      ForEach(Array(names.enumerated()), id: \.offset) { index, name in
        TanreiTextField(
          name, text: fieldBinding(index), prompt: Text(verbatim: pattern), variant: .outlined, size: .medium, type: .text,
          errorText: model.errors.indices.contains(index) ? model.errors[index] : "",
          error: model.errors.indices.contains(index) && !model.errors[index].isEmpty,
          onCommit: { _ in commitField(index) }, onSubmit: { submitField(index) }
        )
        .focused($focus, equals: .field(index))
        .frame(maxWidth: .infinity)
      }
    }
    // DTP-25: the range fields make room for each other's labels (TXF-13), so their containers are equally tall and
    // level when one label wraps and the other does not; an error or supporting line below one of them does not count.
    .environment(\.tanreiTextFieldLabelRoom, names.count > 1 ? names.map { Text(verbatim: $0) } : [])
    .padding(.horizontal, tokens.inputPaddingInline)
    .padding(.vertical, tokens.inputPaddingBlock)
  }

  private func fieldBinding(_ index: Int) -> Binding<String> {
    Binding(
      get: { current().texts.indices.contains(index) ? current().texts[index] : "" },
      set: { text in
        let parse = locale.parse
        update { $0.edit(index, text: text, parse: parse, bounds: bounds) }
      })
  }

  // MARK: Behaviour

  /// DTP-8, DTP-9, DTP-7: a day chosen; a docked picker commits a completed choice and closes.
  private func choose(_ date: TanreiCalendarDate, byKey: Bool) {
    if byKey && !bounds.isUnavailable(date) { keyPress.press(date) }
    var model = current()
    let choice = model.choose(date, bounds: bounds)
    self.model = model
    guard presentation == .docked, choice == .completed else { return }
    if model.differs { onCommit(model.pending) }
    onClose(.select)
  }

  /// DTP-6: OK — change when the choice differs, then close with confirm.
  private func confirm() {
    let model = current()
    guard model.canConfirm(parse: locale.parse, bounds: bounds) else { return }
    if model.differs { onCommit(model.pending) }
    onClose(.confirm)
  }

  /// DTP-15: the view toggle; focus follows to the displayed year, or back to the active day.
  private func togglePane() {
    presses?.pressedInside()
    withAnimation(tokens.pageMotion(reduceMotion: reduceMotion)) { update { $0.togglePane() } }
    let target: TanreiDatePickerFocus = current().pane == .years ? .years : .grid
    if focus == .grid || focus == .years { Task { @MainActor in focus = target } }
  }

  /// DTP-16: a year chosen — the day view of that month, focus to its active day, announced.
  private func chooseYear(_ year: Int, byKey: Bool = false) {
    if byKey { keyPress.press(year) }
    presses?.pressedInside()
    withAnimation(tokens.pageMotion(reduceMotion: reduceMotion)) { update { $0.chooseYear(year, bounds: bounds) } }
    announce(current().month)
    if !isInPlace { Task { @MainActor in focus = .grid } }
  }

  /// DTP-20, DTP-21: the previous or next month; focus stays on the button (or goes to the grid when it is disabled at a
  /// bound), announced.
  private func page(by months: Int) {
    presses?.pressedInside()
    pager.direction = months > 0 ? 1 : -1
    var moved = false
    withAnimation(tokens.pageMotion(reduceMotion: reduceMotion)) { update { moved = $0.page(by: months, bounds: bounds) } }
    guard moved else { return }
    announce(current().month)
    let month = current().month
    let atBound = !TanreiDatePickerRules.canPage(month, by: months, bounds: bounds)
    if atBound && (focus == .previous || focus == .next) { Task { @MainActor in focus = .grid } }
  }

  /// DTP-28: the entry-mode toggle.
  private func toggleEntry() {
    let numeric = locale.numericText
    withAnimation(tokens.pageMotion(reduceMotion: reduceMotion)) { update { $0.toggleEntry(bounds: bounds, numeric: numeric) } }
    let target: TanreiDatePickerFocus = current().entry == .text ? .field(0) : .grid
    Task { @MainActor in focus = target }
  }

  private func commitField(_ index: Int) {
    let parse = locale.parse
    update { $0.commit(index, parse: parse, labels: labels, bounds: bounds) }
  }

  /// DTP-27: the action key — the next field, or OK from the last one when it is enabled.
  private func submitField(_ index: Int) {
    if index + 1 < current().fieldCount {
      Task { @MainActor in focus = .field(index + 1) }
    } else {
      confirm()
    }
  }

  /// DTP-5: Tab out of a docked picker closes it, focus back on its anchor.
  private func tabOut() {
    onClose(.tab)
  }

  /// DTP-20: the new month and year, read once, politely.
  private func announce(_ month: TanreiCalendarMonth) {
    guard !isInPlace else { return }
    var text = AttributedString(locale.monthYear(month))
    text.accessibilitySpeechAnnouncementPriority = .default
    AccessibilityNotification.Announcement(text).post()
  }

  /// DTP-18: the grid's keys.
  private func gridKey(_ press: KeyPress) -> KeyPress.Result {
    guard !isInPlace else { return .ignored }
    if press.key == .return || press.key == .space {
      choose(current().active, byKey: true)
      return .handled
    }
    if press.key == .tab || press.characters == TanreiSearchKeys.backTab {
      // DTP-5: Tab out of a docked picker (the grid is its last stop); Shift+Tab stays inside it.
      guard presentation == .docked, press.key == .tab, !press.modifiers.contains(.shift) else { return .ignored }
      tabOut()
      return .handled
    }
    let before = current().month
    var moved = false
    let first = locale.firstWeekday
    let rightToLeft = layoutDirection == .rightToLeft
    var next = current()
    moved = next.move(key: press.key, shift: press.modifiers.contains(.shift), rightToLeft: rightToLeft, firstWeekday: first, bounds: bounds)
    guard moved else { return .ignored }
    if next.month != before {
      pager.direction = next.month > before ? 1 : -1
      withAnimation(tokens.pageMotion(reduceMotion: reduceMotion)) { model = next }
    } else {
      model = next
    }
    return .handled
  }

  /// DTP-19: the year list's keys.
  private func yearKey(_ press: KeyPress) -> KeyPress.Result {
    guard !isInPlace else { return .ignored }
    if press.key == .return || press.key == .space {
      chooseYear(current().activeYear, byKey: true)
      return .handled
    }
    if press.key == .tab {
      guard presentation == .docked, !press.modifiers.contains(.shift) else { return .ignored }
      tabOut()
      return .handled
    }
    var moved = false
    let years = bounds.years
    let rightToLeft = layoutDirection == .rightToLeft
    update { moved = $0.moveYear(key: press.key, rightToLeft: rightToLeft, years: years) }
    return moved ? .handled : .ignored
  }
}

/// DTP-1, DTP-2, DTP-36: the raised surface — its color, elevation and corners eased by the corner smoothing, the parts
/// clipped to them — exposed as a dialog named by the label (a modal one while modal).
private struct TanreiDatePickerSurfaceChrome: ViewModifier {
  let presentation: TanreiDatePickerPresentation
  let label: String
  let isModal: Bool

  @Environment(\.tanreiTheme) private var theme
  @TanreiPalette private var colors

  func body(content: Content) -> some View {
    let tokens = theme.system.datePicker
    let modal = presentation == .modal
    let shape = modal ? tokens.modalContainerShape : tokens.dockedContainerShape
    content
      .clipShape(TanreiCornerShape(cornerRadius: shape, style: theme.system.shape.roundedCornerStyle))
      // SwiftUI has no dialog role: a container named by the label, modal while modal — the surface's frame, not its shadow's.
      .accessibilityElement(children: .contain)
      .accessibilityLabel(Text(verbatim: label))
      .accessibilityAddTraits(isModal ? .isModal : [])
      .background {
        TanreiElevationSurface(
          modal ? tokens.modalContainerElevation : tokens.dockedContainerElevation,
          fill: colors[modal ? tokens.modalContainerColor : tokens.dockedContainerColor], cornerRadius: shape)
      }
  }
}

/// DTP-21: a page of the grid sliding — in from the end for a later month (out toward the start), the reverse for an earlier
/// one; SwiftUI mirrors the offset right to left through `.leading` layout. `arriving` is `nil` at rest.
struct TanreiDatePickerPageSlide: ViewModifier {
  let pager: TanreiDatePickerPager
  let arriving: Bool?
  /// The page's width: how far it slides.
  let width: CGFloat

  func body(content: Content) -> some View {
    // An offset toward the end is mirrored right to left with the layout.
    let fraction: CGFloat = arriving.map { $0 ? pager.direction : -pager.direction } ?? .zero
    content.offset(x: fraction * width)
  }
}

// MARK: - Cells

/// One day of the displayed month (the spec's `day` item, generated by the picker): its number on a square container of its
/// condition — the band across the whole cell for a day inside a range —, a button named by its full date (DTP-12, DTP-36).
/// `disabled` is the day being unavailable: it is drawn from the disabled tokens and exposed as disabled (DTP-30), and stays
/// reachable by the grid's keys, which move over it.
struct TanreiDatePickerDay: View {
  let date: DateComponents
  let disabled: Bool
  let number: String
  let condition: TanreiDatePickerCondition
  let halfBand: TanreiDatePickerRules.HalfBand?
  let name: String
  let description: String?
  let isSelected: Bool
  let isFocused: Bool
  let keyPresses: Int
  let metrics: TanreiDatePickerMetrics
  let action: @MainActor () -> Void

  var body: some View {
    Button(action: action) {
      // The button is the element, named by the full date: the number is not one of its own (a disabled day's number would
      // otherwise be exposed as an enabled text).
      Text(verbatim: number).accessibilityHidden(true)
    }
    .buttonStyle(
      TanreiDatePickerCellStyle(
        kind: condition == .inRange ? .band : .day, condition: condition, halfBand: halfBand, isFocused: isFocused, keyPresses: keyPresses,
        metrics: metrics))
    .disabled(disabled)
    // One tab stop for the grid (DTP-17): the day itself takes no focus; the grid moves the active day.
    .focusable(false)
    .accessibilityLabel(Text(verbatim: name))
    .modifier(TanreiDatePickerHint(text: description))
    .accessibilityAddTraits(isSelected ? .isSelected : [])
  }
}

/// One year of the year view (the spec's `year` item, generated by the picker): a button with its selected state and
/// todayLabel for the current year (DTP-16, DTP-36).
struct TanreiDatePickerYear: View {
  let year: Int
  let number: String
  let condition: TanreiDatePickerCondition
  let name: String
  let isSelected: Bool
  let isFocused: Bool
  let keyPresses: Int
  let metrics: TanreiDatePickerMetrics
  let action: @MainActor () -> Void

  var body: some View {
    Button(action: action) {
      Text(verbatim: number)
    }
    .buttonStyle(
      TanreiDatePickerCellStyle(kind: .year, condition: condition, halfBand: nil, isFocused: isFocused, keyPresses: keyPresses, metrics: metrics))
    .focusable(false)
    .accessibilityLabel(Text(verbatim: name))
    .accessibilityAddTraits(isSelected ? .isSelected : [])
  }
}

private struct TanreiDatePickerHint: ViewModifier {
  let text: String?

  func body(content: Content) -> some View {
    if let text, !text.isEmpty { content.accessibilityHint(Text(verbatim: text)) } else { content }
  }
}

/// A day's, a year's or the band's press, hover and focus drawn from the tokens of its condition (DTP-31 … DTP-35).
struct TanreiDatePickerCellStyle: ButtonStyle {
  enum Kind: Equatable {
    /// A day on its square.
    case day
    /// A day inside a range: its container spans the whole cell (DTP-12).
    case band
    case year
  }

  let kind: Kind
  let condition: TanreiDatePickerCondition
  let halfBand: TanreiDatePickerRules.HalfBand?
  let isFocused: Bool
  let keyPresses: Int
  let metrics: TanreiDatePickerMetrics

  func makeBody(configuration: Configuration) -> some View {
    TanreiDatePickerCellChrome(
      kind: kind, condition: condition, halfBand: halfBand, isPressed: configuration.isPressed, isFocused: isFocused, keyPresses: keyPresses,
      metrics: metrics
    ) {
      configuration.label
    }
  }
}

struct TanreiDatePickerCellChrome<Label: View>: View {
  let kind: TanreiDatePickerCellStyle.Kind
  let condition: TanreiDatePickerCondition
  let halfBand: TanreiDatePickerRules.HalfBand?
  let isPressed: Bool
  let isFocused: Bool
  let keyPresses: Int
  let metrics: TanreiDatePickerMetrics
  @ViewBuilder let label: Label

  @Environment(\.tanreiSystem) private var system
  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    let feedback = system.behavior.pressedFeedback
    // DTP-33: a press stays visible at least `duration.press-hold`; DTP-34: the point of contact only under `ripple`.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyPresses, watchesContact: feedback == .ripple) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let tokens = system.datePicker
    // DTP-31: one state — pressed > focused > hovered; keyboard focus only (the grid's, handed in).
    let state = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let appearance = TanreiDatePickerCellAppearance(tokens: tokens, condition: condition, state: state, feedback: feedback, beneath: beneath)
    let ripple = appearance.ripple.map { TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion)) }
    let cellWidth = kind == .year ? metrics.gridWidth / CGFloat(TanreiDatePickerRules.yearColumns) : metrics.cellWidth
    let square = CGSize(
      width: kind == .year ? min(tokens.yearContainerWidth, cellWidth) : metrics.daySide,
      height: kind == .year ? tokens.yearContainerHeight : metrics.daySide)
    let shape = kind == .year ? tokens.yearContainerShape : tokens.dayContainerShape
    // DTP-12: the band spans its cell with square ends, so that consecutive days join and a row's end breaks it.
    let container = kind == .band ? CGSize(width: cellWidth, height: metrics.daySide) : square
    let radius = kind == .band ? TanreiDatePickerCellChrome.squareEnds : shape
    return ZStack {
      if let halfBand {
        // DTP-12: a range's end runs half its cell into the band, behind its own container.
        Rectangle()
          .fill(colors[tokens.conditions[.inRange].enabled.containerColor])
          .frame(width: cellWidth / 2, height: metrics.daySide)
          .frame(maxWidth: .infinity, alignment: halfBand == .trailing ? .trailing : .leading)
          .accessibilityHidden(true)
      }
      label
        .lineLimit(1)
        .tanreiTextStyle(kind == .year ? tokens.yearLabelTypescale : tokens.dayLabelTypescale)
        .foregroundStyle(colors[appearance.label])
        .frame(width: container.width, height: container.height)
        .modifier(
          TanreiContainerLayers(
            fill: colors[appearance.container], elevation: TanreiIdentity.elevation, cornerRadius: radius, outline: colors[appearance.outline],
            outlineWidth: tokens.outlineWidth, ripple: ripple, opacity: appearance.opacity))
        .animation(tokens.stateMotion(reduceMotion: reduceMotion), value: state)
        // DTP-32: the ring around the square — an in-range day's too —, keyboard focus only, never animated.
        .overlay {
          Color.clear
            .frame(width: square.width, height: square.height)
            .tanreiFocusRing(isFocused, cornerRadius: shape)
        }
    }
    .frame(width: cellWidth, height: metrics.cellHeight)
    // DTP-11: the cell is the hit area.
    .contentShape(Rectangle())
    .onHover { isHovered = $0 }
  }

  /// The band's ends are square (DTP-12): geometry, not a design value.
  static var squareEnds: CGFloat { .zero }
}

// MARK: - The view toggle (DTP-15)

/// The displayed month and year with a chevron that turns half a turn while the year view is shown; drawn with the
/// unselected condition's colors; its hit area reaches the minimum target.
struct TanreiDatePickerViewToggle: View {
  let text: String
  let description: String
  let isExpanded: Bool
  let isFocused: Bool
  let keyPresses: Int
  let action: @MainActor () -> Void

  var body: some View {
    Button(action: action) {
      Text(verbatim: text)
    }
    .buttonStyle(TanreiDatePickerViewToggleStyle(isExpanded: isExpanded, isFocused: isFocused, keyPresses: keyPresses))
    .focusEffectDisabled()
    .accessibilityLabel(Text(verbatim: text))
    .modifier(TanreiDatePickerHint(text: description))
    // SwiftUI has no expanded state: a toggle, on while the year view is shown.
    .accessibilityAddTraits(isExpanded ? [.isToggle, .isSelected] : .isToggle)
  }
}

struct TanreiDatePickerViewToggleStyle: ButtonStyle {
  let isExpanded: Bool
  let isFocused: Bool
  let keyPresses: Int

  func makeBody(configuration: Configuration) -> some View {
    TanreiDatePickerViewToggleChrome(isExpanded: isExpanded, isPressed: configuration.isPressed, isFocused: isFocused, keyPresses: keyPresses) {
      configuration.label
    }
    .tanreiHitTargetExpansion()
  }
}

struct TanreiDatePickerViewToggleChrome<Label: View>: View {
  let isExpanded: Bool
  let isPressed: Bool
  let isFocused: Bool
  let keyPresses: Int
  @ViewBuilder let label: Label

  @Environment(\.tanreiSystem) private var system
  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    let feedback = system.behavior.pressedFeedback
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyPresses, watchesContact: feedback == .ripple) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let tokens = system.datePicker
    let state = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let appearance = TanreiDatePickerCellAppearance(tokens: tokens, condition: .unselected, state: state, feedback: feedback, beneath: beneath)
    let ripple = appearance.ripple.map { TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion)) }
    return HStack(spacing: tokens.viewToggleGap) {
      label
        .fixedSize(horizontal: false, vertical: true)
        .tanreiTextStyle(tokens.viewToggleLabelTypescale)
      TanreiDatePickerGlyph(kind: .expandMore, size: tokens.viewToggleIconSize)
        // DTP-15: half a turn while the year view is shown, over the state motion.
        .rotationEffect(isExpanded ? TanreiDatePickerGlyph.halfTurn : .zero)
        .animation(tokens.stateMotion(reduceMotion: reduceMotion), value: isExpanded)
    }
    .foregroundStyle(colors[appearance.label])
    .padding(.horizontal, tokens.viewToggleContainerPaddingInline)
    .frame(minHeight: tokens.viewToggleContainerHeight)
    .modifier(
      TanreiContainerLayers(
        fill: colors[appearance.container], elevation: TanreiIdentity.elevation, cornerRadius: tokens.viewToggleContainerShape,
        outline: colors[appearance.outline], outlineWidth: tokens.outlineWidth, ripple: ripple, opacity: appearance.opacity))
    .animation(tokens.stateMotion(reduceMotion: reduceMotion), value: state)
    .tanreiFocusRing(isFocused && isEnabled, cornerRadius: tokens.viewToggleContainerShape)
    .onHover { isHovered = $0 }
  }
}

// MARK: - Glyphs

/// A glyph the picker draws itself (DTP-14, DTP-15, DTP-23): with the icon font — the family, fill, weight and optical size of
/// an unselected icon at its size — its glyph by name; without it (or under the platform-font policy) a vector in the same
/// box, stroked at `sys.border.thick` as the chip's and the split button's drawn glyphs are. It never mirrors: the picker
/// swaps the chevrons right to left itself.
struct TanreiDatePickerGlyph: View {
  enum Kind: String, Sendable {
    case chevronLeft = "chevron_left"
    case chevronRight = "chevron_right"
    case expandMore = "expand_more"
    case keyboard
    case calendar = "calendar_month"
  }

  /// Half a turn: the view toggle's chevron while the year view is shown. A geometric constant, not a design value.
  static let halfTurn = Angle.degrees(180)
  /// A quarter turn: the downward chevron turned toward the start or the end.
  static let quarterTurn = Angle.degrees(90)

  let kind: Kind
  var size: CGFloat? = nil

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.tanreiIconContext) private var context

  var body: some View {
    let side = size ?? context?.size ?? theme.system.measure.iconMedium
    let iconContext = TanreiIconContext(size: side, selected: false)
    let stroke = StrokeStyle(lineWidth: theme.system.measure.borderThick, lineCap: .square, lineJoin: .miter)
    Group {
      if theme.system.icon.slotFont(iconContext, policy: theme.fontFamilyPolicy) != nil {
        TanreiIconGlyph(kind.rawValue)
      } else {
        switch kind {
        case .expandMore:
          TanreiSplitButtonChevronShape().stroke(style: stroke)
        case .chevronLeft:
          TanreiSplitButtonChevronShape().stroke(style: stroke).rotationEffect(Self.quarterTurn)
        case .chevronRight:
          TanreiSplitButtonChevronShape().stroke(style: stroke).rotationEffect(-Self.quarterTurn)
        case .keyboard:
          TanreiDatePickerKeyboardShape().stroke(style: stroke)
        case .calendar:
          TanreiDatePickerCalendarShape().stroke(style: stroke)
        }
      }
    }
    .frame(width: side, height: side)
    .tanreiIconContext(size: side, selected: false)
    .environment(\.layoutDirection, .leftToRight)
    .accessibilityHidden(true)
  }
}

/// The icon set's `keyboard` in fractions of its box: a key well and three rows of keys (the shape of a glyph, not a design
/// value).
struct TanreiDatePickerKeyboardShape: Shape {
  static let inset: CGFloat = 0.12
  static let top: CGFloat = 0.26
  static let bottom: CGFloat = 0.74
  static let keyRows: [CGFloat] = [0.43]
  static let keyColumns: [CGFloat] = [0.3, 0.43, 0.57, 0.7]
  static let space: (from: CGFloat, to: CGFloat, y: CGFloat) = (0.34, 0.66, 0.59)
  static let key: CGFloat = 0.01

  func path(in rect: CGRect) -> Path {
    func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: rect.minX + x * rect.width, y: rect.minY + y * rect.height) }
    var path = Path()
    path.addRect(CGRect(origin: point(Self.inset, Self.top), size: CGSize(width: (1 - 2 * Self.inset) * rect.width, height: (Self.bottom - Self.top) * rect.height)))
    for y in Self.keyRows {
      for x in Self.keyColumns {
        path.move(to: point(x - Self.key, y))
        path.addLine(to: point(x + Self.key, y))
      }
    }
    path.move(to: point(Self.space.from, Self.space.y))
    path.addLine(to: point(Self.space.to, Self.space.y))
    return path
  }
}

/// The icon set's `calendar_month` in fractions of its box: the page, its top bar, its two rings and a grid of days (the
/// shape of a glyph, not a design value).
struct TanreiDatePickerCalendarShape: Shape {
  static let inset: CGFloat = 0.16
  static let top: CGFloat = 0.22
  static let bottom: CGFloat = 0.84
  static let bar: CGFloat = 0.4
  static let rings: [CGFloat] = [0.34, 0.66]
  static let ringTop: CGFloat = 0.12
  static let dayRows: [CGFloat] = [0.54, 0.7]
  static let dayColumns: [CGFloat] = [0.34, 0.5, 0.66]
  static let dot: CGFloat = 0.02

  func path(in rect: CGRect) -> Path {
    func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: rect.minX + x * rect.width, y: rect.minY + y * rect.height) }
    var path = Path()
    path.addRect(CGRect(origin: point(Self.inset, Self.top), size: CGSize(width: (1 - 2 * Self.inset) * rect.width, height: (Self.bottom - Self.top) * rect.height)))
    path.move(to: point(Self.inset, Self.bar))
    path.addLine(to: point(1 - Self.inset, Self.bar))
    for x in Self.rings {
      path.move(to: point(x, Self.ringTop))
      path.addLine(to: point(x, Self.top))
    }
    for y in Self.dayRows {
      for x in Self.dayColumns {
        path.move(to: point(x - Self.dot, y))
        path.addLine(to: point(x + Self.dot, y))
      }
    }
    return path
  }
}
