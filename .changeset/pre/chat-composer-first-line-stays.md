---
'@tanrei/web': patch
---

Embedded text input and chat composer: the first line now stays at the top edge of the typing area while its height
moves after a typed line break. Until now, at the first frame of the motion the text jumped up by about a line (23 px
in Chromium, 22 px in WebKit) and came back down as the box grew: the box that clips the text during the motion could
be scrolled, and the browser scrolled it to show the caret on the new line. In a composer docked at the bottom of a
column, the first line left the capsule for those frames. The box now clips without being a scroll container
(`overflow: clip`; Safari before 16 keeps `hidden`). Nothing else changes: no baseline moves, and Firefox, which did
not scroll the box, shows the same frames as before.
