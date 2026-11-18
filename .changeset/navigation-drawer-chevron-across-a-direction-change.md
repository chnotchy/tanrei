---
'@tanrei/web': patch
---

Navigation drawer: an open group's start chevron no longer turns when the layout direction around the drawer changes.
The chevron turns the other way in right-to-left, so the change gave it the other quarter turn, and its transition ran
from one to the other in every engine. The drawer now hears of the change before any style is computed for it and
computes the chevron's turn for the new direction without its transition, so the chevron is drawn turned the new way
at once, as the rest of the drawer is, and no turn begins (a page hears no `transitionrun` or `transitionend` for it).
