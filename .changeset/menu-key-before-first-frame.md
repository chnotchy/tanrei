---
'@tanrei/web': patch
---

Menu: a key pressed before the opening motion has drawn its first frame (End on a busy machine) no longer scrolls the
list part of the way. The menu waits for the surface to come to rest, as it does while the motion runs, and then
brings the item into view.
