import CoreText
import SwiftUI

// The icon style of a design system (`system.icon`: a family per selection state, weight, the fill
// of the two selection states) turned into what an icon font needs. Not a component and not an
// icon set: Tanrei does not bundle the font, and the icon slot of a component stays a slot.
//
// An icon set is a family per selection state. A VARIABLE font (Material Symbols) names
// one family twice and tells the states apart with `FILL`; a STATIC set (Material Icons Outlined /
// Material Icons) names two families, and the axes are harmless: a font without an axis ignores it.
// The rule the tokens encode, everywhere: something unselected is drawn with the unselected family
// and `fillUnselected`, the same icon in its selected state with the selected family and `fillSelected`.

/// The variation axes of one icon glyph (the axes of Material Symbols).
public struct TanreiIconAxes: Sendable, Equatable {
  /// `FILL`
  public var fill: Double
  /// `wght`
  public var weight: Double
  /// `opsz`: the size of the icon box, within the icon style's `opticalSizeRange`.
  public var opticalSize: Double
  /// `GRAD`
  public var grade: Double

  /// Tanrei does not use the grade axis: emphasis is a token (weight, fill), not a grade.
  public static let neutralGrade: Double = 0

  /// OpenType axis tag → value, as `kCTFontVariationAttribute` and CSS `font-variation-settings` name them.
  public var variations: [(tag: String, value: Double)] {
    [("FILL", fill), ("wght", weight), ("opsz", opticalSize), ("GRAD", grade)]
  }
}

/// Everything needed to draw one icon: the family of its selection state and the axes.
public struct TanreiIconDrawing: Sendable, Equatable {
  /// The icon font of this selection state.
  public var family: TanreiFontStack
  /// `FILL`, `wght`, `opsz` and `GRAD` (always 0). A static icon font ignores them.
  public var axes: TanreiIconAxes

  public init(family: TanreiFontStack, axes: TanreiIconAxes) {
    self.family = family
    self.axes = axes
  }
}

extension TanreiIconStyle {
  /// The icon font of a selection state: `families.selected` or `families.unselected`.
  public func family(selected: Bool) -> TanreiFontStack {
    selected ? families.selected : families.unselected
  }

  /// For (selected, size): the family of that state, fill, weight, optical size, grade 0.
  public func drawing(size: CGFloat, selected: Bool) -> TanreiIconDrawing {
    TanreiIconDrawing(family: family(selected: selected), axes: axes(size: size, selected: selected))
  }

  /// The `FILL` of an icon: `fillSelected` for the selected state, `fillUnselected` otherwise.
  public func fill(selected: Bool) -> Double {
    selected ? fillSelected : fillUnselected
  }

  /// The `opsz` range the icon font draws (`sys.icon.optical-size.min` … `.max`): a fact about the font
  /// the system names, so it is a token next to the family, not a constant here. A maximum below the
  /// minimum reads as the minimum (the range never traps).
  public var opticalSizeRange: ClosedRange<Double> {
    let lower = Double(opticalSizeMin)
    return lower...Swift.max(lower, Double(opticalSizeMax))
  }

  /// The axes of an icon drawn in a box `size` points wide (a `system.measure.icon…` step or a
  /// component's `iconSize`). `opsz` follows the box and stays inside `opticalSizeRange`; the font
  /// actually installed may narrow it further (`coreTextFont(size:selected:)`).
  public func axes(size: CGFloat, selected: Bool) -> TanreiIconAxes {
    let range = opticalSizeRange
    return TanreiIconAxes(
      fill: fill(selected: selected),
      weight: Double(weight),
      opticalSize: min(max(Double(size), range.lowerBound), range.upperBound),
      grade: TanreiIconAxes.neutralGrade
    )
  }

  /// The first named family of that selection state's stack that is registered with this process;
  /// `nil` when none is (Tanrei does not bundle the icon font: the app registers it). There is no
  /// generic fallback for icons: a text font would draw the glyph's name.
  public func installedFamily(selected: Bool) -> String? {
    family(selected: selected).families.first { TanreiFontRegistry.isInstalled(family: $0) }
  }

  /// The icon font at `size` points with the axes of `axes(size:selected:)`, to draw a glyph with
  /// `Text("home").font(…)` (ligature) or a code point. `nil` when no family of the list is
  /// installed, so the caller can fall back to its own icons instead of drawing the glyph's name.
  public func font(size: CGFloat, selected: Bool) -> Font? {
    coreTextFont(size: size, selected: selected).map { Font($0) }
  }

  /// An axis the installed font does not have is skipped (a static set has none), and a value is kept
  /// inside the range the font itself declares — a design system may name another icon font.
  func coreTextFont(size: CGFloat, selected: Bool) -> CTFont? {
    guard let family = installedFamily(selected: selected) else { return nil }
    let base = CTFontCreateWithName(family as CFString, size, nil)
    let declared = (CTFontCopyVariationAxes(base) as? [[CFString: Any]]) ?? []
    var variation: [NSNumber: NSNumber] = [:]
    for (tag, value) in axes(size: size, selected: selected).variations {
      let identifier = TanreiIconStyle.axisIdentifier(tag)
      guard
        let axis = declared.first(where: { ($0[kCTFontVariationAxisIdentifierKey] as? NSNumber)?.uint32Value == identifier }),
        let lower = (axis[kCTFontVariationAxisMinimumValueKey] as? NSNumber)?.doubleValue,
        let upper = (axis[kCTFontVariationAxisMaximumValueKey] as? NSNumber)?.doubleValue
      else { continue }
      variation[NSNumber(value: identifier)] = NSNumber(value: min(max(value, lower), upper))
    }
    let attributes: [CFString: Any] = [kCTFontFamilyNameAttribute: family, kCTFontVariationAttribute: variation]
    return CTFontCreateWithFontDescriptor(CTFontDescriptorCreateWithAttributes(attributes as CFDictionary), size, nil)
  }

  /// A four-character OpenType tag as the number CoreText identifies an axis by.
  static func axisIdentifier(_ tag: String) -> UInt32 {
    tag.utf8.reduce(0) { ($0 << 8) | UInt32($1) }
  }
}

// MARK: - The icon of a component's icon slot

/// What a component tells the icon in its slot: the size of the icon box and whether the icon is
/// drawn in its selected state. Set by the component's chrome with `tanreiIconContext(size:selected:)`; read by
/// `TanreiIconGlyph` and by `iconFont(in:policy:)`.
struct TanreiIconContext: Equatable, Sendable {
  /// The icon box, in points: a component's `iconSize` token.
  var size: CGFloat
  /// Selected: the family and fill of the selected state (`TanreiIconStyle.family(selected:)`, `fill(selected:)`).
  var selected: Bool
}

private struct TanreiIconContextKey: EnvironmentKey {
  static let defaultValue: TanreiIconContext? = nil
}

extension EnvironmentValues {
  /// The icon box and selection state of the enclosing component's icon slot; `nil` outside one.
  var tanreiIconContext: TanreiIconContext? {
    get { self[TanreiIconContextKey.self] }
    set { self[TanreiIconContextKey.self] = newValue }
  }
}

extension TanreiIconStyle {
  /// The font a component hands its icon slot: the icon font of the selection state at the box size, with the
  /// axes of `axes(size:selected:)` — when the theme lets named families be used (`TanreiFontFamilyPolicy.tokens`)
  /// and one of the state's families is registered. Otherwise `nil`: a slot then gets the platform font at the box
  /// size, so an SF Symbol is drawn at the icon size (see `View.tanreiIconContext`).
  func slotFont(_ context: TanreiIconContext, policy: TanreiFontFamilyPolicy) -> Font? {
    guard policy == .tokens else { return nil }
    return font(size: context.size, selected: context.selected)
  }
}

private struct TanreiIconContextModifier: ViewModifier {
  let context: TanreiIconContext
  @Environment(\.tanreiTheme) private var theme

  func body(content: Content) -> some View {
    content
      .font(theme.system.icon.slotFont(context, policy: theme.fontFamilyPolicy) ?? .system(size: context.size))
      .environment(\.tanreiIconContext, context)
  }
}

extension View {
  /// Hands an icon slot what ICB-13 says it is drawn with: the icon font of the selection state at the
  /// box size (the family and `FILL` of that state, `sys.icon.weight`, `opsz` clamped to the optical-size tokens) as
  /// the slot's font, and the context `TanreiIconGlyph` reads. A glyph name in the slot (`TanreiIconGlyph`) is drawn
  /// in that font; any other view (an SF Symbol, an image) gets the font's size and draws itself.
  func tanreiIconContext(size: CGFloat, selected: Bool) -> some View {
    modifier(TanreiIconContextModifier(context: TanreiIconContext(size: size, selected: selected)))
  }
}

/// One glyph of the design system's icon font, by its name (a ligature such as `"favorite"`), for a component's
/// icon slot:
///
///     TanreiIconButton("Favorite", action: like) { TanreiIconGlyph("favorite") }
///
/// It is drawn with the family and fill of the enclosing component's selection state at its icon size;
/// outside a component, unselected at `system.measure.iconMedium`. Tanrei does not bundle the icon
/// font: where none of the state's families is registered — or the theme draws the platform font only
/// (`TanreiFontFamilyPolicy.system`) — the glyph draws NOTHING in its box rather than the glyph's name in a text
/// font. Decorative: the component's label is the accessible name.
public struct TanreiIconGlyph: View {
  private let name: String

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.tanreiIconContext) private var context

  public init(_ name: String) {
    self.name = name
  }

  public var body: some View {
    let context = context ?? TanreiIconContext(size: theme.system.measure.iconMedium, selected: false)
    Group {
      if let font = theme.system.icon.slotFont(context, policy: theme.fontFamilyPolicy) {
        Text(verbatim: name)
          .font(font)
          .lineLimit(1)
          .fixedSize()
      } else {
        Color.clear
      }
    }
    .frame(width: context.size, height: context.size)
    .accessibilityHidden(true)
  }
}
