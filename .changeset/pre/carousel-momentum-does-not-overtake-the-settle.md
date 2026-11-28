---
'@tanrei/web': patch
---

Carousel: the browser's momentum no longer takes over a touch release's settle on a busy page. The row is held from
the lift, but a browser stops its own momentum only once it has the held row's style, a frame or more later when the
main thread is busy. Until then the momentum kept scrolling the row, and the carousel took that scroll for the person's:
it gave up the settle and settled again from wherever the momentum had carried the row, one item past the one the
finger stopped on, or one item back after a drag back. A release's settle now holds the row to the end of its motion
and replaces any scroll that comes during it. The person cannot pan a held row, and a new touch, the wheel or a mouse
press still stop the settle at once.
