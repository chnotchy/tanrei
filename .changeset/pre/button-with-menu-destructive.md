---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Button with menu: `destructive` marks a main action that deletes or discards something a person may not get back
(Delete, with "Delete all versions" in its menu). Both halves keep the variant's emphasis and take the error color role
in it, as a destructive Button of the same variant does: filled is the error color with on-error, tonal the error
container with on-error-container, and elevated and outlined keep their own container with the label and the chevron
(and an outlined one's edge and divider) in the error color. Each half shows hover, focus and press from the destructive
parts of its own state. Disabled, it looks like any disabled button with menu of its variant. It is not passed to the
menu's items: an item that deletes carries its own `destructive`. It adds a color and no semantics: both halves keep
their roles, names and states, and the label says what is destroyed.

The vocabulary grows: `comp.button-with-menu.<variant>.destructive.{container,label,outline,divider,state-layer}.color`
and their per-state tokens, in every platform's generated tokens and in every shipped system. Container, label and
outline alias Button's `comp.button.<variant>.destructive.*`, so the two components agree; the divider keeps the
variant's own (an outlined one's is its edge color, as without destructive). The native platforms map the prop
(SwiftUI: `role: .destructive`, on the leading half) and do not draw it yet; their notes say so.

New baselines, the intended result of this change: button-with-menu `filled-destructive`, `tonal-destructive`,
`elevated-destructive`, `outlined-destructive`, `filled-destructive-gap`, `filled-destructive-narrow`,
`filled-destructive-disabled` and `filled-destructive-open`. No existing baseline changes.
