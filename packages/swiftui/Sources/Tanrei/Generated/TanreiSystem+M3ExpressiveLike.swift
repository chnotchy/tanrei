// GENERATED FILE — DO NOT EDIT.
// Source: tokens/ (DTCG 2025.10). Regenerate with `pnpm generate`.
// System values of "m3-expressive-like". Generated the same way for every system; the types are in TanreiTokens.swift.
// swiftlint:disable all

import SwiftUI

private let m3ExpressiveLikeTypescaleDisplayLarge: TanreiTextStyle = TanreiTextStyle(font: TanreiFontStack(families: ["Roboto"], generic: .sansSerif, system: false), size: 57, weight: 400, tracking: -0.25, lineHeight: 64, family: .display)

private let m3ExpressiveLikeTypescaleDisplaySmall: TanreiTextStyle = TanreiTextStyle(font: TanreiFontStack(families: ["Roboto"], generic: .sansSerif, system: false), size: 36, weight: 400, tracking: 0, lineHeight: 44, family: .display)

private let m3ExpressiveLikeTypefaces = TanreiTypefaces(
  brand: TanreiFontStack(families: ["Roboto"], generic: .sansSerif, system: false),
  plain: TanreiFontStack(families: ["Roboto"], generic: .sansSerif, system: false),
  mono: TanreiFontStack(families: ["Roboto Mono"], generic: .monospace, system: false),
  icon: TanreiFontStack(families: ["Material Symbols Outlined"], generic: .sansSerif, system: false)
)

private let m3ExpressiveLikeTypescale = TanreiTypescale(
  body: TanreiTextStyle(font: m3ExpressiveLikeTypefaces.brand, size: 14, weight: 400, tracking: 0.25, lineHeight: 20, family: .body),
  bodyLarge: TanreiTextStyle(font: m3ExpressiveLikeTypefaces.brand, size: 16, weight: 400, tracking: 0.5, lineHeight: 24, family: .body),
  bodySmall: TanreiTextStyle(font: m3ExpressiveLikeTypefaces.brand, size: 12, weight: 400, tracking: 0.3996, lineHeight: 16, family: .body),
  caption: TanreiTextStyle(font: m3ExpressiveLikeTypefaces.brand, size: 11, weight: 500, tracking: 0.5005, lineHeight: 16, family: .label),
  code: TanreiTextStyle(font: m3ExpressiveLikeTypefaces.mono, size: 13, weight: 400, tracking: 0, lineHeight: 20, family: .label),
  codeSmall: TanreiTextStyle(font: m3ExpressiveLikeTypefaces.mono, size: 12, weight: 400, tracking: 0, lineHeight: 16, family: .label),
  display: TanreiTextStyle(font: m3ExpressiveLikeTypefaces.brand, size: 45, weight: 400, tracking: 0, lineHeight: 52, family: .display),
  eyebrow: TanreiTextStyle(font: m3ExpressiveLikeTypefaces.brand, size: 12, weight: 500, tracking: 0.96, lineHeight: 16, family: .label),
  heading1: TanreiTextStyle(font: m3ExpressiveLikeTypefaces.brand, size: 32, weight: 400, tracking: 0, lineHeight: 40, family: .heading),
  heading2: TanreiTextStyle(font: m3ExpressiveLikeTypefaces.brand, size: 28, weight: 400, tracking: 0, lineHeight: 36, family: .heading),
  heading3: TanreiTextStyle(font: m3ExpressiveLikeTypefaces.brand, size: 24, weight: 400, tracking: 0, lineHeight: 32, family: .heading),
  heading4: TanreiTextStyle(font: m3ExpressiveLikeTypefaces.brand, size: 22, weight: 400, tracking: 0, lineHeight: 28, family: .heading),
  heading5: TanreiTextStyle(font: m3ExpressiveLikeTypefaces.brand, size: 16, weight: 500, tracking: 0.1504, lineHeight: 24, family: .heading),
  heading6: TanreiTextStyle(font: m3ExpressiveLikeTypefaces.brand, size: 14, weight: 500, tracking: 0.1, lineHeight: 20, family: .heading),
  label: TanreiTextStyle(font: m3ExpressiveLikeTypefaces.brand, size: 14, weight: 500, tracking: 0.1, lineHeight: 20, family: .label),
  labelSmall: TanreiTextStyle(font: m3ExpressiveLikeTypefaces.brand, size: 12, weight: 500, tracking: 0.5004, lineHeight: 16, family: .label),
  emphasis: TanreiTypeEmphasis(
    display: 100,
    heading: 100,
    body: 100,
    label: 200
  ),
  extra: [
    "display-large": m3ExpressiveLikeTypescaleDisplayLarge,
    "display-small": m3ExpressiveLikeTypescaleDisplaySmall,
  ]
)

private let m3ExpressiveLikeElevation = TanreiElevation(
  level0: [],
  level1: [
    TanreiShadowLayer(x: 0, y: 1, blur: 2, spread: 0, role: .elevationShadow3),
    TanreiShadowLayer(x: 0, y: 1, blur: 3, spread: 1, role: .elevationShadow1),
  ],
  level2: [
    TanreiShadowLayer(x: 0, y: 1, blur: 2, spread: 0, role: .elevationShadow3),
    TanreiShadowLayer(x: 0, y: 2, blur: 6, spread: 2, role: .elevationShadow1),
  ],
  level3: [
    TanreiShadowLayer(x: 0, y: 1, blur: 3, spread: 0, role: .elevationShadow3),
    TanreiShadowLayer(x: 0, y: 4, blur: 8, spread: 3, role: .elevationShadow1),
  ],
  level4: [
    TanreiShadowLayer(x: 0, y: 2, blur: 3, spread: 0, role: .elevationShadow3),
    TanreiShadowLayer(x: 0, y: 6, blur: 10, spread: 4, role: .elevationShadow1),
  ],
  level5: [
    TanreiShadowLayer(x: 0, y: 4, blur: 4, spread: 0, role: .elevationShadow3),
    TanreiShadowLayer(x: 0, y: 8, blur: 12, spread: 6, role: .elevationShadow1),
  ]
)

private let m3ExpressiveLikeLightColors = TanreiColors(scheme: .light, values: [
  TanreiColorRole(rawValue: "background"): TanreiColorValue(red: 0.9961, green: 0.9686, blue: 1, opacity: 1),
  .elevationRing: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .elevationShadow1: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.15),
  .elevationShadow2: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.15),
  .elevationShadow3: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.3),
  .error: TanreiColorValue(red: 0.702, green: 0.149, blue: 0.1176, opacity: 1),
  .errorContainer: TanreiColorValue(red: 0.9765, green: 0.8706, blue: 0.8627, opacity: 1),
  .focusRing: TanreiColorValue(red: 0.3843, green: 0.3569, blue: 0.4431, opacity: 1),
  .focusRingInner: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .info: TanreiColorValue(red: 0.1216, green: 0.3529, blue: 0.7451, opacity: 1),
  .infoContainer: TanreiColorValue(red: 0.851, green: 0.8863, blue: 1, opacity: 1),
  .inverseLink: TanreiColorValue(red: 0.8157, green: 0.7373, blue: 1, opacity: 1),
  .inverseOnSurface: TanreiColorValue(red: 0.9608, green: 0.9373, blue: 0.9686, opacity: 1),
  .inversePrimary: TanreiColorValue(red: 0.8157, green: 0.7373, blue: 1, opacity: 1),
  .inverseSurface: TanreiColorValue(red: 0.1961, green: 0.1843, blue: 0.2078, opacity: 1),
  .link: TanreiColorValue(red: 0.4039, green: 0.3137, blue: 0.6431, opacity: 1),
  TanreiColorRole(rawValue: "on-background"): TanreiColorValue(red: 0.1137, green: 0.1059, blue: 0.1255, opacity: 1),
  .onError: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onErrorContainer: TanreiColorValue(red: 0.2549, green: 0.0549, blue: 0.0431, opacity: 1),
  .onInfo: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onInfoContainer: TanreiColorValue(red: 0, green: 0.098, blue: 0.2667, opacity: 1),
  .onPrimary: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onPrimaryContainer: TanreiColorValue(red: 0.1294, green: 0, blue: 0.3647, opacity: 1),
  TanreiColorRole(rawValue: "on-primary-fixed"): TanreiColorValue(red: 0.1294, green: 0, blue: 0.3647, opacity: 1),
  TanreiColorRole(rawValue: "on-primary-fixed-variant"): TanreiColorValue(red: 0.3098, green: 0.2157, blue: 0.5451, opacity: 1),
  .onSecondary: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSecondaryContainer: TanreiColorValue(red: 0.1137, green: 0.098, blue: 0.1686, opacity: 1),
  TanreiColorRole(rawValue: "on-secondary-fixed"): TanreiColorValue(red: 0.1137, green: 0.098, blue: 0.1686, opacity: 1),
  TanreiColorRole(rawValue: "on-secondary-fixed-variant"): TanreiColorValue(red: 0.2902, green: 0.2667, blue: 0.3451, opacity: 1),
  .onSuccess: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSuccessContainer: TanreiColorValue(red: 0, green: 0.1294, blue: 0.0314, opacity: 1),
  .onSurface: TanreiColorValue(red: 0.1137, green: 0.1059, blue: 0.1255, opacity: 1),
  .onSurfaceVariant: TanreiColorValue(red: 0.2863, green: 0.2706, blue: 0.3098, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary"): TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary-container"): TanreiColorValue(red: 0.1922, green: 0.0667, blue: 0.1137, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary-fixed"): TanreiColorValue(red: 0.1922, green: 0.0667, blue: 0.1137, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary-fixed-variant"): TanreiColorValue(red: 0.3882, green: 0.2314, blue: 0.2824, opacity: 1),
  .onWarning: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onWarningContainer: TanreiColorValue(red: 0.1725, green: 0.0863, blue: 0, opacity: 1),
  .outline: TanreiColorValue(red: 0.4745, green: 0.4549, blue: 0.4941, opacity: 1),
  .outlineVariant: TanreiColorValue(red: 0.7922, green: 0.7686, blue: 0.8157, opacity: 1),
  .primary: TanreiColorValue(red: 0.4039, green: 0.3137, blue: 0.6431, opacity: 1),
  .primaryContainer: TanreiColorValue(red: 0.9176, green: 0.8667, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "primary-fixed"): TanreiColorValue(red: 0.9176, green: 0.8667, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "primary-fixed-dim"): TanreiColorValue(red: 0.8157, green: 0.7373, blue: 1, opacity: 1),
  .scrim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.32),
  .secondary: TanreiColorValue(red: 0.3843, green: 0.3569, blue: 0.4431, opacity: 1),
  .secondaryContainer: TanreiColorValue(red: 0.9098, green: 0.8706, blue: 0.9725, opacity: 1),
  TanreiColorRole(rawValue: "secondary-fixed"): TanreiColorValue(red: 0.9098, green: 0.8706, blue: 0.9725, opacity: 1),
  TanreiColorRole(rawValue: "secondary-fixed-dim"): TanreiColorValue(red: 0.8, green: 0.7608, blue: 0.8627, opacity: 1),
  .shadow: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .success: TanreiColorValue(red: 0, green: 0.4314, blue: 0.1686, opacity: 1),
  .successContainer: TanreiColorValue(red: 0.5804, green: 0.9765, blue: 0.6235, opacity: 1),
  .surface: TanreiColorValue(red: 0.9961, green: 0.9686, blue: 1, opacity: 1),
  .surfaceBright: TanreiColorValue(red: 0.9961, green: 0.9686, blue: 1, opacity: 1),
  .surfaceContainer: TanreiColorValue(red: 0.9529, green: 0.9294, blue: 0.9686, opacity: 1),
  .surfaceContainerHigh: TanreiColorValue(red: 0.9255, green: 0.902, blue: 0.9412, opacity: 1),
  .surfaceContainerHighest: TanreiColorValue(red: 0.902, green: 0.8784, blue: 0.9137, opacity: 1),
  .surfaceContainerLow: TanreiColorValue(red: 0.9686, green: 0.949, blue: 0.9804, opacity: 1),
  .surfaceContainerLowest: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .surfaceDim: TanreiColorValue(red: 0.8706, green: 0.8471, blue: 0.8824, opacity: 1),
  TanreiColorRole(rawValue: "surface-tint"): TanreiColorValue(red: 0.4039, green: 0.3137, blue: 0.6431, opacity: 1),
  .surfaceVariant: TanreiColorValue(red: 0.9059, green: 0.8784, blue: 0.9255, opacity: 1),
  TanreiColorRole(rawValue: "tertiary"): TanreiColorValue(red: 0.4902, green: 0.3216, blue: 0.3765, opacity: 1),
  TanreiColorRole(rawValue: "tertiary-container"): TanreiColorValue(red: 1, green: 0.8471, blue: 0.8941, opacity: 1),
  TanreiColorRole(rawValue: "tertiary-fixed"): TanreiColorValue(red: 1, green: 0.8471, blue: 0.8941, opacity: 1),
  TanreiColorRole(rawValue: "tertiary-fixed-dim"): TanreiColorValue(red: 0.9373, green: 0.7216, blue: 0.7843, opacity: 1),
  .warning: TanreiColorValue(red: 0.5412, green: 0.3176, blue: 0, opacity: 1),
  .warningContainer: TanreiColorValue(red: 1, green: 0.8627, blue: 0.7412, opacity: 1),
])

private let m3ExpressiveLikeLightMediumColors = TanreiColors(scheme: .lightMedium, values: [
  TanreiColorRole(rawValue: "background"): TanreiColorValue(red: 0.9961, green: 0.9686, blue: 1, opacity: 1),
  .elevationRing: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .elevationShadow1: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.15),
  .elevationShadow2: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.15),
  .elevationShadow3: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.3),
  .error: TanreiColorValue(red: 0.549, green: 0.1137, blue: 0.0941, opacity: 1),
  .errorContainer: TanreiColorValue(red: 0.9765, green: 0.8706, blue: 0.8627, opacity: 1),
  .focusRing: TanreiColorValue(red: 0.2902, green: 0.2667, blue: 0.3451, opacity: 1),
  .focusRingInner: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .info: TanreiColorValue(red: 0, green: 0.2588, blue: 0.6078, opacity: 1),
  .infoContainer: TanreiColorValue(red: 0.851, green: 0.8863, blue: 1, opacity: 1),
  .inverseLink: TanreiColorValue(red: 0.8627, green: 0.8039, blue: 1, opacity: 1),
  .inverseOnSurface: TanreiColorValue(red: 0.9608, green: 0.9373, blue: 0.9686, opacity: 1),
  .inversePrimary: TanreiColorValue(red: 0.8627, green: 0.8039, blue: 1, opacity: 1),
  .inverseSurface: TanreiColorValue(red: 0.1961, green: 0.1843, blue: 0.2078, opacity: 1),
  .link: TanreiColorValue(red: 0.3098, green: 0.2157, blue: 0.5451, opacity: 1),
  TanreiColorRole(rawValue: "on-background"): TanreiColorValue(red: 0.1137, green: 0.1059, blue: 0.1255, opacity: 1),
  .onError: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onErrorContainer: TanreiColorValue(red: 0.2549, green: 0.0549, blue: 0.0431, opacity: 1),
  .onInfo: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onInfoContainer: TanreiColorValue(red: 0, green: 0.098, blue: 0.2667, opacity: 1),
  .onPrimary: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onPrimaryContainer: TanreiColorValue(red: 0.1294, green: 0, blue: 0.3647, opacity: 1),
  TanreiColorRole(rawValue: "on-primary-fixed"): TanreiColorValue(red: 0.1294, green: 0, blue: 0.3647, opacity: 1),
  TanreiColorRole(rawValue: "on-primary-fixed-variant"): TanreiColorValue(red: 0.3098, green: 0.2157, blue: 0.5451, opacity: 1),
  .onSecondary: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSecondaryContainer: TanreiColorValue(red: 0.1137, green: 0.098, blue: 0.1686, opacity: 1),
  TanreiColorRole(rawValue: "on-secondary-fixed"): TanreiColorValue(red: 0.1137, green: 0.098, blue: 0.1686, opacity: 1),
  TanreiColorRole(rawValue: "on-secondary-fixed-variant"): TanreiColorValue(red: 0.2902, green: 0.2667, blue: 0.3451, opacity: 1),
  .onSuccess: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSuccessContainer: TanreiColorValue(red: 0, green: 0.1294, blue: 0.0314, opacity: 1),
  .onSurface: TanreiColorValue(red: 0.0784, green: 0.0706, blue: 0.0941, opacity: 1),
  .onSurfaceVariant: TanreiColorValue(red: 0.2392, green: 0.2275, blue: 0.2627, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary"): TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary-container"): TanreiColorValue(red: 0.1922, green: 0.0667, blue: 0.1137, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary-fixed"): TanreiColorValue(red: 0.1922, green: 0.0667, blue: 0.1137, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary-fixed-variant"): TanreiColorValue(red: 0.3882, green: 0.2314, blue: 0.2824, opacity: 1),
  .onWarning: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onWarningContainer: TanreiColorValue(red: 0.1725, green: 0.0863, blue: 0, opacity: 1),
  .outline: TanreiColorValue(red: 0.3765, green: 0.3647, blue: 0.4, opacity: 1),
  .outlineVariant: TanreiColorValue(red: 0.6824, green: 0.6627, blue: 0.7059, opacity: 1),
  .primary: TanreiColorValue(red: 0.3098, green: 0.2157, blue: 0.5451, opacity: 1),
  .primaryContainer: TanreiColorValue(red: 0.9176, green: 0.8667, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "primary-fixed"): TanreiColorValue(red: 0.9176, green: 0.8667, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "primary-fixed-dim"): TanreiColorValue(red: 0.8157, green: 0.7373, blue: 1, opacity: 1),
  .scrim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.32),
  .secondary: TanreiColorValue(red: 0.2902, green: 0.2667, blue: 0.3451, opacity: 1),
  .secondaryContainer: TanreiColorValue(red: 0.9098, green: 0.8706, blue: 0.9725, opacity: 1),
  TanreiColorRole(rawValue: "secondary-fixed"): TanreiColorValue(red: 0.9098, green: 0.8706, blue: 0.9725, opacity: 1),
  TanreiColorRole(rawValue: "secondary-fixed-dim"): TanreiColorValue(red: 0.8, green: 0.7608, blue: 0.8627, opacity: 1),
  .shadow: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .success: TanreiColorValue(red: 0, green: 0.3255, blue: 0.1176, opacity: 1),
  .successContainer: TanreiColorValue(red: 0.5804, green: 0.9765, blue: 0.6235, opacity: 1),
  .surface: TanreiColorValue(red: 0.9961, green: 0.9686, blue: 1, opacity: 1),
  .surfaceBright: TanreiColorValue(red: 0.9961, green: 0.9686, blue: 1, opacity: 1),
  .surfaceContainer: TanreiColorValue(red: 0.9529, green: 0.9294, blue: 0.9686, opacity: 1),
  .surfaceContainerHigh: TanreiColorValue(red: 0.9255, green: 0.902, blue: 0.9412, opacity: 1),
  .surfaceContainerHighest: TanreiColorValue(red: 0.902, green: 0.8784, blue: 0.9137, opacity: 1),
  .surfaceContainerLow: TanreiColorValue(red: 0.9686, green: 0.949, blue: 0.9804, opacity: 1),
  .surfaceContainerLowest: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .surfaceDim: TanreiColorValue(red: 0.8706, green: 0.8471, blue: 0.8824, opacity: 1),
  TanreiColorRole(rawValue: "surface-tint"): TanreiColorValue(red: 0.4039, green: 0.3137, blue: 0.6431, opacity: 1),
  .surfaceVariant: TanreiColorValue(red: 0.9059, green: 0.8784, blue: 0.9255, opacity: 1),
  TanreiColorRole(rawValue: "tertiary"): TanreiColorValue(red: 0.3882, green: 0.2314, blue: 0.2824, opacity: 1),
  TanreiColorRole(rawValue: "tertiary-container"): TanreiColorValue(red: 1, green: 0.8471, blue: 0.8941, opacity: 1),
  TanreiColorRole(rawValue: "tertiary-fixed"): TanreiColorValue(red: 1, green: 0.8471, blue: 0.8941, opacity: 1),
  TanreiColorRole(rawValue: "tertiary-fixed-dim"): TanreiColorValue(red: 0.9373, green: 0.7216, blue: 0.7843, opacity: 1),
  .warning: TanreiColorValue(red: 0.4078, green: 0.2353, blue: 0, opacity: 1),
  .warningContainer: TanreiColorValue(red: 1, green: 0.8627, blue: 0.7412, opacity: 1),
])

private let m3ExpressiveLikeLightHighColors = TanreiColors(scheme: .lightHigh, values: [
  TanreiColorRole(rawValue: "background"): TanreiColorValue(red: 0.9961, green: 0.9686, blue: 1, opacity: 1),
  .elevationRing: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .elevationShadow1: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.15),
  .elevationShadow2: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.15),
  .elevationShadow3: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.3),
  .error: TanreiColorValue(red: 0.3765, green: 0.0784, blue: 0.0627, opacity: 1),
  .errorContainer: TanreiColorValue(red: 0.9765, green: 0.8706, blue: 0.8627, opacity: 1),
  .focusRing: TanreiColorValue(red: 0.2, green: 0.1765, blue: 0.2549, opacity: 1),
  .focusRingInner: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .info: TanreiColorValue(red: 0, green: 0.1765, blue: 0.4314, opacity: 1),
  .infoContainer: TanreiColorValue(red: 0.851, green: 0.8863, blue: 1, opacity: 1),
  .inverseLink: TanreiColorValue(red: 0.9176, green: 0.8667, blue: 1, opacity: 1),
  .inverseOnSurface: TanreiColorValue(red: 0.9608, green: 0.9373, blue: 0.9686, opacity: 1),
  .inversePrimary: TanreiColorValue(red: 0.9176, green: 0.8667, blue: 1, opacity: 1),
  .inverseSurface: TanreiColorValue(red: 0.1961, green: 0.1843, blue: 0.2078, opacity: 1),
  .link: TanreiColorValue(red: 0.2196, green: 0.1176, blue: 0.4471, opacity: 1),
  TanreiColorRole(rawValue: "on-background"): TanreiColorValue(red: 0.1137, green: 0.1059, blue: 0.1255, opacity: 1),
  .onError: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onErrorContainer: TanreiColorValue(red: 0.2549, green: 0.0549, blue: 0.0431, opacity: 1),
  .onInfo: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onInfoContainer: TanreiColorValue(red: 0, green: 0.098, blue: 0.2667, opacity: 1),
  .onPrimary: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onPrimaryContainer: TanreiColorValue(red: 0.1294, green: 0, blue: 0.3647, opacity: 1),
  TanreiColorRole(rawValue: "on-primary-fixed"): TanreiColorValue(red: 0.1294, green: 0, blue: 0.3647, opacity: 1),
  TanreiColorRole(rawValue: "on-primary-fixed-variant"): TanreiColorValue(red: 0.3098, green: 0.2157, blue: 0.5451, opacity: 1),
  .onSecondary: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSecondaryContainer: TanreiColorValue(red: 0.1137, green: 0.098, blue: 0.1686, opacity: 1),
  TanreiColorRole(rawValue: "on-secondary-fixed"): TanreiColorValue(red: 0.1137, green: 0.098, blue: 0.1686, opacity: 1),
  TanreiColorRole(rawValue: "on-secondary-fixed-variant"): TanreiColorValue(red: 0.2902, green: 0.2667, blue: 0.3451, opacity: 1),
  .onSuccess: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSuccessContainer: TanreiColorValue(red: 0, green: 0.1294, blue: 0.0314, opacity: 1),
  .onSurface: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .onSurfaceVariant: TanreiColorValue(red: 0.1529, green: 0.1412, blue: 0.1765, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary"): TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary-container"): TanreiColorValue(red: 0.1922, green: 0.0667, blue: 0.1137, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary-fixed"): TanreiColorValue(red: 0.1922, green: 0.0667, blue: 0.1137, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary-fixed-variant"): TanreiColorValue(red: 0.3882, green: 0.2314, blue: 0.2824, opacity: 1),
  .onWarning: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onWarningContainer: TanreiColorValue(red: 0.1725, green: 0.0863, blue: 0, opacity: 1),
  .outline: TanreiColorValue(red: 0.2863, green: 0.2706, blue: 0.3098, opacity: 1),
  .outlineVariant: TanreiColorValue(red: 0.4745, green: 0.4549, blue: 0.4941, opacity: 1),
  .primary: TanreiColorValue(red: 0.2196, green: 0.1176, blue: 0.4471, opacity: 1),
  .primaryContainer: TanreiColorValue(red: 0.9176, green: 0.8667, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "primary-fixed"): TanreiColorValue(red: 0.9176, green: 0.8667, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "primary-fixed-dim"): TanreiColorValue(red: 0.8157, green: 0.7373, blue: 1, opacity: 1),
  .scrim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.32),
  .secondary: TanreiColorValue(red: 0.2, green: 0.1765, blue: 0.2549, opacity: 1),
  .secondaryContainer: TanreiColorValue(red: 0.9098, green: 0.8706, blue: 0.9725, opacity: 1),
  TanreiColorRole(rawValue: "secondary-fixed"): TanreiColorValue(red: 0.9098, green: 0.8706, blue: 0.9725, opacity: 1),
  TanreiColorRole(rawValue: "secondary-fixed-dim"): TanreiColorValue(red: 0.8, green: 0.7608, blue: 0.8627, opacity: 1),
  .shadow: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .success: TanreiColorValue(red: 0, green: 0.2235, blue: 0.0745, opacity: 1),
  .successContainer: TanreiColorValue(red: 0.5804, green: 0.9765, blue: 0.6235, opacity: 1),
  .surface: TanreiColorValue(red: 0.9961, green: 0.9686, blue: 1, opacity: 1),
  .surfaceBright: TanreiColorValue(red: 0.9961, green: 0.9686, blue: 1, opacity: 1),
  .surfaceContainer: TanreiColorValue(red: 0.9529, green: 0.9294, blue: 0.9686, opacity: 1),
  .surfaceContainerHigh: TanreiColorValue(red: 0.9255, green: 0.902, blue: 0.9412, opacity: 1),
  .surfaceContainerHighest: TanreiColorValue(red: 0.902, green: 0.8784, blue: 0.9137, opacity: 1),
  .surfaceContainerLow: TanreiColorValue(red: 0.9686, green: 0.949, blue: 0.9804, opacity: 1),
  .surfaceContainerLowest: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .surfaceDim: TanreiColorValue(red: 0.8706, green: 0.8471, blue: 0.8824, opacity: 1),
  TanreiColorRole(rawValue: "surface-tint"): TanreiColorValue(red: 0.4039, green: 0.3137, blue: 0.6431, opacity: 1),
  .surfaceVariant: TanreiColorValue(red: 0.9059, green: 0.8784, blue: 0.9255, opacity: 1),
  TanreiColorRole(rawValue: "tertiary"): TanreiColorValue(red: 0.2863, green: 0.1451, blue: 0.1961, opacity: 1),
  TanreiColorRole(rawValue: "tertiary-container"): TanreiColorValue(red: 1, green: 0.8471, blue: 0.8941, opacity: 1),
  TanreiColorRole(rawValue: "tertiary-fixed"): TanreiColorValue(red: 1, green: 0.8471, blue: 0.8941, opacity: 1),
  TanreiColorRole(rawValue: "tertiary-fixed-dim"): TanreiColorValue(red: 0.9373, green: 0.7216, blue: 0.7843, opacity: 1),
  .warning: TanreiColorValue(red: 0.2863, green: 0.1608, blue: 0, opacity: 1),
  .warningContainer: TanreiColorValue(red: 1, green: 0.8627, blue: 0.7412, opacity: 1),
])

private let m3ExpressiveLikeDarkColors = TanreiColors(scheme: .dark, values: [
  TanreiColorRole(rawValue: "background"): TanreiColorValue(red: 0.0784, green: 0.0706, blue: 0.0941, opacity: 1),
  .elevationRing: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .elevationShadow1: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.15),
  .elevationShadow2: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.15),
  .elevationShadow3: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.3),
  .error: TanreiColorValue(red: 0.949, green: 0.7216, blue: 0.7098, opacity: 1),
  .errorContainer: TanreiColorValue(red: 0.549, green: 0.1137, blue: 0.0941, opacity: 1),
  .focusRing: TanreiColorValue(red: 0.8, green: 0.7608, blue: 0.8627, opacity: 1),
  .focusRingInner: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .info: TanreiColorValue(red: 0.6902, green: 0.7765, blue: 1, opacity: 1),
  .infoContainer: TanreiColorValue(red: 0, green: 0.2588, blue: 0.6078, opacity: 1),
  .inverseLink: TanreiColorValue(red: 0.4039, green: 0.3137, blue: 0.6431, opacity: 1),
  .inverseOnSurface: TanreiColorValue(red: 0.1961, green: 0.1843, blue: 0.2078, opacity: 1),
  .inversePrimary: TanreiColorValue(red: 0.4039, green: 0.3137, blue: 0.6431, opacity: 1),
  .inverseSurface: TanreiColorValue(red: 0.902, green: 0.8784, blue: 0.9137, opacity: 1),
  .link: TanreiColorValue(red: 0.8157, green: 0.7373, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "on-background"): TanreiColorValue(red: 0.902, green: 0.8784, blue: 0.9137, opacity: 1),
  .onError: TanreiColorValue(red: 0.3765, green: 0.0784, blue: 0.0627, opacity: 1),
  .onErrorContainer: TanreiColorValue(red: 0.9765, green: 0.8706, blue: 0.8627, opacity: 1),
  .onInfo: TanreiColorValue(red: 0, green: 0.1765, blue: 0.4314, opacity: 1),
  .onInfoContainer: TanreiColorValue(red: 0.851, green: 0.8863, blue: 1, opacity: 1),
  .onPrimary: TanreiColorValue(red: 0.2196, green: 0.1176, blue: 0.4471, opacity: 1),
  .onPrimaryContainer: TanreiColorValue(red: 0.9176, green: 0.8667, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "on-primary-fixed"): TanreiColorValue(red: 0.1294, green: 0, blue: 0.3647, opacity: 1),
  TanreiColorRole(rawValue: "on-primary-fixed-variant"): TanreiColorValue(red: 0.3098, green: 0.2157, blue: 0.5451, opacity: 1),
  .onSecondary: TanreiColorValue(red: 0.2, green: 0.1765, blue: 0.2549, opacity: 1),
  .onSecondaryContainer: TanreiColorValue(red: 0.9098, green: 0.8706, blue: 0.9725, opacity: 1),
  TanreiColorRole(rawValue: "on-secondary-fixed"): TanreiColorValue(red: 0.1137, green: 0.098, blue: 0.1686, opacity: 1),
  TanreiColorRole(rawValue: "on-secondary-fixed-variant"): TanreiColorValue(red: 0.2902, green: 0.2667, blue: 0.3451, opacity: 1),
  .onSuccess: TanreiColorValue(red: 0, green: 0.2235, blue: 0.0745, opacity: 1),
  .onSuccessContainer: TanreiColorValue(red: 0.5804, green: 0.9765, blue: 0.6235, opacity: 1),
  .onSurface: TanreiColorValue(red: 0.902, green: 0.8784, blue: 0.9137, opacity: 1),
  .onSurfaceVariant: TanreiColorValue(red: 0.7922, green: 0.7686, blue: 0.8157, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary"): TanreiColorValue(red: 0.2863, green: 0.1451, blue: 0.1961, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary-container"): TanreiColorValue(red: 1, green: 0.8471, blue: 0.8941, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary-fixed"): TanreiColorValue(red: 0.1922, green: 0.0667, blue: 0.1137, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary-fixed-variant"): TanreiColorValue(red: 0.3882, green: 0.2314, blue: 0.2824, opacity: 1),
  .onWarning: TanreiColorValue(red: 0.2863, green: 0.1608, blue: 0, opacity: 1),
  .onWarningContainer: TanreiColorValue(red: 1, green: 0.8627, blue: 0.7412, opacity: 1),
  .outline: TanreiColorValue(red: 0.5765, green: 0.5608, blue: 0.6, opacity: 1),
  .outlineVariant: TanreiColorValue(red: 0.2863, green: 0.2706, blue: 0.3098, opacity: 1),
  .primary: TanreiColorValue(red: 0.8157, green: 0.7373, blue: 1, opacity: 1),
  .primaryContainer: TanreiColorValue(red: 0.3098, green: 0.2157, blue: 0.5451, opacity: 1),
  TanreiColorRole(rawValue: "primary-fixed"): TanreiColorValue(red: 0.9176, green: 0.8667, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "primary-fixed-dim"): TanreiColorValue(red: 0.8157, green: 0.7373, blue: 1, opacity: 1),
  .scrim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.32),
  .secondary: TanreiColorValue(red: 0.8, green: 0.7608, blue: 0.8627, opacity: 1),
  .secondaryContainer: TanreiColorValue(red: 0.2902, green: 0.2667, blue: 0.3451, opacity: 1),
  TanreiColorRole(rawValue: "secondary-fixed"): TanreiColorValue(red: 0.9098, green: 0.8706, blue: 0.9725, opacity: 1),
  TanreiColorRole(rawValue: "secondary-fixed-dim"): TanreiColorValue(red: 0.8, green: 0.7608, blue: 0.8627, opacity: 1),
  .shadow: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .success: TanreiColorValue(red: 0.4706, green: 0.8627, blue: 0.5255, opacity: 1),
  .successContainer: TanreiColorValue(red: 0, green: 0.3255, blue: 0.1176, opacity: 1),
  .surface: TanreiColorValue(red: 0.0784, green: 0.0706, blue: 0.0941, opacity: 1),
  .surfaceBright: TanreiColorValue(red: 0.2314, green: 0.2196, blue: 0.2431, opacity: 1),
  .surfaceContainer: TanreiColorValue(red: 0.1294, green: 0.1216, blue: 0.149, opacity: 1),
  .surfaceContainerHigh: TanreiColorValue(red: 0.1686, green: 0.1608, blue: 0.1882, opacity: 1),
  .surfaceContainerHighest: TanreiColorValue(red: 0.2118, green: 0.2039, blue: 0.2314, opacity: 1),
  .surfaceContainerLow: TanreiColorValue(red: 0.1137, green: 0.1059, blue: 0.1255, opacity: 1),
  .surfaceContainerLowest: TanreiColorValue(red: 0.0588, green: 0.051, blue: 0.0745, opacity: 1),
  .surfaceDim: TanreiColorValue(red: 0.0784, green: 0.0706, blue: 0.0941, opacity: 1),
  TanreiColorRole(rawValue: "surface-tint"): TanreiColorValue(red: 0.8157, green: 0.7373, blue: 1, opacity: 1),
  .surfaceVariant: TanreiColorValue(red: 0.2863, green: 0.2706, blue: 0.3098, opacity: 1),
  TanreiColorRole(rawValue: "tertiary"): TanreiColorValue(red: 0.9373, green: 0.7216, blue: 0.7843, opacity: 1),
  TanreiColorRole(rawValue: "tertiary-container"): TanreiColorValue(red: 0.3882, green: 0.2314, blue: 0.2824, opacity: 1),
  TanreiColorRole(rawValue: "tertiary-fixed"): TanreiColorValue(red: 1, green: 0.8471, blue: 0.8941, opacity: 1),
  TanreiColorRole(rawValue: "tertiary-fixed-dim"): TanreiColorValue(red: 0.9373, green: 0.7216, blue: 0.7843, opacity: 1),
  .warning: TanreiColorValue(red: 1, green: 0.7216, blue: 0.4275, opacity: 1),
  .warningContainer: TanreiColorValue(red: 0.4078, green: 0.2353, blue: 0, opacity: 1),
])

private let m3ExpressiveLikeDarkMediumColors = TanreiColors(scheme: .darkMedium, values: [
  TanreiColorRole(rawValue: "background"): TanreiColorValue(red: 0.0784, green: 0.0706, blue: 0.0941, opacity: 1),
  .elevationRing: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .elevationShadow1: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.15),
  .elevationShadow2: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.15),
  .elevationShadow3: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.3),
  .error: TanreiColorValue(red: 1, green: 0.7804, blue: 0.7529, opacity: 1),
  .errorContainer: TanreiColorValue(red: 0.549, green: 0.1137, blue: 0.0941, opacity: 1),
  .focusRing: TanreiColorValue(red: 0.8549, green: 0.8157, blue: 0.9176, opacity: 1),
  .focusRingInner: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .info: TanreiColorValue(red: 0.7725, green: 0.8314, blue: 1, opacity: 1),
  .infoContainer: TanreiColorValue(red: 0, green: 0.2588, blue: 0.6078, opacity: 1),
  .inverseLink: TanreiColorValue(red: 0.3098, green: 0.2157, blue: 0.5451, opacity: 1),
  .inverseOnSurface: TanreiColorValue(red: 0.1961, green: 0.1843, blue: 0.2078, opacity: 1),
  .inversePrimary: TanreiColorValue(red: 0.3098, green: 0.2157, blue: 0.5451, opacity: 1),
  .inverseSurface: TanreiColorValue(red: 0.902, green: 0.8784, blue: 0.9137, opacity: 1),
  .link: TanreiColorValue(red: 0.8627, green: 0.8039, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "on-background"): TanreiColorValue(red: 0.902, green: 0.8784, blue: 0.9137, opacity: 1),
  .onError: TanreiColorValue(red: 0.3765, green: 0.0784, blue: 0.0627, opacity: 1),
  .onErrorContainer: TanreiColorValue(red: 0.9882, green: 0.9333, blue: 0.9333, opacity: 1),
  .onInfo: TanreiColorValue(red: 0, green: 0.1765, blue: 0.4314, opacity: 1),
  .onInfoContainer: TanreiColorValue(red: 0.9294, green: 0.9412, blue: 1, opacity: 1),
  .onPrimary: TanreiColorValue(red: 0.2196, green: 0.1176, blue: 0.4471, opacity: 1),
  .onPrimaryContainer: TanreiColorValue(red: 0.9647, green: 0.9294, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "on-primary-fixed"): TanreiColorValue(red: 0.1294, green: 0, blue: 0.3647, opacity: 1),
  TanreiColorRole(rawValue: "on-primary-fixed-variant"): TanreiColorValue(red: 0.3098, green: 0.2157, blue: 0.5451, opacity: 1),
  .onSecondary: TanreiColorValue(red: 0.2, green: 0.1765, blue: 0.2549, opacity: 1),
  .onSecondaryContainer: TanreiColorValue(red: 0.9647, green: 0.9294, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "on-secondary-fixed"): TanreiColorValue(red: 0.1137, green: 0.098, blue: 0.1686, opacity: 1),
  TanreiColorRole(rawValue: "on-secondary-fixed-variant"): TanreiColorValue(red: 0.2902, green: 0.2667, blue: 0.3451, opacity: 1),
  .onSuccess: TanreiColorValue(red: 0, green: 0.2235, blue: 0.0745, opacity: 1),
  .onSuccessContainer: TanreiColorValue(red: 0.7765, green: 1, blue: 0.7804, opacity: 1),
  .onSurface: TanreiColorValue(red: 0.9608, green: 0.9373, blue: 0.9686, opacity: 1),
  .onSurfaceVariant: TanreiColorValue(red: 0.8471, green: 0.8235, blue: 0.8667, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary"): TanreiColorValue(red: 0.2863, green: 0.1451, blue: 0.1961, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary-container"): TanreiColorValue(red: 1, green: 0.9255, blue: 0.9451, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary-fixed"): TanreiColorValue(red: 0.1922, green: 0.0667, blue: 0.1137, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary-fixed-variant"): TanreiColorValue(red: 0.3882, green: 0.2314, blue: 0.2824, opacity: 1),
  .onWarning: TanreiColorValue(red: 0.2863, green: 0.1608, blue: 0, opacity: 1),
  .onWarningContainer: TanreiColorValue(red: 1, green: 0.9333, blue: 0.8784, opacity: 1),
  .outline: TanreiColorValue(red: 0.6824, green: 0.6627, blue: 0.7059, opacity: 1),
  .outlineVariant: TanreiColorValue(red: 0.3765, green: 0.3647, blue: 0.4, opacity: 1),
  .primary: TanreiColorValue(red: 0.8627, green: 0.8039, blue: 1, opacity: 1),
  .primaryContainer: TanreiColorValue(red: 0.3098, green: 0.2157, blue: 0.5451, opacity: 1),
  TanreiColorRole(rawValue: "primary-fixed"): TanreiColorValue(red: 0.9176, green: 0.8667, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "primary-fixed-dim"): TanreiColorValue(red: 0.8157, green: 0.7373, blue: 1, opacity: 1),
  .scrim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.32),
  .secondary: TanreiColorValue(red: 0.8549, green: 0.8157, blue: 0.9176, opacity: 1),
  .secondaryContainer: TanreiColorValue(red: 0.2902, green: 0.2667, blue: 0.3451, opacity: 1),
  TanreiColorRole(rawValue: "secondary-fixed"): TanreiColorValue(red: 0.9098, green: 0.8706, blue: 0.9725, opacity: 1),
  TanreiColorRole(rawValue: "secondary-fixed-dim"): TanreiColorValue(red: 0.8, green: 0.7608, blue: 0.8627, opacity: 1),
  .shadow: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .success: TanreiColorValue(red: 0.5255, green: 0.9176, blue: 0.5725, opacity: 1),
  .successContainer: TanreiColorValue(red: 0, green: 0.3255, blue: 0.1176, opacity: 1),
  .surface: TanreiColorValue(red: 0.0784, green: 0.0706, blue: 0.0941, opacity: 1),
  .surfaceBright: TanreiColorValue(red: 0.2314, green: 0.2196, blue: 0.2431, opacity: 1),
  .surfaceContainer: TanreiColorValue(red: 0.1294, green: 0.1216, blue: 0.149, opacity: 1),
  .surfaceContainerHigh: TanreiColorValue(red: 0.1686, green: 0.1608, blue: 0.1882, opacity: 1),
  .surfaceContainerHighest: TanreiColorValue(red: 0.2118, green: 0.2039, blue: 0.2314, opacity: 1),
  .surfaceContainerLow: TanreiColorValue(red: 0.1137, green: 0.1059, blue: 0.1255, opacity: 1),
  .surfaceContainerLowest: TanreiColorValue(red: 0.0588, green: 0.051, blue: 0.0745, opacity: 1),
  .surfaceDim: TanreiColorValue(red: 0.0784, green: 0.0706, blue: 0.0941, opacity: 1),
  TanreiColorRole(rawValue: "surface-tint"): TanreiColorValue(red: 0.8157, green: 0.7373, blue: 1, opacity: 1),
  .surfaceVariant: TanreiColorValue(red: 0.2863, green: 0.2706, blue: 0.3098, opacity: 1),
  TanreiColorRole(rawValue: "tertiary"): TanreiColorValue(red: 0.9961, green: 0.7725, blue: 0.8392, opacity: 1),
  TanreiColorRole(rawValue: "tertiary-container"): TanreiColorValue(red: 0.3882, green: 0.2314, blue: 0.2824, opacity: 1),
  TanreiColorRole(rawValue: "tertiary-fixed"): TanreiColorValue(red: 1, green: 0.8471, blue: 0.8941, opacity: 1),
  TanreiColorRole(rawValue: "tertiary-fixed-dim"): TanreiColorValue(red: 0.9373, green: 0.7216, blue: 0.7843, opacity: 1),
  .warning: TanreiColorValue(red: 1, green: 0.7961, blue: 0.5922, opacity: 1),
  .warningContainer: TanreiColorValue(red: 0.4078, green: 0.2353, blue: 0, opacity: 1),
])

private let m3ExpressiveLikeDarkHighColors = TanreiColors(scheme: .darkHigh, values: [
  TanreiColorRole(rawValue: "background"): TanreiColorValue(red: 0.0784, green: 0.0706, blue: 0.0941, opacity: 1),
  .elevationRing: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .elevationShadow1: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.15),
  .elevationShadow2: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.15),
  .elevationShadow3: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.3),
  .error: TanreiColorValue(red: 0.9765, green: 0.8706, blue: 0.8627, opacity: 1),
  .errorContainer: TanreiColorValue(red: 0.549, green: 0.1137, blue: 0.0941, opacity: 1),
  .focusRing: TanreiColorValue(red: 0.9098, green: 0.8706, blue: 0.9725, opacity: 1),
  .focusRingInner: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .info: TanreiColorValue(red: 0.851, green: 0.8863, blue: 1, opacity: 1),
  .infoContainer: TanreiColorValue(red: 0, green: 0.2588, blue: 0.6078, opacity: 1),
  .inverseLink: TanreiColorValue(red: 0.2196, green: 0.1176, blue: 0.4471, opacity: 1),
  .inverseOnSurface: TanreiColorValue(red: 0.1961, green: 0.1843, blue: 0.2078, opacity: 1),
  .inversePrimary: TanreiColorValue(red: 0.2196, green: 0.1176, blue: 0.4471, opacity: 1),
  .inverseSurface: TanreiColorValue(red: 0.902, green: 0.8784, blue: 0.9137, opacity: 1),
  .link: TanreiColorValue(red: 0.9176, green: 0.8667, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "on-background"): TanreiColorValue(red: 0.902, green: 0.8784, blue: 0.9137, opacity: 1),
  .onError: TanreiColorValue(red: 0.3765, green: 0.0784, blue: 0.0627, opacity: 1),
  .onErrorContainer: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onInfo: TanreiColorValue(red: 0, green: 0.1765, blue: 0.4314, opacity: 1),
  .onInfoContainer: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onPrimary: TanreiColorValue(red: 0.2196, green: 0.1176, blue: 0.4471, opacity: 1),
  .onPrimaryContainer: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "on-primary-fixed"): TanreiColorValue(red: 0.1294, green: 0, blue: 0.3647, opacity: 1),
  TanreiColorRole(rawValue: "on-primary-fixed-variant"): TanreiColorValue(red: 0.3098, green: 0.2157, blue: 0.5451, opacity: 1),
  .onSecondary: TanreiColorValue(red: 0.2, green: 0.1765, blue: 0.2549, opacity: 1),
  .onSecondaryContainer: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "on-secondary-fixed"): TanreiColorValue(red: 0.1137, green: 0.098, blue: 0.1686, opacity: 1),
  TanreiColorRole(rawValue: "on-secondary-fixed-variant"): TanreiColorValue(red: 0.2902, green: 0.2667, blue: 0.3451, opacity: 1),
  .onSuccess: TanreiColorValue(red: 0, green: 0.2235, blue: 0.0745, opacity: 1),
  .onSuccessContainer: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSurface: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSurfaceVariant: TanreiColorValue(red: 0.9255, green: 0.902, blue: 0.9451, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary"): TanreiColorValue(red: 0.2863, green: 0.1451, blue: 0.1961, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary-container"): TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary-fixed"): TanreiColorValue(red: 0.1922, green: 0.0667, blue: 0.1137, opacity: 1),
  TanreiColorRole(rawValue: "on-tertiary-fixed-variant"): TanreiColorValue(red: 0.3882, green: 0.2314, blue: 0.2824, opacity: 1),
  .onWarning: TanreiColorValue(red: 0.2863, green: 0.1608, blue: 0, opacity: 1),
  .onWarningContainer: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .outline: TanreiColorValue(red: 0.8471, green: 0.8235, blue: 0.8667, opacity: 1),
  .outlineVariant: TanreiColorValue(red: 0.5765, green: 0.5608, blue: 0.6, opacity: 1),
  .primary: TanreiColorValue(red: 0.9176, green: 0.8667, blue: 1, opacity: 1),
  .primaryContainer: TanreiColorValue(red: 0.3098, green: 0.2157, blue: 0.5451, opacity: 1),
  TanreiColorRole(rawValue: "primary-fixed"): TanreiColorValue(red: 0.9176, green: 0.8667, blue: 1, opacity: 1),
  TanreiColorRole(rawValue: "primary-fixed-dim"): TanreiColorValue(red: 0.8157, green: 0.7373, blue: 1, opacity: 1),
  .scrim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.32),
  .secondary: TanreiColorValue(red: 0.9098, green: 0.8706, blue: 0.9725, opacity: 1),
  .secondaryContainer: TanreiColorValue(red: 0.2902, green: 0.2667, blue: 0.3451, opacity: 1),
  TanreiColorRole(rawValue: "secondary-fixed"): TanreiColorValue(red: 0.9098, green: 0.8706, blue: 0.9725, opacity: 1),
  TanreiColorRole(rawValue: "secondary-fixed-dim"): TanreiColorValue(red: 0.8, green: 0.7608, blue: 0.8627, opacity: 1),
  .shadow: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .success: TanreiColorValue(red: 0.5804, green: 0.9765, blue: 0.6235, opacity: 1),
  .successContainer: TanreiColorValue(red: 0, green: 0.3255, blue: 0.1176, opacity: 1),
  .surface: TanreiColorValue(red: 0.0784, green: 0.0706, blue: 0.0941, opacity: 1),
  .surfaceBright: TanreiColorValue(red: 0.2314, green: 0.2196, blue: 0.2431, opacity: 1),
  .surfaceContainer: TanreiColorValue(red: 0.1294, green: 0.1216, blue: 0.149, opacity: 1),
  .surfaceContainerHigh: TanreiColorValue(red: 0.1686, green: 0.1608, blue: 0.1882, opacity: 1),
  .surfaceContainerHighest: TanreiColorValue(red: 0.2118, green: 0.2039, blue: 0.2314, opacity: 1),
  .surfaceContainerLow: TanreiColorValue(red: 0.1137, green: 0.1059, blue: 0.1255, opacity: 1),
  .surfaceContainerLowest: TanreiColorValue(red: 0.0588, green: 0.051, blue: 0.0745, opacity: 1),
  .surfaceDim: TanreiColorValue(red: 0.0784, green: 0.0706, blue: 0.0941, opacity: 1),
  TanreiColorRole(rawValue: "surface-tint"): TanreiColorValue(red: 0.8157, green: 0.7373, blue: 1, opacity: 1),
  .surfaceVariant: TanreiColorValue(red: 0.2863, green: 0.2706, blue: 0.3098, opacity: 1),
  TanreiColorRole(rawValue: "tertiary"): TanreiColorValue(red: 1, green: 0.8471, blue: 0.8941, opacity: 1),
  TanreiColorRole(rawValue: "tertiary-container"): TanreiColorValue(red: 0.3882, green: 0.2314, blue: 0.2824, opacity: 1),
  TanreiColorRole(rawValue: "tertiary-fixed"): TanreiColorValue(red: 1, green: 0.8471, blue: 0.8941, opacity: 1),
  TanreiColorRole(rawValue: "tertiary-fixed-dim"): TanreiColorValue(red: 0.9373, green: 0.7216, blue: 0.7843, opacity: 1),
  .warning: TanreiColorValue(red: 1, green: 0.8627, blue: 0.7412, opacity: 1),
  .warningContainer: TanreiColorValue(red: 0.4078, green: 0.2353, blue: 0, opacity: 1),
])

private let m3ExpressiveLikeAccordionTokens = TanreiAccordionTokens(
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
  outlineShape: 12,
  outlineWidth: 1,
  separation: 1,
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
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
      labelTypescale: m3ExpressiveLikeTypescale.heading5,
      supportingTextTypescale: m3ExpressiveLikeTypescale.body,
      trailingTextTypescale: m3ExpressiveLikeTypescale.body,
      iconSize: 24,
      chevronSize: 24,
      contentPaddingBlockEnd: 16
    ),
    compact: TanreiAccordionDensityTokens(
      containerHeight: 48,
      containerPaddingBlock: 12,
      containerPaddingInline: 12,
      labelTypescale: m3ExpressiveLikeTypescale.label,
      supportingTextTypescale: m3ExpressiveLikeTypescale.bodySmall,
      trailingTextTypescale: m3ExpressiveLikeTypescale.bodySmall,
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

private let m3ExpressiveLikeAppBarTokens = TanreiAppBarTokens(
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
  outlineVisibility: 1,
  outlineWidth: 1,
  subtitleColor: .role(.onSurfaceVariant),
  titleColor: .role(.onSurface),
  titleInset: 16,
  sizes: TanreiAppBarSizes(
    small: TanreiAppBarSizeTokens(
      containerHeight: 64,
      titleTypescale: m3ExpressiveLikeTypescale.heading4,
      subtitleTypescale: m3ExpressiveLikeTypescale.bodySmall
    ),
    large: TanreiAppBarSizeTokens(
      containerHeight: 152,
      titleTypescale: m3ExpressiveLikeTypescale.heading2,
      subtitleTypescale: m3ExpressiveLikeTypescale.body
    )
  ),
  conditions: TanreiAppBarConditions(
    flat: TanreiAppBarConditionTokens(
      containerColor: .role(.surface),
      containerElevation: m3ExpressiveLikeElevation.level0,
      outlineColor: .none
    ),
    scrolled: TanreiAppBarConditionTokens(
      containerColor: .role(.surfaceContainer),
      containerElevation: m3ExpressiveLikeElevation.level0,
      outlineColor: .none
    )
  )
)

private let m3ExpressiveLikeAppShellTokens = TanreiAppShellTokens(
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
  separation: 1,
  skipLinkContainerColor: .role(.surfaceContainerHigh),
  skipLinkContainerElevation: m3ExpressiveLikeElevation.level3,
  skipLinkContainerPaddingBlock: 12,
  skipLinkContainerPaddingInline: 16,
  skipLinkContainerShape: 8,
  skipLinkLabelTypescale: m3ExpressiveLikeTypescale.label,
  skipLinkOffset: 8
)

private let m3ExpressiveLikeAvatarTokens = TanreiAvatarTokens(
  containerColor: .role(.surfaceContainerHighest),
  groupOutlineColor: .role(.surface),
  groupOutlineWidth: 2,
  iconColor: .role(.onSurfaceVariant),
  labelColor: .role(.onSurfaceVariant),
  sizes: TanreiAvatarSizes(
    small: TanreiAvatarSizeTokens(
      containerSize: 24,
      labelTypescale: m3ExpressiveLikeTypescale.caption,
      iconSize: 16,
      groupOverlap: 2
    ),
    medium: TanreiAvatarSizeTokens(
      containerSize: 40,
      labelTypescale: m3ExpressiveLikeTypescale.label,
      iconSize: 24,
      groupOverlap: 4
    ),
    large: TanreiAvatarSizeTokens(
      containerSize: 56,
      labelTypescale: m3ExpressiveLikeTypescale.heading3,
      iconSize: 32,
      groupOverlap: 8
    )
  ),
  shapes: TanreiAvatarShapes(
    circle: TanreiAvatarShapeTokens(
      containerShape: 9999
    ),
    square: TanreiAvatarShapeTokens(
      containerShape: 8
    )
  )
)

private let m3ExpressiveLikeBadgeTokens = TanreiBadgeTokens(
  containerColor: .role(.error),
  containerHeight: 16,
  containerOffset: 0,
  containerPaddingInline: 4,
  containerShape: 9999,
  dotOffset: 2,
  dotSize: 6,
  labelColor: .role(.onError),
  labelTypescale: m3ExpressiveLikeTypescale.caption,
  outlineColor: .none,
  outlineWidth: 2
)

private let m3ExpressiveLikeBottomSheetTokens = TanreiBottomSheetTokens(
  closeButtonVariant: 4,
  containerColor: .role(.surfaceContainerLow),
  containerElevation: m3ExpressiveLikeElevation.level1,
  containerMarginBlockStart: 48,
  containerMaxWidth: 640,
  containerPadding: 16,
  containerPartialFraction: 0.5,
  containerShape: 28,
  contentColor: .role(.onSurface),
  dividerColor: .role(.outlineVariant),
  dividerVisibility: 1,
  dividerWidth: 1,
  handleContainerHeight: 24,
  handleContainerShape: 9999,
  handleContainerWidth: 48,
  handleGripHeight: 4,
  handleGripShape: 9999,
  handleGripWidth: 32,
  handleMarginBlock: 12,
  headerGap: 8,
  headerHeight: 64,
  headerPaddingInlineEnd: 12,
  headlineColor: .role(.onSurface),
  headlineTypescale: m3ExpressiveLikeTypescale.heading5,
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
        gripColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      hovered: TanreiBottomSheetControlStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.08),
        gripColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiBottomSheetControlStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        gripColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiBottomSheetControlStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        gripColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
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

private let m3ExpressiveLikeBreadcrumbsTokens = TanreiBreadcrumbsTokens(
  containerGap: 4,
  containerShape: 4,
  iconSize: 16,
  labelColor: .role(.onSurfaceVariant),
  labelTypescale: m3ExpressiveLikeTypescale.body,
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
        containerColor: .mix(base: .none, with: .role(.link), amount: 0.08),
        contentColor: .role(.link),
        stateLayerColor: .role(.link)
      ),
      focused: TanreiBreadcrumbsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.link), amount: 0.12),
        contentColor: .role(.link),
        stateLayerColor: .role(.link)
      ),
      pressed: TanreiBreadcrumbsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.link), amount: 0.12),
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiBreadcrumbsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiBreadcrumbsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
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
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.08),
        contentColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiBreadcrumbsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        contentColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiBreadcrumbsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        contentColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      )
    )
  ),
  hovered: TanreiBreadcrumbsStateTokens(
    containerShape: 4,
    opacity: 1
  ),
  focused: TanreiBreadcrumbsStateTokens(
    containerShape: 4,
    opacity: 1
  ),
  pressed: TanreiBreadcrumbsStateTokens(
    containerShape: 4,
    opacity: 1
  )
)

private let m3ExpressiveLikeButtonGroupTokens = TanreiButtonGroupTokens(
  connectedDividerColor: .role(.outline),
  connectedDividerInset: 8,
  connectedDividerOnFillColor: .role(.outline),
  connectedDividerThickness: 1,
  connectedGap: 2,
  connectedHorizontalOuterInset: 0,
  connectedHorizontalOuterShape: 9999,
  connectedInnerShape: 8,
  connectedSeparation: 1,
  connectedVerticalOuterShape: 16,
  standardGap: 8
)

private let m3ExpressiveLikeButtonWithMenuTokens = TanreiButtonWithMenuTokens(
  containerInnerGap: 2,
  containerInnerShape: 4,
  containerInnerShapeOpen: 9999,
  containerOuterInset: 0,
  containerSeparation: 1,
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
      leadingPaddingInlineStartWithIcon: 16,
      leadingPaddingInlineEnd: 16,
      trailingPaddingInline: 8,
      trailingPaddingInlineNarrow: 4,
      labelTypescale: m3ExpressiveLikeTypescale.label,
      iconSize: 18,
      outlineWidth: 1
    ),
    medium: TanreiButtonWithMenuSizeTokens(
      containerHeight: 40,
      containerPaddingBlock: 6,
      containerGap: 8,
      leadingPaddingInlineStart: 16,
      leadingPaddingInlineStartWithIcon: 16,
      leadingPaddingInlineEnd: 16,
      trailingPaddingInline: 12,
      trailingPaddingInlineNarrow: 4,
      labelTypescale: m3ExpressiveLikeTypescale.label,
      iconSize: 18,
      outlineWidth: 1
    ),
    large: TanreiButtonWithMenuSizeTokens(
      containerHeight: 56,
      containerPaddingBlock: 6,
      containerGap: 8,
      leadingPaddingInlineStart: 24,
      leadingPaddingInlineStartWithIcon: 24,
      leadingPaddingInlineEnd: 24,
      trailingPaddingInline: 16,
      trailingPaddingInlineNarrow: 12,
      labelTypescale: m3ExpressiveLikeTypescale.label,
      iconSize: 24,
      outlineWidth: 1
    )
  ),
  variants: TanreiButtonWithMenuVariants(
    filled: TanreiButtonWithMenuVariantTokens(
      enabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .role(.primary),
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .role(.onPrimary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.onPrimary)
      ),
      hovered: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.08),
        containerElevation: m3ExpressiveLikeElevation.level1,
        labelColor: .role(.onPrimary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.onPrimary)
      ),
      focused: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .role(.onPrimary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.onPrimary)
      ),
      pressed: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .role(.onPrimary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.onPrimary)
      ),
      disabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        dividerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    tonal: TanreiButtonWithMenuVariantTokens(
      enabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .role(.secondaryContainer),
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .role(.onSecondaryContainer),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.08),
        containerElevation: m3ExpressiveLikeElevation.level1,
        labelColor: .role(.onSecondaryContainer),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .role(.onSecondaryContainer),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .role(.onSecondaryContainer),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        dividerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    elevated: TanreiButtonWithMenuVariantTokens(
      enabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .role(.surfaceContainerLow),
        containerElevation: m3ExpressiveLikeElevation.level1,
        labelColor: .role(.primary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.primary)
      ),
      hovered: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLow), with: .role(.primary), amount: 0.08),
        containerElevation: m3ExpressiveLikeElevation.level2,
        labelColor: .role(.primary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.primary)
      ),
      focused: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLow), with: .role(.primary), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level1,
        labelColor: .role(.primary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.primary)
      ),
      pressed: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLow), with: .role(.primary), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level1,
        labelColor: .role(.primary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.primary)
      ),
      disabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        dividerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    outlined: TanreiButtonWithMenuVariantTokens(
      enabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .none,
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .role(.primary),
        outlineColor: .role(.outline),
        dividerColor: .role(.outline),
        stateLayerColor: .role(.primary)
      ),
      hovered: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.08),
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .role(.primary),
        outlineColor: .role(.outline),
        dividerColor: .role(.outline),
        stateLayerColor: .role(.primary)
      ),
      focused: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .role(.primary),
        outlineColor: .role(.primary),
        dividerColor: .role(.outline),
        stateLayerColor: .role(.primary)
      ),
      pressed: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .role(.primary),
        outlineColor: .role(.outline),
        dividerColor: .role(.outline),
        stateLayerColor: .role(.primary)
      ),
      disabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .none,
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .alpha(of: .role(.onSurface), amount: 0.12),
        dividerColor: .alpha(of: .role(.onSurface), amount: 0.38),
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

private let m3ExpressiveLikeButtonTokens = TanreiButtonTokens(
  busyIndicatorThickness: 4,
  containerShape: 9999,
  motionBusyCycleDuration: 1000,
  motionFeedbackDuration: 450,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  toneContainerOpacity: 0.16,
  sizes: TanreiButtonSizes(
    small: TanreiButtonSizeTokens(
      containerHeight: 40,
      containerPaddingInlineNarrow: 2,
      containerWidthWide: 40,
      containerPaddingInlineStart: 16,
      containerPaddingInlineEnd: 16,
      containerPaddingInlineStartWithIcon: 16,
      containerPaddingInlineEndWithIcon: 16,
      containerPaddingBlock: 6,
      labelTypescale: m3ExpressiveLikeTypescale.label,
      iconSize: 20,
      iconSizeWithoutLabel: 24,
      containerGap: 8,
      outlineWidth: 1,
      motionStateDuration: 150
    ),
    medium: TanreiButtonSizeTokens(
      containerHeight: 56,
      containerPaddingInlineNarrow: 4,
      containerWidthWide: 52,
      containerPaddingInlineStart: 24,
      containerPaddingInlineEnd: 24,
      containerPaddingInlineStartWithIcon: 24,
      containerPaddingInlineEndWithIcon: 24,
      containerPaddingBlock: 6,
      labelTypescale: m3ExpressiveLikeTypescale.label,
      iconSize: 24,
      iconSizeWithoutLabel: 24,
      containerGap: 8,
      outlineWidth: 1,
      motionStateDuration: 150
    ),
    large: TanreiButtonSizeTokens(
      containerHeight: 96,
      containerPaddingInlineNarrow: 8,
      containerWidthWide: 72,
      containerPaddingInlineStart: 48,
      containerPaddingInlineEnd: 48,
      containerPaddingInlineStartWithIcon: 48,
      containerPaddingInlineEndWithIcon: 48,
      containerPaddingBlock: 6,
      labelTypescale: m3ExpressiveLikeTypescale.label,
      iconSize: 32,
      iconSizeWithoutLabel: 32,
      containerGap: 12,
      outlineWidth: 2,
      motionStateDuration: 150
    ),
    extra: [
      TanreiButtonSize(rawValue: "xsmall"): TanreiButtonSizeTokens(
        containerHeight: 32,
        containerPaddingInlineNarrow: 4,
        containerWidthWide: 40,
        containerPaddingInlineStart: 16,
        containerPaddingInlineEnd: 16,
        containerPaddingInlineStartWithIcon: 16,
        containerPaddingInlineEndWithIcon: 16,
        containerPaddingBlock: 6,
        labelTypescale: m3ExpressiveLikeTypescale.label,
        iconSize: 20,
        iconSizeWithoutLabel: 20,
        containerGap: 8,
        outlineWidth: 1,
        motionStateDuration: 150
      ),
      TanreiButtonSize(rawValue: "xlarge"): TanreiButtonSizeTokens(
        containerHeight: 136,
        containerPaddingInlineNarrow: 4,
        containerWidthWide: 72,
        containerPaddingInlineStart: 64,
        containerPaddingInlineEnd: 64,
        containerPaddingInlineStartWithIcon: 64,
        containerPaddingInlineEndWithIcon: 64,
        containerPaddingBlock: 6,
        labelTypescale: m3ExpressiveLikeTypescale.label,
        iconSize: 40,
        iconSizeWithoutLabel: 40,
        containerGap: 16,
        outlineWidth: 3,
        motionStateDuration: 150
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
        containerElevation: m3ExpressiveLikeElevation.level0,
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
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.08),
        labelColor: .role(.onPrimary),
        iconColor: .role(.onPrimary),
        outlineColor: .none,
        stateLayerColor: .role(.onPrimary),
        containerElevation: m3ExpressiveLikeElevation.level1,
        unselectedContainerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurfaceVariant), amount: 0.08),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.08),
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary),
        destructiveContainerColor: .mix(base: .role(.error), with: .role(.onError), amount: 0.08),
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
        containerElevation: m3ExpressiveLikeElevation.level0,
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
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        labelColor: .role(.onPrimary),
        iconColor: .role(.onPrimary),
        outlineColor: .none,
        stateLayerColor: .role(.onPrimary),
        containerElevation: m3ExpressiveLikeElevation.level0,
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
      disabled: TanreiButtonVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        containerElevation: m3ExpressiveLikeElevation.level0,
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
        containerElevation: m3ExpressiveLikeElevation.level0,
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
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.08),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        outlineColor: .none,
        stateLayerColor: .role(.onSecondaryContainer),
        containerElevation: m3ExpressiveLikeElevation.level1,
        unselectedContainerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurfaceVariant), amount: 0.08),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .role(.secondary), with: .role(.onSecondary), amount: 0.08),
        selectedLabelColor: .role(.onSecondary),
        selectedIconColor: .role(.onSecondary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onSecondary),
        destructiveContainerColor: .mix(base: .role(.errorContainer), with: .role(.onErrorContainer), amount: 0.08),
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
        containerElevation: m3ExpressiveLikeElevation.level0,
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
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        outlineColor: .none,
        stateLayerColor: .role(.onSecondaryContainer),
        containerElevation: m3ExpressiveLikeElevation.level0,
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
      disabled: TanreiButtonVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        containerElevation: m3ExpressiveLikeElevation.level0,
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
        containerColor: .role(.surfaceContainerLow),
        labelColor: .role(.primary),
        iconColor: .role(.primary),
        outlineColor: .none,
        stateLayerColor: .role(.primary),
        containerElevation: m3ExpressiveLikeElevation.level1,
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
        destructiveContainerColor: .role(.surfaceContainerLow),
        destructiveLabelColor: .role(.error),
        destructiveIconColor: .role(.error),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .role(.error)
      ),
      hovered: TanreiButtonVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLow), with: .role(.primary), amount: 0.08),
        labelColor: .role(.primary),
        iconColor: .role(.primary),
        outlineColor: .none,
        stateLayerColor: .role(.primary),
        containerElevation: m3ExpressiveLikeElevation.level2,
        unselectedContainerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurfaceVariant), amount: 0.08),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.08),
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary),
        destructiveContainerColor: .mix(base: .role(.surfaceContainerLow), with: .role(.error), amount: 0.08),
        destructiveLabelColor: .role(.error),
        destructiveIconColor: .role(.error),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .role(.error)
      ),
      focused: TanreiButtonVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLow), with: .role(.primary), amount: 0.12),
        labelColor: .role(.primary),
        iconColor: .role(.primary),
        outlineColor: .none,
        stateLayerColor: .role(.primary),
        containerElevation: m3ExpressiveLikeElevation.level1,
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
        destructiveContainerColor: .mix(base: .role(.surfaceContainerLow), with: .role(.error), amount: 0.12),
        destructiveLabelColor: .role(.error),
        destructiveIconColor: .role(.error),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .role(.error)
      ),
      pressed: TanreiButtonVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLow), with: .role(.primary), amount: 0.12),
        labelColor: .role(.primary),
        iconColor: .role(.primary),
        outlineColor: .none,
        stateLayerColor: .role(.primary),
        containerElevation: m3ExpressiveLikeElevation.level1,
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
        destructiveContainerColor: .mix(base: .role(.surfaceContainerLow), with: .role(.error), amount: 0.12),
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
        containerElevation: m3ExpressiveLikeElevation.level0,
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
        labelColor: .role(.primary),
        iconColor: .role(.onSurfaceVariant),
        outlineColor: .role(.outline),
        stateLayerColor: .role(.primary),
        containerElevation: m3ExpressiveLikeElevation.level0,
        unselectedContainerColor: .none,
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .role(.outline),
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
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.08),
        labelColor: .role(.primary),
        iconColor: .role(.onSurfaceVariant),
        outlineColor: .role(.outline),
        stateLayerColor: .role(.primary),
        containerElevation: m3ExpressiveLikeElevation.level0,
        unselectedContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.08),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .role(.outline),
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .role(.inverseSurface), with: .role(.inverseOnSurface), amount: 0.08),
        selectedLabelColor: .role(.inverseOnSurface),
        selectedIconColor: .role(.inverseOnSurface),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.inverseOnSurface),
        destructiveContainerColor: .mix(base: .none, with: .role(.error), amount: 0.08),
        destructiveLabelColor: .role(.error),
        destructiveIconColor: .role(.error),
        destructiveOutlineColor: .role(.error),
        destructiveStateLayerColor: .role(.error)
      ),
      focused: TanreiButtonVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
        labelColor: .role(.primary),
        iconColor: .role(.onSurfaceVariant),
        outlineColor: .role(.primary),
        stateLayerColor: .role(.primary),
        containerElevation: m3ExpressiveLikeElevation.level0,
        unselectedContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .role(.outline),
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
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
        labelColor: .role(.primary),
        iconColor: .role(.onSurfaceVariant),
        outlineColor: .role(.outline),
        stateLayerColor: .role(.primary),
        containerElevation: m3ExpressiveLikeElevation.level0,
        unselectedContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .role(.outline),
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
      disabled: TanreiButtonVariantStateTokens(
        containerColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .alpha(of: .role(.onSurface), amount: 0.12),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        containerElevation: m3ExpressiveLikeElevation.level0,
        unselectedContainerColor: .none,
        unselectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        unselectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        unselectedOutlineColor: .alpha(of: .role(.onSurface), amount: 0.12),
        unselectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        selectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        destructiveContainerColor: .none,
        destructiveLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        destructiveIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        destructiveOutlineColor: .alpha(of: .role(.onSurface), amount: 0.12),
        destructiveStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    text: TanreiButtonVariantTokens(
      enabled: TanreiButtonVariantStateTokens(
        containerColor: .none,
        labelColor: .role(.primary),
        iconColor: .role(.onSurfaceVariant),
        outlineColor: .none,
        stateLayerColor: .role(.primary),
        containerElevation: m3ExpressiveLikeElevation.level0,
        unselectedContainerColor: .none,
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .none,
        selectedLabelColor: .role(.onSurface),
        selectedIconColor: .role(.primary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onSurface),
        destructiveContainerColor: .none,
        destructiveLabelColor: .role(.error),
        destructiveIconColor: .role(.error),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .role(.error)
      ),
      hovered: TanreiButtonVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.08),
        labelColor: .role(.primary),
        iconColor: .role(.onSurfaceVariant),
        outlineColor: .none,
        stateLayerColor: .role(.primary),
        containerElevation: m3ExpressiveLikeElevation.level0,
        unselectedContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.08),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        selectedLabelColor: .role(.onSurface),
        selectedIconColor: .role(.primary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onSurface),
        destructiveContainerColor: .mix(base: .none, with: .role(.error), amount: 0.08),
        destructiveLabelColor: .role(.error),
        destructiveIconColor: .role(.error),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .role(.error)
      ),
      focused: TanreiButtonVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
        labelColor: .role(.primary),
        iconColor: .role(.onSurfaceVariant),
        outlineColor: .none,
        stateLayerColor: .role(.primary),
        containerElevation: m3ExpressiveLikeElevation.level0,
        unselectedContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        selectedLabelColor: .role(.onSurface),
        selectedIconColor: .role(.primary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onSurface),
        destructiveContainerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
        destructiveLabelColor: .role(.error),
        destructiveIconColor: .role(.error),
        destructiveOutlineColor: .none,
        destructiveStateLayerColor: .role(.error)
      ),
      pressed: TanreiButtonVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
        labelColor: .role(.primary),
        iconColor: .role(.onSurfaceVariant),
        outlineColor: .none,
        stateLayerColor: .role(.primary),
        containerElevation: m3ExpressiveLikeElevation.level0,
        unselectedContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        selectedLabelColor: .role(.onSurface),
        selectedIconColor: .role(.primary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onSurface),
        destructiveContainerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
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
        containerElevation: m3ExpressiveLikeElevation.level0,
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
    )
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

private let m3ExpressiveLikeCalendarTokens = TanreiCalendarTokens(
  cellSize: 48,
  dayContainerShape: 9999,
  dayContainerSize: 40,
  dayLabelTypescale: m3ExpressiveLikeTypescale.bodyLarge,
  motionFeedbackDuration: 450,
  motionPageDuration: 250,
  motionPageEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  navigationAxis: 1,
  navigationGap: 8,
  outlineWidth: 1,
  viewToggleContainerHeight: 36,
  viewToggleContainerPaddingInline: 12,
  viewToggleContainerShape: 9999,
  viewToggleGap: 4,
  viewToggleIconSize: 20,
  viewToggleLabelTypescale: m3ExpressiveLikeTypescale.label,
  weekdayColor: .role(.onSurface),
  weekdayTypescale: m3ExpressiveLikeTypescale.bodyLarge,
  yearContainerHeight: 36,
  yearContainerShape: 9999,
  yearContainerWidth: 72,
  yearLabelTypescale: m3ExpressiveLikeTypescale.bodyLarge,
  conditions: TanreiCalendarConditions(
    unselected: TanreiCalendarConditionTokens(
      enabled: TanreiCalendarConditionStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiCalendarConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
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
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
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
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
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
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.08),
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
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
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
        containerColor: .role(.secondaryContainer),
        labelColor: .role(.onSecondaryContainer),
        outlineColor: .none,
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiCalendarConditionStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.08),
        labelColor: .role(.onSecondaryContainer),
        outlineColor: .none,
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiCalendarConditionStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        labelColor: .role(.onSecondaryContainer),
        outlineColor: .none,
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiCalendarConditionStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        labelColor: .role(.onSecondaryContainer),
        outlineColor: .none,
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiCalendarConditionStateTokens(
        containerColor: .role(.secondaryContainer),
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

private let m3ExpressiveLikeCalloutTokens = TanreiCalloutTokens(
  actionsGap: 12,
  actionsItemGap: 8,
  closeButtonVariant: 4,
  containerGap: 8,
  containerPaddingBlock: 12,
  containerPaddingInline: 16,
  containerPaddingInlineEndWithClose: 8,
  containerShape: 12,
  iconGap: 12,
  iconOpacity: 0.85,
  iconSize: 20,
  outlineColor: .role(.outlineVariant),
  outlineWidth: 1,
  titleGap: 4,
  sizes: TanreiCalloutSizes(
    medium: TanreiCalloutSizeTokens(
      titleTypescale: m3ExpressiveLikeTypescale.heading6,
      bodyTypescale: m3ExpressiveLikeTypescale.body
    ),
    large: TanreiCalloutSizeTokens(
      titleTypescale: m3ExpressiveLikeTypescale.heading5,
      bodyTypescale: m3ExpressiveLikeTypescale.bodyLarge
    )
  ),
  variants: TanreiCalloutVariants(
    tonal: TanreiCalloutVariantTokens(
      containerColor: .role(.secondaryContainer),
      titleColor: .role(.onSecondaryContainer),
      bodyColor: .role(.onSecondaryContainer),
      iconColor: .role(.onSecondaryContainer),
      infoContainerColor: .role(.infoContainer),
      infoTitleColor: .role(.onInfoContainer),
      infoBodyColor: .role(.onInfoContainer),
      infoIconColor: .role(.info),
      warningContainerColor: .role(.warningContainer),
      warningTitleColor: .role(.onWarningContainer),
      warningBodyColor: .role(.onWarningContainer),
      warningIconColor: .role(.warning),
      errorContainerColor: .role(.errorContainer),
      errorTitleColor: .role(.onErrorContainer),
      errorBodyColor: .role(.onErrorContainer),
      errorIconColor: .role(.error),
      successContainerColor: .role(.successContainer),
      successTitleColor: .role(.onSuccessContainer),
      successBodyColor: .role(.onSuccessContainer),
      successIconColor: .role(.success)
    ),
    outlined: TanreiCalloutVariantTokens(
      containerColor: .none,
      titleColor: .role(.onSurface),
      bodyColor: .role(.onSurface),
      iconColor: .role(.onSurfaceVariant),
      infoContainerColor: .none,
      infoTitleColor: .role(.onSurface),
      infoBodyColor: .role(.onSurface),
      infoIconColor: .role(.info),
      warningContainerColor: .none,
      warningTitleColor: .role(.onSurface),
      warningBodyColor: .role(.onSurface),
      warningIconColor: .role(.warning),
      errorContainerColor: .none,
      errorTitleColor: .role(.onSurface),
      errorBodyColor: .role(.onSurface),
      errorIconColor: .role(.error),
      successContainerColor: .none,
      successTitleColor: .role(.onSurface),
      successBodyColor: .role(.onSurface),
      successIconColor: .role(.success)
    )
  )
)

private let m3ExpressiveLikeCardTokens = TanreiCardTokens(
  containerPadding: 16,
  containerShape: 12,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineWidth: 1,
  variants: TanreiCardVariants(
    elevated: TanreiCardVariantTokens(
      enabled: TanreiCardVariantStateTokens(
        containerColor: .role(.surfaceContainerLow),
        containerElevation: m3ExpressiveLikeElevation.level1,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiCardVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLow), with: .role(.onSurface), amount: 0.08),
        containerElevation: m3ExpressiveLikeElevation.level2,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiCardVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLow), with: .role(.onSurface), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level1,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiCardVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLow), with: .role(.onSurface), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level1,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiCardVariantStateTokens(
        containerColor: .role(.surfaceContainerLow),
        containerElevation: m3ExpressiveLikeElevation.level1,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    filled: TanreiCardVariantTokens(
      enabled: TanreiCardVariantStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: m3ExpressiveLikeElevation.level0,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiCardVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.08),
        containerElevation: m3ExpressiveLikeElevation.level1,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiCardVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiCardVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiCardVariantStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: m3ExpressiveLikeElevation.level0,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    outlined: TanreiCardVariantTokens(
      enabled: TanreiCardVariantStateTokens(
        containerColor: .role(.surface),
        containerElevation: m3ExpressiveLikeElevation.level0,
        outlineColor: .role(.outlineVariant),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiCardVariantStateTokens(
        containerColor: .mix(base: .role(.surface), with: .role(.onSurface), amount: 0.08),
        containerElevation: m3ExpressiveLikeElevation.level1,
        outlineColor: .role(.outlineVariant),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiCardVariantStateTokens(
        containerColor: .mix(base: .role(.surface), with: .role(.onSurface), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        outlineColor: .role(.outlineVariant),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiCardVariantStateTokens(
        containerColor: .mix(base: .role(.surface), with: .role(.onSurface), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        outlineColor: .role(.outlineVariant),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiCardVariantStateTokens(
        containerColor: .role(.surface),
        containerElevation: m3ExpressiveLikeElevation.level0,
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

private let m3ExpressiveLikeCarouselTokens = TanreiCarouselTokens(
  autoplayInterval: 5000,
  containerLargeWidth: 200,
  containerMinScale: 0.85,
  containerShape: 28,
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
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.08),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiCarouselPartStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.12),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiCarouselPartStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.12),
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
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.08),
        contentColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiCarouselPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        contentColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiCarouselPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
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
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.08),
        contentColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      focused: TanreiCarouselPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
        contentColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      pressed: TanreiCarouselPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
        contentColor: .role(.primary),
        stateLayerColor: .role(.primary)
      )
    )
  ),
  hovered: TanreiCarouselStateTokens(
    containerShape: 28,
    opacity: 1
  ),
  focused: TanreiCarouselStateTokens(
    containerShape: 28,
    opacity: 1
  ),
  pressed: TanreiCarouselStateTokens(
    containerShape: 28,
    opacity: 1
  )
)

private let m3ExpressiveLikeChatComposerTokens = TanreiChatComposerTokens(
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
  counterTypescale: m3ExpressiveLikeTypescale.labelSmall,
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
        containerElevation: m3ExpressiveLikeElevation.level0,
        outlineColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiChatComposerConditionStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.08),
        containerElevation: m3ExpressiveLikeElevation.level0,
        outlineColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiChatComposerConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: m3ExpressiveLikeElevation.level0,
        outlineColor: .role(.focusRing),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiChatComposerConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: m3ExpressiveLikeElevation.level0,
        outlineColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    error: TanreiChatComposerConditionTokens(
      enabled: TanreiChatComposerConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: m3ExpressiveLikeElevation.level0,
        outlineColor: .role(.error),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiChatComposerConditionStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.08),
        containerElevation: m3ExpressiveLikeElevation.level0,
        outlineColor: .role(.error),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiChatComposerConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: m3ExpressiveLikeElevation.level0,
        outlineColor: .role(.error),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiChatComposerConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: m3ExpressiveLikeElevation.level0,
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

private let m3ExpressiveLikeCheckboxTokens = TanreiCheckboxTokens(
  boxShape: 2,
  boxSize: 18,
  containerShape: 9999,
  containerSize: 40,
  labelGap: 4,
  labelTypescale: m3ExpressiveLikeTypescale.body,
  markSize: 20,
  markWeight: 400,
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
        outlineColor: .role(.onSurfaceVariant),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiCheckboxConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        boxColor: .none,
        markColor: .none,
        outlineColor: .role(.onSurfaceVariant),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiCheckboxConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        boxColor: .none,
        markColor: .none,
        outlineColor: .role(.onSurfaceVariant),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiCheckboxConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        boxColor: .none,
        markColor: .none,
        outlineColor: .role(.onSurfaceVariant),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
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
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
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
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
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
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
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
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
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
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
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

private let m3ExpressiveLikeChipTokens = TanreiChipTokens(
  avatarShape: 9999,
  checkWeight: 400,
  containerShape: 8,
  motionFeedbackDuration: 450,
  motionSelectionDuration: 150,
  motionSelectionEasing: TanreiCubicBezier(0.31, 0.94, 0.34, 1),
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineWidth: 1,
  removeContainerShape: 9999,
  sizes: TanreiChipSizes(
    small: TanreiChipSizeTokens(
      containerHeight: 24,
      containerPaddingInline: 8,
      containerPaddingInlineWithIcon: 6,
      containerPaddingInlineWithAvatar: 4,
      containerPaddingInlineWithRemove: 6,
      containerPaddingBlock: 2,
      containerGap: 4,
      labelTypescale: m3ExpressiveLikeTypescale.labelSmall,
      iconSize: 20,
      avatarSize: 16,
      removeContainerSize: 24,
      motionStateDuration: 150
    ),
    medium: TanreiChipSizeTokens(
      containerHeight: 32,
      containerPaddingInline: 16,
      containerPaddingInlineWithIcon: 8,
      containerPaddingInlineWithAvatar: 4,
      containerPaddingInlineWithRemove: 8,
      containerPaddingBlock: 4,
      containerGap: 8,
      labelTypescale: m3ExpressiveLikeTypescale.label,
      iconSize: 18,
      avatarSize: 24,
      removeContainerSize: 28,
      motionStateDuration: 150
    )
  ),
  variants: TanreiChipVariants(
    outlined: TanreiChipVariantTokens(
      enabled: TanreiChipVariantStateTokens(
        containerColor: .none,
        containerElevation: m3ExpressiveLikeElevation.level0,
        outlineColor: .role(.outlineVariant),
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.primary),
        stateLayerColor: .role(.onSurfaceVariant),
        removeContainerColor: .none,
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .none,
        destructiveRemoveIconColor: .role(.onSurfaceVariant),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .role(.secondaryContainer),
        selectedContainerElevation: m3ExpressiveLikeElevation.level0,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedStateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiChipVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.08),
        containerElevation: m3ExpressiveLikeElevation.level0,
        outlineColor: .role(.outlineVariant),
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.primary),
        stateLayerColor: .role(.onSurfaceVariant),
        removeContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.08),
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .mix(base: .none, with: .role(.error), amount: 0.08),
        destructiveRemoveIconColor: .role(.error),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.08),
        selectedContainerElevation: m3ExpressiveLikeElevation.level0,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedStateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiChipVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        outlineColor: .role(.outlineVariant),
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.primary),
        stateLayerColor: .role(.onSurfaceVariant),
        removeContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
        destructiveRemoveIconColor: .role(.error),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        selectedContainerElevation: m3ExpressiveLikeElevation.level0,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedStateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiChipVariantStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        outlineColor: .role(.outlineVariant),
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.primary),
        stateLayerColor: .role(.onSurfaceVariant),
        removeContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
        destructiveRemoveIconColor: .role(.error),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        selectedContainerElevation: m3ExpressiveLikeElevation.level0,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedStateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiChipVariantStateTokens(
        containerColor: .none,
        containerElevation: m3ExpressiveLikeElevation.level0,
        outlineColor: .alpha(of: .role(.onSurface), amount: 0.12),
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
        selectedContainerElevation: m3ExpressiveLikeElevation.level0,
        selectedOutlineColor: .none,
        selectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    elevated: TanreiChipVariantTokens(
      enabled: TanreiChipVariantStateTokens(
        containerColor: .role(.surfaceContainerLow),
        containerElevation: m3ExpressiveLikeElevation.level1,
        outlineColor: .none,
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.primary),
        stateLayerColor: .role(.onSurfaceVariant),
        removeContainerColor: .none,
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .none,
        destructiveRemoveIconColor: .role(.onSurfaceVariant),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .role(.secondaryContainer),
        selectedContainerElevation: m3ExpressiveLikeElevation.level1,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedStateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiChipVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLow), with: .role(.onSurfaceVariant), amount: 0.08),
        containerElevation: m3ExpressiveLikeElevation.level2,
        outlineColor: .none,
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.primary),
        stateLayerColor: .role(.onSurfaceVariant),
        removeContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.08),
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .mix(base: .none, with: .role(.error), amount: 0.08),
        destructiveRemoveIconColor: .role(.error),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.08),
        selectedContainerElevation: m3ExpressiveLikeElevation.level2,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedStateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiChipVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLow), with: .role(.onSurfaceVariant), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level1,
        outlineColor: .none,
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.primary),
        stateLayerColor: .role(.onSurfaceVariant),
        removeContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
        destructiveRemoveIconColor: .role(.error),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        selectedContainerElevation: m3ExpressiveLikeElevation.level1,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedStateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiChipVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerLow), with: .role(.onSurfaceVariant), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level1,
        outlineColor: .none,
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.primary),
        stateLayerColor: .role(.onSurfaceVariant),
        removeContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
        destructiveRemoveIconColor: .role(.error),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        selectedContainerElevation: m3ExpressiveLikeElevation.level1,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onSecondaryContainer),
        selectedIconColor: .role(.onSecondaryContainer),
        selectedStateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiChipVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
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
        selectedContainerElevation: m3ExpressiveLikeElevation.level0,
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

private let m3ExpressiveLikeCodeBlockTokens = TanreiCodeBlockTokens(
  codeColor: .role(.onSurface),
  codeTabSize: 2,
  containerShape: 8,
  copyButtonInset: 6,
  headerGap: 8,
  headerPaddingBlockEnd: 4,
  languageColor: .role(.onSurfaceVariant),
  languageTypescale: m3ExpressiveLikeTypescale.labelSmall,
  lineNumberColor: .role(.onSurfaceVariant),
  lineNumberGap: 16,
  lineAddedContainerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.5804, green: 0.9765, blue: 0.6235, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.5804, green: 0.9765, blue: 0.6235, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.5804, green: 0.9765, blue: 0.6235, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0, green: 0.3255, blue: 0.1176, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0, green: 0.3255, blue: 0.1176, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0, green: 0.2745, blue: 0.0941, opacity: 1))]),
  lineAddedMarkColor: .role(.success),
  lineHighlightedContainerColor: .role(.surfaceContainerHighest),
  lineHighlightedMarkColor: .role(.primary),
  lineMarkWidth: 2,
  lineRemovedContainerColor: .scheme(by: [.light: .literal(TanreiColorValue(red: 0.9765, green: 0.8706, blue: 0.8627, opacity: 1)), .lightMedium: .literal(TanreiColorValue(red: 0.9765, green: 0.8706, blue: 0.8627, opacity: 1)), .lightHigh: .literal(TanreiColorValue(red: 0.9765, green: 0.8706, blue: 0.8627, opacity: 1)), .dark: .literal(TanreiColorValue(red: 0.549, green: 0.1137, blue: 0.0941, opacity: 1)), .darkMedium: .literal(TanreiColorValue(red: 0.549, green: 0.1137, blue: 0.0941, opacity: 1)), .darkHigh: .literal(TanreiColorValue(red: 0.4941, green: 0, blue: 0.0157, opacity: 1))]),
  lineRemovedMarkColor: .role(.error),
  outlineColor: .role(.outlineVariant),
  outlineWidth: 1,
  promptColor: .role(.onSurfaceVariant),
  syntaxMaxLength: 50000,
  titleColor: .role(.onSurface),
  titleTypescale: m3ExpressiveLikeTypescale.labelSmall,
  sizes: TanreiCodeBlockSizes(
    small: TanreiCodeBlockSizeTokens(
      codeTypescale: m3ExpressiveLikeTypescale.codeSmall,
      containerPaddingBlock: 8,
      containerPaddingInline: 12
    ),
    medium: TanreiCodeBlockSizeTokens(
      codeTypescale: m3ExpressiveLikeTypescale.code,
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

private let m3ExpressiveLikeColorInputTokens = TanreiColorInputTokens(
  swatchOutlineColor: .role(.outlineVariant),
  swatchOutlineWidth: 1,
  swatchShape: 4
)

private let m3ExpressiveLikeComboboxTokens = TanreiComboboxTokens(
  containerActionGap: 4,
  dividerColor: .role(.outlineVariant),
  dividerSpace: 8,
  dividerThickness: 1,
  groupTitleColor: .role(.onSurfaceVariant),
  groupTitleTypescale: m3ExpressiveLikeTypescale.labelSmall,
  groupGap: 16,
  listColor: .role(.surfaceContainer),
  listElevation: m3ExpressiveLikeElevation.level2,
  listMaxHeight: 320,
  listOffset: 4,
  listPaddingBlock: 8,
  listPaddingInline: 0,
  listShape: 4,
  listViewportMargin: 8,
  motionCloseDuration: 100,
  motionCloseEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  motionFeedbackDuration: 450,
  motionOpenDuration: 200,
  motionOpenEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  optionLabelTypescale: m3ExpressiveLikeTypescale.label,
  optionMatchEmphasis: 200,
  optionShape: 0,
  optionSupportingTextTypescale: m3ExpressiveLikeTypescale.bodySmall,
  separation: 0,
  statusColor: .role(.onSurfaceVariant),
  statusErrorColor: .role(.error),
  statusTypescale: m3ExpressiveLikeTypescale.bodySmall,
  variants: TanreiComboboxVariants(
    stacked: TanreiComboboxVariantTokens(
      enabled: TanreiComboboxVariantStateTokens(
        optionContainerColor: .none,
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .none,
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiComboboxVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiComboboxVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiComboboxVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiComboboxVariantStateTokens(
        optionContainerColor: .none,
        optionLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionContainerColor: .none,
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
        selectedOptionContainerColor: .none,
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiComboboxVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiComboboxVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiComboboxVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiComboboxVariantStateTokens(
        optionContainerColor: .none,
        optionLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionContainerColor: .none,
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
        selectedOptionContainerColor: .none,
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiComboboxVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiComboboxVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiComboboxVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiComboboxVariantStateTokens(
        optionContainerColor: .none,
        optionLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionContainerColor: .none,
        selectedOptionLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionMarkColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  densitys: TanreiComboboxDensitys(
    regular: TanreiComboboxDensityTokens(
      optionHeight: 48,
      optionPaddingInline: 12,
      optionPaddingBlock: 8,
      optionGap: 12,
      optionLeadingIconSize: 24,
      optionMarkSize: 24,
      groupTitlePaddingInline: 12
    ),
    compact: TanreiComboboxDensityTokens(
      optionHeight: 32,
      optionPaddingInline: 8,
      optionPaddingBlock: 6,
      optionGap: 8,
      optionLeadingIconSize: 20,
      optionMarkSize: 20,
      groupTitlePaddingInline: 8
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

private let m3ExpressiveLikeCopyButtonTokens = TanreiCopyButtonTokens(
  confirmationDuration: 2000,
  motionResizeDuration: 500,
  motionResizeEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1)
)

private let m3ExpressiveLikeDateTimePickerTokens = TanreiDateTimePickerTokens(
  actionsArrangement: 1,
  actionsGap: 8,
  actionsPaddingBlock: 12,
  actionsVariant: 4,
  containerGap: 16,
  containerPaddingBlock: 8,
  containerPaddingInline: 12,
  dialCenterSize: 8,
  dialContainerColor: .role(.surfaceContainerHighest),
  dialContainerSize: 256,
  dialHandleColor: .role(.primary),
  dialHandleSize: 48,
  dialLabelColor: .role(.onSurface),
  dialLabelTypescale: m3ExpressiveLikeTypescale.bodyLarge,
  dialPadding: 8,
  dialSelectedLabelColor: .role(.onPrimary),
  dialTrackColor: .role(.primary),
  dialTrackWidth: 2,
  dividerColor: .role(.outlineVariant),
  dividerWidth: 1,
  dockedContainerColor: .role(.surfaceContainerHigh),
  dockedContainerElevation: m3ExpressiveLikeElevation.level3,
  dockedContainerShape: 16,
  dockedMotionCloseDuration: 100,
  dockedMotionCloseEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  dockedMotionOpenDuration: 200,
  dockedMotionOpenEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  dockedOffset: 4,
  dockedViewportMargin: 8,
  errorColor: .role(.error),
  errorTypescale: m3ExpressiveLikeTypescale.bodySmall,
  headerGap: 4,
  headerLabelColor: .role(.onSurfaceVariant),
  headerLabelTypescale: m3ExpressiveLikeTypescale.label,
  headerPaddingBlock: 16,
  headerPaddingInlineEnd: 12,
  headerPaddingInlineStart: 24,
  headerPlaceholderColor: .role(.onSurfaceVariant),
  headerValueColor: .role(.onSurfaceVariant),
  headerValueTypescale: m3ExpressiveLikeTypescale.heading1,
  modalContainerColor: .role(.surfaceContainerHigh),
  modalContainerElevation: m3ExpressiveLikeElevation.level3,
  modalContainerMargin: 16,
  modalContainerShape: 28,
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
  periodContainerWidth: 52,
  periodGap: 12,
  periodLabelTypescale: m3ExpressiveLikeTypescale.heading5,
  rangeFieldContainerHeight: 48,
  rangeFieldContainerPaddingInline: 16,
  rangeFieldGap: 8,
  rangeFieldLabelTypescale: m3ExpressiveLikeTypescale.heading5,
  selectorContainerHeight: 80,
  selectorContainerShape: 8,
  selectorContainerWidth: 96,
  selectorGap: 4,
  selectorLabelTypescale: m3ExpressiveLikeTypescaleDisplayLarge,
  separatorColor: .role(.onSurface),
  separatorTypescale: m3ExpressiveLikeTypescaleDisplayLarge,
  timeEntryModes: 2,
  timeUnavailableOpacity: 0.38,
  wheelGap: 4,
  wheelHeight: 240,
  wheelLabelColor: .role(.onSurfaceVariant),
  wheelLabelTypescale: m3ExpressiveLikeTypescale.heading3,
  wheelRowHeight: 48,
  wheelSelectedLabelColor: .role(.onSurface),
  wheelSelectionContainerColor: .role(.surfaceDim),
  wheelSelectionContainerShape: 12,
  wheelSelectionSpan: 0,
  wheelWidth: 80,
  conditions: TanreiDateTimePickerConditions(
    unselected: TanreiDateTimePickerConditionTokens(
      enabled: TanreiDateTimePickerConditionStateTokens(
        selectorContainerColor: .role(.surfaceContainerHighest),
        selectorLabelColor: .role(.onSurface),
        selectorOutlineColor: .none,
        selectorOutlineWidth: 1,
        selectorStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiDateTimePickerConditionStateTokens(
        selectorContainerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.08),
        selectorLabelColor: .role(.onSurface),
        selectorOutlineColor: .none,
        selectorOutlineWidth: 1,
        selectorStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiDateTimePickerConditionStateTokens(
        selectorContainerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.12),
        selectorLabelColor: .role(.onSurface),
        selectorOutlineColor: .none,
        selectorOutlineWidth: 1,
        selectorStateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiDateTimePickerConditionStateTokens(
        selectorContainerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.12),
        selectorLabelColor: .role(.onSurface),
        selectorOutlineColor: .none,
        selectorOutlineWidth: 1,
        selectorStateLayerColor: .role(.onSurface)
      )
    ),
    selected: TanreiDateTimePickerConditionTokens(
      enabled: TanreiDateTimePickerConditionStateTokens(
        selectorContainerColor: .role(.primaryContainer),
        selectorLabelColor: .role(.onPrimaryContainer),
        selectorOutlineColor: .none,
        selectorOutlineWidth: 1,
        selectorStateLayerColor: .role(.onPrimaryContainer)
      ),
      hovered: TanreiDateTimePickerConditionStateTokens(
        selectorContainerColor: .mix(base: .role(.primaryContainer), with: .role(.onPrimaryContainer), amount: 0.08),
        selectorLabelColor: .role(.onPrimaryContainer),
        selectorOutlineColor: .none,
        selectorOutlineWidth: 1,
        selectorStateLayerColor: .role(.onPrimaryContainer)
      ),
      focused: TanreiDateTimePickerConditionStateTokens(
        selectorContainerColor: .mix(base: .role(.primaryContainer), with: .role(.onPrimaryContainer), amount: 0.12),
        selectorLabelColor: .role(.onPrimaryContainer),
        selectorOutlineColor: .none,
        selectorOutlineWidth: 1,
        selectorStateLayerColor: .role(.onPrimaryContainer)
      ),
      pressed: TanreiDateTimePickerConditionStateTokens(
        selectorContainerColor: .mix(base: .role(.primaryContainer), with: .role(.onPrimaryContainer), amount: 0.12),
        selectorLabelColor: .role(.onPrimaryContainer),
        selectorOutlineColor: .none,
        selectorOutlineWidth: 1,
        selectorStateLayerColor: .role(.onPrimaryContainer)
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

private let m3ExpressiveLikeDescriptionListTokens = TanreiDescriptionListTokens(
  columnGap: 32,
  columnMinWidth: 144,
  dividerColor: .role(.outlineVariant),
  dividerThickness: 1,
  separation: 1,
  stackGap: 4,
  termColor: .role(.onSurfaceVariant),
  valueColor: .role(.onSurface),
  densitys: TanreiDescriptionListDensitys(
    regular: TanreiDescriptionListDensityTokens(
      factGap: 12,
      termGap: 16,
      termTypescale: m3ExpressiveLikeTypescale.label,
      valueTypescale: m3ExpressiveLikeTypescale.body,
      statValueTypescale: m3ExpressiveLikeTypescale.heading1
    ),
    compact: TanreiDescriptionListDensityTokens(
      factGap: 6,
      termGap: 8,
      termTypescale: m3ExpressiveLikeTypescale.labelSmall,
      valueTypescale: m3ExpressiveLikeTypescale.bodySmall,
      statValueTypescale: m3ExpressiveLikeTypescale.heading3
    )
  )
)

private let m3ExpressiveLikeDialogTokens = TanreiDialogTokens(
  actionsArrangement: 1,
  actionsGap: 8,
  actionsMarginBlockStart: 24,
  actionsVariant: 4,
  compactWindowWidth: 0,
  containerColor: .role(.surfaceContainerHigh),
  containerElevation: m3ExpressiveLikeElevation.level3,
  containerGap: 16,
  containerMargin: 16,
  containerMaxWidth: 560,
  containerMinWidth: 280,
  containerPadding: 24,
  containerShape: 28,
  contentColor: .role(.onSurface),
  dividerColor: .role(.outlineVariant),
  dividerVisibility: 1,
  dividerWidth: 1,
  headerGap: 12,
  headlineColor: .role(.onSurface),
  headlineTypescale: m3ExpressiveLikeTypescale.heading3,
  iconColor: .role(.secondary),
  iconPlacement: 1,
  iconSize: 24,
  motionEnterDuration: 300,
  motionEnterEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionEnterScale: 0.95,
  motionExitDuration: 200,
  motionExitEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  scrimBlur: 0,
  scrimColor: .role(.scrim),
  supportingTextColor: .role(.onSurfaceVariant),
  supportingTextTypescale: m3ExpressiveLikeTypescale.body,
  widthLarge: 800,
  widthMedium: 560,
  widthSmall: 400
)

private let m3ExpressiveLikeDividerTokens = TanreiDividerTokens(
  lineColor: .role(.outlineVariant),
  lineDashGap: 4,
  lineDashLength: 4,
  lineDotGap: 2,
  lineInset: 16,
  lineThickness: 1,
  lineWaveAmplitude: 2,
  lineWaveWavelength: 16
)

private let m3ExpressiveLikeDropZoneTokens = TanreiDropZoneTokens(
  iconColor: .role(.primary),
  iconSize: 32,
  labelColor: .role(.onSurface),
  labelTypescale: m3ExpressiveLikeTypescale.bodyLarge,
  motionDuration: 150,
  motionEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineColor: .role(.primary),
  outlineWidth: 2,
  panelContainerColor: .role(.surfaceContainerHigh),
  panelElevation: m3ExpressiveLikeElevation.level2,
  panelGap: 12,
  panelMargin: 16,
  panelMaxWidth: 360,
  panelPaddingBlock: 24,
  panelPaddingInline: 24,
  panelShape: 16,
  refusingIconColor: .role(.error),
  refusingOutlineColor: .role(.error),
  scrimColor: .role(.scrim)
)

private let m3ExpressiveLikeEmbeddedTextInputTokens = TanreiEmbeddedTextInputTokens(
  inputTypescale: m3ExpressiveLikeTypescale.bodyLarge,
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

private let m3ExpressiveLikeEmptyStateTokens = TanreiEmptyStateTokens(
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
      titleTypescale: m3ExpressiveLikeTypescale.heading5,
      descriptionTypescale: m3ExpressiveLikeTypescale.body
    ),
    large: TanreiEmptyStateSizeTokens(
      containerPaddingBlock: 64,
      mediaSize: 48,
      titleTypescale: m3ExpressiveLikeTypescale.heading3,
      descriptionTypescale: m3ExpressiveLikeTypescale.bodyLarge
    )
  )
)

private let m3ExpressiveLikeFabMenuTokens = TanreiFabMenuTokens(
  containerShapeOpen: 9999,
  itemGap: 8,
  itemHeight: 56,
  itemIconSize: 24,
  itemLabelTypescale: m3ExpressiveLikeTypescale.heading5,
  itemPaddingInlineEnd: 20,
  itemPaddingInlineStart: 16,
  itemShape: 9999,
  listGap: 4,
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
      containerShape: 12,
      iconSize: 24
    ),
    medium: TanreiFabMenuSizeTokens(
      containerSize: 56,
      containerShape: 16,
      iconSize: 24
    ),
    large: TanreiFabMenuSizeTokens(
      containerSize: 96,
      containerShape: 28,
      iconSize: 36
    )
  ),
  variants: TanreiFabMenuVariants(
    filled: TanreiFabMenuVariantTokens(
      enabled: TanreiFabMenuVariantStateTokens(
        containerColor: .role(.primary),
        containerElevation: m3ExpressiveLikeElevation.level3,
        iconColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary),
        openContainerColor: .role(.secondaryContainer),
        openContainerElevation: m3ExpressiveLikeElevation.level3,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .role(.primary),
        itemContainerElevation: m3ExpressiveLikeElevation.level2,
        itemLabelColor: .role(.onPrimary),
        itemIconColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      hovered: TanreiFabMenuVariantStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.08),
        containerElevation: m3ExpressiveLikeElevation.level4,
        iconColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary),
        openContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.08),
        openContainerElevation: m3ExpressiveLikeElevation.level4,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.08),
        itemContainerElevation: m3ExpressiveLikeElevation.level2,
        itemLabelColor: .role(.onPrimary),
        itemIconColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      focused: TanreiFabMenuVariantStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level3,
        iconColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary),
        openContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        openContainerElevation: m3ExpressiveLikeElevation.level3,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        itemContainerElevation: m3ExpressiveLikeElevation.level2,
        itemLabelColor: .role(.onPrimary),
        itemIconColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      pressed: TanreiFabMenuVariantStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level3,
        iconColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary),
        openContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        openContainerElevation: m3ExpressiveLikeElevation.level3,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        itemContainerElevation: m3ExpressiveLikeElevation.level2,
        itemLabelColor: .role(.onPrimary),
        itemIconColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      disabled: TanreiFabMenuVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        openContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        openContainerElevation: m3ExpressiveLikeElevation.level0,
        openIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        openStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        itemContainerElevation: m3ExpressiveLikeElevation.level0,
        itemLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    tonal: TanreiFabMenuVariantTokens(
      enabled: TanreiFabMenuVariantStateTokens(
        containerColor: .role(.primaryContainer),
        containerElevation: m3ExpressiveLikeElevation.level3,
        iconColor: .role(.onPrimaryContainer),
        stateLayerColor: .role(.onPrimaryContainer),
        openContainerColor: .role(.primary),
        openContainerElevation: m3ExpressiveLikeElevation.level3,
        openIconColor: .role(.onPrimary),
        openStateLayerColor: .role(.onPrimary),
        itemContainerColor: .role(.primaryContainer),
        itemContainerElevation: m3ExpressiveLikeElevation.level2,
        itemLabelColor: .role(.onPrimaryContainer),
        itemIconColor: .role(.onPrimaryContainer),
        itemStateLayerColor: .role(.onPrimaryContainer)
      ),
      hovered: TanreiFabMenuVariantStateTokens(
        containerColor: .mix(base: .role(.primaryContainer), with: .role(.onPrimaryContainer), amount: 0.08),
        containerElevation: m3ExpressiveLikeElevation.level4,
        iconColor: .role(.onPrimaryContainer),
        stateLayerColor: .role(.onPrimaryContainer),
        openContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.08),
        openContainerElevation: m3ExpressiveLikeElevation.level4,
        openIconColor: .role(.onPrimary),
        openStateLayerColor: .role(.onPrimary),
        itemContainerColor: .mix(base: .role(.primaryContainer), with: .role(.onPrimaryContainer), amount: 0.08),
        itemContainerElevation: m3ExpressiveLikeElevation.level2,
        itemLabelColor: .role(.onPrimaryContainer),
        itemIconColor: .role(.onPrimaryContainer),
        itemStateLayerColor: .role(.onPrimaryContainer)
      ),
      focused: TanreiFabMenuVariantStateTokens(
        containerColor: .mix(base: .role(.primaryContainer), with: .role(.onPrimaryContainer), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level3,
        iconColor: .role(.onPrimaryContainer),
        stateLayerColor: .role(.onPrimaryContainer),
        openContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        openContainerElevation: m3ExpressiveLikeElevation.level3,
        openIconColor: .role(.onPrimary),
        openStateLayerColor: .role(.onPrimary),
        itemContainerColor: .mix(base: .role(.primaryContainer), with: .role(.onPrimaryContainer), amount: 0.12),
        itemContainerElevation: m3ExpressiveLikeElevation.level2,
        itemLabelColor: .role(.onPrimaryContainer),
        itemIconColor: .role(.onPrimaryContainer),
        itemStateLayerColor: .role(.onPrimaryContainer)
      ),
      pressed: TanreiFabMenuVariantStateTokens(
        containerColor: .mix(base: .role(.primaryContainer), with: .role(.onPrimaryContainer), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level3,
        iconColor: .role(.onPrimaryContainer),
        stateLayerColor: .role(.onPrimaryContainer),
        openContainerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        openContainerElevation: m3ExpressiveLikeElevation.level3,
        openIconColor: .role(.onPrimary),
        openStateLayerColor: .role(.onPrimary),
        itemContainerColor: .mix(base: .role(.primaryContainer), with: .role(.onPrimaryContainer), amount: 0.12),
        itemContainerElevation: m3ExpressiveLikeElevation.level2,
        itemLabelColor: .role(.onPrimaryContainer),
        itemIconColor: .role(.onPrimaryContainer),
        itemStateLayerColor: .role(.onPrimaryContainer)
      ),
      disabled: TanreiFabMenuVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        openContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        openContainerElevation: m3ExpressiveLikeElevation.level0,
        openIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        openStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        itemContainerElevation: m3ExpressiveLikeElevation.level0,
        itemLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    surface: TanreiFabMenuVariantTokens(
      enabled: TanreiFabMenuVariantStateTokens(
        containerColor: .role(.surfaceContainerHigh),
        containerElevation: m3ExpressiveLikeElevation.level3,
        iconColor: .role(.primary),
        stateLayerColor: .role(.primary),
        openContainerColor: .role(.secondaryContainer),
        openContainerElevation: m3ExpressiveLikeElevation.level3,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .role(.surfaceContainerHigh),
        itemContainerElevation: m3ExpressiveLikeElevation.level2,
        itemLabelColor: .role(.onSurface),
        itemIconColor: .role(.primary),
        itemStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiFabMenuVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHigh), with: .role(.primary), amount: 0.08),
        containerElevation: m3ExpressiveLikeElevation.level4,
        iconColor: .role(.primary),
        stateLayerColor: .role(.primary),
        openContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.08),
        openContainerElevation: m3ExpressiveLikeElevation.level4,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .mix(base: .role(.surfaceContainerHigh), with: .role(.onSurface), amount: 0.08),
        itemContainerElevation: m3ExpressiveLikeElevation.level2,
        itemLabelColor: .role(.onSurface),
        itemIconColor: .role(.primary),
        itemStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiFabMenuVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHigh), with: .role(.primary), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level3,
        iconColor: .role(.primary),
        stateLayerColor: .role(.primary),
        openContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        openContainerElevation: m3ExpressiveLikeElevation.level3,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .mix(base: .role(.surfaceContainerHigh), with: .role(.onSurface), amount: 0.12),
        itemContainerElevation: m3ExpressiveLikeElevation.level2,
        itemLabelColor: .role(.onSurface),
        itemIconColor: .role(.primary),
        itemStateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiFabMenuVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHigh), with: .role(.primary), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level3,
        iconColor: .role(.primary),
        stateLayerColor: .role(.primary),
        openContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        openContainerElevation: m3ExpressiveLikeElevation.level3,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .mix(base: .role(.surfaceContainerHigh), with: .role(.onSurface), amount: 0.12),
        itemContainerElevation: m3ExpressiveLikeElevation.level2,
        itemLabelColor: .role(.onSurface),
        itemIconColor: .role(.primary),
        itemStateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiFabMenuVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        openContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        openContainerElevation: m3ExpressiveLikeElevation.level0,
        openIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        openStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        itemContainerElevation: m3ExpressiveLikeElevation.level0,
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

private let m3ExpressiveLikeFieldGroupTokens = TanreiFieldGroupTokens(
  errorTextGap: 4,
  fieldMinWidth: 144,
  gapInline: 16,
  labelGap: 8,
  labelTypescale: m3ExpressiveLikeTypescale.bodyLarge,
  requirementAsteriskGap: 0,
  requirementGap: 8,
  requirementMark: 1,
  supportingTextGap: 4,
  supportingTextTypescale: m3ExpressiveLikeTypescale.bodySmall,
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
        requiredAsteriskColor: .role(.onSurface),
        errorTextColor: .role(.error),
        errorLabelColor: .role(.onSurface),
        errorSupportingTextColor: .role(.onSurfaceVariant),
        errorRequiredAsteriskColor: .role(.onSurface)
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

private let m3ExpressiveLikeFieldTokens = TanreiFieldTokens(
  counterGap: 16,
  errorTextGap: 4,
  errorTextPlacement: 0,
  labelIconGap: 8,
  labelIconSize: 20,
  labelGap: 8,
  labelTypescale: m3ExpressiveLikeTypescale.bodyLarge,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  requirementAsteriskGap: 0,
  requirementGap: 8,
  requirementMark: 1,
  supportingTextGap: 4,
  supportingTextTypescale: m3ExpressiveLikeTypescale.bodySmall,
  valueTextGap: 16,
  valueTextTypescale: m3ExpressiveLikeTypescale.label,
  conditions: TanreiFieldConditions(
    standard: TanreiFieldConditionTokens(
      enabled: TanreiFieldConditionStateTokens(
        labelColor: .role(.onSurface),
        labelIconColor: .role(.onSurfaceVariant),
        supportingTextColor: .role(.onSurfaceVariant),
        requiredAsteriskColor: .role(.onSurface),
        errorLabelColor: .role(.onSurface),
        errorLabelIconColor: .role(.onSurfaceVariant),
        errorSupportingTextColor: .role(.onSurfaceVariant),
        errorRequiredAsteriskColor: .role(.onSurface),
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
        errorRequiredAsteriskColor: .role(.onSurface),
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

private let m3ExpressiveLikeFigureTokens = TanreiFigureTokens(
  attachmentGap: 8,
  captionColor: .role(.onSurfaceVariant),
  captionGap: 8,
  captionTypescale: m3ExpressiveLikeTypescale.bodySmall,
  containerShape: 12,
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
  separation: 1,
  stagePaddingBlock: 32,
  stagePaddingInline: 24,
  titleColor: .role(.onSurface),
  titleTypescale: m3ExpressiveLikeTypescale.heading6,
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

private let m3ExpressiveLikeFileItemTokens = TanreiFileItemTokens(
  actionGap: 16,
  actionIconSize: 20,
  actionShape: 9999,
  actionSize: 32,
  doneIconColor: .role(.success),
  errorIconColor: .role(.error),
  errorSupportingTextColor: .role(.error),
  headlineColor: .role(.onSurface),
  headlineTypescale: m3ExpressiveLikeTypescale.body,
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
  rowContainerShape: 8,
  rowIconSize: 24,
  rowMediaHeight: 40,
  rowMediaShape: 8,
  statusIconGap: 4,
  statusIconSize: 16,
  supportingTextColor: .role(.onSurfaceVariant),
  supportingTextTypescale: m3ExpressiveLikeTypescale.bodySmall,
  tileActionInset: 4,
  tileContainerGap: 6,
  tileContainerShape: 12,
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        stateLayerColor: .role(.onSurface),
        actionContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        stateLayerColor: .role(.onSurface),
        actionContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        stateLayerColor: .role(.onSurface),
        actionContainerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurfaceVariant), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        stateLayerColor: .role(.onSurface),
        actionContainerColor: .mix(base: .role(.surfaceContainerLowest), with: .role(.onSurfaceVariant), amount: 0.12),
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

private let m3ExpressiveLikeFilePickerTokens = TanreiFilePickerTokens(
  containerGap: 12,
  containerPaddingBlock: 32,
  containerPaddingInline: 16,
  containerShape: 12,
  iconSize: 32,
  labelTypescale: m3ExpressiveLikeTypescale.body,
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
  selectionTextTypescale: m3ExpressiveLikeTypescale.body,
  supportingTextGap: 8,
  supportingTextTypescale: m3ExpressiveLikeTypescale.bodySmall,
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
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

private let m3ExpressiveLikeFileUploadTokens = TanreiFileUploadTokens(
  listGap: 16
)

private let m3ExpressiveLikeHandleTokens = TanreiHandleTokens(
  containerShape: 9999,
  inset: 4,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  sizes: TanreiHandleSizes(
    small: TanreiHandleSizeTokens(
      containerLength: 20,
      containerBreadth: 16,
      lineLength: 12,
      lineThickness: 3,
      lineActiveLength: 16,
      lineActiveThickness: 4,
      arcRadius: 8
    ),
    medium: TanreiHandleSizeTokens(
      containerLength: 48,
      containerBreadth: 24,
      lineLength: 32,
      lineThickness: 4,
      lineActiveLength: 40,
      lineActiveThickness: 6,
      arcRadius: 16
    )
  ),
  conditions: TanreiHandleConditions(
    standard: TanreiHandleConditionTokens(
      enabled: TanreiHandleConditionStateTokens(
        containerColor: .none,
        lineColor: .role(.outline),
        stateLayerColor: .role(.outline)
      ),
      hovered: TanreiHandleConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.outline), amount: 0.08),
        lineColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.outline)
      ),
      focused: TanreiHandleConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.outline), amount: 0.12),
        lineColor: .role(.outline),
        stateLayerColor: .role(.outline)
      ),
      pressed: TanreiHandleConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.outline), amount: 0.12),
        lineColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.outline)
      ),
      disabled: TanreiHandleConditionStateTokens(
        containerColor: .none,
        lineColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiHandleStateTokens(
    opacity: 1
  ),
  focused: TanreiHandleStateTokens(
    opacity: 1
  ),
  pressed: TanreiHandleStateTokens(
    opacity: 1
  ),
  disabled: TanreiHandleStateTokens(
    opacity: 1
  )
)

private let m3ExpressiveLikeImagePreviewTokens = TanreiImagePreviewTokens(
  barButtonVariant: 4,
  barContainerColor: .role(.surface),
  barGap: 12,
  barHeight: 56,
  barPaddingInline: 8,
  captionColor: .role(.onSurface),
  captionContainerColor: .role(.surface),
  captionMaxWidth: 640,
  captionPaddingBlock: 12,
  captionPaddingInline: 16,
  captionTypescale: m3ExpressiveLikeTypescale.body,
  containerColor: .role(.surface),
  countColor: .role(.onSurfaceVariant),
  countPaddingInline: 8,
  countTypescale: m3ExpressiveLikeTypescale.label,
  errorGap: 8,
  errorIconColor: .role(.onSurfaceVariant),
  errorIconSize: 32,
  errorTextColor: .role(.onSurfaceVariant),
  errorTextTypescale: m3ExpressiveLikeTypescale.body,
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

private let m3ExpressiveLikeInlineCodeTokens = TanreiInlineCodeTokens(
  containerColor: .role(.surfaceContainerHighest),
  containerPaddingInline: 4,
  containerShape: 4,
  labelColor: .role(.onSurface),
  labelScale: 0.9286,
  labelTypescale: m3ExpressiveLikeTypescale.code,
  outlineColor: .role(.outlineVariant),
  outlineWidth: 0
)

private let m3ExpressiveLikeInputBoxTokens = TanreiInputBoxTokens(
  activeIndicatorWidth: 1,
  affixGap: 2,
  containerShape: 4,
  containerShapeBottom: 0,
  motionLabelDuration: 150,
  motionLabelEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineNotchPadding: 4,
  outlineWidth: 1,
  requirementAsteriskGap: 0,
  selectionColor: .role(.primaryContainer),
  selectionContentColor: .role(.onSurface),
  sizes: TanreiInputBoxSizes(
    small: TanreiInputBoxSizeTokens(
      containerHeight: 40,
      containerPaddingInline: 12,
      containerPaddingInlineWithIcon: 8,
      containerPaddingBlock: 8,
      containerPaddingBlockWithLabel: 2,
      containerGap: 8,
      labelTypescale: m3ExpressiveLikeTypescale.bodyLarge,
      labelFloatedTypescale: m3ExpressiveLikeTypescale.bodySmall,
      inputTypescale: m3ExpressiveLikeTypescale.body,
      iconSize: 20,
      motionStateDuration: 150
    ),
    medium: TanreiInputBoxSizeTokens(
      containerHeight: 56,
      containerPaddingInline: 16,
      containerPaddingInlineWithIcon: 12,
      containerPaddingBlock: 16,
      containerPaddingBlockWithLabel: 8,
      containerGap: 16,
      labelTypescale: m3ExpressiveLikeTypescale.bodyLarge,
      labelFloatedTypescale: m3ExpressiveLikeTypescale.bodySmall,
      inputTypescale: m3ExpressiveLikeTypescale.bodyLarge,
      iconSize: 24,
      motionStateDuration: 150
    ),
    large: TanreiInputBoxSizeTokens(
      containerHeight: 56,
      containerPaddingInline: 16,
      containerPaddingInlineWithIcon: 12,
      containerPaddingBlock: 16,
      containerPaddingBlockWithLabel: 8,
      containerGap: 16,
      labelTypescale: m3ExpressiveLikeTypescale.bodyLarge,
      labelFloatedTypescale: m3ExpressiveLikeTypescale.bodySmall,
      inputTypescale: m3ExpressiveLikeTypescale.bodyLarge,
      iconSize: 24,
      motionStateDuration: 150
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
        requiredAsteriskColor: .role(.onSurface),
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
        errorRequiredAsteriskColor: .role(.onSurface),
        errorStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiInputBoxVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.08),
        activeIndicatorColor: .none,
        outlineColor: .none,
        labelColor: .role(.onSurface),
        inputColor: .role(.onSurface),
        placeholderColor: .role(.onSurfaceVariant),
        affixColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurfaceVariant),
        trailingIconColor: .role(.onSurfaceVariant),
        caretColor: .role(.primary),
        requiredAsteriskColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface),
        errorContainerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.08),
        errorActiveIndicatorColor: .none,
        errorOutlineColor: .role(.error),
        errorLabelColor: .role(.onSurface),
        errorInputColor: .role(.onSurface),
        errorPlaceholderColor: .role(.onSurfaceVariant),
        errorAffixColor: .role(.onSurfaceVariant),
        errorLeadingIconColor: .role(.onSurfaceVariant),
        errorTrailingIconColor: .role(.error),
        errorCaretColor: .role(.error),
        errorRequiredAsteriskColor: .role(.onSurface),
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
        errorRequiredAsteriskColor: .role(.onSurface),
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
        activeIndicatorColor: .role(.onSurfaceVariant),
        outlineColor: .none,
        labelColor: .role(.onSurfaceVariant),
        inputColor: .role(.onSurface),
        placeholderColor: .role(.onSurfaceVariant),
        affixColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurfaceVariant),
        trailingIconColor: .role(.onSurfaceVariant),
        caretColor: .role(.primary),
        requiredAsteriskColor: .role(.onSurfaceVariant),
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
        errorRequiredAsteriskColor: .role(.error),
        errorStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiInputBoxVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.08),
        activeIndicatorColor: .role(.onSurface),
        outlineColor: .none,
        labelColor: .role(.onSurfaceVariant),
        inputColor: .role(.onSurface),
        placeholderColor: .role(.onSurfaceVariant),
        affixColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurfaceVariant),
        trailingIconColor: .role(.onSurfaceVariant),
        caretColor: .role(.primary),
        requiredAsteriskColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        errorContainerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.08),
        errorActiveIndicatorColor: .role(.onErrorContainer),
        errorOutlineColor: .none,
        errorLabelColor: .role(.onErrorContainer),
        errorInputColor: .role(.onSurface),
        errorPlaceholderColor: .role(.onSurfaceVariant),
        errorAffixColor: .role(.onSurfaceVariant),
        errorLeadingIconColor: .role(.onSurfaceVariant),
        errorTrailingIconColor: .role(.error),
        errorCaretColor: .role(.error),
        errorRequiredAsteriskColor: .role(.onErrorContainer),
        errorStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiInputBoxVariantStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        activeIndicatorColor: .role(.primary),
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
        errorRequiredAsteriskColor: .role(.error),
        errorStateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiInputBoxVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.04),
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
        errorContainerColor: .alpha(of: .role(.onSurface), amount: 0.04),
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
        requiredAsteriskColor: .role(.onSurfaceVariant),
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
        errorRequiredAsteriskColor: .role(.error),
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
        requiredAsteriskColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        errorContainerColor: .none,
        errorActiveIndicatorColor: .none,
        errorOutlineColor: .role(.onErrorContainer),
        errorLabelColor: .role(.onErrorContainer),
        errorInputColor: .role(.onSurface),
        errorPlaceholderColor: .role(.onSurfaceVariant),
        errorAffixColor: .role(.onSurfaceVariant),
        errorLeadingIconColor: .role(.onSurfaceVariant),
        errorTrailingIconColor: .role(.error),
        errorCaretColor: .role(.error),
        errorRequiredAsteriskColor: .role(.onErrorContainer),
        errorStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiInputBoxVariantStateTokens(
        containerColor: .none,
        activeIndicatorColor: .none,
        outlineColor: .role(.primary),
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
        errorRequiredAsteriskColor: .role(.error),
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

private let m3ExpressiveLikeKeyboardShortcutTokens = TanreiKeyboardShortcutTokens(
  containerColor: .role(.surfaceContainerHigh),
  outlineBottomWidth: 2,
  outlineColor: .role(.outlineVariant),
  outlineWidth: 1,
  sizes: TanreiKeyboardShortcutSizes(
    small: TanreiKeyboardShortcutSizeTokens(
      containerHeight: 20,
      containerPaddingInline: 4,
      containerShape: 4,
      labelTypescale: m3ExpressiveLikeTypescale.labelSmall,
      chordGap: 2,
      sequenceGap: 8
    ),
    medium: TanreiKeyboardShortcutSizeTokens(
      containerHeight: 24,
      containerPaddingInline: 6,
      containerShape: 8,
      labelTypescale: m3ExpressiveLikeTypescale.label,
      chordGap: 4,
      sequenceGap: 12
    )
  ),
  variants: TanreiKeyboardShortcutVariants(
    keycap: TanreiKeyboardShortcutVariantTokens(
      enabled: TanreiKeyboardShortcutVariantStateTokens(
        labelColor: .role(.onSurface)
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

private let m3ExpressiveLikeLinkCardTokens = TanreiLinkCardTokens(
  containerPadding: 16,
  containerShape: 12,
  descriptionMaxLines: 2,
  descriptionTypescale: m3ExpressiveLikeTypescale.body,
  layoutBesideMinWidth: 480,
  mediaAspectRatio: 1.9,
  mediaContainerColor: .role(.surfaceContainerHigh),
  mediaWidth: 192,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineWidth: 1,
  siteGap: 8,
  siteIconShape: 4,
  siteIconSize: 16,
  siteItemGap: 6,
  siteTypescale: m3ExpressiveLikeTypescale.bodySmall,
  titleGap: 4,
  titleMaxLines: 2,
  titleTypescale: m3ExpressiveLikeTypescale.heading5,
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
        containerColor: .mix(base: .role(.surface), with: .role(.onSurface), amount: 0.08),
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
        containerColor: .mix(base: .role(.surface), with: .role(.onSurface), amount: 0.12),
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
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.08),
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
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.12),
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

private let m3ExpressiveLikeLinkTokens = TanreiLinkTokens(
  containerGap: 4,
  containerShape: 4,
  externalMarks: 0,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  siteIconDisabledOpacity: 0.38,
  siteIconShape: 4,
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
        containerColor: .mix(base: .none, with: .role(.link), amount: 0.08),
        labelColor: .role(.link),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.link),
        currentContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.link), amount: 0.12),
        labelColor: .role(.link),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.link),
        currentContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
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
        containerColor: .mix(base: .none, with: .role(.inverseLink), amount: 0.08),
        labelColor: .role(.inverseLink),
        iconColor: .role(.inverseOnSurface),
        stateLayerColor: .role(.inverseLink),
        currentContainerColor: .mix(base: .none, with: .role(.inverseOnSurface), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.inverseLink), amount: 0.12),
        labelColor: .role(.inverseLink),
        iconColor: .role(.inverseOnSurface),
        stateLayerColor: .role(.inverseLink),
        currentContainerColor: .mix(base: .none, with: .role(.inverseOnSurface), amount: 0.12),
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
    containerShape: 4,
    opacity: 1
  ),
  focused: TanreiLinkStateTokens(
    containerShape: 4,
    opacity: 1
  ),
  pressed: TanreiLinkStateTokens(
    containerShape: 4,
    opacity: 1
  ),
  disabled: TanreiLinkStateTokens(
    containerShape: 4,
    opacity: 1
  )
)

private let m3ExpressiveLikeListRowTokens = TanreiListRowTokens(
  containerGap: 16,
  containerPaddingInlineEnd: 24,
  containerPaddingInlineStart: 16,
  headlineColor: .role(.onSurface),
  headlineTypescale: m3ExpressiveLikeTypescale.bodyLarge,
  leadingIconColor: .role(.onSurfaceVariant),
  leadingIconSize: 24,
  overlineColor: .role(.onSurfaceVariant),
  overlineTypescale: m3ExpressiveLikeTypescale.labelSmall,
  supportingTextColor: .role(.onSurfaceVariant),
  supportingTextTypescale: m3ExpressiveLikeTypescale.bodySmall,
  trailingIconColor: .role(.onSurfaceVariant),
  trailingIconSize: 24,
  trailingTextColor: .role(.onSurfaceVariant),
  trailingTextTypescale: m3ExpressiveLikeTypescale.bodySmall,
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

private let m3ExpressiveLikeListTokens = TanreiListTokens(
  containerGap: 16,
  containerPaddingInlineEnd: 24,
  containerPaddingInlineStart: 16,
  containerShape: 0,
  contentTypescale: m3ExpressiveLikeTypescale.bodyLarge,
  dividerColor: .role(.outlineVariant),
  dividerThickness: 1,
  draggedContainerColor: .role(.surfaceContainerHigh),
  draggedContainerElevation: m3ExpressiveLikeElevation.level3,
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
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
        containerColor: .role(.secondaryContainer),
        contentColor: .role(.onSecondaryContainer),
        markColor: .role(.primary),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiListConditionStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.08),
        contentColor: .role(.onSecondaryContainer),
        markColor: .role(.primary),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiListConditionStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        contentColor: .role(.onSecondaryContainer),
        markColor: .role(.primary),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiListConditionStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        contentColor: .role(.onSecondaryContainer),
        markColor: .role(.primary),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiListConditionStateTokens(
        containerColor: .role(.secondaryContainer),
        contentColor: .role(.onSecondaryContainer),
        markColor: .role(.primary),
        stateLayerColor: .role(.onSecondaryContainer)
      )
    )
  ),
  densitys: TanreiListDensitys(
    regular: TanreiListDensityTokens(
      containerHeight: 56,
      containerPaddingBlock: 8
    ),
    compact: TanreiListDensityTokens(
      containerHeight: 32,
      containerPaddingBlock: 4
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

private let m3ExpressiveLikeLoadingIndicatorTokens = TanreiLoadingIndicatorTokens(
  containedContainerColor: .role(.primaryContainer),
  containedContainerElevation: m3ExpressiveLikeElevation.level0,
  containedIndicatorColor: .role(.onPrimaryContainer),
  containerShape: 9999,
  indicatorColor: .role(.primary),
  motionCycleDuration: 1000,
  motionEnterDuration: 200,
  motionEnterEasing: TanreiCubicBezier(0, 0, 0, 1),
  motionEntrance: 0,
  motionShowDelay: 300,
  sizes: TanreiLoadingIndicatorSizes(
    small: TanreiLoadingIndicatorSizeTokens(
      indicatorSize: 24,
      indicatorThickness: 4,
      containerSize: 32
    ),
    medium: TanreiLoadingIndicatorSizeTokens(
      indicatorSize: 38,
      indicatorThickness: 4,
      containerSize: 48
    ),
    large: TanreiLoadingIndicatorSizeTokens(
      indicatorSize: 48,
      indicatorThickness: 4,
      containerSize: 56
    )
  )
)

private let m3ExpressiveLikeMainActionButtonTokens = TanreiMainActionButtonTokens(
  motionFeedbackDuration: 450,
  motionResizeDuration: 500,
  motionResizeEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  sizes: TanreiMainActionButtonSizes(
    small: TanreiMainActionButtonSizeTokens(
      containerHeight: 40,
      containerShape: 12,
      containerPaddingInlineStart: 16,
      containerPaddingInlineEnd: 16,
      containerPaddingInlineStartWithIcon: 12,
      containerPaddingInlineEndWithIcon: 12,
      containerPaddingBlock: 6,
      containerGap: 8,
      labelTypescale: m3ExpressiveLikeTypescale.label,
      iconSize: 24,
      motionStateDuration: 150
    ),
    medium: TanreiMainActionButtonSizeTokens(
      containerHeight: 56,
      containerShape: 16,
      containerPaddingInlineStart: 20,
      containerPaddingInlineEnd: 20,
      containerPaddingInlineStartWithIcon: 16,
      containerPaddingInlineEndWithIcon: 20,
      containerPaddingBlock: 6,
      containerGap: 12,
      labelTypescale: m3ExpressiveLikeTypescale.label,
      iconSize: 24,
      motionStateDuration: 150
    ),
    large: TanreiMainActionButtonSizeTokens(
      containerHeight: 96,
      containerShape: 28,
      containerPaddingInlineStart: 32,
      containerPaddingInlineEnd: 32,
      containerPaddingInlineStartWithIcon: 24,
      containerPaddingInlineEndWithIcon: 32,
      containerPaddingBlock: 6,
      containerGap: 16,
      labelTypescale: m3ExpressiveLikeTypescale.heading5,
      iconSize: 36,
      motionStateDuration: 150
    )
  ),
  variants: TanreiMainActionButtonVariants(
    filled: TanreiMainActionButtonVariantTokens(
      enabled: TanreiMainActionButtonVariantStateTokens(
        containerColor: .role(.primary),
        containerElevation: m3ExpressiveLikeElevation.level3,
        labelColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary)
      ),
      hovered: TanreiMainActionButtonVariantStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.08),
        containerElevation: m3ExpressiveLikeElevation.level4,
        labelColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary)
      ),
      focused: TanreiMainActionButtonVariantStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level3,
        labelColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary)
      ),
      pressed: TanreiMainActionButtonVariantStateTokens(
        containerColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level3,
        labelColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary)
      ),
      disabled: TanreiMainActionButtonVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    tonal: TanreiMainActionButtonVariantTokens(
      enabled: TanreiMainActionButtonVariantStateTokens(
        containerColor: .role(.primaryContainer),
        containerElevation: m3ExpressiveLikeElevation.level3,
        labelColor: .role(.onPrimaryContainer),
        stateLayerColor: .role(.onPrimaryContainer)
      ),
      hovered: TanreiMainActionButtonVariantStateTokens(
        containerColor: .mix(base: .role(.primaryContainer), with: .role(.onPrimaryContainer), amount: 0.08),
        containerElevation: m3ExpressiveLikeElevation.level4,
        labelColor: .role(.onPrimaryContainer),
        stateLayerColor: .role(.onPrimaryContainer)
      ),
      focused: TanreiMainActionButtonVariantStateTokens(
        containerColor: .mix(base: .role(.primaryContainer), with: .role(.onPrimaryContainer), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level3,
        labelColor: .role(.onPrimaryContainer),
        stateLayerColor: .role(.onPrimaryContainer)
      ),
      pressed: TanreiMainActionButtonVariantStateTokens(
        containerColor: .mix(base: .role(.primaryContainer), with: .role(.onPrimaryContainer), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level3,
        labelColor: .role(.onPrimaryContainer),
        stateLayerColor: .role(.onPrimaryContainer)
      ),
      disabled: TanreiMainActionButtonVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    surface: TanreiMainActionButtonVariantTokens(
      enabled: TanreiMainActionButtonVariantStateTokens(
        containerColor: .role(.surfaceContainerHigh),
        containerElevation: m3ExpressiveLikeElevation.level3,
        labelColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      hovered: TanreiMainActionButtonVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHigh), with: .role(.primary), amount: 0.08),
        containerElevation: m3ExpressiveLikeElevation.level4,
        labelColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      focused: TanreiMainActionButtonVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHigh), with: .role(.primary), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level3,
        labelColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      pressed: TanreiMainActionButtonVariantStateTokens(
        containerColor: .mix(base: .role(.surfaceContainerHigh), with: .role(.primary), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level3,
        labelColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      disabled: TanreiMainActionButtonVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
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

private let m3ExpressiveLikeMenuTokens = TanreiMenuTokens(
  checkboxItemMark: 1,
  containerShape: 0,
  controlBoxShape: 4,
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
  dividerSpace: 8,
  dividerThickness: 1,
  groupTitleColor: .role(.onSurfaceVariant),
  groupTitleTypescale: m3ExpressiveLikeTypescale.labelSmall,
  groupGap: 16,
  labelTypescale: m3ExpressiveLikeTypescale.label,
  markWidth: 2,
  motionCloseDuration: 100,
  motionCloseEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  motionFeedbackDuration: 450,
  motionOpenDuration: 200,
  motionOpenEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionSubmenuDelay: 200,
  radioItemMark: 1,
  separation: 0,
  shortcutVariant: 1,
  submenuOffset: 4,
  supportingTextTypescale: m3ExpressiveLikeTypescale.bodySmall,
  surfaceColor: .role(.surfaceContainer),
  surfaceElevation: m3ExpressiveLikeElevation.level2,
  surfaceMaxWidth: 280,
  surfaceMinWidth: 112,
  surfaceOffset: 4,
  surfacePaddingBlock: 8,
  surfacePaddingInline: 0,
  surfaceShape: 4,
  surfaceViewportMargin: 8,
  trailingTextTypescale: m3ExpressiveLikeTypescale.labelSmall,
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
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
        containerColor: .none,
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurface),
        trailingIconColor: .role(.onSurfaceVariant),
        markColor: .role(.primary),
        controlColor: .role(.primary),
        controlMarkColor: .role(.onPrimary),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiMenuConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurface),
        trailingIconColor: .role(.onSurfaceVariant),
        markColor: .role(.primary),
        controlColor: .role(.primary),
        controlMarkColor: .role(.onPrimary),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiMenuConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurface),
        trailingIconColor: .role(.onSurfaceVariant),
        markColor: .role(.primary),
        controlColor: .role(.primary),
        controlMarkColor: .role(.onPrimary),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiMenuConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        leadingIconColor: .role(.onSurface),
        trailingIconColor: .role(.onSurfaceVariant),
        markColor: .role(.primary),
        controlColor: .role(.primary),
        controlMarkColor: .role(.onPrimary),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiMenuConditionStateTokens(
        containerColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        supportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        trailingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        leadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        trailingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        markColor: .alpha(of: .role(.onSurface), amount: 0.38),
        controlColor: .alpha(of: .role(.onSurface), amount: 0.38),
        controlMarkColor: .role(.surfaceContainer),
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
        containerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.08),
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
        containerColor: .role(.surfaceContainerHigh),
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
        containerColor: .mix(base: .role(.surfaceContainerHigh), with: .role(.onSurface), amount: 0.08),
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
        containerColor: .mix(base: .role(.surfaceContainerHigh), with: .role(.onSurface), amount: 0.12),
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
        containerColor: .mix(base: .role(.surfaceContainerHigh), with: .role(.onSurface), amount: 0.12),
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
        containerColor: .role(.surfaceContainerHigh),
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
  densitys: TanreiMenuDensitys(
    regular: TanreiMenuDensityTokens(
      containerHeight: 48,
      containerPaddingInline: 12,
      containerPaddingBlock: 8,
      containerGap: 12,
      leadingIconSize: 24,
      trailingIconSize: 24,
      markSize: 24,
      groupTitlePaddingInline: 12
    ),
    compact: TanreiMenuDensityTokens(
      containerHeight: 32,
      containerPaddingInline: 8,
      containerPaddingBlock: 6,
      containerGap: 8,
      leadingIconSize: 20,
      trailingIconSize: 20,
      markSize: 20,
      groupTitlePaddingInline: 8
    )
  ),
  hovered: TanreiMenuStateTokens(
    containerShape: 0,
    opacity: 1
  ),
  focused: TanreiMenuStateTokens(
    containerShape: 0,
    opacity: 1
  ),
  pressed: TanreiMenuStateTokens(
    containerShape: 0,
    opacity: 1
  ),
  disabled: TanreiMenuStateTokens(
    containerShape: 0,
    opacity: 1
  )
)

private let m3ExpressiveLikeMenubarTokens = TanreiMenubarTokens(
  barColor: .none,
  barGap: 2,
  barPaddingBlock: 4,
  barPaddingInline: 4,
  containerGap: 4,
  containerHeight: 40,
  containerPaddingInline: 12,
  containerShape: 8,
  iconSize: 24,
  indicatorSize: 20,
  labelTypescale: m3ExpressiveLikeTypescale.label,
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
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
        containerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.08),
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
        containerColor: .mix(base: .alpha(of: .role(.onSecondaryContainer), amount: 0.16), with: .role(.onSecondaryContainer), amount: 0.12),
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
        containerColor: .alpha(of: .role(.onSurface), amount: 0.08),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiMenubarConditionStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.08),
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
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiMenubarConditionStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.08),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiMenubarStateTokens(
    containerShape: 8,
    opacity: 1
  ),
  focused: TanreiMenubarStateTokens(
    containerShape: 8,
    opacity: 1
  ),
  pressed: TanreiMenubarStateTokens(
    containerShape: 8,
    opacity: 1
  ),
  disabled: TanreiMenubarStateTokens(
    containerShape: 8,
    opacity: 1
  )
)

private let m3ExpressiveLikeMeterTokens = TanreiMeterTokens(
  errorIndicatorColor: .role(.error),
  indicatorColor: .role(.primary),
  infoIndicatorColor: .role(.info),
  motionValueDuration: 300,
  motionValueEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  stopIndicatorSize: 4,
  successIndicatorColor: .role(.success),
  trackColor: .role(.secondaryContainer),
  trackGap: 4,
  trackSeparation: 1,
  trackShape: 9999,
  warningIndicatorColor: .role(.warning),
  sizes: TanreiMeterSizes(
    small: TanreiMeterSizeTokens(
      linearThickness: 4,
      circularSize: 24,
      circularThickness: 4
    ),
    medium: TanreiMeterSizeTokens(
      linearThickness: 4,
      circularSize: 40,
      circularThickness: 4
    ),
    large: TanreiMeterSizeTokens(
      linearThickness: 4,
      circularSize: 48,
      circularThickness: 4
    )
  )
)

private let m3ExpressiveLikeModalLayerTokens = TanreiModalLayerTokens(
  motionEnterDuration: 300,
  motionEnterEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionExitDuration: 200,
  motionExitEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  scrimBlur: 0,
  scrimColor: .role(.scrim)
)

private let m3ExpressiveLikeNavigationBarTokens = TanreiNavigationBarTokens(
  containerColor: .role(.surfaceContainer),
  containerElevation: m3ExpressiveLikeElevation.level0,
  containerHeight: 80,
  containerPadding: 0,
  itemContainerPaddingBlock: 0,
  itemContainerPaddingInline: 0,
  itemContainerShape: 9999,
  itemGap: 4,
  itemIconIndicatorHeight: 32,
  itemIconIndicatorShape: 9999,
  itemIconIndicatorWidth: 64,
  itemIconSize: 24,
  itemLabelTypescale: m3ExpressiveLikeTypescale.labelSmall,
  motionFeedbackDuration: 450,
  motionSelectionDuration: 350,
  motionSelectionEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineColor: .none,
  outlineWidth: 1,
  conditions: TanreiNavigationBarConditions(
    unselected: TanreiNavigationBarConditionTokens(
      enabled: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemCoveredIconColor: .role(.onSurfaceVariant),
        itemCoveredLabelColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .none
      ),
      hovered: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .none, amount: 0.08),
        itemIconIndicatorColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.08),
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemCoveredIconColor: .role(.onSurfaceVariant),
        itemCoveredLabelColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .none
      ),
      focused: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .none, amount: 0.12),
        itemIconIndicatorColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemCoveredIconColor: .role(.onSurfaceVariant),
        itemCoveredLabelColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .none
      ),
      pressed: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .none, amount: 0.12),
        itemIconIndicatorColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemCoveredIconColor: .role(.onSurfaceVariant),
        itemCoveredLabelColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .none
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
        itemContainerColor: .none,
        itemIconIndicatorColor: .role(.secondaryContainer),
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSurface),
        itemCoveredIconColor: .role(.onSecondaryContainer),
        itemCoveredLabelColor: .role(.onSurface),
        itemStateLayerColor: .none
      ),
      hovered: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .none, amount: 0.08),
        itemIconIndicatorColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.08),
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSurface),
        itemCoveredIconColor: .role(.onSecondaryContainer),
        itemCoveredLabelColor: .role(.onSurface),
        itemStateLayerColor: .none
      ),
      focused: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .none, amount: 0.12),
        itemIconIndicatorColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSurface),
        itemCoveredIconColor: .role(.onSecondaryContainer),
        itemCoveredLabelColor: .role(.onSurface),
        itemStateLayerColor: .none
      ),
      pressed: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .none, amount: 0.12),
        itemIconIndicatorColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSurface),
        itemCoveredIconColor: .role(.onSecondaryContainer),
        itemCoveredLabelColor: .role(.onSurface),
        itemStateLayerColor: .none
      ),
      disabled: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .role(.secondaryContainer),
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
        itemCoveredIconColor: .role(.onSurfaceVariant),
        itemCoveredLabelColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .none
      ),
      hovered: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .none, amount: 0.08),
        itemIconIndicatorColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.08),
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemCoveredIconColor: .role(.onSurfaceVariant),
        itemCoveredLabelColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .none
      ),
      focused: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .none, amount: 0.12),
        itemIconIndicatorColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemCoveredIconColor: .role(.onSurfaceVariant),
        itemCoveredLabelColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .none
      ),
      pressed: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .none, amount: 0.12),
        itemIconIndicatorColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemCoveredIconColor: .role(.onSurfaceVariant),
        itemCoveredLabelColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .none
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
        itemContainerColor: .none,
        itemIconIndicatorColor: .role(.primary),
        itemIconColor: .role(.onPrimary),
        itemLabelColor: .role(.onSurface),
        itemCoveredIconColor: .role(.onPrimary),
        itemCoveredLabelColor: .role(.onSurface),
        itemStateLayerColor: .none
      ),
      hovered: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .none, amount: 0.08),
        itemIconIndicatorColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.08),
        itemIconColor: .role(.onPrimary),
        itemLabelColor: .role(.onSurface),
        itemCoveredIconColor: .role(.onPrimary),
        itemCoveredLabelColor: .role(.onSurface),
        itemStateLayerColor: .none
      ),
      focused: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .none, amount: 0.12),
        itemIconIndicatorColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        itemIconColor: .role(.onPrimary),
        itemLabelColor: .role(.onSurface),
        itemCoveredIconColor: .role(.onPrimary),
        itemCoveredLabelColor: .role(.onSurface),
        itemStateLayerColor: .none
      ),
      pressed: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .none, amount: 0.12),
        itemIconIndicatorColor: .mix(base: .role(.primary), with: .role(.onPrimary), amount: 0.12),
        itemIconColor: .role(.onPrimary),
        itemLabelColor: .role(.onSurface),
        itemCoveredIconColor: .role(.onPrimary),
        itemCoveredLabelColor: .role(.onSurface),
        itemStateLayerColor: .none
      ),
      disabled: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .alpha(of: .role(.onSurface), amount: 0.12),
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

private let m3ExpressiveLikeNavigationDrawerTokens = TanreiNavigationDrawerTokens(
  breakpointCollapsed: 600,
  breakpointExpanded: 1024,
  collapsedItemContainerPaddingInline: 0,
  collapsedItemContainerShape: 9999,
  collapsedItemGap: 4,
  collapsedItemLabelTypescale: m3ExpressiveLikeTypescale.labelSmall,
  containerPaddingBlock: 12,
  containerPaddingInline: 12,
  containerWidth: 360,
  guideColor: .role(.outlineVariant),
  guideWidth: 1,
  headerColor: .role(.onSurface),
  headerGap: 24,
  headerItemGap: 8,
  headerTypescale: m3ExpressiveLikeTypescale.heading5,
  headingColor: .role(.onSurfaceVariant),
  headingTypescale: m3ExpressiveLikeTypescale.heading6,
  itemContainerShape: 9999,
  itemGap: 12,
  itemIconIndicatorShape: 9999,
  itemSupportingTextTypescale: m3ExpressiveLikeTypescale.bodySmall,
  itemTrailingTextTypescale: m3ExpressiveLikeTypescale.label,
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
  stickyContainerColor: .role(.surfaceContainerLow),
  stickyDividerColor: .role(.outlineVariant),
  stickyDividerWidth: 1,
  variants: TanreiNavigationDrawerVariants(
    standard: TanreiNavigationDrawerVariantTokens(
      containerColor: .role(.surfaceContainerLow),
      containerElevation: m3ExpressiveLikeElevation.level0,
      containerShape: 0,
      outlineColor: .none
    ),
    modal: TanreiNavigationDrawerVariantTokens(
      containerColor: .role(.surfaceContainerLow),
      containerElevation: m3ExpressiveLikeElevation.level1,
      containerShape: 16,
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
        itemContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.08),
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
        itemContainerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
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
        itemContainerColor: .role(.secondaryContainer),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSecondaryContainer),
        itemSupportingTextColor: .role(.onSecondaryContainer),
        itemTrailingTextColor: .role(.onSecondaryContainer),
        itemTrailingIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.08),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSecondaryContainer),
        itemSupportingTextColor: .role(.onSecondaryContainer),
        itemTrailingTextColor: .role(.onSecondaryContainer),
        itemTrailingIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSecondaryContainer),
        itemSupportingTextColor: .role(.onSecondaryContainer),
        itemTrailingTextColor: .role(.onSecondaryContainer),
        itemTrailingIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSecondaryContainer),
        itemSupportingTextColor: .role(.onSecondaryContainer),
        itemTrailingTextColor: .role(.onSecondaryContainer),
        itemTrailingIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .role(.secondaryContainer),
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
        itemStateLayerColor: .none
      ),
      hovered: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .none, amount: 0.08),
        itemIconIndicatorColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.08),
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemSupportingTextColor: .role(.onSurfaceVariant),
        itemTrailingTextColor: .role(.onSurfaceVariant),
        itemTrailingIconColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .none
      ),
      focused: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .none, amount: 0.12),
        itemIconIndicatorColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemSupportingTextColor: .role(.onSurfaceVariant),
        itemTrailingTextColor: .role(.onSurfaceVariant),
        itemTrailingIconColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .none
      ),
      pressed: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .none, amount: 0.12),
        itemIconIndicatorColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemSupportingTextColor: .role(.onSurfaceVariant),
        itemTrailingTextColor: .role(.onSurfaceVariant),
        itemTrailingIconColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .none
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
        itemContainerColor: .none,
        itemIconIndicatorColor: .role(.secondaryContainer),
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSurface),
        itemSupportingTextColor: .role(.onSecondaryContainer),
        itemTrailingTextColor: .role(.onSecondaryContainer),
        itemTrailingIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .none
      ),
      hovered: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .none, amount: 0.08),
        itemIconIndicatorColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.08),
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSurface),
        itemSupportingTextColor: .role(.onSecondaryContainer),
        itemTrailingTextColor: .role(.onSecondaryContainer),
        itemTrailingIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .none
      ),
      focused: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .none, amount: 0.12),
        itemIconIndicatorColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSurface),
        itemSupportingTextColor: .role(.onSecondaryContainer),
        itemTrailingTextColor: .role(.onSecondaryContainer),
        itemTrailingIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .none
      ),
      pressed: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .mix(base: .none, with: .none, amount: 0.12),
        itemIconIndicatorColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        itemIconColor: .role(.onSecondaryContainer),
        itemLabelColor: .role(.onSurface),
        itemSupportingTextColor: .role(.onSecondaryContainer),
        itemTrailingTextColor: .role(.onSecondaryContainer),
        itemTrailingIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .none
      ),
      disabled: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .role(.secondaryContainer),
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
      containerGap: 0,
      itemContainerHeight: 56,
      itemPaddingInline: 16,
      itemPaddingBlock: 4,
      itemNestIndent: 36,
      itemIconSize: 24,
      itemIconIndicatorWidth: 56,
      itemIconIndicatorHeight: 32,
      itemLabelTypescale: m3ExpressiveLikeTypescale.label,
      itemTrailingIconSize: 20,
      collapsedContainerWidth: 80,
      collapsedItemContainerWidth: 56,
      collapsedItemContainerPaddingBlock: 0,
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
      itemLabelTypescale: m3ExpressiveLikeTypescale.label,
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

private let m3ExpressiveLikeNumberInputTokens = TanreiNumberInputTokens(
  motionRepeatDelay: 500,
  motionRepeatInterval: 100,
  motionRepeatIntervalFast: 50,
  stepperGap: 0,
  stepperInset: 4
)

private let m3ExpressiveLikeOneTimeCodeInputTokens = TanreiOneTimeCodeInputTokens(
  caretWidth: 2,
  containerGap: 6,
  containerHeight: 56,
  containerPaddingInline: 4,
  containerShape: 4,
  containerWidth: 40,
  inputTypescale: m3ExpressiveLikeTypescale.bodyLarge,
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
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.08),
        outlineColor: .none,
        inputColor: .role(.onSurface),
        caretColor: .role(.primary),
        separatorColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        errorContainerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.08),
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

private let m3ExpressiveLikePageHeaderTokens = TanreiPageHeaderTokens(
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
  eyebrowTypescale: m3ExpressiveLikeTypescale.eyebrow,
  metaColor: .role(.onSurfaceVariant),
  metaGap: 12,
  metaIconGap: 6,
  metaItemGap: 16,
  metaRowGap: 4,
  metaSeparatorColor: .role(.onSurfaceVariant),
  metaSeparatorSize: 4,
  metaTypescale: m3ExpressiveLikeTypescale.bodySmall,
  titleColor: .role(.onSurface),
  wideContainerWidth: 480,
  sizes: TanreiPageHeaderSizes(
    small: TanreiPageHeaderSizeTokens(
      titleTypescale: m3ExpressiveLikeTypescale.heading2,
      descriptionTypescale: m3ExpressiveLikeTypescale.body,
      descriptionGap: 4,
      containerPaddingBlockEnd: 8
    ),
    medium: TanreiPageHeaderSizeTokens(
      titleTypescale: m3ExpressiveLikeTypescale.heading1,
      descriptionTypescale: m3ExpressiveLikeTypescale.bodyLarge,
      descriptionGap: 8,
      containerPaddingBlockEnd: 16
    ),
    large: TanreiPageHeaderSizeTokens(
      titleTypescale: m3ExpressiveLikeTypescale.display,
      descriptionTypescale: m3ExpressiveLikeTypescale.bodyLarge,
      descriptionGap: 16,
      containerPaddingBlockEnd: 32
    )
  )
)

private let m3ExpressiveLikePaginationTokens = TanreiPaginationTokens(
  containerPaddingInline: 8,
  containerShape: 9999,
  countColor: .role(.onSurface),
  countPaddingInline: 8,
  countTypescale: m3ExpressiveLikeTypescale.body,
  ellipsisColor: .role(.onSurfaceVariant),
  gap: 4,
  iconSize: 20,
  labelTypescale: m3ExpressiveLikeTypescale.label,
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
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
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.08),
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
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
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

private let m3ExpressiveLikePopoverTokens = TanreiPopoverTokens(
  actionsArrangement: 0,
  actionsGap: 16,
  actionsMarginBlockStart: 16,
  actionsVariant: 1,
  arrowHeight: 6,
  arrowInset: 8,
  arrowVisible: 0,
  arrowWidth: 12,
  closeButtonVariant: 4,
  compactWindowWidth: 600,
  containerColor: .role(.surfaceBright),
  containerElevation: m3ExpressiveLikeElevation.level2,
  containerGap: 12,
  containerMaxHeight: 480,
  containerMaxWidth: 400,
  containerMinWidth: 160,
  containerPaddingBlock: 16,
  containerPaddingInline: 16,
  containerShape: 12,
  contentColor: .role(.onSurface),
  dividerColor: .role(.outlineVariant),
  dividerVisibility: 1,
  dividerWidth: 1,
  headerGap: 8,
  headlineColor: .role(.onSurface),
  headlineTypescale: m3ExpressiveLikeTypescale.heading6,
  motionCloseDuration: 100,
  motionCloseEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  motionOpenDuration: 200,
  motionOpenEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  offset: 4,
  windowMargin: 8
)

private let m3ExpressiveLikePreviousNextLinksTokens = TanreiPreviousNextLinksTokens(
  containerGap: 12,
  containerMinWidth: 240,
  containerPadding: 16,
  containerShape: 12,
  gap: 16,
  iconSize: 20,
  labelGap: 2,
  labelTypescale: m3ExpressiveLikeTypescale.labelSmall,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineWidth: 1,
  titleTypescale: m3ExpressiveLikeTypescale.bodyLarge,
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        outlineColor: .role(.outlineVariant),
        labelColor: .role(.onSurfaceVariant),
        titleColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      )
    )
  ),
  hovered: TanreiPreviousNextLinksStateTokens(
    containerShape: 12,
    opacity: 1
  ),
  focused: TanreiPreviousNextLinksStateTokens(
    containerShape: 12,
    opacity: 1
  ),
  pressed: TanreiPreviousNextLinksStateTokens(
    containerShape: 12,
    opacity: 1
  )
)

private let m3ExpressiveLikeProgressIndicatorTokens = TanreiProgressIndicatorTokens(
  indicatorColor: .role(.primary),
  motionCycleDuration: 1750,
  motionCycleEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionValueDuration: 300,
  motionValueEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  stopIndicatorSize: 4,
  trackColor: .role(.secondaryContainer),
  trackGap: 4,
  trackSeparation: 1,
  trackShape: 9999,
  sizes: TanreiProgressIndicatorSizes(
    small: TanreiProgressIndicatorSizeTokens(
      linearThickness: 4,
      circularSize: 24,
      circularThickness: 4
    ),
    medium: TanreiProgressIndicatorSizeTokens(
      linearThickness: 4,
      circularSize: 40,
      circularThickness: 4
    ),
    large: TanreiProgressIndicatorSizeTokens(
      linearThickness: 4,
      circularSize: 48,
      circularThickness: 4
    )
  )
)

private let m3ExpressiveLikeProseTokens = TanreiProseTokens(
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
  leadTypescale: m3ExpressiveLikeTypescale.bodyLarge,
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
      textTypescale: m3ExpressiveLikeTypescale.body,
      smallTypescale: m3ExpressiveLikeTypescale.bodySmall
    ),
    large: TanreiProseSizeTokens(
      textTypescale: m3ExpressiveLikeTypescale.bodyLarge,
      smallTypescale: m3ExpressiveLikeTypescale.body
    )
  )
)

private let m3ExpressiveLikeRadioButtonTokens = TanreiRadioButtonTokens(
  containerShape: 9999,
  containerSize: 40,
  fillInset: 3,
  fillOpacity: 1,
  labelGap: 4,
  labelTypescale: m3ExpressiveLikeTypescale.body,
  motionFeedbackDuration: 450,
  motionSelectionDuration: 150,
  motionSelectionEasing: TanreiCubicBezier(0.31, 0.94, 0.34, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  optionMinHeight: 48,
  ringSelectedWidthShare: 0.2,
  ringSize: 20,
  ringWidth: 2,
  conditions: TanreiRadioButtonConditions(
    unselected: TanreiRadioButtonConditionTokens(
      enabled: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .role(.onSurfaceVariant),
        fillColor: .none,
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiRadioButtonConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        ringColor: .role(.onSurfaceVariant),
        fillColor: .none,
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiRadioButtonConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        ringColor: .role(.onSurfaceVariant),
        fillColor: .none,
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiRadioButtonConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        ringColor: .role(.onSurfaceVariant),
        fillColor: .none,
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
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
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
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
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
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
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
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

private let m3ExpressiveLikeScrollAreaTokens = TanreiScrollAreaTokens(
  blurExtent: 48,
  blurLayers: 4,
  blurRadius: 8,
  fadeExtent: 24,
  lineColor: .role(.outlineVariant),
  lineWidth: 1,
  motionDuration: 150,
  motionEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  scrollEdge: 2,
  shadowColor: .role(.surface),
  shadowExtent: 24
)

private let m3ExpressiveLikeSearchTokens = TanreiSearchTokens(
  containerButtonGap: 8,
  containerGap: 8,
  containerHeight: 56,
  containerPaddingInline: 16,
  containerPaddingInlineWithButton: 4,
  containerShape: 9999,
  dividerColor: .role(.outlineVariant),
  dividerThickness: 1,
  groupTitleColor: .role(.onSurfaceVariant),
  groupTitleTypescale: m3ExpressiveLikeTypescale.labelSmall,
  groupGap: 8,
  groupIndent: 24,
  headerHeight: 72,
  headerPaddingInline: 8,
  inputTypescale: m3ExpressiveLikeTypescale.bodyLarge,
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
  shortcutTypescale: m3ExpressiveLikeTypescale.labelSmall,
  statusColor: .role(.onSurfaceVariant),
  statusErrorColor: .role(.error),
  statusTypescale: m3ExpressiveLikeTypescale.bodySmall,
  suggestionContainerShape: 8,
  suggestionHeadlineTypescale: m3ExpressiveLikeTypescale.body,
  suggestionSupportingTextTypescale: m3ExpressiveLikeTypescale.bodySmall,
  triggerContainerGap: 8,
  triggerContainerHeight: 40,
  triggerContainerPaddingInline: 12,
  triggerLabelTypescale: m3ExpressiveLikeTypescale.body,
  triggerLeadingIconSize: 20,
  viewContainerColor: .role(.surfaceBright),
  viewContainerElevation: m3ExpressiveLikeElevation.level2,
  viewContainerShape: 12,
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
        containerElevation: m3ExpressiveLikeElevation.level0,
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
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.08),
        containerElevation: m3ExpressiveLikeElevation.level0,
        outlineColor: .none,
        leadingIconColor: .role(.onSurfaceVariant),
        inputColor: .role(.onSurface),
        placeholderColor: .role(.onSurfaceVariant),
        caretColor: .role(.primary),
        stateLayerColor: .role(.onSurface),
        suggestionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        suggestionLeadingIconColor: .role(.onSurfaceVariant),
        suggestionHeadlineColor: .role(.onSurface),
        suggestionSupportingTextColor: .role(.onSurfaceVariant),
        suggestionStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiSearchConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: m3ExpressiveLikeElevation.level0,
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
        containerColor: .mix(base: .role(.surfaceContainerHighest), with: .role(.onSurface), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        outlineColor: .none,
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
      disabled: TanreiSearchConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: m3ExpressiveLikeElevation.level0,
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
  densitys: TanreiSearchDensitys(
    regular: TanreiSearchDensityTokens(
      suggestionContainerHeight: 56,
      suggestionContainerPaddingInline: 16,
      suggestionContainerPaddingBlock: 8,
      suggestionContainerGap: 16,
      suggestionLeadingIconSize: 24
    ),
    compact: TanreiSearchDensityTokens(
      suggestionContainerHeight: 32,
      suggestionContainerPaddingInline: 8,
      suggestionContainerPaddingBlock: 4,
      suggestionContainerGap: 8,
      suggestionLeadingIconSize: 20
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

private let m3ExpressiveLikeSegmentedButtonTokens = TanreiSegmentedButtonTokens(
  checkWeight: 400,
  containerShape: 0,
  dividerColor: .role(.outline),
  dividerWidth: 1,
  motionFeedbackDuration: 450,
  motionSelectionDuration: 150,
  motionSelectionEasing: TanreiCubicBezier(0.31, 0.94, 0.34, 1),
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineColor: .role(.outline),
  outlineWidth: 1,
  setColor: .none,
  setPadding: 0,
  setShape: 9999,
  sizes: TanreiSegmentedButtonSizes(
    small: TanreiSegmentedButtonSizeTokens(
      containerHeight: 32,
      containerPaddingInline: 12,
      containerPaddingBlock: 6,
      containerGap: 8,
      labelTypescale: m3ExpressiveLikeTypescale.label,
      iconSize: 18,
      checkSize: 18,
      motionStateDuration: 150
    ),
    medium: TanreiSegmentedButtonSizeTokens(
      containerHeight: 40,
      containerPaddingInline: 12,
      containerPaddingBlock: 6,
      containerGap: 8,
      labelTypescale: m3ExpressiveLikeTypescale.label,
      iconSize: 18,
      checkSize: 18,
      motionStateDuration: 150
    ),
    large: TanreiSegmentedButtonSizeTokens(
      containerHeight: 48,
      containerPaddingInline: 12,
      containerPaddingBlock: 6,
      containerGap: 8,
      labelTypescale: m3ExpressiveLikeTypescale.label,
      iconSize: 18,
      checkSize: 18,
      motionStateDuration: 150
    )
  ),
  conditions: TanreiSegmentedButtonConditions(
    unselected: TanreiSegmentedButtonConditionTokens(
      enabled: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .none,
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .none,
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    selected: TanreiSegmentedButtonConditionTokens(
      enabled: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .role(.secondaryContainer),
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.08),
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: m3ExpressiveLikeElevation.level0,
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

private let m3ExpressiveLikeSelectTokens = TanreiSelectTokens(
  dividerColor: .role(.outlineVariant),
  dividerSpace: 8,
  dividerThickness: 1,
  groupTitleColor: .role(.onSurfaceVariant),
  groupTitleTypescale: m3ExpressiveLikeTypescale.labelSmall,
  groupGap: 16,
  listColor: .role(.surfaceContainer),
  listElevation: m3ExpressiveLikeElevation.level2,
  listMaxHeight: 320,
  listMaxWidth: 280,
  listMinWidth: 112,
  listOffset: 4,
  listPaddingBlock: 8,
  listPaddingInline: 0,
  listShape: 4,
  listViewportMargin: 8,
  motionCloseDuration: 100,
  motionCloseEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  motionFeedbackDuration: 450,
  motionOpenDuration: 200,
  motionOpenEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  optionLabelTypescale: m3ExpressiveLikeTypescale.label,
  optionShape: 0,
  optionSupportingTextTypescale: m3ExpressiveLikeTypescale.bodySmall,
  separation: 0,
  statusColor: .role(.onSurfaceVariant),
  statusErrorColor: .role(.error),
  statusTypescale: m3ExpressiveLikeTypescale.bodySmall,
  variants: TanreiSelectVariants(
    stacked: TanreiSelectVariantTokens(
      enabled: TanreiSelectVariantStateTokens(
        optionContainerColor: .none,
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .none,
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiSelectVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiSelectVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiSelectVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiSelectVariantStateTokens(
        optionContainerColor: .none,
        optionLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionContainerColor: .none,
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
        selectedOptionContainerColor: .none,
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiSelectVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiSelectVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiSelectVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiSelectVariantStateTokens(
        optionContainerColor: .none,
        optionLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionContainerColor: .none,
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
        selectedOptionContainerColor: .none,
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiSelectVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiSelectVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiSelectVariantStateTokens(
        optionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        optionLabelColor: .role(.onSurface),
        optionSupportingTextColor: .role(.onSurfaceVariant),
        optionLeadingIconColor: .role(.onSurfaceVariant),
        optionStateLayerColor: .role(.onSurface),
        selectedOptionContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        selectedOptionLabelColor: .role(.onSurface),
        selectedOptionSupportingTextColor: .role(.onSurfaceVariant),
        selectedOptionLeadingIconColor: .role(.onSurface),
        selectedOptionMarkColor: .role(.primary),
        selectedOptionStateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiSelectVariantStateTokens(
        optionContainerColor: .none,
        optionLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        optionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionContainerColor: .none,
        selectedOptionLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionSupportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionLeadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionMarkColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOptionStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  densitys: TanreiSelectDensitys(
    regular: TanreiSelectDensityTokens(
      optionHeight: 48,
      optionPaddingInline: 12,
      optionPaddingBlock: 8,
      optionGap: 12,
      optionLeadingIconSize: 24,
      optionMarkSize: 24,
      groupTitlePaddingInline: 12
    ),
    compact: TanreiSelectDensityTokens(
      optionHeight: 32,
      optionPaddingInline: 8,
      optionPaddingBlock: 6,
      optionGap: 8,
      optionLeadingIconSize: 20,
      optionMarkSize: 20,
      groupTitlePaddingInline: 8
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

private let m3ExpressiveLikeSideSheetTokens = TanreiSideSheetTokens(
  actionsArrangement: 1,
  actionsGap: 8,
  actionsPaddingBlock: 16,
  actionsVariant: 0,
  closeButtonVariant: 4,
  containerPaddingBlock: 24,
  containerPaddingInline: 24,
  containerWidth: 320,
  contentColor: .role(.onSurface),
  dividerColor: .role(.outlineVariant),
  dividerVisibility: 1,
  dividerWidth: 1,
  headerGap: 8,
  headerHeight: 64,
  headerPaddingInlineEnd: 12,
  headlineColor: .role(.onSurfaceVariant),
  headlineTypescale: m3ExpressiveLikeTypescale.heading4,
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
      containerElevation: m3ExpressiveLikeElevation.level0,
      containerShape: 0,
      outlineColor: .role(.outlineVariant)
    ),
    modal: TanreiSideSheetVariantTokens(
      containerColor: .role(.surfaceContainerLow),
      containerElevation: m3ExpressiveLikeElevation.level1,
      containerShape: 16,
      outlineColor: .none
    )
  )
)

private let m3ExpressiveLikeSkeletonTokens = TanreiSkeletonTokens(
  containerGap: 8,
  motionAnimation: 0,
  motionDimDuration: 1000,
  motionDimEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionShowDelay: 300,
  placeholderColor: .role(.surfaceVariant),
  placeholderDimOpacity: 0.5,
  placeholderLastLineInlineSize: 0.6,
  placeholderShapeBlock: 12,
  placeholderShapeCircle: 9999,
  placeholderShapeText: 4
)

private let m3ExpressiveLikeSliderTokens = TanreiSliderTokens(
  containerShape: 9999,
  containerSize: 32,
  handleOutlineWidth: 0,
  handleShape: 9999,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionValueDuration: 350,
  motionValueEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  trackGap: 6,
  valueIndicatorContainerColor: .role(.inverseSurface),
  valueIndicatorContainerHeight: 24,
  valueIndicatorContainerPaddingInline: 8,
  valueIndicatorContainerShape: 8,
  valueIndicatorLabelColor: .role(.inverseOnSurface),
  valueIndicatorLabelTypescale: m3ExpressiveLikeTypescale.labelSmall,
  valueIndicatorOffset: 8,
  sizes: TanreiSliderSizes(
    small: TanreiSliderSizeTokens(
      trackThickness: 4,
      trackShape: 9999,
      handleHeight: 44,
      stopIndicatorSize: 2
    ),
    medium: TanreiSliderSizeTokens(
      trackThickness: 6,
      trackShape: 9999,
      handleHeight: 44,
      stopIndicatorSize: 3
    ),
    large: TanreiSliderSizeTokens(
      trackThickness: 8,
      trackShape: 9999,
      handleHeight: 52,
      stopIndicatorSize: 4
    )
  ),
  conditions: TanreiSliderConditions(
    standard: TanreiSliderConditionTokens(
      enabled: TanreiSliderConditionStateTokens(
        containerColor: .none,
        stateLayerColor: .role(.primary),
        handleColor: .role(.primary),
        handleWidth: 4,
        handleElevation: m3ExpressiveLikeElevation.level0,
        handleOutlineColor: .role(.primary),
        trackColor: .role(.surfaceVariant),
        activeTrackColor: .role(.primary),
        stopIndicatorColor: .role(.onSurfaceVariant),
        activeStopIndicatorColor: .role(.onPrimary)
      ),
      hovered: TanreiSliderConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.08),
        stateLayerColor: .role(.primary),
        handleColor: .role(.primary),
        handleWidth: 4,
        handleElevation: m3ExpressiveLikeElevation.level0,
        handleOutlineColor: .role(.primary),
        trackColor: .role(.surfaceVariant),
        activeTrackColor: .role(.primary),
        stopIndicatorColor: .role(.onSurfaceVariant),
        activeStopIndicatorColor: .role(.onPrimary)
      ),
      focused: TanreiSliderConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
        stateLayerColor: .role(.primary),
        handleColor: .role(.primary),
        handleWidth: 4,
        handleElevation: m3ExpressiveLikeElevation.level0,
        handleOutlineColor: .role(.primary),
        trackColor: .role(.surfaceVariant),
        activeTrackColor: .role(.primary),
        stopIndicatorColor: .role(.onSurfaceVariant),
        activeStopIndicatorColor: .role(.onPrimary)
      ),
      pressed: TanreiSliderConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
        stateLayerColor: .role(.primary),
        handleColor: .role(.primary),
        handleWidth: 2,
        handleElevation: m3ExpressiveLikeElevation.level0,
        handleOutlineColor: .role(.primary),
        trackColor: .role(.surfaceVariant),
        activeTrackColor: .role(.primary),
        stopIndicatorColor: .role(.onSurfaceVariant),
        activeStopIndicatorColor: .role(.onPrimary)
      ),
      disabled: TanreiSliderConditionStateTokens(
        containerColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        handleColor: .alpha(of: .role(.onSurface), amount: 0.38),
        handleWidth: 4,
        handleElevation: m3ExpressiveLikeElevation.level0,
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

private let m3ExpressiveLikeSnackbarTokens = TanreiSnackbarTokens(
  actionTonalLayerOpacity: 0,
  breakpointMedium: 600,
  closeButtonVariant: 4,
  containerColor: .role(.surfaceBright),
  containerElevation: m3ExpressiveLikeElevation.level3,
  containerGap: 8,
  containerInverse: 1,
  containerMargin: 16,
  containerMaxWidth: 672,
  containerMinHeight: 48,
  containerMinWidth: 344,
  containerPaddingBlock: 12,
  containerPaddingInlineEnd: 16,
  containerPaddingInlineEndWithControls: 8,
  containerPaddingInlineStart: 16,
  containerShape: 4,
  controlsGap: 4,
  controlsHeight: 40,
  controlsLabelTypescale: m3ExpressiveLikeTypescale.label,
  controlsPaddingInline: 14,
  controlsShape: 9999,
  errorContainerColor: .role(.errorContainer),
  errorFocusRingColor: .role(.onErrorContainer),
  errorIconColor: .role(.onErrorContainer),
  errorOutlineColor: .role(.error),
  errorSupportingTextColor: .role(.onErrorContainer),
  errorTitleColor: .role(.onErrorContainer),
  focusRingColor: .role(.focusRing),
  iconGap: 12,
  iconOpacity: 1,
  iconSize: 24,
  infoContainerColor: .role(.infoContainer),
  infoFocusRingColor: .role(.onInfoContainer),
  infoIconColor: .role(.onInfoContainer),
  infoOutlineColor: .role(.info),
  infoSupportingTextColor: .role(.onInfoContainer),
  infoTitleColor: .role(.onInfoContainer),
  inverseErrorContainerColor: .role(.error),
  inverseErrorFocusRingColor: .role(.onError),
  inverseErrorIconColor: .role(.onError),
  inverseErrorOutlineColor: .role(.error),
  inverseErrorSupportingTextColor: .role(.onError),
  inverseErrorTitleColor: .role(.onError),
  inverseInfoContainerColor: .role(.info),
  inverseInfoFocusRingColor: .role(.onInfo),
  inverseInfoIconColor: .role(.onInfo),
  inverseInfoOutlineColor: .role(.info),
  inverseInfoSupportingTextColor: .role(.onInfo),
  inverseInfoTitleColor: .role(.onInfo),
  inverseSuccessContainerColor: .role(.success),
  inverseSuccessFocusRingColor: .role(.onSuccess),
  inverseSuccessIconColor: .role(.onSuccess),
  inverseSuccessOutlineColor: .role(.success),
  inverseSuccessSupportingTextColor: .role(.onSuccess),
  inverseSuccessTitleColor: .role(.onSuccess),
  inverseWarningContainerColor: .role(.warning),
  inverseWarningFocusRingColor: .role(.onWarning),
  inverseWarningIconColor: .role(.onWarning),
  inverseWarningOutlineColor: .role(.warning),
  inverseWarningSupportingTextColor: .role(.onWarning),
  inverseWarningTitleColor: .role(.onWarning),
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
  outlineOpacity: 0,
  outlineWidth: 1,
  successContainerColor: .role(.successContainer),
  successFocusRingColor: .role(.onSuccessContainer),
  successIconColor: .role(.onSuccessContainer),
  successOutlineColor: .role(.success),
  successSupportingTextColor: .role(.onSuccessContainer),
  successTitleColor: .role(.onSuccessContainer),
  supportingTextColor: .role(.onSurface),
  supportingTextMaxLines: 3,
  supportingTextTypescale: m3ExpressiveLikeTypescale.body,
  supportingTextUnderTitleOpacity: 1,
  timeoutLong: 10000,
  timeoutShort: 4000,
  titleColor: .role(.onSurface),
  titleGap: 4,
  titleMaxLines: 3,
  titleTypescale: m3ExpressiveLikeTypescale.heading6,
  warningContainerColor: .role(.warningContainer),
  warningFocusRingColor: .role(.onWarningContainer),
  warningIconColor: .role(.onWarningContainer),
  warningOutlineColor: .role(.warning),
  warningSupportingTextColor: .role(.onWarningContainer),
  warningTitleColor: .role(.onWarningContainer),
  controls: TanreiSnackbarControls(
    action: TanreiSnackbarControlTokens(
      enabled: TanreiSnackbarControlStateTokens(
        containerColor: .role(.secondaryContainer),
        contentColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer),
        infoContainerColor: .role(.surfaceBright),
        infoContentColor: .role(.onSurface),
        infoStateLayerColor: .role(.onSurface),
        warningContainerColor: .role(.surfaceBright),
        warningContentColor: .role(.onSurface),
        warningStateLayerColor: .role(.onSurface),
        errorContainerColor: .role(.surfaceBright),
        errorContentColor: .role(.onSurface),
        errorStateLayerColor: .role(.onSurface),
        successContainerColor: .role(.surfaceBright),
        successContentColor: .role(.onSurface),
        successStateLayerColor: .role(.onSurface),
        inverseContainerColor: .none,
        inverseContentColor: .role(.inversePrimary),
        inverseStateLayerColor: .role(.inversePrimary),
        inverseInfoContainerColor: .role(.onInfoContainer),
        inverseInfoContentColor: .role(.infoContainer),
        inverseInfoStateLayerColor: .role(.infoContainer),
        inverseWarningContainerColor: .role(.onWarningContainer),
        inverseWarningContentColor: .role(.warningContainer),
        inverseWarningStateLayerColor: .role(.warningContainer),
        inverseErrorContainerColor: .role(.onErrorContainer),
        inverseErrorContentColor: .role(.errorContainer),
        inverseErrorStateLayerColor: .role(.errorContainer),
        inverseSuccessContainerColor: .role(.onSuccessContainer),
        inverseSuccessContentColor: .role(.successContainer),
        inverseSuccessStateLayerColor: .role(.successContainer)
      ),
      hovered: TanreiSnackbarControlStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.08),
        contentColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer),
        infoContainerColor: .mix(base: .role(.surfaceBright), with: .role(.onSurface), amount: 0.08),
        infoContentColor: .role(.onSurface),
        infoStateLayerColor: .role(.onSurface),
        warningContainerColor: .mix(base: .role(.surfaceBright), with: .role(.onSurface), amount: 0.08),
        warningContentColor: .role(.onSurface),
        warningStateLayerColor: .role(.onSurface),
        errorContainerColor: .mix(base: .role(.surfaceBright), with: .role(.onSurface), amount: 0.08),
        errorContentColor: .role(.onSurface),
        errorStateLayerColor: .role(.onSurface),
        successContainerColor: .mix(base: .role(.surfaceBright), with: .role(.onSurface), amount: 0.08),
        successContentColor: .role(.onSurface),
        successStateLayerColor: .role(.onSurface),
        inverseContainerColor: .mix(base: .none, with: .role(.inversePrimary), amount: 0.08),
        inverseContentColor: .role(.inversePrimary),
        inverseStateLayerColor: .role(.inversePrimary),
        inverseInfoContainerColor: .mix(base: .role(.onInfoContainer), with: .role(.infoContainer), amount: 0.08),
        inverseInfoContentColor: .role(.infoContainer),
        inverseInfoStateLayerColor: .role(.infoContainer),
        inverseWarningContainerColor: .mix(base: .role(.onWarningContainer), with: .role(.warningContainer), amount: 0.08),
        inverseWarningContentColor: .role(.warningContainer),
        inverseWarningStateLayerColor: .role(.warningContainer),
        inverseErrorContainerColor: .mix(base: .role(.onErrorContainer), with: .role(.errorContainer), amount: 0.08),
        inverseErrorContentColor: .role(.errorContainer),
        inverseErrorStateLayerColor: .role(.errorContainer),
        inverseSuccessContainerColor: .mix(base: .role(.onSuccessContainer), with: .role(.successContainer), amount: 0.08),
        inverseSuccessContentColor: .role(.successContainer),
        inverseSuccessStateLayerColor: .role(.successContainer)
      ),
      focused: TanreiSnackbarControlStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        contentColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer),
        infoContainerColor: .mix(base: .role(.surfaceBright), with: .role(.onSurface), amount: 0.12),
        infoContentColor: .role(.onSurface),
        infoStateLayerColor: .role(.onSurface),
        warningContainerColor: .mix(base: .role(.surfaceBright), with: .role(.onSurface), amount: 0.12),
        warningContentColor: .role(.onSurface),
        warningStateLayerColor: .role(.onSurface),
        errorContainerColor: .mix(base: .role(.surfaceBright), with: .role(.onSurface), amount: 0.12),
        errorContentColor: .role(.onSurface),
        errorStateLayerColor: .role(.onSurface),
        successContainerColor: .mix(base: .role(.surfaceBright), with: .role(.onSurface), amount: 0.12),
        successContentColor: .role(.onSurface),
        successStateLayerColor: .role(.onSurface),
        inverseContainerColor: .mix(base: .none, with: .role(.inversePrimary), amount: 0.12),
        inverseContentColor: .role(.inversePrimary),
        inverseStateLayerColor: .role(.inversePrimary),
        inverseInfoContainerColor: .mix(base: .role(.onInfoContainer), with: .role(.infoContainer), amount: 0.12),
        inverseInfoContentColor: .role(.infoContainer),
        inverseInfoStateLayerColor: .role(.infoContainer),
        inverseWarningContainerColor: .mix(base: .role(.onWarningContainer), with: .role(.warningContainer), amount: 0.12),
        inverseWarningContentColor: .role(.warningContainer),
        inverseWarningStateLayerColor: .role(.warningContainer),
        inverseErrorContainerColor: .mix(base: .role(.onErrorContainer), with: .role(.errorContainer), amount: 0.12),
        inverseErrorContentColor: .role(.errorContainer),
        inverseErrorStateLayerColor: .role(.errorContainer),
        inverseSuccessContainerColor: .mix(base: .role(.onSuccessContainer), with: .role(.successContainer), amount: 0.12),
        inverseSuccessContentColor: .role(.successContainer),
        inverseSuccessStateLayerColor: .role(.successContainer)
      ),
      pressed: TanreiSnackbarControlStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        contentColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer),
        infoContainerColor: .mix(base: .role(.surfaceBright), with: .role(.onSurface), amount: 0.12),
        infoContentColor: .role(.onSurface),
        infoStateLayerColor: .role(.onSurface),
        warningContainerColor: .mix(base: .role(.surfaceBright), with: .role(.onSurface), amount: 0.12),
        warningContentColor: .role(.onSurface),
        warningStateLayerColor: .role(.onSurface),
        errorContainerColor: .mix(base: .role(.surfaceBright), with: .role(.onSurface), amount: 0.12),
        errorContentColor: .role(.onSurface),
        errorStateLayerColor: .role(.onSurface),
        successContainerColor: .mix(base: .role(.surfaceBright), with: .role(.onSurface), amount: 0.12),
        successContentColor: .role(.onSurface),
        successStateLayerColor: .role(.onSurface),
        inverseContainerColor: .mix(base: .none, with: .role(.inversePrimary), amount: 0.12),
        inverseContentColor: .role(.inversePrimary),
        inverseStateLayerColor: .role(.inversePrimary),
        inverseInfoContainerColor: .mix(base: .role(.onInfoContainer), with: .role(.infoContainer), amount: 0.12),
        inverseInfoContentColor: .role(.infoContainer),
        inverseInfoStateLayerColor: .role(.infoContainer),
        inverseWarningContainerColor: .mix(base: .role(.onWarningContainer), with: .role(.warningContainer), amount: 0.12),
        inverseWarningContentColor: .role(.warningContainer),
        inverseWarningStateLayerColor: .role(.warningContainer),
        inverseErrorContainerColor: .mix(base: .role(.onErrorContainer), with: .role(.errorContainer), amount: 0.12),
        inverseErrorContentColor: .role(.errorContainer),
        inverseErrorStateLayerColor: .role(.errorContainer),
        inverseSuccessContainerColor: .mix(base: .role(.onSuccessContainer), with: .role(.successContainer), amount: 0.12),
        inverseSuccessContentColor: .role(.successContainer),
        inverseSuccessStateLayerColor: .role(.successContainer)
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

private let m3ExpressiveLikeStepperTokens = TanreiStepperTokens(
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
  containerShape: 8,
  descriptionGap: 2,
  descriptionTypescale: m3ExpressiveLikeTypescale.bodySmall,
  labelTypescale: m3ExpressiveLikeTypescale.label,
  markerGap: 8,
  markerIconSize: 16,
  markerIconWeight: 400,
  markerLabelTypescale: m3ExpressiveLikeTypescale.labelSmall,
  markerOutlineWidth: 2,
  markerShape: 9999,
  markerSize: 24,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  positionColor: .role(.onSurfaceVariant),
  positionGap: 8,
  positionTypescale: m3ExpressiveLikeTypescale.labelSmall,
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
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
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
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.error), amount: 0.12),
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
    containerShape: 8,
    opacity: 1
  ),
  focused: TanreiStepperStateTokens(
    containerShape: 8,
    opacity: 1
  ),
  pressed: TanreiStepperStateTokens(
    containerShape: 8,
    opacity: 1
  ),
  disabled: TanreiStepperStateTokens(
    containerShape: 8,
    opacity: 1
  )
)

private let m3ExpressiveLikeStepsTokens = TanreiStepsTokens(
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
      markerLabelTypescale: m3ExpressiveLikeTypescale.labelSmall,
      titleTypescale: m3ExpressiveLikeTypescale.heading6,
      bodyTypescale: m3ExpressiveLikeTypescale.body
    ),
    large: TanreiStepsSizeTokens(
      markerHeight: 28,
      markerLabelTypescale: m3ExpressiveLikeTypescale.label,
      titleTypescale: m3ExpressiveLikeTypescale.heading5,
      bodyTypescale: m3ExpressiveLikeTypescale.bodyLarge
    )
  )
)

private let m3ExpressiveLikeSwatchTokens = TanreiSwatchTokens(
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
      labelTypescale: m3ExpressiveLikeTypescale.bodySmall,
      supportingTextTypescale: m3ExpressiveLikeTypescale.caption
    ),
    medium: TanreiSwatchSizeTokens(
      containerSize: 24,
      gap: 8,
      labelTypescale: m3ExpressiveLikeTypescale.body,
      supportingTextTypescale: m3ExpressiveLikeTypescale.bodySmall
    ),
    large: TanreiSwatchSizeTokens(
      containerSize: 32,
      gap: 12,
      labelTypescale: m3ExpressiveLikeTypescale.body,
      supportingTextTypescale: m3ExpressiveLikeTypescale.bodySmall
    )
  ),
  shapes: TanreiSwatchShapes(
    square: TanreiSwatchShapeTokens(
      containerShape: 4
    ),
    circle: TanreiSwatchShapeTokens(
      containerShape: 9999
    )
  )
)

private let m3ExpressiveLikeSwitchTokens = TanreiSwitchTokens(
  containerShape: 9999,
  containerSize: 40,
  handleSizeWithIcon: 24,
  iconSize: 16,
  iconWeight: 400,
  labelGap: 8,
  labelTypescale: m3ExpressiveLikeTypescale.body,
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
        handleElevation: m3ExpressiveLikeElevation.level0,
        iconColor: .role(.surfaceContainerHighest),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.outline)
      ),
      hovered: TanreiSwitchConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.outline), amount: 0.08),
        trackColor: .role(.surfaceContainerHighest),
        outlineColor: .role(.outline),
        handleColor: .role(.onSurfaceVariant),
        handleSize: 16,
        handleElevation: m3ExpressiveLikeElevation.level0,
        iconColor: .role(.surfaceContainerHighest),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.outline)
      ),
      focused: TanreiSwitchConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.outline), amount: 0.12),
        trackColor: .role(.surfaceContainerHighest),
        outlineColor: .role(.outline),
        handleColor: .role(.onSurfaceVariant),
        handleSize: 16,
        handleElevation: m3ExpressiveLikeElevation.level0,
        iconColor: .role(.surfaceContainerHighest),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.outline)
      ),
      pressed: TanreiSwitchConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.outline), amount: 0.12),
        trackColor: .role(.surfaceContainerHighest),
        outlineColor: .role(.outline),
        handleColor: .role(.onSurfaceVariant),
        handleSize: 28,
        handleElevation: m3ExpressiveLikeElevation.level0,
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
        handleElevation: m3ExpressiveLikeElevation.level0,
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
        handleElevation: m3ExpressiveLikeElevation.level0,
        iconColor: .role(.onPrimaryContainer),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      hovered: TanreiSwitchConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.08),
        trackColor: .role(.primary),
        outlineColor: .role(.primary),
        handleColor: .role(.primaryContainer),
        handleSize: 24,
        handleElevation: m3ExpressiveLikeElevation.level0,
        iconColor: .role(.onPrimaryContainer),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      focused: TanreiSwitchConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
        trackColor: .role(.primary),
        outlineColor: .role(.primary),
        handleColor: .role(.primaryContainer),
        handleSize: 24,
        handleElevation: m3ExpressiveLikeElevation.level0,
        iconColor: .role(.onPrimaryContainer),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      pressed: TanreiSwitchConditionStateTokens(
        containerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
        trackColor: .role(.primary),
        outlineColor: .role(.primary),
        handleColor: .role(.primaryContainer),
        handleSize: 28,
        handleElevation: m3ExpressiveLikeElevation.level0,
        iconColor: .role(.onPrimaryContainer),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      disabled: TanreiSwitchConditionStateTokens(
        containerColor: .none,
        trackColor: .alpha(of: .role(.onSurface), amount: 0.12),
        outlineColor: .alpha(of: .role(.onSurface), amount: 0.12),
        handleColor: .role(.surface),
        handleSize: 24,
        handleElevation: m3ExpressiveLikeElevation.level0,
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

private let m3ExpressiveLikeTabViewTokens = TanreiTabViewTokens(
  containerShape: 0,
  motionFadeDuration: 200,
  motionFadeEasing: TanreiCubicBezier(0.34, 0.8, 0.34, 1),
  motionSwitchDuration: 500,
  motionSwitchEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  motionTransition: 0,
  transitionBlur: 0,
  transitionDistance: 0,
  transitionDistanceFraction: 1,
  transitionOpacity: 1
)

private let m3ExpressiveLikeTableOfContentsTokens = TanreiTableOfContentsTokens(
  compactContainerColor: .role(.surfaceContainer),
  compactContainerShape: 8,
  compactIconColor: .role(.onSurfaceVariant),
  compactIconSize: 20,
  compactListPaddingBlock: 8,
  compactListPaddingInline: 16,
  compactRowGap: 8,
  compactRowHeight: 48,
  compactRowPaddingInline: 16,
  compactSupportingTextColor: .role(.onSurfaceVariant),
  compactSupportingTextTypescale: m3ExpressiveLikeTypescale.bodySmall,
  containerGap: 8,
  labelTypescale: m3ExpressiveLikeTypescale.bodySmall,
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
  rowShape: 4,
  titleColor: .role(.onSurface),
  titleTypescale: m3ExpressiveLikeTypescale.label,
  parts: TanreiTableOfContentsParts(
    item: TanreiTableOfContentsPartTokens(
      enabled: TanreiTableOfContentsPartStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      hovered: TanreiTableOfContentsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.08),
        labelColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiTableOfContentsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        labelColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiTableOfContentsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiTableOfContentsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiTableOfContentsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiTableOfContentsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiTableOfContentsPartStateTokens(
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
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

private let m3ExpressiveLikeTableTokens = TanreiTableTokens(
  captionGap: 8,
  captionTextColor: .role(.onSurfaceVariant),
  captionTextTypescale: m3ExpressiveLikeTypescale.bodySmall,
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
  rowSelectedContainerColor: .role(.secondaryContainer),
  rowSelectedHoveredContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.08),
  rowSelectedHoveredTextColor: .role(.onSecondaryContainer),
  rowSelectedPressedContainerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
  rowSelectedPressedTextColor: .role(.onSecondaryContainer),
  rowSelectedStateLayerColor: .role(.onSecondaryContainer),
  rowSelectedTextColor: .role(.onSecondaryContainer),
  rowUnselectedContainerColor: .none,
  rowUnselectedHoveredContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
  rowUnselectedHoveredTextColor: .role(.onSurface),
  rowUnselectedPressedContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
  rowUnselectedPressedTextColor: .role(.onSurface),
  rowUnselectedStateLayerColor: .role(.onSurface),
  rowUnselectedTextColor: .role(.onSurface),
  separation: 1,
  statusGap: 16,
  statusPaddingBlock: 8,
  statusTextColor: .role(.onSurfaceVariant),
  statusTextTypescale: m3ExpressiveLikeTypescale.bodySmall,
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
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
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
      cellTextTypescale: m3ExpressiveLikeTypescale.body,
      headerTextTypescale: m3ExpressiveLikeTypescale.label
    ),
    compact: TanreiTableDensityTokens(
      cellPaddingBlock: 6,
      cellPaddingInline: 12,
      cellTextTypescale: m3ExpressiveLikeTypescale.bodySmall,
      headerTextTypescale: m3ExpressiveLikeTypescale.labelSmall
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

private let m3ExpressiveLikeTabsTokens = TanreiTabsTokens(
  activeIndicatorHeight: 32,
  containerGap: 4,
  containerHeightWithIcon: 64,
  containerShape: 0,
  dividerColor: .role(.outlineVariant),
  dividerThickness: 1,
  labelTypescale: m3ExpressiveLikeTypescale.label,
  motionFeedbackDuration: 450,
  motionIndicatorDuration: 500,
  motionIndicatorEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionTransition: 0,
  primarySelectedLabelEmphasis: 0,
  secondarySelectedLabelEmphasis: 0,
  tonalSelectedLabelEmphasis: 200,
  trackPadding: 0,
  trackShape: 0,
  trackVisible: 1,
  variants: TanreiTabsVariants(
    primary: TanreiTabsVariantTokens(
      enabled: TanreiTabsVariantStateTokens(
        trackColor: .none,
        containerColor: .none,
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        coveredLabelColor: .role(.onSurfaceVariant),
        coveredIconColor: .role(.onSurfaceVariant),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 3,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 3,
        underlineShape: 3,
        stateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .none,
        selectedLabelColor: .role(.primary),
        selectedIconColor: .role(.primary),
        selectedCoveredLabelColor: .role(.primary),
        selectedCoveredIconColor: .role(.primary),
        selectedActiveIndicatorColor: .none,
        selectedUnderlineColor: .role(.primary),
        selectedStateLayerColor: .role(.primary)
      ),
      hovered: TanreiTabsVariantStateTokens(
        trackColor: .none,
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.08),
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        coveredLabelColor: .role(.onSurfaceVariant),
        coveredIconColor: .role(.onSurfaceVariant),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 3,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 3,
        underlineShape: 3,
        stateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .none, with: .role(.primary), amount: 0.08),
        selectedLabelColor: .role(.primary),
        selectedIconColor: .role(.primary),
        selectedCoveredLabelColor: .role(.primary),
        selectedCoveredIconColor: .role(.primary),
        selectedActiveIndicatorColor: .none,
        selectedUnderlineColor: .role(.primary),
        selectedStateLayerColor: .role(.primary)
      ),
      focused: TanreiTabsVariantStateTokens(
        trackColor: .none,
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        coveredLabelColor: .role(.onSurfaceVariant),
        coveredIconColor: .role(.onSurfaceVariant),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 3,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 3,
        underlineShape: 3,
        stateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
        selectedLabelColor: .role(.primary),
        selectedIconColor: .role(.primary),
        selectedCoveredLabelColor: .role(.primary),
        selectedCoveredIconColor: .role(.primary),
        selectedActiveIndicatorColor: .none,
        selectedUnderlineColor: .role(.primary),
        selectedStateLayerColor: .role(.primary)
      ),
      pressed: TanreiTabsVariantStateTokens(
        trackColor: .none,
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        coveredLabelColor: .role(.onSurfaceVariant),
        coveredIconColor: .role(.onSurfaceVariant),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 3,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 3,
        underlineShape: 3,
        stateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .none, with: .role(.primary), amount: 0.12),
        selectedLabelColor: .role(.primary),
        selectedIconColor: .role(.primary),
        selectedCoveredLabelColor: .role(.primary),
        selectedCoveredIconColor: .role(.primary),
        selectedActiveIndicatorColor: .none,
        selectedUnderlineColor: .role(.primary),
        selectedStateLayerColor: .role(.primary)
      ),
      disabled: TanreiTabsVariantStateTokens(
        trackColor: .none,
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
        selectedActiveIndicatorColor: .none,
        selectedUnderlineColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    secondary: TanreiTabsVariantTokens(
      enabled: TanreiTabsVariantStateTokens(
        trackColor: .none,
        containerColor: .none,
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        coveredLabelColor: .role(.onSurfaceVariant),
        coveredIconColor: .role(.onSurfaceVariant),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 2,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 2,
        underlineShape: 0,
        stateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .none,
        selectedLabelColor: .role(.onSurface),
        selectedIconColor: .role(.onSurface),
        selectedCoveredLabelColor: .role(.onSurface),
        selectedCoveredIconColor: .role(.onSurface),
        selectedActiveIndicatorColor: .none,
        selectedUnderlineColor: .role(.primary),
        selectedStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiTabsVariantStateTokens(
        trackColor: .none,
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.08),
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        coveredLabelColor: .role(.onSurfaceVariant),
        coveredIconColor: .role(.onSurfaceVariant),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 2,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 2,
        underlineShape: 0,
        stateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
        selectedLabelColor: .role(.onSurface),
        selectedIconColor: .role(.onSurface),
        selectedCoveredLabelColor: .role(.onSurface),
        selectedCoveredIconColor: .role(.onSurface),
        selectedActiveIndicatorColor: .none,
        selectedUnderlineColor: .role(.primary),
        selectedStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiTabsVariantStateTokens(
        trackColor: .none,
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        coveredLabelColor: .role(.onSurfaceVariant),
        coveredIconColor: .role(.onSurfaceVariant),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 2,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 2,
        underlineShape: 0,
        stateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        selectedLabelColor: .role(.onSurface),
        selectedIconColor: .role(.onSurface),
        selectedCoveredLabelColor: .role(.onSurface),
        selectedCoveredIconColor: .role(.onSurface),
        selectedActiveIndicatorColor: .none,
        selectedUnderlineColor: .role(.primary),
        selectedStateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiTabsVariantStateTokens(
        trackColor: .none,
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.12),
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        coveredLabelColor: .role(.onSurfaceVariant),
        coveredIconColor: .role(.onSurfaceVariant),
        activeIndicatorColor: .none,
        activeIndicatorThickness: 2,
        activeIndicatorShape: 9999,
        underlineColor: .none,
        underlineThickness: 2,
        underlineShape: 0,
        stateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
        selectedLabelColor: .role(.onSurface),
        selectedIconColor: .role(.onSurface),
        selectedCoveredLabelColor: .role(.onSurface),
        selectedCoveredIconColor: .role(.onSurface),
        selectedActiveIndicatorColor: .none,
        selectedUnderlineColor: .role(.primary),
        selectedStateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiTabsVariantStateTokens(
        trackColor: .none,
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
        selectedActiveIndicatorColor: .none,
        selectedUnderlineColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    tonal: TanreiTabsVariantTokens(
      enabled: TanreiTabsVariantStateTokens(
        trackColor: .none,
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
        trackColor: .none,
        containerColor: .mix(base: .none, with: .role(.onSurfaceVariant), amount: 0.08),
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
        selectedContainerColor: .mix(base: .none, with: .role(.onSecondaryContainer), amount: 0.08),
        selectedLabelColor: .role(.onSurfaceVariant),
        selectedIconColor: .role(.onSurfaceVariant),
        selectedCoveredLabelColor: .role(.onSecondaryContainer),
        selectedCoveredIconColor: .role(.onSecondaryContainer),
        selectedActiveIndicatorColor: .alpha(of: .role(.onSecondaryContainer), amount: 0.16),
        selectedUnderlineColor: .none,
        selectedStateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiTabsVariantStateTokens(
        trackColor: .none,
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
        trackColor: .none,
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
      disabled: TanreiTabsVariantStateTokens(
        trackColor: .none,
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
        selectedActiveIndicatorColor: .none,
        selectedUnderlineColor: .alpha(of: .role(.onSurface), amount: 0.38),
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

private let m3ExpressiveLikeTagGroupTokens = TanreiTagGroupTokens(
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

private let m3ExpressiveLikeTagTokens = TanreiTagTokens(
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
      labelTypescale: m3ExpressiveLikeTypescale.labelSmall
    ),
    medium: TanreiTagSizeTokens(
      containerHeight: 24,
      containerPaddingInline: 8,
      containerPaddingInlineWithIcon: 6,
      containerPaddingBlock: 2,
      labelTypescale: m3ExpressiveLikeTypescale.label
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

private let m3ExpressiveLikeTextInputTokens = TanreiTextInputTokens(
  codeTabSize: 2,
  codeTypescale: m3ExpressiveLikeTypescale.code,
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

private let m3ExpressiveLikeTimelineTokens = TanreiTimelineTokens(
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
      timeTypescale: m3ExpressiveLikeTypescale.bodySmall,
      titleTypescale: m3ExpressiveLikeTypescale.heading6,
      bodyTypescale: m3ExpressiveLikeTypescale.body
    ),
    large: TanreiTimelineSizeTokens(
      markerHeight: 28,
      timeTypescale: m3ExpressiveLikeTypescale.body,
      titleTypescale: m3ExpressiveLikeTypescale.heading5,
      bodyTypescale: m3ExpressiveLikeTypescale.bodyLarge
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

private let m3ExpressiveLikeToolbarTokens = TanreiToolbarTokens(
  dividerColor: .role(.outlineVariant),
  dividerLength: 24,
  dividerThickness: 1,
  groupGap: 8,
  outlineWidth: 1,
  separation: 1,
  variants: TanreiToolbarVariants(
    inline: TanreiToolbarVariantTokens(
      containerColor: .none,
      containerElevation: m3ExpressiveLikeElevation.level0,
      containerShape: 12,
      containerSize: 40,
      containerPaddingInline: 0,
      containerGap: 4,
      outlineColor: .none
    ),
    docked: TanreiToolbarVariantTokens(
      containerColor: .role(.surface),
      containerElevation: m3ExpressiveLikeElevation.level0,
      containerShape: 0,
      containerSize: 64,
      containerPaddingInline: 16,
      containerGap: 8,
      outlineColor: .role(.outlineVariant)
    ),
    floating: TanreiToolbarVariantTokens(
      containerColor: .role(.surfaceBright),
      containerElevation: m3ExpressiveLikeElevation.level3,
      containerShape: 9999,
      containerSize: 64,
      containerPaddingInline: 8,
      containerGap: 8,
      outlineColor: .none
    )
  )
)

private let m3ExpressiveLikeTooltipTokens = TanreiTooltipTokens(
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
  plainContainerElevation: m3ExpressiveLikeElevation.level0,
  plainContainerGap: 8,
  plainContainerInverse: 1,
  plainContainerMaxWidth: 200,
  plainContainerMinHeight: 24,
  plainContainerPaddingBlock: 4,
  plainContainerPaddingInline: 8,
  plainContainerShape: 4,
  plainShortcutColor: .role(.inverseOnSurface),
  plainSupportingTextColor: .role(.inverseOnSurface),
  plainSupportingTextTypescale: m3ExpressiveLikeTypescale.bodySmall,
  plainSurfaceContainerColor: .role(.surfaceBright),
  plainSurfaceContainerElevation: m3ExpressiveLikeElevation.level2,
  plainSurfaceShortcutColor: .role(.onSurfaceVariant),
  plainSurfaceSupportingTextColor: .role(.onSurface),
  richContainerColor: .role(.surfaceContainer),
  richContainerElevation: m3ExpressiveLikeElevation.level2,
  richContainerGap: 4,
  richContainerInverse: 0,
  richContainerMaxWidth: 320,
  richContainerPaddingBlock: 12,
  richContainerPaddingInline: 16,
  richContainerShape: 12,
  richInverseContainerColor: .role(.inverseSurface),
  richInverseContainerElevation: m3ExpressiveLikeElevation.level0,
  richInverseSupportingTextColor: .role(.inverseOnSurface),
  richInverseTitleColor: .role(.inverseOnSurface),
  richSupportingTextColor: .role(.onSurfaceVariant),
  richSupportingTextTypescale: m3ExpressiveLikeTypescale.body,
  richTitleColor: .role(.onSurfaceVariant),
  richTitleTypescale: m3ExpressiveLikeTypescale.heading6,
  timeoutTouch: 1500,
  windowMargin: 8
)

private let m3ExpressiveLikeTreeViewTokens = TanreiTreeViewTokens(
  containerShape: 8,
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
  supportingTextTypescale: m3ExpressiveLikeTypescale.bodySmall,
  trailingTextTypescale: m3ExpressiveLikeTypescale.bodySmall,
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.08),
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
        containerColor: .mix(base: .none, with: .role(.onSurface), amount: 0.12),
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
        containerColor: .role(.secondaryContainer),
        labelColor: .role(.onSecondaryContainer),
        supportingTextColor: .role(.onSecondaryContainer),
        trailingTextColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        chevronColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiTreeViewConditionStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.08),
        labelColor: .role(.onSecondaryContainer),
        supportingTextColor: .role(.onSecondaryContainer),
        trailingTextColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        chevronColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiTreeViewConditionStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        labelColor: .role(.onSecondaryContainer),
        supportingTextColor: .role(.onSecondaryContainer),
        trailingTextColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        chevronColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiTreeViewConditionStateTokens(
        containerColor: .mix(base: .role(.secondaryContainer), with: .role(.onSecondaryContainer), amount: 0.12),
        labelColor: .role(.onSecondaryContainer),
        supportingTextColor: .role(.onSecondaryContainer),
        trailingTextColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        chevronColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiTreeViewConditionStateTokens(
        containerColor: .role(.secondaryContainer),
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
      labelTypescale: m3ExpressiveLikeTypescale.body,
      iconSize: 20,
      chevronSize: 20
    ),
    compact: TanreiTreeViewDensityTokens(
      containerHeight: 32,
      containerPaddingBlock: 6,
      containerPaddingInline: 8,
      containerGap: 8,
      levelIndent: 24,
      labelTypescale: m3ExpressiveLikeTypescale.bodySmall,
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
  /// The "m3-expressive-like" design system.
  public static let m3ExpressiveLike = TanreiSystem(
    id: "m3-expressive-like",
    intents: [.error, .info, .primary, .secondary, .success, TanreiColorRole(rawValue: "tertiary"), .warning],
    colors: TanreiColorSchemes(
      light: m3ExpressiveLikeLightColors,
      lightMedium: m3ExpressiveLikeLightMediumColors,
      lightHigh: m3ExpressiveLikeLightHighColors,
      dark: m3ExpressiveLikeDarkColors,
      darkMedium: m3ExpressiveLikeDarkMediumColors,
      darkHigh: m3ExpressiveLikeDarkHighColors
    ),
    typescale: m3ExpressiveLikeTypescale,
    shape: TanreiShape(
      extraExtraLarge: 48,
      extraLarge: 28,
      extraLargeIncreased: 32,
      extraSmall: 4,
      full: 9999,
      large: 16,
      largeIncreased: 20,
      medium: 12,
      none: 0,
      small: 8,
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
      space900: 72
    ),
    state: TanreiState(
      disabledContainerOpacity: 0.12,
      disabledContentOpacity: 0.38,
      draggedStateLayerOpacity: 0.16,
      focusStateLayerOpacity: 0.12,
      hoverStateLayerOpacity: 0.08,
      pressedStateLayerOpacity: 0.12,
      selectedStateLayerOpacity: 0.16
    ),
    measure: TanreiMeasure(
      borderHairline: 1,
      borderThick: 2,
      breakpointExpanded: 1024,
      breakpointMedium: 600,
      focusInnerWidth: 0,
      focusOffset: 2,
      focusOuterWidth: 3,
      iconExtraSmall: 16,
      iconLarge: 32,
      iconMedium: 24,
      iconSmall: 20,
      targetPointer: 44,
      targetSpacing: 8,
      targetTouch: 48
    ),
    typefaces: m3ExpressiveLikeTypefaces,
    icon: TanreiIconStyle(
      families: TanreiIconFamilies(
        unselected: m3ExpressiveLikeTypefaces.icon,
        selected: m3ExpressiveLikeTypefaces.icon
      ),
      weight: 400,
      markWeight: 400,
      fillUnselected: 0,
      fillSelected: 1,
      opticalSizeMin: 20,
      opticalSizeMax: 48
    ),
    behavior: TanreiBehavior(
      appearance: .unfold,
      dividerVisibility: .scroll,
      focusStyle: .ring,
      linkUnderline: .always,
      pressedFeedback: .ripple,
      requirementMark: .asterisk,
      scrollEdge: .line,
      separation: .gap
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
        enter: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
        exit: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
        linear: TanreiCubicBezier(0, 0, 1, 1),
        spatial: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
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
          slowSpatial: TanreiSpringSpec(damping: 0.8, stiffness: 200, easing: TanreiCubicBezier(0.39, 1.29, 0.35, 0.98), durationMs: 650)
        ),
        standard: TanreiSpringSet(
          defaultEffects: TanreiSpringSpec(damping: 1, stiffness: 1600, easing: TanreiCubicBezier(0.34, 0.8, 0.34, 1), durationMs: 200),
          defaultSpatial: TanreiSpringSpec(damping: 0.9, stiffness: 700, easing: TanreiCubicBezier(0.27, 1.06, 0.18, 1), durationMs: 500),
          fastEffects: TanreiSpringSpec(damping: 1, stiffness: 3800, easing: TanreiCubicBezier(0.31, 0.94, 0.34, 1), durationMs: 150),
          fastSpatial: TanreiSpringSpec(damping: 0.9, stiffness: 1400, easing: TanreiCubicBezier(0.27, 1.06, 0.18, 1), durationMs: 350),
          slowEffects: TanreiSpringSpec(damping: 1, stiffness: 800, easing: TanreiCubicBezier(0.34, 0.88, 0.34, 1), durationMs: 300),
          slowSpatial: TanreiSpringSpec(damping: 0.9, stiffness: 300, easing: TanreiCubicBezier(0.27, 1.06, 0.18, 1), durationMs: 750)
        )
      )
    ),
    elevation: m3ExpressiveLikeElevation,
    accordion: m3ExpressiveLikeAccordionTokens,
    appBar: m3ExpressiveLikeAppBarTokens,
    appShell: m3ExpressiveLikeAppShellTokens,
    avatar: m3ExpressiveLikeAvatarTokens,
    badge: m3ExpressiveLikeBadgeTokens,
    bottomSheet: m3ExpressiveLikeBottomSheetTokens,
    breadcrumbs: m3ExpressiveLikeBreadcrumbsTokens,
    buttonGroup: m3ExpressiveLikeButtonGroupTokens,
    buttonWithMenu: m3ExpressiveLikeButtonWithMenuTokens,
    button: m3ExpressiveLikeButtonTokens,
    calendar: m3ExpressiveLikeCalendarTokens,
    callout: m3ExpressiveLikeCalloutTokens,
    card: m3ExpressiveLikeCardTokens,
    carousel: m3ExpressiveLikeCarouselTokens,
    chatComposer: m3ExpressiveLikeChatComposerTokens,
    checkbox: m3ExpressiveLikeCheckboxTokens,
    chip: m3ExpressiveLikeChipTokens,
    codeBlock: m3ExpressiveLikeCodeBlockTokens,
    colorInput: m3ExpressiveLikeColorInputTokens,
    combobox: m3ExpressiveLikeComboboxTokens,
    copyButton: m3ExpressiveLikeCopyButtonTokens,
    dateTimePicker: m3ExpressiveLikeDateTimePickerTokens,
    descriptionList: m3ExpressiveLikeDescriptionListTokens,
    dialog: m3ExpressiveLikeDialogTokens,
    divider: m3ExpressiveLikeDividerTokens,
    dropZone: m3ExpressiveLikeDropZoneTokens,
    embeddedTextInput: m3ExpressiveLikeEmbeddedTextInputTokens,
    emptyState: m3ExpressiveLikeEmptyStateTokens,
    fabMenu: m3ExpressiveLikeFabMenuTokens,
    fieldGroup: m3ExpressiveLikeFieldGroupTokens,
    field: m3ExpressiveLikeFieldTokens,
    figure: m3ExpressiveLikeFigureTokens,
    fileItem: m3ExpressiveLikeFileItemTokens,
    filePicker: m3ExpressiveLikeFilePickerTokens,
    fileUpload: m3ExpressiveLikeFileUploadTokens,
    handle: m3ExpressiveLikeHandleTokens,
    imagePreview: m3ExpressiveLikeImagePreviewTokens,
    inlineCode: m3ExpressiveLikeInlineCodeTokens,
    inputBox: m3ExpressiveLikeInputBoxTokens,
    keyboardShortcut: m3ExpressiveLikeKeyboardShortcutTokens,
    linkCard: m3ExpressiveLikeLinkCardTokens,
    link: m3ExpressiveLikeLinkTokens,
    listRow: m3ExpressiveLikeListRowTokens,
    list: m3ExpressiveLikeListTokens,
    loadingIndicator: m3ExpressiveLikeLoadingIndicatorTokens,
    mainActionButton: m3ExpressiveLikeMainActionButtonTokens,
    menu: m3ExpressiveLikeMenuTokens,
    menubar: m3ExpressiveLikeMenubarTokens,
    meter: m3ExpressiveLikeMeterTokens,
    modalLayer: m3ExpressiveLikeModalLayerTokens,
    navigationBar: m3ExpressiveLikeNavigationBarTokens,
    navigationDrawer: m3ExpressiveLikeNavigationDrawerTokens,
    numberInput: m3ExpressiveLikeNumberInputTokens,
    oneTimeCodeInput: m3ExpressiveLikeOneTimeCodeInputTokens,
    pageHeader: m3ExpressiveLikePageHeaderTokens,
    pagination: m3ExpressiveLikePaginationTokens,
    popover: m3ExpressiveLikePopoverTokens,
    previousNextLinks: m3ExpressiveLikePreviousNextLinksTokens,
    progressIndicator: m3ExpressiveLikeProgressIndicatorTokens,
    prose: m3ExpressiveLikeProseTokens,
    radioButton: m3ExpressiveLikeRadioButtonTokens,
    scrollArea: m3ExpressiveLikeScrollAreaTokens,
    search: m3ExpressiveLikeSearchTokens,
    segmentedButton: m3ExpressiveLikeSegmentedButtonTokens,
    select: m3ExpressiveLikeSelectTokens,
    sideSheet: m3ExpressiveLikeSideSheetTokens,
    skeleton: m3ExpressiveLikeSkeletonTokens,
    slider: m3ExpressiveLikeSliderTokens,
    snackbar: m3ExpressiveLikeSnackbarTokens,
    stepper: m3ExpressiveLikeStepperTokens,
    steps: m3ExpressiveLikeStepsTokens,
    swatch: m3ExpressiveLikeSwatchTokens,
    switch: m3ExpressiveLikeSwitchTokens,
    tabView: m3ExpressiveLikeTabViewTokens,
    tableOfContents: m3ExpressiveLikeTableOfContentsTokens,
    table: m3ExpressiveLikeTableTokens,
    tabs: m3ExpressiveLikeTabsTokens,
    tagGroup: m3ExpressiveLikeTagGroupTokens,
    tag: m3ExpressiveLikeTagTokens,
    textInput: m3ExpressiveLikeTextInputTokens,
    timeline: m3ExpressiveLikeTimelineTokens,
    toolbar: m3ExpressiveLikeToolbarTokens,
    tooltip: m3ExpressiveLikeTooltipTokens,
    treeView: m3ExpressiveLikeTreeViewTokens
  )
}

// ── Vocabulary extensions of "m3-expressive-like" ────────────────────────────────────────
// Typed names for what this design system adds to Tanrei: steps, color roles and component values it
// declared, and the tokens of its own namespace. Everything above has the shape of every design system.

extension TanreiButtonSize {
  /// The `xsmall` size "m3-expressive-like" adds to button.
  public static let xsmall = TanreiButtonSize(rawValue: "xsmall")
  /// The `xlarge` size "m3-expressive-like" adds to button.
  public static let xlarge = TanreiButtonSize(rawValue: "xlarge")
}
