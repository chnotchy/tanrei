---
'@tanrei/web': patch
---

List row, tree view and navigation drawer: the show and hide delays of the tooltip that shows a cut text whole (and of
a collapsed drawer cell's name) are now read in the frame's read phase. They used to be read in the `pointerenter` and
`pointerleave` handlers, which made the browser style the page there whenever the hover had changed something. The
pointer coming onto a cut row now forces no style pass (one before). The wait is still timed from the moment the
pointer arrived or left; a wait shorter than a frame ends in the task after that frame's read phase.
