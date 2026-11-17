---
'@tanrei/web': patch
---

List: when the product changes the order of a reorderable list, the items move from their old places starting in the
first frame drawn after the change, in every engine, as items that arrive or leave already did. WebKit dated the moves
from the frame drawn before the task that changed the order, so where that task took longer than the reorder motion
(the product rendering its rows on a loaded machine) the items jumped to their new places with no frame of the motion.
