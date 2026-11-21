---
'@tanrei/web': patch
---

Building many navigation drawers at once no longer has the browser style and lay out the page for each. A resizable
drawer measures its widths and its scrollbar after the renders of the task, together with every other component's, and
one observer watches the room and the scrollbar of every drawer, so a frame's changes are read for all of them before
any is written. Drawers built in one task also settle their first frame's styles once for all of them before their
motions are given back. A hundred drawers now cost the passes ten do. Nothing drawn changes.
