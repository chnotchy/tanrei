---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
'@tanrei/token-engine': minor
'@tanrei/cli': minor
'@tanrei/mcp': minor
---

Initial release. Tanrei is one design system shipped to five platforms — Web Components (with React wrappers), SwiftUI,
Jetpack Compose, Flutter and React Native — from one set of DTCG design tokens and platform-neutral component specs.
This release includes the token pipeline and its generated outputs for every platform, the default `tanrei` system and
the shipped presets, the components listed in the [status matrix](https://tanrei.chnotchy.com/status/) at the status shown there
for each platform, the token engine, the CLI, and the MCP server.

Every published package carries its LICENSE and NOTICE, and what a build bundles (Lit in `@tanrei/web`'s
`dist/tanrei.bundle.js`; the code and fonts of the Theme Studio app in `@tanrei/cli`) ships with its licences in
`THIRD_PARTY_LICENSES.md`.
