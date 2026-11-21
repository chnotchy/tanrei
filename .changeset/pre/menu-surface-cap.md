---
'@tanrei/web': patch
---

Menu: a `max-block-size` you give the surface (`tanrei-menu::part(surface)`, or `tanrei-submenu::part(surface)` for a
submenu's) now works together with the room the menu has. Before, your rule won over the limit the menu wrote, so the
menu was misplaced:

- a menu above its anchor was placed by its uncapped height, and stood away from the anchor;
- a cap larger than the room let the surface run past the window's edge.

The menu now reads your cap as a computed value (a percentage counts against the window). It places the surface by the
least of the height its items need, your cap and the room left, and scrolls its items beyond it. The limit it writes
on the surface is important, so the room always holds.
