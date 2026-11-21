---
'@tanrei/web': patch
---

Carousel: a move the person starts — the previous and next controls, the indicator, the arrow keys, a settle — now
ends on its item when the layout direction around the carousel changes in the frame before the carousel hears of it.
That frame wrote the scroll offset for the old direction, with the other sign, which the row's new range cut to its
start. Where motion is reduced, that frame was the move's only one, and the row stayed where it was. A frame of the
carousel's own motion now hands the row to the arrangement for the new direction, which puts it on the motion's target
at once.
