---
'@tanrei/web': patch
---

Date and time picker: a docked picker is never wider than the window less `comp.date-time-picker.docked.viewport-margin`
on each side. It was capped at the whole window, so in a window 320 px wide a docked date or date-time picker was
320 px wide and stood against both edges of the window; it is now 304 px wide, 8 px inside each edge, and its calendar
narrows as the calendar does (DTM-2, DTM-36). Measured at 320 × 640 in Chromium, Firefox and WebKit, in English,
Japanese and Arabic, for dates, date ranges, times (wheels and dial, 12- and 24-hour) and dates with times.
