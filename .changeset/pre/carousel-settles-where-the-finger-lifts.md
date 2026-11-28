---
'@tanrei/web': patch
---

Carousel: a touch drag that stops before the finger lifts now settles on the item nearest where it was let go. Before,
on a row that snaps, only a release the carousel took as a fling was held: any other release was left to the browser's
own momentum, which in Chromium carried a quick drag on after the lift — to the row's end — and the row then settled
there, past the item the person had stopped on. Every touch release on a row that snaps now settles from where the
finger lifted: on the nearest item, or on the next one when the drag is still moving at the lift (a fling), as before.
A row with `snap` off still comes to rest wherever the browser's scroll ends, and the wheel and the trackpad are
unchanged.
