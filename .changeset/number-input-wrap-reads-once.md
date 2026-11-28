---
'@tanrei/web': patch
---

Number input: whether the steppers stand on a row of their own (NMI-36, NMI-37) is now read with one read of the
input's line box instead of two: its one client rect is its bounding rect, so each instance reads the layout one time
fewer per reading. What is drawn does not change.
