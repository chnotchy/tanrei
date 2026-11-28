---
'@tanrei/web': patch
---

Number input and number field: a field that is hidden (itself or an ancestor `display: none`) keeps its steppers
beside its line. Hidden, every box reads as nothing, which the field took to mean the steppers stood below the line.
It then marked them as on a row of their own, so the frame it was shown again in drew them there, with the label
ending somewhere else. The next frame corrected it. A field that is not rendered now decides nothing and keeps what it
had.
