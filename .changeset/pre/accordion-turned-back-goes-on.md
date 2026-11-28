---
'@tanrei/web': patch
---

Accordion: an item opened again in the first half of its closing, or closed again in the first half of its opening,
goes on from where it is in every browser. Where the browser cannot move a height to `auto` in CSS (Firefox and
Safari at the time of writing), the item used to jump to its end in one frame. A change before the middle of the
motion makes the browser cancel the item's own motion clock, and the element took that cancel for the end of the
motion. It now follows the item's height until the motion ends.
