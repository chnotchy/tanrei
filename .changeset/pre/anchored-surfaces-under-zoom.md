---
'@tanrei/web': patch
---

A surface placed against its anchor now stands at its anchor when an ancestor sets CSS `zoom`. The top layer takes the
zoom of the surface's ancestors, so the surface was drawn larger and its `top` and `left` were drawn at the zoom too: a
tooltip whose anchor stood at (280, 320) inside a `zoom: 2` box was drawn near (500, 520). The popover, the select's and
the combobox's lists, the tooltip, the menu and its submenus, the docked date-time picker, the search's docked view and
the FAB menu's items are now placed in the window's pixels: each stands against its anchor as it does with no zoom, its
offset, its window margin and its arrow drawn at the zoom, and still inside the window. A full-width row of actions (a button
group's, and a popover's, a dialog's, a side sheet's or a date-time picker's) is measured in its own pixels, so a zoom
no longer widens the surface or stacks actions that fit in a row. The slider's
value indicator, which already did this, now uses the same shared measure. Nothing changes without a zoom.
