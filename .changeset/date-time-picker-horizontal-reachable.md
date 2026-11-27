---
'@tanrei/web': patch
---

Date and time picker: `layout="horizontal"` draws the horizontal layout where its columns fit the surface, and the
vertical one where they do not, deciding again as the surface's room changes (DTM-9). It used to keep the horizontal
layout in any window: at 320 px wide, a date-time picker's body scrolled sideways by 140 px on top of scrolling up
and down, and its columns were centred so that 140 px of the calendar's start (146 px in a docked picker) lay where no
scroll reached. WCAG 1.4.10 (Reflow) asks that content at 320 CSS px need no scrolling in two directions, and a
calendar beside a time section is not a layout whose meaning needs two dimensions. Where the columns fit, the layout
stays as the product chose it.
