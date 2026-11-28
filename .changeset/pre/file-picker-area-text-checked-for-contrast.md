---
'@tanrei/web': patch
---

**`<tanrei-file-picker>`: the drop area's texts are checked for contrast.** The dashed edge is an SVG over the whole area,
which axe's `color-contrast` rule took for an element covering the message and the limits: they were left incomplete
("overlapped by another element"). The texts are now positioned after it, above its box; the edge runs along the area's
edge, clear of them, so nothing an area draws changes.
