---
'@tanrei/web': patch
---

An accordion and a tree view built many at a time while the icon set's face is not there yet (still loading, or never
made available) no longer lay the page out once each. Each measured the name of its glyph in the icon family in its own
update, and a hundred of them laid the page out a hundred times; they now look up the family and measure the name with
every other one of the task, after all of their renders — once for all of them. The accordion now shares the tree
view's (and the table's) way of telling whether the icon set can draw. A tree view also looks for the scrolling box it
stands in (for its sticky parents) with the others, after their renders, and looks for it at the end of a filter only
when there is a row to keep in place. Nothing drawn changes.
