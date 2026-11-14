---
'@tanrei/web': patch
---

Fewer forced style and layout passes on three paths that still read once per instance. A carousel with autoplay
read its interval from the cascade in its own update and again as each row came to rest, and the playback glyphs' font
the same way; it now reads them with every other component's reads of the turn, before any of them writes. A carousel
arranged while it moves (a new item width during a scroll) no longer reads its scroll offset again after its writes: it
takes the offset its row was just scrolled to. A scroll area whose fit only its sentinels tell (content a fraction of a
pixel past the box) asks whether anything inside takes focus in the next frame's read phase, with every other area,
instead of in its own intersection callback; the role and the tab stop follow a frame later on that path. Building 100
autoplay carousels with a progress fill now forces no more passes than 10 (was 630 more), and so do 100 carousels
arranged mid-motion (was 180 more) and 100 such scroll areas (was 88 more). Nothing drawn changes.
