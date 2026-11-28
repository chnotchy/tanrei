---
'@tanrei/web': patch
---

Popover, select and combobox surfaces: the check each frame makes of what the placement depends on (the anchor's box,
the window, the surface's size) now reads in the frame's read phase, after the frame's own style and layout. It used
to read in a frame callback, before the frame had styled the page. After a click that opens a popover, the frames that
follow it forced three style passes of the whole page (8 ms in Chromium on a docs page); they now force none. The
surface is still placed again before the frame that shows a change is painted.
