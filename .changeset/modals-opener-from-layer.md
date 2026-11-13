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
