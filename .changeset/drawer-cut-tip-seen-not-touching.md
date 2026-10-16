---
'@tanrei/web': patch
---

Navigation drawer: keyboard focus on an expanded row whose label is cut shows the tooltip with the whole label also
when the row lay just outside the window, its edge on the window's edge: the tooltip opens once part of the row is
seen. Before, it opened while nothing of the row could be seen, closed again at once, and stayed closed when the row
came into view (NVD-75).
