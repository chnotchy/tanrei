---
'@tanrei/web': patch
---

Pagination, calendar and date-time picker: in Chrome and Edge before 145 and Safari before 18.4, focus that moves after
a pointer's press no longer shows a focus indicator (PGN-14, PGN-19, CAL-7, CAL-15, CAL-19, DTM-3, DTM-28). Those
browsers do not know `focus()`'s `focusVisible` option and drew that focus as the last one was drawn, so after keyboard
focus the indicator moved on with it:

- Pagination: pressing the control that has keyboard focus (next on the second-to-last page) put focus on the page now
  current with the indicator. There the press now takes the focus itself first, as a pointer's.
- Calendar: pressing a neighbouring month's day while a day had keyboard focus, or pressing the year that had keyboard
  focus, put focus on the new active day with the indicator. There the press now gives focus as the browser does.
- Date-time picker: a modal picker opened by a pointer's press showed the indicator on the day, the year or the selector
  it focused in Chrome and Edge before 145. There the focus the dialog gives is now kept as the browser drew it.

Safari before 18.4 still shows the indicator on a modal picker opened by a press, as it does on the focus of any modal
dialog it opens, and after a press on a pagination's link, which takes no focus from a press there.

In every browser, a modal date-time picker opened from the keyboard now shows the indicator on the focus it moves in:
whether the picker was opened from the keyboard was read after the dialog had taken focus from its opener, so it never
was. Browsers that know the option are otherwise unchanged.

`pressGivesFocus()` (a primitive): where `focus()` does not read `focusVisible`, a press on the element that has
keyboard focus lets that focus go, so that the press gives it again as a pointer's.
