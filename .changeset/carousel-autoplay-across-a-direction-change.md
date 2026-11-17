---
'@tanrei/web': patch
---

Carousel: an autoplay interval that ends in the frame after the layout direction around the carousel changes, before
the carousel has heard of the change, now advances. The advance was written for the old direction — its scroll offset
given the other sign, which the row's new range cuts to its start — so the row stayed on its item and the interval
started again. The row is now arranged for the new direction first, and the advance follows at once, one item on in
reading order. A row already arranged for the new direction is not arranged again when the carousel hears of the
change, so an advance running by then keeps its motion.
