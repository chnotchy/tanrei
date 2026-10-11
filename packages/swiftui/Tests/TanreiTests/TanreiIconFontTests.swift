import CoreText
import SwiftUI
import Testing

@testable import Tanrei

// The icon style tokens (`system.icon`) and the helper that turns them into variable-font axes.
// The rule: unselected → FILL `fillUnselected`, selected → FILL `fillSelected`, one weight, `opsz`
// follows the icon box inside the font's range, `GRAD` 0. The font itself is not bundled.

// On the main actor: its tests read whole shipped systems, whose one-time initialization and copies need more
// stack than a cooperative thread has.
@MainActor
@Suite("Icon style")
struct TanreiIconFontTests {
  let icon = TanreiSystem.tanrei.icon

  @Test("the default system: Material Symbols Rounded, weight 300, fill 0 → 1")
  func defaultValues() {
    let rounded = TanreiFontStack(families: ["Material Symbols Rounded"], generic: .sansSerif, system: false)
    #expect(icon.families.unselected == rounded && icon.families.selected == rounded)
    #expect(icon.families.unselected == TanreiSystem.tanrei.typefaces.icon)
    #expect(icon.weight == 300)
    #expect(icon.fillUnselected == 0 && icon.fillSelected == 1)
  }

  @Test("every shipped system carries the icon style", arguments: ShippedSystem.allCases)
  func shipped(shipped: ShippedSystem) {
    let icon = shipped.system.icon
    #expect(!icon.families.unselected.families.isEmpty && !icon.families.selected.families.isEmpty && icon.weight > 0)
    #expect(icon.family(selected: true) == icon.families.selected && icon.family(selected: false) == icon.families.unselected)
    #expect(icon.fill(selected: true) == icon.fillSelected && icon.fill(selected: false) == icon.fillUnselected)
    #expect(icon.fillSelected != icon.fillUnselected)
  }

  @Test("selected draws fill 1, unselected fill 0, both at weight 300 and grade 0")
  func fillFollowsSelection() {
    #expect(icon.fill(selected: true) == 1)
    #expect(icon.fill(selected: false) == 0)
    let selected = icon.axes(size: 24, selected: true)
    let unselected = icon.axes(size: 24, selected: false)
    #expect(selected == TanreiIconAxes(fill: 1, weight: 300, opticalSize: 24, grade: 0))
    #expect(unselected == TanreiIconAxes(fill: 0, weight: 300, opticalSize: 24, grade: 0))
    #expect(selected.variations.map(\.tag) == ["FILL", "wght", "opsz", "GRAD"])
    #expect(selected.variations.map(\.value) == [1, 300, 24, 0])
  }

  @Test("opsz is the icon box size, kept inside the default system's 20–48 token range")
  func opticalSizeClamps() {
    let measure = TanreiSystem.tanrei.measure
    #expect(icon.axes(size: measure.iconSmall, selected: false).opticalSize == 20)  // 16 → 20
    #expect(icon.axes(size: 12, selected: false).opticalSize == 20)
    #expect(icon.axes(size: 20, selected: false).opticalSize == 20)
    #expect(icon.axes(size: 32.5, selected: false).opticalSize == 32.5)
    #expect(icon.axes(size: 48, selected: false).opticalSize == 48)
    #expect(icon.axes(size: 96, selected: true).opticalSize == 48)
    #expect(icon.opticalSizeRange == Double(icon.opticalSizeMin)...Double(icon.opticalSizeMax))
  }

  /// `sys.icon.optical-size.min/max`: the range
  /// belongs to the font a system names, so a system whose icon font declares 8–96 clamps to 8–96.
  @Test("the opsz range is the system's icon style tokens, not a constant")
  func opticalSizeRangeIsAToken() {
    var system = TanreiSystem.tanrei
    system.icon.opticalSizeMin = 8
    system.icon.opticalSizeMax = 96
    let icon = system.icon
    #expect(icon.opticalSizeRange == 8...96)
    #expect(icon.axes(size: 4, selected: false).opticalSize == 8)
    #expect(icon.axes(size: 16, selected: false).opticalSize == 16)  // below Material Symbols' 20: not clamped
    #expect(icon.axes(size: 64, selected: true).opticalSize == 64)  // above its 48: not clamped
    #expect(icon.axes(size: 120, selected: true).opticalSize == 96)
    #expect(icon.drawing(size: 12, selected: true).axes.opticalSize == 12)
    // A narrower range than Material Symbols' clamps inside it.
    system.icon.opticalSizeMin = 24
    system.icon.opticalSizeMax = 24
    #expect(system.icon.axes(size: 16, selected: false).opticalSize == 24)
    #expect(system.icon.axes(size: 48, selected: false).opticalSize == 24)
    // A maximum below the minimum is read as the minimum, never a trap.
    system.icon.opticalSizeMax = 10
    #expect(system.icon.opticalSizeRange == 24...24)
  }

  @Test("every shipped system names its icon font's opsz range", arguments: ShippedSystem.allCases)
  func shippedOpticalSizeRange(shipped: ShippedSystem) {
    let icon = shipped.system.icon
    #expect(icon.opticalSizeMin > 0 && icon.opticalSizeMin <= icon.opticalSizeMax)
  }

  @Test("a modified system drives the axes")
  func modifiedSystem() {
    var system = TanreiSystem.tanrei
    system.icon.weight = 500
    system.icon.fillSelected = 0.5
    system.icon.fillUnselected = 0.25
    #expect(system.icon.axes(size: 24, selected: true) == TanreiIconAxes(fill: 0.5, weight: 500, opticalSize: 24, grade: 0))
    #expect(system.icon.axes(size: 24, selected: false).fill == 0.25)
  }

  @Test("an axis tag is the number CoreText identifies the axis by")
  func axisIdentifiers() {
    #expect(TanreiIconStyle.axisIdentifier("wght") == 0x7767_6874)
    #expect(TanreiIconStyle.axisIdentifier("FILL") == 0x4649_4C4C)
    #expect(TanreiIconStyle.axisIdentifier("opsz") == 0x6F70_737A)
    #expect(TanreiIconStyle.axisIdentifier("GRAD") == 0x4752_4144)
  }

  /// Tanrei does not bundle the icon font. Without it there is no font (the caller falls back to
  /// its own icons); with it the font carries the axes.
  @Test("the font exists only when a family of the list is installed, and then carries the axes")
  func font() throws {
    var missing = icon
    missing.families.selected.families = ["No Such Icon Family 0"]
    #expect(missing.installedFamily(selected: true) == nil)
    #expect(missing.font(size: 24, selected: true) == nil)

    guard icon.installedFamily(selected: true) != nil else {
      #expect(icon.font(size: 24, selected: true) == nil)
      return
    }
    let font = try #require(icon.coreTextFont(size: 24, selected: true))
    let variation = try #require(CTFontCopyVariation(font) as? [NSNumber: NSNumber])
    #expect(variation[NSNumber(value: TanreiIconStyle.axisIdentifier("FILL"))]?.doubleValue == 1)
    #expect(variation[NSNumber(value: TanreiIconStyle.axisIdentifier("wght"))]?.doubleValue == 300)
    #expect(CTFontGetSize(font) == 24)
  }

  /// A design system may name another variable font: an axis it lacks is skipped and a value is
  /// kept inside the range the font declares. Skia ships with macOS and has `wght` 0.48–3.2 and
  /// `wdth`, but no `FILL`, `opsz` or `GRAD`.
  @Test("axes follow what the installed font declares")
  func anotherVariableFont() throws {
    var skia = icon
    skia.families.selected.families = ["No Such Icon Family 0", "Skia"]
    guard skia.installedFamily(selected: true) == "Skia" else { return }
    let font = try #require(skia.coreTextFont(size: 24, selected: true))
    #expect((CTFontCopyFamilyName(font) as String) == "Skia")
    let axes = try #require(CTFontCopyVariationAxes(font) as? [[CFString: Any]])
    let weightAxis = try #require(axes.first { ($0[kCTFontVariationAxisIdentifierKey] as? NSNumber)?.uint32Value == TanreiIconStyle.axisIdentifier("wght") })
    let upper = try #require((weightAxis[kCTFontVariationAxisMaximumValueKey] as? NSNumber)?.doubleValue)
    let variation = (CTFontCopyVariation(font) as? [NSNumber: NSNumber]) ?? [:]
    #expect(variation[NSNumber(value: TanreiIconStyle.axisIdentifier("wght"))]?.doubleValue == upper)  // 300 → the font's maximum
    #expect(variation[NSNumber(value: TanreiIconStyle.axisIdentifier("FILL"))] == nil)
  }

  /// The helper returns, for (selected, size): the family of that state, fill, weight,
  /// optical size, grade 0. Under the default system (one variable font) the family is the same
  /// and `FILL` tells the states apart.
  @Test("drawing(size:selected:) under the default system: one family, FILL 0 → 1")
  func drawingDefault() {
    let unselected = icon.drawing(size: 24, selected: false)
    let selected = icon.drawing(size: 24, selected: true)
    #expect(unselected.family.families == ["Material Symbols Rounded"] && selected.family == unselected.family)
    #expect(unselected.axes == TanreiIconAxes(fill: 0, weight: 300, opticalSize: 24, grade: 0))
    #expect(selected.axes == TanreiIconAxes(fill: 1, weight: 300, opticalSize: 24, grade: 0))
    #expect(icon.drawing(size: 16, selected: true).axes.opticalSize == 20)
  }

  /// m3-like draws Material Symbols Outlined at 400.
  @Test("m3-like: Material Symbols Outlined, weight 400")
  func m3Like() {
    let drawing = TanreiSystem.m3Like.icon.drawing(size: 24, selected: true)
    #expect(drawing.family.families == ["Material Symbols Outlined"])
    #expect(drawing.axes.weight == 400 && drawing.axes.fill == 1 && drawing.axes.grade == 0)
  }

  /// With a STATIC set the family changes with the selection state and the axes are harmless: a
  /// font without variation axes gets none (the loop skips every axis the font does not declare).
  /// Helvetica / Helvetica Neue ship with every Apple OS and are static, like Material Icons.
  @Test("a static icon set: the family follows the selection state, and no axis is applied")
  func staticSet() throws {
    var system = TanreiSystem.tanrei
    system.icon.families = TanreiIconFamilies(
      unselected: TanreiFontStack(families: ["No Such Icon Family 0", "Helvetica"], generic: .sansSerif, system: false),
      selected: TanreiFontStack(families: ["Helvetica Neue"], generic: .sansSerif, system: false))
    #expect(system.icon.installedFamily(selected: false) == "Helvetica")
    #expect(system.icon.installedFamily(selected: true) == "Helvetica Neue")
    let unselected = try #require(system.icon.coreTextFont(size: 24, selected: false))
    let selected = try #require(system.icon.coreTextFont(size: 24, selected: true))
    #expect((CTFontCopyFamilyName(unselected) as String) == "Helvetica")
    #expect((CTFontCopyFamilyName(selected) as String) == "Helvetica Neue")
    #expect(((CTFontCopyVariation(selected) as? [NSNumber: NSNumber]) ?? [:]).isEmpty)
    #expect(system.icon.font(size: 24, selected: true) != nil)
    // The axes are still reported (a caller may pass them on); the font simply has none of them.
    #expect(system.icon.drawing(size: 24, selected: true).axes.fill == 1)
  }
}
