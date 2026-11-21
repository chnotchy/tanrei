---
'@tanrei/web': patch
---

A state an element's parts take in the last moments of its first frames now arrives without a motion, as MOT-3 says.
An element settles until two frames after its first update, and nothing in it starts a transition meanwhile; but a
state written after the last frame drawn while it settled — in a task before the frame callback that lets it go — was
styled in the same pass as the end of settling, and moved from the state before it. An image preview written open
showed it: its zoom-in control, enabled when the image has loaded, faded its colors in from disabled whenever the
image loaded in that gap. The page is now styled once, for every element let go in that frame, before settling ends.
