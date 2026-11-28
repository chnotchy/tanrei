---
'@tanrei/web': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
'@tanrei/swiftui': minor
'@tanrei/react-native': minor
---

Table: a body row that can be chosen is one target for a pointer, as a clickable card is. With `selection="multiple"`,
a press anywhere on the row — its text, its padding, its row header — changes the row's checkbox, with the same
`selectionchange` as a press on the checkbox. A link, a button, a field, a label or anything else in a cell that takes
a press keeps its own press and cursor, and the row is drawn at rest while the pointer is over it; a drag, a release
that ends a text selection (the text stays selectable and copyable), a press with a modifier key, another mouse
button, the second click of a double click and a click the product cancels change nothing. The header's checkbox
keeps its own cell, and a footer row, a placeholder row and a row without a value take no such press. The keyboard
stays on the checkbox: the row gets no role, no focus stop and no selected state.

Under a fine pointer the row is drawn hovered as a whole, with the pointer cursor, and a press draws it pressed for
press-hold, from new tokens of the row's own — `comp.table.row.unselected` and `comp.table.row.selected`, each with a
`state-layer.color` and hovered and pressed container and text colors — laid over the stripe or the chosen fill.
Under a system whose press is a ripple the row takes the pressed fill (a ripple has no one box across a row's cells),
and under `cupertino` the row has no hover and dims when pressed. It needs the element's script: without it a row
shows neither a state nor the pointer cursor (the selection cell no longer shows the pointer without script either),
and a press beside the checkbox changes nothing. The look at rest is unchanged in every shipped system.

The native packages carry the new row tokens in their generated table tokens (plain fields such as
`rowSelectedHoveredContainerColor`); their table is not implemented yet.
