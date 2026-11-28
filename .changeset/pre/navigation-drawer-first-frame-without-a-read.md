---
'@tanrei/web': patch
---

Navigation drawer: its motions come back after its first frame without a read of the layout. Until now, at the end of
that frame's read phase, it read the layout to have the frame styled before it gave its motions back, and on a loading
page that read had the browser style and lay out the whole page once more before its first paint. The motions now come
back in a task after the frame. That frame has already styled the drawer with its motions held, so nothing starts, and
what the first frame draws does not change (NVD-62).
