---
'@tanrei/web': patch
---

Navigation drawer: keyboard focus on an expanded row whose label is cut always shows the tooltip with the whole label.
Where the pointer had just left that row, the hide it scheduled for a collapsed cell's name could end the row's wait
to be seen, and the tooltip was not shown (NVD-75).
