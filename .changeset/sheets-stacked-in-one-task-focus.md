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

Bundle budgets: the modal layer's budget rises from 16 800 to 16 900 bytes (gzip) and `@tanrei/web/all`'s from
667 200 to 667 300. Where a surface owes focus is now kept by the window's modal layer (`modalLayer.owesFocus()`,
`gaveFocus()`, `opener()`), which every modal surface imports, so the modal layer component's bundle carries it too,
although that component does not use it: 59 bytes more (16 788 to 16 847), against 12 bytes of room. The sheets now share
where they give focus (`sheetFocusTarget()`) rather than each keeping a copy, which brought `all` from 135 bytes over
main to 42 (667 170 to 667 212), still 12 over its budget. Moving the bookkeeping out of `modalLayer` would keep it out
of the modal layer's bundle, but every dialog and sheet asks the layer for it, and the layer is where the open surfaces
are known.
