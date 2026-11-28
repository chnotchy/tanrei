---
'@tanrei/token-engine': minor
'@tanrei/tokens-build': minor
'@tanrei/studio': patch
---

**A product's brand color reaches its primary roles.** A layer that declares a palette named after a core intent gives
that intent's roles their values: a product on the default system — whose primary is drawn from `neutral` — that
declares `"palettes": { "primary": { "source": { "seed": "#2563eb" } } }` now has `primary`, `on-primary`,
`primary-container`, `on-primary-container` and `inverse-primary` drawn from that palette in every scheme and contrast
level, held by the same contrast checks, and links follow the primary as before. Until now the palette was generated and
nothing read it: the filled Button, the selected controls and links stayed black. A `tone` rule that a layer before the
palette wrote for one of those roles from another palette gives way; a rule written by the layer that declares the
palette, or by a later one, still wins, and a system whose rules already read the intent's palette (m3-like,
cupertino) keeps its own tones. A system that changes a status color keeps the default system's quiet status
containers. The merged system records which layer gave the chain each palette (`paletteLayers`), and the palette engine
exposes the operation a role is valued by (`roleOperation`).

Theme Studio's brand color writes the palette alone — it no longer writes the five primary roles into the file beside
it — and the swatch beside it in the panel, blank until now, shows the primary the brand gives. A layer loaded, pasted or
set through the page's API with only a `primary` palette is drawn in its brand color too.
