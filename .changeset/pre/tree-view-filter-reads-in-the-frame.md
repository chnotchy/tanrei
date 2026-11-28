---
'@tanrei/web': patch
---

A Tree view on a page that is still loading upgrades without having the browser style or lay out the whole page for
it. Until the document has been painted once, these read in the first frame's read phase, after its layout and before
its paint, instead of in the tree's update: whether the filter field stands in a scrolling box (and stays at its top),
the scrolling box its pinned parent rows follow, and the scroll that brings the field and the first row shown into
view when the filter holds text; after the first paint the first two are read with every other host's reads of the
turn. Whether the icon set draws the glyph of a light-DOM component that waits on it (the Tree view's chevrons, the
Accordion's and the Table's) is first read in that phase too. The filter's behaviour and what is drawn do not change.
