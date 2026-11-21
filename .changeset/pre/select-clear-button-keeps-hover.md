---
'@tanrei/web': patch
---

A clearable select stays hovered while the pointer rests on its clear button: the button stands over the container
from outside it, and the box went back to its resting paint under it. The room the select keeps for the button is
now the container's own, as SEL-22 says the whole container is one target: while nothing is chosen, the pointer in
that room hovers the box and a press there opens the list (it did nothing before), and around a drawn button the
same holds outside the button's target. Only the hovered pictures of a clearable select change; no baseline is
recorded in that state.
