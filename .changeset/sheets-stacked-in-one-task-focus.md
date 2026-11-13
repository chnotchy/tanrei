---
'@tanrei/web': patch
---

Bottom sheet and side sheet: two modal sheets opened in the same task now stack as if the later had opened from the
earlier, as two dialogs already did. Focus goes into the later one. Closing it returns focus to the element the earlier
sheet moves focus to as it opens: the element marked `autofocus`, or the sheet itself. Closing the earlier one then
returns focus to the element that had it before either opened. Before this, the later sheet returned focus to wherever
the earlier sheet's `showModal()` had put it, such as its close button. A dialog opened above a sheet in the same task
now gets the same focus return. The bottom sheet's BSH-23 and the side sheet's SSH-15 now say what happens when two
modal sheets open in the same update.
