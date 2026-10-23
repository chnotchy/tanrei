---
'@tanrei/web': patch
---

A toolbar whose overflow is a menu now shows its hidden items again when it is given more room, whatever its parent.
In a parent as long as its content (an inline-block, a flex item, a float, an absolutely placed box, a box in a shadow
root) the parent shrank to the items still shown and stayed that length when a box further up was widened. The toolbar
watched only its parent, so it never noticed: in a 240 px box widened to 600, four of ten items stayed shown in a
toolbar 232 px long. It now watches every box that holds it, up to the root, and only for its length along the
toolbar's axis. The same box shows all ten items in the frame after it is widened, and five when it is narrowed to
320 px.
