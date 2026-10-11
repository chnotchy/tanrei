import SwiftUI
import os

// Spec: specs/time-picker.spec.json — tokens: TanreiTimePickerTokens (comp.time-picker), read from the design system in the
// environment (`system.timePicker`). Every design value in this file comes from a token; there are no literals, and no state's
// look is computed here. The controls the picker places are whole Tanrei components with their own tokens: the
// entry-mode toggle is a `TanreiIconButton` (standard, medium), Cancel and OK are `TanreiButton`s (text,
// medium) and the text-entry fields are `TanreiTextField`s (outlined, large, number).
//
// A modal overlay, as the dialog: on iOS a `.fullScreenCover` on a clear presentation background with the system
// transition off — Tanrei draws the scrim and the motion; the rest of the app is inert and keyboard focus stays in —; on macOS
// drawn over the view the modifier is attached to, which is inert meanwhile. It counts itself in `TanreiModalCoordinator`.
//
// A time of day is `DateComponents` with an hour and a minute at the API, `TanreiTime` inside. Every name, digit and time form
// comes from Foundation for the picker's locale (`DateFormatter` templates `hm`, `Hm` and `j`, its period symbols,
// `NumberFormatter`'s digits) — never from a list of locales. The selectors and the period segments are SwiftUI `Button`s drawn
// with Button's chain (press and hold, pressed feedback and ripple, keyboard focus ring, container, corner smoothing) from
// `conditions[condition][state:]`. The dial's numbers are the scale of one control, not items.

// MARK: - Public types

/// TMP-6 — the clock: hours 1 to 12 with a period (`h12`), 00 to 23 (`h23`), or the locale's preferred clock (`locale`, the
/// default) — where the person chose 12- or 24-hour time for the whole device, that choice. A closed set:
/// `TanreiTimePickerHourCycle(named:)` reads a spec value from data; an unknown one is `.locale`, reported in debug builds (TMP-29).
public enum TanreiTimePickerHourCycle: String, CaseIterable, Sendable {
  case locale, h12, h23

  public init(named name: String) { self = TanreiTimePickerNames.read(name, prop: "hourCycle", fallback: .locale) }
}

/// TMP-24 — how the picker opens: on the clock dial (the default) or with text fields. A closed set; an unknown name is
/// `.dial`, reported in debug builds (TMP-29).
public enum TanreiTimePickerEntryMode: String, CaseIterable, Sendable {
  case dial, text

  public init(named name: String) { self = TanreiTimePickerNames.read(name, prop: "entryMode", fallback: .dial) }
}

/// TMP-2 — the unit the dial shows, and the selector that takes focus, when the picker opens. A closed set; an unknown name
/// is `.hour`, reported in debug builds (TMP-29).
public enum TanreiTimePickerUnit: String, CaseIterable, Sendable {
  case hour, minute

  public init(named name: String) { self = TanreiTimePickerNames.read(name, prop: "unit", fallback: .hour) }
}

/// TMP-7 — the time above the dial (`vertical`), the time and the actions beside it (`horizontal`, for a short window), or
/// horizontal only when the window is too short for vertical and wide enough for horizontal (`auto`, the default). A closed
/// set; an unknown name is `.auto`, reported in debug builds (TMP-29).
public enum TanreiTimePickerLayout: String, CaseIterable, Sendable {
  case auto, vertical, horizontal

  public init(named name: String) { self = TanreiTimePickerNames.read(name, prop: "layout", fallback: .auto) }
}

/// TMP-4 — why the picker closed (the spec's `close` event): Escape, the accessibility escape gesture (the platform's back),
/// a press on the scrim, Cancel, or OK after the change it committed (if any).
public enum TanreiTimePickerCloseReason: String, CaseIterable, Sendable {
  case escape, back, outside, cancel, confirm
}

/// Every word the picker shows or announces that is not locale data (TMP-27), with the spec's English defaults. The field
/// names are the spec's props; a product in another language sets them.
public struct TanreiTimePickerLabels: Equatable, Sendable {
  /// Names the picker: its surface's accessible name and the line at its top.
  public var label: String
  /// The hour selector's name and the hour field's label.
  public var hourLabel: String
  /// The minute selector's name and the minute field's label.
  public var minuteLabel: String
  /// OK's label.
  public var confirmLabel: String
  /// Cancel's label.
  public var cancelLabel: String
  /// The entry-mode toggle's name while the dial is shown.
  public var textEntryLabel: String
  /// The entry-mode toggle's name while text entry is shown.
  public var dialEntryLabel: String
  /// A field's error when its text is not a number of its unit.
  public var invalidText: String

  public init(
    label: String = "Select time", hourLabel: String = "Hour", minuteLabel: String = "Minute", confirmLabel: String = "OK",
    cancelLabel: String = "Cancel", textEntryLabel: String = "Switch to text entry", dialEntryLabel: String = "Switch to clock",
    invalidText: String = "Enter a valid time"
  ) {
    self.label = label
    self.hourLabel = hourLabel
    self.minuteLabel = minuteLabel
    self.confirmLabel = confirmLabel
    self.cancelLabel = cancelLabel
    self.textEntryLabel = textEntryLabel
    self.dialEntryLabel = dialEntryLabel
    self.invalidText = invalidText
  }
}

/// TMP-29: a closed enum read from a spec name; an unknown name is the default, reported in debug builds.
enum TanreiTimePickerNames {
  static func read<Value: RawRepresentable & CaseIterable>(_ name: String, prop: String, fallback: Value) -> Value where Value.RawValue == String {
    if let value = Value(rawValue: name) { return value }
    TanreiDiagnostics.report("Tanrei: a time picker has no \(prop) \"\(name)\"; it behaves as \"\(fallback.rawValue)\" (TMP-29).")
    return fallback
  }
}

extension View {
  /// Presents a Tanrei time picker while `isPresented` is true, as `.sheet` is: a person chooses a time of day on a clock dial
  /// or by typing it, and commits it with OK (specs/time-picker.spec.json).
  ///
  ///     @State private var picksTime = false
  ///     @State private var alarm: DateComponents? = DateComponents(hour: 7, minute: 30)
  ///     TanreiButton("Set alarm") { picksTime = true }
  ///       .tanreiTimePicker(isPresented: $picksTime, selection: $alarm)
  ///
  /// - Parameters:
  ///   - isPresented: the spec's `open`. The picker writes `false` to it itself when it closes, after `onClose` (TMP-4).
  ///   - selection: the spec's `value` — an hour (0 to 23) and a minute; `nil` for none (the picker then starts from the
  ///     device's current time, TMP-5). Writing it is the spec's `change`: OK writes the pending time when it differs from
  ///     `selection` as it is then, or when there is none. A value that is not a time of day is `nil`, reported in debug
  ///     builds (TMP-29). A value written while the picker is open does not change the pending time, and OK compares with it.
  ///   - hourCycle: `.locale` (default), `.h12` or `.h23`. `selection` is 24-hour in every cycle (TMP-6).
  ///   - entryMode: the dial (default) or text entry, when the picker opens (TMP-24).
  ///   - unit: the unit the dial shows, and the selector that takes focus, when it opens (TMP-2).
  ///   - layout: `.auto` (default), `.vertical` or `.horizontal` (TMP-7).
  ///   - locale: the periods' names, the digits, the separator and the preferred clock (TMP-27); `nil` takes the `\.locale`
  ///     environment.
  ///   - labels: every word the picker shows or announces, its name `label` among them, with English defaults.
  ///   - onClose: the spec's `close`, with its reason — called once, after `selection` is written when both happen.
  public func tanreiTimePicker(
    isPresented: Binding<Bool>, selection: Binding<DateComponents?>, hourCycle: TanreiTimePickerHourCycle = .locale,
    entryMode: TanreiTimePickerEntryMode = .dial, unit: TanreiTimePickerUnit = .hour, layout: TanreiTimePickerLayout = .auto,
    locale: Locale? = nil, labels: TanreiTimePickerLabels = TanreiTimePickerLabels(),
    onClose: (@MainActor (TanreiTimePickerCloseReason) -> Void)? = nil
  ) -> some View {
    modifier(
      TanreiTimePickerPresenter(
        isPresented: isPresented, selection: selection,
        options: TanreiTimePickerOptions(hourCycle: hourCycle, entryMode: entryMode, unit: unit, layout: layout, locale: locale, labels: labels),
        onClose: onClose))
  }
}

// MARK: - Times

/// A time of day: an hour (0 to 23) and a minute (0 to 59), with no date, no seconds and no time zone. Ordered by time;
/// `description` is its 24-hour form, "HH:MM", as an HTML time input holds it.
struct TanreiTime: Hashable, Comparable, Sendable, CustomStringConvertible {
  static let hoursPerDay = 24
  static let hoursPerHalfDay = 12
  static let minutesPerHour = 60

  let hour: Int
  let minute: Int

  /// The time `hour`:`minute`, or `nil` when it does not exist (hour 24, minute 60).
  init?(hour: Int, minute: Int) {
    guard (0..<Self.hoursPerDay).contains(hour), (0..<Self.minutesPerHour).contains(minute) else { return nil }
    self.hour = hour
    self.minute = minute
  }

  /// TMP-29: the time a `DateComponents` holds — its hour and minute, both present and in range; `nil` otherwise.
  init?(_ components: DateComponents) {
    guard let hour = components.hour, let minute = components.minute else { return nil }
    self.init(hour: hour, minute: minute)
  }

  static func < (a: TanreiTime, b: TanreiTime) -> Bool { (a.hour, a.minute) < (b.hour, b.minute) }

  var description: String { String(format: "%02d:%02d", hour, minute) }

  /// The time at the API: an hour and a minute, nothing else.
  var components: DateComponents { DateComponents(hour: hour, minute: minute) }

  /// 0 before noon, 1 after.
  var period: Int { hour >= Self.hoursPerHalfDay ? 1 : 0 }

  /// The hour of the 12-hour clock, 1 to 12.
  var hour12: Int { (hour + Self.hoursPerHalfDay - 1) % Self.hoursPerHalfDay + 1 }

  /// The 24-hour hour of `shown` (1 to 12) in `period` (0 before noon, 1 after).
  static func hour(twelve shown: Int, period: Int) -> Int { shown % hoursPerHalfDay + hoursPerHalfDay * period }

  /// TMP-5: the device's current local time, to the minute.
  static func now(calendar: Calendar = .current, at date: Date = Date()) -> TanreiTime {
    let parts = calendar.dateComponents([.hour, .minute], from: date)
    return TanreiTime(hour: parts.hour ?? .zero, minute: parts.minute ?? .zero) ?? TanreiTime(hour: .zero, minute: .zero)!
  }
}

// MARK: - Locale data (TMP-6, TMP-9, TMP-10, TMP-27)

/// The locale's time forms for the picker: the names of the periods ("AM", "PM"; "午前", "午後"), its digits, the separator
/// between hours and minutes, how many digits it writes an hour with, where its 12-hour pattern writes the period (TMP-10) and
/// its preferred clock (TMP-6) — read from `DateFormatter`'s patterns for the skeletons `hm`, `Hm` and `j` and its symbols,
/// never from a list of locales.
struct TanreiTimePickerLocale: Equatable, Sendable {
  /// The names of the periods, before and after noon.
  let periodNames: [String]
  /// TMP-10: the locale's 12-hour pattern writes the period before the hour ("aK:mm" in ja), not after the minutes ("h:mm a").
  let periodBefore: Bool
  /// TMP-6: the locale's preferred clock is 12-hour (it counts 1 to 12, or 0 to 11).
  let localeTwelve: Bool
  /// TMP-9: the literal between the hour and the minute of the 24-hour pattern (":" in most locales, "." in Finnish).
  let separator: String
  /// TMP-9: the digits of an hour in the 12-hour and the 24-hour pattern ("h" 1, "HH" 2).
  let hourDigits12: Int
  let hourDigits24: Int
  /// The locale's ten digits, 0 to 9.
  let digits: [Character]

  private static let hourFields: Set<Character> = ["h", "H", "k", "K"]
  private static let periodFields: Set<Character> = ["a", "b", "B"]
  private static let asciiDigits = Array("0123456789")
  /// A pattern's separator when it has none between the hour and the minute: the one most locales write.
  private static let commonSeparator = ":"

  init(_ locale: Locale) {
    let twelve = Self.fields(Self.pattern("hm", locale))
    let twentyFour = Self.fields(Self.pattern("Hm", locale))
    let preferred = Self.fields(Self.pattern("j", locale))
    let symbols = DateFormatter()
    symbols.locale = locale
    periodNames = [symbols.amSymbol, symbols.pmSymbol]
    let period = twelve.firstIndex { $0.isField && Self.periodFields.contains($0.letter) }
    let hour = twelve.firstIndex { $0.isField && Self.hourFields.contains($0.letter) }
    periodBefore = period.flatMap { period in hour.map { period < $0 } } ?? false
    localeTwelve = Self.isTwelve(preferred) ?? true
    let hour24 = twentyFour.firstIndex { $0.isField && Self.hourFields.contains($0.letter) }
    let minute24 = twentyFour.firstIndex { $0.isField && $0.letter == "m" }
    if let hour24, let minute24, minute24 > hour24 {
      let literal = twentyFour[(hour24 + 1)..<minute24].filter { !$0.isField }.map(\.text).joined().trimmingCharacters(in: .whitespaces)
      separator = literal.isEmpty ? Self.commonSeparator : literal
    } else {
      separator = Self.commonSeparator
    }
    hourDigits12 = Self.hourDigits(twelve)
    hourDigits24 = Self.hourDigits(twentyFour)
    let numbers = NumberFormatter()
    numbers.locale = locale
    numbers.usesGroupingSeparator = false
    digits = (0...9).map { digit in numbers.string(from: NSNumber(value: digit))?.first ?? Self.asciiDigits[digit] }
  }

  /// The locale's data, read once per locale identifier.
  static func shared(_ locale: Locale) -> TanreiTimePickerLocale {
    let key = locale.identifier
    if let cached = cache.withLock({ $0[key] }) { return cached }
    let made = TanreiTimePickerLocale(locale)
    cache.withLock { $0[key] = made }
    return made
  }

  private static let cache = OSAllocatedUnfairLock(initialState: [String: TanreiTimePickerLocale]())

  /// `value` in the locale's digits, at least `minimum` of them.
  func number(_ value: Int, digits minimum: Int = 1) -> String {
    let ascii = String(value)
    let padded = String(repeating: "0", count: max(.zero, minimum - ascii.count)) + ascii
    return String(padded.map { character in character.wholeNumberValue.map { digits[$0] } ?? character })
  }

  /// TMP-9: a 24-hour `hour` as the locale writes an hour of the clock in use ("7" in en-US with h12, "07" with h23).
  func hourText(_ hour: Int, twelve: Bool) -> String {
    twelve ? number((hour + TanreiTime.hoursPerHalfDay - 1) % TanreiTime.hoursPerHalfDay + 1, digits: hourDigits12) : number(hour, digits: hourDigits24)
  }

  /// TMP-9: a minute, with two digits.
  func minuteText(_ minute: Int) -> String { number(minute, digits: 2) }

  /// TMP-23: `text` as a whole number — ASCII or the locale's digits (any decimal digit), nothing else, surrounding spaces
  /// aside; `nil` otherwise.
  static func wholeNumber(_ text: String) -> Int? {
    let trimmed = text.trimmingCharacters(in: .whitespaces)
    guard !trimmed.isEmpty, trimmed.count <= TanreiTimePickerRules.fieldMaxLength else { return nil }
    var value = 0
    for character in trimmed {
      guard character.isNumber, let digit = character.wholeNumberValue, (0...9).contains(digit) else { return nil }
      value = value * 10 + digit
    }
    return value
  }

  /// TMP-6: the clock the person chose for the whole device, `true` for 12-hour; `nil` where none is reported. Foundation's
  /// current locale carries the person's 12/24-hour setting (`DateFormatter.dateFormat(fromTemplate: "j", …)` reflects it):
  /// for a picker that uses the current locale that is the answer; for another locale, only a setting that differs from the
  /// current locale's own default is a choice the person made.
  static func deviceTwelve(usesCurrentLocale: Bool) -> Bool? {
    let current = Locale.current
    let chosen = isTwelve(fields(pattern("j", current)))
    if usesCurrentLocale { return chosen }
    let plain = isTwelve(fields(pattern("j", Locale(identifier: current.identifier))))
    return chosen != plain ? chosen : nil
  }

  // MARK: Patterns

  /// A part of a date pattern: a field ("h", "mm", "a") or literal text.
  struct Part: Equatable, Sendable {
    let text: String
    let isField: Bool
    var letter: Character { text.first ?? " " }
  }

  static func pattern(_ template: String, _ locale: Locale) -> String {
    DateFormatter.dateFormat(fromTemplate: template, options: 0, locale: locale) ?? ""
  }

  /// A date pattern's fields (runs of one letter) and literals (quoted text and everything else).
  static func fields(_ pattern: String) -> [Part] {
    var parts: [Part] = []
    var literal = ""
    func flush() {
      if !literal.isEmpty { parts.append(Part(text: literal, isField: false)) }
      literal = ""
    }
    let characters = Array(pattern)
    var index = 0
    while index < characters.count {
      let character = characters[index]
      if character == "'" {
        let close = characters[(index + 1)...].firstIndex(of: "'") ?? characters.count
        literal += close == index + 1 ? "'" : String(characters[(index + 1)..<close])
        index = close + 1
      } else if character.isLetter && character.isASCII {
        flush()
        var end = index
        while end < characters.count && characters[end] == character { end += 1 }
        parts.append(Part(text: String(characters[index..<end]), isField: true))
        index = end
      } else {
        literal.append(character)
        index += 1
      }
    }
    flush()
    return parts
  }

  /// TMP-6: whether a pattern's hour counts 1 to 12 or 0 to 11 (`h`, `K`); `nil` when it has no hour.
  static func isTwelve(_ parts: [Part]) -> Bool? {
    parts.first { $0.isField && hourFields.contains($0.letter) }.map { $0.letter == "h" || $0.letter == "K" }
  }

  private static func hourDigits(_ parts: [Part]) -> Int {
    min(max(parts.first { $0.isField && hourFields.contains($0.letter) }?.text.count ?? 1, 1), 2)
  }
}

// MARK: - Rules (pure)

/// A key a selector answers (TMP-16).
enum TanreiTimePickerKey: Sendable, CaseIterable {
  case up, down, left, right, pageUp, pageDown, home, end

  init?(_ key: KeyEquivalent) {
    switch key {
    case .upArrow: self = .up
    case .downArrow: self = .down
    case .leftArrow: self = .left
    case .rightArrow: self = .right
    case .pageUp: self = .pageUp
    case .pageDown: self = .pageDown
    case .home: self = .home
    case .end: self = .end
    default: return nil
    }
  }

  static let equivalents: Set<KeyEquivalent> = [.upArrow, .downArrow, .leftArrow, .rightArrow, .pageUp, .pageDown, .home, .end]
}

/// The picker's rules, pure: they are tested without a view. The numbers here are the clock's, not design values.
enum TanreiTimePickerRules {
  static let fullTurn: Double = 360
  static let halfTurn: Double = 180
  static let degreesPerHour: Double = 30
  static let degreesPerMinute: Double = 6
  /// TMP-16: Page Up and Page Down move the minute by five; the minute dial shows every fifth minute (TMP-12).
  static let minutePage = 5
  /// TMP-23: a field holds at most two characters.
  static let fieldMaxLength = 2

  /// TMP-6: whether the 12-hour clock is used — `h12` and `h23` say so; `locale` takes the device's choice where it is
  /// reported (`device`, `true` for 12-hour) over the locale's preferred clock.
  static func twelve(hourCycle: TanreiTimePickerHourCycle, device: Bool?, localeTwelve: Bool) -> Bool {
    switch hourCycle {
    case .h12: return true
    case .h23: return false
    case .locale: return device ?? localeTwelve
    }
  }

  /// TMP-16: `time` with `unit` `delta` later (earlier when negative), wrapping from the last value to the first and back
  /// without changing the other unit or the period (12 to 1 and 23 to 00 for hours, 59 to 00 for minutes).
  static func step(_ time: TanreiTime, _ unit: TanreiTimePickerUnit, by delta: Int, twelve: Bool) -> TanreiTime {
    func wrap(_ value: Int, _ count: Int) -> Int { ((value % count) + count) % count }
    switch unit {
    case .minute:
      return TanreiTime(hour: time.hour, minute: wrap(time.minute + delta, TanreiTime.minutesPerHour))!
    case .hour where twelve:
      let shown = wrap(time.hour12 - 1 + delta, TanreiTime.hoursPerHalfDay) + 1
      return TanreiTime(hour: TanreiTime.hour(twelve: shown, period: time.period), minute: time.minute)!
    case .hour:
      return TanreiTime(hour: wrap(time.hour + delta, TanreiTime.hoursPerDay), minute: time.minute)!
    }
  }

  /// TMP-16: where a key moves a selector's value (`nil`: the key does nothing there) — Up and Right one later, Down and Left
  /// one earlier, Page Up and Page Down five minutes (the minute selector only), Home and End the first and last value of the
  /// unit (1 and 12 in the same period, 00 and 23, 00 and 59).
  static func target(of key: TanreiTimePickerKey, _ unit: TanreiTimePickerUnit, _ time: TanreiTime, twelve: Bool) -> TanreiTime? {
    let isMinute = unit == .minute
    switch key {
    case .up, .right: return step(time, unit, by: 1, twelve: twelve)
    case .down, .left: return step(time, unit, by: -1, twelve: twelve)
    case .pageUp: return isMinute ? step(time, unit, by: minutePage, twelve: twelve) : nil
    case .pageDown: return isMinute ? step(time, unit, by: -minutePage, twelve: twelve) : nil
    case .home:
      if isMinute { return TanreiTime(hour: time.hour, minute: .zero) }
      return TanreiTime(hour: twelve ? TanreiTime.hour(twelve: 1, period: time.period) : .zero, minute: time.minute)
    case .end:
      if isMinute { return TanreiTime(hour: time.hour, minute: TanreiTime.minutesPerHour - 1) }
      return TanreiTime(
        hour: twelve ? TanreiTime.hour(twelve: TanreiTime.hoursPerHalfDay, period: time.period) : TanreiTime.hoursPerDay - 1, minute: time.minute)
    }
  }

  /// TMP-14: the value nearest a pointer at (`dx`, `dy`) from the dial's centre — by its angle clockwise from the top; on the
  /// hour dial of the 24-hour clock on the ring (`outer` or `inner` radius) nearer the pointer's distance; any minute on the
  /// minute dial. `time` keeps the other unit and, on the 12-hour clock, the period.
  static func dialValue(
    dx: CGFloat, dy: CGFloat, unit: TanreiTimePickerUnit, time: TanreiTime, twelve: Bool, outer: CGFloat, inner: CGFloat
  ) -> TanreiTime {
    let degrees = (atan2(Double(dx), Double(-dy)) * halfTurn / .pi + fullTurn).truncatingRemainder(dividingBy: fullTurn)
    if unit == .minute {
      return TanreiTime(hour: time.hour, minute: Int((degrees / degreesPerMinute).rounded()) % TanreiTime.minutesPerHour)!
    }
    let index = Int((degrees / degreesPerHour).rounded()) % TanreiTime.hoursPerHalfDay
    if twelve {
      return TanreiTime(hour: TanreiTime.hour(twelve: index == .zero ? TanreiTime.hoursPerHalfDay : index, period: time.period), minute: time.minute)!
    }
    let distance = (dx * dx + dy * dy).squareRoot()
    let onInner = abs(distance - inner) < abs(distance - outer)
    return TanreiTime(hour: onInner ? index + TanreiTime.hoursPerHalfDay : index, minute: time.minute)!
  }

  /// TMP-12 / TMP-13: where a value lies on the dial — its angle in degrees clockwise from the top, and whether it is on the
  /// inner ring (12 to 23 on the 24-hour clock); a minute at six degrees a minute.
  static func dialPosition(_ unit: TanreiTimePickerUnit, _ time: TanreiTime, twelve: Bool) -> (degrees: Double, inner: Bool) {
    switch unit {
    case .minute: return (Double(time.minute) * degreesPerMinute, false)
    case .hour: return (Double(time.hour % TanreiTime.hoursPerHalfDay) * degreesPerHour, !twelve && time.hour >= TanreiTime.hoursPerHalfDay)
    }
  }

  /// TMP-15: the handle's next angle, unwrapped, so that it travels the shorter arc from `current` to `target` (degrees).
  static func turn(from current: Double, to target: Double) -> Double {
    var delta = (target - current).truncatingRemainder(dividingBy: fullTurn)
    if delta > halfTurn { delta -= fullTurn }
    if delta <= -halfTurn { delta += fullTurn }
    return current + delta
  }

  /// One number on the dial (TMP-12).
  struct DialNumber: Equatable, Sendable {
    let value: Int
    let degrees: Double
    let inner: Bool
    /// The digits it is written with at least.
    let digits: Int
  }

  /// TMP-12: the numbers of a unit's dial, clockwise from the top — 12, 1 … 11 (12-hour); 00 … 11 outside and 12 … 23 on an
  /// inner ring (24-hour, two digits); 00, 05 … 55 (minutes).
  static func numbers(_ unit: TanreiTimePickerUnit, twelve: Bool) -> [DialNumber] {
    let positions = 0..<TanreiTime.hoursPerHalfDay
    switch unit {
    case .minute:
      return positions.map { DialNumber(value: $0 * minutePage, degrees: Double($0) * degreesPerHour, inner: false, digits: 2) }
    case .hour where twelve:
      return positions.map { DialNumber(value: $0 == .zero ? TanreiTime.hoursPerHalfDay : $0, degrees: Double($0) * degreesPerHour, inner: false, digits: 1) }
    case .hour:
      return positions.map { DialNumber(value: $0, degrees: Double($0) * degreesPerHour, inner: false, digits: 2) }
        + positions.map { DialNumber(value: $0 + TanreiTime.hoursPerHalfDay, degrees: Double($0) * degreesPerHour, inner: true, digits: 2) }
    }
  }

  /// TMP-23: a field's text as a number of its unit — 1 to 12 (12-hour hours), 0 to 23 (24-hour hours), 0 to 59 (minutes) —;
  /// `nil` for anything else, empty included.
  static func fieldNumber(_ unit: TanreiTimePickerUnit, _ text: String, twelve: Bool) -> Int? {
    guard let number = TanreiTimePickerLocale.wholeNumber(text) else { return nil }
    let range: ClosedRange<Int>
    switch unit {
    case .minute: range = 0...(TanreiTime.minutesPerHour - 1)
    case .hour where twelve: range = 1...TanreiTime.hoursPerHalfDay
    case .hour: range = 0...(TanreiTime.hoursPerDay - 1)
    }
    return range.contains(number) ? number : nil
  }

  /// TMP-4: close once, with its reason — `onClose`, then `false` written to the binding; nothing while it is already closed.
  @MainActor
  static func close(
    _ isPresented: Binding<Bool>, reason: TanreiTimePickerCloseReason, onClose: (@MainActor (TanreiTimePickerCloseReason) -> Void)?
  ) {
    guard isPresented.wrappedValue else { return }
    onClose?(reason)
    isPresented.wrappedValue = false
  }

  /// TMP-8: the least height the part between the label and the actions keeps before everything scrolls together — one row of
  /// selectors, at least the target.
  static func minimumMiddle(tokens: TanreiTimePickerTokens, target: CGFloat) -> CGFloat {
    max(tokens.selectorContainerHeight, target)
  }
}

// MARK: - Configuration and model

/// Everything a picker is given besides its binding and its value.
struct TanreiTimePickerOptions: Equatable {
  var hourCycle: TanreiTimePickerHourCycle = .locale
  var entryMode: TanreiTimePickerEntryMode = .dial
  var unit: TanreiTimePickerUnit = .hour
  var layout: TanreiTimePickerLayout = .auto
  var locale: Locale?
  var labels = TanreiTimePickerLabels()
}

/// What the picker reads from its props when it opens (TMP-5, TMP-6, TMP-27, TMP-29).
struct TanreiTimePickerConfiguration: Equatable {
  /// TMP-6: the 12-hour clock is in use.
  let twelve: Bool
  let entryMode: TanreiTimePickerEntryMode
  let unit: TanreiTimePickerUnit
  let layout: TanreiTimePickerLayout
  let text: TanreiTimePickerLocale
  /// The committed time it opened with; `nil` for none (or a value that is not a time of day).
  let committed: TanreiTime?
  let labels: TanreiTimePickerLabels
  /// TMP-29: what a debug build reports.
  let problems: [String]

  /// - Parameters:
  ///   - environmentLocale: the `\.locale` environment, used while `options.locale` is `nil` (TMP-27).
  ///   - device: the device's 12/24-hour choice (TMP-6); by default read from Foundation.
  init(_ options: TanreiTimePickerOptions, selection: DateComponents?, environmentLocale: Locale, device: Bool?? = nil) {
    let locale = options.locale ?? environmentLocale
    text = TanreiTimePickerLocale.shared(locale)
    let usesCurrent = options.locale == nil && environmentLocale.identifier == Locale.current.identifier
    let device = device ?? (options.hourCycle == .locale ? TanreiTimePickerLocale.deviceTwelve(usesCurrentLocale: usesCurrent) : nil)
    twelve = TanreiTimePickerRules.twelve(hourCycle: options.hourCycle, device: device, localeTwelve: text.localeTwelve)
    entryMode = options.entryMode
    unit = options.unit
    layout = options.layout
    labels = options.labels
    var problems: [String] = []
    if let selection {
      committed = TanreiTime(selection)
      if committed == nil {
        problems.append("a time picker's selection \(selection) is not a time of day (an hour 0 to 23 and a minute 0 to 59); it is treated as empty (TMP-29)")
      }
    } else {
      committed = nil
    }
    if options.labels.label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      problems.append("a time picker's label is empty, so it has no accessible name (TMP-29)")
    }
    self.problems = problems
  }

  func report() {
    problems.forEach { TanreiDiagnostics.report("Tanrei: \($0)") }
  }
}

/// One opening of the picker (TMP-5): its pending time, the unit the dial shows, the entry shown, the fields' texts and errors,
/// and where the handle is drawn. Created when the picker opens, so a value the product writes while it is open does not change
/// the pending time; OK compares with the value as it is then (TMP-5).
struct TanreiTimePickerModel: Equatable {
  let twelve: Bool
  let text: TanreiTimePickerLocale
  private(set) var pending: TanreiTime
  private(set) var unit: TanreiTimePickerUnit
  private(set) var entry: TanreiTimePickerEntryMode
  /// TMP-23: the hour field's and the minute field's texts, and whether each is in error.
  private(set) var texts: [String]
  private(set) var errors: [Bool]
  /// TMP-14: a press or a drag is on the dial — the handle follows it without animation.
  private(set) var dragging = false
  /// TMP-15: the handle's angle, unwrapped, so that a change travels the shorter arc.
  private(set) var handleAngle: Double

  init(configuration: TanreiTimePickerConfiguration, now: TanreiTime) {
    twelve = configuration.twelve
    text = configuration.text
    let pending = configuration.committed ?? now
    self.pending = pending
    unit = configuration.unit
    entry = configuration.entryMode
    texts = [configuration.text.hourText(pending.hour, twelve: configuration.twelve), configuration.text.minuteText(pending.minute)]
    errors = [false, false]
    handleAngle = TanreiTimePickerRules.dialPosition(configuration.unit, pending, twelve: configuration.twelve).degrees
  }

  /// TMP-2: where focus moves when the picker opens — the selector of unit while the dial is shown, the hour field in text
  /// entry.
  var openingFocus: TanreiTimePickerFocus { entry == .text ? .field(0) : .selector(unit) }

  /// TMP-13: where the handle is — the pending value of the unit the dial shows.
  var handle: (degrees: Double, inner: Bool) { TanreiTimePickerRules.dialPosition(unit, pending, twelve: twelve) }

  /// TMP-10: the pending period, 0 before noon.
  var period: Int { pending.period }

  /// TMP-9: a selector's text as drawn.
  func shown(_ unit: TanreiTimePickerUnit) -> String {
    unit == .hour ? text.hourText(pending.hour, twelve: twelve) : text.minuteText(pending.minute)
  }

  /// TMP-26: a selector's value as read — its text, the period's name added to the hour's on the 12-hour clock, where the
  /// locale writes it.
  func spokenValue(_ unit: TanreiTimePickerUnit) -> String {
    let shown = self.shown(unit)
    guard unit == .hour, twelve else { return shown }
    let name = text.periodNames[period]
    return text.periodBefore ? "\(name) \(shown)" : "\(shown) \(name)"
  }

  /// TMP-23: OK is enabled — always on the dial; in text entry while both fields hold a number of their unit (TMP-5).
  var canConfirm: Bool {
    entry == .dial
      || (TanreiTimePickerRules.fieldNumber(.hour, texts[0], twelve: twelve) != nil
        && TanreiTimePickerRules.fieldNumber(.minute, texts[1], twelve: twelve) != nil)
  }

  /// TMP-5: what OK writes — the pending time when it differs from `value`, the committed time as it is when OK is activated
  /// (one the product wrote while the picker was open included), or there is none.
  func change(from value: TanreiTime?) -> TanreiTime? { pending != value ? pending : nil }

  /// The pending time from a key, an action of assistive technology, the dial or the entry toggle: the fields hold it (TMP-23)
  /// and are no longer in error.
  mutating func set(_ time: TanreiTime) {
    pending = time
    texts = [text.hourText(time.hour, twelve: twelve), text.minuteText(time.minute)]
    errors = [false, false]
    turnHandle()
  }

  /// TMP-16, TMP-14: the dial shows `unit`, and its selector is drawn as selected.
  mutating func show(_ unit: TanreiTimePickerUnit) {
    guard self.unit != unit else { return }
    self.unit = unit
    turnHandle()
  }

  /// TMP-11: a period keeps the hour's number (7 before noon becomes 7 after noon, 19:00).
  mutating func choosePeriod(_ period: Int) {
    guard pending.period != period else { return }
    pending = TanreiTime(hour: TanreiTime.hour(twelve: pending.hour12, period: period), minute: pending.minute)!
    turnHandle()
  }

  /// TMP-16: a key on a selector; `false` when the key does nothing there.
  mutating func press(_ key: TanreiTimePickerKey, on unit: TanreiTimePickerUnit) -> Bool {
    guard let target = TanreiTimePickerRules.target(of: key, unit, pending, twelve: twelve) else { return false }
    set(target)
    return true
  }

  /// TMP-16: assistive technology's increment and decrement — what Up Arrow and Down Arrow do.
  mutating func adjust(_ unit: TanreiTimePickerUnit, increment: Bool) {
    _ = press(increment ? .up : .down, on: unit)
  }

  /// TMP-14: a press or a drag on the dial sets the value under it, at once.
  mutating func dialSet(_ time: TanreiTime) {
    dragging = true
    if time != pending { set(time) }
  }

  /// TMP-14: a press or a drag on the dial ends — on the hour dial the minute dial follows. `true` when it moved on to minutes.
  mutating func dialReleased() -> Bool {
    dragging = false
    guard unit == .hour else { return false }
    show(.minute)
    return true
  }

  /// TMP-24: switch between the dial and text entry, keeping the pending time; the dial comes back on hours.
  mutating func toggleEntry() {
    entry = entry == .dial ? .text : .dial
    unit = .hour
    set(pending)
  }

  /// TMP-23: an edit of a field — typing never reformats; a number of the field's unit becomes the pending hour or minute; the
  /// edit clears the field's error.
  mutating func edit(_ index: Int, text value: String) {
    texts[index] = value
    errors[index] = false
    let fieldUnit: TanreiTimePickerUnit = index == .zero ? .hour : .minute
    guard let number = TanreiTimePickerRules.fieldNumber(fieldUnit, value, twelve: twelve) else { return }
    switch fieldUnit {
    case .minute: pending = TanreiTime(hour: pending.hour, minute: number)!
    case .hour where twelve: pending = TanreiTime(hour: TanreiTime.hour(twelve: number, period: pending.period), minute: pending.minute)!
    case .hour: pending = TanreiTime(hour: number, minute: pending.minute)!
    }
    turnHandle()
  }

  /// TMP-23: a committed field (focus left it, or the action key) whose text is not a number of its unit is in error.
  mutating func commit(_ index: Int) {
    let fieldUnit: TanreiTimePickerUnit = index == .zero ? .hour : .minute
    if TanreiTimePickerRules.fieldNumber(fieldUnit, texts[index], twelve: twelve) == nil { errors[index] = true }
  }

  private mutating func turnHandle() {
    handleAngle = TanreiTimePickerRules.turn(from: handleAngle, to: handle.degrees)
  }
}

// MARK: - Token bindings

extension TanreiTimePickerTokens {
  /// TMP-25: in over `motion.open-*`; the growth is the surface's, left out under Reduce Motion.
  func openMotion() -> Animation? {
    TanreiMotion.animation(durationMs: motionOpenDuration, easing: motionOpenEasing, reduceMotion: false)
  }

  /// TMP-25: out over `motion.close-*`, a fade of the scrim and the container.
  func closeMotion() -> Animation? {
    TanreiMotion.animation(durationMs: motionCloseDuration, easing: motionCloseEasing, reduceMotion: false)
  }

  /// TMP-25: the container's scale while it is not shown — `motion.enter-scale`, or 1 (no growth) under Reduce Motion.
  func hiddenScale(reduceMotion: Bool) -> CGFloat {
    reduceMotion ? TanreiIdentity.scale : CGFloat(motionEnterScale)
  }

  /// TMP-17: colors change between states and conditions over the state motion; `nil` under Reduce Motion.
  func stateMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionStateDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// TMP-20: the ripple grows over `motion.feedback-duration` with the state easing; `nil` under Reduce Motion.
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// TMP-15: the dial changes unit, and the handle travels, over the dial motion; `nil` under Reduce Motion.
  func dialMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionDialDuration, easing: motionDialEasing, reduceMotion: reduceMotion)
  }
}

/// Which part's tokens an appearance reads: a selector's or a period segment's.
enum TanreiTimePickerPartKind: Equatable, Sendable {
  case selector
  case period
}

/// Which token values a selector or a period segment draws for one condition × state (TMP-17, TMP-20). Pure data read from
/// `TanreiTimePickerTokens`: every part, in every state, from that state's tokens of the condition — under `ripple` and `dim`
/// the container of the state beneath, under `none` everything of it (`TanreiPressLayers`).
struct TanreiTimePickerAppearance: Equatable {
  let container: TanreiPaint
  let label: TanreiPaint
  /// A selector's outline; a period segment draws none of its own (the selector's border is the group's, TMP-10).
  let outline: TanreiPaint
  let outlineWidth: CGFloat
  let opacity: Double
  /// TMP-20 `ripple`: the pressed container paint, grown from the point of contact; `nil` otherwise.
  let ripple: TanreiPaint?

  init(
    tokens: TanreiTimePickerTokens, condition: TanreiTimePickerCondition, part: TanreiTimePickerPartKind, state: TanreiInteraction,
    feedback: TanreiPressedFeedback = .overlay, beneath: TanreiInteraction = .enabled
  ) {
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    // A condition the design system does not have reads the default's tokens (the lookup is total and reports it).
    let conditionTokens = tokens.conditions[condition]
    func of(_ state: TanreiInteraction) -> TanreiTimePickerConditionStateTokens { conditionTokens[state: state] ?? conditionTokens.enabled }
    let own = of(layers.state)
    let under = of(layers.container)
    switch part {
    case .selector:
      container = under.selectorContainerColor
      label = own.selectorLabelColor
      outline = own.selectorOutlineColor
      outlineWidth = own.selectorOutlineWidth
      ripple = layers.ripple.map { of($0).selectorContainerColor }
    case .period:
      container = under.periodContainerColor
      label = own.periodLabelColor
      outline = .none
      outlineWidth = .zero
      ripple = layers.ripple.map { of($0).periodContainerColor }
    }
    // The vocabulary has no rest-state opacity: a part at rest is not dimmed.
    opacity = tokens[state: layers.state]?.opacity ?? TanreiIdentity.opacity
  }
}

// MARK: - Presentation

/// The presenting view's side: the presentation, the motion's phases, the modal count and focus's return (TMP-1, TMP-3, TMP-25).
private struct TanreiTimePickerPresenter: ViewModifier {
  let isPresented: Binding<Bool>
  let selection: Binding<DateComponents?>
  let options: TanreiTimePickerOptions
  let onClose: (@MainActor (TanreiTimePickerCloseReason) -> Void)?

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.locale) private var environmentLocale
  /// Whether the surface is presented at all (it stays while it fades out), and whether it is shown (in) or fading out.
  @State private var isCovering = false
  @State private var isShown = false
  /// Read when the picker opens (TMP-5).
  @State private var configuration: TanreiTimePickerConfiguration?
  @State private var now = TanreiTime.now()
  /// TMP-3: whether the view the picker is attached to had focus when it opened.
  @FocusState private var openerFocused: Bool
  @State private var returnsFocus = false

  private var tokens: TanreiTimePickerTokens { theme.system.timePicker }

  func body(content: Content) -> some View {
    content
      .focused($openerFocused)
      #if os(iOS)
      .fullScreenCover(isPresented: coverBinding) { surface.presentationBackground(.clear) }
      #else
      // macOS: over the view the modifier is attached to, which is inert meanwhile (TMP-1): nothing in it can be pressed, it
      // is hidden from VoiceOver, and — disabled — nothing in it takes keyboard focus, which keeps focus in the picker.
      .disabled(isCovering)
      .allowsHitTesting(!isCovering)
      .accessibilityHidden(isCovering)
      .overlay { if isCovering { surface } }
      #endif
      .onChange(of: isPresented.wrappedValue, initial: true) { _, open in open ? present() : dismiss() }
      .onDisappear { if isCovering { TanreiModalCoordinator.shared.closed() } }
  }

  @ViewBuilder
  private var surface: some View {
    if let configuration {
      TanreiTimePickerModalSurface(
        configuration: configuration, now: now, isShown: isShown, isModal: true,
        currentValue: { selection.wrappedValue.flatMap { TanreiTime($0) } },
        onCommit: { selection.wrappedValue = $0.components }, onClose: close)
    }
  }

  /// The cover's own binding: SwiftUI writes `false` to it only when it dismisses the cover itself.
  private var coverBinding: Binding<Bool> {
    Binding(get: { isCovering }, set: { value in if !value { isCovering = false } })
  }

  private func present() {
    guard !isCovering else { return }
    let configuration = TanreiTimePickerConfiguration(options, selection: selection.wrappedValue, environmentLocale: environmentLocale)
    configuration.report()
    self.configuration = configuration
    // TMP-5: the device's time when it opens, while there is no selection.
    now = TanreiTime.now()
    returnsFocus = openerFocused
    TanreiModalCoordinator.shared.opened()
    // The system's transition is off: Tanrei's motion is the surface's (TMP-25).
    var transaction = Transaction()
    transaction.disablesAnimations = true
    withTransaction(transaction) { isCovering = true }
    Task(priority: .userInitiated) { @MainActor in
      withAnimation(tokens.openMotion()) { isShown = true }
    }
  }

  private func dismiss() {
    guard isCovering else { return }
    TanreiModalCoordinator.shared.closed()
    // TMP-3: focus returns when it closes, not when the motion ends.
    if returnsFocus { openerFocused = true }
    withAnimation(tokens.closeMotion()) { isShown = false }
    let duration = tokens.motionCloseDuration
    Task(priority: .userInitiated) { @MainActor in
      try? await Task.sleep(for: .milliseconds(Int(duration)))
      guard !isPresented.wrappedValue else { return }
      var transaction = Transaction()
      transaction.disablesAnimations = true
      withTransaction(transaction) { isCovering = false }
      if returnsFocus { openerFocused = true }
    }
  }

  private func close(_ reason: TanreiTimePickerCloseReason) {
    TanreiTimePickerRules.close(isPresented, reason: reason, onClose: onClose)
  }
}

/// The picker drawn in place, open and at rest (fixtures and galleries only): its scrim fills the space it is given and its
/// surface is centred in it, `container.margin` from every edge. Not modal — the page around it is live — and it moves no
/// focus in; otherwise fully operable.
@_spi(Fixtures)
public struct TanreiTimePickerSurface: View {
  private let options: TanreiTimePickerOptions
  private let selection: DateComponents?
  private let onChange: @MainActor (DateComponents) -> Void
  private let onClose: @MainActor (TanreiTimePickerCloseReason) -> Void

  public init(
    selection: DateComponents? = nil, hourCycle: TanreiTimePickerHourCycle = .locale, entryMode: TanreiTimePickerEntryMode = .dial,
    unit: TanreiTimePickerUnit = .hour, layout: TanreiTimePickerLayout = .auto, locale: Locale? = nil,
    labels: TanreiTimePickerLabels = TanreiTimePickerLabels(), onChange: @escaping @MainActor (DateComponents) -> Void = { _ in },
    onClose: @escaping @MainActor (TanreiTimePickerCloseReason) -> Void = { _ in }
  ) {
    options = TanreiTimePickerOptions(hourCycle: hourCycle, entryMode: entryMode, unit: unit, layout: layout, locale: locale, labels: labels)
    self.selection = selection
    self.onChange = onChange
    self.onClose = onClose
  }

  public var body: some View {
    TanreiTimePickerInPlace(options: options, selection: selection, onChange: onChange, onClose: onClose)
  }
}

/// The in-place surface's state: the configuration is read once, as a presented picker reads it when it opens.
private struct TanreiTimePickerInPlace: View {
  let options: TanreiTimePickerOptions
  let selection: DateComponents?
  let onChange: @MainActor (DateComponents) -> Void
  let onClose: @MainActor (TanreiTimePickerCloseReason) -> Void

  @Environment(\.locale) private var environmentLocale
  @State private var configuration: TanreiTimePickerConfiguration?
  @State private var now = TanreiTime.now()

  var body: some View {
    let configuration = self.configuration ?? TanreiTimePickerConfiguration(options, selection: selection, environmentLocale: environmentLocale)
    TanreiTimePickerModalSurface(
      configuration: configuration, now: now, isShown: true, isModal: false, currentValue: { selection.flatMap { TanreiTime($0) } },
      onCommit: { onChange($0.components) }, onClose: onClose
    )
    .onAppear {
      guard self.configuration == nil else { return }
      configuration.report()
      self.configuration = configuration
    }
  }
}

/// The picker as it is presented: the scrim over the whole window and the container centred in the safe area,
/// `container.margin` from every edge and from the keyboard (TMP-1), faded and grown in (TMP-25).
struct TanreiTimePickerModalSurface: View {
  let configuration: TanreiTimePickerConfiguration
  let now: TanreiTime
  let isShown: Bool
  /// Presented (modal), or drawn in place for a fixture (the page around it is live).
  let isModal: Bool
  /// TMP-5: the committed time as it is now, read when OK is activated; `nil` for none (or a value that is not a time of day).
  let currentValue: @MainActor () -> TanreiTime?
  let onCommit: @MainActor (TanreiTime) -> Void
  let onClose: @MainActor (TanreiTimePickerCloseReason) -> Void

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors

  var body: some View {
    let tokens = theme.system.timePicker
    ZStack {
      // TMP-1: the scrim over the whole window; TMP-4: pressing it closes the picker (outside). Decorative, never focused.
      Rectangle()
        .fill(colors[tokens.scrimColor])
        .ignoresSafeArea()
        .contentShape(Rectangle())
        .onTapGesture { onClose(.outside) }
        .accessibilityHidden(true)
        .opacity(isShown ? 1 : .zero)
      TanreiTimePickerContent(
        configuration: configuration, now: now, isInPlace: !isModal, currentValue: currentValue, onCommit: onCommit, onClose: onClose)
        // TMP-25: in, it fades and grows about its centre from `motion.enter-scale`; only fades under Reduce Motion.
        .opacity(isShown ? 1 : .zero)
        .scaleEffect(isShown ? TanreiIdentity.scale : tokens.hiddenScale(reduceMotion: reduceMotion))
        .padding(tokens.containerMargin)
    }
  }
}

// MARK: - The picker

/// Where keyboard focus is inside the picker.
enum TanreiTimePickerFocus: Hashable, Sendable {
  case hour
  case minute
  /// A period segment: 0 before noon. The period selector is one tab stop, the chosen segment (TMP-11).
  case period(Int)
  case field(Int)
  case entryToggle
  case cancel
  case confirm

  /// The selector of a unit.
  static func selector(_ unit: TanreiTimePickerUnit) -> TanreiTimePickerFocus { unit == .hour ? .hour : .minute }
}

/// The picker itself: its state and behaviour, and its parts — the label, the time display and the dial (or the fields), and
/// the actions — on its surface, in the vertical or the horizontal layout (TMP-7, TMP-8).
struct TanreiTimePickerContent: View {
  let configuration: TanreiTimePickerConfiguration
  let isInPlace: Bool
  /// TMP-5: the committed time as it is now, read when OK is activated.
  let currentValue: @MainActor () -> TanreiTime?
  let onCommit: @MainActor (TanreiTime) -> Void
  let onClose: @MainActor (TanreiTimePickerCloseReason) -> Void

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @FocusState private var focus: TanreiTimePickerFocus?
  @State private var model: TanreiTimePickerModel
  /// Activations by key so far, per part: a key press is shown like a pointer's (TMP-19).
  @State private var keyPresses: [TanreiTimePickerFocus: Int] = [:]

  init(
    configuration: TanreiTimePickerConfiguration, now: TanreiTime, isInPlace: Bool, currentValue: @escaping @MainActor () -> TanreiTime?,
    onCommit: @escaping @MainActor (TanreiTime) -> Void, onClose: @escaping @MainActor (TanreiTimePickerCloseReason) -> Void
  ) {
    self.configuration = configuration
    self.isInPlace = isInPlace
    self.currentValue = currentValue
    self.onCommit = onCommit
    self.onClose = onClose
    _model = State(initialValue: TanreiTimePickerModel(configuration: configuration, now: now))
  }

  private var tokens: TanreiTimePickerTokens { theme.system.timePicker }
  private var labels: TanreiTimePickerLabels { configuration.labels }
  private var target: CGFloat { TanreiHitTarget.minimum(in: theme.system.measure) }

  var body: some View {
    arrangement
      .modifier(TanreiTimePickerChrome(label: labels.label, isModal: !isInPlace))
      .onAppear {
        guard !isInPlace else { return }
        // TMP-2: focus moves in when it opens — to the selector of unit, or the hour field in text entry.
        let initial = model.openingFocus
        Task { @MainActor in focus = initial }
      }
      .onChange(of: focus) { _, focused in
        // TMP-16: a selector that receives focus shows its unit on the dial.
        switch focused {
        case .hour: model.show(.hour)
        case .minute: model.show(.minute)
        default: break
        }
      }
      // TMP-4: Escape, and the accessibility escape gesture (the platform's back).
      .onKeyPress(.escape) {
        onClose(.escape)
        return .handled
      }
      #if os(macOS)
      .onExitCommand { onClose(.escape) }
      #endif
      .accessibilityAction(.escape) { onClose(.back) }
  }

  // MARK: Layouts (TMP-7, TMP-8)

  @ViewBuilder
  private var arrangement: some View {
    switch (model.entry, configuration.layout) {
    case (.dial, .horizontal):
      horizontalScrolling
    case (.dial, .auto):
      // Vertical when it fits the window's height; else horizontal when it fits the width; else vertical, scrolling.
      ViewThatFits(in: .vertical) {
        column(natural: true)
        ViewThatFits(in: .horizontal) {
          horizontalScrolling
          verticalScrolling
        }
      }
    default:
      verticalScrolling
    }
  }

  /// TMP-8, vertical: the label and the actions stay while the middle scrolls between them; when they alone leave no room for
  /// a row of selectors, everything scrolls together.
  private var verticalScrolling: some View {
    ViewThatFits(in: .vertical) {
      column(natural: false)
      TanreiScrollRegion(axis: .vertical) {
        VStack(spacing: .zero) {
          top
          middle
          bottom
        }
      }
      .fixedSize(horizontal: true, vertical: false)
    }
  }

  /// TMP-7, vertical: the label, then the time display and the dial (or the fields), centred, then the actions row.
  private func column(natural: Bool) -> some View {
    TanreiTimePickerColumn(minimumMiddle: TanreiTimePickerRules.minimumMiddle(tokens: tokens, target: target), natural: natural) {
      top
      TanreiScrollRegion(axis: .vertical) { middle }
      bottom
    }
  }

  /// The label, `container.padding` from the top and the sides; only the padding while there is none (TMP-29).
  @ViewBuilder
  private var top: some View {
    if labels.label.isEmpty {
      Color.clear.frame(height: tokens.containerPadding)
    } else {
      label(alignment: .center)
        .padding(.horizontal, tokens.containerPadding)
        .padding(.top, tokens.containerPadding)
    }
  }

  /// What lies between the label and the actions: its gaps inside it, so a keyboard-focused selector's ring has room.
  private var middle: some View {
    VStack(spacing: tokens.containerGap) {
      if model.entry == .text {
        fields
      } else {
        display
        dial
      }
    }
    .padding(.horizontal, tokens.containerPadding)
    .padding(.top, labels.label.isEmpty ? .zero : tokens.containerGap)
    .padding(.bottom, tokens.actionsMarginBlockStart)
    .frame(maxWidth: .infinity)
  }

  /// The actions row, `container.padding` from the bottom and the sides.
  private var bottom: some View {
    actions
      .padding(.horizontal, tokens.containerPadding)
      .padding(.bottom, tokens.containerPadding)
  }

  /// TMP-7 / TMP-8, horizontal: two columns `container.gap` apart — at the start the label, the time display below it and the
  /// actions row at its bottom; at the end the dial, centred vertically. Mirrored right to left. Taller than the window, the
  /// whole surface scrolls as one.
  private var horizontalScrolling: some View {
    ViewThatFits(in: .vertical) {
      horizontal
      TanreiScrollRegion(axis: .vertical) { horizontal }
        .fixedSize(horizontal: true, vertical: false)
    }
  }

  private var horizontal: some View {
    HStack(alignment: .center, spacing: tokens.containerGap) {
      VStack(alignment: .leading, spacing: .zero) {
        if !labels.label.isEmpty {
          label(alignment: .leading)
            .padding(.bottom, tokens.containerGap)
        }
        display
        Spacer(minLength: tokens.actionsMarginBlockStart)
        actions
      }
      .frame(minHeight: tokens.dialContainerSize)
      dial
    }
    .padding(tokens.containerPadding)
    .fixedSize()
  }

  /// TMP-7: the picker's label in `header.label.*`; it wraps and grows with text.
  private func label(alignment: TextAlignment) -> some View {
    Text(verbatim: labels.label)
      .multilineTextAlignment(alignment)
      .fixedSize(horizontal: false, vertical: true)
      .tanreiTextStyle(tokens.headerLabelTypescale)
      .foregroundStyle(colors[tokens.headerLabelColor])
      .frame(maxWidth: .infinity, alignment: alignment == .center ? .center : .leading)
      .accessibilityAddTraits(.isHeader)
  }

  // MARK: The time display (TMP-9 … TMP-11, TMP-16 … TMP-22, TMP-26)

  /// TMP-9 / TMP-10 / TMP-28: the hour selector, the separator and the minute selector, `selector.gap` apart, always left to
  /// right; the period selector (12-hour clock) where the locale writes the period, `period.margin-inline-start` from them, in
  /// the layout direction, as tall as the selectors.
  private var display: some View {
    HStack(spacing: tokens.periodMarginInlineStart) {
      if model.twelve && model.text.periodBefore { period(reach: .zero) }
      HStack(spacing: tokens.selectorGap) {
        selector(.hour)
        separator(tokens.separatorTypescale, height: nil)
        selector(.minute)
      }
      // A time is written left to right in every layout direction (TMP-28).
      .environment(\.layoutDirection, .leftToRight)
      if model.twelve && !model.text.periodBefore { period(reach: .zero) }
    }
    .fixedSize()
  }

  /// TMP-9 / TMP-23: the locale's separator between the hours and the minutes, in `style` and `separator.color`; decorative.
  private func separator(_ style: TanreiTextStyle, height: CGFloat?) -> some View {
    Text(verbatim: model.text.separator)
      .tanreiTextStyle(style)
      .foregroundStyle(colors[tokens.separatorColor])
      .fixedSize()
      .frame(height: height)
      .accessibilityHidden(true)
  }

  /// One selector (TMP-9, TMP-16 … TMP-22, TMP-26): an adjustable control named by `hourLabel` or `minuteLabel` whose value is
  /// its text as drawn (with the period on the 12-hour clock); the arrow keys, Page Up and Down, Home and End; focus or a press
  /// shows its unit on the dial.
  private func selector(_ unit: TanreiTimePickerUnit) -> some View {
    let key = TanreiTimePickerFocus.selector(unit)
    let selected = model.entry == .dial && model.unit == unit
    return Button(action: { model.show(unit) }) {
      Text(verbatim: model.shown(unit))
    }
    .buttonStyle(
      TanreiTimePickerPartStyle(
        part: .selector, condition: selected ? .selected : .unselected, isFocused: focus == key, keyPresses: keyPresses[key, default: .zero]))
    .focused($focus, equals: key)
    // Tanrei draws its own ring (TMP-18); the system focus effect would double it.
    .focusEffectDisabled()
    .tanreiKeyActivation(isEnabled: true) {
      keyPresses[key, default: .zero] += 1
      model.show(unit)
    }
    .onKeyPress(keys: TanreiTimePickerKey.equivalents, phases: [.down, .repeat]) { press in
      guard press.modifiers.isDisjoint(with: [.command, .option, .control]), let key = TanreiTimePickerKey(press.key) else { return .ignored }
      return model.press(key, on: unit) ? .handled : .ignored
    }
    .accessibilityLabel(Text(verbatim: unit == .hour ? labels.hourLabel : labels.minuteLabel))
    .accessibilityValue(Text(verbatim: model.spokenValue(unit)))
    .accessibilityRemoveTraits(.isButton)
    .accessibilityAdjustableAction { direction in
      switch direction {
      case .increment: model.adjust(unit, increment: true)
      case .decrement: model.adjust(unit, increment: false)
      @unknown default: break
      }
    }
  }

  /// TMP-10 / TMP-11 / TMP-22 / TMP-26: two segments side by side, the one before noon first in the layout direction, holding
  /// the locale's names of the periods; a border of `period.outline.*` around both and a line of the same between them, the
  /// outer corners `period.container.shape`. One tab stop, the chosen segment; Left and Right choose the other. `reach` is how
  /// far each segment's hit area extends above and below its drawing (text entry, TMP-22).
  private func period(reach: CGFloat) -> some View {
    let style = theme.system.shape.roundedCornerStyle
    return HStack(spacing: .zero) {
      periodSegment(0, reach: reach)
      periodSegment(1, reach: reach)
    }
    .frame(maxHeight: .infinity)
    .overlay {
      TanreiCornerShape(cornerRadius: tokens.periodContainerShape, style: style)
        .strokeBorder(colors[tokens.periodOutlineColor], lineWidth: tokens.periodOutlineWidth)
        .padding(.vertical, reach)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
    // Laid out at its drawing's height: the hit areas reach past it (nothing sits above or below the period).
    .padding(.vertical, -reach)
    .accessibilityElement(children: .contain)
  }

  private func periodSegment(_ index: Int, reach: CGFloat) -> some View {
    let key = TanreiTimePickerFocus.period(index)
    let chosen = model.period == index
    return Button(action: { model.choosePeriod(index) }) {
      Text(verbatim: model.text.periodNames[index])
    }
    .buttonStyle(
      TanreiTimePickerPartStyle(
        part: .period(index: index, reach: reach), condition: chosen ? .selected : .unselected, isFocused: focus == key,
        keyPresses: keyPresses[key, default: .zero]))
    .focused($focus, equals: key)
    .focusEffectDisabled()
    // TMP-11: one tab stop, the chosen segment.
    .focusable(chosen)
    .tanreiKeyActivation(isEnabled: true) {
      keyPresses[key, default: .zero] += 1
      model.choosePeriod(index)
    }
    .onKeyPress(keys: [.leftArrow, .rightArrow], phases: [.down, .repeat]) { press in
      guard press.modifiers.isDisjoint(with: [.command, .option, .control]) else { return .ignored }
      // TMP-11: Left and Right move to the other segment and choose it, as in a group of radio buttons.
      let other = 1 - index
      model.choosePeriod(other)
      Task { @MainActor in focus = .period(other) }
      return .handled
    }
    .accessibilityLabel(Text(verbatim: model.text.periodNames[index]))
    .accessibilityAddTraits(chosen ? .isSelected : [])
    // The focused segment's ring is drawn above its neighbour.
    .zIndex(focus == key ? 1 : 0)
  }

  // MARK: Text entry (TMP-23)

  /// TMP-23: two outlined large number fields with a maxLength of 2, labelled `hourLabel` and `minuteLabel`, each
  /// `selector.container.width` wide, the separator between them `selector.gap` from each in `separator.color` and the fields'
  /// input style, centred on their containers; the period where TMP-10 places it, drawn as tall as the containers with its hit
  /// area reaching the target above and below (TMP-22). The fields are always left to right.
  private var fields: some View {
    let large = theme.system.textField.sizes[.large]
    let container = fieldContainerHeight
    let reach = max(.zero, (target - container) / 2)
    return HStack(alignment: .top, spacing: tokens.periodMarginInlineStart) {
      if model.twelve && model.text.periodBefore { period(reach: reach).frame(height: container) }
      HStack(alignment: .top, spacing: tokens.selectorGap) {
        field(0)
        separator(large.inputTypescale, height: container)
        field(1)
      }
      .environment(\.layoutDirection, .leftToRight)
      if model.twelve && !model.text.periodBefore { period(reach: reach).frame(height: container) }
    }
    .fixedSize()
  }

  /// The height of a large outlined field's container, as the field lays it out (TXF-16): what the separator is centred on and
  /// the period is drawn as tall as.
  private var fieldContainerHeight: CGFloat {
    let appearance = TanreiTextFieldAppearance(tokens: theme.system.textField, variant: .outlined, size: .large, state: .enabled)
    let metrics = TanreiTextFieldMetrics(
      appearance: appearance, variant: .outlined, labelDrawn: true, hasLeadingIcon: false, hasTrailingIcon: false, isMultiline: false,
      scale: { $0.resolved(policy: theme.fontFamilyPolicy, dynamicTypeSize: dynamicTypeSize).lineHeight })
    return metrics.minimumHeight
  }

  private func field(_ index: Int) -> some View {
    TanreiTextField(
      index == .zero ? labels.hourLabel : labels.minuteLabel, text: fieldBinding(index), variant: .outlined, size: .large, type: .number,
      errorText: labels.invalidText, error: model.errors[index], maxLength: TanreiTimePickerRules.fieldMaxLength,
      onCommit: { _ in model.commit(index) }, onSubmit: { fieldAction(index) }
    )
    .frame(width: tokens.selectorContainerWidth)
    .focused($focus, equals: .field(index))
  }

  private func fieldBinding(_ index: Int) -> Binding<String> {
    Binding(get: { model.texts[index] }, set: { model.edit(index, text: $0) })
  }

  /// TMP-23: the action key moves from the hour field to the minute field, and there activates OK when it is enabled.
  private func fieldAction(_ index: Int) {
    if index == .zero {
      focus = .field(1)
    } else {
      confirm()
    }
  }

  // MARK: Actions (TMP-24)

  /// TMP-24: the entry-mode toggle at the start — a standard medium Tanrei icon button showing `keyboard` (named
  /// `textEntryLabel`) on the dial and `schedule` (named `dialEntryLabel`) in text entry — and Cancel and OK at the end,
  /// text-variant medium Tanrei Buttons, OK last, `actions.gap` apart. They keep their own tokens.
  private var actions: some View {
    let isText = model.entry == .text
    return HStack(spacing: tokens.actionsGap) {
      TanreiIconButton(isText ? labels.dialEntryLabel : labels.textEntryLabel, variant: .standard, size: .medium, action: toggleEntry) {
        TanreiTimePickerGlyph(kind: isText ? .schedule : .keyboard)
      }
      .focused($focus, equals: .entryToggle)
      Spacer(minLength: .zero)
      TanreiButton(labels.cancelLabel, variant: .text, size: .medium) { onClose(.cancel) }
        .focused($focus, equals: .cancel)
      TanreiButton(labels.confirmLabel, variant: .text, size: .medium, action: confirm)
        .disabled(!model.canConfirm)
        .focused($focus, equals: .confirm)
    }
  }

  /// TMP-24: switch between the dial and text entry and move focus to the hour field or the hour selector.
  private func toggleEntry() {
    model.toggleEntry()
    let next: TanreiTimePickerFocus = model.entry == .text ? .field(0) : .hour
    Task { @MainActor in focus = next }
  }

  /// TMP-5: OK — change when the pending time differs from the value as it is now, then close with confirm.
  private func confirm() {
    guard model.canConfirm else { return }
    if let change = model.change(from: currentValue()) { onCommit(change) }
    onClose(.confirm)
  }

  // MARK: The dial (TMP-12 … TMP-15)

  private var dial: some View {
    TanreiTimePickerDial(
      model: model,
      onSet: { model.dialSet($0) },
      onRelease: {
        // TMP-14: the minute dial follows the hour dial; focus moves on with it from the hour selector.
        if model.dialReleased(), focus == .hour { focus = .minute }
      })
  }
}

/// TMP-1 / TMP-26: the surface — clipped to `container.shape` corners eased by the corner smoothing, on `container.color` at
/// `container.elevation` —, a container named by the label, modal while presented (SwiftUI has no dialog role).
private struct TanreiTimePickerChrome: ViewModifier {
  let label: String
  let isModal: Bool

  @Environment(\.tanreiTheme) private var theme
  @TanreiPalette private var colors

  func body(content: Content) -> some View {
    let tokens = theme.system.timePicker
    content
      .clipShape(TanreiCornerShape(cornerRadius: tokens.containerShape, style: theme.system.shape.roundedCornerStyle))
      .background {
        TanreiElevationSurface(tokens.containerElevation, fill: colors[tokens.containerColor], cornerRadius: tokens.containerShape)
      }
      .accessibilityElement(children: .contain)
      .accessibilityLabel(Text(verbatim: label))
      .accessibilityAddTraits(isModal ? .isModal : [])
  }
}

/// TMP-7 / TMP-8 — the vertical layout's column, stateless: the top part (the label), the middle (a scroll region) and the
/// bottom part (the actions), each carrying its own padding, as wide as the widest (never wider than offered). The middle gets
/// what the top and the bottom leave; its ideal height (asked by `ViewThatFits`) is the least it can be with a middle of
/// `minimumMiddle` — where even that does not fit, everything scrolls together instead. `natural` asks for the whole middle:
/// the layout that fits only when nothing needs to scroll.
struct TanreiTimePickerColumn: Layout {
  let minimumMiddle: CGFloat
  let natural: Bool

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    arrange(proposal: proposal, subviews: subviews).size
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    let arrangement = arrange(proposal: ProposedViewSize(width: bounds.width, height: bounds.height), subviews: subviews)
    for (subview, frame) in zip(subviews, arrangement.frames) {
      subview.place(
        at: CGPoint(x: bounds.minX + frame.minX, y: bounds.minY + frame.minY), anchor: .topLeading,
        proposal: ProposedViewSize(width: frame.width, height: frame.height))
    }
  }

  func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, frames: [CGRect]) {
    guard subviews.count == 3 else { return (.zero, subviews.map { _ in .zero }) }
    let limit = proposal.width.flatMap { $0.isFinite ? $0 : nil } ?? .infinity
    let width = min(subviews.map { $0.sizeThatFits(.unspecified).width }.max() ?? .zero, limit)
    let heights = subviews.map { $0.sizeThatFits(ProposedViewSize(width: width, height: nil)).height }
    let fixed = heights[0] + heights[2]
    let middle = heights[1]
    let available = proposal.height.flatMap { $0.isFinite ? $0 : nil }
    let total: CGFloat
    if natural {
      total = fixed + middle
    } else if let available {
      total = min(fixed + middle, max(available, fixed + min(middle, minimumMiddle)))
    } else {
      total = fixed + min(middle, minimumMiddle)
    }
    let middleHeight = max(.zero, total - fixed)
    let frames = [
      CGRect(x: .zero, y: .zero, width: width, height: heights[0]),
      CGRect(x: .zero, y: heights[0], width: width, height: middleHeight),
      CGRect(x: .zero, y: heights[0] + middleHeight, width: width, height: heights[2]),
    ]
    return (CGSize(width: width, height: total), frames)
  }
}

// MARK: - Selectors and period segments

/// Which part a style draws: a selector, or a period segment (its index, 0 before noon, and how far its hit area reaches above
/// and below its drawing).
enum TanreiTimePickerPart: Equatable, Sendable {
  case selector
  case period(index: Int, reach: CGFloat)
}

/// A selector's or a period segment's press, hover and keyboard focus, drawn from the tokens of its condition (TMP-17 … TMP-22).
struct TanreiTimePickerPartStyle: ButtonStyle {
  let part: TanreiTimePickerPart
  let condition: TanreiTimePickerCondition
  let isFocused: Bool
  let keyPresses: Int

  func makeBody(configuration: Configuration) -> some View {
    TanreiTimePickerPartChrome(part: part, condition: condition, isPressed: configuration.isPressed, isFocused: isFocused, keyPresses: keyPresses) {
      configuration.label
    }
  }
}

struct TanreiTimePickerPartChrome<Label: View>: View {
  let part: TanreiTimePickerPart
  let condition: TanreiTimePickerCondition
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
    // TMP-19: a press stays visible at least `duration.press-hold`; TMP-20: the point of contact only under `ripple`.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyPresses, watchesContact: feedback == .ripple) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  @ViewBuilder
  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let tokens = system.timePicker
    // TMP-17: one state — pressed > focused > hovered; keyboard focus only (SwiftUI never focuses a button on a press).
    let state = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let kind: TanreiTimePickerPartKind = part == .selector ? .selector : .period
    let appearance = TanreiTimePickerAppearance(tokens: tokens, condition: condition, part: kind, state: state, feedback: feedback, beneath: beneath)
    let ripple = appearance.ripple.map { TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion)) }
    let target = TanreiHitTarget.minimum(in: system.measure)
    let motion = tokens.stateMotion(reduceMotion: reduceMotion)
    switch part {
    case .selector:
      label
        .lineLimit(1)
        .fixedSize()
        .tanreiTextStyle(tokens.selectorLabelTypescale)
        .foregroundStyle(colors[appearance.label])
        // TMP-9 / TMP-22 / TMP-8: at least `selector.container.*` and the target, growing with enlarged text.
        .frame(minWidth: max(tokens.selectorContainerWidth, target), minHeight: max(tokens.selectorContainerHeight, target))
        .modifier(
          TanreiContainerLayers(
            fill: colors[appearance.container], elevation: TanreiIdentity.elevation, cornerRadius: tokens.selectorContainerShape,
            outline: colors[appearance.outline], outlineWidth: appearance.outlineWidth, ripple: ripple, opacity: appearance.opacity))
        .animation(motion, value: TanreiTimePickerPartKey(state: state, condition: condition))
        // TMP-18: keyboard focus only, never animated; TMP-21: as the focus style names it.
        .tanreiFocusRing(isFocused, cornerRadius: tokens.selectorContainerShape)
        .contentShape(Rectangle())
        .onHover { isHovered = $0 }
    case .period(let index, let reach):
      // The outer corners are the selector's: the start corners of the segment before noon, the end corners of the other.
      let sides = TanreiSideCorners(
        leading: index == .zero ? tokens.periodContainerShape : .zero, trailing: index == .zero ? .zero : tokens.periodContainerShape)
      label
        .lineLimit(1)
        .fixedSize()
        .tanreiTextStyle(tokens.periodLabelTypescale)
        .foregroundStyle(colors[appearance.label])
        .padding(.horizontal, tokens.periodOutlineWidth)
        // TMP-10 / TMP-22: at least `period.container.width` and the target wide; as tall as the selector gives it.
        .frame(minWidth: max(tokens.periodContainerWidth, target), maxHeight: .infinity)
        .modifier(
          TanreiContainerLayers(
            fill: colors[appearance.container], elevation: TanreiIdentity.elevation, cornerRadius: tokens.periodContainerShape,
            outline: .clear, outlineWidth: .zero, ripple: ripple, opacity: appearance.opacity, sides: sides))
        .overlay(alignment: .trailing) {
          // TMP-10: the line between the segments, at the trailing edge of the one before noon.
          if index == .zero {
            Rectangle()
              .fill(colors[tokens.periodOutlineColor])
              .frame(width: tokens.periodOutlineWidth)
              .allowsHitTesting(false)
              .accessibilityHidden(true)
          }
        }
        .animation(motion, value: TanreiTimePickerPartKey(state: state, condition: condition))
        .tanreiFocusRing(isFocused, cornerRadius: tokens.periodContainerShape, sides: sides)
        // TMP-22: in text entry the hit area reaches the target above and below the drawing.
        .padding(.vertical, reach)
        .contentShape(Rectangle())
        .onHover { isHovered = $0 }
    }
  }
}

/// What a part's colors animate on (TMP-17): a change of state or of condition.
private struct TanreiTimePickerPartKey: Equatable {
  let state: TanreiInteraction
  let condition: TanreiTimePickerCondition
}

// MARK: - The dial

/// TMP-12 … TMP-15: a circle of `dial.container.size` in `dial.container.color` holding the numbers of the unit it shows in
/// `dial.label.*` — the outer ring's `dial.padding` + half the handle inside the edge, the inner ring's a handle's size further
/// in —; the handle (`dial.handle.*`) over the pending value, the track (`dial.track.*`) from the centre to it and the centre
/// dot (`dial.center.size`); the part of a number under the handle in `dial.selected-label.color`, and a dot of that color in
/// the handle for a minute between two numbers. Always clockwise, never mirrored. A press or a drag sets the value under it;
/// the numbers cross-fade when the unit changes and the handle travels the shorter arc. Hidden from assistive technology.
struct TanreiTimePickerDial: View {
  let model: TanreiTimePickerModel
  let onSet: @MainActor (TanreiTime) -> Void
  let onRelease: @MainActor () -> Void

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors

  var body: some View {
    let tokens = theme.system.timePicker
    let geometry = TanreiTimePickerDialGeometry(tokens: tokens)
    let handle = model.handle
    let placement = TanreiTimePickerOnDial(angle: model.handleAngle, radius: handle.inner ? geometry.inner : geometry.outer, center: geometry.center)
    let between = model.unit == .minute && model.pending.minute % TanreiTimePickerRules.minutePage != .zero
    ZStack {
      Circle().fill(colors[tokens.dialContainerColor])
      // The track and the centre dot under the numbers: an inner-ring number the track passes stays readable.
      TanreiTimePickerTrack(angle: model.handleAngle, radius: placement.radius)
        .stroke(colors[tokens.dialTrackColor], lineWidth: tokens.dialTrackWidth)
      Circle()
        .fill(colors[tokens.dialTrackColor])
        .frame(width: tokens.dialCenterSize, height: tokens.dialCenterSize)
      numbers(color: tokens.dialLabelColor, geometry: geometry)
      Circle()
        .fill(colors[tokens.dialHandleColor])
        .frame(width: tokens.dialHandleSize, height: tokens.dialHandleSize)
        .modifier(placement)
      // TMP-13: the part of a number under the handle, in the selected label color.
      numbers(color: tokens.dialSelectedLabelColor, geometry: geometry)
        .mask {
          Circle()
            .frame(width: tokens.dialHandleSize, height: tokens.dialHandleSize)
            .modifier(placement)
            .frame(width: geometry.size, height: geometry.size)
        }
      if between {
        Circle()
          .fill(colors[tokens.dialSelectedLabelColor])
          .frame(width: tokens.dialCenterSize, height: tokens.dialCenterSize)
          .modifier(placement)
      }
    }
    .frame(width: geometry.size, height: geometry.size)
    // TMP-15: the handle travels over the dial motion — at once while a press or a drag is on the dial (TMP-14) and under
    // Reduce Motion — and the numbers cross-fade when the unit changes.
    .animation(model.dragging ? nil : tokens.dialMotion(reduceMotion: reduceMotion), value: TanreiTimePickerHandleKey(angle: model.handleAngle, inner: handle.inner))
    .animation(tokens.dialMotion(reduceMotion: reduceMotion), value: model.unit)
    .contentShape(Circle())
    .gesture(
      DragGesture(minimumDistance: .zero)
        .onChanged { value in
          onSet(
            TanreiTimePickerRules.dialValue(
              dx: value.location.x - geometry.center.x, dy: value.location.y - geometry.center.y, unit: model.unit, time: model.pending,
              twelve: model.twelve, outer: geometry.outer, inner: geometry.inner))
        }
        .onEnded { _ in onRelease() })
    // TMP-12: the dial runs clockwise in every layout direction.
    .environment(\.layoutDirection, .leftToRight)
    // TMP-14 / TMP-26: a pointer surface, hidden from assistive technology.
    .accessibilityHidden(true)
  }

  /// The numbers of both units, the one shown opaque (TMP-15: they cross-fade).
  private func numbers(color: TanreiPaint, geometry: TanreiTimePickerDialGeometry) -> some View {
    let tokens = theme.system.timePicker
    return ZStack {
      ForEach([TanreiTimePickerUnit.hour, .minute], id: \.self) { unit in
        ZStack {
          ForEach(TanreiTimePickerRules.numbers(unit, twelve: model.twelve), id: \.value) { number in
            Text(verbatim: model.text.number(number.value, digits: number.digits))
              .tanreiTextStyle(tokens.dialLabelTypescale)
              .fixedSize()
              .position(geometry.point(degrees: number.degrees, radius: number.inner ? geometry.inner : geometry.outer))
          }
        }
        .frame(width: geometry.size, height: geometry.size)
        .opacity(model.unit == unit ? 1 : .zero)
      }
    }
    .foregroundStyle(colors[color])
  }
}

/// TMP-12: the dial's size, centre and rings.
struct TanreiTimePickerDialGeometry: Equatable {
  let size: CGFloat
  /// The outer ring's radius: half the dial less `dial.padding` less half the handle.
  let outer: CGFloat
  /// The inner ring's: smaller by the handle's size.
  let inner: CGFloat

  init(tokens: TanreiTimePickerTokens) {
    size = tokens.dialContainerSize
    outer = size / 2 - tokens.dialPadding - tokens.dialHandleSize / 2
    inner = outer - tokens.dialHandleSize
  }

  var center: CGPoint { CGPoint(x: size / 2, y: size / 2) }

  /// The point `radius` from the centre at `degrees` clockwise from the top.
  func point(degrees: Double, radius: CGFloat) -> CGPoint {
    TanreiTimePickerDialGeometry.point(center: center, degrees: degrees, radius: radius)
  }

  static func point(center: CGPoint, degrees: Double, radius: CGFloat) -> CGPoint {
    let radians = degrees * .pi / TanreiTimePickerRules.halfTurn
    return CGPoint(x: center.x + radius * CGFloat(sin(radians)), y: center.y - radius * CGFloat(cos(radians)))
  }
}

/// What the handle animates on.
private struct TanreiTimePickerHandleKey: Equatable {
  let angle: Double
  let inner: Bool
}

/// TMP-13 / TMP-15: places a view at the handle — its angle (unwrapped degrees, clockwise from the top) and radius
/// interpolated, so that it travels along the arc.
struct TanreiTimePickerOnDial: ViewModifier, Animatable {
  var angle: Double
  var radius: CGFloat
  let center: CGPoint

  nonisolated var animatableData: AnimatablePair<Double, CGFloat> {
    get { AnimatablePair(angle, radius) }
    set {
      angle = newValue.first
      radius = newValue.second
    }
  }

  func body(content: Content) -> some View {
    content.position(TanreiTimePickerDialGeometry.point(center: center, degrees: angle, radius: radius))
  }
}

/// TMP-13: the track, from the dial's centre to the handle's, travelling with it.
struct TanreiTimePickerTrack: Shape {
  var angle: Double
  var radius: CGFloat

  nonisolated var animatableData: AnimatablePair<Double, CGFloat> {
    get { AnimatablePair(angle, radius) }
    set {
      angle = newValue.first
      radius = newValue.second
    }
  }

  nonisolated func path(in rect: CGRect) -> Path {
    let center = CGPoint(x: rect.midX, y: rect.midY)
    var path = Path()
    path.move(to: center)
    path.addLine(to: TanreiTimePickerDialGeometry.point(center: center, degrees: angle, radius: radius))
    return path
  }
}

// MARK: - Glyphs

/// A glyph the picker draws itself on the entry-mode toggle (TMP-24): `keyboard` while the dial is shown, `schedule` in text
/// entry. With the icon font — the family, fill, weight and optical size of the slot's context — its glyph; without it (or
/// under the platform-font policy) a vector in the same box, stroked at `sys.border.thick` as the chip's drawn glyphs are.
/// Never mirrored.
struct TanreiTimePickerGlyph: View {
  enum Kind: String, Sendable {
    case keyboard
    case schedule
  }

  let kind: Kind

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.tanreiIconContext) private var context

  var body: some View {
    let context = context ?? TanreiIconContext(size: theme.system.measure.iconMedium, selected: false)
    let stroke = StrokeStyle(lineWidth: theme.system.measure.borderThick, lineCap: .square, lineJoin: .miter)
    Group {
      if theme.system.icon.slotFont(context, policy: theme.fontFamilyPolicy) != nil {
        TanreiIconGlyph(kind.rawValue)
      } else {
        switch kind {
        case .keyboard: TanreiTimePickerKeyboardShape().stroke(style: stroke)
        case .schedule: TanreiTimePickerClockShape().stroke(style: stroke)
        }
      }
    }
    .frame(width: context.size, height: context.size)
    .environment(\.layoutDirection, .leftToRight)
    .accessibilityHidden(true)
  }
}

/// The icon set's `keyboard` in fractions of its box: a key well, a row of keys and the space bar (the shape of a glyph, not a
/// design value).
struct TanreiTimePickerKeyboardShape: Shape {
  static let inset: CGFloat = 0.12
  static let top: CGFloat = 0.26
  static let bottom: CGFloat = 0.74
  static let keyRow: CGFloat = 0.43
  static let keyColumns: [CGFloat] = [0.32, 0.5, 0.68]
  static let key: CGFloat = 0.01
  static let space: (from: CGFloat, to: CGFloat, y: CGFloat) = (0.34, 0.66, 0.59)

  func path(in rect: CGRect) -> Path {
    func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: rect.minX + x * rect.width, y: rect.minY + y * rect.height) }
    var path = Path()
    path.addRect(CGRect(origin: point(Self.inset, Self.top), size: CGSize(width: (1 - 2 * Self.inset) * rect.width, height: (Self.bottom - Self.top) * rect.height)))
    for x in Self.keyColumns {
      path.move(to: point(x - Self.key, Self.keyRow))
      path.addLine(to: point(x + Self.key, Self.keyRow))
    }
    path.move(to: point(Self.space.from, Self.space.y))
    path.addLine(to: point(Self.space.to, Self.space.y))
    return path
  }
}

/// The icon set's `schedule` in fractions of its box: a clock face and its two hands (the shape of a glyph, not a design value).
struct TanreiTimePickerClockShape: Shape {
  static let radius: CGFloat = 0.38
  static let hourHand: (x: CGFloat, y: CGFloat) = (0.5, 0.28)
  static let minuteHand: (x: CGFloat, y: CGFloat) = (0.64, 0.64)

  func path(in rect: CGRect) -> Path {
    func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: rect.minX + x * rect.width, y: rect.minY + y * rect.height) }
    var path = Path()
    let center = point(0.5, 0.5)
    let radius = Self.radius * min(rect.width, rect.height)
    path.addEllipse(in: CGRect(x: center.x - radius, y: center.y - radius, width: 2 * radius, height: 2 * radius))
    path.move(to: point(Self.hourHand.x, Self.hourHand.y))
    path.addLine(to: center)
    path.addLine(to: point(Self.minuteHand.x, Self.minuteHand.y))
    return path
  }
}
