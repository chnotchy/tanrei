---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Popover: the close button is tonal in the default system. **Breaking** (a look 0.1.0-next.0 shipped): the value of
`comp.popover.close-button.variant` goes from text to tonal.

Every close button is the same control: an icon-only Button of the small size with the close glyph, in the variant its
host names, tonal unless a system re-values it. The popover already drew a small Button (32 × 32 in the default
system); in the default system it now stands as a tonal Button — the secondary container with its glyph — so that it
reads as a control on any content. Its hover, focus and press are the Button's, as before.

- Changed token: `comp.popover.close-button.variant` = tonal (was text). A layer that wants the bare glyph sets it to
  text.
- `m3-like` (and so `m3-expressive-like`) and `cupertino` set it to text, the look they had: Material 3 closes a surface
  with a standard icon button, Apple's popovers with a bare glyph.

SwiftUI, Compose, Flutter and React Native have no popover yet; their generated tokens carry the new value. Baselines: the default
system's popover fixtures that draw the close button are recorded again; that is the intended result of this change.
