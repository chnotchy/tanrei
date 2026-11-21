---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Bottom sheet: a header with a headline and a small tonal close button.

Every close button is the same control: an icon-only Button of the small size with the close glyph, tonal unless a
system re-values it. The bottom sheet had none — its ways out were the drag handle and, for a modal sheet, the scrim —
so a standard sheet, or a sheet without a handle, needed a Close button of the product's own.

- New props, with the side sheet's names and meanings: `headline` (drawn in a header below the handle's row, a heading
  that names the sheet where `label` is empty), `closable` (false by default: the handle and the scrim stay the sheet's
  ways out), `closeLabel` (the close button's name; on the web `close-label`) and `dividerVisibility` (`auto`, `always`,
  `scroll`; on the web `divider-visibility`). The header stays while the content scrolls, and the sheet's heights count
  it.
- `close` gains the reason `close`: a press of the close button, in either form and whatever `dismissible` says, since
  it is a way out the product chose to draw.
- Debug builds report a close button without a name, a sheet with neither `label` nor `headline`, and a sheet with no
  handle and no close button that can still be dismissed (nothing on screen says how).
- New tokens: `comp.bottom-sheet.header.height`, `.header.gap`, `.header.padding-inline-end`, `.headline.typescale`,
  `.headline.color`, `.divider.color`, `.divider.width`, `.divider.visibility` and `.close-button.variant` (tonal).
  `m3-like` sets the variant to text, Material 3's standard icon button; `cupertino` keeps
  the tonal circle.

SwiftUI, Compose, Flutter and React Native are lagging and do not draw the header yet. Baselines: three new fixtures,
`modal-header`, `no-handle-header` and `standard-header`; the existing ones do not change.
