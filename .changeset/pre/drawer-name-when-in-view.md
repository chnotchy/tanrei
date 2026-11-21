---
'@tanrei/web': patch
---

Navigation drawer: keyboard focus on a collapsed cell that lies outside the window shows its name once the browser has
brought the cell into view. The name was opened one frame after the focus, and where the browser scrolled the cell in
later than that (WebKit, sometimes; any page that scrolls smoothly) the tooltip opened against an anchor out of sight,
closed itself at once and was not shown at all (NVD-56).
