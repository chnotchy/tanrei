---
'@tanrei/docs': patch
---

Documentation site: the sidebar's row of the "All components" switch is as tall as the switch, however long the list.
Where its label takes two lines (Spanish, Japanese) the drawer's list shrank the row below the switch, and the sidebar
before the drawer is defined gave it its least height, each by a different amount, so the rows under it moved when the
drawer was defined. Before the drawer is defined, a row's label and a group's label stand on one line, cut with an
ellipsis, as the drawer draws them: a long label that wrapped made its row taller than the drawer's.
