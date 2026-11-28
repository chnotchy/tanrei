---
'@tanrei/web': patch
---

Carousel: a change of the layout direction around the carousel now keeps the item at rest wherever the page reads its
layout before the next frame. The row's scroll offset is written for one direction (a right-to-left row scrolls to a
negative `scrollLeft`); when the direction flipped and the page laid itself out before the carousel saw the change, the
browser moved the offset into the new direction's range, and the carousel took that scroll for a move and rested on the
first item. A scroll that arrives while the row is still arranged for the other direction is now ignored, and the row is
arranged for the new direction from the offset it was placed at: the same item, as far along in reading order.
