---
'@tanrei/web': patch
---

Modal layer, image preview, navigation drawer and date-time picker: opened in the same task above a dialog, a sheet, a
modal picker or a modal drawer that has not moved focus in yet, each now returns focus on closing to the element that
surface moves focus to as it opens, as two dialogs or two sheets already did. Before this, it returned focus to wherever
the lower surface's `showModal()` had put it, such as its first button or the dialog element. A modal date-time picker,
and a modal navigation drawer whose items are drawn after it opens, now also tell a surface opened above them in that
task where they move focus, so that closing it returns focus to the calendar's active day (or the hour wheel, or the
selector) or to the selected destination. The modal layer's MDL-8 now says what happens when two modal layers open in
the same update.

The byte budget of `@tanrei/web/all` goes from 667300 to 667400 bytes gzip (667351 measured, 139 more than before this
change): the modal date-time picker and the modal navigation drawer now say where they move focus as they open, and
when they have, and every modal surface asks the modal layer for where focus goes back. The picker's three ways of
giving focus now share the one target they name and the drawer checks one thing less, which took 39 bytes back. No
component's own bundle goes over its budget.
