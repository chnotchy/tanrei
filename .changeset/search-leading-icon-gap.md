---
'@tanrei/web': patch
'@tanrei/tokens-build': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
'@tanrei/react-native': patch
---

**Visual change, intended — a search bar's text no longer touches its search glyph.** `comp.search.container.gap` is
derived from the bar's buttons' targets and is 0 in the default system since its minimum target became 36, and it was
also the space after the search glyph, so the query and the placeholder stood right against the glyph. The glyph is no
button: the space after it is now a decision of its own, the new `comp.search.leading-icon.gap` (the trigger's gap, 8
in the default system), and the input stands the larger of it and `comp.search.container.gap` after the glyph (SRC-1).
Nothing else in the bar or the full-screen header moves, and the presets' bars do not move: their gap is already 8. The web draws it; the native platforms, all lagging for the
search, do not yet read the token.

The snapshot baselines of every search fixture whose bar shows the search glyph differ for this and are to be recorded
again.
