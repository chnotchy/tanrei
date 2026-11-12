---
'@tanrei/web': patch
---

In Safari, the colors that closing a popover drawn as a sheet (a compact window) changes now move over their motion
however long the closing task takes: those of the element focus leaves inside the sheet, and those of the opener focus
goes back to. WebKit dated that change from the frame drawn before the closing task, and where the task took longer than
the change lasts it was drawn over at once, with no frame of it. Closing the sheet now starts them from the first frame
drawn after the task (`statesFromNextFrame`), as closing the popover beside its anchor already did. Nothing changes in
Chromium and Firefox.
