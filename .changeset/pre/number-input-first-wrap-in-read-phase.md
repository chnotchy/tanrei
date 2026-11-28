---
'@tanrei/web': patch
---

A number input too narrow for its steppers beside its line, first drawn where nothing above it changes size (in a box
of fixed size), no longer has the browser report "ResizeObserver loop completed with undelivered notifications" in the
frame it is first drawn in. Its first reading of the wrapping was made in its resize observer's report, where the
container it watches grew as the steppers moved to a row of their own, and the container, the shallowest box reported,
could not be reported again in that frame. That first reading is now made in the frame's read phase, so the new height
is reported in the same frame; the first frame painted still shows the steppers on their own row.
