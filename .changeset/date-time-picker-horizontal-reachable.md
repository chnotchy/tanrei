---
'@tanrei/web': patch
---

Date and time picker: with `layout="horizontal"` in a window narrower than its two columns, every part of the picker
can be scrolled to. The body centred its columns, which splits their overflow between its two sides, and a scroll
reaches only the end side: at 320 px wide, 140 px of the calendar's start lay where no scroll reached (146 px in a
docked picker). The columns are now centred only where they fit and otherwise start at the body's start edge, and
the body scrolls sideways to the end of the time section. The layout stays horizontal, as the product chose it; a
picker that should change its layout to fit the window uses `layout="auto"` (DTM-9).
