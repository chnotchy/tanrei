---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Button: `destructive` marks an action that deletes or discards something a person may not get back (Delete, Discard,
Remove member). It goes with every variant and keeps that variant's emphasis, in the error color role: filled is the
error color with on-error, tonal the error container with on-error-container, and elevated, outlined and text keep
their own container with the label, the icon (and an outlined button's edge) in the error color. Disabled, a
destructive button looks like any disabled button of its variant. A toggle ignores it, and a debug build reports the
pair. It adds a color and no semantics: the label still says what is destroyed. An icon-only button and a dialog's action
that takes the dialog's variant take it too; the Button group's and the dialog's guidance now name it
as the look of a destructive confirming action.

The vocabulary grows: `comp.button.<variant>.destructive.{container,label,icon,outline,state-layer}.color` and their
per-state tokens, in every platform's generated tokens and in every shipped system, where they follow the error roles.
The native platforms map the prop (SwiftUI: `role: .destructive`) and do not draw it yet; their notes say so.

New baselines, the intended result of this change: button `filled-destructive`, `tonal-destructive`,
`elevated-destructive`, `outlined-destructive`, `text-destructive`, `filled-destructive-leading-icon`,
`text-icon-destructive`, `filled-destructive-disabled` and `outlined-destructive-disabled`. No existing baseline
changes.
