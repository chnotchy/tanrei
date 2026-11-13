---
'@tanrei/web': patch
---

Navigation drawer: the room its parent gives wins over its least width. The spec said both that a drawer's least
width wins over its greatest, the room included (NVD-97), and that an app shell's navigation is never wider than the
window less a touch target (APS-5). The drawer was already drawn at the room, so nothing reaches past its parent or
needs a sideways scroll to be reached (WCAG 1.4.10), as Android's drawer and Compose's drawer sheet also keep to the
room their parent gives. The spec now says so (NVD-97, APS-5, `minWidth`). What changed in the drawer: below its
least width, its resize handle said the least width as its value and its least and greatest; it now says the width
drawn, the room, for all three (the column's width stays its least where the drawer folds), so the value is never out
of the handle's range. A drag, a key or a press on the edge there still changes nothing and emits nothing, and the
width given comes back with the room.
