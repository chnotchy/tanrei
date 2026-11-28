---
'@tanrei/web': patch
---

Navigation drawer: a change of form (folding to the icon column, unfolding, a collapsible modal drawer widening and
narrowing) now keeps its motion in force until the drawer's width motion has ended. Before, it ended on a page timer
of the change's duration. A motion that played more slowly outlasted that timer, for example on a slowed page or one
whose first frame came late after a long task. For the rest of the motion the parts the form recolors took the state
motion's duration instead of the change's, and a width drawn without motion (a drag, a change of room) stopped
moving with the change. Where motion is reduced, the change of form is drawn at once, so no motion of it is in force
even for a moment; before, it stayed in force until the next task. A drag's move that takes the place of the width's
motion still ends it, so the drag follows the press from there.
