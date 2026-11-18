---
'@tanrei/web': patch
---

Navigation drawer: an open group's start chevron no longer turns when the layout direction around the drawer changes.
The chevron turns the other way in right-to-left, so the change gave it the other quarter turn, and its transition ran
from one to the other in every engine. The drawer now hears of the change in the frame that draws it and ends that turn
before the frame is painted, so the chevron is drawn turned the new way at once, as the rest of the drawer is.
