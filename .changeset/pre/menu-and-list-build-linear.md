---
'@tanrei/web': patch
---

A menu and a list cost the same for each item at 1,000 items as at 100. Each item tells its menu or list when a prop the
container reads changes, and the container re-read every item each time — so building N items, or changing N labels at
once, did O(N²) work: about 7.6 s to build a menu of 1,000 items and 1.5 s for a list, in Chromium. The container now
re-reads its items once per turn, in a microtask before the next frame, however many of them changed in it (and at
once, before it handles a key, a press or focus). A menu of 1,000 items builds in about 0.2 s, a list in about 0.13 s;
every frame draws the items as before.

Debug builds count each re-read on `globalThis.__tanreiCounts` (`menu.sync`, `list.sync`), for the performance tests; a
production build counts nothing. No baseline changes.
