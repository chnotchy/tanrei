---
'@tanrei/web': patch
---

Navigation drawer: a page that is still loading no longer has the browser style and lay it out for a drawer's reads
before DOMContentLoaded. Each of these passes took 8 to 16 ms in Chromium and WebKit on a small page. What is drawn does
not change.

- The main action's report (NVD-39) is read only in a debug build: a production build reads nothing for it. In a debug
  build, until the document has been painted, it is read in the first frame's read phase.
- Until the document has been painted, the first header button's width (NVD-38) is read in the first frame's read
  phase, and written with that phase's writes before the frame is painted, not as the header's slot tells the drawer
  what it holds.
- A modal drawer written open in the page's markup is shown in the writes of the first frame's read phase, not in the
  write of its upgrade's turn: it is still drawn open at once, its scrim with it, and focus moves into it, in the first
  frame painted (NVD-19, MOT-4). Opening the dialog, holding the page's scroll and giving focus had the browser style
  and lay out the whole page several times while it loaded.
- A browser test holds a loading page with a responsive drawer (a main action and a header button) and an open modal
  drawer to no forced pass before DOMContentLoaded, apart from the responsive drawer's read of its breakpoints as it
  connects, which the test lists as known.
