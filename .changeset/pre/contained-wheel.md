---
'@tanrei/web': patch
---

In Firefox, a wheel at the end of a box that scrolls inside a component no longer scrolls the page behind it. Firefox
keeps to `overscroll-behavior: contain` only within one wheel transaction, which a wheel that scrolls nothing neither
begins nor prolongs: a wheel at an end the box already stood at, or one 1.5 s after the last that scrolled it, went to
the page. Each of these boxes now cancels a wheel turned toward the end it stands at, along the axis it scrolls: the
menu's items, the select's and the combobox's list, the popover's content, the search's docked view, the calendar's
year view, a row or a column of tabs, a toolbar that scrolls, the carousel's row, a compact table of contents, an
expanded snackbar's text, a docked date-time picker's body, a standard side sheet's and bottom sheet's content, and the
app shell's navigation and aside (as the navigation drawer's items already did). A wheel with Ctrl, one across the
axis the box scrolls, and one that the box or a scroller inside it can still take go on as before. Chromium and Safari
already kept the page still, and nothing changes there.

The navigation drawer's items no longer cancel a wheel turned more sideways than down at their end.
