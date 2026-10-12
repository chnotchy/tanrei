# Changelog

All Tanrei packages version in lockstep; release notes are produced from changesets at the
repository root. This file is filled in at release time.

## 0.1.0-next.0

### Minor Changes

- f181fc2: Initial release. Tanrei is one design system shipped to five platforms — Web Components (with React wrappers), SwiftUI,
  Jetpack Compose, Flutter and React Native — from one set of DTCG design tokens and platform-neutral component specs.
  This release includes the token pipeline and its generated outputs for every platform, the default `tanrei` system and
  the shipped presets, the components listed in the [status matrix](https://tanrei.chnotchy.com/status/) at the status shown there
  for each platform, the token engine, the CLI, and the MCP server.
  
  Every published package carries its LICENSE and NOTICE, and what a build bundles (Lit in `@tanrei/web`'s
  `dist/tanrei.bundle.js`; the code and fonts of the Theme Studio app in `@tanrei/cli`) ships with its licences in
  `THIRD_PARTY_LICENSES.md`.

## 0.0.0

- Unreleased. Theme layer, interaction primitives and `TanreiButton`.
- **Breaking: tokens are read from a design system instance.** The static token classes
  (`TanreiSpace.space100`, `TanreiButtonTokens.containerHeightMedium`, `TanreiColors.light`, ...)
  are gone. `TanreiThemeData.system` carries a `TanreiSystem` (default: the generated
  `tanreiSystem`); read `TanreiTheme.of(context).system.space.space100`,
  `tanreiSystem.schemes.light`, and so on. A product or preset supplies its own generated
  `const TanreiSystem`. All constructor parameters are required; every part has `copyWith`.
- **Colors are paints.** Component color tokens are `TanreiPaint` (`role`, `mix`, `alpha`, `none`,
  `literal`), evaluated against the current scheme with `theme.paint(...)` / `paint.resolve(colors)`
  (premultiplied, identical to CSS `color-mix(in srgb)`). `TanreiColorRole` is now an open
  `extension type` over the role name instead of an enum; `TanreiColors.extra` holds roles a
  system declares beyond the vocabulary.
- **`TanreiButton` draws each state from that state's tokens** (container, label, outline,
  elevation, opacity, shape), easing between states with the component's motion tokens; pressed
  applies immediately. `TanreiStateLayer` is removed; the pure precedence function is
  `tanreiInteractionStateOf`. The default system renders exactly as before (golden baselines are
  unchanged).
- Button padding is directional: `padding-inline-start` / `-end` / `-start-with-icon` (RTL-aware)
  and `padding-block` per size. Heights stay minimums.
- Focus indicator: signed `offset`, optional inner stroke (`inner-width`, role `focus-ring-inner`),
  outer stroke (`outer-width`, role `focus-ring`). `focusRingGap` / `focusRingWidth` are removed.
- `TanreiTapTarget.minSize` is nullable and defaults to the system's touch target token.
