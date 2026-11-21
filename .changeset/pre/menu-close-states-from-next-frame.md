---
'@tanrei/web': patch
---

In Safari, the colors that closing a menu changes now move over their motion however long the closing task takes: those
of the item focus leaves, and those of the anchor focus goes back to. WebKit dated that change from the frame drawn
before the closing task, and where the task took longer than the change lasts it was drawn over at once, with no frame
of it. Closing now starts them from the first frame drawn after the task, as opening already did
(`statesFromNextFrame`). Nothing changes in Chromium and Firefox.
