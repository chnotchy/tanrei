---
'@tanrei/token-engine': patch
'@tanrei/tokens-build': patch
'@tanrei/studio': patch
---

A `contrast-pick` on a color role whose candidates are `ref.palette` tones no longer fails the build with
`unknown color role`. The role aliases the tone it picks, and the per-state component colors that read the role (a
filled button's label on `on-primary`, for one) now follow that alias into the palette. Before, they looked the tone
up as a role. In Theme Studio, a layer that sets such a pick now previews instead of reporting the error.
