---
'@tanrei/web': patch
---

Combobox: the chevron's hit area no longer covers the end of the input or the last chip on a line. It used to reach the
input's end and grow to at least the minimum target wherever there was less room. On a touch screen, a tap on the last
characters of the input, or on the remove button of a chip that ended a line, opened or closed the list. Now the hit
area runs from the container's end edge to the middle of the gap before the chevron. That is container.gap to the input
or the chip, and action-gap to the clear button, the same rule Buttons in a row follow. With the default system's
medium and large sizes this still gives at least the minimum target. Where a size or a layer leaves less room, the hit
area is the room. This applies to every combobox, including one inside a Combobox Field or a Field. The CMB-19 spec says
the same. No picture changes: the hit area is not drawn.
