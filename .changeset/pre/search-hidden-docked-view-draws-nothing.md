---
'@tanrei/web': patch
---

Search: a docked view that is not shown draws nothing. Drawn in place (`inline`), the docked view is not a popover, so
nothing hid it while the search showed its dialog or full-screen view, was collapsed, or had no content. It stayed a
0 × 0 box at the start corner and still painted its 1 px elevation ring, a dot just outside the search. The view is
now rendered only while it is open, as a popover or in place. The specification (SRC-7) now says that a docked view
that is not shown draws neither its surface nor its elevation. Baselines are unchanged: the dot lay outside every
fixture's captured area.
