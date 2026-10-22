---
'@tanrei/docs': patch
---

Documentation site: the Accessibility and Color pages state the contrast the token build enforces, and no less. Text
in the two high-contrast schemes is held at 7:1, not 4.5:1; large text has no lower threshold (every text role is held
at 4.5:1); and a status's mark is held at 3:1 on its own tonal container. Each ratio on the two pages, in every
language, is read from the build's own constants (`CONTRAST_THRESHOLDS`, now exported by the token build's invariants),
so a page cannot drift from what the build checks.
