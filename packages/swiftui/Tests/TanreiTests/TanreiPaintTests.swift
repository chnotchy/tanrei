import SwiftUI
import Testing

@testable import Tanrei

/// Paint evaluation: component colors are scheme-independent descriptions, evaluated at runtime
/// against the current scheme. The math must equal CSS `color-mix(in srgb)` — premultiplied
/// interpolation — and `mixColors` in packages/token-engine/src/states.js.
@MainActor
@Suite("TanreiPaint evaluation")
struct TanreiPaintTests {
  let light = TanreiSystem.tanrei.colors.light
  let dark = TanreiSystem.tanrei.colors.dark

  private func isClose(_ a: TanreiColorValue, _ b: TanreiColorValue, tolerance: Double = 1e-9) -> Bool {
    abs(a.red - b.red) <= tolerance && abs(a.green - b.green) <= tolerance && abs(a.blue - b.blue) <= tolerance
      && abs(a.opacity - b.opacity) <= tolerance
  }

  @Test("role: the value of the role in the scheme it is evaluated against")
  func role() {
    let paint = TanreiPaint.role(.primary)
    #expect(paint.resolve(in: light) == light.value(.primary))
    #expect(paint.resolve(in: dark) == dark.value(.primary))
    #expect(paint.resolve(in: light) != paint.resolve(in: dark))
    #expect(light[paint] == light[.primary])
  }

  @Test("mix of opaque colors is a linear interpolation per channel, in light and dark")
  func mixOpaque() {
    let paint = TanreiPaint.mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.08)
    for colors in [light, dark] {
      let base = colors.value(.primary)
      let over = colors.value(.onPrimary)
      #expect(base.opacity == 1 && over.opacity == 1)
      let expected = TanreiColorValue(
        red: base.red * 0.92 + over.red * 0.08,
        green: base.green * 0.92 + over.green * 0.08,
        blue: base.blue * 0.92 + over.blue * 0.08,
        opacity: 1)
      #expect(isClose(paint.resolve(in: colors), expected))
    }
    #expect(paint.resolve(in: light) != paint.resolve(in: dark))
  }

  @Test("mix equals the state-layer overlay it replaces: `with` at `amount` composited over `base`")
  func mixEqualsOverlay() {
    for colors in [light, dark] {
      for amount in [0.08, 0.1, 0.16] {
        let mixed = TanreiPaint.mix(base: .role(.primary), with: .role(.onPrimary), amount: amount).resolve(in: colors)
        let overlay = colors[.onPrimary].opacity(amount).rgba8(over: colors[.primary])
        #expect(mixed.color.rgba8().isClose(to: overlay, tolerance: 1))
      }
    }
  }

  @Test("mix is premultiplied: mixing into nothing keeps the color and scales the alpha")
  func mixWithNone() {
    for colors in [light, dark] {
      let over = colors.value(.onSurface)
      let mixed = TanreiPaint.mix(base: .none, with: .role(.onSurface), amount: 0.1).resolve(in: colors)
      #expect(isClose(mixed, TanreiColorValue(red: over.red, green: over.green, blue: over.blue, opacity: 0.1)))
    }
    // Translucent on both sides: channels are weighted by alpha (CSS color-mix in srgb).
    let a = TanreiColorValue(red: 1, green: 0, blue: 0, opacity: 0.5)
    let b = TanreiColorValue(red: 0, green: 0, blue: 1, opacity: 1)
    let mixed = TanreiPaint.mix(base: .literal(a), with: .literal(b), amount: 0.5).resolve(in: light)
    #expect(isClose(mixed, TanreiColorValue(red: 0.25 / 0.75, green: 0, blue: 0.5 / 0.75, opacity: 0.75)))
    // Nothing mixed with nothing is nothing; the amount is clamped to 0…1.
    #expect(TanreiPaint.mix(base: .none, with: .none, amount: 0.5).resolve(in: light) == .clear)
    #expect(TanreiPaint.mix(base: .role(.primary), with: .role(.error), amount: 2).resolve(in: light) == light.value(.error))
    #expect(TanreiPaint.mix(base: .role(.primary), with: .role(.error), amount: -1).resolve(in: light) == light.value(.primary))
  }

  @Test("alpha multiplies the alpha of what it wraps, in light and dark")
  func alpha() {
    for colors in [light, dark] {
      let base = colors.value(.onSurface)
      let resolved = TanreiPaint.alpha(of: .role(.onSurface), amount: 0.38).resolve(in: colors)
      #expect(resolved == TanreiColorValue(red: base.red, green: base.green, blue: base.blue, opacity: 0.38))
      // Already translucent roles multiply.
      let ring = colors.value(.elevationRing)
      #expect(ring.opacity < 1)
      let half = TanreiPaint.alpha(of: .role(.elevationRing), amount: 0.5).resolve(in: colors)
      #expect(isClose(half, TanreiColorValue(red: ring.red, green: ring.green, blue: ring.blue, opacity: ring.opacity / 2)))
      // Nested paints evaluate inside out.
      let nested = TanreiPaint.alpha(of: .mix(base: .role(.surface), with: .role(.onSurface), amount: 0.5), amount: 0.5)
      #expect(isClose(nested.resolve(in: colors), colors.value(.surface).mixed(with: base, amount: 0.5).withAlpha(multipliedBy: 0.5)))
    }
  }

  @Test("none draws nothing and literal ignores the scheme")
  func noneAndLiteral() {
    let fixed = TanreiColorValue(red: 0.2, green: 0.4, blue: 0.6, opacity: 0.8)
    for colors in [light, dark] {
      #expect(TanreiPaint.none.resolve(in: colors) == .clear)
      #expect(!TanreiPaint.none.resolve(in: colors).isVisible)
      #expect(TanreiPaint.alpha(of: .none, amount: 0.5).resolve(in: colors) == .clear)
      #expect(TanreiPaint.literal(fixed).resolve(in: colors) == fixed)
    }
    #expect(TanreiColorValue.clear.color.rgba8(over: light[.surface]) == light[.surface].rgba8())
  }

  /// A component color that the six schemes decide differently (a palette
  /// tone, a contrast pick) arrives as one paint per scheme and is evaluated by the scheme it is drawn in.
  @Test("a per-scheme paint resolves by the scheme of the colors it is drawn in")
  func perScheme() {
    let system = TanreiSystem.tanrei
    let inner = TanreiPaint.mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.5)
    let paint = TanreiPaint.scheme(by: [
      .light: .role(.error), .lightMedium: .role(.warning), .lightHigh: .none,
      .dark: inner, .darkMedium: .alpha(of: .role(.error), amount: 0.5), .darkHigh: .literal(TanreiColorValue(red: 1, green: 0, blue: 0, opacity: 1)),
    ])
    #expect(TanreiScheme.allCases.map(\.rawValue) == ["light", "light-medium", "light-high", "dark", "dark-medium", "dark-high"])
    // Every generated scheme says which one it is.
    #expect(system.schemes.map(\.colors.scheme) == [.light, .lightMedium, .lightHigh, .dark, .darkMedium, .darkHigh])
    #expect(paint.resolve(in: system.colors.light) == system.colors.light.value(.error))
    #expect(paint.resolve(in: system.colors.lightMedium) == system.colors.lightMedium.value(.warning))
    #expect(paint.resolve(in: system.colors.lightHigh) == .clear)
    #expect(paint.resolve(in: system.colors.dark) == inner.resolve(in: system.colors.dark))
    #expect(paint.resolve(in: system.colors.darkMedium) == system.colors.darkMedium.value(.error).withAlpha(multipliedBy: 0.5))
    #expect(paint.resolve(in: system.colors.darkHigh) == TanreiColorValue(red: 1, green: 0, blue: 0, opacity: 1))
    // Inside another paint, too: the scheme travels with the colors.
    let nested = TanreiPaint.alpha(of: paint, amount: 0.5)
    #expect(nested.resolve(in: system.colors.light) == system.colors.light.value(.error).withAlpha(multipliedBy: 0.5))
    // The theme picks the scheme, so a themed view draws the right one.
    let dark = TanreiTheme(appearance: .dark, contrast: .high).colors(systemScheme: .light, systemContrast: .standard)
    #expect(dark.scheme == .darkHigh && paint.resolve(in: dark).red == 1)
    // A hand-built paint that lacks the scheme draws nothing and reports it (debug builds).
    let (value, reports) = Reports.collecting { TanreiPaint.scheme(by: [.dark: .role(.error)]).resolve(in: system.colors.light) }
    #expect(value == .clear && reports.mention("light"))
  }

  /// …and it drives a button like any paint.
  @MainActor
  @Test("a per-scheme paint drives the rendered button")
  func perSchemeRendered() throws {
    var system = TanreiSystem.tanrei
    system.button.variants.filled.enabled.containerColor = .scheme(by: Dictionary(uniqueKeysWithValues: TanreiScheme.allCases.map { ($0, $0 == .light ? TanreiPaint.role(.error) : .role(.success)) }))
    var theme = Snapshot.theme
    theme.system = system
    let bitmap = try Snapshot.render(TanreiButton("Deploy", action: {}), theme: theme)
    let sizes = system.button.sizes.medium
    let pixel = bitmap[Int((Snapshot.inset + sizes.containerPaddingInlineStart / 2) * Snapshot.scale), Int((Snapshot.inset + sizes.containerHeight / 2) * Snapshot.scale)]
    #expect(pixel.isClose(to: system.colors.light[.error].rgba8()))
  }
}
