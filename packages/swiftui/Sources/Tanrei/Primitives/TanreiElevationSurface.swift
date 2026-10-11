import SwiftUI

/// THE conversion from a token blur to what SwiftUI draws with. Nothing else in the package may turn a blur into a radius.
///
/// A Tanrei blur has the meaning of the CSS `box-shadow` blur radius: the shadow edge is a Gaussian
/// with **σ = blur / 2** (CSS Backgrounds and Borders 3, §6.1.1). SwiftUI's shadow `radius`
/// (`GraphicsContext.Filter.shadow`, `View.shadow`) **is σ**: measured, not assumed —
/// `TanreiPrimitivesTests.shadowRadiusIsSigma` renders a straight edge and reads σ off the 16 % / 84 %
/// crossings of the profile. (`View.blur(radius:)` is a different quantity, about 0.77 σ per point of
/// radius, and is therefore not used for token blurs.) Hence radius = blur / 2.
public enum TanreiShadowBlur {
  /// How many points of CSS blur radius one standard deviation is. A fact of the CSS definition, not a design value.
  public static let cssBlurPerSigma: CGFloat = 2

  /// σ of the Gaussian a CSS blur radius stands for. A negative blur is no blur.
  public static func sigma(cssBlur: CGFloat) -> CGFloat {
    max(0, cssBlur) / cssBlurPerSigma
  }

  /// How far a blur visibly reaches past the edge it blurs: three standard deviations (99.7 % of a Gaussian).
  public static func extent(cssBlur: CGFloat) -> CGFloat {
    gaussianExtentInSigmas * sigma(cssBlur: cssBlur)
  }

  /// A fact about the normal distribution, not a design value.
  static let gaussianExtentInSigmas: CGFloat = 3

  /// The `radius` to give a SwiftUI shadow so that it draws a CSS blur of `cssBlur`: SwiftUI's radius is σ.
  public static func shadowRadius(cssBlur: CGFloat) -> CGFloat {
    sigma(cssBlur: cssBlur)
  }
}

extension TanreiShape {
  /// `sys.shape.corner-smoothing` as SwiftUI can draw it (BTN-10). The amount has Figma's meaning — 0 a
  /// quarter circle, 0.6 the iOS continuous corner, 1 the most eased — but SwiftUI has only the OS's own curve:
  /// `.circular` at 0, and `.continuous` (the platform's continuous corner at the same radius) for ANY amount
  /// above 0. The amount is rounded to the OS's curve, so 0.3 and 1 draw the same corner as 0.6 here.
  public var roundedCornerStyle: RoundedCornerStyle {
    cornerSmoothing > 0 ? .continuous : .circular
  }
}

/// How the layers of a `TanreiElevation` level are drawn. An empty level (`level0`) draws nothing.
///
/// A design system may start a level with a hairline ring (no offset, no blur, positive
/// spread): it is drawn as a border of that width **outside** the container bounds. Every
/// other layer is a drop shadow with the meaning of a CSS `box-shadow`: the container's
/// silhouette, grown by `spread`, offset and blurred. Whether a level has a ring, and how many
/// shadows follow, is a value of the system — nothing here assumes either.
public struct TanreiElevationPlan: Sendable, Equatable {
  public let ring: TanreiShadowLayer?
  public let shadows: [TanreiShadowLayer]

  public init(layers: [TanreiShadowLayer]) {
    var remaining = layers[...]
    if let first = remaining.first, Self.isRing(first) {
      ring = first
      remaining = remaining.dropFirst()
    } else {
      ring = nil
    }
    shadows = remaining.filter { !Self.isInvisible($0) }
  }

  static func isRing(_ layer: TanreiShadowLayer) -> Bool {
    layer.x == 0 && layer.y == 0 && layer.blur == 0 && layer.spread > 0
  }

  /// Entirely under the container: level 0, or a shrunken silhouette that never leaves it.
  static func isInvisible(_ layer: TanreiShadowLayer) -> Bool {
    layer.x == 0 && layer.y == 0 && layer.blur == 0 && layer.spread <= 0
  }

  /// The SwiftUI shadow radius of a layer: `TanreiShadowBlur`, the one conversion.
  static func shadowRadius(_ layer: TanreiShadowLayer) -> CGFloat { TanreiShadowBlur.shadowRadius(cssBlur: layer.blur) }

  /// How far beyond the container a layer can paint; the drawing surface is grown by this much.
  static func reach(_ layer: TanreiShadowLayer) -> CGFloat {
    (max(0, layer.spread) + layer.blur + max(abs(layer.x), abs(layer.y))).rounded(.up)
  }
}

/// A filled rounded surface with a Tanrei elevation level. Use it as a `.background`.
public struct TanreiElevationSurface: View {
  private let plan: TanreiElevationPlan
  private let fill: Color
  private let cornerRadius: CGFloat
  @TanreiPalette private var colors
  @Environment(\.tanreiSystem) private var system

  /// A joined item's corners (BGR-2); `nil` draws `cornerRadius` at every corner.
  private var sides: TanreiSideCorners? = nil

  public init(_ layers: [TanreiShadowLayer], fill: Color, cornerRadius: CGFloat) {
    self.plan = TanreiElevationPlan(layers: layers)
    self.fill = fill
    self.cornerRadius = cornerRadius
  }

  /// A surface whose leading and trailing corners differ: a joined item of a button group (BGR-2). With `sides` `nil`
  /// it is exactly the surface of `init(_:fill:cornerRadius:)`.
  init(_ layers: [TanreiShadowLayer], fill: Color, cornerRadius: CGFloat, sides: TanreiSideCorners?) {
    self.init(layers, fill: fill, cornerRadius: cornerRadius)
    self.sides = sides
  }

  public var body: some View {
    // BTN-10: the corner smoothing is a value of the design system, read like every other token.
    let style = system.shape.roundedCornerStyle
    if let sides {
      surface(
        shape: TanreiSideRoundedRectangle(sides, style: style), style: style,
        ring: { TanreiSideRoundedRectangle(sides.grown(by: $0), style: style) })
    } else {
      surface(
        shape: RoundedRectangle(cornerRadius: cornerRadius, style: style), style: style,
        ring: { RoundedRectangle(cornerRadius: cornerRadius + $0, style: style) })
    }
  }

  /// The shadows, the fill in `shape`, and the ring in `ring(spread)`: the container's corners grown by the spread.
  private func surface(shape: some Shape, style: RoundedCornerStyle, ring ringShape: (CGFloat) -> some InsettableShape) -> some View {
    ZStack {
      ForEach(Array(plan.shadows.enumerated()), id: \.offset) { _, layer in
        TanreiDropShadow(layer: layer, color: colors.value(layer.role), cornerRadius: cornerRadius, sides: sides, style: style)
      }
      shape.fill(fill)
      if let ring = plan.ring {
        // Like the shadow spread it stands for, the ring sits outside the container
        // bounds, concentric with its corners, and never changes the container size.
        ringShape(ring.spread)
          .strokeBorder(colors[ring.role], lineWidth: ring.spread)
          .padding(-ring.spread)
      }
    }
    .accessibilityHidden(true)
  }
}

/// One drop-shadow layer: only the shadow is drawn, never the silhouette that casts it, so a
/// positive spread does not make the container look larger. (SwiftUI's `shadow` modifier has
/// no spread.) Animatable, so a state that changes the elevation level moves smoothly.
private struct TanreiDropShadow: View, Animatable {
  var layer: TanreiShadowLayer
  var color: TanreiColorValue
  let cornerRadius: CGFloat
  /// A joined item's corners (BGR-2), in place of `cornerRadius`.
  let sides: TanreiSideCorners?
  let style: RoundedCornerStyle

  typealias Pair = AnimatablePair<CGFloat, CGFloat>
  typealias ColorPair = AnimatablePair<AnimatablePair<Double, Double>, AnimatablePair<Double, Double>>

  nonisolated var animatableData: AnimatablePair<AnimatablePair<Pair, Pair>, ColorPair> {
    get {
      AnimatablePair(
        AnimatablePair(Pair(layer.x, layer.y), Pair(layer.blur, layer.spread)),
        AnimatablePair(AnimatablePair(color.red, color.green), AnimatablePair(color.blue, color.opacity)))
    }
    set {
      layer.x = newValue.first.first.first
      layer.y = newValue.first.first.second
      layer.blur = newValue.first.second.first
      layer.spread = newValue.first.second.second
      color = TanreiColorValue(
        red: newValue.second.first.first, green: newValue.second.first.second,
        blue: newValue.second.second.first, opacity: newValue.second.second.second)
    }
  }

  var body: some View {
    let reach = TanreiElevationPlan.reach(layer)
    Canvas { context, size in
      let inset = reach - layer.spread
      let caster = CGRect(origin: .zero, size: size).insetBy(dx: inset, dy: inset)
      guard caster.width > 0, caster.height > 0 else { return }
      let silhouette =
        if let sides {
          TanreiSideRoundedRectangle(sides.grown(by: layer.spread), style: style).path(in: caster)
        } else {
          RoundedRectangle(cornerRadius: max(0, cornerRadius + layer.spread), style: style).path(in: caster)
        }
      context.addFilter(
        .shadow(color: color.color, radius: TanreiElevationPlan.shadowRadius(layer), x: layer.x, y: layer.y, options: .shadowOnly))
      // The silhouette itself is not drawn (`shadowOnly`); it only has to be opaque, so that
      // the shadow has exactly the alpha of the token color.
      context.fill(silhouette, with: .color(color.opaque.color))
    }
    .padding(-reach)
    .allowsHitTesting(false)
  }
}
