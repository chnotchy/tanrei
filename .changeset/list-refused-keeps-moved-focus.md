---
'@tanrei/web': patch
---

A reorderable list no longer takes focus back from where a person moved it. When the product does not reorder the
items after a move (the move is refused once the reorder motion's time has passed), the list gave focus to the handle
of the item standing where the moved one stood whenever focus was outside the list — also when the person had moved it
meanwhile to another control, such as the move menu of another list, which then closed. Focus now goes to the handle
only where it was lost (on the page itself, or on an element no longer on the page), as it already did after an item
was taken away.
