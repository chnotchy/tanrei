// GENERATED FILE — DO NOT EDIT.
// Source: tokens/ (DTCG 2025.10). Regenerate with `pnpm generate`.
// Vocabulary types: the shape every design system has. System values live in TanreiSystem+<Id>.swift.
// swiftlint:disable all

import SwiftUI

/// The name of a color role. Components bind to roles, never to literal colors.
///
/// The set is open: every design system has the core roles, and a system may declare further
/// palettes (an M3-like preset has `tertiary`, a product may have `correct`). The constants
/// below are the roles of the default system; a role another system declares is
/// `TanreiColorRole(rawValue: "tertiary")` (an open key: no constant is generated for it).
public struct TanreiColorRole: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token name of the role, for example `"on-primary"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }
}

/// One sRGB color, components 0–1, alpha not premultiplied.
public struct TanreiColorValue: Sendable, Hashable {
  public var red: Double
  public var green: Double
  public var blue: Double
  public var opacity: Double

  public init(red: Double, green: Double, blue: Double, opacity: Double) {
    self.red = red
    self.green = green
    self.blue = blue
    self.opacity = opacity
  }
}

/// How a component color is described without resolving the scheme. Closed: a design system chooses
/// among these, it cannot add a kind. Evaluate with `resolve(in:)` against the current `TanreiColors`.
public indirect enum TanreiPaint: Sendable, Equatable {
  /// A color role of the current scheme.
  case role(TanreiColorRole)
  /// Premultiplied interpolation, identical to CSS `color-mix(in srgb, base, with amount)`.
  case mix(base: TanreiPaint, with: TanreiPaint, amount: Double)
  /// `of` with its alpha multiplied by `amount`.
  case alpha(of: TanreiPaint, amount: Double)
  /// Nothing is drawn.
  case none
  /// A fixed color, the same in every scheme.
  case literal(TanreiColorValue)
  /// A paint per scheme, decided at build time where the six schemes disagree (a palette tone, a contrast
  /// pick). Evaluated by the scheme of the `TanreiColors` it is resolved in.
  case scheme(by: [TanreiScheme: TanreiPaint])
}

/// Every color role of one scheme (theme × contrast). Look roles up with `colors[role]`.
public struct TanreiColors: Sendable, Equatable {
  /// Which of the six schemes this is: what a `TanreiPaint.scheme` is evaluated by.
  public var scheme: TanreiScheme
  public var values: [TanreiColorRole: TanreiColorValue]

  public init(scheme: TanreiScheme, values: [TanreiColorRole: TanreiColorValue]) {
    self.scheme = scheme
    self.values = values
  }
}

/// The generic class of a font stack: what the platform falls back to when no named family is available.
public enum TanreiFontGeneric: String, Sendable, Hashable, CaseIterable {
  case sansSerif = "sans-serif"
  case serif
  case monospace
}

/// A font stack, read once for every platform. Tanrei never bundles a font: a product installs or
/// registers the `families` it wants drawn.
public struct TanreiFontStack: Sendable, Equatable {
  /// The named families, in order of preference. The first one registered with the process is used.
  public var families: [String]
  /// The platform font to fall back to when none of `families` is available.
  public var generic: TanreiFontGeneric
  /// The stack asks for the platform's own font BEFORE any named family: then `families` are not consulted.
  public var system: Bool

  public init(families: [String], generic: TanreiFontGeneric, system: Bool) {
    self.families = families
    self.generic = generic
    self.system = system
  }
}

/// The families of the type scale. A role's family is decided by the token build (the first segment of its
/// name when it names a family; `caption`, `code`, `code-small`, `eyebrow` and any other role belong to `label`).
/// Closed: a design system re-values the roles and may add one to a family; it cannot add a family.
public enum TanreiTypeFamily: String, Sendable, Hashable, CaseIterable {
  case display
  case heading
  case body
  case label
}

/// The weight `emphasized` text adds to a role's weight, per family (`sys.typescale.emphasis.*`).
/// Emphasis is a weight step, not a role: size, tracking and line height do not change.
public struct TanreiTypeEmphasis: Sendable, Equatable {
  public var display: CGFloat
  public var heading: CGFloat
  public var body: CGFloat
  public var label: CGFloat

  public init(display: CGFloat, heading: CGFloat, body: CGFloat, label: CGFloat) {
    self.display = display
    self.heading = heading
    self.body = body
    self.label = label
  }

  /// The step of one family.
  public subscript(family: TanreiTypeFamily) -> CGFloat {
    switch family {
    case .display: return display
    case .heading: return heading
    case .body: return body
    case .label: return label
    }
  }
}

public struct TanreiTextStyle: Sendable, Equatable {
  public var font: TanreiFontStack
  public var size: CGFloat
  /// Numeric weight on the 1–1000 axis (variable fonts may use in-between values such as 450).
  public var weight: CGFloat
  public var tracking: CGFloat
  public var lineHeight: CGFloat
  /// The family the role belongs to: which step of `TanreiTypeEmphasis` `emphasized` text adds to `weight`.
  public var family: TanreiTypeFamily

  public init(font: TanreiFontStack, size: CGFloat, weight: CGFloat, tracking: CGFloat, lineHeight: CGFloat, family: TanreiTypeFamily) {
    self.font = font
    self.size = size
    self.weight = weight
    self.tracking = tracking
    self.lineHeight = lineHeight
    self.family = family
  }
}

public struct TanreiCubicBezier: Sendable, Equatable {
  public var x1: Double, y1: Double, x2: Double, y2: Double
  public init(_ x1: Double, _ y1: Double, _ x2: Double, _ y2: Double) {
    self.x1 = x1; self.y1 = y1; self.x2 = x2; self.y2 = y2
  }
}

public struct TanreiSpringSpec: Sendable, Equatable {
  /// Damping ratio.
  public var damping: Double
  public var stiffness: Double
  /// Fallback for contexts without spring animation.
  public var easing: TanreiCubicBezier
  public var durationMs: Double

  public init(damping: Double, stiffness: Double, easing: TanreiCubicBezier, durationMs: Double) {
    self.damping = damping
    self.stiffness = stiffness
    self.easing = easing
    self.durationMs = durationMs
  }
}

/// One layer of an elevation level, with the meaning of a CSS `box-shadow`: the container's silhouette grown
/// by `spread`, moved by `x` / `y` and blurred. `blur` is the CSS blur radius — a Gaussian with
/// σ = blur / 2. `TanreiShadowBlur` converts it to what SwiftUI draws with; nothing else may.
public struct TanreiShadowLayer: Sendable, Equatable {
  public var x: CGFloat, y: CGFloat, blur: CGFloat, spread: CGFloat
  public var role: TanreiColorRole

  public init(x: CGFloat, y: CGFloat, blur: CGFloat, spread: CGFloat, role: TanreiColorRole) {
    self.x = x; self.y = y; self.blur = blur; self.spread = spread
    self.role = role
  }
}

extension TanreiColorRole {
  public static let elevationRing = TanreiColorRole(rawValue: "elevation-ring")
  public static let elevationShadow1 = TanreiColorRole(rawValue: "elevation-shadow-1")
  public static let elevationShadow2 = TanreiColorRole(rawValue: "elevation-shadow-2")
  public static let elevationShadow3 = TanreiColorRole(rawValue: "elevation-shadow-3")
  public static let error = TanreiColorRole(rawValue: "error")
  public static let errorContainer = TanreiColorRole(rawValue: "error-container")
  public static let focusRing = TanreiColorRole(rawValue: "focus-ring")
  public static let focusRingInner = TanreiColorRole(rawValue: "focus-ring-inner")
  public static let info = TanreiColorRole(rawValue: "info")
  public static let infoContainer = TanreiColorRole(rawValue: "info-container")
  public static let inverseLink = TanreiColorRole(rawValue: "inverse-link")
  public static let inverseOnSurface = TanreiColorRole(rawValue: "inverse-on-surface")
  public static let inversePrimary = TanreiColorRole(rawValue: "inverse-primary")
  public static let inverseSurface = TanreiColorRole(rawValue: "inverse-surface")
  public static let link = TanreiColorRole(rawValue: "link")
  public static let onError = TanreiColorRole(rawValue: "on-error")
  public static let onErrorContainer = TanreiColorRole(rawValue: "on-error-container")
  public static let onInfo = TanreiColorRole(rawValue: "on-info")
  public static let onInfoContainer = TanreiColorRole(rawValue: "on-info-container")
  public static let onPrimary = TanreiColorRole(rawValue: "on-primary")
  public static let onPrimaryContainer = TanreiColorRole(rawValue: "on-primary-container")
  public static let onSecondary = TanreiColorRole(rawValue: "on-secondary")
  public static let onSecondaryContainer = TanreiColorRole(rawValue: "on-secondary-container")
  public static let onSuccess = TanreiColorRole(rawValue: "on-success")
  public static let onSuccessContainer = TanreiColorRole(rawValue: "on-success-container")
  public static let onSurface = TanreiColorRole(rawValue: "on-surface")
  public static let onSurfaceVariant = TanreiColorRole(rawValue: "on-surface-variant")
  public static let onWarning = TanreiColorRole(rawValue: "on-warning")
  public static let onWarningContainer = TanreiColorRole(rawValue: "on-warning-container")
  public static let outline = TanreiColorRole(rawValue: "outline")
  public static let outlineVariant = TanreiColorRole(rawValue: "outline-variant")
  public static let primary = TanreiColorRole(rawValue: "primary")
  public static let primaryContainer = TanreiColorRole(rawValue: "primary-container")
  public static let scrim = TanreiColorRole(rawValue: "scrim")
  public static let secondary = TanreiColorRole(rawValue: "secondary")
  public static let secondaryContainer = TanreiColorRole(rawValue: "secondary-container")
  public static let shadow = TanreiColorRole(rawValue: "shadow")
  public static let success = TanreiColorRole(rawValue: "success")
  public static let successContainer = TanreiColorRole(rawValue: "success-container")
  public static let surface = TanreiColorRole(rawValue: "surface")
  public static let surfaceBright = TanreiColorRole(rawValue: "surface-bright")
  public static let surfaceContainer = TanreiColorRole(rawValue: "surface-container")
  public static let surfaceContainerHigh = TanreiColorRole(rawValue: "surface-container-high")
  public static let surfaceContainerHighest = TanreiColorRole(rawValue: "surface-container-highest")
  public static let surfaceContainerLow = TanreiColorRole(rawValue: "surface-container-low")
  public static let surfaceContainerLowest = TanreiColorRole(rawValue: "surface-container-lowest")
  public static let surfaceDim = TanreiColorRole(rawValue: "surface-dim")
  public static let surfaceVariant = TanreiColorRole(rawValue: "surface-variant")
  public static let warning = TanreiColorRole(rawValue: "warning")
  public static let warningContainer = TanreiColorRole(rawValue: "warning-container")
}

/// The six schemes of every design system: theme (light / dark) × contrast (standard / medium / high).
public enum TanreiScheme: String, Sendable, Hashable, CaseIterable {
  case light
  case lightMedium = "light-medium"
  case lightHigh = "light-high"
  case dark
  case darkMedium = "dark-medium"
  case darkHigh = "dark-high"
}

/// The six schemes of a system: light / dark × standard / medium / high contrast.
public struct TanreiColorSchemes: Sendable, Equatable {
  public var light: TanreiColors
  public var lightMedium: TanreiColors
  public var lightHigh: TanreiColors
  public var dark: TanreiColors
  public var darkMedium: TanreiColors
  public var darkHigh: TanreiColors

  public init(
    light: TanreiColors,
    lightMedium: TanreiColors,
    lightHigh: TanreiColors,
    dark: TanreiColors,
    darkMedium: TanreiColors,
    darkHigh: TanreiColors
  ) {
    self.light = light
    self.lightMedium = lightMedium
    self.lightHigh = lightHigh
    self.dark = dark
    self.darkMedium = darkMedium
    self.darkHigh = darkHigh
  }
}

/// The type roles: `display`, `heading1`…`heading6` (h1…h6), `bodyLarge` / `body` / `bodySmall` (lead, p, small),
/// `label` / `labelSmall` / `caption` (text in and next to controls), `code` / `codeSmall`, `eyebrow`. `emphasis` holds the
/// weight step `emphasized` text adds per family.
public struct TanreiTypescale: Sendable, Equatable {
  public var body: TanreiTextStyle
  public var bodyLarge: TanreiTextStyle
  public var bodySmall: TanreiTextStyle
  public var caption: TanreiTextStyle
  public var code: TanreiTextStyle
  public var codeSmall: TanreiTextStyle
  public var display: TanreiTextStyle
  public var eyebrow: TanreiTextStyle
  public var heading1: TanreiTextStyle
  public var heading2: TanreiTextStyle
  public var heading3: TanreiTextStyle
  public var heading4: TanreiTextStyle
  public var heading5: TanreiTextStyle
  public var heading6: TanreiTextStyle
  public var label: TanreiTextStyle
  public var labelSmall: TanreiTextStyle
  /// `sys.typescale.emphasis.*`: the weight `emphasized` text adds, per family.
  public var emphasis: TanreiTypeEmphasis
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [String: TanreiTextStyle]

  public init(
    body: TanreiTextStyle,
    bodyLarge: TanreiTextStyle,
    bodySmall: TanreiTextStyle,
    caption: TanreiTextStyle,
    code: TanreiTextStyle,
    codeSmall: TanreiTextStyle,
    display: TanreiTextStyle,
    eyebrow: TanreiTextStyle,
    heading1: TanreiTextStyle,
    heading2: TanreiTextStyle,
    heading3: TanreiTextStyle,
    heading4: TanreiTextStyle,
    heading5: TanreiTextStyle,
    heading6: TanreiTextStyle,
    label: TanreiTextStyle,
    labelSmall: TanreiTextStyle,
    emphasis: TanreiTypeEmphasis,
    extra: [String: TanreiTextStyle] = [:]
  ) {
    self.body = body
    self.bodyLarge = bodyLarge
    self.bodySmall = bodySmall
    self.caption = caption
    self.code = code
    self.codeSmall = codeSmall
    self.display = display
    self.eyebrow = eyebrow
    self.heading1 = heading1
    self.heading2 = heading2
    self.heading3 = heading3
    self.heading4 = heading4
    self.heading5 = heading5
    self.heading6 = heading6
    self.label = label
    self.labelSmall = labelSmall
    self.emphasis = emphasis
    self.extra = extra
  }

  /// One typescale step by its token key, core or added; `nil` when this design system does not have it.
  public subscript(key: String) -> TanreiTextStyle? {
    switch key {
    case "body": return body
    case "body-large": return bodyLarge
    case "body-small": return bodySmall
    case "caption": return caption
    case "code": return code
    case "code-small": return codeSmall
    case "display": return display
    case "eyebrow": return eyebrow
    case "heading-1": return heading1
    case "heading-2": return heading2
    case "heading-3": return heading3
    case "heading-4": return heading4
    case "heading-5": return heading5
    case "heading-6": return heading6
    case "label": return label
    case "label-small": return labelSmall
    default: return extra[key]
    }
  }
}

/// Corner radii, in points, and how their curve eases (`cornerSmoothing`).
public struct TanreiShape: Sendable, Equatable {
  public var extraExtraLarge: CGFloat
  public var extraLarge: CGFloat
  public var extraLargeIncreased: CGFloat
  public var extraSmall: CGFloat
  public var full: CGFloat
  public var large: CGFloat
  public var largeIncreased: CGFloat
  public var medium: CGFloat
  public var none: CGFloat
  public var small: CGFloat
  /// `sys.shape.corner-smoothing`: 0–1 with Figma's meaning — 0 a quarter circle, 0.6 the iOS continuous corner,
  /// 1 the most eased. SwiftUI has only the OS's curve: `roundedCornerStyle` draws `.circular` at 0 and `.continuous` above.
  public var cornerSmoothing: Double
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [String: CGFloat]

  public init(
    extraExtraLarge: CGFloat,
    extraLarge: CGFloat,
    extraLargeIncreased: CGFloat,
    extraSmall: CGFloat,
    full: CGFloat,
    large: CGFloat,
    largeIncreased: CGFloat,
    medium: CGFloat,
    none: CGFloat,
    small: CGFloat,
    cornerSmoothing: Double,
    extra: [String: CGFloat] = [:]
  ) {
    self.extraExtraLarge = extraExtraLarge
    self.extraLarge = extraLarge
    self.extraLargeIncreased = extraLargeIncreased
    self.extraSmall = extraSmall
    self.full = full
    self.large = large
    self.largeIncreased = largeIncreased
    self.medium = medium
    self.none = none
    self.small = small
    self.cornerSmoothing = cornerSmoothing
    self.extra = extra
  }

  /// One shape step by its token key, core or added; `nil` when this design system does not have it.
  public subscript(key: String) -> CGFloat? {
    switch key {
    case "extra-extra-large": return extraExtraLarge
    case "extra-large": return extraLarge
    case "extra-large-increased": return extraLargeIncreased
    case "extra-small": return extraSmall
    case "full": return full
    case "large": return large
    case "large-increased": return largeIncreased
    case "medium": return medium
    case "none": return none
    case "small": return small
    default: return extra[key]
    }
  }
}

public struct TanreiSpace: Sendable, Equatable {
  public var space0: CGFloat
  public var space25: CGFloat
  public var space50: CGFloat
  public var space75: CGFloat
  public var space100: CGFloat
  public var space125: CGFloat
  public var space150: CGFloat
  public var space175: CGFloat
  public var space200: CGFloat
  public var space250: CGFloat
  public var space300: CGFloat
  public var space400: CGFloat
  public var space450: CGFloat
  public var space500: CGFloat
  public var space600: CGFloat
  public var space700: CGFloat
  public var space800: CGFloat
  public var space900: CGFloat
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [String: CGFloat]

  public init(
    space0: CGFloat,
    space25: CGFloat,
    space50: CGFloat,
    space75: CGFloat,
    space100: CGFloat,
    space125: CGFloat,
    space150: CGFloat,
    space175: CGFloat,
    space200: CGFloat,
    space250: CGFloat,
    space300: CGFloat,
    space400: CGFloat,
    space450: CGFloat,
    space500: CGFloat,
    space600: CGFloat,
    space700: CGFloat,
    space800: CGFloat,
    space900: CGFloat,
    extra: [String: CGFloat] = [:]
  ) {
    self.space0 = space0
    self.space25 = space25
    self.space50 = space50
    self.space75 = space75
    self.space100 = space100
    self.space125 = space125
    self.space150 = space150
    self.space175 = space175
    self.space200 = space200
    self.space250 = space250
    self.space300 = space300
    self.space400 = space400
    self.space450 = space450
    self.space500 = space500
    self.space600 = space600
    self.space700 = space700
    self.space800 = space800
    self.space900 = space900
    self.extra = extra
  }

  /// One space step by its token key, core or added; `nil` when this design system does not have it.
  public subscript(key: String) -> CGFloat? {
    switch key {
    case "space0": return space0
    case "space25": return space25
    case "space50": return space50
    case "space75": return space75
    case "space100": return space100
    case "space125": return space125
    case "space150": return space150
    case "space175": return space175
    case "space200": return space200
    case "space250": return space250
    case "space300": return space300
    case "space400": return space400
    case "space450": return space450
    case "space500": return space500
    case "space600": return space600
    case "space700": return space700
    case "space800": return space800
    case "space900": return space900
    default: return extra[key]
    }
  }
}

/// State opacities. How a component state looks is decided by its own per-state tokens.
public struct TanreiState: Sendable, Equatable {
  public var disabledContainerOpacity: Double
  public var disabledContentOpacity: Double
  public var draggedStateLayerOpacity: Double
  public var focusStateLayerOpacity: Double
  public var hoverStateLayerOpacity: Double
  public var pressedStateLayerOpacity: Double
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [String: Double]

  public init(
    disabledContainerOpacity: Double,
    disabledContentOpacity: Double,
    draggedStateLayerOpacity: Double,
    focusStateLayerOpacity: Double,
    hoverStateLayerOpacity: Double,
    pressedStateLayerOpacity: Double,
    extra: [String: Double] = [:]
  ) {
    self.disabledContainerOpacity = disabledContainerOpacity
    self.disabledContentOpacity = disabledContentOpacity
    self.draggedStateLayerOpacity = draggedStateLayerOpacity
    self.focusStateLayerOpacity = focusStateLayerOpacity
    self.hoverStateLayerOpacity = hoverStateLayerOpacity
    self.pressedStateLayerOpacity = pressedStateLayerOpacity
    self.extra = extra
  }

  /// One state step by its token key, core or added; `nil` when this design system does not have it.
  public subscript(key: String) -> Double? {
    switch key {
    case "disabled-container-opacity": return disabledContainerOpacity
    case "disabled-content-opacity": return disabledContentOpacity
    case "dragged-state-layer-opacity": return draggedStateLayerOpacity
    case "focus-state-layer-opacity": return focusStateLayerOpacity
    case "hover-state-layer-opacity": return hoverStateLayerOpacity
    case "pressed-state-layer-opacity": return pressedStateLayerOpacity
    default: return extra[key]
    }
  }
}

/// Borders, the focus indicator, minimum targets, icon sizes and the window widths at which a layout changes, in points.
public struct TanreiMeasure: Sendable, Equatable {
  public var borderHairline: CGFloat
  public var borderThick: CGFloat
  public var breakpointExpanded: CGFloat
  public var breakpointMedium: CGFloat
  public var focusInnerWidth: CGFloat
  public var focusOffset: CGFloat
  public var focusOuterWidth: CGFloat
  public var iconExtraSmall: CGFloat
  public var iconLarge: CGFloat
  public var iconMedium: CGFloat
  public var iconSmall: CGFloat
  public var targetPointer: CGFloat
  public var targetSpacing: CGFloat
  public var targetTouch: CGFloat
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [String: CGFloat]

  public init(
    borderHairline: CGFloat,
    borderThick: CGFloat,
    breakpointExpanded: CGFloat,
    breakpointMedium: CGFloat,
    focusInnerWidth: CGFloat,
    focusOffset: CGFloat,
    focusOuterWidth: CGFloat,
    iconExtraSmall: CGFloat,
    iconLarge: CGFloat,
    iconMedium: CGFloat,
    iconSmall: CGFloat,
    targetPointer: CGFloat,
    targetSpacing: CGFloat,
    targetTouch: CGFloat,
    extra: [String: CGFloat] = [:]
  ) {
    self.borderHairline = borderHairline
    self.borderThick = borderThick
    self.breakpointExpanded = breakpointExpanded
    self.breakpointMedium = breakpointMedium
    self.focusInnerWidth = focusInnerWidth
    self.focusOffset = focusOffset
    self.focusOuterWidth = focusOuterWidth
    self.iconExtraSmall = iconExtraSmall
    self.iconLarge = iconLarge
    self.iconMedium = iconMedium
    self.iconSmall = iconSmall
    self.targetPointer = targetPointer
    self.targetSpacing = targetSpacing
    self.targetTouch = targetTouch
    self.extra = extra
  }

  /// One measure step by its token key, core or added; `nil` when this design system does not have it.
  public subscript(key: String) -> CGFloat? {
    switch key {
    case "border-hairline": return borderHairline
    case "border-thick": return borderThick
    case "breakpoint-expanded": return breakpointExpanded
    case "breakpoint-medium": return breakpointMedium
    case "focus-inner-width": return focusInnerWidth
    case "focus-offset": return focusOffset
    case "focus-outer-width": return focusOuterWidth
    case "icon-extra-small": return iconExtraSmall
    case "icon-large": return iconLarge
    case "icon-medium": return iconMedium
    case "icon-small": return iconSmall
    case "target-pointer": return targetPointer
    case "target-spacing": return targetSpacing
    case "target-touch": return targetTouch
    default: return extra[key]
    }
  }
}

/// Milliseconds.
public struct TanreiDuration: Sendable, Equatable {
  public var extraLong1: Double
  public var extraLong2: Double
  public var extraLong3: Double
  public var extraLong4: Double
  public var long1: Double
  public var long2: Double
  public var long3: Double
  public var long4: Double
  public var medium1: Double
  public var medium2: Double
  public var medium3: Double
  public var medium4: Double
  public var pressHold: Double
  public var short1: Double
  public var short2: Double
  public var short3: Double
  public var short4: Double
  public var stagger: Double
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [String: Double]

  public init(
    extraLong1: Double,
    extraLong2: Double,
    extraLong3: Double,
    extraLong4: Double,
    long1: Double,
    long2: Double,
    long3: Double,
    long4: Double,
    medium1: Double,
    medium2: Double,
    medium3: Double,
    medium4: Double,
    pressHold: Double,
    short1: Double,
    short2: Double,
    short3: Double,
    short4: Double,
    stagger: Double,
    extra: [String: Double] = [:]
  ) {
    self.extraLong1 = extraLong1
    self.extraLong2 = extraLong2
    self.extraLong3 = extraLong3
    self.extraLong4 = extraLong4
    self.long1 = long1
    self.long2 = long2
    self.long3 = long3
    self.long4 = long4
    self.medium1 = medium1
    self.medium2 = medium2
    self.medium3 = medium3
    self.medium4 = medium4
    self.pressHold = pressHold
    self.short1 = short1
    self.short2 = short2
    self.short3 = short3
    self.short4 = short4
    self.stagger = stagger
    self.extra = extra
  }

  /// One duration step by its token key, core or added; `nil` when this design system does not have it.
  public subscript(key: String) -> Double? {
    switch key {
    case "extra-long1": return extraLong1
    case "extra-long2": return extraLong2
    case "extra-long3": return extraLong3
    case "extra-long4": return extraLong4
    case "long1": return long1
    case "long2": return long2
    case "long3": return long3
    case "long4": return long4
    case "medium1": return medium1
    case "medium2": return medium2
    case "medium3": return medium3
    case "medium4": return medium4
    case "press-hold": return pressHold
    case "short1": return short1
    case "short2": return short2
    case "short3": return short3
    case "short4": return short4
    case "stagger": return stagger
    default: return extra[key]
    }
  }
}

public struct TanreiEasing: Sendable, Equatable {
  public var emphasizedAccelerate: TanreiCubicBezier
  public var emphasizedDecelerate: TanreiCubicBezier
  public var linear: TanreiCubicBezier
  public var standard: TanreiCubicBezier
  public var standardAccelerate: TanreiCubicBezier
  public var standardDecelerate: TanreiCubicBezier
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [String: TanreiCubicBezier]

  public init(
    emphasizedAccelerate: TanreiCubicBezier,
    emphasizedDecelerate: TanreiCubicBezier,
    linear: TanreiCubicBezier,
    standard: TanreiCubicBezier,
    standardAccelerate: TanreiCubicBezier,
    standardDecelerate: TanreiCubicBezier,
    extra: [String: TanreiCubicBezier] = [:]
  ) {
    self.emphasizedAccelerate = emphasizedAccelerate
    self.emphasizedDecelerate = emphasizedDecelerate
    self.linear = linear
    self.standard = standard
    self.standardAccelerate = standardAccelerate
    self.standardDecelerate = standardDecelerate
    self.extra = extra
  }

  /// One easing step by its token key, core or added; `nil` when this design system does not have it.
  public subscript(key: String) -> TanreiCubicBezier? {
    switch key {
    case "emphasized-accelerate": return emphasizedAccelerate
    case "emphasized-decelerate": return emphasizedDecelerate
    case "linear": return linear
    case "standard": return standard
    case "standard-accelerate": return standardAccelerate
    case "standard-decelerate": return standardDecelerate
    default: return extra[key]
    }
  }
}

/// The springs of one scheme.
public struct TanreiSpringSet: Sendable, Equatable {
  public var defaultEffects: TanreiSpringSpec
  public var defaultSpatial: TanreiSpringSpec
  public var fastEffects: TanreiSpringSpec
  public var fastSpatial: TanreiSpringSpec
  public var slowEffects: TanreiSpringSpec
  public var slowSpatial: TanreiSpringSpec
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [String: TanreiSpringSpec]

  public init(
    defaultEffects: TanreiSpringSpec,
    defaultSpatial: TanreiSpringSpec,
    fastEffects: TanreiSpringSpec,
    fastSpatial: TanreiSpringSpec,
    slowEffects: TanreiSpringSpec,
    slowSpatial: TanreiSpringSpec,
    extra: [String: TanreiSpringSpec] = [:]
  ) {
    self.defaultEffects = defaultEffects
    self.defaultSpatial = defaultSpatial
    self.fastEffects = fastEffects
    self.fastSpatial = fastSpatial
    self.slowEffects = slowEffects
    self.slowSpatial = slowSpatial
    self.extra = extra
  }

  /// One spring by its token key, core or added; `nil` when this design system does not have it.
  public subscript(key: String) -> TanreiSpringSpec? {
    switch key {
    case "default-effects": return defaultEffects
    case "default-spatial": return defaultSpatial
    case "fast-effects": return fastEffects
    case "fast-spatial": return fastSpatial
    case "slow-effects": return slowEffects
    case "slow-spatial": return slowSpatial
    default: return extra[key]
    }
  }
}

/// Spring schemes: how lively motion is.
public struct TanreiSprings: Sendable, Equatable {
  public var expressive: TanreiSpringSet
  public var standard: TanreiSpringSet
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [String: TanreiSpringSet]

  public init(
    expressive: TanreiSpringSet,
    standard: TanreiSpringSet,
    extra: [String: TanreiSpringSet] = [:]
  ) {
    self.expressive = expressive
    self.standard = standard
    self.extra = extra
  }

  /// One spring scheme by its token key, core or added; `nil` when this design system does not have it.
  public subscript(key: String) -> TanreiSpringSet? {
    switch key {
    case "expressive": return expressive
    case "standard": return standard
    default: return extra[key]
    }
  }
}

public struct TanreiMotionTokens: Sendable, Equatable {
  public var duration: TanreiDuration
  public var easing: TanreiEasing
  public var spring: TanreiSprings

  public init(
    duration: TanreiDuration,
    easing: TanreiEasing,
    spring: TanreiSprings
  ) {
    self.duration = duration
    self.easing = easing
    self.spring = spring
  }
}

/// A level may start with a ring — a layer with no offset, no blur and a positive spread: render that one as a border, the rest as shadows. Not every system has one.
public struct TanreiElevation: Sendable, Equatable {
  public var level0: [TanreiShadowLayer]
  public var level1: [TanreiShadowLayer]
  public var level2: [TanreiShadowLayer]
  public var level3: [TanreiShadowLayer]
  public var level4: [TanreiShadowLayer]
  public var level5: [TanreiShadowLayer]
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [String: [TanreiShadowLayer]]

  public init(
    level0: [TanreiShadowLayer],
    level1: [TanreiShadowLayer],
    level2: [TanreiShadowLayer],
    level3: [TanreiShadowLayer],
    level4: [TanreiShadowLayer],
    level5: [TanreiShadowLayer],
    extra: [String: [TanreiShadowLayer]] = [:]
  ) {
    self.level0 = level0
    self.level1 = level1
    self.level2 = level2
    self.level3 = level3
    self.level4 = level4
    self.level5 = level5
    self.extra = extra
  }

  /// One elevation step by its token key, core or added; `nil` when this design system does not have it.
  public subscript(key: String) -> [TanreiShadowLayer]? {
    switch key {
    case "level0": return level0
    case "level1": return level1
    case "level2": return level2
    case "level3": return level3
    case "level4": return level4
    case "level5": return level5
    default: return extra[key]
    }
  }
}

/// An icon set is a family per selection state: a variable font names one family twice and tells the
/// states apart with `FILL`; a static set names two families.
public struct TanreiIconFamilies: Sendable, Equatable {
  /// The icon font of something that is NOT selected.
  public var unselected: TanreiFontStack
  /// The icon font of something that is selected.
  public var selected: TanreiFontStack

  public init(
    unselected: TanreiFontStack,
    selected: TanreiFontStack
  ) {
    self.unselected = unselected
    self.selected = selected
  }
}

/// How icons are drawn: the icon font of each selection state and the axis values a variable font is drawn with.
/// The sizes are `TanreiMeasure.icon…`. Hand-written helpers on this type (`drawing(size:selected:)`) turn it into
/// a family, variation axes and a `Font`.
public struct TanreiIconStyle: Sendable, Equatable {
  /// The icon font of each selection state. Tanrei does not bundle it.
  public var families: TanreiIconFamilies
  /// The `wght` axis every icon is drawn with.
  public var weight: CGFloat
  /// The `wght` axis a control draws its own mark with (a checkbox's check, the glyph on a switch's handle).
  public var markWeight: CGFloat
  /// The `FILL` axis of an icon for something that is NOT selected.
  public var fillUnselected: Double
  /// The `FILL` axis of the same icon in its selected state.
  public var fillSelected: Double
  /// The smallest `opsz` the icon font draws; a box smaller than this is drawn at it.
  public var opticalSizeMin: CGFloat
  /// The largest `opsz` the icon font draws; a box larger than this is drawn at it.
  public var opticalSizeMax: CGFloat

  public init(
    families: TanreiIconFamilies,
    weight: CGFloat,
    markWeight: CGFloat,
    fillUnselected: Double,
    fillSelected: Double,
    opticalSizeMin: CGFloat,
    opticalSizeMax: CGFloat
  ) {
    self.families = families
    self.weight = weight
    self.markWeight = markWeight
    self.fillUnselected = fillUnselected
    self.fillSelected = fillSelected
    self.opticalSizeMin = opticalSizeMin
    self.opticalSizeMax = opticalSizeMax
  }
}

/// The named typefaces of a design system (`ref.typeface.*`). Text styles already carry their stack; this is for
/// a product that needs the face itself, and it lists what a product must install.
public struct TanreiTypefaces: Sendable, Equatable {
  public var brand: TanreiFontStack
  public var plain: TanreiFontStack
  public var mono: TanreiFontStack
  public var icon: TanreiFontStack

  public init(
    brand: TanreiFontStack,
    plain: TanreiFontStack,
    mono: TanreiFontStack,
    icon: TanreiFontStack
  ) {
    self.brand = brand
    self.plain = plain
    self.mono = mono
    self.icon = icon
  }
}

/// How keyboard focus is drawn from the two focus colors and the focus measures (BTN-10).
/// A design system chooses among these; it cannot add one. The first is the default.
public enum TanreiFocusStyle: String, Sendable, Hashable, CaseIterable {
  case ring
  case glow
}

/// The choice `tanrei.sys.behavior.link-underline`.
/// A design system chooses among these; it cannot add one. The first is the default.
public enum TanreiLinkUnderline: String, Sendable, Hashable, CaseIterable {
  case always
  case hover
  case never
}

/// How a control answers a press (BTN-9). The pressed tokens still decide colors and opacity.
/// A design system chooses among these; it cannot add one. The first is the default.
public enum TanreiPressedFeedback: String, Sendable, Hashable, CaseIterable {
  case overlay
  case ripple
  case dim
  case none
}

/// The choice `tanrei.sys.behavior.requirement-mark`.
/// A design system chooses among these; it cannot add one. The first is the default.
public enum TanreiRequirementMark: String, Sendable, Hashable, CaseIterable {
  case tag
  case asterisk
  case none
}

/// The choice `tanrei.sys.behavior.separation`.
/// A design system chooses among these; it cannot add one. The first is the default.
public enum TanreiSeparation: String, Sendable, Hashable, CaseIterable {
  case divider
  case gap
}

/// Choices of kind: what a design system does, where the other tokens say how much.
public struct TanreiBehavior: Sendable, Equatable {
  /// `tanrei.sys.behavior.focus-style`
  public var focusStyle: TanreiFocusStyle
  /// `tanrei.sys.behavior.link-underline`
  public var linkUnderline: TanreiLinkUnderline
  /// `tanrei.sys.behavior.pressed-feedback`
  public var pressedFeedback: TanreiPressedFeedback
  /// `tanrei.sys.behavior.requirement-mark`
  public var requirementMark: TanreiRequirementMark
  /// `tanrei.sys.behavior.separation`
  public var separation: TanreiSeparation

  public init(
    focusStyle: TanreiFocusStyle,
    linkUnderline: TanreiLinkUnderline,
    pressedFeedback: TanreiPressedFeedback,
    requirementMark: TanreiRequirementMark,
    separation: TanreiSeparation
  ) {
    self.focusStyle = focusStyle
    self.linkUnderline = linkUnderline
    self.pressedFeedback = pressedFeedback
    self.requirementMark = requirementMark
    self.separation = separation
  }
}

/// A value of accordion's `variant` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiAccordionVariant(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiAccordionVariant: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let plain = TanreiAccordionVariant(rawValue: "plain")
  public static let outlined = TanreiAccordionVariant(rawValue: "outlined")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiAccordionVariant] = [.plain, .outlined]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiAccordionVariant.plain
}

/// How one variant of accordion is drawn in one state.
public struct TanreiAccordionVariantStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var labelColor: TanreiPaint
  public var supportingTextColor: TanreiPaint
  public var trailingTextColor: TanreiPaint
  public var iconColor: TanreiPaint
  public var chevronColor: TanreiPaint
  public var stateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    labelColor: TanreiPaint,
    supportingTextColor: TanreiPaint,
    trailingTextColor: TanreiPaint,
    iconColor: TanreiPaint,
    chevronColor: TanreiPaint,
    stateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.labelColor = labelColor
    self.supportingTextColor = supportingTextColor
    self.trailingTextColor = trailingTextColor
    self.iconColor = iconColor
    self.chevronColor = chevronColor
    self.stateLayerColor = stateLayerColor
  }
}

/// One variant of accordion: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiAccordionVariantTokens: Sendable, Equatable {
  public var enabled: TanreiAccordionVariantStateTokens
  public var hovered: TanreiAccordionVariantStateTokens
  public var focused: TanreiAccordionVariantStateTokens
  public var pressed: TanreiAccordionVariantStateTokens
  public var disabled: TanreiAccordionVariantStateTokens

  public init(
    enabled: TanreiAccordionVariantStateTokens,
    hovered: TanreiAccordionVariantStateTokens,
    focused: TanreiAccordionVariantStateTokens,
    pressed: TanreiAccordionVariantStateTokens,
    disabled: TanreiAccordionVariantStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiAccordionVariantStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The variants of accordion: named fields for the core values, `extra` for what a design system added.
/// Read one with `variants[key]`.
public struct TanreiAccordionVariants: Sendable, Equatable {
  public var plain: TanreiAccordionVariantTokens
  public var outlined: TanreiAccordionVariantTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiAccordionVariant: TanreiAccordionVariantTokens]

  public init(
    plain: TanreiAccordionVariantTokens,
    outlined: TanreiAccordionVariantTokens,
    extra: [TanreiAccordionVariant: TanreiAccordionVariantTokens] = [:]
  ) {
    self.plain = plain
    self.outlined = outlined
    self.extra = extra
  }

  /// The tokens of one accordion variant, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiAccordionVariant) -> TanreiAccordionVariantTokens? {
    switch key {
    case .plain: return plain
    case .outlined: return outlined
    default: return extra[key]
    }
  }

  /// Total lookup: a accordion variant this design system does not have reads the tokens of `plain`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiAccordionVariant) -> TanreiAccordionVariantTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no accordion variant \"\(key.rawValue)\"; using \"plain\"")
    return plain
  }

  /// Every accordion variant of this design system: the core ones, then what it added.
  public var keys: [TanreiAccordionVariant] { TanreiAccordionVariant.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of accordion's `density` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiAccordionDensity(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiAccordionDensity: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let regular = TanreiAccordionDensity(rawValue: "regular")
  public static let compact = TanreiAccordionDensity(rawValue: "compact")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiAccordionDensity] = [.regular, .compact]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiAccordionDensity.regular
}

/// Everything of accordion that depends on its density.
public struct TanreiAccordionDensityTokens: Sendable, Equatable {
  public var containerHeight: CGFloat
  public var containerPaddingBlock: CGFloat
  public var containerPaddingInline: CGFloat
  public var labelTypescale: TanreiTextStyle
  public var supportingTextTypescale: TanreiTextStyle
  public var trailingTextTypescale: TanreiTextStyle
  public var iconSize: CGFloat
  public var chevronSize: CGFloat
  public var contentPaddingBlockEnd: CGFloat

  public init(
    containerHeight: CGFloat,
    containerPaddingBlock: CGFloat,
    containerPaddingInline: CGFloat,
    labelTypescale: TanreiTextStyle,
    supportingTextTypescale: TanreiTextStyle,
    trailingTextTypescale: TanreiTextStyle,
    iconSize: CGFloat,
    chevronSize: CGFloat,
    contentPaddingBlockEnd: CGFloat
  ) {
    self.containerHeight = containerHeight
    self.containerPaddingBlock = containerPaddingBlock
    self.containerPaddingInline = containerPaddingInline
    self.labelTypescale = labelTypescale
    self.supportingTextTypescale = supportingTextTypescale
    self.trailingTextTypescale = trailingTextTypescale
    self.iconSize = iconSize
    self.chevronSize = chevronSize
    self.contentPaddingBlockEnd = contentPaddingBlockEnd
  }
}

/// The densitys of accordion: named fields for the core values, `extra` for what a design system added.
/// Read one with `densitys[key]`.
public struct TanreiAccordionDensitys: Sendable, Equatable {
  public var regular: TanreiAccordionDensityTokens
  public var compact: TanreiAccordionDensityTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiAccordionDensity: TanreiAccordionDensityTokens]

  public init(
    regular: TanreiAccordionDensityTokens,
    compact: TanreiAccordionDensityTokens,
    extra: [TanreiAccordionDensity: TanreiAccordionDensityTokens] = [:]
  ) {
    self.regular = regular
    self.compact = compact
    self.extra = extra
  }

  /// The tokens of one accordion density, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiAccordionDensity) -> TanreiAccordionDensityTokens? {
    switch key {
    case .regular: return regular
    case .compact: return compact
    default: return extra[key]
    }
  }

  /// Total lookup: a accordion density this design system does not have reads the tokens of `regular`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiAccordionDensity) -> TanreiAccordionDensityTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no accordion density \"\(key.rawValue)\"; using \"regular\"")
    return regular
  }

  /// Every accordion density of this design system: the core ones, then what it added.
  public var keys: [TanreiAccordionDensity] { TanreiAccordionDensity.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of accordion that depend on the state but not on the variant.
public struct TanreiAccordionStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of accordion (comp.accordion).
public struct TanreiAccordionTokens: Sendable, Equatable {
  public var containerGap: CGFloat
  public var containerShape: CGFloat
  public var dividerColor: TanreiPaint
  public var dividerThickness: CGFloat
  public var itemGap: CGFloat
  public var motionDisclosureDuration: Double
  public var motionDisclosureEasing: TanreiCubicBezier
  public var motionFeedbackDuration: Double
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var outlineColor: TanreiPaint
  public var outlineShape: CGFloat
  public var outlineWidth: CGFloat
  public var separation: Double
  public var variants: TanreiAccordionVariants
  public var densitys: TanreiAccordionDensitys
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiAccordionStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiAccordionStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiAccordionStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiAccordionStateTokens

  public init(
    containerGap: CGFloat,
    containerShape: CGFloat,
    dividerColor: TanreiPaint,
    dividerThickness: CGFloat,
    itemGap: CGFloat,
    motionDisclosureDuration: Double,
    motionDisclosureEasing: TanreiCubicBezier,
    motionFeedbackDuration: Double,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    outlineColor: TanreiPaint,
    outlineShape: CGFloat,
    outlineWidth: CGFloat,
    separation: Double,
    variants: TanreiAccordionVariants,
    densitys: TanreiAccordionDensitys,
    hovered: TanreiAccordionStateTokens,
    focused: TanreiAccordionStateTokens,
    pressed: TanreiAccordionStateTokens,
    disabled: TanreiAccordionStateTokens
  ) {
    self.containerGap = containerGap
    self.containerShape = containerShape
    self.dividerColor = dividerColor
    self.dividerThickness = dividerThickness
    self.itemGap = itemGap
    self.motionDisclosureDuration = motionDisclosureDuration
    self.motionDisclosureEasing = motionDisclosureEasing
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.outlineColor = outlineColor
    self.outlineShape = outlineShape
    self.outlineWidth = outlineWidth
    self.separation = separation
    self.variants = variants
    self.densitys = densitys
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which accordion has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiAccordionStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// A value of app-bar's `size` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiAppBarSize(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiAppBarSize: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let small = TanreiAppBarSize(rawValue: "small")
  public static let large = TanreiAppBarSize(rawValue: "large")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiAppBarSize] = [.small, .large]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiAppBarSize.small
}

/// Everything of app-bar that depends on its size.
public struct TanreiAppBarSizeTokens: Sendable, Equatable {
  public var containerHeight: CGFloat
  public var titleTypescale: TanreiTextStyle
  public var subtitleTypescale: TanreiTextStyle

  public init(
    containerHeight: CGFloat,
    titleTypescale: TanreiTextStyle,
    subtitleTypescale: TanreiTextStyle
  ) {
    self.containerHeight = containerHeight
    self.titleTypescale = titleTypescale
    self.subtitleTypescale = subtitleTypescale
  }
}

/// The sizes of app-bar: named fields for the core values, `extra` for what a design system added.
/// Read one with `sizes[key]`.
public struct TanreiAppBarSizes: Sendable, Equatable {
  public var small: TanreiAppBarSizeTokens
  public var large: TanreiAppBarSizeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiAppBarSize: TanreiAppBarSizeTokens]

  public init(
    small: TanreiAppBarSizeTokens,
    large: TanreiAppBarSizeTokens,
    extra: [TanreiAppBarSize: TanreiAppBarSizeTokens] = [:]
  ) {
    self.small = small
    self.large = large
    self.extra = extra
  }

  /// The tokens of one app-bar size, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiAppBarSize) -> TanreiAppBarSizeTokens? {
    switch key {
    case .small: return small
    case .large: return large
    default: return extra[key]
    }
  }

  /// Total lookup: a app-bar size this design system does not have reads the tokens of `small`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiAppBarSize) -> TanreiAppBarSizeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no app-bar size \"\(key.rawValue)\"; using \"small\"")
    return small
  }

  /// Every app-bar size of this design system: the core ones, then what it added.
  public var keys: [TanreiAppBarSize] { TanreiAppBarSize.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of app-bar's `condition` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiAppBarCondition(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiAppBarCondition: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let flat = TanreiAppBarCondition(rawValue: "flat")
  public static let scrolled = TanreiAppBarCondition(rawValue: "scrolled")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiAppBarCondition] = [.flat, .scrolled]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiAppBarCondition.flat
}

/// Everything of app-bar that depends on its condition.
public struct TanreiAppBarConditionTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var containerElevation: [TanreiShadowLayer]
  public var outlineColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    containerElevation: [TanreiShadowLayer],
    outlineColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.containerElevation = containerElevation
    self.outlineColor = outlineColor
  }
}

/// The conditions of app-bar: named fields for the core values, `extra` for what a design system added.
/// Read one with `conditions[key]`.
public struct TanreiAppBarConditions: Sendable, Equatable {
  public var flat: TanreiAppBarConditionTokens
  public var scrolled: TanreiAppBarConditionTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiAppBarCondition: TanreiAppBarConditionTokens]

  public init(
    flat: TanreiAppBarConditionTokens,
    scrolled: TanreiAppBarConditionTokens,
    extra: [TanreiAppBarCondition: TanreiAppBarConditionTokens] = [:]
  ) {
    self.flat = flat
    self.scrolled = scrolled
    self.extra = extra
  }

  /// The tokens of one app-bar condition, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiAppBarCondition) -> TanreiAppBarConditionTokens? {
    switch key {
    case .flat: return flat
    case .scrolled: return scrolled
    default: return extra[key]
    }
  }

  /// Total lookup: a app-bar condition this design system does not have reads the tokens of `flat`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiAppBarCondition) -> TanreiAppBarConditionTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no app-bar condition \"\(key.rawValue)\"; using \"flat\"")
    return flat
  }

  /// Every app-bar condition of this design system: the core ones, then what it added.
  public var keys: [TanreiAppBarCondition] { TanreiAppBarCondition.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Component tokens of app-bar (comp.app-bar).
public struct TanreiAppBarTokens: Sendable, Equatable {
  public var actionsGap: CGFloat
  public var containerGap: CGFloat
  public var containerPaddingBlockEnd: CGFloat
  public var containerPaddingInline: CGFloat
  public var motionConditionDuration: Double
  public var motionConditionEasing: TanreiCubicBezier
  public var outlineWidth: CGFloat
  public var subtitleColor: TanreiPaint
  public var titleColor: TanreiPaint
  public var titleInset: CGFloat
  public var sizes: TanreiAppBarSizes
  public var conditions: TanreiAppBarConditions

  public init(
    actionsGap: CGFloat,
    containerGap: CGFloat,
    containerPaddingBlockEnd: CGFloat,
    containerPaddingInline: CGFloat,
    motionConditionDuration: Double,
    motionConditionEasing: TanreiCubicBezier,
    outlineWidth: CGFloat,
    subtitleColor: TanreiPaint,
    titleColor: TanreiPaint,
    titleInset: CGFloat,
    sizes: TanreiAppBarSizes,
    conditions: TanreiAppBarConditions
  ) {
    self.actionsGap = actionsGap
    self.containerGap = containerGap
    self.containerPaddingBlockEnd = containerPaddingBlockEnd
    self.containerPaddingInline = containerPaddingInline
    self.motionConditionDuration = motionConditionDuration
    self.motionConditionEasing = motionConditionEasing
    self.outlineWidth = outlineWidth
    self.subtitleColor = subtitleColor
    self.titleColor = titleColor
    self.titleInset = titleInset
    self.sizes = sizes
    self.conditions = conditions
  }
}

/// Component tokens of app-shell (comp.app-shell).
public struct TanreiAppShellTokens: Sendable, Equatable {
  public var asideGap: CGFloat
  public var asidePaddingInline: CGFloat
  public var asideWidth: CGFloat
  public var breakpointExpanded: CGFloat
  public var breakpointMedium: CGFloat
  public var containerColor: TanreiPaint
  public var contentColor: TanreiPaint
  public var footerPaddingBlock: CGFloat
  public var gutterCompact: CGFloat
  public var gutterExpanded: CGFloat
  public var gutterMedium: CGFloat
  public var mainMaxWidth: CGFloat
  public var mainPaddingBlock: CGFloat
  public var outlineColor: TanreiPaint
  public var outlineWidth: CGFloat
  public var separation: Double
  public var skipLinkContainerColor: TanreiPaint
  public var skipLinkContainerElevation: [TanreiShadowLayer]
  public var skipLinkContainerPaddingBlock: CGFloat
  public var skipLinkContainerPaddingInline: CGFloat
  public var skipLinkContainerShape: CGFloat
  public var skipLinkLabelTypescale: TanreiTextStyle
  public var skipLinkOffset: CGFloat

  public init(
    asideGap: CGFloat,
    asidePaddingInline: CGFloat,
    asideWidth: CGFloat,
    breakpointExpanded: CGFloat,
    breakpointMedium: CGFloat,
    containerColor: TanreiPaint,
    contentColor: TanreiPaint,
    footerPaddingBlock: CGFloat,
    gutterCompact: CGFloat,
    gutterExpanded: CGFloat,
    gutterMedium: CGFloat,
    mainMaxWidth: CGFloat,
    mainPaddingBlock: CGFloat,
    outlineColor: TanreiPaint,
    outlineWidth: CGFloat,
    separation: Double,
    skipLinkContainerColor: TanreiPaint,
    skipLinkContainerElevation: [TanreiShadowLayer],
    skipLinkContainerPaddingBlock: CGFloat,
    skipLinkContainerPaddingInline: CGFloat,
    skipLinkContainerShape: CGFloat,
    skipLinkLabelTypescale: TanreiTextStyle,
    skipLinkOffset: CGFloat
  ) {
    self.asideGap = asideGap
    self.asidePaddingInline = asidePaddingInline
    self.asideWidth = asideWidth
    self.breakpointExpanded = breakpointExpanded
    self.breakpointMedium = breakpointMedium
    self.containerColor = containerColor
    self.contentColor = contentColor
    self.footerPaddingBlock = footerPaddingBlock
    self.gutterCompact = gutterCompact
    self.gutterExpanded = gutterExpanded
    self.gutterMedium = gutterMedium
    self.mainMaxWidth = mainMaxWidth
    self.mainPaddingBlock = mainPaddingBlock
    self.outlineColor = outlineColor
    self.outlineWidth = outlineWidth
    self.separation = separation
    self.skipLinkContainerColor = skipLinkContainerColor
    self.skipLinkContainerElevation = skipLinkContainerElevation
    self.skipLinkContainerPaddingBlock = skipLinkContainerPaddingBlock
    self.skipLinkContainerPaddingInline = skipLinkContainerPaddingInline
    self.skipLinkContainerShape = skipLinkContainerShape
    self.skipLinkLabelTypescale = skipLinkLabelTypescale
    self.skipLinkOffset = skipLinkOffset
  }
}

/// A value of avatar's `size` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiAvatarSize(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiAvatarSize: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let small = TanreiAvatarSize(rawValue: "small")
  public static let medium = TanreiAvatarSize(rawValue: "medium")
  public static let large = TanreiAvatarSize(rawValue: "large")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiAvatarSize] = [.small, .medium, .large]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiAvatarSize.medium
}

/// Everything of avatar that depends on its size.
public struct TanreiAvatarSizeTokens: Sendable, Equatable {
  public var containerSize: CGFloat
  public var labelTypescale: TanreiTextStyle
  public var iconSize: CGFloat
  public var groupOverlap: CGFloat

  public init(
    containerSize: CGFloat,
    labelTypescale: TanreiTextStyle,
    iconSize: CGFloat,
    groupOverlap: CGFloat
  ) {
    self.containerSize = containerSize
    self.labelTypescale = labelTypescale
    self.iconSize = iconSize
    self.groupOverlap = groupOverlap
  }
}

/// The sizes of avatar: named fields for the core values, `extra` for what a design system added.
/// Read one with `sizes[key]`.
public struct TanreiAvatarSizes: Sendable, Equatable {
  public var small: TanreiAvatarSizeTokens
  public var medium: TanreiAvatarSizeTokens
  public var large: TanreiAvatarSizeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiAvatarSize: TanreiAvatarSizeTokens]

  public init(
    small: TanreiAvatarSizeTokens,
    medium: TanreiAvatarSizeTokens,
    large: TanreiAvatarSizeTokens,
    extra: [TanreiAvatarSize: TanreiAvatarSizeTokens] = [:]
  ) {
    self.small = small
    self.medium = medium
    self.large = large
    self.extra = extra
  }

  /// The tokens of one avatar size, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiAvatarSize) -> TanreiAvatarSizeTokens? {
    switch key {
    case .small: return small
    case .medium: return medium
    case .large: return large
    default: return extra[key]
    }
  }

  /// Total lookup: a avatar size this design system does not have reads the tokens of `medium`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiAvatarSize) -> TanreiAvatarSizeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no avatar size \"\(key.rawValue)\"; using \"medium\"")
    return medium
  }

  /// Every avatar size of this design system: the core ones, then what it added.
  public var keys: [TanreiAvatarSize] { TanreiAvatarSize.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of avatar's `shape` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiAvatarShape(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiAvatarShape: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let circle = TanreiAvatarShape(rawValue: "circle")
  public static let square = TanreiAvatarShape(rawValue: "square")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiAvatarShape] = [.circle, .square]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiAvatarShape.circle
}

/// Everything of avatar that depends on its shape.
public struct TanreiAvatarShapeTokens: Sendable, Equatable {
  public var containerShape: CGFloat

  public init(
    containerShape: CGFloat
  ) {
    self.containerShape = containerShape
  }
}

/// The shapes of avatar: named fields for the core values, `extra` for what a design system added.
/// Read one with `shapes[key]`.
public struct TanreiAvatarShapes: Sendable, Equatable {
  public var circle: TanreiAvatarShapeTokens
  public var square: TanreiAvatarShapeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiAvatarShape: TanreiAvatarShapeTokens]

  public init(
    circle: TanreiAvatarShapeTokens,
    square: TanreiAvatarShapeTokens,
    extra: [TanreiAvatarShape: TanreiAvatarShapeTokens] = [:]
  ) {
    self.circle = circle
    self.square = square
    self.extra = extra
  }

  /// The tokens of one avatar shape, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiAvatarShape) -> TanreiAvatarShapeTokens? {
    switch key {
    case .circle: return circle
    case .square: return square
    default: return extra[key]
    }
  }

  /// Total lookup: a avatar shape this design system does not have reads the tokens of `circle`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiAvatarShape) -> TanreiAvatarShapeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no avatar shape \"\(key.rawValue)\"; using \"circle\"")
    return circle
  }

  /// Every avatar shape of this design system: the core ones, then what it added.
  public var keys: [TanreiAvatarShape] { TanreiAvatarShape.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Component tokens of avatar (comp.avatar).
public struct TanreiAvatarTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var groupOutlineColor: TanreiPaint
  public var groupOutlineWidth: CGFloat
  public var iconColor: TanreiPaint
  public var labelColor: TanreiPaint
  public var sizes: TanreiAvatarSizes
  public var shapes: TanreiAvatarShapes

  public init(
    containerColor: TanreiPaint,
    groupOutlineColor: TanreiPaint,
    groupOutlineWidth: CGFloat,
    iconColor: TanreiPaint,
    labelColor: TanreiPaint,
    sizes: TanreiAvatarSizes,
    shapes: TanreiAvatarShapes
  ) {
    self.containerColor = containerColor
    self.groupOutlineColor = groupOutlineColor
    self.groupOutlineWidth = groupOutlineWidth
    self.iconColor = iconColor
    self.labelColor = labelColor
    self.sizes = sizes
    self.shapes = shapes
  }
}

/// Component tokens of badge (comp.badge).
public struct TanreiBadgeTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var containerHeight: CGFloat
  public var containerOffset: CGFloat
  public var containerPaddingInline: CGFloat
  public var containerShape: CGFloat
  public var dotOffset: CGFloat
  public var dotSize: CGFloat
  public var labelColor: TanreiPaint
  public var labelTypescale: TanreiTextStyle
  public var outlineColor: TanreiPaint
  public var outlineWidth: CGFloat

  public init(
    containerColor: TanreiPaint,
    containerHeight: CGFloat,
    containerOffset: CGFloat,
    containerPaddingInline: CGFloat,
    containerShape: CGFloat,
    dotOffset: CGFloat,
    dotSize: CGFloat,
    labelColor: TanreiPaint,
    labelTypescale: TanreiTextStyle,
    outlineColor: TanreiPaint,
    outlineWidth: CGFloat
  ) {
    self.containerColor = containerColor
    self.containerHeight = containerHeight
    self.containerOffset = containerOffset
    self.containerPaddingInline = containerPaddingInline
    self.containerShape = containerShape
    self.dotOffset = dotOffset
    self.dotSize = dotSize
    self.labelColor = labelColor
    self.labelTypescale = labelTypescale
    self.outlineColor = outlineColor
    self.outlineWidth = outlineWidth
  }
}

/// A value of bottom-sheet's `control` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiBottomSheetControl(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiBottomSheetControl: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let dragHandle = TanreiBottomSheetControl(rawValue: "drag-handle")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiBottomSheetControl] = [.dragHandle]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiBottomSheetControl.dragHandle
}

/// How one control of bottom-sheet is drawn in one state.
public struct TanreiBottomSheetControlStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var gripColor: TanreiPaint
  public var stateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    gripColor: TanreiPaint,
    stateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.gripColor = gripColor
    self.stateLayerColor = stateLayerColor
  }
}

/// One control of bottom-sheet: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiBottomSheetControlTokens: Sendable, Equatable {
  public var enabled: TanreiBottomSheetControlStateTokens
  public var hovered: TanreiBottomSheetControlStateTokens
  public var focused: TanreiBottomSheetControlStateTokens
  public var pressed: TanreiBottomSheetControlStateTokens

  public init(
    enabled: TanreiBottomSheetControlStateTokens,
    hovered: TanreiBottomSheetControlStateTokens,
    focused: TanreiBottomSheetControlStateTokens,
    pressed: TanreiBottomSheetControlStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
  }

  /// The tokens of this control of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `disabled`, which bottom-sheet has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiBottomSheetControlStateTokens? {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return nil
    }
  }
}

/// The controls of bottom-sheet: named fields for the core values, `extra` for what a design system added.
/// Read one with `controls[key]`.
public struct TanreiBottomSheetControls: Sendable, Equatable {
  public var dragHandle: TanreiBottomSheetControlTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiBottomSheetControl: TanreiBottomSheetControlTokens]

  public init(
    dragHandle: TanreiBottomSheetControlTokens,
    extra: [TanreiBottomSheetControl: TanreiBottomSheetControlTokens] = [:]
  ) {
    self.dragHandle = dragHandle
    self.extra = extra
  }

  /// The tokens of one bottom-sheet control, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiBottomSheetControl) -> TanreiBottomSheetControlTokens? {
    switch key {
    case .dragHandle: return dragHandle
    default: return extra[key]
    }
  }

  /// Total lookup: a bottom-sheet control this design system does not have reads the tokens of `drag-handle`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiBottomSheetControl) -> TanreiBottomSheetControlTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no bottom-sheet control \"\(key.rawValue)\"; using \"drag-handle\"")
    return dragHandle
  }

  /// Every bottom-sheet control of this design system: the core ones, then what it added.
  public var keys: [TanreiBottomSheetControl] { TanreiBottomSheetControl.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of bottom-sheet that depend on the state but not on the variant.
public struct TanreiBottomSheetStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of bottom-sheet (comp.bottom-sheet).
public struct TanreiBottomSheetTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var containerElevation: [TanreiShadowLayer]
  public var containerMarginBlockStart: CGFloat
  public var containerMaxWidth: CGFloat
  public var containerPadding: CGFloat
  public var containerPartialFraction: Double
  public var containerShape: CGFloat
  public var contentColor: TanreiPaint
  public var handleContainerHeight: CGFloat
  public var handleContainerShape: CGFloat
  public var handleContainerWidth: CGFloat
  public var handleGripHeight: CGFloat
  public var handleGripShape: CGFloat
  public var handleGripWidth: CGFloat
  public var handleMarginBlock: CGFloat
  public var motionEnterDuration: Double
  public var motionEnterEasing: TanreiCubicBezier
  public var motionExitDuration: Double
  public var motionExitEasing: TanreiCubicBezier
  public var motionFeedbackDuration: Double
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var scrimColor: TanreiPaint
  public var controls: TanreiBottomSheetControls
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiBottomSheetStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiBottomSheetStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiBottomSheetStateTokens

  public init(
    containerColor: TanreiPaint,
    containerElevation: [TanreiShadowLayer],
    containerMarginBlockStart: CGFloat,
    containerMaxWidth: CGFloat,
    containerPadding: CGFloat,
    containerPartialFraction: Double,
    containerShape: CGFloat,
    contentColor: TanreiPaint,
    handleContainerHeight: CGFloat,
    handleContainerShape: CGFloat,
    handleContainerWidth: CGFloat,
    handleGripHeight: CGFloat,
    handleGripShape: CGFloat,
    handleGripWidth: CGFloat,
    handleMarginBlock: CGFloat,
    motionEnterDuration: Double,
    motionEnterEasing: TanreiCubicBezier,
    motionExitDuration: Double,
    motionExitEasing: TanreiCubicBezier,
    motionFeedbackDuration: Double,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    scrimColor: TanreiPaint,
    controls: TanreiBottomSheetControls,
    hovered: TanreiBottomSheetStateTokens,
    focused: TanreiBottomSheetStateTokens,
    pressed: TanreiBottomSheetStateTokens
  ) {
    self.containerColor = containerColor
    self.containerElevation = containerElevation
    self.containerMarginBlockStart = containerMarginBlockStart
    self.containerMaxWidth = containerMaxWidth
    self.containerPadding = containerPadding
    self.containerPartialFraction = containerPartialFraction
    self.containerShape = containerShape
    self.contentColor = contentColor
    self.handleContainerHeight = handleContainerHeight
    self.handleContainerShape = handleContainerShape
    self.handleContainerWidth = handleContainerWidth
    self.handleGripHeight = handleGripHeight
    self.handleGripShape = handleGripShape
    self.handleGripWidth = handleGripWidth
    self.handleMarginBlock = handleMarginBlock
    self.motionEnterDuration = motionEnterDuration
    self.motionEnterEasing = motionEnterEasing
    self.motionExitDuration = motionExitDuration
    self.motionExitEasing = motionExitEasing
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.scrimColor = scrimColor
    self.controls = controls
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, `disabled`, which bottom-sheet has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiBottomSheetStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return nil
    }
  }
}

/// A value of breadcrumbs's `part` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiBreadcrumbsPart(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiBreadcrumbsPart: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let item = TanreiBreadcrumbsPart(rawValue: "item")
  public static let current = TanreiBreadcrumbsPart(rawValue: "current")
  public static let overflow = TanreiBreadcrumbsPart(rawValue: "overflow")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiBreadcrumbsPart] = [.item, .current, .overflow]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiBreadcrumbsPart.item
}

/// How one part of breadcrumbs is drawn in one state.
public struct TanreiBreadcrumbsPartStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var contentColor: TanreiPaint
  public var stateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    contentColor: TanreiPaint,
    stateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.contentColor = contentColor
    self.stateLayerColor = stateLayerColor
  }
}

/// One part of breadcrumbs: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiBreadcrumbsPartTokens: Sendable, Equatable {
  public var enabled: TanreiBreadcrumbsPartStateTokens
  public var hovered: TanreiBreadcrumbsPartStateTokens
  public var focused: TanreiBreadcrumbsPartStateTokens
  public var pressed: TanreiBreadcrumbsPartStateTokens

  public init(
    enabled: TanreiBreadcrumbsPartStateTokens,
    hovered: TanreiBreadcrumbsPartStateTokens,
    focused: TanreiBreadcrumbsPartStateTokens,
    pressed: TanreiBreadcrumbsPartStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
  }

  /// The tokens of this part of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `disabled`, which breadcrumbs has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiBreadcrumbsPartStateTokens? {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return nil
    }
  }
}

/// The parts of breadcrumbs: named fields for the core values, `extra` for what a design system added.
/// Read one with `parts[key]`.
public struct TanreiBreadcrumbsParts: Sendable, Equatable {
  public var item: TanreiBreadcrumbsPartTokens
  public var current: TanreiBreadcrumbsPartTokens
  public var overflow: TanreiBreadcrumbsPartTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiBreadcrumbsPart: TanreiBreadcrumbsPartTokens]

  public init(
    item: TanreiBreadcrumbsPartTokens,
    current: TanreiBreadcrumbsPartTokens,
    overflow: TanreiBreadcrumbsPartTokens,
    extra: [TanreiBreadcrumbsPart: TanreiBreadcrumbsPartTokens] = [:]
  ) {
    self.item = item
    self.current = current
    self.overflow = overflow
    self.extra = extra
  }

  /// The tokens of one breadcrumbs part, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiBreadcrumbsPart) -> TanreiBreadcrumbsPartTokens? {
    switch key {
    case .item: return item
    case .current: return current
    case .overflow: return overflow
    default: return extra[key]
    }
  }

  /// Total lookup: a breadcrumbs part this design system does not have reads the tokens of `item`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiBreadcrumbsPart) -> TanreiBreadcrumbsPartTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no breadcrumbs part \"\(key.rawValue)\"; using \"item\"")
    return item
  }

  /// Every breadcrumbs part of this design system: the core ones, then what it added.
  public var keys: [TanreiBreadcrumbsPart] { TanreiBreadcrumbsPart.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of breadcrumbs that depend on the state but not on the variant.
public struct TanreiBreadcrumbsStateTokens: Sendable, Equatable {
  public var containerShape: CGFloat
  public var opacity: Double

  public init(
    containerShape: CGFloat,
    opacity: Double
  ) {
    self.containerShape = containerShape
    self.opacity = opacity
  }
}

/// Component tokens of breadcrumbs (comp.breadcrumbs).
public struct TanreiBreadcrumbsTokens: Sendable, Equatable {
  public var containerGap: CGFloat
  public var containerShape: CGFloat
  public var iconSize: CGFloat
  public var labelColor: TanreiPaint
  public var labelTypescale: TanreiTextStyle
  public var motionFeedbackDuration: Double
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var rowGap: CGFloat
  public var separatorColor: TanreiPaint
  public var separatorGap: CGFloat
  public var separatorSize: CGFloat
  public var underlineOffset: CGFloat
  public var underlineVisibility: Double
  public var underlineWidth: CGFloat
  public var parts: TanreiBreadcrumbsParts
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiBreadcrumbsStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiBreadcrumbsStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiBreadcrumbsStateTokens

  public init(
    containerGap: CGFloat,
    containerShape: CGFloat,
    iconSize: CGFloat,
    labelColor: TanreiPaint,
    labelTypescale: TanreiTextStyle,
    motionFeedbackDuration: Double,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    rowGap: CGFloat,
    separatorColor: TanreiPaint,
    separatorGap: CGFloat,
    separatorSize: CGFloat,
    underlineOffset: CGFloat,
    underlineVisibility: Double,
    underlineWidth: CGFloat,
    parts: TanreiBreadcrumbsParts,
    hovered: TanreiBreadcrumbsStateTokens,
    focused: TanreiBreadcrumbsStateTokens,
    pressed: TanreiBreadcrumbsStateTokens
  ) {
    self.containerGap = containerGap
    self.containerShape = containerShape
    self.iconSize = iconSize
    self.labelColor = labelColor
    self.labelTypescale = labelTypescale
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.rowGap = rowGap
    self.separatorColor = separatorColor
    self.separatorGap = separatorGap
    self.separatorSize = separatorSize
    self.underlineOffset = underlineOffset
    self.underlineVisibility = underlineVisibility
    self.underlineWidth = underlineWidth
    self.parts = parts
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, `disabled`, which breadcrumbs has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiBreadcrumbsStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return nil
    }
  }
}

/// Component tokens of button-group (comp.button-group).
public struct TanreiButtonGroupTokens: Sendable, Equatable {
  public var connectedDividerColor: TanreiPaint
  public var connectedDividerInset: CGFloat
  public var connectedDividerOnFillColor: TanreiPaint
  public var connectedDividerThickness: CGFloat
  public var connectedGap: CGFloat
  public var connectedHorizontalOuterInset: CGFloat
  public var connectedHorizontalOuterShape: CGFloat
  public var connectedInnerShape: CGFloat
  public var connectedSeparation: Double
  public var connectedVerticalOuterShape: CGFloat
  public var standardGap: CGFloat

  public init(
    connectedDividerColor: TanreiPaint,
    connectedDividerInset: CGFloat,
    connectedDividerOnFillColor: TanreiPaint,
    connectedDividerThickness: CGFloat,
    connectedGap: CGFloat,
    connectedHorizontalOuterInset: CGFloat,
    connectedHorizontalOuterShape: CGFloat,
    connectedInnerShape: CGFloat,
    connectedSeparation: Double,
    connectedVerticalOuterShape: CGFloat,
    standardGap: CGFloat
  ) {
    self.connectedDividerColor = connectedDividerColor
    self.connectedDividerInset = connectedDividerInset
    self.connectedDividerOnFillColor = connectedDividerOnFillColor
    self.connectedDividerThickness = connectedDividerThickness
    self.connectedGap = connectedGap
    self.connectedHorizontalOuterInset = connectedHorizontalOuterInset
    self.connectedHorizontalOuterShape = connectedHorizontalOuterShape
    self.connectedInnerShape = connectedInnerShape
    self.connectedSeparation = connectedSeparation
    self.connectedVerticalOuterShape = connectedVerticalOuterShape
    self.standardGap = standardGap
  }
}

/// A value of button-with-menu's `size` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiButtonWithMenuSize(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiButtonWithMenuSize: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let small = TanreiButtonWithMenuSize(rawValue: "small")
  public static let medium = TanreiButtonWithMenuSize(rawValue: "medium")
  public static let large = TanreiButtonWithMenuSize(rawValue: "large")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiButtonWithMenuSize] = [.small, .medium, .large]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiButtonWithMenuSize.medium
}

/// Everything of button-with-menu that depends on its size.
public struct TanreiButtonWithMenuSizeTokens: Sendable, Equatable {
  public var containerHeight: CGFloat
  public var containerPaddingBlock: CGFloat
  public var containerGap: CGFloat
  public var leadingPaddingInlineStart: CGFloat
  public var leadingPaddingInlineStartWithIcon: CGFloat
  public var leadingPaddingInlineEnd: CGFloat
  public var trailingPaddingInline: CGFloat
  public var trailingPaddingInlineNarrow: CGFloat
  public var labelTypescale: TanreiTextStyle
  public var iconSize: CGFloat
  public var outlineWidth: CGFloat

  public init(
    containerHeight: CGFloat,
    containerPaddingBlock: CGFloat,
    containerGap: CGFloat,
    leadingPaddingInlineStart: CGFloat,
    leadingPaddingInlineStartWithIcon: CGFloat,
    leadingPaddingInlineEnd: CGFloat,
    trailingPaddingInline: CGFloat,
    trailingPaddingInlineNarrow: CGFloat,
    labelTypescale: TanreiTextStyle,
    iconSize: CGFloat,
    outlineWidth: CGFloat
  ) {
    self.containerHeight = containerHeight
    self.containerPaddingBlock = containerPaddingBlock
    self.containerGap = containerGap
    self.leadingPaddingInlineStart = leadingPaddingInlineStart
    self.leadingPaddingInlineStartWithIcon = leadingPaddingInlineStartWithIcon
    self.leadingPaddingInlineEnd = leadingPaddingInlineEnd
    self.trailingPaddingInline = trailingPaddingInline
    self.trailingPaddingInlineNarrow = trailingPaddingInlineNarrow
    self.labelTypescale = labelTypescale
    self.iconSize = iconSize
    self.outlineWidth = outlineWidth
  }
}

/// The sizes of button-with-menu: named fields for the core values, `extra` for what a design system added.
/// Read one with `sizes[key]`.
public struct TanreiButtonWithMenuSizes: Sendable, Equatable {
  public var small: TanreiButtonWithMenuSizeTokens
  public var medium: TanreiButtonWithMenuSizeTokens
  public var large: TanreiButtonWithMenuSizeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiButtonWithMenuSize: TanreiButtonWithMenuSizeTokens]

  public init(
    small: TanreiButtonWithMenuSizeTokens,
    medium: TanreiButtonWithMenuSizeTokens,
    large: TanreiButtonWithMenuSizeTokens,
    extra: [TanreiButtonWithMenuSize: TanreiButtonWithMenuSizeTokens] = [:]
  ) {
    self.small = small
    self.medium = medium
    self.large = large
    self.extra = extra
  }

  /// The tokens of one button-with-menu size, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiButtonWithMenuSize) -> TanreiButtonWithMenuSizeTokens? {
    switch key {
    case .small: return small
    case .medium: return medium
    case .large: return large
    default: return extra[key]
    }
  }

  /// Total lookup: a button-with-menu size this design system does not have reads the tokens of `medium`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiButtonWithMenuSize) -> TanreiButtonWithMenuSizeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no button-with-menu size \"\(key.rawValue)\"; using \"medium\"")
    return medium
  }

  /// Every button-with-menu size of this design system: the core ones, then what it added.
  public var keys: [TanreiButtonWithMenuSize] { TanreiButtonWithMenuSize.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of button-with-menu's `variant` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiButtonWithMenuVariant(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiButtonWithMenuVariant: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let filled = TanreiButtonWithMenuVariant(rawValue: "filled")
  public static let tonal = TanreiButtonWithMenuVariant(rawValue: "tonal")
  public static let elevated = TanreiButtonWithMenuVariant(rawValue: "elevated")
  public static let outlined = TanreiButtonWithMenuVariant(rawValue: "outlined")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiButtonWithMenuVariant] = [.filled, .tonal, .elevated, .outlined]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiButtonWithMenuVariant.filled
}

/// How one variant of button-with-menu is drawn in one state.
public struct TanreiButtonWithMenuVariantStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var containerElevation: [TanreiShadowLayer]
  public var labelColor: TanreiPaint
  public var outlineColor: TanreiPaint
  public var dividerColor: TanreiPaint
  public var stateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    containerElevation: [TanreiShadowLayer],
    labelColor: TanreiPaint,
    outlineColor: TanreiPaint,
    dividerColor: TanreiPaint,
    stateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.containerElevation = containerElevation
    self.labelColor = labelColor
    self.outlineColor = outlineColor
    self.dividerColor = dividerColor
    self.stateLayerColor = stateLayerColor
  }
}

/// One variant of button-with-menu: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiButtonWithMenuVariantTokens: Sendable, Equatable {
  public var enabled: TanreiButtonWithMenuVariantStateTokens
  public var hovered: TanreiButtonWithMenuVariantStateTokens
  public var focused: TanreiButtonWithMenuVariantStateTokens
  public var pressed: TanreiButtonWithMenuVariantStateTokens
  public var disabled: TanreiButtonWithMenuVariantStateTokens

  public init(
    enabled: TanreiButtonWithMenuVariantStateTokens,
    hovered: TanreiButtonWithMenuVariantStateTokens,
    focused: TanreiButtonWithMenuVariantStateTokens,
    pressed: TanreiButtonWithMenuVariantStateTokens,
    disabled: TanreiButtonWithMenuVariantStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiButtonWithMenuVariantStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The variants of button-with-menu: named fields for the core values, `extra` for what a design system added.
/// Read one with `variants[key]`.
public struct TanreiButtonWithMenuVariants: Sendable, Equatable {
  public var filled: TanreiButtonWithMenuVariantTokens
  public var tonal: TanreiButtonWithMenuVariantTokens
  public var elevated: TanreiButtonWithMenuVariantTokens
  public var outlined: TanreiButtonWithMenuVariantTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiButtonWithMenuVariant: TanreiButtonWithMenuVariantTokens]

  public init(
    filled: TanreiButtonWithMenuVariantTokens,
    tonal: TanreiButtonWithMenuVariantTokens,
    elevated: TanreiButtonWithMenuVariantTokens,
    outlined: TanreiButtonWithMenuVariantTokens,
    extra: [TanreiButtonWithMenuVariant: TanreiButtonWithMenuVariantTokens] = [:]
  ) {
    self.filled = filled
    self.tonal = tonal
    self.elevated = elevated
    self.outlined = outlined
    self.extra = extra
  }

  /// The tokens of one button-with-menu variant, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiButtonWithMenuVariant) -> TanreiButtonWithMenuVariantTokens? {
    switch key {
    case .filled: return filled
    case .tonal: return tonal
    case .elevated: return elevated
    case .outlined: return outlined
    default: return extra[key]
    }
  }

  /// Total lookup: a button-with-menu variant this design system does not have reads the tokens of `filled`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiButtonWithMenuVariant) -> TanreiButtonWithMenuVariantTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no button-with-menu variant \"\(key.rawValue)\"; using \"filled\"")
    return filled
  }

  /// Every button-with-menu variant of this design system: the core ones, then what it added.
  public var keys: [TanreiButtonWithMenuVariant] { TanreiButtonWithMenuVariant.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of button-with-menu that depend on the state but not on the variant.
public struct TanreiButtonWithMenuStateTokens: Sendable, Equatable {
  public var containerShape: CGFloat
  public var opacity: Double

  public init(
    containerShape: CGFloat,
    opacity: Double
  ) {
    self.containerShape = containerShape
    self.opacity = opacity
  }
}

/// Component tokens of button-with-menu (comp.button-with-menu).
public struct TanreiButtonWithMenuTokens: Sendable, Equatable {
  public var containerInnerGap: CGFloat
  public var containerInnerShape: CGFloat
  public var containerInnerShapeOpen: CGFloat
  public var containerOuterInset: CGFloat
  public var containerSeparation: Double
  public var containerShape: CGFloat
  public var dividerInset: CGFloat
  public var dividerThickness: CGFloat
  public var motionFeedbackDuration: Double
  public var motionHoverCloseDelay: Double
  public var motionHoverOpenDelay: Double
  public var motionOpenDuration: Double
  public var motionOpenEasing: TanreiCubicBezier
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var sizes: TanreiButtonWithMenuSizes
  public var variants: TanreiButtonWithMenuVariants
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiButtonWithMenuStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiButtonWithMenuStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiButtonWithMenuStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiButtonWithMenuStateTokens

  public init(
    containerInnerGap: CGFloat,
    containerInnerShape: CGFloat,
    containerInnerShapeOpen: CGFloat,
    containerOuterInset: CGFloat,
    containerSeparation: Double,
    containerShape: CGFloat,
    dividerInset: CGFloat,
    dividerThickness: CGFloat,
    motionFeedbackDuration: Double,
    motionHoverCloseDelay: Double,
    motionHoverOpenDelay: Double,
    motionOpenDuration: Double,
    motionOpenEasing: TanreiCubicBezier,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    sizes: TanreiButtonWithMenuSizes,
    variants: TanreiButtonWithMenuVariants,
    hovered: TanreiButtonWithMenuStateTokens,
    focused: TanreiButtonWithMenuStateTokens,
    pressed: TanreiButtonWithMenuStateTokens,
    disabled: TanreiButtonWithMenuStateTokens
  ) {
    self.containerInnerGap = containerInnerGap
    self.containerInnerShape = containerInnerShape
    self.containerInnerShapeOpen = containerInnerShapeOpen
    self.containerOuterInset = containerOuterInset
    self.containerSeparation = containerSeparation
    self.containerShape = containerShape
    self.dividerInset = dividerInset
    self.dividerThickness = dividerThickness
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionHoverCloseDelay = motionHoverCloseDelay
    self.motionHoverOpenDelay = motionHoverOpenDelay
    self.motionOpenDuration = motionOpenDuration
    self.motionOpenEasing = motionOpenEasing
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.sizes = sizes
    self.variants = variants
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which button-with-menu has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiButtonWithMenuStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// A value of button's `size` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiButtonSize(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiButtonSize: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let small = TanreiButtonSize(rawValue: "small")
  public static let medium = TanreiButtonSize(rawValue: "medium")
  public static let large = TanreiButtonSize(rawValue: "large")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiButtonSize] = [.small, .medium, .large]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiButtonSize.medium
}

/// Everything of button that depends on its size.
public struct TanreiButtonSizeTokens: Sendable, Equatable {
  public var containerHeight: CGFloat
  public var containerPaddingInlineNarrow: CGFloat
  public var containerWidthWide: CGFloat
  public var containerPaddingInlineStart: CGFloat
  public var containerPaddingInlineEnd: CGFloat
  public var containerPaddingInlineStartWithIcon: CGFloat
  public var containerPaddingInlineEndWithIcon: CGFloat
  public var containerPaddingBlock: CGFloat
  public var labelTypescale: TanreiTextStyle
  public var iconSize: CGFloat
  public var iconSizeWithoutLabel: CGFloat
  public var containerGap: CGFloat
  public var outlineWidth: CGFloat

  public init(
    containerHeight: CGFloat,
    containerPaddingInlineNarrow: CGFloat,
    containerWidthWide: CGFloat,
    containerPaddingInlineStart: CGFloat,
    containerPaddingInlineEnd: CGFloat,
    containerPaddingInlineStartWithIcon: CGFloat,
    containerPaddingInlineEndWithIcon: CGFloat,
    containerPaddingBlock: CGFloat,
    labelTypescale: TanreiTextStyle,
    iconSize: CGFloat,
    iconSizeWithoutLabel: CGFloat,
    containerGap: CGFloat,
    outlineWidth: CGFloat
  ) {
    self.containerHeight = containerHeight
    self.containerPaddingInlineNarrow = containerPaddingInlineNarrow
    self.containerWidthWide = containerWidthWide
    self.containerPaddingInlineStart = containerPaddingInlineStart
    self.containerPaddingInlineEnd = containerPaddingInlineEnd
    self.containerPaddingInlineStartWithIcon = containerPaddingInlineStartWithIcon
    self.containerPaddingInlineEndWithIcon = containerPaddingInlineEndWithIcon
    self.containerPaddingBlock = containerPaddingBlock
    self.labelTypescale = labelTypescale
    self.iconSize = iconSize
    self.iconSizeWithoutLabel = iconSizeWithoutLabel
    self.containerGap = containerGap
    self.outlineWidth = outlineWidth
  }
}

/// The sizes of button: named fields for the core values, `extra` for what a design system added.
/// Read one with `sizes[key]`.
public struct TanreiButtonSizes: Sendable, Equatable {
  public var small: TanreiButtonSizeTokens
  public var medium: TanreiButtonSizeTokens
  public var large: TanreiButtonSizeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiButtonSize: TanreiButtonSizeTokens]

  public init(
    small: TanreiButtonSizeTokens,
    medium: TanreiButtonSizeTokens,
    large: TanreiButtonSizeTokens,
    extra: [TanreiButtonSize: TanreiButtonSizeTokens] = [:]
  ) {
    self.small = small
    self.medium = medium
    self.large = large
    self.extra = extra
  }

  /// The tokens of one button size, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiButtonSize) -> TanreiButtonSizeTokens? {
    switch key {
    case .small: return small
    case .medium: return medium
    case .large: return large
    default: return extra[key]
    }
  }

  /// Total lookup: a button size this design system does not have reads the tokens of `medium`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiButtonSize) -> TanreiButtonSizeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no button size \"\(key.rawValue)\"; using \"medium\"")
    return medium
  }

  /// Every button size of this design system: the core ones, then what it added.
  public var keys: [TanreiButtonSize] { TanreiButtonSize.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of button's `variant` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiButtonVariant(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiButtonVariant: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let filled = TanreiButtonVariant(rawValue: "filled")
  public static let tonal = TanreiButtonVariant(rawValue: "tonal")
  public static let elevated = TanreiButtonVariant(rawValue: "elevated")
  public static let outlined = TanreiButtonVariant(rawValue: "outlined")
  public static let text = TanreiButtonVariant(rawValue: "text")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiButtonVariant] = [.filled, .tonal, .elevated, .outlined, .text]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiButtonVariant.filled
}

/// How one variant of button is drawn in one state.
public struct TanreiButtonVariantStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var labelColor: TanreiPaint
  public var iconColor: TanreiPaint
  public var outlineColor: TanreiPaint
  public var stateLayerColor: TanreiPaint
  public var containerElevation: [TanreiShadowLayer]
  public var unselectedContainerColor: TanreiPaint
  public var unselectedLabelColor: TanreiPaint
  public var unselectedIconColor: TanreiPaint
  public var unselectedOutlineColor: TanreiPaint
  public var unselectedStateLayerColor: TanreiPaint
  public var selectedContainerColor: TanreiPaint
  public var selectedLabelColor: TanreiPaint
  public var selectedIconColor: TanreiPaint
  public var selectedOutlineColor: TanreiPaint
  public var selectedStateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    labelColor: TanreiPaint,
    iconColor: TanreiPaint,
    outlineColor: TanreiPaint,
    stateLayerColor: TanreiPaint,
    containerElevation: [TanreiShadowLayer],
    unselectedContainerColor: TanreiPaint,
    unselectedLabelColor: TanreiPaint,
    unselectedIconColor: TanreiPaint,
    unselectedOutlineColor: TanreiPaint,
    unselectedStateLayerColor: TanreiPaint,
    selectedContainerColor: TanreiPaint,
    selectedLabelColor: TanreiPaint,
    selectedIconColor: TanreiPaint,
    selectedOutlineColor: TanreiPaint,
    selectedStateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.labelColor = labelColor
    self.iconColor = iconColor
    self.outlineColor = outlineColor
    self.stateLayerColor = stateLayerColor
    self.containerElevation = containerElevation
    self.unselectedContainerColor = unselectedContainerColor
    self.unselectedLabelColor = unselectedLabelColor
    self.unselectedIconColor = unselectedIconColor
    self.unselectedOutlineColor = unselectedOutlineColor
    self.unselectedStateLayerColor = unselectedStateLayerColor
    self.selectedContainerColor = selectedContainerColor
    self.selectedLabelColor = selectedLabelColor
    self.selectedIconColor = selectedIconColor
    self.selectedOutlineColor = selectedOutlineColor
    self.selectedStateLayerColor = selectedStateLayerColor
  }
}

/// One variant of button: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiButtonVariantTokens: Sendable, Equatable {
  public var enabled: TanreiButtonVariantStateTokens
  public var hovered: TanreiButtonVariantStateTokens
  public var focused: TanreiButtonVariantStateTokens
  public var pressed: TanreiButtonVariantStateTokens
  public var disabled: TanreiButtonVariantStateTokens

  public init(
    enabled: TanreiButtonVariantStateTokens,
    hovered: TanreiButtonVariantStateTokens,
    focused: TanreiButtonVariantStateTokens,
    pressed: TanreiButtonVariantStateTokens,
    disabled: TanreiButtonVariantStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiButtonVariantStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The variants of button: named fields for the core values, `extra` for what a design system added.
/// Read one with `variants[key]`.
public struct TanreiButtonVariants: Sendable, Equatable {
  public var filled: TanreiButtonVariantTokens
  public var tonal: TanreiButtonVariantTokens
  public var elevated: TanreiButtonVariantTokens
  public var outlined: TanreiButtonVariantTokens
  public var text: TanreiButtonVariantTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiButtonVariant: TanreiButtonVariantTokens]

  public init(
    filled: TanreiButtonVariantTokens,
    tonal: TanreiButtonVariantTokens,
    elevated: TanreiButtonVariantTokens,
    outlined: TanreiButtonVariantTokens,
    text: TanreiButtonVariantTokens,
    extra: [TanreiButtonVariant: TanreiButtonVariantTokens] = [:]
  ) {
    self.filled = filled
    self.tonal = tonal
    self.elevated = elevated
    self.outlined = outlined
    self.text = text
    self.extra = extra
  }

  /// The tokens of one button variant, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiButtonVariant) -> TanreiButtonVariantTokens? {
    switch key {
    case .filled: return filled
    case .tonal: return tonal
    case .elevated: return elevated
    case .outlined: return outlined
    case .text: return text
    default: return extra[key]
    }
  }

  /// Total lookup: a button variant this design system does not have reads the tokens of `filled`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiButtonVariant) -> TanreiButtonVariantTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no button variant \"\(key.rawValue)\"; using \"filled\"")
    return filled
  }

  /// Every button variant of this design system: the core ones, then what it added.
  public var keys: [TanreiButtonVariant] { TanreiButtonVariant.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of button that depend on the state but not on the variant.
public struct TanreiButtonStateTokens: Sendable, Equatable {
  public var containerShape: CGFloat
  public var opacity: Double

  public init(
    containerShape: CGFloat,
    opacity: Double
  ) {
    self.containerShape = containerShape
    self.opacity = opacity
  }
}

/// Component tokens of button (comp.button).
public struct TanreiButtonTokens: Sendable, Equatable {
  public var containerShape: CGFloat
  public var motionFeedbackDuration: Double
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var sizes: TanreiButtonSizes
  public var variants: TanreiButtonVariants
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiButtonStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiButtonStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiButtonStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiButtonStateTokens

  public init(
    containerShape: CGFloat,
    motionFeedbackDuration: Double,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    sizes: TanreiButtonSizes,
    variants: TanreiButtonVariants,
    hovered: TanreiButtonStateTokens,
    focused: TanreiButtonStateTokens,
    pressed: TanreiButtonStateTokens,
    disabled: TanreiButtonStateTokens
  ) {
    self.containerShape = containerShape
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.sizes = sizes
    self.variants = variants
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which button has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiButtonStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// A value of calendar's `condition` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiCalendarCondition(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiCalendarCondition: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let unselected = TanreiCalendarCondition(rawValue: "unselected")
  public static let adjacent = TanreiCalendarCondition(rawValue: "adjacent")
  public static let today = TanreiCalendarCondition(rawValue: "today")
  public static let selected = TanreiCalendarCondition(rawValue: "selected")
  public static let inRange = TanreiCalendarCondition(rawValue: "in-range")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiCalendarCondition] = [.unselected, .adjacent, .today, .selected, .inRange]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiCalendarCondition.unselected
}

/// How one condition of calendar is drawn in one state.
public struct TanreiCalendarConditionStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var labelColor: TanreiPaint
  public var outlineColor: TanreiPaint
  public var stateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    labelColor: TanreiPaint,
    outlineColor: TanreiPaint,
    stateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.labelColor = labelColor
    self.outlineColor = outlineColor
    self.stateLayerColor = stateLayerColor
  }
}

/// One condition of calendar: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiCalendarConditionTokens: Sendable, Equatable {
  public var enabled: TanreiCalendarConditionStateTokens
  public var hovered: TanreiCalendarConditionStateTokens
  public var focused: TanreiCalendarConditionStateTokens
  public var pressed: TanreiCalendarConditionStateTokens
  public var disabled: TanreiCalendarConditionStateTokens

  public init(
    enabled: TanreiCalendarConditionStateTokens,
    hovered: TanreiCalendarConditionStateTokens,
    focused: TanreiCalendarConditionStateTokens,
    pressed: TanreiCalendarConditionStateTokens,
    disabled: TanreiCalendarConditionStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this condition of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiCalendarConditionStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The conditions of calendar: named fields for the core values, `extra` for what a design system added.
/// Read one with `conditions[key]`.
public struct TanreiCalendarConditions: Sendable, Equatable {
  public var unselected: TanreiCalendarConditionTokens
  public var adjacent: TanreiCalendarConditionTokens
  public var today: TanreiCalendarConditionTokens
  public var selected: TanreiCalendarConditionTokens
  public var inRange: TanreiCalendarConditionTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiCalendarCondition: TanreiCalendarConditionTokens]

  public init(
    unselected: TanreiCalendarConditionTokens,
    adjacent: TanreiCalendarConditionTokens,
    today: TanreiCalendarConditionTokens,
    selected: TanreiCalendarConditionTokens,
    inRange: TanreiCalendarConditionTokens,
    extra: [TanreiCalendarCondition: TanreiCalendarConditionTokens] = [:]
  ) {
    self.unselected = unselected
    self.adjacent = adjacent
    self.today = today
    self.selected = selected
    self.inRange = inRange
    self.extra = extra
  }

  /// The tokens of one calendar condition, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiCalendarCondition) -> TanreiCalendarConditionTokens? {
    switch key {
    case .unselected: return unselected
    case .adjacent: return adjacent
    case .today: return today
    case .selected: return selected
    case .inRange: return inRange
    default: return extra[key]
    }
  }

  /// Total lookup: a calendar condition this design system does not have reads the tokens of `unselected`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiCalendarCondition) -> TanreiCalendarConditionTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no calendar condition \"\(key.rawValue)\"; using \"unselected\"")
    return unselected
  }

  /// Every calendar condition of this design system: the core ones, then what it added.
  public var keys: [TanreiCalendarCondition] { TanreiCalendarCondition.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of calendar that depend on the state but not on the variant.
public struct TanreiCalendarStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of calendar (comp.calendar).
public struct TanreiCalendarTokens: Sendable, Equatable {
  public var cellSize: CGFloat
  public var dayContainerShape: CGFloat
  public var dayContainerSize: CGFloat
  public var dayLabelTypescale: TanreiTextStyle
  public var motionFeedbackDuration: Double
  public var motionPageDuration: Double
  public var motionPageEasing: TanreiCubicBezier
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var navigationAxis: Double
  public var navigationGap: CGFloat
  public var outlineWidth: CGFloat
  public var viewToggleContainerHeight: CGFloat
  public var viewToggleContainerPaddingInline: CGFloat
  public var viewToggleContainerShape: CGFloat
  public var viewToggleGap: CGFloat
  public var viewToggleIconSize: CGFloat
  public var viewToggleLabelTypescale: TanreiTextStyle
  public var weekdayColor: TanreiPaint
  public var weekdayTypescale: TanreiTextStyle
  public var yearContainerHeight: CGFloat
  public var yearContainerShape: CGFloat
  public var yearContainerWidth: CGFloat
  public var yearLabelTypescale: TanreiTextStyle
  public var conditions: TanreiCalendarConditions
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiCalendarStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiCalendarStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiCalendarStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiCalendarStateTokens

  public init(
    cellSize: CGFloat,
    dayContainerShape: CGFloat,
    dayContainerSize: CGFloat,
    dayLabelTypescale: TanreiTextStyle,
    motionFeedbackDuration: Double,
    motionPageDuration: Double,
    motionPageEasing: TanreiCubicBezier,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    navigationAxis: Double,
    navigationGap: CGFloat,
    outlineWidth: CGFloat,
    viewToggleContainerHeight: CGFloat,
    viewToggleContainerPaddingInline: CGFloat,
    viewToggleContainerShape: CGFloat,
    viewToggleGap: CGFloat,
    viewToggleIconSize: CGFloat,
    viewToggleLabelTypescale: TanreiTextStyle,
    weekdayColor: TanreiPaint,
    weekdayTypescale: TanreiTextStyle,
    yearContainerHeight: CGFloat,
    yearContainerShape: CGFloat,
    yearContainerWidth: CGFloat,
    yearLabelTypescale: TanreiTextStyle,
    conditions: TanreiCalendarConditions,
    hovered: TanreiCalendarStateTokens,
    focused: TanreiCalendarStateTokens,
    pressed: TanreiCalendarStateTokens,
    disabled: TanreiCalendarStateTokens
  ) {
    self.cellSize = cellSize
    self.dayContainerShape = dayContainerShape
    self.dayContainerSize = dayContainerSize
    self.dayLabelTypescale = dayLabelTypescale
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionPageDuration = motionPageDuration
    self.motionPageEasing = motionPageEasing
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.navigationAxis = navigationAxis
    self.navigationGap = navigationGap
    self.outlineWidth = outlineWidth
    self.viewToggleContainerHeight = viewToggleContainerHeight
    self.viewToggleContainerPaddingInline = viewToggleContainerPaddingInline
    self.viewToggleContainerShape = viewToggleContainerShape
    self.viewToggleGap = viewToggleGap
    self.viewToggleIconSize = viewToggleIconSize
    self.viewToggleLabelTypescale = viewToggleLabelTypescale
    self.weekdayColor = weekdayColor
    self.weekdayTypescale = weekdayTypescale
    self.yearContainerHeight = yearContainerHeight
    self.yearContainerShape = yearContainerShape
    self.yearContainerWidth = yearContainerWidth
    self.yearLabelTypescale = yearLabelTypescale
    self.conditions = conditions
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which calendar has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiCalendarStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// A value of callout's `control` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiCalloutControl(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiCalloutControl: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let close = TanreiCalloutControl(rawValue: "close")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiCalloutControl] = [.close]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiCalloutControl.close
}

/// How one control of callout is drawn in one state.
public struct TanreiCalloutControlStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var contentColor: TanreiPaint
  public var stateLayerColor: TanreiPaint
  public var infoContainerColor: TanreiPaint
  public var infoContentColor: TanreiPaint
  public var infoStateLayerColor: TanreiPaint
  public var warningContainerColor: TanreiPaint
  public var warningContentColor: TanreiPaint
  public var warningStateLayerColor: TanreiPaint
  public var errorContainerColor: TanreiPaint
  public var errorContentColor: TanreiPaint
  public var errorStateLayerColor: TanreiPaint
  public var successContainerColor: TanreiPaint
  public var successContentColor: TanreiPaint
  public var successStateLayerColor: TanreiPaint
  public var outlinedContainerColor: TanreiPaint
  public var outlinedContentColor: TanreiPaint
  public var outlinedStateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    contentColor: TanreiPaint,
    stateLayerColor: TanreiPaint,
    infoContainerColor: TanreiPaint,
    infoContentColor: TanreiPaint,
    infoStateLayerColor: TanreiPaint,
    warningContainerColor: TanreiPaint,
    warningContentColor: TanreiPaint,
    warningStateLayerColor: TanreiPaint,
    errorContainerColor: TanreiPaint,
    errorContentColor: TanreiPaint,
    errorStateLayerColor: TanreiPaint,
    successContainerColor: TanreiPaint,
    successContentColor: TanreiPaint,
    successStateLayerColor: TanreiPaint,
    outlinedContainerColor: TanreiPaint,
    outlinedContentColor: TanreiPaint,
    outlinedStateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.contentColor = contentColor
    self.stateLayerColor = stateLayerColor
    self.infoContainerColor = infoContainerColor
    self.infoContentColor = infoContentColor
    self.infoStateLayerColor = infoStateLayerColor
    self.warningContainerColor = warningContainerColor
    self.warningContentColor = warningContentColor
    self.warningStateLayerColor = warningStateLayerColor
    self.errorContainerColor = errorContainerColor
    self.errorContentColor = errorContentColor
    self.errorStateLayerColor = errorStateLayerColor
    self.successContainerColor = successContainerColor
    self.successContentColor = successContentColor
    self.successStateLayerColor = successStateLayerColor
    self.outlinedContainerColor = outlinedContainerColor
    self.outlinedContentColor = outlinedContentColor
    self.outlinedStateLayerColor = outlinedStateLayerColor
  }
}

/// One control of callout: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiCalloutControlTokens: Sendable, Equatable {
  public var enabled: TanreiCalloutControlStateTokens
  public var hovered: TanreiCalloutControlStateTokens
  public var focused: TanreiCalloutControlStateTokens
  public var pressed: TanreiCalloutControlStateTokens

  public init(
    enabled: TanreiCalloutControlStateTokens,
    hovered: TanreiCalloutControlStateTokens,
    focused: TanreiCalloutControlStateTokens,
    pressed: TanreiCalloutControlStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
  }

  /// The tokens of this control of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `disabled`, which callout has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiCalloutControlStateTokens? {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return nil
    }
  }
}

/// The controls of callout: named fields for the core values, `extra` for what a design system added.
/// Read one with `controls[key]`.
public struct TanreiCalloutControls: Sendable, Equatable {
  public var close: TanreiCalloutControlTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiCalloutControl: TanreiCalloutControlTokens]

  public init(
    close: TanreiCalloutControlTokens,
    extra: [TanreiCalloutControl: TanreiCalloutControlTokens] = [:]
  ) {
    self.close = close
    self.extra = extra
  }

  /// The tokens of one callout control, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiCalloutControl) -> TanreiCalloutControlTokens? {
    switch key {
    case .close: return close
    default: return extra[key]
    }
  }

  /// Total lookup: a callout control this design system does not have reads the tokens of `close`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiCalloutControl) -> TanreiCalloutControlTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no callout control \"\(key.rawValue)\"; using \"close\"")
    return close
  }

  /// Every callout control of this design system: the core ones, then what it added.
  public var keys: [TanreiCalloutControl] { TanreiCalloutControl.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of callout's `size` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiCalloutSize(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiCalloutSize: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let medium = TanreiCalloutSize(rawValue: "medium")
  public static let large = TanreiCalloutSize(rawValue: "large")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiCalloutSize] = [.medium, .large]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiCalloutSize.medium
}

/// Everything of callout that depends on its size.
public struct TanreiCalloutSizeTokens: Sendable, Equatable {
  public var titleTypescale: TanreiTextStyle
  public var bodyTypescale: TanreiTextStyle

  public init(
    titleTypescale: TanreiTextStyle,
    bodyTypescale: TanreiTextStyle
  ) {
    self.titleTypescale = titleTypescale
    self.bodyTypescale = bodyTypescale
  }
}

/// The sizes of callout: named fields for the core values, `extra` for what a design system added.
/// Read one with `sizes[key]`.
public struct TanreiCalloutSizes: Sendable, Equatable {
  public var medium: TanreiCalloutSizeTokens
  public var large: TanreiCalloutSizeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiCalloutSize: TanreiCalloutSizeTokens]

  public init(
    medium: TanreiCalloutSizeTokens,
    large: TanreiCalloutSizeTokens,
    extra: [TanreiCalloutSize: TanreiCalloutSizeTokens] = [:]
  ) {
    self.medium = medium
    self.large = large
    self.extra = extra
  }

  /// The tokens of one callout size, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiCalloutSize) -> TanreiCalloutSizeTokens? {
    switch key {
    case .medium: return medium
    case .large: return large
    default: return extra[key]
    }
  }

  /// Total lookup: a callout size this design system does not have reads the tokens of `medium`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiCalloutSize) -> TanreiCalloutSizeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no callout size \"\(key.rawValue)\"; using \"medium\"")
    return medium
  }

  /// Every callout size of this design system: the core ones, then what it added.
  public var keys: [TanreiCalloutSize] { TanreiCalloutSize.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of callout's `variant` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiCalloutVariant(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiCalloutVariant: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let tonal = TanreiCalloutVariant(rawValue: "tonal")
  public static let outlined = TanreiCalloutVariant(rawValue: "outlined")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiCalloutVariant] = [.tonal, .outlined]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiCalloutVariant.tonal
}

/// Everything of callout that depends on its variant.
public struct TanreiCalloutVariantTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var titleColor: TanreiPaint
  public var bodyColor: TanreiPaint
  public var iconColor: TanreiPaint
  public var focusRingColor: TanreiPaint
  public var infoContainerColor: TanreiPaint
  public var infoTitleColor: TanreiPaint
  public var infoBodyColor: TanreiPaint
  public var infoIconColor: TanreiPaint
  public var infoFocusRingColor: TanreiPaint
  public var warningContainerColor: TanreiPaint
  public var warningTitleColor: TanreiPaint
  public var warningBodyColor: TanreiPaint
  public var warningIconColor: TanreiPaint
  public var warningFocusRingColor: TanreiPaint
  public var errorContainerColor: TanreiPaint
  public var errorTitleColor: TanreiPaint
  public var errorBodyColor: TanreiPaint
  public var errorIconColor: TanreiPaint
  public var errorFocusRingColor: TanreiPaint
  public var successContainerColor: TanreiPaint
  public var successTitleColor: TanreiPaint
  public var successBodyColor: TanreiPaint
  public var successIconColor: TanreiPaint
  public var successFocusRingColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    titleColor: TanreiPaint,
    bodyColor: TanreiPaint,
    iconColor: TanreiPaint,
    focusRingColor: TanreiPaint,
    infoContainerColor: TanreiPaint,
    infoTitleColor: TanreiPaint,
    infoBodyColor: TanreiPaint,
    infoIconColor: TanreiPaint,
    infoFocusRingColor: TanreiPaint,
    warningContainerColor: TanreiPaint,
    warningTitleColor: TanreiPaint,
    warningBodyColor: TanreiPaint,
    warningIconColor: TanreiPaint,
    warningFocusRingColor: TanreiPaint,
    errorContainerColor: TanreiPaint,
    errorTitleColor: TanreiPaint,
    errorBodyColor: TanreiPaint,
    errorIconColor: TanreiPaint,
    errorFocusRingColor: TanreiPaint,
    successContainerColor: TanreiPaint,
    successTitleColor: TanreiPaint,
    successBodyColor: TanreiPaint,
    successIconColor: TanreiPaint,
    successFocusRingColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.titleColor = titleColor
    self.bodyColor = bodyColor
    self.iconColor = iconColor
    self.focusRingColor = focusRingColor
    self.infoContainerColor = infoContainerColor
    self.infoTitleColor = infoTitleColor
    self.infoBodyColor = infoBodyColor
    self.infoIconColor = infoIconColor
    self.infoFocusRingColor = infoFocusRingColor
    self.warningContainerColor = warningContainerColor
    self.warningTitleColor = warningTitleColor
    self.warningBodyColor = warningBodyColor
    self.warningIconColor = warningIconColor
    self.warningFocusRingColor = warningFocusRingColor
    self.errorContainerColor = errorContainerColor
    self.errorTitleColor = errorTitleColor
    self.errorBodyColor = errorBodyColor
    self.errorIconColor = errorIconColor
    self.errorFocusRingColor = errorFocusRingColor
    self.successContainerColor = successContainerColor
    self.successTitleColor = successTitleColor
    self.successBodyColor = successBodyColor
    self.successIconColor = successIconColor
    self.successFocusRingColor = successFocusRingColor
  }
}

/// The variants of callout: named fields for the core values, `extra` for what a design system added.
/// Read one with `variants[key]`.
public struct TanreiCalloutVariants: Sendable, Equatable {
  public var tonal: TanreiCalloutVariantTokens
  public var outlined: TanreiCalloutVariantTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiCalloutVariant: TanreiCalloutVariantTokens]

  public init(
    tonal: TanreiCalloutVariantTokens,
    outlined: TanreiCalloutVariantTokens,
    extra: [TanreiCalloutVariant: TanreiCalloutVariantTokens] = [:]
  ) {
    self.tonal = tonal
    self.outlined = outlined
    self.extra = extra
  }

  /// The tokens of one callout variant, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiCalloutVariant) -> TanreiCalloutVariantTokens? {
    switch key {
    case .tonal: return tonal
    case .outlined: return outlined
    default: return extra[key]
    }
  }

  /// Total lookup: a callout variant this design system does not have reads the tokens of `tonal`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiCalloutVariant) -> TanreiCalloutVariantTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no callout variant \"\(key.rawValue)\"; using \"tonal\"")
    return tonal
  }

  /// Every callout variant of this design system: the core ones, then what it added.
  public var keys: [TanreiCalloutVariant] { TanreiCalloutVariant.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of callout that depend on the state but not on the variant.
public struct TanreiCalloutStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of callout (comp.callout).
public struct TanreiCalloutTokens: Sendable, Equatable {
  public var actionsGap: CGFloat
  public var actionsItemGap: CGFloat
  public var containerGap: CGFloat
  public var containerPaddingBlock: CGFloat
  public var containerPaddingInline: CGFloat
  public var containerPaddingInlineEndWithClose: CGFloat
  public var containerShape: CGFloat
  public var controlsHeight: CGFloat
  public var controlsIconSize: CGFloat
  public var controlsShape: CGFloat
  public var iconGap: CGFloat
  public var iconOpacity: Double
  public var iconSize: CGFloat
  public var motionFeedbackDuration: Double
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var outlineColor: TanreiPaint
  public var outlineWidth: CGFloat
  public var titleGap: CGFloat
  public var controls: TanreiCalloutControls
  public var sizes: TanreiCalloutSizes
  public var variants: TanreiCalloutVariants
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiCalloutStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiCalloutStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiCalloutStateTokens

  public init(
    actionsGap: CGFloat,
    actionsItemGap: CGFloat,
    containerGap: CGFloat,
    containerPaddingBlock: CGFloat,
    containerPaddingInline: CGFloat,
    containerPaddingInlineEndWithClose: CGFloat,
    containerShape: CGFloat,
    controlsHeight: CGFloat,
    controlsIconSize: CGFloat,
    controlsShape: CGFloat,
    iconGap: CGFloat,
    iconOpacity: Double,
    iconSize: CGFloat,
    motionFeedbackDuration: Double,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    outlineColor: TanreiPaint,
    outlineWidth: CGFloat,
    titleGap: CGFloat,
    controls: TanreiCalloutControls,
    sizes: TanreiCalloutSizes,
    variants: TanreiCalloutVariants,
    hovered: TanreiCalloutStateTokens,
    focused: TanreiCalloutStateTokens,
    pressed: TanreiCalloutStateTokens
  ) {
    self.actionsGap = actionsGap
    self.actionsItemGap = actionsItemGap
    self.containerGap = containerGap
    self.containerPaddingBlock = containerPaddingBlock
    self.containerPaddingInline = containerPaddingInline
    self.containerPaddingInlineEndWithClose = containerPaddingInlineEndWithClose
    self.containerShape = containerShape
    self.controlsHeight = controlsHeight
    self.controlsIconSize = controlsIconSize
    self.controlsShape = controlsShape
    self.iconGap = iconGap
    self.iconOpacity = iconOpacity
    self.iconSize = iconSize
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.outlineColor = outlineColor
    self.outlineWidth = outlineWidth
    self.titleGap = titleGap
    self.controls = controls
    self.sizes = sizes
    self.variants = variants
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, `disabled`, which callout has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiCalloutStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return nil
    }
  }
}

/// A value of card's `variant` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiCardVariant(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiCardVariant: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let elevated = TanreiCardVariant(rawValue: "elevated")
  public static let filled = TanreiCardVariant(rawValue: "filled")
  public static let outlined = TanreiCardVariant(rawValue: "outlined")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiCardVariant] = [.elevated, .filled, .outlined]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiCardVariant.outlined
}

/// How one variant of card is drawn in one state.
public struct TanreiCardVariantStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var containerElevation: [TanreiShadowLayer]
  public var outlineColor: TanreiPaint
  public var contentColor: TanreiPaint
  public var stateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    containerElevation: [TanreiShadowLayer],
    outlineColor: TanreiPaint,
    contentColor: TanreiPaint,
    stateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.containerElevation = containerElevation
    self.outlineColor = outlineColor
    self.contentColor = contentColor
    self.stateLayerColor = stateLayerColor
  }
}

/// One variant of card: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiCardVariantTokens: Sendable, Equatable {
  public var enabled: TanreiCardVariantStateTokens
  public var hovered: TanreiCardVariantStateTokens
  public var focused: TanreiCardVariantStateTokens
  public var pressed: TanreiCardVariantStateTokens
  public var disabled: TanreiCardVariantStateTokens

  public init(
    enabled: TanreiCardVariantStateTokens,
    hovered: TanreiCardVariantStateTokens,
    focused: TanreiCardVariantStateTokens,
    pressed: TanreiCardVariantStateTokens,
    disabled: TanreiCardVariantStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiCardVariantStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The variants of card: named fields for the core values, `extra` for what a design system added.
/// Read one with `variants[key]`.
public struct TanreiCardVariants: Sendable, Equatable {
  public var elevated: TanreiCardVariantTokens
  public var filled: TanreiCardVariantTokens
  public var outlined: TanreiCardVariantTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiCardVariant: TanreiCardVariantTokens]

  public init(
    elevated: TanreiCardVariantTokens,
    filled: TanreiCardVariantTokens,
    outlined: TanreiCardVariantTokens,
    extra: [TanreiCardVariant: TanreiCardVariantTokens] = [:]
  ) {
    self.elevated = elevated
    self.filled = filled
    self.outlined = outlined
    self.extra = extra
  }

  /// The tokens of one card variant, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiCardVariant) -> TanreiCardVariantTokens? {
    switch key {
    case .elevated: return elevated
    case .filled: return filled
    case .outlined: return outlined
    default: return extra[key]
    }
  }

  /// Total lookup: a card variant this design system does not have reads the tokens of `outlined`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiCardVariant) -> TanreiCardVariantTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no card variant \"\(key.rawValue)\"; using \"outlined\"")
    return outlined
  }

  /// Every card variant of this design system: the core ones, then what it added.
  public var keys: [TanreiCardVariant] { TanreiCardVariant.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of card that depend on the state but not on the variant.
public struct TanreiCardStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of card (comp.card).
public struct TanreiCardTokens: Sendable, Equatable {
  public var containerPadding: CGFloat
  public var containerShape: CGFloat
  public var motionFeedbackDuration: Double
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var outlineWidth: CGFloat
  public var variants: TanreiCardVariants
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiCardStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiCardStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiCardStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiCardStateTokens

  public init(
    containerPadding: CGFloat,
    containerShape: CGFloat,
    motionFeedbackDuration: Double,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    outlineWidth: CGFloat,
    variants: TanreiCardVariants,
    hovered: TanreiCardStateTokens,
    focused: TanreiCardStateTokens,
    pressed: TanreiCardStateTokens,
    disabled: TanreiCardStateTokens
  ) {
    self.containerPadding = containerPadding
    self.containerShape = containerShape
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.outlineWidth = outlineWidth
    self.variants = variants
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which card has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiCardStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// A value of carousel's `part` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiCarouselPart(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiCarouselPart: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let item = TanreiCarouselPart(rawValue: "item")
  public static let playback = TanreiCarouselPart(rawValue: "playback")
  public static let indicator = TanreiCarouselPart(rawValue: "indicator")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiCarouselPart] = [.item, .playback, .indicator]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiCarouselPart.item
}

/// How one part of carousel is drawn in one state.
public struct TanreiCarouselPartStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var contentColor: TanreiPaint
  public var stateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    contentColor: TanreiPaint,
    stateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.contentColor = contentColor
    self.stateLayerColor = stateLayerColor
  }
}

/// One part of carousel: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiCarouselPartTokens: Sendable, Equatable {
  public var enabled: TanreiCarouselPartStateTokens
  public var hovered: TanreiCarouselPartStateTokens
  public var focused: TanreiCarouselPartStateTokens
  public var pressed: TanreiCarouselPartStateTokens

  public init(
    enabled: TanreiCarouselPartStateTokens,
    hovered: TanreiCarouselPartStateTokens,
    focused: TanreiCarouselPartStateTokens,
    pressed: TanreiCarouselPartStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
  }

  /// The tokens of this part of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `disabled`, which carousel has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiCarouselPartStateTokens? {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return nil
    }
  }
}

/// The parts of carousel: named fields for the core values, `extra` for what a design system added.
/// Read one with `parts[key]`.
public struct TanreiCarouselParts: Sendable, Equatable {
  public var item: TanreiCarouselPartTokens
  public var playback: TanreiCarouselPartTokens
  public var indicator: TanreiCarouselPartTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiCarouselPart: TanreiCarouselPartTokens]

  public init(
    item: TanreiCarouselPartTokens,
    playback: TanreiCarouselPartTokens,
    indicator: TanreiCarouselPartTokens,
    extra: [TanreiCarouselPart: TanreiCarouselPartTokens] = [:]
  ) {
    self.item = item
    self.playback = playback
    self.indicator = indicator
    self.extra = extra
  }

  /// The tokens of one carousel part, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiCarouselPart) -> TanreiCarouselPartTokens? {
    switch key {
    case .item: return item
    case .playback: return playback
    case .indicator: return indicator
    default: return extra[key]
    }
  }

  /// Total lookup: a carousel part this design system does not have reads the tokens of `item`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiCarouselPart) -> TanreiCarouselPartTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no carousel part \"\(key.rawValue)\"; using \"item\"")
    return item
  }

  /// Every carousel part of this design system: the core ones, then what it added.
  public var keys: [TanreiCarouselPart] { TanreiCarouselPart.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of carousel that depend on the state but not on the variant.
public struct TanreiCarouselStateTokens: Sendable, Equatable {
  public var containerShape: CGFloat
  public var opacity: Double

  public init(
    containerShape: CGFloat,
    opacity: Double
  ) {
    self.containerShape = containerShape
    self.opacity = opacity
  }
}

/// Component tokens of carousel (comp.carousel).
public struct TanreiCarouselTokens: Sendable, Equatable {
  public var autoplayInterval: Double
  public var containerLargeWidth: CGFloat
  public var containerMinScale: Double
  public var containerShape: CGFloat
  public var containerSmallMaxWidth: CGFloat
  public var containerSmallMinWidth: CGFloat
  public var controlsButtonSize: CGFloat
  public var controlsHeight: CGFloat
  public var controlsIconSize: CGFloat
  public var controlsIndicatorPaddingInline: CGFloat
  public var controlsShape: CGFloat
  public var dotActiveWidth: CGFloat
  public var dotColor: TanreiPaint
  public var dotGap: CGFloat
  public var dotSize: CGFloat
  public var layoutGap: CGFloat
  public var layoutHeight: CGFloat
  public var layoutPaddingInline: CGFloat
  public var motionAutoplayDuration: Double
  public var motionAutoplayEasing: TanreiCubicBezier
  public var motionFeedbackDuration: Double
  public var motionScrollDuration: Double
  public var motionScrollEasing: TanreiCubicBezier
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var parts: TanreiCarouselParts
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiCarouselStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiCarouselStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiCarouselStateTokens

  public init(
    autoplayInterval: Double,
    containerLargeWidth: CGFloat,
    containerMinScale: Double,
    containerShape: CGFloat,
    containerSmallMaxWidth: CGFloat,
    containerSmallMinWidth: CGFloat,
    controlsButtonSize: CGFloat,
    controlsHeight: CGFloat,
    controlsIconSize: CGFloat,
    controlsIndicatorPaddingInline: CGFloat,
    controlsShape: CGFloat,
    dotActiveWidth: CGFloat,
    dotColor: TanreiPaint,
    dotGap: CGFloat,
    dotSize: CGFloat,
    layoutGap: CGFloat,
    layoutHeight: CGFloat,
    layoutPaddingInline: CGFloat,
    motionAutoplayDuration: Double,
    motionAutoplayEasing: TanreiCubicBezier,
    motionFeedbackDuration: Double,
    motionScrollDuration: Double,
    motionScrollEasing: TanreiCubicBezier,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    parts: TanreiCarouselParts,
    hovered: TanreiCarouselStateTokens,
    focused: TanreiCarouselStateTokens,
    pressed: TanreiCarouselStateTokens
  ) {
    self.autoplayInterval = autoplayInterval
    self.containerLargeWidth = containerLargeWidth
    self.containerMinScale = containerMinScale
    self.containerShape = containerShape
    self.containerSmallMaxWidth = containerSmallMaxWidth
    self.containerSmallMinWidth = containerSmallMinWidth
    self.controlsButtonSize = controlsButtonSize
    self.controlsHeight = controlsHeight
    self.controlsIconSize = controlsIconSize
    self.controlsIndicatorPaddingInline = controlsIndicatorPaddingInline
    self.controlsShape = controlsShape
    self.dotActiveWidth = dotActiveWidth
    self.dotColor = dotColor
    self.dotGap = dotGap
    self.dotSize = dotSize
    self.layoutGap = layoutGap
    self.layoutHeight = layoutHeight
    self.layoutPaddingInline = layoutPaddingInline
    self.motionAutoplayDuration = motionAutoplayDuration
    self.motionAutoplayEasing = motionAutoplayEasing
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionScrollDuration = motionScrollDuration
    self.motionScrollEasing = motionScrollEasing
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.parts = parts
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, `disabled`, which carousel has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiCarouselStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return nil
    }
  }
}

/// A value of chat-composer's `condition` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiChatComposerCondition(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiChatComposerCondition: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let standard = TanreiChatComposerCondition(rawValue: "standard")
  public static let error = TanreiChatComposerCondition(rawValue: "error")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiChatComposerCondition] = [.standard, .error]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiChatComposerCondition.standard
}

/// How one condition of chat-composer is drawn in one state.
public struct TanreiChatComposerConditionStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var containerElevation: [TanreiShadowLayer]
  public var outlineColor: TanreiPaint
  public var stateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    containerElevation: [TanreiShadowLayer],
    outlineColor: TanreiPaint,
    stateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.containerElevation = containerElevation
    self.outlineColor = outlineColor
    self.stateLayerColor = stateLayerColor
  }
}

/// One condition of chat-composer: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiChatComposerConditionTokens: Sendable, Equatable {
  public var enabled: TanreiChatComposerConditionStateTokens
  public var hovered: TanreiChatComposerConditionStateTokens
  public var focused: TanreiChatComposerConditionStateTokens
  public var disabled: TanreiChatComposerConditionStateTokens

  public init(
    enabled: TanreiChatComposerConditionStateTokens,
    hovered: TanreiChatComposerConditionStateTokens,
    focused: TanreiChatComposerConditionStateTokens,
    disabled: TanreiChatComposerConditionStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.disabled = disabled
  }

  /// The tokens of this condition of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `pressed`, which chat-composer has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiChatComposerConditionStateTokens? {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return nil
    case .disabled: return disabled
    }
  }
}

/// The conditions of chat-composer: named fields for the core values, `extra` for what a design system added.
/// Read one with `conditions[key]`.
public struct TanreiChatComposerConditions: Sendable, Equatable {
  public var standard: TanreiChatComposerConditionTokens
  public var error: TanreiChatComposerConditionTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiChatComposerCondition: TanreiChatComposerConditionTokens]

  public init(
    standard: TanreiChatComposerConditionTokens,
    error: TanreiChatComposerConditionTokens,
    extra: [TanreiChatComposerCondition: TanreiChatComposerConditionTokens] = [:]
  ) {
    self.standard = standard
    self.error = error
    self.extra = extra
  }

  /// The tokens of one chat-composer condition, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiChatComposerCondition) -> TanreiChatComposerConditionTokens? {
    switch key {
    case .standard: return standard
    case .error: return error
    default: return extra[key]
    }
  }

  /// Total lookup: a chat-composer condition this design system does not have reads the tokens of `standard`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiChatComposerCondition) -> TanreiChatComposerConditionTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no chat-composer condition \"\(key.rawValue)\"; using \"standard\"")
    return standard
  }

  /// Every chat-composer condition of this design system: the core ones, then what it added.
  public var keys: [TanreiChatComposerCondition] { TanreiChatComposerCondition.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of chat-composer that depend on the state but not on the variant.
public struct TanreiChatComposerStateTokens: Sendable, Equatable {
  public var opacity: Double
  public var outlineWidth: CGFloat

  public init(
    opacity: Double,
    outlineWidth: CGFloat
  ) {
    self.opacity = opacity
    self.outlineWidth = outlineWidth
  }
}

/// Component tokens of chat-composer (comp.chat-composer).
public struct TanreiChatComposerTokens: Sendable, Equatable {
  public var actionsGap: CGFloat
  public var containerGap: CGFloat
  public var containerHeight: CGFloat
  public var containerPaddingBlock: CGFloat
  public var containerPaddingInline: CGFloat
  public var containerPaddingInlineWithButton: CGFloat
  public var containerRowGap: CGFloat
  public var containerShape: CGFloat
  public var counterColor: TanreiPaint
  public var counterErrorColor: TanreiPaint
  public var counterTypescale: TanreiTextStyle
  public var inputPaddingBlock: CGFloat
  public var layoutInlineMinWidth: CGFloat
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var outlineWidth: CGFloat
  public var receivingContainerColor: TanreiPaint
  public var receivingOutlineColor: TanreiPaint
  public var receivingOutlineWidth: CGFloat
  public var sendButtonVariant: Double
  public var stripGap: CGFloat
  public var stripOffset: CGFloat
  public var stripPaddingBlockStart: CGFloat
  public var conditions: TanreiChatComposerConditions
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiChatComposerStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiChatComposerStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiChatComposerStateTokens

  public init(
    actionsGap: CGFloat,
    containerGap: CGFloat,
    containerHeight: CGFloat,
    containerPaddingBlock: CGFloat,
    containerPaddingInline: CGFloat,
    containerPaddingInlineWithButton: CGFloat,
    containerRowGap: CGFloat,
    containerShape: CGFloat,
    counterColor: TanreiPaint,
    counterErrorColor: TanreiPaint,
    counterTypescale: TanreiTextStyle,
    inputPaddingBlock: CGFloat,
    layoutInlineMinWidth: CGFloat,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    outlineWidth: CGFloat,
    receivingContainerColor: TanreiPaint,
    receivingOutlineColor: TanreiPaint,
    receivingOutlineWidth: CGFloat,
    sendButtonVariant: Double,
    stripGap: CGFloat,
    stripOffset: CGFloat,
    stripPaddingBlockStart: CGFloat,
    conditions: TanreiChatComposerConditions,
    hovered: TanreiChatComposerStateTokens,
    focused: TanreiChatComposerStateTokens,
    disabled: TanreiChatComposerStateTokens
  ) {
    self.actionsGap = actionsGap
    self.containerGap = containerGap
    self.containerHeight = containerHeight
    self.containerPaddingBlock = containerPaddingBlock
    self.containerPaddingInline = containerPaddingInline
    self.containerPaddingInlineWithButton = containerPaddingInlineWithButton
    self.containerRowGap = containerRowGap
    self.containerShape = containerShape
    self.counterColor = counterColor
    self.counterErrorColor = counterErrorColor
    self.counterTypescale = counterTypescale
    self.inputPaddingBlock = inputPaddingBlock
    self.layoutInlineMinWidth = layoutInlineMinWidth
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.outlineWidth = outlineWidth
    self.receivingContainerColor = receivingContainerColor
    self.receivingOutlineColor = receivingOutlineColor
    self.receivingOutlineWidth = receivingOutlineWidth
    self.sendButtonVariant = sendButtonVariant
    self.stripGap = stripGap
    self.stripOffset = stripOffset
    self.stripPaddingBlockStart = stripPaddingBlockStart
    self.conditions = conditions
    self.hovered = hovered
    self.focused = focused
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, `pressed`, which chat-composer has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiChatComposerStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return nil
    case .disabled: return disabled
    }
  }
}

/// A value of checkbox's `condition` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiCheckboxCondition(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiCheckboxCondition: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let unselected = TanreiCheckboxCondition(rawValue: "unselected")
  public static let selected = TanreiCheckboxCondition(rawValue: "selected")
  public static let indeterminate = TanreiCheckboxCondition(rawValue: "indeterminate")
  public static let errorUnselected = TanreiCheckboxCondition(rawValue: "error-unselected")
  public static let errorSelected = TanreiCheckboxCondition(rawValue: "error-selected")
  public static let errorIndeterminate = TanreiCheckboxCondition(rawValue: "error-indeterminate")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiCheckboxCondition] = [.unselected, .selected, .indeterminate, .errorUnselected, .errorSelected, .errorIndeterminate]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiCheckboxCondition.unselected
}

/// How one condition of checkbox is drawn in one state.
public struct TanreiCheckboxConditionStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var boxColor: TanreiPaint
  public var markColor: TanreiPaint
  public var outlineColor: TanreiPaint
  public var labelColor: TanreiPaint
  public var stateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    boxColor: TanreiPaint,
    markColor: TanreiPaint,
    outlineColor: TanreiPaint,
    labelColor: TanreiPaint,
    stateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.boxColor = boxColor
    self.markColor = markColor
    self.outlineColor = outlineColor
    self.labelColor = labelColor
    self.stateLayerColor = stateLayerColor
  }
}

/// One condition of checkbox: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiCheckboxConditionTokens: Sendable, Equatable {
  public var enabled: TanreiCheckboxConditionStateTokens
  public var hovered: TanreiCheckboxConditionStateTokens
  public var focused: TanreiCheckboxConditionStateTokens
  public var pressed: TanreiCheckboxConditionStateTokens
  public var disabled: TanreiCheckboxConditionStateTokens

  public init(
    enabled: TanreiCheckboxConditionStateTokens,
    hovered: TanreiCheckboxConditionStateTokens,
    focused: TanreiCheckboxConditionStateTokens,
    pressed: TanreiCheckboxConditionStateTokens,
    disabled: TanreiCheckboxConditionStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this condition of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiCheckboxConditionStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The conditions of checkbox: named fields for the core values, `extra` for what a design system added.
/// Read one with `conditions[key]`.
public struct TanreiCheckboxConditions: Sendable, Equatable {
  public var unselected: TanreiCheckboxConditionTokens
  public var selected: TanreiCheckboxConditionTokens
  public var indeterminate: TanreiCheckboxConditionTokens
  public var errorUnselected: TanreiCheckboxConditionTokens
  public var errorSelected: TanreiCheckboxConditionTokens
  public var errorIndeterminate: TanreiCheckboxConditionTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiCheckboxCondition: TanreiCheckboxConditionTokens]

  public init(
    unselected: TanreiCheckboxConditionTokens,
    selected: TanreiCheckboxConditionTokens,
    indeterminate: TanreiCheckboxConditionTokens,
    errorUnselected: TanreiCheckboxConditionTokens,
    errorSelected: TanreiCheckboxConditionTokens,
    errorIndeterminate: TanreiCheckboxConditionTokens,
    extra: [TanreiCheckboxCondition: TanreiCheckboxConditionTokens] = [:]
  ) {
    self.unselected = unselected
    self.selected = selected
    self.indeterminate = indeterminate
    self.errorUnselected = errorUnselected
    self.errorSelected = errorSelected
    self.errorIndeterminate = errorIndeterminate
    self.extra = extra
  }

  /// The tokens of one checkbox condition, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiCheckboxCondition) -> TanreiCheckboxConditionTokens? {
    switch key {
    case .unselected: return unselected
    case .selected: return selected
    case .indeterminate: return indeterminate
    case .errorUnselected: return errorUnselected
    case .errorSelected: return errorSelected
    case .errorIndeterminate: return errorIndeterminate
    default: return extra[key]
    }
  }

  /// Total lookup: a checkbox condition this design system does not have reads the tokens of `unselected`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiCheckboxCondition) -> TanreiCheckboxConditionTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no checkbox condition \"\(key.rawValue)\"; using \"unselected\"")
    return unselected
  }

  /// Every checkbox condition of this design system: the core ones, then what it added.
  public var keys: [TanreiCheckboxCondition] { TanreiCheckboxCondition.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of checkbox that depend on the state but not on the variant.
public struct TanreiCheckboxStateTokens: Sendable, Equatable {
  public var containerShape: CGFloat
  public var opacity: Double

  public init(
    containerShape: CGFloat,
    opacity: Double
  ) {
    self.containerShape = containerShape
    self.opacity = opacity
  }
}

/// Component tokens of checkbox (comp.checkbox).
public struct TanreiCheckboxTokens: Sendable, Equatable {
  public var boxShape: CGFloat
  public var boxSize: CGFloat
  public var containerShape: CGFloat
  public var containerSize: CGFloat
  public var labelGap: CGFloat
  public var labelTypescale: TanreiTextStyle
  public var markSize: CGFloat
  public var markWeight: Double
  public var markWidth: CGFloat
  public var motionFeedbackDuration: Double
  public var motionMarkEnterScale: Double
  public var motionMarkScaleDuration: Double
  public var motionMarkScaleEasing: TanreiCubicBezier
  public var motionSelectionDuration: Double
  public var motionSelectionEasing: TanreiCubicBezier
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var outlineWidth: CGFloat
  public var conditions: TanreiCheckboxConditions
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiCheckboxStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiCheckboxStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiCheckboxStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiCheckboxStateTokens

  public init(
    boxShape: CGFloat,
    boxSize: CGFloat,
    containerShape: CGFloat,
    containerSize: CGFloat,
    labelGap: CGFloat,
    labelTypescale: TanreiTextStyle,
    markSize: CGFloat,
    markWeight: Double,
    markWidth: CGFloat,
    motionFeedbackDuration: Double,
    motionMarkEnterScale: Double,
    motionMarkScaleDuration: Double,
    motionMarkScaleEasing: TanreiCubicBezier,
    motionSelectionDuration: Double,
    motionSelectionEasing: TanreiCubicBezier,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    outlineWidth: CGFloat,
    conditions: TanreiCheckboxConditions,
    hovered: TanreiCheckboxStateTokens,
    focused: TanreiCheckboxStateTokens,
    pressed: TanreiCheckboxStateTokens,
    disabled: TanreiCheckboxStateTokens
  ) {
    self.boxShape = boxShape
    self.boxSize = boxSize
    self.containerShape = containerShape
    self.containerSize = containerSize
    self.labelGap = labelGap
    self.labelTypescale = labelTypescale
    self.markSize = markSize
    self.markWeight = markWeight
    self.markWidth = markWidth
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionMarkEnterScale = motionMarkEnterScale
    self.motionMarkScaleDuration = motionMarkScaleDuration
    self.motionMarkScaleEasing = motionMarkScaleEasing
    self.motionSelectionDuration = motionSelectionDuration
    self.motionSelectionEasing = motionSelectionEasing
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.outlineWidth = outlineWidth
    self.conditions = conditions
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which checkbox has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiCheckboxStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// A value of chip's `size` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiChipSize(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiChipSize: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let small = TanreiChipSize(rawValue: "small")
  public static let medium = TanreiChipSize(rawValue: "medium")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiChipSize] = [.small, .medium]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiChipSize.medium
}

/// Everything of chip that depends on its size.
public struct TanreiChipSizeTokens: Sendable, Equatable {
  public var containerHeight: CGFloat
  public var containerPaddingInline: CGFloat
  public var containerPaddingInlineWithIcon: CGFloat
  public var containerPaddingInlineWithAvatar: CGFloat
  public var containerPaddingInlineWithRemove: CGFloat
  public var containerPaddingBlock: CGFloat
  public var containerGap: CGFloat
  public var labelTypescale: TanreiTextStyle
  public var iconSize: CGFloat
  public var avatarSize: CGFloat
  public var removeContainerSize: CGFloat

  public init(
    containerHeight: CGFloat,
    containerPaddingInline: CGFloat,
    containerPaddingInlineWithIcon: CGFloat,
    containerPaddingInlineWithAvatar: CGFloat,
    containerPaddingInlineWithRemove: CGFloat,
    containerPaddingBlock: CGFloat,
    containerGap: CGFloat,
    labelTypescale: TanreiTextStyle,
    iconSize: CGFloat,
    avatarSize: CGFloat,
    removeContainerSize: CGFloat
  ) {
    self.containerHeight = containerHeight
    self.containerPaddingInline = containerPaddingInline
    self.containerPaddingInlineWithIcon = containerPaddingInlineWithIcon
    self.containerPaddingInlineWithAvatar = containerPaddingInlineWithAvatar
    self.containerPaddingInlineWithRemove = containerPaddingInlineWithRemove
    self.containerPaddingBlock = containerPaddingBlock
    self.containerGap = containerGap
    self.labelTypescale = labelTypescale
    self.iconSize = iconSize
    self.avatarSize = avatarSize
    self.removeContainerSize = removeContainerSize
  }
}

/// The sizes of chip: named fields for the core values, `extra` for what a design system added.
/// Read one with `sizes[key]`.
public struct TanreiChipSizes: Sendable, Equatable {
  public var small: TanreiChipSizeTokens
  public var medium: TanreiChipSizeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiChipSize: TanreiChipSizeTokens]

  public init(
    small: TanreiChipSizeTokens,
    medium: TanreiChipSizeTokens,
    extra: [TanreiChipSize: TanreiChipSizeTokens] = [:]
  ) {
    self.small = small
    self.medium = medium
    self.extra = extra
  }

  /// The tokens of one chip size, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiChipSize) -> TanreiChipSizeTokens? {
    switch key {
    case .small: return small
    case .medium: return medium
    default: return extra[key]
    }
  }

  /// Total lookup: a chip size this design system does not have reads the tokens of `medium`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiChipSize) -> TanreiChipSizeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no chip size \"\(key.rawValue)\"; using \"medium\"")
    return medium
  }

  /// Every chip size of this design system: the core ones, then what it added.
  public var keys: [TanreiChipSize] { TanreiChipSize.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of chip's `variant` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiChipVariant(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiChipVariant: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let outlined = TanreiChipVariant(rawValue: "outlined")
  public static let elevated = TanreiChipVariant(rawValue: "elevated")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiChipVariant] = [.outlined, .elevated]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiChipVariant.outlined
}

/// How one variant of chip is drawn in one state.
public struct TanreiChipVariantStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var containerElevation: [TanreiShadowLayer]
  public var outlineColor: TanreiPaint
  public var labelColor: TanreiPaint
  public var iconColor: TanreiPaint
  public var stateLayerColor: TanreiPaint
  public var removeContainerColor: TanreiPaint
  public var removeIconColor: TanreiPaint
  public var removeStateLayerColor: TanreiPaint
  public var destructiveRemoveContainerColor: TanreiPaint
  public var destructiveRemoveIconColor: TanreiPaint
  public var destructiveRemoveStateLayerColor: TanreiPaint
  public var selectedContainerColor: TanreiPaint
  public var selectedContainerElevation: [TanreiShadowLayer]
  public var selectedOutlineColor: TanreiPaint
  public var selectedLabelColor: TanreiPaint
  public var selectedIconColor: TanreiPaint
  public var selectedStateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    containerElevation: [TanreiShadowLayer],
    outlineColor: TanreiPaint,
    labelColor: TanreiPaint,
    iconColor: TanreiPaint,
    stateLayerColor: TanreiPaint,
    removeContainerColor: TanreiPaint,
    removeIconColor: TanreiPaint,
    removeStateLayerColor: TanreiPaint,
    destructiveRemoveContainerColor: TanreiPaint,
    destructiveRemoveIconColor: TanreiPaint,
    destructiveRemoveStateLayerColor: TanreiPaint,
    selectedContainerColor: TanreiPaint,
    selectedContainerElevation: [TanreiShadowLayer],
    selectedOutlineColor: TanreiPaint,
    selectedLabelColor: TanreiPaint,
    selectedIconColor: TanreiPaint,
    selectedStateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.containerElevation = containerElevation
    self.outlineColor = outlineColor
    self.labelColor = labelColor
    self.iconColor = iconColor
    self.stateLayerColor = stateLayerColor
    self.removeContainerColor = removeContainerColor
    self.removeIconColor = removeIconColor
    self.removeStateLayerColor = removeStateLayerColor
    self.destructiveRemoveContainerColor = destructiveRemoveContainerColor
    self.destructiveRemoveIconColor = destructiveRemoveIconColor
    self.destructiveRemoveStateLayerColor = destructiveRemoveStateLayerColor
    self.selectedContainerColor = selectedContainerColor
    self.selectedContainerElevation = selectedContainerElevation
    self.selectedOutlineColor = selectedOutlineColor
    self.selectedLabelColor = selectedLabelColor
    self.selectedIconColor = selectedIconColor
    self.selectedStateLayerColor = selectedStateLayerColor
  }
}

/// One variant of chip: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiChipVariantTokens: Sendable, Equatable {
  public var enabled: TanreiChipVariantStateTokens
  public var hovered: TanreiChipVariantStateTokens
  public var focused: TanreiChipVariantStateTokens
  public var pressed: TanreiChipVariantStateTokens
  public var disabled: TanreiChipVariantStateTokens

  public init(
    enabled: TanreiChipVariantStateTokens,
    hovered: TanreiChipVariantStateTokens,
    focused: TanreiChipVariantStateTokens,
    pressed: TanreiChipVariantStateTokens,
    disabled: TanreiChipVariantStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiChipVariantStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The variants of chip: named fields for the core values, `extra` for what a design system added.
/// Read one with `variants[key]`.
public struct TanreiChipVariants: Sendable, Equatable {
  public var outlined: TanreiChipVariantTokens
  public var elevated: TanreiChipVariantTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiChipVariant: TanreiChipVariantTokens]

  public init(
    outlined: TanreiChipVariantTokens,
    elevated: TanreiChipVariantTokens,
    extra: [TanreiChipVariant: TanreiChipVariantTokens] = [:]
  ) {
    self.outlined = outlined
    self.elevated = elevated
    self.extra = extra
  }

  /// The tokens of one chip variant, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiChipVariant) -> TanreiChipVariantTokens? {
    switch key {
    case .outlined: return outlined
    case .elevated: return elevated
    default: return extra[key]
    }
  }

  /// Total lookup: a chip variant this design system does not have reads the tokens of `outlined`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiChipVariant) -> TanreiChipVariantTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no chip variant \"\(key.rawValue)\"; using \"outlined\"")
    return outlined
  }

  /// Every chip variant of this design system: the core ones, then what it added.
  public var keys: [TanreiChipVariant] { TanreiChipVariant.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of chip that depend on the state but not on the variant.
public struct TanreiChipStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of chip (comp.chip).
public struct TanreiChipTokens: Sendable, Equatable {
  public var avatarShape: CGFloat
  public var containerShape: CGFloat
  public var motionFeedbackDuration: Double
  public var motionSelectionDuration: Double
  public var motionSelectionEasing: TanreiCubicBezier
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var outlineWidth: CGFloat
  public var removeContainerShape: CGFloat
  public var sizes: TanreiChipSizes
  public var variants: TanreiChipVariants
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiChipStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiChipStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiChipStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiChipStateTokens

  public init(
    avatarShape: CGFloat,
    containerShape: CGFloat,
    motionFeedbackDuration: Double,
    motionSelectionDuration: Double,
    motionSelectionEasing: TanreiCubicBezier,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    outlineWidth: CGFloat,
    removeContainerShape: CGFloat,
    sizes: TanreiChipSizes,
    variants: TanreiChipVariants,
    hovered: TanreiChipStateTokens,
    focused: TanreiChipStateTokens,
    pressed: TanreiChipStateTokens,
    disabled: TanreiChipStateTokens
  ) {
    self.avatarShape = avatarShape
    self.containerShape = containerShape
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionSelectionDuration = motionSelectionDuration
    self.motionSelectionEasing = motionSelectionEasing
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.outlineWidth = outlineWidth
    self.removeContainerShape = removeContainerShape
    self.sizes = sizes
    self.variants = variants
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which chip has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiChipStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// A value of code-block's `size` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiCodeBlockSize(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiCodeBlockSize: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let small = TanreiCodeBlockSize(rawValue: "small")
  public static let medium = TanreiCodeBlockSize(rawValue: "medium")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiCodeBlockSize] = [.small, .medium]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiCodeBlockSize.medium
}

/// Everything of code-block that depends on its size.
public struct TanreiCodeBlockSizeTokens: Sendable, Equatable {
  public var codeTypescale: TanreiTextStyle
  public var containerPaddingBlock: CGFloat
  public var containerPaddingInline: CGFloat

  public init(
    codeTypescale: TanreiTextStyle,
    containerPaddingBlock: CGFloat,
    containerPaddingInline: CGFloat
  ) {
    self.codeTypescale = codeTypescale
    self.containerPaddingBlock = containerPaddingBlock
    self.containerPaddingInline = containerPaddingInline
  }
}

/// The sizes of code-block: named fields for the core values, `extra` for what a design system added.
/// Read one with `sizes[key]`.
public struct TanreiCodeBlockSizes: Sendable, Equatable {
  public var small: TanreiCodeBlockSizeTokens
  public var medium: TanreiCodeBlockSizeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiCodeBlockSize: TanreiCodeBlockSizeTokens]

  public init(
    small: TanreiCodeBlockSizeTokens,
    medium: TanreiCodeBlockSizeTokens,
    extra: [TanreiCodeBlockSize: TanreiCodeBlockSizeTokens] = [:]
  ) {
    self.small = small
    self.medium = medium
    self.extra = extra
  }

  /// The tokens of one code-block size, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiCodeBlockSize) -> TanreiCodeBlockSizeTokens? {
    switch key {
    case .small: return small
    case .medium: return medium
    default: return extra[key]
    }
  }

  /// Total lookup: a code-block size this design system does not have reads the tokens of `medium`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiCodeBlockSize) -> TanreiCodeBlockSizeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no code-block size \"\(key.rawValue)\"; using \"medium\"")
    return medium
  }

  /// Every code-block size of this design system: the core ones, then what it added.
  public var keys: [TanreiCodeBlockSize] { TanreiCodeBlockSize.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of code-block's `variant` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiCodeBlockVariant(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiCodeBlockVariant: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let filled = TanreiCodeBlockVariant(rawValue: "filled")
  public static let outlined = TanreiCodeBlockVariant(rawValue: "outlined")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiCodeBlockVariant] = [.filled, .outlined]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiCodeBlockVariant.filled
}

/// Everything of code-block that depends on its variant.
public struct TanreiCodeBlockVariantTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
  }
}

/// The variants of code-block: named fields for the core values, `extra` for what a design system added.
/// Read one with `variants[key]`.
public struct TanreiCodeBlockVariants: Sendable, Equatable {
  public var filled: TanreiCodeBlockVariantTokens
  public var outlined: TanreiCodeBlockVariantTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiCodeBlockVariant: TanreiCodeBlockVariantTokens]

  public init(
    filled: TanreiCodeBlockVariantTokens,
    outlined: TanreiCodeBlockVariantTokens,
    extra: [TanreiCodeBlockVariant: TanreiCodeBlockVariantTokens] = [:]
  ) {
    self.filled = filled
    self.outlined = outlined
    self.extra = extra
  }

  /// The tokens of one code-block variant, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiCodeBlockVariant) -> TanreiCodeBlockVariantTokens? {
    switch key {
    case .filled: return filled
    case .outlined: return outlined
    default: return extra[key]
    }
  }

  /// Total lookup: a code-block variant this design system does not have reads the tokens of `filled`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiCodeBlockVariant) -> TanreiCodeBlockVariantTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no code-block variant \"\(key.rawValue)\"; using \"filled\"")
    return filled
  }

  /// Every code-block variant of this design system: the core ones, then what it added.
  public var keys: [TanreiCodeBlockVariant] { TanreiCodeBlockVariant.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of code-block's `syntax` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiCodeBlockSyntax(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiCodeBlockSyntax: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let comment = TanreiCodeBlockSyntax(rawValue: "comment")
  public static let keyword = TanreiCodeBlockSyntax(rawValue: "keyword")
  public static let string = TanreiCodeBlockSyntax(rawValue: "string")
  public static let constant = TanreiCodeBlockSyntax(rawValue: "constant")
  public static let function = TanreiCodeBlockSyntax(rawValue: "function")
  public static let type = TanreiCodeBlockSyntax(rawValue: "type")
  public static let tag = TanreiCodeBlockSyntax(rawValue: "tag")
  public static let property = TanreiCodeBlockSyntax(rawValue: "property")
  public static let punctuation = TanreiCodeBlockSyntax(rawValue: "punctuation")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiCodeBlockSyntax] = [.comment, .keyword, .string, .constant, .function, .type, .tag, .property, .punctuation]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiCodeBlockSyntax.comment
}

/// Everything of code-block that depends on its syntax.
public struct TanreiCodeBlockSyntaxTokens: Sendable, Equatable {
  public var syntaxColor: TanreiPaint
  public var syntaxEmphasis: Double

  public init(
    syntaxColor: TanreiPaint,
    syntaxEmphasis: Double
  ) {
    self.syntaxColor = syntaxColor
    self.syntaxEmphasis = syntaxEmphasis
  }
}

/// The syntaxs of code-block: named fields for the core values, `extra` for what a design system added.
/// Read one with `syntaxs[key]`.
public struct TanreiCodeBlockSyntaxs: Sendable, Equatable {
  public var comment: TanreiCodeBlockSyntaxTokens
  public var keyword: TanreiCodeBlockSyntaxTokens
  public var string: TanreiCodeBlockSyntaxTokens
  public var constant: TanreiCodeBlockSyntaxTokens
  public var function: TanreiCodeBlockSyntaxTokens
  public var type: TanreiCodeBlockSyntaxTokens
  public var tag: TanreiCodeBlockSyntaxTokens
  public var property: TanreiCodeBlockSyntaxTokens
  public var punctuation: TanreiCodeBlockSyntaxTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiCodeBlockSyntax: TanreiCodeBlockSyntaxTokens]

  public init(
    comment: TanreiCodeBlockSyntaxTokens,
    keyword: TanreiCodeBlockSyntaxTokens,
    string: TanreiCodeBlockSyntaxTokens,
    constant: TanreiCodeBlockSyntaxTokens,
    function: TanreiCodeBlockSyntaxTokens,
    type: TanreiCodeBlockSyntaxTokens,
    tag: TanreiCodeBlockSyntaxTokens,
    property: TanreiCodeBlockSyntaxTokens,
    punctuation: TanreiCodeBlockSyntaxTokens,
    extra: [TanreiCodeBlockSyntax: TanreiCodeBlockSyntaxTokens] = [:]
  ) {
    self.comment = comment
    self.keyword = keyword
    self.string = string
    self.constant = constant
    self.function = function
    self.type = type
    self.tag = tag
    self.property = property
    self.punctuation = punctuation
    self.extra = extra
  }

  /// The tokens of one code-block syntax, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiCodeBlockSyntax) -> TanreiCodeBlockSyntaxTokens? {
    switch key {
    case .comment: return comment
    case .keyword: return keyword
    case .string: return string
    case .constant: return constant
    case .function: return function
    case .type: return type
    case .tag: return tag
    case .property: return property
    case .punctuation: return punctuation
    default: return extra[key]
    }
  }

  /// Total lookup: a code-block syntax this design system does not have reads the tokens of `comment`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiCodeBlockSyntax) -> TanreiCodeBlockSyntaxTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no code-block syntax \"\(key.rawValue)\"; using \"comment\"")
    return comment
  }

  /// Every code-block syntax of this design system: the core ones, then what it added.
  public var keys: [TanreiCodeBlockSyntax] { TanreiCodeBlockSyntax.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Component tokens of code-block (comp.code-block).
public struct TanreiCodeBlockTokens: Sendable, Equatable {
  public var codeColor: TanreiPaint
  public var codeTabSize: Double
  public var containerShape: CGFloat
  public var copyButtonInset: CGFloat
  public var headerGap: CGFloat
  public var headerPaddingBlockEnd: CGFloat
  public var languageColor: TanreiPaint
  public var languageTypescale: TanreiTextStyle
  public var lineNumberColor: TanreiPaint
  public var lineNumberGap: CGFloat
  public var lineAddedMarkColor: TanreiPaint
  public var lineHighlightedContainerColor: TanreiPaint
  public var lineHighlightedMarkColor: TanreiPaint
  public var lineMarkWidth: CGFloat
  public var lineRemovedMarkColor: TanreiPaint
  public var outlineColor: TanreiPaint
  public var outlineWidth: CGFloat
  public var promptColor: TanreiPaint
  public var syntaxMaxLength: Double
  public var titleColor: TanreiPaint
  public var titleTypescale: TanreiTextStyle
  public var sizes: TanreiCodeBlockSizes
  public var variants: TanreiCodeBlockVariants
  public var syntaxs: TanreiCodeBlockSyntaxs

  public init(
    codeColor: TanreiPaint,
    codeTabSize: Double,
    containerShape: CGFloat,
    copyButtonInset: CGFloat,
    headerGap: CGFloat,
    headerPaddingBlockEnd: CGFloat,
    languageColor: TanreiPaint,
    languageTypescale: TanreiTextStyle,
    lineNumberColor: TanreiPaint,
    lineNumberGap: CGFloat,
    lineAddedMarkColor: TanreiPaint,
    lineHighlightedContainerColor: TanreiPaint,
    lineHighlightedMarkColor: TanreiPaint,
    lineMarkWidth: CGFloat,
    lineRemovedMarkColor: TanreiPaint,
    outlineColor: TanreiPaint,
    outlineWidth: CGFloat,
    promptColor: TanreiPaint,
    syntaxMaxLength: Double,
    titleColor: TanreiPaint,
    titleTypescale: TanreiTextStyle,
    sizes: TanreiCodeBlockSizes,
    variants: TanreiCodeBlockVariants,
    syntaxs: TanreiCodeBlockSyntaxs
  ) {
    self.codeColor = codeColor
    self.codeTabSize = codeTabSize
    self.containerShape = containerShape
    self.copyButtonInset = copyButtonInset
    self.headerGap = headerGap
    self.headerPaddingBlockEnd = headerPaddingBlockEnd
    self.languageColor = languageColor
    self.languageTypescale = languageTypescale
    self.lineNumberColor = lineNumberColor
    self.lineNumberGap = lineNumberGap
    self.lineAddedMarkColor = lineAddedMarkColor
    self.lineHighlightedContainerColor = lineHighlightedContainerColor
    self.lineHighlightedMarkColor = lineHighlightedMarkColor
    self.lineMarkWidth = lineMarkWidth
    self.lineRemovedMarkColor = lineRemovedMarkColor
    self.outlineColor = outlineColor
    self.outlineWidth = outlineWidth
    self.promptColor = promptColor
    self.syntaxMaxLength = syntaxMaxLength
    self.titleColor = titleColor
    self.titleTypescale = titleTypescale
    self.sizes = sizes
    self.variants = variants
    self.syntaxs = syntaxs
  }
}

/// Component tokens of color-input (comp.color-input).
public struct TanreiColorInputTokens: Sendable, Equatable {
  public var swatchOutlineColor: TanreiPaint
  public var swatchOutlineWidth: CGFloat
  public var swatchShape: CGFloat

  public init(
    swatchOutlineColor: TanreiPaint,
    swatchOutlineWidth: CGFloat,
    swatchShape: CGFloat
  ) {
    self.swatchOutlineColor = swatchOutlineColor
    self.swatchOutlineWidth = swatchOutlineWidth
    self.swatchShape = swatchShape
  }
}

/// A value of combobox's `variant` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiComboboxVariant(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiComboboxVariant: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let stacked = TanreiComboboxVariant(rawValue: "stacked")
  public static let filled = TanreiComboboxVariant(rawValue: "filled")
  public static let outlined = TanreiComboboxVariant(rawValue: "outlined")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiComboboxVariant] = [.stacked, .filled, .outlined]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiComboboxVariant.stacked
}

/// How one variant of combobox is drawn in one state.
public struct TanreiComboboxVariantStateTokens: Sendable, Equatable {
  public var optionContainerColor: TanreiPaint
  public var optionLabelColor: TanreiPaint
  public var optionSupportingTextColor: TanreiPaint
  public var optionLeadingIconColor: TanreiPaint
  public var optionStateLayerColor: TanreiPaint
  public var selectedOptionContainerColor: TanreiPaint
  public var selectedOptionLabelColor: TanreiPaint
  public var selectedOptionSupportingTextColor: TanreiPaint
  public var selectedOptionLeadingIconColor: TanreiPaint
  public var selectedOptionMarkColor: TanreiPaint
  public var selectedOptionStateLayerColor: TanreiPaint

  public init(
    optionContainerColor: TanreiPaint,
    optionLabelColor: TanreiPaint,
    optionSupportingTextColor: TanreiPaint,
    optionLeadingIconColor: TanreiPaint,
    optionStateLayerColor: TanreiPaint,
    selectedOptionContainerColor: TanreiPaint,
    selectedOptionLabelColor: TanreiPaint,
    selectedOptionSupportingTextColor: TanreiPaint,
    selectedOptionLeadingIconColor: TanreiPaint,
    selectedOptionMarkColor: TanreiPaint,
    selectedOptionStateLayerColor: TanreiPaint
  ) {
    self.optionContainerColor = optionContainerColor
    self.optionLabelColor = optionLabelColor
    self.optionSupportingTextColor = optionSupportingTextColor
    self.optionLeadingIconColor = optionLeadingIconColor
    self.optionStateLayerColor = optionStateLayerColor
    self.selectedOptionContainerColor = selectedOptionContainerColor
    self.selectedOptionLabelColor = selectedOptionLabelColor
    self.selectedOptionSupportingTextColor = selectedOptionSupportingTextColor
    self.selectedOptionLeadingIconColor = selectedOptionLeadingIconColor
    self.selectedOptionMarkColor = selectedOptionMarkColor
    self.selectedOptionStateLayerColor = selectedOptionStateLayerColor
  }
}

/// One variant of combobox: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiComboboxVariantTokens: Sendable, Equatable {
  public var enabled: TanreiComboboxVariantStateTokens
  public var hovered: TanreiComboboxVariantStateTokens
  public var focused: TanreiComboboxVariantStateTokens
  public var pressed: TanreiComboboxVariantStateTokens
  public var disabled: TanreiComboboxVariantStateTokens

  public init(
    enabled: TanreiComboboxVariantStateTokens,
    hovered: TanreiComboboxVariantStateTokens,
    focused: TanreiComboboxVariantStateTokens,
    pressed: TanreiComboboxVariantStateTokens,
    disabled: TanreiComboboxVariantStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiComboboxVariantStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The variants of combobox: named fields for the core values, `extra` for what a design system added.
/// Read one with `variants[key]`.
public struct TanreiComboboxVariants: Sendable, Equatable {
  public var stacked: TanreiComboboxVariantTokens
  public var filled: TanreiComboboxVariantTokens
  public var outlined: TanreiComboboxVariantTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiComboboxVariant: TanreiComboboxVariantTokens]

  public init(
    stacked: TanreiComboboxVariantTokens,
    filled: TanreiComboboxVariantTokens,
    outlined: TanreiComboboxVariantTokens,
    extra: [TanreiComboboxVariant: TanreiComboboxVariantTokens] = [:]
  ) {
    self.stacked = stacked
    self.filled = filled
    self.outlined = outlined
    self.extra = extra
  }

  /// The tokens of one combobox variant, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiComboboxVariant) -> TanreiComboboxVariantTokens? {
    switch key {
    case .stacked: return stacked
    case .filled: return filled
    case .outlined: return outlined
    default: return extra[key]
    }
  }

  /// Total lookup: a combobox variant this design system does not have reads the tokens of `stacked`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiComboboxVariant) -> TanreiComboboxVariantTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no combobox variant \"\(key.rawValue)\"; using \"stacked\"")
    return stacked
  }

  /// Every combobox variant of this design system: the core ones, then what it added.
  public var keys: [TanreiComboboxVariant] { TanreiComboboxVariant.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of combobox that depend on the state but not on the variant.
public struct TanreiComboboxStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of combobox (comp.combobox).
public struct TanreiComboboxTokens: Sendable, Equatable {
  public var containerActionGap: CGFloat
  public var dividerColor: TanreiPaint
  public var dividerSpace: CGFloat
  public var dividerThickness: CGFloat
  public var groupTitleColor: TanreiPaint
  public var groupTitlePaddingInline: CGFloat
  public var groupTitleTypescale: TanreiTextStyle
  public var groupGap: CGFloat
  public var listColor: TanreiPaint
  public var listElevation: [TanreiShadowLayer]
  public var listMaxHeight: CGFloat
  public var listOffset: CGFloat
  public var listPaddingBlock: CGFloat
  public var listPaddingInline: CGFloat
  public var listShape: CGFloat
  public var listViewportMargin: CGFloat
  public var motionCloseDuration: Double
  public var motionCloseEasing: TanreiCubicBezier
  public var motionFeedbackDuration: Double
  public var motionOpenDuration: Double
  public var motionOpenEasing: TanreiCubicBezier
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var optionGap: CGFloat
  public var optionHeight: CGFloat
  public var optionLabelTypescale: TanreiTextStyle
  public var optionLeadingIconSize: CGFloat
  public var optionMarkSize: CGFloat
  public var optionMatchEmphasis: Double
  public var optionPaddingBlock: CGFloat
  public var optionPaddingInline: CGFloat
  public var optionShape: CGFloat
  public var optionSupportingTextTypescale: TanreiTextStyle
  public var separation: Double
  public var statusColor: TanreiPaint
  public var statusErrorColor: TanreiPaint
  public var statusTypescale: TanreiTextStyle
  public var variants: TanreiComboboxVariants
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiComboboxStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiComboboxStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiComboboxStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiComboboxStateTokens

  public init(
    containerActionGap: CGFloat,
    dividerColor: TanreiPaint,
    dividerSpace: CGFloat,
    dividerThickness: CGFloat,
    groupTitleColor: TanreiPaint,
    groupTitlePaddingInline: CGFloat,
    groupTitleTypescale: TanreiTextStyle,
    groupGap: CGFloat,
    listColor: TanreiPaint,
    listElevation: [TanreiShadowLayer],
    listMaxHeight: CGFloat,
    listOffset: CGFloat,
    listPaddingBlock: CGFloat,
    listPaddingInline: CGFloat,
    listShape: CGFloat,
    listViewportMargin: CGFloat,
    motionCloseDuration: Double,
    motionCloseEasing: TanreiCubicBezier,
    motionFeedbackDuration: Double,
    motionOpenDuration: Double,
    motionOpenEasing: TanreiCubicBezier,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    optionGap: CGFloat,
    optionHeight: CGFloat,
    optionLabelTypescale: TanreiTextStyle,
    optionLeadingIconSize: CGFloat,
    optionMarkSize: CGFloat,
    optionMatchEmphasis: Double,
    optionPaddingBlock: CGFloat,
    optionPaddingInline: CGFloat,
    optionShape: CGFloat,
    optionSupportingTextTypescale: TanreiTextStyle,
    separation: Double,
    statusColor: TanreiPaint,
    statusErrorColor: TanreiPaint,
    statusTypescale: TanreiTextStyle,
    variants: TanreiComboboxVariants,
    hovered: TanreiComboboxStateTokens,
    focused: TanreiComboboxStateTokens,
    pressed: TanreiComboboxStateTokens,
    disabled: TanreiComboboxStateTokens
  ) {
    self.containerActionGap = containerActionGap
    self.dividerColor = dividerColor
    self.dividerSpace = dividerSpace
    self.dividerThickness = dividerThickness
    self.groupTitleColor = groupTitleColor
    self.groupTitlePaddingInline = groupTitlePaddingInline
    self.groupTitleTypescale = groupTitleTypescale
    self.groupGap = groupGap
    self.listColor = listColor
    self.listElevation = listElevation
    self.listMaxHeight = listMaxHeight
    self.listOffset = listOffset
    self.listPaddingBlock = listPaddingBlock
    self.listPaddingInline = listPaddingInline
    self.listShape = listShape
    self.listViewportMargin = listViewportMargin
    self.motionCloseDuration = motionCloseDuration
    self.motionCloseEasing = motionCloseEasing
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionOpenDuration = motionOpenDuration
    self.motionOpenEasing = motionOpenEasing
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.optionGap = optionGap
    self.optionHeight = optionHeight
    self.optionLabelTypescale = optionLabelTypescale
    self.optionLeadingIconSize = optionLeadingIconSize
    self.optionMarkSize = optionMarkSize
    self.optionMatchEmphasis = optionMatchEmphasis
    self.optionPaddingBlock = optionPaddingBlock
    self.optionPaddingInline = optionPaddingInline
    self.optionShape = optionShape
    self.optionSupportingTextTypescale = optionSupportingTextTypescale
    self.separation = separation
    self.statusColor = statusColor
    self.statusErrorColor = statusErrorColor
    self.statusTypescale = statusTypescale
    self.variants = variants
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which combobox has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiComboboxStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// Component tokens of copy-button (comp.copy-button).
public struct TanreiCopyButtonTokens: Sendable, Equatable {
  public var confirmationDuration: Double

  public init(
    confirmationDuration: Double
  ) {
    self.confirmationDuration = confirmationDuration
  }
}

/// A value of date-time-picker's `condition` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiDateTimePickerCondition(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiDateTimePickerCondition: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let unselected = TanreiDateTimePickerCondition(rawValue: "unselected")
  public static let selected = TanreiDateTimePickerCondition(rawValue: "selected")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiDateTimePickerCondition] = [.unselected, .selected]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiDateTimePickerCondition.unselected
}

/// How one condition of date-time-picker is drawn in one state.
public struct TanreiDateTimePickerConditionStateTokens: Sendable, Equatable {
  public var selectorContainerColor: TanreiPaint
  public var selectorLabelColor: TanreiPaint
  public var selectorOutlineColor: TanreiPaint
  public var selectorOutlineWidth: CGFloat
  public var selectorStateLayerColor: TanreiPaint

  public init(
    selectorContainerColor: TanreiPaint,
    selectorLabelColor: TanreiPaint,
    selectorOutlineColor: TanreiPaint,
    selectorOutlineWidth: CGFloat,
    selectorStateLayerColor: TanreiPaint
  ) {
    self.selectorContainerColor = selectorContainerColor
    self.selectorLabelColor = selectorLabelColor
    self.selectorOutlineColor = selectorOutlineColor
    self.selectorOutlineWidth = selectorOutlineWidth
    self.selectorStateLayerColor = selectorStateLayerColor
  }
}

/// One condition of date-time-picker: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiDateTimePickerConditionTokens: Sendable, Equatable {
  public var enabled: TanreiDateTimePickerConditionStateTokens
  public var hovered: TanreiDateTimePickerConditionStateTokens
  public var focused: TanreiDateTimePickerConditionStateTokens
  public var pressed: TanreiDateTimePickerConditionStateTokens

  public init(
    enabled: TanreiDateTimePickerConditionStateTokens,
    hovered: TanreiDateTimePickerConditionStateTokens,
    focused: TanreiDateTimePickerConditionStateTokens,
    pressed: TanreiDateTimePickerConditionStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
  }

  /// The tokens of this condition of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `disabled`, which date-time-picker has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiDateTimePickerConditionStateTokens? {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return nil
    }
  }
}

/// The conditions of date-time-picker: named fields for the core values, `extra` for what a design system added.
/// Read one with `conditions[key]`.
public struct TanreiDateTimePickerConditions: Sendable, Equatable {
  public var unselected: TanreiDateTimePickerConditionTokens
  public var selected: TanreiDateTimePickerConditionTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiDateTimePickerCondition: TanreiDateTimePickerConditionTokens]

  public init(
    unselected: TanreiDateTimePickerConditionTokens,
    selected: TanreiDateTimePickerConditionTokens,
    extra: [TanreiDateTimePickerCondition: TanreiDateTimePickerConditionTokens] = [:]
  ) {
    self.unselected = unselected
    self.selected = selected
    self.extra = extra
  }

  /// The tokens of one date-time-picker condition, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiDateTimePickerCondition) -> TanreiDateTimePickerConditionTokens? {
    switch key {
    case .unselected: return unselected
    case .selected: return selected
    default: return extra[key]
    }
  }

  /// Total lookup: a date-time-picker condition this design system does not have reads the tokens of `unselected`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiDateTimePickerCondition) -> TanreiDateTimePickerConditionTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no date-time-picker condition \"\(key.rawValue)\"; using \"unselected\"")
    return unselected
  }

  /// Every date-time-picker condition of this design system: the core ones, then what it added.
  public var keys: [TanreiDateTimePickerCondition] { TanreiDateTimePickerCondition.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of date-time-picker that depend on the state but not on the variant.
public struct TanreiDateTimePickerStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of date-time-picker (comp.date-time-picker).
public struct TanreiDateTimePickerTokens: Sendable, Equatable {
  public var actionsArrangement: Double
  public var actionsGap: CGFloat
  public var actionsPaddingBlock: CGFloat
  public var actionsVariant: Double
  public var containerGap: CGFloat
  public var containerPaddingBlock: CGFloat
  public var containerPaddingInline: CGFloat
  public var dialCenterSize: CGFloat
  public var dialContainerColor: TanreiPaint
  public var dialContainerSize: CGFloat
  public var dialHandleColor: TanreiPaint
  public var dialHandleSize: CGFloat
  public var dialLabelColor: TanreiPaint
  public var dialLabelTypescale: TanreiTextStyle
  public var dialPadding: CGFloat
  public var dialSelectedLabelColor: TanreiPaint
  public var dialTrackColor: TanreiPaint
  public var dialTrackWidth: CGFloat
  public var dividerColor: TanreiPaint
  public var dividerWidth: CGFloat
  public var dockedContainerColor: TanreiPaint
  public var dockedContainerElevation: [TanreiShadowLayer]
  public var dockedContainerShape: CGFloat
  public var dockedMotionCloseDuration: Double
  public var dockedMotionCloseEasing: TanreiCubicBezier
  public var dockedMotionOpenDuration: Double
  public var dockedMotionOpenEasing: TanreiCubicBezier
  public var dockedOffset: CGFloat
  public var dockedViewportMargin: CGFloat
  public var errorColor: TanreiPaint
  public var errorTypescale: TanreiTextStyle
  public var headerGap: CGFloat
  public var headerLabelColor: TanreiPaint
  public var headerLabelTypescale: TanreiTextStyle
  public var headerPaddingBlock: CGFloat
  public var headerPaddingInlineEnd: CGFloat
  public var headerPaddingInlineStart: CGFloat
  public var headerPlaceholderColor: TanreiPaint
  public var headerValueColor: TanreiPaint
  public var headerValueTypescale: TanreiTextStyle
  public var modalContainerColor: TanreiPaint
  public var modalContainerElevation: [TanreiShadowLayer]
  public var modalContainerMargin: CGFloat
  public var modalContainerShape: CGFloat
  public var modalMotionCloseDuration: Double
  public var modalMotionCloseEasing: TanreiCubicBezier
  public var modalMotionEnterScale: Double
  public var modalMotionOpenDuration: Double
  public var modalMotionOpenEasing: TanreiCubicBezier
  public var modalScrimColor: TanreiPaint
  public var motionDialDuration: Double
  public var motionDialEasing: TanreiCubicBezier
  public var motionFeedbackDuration: Double
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var motionWheelDuration: Double
  public var motionWheelEasing: TanreiCubicBezier
  public var periodContainerWidth: CGFloat
  public var periodGap: CGFloat
  public var periodLabelTypescale: TanreiTextStyle
  public var rangeFieldContainerHeight: CGFloat
  public var rangeFieldContainerPaddingInline: CGFloat
  public var rangeFieldGap: CGFloat
  public var rangeFieldLabelTypescale: TanreiTextStyle
  public var selectorContainerHeight: CGFloat
  public var selectorContainerShape: CGFloat
  public var selectorContainerWidth: CGFloat
  public var selectorGap: CGFloat
  public var selectorLabelTypescale: TanreiTextStyle
  public var separatorColor: TanreiPaint
  public var separatorTypescale: TanreiTextStyle
  public var timeEntryModes: Double
  public var wheelGap: CGFloat
  public var wheelHeight: CGFloat
  public var wheelLabelColor: TanreiPaint
  public var wheelLabelTypescale: TanreiTextStyle
  public var wheelRowHeight: CGFloat
  public var wheelSelectedLabelColor: TanreiPaint
  public var wheelSelectionContainerColor: TanreiPaint
  public var wheelSelectionContainerShape: CGFloat
  public var wheelSelectionSpan: Double
  public var wheelWidth: CGFloat
  public var conditions: TanreiDateTimePickerConditions
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiDateTimePickerStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiDateTimePickerStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiDateTimePickerStateTokens

  public init(
    actionsArrangement: Double,
    actionsGap: CGFloat,
    actionsPaddingBlock: CGFloat,
    actionsVariant: Double,
    containerGap: CGFloat,
    containerPaddingBlock: CGFloat,
    containerPaddingInline: CGFloat,
    dialCenterSize: CGFloat,
    dialContainerColor: TanreiPaint,
    dialContainerSize: CGFloat,
    dialHandleColor: TanreiPaint,
    dialHandleSize: CGFloat,
    dialLabelColor: TanreiPaint,
    dialLabelTypescale: TanreiTextStyle,
    dialPadding: CGFloat,
    dialSelectedLabelColor: TanreiPaint,
    dialTrackColor: TanreiPaint,
    dialTrackWidth: CGFloat,
    dividerColor: TanreiPaint,
    dividerWidth: CGFloat,
    dockedContainerColor: TanreiPaint,
    dockedContainerElevation: [TanreiShadowLayer],
    dockedContainerShape: CGFloat,
    dockedMotionCloseDuration: Double,
    dockedMotionCloseEasing: TanreiCubicBezier,
    dockedMotionOpenDuration: Double,
    dockedMotionOpenEasing: TanreiCubicBezier,
    dockedOffset: CGFloat,
    dockedViewportMargin: CGFloat,
    errorColor: TanreiPaint,
    errorTypescale: TanreiTextStyle,
    headerGap: CGFloat,
    headerLabelColor: TanreiPaint,
    headerLabelTypescale: TanreiTextStyle,
    headerPaddingBlock: CGFloat,
    headerPaddingInlineEnd: CGFloat,
    headerPaddingInlineStart: CGFloat,
    headerPlaceholderColor: TanreiPaint,
    headerValueColor: TanreiPaint,
    headerValueTypescale: TanreiTextStyle,
    modalContainerColor: TanreiPaint,
    modalContainerElevation: [TanreiShadowLayer],
    modalContainerMargin: CGFloat,
    modalContainerShape: CGFloat,
    modalMotionCloseDuration: Double,
    modalMotionCloseEasing: TanreiCubicBezier,
    modalMotionEnterScale: Double,
    modalMotionOpenDuration: Double,
    modalMotionOpenEasing: TanreiCubicBezier,
    modalScrimColor: TanreiPaint,
    motionDialDuration: Double,
    motionDialEasing: TanreiCubicBezier,
    motionFeedbackDuration: Double,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    motionWheelDuration: Double,
    motionWheelEasing: TanreiCubicBezier,
    periodContainerWidth: CGFloat,
    periodGap: CGFloat,
    periodLabelTypescale: TanreiTextStyle,
    rangeFieldContainerHeight: CGFloat,
    rangeFieldContainerPaddingInline: CGFloat,
    rangeFieldGap: CGFloat,
    rangeFieldLabelTypescale: TanreiTextStyle,
    selectorContainerHeight: CGFloat,
    selectorContainerShape: CGFloat,
    selectorContainerWidth: CGFloat,
    selectorGap: CGFloat,
    selectorLabelTypescale: TanreiTextStyle,
    separatorColor: TanreiPaint,
    separatorTypescale: TanreiTextStyle,
    timeEntryModes: Double,
    wheelGap: CGFloat,
    wheelHeight: CGFloat,
    wheelLabelColor: TanreiPaint,
    wheelLabelTypescale: TanreiTextStyle,
    wheelRowHeight: CGFloat,
    wheelSelectedLabelColor: TanreiPaint,
    wheelSelectionContainerColor: TanreiPaint,
    wheelSelectionContainerShape: CGFloat,
    wheelSelectionSpan: Double,
    wheelWidth: CGFloat,
    conditions: TanreiDateTimePickerConditions,
    hovered: TanreiDateTimePickerStateTokens,
    focused: TanreiDateTimePickerStateTokens,
    pressed: TanreiDateTimePickerStateTokens
  ) {
    self.actionsArrangement = actionsArrangement
    self.actionsGap = actionsGap
    self.actionsPaddingBlock = actionsPaddingBlock
    self.actionsVariant = actionsVariant
    self.containerGap = containerGap
    self.containerPaddingBlock = containerPaddingBlock
    self.containerPaddingInline = containerPaddingInline
    self.dialCenterSize = dialCenterSize
    self.dialContainerColor = dialContainerColor
    self.dialContainerSize = dialContainerSize
    self.dialHandleColor = dialHandleColor
    self.dialHandleSize = dialHandleSize
    self.dialLabelColor = dialLabelColor
    self.dialLabelTypescale = dialLabelTypescale
    self.dialPadding = dialPadding
    self.dialSelectedLabelColor = dialSelectedLabelColor
    self.dialTrackColor = dialTrackColor
    self.dialTrackWidth = dialTrackWidth
    self.dividerColor = dividerColor
    self.dividerWidth = dividerWidth
    self.dockedContainerColor = dockedContainerColor
    self.dockedContainerElevation = dockedContainerElevation
    self.dockedContainerShape = dockedContainerShape
    self.dockedMotionCloseDuration = dockedMotionCloseDuration
    self.dockedMotionCloseEasing = dockedMotionCloseEasing
    self.dockedMotionOpenDuration = dockedMotionOpenDuration
    self.dockedMotionOpenEasing = dockedMotionOpenEasing
    self.dockedOffset = dockedOffset
    self.dockedViewportMargin = dockedViewportMargin
    self.errorColor = errorColor
    self.errorTypescale = errorTypescale
    self.headerGap = headerGap
    self.headerLabelColor = headerLabelColor
    self.headerLabelTypescale = headerLabelTypescale
    self.headerPaddingBlock = headerPaddingBlock
    self.headerPaddingInlineEnd = headerPaddingInlineEnd
    self.headerPaddingInlineStart = headerPaddingInlineStart
    self.headerPlaceholderColor = headerPlaceholderColor
    self.headerValueColor = headerValueColor
    self.headerValueTypescale = headerValueTypescale
    self.modalContainerColor = modalContainerColor
    self.modalContainerElevation = modalContainerElevation
    self.modalContainerMargin = modalContainerMargin
    self.modalContainerShape = modalContainerShape
    self.modalMotionCloseDuration = modalMotionCloseDuration
    self.modalMotionCloseEasing = modalMotionCloseEasing
    self.modalMotionEnterScale = modalMotionEnterScale
    self.modalMotionOpenDuration = modalMotionOpenDuration
    self.modalMotionOpenEasing = modalMotionOpenEasing
    self.modalScrimColor = modalScrimColor
    self.motionDialDuration = motionDialDuration
    self.motionDialEasing = motionDialEasing
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.motionWheelDuration = motionWheelDuration
    self.motionWheelEasing = motionWheelEasing
    self.periodContainerWidth = periodContainerWidth
    self.periodGap = periodGap
    self.periodLabelTypescale = periodLabelTypescale
    self.rangeFieldContainerHeight = rangeFieldContainerHeight
    self.rangeFieldContainerPaddingInline = rangeFieldContainerPaddingInline
    self.rangeFieldGap = rangeFieldGap
    self.rangeFieldLabelTypescale = rangeFieldLabelTypescale
    self.selectorContainerHeight = selectorContainerHeight
    self.selectorContainerShape = selectorContainerShape
    self.selectorContainerWidth = selectorContainerWidth
    self.selectorGap = selectorGap
    self.selectorLabelTypescale = selectorLabelTypescale
    self.separatorColor = separatorColor
    self.separatorTypescale = separatorTypescale
    self.timeEntryModes = timeEntryModes
    self.wheelGap = wheelGap
    self.wheelHeight = wheelHeight
    self.wheelLabelColor = wheelLabelColor
    self.wheelLabelTypescale = wheelLabelTypescale
    self.wheelRowHeight = wheelRowHeight
    self.wheelSelectedLabelColor = wheelSelectedLabelColor
    self.wheelSelectionContainerColor = wheelSelectionContainerColor
    self.wheelSelectionContainerShape = wheelSelectionContainerShape
    self.wheelSelectionSpan = wheelSelectionSpan
    self.wheelWidth = wheelWidth
    self.conditions = conditions
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, `disabled`, which date-time-picker has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiDateTimePickerStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return nil
    }
  }
}

/// A value of description-list's `density` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiDescriptionListDensity(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiDescriptionListDensity: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let regular = TanreiDescriptionListDensity(rawValue: "regular")
  public static let compact = TanreiDescriptionListDensity(rawValue: "compact")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiDescriptionListDensity] = [.regular, .compact]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiDescriptionListDensity.regular
}

/// Everything of description-list that depends on its density.
public struct TanreiDescriptionListDensityTokens: Sendable, Equatable {
  public var factGap: CGFloat
  public var termGap: CGFloat
  public var termTypescale: TanreiTextStyle
  public var valueTypescale: TanreiTextStyle
  public var statValueTypescale: TanreiTextStyle

  public init(
    factGap: CGFloat,
    termGap: CGFloat,
    termTypescale: TanreiTextStyle,
    valueTypescale: TanreiTextStyle,
    statValueTypescale: TanreiTextStyle
  ) {
    self.factGap = factGap
    self.termGap = termGap
    self.termTypescale = termTypescale
    self.valueTypescale = valueTypescale
    self.statValueTypescale = statValueTypescale
  }
}

/// The densitys of description-list: named fields for the core values, `extra` for what a design system added.
/// Read one with `densitys[key]`.
public struct TanreiDescriptionListDensitys: Sendable, Equatable {
  public var regular: TanreiDescriptionListDensityTokens
  public var compact: TanreiDescriptionListDensityTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiDescriptionListDensity: TanreiDescriptionListDensityTokens]

  public init(
    regular: TanreiDescriptionListDensityTokens,
    compact: TanreiDescriptionListDensityTokens,
    extra: [TanreiDescriptionListDensity: TanreiDescriptionListDensityTokens] = [:]
  ) {
    self.regular = regular
    self.compact = compact
    self.extra = extra
  }

  /// The tokens of one description-list density, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiDescriptionListDensity) -> TanreiDescriptionListDensityTokens? {
    switch key {
    case .regular: return regular
    case .compact: return compact
    default: return extra[key]
    }
  }

  /// Total lookup: a description-list density this design system does not have reads the tokens of `regular`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiDescriptionListDensity) -> TanreiDescriptionListDensityTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no description-list density \"\(key.rawValue)\"; using \"regular\"")
    return regular
  }

  /// Every description-list density of this design system: the core ones, then what it added.
  public var keys: [TanreiDescriptionListDensity] { TanreiDescriptionListDensity.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Component tokens of description-list (comp.description-list).
public struct TanreiDescriptionListTokens: Sendable, Equatable {
  public var columnGap: CGFloat
  public var columnMinWidth: CGFloat
  public var dividerColor: TanreiPaint
  public var dividerThickness: CGFloat
  public var separation: Double
  public var stackGap: CGFloat
  public var termColor: TanreiPaint
  public var valueColor: TanreiPaint
  public var densitys: TanreiDescriptionListDensitys

  public init(
    columnGap: CGFloat,
    columnMinWidth: CGFloat,
    dividerColor: TanreiPaint,
    dividerThickness: CGFloat,
    separation: Double,
    stackGap: CGFloat,
    termColor: TanreiPaint,
    valueColor: TanreiPaint,
    densitys: TanreiDescriptionListDensitys
  ) {
    self.columnGap = columnGap
    self.columnMinWidth = columnMinWidth
    self.dividerColor = dividerColor
    self.dividerThickness = dividerThickness
    self.separation = separation
    self.stackGap = stackGap
    self.termColor = termColor
    self.valueColor = valueColor
    self.densitys = densitys
  }
}

/// Component tokens of dialog (comp.dialog).
public struct TanreiDialogTokens: Sendable, Equatable {
  public var actionsArrangement: Double
  public var actionsGap: CGFloat
  public var actionsMarginBlockStart: CGFloat
  public var actionsVariant: Double
  public var compactWindowWidth: CGFloat
  public var containerColor: TanreiPaint
  public var containerElevation: [TanreiShadowLayer]
  public var containerGap: CGFloat
  public var containerMargin: CGFloat
  public var containerMaxWidth: CGFloat
  public var containerMinWidth: CGFloat
  public var containerPadding: CGFloat
  public var containerShape: CGFloat
  public var contentColor: TanreiPaint
  public var dividerColor: TanreiPaint
  public var dividerWidth: CGFloat
  public var headerGap: CGFloat
  public var headlineColor: TanreiPaint
  public var headlineTypescale: TanreiTextStyle
  public var iconColor: TanreiPaint
  public var iconPlacement: Double
  public var iconSize: CGFloat
  public var motionEnterDuration: Double
  public var motionEnterEasing: TanreiCubicBezier
  public var motionEnterOffset: CGFloat
  public var motionEnterScale: Double
  public var motionExitDuration: Double
  public var motionExitEasing: TanreiCubicBezier
  public var scrimColor: TanreiPaint
  public var supportingTextColor: TanreiPaint
  public var supportingTextTypescale: TanreiTextStyle

  public init(
    actionsArrangement: Double,
    actionsGap: CGFloat,
    actionsMarginBlockStart: CGFloat,
    actionsVariant: Double,
    compactWindowWidth: CGFloat,
    containerColor: TanreiPaint,
    containerElevation: [TanreiShadowLayer],
    containerGap: CGFloat,
    containerMargin: CGFloat,
    containerMaxWidth: CGFloat,
    containerMinWidth: CGFloat,
    containerPadding: CGFloat,
    containerShape: CGFloat,
    contentColor: TanreiPaint,
    dividerColor: TanreiPaint,
    dividerWidth: CGFloat,
    headerGap: CGFloat,
    headlineColor: TanreiPaint,
    headlineTypescale: TanreiTextStyle,
    iconColor: TanreiPaint,
    iconPlacement: Double,
    iconSize: CGFloat,
    motionEnterDuration: Double,
    motionEnterEasing: TanreiCubicBezier,
    motionEnterOffset: CGFloat,
    motionEnterScale: Double,
    motionExitDuration: Double,
    motionExitEasing: TanreiCubicBezier,
    scrimColor: TanreiPaint,
    supportingTextColor: TanreiPaint,
    supportingTextTypescale: TanreiTextStyle
  ) {
    self.actionsArrangement = actionsArrangement
    self.actionsGap = actionsGap
    self.actionsMarginBlockStart = actionsMarginBlockStart
    self.actionsVariant = actionsVariant
    self.compactWindowWidth = compactWindowWidth
    self.containerColor = containerColor
    self.containerElevation = containerElevation
    self.containerGap = containerGap
    self.containerMargin = containerMargin
    self.containerMaxWidth = containerMaxWidth
    self.containerMinWidth = containerMinWidth
    self.containerPadding = containerPadding
    self.containerShape = containerShape
    self.contentColor = contentColor
    self.dividerColor = dividerColor
    self.dividerWidth = dividerWidth
    self.headerGap = headerGap
    self.headlineColor = headlineColor
    self.headlineTypescale = headlineTypescale
    self.iconColor = iconColor
    self.iconPlacement = iconPlacement
    self.iconSize = iconSize
    self.motionEnterDuration = motionEnterDuration
    self.motionEnterEasing = motionEnterEasing
    self.motionEnterOffset = motionEnterOffset
    self.motionEnterScale = motionEnterScale
    self.motionExitDuration = motionExitDuration
    self.motionExitEasing = motionExitEasing
    self.scrimColor = scrimColor
    self.supportingTextColor = supportingTextColor
    self.supportingTextTypescale = supportingTextTypescale
  }
}

/// Component tokens of divider (comp.divider).
public struct TanreiDividerTokens: Sendable, Equatable {
  public var lineColor: TanreiPaint
  public var lineDashGap: CGFloat
  public var lineDashLength: CGFloat
  public var lineDotGap: CGFloat
  public var lineInset: CGFloat
  public var lineThickness: CGFloat
  public var lineWaveAmplitude: CGFloat
  public var lineWaveWavelength: CGFloat

  public init(
    lineColor: TanreiPaint,
    lineDashGap: CGFloat,
    lineDashLength: CGFloat,
    lineDotGap: CGFloat,
    lineInset: CGFloat,
    lineThickness: CGFloat,
    lineWaveAmplitude: CGFloat,
    lineWaveWavelength: CGFloat
  ) {
    self.lineColor = lineColor
    self.lineDashGap = lineDashGap
    self.lineDashLength = lineDashLength
    self.lineDotGap = lineDotGap
    self.lineInset = lineInset
    self.lineThickness = lineThickness
    self.lineWaveAmplitude = lineWaveAmplitude
    self.lineWaveWavelength = lineWaveWavelength
  }
}

/// A value of embedded-text-input's `condition` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiEmbeddedTextInputCondition(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiEmbeddedTextInputCondition: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let standard = TanreiEmbeddedTextInputCondition(rawValue: "standard")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiEmbeddedTextInputCondition] = [.standard]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiEmbeddedTextInputCondition.standard
}

/// How one condition of embedded-text-input is drawn in one state.
public struct TanreiEmbeddedTextInputConditionStateTokens: Sendable, Equatable {
  public var inputColor: TanreiPaint
  public var placeholderColor: TanreiPaint
  public var caretColor: TanreiPaint

  public init(
    inputColor: TanreiPaint,
    placeholderColor: TanreiPaint,
    caretColor: TanreiPaint
  ) {
    self.inputColor = inputColor
    self.placeholderColor = placeholderColor
    self.caretColor = caretColor
  }
}

/// One condition of embedded-text-input: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiEmbeddedTextInputConditionTokens: Sendable, Equatable {
  public var enabled: TanreiEmbeddedTextInputConditionStateTokens
  public var disabled: TanreiEmbeddedTextInputConditionStateTokens

  public init(
    enabled: TanreiEmbeddedTextInputConditionStateTokens,
    disabled: TanreiEmbeddedTextInputConditionStateTokens
  ) {
    self.enabled = enabled
    self.disabled = disabled
  }

  /// The tokens of this condition of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `hovered`, `focused`, `pressed`, which embedded-text-input has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiEmbeddedTextInputConditionStateTokens? {
    switch state {
    case .enabled: return enabled
    case .hovered: return nil
    case .focused: return nil
    case .pressed: return nil
    case .disabled: return disabled
    }
  }
}

/// The conditions of embedded-text-input: named fields for the core values, `extra` for what a design system added.
/// Read one with `conditions[key]`.
public struct TanreiEmbeddedTextInputConditions: Sendable, Equatable {
  public var standard: TanreiEmbeddedTextInputConditionTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiEmbeddedTextInputCondition: TanreiEmbeddedTextInputConditionTokens]

  public init(
    standard: TanreiEmbeddedTextInputConditionTokens,
    extra: [TanreiEmbeddedTextInputCondition: TanreiEmbeddedTextInputConditionTokens] = [:]
  ) {
    self.standard = standard
    self.extra = extra
  }

  /// The tokens of one embedded-text-input condition, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiEmbeddedTextInputCondition) -> TanreiEmbeddedTextInputConditionTokens? {
    switch key {
    case .standard: return standard
    default: return extra[key]
    }
  }

  /// Total lookup: a embedded-text-input condition this design system does not have reads the tokens of `standard`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiEmbeddedTextInputCondition) -> TanreiEmbeddedTextInputConditionTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no embedded-text-input condition \"\(key.rawValue)\"; using \"standard\"")
    return standard
  }

  /// Every embedded-text-input condition of this design system: the core ones, then what it added.
  public var keys: [TanreiEmbeddedTextInputCondition] { TanreiEmbeddedTextInputCondition.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Component tokens of embedded-text-input (comp.embedded-text-input).
public struct TanreiEmbeddedTextInputTokens: Sendable, Equatable {
  public var inputTypescale: TanreiTextStyle
  public var motionResizeDuration: Double
  public var motionResizeEasing: TanreiCubicBezier
  public var selectionColor: TanreiPaint
  public var selectionContentColor: TanreiPaint
  public var conditions: TanreiEmbeddedTextInputConditions

  public init(
    inputTypescale: TanreiTextStyle,
    motionResizeDuration: Double,
    motionResizeEasing: TanreiCubicBezier,
    selectionColor: TanreiPaint,
    selectionContentColor: TanreiPaint,
    conditions: TanreiEmbeddedTextInputConditions
  ) {
    self.inputTypescale = inputTypescale
    self.motionResizeDuration = motionResizeDuration
    self.motionResizeEasing = motionResizeEasing
    self.selectionColor = selectionColor
    self.selectionContentColor = selectionContentColor
    self.conditions = conditions
  }
}

/// A value of empty-state's `size` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiEmptyStateSize(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiEmptyStateSize: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let medium = TanreiEmptyStateSize(rawValue: "medium")
  public static let large = TanreiEmptyStateSize(rawValue: "large")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiEmptyStateSize] = [.medium, .large]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiEmptyStateSize.medium
}

/// Everything of empty-state that depends on its size.
public struct TanreiEmptyStateSizeTokens: Sendable, Equatable {
  public var containerPaddingBlock: CGFloat
  public var mediaSize: CGFloat
  public var titleTypescale: TanreiTextStyle
  public var descriptionTypescale: TanreiTextStyle

  public init(
    containerPaddingBlock: CGFloat,
    mediaSize: CGFloat,
    titleTypescale: TanreiTextStyle,
    descriptionTypescale: TanreiTextStyle
  ) {
    self.containerPaddingBlock = containerPaddingBlock
    self.mediaSize = mediaSize
    self.titleTypescale = titleTypescale
    self.descriptionTypescale = descriptionTypescale
  }
}

/// The sizes of empty-state: named fields for the core values, `extra` for what a design system added.
/// Read one with `sizes[key]`.
public struct TanreiEmptyStateSizes: Sendable, Equatable {
  public var medium: TanreiEmptyStateSizeTokens
  public var large: TanreiEmptyStateSizeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiEmptyStateSize: TanreiEmptyStateSizeTokens]

  public init(
    medium: TanreiEmptyStateSizeTokens,
    large: TanreiEmptyStateSizeTokens,
    extra: [TanreiEmptyStateSize: TanreiEmptyStateSizeTokens] = [:]
  ) {
    self.medium = medium
    self.large = large
    self.extra = extra
  }

  /// The tokens of one empty-state size, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiEmptyStateSize) -> TanreiEmptyStateSizeTokens? {
    switch key {
    case .medium: return medium
    case .large: return large
    default: return extra[key]
    }
  }

  /// Total lookup: a empty-state size this design system does not have reads the tokens of `medium`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiEmptyStateSize) -> TanreiEmptyStateSizeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no empty-state size \"\(key.rawValue)\"; using \"medium\"")
    return medium
  }

  /// Every empty-state size of this design system: the core ones, then what it added.
  public var keys: [TanreiEmptyStateSize] { TanreiEmptyStateSize.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Component tokens of empty-state (comp.empty-state).
public struct TanreiEmptyStateTokens: Sendable, Equatable {
  public var actionsGap: CGFloat
  public var actionsItemGap: CGFloat
  public var containerPaddingInline: CGFloat
  public var contentMeasure: Double
  public var descriptionColor: TanreiPaint
  public var mediaColor: TanreiPaint
  public var mediaGap: CGFloat
  public var titleColor: TanreiPaint
  public var titleGap: CGFloat
  public var sizes: TanreiEmptyStateSizes

  public init(
    actionsGap: CGFloat,
    actionsItemGap: CGFloat,
    containerPaddingInline: CGFloat,
    contentMeasure: Double,
    descriptionColor: TanreiPaint,
    mediaColor: TanreiPaint,
    mediaGap: CGFloat,
    titleColor: TanreiPaint,
    titleGap: CGFloat,
    sizes: TanreiEmptyStateSizes
  ) {
    self.actionsGap = actionsGap
    self.actionsItemGap = actionsItemGap
    self.containerPaddingInline = containerPaddingInline
    self.contentMeasure = contentMeasure
    self.descriptionColor = descriptionColor
    self.mediaColor = mediaColor
    self.mediaGap = mediaGap
    self.titleColor = titleColor
    self.titleGap = titleGap
    self.sizes = sizes
  }
}

/// A value of fab-menu's `size` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiFabMenuSize(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiFabMenuSize: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let small = TanreiFabMenuSize(rawValue: "small")
  public static let medium = TanreiFabMenuSize(rawValue: "medium")
  public static let large = TanreiFabMenuSize(rawValue: "large")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiFabMenuSize] = [.small, .medium, .large]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiFabMenuSize.medium
}

/// Everything of fab-menu that depends on its size.
public struct TanreiFabMenuSizeTokens: Sendable, Equatable {
  public var containerSize: CGFloat
  public var containerShape: CGFloat
  public var iconSize: CGFloat

  public init(
    containerSize: CGFloat,
    containerShape: CGFloat,
    iconSize: CGFloat
  ) {
    self.containerSize = containerSize
    self.containerShape = containerShape
    self.iconSize = iconSize
  }
}

/// The sizes of fab-menu: named fields for the core values, `extra` for what a design system added.
/// Read one with `sizes[key]`.
public struct TanreiFabMenuSizes: Sendable, Equatable {
  public var small: TanreiFabMenuSizeTokens
  public var medium: TanreiFabMenuSizeTokens
  public var large: TanreiFabMenuSizeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiFabMenuSize: TanreiFabMenuSizeTokens]

  public init(
    small: TanreiFabMenuSizeTokens,
    medium: TanreiFabMenuSizeTokens,
    large: TanreiFabMenuSizeTokens,
    extra: [TanreiFabMenuSize: TanreiFabMenuSizeTokens] = [:]
  ) {
    self.small = small
    self.medium = medium
    self.large = large
    self.extra = extra
  }

  /// The tokens of one fab-menu size, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiFabMenuSize) -> TanreiFabMenuSizeTokens? {
    switch key {
    case .small: return small
    case .medium: return medium
    case .large: return large
    default: return extra[key]
    }
  }

  /// Total lookup: a fab-menu size this design system does not have reads the tokens of `medium`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiFabMenuSize) -> TanreiFabMenuSizeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no fab-menu size \"\(key.rawValue)\"; using \"medium\"")
    return medium
  }

  /// Every fab-menu size of this design system: the core ones, then what it added.
  public var keys: [TanreiFabMenuSize] { TanreiFabMenuSize.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of fab-menu's `variant` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiFabMenuVariant(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiFabMenuVariant: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let filled = TanreiFabMenuVariant(rawValue: "filled")
  public static let tonal = TanreiFabMenuVariant(rawValue: "tonal")
  public static let surface = TanreiFabMenuVariant(rawValue: "surface")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiFabMenuVariant] = [.filled, .tonal, .surface]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiFabMenuVariant.filled
}

/// How one variant of fab-menu is drawn in one state.
public struct TanreiFabMenuVariantStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var containerElevation: [TanreiShadowLayer]
  public var iconColor: TanreiPaint
  public var stateLayerColor: TanreiPaint
  public var openContainerColor: TanreiPaint
  public var openContainerElevation: [TanreiShadowLayer]
  public var openIconColor: TanreiPaint
  public var openStateLayerColor: TanreiPaint
  public var itemContainerColor: TanreiPaint
  public var itemContainerElevation: [TanreiShadowLayer]
  public var itemLabelColor: TanreiPaint
  public var itemIconColor: TanreiPaint
  public var itemStateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    containerElevation: [TanreiShadowLayer],
    iconColor: TanreiPaint,
    stateLayerColor: TanreiPaint,
    openContainerColor: TanreiPaint,
    openContainerElevation: [TanreiShadowLayer],
    openIconColor: TanreiPaint,
    openStateLayerColor: TanreiPaint,
    itemContainerColor: TanreiPaint,
    itemContainerElevation: [TanreiShadowLayer],
    itemLabelColor: TanreiPaint,
    itemIconColor: TanreiPaint,
    itemStateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.containerElevation = containerElevation
    self.iconColor = iconColor
    self.stateLayerColor = stateLayerColor
    self.openContainerColor = openContainerColor
    self.openContainerElevation = openContainerElevation
    self.openIconColor = openIconColor
    self.openStateLayerColor = openStateLayerColor
    self.itemContainerColor = itemContainerColor
    self.itemContainerElevation = itemContainerElevation
    self.itemLabelColor = itemLabelColor
    self.itemIconColor = itemIconColor
    self.itemStateLayerColor = itemStateLayerColor
  }
}

/// One variant of fab-menu: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiFabMenuVariantTokens: Sendable, Equatable {
  public var enabled: TanreiFabMenuVariantStateTokens
  public var hovered: TanreiFabMenuVariantStateTokens
  public var focused: TanreiFabMenuVariantStateTokens
  public var pressed: TanreiFabMenuVariantStateTokens
  public var disabled: TanreiFabMenuVariantStateTokens

  public init(
    enabled: TanreiFabMenuVariantStateTokens,
    hovered: TanreiFabMenuVariantStateTokens,
    focused: TanreiFabMenuVariantStateTokens,
    pressed: TanreiFabMenuVariantStateTokens,
    disabled: TanreiFabMenuVariantStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiFabMenuVariantStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The variants of fab-menu: named fields for the core values, `extra` for what a design system added.
/// Read one with `variants[key]`.
public struct TanreiFabMenuVariants: Sendable, Equatable {
  public var filled: TanreiFabMenuVariantTokens
  public var tonal: TanreiFabMenuVariantTokens
  public var surface: TanreiFabMenuVariantTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiFabMenuVariant: TanreiFabMenuVariantTokens]

  public init(
    filled: TanreiFabMenuVariantTokens,
    tonal: TanreiFabMenuVariantTokens,
    surface: TanreiFabMenuVariantTokens,
    extra: [TanreiFabMenuVariant: TanreiFabMenuVariantTokens] = [:]
  ) {
    self.filled = filled
    self.tonal = tonal
    self.surface = surface
    self.extra = extra
  }

  /// The tokens of one fab-menu variant, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiFabMenuVariant) -> TanreiFabMenuVariantTokens? {
    switch key {
    case .filled: return filled
    case .tonal: return tonal
    case .surface: return surface
    default: return extra[key]
    }
  }

  /// Total lookup: a fab-menu variant this design system does not have reads the tokens of `filled`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiFabMenuVariant) -> TanreiFabMenuVariantTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no fab-menu variant \"\(key.rawValue)\"; using \"filled\"")
    return filled
  }

  /// Every fab-menu variant of this design system: the core ones, then what it added.
  public var keys: [TanreiFabMenuVariant] { TanreiFabMenuVariant.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of fab-menu that depend on the state but not on the variant.
public struct TanreiFabMenuStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of fab-menu (comp.fab-menu).
public struct TanreiFabMenuTokens: Sendable, Equatable {
  public var containerShapeOpen: CGFloat
  public var itemGap: CGFloat
  public var itemHeight: CGFloat
  public var itemIconSize: CGFloat
  public var itemLabelTypescale: TanreiTextStyle
  public var itemPaddingInlineEnd: CGFloat
  public var itemPaddingInlineStart: CGFloat
  public var itemShape: CGFloat
  public var listGap: CGFloat
  public var listOffset: CGFloat
  public var motionCloseDuration: Double
  public var motionCloseEasing: TanreiCubicBezier
  public var motionFeedbackDuration: Double
  public var motionOpenDuration: Double
  public var motionOpenEasing: TanreiCubicBezier
  public var motionStagger: Double
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var sizes: TanreiFabMenuSizes
  public var variants: TanreiFabMenuVariants
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiFabMenuStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiFabMenuStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiFabMenuStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiFabMenuStateTokens

  public init(
    containerShapeOpen: CGFloat,
    itemGap: CGFloat,
    itemHeight: CGFloat,
    itemIconSize: CGFloat,
    itemLabelTypescale: TanreiTextStyle,
    itemPaddingInlineEnd: CGFloat,
    itemPaddingInlineStart: CGFloat,
    itemShape: CGFloat,
    listGap: CGFloat,
    listOffset: CGFloat,
    motionCloseDuration: Double,
    motionCloseEasing: TanreiCubicBezier,
    motionFeedbackDuration: Double,
    motionOpenDuration: Double,
    motionOpenEasing: TanreiCubicBezier,
    motionStagger: Double,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    sizes: TanreiFabMenuSizes,
    variants: TanreiFabMenuVariants,
    hovered: TanreiFabMenuStateTokens,
    focused: TanreiFabMenuStateTokens,
    pressed: TanreiFabMenuStateTokens,
    disabled: TanreiFabMenuStateTokens
  ) {
    self.containerShapeOpen = containerShapeOpen
    self.itemGap = itemGap
    self.itemHeight = itemHeight
    self.itemIconSize = itemIconSize
    self.itemLabelTypescale = itemLabelTypescale
    self.itemPaddingInlineEnd = itemPaddingInlineEnd
    self.itemPaddingInlineStart = itemPaddingInlineStart
    self.itemShape = itemShape
    self.listGap = listGap
    self.listOffset = listOffset
    self.motionCloseDuration = motionCloseDuration
    self.motionCloseEasing = motionCloseEasing
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionOpenDuration = motionOpenDuration
    self.motionOpenEasing = motionOpenEasing
    self.motionStagger = motionStagger
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.sizes = sizes
    self.variants = variants
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which fab-menu has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiFabMenuStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// A value of field-group's `spacing` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiFieldGroupSpacing(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiFieldGroupSpacing: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let controls = TanreiFieldGroupSpacing(rawValue: "controls")
  public static let fields = TanreiFieldGroupSpacing(rawValue: "fields")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiFieldGroupSpacing] = [.controls, .fields]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiFieldGroupSpacing.controls
}

/// Everything of field-group that depends on its spacing.
public struct TanreiFieldGroupSpacingTokens: Sendable, Equatable {
  public var gap: CGFloat

  public init(
    gap: CGFloat
  ) {
    self.gap = gap
  }
}

/// The spacings of field-group: named fields for the core values, `extra` for what a design system added.
/// Read one with `spacings[key]`.
public struct TanreiFieldGroupSpacings: Sendable, Equatable {
  public var controls: TanreiFieldGroupSpacingTokens
  public var fields: TanreiFieldGroupSpacingTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiFieldGroupSpacing: TanreiFieldGroupSpacingTokens]

  public init(
    controls: TanreiFieldGroupSpacingTokens,
    fields: TanreiFieldGroupSpacingTokens,
    extra: [TanreiFieldGroupSpacing: TanreiFieldGroupSpacingTokens] = [:]
  ) {
    self.controls = controls
    self.fields = fields
    self.extra = extra
  }

  /// The tokens of one field-group spacing, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiFieldGroupSpacing) -> TanreiFieldGroupSpacingTokens? {
    switch key {
    case .controls: return controls
    case .fields: return fields
    default: return extra[key]
    }
  }

  /// Total lookup: a field-group spacing this design system does not have reads the tokens of `controls`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiFieldGroupSpacing) -> TanreiFieldGroupSpacingTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no field-group spacing \"\(key.rawValue)\"; using \"controls\"")
    return controls
  }

  /// Every field-group spacing of this design system: the core ones, then what it added.
  public var keys: [TanreiFieldGroupSpacing] { TanreiFieldGroupSpacing.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of field-group's `condition` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiFieldGroupCondition(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiFieldGroupCondition: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let standard = TanreiFieldGroupCondition(rawValue: "standard")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiFieldGroupCondition] = [.standard]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiFieldGroupCondition.standard
}

/// How one condition of field-group is drawn in one state.
public struct TanreiFieldGroupConditionStateTokens: Sendable, Equatable {
  public var labelColor: TanreiPaint
  public var supportingTextColor: TanreiPaint
  public var requiredAsteriskColor: TanreiPaint
  public var errorTextColor: TanreiPaint
  public var errorLabelColor: TanreiPaint
  public var errorSupportingTextColor: TanreiPaint
  public var errorRequiredAsteriskColor: TanreiPaint

  public init(
    labelColor: TanreiPaint,
    supportingTextColor: TanreiPaint,
    requiredAsteriskColor: TanreiPaint,
    errorTextColor: TanreiPaint,
    errorLabelColor: TanreiPaint,
    errorSupportingTextColor: TanreiPaint,
    errorRequiredAsteriskColor: TanreiPaint
  ) {
    self.labelColor = labelColor
    self.supportingTextColor = supportingTextColor
    self.requiredAsteriskColor = requiredAsteriskColor
    self.errorTextColor = errorTextColor
    self.errorLabelColor = errorLabelColor
    self.errorSupportingTextColor = errorSupportingTextColor
    self.errorRequiredAsteriskColor = errorRequiredAsteriskColor
  }
}

/// One condition of field-group: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiFieldGroupConditionTokens: Sendable, Equatable {
  public var enabled: TanreiFieldGroupConditionStateTokens
  public var disabled: TanreiFieldGroupConditionStateTokens

  public init(
    enabled: TanreiFieldGroupConditionStateTokens,
    disabled: TanreiFieldGroupConditionStateTokens
  ) {
    self.enabled = enabled
    self.disabled = disabled
  }

  /// The tokens of this condition of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `hovered`, `focused`, `pressed`, which field-group has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiFieldGroupConditionStateTokens? {
    switch state {
    case .enabled: return enabled
    case .hovered: return nil
    case .focused: return nil
    case .pressed: return nil
    case .disabled: return disabled
    }
  }
}

/// The conditions of field-group: named fields for the core values, `extra` for what a design system added.
/// Read one with `conditions[key]`.
public struct TanreiFieldGroupConditions: Sendable, Equatable {
  public var standard: TanreiFieldGroupConditionTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiFieldGroupCondition: TanreiFieldGroupConditionTokens]

  public init(
    standard: TanreiFieldGroupConditionTokens,
    extra: [TanreiFieldGroupCondition: TanreiFieldGroupConditionTokens] = [:]
  ) {
    self.standard = standard
    self.extra = extra
  }

  /// The tokens of one field-group condition, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiFieldGroupCondition) -> TanreiFieldGroupConditionTokens? {
    switch key {
    case .standard: return standard
    default: return extra[key]
    }
  }

  /// Total lookup: a field-group condition this design system does not have reads the tokens of `standard`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiFieldGroupCondition) -> TanreiFieldGroupConditionTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no field-group condition \"\(key.rawValue)\"; using \"standard\"")
    return standard
  }

  /// Every field-group condition of this design system: the core ones, then what it added.
  public var keys: [TanreiFieldGroupCondition] { TanreiFieldGroupCondition.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Component tokens of field-group (comp.field-group).
public struct TanreiFieldGroupTokens: Sendable, Equatable {
  public var errorTextGap: CGFloat
  public var fieldMinWidth: CGFloat
  public var gapInline: CGFloat
  public var labelGap: CGFloat
  public var labelTypescale: TanreiTextStyle
  public var requirementAsteriskGap: CGFloat
  public var requirementGap: CGFloat
  public var requirementMark: Double
  public var supportingTextGap: CGFloat
  public var supportingTextTypescale: TanreiTextStyle
  public var spacings: TanreiFieldGroupSpacings
  public var conditions: TanreiFieldGroupConditions

  public init(
    errorTextGap: CGFloat,
    fieldMinWidth: CGFloat,
    gapInline: CGFloat,
    labelGap: CGFloat,
    labelTypescale: TanreiTextStyle,
    requirementAsteriskGap: CGFloat,
    requirementGap: CGFloat,
    requirementMark: Double,
    supportingTextGap: CGFloat,
    supportingTextTypescale: TanreiTextStyle,
    spacings: TanreiFieldGroupSpacings,
    conditions: TanreiFieldGroupConditions
  ) {
    self.errorTextGap = errorTextGap
    self.fieldMinWidth = fieldMinWidth
    self.gapInline = gapInline
    self.labelGap = labelGap
    self.labelTypescale = labelTypescale
    self.requirementAsteriskGap = requirementAsteriskGap
    self.requirementGap = requirementGap
    self.requirementMark = requirementMark
    self.supportingTextGap = supportingTextGap
    self.supportingTextTypescale = supportingTextTypescale
    self.spacings = spacings
    self.conditions = conditions
  }
}

/// A value of field's `condition` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiFieldCondition(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiFieldCondition: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let standard = TanreiFieldCondition(rawValue: "standard")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiFieldCondition] = [.standard]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiFieldCondition.standard
}

/// How one condition of field is drawn in one state.
public struct TanreiFieldConditionStateTokens: Sendable, Equatable {
  public var labelColor: TanreiPaint
  public var labelIconColor: TanreiPaint
  public var supportingTextColor: TanreiPaint
  public var requiredAsteriskColor: TanreiPaint
  public var errorLabelColor: TanreiPaint
  public var errorLabelIconColor: TanreiPaint
  public var errorSupportingTextColor: TanreiPaint
  public var errorRequiredAsteriskColor: TanreiPaint
  public var counterColor: TanreiPaint
  public var errorCounterColor: TanreiPaint
  public var valueTextColor: TanreiPaint
  public var errorValueTextColor: TanreiPaint
  public var errorTextColor: TanreiPaint

  public init(
    labelColor: TanreiPaint,
    labelIconColor: TanreiPaint,
    supportingTextColor: TanreiPaint,
    requiredAsteriskColor: TanreiPaint,
    errorLabelColor: TanreiPaint,
    errorLabelIconColor: TanreiPaint,
    errorSupportingTextColor: TanreiPaint,
    errorRequiredAsteriskColor: TanreiPaint,
    counterColor: TanreiPaint,
    errorCounterColor: TanreiPaint,
    valueTextColor: TanreiPaint,
    errorValueTextColor: TanreiPaint,
    errorTextColor: TanreiPaint
  ) {
    self.labelColor = labelColor
    self.labelIconColor = labelIconColor
    self.supportingTextColor = supportingTextColor
    self.requiredAsteriskColor = requiredAsteriskColor
    self.errorLabelColor = errorLabelColor
    self.errorLabelIconColor = errorLabelIconColor
    self.errorSupportingTextColor = errorSupportingTextColor
    self.errorRequiredAsteriskColor = errorRequiredAsteriskColor
    self.counterColor = counterColor
    self.errorCounterColor = errorCounterColor
    self.valueTextColor = valueTextColor
    self.errorValueTextColor = errorValueTextColor
    self.errorTextColor = errorTextColor
  }
}

/// One condition of field: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiFieldConditionTokens: Sendable, Equatable {
  public var enabled: TanreiFieldConditionStateTokens
  public var focused: TanreiFieldConditionStateTokens
  public var disabled: TanreiFieldConditionStateTokens

  public init(
    enabled: TanreiFieldConditionStateTokens,
    focused: TanreiFieldConditionStateTokens,
    disabled: TanreiFieldConditionStateTokens
  ) {
    self.enabled = enabled
    self.focused = focused
    self.disabled = disabled
  }

  /// The tokens of this condition of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `hovered`, `pressed`, which field has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiFieldConditionStateTokens? {
    switch state {
    case .enabled: return enabled
    case .hovered: return nil
    case .focused: return focused
    case .pressed: return nil
    case .disabled: return disabled
    }
  }
}

/// The conditions of field: named fields for the core values, `extra` for what a design system added.
/// Read one with `conditions[key]`.
public struct TanreiFieldConditions: Sendable, Equatable {
  public var standard: TanreiFieldConditionTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiFieldCondition: TanreiFieldConditionTokens]

  public init(
    standard: TanreiFieldConditionTokens,
    extra: [TanreiFieldCondition: TanreiFieldConditionTokens] = [:]
  ) {
    self.standard = standard
    self.extra = extra
  }

  /// The tokens of one field condition, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiFieldCondition) -> TanreiFieldConditionTokens? {
    switch key {
    case .standard: return standard
    default: return extra[key]
    }
  }

  /// Total lookup: a field condition this design system does not have reads the tokens of `standard`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiFieldCondition) -> TanreiFieldConditionTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no field condition \"\(key.rawValue)\"; using \"standard\"")
    return standard
  }

  /// Every field condition of this design system: the core ones, then what it added.
  public var keys: [TanreiFieldCondition] { TanreiFieldCondition.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Component tokens of field (comp.field).
public struct TanreiFieldTokens: Sendable, Equatable {
  public var counterGap: CGFloat
  public var errorTextGap: CGFloat
  public var errorTextPlacement: Double
  public var labelIconGap: CGFloat
  public var labelIconSize: CGFloat
  public var labelGap: CGFloat
  public var labelTypescale: TanreiTextStyle
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var requirementAsteriskGap: CGFloat
  public var requirementGap: CGFloat
  public var requirementMark: Double
  public var supportingTextGap: CGFloat
  public var supportingTextTypescale: TanreiTextStyle
  public var valueTextGap: CGFloat
  public var valueTextTypescale: TanreiTextStyle
  public var conditions: TanreiFieldConditions

  public init(
    counterGap: CGFloat,
    errorTextGap: CGFloat,
    errorTextPlacement: Double,
    labelIconGap: CGFloat,
    labelIconSize: CGFloat,
    labelGap: CGFloat,
    labelTypescale: TanreiTextStyle,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    requirementAsteriskGap: CGFloat,
    requirementGap: CGFloat,
    requirementMark: Double,
    supportingTextGap: CGFloat,
    supportingTextTypescale: TanreiTextStyle,
    valueTextGap: CGFloat,
    valueTextTypescale: TanreiTextStyle,
    conditions: TanreiFieldConditions
  ) {
    self.counterGap = counterGap
    self.errorTextGap = errorTextGap
    self.errorTextPlacement = errorTextPlacement
    self.labelIconGap = labelIconGap
    self.labelIconSize = labelIconSize
    self.labelGap = labelGap
    self.labelTypescale = labelTypescale
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.requirementAsteriskGap = requirementAsteriskGap
    self.requirementGap = requirementGap
    self.requirementMark = requirementMark
    self.supportingTextGap = supportingTextGap
    self.supportingTextTypescale = supportingTextTypescale
    self.valueTextGap = valueTextGap
    self.valueTextTypescale = valueTextTypescale
    self.conditions = conditions
  }
}

/// A value of figure's `variant` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiFigureVariant(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiFigureVariant: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let outlined = TanreiFigureVariant(rawValue: "outlined")
  public static let filled = TanreiFigureVariant(rawValue: "filled")
  public static let plain = TanreiFigureVariant(rawValue: "plain")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiFigureVariant] = [.outlined, .filled, .plain]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiFigureVariant.outlined
}

/// Everything of figure that depends on its variant.
public struct TanreiFigureVariantTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
  }
}

/// The variants of figure: named fields for the core values, `extra` for what a design system added.
/// Read one with `variants[key]`.
public struct TanreiFigureVariants: Sendable, Equatable {
  public var outlined: TanreiFigureVariantTokens
  public var filled: TanreiFigureVariantTokens
  public var plain: TanreiFigureVariantTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiFigureVariant: TanreiFigureVariantTokens]

  public init(
    outlined: TanreiFigureVariantTokens,
    filled: TanreiFigureVariantTokens,
    plain: TanreiFigureVariantTokens,
    extra: [TanreiFigureVariant: TanreiFigureVariantTokens] = [:]
  ) {
    self.outlined = outlined
    self.filled = filled
    self.plain = plain
    self.extra = extra
  }

  /// The tokens of one figure variant, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiFigureVariant) -> TanreiFigureVariantTokens? {
    switch key {
    case .outlined: return outlined
    case .filled: return filled
    case .plain: return plain
    default: return extra[key]
    }
  }

  /// Total lookup: a figure variant this design system does not have reads the tokens of `outlined`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiFigureVariant) -> TanreiFigureVariantTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no figure variant \"\(key.rawValue)\"; using \"outlined\"")
    return outlined
  }

  /// Every figure variant of this design system: the core ones, then what it added.
  public var keys: [TanreiFigureVariant] { TanreiFigureVariant.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Component tokens of figure (comp.figure).
public struct TanreiFigureTokens: Sendable, Equatable {
  public var attachmentGap: CGFloat
  public var captionColor: TanreiPaint
  public var captionGap: CGFloat
  public var captionTypescale: TanreiTextStyle
  public var containerShape: CGFloat
  public var contentColor: TanreiPaint
  public var dividerColor: TanreiPaint
  public var dividerThickness: CGFloat
  public var headerGap: CGFloat
  public var headerPaddingBlock: CGFloat
  public var headerPaddingInline: CGFloat
  public var headerPaddingInlineEndWithActions: CGFloat
  public var outlineColor: TanreiPaint
  public var outlineWidth: CGFloat
  public var separation: Double
  public var stagePaddingBlock: CGFloat
  public var stagePaddingInline: CGFloat
  public var titleColor: TanreiPaint
  public var titleTypescale: TanreiTextStyle
  public var variants: TanreiFigureVariants

  public init(
    attachmentGap: CGFloat,
    captionColor: TanreiPaint,
    captionGap: CGFloat,
    captionTypescale: TanreiTextStyle,
    containerShape: CGFloat,
    contentColor: TanreiPaint,
    dividerColor: TanreiPaint,
    dividerThickness: CGFloat,
    headerGap: CGFloat,
    headerPaddingBlock: CGFloat,
    headerPaddingInline: CGFloat,
    headerPaddingInlineEndWithActions: CGFloat,
    outlineColor: TanreiPaint,
    outlineWidth: CGFloat,
    separation: Double,
    stagePaddingBlock: CGFloat,
    stagePaddingInline: CGFloat,
    titleColor: TanreiPaint,
    titleTypescale: TanreiTextStyle,
    variants: TanreiFigureVariants
  ) {
    self.attachmentGap = attachmentGap
    self.captionColor = captionColor
    self.captionGap = captionGap
    self.captionTypescale = captionTypescale
    self.containerShape = containerShape
    self.contentColor = contentColor
    self.dividerColor = dividerColor
    self.dividerThickness = dividerThickness
    self.headerGap = headerGap
    self.headerPaddingBlock = headerPaddingBlock
    self.headerPaddingInline = headerPaddingInline
    self.headerPaddingInlineEndWithActions = headerPaddingInlineEndWithActions
    self.outlineColor = outlineColor
    self.outlineWidth = outlineWidth
    self.separation = separation
    self.stagePaddingBlock = stagePaddingBlock
    self.stagePaddingInline = stagePaddingInline
    self.titleColor = titleColor
    self.titleTypescale = titleTypescale
    self.variants = variants
  }
}

/// A value of file-item's `form` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiFileItemForm(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiFileItemForm: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let row = TanreiFileItemForm(rawValue: "row")
  public static let tile = TanreiFileItemForm(rawValue: "tile")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiFileItemForm] = [.row, .tile]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiFileItemForm.row
}

/// How one form of file-item is drawn in one state.
public struct TanreiFileItemFormStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var stateLayerColor: TanreiPaint
  public var actionContainerColor: TanreiPaint
  public var actionIconColor: TanreiPaint
  public var actionStateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    stateLayerColor: TanreiPaint,
    actionContainerColor: TanreiPaint,
    actionIconColor: TanreiPaint,
    actionStateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.stateLayerColor = stateLayerColor
    self.actionContainerColor = actionContainerColor
    self.actionIconColor = actionIconColor
    self.actionStateLayerColor = actionStateLayerColor
  }
}

/// One form of file-item: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiFileItemFormTokens: Sendable, Equatable {
  public var enabled: TanreiFileItemFormStateTokens
  public var hovered: TanreiFileItemFormStateTokens
  public var focused: TanreiFileItemFormStateTokens
  public var pressed: TanreiFileItemFormStateTokens
  public var disabled: TanreiFileItemFormStateTokens

  public init(
    enabled: TanreiFileItemFormStateTokens,
    hovered: TanreiFileItemFormStateTokens,
    focused: TanreiFileItemFormStateTokens,
    pressed: TanreiFileItemFormStateTokens,
    disabled: TanreiFileItemFormStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this form of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiFileItemFormStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The forms of file-item: named fields for the core values, `extra` for what a design system added.
/// Read one with `forms[key]`.
public struct TanreiFileItemForms: Sendable, Equatable {
  public var row: TanreiFileItemFormTokens
  public var tile: TanreiFileItemFormTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiFileItemForm: TanreiFileItemFormTokens]

  public init(
    row: TanreiFileItemFormTokens,
    tile: TanreiFileItemFormTokens,
    extra: [TanreiFileItemForm: TanreiFileItemFormTokens] = [:]
  ) {
    self.row = row
    self.tile = tile
    self.extra = extra
  }

  /// The tokens of one file-item form, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiFileItemForm) -> TanreiFileItemFormTokens? {
    switch key {
    case .row: return row
    case .tile: return tile
    default: return extra[key]
    }
  }

  /// Total lookup: a file-item form this design system does not have reads the tokens of `row`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiFileItemForm) -> TanreiFileItemFormTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no file-item form \"\(key.rawValue)\"; using \"row\"")
    return row
  }

  /// Every file-item form of this design system: the core ones, then what it added.
  public var keys: [TanreiFileItemForm] { TanreiFileItemForm.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of file-item that depend on the state but not on the variant.
public struct TanreiFileItemStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of file-item (comp.file-item).
public struct TanreiFileItemTokens: Sendable, Equatable {
  public var actionGap: CGFloat
  public var actionIconSize: CGFloat
  public var actionShape: CGFloat
  public var actionSize: CGFloat
  public var doneIconColor: TanreiPaint
  public var errorIconColor: TanreiPaint
  public var errorSupportingTextColor: TanreiPaint
  public var headlineColor: TanreiPaint
  public var headlineTypescale: TanreiTextStyle
  public var iconColor: TanreiPaint
  public var mediaColor: TanreiPaint
  public var motionCycleDuration: Double
  public var motionCycleEasing: TanreiCubicBezier
  public var motionFeedbackDuration: Double
  public var motionProgressDuration: Double
  public var motionProgressEasing: TanreiCubicBezier
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var progressGap: CGFloat
  public var progressIndicatorColor: TanreiPaint
  public var progressShape: CGFloat
  public var progressThickness: CGFloat
  public var progressTrackColor: TanreiPaint
  public var rowContainerGap: CGFloat
  public var rowContainerOutset: CGFloat
  public var rowContainerShape: CGFloat
  public var rowIconSize: CGFloat
  public var rowMediaHeight: CGFloat
  public var rowMediaShape: CGFloat
  public var statusIconGap: CGFloat
  public var statusIconSize: CGFloat
  public var supportingTextColor: TanreiPaint
  public var supportingTextTypescale: TanreiTextStyle
  public var tileActionInset: CGFloat
  public var tileContainerGap: CGFloat
  public var tileContainerShape: CGFloat
  public var tileIconSize: CGFloat
  public var tileMediaHeight: CGFloat
  public var forms: TanreiFileItemForms
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiFileItemStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiFileItemStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiFileItemStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiFileItemStateTokens

  public init(
    actionGap: CGFloat,
    actionIconSize: CGFloat,
    actionShape: CGFloat,
    actionSize: CGFloat,
    doneIconColor: TanreiPaint,
    errorIconColor: TanreiPaint,
    errorSupportingTextColor: TanreiPaint,
    headlineColor: TanreiPaint,
    headlineTypescale: TanreiTextStyle,
    iconColor: TanreiPaint,
    mediaColor: TanreiPaint,
    motionCycleDuration: Double,
    motionCycleEasing: TanreiCubicBezier,
    motionFeedbackDuration: Double,
    motionProgressDuration: Double,
    motionProgressEasing: TanreiCubicBezier,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    progressGap: CGFloat,
    progressIndicatorColor: TanreiPaint,
    progressShape: CGFloat,
    progressThickness: CGFloat,
    progressTrackColor: TanreiPaint,
    rowContainerGap: CGFloat,
    rowContainerOutset: CGFloat,
    rowContainerShape: CGFloat,
    rowIconSize: CGFloat,
    rowMediaHeight: CGFloat,
    rowMediaShape: CGFloat,
    statusIconGap: CGFloat,
    statusIconSize: CGFloat,
    supportingTextColor: TanreiPaint,
    supportingTextTypescale: TanreiTextStyle,
    tileActionInset: CGFloat,
    tileContainerGap: CGFloat,
    tileContainerShape: CGFloat,
    tileIconSize: CGFloat,
    tileMediaHeight: CGFloat,
    forms: TanreiFileItemForms,
    hovered: TanreiFileItemStateTokens,
    focused: TanreiFileItemStateTokens,
    pressed: TanreiFileItemStateTokens,
    disabled: TanreiFileItemStateTokens
  ) {
    self.actionGap = actionGap
    self.actionIconSize = actionIconSize
    self.actionShape = actionShape
    self.actionSize = actionSize
    self.doneIconColor = doneIconColor
    self.errorIconColor = errorIconColor
    self.errorSupportingTextColor = errorSupportingTextColor
    self.headlineColor = headlineColor
    self.headlineTypescale = headlineTypescale
    self.iconColor = iconColor
    self.mediaColor = mediaColor
    self.motionCycleDuration = motionCycleDuration
    self.motionCycleEasing = motionCycleEasing
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionProgressDuration = motionProgressDuration
    self.motionProgressEasing = motionProgressEasing
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.progressGap = progressGap
    self.progressIndicatorColor = progressIndicatorColor
    self.progressShape = progressShape
    self.progressThickness = progressThickness
    self.progressTrackColor = progressTrackColor
    self.rowContainerGap = rowContainerGap
    self.rowContainerOutset = rowContainerOutset
    self.rowContainerShape = rowContainerShape
    self.rowIconSize = rowIconSize
    self.rowMediaHeight = rowMediaHeight
    self.rowMediaShape = rowMediaShape
    self.statusIconGap = statusIconGap
    self.statusIconSize = statusIconSize
    self.supportingTextColor = supportingTextColor
    self.supportingTextTypescale = supportingTextTypescale
    self.tileActionInset = tileActionInset
    self.tileContainerGap = tileContainerGap
    self.tileContainerShape = tileContainerShape
    self.tileIconSize = tileIconSize
    self.tileMediaHeight = tileMediaHeight
    self.forms = forms
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which file-item has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiFileItemStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// A value of file-picker's `condition` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiFilePickerCondition(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiFilePickerCondition: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let standard = TanreiFilePickerCondition(rawValue: "standard")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiFilePickerCondition] = [.standard]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiFilePickerCondition.standard
}

/// How one condition of file-picker is drawn in one state.
public struct TanreiFilePickerConditionStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var outlineColor: TanreiPaint
  public var iconColor: TanreiPaint
  public var labelColor: TanreiPaint
  public var supportingTextColor: TanreiPaint
  public var selectionTextColor: TanreiPaint
  public var stateLayerColor: TanreiPaint
  public var errorOutlineColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    outlineColor: TanreiPaint,
    iconColor: TanreiPaint,
    labelColor: TanreiPaint,
    supportingTextColor: TanreiPaint,
    selectionTextColor: TanreiPaint,
    stateLayerColor: TanreiPaint,
    errorOutlineColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.outlineColor = outlineColor
    self.iconColor = iconColor
    self.labelColor = labelColor
    self.supportingTextColor = supportingTextColor
    self.selectionTextColor = selectionTextColor
    self.stateLayerColor = stateLayerColor
    self.errorOutlineColor = errorOutlineColor
  }
}

/// One condition of file-picker: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiFilePickerConditionTokens: Sendable, Equatable {
  public var enabled: TanreiFilePickerConditionStateTokens
  public var hovered: TanreiFilePickerConditionStateTokens
  public var focused: TanreiFilePickerConditionStateTokens
  public var pressed: TanreiFilePickerConditionStateTokens
  public var disabled: TanreiFilePickerConditionStateTokens

  public init(
    enabled: TanreiFilePickerConditionStateTokens,
    hovered: TanreiFilePickerConditionStateTokens,
    focused: TanreiFilePickerConditionStateTokens,
    pressed: TanreiFilePickerConditionStateTokens,
    disabled: TanreiFilePickerConditionStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this condition of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiFilePickerConditionStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The conditions of file-picker: named fields for the core values, `extra` for what a design system added.
/// Read one with `conditions[key]`.
public struct TanreiFilePickerConditions: Sendable, Equatable {
  public var standard: TanreiFilePickerConditionTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiFilePickerCondition: TanreiFilePickerConditionTokens]

  public init(
    standard: TanreiFilePickerConditionTokens,
    extra: [TanreiFilePickerCondition: TanreiFilePickerConditionTokens] = [:]
  ) {
    self.standard = standard
    self.extra = extra
  }

  /// The tokens of one file-picker condition, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiFilePickerCondition) -> TanreiFilePickerConditionTokens? {
    switch key {
    case .standard: return standard
    default: return extra[key]
    }
  }

  /// Total lookup: a file-picker condition this design system does not have reads the tokens of `standard`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiFilePickerCondition) -> TanreiFilePickerConditionTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no file-picker condition \"\(key.rawValue)\"; using \"standard\"")
    return standard
  }

  /// Every file-picker condition of this design system: the core ones, then what it added.
  public var keys: [TanreiFilePickerCondition] { TanreiFilePickerCondition.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of file-picker that depend on the state but not on the variant.
public struct TanreiFilePickerStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of file-picker (comp.file-picker).
public struct TanreiFilePickerTokens: Sendable, Equatable {
  public var containerGap: CGFloat
  public var containerPaddingBlock: CGFloat
  public var containerPaddingInline: CGFloat
  public var containerShape: CGFloat
  public var iconSize: CGFloat
  public var labelTypescale: TanreiTextStyle
  public var motionFeedbackDuration: Double
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var outlineDashLength: CGFloat
  public var outlineStyle: Double
  public var outlineWidth: CGFloat
  public var receivingContainerColor: TanreiPaint
  public var receivingContentColor: TanreiPaint
  public var receivingOutlineColor: TanreiPaint
  public var refusingIconColor: TanreiPaint
  public var refusingOutlineColor: TanreiPaint
  public var selectionTextTypescale: TanreiTextStyle
  public var supportingTextGap: CGFloat
  public var supportingTextTypescale: TanreiTextStyle
  public var triggerGap: CGFloat
  public var conditions: TanreiFilePickerConditions
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiFilePickerStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiFilePickerStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiFilePickerStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiFilePickerStateTokens

  public init(
    containerGap: CGFloat,
    containerPaddingBlock: CGFloat,
    containerPaddingInline: CGFloat,
    containerShape: CGFloat,
    iconSize: CGFloat,
    labelTypescale: TanreiTextStyle,
    motionFeedbackDuration: Double,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    outlineDashLength: CGFloat,
    outlineStyle: Double,
    outlineWidth: CGFloat,
    receivingContainerColor: TanreiPaint,
    receivingContentColor: TanreiPaint,
    receivingOutlineColor: TanreiPaint,
    refusingIconColor: TanreiPaint,
    refusingOutlineColor: TanreiPaint,
    selectionTextTypescale: TanreiTextStyle,
    supportingTextGap: CGFloat,
    supportingTextTypescale: TanreiTextStyle,
    triggerGap: CGFloat,
    conditions: TanreiFilePickerConditions,
    hovered: TanreiFilePickerStateTokens,
    focused: TanreiFilePickerStateTokens,
    pressed: TanreiFilePickerStateTokens,
    disabled: TanreiFilePickerStateTokens
  ) {
    self.containerGap = containerGap
    self.containerPaddingBlock = containerPaddingBlock
    self.containerPaddingInline = containerPaddingInline
    self.containerShape = containerShape
    self.iconSize = iconSize
    self.labelTypescale = labelTypescale
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.outlineDashLength = outlineDashLength
    self.outlineStyle = outlineStyle
    self.outlineWidth = outlineWidth
    self.receivingContainerColor = receivingContainerColor
    self.receivingContentColor = receivingContentColor
    self.receivingOutlineColor = receivingOutlineColor
    self.refusingIconColor = refusingIconColor
    self.refusingOutlineColor = refusingOutlineColor
    self.selectionTextTypescale = selectionTextTypescale
    self.supportingTextGap = supportingTextGap
    self.supportingTextTypescale = supportingTextTypescale
    self.triggerGap = triggerGap
    self.conditions = conditions
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which file-picker has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiFilePickerStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// Component tokens of file-upload (comp.file-upload).
public struct TanreiFileUploadTokens: Sendable, Equatable {
  public var listGap: CGFloat
  public var listItemGap: CGFloat

  public init(
    listGap: CGFloat,
    listItemGap: CGFloat
  ) {
    self.listGap = listGap
    self.listItemGap = listItemGap
  }
}

/// Component tokens of image-preview (comp.image-preview).
public struct TanreiImagePreviewTokens: Sendable, Equatable {
  public var barButtonVariant: Double
  public var barContainerColor: TanreiPaint
  public var barGap: CGFloat
  public var barHeight: CGFloat
  public var barPaddingInline: CGFloat
  public var captionColor: TanreiPaint
  public var captionContainerColor: TanreiPaint
  public var captionMaxWidth: CGFloat
  public var captionPaddingBlock: CGFloat
  public var captionPaddingInline: CGFloat
  public var captionTypescale: TanreiTextStyle
  public var containerColor: TanreiPaint
  public var countColor: TanreiPaint
  public var countPaddingInline: CGFloat
  public var countTypescale: TanreiTextStyle
  public var errorGap: CGFloat
  public var errorIconColor: TanreiPaint
  public var errorIconSize: CGFloat
  public var errorTextColor: TanreiPaint
  public var errorTextTypescale: TanreiTextStyle
  public var layoutPageGap: CGFloat
  public var motionControlsDuration: Double
  public var motionControlsEasing: TanreiCubicBezier
  public var motionEnterDuration: Double
  public var motionEnterEasing: TanreiCubicBezier
  public var motionEnterScale: Double
  public var motionExitDuration: Double
  public var motionExitEasing: TanreiCubicBezier
  public var motionPageDuration: Double
  public var motionPageEasing: TanreiCubicBezier
  public var motionZoomDuration: Double
  public var motionZoomEasing: TanreiCubicBezier
  public var navigationButtonVariant: Double
  public var navigationMarginInline: CGFloat

  public init(
    barButtonVariant: Double,
    barContainerColor: TanreiPaint,
    barGap: CGFloat,
    barHeight: CGFloat,
    barPaddingInline: CGFloat,
    captionColor: TanreiPaint,
    captionContainerColor: TanreiPaint,
    captionMaxWidth: CGFloat,
    captionPaddingBlock: CGFloat,
    captionPaddingInline: CGFloat,
    captionTypescale: TanreiTextStyle,
    containerColor: TanreiPaint,
    countColor: TanreiPaint,
    countPaddingInline: CGFloat,
    countTypescale: TanreiTextStyle,
    errorGap: CGFloat,
    errorIconColor: TanreiPaint,
    errorIconSize: CGFloat,
    errorTextColor: TanreiPaint,
    errorTextTypescale: TanreiTextStyle,
    layoutPageGap: CGFloat,
    motionControlsDuration: Double,
    motionControlsEasing: TanreiCubicBezier,
    motionEnterDuration: Double,
    motionEnterEasing: TanreiCubicBezier,
    motionEnterScale: Double,
    motionExitDuration: Double,
    motionExitEasing: TanreiCubicBezier,
    motionPageDuration: Double,
    motionPageEasing: TanreiCubicBezier,
    motionZoomDuration: Double,
    motionZoomEasing: TanreiCubicBezier,
    navigationButtonVariant: Double,
    navigationMarginInline: CGFloat
  ) {
    self.barButtonVariant = barButtonVariant
    self.barContainerColor = barContainerColor
    self.barGap = barGap
    self.barHeight = barHeight
    self.barPaddingInline = barPaddingInline
    self.captionColor = captionColor
    self.captionContainerColor = captionContainerColor
    self.captionMaxWidth = captionMaxWidth
    self.captionPaddingBlock = captionPaddingBlock
    self.captionPaddingInline = captionPaddingInline
    self.captionTypescale = captionTypescale
    self.containerColor = containerColor
    self.countColor = countColor
    self.countPaddingInline = countPaddingInline
    self.countTypescale = countTypescale
    self.errorGap = errorGap
    self.errorIconColor = errorIconColor
    self.errorIconSize = errorIconSize
    self.errorTextColor = errorTextColor
    self.errorTextTypescale = errorTextTypescale
    self.layoutPageGap = layoutPageGap
    self.motionControlsDuration = motionControlsDuration
    self.motionControlsEasing = motionControlsEasing
    self.motionEnterDuration = motionEnterDuration
    self.motionEnterEasing = motionEnterEasing
    self.motionEnterScale = motionEnterScale
    self.motionExitDuration = motionExitDuration
    self.motionExitEasing = motionExitEasing
    self.motionPageDuration = motionPageDuration
    self.motionPageEasing = motionPageEasing
    self.motionZoomDuration = motionZoomDuration
    self.motionZoomEasing = motionZoomEasing
    self.navigationButtonVariant = navigationButtonVariant
    self.navigationMarginInline = navigationMarginInline
  }
}

/// Component tokens of inline-code (comp.inline-code).
public struct TanreiInlineCodeTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var containerPaddingInline: CGFloat
  public var containerShape: CGFloat
  public var labelColor: TanreiPaint
  public var labelScale: Double
  public var labelTypescale: TanreiTextStyle
  public var outlineColor: TanreiPaint
  public var outlineWidth: CGFloat

  public init(
    containerColor: TanreiPaint,
    containerPaddingInline: CGFloat,
    containerShape: CGFloat,
    labelColor: TanreiPaint,
    labelScale: Double,
    labelTypescale: TanreiTextStyle,
    outlineColor: TanreiPaint,
    outlineWidth: CGFloat
  ) {
    self.containerColor = containerColor
    self.containerPaddingInline = containerPaddingInline
    self.containerShape = containerShape
    self.labelColor = labelColor
    self.labelScale = labelScale
    self.labelTypescale = labelTypescale
    self.outlineColor = outlineColor
    self.outlineWidth = outlineWidth
  }
}

/// A value of input-box's `size` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiInputBoxSize(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiInputBoxSize: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let small = TanreiInputBoxSize(rawValue: "small")
  public static let medium = TanreiInputBoxSize(rawValue: "medium")
  public static let large = TanreiInputBoxSize(rawValue: "large")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiInputBoxSize] = [.small, .medium, .large]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiInputBoxSize.medium
}

/// Everything of input-box that depends on its size.
public struct TanreiInputBoxSizeTokens: Sendable, Equatable {
  public var containerHeight: CGFloat
  public var containerPaddingInline: CGFloat
  public var containerPaddingInlineWithIcon: CGFloat
  public var containerPaddingBlock: CGFloat
  public var containerPaddingBlockWithLabel: CGFloat
  public var containerGap: CGFloat
  public var labelTypescale: TanreiTextStyle
  public var labelFloatedTypescale: TanreiTextStyle
  public var inputTypescale: TanreiTextStyle
  public var iconSize: CGFloat

  public init(
    containerHeight: CGFloat,
    containerPaddingInline: CGFloat,
    containerPaddingInlineWithIcon: CGFloat,
    containerPaddingBlock: CGFloat,
    containerPaddingBlockWithLabel: CGFloat,
    containerGap: CGFloat,
    labelTypescale: TanreiTextStyle,
    labelFloatedTypescale: TanreiTextStyle,
    inputTypescale: TanreiTextStyle,
    iconSize: CGFloat
  ) {
    self.containerHeight = containerHeight
    self.containerPaddingInline = containerPaddingInline
    self.containerPaddingInlineWithIcon = containerPaddingInlineWithIcon
    self.containerPaddingBlock = containerPaddingBlock
    self.containerPaddingBlockWithLabel = containerPaddingBlockWithLabel
    self.containerGap = containerGap
    self.labelTypescale = labelTypescale
    self.labelFloatedTypescale = labelFloatedTypescale
    self.inputTypescale = inputTypescale
    self.iconSize = iconSize
  }
}

/// The sizes of input-box: named fields for the core values, `extra` for what a design system added.
/// Read one with `sizes[key]`.
public struct TanreiInputBoxSizes: Sendable, Equatable {
  public var small: TanreiInputBoxSizeTokens
  public var medium: TanreiInputBoxSizeTokens
  public var large: TanreiInputBoxSizeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiInputBoxSize: TanreiInputBoxSizeTokens]

  public init(
    small: TanreiInputBoxSizeTokens,
    medium: TanreiInputBoxSizeTokens,
    large: TanreiInputBoxSizeTokens,
    extra: [TanreiInputBoxSize: TanreiInputBoxSizeTokens] = [:]
  ) {
    self.small = small
    self.medium = medium
    self.large = large
    self.extra = extra
  }

  /// The tokens of one input-box size, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiInputBoxSize) -> TanreiInputBoxSizeTokens? {
    switch key {
    case .small: return small
    case .medium: return medium
    case .large: return large
    default: return extra[key]
    }
  }

  /// Total lookup: a input-box size this design system does not have reads the tokens of `medium`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiInputBoxSize) -> TanreiInputBoxSizeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no input-box size \"\(key.rawValue)\"; using \"medium\"")
    return medium
  }

  /// Every input-box size of this design system: the core ones, then what it added.
  public var keys: [TanreiInputBoxSize] { TanreiInputBoxSize.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of input-box's `variant` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiInputBoxVariant(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiInputBoxVariant: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let stacked = TanreiInputBoxVariant(rawValue: "stacked")
  public static let filled = TanreiInputBoxVariant(rawValue: "filled")
  public static let outlined = TanreiInputBoxVariant(rawValue: "outlined")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiInputBoxVariant] = [.stacked, .filled, .outlined]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiInputBoxVariant.stacked
}

/// How one variant of input-box is drawn in one state.
public struct TanreiInputBoxVariantStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var activeIndicatorColor: TanreiPaint
  public var outlineColor: TanreiPaint
  public var labelColor: TanreiPaint
  public var inputColor: TanreiPaint
  public var placeholderColor: TanreiPaint
  public var affixColor: TanreiPaint
  public var leadingIconColor: TanreiPaint
  public var trailingIconColor: TanreiPaint
  public var caretColor: TanreiPaint
  public var requiredAsteriskColor: TanreiPaint
  public var stateLayerColor: TanreiPaint
  public var errorContainerColor: TanreiPaint
  public var errorActiveIndicatorColor: TanreiPaint
  public var errorOutlineColor: TanreiPaint
  public var errorLabelColor: TanreiPaint
  public var errorInputColor: TanreiPaint
  public var errorPlaceholderColor: TanreiPaint
  public var errorAffixColor: TanreiPaint
  public var errorLeadingIconColor: TanreiPaint
  public var errorTrailingIconColor: TanreiPaint
  public var errorCaretColor: TanreiPaint
  public var errorRequiredAsteriskColor: TanreiPaint
  public var errorStateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    activeIndicatorColor: TanreiPaint,
    outlineColor: TanreiPaint,
    labelColor: TanreiPaint,
    inputColor: TanreiPaint,
    placeholderColor: TanreiPaint,
    affixColor: TanreiPaint,
    leadingIconColor: TanreiPaint,
    trailingIconColor: TanreiPaint,
    caretColor: TanreiPaint,
    requiredAsteriskColor: TanreiPaint,
    stateLayerColor: TanreiPaint,
    errorContainerColor: TanreiPaint,
    errorActiveIndicatorColor: TanreiPaint,
    errorOutlineColor: TanreiPaint,
    errorLabelColor: TanreiPaint,
    errorInputColor: TanreiPaint,
    errorPlaceholderColor: TanreiPaint,
    errorAffixColor: TanreiPaint,
    errorLeadingIconColor: TanreiPaint,
    errorTrailingIconColor: TanreiPaint,
    errorCaretColor: TanreiPaint,
    errorRequiredAsteriskColor: TanreiPaint,
    errorStateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.activeIndicatorColor = activeIndicatorColor
    self.outlineColor = outlineColor
    self.labelColor = labelColor
    self.inputColor = inputColor
    self.placeholderColor = placeholderColor
    self.affixColor = affixColor
    self.leadingIconColor = leadingIconColor
    self.trailingIconColor = trailingIconColor
    self.caretColor = caretColor
    self.requiredAsteriskColor = requiredAsteriskColor
    self.stateLayerColor = stateLayerColor
    self.errorContainerColor = errorContainerColor
    self.errorActiveIndicatorColor = errorActiveIndicatorColor
    self.errorOutlineColor = errorOutlineColor
    self.errorLabelColor = errorLabelColor
    self.errorInputColor = errorInputColor
    self.errorPlaceholderColor = errorPlaceholderColor
    self.errorAffixColor = errorAffixColor
    self.errorLeadingIconColor = errorLeadingIconColor
    self.errorTrailingIconColor = errorTrailingIconColor
    self.errorCaretColor = errorCaretColor
    self.errorRequiredAsteriskColor = errorRequiredAsteriskColor
    self.errorStateLayerColor = errorStateLayerColor
  }
}

/// One variant of input-box: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiInputBoxVariantTokens: Sendable, Equatable {
  public var enabled: TanreiInputBoxVariantStateTokens
  public var hovered: TanreiInputBoxVariantStateTokens
  public var focused: TanreiInputBoxVariantStateTokens
  public var disabled: TanreiInputBoxVariantStateTokens

  public init(
    enabled: TanreiInputBoxVariantStateTokens,
    hovered: TanreiInputBoxVariantStateTokens,
    focused: TanreiInputBoxVariantStateTokens,
    disabled: TanreiInputBoxVariantStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.disabled = disabled
  }

  /// The tokens of this variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `pressed`, which input-box has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiInputBoxVariantStateTokens? {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return nil
    case .disabled: return disabled
    }
  }
}

/// The variants of input-box: named fields for the core values, `extra` for what a design system added.
/// Read one with `variants[key]`.
public struct TanreiInputBoxVariants: Sendable, Equatable {
  public var stacked: TanreiInputBoxVariantTokens
  public var filled: TanreiInputBoxVariantTokens
  public var outlined: TanreiInputBoxVariantTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiInputBoxVariant: TanreiInputBoxVariantTokens]

  public init(
    stacked: TanreiInputBoxVariantTokens,
    filled: TanreiInputBoxVariantTokens,
    outlined: TanreiInputBoxVariantTokens,
    extra: [TanreiInputBoxVariant: TanreiInputBoxVariantTokens] = [:]
  ) {
    self.stacked = stacked
    self.filled = filled
    self.outlined = outlined
    self.extra = extra
  }

  /// The tokens of one input-box variant, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiInputBoxVariant) -> TanreiInputBoxVariantTokens? {
    switch key {
    case .stacked: return stacked
    case .filled: return filled
    case .outlined: return outlined
    default: return extra[key]
    }
  }

  /// Total lookup: a input-box variant this design system does not have reads the tokens of `stacked`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiInputBoxVariant) -> TanreiInputBoxVariantTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no input-box variant \"\(key.rawValue)\"; using \"stacked\"")
    return stacked
  }

  /// Every input-box variant of this design system: the core ones, then what it added.
  public var keys: [TanreiInputBoxVariant] { TanreiInputBoxVariant.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of input-box that depend on the state but not on the variant.
public struct TanreiInputBoxStateTokens: Sendable, Equatable {
  public var activeIndicatorWidth: CGFloat
  public var opacity: Double
  public var outlineWidth: CGFloat

  public init(
    activeIndicatorWidth: CGFloat,
    opacity: Double,
    outlineWidth: CGFloat
  ) {
    self.activeIndicatorWidth = activeIndicatorWidth
    self.opacity = opacity
    self.outlineWidth = outlineWidth
  }
}

/// Component tokens of input-box (comp.input-box).
public struct TanreiInputBoxTokens: Sendable, Equatable {
  public var activeIndicatorWidth: CGFloat
  public var affixGap: CGFloat
  public var containerShape: CGFloat
  public var containerShapeBottom: CGFloat
  public var motionLabelDuration: Double
  public var motionLabelEasing: TanreiCubicBezier
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var outlineNotchPadding: CGFloat
  public var outlineWidth: CGFloat
  public var requirementAsteriskGap: CGFloat
  public var selectionColor: TanreiPaint
  public var selectionContentColor: TanreiPaint
  public var sizes: TanreiInputBoxSizes
  public var variants: TanreiInputBoxVariants
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiInputBoxStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiInputBoxStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiInputBoxStateTokens

  public init(
    activeIndicatorWidth: CGFloat,
    affixGap: CGFloat,
    containerShape: CGFloat,
    containerShapeBottom: CGFloat,
    motionLabelDuration: Double,
    motionLabelEasing: TanreiCubicBezier,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    outlineNotchPadding: CGFloat,
    outlineWidth: CGFloat,
    requirementAsteriskGap: CGFloat,
    selectionColor: TanreiPaint,
    selectionContentColor: TanreiPaint,
    sizes: TanreiInputBoxSizes,
    variants: TanreiInputBoxVariants,
    hovered: TanreiInputBoxStateTokens,
    focused: TanreiInputBoxStateTokens,
    disabled: TanreiInputBoxStateTokens
  ) {
    self.activeIndicatorWidth = activeIndicatorWidth
    self.affixGap = affixGap
    self.containerShape = containerShape
    self.containerShapeBottom = containerShapeBottom
    self.motionLabelDuration = motionLabelDuration
    self.motionLabelEasing = motionLabelEasing
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.outlineNotchPadding = outlineNotchPadding
    self.outlineWidth = outlineWidth
    self.requirementAsteriskGap = requirementAsteriskGap
    self.selectionColor = selectionColor
    self.selectionContentColor = selectionContentColor
    self.sizes = sizes
    self.variants = variants
    self.hovered = hovered
    self.focused = focused
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, `pressed`, which input-box has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiInputBoxStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return nil
    case .disabled: return disabled
    }
  }
}

/// A value of keyboard-shortcut's `size` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiKeyboardShortcutSize(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiKeyboardShortcutSize: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let small = TanreiKeyboardShortcutSize(rawValue: "small")
  public static let medium = TanreiKeyboardShortcutSize(rawValue: "medium")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiKeyboardShortcutSize] = [.small, .medium]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiKeyboardShortcutSize.medium
}

/// Everything of keyboard-shortcut that depends on its size.
public struct TanreiKeyboardShortcutSizeTokens: Sendable, Equatable {
  public var containerHeight: CGFloat
  public var containerPaddingInline: CGFloat
  public var containerShape: CGFloat
  public var labelTypescale: TanreiTextStyle
  public var chordGap: CGFloat
  public var sequenceGap: CGFloat

  public init(
    containerHeight: CGFloat,
    containerPaddingInline: CGFloat,
    containerShape: CGFloat,
    labelTypescale: TanreiTextStyle,
    chordGap: CGFloat,
    sequenceGap: CGFloat
  ) {
    self.containerHeight = containerHeight
    self.containerPaddingInline = containerPaddingInline
    self.containerShape = containerShape
    self.labelTypescale = labelTypescale
    self.chordGap = chordGap
    self.sequenceGap = sequenceGap
  }
}

/// The sizes of keyboard-shortcut: named fields for the core values, `extra` for what a design system added.
/// Read one with `sizes[key]`.
public struct TanreiKeyboardShortcutSizes: Sendable, Equatable {
  public var small: TanreiKeyboardShortcutSizeTokens
  public var medium: TanreiKeyboardShortcutSizeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiKeyboardShortcutSize: TanreiKeyboardShortcutSizeTokens]

  public init(
    small: TanreiKeyboardShortcutSizeTokens,
    medium: TanreiKeyboardShortcutSizeTokens,
    extra: [TanreiKeyboardShortcutSize: TanreiKeyboardShortcutSizeTokens] = [:]
  ) {
    self.small = small
    self.medium = medium
    self.extra = extra
  }

  /// The tokens of one keyboard-shortcut size, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiKeyboardShortcutSize) -> TanreiKeyboardShortcutSizeTokens? {
    switch key {
    case .small: return small
    case .medium: return medium
    default: return extra[key]
    }
  }

  /// Total lookup: a keyboard-shortcut size this design system does not have reads the tokens of `medium`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiKeyboardShortcutSize) -> TanreiKeyboardShortcutSizeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no keyboard-shortcut size \"\(key.rawValue)\"; using \"medium\"")
    return medium
  }

  /// Every keyboard-shortcut size of this design system: the core ones, then what it added.
  public var keys: [TanreiKeyboardShortcutSize] { TanreiKeyboardShortcutSize.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of keyboard-shortcut's `variant` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiKeyboardShortcutVariant(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiKeyboardShortcutVariant: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let keycap = TanreiKeyboardShortcutVariant(rawValue: "keycap")
  public static let plain = TanreiKeyboardShortcutVariant(rawValue: "plain")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiKeyboardShortcutVariant] = [.keycap, .plain]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiKeyboardShortcutVariant.keycap
}

/// How one variant of keyboard-shortcut is drawn in one state.
public struct TanreiKeyboardShortcutVariantStateTokens: Sendable, Equatable {
  public var labelColor: TanreiPaint

  public init(
    labelColor: TanreiPaint
  ) {
    self.labelColor = labelColor
  }
}

/// One variant of keyboard-shortcut: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiKeyboardShortcutVariantTokens: Sendable, Equatable {
  public var enabled: TanreiKeyboardShortcutVariantStateTokens
  public var disabled: TanreiKeyboardShortcutVariantStateTokens

  public init(
    enabled: TanreiKeyboardShortcutVariantStateTokens,
    disabled: TanreiKeyboardShortcutVariantStateTokens
  ) {
    self.enabled = enabled
    self.disabled = disabled
  }

  /// The tokens of this variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `hovered`, `focused`, `pressed`, which keyboard-shortcut has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiKeyboardShortcutVariantStateTokens? {
    switch state {
    case .enabled: return enabled
    case .hovered: return nil
    case .focused: return nil
    case .pressed: return nil
    case .disabled: return disabled
    }
  }
}

/// The variants of keyboard-shortcut: named fields for the core values, `extra` for what a design system added.
/// Read one with `variants[key]`.
public struct TanreiKeyboardShortcutVariants: Sendable, Equatable {
  public var keycap: TanreiKeyboardShortcutVariantTokens
  public var plain: TanreiKeyboardShortcutVariantTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiKeyboardShortcutVariant: TanreiKeyboardShortcutVariantTokens]

  public init(
    keycap: TanreiKeyboardShortcutVariantTokens,
    plain: TanreiKeyboardShortcutVariantTokens,
    extra: [TanreiKeyboardShortcutVariant: TanreiKeyboardShortcutVariantTokens] = [:]
  ) {
    self.keycap = keycap
    self.plain = plain
    self.extra = extra
  }

  /// The tokens of one keyboard-shortcut variant, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiKeyboardShortcutVariant) -> TanreiKeyboardShortcutVariantTokens? {
    switch key {
    case .keycap: return keycap
    case .plain: return plain
    default: return extra[key]
    }
  }

  /// Total lookup: a keyboard-shortcut variant this design system does not have reads the tokens of `keycap`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiKeyboardShortcutVariant) -> TanreiKeyboardShortcutVariantTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no keyboard-shortcut variant \"\(key.rawValue)\"; using \"keycap\"")
    return keycap
  }

  /// Every keyboard-shortcut variant of this design system: the core ones, then what it added.
  public var keys: [TanreiKeyboardShortcutVariant] { TanreiKeyboardShortcutVariant.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Component tokens of keyboard-shortcut (comp.keyboard-shortcut).
public struct TanreiKeyboardShortcutTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var outlineBottomWidth: CGFloat
  public var outlineColor: TanreiPaint
  public var outlineWidth: CGFloat
  public var sizes: TanreiKeyboardShortcutSizes
  public var variants: TanreiKeyboardShortcutVariants

  public init(
    containerColor: TanreiPaint,
    outlineBottomWidth: CGFloat,
    outlineColor: TanreiPaint,
    outlineWidth: CGFloat,
    sizes: TanreiKeyboardShortcutSizes,
    variants: TanreiKeyboardShortcutVariants
  ) {
    self.containerColor = containerColor
    self.outlineBottomWidth = outlineBottomWidth
    self.outlineColor = outlineColor
    self.outlineWidth = outlineWidth
    self.sizes = sizes
    self.variants = variants
  }
}

/// A value of link-card's `variant` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiLinkCardVariant(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiLinkCardVariant: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let outlined = TanreiLinkCardVariant(rawValue: "outlined")
  public static let filled = TanreiLinkCardVariant(rawValue: "filled")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiLinkCardVariant] = [.outlined, .filled]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiLinkCardVariant.outlined
}

/// How one variant of link-card is drawn in one state.
public struct TanreiLinkCardVariantStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var outlineColor: TanreiPaint
  public var titleColor: TanreiPaint
  public var descriptionColor: TanreiPaint
  public var siteColor: TanreiPaint
  public var stateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    outlineColor: TanreiPaint,
    titleColor: TanreiPaint,
    descriptionColor: TanreiPaint,
    siteColor: TanreiPaint,
    stateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.outlineColor = outlineColor
    self.titleColor = titleColor
    self.descriptionColor = descriptionColor
    self.siteColor = siteColor
    self.stateLayerColor = stateLayerColor
  }
}

/// One variant of link-card: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiLinkCardVariantTokens: Sendable, Equatable {
  public var enabled: TanreiLinkCardVariantStateTokens
  public var hovered: TanreiLinkCardVariantStateTokens
  public var focused: TanreiLinkCardVariantStateTokens
  public var pressed: TanreiLinkCardVariantStateTokens

  public init(
    enabled: TanreiLinkCardVariantStateTokens,
    hovered: TanreiLinkCardVariantStateTokens,
    focused: TanreiLinkCardVariantStateTokens,
    pressed: TanreiLinkCardVariantStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
  }

  /// The tokens of this variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `disabled`, which link-card has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiLinkCardVariantStateTokens? {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return nil
    }
  }
}

/// The variants of link-card: named fields for the core values, `extra` for what a design system added.
/// Read one with `variants[key]`.
public struct TanreiLinkCardVariants: Sendable, Equatable {
  public var outlined: TanreiLinkCardVariantTokens
  public var filled: TanreiLinkCardVariantTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiLinkCardVariant: TanreiLinkCardVariantTokens]

  public init(
    outlined: TanreiLinkCardVariantTokens,
    filled: TanreiLinkCardVariantTokens,
    extra: [TanreiLinkCardVariant: TanreiLinkCardVariantTokens] = [:]
  ) {
    self.outlined = outlined
    self.filled = filled
    self.extra = extra
  }

  /// The tokens of one link-card variant, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiLinkCardVariant) -> TanreiLinkCardVariantTokens? {
    switch key {
    case .outlined: return outlined
    case .filled: return filled
    default: return extra[key]
    }
  }

  /// Total lookup: a link-card variant this design system does not have reads the tokens of `outlined`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiLinkCardVariant) -> TanreiLinkCardVariantTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no link-card variant \"\(key.rawValue)\"; using \"outlined\"")
    return outlined
  }

  /// Every link-card variant of this design system: the core ones, then what it added.
  public var keys: [TanreiLinkCardVariant] { TanreiLinkCardVariant.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of link-card that depend on the state but not on the variant.
public struct TanreiLinkCardStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of link-card (comp.link-card).
public struct TanreiLinkCardTokens: Sendable, Equatable {
  public var containerPadding: CGFloat
  public var containerShape: CGFloat
  public var descriptionMaxLines: Double
  public var descriptionTypescale: TanreiTextStyle
  public var layoutBesideMinWidth: CGFloat
  public var mediaAspectRatio: Double
  public var mediaContainerColor: TanreiPaint
  public var mediaWidth: CGFloat
  public var motionFeedbackDuration: Double
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var outlineWidth: CGFloat
  public var siteGap: CGFloat
  public var siteIconShape: CGFloat
  public var siteIconSize: CGFloat
  public var siteItemGap: CGFloat
  public var siteTypescale: TanreiTextStyle
  public var titleGap: CGFloat
  public var titleMaxLines: Double
  public var titleTypescale: TanreiTextStyle
  public var variants: TanreiLinkCardVariants
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiLinkCardStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiLinkCardStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiLinkCardStateTokens

  public init(
    containerPadding: CGFloat,
    containerShape: CGFloat,
    descriptionMaxLines: Double,
    descriptionTypescale: TanreiTextStyle,
    layoutBesideMinWidth: CGFloat,
    mediaAspectRatio: Double,
    mediaContainerColor: TanreiPaint,
    mediaWidth: CGFloat,
    motionFeedbackDuration: Double,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    outlineWidth: CGFloat,
    siteGap: CGFloat,
    siteIconShape: CGFloat,
    siteIconSize: CGFloat,
    siteItemGap: CGFloat,
    siteTypescale: TanreiTextStyle,
    titleGap: CGFloat,
    titleMaxLines: Double,
    titleTypescale: TanreiTextStyle,
    variants: TanreiLinkCardVariants,
    hovered: TanreiLinkCardStateTokens,
    focused: TanreiLinkCardStateTokens,
    pressed: TanreiLinkCardStateTokens
  ) {
    self.containerPadding = containerPadding
    self.containerShape = containerShape
    self.descriptionMaxLines = descriptionMaxLines
    self.descriptionTypescale = descriptionTypescale
    self.layoutBesideMinWidth = layoutBesideMinWidth
    self.mediaAspectRatio = mediaAspectRatio
    self.mediaContainerColor = mediaContainerColor
    self.mediaWidth = mediaWidth
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.outlineWidth = outlineWidth
    self.siteGap = siteGap
    self.siteIconShape = siteIconShape
    self.siteIconSize = siteIconSize
    self.siteItemGap = siteItemGap
    self.siteTypescale = siteTypescale
    self.titleGap = titleGap
    self.titleMaxLines = titleMaxLines
    self.titleTypescale = titleTypescale
    self.variants = variants
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, `disabled`, which link-card has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiLinkCardStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return nil
    }
  }
}

/// A value of link's `variant` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiLinkVariant(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiLinkVariant: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let standard = TanreiLinkVariant(rawValue: "standard")
  public static let inverse = TanreiLinkVariant(rawValue: "inverse")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiLinkVariant] = [.standard, .inverse]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiLinkVariant.standard
}

/// How one variant of link is drawn in one state.
public struct TanreiLinkVariantStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var labelColor: TanreiPaint
  public var iconColor: TanreiPaint
  public var stateLayerColor: TanreiPaint
  public var currentContainerColor: TanreiPaint
  public var currentLabelColor: TanreiPaint
  public var currentIconColor: TanreiPaint
  public var currentStateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    labelColor: TanreiPaint,
    iconColor: TanreiPaint,
    stateLayerColor: TanreiPaint,
    currentContainerColor: TanreiPaint,
    currentLabelColor: TanreiPaint,
    currentIconColor: TanreiPaint,
    currentStateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.labelColor = labelColor
    self.iconColor = iconColor
    self.stateLayerColor = stateLayerColor
    self.currentContainerColor = currentContainerColor
    self.currentLabelColor = currentLabelColor
    self.currentIconColor = currentIconColor
    self.currentStateLayerColor = currentStateLayerColor
  }
}

/// One variant of link: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiLinkVariantTokens: Sendable, Equatable {
  public var enabled: TanreiLinkVariantStateTokens
  public var hovered: TanreiLinkVariantStateTokens
  public var focused: TanreiLinkVariantStateTokens
  public var pressed: TanreiLinkVariantStateTokens
  public var disabled: TanreiLinkVariantStateTokens

  public init(
    enabled: TanreiLinkVariantStateTokens,
    hovered: TanreiLinkVariantStateTokens,
    focused: TanreiLinkVariantStateTokens,
    pressed: TanreiLinkVariantStateTokens,
    disabled: TanreiLinkVariantStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiLinkVariantStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The variants of link: named fields for the core values, `extra` for what a design system added.
/// Read one with `variants[key]`.
public struct TanreiLinkVariants: Sendable, Equatable {
  public var standard: TanreiLinkVariantTokens
  public var inverse: TanreiLinkVariantTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiLinkVariant: TanreiLinkVariantTokens]

  public init(
    standard: TanreiLinkVariantTokens,
    inverse: TanreiLinkVariantTokens,
    extra: [TanreiLinkVariant: TanreiLinkVariantTokens] = [:]
  ) {
    self.standard = standard
    self.inverse = inverse
    self.extra = extra
  }

  /// The tokens of one link variant, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiLinkVariant) -> TanreiLinkVariantTokens? {
    switch key {
    case .standard: return standard
    case .inverse: return inverse
    default: return extra[key]
    }
  }

  /// Total lookup: a link variant this design system does not have reads the tokens of `standard`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiLinkVariant) -> TanreiLinkVariantTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no link variant \"\(key.rawValue)\"; using \"standard\"")
    return standard
  }

  /// Every link variant of this design system: the core ones, then what it added.
  public var keys: [TanreiLinkVariant] { TanreiLinkVariant.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of link that depend on the state but not on the variant.
public struct TanreiLinkStateTokens: Sendable, Equatable {
  public var containerShape: CGFloat
  public var opacity: Double

  public init(
    containerShape: CGFloat,
    opacity: Double
  ) {
    self.containerShape = containerShape
    self.opacity = opacity
  }
}

/// Component tokens of link (comp.link).
public struct TanreiLinkTokens: Sendable, Equatable {
  public var containerGap: CGFloat
  public var containerShape: CGFloat
  public var externalMarks: Double
  public var motionFeedbackDuration: Double
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var siteIconDisabledOpacity: Double
  public var siteIconShape: CGFloat
  public var underlineOffset: CGFloat
  public var underlineVisibility: Double
  public var underlineWidth: CGFloat
  public var variants: TanreiLinkVariants
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiLinkStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiLinkStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiLinkStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiLinkStateTokens

  public init(
    containerGap: CGFloat,
    containerShape: CGFloat,
    externalMarks: Double,
    motionFeedbackDuration: Double,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    siteIconDisabledOpacity: Double,
    siteIconShape: CGFloat,
    underlineOffset: CGFloat,
    underlineVisibility: Double,
    underlineWidth: CGFloat,
    variants: TanreiLinkVariants,
    hovered: TanreiLinkStateTokens,
    focused: TanreiLinkStateTokens,
    pressed: TanreiLinkStateTokens,
    disabled: TanreiLinkStateTokens
  ) {
    self.containerGap = containerGap
    self.containerShape = containerShape
    self.externalMarks = externalMarks
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.siteIconDisabledOpacity = siteIconDisabledOpacity
    self.siteIconShape = siteIconShape
    self.underlineOffset = underlineOffset
    self.underlineVisibility = underlineVisibility
    self.underlineWidth = underlineWidth
    self.variants = variants
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which link has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiLinkStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// A value of list's `condition` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiListCondition(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiListCondition: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let unselected = TanreiListCondition(rawValue: "unselected")
  public static let selected = TanreiListCondition(rawValue: "selected")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiListCondition] = [.unselected, .selected]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiListCondition.unselected
}

/// How one condition of list is drawn in one state.
public struct TanreiListConditionStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var headlineColor: TanreiPaint
  public var overlineColor: TanreiPaint
  public var supportingTextColor: TanreiPaint
  public var trailingTextColor: TanreiPaint
  public var leadingIconColor: TanreiPaint
  public var trailingIconColor: TanreiPaint
  public var markColor: TanreiPaint
  public var stateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    headlineColor: TanreiPaint,
    overlineColor: TanreiPaint,
    supportingTextColor: TanreiPaint,
    trailingTextColor: TanreiPaint,
    leadingIconColor: TanreiPaint,
    trailingIconColor: TanreiPaint,
    markColor: TanreiPaint,
    stateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.headlineColor = headlineColor
    self.overlineColor = overlineColor
    self.supportingTextColor = supportingTextColor
    self.trailingTextColor = trailingTextColor
    self.leadingIconColor = leadingIconColor
    self.trailingIconColor = trailingIconColor
    self.markColor = markColor
    self.stateLayerColor = stateLayerColor
  }
}

/// One condition of list: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiListConditionTokens: Sendable, Equatable {
  public var enabled: TanreiListConditionStateTokens
  public var hovered: TanreiListConditionStateTokens
  public var focused: TanreiListConditionStateTokens
  public var pressed: TanreiListConditionStateTokens
  public var disabled: TanreiListConditionStateTokens

  public init(
    enabled: TanreiListConditionStateTokens,
    hovered: TanreiListConditionStateTokens,
    focused: TanreiListConditionStateTokens,
    pressed: TanreiListConditionStateTokens,
    disabled: TanreiListConditionStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this condition of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiListConditionStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The conditions of list: named fields for the core values, `extra` for what a design system added.
/// Read one with `conditions[key]`.
public struct TanreiListConditions: Sendable, Equatable {
  public var unselected: TanreiListConditionTokens
  public var selected: TanreiListConditionTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiListCondition: TanreiListConditionTokens]

  public init(
    unselected: TanreiListConditionTokens,
    selected: TanreiListConditionTokens,
    extra: [TanreiListCondition: TanreiListConditionTokens] = [:]
  ) {
    self.unselected = unselected
    self.selected = selected
    self.extra = extra
  }

  /// The tokens of one list condition, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiListCondition) -> TanreiListConditionTokens? {
    switch key {
    case .unselected: return unselected
    case .selected: return selected
    default: return extra[key]
    }
  }

  /// Total lookup: a list condition this design system does not have reads the tokens of `unselected`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiListCondition) -> TanreiListConditionTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no list condition \"\(key.rawValue)\"; using \"unselected\"")
    return unselected
  }

  /// Every list condition of this design system: the core ones, then what it added.
  public var keys: [TanreiListCondition] { TanreiListCondition.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of list that depend on the state but not on the variant.
public struct TanreiListStateTokens: Sendable, Equatable {
  public var containerShape: CGFloat
  public var opacity: Double

  public init(
    containerShape: CGFloat,
    opacity: Double
  ) {
    self.containerShape = containerShape
    self.opacity = opacity
  }
}

/// Component tokens of list (comp.list).
public struct TanreiListTokens: Sendable, Equatable {
  public var avatarShape: CGFloat
  public var avatarSize: CGFloat
  public var containerGap: CGFloat
  public var containerHeightOneLine: CGFloat
  public var containerHeightThreeLine: CGFloat
  public var containerHeightTwoLine: CGFloat
  public var containerPaddingBlock: CGFloat
  public var containerPaddingInlineEnd: CGFloat
  public var containerPaddingInlineStart: CGFloat
  public var containerShape: CGFloat
  public var dividerColor: TanreiPaint
  public var dividerThickness: CGFloat
  public var draggedContainerColor: TanreiPaint
  public var draggedContainerElevation: [TanreiShadowLayer]
  public var handleColor: TanreiPaint
  public var handleSize: CGFloat
  public var headlineTypescale: TanreiTextStyle
  public var imageShape: CGFloat
  public var imageSize: CGFloat
  public var leadingIconSize: CGFloat
  public var markSize: CGFloat
  public var markWidth: CGFloat
  public var mediaContainerColor: TanreiPaint
  public var mediaContentColor: TanreiPaint
  public var motionFeedbackDuration: Double
  public var motionReorderDuration: Double
  public var motionReorderEasing: TanreiCubicBezier
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var moveButtonsGap: CGFloat
  public var overlineTypescale: TanreiTextStyle
  public var supportingTextTypescale: TanreiTextStyle
  public var trailingIconSize: CGFloat
  public var trailingTextTypescale: TanreiTextStyle
  public var conditions: TanreiListConditions
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiListStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiListStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiListStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiListStateTokens

  public init(
    avatarShape: CGFloat,
    avatarSize: CGFloat,
    containerGap: CGFloat,
    containerHeightOneLine: CGFloat,
    containerHeightThreeLine: CGFloat,
    containerHeightTwoLine: CGFloat,
    containerPaddingBlock: CGFloat,
    containerPaddingInlineEnd: CGFloat,
    containerPaddingInlineStart: CGFloat,
    containerShape: CGFloat,
    dividerColor: TanreiPaint,
    dividerThickness: CGFloat,
    draggedContainerColor: TanreiPaint,
    draggedContainerElevation: [TanreiShadowLayer],
    handleColor: TanreiPaint,
    handleSize: CGFloat,
    headlineTypescale: TanreiTextStyle,
    imageShape: CGFloat,
    imageSize: CGFloat,
    leadingIconSize: CGFloat,
    markSize: CGFloat,
    markWidth: CGFloat,
    mediaContainerColor: TanreiPaint,
    mediaContentColor: TanreiPaint,
    motionFeedbackDuration: Double,
    motionReorderDuration: Double,
    motionReorderEasing: TanreiCubicBezier,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    moveButtonsGap: CGFloat,
    overlineTypescale: TanreiTextStyle,
    supportingTextTypescale: TanreiTextStyle,
    trailingIconSize: CGFloat,
    trailingTextTypescale: TanreiTextStyle,
    conditions: TanreiListConditions,
    hovered: TanreiListStateTokens,
    focused: TanreiListStateTokens,
    pressed: TanreiListStateTokens,
    disabled: TanreiListStateTokens
  ) {
    self.avatarShape = avatarShape
    self.avatarSize = avatarSize
    self.containerGap = containerGap
    self.containerHeightOneLine = containerHeightOneLine
    self.containerHeightThreeLine = containerHeightThreeLine
    self.containerHeightTwoLine = containerHeightTwoLine
    self.containerPaddingBlock = containerPaddingBlock
    self.containerPaddingInlineEnd = containerPaddingInlineEnd
    self.containerPaddingInlineStart = containerPaddingInlineStart
    self.containerShape = containerShape
    self.dividerColor = dividerColor
    self.dividerThickness = dividerThickness
    self.draggedContainerColor = draggedContainerColor
    self.draggedContainerElevation = draggedContainerElevation
    self.handleColor = handleColor
    self.handleSize = handleSize
    self.headlineTypescale = headlineTypescale
    self.imageShape = imageShape
    self.imageSize = imageSize
    self.leadingIconSize = leadingIconSize
    self.markSize = markSize
    self.markWidth = markWidth
    self.mediaContainerColor = mediaContainerColor
    self.mediaContentColor = mediaContentColor
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionReorderDuration = motionReorderDuration
    self.motionReorderEasing = motionReorderEasing
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.moveButtonsGap = moveButtonsGap
    self.overlineTypescale = overlineTypescale
    self.supportingTextTypescale = supportingTextTypescale
    self.trailingIconSize = trailingIconSize
    self.trailingTextTypescale = trailingTextTypescale
    self.conditions = conditions
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which list has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiListStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// A value of loading-indicator's `size` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiLoadingIndicatorSize(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiLoadingIndicatorSize: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let small = TanreiLoadingIndicatorSize(rawValue: "small")
  public static let medium = TanreiLoadingIndicatorSize(rawValue: "medium")
  public static let large = TanreiLoadingIndicatorSize(rawValue: "large")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiLoadingIndicatorSize] = [.small, .medium, .large]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiLoadingIndicatorSize.medium
}

/// Everything of loading-indicator that depends on its size.
public struct TanreiLoadingIndicatorSizeTokens: Sendable, Equatable {
  public var indicatorSize: CGFloat
  public var indicatorThickness: CGFloat
  public var containerSize: CGFloat

  public init(
    indicatorSize: CGFloat,
    indicatorThickness: CGFloat,
    containerSize: CGFloat
  ) {
    self.indicatorSize = indicatorSize
    self.indicatorThickness = indicatorThickness
    self.containerSize = containerSize
  }
}

/// The sizes of loading-indicator: named fields for the core values, `extra` for what a design system added.
/// Read one with `sizes[key]`.
public struct TanreiLoadingIndicatorSizes: Sendable, Equatable {
  public var small: TanreiLoadingIndicatorSizeTokens
  public var medium: TanreiLoadingIndicatorSizeTokens
  public var large: TanreiLoadingIndicatorSizeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiLoadingIndicatorSize: TanreiLoadingIndicatorSizeTokens]

  public init(
    small: TanreiLoadingIndicatorSizeTokens,
    medium: TanreiLoadingIndicatorSizeTokens,
    large: TanreiLoadingIndicatorSizeTokens,
    extra: [TanreiLoadingIndicatorSize: TanreiLoadingIndicatorSizeTokens] = [:]
  ) {
    self.small = small
    self.medium = medium
    self.large = large
    self.extra = extra
  }

  /// The tokens of one loading-indicator size, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiLoadingIndicatorSize) -> TanreiLoadingIndicatorSizeTokens? {
    switch key {
    case .small: return small
    case .medium: return medium
    case .large: return large
    default: return extra[key]
    }
  }

  /// Total lookup: a loading-indicator size this design system does not have reads the tokens of `medium`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiLoadingIndicatorSize) -> TanreiLoadingIndicatorSizeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no loading-indicator size \"\(key.rawValue)\"; using \"medium\"")
    return medium
  }

  /// Every loading-indicator size of this design system: the core ones, then what it added.
  public var keys: [TanreiLoadingIndicatorSize] { TanreiLoadingIndicatorSize.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Component tokens of loading-indicator (comp.loading-indicator).
public struct TanreiLoadingIndicatorTokens: Sendable, Equatable {
  public var containedContainerColor: TanreiPaint
  public var containedContainerElevation: [TanreiShadowLayer]
  public var containedIndicatorColor: TanreiPaint
  public var containerShape: CGFloat
  public var indicatorColor: TanreiPaint
  public var motionCycleDuration: Double
  public var motionEnterDuration: Double
  public var motionEnterEasing: TanreiCubicBezier
  public var motionEntrance: Double
  public var motionShowDelay: Double
  public var sizes: TanreiLoadingIndicatorSizes

  public init(
    containedContainerColor: TanreiPaint,
    containedContainerElevation: [TanreiShadowLayer],
    containedIndicatorColor: TanreiPaint,
    containerShape: CGFloat,
    indicatorColor: TanreiPaint,
    motionCycleDuration: Double,
    motionEnterDuration: Double,
    motionEnterEasing: TanreiCubicBezier,
    motionEntrance: Double,
    motionShowDelay: Double,
    sizes: TanreiLoadingIndicatorSizes
  ) {
    self.containedContainerColor = containedContainerColor
    self.containedContainerElevation = containedContainerElevation
    self.containedIndicatorColor = containedIndicatorColor
    self.containerShape = containerShape
    self.indicatorColor = indicatorColor
    self.motionCycleDuration = motionCycleDuration
    self.motionEnterDuration = motionEnterDuration
    self.motionEnterEasing = motionEnterEasing
    self.motionEntrance = motionEntrance
    self.motionShowDelay = motionShowDelay
    self.sizes = sizes
  }
}

/// A value of main-action-button's `size` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiMainActionButtonSize(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiMainActionButtonSize: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let small = TanreiMainActionButtonSize(rawValue: "small")
  public static let medium = TanreiMainActionButtonSize(rawValue: "medium")
  public static let large = TanreiMainActionButtonSize(rawValue: "large")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiMainActionButtonSize] = [.small, .medium, .large]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiMainActionButtonSize.medium
}

/// Everything of main-action-button that depends on its size.
public struct TanreiMainActionButtonSizeTokens: Sendable, Equatable {
  public var containerHeight: CGFloat
  public var containerShape: CGFloat
  public var containerPaddingInlineStart: CGFloat
  public var containerPaddingInlineEnd: CGFloat
  public var containerPaddingInlineStartWithIcon: CGFloat
  public var containerPaddingInlineEndWithIcon: CGFloat
  public var containerPaddingBlock: CGFloat
  public var containerGap: CGFloat
  public var labelTypescale: TanreiTextStyle
  public var iconSize: CGFloat

  public init(
    containerHeight: CGFloat,
    containerShape: CGFloat,
    containerPaddingInlineStart: CGFloat,
    containerPaddingInlineEnd: CGFloat,
    containerPaddingInlineStartWithIcon: CGFloat,
    containerPaddingInlineEndWithIcon: CGFloat,
    containerPaddingBlock: CGFloat,
    containerGap: CGFloat,
    labelTypescale: TanreiTextStyle,
    iconSize: CGFloat
  ) {
    self.containerHeight = containerHeight
    self.containerShape = containerShape
    self.containerPaddingInlineStart = containerPaddingInlineStart
    self.containerPaddingInlineEnd = containerPaddingInlineEnd
    self.containerPaddingInlineStartWithIcon = containerPaddingInlineStartWithIcon
    self.containerPaddingInlineEndWithIcon = containerPaddingInlineEndWithIcon
    self.containerPaddingBlock = containerPaddingBlock
    self.containerGap = containerGap
    self.labelTypescale = labelTypescale
    self.iconSize = iconSize
  }
}

/// The sizes of main-action-button: named fields for the core values, `extra` for what a design system added.
/// Read one with `sizes[key]`.
public struct TanreiMainActionButtonSizes: Sendable, Equatable {
  public var small: TanreiMainActionButtonSizeTokens
  public var medium: TanreiMainActionButtonSizeTokens
  public var large: TanreiMainActionButtonSizeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiMainActionButtonSize: TanreiMainActionButtonSizeTokens]

  public init(
    small: TanreiMainActionButtonSizeTokens,
    medium: TanreiMainActionButtonSizeTokens,
    large: TanreiMainActionButtonSizeTokens,
    extra: [TanreiMainActionButtonSize: TanreiMainActionButtonSizeTokens] = [:]
  ) {
    self.small = small
    self.medium = medium
    self.large = large
    self.extra = extra
  }

  /// The tokens of one main-action-button size, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiMainActionButtonSize) -> TanreiMainActionButtonSizeTokens? {
    switch key {
    case .small: return small
    case .medium: return medium
    case .large: return large
    default: return extra[key]
    }
  }

  /// Total lookup: a main-action-button size this design system does not have reads the tokens of `medium`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiMainActionButtonSize) -> TanreiMainActionButtonSizeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no main-action-button size \"\(key.rawValue)\"; using \"medium\"")
    return medium
  }

  /// Every main-action-button size of this design system: the core ones, then what it added.
  public var keys: [TanreiMainActionButtonSize] { TanreiMainActionButtonSize.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of main-action-button's `variant` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiMainActionButtonVariant(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiMainActionButtonVariant: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let filled = TanreiMainActionButtonVariant(rawValue: "filled")
  public static let tonal = TanreiMainActionButtonVariant(rawValue: "tonal")
  public static let surface = TanreiMainActionButtonVariant(rawValue: "surface")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiMainActionButtonVariant] = [.filled, .tonal, .surface]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiMainActionButtonVariant.filled
}

/// How one variant of main-action-button is drawn in one state.
public struct TanreiMainActionButtonVariantStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var containerElevation: [TanreiShadowLayer]
  public var labelColor: TanreiPaint
  public var stateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    containerElevation: [TanreiShadowLayer],
    labelColor: TanreiPaint,
    stateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.containerElevation = containerElevation
    self.labelColor = labelColor
    self.stateLayerColor = stateLayerColor
  }
}

/// One variant of main-action-button: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiMainActionButtonVariantTokens: Sendable, Equatable {
  public var enabled: TanreiMainActionButtonVariantStateTokens
  public var hovered: TanreiMainActionButtonVariantStateTokens
  public var focused: TanreiMainActionButtonVariantStateTokens
  public var pressed: TanreiMainActionButtonVariantStateTokens
  public var disabled: TanreiMainActionButtonVariantStateTokens

  public init(
    enabled: TanreiMainActionButtonVariantStateTokens,
    hovered: TanreiMainActionButtonVariantStateTokens,
    focused: TanreiMainActionButtonVariantStateTokens,
    pressed: TanreiMainActionButtonVariantStateTokens,
    disabled: TanreiMainActionButtonVariantStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiMainActionButtonVariantStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The variants of main-action-button: named fields for the core values, `extra` for what a design system added.
/// Read one with `variants[key]`.
public struct TanreiMainActionButtonVariants: Sendable, Equatable {
  public var filled: TanreiMainActionButtonVariantTokens
  public var tonal: TanreiMainActionButtonVariantTokens
  public var surface: TanreiMainActionButtonVariantTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiMainActionButtonVariant: TanreiMainActionButtonVariantTokens]

  public init(
    filled: TanreiMainActionButtonVariantTokens,
    tonal: TanreiMainActionButtonVariantTokens,
    surface: TanreiMainActionButtonVariantTokens,
    extra: [TanreiMainActionButtonVariant: TanreiMainActionButtonVariantTokens] = [:]
  ) {
    self.filled = filled
    self.tonal = tonal
    self.surface = surface
    self.extra = extra
  }

  /// The tokens of one main-action-button variant, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiMainActionButtonVariant) -> TanreiMainActionButtonVariantTokens? {
    switch key {
    case .filled: return filled
    case .tonal: return tonal
    case .surface: return surface
    default: return extra[key]
    }
  }

  /// Total lookup: a main-action-button variant this design system does not have reads the tokens of `filled`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiMainActionButtonVariant) -> TanreiMainActionButtonVariantTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no main-action-button variant \"\(key.rawValue)\"; using \"filled\"")
    return filled
  }

  /// Every main-action-button variant of this design system: the core ones, then what it added.
  public var keys: [TanreiMainActionButtonVariant] { TanreiMainActionButtonVariant.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of main-action-button that depend on the state but not on the variant.
public struct TanreiMainActionButtonStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of main-action-button (comp.main-action-button).
public struct TanreiMainActionButtonTokens: Sendable, Equatable {
  public var motionFeedbackDuration: Double
  public var motionResizeDuration: Double
  public var motionResizeEasing: TanreiCubicBezier
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var sizes: TanreiMainActionButtonSizes
  public var variants: TanreiMainActionButtonVariants
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiMainActionButtonStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiMainActionButtonStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiMainActionButtonStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiMainActionButtonStateTokens

  public init(
    motionFeedbackDuration: Double,
    motionResizeDuration: Double,
    motionResizeEasing: TanreiCubicBezier,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    sizes: TanreiMainActionButtonSizes,
    variants: TanreiMainActionButtonVariants,
    hovered: TanreiMainActionButtonStateTokens,
    focused: TanreiMainActionButtonStateTokens,
    pressed: TanreiMainActionButtonStateTokens,
    disabled: TanreiMainActionButtonStateTokens
  ) {
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionResizeDuration = motionResizeDuration
    self.motionResizeEasing = motionResizeEasing
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.sizes = sizes
    self.variants = variants
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which main-action-button has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiMainActionButtonStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// A value of menu's `condition` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiMenuCondition(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiMenuCondition: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let unselected = TanreiMenuCondition(rawValue: "unselected")
  public static let selected = TanreiMenuCondition(rawValue: "selected")
  public static let destructive = TanreiMenuCondition(rawValue: "destructive")
  public static let expanded = TanreiMenuCondition(rawValue: "expanded")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiMenuCondition] = [.unselected, .selected, .destructive, .expanded]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiMenuCondition.unselected
}

/// How one condition of menu is drawn in one state.
public struct TanreiMenuConditionStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var labelColor: TanreiPaint
  public var supportingTextColor: TanreiPaint
  public var trailingTextColor: TanreiPaint
  public var leadingIconColor: TanreiPaint
  public var trailingIconColor: TanreiPaint
  public var markColor: TanreiPaint
  public var controlColor: TanreiPaint
  public var controlMarkColor: TanreiPaint
  public var stateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    labelColor: TanreiPaint,
    supportingTextColor: TanreiPaint,
    trailingTextColor: TanreiPaint,
    leadingIconColor: TanreiPaint,
    trailingIconColor: TanreiPaint,
    markColor: TanreiPaint,
    controlColor: TanreiPaint,
    controlMarkColor: TanreiPaint,
    stateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.labelColor = labelColor
    self.supportingTextColor = supportingTextColor
    self.trailingTextColor = trailingTextColor
    self.leadingIconColor = leadingIconColor
    self.trailingIconColor = trailingIconColor
    self.markColor = markColor
    self.controlColor = controlColor
    self.controlMarkColor = controlMarkColor
    self.stateLayerColor = stateLayerColor
  }
}

/// One condition of menu: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiMenuConditionTokens: Sendable, Equatable {
  public var enabled: TanreiMenuConditionStateTokens
  public var hovered: TanreiMenuConditionStateTokens
  public var focused: TanreiMenuConditionStateTokens
  public var pressed: TanreiMenuConditionStateTokens
  public var disabled: TanreiMenuConditionStateTokens

  public init(
    enabled: TanreiMenuConditionStateTokens,
    hovered: TanreiMenuConditionStateTokens,
    focused: TanreiMenuConditionStateTokens,
    pressed: TanreiMenuConditionStateTokens,
    disabled: TanreiMenuConditionStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this condition of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiMenuConditionStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The conditions of menu: named fields for the core values, `extra` for what a design system added.
/// Read one with `conditions[key]`.
public struct TanreiMenuConditions: Sendable, Equatable {
  public var unselected: TanreiMenuConditionTokens
  public var selected: TanreiMenuConditionTokens
  public var destructive: TanreiMenuConditionTokens
  public var expanded: TanreiMenuConditionTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiMenuCondition: TanreiMenuConditionTokens]

  public init(
    unselected: TanreiMenuConditionTokens,
    selected: TanreiMenuConditionTokens,
    destructive: TanreiMenuConditionTokens,
    expanded: TanreiMenuConditionTokens,
    extra: [TanreiMenuCondition: TanreiMenuConditionTokens] = [:]
  ) {
    self.unselected = unselected
    self.selected = selected
    self.destructive = destructive
    self.expanded = expanded
    self.extra = extra
  }

  /// The tokens of one menu condition, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiMenuCondition) -> TanreiMenuConditionTokens? {
    switch key {
    case .unselected: return unselected
    case .selected: return selected
    case .destructive: return destructive
    case .expanded: return expanded
    default: return extra[key]
    }
  }

  /// Total lookup: a menu condition this design system does not have reads the tokens of `unselected`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiMenuCondition) -> TanreiMenuConditionTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no menu condition \"\(key.rawValue)\"; using \"unselected\"")
    return unselected
  }

  /// Every menu condition of this design system: the core ones, then what it added.
  public var keys: [TanreiMenuCondition] { TanreiMenuCondition.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of menu that depend on the state but not on the variant.
public struct TanreiMenuStateTokens: Sendable, Equatable {
  public var containerShape: CGFloat
  public var opacity: Double

  public init(
    containerShape: CGFloat,
    opacity: Double
  ) {
    self.containerShape = containerShape
    self.opacity = opacity
  }
}

/// Component tokens of menu (comp.menu).
public struct TanreiMenuTokens: Sendable, Equatable {
  public var checkboxItemMark: Double
  public var containerGap: CGFloat
  public var containerHeight: CGFloat
  public var containerPaddingBlock: CGFloat
  public var containerPaddingInline: CGFloat
  public var containerShape: CGFloat
  public var controlBoxShape: CGFloat
  public var controlBoxSize: CGFloat
  public var controlFillInset: CGFloat
  public var controlFillOpacity: Double
  public var controlMarkSize: CGFloat
  public var controlMarkWeight: Double
  public var controlOutlineWidth: CGFloat
  public var controlRingSelectedWidthShare: Double
  public var controlRingSize: CGFloat
  public var controlRingWidth: CGFloat
  public var dividerColor: TanreiPaint
  public var dividerSpace: CGFloat
  public var dividerThickness: CGFloat
  public var groupTitleColor: TanreiPaint
  public var groupTitlePaddingInline: CGFloat
  public var groupTitleTypescale: TanreiTextStyle
  public var groupGap: CGFloat
  public var labelTypescale: TanreiTextStyle
  public var leadingIconSize: CGFloat
  public var markSize: CGFloat
  public var markWidth: CGFloat
  public var motionCloseDuration: Double
  public var motionCloseEasing: TanreiCubicBezier
  public var motionFeedbackDuration: Double
  public var motionOpenDuration: Double
  public var motionOpenEasing: TanreiCubicBezier
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var motionSubmenuDelay: Double
  public var radioItemMark: Double
  public var separation: Double
  public var shortcutVariant: Double
  public var submenuOffset: CGFloat
  public var supportingTextTypescale: TanreiTextStyle
  public var surfaceColor: TanreiPaint
  public var surfaceElevation: [TanreiShadowLayer]
  public var surfaceMaxWidth: CGFloat
  public var surfaceMinWidth: CGFloat
  public var surfaceOffset: CGFloat
  public var surfacePaddingBlock: CGFloat
  public var surfacePaddingInline: CGFloat
  public var surfaceShape: CGFloat
  public var surfaceViewportMargin: CGFloat
  public var trailingIconSize: CGFloat
  public var trailingTextTypescale: TanreiTextStyle
  public var conditions: TanreiMenuConditions
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiMenuStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiMenuStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiMenuStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiMenuStateTokens

  public init(
    checkboxItemMark: Double,
    containerGap: CGFloat,
    containerHeight: CGFloat,
    containerPaddingBlock: CGFloat,
    containerPaddingInline: CGFloat,
    containerShape: CGFloat,
    controlBoxShape: CGFloat,
    controlBoxSize: CGFloat,
    controlFillInset: CGFloat,
    controlFillOpacity: Double,
    controlMarkSize: CGFloat,
    controlMarkWeight: Double,
    controlOutlineWidth: CGFloat,
    controlRingSelectedWidthShare: Double,
    controlRingSize: CGFloat,
    controlRingWidth: CGFloat,
    dividerColor: TanreiPaint,
    dividerSpace: CGFloat,
    dividerThickness: CGFloat,
    groupTitleColor: TanreiPaint,
    groupTitlePaddingInline: CGFloat,
    groupTitleTypescale: TanreiTextStyle,
    groupGap: CGFloat,
    labelTypescale: TanreiTextStyle,
    leadingIconSize: CGFloat,
    markSize: CGFloat,
    markWidth: CGFloat,
    motionCloseDuration: Double,
    motionCloseEasing: TanreiCubicBezier,
    motionFeedbackDuration: Double,
    motionOpenDuration: Double,
    motionOpenEasing: TanreiCubicBezier,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    motionSubmenuDelay: Double,
    radioItemMark: Double,
    separation: Double,
    shortcutVariant: Double,
    submenuOffset: CGFloat,
    supportingTextTypescale: TanreiTextStyle,
    surfaceColor: TanreiPaint,
    surfaceElevation: [TanreiShadowLayer],
    surfaceMaxWidth: CGFloat,
    surfaceMinWidth: CGFloat,
    surfaceOffset: CGFloat,
    surfacePaddingBlock: CGFloat,
    surfacePaddingInline: CGFloat,
    surfaceShape: CGFloat,
    surfaceViewportMargin: CGFloat,
    trailingIconSize: CGFloat,
    trailingTextTypescale: TanreiTextStyle,
    conditions: TanreiMenuConditions,
    hovered: TanreiMenuStateTokens,
    focused: TanreiMenuStateTokens,
    pressed: TanreiMenuStateTokens,
    disabled: TanreiMenuStateTokens
  ) {
    self.checkboxItemMark = checkboxItemMark
    self.containerGap = containerGap
    self.containerHeight = containerHeight
    self.containerPaddingBlock = containerPaddingBlock
    self.containerPaddingInline = containerPaddingInline
    self.containerShape = containerShape
    self.controlBoxShape = controlBoxShape
    self.controlBoxSize = controlBoxSize
    self.controlFillInset = controlFillInset
    self.controlFillOpacity = controlFillOpacity
    self.controlMarkSize = controlMarkSize
    self.controlMarkWeight = controlMarkWeight
    self.controlOutlineWidth = controlOutlineWidth
    self.controlRingSelectedWidthShare = controlRingSelectedWidthShare
    self.controlRingSize = controlRingSize
    self.controlRingWidth = controlRingWidth
    self.dividerColor = dividerColor
    self.dividerSpace = dividerSpace
    self.dividerThickness = dividerThickness
    self.groupTitleColor = groupTitleColor
    self.groupTitlePaddingInline = groupTitlePaddingInline
    self.groupTitleTypescale = groupTitleTypescale
    self.groupGap = groupGap
    self.labelTypescale = labelTypescale
    self.leadingIconSize = leadingIconSize
    self.markSize = markSize
    self.markWidth = markWidth
    self.motionCloseDuration = motionCloseDuration
    self.motionCloseEasing = motionCloseEasing
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionOpenDuration = motionOpenDuration
    self.motionOpenEasing = motionOpenEasing
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.motionSubmenuDelay = motionSubmenuDelay
    self.radioItemMark = radioItemMark
    self.separation = separation
    self.shortcutVariant = shortcutVariant
    self.submenuOffset = submenuOffset
    self.supportingTextTypescale = supportingTextTypescale
    self.surfaceColor = surfaceColor
    self.surfaceElevation = surfaceElevation
    self.surfaceMaxWidth = surfaceMaxWidth
    self.surfaceMinWidth = surfaceMinWidth
    self.surfaceOffset = surfaceOffset
    self.surfacePaddingBlock = surfacePaddingBlock
    self.surfacePaddingInline = surfacePaddingInline
    self.surfaceShape = surfaceShape
    self.surfaceViewportMargin = surfaceViewportMargin
    self.trailingIconSize = trailingIconSize
    self.trailingTextTypescale = trailingTextTypescale
    self.conditions = conditions
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which menu has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiMenuStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// A value of menubar's `condition` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiMenubarCondition(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiMenubarCondition: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let unselected = TanreiMenubarCondition(rawValue: "unselected")
  public static let expanded = TanreiMenubarCondition(rawValue: "expanded")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiMenubarCondition] = [.unselected, .expanded]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiMenubarCondition.unselected
}

/// How one condition of menubar is drawn in one state.
public struct TanreiMenubarConditionStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var labelColor: TanreiPaint
  public var iconColor: TanreiPaint
  public var stateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    labelColor: TanreiPaint,
    iconColor: TanreiPaint,
    stateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.labelColor = labelColor
    self.iconColor = iconColor
    self.stateLayerColor = stateLayerColor
  }
}

/// One condition of menubar: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiMenubarConditionTokens: Sendable, Equatable {
  public var enabled: TanreiMenubarConditionStateTokens
  public var hovered: TanreiMenubarConditionStateTokens
  public var focused: TanreiMenubarConditionStateTokens
  public var pressed: TanreiMenubarConditionStateTokens
  public var disabled: TanreiMenubarConditionStateTokens

  public init(
    enabled: TanreiMenubarConditionStateTokens,
    hovered: TanreiMenubarConditionStateTokens,
    focused: TanreiMenubarConditionStateTokens,
    pressed: TanreiMenubarConditionStateTokens,
    disabled: TanreiMenubarConditionStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this condition of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiMenubarConditionStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The conditions of menubar: named fields for the core values, `extra` for what a design system added.
/// Read one with `conditions[key]`.
public struct TanreiMenubarConditions: Sendable, Equatable {
  public var unselected: TanreiMenubarConditionTokens
  public var expanded: TanreiMenubarConditionTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiMenubarCondition: TanreiMenubarConditionTokens]

  public init(
    unselected: TanreiMenubarConditionTokens,
    expanded: TanreiMenubarConditionTokens,
    extra: [TanreiMenubarCondition: TanreiMenubarConditionTokens] = [:]
  ) {
    self.unselected = unselected
    self.expanded = expanded
    self.extra = extra
  }

  /// The tokens of one menubar condition, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiMenubarCondition) -> TanreiMenubarConditionTokens? {
    switch key {
    case .unselected: return unselected
    case .expanded: return expanded
    default: return extra[key]
    }
  }

  /// Total lookup: a menubar condition this design system does not have reads the tokens of `unselected`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiMenubarCondition) -> TanreiMenubarConditionTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no menubar condition \"\(key.rawValue)\"; using \"unselected\"")
    return unselected
  }

  /// Every menubar condition of this design system: the core ones, then what it added.
  public var keys: [TanreiMenubarCondition] { TanreiMenubarCondition.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of menubar that depend on the state but not on the variant.
public struct TanreiMenubarStateTokens: Sendable, Equatable {
  public var containerShape: CGFloat
  public var opacity: Double

  public init(
    containerShape: CGFloat,
    opacity: Double
  ) {
    self.containerShape = containerShape
    self.opacity = opacity
  }
}

/// Component tokens of menubar (comp.menubar).
public struct TanreiMenubarTokens: Sendable, Equatable {
  public var barColor: TanreiPaint
  public var barGap: CGFloat
  public var barPaddingBlock: CGFloat
  public var barPaddingInline: CGFloat
  public var containerGap: CGFloat
  public var containerHeight: CGFloat
  public var containerPaddingInline: CGFloat
  public var containerShape: CGFloat
  public var iconSize: CGFloat
  public var labelTypescale: TanreiTextStyle
  public var motionFeedbackDuration: Double
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var conditions: TanreiMenubarConditions
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiMenubarStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiMenubarStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiMenubarStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiMenubarStateTokens

  public init(
    barColor: TanreiPaint,
    barGap: CGFloat,
    barPaddingBlock: CGFloat,
    barPaddingInline: CGFloat,
    containerGap: CGFloat,
    containerHeight: CGFloat,
    containerPaddingInline: CGFloat,
    containerShape: CGFloat,
    iconSize: CGFloat,
    labelTypescale: TanreiTextStyle,
    motionFeedbackDuration: Double,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    conditions: TanreiMenubarConditions,
    hovered: TanreiMenubarStateTokens,
    focused: TanreiMenubarStateTokens,
    pressed: TanreiMenubarStateTokens,
    disabled: TanreiMenubarStateTokens
  ) {
    self.barColor = barColor
    self.barGap = barGap
    self.barPaddingBlock = barPaddingBlock
    self.barPaddingInline = barPaddingInline
    self.containerGap = containerGap
    self.containerHeight = containerHeight
    self.containerPaddingInline = containerPaddingInline
    self.containerShape = containerShape
    self.iconSize = iconSize
    self.labelTypescale = labelTypescale
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.conditions = conditions
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which menubar has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiMenubarStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// A value of navigation-bar's `condition` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiNavigationBarCondition(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiNavigationBarCondition: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let unselected = TanreiNavigationBarCondition(rawValue: "unselected")
  public static let selected = TanreiNavigationBarCondition(rawValue: "selected")
  public static let filledUnselected = TanreiNavigationBarCondition(rawValue: "filled-unselected")
  public static let filledSelected = TanreiNavigationBarCondition(rawValue: "filled-selected")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiNavigationBarCondition] = [.unselected, .selected, .filledUnselected, .filledSelected]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiNavigationBarCondition.unselected
}

/// How one condition of navigation-bar is drawn in one state.
public struct TanreiNavigationBarConditionStateTokens: Sendable, Equatable {
  public var itemContainerColor: TanreiPaint
  public var itemIconIndicatorColor: TanreiPaint
  public var itemIconColor: TanreiPaint
  public var itemLabelColor: TanreiPaint
  public var itemCoveredIconColor: TanreiPaint
  public var itemCoveredLabelColor: TanreiPaint
  public var itemStateLayerColor: TanreiPaint

  public init(
    itemContainerColor: TanreiPaint,
    itemIconIndicatorColor: TanreiPaint,
    itemIconColor: TanreiPaint,
    itemLabelColor: TanreiPaint,
    itemCoveredIconColor: TanreiPaint,
    itemCoveredLabelColor: TanreiPaint,
    itemStateLayerColor: TanreiPaint
  ) {
    self.itemContainerColor = itemContainerColor
    self.itemIconIndicatorColor = itemIconIndicatorColor
    self.itemIconColor = itemIconColor
    self.itemLabelColor = itemLabelColor
    self.itemCoveredIconColor = itemCoveredIconColor
    self.itemCoveredLabelColor = itemCoveredLabelColor
    self.itemStateLayerColor = itemStateLayerColor
  }
}

/// One condition of navigation-bar: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiNavigationBarConditionTokens: Sendable, Equatable {
  public var enabled: TanreiNavigationBarConditionStateTokens
  public var hovered: TanreiNavigationBarConditionStateTokens
  public var focused: TanreiNavigationBarConditionStateTokens
  public var pressed: TanreiNavigationBarConditionStateTokens
  public var disabled: TanreiNavigationBarConditionStateTokens

  public init(
    enabled: TanreiNavigationBarConditionStateTokens,
    hovered: TanreiNavigationBarConditionStateTokens,
    focused: TanreiNavigationBarConditionStateTokens,
    pressed: TanreiNavigationBarConditionStateTokens,
    disabled: TanreiNavigationBarConditionStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this condition of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiNavigationBarConditionStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The conditions of navigation-bar: named fields for the core values, `extra` for what a design system added.
/// Read one with `conditions[key]`.
public struct TanreiNavigationBarConditions: Sendable, Equatable {
  public var unselected: TanreiNavigationBarConditionTokens
  public var selected: TanreiNavigationBarConditionTokens
  public var filledUnselected: TanreiNavigationBarConditionTokens
  public var filledSelected: TanreiNavigationBarConditionTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiNavigationBarCondition: TanreiNavigationBarConditionTokens]

  public init(
    unselected: TanreiNavigationBarConditionTokens,
    selected: TanreiNavigationBarConditionTokens,
    filledUnselected: TanreiNavigationBarConditionTokens,
    filledSelected: TanreiNavigationBarConditionTokens,
    extra: [TanreiNavigationBarCondition: TanreiNavigationBarConditionTokens] = [:]
  ) {
    self.unselected = unselected
    self.selected = selected
    self.filledUnselected = filledUnselected
    self.filledSelected = filledSelected
    self.extra = extra
  }

  /// The tokens of one navigation-bar condition, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiNavigationBarCondition) -> TanreiNavigationBarConditionTokens? {
    switch key {
    case .unselected: return unselected
    case .selected: return selected
    case .filledUnselected: return filledUnselected
    case .filledSelected: return filledSelected
    default: return extra[key]
    }
  }

  /// Total lookup: a navigation-bar condition this design system does not have reads the tokens of `unselected`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiNavigationBarCondition) -> TanreiNavigationBarConditionTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no navigation-bar condition \"\(key.rawValue)\"; using \"unselected\"")
    return unselected
  }

  /// Every navigation-bar condition of this design system: the core ones, then what it added.
  public var keys: [TanreiNavigationBarCondition] { TanreiNavigationBarCondition.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of navigation-bar that depend on the state but not on the variant.
public struct TanreiNavigationBarStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of navigation-bar (comp.navigation-bar).
public struct TanreiNavigationBarTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var containerElevation: [TanreiShadowLayer]
  public var containerHeight: CGFloat
  public var containerPadding: CGFloat
  public var itemContainerHeight: CGFloat
  public var itemContainerPaddingBlock: CGFloat
  public var itemContainerPaddingInline: CGFloat
  public var itemContainerShape: CGFloat
  public var itemContainerWidth: CGFloat
  public var itemGap: CGFloat
  public var itemIconIndicatorHeight: CGFloat
  public var itemIconIndicatorShape: CGFloat
  public var itemIconIndicatorWidth: CGFloat
  public var itemIconSize: CGFloat
  public var itemLabelTypescale: TanreiTextStyle
  public var motionFeedbackDuration: Double
  public var motionSelectionDuration: Double
  public var motionSelectionEasing: TanreiCubicBezier
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var outlineColor: TanreiPaint
  public var outlineWidth: CGFloat
  public var conditions: TanreiNavigationBarConditions
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiNavigationBarStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiNavigationBarStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiNavigationBarStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiNavigationBarStateTokens

  public init(
    containerColor: TanreiPaint,
    containerElevation: [TanreiShadowLayer],
    containerHeight: CGFloat,
    containerPadding: CGFloat,
    itemContainerHeight: CGFloat,
    itemContainerPaddingBlock: CGFloat,
    itemContainerPaddingInline: CGFloat,
    itemContainerShape: CGFloat,
    itemContainerWidth: CGFloat,
    itemGap: CGFloat,
    itemIconIndicatorHeight: CGFloat,
    itemIconIndicatorShape: CGFloat,
    itemIconIndicatorWidth: CGFloat,
    itemIconSize: CGFloat,
    itemLabelTypescale: TanreiTextStyle,
    motionFeedbackDuration: Double,
    motionSelectionDuration: Double,
    motionSelectionEasing: TanreiCubicBezier,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    outlineColor: TanreiPaint,
    outlineWidth: CGFloat,
    conditions: TanreiNavigationBarConditions,
    hovered: TanreiNavigationBarStateTokens,
    focused: TanreiNavigationBarStateTokens,
    pressed: TanreiNavigationBarStateTokens,
    disabled: TanreiNavigationBarStateTokens
  ) {
    self.containerColor = containerColor
    self.containerElevation = containerElevation
    self.containerHeight = containerHeight
    self.containerPadding = containerPadding
    self.itemContainerHeight = itemContainerHeight
    self.itemContainerPaddingBlock = itemContainerPaddingBlock
    self.itemContainerPaddingInline = itemContainerPaddingInline
    self.itemContainerShape = itemContainerShape
    self.itemContainerWidth = itemContainerWidth
    self.itemGap = itemGap
    self.itemIconIndicatorHeight = itemIconIndicatorHeight
    self.itemIconIndicatorShape = itemIconIndicatorShape
    self.itemIconIndicatorWidth = itemIconIndicatorWidth
    self.itemIconSize = itemIconSize
    self.itemLabelTypescale = itemLabelTypescale
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionSelectionDuration = motionSelectionDuration
    self.motionSelectionEasing = motionSelectionEasing
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.outlineColor = outlineColor
    self.outlineWidth = outlineWidth
    self.conditions = conditions
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which navigation-bar has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiNavigationBarStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// A value of navigation-drawer's `variant` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiNavigationDrawerVariant(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiNavigationDrawerVariant: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let standard = TanreiNavigationDrawerVariant(rawValue: "standard")
  public static let modal = TanreiNavigationDrawerVariant(rawValue: "modal")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiNavigationDrawerVariant] = [.standard, .modal]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiNavigationDrawerVariant.standard
}

/// Everything of navigation-drawer that depends on its variant.
public struct TanreiNavigationDrawerVariantTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var containerElevation: [TanreiShadowLayer]
  public var containerShape: CGFloat
  public var outlineColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    containerElevation: [TanreiShadowLayer],
    containerShape: CGFloat,
    outlineColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.containerElevation = containerElevation
    self.containerShape = containerShape
    self.outlineColor = outlineColor
  }
}

/// The variants of navigation-drawer: named fields for the core values, `extra` for what a design system added.
/// Read one with `variants[key]`.
public struct TanreiNavigationDrawerVariants: Sendable, Equatable {
  public var standard: TanreiNavigationDrawerVariantTokens
  public var modal: TanreiNavigationDrawerVariantTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiNavigationDrawerVariant: TanreiNavigationDrawerVariantTokens]

  public init(
    standard: TanreiNavigationDrawerVariantTokens,
    modal: TanreiNavigationDrawerVariantTokens,
    extra: [TanreiNavigationDrawerVariant: TanreiNavigationDrawerVariantTokens] = [:]
  ) {
    self.standard = standard
    self.modal = modal
    self.extra = extra
  }

  /// The tokens of one navigation-drawer variant, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiNavigationDrawerVariant) -> TanreiNavigationDrawerVariantTokens? {
    switch key {
    case .standard: return standard
    case .modal: return modal
    default: return extra[key]
    }
  }

  /// Total lookup: a navigation-drawer variant this design system does not have reads the tokens of `standard`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiNavigationDrawerVariant) -> TanreiNavigationDrawerVariantTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no navigation-drawer variant \"\(key.rawValue)\"; using \"standard\"")
    return standard
  }

  /// Every navigation-drawer variant of this design system: the core ones, then what it added.
  public var keys: [TanreiNavigationDrawerVariant] { TanreiNavigationDrawerVariant.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of navigation-drawer's `condition` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiNavigationDrawerCondition(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiNavigationDrawerCondition: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let unselected = TanreiNavigationDrawerCondition(rawValue: "unselected")
  public static let selected = TanreiNavigationDrawerCondition(rawValue: "selected")
  public static let collapsedUnselected = TanreiNavigationDrawerCondition(rawValue: "collapsed-unselected")
  public static let collapsedSelected = TanreiNavigationDrawerCondition(rawValue: "collapsed-selected")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiNavigationDrawerCondition] = [.unselected, .selected, .collapsedUnselected, .collapsedSelected]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiNavigationDrawerCondition.unselected
}

/// How one condition of navigation-drawer is drawn in one state.
public struct TanreiNavigationDrawerConditionStateTokens: Sendable, Equatable {
  public var itemContainerColor: TanreiPaint
  public var itemIconIndicatorColor: TanreiPaint
  public var itemIconColor: TanreiPaint
  public var itemLabelColor: TanreiPaint
  public var itemTrailingTextColor: TanreiPaint
  public var itemTrailingIconColor: TanreiPaint
  public var itemBadgeColor: TanreiPaint
  public var itemStateLayerColor: TanreiPaint

  public init(
    itemContainerColor: TanreiPaint,
    itemIconIndicatorColor: TanreiPaint,
    itemIconColor: TanreiPaint,
    itemLabelColor: TanreiPaint,
    itemTrailingTextColor: TanreiPaint,
    itemTrailingIconColor: TanreiPaint,
    itemBadgeColor: TanreiPaint,
    itemStateLayerColor: TanreiPaint
  ) {
    self.itemContainerColor = itemContainerColor
    self.itemIconIndicatorColor = itemIconIndicatorColor
    self.itemIconColor = itemIconColor
    self.itemLabelColor = itemLabelColor
    self.itemTrailingTextColor = itemTrailingTextColor
    self.itemTrailingIconColor = itemTrailingIconColor
    self.itemBadgeColor = itemBadgeColor
    self.itemStateLayerColor = itemStateLayerColor
  }
}

/// One condition of navigation-drawer: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiNavigationDrawerConditionTokens: Sendable, Equatable {
  public var enabled: TanreiNavigationDrawerConditionStateTokens
  public var hovered: TanreiNavigationDrawerConditionStateTokens
  public var focused: TanreiNavigationDrawerConditionStateTokens
  public var pressed: TanreiNavigationDrawerConditionStateTokens
  public var disabled: TanreiNavigationDrawerConditionStateTokens

  public init(
    enabled: TanreiNavigationDrawerConditionStateTokens,
    hovered: TanreiNavigationDrawerConditionStateTokens,
    focused: TanreiNavigationDrawerConditionStateTokens,
    pressed: TanreiNavigationDrawerConditionStateTokens,
    disabled: TanreiNavigationDrawerConditionStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this condition of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiNavigationDrawerConditionStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The conditions of navigation-drawer: named fields for the core values, `extra` for what a design system added.
/// Read one with `conditions[key]`.
public struct TanreiNavigationDrawerConditions: Sendable, Equatable {
  public var unselected: TanreiNavigationDrawerConditionTokens
  public var selected: TanreiNavigationDrawerConditionTokens
  public var collapsedUnselected: TanreiNavigationDrawerConditionTokens
  public var collapsedSelected: TanreiNavigationDrawerConditionTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiNavigationDrawerCondition: TanreiNavigationDrawerConditionTokens]

  public init(
    unselected: TanreiNavigationDrawerConditionTokens,
    selected: TanreiNavigationDrawerConditionTokens,
    collapsedUnselected: TanreiNavigationDrawerConditionTokens,
    collapsedSelected: TanreiNavigationDrawerConditionTokens,
    extra: [TanreiNavigationDrawerCondition: TanreiNavigationDrawerConditionTokens] = [:]
  ) {
    self.unselected = unselected
    self.selected = selected
    self.collapsedUnselected = collapsedUnselected
    self.collapsedSelected = collapsedSelected
    self.extra = extra
  }

  /// The tokens of one navigation-drawer condition, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiNavigationDrawerCondition) -> TanreiNavigationDrawerConditionTokens? {
    switch key {
    case .unselected: return unselected
    case .selected: return selected
    case .collapsedUnselected: return collapsedUnselected
    case .collapsedSelected: return collapsedSelected
    default: return extra[key]
    }
  }

  /// Total lookup: a navigation-drawer condition this design system does not have reads the tokens of `unselected`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiNavigationDrawerCondition) -> TanreiNavigationDrawerConditionTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no navigation-drawer condition \"\(key.rawValue)\"; using \"unselected\"")
    return unselected
  }

  /// Every navigation-drawer condition of this design system: the core ones, then what it added.
  public var keys: [TanreiNavigationDrawerCondition] { TanreiNavigationDrawerCondition.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of navigation-drawer that depend on the state but not on the variant.
public struct TanreiNavigationDrawerStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of navigation-drawer (comp.navigation-drawer).
public struct TanreiNavigationDrawerTokens: Sendable, Equatable {
  public var breakpointCollapsed: CGFloat
  public var breakpointExpanded: CGFloat
  public var collapsedContainerWidth: CGFloat
  public var collapsedItemContainerPaddingBlock: CGFloat
  public var collapsedItemContainerPaddingInline: CGFloat
  public var collapsedItemContainerShape: CGFloat
  public var collapsedItemContainerWidth: CGFloat
  public var collapsedItemGap: CGFloat
  public var collapsedItemLabelTypescale: TanreiTextStyle
  public var containerGap: CGFloat
  public var containerPaddingBlock: CGFloat
  public var containerPaddingInline: CGFloat
  public var containerWidth: CGFloat
  public var headerGap: CGFloat
  public var headerItemGap: CGFloat
  public var headingColor: TanreiPaint
  public var headingHeight: CGFloat
  public var headingTypescale: TanreiTextStyle
  public var itemBadgeTypescale: TanreiTextStyle
  public var itemContainerHeight: CGFloat
  public var itemContainerShape: CGFloat
  public var itemGap: CGFloat
  public var itemIconIndicatorHeight: CGFloat
  public var itemIconIndicatorShape: CGFloat
  public var itemIconIndicatorWidth: CGFloat
  public var itemIconSize: CGFloat
  public var itemLabelTypescale: TanreiTextStyle
  public var itemNestIndent: CGFloat
  public var itemPaddingInline: CGFloat
  public var itemTrailingIconSize: CGFloat
  public var itemTrailingTextTypescale: TanreiTextStyle
  public var motionDisclosureDuration: Double
  public var motionDisclosureEasing: TanreiCubicBezier
  public var motionEnterDuration: Double
  public var motionEnterEasing: TanreiCubicBezier
  public var motionExitDuration: Double
  public var motionExitEasing: TanreiCubicBezier
  public var motionExpandDuration: Double
  public var motionExpandEasing: TanreiCubicBezier
  public var motionFeedbackDuration: Double
  public var motionSelectionDuration: Double
  public var motionSelectionEasing: TanreiCubicBezier
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var outlineWidth: CGFloat
  public var scrimColor: TanreiPaint
  public var variants: TanreiNavigationDrawerVariants
  public var conditions: TanreiNavigationDrawerConditions
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiNavigationDrawerStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiNavigationDrawerStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiNavigationDrawerStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiNavigationDrawerStateTokens

  public init(
    breakpointCollapsed: CGFloat,
    breakpointExpanded: CGFloat,
    collapsedContainerWidth: CGFloat,
    collapsedItemContainerPaddingBlock: CGFloat,
    collapsedItemContainerPaddingInline: CGFloat,
    collapsedItemContainerShape: CGFloat,
    collapsedItemContainerWidth: CGFloat,
    collapsedItemGap: CGFloat,
    collapsedItemLabelTypescale: TanreiTextStyle,
    containerGap: CGFloat,
    containerPaddingBlock: CGFloat,
    containerPaddingInline: CGFloat,
    containerWidth: CGFloat,
    headerGap: CGFloat,
    headerItemGap: CGFloat,
    headingColor: TanreiPaint,
    headingHeight: CGFloat,
    headingTypescale: TanreiTextStyle,
    itemBadgeTypescale: TanreiTextStyle,
    itemContainerHeight: CGFloat,
    itemContainerShape: CGFloat,
    itemGap: CGFloat,
    itemIconIndicatorHeight: CGFloat,
    itemIconIndicatorShape: CGFloat,
    itemIconIndicatorWidth: CGFloat,
    itemIconSize: CGFloat,
    itemLabelTypescale: TanreiTextStyle,
    itemNestIndent: CGFloat,
    itemPaddingInline: CGFloat,
    itemTrailingIconSize: CGFloat,
    itemTrailingTextTypescale: TanreiTextStyle,
    motionDisclosureDuration: Double,
    motionDisclosureEasing: TanreiCubicBezier,
    motionEnterDuration: Double,
    motionEnterEasing: TanreiCubicBezier,
    motionExitDuration: Double,
    motionExitEasing: TanreiCubicBezier,
    motionExpandDuration: Double,
    motionExpandEasing: TanreiCubicBezier,
    motionFeedbackDuration: Double,
    motionSelectionDuration: Double,
    motionSelectionEasing: TanreiCubicBezier,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    outlineWidth: CGFloat,
    scrimColor: TanreiPaint,
    variants: TanreiNavigationDrawerVariants,
    conditions: TanreiNavigationDrawerConditions,
    hovered: TanreiNavigationDrawerStateTokens,
    focused: TanreiNavigationDrawerStateTokens,
    pressed: TanreiNavigationDrawerStateTokens,
    disabled: TanreiNavigationDrawerStateTokens
  ) {
    self.breakpointCollapsed = breakpointCollapsed
    self.breakpointExpanded = breakpointExpanded
    self.collapsedContainerWidth = collapsedContainerWidth
    self.collapsedItemContainerPaddingBlock = collapsedItemContainerPaddingBlock
    self.collapsedItemContainerPaddingInline = collapsedItemContainerPaddingInline
    self.collapsedItemContainerShape = collapsedItemContainerShape
    self.collapsedItemContainerWidth = collapsedItemContainerWidth
    self.collapsedItemGap = collapsedItemGap
    self.collapsedItemLabelTypescale = collapsedItemLabelTypescale
    self.containerGap = containerGap
    self.containerPaddingBlock = containerPaddingBlock
    self.containerPaddingInline = containerPaddingInline
    self.containerWidth = containerWidth
    self.headerGap = headerGap
    self.headerItemGap = headerItemGap
    self.headingColor = headingColor
    self.headingHeight = headingHeight
    self.headingTypescale = headingTypescale
    self.itemBadgeTypescale = itemBadgeTypescale
    self.itemContainerHeight = itemContainerHeight
    self.itemContainerShape = itemContainerShape
    self.itemGap = itemGap
    self.itemIconIndicatorHeight = itemIconIndicatorHeight
    self.itemIconIndicatorShape = itemIconIndicatorShape
    self.itemIconIndicatorWidth = itemIconIndicatorWidth
    self.itemIconSize = itemIconSize
    self.itemLabelTypescale = itemLabelTypescale
    self.itemNestIndent = itemNestIndent
    self.itemPaddingInline = itemPaddingInline
    self.itemTrailingIconSize = itemTrailingIconSize
    self.itemTrailingTextTypescale = itemTrailingTextTypescale
    self.motionDisclosureDuration = motionDisclosureDuration
    self.motionDisclosureEasing = motionDisclosureEasing
    self.motionEnterDuration = motionEnterDuration
    self.motionEnterEasing = motionEnterEasing
    self.motionExitDuration = motionExitDuration
    self.motionExitEasing = motionExitEasing
    self.motionExpandDuration = motionExpandDuration
    self.motionExpandEasing = motionExpandEasing
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionSelectionDuration = motionSelectionDuration
    self.motionSelectionEasing = motionSelectionEasing
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.outlineWidth = outlineWidth
    self.scrimColor = scrimColor
    self.variants = variants
    self.conditions = conditions
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which navigation-drawer has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiNavigationDrawerStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// A value of navigation-rail's `condition` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiNavigationRailCondition(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiNavigationRailCondition: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let unselected = TanreiNavigationRailCondition(rawValue: "unselected")
  public static let selected = TanreiNavigationRailCondition(rawValue: "selected")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiNavigationRailCondition] = [.unselected, .selected]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiNavigationRailCondition.unselected
}

/// How one condition of navigation-rail is drawn in one state.
public struct TanreiNavigationRailConditionStateTokens: Sendable, Equatable {
  public var itemContainerColor: TanreiPaint
  public var itemIconColor: TanreiPaint
  public var itemLabelColor: TanreiPaint
  public var itemStateLayerColor: TanreiPaint

  public init(
    itemContainerColor: TanreiPaint,
    itemIconColor: TanreiPaint,
    itemLabelColor: TanreiPaint,
    itemStateLayerColor: TanreiPaint
  ) {
    self.itemContainerColor = itemContainerColor
    self.itemIconColor = itemIconColor
    self.itemLabelColor = itemLabelColor
    self.itemStateLayerColor = itemStateLayerColor
  }
}

/// One condition of navigation-rail: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiNavigationRailConditionTokens: Sendable, Equatable {
  public var enabled: TanreiNavigationRailConditionStateTokens
  public var hovered: TanreiNavigationRailConditionStateTokens
  public var focused: TanreiNavigationRailConditionStateTokens
  public var pressed: TanreiNavigationRailConditionStateTokens
  public var disabled: TanreiNavigationRailConditionStateTokens

  public init(
    enabled: TanreiNavigationRailConditionStateTokens,
    hovered: TanreiNavigationRailConditionStateTokens,
    focused: TanreiNavigationRailConditionStateTokens,
    pressed: TanreiNavigationRailConditionStateTokens,
    disabled: TanreiNavigationRailConditionStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this condition of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiNavigationRailConditionStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The conditions of navigation-rail: named fields for the core values, `extra` for what a design system added.
/// Read one with `conditions[key]`.
public struct TanreiNavigationRailConditions: Sendable, Equatable {
  public var unselected: TanreiNavigationRailConditionTokens
  public var selected: TanreiNavigationRailConditionTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiNavigationRailCondition: TanreiNavigationRailConditionTokens]

  public init(
    unselected: TanreiNavigationRailConditionTokens,
    selected: TanreiNavigationRailConditionTokens,
    extra: [TanreiNavigationRailCondition: TanreiNavigationRailConditionTokens] = [:]
  ) {
    self.unselected = unselected
    self.selected = selected
    self.extra = extra
  }

  /// The tokens of one navigation-rail condition, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiNavigationRailCondition) -> TanreiNavigationRailConditionTokens? {
    switch key {
    case .unselected: return unselected
    case .selected: return selected
    default: return extra[key]
    }
  }

  /// Total lookup: a navigation-rail condition this design system does not have reads the tokens of `unselected`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiNavigationRailCondition) -> TanreiNavigationRailConditionTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no navigation-rail condition \"\(key.rawValue)\"; using \"unselected\"")
    return unselected
  }

  /// Every navigation-rail condition of this design system: the core ones, then what it added.
  public var keys: [TanreiNavigationRailCondition] { TanreiNavigationRailCondition.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of navigation-rail that depend on the state but not on the variant.
public struct TanreiNavigationRailStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of navigation-rail (comp.navigation-rail).
public struct TanreiNavigationRailTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var containerElevation: [TanreiShadowLayer]
  public var containerGap: CGFloat
  public var containerPaddingBlock: CGFloat
  public var containerWidth: CGFloat
  public var headerGap: CGFloat
  public var itemContainerHeight: CGFloat
  public var itemContainerShape: CGFloat
  public var itemContainerWidth: CGFloat
  public var itemGap: CGFloat
  public var itemIconSize: CGFloat
  public var itemLabelTypescale: TanreiTextStyle
  public var motionFeedbackDuration: Double
  public var motionSelectionDuration: Double
  public var motionSelectionEasing: TanreiCubicBezier
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var outlineColor: TanreiPaint
  public var outlineWidth: CGFloat
  public var conditions: TanreiNavigationRailConditions
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiNavigationRailStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiNavigationRailStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiNavigationRailStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiNavigationRailStateTokens

  public init(
    containerColor: TanreiPaint,
    containerElevation: [TanreiShadowLayer],
    containerGap: CGFloat,
    containerPaddingBlock: CGFloat,
    containerWidth: CGFloat,
    headerGap: CGFloat,
    itemContainerHeight: CGFloat,
    itemContainerShape: CGFloat,
    itemContainerWidth: CGFloat,
    itemGap: CGFloat,
    itemIconSize: CGFloat,
    itemLabelTypescale: TanreiTextStyle,
    motionFeedbackDuration: Double,
    motionSelectionDuration: Double,
    motionSelectionEasing: TanreiCubicBezier,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    outlineColor: TanreiPaint,
    outlineWidth: CGFloat,
    conditions: TanreiNavigationRailConditions,
    hovered: TanreiNavigationRailStateTokens,
    focused: TanreiNavigationRailStateTokens,
    pressed: TanreiNavigationRailStateTokens,
    disabled: TanreiNavigationRailStateTokens
  ) {
    self.containerColor = containerColor
    self.containerElevation = containerElevation
    self.containerGap = containerGap
    self.containerPaddingBlock = containerPaddingBlock
    self.containerWidth = containerWidth
    self.headerGap = headerGap
    self.itemContainerHeight = itemContainerHeight
    self.itemContainerShape = itemContainerShape
    self.itemContainerWidth = itemContainerWidth
    self.itemGap = itemGap
    self.itemIconSize = itemIconSize
    self.itemLabelTypescale = itemLabelTypescale
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionSelectionDuration = motionSelectionDuration
    self.motionSelectionEasing = motionSelectionEasing
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.outlineColor = outlineColor
    self.outlineWidth = outlineWidth
    self.conditions = conditions
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which navigation-rail has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiNavigationRailStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// Component tokens of number-input (comp.number-input).
public struct TanreiNumberInputTokens: Sendable, Equatable {
  public var motionRepeatDelay: Double
  public var motionRepeatInterval: Double
  public var motionRepeatIntervalFast: Double
  public var stepperGap: CGFloat
  public var stepperInset: CGFloat

  public init(
    motionRepeatDelay: Double,
    motionRepeatInterval: Double,
    motionRepeatIntervalFast: Double,
    stepperGap: CGFloat,
    stepperInset: CGFloat
  ) {
    self.motionRepeatDelay = motionRepeatDelay
    self.motionRepeatInterval = motionRepeatInterval
    self.motionRepeatIntervalFast = motionRepeatIntervalFast
    self.stepperGap = stepperGap
    self.stepperInset = stepperInset
  }
}

/// A value of one-time-code-input's `condition` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiOneTimeCodeInputCondition(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiOneTimeCodeInputCondition: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let standard = TanreiOneTimeCodeInputCondition(rawValue: "standard")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiOneTimeCodeInputCondition] = [.standard]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiOneTimeCodeInputCondition.standard
}

/// How one condition of one-time-code-input is drawn in one state.
public struct TanreiOneTimeCodeInputConditionStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var outlineColor: TanreiPaint
  public var inputColor: TanreiPaint
  public var caretColor: TanreiPaint
  public var separatorColor: TanreiPaint
  public var stateLayerColor: TanreiPaint
  public var errorContainerColor: TanreiPaint
  public var errorOutlineColor: TanreiPaint
  public var errorInputColor: TanreiPaint
  public var errorCaretColor: TanreiPaint
  public var errorSeparatorColor: TanreiPaint
  public var errorStateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    outlineColor: TanreiPaint,
    inputColor: TanreiPaint,
    caretColor: TanreiPaint,
    separatorColor: TanreiPaint,
    stateLayerColor: TanreiPaint,
    errorContainerColor: TanreiPaint,
    errorOutlineColor: TanreiPaint,
    errorInputColor: TanreiPaint,
    errorCaretColor: TanreiPaint,
    errorSeparatorColor: TanreiPaint,
    errorStateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.outlineColor = outlineColor
    self.inputColor = inputColor
    self.caretColor = caretColor
    self.separatorColor = separatorColor
    self.stateLayerColor = stateLayerColor
    self.errorContainerColor = errorContainerColor
    self.errorOutlineColor = errorOutlineColor
    self.errorInputColor = errorInputColor
    self.errorCaretColor = errorCaretColor
    self.errorSeparatorColor = errorSeparatorColor
    self.errorStateLayerColor = errorStateLayerColor
  }
}

/// One condition of one-time-code-input: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiOneTimeCodeInputConditionTokens: Sendable, Equatable {
  public var enabled: TanreiOneTimeCodeInputConditionStateTokens
  public var hovered: TanreiOneTimeCodeInputConditionStateTokens
  public var focused: TanreiOneTimeCodeInputConditionStateTokens
  public var disabled: TanreiOneTimeCodeInputConditionStateTokens

  public init(
    enabled: TanreiOneTimeCodeInputConditionStateTokens,
    hovered: TanreiOneTimeCodeInputConditionStateTokens,
    focused: TanreiOneTimeCodeInputConditionStateTokens,
    disabled: TanreiOneTimeCodeInputConditionStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.disabled = disabled
  }

  /// The tokens of this condition of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `pressed`, which one-time-code-input has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiOneTimeCodeInputConditionStateTokens? {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return nil
    case .disabled: return disabled
    }
  }
}

/// The conditions of one-time-code-input: named fields for the core values, `extra` for what a design system added.
/// Read one with `conditions[key]`.
public struct TanreiOneTimeCodeInputConditions: Sendable, Equatable {
  public var standard: TanreiOneTimeCodeInputConditionTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiOneTimeCodeInputCondition: TanreiOneTimeCodeInputConditionTokens]

  public init(
    standard: TanreiOneTimeCodeInputConditionTokens,
    extra: [TanreiOneTimeCodeInputCondition: TanreiOneTimeCodeInputConditionTokens] = [:]
  ) {
    self.standard = standard
    self.extra = extra
  }

  /// The tokens of one one-time-code-input condition, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiOneTimeCodeInputCondition) -> TanreiOneTimeCodeInputConditionTokens? {
    switch key {
    case .standard: return standard
    default: return extra[key]
    }
  }

  /// Total lookup: a one-time-code-input condition this design system does not have reads the tokens of `standard`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiOneTimeCodeInputCondition) -> TanreiOneTimeCodeInputConditionTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no one-time-code-input condition \"\(key.rawValue)\"; using \"standard\"")
    return standard
  }

  /// Every one-time-code-input condition of this design system: the core ones, then what it added.
  public var keys: [TanreiOneTimeCodeInputCondition] { TanreiOneTimeCodeInputCondition.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of one-time-code-input that depend on the state but not on the variant.
public struct TanreiOneTimeCodeInputStateTokens: Sendable, Equatable {
  public var outlineWidth: CGFloat

  public init(
    outlineWidth: CGFloat
  ) {
    self.outlineWidth = outlineWidth
  }
}

/// Component tokens of one-time-code-input (comp.one-time-code-input).
public struct TanreiOneTimeCodeInputTokens: Sendable, Equatable {
  public var containerGap: CGFloat
  public var containerHeight: CGFloat
  public var containerPaddingInline: CGFloat
  public var containerShape: CGFloat
  public var containerWidth: CGFloat
  public var inputTypescale: TanreiTextStyle
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var outlineWidth: CGFloat
  public var separatorThickness: CGFloat
  public var separatorWidth: CGFloat
  public var conditions: TanreiOneTimeCodeInputConditions
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiOneTimeCodeInputStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiOneTimeCodeInputStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiOneTimeCodeInputStateTokens

  public init(
    containerGap: CGFloat,
    containerHeight: CGFloat,
    containerPaddingInline: CGFloat,
    containerShape: CGFloat,
    containerWidth: CGFloat,
    inputTypescale: TanreiTextStyle,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    outlineWidth: CGFloat,
    separatorThickness: CGFloat,
    separatorWidth: CGFloat,
    conditions: TanreiOneTimeCodeInputConditions,
    hovered: TanreiOneTimeCodeInputStateTokens,
    focused: TanreiOneTimeCodeInputStateTokens,
    disabled: TanreiOneTimeCodeInputStateTokens
  ) {
    self.containerGap = containerGap
    self.containerHeight = containerHeight
    self.containerPaddingInline = containerPaddingInline
    self.containerShape = containerShape
    self.containerWidth = containerWidth
    self.inputTypescale = inputTypescale
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.outlineWidth = outlineWidth
    self.separatorThickness = separatorThickness
    self.separatorWidth = separatorWidth
    self.conditions = conditions
    self.hovered = hovered
    self.focused = focused
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, `pressed`, which one-time-code-input has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiOneTimeCodeInputStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return nil
    case .disabled: return disabled
    }
  }
}

/// A value of page-header's `size` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiPageHeaderSize(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiPageHeaderSize: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let small = TanreiPageHeaderSize(rawValue: "small")
  public static let medium = TanreiPageHeaderSize(rawValue: "medium")
  public static let large = TanreiPageHeaderSize(rawValue: "large")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiPageHeaderSize] = [.small, .medium, .large]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiPageHeaderSize.medium
}

/// Everything of page-header that depends on its size.
public struct TanreiPageHeaderSizeTokens: Sendable, Equatable {
  public var titleTypescale: TanreiTextStyle
  public var descriptionTypescale: TanreiTextStyle
  public var descriptionGap: CGFloat
  public var containerPaddingBlockEnd: CGFloat

  public init(
    titleTypescale: TanreiTextStyle,
    descriptionTypescale: TanreiTextStyle,
    descriptionGap: CGFloat,
    containerPaddingBlockEnd: CGFloat
  ) {
    self.titleTypescale = titleTypescale
    self.descriptionTypescale = descriptionTypescale
    self.descriptionGap = descriptionGap
    self.containerPaddingBlockEnd = containerPaddingBlockEnd
  }
}

/// The sizes of page-header: named fields for the core values, `extra` for what a design system added.
/// Read one with `sizes[key]`.
public struct TanreiPageHeaderSizes: Sendable, Equatable {
  public var small: TanreiPageHeaderSizeTokens
  public var medium: TanreiPageHeaderSizeTokens
  public var large: TanreiPageHeaderSizeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiPageHeaderSize: TanreiPageHeaderSizeTokens]

  public init(
    small: TanreiPageHeaderSizeTokens,
    medium: TanreiPageHeaderSizeTokens,
    large: TanreiPageHeaderSizeTokens,
    extra: [TanreiPageHeaderSize: TanreiPageHeaderSizeTokens] = [:]
  ) {
    self.small = small
    self.medium = medium
    self.large = large
    self.extra = extra
  }

  /// The tokens of one page-header size, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiPageHeaderSize) -> TanreiPageHeaderSizeTokens? {
    switch key {
    case .small: return small
    case .medium: return medium
    case .large: return large
    default: return extra[key]
    }
  }

  /// Total lookup: a page-header size this design system does not have reads the tokens of `medium`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiPageHeaderSize) -> TanreiPageHeaderSizeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no page-header size \"\(key.rawValue)\"; using \"medium\"")
    return medium
  }

  /// Every page-header size of this design system: the core ones, then what it added.
  public var keys: [TanreiPageHeaderSize] { TanreiPageHeaderSize.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Component tokens of page-header (comp.page-header).
public struct TanreiPageHeaderTokens: Sendable, Equatable {
  public var actionsGap: CGFloat
  public var actionsItemGap: CGFloat
  public var breadcrumbsGap: CGFloat
  public var containerGap: CGFloat
  public var descriptionColor: TanreiPaint
  public var descriptionMeasure: Double
  public var dividerColor: TanreiPaint
  public var dividerThickness: CGFloat
  public var eyebrowColor: TanreiPaint
  public var eyebrowGap: CGFloat
  public var eyebrowTypescale: TanreiTextStyle
  public var metaColor: TanreiPaint
  public var metaGap: CGFloat
  public var metaIconGap: CGFloat
  public var metaItemGap: CGFloat
  public var metaRowGap: CGFloat
  public var metaSeparatorColor: TanreiPaint
  public var metaSeparatorSize: CGFloat
  public var metaTypescale: TanreiTextStyle
  public var titleColor: TanreiPaint
  public var wideContainerWidth: CGFloat
  public var sizes: TanreiPageHeaderSizes

  public init(
    actionsGap: CGFloat,
    actionsItemGap: CGFloat,
    breadcrumbsGap: CGFloat,
    containerGap: CGFloat,
    descriptionColor: TanreiPaint,
    descriptionMeasure: Double,
    dividerColor: TanreiPaint,
    dividerThickness: CGFloat,
    eyebrowColor: TanreiPaint,
    eyebrowGap: CGFloat,
    eyebrowTypescale: TanreiTextStyle,
    metaColor: TanreiPaint,
    metaGap: CGFloat,
    metaIconGap: CGFloat,
    metaItemGap: CGFloat,
    metaRowGap: CGFloat,
    metaSeparatorColor: TanreiPaint,
    metaSeparatorSize: CGFloat,
    metaTypescale: TanreiTextStyle,
    titleColor: TanreiPaint,
    wideContainerWidth: CGFloat,
    sizes: TanreiPageHeaderSizes
  ) {
    self.actionsGap = actionsGap
    self.actionsItemGap = actionsItemGap
    self.breadcrumbsGap = breadcrumbsGap
    self.containerGap = containerGap
    self.descriptionColor = descriptionColor
    self.descriptionMeasure = descriptionMeasure
    self.dividerColor = dividerColor
    self.dividerThickness = dividerThickness
    self.eyebrowColor = eyebrowColor
    self.eyebrowGap = eyebrowGap
    self.eyebrowTypescale = eyebrowTypescale
    self.metaColor = metaColor
    self.metaGap = metaGap
    self.metaIconGap = metaIconGap
    self.metaItemGap = metaItemGap
    self.metaRowGap = metaRowGap
    self.metaSeparatorColor = metaSeparatorColor
    self.metaSeparatorSize = metaSeparatorSize
    self.metaTypescale = metaTypescale
    self.titleColor = titleColor
    self.wideContainerWidth = wideContainerWidth
    self.sizes = sizes
  }
}

/// A value of pagination's `part` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiPaginationPart(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiPaginationPart: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let item = TanreiPaginationPart(rawValue: "item")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiPaginationPart] = [.item]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiPaginationPart.item
}

/// How one part of pagination is drawn in one state.
public struct TanreiPaginationPartStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var outlineColor: TanreiPaint
  public var labelColor: TanreiPaint
  public var titleColor: TanreiPaint
  public var iconColor: TanreiPaint
  public var stateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    outlineColor: TanreiPaint,
    labelColor: TanreiPaint,
    titleColor: TanreiPaint,
    iconColor: TanreiPaint,
    stateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.outlineColor = outlineColor
    self.labelColor = labelColor
    self.titleColor = titleColor
    self.iconColor = iconColor
    self.stateLayerColor = stateLayerColor
  }
}

/// One part of pagination: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiPaginationPartTokens: Sendable, Equatable {
  public var enabled: TanreiPaginationPartStateTokens
  public var hovered: TanreiPaginationPartStateTokens
  public var focused: TanreiPaginationPartStateTokens
  public var pressed: TanreiPaginationPartStateTokens

  public init(
    enabled: TanreiPaginationPartStateTokens,
    hovered: TanreiPaginationPartStateTokens,
    focused: TanreiPaginationPartStateTokens,
    pressed: TanreiPaginationPartStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
  }

  /// The tokens of this part of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `disabled`, which pagination has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiPaginationPartStateTokens? {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return nil
    }
  }
}

/// The parts of pagination: named fields for the core values, `extra` for what a design system added.
/// Read one with `parts[key]`.
public struct TanreiPaginationParts: Sendable, Equatable {
  public var item: TanreiPaginationPartTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiPaginationPart: TanreiPaginationPartTokens]

  public init(
    item: TanreiPaginationPartTokens,
    extra: [TanreiPaginationPart: TanreiPaginationPartTokens] = [:]
  ) {
    self.item = item
    self.extra = extra
  }

  /// The tokens of one pagination part, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiPaginationPart) -> TanreiPaginationPartTokens? {
    switch key {
    case .item: return item
    default: return extra[key]
    }
  }

  /// Total lookup: a pagination part this design system does not have reads the tokens of `item`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiPaginationPart) -> TanreiPaginationPartTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no pagination part \"\(key.rawValue)\"; using \"item\"")
    return item
  }

  /// Every pagination part of this design system: the core ones, then what it added.
  public var keys: [TanreiPaginationPart] { TanreiPaginationPart.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of pagination that depend on the state but not on the variant.
public struct TanreiPaginationStateTokens: Sendable, Equatable {
  public var containerShape: CGFloat
  public var opacity: Double

  public init(
    containerShape: CGFloat,
    opacity: Double
  ) {
    self.containerShape = containerShape
    self.opacity = opacity
  }
}

/// Component tokens of pagination (comp.pagination).
public struct TanreiPaginationTokens: Sendable, Equatable {
  public var containerGap: CGFloat
  public var containerMinWidth: CGFloat
  public var containerPadding: CGFloat
  public var containerShape: CGFloat
  public var gap: CGFloat
  public var iconSize: CGFloat
  public var labelGap: CGFloat
  public var labelTypescale: TanreiTextStyle
  public var motionFeedbackDuration: Double
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var outlineWidth: CGFloat
  public var titleTypescale: TanreiTextStyle
  public var parts: TanreiPaginationParts
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiPaginationStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiPaginationStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiPaginationStateTokens

  public init(
    containerGap: CGFloat,
    containerMinWidth: CGFloat,
    containerPadding: CGFloat,
    containerShape: CGFloat,
    gap: CGFloat,
    iconSize: CGFloat,
    labelGap: CGFloat,
    labelTypescale: TanreiTextStyle,
    motionFeedbackDuration: Double,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    outlineWidth: CGFloat,
    titleTypescale: TanreiTextStyle,
    parts: TanreiPaginationParts,
    hovered: TanreiPaginationStateTokens,
    focused: TanreiPaginationStateTokens,
    pressed: TanreiPaginationStateTokens
  ) {
    self.containerGap = containerGap
    self.containerMinWidth = containerMinWidth
    self.containerPadding = containerPadding
    self.containerShape = containerShape
    self.gap = gap
    self.iconSize = iconSize
    self.labelGap = labelGap
    self.labelTypescale = labelTypescale
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.outlineWidth = outlineWidth
    self.titleTypescale = titleTypescale
    self.parts = parts
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, `disabled`, which pagination has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiPaginationStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return nil
    }
  }
}

/// Component tokens of popover (comp.popover).
public struct TanreiPopoverTokens: Sendable, Equatable {
  public var actionsArrangement: Double
  public var actionsGap: CGFloat
  public var actionsMarginBlockStart: CGFloat
  public var actionsVariant: Double
  public var arrowHeight: CGFloat
  public var arrowInset: CGFloat
  public var arrowVisible: Double
  public var arrowWidth: CGFloat
  public var closeButtonVariant: Double
  public var containerColor: TanreiPaint
  public var containerElevation: [TanreiShadowLayer]
  public var containerGap: CGFloat
  public var containerMaxHeight: CGFloat
  public var containerMaxWidth: CGFloat
  public var containerMinWidth: CGFloat
  public var containerPaddingBlock: CGFloat
  public var containerPaddingInline: CGFloat
  public var containerShape: CGFloat
  public var contentColor: TanreiPaint
  public var dividerColor: TanreiPaint
  public var dividerWidth: CGFloat
  public var headerGap: CGFloat
  public var headlineColor: TanreiPaint
  public var headlineTypescale: TanreiTextStyle
  public var motionCloseDuration: Double
  public var motionCloseEasing: TanreiCubicBezier
  public var motionOpenDuration: Double
  public var motionOpenEasing: TanreiCubicBezier
  public var offset: CGFloat
  public var windowMargin: CGFloat

  public init(
    actionsArrangement: Double,
    actionsGap: CGFloat,
    actionsMarginBlockStart: CGFloat,
    actionsVariant: Double,
    arrowHeight: CGFloat,
    arrowInset: CGFloat,
    arrowVisible: Double,
    arrowWidth: CGFloat,
    closeButtonVariant: Double,
    containerColor: TanreiPaint,
    containerElevation: [TanreiShadowLayer],
    containerGap: CGFloat,
    containerMaxHeight: CGFloat,
    containerMaxWidth: CGFloat,
    containerMinWidth: CGFloat,
    containerPaddingBlock: CGFloat,
    containerPaddingInline: CGFloat,
    containerShape: CGFloat,
    contentColor: TanreiPaint,
    dividerColor: TanreiPaint,
    dividerWidth: CGFloat,
    headerGap: CGFloat,
    headlineColor: TanreiPaint,
    headlineTypescale: TanreiTextStyle,
    motionCloseDuration: Double,
    motionCloseEasing: TanreiCubicBezier,
    motionOpenDuration: Double,
    motionOpenEasing: TanreiCubicBezier,
    offset: CGFloat,
    windowMargin: CGFloat
  ) {
    self.actionsArrangement = actionsArrangement
    self.actionsGap = actionsGap
    self.actionsMarginBlockStart = actionsMarginBlockStart
    self.actionsVariant = actionsVariant
    self.arrowHeight = arrowHeight
    self.arrowInset = arrowInset
    self.arrowVisible = arrowVisible
    self.arrowWidth = arrowWidth
    self.closeButtonVariant = closeButtonVariant
    self.containerColor = containerColor
    self.containerElevation = containerElevation
    self.containerGap = containerGap
    self.containerMaxHeight = containerMaxHeight
    self.containerMaxWidth = containerMaxWidth
    self.containerMinWidth = containerMinWidth
    self.containerPaddingBlock = containerPaddingBlock
    self.containerPaddingInline = containerPaddingInline
    self.containerShape = containerShape
    self.contentColor = contentColor
    self.dividerColor = dividerColor
    self.dividerWidth = dividerWidth
    self.headerGap = headerGap
    self.headlineColor = headlineColor
    self.headlineTypescale = headlineTypescale
    self.motionCloseDuration = motionCloseDuration
    self.motionCloseEasing = motionCloseEasing
    self.motionOpenDuration = motionOpenDuration
    self.motionOpenEasing = motionOpenEasing
    self.offset = offset
    self.windowMargin = windowMargin
  }
}

/// A value of progress-indicator's `size` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiProgressIndicatorSize(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiProgressIndicatorSize: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let small = TanreiProgressIndicatorSize(rawValue: "small")
  public static let medium = TanreiProgressIndicatorSize(rawValue: "medium")
  public static let large = TanreiProgressIndicatorSize(rawValue: "large")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiProgressIndicatorSize] = [.small, .medium, .large]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiProgressIndicatorSize.medium
}

/// Everything of progress-indicator that depends on its size.
public struct TanreiProgressIndicatorSizeTokens: Sendable, Equatable {
  public var linearThickness: CGFloat
  public var circularSize: CGFloat
  public var circularThickness: CGFloat

  public init(
    linearThickness: CGFloat,
    circularSize: CGFloat,
    circularThickness: CGFloat
  ) {
    self.linearThickness = linearThickness
    self.circularSize = circularSize
    self.circularThickness = circularThickness
  }
}

/// The sizes of progress-indicator: named fields for the core values, `extra` for what a design system added.
/// Read one with `sizes[key]`.
public struct TanreiProgressIndicatorSizes: Sendable, Equatable {
  public var small: TanreiProgressIndicatorSizeTokens
  public var medium: TanreiProgressIndicatorSizeTokens
  public var large: TanreiProgressIndicatorSizeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiProgressIndicatorSize: TanreiProgressIndicatorSizeTokens]

  public init(
    small: TanreiProgressIndicatorSizeTokens,
    medium: TanreiProgressIndicatorSizeTokens,
    large: TanreiProgressIndicatorSizeTokens,
    extra: [TanreiProgressIndicatorSize: TanreiProgressIndicatorSizeTokens] = [:]
  ) {
    self.small = small
    self.medium = medium
    self.large = large
    self.extra = extra
  }

  /// The tokens of one progress-indicator size, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiProgressIndicatorSize) -> TanreiProgressIndicatorSizeTokens? {
    switch key {
    case .small: return small
    case .medium: return medium
    case .large: return large
    default: return extra[key]
    }
  }

  /// Total lookup: a progress-indicator size this design system does not have reads the tokens of `medium`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiProgressIndicatorSize) -> TanreiProgressIndicatorSizeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no progress-indicator size \"\(key.rawValue)\"; using \"medium\"")
    return medium
  }

  /// Every progress-indicator size of this design system: the core ones, then what it added.
  public var keys: [TanreiProgressIndicatorSize] { TanreiProgressIndicatorSize.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Component tokens of progress-indicator (comp.progress-indicator).
public struct TanreiProgressIndicatorTokens: Sendable, Equatable {
  public var indicatorColor: TanreiPaint
  public var motionCycleDuration: Double
  public var motionCycleEasing: TanreiCubicBezier
  public var motionValueDuration: Double
  public var motionValueEasing: TanreiCubicBezier
  public var stopIndicatorSize: CGFloat
  public var trackColor: TanreiPaint
  public var trackGap: CGFloat
  public var trackSeparation: Double
  public var trackShape: CGFloat
  public var sizes: TanreiProgressIndicatorSizes

  public init(
    indicatorColor: TanreiPaint,
    motionCycleDuration: Double,
    motionCycleEasing: TanreiCubicBezier,
    motionValueDuration: Double,
    motionValueEasing: TanreiCubicBezier,
    stopIndicatorSize: CGFloat,
    trackColor: TanreiPaint,
    trackGap: CGFloat,
    trackSeparation: Double,
    trackShape: CGFloat,
    sizes: TanreiProgressIndicatorSizes
  ) {
    self.indicatorColor = indicatorColor
    self.motionCycleDuration = motionCycleDuration
    self.motionCycleEasing = motionCycleEasing
    self.motionValueDuration = motionValueDuration
    self.motionValueEasing = motionValueEasing
    self.stopIndicatorSize = stopIndicatorSize
    self.trackColor = trackColor
    self.trackGap = trackGap
    self.trackSeparation = trackSeparation
    self.trackShape = trackShape
    self.sizes = sizes
  }
}

/// A value of prose's `size` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiProseSize(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiProseSize: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let medium = TanreiProseSize(rawValue: "medium")
  public static let large = TanreiProseSize(rawValue: "large")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiProseSize] = [.medium, .large]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiProseSize.medium
}

/// Everything of prose that depends on its size.
public struct TanreiProseSizeTokens: Sendable, Equatable {
  public var textTypescale: TanreiTextStyle
  public var smallTypescale: TanreiTextStyle

  public init(
    textTypescale: TanreiTextStyle,
    smallTypescale: TanreiTextStyle
  ) {
    self.textTypescale = textTypescale
    self.smallTypescale = smallTypescale
  }
}

/// The sizes of prose: named fields for the core values, `extra` for what a design system added.
/// Read one with `sizes[key]`.
public struct TanreiProseSizes: Sendable, Equatable {
  public var medium: TanreiProseSizeTokens
  public var large: TanreiProseSizeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiProseSize: TanreiProseSizeTokens]

  public init(
    medium: TanreiProseSizeTokens,
    large: TanreiProseSizeTokens,
    extra: [TanreiProseSize: TanreiProseSizeTokens] = [:]
  ) {
    self.medium = medium
    self.large = large
    self.extra = extra
  }

  /// The tokens of one prose size, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiProseSize) -> TanreiProseSizeTokens? {
    switch key {
    case .medium: return medium
    case .large: return large
    default: return extra[key]
    }
  }

  /// Total lookup: a prose size this design system does not have reads the tokens of `medium`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiProseSize) -> TanreiProseSizeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no prose size \"\(key.rawValue)\"; using \"medium\"")
    return medium
  }

  /// Every prose size of this design system: the core ones, then what it added.
  public var keys: [TanreiProseSize] { TanreiProseSize.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Component tokens of prose (comp.prose).
public struct TanreiProseTokens: Sendable, Equatable {
  public var anchorGap: CGFloat
  public var blockGap: CGFloat
  public var heading1GapAfter: CGFloat
  public var heading1GapBefore: CGFloat
  public var heading2GapAfter: CGFloat
  public var heading2GapBefore: CGFloat
  public var heading3GapAfter: CGFloat
  public var heading3GapBefore: CGFloat
  public var heading4GapAfter: CGFloat
  public var heading4GapBefore: CGFloat
  public var heading5GapAfter: CGFloat
  public var heading5GapBefore: CGFloat
  public var heading6GapAfter: CGFloat
  public var heading6GapBefore: CGFloat
  public var itemGap: CGFloat
  public var leadTypescale: TanreiTextStyle
  public var listIndent: CGFloat
  public var measure: Double
  public var nestedGap: CGFloat
  public var quoteInset: CGFloat
  public var quoteLineColor: TanreiPaint
  public var quoteLineThickness: CGFloat
  public var ruleGap: CGFloat
  public var taskIconSize: CGFloat
  public var sizes: TanreiProseSizes

  public init(
    anchorGap: CGFloat,
    blockGap: CGFloat,
    heading1GapAfter: CGFloat,
    heading1GapBefore: CGFloat,
    heading2GapAfter: CGFloat,
    heading2GapBefore: CGFloat,
    heading3GapAfter: CGFloat,
    heading3GapBefore: CGFloat,
    heading4GapAfter: CGFloat,
    heading4GapBefore: CGFloat,
    heading5GapAfter: CGFloat,
    heading5GapBefore: CGFloat,
    heading6GapAfter: CGFloat,
    heading6GapBefore: CGFloat,
    itemGap: CGFloat,
    leadTypescale: TanreiTextStyle,
    listIndent: CGFloat,
    measure: Double,
    nestedGap: CGFloat,
    quoteInset: CGFloat,
    quoteLineColor: TanreiPaint,
    quoteLineThickness: CGFloat,
    ruleGap: CGFloat,
    taskIconSize: CGFloat,
    sizes: TanreiProseSizes
  ) {
    self.anchorGap = anchorGap
    self.blockGap = blockGap
    self.heading1GapAfter = heading1GapAfter
    self.heading1GapBefore = heading1GapBefore
    self.heading2GapAfter = heading2GapAfter
    self.heading2GapBefore = heading2GapBefore
    self.heading3GapAfter = heading3GapAfter
    self.heading3GapBefore = heading3GapBefore
    self.heading4GapAfter = heading4GapAfter
    self.heading4GapBefore = heading4GapBefore
    self.heading5GapAfter = heading5GapAfter
    self.heading5GapBefore = heading5GapBefore
    self.heading6GapAfter = heading6GapAfter
    self.heading6GapBefore = heading6GapBefore
    self.itemGap = itemGap
    self.leadTypescale = leadTypescale
    self.listIndent = listIndent
    self.measure = measure
    self.nestedGap = nestedGap
    self.quoteInset = quoteInset
    self.quoteLineColor = quoteLineColor
    self.quoteLineThickness = quoteLineThickness
    self.ruleGap = ruleGap
    self.taskIconSize = taskIconSize
    self.sizes = sizes
  }
}

/// A value of radio-button's `condition` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiRadioButtonCondition(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiRadioButtonCondition: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let unselected = TanreiRadioButtonCondition(rawValue: "unselected")
  public static let selected = TanreiRadioButtonCondition(rawValue: "selected")
  public static let errorUnselected = TanreiRadioButtonCondition(rawValue: "error-unselected")
  public static let errorSelected = TanreiRadioButtonCondition(rawValue: "error-selected")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiRadioButtonCondition] = [.unselected, .selected, .errorUnselected, .errorSelected]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiRadioButtonCondition.unselected
}

/// How one condition of radio-button is drawn in one state.
public struct TanreiRadioButtonConditionStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var ringColor: TanreiPaint
  public var fillColor: TanreiPaint
  public var labelColor: TanreiPaint
  public var stateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    ringColor: TanreiPaint,
    fillColor: TanreiPaint,
    labelColor: TanreiPaint,
    stateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.ringColor = ringColor
    self.fillColor = fillColor
    self.labelColor = labelColor
    self.stateLayerColor = stateLayerColor
  }
}

/// One condition of radio-button: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiRadioButtonConditionTokens: Sendable, Equatable {
  public var enabled: TanreiRadioButtonConditionStateTokens
  public var hovered: TanreiRadioButtonConditionStateTokens
  public var focused: TanreiRadioButtonConditionStateTokens
  public var pressed: TanreiRadioButtonConditionStateTokens
  public var disabled: TanreiRadioButtonConditionStateTokens

  public init(
    enabled: TanreiRadioButtonConditionStateTokens,
    hovered: TanreiRadioButtonConditionStateTokens,
    focused: TanreiRadioButtonConditionStateTokens,
    pressed: TanreiRadioButtonConditionStateTokens,
    disabled: TanreiRadioButtonConditionStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this condition of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiRadioButtonConditionStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The conditions of radio-button: named fields for the core values, `extra` for what a design system added.
/// Read one with `conditions[key]`.
public struct TanreiRadioButtonConditions: Sendable, Equatable {
  public var unselected: TanreiRadioButtonConditionTokens
  public var selected: TanreiRadioButtonConditionTokens
  public var errorUnselected: TanreiRadioButtonConditionTokens
  public var errorSelected: TanreiRadioButtonConditionTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiRadioButtonCondition: TanreiRadioButtonConditionTokens]

  public init(
    unselected: TanreiRadioButtonConditionTokens,
    selected: TanreiRadioButtonConditionTokens,
    errorUnselected: TanreiRadioButtonConditionTokens,
    errorSelected: TanreiRadioButtonConditionTokens,
    extra: [TanreiRadioButtonCondition: TanreiRadioButtonConditionTokens] = [:]
  ) {
    self.unselected = unselected
    self.selected = selected
    self.errorUnselected = errorUnselected
    self.errorSelected = errorSelected
    self.extra = extra
  }

  /// The tokens of one radio-button condition, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiRadioButtonCondition) -> TanreiRadioButtonConditionTokens? {
    switch key {
    case .unselected: return unselected
    case .selected: return selected
    case .errorUnselected: return errorUnselected
    case .errorSelected: return errorSelected
    default: return extra[key]
    }
  }

  /// Total lookup: a radio-button condition this design system does not have reads the tokens of `unselected`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiRadioButtonCondition) -> TanreiRadioButtonConditionTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no radio-button condition \"\(key.rawValue)\"; using \"unselected\"")
    return unselected
  }

  /// Every radio-button condition of this design system: the core ones, then what it added.
  public var keys: [TanreiRadioButtonCondition] { TanreiRadioButtonCondition.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of radio-button that depend on the state but not on the variant.
public struct TanreiRadioButtonStateTokens: Sendable, Equatable {
  public var containerShape: CGFloat
  public var opacity: Double

  public init(
    containerShape: CGFloat,
    opacity: Double
  ) {
    self.containerShape = containerShape
    self.opacity = opacity
  }
}

/// Component tokens of radio-button (comp.radio-button).
public struct TanreiRadioButtonTokens: Sendable, Equatable {
  public var containerShape: CGFloat
  public var containerSize: CGFloat
  public var fillInset: CGFloat
  public var fillOpacity: Double
  public var labelGap: CGFloat
  public var labelTypescale: TanreiTextStyle
  public var motionFeedbackDuration: Double
  public var motionSelectionDuration: Double
  public var motionSelectionEasing: TanreiCubicBezier
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var optionMinHeight: CGFloat
  public var ringSelectedWidthShare: Double
  public var ringSize: CGFloat
  public var ringWidth: CGFloat
  public var conditions: TanreiRadioButtonConditions
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiRadioButtonStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiRadioButtonStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiRadioButtonStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiRadioButtonStateTokens

  public init(
    containerShape: CGFloat,
    containerSize: CGFloat,
    fillInset: CGFloat,
    fillOpacity: Double,
    labelGap: CGFloat,
    labelTypescale: TanreiTextStyle,
    motionFeedbackDuration: Double,
    motionSelectionDuration: Double,
    motionSelectionEasing: TanreiCubicBezier,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    optionMinHeight: CGFloat,
    ringSelectedWidthShare: Double,
    ringSize: CGFloat,
    ringWidth: CGFloat,
    conditions: TanreiRadioButtonConditions,
    hovered: TanreiRadioButtonStateTokens,
    focused: TanreiRadioButtonStateTokens,
    pressed: TanreiRadioButtonStateTokens,
    disabled: TanreiRadioButtonStateTokens
  ) {
    self.containerShape = containerShape
    self.containerSize = containerSize
    self.fillInset = fillInset
    self.fillOpacity = fillOpacity
    self.labelGap = labelGap
    self.labelTypescale = labelTypescale
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionSelectionDuration = motionSelectionDuration
    self.motionSelectionEasing = motionSelectionEasing
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.optionMinHeight = optionMinHeight
    self.ringSelectedWidthShare = ringSelectedWidthShare
    self.ringSize = ringSize
    self.ringWidth = ringWidth
    self.conditions = conditions
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which radio-button has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiRadioButtonStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// A value of search's `condition` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiSearchCondition(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiSearchCondition: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let standard = TanreiSearchCondition(rawValue: "standard")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiSearchCondition] = [.standard]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiSearchCondition.standard
}

/// How one condition of search is drawn in one state.
public struct TanreiSearchConditionStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var containerElevation: [TanreiShadowLayer]
  public var outlineColor: TanreiPaint
  public var leadingIconColor: TanreiPaint
  public var inputColor: TanreiPaint
  public var placeholderColor: TanreiPaint
  public var caretColor: TanreiPaint
  public var stateLayerColor: TanreiPaint
  public var suggestionContainerColor: TanreiPaint
  public var suggestionLeadingIconColor: TanreiPaint
  public var suggestionHeadlineColor: TanreiPaint
  public var suggestionSupportingTextColor: TanreiPaint
  public var suggestionStateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    containerElevation: [TanreiShadowLayer],
    outlineColor: TanreiPaint,
    leadingIconColor: TanreiPaint,
    inputColor: TanreiPaint,
    placeholderColor: TanreiPaint,
    caretColor: TanreiPaint,
    stateLayerColor: TanreiPaint,
    suggestionContainerColor: TanreiPaint,
    suggestionLeadingIconColor: TanreiPaint,
    suggestionHeadlineColor: TanreiPaint,
    suggestionSupportingTextColor: TanreiPaint,
    suggestionStateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.containerElevation = containerElevation
    self.outlineColor = outlineColor
    self.leadingIconColor = leadingIconColor
    self.inputColor = inputColor
    self.placeholderColor = placeholderColor
    self.caretColor = caretColor
    self.stateLayerColor = stateLayerColor
    self.suggestionContainerColor = suggestionContainerColor
    self.suggestionLeadingIconColor = suggestionLeadingIconColor
    self.suggestionHeadlineColor = suggestionHeadlineColor
    self.suggestionSupportingTextColor = suggestionSupportingTextColor
    self.suggestionStateLayerColor = suggestionStateLayerColor
  }
}

/// One condition of search: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiSearchConditionTokens: Sendable, Equatable {
  public var enabled: TanreiSearchConditionStateTokens
  public var hovered: TanreiSearchConditionStateTokens
  public var focused: TanreiSearchConditionStateTokens
  public var pressed: TanreiSearchConditionStateTokens
  public var disabled: TanreiSearchConditionStateTokens

  public init(
    enabled: TanreiSearchConditionStateTokens,
    hovered: TanreiSearchConditionStateTokens,
    focused: TanreiSearchConditionStateTokens,
    pressed: TanreiSearchConditionStateTokens,
    disabled: TanreiSearchConditionStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this condition of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiSearchConditionStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The conditions of search: named fields for the core values, `extra` for what a design system added.
/// Read one with `conditions[key]`.
public struct TanreiSearchConditions: Sendable, Equatable {
  public var standard: TanreiSearchConditionTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiSearchCondition: TanreiSearchConditionTokens]

  public init(
    standard: TanreiSearchConditionTokens,
    extra: [TanreiSearchCondition: TanreiSearchConditionTokens] = [:]
  ) {
    self.standard = standard
    self.extra = extra
  }

  /// The tokens of one search condition, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiSearchCondition) -> TanreiSearchConditionTokens? {
    switch key {
    case .standard: return standard
    default: return extra[key]
    }
  }

  /// Total lookup: a search condition this design system does not have reads the tokens of `standard`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiSearchCondition) -> TanreiSearchConditionTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no search condition \"\(key.rawValue)\"; using \"standard\"")
    return standard
  }

  /// Every search condition of this design system: the core ones, then what it added.
  public var keys: [TanreiSearchCondition] { TanreiSearchCondition.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of search that depend on the state but not on the variant.
public struct TanreiSearchStateTokens: Sendable, Equatable {
  public var opacity: Double
  public var outlineWidth: CGFloat

  public init(
    opacity: Double,
    outlineWidth: CGFloat
  ) {
    self.opacity = opacity
    self.outlineWidth = outlineWidth
  }
}

/// Component tokens of search (comp.search).
public struct TanreiSearchTokens: Sendable, Equatable {
  public var containerButtonGap: CGFloat
  public var containerGap: CGFloat
  public var containerHeight: CGFloat
  public var containerPaddingInline: CGFloat
  public var containerPaddingInlineWithButton: CGFloat
  public var containerShape: CGFloat
  public var dividerColor: TanreiPaint
  public var dividerThickness: CGFloat
  public var groupTitleColor: TanreiPaint
  public var groupTitleTypescale: TanreiTextStyle
  public var groupGap: CGFloat
  public var groupIndent: CGFloat
  public var headerHeight: CGFloat
  public var headerPaddingInline: CGFloat
  public var inputTypescale: TanreiTextStyle
  public var leadingIconSize: CGFloat
  public var motionCloseDuration: Double
  public var motionCloseEasing: TanreiCubicBezier
  public var motionFeedbackDuration: Double
  public var motionOpenDuration: Double
  public var motionOpenEasing: TanreiCubicBezier
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var outlineWidth: CGFloat
  public var resultMarkColor: TanreiPaint
  public var resultMarkContainerColor: TanreiPaint
  public var resultMarkEmphasis: Double
  public var shortcutColor: TanreiPaint
  public var shortcutTypescale: TanreiTextStyle
  public var statusColor: TanreiPaint
  public var statusErrorColor: TanreiPaint
  public var statusTypescale: TanreiTextStyle
  public var suggestionContainerGap: CGFloat
  public var suggestionContainerHeight: CGFloat
  public var suggestionContainerPaddingBlock: CGFloat
  public var suggestionContainerPaddingInline: CGFloat
  public var suggestionContainerShape: CGFloat
  public var suggestionHeadlineTypescale: TanreiTextStyle
  public var suggestionLeadingIconSize: CGFloat
  public var suggestionSupportingTextTypescale: TanreiTextStyle
  public var triggerContainerGap: CGFloat
  public var triggerContainerHeight: CGFloat
  public var triggerContainerPaddingInline: CGFloat
  public var triggerLabelTypescale: TanreiTextStyle
  public var triggerLeadingIconSize: CGFloat
  public var viewContainerColor: TanreiPaint
  public var viewContainerElevation: [TanreiShadowLayer]
  public var viewContainerShape: CGFloat
  public var viewDialogMaxWidth: CGFloat
  public var viewDialogOffset: CGFloat
  public var viewOffset: CGFloat
  public var viewPaddingBlock: CGFloat
  public var viewPaddingInline: CGFloat
  public var viewScrimColor: TanreiPaint
  public var viewViewportMargin: CGFloat
  public var conditions: TanreiSearchConditions
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiSearchStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiSearchStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiSearchStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiSearchStateTokens

  public init(
    containerButtonGap: CGFloat,
    containerGap: CGFloat,
    containerHeight: CGFloat,
    containerPaddingInline: CGFloat,
    containerPaddingInlineWithButton: CGFloat,
    containerShape: CGFloat,
    dividerColor: TanreiPaint,
    dividerThickness: CGFloat,
    groupTitleColor: TanreiPaint,
    groupTitleTypescale: TanreiTextStyle,
    groupGap: CGFloat,
    groupIndent: CGFloat,
    headerHeight: CGFloat,
    headerPaddingInline: CGFloat,
    inputTypescale: TanreiTextStyle,
    leadingIconSize: CGFloat,
    motionCloseDuration: Double,
    motionCloseEasing: TanreiCubicBezier,
    motionFeedbackDuration: Double,
    motionOpenDuration: Double,
    motionOpenEasing: TanreiCubicBezier,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    outlineWidth: CGFloat,
    resultMarkColor: TanreiPaint,
    resultMarkContainerColor: TanreiPaint,
    resultMarkEmphasis: Double,
    shortcutColor: TanreiPaint,
    shortcutTypescale: TanreiTextStyle,
    statusColor: TanreiPaint,
    statusErrorColor: TanreiPaint,
    statusTypescale: TanreiTextStyle,
    suggestionContainerGap: CGFloat,
    suggestionContainerHeight: CGFloat,
    suggestionContainerPaddingBlock: CGFloat,
    suggestionContainerPaddingInline: CGFloat,
    suggestionContainerShape: CGFloat,
    suggestionHeadlineTypescale: TanreiTextStyle,
    suggestionLeadingIconSize: CGFloat,
    suggestionSupportingTextTypescale: TanreiTextStyle,
    triggerContainerGap: CGFloat,
    triggerContainerHeight: CGFloat,
    triggerContainerPaddingInline: CGFloat,
    triggerLabelTypescale: TanreiTextStyle,
    triggerLeadingIconSize: CGFloat,
    viewContainerColor: TanreiPaint,
    viewContainerElevation: [TanreiShadowLayer],
    viewContainerShape: CGFloat,
    viewDialogMaxWidth: CGFloat,
    viewDialogOffset: CGFloat,
    viewOffset: CGFloat,
    viewPaddingBlock: CGFloat,
    viewPaddingInline: CGFloat,
    viewScrimColor: TanreiPaint,
    viewViewportMargin: CGFloat,
    conditions: TanreiSearchConditions,
    hovered: TanreiSearchStateTokens,
    focused: TanreiSearchStateTokens,
    pressed: TanreiSearchStateTokens,
    disabled: TanreiSearchStateTokens
  ) {
    self.containerButtonGap = containerButtonGap
    self.containerGap = containerGap
    self.containerHeight = containerHeight
    self.containerPaddingInline = containerPaddingInline
    self.containerPaddingInlineWithButton = containerPaddingInlineWithButton
    self.containerShape = containerShape
    self.dividerColor = dividerColor
    self.dividerThickness = dividerThickness
    self.groupTitleColor = groupTitleColor
    self.groupTitleTypescale = groupTitleTypescale
    self.groupGap = groupGap
    self.groupIndent = groupIndent
    self.headerHeight = headerHeight
    self.headerPaddingInline = headerPaddingInline
    self.inputTypescale = inputTypescale
    self.leadingIconSize = leadingIconSize
    self.motionCloseDuration = motionCloseDuration
    self.motionCloseEasing = motionCloseEasing
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionOpenDuration = motionOpenDuration
    self.motionOpenEasing = motionOpenEasing
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.outlineWidth = outlineWidth
    self.resultMarkColor = resultMarkColor
    self.resultMarkContainerColor = resultMarkContainerColor
    self.resultMarkEmphasis = resultMarkEmphasis
    self.shortcutColor = shortcutColor
    self.shortcutTypescale = shortcutTypescale
    self.statusColor = statusColor
    self.statusErrorColor = statusErrorColor
    self.statusTypescale = statusTypescale
    self.suggestionContainerGap = suggestionContainerGap
    self.suggestionContainerHeight = suggestionContainerHeight
    self.suggestionContainerPaddingBlock = suggestionContainerPaddingBlock
    self.suggestionContainerPaddingInline = suggestionContainerPaddingInline
    self.suggestionContainerShape = suggestionContainerShape
    self.suggestionHeadlineTypescale = suggestionHeadlineTypescale
    self.suggestionLeadingIconSize = suggestionLeadingIconSize
    self.suggestionSupportingTextTypescale = suggestionSupportingTextTypescale
    self.triggerContainerGap = triggerContainerGap
    self.triggerContainerHeight = triggerContainerHeight
    self.triggerContainerPaddingInline = triggerContainerPaddingInline
    self.triggerLabelTypescale = triggerLabelTypescale
    self.triggerLeadingIconSize = triggerLeadingIconSize
    self.viewContainerColor = viewContainerColor
    self.viewContainerElevation = viewContainerElevation
    self.viewContainerShape = viewContainerShape
    self.viewDialogMaxWidth = viewDialogMaxWidth
    self.viewDialogOffset = viewDialogOffset
    self.viewOffset = viewOffset
    self.viewPaddingBlock = viewPaddingBlock
    self.viewPaddingInline = viewPaddingInline
    self.viewScrimColor = viewScrimColor
    self.viewViewportMargin = viewViewportMargin
    self.conditions = conditions
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which search has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiSearchStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// A value of segmented-button's `size` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiSegmentedButtonSize(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiSegmentedButtonSize: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let small = TanreiSegmentedButtonSize(rawValue: "small")
  public static let medium = TanreiSegmentedButtonSize(rawValue: "medium")
  public static let large = TanreiSegmentedButtonSize(rawValue: "large")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiSegmentedButtonSize] = [.small, .medium, .large]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiSegmentedButtonSize.medium
}

/// Everything of segmented-button that depends on its size.
public struct TanreiSegmentedButtonSizeTokens: Sendable, Equatable {
  public var containerHeight: CGFloat
  public var containerPaddingInline: CGFloat
  public var containerPaddingBlock: CGFloat
  public var containerGap: CGFloat
  public var labelTypescale: TanreiTextStyle
  public var iconSize: CGFloat
  public var checkSize: CGFloat

  public init(
    containerHeight: CGFloat,
    containerPaddingInline: CGFloat,
    containerPaddingBlock: CGFloat,
    containerGap: CGFloat,
    labelTypescale: TanreiTextStyle,
    iconSize: CGFloat,
    checkSize: CGFloat
  ) {
    self.containerHeight = containerHeight
    self.containerPaddingInline = containerPaddingInline
    self.containerPaddingBlock = containerPaddingBlock
    self.containerGap = containerGap
    self.labelTypescale = labelTypescale
    self.iconSize = iconSize
    self.checkSize = checkSize
  }
}

/// The sizes of segmented-button: named fields for the core values, `extra` for what a design system added.
/// Read one with `sizes[key]`.
public struct TanreiSegmentedButtonSizes: Sendable, Equatable {
  public var small: TanreiSegmentedButtonSizeTokens
  public var medium: TanreiSegmentedButtonSizeTokens
  public var large: TanreiSegmentedButtonSizeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiSegmentedButtonSize: TanreiSegmentedButtonSizeTokens]

  public init(
    small: TanreiSegmentedButtonSizeTokens,
    medium: TanreiSegmentedButtonSizeTokens,
    large: TanreiSegmentedButtonSizeTokens,
    extra: [TanreiSegmentedButtonSize: TanreiSegmentedButtonSizeTokens] = [:]
  ) {
    self.small = small
    self.medium = medium
    self.large = large
    self.extra = extra
  }

  /// The tokens of one segmented-button size, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiSegmentedButtonSize) -> TanreiSegmentedButtonSizeTokens? {
    switch key {
    case .small: return small
    case .medium: return medium
    case .large: return large
    default: return extra[key]
    }
  }

  /// Total lookup: a segmented-button size this design system does not have reads the tokens of `medium`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiSegmentedButtonSize) -> TanreiSegmentedButtonSizeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no segmented-button size \"\(key.rawValue)\"; using \"medium\"")
    return medium
  }

  /// Every segmented-button size of this design system: the core ones, then what it added.
  public var keys: [TanreiSegmentedButtonSize] { TanreiSegmentedButtonSize.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of segmented-button's `condition` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiSegmentedButtonCondition(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiSegmentedButtonCondition: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let unselected = TanreiSegmentedButtonCondition(rawValue: "unselected")
  public static let selected = TanreiSegmentedButtonCondition(rawValue: "selected")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiSegmentedButtonCondition] = [.unselected, .selected]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiSegmentedButtonCondition.unselected
}

/// How one condition of segmented-button is drawn in one state.
public struct TanreiSegmentedButtonConditionStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var containerElevation: [TanreiShadowLayer]
  public var labelColor: TanreiPaint
  public var iconColor: TanreiPaint
  public var stateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    containerElevation: [TanreiShadowLayer],
    labelColor: TanreiPaint,
    iconColor: TanreiPaint,
    stateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.containerElevation = containerElevation
    self.labelColor = labelColor
    self.iconColor = iconColor
    self.stateLayerColor = stateLayerColor
  }
}

/// One condition of segmented-button: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiSegmentedButtonConditionTokens: Sendable, Equatable {
  public var enabled: TanreiSegmentedButtonConditionStateTokens
  public var hovered: TanreiSegmentedButtonConditionStateTokens
  public var focused: TanreiSegmentedButtonConditionStateTokens
  public var pressed: TanreiSegmentedButtonConditionStateTokens
  public var disabled: TanreiSegmentedButtonConditionStateTokens

  public init(
    enabled: TanreiSegmentedButtonConditionStateTokens,
    hovered: TanreiSegmentedButtonConditionStateTokens,
    focused: TanreiSegmentedButtonConditionStateTokens,
    pressed: TanreiSegmentedButtonConditionStateTokens,
    disabled: TanreiSegmentedButtonConditionStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this condition of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiSegmentedButtonConditionStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The conditions of segmented-button: named fields for the core values, `extra` for what a design system added.
/// Read one with `conditions[key]`.
public struct TanreiSegmentedButtonConditions: Sendable, Equatable {
  public var unselected: TanreiSegmentedButtonConditionTokens
  public var selected: TanreiSegmentedButtonConditionTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiSegmentedButtonCondition: TanreiSegmentedButtonConditionTokens]

  public init(
    unselected: TanreiSegmentedButtonConditionTokens,
    selected: TanreiSegmentedButtonConditionTokens,
    extra: [TanreiSegmentedButtonCondition: TanreiSegmentedButtonConditionTokens] = [:]
  ) {
    self.unselected = unselected
    self.selected = selected
    self.extra = extra
  }

  /// The tokens of one segmented-button condition, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiSegmentedButtonCondition) -> TanreiSegmentedButtonConditionTokens? {
    switch key {
    case .unselected: return unselected
    case .selected: return selected
    default: return extra[key]
    }
  }

  /// Total lookup: a segmented-button condition this design system does not have reads the tokens of `unselected`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiSegmentedButtonCondition) -> TanreiSegmentedButtonConditionTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no segmented-button condition \"\(key.rawValue)\"; using \"unselected\"")
    return unselected
  }

  /// Every segmented-button condition of this design system: the core ones, then what it added.
  public var keys: [TanreiSegmentedButtonCondition] { TanreiSegmentedButtonCondition.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of segmented-button that depend on the state but not on the variant.
public struct TanreiSegmentedButtonStateTokens: Sendable, Equatable {
  public var containerShape: CGFloat
  public var opacity: Double

  public init(
    containerShape: CGFloat,
    opacity: Double
  ) {
    self.containerShape = containerShape
    self.opacity = opacity
  }
}

/// Component tokens of segmented-button (comp.segmented-button).
public struct TanreiSegmentedButtonTokens: Sendable, Equatable {
  public var containerShape: CGFloat
  public var dividerColor: TanreiPaint
  public var dividerWidth: CGFloat
  public var motionFeedbackDuration: Double
  public var motionSelectionDuration: Double
  public var motionSelectionEasing: TanreiCubicBezier
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var outlineColor: TanreiPaint
  public var outlineWidth: CGFloat
  public var setColor: TanreiPaint
  public var setPadding: CGFloat
  public var setShape: CGFloat
  public var sizes: TanreiSegmentedButtonSizes
  public var conditions: TanreiSegmentedButtonConditions
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiSegmentedButtonStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiSegmentedButtonStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiSegmentedButtonStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiSegmentedButtonStateTokens

  public init(
    containerShape: CGFloat,
    dividerColor: TanreiPaint,
    dividerWidth: CGFloat,
    motionFeedbackDuration: Double,
    motionSelectionDuration: Double,
    motionSelectionEasing: TanreiCubicBezier,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    outlineColor: TanreiPaint,
    outlineWidth: CGFloat,
    setColor: TanreiPaint,
    setPadding: CGFloat,
    setShape: CGFloat,
    sizes: TanreiSegmentedButtonSizes,
    conditions: TanreiSegmentedButtonConditions,
    hovered: TanreiSegmentedButtonStateTokens,
    focused: TanreiSegmentedButtonStateTokens,
    pressed: TanreiSegmentedButtonStateTokens,
    disabled: TanreiSegmentedButtonStateTokens
  ) {
    self.containerShape = containerShape
    self.dividerColor = dividerColor
    self.dividerWidth = dividerWidth
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionSelectionDuration = motionSelectionDuration
    self.motionSelectionEasing = motionSelectionEasing
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.outlineColor = outlineColor
    self.outlineWidth = outlineWidth
    self.setColor = setColor
    self.setPadding = setPadding
    self.setShape = setShape
    self.sizes = sizes
    self.conditions = conditions
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which segmented-button has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiSegmentedButtonStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// A value of select's `variant` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiSelectVariant(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiSelectVariant: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let stacked = TanreiSelectVariant(rawValue: "stacked")
  public static let filled = TanreiSelectVariant(rawValue: "filled")
  public static let outlined = TanreiSelectVariant(rawValue: "outlined")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiSelectVariant] = [.stacked, .filled, .outlined]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiSelectVariant.stacked
}

/// How one variant of select is drawn in one state.
public struct TanreiSelectVariantStateTokens: Sendable, Equatable {
  public var optionContainerColor: TanreiPaint
  public var optionLabelColor: TanreiPaint
  public var optionSupportingTextColor: TanreiPaint
  public var optionLeadingIconColor: TanreiPaint
  public var optionStateLayerColor: TanreiPaint
  public var selectedOptionContainerColor: TanreiPaint
  public var selectedOptionLabelColor: TanreiPaint
  public var selectedOptionSupportingTextColor: TanreiPaint
  public var selectedOptionLeadingIconColor: TanreiPaint
  public var selectedOptionMarkColor: TanreiPaint
  public var selectedOptionStateLayerColor: TanreiPaint

  public init(
    optionContainerColor: TanreiPaint,
    optionLabelColor: TanreiPaint,
    optionSupportingTextColor: TanreiPaint,
    optionLeadingIconColor: TanreiPaint,
    optionStateLayerColor: TanreiPaint,
    selectedOptionContainerColor: TanreiPaint,
    selectedOptionLabelColor: TanreiPaint,
    selectedOptionSupportingTextColor: TanreiPaint,
    selectedOptionLeadingIconColor: TanreiPaint,
    selectedOptionMarkColor: TanreiPaint,
    selectedOptionStateLayerColor: TanreiPaint
  ) {
    self.optionContainerColor = optionContainerColor
    self.optionLabelColor = optionLabelColor
    self.optionSupportingTextColor = optionSupportingTextColor
    self.optionLeadingIconColor = optionLeadingIconColor
    self.optionStateLayerColor = optionStateLayerColor
    self.selectedOptionContainerColor = selectedOptionContainerColor
    self.selectedOptionLabelColor = selectedOptionLabelColor
    self.selectedOptionSupportingTextColor = selectedOptionSupportingTextColor
    self.selectedOptionLeadingIconColor = selectedOptionLeadingIconColor
    self.selectedOptionMarkColor = selectedOptionMarkColor
    self.selectedOptionStateLayerColor = selectedOptionStateLayerColor
  }
}

/// One variant of select: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiSelectVariantTokens: Sendable, Equatable {
  public var enabled: TanreiSelectVariantStateTokens
  public var hovered: TanreiSelectVariantStateTokens
  public var focused: TanreiSelectVariantStateTokens
  public var pressed: TanreiSelectVariantStateTokens
  public var disabled: TanreiSelectVariantStateTokens

  public init(
    enabled: TanreiSelectVariantStateTokens,
    hovered: TanreiSelectVariantStateTokens,
    focused: TanreiSelectVariantStateTokens,
    pressed: TanreiSelectVariantStateTokens,
    disabled: TanreiSelectVariantStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiSelectVariantStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The variants of select: named fields for the core values, `extra` for what a design system added.
/// Read one with `variants[key]`.
public struct TanreiSelectVariants: Sendable, Equatable {
  public var stacked: TanreiSelectVariantTokens
  public var filled: TanreiSelectVariantTokens
  public var outlined: TanreiSelectVariantTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiSelectVariant: TanreiSelectVariantTokens]

  public init(
    stacked: TanreiSelectVariantTokens,
    filled: TanreiSelectVariantTokens,
    outlined: TanreiSelectVariantTokens,
    extra: [TanreiSelectVariant: TanreiSelectVariantTokens] = [:]
  ) {
    self.stacked = stacked
    self.filled = filled
    self.outlined = outlined
    self.extra = extra
  }

  /// The tokens of one select variant, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiSelectVariant) -> TanreiSelectVariantTokens? {
    switch key {
    case .stacked: return stacked
    case .filled: return filled
    case .outlined: return outlined
    default: return extra[key]
    }
  }

  /// Total lookup: a select variant this design system does not have reads the tokens of `stacked`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiSelectVariant) -> TanreiSelectVariantTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no select variant \"\(key.rawValue)\"; using \"stacked\"")
    return stacked
  }

  /// Every select variant of this design system: the core ones, then what it added.
  public var keys: [TanreiSelectVariant] { TanreiSelectVariant.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of select that depend on the state but not on the variant.
public struct TanreiSelectStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of select (comp.select).
public struct TanreiSelectTokens: Sendable, Equatable {
  public var dividerColor: TanreiPaint
  public var dividerSpace: CGFloat
  public var dividerThickness: CGFloat
  public var groupTitleColor: TanreiPaint
  public var groupTitlePaddingInline: CGFloat
  public var groupTitleTypescale: TanreiTextStyle
  public var groupGap: CGFloat
  public var listColor: TanreiPaint
  public var listElevation: [TanreiShadowLayer]
  public var listMaxHeight: CGFloat
  public var listMinWidth: CGFloat
  public var listOffset: CGFloat
  public var listPaddingBlock: CGFloat
  public var listPaddingInline: CGFloat
  public var listShape: CGFloat
  public var listViewportMargin: CGFloat
  public var motionCloseDuration: Double
  public var motionCloseEasing: TanreiCubicBezier
  public var motionFeedbackDuration: Double
  public var motionOpenDuration: Double
  public var motionOpenEasing: TanreiCubicBezier
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var optionGap: CGFloat
  public var optionHeight: CGFloat
  public var optionLabelTypescale: TanreiTextStyle
  public var optionLeadingIconSize: CGFloat
  public var optionMarkSize: CGFloat
  public var optionPaddingBlock: CGFloat
  public var optionPaddingInline: CGFloat
  public var optionShape: CGFloat
  public var optionSupportingTextTypescale: TanreiTextStyle
  public var separation: Double
  public var variants: TanreiSelectVariants
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiSelectStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiSelectStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiSelectStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiSelectStateTokens

  public init(
    dividerColor: TanreiPaint,
    dividerSpace: CGFloat,
    dividerThickness: CGFloat,
    groupTitleColor: TanreiPaint,
    groupTitlePaddingInline: CGFloat,
    groupTitleTypescale: TanreiTextStyle,
    groupGap: CGFloat,
    listColor: TanreiPaint,
    listElevation: [TanreiShadowLayer],
    listMaxHeight: CGFloat,
    listMinWidth: CGFloat,
    listOffset: CGFloat,
    listPaddingBlock: CGFloat,
    listPaddingInline: CGFloat,
    listShape: CGFloat,
    listViewportMargin: CGFloat,
    motionCloseDuration: Double,
    motionCloseEasing: TanreiCubicBezier,
    motionFeedbackDuration: Double,
    motionOpenDuration: Double,
    motionOpenEasing: TanreiCubicBezier,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    optionGap: CGFloat,
    optionHeight: CGFloat,
    optionLabelTypescale: TanreiTextStyle,
    optionLeadingIconSize: CGFloat,
    optionMarkSize: CGFloat,
    optionPaddingBlock: CGFloat,
    optionPaddingInline: CGFloat,
    optionShape: CGFloat,
    optionSupportingTextTypescale: TanreiTextStyle,
    separation: Double,
    variants: TanreiSelectVariants,
    hovered: TanreiSelectStateTokens,
    focused: TanreiSelectStateTokens,
    pressed: TanreiSelectStateTokens,
    disabled: TanreiSelectStateTokens
  ) {
    self.dividerColor = dividerColor
    self.dividerSpace = dividerSpace
    self.dividerThickness = dividerThickness
    self.groupTitleColor = groupTitleColor
    self.groupTitlePaddingInline = groupTitlePaddingInline
    self.groupTitleTypescale = groupTitleTypescale
    self.groupGap = groupGap
    self.listColor = listColor
    self.listElevation = listElevation
    self.listMaxHeight = listMaxHeight
    self.listMinWidth = listMinWidth
    self.listOffset = listOffset
    self.listPaddingBlock = listPaddingBlock
    self.listPaddingInline = listPaddingInline
    self.listShape = listShape
    self.listViewportMargin = listViewportMargin
    self.motionCloseDuration = motionCloseDuration
    self.motionCloseEasing = motionCloseEasing
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionOpenDuration = motionOpenDuration
    self.motionOpenEasing = motionOpenEasing
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.optionGap = optionGap
    self.optionHeight = optionHeight
    self.optionLabelTypescale = optionLabelTypescale
    self.optionLeadingIconSize = optionLeadingIconSize
    self.optionMarkSize = optionMarkSize
    self.optionPaddingBlock = optionPaddingBlock
    self.optionPaddingInline = optionPaddingInline
    self.optionShape = optionShape
    self.optionSupportingTextTypescale = optionSupportingTextTypescale
    self.separation = separation
    self.variants = variants
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which select has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiSelectStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// A value of side-sheet's `variant` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiSideSheetVariant(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiSideSheetVariant: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let standard = TanreiSideSheetVariant(rawValue: "standard")
  public static let modal = TanreiSideSheetVariant(rawValue: "modal")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiSideSheetVariant] = [.standard, .modal]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiSideSheetVariant.standard
}

/// Everything of side-sheet that depends on its variant.
public struct TanreiSideSheetVariantTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var containerElevation: [TanreiShadowLayer]
  public var containerShape: CGFloat
  public var outlineColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    containerElevation: [TanreiShadowLayer],
    containerShape: CGFloat,
    outlineColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.containerElevation = containerElevation
    self.containerShape = containerShape
    self.outlineColor = outlineColor
  }
}

/// The variants of side-sheet: named fields for the core values, `extra` for what a design system added.
/// Read one with `variants[key]`.
public struct TanreiSideSheetVariants: Sendable, Equatable {
  public var standard: TanreiSideSheetVariantTokens
  public var modal: TanreiSideSheetVariantTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiSideSheetVariant: TanreiSideSheetVariantTokens]

  public init(
    standard: TanreiSideSheetVariantTokens,
    modal: TanreiSideSheetVariantTokens,
    extra: [TanreiSideSheetVariant: TanreiSideSheetVariantTokens] = [:]
  ) {
    self.standard = standard
    self.modal = modal
    self.extra = extra
  }

  /// The tokens of one side-sheet variant, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiSideSheetVariant) -> TanreiSideSheetVariantTokens? {
    switch key {
    case .standard: return standard
    case .modal: return modal
    default: return extra[key]
    }
  }

  /// Total lookup: a side-sheet variant this design system does not have reads the tokens of `standard`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiSideSheetVariant) -> TanreiSideSheetVariantTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no side-sheet variant \"\(key.rawValue)\"; using \"standard\"")
    return standard
  }

  /// Every side-sheet variant of this design system: the core ones, then what it added.
  public var keys: [TanreiSideSheetVariant] { TanreiSideSheetVariant.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Component tokens of side-sheet (comp.side-sheet).
public struct TanreiSideSheetTokens: Sendable, Equatable {
  public var actionsArrangement: Double
  public var actionsGap: CGFloat
  public var actionsPaddingBlock: CGFloat
  public var actionsVariant: Double
  public var closeButtonVariant: Double
  public var containerPaddingBlock: CGFloat
  public var containerPaddingInline: CGFloat
  public var containerWidth: CGFloat
  public var contentColor: TanreiPaint
  public var dividerColor: TanreiPaint
  public var dividerWidth: CGFloat
  public var headerGap: CGFloat
  public var headerHeight: CGFloat
  public var headerPaddingInlineEnd: CGFloat
  public var headlineColor: TanreiPaint
  public var headlineTypescale: TanreiTextStyle
  public var motionEnterDuration: Double
  public var motionEnterEasing: TanreiCubicBezier
  public var motionExitDuration: Double
  public var motionExitEasing: TanreiCubicBezier
  public var outlineWidth: CGFloat
  public var scrimColor: TanreiPaint
  public var variants: TanreiSideSheetVariants

  public init(
    actionsArrangement: Double,
    actionsGap: CGFloat,
    actionsPaddingBlock: CGFloat,
    actionsVariant: Double,
    closeButtonVariant: Double,
    containerPaddingBlock: CGFloat,
    containerPaddingInline: CGFloat,
    containerWidth: CGFloat,
    contentColor: TanreiPaint,
    dividerColor: TanreiPaint,
    dividerWidth: CGFloat,
    headerGap: CGFloat,
    headerHeight: CGFloat,
    headerPaddingInlineEnd: CGFloat,
    headlineColor: TanreiPaint,
    headlineTypescale: TanreiTextStyle,
    motionEnterDuration: Double,
    motionEnterEasing: TanreiCubicBezier,
    motionExitDuration: Double,
    motionExitEasing: TanreiCubicBezier,
    outlineWidth: CGFloat,
    scrimColor: TanreiPaint,
    variants: TanreiSideSheetVariants
  ) {
    self.actionsArrangement = actionsArrangement
    self.actionsGap = actionsGap
    self.actionsPaddingBlock = actionsPaddingBlock
    self.actionsVariant = actionsVariant
    self.closeButtonVariant = closeButtonVariant
    self.containerPaddingBlock = containerPaddingBlock
    self.containerPaddingInline = containerPaddingInline
    self.containerWidth = containerWidth
    self.contentColor = contentColor
    self.dividerColor = dividerColor
    self.dividerWidth = dividerWidth
    self.headerGap = headerGap
    self.headerHeight = headerHeight
    self.headerPaddingInlineEnd = headerPaddingInlineEnd
    self.headlineColor = headlineColor
    self.headlineTypescale = headlineTypescale
    self.motionEnterDuration = motionEnterDuration
    self.motionEnterEasing = motionEnterEasing
    self.motionExitDuration = motionExitDuration
    self.motionExitEasing = motionExitEasing
    self.outlineWidth = outlineWidth
    self.scrimColor = scrimColor
    self.variants = variants
  }
}

/// Component tokens of skeleton (comp.skeleton).
public struct TanreiSkeletonTokens: Sendable, Equatable {
  public var containerGap: CGFloat
  public var motionAnimation: Double
  public var motionDimDuration: Double
  public var motionDimEasing: TanreiCubicBezier
  public var motionShowDelay: Double
  public var placeholderColor: TanreiPaint
  public var placeholderDimOpacity: Double
  public var placeholderLastLineInlineSize: Double
  public var placeholderShapeBlock: CGFloat
  public var placeholderShapeCircle: CGFloat
  public var placeholderShapeText: CGFloat

  public init(
    containerGap: CGFloat,
    motionAnimation: Double,
    motionDimDuration: Double,
    motionDimEasing: TanreiCubicBezier,
    motionShowDelay: Double,
    placeholderColor: TanreiPaint,
    placeholderDimOpacity: Double,
    placeholderLastLineInlineSize: Double,
    placeholderShapeBlock: CGFloat,
    placeholderShapeCircle: CGFloat,
    placeholderShapeText: CGFloat
  ) {
    self.containerGap = containerGap
    self.motionAnimation = motionAnimation
    self.motionDimDuration = motionDimDuration
    self.motionDimEasing = motionDimEasing
    self.motionShowDelay = motionShowDelay
    self.placeholderColor = placeholderColor
    self.placeholderDimOpacity = placeholderDimOpacity
    self.placeholderLastLineInlineSize = placeholderLastLineInlineSize
    self.placeholderShapeBlock = placeholderShapeBlock
    self.placeholderShapeCircle = placeholderShapeCircle
    self.placeholderShapeText = placeholderShapeText
  }
}

/// A value of slider's `size` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiSliderSize(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiSliderSize: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let small = TanreiSliderSize(rawValue: "small")
  public static let medium = TanreiSliderSize(rawValue: "medium")
  public static let large = TanreiSliderSize(rawValue: "large")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiSliderSize] = [.small, .medium, .large]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiSliderSize.small
}

/// Everything of slider that depends on its size.
public struct TanreiSliderSizeTokens: Sendable, Equatable {
  public var trackThickness: CGFloat
  public var trackShape: CGFloat
  public var handleHeight: CGFloat
  public var stopIndicatorSize: CGFloat

  public init(
    trackThickness: CGFloat,
    trackShape: CGFloat,
    handleHeight: CGFloat,
    stopIndicatorSize: CGFloat
  ) {
    self.trackThickness = trackThickness
    self.trackShape = trackShape
    self.handleHeight = handleHeight
    self.stopIndicatorSize = stopIndicatorSize
  }
}

/// The sizes of slider: named fields for the core values, `extra` for what a design system added.
/// Read one with `sizes[key]`.
public struct TanreiSliderSizes: Sendable, Equatable {
  public var small: TanreiSliderSizeTokens
  public var medium: TanreiSliderSizeTokens
  public var large: TanreiSliderSizeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiSliderSize: TanreiSliderSizeTokens]

  public init(
    small: TanreiSliderSizeTokens,
    medium: TanreiSliderSizeTokens,
    large: TanreiSliderSizeTokens,
    extra: [TanreiSliderSize: TanreiSliderSizeTokens] = [:]
  ) {
    self.small = small
    self.medium = medium
    self.large = large
    self.extra = extra
  }

  /// The tokens of one slider size, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiSliderSize) -> TanreiSliderSizeTokens? {
    switch key {
    case .small: return small
    case .medium: return medium
    case .large: return large
    default: return extra[key]
    }
  }

  /// Total lookup: a slider size this design system does not have reads the tokens of `small`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiSliderSize) -> TanreiSliderSizeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no slider size \"\(key.rawValue)\"; using \"small\"")
    return small
  }

  /// Every slider size of this design system: the core ones, then what it added.
  public var keys: [TanreiSliderSize] { TanreiSliderSize.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of slider's `condition` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiSliderCondition(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiSliderCondition: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let standard = TanreiSliderCondition(rawValue: "standard")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiSliderCondition] = [.standard]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiSliderCondition.standard
}

/// How one condition of slider is drawn in one state.
public struct TanreiSliderConditionStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var stateLayerColor: TanreiPaint
  public var handleColor: TanreiPaint
  public var handleWidth: CGFloat
  public var handleElevation: [TanreiShadowLayer]
  public var handleOutlineColor: TanreiPaint
  public var trackColor: TanreiPaint
  public var activeTrackColor: TanreiPaint
  public var stopIndicatorColor: TanreiPaint
  public var activeStopIndicatorColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    stateLayerColor: TanreiPaint,
    handleColor: TanreiPaint,
    handleWidth: CGFloat,
    handleElevation: [TanreiShadowLayer],
    handleOutlineColor: TanreiPaint,
    trackColor: TanreiPaint,
    activeTrackColor: TanreiPaint,
    stopIndicatorColor: TanreiPaint,
    activeStopIndicatorColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.stateLayerColor = stateLayerColor
    self.handleColor = handleColor
    self.handleWidth = handleWidth
    self.handleElevation = handleElevation
    self.handleOutlineColor = handleOutlineColor
    self.trackColor = trackColor
    self.activeTrackColor = activeTrackColor
    self.stopIndicatorColor = stopIndicatorColor
    self.activeStopIndicatorColor = activeStopIndicatorColor
  }
}

/// One condition of slider: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiSliderConditionTokens: Sendable, Equatable {
  public var enabled: TanreiSliderConditionStateTokens
  public var hovered: TanreiSliderConditionStateTokens
  public var focused: TanreiSliderConditionStateTokens
  public var pressed: TanreiSliderConditionStateTokens
  public var disabled: TanreiSliderConditionStateTokens

  public init(
    enabled: TanreiSliderConditionStateTokens,
    hovered: TanreiSliderConditionStateTokens,
    focused: TanreiSliderConditionStateTokens,
    pressed: TanreiSliderConditionStateTokens,
    disabled: TanreiSliderConditionStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this condition of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiSliderConditionStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The conditions of slider: named fields for the core values, `extra` for what a design system added.
/// Read one with `conditions[key]`.
public struct TanreiSliderConditions: Sendable, Equatable {
  public var standard: TanreiSliderConditionTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiSliderCondition: TanreiSliderConditionTokens]

  public init(
    standard: TanreiSliderConditionTokens,
    extra: [TanreiSliderCondition: TanreiSliderConditionTokens] = [:]
  ) {
    self.standard = standard
    self.extra = extra
  }

  /// The tokens of one slider condition, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiSliderCondition) -> TanreiSliderConditionTokens? {
    switch key {
    case .standard: return standard
    default: return extra[key]
    }
  }

  /// Total lookup: a slider condition this design system does not have reads the tokens of `standard`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiSliderCondition) -> TanreiSliderConditionTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no slider condition \"\(key.rawValue)\"; using \"standard\"")
    return standard
  }

  /// Every slider condition of this design system: the core ones, then what it added.
  public var keys: [TanreiSliderCondition] { TanreiSliderCondition.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of slider that depend on the state but not on the variant.
public struct TanreiSliderStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of slider (comp.slider).
public struct TanreiSliderTokens: Sendable, Equatable {
  public var containerShape: CGFloat
  public var containerSize: CGFloat
  public var handleOutlineWidth: CGFloat
  public var handleShape: CGFloat
  public var motionFeedbackDuration: Double
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var motionValueDuration: Double
  public var motionValueEasing: TanreiCubicBezier
  public var trackGap: CGFloat
  public var valueIndicatorContainerColor: TanreiPaint
  public var valueIndicatorContainerHeight: CGFloat
  public var valueIndicatorContainerPaddingInline: CGFloat
  public var valueIndicatorContainerShape: CGFloat
  public var valueIndicatorLabelColor: TanreiPaint
  public var valueIndicatorLabelTypescale: TanreiTextStyle
  public var valueIndicatorOffset: CGFloat
  public var sizes: TanreiSliderSizes
  public var conditions: TanreiSliderConditions
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiSliderStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiSliderStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiSliderStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiSliderStateTokens

  public init(
    containerShape: CGFloat,
    containerSize: CGFloat,
    handleOutlineWidth: CGFloat,
    handleShape: CGFloat,
    motionFeedbackDuration: Double,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    motionValueDuration: Double,
    motionValueEasing: TanreiCubicBezier,
    trackGap: CGFloat,
    valueIndicatorContainerColor: TanreiPaint,
    valueIndicatorContainerHeight: CGFloat,
    valueIndicatorContainerPaddingInline: CGFloat,
    valueIndicatorContainerShape: CGFloat,
    valueIndicatorLabelColor: TanreiPaint,
    valueIndicatorLabelTypescale: TanreiTextStyle,
    valueIndicatorOffset: CGFloat,
    sizes: TanreiSliderSizes,
    conditions: TanreiSliderConditions,
    hovered: TanreiSliderStateTokens,
    focused: TanreiSliderStateTokens,
    pressed: TanreiSliderStateTokens,
    disabled: TanreiSliderStateTokens
  ) {
    self.containerShape = containerShape
    self.containerSize = containerSize
    self.handleOutlineWidth = handleOutlineWidth
    self.handleShape = handleShape
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.motionValueDuration = motionValueDuration
    self.motionValueEasing = motionValueEasing
    self.trackGap = trackGap
    self.valueIndicatorContainerColor = valueIndicatorContainerColor
    self.valueIndicatorContainerHeight = valueIndicatorContainerHeight
    self.valueIndicatorContainerPaddingInline = valueIndicatorContainerPaddingInline
    self.valueIndicatorContainerShape = valueIndicatorContainerShape
    self.valueIndicatorLabelColor = valueIndicatorLabelColor
    self.valueIndicatorLabelTypescale = valueIndicatorLabelTypescale
    self.valueIndicatorOffset = valueIndicatorOffset
    self.sizes = sizes
    self.conditions = conditions
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which slider has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiSliderStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// A value of snackbar's `control` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiSnackbarControl(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiSnackbarControl: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let action = TanreiSnackbarControl(rawValue: "action")
  public static let close = TanreiSnackbarControl(rawValue: "close")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiSnackbarControl] = [.action, .close]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiSnackbarControl.action
}

/// How one control of snackbar is drawn in one state.
public struct TanreiSnackbarControlStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var contentColor: TanreiPaint
  public var stateLayerColor: TanreiPaint
  public var infoContainerColor: TanreiPaint
  public var infoContentColor: TanreiPaint
  public var infoStateLayerColor: TanreiPaint
  public var warningContainerColor: TanreiPaint
  public var warningContentColor: TanreiPaint
  public var warningStateLayerColor: TanreiPaint
  public var errorContainerColor: TanreiPaint
  public var errorContentColor: TanreiPaint
  public var errorStateLayerColor: TanreiPaint
  public var successContainerColor: TanreiPaint
  public var successContentColor: TanreiPaint
  public var successStateLayerColor: TanreiPaint
  public var inverseContainerColor: TanreiPaint
  public var inverseContentColor: TanreiPaint
  public var inverseStateLayerColor: TanreiPaint
  public var inverseInfoContainerColor: TanreiPaint
  public var inverseInfoContentColor: TanreiPaint
  public var inverseInfoStateLayerColor: TanreiPaint
  public var inverseWarningContainerColor: TanreiPaint
  public var inverseWarningContentColor: TanreiPaint
  public var inverseWarningStateLayerColor: TanreiPaint
  public var inverseErrorContainerColor: TanreiPaint
  public var inverseErrorContentColor: TanreiPaint
  public var inverseErrorStateLayerColor: TanreiPaint
  public var inverseSuccessContainerColor: TanreiPaint
  public var inverseSuccessContentColor: TanreiPaint
  public var inverseSuccessStateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    contentColor: TanreiPaint,
    stateLayerColor: TanreiPaint,
    infoContainerColor: TanreiPaint,
    infoContentColor: TanreiPaint,
    infoStateLayerColor: TanreiPaint,
    warningContainerColor: TanreiPaint,
    warningContentColor: TanreiPaint,
    warningStateLayerColor: TanreiPaint,
    errorContainerColor: TanreiPaint,
    errorContentColor: TanreiPaint,
    errorStateLayerColor: TanreiPaint,
    successContainerColor: TanreiPaint,
    successContentColor: TanreiPaint,
    successStateLayerColor: TanreiPaint,
    inverseContainerColor: TanreiPaint,
    inverseContentColor: TanreiPaint,
    inverseStateLayerColor: TanreiPaint,
    inverseInfoContainerColor: TanreiPaint,
    inverseInfoContentColor: TanreiPaint,
    inverseInfoStateLayerColor: TanreiPaint,
    inverseWarningContainerColor: TanreiPaint,
    inverseWarningContentColor: TanreiPaint,
    inverseWarningStateLayerColor: TanreiPaint,
    inverseErrorContainerColor: TanreiPaint,
    inverseErrorContentColor: TanreiPaint,
    inverseErrorStateLayerColor: TanreiPaint,
    inverseSuccessContainerColor: TanreiPaint,
    inverseSuccessContentColor: TanreiPaint,
    inverseSuccessStateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.contentColor = contentColor
    self.stateLayerColor = stateLayerColor
    self.infoContainerColor = infoContainerColor
    self.infoContentColor = infoContentColor
    self.infoStateLayerColor = infoStateLayerColor
    self.warningContainerColor = warningContainerColor
    self.warningContentColor = warningContentColor
    self.warningStateLayerColor = warningStateLayerColor
    self.errorContainerColor = errorContainerColor
    self.errorContentColor = errorContentColor
    self.errorStateLayerColor = errorStateLayerColor
    self.successContainerColor = successContainerColor
    self.successContentColor = successContentColor
    self.successStateLayerColor = successStateLayerColor
    self.inverseContainerColor = inverseContainerColor
    self.inverseContentColor = inverseContentColor
    self.inverseStateLayerColor = inverseStateLayerColor
    self.inverseInfoContainerColor = inverseInfoContainerColor
    self.inverseInfoContentColor = inverseInfoContentColor
    self.inverseInfoStateLayerColor = inverseInfoStateLayerColor
    self.inverseWarningContainerColor = inverseWarningContainerColor
    self.inverseWarningContentColor = inverseWarningContentColor
    self.inverseWarningStateLayerColor = inverseWarningStateLayerColor
    self.inverseErrorContainerColor = inverseErrorContainerColor
    self.inverseErrorContentColor = inverseErrorContentColor
    self.inverseErrorStateLayerColor = inverseErrorStateLayerColor
    self.inverseSuccessContainerColor = inverseSuccessContainerColor
    self.inverseSuccessContentColor = inverseSuccessContentColor
    self.inverseSuccessStateLayerColor = inverseSuccessStateLayerColor
  }
}

/// One control of snackbar: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiSnackbarControlTokens: Sendable, Equatable {
  public var enabled: TanreiSnackbarControlStateTokens
  public var hovered: TanreiSnackbarControlStateTokens
  public var focused: TanreiSnackbarControlStateTokens
  public var pressed: TanreiSnackbarControlStateTokens

  public init(
    enabled: TanreiSnackbarControlStateTokens,
    hovered: TanreiSnackbarControlStateTokens,
    focused: TanreiSnackbarControlStateTokens,
    pressed: TanreiSnackbarControlStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
  }

  /// The tokens of this control of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `disabled`, which snackbar has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiSnackbarControlStateTokens? {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return nil
    }
  }
}

/// The controls of snackbar: named fields for the core values, `extra` for what a design system added.
/// Read one with `controls[key]`.
public struct TanreiSnackbarControls: Sendable, Equatable {
  public var action: TanreiSnackbarControlTokens
  public var close: TanreiSnackbarControlTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiSnackbarControl: TanreiSnackbarControlTokens]

  public init(
    action: TanreiSnackbarControlTokens,
    close: TanreiSnackbarControlTokens,
    extra: [TanreiSnackbarControl: TanreiSnackbarControlTokens] = [:]
  ) {
    self.action = action
    self.close = close
    self.extra = extra
  }

  /// The tokens of one snackbar control, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiSnackbarControl) -> TanreiSnackbarControlTokens? {
    switch key {
    case .action: return action
    case .close: return close
    default: return extra[key]
    }
  }

  /// Total lookup: a snackbar control this design system does not have reads the tokens of `action`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiSnackbarControl) -> TanreiSnackbarControlTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no snackbar control \"\(key.rawValue)\"; using \"action\"")
    return action
  }

  /// Every snackbar control of this design system: the core ones, then what it added.
  public var keys: [TanreiSnackbarControl] { TanreiSnackbarControl.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of snackbar that depend on the state but not on the variant.
public struct TanreiSnackbarStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of snackbar (comp.snackbar).
public struct TanreiSnackbarTokens: Sendable, Equatable {
  public var actionTonalLayerOpacity: Double
  public var containerColor: TanreiPaint
  public var containerElevation: [TanreiShadowLayer]
  public var containerGap: CGFloat
  public var containerInverse: Double
  public var containerMargin: CGFloat
  public var containerMaxWidth: CGFloat
  public var containerMinHeight: CGFloat
  public var containerMinWidth: CGFloat
  public var containerPaddingBlock: CGFloat
  public var containerPaddingInlineEnd: CGFloat
  public var containerPaddingInlineEndWithControls: CGFloat
  public var containerPaddingInlineStart: CGFloat
  public var containerShape: CGFloat
  public var controlsGap: CGFloat
  public var controlsHeight: CGFloat
  public var controlsIconSize: CGFloat
  public var controlsLabelTypescale: TanreiTextStyle
  public var controlsPaddingInline: CGFloat
  public var controlsShape: CGFloat
  public var errorContainerColor: TanreiPaint
  public var errorFocusRingColor: TanreiPaint
  public var errorIconColor: TanreiPaint
  public var errorOutlineColor: TanreiPaint
  public var errorSupportingTextColor: TanreiPaint
  public var errorTitleColor: TanreiPaint
  public var focusRingColor: TanreiPaint
  public var iconGap: CGFloat
  public var iconOpacity: Double
  public var iconSize: CGFloat
  public var infoContainerColor: TanreiPaint
  public var infoFocusRingColor: TanreiPaint
  public var infoIconColor: TanreiPaint
  public var infoOutlineColor: TanreiPaint
  public var infoSupportingTextColor: TanreiPaint
  public var infoTitleColor: TanreiPaint
  public var inverseErrorContainerColor: TanreiPaint
  public var inverseErrorFocusRingColor: TanreiPaint
  public var inverseErrorIconColor: TanreiPaint
  public var inverseErrorOutlineColor: TanreiPaint
  public var inverseErrorSupportingTextColor: TanreiPaint
  public var inverseErrorTitleColor: TanreiPaint
  public var inverseInfoContainerColor: TanreiPaint
  public var inverseInfoFocusRingColor: TanreiPaint
  public var inverseInfoIconColor: TanreiPaint
  public var inverseInfoOutlineColor: TanreiPaint
  public var inverseInfoSupportingTextColor: TanreiPaint
  public var inverseInfoTitleColor: TanreiPaint
  public var inverseSuccessContainerColor: TanreiPaint
  public var inverseSuccessFocusRingColor: TanreiPaint
  public var inverseSuccessIconColor: TanreiPaint
  public var inverseSuccessOutlineColor: TanreiPaint
  public var inverseSuccessSupportingTextColor: TanreiPaint
  public var inverseSuccessTitleColor: TanreiPaint
  public var inverseWarningContainerColor: TanreiPaint
  public var inverseWarningFocusRingColor: TanreiPaint
  public var inverseWarningIconColor: TanreiPaint
  public var inverseWarningOutlineColor: TanreiPaint
  public var inverseWarningSupportingTextColor: TanreiPaint
  public var inverseWarningTitleColor: TanreiPaint
  public var inverseContainerColor: TanreiPaint
  public var inverseFocusRingColor: TanreiPaint
  public var inverseSupportingTextColor: TanreiPaint
  public var inverseTitleColor: TanreiPaint
  public var motionEnterDuration: Double
  public var motionEnterEasing: TanreiCubicBezier
  public var motionExitDuration: Double
  public var motionExitEasing: TanreiCubicBezier
  public var motionExpandDuration: Double
  public var motionExpandEasing: TanreiCubicBezier
  public var motionFeedbackDuration: Double
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var outlineOpacity: Double
  public var outlineWidth: CGFloat
  public var successContainerColor: TanreiPaint
  public var successFocusRingColor: TanreiPaint
  public var successIconColor: TanreiPaint
  public var successOutlineColor: TanreiPaint
  public var successSupportingTextColor: TanreiPaint
  public var successTitleColor: TanreiPaint
  public var supportingTextColor: TanreiPaint
  public var supportingTextMaxLines: Double
  public var supportingTextTypescale: TanreiTextStyle
  public var supportingTextUnderTitleOpacity: Double
  public var timeoutLong: Double
  public var timeoutShort: Double
  public var titleColor: TanreiPaint
  public var titleGap: CGFloat
  public var titleMaxLines: Double
  public var titleTypescale: TanreiTextStyle
  public var warningContainerColor: TanreiPaint
  public var warningFocusRingColor: TanreiPaint
  public var warningIconColor: TanreiPaint
  public var warningOutlineColor: TanreiPaint
  public var warningSupportingTextColor: TanreiPaint
  public var warningTitleColor: TanreiPaint
  public var controls: TanreiSnackbarControls
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiSnackbarStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiSnackbarStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiSnackbarStateTokens

  public init(
    actionTonalLayerOpacity: Double,
    containerColor: TanreiPaint,
    containerElevation: [TanreiShadowLayer],
    containerGap: CGFloat,
    containerInverse: Double,
    containerMargin: CGFloat,
    containerMaxWidth: CGFloat,
    containerMinHeight: CGFloat,
    containerMinWidth: CGFloat,
    containerPaddingBlock: CGFloat,
    containerPaddingInlineEnd: CGFloat,
    containerPaddingInlineEndWithControls: CGFloat,
    containerPaddingInlineStart: CGFloat,
    containerShape: CGFloat,
    controlsGap: CGFloat,
    controlsHeight: CGFloat,
    controlsIconSize: CGFloat,
    controlsLabelTypescale: TanreiTextStyle,
    controlsPaddingInline: CGFloat,
    controlsShape: CGFloat,
    errorContainerColor: TanreiPaint,
    errorFocusRingColor: TanreiPaint,
    errorIconColor: TanreiPaint,
    errorOutlineColor: TanreiPaint,
    errorSupportingTextColor: TanreiPaint,
    errorTitleColor: TanreiPaint,
    focusRingColor: TanreiPaint,
    iconGap: CGFloat,
    iconOpacity: Double,
    iconSize: CGFloat,
    infoContainerColor: TanreiPaint,
    infoFocusRingColor: TanreiPaint,
    infoIconColor: TanreiPaint,
    infoOutlineColor: TanreiPaint,
    infoSupportingTextColor: TanreiPaint,
    infoTitleColor: TanreiPaint,
    inverseErrorContainerColor: TanreiPaint,
    inverseErrorFocusRingColor: TanreiPaint,
    inverseErrorIconColor: TanreiPaint,
    inverseErrorOutlineColor: TanreiPaint,
    inverseErrorSupportingTextColor: TanreiPaint,
    inverseErrorTitleColor: TanreiPaint,
    inverseInfoContainerColor: TanreiPaint,
    inverseInfoFocusRingColor: TanreiPaint,
    inverseInfoIconColor: TanreiPaint,
    inverseInfoOutlineColor: TanreiPaint,
    inverseInfoSupportingTextColor: TanreiPaint,
    inverseInfoTitleColor: TanreiPaint,
    inverseSuccessContainerColor: TanreiPaint,
    inverseSuccessFocusRingColor: TanreiPaint,
    inverseSuccessIconColor: TanreiPaint,
    inverseSuccessOutlineColor: TanreiPaint,
    inverseSuccessSupportingTextColor: TanreiPaint,
    inverseSuccessTitleColor: TanreiPaint,
    inverseWarningContainerColor: TanreiPaint,
    inverseWarningFocusRingColor: TanreiPaint,
    inverseWarningIconColor: TanreiPaint,
    inverseWarningOutlineColor: TanreiPaint,
    inverseWarningSupportingTextColor: TanreiPaint,
    inverseWarningTitleColor: TanreiPaint,
    inverseContainerColor: TanreiPaint,
    inverseFocusRingColor: TanreiPaint,
    inverseSupportingTextColor: TanreiPaint,
    inverseTitleColor: TanreiPaint,
    motionEnterDuration: Double,
    motionEnterEasing: TanreiCubicBezier,
    motionExitDuration: Double,
    motionExitEasing: TanreiCubicBezier,
    motionExpandDuration: Double,
    motionExpandEasing: TanreiCubicBezier,
    motionFeedbackDuration: Double,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    outlineOpacity: Double,
    outlineWidth: CGFloat,
    successContainerColor: TanreiPaint,
    successFocusRingColor: TanreiPaint,
    successIconColor: TanreiPaint,
    successOutlineColor: TanreiPaint,
    successSupportingTextColor: TanreiPaint,
    successTitleColor: TanreiPaint,
    supportingTextColor: TanreiPaint,
    supportingTextMaxLines: Double,
    supportingTextTypescale: TanreiTextStyle,
    supportingTextUnderTitleOpacity: Double,
    timeoutLong: Double,
    timeoutShort: Double,
    titleColor: TanreiPaint,
    titleGap: CGFloat,
    titleMaxLines: Double,
    titleTypescale: TanreiTextStyle,
    warningContainerColor: TanreiPaint,
    warningFocusRingColor: TanreiPaint,
    warningIconColor: TanreiPaint,
    warningOutlineColor: TanreiPaint,
    warningSupportingTextColor: TanreiPaint,
    warningTitleColor: TanreiPaint,
    controls: TanreiSnackbarControls,
    hovered: TanreiSnackbarStateTokens,
    focused: TanreiSnackbarStateTokens,
    pressed: TanreiSnackbarStateTokens
  ) {
    self.actionTonalLayerOpacity = actionTonalLayerOpacity
    self.containerColor = containerColor
    self.containerElevation = containerElevation
    self.containerGap = containerGap
    self.containerInverse = containerInverse
    self.containerMargin = containerMargin
    self.containerMaxWidth = containerMaxWidth
    self.containerMinHeight = containerMinHeight
    self.containerMinWidth = containerMinWidth
    self.containerPaddingBlock = containerPaddingBlock
    self.containerPaddingInlineEnd = containerPaddingInlineEnd
    self.containerPaddingInlineEndWithControls = containerPaddingInlineEndWithControls
    self.containerPaddingInlineStart = containerPaddingInlineStart
    self.containerShape = containerShape
    self.controlsGap = controlsGap
    self.controlsHeight = controlsHeight
    self.controlsIconSize = controlsIconSize
    self.controlsLabelTypescale = controlsLabelTypescale
    self.controlsPaddingInline = controlsPaddingInline
    self.controlsShape = controlsShape
    self.errorContainerColor = errorContainerColor
    self.errorFocusRingColor = errorFocusRingColor
    self.errorIconColor = errorIconColor
    self.errorOutlineColor = errorOutlineColor
    self.errorSupportingTextColor = errorSupportingTextColor
    self.errorTitleColor = errorTitleColor
    self.focusRingColor = focusRingColor
    self.iconGap = iconGap
    self.iconOpacity = iconOpacity
    self.iconSize = iconSize
    self.infoContainerColor = infoContainerColor
    self.infoFocusRingColor = infoFocusRingColor
    self.infoIconColor = infoIconColor
    self.infoOutlineColor = infoOutlineColor
    self.infoSupportingTextColor = infoSupportingTextColor
    self.infoTitleColor = infoTitleColor
    self.inverseErrorContainerColor = inverseErrorContainerColor
    self.inverseErrorFocusRingColor = inverseErrorFocusRingColor
    self.inverseErrorIconColor = inverseErrorIconColor
    self.inverseErrorOutlineColor = inverseErrorOutlineColor
    self.inverseErrorSupportingTextColor = inverseErrorSupportingTextColor
    self.inverseErrorTitleColor = inverseErrorTitleColor
    self.inverseInfoContainerColor = inverseInfoContainerColor
    self.inverseInfoFocusRingColor = inverseInfoFocusRingColor
    self.inverseInfoIconColor = inverseInfoIconColor
    self.inverseInfoOutlineColor = inverseInfoOutlineColor
    self.inverseInfoSupportingTextColor = inverseInfoSupportingTextColor
    self.inverseInfoTitleColor = inverseInfoTitleColor
    self.inverseSuccessContainerColor = inverseSuccessContainerColor
    self.inverseSuccessFocusRingColor = inverseSuccessFocusRingColor
    self.inverseSuccessIconColor = inverseSuccessIconColor
    self.inverseSuccessOutlineColor = inverseSuccessOutlineColor
    self.inverseSuccessSupportingTextColor = inverseSuccessSupportingTextColor
    self.inverseSuccessTitleColor = inverseSuccessTitleColor
    self.inverseWarningContainerColor = inverseWarningContainerColor
    self.inverseWarningFocusRingColor = inverseWarningFocusRingColor
    self.inverseWarningIconColor = inverseWarningIconColor
    self.inverseWarningOutlineColor = inverseWarningOutlineColor
    self.inverseWarningSupportingTextColor = inverseWarningSupportingTextColor
    self.inverseWarningTitleColor = inverseWarningTitleColor
    self.inverseContainerColor = inverseContainerColor
    self.inverseFocusRingColor = inverseFocusRingColor
    self.inverseSupportingTextColor = inverseSupportingTextColor
    self.inverseTitleColor = inverseTitleColor
    self.motionEnterDuration = motionEnterDuration
    self.motionEnterEasing = motionEnterEasing
    self.motionExitDuration = motionExitDuration
    self.motionExitEasing = motionExitEasing
    self.motionExpandDuration = motionExpandDuration
    self.motionExpandEasing = motionExpandEasing
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.outlineOpacity = outlineOpacity
    self.outlineWidth = outlineWidth
    self.successContainerColor = successContainerColor
    self.successFocusRingColor = successFocusRingColor
    self.successIconColor = successIconColor
    self.successOutlineColor = successOutlineColor
    self.successSupportingTextColor = successSupportingTextColor
    self.successTitleColor = successTitleColor
    self.supportingTextColor = supportingTextColor
    self.supportingTextMaxLines = supportingTextMaxLines
    self.supportingTextTypescale = supportingTextTypescale
    self.supportingTextUnderTitleOpacity = supportingTextUnderTitleOpacity
    self.timeoutLong = timeoutLong
    self.timeoutShort = timeoutShort
    self.titleColor = titleColor
    self.titleGap = titleGap
    self.titleMaxLines = titleMaxLines
    self.titleTypescale = titleTypescale
    self.warningContainerColor = warningContainerColor
    self.warningFocusRingColor = warningFocusRingColor
    self.warningIconColor = warningIconColor
    self.warningOutlineColor = warningOutlineColor
    self.warningSupportingTextColor = warningSupportingTextColor
    self.warningTitleColor = warningTitleColor
    self.controls = controls
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, `disabled`, which snackbar has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiSnackbarStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return nil
    }
  }
}

/// A value of steps's `size` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiStepsSize(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiStepsSize: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let medium = TanreiStepsSize(rawValue: "medium")
  public static let large = TanreiStepsSize(rawValue: "large")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiStepsSize] = [.medium, .large]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiStepsSize.medium
}

/// Everything of steps that depends on its size.
public struct TanreiStepsSizeTokens: Sendable, Equatable {
  public var markerHeight: CGFloat
  public var markerLabelTypescale: TanreiTextStyle
  public var titleTypescale: TanreiTextStyle
  public var bodyTypescale: TanreiTextStyle

  public init(
    markerHeight: CGFloat,
    markerLabelTypescale: TanreiTextStyle,
    titleTypescale: TanreiTextStyle,
    bodyTypescale: TanreiTextStyle
  ) {
    self.markerHeight = markerHeight
    self.markerLabelTypescale = markerLabelTypescale
    self.titleTypescale = titleTypescale
    self.bodyTypescale = bodyTypescale
  }
}

/// The sizes of steps: named fields for the core values, `extra` for what a design system added.
/// Read one with `sizes[key]`.
public struct TanreiStepsSizes: Sendable, Equatable {
  public var medium: TanreiStepsSizeTokens
  public var large: TanreiStepsSizeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiStepsSize: TanreiStepsSizeTokens]

  public init(
    medium: TanreiStepsSizeTokens,
    large: TanreiStepsSizeTokens,
    extra: [TanreiStepsSize: TanreiStepsSizeTokens] = [:]
  ) {
    self.medium = medium
    self.large = large
    self.extra = extra
  }

  /// The tokens of one steps size, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiStepsSize) -> TanreiStepsSizeTokens? {
    switch key {
    case .medium: return medium
    case .large: return large
    default: return extra[key]
    }
  }

  /// Total lookup: a steps size this design system does not have reads the tokens of `medium`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiStepsSize) -> TanreiStepsSizeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no steps size \"\(key.rawValue)\"; using \"medium\"")
    return medium
  }

  /// Every steps size of this design system: the core ones, then what it added.
  public var keys: [TanreiStepsSize] { TanreiStepsSize.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Component tokens of steps (comp.steps).
public struct TanreiStepsTokens: Sendable, Equatable {
  public var bodyGap: CGFloat
  public var connectorColor: TanreiPaint
  public var connectorGap: CGFloat
  public var connectorThickness: CGFloat
  public var markerGap: CGFloat
  public var markerOutlineColor: TanreiPaint
  public var markerOutlineWidth: CGFloat
  public var markerPaddingInline: CGFloat
  public var markerShape: CGFloat
  public var stepGap: CGFloat
  public var titleGap: CGFloat
  public var sizes: TanreiStepsSizes

  public init(
    bodyGap: CGFloat,
    connectorColor: TanreiPaint,
    connectorGap: CGFloat,
    connectorThickness: CGFloat,
    markerGap: CGFloat,
    markerOutlineColor: TanreiPaint,
    markerOutlineWidth: CGFloat,
    markerPaddingInline: CGFloat,
    markerShape: CGFloat,
    stepGap: CGFloat,
    titleGap: CGFloat,
    sizes: TanreiStepsSizes
  ) {
    self.bodyGap = bodyGap
    self.connectorColor = connectorColor
    self.connectorGap = connectorGap
    self.connectorThickness = connectorThickness
    self.markerGap = markerGap
    self.markerOutlineColor = markerOutlineColor
    self.markerOutlineWidth = markerOutlineWidth
    self.markerPaddingInline = markerPaddingInline
    self.markerShape = markerShape
    self.stepGap = stepGap
    self.titleGap = titleGap
    self.sizes = sizes
  }
}

/// A value of switch's `condition` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiSwitchCondition(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiSwitchCondition: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let unselected = TanreiSwitchCondition(rawValue: "unselected")
  public static let selected = TanreiSwitchCondition(rawValue: "selected")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiSwitchCondition] = [.unselected, .selected]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiSwitchCondition.unselected
}

/// How one condition of switch is drawn in one state.
public struct TanreiSwitchConditionStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var trackColor: TanreiPaint
  public var outlineColor: TanreiPaint
  public var handleColor: TanreiPaint
  public var handleSize: CGFloat
  public var handleElevation: [TanreiShadowLayer]
  public var iconColor: TanreiPaint
  public var labelColor: TanreiPaint
  public var stateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    trackColor: TanreiPaint,
    outlineColor: TanreiPaint,
    handleColor: TanreiPaint,
    handleSize: CGFloat,
    handleElevation: [TanreiShadowLayer],
    iconColor: TanreiPaint,
    labelColor: TanreiPaint,
    stateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.trackColor = trackColor
    self.outlineColor = outlineColor
    self.handleColor = handleColor
    self.handleSize = handleSize
    self.handleElevation = handleElevation
    self.iconColor = iconColor
    self.labelColor = labelColor
    self.stateLayerColor = stateLayerColor
  }
}

/// One condition of switch: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiSwitchConditionTokens: Sendable, Equatable {
  public var enabled: TanreiSwitchConditionStateTokens
  public var hovered: TanreiSwitchConditionStateTokens
  public var focused: TanreiSwitchConditionStateTokens
  public var pressed: TanreiSwitchConditionStateTokens
  public var disabled: TanreiSwitchConditionStateTokens

  public init(
    enabled: TanreiSwitchConditionStateTokens,
    hovered: TanreiSwitchConditionStateTokens,
    focused: TanreiSwitchConditionStateTokens,
    pressed: TanreiSwitchConditionStateTokens,
    disabled: TanreiSwitchConditionStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this condition of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiSwitchConditionStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The conditions of switch: named fields for the core values, `extra` for what a design system added.
/// Read one with `conditions[key]`.
public struct TanreiSwitchConditions: Sendable, Equatable {
  public var unselected: TanreiSwitchConditionTokens
  public var selected: TanreiSwitchConditionTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiSwitchCondition: TanreiSwitchConditionTokens]

  public init(
    unselected: TanreiSwitchConditionTokens,
    selected: TanreiSwitchConditionTokens,
    extra: [TanreiSwitchCondition: TanreiSwitchConditionTokens] = [:]
  ) {
    self.unselected = unselected
    self.selected = selected
    self.extra = extra
  }

  /// The tokens of one switch condition, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiSwitchCondition) -> TanreiSwitchConditionTokens? {
    switch key {
    case .unselected: return unselected
    case .selected: return selected
    default: return extra[key]
    }
  }

  /// Total lookup: a switch condition this design system does not have reads the tokens of `unselected`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiSwitchCondition) -> TanreiSwitchConditionTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no switch condition \"\(key.rawValue)\"; using \"unselected\"")
    return unselected
  }

  /// Every switch condition of this design system: the core ones, then what it added.
  public var keys: [TanreiSwitchCondition] { TanreiSwitchCondition.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of switch that depend on the state but not on the variant.
public struct TanreiSwitchStateTokens: Sendable, Equatable {
  public var containerShape: CGFloat
  public var opacity: Double

  public init(
    containerShape: CGFloat,
    opacity: Double
  ) {
    self.containerShape = containerShape
    self.opacity = opacity
  }
}

/// Component tokens of switch (comp.switch).
public struct TanreiSwitchTokens: Sendable, Equatable {
  public var containerShape: CGFloat
  public var containerSize: CGFloat
  public var handleSizeWithIcon: CGFloat
  public var iconSize: CGFloat
  public var iconWeight: Double
  public var labelGap: CGFloat
  public var labelTypescale: TanreiTextStyle
  public var motionFeedbackDuration: Double
  public var motionSelectionDuration: Double
  public var motionSelectionEasing: TanreiCubicBezier
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var outlineWidth: CGFloat
  public var trackHeight: CGFloat
  public var trackShape: CGFloat
  public var trackWidth: CGFloat
  public var conditions: TanreiSwitchConditions
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiSwitchStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiSwitchStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiSwitchStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiSwitchStateTokens

  public init(
    containerShape: CGFloat,
    containerSize: CGFloat,
    handleSizeWithIcon: CGFloat,
    iconSize: CGFloat,
    iconWeight: Double,
    labelGap: CGFloat,
    labelTypescale: TanreiTextStyle,
    motionFeedbackDuration: Double,
    motionSelectionDuration: Double,
    motionSelectionEasing: TanreiCubicBezier,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    outlineWidth: CGFloat,
    trackHeight: CGFloat,
    trackShape: CGFloat,
    trackWidth: CGFloat,
    conditions: TanreiSwitchConditions,
    hovered: TanreiSwitchStateTokens,
    focused: TanreiSwitchStateTokens,
    pressed: TanreiSwitchStateTokens,
    disabled: TanreiSwitchStateTokens
  ) {
    self.containerShape = containerShape
    self.containerSize = containerSize
    self.handleSizeWithIcon = handleSizeWithIcon
    self.iconSize = iconSize
    self.iconWeight = iconWeight
    self.labelGap = labelGap
    self.labelTypescale = labelTypescale
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionSelectionDuration = motionSelectionDuration
    self.motionSelectionEasing = motionSelectionEasing
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.outlineWidth = outlineWidth
    self.trackHeight = trackHeight
    self.trackShape = trackShape
    self.trackWidth = trackWidth
    self.conditions = conditions
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which switch has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiSwitchStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// Component tokens of tab-view (comp.tab-view).
public struct TanreiTabViewTokens: Sendable, Equatable {
  public var containerShape: CGFloat
  public var motionFadeDuration: Double
  public var motionFadeEasing: TanreiCubicBezier
  public var motionSwitchDuration: Double
  public var motionSwitchEasing: TanreiCubicBezier
  public var motionTransition: Double
  public var transitionBlur: CGFloat
  public var transitionDistance: CGFloat
  public var transitionDistanceFraction: Double
  public var transitionOpacity: Double

  public init(
    containerShape: CGFloat,
    motionFadeDuration: Double,
    motionFadeEasing: TanreiCubicBezier,
    motionSwitchDuration: Double,
    motionSwitchEasing: TanreiCubicBezier,
    motionTransition: Double,
    transitionBlur: CGFloat,
    transitionDistance: CGFloat,
    transitionDistanceFraction: Double,
    transitionOpacity: Double
  ) {
    self.containerShape = containerShape
    self.motionFadeDuration = motionFadeDuration
    self.motionFadeEasing = motionFadeEasing
    self.motionSwitchDuration = motionSwitchDuration
    self.motionSwitchEasing = motionSwitchEasing
    self.motionTransition = motionTransition
    self.transitionBlur = transitionBlur
    self.transitionDistance = transitionDistance
    self.transitionDistanceFraction = transitionDistanceFraction
    self.transitionOpacity = transitionOpacity
  }
}

/// A value of table-of-contents's `part` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiTableOfContentsPart(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiTableOfContentsPart: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let item = TanreiTableOfContentsPart(rawValue: "item")
  public static let current = TanreiTableOfContentsPart(rawValue: "current")
  public static let disclosure = TanreiTableOfContentsPart(rawValue: "disclosure")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiTableOfContentsPart] = [.item, .current, .disclosure]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiTableOfContentsPart.item
}

/// How one part of table-of-contents is drawn in one state.
public struct TanreiTableOfContentsPartStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var labelColor: TanreiPaint
  public var stateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    labelColor: TanreiPaint,
    stateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.labelColor = labelColor
    self.stateLayerColor = stateLayerColor
  }
}

/// One part of table-of-contents: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiTableOfContentsPartTokens: Sendable, Equatable {
  public var enabled: TanreiTableOfContentsPartStateTokens
  public var hovered: TanreiTableOfContentsPartStateTokens
  public var focused: TanreiTableOfContentsPartStateTokens
  public var pressed: TanreiTableOfContentsPartStateTokens

  public init(
    enabled: TanreiTableOfContentsPartStateTokens,
    hovered: TanreiTableOfContentsPartStateTokens,
    focused: TanreiTableOfContentsPartStateTokens,
    pressed: TanreiTableOfContentsPartStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
  }

  /// The tokens of this part of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `disabled`, which table-of-contents has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiTableOfContentsPartStateTokens? {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return nil
    }
  }
}

/// The parts of table-of-contents: named fields for the core values, `extra` for what a design system added.
/// Read one with `parts[key]`.
public struct TanreiTableOfContentsParts: Sendable, Equatable {
  public var item: TanreiTableOfContentsPartTokens
  public var current: TanreiTableOfContentsPartTokens
  public var disclosure: TanreiTableOfContentsPartTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiTableOfContentsPart: TanreiTableOfContentsPartTokens]

  public init(
    item: TanreiTableOfContentsPartTokens,
    current: TanreiTableOfContentsPartTokens,
    disclosure: TanreiTableOfContentsPartTokens,
    extra: [TanreiTableOfContentsPart: TanreiTableOfContentsPartTokens] = [:]
  ) {
    self.item = item
    self.current = current
    self.disclosure = disclosure
    self.extra = extra
  }

  /// The tokens of one table-of-contents part, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiTableOfContentsPart) -> TanreiTableOfContentsPartTokens? {
    switch key {
    case .item: return item
    case .current: return current
    case .disclosure: return disclosure
    default: return extra[key]
    }
  }

  /// Total lookup: a table-of-contents part this design system does not have reads the tokens of `item`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiTableOfContentsPart) -> TanreiTableOfContentsPartTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no table-of-contents part \"\(key.rawValue)\"; using \"item\"")
    return item
  }

  /// Every table-of-contents part of this design system: the core ones, then what it added.
  public var keys: [TanreiTableOfContentsPart] { TanreiTableOfContentsPart.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of table-of-contents's `density` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiTableOfContentsDensity(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiTableOfContentsDensity: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let regular = TanreiTableOfContentsDensity(rawValue: "regular")
  public static let compact = TanreiTableOfContentsDensity(rawValue: "compact")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiTableOfContentsDensity] = [.regular, .compact]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiTableOfContentsDensity.regular
}

/// Everything of table-of-contents that depends on its density.
public struct TanreiTableOfContentsDensityTokens: Sendable, Equatable {
  public var rowHeight: CGFloat
  public var rowPaddingBlock: CGFloat

  public init(
    rowHeight: CGFloat,
    rowPaddingBlock: CGFloat
  ) {
    self.rowHeight = rowHeight
    self.rowPaddingBlock = rowPaddingBlock
  }
}

/// The densitys of table-of-contents: named fields for the core values, `extra` for what a design system added.
/// Read one with `densitys[key]`.
public struct TanreiTableOfContentsDensitys: Sendable, Equatable {
  public var regular: TanreiTableOfContentsDensityTokens
  public var compact: TanreiTableOfContentsDensityTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiTableOfContentsDensity: TanreiTableOfContentsDensityTokens]

  public init(
    regular: TanreiTableOfContentsDensityTokens,
    compact: TanreiTableOfContentsDensityTokens,
    extra: [TanreiTableOfContentsDensity: TanreiTableOfContentsDensityTokens] = [:]
  ) {
    self.regular = regular
    self.compact = compact
    self.extra = extra
  }

  /// The tokens of one table-of-contents density, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiTableOfContentsDensity) -> TanreiTableOfContentsDensityTokens? {
    switch key {
    case .regular: return regular
    case .compact: return compact
    default: return extra[key]
    }
  }

  /// Total lookup: a table-of-contents density this design system does not have reads the tokens of `regular`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiTableOfContentsDensity) -> TanreiTableOfContentsDensityTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no table-of-contents density \"\(key.rawValue)\"; using \"regular\"")
    return regular
  }

  /// Every table-of-contents density of this design system: the core ones, then what it added.
  public var keys: [TanreiTableOfContentsDensity] { TanreiTableOfContentsDensity.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of table-of-contents that depend on the state but not on the variant.
public struct TanreiTableOfContentsStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of table-of-contents (comp.table-of-contents).
public struct TanreiTableOfContentsTokens: Sendable, Equatable {
  public var compactContainerColor: TanreiPaint
  public var compactContainerShape: CGFloat
  public var compactIconColor: TanreiPaint
  public var compactIconSize: CGFloat
  public var compactListPaddingBlock: CGFloat
  public var compactListPaddingInline: CGFloat
  public var compactRowGap: CGFloat
  public var compactRowHeight: CGFloat
  public var compactRowPaddingInline: CGFloat
  public var compactSupportingTextColor: TanreiPaint
  public var compactSupportingTextTypescale: TanreiTextStyle
  public var containerGap: CGFloat
  public var labelTypescale: TanreiTextStyle
  public var markerColor: TanreiPaint
  public var markerWidth: CGFloat
  public var motionDisclosureDuration: Double
  public var motionDisclosureEasing: TanreiCubicBezier
  public var motionFeedbackDuration: Double
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var railColor: TanreiPaint
  public var railWidth: CGFloat
  public var rowIndent: CGFloat
  public var rowPaddingInline: CGFloat
  public var rowShape: CGFloat
  public var titleColor: TanreiPaint
  public var titleTypescale: TanreiTextStyle
  public var parts: TanreiTableOfContentsParts
  public var densitys: TanreiTableOfContentsDensitys
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiTableOfContentsStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiTableOfContentsStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiTableOfContentsStateTokens

  public init(
    compactContainerColor: TanreiPaint,
    compactContainerShape: CGFloat,
    compactIconColor: TanreiPaint,
    compactIconSize: CGFloat,
    compactListPaddingBlock: CGFloat,
    compactListPaddingInline: CGFloat,
    compactRowGap: CGFloat,
    compactRowHeight: CGFloat,
    compactRowPaddingInline: CGFloat,
    compactSupportingTextColor: TanreiPaint,
    compactSupportingTextTypescale: TanreiTextStyle,
    containerGap: CGFloat,
    labelTypescale: TanreiTextStyle,
    markerColor: TanreiPaint,
    markerWidth: CGFloat,
    motionDisclosureDuration: Double,
    motionDisclosureEasing: TanreiCubicBezier,
    motionFeedbackDuration: Double,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    railColor: TanreiPaint,
    railWidth: CGFloat,
    rowIndent: CGFloat,
    rowPaddingInline: CGFloat,
    rowShape: CGFloat,
    titleColor: TanreiPaint,
    titleTypescale: TanreiTextStyle,
    parts: TanreiTableOfContentsParts,
    densitys: TanreiTableOfContentsDensitys,
    hovered: TanreiTableOfContentsStateTokens,
    focused: TanreiTableOfContentsStateTokens,
    pressed: TanreiTableOfContentsStateTokens
  ) {
    self.compactContainerColor = compactContainerColor
    self.compactContainerShape = compactContainerShape
    self.compactIconColor = compactIconColor
    self.compactIconSize = compactIconSize
    self.compactListPaddingBlock = compactListPaddingBlock
    self.compactListPaddingInline = compactListPaddingInline
    self.compactRowGap = compactRowGap
    self.compactRowHeight = compactRowHeight
    self.compactRowPaddingInline = compactRowPaddingInline
    self.compactSupportingTextColor = compactSupportingTextColor
    self.compactSupportingTextTypescale = compactSupportingTextTypescale
    self.containerGap = containerGap
    self.labelTypescale = labelTypescale
    self.markerColor = markerColor
    self.markerWidth = markerWidth
    self.motionDisclosureDuration = motionDisclosureDuration
    self.motionDisclosureEasing = motionDisclosureEasing
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.railColor = railColor
    self.railWidth = railWidth
    self.rowIndent = rowIndent
    self.rowPaddingInline = rowPaddingInline
    self.rowShape = rowShape
    self.titleColor = titleColor
    self.titleTypescale = titleTypescale
    self.parts = parts
    self.densitys = densitys
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, `disabled`, which table-of-contents has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiTableOfContentsStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return nil
    }
  }
}

/// A value of table's `part` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiTablePart(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiTablePart: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let sort = TanreiTablePart(rawValue: "sort")
  public static let sorted = TanreiTablePart(rawValue: "sorted")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiTablePart] = [.sort, .sorted]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiTablePart.sort
}

/// How one part of table is drawn in one state.
public struct TanreiTablePartStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var labelColor: TanreiPaint
  public var iconColor: TanreiPaint
  public var stateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    labelColor: TanreiPaint,
    iconColor: TanreiPaint,
    stateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.labelColor = labelColor
    self.iconColor = iconColor
    self.stateLayerColor = stateLayerColor
  }
}

/// One part of table: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiTablePartTokens: Sendable, Equatable {
  public var enabled: TanreiTablePartStateTokens
  public var hovered: TanreiTablePartStateTokens
  public var focused: TanreiTablePartStateTokens
  public var pressed: TanreiTablePartStateTokens

  public init(
    enabled: TanreiTablePartStateTokens,
    hovered: TanreiTablePartStateTokens,
    focused: TanreiTablePartStateTokens,
    pressed: TanreiTablePartStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
  }

  /// The tokens of this part of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `disabled`, which table has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiTablePartStateTokens? {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return nil
    }
  }
}

/// The parts of table: named fields for the core values, `extra` for what a design system added.
/// Read one with `parts[key]`.
public struct TanreiTableParts: Sendable, Equatable {
  public var sort: TanreiTablePartTokens
  public var sorted: TanreiTablePartTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiTablePart: TanreiTablePartTokens]

  public init(
    sort: TanreiTablePartTokens,
    sorted: TanreiTablePartTokens,
    extra: [TanreiTablePart: TanreiTablePartTokens] = [:]
  ) {
    self.sort = sort
    self.sorted = sorted
    self.extra = extra
  }

  /// The tokens of one table part, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiTablePart) -> TanreiTablePartTokens? {
    switch key {
    case .sort: return sort
    case .sorted: return sorted
    default: return extra[key]
    }
  }

  /// Total lookup: a table part this design system does not have reads the tokens of `sort`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiTablePart) -> TanreiTablePartTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no table part \"\(key.rawValue)\"; using \"sort\"")
    return sort
  }

  /// Every table part of this design system: the core ones, then what it added.
  public var keys: [TanreiTablePart] { TanreiTablePart.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of table's `density` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiTableDensity(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiTableDensity: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let regular = TanreiTableDensity(rawValue: "regular")
  public static let compact = TanreiTableDensity(rawValue: "compact")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiTableDensity] = [.regular, .compact]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiTableDensity.regular
}

/// Everything of table that depends on its density.
public struct TanreiTableDensityTokens: Sendable, Equatable {
  public var cellPaddingBlock: CGFloat
  public var cellPaddingInline: CGFloat
  public var cellTextTypescale: TanreiTextStyle
  public var headerTextTypescale: TanreiTextStyle

  public init(
    cellPaddingBlock: CGFloat,
    cellPaddingInline: CGFloat,
    cellTextTypescale: TanreiTextStyle,
    headerTextTypescale: TanreiTextStyle
  ) {
    self.cellPaddingBlock = cellPaddingBlock
    self.cellPaddingInline = cellPaddingInline
    self.cellTextTypescale = cellTextTypescale
    self.headerTextTypescale = headerTextTypescale
  }
}

/// The densitys of table: named fields for the core values, `extra` for what a design system added.
/// Read one with `densitys[key]`.
public struct TanreiTableDensitys: Sendable, Equatable {
  public var regular: TanreiTableDensityTokens
  public var compact: TanreiTableDensityTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiTableDensity: TanreiTableDensityTokens]

  public init(
    regular: TanreiTableDensityTokens,
    compact: TanreiTableDensityTokens,
    extra: [TanreiTableDensity: TanreiTableDensityTokens] = [:]
  ) {
    self.regular = regular
    self.compact = compact
    self.extra = extra
  }

  /// The tokens of one table density, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiTableDensity) -> TanreiTableDensityTokens? {
    switch key {
    case .regular: return regular
    case .compact: return compact
    default: return extra[key]
    }
  }

  /// Total lookup: a table density this design system does not have reads the tokens of `regular`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiTableDensity) -> TanreiTableDensityTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no table density \"\(key.rawValue)\"; using \"regular\"")
    return regular
  }

  /// Every table density of this design system: the core ones, then what it added.
  public var keys: [TanreiTableDensity] { TanreiTableDensity.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of table that depend on the state but not on the variant.
public struct TanreiTableStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of table (comp.table).
public struct TanreiTableTokens: Sendable, Equatable {
  public var captionGap: CGFloat
  public var captionTextColor: TanreiPaint
  public var captionTextTypescale: TanreiTextStyle
  public var cellTextColor: TanreiPaint
  public var dividerColor: TanreiPaint
  public var dividerThickness: CGFloat
  public var emptyPaddingBlock: CGFloat
  public var headerContainerColor: TanreiPaint
  public var headerGap: CGFloat
  public var headerIconSize: CGFloat
  public var headerIconWeight: Double
  public var headerTextColor: TanreiPaint
  public var motionFeedbackDuration: Double
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var rowGap: CGFloat
  public var rowSelectedContainerColor: TanreiPaint
  public var rowSelectedTextColor: TanreiPaint
  public var separation: Double
  public var statusGap: CGFloat
  public var statusPaddingBlock: CGFloat
  public var statusTextColor: TanreiPaint
  public var statusTextTypescale: TanreiTextStyle
  public var stickyContainerColor: TanreiPaint
  public var stripeContainerColor: TanreiPaint
  public var parts: TanreiTableParts
  public var densitys: TanreiTableDensitys
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiTableStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiTableStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiTableStateTokens

  public init(
    captionGap: CGFloat,
    captionTextColor: TanreiPaint,
    captionTextTypescale: TanreiTextStyle,
    cellTextColor: TanreiPaint,
    dividerColor: TanreiPaint,
    dividerThickness: CGFloat,
    emptyPaddingBlock: CGFloat,
    headerContainerColor: TanreiPaint,
    headerGap: CGFloat,
    headerIconSize: CGFloat,
    headerIconWeight: Double,
    headerTextColor: TanreiPaint,
    motionFeedbackDuration: Double,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    rowGap: CGFloat,
    rowSelectedContainerColor: TanreiPaint,
    rowSelectedTextColor: TanreiPaint,
    separation: Double,
    statusGap: CGFloat,
    statusPaddingBlock: CGFloat,
    statusTextColor: TanreiPaint,
    statusTextTypescale: TanreiTextStyle,
    stickyContainerColor: TanreiPaint,
    stripeContainerColor: TanreiPaint,
    parts: TanreiTableParts,
    densitys: TanreiTableDensitys,
    hovered: TanreiTableStateTokens,
    focused: TanreiTableStateTokens,
    pressed: TanreiTableStateTokens
  ) {
    self.captionGap = captionGap
    self.captionTextColor = captionTextColor
    self.captionTextTypescale = captionTextTypescale
    self.cellTextColor = cellTextColor
    self.dividerColor = dividerColor
    self.dividerThickness = dividerThickness
    self.emptyPaddingBlock = emptyPaddingBlock
    self.headerContainerColor = headerContainerColor
    self.headerGap = headerGap
    self.headerIconSize = headerIconSize
    self.headerIconWeight = headerIconWeight
    self.headerTextColor = headerTextColor
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.rowGap = rowGap
    self.rowSelectedContainerColor = rowSelectedContainerColor
    self.rowSelectedTextColor = rowSelectedTextColor
    self.separation = separation
    self.statusGap = statusGap
    self.statusPaddingBlock = statusPaddingBlock
    self.statusTextColor = statusTextColor
    self.statusTextTypescale = statusTextTypescale
    self.stickyContainerColor = stickyContainerColor
    self.stripeContainerColor = stripeContainerColor
    self.parts = parts
    self.densitys = densitys
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, `disabled`, which table has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiTableStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return nil
    }
  }
}

/// A value of tabs's `variant` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiTabsVariant(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiTabsVariant: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let primary = TanreiTabsVariant(rawValue: "primary")
  public static let secondary = TanreiTabsVariant(rawValue: "secondary")
  public static let tonal = TanreiTabsVariant(rawValue: "tonal")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiTabsVariant] = [.primary, .secondary, .tonal]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiTabsVariant.primary
}

/// How one variant of tabs is drawn in one state.
public struct TanreiTabsVariantStateTokens: Sendable, Equatable {
  public var trackColor: TanreiPaint
  public var containerColor: TanreiPaint
  public var labelColor: TanreiPaint
  public var iconColor: TanreiPaint
  public var coveredLabelColor: TanreiPaint
  public var coveredIconColor: TanreiPaint
  public var activeIndicatorColor: TanreiPaint
  public var activeIndicatorThickness: CGFloat
  public var activeIndicatorShape: CGFloat
  public var underlineColor: TanreiPaint
  public var underlineThickness: CGFloat
  public var underlineShape: CGFloat
  public var stateLayerColor: TanreiPaint
  public var selectedContainerColor: TanreiPaint
  public var selectedLabelColor: TanreiPaint
  public var selectedIconColor: TanreiPaint
  public var selectedCoveredLabelColor: TanreiPaint
  public var selectedCoveredIconColor: TanreiPaint
  public var selectedActiveIndicatorColor: TanreiPaint
  public var selectedUnderlineColor: TanreiPaint
  public var selectedStateLayerColor: TanreiPaint

  public init(
    trackColor: TanreiPaint,
    containerColor: TanreiPaint,
    labelColor: TanreiPaint,
    iconColor: TanreiPaint,
    coveredLabelColor: TanreiPaint,
    coveredIconColor: TanreiPaint,
    activeIndicatorColor: TanreiPaint,
    activeIndicatorThickness: CGFloat,
    activeIndicatorShape: CGFloat,
    underlineColor: TanreiPaint,
    underlineThickness: CGFloat,
    underlineShape: CGFloat,
    stateLayerColor: TanreiPaint,
    selectedContainerColor: TanreiPaint,
    selectedLabelColor: TanreiPaint,
    selectedIconColor: TanreiPaint,
    selectedCoveredLabelColor: TanreiPaint,
    selectedCoveredIconColor: TanreiPaint,
    selectedActiveIndicatorColor: TanreiPaint,
    selectedUnderlineColor: TanreiPaint,
    selectedStateLayerColor: TanreiPaint
  ) {
    self.trackColor = trackColor
    self.containerColor = containerColor
    self.labelColor = labelColor
    self.iconColor = iconColor
    self.coveredLabelColor = coveredLabelColor
    self.coveredIconColor = coveredIconColor
    self.activeIndicatorColor = activeIndicatorColor
    self.activeIndicatorThickness = activeIndicatorThickness
    self.activeIndicatorShape = activeIndicatorShape
    self.underlineColor = underlineColor
    self.underlineThickness = underlineThickness
    self.underlineShape = underlineShape
    self.stateLayerColor = stateLayerColor
    self.selectedContainerColor = selectedContainerColor
    self.selectedLabelColor = selectedLabelColor
    self.selectedIconColor = selectedIconColor
    self.selectedCoveredLabelColor = selectedCoveredLabelColor
    self.selectedCoveredIconColor = selectedCoveredIconColor
    self.selectedActiveIndicatorColor = selectedActiveIndicatorColor
    self.selectedUnderlineColor = selectedUnderlineColor
    self.selectedStateLayerColor = selectedStateLayerColor
  }
}

/// One variant of tabs: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiTabsVariantTokens: Sendable, Equatable {
  public var enabled: TanreiTabsVariantStateTokens
  public var hovered: TanreiTabsVariantStateTokens
  public var focused: TanreiTabsVariantStateTokens
  public var pressed: TanreiTabsVariantStateTokens
  public var disabled: TanreiTabsVariantStateTokens

  public init(
    enabled: TanreiTabsVariantStateTokens,
    hovered: TanreiTabsVariantStateTokens,
    focused: TanreiTabsVariantStateTokens,
    pressed: TanreiTabsVariantStateTokens,
    disabled: TanreiTabsVariantStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiTabsVariantStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The variants of tabs: named fields for the core values, `extra` for what a design system added.
/// Read one with `variants[key]`.
public struct TanreiTabsVariants: Sendable, Equatable {
  public var primary: TanreiTabsVariantTokens
  public var secondary: TanreiTabsVariantTokens
  public var tonal: TanreiTabsVariantTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiTabsVariant: TanreiTabsVariantTokens]

  public init(
    primary: TanreiTabsVariantTokens,
    secondary: TanreiTabsVariantTokens,
    tonal: TanreiTabsVariantTokens,
    extra: [TanreiTabsVariant: TanreiTabsVariantTokens] = [:]
  ) {
    self.primary = primary
    self.secondary = secondary
    self.tonal = tonal
    self.extra = extra
  }

  /// The tokens of one tabs variant, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiTabsVariant) -> TanreiTabsVariantTokens? {
    switch key {
    case .primary: return primary
    case .secondary: return secondary
    case .tonal: return tonal
    default: return extra[key]
    }
  }

  /// Total lookup: a tabs variant this design system does not have reads the tokens of `primary`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiTabsVariant) -> TanreiTabsVariantTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no tabs variant \"\(key.rawValue)\"; using \"primary\"")
    return primary
  }

  /// Every tabs variant of this design system: the core ones, then what it added.
  public var keys: [TanreiTabsVariant] { TanreiTabsVariant.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of tabs's `size` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiTabsSize(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiTabsSize: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let small = TanreiTabsSize(rawValue: "small")
  public static let medium = TanreiTabsSize(rawValue: "medium")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiTabsSize] = [.small, .medium]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiTabsSize.medium
}

/// Everything of tabs that depends on its size.
public struct TanreiTabsSizeTokens: Sendable, Equatable {
  public var containerHeight: CGFloat
  public var containerPaddingInline: CGFloat
  public var activeIndicatorPaddingInline: CGFloat
  public var activeIndicatorPaddingBlock: CGFloat
  public var iconSize: CGFloat

  public init(
    containerHeight: CGFloat,
    containerPaddingInline: CGFloat,
    activeIndicatorPaddingInline: CGFloat,
    activeIndicatorPaddingBlock: CGFloat,
    iconSize: CGFloat
  ) {
    self.containerHeight = containerHeight
    self.containerPaddingInline = containerPaddingInline
    self.activeIndicatorPaddingInline = activeIndicatorPaddingInline
    self.activeIndicatorPaddingBlock = activeIndicatorPaddingBlock
    self.iconSize = iconSize
  }
}

/// The sizes of tabs: named fields for the core values, `extra` for what a design system added.
/// Read one with `sizes[key]`.
public struct TanreiTabsSizes: Sendable, Equatable {
  public var small: TanreiTabsSizeTokens
  public var medium: TanreiTabsSizeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiTabsSize: TanreiTabsSizeTokens]

  public init(
    small: TanreiTabsSizeTokens,
    medium: TanreiTabsSizeTokens,
    extra: [TanreiTabsSize: TanreiTabsSizeTokens] = [:]
  ) {
    self.small = small
    self.medium = medium
    self.extra = extra
  }

  /// The tokens of one tabs size, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiTabsSize) -> TanreiTabsSizeTokens? {
    switch key {
    case .small: return small
    case .medium: return medium
    default: return extra[key]
    }
  }

  /// Total lookup: a tabs size this design system does not have reads the tokens of `medium`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiTabsSize) -> TanreiTabsSizeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no tabs size \"\(key.rawValue)\"; using \"medium\"")
    return medium
  }

  /// Every tabs size of this design system: the core ones, then what it added.
  public var keys: [TanreiTabsSize] { TanreiTabsSize.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of tabs that depend on the state but not on the variant.
public struct TanreiTabsStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of tabs (comp.tabs).
public struct TanreiTabsTokens: Sendable, Equatable {
  public var activeIndicatorHeight: CGFloat
  public var containerGap: CGFloat
  public var containerHeightWithIcon: CGFloat
  public var containerShape: CGFloat
  public var dividerColor: TanreiPaint
  public var dividerThickness: CGFloat
  public var labelTypescale: TanreiTextStyle
  public var motionFeedbackDuration: Double
  public var motionIndicatorDuration: Double
  public var motionIndicatorEasing: TanreiCubicBezier
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var motionTransition: Double
  public var trackPadding: CGFloat
  public var trackShape: CGFloat
  public var trackVisible: Double
  public var variants: TanreiTabsVariants
  public var sizes: TanreiTabsSizes
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiTabsStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiTabsStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiTabsStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiTabsStateTokens

  public init(
    activeIndicatorHeight: CGFloat,
    containerGap: CGFloat,
    containerHeightWithIcon: CGFloat,
    containerShape: CGFloat,
    dividerColor: TanreiPaint,
    dividerThickness: CGFloat,
    labelTypescale: TanreiTextStyle,
    motionFeedbackDuration: Double,
    motionIndicatorDuration: Double,
    motionIndicatorEasing: TanreiCubicBezier,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    motionTransition: Double,
    trackPadding: CGFloat,
    trackShape: CGFloat,
    trackVisible: Double,
    variants: TanreiTabsVariants,
    sizes: TanreiTabsSizes,
    hovered: TanreiTabsStateTokens,
    focused: TanreiTabsStateTokens,
    pressed: TanreiTabsStateTokens,
    disabled: TanreiTabsStateTokens
  ) {
    self.activeIndicatorHeight = activeIndicatorHeight
    self.containerGap = containerGap
    self.containerHeightWithIcon = containerHeightWithIcon
    self.containerShape = containerShape
    self.dividerColor = dividerColor
    self.dividerThickness = dividerThickness
    self.labelTypescale = labelTypescale
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionIndicatorDuration = motionIndicatorDuration
    self.motionIndicatorEasing = motionIndicatorEasing
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.motionTransition = motionTransition
    self.trackPadding = trackPadding
    self.trackShape = trackShape
    self.trackVisible = trackVisible
    self.variants = variants
    self.sizes = sizes
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which tabs has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiTabsStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// A value of tag-group's `spacing` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiTagGroupSpacing(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiTagGroupSpacing: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let tags = TanreiTagGroupSpacing(rawValue: "tags")
  public static let chips = TanreiTagGroupSpacing(rawValue: "chips")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiTagGroupSpacing] = [.tags, .chips]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiTagGroupSpacing.tags
}

/// Everything of tag-group that depends on its spacing.
public struct TanreiTagGroupSpacingTokens: Sendable, Equatable {
  public var gap: CGFloat
  public var rowGap: CGFloat

  public init(
    gap: CGFloat,
    rowGap: CGFloat
  ) {
    self.gap = gap
    self.rowGap = rowGap
  }
}

/// The spacings of tag-group: named fields for the core values, `extra` for what a design system added.
/// Read one with `spacings[key]`.
public struct TanreiTagGroupSpacings: Sendable, Equatable {
  public var tags: TanreiTagGroupSpacingTokens
  public var chips: TanreiTagGroupSpacingTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiTagGroupSpacing: TanreiTagGroupSpacingTokens]

  public init(
    tags: TanreiTagGroupSpacingTokens,
    chips: TanreiTagGroupSpacingTokens,
    extra: [TanreiTagGroupSpacing: TanreiTagGroupSpacingTokens] = [:]
  ) {
    self.tags = tags
    self.chips = chips
    self.extra = extra
  }

  /// The tokens of one tag-group spacing, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiTagGroupSpacing) -> TanreiTagGroupSpacingTokens? {
    switch key {
    case .tags: return tags
    case .chips: return chips
    default: return extra[key]
    }
  }

  /// Total lookup: a tag-group spacing this design system does not have reads the tokens of `tags`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiTagGroupSpacing) -> TanreiTagGroupSpacingTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no tag-group spacing \"\(key.rawValue)\"; using \"tags\"")
    return tags
  }

  /// Every tag-group spacing of this design system: the core ones, then what it added.
  public var keys: [TanreiTagGroupSpacing] { TanreiTagGroupSpacing.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Component tokens of tag-group (comp.tag-group).
public struct TanreiTagGroupTokens: Sendable, Equatable {
  public var spacings: TanreiTagGroupSpacings

  public init(
    spacings: TanreiTagGroupSpacings
  ) {
    self.spacings = spacings
  }
}

/// A value of tag's `size` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiTagSize(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiTagSize: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let small = TanreiTagSize(rawValue: "small")
  public static let medium = TanreiTagSize(rawValue: "medium")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiTagSize] = [.small, .medium]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiTagSize.medium
}

/// Everything of tag that depends on its size.
public struct TanreiTagSizeTokens: Sendable, Equatable {
  public var containerHeight: CGFloat
  public var containerPaddingInline: CGFloat
  public var containerPaddingInlineWithIcon: CGFloat
  public var containerPaddingBlock: CGFloat
  public var labelTypescale: TanreiTextStyle

  public init(
    containerHeight: CGFloat,
    containerPaddingInline: CGFloat,
    containerPaddingInlineWithIcon: CGFloat,
    containerPaddingBlock: CGFloat,
    labelTypescale: TanreiTextStyle
  ) {
    self.containerHeight = containerHeight
    self.containerPaddingInline = containerPaddingInline
    self.containerPaddingInlineWithIcon = containerPaddingInlineWithIcon
    self.containerPaddingBlock = containerPaddingBlock
    self.labelTypescale = labelTypescale
  }
}

/// The sizes of tag: named fields for the core values, `extra` for what a design system added.
/// Read one with `sizes[key]`.
public struct TanreiTagSizes: Sendable, Equatable {
  public var small: TanreiTagSizeTokens
  public var medium: TanreiTagSizeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiTagSize: TanreiTagSizeTokens]

  public init(
    small: TanreiTagSizeTokens,
    medium: TanreiTagSizeTokens,
    extra: [TanreiTagSize: TanreiTagSizeTokens] = [:]
  ) {
    self.small = small
    self.medium = medium
    self.extra = extra
  }

  /// The tokens of one tag size, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiTagSize) -> TanreiTagSizeTokens? {
    switch key {
    case .small: return small
    case .medium: return medium
    default: return extra[key]
    }
  }

  /// Total lookup: a tag size this design system does not have reads the tokens of `medium`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiTagSize) -> TanreiTagSizeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no tag size \"\(key.rawValue)\"; using \"medium\"")
    return medium
  }

  /// Every tag size of this design system: the core ones, then what it added.
  public var keys: [TanreiTagSize] { TanreiTagSize.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of tag's `variant` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiTagVariant(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiTagVariant: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let tonal = TanreiTagVariant(rawValue: "tonal")
  public static let outlined = TanreiTagVariant(rawValue: "outlined")
  public static let filled = TanreiTagVariant(rawValue: "filled")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiTagVariant] = [.tonal, .outlined, .filled]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiTagVariant.tonal
}

/// How one variant of tag is drawn in one state.
public struct TanreiTagVariantStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var labelColor: TanreiPaint
  public var iconColor: TanreiPaint
  public var infoContainerColor: TanreiPaint
  public var infoLabelColor: TanreiPaint
  public var infoIconColor: TanreiPaint
  public var warningContainerColor: TanreiPaint
  public var warningLabelColor: TanreiPaint
  public var warningIconColor: TanreiPaint
  public var errorContainerColor: TanreiPaint
  public var errorLabelColor: TanreiPaint
  public var errorIconColor: TanreiPaint
  public var successContainerColor: TanreiPaint
  public var successLabelColor: TanreiPaint
  public var successIconColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    labelColor: TanreiPaint,
    iconColor: TanreiPaint,
    infoContainerColor: TanreiPaint,
    infoLabelColor: TanreiPaint,
    infoIconColor: TanreiPaint,
    warningContainerColor: TanreiPaint,
    warningLabelColor: TanreiPaint,
    warningIconColor: TanreiPaint,
    errorContainerColor: TanreiPaint,
    errorLabelColor: TanreiPaint,
    errorIconColor: TanreiPaint,
    successContainerColor: TanreiPaint,
    successLabelColor: TanreiPaint,
    successIconColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.labelColor = labelColor
    self.iconColor = iconColor
    self.infoContainerColor = infoContainerColor
    self.infoLabelColor = infoLabelColor
    self.infoIconColor = infoIconColor
    self.warningContainerColor = warningContainerColor
    self.warningLabelColor = warningLabelColor
    self.warningIconColor = warningIconColor
    self.errorContainerColor = errorContainerColor
    self.errorLabelColor = errorLabelColor
    self.errorIconColor = errorIconColor
    self.successContainerColor = successContainerColor
    self.successLabelColor = successLabelColor
    self.successIconColor = successIconColor
  }
}

/// One variant of tag: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiTagVariantTokens: Sendable, Equatable {
  public var enabled: TanreiTagVariantStateTokens
  public var disabled: TanreiTagVariantStateTokens

  public init(
    enabled: TanreiTagVariantStateTokens,
    disabled: TanreiTagVariantStateTokens
  ) {
    self.enabled = enabled
    self.disabled = disabled
  }

  /// The tokens of this variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `hovered`, `focused`, `pressed`, which tag has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiTagVariantStateTokens? {
    switch state {
    case .enabled: return enabled
    case .hovered: return nil
    case .focused: return nil
    case .pressed: return nil
    case .disabled: return disabled
    }
  }
}

/// The variants of tag: named fields for the core values, `extra` for what a design system added.
/// Read one with `variants[key]`.
public struct TanreiTagVariants: Sendable, Equatable {
  public var tonal: TanreiTagVariantTokens
  public var outlined: TanreiTagVariantTokens
  public var filled: TanreiTagVariantTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiTagVariant: TanreiTagVariantTokens]

  public init(
    tonal: TanreiTagVariantTokens,
    outlined: TanreiTagVariantTokens,
    filled: TanreiTagVariantTokens,
    extra: [TanreiTagVariant: TanreiTagVariantTokens] = [:]
  ) {
    self.tonal = tonal
    self.outlined = outlined
    self.filled = filled
    self.extra = extra
  }

  /// The tokens of one tag variant, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiTagVariant) -> TanreiTagVariantTokens? {
    switch key {
    case .tonal: return tonal
    case .outlined: return outlined
    case .filled: return filled
    default: return extra[key]
    }
  }

  /// Total lookup: a tag variant this design system does not have reads the tokens of `tonal`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiTagVariant) -> TanreiTagVariantTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no tag variant \"\(key.rawValue)\"; using \"tonal\"")
    return tonal
  }

  /// Every tag variant of this design system: the core ones, then what it added.
  public var keys: [TanreiTagVariant] { TanreiTagVariant.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Component tokens of tag (comp.tag).
public struct TanreiTagTokens: Sendable, Equatable {
  public var containerGap: CGFloat
  public var containerShape: CGFloat
  public var dotSize: CGFloat
  public var iconSize: CGFloat
  public var outlineColor: TanreiPaint
  public var outlineWidth: CGFloat
  public var sizes: TanreiTagSizes
  public var variants: TanreiTagVariants

  public init(
    containerGap: CGFloat,
    containerShape: CGFloat,
    dotSize: CGFloat,
    iconSize: CGFloat,
    outlineColor: TanreiPaint,
    outlineWidth: CGFloat,
    sizes: TanreiTagSizes,
    variants: TanreiTagVariants
  ) {
    self.containerGap = containerGap
    self.containerShape = containerShape
    self.dotSize = dotSize
    self.iconSize = iconSize
    self.outlineColor = outlineColor
    self.outlineWidth = outlineWidth
    self.sizes = sizes
    self.variants = variants
  }
}

/// A value of text-input's `variant` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiTextInputVariant(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiTextInputVariant: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let stacked = TanreiTextInputVariant(rawValue: "stacked")
  public static let filled = TanreiTextInputVariant(rawValue: "filled")
  public static let outlined = TanreiTextInputVariant(rawValue: "outlined")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiTextInputVariant] = [.stacked, .filled, .outlined]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiTextInputVariant.stacked
}

/// How one variant of text-input is drawn in one state.
public struct TanreiTextInputVariantStateTokens: Sendable, Equatable {
  public var resizeGripColor: TanreiPaint
  public var errorResizeGripColor: TanreiPaint

  public init(
    resizeGripColor: TanreiPaint,
    errorResizeGripColor: TanreiPaint
  ) {
    self.resizeGripColor = resizeGripColor
    self.errorResizeGripColor = errorResizeGripColor
  }
}

/// One variant of text-input: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiTextInputVariantTokens: Sendable, Equatable {
  public var enabled: TanreiTextInputVariantStateTokens
  public var hovered: TanreiTextInputVariantStateTokens
  public var focused: TanreiTextInputVariantStateTokens
  public var disabled: TanreiTextInputVariantStateTokens

  public init(
    enabled: TanreiTextInputVariantStateTokens,
    hovered: TanreiTextInputVariantStateTokens,
    focused: TanreiTextInputVariantStateTokens,
    disabled: TanreiTextInputVariantStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.disabled = disabled
  }

  /// The tokens of this variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `pressed`, which text-input has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiTextInputVariantStateTokens? {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return nil
    case .disabled: return disabled
    }
  }
}

/// The variants of text-input: named fields for the core values, `extra` for what a design system added.
/// Read one with `variants[key]`.
public struct TanreiTextInputVariants: Sendable, Equatable {
  public var stacked: TanreiTextInputVariantTokens
  public var filled: TanreiTextInputVariantTokens
  public var outlined: TanreiTextInputVariantTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiTextInputVariant: TanreiTextInputVariantTokens]

  public init(
    stacked: TanreiTextInputVariantTokens,
    filled: TanreiTextInputVariantTokens,
    outlined: TanreiTextInputVariantTokens,
    extra: [TanreiTextInputVariant: TanreiTextInputVariantTokens] = [:]
  ) {
    self.stacked = stacked
    self.filled = filled
    self.outlined = outlined
    self.extra = extra
  }

  /// The tokens of one text-input variant, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiTextInputVariant) -> TanreiTextInputVariantTokens? {
    switch key {
    case .stacked: return stacked
    case .filled: return filled
    case .outlined: return outlined
    default: return extra[key]
    }
  }

  /// Total lookup: a text-input variant this design system does not have reads the tokens of `stacked`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiTextInputVariant) -> TanreiTextInputVariantTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no text-input variant \"\(key.rawValue)\"; using \"stacked\"")
    return stacked
  }

  /// Every text-input variant of this design system: the core ones, then what it added.
  public var keys: [TanreiTextInputVariant] { TanreiTextInputVariant.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Component tokens of text-input (comp.text-input).
public struct TanreiTextInputTokens: Sendable, Equatable {
  public var codeTabSize: Double
  public var codeTypescale: TanreiTextStyle
  public var entriesGap: CGFloat
  public var entriesRowGap: CGFloat
  public var entriesTypingMinWidth: CGFloat
  public var motionResizeDuration: Double
  public var motionResizeEasing: TanreiCubicBezier
  public var resizeGripInset: CGFloat
  public var resizeGripSize: CGFloat
  public var segmentPaddingInline: CGFloat
  public var variants: TanreiTextInputVariants

  public init(
    codeTabSize: Double,
    codeTypescale: TanreiTextStyle,
    entriesGap: CGFloat,
    entriesRowGap: CGFloat,
    entriesTypingMinWidth: CGFloat,
    motionResizeDuration: Double,
    motionResizeEasing: TanreiCubicBezier,
    resizeGripInset: CGFloat,
    resizeGripSize: CGFloat,
    segmentPaddingInline: CGFloat,
    variants: TanreiTextInputVariants
  ) {
    self.codeTabSize = codeTabSize
    self.codeTypescale = codeTypescale
    self.entriesGap = entriesGap
    self.entriesRowGap = entriesRowGap
    self.entriesTypingMinWidth = entriesTypingMinWidth
    self.motionResizeDuration = motionResizeDuration
    self.motionResizeEasing = motionResizeEasing
    self.resizeGripInset = resizeGripInset
    self.resizeGripSize = resizeGripSize
    self.segmentPaddingInline = segmentPaddingInline
    self.variants = variants
  }
}

/// A value of timeline's `size` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiTimelineSize(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiTimelineSize: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let medium = TanreiTimelineSize(rawValue: "medium")
  public static let large = TanreiTimelineSize(rawValue: "large")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiTimelineSize] = [.medium, .large]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiTimelineSize.medium
}

/// Everything of timeline that depends on its size.
public struct TanreiTimelineSizeTokens: Sendable, Equatable {
  public var markerHeight: CGFloat
  public var timeTypescale: TanreiTextStyle
  public var titleTypescale: TanreiTextStyle
  public var bodyTypescale: TanreiTextStyle

  public init(
    markerHeight: CGFloat,
    timeTypescale: TanreiTextStyle,
    titleTypescale: TanreiTextStyle,
    bodyTypescale: TanreiTextStyle
  ) {
    self.markerHeight = markerHeight
    self.timeTypescale = timeTypescale
    self.titleTypescale = titleTypescale
    self.bodyTypescale = bodyTypescale
  }
}

/// The sizes of timeline: named fields for the core values, `extra` for what a design system added.
/// Read one with `sizes[key]`.
public struct TanreiTimelineSizes: Sendable, Equatable {
  public var medium: TanreiTimelineSizeTokens
  public var large: TanreiTimelineSizeTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiTimelineSize: TanreiTimelineSizeTokens]

  public init(
    medium: TanreiTimelineSizeTokens,
    large: TanreiTimelineSizeTokens,
    extra: [TanreiTimelineSize: TanreiTimelineSizeTokens] = [:]
  ) {
    self.medium = medium
    self.large = large
    self.extra = extra
  }

  /// The tokens of one timeline size, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiTimelineSize) -> TanreiTimelineSizeTokens? {
    switch key {
    case .medium: return medium
    case .large: return large
    default: return extra[key]
    }
  }

  /// Total lookup: a timeline size this design system does not have reads the tokens of `medium`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiTimelineSize) -> TanreiTimelineSizeTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no timeline size \"\(key.rawValue)\"; using \"medium\"")
    return medium
  }

  /// Every timeline size of this design system: the core ones, then what it added.
  public var keys: [TanreiTimelineSize] { TanreiTimelineSize.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of timeline's `density` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiTimelineDensity(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiTimelineDensity: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let regular = TanreiTimelineDensity(rawValue: "regular")
  public static let compact = TanreiTimelineDensity(rawValue: "compact")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiTimelineDensity] = [.regular, .compact]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiTimelineDensity.regular
}

/// Everything of timeline that depends on its density.
public struct TanreiTimelineDensityTokens: Sendable, Equatable {
  public var itemGap: CGFloat

  public init(
    itemGap: CGFloat
  ) {
    self.itemGap = itemGap
  }
}

/// The densitys of timeline: named fields for the core values, `extra` for what a design system added.
/// Read one with `densitys[key]`.
public struct TanreiTimelineDensitys: Sendable, Equatable {
  public var regular: TanreiTimelineDensityTokens
  public var compact: TanreiTimelineDensityTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiTimelineDensity: TanreiTimelineDensityTokens]

  public init(
    regular: TanreiTimelineDensityTokens,
    compact: TanreiTimelineDensityTokens,
    extra: [TanreiTimelineDensity: TanreiTimelineDensityTokens] = [:]
  ) {
    self.regular = regular
    self.compact = compact
    self.extra = extra
  }

  /// The tokens of one timeline density, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiTimelineDensity) -> TanreiTimelineDensityTokens? {
    switch key {
    case .regular: return regular
    case .compact: return compact
    default: return extra[key]
    }
  }

  /// Total lookup: a timeline density this design system does not have reads the tokens of `regular`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiTimelineDensity) -> TanreiTimelineDensityTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no timeline density \"\(key.rawValue)\"; using \"regular\"")
    return regular
  }

  /// Every timeline density of this design system: the core ones, then what it added.
  public var keys: [TanreiTimelineDensity] { TanreiTimelineDensity.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Component tokens of timeline (comp.timeline).
public struct TanreiTimelineTokens: Sendable, Equatable {
  public var bodyGap: CGFloat
  public var connectorColor: TanreiPaint
  public var connectorGap: CGFloat
  public var connectorThickness: CGFloat
  public var markerCurrentContainerColor: TanreiPaint
  public var markerCurrentIconColor: TanreiPaint
  public var markerDotColor: TanreiPaint
  public var markerDotSize: CGFloat
  public var markerGap: CGFloat
  public var markerIconColor: TanreiPaint
  public var markerIconSize: CGFloat
  public var markerOutlineColor: TanreiPaint
  public var markerOutlineWidth: CGFloat
  public var markerShape: CGFloat
  public var timeColor: TanreiPaint
  public var timeGap: CGFloat
  public var titleGap: CGFloat
  public var sizes: TanreiTimelineSizes
  public var densitys: TanreiTimelineDensitys

  public init(
    bodyGap: CGFloat,
    connectorColor: TanreiPaint,
    connectorGap: CGFloat,
    connectorThickness: CGFloat,
    markerCurrentContainerColor: TanreiPaint,
    markerCurrentIconColor: TanreiPaint,
    markerDotColor: TanreiPaint,
    markerDotSize: CGFloat,
    markerGap: CGFloat,
    markerIconColor: TanreiPaint,
    markerIconSize: CGFloat,
    markerOutlineColor: TanreiPaint,
    markerOutlineWidth: CGFloat,
    markerShape: CGFloat,
    timeColor: TanreiPaint,
    timeGap: CGFloat,
    titleGap: CGFloat,
    sizes: TanreiTimelineSizes,
    densitys: TanreiTimelineDensitys
  ) {
    self.bodyGap = bodyGap
    self.connectorColor = connectorColor
    self.connectorGap = connectorGap
    self.connectorThickness = connectorThickness
    self.markerCurrentContainerColor = markerCurrentContainerColor
    self.markerCurrentIconColor = markerCurrentIconColor
    self.markerDotColor = markerDotColor
    self.markerDotSize = markerDotSize
    self.markerGap = markerGap
    self.markerIconColor = markerIconColor
    self.markerIconSize = markerIconSize
    self.markerOutlineColor = markerOutlineColor
    self.markerOutlineWidth = markerOutlineWidth
    self.markerShape = markerShape
    self.timeColor = timeColor
    self.timeGap = timeGap
    self.titleGap = titleGap
    self.sizes = sizes
    self.densitys = densitys
  }
}

/// A value of toolbar's `variant` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiToolbarVariant(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiToolbarVariant: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let docked = TanreiToolbarVariant(rawValue: "docked")
  public static let floating = TanreiToolbarVariant(rawValue: "floating")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiToolbarVariant] = [.docked, .floating]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiToolbarVariant.docked
}

/// Everything of toolbar that depends on its variant.
public struct TanreiToolbarVariantTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var containerElevation: [TanreiShadowLayer]
  public var containerShape: CGFloat
  public var containerSize: CGFloat
  public var containerPaddingInline: CGFloat
  public var containerGap: CGFloat
  public var outlineColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    containerElevation: [TanreiShadowLayer],
    containerShape: CGFloat,
    containerSize: CGFloat,
    containerPaddingInline: CGFloat,
    containerGap: CGFloat,
    outlineColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.containerElevation = containerElevation
    self.containerShape = containerShape
    self.containerSize = containerSize
    self.containerPaddingInline = containerPaddingInline
    self.containerGap = containerGap
    self.outlineColor = outlineColor
  }
}

/// The variants of toolbar: named fields for the core values, `extra` for what a design system added.
/// Read one with `variants[key]`.
public struct TanreiToolbarVariants: Sendable, Equatable {
  public var docked: TanreiToolbarVariantTokens
  public var floating: TanreiToolbarVariantTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiToolbarVariant: TanreiToolbarVariantTokens]

  public init(
    docked: TanreiToolbarVariantTokens,
    floating: TanreiToolbarVariantTokens,
    extra: [TanreiToolbarVariant: TanreiToolbarVariantTokens] = [:]
  ) {
    self.docked = docked
    self.floating = floating
    self.extra = extra
  }

  /// The tokens of one toolbar variant, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiToolbarVariant) -> TanreiToolbarVariantTokens? {
    switch key {
    case .docked: return docked
    case .floating: return floating
    default: return extra[key]
    }
  }

  /// Total lookup: a toolbar variant this design system does not have reads the tokens of `docked`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiToolbarVariant) -> TanreiToolbarVariantTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no toolbar variant \"\(key.rawValue)\"; using \"docked\"")
    return docked
  }

  /// Every toolbar variant of this design system: the core ones, then what it added.
  public var keys: [TanreiToolbarVariant] { TanreiToolbarVariant.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Component tokens of toolbar (comp.toolbar).
public struct TanreiToolbarTokens: Sendable, Equatable {
  public var outlineWidth: CGFloat
  public var variants: TanreiToolbarVariants

  public init(
    outlineWidth: CGFloat,
    variants: TanreiToolbarVariants
  ) {
    self.outlineWidth = outlineWidth
    self.variants = variants
  }
}

/// Component tokens of tooltip (comp.tooltip).
public struct TanreiTooltipTokens: Sendable, Equatable {
  public var arrowHeight: CGFloat
  public var arrowInset: CGFloat
  public var arrowVisible: Double
  public var arrowWidth: CGFloat
  public var motionEnterDuration: Double
  public var motionEnterEasing: TanreiCubicBezier
  public var motionEnterOffset: CGFloat
  public var motionEnterScale: Double
  public var motionExitDuration: Double
  public var motionExitEasing: TanreiCubicBezier
  public var motionHideDelay: Double
  public var motionShowDelay: Double
  public var motionWarmDuration: Double
  public var offset: CGFloat
  public var plainContainerColor: TanreiPaint
  public var plainContainerElevation: [TanreiShadowLayer]
  public var plainContainerGap: CGFloat
  public var plainContainerInverse: Double
  public var plainContainerMaxWidth: CGFloat
  public var plainContainerMinHeight: CGFloat
  public var plainContainerPaddingBlock: CGFloat
  public var plainContainerPaddingInline: CGFloat
  public var plainContainerShape: CGFloat
  public var plainShortcutColor: TanreiPaint
  public var plainSupportingTextColor: TanreiPaint
  public var plainSupportingTextTypescale: TanreiTextStyle
  public var plainSurfaceContainerColor: TanreiPaint
  public var plainSurfaceContainerElevation: [TanreiShadowLayer]
  public var plainSurfaceShortcutColor: TanreiPaint
  public var plainSurfaceSupportingTextColor: TanreiPaint
  public var richContainerColor: TanreiPaint
  public var richContainerElevation: [TanreiShadowLayer]
  public var richContainerGap: CGFloat
  public var richContainerInverse: Double
  public var richContainerMaxWidth: CGFloat
  public var richContainerPaddingBlock: CGFloat
  public var richContainerPaddingInline: CGFloat
  public var richContainerShape: CGFloat
  public var richInverseContainerColor: TanreiPaint
  public var richInverseContainerElevation: [TanreiShadowLayer]
  public var richInverseSupportingTextColor: TanreiPaint
  public var richInverseTitleColor: TanreiPaint
  public var richSupportingTextColor: TanreiPaint
  public var richSupportingTextTypescale: TanreiTextStyle
  public var richTitleColor: TanreiPaint
  public var richTitleTypescale: TanreiTextStyle
  public var timeoutTouch: Double
  public var windowMargin: CGFloat

  public init(
    arrowHeight: CGFloat,
    arrowInset: CGFloat,
    arrowVisible: Double,
    arrowWidth: CGFloat,
    motionEnterDuration: Double,
    motionEnterEasing: TanreiCubicBezier,
    motionEnterOffset: CGFloat,
    motionEnterScale: Double,
    motionExitDuration: Double,
    motionExitEasing: TanreiCubicBezier,
    motionHideDelay: Double,
    motionShowDelay: Double,
    motionWarmDuration: Double,
    offset: CGFloat,
    plainContainerColor: TanreiPaint,
    plainContainerElevation: [TanreiShadowLayer],
    plainContainerGap: CGFloat,
    plainContainerInverse: Double,
    plainContainerMaxWidth: CGFloat,
    plainContainerMinHeight: CGFloat,
    plainContainerPaddingBlock: CGFloat,
    plainContainerPaddingInline: CGFloat,
    plainContainerShape: CGFloat,
    plainShortcutColor: TanreiPaint,
    plainSupportingTextColor: TanreiPaint,
    plainSupportingTextTypescale: TanreiTextStyle,
    plainSurfaceContainerColor: TanreiPaint,
    plainSurfaceContainerElevation: [TanreiShadowLayer],
    plainSurfaceShortcutColor: TanreiPaint,
    plainSurfaceSupportingTextColor: TanreiPaint,
    richContainerColor: TanreiPaint,
    richContainerElevation: [TanreiShadowLayer],
    richContainerGap: CGFloat,
    richContainerInverse: Double,
    richContainerMaxWidth: CGFloat,
    richContainerPaddingBlock: CGFloat,
    richContainerPaddingInline: CGFloat,
    richContainerShape: CGFloat,
    richInverseContainerColor: TanreiPaint,
    richInverseContainerElevation: [TanreiShadowLayer],
    richInverseSupportingTextColor: TanreiPaint,
    richInverseTitleColor: TanreiPaint,
    richSupportingTextColor: TanreiPaint,
    richSupportingTextTypescale: TanreiTextStyle,
    richTitleColor: TanreiPaint,
    richTitleTypescale: TanreiTextStyle,
    timeoutTouch: Double,
    windowMargin: CGFloat
  ) {
    self.arrowHeight = arrowHeight
    self.arrowInset = arrowInset
    self.arrowVisible = arrowVisible
    self.arrowWidth = arrowWidth
    self.motionEnterDuration = motionEnterDuration
    self.motionEnterEasing = motionEnterEasing
    self.motionEnterOffset = motionEnterOffset
    self.motionEnterScale = motionEnterScale
    self.motionExitDuration = motionExitDuration
    self.motionExitEasing = motionExitEasing
    self.motionHideDelay = motionHideDelay
    self.motionShowDelay = motionShowDelay
    self.motionWarmDuration = motionWarmDuration
    self.offset = offset
    self.plainContainerColor = plainContainerColor
    self.plainContainerElevation = plainContainerElevation
    self.plainContainerGap = plainContainerGap
    self.plainContainerInverse = plainContainerInverse
    self.plainContainerMaxWidth = plainContainerMaxWidth
    self.plainContainerMinHeight = plainContainerMinHeight
    self.plainContainerPaddingBlock = plainContainerPaddingBlock
    self.plainContainerPaddingInline = plainContainerPaddingInline
    self.plainContainerShape = plainContainerShape
    self.plainShortcutColor = plainShortcutColor
    self.plainSupportingTextColor = plainSupportingTextColor
    self.plainSupportingTextTypescale = plainSupportingTextTypescale
    self.plainSurfaceContainerColor = plainSurfaceContainerColor
    self.plainSurfaceContainerElevation = plainSurfaceContainerElevation
    self.plainSurfaceShortcutColor = plainSurfaceShortcutColor
    self.plainSurfaceSupportingTextColor = plainSurfaceSupportingTextColor
    self.richContainerColor = richContainerColor
    self.richContainerElevation = richContainerElevation
    self.richContainerGap = richContainerGap
    self.richContainerInverse = richContainerInverse
    self.richContainerMaxWidth = richContainerMaxWidth
    self.richContainerPaddingBlock = richContainerPaddingBlock
    self.richContainerPaddingInline = richContainerPaddingInline
    self.richContainerShape = richContainerShape
    self.richInverseContainerColor = richInverseContainerColor
    self.richInverseContainerElevation = richInverseContainerElevation
    self.richInverseSupportingTextColor = richInverseSupportingTextColor
    self.richInverseTitleColor = richInverseTitleColor
    self.richSupportingTextColor = richSupportingTextColor
    self.richSupportingTextTypescale = richSupportingTextTypescale
    self.richTitleColor = richTitleColor
    self.richTitleTypescale = richTitleTypescale
    self.timeoutTouch = timeoutTouch
    self.windowMargin = windowMargin
  }
}

/// A value of tree-view's `condition` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiTreeViewCondition(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiTreeViewCondition: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let unselected = TanreiTreeViewCondition(rawValue: "unselected")
  public static let selected = TanreiTreeViewCondition(rawValue: "selected")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiTreeViewCondition] = [.unselected, .selected]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiTreeViewCondition.unselected
}

/// How one condition of tree-view is drawn in one state.
public struct TanreiTreeViewConditionStateTokens: Sendable, Equatable {
  public var containerColor: TanreiPaint
  public var labelColor: TanreiPaint
  public var supportingTextColor: TanreiPaint
  public var trailingTextColor: TanreiPaint
  public var iconColor: TanreiPaint
  public var chevronColor: TanreiPaint
  public var stateLayerColor: TanreiPaint

  public init(
    containerColor: TanreiPaint,
    labelColor: TanreiPaint,
    supportingTextColor: TanreiPaint,
    trailingTextColor: TanreiPaint,
    iconColor: TanreiPaint,
    chevronColor: TanreiPaint,
    stateLayerColor: TanreiPaint
  ) {
    self.containerColor = containerColor
    self.labelColor = labelColor
    self.supportingTextColor = supportingTextColor
    self.trailingTextColor = trailingTextColor
    self.iconColor = iconColor
    self.chevronColor = chevronColor
    self.stateLayerColor = stateLayerColor
  }
}

/// One condition of tree-view: a complete set of values per state. A component draws a state from that
/// state's tokens and never computes how a state looks. Read one with `[state: …]`.
public struct TanreiTreeViewConditionTokens: Sendable, Equatable {
  public var enabled: TanreiTreeViewConditionStateTokens
  public var hovered: TanreiTreeViewConditionStateTokens
  public var focused: TanreiTreeViewConditionStateTokens
  public var pressed: TanreiTreeViewConditionStateTokens
  public var disabled: TanreiTreeViewConditionStateTokens

  public init(
    enabled: TanreiTreeViewConditionStateTokens,
    hovered: TanreiTreeViewConditionStateTokens,
    focused: TanreiTreeViewConditionStateTokens,
    pressed: TanreiTreeViewConditionStateTokens,
    disabled: TanreiTreeViewConditionStateTokens
  ) {
    self.enabled = enabled
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The tokens of this condition of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  public subscript(state state: TanreiInteraction) -> TanreiTreeViewConditionStateTokens {
    switch state {
    case .enabled: return enabled
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// The conditions of tree-view: named fields for the core values, `extra` for what a design system added.
/// Read one with `conditions[key]`.
public struct TanreiTreeViewConditions: Sendable, Equatable {
  public var unselected: TanreiTreeViewConditionTokens
  public var selected: TanreiTreeViewConditionTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiTreeViewCondition: TanreiTreeViewConditionTokens]

  public init(
    unselected: TanreiTreeViewConditionTokens,
    selected: TanreiTreeViewConditionTokens,
    extra: [TanreiTreeViewCondition: TanreiTreeViewConditionTokens] = [:]
  ) {
    self.unselected = unselected
    self.selected = selected
    self.extra = extra
  }

  /// The tokens of one tree-view condition, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiTreeViewCondition) -> TanreiTreeViewConditionTokens? {
    switch key {
    case .unselected: return unselected
    case .selected: return selected
    default: return extra[key]
    }
  }

  /// Total lookup: a tree-view condition this design system does not have reads the tokens of `unselected`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiTreeViewCondition) -> TanreiTreeViewConditionTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no tree-view condition \"\(key.rawValue)\"; using \"unselected\"")
    return unselected
  }

  /// Every tree-view condition of this design system: the core ones, then what it added.
  public var keys: [TanreiTreeViewCondition] { TanreiTreeViewCondition.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// A value of tree-view's `density` axis.
///
/// The set is open: the constants are the values every design system has; a value one system
/// adds is `TanreiTreeViewDensity(rawValue: "…")`, or the typed constant generated with that system.
public struct TanreiTreeViewDensity: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token key of the value, for example `"medium"`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }

  public static let regular = TanreiTreeViewDensity(rawValue: "regular")
  public static let compact = TanreiTreeViewDensity(rawValue: "compact")

  /// The values every design system has, in the order the component declares them.
  public static let core: [TanreiTreeViewDensity] = [.regular, .compact]
  /// The default: what a value the current design system does not have falls back to.
  public static let fallback = TanreiTreeViewDensity.regular
}

/// Everything of tree-view that depends on its density.
public struct TanreiTreeViewDensityTokens: Sendable, Equatable {
  public var containerHeight: CGFloat
  public var containerPaddingBlock: CGFloat
  public var containerPaddingInline: CGFloat
  public var containerGap: CGFloat
  public var levelIndent: CGFloat
  public var labelTypescale: TanreiTextStyle
  public var iconSize: CGFloat
  public var chevronSize: CGFloat

  public init(
    containerHeight: CGFloat,
    containerPaddingBlock: CGFloat,
    containerPaddingInline: CGFloat,
    containerGap: CGFloat,
    levelIndent: CGFloat,
    labelTypescale: TanreiTextStyle,
    iconSize: CGFloat,
    chevronSize: CGFloat
  ) {
    self.containerHeight = containerHeight
    self.containerPaddingBlock = containerPaddingBlock
    self.containerPaddingInline = containerPaddingInline
    self.containerGap = containerGap
    self.levelIndent = levelIndent
    self.labelTypescale = labelTypescale
    self.iconSize = iconSize
    self.chevronSize = chevronSize
  }
}

/// The densitys of tree-view: named fields for the core values, `extra` for what a design system added.
/// Read one with `densitys[key]`.
public struct TanreiTreeViewDensitys: Sendable, Equatable {
  public var regular: TanreiTreeViewDensityTokens
  public var compact: TanreiTreeViewDensityTokens
  /// What a design system added, by key. Empty in a system that adds nothing.
  public var extra: [TanreiTreeViewDensity: TanreiTreeViewDensityTokens]

  public init(
    regular: TanreiTreeViewDensityTokens,
    compact: TanreiTreeViewDensityTokens,
    extra: [TanreiTreeViewDensity: TanreiTreeViewDensityTokens] = [:]
  ) {
    self.regular = regular
    self.compact = compact
    self.extra = extra
  }

  /// The tokens of one tree-view density, core or added; `nil` when this design system does not have it.
  public func value(for key: TanreiTreeViewDensity) -> TanreiTreeViewDensityTokens? {
    switch key {
    case .regular: return regular
    case .compact: return compact
    default: return extra[key]
    }
  }

  /// Total lookup: a tree-view density this design system does not have reads the tokens of `regular`, the
  /// default, and is reported in debug builds only (`TanreiDiagnostics`).
  public subscript(key: TanreiTreeViewDensity) -> TanreiTreeViewDensityTokens {
    if let value = value(for: key) { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no tree-view density \"\(key.rawValue)\"; using \"regular\"")
    return regular
  }

  /// Every tree-view density of this design system: the core ones, then what it added.
  public var keys: [TanreiTreeViewDensity] { TanreiTreeViewDensity.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }
}

/// Values of tree-view that depend on the state but not on the variant.
public struct TanreiTreeViewStateTokens: Sendable, Equatable {
  public var opacity: Double

  public init(
    opacity: Double
  ) {
    self.opacity = opacity
  }
}

/// Component tokens of tree-view (comp.tree-view).
public struct TanreiTreeViewTokens: Sendable, Equatable {
  public var containerShape: CGFloat
  public var guideColor: TanreiPaint
  public var guideWidth: CGFloat
  public var motionDisclosureDuration: Double
  public var motionDisclosureEasing: TanreiCubicBezier
  public var motionFeedbackDuration: Double
  public var motionStateDuration: Double
  public var motionStateEasing: TanreiCubicBezier
  public var supportingTextTypescale: TanreiTextStyle
  public var trailingTextTypescale: TanreiTextStyle
  public var conditions: TanreiTreeViewConditions
  public var densitys: TanreiTreeViewDensitys
  /// Values of the hovered state shared by every variant.
  public var hovered: TanreiTreeViewStateTokens
  /// Values of the focused state shared by every variant.
  public var focused: TanreiTreeViewStateTokens
  /// Values of the pressed state shared by every variant.
  public var pressed: TanreiTreeViewStateTokens
  /// Values of the disabled state shared by every variant.
  public var disabled: TanreiTreeViewStateTokens

  public init(
    containerShape: CGFloat,
    guideColor: TanreiPaint,
    guideWidth: CGFloat,
    motionDisclosureDuration: Double,
    motionDisclosureEasing: TanreiCubicBezier,
    motionFeedbackDuration: Double,
    motionStateDuration: Double,
    motionStateEasing: TanreiCubicBezier,
    supportingTextTypescale: TanreiTextStyle,
    trailingTextTypescale: TanreiTextStyle,
    conditions: TanreiTreeViewConditions,
    densitys: TanreiTreeViewDensitys,
    hovered: TanreiTreeViewStateTokens,
    focused: TanreiTreeViewStateTokens,
    pressed: TanreiTreeViewStateTokens,
    disabled: TanreiTreeViewStateTokens
  ) {
    self.containerShape = containerShape
    self.guideColor = guideColor
    self.guideWidth = guideWidth
    self.motionDisclosureDuration = motionDisclosureDuration
    self.motionDisclosureEasing = motionDisclosureEasing
    self.motionFeedbackDuration = motionFeedbackDuration
    self.motionStateDuration = motionStateDuration
    self.motionStateEasing = motionStateEasing
    self.supportingTextTypescale = supportingTextTypescale
    self.trailingTextTypescale = trailingTextTypescale
    self.conditions = conditions
    self.densitys = densitys
    self.hovered = hovered
    self.focused = focused
    self.pressed = pressed
    self.disabled = disabled
  }

  /// The values shared by every variant of one interaction state: the state a component resolved with `TanreiInteraction.resolve`.
  /// `nil` for `enabled`, which tree-view has no group for.
  public subscript(state state: TanreiInteraction) -> TanreiTreeViewStateTokens? {
    switch state {
    case .enabled: return nil
    case .hovered: return hovered
    case .focused: return focused
    case .pressed: return pressed
    case .disabled: return disabled
    }
  }
}

/// One design system: every token a component or primitive reads. `TanreiTheme` carries the instance;
/// nothing in the package reads a token any other way.
public struct TanreiSystem: Sendable, Equatable {
  /// The id of the system layer this value was generated from.
  public var id: String
  /// The roles that come as a set of four (`x`, `on-x`, `x-container`, `on-x-container`), core or palette-declared.
  public var intents: [TanreiColorRole]
  public var colors: TanreiColorSchemes
  public var typescale: TanreiTypescale
  public var shape: TanreiShape
  public var space: TanreiSpace
  public var state: TanreiState
  public var measure: TanreiMeasure
  public var typefaces: TanreiTypefaces
  public var icon: TanreiIconStyle
  public var behavior: TanreiBehavior
  public var motion: TanreiMotionTokens
  public var elevation: TanreiElevation
  public var accordion: TanreiAccordionTokens {
    get { _accordion.value }
    set { _accordion.value = newValue }
  }
  public var appBar: TanreiAppBarTokens {
    get { _appBar.value }
    set { _appBar.value = newValue }
  }
  public var appShell: TanreiAppShellTokens {
    get { _appShell.value }
    set { _appShell.value = newValue }
  }
  public var avatar: TanreiAvatarTokens {
    get { _avatar.value }
    set { _avatar.value = newValue }
  }
  public var badge: TanreiBadgeTokens {
    get { _badge.value }
    set { _badge.value = newValue }
  }
  public var bottomSheet: TanreiBottomSheetTokens {
    get { _bottomSheet.value }
    set { _bottomSheet.value = newValue }
  }
  public var breadcrumbs: TanreiBreadcrumbsTokens {
    get { _breadcrumbs.value }
    set { _breadcrumbs.value = newValue }
  }
  public var buttonGroup: TanreiButtonGroupTokens {
    get { _buttonGroup.value }
    set { _buttonGroup.value = newValue }
  }
  public var buttonWithMenu: TanreiButtonWithMenuTokens {
    get { _buttonWithMenu.value }
    set { _buttonWithMenu.value = newValue }
  }
  public var button: TanreiButtonTokens {
    get { _button.value }
    set { _button.value = newValue }
  }
  public var calendar: TanreiCalendarTokens {
    get { _calendar.value }
    set { _calendar.value = newValue }
  }
  public var callout: TanreiCalloutTokens {
    get { _callout.value }
    set { _callout.value = newValue }
  }
  public var card: TanreiCardTokens {
    get { _card.value }
    set { _card.value = newValue }
  }
  public var carousel: TanreiCarouselTokens {
    get { _carousel.value }
    set { _carousel.value = newValue }
  }
  public var chatComposer: TanreiChatComposerTokens {
    get { _chatComposer.value }
    set { _chatComposer.value = newValue }
  }
  public var checkbox: TanreiCheckboxTokens {
    get { _checkbox.value }
    set { _checkbox.value = newValue }
  }
  public var chip: TanreiChipTokens {
    get { _chip.value }
    set { _chip.value = newValue }
  }
  public var codeBlock: TanreiCodeBlockTokens {
    get { _codeBlock.value }
    set { _codeBlock.value = newValue }
  }
  public var colorInput: TanreiColorInputTokens {
    get { _colorInput.value }
    set { _colorInput.value = newValue }
  }
  public var combobox: TanreiComboboxTokens {
    get { _combobox.value }
    set { _combobox.value = newValue }
  }
  public var copyButton: TanreiCopyButtonTokens {
    get { _copyButton.value }
    set { _copyButton.value = newValue }
  }
  public var dateTimePicker: TanreiDateTimePickerTokens {
    get { _dateTimePicker.value }
    set { _dateTimePicker.value = newValue }
  }
  public var descriptionList: TanreiDescriptionListTokens {
    get { _descriptionList.value }
    set { _descriptionList.value = newValue }
  }
  public var dialog: TanreiDialogTokens {
    get { _dialog.value }
    set { _dialog.value = newValue }
  }
  public var divider: TanreiDividerTokens {
    get { _divider.value }
    set { _divider.value = newValue }
  }
  public var embeddedTextInput: TanreiEmbeddedTextInputTokens {
    get { _embeddedTextInput.value }
    set { _embeddedTextInput.value = newValue }
  }
  public var emptyState: TanreiEmptyStateTokens {
    get { _emptyState.value }
    set { _emptyState.value = newValue }
  }
  public var fabMenu: TanreiFabMenuTokens {
    get { _fabMenu.value }
    set { _fabMenu.value = newValue }
  }
  public var fieldGroup: TanreiFieldGroupTokens {
    get { _fieldGroup.value }
    set { _fieldGroup.value = newValue }
  }
  public var field: TanreiFieldTokens {
    get { _field.value }
    set { _field.value = newValue }
  }
  public var figure: TanreiFigureTokens {
    get { _figure.value }
    set { _figure.value = newValue }
  }
  public var fileItem: TanreiFileItemTokens {
    get { _fileItem.value }
    set { _fileItem.value = newValue }
  }
  public var filePicker: TanreiFilePickerTokens {
    get { _filePicker.value }
    set { _filePicker.value = newValue }
  }
  public var fileUpload: TanreiFileUploadTokens {
    get { _fileUpload.value }
    set { _fileUpload.value = newValue }
  }
  public var imagePreview: TanreiImagePreviewTokens {
    get { _imagePreview.value }
    set { _imagePreview.value = newValue }
  }
  public var inlineCode: TanreiInlineCodeTokens {
    get { _inlineCode.value }
    set { _inlineCode.value = newValue }
  }
  public var inputBox: TanreiInputBoxTokens {
    get { _inputBox.value }
    set { _inputBox.value = newValue }
  }
  public var keyboardShortcut: TanreiKeyboardShortcutTokens {
    get { _keyboardShortcut.value }
    set { _keyboardShortcut.value = newValue }
  }
  public var linkCard: TanreiLinkCardTokens {
    get { _linkCard.value }
    set { _linkCard.value = newValue }
  }
  public var link: TanreiLinkTokens {
    get { _link.value }
    set { _link.value = newValue }
  }
  public var list: TanreiListTokens {
    get { _list.value }
    set { _list.value = newValue }
  }
  public var loadingIndicator: TanreiLoadingIndicatorTokens {
    get { _loadingIndicator.value }
    set { _loadingIndicator.value = newValue }
  }
  public var mainActionButton: TanreiMainActionButtonTokens {
    get { _mainActionButton.value }
    set { _mainActionButton.value = newValue }
  }
  public var menu: TanreiMenuTokens {
    get { _menu.value }
    set { _menu.value = newValue }
  }
  public var menubar: TanreiMenubarTokens {
    get { _menubar.value }
    set { _menubar.value = newValue }
  }
  public var navigationBar: TanreiNavigationBarTokens {
    get { _navigationBar.value }
    set { _navigationBar.value = newValue }
  }
  public var navigationDrawer: TanreiNavigationDrawerTokens {
    get { _navigationDrawer.value }
    set { _navigationDrawer.value = newValue }
  }
  public var navigationRail: TanreiNavigationRailTokens {
    get { _navigationRail.value }
    set { _navigationRail.value = newValue }
  }
  public var numberInput: TanreiNumberInputTokens {
    get { _numberInput.value }
    set { _numberInput.value = newValue }
  }
  public var oneTimeCodeInput: TanreiOneTimeCodeInputTokens {
    get { _oneTimeCodeInput.value }
    set { _oneTimeCodeInput.value = newValue }
  }
  public var pageHeader: TanreiPageHeaderTokens {
    get { _pageHeader.value }
    set { _pageHeader.value = newValue }
  }
  public var pagination: TanreiPaginationTokens {
    get { _pagination.value }
    set { _pagination.value = newValue }
  }
  public var popover: TanreiPopoverTokens {
    get { _popover.value }
    set { _popover.value = newValue }
  }
  public var progressIndicator: TanreiProgressIndicatorTokens {
    get { _progressIndicator.value }
    set { _progressIndicator.value = newValue }
  }
  public var prose: TanreiProseTokens {
    get { _prose.value }
    set { _prose.value = newValue }
  }
  public var radioButton: TanreiRadioButtonTokens {
    get { _radioButton.value }
    set { _radioButton.value = newValue }
  }
  public var search: TanreiSearchTokens {
    get { _search.value }
    set { _search.value = newValue }
  }
  public var segmentedButton: TanreiSegmentedButtonTokens {
    get { _segmentedButton.value }
    set { _segmentedButton.value = newValue }
  }
  public var select: TanreiSelectTokens {
    get { _select.value }
    set { _select.value = newValue }
  }
  public var sideSheet: TanreiSideSheetTokens {
    get { _sideSheet.value }
    set { _sideSheet.value = newValue }
  }
  public var skeleton: TanreiSkeletonTokens {
    get { _skeleton.value }
    set { _skeleton.value = newValue }
  }
  public var slider: TanreiSliderTokens {
    get { _slider.value }
    set { _slider.value = newValue }
  }
  public var snackbar: TanreiSnackbarTokens {
    get { _snackbar.value }
    set { _snackbar.value = newValue }
  }
  public var steps: TanreiStepsTokens {
    get { _steps.value }
    set { _steps.value = newValue }
  }
  public var `switch`: TanreiSwitchTokens {
    get { _switch.value }
    set { _switch.value = newValue }
  }
  public var tabView: TanreiTabViewTokens {
    get { _tabView.value }
    set { _tabView.value = newValue }
  }
  public var tableOfContents: TanreiTableOfContentsTokens {
    get { _tableOfContents.value }
    set { _tableOfContents.value = newValue }
  }
  public var table: TanreiTableTokens {
    get { _table.value }
    set { _table.value = newValue }
  }
  public var tabs: TanreiTabsTokens {
    get { _tabs.value }
    set { _tabs.value = newValue }
  }
  public var tagGroup: TanreiTagGroupTokens {
    get { _tagGroup.value }
    set { _tagGroup.value = newValue }
  }
  public var tag: TanreiTagTokens {
    get { _tag.value }
    set { _tag.value = newValue }
  }
  public var textInput: TanreiTextInputTokens {
    get { _textInput.value }
    set { _textInput.value = newValue }
  }
  public var timeline: TanreiTimelineTokens {
    get { _timeline.value }
    set { _timeline.value = newValue }
  }
  public var toolbar: TanreiToolbarTokens {
    get { _toolbar.value }
    set { _toolbar.value = newValue }
  }
  public var tooltip: TanreiTooltipTokens {
    get { _tooltip.value }
    set { _tooltip.value = newValue }
  }
  public var treeView: TanreiTreeViewTokens {
    get { _treeView.value }
    set { _treeView.value = newValue }
  }
  private var _accordion: TanreiBox<TanreiAccordionTokens>
  private var _appBar: TanreiBox<TanreiAppBarTokens>
  private var _appShell: TanreiBox<TanreiAppShellTokens>
  private var _avatar: TanreiBox<TanreiAvatarTokens>
  private var _badge: TanreiBox<TanreiBadgeTokens>
  private var _bottomSheet: TanreiBox<TanreiBottomSheetTokens>
  private var _breadcrumbs: TanreiBox<TanreiBreadcrumbsTokens>
  private var _buttonGroup: TanreiBox<TanreiButtonGroupTokens>
  private var _buttonWithMenu: TanreiBox<TanreiButtonWithMenuTokens>
  private var _button: TanreiBox<TanreiButtonTokens>
  private var _calendar: TanreiBox<TanreiCalendarTokens>
  private var _callout: TanreiBox<TanreiCalloutTokens>
  private var _card: TanreiBox<TanreiCardTokens>
  private var _carousel: TanreiBox<TanreiCarouselTokens>
  private var _chatComposer: TanreiBox<TanreiChatComposerTokens>
  private var _checkbox: TanreiBox<TanreiCheckboxTokens>
  private var _chip: TanreiBox<TanreiChipTokens>
  private var _codeBlock: TanreiBox<TanreiCodeBlockTokens>
  private var _colorInput: TanreiBox<TanreiColorInputTokens>
  private var _combobox: TanreiBox<TanreiComboboxTokens>
  private var _copyButton: TanreiBox<TanreiCopyButtonTokens>
  private var _dateTimePicker: TanreiBox<TanreiDateTimePickerTokens>
  private var _descriptionList: TanreiBox<TanreiDescriptionListTokens>
  private var _dialog: TanreiBox<TanreiDialogTokens>
  private var _divider: TanreiBox<TanreiDividerTokens>
  private var _embeddedTextInput: TanreiBox<TanreiEmbeddedTextInputTokens>
  private var _emptyState: TanreiBox<TanreiEmptyStateTokens>
  private var _fabMenu: TanreiBox<TanreiFabMenuTokens>
  private var _fieldGroup: TanreiBox<TanreiFieldGroupTokens>
  private var _field: TanreiBox<TanreiFieldTokens>
  private var _figure: TanreiBox<TanreiFigureTokens>
  private var _fileItem: TanreiBox<TanreiFileItemTokens>
  private var _filePicker: TanreiBox<TanreiFilePickerTokens>
  private var _fileUpload: TanreiBox<TanreiFileUploadTokens>
  private var _imagePreview: TanreiBox<TanreiImagePreviewTokens>
  private var _inlineCode: TanreiBox<TanreiInlineCodeTokens>
  private var _inputBox: TanreiBox<TanreiInputBoxTokens>
  private var _keyboardShortcut: TanreiBox<TanreiKeyboardShortcutTokens>
  private var _linkCard: TanreiBox<TanreiLinkCardTokens>
  private var _link: TanreiBox<TanreiLinkTokens>
  private var _list: TanreiBox<TanreiListTokens>
  private var _loadingIndicator: TanreiBox<TanreiLoadingIndicatorTokens>
  private var _mainActionButton: TanreiBox<TanreiMainActionButtonTokens>
  private var _menu: TanreiBox<TanreiMenuTokens>
  private var _menubar: TanreiBox<TanreiMenubarTokens>
  private var _navigationBar: TanreiBox<TanreiNavigationBarTokens>
  private var _navigationDrawer: TanreiBox<TanreiNavigationDrawerTokens>
  private var _navigationRail: TanreiBox<TanreiNavigationRailTokens>
  private var _numberInput: TanreiBox<TanreiNumberInputTokens>
  private var _oneTimeCodeInput: TanreiBox<TanreiOneTimeCodeInputTokens>
  private var _pageHeader: TanreiBox<TanreiPageHeaderTokens>
  private var _pagination: TanreiBox<TanreiPaginationTokens>
  private var _popover: TanreiBox<TanreiPopoverTokens>
  private var _progressIndicator: TanreiBox<TanreiProgressIndicatorTokens>
  private var _prose: TanreiBox<TanreiProseTokens>
  private var _radioButton: TanreiBox<TanreiRadioButtonTokens>
  private var _search: TanreiBox<TanreiSearchTokens>
  private var _segmentedButton: TanreiBox<TanreiSegmentedButtonTokens>
  private var _select: TanreiBox<TanreiSelectTokens>
  private var _sideSheet: TanreiBox<TanreiSideSheetTokens>
  private var _skeleton: TanreiBox<TanreiSkeletonTokens>
  private var _slider: TanreiBox<TanreiSliderTokens>
  private var _snackbar: TanreiBox<TanreiSnackbarTokens>
  private var _steps: TanreiBox<TanreiStepsTokens>
  private var _switch: TanreiBox<TanreiSwitchTokens>
  private var _tabView: TanreiBox<TanreiTabViewTokens>
  private var _tableOfContents: TanreiBox<TanreiTableOfContentsTokens>
  private var _table: TanreiBox<TanreiTableTokens>
  private var _tabs: TanreiBox<TanreiTabsTokens>
  private var _tagGroup: TanreiBox<TanreiTagGroupTokens>
  private var _tag: TanreiBox<TanreiTagTokens>
  private var _textInput: TanreiBox<TanreiTextInputTokens>
  private var _timeline: TanreiBox<TanreiTimelineTokens>
  private var _toolbar: TanreiBox<TanreiToolbarTokens>
  private var _tooltip: TanreiBox<TanreiTooltipTokens>
  private var _treeView: TanreiBox<TanreiTreeViewTokens>

  public init(
    id: String,
    intents: [TanreiColorRole],
    colors: TanreiColorSchemes,
    typescale: TanreiTypescale,
    shape: TanreiShape,
    space: TanreiSpace,
    state: TanreiState,
    measure: TanreiMeasure,
    typefaces: TanreiTypefaces,
    icon: TanreiIconStyle,
    behavior: TanreiBehavior,
    motion: TanreiMotionTokens,
    elevation: TanreiElevation,
    accordion: TanreiAccordionTokens,
    appBar: TanreiAppBarTokens,
    appShell: TanreiAppShellTokens,
    avatar: TanreiAvatarTokens,
    badge: TanreiBadgeTokens,
    bottomSheet: TanreiBottomSheetTokens,
    breadcrumbs: TanreiBreadcrumbsTokens,
    buttonGroup: TanreiButtonGroupTokens,
    buttonWithMenu: TanreiButtonWithMenuTokens,
    button: TanreiButtonTokens,
    calendar: TanreiCalendarTokens,
    callout: TanreiCalloutTokens,
    card: TanreiCardTokens,
    carousel: TanreiCarouselTokens,
    chatComposer: TanreiChatComposerTokens,
    checkbox: TanreiCheckboxTokens,
    chip: TanreiChipTokens,
    codeBlock: TanreiCodeBlockTokens,
    colorInput: TanreiColorInputTokens,
    combobox: TanreiComboboxTokens,
    copyButton: TanreiCopyButtonTokens,
    dateTimePicker: TanreiDateTimePickerTokens,
    descriptionList: TanreiDescriptionListTokens,
    dialog: TanreiDialogTokens,
    divider: TanreiDividerTokens,
    embeddedTextInput: TanreiEmbeddedTextInputTokens,
    emptyState: TanreiEmptyStateTokens,
    fabMenu: TanreiFabMenuTokens,
    fieldGroup: TanreiFieldGroupTokens,
    field: TanreiFieldTokens,
    figure: TanreiFigureTokens,
    fileItem: TanreiFileItemTokens,
    filePicker: TanreiFilePickerTokens,
    fileUpload: TanreiFileUploadTokens,
    imagePreview: TanreiImagePreviewTokens,
    inlineCode: TanreiInlineCodeTokens,
    inputBox: TanreiInputBoxTokens,
    keyboardShortcut: TanreiKeyboardShortcutTokens,
    linkCard: TanreiLinkCardTokens,
    link: TanreiLinkTokens,
    list: TanreiListTokens,
    loadingIndicator: TanreiLoadingIndicatorTokens,
    mainActionButton: TanreiMainActionButtonTokens,
    menu: TanreiMenuTokens,
    menubar: TanreiMenubarTokens,
    navigationBar: TanreiNavigationBarTokens,
    navigationDrawer: TanreiNavigationDrawerTokens,
    navigationRail: TanreiNavigationRailTokens,
    numberInput: TanreiNumberInputTokens,
    oneTimeCodeInput: TanreiOneTimeCodeInputTokens,
    pageHeader: TanreiPageHeaderTokens,
    pagination: TanreiPaginationTokens,
    popover: TanreiPopoverTokens,
    progressIndicator: TanreiProgressIndicatorTokens,
    prose: TanreiProseTokens,
    radioButton: TanreiRadioButtonTokens,
    search: TanreiSearchTokens,
    segmentedButton: TanreiSegmentedButtonTokens,
    select: TanreiSelectTokens,
    sideSheet: TanreiSideSheetTokens,
    skeleton: TanreiSkeletonTokens,
    slider: TanreiSliderTokens,
    snackbar: TanreiSnackbarTokens,
    steps: TanreiStepsTokens,
    `switch`: TanreiSwitchTokens,
    tabView: TanreiTabViewTokens,
    tableOfContents: TanreiTableOfContentsTokens,
    table: TanreiTableTokens,
    tabs: TanreiTabsTokens,
    tagGroup: TanreiTagGroupTokens,
    tag: TanreiTagTokens,
    textInput: TanreiTextInputTokens,
    timeline: TanreiTimelineTokens,
    toolbar: TanreiToolbarTokens,
    tooltip: TanreiTooltipTokens,
    treeView: TanreiTreeViewTokens
  ) {
    self.id = id
    self.intents = intents
    self.colors = colors
    self.typescale = typescale
    self.shape = shape
    self.space = space
    self.state = state
    self.measure = measure
    self.typefaces = typefaces
    self.icon = icon
    self.behavior = behavior
    self.motion = motion
    self.elevation = elevation
    self._accordion = TanreiBox(accordion)
    self._appBar = TanreiBox(appBar)
    self._appShell = TanreiBox(appShell)
    self._avatar = TanreiBox(avatar)
    self._badge = TanreiBox(badge)
    self._bottomSheet = TanreiBox(bottomSheet)
    self._breadcrumbs = TanreiBox(breadcrumbs)
    self._buttonGroup = TanreiBox(buttonGroup)
    self._buttonWithMenu = TanreiBox(buttonWithMenu)
    self._button = TanreiBox(button)
    self._calendar = TanreiBox(calendar)
    self._callout = TanreiBox(callout)
    self._card = TanreiBox(card)
    self._carousel = TanreiBox(carousel)
    self._chatComposer = TanreiBox(chatComposer)
    self._checkbox = TanreiBox(checkbox)
    self._chip = TanreiBox(chip)
    self._codeBlock = TanreiBox(codeBlock)
    self._colorInput = TanreiBox(colorInput)
    self._combobox = TanreiBox(combobox)
    self._copyButton = TanreiBox(copyButton)
    self._dateTimePicker = TanreiBox(dateTimePicker)
    self._descriptionList = TanreiBox(descriptionList)
    self._dialog = TanreiBox(dialog)
    self._divider = TanreiBox(divider)
    self._embeddedTextInput = TanreiBox(embeddedTextInput)
    self._emptyState = TanreiBox(emptyState)
    self._fabMenu = TanreiBox(fabMenu)
    self._fieldGroup = TanreiBox(fieldGroup)
    self._field = TanreiBox(field)
    self._figure = TanreiBox(figure)
    self._fileItem = TanreiBox(fileItem)
    self._filePicker = TanreiBox(filePicker)
    self._fileUpload = TanreiBox(fileUpload)
    self._imagePreview = TanreiBox(imagePreview)
    self._inlineCode = TanreiBox(inlineCode)
    self._inputBox = TanreiBox(inputBox)
    self._keyboardShortcut = TanreiBox(keyboardShortcut)
    self._linkCard = TanreiBox(linkCard)
    self._link = TanreiBox(link)
    self._list = TanreiBox(list)
    self._loadingIndicator = TanreiBox(loadingIndicator)
    self._mainActionButton = TanreiBox(mainActionButton)
    self._menu = TanreiBox(menu)
    self._menubar = TanreiBox(menubar)
    self._navigationBar = TanreiBox(navigationBar)
    self._navigationDrawer = TanreiBox(navigationDrawer)
    self._navigationRail = TanreiBox(navigationRail)
    self._numberInput = TanreiBox(numberInput)
    self._oneTimeCodeInput = TanreiBox(oneTimeCodeInput)
    self._pageHeader = TanreiBox(pageHeader)
    self._pagination = TanreiBox(pagination)
    self._popover = TanreiBox(popover)
    self._progressIndicator = TanreiBox(progressIndicator)
    self._prose = TanreiBox(prose)
    self._radioButton = TanreiBox(radioButton)
    self._search = TanreiBox(search)
    self._segmentedButton = TanreiBox(segmentedButton)
    self._select = TanreiBox(select)
    self._sideSheet = TanreiBox(sideSheet)
    self._skeleton = TanreiBox(skeleton)
    self._slider = TanreiBox(slider)
    self._snackbar = TanreiBox(snackbar)
    self._steps = TanreiBox(steps)
    self._switch = TanreiBox(`switch`)
    self._tabView = TanreiBox(tabView)
    self._tableOfContents = TanreiBox(tableOfContents)
    self._table = TanreiBox(table)
    self._tabs = TanreiBox(tabs)
    self._tagGroup = TanreiBox(tagGroup)
    self._tag = TanreiBox(tag)
    self._textInput = TanreiBox(textInput)
    self._timeline = TanreiBox(timeline)
    self._toolbar = TanreiBox(toolbar)
    self._tooltip = TanreiBox(tooltip)
    self._treeView = TanreiBox(treeView)
  }
}

/// Copy-on-write storage of one component's tokens in `TanreiSystem`: copying it copies a reference.
struct TanreiBox<Value: Sendable & Equatable>: Sendable, Equatable {
  private var storage: [Value]

  init(_ value: Value) {
    storage = [value]
  }

  var value: Value {
    get { storage[0] }
    set { storage[0] = newValue }
  }
}
