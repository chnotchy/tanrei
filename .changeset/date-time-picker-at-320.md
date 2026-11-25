---
'@tanrei/web': patch
---

Date and time picker: a modal picker works in a window 320 px wide, the width WCAG 1.4.10 (Reflow) asks content to
work at.

- In the dial mode with the 12-hour clock, the time display needs about 276 px and a 320 px window leaves the time
  section 264 px. The hour and minute selectors now narrow equally where the section is narrower than the display
  needs (to about 90 px each there), never below their values or the minimum target, while the separator and the
  period selector keep their widths. The period selector used to stand 12 px outside the time section, over the
  surface's padding, and was cut at the surface's edge. The spec says this in DTM-21 and DTM-36.
- With `layout="auto"`, a date-time picker in a window short enough to try the horizontal layout checked whether that
  layout fit on the surface, whose body scrolls and so never overflowed it: at 320 or 360 px wide and 640 px tall it
  took the horizontal layout and cut the calendar and the time section at both edges. It now reads the body too and
  stays vertical (DTM-9).
