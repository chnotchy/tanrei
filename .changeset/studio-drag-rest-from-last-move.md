---
'@tanrei/studio': patch
---

Theme Studio no longer computes the layer in the middle of a drag on a page that is slow to bring its next frame.
A palette's color or a dial that is dragged is drawn without computing the layer, and the layer is computed once the
pointer has rested 150 ms. That rest was counted from the frame that drew the last value, and a move that came after
it did not stop the count: when the moves of one frame took longer than the rest to handle, the Studio took the
pointer for one at rest and computed the whole layer while it was still moving. A move now puts the rest off at once.
