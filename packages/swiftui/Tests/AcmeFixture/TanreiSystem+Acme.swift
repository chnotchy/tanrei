// GENERATED FILE — DO NOT EDIT.
// Source: acme.system.json (extends tanrei). Regenerate with `tanrei build`.
// System values of "acme". Generated the same way for every system; the types are in TanreiTokens.swift.
// swiftlint:disable all

import SwiftUI
import Tanrei

private let acmeSpaceSpace1200: CGFloat = 96

private let acmeTypefaces = TanreiTypefaces(
  brand: TanreiFontStack(families: ["Inter", "Noto Sans JP", "Noto Sans"], generic: .sansSerif, system: false),
  plain: TanreiFontStack(families: ["Inter", "Noto Sans JP", "Noto Sans"], generic: .sansSerif, system: false),
  mono: TanreiFontStack(families: ["Roboto Mono", "Noto Sans JP"], generic: .monospace, system: false),
  icon: TanreiFontStack(families: ["Material Symbols Rounded"], generic: .sansSerif, system: false)
)

private let acmeTypescale = TanreiTypescale(
  body: TanreiTextStyle(font: acmeTypefaces.brand, size: 14, weight: 400, tracking: 0, lineHeight: 22, family: .body),
  bodyLarge: TanreiTextStyle(font: acmeTypefaces.brand, size: 16, weight: 400, tracking: 0, lineHeight: 26, family: .body),
  bodySmall: TanreiTextStyle(font: acmeTypefaces.brand, size: 13, weight: 400, tracking: 0.065, lineHeight: 20, family: .body),
  caption: TanreiTextStyle(font: acmeTypefaces.brand, size: 11, weight: 500, tracking: 0.22, lineHeight: 16, family: .label),
  code: TanreiTextStyle(font: acmeTypefaces.mono, size: 13, weight: 400, tracking: 0, lineHeight: 20, family: .label),
  codeSmall: TanreiTextStyle(font: acmeTypefaces.mono, size: 12, weight: 400, tracking: 0, lineHeight: 16, family: .label),
  display: TanreiTextStyle(font: acmeTypefaces.brand, size: 48, weight: 450, tracking: -1.92, lineHeight: 52, family: .display),
  eyebrow: TanreiTextStyle(font: acmeTypefaces.brand, size: 12, weight: 500, tracking: 0.96, lineHeight: 16, family: .label),
  heading1: TanreiTextStyle(font: acmeTypefaces.brand, size: 32, weight: 500, tracking: -0.96, lineHeight: 40, family: .heading),
  heading2: TanreiTextStyle(font: acmeTypefaces.brand, size: 24, weight: 500, tracking: -0.6, lineHeight: 32, family: .heading),
  heading3: TanreiTextStyle(font: acmeTypefaces.brand, size: 20, weight: 500, tracking: -0.4, lineHeight: 28, family: .heading),
  heading4: TanreiTextStyle(font: acmeTypefaces.brand, size: 18, weight: 500, tracking: -0.27, lineHeight: 26, family: .heading),
  heading5: TanreiTextStyle(font: acmeTypefaces.brand, size: 16, weight: 500, tracking: -0.16, lineHeight: 24, family: .heading),
  heading6: TanreiTextStyle(font: acmeTypefaces.brand, size: 14, weight: 500, tracking: 0, lineHeight: 20, family: .heading),
  label: TanreiTextStyle(font: acmeTypefaces.brand, size: 14, weight: 500, tracking: 0, lineHeight: 20, family: .label),
  labelSmall: TanreiTextStyle(font: acmeTypefaces.brand, size: 12, weight: 500, tracking: 0.12, lineHeight: 16, family: .label),
  emphasis: TanreiTypeEmphasis(
    display: 100,
    heading: 100,
    body: 100,
    label: 100
  )
)

private let acmeElevation = TanreiElevation(
  level0: [],
  level1: [
    TanreiShadowLayer(x: 0, y: 0, blur: 0, spread: 1, role: .elevationRing),
  ],
  level2: [
    TanreiShadowLayer(x: 0, y: 0, blur: 0, spread: 1, role: .elevationRing),
    TanreiShadowLayer(x: 0, y: 1, blur: 2, spread: 0, role: .elevationShadow1),
  ],
  level3: [
    TanreiShadowLayer(x: 0, y: 0, blur: 0, spread: 1, role: .elevationRing),
    TanreiShadowLayer(x: 0, y: 1, blur: 1, spread: 0, role: .elevationShadow1),
    TanreiShadowLayer(x: 0, y: 4, blur: 8, spread: -4, role: .elevationShadow1),
    TanreiShadowLayer(x: 0, y: 16, blur: 24, spread: -8, role: .elevationShadow2),
  ],
  level4: [
    TanreiShadowLayer(x: 0, y: 0, blur: 0, spread: 1, role: .elevationRing),
    TanreiShadowLayer(x: 0, y: 1, blur: 1, spread: 0, role: .elevationShadow1),
    TanreiShadowLayer(x: 0, y: 8, blur: 16, spread: -4, role: .elevationShadow1),
    TanreiShadowLayer(x: 0, y: 24, blur: 32, spread: -8, role: .elevationShadow2),
  ],
  level5: [
    TanreiShadowLayer(x: 0, y: 0, blur: 0, spread: 1, role: .elevationRing),
    TanreiShadowLayer(x: 0, y: 8, blur: 24, spread: -12, role: .elevationShadow3),
    TanreiShadowLayer(x: 0, y: 8, blur: 32, spread: -12, role: .elevationShadow2),
    TanreiShadowLayer(x: 0, y: 32, blur: 72, spread: -12, role: .elevationShadow2),
  ]
)

private let acmeLightColors = TanreiColors(scheme: .light, values: [
  TanreiColorRole(rawValue: "accent"): TanreiColorValue(red: 0, green: 0.4392, blue: 0.6745, opacity: 1),
  TanreiColorRole(rawValue: "accent-container"): TanreiColorValue(red: 0.8667, green: 0.9294, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "brand-glow"): TanreiColorValue(red: 0.5804, green: 0.8, blue: 1, opacity: 1),
  .elevationRing: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.08),
  .elevationShadow1: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.04),
  .elevationShadow2: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.06),
  .elevationShadow3: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.12),
  .error: TanreiColorValue(red: 0.8039, green: 0.149, blue: 0.1843, opacity: 1),
  .errorContainer: TanreiColorValue(red: 1, green: 0.9294, blue: 0.9216, opacity: 1),
  .focusRing: TanreiColorValue(red: 0, green: 0.4392, blue: 0.6745, opacity: 1),
  .focusRingInner: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .info: TanreiColorValue(red: 0.1882, green: 0.4, blue: 0.7961, opacity: 1),
  .infoContainer: TanreiColorValue(red: 0.9294, green: 0.9412, blue: 1, opacity: 1),
  .inverseLink: TanreiColorValue(red: 0.8863, green: 0.8863, blue: 0.8863, opacity: 1),
  .inverseOnSurface: TanreiColorValue(red: 0.9451, green: 0.9451, blue: 0.9451, opacity: 1),
  .inversePrimary: TanreiColorValue(red: 0.8863, green: 0.8863, blue: 0.8863, opacity: 1),
  .inverseSurface: TanreiColorValue(red: 0.1216, green: 0.1216, blue: 0.1216, opacity: 1),
  .link: TanreiColorValue(red: 0.1059, green: 0.1059, blue: 0.1059, opacity: 1),
  TanreiColorRole(rawValue: "on-accent"): TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "on-accent-container"): TanreiColorValue(red: 0, green: 0.2, blue: 0.3216, opacity: 1),
  .onError: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onErrorContainer: TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1),
  .onInfo: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onInfoContainer: TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1),
  .onPrimary: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onPrimaryContainer: TanreiColorValue(red: 0.1059, green: 0.1059, blue: 0.1059, opacity: 1),
  .onSecondary: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSecondaryContainer: TanreiColorValue(red: 0.149, green: 0.149, blue: 0.149, opacity: 1),
  .onSuccess: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSuccessContainer: TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1),
  .onSurface: TanreiColorValue(red: 0.1059, green: 0.1059, blue: 0.1059, opacity: 1),
  .onSurfaceVariant: TanreiColorValue(red: 0.2941, green: 0.2941, blue: 0.2941, opacity: 1),
  .onWarning: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onWarningContainer: TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1),
  .outline: TanreiColorValue(red: 0.5176, green: 0.5176, blue: 0.5176, opacity: 1),
  .outlineVariant: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.08),
  .primary: TanreiColorValue(red: 0.1059, green: 0.1059, blue: 0.1059, opacity: 1),
  .primaryContainer: TanreiColorValue(red: 0.9333, green: 0.9333, blue: 0.9333, opacity: 1),
  .scrim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.4),
  .secondary: TanreiColorValue(red: 0.3216, green: 0.3216, blue: 0.3216, opacity: 1),
  .secondaryContainer: TanreiColorValue(red: 0.9333, green: 0.9333, blue: 0.9333, opacity: 1),
  .shadow: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .success: TanreiColorValue(red: 0.0275, green: 0.4824, blue: 0.1961, opacity: 1),
  .successContainer: TanreiColorValue(red: 0.8863, green: 0.9647, blue: 0.8745, opacity: 1),
  .surface: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .surfaceBright: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .surfaceContainer: TanreiColorValue(red: 0.9647, green: 0.9647, blue: 0.9647, opacity: 1),
  .surfaceContainerHigh: TanreiColorValue(red: 0.9529, green: 0.9529, blue: 0.9529, opacity: 1),
  .surfaceContainerHighest: TanreiColorValue(red: 0.9333, green: 0.9333, blue: 0.9333, opacity: 1),
  .surfaceContainerLow: TanreiColorValue(red: 0.9765, green: 0.9765, blue: 0.9765, opacity: 1),
  .surfaceContainerLowest: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .surfaceDim: TanreiColorValue(red: 0.9451, green: 0.9451, blue: 0.9451, opacity: 1),
  .surfaceVariant: TanreiColorValue(red: 0.9333, green: 0.9333, blue: 0.9333, opacity: 1),
  .warning: TanreiColorValue(red: 0.6078, green: 0.3608, blue: 0, opacity: 1),
  .warningContainer: TanreiColorValue(red: 1, green: 0.9333, blue: 0.8784, opacity: 1),
])

private let acmeLightMediumColors = TanreiColors(scheme: .lightMedium, values: [
  TanreiColorRole(rawValue: "accent"): TanreiColorValue(red: 0, green: 0.3686, blue: 0.5686, opacity: 1),
  TanreiColorRole(rawValue: "accent-container"): TanreiColorValue(red: 0.8235, green: 0.9098, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "brand-glow"): TanreiColorValue(red: 0.5804, green: 0.8, blue: 1, opacity: 1),
  .elevationRing: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.14),
  .elevationShadow1: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.04),
  .elevationShadow2: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.06),
  .elevationShadow3: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.12),
  .error: TanreiColorValue(red: 0.7059, green: 0.0549, blue: 0.1255, opacity: 1),
  .errorContainer: TanreiColorValue(red: 1, green: 0.9294, blue: 0.9216, opacity: 1),
  .focusRing: TanreiColorValue(red: 0, green: 0.3686, blue: 0.5686, opacity: 1),
  .focusRingInner: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .info: TanreiColorValue(red: 0.0863, green: 0.3333, blue: 0.7255, opacity: 1),
  .infoContainer: TanreiColorValue(red: 0.9294, green: 0.9412, blue: 1, opacity: 1),
  .inverseLink: TanreiColorValue(red: 0.8863, green: 0.8863, blue: 0.8863, opacity: 1),
  .inverseOnSurface: TanreiColorValue(red: 0.9451, green: 0.9451, blue: 0.9451, opacity: 1),
  .inversePrimary: TanreiColorValue(red: 0.8863, green: 0.8863, blue: 0.8863, opacity: 1),
  .inverseSurface: TanreiColorValue(red: 0.1216, green: 0.1216, blue: 0.1216, opacity: 1),
  .link: TanreiColorValue(red: 0.0745, green: 0.0745, blue: 0.0745, opacity: 1),
  TanreiColorRole(rawValue: "on-accent"): TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "on-accent-container"): TanreiColorValue(red: 0, green: 0.1569, blue: 0.2588, opacity: 1),
  .onError: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onErrorContainer: TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1),
  .onInfo: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onInfoContainer: TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1),
  .onPrimary: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onPrimaryContainer: TanreiColorValue(red: 0.0745, green: 0.0745, blue: 0.0745, opacity: 1),
  .onSecondary: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSecondaryContainer: TanreiColorValue(red: 0.1059, green: 0.1059, blue: 0.1059, opacity: 1),
  .onSuccess: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSuccessContainer: TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1),
  .onSurface: TanreiColorValue(red: 0.0745, green: 0.0745, blue: 0.0745, opacity: 1),
  .onSurfaceVariant: TanreiColorValue(red: 0.2314, green: 0.2314, blue: 0.2314, opacity: 1),
  .onWarning: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onWarningContainer: TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1),
  .outline: TanreiColorValue(red: 0.4275, green: 0.4275, blue: 0.4275, opacity: 1),
  .outlineVariant: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.44),
  .primary: TanreiColorValue(red: 0.0745, green: 0.0745, blue: 0.0745, opacity: 1),
  .primaryContainer: TanreiColorValue(red: 0.9098, green: 0.9098, blue: 0.9098, opacity: 1),
  .scrim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.4),
  .secondary: TanreiColorValue(red: 0.2588, green: 0.2588, blue: 0.2588, opacity: 1),
  .secondaryContainer: TanreiColorValue(red: 0.9098, green: 0.9098, blue: 0.9098, opacity: 1),
  .shadow: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .success: TanreiColorValue(red: 0, green: 0.4078, blue: 0.1569, opacity: 1),
  .successContainer: TanreiColorValue(red: 0.8863, green: 0.9647, blue: 0.8745, opacity: 1),
  .surface: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .surfaceBright: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .surfaceContainer: TanreiColorValue(red: 0.9647, green: 0.9647, blue: 0.9647, opacity: 1),
  .surfaceContainerHigh: TanreiColorValue(red: 0.9529, green: 0.9529, blue: 0.9529, opacity: 1),
  .surfaceContainerHighest: TanreiColorValue(red: 0.9333, green: 0.9333, blue: 0.9333, opacity: 1),
  .surfaceContainerLow: TanreiColorValue(red: 0.9765, green: 0.9765, blue: 0.9765, opacity: 1),
  .surfaceContainerLowest: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .surfaceDim: TanreiColorValue(red: 0.9451, green: 0.9451, blue: 0.9451, opacity: 1),
  .surfaceVariant: TanreiColorValue(red: 0.9333, green: 0.9333, blue: 0.9333, opacity: 1),
  .warning: TanreiColorValue(red: 0.5137, green: 0.302, blue: 0, opacity: 1),
  .warningContainer: TanreiColorValue(red: 1, green: 0.9333, blue: 0.8784, opacity: 1),
])

private let acmeLightHighColors = TanreiColors(scheme: .lightHigh, values: [
  TanreiColorRole(rawValue: "accent"): TanreiColorValue(red: 0, green: 0.2902, blue: 0.4549, opacity: 1),
  TanreiColorRole(rawValue: "accent-container"): TanreiColorValue(red: 0.7843, green: 0.8902, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "brand-glow"): TanreiColorValue(red: 0.5804, green: 0.8, blue: 1, opacity: 1),
  .elevationRing: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.3),
  .elevationShadow1: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.04),
  .elevationShadow2: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.06),
  .elevationShadow3: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.12),
  .error: TanreiColorValue(red: 0.5765, green: 0, blue: 0.0824, opacity: 1),
  .errorContainer: TanreiColorValue(red: 1, green: 0.9294, blue: 0.9216, opacity: 1),
  .focusRing: TanreiColorValue(red: 0, green: 0.2902, blue: 0.4549, opacity: 1),
  .focusRingInner: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .info: TanreiColorValue(red: 0, green: 0.2588, blue: 0.6078, opacity: 1),
  .infoContainer: TanreiColorValue(red: 0.9294, green: 0.9412, blue: 1, opacity: 1),
  .inverseLink: TanreiColorValue(red: 0.8863, green: 0.8863, blue: 0.8863, opacity: 1),
  .inverseOnSurface: TanreiColorValue(red: 0.9451, green: 0.9451, blue: 0.9451, opacity: 1),
  .inversePrimary: TanreiColorValue(red: 0.8863, green: 0.8863, blue: 0.8863, opacity: 1),
  .inverseSurface: TanreiColorValue(red: 0.1216, green: 0.1216, blue: 0.1216, opacity: 1),
  .link: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  TanreiColorRole(rawValue: "on-accent"): TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "on-accent-container"): TanreiColorValue(red: 0, green: 0.1137, blue: 0.1961, opacity: 1),
  .onError: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onErrorContainer: TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1),
  .onInfo: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onInfoContainer: TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1),
  .onPrimary: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onPrimaryContainer: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .onSecondary: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSecondaryContainer: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .onSuccess: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSuccessContainer: TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1),
  .onSurface: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .onSurfaceVariant: TanreiColorValue(red: 0.149, green: 0.149, blue: 0.149, opacity: 1),
  .onWarning: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onWarningContainer: TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1),
  .outline: TanreiColorValue(red: 0.2941, green: 0.2941, blue: 0.2941, opacity: 1),
  .outlineVariant: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.56),
  .primary: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .primaryContainer: TanreiColorValue(red: 0.8863, green: 0.8863, blue: 0.8863, opacity: 1),
  .scrim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.4),
  .secondary: TanreiColorValue(red: 0.1882, green: 0.1882, blue: 0.1882, opacity: 1),
  .secondaryContainer: TanreiColorValue(red: 0.8863, green: 0.8863, blue: 0.8863, opacity: 1),
  .shadow: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .success: TanreiColorValue(red: 0, green: 0.3255, blue: 0.1176, opacity: 1),
  .successContainer: TanreiColorValue(red: 0.8863, green: 0.9647, blue: 0.8745, opacity: 1),
  .surface: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .surfaceBright: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .surfaceContainer: TanreiColorValue(red: 0.9647, green: 0.9647, blue: 0.9647, opacity: 1),
  .surfaceContainerHigh: TanreiColorValue(red: 0.9529, green: 0.9529, blue: 0.9529, opacity: 1),
  .surfaceContainerHighest: TanreiColorValue(red: 0.9333, green: 0.9333, blue: 0.9333, opacity: 1),
  .surfaceContainerLow: TanreiColorValue(red: 0.9765, green: 0.9765, blue: 0.9765, opacity: 1),
  .surfaceContainerLowest: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .surfaceDim: TanreiColorValue(red: 0.9451, green: 0.9451, blue: 0.9451, opacity: 1),
  .surfaceVariant: TanreiColorValue(red: 0.9333, green: 0.9333, blue: 0.9333, opacity: 1),
  .warning: TanreiColorValue(red: 0.4078, green: 0.2353, blue: 0, opacity: 1),
  .warningContainer: TanreiColorValue(red: 1, green: 0.9333, blue: 0.8784, opacity: 1),
])

private let acmeDarkColors = TanreiColors(scheme: .dark, values: [
  TanreiColorRole(rawValue: "accent"): TanreiColorValue(red: 0.3647, green: 0.7216, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "accent-container"): TanreiColorValue(red: 0, green: 0.2196, blue: 0.349, opacity: 1),
  TanreiColorRole(rawValue: "brand-glow"): TanreiColorValue(red: 0, green: 0.2902, blue: 0.4549, opacity: 1),
  .elevationRing: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 0.14),
  .elevationShadow1: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.1),
  .elevationShadow2: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.16),
  .elevationShadow3: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.3),
  .error: TanreiColorValue(red: 1, green: 0.5725, blue: 0.549, opacity: 1),
  .errorContainer: TanreiColorValue(red: 0.2118, green: 0.1137, blue: 0.1059, opacity: 1),
  .focusRing: TanreiColorValue(red: 0.3647, green: 0.7216, blue: 1, opacity: 1),
  .focusRingInner: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .info: TanreiColorValue(red: 0.5569, green: 0.6863, blue: 1, opacity: 1),
  .infoContainer: TanreiColorValue(red: 0.1098, green: 0.1373, blue: 0.2039, opacity: 1),
  .inverseLink: TanreiColorValue(red: 0.1059, green: 0.1059, blue: 0.1059, opacity: 1),
  .inverseOnSurface: TanreiColorValue(red: 0.1216, green: 0.1216, blue: 0.1216, opacity: 1),
  .inversePrimary: TanreiColorValue(red: 0.1059, green: 0.1059, blue: 0.1059, opacity: 1),
  .inverseSurface: TanreiColorValue(red: 0.9216, green: 0.9216, blue: 0.9216, opacity: 1),
  .link: TanreiColorValue(red: 0.9216, green: 0.9216, blue: 0.9216, opacity: 1),
  TanreiColorRole(rawValue: "on-accent"): TanreiColorValue(red: 0, green: 0.1137, blue: 0.1961, opacity: 1),
  TanreiColorRole(rawValue: "on-accent-container"): TanreiColorValue(red: 0.7608, green: 0.8784, blue: 1, opacity: 1),
  .onError: TanreiColorValue(red: 0.2549, green: 0, blue: 0.0157, opacity: 1),
  .onErrorContainer: TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1),
  .onInfo: TanreiColorValue(red: 0, green: 0.098, blue: 0.2667, opacity: 1),
  .onInfoContainer: TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1),
  .onPrimary: TanreiColorValue(red: 0.0667, green: 0.0667, blue: 0.0667, opacity: 1),
  .onPrimaryContainer: TanreiColorValue(red: 0.9216, green: 0.9216, blue: 0.9216, opacity: 1),
  .onSecondary: TanreiColorValue(red: 0.1059, green: 0.1059, blue: 0.1059, opacity: 1),
  .onSecondaryContainer: TanreiColorValue(red: 0.8863, green: 0.8863, blue: 0.8863, opacity: 1),
  .onSuccess: TanreiColorValue(red: 0, green: 0.1294, blue: 0.0314, opacity: 1),
  .onSuccessContainer: TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1),
  .onSurface: TanreiColorValue(red: 0.9216, green: 0.9216, blue: 0.9216, opacity: 1),
  .onSurfaceVariant: TanreiColorValue(red: 0.6275, green: 0.6275, blue: 0.6275, opacity: 1),
  .onWarning: TanreiColorValue(red: 0.1725, green: 0.0863, blue: 0, opacity: 1),
  .onWarningContainer: TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1),
  .outline: TanreiColorValue(red: 0.4863, green: 0.4863, blue: 0.4863, opacity: 1),
  .outlineVariant: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 0.14),
  .primary: TanreiColorValue(red: 0.9216, green: 0.9216, blue: 0.9216, opacity: 1),
  .primaryContainer: TanreiColorValue(red: 0.149, green: 0.149, blue: 0.149, opacity: 1),
  .scrim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.4),
  .secondary: TanreiColorValue(red: 0.7255, green: 0.7255, blue: 0.7255, opacity: 1),
  .secondaryContainer: TanreiColorValue(red: 0.1412, green: 0.1412, blue: 0.1412, opacity: 1),
  .shadow: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .success: TanreiColorValue(red: 0.3843, green: 0.7725, blue: 0.4471, opacity: 1),
  .successContainer: TanreiColorValue(red: 0.0902, green: 0.1529, blue: 0.0941, opacity: 1),
  .surface: TanreiColorValue(red: 0.0431, green: 0.0431, blue: 0.0431, opacity: 1),
  .surfaceBright: TanreiColorValue(red: 0.1216, green: 0.1216, blue: 0.1216, opacity: 1),
  .surfaceContainer: TanreiColorValue(red: 0.0824, green: 0.0824, blue: 0.0824, opacity: 1),
  .surfaceContainerHigh: TanreiColorValue(red: 0.1059, green: 0.1059, blue: 0.1059, opacity: 1),
  .surfaceContainerHighest: TanreiColorValue(red: 0.1333, green: 0.1333, blue: 0.1333, opacity: 1),
  .surfaceContainerLow: TanreiColorValue(red: 0.0667, green: 0.0667, blue: 0.0667, opacity: 1),
  .surfaceContainerLowest: TanreiColorValue(red: 0.0157, green: 0.0157, blue: 0.0157, opacity: 1),
  .surfaceDim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .surfaceVariant: TanreiColorValue(red: 0.1333, green: 0.1333, blue: 0.1333, opacity: 1),
  .warning: TanreiColorValue(red: 0.9529, green: 0.6196, blue: 0.2275, opacity: 1),
  .warningContainer: TanreiColorValue(red: 0.1961, green: 0.1255, blue: 0.0471, opacity: 1),
])

private let acmeDarkMediumColors = TanreiColors(scheme: .darkMedium, values: [
  TanreiColorRole(rawValue: "accent"): TanreiColorValue(red: 0.5804, green: 0.8, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "accent-container"): TanreiColorValue(red: 0, green: 0.2196, blue: 0.349, opacity: 1),
  TanreiColorRole(rawValue: "brand-glow"): TanreiColorValue(red: 0, green: 0.2902, blue: 0.4549, opacity: 1),
  .elevationRing: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 0.22),
  .elevationShadow1: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.1),
  .elevationShadow2: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.16),
  .elevationShadow3: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.3),
  .error: TanreiColorValue(red: 1, green: 0.702, blue: 0.6824, opacity: 1),
  .errorContainer: TanreiColorValue(red: 0.2118, green: 0.1137, blue: 0.1059, opacity: 1),
  .focusRing: TanreiColorValue(red: 0.5804, green: 0.8, blue: 1, opacity: 1),
  .focusRingInner: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .info: TanreiColorValue(red: 0.6902, green: 0.7765, blue: 1, opacity: 1),
  .infoContainer: TanreiColorValue(red: 0.1098, green: 0.1373, blue: 0.2039, opacity: 1),
  .inverseLink: TanreiColorValue(red: 0.1059, green: 0.1059, blue: 0.1059, opacity: 1),
  .inverseOnSurface: TanreiColorValue(red: 0.1216, green: 0.1216, blue: 0.1216, opacity: 1),
  .inversePrimary: TanreiColorValue(red: 0.1059, green: 0.1059, blue: 0.1059, opacity: 1),
  .inverseSurface: TanreiColorValue(red: 0.9216, green: 0.9216, blue: 0.9216, opacity: 1),
  .link: TanreiColorValue(red: 0.9529, green: 0.9529, blue: 0.9529, opacity: 1),
  TanreiColorRole(rawValue: "on-accent"): TanreiColorValue(red: 0, green: 0.1137, blue: 0.1961, opacity: 1),
  TanreiColorRole(rawValue: "on-accent-container"): TanreiColorValue(red: 0.8471, green: 0.9176, blue: 1, opacity: 1),
  .onError: TanreiColorValue(red: 0.2549, green: 0, blue: 0.0157, opacity: 1),
  .onErrorContainer: TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1),
  .onInfo: TanreiColorValue(red: 0, green: 0.098, blue: 0.2667, opacity: 1),
  .onInfoContainer: TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1),
  .onPrimary: TanreiColorValue(red: 0.0667, green: 0.0667, blue: 0.0667, opacity: 1),
  .onPrimaryContainer: TanreiColorValue(red: 0.9529, green: 0.9529, blue: 0.9529, opacity: 1),
  .onSecondary: TanreiColorValue(red: 0.1059, green: 0.1059, blue: 0.1059, opacity: 1),
  .onSecondaryContainer: TanreiColorValue(red: 0.9451, green: 0.9451, blue: 0.9451, opacity: 1),
  .onSuccess: TanreiColorValue(red: 0, green: 0.1294, blue: 0.0314, opacity: 1),
  .onSuccessContainer: TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1),
  .onSurface: TanreiColorValue(red: 0.9529, green: 0.9529, blue: 0.9529, opacity: 1),
  .onSurfaceVariant: TanreiColorValue(red: 0.7255, green: 0.7255, blue: 0.7255, opacity: 1),
  .onWarning: TanreiColorValue(red: 0.1725, green: 0.0863, blue: 0, opacity: 1),
  .onWarningContainer: TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1),
  .outline: TanreiColorValue(red: 0.6078, green: 0.6078, blue: 0.6078, opacity: 1),
  .outlineVariant: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 0.36),
  .primary: TanreiColorValue(red: 0.9529, green: 0.9529, blue: 0.9529, opacity: 1),
  .primaryContainer: TanreiColorValue(red: 0.1647, green: 0.1647, blue: 0.1647, opacity: 1),
  .scrim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.4),
  .secondary: TanreiColorValue(red: 0.8, green: 0.8, blue: 0.8, opacity: 1),
  .secondaryContainer: TanreiColorValue(red: 0.1569, green: 0.1569, blue: 0.1569, opacity: 1),
  .shadow: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .success: TanreiColorValue(red: 0.4706, green: 0.8627, blue: 0.5255, opacity: 1),
  .successContainer: TanreiColorValue(red: 0.0902, green: 0.1529, blue: 0.0941, opacity: 1),
  .surface: TanreiColorValue(red: 0.0431, green: 0.0431, blue: 0.0431, opacity: 1),
  .surfaceBright: TanreiColorValue(red: 0.1216, green: 0.1216, blue: 0.1216, opacity: 1),
  .surfaceContainer: TanreiColorValue(red: 0.0824, green: 0.0824, blue: 0.0824, opacity: 1),
  .surfaceContainerHigh: TanreiColorValue(red: 0.1059, green: 0.1059, blue: 0.1059, opacity: 1),
  .surfaceContainerHighest: TanreiColorValue(red: 0.1333, green: 0.1333, blue: 0.1333, opacity: 1),
  .surfaceContainerLow: TanreiColorValue(red: 0.0667, green: 0.0667, blue: 0.0667, opacity: 1),
  .surfaceContainerLowest: TanreiColorValue(red: 0.0157, green: 0.0157, blue: 0.0157, opacity: 1),
  .surfaceDim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .surfaceVariant: TanreiColorValue(red: 0.1333, green: 0.1333, blue: 0.1333, opacity: 1),
  .warning: TanreiColorValue(red: 1, green: 0.7216, blue: 0.4275, opacity: 1),
  .warningContainer: TanreiColorValue(red: 0.1961, green: 0.1255, blue: 0.0471, opacity: 1),
])

private let acmeDarkHighColors = TanreiColors(scheme: .darkHigh, values: [
  TanreiColorRole(rawValue: "accent"): TanreiColorValue(red: 0.7412, green: 0.8706, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "accent-container"): TanreiColorValue(red: 0, green: 0.2196, blue: 0.349, opacity: 1),
  TanreiColorRole(rawValue: "brand-glow"): TanreiColorValue(red: 0, green: 0.2902, blue: 0.4549, opacity: 1),
  .elevationRing: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 0.4),
  .elevationShadow1: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.1),
  .elevationShadow2: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.16),
  .elevationShadow3: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.3),
  .error: TanreiColorValue(red: 1, green: 0.8118, blue: 0.7961, opacity: 1),
  .errorContainer: TanreiColorValue(red: 0.2118, green: 0.1137, blue: 0.1059, opacity: 1),
  .focusRing: TanreiColorValue(red: 0.7412, green: 0.8706, blue: 1, opacity: 1),
  .focusRingInner: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .info: TanreiColorValue(red: 0.8039, green: 0.851, blue: 1, opacity: 1),
  .infoContainer: TanreiColorValue(red: 0.1098, green: 0.1373, blue: 0.2039, opacity: 1),
  .inverseLink: TanreiColorValue(red: 0.1059, green: 0.1059, blue: 0.1059, opacity: 1),
  .inverseOnSurface: TanreiColorValue(red: 0.1216, green: 0.1216, blue: 0.1216, opacity: 1),
  .inversePrimary: TanreiColorValue(red: 0.1059, green: 0.1059, blue: 0.1059, opacity: 1),
  .inverseSurface: TanreiColorValue(red: 0.9216, green: 0.9216, blue: 0.9216, opacity: 1),
  .link: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "on-accent"): TanreiColorValue(red: 0, green: 0.1137, blue: 0.1961, opacity: 1),
  TanreiColorRole(rawValue: "on-accent-container"): TanreiColorValue(red: 0.9294, green: 0.9569, blue: 1, opacity: 1),
  .onError: TanreiColorValue(red: 0.2549, green: 0, blue: 0.0157, opacity: 1),
  .onErrorContainer: TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1),
  .onInfo: TanreiColorValue(red: 0, green: 0.098, blue: 0.2667, opacity: 1),
  .onInfoContainer: TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1),
  .onPrimary: TanreiColorValue(red: 0.0667, green: 0.0667, blue: 0.0667, opacity: 1),
  .onPrimaryContainer: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSecondary: TanreiColorValue(red: 0.1059, green: 0.1059, blue: 0.1059, opacity: 1),
  .onSecondaryContainer: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSuccess: TanreiColorValue(red: 0, green: 0.1294, blue: 0.0314, opacity: 1),
  .onSuccessContainer: TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1),
  .onSurface: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSurfaceVariant: TanreiColorValue(red: 0.8314, green: 0.8314, blue: 0.8314, opacity: 1),
  .onWarning: TanreiColorValue(red: 0.1725, green: 0.0863, blue: 0, opacity: 1),
  .onWarningContainer: TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1),
  .outline: TanreiColorValue(red: 0.7765, green: 0.7765, blue: 0.7765, opacity: 1),
  .outlineVariant: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 0.48),
  .primary: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .primaryContainer: TanreiColorValue(red: 0.1804, green: 0.1804, blue: 0.1804, opacity: 1),
  .scrim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.4),
  .secondary: TanreiColorValue(red: 0.8863, green: 0.8863, blue: 0.8863, opacity: 1),
  .secondaryContainer: TanreiColorValue(red: 0.1725, green: 0.1725, blue: 0.1725, opacity: 1),
  .shadow: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .success: TanreiColorValue(red: 0.5451, green: 0.9412, blue: 0.5922, opacity: 1),
  .successContainer: TanreiColorValue(red: 0.0902, green: 0.1529, blue: 0.0941, opacity: 1),
  .surface: TanreiColorValue(red: 0.0431, green: 0.0431, blue: 0.0431, opacity: 1),
  .surfaceBright: TanreiColorValue(red: 0.1216, green: 0.1216, blue: 0.1216, opacity: 1),
  .surfaceContainer: TanreiColorValue(red: 0.0824, green: 0.0824, blue: 0.0824, opacity: 1),
  .surfaceContainerHigh: TanreiColorValue(red: 0.1059, green: 0.1059, blue: 0.1059, opacity: 1),
  .surfaceContainerHighest: TanreiColorValue(red: 0.1333, green: 0.1333, blue: 0.1333, opacity: 1),
  .surfaceContainerLow: TanreiColorValue(red: 0.0667, green: 0.0667, blue: 0.0667, opacity: 1),
  .surfaceContainerLowest: TanreiColorValue(red: 0.0157, green: 0.0157, blue: 0.0157, opacity: 1),
  .surfaceDim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .surfaceVariant: TanreiColorValue(red: 0.1333, green: 0.1333, blue: 0.1333, opacity: 1),
  .warning: TanreiColorValue(red: 1, green: 0.8235, blue: 0.651, opacity: 1),
  .warningContainer: TanreiColorValue(red: 0.1961, green: 0.1255, blue: 0.0471, opacity: 1),
])

private let acmeSpringExpressiveBouncy: TanreiSpringSpec = TanreiSpringSpec(damping: 0.4, stiffness: 500, easing: TanreiCubicBezier(0.38, 1.21, 0.22, 1), durationMs: 500)

private let acmeSpringStandardBouncy: TanreiSpringSpec = TanreiSpringSpec(damping: 0.5, stiffness: 700, easing: TanreiCubicBezier(0.27, 1.06, 0.18, 1), durationMs: 500)

private let acmeAccordionTokens = TanreiAccordionTokens(
  containerGap: 12,
  containerShape: 0,
  dividerColor: .role(.outlineVariant),
  dividerThickness: 1,
  itemGap: 8,
  motionDisclosureDuration: 350,
  motionDisclosureEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineColor: .role(.outlineVariant),
  outlineShape: 8,
  outlineWidth: 1,
  separation: 0,
  variants: TanreiAccordionVariants(
    plain: TanreiAccordionVariantTokens(
      enabled: TanreiAccordionVariantStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        chevronColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiAccordionVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        chevronColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiAccordionVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        chevronColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiAccordionVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        chevronColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiAccordionVariantStateTokens(
        containerColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        supportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        trailingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        chevronColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    outlined: TanreiAccordionVariantTokens(
      enabled: TanreiAccordionVariantStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        chevronColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiAccordionVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        chevronColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiAccordionVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        chevronColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiAccordionVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        chevronColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiAccordionVariantStateTokens(
        containerColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        supportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        trailingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        chevronColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  densitys: TanreiAccordionDensitys(
    regular: TanreiAccordionDensityTokens(
      containerHeight: 56,
      containerPaddingBlock: 16,
      containerPaddingInline: 16,
      labelTypescale: acmeTypescale.heading5,
      supportingTextTypescale: acmeTypescale.body,
      trailingTextTypescale: acmeTypescale.body,
      iconSize: 24,
      chevronSize: 24,
      contentPaddingBlockEnd: 16
    ),
    compact: TanreiAccordionDensityTokens(
      containerHeight: 48,
      containerPaddingBlock: 12,
      containerPaddingInline: 12,
      labelTypescale: acmeTypescale.label,
      supportingTextTypescale: acmeTypescale.bodySmall,
      trailingTextTypescale: acmeTypescale.bodySmall,
      iconSize: 20,
      chevronSize: 20,
      contentPaddingBlockEnd: 12
    )
  ),
  hovered: TanreiAccordionStateTokens(
    opacity: 1
  ),
  focused: TanreiAccordionStateTokens(
    opacity: 1
  ),
  pressed: TanreiAccordionStateTokens(
    opacity: 1
  ),
  disabled: TanreiAccordionStateTokens(
    opacity: 1
  )
)

private let acmeAppBarTokens = TanreiAppBarTokens(
  actionsGap: 8,
  brandColor: .role(.onSurface),
  brandImageHeight: 40,
  brandLockupAlignment: 0,
  brandLockupGap: 8,
  brandLockupSymbolSize: 40,
  brandShape: 9999,
  brandSymbolSize: 24,
  brandWordmarkHeight: 40,
  containerGap: 8,
  containerPaddingBlockEnd: 12,
  containerPaddingInline: 4,
  motionConditionDuration: 200,
  motionConditionEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineVisibility: 0,
  outlineWidth: 1,
  subtitleColor: .role(.onSurfaceVariant),
  titleColor: .role(.onSurface),
  titleInset: 16,
  sizes: TanreiAppBarSizes(
    small: TanreiAppBarSizeTokens(
      containerHeight: 64,
      titleTypescale: acmeTypescale.heading4,
      subtitleTypescale: acmeTypescale.bodySmall
    ),
    large: TanreiAppBarSizeTokens(
      containerHeight: 120,
      titleTypescale: acmeTypescale.heading1,
      subtitleTypescale: acmeTypescale.body
    )
  ),
  conditions: TanreiAppBarConditions(
    flat: TanreiAppBarConditionTokens(
      containerColor: .role(.surface),
      containerElevation: acmeElevation.level0,
      outlineColor: .none
    ),
    scrolled: TanreiAppBarConditionTokens(
      containerColor: .role(.surface),
      containerElevation: acmeElevation.level0,
      outlineColor: .role(.outlineVariant)
    )
  )
)

private let acmeAppShellTokens = TanreiAppShellTokens(
  asideGap: 24,
  asidePaddingInline: 16,
  asideWidth: 240,
  breakpointExpanded: 1024,
  breakpointMedium: 600,
  containerColor: .role(.surface),
  contentColor: .role(.onSurface),
  footerPaddingBlock: 32,
  gutterCompact: 16,
  gutterExpanded: 32,
  gutterMedium: 24,
  mainMaxWidth: 768,
  mainPaddingBlock: 32,
  outlineColor: .role(.outlineVariant),
  outlineWidth: 1,
  separation: 0,
  skipLinkContainerColor: .role(.surfaceContainerHigh),
  skipLinkContainerElevation: acmeElevation.level3,
  skipLinkContainerPaddingBlock: 12,
  skipLinkContainerPaddingInline: 16,
  skipLinkContainerShape: 6,
  skipLinkLabelTypescale: acmeTypescale.label,
  skipLinkOffset: 8
)

private let acmeAvatarTokens = TanreiAvatarTokens(
  containerColor: .role(.surfaceContainerHighest),
  groupOutlineColor: .role(.surface),
  groupOutlineWidth: 2,
  iconColor: .role(.onSurfaceVariant),
  labelColor: .role(.onSurfaceVariant),
  sizes: TanreiAvatarSizes(
    small: TanreiAvatarSizeTokens(
      containerSize: 24,
      labelTypescale: acmeTypescale.caption,
      iconSize: 16,
      groupOverlap: 2
    ),
    medium: TanreiAvatarSizeTokens(
      containerSize: 40,
      labelTypescale: acmeTypescale.label,
      iconSize: 24,
      groupOverlap: 4
    ),
    large: TanreiAvatarSizeTokens(
      containerSize: 56,
      labelTypescale: acmeTypescale.heading3,
      iconSize: 32,
      groupOverlap: 8
    )
  ),
  shapes: TanreiAvatarShapes(
    circle: TanreiAvatarShapeTokens(
      containerShape: 9999
    ),
    square: TanreiAvatarShapeTokens(
      containerShape: 6
    )
  )
)

private let acmeBadgeTokens = TanreiBadgeTokens(
  containerColor: .role(.primary),
  containerHeight: 16,
  containerOffset: 0,
  containerPaddingInline: 4,
  containerShape: 9999,
  dotOffset: 2,
  dotSize: 6,
  labelColor: .role(.onPrimary),
  labelTypescale: acmeTypescale.labelSmall,
  outlineColor: .role(.surface),
  outlineWidth: 2
)

private let acmeBottomSheetTokens = TanreiBottomSheetTokens(
  containerColor: .role(.surfaceContainerLow),
  containerElevation: acmeElevation.level2,
  containerMarginBlockStart: 48,
  containerMaxWidth: 640,
  containerPadding: 16,
  containerPartialFraction: 0.5,
  containerShape: 12,
  contentColor: .role(.onSurface),
  handleContainerHeight: 24,
  handleContainerShape: 9999,
  handleContainerWidth: 48,
  handleGripHeight: 4,
  handleGripShape: 9999,
  handleGripWidth: 32,
  handleMarginBlock: 12,
  motionEnterDuration: 300,
  motionEnterEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionExitDuration: 200,
  motionExitEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  scrimBlur: 0,
  scrimColor: .role(.scrim),
  controls: TanreiBottomSheetControls(
    dragHandle: TanreiBottomSheetControlTokens(
      enabled: TanreiBottomSheetControlStateTokens(
        containerColor: .none,
        gripColor: .role(.outline),
        stateLayerColor: .role(.outline)
      ),
      hovered: TanreiBottomSheetControlStateTokens(
        containerColor: .mix(base: .none, with: .role(.outline), amount: 0.06),
        gripColor: .role(.outline),
        stateLayerColor: .role(.outline)
      ),
      focused: TanreiBottomSheetControlStateTokens(
        containerColor: .mix(base: .none, with: .role(.outline), amount: 0.12),
        gripColor: .role(.outline),
        stateLayerColor: .role(.outline)
      ),
      pressed: TanreiBottomSheetControlStateTokens(
        containerColor: .mix(base: .none, with: .role(.outline), amount: 0.2),
        gripColor: .role(.outline),
        stateLayerColor: .role(.outline)
      )
    )
  ),
  hovered: TanreiBottomSheetStateTokens(
    opacity: 1
  ),
  focused: TanreiBottomSheetStateTokens(
    opacity: 1
  ),
  pressed: TanreiBottomSheetStateTokens(
    opacity: 1
  )
)

private let acmeBreadcrumbsTokens = TanreiBreadcrumbsTokens(
  containerGap: 4,
  containerShape: 3,
  iconSize: 16,
  labelColor: .role(.onSurfaceVariant),
  labelTypescale: acmeTypescale.body,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  rowGap: 4,
  separatorColor: .role(.onSurfaceVariant),
  separatorGap: 4,
  separatorSize: 16,
  underlineOffset: 2,
  underlineVisibility: 0,
  underlineWidth: 1,
  parts: TanreiBreadcrumbsParts(
    item: TanreiBreadcrumbsPartTokens(
      enabled: TanreiBreadcrumbsPartStateTokens(
        containerColor: .none,
        contentColor: .role(.link),
        stateLayerColor: .role(.link)
      ),
      hovered: TanreiBreadcrumbsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.link), amount: 0.06),
        contentColor: .role(.link),
        stateLayerColor: .role(.link)
      ),
      focused: TanreiBreadcrumbsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.link), amount: 0.12),
        contentColor: .role(.link),
        stateLayerColor: .role(.link)
      ),
      pressed: TanreiBreadcrumbsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.link), amount: 0.2),
        contentColor: .role(.link),
        stateLayerColor: .role(.link)
      )
    ),
    current: TanreiBreadcrumbsPartTokens(
      enabled: TanreiBreadcrumbsPartStateTokens(
        containerColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiBreadcrumbsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiBreadcrumbsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiBreadcrumbsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      )
    ),
    overflow: TanreiBreadcrumbsPartTokens(
      enabled: TanreiBreadcrumbsPartStateTokens(
        containerColor: .none,
        contentColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      hovered: TanreiBreadcrumbsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.06),
        contentColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiBreadcrumbsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        contentColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiBreadcrumbsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.2),
        contentColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      )
    )
  ),
  hovered: TanreiBreadcrumbsStateTokens(
    containerShape: 3,
    opacity: 1
  ),
  focused: TanreiBreadcrumbsStateTokens(
    containerShape: 3,
    opacity: 1
  ),
  pressed: TanreiBreadcrumbsStateTokens(
    containerShape: 3,
    opacity: 1
  )
)

private let acmeButtonGroupTokens = TanreiButtonGroupTokens(
  connectedDividerColor: .role(.outlineVariant),
  connectedDividerInset: 8,
  connectedDividerOnFillColor: .role(.outline),
  connectedDividerThickness: 1,
  connectedGap: 2,
  connectedHorizontalOuterInset: 4,
  connectedHorizontalOuterShape: 9999,
  connectedInnerShape: 6,
  connectedSeparation: 0,
  connectedVerticalOuterShape: 12,
  standardGap: 16
)

private let acmeButtonWithMenuTokens = TanreiButtonWithMenuTokens(
  containerInnerGap: 2,
  containerInnerShape: 6,
  containerInnerShapeOpen: 6,
  containerOuterInset: 4,
  containerSeparation: 0,
  containerShape: 9999,
  dividerInset: 8,
  dividerThickness: 1,
  motionFeedbackDuration: 450,
  motionHoverCloseDelay: 300,
  motionHoverOpenDelay: 300,
  motionOpenDuration: 350,
  motionOpenEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  sizes: TanreiButtonWithMenuSizes(
    small: TanreiButtonWithMenuSizeTokens(
      containerHeight: 32,
      containerPaddingBlock: 6,
      containerGap: 8,
      leadingPaddingInlineStart: 16,
      leadingPaddingInlineStartWithIcon: 12,
      leadingPaddingInlineEnd: 16,
      trailingPaddingInline: 6,
      trailingPaddingInlineNarrow: 4,
      labelTypescale: acmeTypescale.label,
      iconSize: 20,
      outlineWidth: 1
    ),
    medium: TanreiButtonWithMenuSizeTokens(
      containerHeight: 40,
      containerPaddingBlock: 6,
      containerGap: 8,
      leadingPaddingInlineStart: 16,
      leadingPaddingInlineStartWithIcon: 12,
      leadingPaddingInlineEnd: 16,
      trailingPaddingInline: 8,
      trailingPaddingInlineNarrow: 4,
      labelTypescale: acmeTypescale.label,
      iconSize: 24,
      outlineWidth: 1
    ),
    large: TanreiButtonWithMenuSizeTokens(
      containerHeight: 56,
      containerPaddingBlock: 6,
      containerGap: 8,
      leadingPaddingInlineStart: 24,
      leadingPaddingInlineStartWithIcon: 16,
      leadingPaddingInlineEnd: 24,
      trailingPaddingInline: 16,
      trailingPaddingInlineNarrow: 4,
      labelTypescale: acmeTypescale.label,
      iconSize: 24,
      outlineWidth: 1
    )
  ),
  variants: TanreiButtonWithMenuVariants(
    filled: TanreiButtonWithMenuVariantTokens(
      enabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .role(.primary),
        containerElevation: acmeElevation.level0,
        labelColor: .role(.onPrimary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.onPrimary)
      ),
      hovered: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.06),
        containerElevation: acmeElevation.level0,
        labelColor: .role(.onPrimary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.onPrimary)
      ),
      focused: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        containerElevation: acmeElevation.level0,
        labelColor: .role(.onPrimary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.onPrimary)
      ),
      pressed: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.2),
        containerElevation: acmeElevation.level0,
        labelColor: .role(.onPrimary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.onPrimary)
      ),
      disabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: acmeElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        dividerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    tonal: TanreiButtonWithMenuVariantTokens(
      enabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .role(.secondaryContainer),
        containerElevation: acmeElevation.level0,
        labelColor: .role(.onSecondaryContainer),
        outlineColor: .none,
        dividerColor: .role(.outlineVariant),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.06),
        containerElevation: acmeElevation.level0,
        labelColor: .role(.onSecondaryContainer),
        outlineColor: .none,
        dividerColor: .role(.outlineVariant),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        containerElevation: acmeElevation.level0,
        labelColor: .role(.onSecondaryContainer),
        outlineColor: .none,
        dividerColor: .role(.outlineVariant),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.2),
        containerElevation: acmeElevation.level0,
        labelColor: .role(.onSecondaryContainer),
        outlineColor: .none,
        dividerColor: .role(.outlineVariant),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: acmeElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        dividerColor: .role(.outlineVariant),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    elevated: TanreiButtonWithMenuVariantTokens(
      enabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: acmeElevation.level2,
        labelColor: .role(.onSurface),
        outlineColor: .none,
        dividerColor: .role(.outlineVariant),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurface), amount: 0.06),
        containerElevation: acmeElevation.level2,
        labelColor: .role(.onSurface),
        outlineColor: .none,
        dividerColor: .role(.outlineVariant),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurface), amount: 0.12),
        containerElevation: acmeElevation.level2,
        labelColor: .role(.onSurface),
        outlineColor: .none,
        dividerColor: .role(.outlineVariant),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurface), amount: 0.2),
        containerElevation: acmeElevation.level2,
        labelColor: .role(.onSurface),
        outlineColor: .none,
        dividerColor: .role(.outlineVariant),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: acmeElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        dividerColor: .role(.outlineVariant),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    outlined: TanreiButtonWithMenuVariantTokens(
      enabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .none,
        containerElevation: acmeElevation.level0,
        labelColor: .role(.onSurface),
        outlineColor: .role(.outlineVariant),
        dividerColor: .role(.outlineVariant),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        containerElevation: acmeElevation.level0,
        labelColor: .role(.onSurface),
        outlineColor: .role(.outlineVariant),
        dividerColor: .role(.outlineVariant),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        containerElevation: acmeElevation.level0,
        labelColor: .role(.onSurface),
        outlineColor: .role(.outlineVariant),
        dividerColor: .role(.outlineVariant),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        containerElevation: acmeElevation.level0,
        labelColor: .role(.onSurface),
        outlineColor: .role(.outlineVariant),
        dividerColor: .role(.outlineVariant),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .none,
        containerElevation: acmeElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .role(.outlineVariant),
        dividerColor: .role(.outlineVariant),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiButtonWithMenuStateTokens(
    containerShape: 9999,
    opacity: 1
  ),
  focused: TanreiButtonWithMenuStateTokens(
    containerShape: 9999,
    opacity: 1
  ),
  pressed: TanreiButtonWithMenuStateTokens(
    containerShape: 9999,
    opacity: 1
  ),
  disabled: TanreiButtonWithMenuStateTokens(
    containerShape: 9999,
    opacity: 1
  )
)

private let acmeButtonTokens = TanreiButtonTokens(
  busyIndicatorThickness: 2,
  containerShape: 9999,
  motionBusyCycleDuration: 1000,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  sizes: TanreiButtonSizes(
    small: TanreiButtonSizeTokens(
      containerHeight: 32,
      containerPaddingInlineNarrow: 4,
      containerWidthWide: 40,
      containerPaddingInlineStart: 16,
      containerPaddingInlineEnd: 16,
      containerPaddingInlineStartWithIcon: 12,
      containerPaddingInlineEndWithIcon: 12,
      containerPaddingBlock: 6,
      labelTypescale: acmeTypescale.label,
      iconSize: 20,
      iconSizeWithoutLabel: 20,
      containerGap: 8,
      outlineWidth: 1
    ),
    medium: TanreiButtonSizeTokens(
      containerHeight: 40,
      containerPaddingInlineNarrow: 4,
      containerWidthWide: 52,
      containerPaddingInlineStart: 16,
      containerPaddingInlineEnd: 16,
      containerPaddingInlineStartWithIcon: 12,
      containerPaddingInlineEndWithIcon: 12,
      containerPaddingBlock: 6,
      labelTypescale: acmeTypescale.label,
      iconSize: 24,
      iconSizeWithoutLabel: 24,
      containerGap: 8,
      outlineWidth: 1
    ),
    large: TanreiButtonSizeTokens(
      containerHeight: 56,
      containerPaddingInlineNarrow: 4,
      containerWidthWide: 72,
      containerPaddingInlineStart: 24,
      containerPaddingInlineEnd: 24,
      containerPaddingInlineStartWithIcon: 16,
      containerPaddingInlineEndWithIcon: 16,
      containerPaddingBlock: 6,
      labelTypescale: acmeTypescale.label,
      iconSize: 24,
      iconSizeWithoutLabel: 24,
      containerGap: 8,
      outlineWidth: 1
    ),
    extra: [
      TanreiButtonSize(rawValue: "3x"): TanreiButtonSizeTokens(
        containerHeight: 84,
        containerPaddingInlineNarrow: 6,
        containerWidthWide: 108,
        containerPaddingInlineStart: 36,
        containerPaddingInlineEnd: 36,
        containerPaddingInlineStartWithIcon: 24,
        containerPaddingInlineEndWithIcon: 24,
        containerPaddingBlock: 16,
        labelTypescale: acmeTypescale.label,
        iconSize: 36,
        iconSizeWithoutLabel: 36,
        containerGap: 12,
        outlineWidth: 1.5
      ),
    ]
  ),
  variants: TanreiButtonVariants(
    filled: TanreiButtonVariantTokens(
      enabled: TanreiButtonVariantStateTokens(
        containerColor: .role(.primary),
        labelColor: .role(.onPrimary),
        iconColor: .role(.onPrimary),
        outlineColor: .none,
        stateLayerColor: .role(.onPrimary),
        containerElevation: acmeElevation.level0,
        unselectedContainerColor: .role(.surfaceContainerHighest),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .role(.primary),
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary),
        destructiveContainerColor: .role(.error),
        destructiveLabelColor: .role(.onError),
        destructiveIconColor: .role(.onError),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .role(.onError)
      ),
      hovered: TanreiButtonVariantStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.06),
        labelColor: .role(.onPrimary),
        iconColor: .role(.onPrimary),
        outlineColor: .none,
        stateLayerColor: .role(.onPrimary),
        containerElevation: acmeElevation.level0,
        unselectedContainerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurfaceVariant), amount: 0.06),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.06),
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary),
        destructiveContainerColor: .mix(base: .role(.error), with: .role(.onError), amount: 0.06),
        destructiveLabelColor: .role(.onError),
        destructiveIconColor: .role(.onError),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .role(.onError)
      ),
      focused: TanreiButtonVariantStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        labelColor: .role(.onPrimary),
        iconColor: .role(.onPrimary),
        outlineColor: .none,
        stateLayerColor: .role(.onPrimary),
        containerElevation: acmeElevation.level0,
        unselectedContainerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurfaceVariant), amount: 0.12),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary),
        destructiveContainerColor: .mix(base: .role(.error), with: .role(.onError), amount: 0.12),
        destructiveLabelColor: .role(.onError),
        destructiveIconColor: .role(.onError),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .role(.onError)
      ),
      pressed: TanreiButtonVariantStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.2),
        labelColor: .role(.onPrimary),
        iconColor: .role(.onPrimary),
        outlineColor: .none,
        stateLayerColor: .role(.onPrimary),
        containerElevation: acmeElevation.level0,
        unselectedContainerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurfaceVariant), amount: 0.2),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.2),
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary),
        destructiveContainerColor: .mix(base: .role(.error), with: .role(.onError), amount: 0.2),
        destructiveLabelColor: .role(.onError),
        destructiveIconColor: .role(.onError),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .role(.onError)
      ),
      disabled: TanreiButtonVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        containerElevation: acmeElevation.level0,
        unselectedContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        unselectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        unselectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        selectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        destructiveContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        destructiveLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        destructiveIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    tonal: TanreiButtonVariantTokens(
      enabled: TanreiButtonVariantStateTokens(
        containerColor: .role(.secondaryContainer),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        outlineColor: .none,
        stateLayerColor: .role(.onSecondaryContainer),
        containerElevation: acmeElevation.level0,
        unselectedContainerColor: .role(.surfaceContainerHighest),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .role(.secondary),
        selectedLabelColor: .role(.onSecondary),
        selectedIconColor: .role(.onSecondary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onSecondary),
        destructiveContainerColor: .role(.errorContainer),
        destructiveLabelColor: .role(.onErrorContainer),
        destructiveIconColor: .role(.onErrorContainer),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .role(.onErrorContainer)
      ),
      hovered: TanreiButtonVariantStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.06),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        outlineColor: .none,
        stateLayerColor: .role(.onSecondaryContainer),
        containerElevation: acmeElevation.level0,
        unselectedContainerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurfaceVariant), amount: 0.06),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .role(.secondary), with: .role(.onSecondary), amount: 0.06),
        selectedLabelColor: .role(.onSecondary),
        selectedIconColor: .role(.onSecondary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onSecondary),
        destructiveContainerColor: .mix(base: .role(.errorContainer), with: .role(.onErrorContainer), amount: 0.06),
        destructiveLabelColor: .role(.onErrorContainer),
        destructiveIconColor: .role(.onErrorContainer),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .role(.onErrorContainer)
      ),
      focused: TanreiButtonVariantStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        outlineColor: .none,
        stateLayerColor: .role(.onSecondaryContainer),
        containerElevation: acmeElevation.level0,
        unselectedContainerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurfaceVariant), amount: 0.12),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .role(.secondary), with: .role(.onSecondary), amount: 0.12),
        selectedLabelColor: .role(.onSecondary),
        selectedIconColor: .role(.onSecondary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onSecondary),
        destructiveContainerColor: .mix(base: .role(.errorContainer), with: .role(.onErrorContainer), amount: 0.12),
        destructiveLabelColor: .role(.onErrorContainer),
        destructiveIconColor: .role(.onErrorContainer),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .role(.onErrorContainer)
      ),
      pressed: TanreiButtonVariantStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.2),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        outlineColor: .none,
        stateLayerColor: .role(.onSecondaryContainer),
        containerElevation: acmeElevation.level0,
        unselectedContainerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurfaceVariant), amount: 0.2),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .role(.secondary), with: .role(.onSecondary), amount: 0.2),
        selectedLabelColor: .role(.onSecondary),
        selectedIconColor: .role(.onSecondary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onSecondary),
        destructiveContainerColor: .mix(base: .role(.errorContainer), with: .role(.onErrorContainer), amount: 0.2),
        destructiveLabelColor: .role(.onErrorContainer),
        destructiveIconColor: .role(.onErrorContainer),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .role(.onErrorContainer)
      ),
      disabled: TanreiButtonVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        containerElevation: acmeElevation.level0,
        unselectedContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        unselectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        unselectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        selectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        destructiveContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        destructiveLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        destructiveIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    elevated: TanreiButtonVariantTokens(
      enabled: TanreiButtonVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface),
        containerElevation: acmeElevation.level2,
        unselectedContainerColor: .role(.surfaceContainerLowest),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .role(.primary),
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary),
        destructiveContainerColor: .role(.surfaceContainerLowest),
        destructiveLabelColor: .role(.error),
        destructiveIconColor: .role(.error),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .role(.error)
      ),
      hovered: TanreiButtonVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurface), amount: 0.06),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface),
        containerElevation: acmeElevation.level2,
        unselectedContainerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurfaceVariant), amount: 0.06),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.06),
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary),
        destructiveContainerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.error), amount: 0.06),
        destructiveLabelColor: .role(.error),
        destructiveIconColor: .role(.error),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .role(.error)
      ),
      focused: TanreiButtonVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurface), amount: 0.12),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface),
        containerElevation: acmeElevation.level2,
        unselectedContainerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurfaceVariant), amount: 0.12),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary),
        destructiveContainerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.error), amount: 0.12),
        destructiveLabelColor: .role(.error),
        destructiveIconColor: .role(.error),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .role(.error)
      ),
      pressed: TanreiButtonVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurface), amount: 0.2),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface),
        containerElevation: acmeElevation.level2,
        unselectedContainerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurfaceVariant), amount: 0.2),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.2),
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary),
        destructiveContainerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.error), amount: 0.2),
        destructiveLabelColor: .role(.error),
        destructiveIconColor: .role(.error),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .role(.error)
      ),
      disabled: TanreiButtonVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        containerElevation: acmeElevation.level0,
        unselectedContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        unselectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        unselectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        selectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        destructiveContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        destructiveLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        destructiveIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    outlined: TanreiButtonVariantTokens(
      enabled: TanreiButtonVariantStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        outlineColor: .role(.outlineVariant),
        stateLayerColor: .role(.onSurface),
        containerElevation: acmeElevation.level0,
        unselectedContainerColor: .none,
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .role(.outlineVariant),
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .role(.inverseSurface),
        selectedLabelColor: .role(.inverseOnSurface),
        selectedIconColor: .role(.inverseOnSurface),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.inverseOnSurface),
        destructiveContainerColor: .none,
        destructiveLabelColor: .role(.error),
        destructiveIconColor: .role(.error),
        destructiveOutlineColor: .role(.error),
        destructiveStateLayerColor: .role(.error)
      ),
      hovered: TanreiButtonVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        outlineColor: .role(.outlineVariant),
        stateLayerColor: .role(.onSurface),
        containerElevation: acmeElevation.level0,
        unselectedContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.06),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .role(.outlineVariant),
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .role(.inverseSurface), with: .role(.inverseOnSurface), amount: 0.06),
        selectedLabelColor: .role(.inverseOnSurface),
        selectedIconColor: .role(.inverseOnSurface),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.inverseOnSurface),
        destructiveContainerColor: .mix(base: .none, with: .role(.error), amount: 0.06),
        destructiveLabelColor: .role(.error),
        destructiveIconColor: .role(.error),
        destructiveOutlineColor: .role(.error),
        destructiveStateLayerColor: .role(.error)
      ),
      focused: TanreiButtonVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        outlineColor: .role(.outlineVariant),
        stateLayerColor: .role(.onSurface),
        containerElevation: acmeElevation.level0,
        unselectedContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .role(.outlineVariant),
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .role(.inverseSurface), with: .role(.inverseOnSurface), amount: 0.12),
        selectedLabelColor: .role(.inverseOnSurface),
        selectedIconColor: .role(.inverseOnSurface),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.inverseOnSurface),
        destructiveContainerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
        destructiveLabelColor: .role(.error),
        destructiveIconColor: .role(.error),
        destructiveOutlineColor: .role(.error),
        destructiveStateLayerColor: .role(.error)
      ),
      pressed: TanreiButtonVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        outlineColor: .role(.outlineVariant),
        stateLayerColor: .role(.onSurface),
        containerElevation: acmeElevation.level0,
        unselectedContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.2),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .role(.outlineVariant),
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .role(.inverseSurface), with: .role(.inverseOnSurface), amount: 0.2),
        selectedLabelColor: .role(.inverseOnSurface),
        selectedIconColor: .role(.inverseOnSurface),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.inverseOnSurface),
        destructiveContainerColor: .mix(base: .none, with: .role(.error), amount: 0.2),
        destructiveLabelColor: .role(.error),
        destructiveIconColor: .role(.error),
        destructiveOutlineColor: .role(.error),
        destructiveStateLayerColor: .role(.error)
      ),
      disabled: TanreiButtonVariantStateTokens(
        containerColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .role(.outlineVariant),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        containerElevation: acmeElevation.level0,
        unselectedContainerColor: .none,
        unselectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        unselectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        unselectedOutlineColor: .role(.outlineVariant),
        unselectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        selectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        destructiveContainerColor: .none,
        destructiveLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        destructiveIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        destructiveOutlineColor: .role(.outlineVariant),
        destructiveStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    text: TanreiButtonVariantTokens(
      enabled: TanreiButtonVariantStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface),
        containerElevation: acmeElevation.level0,
        unselectedContainerColor: .none,
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .none,
        selectedLabelColor: .role(.onSurface),
        selectedIconColor: .role(.onSurface),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onSurface),
        destructiveContainerColor: .none,
        destructiveLabelColor: .role(.error),
        destructiveIconColor: .role(.error),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .role(.error)
      ),
      hovered: TanreiButtonVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface),
        containerElevation: acmeElevation.level0,
        unselectedContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.06),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        selectedLabelColor: .role(.onSurface),
        selectedIconColor: .role(.onSurface),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onSurface),
        destructiveContainerColor: .mix(base: .none, with: .role(.error), amount: 0.06),
        destructiveLabelColor: .role(.error),
        destructiveIconColor: .role(.error),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .role(.error)
      ),
      focused: TanreiButtonVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface),
        containerElevation: acmeElevation.level0,
        unselectedContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        selectedLabelColor: .role(.onSurface),
        selectedIconColor: .role(.onSurface),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onSurface),
        destructiveContainerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
        destructiveLabelColor: .role(.error),
        destructiveIconColor: .role(.error),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .role(.error)
      ),
      pressed: TanreiButtonVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface),
        containerElevation: acmeElevation.level0,
        unselectedContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.2),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        selectedLabelColor: .role(.onSurface),
        selectedIconColor: .role(.onSurface),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onSurface),
        destructiveContainerColor: .mix(base: .none, with: .role(.error), amount: 0.2),
        destructiveLabelColor: .role(.error),
        destructiveIconColor: .role(.error),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .role(.error)
      ),
      disabled: TanreiButtonVariantStateTokens(
        containerColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        containerElevation: acmeElevation.level0,
        unselectedContainerColor: .none,
        unselectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        unselectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedContainerColor: .none,
        selectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        destructiveContainerColor: .none,
        destructiveLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        destructiveIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    extra: [
      TanreiButtonVariant(rawValue: "danger"): TanreiButtonVariantTokens(
        enabled: TanreiButtonVariantStateTokens(
          containerColor: .role(.error),
          labelColor: .role(.onError),
          iconColor: .role(.onError),
          outlineColor: .none,
          stateLayerColor: .role(.onError),
          containerElevation: acmeElevation.level0,
          unselectedContainerColor: .role(.surfaceContainerHighest),
          unselectedLabelColor: .role(.onSurfaceVariant),
          unselectedIconColor: .role(.onSurfaceVariant),
          unselectedOutlineColor: .none,
          unselectedStateLayerColor: .role(.onSurfaceVariant),
          selectedContainerColor: .role(.primary),
          selectedLabelColor: .role(.onPrimary),
          selectedIconColor: .role(.onPrimary),
          selectedOutlineColor: .none,
          selectedStateLayerColor: .role(.onPrimary),
          destructiveContainerColor: .role(.error),
          destructiveLabelColor: .role(.onError),
          destructiveIconColor: .role(.onError),
          destructiveOutlineColor: .none,
          destructiveStateLayerColor: .role(.onError)
        ),
        hovered: TanreiButtonVariantStateTokens(
          containerColor: .mix(base: .role(.error), with: .role(.onError), amount: 0.06),
          labelColor: .role(.onError),
          iconColor: .role(.onError),
          outlineColor: .none,
          stateLayerColor: .role(.onError),
          containerElevation: acmeElevation.level0,
          unselectedContainerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurfaceVariant), amount: 0.06),
          unselectedLabelColor: .role(.onSurfaceVariant),
          unselectedIconColor: .role(.onSurfaceVariant),
          unselectedOutlineColor: .none,
          unselectedStateLayerColor: .role(.onSurfaceVariant),
          selectedContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.06),
          selectedLabelColor: .role(.onPrimary),
          selectedIconColor: .role(.onPrimary),
          selectedOutlineColor: .none,
          selectedStateLayerColor: .role(.onPrimary),
          destructiveContainerColor: .mix(base: .role(.error), with: .role(.onError), amount: 0.06),
          destructiveLabelColor: .role(.onError),
          destructiveIconColor: .role(.onError),
          destructiveOutlineColor: .none,
          destructiveStateLayerColor: .role(.onError)
        ),
        focused: TanreiButtonVariantStateTokens(
          containerColor: .mix(base: .role(.error), with: .role(.onError), amount: 0.12),
          labelColor: .role(.onError),
          iconColor: .role(.onError),
          outlineColor: .none,
          stateLayerColor: .role(.onError),
          containerElevation: acmeElevation.level0,
          unselectedContainerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurfaceVariant), amount: 0.12),
          unselectedLabelColor: .role(.onSurfaceVariant),
          unselectedIconColor: .role(.onSurfaceVariant),
          unselectedOutlineColor: .none,
          unselectedStateLayerColor: .role(.onSurfaceVariant),
          selectedContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
          selectedLabelColor: .role(.onPrimary),
          selectedIconColor: .role(.onPrimary),
          selectedOutlineColor: .none,
          selectedStateLayerColor: .role(.onPrimary),
          destructiveContainerColor: .mix(base: .role(.error), with: .role(.onError), amount: 0.12),
          destructiveLabelColor: .role(.onError),
          destructiveIconColor: .role(.onError),
          destructiveOutlineColor: .none,
          destructiveStateLayerColor: .role(.onError)
        ),
        pressed: TanreiButtonVariantStateTokens(
          containerColor: .mix(base: .role(.error), with: .role(.onError), amount: 0.2),
          labelColor: .role(.onError),
          iconColor: .role(.onError),
          outlineColor: .none,
          stateLayerColor: .role(.onError),
          containerElevation: acmeElevation.level0,
          unselectedContainerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurfaceVariant), amount: 0.2),
          unselectedLabelColor: .role(.onSurfaceVariant),
          unselectedIconColor: .role(.onSurfaceVariant),
          unselectedOutlineColor: .none,
          unselectedStateLayerColor: .role(.onSurfaceVariant),
          selectedContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.2),
          selectedLabelColor: .role(.onPrimary),
          selectedIconColor: .role(.onPrimary),
          selectedOutlineColor: .none,
          selectedStateLayerColor: .role(.onPrimary),
          destructiveContainerColor: .mix(base: .role(.error), with: .role(.onError), amount: 0.2),
          destructiveLabelColor: .role(.onError),
          destructiveIconColor: .role(.onError),
          destructiveOutlineColor: .none,
          destructiveStateLayerColor: .role(.onError)
        ),
        disabled: TanreiButtonVariantStateTokens(
          containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
          labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
          iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
          outlineColor: .none,
          stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
          containerElevation: acmeElevation.level0,
          unselectedContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
          unselectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
          unselectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
          unselectedOutlineColor: .none,
          unselectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
          selectedContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
          selectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
          selectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
          selectedOutlineColor: .none,
          selectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
          destructiveContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
          destructiveLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
          destructiveIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
          destructiveOutlineColor: .none,
          destructiveStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
        )
      ),
    ]
  ),
  hovered: TanreiButtonStateTokens(
    containerShape: 9999,
    opacity: 1
  ),
  focused: TanreiButtonStateTokens(
    containerShape: 9999,
    opacity: 1
  ),
  pressed: TanreiButtonStateTokens(
    containerShape: 9999,
    opacity: 1
  ),
  disabled: TanreiButtonStateTokens(
    containerShape: 9999,
    opacity: 1
  )
)

private let acmeCalendarTokens = TanreiCalendarTokens(
  cellSize: 48,
  dayContainerShape: 9999,
  dayContainerSize: 40,
  dayLabelTypescale: acmeTypescale.body,
  motionFeedbackDuration: 450,
  motionPageDuration: 250,
  motionPageEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  navigationAxis: 0,
  navigationGap: 8,
  outlineWidth: 1,
  viewToggleContainerHeight: 36,
  viewToggleContainerPaddingInline: 12,
  viewToggleContainerShape: 9999,
  viewToggleGap: 4,
  viewToggleIconSize: 20,
  viewToggleLabelTypescale: acmeTypescale.label,
  weekdayColor: .role(.onSurfaceVariant),
  weekdayTypescale: acmeTypescale.labelSmall,
  yearContainerHeight: 36,
  yearContainerShape: 9999,
  yearContainerWidth: 72,
  yearLabelTypescale: acmeTypescale.body,
  conditions: TanreiCalendarConditions(
    unselected: TanreiCalendarConditionTokens(
      enabled: TanreiCalendarConditionStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiCalendarConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        labelColor: .role(.onSurface),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiCalendarConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        labelColor: .role(.onSurface),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiCalendarConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        labelColor: .role(.onSurface),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiCalendarConditionStateTokens(
        containerColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    adjacent: TanreiCalendarConditionTokens(
      enabled: TanreiCalendarConditionStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurfaceVariant),
        outlineColor: .none,
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      hovered: TanreiCalendarConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.06),
        labelColor: .role(.onSurfaceVariant),
        outlineColor: .none,
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiCalendarConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        labelColor: .role(.onSurfaceVariant),
        outlineColor: .none,
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiCalendarConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.2),
        labelColor: .role(.onSurfaceVariant),
        outlineColor: .none,
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      disabled: TanreiCalendarConditionStateTokens(
        containerColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    today: TanreiCalendarConditionTokens(
      enabled: TanreiCalendarConditionStateTokens(
        containerColor: .none,
        labelColor: .role(.primary),
        outlineColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      hovered: TanreiCalendarConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.06),
        labelColor: .role(.primary),
        outlineColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      focused: TanreiCalendarConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
        labelColor: .role(.primary),
        outlineColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      pressed: TanreiCalendarConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.2),
        labelColor: .role(.primary),
        outlineColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      disabled: TanreiCalendarConditionStateTokens(
        containerColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    selected: TanreiCalendarConditionTokens(
      enabled: TanreiCalendarConditionStateTokens(
        containerColor: .role(.primary),
        labelColor: .role(.onPrimary),
        outlineColor: .none,
        stateLayerColor: .role(.onPrimary)
      ),
      hovered: TanreiCalendarConditionStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.06),
        labelColor: .role(.onPrimary),
        outlineColor: .none,
        stateLayerColor: .role(.onPrimary)
      ),
      focused: TanreiCalendarConditionStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        labelColor: .role(.onPrimary),
        outlineColor: .none,
        stateLayerColor: .role(.onPrimary)
      ),
      pressed: TanreiCalendarConditionStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.2),
        labelColor: .role(.onPrimary),
        outlineColor: .none,
        stateLayerColor: .role(.onPrimary)
      ),
      disabled: TanreiCalendarConditionStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    inRange: TanreiCalendarConditionTokens(
      enabled: TanreiCalendarConditionStateTokens(
        containerColor: .role(.surfaceDim),
        labelColor: .role(.onSurface),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiCalendarConditionStateTokens(
        containerColor: .mix(base: .role(.surfaceDim), with: .role(.onSurface), amount: 0.06),
        labelColor: .role(.onSurface),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiCalendarConditionStateTokens(
        containerColor: .mix(base: .role(.surfaceDim), with: .role(.onSurface), amount: 0.12),
        labelColor: .role(.onSurface),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiCalendarConditionStateTokens(
        containerColor: .mix(base: .role(.surfaceDim), with: .role(.onSurface), amount: 0.2),
        labelColor: .role(.onSurface),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiCalendarConditionStateTokens(
        containerColor: .role(.surfaceDim),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiCalendarStateTokens(
    opacity: 1
  ),
  focused: TanreiCalendarStateTokens(
    opacity: 1
  ),
  pressed: TanreiCalendarStateTokens(
    opacity: 1
  ),
  disabled: TanreiCalendarStateTokens(
    opacity: 1
  )
)

private let acmeCalloutTokens = TanreiCalloutTokens(
  actionsGap: 12,
  actionsItemGap: 8,
  containerGap: 8,
  containerPaddingBlock: 12,
  containerPaddingInline: 16,
  containerPaddingInlineEndWithClose: 8,
  containerShape: 8,
  controlsHeight: 32,
  controlsIconSize: 20,
  controlsShape: 9999,
  iconGap: 12,
  iconOpacity: 0.85,
  iconSize: 20,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineColor: .role(.outlineVariant),
  outlineWidth: 1,
  titleGap: 4,
  controls: TanreiCalloutControls(
    close: TanreiCalloutControlTokens(
      enabled: TanreiCalloutControlStateTokens(
        containerColor: .none,
        contentColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer),
        infoContainerColor: .none,
        infoContentColor: .role(.onInfoContainer),
        infoStateLayerColor: .role(.onInfoContainer),
        warningContainerColor: .none,
        warningContentColor: .role(.onWarningContainer),
        warningStateLayerColor: .role(.onWarningContainer),
        errorContainerColor: .none,
        errorContentColor: .role(.onErrorContainer),
        errorStateLayerColor: .role(.onErrorContainer),
        successContainerColor: .none,
        successContentColor: .role(.onSuccessContainer),
        successStateLayerColor: .role(.onSuccessContainer),
        outlinedContainerColor: .none,
        outlinedContentColor: .role(.onSurfaceVariant),
        outlinedStateLayerColor: .role(.onSurfaceVariant)
      ),
      hovered: TanreiCalloutControlStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSecondaryContainer), amount: 0.06),
        contentColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer),
        infoContainerColor: .mix(base: .none, with: .role(.onInfoContainer), amount: 0.06),
        infoContentColor: .role(.onInfoContainer),
        infoStateLayerColor: .role(.onInfoContainer),
        warningContainerColor: .mix(base: .none, with: .role(.onWarningContainer), amount: 0.06),
        warningContentColor: .role(.onWarningContainer),
        warningStateLayerColor: .role(.onWarningContainer),
        errorContainerColor: .mix(base: .none, with: .role(.onErrorContainer), amount: 0.06),
        errorContentColor: .role(.onErrorContainer),
        errorStateLayerColor: .role(.onErrorContainer),
        successContainerColor: .mix(base: .none, with: .role(.onSuccessContainer), amount: 0.06),
        successContentColor: .role(.onSuccessContainer),
        successStateLayerColor: .role(.onSuccessContainer),
        outlinedContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.06),
        outlinedContentColor: .role(.onSurfaceVariant),
        outlinedStateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiCalloutControlStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSecondaryContainer), amount: 0.12),
        contentColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer),
        infoContainerColor: .mix(base: .none, with: .role(.onInfoContainer), amount: 0.12),
        infoContentColor: .role(.onInfoContainer),
        infoStateLayerColor: .role(.onInfoContainer),
        warningContainerColor: .mix(base: .none, with: .role(.onWarningContainer), amount: 0.12),
        warningContentColor: .role(.onWarningContainer),
        warningStateLayerColor: .role(.onWarningContainer),
        errorContainerColor: .mix(base: .none, with: .role(.onErrorContainer), amount: 0.12),
        errorContentColor: .role(.onErrorContainer),
        errorStateLayerColor: .role(.onErrorContainer),
        successContainerColor: .mix(base: .none, with: .role(.onSuccessContainer), amount: 0.12),
        successContentColor: .role(.onSuccessContainer),
        successStateLayerColor: .role(.onSuccessContainer),
        outlinedContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        outlinedContentColor: .role(.onSurfaceVariant),
        outlinedStateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiCalloutControlStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSecondaryContainer), amount: 0.2),
        contentColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer),
        infoContainerColor: .mix(base: .none, with: .role(.onInfoContainer), amount: 0.2),
        infoContentColor: .role(.onInfoContainer),
        infoStateLayerColor: .role(.onInfoContainer),
        warningContainerColor: .mix(base: .none, with: .role(.onWarningContainer), amount: 0.2),
        warningContentColor: .role(.onWarningContainer),
        warningStateLayerColor: .role(.onWarningContainer),
        errorContainerColor: .mix(base: .none, with: .role(.onErrorContainer), amount: 0.2),
        errorContentColor: .role(.onErrorContainer),
        errorStateLayerColor: .role(.onErrorContainer),
        successContainerColor: .mix(base: .none, with: .role(.onSuccessContainer), amount: 0.2),
        successContentColor: .role(.onSuccessContainer),
        successStateLayerColor: .role(.onSuccessContainer),
        outlinedContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.2),
        outlinedContentColor: .role(.onSurfaceVariant),
        outlinedStateLayerColor: .role(.onSurfaceVariant)
      )
    )
  ),
  sizes: TanreiCalloutSizes(
    medium: TanreiCalloutSizeTokens(
      titleTypescale: acmeTypescale.heading6,
      bodyTypescale: acmeTypescale.body
    ),
    large: TanreiCalloutSizeTokens(
      titleTypescale: acmeTypescale.heading5,
      bodyTypescale: acmeTypescale.bodyLarge
    )
  ),
  variants: TanreiCalloutVariants(
    tonal: TanreiCalloutVariantTokens(
      containerColor: .role(.secondaryContainer),
      titleColor: .role(.onSecondaryContainer),
      bodyColor: .role(.onSecondaryContainer),
      iconColor: .role(.onSecondaryContainer),
      focusRingColor: .role(.onSecondaryContainer),
      infoContainerColor: .role(.infoContainer),
      infoTitleColor: .role(.onInfoContainer),
      infoBodyColor: .role(.onInfoContainer),
      infoIconColor: .role(.info),
      infoFocusRingColor: .role(.onInfoContainer),
      warningContainerColor: .role(.warningContainer),
      warningTitleColor: .role(.onWarningContainer),
      warningBodyColor: .role(.onWarningContainer),
      warningIconColor: .role(.warning),
      warningFocusRingColor: .role(.onWarningContainer),
      errorContainerColor: .role(.errorContainer),
      errorTitleColor: .role(.onErrorContainer),
      errorBodyColor: .role(.onErrorContainer),
      errorIconColor: .role(.error),
      errorFocusRingColor: .role(.onErrorContainer),
      successContainerColor: .role(.successContainer),
      successTitleColor: .role(.onSuccessContainer),
      successBodyColor: .role(.onSuccessContainer),
      successIconColor: .role(.success),
      successFocusRingColor: .role(.onSuccessContainer)
    ),
    outlined: TanreiCalloutVariantTokens(
      containerColor: .none,
      titleColor: .role(.onSurface),
      bodyColor: .role(.onSurface),
      iconColor: .role(.onSurfaceVariant),
      focusRingColor: .role(.focusRing),
      infoContainerColor: .none,
      infoTitleColor: .role(.onSurface),
      infoBodyColor: .role(.onSurface),
      infoIconColor: .role(.info),
      infoFocusRingColor: .role(.focusRing),
      warningContainerColor: .none,
      warningTitleColor: .role(.onSurface),
      warningBodyColor: .role(.onSurface),
      warningIconColor: .role(.warning),
      warningFocusRingColor: .role(.focusRing),
      errorContainerColor: .none,
      errorTitleColor: .role(.onSurface),
      errorBodyColor: .role(.onSurface),
      errorIconColor: .role(.error),
      errorFocusRingColor: .role(.focusRing),
      successContainerColor: .none,
      successTitleColor: .role(.onSurface),
      successBodyColor: .role(.onSurface),
      successIconColor: .role(.success),
      successFocusRingColor: .role(.focusRing)
    )
  ),
  hovered: TanreiCalloutStateTokens(
    opacity: 1
  ),
  focused: TanreiCalloutStateTokens(
    opacity: 1
  ),
  pressed: TanreiCalloutStateTokens(
    opacity: 1
  )
)

private let acmeCardTokens = TanreiCardTokens(
  containerPadding: 16,
  containerShape: 8,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineWidth: 1,
  variants: TanreiCardVariants(
    elevated: TanreiCardVariantTokens(
      enabled: TanreiCardVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: acmeElevation.level2,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiCardVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurface), amount: 0.06),
        containerElevation: acmeElevation.level3,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiCardVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurface), amount: 0.12),
        containerElevation: acmeElevation.level2,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiCardVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurface), amount: 0.2),
        containerElevation: acmeElevation.level2,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiCardVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: acmeElevation.level1,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    filled: TanreiCardVariantTokens(
      enabled: TanreiCardVariantStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: acmeElevation.level0,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiCardVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.06),
        containerElevation: acmeElevation.level0,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiCardVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.12),
        containerElevation: acmeElevation.level0,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiCardVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.2),
        containerElevation: acmeElevation.level0,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiCardVariantStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: acmeElevation.level0,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    outlined: TanreiCardVariantTokens(
      enabled: TanreiCardVariantStateTokens(
        containerColor: .role(.surface),
        containerElevation: acmeElevation.level0,
        outlineColor: .role(.outlineVariant),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiCardVariantStateTokens(
        containerColor: .mix(base: .role(.surface), with: .role(.onSurface), amount: 0.06),
        containerElevation: acmeElevation.level0,
        outlineColor: .role(.outlineVariant),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiCardVariantStateTokens(
        containerColor: .mix(base: .role(.surface), with: .role(.onSurface), amount: 0.12),
        containerElevation: acmeElevation.level0,
        outlineColor: .role(.outlineVariant),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiCardVariantStateTokens(
        containerColor: .mix(base: .role(.surface), with: .role(.onSurface), amount: 0.2),
        containerElevation: acmeElevation.level0,
        outlineColor: .role(.outlineVariant),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiCardVariantStateTokens(
        containerColor: .role(.surface),
        containerElevation: acmeElevation.level0,
        outlineColor: .role(.outlineVariant),
        contentColor: .role(.onSurface),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiCardStateTokens(
    opacity: 1
  ),
  focused: TanreiCardStateTokens(
    opacity: 1
  ),
  pressed: TanreiCardStateTokens(
    opacity: 1
  ),
  disabled: TanreiCardStateTokens(
    opacity: 0.38
  )
)

private let acmeCarouselTokens = TanreiCarouselTokens(
  autoplayInterval: 5000,
  containerLargeWidth: 200,
  containerMinScale: 0.85,
  containerShape: 12,
  containerSmallMaxWidth: 56,
  containerSmallMinWidth: 40,
  controlsButtonSize: 40,
  controlsHeight: 48,
  controlsIconSize: 24,
  controlsIndicatorPaddingInline: 12,
  controlsShape: 9999,
  dotActiveWidth: 24,
  dotColor: .role(.outline),
  dotGap: 8,
  dotSize: 8,
  layoutGap: 8,
  layoutHeight: 200,
  layoutPaddingInline: 16,
  motionAutoplayDuration: 500,
  motionAutoplayEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionFeedbackDuration: 450,
  motionScrollDuration: 300,
  motionScrollEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  navigationButtonVariant: 2,
  parts: TanreiCarouselParts(
    item: TanreiCarouselPartTokens(
      enabled: TanreiCarouselPartStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiCarouselPartStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.06),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiCarouselPartStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.12),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiCarouselPartStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.2),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      )
    ),
    playback: TanreiCarouselPartTokens(
      enabled: TanreiCarouselPartStateTokens(
        containerColor: .none,
        contentColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      hovered: TanreiCarouselPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.06),
        contentColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiCarouselPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        contentColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiCarouselPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.2),
        contentColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      )
    ),
    indicator: TanreiCarouselPartTokens(
      enabled: TanreiCarouselPartStateTokens(
        containerColor: .none,
        contentColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      hovered: TanreiCarouselPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.06),
        contentColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      focused: TanreiCarouselPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
        contentColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      pressed: TanreiCarouselPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.2),
        contentColor: .role(.primary),
        stateLayerColor: .role(.primary)
      )
    )
  ),
  hovered: TanreiCarouselStateTokens(
    containerShape: 12,
    opacity: 1
  ),
  focused: TanreiCarouselStateTokens(
    containerShape: 12,
    opacity: 1
  ),
  pressed: TanreiCarouselStateTokens(
    containerShape: 12,
    opacity: 1
  )
)

private let acmeChatComposerTokens = TanreiChatComposerTokens(
  actionsGap: 8,
  containerGap: 8,
  containerHeight: 56,
  containerPaddingBlock: 8,
  containerPaddingInline: 16,
  containerPaddingInlineWithButton: 8,
  containerRowGap: 4,
  containerShape: 9999,
  counterColor: .role(.onSurfaceVariant),
  counterErrorColor: .role(.error),
  counterTypescale: acmeTypescale.labelSmall,
  inputPaddingBlock: 8,
  layoutInlineMinWidth: 360,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineWidth: 1,
  receivingContainerColor: .role(.secondaryContainer),
  receivingOutlineColor: .role(.onSecondaryContainer),
  receivingOutlineWidth: 2,
  sendButtonVariant: 0,
  stripGap: 8,
  stripOffset: 4,
  stripPaddingBlockStart: 4,
  conditions: TanreiChatComposerConditions(
    standard: TanreiChatComposerConditionTokens(
      enabled: TanreiChatComposerConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: acmeElevation.level0,
        outlineColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiChatComposerConditionStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.06),
        containerElevation: acmeElevation.level0,
        outlineColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiChatComposerConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: acmeElevation.level0,
        outlineColor: .role(.focusRing),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiChatComposerConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: acmeElevation.level0,
        outlineColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    error: TanreiChatComposerConditionTokens(
      enabled: TanreiChatComposerConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: acmeElevation.level0,
        outlineColor: .role(.error),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiChatComposerConditionStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.06),
        containerElevation: acmeElevation.level0,
        outlineColor: .role(.error),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiChatComposerConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: acmeElevation.level0,
        outlineColor: .role(.error),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiChatComposerConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: acmeElevation.level0,
        outlineColor: .role(.error),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiChatComposerStateTokens(
    opacity: 1,
    outlineWidth: 1
  ),
  focused: TanreiChatComposerStateTokens(
    opacity: 1,
    outlineWidth: 2
  ),
  disabled: TanreiChatComposerStateTokens(
    opacity: 1,
    outlineWidth: 1
  )
)

private let acmeCheckboxTokens = TanreiCheckboxTokens(
  boxShape: 2,
  boxSize: 18,
  containerShape: 9999,
  containerSize: 40,
  labelGap: 4,
  labelTypescale: acmeTypescale.body,
  markSize: 20,
  markWeight: 400,
  markWidth: 2,
  motionFeedbackDuration: 450,
  motionMarkEnterScale: 0.5,
  motionMarkScaleDuration: 350,
  motionMarkScaleEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  motionSelectionDuration: 150,
  motionSelectionEasing: TanreiCubicBezier(0.31, 0.94, 0.34, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineWidth: 2,
  conditions: TanreiCheckboxConditions(
    unselected: TanreiCheckboxConditionTokens(
      enabled: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
        boxColor: .none,
        markColor: .none,
        outlineColor: .role(.outline),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.outline)
      ),
      hovered: TanreiCheckboxConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.outline), amount: 0.06),
        boxColor: .none,
        markColor: .none,
        outlineColor: .role(.outline),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.outline)
      ),
      focused: TanreiCheckboxConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.outline), amount: 0.12),
        boxColor: .none,
        markColor: .none,
        outlineColor: .role(.outline),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.outline)
      ),
      pressed: TanreiCheckboxConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.outline), amount: 0.2),
        boxColor: .none,
        markColor: .none,
        outlineColor: .role(.outline),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.outline)
      ),
      disabled: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
        boxColor: .none,
        markColor: .role(.surface),
        outlineColor: .alpha(of: .role(.onSurface), amount: 0.38),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    selected: TanreiCheckboxConditionTokens(
      enabled: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
        boxColor: .role(.primary),
        markColor: .role(.onPrimary),
        outlineColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      hovered: TanreiCheckboxConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.06),
        boxColor: .role(.primary),
        markColor: .role(.onPrimary),
        outlineColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      focused: TanreiCheckboxConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
        boxColor: .role(.primary),
        markColor: .role(.onPrimary),
        outlineColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      pressed: TanreiCheckboxConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.2),
        boxColor: .role(.primary),
        markColor: .role(.onPrimary),
        outlineColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      disabled: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
        boxColor: .alpha(of: .role(.onSurface), amount: 0.38),
        markColor: .role(.surface),
        outlineColor: .alpha(of: .role(.onSurface), amount: 0.38),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    indeterminate: TanreiCheckboxConditionTokens(
      enabled: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
        boxColor: .role(.primary),
        markColor: .role(.onPrimary),
        outlineColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      hovered: TanreiCheckboxConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.06),
        boxColor: .role(.primary),
        markColor: .role(.onPrimary),
        outlineColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      focused: TanreiCheckboxConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
        boxColor: .role(.primary),
        markColor: .role(.onPrimary),
        outlineColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      pressed: TanreiCheckboxConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.2),
        boxColor: .role(.primary),
        markColor: .role(.onPrimary),
        outlineColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      disabled: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
        boxColor: .alpha(of: .role(.onSurface), amount: 0.38),
        markColor: .role(.surface),
        outlineColor: .alpha(of: .role(.onSurface), amount: 0.38),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    errorUnselected: TanreiCheckboxConditionTokens(
      enabled: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
        boxColor: .none,
        markColor: .none,
        outlineColor: .role(.error),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      hovered: TanreiCheckboxConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.06),
        boxColor: .none,
        markColor: .none,
        outlineColor: .role(.error),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      focused: TanreiCheckboxConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
        boxColor: .none,
        markColor: .none,
        outlineColor: .role(.error),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      pressed: TanreiCheckboxConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.2),
        boxColor: .none,
        markColor: .none,
        outlineColor: .role(.error),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      disabled: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
        boxColor: .none,
        markColor: .role(.surface),
        outlineColor: .alpha(of: .role(.onSurface), amount: 0.38),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    errorSelected: TanreiCheckboxConditionTokens(
      enabled: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
        boxColor: .role(.error),
        markColor: .role(.onError),
        outlineColor: .role(.error),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      hovered: TanreiCheckboxConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.06),
        boxColor: .role(.error),
        markColor: .role(.onError),
        outlineColor: .role(.error),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      focused: TanreiCheckboxConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
        boxColor: .role(.error),
        markColor: .role(.onError),
        outlineColor: .role(.error),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      pressed: TanreiCheckboxConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.2),
        boxColor: .role(.error),
        markColor: .role(.onError),
        outlineColor: .role(.error),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      disabled: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
        boxColor: .alpha(of: .role(.onSurface), amount: 0.38),
        markColor: .role(.surface),
        outlineColor: .alpha(of: .role(.onSurface), amount: 0.38),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    errorIndeterminate: TanreiCheckboxConditionTokens(
      enabled: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
        boxColor: .role(.error),
        markColor: .role(.onError),
        outlineColor: .role(.error),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      hovered: TanreiCheckboxConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.06),
        boxColor: .role(.error),
        markColor: .role(.onError),
        outlineColor: .role(.error),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      focused: TanreiCheckboxConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
        boxColor: .role(.error),
        markColor: .role(.onError),
        outlineColor: .role(.error),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      pressed: TanreiCheckboxConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.2),
        boxColor: .role(.error),
        markColor: .role(.onError),
        outlineColor: .role(.error),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      disabled: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
        boxColor: .alpha(of: .role(.onSurface), amount: 0.38),
        markColor: .role(.surface),
        outlineColor: .alpha(of: .role(.onSurface), amount: 0.38),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiCheckboxStateTokens(
    containerShape: 9999,
    opacity: 1
  ),
  focused: TanreiCheckboxStateTokens(
    containerShape: 9999,
    opacity: 1
  ),
  pressed: TanreiCheckboxStateTokens(
    containerShape: 9999,
    opacity: 1
  ),
  disabled: TanreiCheckboxStateTokens(
    containerShape: 9999,
    opacity: 1
  )
)

private let acmeChipTokens = TanreiChipTokens(
  avatarShape: 9999,
  checkWeight: 400,
  containerShape: 9999,
  motionFeedbackDuration: 450,
  motionSelectionDuration: 150,
  motionSelectionEasing: TanreiCubicBezier(0.31, 0.94, 0.34, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineWidth: 1,
  removeContainerShape: 9999,
  sizes: TanreiChipSizes(
    small: TanreiChipSizeTokens(
      containerHeight: 24,
      containerPaddingInline: 8,
      containerPaddingInlineWithIcon: 6,
      containerPaddingInlineWithAvatar: 4,
      containerPaddingInlineWithRemove: 2,
      containerPaddingBlock: 2,
      containerGap: 4,
      labelTypescale: acmeTypescale.labelSmall,
      iconSize: 20,
      avatarSize: 16,
      removeContainerSize: 24
    ),
    medium: TanreiChipSizeTokens(
      containerHeight: 32,
      containerPaddingInline: 16,
      containerPaddingInlineWithIcon: 8,
      containerPaddingInlineWithAvatar: 4,
      containerPaddingInlineWithRemove: 4,
      containerPaddingBlock: 4,
      containerGap: 8,
      labelTypescale: acmeTypescale.label,
      iconSize: 24,
      avatarSize: 24,
      removeContainerSize: 28
    )
  ),
  variants: TanreiChipVariants(
    outlined: TanreiChipVariantTokens(
      enabled: TanreiChipVariantStateTokens(
        containerColor: .none,
        containerElevation: acmeElevation.level0,
        outlineColor: .role(.outlineVariant),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        removeContainerColor: .none,
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .none,
        destructiveRemoveIconColor: .role(.onSurfaceVariant),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .role(.secondaryContainer),
        selectedContainerElevation: acmeElevation.level0,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedStateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiChipVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        containerElevation: acmeElevation.level0,
        outlineColor: .role(.outlineVariant),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        removeContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.06),
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .mix(base: .none, with: .role(.error), amount: 0.06),
        destructiveRemoveIconColor: .role(.error),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.06),
        selectedContainerElevation: acmeElevation.level0,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedStateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiChipVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        containerElevation: acmeElevation.level0,
        outlineColor: .role(.outlineVariant),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        removeContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
        destructiveRemoveIconColor: .role(.error),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        selectedContainerElevation: acmeElevation.level0,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedStateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiChipVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        containerElevation: acmeElevation.level0,
        outlineColor: .role(.outlineVariant),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        removeContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.2),
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .mix(base: .none, with: .role(.error), amount: 0.2),
        destructiveRemoveIconColor: .role(.error),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.2),
        selectedContainerElevation: acmeElevation.level0,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedStateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiChipVariantStateTokens(
        containerColor: .none,
        containerElevation: acmeElevation.level0,
        outlineColor: .role(.outlineVariant),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        removeContainerColor: .none,
        removeIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        removeStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        destructiveRemoveContainerColor: .none,
        destructiveRemoveIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        destructiveRemoveStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        selectedContainerElevation: acmeElevation.level0,
        selectedOutlineColor: .none,
        selectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    elevated: TanreiChipVariantTokens(
      enabled: TanreiChipVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: acmeElevation.level2,
        outlineColor: .none,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        removeContainerColor: .none,
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .none,
        destructiveRemoveIconColor: .role(.onSurfaceVariant),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .role(.secondaryContainer),
        selectedContainerElevation: acmeElevation.level2,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedStateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiChipVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurface), amount: 0.06),
        containerElevation: acmeElevation.level3,
        outlineColor: .none,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        removeContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.06),
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .mix(base: .none, with: .role(.error), amount: 0.06),
        destructiveRemoveIconColor: .role(.error),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.06),
        selectedContainerElevation: acmeElevation.level3,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedStateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiChipVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurface), amount: 0.12),
        containerElevation: acmeElevation.level2,
        outlineColor: .none,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        removeContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
        destructiveRemoveIconColor: .role(.error),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        selectedContainerElevation: acmeElevation.level2,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedStateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiChipVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurface), amount: 0.2),
        containerElevation: acmeElevation.level2,
        outlineColor: .none,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        removeContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.2),
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .mix(base: .none, with: .role(.error), amount: 0.2),
        destructiveRemoveIconColor: .role(.error),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.2),
        selectedContainerElevation: acmeElevation.level2,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedStateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiChipVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: acmeElevation.level0,
        outlineColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        removeContainerColor: .none,
        removeIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        removeStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        destructiveRemoveContainerColor: .none,
        destructiveRemoveIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        destructiveRemoveStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        selectedContainerElevation: acmeElevation.level0,
        selectedOutlineColor: .none,
        selectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiChipStateTokens(
    opacity: 1
  ),
  focused: TanreiChipStateTokens(
    opacity: 1
  ),
  pressed: TanreiChipStateTokens(
    opacity: 1
  ),
  disabled: TanreiChipStateTokens(
    opacity: 1
  )
)

private let acmeCodeBlockTokens = TanreiCodeBlockTokens(
  codeColor: .role(.onSurface),
  codeTabSize: 2,
  containerShape: 6,
  copyButtonInset: 6,
  headerGap: 8,
  headerPaddingBlockEnd: 4,
  languageColor: .role(.onSurfaceVariant),
  languageTypescale: acmeTypescale.labelSmall,
  lineNumberColor: .role(.onSurfaceVariant),
  lineNumberGap: 16,
  lineAddedContainerColor: .role(.successContainer),
  lineAddedMarkColor: .role(.success),
  lineHighlightedContainerColor: .role(.surfaceContainerHighest),
  lineHighlightedMarkColor: .role(.primary),
  lineMarkWidth: 2,
  lineRemovedContainerColor: .role(.errorContainer),
  lineRemovedMarkColor: .role(.error),
  outlineColor: .role(.outlineVariant),
  outlineWidth: 1,
  promptColor: .role(.onSurfaceVariant),
  syntaxMaxLength: 50000,
  titleColor: .role(.onSurface),
  titleTypescale: acmeTypescale.labelSmall,
  sizes: TanreiCodeBlockSizes(
    small: TanreiCodeBlockSizeTokens(
      codeTypescale: acmeTypescale.codeSmall,
      containerPaddingBlock: 8,
      containerPaddingInline: 12
    ),
    medium: TanreiCodeBlockSizeTokens(
      codeTypescale: acmeTypescale.code,
      containerPaddingBlock: 12,
      containerPaddingInline: 16
    )
  ),
  variants: TanreiCodeBlockVariants(
    filled: TanreiCodeBlockVariantTokens(
      containerColor: .role(.surfaceContainer)
    ),
    outlined: TanreiCodeBlockVariantTokens(
      containerColor: .none
    )
  ),
  syntaxs: TanreiCodeBlockSyntaxs(
    comment: TanreiCodeBlockSyntaxTokens(
      syntaxColor: .role(.onSurfaceVariant),
      syntaxEmphasis: 0
    ),
    keyword: TanreiCodeBlockSyntaxTokens(
      syntaxColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.5137, green: 0.2353, blue: 0.702, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.4392, green: 0.1569, blue: 0.6314, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.3608, green: 0.0353, blue: 0.5529, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.8627, green: 0.651, blue: 1, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.902, green: 0.7412, blue: 1, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.949, green: 0.8392, blue: 1, opacity: 1))]),
      syntaxEmphasis: 100
    ),
    string: TanreiCodeBlockSyntaxTokens(
      syntaxColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.1255, green: 0.4235, blue: 0.1412, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.0275, green: 0.3569, blue: 0.0784, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0, green: 0.2745, blue: 0.0431, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.502, green: 0.8078, blue: 0.4745, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.5647, green: 0.8745, blue: 0.5333, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.6392, green: 0.9529, blue: 0.6, opacity: 1))]),
      syntaxEmphasis: 0
    ),
    constant: TanreiCodeBlockSyntaxTokens(
      syntaxColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.5804, green: 0.2941, blue: 0, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.4824, green: 0.2392, blue: 0, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.3725, green: 0.1804, blue: 0, opacity: 1)), .dark: .literal(TanreiColorValue(red: 1, green: 0.6549, blue: 0.3922, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 1, green: 0.7451, blue: 0.5686, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 1, green: 0.8471, blue: 0.749, opacity: 1))]),
      syntaxEmphasis: 0
    ),
    function: TanreiCodeBlockSyntaxTokens(
      syntaxColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0, green: 0.3569, blue: 0.7451, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0, green: 0.2941, blue: 0.6235, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0, green: 0.2235, blue: 0.4863, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.6039, green: 0.7373, blue: 1, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.7098, green: 0.8, blue: 1, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.8275, green: 0.8784, blue: 1, opacity: 1))]),
      syntaxEmphasis: 0
    ),
    type: TanreiCodeBlockSyntaxTokens(
      syntaxColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0, green: 0.4118, blue: 0.4235, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0, green: 0.3412, blue: 0.3529, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0, green: 0.2627, blue: 0.2706, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2353, green: 0.8078, blue: 0.8275, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.3255, green: 0.8745, blue: 0.8941, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.4196, green: 0.9529, blue: 0.9725, opacity: 1))]),
      syntaxEmphasis: 0
    ),
    tag: TanreiCodeBlockSyntaxTokens(
      syntaxColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.6902, green: 0.1725, blue: 0.2039, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.5961, green: 0.098, blue: 0.1451, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.4902, green: 0, blue: 0.0824, opacity: 1)), .dark: .literal(TanreiColorValue(red: 1, green: 0.6392, blue: 0.6275, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 1, green: 0.7333, blue: 0.7216, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 1, green: 0.8392, blue: 0.8314, opacity: 1))]),
      syntaxEmphasis: 0
    ),
    property: TanreiCodeBlockSyntaxTokens(
      syntaxColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0, green: 0.3216, blue: 0.6745, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0, green: 0.2667, blue: 0.5686, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0, green: 0.2, blue: 0.4353, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.6745, green: 0.7804, blue: 1, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.7608, green: 0.8353, blue: 1, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.8627, green: 0.898, blue: 1, opacity: 1))]),
      syntaxEmphasis: 0
    ),
    punctuation: TanreiCodeBlockSyntaxTokens(
      syntaxColor: .role(.onSurfaceVariant),
      syntaxEmphasis: 0
    )
  )
)

private let acmeColorInputTokens = TanreiColorInputTokens(
  swatchOutlineColor: .role(.outlineVariant),
  swatchOutlineWidth: 1,
  swatchShape: 3
)

private let acmeComboboxTokens = TanreiComboboxTokens(
  containerActionGap: 4,
  dividerColor: .role(.outlineVariant),
  dividerSpace: 4,
  dividerThickness: 1,
  groupTitleColor: .role(.onSurfaceVariant),
  groupTitlePaddingInline: 12,
  groupTitleTypescale: acmeTypescale.labelSmall,
  groupGap: 16,
  listColor: .role(.surfaceBright),
  listElevation: acmeElevation.level2,
  listMaxHeight: 320,
  listOffset: 4,
  listPaddingBlock: 4,
  listPaddingInline: 4,
  listShape: 8,
  listViewportMargin: 8,
  motionCloseDuration: 100,
  motionCloseEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  motionFeedbackDuration: 450,
  motionOpenDuration: 200,
  motionOpenEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  optionGap: 12,
  optionHeight: 48,
  optionLabelTypescale: acmeTypescale.label,
  optionLeadingIconSize: 24,
  optionMarkSize: 24,
  optionMatchEmphasis: 100,
  optionPaddingBlock: 8,
  optionPaddingInline: 12,
  optionShape: 6,
  optionSupportingTextTypescale: acmeTypescale.bodySmall,
  separation: 0,
  statusColor: .role(.onSurfaceVariant),
  statusErrorColor: .role(.error),
  statusTypescale: acmeTypescale.bodySmall,
  variants: TanreiComboboxVariants(
    stacked: TanreiComboboxVariantTokens(
      enabled: TanreiComboboxVariantStateTokens(
        optionContainerColor: .none,
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .alpha(of: .role(.onSecondaryContainer), amount: 0), .lightMedium: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), .lightHigh: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), .dark: .alpha(of: .role(.onSecondaryContainer), amount: 0), .darkMedium: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), .darkHigh: .alpha(of: .role(.onSecondaryContainer), amount: 0.16)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiComboboxVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.06), .lightMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06), .lightHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06), .dark: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.06), .darkMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06), .darkHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiComboboxVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.12), .lightMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12), .lightHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12), .dark: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.12), .darkMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12), .darkHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiComboboxVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.2), .lightMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2), .lightHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2), .dark: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.2), .darkMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2), .darkHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiComboboxVariantStateTokens(
        optionContainerColor: .none,
        optionLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionContainerColor: .scheme(by: [.light: .alpha(of: .role(.onSurface), amount: 0), .lightMedium: .alpha(of: .role(.onSurface), amount: 0.12), .lightHigh: .alpha(of: .role(.onSurface), amount: 0.12), .dark: .alpha(of: .role(.onSurface), amount: 0), .darkMedium: .alpha(of: .role(.onSurface), amount: 0.12), .darkHigh: .alpha(of: .role(.onSurface), amount: 0.12)]),
        selectedOptionLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionMarkColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    filled: TanreiComboboxVariantTokens(
      enabled: TanreiComboboxVariantStateTokens(
        optionContainerColor: .none,
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .alpha(of: .role(.onSecondaryContainer), amount: 0), .lightMedium: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), .lightHigh: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), .dark: .alpha(of: .role(.onSecondaryContainer), amount: 0), .darkMedium: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), .darkHigh: .alpha(of: .role(.onSecondaryContainer), amount: 0.16)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiComboboxVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.06), .lightMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06), .lightHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06), .dark: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.06), .darkMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06), .darkHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiComboboxVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.12), .lightMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12), .lightHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12), .dark: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.12), .darkMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12), .darkHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiComboboxVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.2), .lightMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2), .lightHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2), .dark: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.2), .darkMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2), .darkHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiComboboxVariantStateTokens(
        optionContainerColor: .none,
        optionLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionContainerColor: .scheme(by: [.light: .alpha(of: .role(.onSurface), amount: 0), .lightMedium: .alpha(of: .role(.onSurface), amount: 0.12), .lightHigh: .alpha(of: .role(.onSurface), amount: 0.12), .dark: .alpha(of: .role(.onSurface), amount: 0), .darkMedium: .alpha(of: .role(.onSurface), amount: 0.12), .darkHigh: .alpha(of: .role(.onSurface), amount: 0.12)]),
        selectedOptionLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionMarkColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    outlined: TanreiComboboxVariantTokens(
      enabled: TanreiComboboxVariantStateTokens(
        optionContainerColor: .none,
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .alpha(of: .role(.onSecondaryContainer), amount: 0), .lightMedium: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), .lightHigh: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), .dark: .alpha(of: .role(.onSecondaryContainer), amount: 0), .darkMedium: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), .darkHigh: .alpha(of: .role(.onSecondaryContainer), amount: 0.16)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiComboboxVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.06), .lightMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06), .lightHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06), .dark: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.06), .darkMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06), .darkHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiComboboxVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.12), .lightMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12), .lightHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12), .dark: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.12), .darkMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12), .darkHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiComboboxVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.2), .lightMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2), .lightHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2), .dark: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.2), .darkMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2), .darkHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiComboboxVariantStateTokens(
        optionContainerColor: .none,
        optionLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionContainerColor: .scheme(by: [.light: .alpha(of: .role(.onSurface), amount: 0), .lightMedium: .alpha(of: .role(.onSurface), amount: 0.12), .lightHigh: .alpha(of: .role(.onSurface), amount: 0.12), .dark: .alpha(of: .role(.onSurface), amount: 0), .darkMedium: .alpha(of: .role(.onSurface), amount: 0.12), .darkHigh: .alpha(of: .role(.onSurface), amount: 0.12)]),
        selectedOptionLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionMarkColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiComboboxStateTokens(
    opacity: 1
  ),
  focused: TanreiComboboxStateTokens(
    opacity: 1
  ),
  pressed: TanreiComboboxStateTokens(
    opacity: 1
  ),
  disabled: TanreiComboboxStateTokens(
    opacity: 1
  )
)

private let acmeCopyButtonTokens = TanreiCopyButtonTokens(
  confirmationDuration: 2000,
  motionResizeDuration: 500,
  motionResizeEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1)
)

private let acmeDateTimePickerTokens = TanreiDateTimePickerTokens(
  actionsArrangement: 0,
  actionsGap: 16,
  actionsPaddingBlock: 12,
  actionsVariant: 1,
  containerGap: 16,
  containerPaddingBlock: 8,
  containerPaddingInline: 12,
  dialCenterSize: 8,
  dialContainerColor: .role(.surfaceDim),
  dialContainerSize: 256,
  dialHandleColor: .role(.primary),
  dialHandleSize: 48,
  dialLabelColor: .role(.onSurface),
  dialLabelTypescale: acmeTypescale.bodyLarge,
  dialPadding: 8,
  dialSelectedLabelColor: .role(.onPrimary),
  dialTrackColor: .role(.primary),
  dialTrackWidth: 2,
  dividerColor: .role(.outlineVariant),
  dividerWidth: 1,
  dockedContainerColor: .role(.surfaceBright),
  dockedContainerElevation: acmeElevation.level2,
  dockedContainerShape: 8,
  dockedMotionCloseDuration: 100,
  dockedMotionCloseEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  dockedMotionOpenDuration: 200,
  dockedMotionOpenEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  dockedOffset: 4,
  dockedViewportMargin: 8,
  errorColor: .role(.error),
  errorTypescale: acmeTypescale.bodySmall,
  headerGap: 4,
  headerLabelColor: .role(.onSurfaceVariant),
  headerLabelTypescale: acmeTypescale.label,
  headerPaddingBlock: 16,
  headerPaddingInlineEnd: 12,
  headerPaddingInlineStart: 24,
  headerPlaceholderColor: .role(.onSurfaceVariant),
  headerValueColor: .role(.onSurface),
  headerValueTypescale: acmeTypescale.heading2,
  modalContainerColor: .role(.surfaceBright),
  modalContainerElevation: acmeElevation.level3,
  modalContainerMargin: 16,
  modalContainerShape: 12,
  modalMotionCloseDuration: 200,
  modalMotionCloseEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  modalMotionEnterScale: 0.95,
  modalMotionOpenDuration: 300,
  modalMotionOpenEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  modalScrimBlur: 0,
  modalScrimColor: .role(.scrim),
  motionDialDuration: 250,
  motionDialEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionWheelDuration: 250,
  motionWheelEasing: TanreiCubicBezier(0, 0, 0, 1),
  periodContainerWidth: 56,
  periodGap: 8,
  periodLabelTypescale: acmeTypescale.heading5,
  rangeFieldContainerHeight: 48,
  rangeFieldContainerPaddingInline: 16,
  rangeFieldGap: 8,
  rangeFieldLabelTypescale: acmeTypescale.heading5,
  selectorContainerHeight: 80,
  selectorContainerShape: 8,
  selectorContainerWidth: 96,
  selectorGap: 4,
  selectorLabelTypescale: acmeTypescale.display,
  separatorColor: .role(.onSurface),
  separatorTypescale: acmeTypescale.display,
  timeEntryModes: 0,
  timeUnavailableOpacity: 0.38,
  wheelGap: 4,
  wheelHeight: 240,
  wheelLabelColor: .role(.onSurfaceVariant),
  wheelLabelTypescale: acmeTypescale.heading3,
  wheelRowHeight: 48,
  wheelSelectedLabelColor: .role(.onSurface),
  wheelSelectionContainerColor: .role(.surfaceDim),
  wheelSelectionContainerShape: 8,
  wheelSelectionSpan: 0,
  wheelWidth: 80,
  conditions: TanreiDateTimePickerConditions(
    unselected: TanreiDateTimePickerConditionTokens(
      enabled: TanreiDateTimePickerConditionStateTokens(
        selectorContainerColor: .role(.surfaceDim),
        selectorLabelColor: .role(.onSurface),
        selectorOutlineColor: .none,
        selectorOutlineWidth: 1,
        selectorStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiDateTimePickerConditionStateTokens(
        selectorContainerColor: .mix(base: .role(.surfaceDim), with: .role(.onSurface), amount: 0.06),
        selectorLabelColor: .role(.onSurface),
        selectorOutlineColor: .none,
        selectorOutlineWidth: 1,
        selectorStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiDateTimePickerConditionStateTokens(
        selectorContainerColor: .mix(base: .role(.surfaceDim), with: .role(.onSurface), amount: 0.12),
        selectorLabelColor: .role(.onSurface),
        selectorOutlineColor: .none,
        selectorOutlineWidth: 1,
        selectorStateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiDateTimePickerConditionStateTokens(
        selectorContainerColor: .mix(base: .role(.surfaceDim), with: .role(.onSurface), amount: 0.2),
        selectorLabelColor: .role(.onSurface),
        selectorOutlineColor: .none,
        selectorOutlineWidth: 1,
        selectorStateLayerColor: .role(.onSurface)
      )
    ),
    selected: TanreiDateTimePickerConditionTokens(
      enabled: TanreiDateTimePickerConditionStateTokens(
        selectorContainerColor: .role(.surfaceDim),
        selectorLabelColor: .role(.onSurface),
        selectorOutlineColor: .role(.primary),
        selectorOutlineWidth: 2,
        selectorStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiDateTimePickerConditionStateTokens(
        selectorContainerColor: .mix(base: .role(.surfaceDim), with: .role(.onSurface), amount: 0.06),
        selectorLabelColor: .role(.onSurface),
        selectorOutlineColor: .role(.primary),
        selectorOutlineWidth: 2,
        selectorStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiDateTimePickerConditionStateTokens(
        selectorContainerColor: .mix(base: .role(.surfaceDim), with: .role(.onSurface), amount: 0.12),
        selectorLabelColor: .role(.onSurface),
        selectorOutlineColor: .role(.primary),
        selectorOutlineWidth: 2,
        selectorStateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiDateTimePickerConditionStateTokens(
        selectorContainerColor: .mix(base: .role(.surfaceDim), with: .role(.onSurface), amount: 0.2),
        selectorLabelColor: .role(.onSurface),
        selectorOutlineColor: .role(.primary),
        selectorOutlineWidth: 2,
        selectorStateLayerColor: .role(.onSurface)
      )
    )
  ),
  hovered: TanreiDateTimePickerStateTokens(
    opacity: 1
  ),
  focused: TanreiDateTimePickerStateTokens(
    opacity: 1
  ),
  pressed: TanreiDateTimePickerStateTokens(
    opacity: 1
  )
)

private let acmeDescriptionListTokens = TanreiDescriptionListTokens(
  columnGap: 32,
  columnMinWidth: 144,
  dividerColor: .role(.outlineVariant),
  dividerThickness: 1,
  separation: 0,
  stackGap: 4,
  termColor: .role(.onSurfaceVariant),
  valueColor: .role(.onSurface),
  densitys: TanreiDescriptionListDensitys(
    regular: TanreiDescriptionListDensityTokens(
      factGap: 12,
      termGap: 16,
      termTypescale: acmeTypescale.label,
      valueTypescale: acmeTypescale.body,
      statValueTypescale: acmeTypescale.heading1
    ),
    compact: TanreiDescriptionListDensityTokens(
      factGap: 6,
      termGap: 8,
      termTypescale: acmeTypescale.labelSmall,
      valueTypescale: acmeTypescale.bodySmall,
      statValueTypescale: acmeTypescale.heading3
    )
  )
)

private let acmeDialogTokens = TanreiDialogTokens(
  actionsArrangement: 0,
  actionsGap: 16,
  actionsMarginBlockStart: 24,
  actionsVariant: 1,
  closeButtonVariant: 4,
  compactWindowWidth: 600,
  containerColor: .role(.surfaceBright),
  containerElevation: acmeElevation.level3,
  containerGap: 16,
  containerMargin: 16,
  containerMaxWidth: 560,
  containerMinWidth: 280,
  containerPadding: 24,
  containerShape: 12,
  contentColor: .role(.onSurface),
  dividerColor: .role(.outlineVariant),
  dividerVisibility: 0,
  dividerWidth: 1,
  headerGap: 12,
  headlineColor: .role(.onSurface),
  headlineTypescale: acmeTypescale.heading5,
  iconColor: .role(.secondary),
  iconPlacement: 0,
  iconSize: 24,
  motionEnterDuration: 300,
  motionEnterEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionEnterOffset: 32,
  motionEnterScale: 0.95,
  motionExitDuration: 200,
  motionExitEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  scrimBlur: 0,
  scrimColor: .role(.scrim),
  supportingTextColor: .role(.onSurfaceVariant),
  supportingTextTypescale: acmeTypescale.body,
  widthLarge: 800,
  widthMedium: 560,
  widthSmall: 400
)

private let acmeDividerTokens = TanreiDividerTokens(
  lineColor: .role(.outlineVariant),
  lineDashGap: 4,
  lineDashLength: 4,
  lineDotGap: 2,
  lineInset: 16,
  lineThickness: 1,
  lineWaveAmplitude: 2,
  lineWaveWavelength: 16
)

private let acmeDropZoneTokens = TanreiDropZoneTokens(
  iconColor: .role(.primary),
  iconSize: 32,
  labelColor: .role(.onSurface),
  labelTypescale: acmeTypescale.bodyLarge,
  motionDuration: 150,
  motionEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineColor: .role(.primary),
  outlineWidth: 2,
  panelContainerColor: .role(.surfaceContainerHigh),
  panelElevation: acmeElevation.level2,
  panelGap: 12,
  panelMargin: 16,
  panelMaxWidth: 360,
  panelPaddingBlock: 24,
  panelPaddingInline: 24,
  panelShape: 12,
  refusingIconColor: .role(.error),
  refusingOutlineColor: .role(.error),
  scrimColor: .role(.scrim)
)

private let acmeEmbeddedTextInputTokens = TanreiEmbeddedTextInputTokens(
  inputTypescale: acmeTypescale.bodyLarge,
  motionResizeDuration: 200,
  motionResizeEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  selectionColor: .role(.primary),
  selectionContentColor: .role(.onPrimary),
  conditions: TanreiEmbeddedTextInputConditions(
    standard: TanreiEmbeddedTextInputConditionTokens(
      enabled: TanreiEmbeddedTextInputConditionStateTokens(
        inputColor: .role(.onSurface),
        placeholderColor: .role(.onSurfaceVariant),
        caretColor: .role(.primary)
      ),
      disabled: TanreiEmbeddedTextInputConditionStateTokens(
        inputColor: .alpha(of: .role(.onSurface), amount: 0.38),
        placeholderColor: .alpha(of: .role(.onSurface), amount: 0.38),
        caretColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  )
)

private let acmeEmptyStateTokens = TanreiEmptyStateTokens(
  actionsGap: 16,
  actionsItemGap: 8,
  containerPaddingInline: 16,
  contentMeasure: 30,
  descriptionColor: .role(.onSurfaceVariant),
  mediaColor: .role(.onSurfaceVariant),
  mediaGap: 16,
  titleColor: .role(.onSurface),
  titleGap: 4,
  sizes: TanreiEmptyStateSizes(
    medium: TanreiEmptyStateSizeTokens(
      containerPaddingBlock: 32,
      mediaSize: 32,
      titleTypescale: acmeTypescale.heading5,
      descriptionTypescale: acmeTypescale.body
    ),
    large: TanreiEmptyStateSizeTokens(
      containerPaddingBlock: 64,
      mediaSize: 48,
      titleTypescale: acmeTypescale.heading3,
      descriptionTypescale: acmeTypescale.bodyLarge
    )
  )
)

private let acmeFabMenuTokens = TanreiFabMenuTokens(
  containerShapeOpen: 9999,
  itemGap: 8,
  itemHeight: 48,
  itemIconSize: 20,
  itemLabelTypescale: acmeTypescale.label,
  itemPaddingInlineEnd: 20,
  itemPaddingInlineStart: 16,
  itemShape: 12,
  listGap: 8,
  listOffset: 8,
  motionCloseDuration: 150,
  motionCloseEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  motionFeedbackDuration: 450,
  motionOpenDuration: 250,
  motionOpenEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionStagger: 100,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  sizes: TanreiFabMenuSizes(
    small: TanreiFabMenuSizeTokens(
      containerSize: 40,
      containerShape: 8,
      iconSize: 20
    ),
    medium: TanreiFabMenuSizeTokens(
      containerSize: 48,
      containerShape: 12,
      iconSize: 24
    ),
    large: TanreiFabMenuSizeTokens(
      containerSize: 64,
      containerShape: 16,
      iconSize: 32
    )
  ),
  variants: TanreiFabMenuVariants(
    filled: TanreiFabMenuVariantTokens(
      enabled: TanreiFabMenuVariantStateTokens(
        containerColor: .role(.primary),
        containerElevation: acmeElevation.level3,
        iconColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary),
        openContainerColor: .role(.secondaryContainer),
        openContainerElevation: acmeElevation.level3,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .role(.primary),
        itemContainerElevation: acmeElevation.level2,
        itemLabelColor: .role(.onPrimary),
        itemIconColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      hovered: TanreiFabMenuVariantStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.06),
        containerElevation: acmeElevation.level4,
        iconColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary),
        openContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.06),
        openContainerElevation: acmeElevation.level4,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.06),
        itemContainerElevation: acmeElevation.level2,
        itemLabelColor: .role(.onPrimary),
        itemIconColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      focused: TanreiFabMenuVariantStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        containerElevation: acmeElevation.level3,
        iconColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary),
        openContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        openContainerElevation: acmeElevation.level3,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        itemContainerElevation: acmeElevation.level2,
        itemLabelColor: .role(.onPrimary),
        itemIconColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      pressed: TanreiFabMenuVariantStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.2),
        containerElevation: acmeElevation.level3,
        iconColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary),
        openContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.2),
        openContainerElevation: acmeElevation.level3,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.2),
        itemContainerElevation: acmeElevation.level2,
        itemLabelColor: .role(.onPrimary),
        itemIconColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      disabled: TanreiFabMenuVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: acmeElevation.level0,
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        openContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        openContainerElevation: acmeElevation.level0,
        openIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        openStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        itemContainerElevation: acmeElevation.level0,
        itemLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    tonal: TanreiFabMenuVariantTokens(
      enabled: TanreiFabMenuVariantStateTokens(
        containerColor: .role(.secondaryContainer),
        containerElevation: acmeElevation.level3,
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer),
        openContainerColor: .role(.primary),
        openContainerElevation: acmeElevation.level3,
        openIconColor: .role(.onPrimary),
        openStateLayerColor: .role(.onPrimary),
        itemContainerColor: .role(.secondaryContainer),
        itemContainerElevation: acmeElevation.level2,
        itemLabelColor: .role(.onSecondaryContainer),
        itemIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiFabMenuVariantStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.06),
        containerElevation: acmeElevation.level4,
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer),
        openContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.06),
        openContainerElevation: acmeElevation.level4,
        openIconColor: .role(.onPrimary),
        openStateLayerColor: .role(.onPrimary),
        itemContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.06),
        itemContainerElevation: acmeElevation.level2,
        itemLabelColor: .role(.onSecondaryContainer),
        itemIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiFabMenuVariantStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        containerElevation: acmeElevation.level3,
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer),
        openContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        openContainerElevation: acmeElevation.level3,
        openIconColor: .role(.onPrimary),
        openStateLayerColor: .role(.onPrimary),
        itemContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        itemContainerElevation: acmeElevation.level2,
        itemLabelColor: .role(.onSecondaryContainer),
        itemIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiFabMenuVariantStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.2),
        containerElevation: acmeElevation.level3,
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer),
        openContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.2),
        openContainerElevation: acmeElevation.level3,
        openIconColor: .role(.onPrimary),
        openStateLayerColor: .role(.onPrimary),
        itemContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.2),
        itemContainerElevation: acmeElevation.level2,
        itemLabelColor: .role(.onSecondaryContainer),
        itemIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiFabMenuVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: acmeElevation.level0,
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        openContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        openContainerElevation: acmeElevation.level0,
        openIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        openStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        itemContainerElevation: acmeElevation.level0,
        itemLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    surface: TanreiFabMenuVariantTokens(
      enabled: TanreiFabMenuVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: acmeElevation.level3,
        iconColor: .role(.primary),
        stateLayerColor: .role(.primary),
        openContainerColor: .role(.secondaryContainer),
        openContainerElevation: acmeElevation.level3,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .role(.surfaceContainerLowest),
        itemContainerElevation: acmeElevation.level2,
        itemLabelColor: .role(.onSurface),
        itemIconColor: .role(.primary),
        itemStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiFabMenuVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.primary), amount: 0.06),
        containerElevation: acmeElevation.level4,
        iconColor: .role(.primary),
        stateLayerColor: .role(.primary),
        openContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.06),
        openContainerElevation: acmeElevation.level4,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurface), amount: 0.06),
        itemContainerElevation: acmeElevation.level2,
        itemLabelColor: .role(.onSurface),
        itemIconColor: .role(.primary),
        itemStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiFabMenuVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.primary), amount: 0.12),
        containerElevation: acmeElevation.level3,
        iconColor: .role(.primary),
        stateLayerColor: .role(.primary),
        openContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        openContainerElevation: acmeElevation.level3,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurface), amount: 0.12),
        itemContainerElevation: acmeElevation.level2,
        itemLabelColor: .role(.onSurface),
        itemIconColor: .role(.primary),
        itemStateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiFabMenuVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.primary), amount: 0.2),
        containerElevation: acmeElevation.level3,
        iconColor: .role(.primary),
        stateLayerColor: .role(.primary),
        openContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.2),
        openContainerElevation: acmeElevation.level3,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurface), amount: 0.2),
        itemContainerElevation: acmeElevation.level2,
        itemLabelColor: .role(.onSurface),
        itemIconColor: .role(.primary),
        itemStateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiFabMenuVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: acmeElevation.level0,
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        openContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        openContainerElevation: acmeElevation.level0,
        openIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        openStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        itemContainerElevation: acmeElevation.level0,
        itemLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiFabMenuStateTokens(
    opacity: 1
  ),
  focused: TanreiFabMenuStateTokens(
    opacity: 1
  ),
  pressed: TanreiFabMenuStateTokens(
    opacity: 1
  ),
  disabled: TanreiFabMenuStateTokens(
    opacity: 1
  )
)

private let acmeFieldGroupTokens = TanreiFieldGroupTokens(
  errorTextGap: 4,
  fieldMinWidth: 144,
  gapInline: 16,
  labelGap: 8,
  labelTypescale: acmeTypescale.label,
  requirementAsteriskGap: 2,
  requirementGap: 8,
  requirementMark: 0,
  supportingTextGap: 4,
  supportingTextTypescale: acmeTypescale.labelSmall,
  spacings: TanreiFieldGroupSpacings(
    controls: TanreiFieldGroupSpacingTokens(
      gap: 8
    ),
    fields: TanreiFieldGroupSpacingTokens(
      gap: 24
    )
  ),
  conditions: TanreiFieldGroupConditions(
    standard: TanreiFieldGroupConditionTokens(
      enabled: TanreiFieldGroupConditionStateTokens(
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        requiredAsteriskColor: .role(.primary),
        errorTextColor: .role(.error),
        errorLabelColor: .role(.onSurface),
        errorSupportingTextColor: .role(.onSurfaceVariant),
        errorRequiredAsteriskColor: .role(.primary)
      ),
      disabled: TanreiFieldGroupConditionStateTokens(
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        supportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        requiredAsteriskColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorRequiredAsteriskColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  )
)

private let acmeFieldTokens = TanreiFieldTokens(
  counterGap: 16,
  errorTextGap: 4,
  errorTextPlacement: 0,
  labelIconGap: 8,
  labelIconSize: 20,
  labelGap: 8,
  labelTypescale: acmeTypescale.label,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  requirementAsteriskGap: 2,
  requirementGap: 8,
  requirementMark: 0,
  supportingTextGap: 4,
  supportingTextTypescale: acmeTypescale.labelSmall,
  valueTextGap: 16,
  valueTextTypescale: acmeTypescale.label,
  conditions: TanreiFieldConditions(
    standard: TanreiFieldConditionTokens(
      enabled: TanreiFieldConditionStateTokens(
        labelColor: .role(.onSurface),
        labelIconColor: .role(.onSurfaceVariant),
        supportingTextColor: .role(.onSurfaceVariant),
        requiredAsteriskColor: .role(.primary),
        errorLabelColor: .role(.onSurface),
        errorLabelIconColor: .role(.onSurfaceVariant),
        errorSupportingTextColor: .role(.onSurfaceVariant),
        errorRequiredAsteriskColor: .role(.primary),
        counterColor: .role(.onSurfaceVariant),
        errorCounterColor: .role(.onSurfaceVariant),
        valueTextColor: .role(.onSurfaceVariant),
        errorValueTextColor: .role(.onSurfaceVariant),
        errorTextColor: .role(.error)
      ),
      focused: TanreiFieldConditionStateTokens(
        labelColor: .role(.primary),
        labelIconColor: .role(.onSurfaceVariant),
        supportingTextColor: .role(.onSurfaceVariant),
        requiredAsteriskColor: .role(.primary),
        errorLabelColor: .role(.onSurface),
        errorLabelIconColor: .role(.onSurfaceVariant),
        errorSupportingTextColor: .role(.onSurfaceVariant),
        errorRequiredAsteriskColor: .role(.primary),
        counterColor: .role(.onSurfaceVariant),
        errorCounterColor: .role(.onSurfaceVariant),
        valueTextColor: .role(.onSurfaceVariant),
        errorValueTextColor: .role(.onSurfaceVariant),
        errorTextColor: .role(.error)
      ),
      disabled: TanreiFieldConditionStateTokens(
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        labelIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        supportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        requiredAsteriskColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorLabelIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorRequiredAsteriskColor: .alpha(of: .role(.onSurface), amount: 0.38),
        counterColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorCounterColor: .alpha(of: .role(.onSurface), amount: 0.38),
        valueTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorValueTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorTextColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  )
)

private let acmeFigureTokens = TanreiFigureTokens(
  attachmentGap: 8,
  captionColor: .role(.onSurfaceVariant),
  captionGap: 8,
  captionTypescale: acmeTypescale.bodySmall,
  containerShape: 8,
  contentColor: .role(.onSurface),
  dividerColor: .role(.outlineVariant),
  dividerThickness: 1,
  headerGap: 8,
  headerPaddingBlock: 8,
  headerPaddingInline: 16,
  headerPaddingInlineEndWithActions: 8,
  outlineColor: .role(.outlineVariant),
  outlineWidth: 1,
  patternCheckerboardSize: 8,
  patternClearExtent: 0.3,
  patternColor: .role(.surfaceContainerHighest),
  patternDotSize: 3,
  patternLineThickness: 1,
  patternSpacing: 24,
  separation: 0,
  stagePaddingBlock: 32,
  stagePaddingInline: 24,
  titleColor: .role(.onSurface),
  titleTypescale: acmeTypescale.heading6,
  variants: TanreiFigureVariants(
    outlined: TanreiFigureVariantTokens(
      containerColor: .role(.surface)
    ),
    filled: TanreiFigureVariantTokens(
      containerColor: .role(.surfaceContainer)
    ),
    plain: TanreiFigureVariantTokens(
      containerColor: .none
    )
  )
)

private let acmeFileItemTokens = TanreiFileItemTokens(
  actionGap: 16,
  actionIconSize: 20,
  actionShape: 9999,
  actionSize: 32,
  doneIconColor: .role(.success),
  errorIconColor: .role(.error),
  errorSupportingTextColor: .role(.error),
  headlineColor: .role(.onSurface),
  headlineTypescale: acmeTypescale.body,
  iconColor: .role(.onSurfaceVariant),
  mediaColor: .role(.surfaceContainer),
  motionCycleDuration: 1000,
  motionCycleEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionFeedbackDuration: 450,
  motionProgressDuration: 300,
  motionProgressEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  progressGap: 6,
  progressIndicatorColor: .role(.primary),
  progressShape: 9999,
  progressThickness: 2,
  progressTrackColor: .role(.surfaceVariant),
  rowContainerGap: 12,
  rowContainerOutset: 4,
  rowContainerShape: 6,
  rowIconSize: 24,
  rowMediaHeight: 40,
  rowMediaShape: 6,
  statusIconGap: 4,
  statusIconSize: 16,
  supportingTextColor: .role(.onSurfaceVariant),
  supportingTextTypescale: acmeTypescale.bodySmall,
  tileActionInset: 4,
  tileContainerGap: 6,
  tileContainerShape: 8,
  tileIconSize: 32,
  tileMediaHeight: 96,
  forms: TanreiFileItemForms(
    row: TanreiFileItemFormTokens(
      enabled: TanreiFileItemFormStateTokens(
        containerColor: .none,
        stateLayerColor: .role(.onSurface),
        actionContainerColor: .none,
        actionIconColor: .role(.onSurfaceVariant),
        actionStateLayerColor: .role(.onSurfaceVariant)
      ),
      hovered: TanreiFileItemFormStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        stateLayerColor: .role(.onSurface),
        actionContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.06),
        actionIconColor: .role(.onSurfaceVariant),
        actionStateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiFileItemFormStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        stateLayerColor: .role(.onSurface),
        actionContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        actionIconColor: .role(.onSurfaceVariant),
        actionStateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiFileItemFormStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        stateLayerColor: .role(.onSurface),
        actionContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.2),
        actionIconColor: .role(.onSurfaceVariant),
        actionStateLayerColor: .role(.onSurfaceVariant)
      ),
      disabled: TanreiFileItemFormStateTokens(
        containerColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        actionContainerColor: .none,
        actionIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        actionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    tile: TanreiFileItemFormTokens(
      enabled: TanreiFileItemFormStateTokens(
        containerColor: .none,
        stateLayerColor: .role(.onSurface),
        actionContainerColor: .role(.surfaceContainerLowest),
        actionIconColor: .role(.onSurfaceVariant),
        actionStateLayerColor: .role(.onSurfaceVariant)
      ),
      hovered: TanreiFileItemFormStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        stateLayerColor: .role(.onSurface),
        actionContainerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurfaceVariant), amount: 0.06),
        actionIconColor: .role(.onSurfaceVariant),
        actionStateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiFileItemFormStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        stateLayerColor: .role(.onSurface),
        actionContainerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurfaceVariant), amount: 0.12),
        actionIconColor: .role(.onSurfaceVariant),
        actionStateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiFileItemFormStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        stateLayerColor: .role(.onSurface),
        actionContainerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurfaceVariant), amount: 0.2),
        actionIconColor: .role(.onSurfaceVariant),
        actionStateLayerColor: .role(.onSurfaceVariant)
      ),
      disabled: TanreiFileItemFormStateTokens(
        containerColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        actionContainerColor: .role(.surfaceContainerLowest),
        actionIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        actionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiFileItemStateTokens(
    opacity: 1
  ),
  focused: TanreiFileItemStateTokens(
    opacity: 1
  ),
  pressed: TanreiFileItemStateTokens(
    opacity: 1
  ),
  disabled: TanreiFileItemStateTokens(
    opacity: 1
  )
)

private let acmeFilePickerTokens = TanreiFilePickerTokens(
  containerGap: 12,
  containerPaddingBlock: 32,
  containerPaddingInline: 16,
  containerShape: 8,
  iconSize: 32,
  labelTypescale: acmeTypescale.body,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineDashLength: 4,
  outlineStyle: 0,
  outlineWidth: 1,
  receivingContainerColor: .role(.secondaryContainer),
  receivingContentColor: .role(.onSecondaryContainer),
  receivingOutlineColor: .role(.onSecondaryContainer),
  refusingIconColor: .role(.error),
  refusingOutlineColor: .role(.error),
  selectionTextTypescale: acmeTypescale.body,
  supportingTextGap: 8,
  supportingTextTypescale: acmeTypescale.bodySmall,
  triggerGap: 12,
  conditions: TanreiFilePickerConditions(
    standard: TanreiFilePickerConditionTokens(
      enabled: TanreiFilePickerConditionStateTokens(
        containerColor: .none,
        outlineColor: .role(.outline),
        iconColor: .role(.onSurfaceVariant),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        selectionTextColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        errorOutlineColor: .role(.error)
      ),
      hovered: TanreiFilePickerConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        outlineColor: .role(.outline),
        iconColor: .role(.onSurfaceVariant),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        selectionTextColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        errorOutlineColor: .role(.error)
      ),
      focused: TanreiFilePickerConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        outlineColor: .role(.outline),
        iconColor: .role(.onSurfaceVariant),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        selectionTextColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        errorOutlineColor: .role(.error)
      ),
      pressed: TanreiFilePickerConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        outlineColor: .role(.outline),
        iconColor: .role(.onSurfaceVariant),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        selectionTextColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        errorOutlineColor: .role(.error)
      ),
      disabled: TanreiFilePickerConditionStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        outlineColor: .role(.outline),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        supportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectionTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorOutlineColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiFilePickerStateTokens(
    opacity: 1
  ),
  focused: TanreiFilePickerStateTokens(
    opacity: 1
  ),
  pressed: TanreiFilePickerStateTokens(
    opacity: 1
  ),
  disabled: TanreiFilePickerStateTokens(
    opacity: 1
  )
)

private let acmeFileUploadTokens = TanreiFileUploadTokens(
  listGap: 16
)

private let acmeImagePreviewTokens = TanreiImagePreviewTokens(
  barButtonVariant: 4,
  barContainerColor: .role(.surface),
  barGap: 4,
  barHeight: 56,
  barPaddingInline: 8,
  captionColor: .role(.onSurface),
  captionContainerColor: .role(.surface),
  captionMaxWidth: 640,
  captionPaddingBlock: 12,
  captionPaddingInline: 16,
  captionTypescale: acmeTypescale.body,
  containerColor: .role(.surface),
  countColor: .role(.onSurfaceVariant),
  countPaddingInline: 8,
  countTypescale: acmeTypescale.label,
  errorGap: 8,
  errorIconColor: .role(.onSurfaceVariant),
  errorIconSize: 32,
  errorTextColor: .role(.onSurfaceVariant),
  errorTextTypescale: acmeTypescale.body,
  layoutPageGap: 16,
  motionControlsDuration: 150,
  motionControlsEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionEnterDuration: 300,
  motionEnterEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionEnterScale: 0.95,
  motionExitDuration: 200,
  motionExitEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  motionPageDuration: 300,
  motionPageEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionZoomDuration: 250,
  motionZoomEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  navigationButtonVariant: 1,
  navigationMarginInline: 8
)

private let acmeInlineCodeTokens = TanreiInlineCodeTokens(
  containerColor: .role(.surfaceContainerHighest),
  containerPaddingInline: 4,
  containerShape: 3,
  labelColor: .role(.onSurface),
  labelScale: 0.9286,
  labelTypescale: acmeTypescale.code,
  outlineColor: .role(.outlineVariant),
  outlineWidth: 0
)

private let acmeInputBoxTokens = TanreiInputBoxTokens(
  activeIndicatorWidth: 1,
  affixGap: 2,
  containerShape: 6,
  containerShapeBottom: 0,
  motionLabelDuration: 150,
  motionLabelEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineNotchPadding: 4,
  outlineWidth: 1,
  requirementAsteriskGap: 2,
  selectionColor: .role(.primary),
  selectionContentColor: .role(.onPrimary),
  sizes: TanreiInputBoxSizes(
    small: TanreiInputBoxSizeTokens(
      containerHeight: 40,
      containerPaddingInline: 12,
      containerPaddingInlineWithIcon: 8,
      containerPaddingBlock: 8,
      containerPaddingBlockWithLabel: 2,
      containerGap: 8,
      labelTypescale: acmeTypescale.label,
      labelFloatedTypescale: acmeTypescale.labelSmall,
      inputTypescale: acmeTypescale.body,
      iconSize: 20
    ),
    medium: TanreiInputBoxSizeTokens(
      containerHeight: 48,
      containerPaddingInline: 16,
      containerPaddingInlineWithIcon: 12,
      containerPaddingBlock: 10,
      containerPaddingBlockWithLabel: 4,
      containerGap: 16,
      labelTypescale: acmeTypescale.label,
      labelFloatedTypescale: acmeTypescale.labelSmall,
      inputTypescale: acmeTypescale.bodyLarge,
      iconSize: 24
    ),
    large: TanreiInputBoxSizeTokens(
      containerHeight: 56,
      containerPaddingInline: 16,
      containerPaddingInlineWithIcon: 12,
      containerPaddingBlock: 14,
      containerPaddingBlockWithLabel: 4,
      containerGap: 16,
      labelTypescale: acmeTypescale.label,
      labelFloatedTypescale: acmeTypescale.labelSmall,
      inputTypescale: acmeTypescale.bodyLarge,
      iconSize: 24
    )
  ),
  variants: TanreiInputBoxVariants(
    stacked: TanreiInputBoxVariantTokens(
      enabled: TanreiInputBoxVariantStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        activeIndicatorColor: .none,
        outlineColor: .none,
        labelColor: .role(.onSurface),
        inputColor: .role(.onSurface),
        placeholderColor: .role(.onSurfaceVariant),
        affixColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurfaceVariant),
        trailingIconColor: .role(.onSurfaceVariant),
        caretColor: .role(.primary),
        requiredAsteriskColor: .role(.primary),
        stateLayerColor: .role(.onSurface),
        errorContainerColor: .role(.surfaceContainerHighest),
        errorActiveIndicatorColor: .none,
        errorOutlineColor: .role(.error),
        errorLabelColor: .role(.onSurface),
        errorInputColor: .role(.onSurface),
        errorPlaceholderColor: .role(.onSurfaceVariant),
        errorAffixColor: .role(.onSurfaceVariant),
        errorLeadingIconColor: .role(.onSurfaceVariant),
        errorTrailingIconColor: .role(.error),
        errorCaretColor: .role(.error),
        errorRequiredAsteriskColor: .role(.primary),
        errorStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiInputBoxVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.06),
        activeIndicatorColor: .none,
        outlineColor: .none,
        labelColor: .role(.onSurface),
        inputColor: .role(.onSurface),
        placeholderColor: .role(.onSurfaceVariant),
        affixColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurfaceVariant),
        trailingIconColor: .role(.onSurfaceVariant),
        caretColor: .role(.primary),
        requiredAsteriskColor: .role(.primary),
        stateLayerColor: .role(.onSurface),
        errorContainerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.06),
        errorActiveIndicatorColor: .none,
        errorOutlineColor: .role(.error),
        errorLabelColor: .role(.onSurface),
        errorInputColor: .role(.onSurface),
        errorPlaceholderColor: .role(.onSurfaceVariant),
        errorAffixColor: .role(.onSurfaceVariant),
        errorLeadingIconColor: .role(.onSurfaceVariant),
        errorTrailingIconColor: .role(.error),
        errorCaretColor: .role(.error),
        errorRequiredAsteriskColor: .role(.primary),
        errorStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiInputBoxVariantStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        activeIndicatorColor: .none,
        outlineColor: .role(.focusRing),
        labelColor: .role(.primary),
        inputColor: .role(.onSurface),
        placeholderColor: .role(.onSurfaceVariant),
        affixColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurfaceVariant),
        trailingIconColor: .role(.onSurfaceVariant),
        caretColor: .role(.primary),
        requiredAsteriskColor: .role(.primary),
        stateLayerColor: .role(.onSurface),
        errorContainerColor: .role(.surfaceContainerHighest),
        errorActiveIndicatorColor: .none,
        errorOutlineColor: .role(.error),
        errorLabelColor: .role(.onSurface),
        errorInputColor: .role(.onSurface),
        errorPlaceholderColor: .role(.onSurfaceVariant),
        errorAffixColor: .role(.onSurfaceVariant),
        errorLeadingIconColor: .role(.onSurfaceVariant),
        errorTrailingIconColor: .role(.error),
        errorCaretColor: .role(.error),
        errorRequiredAsteriskColor: .role(.primary),
        errorStateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiInputBoxVariantStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        activeIndicatorColor: .none,
        outlineColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        inputColor: .alpha(of: .role(.onSurface), amount: 0.38),
        placeholderColor: .alpha(of: .role(.onSurface), amount: 0.38),
        affixColor: .alpha(of: .role(.onSurface), amount: 0.38),
        leadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        trailingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        caretColor: .alpha(of: .role(.onSurface), amount: 0.38),
        requiredAsteriskColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorContainerColor: .role(.surfaceContainerHighest),
        errorActiveIndicatorColor: .none,
        errorOutlineColor: .none,
        errorLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorInputColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorPlaceholderColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorAffixColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorTrailingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorCaretColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorRequiredAsteriskColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    filled: TanreiInputBoxVariantTokens(
      enabled: TanreiInputBoxVariantStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        activeIndicatorColor: .role(.outline),
        outlineColor: .none,
        labelColor: .role(.onSurfaceVariant),
        inputColor: .role(.onSurface),
        placeholderColor: .role(.onSurfaceVariant),
        affixColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurfaceVariant),
        trailingIconColor: .role(.onSurfaceVariant),
        caretColor: .role(.primary),
        requiredAsteriskColor: .role(.primary),
        stateLayerColor: .role(.onSurface),
        errorContainerColor: .role(.surfaceContainerHighest),
        errorActiveIndicatorColor: .role(.error),
        errorOutlineColor: .none,
        errorLabelColor: .role(.error),
        errorInputColor: .role(.onSurface),
        errorPlaceholderColor: .role(.onSurfaceVariant),
        errorAffixColor: .role(.onSurfaceVariant),
        errorLeadingIconColor: .role(.onSurfaceVariant),
        errorTrailingIconColor: .role(.error),
        errorCaretColor: .role(.error),
        errorRequiredAsteriskColor: .role(.primary),
        errorStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiInputBoxVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.06),
        activeIndicatorColor: .role(.onSurface),
        outlineColor: .none,
        labelColor: .role(.onSurfaceVariant),
        inputColor: .role(.onSurface),
        placeholderColor: .role(.onSurfaceVariant),
        affixColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurfaceVariant),
        trailingIconColor: .role(.onSurfaceVariant),
        caretColor: .role(.primary),
        requiredAsteriskColor: .role(.primary),
        stateLayerColor: .role(.onSurface),
        errorContainerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.06),
        errorActiveIndicatorColor: .role(.error),
        errorOutlineColor: .none,
        errorLabelColor: .role(.error),
        errorInputColor: .role(.onSurface),
        errorPlaceholderColor: .role(.onSurfaceVariant),
        errorAffixColor: .role(.onSurfaceVariant),
        errorLeadingIconColor: .role(.onSurfaceVariant),
        errorTrailingIconColor: .role(.error),
        errorCaretColor: .role(.error),
        errorRequiredAsteriskColor: .role(.primary),
        errorStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiInputBoxVariantStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        activeIndicatorColor: .role(.focusRing),
        outlineColor: .none,
        labelColor: .role(.primary),
        inputColor: .role(.onSurface),
        placeholderColor: .role(.onSurfaceVariant),
        affixColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurfaceVariant),
        trailingIconColor: .role(.onSurfaceVariant),
        caretColor: .role(.primary),
        requiredAsteriskColor: .role(.primary),
        stateLayerColor: .role(.onSurface),
        errorContainerColor: .role(.surfaceContainerHighest),
        errorActiveIndicatorColor: .role(.error),
        errorOutlineColor: .none,
        errorLabelColor: .role(.error),
        errorInputColor: .role(.onSurface),
        errorPlaceholderColor: .role(.onSurfaceVariant),
        errorAffixColor: .role(.onSurfaceVariant),
        errorLeadingIconColor: .role(.onSurfaceVariant),
        errorTrailingIconColor: .role(.error),
        errorCaretColor: .role(.error),
        errorRequiredAsteriskColor: .role(.primary),
        errorStateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiInputBoxVariantStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        activeIndicatorColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        inputColor: .alpha(of: .role(.onSurface), amount: 0.38),
        placeholderColor: .alpha(of: .role(.onSurface), amount: 0.38),
        affixColor: .alpha(of: .role(.onSurface), amount: 0.38),
        leadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        trailingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        caretColor: .alpha(of: .role(.onSurface), amount: 0.38),
        requiredAsteriskColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorContainerColor: .role(.surfaceContainerHighest),
        errorActiveIndicatorColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorOutlineColor: .none,
        errorLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorInputColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorPlaceholderColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorAffixColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorTrailingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorCaretColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorRequiredAsteriskColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    outlined: TanreiInputBoxVariantTokens(
      enabled: TanreiInputBoxVariantStateTokens(
        containerColor: .none,
        activeIndicatorColor: .none,
        outlineColor: .role(.outline),
        labelColor: .role(.onSurfaceVariant),
        inputColor: .role(.onSurface),
        placeholderColor: .role(.onSurfaceVariant),
        affixColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurfaceVariant),
        trailingIconColor: .role(.onSurfaceVariant),
        caretColor: .role(.primary),
        requiredAsteriskColor: .role(.primary),
        stateLayerColor: .role(.onSurface),
        errorContainerColor: .none,
        errorActiveIndicatorColor: .none,
        errorOutlineColor: .role(.error),
        errorLabelColor: .role(.error),
        errorInputColor: .role(.onSurface),
        errorPlaceholderColor: .role(.onSurfaceVariant),
        errorAffixColor: .role(.onSurfaceVariant),
        errorLeadingIconColor: .role(.onSurfaceVariant),
        errorTrailingIconColor: .role(.error),
        errorCaretColor: .role(.error),
        errorRequiredAsteriskColor: .role(.primary),
        errorStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiInputBoxVariantStateTokens(
        containerColor: .none,
        activeIndicatorColor: .none,
        outlineColor: .role(.onSurface),
        labelColor: .role(.onSurfaceVariant),
        inputColor: .role(.onSurface),
        placeholderColor: .role(.onSurfaceVariant),
        affixColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurfaceVariant),
        trailingIconColor: .role(.onSurfaceVariant),
        caretColor: .role(.primary),
        requiredAsteriskColor: .role(.primary),
        stateLayerColor: .role(.onSurface),
        errorContainerColor: .none,
        errorActiveIndicatorColor: .none,
        errorOutlineColor: .role(.error),
        errorLabelColor: .role(.error),
        errorInputColor: .role(.onSurface),
        errorPlaceholderColor: .role(.onSurfaceVariant),
        errorAffixColor: .role(.onSurfaceVariant),
        errorLeadingIconColor: .role(.onSurfaceVariant),
        errorTrailingIconColor: .role(.error),
        errorCaretColor: .role(.error),
        errorRequiredAsteriskColor: .role(.primary),
        errorStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiInputBoxVariantStateTokens(
        containerColor: .none,
        activeIndicatorColor: .none,
        outlineColor: .role(.focusRing),
        labelColor: .role(.primary),
        inputColor: .role(.onSurface),
        placeholderColor: .role(.onSurfaceVariant),
        affixColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurfaceVariant),
        trailingIconColor: .role(.onSurfaceVariant),
        caretColor: .role(.primary),
        requiredAsteriskColor: .role(.primary),
        stateLayerColor: .role(.onSurface),
        errorContainerColor: .none,
        errorActiveIndicatorColor: .none,
        errorOutlineColor: .role(.error),
        errorLabelColor: .role(.error),
        errorInputColor: .role(.onSurface),
        errorPlaceholderColor: .role(.onSurfaceVariant),
        errorAffixColor: .role(.onSurfaceVariant),
        errorLeadingIconColor: .role(.onSurfaceVariant),
        errorTrailingIconColor: .role(.error),
        errorCaretColor: .role(.error),
        errorRequiredAsteriskColor: .role(.primary),
        errorStateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiInputBoxVariantStateTokens(
        containerColor: .none,
        activeIndicatorColor: .none,
        outlineColor: .alpha(of: .role(.onSurface), amount: 0.12),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        inputColor: .alpha(of: .role(.onSurface), amount: 0.38),
        placeholderColor: .alpha(of: .role(.onSurface), amount: 0.38),
        affixColor: .alpha(of: .role(.onSurface), amount: 0.38),
        leadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        trailingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        caretColor: .alpha(of: .role(.onSurface), amount: 0.38),
        requiredAsteriskColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorContainerColor: .none,
        errorActiveIndicatorColor: .none,
        errorOutlineColor: .alpha(of: .role(.onSurface), amount: 0.12),
        errorLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorInputColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorPlaceholderColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorAffixColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorTrailingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorCaretColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorRequiredAsteriskColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiInputBoxStateTokens(
    activeIndicatorWidth: 1,
    opacity: 1,
    outlineWidth: 1
  ),
  focused: TanreiInputBoxStateTokens(
    activeIndicatorWidth: 2,
    opacity: 1,
    outlineWidth: 2
  ),
  disabled: TanreiInputBoxStateTokens(
    activeIndicatorWidth: 1,
    opacity: 1,
    outlineWidth: 1
  )
)

private let acmeKeyboardShortcutTokens = TanreiKeyboardShortcutTokens(
  containerColor: .role(.surfaceContainerHighest),
  outlineBottomWidth: 0,
  outlineColor: .role(.outlineVariant),
  outlineWidth: 0,
  sizes: TanreiKeyboardShortcutSizes(
    small: TanreiKeyboardShortcutSizeTokens(
      containerHeight: 20,
      containerPaddingInline: 4,
      containerShape: 3,
      labelTypescale: acmeTypescale.labelSmall,
      chordGap: 2,
      sequenceGap: 8
    ),
    medium: TanreiKeyboardShortcutSizeTokens(
      containerHeight: 24,
      containerPaddingInline: 6,
      containerShape: 6,
      labelTypescale: acmeTypescale.label,
      chordGap: 4,
      sequenceGap: 12
    )
  ),
  variants: TanreiKeyboardShortcutVariants(
    keycap: TanreiKeyboardShortcutVariantTokens(
      enabled: TanreiKeyboardShortcutVariantStateTokens(
        labelColor: .role(.onSurfaceVariant)
      ),
      disabled: TanreiKeyboardShortcutVariantStateTokens(
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    plain: TanreiKeyboardShortcutVariantTokens(
      enabled: TanreiKeyboardShortcutVariantStateTokens(
        labelColor: .role(.onSurfaceVariant)
      ),
      disabled: TanreiKeyboardShortcutVariantStateTokens(
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  )
)

private let acmeLinkCardTokens = TanreiLinkCardTokens(
  containerPadding: 16,
  containerShape: 8,
  descriptionMaxLines: 2,
  descriptionTypescale: acmeTypescale.body,
  layoutBesideMinWidth: 480,
  mediaAspectRatio: 1.9,
  mediaContainerColor: .role(.surfaceContainerHigh),
  mediaWidth: 192,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineWidth: 1,
  siteGap: 8,
  siteIconShape: 3,
  siteIconSize: 16,
  siteItemGap: 6,
  siteTypescale: acmeTypescale.bodySmall,
  titleGap: 4,
  titleMaxLines: 2,
  titleTypescale: acmeTypescale.heading5,
  variants: TanreiLinkCardVariants(
    outlined: TanreiLinkCardVariantTokens(
      enabled: TanreiLinkCardVariantStateTokens(
        containerColor: .role(.surface),
        outlineColor: .role(.outlineVariant),
        titleColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        siteColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiLinkCardVariantStateTokens(
        containerColor: .mix(base: .role(.surface), with: .role(.onSurface), amount: 0.06),
        outlineColor: .role(.outlineVariant),
        titleColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        siteColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiLinkCardVariantStateTokens(
        containerColor: .mix(base: .role(.surface), with: .role(.onSurface), amount: 0.12),
        outlineColor: .role(.outlineVariant),
        titleColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        siteColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiLinkCardVariantStateTokens(
        containerColor: .mix(base: .role(.surface), with: .role(.onSurface), amount: 0.2),
        outlineColor: .role(.outlineVariant),
        titleColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        siteColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      )
    ),
    filled: TanreiLinkCardVariantTokens(
      enabled: TanreiLinkCardVariantStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        outlineColor: .none,
        titleColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        siteColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiLinkCardVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.06),
        outlineColor: .none,
        titleColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        siteColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiLinkCardVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.12),
        outlineColor: .none,
        titleColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        siteColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiLinkCardVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.2),
        outlineColor: .none,
        titleColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        siteColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      )
    )
  ),
  hovered: TanreiLinkCardStateTokens(
    opacity: 1
  ),
  focused: TanreiLinkCardStateTokens(
    opacity: 1
  ),
  pressed: TanreiLinkCardStateTokens(
    opacity: 1
  )
)

private let acmeLinkTokens = TanreiLinkTokens(
  containerGap: 4,
  containerShape: 3,
  externalMarks: 0,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  siteIconDisabledOpacity: 0.38,
  siteIconShape: 3,
  underlineOffset: 2,
  underlineVisibility: 0,
  underlineWidth: 1,
  variants: TanreiLinkVariants(
    standard: TanreiLinkVariantTokens(
      enabled: TanreiLinkVariantStateTokens(
        containerColor: .none,
        labelColor: .role(.link),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.link),
        currentContainerColor: .none,
        currentLabelColor: .role(.onSurface),
        currentIconColor: .role(.onSurface),
        currentStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiLinkVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.link), amount: 0.06),
        labelColor: .role(.link),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.link),
        currentContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        currentLabelColor: .role(.onSurface),
        currentIconColor: .role(.onSurface),
        currentStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiLinkVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.link), amount: 0.12),
        labelColor: .role(.link),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.link),
        currentContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        currentLabelColor: .role(.onSurface),
        currentIconColor: .role(.onSurface),
        currentStateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiLinkVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.link), amount: 0.2),
        labelColor: .role(.link),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.link),
        currentContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        currentLabelColor: .role(.onSurface),
        currentIconColor: .role(.onSurface),
        currentStateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiLinkVariantStateTokens(
        containerColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        currentContainerColor: .none,
        currentLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        currentIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        currentStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    inverse: TanreiLinkVariantTokens(
      enabled: TanreiLinkVariantStateTokens(
        containerColor: .none,
        labelColor: .role(.inverseLink),
        iconColor: .role(.inverseOnSurface),
        stateLayerColor: .role(.inverseLink),
        currentContainerColor: .none,
        currentLabelColor: .role(.inverseOnSurface),
        currentIconColor: .role(.inverseOnSurface),
        currentStateLayerColor: .role(.inverseOnSurface)
      ),
      hovered: TanreiLinkVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.inverseLink), amount: 0.06),
        labelColor: .role(.inverseLink),
        iconColor: .role(.inverseOnSurface),
        stateLayerColor: .role(.inverseLink),
        currentContainerColor: .mix(base: .none, with: .role(.inverseOnSurface), amount: 0.06),
        currentLabelColor: .role(.inverseOnSurface),
        currentIconColor: .role(.inverseOnSurface),
        currentStateLayerColor: .role(.inverseOnSurface)
      ),
      focused: TanreiLinkVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.inverseLink), amount: 0.12),
        labelColor: .role(.inverseLink),
        iconColor: .role(.inverseOnSurface),
        stateLayerColor: .role(.inverseLink),
        currentContainerColor: .mix(base: .none, with: .role(.inverseOnSurface), amount: 0.12),
        currentLabelColor: .role(.inverseOnSurface),
        currentIconColor: .role(.inverseOnSurface),
        currentStateLayerColor: .role(.inverseOnSurface)
      ),
      pressed: TanreiLinkVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.inverseLink), amount: 0.2),
        labelColor: .role(.inverseLink),
        iconColor: .role(.inverseOnSurface),
        stateLayerColor: .role(.inverseLink),
        currentContainerColor: .mix(base: .none, with: .role(.inverseOnSurface), amount: 0.2),
        currentLabelColor: .role(.inverseOnSurface),
        currentIconColor: .role(.inverseOnSurface),
        currentStateLayerColor: .role(.inverseOnSurface)
      ),
      disabled: TanreiLinkVariantStateTokens(
        containerColor: .none,
        labelColor: .alpha(of: .role(.inverseOnSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.inverseOnSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.inverseOnSurface), amount: 0.38),
        currentContainerColor: .none,
        currentLabelColor: .alpha(of: .role(.inverseOnSurface), amount: 0.38),
        currentIconColor: .alpha(of: .role(.inverseOnSurface), amount: 0.38),
        currentStateLayerColor: .alpha(of: .role(.inverseOnSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiLinkStateTokens(
    containerShape: 3,
    opacity: 1
  ),
  focused: TanreiLinkStateTokens(
    containerShape: 3,
    opacity: 1
  ),
  pressed: TanreiLinkStateTokens(
    containerShape: 3,
    opacity: 1
  ),
  disabled: TanreiLinkStateTokens(
    containerShape: 3,
    opacity: 1
  )
)

private let acmeListRowTokens = TanreiListRowTokens(
  containerGap: 16,
  containerPaddingInlineEnd: 16,
  containerPaddingInlineStart: 16,
  headlineColor: .role(.onSurface),
  headlineTypescale: acmeTypescale.body,
  leadingIconColor: .role(.onSurfaceVariant),
  leadingIconSize: 24,
  overlineColor: .role(.onSurfaceVariant),
  overlineTypescale: acmeTypescale.labelSmall,
  supportingTextColor: .role(.onSurfaceVariant),
  supportingTextTypescale: acmeTypescale.bodySmall,
  trailingIconColor: .role(.onSurfaceVariant),
  trailingIconSize: 24,
  trailingTextColor: .role(.onSurfaceVariant),
  trailingTextTypescale: acmeTypescale.bodySmall,
  densitys: TanreiListRowDensitys(
    regular: TanreiListRowDensityTokens(
      containerHeightOneLine: 56,
      containerHeightTwoLine: 72,
      containerHeightThreeLine: 88,
      containerPaddingBlock: 8
    ),
    compact: TanreiListRowDensityTokens(
      containerHeightOneLine: 40,
      containerHeightTwoLine: 56,
      containerHeightThreeLine: 72,
      containerPaddingBlock: 4
    )
  )
)

private let acmeListTokens = TanreiListTokens(
  containerGap: 16,
  containerHeight: 48,
  containerPaddingBlock: 8,
  containerPaddingInlineEnd: 16,
  containerPaddingInlineStart: 16,
  containerShape: 0,
  contentTypescale: acmeTypescale.body,
  dividerColor: .role(.outlineVariant),
  dividerThickness: 1,
  draggedContainerColor: .role(.surfaceContainerHigh),
  draggedContainerElevation: acmeElevation.level3,
  gapLarge: 24,
  gapMedium: 16,
  gapSmall: 12,
  markSize: 24,
  markWidth: 2,
  motionFeedbackDuration: 450,
  motionReorderDuration: 300,
  motionReorderEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  conditions: TanreiListConditions(
    unselected: TanreiListConditionTokens(
      enabled: TanreiListConditionStateTokens(
        containerColor: .none,
        contentColor: .role(.onSurface),
        markColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiListConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        contentColor: .role(.onSurface),
        markColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiListConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        contentColor: .role(.onSurface),
        markColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiListConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        contentColor: .role(.onSurface),
        markColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiListConditionStateTokens(
        containerColor: .none,
        contentColor: .role(.onSurface),
        markColor: .none,
        stateLayerColor: .role(.onSurface)
      )
    ),
    selected: TanreiListConditionTokens(
      enabled: TanreiListConditionStateTokens(
        containerColor: .alpha(of: .role(.onSecondaryContainer), amount: 0.16),
        contentColor: .role(.onSecondaryContainer),
        markColor: .role(.primary),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiListConditionStateTokens(
        containerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06),
        contentColor: .role(.onSecondaryContainer),
        markColor: .role(.primary),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiListConditionStateTokens(
        containerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12),
        contentColor: .role(.onSecondaryContainer),
        markColor: .role(.primary),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiListConditionStateTokens(
        containerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2),
        contentColor: .role(.onSecondaryContainer),
        markColor: .role(.primary),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiListConditionStateTokens(
        containerColor: .alpha(of: .role(.onSecondaryContainer), amount: 0.16),
        contentColor: .role(.onSecondaryContainer),
        markColor: .role(.primary),
        stateLayerColor: .role(.onSecondaryContainer)
      )
    )
  ),
  hovered: TanreiListStateTokens(
    containerShape: 0,
    opacity: 1
  ),
  focused: TanreiListStateTokens(
    containerShape: 0,
    opacity: 1
  ),
  pressed: TanreiListStateTokens(
    containerShape: 0,
    opacity: 1
  ),
  disabled: TanreiListStateTokens(
    containerShape: 0,
    opacity: 0.38
  )
)

private let acmeLoadingIndicatorTokens = TanreiLoadingIndicatorTokens(
  containedContainerColor: .role(.surfaceContainerLowest),
  containedContainerElevation: acmeElevation.level2,
  containedIndicatorColor: .role(.onSurfaceVariant),
  containerShape: 9999,
  indicatorColor: .role(.onSurfaceVariant),
  motionCycleDuration: 1000,
  motionEnterDuration: 200,
  motionEnterEasing: TanreiCubicBezier(0, 0, 0, 1),
  motionEntrance: 0,
  motionShowDelay: 300,
  sizes: TanreiLoadingIndicatorSizes(
    small: TanreiLoadingIndicatorSizeTokens(
      indicatorSize: 16,
      indicatorThickness: 2,
      containerSize: 24
    ),
    medium: TanreiLoadingIndicatorSizeTokens(
      indicatorSize: 24,
      indicatorThickness: 2,
      containerSize: 32
    ),
    large: TanreiLoadingIndicatorSizeTokens(
      indicatorSize: 40,
      indicatorThickness: 2,
      containerSize: 48
    )
  )
)

private let acmeMainActionButtonTokens = TanreiMainActionButtonTokens(
  motionFeedbackDuration: 450,
  motionResizeDuration: 500,
  motionResizeEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  sizes: TanreiMainActionButtonSizes(
    small: TanreiMainActionButtonSizeTokens(
      containerHeight: 40,
      containerShape: 9999,
      containerPaddingInlineStart: 16,
      containerPaddingInlineEnd: 16,
      containerPaddingInlineStartWithIcon: 12,
      containerPaddingInlineEndWithIcon: 12,
      containerPaddingBlock: 6,
      containerGap: 8,
      labelTypescale: acmeTypescale.label,
      iconSize: 24
    ),
    medium: TanreiMainActionButtonSizeTokens(
      containerHeight: 56,
      containerShape: 9999,
      containerPaddingInlineStart: 20,
      containerPaddingInlineEnd: 20,
      containerPaddingInlineStartWithIcon: 16,
      containerPaddingInlineEndWithIcon: 20,
      containerPaddingBlock: 6,
      containerGap: 12,
      labelTypescale: acmeTypescale.label,
      iconSize: 24
    ),
    large: TanreiMainActionButtonSizeTokens(
      containerHeight: 96,
      containerShape: 9999,
      containerPaddingInlineStart: 32,
      containerPaddingInlineEnd: 32,
      containerPaddingInlineStartWithIcon: 24,
      containerPaddingInlineEndWithIcon: 32,
      containerPaddingBlock: 6,
      containerGap: 16,
      labelTypescale: acmeTypescale.heading5,
      iconSize: 32
    )
  ),
  variants: TanreiMainActionButtonVariants(
    filled: TanreiMainActionButtonVariantTokens(
      enabled: TanreiMainActionButtonVariantStateTokens(
        containerColor: .role(.primary),
        containerElevation: acmeElevation.level3,
        labelColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary)
      ),
      hovered: TanreiMainActionButtonVariantStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.06),
        containerElevation: acmeElevation.level4,
        labelColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary)
      ),
      focused: TanreiMainActionButtonVariantStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        containerElevation: acmeElevation.level3,
        labelColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary)
      ),
      pressed: TanreiMainActionButtonVariantStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.2),
        containerElevation: acmeElevation.level3,
        labelColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary)
      ),
      disabled: TanreiMainActionButtonVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: acmeElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    tonal: TanreiMainActionButtonVariantTokens(
      enabled: TanreiMainActionButtonVariantStateTokens(
        containerColor: .role(.secondaryContainer),
        containerElevation: acmeElevation.level3,
        labelColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiMainActionButtonVariantStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.06),
        containerElevation: acmeElevation.level4,
        labelColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiMainActionButtonVariantStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        containerElevation: acmeElevation.level3,
        labelColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiMainActionButtonVariantStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.2),
        containerElevation: acmeElevation.level3,
        labelColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiMainActionButtonVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: acmeElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    surface: TanreiMainActionButtonVariantTokens(
      enabled: TanreiMainActionButtonVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: acmeElevation.level3,
        labelColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      hovered: TanreiMainActionButtonVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.primary), amount: 0.06),
        containerElevation: acmeElevation.level4,
        labelColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      focused: TanreiMainActionButtonVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.primary), amount: 0.12),
        containerElevation: acmeElevation.level3,
        labelColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      pressed: TanreiMainActionButtonVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.primary), amount: 0.2),
        containerElevation: acmeElevation.level3,
        labelColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      disabled: TanreiMainActionButtonVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: acmeElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiMainActionButtonStateTokens(
    opacity: 1
  ),
  focused: TanreiMainActionButtonStateTokens(
    opacity: 1
  ),
  pressed: TanreiMainActionButtonStateTokens(
    opacity: 1
  ),
  disabled: TanreiMainActionButtonStateTokens(
    opacity: 1
  )
)

private let acmeMenuTokens = TanreiMenuTokens(
  checkboxItemMark: 0,
  containerGap: 12,
  containerHeight: 48,
  containerPaddingBlock: 8,
  containerPaddingInline: 12,
  containerShape: 6,
  controlBoxShape: 2,
  controlBoxSize: 18,
  controlFillInset: 0,
  controlFillOpacity: 0.16,
  controlMarkSize: 20,
  controlMarkWeight: 400,
  controlOutlineWidth: 2,
  controlRingSelectedWidthShare: 0.5,
  controlRingSize: 20,
  controlRingWidth: 2,
  dividerColor: .role(.outlineVariant),
  dividerSpace: 4,
  dividerThickness: 1,
  groupTitleColor: .role(.onSurfaceVariant),
  groupTitlePaddingInline: 12,
  groupTitleTypescale: acmeTypescale.labelSmall,
  groupGap: 16,
  labelTypescale: acmeTypescale.label,
  leadingIconSize: 24,
  markSize: 24,
  markWidth: 2,
  motionCloseDuration: 100,
  motionCloseEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  motionFeedbackDuration: 450,
  motionOpenDuration: 200,
  motionOpenEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionSubmenuDelay: 200,
  radioItemMark: 0,
  separation: 0,
  shortcutVariant: 0,
  submenuOffset: 4,
  supportingTextTypescale: acmeTypescale.bodySmall,
  surfaceColor: .role(.surfaceBright),
  surfaceElevation: acmeElevation.level2,
  surfaceMaxWidth: 320,
  surfaceMinWidth: 160,
  surfaceOffset: 4,
  surfacePaddingBlock: 4,
  surfacePaddingInline: 4,
  surfaceShape: 8,
  surfaceViewportMargin: 8,
  trailingIconSize: 24,
  trailingTextTypescale: acmeTypescale.labelSmall,
  conditions: TanreiMenuConditions(
    unselected: TanreiMenuConditionTokens(
      enabled: TanreiMenuConditionStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurfaceVariant),
        trailingIconColor: .role(.onSurfaceVariant),
        markColor: .none,
        controlColor: .role(.outline),
        controlMarkColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiMenuConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurfaceVariant),
        trailingIconColor: .role(.onSurfaceVariant),
        markColor: .none,
        controlColor: .role(.outline),
        controlMarkColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiMenuConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurfaceVariant),
        trailingIconColor: .role(.onSurfaceVariant),
        markColor: .none,
        controlColor: .role(.outline),
        controlMarkColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiMenuConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurfaceVariant),
        trailingIconColor: .role(.onSurfaceVariant),
        markColor: .none,
        controlColor: .role(.outline),
        controlMarkColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiMenuConditionStateTokens(
        containerColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        supportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        trailingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        leadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        trailingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        markColor: .none,
        controlColor: .alpha(of: .role(.onSurface), amount: 0.38),
        controlMarkColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    selected: TanreiMenuConditionTokens(
      enabled: TanreiMenuConditionStateTokens(
        containerColor: .scheme(by: [.light: .alpha(of: .role(.onSecondaryContainer), amount: 0), .lightMedium: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), .lightHigh: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), .dark: .alpha(of: .role(.onSecondaryContainer), amount: 0), .darkMedium: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), .darkHigh: .alpha(of: .role(.onSecondaryContainer), amount: 0.16)]),
        labelColor: .role(.onSecondaryContainer),
        supportingTextColor: .role(.onSecondaryContainer),
        trailingTextColor: .role(.onSecondaryContainer),
        leadingIconColor: .role(.onSecondaryContainer),
        trailingIconColor: .role(.onSecondaryContainer),
        markColor: .role(.primary),
        controlColor: .role(.primary),
        controlMarkColor: .role(.onPrimary),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiMenuConditionStateTokens(
        containerColor: .scheme(by: [.light: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.06), .lightMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06), .lightHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06), .dark: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.06), .darkMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06), .darkHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06)]),
        labelColor: .role(.onSecondaryContainer),
        supportingTextColor: .role(.onSecondaryContainer),
        trailingTextColor: .role(.onSecondaryContainer),
        leadingIconColor: .role(.onSecondaryContainer),
        trailingIconColor: .role(.onSecondaryContainer),
        markColor: .role(.primary),
        controlColor: .role(.primary),
        controlMarkColor: .role(.onPrimary),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiMenuConditionStateTokens(
        containerColor: .scheme(by: [.light: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.12), .lightMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12), .lightHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12), .dark: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.12), .darkMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12), .darkHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12)]),
        labelColor: .role(.onSecondaryContainer),
        supportingTextColor: .role(.onSecondaryContainer),
        trailingTextColor: .role(.onSecondaryContainer),
        leadingIconColor: .role(.onSecondaryContainer),
        trailingIconColor: .role(.onSecondaryContainer),
        markColor: .role(.primary),
        controlColor: .role(.primary),
        controlMarkColor: .role(.onPrimary),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiMenuConditionStateTokens(
        containerColor: .scheme(by: [.light: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.2), .lightMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2), .lightHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2), .dark: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.2), .darkMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2), .darkHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2)]),
        labelColor: .role(.onSecondaryContainer),
        supportingTextColor: .role(.onSecondaryContainer),
        trailingTextColor: .role(.onSecondaryContainer),
        leadingIconColor: .role(.onSecondaryContainer),
        trailingIconColor: .role(.onSecondaryContainer),
        markColor: .role(.primary),
        controlColor: .role(.primary),
        controlMarkColor: .role(.onPrimary),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiMenuConditionStateTokens(
        containerColor: .scheme(by: [.light: .alpha(of: .role(.onSurface), amount: 0), .lightMedium: .alpha(of: .role(.onSurface), amount: 0.12), .lightHigh: .alpha(of: .role(.onSurface), amount: 0.12), .dark: .alpha(of: .role(.onSurface), amount: 0), .darkMedium: .alpha(of: .role(.onSurface), amount: 0.12), .darkHigh: .alpha(of: .role(.onSurface), amount: 0.12)]),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        supportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        trailingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        leadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        trailingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        markColor: .alpha(of: .role(.onSurface), amount: 0.38),
        controlColor: .alpha(of: .role(.onSurface), amount: 0.38),
        controlMarkColor: .role(.surfaceBright),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    current: TanreiMenuConditionTokens(
      enabled: TanreiMenuConditionStateTokens(
        containerColor: .alpha(of: .role(.onSecondaryContainer), amount: 0.16),
        labelColor: .role(.onSecondaryContainer),
        supportingTextColor: .role(.onSecondaryContainer),
        trailingTextColor: .role(.onSecondaryContainer),
        leadingIconColor: .role(.onSecondaryContainer),
        trailingIconColor: .role(.onSecondaryContainer),
        markColor: .none,
        controlColor: .none,
        controlMarkColor: .none,
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiMenuConditionStateTokens(
        containerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06),
        labelColor: .role(.onSecondaryContainer),
        supportingTextColor: .role(.onSecondaryContainer),
        trailingTextColor: .role(.onSecondaryContainer),
        leadingIconColor: .role(.onSecondaryContainer),
        trailingIconColor: .role(.onSecondaryContainer),
        markColor: .none,
        controlColor: .none,
        controlMarkColor: .none,
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiMenuConditionStateTokens(
        containerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12),
        labelColor: .role(.onSecondaryContainer),
        supportingTextColor: .role(.onSecondaryContainer),
        trailingTextColor: .role(.onSecondaryContainer),
        leadingIconColor: .role(.onSecondaryContainer),
        trailingIconColor: .role(.onSecondaryContainer),
        markColor: .none,
        controlColor: .none,
        controlMarkColor: .none,
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiMenuConditionStateTokens(
        containerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2),
        labelColor: .role(.onSecondaryContainer),
        supportingTextColor: .role(.onSecondaryContainer),
        trailingTextColor: .role(.onSecondaryContainer),
        leadingIconColor: .role(.onSecondaryContainer),
        trailingIconColor: .role(.onSecondaryContainer),
        markColor: .none,
        controlColor: .none,
        controlMarkColor: .none,
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiMenuConditionStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        supportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        trailingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        leadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        trailingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        markColor: .alpha(of: .role(.onSurface), amount: 0.38),
        controlColor: .alpha(of: .role(.onSurface), amount: 0.38),
        controlMarkColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    destructive: TanreiMenuConditionTokens(
      enabled: TanreiMenuConditionStateTokens(
        containerColor: .none,
        labelColor: .role(.error),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.error),
        trailingIconColor: .role(.onSurfaceVariant),
        markColor: .none,
        controlColor: .none,
        controlMarkColor: .none,
        stateLayerColor: .role(.error)
      ),
      hovered: TanreiMenuConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.06),
        labelColor: .role(.error),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.error),
        trailingIconColor: .role(.onSurfaceVariant),
        markColor: .none,
        controlColor: .none,
        controlMarkColor: .none,
        stateLayerColor: .role(.error)
      ),
      focused: TanreiMenuConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
        labelColor: .role(.error),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.error),
        trailingIconColor: .role(.onSurfaceVariant),
        markColor: .none,
        controlColor: .none,
        controlMarkColor: .none,
        stateLayerColor: .role(.error)
      ),
      pressed: TanreiMenuConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.2),
        labelColor: .role(.error),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.error),
        trailingIconColor: .role(.onSurfaceVariant),
        markColor: .none,
        controlColor: .none,
        controlMarkColor: .none,
        stateLayerColor: .role(.error)
      ),
      disabled: TanreiMenuConditionStateTokens(
        containerColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        supportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        trailingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        leadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        trailingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        markColor: .none,
        controlColor: .alpha(of: .role(.onSurface), amount: 0.38),
        controlMarkColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    expanded: TanreiMenuConditionTokens(
      enabled: TanreiMenuConditionStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.06),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurfaceVariant),
        trailingIconColor: .role(.onSurfaceVariant),
        markColor: .none,
        controlColor: .none,
        controlMarkColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiMenuConditionStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.06),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurfaceVariant),
        trailingIconColor: .role(.onSurfaceVariant),
        markColor: .none,
        controlColor: .none,
        controlMarkColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiMenuConditionStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurfaceVariant),
        trailingIconColor: .role(.onSurfaceVariant),
        markColor: .none,
        controlColor: .none,
        controlMarkColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiMenuConditionStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.2),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurfaceVariant),
        trailingIconColor: .role(.onSurfaceVariant),
        markColor: .none,
        controlColor: .none,
        controlMarkColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiMenuConditionStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.06),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        supportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        trailingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        leadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        trailingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        markColor: .alpha(of: .role(.onSurface), amount: 0.38),
        controlColor: .alpha(of: .role(.onSurface), amount: 0.38),
        controlMarkColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiMenuStateTokens(
    containerShape: 6,
    opacity: 1
  ),
  focused: TanreiMenuStateTokens(
    containerShape: 6,
    opacity: 1
  ),
  pressed: TanreiMenuStateTokens(
    containerShape: 6,
    opacity: 1
  ),
  disabled: TanreiMenuStateTokens(
    containerShape: 6,
    opacity: 1
  )
)

private let acmeMenubarTokens = TanreiMenubarTokens(
  barColor: .none,
  barGap: 2,
  barPaddingBlock: 4,
  barPaddingInline: 4,
  containerGap: 4,
  containerHeight: 40,
  containerPaddingInline: 12,
  containerShape: 6,
  iconSize: 24,
  indicatorSize: 20,
  labelTypescale: acmeTypescale.label,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  conditions: TanreiMenubarConditions(
    unselected: TanreiMenubarConditionTokens(
      enabled: TanreiMenubarConditionStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiMenubarConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiMenubarConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiMenubarConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiMenubarConditionStateTokens(
        containerColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    selected: TanreiMenubarConditionTokens(
      enabled: TanreiMenubarConditionStateTokens(
        containerColor: .alpha(of: .role(.onSecondaryContainer), amount: 0.16),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiMenubarConditionStateTokens(
        containerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiMenubarConditionStateTokens(
        containerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiMenubarConditionStateTokens(
        containerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiMenubarConditionStateTokens(
        containerColor: .alpha(of: .role(.onSecondaryContainer), amount: 0.16),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    expanded: TanreiMenubarConditionTokens(
      enabled: TanreiMenubarConditionStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.06),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiMenubarConditionStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.06),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiMenubarConditionStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiMenubarConditionStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.2),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiMenubarConditionStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.06),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiMenubarStateTokens(
    containerShape: 6,
    opacity: 1
  ),
  focused: TanreiMenubarStateTokens(
    containerShape: 6,
    opacity: 1
  ),
  pressed: TanreiMenubarStateTokens(
    containerShape: 6,
    opacity: 1
  ),
  disabled: TanreiMenubarStateTokens(
    containerShape: 6,
    opacity: 1
  )
)

private let acmeModalLayerTokens = TanreiModalLayerTokens(
  motionEnterDuration: 300,
  motionEnterEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionExitDuration: 200,
  motionExitEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  scrimBlur: 0,
  scrimColor: .role(.scrim)
)

private let acmeNavigationBarTokens = TanreiNavigationBarTokens(
  containerColor: .role(.surface),
  containerElevation: acmeElevation.level0,
  containerHeight: 64,
  containerPadding: 4,
  itemContainerPaddingBlock: 4,
  itemContainerPaddingInline: 12,
  itemContainerShape: 9999,
  itemGap: 4,
  itemIconIndicatorHeight: 24,
  itemIconIndicatorShape: 9999,
  itemIconIndicatorWidth: 24,
  itemIconSize: 24,
  itemLabelTypescale: acmeTypescale.labelSmall,
  motionFeedbackDuration: 450,
  motionSelectionDuration: 350,
  motionSelectionEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineColor: .role(.outlineVariant),
  outlineWidth: 1,
  conditions: TanreiNavigationBarConditions(
    unselected: TanreiNavigationBarConditionTokens(
      enabled: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemCoveredIconColor: .role(.onSecondaryContainer),
        itemCoveredLabelColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      hovered: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.06),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemCoveredIconColor: .role(.onSecondaryContainer),
        itemCoveredLabelColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemCoveredIconColor: .role(.onSecondaryContainer),
        itemCoveredLabelColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.2),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemCoveredIconColor: .role(.onSecondaryContainer),
        itemCoveredLabelColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      disabled: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemCoveredIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemCoveredLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    selected: TanreiNavigationBarConditionTokens(
      enabled: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .role(.secondaryContainer),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSurface),
        itemCoveredIconColor: .role(.onSecondaryContainer),
        itemCoveredLabelColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.06),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSurface),
        itemCoveredIconColor: .role(.onSecondaryContainer),
        itemCoveredLabelColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSurface),
        itemCoveredIconColor: .role(.onSecondaryContainer),
        itemCoveredLabelColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.2),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSurface),
        itemCoveredIconColor: .role(.onSecondaryContainer),
        itemCoveredLabelColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .role(.secondaryContainer),
        itemIconIndicatorColor: .none,
        itemIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemCoveredIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemCoveredLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    filledUnselected: TanreiNavigationBarConditionTokens(
      enabled: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemCoveredIconColor: .role(.onPrimary),
        itemCoveredLabelColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      hovered: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.06),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemCoveredIconColor: .role(.onPrimary),
        itemCoveredLabelColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemCoveredIconColor: .role(.onPrimary),
        itemCoveredLabelColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.2),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemCoveredIconColor: .role(.onPrimary),
        itemCoveredLabelColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      disabled: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemCoveredIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemCoveredLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    filledSelected: TanreiNavigationBarConditionTokens(
      enabled: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .role(.primary),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSurface),
        itemCoveredIconColor: .role(.onPrimary),
        itemCoveredLabelColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      hovered: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.06),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSurface),
        itemCoveredIconColor: .role(.onPrimary),
        itemCoveredLabelColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      focused: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSurface),
        itemCoveredIconColor: .role(.onPrimary),
        itemCoveredLabelColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      pressed: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.2),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSurface),
        itemCoveredIconColor: .role(.onPrimary),
        itemCoveredLabelColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      disabled: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        itemIconIndicatorColor: .none,
        itemIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemCoveredIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemCoveredLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiNavigationBarStateTokens(
    opacity: 1
  ),
  focused: TanreiNavigationBarStateTokens(
    opacity: 1
  ),
  pressed: TanreiNavigationBarStateTokens(
    opacity: 1
  ),
  disabled: TanreiNavigationBarStateTokens(
    opacity: 1
  )
)

private let acmeNavigationDrawerTokens = TanreiNavigationDrawerTokens(
  breakpointCollapsed: 600,
  breakpointExpanded: 1024,
  collapsedItemContainerPaddingInline: 4,
  collapsedItemContainerShape: 6,
  collapsedItemGap: 4,
  collapsedItemLabelTypescale: acmeTypescale.labelSmall,
  containerPaddingBlock: 12,
  containerPaddingInline: 12,
  containerWidth: 240,
  guideColor: .role(.outlineVariant),
  guideWidth: 1,
  headerColor: .role(.onSurface),
  headerGap: 24,
  headerItemGap: 8,
  headerTypescale: acmeTypescale.heading5,
  headingColor: .role(.onSurfaceVariant),
  headingTypescale: acmeTypescale.labelSmall,
  itemContainerShape: 6,
  itemGap: 12,
  itemIconIndicatorShape: 9999,
  itemSupportingTextTypescale: acmeTypescale.bodySmall,
  itemTrailingTextTypescale: acmeTypescale.bodySmall,
  motionDisclosureDuration: 350,
  motionDisclosureEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  motionEnterDuration: 300,
  motionEnterEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionExitDuration: 200,
  motionExitEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  motionExpandDuration: 500,
  motionExpandEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  motionFeedbackDuration: 450,
  motionSelectionDuration: 350,
  motionSelectionEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineWidth: 1,
  scrimBlur: 0,
  scrimColor: .role(.scrim),
  stickyContainerColor: .role(.surface),
  stickyDividerColor: .role(.outlineVariant),
  stickyDividerWidth: 1,
  variants: TanreiNavigationDrawerVariants(
    standard: TanreiNavigationDrawerVariantTokens(
      containerColor: .role(.surface),
      containerElevation: acmeElevation.level0,
      containerShape: 0,
      outlineColor: .role(.outlineVariant)
    ),
    modal: TanreiNavigationDrawerVariantTokens(
      containerColor: .role(.surfaceContainerLow),
      containerElevation: acmeElevation.level2,
      containerShape: 12,
      outlineColor: .none
    )
  ),
  conditions: TanreiNavigationDrawerConditions(
    unselected: TanreiNavigationDrawerConditionTokens(
      enabled: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemSupportingTextColor: .role(.onSurfaceVariant),
        itemTrailingTextColor: .role(.onSurfaceVariant),
        itemTrailingIconColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      hovered: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.06),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemSupportingTextColor: .role(.onSurfaceVariant),
        itemTrailingTextColor: .role(.onSurfaceVariant),
        itemTrailingIconColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemSupportingTextColor: .role(.onSurfaceVariant),
        itemTrailingTextColor: .role(.onSurfaceVariant),
        itemTrailingIconColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.2),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemSupportingTextColor: .role(.onSurfaceVariant),
        itemTrailingTextColor: .role(.onSurfaceVariant),
        itemTrailingIconColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      disabled: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemTrailingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemTrailingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    selected: TanreiNavigationDrawerConditionTokens(
      enabled: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .alpha(of: .role(.onSecondaryContainer), amount: 0.16),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSecondaryContainer),
        itemSupportingTextColor: .role(.onSecondaryContainer),
        itemTrailingTextColor: .role(.onSecondaryContainer),
        itemTrailingIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSecondaryContainer),
        itemSupportingTextColor: .role(.onSecondaryContainer),
        itemTrailingTextColor: .role(.onSecondaryContainer),
        itemTrailingIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSecondaryContainer),
        itemSupportingTextColor: .role(.onSecondaryContainer),
        itemTrailingTextColor: .role(.onSecondaryContainer),
        itemTrailingIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSecondaryContainer),
        itemSupportingTextColor: .role(.onSecondaryContainer),
        itemTrailingTextColor: .role(.onSecondaryContainer),
        itemTrailingIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .alpha(of: .role(.onSecondaryContainer), amount: 0.16),
        itemIconIndicatorColor: .none,
        itemIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemTrailingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemTrailingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    collapsedUnselected: TanreiNavigationDrawerConditionTokens(
      enabled: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemSupportingTextColor: .role(.onSurfaceVariant),
        itemTrailingTextColor: .role(.onSurfaceVariant),
        itemTrailingIconColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      hovered: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.06),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemSupportingTextColor: .role(.onSurfaceVariant),
        itemTrailingTextColor: .role(.onSurfaceVariant),
        itemTrailingIconColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemSupportingTextColor: .role(.onSurfaceVariant),
        itemTrailingTextColor: .role(.onSurfaceVariant),
        itemTrailingIconColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.2),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemSupportingTextColor: .role(.onSurfaceVariant),
        itemTrailingTextColor: .role(.onSurfaceVariant),
        itemTrailingIconColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      disabled: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemTrailingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemTrailingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    collapsedSelected: TanreiNavigationDrawerConditionTokens(
      enabled: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .alpha(of: .role(.onSecondaryContainer), amount: 0.16),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSecondaryContainer),
        itemSupportingTextColor: .role(.onSecondaryContainer),
        itemTrailingTextColor: .role(.onSecondaryContainer),
        itemTrailingIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSecondaryContainer),
        itemSupportingTextColor: .role(.onSecondaryContainer),
        itemTrailingTextColor: .role(.onSecondaryContainer),
        itemTrailingIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSecondaryContainer),
        itemSupportingTextColor: .role(.onSecondaryContainer),
        itemTrailingTextColor: .role(.onSecondaryContainer),
        itemTrailingIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSecondaryContainer),
        itemSupportingTextColor: .role(.onSecondaryContainer),
        itemTrailingTextColor: .role(.onSecondaryContainer),
        itemTrailingIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .alpha(of: .role(.onSecondaryContainer), amount: 0.16),
        itemIconIndicatorColor: .none,
        itemIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemTrailingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemTrailingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  densitys: TanreiNavigationDrawerDensitys(
    regular: TanreiNavigationDrawerDensityTokens(
      containerGap: 4,
      itemContainerHeight: 48,
      itemPaddingInline: 12,
      itemPaddingBlock: 4,
      itemNestIndent: 36,
      itemIconSize: 24,
      itemIconIndicatorWidth: 24,
      itemIconIndicatorHeight: 24,
      itemLabelTypescale: acmeTypescale.label,
      itemTrailingIconSize: 20,
      collapsedContainerWidth: 72,
      collapsedItemContainerWidth: 48,
      collapsedItemContainerPaddingBlock: 12,
      headingHeight: 36
    ),
    compact: TanreiNavigationDrawerDensityTokens(
      containerGap: 2,
      itemContainerHeight: 32,
      itemPaddingInline: 8,
      itemPaddingBlock: 2,
      itemNestIndent: 24,
      itemIconSize: 16,
      itemIconIndicatorWidth: 16,
      itemIconIndicatorHeight: 16,
      itemLabelTypescale: acmeTypescale.label,
      itemTrailingIconSize: 16,
      collapsedContainerWidth: 56,
      collapsedItemContainerWidth: 32,
      collapsedItemContainerPaddingBlock: 8,
      headingHeight: 28
    )
  ),
  hovered: TanreiNavigationDrawerStateTokens(
    opacity: 1
  ),
  focused: TanreiNavigationDrawerStateTokens(
    opacity: 1
  ),
  pressed: TanreiNavigationDrawerStateTokens(
    opacity: 1
  ),
  disabled: TanreiNavigationDrawerStateTokens(
    opacity: 1
  )
)

private let acmeNumberInputTokens = TanreiNumberInputTokens(
  motionRepeatDelay: 500,
  motionRepeatInterval: 100,
  motionRepeatIntervalFast: 50,
  stepperGap: 0,
  stepperInset: 4
)

private let acmeOneTimeCodeInputTokens = TanreiOneTimeCodeInputTokens(
  caretWidth: 1,
  containerGap: 6,
  containerHeight: 48,
  containerPaddingInline: 4,
  containerShape: 6,
  containerWidth: 40,
  inputTypescale: acmeTypescale.bodyLarge,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineWidth: 1,
  separatorThickness: 1,
  separatorWidth: 8,
  conditions: TanreiOneTimeCodeInputConditions(
    standard: TanreiOneTimeCodeInputConditionTokens(
      enabled: TanreiOneTimeCodeInputConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        outlineColor: .none,
        inputColor: .role(.onSurface),
        caretColor: .role(.primary),
        separatorColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        errorContainerColor: .role(.surfaceContainerHighest),
        errorOutlineColor: .role(.error),
        errorInputColor: .role(.onSurface),
        errorCaretColor: .role(.error),
        errorSeparatorColor: .role(.onSurfaceVariant),
        errorStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiOneTimeCodeInputConditionStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.06),
        outlineColor: .none,
        inputColor: .role(.onSurface),
        caretColor: .role(.primary),
        separatorColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        errorContainerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.06),
        errorOutlineColor: .role(.error),
        errorInputColor: .role(.onSurface),
        errorCaretColor: .role(.error),
        errorSeparatorColor: .role(.onSurfaceVariant),
        errorStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiOneTimeCodeInputConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        outlineColor: .role(.focusRing),
        inputColor: .role(.onSurface),
        caretColor: .role(.primary),
        separatorColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        errorContainerColor: .role(.surfaceContainerHighest),
        errorOutlineColor: .role(.error),
        errorInputColor: .role(.onSurface),
        errorCaretColor: .role(.error),
        errorSeparatorColor: .role(.onSurfaceVariant),
        errorStateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiOneTimeCodeInputConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        outlineColor: .none,
        inputColor: .alpha(of: .role(.onSurface), amount: 0.38),
        caretColor: .alpha(of: .role(.onSurface), amount: 0.38),
        separatorColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorContainerColor: .role(.surfaceContainerHighest),
        errorOutlineColor: .none,
        errorInputColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorCaretColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorSeparatorColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiOneTimeCodeInputStateTokens(
    outlineWidth: 1
  ),
  focused: TanreiOneTimeCodeInputStateTokens(
    outlineWidth: 2
  ),
  disabled: TanreiOneTimeCodeInputStateTokens(
    outlineWidth: 1
  )
)

private let acmePageHeaderTokens = TanreiPageHeaderTokens(
  actionsGap: 16,
  actionsItemGap: 8,
  breadcrumbsGap: 12,
  containerGap: 24,
  descriptionColor: .role(.onSurfaceVariant),
  descriptionMeasure: 36,
  dividerColor: .role(.outlineVariant),
  dividerThickness: 1,
  eyebrowColor: .role(.onSurfaceVariant),
  eyebrowGap: 4,
  eyebrowTypescale: acmeTypescale.eyebrow,
  metaColor: .role(.onSurfaceVariant),
  metaGap: 12,
  metaIconGap: 6,
  metaItemGap: 16,
  metaRowGap: 4,
  metaSeparatorColor: .role(.onSurfaceVariant),
  metaSeparatorSize: 4,
  metaTypescale: acmeTypescale.bodySmall,
  titleColor: .role(.onSurface),
  wideContainerWidth: 480,
  sizes: TanreiPageHeaderSizes(
    small: TanreiPageHeaderSizeTokens(
      titleTypescale: acmeTypescale.heading2,
      descriptionTypescale: acmeTypescale.body,
      descriptionGap: 4,
      containerPaddingBlockEnd: 8
    ),
    medium: TanreiPageHeaderSizeTokens(
      titleTypescale: acmeTypescale.heading1,
      descriptionTypescale: acmeTypescale.bodyLarge,
      descriptionGap: 8,
      containerPaddingBlockEnd: 16
    ),
    large: TanreiPageHeaderSizeTokens(
      titleTypescale: acmeTypescale.display,
      descriptionTypescale: acmeTypescale.bodyLarge,
      descriptionGap: 16,
      containerPaddingBlockEnd: 32
    )
  )
)

private let acmePaginationTokens = TanreiPaginationTokens(
  containerPaddingInline: 8,
  containerShape: 9999,
  countColor: .role(.onSurface),
  countPaddingInline: 8,
  countTypescale: acmeTypescale.body,
  ellipsisColor: .role(.onSurfaceVariant),
  gap: 4,
  iconSize: 20,
  labelTypescale: acmeTypescale.label,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  sizes: TanreiPaginationSizes(
    small: TanreiPaginationSizeTokens(
      containerHeight: 32
    ),
    medium: TanreiPaginationSizeTokens(
      containerHeight: 40
    )
  ),
  parts: TanreiPaginationParts(
    item: TanreiPaginationPartTokens(
      enabled: TanreiPaginationPartStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiPaginationPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiPaginationPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiPaginationPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiPaginationPartStateTokens(
        containerColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    current: TanreiPaginationPartTokens(
      enabled: TanreiPaginationPartStateTokens(
        containerColor: .role(.secondaryContainer),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiPaginationPartStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.06),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiPaginationPartStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiPaginationPartStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.2),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiPaginationPartStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiPaginationStateTokens(
    containerShape: 9999,
    opacity: 1
  ),
  focused: TanreiPaginationStateTokens(
    containerShape: 9999,
    opacity: 1
  ),
  pressed: TanreiPaginationStateTokens(
    containerShape: 9999,
    opacity: 1
  ),
  disabled: TanreiPaginationStateTokens(
    containerShape: 9999,
    opacity: 1
  )
)

private let acmePopoverTokens = TanreiPopoverTokens(
  actionsArrangement: 0,
  actionsGap: 16,
  actionsMarginBlockStart: 16,
  actionsVariant: 1,
  arrowHeight: 6,
  arrowInset: 8,
  arrowVisible: 0,
  arrowWidth: 12,
  closeButtonVariant: 4,
  containerColor: .role(.surfaceBright),
  containerElevation: acmeElevation.level2,
  containerGap: 12,
  containerMaxHeight: 480,
  containerMaxWidth: 400,
  containerMinWidth: 160,
  containerPaddingBlock: 16,
  containerPaddingInline: 16,
  containerShape: 8,
  contentColor: .role(.onSurface),
  dividerColor: .role(.outlineVariant),
  dividerVisibility: 0,
  dividerWidth: 1,
  headerGap: 8,
  headlineColor: .role(.onSurface),
  headlineTypescale: acmeTypescale.heading6,
  motionCloseDuration: 100,
  motionCloseEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  motionOpenDuration: 200,
  motionOpenEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  offset: 4,
  windowMargin: 8
)

private let acmePreviousNextLinksTokens = TanreiPreviousNextLinksTokens(
  containerGap: 12,
  containerMinWidth: 240,
  containerPadding: 16,
  containerShape: 8,
  gap: 16,
  iconSize: 20,
  labelGap: 2,
  labelTypescale: acmeTypescale.labelSmall,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineWidth: 1,
  titleTypescale: acmeTypescale.bodyLarge,
  parts: TanreiPreviousNextLinksParts(
    item: TanreiPreviousNextLinksPartTokens(
      enabled: TanreiPreviousNextLinksPartStateTokens(
        containerColor: .none,
        outlineColor: .role(.outlineVariant),
        labelColor: .role(.onSurfaceVariant),
        titleColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiPreviousNextLinksPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        outlineColor: .role(.outlineVariant),
        labelColor: .role(.onSurfaceVariant),
        titleColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiPreviousNextLinksPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        outlineColor: .role(.outlineVariant),
        labelColor: .role(.onSurfaceVariant),
        titleColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiPreviousNextLinksPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        outlineColor: .role(.outlineVariant),
        labelColor: .role(.onSurfaceVariant),
        titleColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      )
    )
  ),
  hovered: TanreiPreviousNextLinksStateTokens(
    containerShape: 8,
    opacity: 1
  ),
  focused: TanreiPreviousNextLinksStateTokens(
    containerShape: 8,
    opacity: 1
  ),
  pressed: TanreiPreviousNextLinksStateTokens(
    containerShape: 8,
    opacity: 1
  )
)

private let acmeProgressIndicatorTokens = TanreiProgressIndicatorTokens(
  indicatorColor: .role(.primary),
  motionCycleDuration: 1000,
  motionCycleEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionValueDuration: 300,
  motionValueEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  stopIndicatorSize: 0,
  trackColor: .role(.surfaceVariant),
  trackGap: 4,
  trackSeparation: 0,
  trackShape: 9999,
  sizes: TanreiProgressIndicatorSizes(
    small: TanreiProgressIndicatorSizeTokens(
      linearThickness: 2,
      circularSize: 16,
      circularThickness: 2
    ),
    medium: TanreiProgressIndicatorSizeTokens(
      linearThickness: 4,
      circularSize: 24,
      circularThickness: 2
    ),
    large: TanreiProgressIndicatorSizeTokens(
      linearThickness: 8,
      circularSize: 40,
      circularThickness: 2
    )
  )
)

private let acmeProseTokens = TanreiProseTokens(
  anchorGap: 8,
  blockGap: 16,
  heading1GapAfter: 16,
  heading1GapBefore: 32,
  heading2GapAfter: 16,
  heading2GapBefore: 32,
  heading3GapAfter: 12,
  heading3GapBefore: 24,
  heading4GapAfter: 8,
  heading4GapBefore: 24,
  heading5GapAfter: 8,
  heading5GapBefore: 24,
  heading6GapAfter: 8,
  heading6GapBefore: 24,
  itemGap: 4,
  japaneseLineHeight: 1.85,
  leadTypescale: acmeTypescale.bodyLarge,
  listIndent: 32,
  measure: 36,
  nestedGap: 8,
  quoteInset: 16,
  quoteLineColor: .role(.outlineVariant),
  quoteLineThickness: 2,
  ruleGap: 32,
  taskIconSize: 20,
  sizes: TanreiProseSizes(
    medium: TanreiProseSizeTokens(
      textTypescale: acmeTypescale.body,
      smallTypescale: acmeTypescale.bodySmall
    ),
    large: TanreiProseSizeTokens(
      textTypescale: acmeTypescale.bodyLarge,
      smallTypescale: acmeTypescale.body
    )
  )
)

private let acmeRadioButtonTokens = TanreiRadioButtonTokens(
  containerShape: 9999,
  containerSize: 40,
  fillInset: 0,
  fillOpacity: 0.08,
  labelGap: 4,
  labelTypescale: acmeTypescale.body,
  motionFeedbackDuration: 450,
  motionSelectionDuration: 150,
  motionSelectionEasing: TanreiCubicBezier(0.31, 0.94, 0.34, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  optionMinHeight: 48,
  ringSelectedWidthShare: 0.5,
  ringSize: 20,
  ringWidth: 2,
  conditions: TanreiRadioButtonConditions(
    unselected: TanreiRadioButtonConditionTokens(
      enabled: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .role(.outline),
        fillColor: .none,
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.outline)
      ),
      hovered: TanreiRadioButtonConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.outline), amount: 0.06),
        ringColor: .role(.outline),
        fillColor: .none,
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.outline)
      ),
      focused: TanreiRadioButtonConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.outline), amount: 0.12),
        ringColor: .role(.outline),
        fillColor: .none,
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.outline)
      ),
      pressed: TanreiRadioButtonConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.outline), amount: 0.2),
        ringColor: .role(.outline),
        fillColor: .none,
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.outline)
      ),
      disabled: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .alpha(of: .role(.onSurface), amount: 0.38),
        fillColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    selected: TanreiRadioButtonConditionTokens(
      enabled: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .role(.primary),
        fillColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      hovered: TanreiRadioButtonConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.06),
        ringColor: .role(.primary),
        fillColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      focused: TanreiRadioButtonConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
        ringColor: .role(.primary),
        fillColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      pressed: TanreiRadioButtonConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.2),
        ringColor: .role(.primary),
        fillColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      disabled: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .alpha(of: .role(.onSurface), amount: 0.38),
        fillColor: .alpha(of: .role(.onSurface), amount: 0.38),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    errorUnselected: TanreiRadioButtonConditionTokens(
      enabled: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .role(.error),
        fillColor: .none,
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      hovered: TanreiRadioButtonConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.06),
        ringColor: .role(.error),
        fillColor: .none,
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      focused: TanreiRadioButtonConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
        ringColor: .role(.error),
        fillColor: .none,
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      pressed: TanreiRadioButtonConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.2),
        ringColor: .role(.error),
        fillColor: .none,
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      disabled: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .alpha(of: .role(.onSurface), amount: 0.38),
        fillColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    errorSelected: TanreiRadioButtonConditionTokens(
      enabled: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .role(.error),
        fillColor: .role(.error),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      hovered: TanreiRadioButtonConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.06),
        ringColor: .role(.error),
        fillColor: .role(.error),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      focused: TanreiRadioButtonConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
        ringColor: .role(.error),
        fillColor: .role(.error),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      pressed: TanreiRadioButtonConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.2),
        ringColor: .role(.error),
        fillColor: .role(.error),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      disabled: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .alpha(of: .role(.onSurface), amount: 0.38),
        fillColor: .alpha(of: .role(.onSurface), amount: 0.38),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiRadioButtonStateTokens(
    containerShape: 9999,
    opacity: 1
  ),
  focused: TanreiRadioButtonStateTokens(
    containerShape: 9999,
    opacity: 1
  ),
  pressed: TanreiRadioButtonStateTokens(
    containerShape: 9999,
    opacity: 1
  ),
  disabled: TanreiRadioButtonStateTokens(
    containerShape: 9999,
    opacity: 1
  )
)

private let acmeSearchTokens = TanreiSearchTokens(
  containerButtonGap: 0,
  containerGap: 16,
  containerHeight: 56,
  containerPaddingInline: 16,
  containerPaddingInlineWithButton: 8,
  containerShape: 9999,
  dividerColor: .role(.outlineVariant),
  dividerThickness: 1,
  groupTitleColor: .role(.onSurfaceVariant),
  groupTitleTypescale: acmeTypescale.labelSmall,
  groupGap: 8,
  groupIndent: 24,
  headerHeight: 72,
  headerPaddingInline: 8,
  inputTypescale: acmeTypescale.bodyLarge,
  leadingIconSize: 24,
  motionCloseDuration: 100,
  motionCloseEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  motionFeedbackDuration: 450,
  motionOpenDuration: 200,
  motionOpenEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineWidth: 1,
  resultMarkColor: .role(.onSurface),
  resultMarkContainerColor: .role(.secondaryContainer),
  resultMarkEmphasis: 100,
  shortcutColor: .role(.onSurfaceVariant),
  shortcutTypescale: acmeTypescale.labelSmall,
  statusColor: .role(.onSurfaceVariant),
  statusErrorColor: .role(.error),
  statusTypescale: acmeTypescale.bodySmall,
  suggestionContainerGap: 16,
  suggestionContainerHeight: 56,
  suggestionContainerPaddingBlock: 8,
  suggestionContainerPaddingInline: 16,
  suggestionContainerShape: 6,
  suggestionHeadlineTypescale: acmeTypescale.body,
  suggestionLeadingIconSize: 24,
  suggestionSupportingTextTypescale: acmeTypescale.bodySmall,
  triggerContainerGap: 8,
  triggerContainerHeight: 40,
  triggerContainerPaddingInline: 12,
  triggerLabelTypescale: acmeTypescale.body,
  triggerLeadingIconSize: 20,
  viewContainerColor: .role(.surfaceBright),
  viewContainerElevation: acmeElevation.level2,
  viewContainerShape: 8,
  viewDialogMaxWidth: 640,
  viewDialogOffset: 64,
  viewOffset: 4,
  viewPaddingBlock: 4,
  viewPaddingInline: 4,
  viewScrimBlur: 0,
  viewScrimColor: .role(.scrim),
  viewViewportMargin: 8,
  conditions: TanreiSearchConditions(
    standard: TanreiSearchConditionTokens(
      enabled: TanreiSearchConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: acmeElevation.level0,
        outlineColor: .none,
        leadingIconColor: .role(.onSurfaceVariant),
        inputColor: .role(.onSurface),
        placeholderColor: .role(.onSurfaceVariant),
        caretColor: .role(.primary),
        stateLayerColor: .role(.onSurface),
        suggestionContainerColor: .none,
        suggestionLeadingIconColor: .role(.onSurfaceVariant),
        suggestionHeadlineColor: .role(.onSurface),
        suggestionSupportingTextColor: .role(.onSurfaceVariant),
        suggestionStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiSearchConditionStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.06),
        containerElevation: acmeElevation.level0,
        outlineColor: .none,
        leadingIconColor: .role(.onSurfaceVariant),
        inputColor: .role(.onSurface),
        placeholderColor: .role(.onSurfaceVariant),
        caretColor: .role(.primary),
        stateLayerColor: .role(.onSurface),
        suggestionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        suggestionLeadingIconColor: .role(.onSurfaceVariant),
        suggestionHeadlineColor: .role(.onSurface),
        suggestionSupportingTextColor: .role(.onSurfaceVariant),
        suggestionStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiSearchConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: acmeElevation.level0,
        outlineColor: .role(.focusRing),
        leadingIconColor: .role(.onSurfaceVariant),
        inputColor: .role(.onSurface),
        placeholderColor: .role(.onSurfaceVariant),
        caretColor: .role(.primary),
        stateLayerColor: .role(.onSurface),
        suggestionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        suggestionLeadingIconColor: .role(.onSurfaceVariant),
        suggestionHeadlineColor: .role(.onSurface),
        suggestionSupportingTextColor: .role(.onSurfaceVariant),
        suggestionStateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiSearchConditionStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.2),
        containerElevation: acmeElevation.level0,
        outlineColor: .none,
        leadingIconColor: .role(.onSurfaceVariant),
        inputColor: .role(.onSurface),
        placeholderColor: .role(.onSurfaceVariant),
        caretColor: .role(.primary),
        stateLayerColor: .role(.onSurface),
        suggestionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        suggestionLeadingIconColor: .role(.onSurfaceVariant),
        suggestionHeadlineColor: .role(.onSurface),
        suggestionSupportingTextColor: .role(.onSurfaceVariant),
        suggestionStateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiSearchConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: acmeElevation.level0,
        outlineColor: .none,
        leadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        inputColor: .alpha(of: .role(.onSurface), amount: 0.38),
        placeholderColor: .alpha(of: .role(.onSurface), amount: 0.38),
        caretColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        suggestionContainerColor: .none,
        suggestionLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        suggestionHeadlineColor: .alpha(of: .role(.onSurface), amount: 0.38),
        suggestionSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        suggestionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiSearchStateTokens(
    opacity: 1,
    outlineWidth: 1
  ),
  focused: TanreiSearchStateTokens(
    opacity: 1,
    outlineWidth: 2
  ),
  pressed: TanreiSearchStateTokens(
    opacity: 1,
    outlineWidth: 1
  ),
  disabled: TanreiSearchStateTokens(
    opacity: 1,
    outlineWidth: 1
  )
)

private let acmeSegmentedButtonTokens = TanreiSegmentedButtonTokens(
  checkWeight: 400,
  containerShape: 0,
  dividerColor: .role(.outline),
  dividerWidth: 1,
  motionFeedbackDuration: 450,
  motionSelectionDuration: 150,
  motionSelectionEasing: TanreiCubicBezier(0.31, 0.94, 0.34, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineColor: .role(.outline),
  outlineWidth: 1,
  setColor: .none,
  setPadding: 0,
  setShape: 6,
  sizes: TanreiSegmentedButtonSizes(
    small: TanreiSegmentedButtonSizeTokens(
      containerHeight: 32,
      containerPaddingInline: 12,
      containerPaddingBlock: 6,
      containerGap: 8,
      labelTypescale: acmeTypescale.label,
      iconSize: 16,
      checkSize: 16
    ),
    medium: TanreiSegmentedButtonSizeTokens(
      containerHeight: 36,
      containerPaddingInline: 14,
      containerPaddingBlock: 6,
      containerGap: 8,
      labelTypescale: acmeTypescale.label,
      iconSize: 16,
      checkSize: 16
    ),
    large: TanreiSegmentedButtonSizeTokens(
      containerHeight: 40,
      containerPaddingInline: 16,
      containerPaddingBlock: 6,
      containerGap: 8,
      labelTypescale: acmeTypescale.label,
      iconSize: 16,
      checkSize: 16
    )
  ),
  conditions: TanreiSegmentedButtonConditions(
    unselected: TanreiSegmentedButtonConditionTokens(
      enabled: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .none,
        containerElevation: acmeElevation.level0,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        containerElevation: acmeElevation.level0,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        containerElevation: acmeElevation.level0,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        containerElevation: acmeElevation.level0,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .none,
        containerElevation: acmeElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    selected: TanreiSegmentedButtonConditionTokens(
      enabled: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .role(.secondaryContainer),
        containerElevation: acmeElevation.level0,
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.06),
        containerElevation: acmeElevation.level0,
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        containerElevation: acmeElevation.level0,
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.2),
        containerElevation: acmeElevation.level0,
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: acmeElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiSegmentedButtonStateTokens(
    containerShape: 0,
    opacity: 1
  ),
  focused: TanreiSegmentedButtonStateTokens(
    containerShape: 0,
    opacity: 1
  ),
  pressed: TanreiSegmentedButtonStateTokens(
    containerShape: 0,
    opacity: 1
  ),
  disabled: TanreiSegmentedButtonStateTokens(
    containerShape: 0,
    opacity: 1
  )
)

private let acmeSelectTokens = TanreiSelectTokens(
  dividerColor: .role(.outlineVariant),
  dividerSpace: 4,
  dividerThickness: 1,
  groupTitleColor: .role(.onSurfaceVariant),
  groupTitlePaddingInline: 12,
  groupTitleTypescale: acmeTypescale.labelSmall,
  groupGap: 16,
  listColor: .role(.surfaceBright),
  listElevation: acmeElevation.level2,
  listMaxHeight: 320,
  listMaxWidth: 320,
  listMinWidth: 160,
  listOffset: 4,
  listPaddingBlock: 4,
  listPaddingInline: 4,
  listShape: 8,
  listViewportMargin: 8,
  motionCloseDuration: 100,
  motionCloseEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  motionFeedbackDuration: 450,
  motionOpenDuration: 200,
  motionOpenEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  optionGap: 12,
  optionHeight: 48,
  optionLabelTypescale: acmeTypescale.label,
  optionLeadingIconSize: 24,
  optionMarkSize: 24,
  optionPaddingBlock: 8,
  optionPaddingInline: 12,
  optionShape: 6,
  optionSupportingTextTypescale: acmeTypescale.bodySmall,
  separation: 0,
  variants: TanreiSelectVariants(
    stacked: TanreiSelectVariantTokens(
      enabled: TanreiSelectVariantStateTokens(
        optionContainerColor: .none,
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .alpha(of: .role(.onSecondaryContainer), amount: 0), .lightMedium: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), .lightHigh: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), .dark: .alpha(of: .role(.onSecondaryContainer), amount: 0), .darkMedium: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), .darkHigh: .alpha(of: .role(.onSecondaryContainer), amount: 0.16)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiSelectVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.06), .lightMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06), .lightHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06), .dark: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.06), .darkMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06), .darkHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiSelectVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.12), .lightMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12), .lightHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12), .dark: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.12), .darkMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12), .darkHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiSelectVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.2), .lightMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2), .lightHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2), .dark: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.2), .darkMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2), .darkHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiSelectVariantStateTokens(
        optionContainerColor: .none,
        optionLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionContainerColor: .scheme(by: [.light: .alpha(of: .role(.onSurface), amount: 0), .lightMedium: .alpha(of: .role(.onSurface), amount: 0.12), .lightHigh: .alpha(of: .role(.onSurface), amount: 0.12), .dark: .alpha(of: .role(.onSurface), amount: 0), .darkMedium: .alpha(of: .role(.onSurface), amount: 0.12), .darkHigh: .alpha(of: .role(.onSurface), amount: 0.12)]),
        selectedOptionLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionMarkColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    filled: TanreiSelectVariantTokens(
      enabled: TanreiSelectVariantStateTokens(
        optionContainerColor: .none,
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .alpha(of: .role(.onSecondaryContainer), amount: 0), .lightMedium: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), .lightHigh: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), .dark: .alpha(of: .role(.onSecondaryContainer), amount: 0), .darkMedium: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), .darkHigh: .alpha(of: .role(.onSecondaryContainer), amount: 0.16)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiSelectVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.06), .lightMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06), .lightHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06), .dark: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.06), .darkMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06), .darkHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiSelectVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.12), .lightMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12), .lightHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12), .dark: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.12), .darkMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12), .darkHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiSelectVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.2), .lightMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2), .lightHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2), .dark: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.2), .darkMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2), .darkHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiSelectVariantStateTokens(
        optionContainerColor: .none,
        optionLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionContainerColor: .scheme(by: [.light: .alpha(of: .role(.onSurface), amount: 0), .lightMedium: .alpha(of: .role(.onSurface), amount: 0.12), .lightHigh: .alpha(of: .role(.onSurface), amount: 0.12), .dark: .alpha(of: .role(.onSurface), amount: 0), .darkMedium: .alpha(of: .role(.onSurface), amount: 0.12), .darkHigh: .alpha(of: .role(.onSurface), amount: 0.12)]),
        selectedOptionLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionMarkColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    outlined: TanreiSelectVariantTokens(
      enabled: TanreiSelectVariantStateTokens(
        optionContainerColor: .none,
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .alpha(of: .role(.onSecondaryContainer), amount: 0), .lightMedium: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), .lightHigh: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), .dark: .alpha(of: .role(.onSecondaryContainer), amount: 0), .darkMedium: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), .darkHigh: .alpha(of: .role(.onSecondaryContainer), amount: 0.16)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiSelectVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.06), .lightMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06), .lightHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06), .dark: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.06), .darkMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06), .darkHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiSelectVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.12), .lightMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12), .lightHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12), .dark: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.12), .darkMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12), .darkHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiSelectVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .scheme(by: [.light: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.2), .lightMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2), .lightHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2), .dark: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0), with: .role(.onSecondaryContainer), amount: 0.2), .darkMedium: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2), .darkHigh: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2)]),
        selectedOptionLabelColor: .role(.onSecondaryContainer),
        selectedOptionSupportingTextColor: .role(.onSecondaryContainer),
        selectedOptionLeadingIconColor: .role(.onSecondaryContainer),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiSelectVariantStateTokens(
        optionContainerColor: .none,
        optionLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionContainerColor: .scheme(by: [.light: .alpha(of: .role(.onSurface), amount: 0), .lightMedium: .alpha(of: .role(.onSurface), amount: 0.12), .lightHigh: .alpha(of: .role(.onSurface), amount: 0.12), .dark: .alpha(of: .role(.onSurface), amount: 0), .darkMedium: .alpha(of: .role(.onSurface), amount: 0.12), .darkHigh: .alpha(of: .role(.onSurface), amount: 0.12)]),
        selectedOptionLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionMarkColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiSelectStateTokens(
    opacity: 1
  ),
  focused: TanreiSelectStateTokens(
    opacity: 1
  ),
  pressed: TanreiSelectStateTokens(
    opacity: 1
  ),
  disabled: TanreiSelectStateTokens(
    opacity: 1
  )
)

private let acmeSideSheetTokens = TanreiSideSheetTokens(
  actionsArrangement: 0,
  actionsGap: 16,
  actionsPaddingBlock: 16,
  actionsVariant: 1,
  closeButtonVariant: 1,
  containerPaddingBlock: 24,
  containerPaddingInline: 24,
  containerWidth: 320,
  contentColor: .role(.onSurface),
  dividerColor: .role(.outlineVariant),
  dividerVisibility: 0,
  dividerWidth: 1,
  headerGap: 8,
  headerHeight: 64,
  headerPaddingInlineEnd: 12,
  headlineColor: .role(.onSurface),
  headlineTypescale: acmeTypescale.heading5,
  motionEnterDuration: 300,
  motionEnterEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionExitDuration: 200,
  motionExitEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  outlineWidth: 1,
  scrimBlur: 0,
  scrimColor: .role(.scrim),
  variants: TanreiSideSheetVariants(
    standard: TanreiSideSheetVariantTokens(
      containerColor: .role(.surface),
      containerElevation: acmeElevation.level0,
      containerShape: 0,
      outlineColor: .role(.outlineVariant)
    ),
    modal: TanreiSideSheetVariantTokens(
      containerColor: .role(.surfaceContainerLow),
      containerElevation: acmeElevation.level2,
      containerShape: 12,
      outlineColor: .none
    )
  )
)

private let acmeSkeletonTokens = TanreiSkeletonTokens(
  containerGap: 8,
  motionAnimation: 0,
  motionDimDuration: 1000,
  motionDimEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionShowDelay: 300,
  placeholderColor: .role(.surfaceVariant),
  placeholderDimOpacity: 0.5,
  placeholderLastLineInlineSize: 0.6,
  placeholderShapeBlock: 8,
  placeholderShapeCircle: 9999,
  placeholderShapeText: 3
)

private let acmeSliderTokens = TanreiSliderTokens(
  containerShape: 9999,
  containerSize: 40,
  handleOutlineWidth: 3,
  handleShape: 9999,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionValueDuration: 350,
  motionValueEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  trackGap: 0,
  valueIndicatorContainerColor: .role(.inverseSurface),
  valueIndicatorContainerHeight: 24,
  valueIndicatorContainerPaddingInline: 8,
  valueIndicatorContainerShape: 6,
  valueIndicatorLabelColor: .role(.inverseOnSurface),
  valueIndicatorLabelTypescale: acmeTypescale.labelSmall,
  valueIndicatorOffset: 8,
  sizes: TanreiSliderSizes(
    small: TanreiSliderSizeTokens(
      trackThickness: 4,
      trackShape: 9999,
      handleHeight: 20,
      stopIndicatorSize: 2
    ),
    medium: TanreiSliderSizeTokens(
      trackThickness: 6,
      trackShape: 9999,
      handleHeight: 20,
      stopIndicatorSize: 3
    ),
    large: TanreiSliderSizeTokens(
      trackThickness: 8,
      trackShape: 9999,
      handleHeight: 20,
      stopIndicatorSize: 4
    )
  ),
  conditions: TanreiSliderConditions(
    standard: TanreiSliderConditionTokens(
      enabled: TanreiSliderConditionStateTokens(
        containerColor: .none,
        stateLayerColor: .role(.primary),
        handleColor: .role(.surface),
        handleWidth: 20,
        handleElevation: acmeElevation.level0,
        handleOutlineColor: .role(.primary),
        trackColor: .role(.surfaceVariant),
        activeTrackColor: .role(.primary),
        stopIndicatorColor: .role(.onSurfaceVariant),
        activeStopIndicatorColor: .role(.onPrimary)
      ),
      hovered: TanreiSliderConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.06),
        stateLayerColor: .role(.primary),
        handleColor: .role(.surface),
        handleWidth: 20,
        handleElevation: acmeElevation.level0,
        handleOutlineColor: .role(.primary),
        trackColor: .role(.surfaceVariant),
        activeTrackColor: .role(.primary),
        stopIndicatorColor: .role(.onSurfaceVariant),
        activeStopIndicatorColor: .role(.onPrimary)
      ),
      focused: TanreiSliderConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
        stateLayerColor: .role(.primary),
        handleColor: .role(.surface),
        handleWidth: 20,
        handleElevation: acmeElevation.level0,
        handleOutlineColor: .role(.primary),
        trackColor: .role(.surfaceVariant),
        activeTrackColor: .role(.primary),
        stopIndicatorColor: .role(.onSurfaceVariant),
        activeStopIndicatorColor: .role(.onPrimary)
      ),
      pressed: TanreiSliderConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.2),
        stateLayerColor: .role(.primary),
        handleColor: .role(.surface),
        handleWidth: 20,
        handleElevation: acmeElevation.level0,
        handleOutlineColor: .role(.primary),
        trackColor: .role(.surfaceVariant),
        activeTrackColor: .role(.primary),
        stopIndicatorColor: .role(.onSurfaceVariant),
        activeStopIndicatorColor: .role(.onPrimary)
      ),
      disabled: TanreiSliderConditionStateTokens(
        containerColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        handleColor: .role(.surface),
        handleWidth: 20,
        handleElevation: acmeElevation.level0,
        handleOutlineColor: .alpha(of: .role(.onSurface), amount: 0.38),
        trackColor: .alpha(of: .role(.onSurface), amount: 0.12),
        activeTrackColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stopIndicatorColor: .alpha(of: .role(.onSurface), amount: 0.38),
        activeStopIndicatorColor: .role(.surface)
      )
    )
  ),
  hovered: TanreiSliderStateTokens(
    opacity: 1
  ),
  focused: TanreiSliderStateTokens(
    opacity: 1
  ),
  pressed: TanreiSliderStateTokens(
    opacity: 1
  ),
  disabled: TanreiSliderStateTokens(
    opacity: 1
  )
)

private let acmeSnackbarTokens = TanreiSnackbarTokens(
  actionTonalLayerOpacity: 0.12,
  containerColor: .role(.surfaceBright),
  containerElevation: acmeElevation.level3,
  containerGap: 8,
  containerInverse: 0,
  containerMargin: 16,
  containerMaxWidth: 560,
  containerMinHeight: 48,
  containerMinWidth: 288,
  containerPaddingBlock: 12,
  containerPaddingInlineEnd: 16,
  containerPaddingInlineEndWithControls: 8,
  containerPaddingInlineStart: 16,
  containerShape: 8,
  controlsGap: 4,
  controlsHeight: 36,
  controlsIconSize: 24,
  controlsLabelTypescale: acmeTypescale.label,
  controlsPaddingInline: 14,
  controlsShape: 9999,
  errorContainerColor: .role(.errorContainer),
  errorFocusRingColor: .role(.onErrorContainer),
  errorIconColor: .role(.error),
  errorOutlineColor: .role(.error),
  errorSupportingTextColor: .role(.onErrorContainer),
  errorTitleColor: .role(.onErrorContainer),
  focusRingColor: .role(.focusRing),
  iconGap: 12,
  iconOpacity: 0.85,
  iconSize: 24,
  infoContainerColor: .role(.infoContainer),
  infoFocusRingColor: .role(.onInfoContainer),
  infoIconColor: .role(.info),
  infoOutlineColor: .role(.info),
  infoSupportingTextColor: .role(.onInfoContainer),
  infoTitleColor: .role(.onInfoContainer),
  inverseErrorContainerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.2118, green: 0.1137, blue: 0.1059, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.2118, green: 0.1137, blue: 0.1059, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.2118, green: 0.1137, blue: 0.1059, opacity: 1)), .dark: .literal(TanreiColorValue(red: 1, green: 0.9294, blue: 0.9216, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 1, green: 0.9294, blue: 0.9216, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 1, green: 0.9294, blue: 0.9216, opacity: 1))]),
  inverseErrorFocusRingColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1))]),
  inverseErrorIconColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.5725, blue: 0.549, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.702, blue: 0.6824, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.8118, blue: 0.7961, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.8039, green: 0.149, blue: 0.1843, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.7059, green: 0.0549, blue: 0.1255, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.5765, green: 0, blue: 0.0824, opacity: 1))]),
  inverseErrorOutlineColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.5725, blue: 0.549, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.702, blue: 0.6824, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.8118, blue: 0.7961, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.8039, green: 0.149, blue: 0.1843, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.7059, green: 0.0549, blue: 0.1255, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.5765, green: 0, blue: 0.0824, opacity: 1))]),
  inverseErrorSupportingTextColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1))]),
  inverseErrorTitleColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1))]),
  inverseInfoContainerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.1098, green: 0.1373, blue: 0.2039, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.1098, green: 0.1373, blue: 0.2039, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.1098, green: 0.1373, blue: 0.2039, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.9294, green: 0.9412, blue: 1, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.9294, green: 0.9412, blue: 1, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.9294, green: 0.9412, blue: 1, opacity: 1))]),
  inverseInfoFocusRingColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1))]),
  inverseInfoIconColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.5569, green: 0.6863, blue: 1, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.6902, green: 0.7765, blue: 1, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.8039, green: 0.851, blue: 1, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1882, green: 0.4, blue: 0.7961, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0863, green: 0.3333, blue: 0.7255, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0, green: 0.2588, blue: 0.6078, opacity: 1))]),
  inverseInfoOutlineColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.5569, green: 0.6863, blue: 1, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.6902, green: 0.7765, blue: 1, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.8039, green: 0.851, blue: 1, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1882, green: 0.4, blue: 0.7961, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0863, green: 0.3333, blue: 0.7255, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0, green: 0.2588, blue: 0.6078, opacity: 1))]),
  inverseInfoSupportingTextColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1))]),
  inverseInfoTitleColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1))]),
  inverseSuccessContainerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.0902, green: 0.1529, blue: 0.0941, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.0902, green: 0.1529, blue: 0.0941, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.0902, green: 0.1529, blue: 0.0941, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.8863, green: 0.9647, blue: 0.8745, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.8863, green: 0.9647, blue: 0.8745, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.8863, green: 0.9647, blue: 0.8745, opacity: 1))]),
  inverseSuccessFocusRingColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1))]),
  inverseSuccessIconColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.3843, green: 0.7725, blue: 0.4471, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.4706, green: 0.8627, blue: 0.5255, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.5451, green: 0.9412, blue: 0.5922, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.0275, green: 0.4824, blue: 0.1961, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0, green: 0.4078, blue: 0.1569, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0, green: 0.3255, blue: 0.1176, opacity: 1))]),
  inverseSuccessOutlineColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.3843, green: 0.7725, blue: 0.4471, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.4706, green: 0.8627, blue: 0.5255, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.5451, green: 0.9412, blue: 0.5922, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.0275, green: 0.4824, blue: 0.1961, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0, green: 0.4078, blue: 0.1569, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0, green: 0.3255, blue: 0.1176, opacity: 1))]),
  inverseSuccessSupportingTextColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1))]),
  inverseSuccessTitleColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1))]),
  inverseWarningContainerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.1961, green: 0.1255, blue: 0.0471, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.1961, green: 0.1255, blue: 0.0471, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.1961, green: 0.1255, blue: 0.0471, opacity: 1)), .dark: .literal(TanreiColorValue(red: 1, green: 0.9333, blue: 0.8784, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 1, green: 0.9333, blue: 0.8784, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 1, green: 0.9333, blue: 0.8784, opacity: 1))]),
  inverseWarningFocusRingColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1))]),
  inverseWarningIconColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.9529, green: 0.6196, blue: 0.2275, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.7216, blue: 0.4275, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.8235, blue: 0.651, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.6078, green: 0.3608, blue: 0, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.5137, green: 0.302, blue: 0, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.4078, green: 0.2353, blue: 0, opacity: 1))]),
  inverseWarningOutlineColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.9529, green: 0.6196, blue: 0.2275, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.7216, blue: 0.4275, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.8235, blue: 0.651, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.6078, green: 0.3608, blue: 0, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.5137, green: 0.302, blue: 0, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.4078, green: 0.2353, blue: 0, opacity: 1))]),
  inverseWarningSupportingTextColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1))]),
  inverseWarningTitleColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1))]),
  inverseContainerColor: .role(.inverseSurface),
  inverseFocusRingColor: .role(.inverseOnSurface),
  inverseSupportingTextColor: .role(.inverseOnSurface),
  inverseTitleColor: .role(.inverseOnSurface),
  motionEnterDuration: 250,
  motionEnterEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionExitDuration: 150,
  motionExitEasing: TanreiCubicBezier(0.3, 0, 1, 1),
  motionExpandDuration: 300,
  motionExpandEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineOpacity: 0.4,
  outlineWidth: 1,
  successContainerColor: .role(.successContainer),
  successFocusRingColor: .role(.onSuccessContainer),
  successIconColor: .role(.success),
  successOutlineColor: .role(.success),
  successSupportingTextColor: .role(.onSuccessContainer),
  successTitleColor: .role(.onSuccessContainer),
  supportingTextColor: .role(.onSurface),
  supportingTextMaxLines: 3,
  supportingTextTypescale: acmeTypescale.body,
  supportingTextUnderTitleOpacity: 0.8,
  timeoutLong: 10000,
  timeoutShort: 4000,
  titleColor: .role(.onSurface),
  titleGap: 4,
  titleMaxLines: 3,
  titleTypescale: acmeTypescale.heading6,
  warningContainerColor: .role(.warningContainer),
  warningFocusRingColor: .role(.onWarningContainer),
  warningIconColor: .role(.warning),
  warningOutlineColor: .role(.warning),
  warningSupportingTextColor: .role(.onWarningContainer),
  warningTitleColor: .role(.onWarningContainer),
  controls: TanreiSnackbarControls(
    action: TanreiSnackbarControlTokens(
      enabled: TanreiSnackbarControlStateTokens(
        containerColor: .role(.surfaceBright),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface),
        infoContainerColor: .role(.infoContainer),
        infoContentColor: .role(.onInfoContainer),
        infoStateLayerColor: .role(.onInfoContainer),
        warningContainerColor: .role(.warningContainer),
        warningContentColor: .role(.onWarningContainer),
        warningStateLayerColor: .role(.onWarningContainer),
        errorContainerColor: .role(.errorContainer),
        errorContentColor: .role(.onErrorContainer),
        errorStateLayerColor: .role(.onErrorContainer),
        successContainerColor: .role(.successContainer),
        successContentColor: .role(.onSuccessContainer),
        successStateLayerColor: .role(.onSuccessContainer),
        inverseContainerColor: .role(.inverseSurface),
        inverseContentColor: .role(.inverseOnSurface),
        inverseStateLayerColor: .role(.inverseOnSurface),
        inverseInfoContainerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.1098, green: 0.1373, blue: 0.2039, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.1098, green: 0.1373, blue: 0.2039, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.1098, green: 0.1373, blue: 0.2039, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.9294, green: 0.9412, blue: 1, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.9294, green: 0.9412, blue: 1, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.9294, green: 0.9412, blue: 1, opacity: 1))]),
        inverseInfoContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1))]),
        inverseInfoStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1))]),
        inverseWarningContainerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.1961, green: 0.1255, blue: 0.0471, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.1961, green: 0.1255, blue: 0.0471, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.1961, green: 0.1255, blue: 0.0471, opacity: 1)), .dark: .literal(TanreiColorValue(red: 1, green: 0.9333, blue: 0.8784, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 1, green: 0.9333, blue: 0.8784, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 1, green: 0.9333, blue: 0.8784, opacity: 1))]),
        inverseWarningContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1))]),
        inverseWarningStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1))]),
        inverseErrorContainerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.2118, green: 0.1137, blue: 0.1059, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.2118, green: 0.1137, blue: 0.1059, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.2118, green: 0.1137, blue: 0.1059, opacity: 1)), .dark: .literal(TanreiColorValue(red: 1, green: 0.9294, blue: 0.9216, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 1, green: 0.9294, blue: 0.9216, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 1, green: 0.9294, blue: 0.9216, opacity: 1))]),
        inverseErrorContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1))]),
        inverseErrorStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1))]),
        inverseSuccessContainerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.0902, green: 0.1529, blue: 0.0941, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.0902, green: 0.1529, blue: 0.0941, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.0902, green: 0.1529, blue: 0.0941, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.8863, green: 0.9647, blue: 0.8745, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.8863, green: 0.9647, blue: 0.8745, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.8863, green: 0.9647, blue: 0.8745, opacity: 1))]),
        inverseSuccessContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1))]),
        inverseSuccessStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1))])
      ),
      hovered: TanreiSnackbarControlStateTokens(
        containerColor: .mix(base: .role(.surfaceBright), with: .role(.onSurface), amount: 0.06),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface),
        infoContainerColor: .mix(base: .role(.infoContainer), with: .role(.onInfoContainer), amount: 0.06),
        infoContentColor: .role(.onInfoContainer),
        infoStateLayerColor: .role(.onInfoContainer),
        warningContainerColor: .mix(base: .role(.warningContainer), with: .role(.onWarningContainer), amount: 0.06),
        warningContentColor: .role(.onWarningContainer),
        warningStateLayerColor: .role(.onWarningContainer),
        errorContainerColor: .mix(base: .role(.errorContainer), with: .role(.onErrorContainer), amount: 0.06),
        errorContentColor: .role(.onErrorContainer),
        errorStateLayerColor: .role(.onErrorContainer),
        successContainerColor: .mix(base: .role(.successContainer), with: .role(.onSuccessContainer), amount: 0.06),
        successContentColor: .role(.onSuccessContainer),
        successStateLayerColor: .role(.onSuccessContainer),
        inverseContainerColor: .mix(base: .role(.inverseSurface), with: .role(.inverseOnSurface), amount: 0.06),
        inverseContentColor: .role(.inverseOnSurface),
        inverseStateLayerColor: .role(.inverseOnSurface),
        inverseInfoContainerColor: .scheme(by: [.light: .mix(base: .literal(TanreiColorValue(red: 0.1098, green: 0.1373, blue: 0.2039, opacity: 1)), with: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), amount: 0.06), .lightMedium: .mix(base: .literal(TanreiColorValue(red: 0.1098, green: 0.1373, blue: 0.2039, opacity: 1)), with: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), amount: 0.06), .lightHigh: .mix(base: .literal(TanreiColorValue(red: 0.1098, green: 0.1373, blue: 0.2039, opacity: 1)), with: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), amount: 0.06), .dark: .mix(base: .literal(TanreiColorValue(red: 0.9294, green: 0.9412, blue: 1, opacity: 1)), with: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), amount: 0.06), .darkMedium: .mix(base: .literal(TanreiColorValue(red: 0.9294, green: 0.9412, blue: 1, opacity: 1)), with: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), amount: 0.06), .darkHigh: .mix(base: .literal(TanreiColorValue(red: 0.9294, green: 0.9412, blue: 1, opacity: 1)), with: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1)), amount: 0.06)]),
        inverseInfoContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1))]),
        inverseInfoStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1))]),
        inverseWarningContainerColor: .scheme(by: [.light: .mix(base: .literal(TanreiColorValue(red: 0.1961, green: 0.1255, blue: 0.0471, opacity: 1)), with: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), amount: 0.06), .lightMedium: .mix(base: .literal(TanreiColorValue(red: 0.1961, green: 0.1255, blue: 0.0471, opacity: 1)), with: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), amount: 0.06), .lightHigh: .mix(base: .literal(TanreiColorValue(red: 0.1961, green: 0.1255, blue: 0.0471, opacity: 1)), with: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), amount: 0.06), .dark: .mix(base: .literal(TanreiColorValue(red: 1, green: 0.9333, blue: 0.8784, opacity: 1)), with: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), amount: 0.06), .darkMedium: .mix(base: .literal(TanreiColorValue(red: 1, green: 0.9333, blue: 0.8784, opacity: 1)), with: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), amount: 0.06), .darkHigh: .mix(base: .literal(TanreiColorValue(red: 1, green: 0.9333, blue: 0.8784, opacity: 1)), with: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1)), amount: 0.06)]),
        inverseWarningContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1))]),
        inverseWarningStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1))]),
        inverseErrorContainerColor: .scheme(by: [.light: .mix(base: .literal(TanreiColorValue(red: 0.2118, green: 0.1137, blue: 0.1059, opacity: 1)), with: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), amount: 0.06), .lightMedium: .mix(base: .literal(TanreiColorValue(red: 0.2118, green: 0.1137, blue: 0.1059, opacity: 1)), with: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), amount: 0.06), .lightHigh: .mix(base: .literal(TanreiColorValue(red: 0.2118, green: 0.1137, blue: 0.1059, opacity: 1)), with: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), amount: 0.06), .dark: .mix(base: .literal(TanreiColorValue(red: 1, green: 0.9294, blue: 0.9216, opacity: 1)), with: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), amount: 0.06), .darkMedium: .mix(base: .literal(TanreiColorValue(red: 1, green: 0.9294, blue: 0.9216, opacity: 1)), with: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), amount: 0.06), .darkHigh: .mix(base: .literal(TanreiColorValue(red: 1, green: 0.9294, blue: 0.9216, opacity: 1)), with: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1)), amount: 0.06)]),
        inverseErrorContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1))]),
        inverseErrorStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1))]),
        inverseSuccessContainerColor: .scheme(by: [.light: .mix(base: .literal(TanreiColorValue(red: 0.0902, green: 0.1529, blue: 0.0941, opacity: 1)), with: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), amount: 0.06), .lightMedium: .mix(base: .literal(TanreiColorValue(red: 0.0902, green: 0.1529, blue: 0.0941, opacity: 1)), with: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), amount: 0.06), .lightHigh: .mix(base: .literal(TanreiColorValue(red: 0.0902, green: 0.1529, blue: 0.0941, opacity: 1)), with: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), amount: 0.06), .dark: .mix(base: .literal(TanreiColorValue(red: 0.8863, green: 0.9647, blue: 0.8745, opacity: 1)), with: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), amount: 0.06), .darkMedium: .mix(base: .literal(TanreiColorValue(red: 0.8863, green: 0.9647, blue: 0.8745, opacity: 1)), with: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), amount: 0.06), .darkHigh: .mix(base: .literal(TanreiColorValue(red: 0.8863, green: 0.9647, blue: 0.8745, opacity: 1)), with: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1)), amount: 0.06)]),
        inverseSuccessContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1))]),
        inverseSuccessStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1))])
      ),
      focused: TanreiSnackbarControlStateTokens(
        containerColor: .mix(base: .role(.surfaceBright), with: .role(.onSurface), amount: 0.12),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface),
        infoContainerColor: .mix(base: .role(.infoContainer), with: .role(.onInfoContainer), amount: 0.12),
        infoContentColor: .role(.onInfoContainer),
        infoStateLayerColor: .role(.onInfoContainer),
        warningContainerColor: .mix(base: .role(.warningContainer), with: .role(.onWarningContainer), amount: 0.12),
        warningContentColor: .role(.onWarningContainer),
        warningStateLayerColor: .role(.onWarningContainer),
        errorContainerColor: .mix(base: .role(.errorContainer), with: .role(.onErrorContainer), amount: 0.12),
        errorContentColor: .role(.onErrorContainer),
        errorStateLayerColor: .role(.onErrorContainer),
        successContainerColor: .mix(base: .role(.successContainer), with: .role(.onSuccessContainer), amount: 0.12),
        successContentColor: .role(.onSuccessContainer),
        successStateLayerColor: .role(.onSuccessContainer),
        inverseContainerColor: .mix(base: .role(.inverseSurface), with: .role(.inverseOnSurface), amount: 0.12),
        inverseContentColor: .role(.inverseOnSurface),
        inverseStateLayerColor: .role(.inverseOnSurface),
        inverseInfoContainerColor: .scheme(by: [.light: .mix(base: .literal(TanreiColorValue(red: 0.1098, green: 0.1373, blue: 0.2039, opacity: 1)), with: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), amount: 0.12), .lightMedium: .mix(base: .literal(TanreiColorValue(red: 0.1098, green: 0.1373, blue: 0.2039, opacity: 1)), with: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), amount: 0.12), .lightHigh: .mix(base: .literal(TanreiColorValue(red: 0.1098, green: 0.1373, blue: 0.2039, opacity: 1)), with: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), amount: 0.12), .dark: .mix(base: .literal(TanreiColorValue(red: 0.9294, green: 0.9412, blue: 1, opacity: 1)), with: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), amount: 0.12), .darkMedium: .mix(base: .literal(TanreiColorValue(red: 0.9294, green: 0.9412, blue: 1, opacity: 1)), with: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), amount: 0.12), .darkHigh: .mix(base: .literal(TanreiColorValue(red: 0.9294, green: 0.9412, blue: 1, opacity: 1)), with: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1)), amount: 0.12)]),
        inverseInfoContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1))]),
        inverseInfoStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1))]),
        inverseWarningContainerColor: .scheme(by: [.light: .mix(base: .literal(TanreiColorValue(red: 0.1961, green: 0.1255, blue: 0.0471, opacity: 1)), with: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), amount: 0.12), .lightMedium: .mix(base: .literal(TanreiColorValue(red: 0.1961, green: 0.1255, blue: 0.0471, opacity: 1)), with: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), amount: 0.12), .lightHigh: .mix(base: .literal(TanreiColorValue(red: 0.1961, green: 0.1255, blue: 0.0471, opacity: 1)), with: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), amount: 0.12), .dark: .mix(base: .literal(TanreiColorValue(red: 1, green: 0.9333, blue: 0.8784, opacity: 1)), with: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), amount: 0.12), .darkMedium: .mix(base: .literal(TanreiColorValue(red: 1, green: 0.9333, blue: 0.8784, opacity: 1)), with: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), amount: 0.12), .darkHigh: .mix(base: .literal(TanreiColorValue(red: 1, green: 0.9333, blue: 0.8784, opacity: 1)), with: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1)), amount: 0.12)]),
        inverseWarningContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1))]),
        inverseWarningStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1))]),
        inverseErrorContainerColor: .scheme(by: [.light: .mix(base: .literal(TanreiColorValue(red: 0.2118, green: 0.1137, blue: 0.1059, opacity: 1)), with: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), amount: 0.12), .lightMedium: .mix(base: .literal(TanreiColorValue(red: 0.2118, green: 0.1137, blue: 0.1059, opacity: 1)), with: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), amount: 0.12), .lightHigh: .mix(base: .literal(TanreiColorValue(red: 0.2118, green: 0.1137, blue: 0.1059, opacity: 1)), with: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), amount: 0.12), .dark: .mix(base: .literal(TanreiColorValue(red: 1, green: 0.9294, blue: 0.9216, opacity: 1)), with: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), amount: 0.12), .darkMedium: .mix(base: .literal(TanreiColorValue(red: 1, green: 0.9294, blue: 0.9216, opacity: 1)), with: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), amount: 0.12), .darkHigh: .mix(base: .literal(TanreiColorValue(red: 1, green: 0.9294, blue: 0.9216, opacity: 1)), with: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1)), amount: 0.12)]),
        inverseErrorContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1))]),
        inverseErrorStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1))]),
        inverseSuccessContainerColor: .scheme(by: [.light: .mix(base: .literal(TanreiColorValue(red: 0.0902, green: 0.1529, blue: 0.0941, opacity: 1)), with: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), amount: 0.12), .lightMedium: .mix(base: .literal(TanreiColorValue(red: 0.0902, green: 0.1529, blue: 0.0941, opacity: 1)), with: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), amount: 0.12), .lightHigh: .mix(base: .literal(TanreiColorValue(red: 0.0902, green: 0.1529, blue: 0.0941, opacity: 1)), with: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), amount: 0.12), .dark: .mix(base: .literal(TanreiColorValue(red: 0.8863, green: 0.9647, blue: 0.8745, opacity: 1)), with: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), amount: 0.12), .darkMedium: .mix(base: .literal(TanreiColorValue(red: 0.8863, green: 0.9647, blue: 0.8745, opacity: 1)), with: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), amount: 0.12), .darkHigh: .mix(base: .literal(TanreiColorValue(red: 0.8863, green: 0.9647, blue: 0.8745, opacity: 1)), with: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1)), amount: 0.12)]),
        inverseSuccessContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1))]),
        inverseSuccessStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1))])
      ),
      pressed: TanreiSnackbarControlStateTokens(
        containerColor: .mix(base: .role(.surfaceBright), with: .role(.onSurface), amount: 0.2),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface),
        infoContainerColor: .mix(base: .role(.infoContainer), with: .role(.onInfoContainer), amount: 0.2),
        infoContentColor: .role(.onInfoContainer),
        infoStateLayerColor: .role(.onInfoContainer),
        warningContainerColor: .mix(base: .role(.warningContainer), with: .role(.onWarningContainer), amount: 0.2),
        warningContentColor: .role(.onWarningContainer),
        warningStateLayerColor: .role(.onWarningContainer),
        errorContainerColor: .mix(base: .role(.errorContainer), with: .role(.onErrorContainer), amount: 0.2),
        errorContentColor: .role(.onErrorContainer),
        errorStateLayerColor: .role(.onErrorContainer),
        successContainerColor: .mix(base: .role(.successContainer), with: .role(.onSuccessContainer), amount: 0.2),
        successContentColor: .role(.onSuccessContainer),
        successStateLayerColor: .role(.onSuccessContainer),
        inverseContainerColor: .mix(base: .role(.inverseSurface), with: .role(.inverseOnSurface), amount: 0.2),
        inverseContentColor: .role(.inverseOnSurface),
        inverseStateLayerColor: .role(.inverseOnSurface),
        inverseInfoContainerColor: .scheme(by: [.light: .mix(base: .literal(TanreiColorValue(red: 0.1098, green: 0.1373, blue: 0.2039, opacity: 1)), with: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), amount: 0.2), .lightMedium: .mix(base: .literal(TanreiColorValue(red: 0.1098, green: 0.1373, blue: 0.2039, opacity: 1)), with: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), amount: 0.2), .lightHigh: .mix(base: .literal(TanreiColorValue(red: 0.1098, green: 0.1373, blue: 0.2039, opacity: 1)), with: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), amount: 0.2), .dark: .mix(base: .literal(TanreiColorValue(red: 0.9294, green: 0.9412, blue: 1, opacity: 1)), with: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), amount: 0.2), .darkMedium: .mix(base: .literal(TanreiColorValue(red: 0.9294, green: 0.9412, blue: 1, opacity: 1)), with: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), amount: 0.2), .darkHigh: .mix(base: .literal(TanreiColorValue(red: 0.9294, green: 0.9412, blue: 1, opacity: 1)), with: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1)), amount: 0.2)]),
        inverseInfoContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1))]),
        inverseInfoStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1))]),
        inverseWarningContainerColor: .scheme(by: [.light: .mix(base: .literal(TanreiColorValue(red: 0.1961, green: 0.1255, blue: 0.0471, opacity: 1)), with: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), amount: 0.2), .lightMedium: .mix(base: .literal(TanreiColorValue(red: 0.1961, green: 0.1255, blue: 0.0471, opacity: 1)), with: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), amount: 0.2), .lightHigh: .mix(base: .literal(TanreiColorValue(red: 0.1961, green: 0.1255, blue: 0.0471, opacity: 1)), with: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), amount: 0.2), .dark: .mix(base: .literal(TanreiColorValue(red: 1, green: 0.9333, blue: 0.8784, opacity: 1)), with: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), amount: 0.2), .darkMedium: .mix(base: .literal(TanreiColorValue(red: 1, green: 0.9333, blue: 0.8784, opacity: 1)), with: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), amount: 0.2), .darkHigh: .mix(base: .literal(TanreiColorValue(red: 1, green: 0.9333, blue: 0.8784, opacity: 1)), with: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1)), amount: 0.2)]),
        inverseWarningContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1))]),
        inverseWarningStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1))]),
        inverseErrorContainerColor: .scheme(by: [.light: .mix(base: .literal(TanreiColorValue(red: 0.2118, green: 0.1137, blue: 0.1059, opacity: 1)), with: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), amount: 0.2), .lightMedium: .mix(base: .literal(TanreiColorValue(red: 0.2118, green: 0.1137, blue: 0.1059, opacity: 1)), with: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), amount: 0.2), .lightHigh: .mix(base: .literal(TanreiColorValue(red: 0.2118, green: 0.1137, blue: 0.1059, opacity: 1)), with: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), amount: 0.2), .dark: .mix(base: .literal(TanreiColorValue(red: 1, green: 0.9294, blue: 0.9216, opacity: 1)), with: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), amount: 0.2), .darkMedium: .mix(base: .literal(TanreiColorValue(red: 1, green: 0.9294, blue: 0.9216, opacity: 1)), with: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), amount: 0.2), .darkHigh: .mix(base: .literal(TanreiColorValue(red: 1, green: 0.9294, blue: 0.9216, opacity: 1)), with: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1)), amount: 0.2)]),
        inverseErrorContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1))]),
        inverseErrorStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1))]),
        inverseSuccessContainerColor: .scheme(by: [.light: .mix(base: .literal(TanreiColorValue(red: 0.0902, green: 0.1529, blue: 0.0941, opacity: 1)), with: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), amount: 0.2), .lightMedium: .mix(base: .literal(TanreiColorValue(red: 0.0902, green: 0.1529, blue: 0.0941, opacity: 1)), with: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), amount: 0.2), .lightHigh: .mix(base: .literal(TanreiColorValue(red: 0.0902, green: 0.1529, blue: 0.0941, opacity: 1)), with: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), amount: 0.2), .dark: .mix(base: .literal(TanreiColorValue(red: 0.8863, green: 0.9647, blue: 0.8745, opacity: 1)), with: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), amount: 0.2), .darkMedium: .mix(base: .literal(TanreiColorValue(red: 0.8863, green: 0.9647, blue: 0.8745, opacity: 1)), with: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), amount: 0.2), .darkHigh: .mix(base: .literal(TanreiColorValue(red: 0.8863, green: 0.9647, blue: 0.8745, opacity: 1)), with: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1)), amount: 0.2)]),
        inverseSuccessContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1))]),
        inverseSuccessStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1))])
      )
    ),
    close: TanreiSnackbarControlTokens(
      enabled: TanreiSnackbarControlStateTokens(
        containerColor: .none,
        contentColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant),
        infoContainerColor: .none,
        infoContentColor: .role(.onInfoContainer),
        infoStateLayerColor: .role(.onInfoContainer),
        warningContainerColor: .none,
        warningContentColor: .role(.onWarningContainer),
        warningStateLayerColor: .role(.onWarningContainer),
        errorContainerColor: .none,
        errorContentColor: .role(.onErrorContainer),
        errorStateLayerColor: .role(.onErrorContainer),
        successContainerColor: .none,
        successContentColor: .role(.onSuccessContainer),
        successStateLayerColor: .role(.onSuccessContainer),
        inverseContainerColor: .none,
        inverseContentColor: .role(.inverseOnSurface),
        inverseStateLayerColor: .role(.inverseOnSurface),
        inverseInfoContainerColor: .none,
        inverseInfoContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1))]),
        inverseInfoStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1))]),
        inverseWarningContainerColor: .none,
        inverseWarningContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1))]),
        inverseWarningStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1))]),
        inverseErrorContainerColor: .none,
        inverseErrorContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1))]),
        inverseErrorStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1))]),
        inverseSuccessContainerColor: .none,
        inverseSuccessContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1))]),
        inverseSuccessStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1))])
      ),
      hovered: TanreiSnackbarControlStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.06),
        contentColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant),
        infoContainerColor: .mix(base: .none, with: .role(.onInfoContainer), amount: 0.06),
        infoContentColor: .role(.onInfoContainer),
        infoStateLayerColor: .role(.onInfoContainer),
        warningContainerColor: .mix(base: .none, with: .role(.onWarningContainer), amount: 0.06),
        warningContentColor: .role(.onWarningContainer),
        warningStateLayerColor: .role(.onWarningContainer),
        errorContainerColor: .mix(base: .none, with: .role(.onErrorContainer), amount: 0.06),
        errorContentColor: .role(.onErrorContainer),
        errorStateLayerColor: .role(.onErrorContainer),
        successContainerColor: .mix(base: .none, with: .role(.onSuccessContainer), amount: 0.06),
        successContentColor: .role(.onSuccessContainer),
        successStateLayerColor: .role(.onSuccessContainer),
        inverseContainerColor: .mix(base: .none, with: .role(.inverseOnSurface), amount: 0.06),
        inverseContentColor: .role(.inverseOnSurface),
        inverseStateLayerColor: .role(.inverseOnSurface),
        inverseInfoContainerColor: .scheme(by: [.light: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), amount: 0.06), .lightMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), amount: 0.06), .lightHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), amount: 0.06), .dark: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), amount: 0.06), .darkMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), amount: 0.06), .darkHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1)), amount: 0.06)]),
        inverseInfoContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1))]),
        inverseInfoStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1))]),
        inverseWarningContainerColor: .scheme(by: [.light: .mix(base: .none, with: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), amount: 0.06), .lightMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), amount: 0.06), .lightHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), amount: 0.06), .dark: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), amount: 0.06), .darkMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), amount: 0.06), .darkHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1)), amount: 0.06)]),
        inverseWarningContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1))]),
        inverseWarningStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1))]),
        inverseErrorContainerColor: .scheme(by: [.light: .mix(base: .none, with: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), amount: 0.06), .lightMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), amount: 0.06), .lightHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), amount: 0.06), .dark: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), amount: 0.06), .darkMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), amount: 0.06), .darkHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1)), amount: 0.06)]),
        inverseErrorContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1))]),
        inverseErrorStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1))]),
        inverseSuccessContainerColor: .scheme(by: [.light: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), amount: 0.06), .lightMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), amount: 0.06), .lightHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), amount: 0.06), .dark: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), amount: 0.06), .darkMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), amount: 0.06), .darkHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1)), amount: 0.06)]),
        inverseSuccessContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1))]),
        inverseSuccessStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1))])
      ),
      focused: TanreiSnackbarControlStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        contentColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant),
        infoContainerColor: .mix(base: .none, with: .role(.onInfoContainer), amount: 0.12),
        infoContentColor: .role(.onInfoContainer),
        infoStateLayerColor: .role(.onInfoContainer),
        warningContainerColor: .mix(base: .none, with: .role(.onWarningContainer), amount: 0.12),
        warningContentColor: .role(.onWarningContainer),
        warningStateLayerColor: .role(.onWarningContainer),
        errorContainerColor: .mix(base: .none, with: .role(.onErrorContainer), amount: 0.12),
        errorContentColor: .role(.onErrorContainer),
        errorStateLayerColor: .role(.onErrorContainer),
        successContainerColor: .mix(base: .none, with: .role(.onSuccessContainer), amount: 0.12),
        successContentColor: .role(.onSuccessContainer),
        successStateLayerColor: .role(.onSuccessContainer),
        inverseContainerColor: .mix(base: .none, with: .role(.inverseOnSurface), amount: 0.12),
        inverseContentColor: .role(.inverseOnSurface),
        inverseStateLayerColor: .role(.inverseOnSurface),
        inverseInfoContainerColor: .scheme(by: [.light: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), amount: 0.12), .lightMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), amount: 0.12), .lightHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), amount: 0.12), .dark: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), amount: 0.12), .darkMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), amount: 0.12), .darkHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1)), amount: 0.12)]),
        inverseInfoContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1))]),
        inverseInfoStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1))]),
        inverseWarningContainerColor: .scheme(by: [.light: .mix(base: .none, with: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), amount: 0.12), .lightMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), amount: 0.12), .lightHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), amount: 0.12), .dark: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), amount: 0.12), .darkMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), amount: 0.12), .darkHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1)), amount: 0.12)]),
        inverseWarningContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1))]),
        inverseWarningStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1))]),
        inverseErrorContainerColor: .scheme(by: [.light: .mix(base: .none, with: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), amount: 0.12), .lightMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), amount: 0.12), .lightHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), amount: 0.12), .dark: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), amount: 0.12), .darkMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), amount: 0.12), .darkHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1)), amount: 0.12)]),
        inverseErrorContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1))]),
        inverseErrorStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1))]),
        inverseSuccessContainerColor: .scheme(by: [.light: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), amount: 0.12), .lightMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), amount: 0.12), .lightHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), amount: 0.12), .dark: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), amount: 0.12), .darkMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), amount: 0.12), .darkHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1)), amount: 0.12)]),
        inverseSuccessContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1))]),
        inverseSuccessStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1))])
      ),
      pressed: TanreiSnackbarControlStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.2),
        contentColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant),
        infoContainerColor: .mix(base: .none, with: .role(.onInfoContainer), amount: 0.2),
        infoContentColor: .role(.onInfoContainer),
        infoStateLayerColor: .role(.onInfoContainer),
        warningContainerColor: .mix(base: .none, with: .role(.onWarningContainer), amount: 0.2),
        warningContentColor: .role(.onWarningContainer),
        warningStateLayerColor: .role(.onWarningContainer),
        errorContainerColor: .mix(base: .none, with: .role(.onErrorContainer), amount: 0.2),
        errorContentColor: .role(.onErrorContainer),
        errorStateLayerColor: .role(.onErrorContainer),
        successContainerColor: .mix(base: .none, with: .role(.onSuccessContainer), amount: 0.2),
        successContentColor: .role(.onSuccessContainer),
        successStateLayerColor: .role(.onSuccessContainer),
        inverseContainerColor: .mix(base: .none, with: .role(.inverseOnSurface), amount: 0.2),
        inverseContentColor: .role(.inverseOnSurface),
        inverseStateLayerColor: .role(.inverseOnSurface),
        inverseInfoContainerColor: .scheme(by: [.light: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), amount: 0.2), .lightMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), amount: 0.2), .lightHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), amount: 0.2), .dark: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), amount: 0.2), .darkMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), amount: 0.2), .darkHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1)), amount: 0.2)]),
        inverseInfoContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1))]),
        inverseInfoStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8824, green: 0.9098, blue: 1, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.9137, green: 0.9294, blue: 1, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.9451, green: 0.9529, blue: 1, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1294, green: 0.1569, blue: 0.2235, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0941, green: 0.1216, blue: 0.1882, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0627, green: 0.0902, blue: 0.1569, opacity: 1))]),
        inverseWarningContainerColor: .scheme(by: [.light: .mix(base: .none, with: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), amount: 0.2), .lightMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), amount: 0.2), .lightHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), amount: 0.2), .dark: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), amount: 0.2), .darkMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), amount: 0.2), .darkHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1)), amount: 0.2)]),
        inverseWarningContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1))]),
        inverseWarningStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8902, blue: 0.7961, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9176, blue: 0.851, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9451, blue: 0.9059, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2118, green: 0.1412, blue: 0.0627, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1765, green: 0.1098, blue: 0.0314, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1412, green: 0.0784, blue: 0.0118, opacity: 1))]),
        inverseErrorContainerColor: .scheme(by: [.light: .mix(base: .none, with: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), amount: 0.2), .lightMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), amount: 0.2), .lightHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), amount: 0.2), .dark: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), amount: 0.2), .darkMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), amount: 0.2), .darkHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1)), amount: 0.2)]),
        inverseErrorContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1))]),
        inverseErrorStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 1, green: 0.8824, blue: 0.8745, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 1, green: 0.9137, blue: 0.9059, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 1, green: 0.9412, blue: 0.9373, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.2275, green: 0.1294, blue: 0.1216, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.1922, green: 0.098, blue: 0.0902, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.1569, green: 0.0667, blue: 0.0627, opacity: 1))]),
        inverseSuccessContainerColor: .scheme(by: [.light: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), amount: 0.2), .lightMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), amount: 0.2), .lightHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), amount: 0.2), .dark: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), amount: 0.2), .darkMedium: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), amount: 0.2), .darkHigh: .mix(base: .none, with: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1)), amount: 0.2)]),
        inverseSuccessContentColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1))]),
        inverseSuccessStateLayerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.8549, green: 0.9333, blue: 0.8392, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.8745, green: 0.9529, blue: 0.8627, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.898, green: 0.9765, blue: 0.8824, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.1059, green: 0.1725, blue: 0.1098, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.0745, green: 0.1373, blue: 0.0824, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.0431, green: 0.1059, blue: 0.051, opacity: 1))])
      )
    )
  ),
  hovered: TanreiSnackbarStateTokens(
    opacity: 1
  ),
  focused: TanreiSnackbarStateTokens(
    opacity: 1
  ),
  pressed: TanreiSnackbarStateTokens(
    opacity: 1
  )
)

private let acmeStepperTokens = TanreiStepperTokens(
  barColor: .role(.outlineVariant),
  barFilledColor: .role(.primary),
  barGap: 4,
  barShape: 9999,
  barThickness: 4,
  connectorColor: .role(.outlineVariant),
  connectorCompleteColor: .role(.primary),
  connectorGap: 4,
  connectorThickness: 2,
  containerPadding: 8,
  containerShape: 6,
  descriptionGap: 2,
  descriptionTypescale: acmeTypescale.bodySmall,
  labelTypescale: acmeTypescale.label,
  markerGap: 8,
  markerIconSize: 16,
  markerIconWeight: 400,
  markerLabelTypescale: acmeTypescale.labelSmall,
  markerOutlineWidth: 2,
  markerShape: 9999,
  markerSize: 24,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  positionColor: .role(.onSurfaceVariant),
  positionGap: 8,
  positionTypescale: acmeTypescale.labelSmall,
  stepMinWidth: 120,
  conditions: TanreiStepperConditions(
    incomplete: TanreiStepperConditionTokens(
      enabled: TanreiStepperConditionStateTokens(
        containerColor: .none,
        markerColor: .none,
        markerOutlineColor: .role(.outline),
        markerContentColor: .role(.onSurfaceVariant),
        labelColor: .role(.onSurfaceVariant),
        descriptionColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      hovered: TanreiStepperConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.06),
        markerColor: .none,
        markerOutlineColor: .role(.outline),
        markerContentColor: .role(.onSurfaceVariant),
        labelColor: .role(.onSurfaceVariant),
        descriptionColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiStepperConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        markerColor: .none,
        markerOutlineColor: .role(.outline),
        markerContentColor: .role(.onSurfaceVariant),
        labelColor: .role(.onSurfaceVariant),
        descriptionColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiStepperConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.2),
        markerColor: .none,
        markerOutlineColor: .role(.outline),
        markerContentColor: .role(.onSurfaceVariant),
        labelColor: .role(.onSurfaceVariant),
        descriptionColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      disabled: TanreiStepperConditionStateTokens(
        containerColor: .none,
        markerColor: .none,
        markerOutlineColor: .alpha(of: .role(.onSurface), amount: 0.38),
        markerContentColor: .alpha(of: .role(.onSurface), amount: 0.38),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        descriptionColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    current: TanreiStepperConditionTokens(
      enabled: TanreiStepperConditionStateTokens(
        containerColor: .none,
        markerColor: .role(.primary),
        markerOutlineColor: .role(.primary),
        markerContentColor: .role(.onPrimary),
        labelColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiStepperConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        markerColor: .role(.primary),
        markerOutlineColor: .role(.primary),
        markerContentColor: .role(.onPrimary),
        labelColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiStepperConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        markerColor: .role(.primary),
        markerOutlineColor: .role(.primary),
        markerContentColor: .role(.onPrimary),
        labelColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiStepperConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        markerColor: .role(.primary),
        markerOutlineColor: .role(.primary),
        markerContentColor: .role(.onPrimary),
        labelColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiStepperConditionStateTokens(
        containerColor: .none,
        markerColor: .role(.primary),
        markerOutlineColor: .alpha(of: .role(.onSurface), amount: 0.38),
        markerContentColor: .alpha(of: .role(.onSurface), amount: 0.38),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        descriptionColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    complete: TanreiStepperConditionTokens(
      enabled: TanreiStepperConditionStateTokens(
        containerColor: .none,
        markerColor: .role(.secondaryContainer),
        markerOutlineColor: .role(.secondaryContainer),
        markerContentColor: .role(.onSecondaryContainer),
        labelColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiStepperConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        markerColor: .role(.secondaryContainer),
        markerOutlineColor: .role(.secondaryContainer),
        markerContentColor: .role(.onSecondaryContainer),
        labelColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiStepperConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        markerColor: .role(.secondaryContainer),
        markerOutlineColor: .role(.secondaryContainer),
        markerContentColor: .role(.onSecondaryContainer),
        labelColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiStepperConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        markerColor: .role(.secondaryContainer),
        markerOutlineColor: .role(.secondaryContainer),
        markerContentColor: .role(.onSecondaryContainer),
        labelColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiStepperConditionStateTokens(
        containerColor: .none,
        markerColor: .role(.secondaryContainer),
        markerOutlineColor: .alpha(of: .role(.onSurface), amount: 0.38),
        markerContentColor: .alpha(of: .role(.onSurface), amount: 0.38),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        descriptionColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    error: TanreiStepperConditionTokens(
      enabled: TanreiStepperConditionStateTokens(
        containerColor: .none,
        markerColor: .none,
        markerOutlineColor: .role(.error),
        markerContentColor: .role(.error),
        labelColor: .role(.error),
        descriptionColor: .role(.error),
        stateLayerColor: .role(.error)
      ),
      hovered: TanreiStepperConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.06),
        markerColor: .none,
        markerOutlineColor: .role(.error),
        markerContentColor: .role(.error),
        labelColor: .role(.error),
        descriptionColor: .role(.error),
        stateLayerColor: .role(.error)
      ),
      focused: TanreiStepperConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
        markerColor: .none,
        markerOutlineColor: .role(.error),
        markerContentColor: .role(.error),
        labelColor: .role(.error),
        descriptionColor: .role(.error),
        stateLayerColor: .role(.error)
      ),
      pressed: TanreiStepperConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.2),
        markerColor: .none,
        markerOutlineColor: .role(.error),
        markerContentColor: .role(.error),
        labelColor: .role(.error),
        descriptionColor: .role(.error),
        stateLayerColor: .role(.error)
      ),
      disabled: TanreiStepperConditionStateTokens(
        containerColor: .none,
        markerColor: .none,
        markerOutlineColor: .alpha(of: .role(.onSurface), amount: 0.38),
        markerContentColor: .alpha(of: .role(.onSurface), amount: 0.38),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        descriptionColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiStepperStateTokens(
    containerShape: 6,
    opacity: 1
  ),
  focused: TanreiStepperStateTokens(
    containerShape: 6,
    opacity: 1
  ),
  pressed: TanreiStepperStateTokens(
    containerShape: 6,
    opacity: 1
  ),
  disabled: TanreiStepperStateTokens(
    containerShape: 6,
    opacity: 1
  )
)

private let acmeStepsTokens = TanreiStepsTokens(
  bodyGap: 8,
  connectorColor: .role(.outlineVariant),
  connectorGap: 4,
  connectorThickness: 1,
  markerGap: 12,
  markerOutlineColor: .role(.outlineVariant),
  markerOutlineWidth: 1,
  markerPaddingInline: 4,
  markerShape: 9999,
  stepGap: 16,
  titleGap: 4,
  sizes: TanreiStepsSizes(
    medium: TanreiStepsSizeTokens(
      markerHeight: 24,
      markerLabelTypescale: acmeTypescale.labelSmall,
      titleTypescale: acmeTypescale.heading6,
      bodyTypescale: acmeTypescale.body
    ),
    large: TanreiStepsSizeTokens(
      markerHeight: 28,
      markerLabelTypescale: acmeTypescale.label,
      titleTypescale: acmeTypescale.heading5,
      bodyTypescale: acmeTypescale.bodyLarge
    )
  )
)

private let acmeSwatchTokens = TanreiSwatchTokens(
  checkerboardAlternateColor: .role(.surfaceContainerHighest),
  checkerboardColor: .role(.surface),
  checkerboardSize: 4,
  labelColor: .role(.onSurface),
  outlineColor: .role(.outlineVariant),
  outlineWidth: 1,
  supportingTextColor: .role(.onSurfaceVariant),
  sizes: TanreiSwatchSizes(
    small: TanreiSwatchSizeTokens(
      containerSize: 16,
      gap: 4,
      labelTypescale: acmeTypescale.bodySmall,
      supportingTextTypescale: acmeTypescale.caption
    ),
    medium: TanreiSwatchSizeTokens(
      containerSize: 24,
      gap: 8,
      labelTypescale: acmeTypescale.body,
      supportingTextTypescale: acmeTypescale.bodySmall
    ),
    large: TanreiSwatchSizeTokens(
      containerSize: 32,
      gap: 12,
      labelTypescale: acmeTypescale.body,
      supportingTextTypescale: acmeTypescale.bodySmall
    )
  ),
  shapes: TanreiSwatchShapes(
    square: TanreiSwatchShapeTokens(
      containerShape: 3
    ),
    circle: TanreiSwatchShapeTokens(
      containerShape: 9999
    )
  )
)

private let acmeSwitchTokens = TanreiSwitchTokens(
  containerShape: 9999,
  containerSize: 40,
  handleSizeWithIcon: 24,
  iconSize: 16,
  iconWeight: 400,
  labelGap: 8,
  labelTypescale: acmeTypescale.body,
  motionFeedbackDuration: 450,
  motionSelectionDuration: 350,
  motionSelectionEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineWidth: 2,
  trackHeight: 32,
  trackShape: 9999,
  trackWidth: 52,
  conditions: TanreiSwitchConditions(
    unselected: TanreiSwitchConditionTokens(
      enabled: TanreiSwitchConditionStateTokens(
        containerColor: .none,
        trackColor: .role(.surfaceContainerHighest),
        outlineColor: .role(.outline),
        handleColor: .role(.outline),
        handleSize: 16,
        handleElevation: acmeElevation.level0,
        iconColor: .role(.surfaceContainerHighest),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.outline)
      ),
      hovered: TanreiSwitchConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.outline), amount: 0.06),
        trackColor: .role(.surfaceContainerHighest),
        outlineColor: .role(.outline),
        handleColor: .role(.outline),
        handleSize: 16,
        handleElevation: acmeElevation.level0,
        iconColor: .role(.surfaceContainerHighest),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.outline)
      ),
      focused: TanreiSwitchConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.outline), amount: 0.12),
        trackColor: .role(.surfaceContainerHighest),
        outlineColor: .role(.outline),
        handleColor: .role(.outline),
        handleSize: 16,
        handleElevation: acmeElevation.level0,
        iconColor: .role(.surfaceContainerHighest),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.outline)
      ),
      pressed: TanreiSwitchConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.outline), amount: 0.2),
        trackColor: .role(.surfaceContainerHighest),
        outlineColor: .role(.outline),
        handleColor: .role(.outline),
        handleSize: 28,
        handleElevation: acmeElevation.level0,
        iconColor: .role(.surfaceContainerHighest),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.outline)
      ),
      disabled: TanreiSwitchConditionStateTokens(
        containerColor: .none,
        trackColor: .alpha(of: .role(.onSurface), amount: 0.12),
        outlineColor: .alpha(of: .role(.onSurface), amount: 0.12),
        handleColor: .alpha(of: .role(.onSurface), amount: 0.38),
        handleSize: 16,
        handleElevation: acmeElevation.level0,
        iconColor: .role(.surface),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    selected: TanreiSwitchConditionTokens(
      enabled: TanreiSwitchConditionStateTokens(
        containerColor: .none,
        trackColor: .role(.primary),
        outlineColor: .role(.primary),
        handleColor: .role(.onPrimary),
        handleSize: 24,
        handleElevation: acmeElevation.level0,
        iconColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      hovered: TanreiSwitchConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.06),
        trackColor: .role(.primary),
        outlineColor: .role(.primary),
        handleColor: .role(.onPrimary),
        handleSize: 24,
        handleElevation: acmeElevation.level0,
        iconColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      focused: TanreiSwitchConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
        trackColor: .role(.primary),
        outlineColor: .role(.primary),
        handleColor: .role(.onPrimary),
        handleSize: 24,
        handleElevation: acmeElevation.level0,
        iconColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      pressed: TanreiSwitchConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.2),
        trackColor: .role(.primary),
        outlineColor: .role(.primary),
        handleColor: .role(.onPrimary),
        handleSize: 28,
        handleElevation: acmeElevation.level0,
        iconColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      disabled: TanreiSwitchConditionStateTokens(
        containerColor: .none,
        trackColor: .alpha(of: .role(.onSurface), amount: 0.12),
        outlineColor: .alpha(of: .role(.onSurface), amount: 0.12),
        handleColor: .role(.surface),
        handleSize: 24,
        handleElevation: acmeElevation.level0,
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiSwitchStateTokens(
    containerShape: 9999,
    opacity: 1
  ),
  focused: TanreiSwitchStateTokens(
    containerShape: 9999,
    opacity: 1
  ),
  pressed: TanreiSwitchStateTokens(
    containerShape: 9999,
    opacity: 1
  ),
  disabled: TanreiSwitchStateTokens(
    containerShape: 9999,
    opacity: 1
  )
)

private let acmeTabViewTokens = TanreiTabViewTokens(
  containerShape: 0,
  motionFadeDuration: 200,
  motionFadeEasing: TanreiCubicBezier(0.34, 0.8, 0.34, 1),
  motionSwitchDuration: 500,
  motionSwitchEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  motionTransition: 0,
  transitionBlur: 8,
  transitionDistance: 40,
  transitionDistanceFraction: 0,
  transitionOpacity: 0
)

private let acmeTableOfContentsTokens = TanreiTableOfContentsTokens(
  compactContainerColor: .role(.surfaceContainer),
  compactContainerShape: 6,
  compactIconColor: .role(.onSurfaceVariant),
  compactIconSize: 20,
  compactListPaddingBlock: 8,
  compactListPaddingInline: 16,
  compactRowGap: 8,
  compactRowHeight: 48,
  compactRowPaddingInline: 16,
  compactSupportingTextColor: .role(.onSurfaceVariant),
  compactSupportingTextTypescale: acmeTypescale.bodySmall,
  containerGap: 8,
  labelTypescale: acmeTypescale.bodySmall,
  markerColor: .role(.primary),
  markerWidth: 2,
  motionDisclosureDuration: 350,
  motionDisclosureEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  railColor: .role(.outlineVariant),
  railWidth: 1,
  rowIndent: 12,
  rowPaddingInline: 12,
  rowShape: 3,
  titleColor: .role(.onSurface),
  titleTypescale: acmeTypescale.label,
  parts: TanreiTableOfContentsParts(
    item: TanreiTableOfContentsPartTokens(
      enabled: TanreiTableOfContentsPartStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      hovered: TanreiTableOfContentsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.06),
        labelColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiTableOfContentsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        labelColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiTableOfContentsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.2),
        labelColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      )
    ),
    current: TanreiTableOfContentsPartTokens(
      enabled: TanreiTableOfContentsPartStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiTableOfContentsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiTableOfContentsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiTableOfContentsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      )
    ),
    disclosure: TanreiTableOfContentsPartTokens(
      enabled: TanreiTableOfContentsPartStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiTableOfContentsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiTableOfContentsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiTableOfContentsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      )
    )
  ),
  densitys: TanreiTableOfContentsDensitys(
    regular: TanreiTableOfContentsDensityTokens(
      rowHeight: 44,
      rowPaddingBlock: 12
    ),
    compact: TanreiTableOfContentsDensityTokens(
      rowHeight: 32,
      rowPaddingBlock: 6
    )
  ),
  hovered: TanreiTableOfContentsStateTokens(
    opacity: 1
  ),
  focused: TanreiTableOfContentsStateTokens(
    opacity: 1
  ),
  pressed: TanreiTableOfContentsStateTokens(
    opacity: 1
  )
)

private let acmeTableTokens = TanreiTableTokens(
  captionGap: 8,
  captionTextColor: .role(.onSurfaceVariant),
  captionTextTypescale: acmeTypescale.bodySmall,
  cellTextColor: .role(.onSurface),
  dividerColor: .role(.outlineVariant),
  dividerThickness: 1,
  emptyPaddingBlock: 32,
  headerContainerColor: .none,
  headerGap: 4,
  headerIconSize: 16,
  headerIconWeight: 400,
  headerTextColor: .role(.onSurfaceVariant),
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  rowGap: 4,
  rowSelectedContainerColor: .alpha(of: .role(.onSecondaryContainer), amount: 0.16),
  rowSelectedHoveredContainerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06),
  rowSelectedHoveredTextColor: .role(.onSecondaryContainer),
  rowSelectedPressedContainerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2),
  rowSelectedPressedTextColor: .role(.onSecondaryContainer),
  rowSelectedStateLayerColor: .role(.onSecondaryContainer),
  rowSelectedTextColor: .role(.onSecondaryContainer),
  rowUnselectedContainerColor: .none,
  rowUnselectedHoveredContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
  rowUnselectedHoveredTextColor: .role(.onSurface),
  rowUnselectedPressedContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
  rowUnselectedPressedTextColor: .role(.onSurface),
  rowUnselectedStateLayerColor: .role(.onSurface),
  rowUnselectedTextColor: .role(.onSurface),
  separation: 0,
  statusGap: 16,
  statusPaddingBlock: 8,
  statusTextColor: .role(.onSurfaceVariant),
  statusTextTypescale: acmeTypescale.bodySmall,
  stickyContainerColor: .role(.surface),
  stripeContainerColor: .role(.surfaceContainerLow),
  parts: TanreiTableParts(
    sort: TanreiTablePartTokens(
      enabled: TanreiTablePartStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      hovered: TanreiTablePartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.06),
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiTablePartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiTablePartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.2),
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      )
    ),
    sorted: TanreiTablePartTokens(
      enabled: TanreiTablePartStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiTablePartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiTablePartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiTablePartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      )
    )
  ),
  densitys: TanreiTableDensitys(
    regular: TanreiTableDensityTokens(
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
      cellTextTypescale: acmeTypescale.body,
      headerTextTypescale: acmeTypescale.label
    ),
    compact: TanreiTableDensityTokens(
      cellPaddingBlock: 6,
      cellPaddingInline: 12,
      cellTextTypescale: acmeTypescale.bodySmall,
      headerTextTypescale: acmeTypescale.labelSmall
    )
  ),
  hovered: TanreiTableStateTokens(
    opacity: 1
  ),
  focused: TanreiTableStateTokens(
    opacity: 1
  ),
  pressed: TanreiTableStateTokens(
    opacity: 1
  )
)

private let acmeTabsTokens = TanreiTabsTokens(
  activeIndicatorHeight: 32,
  containerGap: 4,
  containerHeightWithIcon: 64,
  containerShape: 9999,
  dividerColor: .none,
  dividerThickness: 1,
  labelTypescale: acmeTypescale.label,
  motionFeedbackDuration: 450,
  motionIndicatorDuration: 500,
  motionIndicatorEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionTransition: 0,
  primarySelectedLabelEmphasis: 0,
  secondarySelectedLabelEmphasis: 0,
  tonalSelectedLabelEmphasis: 100,
  trackPadding: 4,
  trackShape: 9999,
  trackVisible: 1,
  variants: TanreiTabsVariants(
    primary: TanreiTabsVariantTokens(
      enabled: TanreiTabsVariantStateTokens(
        trackColor: .role(.secondaryContainer),
        containerColor: .none,
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        coveredLabelColor: .role(.onPrimary),
        coveredIconColor: .role(.onPrimary),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 3,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 3,
        underlineShape: 3,
        stateLayerColor: .role(.onSecondaryContainer),
        selectedContainerColor: .none,
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedCoveredLabelColor: .role(.onPrimary),
        selectedCoveredIconColor: .role(.onPrimary),
        selectedActiveIndicatorColor: .role(.primary),
        selectedUnderlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary)
      ),
      hovered: TanreiTabsVariantStateTokens(
        trackColor: .role(.secondaryContainer),
        containerColor: .mix(base: .none, with: .role(.onSecondaryContainer), amount: 0.06),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        coveredLabelColor: .role(.onPrimary),
        coveredIconColor: .role(.onPrimary),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 3,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 3,
        underlineShape: 3,
        stateLayerColor: .role(.onSecondaryContainer),
        selectedContainerColor: .mix(base: .none, with: .role(.onPrimary), amount: 0.06),
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedCoveredLabelColor: .role(.onPrimary),
        selectedCoveredIconColor: .role(.onPrimary),
        selectedActiveIndicatorColor: .role(.primary),
        selectedUnderlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary)
      ),
      focused: TanreiTabsVariantStateTokens(
        trackColor: .role(.secondaryContainer),
        containerColor: .mix(base: .none, with: .role(.onSecondaryContainer), amount: 0.12),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        coveredLabelColor: .role(.onPrimary),
        coveredIconColor: .role(.onPrimary),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 3,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 3,
        underlineShape: 3,
        stateLayerColor: .role(.onSecondaryContainer),
        selectedContainerColor: .mix(base: .none, with: .role(.onPrimary), amount: 0.12),
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedCoveredLabelColor: .role(.onPrimary),
        selectedCoveredIconColor: .role(.onPrimary),
        selectedActiveIndicatorColor: .role(.primary),
        selectedUnderlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary)
      ),
      pressed: TanreiTabsVariantStateTokens(
        trackColor: .role(.secondaryContainer),
        containerColor: .mix(base: .none, with: .role(.onSecondaryContainer), amount: 0.2),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        coveredLabelColor: .role(.onPrimary),
        coveredIconColor: .role(.onPrimary),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 3,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 3,
        underlineShape: 3,
        stateLayerColor: .role(.onSecondaryContainer),
        selectedContainerColor: .mix(base: .none, with: .role(.onPrimary), amount: 0.2),
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedCoveredLabelColor: .role(.onPrimary),
        selectedCoveredIconColor: .role(.onPrimary),
        selectedActiveIndicatorColor: .role(.primary),
        selectedUnderlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary)
      ),
      disabled: TanreiTabsVariantStateTokens(
        trackColor: .role(.secondaryContainer),
        containerColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        coveredLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        coveredIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 3,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 3,
        underlineShape: 3,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedContainerColor: .none,
        selectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedCoveredLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedCoveredIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedActiveIndicatorColor: .alpha(of: .role(.onSurface), amount: 0.12),
        selectedUnderlineColor: .none,
        selectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    secondary: TanreiTabsVariantTokens(
      enabled: TanreiTabsVariantStateTokens(
        trackColor: .role(.secondaryContainer),
        containerColor: .none,
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        coveredLabelColor: .role(.onSecondary),
        coveredIconColor: .role(.onSecondary),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 2,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 2,
        underlineShape: 0,
        stateLayerColor: .role(.onSecondaryContainer),
        selectedContainerColor: .none,
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedCoveredLabelColor: .role(.onSecondary),
        selectedCoveredIconColor: .role(.onSecondary),
        selectedActiveIndicatorColor: .role(.secondary),
        selectedUnderlineColor: .none,
        selectedStateLayerColor: .role(.onSecondary)
      ),
      hovered: TanreiTabsVariantStateTokens(
        trackColor: .role(.secondaryContainer),
        containerColor: .mix(base: .none, with: .role(.onSecondaryContainer), amount: 0.06),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        coveredLabelColor: .role(.onSecondary),
        coveredIconColor: .role(.onSecondary),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 2,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 2,
        underlineShape: 0,
        stateLayerColor: .role(.onSecondaryContainer),
        selectedContainerColor: .mix(base: .none, with: .role(.onSecondary), amount: 0.06),
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedCoveredLabelColor: .role(.onSecondary),
        selectedCoveredIconColor: .role(.onSecondary),
        selectedActiveIndicatorColor: .role(.secondary),
        selectedUnderlineColor: .none,
        selectedStateLayerColor: .role(.onSecondary)
      ),
      focused: TanreiTabsVariantStateTokens(
        trackColor: .role(.secondaryContainer),
        containerColor: .mix(base: .none, with: .role(.onSecondaryContainer), amount: 0.12),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        coveredLabelColor: .role(.onSecondary),
        coveredIconColor: .role(.onSecondary),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 2,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 2,
        underlineShape: 0,
        stateLayerColor: .role(.onSecondaryContainer),
        selectedContainerColor: .mix(base: .none, with: .role(.onSecondary), amount: 0.12),
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedCoveredLabelColor: .role(.onSecondary),
        selectedCoveredIconColor: .role(.onSecondary),
        selectedActiveIndicatorColor: .role(.secondary),
        selectedUnderlineColor: .none,
        selectedStateLayerColor: .role(.onSecondary)
      ),
      pressed: TanreiTabsVariantStateTokens(
        trackColor: .role(.secondaryContainer),
        containerColor: .mix(base: .none, with: .role(.onSecondaryContainer), amount: 0.2),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        coveredLabelColor: .role(.onSecondary),
        coveredIconColor: .role(.onSecondary),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 2,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 2,
        underlineShape: 0,
        stateLayerColor: .role(.onSecondaryContainer),
        selectedContainerColor: .mix(base: .none, with: .role(.onSecondary), amount: 0.2),
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedCoveredLabelColor: .role(.onSecondary),
        selectedCoveredIconColor: .role(.onSecondary),
        selectedActiveIndicatorColor: .role(.secondary),
        selectedUnderlineColor: .none,
        selectedStateLayerColor: .role(.onSecondary)
      ),
      disabled: TanreiTabsVariantStateTokens(
        trackColor: .role(.secondaryContainer),
        containerColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        coveredLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        coveredIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 2,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 2,
        underlineShape: 0,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedContainerColor: .none,
        selectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedCoveredLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedCoveredIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedActiveIndicatorColor: .alpha(of: .role(.onSurface), amount: 0.12),
        selectedUnderlineColor: .none,
        selectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    tonal: TanreiTabsVariantTokens(
      enabled: TanreiTabsVariantStateTokens(
        trackColor: .role(.secondaryContainer),
        containerColor: .none,
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        coveredLabelColor: .role(.onSecondaryContainer),
        coveredIconColor: .role(.onSecondaryContainer),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 2,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 2,
        underlineShape: 0,
        stateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .none,
        selectedLabelColor: .role(.onSurfaceVariant),
        selectedIconColor: .role(.onSurfaceVariant),
        selectedCoveredLabelColor: .role(.onSecondaryContainer),
        selectedCoveredIconColor: .role(.onSecondaryContainer),
        selectedActiveIndicatorColor: .alpha(of: .role(.onSecondaryContainer), amount: 0.16),
        selectedUnderlineColor: .none,
        selectedStateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiTabsVariantStateTokens(
        trackColor: .role(.secondaryContainer),
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.06),
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        coveredLabelColor: .role(.onSecondaryContainer),
        coveredIconColor: .role(.onSecondaryContainer),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 2,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 2,
        underlineShape: 0,
        stateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .none, with: .role(.onSecondaryContainer), amount: 0.06),
        selectedLabelColor: .role(.onSurfaceVariant),
        selectedIconColor: .role(.onSurfaceVariant),
        selectedCoveredLabelColor: .role(.onSecondaryContainer),
        selectedCoveredIconColor: .role(.onSecondaryContainer),
        selectedActiveIndicatorColor: .alpha(of: .role(.onSecondaryContainer), amount: 0.16),
        selectedUnderlineColor: .none,
        selectedStateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiTabsVariantStateTokens(
        trackColor: .role(.secondaryContainer),
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        coveredLabelColor: .role(.onSecondaryContainer),
        coveredIconColor: .role(.onSecondaryContainer),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 2,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 2,
        underlineShape: 0,
        stateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .none, with: .role(.onSecondaryContainer), amount: 0.12),
        selectedLabelColor: .role(.onSurfaceVariant),
        selectedIconColor: .role(.onSurfaceVariant),
        selectedCoveredLabelColor: .role(.onSecondaryContainer),
        selectedCoveredIconColor: .role(.onSecondaryContainer),
        selectedActiveIndicatorColor: .alpha(of: .role(.onSecondaryContainer), amount: 0.16),
        selectedUnderlineColor: .none,
        selectedStateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiTabsVariantStateTokens(
        trackColor: .role(.secondaryContainer),
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.2),
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        coveredLabelColor: .role(.onSecondaryContainer),
        coveredIconColor: .role(.onSecondaryContainer),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 2,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 2,
        underlineShape: 0,
        stateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .none, with: .role(.onSecondaryContainer), amount: 0.2),
        selectedLabelColor: .role(.onSurfaceVariant),
        selectedIconColor: .role(.onSurfaceVariant),
        selectedCoveredLabelColor: .role(.onSecondaryContainer),
        selectedCoveredIconColor: .role(.onSecondaryContainer),
        selectedActiveIndicatorColor: .alpha(of: .role(.onSecondaryContainer), amount: 0.16),
        selectedUnderlineColor: .none,
        selectedStateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiTabsVariantStateTokens(
        trackColor: .role(.secondaryContainer),
        containerColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        coveredLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        coveredIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 2,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 2,
        underlineShape: 0,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedContainerColor: .none,
        selectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedCoveredLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedCoveredIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedActiveIndicatorColor: .alpha(of: .role(.onSurface), amount: 0.12),
        selectedUnderlineColor: .none,
        selectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  sizes: TanreiTabsSizes(
    small: TanreiTabsSizeTokens(
      containerHeight: 32,
      containerPaddingInline: 12,
      activeIndicatorPaddingInline: 12,
      activeIndicatorPaddingBlock: 2,
      iconSize: 20,
      iconPlacement: 1
    ),
    medium: TanreiTabsSizeTokens(
      containerHeight: 48,
      containerPaddingInline: 16,
      activeIndicatorPaddingInline: 16,
      activeIndicatorPaddingBlock: 4,
      iconSize: 24,
      iconPlacement: 0
    )
  ),
  hovered: TanreiTabsStateTokens(
    opacity: 1
  ),
  focused: TanreiTabsStateTokens(
    opacity: 1
  ),
  pressed: TanreiTabsStateTokens(
    opacity: 1
  ),
  disabled: TanreiTabsStateTokens(
    opacity: 1
  )
)

private let acmeTagGroupTokens = TanreiTagGroupTokens(
  spacings: TanreiTagGroupSpacings(
    tags: TanreiTagGroupSpacingTokens(
      gap: 8,
      rowGap: 8
    ),
    chips: TanreiTagGroupSpacingTokens(
      gap: 8,
      rowGap: 16
    )
  )
)

private let acmeTagTokens = TanreiTagTokens(
  containerGap: 4,
  containerShape: 9999,
  dotSize: 8,
  iconSize: 16,
  outlineColor: .role(.outlineVariant),
  outlineWidth: 1,
  sizes: TanreiTagSizes(
    small: TanreiTagSizeTokens(
      containerHeight: 20,
      containerPaddingInline: 6,
      containerPaddingInlineWithIcon: 4,
      containerPaddingBlock: 2,
      labelTypescale: acmeTypescale.labelSmall
    ),
    medium: TanreiTagSizeTokens(
      containerHeight: 24,
      containerPaddingInline: 8,
      containerPaddingInlineWithIcon: 6,
      containerPaddingBlock: 2,
      labelTypescale: acmeTypescale.label
    )
  ),
  variants: TanreiTagVariants(
    tonal: TanreiTagVariantTokens(
      enabled: TanreiTagVariantStateTokens(
        containerColor: .role(.secondaryContainer),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        infoContainerColor: .role(.infoContainer),
        infoLabelColor: .role(.onInfoContainer),
        infoIconColor: .role(.info),
        warningContainerColor: .role(.warningContainer),
        warningLabelColor: .role(.onWarningContainer),
        warningIconColor: .role(.warning),
        errorContainerColor: .role(.errorContainer),
        errorLabelColor: .role(.onErrorContainer),
        errorIconColor: .role(.error),
        successContainerColor: .role(.successContainer),
        successLabelColor: .role(.onSuccessContainer),
        successIconColor: .role(.success)
      ),
      disabled: TanreiTagVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        infoContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        infoLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        infoIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        warningContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        warningLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        warningIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        errorLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        successContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        successLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        successIconColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    outlined: TanreiTagVariantTokens(
      enabled: TanreiTagVariantStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        infoContainerColor: .none,
        infoLabelColor: .role(.onSurface),
        infoIconColor: .role(.info),
        warningContainerColor: .none,
        warningLabelColor: .role(.onSurface),
        warningIconColor: .role(.warning),
        errorContainerColor: .none,
        errorLabelColor: .role(.onSurface),
        errorIconColor: .role(.error),
        successContainerColor: .none,
        successLabelColor: .role(.onSurface),
        successIconColor: .role(.success)
      ),
      disabled: TanreiTagVariantStateTokens(
        containerColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        infoContainerColor: .none,
        infoLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        infoIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        warningContainerColor: .none,
        warningLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        warningIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorContainerColor: .none,
        errorLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        successContainerColor: .none,
        successLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        successIconColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    filled: TanreiTagVariantTokens(
      enabled: TanreiTagVariantStateTokens(
        containerColor: .role(.primary),
        labelColor: .role(.onPrimary),
        iconColor: .role(.onPrimary),
        infoContainerColor: .role(.info),
        infoLabelColor: .role(.onInfo),
        infoIconColor: .role(.onInfo),
        warningContainerColor: .role(.warning),
        warningLabelColor: .role(.onWarning),
        warningIconColor: .role(.onWarning),
        errorContainerColor: .role(.error),
        errorLabelColor: .role(.onError),
        errorIconColor: .role(.onError),
        successContainerColor: .role(.success),
        successLabelColor: .role(.onSuccess),
        successIconColor: .role(.onSuccess)
      ),
      disabled: TanreiTagVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        infoContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        infoLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        infoIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        warningContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        warningLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        warningIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        errorLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        successContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        successLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        successIconColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  )
)

private let acmeTextInputTokens = TanreiTextInputTokens(
  codeTabSize: 2,
  codeTypescale: acmeTypescale.code,
  entriesGap: 8,
  entriesRowGap: 8,
  entriesTypingMinWidth: 72,
  motionResizeDuration: 200,
  motionResizeEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  resizeGripInset: 4,
  resizeGripSize: 16,
  segmentPaddingInline: 2,
  variants: TanreiTextInputVariants(
    stacked: TanreiTextInputVariantTokens(
      enabled: TanreiTextInputVariantStateTokens(
        resizeGripColor: .role(.onSurfaceVariant),
        errorResizeGripColor: .role(.onSurfaceVariant)
      ),
      hovered: TanreiTextInputVariantStateTokens(
        resizeGripColor: .role(.onSurfaceVariant),
        errorResizeGripColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiTextInputVariantStateTokens(
        resizeGripColor: .role(.onSurfaceVariant),
        errorResizeGripColor: .role(.onSurfaceVariant)
      ),
      disabled: TanreiTextInputVariantStateTokens(
        resizeGripColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorResizeGripColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    filled: TanreiTextInputVariantTokens(
      enabled: TanreiTextInputVariantStateTokens(
        resizeGripColor: .role(.onSurfaceVariant),
        errorResizeGripColor: .role(.onSurfaceVariant)
      ),
      hovered: TanreiTextInputVariantStateTokens(
        resizeGripColor: .role(.onSurfaceVariant),
        errorResizeGripColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiTextInputVariantStateTokens(
        resizeGripColor: .role(.onSurfaceVariant),
        errorResizeGripColor: .role(.onSurfaceVariant)
      ),
      disabled: TanreiTextInputVariantStateTokens(
        resizeGripColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorResizeGripColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    outlined: TanreiTextInputVariantTokens(
      enabled: TanreiTextInputVariantStateTokens(
        resizeGripColor: .role(.onSurfaceVariant),
        errorResizeGripColor: .role(.onSurfaceVariant)
      ),
      hovered: TanreiTextInputVariantStateTokens(
        resizeGripColor: .role(.onSurfaceVariant),
        errorResizeGripColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiTextInputVariantStateTokens(
        resizeGripColor: .role(.onSurfaceVariant),
        errorResizeGripColor: .role(.onSurfaceVariant)
      ),
      disabled: TanreiTextInputVariantStateTokens(
        resizeGripColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorResizeGripColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  )
)

private let acmeTimelineTokens = TanreiTimelineTokens(
  bodyGap: 8,
  connectorColor: .role(.outlineVariant),
  connectorGap: 4,
  connectorThickness: 1,
  markerCurrentContainerColor: .role(.primary),
  markerCurrentIconColor: .role(.onPrimary),
  markerDotColor: .role(.onSurfaceVariant),
  markerDotSize: 8,
  markerGap: 12,
  markerIconColor: .role(.onSurfaceVariant),
  markerIconSize: 16,
  markerOutlineColor: .role(.outlineVariant),
  markerOutlineWidth: 1,
  markerShape: 9999,
  timeColor: .role(.onSurfaceVariant),
  timeGap: 2,
  titleGap: 4,
  sizes: TanreiTimelineSizes(
    medium: TanreiTimelineSizeTokens(
      markerHeight: 24,
      timeTypescale: acmeTypescale.bodySmall,
      titleTypescale: acmeTypescale.heading6,
      bodyTypescale: acmeTypescale.body
    ),
    large: TanreiTimelineSizeTokens(
      markerHeight: 28,
      timeTypescale: acmeTypescale.body,
      titleTypescale: acmeTypescale.heading5,
      bodyTypescale: acmeTypescale.bodyLarge
    )
  ),
  densitys: TanreiTimelineDensitys(
    regular: TanreiTimelineDensityTokens(
      itemGap: 16
    ),
    compact: TanreiTimelineDensityTokens(
      itemGap: 8
    )
  )
)

private let acmeToolbarTokens = TanreiToolbarTokens(
  outlineWidth: 1,
  variants: TanreiToolbarVariants(
    docked: TanreiToolbarVariantTokens(
      containerColor: .role(.surface),
      containerElevation: acmeElevation.level0,
      containerShape: 0,
      containerSize: 64,
      containerPaddingInline: 16,
      containerGap: 16,
      outlineColor: .role(.outlineVariant)
    ),
    floating: TanreiToolbarVariantTokens(
      containerColor: .role(.surfaceBright),
      containerElevation: acmeElevation.level3,
      containerShape: 9999,
      containerSize: 64,
      containerPaddingInline: 12,
      containerGap: 0,
      outlineColor: .none
    )
  )
)

private let acmeTooltipTokens = TanreiTooltipTokens(
  arrowHeight: 6,
  arrowInset: 8,
  arrowVisible: 0,
  arrowWidth: 12,
  motionEnterDuration: 200,
  motionEnterEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionEnterOffset: 4,
  motionEnterScale: 0.95,
  motionExitDuration: 150,
  motionExitEasing: TanreiCubicBezier(0.3, 0, 1, 1),
  motionHideDelay: 100,
  motionShowDelay: 500,
  motionWarmDuration: 300,
  offset: 4,
  plainContainerColor: .role(.inverseSurface),
  plainContainerElevation: acmeElevation.level0,
  plainContainerGap: 8,
  plainContainerInverse: 1,
  plainContainerMaxWidth: 200,
  plainContainerMinHeight: 24,
  plainContainerPaddingBlock: 4,
  plainContainerPaddingInline: 8,
  plainContainerShape: 6,
  plainShortcutColor: .role(.inverseOnSurface),
  plainSupportingTextColor: .role(.inverseOnSurface),
  plainSupportingTextTypescale: acmeTypescale.bodySmall,
  plainSurfaceContainerColor: .role(.surfaceBright),
  plainSurfaceContainerElevation: acmeElevation.level2,
  plainSurfaceShortcutColor: .role(.onSurfaceVariant),
  plainSurfaceSupportingTextColor: .role(.onSurface),
  richContainerColor: .role(.surfaceBright),
  richContainerElevation: acmeElevation.level2,
  richContainerGap: 4,
  richContainerInverse: 0,
  richContainerMaxWidth: 320,
  richContainerPaddingBlock: 12,
  richContainerPaddingInline: 16,
  richContainerShape: 8,
  richInverseContainerColor: .role(.inverseSurface),
  richInverseContainerElevation: acmeElevation.level0,
  richInverseSupportingTextColor: .role(.inverseOnSurface),
  richInverseTitleColor: .role(.inverseOnSurface),
  richSupportingTextColor: .role(.onSurfaceVariant),
  richSupportingTextTypescale: acmeTypescale.body,
  richTitleColor: .role(.onSurface),
  richTitleTypescale: acmeTypescale.heading6,
  timeoutTouch: 1500,
  windowMargin: 8
)

private let acmeTreeViewTokens = TanreiTreeViewTokens(
  containerShape: 6,
  guideColor: .role(.outlineVariant),
  guideWidth: 1,
  iconGap: 12,
  motionDisclosureDuration: 350,
  motionDisclosureEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  stickyContainerColor: .role(.surface),
  stickyDividerColor: .role(.outlineVariant),
  stickyDividerWidth: 1,
  supportingTextTypescale: acmeTypescale.bodySmall,
  trailingTextTypescale: acmeTypescale.bodySmall,
  conditions: TanreiTreeViewConditions(
    unselected: TanreiTreeViewConditionTokens(
      enabled: TanreiTreeViewConditionStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        chevronColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiTreeViewConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.06),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        chevronColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiTreeViewConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        chevronColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiTreeViewConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.2),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        chevronColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiTreeViewConditionStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        chevronColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      )
    ),
    selected: TanreiTreeViewConditionTokens(
      enabled: TanreiTreeViewConditionStateTokens(
        containerColor: .alpha(of: .role(.onSecondaryContainer), amount: 0.16),
        labelColor: .role(.onSecondaryContainer),
        supportingTextColor: .role(.onSecondaryContainer),
        trailingTextColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        chevronColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiTreeViewConditionStateTokens(
        containerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.06),
        labelColor: .role(.onSecondaryContainer),
        supportingTextColor: .role(.onSecondaryContainer),
        trailingTextColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        chevronColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiTreeViewConditionStateTokens(
        containerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12),
        labelColor: .role(.onSecondaryContainer),
        supportingTextColor: .role(.onSecondaryContainer),
        trailingTextColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        chevronColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiTreeViewConditionStateTokens(
        containerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.2),
        labelColor: .role(.onSecondaryContainer),
        supportingTextColor: .role(.onSecondaryContainer),
        trailingTextColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        chevronColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiTreeViewConditionStateTokens(
        containerColor: .alpha(of: .role(.onSecondaryContainer), amount: 0.16),
        labelColor: .role(.onSecondaryContainer),
        supportingTextColor: .role(.onSecondaryContainer),
        trailingTextColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        chevronColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      )
    )
  ),
  densitys: TanreiTreeViewDensitys(
    regular: TanreiTreeViewDensityTokens(
      containerHeight: 48,
      containerPaddingBlock: 12,
      containerPaddingInline: 12,
      containerGap: 12,
      levelIndent: 32,
      labelTypescale: acmeTypescale.body,
      iconSize: 20,
      chevronSize: 20
    ),
    compact: TanreiTreeViewDensityTokens(
      containerHeight: 32,
      containerPaddingBlock: 6,
      containerPaddingInline: 8,
      containerGap: 8,
      levelIndent: 24,
      labelTypescale: acmeTypescale.bodySmall,
      iconSize: 16,
      chevronSize: 16
    )
  ),
  hovered: TanreiTreeViewStateTokens(
    opacity: 1
  ),
  focused: TanreiTreeViewStateTokens(
    opacity: 1
  ),
  pressed: TanreiTreeViewStateTokens(
    opacity: 1
  ),
  disabled: TanreiTreeViewStateTokens(
    opacity: 0.38
  )
)

extension TanreiSystem {
  /// The "acme" design system.
  public static let acme = TanreiSystem(
    id: "acme",
    intents: [TanreiColorRole(rawValue: "accent"), .error, .info, .primary, .secondary, .success, .warning],
    colors: TanreiColorSchemes(
      light: acmeLightColors,
      lightMedium: acmeLightMediumColors,
      lightHigh: acmeLightHighColors,
      dark: acmeDarkColors,
      darkMedium: acmeDarkMediumColors,
      darkHigh: acmeDarkHighColors
    ),
    typescale: acmeTypescale,
    shape: TanreiShape(
      extraExtraLarge: 24,
      extraLarge: 16,
      extraLargeIncreased: 20,
      extraSmall: 3,
      full: 9999,
      large: 12,
      largeIncreased: 14,
      medium: 8,
      none: 0,
      small: 6,
      cornerSmoothing: 0
    ),
    space: TanreiSpace(
      space0: 0,
      space25: 2,
      space50: 4,
      space75: 6,
      space100: 8,
      space125: 10,
      space150: 12,
      space175: 14,
      space200: 16,
      space250: 20,
      space300: 24,
      space400: 32,
      space450: 36,
      space500: 40,
      space600: 48,
      space700: 56,
      space800: 64,
      space900: 72,
      extra: [
        "space1200": acmeSpaceSpace1200,
      ]
    ),
    state: TanreiState(
      disabledContainerOpacity: 0.12,
      disabledContentOpacity: 0.38,
      draggedStateLayerOpacity: 0.16,
      focusStateLayerOpacity: 0.12,
      hoverStateLayerOpacity: 0.06,
      pressedStateLayerOpacity: 0.2,
      selectedStateLayerOpacity: 0.16
    ),
    measure: TanreiMeasure(
      borderHairline: 1,
      borderThick: 2,
      breakpointExpanded: 1024,
      breakpointMedium: 600,
      focusInnerWidth: 0,
      focusOffset: 2,
      focusOuterWidth: 2,
      iconExtraSmall: 16,
      iconLarge: 32,
      iconMedium: 24,
      iconSmall: 20,
      targetPointer: 44,
      targetSpacing: 8,
      targetTouch: 48
    ),
    typefaces: acmeTypefaces,
    icon: TanreiIconStyle(
      families: TanreiIconFamilies(
        unselected: TanreiFontStack(families: ["Material Icons Outlined"], generic: .sansSerif, system: false),
        selected: TanreiFontStack(families: ["Material Icons"], generic: .sansSerif, system: false)
      ),
      weight: 400,
      markWeight: 400,
      fillUnselected: 0,
      fillSelected: 1,
      opticalSizeMin: 20,
      opticalSizeMax: 48
    ),
    behavior: TanreiBehavior(
      appearance: .fadeScale,
      dividerVisibility: .always,
      focusStyle: .glow,
      linkUnderline: .always,
      pressedFeedback: .overlay,
      requirementMark: .tag,
      separation: .divider
    ),
    motion: TanreiMotionTokens(
      duration: TanreiDuration(
        extraLong1: 700,
        extraLong2: 800,
        extraLong3: 900,
        extraLong4: 1000,
        long1: 450,
        long2: 500,
        long3: 550,
        long4: 600,
        medium1: 250,
        medium2: 300,
        medium3: 350,
        medium4: 400,
        pressHold: 100,
        short1: 50,
        short2: 100,
        short3: 150,
        short4: 200,
        stagger: 100
      ),
      easing: TanreiEasing(
        emphasizedAccelerate: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
        emphasizedDecelerate: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
        enter: TanreiCubicBezier(0.2, 0, 0, 1),
        exit: TanreiCubicBezier(0.3, 0, 1, 1),
        linear: TanreiCubicBezier(0, 0, 1, 1),
        spatial: TanreiCubicBezier(0.2, 0, 0, 1),
        standard: TanreiCubicBezier(0.2, 0, 0, 1),
        standardAccelerate: TanreiCubicBezier(0.3, 0, 1, 1),
        standardDecelerate: TanreiCubicBezier(0, 0, 0, 1),
        state: TanreiCubicBezier(0.2, 0, 0, 1)
      ),
      spring: TanreiSprings(
        expressive: TanreiSpringSet(
          defaultEffects: TanreiSpringSpec(damping: 1, stiffness: 1600, easing: TanreiCubicBezier(0.34, 0.8, 0.34, 1), durationMs: 200),
          defaultSpatial: TanreiSpringSpec(damping: 0.8, stiffness: 380, easing: TanreiCubicBezier(0.38, 1.21, 0.22, 1), durationMs: 500),
          fastEffects: TanreiSpringSpec(damping: 1, stiffness: 3800, easing: TanreiCubicBezier(0.31, 0.94, 0.34, 1), durationMs: 150),
          fastSpatial: TanreiSpringSpec(damping: 0.6, stiffness: 800, easing: TanreiCubicBezier(0.42, 1.67, 0.21, 0.9), durationMs: 350),
          slowEffects: TanreiSpringSpec(damping: 1, stiffness: 800, easing: TanreiCubicBezier(0.34, 0.88, 0.34, 1), durationMs: 300),
          slowSpatial: TanreiSpringSpec(damping: 0.8, stiffness: 200, easing: TanreiCubicBezier(0.39, 1.29, 0.35, 0.98), durationMs: 650),
          extra: [
            "bouncy": acmeSpringExpressiveBouncy,
          ]
        ),
        standard: TanreiSpringSet(
          defaultEffects: TanreiSpringSpec(damping: 1, stiffness: 1600, easing: TanreiCubicBezier(0.34, 0.8, 0.34, 1), durationMs: 200),
          defaultSpatial: TanreiSpringSpec(damping: 0.9, stiffness: 700, easing: TanreiCubicBezier(0.27, 1.06, 0.18, 1), durationMs: 500),
          fastEffects: TanreiSpringSpec(damping: 1, stiffness: 3800, easing: TanreiCubicBezier(0.31, 0.94, 0.34, 1), durationMs: 150),
          fastSpatial: TanreiSpringSpec(damping: 0.9, stiffness: 1400, easing: TanreiCubicBezier(0.27, 1.06, 0.18, 1), durationMs: 350),
          slowEffects: TanreiSpringSpec(damping: 1, stiffness: 800, easing: TanreiCubicBezier(0.34, 0.88, 0.34, 1), durationMs: 300),
          slowSpatial: TanreiSpringSpec(damping: 0.9, stiffness: 300, easing: TanreiCubicBezier(0.27, 1.06, 0.18, 1), durationMs: 750),
          extra: [
            "bouncy": acmeSpringStandardBouncy,
          ]
        )
      )
    ),
    elevation: acmeElevation,
    accordion: acmeAccordionTokens,
    appBar: acmeAppBarTokens,
    appShell: acmeAppShellTokens,
    avatar: acmeAvatarTokens,
    badge: acmeBadgeTokens,
    bottomSheet: acmeBottomSheetTokens,
    breadcrumbs: acmeBreadcrumbsTokens,
    buttonGroup: acmeButtonGroupTokens,
    buttonWithMenu: acmeButtonWithMenuTokens,
    button: acmeButtonTokens,
    calendar: acmeCalendarTokens,
    callout: acmeCalloutTokens,
    card: acmeCardTokens,
    carousel: acmeCarouselTokens,
    chatComposer: acmeChatComposerTokens,
    checkbox: acmeCheckboxTokens,
    chip: acmeChipTokens,
    codeBlock: acmeCodeBlockTokens,
    colorInput: acmeColorInputTokens,
    combobox: acmeComboboxTokens,
    copyButton: acmeCopyButtonTokens,
    dateTimePicker: acmeDateTimePickerTokens,
    descriptionList: acmeDescriptionListTokens,
    dialog: acmeDialogTokens,
    divider: acmeDividerTokens,
    dropZone: acmeDropZoneTokens,
    embeddedTextInput: acmeEmbeddedTextInputTokens,
    emptyState: acmeEmptyStateTokens,
    fabMenu: acmeFabMenuTokens,
    fieldGroup: acmeFieldGroupTokens,
    field: acmeFieldTokens,
    figure: acmeFigureTokens,
    fileItem: acmeFileItemTokens,
    filePicker: acmeFilePickerTokens,
    fileUpload: acmeFileUploadTokens,
    imagePreview: acmeImagePreviewTokens,
    inlineCode: acmeInlineCodeTokens,
    inputBox: acmeInputBoxTokens,
    keyboardShortcut: acmeKeyboardShortcutTokens,
    linkCard: acmeLinkCardTokens,
    link: acmeLinkTokens,
    listRow: acmeListRowTokens,
    list: acmeListTokens,
    loadingIndicator: acmeLoadingIndicatorTokens,
    mainActionButton: acmeMainActionButtonTokens,
    menu: acmeMenuTokens,
    menubar: acmeMenubarTokens,
    modalLayer: acmeModalLayerTokens,
    navigationBar: acmeNavigationBarTokens,
    navigationDrawer: acmeNavigationDrawerTokens,
    numberInput: acmeNumberInputTokens,
    oneTimeCodeInput: acmeOneTimeCodeInputTokens,
    pageHeader: acmePageHeaderTokens,
    pagination: acmePaginationTokens,
    popover: acmePopoverTokens,
    previousNextLinks: acmePreviousNextLinksTokens,
    progressIndicator: acmeProgressIndicatorTokens,
    prose: acmeProseTokens,
    radioButton: acmeRadioButtonTokens,
    search: acmeSearchTokens,
    segmentedButton: acmeSegmentedButtonTokens,
    select: acmeSelectTokens,
    sideSheet: acmeSideSheetTokens,
    skeleton: acmeSkeletonTokens,
    slider: acmeSliderTokens,
    snackbar: acmeSnackbarTokens,
    stepper: acmeStepperTokens,
    steps: acmeStepsTokens,
    swatch: acmeSwatchTokens,
    switch: acmeSwitchTokens,
    tabView: acmeTabViewTokens,
    tableOfContents: acmeTableOfContentsTokens,
    table: acmeTableTokens,
    tabs: acmeTabsTokens,
    tagGroup: acmeTagGroupTokens,
    tag: acmeTagTokens,
    textInput: acmeTextInputTokens,
    timeline: acmeTimelineTokens,
    toolbar: acmeToolbarTokens,
    tooltip: acmeTooltipTokens,
    treeView: acmeTreeViewTokens
  )
}

// ── Vocabulary extensions of "acme" ────────────────────────────────────────
// Typed names for what this design system adds to Tanrei: steps, color roles and component values it
// declared, and the tokens of its own namespace. Everything above has the shape of every design system.

extension TanreiSpace {
  /// The `space1200` step "acme" adds to space. Read from a design system that does not have it, this is
  /// the value "acme" gives it (reported in debug builds).
  public var space1200: CGFloat {
    if let value = self["space1200"] { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no space step \"space1200\"; using the value of \"acme\"")
    return acmeSpaceSpace1200
  }
}

extension TanreiSpringSet {
  /// The `bouncy` spring "acme" adds. Read from a scheme or a design system that does not have it, this is
  /// the value "acme" gives it in `expressive` (reported in debug builds).
  public var bouncy: TanreiSpringSpec {
    if let value = self["bouncy"] { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no spring \"bouncy\"; using the value of \"acme\"")
    return acmeSpringExpressiveBouncy
  }
}

extension TanreiColorRole {
  /// The `brand-glow` role "acme" adds; content on it uses `on-surface`.
  public static let brandGlow = TanreiColorRole(rawValue: "brand-glow")
}

extension TanreiButtonSize {
  /// The `3x` size "acme" adds to button.
  public static let size3x = TanreiButtonSize(rawValue: "3x")
}

extension TanreiButtonVariant {
  /// The `danger` variant "acme" adds to button.
  public static let danger = TanreiButtonVariant(rawValue: "danger")
}

/// The tokens "acme" declares in its own namespace. They are not part of `TanreiSystem`.
/// Draw a color with `colors[paint]` from `@TanreiPalette`, so it follows the scheme.
public struct AcmeTokens: Sendable, Equatable {
  public var rating: AcmeRatingTokens

  public init(
    rating: AcmeRatingTokens
  ) {
    self.rating = rating
  }
}

public struct AcmeRatingTokens: Sendable, Equatable {
  /// `acme.comp.rating.gap`
  public var gap: CGFloat
  public var star: AcmeRatingStarTokens

  public init(
    gap: CGFloat,
    star: AcmeRatingStarTokens
  ) {
    self.gap = gap
    self.star = star
  }
}

public struct AcmeRatingStarTokens: Sendable, Equatable {
  /// `acme.comp.rating.star.color`
  public var color: TanreiPaint
  /// `acme.comp.rating.star.size`
  public var size: CGFloat

  public init(
    color: TanreiPaint,
    size: CGFloat
  ) {
    self.color = color
    self.size = size
  }
}

extension AcmeTokens {
  /// The values of "acme"'s own tokens in the "acme" design system.
  public static let acme = AcmeTokens(
    rating: AcmeRatingTokens(
      gap: 4,
      star: AcmeRatingStarTokens(
        color: .role(.warning),
        size: 20
      )
    )
  )
}
