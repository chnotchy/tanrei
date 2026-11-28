---
'@tanrei/web': patch
---

In Safari, a menu closed by Tab now moves the colors of its anchor over their motion however long the closing task
takes. Tab gives focus back to the anchor before the product closes the menu, so closing found focus already outside
the menu and left the anchor's change to WebKit, which dated it from the frame drawn before the task: where the task took
longer than the change lasts, the anchor was drawn focused at once, with no frame of it. That change now starts in the
first frame drawn after the task (`statesFromNextFrame`), as every other way of closing a menu already did. Nothing
changes in Chromium and Firefox.
