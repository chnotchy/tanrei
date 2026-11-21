---
'@tanrei/web': patch
'@tanrei/react': patch
---

A surface that is closed or leaving takes no pointer input, in every component (MOT-7, a new shared motion principle the specs of the menu, popover, select, combobox, tooltip, FAB menu, snackbar, dialog, side and bottom sheets, image preview, date-time picker, search, modal layer and navigation drawer cite): a press where it is still drawn reaches what lies under it, and the pointer on it is not hover. A menu closed by a choice took the press its surface still covered while it left, so a second menu's anchor under it did not open its menu; a leaving FAB menu, snackbar and docked date-time picker did the same. The rule is part of `appearStyles()`, which gains a `box` option for the box round the motion element that holds its open state; the anchored surface's and the tooltip's own copies of the rule are gone. A modal surface is no longer modal from the moment it closes, as before: the page is not inert and its scrim takes no press while it leaves. No baseline changes.
