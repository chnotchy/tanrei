import SwiftUI

// The keyboard model of a column of items that is one tab stop (a list with interactive items or options, LST-15; an
// open menu, MNU-7). Pure, so the rules are tested without a keyboard: the component moves focus to the index returned.

/// One item of a column moved through with the keyboard.
struct TanreiRovingItem: Equatable, Sendable {
  /// Whether it takes focus (a static list item does not).
  let focusable: Bool
  /// The text it starts with, for typeahead: a list item's headline, a menu item's label.
  let label: String
}

/// Down and Up Arrow move to the next and previous item that takes focus — wrapping at the ends or stopping there —,
/// Home and End to the first and last, and printable characters typed within `typeaheadWindow` of each other to the next
/// item whose text begins with them (case-insensitive; a new search starts after the current item, a longer one keeps
/// matching from it). Moving focus never activates or selects.
///
/// One value per column: it remembers what was typed.
struct TanreiRovingKeys: Equatable, Sendable {
  /// "Within one second of each other" (LST-15, MNU-7): a behaviour of the specs, not a design value.
  static let typeaheadWindow: TimeInterval = 1

  /// The keys that move without typing.
  static let movementKeys: Set<KeyEquivalent> = [.downArrow, .upArrow, .home, .end]

  let wraps: Bool
  private(set) var typed = ""
  private var typedAt: TimeInterval = -.infinity

  init(wraps: Bool) {
    self.wraps = wraps
  }

  /// Whether characters typed at `now` continue a search: a Space then belongs to it, not to the activation.
  func isSearching(at now: TimeInterval) -> Bool {
    now - typedAt <= Self.typeaheadWindow
  }

  /// Where a movement key goes from `current` (`nil`: no item has focus yet); `nil` when `key` is not one of them or no
  /// item takes focus.
  func target(for key: KeyEquivalent, from current: Int?, in items: [TanreiRovingItem]) -> Int? {
    let order = items.indices.filter { items[$0].focusable }
    guard let first = order.first, let last = order.last else { return nil }
    let at = current.flatMap { order.firstIndex(of: $0) }
    switch key {
    case .downArrow:
      guard let at else { return first }
      return wraps ? order[(at + 1) % order.count] : order[min(at + 1, order.count - 1)]
    case .upArrow:
      guard let at else { return last }
      return wraps ? order[(at - 1 + order.count) % order.count] : order[max(at - 1, 0)]
    case .home:
      return first
    case .end:
      return last
    default:
      return nil
    }
  }

  /// Where typing `characters` at `now` moves focus from `current`; `nil` when they are not the column's (not one
  /// printable character, or a Space that does not continue a search — it activates the focused item). With no match
  /// the characters are still the column's and focus stays where it is.
  mutating func target(typing characters: String, at now: TimeInterval, from current: Int?, in items: [TanreiRovingItem]) -> Int?? {
    guard characters.count == 1, let character = characters.first, Self.isPrintable(character) else { return nil }
    let order = items.indices.filter { items[$0].focusable }
    guard !order.isEmpty else { return nil }
    let continues = isSearching(at: now)
    if character == " " && !continues { return nil }
    let text = (continues ? typed : "") + characters.lowercased()
    typed = text
    typedAt = now
    let at = current.flatMap { order.firstIndex(of: $0) }
    let from = at.map { text.count == 1 ? $0 + 1 : $0 } ?? 0
    for step in 0..<order.count {
      let index = order[(from + step) % order.count]
      if items[index].label.trimmingCharacters(in: .whitespaces).lowercased().hasPrefix(text) { return .some(index) }
    }
    return .some(current)
  }

  /// A letter, a digit, punctuation, a symbol or a Space — not a control character, and not the private-use code points
  /// AppKit gives the arrow, Home and End keys.
  static func isPrintable(_ character: Character) -> Bool {
    character.unicodeScalars.allSatisfy { scalar in
      switch scalar.properties.generalCategory {
      case .control, .format, .privateUse, .surrogate, .unassigned, .lineSeparator, .paragraphSeparator: return false
      default: return true
      }
    }
  }
}
