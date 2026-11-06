---
'@tanrei/web': patch
---

Navigation drawer: keyboard focus on a collapsed cell that the browser scrolls into view shows its name also when the
cell's box first only touches the window's edge. The name opened at that moment, was counted out of sight by the
tooltip and closed at once, and was not opened again (NVD-56).
