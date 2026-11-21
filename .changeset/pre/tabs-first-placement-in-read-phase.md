---
'@tanrei/web': patch
---

A row of tabs first drawn where nothing above it changes size (in a box of fixed size, on a page that does not watch
its own root element) no longer has the browser report "ResizeObserver loop completed with undelivered notifications"
in the frame it is first drawn in. The row's first placement was made in its own resize observer's report: the tabs
became circles there and the track narrowed with them, and the track, the shallowest box reported, could not be
reported again in that frame. The first placement is now made in the frame's read phase, which is reported with the
page's root element, so every size it changes is reported in the same frame; the first frame painted still shows the
row placed.
