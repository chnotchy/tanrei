---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Dialog: a dialog has no close button. **Breaking** for anyone building from the main branch: the close button that
came in after 0.1.0-next.0 is withdrawn before any release carried it (0.1.0-next.0 never had it).

A dialog asks for a decision, and its way out without one is its dismissive action and, while it is dismissible,
Escape, the platform's back and a press on the scrim. Content that needs only a way out belongs in a side sheet, which
has a close button, or a bottom sheet.

- Web: `closable` and `close-label` are gone from `<tanrei-dialog>` (and `closable` and `closeLabel` from the React
  `Dialog`). Given either, the dialog draws nothing for it, and debug builds report that a dialog has no close button.
  Give the dialog a dismissive action instead: Cancel, or Close where there is nothing to cancel.
- `cancel`'s `detail.reason` is `escape`, `back` or `scrim`; `close` is no longer one of them.
- The `close-button` CSS part and the token `comp.dialog.close-button.variant`
  (`--tanrei-comp-dialog-close-button-variant`) are removed. The header is the icon and the headline alone.

SwiftUI, Compose, Flutter and React Native never had the close button; they lose only the token. Baselines: the
fixtures `closable` and `compact-closable` are removed with their images; no other baseline changes.
