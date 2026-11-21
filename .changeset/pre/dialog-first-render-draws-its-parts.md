---
'@tanrei/web': patch
---

Dialog: the first render already draws the parts its children fill (the icon, the content, the actions). The children
were read after that render, so a dialog with children rendered twice when it was connected, and Lit's development
build warned `change-in-update` (an update scheduled from inside an update). Nothing a product sees or uses changes.
