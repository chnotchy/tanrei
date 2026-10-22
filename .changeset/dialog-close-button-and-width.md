---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Dialog: a choice of width, and the reason of a dismissal.

- `width`: `content` (the default, as before: as wide as its widest part, between the minimum and maximum width),
  `small`, `medium` or `large` — new tokens `comp.dialog.width.small`, `.medium` and `.large` (400, 560, 800). A fixed
  width is never wider than the window less the margins; a compact window places every width as it places content.
- The web's `cancel` is now a CustomEvent whose `detail.reason` is `escape`, `back` or `scrim`. It is still
  cancelable, and a listener that reads it as a plain Event is unchanged.

SwiftUI, Compose, Flutter and React Native receive the new tokens only; the widths and the reason wait for those
platforms to catch up. Baselines: the fixtures `width-small` and `width-large` are new; no existing baseline changes.
(This change once also brought a close button; it was withdrawn before any release, see the dialog's "no close
button" changeset.)
