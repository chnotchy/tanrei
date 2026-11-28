---
'@tanrei/web': patch
---

Navigation drawer: a collapsible modal drawer (the column presentation of a responsive drawer, 600 to 1023 px wide)
no longer changes its look at once when it opens or closes. It used to open in the modal drawer's look from the first
frame, and to close in that look until the end, when the column took its place in one frame: the container color, the
rounded end corners, the shadow and the end edge all changed at once. Now its color, elevation, end corners and end
edge move between the column's and the modal drawer's over the same motion as its width. The drawer leaves the top
layer only after that motion has ended, so the last frame of the close looks exactly like the column. The items keep
their scroll position between the column and the open drawer.

A modal drawer now slides out (or narrows) while it is still in the top layer, and closes once its own transitions have
finished. Before, it waited on a timer, or on the `overlay` transition, which Firefox and Safari do not run. In those
browsers the drawer and its scrim used to disappear at once, and the column was empty until the timer ran out. Focus
now returns to where it was when that motion ends, not when the close begins.
