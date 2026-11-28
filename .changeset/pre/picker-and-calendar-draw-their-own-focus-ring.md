---
'@tanrei/web': patch
---

Date-time picker and calendar: the focus indicator of the hour and minute selectors, and of the calendar's days, years
and view toggle, is now the component's own, as the wheels' and the period's already were, so it is the same in every
browser (DTM-22, CAL-19). After a pointer's press on one of them, a key that works it (an arrow, Enter, Space, a digit
that stays on the hour) now shows the indicator in Firefox too, where only Chrome and Safari showed it, and a press on
the hour dial hands the minute selector the indicator exactly when the hour selector had it. In Safari 17.5 to 18.3,
which draws a modal dialog's first focus after a click with the indicator, a modal picker opened by a press no longer
shows it on the calendar's day or year or on the selector. The calendar's `focus({ focusVisible })` now shows the
indicator or not as asked in every browser, also on a day that already has focus. The indicator looks as before, in
forced colors too.
