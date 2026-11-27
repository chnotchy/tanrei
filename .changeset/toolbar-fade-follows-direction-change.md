---
'@tanrei/web': patch
---

Toolbar: when the layout direction changes while the items scroll before a run kept at the end, the fade is measured again for where the items now stand. A change of direction moves the scroll position back to the start, and Firefox fires no scroll event for that move: the fade stayed at the end the items had lain beyond, so the first item was faded at the start edge and a cut piece of the item before Send stood against it. No baseline changes.
