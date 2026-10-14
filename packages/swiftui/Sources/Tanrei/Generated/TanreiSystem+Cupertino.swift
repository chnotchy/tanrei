// 112 contrast measurement(s) below Tanrei's thresholds in system "cupertino", which do not apply to an imitation preset. See tokens/generated/cupertino/a11y-report.json
// GENERATED FILE — DO NOT EDIT.
// Source: tokens/ (DTCG 2025.10). Regenerate with `pnpm generate`.
// System values of "cupertino". Generated the same way for every system; the types are in TanreiTokens.swift.
// swiftlint:disable all

import SwiftUI

private let cupertinoTypescaleBodyCallout: TanreiTextStyle = TanreiTextStyle(font: TanreiFontStack(families: ["Inter"], generic: .sansSerif, system: true), size: 16, weight: 400, tracking: 0, lineHeight: 21, family: .body)

private let cupertinoTypescaleBodySubhead: TanreiTextStyle = TanreiTextStyle(font: TanreiFontStack(families: ["Inter"], generic: .sansSerif, system: true), size: 15, weight: 400, tracking: 0, lineHeight: 20, family: .body)

private let cupertinoTypescaleCaptionSmall: TanreiTextStyle = TanreiTextStyle(font: TanreiFontStack(families: ["Inter"], generic: .sansSerif, system: true), size: 11, weight: 400, tracking: 0, lineHeight: 13, family: .label)

private let cupertinoTypefaces = TanreiTypefaces(
  brand: TanreiFontStack(families: ["Inter"], generic: .sansSerif, system: true),
  plain: TanreiFontStack(families: ["Inter"], generic: .sansSerif, system: true),
  mono: TanreiFontStack(families: ["SF Mono", "Menlo"], generic: .monospace, system: true),
  icon: TanreiFontStack(families: ["Material Symbols Rounded"], generic: .sansSerif, system: false)
)

private let cupertinoTypescale = TanreiTypescale(
  body: TanreiTextStyle(font: cupertinoTypefaces.brand, size: 15, weight: 400, tracking: 0, lineHeight: 20, family: .body),
  bodyLarge: TanreiTextStyle(font: cupertinoTypefaces.brand, size: 17, weight: 400, tracking: 0, lineHeight: 22, family: .body),
  bodySmall: TanreiTextStyle(font: cupertinoTypefaces.brand, size: 13, weight: 400, tracking: 0, lineHeight: 18, family: .body),
  caption: TanreiTextStyle(font: cupertinoTypefaces.brand, size: 12, weight: 400, tracking: 0, lineHeight: 16, family: .label),
  code: TanreiTextStyle(font: cupertinoTypefaces.mono, size: 13, weight: 400, tracking: 0, lineHeight: 20, family: .label),
  codeSmall: TanreiTextStyle(font: cupertinoTypefaces.mono, size: 12, weight: 400, tracking: 0, lineHeight: 16, family: .label),
  display: TanreiTextStyle(font: cupertinoTypefaces.brand, size: 34, weight: 700, tracking: 0, lineHeight: 41, family: .display),
  eyebrow: TanreiTextStyle(font: cupertinoTypefaces.brand, size: 12, weight: 500, tracking: 0.96, lineHeight: 16, family: .label),
  heading1: TanreiTextStyle(font: cupertinoTypefaces.brand, size: 28, weight: 700, tracking: 0, lineHeight: 34, family: .heading),
  heading2: TanreiTextStyle(font: cupertinoTypefaces.brand, size: 22, weight: 700, tracking: 0, lineHeight: 28, family: .heading),
  heading3: TanreiTextStyle(font: cupertinoTypefaces.brand, size: 20, weight: 600, tracking: 0, lineHeight: 25, family: .heading),
  heading4: TanreiTextStyle(font: cupertinoTypefaces.brand, size: 17, weight: 600, tracking: 0, lineHeight: 22, family: .heading),
  heading5: TanreiTextStyle(font: cupertinoTypefaces.brand, size: 16, weight: 600, tracking: 0, lineHeight: 21, family: .heading),
  heading6: TanreiTextStyle(font: cupertinoTypefaces.brand, size: 15, weight: 600, tracking: 0, lineHeight: 20, family: .heading),
  label: TanreiTextStyle(font: cupertinoTypefaces.brand, size: 17, weight: 400, tracking: 0, lineHeight: 22, family: .label),
  labelSmall: TanreiTextStyle(font: cupertinoTypefaces.brand, size: 13, weight: 400, tracking: 0, lineHeight: 18, family: .label),
  emphasis: TanreiTypeEmphasis(
    display: 100,
    heading: 200,
    body: 200,
    label: 200
  ),
  extra: [
    "body-callout": cupertinoTypescaleBodyCallout,
    "body-subhead": cupertinoTypescaleBodySubhead,
    "caption-small": cupertinoTypescaleCaptionSmall,
  ]
)

private let cupertinoElevation = TanreiElevation(
  level0: [],
  level1: [
    TanreiShadowLayer(x: 0, y: 1, blur: 3, spread: 0, role: .elevationShadow1),
  ],
  level2: [
    TanreiShadowLayer(x: 0, y: 2, blur: 8, spread: 0, role: .elevationShadow2),
  ],
  level3: [
    TanreiShadowLayer(x: 0, y: 4, blur: 16, spread: 0, role: .elevationShadow2),
  ],
  level4: [
    TanreiShadowLayer(x: 0, y: 8, blur: 24, spread: 0, role: .elevationShadow3),
  ],
  level5: [
    TanreiShadowLayer(x: 0, y: 12, blur: 40, spread: 0, role: .elevationShadow3),
  ]
)

private let cupertinoLightColors = TanreiColors(scheme: .light, values: [
  .elevationRing: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .elevationShadow1: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.08),
  .elevationShadow2: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.12),
  .elevationShadow3: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.2),
  .error: TanreiColorValue(red: 0.9333, green: 0.2157, blue: 0.1686, opacity: 1),
  .errorContainer: TanreiColorValue(red: 1, green: 0.8863, blue: 0.8667, opacity: 1),
  .focusRing: TanreiColorValue(red: 0.0314, green: 0.4784, blue: 1, opacity: 1),
  .focusRingInner: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .info: TanreiColorValue(red: 0, green: 0.5333, blue: 0.7255, opacity: 1),
  .infoContainer: TanreiColorValue(red: 0.8196, green: 0.9255, blue: 1, opacity: 1),
  .inverseLink: TanreiColorValue(red: 0.502, green: 0.6667, blue: 1, opacity: 1),
  .inverseOnSurface: TanreiColorValue(red: 0.9882, green: 0.9725, blue: 0.9804, opacity: 1),
  .inversePrimary: TanreiColorValue(red: 0.502, green: 0.6667, blue: 1, opacity: 1),
  .inverseSurface: TanreiColorValue(red: 0.1647, green: 0.1647, blue: 0.1686, opacity: 1),
  .link: TanreiColorValue(red: 0.0314, green: 0.4784, blue: 1, opacity: 1),
  .onError: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onErrorContainer: TanreiColorValue(red: 0.6627, green: 0, blue: 0.0235, opacity: 1),
  .onInfo: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onInfoContainer: TanreiColorValue(red: 0, green: 0.349, blue: 0.4784, opacity: 1),
  .onPrimary: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onPrimaryContainer: TanreiColorValue(red: 0, green: 0.3098, blue: 0.6706, opacity: 1),
  .onSecondary: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSecondaryContainer: TanreiColorValue(red: 0.0314, green: 0.4784, blue: 1, opacity: 1),
  .onSuccess: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSuccessContainer: TanreiColorValue(red: 0, green: 0.3765, blue: 0.1255, opacity: 1),
  .onSurface: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .onSurfaceVariant: TanreiColorValue(red: 0.4196, green: 0.4157, blue: 0.4235, opacity: 1),
  .onWarning: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onWarningContainer: TanreiColorValue(red: 0.4667, green: 0.2824, blue: 0, opacity: 1),
  .outline: TanreiColorValue(red: 0.7647, green: 0.7529, blue: 0.7608, opacity: 1),
  .outlineVariant: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.12),
  .primary: TanreiColorValue(red: 0.0314, green: 0.4784, blue: 1, opacity: 1),
  .primaryContainer: TanreiColorValue(red: 0.8784, green: 0.9098, blue: 1, opacity: 1),
  .scrim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.4),
  .secondary: TanreiColorValue(red: 0.5216, green: 0.5137, blue: 0.5216, opacity: 1),
  .secondaryContainer: TanreiColorValue(red: 0.9176, green: 0.9059, blue: 0.9137, opacity: 1),
  .shadow: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .success: TanreiColorValue(red: 0, green: 0.5765, blue: 0.2118, opacity: 1),
  .successContainer: TanreiColorValue(red: 0.5961, green: 1, blue: 0.6235, opacity: 1),
  .surface: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .surfaceBright: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .surfaceContainer: TanreiColorValue(red: 0.9529, green: 0.9412, blue: 0.9451, opacity: 1),
  .surfaceContainerHigh: TanreiColorValue(red: 0.9176, green: 0.9059, blue: 0.9137, opacity: 1),
  .surfaceContainerHighest: TanreiColorValue(red: 0.8941, green: 0.8863, blue: 0.8902, opacity: 1),
  .surfaceContainerLow: TanreiColorValue(red: 0.9882, green: 0.9725, blue: 0.9804, opacity: 1),
  .surfaceContainerLowest: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .surfaceDim: TanreiColorValue(red: 0.9529, green: 0.9412, blue: 0.9451, opacity: 1),
  .surfaceVariant: TanreiColorValue(red: 0.9176, green: 0.9059, blue: 0.9137, opacity: 1),
  .warning: TanreiColorValue(red: 0.7059, green: 0.4353, blue: 0, opacity: 1),
  .warningContainer: TanreiColorValue(red: 1, green: 0.8941, blue: 0.7882, opacity: 1),
])

private let cupertinoLightMediumColors = TanreiColors(scheme: .lightMedium, values: [
  .elevationRing: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .elevationShadow1: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.08),
  .elevationShadow2: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.12),
  .elevationShadow3: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.2),
  .error: TanreiColorValue(red: 0.7451, green: 0.0431, blue: 0.051, opacity: 1),
  .errorContainer: TanreiColorValue(red: 1, green: 0.8549, blue: 0.8353, opacity: 1),
  .focusRing: TanreiColorValue(red: 0, green: 0.3529, blue: 0.7608, opacity: 1),
  .focusRingInner: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .info: TanreiColorValue(red: 0, green: 0.3961, blue: 0.5451, opacity: 1),
  .infoContainer: TanreiColorValue(red: 0.7725, green: 0.9059, blue: 1, opacity: 1),
  .inverseLink: TanreiColorValue(red: 0.5922, green: 0.7216, blue: 1, opacity: 1),
  .inverseOnSurface: TanreiColorValue(red: 0.9882, green: 0.9725, blue: 0.9804, opacity: 1),
  .inversePrimary: TanreiColorValue(red: 0.5922, green: 0.7216, blue: 1, opacity: 1),
  .inverseSurface: TanreiColorValue(red: 0.1647, green: 0.1647, blue: 0.1686, opacity: 1),
  .link: TanreiColorValue(red: 0, green: 0.3529, blue: 0.7608, opacity: 1),
  .onError: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onErrorContainer: TanreiColorValue(red: 0.5451, green: 0, blue: 0.0157, opacity: 1),
  .onInfo: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onInfoContainer: TanreiColorValue(red: 0, green: 0.2784, blue: 0.3882, opacity: 1),
  .onPrimary: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onPrimaryContainer: TanreiColorValue(red: 0, green: 0.2471, blue: 0.5451, opacity: 1),
  .onSecondary: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSecondaryContainer: TanreiColorValue(red: 0, green: 0.3529, blue: 0.7608, opacity: 1),
  .onSuccess: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSuccessContainer: TanreiColorValue(red: 0, green: 0.3059, blue: 0.0941, opacity: 1),
  .onSurface: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .onSurfaceVariant: TanreiColorValue(red: 0.3255, green: 0.3216, blue: 0.3294, opacity: 1),
  .onWarning: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onWarningContainer: TanreiColorValue(red: 0.3765, green: 0.2235, blue: 0, opacity: 1),
  .outline: TanreiColorValue(red: 0.4706, green: 0.4667, blue: 0.4706, opacity: 1),
  .outlineVariant: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.18),
  .primary: TanreiColorValue(red: 0, green: 0.3529, blue: 0.7608, opacity: 1),
  .primaryContainer: TanreiColorValue(red: 0.8471, green: 0.8863, blue: 1, opacity: 1),
  .scrim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.4),
  .secondary: TanreiColorValue(red: 0.3922, green: 0.3882, blue: 0.3922, opacity: 1),
  .secondaryContainer: TanreiColorValue(red: 0.8941, green: 0.8863, blue: 0.8902, opacity: 1),
  .shadow: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .success: TanreiColorValue(red: 0, green: 0.4314, blue: 0.149, opacity: 1),
  .successContainer: TanreiColorValue(red: 0.4784, green: 0.9922, blue: 0.5412, opacity: 1),
  .surface: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .surfaceBright: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .surfaceContainer: TanreiColorValue(red: 0.9529, green: 0.9412, blue: 0.9451, opacity: 1),
  .surfaceContainerHigh: TanreiColorValue(red: 0.9176, green: 0.9059, blue: 0.9137, opacity: 1),
  .surfaceContainerHighest: TanreiColorValue(red: 0.8941, green: 0.8863, blue: 0.8902, opacity: 1),
  .surfaceContainerLow: TanreiColorValue(red: 0.9882, green: 0.9725, blue: 0.9804, opacity: 1),
  .surfaceContainerLowest: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .surfaceDim: TanreiColorValue(red: 0.9529, green: 0.9412, blue: 0.9451, opacity: 1),
  .surfaceVariant: TanreiColorValue(red: 0.9176, green: 0.9059, blue: 0.9137, opacity: 1),
  .warning: TanreiColorValue(red: 0.5294, green: 0.3216, blue: 0, opacity: 1),
  .warningContainer: TanreiColorValue(red: 1, green: 0.8667, blue: 0.7294, opacity: 1),
])

private let cupertinoLightHighColors = TanreiColors(scheme: .lightHigh, values: [
  .elevationRing: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .elevationShadow1: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.08),
  .elevationShadow2: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.12),
  .elevationShadow3: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.2),
  .error: TanreiColorValue(red: 0.5765, green: 0, blue: 0.0157, opacity: 1),
  .errorContainer: TanreiColorValue(red: 1, green: 0.8275, blue: 0.8, opacity: 1),
  .focusRing: TanreiColorValue(red: 0, green: 0.2667, blue: 0.5804, opacity: 1),
  .focusRingInner: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .info: TanreiColorValue(red: 0, green: 0.298, blue: 0.4157, opacity: 1),
  .infoContainer: TanreiColorValue(red: 0.7216, green: 0.8902, blue: 1, opacity: 1),
  .inverseLink: TanreiColorValue(red: 0.7647, green: 0.8314, blue: 1, opacity: 1),
  .inverseOnSurface: TanreiColorValue(red: 0.9882, green: 0.9725, blue: 0.9804, opacity: 1),
  .inversePrimary: TanreiColorValue(red: 0.7647, green: 0.8314, blue: 1, opacity: 1),
  .inverseSurface: TanreiColorValue(red: 0.1647, green: 0.1647, blue: 0.1686, opacity: 1),
  .link: TanreiColorValue(red: 0, green: 0.2667, blue: 0.5804, opacity: 1),
  .onError: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onErrorContainer: TanreiColorValue(red: 0.2863, green: 0, blue: 0.0039, opacity: 1),
  .onInfo: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onInfoContainer: TanreiColorValue(red: 0, green: 0.1333, blue: 0.1961, opacity: 1),
  .onPrimary: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onPrimaryContainer: TanreiColorValue(red: 0, green: 0.1176, blue: 0.2863, opacity: 1),
  .onSecondary: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSecondaryContainer: TanreiColorValue(red: 0, green: 0.1961, blue: 0.4471, opacity: 1),
  .onSuccess: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSuccessContainer: TanreiColorValue(red: 0, green: 0.149, blue: 0.0314, opacity: 1),
  .onSurface: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .onSurfaceVariant: TanreiColorValue(red: 0.1882, green: 0.1882, blue: 0.1961, opacity: 1),
  .onWarning: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onWarningContainer: TanreiColorValue(red: 0.1922, green: 0.1059, blue: 0, opacity: 1),
  .outline: TanreiColorValue(red: 0.3255, green: 0.3216, blue: 0.3294, opacity: 1),
  .outlineVariant: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.3),
  .primary: TanreiColorValue(red: 0, green: 0.2667, blue: 0.5804, opacity: 1),
  .primaryContainer: TanreiColorValue(red: 0.8118, green: 0.8667, blue: 1, opacity: 1),
  .scrim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.4),
  .secondary: TanreiColorValue(red: 0.2588, green: 0.2588, blue: 0.2627, opacity: 1),
  .secondaryContainer: TanreiColorValue(red: 0.8745, green: 0.8627, blue: 0.8706, opacity: 1),
  .shadow: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .success: TanreiColorValue(red: 0, green: 0.3255, blue: 0.1059, opacity: 1),
  .successContainer: TanreiColorValue(red: 0.4588, green: 0.9686, blue: 0.5216, opacity: 1),
  .surface: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .surfaceBright: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .surfaceContainer: TanreiColorValue(red: 0.9529, green: 0.9412, blue: 0.9451, opacity: 1),
  .surfaceContainerHigh: TanreiColorValue(red: 0.9176, green: 0.9059, blue: 0.9137, opacity: 1),
  .surfaceContainerHighest: TanreiColorValue(red: 0.8941, green: 0.8863, blue: 0.8902, opacity: 1),
  .surfaceContainerLow: TanreiColorValue(red: 0.9882, green: 0.9725, blue: 0.9804, opacity: 1),
  .surfaceContainerLowest: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .surfaceDim: TanreiColorValue(red: 0.9529, green: 0.9412, blue: 0.9451, opacity: 1),
  .surfaceVariant: TanreiColorValue(red: 0.9176, green: 0.9059, blue: 0.9137, opacity: 1),
  .warning: TanreiColorValue(red: 0.4039, green: 0.2392, blue: 0, opacity: 1),
  .warningContainer: TanreiColorValue(red: 1, green: 0.8392, blue: 0.6706, opacity: 1),
])

private let cupertinoDarkColors = TanreiColors(scheme: .dark, values: [
  .elevationRing: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .elevationShadow1: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.3),
  .elevationShadow2: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.4),
  .elevationShadow3: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.5),
  .error: TanreiColorValue(red: 1, green: 0.3333, blue: 0.2667, opacity: 1),
  .errorContainer: TanreiColorValue(red: 0.4941, green: 0, blue: 0.0118, opacity: 1),
  .focusRing: TanreiColorValue(red: 0.298, green: 0.5569, blue: 1, opacity: 1),
  .focusRingInner: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .info: TanreiColorValue(red: 0.0824, green: 0.6078, blue: 0.8196, opacity: 1),
  .infoContainer: TanreiColorValue(red: 0, green: 0.251, blue: 0.3529, opacity: 1),
  .inverseLink: TanreiColorValue(red: 0, green: 0.4, blue: 0.851, opacity: 1),
  .inverseOnSurface: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .inversePrimary: TanreiColorValue(red: 0, green: 0.4, blue: 0.851, opacity: 1),
  .inverseSurface: TanreiColorValue(red: 0.9176, green: 0.9059, blue: 0.9137, opacity: 1),
  .link: TanreiColorValue(red: 0.298, green: 0.5569, blue: 1, opacity: 1),
  .onError: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onErrorContainer: TanreiColorValue(red: 1, green: 0.7804, blue: 0.749, opacity: 1),
  .onInfo: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onInfoContainer: TanreiColorValue(red: 0.6431, green: 0.8627, blue: 1, opacity: 1),
  .onPrimary: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onPrimaryContainer: TanreiColorValue(red: 0.7647, green: 0.8314, blue: 1, opacity: 1),
  .onSecondary: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .onSecondaryContainer: TanreiColorValue(red: 0.298, green: 0.5569, blue: 1, opacity: 1),
  .onSuccess: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSuccessContainer: TanreiColorValue(red: 0.4235, green: 0.9333, blue: 0.4902, opacity: 1),
  .onSurface: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSurfaceVariant: TanreiColorValue(red: 0.6235, green: 0.6157, blue: 0.6235, opacity: 1),
  .onWarning: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onWarningContainer: TanreiColorValue(red: 1, green: 0.7961, blue: 0.5725, opacity: 1),
  .outline: TanreiColorValue(red: 0.3255, green: 0.3216, blue: 0.3294, opacity: 1),
  .outlineVariant: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 0.16),
  .primary: TanreiColorValue(red: 0.298, green: 0.5569, blue: 1, opacity: 1),
  .primaryContainer: TanreiColorValue(red: 0, green: 0.2235, blue: 0.4941, opacity: 1),
  .scrim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.4),
  .secondary: TanreiColorValue(red: 0.6235, green: 0.6157, blue: 0.6235, opacity: 1),
  .secondaryContainer: TanreiColorValue(red: 0.1647, green: 0.1647, blue: 0.1686, opacity: 1),
  .shadow: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .success: TanreiColorValue(red: 0.0667, green: 0.6549, blue: 0.251, opacity: 1),
  .successContainer: TanreiColorValue(red: 0, green: 0.2745, blue: 0.0824, opacity: 1),
  .surface: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .surfaceBright: TanreiColorValue(red: 0.1647, green: 0.1647, blue: 0.1686, opacity: 1),
  .surfaceContainer: TanreiColorValue(red: 0.1647, green: 0.1647, blue: 0.1686, opacity: 1),
  .surfaceContainerHigh: TanreiColorValue(red: 0.2157, green: 0.2157, blue: 0.2196, opacity: 1),
  .surfaceContainerHighest: TanreiColorValue(red: 0.2588, green: 0.2588, blue: 0.2627, opacity: 1),
  .surfaceContainerLow: TanreiColorValue(red: 0.1137, green: 0.1137, blue: 0.1216, opacity: 1),
  .surfaceContainerLowest: TanreiColorValue(red: 0.1137, green: 0.1137, blue: 0.1216, opacity: 1),
  .surfaceDim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .surfaceVariant: TanreiColorValue(red: 0.1647, green: 0.1647, blue: 0.1686, opacity: 1),
  .warning: TanreiColorValue(red: 0.8039, green: 0.498, blue: 0, opacity: 1),
  .warningContainer: TanreiColorValue(red: 0.3412, green: 0.2, blue: 0, opacity: 1),
])

private let cupertinoDarkMediumColors = TanreiColors(scheme: .darkMedium, values: [
  .elevationRing: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .elevationShadow1: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.3),
  .elevationShadow2: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.4),
  .elevationShadow3: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.5),
  .error: TanreiColorValue(red: 1, green: 0.5765, blue: 0.5176, opacity: 1),
  .errorContainer: TanreiColorValue(red: 0.4941, green: 0, blue: 0.0118, opacity: 1),
  .focusRing: TanreiColorValue(red: 0.5412, green: 0.6902, blue: 1, opacity: 1),
  .focusRingInner: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .info: TanreiColorValue(red: 0.298, green: 0.7333, blue: 0.9529, opacity: 1),
  .infoContainer: TanreiColorValue(red: 0, green: 0.251, blue: 0.3529, opacity: 1),
  .inverseLink: TanreiColorValue(red: 0, green: 0.3373, blue: 0.7216, opacity: 1),
  .inverseOnSurface: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .inversePrimary: TanreiColorValue(red: 0, green: 0.3373, blue: 0.7216, opacity: 1),
  .inverseSurface: TanreiColorValue(red: 0.9176, green: 0.9059, blue: 0.9137, opacity: 1),
  .link: TanreiColorValue(red: 0.5412, green: 0.6902, blue: 1, opacity: 1),
  .onError: TanreiColorValue(red: 0.1765, green: 0, blue: 0, opacity: 1),
  .onErrorContainer: TanreiColorValue(red: 1, green: 0.8549, blue: 0.8353, opacity: 1),
  .onInfo: TanreiColorValue(red: 0, green: 0.0745, blue: 0.1176, opacity: 1),
  .onInfoContainer: TanreiColorValue(red: 0.7725, green: 0.9059, blue: 1, opacity: 1),
  .onPrimary: TanreiColorValue(red: 0, green: 0.0627, blue: 0.1765, opacity: 1),
  .onPrimaryContainer: TanreiColorValue(red: 0.8471, green: 0.8863, blue: 1, opacity: 1),
  .onSecondary: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .onSecondaryContainer: TanreiColorValue(red: 0.6118, green: 0.7333, blue: 1, opacity: 1),
  .onSuccess: TanreiColorValue(red: 0, green: 0.0824, blue: 0.0118, opacity: 1),
  .onSuccessContainer: TanreiColorValue(red: 0.4784, green: 0.9922, blue: 0.5412, opacity: 1),
  .onSurface: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSurfaceVariant: TanreiColorValue(red: 0.7647, green: 0.7529, blue: 0.7608, opacity: 1),
  .onWarning: TanreiColorValue(red: 0.1098, green: 0.051, blue: 0, opacity: 1),
  .onWarningContainer: TanreiColorValue(red: 1, green: 0.8667, blue: 0.7294, opacity: 1),
  .outline: TanreiColorValue(red: 0.6235, green: 0.6157, blue: 0.6235, opacity: 1),
  .outlineVariant: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 0.24),
  .primary: TanreiColorValue(red: 0.5412, green: 0.6902, blue: 1, opacity: 1),
  .primaryContainer: TanreiColorValue(red: 0, green: 0.2235, blue: 0.4941, opacity: 1),
  .scrim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.4),
  .secondary: TanreiColorValue(red: 0.7647, green: 0.7529, blue: 0.7608, opacity: 1),
  .secondaryContainer: TanreiColorValue(red: 0.1804, green: 0.1804, blue: 0.1843, opacity: 1),
  .shadow: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .success: TanreiColorValue(red: 0.2667, green: 0.7882, blue: 0.3647, opacity: 1),
  .successContainer: TanreiColorValue(red: 0, green: 0.2745, blue: 0.0824, opacity: 1),
  .surface: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .surfaceBright: TanreiColorValue(red: 0.1647, green: 0.1647, blue: 0.1686, opacity: 1),
  .surfaceContainer: TanreiColorValue(red: 0.1647, green: 0.1647, blue: 0.1686, opacity: 1),
  .surfaceContainerHigh: TanreiColorValue(red: 0.2157, green: 0.2157, blue: 0.2196, opacity: 1),
  .surfaceContainerHighest: TanreiColorValue(red: 0.2588, green: 0.2588, blue: 0.2627, opacity: 1),
  .surfaceContainerLow: TanreiColorValue(red: 0.1137, green: 0.1137, blue: 0.1216, opacity: 1),
  .surfaceContainerLowest: TanreiColorValue(red: 0.1137, green: 0.1137, blue: 0.1216, opacity: 1),
  .surfaceDim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .surfaceVariant: TanreiColorValue(red: 0.1647, green: 0.1647, blue: 0.1686, opacity: 1),
  .warning: TanreiColorValue(red: 0.9686, green: 0.6118, blue: 0.0588, opacity: 1),
  .warningContainer: TanreiColorValue(red: 0.3412, green: 0.2, blue: 0, opacity: 1),
])

private let cupertinoDarkHighColors = TanreiColors(scheme: .darkHigh, values: [
  .elevationRing: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .elevationShadow1: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.3),
  .elevationShadow2: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.4),
  .elevationShadow3: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.5),
  .error: TanreiColorValue(red: 1, green: 0.8118, blue: 0.7843, opacity: 1),
  .errorContainer: TanreiColorValue(red: 0.4941, green: 0, blue: 0.0118, opacity: 1),
  .focusRing: TanreiColorValue(red: 0.7961, green: 0.8549, blue: 1, opacity: 1),
  .focusRingInner: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0),
  .info: TanreiColorValue(red: 0.6941, green: 0.8784, blue: 1, opacity: 1),
  .infoContainer: TanreiColorValue(red: 0, green: 0.251, blue: 0.3529, opacity: 1),
  .inverseLink: TanreiColorValue(red: 0, green: 0.2471, blue: 0.5451, opacity: 1),
  .inverseOnSurface: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .inversePrimary: TanreiColorValue(red: 0, green: 0.2471, blue: 0.5451, opacity: 1),
  .inverseSurface: TanreiColorValue(red: 0.9176, green: 0.9059, blue: 0.9137, opacity: 1),
  .link: TanreiColorValue(red: 0.7961, green: 0.8549, blue: 1, opacity: 1),
  .onError: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .onErrorContainer: TanreiColorValue(red: 1, green: 0.9569, blue: 0.949, opacity: 1),
  .onInfo: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .onInfoContainer: TanreiColorValue(red: 0.9373, green: 0.9686, blue: 1, opacity: 1),
  .onPrimary: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .onPrimaryContainer: TanreiColorValue(red: 0.9608, green: 0.9647, blue: 1, opacity: 1),
  .onSecondary: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .onSecondaryContainer: TanreiColorValue(red: 0.8784, green: 0.9098, blue: 1, opacity: 1),
  .onSuccess: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .onSuccessContainer: TanreiColorValue(red: 0.8784, green: 1, blue: 0.8588, opacity: 1),
  .onSurface: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1),
  .onSurfaceVariant: TanreiColorValue(red: 0.8941, green: 0.8863, blue: 0.8902, opacity: 1),
  .onWarning: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .onWarningContainer: TanreiColorValue(red: 1, green: 0.9608, blue: 0.9294, opacity: 1),
  .outline: TanreiColorValue(red: 0.7843, green: 0.7765, blue: 0.7804, opacity: 1),
  .outlineVariant: TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 0.4),
  .primary: TanreiColorValue(red: 0.7961, green: 0.8549, blue: 1, opacity: 1),
  .primaryContainer: TanreiColorValue(red: 0, green: 0.2235, blue: 0.4941, opacity: 1),
  .scrim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 0.4),
  .secondary: TanreiColorValue(red: 0.8941, green: 0.8863, blue: 0.8902, opacity: 1),
  .secondaryContainer: TanreiColorValue(red: 0.2078, green: 0.2039, blue: 0.2118, opacity: 1),
  .shadow: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .success: TanreiColorValue(red: 0.4471, green: 0.9569, blue: 0.5098, opacity: 1),
  .successContainer: TanreiColorValue(red: 0, green: 0.2745, blue: 0.0824, opacity: 1),
  .surface: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .surfaceBright: TanreiColorValue(red: 0.1647, green: 0.1647, blue: 0.1686, opacity: 1),
  .surfaceContainer: TanreiColorValue(red: 0.1647, green: 0.1647, blue: 0.1686, opacity: 1),
  .surfaceContainerHigh: TanreiColorValue(red: 0.2157, green: 0.2157, blue: 0.2196, opacity: 1),
  .surfaceContainerHighest: TanreiColorValue(red: 0.2588, green: 0.2588, blue: 0.2627, opacity: 1),
  .surfaceContainerLow: TanreiColorValue(red: 0.1137, green: 0.1137, blue: 0.1216, opacity: 1),
  .surfaceContainerLowest: TanreiColorValue(red: 0.1137, green: 0.1137, blue: 0.1216, opacity: 1),
  .surfaceDim: TanreiColorValue(red: 0, green: 0, blue: 0, opacity: 1),
  .surfaceVariant: TanreiColorValue(red: 0.1647, green: 0.1647, blue: 0.1686, opacity: 1),
  .warning: TanreiColorValue(red: 1, green: 0.8235, blue: 0.6392, opacity: 1),
  .warningContainer: TanreiColorValue(red: 0.3412, green: 0.2, blue: 0, opacity: 1),
])

private let cupertinoAccordionTokens = TanreiAccordionTokens(
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
  outlineShape: 10,
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
        containerColor: .none,
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        chevronColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiAccordionVariantStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        chevronColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiAccordionVariantStateTokens(
        containerColor: .none,
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
        containerColor: .none,
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        chevronColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiAccordionVariantStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        chevronColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiAccordionVariantStateTokens(
        containerColor: .none,
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
      labelTypescale: cupertinoTypescale.heading5,
      supportingTextTypescale: cupertinoTypescale.body,
      trailingTextTypescale: cupertinoTypescale.body,
      iconSize: 24,
      chevronSize: 24,
      contentPaddingBlockEnd: 16
    ),
    compact: TanreiAccordionDensityTokens(
      containerHeight: 48,
      containerPaddingBlock: 12,
      containerPaddingInline: 12,
      labelTypescale: cupertinoTypescale.label,
      supportingTextTypescale: cupertinoTypescale.bodySmall,
      trailingTextTypescale: cupertinoTypescale.bodySmall,
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
    opacity: 0.7
  ),
  disabled: TanreiAccordionStateTokens(
    opacity: 1
  )
)

private let cupertinoAppBarTokens = TanreiAppBarTokens(
  actionsGap: 8,
  containerGap: 8,
  containerPaddingBlockEnd: 12,
  containerPaddingInline: 8,
  motionConditionDuration: 200,
  motionConditionEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineWidth: 1,
  subtitleColor: .role(.onSurfaceVariant),
  titleColor: .role(.onSurface),
  titleInset: 16,
  sizes: TanreiAppBarSizes(
    small: TanreiAppBarSizeTokens(
      containerHeight: 44,
      titleTypescale: cupertinoTypescale.heading4,
      subtitleTypescale: cupertinoTypescale.bodySmall
    ),
    large: TanreiAppBarSizeTokens(
      containerHeight: 96,
      titleTypescale: cupertinoTypescale.display,
      subtitleTypescale: cupertinoTypescale.body
    )
  ),
  conditions: TanreiAppBarConditions(
    flat: TanreiAppBarConditionTokens(
      containerColor: .none,
      containerElevation: cupertinoElevation.level0,
      outlineColor: .none
    ),
    scrolled: TanreiAppBarConditionTokens(
      containerColor: .role(.surfaceContainerLow),
      containerElevation: cupertinoElevation.level0,
      outlineColor: .role(.outlineVariant)
    )
  )
)

private let cupertinoAppShellTokens = TanreiAppShellTokens(
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
  skipLinkContainerElevation: cupertinoElevation.level3,
  skipLinkContainerPaddingBlock: 12,
  skipLinkContainerPaddingInline: 16,
  skipLinkContainerShape: 8,
  skipLinkLabelTypescale: cupertinoTypescale.label,
  skipLinkOffset: 8
)

private let cupertinoAvatarTokens = TanreiAvatarTokens(
  containerColor: .role(.surfaceContainerHighest),
  groupOutlineColor: .role(.surface),
  groupOutlineWidth: 2,
  iconColor: .role(.onSurfaceVariant),
  labelColor: .role(.onSurfaceVariant),
  sizes: TanreiAvatarSizes(
    small: TanreiAvatarSizeTokens(
      containerSize: 24,
      labelTypescale: cupertinoTypescale.caption,
      iconSize: 16,
      groupOverlap: 2
    ),
    medium: TanreiAvatarSizeTokens(
      containerSize: 40,
      labelTypescale: cupertinoTypescale.label,
      iconSize: 24,
      groupOverlap: 4
    ),
    large: TanreiAvatarSizeTokens(
      containerSize: 56,
      labelTypescale: cupertinoTypescale.heading3,
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

private let cupertinoBadgeTokens = TanreiBadgeTokens(
  containerColor: .role(.error),
  containerHeight: 18,
  containerOffset: 0,
  containerPaddingInline: 6,
  containerShape: 9999,
  dotOffset: 2,
  dotSize: 6,
  labelColor: .role(.onError),
  labelTypescale: cupertinoTypescale.labelSmall,
  outlineColor: .none,
  outlineWidth: 2
)

private let cupertinoBottomSheetTokens = TanreiBottomSheetTokens(
  containerColor: .role(.surfaceContainerLowest),
  containerElevation: cupertinoElevation.level2,
  containerMarginBlockStart: 48,
  containerMaxWidth: 640,
  containerPadding: 16,
  containerPartialFraction: 0.5,
  containerShape: 10,
  contentColor: .role(.onSurface),
  handleContainerHeight: 16,
  handleContainerShape: 9999,
  handleContainerWidth: 48,
  handleGripHeight: 5,
  handleGripShape: 9999,
  handleGripWidth: 36,
  handleMarginBlock: 0,
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
        containerColor: .none,
        gripColor: .role(.outline),
        stateLayerColor: .role(.outline)
      ),
      focused: TanreiBottomSheetControlStateTokens(
        containerColor: .none,
        gripColor: .role(.outline),
        stateLayerColor: .role(.outline)
      ),
      pressed: TanreiBottomSheetControlStateTokens(
        containerColor: .none,
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
    opacity: 0.7
  )
)

private let cupertinoBreadcrumbsTokens = TanreiBreadcrumbsTokens(
  containerGap: 4,
  containerShape: 4,
  iconSize: 16,
  labelColor: .role(.onSurfaceVariant),
  labelTypescale: cupertinoTypescale.body,
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
        containerColor: .none,
        contentColor: .role(.link),
        stateLayerColor: .role(.link)
      ),
      focused: TanreiBreadcrumbsPartStateTokens(
        containerColor: .none,
        contentColor: .role(.link),
        stateLayerColor: .role(.link)
      ),
      pressed: TanreiBreadcrumbsPartStateTokens(
        containerColor: .none,
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
        containerColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiBreadcrumbsPartStateTokens(
        containerColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiBreadcrumbsPartStateTokens(
        containerColor: .none,
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
        containerColor: .none,
        contentColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiBreadcrumbsPartStateTokens(
        containerColor: .none,
        contentColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiBreadcrumbsPartStateTokens(
        containerColor: .none,
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
    opacity: 0.7
  )
)

private let cupertinoButtonGroupTokens = TanreiButtonGroupTokens(
  connectedDividerColor: .role(.outline),
  connectedDividerInset: 8,
  connectedDividerOnFillColor: .role(.outline),
  connectedDividerThickness: 1,
  connectedGap: 2,
  connectedHorizontalOuterInset: 0,
  connectedHorizontalOuterShape: 9999,
  connectedInnerShape: 8,
  connectedSeparation: 0,
  connectedVerticalOuterShape: 14,
  standardGap: 8
)

private let cupertinoButtonWithMenuTokens = TanreiButtonWithMenuTokens(
  containerInnerGap: 2,
  containerInnerShape: 8,
  containerInnerShapeOpen: 8,
  containerOuterInset: 0,
  containerSeparation: 0,
  containerShape: 10,
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
      containerHeight: 28,
      containerPaddingBlock: 4,
      containerGap: 8,
      leadingPaddingInlineStart: 10,
      leadingPaddingInlineStartWithIcon: 10,
      leadingPaddingInlineEnd: 10,
      trailingPaddingInline: 6,
      trailingPaddingInlineNarrow: 4,
      labelTypescale: cupertinoTypescaleBodySubhead,
      iconSize: 16,
      outlineWidth: 1
    ),
    medium: TanreiButtonWithMenuSizeTokens(
      containerHeight: 34,
      containerPaddingBlock: 6,
      containerGap: 8,
      leadingPaddingInlineStart: 12,
      leadingPaddingInlineStartWithIcon: 12,
      leadingPaddingInlineEnd: 12,
      trailingPaddingInline: 6,
      trailingPaddingInlineNarrow: 4,
      labelTypescale: cupertinoTypescale.label,
      iconSize: 16,
      outlineWidth: 1
    ),
    large: TanreiButtonWithMenuSizeTokens(
      containerHeight: 50,
      containerPaddingBlock: 6,
      containerGap: 8,
      leadingPaddingInlineStart: 20,
      leadingPaddingInlineStartWithIcon: 20,
      leadingPaddingInlineEnd: 20,
      trailingPaddingInline: 8,
      trailingPaddingInlineNarrow: 12,
      labelTypescale: cupertinoTypescale.label,
      iconSize: 16,
      outlineWidth: 1
    )
  ),
  variants: TanreiButtonWithMenuVariants(
    filled: TanreiButtonWithMenuVariantTokens(
      enabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .role(.primary),
        containerElevation: cupertinoElevation.level0,
        labelColor: .role(.onPrimary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.onPrimary)
      ),
      hovered: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .role(.primary),
        containerElevation: cupertinoElevation.level0,
        labelColor: .role(.onPrimary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.onPrimary)
      ),
      focused: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .role(.primary),
        containerElevation: cupertinoElevation.level0,
        labelColor: .role(.onPrimary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.onPrimary)
      ),
      pressed: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .role(.primary),
        containerElevation: cupertinoElevation.level0,
        labelColor: .role(.onPrimary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.onPrimary)
      ),
      disabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: cupertinoElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        dividerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    tonal: TanreiButtonWithMenuVariantTokens(
      enabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .role(.secondaryContainer),
        containerElevation: cupertinoElevation.level0,
        labelColor: .role(.primary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.primary)
      ),
      hovered: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .role(.secondaryContainer),
        containerElevation: cupertinoElevation.level0,
        labelColor: .role(.primary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.primary)
      ),
      focused: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .role(.secondaryContainer),
        containerElevation: cupertinoElevation.level0,
        labelColor: .role(.primary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.primary)
      ),
      pressed: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .role(.secondaryContainer),
        containerElevation: cupertinoElevation.level0,
        labelColor: .role(.primary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.primary)
      ),
      disabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: cupertinoElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        dividerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    elevated: TanreiButtonWithMenuVariantTokens(
      enabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: cupertinoElevation.level2,
        labelColor: .role(.primary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.primary)
      ),
      hovered: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: cupertinoElevation.level2,
        labelColor: .role(.primary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.primary)
      ),
      focused: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: cupertinoElevation.level2,
        labelColor: .role(.primary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.primary)
      ),
      pressed: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: cupertinoElevation.level2,
        labelColor: .role(.primary),
        outlineColor: .none,
        dividerColor: .role(.outline),
        stateLayerColor: .role(.primary)
      ),
      disabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: cupertinoElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        dividerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    outlined: TanreiButtonWithMenuVariantTokens(
      enabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .none,
        containerElevation: cupertinoElevation.level0,
        labelColor: .role(.primary),
        outlineColor: .role(.outline),
        dividerColor: .role(.outline),
        stateLayerColor: .role(.primary)
      ),
      hovered: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .none,
        containerElevation: cupertinoElevation.level0,
        labelColor: .role(.primary),
        outlineColor: .role(.outline),
        dividerColor: .role(.outline),
        stateLayerColor: .role(.primary)
      ),
      focused: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .none,
        containerElevation: cupertinoElevation.level0,
        labelColor: .role(.primary),
        outlineColor: .role(.outline),
        dividerColor: .role(.outline),
        stateLayerColor: .role(.primary)
      ),
      pressed: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .none,
        containerElevation: cupertinoElevation.level0,
        labelColor: .role(.primary),
        outlineColor: .role(.outline),
        dividerColor: .role(.outline),
        stateLayerColor: .role(.primary)
      ),
      disabled: TanreiButtonWithMenuVariantStateTokens(
        containerColor: .none,
        containerElevation: cupertinoElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .alpha(of: .role(.onSurface), amount: 0.12),
        dividerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiButtonWithMenuStateTokens(
    containerShape: 10,
    opacity: 1
  ),
  focused: TanreiButtonWithMenuStateTokens(
    containerShape: 10,
    opacity: 1
  ),
  pressed: TanreiButtonWithMenuStateTokens(
    containerShape: 10,
    opacity: 0.7
  ),
  disabled: TanreiButtonWithMenuStateTokens(
    containerShape: 10,
    opacity: 1
  )
)

private let cupertinoButtonTokens = TanreiButtonTokens(
  busyIndicatorThickness: 2,
  containerShape: 9999,
  motionBusyCycleDuration: 1000,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  sizes: TanreiButtonSizes(
    small: TanreiButtonSizeTokens(
      containerHeight: 28,
      containerPaddingInlineNarrow: 6,
      containerWidthWide: 40,
      containerPaddingInlineStart: 10,
      containerPaddingInlineEnd: 10,
      containerPaddingInlineStartWithIcon: 10,
      containerPaddingInlineEndWithIcon: 10,
      containerPaddingBlock: 4,
      labelTypescale: cupertinoTypescaleBodySubhead,
      iconSize: 16,
      iconSizeWithoutLabel: 16,
      containerGap: 8,
      outlineWidth: 1
    ),
    medium: TanreiButtonSizeTokens(
      containerHeight: 34,
      containerPaddingInlineNarrow: 6,
      containerWidthWide: 52,
      containerPaddingInlineStart: 12,
      containerPaddingInlineEnd: 12,
      containerPaddingInlineStartWithIcon: 12,
      containerPaddingInlineEndWithIcon: 12,
      containerPaddingBlock: 6,
      labelTypescale: cupertinoTypescale.label,
      iconSize: 16,
      iconSizeWithoutLabel: 20,
      containerGap: 8,
      outlineWidth: 1
    ),
    large: TanreiButtonSizeTokens(
      containerHeight: 50,
      containerPaddingInlineNarrow: 16,
      containerWidthWide: 72,
      containerPaddingInlineStart: 20,
      containerPaddingInlineEnd: 20,
      containerPaddingInlineStartWithIcon: 20,
      containerPaddingInlineEndWithIcon: 20,
      containerPaddingBlock: 6,
      labelTypescale: cupertinoTypescale.label,
      iconSize: 16,
      iconSizeWithoutLabel: 16,
      containerGap: 8,
      outlineWidth: 1
    )
  ),
  variants: TanreiButtonVariants(
    filled: TanreiButtonVariantTokens(
      enabled: TanreiButtonVariantStateTokens(
        containerColor: .role(.primary),
        labelColor: .role(.onPrimary),
        iconColor: .role(.onPrimary),
        outlineColor: .none,
        stateLayerColor: .role(.onPrimary),
        containerElevation: cupertinoElevation.level0,
        unselectedContainerColor: .role(.surfaceContainerHighest),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .role(.primary),
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary)
      ),
      hovered: TanreiButtonVariantStateTokens(
        containerColor: .role(.primary),
        labelColor: .role(.onPrimary),
        iconColor: .role(.onPrimary),
        outlineColor: .none,
        stateLayerColor: .role(.onPrimary),
        containerElevation: cupertinoElevation.level0,
        unselectedContainerColor: .role(.surfaceContainerHighest),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .role(.primary),
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary)
      ),
      focused: TanreiButtonVariantStateTokens(
        containerColor: .role(.primary),
        labelColor: .role(.onPrimary),
        iconColor: .role(.onPrimary),
        outlineColor: .none,
        stateLayerColor: .role(.onPrimary),
        containerElevation: cupertinoElevation.level0,
        unselectedContainerColor: .role(.surfaceContainerHighest),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .role(.primary),
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary)
      ),
      pressed: TanreiButtonVariantStateTokens(
        containerColor: .role(.primary),
        labelColor: .role(.onPrimary),
        iconColor: .role(.onPrimary),
        outlineColor: .none,
        stateLayerColor: .role(.onPrimary),
        containerElevation: cupertinoElevation.level0,
        unselectedContainerColor: .role(.surfaceContainerHighest),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .role(.primary),
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary)
      ),
      disabled: TanreiButtonVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        containerElevation: cupertinoElevation.level0,
        unselectedContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        unselectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        unselectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        selectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    tonal: TanreiButtonVariantTokens(
      enabled: TanreiButtonVariantStateTokens(
        containerColor: .role(.secondaryContainer),
        labelColor: .role(.primary),
        iconColor: .role(.primary),
        outlineColor: .none,
        stateLayerColor: .role(.primary),
        containerElevation: cupertinoElevation.level0,
        unselectedContainerColor: .role(.surfaceContainerHighest),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .role(.secondary),
        selectedLabelColor: .role(.onSecondary),
        selectedIconColor: .role(.onSecondary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onSecondary)
      ),
      hovered: TanreiButtonVariantStateTokens(
        containerColor: .role(.secondaryContainer),
        labelColor: .role(.primary),
        iconColor: .role(.primary),
        outlineColor: .none,
        stateLayerColor: .role(.primary),
        containerElevation: cupertinoElevation.level0,
        unselectedContainerColor: .role(.surfaceContainerHighest),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .role(.secondary),
        selectedLabelColor: .role(.onSecondary),
        selectedIconColor: .role(.onSecondary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onSecondary)
      ),
      focused: TanreiButtonVariantStateTokens(
        containerColor: .role(.secondaryContainer),
        labelColor: .role(.primary),
        iconColor: .role(.primary),
        outlineColor: .none,
        stateLayerColor: .role(.primary),
        containerElevation: cupertinoElevation.level0,
        unselectedContainerColor: .role(.surfaceContainerHighest),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .role(.secondary),
        selectedLabelColor: .role(.onSecondary),
        selectedIconColor: .role(.onSecondary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onSecondary)
      ),
      pressed: TanreiButtonVariantStateTokens(
        containerColor: .role(.secondaryContainer),
        labelColor: .role(.primary),
        iconColor: .role(.primary),
        outlineColor: .none,
        stateLayerColor: .role(.primary),
        containerElevation: cupertinoElevation.level0,
        unselectedContainerColor: .role(.surfaceContainerHighest),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .role(.secondary),
        selectedLabelColor: .role(.onSecondary),
        selectedIconColor: .role(.onSecondary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onSecondary)
      ),
      disabled: TanreiButtonVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        containerElevation: cupertinoElevation.level0,
        unselectedContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        unselectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        unselectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        selectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    elevated: TanreiButtonVariantTokens(
      enabled: TanreiButtonVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        labelColor: .role(.primary),
        iconColor: .role(.primary),
        outlineColor: .none,
        stateLayerColor: .role(.primary),
        containerElevation: cupertinoElevation.level2,
        unselectedContainerColor: .role(.surfaceContainerLowest),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .role(.primary),
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary)
      ),
      hovered: TanreiButtonVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        labelColor: .role(.primary),
        iconColor: .role(.primary),
        outlineColor: .none,
        stateLayerColor: .role(.primary),
        containerElevation: cupertinoElevation.level2,
        unselectedContainerColor: .role(.surfaceContainerLowest),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .role(.primary),
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary)
      ),
      focused: TanreiButtonVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        labelColor: .role(.primary),
        iconColor: .role(.primary),
        outlineColor: .none,
        stateLayerColor: .role(.primary),
        containerElevation: cupertinoElevation.level2,
        unselectedContainerColor: .role(.surfaceContainerLowest),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .role(.primary),
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary)
      ),
      pressed: TanreiButtonVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        labelColor: .role(.primary),
        iconColor: .role(.primary),
        outlineColor: .none,
        stateLayerColor: .role(.primary),
        containerElevation: cupertinoElevation.level2,
        unselectedContainerColor: .role(.surfaceContainerLowest),
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .role(.primary),
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary)
      ),
      disabled: TanreiButtonVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        containerElevation: cupertinoElevation.level0,
        unselectedContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        unselectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        unselectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        selectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    outlined: TanreiButtonVariantTokens(
      enabled: TanreiButtonVariantStateTokens(
        containerColor: .none,
        labelColor: .role(.primary),
        iconColor: .role(.primary),
        outlineColor: .role(.outline),
        stateLayerColor: .role(.primary),
        containerElevation: cupertinoElevation.level0,
        unselectedContainerColor: .none,
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .role(.outline),
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .role(.inverseSurface),
        selectedLabelColor: .role(.inverseOnSurface),
        selectedIconColor: .role(.inverseOnSurface),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.inverseOnSurface)
      ),
      hovered: TanreiButtonVariantStateTokens(
        containerColor: .none,
        labelColor: .role(.primary),
        iconColor: .role(.primary),
        outlineColor: .role(.outline),
        stateLayerColor: .role(.primary),
        containerElevation: cupertinoElevation.level0,
        unselectedContainerColor: .none,
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .role(.outline),
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .role(.inverseSurface),
        selectedLabelColor: .role(.inverseOnSurface),
        selectedIconColor: .role(.inverseOnSurface),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.inverseOnSurface)
      ),
      focused: TanreiButtonVariantStateTokens(
        containerColor: .none,
        labelColor: .role(.primary),
        iconColor: .role(.primary),
        outlineColor: .role(.outline),
        stateLayerColor: .role(.primary),
        containerElevation: cupertinoElevation.level0,
        unselectedContainerColor: .none,
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .role(.outline),
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .role(.inverseSurface),
        selectedLabelColor: .role(.inverseOnSurface),
        selectedIconColor: .role(.inverseOnSurface),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.inverseOnSurface)
      ),
      pressed: TanreiButtonVariantStateTokens(
        containerColor: .none,
        labelColor: .role(.primary),
        iconColor: .role(.primary),
        outlineColor: .role(.outline),
        stateLayerColor: .role(.primary),
        containerElevation: cupertinoElevation.level0,
        unselectedContainerColor: .none,
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .role(.outline),
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .role(.inverseSurface),
        selectedLabelColor: .role(.inverseOnSurface),
        selectedIconColor: .role(.inverseOnSurface),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.inverseOnSurface)
      ),
      disabled: TanreiButtonVariantStateTokens(
        containerColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .alpha(of: .role(.onSurface), amount: 0.12),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        containerElevation: cupertinoElevation.level0,
        unselectedContainerColor: .none,
        unselectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        unselectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        unselectedOutlineColor: .alpha(of: .role(.onSurface), amount: 0.12),
        unselectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        selectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    text: TanreiButtonVariantTokens(
      enabled: TanreiButtonVariantStateTokens(
        containerColor: .none,
        labelColor: .role(.primary),
        iconColor: .role(.primary),
        outlineColor: .none,
        stateLayerColor: .role(.primary),
        containerElevation: cupertinoElevation.level0,
        unselectedContainerColor: .none,
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .none,
        selectedLabelColor: .role(.onSurface),
        selectedIconColor: .role(.primary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiButtonVariantStateTokens(
        containerColor: .none,
        labelColor: .role(.primary),
        iconColor: .role(.primary),
        outlineColor: .none,
        stateLayerColor: .role(.primary),
        containerElevation: cupertinoElevation.level0,
        unselectedContainerColor: .none,
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .none,
        selectedLabelColor: .role(.onSurface),
        selectedIconColor: .role(.primary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiButtonVariantStateTokens(
        containerColor: .none,
        labelColor: .role(.primary),
        iconColor: .role(.primary),
        outlineColor: .none,
        stateLayerColor: .role(.primary),
        containerElevation: cupertinoElevation.level0,
        unselectedContainerColor: .none,
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .none,
        selectedLabelColor: .role(.onSurface),
        selectedIconColor: .role(.primary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiButtonVariantStateTokens(
        containerColor: .none,
        labelColor: .role(.primary),
        iconColor: .role(.primary),
        outlineColor: .none,
        stateLayerColor: .role(.primary),
        containerElevation: cupertinoElevation.level0,
        unselectedContainerColor: .none,
        unselectedLabelColor: .role(.onSurfaceVariant),
        unselectedIconColor: .role(.onSurfaceVariant),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .role(.onSurfaceVariant),
        selectedContainerColor: .none,
        selectedLabelColor: .role(.onSurface),
        selectedIconColor: .role(.primary),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiButtonVariantStateTokens(
        containerColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        containerElevation: cupertinoElevation.level0,
        unselectedContainerColor: .none,
        unselectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        unselectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        unselectedOutlineColor: .none,
        unselectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedContainerColor: .none,
        selectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedOutlineColor: .none,
        selectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
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
    opacity: 0.7
  ),
  disabled: TanreiButtonStateTokens(
    containerShape: 9999,
    opacity: 1
  )
)

private let cupertinoCalendarTokens = TanreiCalendarTokens(
  cellSize: 48,
  dayContainerShape: 9999,
  dayContainerSize: 40,
  dayLabelTypescale: cupertinoTypescale.body,
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
  viewToggleLabelTypescale: cupertinoTypescale.heading5,
  weekdayColor: .role(.onSurfaceVariant),
  weekdayTypescale: cupertinoTypescale.labelSmall,
  yearContainerHeight: 36,
  yearContainerShape: 9999,
  yearContainerWidth: 72,
  yearLabelTypescale: cupertinoTypescale.body,
  conditions: TanreiCalendarConditions(
    unselected: TanreiCalendarConditionTokens(
      enabled: TanreiCalendarConditionStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiCalendarConditionStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiCalendarConditionStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiCalendarConditionStateTokens(
        containerColor: .none,
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
        containerColor: .none,
        labelColor: .role(.onSurfaceVariant),
        outlineColor: .none,
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiCalendarConditionStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurfaceVariant),
        outlineColor: .none,
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiCalendarConditionStateTokens(
        containerColor: .none,
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
        outlineColor: .none,
        stateLayerColor: .role(.primary)
      ),
      hovered: TanreiCalendarConditionStateTokens(
        containerColor: .none,
        labelColor: .role(.primary),
        outlineColor: .none,
        stateLayerColor: .role(.primary)
      ),
      focused: TanreiCalendarConditionStateTokens(
        containerColor: .none,
        labelColor: .role(.primary),
        outlineColor: .none,
        stateLayerColor: .role(.primary)
      ),
      pressed: TanreiCalendarConditionStateTokens(
        containerColor: .none,
        labelColor: .role(.primary),
        outlineColor: .none,
        stateLayerColor: .role(.primary)
      ),
      disabled: TanreiCalendarConditionStateTokens(
        containerColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        outlineColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    selected: TanreiCalendarConditionTokens(
      enabled: TanreiCalendarConditionStateTokens(
        containerColor: .role(.primaryContainer),
        labelColor: .role(.onPrimaryContainer),
        outlineColor: .none,
        stateLayerColor: .role(.onPrimaryContainer)
      ),
      hovered: TanreiCalendarConditionStateTokens(
        containerColor: .role(.primaryContainer),
        labelColor: .role(.onPrimaryContainer),
        outlineColor: .none,
        stateLayerColor: .role(.onPrimaryContainer)
      ),
      focused: TanreiCalendarConditionStateTokens(
        containerColor: .role(.primaryContainer),
        labelColor: .role(.onPrimaryContainer),
        outlineColor: .none,
        stateLayerColor: .role(.onPrimaryContainer)
      ),
      pressed: TanreiCalendarConditionStateTokens(
        containerColor: .role(.primaryContainer),
        labelColor: .role(.onPrimaryContainer),
        outlineColor: .none,
        stateLayerColor: .role(.onPrimaryContainer)
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
        containerColor: .role(.surfaceContainerHighest),
        labelColor: .role(.onSurface),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiCalendarConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        labelColor: .role(.onSurface),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiCalendarConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        labelColor: .role(.onSurface),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiCalendarConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        labelColor: .role(.onSurface),
        outlineColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiCalendarConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
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
    opacity: 0.7
  ),
  disabled: TanreiCalendarStateTokens(
    opacity: 1
  )
)

private let cupertinoCalloutTokens = TanreiCalloutTokens(
  actionsGap: 12,
  actionsItemGap: 8,
  containerGap: 8,
  containerPaddingBlock: 12,
  containerPaddingInline: 16,
  containerPaddingInlineEndWithClose: 8,
  containerShape: 10,
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
      focused: TanreiCalloutControlStateTokens(
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
      pressed: TanreiCalloutControlStateTokens(
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
      )
    )
  ),
  sizes: TanreiCalloutSizes(
    medium: TanreiCalloutSizeTokens(
      titleTypescale: cupertinoTypescale.heading6,
      bodyTypescale: cupertinoTypescale.body
    ),
    large: TanreiCalloutSizeTokens(
      titleTypescale: cupertinoTypescale.heading5,
      bodyTypescale: cupertinoTypescale.bodyLarge
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
    opacity: 0.7
  )
)

private let cupertinoCardTokens = TanreiCardTokens(
  containerPadding: 16,
  containerShape: 10,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineWidth: 1,
  variants: TanreiCardVariants(
    elevated: TanreiCardVariantTokens(
      enabled: TanreiCardVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: cupertinoElevation.level1,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiCardVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: cupertinoElevation.level1,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiCardVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: cupertinoElevation.level1,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiCardVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: cupertinoElevation.level1,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiCardVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: cupertinoElevation.level1,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    filled: TanreiCardVariantTokens(
      enabled: TanreiCardVariantStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: cupertinoElevation.level0,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiCardVariantStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: cupertinoElevation.level0,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiCardVariantStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: cupertinoElevation.level0,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiCardVariantStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: cupertinoElevation.level0,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiCardVariantStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: cupertinoElevation.level0,
        outlineColor: .none,
        contentColor: .role(.onSurface),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    outlined: TanreiCardVariantTokens(
      enabled: TanreiCardVariantStateTokens(
        containerColor: .role(.surface),
        containerElevation: cupertinoElevation.level0,
        outlineColor: .role(.outlineVariant),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiCardVariantStateTokens(
        containerColor: .role(.surface),
        containerElevation: cupertinoElevation.level0,
        outlineColor: .role(.outlineVariant),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiCardVariantStateTokens(
        containerColor: .role(.surface),
        containerElevation: cupertinoElevation.level0,
        outlineColor: .role(.outlineVariant),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiCardVariantStateTokens(
        containerColor: .role(.surface),
        containerElevation: cupertinoElevation.level0,
        outlineColor: .role(.outlineVariant),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiCardVariantStateTokens(
        containerColor: .role(.surface),
        containerElevation: cupertinoElevation.level0,
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
    opacity: 0.7
  ),
  disabled: TanreiCardStateTokens(
    opacity: 0.38
  )
)

private let cupertinoCarouselTokens = TanreiCarouselTokens(
  autoplayInterval: 5000,
  containerLargeWidth: 200,
  containerMinScale: 0.85,
  containerShape: 14,
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
  parts: TanreiCarouselParts(
    item: TanreiCarouselPartTokens(
      enabled: TanreiCarouselPartStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiCarouselPartStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiCarouselPartStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        contentColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiCarouselPartStateTokens(
        containerColor: .role(.surfaceContainerHighest),
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
        containerColor: .none,
        contentColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiCarouselPartStateTokens(
        containerColor: .none,
        contentColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiCarouselPartStateTokens(
        containerColor: .none,
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
        containerColor: .none,
        contentColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      focused: TanreiCarouselPartStateTokens(
        containerColor: .none,
        contentColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      pressed: TanreiCarouselPartStateTokens(
        containerColor: .none,
        contentColor: .role(.primary),
        stateLayerColor: .role(.primary)
      )
    )
  ),
  hovered: TanreiCarouselStateTokens(
    containerShape: 14,
    opacity: 1
  ),
  focused: TanreiCarouselStateTokens(
    containerShape: 14,
    opacity: 1
  ),
  pressed: TanreiCarouselStateTokens(
    containerShape: 14,
    opacity: 0.7
  )
)

private let cupertinoChatComposerTokens = TanreiChatComposerTokens(
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
  counterTypescale: cupertinoTypescale.labelSmall,
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
        containerElevation: cupertinoElevation.level0,
        outlineColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiChatComposerConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: cupertinoElevation.level0,
        outlineColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiChatComposerConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: cupertinoElevation.level0,
        outlineColor: .role(.focusRing),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiChatComposerConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: cupertinoElevation.level0,
        outlineColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    error: TanreiChatComposerConditionTokens(
      enabled: TanreiChatComposerConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: cupertinoElevation.level0,
        outlineColor: .role(.error),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiChatComposerConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: cupertinoElevation.level0,
        outlineColor: .role(.error),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiChatComposerConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: cupertinoElevation.level0,
        outlineColor: .role(.error),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiChatComposerConditionStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        containerElevation: cupertinoElevation.level0,
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

private let cupertinoCheckboxTokens = TanreiCheckboxTokens(
  boxShape: 4,
  boxSize: 16,
  containerShape: 9999,
  containerSize: 28,
  labelGap: 4,
  labelTypescale: cupertinoTypescale.body,
  markSize: 16,
  markWeight: 300,
  markWidth: 2,
  motionFeedbackDuration: 450,
  motionMarkEnterScale: 0.5,
  motionMarkScaleDuration: 350,
  motionMarkScaleEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  motionSelectionDuration: 150,
  motionSelectionEasing: TanreiCubicBezier(0.31, 0.94, 0.34, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineWidth: 1,
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
        containerColor: .none,
        boxColor: .none,
        markColor: .none,
        outlineColor: .role(.outline),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.outline)
      ),
      focused: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
        boxColor: .none,
        markColor: .none,
        outlineColor: .role(.outline),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.outline)
      ),
      pressed: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
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
        containerColor: .none,
        boxColor: .role(.primary),
        markColor: .role(.onPrimary),
        outlineColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      focused: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
        boxColor: .role(.primary),
        markColor: .role(.onPrimary),
        outlineColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      pressed: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
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
        containerColor: .none,
        boxColor: .role(.primary),
        markColor: .role(.onPrimary),
        outlineColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      focused: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
        boxColor: .role(.primary),
        markColor: .role(.onPrimary),
        outlineColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      pressed: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
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
        containerColor: .none,
        boxColor: .none,
        markColor: .none,
        outlineColor: .role(.error),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      focused: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
        boxColor: .none,
        markColor: .none,
        outlineColor: .role(.error),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      pressed: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
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
        containerColor: .none,
        boxColor: .role(.error),
        markColor: .role(.onError),
        outlineColor: .role(.error),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      focused: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
        boxColor: .role(.error),
        markColor: .role(.onError),
        outlineColor: .role(.error),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      pressed: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
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
        containerColor: .none,
        boxColor: .role(.error),
        markColor: .role(.onError),
        outlineColor: .role(.error),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      focused: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
        boxColor: .role(.error),
        markColor: .role(.onError),
        outlineColor: .role(.error),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      pressed: TanreiCheckboxConditionStateTokens(
        containerColor: .none,
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
    opacity: 0.7
  ),
  disabled: TanreiCheckboxStateTokens(
    containerShape: 9999,
    opacity: 1
  )
)

private let cupertinoChipTokens = TanreiChipTokens(
  avatarShape: 9999,
  checkWeight: 300,
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
      containerPaddingInlineWithRemove: 6,
      containerPaddingBlock: 2,
      containerGap: 4,
      labelTypescale: cupertinoTypescale.caption,
      iconSize: 16,
      avatarSize: 16,
      removeContainerSize: 20
    ),
    medium: TanreiChipSizeTokens(
      containerHeight: 32,
      containerPaddingInline: 12,
      containerPaddingInlineWithIcon: 8,
      containerPaddingInlineWithAvatar: 4,
      containerPaddingInlineWithRemove: 8,
      containerPaddingBlock: 4,
      containerGap: 8,
      labelTypescale: cupertinoTypescale.label,
      iconSize: 16,
      avatarSize: 24,
      removeContainerSize: 24
    )
  ),
  variants: TanreiChipVariants(
    outlined: TanreiChipVariantTokens(
      enabled: TanreiChipVariantStateTokens(
        containerColor: .none,
        containerElevation: cupertinoElevation.level0,
        outlineColor: .role(.outline),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        removeContainerColor: .none,
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .none,
        destructiveRemoveIconColor: .role(.onSurfaceVariant),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .role(.primary),
        selectedContainerElevation: cupertinoElevation.level0,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedStateLayerColor: .role(.onPrimary)
      ),
      hovered: TanreiChipVariantStateTokens(
        containerColor: .none,
        containerElevation: cupertinoElevation.level0,
        outlineColor: .role(.outline),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        removeContainerColor: .none,
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .none,
        destructiveRemoveIconColor: .role(.error),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .role(.primary),
        selectedContainerElevation: cupertinoElevation.level0,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedStateLayerColor: .role(.onPrimary)
      ),
      focused: TanreiChipVariantStateTokens(
        containerColor: .none,
        containerElevation: cupertinoElevation.level0,
        outlineColor: .role(.outline),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        removeContainerColor: .none,
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .none,
        destructiveRemoveIconColor: .role(.error),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .role(.primary),
        selectedContainerElevation: cupertinoElevation.level0,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedStateLayerColor: .role(.onPrimary)
      ),
      pressed: TanreiChipVariantStateTokens(
        containerColor: .none,
        containerElevation: cupertinoElevation.level0,
        outlineColor: .role(.outline),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        removeContainerColor: .none,
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .none,
        destructiveRemoveIconColor: .role(.error),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .role(.primary),
        selectedContainerElevation: cupertinoElevation.level0,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedStateLayerColor: .role(.onPrimary)
      ),
      disabled: TanreiChipVariantStateTokens(
        containerColor: .none,
        containerElevation: cupertinoElevation.level0,
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
        selectedContainerElevation: cupertinoElevation.level0,
        selectedOutlineColor: .none,
        selectedLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        selectedStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    elevated: TanreiChipVariantTokens(
      enabled: TanreiChipVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: cupertinoElevation.level1,
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
        selectedContainerColor: .role(.primary),
        selectedContainerElevation: cupertinoElevation.level1,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedStateLayerColor: .role(.onPrimary)
      ),
      hovered: TanreiChipVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: cupertinoElevation.level1,
        outlineColor: .none,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        removeContainerColor: .none,
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .none,
        destructiveRemoveIconColor: .role(.error),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .role(.primary),
        selectedContainerElevation: cupertinoElevation.level1,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedStateLayerColor: .role(.onPrimary)
      ),
      focused: TanreiChipVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: cupertinoElevation.level1,
        outlineColor: .none,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        removeContainerColor: .none,
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .none,
        destructiveRemoveIconColor: .role(.error),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .role(.primary),
        selectedContainerElevation: cupertinoElevation.level1,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedStateLayerColor: .role(.onPrimary)
      ),
      pressed: TanreiChipVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: cupertinoElevation.level1,
        outlineColor: .none,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        removeContainerColor: .none,
        removeIconColor: .role(.onSurfaceVariant),
        removeStateLayerColor: .role(.onSurfaceVariant),
        destructiveRemoveContainerColor: .none,
        destructiveRemoveIconColor: .role(.error),
        destructiveRemoveStateLayerColor: .role(.error),
        selectedContainerColor: .role(.primary),
        selectedContainerElevation: cupertinoElevation.level1,
        selectedOutlineColor: .none,
        selectedLabelColor: .role(.onPrimary),
        selectedIconColor: .role(.onPrimary),
        selectedStateLayerColor: .role(.onPrimary)
      ),
      disabled: TanreiChipVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: cupertinoElevation.level0,
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
        selectedContainerElevation: cupertinoElevation.level0,
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
    opacity: 0.7
  ),
  disabled: TanreiChipStateTokens(
    opacity: 1
  )
)

private let cupertinoCodeBlockTokens = TanreiCodeBlockTokens(
  codeColor: .role(.onSurface),
  codeTabSize: 2,
  containerShape: 8,
  copyButtonInset: 6,
  headerGap: 8,
  headerPaddingBlockEnd: 4,
  languageColor: .role(.onSurfaceVariant),
  languageTypescale: cupertinoTypescale.labelSmall,
  lineNumberColor: .role(.onSurfaceVariant),
  lineNumberGap: 16,
  lineAddedContainerColor: .none,
  lineAddedMarkColor: .role(.success),
  lineHighlightedContainerColor: .role(.surfaceContainerHighest),
  lineHighlightedMarkColor: .role(.primary),
  lineMarkWidth: 2,
  lineRemovedContainerColor: .none,
  lineRemovedMarkColor: .role(.error),
  outlineColor: .role(.outlineVariant),
  outlineWidth: 1,
  promptColor: .role(.onSurfaceVariant),
  syntaxMaxLength: 50000,
  titleColor: .role(.onSurface),
  titleTypescale: cupertinoTypescale.labelSmall,
  sizes: TanreiCodeBlockSizes(
    small: TanreiCodeBlockSizeTokens(
      codeTypescale: cupertinoTypescale.codeSmall,
      containerPaddingBlock: 8,
      containerPaddingInline: 12
    ),
    medium: TanreiCodeBlockSizeTokens(
      codeTypescale: cupertinoTypescale.code,
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
      syntaxEmphasis: 200
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

private let cupertinoColorInputTokens = TanreiColorInputTokens(
  swatchOutlineColor: .role(.outlineVariant),
  swatchOutlineWidth: 1,
  swatchShape: 4
)

private let cupertinoComboboxTokens = TanreiComboboxTokens(
  containerActionGap: 4,
  dividerColor: .role(.surfaceContainerHigh),
  dividerSpace: 0,
  dividerThickness: 8,
  groupTitleColor: .role(.onSurfaceVariant),
  groupTitlePaddingInline: 12,
  groupTitleTypescale: cupertinoTypescale.labelSmall,
  groupGap: 16,
  listColor: .role(.surfaceContainerLowest),
  listElevation: cupertinoElevation.level2,
  listMaxHeight: 320,
  listOffset: 4,
  listPaddingBlock: 4,
  listPaddingInline: 4,
  listShape: 20,
  listViewportMargin: 8,
  motionCloseDuration: 100,
  motionCloseEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  motionFeedbackDuration: 450,
  motionOpenDuration: 200,
  motionOpenEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  optionGap: 12,
  optionHeight: 44,
  optionLabelTypescale: cupertinoTypescale.bodyLarge,
  optionLeadingIconSize: 16,
  optionMarkSize: 16,
  optionMatchEmphasis: 200,
  optionPaddingBlock: 8,
  optionPaddingInline: 12,
  optionShape: 8,
  optionSupportingTextTypescale: cupertinoTypescale.bodySmall,
  separation: 0,
  statusColor: .role(.onSurfaceVariant),
  statusErrorColor: .role(.error),
  statusTypescale: cupertinoTypescale.bodySmall,
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
      focused: TanreiComboboxVariantStateTokens(
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
      pressed: TanreiComboboxVariantStateTokens(
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
      focused: TanreiComboboxVariantStateTokens(
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
      pressed: TanreiComboboxVariantStateTokens(
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
      focused: TanreiComboboxVariantStateTokens(
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
      pressed: TanreiComboboxVariantStateTokens(
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
  hovered: TanreiComboboxStateTokens(
    opacity: 1
  ),
  focused: TanreiComboboxStateTokens(
    opacity: 1
  ),
  pressed: TanreiComboboxStateTokens(
    opacity: 0.7
  ),
  disabled: TanreiComboboxStateTokens(
    opacity: 1
  )
)

private let cupertinoCopyButtonTokens = TanreiCopyButtonTokens(
  confirmationDuration: 2000,
  motionResizeDuration: 500,
  motionResizeEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1)
)

private let cupertinoDateTimePickerTokens = TanreiDateTimePickerTokens(
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
  dialLabelTypescale: cupertinoTypescale.bodyLarge,
  dialPadding: 8,
  dialSelectedLabelColor: .role(.onPrimary),
  dialTrackColor: .role(.primary),
  dialTrackWidth: 2,
  dividerColor: .role(.outlineVariant),
  dividerWidth: 1,
  dockedContainerColor: .role(.surfaceBright),
  dockedContainerElevation: cupertinoElevation.level2,
  dockedContainerShape: 10,
  dockedMotionCloseDuration: 100,
  dockedMotionCloseEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  dockedMotionOpenDuration: 200,
  dockedMotionOpenEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  dockedOffset: 4,
  dockedViewportMargin: 8,
  errorColor: .role(.error),
  errorTypescale: cupertinoTypescale.bodySmall,
  headerGap: 4,
  headerLabelColor: .role(.onSurfaceVariant),
  headerLabelTypescale: cupertinoTypescale.label,
  headerPaddingBlock: 16,
  headerPaddingInlineEnd: 12,
  headerPaddingInlineStart: 24,
  headerPlaceholderColor: .role(.onSurfaceVariant),
  headerValueColor: .role(.onSurface),
  headerValueTypescale: cupertinoTypescale.heading2,
  modalContainerColor: .role(.surfaceBright),
  modalContainerElevation: cupertinoElevation.level3,
  modalContainerMargin: 16,
  modalContainerShape: 14,
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
  periodLabelTypescale: cupertinoTypescale.heading3,
  rangeFieldContainerHeight: 48,
  rangeFieldContainerPaddingInline: 16,
  rangeFieldGap: 8,
  rangeFieldLabelTypescale: cupertinoTypescale.heading5,
  selectorContainerHeight: 80,
  selectorContainerShape: 10,
  selectorContainerWidth: 96,
  selectorGap: 4,
  selectorLabelTypescale: cupertinoTypescale.display,
  separatorColor: .role(.onSurface),
  separatorTypescale: cupertinoTypescale.display,
  timeEntryModes: 1,
  wheelGap: 4,
  wheelHeight: 240,
  wheelLabelColor: .role(.onSurfaceVariant),
  wheelLabelTypescale: cupertinoTypescale.heading3,
  wheelRowHeight: 48,
  wheelSelectedLabelColor: .role(.onSurface),
  wheelSelectionContainerColor: .role(.surfaceContainerHighest),
  wheelSelectionContainerShape: 10,
  wheelSelectionSpan: 1,
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
        selectorContainerColor: .role(.surfaceContainerHighest),
        selectorLabelColor: .role(.onSurface),
        selectorOutlineColor: .none,
        selectorOutlineWidth: 1,
        selectorStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiDateTimePickerConditionStateTokens(
        selectorContainerColor: .role(.surfaceContainerHighest),
        selectorLabelColor: .role(.onSurface),
        selectorOutlineColor: .none,
        selectorOutlineWidth: 1,
        selectorStateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiDateTimePickerConditionStateTokens(
        selectorContainerColor: .role(.surfaceContainerHighest),
        selectorLabelColor: .role(.onSurface),
        selectorOutlineColor: .none,
        selectorOutlineWidth: 1,
        selectorStateLayerColor: .role(.onSurface)
      )
    ),
    selected: TanreiDateTimePickerConditionTokens(
      enabled: TanreiDateTimePickerConditionStateTokens(
        selectorContainerColor: .role(.surfaceContainerHighest),
        selectorLabelColor: .role(.onSurface),
        selectorOutlineColor: .role(.primary),
        selectorOutlineWidth: 2,
        selectorStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiDateTimePickerConditionStateTokens(
        selectorContainerColor: .role(.surfaceContainerHighest),
        selectorLabelColor: .role(.onSurface),
        selectorOutlineColor: .role(.primary),
        selectorOutlineWidth: 2,
        selectorStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiDateTimePickerConditionStateTokens(
        selectorContainerColor: .role(.surfaceContainerHighest),
        selectorLabelColor: .role(.onSurface),
        selectorOutlineColor: .role(.primary),
        selectorOutlineWidth: 2,
        selectorStateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiDateTimePickerConditionStateTokens(
        selectorContainerColor: .role(.surfaceContainerHighest),
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
    opacity: 0.7
  )
)

private let cupertinoDescriptionListTokens = TanreiDescriptionListTokens(
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
      termTypescale: cupertinoTypescale.label,
      valueTypescale: cupertinoTypescale.body,
      statValueTypescale: cupertinoTypescale.heading1
    ),
    compact: TanreiDescriptionListDensityTokens(
      factGap: 6,
      termGap: 8,
      termTypescale: cupertinoTypescale.labelSmall,
      valueTypescale: cupertinoTypescale.bodySmall,
      statValueTypescale: cupertinoTypescale.heading3
    )
  )
)

private let cupertinoDialogTokens = TanreiDialogTokens(
  actionsArrangement: 0,
  actionsGap: 8,
  actionsMarginBlockStart: 24,
  actionsVariant: 4,
  compactWindowWidth: 0,
  containerColor: .role(.surfaceContainerHigh),
  containerElevation: cupertinoElevation.level3,
  containerGap: 16,
  containerMargin: 16,
  containerMaxWidth: 270,
  containerMinWidth: 270,
  containerPadding: 24,
  containerShape: 14,
  contentColor: .role(.onSurface),
  dividerColor: .role(.outlineVariant),
  dividerWidth: 1,
  headerGap: 12,
  headlineColor: .role(.onSurface),
  headlineTypescale: cupertinoTypescale.heading5,
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
  supportingTextColor: .role(.onSurface),
  supportingTextTypescale: cupertinoTypescale.body
)

private let cupertinoDividerTokens = TanreiDividerTokens(
  lineColor: .role(.outlineVariant),
  lineDashGap: 4,
  lineDashLength: 4,
  lineDotGap: 2,
  lineInset: 16,
  lineThickness: 1,
  lineWaveAmplitude: 2,
  lineWaveWavelength: 16
)

private let cupertinoDropZoneTokens = TanreiDropZoneTokens(
  iconColor: .role(.primary),
  iconSize: 32,
  labelColor: .role(.onSurface),
  labelTypescale: cupertinoTypescale.bodyLarge,
  motionDuration: 150,
  motionEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineColor: .role(.primary),
  outlineWidth: 2,
  panelContainerColor: .role(.surfaceContainerHigh),
  panelElevation: cupertinoElevation.level2,
  panelGap: 12,
  panelMargin: 16,
  panelMaxWidth: 360,
  panelPaddingBlock: 24,
  panelPaddingInline: 24,
  panelShape: 14,
  refusingIconColor: .role(.error),
  refusingOutlineColor: .role(.error),
  scrimColor: .role(.scrim)
)

private let cupertinoEmbeddedTextInputTokens = TanreiEmbeddedTextInputTokens(
  inputTypescale: cupertinoTypescale.bodyLarge,
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

private let cupertinoEmptyStateTokens = TanreiEmptyStateTokens(
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
      titleTypescale: cupertinoTypescale.heading5,
      descriptionTypescale: cupertinoTypescale.body
    ),
    large: TanreiEmptyStateSizeTokens(
      containerPaddingBlock: 64,
      mediaSize: 48,
      titleTypescale: cupertinoTypescale.heading3,
      descriptionTypescale: cupertinoTypescale.bodyLarge
    )
  )
)

private let cupertinoFabMenuTokens = TanreiFabMenuTokens(
  containerShapeOpen: 9999,
  itemGap: 8,
  itemHeight: 48,
  itemIconSize: 20,
  itemLabelTypescale: cupertinoTypescale.bodyLarge,
  itemPaddingInlineEnd: 20,
  itemPaddingInlineStart: 16,
  itemShape: 9999,
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
      containerShape: 9999,
      iconSize: 20
    ),
    medium: TanreiFabMenuSizeTokens(
      containerSize: 48,
      containerShape: 9999,
      iconSize: 24
    ),
    large: TanreiFabMenuSizeTokens(
      containerSize: 64,
      containerShape: 9999,
      iconSize: 24
    )
  ),
  variants: TanreiFabMenuVariants(
    filled: TanreiFabMenuVariantTokens(
      enabled: TanreiFabMenuVariantStateTokens(
        containerColor: .role(.primary),
        containerElevation: cupertinoElevation.level3,
        iconColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary),
        openContainerColor: .role(.secondaryContainer),
        openContainerElevation: cupertinoElevation.level3,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .role(.primary),
        itemContainerElevation: cupertinoElevation.level2,
        itemLabelColor: .role(.onPrimary),
        itemIconColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      hovered: TanreiFabMenuVariantStateTokens(
        containerColor: .role(.primary),
        containerElevation: cupertinoElevation.level3,
        iconColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary),
        openContainerColor: .role(.secondaryContainer),
        openContainerElevation: cupertinoElevation.level3,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .role(.primary),
        itemContainerElevation: cupertinoElevation.level2,
        itemLabelColor: .role(.onPrimary),
        itemIconColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      focused: TanreiFabMenuVariantStateTokens(
        containerColor: .role(.primary),
        containerElevation: cupertinoElevation.level3,
        iconColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary),
        openContainerColor: .role(.secondaryContainer),
        openContainerElevation: cupertinoElevation.level3,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .role(.primary),
        itemContainerElevation: cupertinoElevation.level2,
        itemLabelColor: .role(.onPrimary),
        itemIconColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      pressed: TanreiFabMenuVariantStateTokens(
        containerColor: .role(.primary),
        containerElevation: cupertinoElevation.level3,
        iconColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary),
        openContainerColor: .role(.secondaryContainer),
        openContainerElevation: cupertinoElevation.level3,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .role(.primary),
        itemContainerElevation: cupertinoElevation.level2,
        itemLabelColor: .role(.onPrimary),
        itemIconColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      disabled: TanreiFabMenuVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: cupertinoElevation.level0,
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        openContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        openContainerElevation: cupertinoElevation.level0,
        openIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        openStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        itemContainerElevation: cupertinoElevation.level0,
        itemLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    tonal: TanreiFabMenuVariantTokens(
      enabled: TanreiFabMenuVariantStateTokens(
        containerColor: .role(.secondaryContainer),
        containerElevation: cupertinoElevation.level3,
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer),
        openContainerColor: .role(.primary),
        openContainerElevation: cupertinoElevation.level3,
        openIconColor: .role(.onPrimary),
        openStateLayerColor: .role(.onPrimary),
        itemContainerColor: .role(.secondaryContainer),
        itemContainerElevation: cupertinoElevation.level2,
        itemLabelColor: .role(.onSecondaryContainer),
        itemIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiFabMenuVariantStateTokens(
        containerColor: .role(.secondaryContainer),
        containerElevation: cupertinoElevation.level3,
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer),
        openContainerColor: .role(.primary),
        openContainerElevation: cupertinoElevation.level3,
        openIconColor: .role(.onPrimary),
        openStateLayerColor: .role(.onPrimary),
        itemContainerColor: .role(.secondaryContainer),
        itemContainerElevation: cupertinoElevation.level2,
        itemLabelColor: .role(.onSecondaryContainer),
        itemIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiFabMenuVariantStateTokens(
        containerColor: .role(.secondaryContainer),
        containerElevation: cupertinoElevation.level3,
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer),
        openContainerColor: .role(.primary),
        openContainerElevation: cupertinoElevation.level3,
        openIconColor: .role(.onPrimary),
        openStateLayerColor: .role(.onPrimary),
        itemContainerColor: .role(.secondaryContainer),
        itemContainerElevation: cupertinoElevation.level2,
        itemLabelColor: .role(.onSecondaryContainer),
        itemIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiFabMenuVariantStateTokens(
        containerColor: .role(.secondaryContainer),
        containerElevation: cupertinoElevation.level3,
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer),
        openContainerColor: .role(.primary),
        openContainerElevation: cupertinoElevation.level3,
        openIconColor: .role(.onPrimary),
        openStateLayerColor: .role(.onPrimary),
        itemContainerColor: .role(.secondaryContainer),
        itemContainerElevation: cupertinoElevation.level2,
        itemLabelColor: .role(.onSecondaryContainer),
        itemIconColor: .role(.onSecondaryContainer),
        itemStateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiFabMenuVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: cupertinoElevation.level0,
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        openContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        openContainerElevation: cupertinoElevation.level0,
        openIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        openStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        itemContainerElevation: cupertinoElevation.level0,
        itemLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    surface: TanreiFabMenuVariantTokens(
      enabled: TanreiFabMenuVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: cupertinoElevation.level3,
        iconColor: .role(.primary),
        stateLayerColor: .role(.primary),
        openContainerColor: .role(.secondaryContainer),
        openContainerElevation: cupertinoElevation.level3,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .role(.surfaceContainerLowest),
        itemContainerElevation: cupertinoElevation.level2,
        itemLabelColor: .role(.onSurface),
        itemIconColor: .role(.primary),
        itemStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiFabMenuVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: cupertinoElevation.level3,
        iconColor: .role(.primary),
        stateLayerColor: .role(.primary),
        openContainerColor: .role(.secondaryContainer),
        openContainerElevation: cupertinoElevation.level3,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .role(.surfaceContainerLowest),
        itemContainerElevation: cupertinoElevation.level2,
        itemLabelColor: .role(.onSurface),
        itemIconColor: .role(.primary),
        itemStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiFabMenuVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: cupertinoElevation.level3,
        iconColor: .role(.primary),
        stateLayerColor: .role(.primary),
        openContainerColor: .role(.secondaryContainer),
        openContainerElevation: cupertinoElevation.level3,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .role(.surfaceContainerLowest),
        itemContainerElevation: cupertinoElevation.level2,
        itemLabelColor: .role(.onSurface),
        itemIconColor: .role(.primary),
        itemStateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiFabMenuVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: cupertinoElevation.level3,
        iconColor: .role(.primary),
        stateLayerColor: .role(.primary),
        openContainerColor: .role(.secondaryContainer),
        openContainerElevation: cupertinoElevation.level3,
        openIconColor: .role(.onSecondaryContainer),
        openStateLayerColor: .role(.onSecondaryContainer),
        itemContainerColor: .role(.surfaceContainerLowest),
        itemContainerElevation: cupertinoElevation.level2,
        itemLabelColor: .role(.onSurface),
        itemIconColor: .role(.primary),
        itemStateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiFabMenuVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: cupertinoElevation.level0,
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        openContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        openContainerElevation: cupertinoElevation.level0,
        openIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        openStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemContainerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        itemContainerElevation: cupertinoElevation.level0,
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
    opacity: 0.7
  ),
  disabled: TanreiFabMenuStateTokens(
    opacity: 1
  )
)

private let cupertinoFieldGroupTokens = TanreiFieldGroupTokens(
  errorTextGap: 4,
  fieldMinWidth: 144,
  gapInline: 16,
  labelGap: 8,
  labelTypescale: cupertinoTypescale.bodyLarge,
  requirementAsteriskGap: 2,
  requirementGap: 8,
  requirementMark: 2,
  supportingTextGap: 4,
  supportingTextTypescale: cupertinoTypescale.labelSmall,
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

private let cupertinoFieldTokens = TanreiFieldTokens(
  counterGap: 8,
  errorTextGap: 4,
  errorTextPlacement: 0,
  labelIconGap: 8,
  labelIconSize: 20,
  labelGap: 8,
  labelTypescale: cupertinoTypescale.bodyLarge,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  requirementAsteriskGap: 2,
  requirementGap: 8,
  requirementMark: 2,
  supportingTextGap: 4,
  supportingTextTypescale: cupertinoTypescale.labelSmall,
  valueTextGap: 16,
  valueTextTypescale: cupertinoTypescale.label,
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

private let cupertinoFigureTokens = TanreiFigureTokens(
  attachmentGap: 8,
  captionColor: .role(.onSurfaceVariant),
  captionGap: 8,
  captionTypescale: cupertinoTypescale.bodySmall,
  containerShape: 10,
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
  titleTypescale: cupertinoTypescale.heading6,
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

private let cupertinoFileItemTokens = TanreiFileItemTokens(
  actionGap: 16,
  actionIconSize: 20,
  actionShape: 9999,
  actionSize: 32,
  doneIconColor: .role(.success),
  errorIconColor: .role(.error),
  errorSupportingTextColor: .role(.error),
  headlineColor: .role(.onSurface),
  headlineTypescale: cupertinoTypescale.body,
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
  supportingTextTypescale: cupertinoTypescale.bodySmall,
  tileActionInset: 4,
  tileContainerGap: 6,
  tileContainerShape: 10,
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
        containerColor: .none,
        stateLayerColor: .role(.onSurface),
        actionContainerColor: .none,
        actionIconColor: .role(.onSurfaceVariant),
        actionStateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiFileItemFormStateTokens(
        containerColor: .none,
        stateLayerColor: .role(.onSurface),
        actionContainerColor: .none,
        actionIconColor: .role(.onSurfaceVariant),
        actionStateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiFileItemFormStateTokens(
        containerColor: .none,
        stateLayerColor: .role(.onSurface),
        actionContainerColor: .none,
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
        containerColor: .none,
        stateLayerColor: .role(.onSurface),
        actionContainerColor: .role(.surfaceContainerLowest),
        actionIconColor: .role(.onSurfaceVariant),
        actionStateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiFileItemFormStateTokens(
        containerColor: .none,
        stateLayerColor: .role(.onSurface),
        actionContainerColor: .role(.surfaceContainerLowest),
        actionIconColor: .role(.onSurfaceVariant),
        actionStateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiFileItemFormStateTokens(
        containerColor: .none,
        stateLayerColor: .role(.onSurface),
        actionContainerColor: .role(.surfaceContainerLowest),
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
    opacity: 0.7
  ),
  disabled: TanreiFileItemStateTokens(
    opacity: 1
  )
)

private let cupertinoFilePickerTokens = TanreiFilePickerTokens(
  containerGap: 12,
  containerPaddingBlock: 32,
  containerPaddingInline: 16,
  containerShape: 10,
  iconSize: 32,
  labelTypescale: cupertinoTypescale.body,
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
  selectionTextTypescale: cupertinoTypescale.body,
  supportingTextGap: 8,
  supportingTextTypescale: cupertinoTypescale.bodySmall,
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
        containerColor: .none,
        outlineColor: .role(.outline),
        iconColor: .role(.onSurfaceVariant),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        selectionTextColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        errorOutlineColor: .role(.error)
      ),
      focused: TanreiFilePickerConditionStateTokens(
        containerColor: .none,
        outlineColor: .role(.outline),
        iconColor: .role(.onSurfaceVariant),
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        selectionTextColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        errorOutlineColor: .role(.error)
      ),
      pressed: TanreiFilePickerConditionStateTokens(
        containerColor: .none,
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
    opacity: 0.7
  ),
  disabled: TanreiFilePickerStateTokens(
    opacity: 1
  )
)

private let cupertinoFileUploadTokens = TanreiFileUploadTokens(
  listGap: 16
)

private let cupertinoImagePreviewTokens = TanreiImagePreviewTokens(
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
  captionTypescale: cupertinoTypescale.body,
  containerColor: .role(.surface),
  countColor: .role(.onSurfaceVariant),
  countPaddingInline: 8,
  countTypescale: cupertinoTypescale.label,
  errorGap: 8,
  errorIconColor: .role(.onSurfaceVariant),
  errorIconSize: 32,
  errorTextColor: .role(.onSurfaceVariant),
  errorTextTypescale: cupertinoTypescale.body,
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

private let cupertinoInlineCodeTokens = TanreiInlineCodeTokens(
  containerColor: .role(.surfaceContainerHighest),
  containerPaddingInline: 4,
  containerShape: 4,
  labelColor: .role(.onSurface),
  labelScale: 0.9286,
  labelTypescale: cupertinoTypescale.code,
  outlineColor: .role(.outlineVariant),
  outlineWidth: 0
)

private let cupertinoInputBoxTokens = TanreiInputBoxTokens(
  activeIndicatorWidth: 1,
  affixGap: 2,
  containerShape: 10,
  containerShapeBottom: 10,
  motionLabelDuration: 150,
  motionLabelEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineNotchPadding: 4,
  outlineWidth: 1,
  requirementAsteriskGap: 2,
  selectionColor: .role(.primaryContainer),
  selectionContentColor: .role(.onSurface),
  sizes: TanreiInputBoxSizes(
    small: TanreiInputBoxSizeTokens(
      containerHeight: 34,
      containerPaddingInline: 12,
      containerPaddingInlineWithIcon: 8,
      containerPaddingBlock: 6,
      containerPaddingBlockWithLabel: 2,
      containerGap: 8,
      labelTypescale: cupertinoTypescale.bodyLarge,
      labelFloatedTypescale: cupertinoTypescale.labelSmall,
      inputTypescale: cupertinoTypescale.body,
      iconSize: 20
    ),
    medium: TanreiInputBoxSizeTokens(
      containerHeight: 34,
      containerPaddingInline: 12,
      containerPaddingInlineWithIcon: 8,
      containerPaddingBlock: 6,
      containerPaddingBlockWithLabel: 4,
      containerGap: 8,
      labelTypescale: cupertinoTypescale.bodyLarge,
      labelFloatedTypescale: cupertinoTypescale.labelSmall,
      inputTypescale: cupertinoTypescale.bodyLarge,
      iconSize: 20
    ),
    large: TanreiInputBoxSizeTokens(
      containerHeight: 44,
      containerPaddingInline: 16,
      containerPaddingInlineWithIcon: 12,
      containerPaddingBlock: 6,
      containerPaddingBlockWithLabel: 4,
      containerGap: 8,
      labelTypescale: cupertinoTypescale.bodyLarge,
      labelFloatedTypescale: cupertinoTypescale.labelSmall,
      inputTypescale: cupertinoTypescale.bodyLarge,
      iconSize: 24
    )
  ),
  variants: TanreiInputBoxVariants(
    stacked: TanreiInputBoxVariantTokens(
      enabled: TanreiInputBoxVariantStateTokens(
        containerColor: .role(.surfaceContainerHigh),
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
        errorContainerColor: .role(.surfaceContainerHigh),
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
        containerColor: .role(.surfaceContainerHigh),
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
        errorContainerColor: .role(.surfaceContainerHigh),
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
        containerColor: .role(.surfaceContainerHigh),
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
        errorContainerColor: .role(.surfaceContainerHigh),
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
        containerColor: .role(.surfaceContainerHigh),
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
        errorContainerColor: .role(.surfaceContainerHigh),
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
        containerColor: .role(.surfaceContainerHigh),
        activeIndicatorColor: .none,
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
        errorContainerColor: .role(.surfaceContainerHigh),
        errorActiveIndicatorColor: .none,
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
        containerColor: .role(.surfaceContainerHigh),
        activeIndicatorColor: .none,
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
        errorContainerColor: .role(.surfaceContainerHigh),
        errorActiveIndicatorColor: .none,
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
        containerColor: .role(.surfaceContainerHigh),
        activeIndicatorColor: .none,
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
        errorContainerColor: .role(.surfaceContainerHigh),
        errorActiveIndicatorColor: .none,
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
        containerColor: .role(.surfaceContainerHigh),
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
        errorContainerColor: .role(.surfaceContainerHigh),
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
    outlined: TanreiInputBoxVariantTokens(
      enabled: TanreiInputBoxVariantStateTokens(
        containerColor: .none,
        activeIndicatorColor: .none,
        outlineColor: .role(.outlineVariant),
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
        outlineColor: .role(.outlineVariant),
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
        outlineColor: .role(.outlineVariant),
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
    activeIndicatorWidth: 1,
    opacity: 1,
    outlineWidth: 1
  ),
  disabled: TanreiInputBoxStateTokens(
    activeIndicatorWidth: 1,
    opacity: 1,
    outlineWidth: 1
  )
)

private let cupertinoKeyboardShortcutTokens = TanreiKeyboardShortcutTokens(
  containerColor: .role(.surfaceContainerHigh),
  outlineBottomWidth: 2,
  outlineColor: .role(.outlineVariant),
  outlineWidth: 1,
  sizes: TanreiKeyboardShortcutSizes(
    small: TanreiKeyboardShortcutSizeTokens(
      containerHeight: 20,
      containerPaddingInline: 4,
      containerShape: 4,
      labelTypescale: cupertinoTypescale.labelSmall,
      chordGap: 2,
      sequenceGap: 8
    ),
    medium: TanreiKeyboardShortcutSizeTokens(
      containerHeight: 24,
      containerPaddingInline: 6,
      containerShape: 8,
      labelTypescale: cupertinoTypescale.label,
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

private let cupertinoLinkCardTokens = TanreiLinkCardTokens(
  containerPadding: 16,
  containerShape: 10,
  descriptionMaxLines: 2,
  descriptionTypescale: cupertinoTypescale.body,
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
  siteTypescale: cupertinoTypescale.bodySmall,
  titleGap: 4,
  titleMaxLines: 2,
  titleTypescale: cupertinoTypescale.heading5,
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
        containerColor: .role(.surface),
        outlineColor: .role(.outlineVariant),
        titleColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        siteColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiLinkCardVariantStateTokens(
        containerColor: .role(.surface),
        outlineColor: .role(.outlineVariant),
        titleColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        siteColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiLinkCardVariantStateTokens(
        containerColor: .role(.surface),
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
        containerColor: .role(.surfaceContainerHighest),
        outlineColor: .none,
        titleColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        siteColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiLinkCardVariantStateTokens(
        containerColor: .role(.surfaceContainerHighest),
        outlineColor: .none,
        titleColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        siteColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiLinkCardVariantStateTokens(
        containerColor: .role(.surfaceContainerHighest),
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
    opacity: 0.7
  )
)

private let cupertinoLinkTokens = TanreiLinkTokens(
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
        containerColor: .none,
        labelColor: .role(.link),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.link),
        currentContainerColor: .none,
        currentLabelColor: .role(.onSurface),
        currentIconColor: .role(.onSurface),
        currentStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiLinkVariantStateTokens(
        containerColor: .none,
        labelColor: .role(.link),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.link),
        currentContainerColor: .none,
        currentLabelColor: .role(.onSurface),
        currentIconColor: .role(.onSurface),
        currentStateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiLinkVariantStateTokens(
        containerColor: .none,
        labelColor: .role(.link),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.link),
        currentContainerColor: .none,
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
        containerColor: .none,
        labelColor: .role(.inverseLink),
        iconColor: .role(.inverseOnSurface),
        stateLayerColor: .role(.inverseLink),
        currentContainerColor: .none,
        currentLabelColor: .role(.inverseOnSurface),
        currentIconColor: .role(.inverseOnSurface),
        currentStateLayerColor: .role(.inverseOnSurface)
      ),
      focused: TanreiLinkVariantStateTokens(
        containerColor: .none,
        labelColor: .role(.inverseLink),
        iconColor: .role(.inverseOnSurface),
        stateLayerColor: .role(.inverseLink),
        currentContainerColor: .none,
        currentLabelColor: .role(.inverseOnSurface),
        currentIconColor: .role(.inverseOnSurface),
        currentStateLayerColor: .role(.inverseOnSurface)
      ),
      pressed: TanreiLinkVariantStateTokens(
        containerColor: .none,
        labelColor: .role(.inverseLink),
        iconColor: .role(.inverseOnSurface),
        stateLayerColor: .role(.inverseLink),
        currentContainerColor: .none,
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
    opacity: 0.7
  ),
  disabled: TanreiLinkStateTokens(
    containerShape: 4,
    opacity: 1
  )
)

private let cupertinoListTokens = TanreiListTokens(
  containerGap: 12,
  containerHeight: 44,
  containerPaddingBlock: 8,
  containerPaddingInlineEnd: 16,
  containerPaddingInlineStart: 16,
  containerShape: 0,
  contentTypescale: cupertinoTypescale.bodyLarge,
  dividerColor: .role(.outlineVariant),
  dividerThickness: 1,
  draggedContainerColor: .role(.surfaceContainerHigh),
  draggedContainerElevation: cupertinoElevation.level3,
  gapLarge: 24,
  gapMedium: 16,
  gapSmall: 12,
  markSize: 20,
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
        containerColor: .none,
        contentColor: .role(.onSurface),
        markColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiListConditionStateTokens(
        containerColor: .none,
        contentColor: .role(.onSurface),
        markColor: .none,
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiListConditionStateTokens(
        containerColor: .none,
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
        containerColor: .none,
        contentColor: .role(.onSurface),
        markColor: .role(.primary),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiListConditionStateTokens(
        containerColor: .none,
        contentColor: .role(.onSurface),
        markColor: .role(.primary),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiListConditionStateTokens(
        containerColor: .none,
        contentColor: .role(.onSurface),
        markColor: .role(.primary),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiListConditionStateTokens(
        containerColor: .none,
        contentColor: .role(.onSurface),
        markColor: .role(.primary),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiListConditionStateTokens(
        containerColor: .none,
        contentColor: .role(.onSurface),
        markColor: .role(.primary),
        stateLayerColor: .role(.onSurface)
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
    opacity: 0.7
  ),
  disabled: TanreiListStateTokens(
    containerShape: 0,
    opacity: 0.38
  )
)

private let cupertinoLoadingIndicatorTokens = TanreiLoadingIndicatorTokens(
  containedContainerColor: .role(.surfaceContainerLowest),
  containedContainerElevation: cupertinoElevation.level2,
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
      indicatorSize: 20,
      indicatorThickness: 2,
      containerSize: 32
    ),
    large: TanreiLoadingIndicatorSizeTokens(
      indicatorSize: 36,
      indicatorThickness: 2,
      containerSize: 48
    )
  )
)

private let cupertinoMainActionButtonTokens = TanreiMainActionButtonTokens(
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
      labelTypescale: cupertinoTypescale.label,
      iconSize: 20
    ),
    medium: TanreiMainActionButtonSizeTokens(
      containerHeight: 48,
      containerShape: 9999,
      containerPaddingInlineStart: 20,
      containerPaddingInlineEnd: 20,
      containerPaddingInlineStartWithIcon: 16,
      containerPaddingInlineEndWithIcon: 16,
      containerPaddingBlock: 6,
      containerGap: 8,
      labelTypescale: cupertinoTypescale.label,
      iconSize: 24
    ),
    large: TanreiMainActionButtonSizeTokens(
      containerHeight: 64,
      containerShape: 9999,
      containerPaddingInlineStart: 24,
      containerPaddingInlineEnd: 24,
      containerPaddingInlineStartWithIcon: 20,
      containerPaddingInlineEndWithIcon: 20,
      containerPaddingBlock: 6,
      containerGap: 12,
      labelTypescale: cupertinoTypescale.heading5,
      iconSize: 24
    )
  ),
  variants: TanreiMainActionButtonVariants(
    filled: TanreiMainActionButtonVariantTokens(
      enabled: TanreiMainActionButtonVariantStateTokens(
        containerColor: .role(.primary),
        containerElevation: cupertinoElevation.level3,
        labelColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary)
      ),
      hovered: TanreiMainActionButtonVariantStateTokens(
        containerColor: .role(.primary),
        containerElevation: cupertinoElevation.level3,
        labelColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary)
      ),
      focused: TanreiMainActionButtonVariantStateTokens(
        containerColor: .role(.primary),
        containerElevation: cupertinoElevation.level3,
        labelColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary)
      ),
      pressed: TanreiMainActionButtonVariantStateTokens(
        containerColor: .role(.primary),
        containerElevation: cupertinoElevation.level3,
        labelColor: .role(.onPrimary),
        stateLayerColor: .role(.onPrimary)
      ),
      disabled: TanreiMainActionButtonVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: cupertinoElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    tonal: TanreiMainActionButtonVariantTokens(
      enabled: TanreiMainActionButtonVariantStateTokens(
        containerColor: .role(.secondaryContainer),
        containerElevation: cupertinoElevation.level3,
        labelColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      hovered: TanreiMainActionButtonVariantStateTokens(
        containerColor: .role(.secondaryContainer),
        containerElevation: cupertinoElevation.level3,
        labelColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiMainActionButtonVariantStateTokens(
        containerColor: .role(.secondaryContainer),
        containerElevation: cupertinoElevation.level3,
        labelColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiMainActionButtonVariantStateTokens(
        containerColor: .role(.secondaryContainer),
        containerElevation: cupertinoElevation.level3,
        labelColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      disabled: TanreiMainActionButtonVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: cupertinoElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    surface: TanreiMainActionButtonVariantTokens(
      enabled: TanreiMainActionButtonVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: cupertinoElevation.level3,
        labelColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      hovered: TanreiMainActionButtonVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: cupertinoElevation.level3,
        labelColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      focused: TanreiMainActionButtonVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: cupertinoElevation.level3,
        labelColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      pressed: TanreiMainActionButtonVariantStateTokens(
        containerColor: .role(.surfaceContainerLowest),
        containerElevation: cupertinoElevation.level3,
        labelColor: .role(.primary),
        stateLayerColor: .role(.primary)
      ),
      disabled: TanreiMainActionButtonVariantStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.12),
        containerElevation: cupertinoElevation.level0,
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
    opacity: 0.7
  ),
  disabled: TanreiMainActionButtonStateTokens(
    opacity: 1
  )
)

private let cupertinoMenuTokens = TanreiMenuTokens(
  checkboxItemMark: 1,
  containerGap: 12,
  containerHeight: 44,
  containerPaddingBlock: 8,
  containerPaddingInline: 12,
  containerShape: 8,
  controlBoxShape: 2,
  controlBoxSize: 18,
  controlFillInset: 0,
  controlFillOpacity: 0.16,
  controlMarkSize: 20,
  controlMarkWeight: 300,
  controlOutlineWidth: 2,
  controlRingSelectedWidthShare: 0.5,
  controlRingSize: 20,
  controlRingWidth: 2,
  dividerColor: .role(.surfaceContainerHigh),
  dividerSpace: 0,
  dividerThickness: 8,
  groupTitleColor: .role(.onSurfaceVariant),
  groupTitlePaddingInline: 12,
  groupTitleTypescale: cupertinoTypescale.labelSmall,
  groupGap: 16,
  labelTypescale: cupertinoTypescale.bodyLarge,
  leadingIconSize: 16,
  markSize: 16,
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
  supportingTextTypescale: cupertinoTypescale.bodySmall,
  surfaceColor: .role(.surfaceContainerLowest),
  surfaceElevation: cupertinoElevation.level2,
  surfaceMaxWidth: 320,
  surfaceMinWidth: 160,
  surfaceOffset: 4,
  surfacePaddingBlock: 4,
  surfacePaddingInline: 4,
  surfaceShape: 20,
  surfaceViewportMargin: 8,
  trailingIconSize: 16,
  trailingTextTypescale: cupertinoTypescale.labelSmall,
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
      focused: TanreiMenuConditionStateTokens(
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
      pressed: TanreiMenuConditionStateTokens(
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
      focused: TanreiMenuConditionStateTokens(
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
      pressed: TanreiMenuConditionStateTokens(
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
      disabled: TanreiMenuConditionStateTokens(
        containerColor: .none,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        supportingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        trailingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        leadingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        trailingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        markColor: .alpha(of: .role(.onSurface), amount: 0.38),
        controlColor: .alpha(of: .role(.onSurface), amount: 0.38),
        controlMarkColor: .role(.surfaceContainerLowest),
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
      focused: TanreiMenuConditionStateTokens(
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
      pressed: TanreiMenuConditionStateTokens(
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
      focused: TanreiMenuConditionStateTokens(
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
      pressed: TanreiMenuConditionStateTokens(
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
      focused: TanreiMenuConditionStateTokens(
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
      pressed: TanreiMenuConditionStateTokens(
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
  hovered: TanreiMenuStateTokens(
    containerShape: 8,
    opacity: 1
  ),
  focused: TanreiMenuStateTokens(
    containerShape: 8,
    opacity: 1
  ),
  pressed: TanreiMenuStateTokens(
    containerShape: 8,
    opacity: 0.7
  ),
  disabled: TanreiMenuStateTokens(
    containerShape: 8,
    opacity: 1
  )
)

private let cupertinoMenubarTokens = TanreiMenubarTokens(
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
  labelTypescale: cupertinoTypescale.label,
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
        containerColor: .none,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiMenubarConditionStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiMenubarConditionStateTokens(
        containerColor: .none,
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
        containerColor: .alpha(of: .role(.onSecondaryContainer), amount: 0.16),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiMenubarConditionStateTokens(
        containerColor: .alpha(of: .role(.onSecondaryContainer), amount: 0.16),
        labelColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiMenubarConditionStateTokens(
        containerColor: .alpha(of: .role(.onSecondaryContainer), amount: 0.16),
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
        containerColor: .alpha(of: .role(.onSurface), amount: 0.1),
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiMenubarConditionStateTokens(
        containerColor: .alpha(of: .role(.onSurface), amount: 0.1),
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
    opacity: 0.7
  ),
  disabled: TanreiMenubarStateTokens(
    containerShape: 8,
    opacity: 1
  )
)

private let cupertinoModalLayerTokens = TanreiModalLayerTokens(
  motionEnterDuration: 300,
  motionEnterEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionExitDuration: 200,
  motionExitEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  scrimBlur: 0,
  scrimColor: .role(.scrim)
)

private let cupertinoNavigationBarTokens = TanreiNavigationBarTokens(
  containerColor: .role(.surfaceContainerLow),
  containerElevation: cupertinoElevation.level0,
  containerHeight: 49,
  containerPadding: 0,
  itemContainerHeight: 32,
  itemContainerPaddingBlock: 0,
  itemContainerPaddingInline: 0,
  itemContainerShape: 9999,
  itemContainerWidth: 56,
  itemGap: 2,
  itemIconIndicatorHeight: 32,
  itemIconIndicatorShape: 9999,
  itemIconIndicatorWidth: 24,
  itemIconSize: 24,
  itemLabelTypescale: cupertinoTypescale.caption,
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
        itemCoveredIconColor: .role(.onSurfaceVariant),
        itemCoveredLabelColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      hovered: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemCoveredIconColor: .role(.onSurfaceVariant),
        itemCoveredLabelColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemCoveredIconColor: .role(.onSurfaceVariant),
        itemCoveredLabelColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemCoveredIconColor: .role(.onSurfaceVariant),
        itemCoveredLabelColor: .role(.onSurfaceVariant),
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
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.primary),
        itemLabelColor: .role(.primary),
        itemCoveredIconColor: .role(.primary),
        itemCoveredLabelColor: .role(.primary),
        itemStateLayerColor: .role(.primary)
      ),
      hovered: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.primary),
        itemLabelColor: .role(.primary),
        itemCoveredIconColor: .role(.primary),
        itemCoveredLabelColor: .role(.primary),
        itemStateLayerColor: .role(.primary)
      ),
      focused: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.primary),
        itemLabelColor: .role(.primary),
        itemCoveredIconColor: .role(.primary),
        itemCoveredLabelColor: .role(.primary),
        itemStateLayerColor: .role(.primary)
      ),
      pressed: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.primary),
        itemLabelColor: .role(.primary),
        itemCoveredIconColor: .role(.primary),
        itemCoveredLabelColor: .role(.primary),
        itemStateLayerColor: .role(.primary)
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
    filledUnselected: TanreiNavigationBarConditionTokens(
      enabled: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemCoveredIconColor: .role(.onSurfaceVariant),
        itemCoveredLabelColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      hovered: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemCoveredIconColor: .role(.onSurfaceVariant),
        itemCoveredLabelColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemCoveredIconColor: .role(.onSurfaceVariant),
        itemCoveredLabelColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemCoveredIconColor: .role(.onSurfaceVariant),
        itemCoveredLabelColor: .role(.onSurfaceVariant),
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
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.primary),
        itemLabelColor: .role(.primary),
        itemCoveredIconColor: .role(.primary),
        itemCoveredLabelColor: .role(.primary),
        itemStateLayerColor: .role(.primary)
      ),
      hovered: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.primary),
        itemLabelColor: .role(.primary),
        itemCoveredIconColor: .role(.primary),
        itemCoveredLabelColor: .role(.primary),
        itemStateLayerColor: .role(.primary)
      ),
      focused: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.primary),
        itemLabelColor: .role(.primary),
        itemCoveredIconColor: .role(.primary),
        itemCoveredLabelColor: .role(.primary),
        itemStateLayerColor: .role(.primary)
      ),
      pressed: TanreiNavigationBarConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.primary),
        itemLabelColor: .role(.primary),
        itemCoveredIconColor: .role(.primary),
        itemCoveredLabelColor: .role(.primary),
        itemStateLayerColor: .role(.primary)
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
    )
  ),
  hovered: TanreiNavigationBarStateTokens(
    opacity: 1
  ),
  focused: TanreiNavigationBarStateTokens(
    opacity: 1
  ),
  pressed: TanreiNavigationBarStateTokens(
    opacity: 0.7
  ),
  disabled: TanreiNavigationBarStateTokens(
    opacity: 1
  )
)

private let cupertinoNavigationDrawerTokens = TanreiNavigationDrawerTokens(
  breakpointCollapsed: 600,
  breakpointExpanded: 1024,
  collapsedContainerWidth: 72,
  collapsedItemContainerPaddingBlock: 12,
  collapsedItemContainerPaddingInline: 4,
  collapsedItemContainerShape: 10,
  collapsedItemContainerWidth: 48,
  collapsedItemGap: 4,
  collapsedItemLabelTypescale: cupertinoTypescale.labelSmall,
  containerGap: 4,
  containerPaddingBlock: 12,
  containerPaddingInline: 12,
  containerWidth: 240,
  headerColor: .role(.onSurface),
  headerGap: 24,
  headerItemGap: 8,
  headerTypescale: cupertinoTypescale.heading5,
  headingColor: .role(.onSurfaceVariant),
  headingHeight: 36,
  headingTypescale: cupertinoTypescale.labelSmall,
  itemBadgeTypescale: cupertinoTypescale.labelSmall,
  itemContainerHeight: 48,
  itemContainerShape: 10,
  itemGap: 12,
  itemIconIndicatorHeight: 20,
  itemIconIndicatorShape: 9999,
  itemIconIndicatorWidth: 20,
  itemIconSize: 20,
  itemLabelTypescale: cupertinoTypescale.bodyLarge,
  itemNestIndent: 36,
  itemPaddingInline: 12,
  itemTrailingIconSize: 20,
  itemTrailingTextTypescale: cupertinoTypescale.bodySmall,
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
  variants: TanreiNavigationDrawerVariants(
    standard: TanreiNavigationDrawerVariantTokens(
      containerColor: .role(.surfaceContainerLow),
      containerElevation: cupertinoElevation.level0,
      containerShape: 0,
      outlineColor: .role(.outlineVariant)
    ),
    modal: TanreiNavigationDrawerVariantTokens(
      containerColor: .role(.surfaceContainerLow),
      containerElevation: cupertinoElevation.level2,
      containerShape: 14,
      outlineColor: .none
    )
  ),
  conditions: TanreiNavigationDrawerConditions(
    unselected: TanreiNavigationDrawerConditionTokens(
      enabled: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.primary),
        itemLabelColor: .role(.onSurface),
        itemTrailingTextColor: .role(.onSurfaceVariant),
        itemTrailingIconColor: .role(.onSurfaceVariant),
        itemBadgeColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.primary),
        itemLabelColor: .role(.onSurface),
        itemTrailingTextColor: .role(.onSurfaceVariant),
        itemTrailingIconColor: .role(.onSurfaceVariant),
        itemBadgeColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.primary),
        itemLabelColor: .role(.onSurface),
        itemTrailingTextColor: .role(.onSurfaceVariant),
        itemTrailingIconColor: .role(.onSurfaceVariant),
        itemBadgeColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.primary),
        itemLabelColor: .role(.onSurface),
        itemTrailingTextColor: .role(.onSurfaceVariant),
        itemTrailingIconColor: .role(.onSurfaceVariant),
        itemBadgeColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemTrailingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemTrailingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemBadgeColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    selected: TanreiNavigationDrawerConditionTokens(
      enabled: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .role(.primary),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onPrimary),
        itemLabelColor: .role(.onPrimary),
        itemTrailingTextColor: .role(.onPrimary),
        itemTrailingIconColor: .role(.onPrimary),
        itemBadgeColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      hovered: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .role(.primary),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onPrimary),
        itemLabelColor: .role(.onPrimary),
        itemTrailingTextColor: .role(.onPrimary),
        itemTrailingIconColor: .role(.onPrimary),
        itemBadgeColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      focused: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .role(.primary),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onPrimary),
        itemLabelColor: .role(.onPrimary),
        itemTrailingTextColor: .role(.onPrimary),
        itemTrailingIconColor: .role(.onPrimary),
        itemBadgeColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      pressed: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .role(.primary),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onPrimary),
        itemLabelColor: .role(.onPrimary),
        itemTrailingTextColor: .role(.onPrimary),
        itemTrailingIconColor: .role(.onPrimary),
        itemBadgeColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      disabled: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .role(.primary),
        itemIconIndicatorColor: .none,
        itemIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemTrailingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemTrailingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemBadgeColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    collapsedUnselected: TanreiNavigationDrawerConditionTokens(
      enabled: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.primary),
        itemLabelColor: .role(.onSurface),
        itemTrailingTextColor: .role(.onSurfaceVariant),
        itemTrailingIconColor: .role(.onSurfaceVariant),
        itemBadgeColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.primary)
      ),
      hovered: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.primary),
        itemLabelColor: .role(.onSurface),
        itemTrailingTextColor: .role(.onSurfaceVariant),
        itemTrailingIconColor: .role(.onSurfaceVariant),
        itemBadgeColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.primary)
      ),
      focused: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.primary),
        itemLabelColor: .role(.onSurface),
        itemTrailingTextColor: .role(.onSurfaceVariant),
        itemTrailingIconColor: .role(.onSurfaceVariant),
        itemBadgeColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.primary)
      ),
      pressed: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.primary),
        itemLabelColor: .role(.onSurface),
        itemTrailingTextColor: .role(.onSurfaceVariant),
        itemTrailingIconColor: .role(.onSurfaceVariant),
        itemBadgeColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.primary)
      ),
      disabled: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .none,
        itemIconIndicatorColor: .none,
        itemIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemTrailingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemTrailingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemBadgeColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    collapsedSelected: TanreiNavigationDrawerConditionTokens(
      enabled: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .role(.primary),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onPrimary),
        itemLabelColor: .role(.onPrimary),
        itemTrailingTextColor: .role(.onPrimary),
        itemTrailingIconColor: .role(.onPrimary),
        itemBadgeColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      hovered: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .role(.primary),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onPrimary),
        itemLabelColor: .role(.onPrimary),
        itemTrailingTextColor: .role(.onPrimary),
        itemTrailingIconColor: .role(.onPrimary),
        itemBadgeColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      focused: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .role(.primary),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onPrimary),
        itemLabelColor: .role(.onPrimary),
        itemTrailingTextColor: .role(.onPrimary),
        itemTrailingIconColor: .role(.onPrimary),
        itemBadgeColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      pressed: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .role(.primary),
        itemIconIndicatorColor: .none,
        itemIconColor: .role(.onPrimary),
        itemLabelColor: .role(.onPrimary),
        itemTrailingTextColor: .role(.onPrimary),
        itemTrailingIconColor: .role(.onPrimary),
        itemBadgeColor: .role(.onPrimary),
        itemStateLayerColor: .role(.onPrimary)
      ),
      disabled: TanreiNavigationDrawerConditionStateTokens(
        itemContainerColor: .role(.primary),
        itemIconIndicatorColor: .none,
        itemIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemTrailingTextColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemTrailingIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemBadgeColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiNavigationDrawerStateTokens(
    opacity: 1
  ),
  focused: TanreiNavigationDrawerStateTokens(
    opacity: 1
  ),
  pressed: TanreiNavigationDrawerStateTokens(
    opacity: 0.7
  ),
  disabled: TanreiNavigationDrawerStateTokens(
    opacity: 1
  )
)

private let cupertinoNavigationRailTokens = TanreiNavigationRailTokens(
  containerColor: .role(.surface),
  containerElevation: cupertinoElevation.level0,
  containerGap: 8,
  containerPaddingBlock: 16,
  containerWidth: 80,
  headerGap: 24,
  itemContainerHeight: 32,
  itemContainerShape: 8,
  itemContainerWidth: 56,
  itemGap: 4,
  itemIconSize: 24,
  itemLabelTypescale: cupertinoTypescale.caption,
  motionFeedbackDuration: 450,
  motionSelectionDuration: 350,
  motionSelectionEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineColor: .role(.outlineVariant),
  outlineWidth: 1,
  conditions: TanreiNavigationRailConditions(
    unselected: TanreiNavigationRailConditionTokens(
      enabled: TanreiNavigationRailConditionStateTokens(
        itemContainerColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      hovered: TanreiNavigationRailConditionStateTokens(
        itemContainerColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiNavigationRailConditionStateTokens(
        itemContainerColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiNavigationRailConditionStateTokens(
        itemContainerColor: .none,
        itemIconColor: .role(.onSurfaceVariant),
        itemLabelColor: .role(.onSurfaceVariant),
        itemStateLayerColor: .role(.onSurfaceVariant)
      ),
      disabled: TanreiNavigationRailConditionStateTokens(
        itemContainerColor: .none,
        itemIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    selected: TanreiNavigationRailConditionTokens(
      enabled: TanreiNavigationRailConditionStateTokens(
        itemContainerColor: .none,
        itemIconColor: .role(.primary),
        itemLabelColor: .role(.primary),
        itemStateLayerColor: .role(.primary)
      ),
      hovered: TanreiNavigationRailConditionStateTokens(
        itemContainerColor: .none,
        itemIconColor: .role(.primary),
        itemLabelColor: .role(.primary),
        itemStateLayerColor: .role(.primary)
      ),
      focused: TanreiNavigationRailConditionStateTokens(
        itemContainerColor: .none,
        itemIconColor: .role(.primary),
        itemLabelColor: .role(.primary),
        itemStateLayerColor: .role(.primary)
      ),
      pressed: TanreiNavigationRailConditionStateTokens(
        itemContainerColor: .none,
        itemIconColor: .role(.primary),
        itemLabelColor: .role(.primary),
        itemStateLayerColor: .role(.primary)
      ),
      disabled: TanreiNavigationRailConditionStateTokens(
        itemContainerColor: .none,
        itemIconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemLabelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        itemStateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiNavigationRailStateTokens(
    opacity: 1
  ),
  focused: TanreiNavigationRailStateTokens(
    opacity: 1
  ),
  pressed: TanreiNavigationRailStateTokens(
    opacity: 0.7
  ),
  disabled: TanreiNavigationRailStateTokens(
    opacity: 1
  )
)

private let cupertinoNumberInputTokens = TanreiNumberInputTokens(
  motionRepeatDelay: 500,
  motionRepeatInterval: 100,
  motionRepeatIntervalFast: 50,
  stepperGap: 0,
  stepperInset: 4
)

private let cupertinoOneTimeCodeInputTokens = TanreiOneTimeCodeInputTokens(
  caretWidth: 2,
  containerGap: 6,
  containerHeight: 44,
  containerPaddingInline: 4,
  containerShape: 10,
  containerWidth: 40,
  inputTypescale: cupertinoTypescale.bodyLarge,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineWidth: 1,
  separatorThickness: 1,
  separatorWidth: 8,
  conditions: TanreiOneTimeCodeInputConditions(
    standard: TanreiOneTimeCodeInputConditionTokens(
      enabled: TanreiOneTimeCodeInputConditionStateTokens(
        containerColor: .role(.surfaceContainerHigh),
        outlineColor: .none,
        inputColor: .role(.onSurface),
        caretColor: .role(.primary),
        separatorColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        errorContainerColor: .role(.surfaceContainerHigh),
        errorOutlineColor: .role(.error),
        errorInputColor: .role(.onSurface),
        errorCaretColor: .role(.error),
        errorSeparatorColor: .role(.onSurfaceVariant),
        errorStateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiOneTimeCodeInputConditionStateTokens(
        containerColor: .role(.surfaceContainerHigh),
        outlineColor: .none,
        inputColor: .role(.onSurface),
        caretColor: .role(.primary),
        separatorColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        errorContainerColor: .role(.surfaceContainerHigh),
        errorOutlineColor: .role(.error),
        errorInputColor: .role(.onSurface),
        errorCaretColor: .role(.error),
        errorSeparatorColor: .role(.onSurfaceVariant),
        errorStateLayerColor: .role(.onSurface)
      ),
      focused: TanreiOneTimeCodeInputConditionStateTokens(
        containerColor: .role(.surfaceContainerHigh),
        outlineColor: .role(.focusRing),
        inputColor: .role(.onSurface),
        caretColor: .role(.primary),
        separatorColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface),
        errorContainerColor: .role(.surfaceContainerHigh),
        errorOutlineColor: .role(.error),
        errorInputColor: .role(.onSurface),
        errorCaretColor: .role(.error),
        errorSeparatorColor: .role(.onSurfaceVariant),
        errorStateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiOneTimeCodeInputConditionStateTokens(
        containerColor: .role(.surfaceContainerHigh),
        outlineColor: .none,
        inputColor: .alpha(of: .role(.onSurface), amount: 0.38),
        caretColor: .alpha(of: .role(.onSurface), amount: 0.38),
        separatorColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        errorContainerColor: .role(.surfaceContainerHigh),
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

private let cupertinoPageHeaderTokens = TanreiPageHeaderTokens(
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
  eyebrowTypescale: cupertinoTypescale.eyebrow,
  metaColor: .role(.onSurfaceVariant),
  metaGap: 12,
  metaIconGap: 6,
  metaItemGap: 16,
  metaRowGap: 4,
  metaSeparatorColor: .role(.onSurfaceVariant),
  metaSeparatorSize: 4,
  metaTypescale: cupertinoTypescale.bodySmall,
  titleColor: .role(.onSurface),
  wideContainerWidth: 480,
  sizes: TanreiPageHeaderSizes(
    small: TanreiPageHeaderSizeTokens(
      titleTypescale: cupertinoTypescale.heading2,
      descriptionTypescale: cupertinoTypescale.body,
      descriptionGap: 4,
      containerPaddingBlockEnd: 8
    ),
    medium: TanreiPageHeaderSizeTokens(
      titleTypescale: cupertinoTypescale.heading1,
      descriptionTypescale: cupertinoTypescale.bodyLarge,
      descriptionGap: 8,
      containerPaddingBlockEnd: 16
    ),
    large: TanreiPageHeaderSizeTokens(
      titleTypescale: cupertinoTypescale.display,
      descriptionTypescale: cupertinoTypescale.bodyLarge,
      descriptionGap: 16,
      containerPaddingBlockEnd: 32
    )
  )
)

private let cupertinoPaginationTokens = TanreiPaginationTokens(
  containerGap: 12,
  containerMinWidth: 240,
  containerPadding: 16,
  containerShape: 10,
  gap: 16,
  iconSize: 20,
  labelGap: 2,
  labelTypescale: cupertinoTypescale.labelSmall,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineWidth: 1,
  titleTypescale: cupertinoTypescale.bodyLarge,
  parts: TanreiPaginationParts(
    item: TanreiPaginationPartTokens(
      enabled: TanreiPaginationPartStateTokens(
        containerColor: .none,
        outlineColor: .role(.outlineVariant),
        labelColor: .role(.onSurfaceVariant),
        titleColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiPaginationPartStateTokens(
        containerColor: .none,
        outlineColor: .role(.outlineVariant),
        labelColor: .role(.onSurfaceVariant),
        titleColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiPaginationPartStateTokens(
        containerColor: .none,
        outlineColor: .role(.outlineVariant),
        labelColor: .role(.onSurfaceVariant),
        titleColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiPaginationPartStateTokens(
        containerColor: .none,
        outlineColor: .role(.outlineVariant),
        labelColor: .role(.onSurfaceVariant),
        titleColor: .role(.onSurface),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      )
    )
  ),
  hovered: TanreiPaginationStateTokens(
    containerShape: 10,
    opacity: 1
  ),
  focused: TanreiPaginationStateTokens(
    containerShape: 10,
    opacity: 1
  ),
  pressed: TanreiPaginationStateTokens(
    containerShape: 10,
    opacity: 0.7
  )
)

private let cupertinoPopoverTokens = TanreiPopoverTokens(
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
  containerElevation: cupertinoElevation.level2,
  containerGap: 12,
  containerMaxHeight: 480,
  containerMaxWidth: 400,
  containerMinWidth: 160,
  containerPaddingBlock: 16,
  containerPaddingInline: 16,
  containerShape: 10,
  contentColor: .role(.onSurface),
  dividerColor: .role(.outlineVariant),
  dividerWidth: 1,
  headerGap: 8,
  headlineColor: .role(.onSurface),
  headlineTypescale: cupertinoTypescale.heading6,
  motionCloseDuration: 100,
  motionCloseEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  motionOpenDuration: 200,
  motionOpenEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  offset: 4,
  windowMargin: 8
)

private let cupertinoProgressIndicatorTokens = TanreiProgressIndicatorTokens(
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
      linearThickness: 4,
      circularSize: 16,
      circularThickness: 2
    ),
    medium: TanreiProgressIndicatorSizeTokens(
      linearThickness: 4,
      circularSize: 20,
      circularThickness: 2
    ),
    large: TanreiProgressIndicatorSizeTokens(
      linearThickness: 4,
      circularSize: 36,
      circularThickness: 2
    )
  )
)

private let cupertinoProseTokens = TanreiProseTokens(
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
  leadTypescale: cupertinoTypescale.bodyLarge,
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
      textTypescale: cupertinoTypescale.body,
      smallTypescale: cupertinoTypescale.bodySmall
    ),
    large: TanreiProseSizeTokens(
      textTypescale: cupertinoTypescale.bodyLarge,
      smallTypescale: cupertinoTypescale.body
    )
  )
)

private let cupertinoRadioButtonTokens = TanreiRadioButtonTokens(
  containerShape: 9999,
  containerSize: 28,
  fillInset: 0,
  fillOpacity: 1,
  labelGap: 4,
  labelTypescale: cupertinoTypescale.body,
  motionFeedbackDuration: 450,
  motionSelectionDuration: 150,
  motionSelectionEasing: TanreiCubicBezier(0.31, 0.94, 0.34, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  optionMinHeight: 48,
  ringSelectedWidthShare: 0.625,
  ringSize: 16,
  ringWidth: 1,
  conditions: TanreiRadioButtonConditions(
    unselected: TanreiRadioButtonConditionTokens(
      enabled: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .role(.outline),
        fillColor: .role(.surface),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.outline)
      ),
      hovered: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .role(.outline),
        fillColor: .role(.surface),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.outline)
      ),
      focused: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .role(.outline),
        fillColor: .role(.surface),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.outline)
      ),
      pressed: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .role(.outline),
        fillColor: .role(.surface),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.outline)
      ),
      disabled: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .alpha(of: .role(.onSurface), amount: 0.38),
        fillColor: .role(.surface),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    selected: TanreiRadioButtonConditionTokens(
      enabled: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .role(.primary),
        fillColor: .role(.onPrimary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      hovered: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .role(.primary),
        fillColor: .role(.onPrimary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      focused: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .role(.primary),
        fillColor: .role(.onPrimary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      pressed: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .role(.primary),
        fillColor: .role(.onPrimary),
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
        fillColor: .role(.surface),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      hovered: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .role(.error),
        fillColor: .role(.surface),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      focused: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .role(.error),
        fillColor: .role(.surface),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      pressed: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .role(.error),
        fillColor: .role(.surface),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      disabled: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .alpha(of: .role(.onSurface), amount: 0.38),
        fillColor: .role(.surface),
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    errorSelected: TanreiRadioButtonConditionTokens(
      enabled: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .role(.error),
        fillColor: .role(.onError),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      hovered: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .role(.error),
        fillColor: .role(.onError),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      focused: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .role(.error),
        fillColor: .role(.onError),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.error)
      ),
      pressed: TanreiRadioButtonConditionStateTokens(
        containerColor: .none,
        ringColor: .role(.error),
        fillColor: .role(.onError),
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
    opacity: 0.7
  ),
  disabled: TanreiRadioButtonStateTokens(
    containerShape: 9999,
    opacity: 1
  )
)

private let cupertinoSearchTokens = TanreiSearchTokens(
  containerButtonGap: 8,
  containerGap: 8,
  containerHeight: 36,
  containerPaddingInline: 8,
  containerPaddingInlineWithButton: 4,
  containerShape: 10,
  dividerColor: .role(.outlineVariant),
  dividerThickness: 1,
  groupTitleColor: .role(.onSurfaceVariant),
  groupTitleTypescale: cupertinoTypescale.labelSmall,
  groupGap: 8,
  groupIndent: 24,
  headerHeight: 56,
  headerPaddingInline: 8,
  inputTypescale: cupertinoTypescale.bodyLarge,
  leadingIconSize: 20,
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
  resultMarkEmphasis: 200,
  shortcutColor: .role(.onSurfaceVariant),
  shortcutTypescale: cupertinoTypescale.labelSmall,
  statusColor: .role(.onSurfaceVariant),
  statusErrorColor: .role(.error),
  statusTypescale: cupertinoTypescale.bodySmall,
  suggestionContainerGap: 12,
  suggestionContainerHeight: 44,
  suggestionContainerPaddingBlock: 8,
  suggestionContainerPaddingInline: 12,
  suggestionContainerShape: 8,
  suggestionHeadlineTypescale: cupertinoTypescale.body,
  suggestionLeadingIconSize: 20,
  suggestionSupportingTextTypescale: cupertinoTypescale.bodySmall,
  triggerContainerGap: 8,
  triggerContainerHeight: 40,
  triggerContainerPaddingInline: 12,
  triggerLabelTypescale: cupertinoTypescale.body,
  triggerLeadingIconSize: 20,
  viewContainerColor: .role(.surfaceBright),
  viewContainerElevation: cupertinoElevation.level2,
  viewContainerShape: 10,
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
        containerColor: .role(.surfaceContainerHigh),
        containerElevation: cupertinoElevation.level0,
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
        containerColor: .role(.surfaceContainerHigh),
        containerElevation: cupertinoElevation.level0,
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
      focused: TanreiSearchConditionStateTokens(
        containerColor: .role(.surfaceContainerHigh),
        containerElevation: cupertinoElevation.level0,
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
      pressed: TanreiSearchConditionStateTokens(
        containerColor: .role(.surfaceContainerHigh),
        containerElevation: cupertinoElevation.level0,
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
      disabled: TanreiSearchConditionStateTokens(
        containerColor: .role(.surfaceContainerHigh),
        containerElevation: cupertinoElevation.level0,
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
    opacity: 0.7,
    outlineWidth: 1
  ),
  disabled: TanreiSearchStateTokens(
    opacity: 1,
    outlineWidth: 1
  )
)

private let cupertinoSegmentedButtonTokens = TanreiSegmentedButtonTokens(
  checkWeight: 300,
  containerShape: 8,
  dividerColor: .role(.outlineVariant),
  dividerWidth: 1,
  motionFeedbackDuration: 450,
  motionSelectionDuration: 150,
  motionSelectionEasing: TanreiCubicBezier(0.31, 0.94, 0.34, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineColor: .none,
  outlineWidth: 1,
  setColor: .role(.surfaceContainerHigh),
  setPadding: 2,
  setShape: 8,
  sizes: TanreiSegmentedButtonSizes(
    small: TanreiSegmentedButtonSizeTokens(
      containerHeight: 28,
      containerPaddingInline: 12,
      containerPaddingBlock: 4,
      containerGap: 8,
      labelTypescale: cupertinoTypescale.labelSmall,
      iconSize: 16,
      checkSize: 0
    ),
    medium: TanreiSegmentedButtonSizeTokens(
      containerHeight: 32,
      containerPaddingInline: 14,
      containerPaddingBlock: 6,
      containerGap: 8,
      labelTypescale: cupertinoTypescale.labelSmall,
      iconSize: 16,
      checkSize: 0
    ),
    large: TanreiSegmentedButtonSizeTokens(
      containerHeight: 40,
      containerPaddingInline: 16,
      containerPaddingBlock: 6,
      containerGap: 8,
      labelTypescale: cupertinoTypescaleBodySubhead,
      iconSize: 16,
      checkSize: 0
    )
  ),
  conditions: TanreiSegmentedButtonConditions(
    unselected: TanreiSegmentedButtonConditionTokens(
      enabled: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .none,
        containerElevation: cupertinoElevation.level0,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .none,
        containerElevation: cupertinoElevation.level0,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .none,
        containerElevation: cupertinoElevation.level0,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .none,
        containerElevation: cupertinoElevation.level0,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .none,
        containerElevation: cupertinoElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    ),
    selected: TanreiSegmentedButtonConditionTokens(
      enabled: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .role(.surfaceBright),
        containerElevation: cupertinoElevation.level1,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      hovered: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .role(.surfaceBright),
        containerElevation: cupertinoElevation.level1,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .role(.surfaceBright),
        containerElevation: cupertinoElevation.level1,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .role(.surfaceBright),
        containerElevation: cupertinoElevation.level1,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      disabled: TanreiSegmentedButtonConditionStateTokens(
        containerColor: .role(.surfaceBright),
        containerElevation: cupertinoElevation.level0,
        labelColor: .alpha(of: .role(.onSurface), amount: 0.38),
        iconColor: .alpha(of: .role(.onSurface), amount: 0.38),
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38)
      )
    )
  ),
  hovered: TanreiSegmentedButtonStateTokens(
    containerShape: 8,
    opacity: 1
  ),
  focused: TanreiSegmentedButtonStateTokens(
    containerShape: 8,
    opacity: 1
  ),
  pressed: TanreiSegmentedButtonStateTokens(
    containerShape: 8,
    opacity: 0.7
  ),
  disabled: TanreiSegmentedButtonStateTokens(
    containerShape: 8,
    opacity: 1
  )
)

private let cupertinoSelectTokens = TanreiSelectTokens(
  dividerColor: .role(.surfaceContainerHigh),
  dividerSpace: 0,
  dividerThickness: 8,
  groupTitleColor: .role(.onSurfaceVariant),
  groupTitlePaddingInline: 12,
  groupTitleTypescale: cupertinoTypescale.labelSmall,
  groupGap: 16,
  listColor: .role(.surfaceContainerLowest),
  listElevation: cupertinoElevation.level2,
  listMaxHeight: 320,
  listMaxWidth: 320,
  listMinWidth: 160,
  listOffset: 4,
  listPaddingBlock: 4,
  listPaddingInline: 4,
  listShape: 20,
  listViewportMargin: 8,
  motionCloseDuration: 100,
  motionCloseEasing: TanreiCubicBezier(0.3, 0, 0.8, 0.15),
  motionFeedbackDuration: 450,
  motionOpenDuration: 200,
  motionOpenEasing: TanreiCubicBezier(0.05, 0.7, 0.1, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  optionGap: 12,
  optionHeight: 44,
  optionLabelTypescale: cupertinoTypescale.bodyLarge,
  optionLeadingIconSize: 16,
  optionMarkSize: 16,
  optionPaddingBlock: 8,
  optionPaddingInline: 12,
  optionShape: 8,
  optionSupportingTextTypescale: cupertinoTypescale.bodySmall,
  separation: 0,
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
      focused: TanreiSelectVariantStateTokens(
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
      pressed: TanreiSelectVariantStateTokens(
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
      focused: TanreiSelectVariantStateTokens(
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
      pressed: TanreiSelectVariantStateTokens(
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
      focused: TanreiSelectVariantStateTokens(
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
      pressed: TanreiSelectVariantStateTokens(
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
  hovered: TanreiSelectStateTokens(
    opacity: 1
  ),
  focused: TanreiSelectStateTokens(
    opacity: 1
  ),
  pressed: TanreiSelectStateTokens(
    opacity: 0.7
  ),
  disabled: TanreiSelectStateTokens(
    opacity: 1
  )
)

private let cupertinoSideSheetTokens = TanreiSideSheetTokens(
  actionsArrangement: 0,
  actionsGap: 8,
  actionsPaddingBlock: 16,
  actionsVariant: 4,
  closeButtonVariant: 1,
  containerPaddingBlock: 24,
  containerPaddingInline: 24,
  containerWidth: 320,
  contentColor: .role(.onSurface),
  dividerColor: .role(.outlineVariant),
  dividerWidth: 1,
  headerGap: 8,
  headerHeight: 64,
  headerPaddingInlineEnd: 12,
  headlineColor: .role(.onSurface),
  headlineTypescale: cupertinoTypescale.heading5,
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
      containerElevation: cupertinoElevation.level0,
      containerShape: 0,
      outlineColor: .role(.outlineVariant)
    ),
    modal: TanreiSideSheetVariantTokens(
      containerColor: .role(.surfaceContainerLow),
      containerElevation: cupertinoElevation.level2,
      containerShape: 14,
      outlineColor: .none
    )
  )
)

private let cupertinoSkeletonTokens = TanreiSkeletonTokens(
  containerGap: 8,
  motionAnimation: 0,
  motionDimDuration: 1000,
  motionDimEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionShowDelay: 300,
  placeholderColor: .role(.surfaceVariant),
  placeholderDimOpacity: 0.5,
  placeholderLastLineInlineSize: 0.6,
  placeholderShapeBlock: 10,
  placeholderShapeCircle: 9999,
  placeholderShapeText: 4
)

private let cupertinoSliderTokens = TanreiSliderTokens(
  containerShape: 9999,
  containerSize: 32,
  handleOutlineWidth: 0,
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
  valueIndicatorContainerShape: 8,
  valueIndicatorLabelColor: .role(.inverseOnSurface),
  valueIndicatorLabelTypescale: cupertinoTypescale.labelSmall,
  valueIndicatorOffset: 8,
  sizes: TanreiSliderSizes(
    small: TanreiSliderSizeTokens(
      trackThickness: 4,
      trackShape: 9999,
      handleHeight: 28,
      stopIndicatorSize: 0
    ),
    medium: TanreiSliderSizeTokens(
      trackThickness: 6,
      trackShape: 9999,
      handleHeight: 28,
      stopIndicatorSize: 0
    ),
    large: TanreiSliderSizeTokens(
      trackThickness: 8,
      trackShape: 9999,
      handleHeight: 28,
      stopIndicatorSize: 0
    )
  ),
  conditions: TanreiSliderConditions(
    standard: TanreiSliderConditionTokens(
      enabled: TanreiSliderConditionStateTokens(
        containerColor: .none,
        stateLayerColor: .role(.primary),
        handleColor: .literal(TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1)),
        handleWidth: 28,
        handleElevation: cupertinoElevation.level2,
        handleOutlineColor: .role(.primary),
        trackColor: .role(.surfaceContainerHighest),
        activeTrackColor: .role(.primary),
        stopIndicatorColor: .role(.onSurfaceVariant),
        activeStopIndicatorColor: .role(.onPrimary)
      ),
      hovered: TanreiSliderConditionStateTokens(
        containerColor: .none,
        stateLayerColor: .role(.primary),
        handleColor: .literal(TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1)),
        handleWidth: 28,
        handleElevation: cupertinoElevation.level2,
        handleOutlineColor: .role(.primary),
        trackColor: .role(.surfaceContainerHighest),
        activeTrackColor: .role(.primary),
        stopIndicatorColor: .role(.onSurfaceVariant),
        activeStopIndicatorColor: .role(.onPrimary)
      ),
      focused: TanreiSliderConditionStateTokens(
        containerColor: .none,
        stateLayerColor: .role(.primary),
        handleColor: .literal(TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1)),
        handleWidth: 28,
        handleElevation: cupertinoElevation.level2,
        handleOutlineColor: .role(.primary),
        trackColor: .role(.surfaceContainerHighest),
        activeTrackColor: .role(.primary),
        stopIndicatorColor: .role(.onSurfaceVariant),
        activeStopIndicatorColor: .role(.onPrimary)
      ),
      pressed: TanreiSliderConditionStateTokens(
        containerColor: .none,
        stateLayerColor: .role(.primary),
        handleColor: .literal(TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1)),
        handleWidth: 28,
        handleElevation: cupertinoElevation.level2,
        handleOutlineColor: .role(.primary),
        trackColor: .role(.surfaceContainerHighest),
        activeTrackColor: .role(.primary),
        stopIndicatorColor: .role(.onSurfaceVariant),
        activeStopIndicatorColor: .role(.onPrimary)
      ),
      disabled: TanreiSliderConditionStateTokens(
        containerColor: .none,
        stateLayerColor: .alpha(of: .role(.onSurface), amount: 0.38),
        handleColor: .literal(TanreiColorValue(red: 1, green: 1, blue: 1, opacity: 1)),
        handleWidth: 28,
        handleElevation: cupertinoElevation.level0,
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

private let cupertinoSnackbarTokens = TanreiSnackbarTokens(
  actionTonalLayerOpacity: 0,
  containerColor: .role(.surfaceBright),
  containerElevation: cupertinoElevation.level3,
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
  containerShape: 10,
  controlsGap: 4,
  controlsHeight: 36,
  controlsIconSize: 20,
  controlsLabelTypescale: cupertinoTypescale.label,
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
  supportingTextTypescale: cupertinoTypescale.body,
  supportingTextUnderTitleOpacity: 1,
  timeoutLong: 10000,
  timeoutShort: 4000,
  titleColor: .role(.onSurface),
  titleGap: 4,
  titleMaxLines: 3,
  titleTypescale: cupertinoTypescale.heading6,
  warningContainerColor: .role(.warningContainer),
  warningFocusRingColor: .role(.onWarningContainer),
  warningIconColor: .role(.onWarningContainer),
  warningOutlineColor: .role(.warning),
  warningSupportingTextColor: .role(.onWarningContainer),
  warningTitleColor: .role(.onWarningContainer),
  controls: TanreiSnackbarControls(
    action: TanreiSnackbarControlTokens(
      enabled: TanreiSnackbarControlStateTokens(
        containerColor: .none,
        contentColor: .role(.primary),
        stateLayerColor: .role(.primary),
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
        containerColor: .none,
        contentColor: .role(.primary),
        stateLayerColor: .role(.primary),
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
      focused: TanreiSnackbarControlStateTokens(
        containerColor: .none,
        contentColor: .role(.primary),
        stateLayerColor: .role(.primary),
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
      pressed: TanreiSnackbarControlStateTokens(
        containerColor: .none,
        contentColor: .role(.primary),
        stateLayerColor: .role(.primary),
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
        inverseInfoContentColor: .role(.onInfo),
        inverseInfoStateLayerColor: .role(.onInfo),
        inverseWarningContainerColor: .none,
        inverseWarningContentColor: .role(.onWarning),
        inverseWarningStateLayerColor: .role(.onWarning),
        inverseErrorContainerColor: .none,
        inverseErrorContentColor: .role(.onError),
        inverseErrorStateLayerColor: .role(.onError),
        inverseSuccessContainerColor: .none,
        inverseSuccessContentColor: .role(.onSuccess),
        inverseSuccessStateLayerColor: .role(.onSuccess)
      ),
      hovered: TanreiSnackbarControlStateTokens(
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
        inverseInfoContentColor: .role(.onInfo),
        inverseInfoStateLayerColor: .role(.onInfo),
        inverseWarningContainerColor: .none,
        inverseWarningContentColor: .role(.onWarning),
        inverseWarningStateLayerColor: .role(.onWarning),
        inverseErrorContainerColor: .none,
        inverseErrorContentColor: .role(.onError),
        inverseErrorStateLayerColor: .role(.onError),
        inverseSuccessContainerColor: .none,
        inverseSuccessContentColor: .role(.onSuccess),
        inverseSuccessStateLayerColor: .role(.onSuccess)
      ),
      focused: TanreiSnackbarControlStateTokens(
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
        inverseInfoContentColor: .role(.onInfo),
        inverseInfoStateLayerColor: .role(.onInfo),
        inverseWarningContainerColor: .none,
        inverseWarningContentColor: .role(.onWarning),
        inverseWarningStateLayerColor: .role(.onWarning),
        inverseErrorContainerColor: .none,
        inverseErrorContentColor: .role(.onError),
        inverseErrorStateLayerColor: .role(.onError),
        inverseSuccessContainerColor: .none,
        inverseSuccessContentColor: .role(.onSuccess),
        inverseSuccessStateLayerColor: .role(.onSuccess)
      ),
      pressed: TanreiSnackbarControlStateTokens(
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
        inverseInfoContentColor: .role(.onInfo),
        inverseInfoStateLayerColor: .role(.onInfo),
        inverseWarningContainerColor: .none,
        inverseWarningContentColor: .role(.onWarning),
        inverseWarningStateLayerColor: .role(.onWarning),
        inverseErrorContainerColor: .none,
        inverseErrorContentColor: .role(.onError),
        inverseErrorStateLayerColor: .role(.onError),
        inverseSuccessContainerColor: .none,
        inverseSuccessContentColor: .role(.onSuccess),
        inverseSuccessStateLayerColor: .role(.onSuccess)
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
    opacity: 0.7
  )
)

private let cupertinoStepperTokens = TanreiStepperTokens(
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
  descriptionTypescale: cupertinoTypescale.bodySmall,
  labelTypescale: cupertinoTypescale.label,
  markerGap: 8,
  markerIconSize: 16,
  markerIconWeight: 300,
  markerLabelTypescale: cupertinoTypescale.labelSmall,
  markerOutlineWidth: 2,
  markerShape: 9999,
  markerSize: 24,
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  positionColor: .role(.onSurfaceVariant),
  positionGap: 8,
  positionTypescale: cupertinoTypescale.labelSmall,
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
        containerColor: .none,
        markerColor: .none,
        markerOutlineColor: .role(.outline),
        markerContentColor: .role(.onSurfaceVariant),
        labelColor: .role(.onSurfaceVariant),
        descriptionColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiStepperConditionStateTokens(
        containerColor: .none,
        markerColor: .none,
        markerOutlineColor: .role(.outline),
        markerContentColor: .role(.onSurfaceVariant),
        labelColor: .role(.onSurfaceVariant),
        descriptionColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiStepperConditionStateTokens(
        containerColor: .none,
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
        containerColor: .none,
        markerColor: .role(.primary),
        markerOutlineColor: .role(.primary),
        markerContentColor: .role(.onPrimary),
        labelColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiStepperConditionStateTokens(
        containerColor: .none,
        markerColor: .role(.primary),
        markerOutlineColor: .role(.primary),
        markerContentColor: .role(.onPrimary),
        labelColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiStepperConditionStateTokens(
        containerColor: .none,
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
        containerColor: .none,
        markerColor: .role(.secondaryContainer),
        markerOutlineColor: .role(.secondaryContainer),
        markerContentColor: .role(.onSecondaryContainer),
        labelColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiStepperConditionStateTokens(
        containerColor: .none,
        markerColor: .role(.secondaryContainer),
        markerOutlineColor: .role(.secondaryContainer),
        markerContentColor: .role(.onSecondaryContainer),
        labelColor: .role(.onSurface),
        descriptionColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiStepperConditionStateTokens(
        containerColor: .none,
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
        containerColor: .none,
        markerColor: .none,
        markerOutlineColor: .role(.error),
        markerContentColor: .role(.error),
        labelColor: .role(.error),
        descriptionColor: .role(.error),
        stateLayerColor: .role(.error)
      ),
      focused: TanreiStepperConditionStateTokens(
        containerColor: .none,
        markerColor: .none,
        markerOutlineColor: .role(.error),
        markerContentColor: .role(.error),
        labelColor: .role(.error),
        descriptionColor: .role(.error),
        stateLayerColor: .role(.error)
      ),
      pressed: TanreiStepperConditionStateTokens(
        containerColor: .none,
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
    opacity: 0.7
  ),
  disabled: TanreiStepperStateTokens(
    containerShape: 8,
    opacity: 1
  )
)

private let cupertinoStepsTokens = TanreiStepsTokens(
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
      markerLabelTypescale: cupertinoTypescale.labelSmall,
      titleTypescale: cupertinoTypescale.heading6,
      bodyTypescale: cupertinoTypescale.body
    ),
    large: TanreiStepsSizeTokens(
      markerHeight: 28,
      markerLabelTypescale: cupertinoTypescale.label,
      titleTypescale: cupertinoTypescale.heading5,
      bodyTypescale: cupertinoTypescale.bodyLarge
    )
  )
)

private let cupertinoSwatchTokens = TanreiSwatchTokens(
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
      labelTypescale: cupertinoTypescale.bodySmall,
      supportingTextTypescale: cupertinoTypescale.caption
    ),
    medium: TanreiSwatchSizeTokens(
      containerSize: 24,
      gap: 8,
      labelTypescale: cupertinoTypescale.body,
      supportingTextTypescale: cupertinoTypescale.bodySmall
    ),
    large: TanreiSwatchSizeTokens(
      containerSize: 32,
      gap: 12,
      labelTypescale: cupertinoTypescale.body,
      supportingTextTypescale: cupertinoTypescale.bodySmall
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

private let cupertinoSwitchTokens = TanreiSwitchTokens(
  containerShape: 9999,
  containerSize: 28,
  handleSizeWithIcon: 27,
  iconSize: 16,
  iconWeight: 300,
  labelGap: 8,
  labelTypescale: cupertinoTypescale.body,
  motionFeedbackDuration: 450,
  motionSelectionDuration: 350,
  motionSelectionEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  outlineWidth: 1,
  trackHeight: 31,
  trackShape: 9999,
  trackWidth: 51,
  conditions: TanreiSwitchConditions(
    unselected: TanreiSwitchConditionTokens(
      enabled: TanreiSwitchConditionStateTokens(
        containerColor: .none,
        trackColor: .role(.surfaceContainerHighest),
        outlineColor: .role(.surfaceContainerHighest),
        handleColor: .role(.onPrimary),
        handleSize: 27,
        handleElevation: cupertinoElevation.level1,
        iconColor: .role(.outline),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.surfaceContainerHighest)
      ),
      hovered: TanreiSwitchConditionStateTokens(
        containerColor: .none,
        trackColor: .role(.surfaceContainerHighest),
        outlineColor: .role(.surfaceContainerHighest),
        handleColor: .role(.onPrimary),
        handleSize: 27,
        handleElevation: cupertinoElevation.level1,
        iconColor: .role(.outline),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.surfaceContainerHighest)
      ),
      focused: TanreiSwitchConditionStateTokens(
        containerColor: .none,
        trackColor: .role(.surfaceContainerHighest),
        outlineColor: .role(.surfaceContainerHighest),
        handleColor: .role(.onPrimary),
        handleSize: 27,
        handleElevation: cupertinoElevation.level1,
        iconColor: .role(.outline),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.surfaceContainerHighest)
      ),
      pressed: TanreiSwitchConditionStateTokens(
        containerColor: .none,
        trackColor: .role(.surfaceContainerHighest),
        outlineColor: .role(.surfaceContainerHighest),
        handleColor: .role(.onPrimary),
        handleSize: 27,
        handleElevation: cupertinoElevation.level1,
        iconColor: .role(.outline),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.surfaceContainerHighest)
      ),
      disabled: TanreiSwitchConditionStateTokens(
        containerColor: .none,
        trackColor: .alpha(of: .role(.onSurface), amount: 0.12),
        outlineColor: .alpha(of: .role(.onSurface), amount: 0.12),
        handleColor: .role(.surface),
        handleSize: 27,
        handleElevation: cupertinoElevation.level0,
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
        handleSize: 27,
        handleElevation: cupertinoElevation.level1,
        iconColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      hovered: TanreiSwitchConditionStateTokens(
        containerColor: .none,
        trackColor: .role(.primary),
        outlineColor: .role(.primary),
        handleColor: .role(.onPrimary),
        handleSize: 27,
        handleElevation: cupertinoElevation.level1,
        iconColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      focused: TanreiSwitchConditionStateTokens(
        containerColor: .none,
        trackColor: .role(.primary),
        outlineColor: .role(.primary),
        handleColor: .role(.onPrimary),
        handleSize: 27,
        handleElevation: cupertinoElevation.level1,
        iconColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      pressed: TanreiSwitchConditionStateTokens(
        containerColor: .none,
        trackColor: .role(.primary),
        outlineColor: .role(.primary),
        handleColor: .role(.onPrimary),
        handleSize: 27,
        handleElevation: cupertinoElevation.level1,
        iconColor: .role(.primary),
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.primary)
      ),
      disabled: TanreiSwitchConditionStateTokens(
        containerColor: .none,
        trackColor: .alpha(of: .role(.onSurface), amount: 0.12),
        outlineColor: .alpha(of: .role(.onSurface), amount: 0.12),
        handleColor: .role(.surface),
        handleSize: 27,
        handleElevation: cupertinoElevation.level0,
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
    opacity: 0.7
  ),
  disabled: TanreiSwitchStateTokens(
    containerShape: 9999,
    opacity: 1
  )
)

private let cupertinoTabViewTokens = TanreiTabViewTokens(
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

private let cupertinoTableOfContentsTokens = TanreiTableOfContentsTokens(
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
  compactSupportingTextTypescale: cupertinoTypescale.bodySmall,
  containerGap: 8,
  labelTypescale: cupertinoTypescale.bodySmall,
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
  titleTypescale: cupertinoTypescale.label,
  parts: TanreiTableOfContentsParts(
    item: TanreiTableOfContentsPartTokens(
      enabled: TanreiTableOfContentsPartStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      hovered: TanreiTableOfContentsPartStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiTableOfContentsPartStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiTableOfContentsPartStateTokens(
        containerColor: .none,
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
        containerColor: .none,
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiTableOfContentsPartStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiTableOfContentsPartStateTokens(
        containerColor: .none,
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
        containerColor: .none,
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiTableOfContentsPartStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiTableOfContentsPartStateTokens(
        containerColor: .none,
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
    opacity: 0.7
  )
)

private let cupertinoTableTokens = TanreiTableTokens(
  captionGap: 8,
  captionTextColor: .role(.onSurfaceVariant),
  captionTextTypescale: cupertinoTypescale.bodySmall,
  cellTextColor: .role(.onSurface),
  dividerColor: .role(.outlineVariant),
  dividerThickness: 1,
  emptyPaddingBlock: 32,
  headerContainerColor: .none,
  headerGap: 4,
  headerIconSize: 16,
  headerIconWeight: 300,
  headerTextColor: .role(.onSurfaceVariant),
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  rowGap: 4,
  rowSelectedContainerColor: .role(.secondaryContainer),
  rowSelectedHoveredContainerColor: .role(.secondaryContainer),
  rowSelectedHoveredTextColor: .role(.onSecondaryContainer),
  rowSelectedPressedContainerColor: .role(.secondaryContainer),
  rowSelectedPressedTextColor: .role(.onSecondaryContainer),
  rowSelectedStateLayerColor: .role(.onSecondaryContainer),
  rowSelectedTextColor: .role(.onSecondaryContainer),
  rowUnselectedContainerColor: .none,
  rowUnselectedHoveredContainerColor: .none,
  rowUnselectedHoveredTextColor: .role(.onSurface),
  rowUnselectedPressedContainerColor: .none,
  rowUnselectedPressedTextColor: .role(.onSurface),
  rowUnselectedStateLayerColor: .role(.onSurface),
  rowUnselectedTextColor: .role(.onSurface),
  separation: 0,
  statusGap: 16,
  statusPaddingBlock: 8,
  statusTextColor: .role(.onSurfaceVariant),
  statusTextTypescale: cupertinoTypescale.bodySmall,
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
        containerColor: .none,
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      focused: TanreiTablePartStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurfaceVariant)
      ),
      pressed: TanreiTablePartStateTokens(
        containerColor: .none,
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
        containerColor: .none,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiTablePartStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        iconColor: .role(.onSurface),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiTablePartStateTokens(
        containerColor: .none,
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
      cellTextTypescale: cupertinoTypescale.body,
      headerTextTypescale: cupertinoTypescale.label
    ),
    compact: TanreiTableDensityTokens(
      cellPaddingBlock: 6,
      cellPaddingInline: 12,
      cellTextTypescale: cupertinoTypescale.bodySmall,
      headerTextTypescale: cupertinoTypescale.labelSmall
    )
  ),
  hovered: TanreiTableStateTokens(
    opacity: 1
  ),
  focused: TanreiTableStateTokens(
    opacity: 1
  ),
  pressed: TanreiTableStateTokens(
    opacity: 0.7
  )
)

private let cupertinoTabsTokens = TanreiTabsTokens(
  activeIndicatorHeight: 32,
  containerGap: 4,
  containerHeightWithIcon: 64,
  containerShape: 9999,
  dividerColor: .none,
  dividerThickness: 1,
  labelTypescale: cupertinoTypescale.label,
  motionFeedbackDuration: 450,
  motionIndicatorDuration: 500,
  motionIndicatorEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  motionTransition: 0,
  primarySelectedLabelEmphasis: 0,
  secondarySelectedLabelEmphasis: 0,
  tonalSelectedLabelEmphasis: 200,
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
        underlineShape: 4,
        stateLayerColor: .role(.onSecondaryContainer),
        selectedContainerColor: .none,
        selectedLabelColor: .role(.primary),
        selectedIconColor: .role(.primary),
        selectedCoveredLabelColor: .role(.onPrimary),
        selectedCoveredIconColor: .role(.onPrimary),
        selectedActiveIndicatorColor: .role(.primary),
        selectedUnderlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary)
      ),
      hovered: TanreiTabsVariantStateTokens(
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
        underlineShape: 4,
        stateLayerColor: .role(.onSecondaryContainer),
        selectedContainerColor: .none,
        selectedLabelColor: .role(.primary),
        selectedIconColor: .role(.primary),
        selectedCoveredLabelColor: .role(.onPrimary),
        selectedCoveredIconColor: .role(.onPrimary),
        selectedActiveIndicatorColor: .role(.primary),
        selectedUnderlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary)
      ),
      focused: TanreiTabsVariantStateTokens(
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
        underlineShape: 4,
        stateLayerColor: .role(.onSecondaryContainer),
        selectedContainerColor: .none,
        selectedLabelColor: .role(.primary),
        selectedIconColor: .role(.primary),
        selectedCoveredLabelColor: .role(.onPrimary),
        selectedCoveredIconColor: .role(.onPrimary),
        selectedActiveIndicatorColor: .role(.primary),
        selectedUnderlineColor: .none,
        selectedStateLayerColor: .role(.onPrimary)
      ),
      pressed: TanreiTabsVariantStateTokens(
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
        underlineShape: 4,
        stateLayerColor: .role(.onSecondaryContainer),
        selectedContainerColor: .none,
        selectedLabelColor: .role(.primary),
        selectedIconColor: .role(.primary),
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
        underlineShape: 4,
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
        selectedLabelColor: .role(.primary),
        selectedIconColor: .role(.primary),
        selectedCoveredLabelColor: .role(.onSecondary),
        selectedCoveredIconColor: .role(.onSecondary),
        selectedActiveIndicatorColor: .role(.secondary),
        selectedUnderlineColor: .none,
        selectedStateLayerColor: .role(.onSecondary)
      ),
      hovered: TanreiTabsVariantStateTokens(
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
        selectedLabelColor: .role(.primary),
        selectedIconColor: .role(.primary),
        selectedCoveredLabelColor: .role(.onSecondary),
        selectedCoveredIconColor: .role(.onSecondary),
        selectedActiveIndicatorColor: .role(.secondary),
        selectedUnderlineColor: .none,
        selectedStateLayerColor: .role(.onSecondary)
      ),
      focused: TanreiTabsVariantStateTokens(
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
        selectedLabelColor: .role(.primary),
        selectedIconColor: .role(.primary),
        selectedCoveredLabelColor: .role(.onSecondary),
        selectedCoveredIconColor: .role(.onSecondary),
        selectedActiveIndicatorColor: .role(.secondary),
        selectedUnderlineColor: .none,
        selectedStateLayerColor: .role(.onSecondary)
      ),
      pressed: TanreiTabsVariantStateTokens(
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
        selectedLabelColor: .role(.primary),
        selectedIconColor: .role(.primary),
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
      focused: TanreiTabsVariantStateTokens(
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
      pressed: TanreiTabsVariantStateTokens(
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
      iconSize: 20,
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
    opacity: 0.7
  ),
  disabled: TanreiTabsStateTokens(
    opacity: 1
  )
)

private let cupertinoTagGroupTokens = TanreiTagGroupTokens(
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

private let cupertinoTagTokens = TanreiTagTokens(
  containerGap: 4,
  containerShape: 9999,
  dotSize: 8,
  iconSize: 16,
  outlineColor: .role(.outlineVariant),
  outlineWidth: 1,
  sizes: TanreiTagSizes(
    small: TanreiTagSizeTokens(
      containerHeight: 22,
      containerPaddingInline: 6,
      containerPaddingInlineWithIcon: 4,
      containerPaddingBlock: 2,
      labelTypescale: cupertinoTypescale.labelSmall
    ),
    medium: TanreiTagSizeTokens(
      containerHeight: 26,
      containerPaddingInline: 8,
      containerPaddingInlineWithIcon: 6,
      containerPaddingBlock: 2,
      labelTypescale: cupertinoTypescale.label
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

private let cupertinoTextInputTokens = TanreiTextInputTokens(
  codeTabSize: 2,
  codeTypescale: cupertinoTypescale.code,
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

private let cupertinoTimelineTokens = TanreiTimelineTokens(
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
      timeTypescale: cupertinoTypescale.bodySmall,
      titleTypescale: cupertinoTypescale.heading6,
      bodyTypescale: cupertinoTypescale.body
    ),
    large: TanreiTimelineSizeTokens(
      markerHeight: 28,
      timeTypescale: cupertinoTypescale.body,
      titleTypescale: cupertinoTypescale.heading5,
      bodyTypescale: cupertinoTypescale.bodyLarge
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

private let cupertinoToolbarTokens = TanreiToolbarTokens(
  outlineWidth: 1,
  variants: TanreiToolbarVariants(
    docked: TanreiToolbarVariantTokens(
      containerColor: .role(.surfaceContainerLow),
      containerElevation: cupertinoElevation.level0,
      containerShape: 0,
      containerSize: 44,
      containerPaddingInline: 8,
      containerGap: 8,
      outlineColor: .role(.outlineVariant)
    ),
    floating: TanreiToolbarVariantTokens(
      containerColor: .role(.surfaceContainerLowest),
      containerElevation: cupertinoElevation.level2,
      containerShape: 9999,
      containerSize: 48,
      containerPaddingInline: 6,
      containerGap: 8,
      outlineColor: .none
    )
  )
)

private let cupertinoTooltipTokens = TanreiTooltipTokens(
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
  motionShowDelay: 1000,
  motionWarmDuration: 300,
  offset: 4,
  plainContainerColor: .role(.inverseSurface),
  plainContainerElevation: cupertinoElevation.level0,
  plainContainerGap: 8,
  plainContainerInverse: 1,
  plainContainerMaxWidth: 200,
  plainContainerMinHeight: 24,
  plainContainerPaddingBlock: 4,
  plainContainerPaddingInline: 8,
  plainContainerShape: 8,
  plainShortcutColor: .role(.inverseOnSurface),
  plainSupportingTextColor: .role(.inverseOnSurface),
  plainSupportingTextTypescale: cupertinoTypescale.bodySmall,
  plainSurfaceContainerColor: .role(.surfaceBright),
  plainSurfaceContainerElevation: cupertinoElevation.level2,
  plainSurfaceShortcutColor: .role(.onSurfaceVariant),
  plainSurfaceSupportingTextColor: .role(.onSurface),
  richContainerColor: .role(.surfaceBright),
  richContainerElevation: cupertinoElevation.level2,
  richContainerGap: 4,
  richContainerInverse: 0,
  richContainerMaxWidth: 320,
  richContainerPaddingBlock: 12,
  richContainerPaddingInline: 16,
  richContainerShape: 10,
  richInverseContainerColor: .role(.inverseSurface),
  richInverseContainerElevation: cupertinoElevation.level0,
  richInverseSupportingTextColor: .role(.inverseOnSurface),
  richInverseTitleColor: .role(.inverseOnSurface),
  richSupportingTextColor: .role(.onSurfaceVariant),
  richSupportingTextTypescale: cupertinoTypescale.body,
  richTitleColor: .role(.onSurface),
  richTitleTypescale: cupertinoTypescale.heading6,
  timeoutTouch: 1500,
  windowMargin: 8
)

private let cupertinoTreeViewTokens = TanreiTreeViewTokens(
  containerShape: 8,
  guideColor: .role(.outlineVariant),
  guideWidth: 1,
  motionDisclosureDuration: 350,
  motionDisclosureEasing: TanreiCubicBezier(0.27, 1.06, 0.18, 1),
  motionFeedbackDuration: 450,
  motionStateDuration: 150,
  motionStateEasing: TanreiCubicBezier(0.2, 0, 0, 1),
  supportingTextTypescale: cupertinoTypescale.bodySmall,
  trailingTextTypescale: cupertinoTypescale.bodySmall,
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
        containerColor: .none,
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        chevronColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      focused: TanreiTreeViewConditionStateTokens(
        containerColor: .none,
        labelColor: .role(.onSurface),
        supportingTextColor: .role(.onSurfaceVariant),
        trailingTextColor: .role(.onSurfaceVariant),
        iconColor: .role(.onSurfaceVariant),
        chevronColor: .role(.onSurfaceVariant),
        stateLayerColor: .role(.onSurface)
      ),
      pressed: TanreiTreeViewConditionStateTokens(
        containerColor: .none,
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
        containerColor: .role(.secondaryContainer),
        labelColor: .role(.onSecondaryContainer),
        supportingTextColor: .role(.onSecondaryContainer),
        trailingTextColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        chevronColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      focused: TanreiTreeViewConditionStateTokens(
        containerColor: .role(.secondaryContainer),
        labelColor: .role(.onSecondaryContainer),
        supportingTextColor: .role(.onSecondaryContainer),
        trailingTextColor: .role(.onSecondaryContainer),
        iconColor: .role(.onSecondaryContainer),
        chevronColor: .role(.onSecondaryContainer),
        stateLayerColor: .role(.onSecondaryContainer)
      ),
      pressed: TanreiTreeViewConditionStateTokens(
        containerColor: .role(.secondaryContainer),
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
      labelTypescale: cupertinoTypescale.body,
      iconSize: 20,
      chevronSize: 20
    ),
    compact: TanreiTreeViewDensityTokens(
      containerHeight: 32,
      containerPaddingBlock: 6,
      containerPaddingInline: 8,
      containerGap: 8,
      levelIndent: 24,
      labelTypescale: cupertinoTypescale.bodySmall,
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
    opacity: 0.7
  ),
  disabled: TanreiTreeViewStateTokens(
    opacity: 0.38
  )
)

extension TanreiSystem {
  /// The "cupertino" design system.
  public static let cupertino = TanreiSystem(
    id: "cupertino",
    intents: [.error, .info, .primary, .secondary, .success, .warning],
    colors: TanreiColorSchemes(
      light: cupertinoLightColors,
      lightMedium: cupertinoLightMediumColors,
      lightHigh: cupertinoLightHighColors,
      dark: cupertinoDarkColors,
      darkMedium: cupertinoDarkMediumColors,
      darkHigh: cupertinoDarkHighColors
    ),
    typescale: cupertinoTypescale,
    shape: TanreiShape(
      extraExtraLarge: 32,
      extraLarge: 20,
      extraLargeIncreased: 24,
      extraSmall: 4,
      full: 9999,
      large: 14,
      largeIncreased: 16,
      medium: 10,
      none: 0,
      small: 8,
      cornerSmoothing: 0.6
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
      focusStateLayerOpacity: 0.1,
      hoverStateLayerOpacity: 0.08,
      pressedStateLayerOpacity: 0.1
    ),
    measure: TanreiMeasure(
      borderHairline: 1,
      borderThick: 2,
      breakpointExpanded: 1024,
      breakpointMedium: 600,
      focusInnerWidth: 0,
      focusOffset: 1,
      focusOuterWidth: 3,
      iconExtraSmall: 16,
      iconLarge: 32,
      iconMedium: 24,
      iconSmall: 20,
      targetPointer: 44,
      targetSpacing: 8,
      targetTouch: 48
    ),
    typefaces: cupertinoTypefaces,
    icon: TanreiIconStyle(
      families: TanreiIconFamilies(
        unselected: cupertinoTypefaces.icon,
        selected: cupertinoTypefaces.icon
      ),
      weight: 300,
      markWeight: 300,
      fillUnselected: 0,
      fillSelected: 1,
      opticalSizeMin: 20,
      opticalSizeMax: 48
    ),
    behavior: TanreiBehavior(
      focusStyle: .ring,
      linkUnderline: .always,
      pressedFeedback: .dim,
      requirementMark: .none,
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
        linear: TanreiCubicBezier(0, 0, 1, 1),
        standard: TanreiCubicBezier(0.2, 0, 0, 1),
        standardAccelerate: TanreiCubicBezier(0.3, 0, 1, 1),
        standardDecelerate: TanreiCubicBezier(0, 0, 0, 1)
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
    elevation: cupertinoElevation,
    accordion: cupertinoAccordionTokens,
    appBar: cupertinoAppBarTokens,
    appShell: cupertinoAppShellTokens,
    avatar: cupertinoAvatarTokens,
    badge: cupertinoBadgeTokens,
    bottomSheet: cupertinoBottomSheetTokens,
    breadcrumbs: cupertinoBreadcrumbsTokens,
    buttonGroup: cupertinoButtonGroupTokens,
    buttonWithMenu: cupertinoButtonWithMenuTokens,
    button: cupertinoButtonTokens,
    calendar: cupertinoCalendarTokens,
    callout: cupertinoCalloutTokens,
    card: cupertinoCardTokens,
    carousel: cupertinoCarouselTokens,
    chatComposer: cupertinoChatComposerTokens,
    checkbox: cupertinoCheckboxTokens,
    chip: cupertinoChipTokens,
    codeBlock: cupertinoCodeBlockTokens,
    colorInput: cupertinoColorInputTokens,
    combobox: cupertinoComboboxTokens,
    copyButton: cupertinoCopyButtonTokens,
    dateTimePicker: cupertinoDateTimePickerTokens,
    descriptionList: cupertinoDescriptionListTokens,
    dialog: cupertinoDialogTokens,
    divider: cupertinoDividerTokens,
    dropZone: cupertinoDropZoneTokens,
    embeddedTextInput: cupertinoEmbeddedTextInputTokens,
    emptyState: cupertinoEmptyStateTokens,
    fabMenu: cupertinoFabMenuTokens,
    fieldGroup: cupertinoFieldGroupTokens,
    field: cupertinoFieldTokens,
    figure: cupertinoFigureTokens,
    fileItem: cupertinoFileItemTokens,
    filePicker: cupertinoFilePickerTokens,
    fileUpload: cupertinoFileUploadTokens,
    imagePreview: cupertinoImagePreviewTokens,
    inlineCode: cupertinoInlineCodeTokens,
    inputBox: cupertinoInputBoxTokens,
    keyboardShortcut: cupertinoKeyboardShortcutTokens,
    linkCard: cupertinoLinkCardTokens,
    link: cupertinoLinkTokens,
    list: cupertinoListTokens,
    loadingIndicator: cupertinoLoadingIndicatorTokens,
    mainActionButton: cupertinoMainActionButtonTokens,
    menu: cupertinoMenuTokens,
    menubar: cupertinoMenubarTokens,
    modalLayer: cupertinoModalLayerTokens,
    navigationBar: cupertinoNavigationBarTokens,
    navigationDrawer: cupertinoNavigationDrawerTokens,
    navigationRail: cupertinoNavigationRailTokens,
    numberInput: cupertinoNumberInputTokens,
    oneTimeCodeInput: cupertinoOneTimeCodeInputTokens,
    pageHeader: cupertinoPageHeaderTokens,
    pagination: cupertinoPaginationTokens,
    popover: cupertinoPopoverTokens,
    progressIndicator: cupertinoProgressIndicatorTokens,
    prose: cupertinoProseTokens,
    radioButton: cupertinoRadioButtonTokens,
    search: cupertinoSearchTokens,
    segmentedButton: cupertinoSegmentedButtonTokens,
    select: cupertinoSelectTokens,
    sideSheet: cupertinoSideSheetTokens,
    skeleton: cupertinoSkeletonTokens,
    slider: cupertinoSliderTokens,
    snackbar: cupertinoSnackbarTokens,
    stepper: cupertinoStepperTokens,
    steps: cupertinoStepsTokens,
    swatch: cupertinoSwatchTokens,
    switch: cupertinoSwitchTokens,
    tabView: cupertinoTabViewTokens,
    tableOfContents: cupertinoTableOfContentsTokens,
    table: cupertinoTableTokens,
    tabs: cupertinoTabsTokens,
    tagGroup: cupertinoTagGroupTokens,
    tag: cupertinoTagTokens,
    textInput: cupertinoTextInputTokens,
    timeline: cupertinoTimelineTokens,
    toolbar: cupertinoToolbarTokens,
    tooltip: cupertinoTooltipTokens,
    treeView: cupertinoTreeViewTokens
  )
}

// ── Vocabulary extensions of "cupertino" ────────────────────────────────────────
// Typed names for what this design system adds to Tanrei: steps, color roles and component values it
// declared, and the tokens of its own namespace. Everything above has the shape of every design system.

extension TanreiTypescale {
  /// The `body-callout` step "cupertino" adds to typescale. Read from a design system that does not have it, this is
  /// the value "cupertino" gives it (reported in debug builds).
  public var bodyCallout: TanreiTextStyle {
    if let value = self["body-callout"] { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no typescale step \"body-callout\"; using the value of \"cupertino\"")
    return cupertinoTypescaleBodyCallout
  }
  /// The `body-subhead` step "cupertino" adds to typescale. Read from a design system that does not have it, this is
  /// the value "cupertino" gives it (reported in debug builds).
  public var bodySubhead: TanreiTextStyle {
    if let value = self["body-subhead"] { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no typescale step \"body-subhead\"; using the value of \"cupertino\"")
    return cupertinoTypescaleBodySubhead
  }
  /// The `caption-small` step "cupertino" adds to typescale. Read from a design system that does not have it, this is
  /// the value "cupertino" gives it (reported in debug builds).
  public var captionSmall: TanreiTextStyle {
    if let value = self["caption-small"] { return value }
    TanreiDiagnostics.report("Tanrei: the current design system has no typescale step \"caption-small\"; using the value of \"cupertino\"")
    return cupertinoTypescaleCaptionSmall
  }
}
