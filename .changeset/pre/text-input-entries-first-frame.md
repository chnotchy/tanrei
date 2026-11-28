---
'@tanrei/web': patch
---

Text input, Field and Chip field: a filled or outlined input that appears holding entries (chips in its `entries`
slot) floats its label from its first frame. The label is no longer drawn over the chips for the first frames and then
moved up about 40 px over the label motion. The input now reads its entries when it first updates, instead of waiting
for the slot's `slotchange`. A change of entries later still floats or rests the label with its motion, as before.
