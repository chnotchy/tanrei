---
'@tanrei/web': minor
'@tanrei/react': minor
---

**Breaking — Dialog: in a compact window a dialog takes the bottom sheet's appearance.** This is Tanrei's rule for every
dialog and every popover in a window narrower than the component's `compact.window-width` (600 in the default system).
Below `comp.dialog.compact.window-width` a dialog is no longer a card 16 above the bottom edge and 16 from the sides
with four rounded corners: it is drawn as the bottom sheet is drawn — at the window's bottom edge, as wide as the window
up to `comp.bottom-sheet.container.max-width` (640) whatever `width` names, in the bottom sheet's color, elevation and
top corners, square at the bottom, its color under the bottom inset and above the on-screen keyboard — and it slides up
and down with the bottom sheet's motion (a fade where motion is reduced). It stays a dialog: the same element, props and
events, the same role, focus, inertness, scrim and dismissal, with no drag handle and no swipe.

`compactPresentation` (`compact-presentation`, `sheet` by default) set to `own` keeps one dialog centred in every
window. The `m3-like` and `cupertino` presets keep every dialog centred, as before (their compact width is 0).

Removed: the token `comp.dialog.motion.enter-offset`, which only the card's rise read; the sheet moves by the bottom
sheet's motion tokens.

Baselines: the dialog's `compact`, `compact-stacked` and `compact-closable` fixtures change as intended (the sheet in
place of the card), and the new `compact-own` is the centred dialog in a compact window.
