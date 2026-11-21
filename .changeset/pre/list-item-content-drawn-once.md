---
'@tanrei/web': patch
---

List: an item named by the text of its content is drawn in one update when it is built instead of two. Its content's
first `slotchange` used to draw it again although its first update had already read that content. It is still drawn
again when its content changes what it draws: its name, its description, or the name of its handle.
