---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Dialog: a close button, a choice of width, and the reason of a dismissal.

- `closable` and `closeLabel` (`close-label`) draw an icon-only small Button with the close glyph at the end of the
  header, as the popover and the side sheet do. Pressing it dismisses the dialog with the reason `close`. It is drawn
  only while the dialog is dismissible (`closedby` is not `none`): a dialog the person must answer offers no way out
  but its actions. New token `comp.dialog.close-button.variant` (text in the default system).
- `width`: `content` (the default, as before: as wide as its widest part, between the minimum and maximum width),
  `small`, `medium` or `large` — new tokens `comp.dialog.width.small`, `.medium` and `.large` (400, 560, 800). A fixed
  width is never wider than the window less the margins; a compact window places every width as it places content.
- The web's `cancel` is now a CustomEvent whose `detail.reason` is `escape`, `back`, `scrim` or `close`. It is still
  cancelable, and a listener that reads it as a plain Event is unchanged.

SwiftUI, Compose, Flutter and React Native receive the new tokens only; the close button, the widths and the reason
wait for those platforms to catch up. Baselines: the fixtures `closable`, `width-small`, `width-large` and
`compact-closable` are new; no existing baseline changes.
