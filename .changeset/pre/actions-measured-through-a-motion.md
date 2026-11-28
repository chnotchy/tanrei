---
'@tanrei/web': patch
---

Dialog, side sheet and popover actions: whether the actions stand in a row or a column, and the width the container
is sized to, are now measured from the actions' laid-out widths. They were measured from their drawn widths, which a
motion that scales the surface makes smaller (an entrance grows it from `appear.scale`), and compared with the box's
laid-out width. When the actions were laid out again during such a motion, the row was decided again and the
container resized in every frame until the motion ended, flipping between a row and a column on the way. WebKit plays
a dialog's entrance again when a custom property is written on the root while it is open, so there the dialog did
this after every such write.
