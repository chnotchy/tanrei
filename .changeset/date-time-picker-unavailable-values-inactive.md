---
'@tanrei/web': patch
---

**Date-time picker: a time outside `min` and `max` is marked inactive.** An hour, a minute or a period the picker does not
offer (DTM-50) is drawn faded, as before, and its wheel row or dial number now carries `aria-disabled="true"` in place of
the private `data-unavailable` mark. The value is an inactive part of its control — it takes no input — so WCAG 1.4.3
holds its text to no contrast, and a checker such as axe now reads it that way instead of reporting the faded text. The
rows and the dial stay hidden from assistive technology, which hears the available range as each spin button's minimum
and maximum; nothing drawn changes.
