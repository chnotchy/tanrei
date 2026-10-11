import SwiftUI

/// Which light/dark theme a subtree uses.
public enum TanreiAppearance: String, CaseIterable, Sendable {
  /// Follow the SwiftUI `colorScheme` environment value.
  case system
  case light
  case dark
}

/// Which contrast level a subtree uses.
public enum TanreiContrast: String, CaseIterable, Sendable {
  /// Follow `colorSchemeContrast`: `.increased` selects `high`, otherwise `standard`.
  case system
  case standard
  case medium
  case high
}

/// How a `TanreiTextStyle` family list — and the icon font a component hands its icon slot — is turned into a
/// platform font.
public enum TanreiFontFamilyPolicy: String, CaseIterable, Sendable {
  /// Use the first family of the token's list that is registered with the process
  /// (bundled by the app or installed), falling back to the system font.
  case tokens
  /// Always use the system font (system monospaced for code styles). Icon slots get the system font at the icon
  /// size too, never a registered icon font, so a `TanreiIconGlyph` draws nothing (what snapshot baselines use).
  case system
}

/// The Tanrei theme for a view subtree: a design system, plus theme (light / dark / system)
/// × contrast (standard / medium / high / system), which select one of the system's six
/// `TanreiColors` schemes. The theme never contains design values of its own: every token a
/// component or primitive reads comes from `system`.
public struct TanreiTheme: Sendable, Equatable {
  /// The design system: the shipped default, a preset, or one a product generated.
  public var system: TanreiSystem
  public var appearance: TanreiAppearance
  public var contrast: TanreiContrast
  public var fontFamilyPolicy: TanreiFontFamilyPolicy

  public init(
    system: TanreiSystem = .tanrei,
    appearance: TanreiAppearance = .system,
    contrast: TanreiContrast = .system,
    fontFamilyPolicy: TanreiFontFamilyPolicy = .tokens
  ) {
    self.system = system
    self.appearance = appearance
    self.contrast = contrast
    self.fontFamilyPolicy = fontFamilyPolicy
  }

  /// The default design system, following the OS color scheme and the OS contrast setting.
  /// ("system" here is the operating system; the design system is the `system` property.)
  public static let system = TanreiTheme()

  /// True when the resolved theme is dark.
  public func isDark(systemScheme: ColorScheme) -> Bool {
    switch appearance {
    case .system: return systemScheme == .dark
    case .light: return false
    case .dark: return true
    }
  }

  /// The contrast level after resolving `.system`. Never returns `.system`.
  public func resolvedContrast(systemContrast: ColorSchemeContrast) -> TanreiContrast {
    switch contrast {
    case .system: return systemContrast == .increased ? .high : .standard
    case .standard, .medium, .high: return contrast
    }
  }

  /// The design system's color scheme for this theme under the given OS settings.
  public func colors(systemScheme: ColorScheme, systemContrast: ColorSchemeContrast) -> TanreiColors {
    let dark = isDark(systemScheme: systemScheme)
    let schemes = system.colors
    switch resolvedContrast(systemContrast: systemContrast) {
    case .medium: return dark ? schemes.darkMedium : schemes.lightMedium
    case .high: return dark ? schemes.darkHigh : schemes.lightHigh
    case .standard, .system: return dark ? schemes.dark : schemes.light
    }
  }

  /// The SwiftUI color scheme this theme forces, or `nil` when it follows the system.
  public var forcedColorScheme: ColorScheme? {
    switch appearance {
    case .system: return nil
    case .light: return .light
    case .dark: return .dark
    }
  }
}

private struct TanreiThemeKey: EnvironmentKey {
  static let defaultValue = TanreiTheme.system
}

extension EnvironmentValues {
  /// The Tanrei theme of this subtree. Set it with `View.tanreiTheme(_:)`.
  public var tanreiTheme: TanreiTheme {
    get { self[TanreiThemeKey.self] }
    set { self[TanreiThemeKey.self] = newValue }
  }

  /// The design system of this subtree: where components and primitives read every token.
  ///
  ///     @Environment(\.tanreiSystem) private var system
  ///     …
  ///     .padding(system.space.space200)
  public var tanreiSystem: TanreiSystem { tanreiTheme.system }
}

private struct TanreiThemeModifier: ViewModifier {
  let theme: TanreiTheme
  @Environment(\.colorScheme) private var systemScheme

  func body(content: Content) -> some View {
    content
      // The layer tooltips are drawn in, above everything this theme covers (TIP-13).
      .modifier(TanreiTooltipLayer())
      .environment(\.tanreiTheme, theme)
      // Keep system-drawn content (text selection, materials…) in step with a forced theme.
      .environment(\.colorScheme, theme.forcedColorScheme ?? systemScheme)
  }
}

extension View {
  /// Sets the Tanrei theme for this view and its descendants, and draws their tooltips above them (`tanreiTooltip`).
  public func tanreiTheme(_ theme: TanreiTheme) -> some View {
    modifier(TanreiThemeModifier(theme: theme))
  }
}

/// The resolved `TanreiColors` for the current environment.
///
///     @TanreiPalette private var colors
///     …
///     Text("Hello").foregroundStyle(colors[.onSurface])
@MainActor
@propertyWrapper
public struct TanreiPalette: DynamicProperty {
  @Environment(\.tanreiTheme) private var theme
  @Environment(\.colorScheme) private var colorScheme
  @Environment(\.colorSchemeContrast) private var colorSchemeContrast

  public init() {}

  public var wrappedValue: TanreiColors {
    theme.colors(systemScheme: colorScheme, systemContrast: colorSchemeContrast)
  }
}
