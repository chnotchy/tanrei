---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

Tokens: `sys.state.selected-state-layer-opacity` (0.16, twice the hover layer) is the quiet selection's step. A
list's selected option, a menu's current link item and its checked row (at medium and high contrast), the chosen
option of a select and a combobox, the tonal tabs' indicator and the tint inside a checked radio ring now take it,
where each wrote 16 % itself; a design system that sets it moves them all together. The vocabulary grows by this one
token (CSS `--tanrei-sys-state-selected-state-layer-opacity`, and `selectedStateLayerOpacity` in each platform's
state group). Every shipped system keeps the value it drew, so nothing looks different and no baseline moves.
