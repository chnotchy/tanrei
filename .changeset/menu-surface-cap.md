---
'@tanrei/web': patch
---

Menu: a `max-block-size` you give the surface (`tanrei-menu::part(surface)`, or `tanrei-submenu::part(surface)` for a
submenu's) now holds. The menu wrote the room it had as its own inline `max-block-size`, which overrode yours. It now
reads yours as a computed value (a percentage counts against the window), places the surface by the least of the
height its items need, your cap and the room left, and scrolls its items beyond it. A menu above its anchor stands the
offset above it at the capped height.
