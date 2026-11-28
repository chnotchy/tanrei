---
'@tanrei/web': patch
---

In Safari, the colors that opening or closing a date-time picker changes inside it now move over their motion however
long that task takes. Closing a picker, docked or modal, changes the colors of the day that focus leaves; WebKit dated
that change from the frame drawn before the closing task, and where the task took longer than the change lasts (about
one time in six in a Linux runner's WebKit) it was drawn over at once, with no frame of it. The picker now starts what
its opening and its closing begin inside it from the first frame drawn after the task, with the same shared rule
(`statesFromNextFrame`) as the dialog, the menu and the sheets. Nothing changes in Chromium and Firefox, which already
start these motions in the next frame.
