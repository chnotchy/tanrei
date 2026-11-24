---
'@tanrei/web': patch
---

**`<tanrei-date-time-picker>`: an unavailable hour, minute or period is marked inactive.** A wheel row or a dial number
outside `min` and `max` (DTM-50) now carries `aria-disabled="true"` beside `data-unavailable`. The rows and the dial are
hidden from assistive technology, so nothing is announced; a contrast checker now reads the faded value as the text of an
inactive control, which WCAG 1.4.3 exempts, instead of reporting it (axe's `color-contrast` reported 1.91:1 for the faded
rows of a bounded time on the wheels).
