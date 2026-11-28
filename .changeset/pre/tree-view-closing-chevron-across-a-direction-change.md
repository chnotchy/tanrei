---
'@tanrei/web': patch
---

Tree view: a parent closing while the layout direction changes is drawn at once for the new direction. Its chevron's
turn went on from where it stood, now mirrored the other way, and pointed up on its way to the closed chevron; the
turn now ends where the direction changes, at the closed chevron the new direction draws.
