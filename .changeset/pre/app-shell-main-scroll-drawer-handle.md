---
'@tanrei/web': patch
---

App shell: with `scroll="main"`, a navigation drawer's resize handle now stands beside the drawer's end edge again, so
a person can drag it. The drawer places its handle from its own box, and the shell's rule for this scroll made the
navigation `position: static`. A page's rule outweighs the drawer's own `position`, so the handle was placed from the
frame's box instead and stood past the window's end edge. No drag could begin, and a pointer could not reach the
handle. The navigation is now `position: relative` there. It is still not sticky, and its layout is unchanged.
