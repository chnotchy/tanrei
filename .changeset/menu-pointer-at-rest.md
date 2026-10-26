---
'@tanrei/web': patch
---

Menu: a pointer at rest no longer takes focus from the keys. Safari sends a pointer move to whatever comes under a mouse
that has not moved once the menu's items scroll under it, so an End, a Down Arrow or a typed character that scrolled a
long menu moved focus a moment later to the item under the mouse, and the next key went on from there. A pointer move
at the place the same pointer last was is now no move; a pointer that moves onto an item still moves focus there, as
before, in every browser.
