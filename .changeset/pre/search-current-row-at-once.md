---
'@tanrei/web': patch
---

A search view that opens now shows its own motion only. The row it makes current as it opens (the query row, or the
first result) appears current from the view's first frame; before, it faded into the focused state over 250 ms after
the view was first drawn. This was seen in every engine: for results in the docked, full-screen and dialog views, and
for the query row in a modal view opened from a trigger. A row the person makes current afterwards, with an arrow key,
still moves. `afterTwoFrames()` (where settling ends) is now exported from the primitives.
