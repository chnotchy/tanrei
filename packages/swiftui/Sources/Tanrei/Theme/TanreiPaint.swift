import SwiftUI

// Behaviour of the generated color vocabulary (`TanreiColorRole`, `TanreiColorValue`,
// `TanreiColors`, `TanreiPaint`): role lookup and paint evaluation. The types and every value
// are generated; nothing here contains a design value.

extension TanreiColorValue {
  /// Fully transparent: what `TanreiPaint.none` evaluates to.
  public static let clear = TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0)

  /// False when drawing this color would change nothing.
  public var isVisible: Bool { opacity > 0 }

  public var color: Color {
    Color(.sRGB, red: red, green: green, blue: blue, opacity: opacity)
  }

  /// Premultiplied interpolation from `self` to `other`: identical to CSS
  /// `color-mix(in srgb, self, other amount)` and to `mixColors` in the token engine.
  public func mixed(with other: TanreiColorValue, amount: Double) -> TanreiColorValue {
    let t = min(1, max(0, amount))
    let alpha = opacity * (1 - t) + other.opacity * t
    guard alpha > 0 else { return .clear }
    func channel(_ base: Double, _ over: Double) -> Double {
      (base * opacity * (1 - t) + over * other.opacity * t) / alpha
    }
    return TanreiColorValue(
      red: channel(red, other.red),
      green: channel(green, other.green),
      blue: channel(blue, other.blue),
      opacity: alpha
    )
  }

  /// The same color, not transparent at all.
  var opaque: TanreiColorValue {
    TanreiColorValue(red: red, green: green, blue: blue, opacity: TanreiIdentity.opacity)
  }

  /// The same color with its alpha multiplied by `amount`.
  public func withAlpha(multipliedBy amount: Double) -> TanreiColorValue {
    TanreiColorValue(red: red, green: green, blue: blue, opacity: opacity * min(1, max(0, amount)))
  }
}

extension TanreiColors {
  /// The roles this scheme defines, in a stable order.
  public var roles: [TanreiColorRole] { values.keys.sorted { $0.rawValue < $1.rawValue } }

  /// The value of a role.
  ///
  /// Roles are open-ended across design systems, so a component written against one system can
  /// name a role another system does not have. That is a programming error (reported in debug
  /// builds through `TanreiDiagnostics`); the lookup falls back to the matching role of the `primary` set (a
  /// recolored component is a variant, not a re-pointed set) and to transparent if that is missing too.
  public func value(_ role: TanreiColorRole) -> TanreiColorValue {
    if let value = values[role] { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no color role \"\(role.rawValue)\"")
    return values[Self.fallback(for: role)] ?? .clear
  }

  /// `on-x-container` → `on-primary-container`, `x-container` → `primary-container`,
  /// `on-x` → `on-primary`, anything else → `primary`.
  static func fallback(for role: TanreiColorRole) -> TanreiColorRole {
    let name = role.rawValue
    let isOn = name.hasPrefix("on-")
    let isContainer = name.hasSuffix("-container")
    switch (isOn, isContainer) {
    case (true, true): return .onPrimaryContainer
    case (false, true): return .primaryContainer
    case (true, false): return .onPrimary
    case (false, false): return .primary
    }
  }

  public subscript(role: TanreiColorRole) -> Color { value(role).color }

  /// Role lookup. Same as the subscript; reads better at some call sites.
  public func color(_ role: TanreiColorRole) -> Color { self[role] }

  /// The color of a paint in this scheme.
  public subscript(paint: TanreiPaint) -> Color { paint.resolve(in: self).color }
}

extension TanreiPaint {
  /// Evaluates the paint against one scheme. Component tokens stay scheme-independent; this is
  /// the only place a paint becomes a color.
  public func resolve(in colors: TanreiColors) -> TanreiColorValue {
    switch self {
    case .role(let role):
      return colors.value(role)
    case .mix(let base, let over, let amount):
      return base.resolve(in: colors).mixed(with: over.resolve(in: colors), amount: amount)
    case .alpha(let paint, let amount):
      return paint.resolve(in: colors).withAlpha(multipliedBy: amount)
    case .none:
      return .clear
    case .literal(let value):
      return value
    case .scheme(let by):
      // The emitter writes all six; a hand-built paint that lacks this scheme draws nothing and says so.
      guard let paint = by[colors.scheme] else {
        TanreiDiagnostics.report("Tanrei: a per-scheme paint has no paint for the scheme \"\(colors.scheme.rawValue)\"")
        return .clear
      }
      return paint.resolve(in: colors)
    }
  }
}
