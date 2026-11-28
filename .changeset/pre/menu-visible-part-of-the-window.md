---
'@tanrei/web': patch
---

Menu, its submenus, a docked date-time picker and the search view are placed inside the visible part of the window, as
the popover, the select and the combobox already were: above the on-screen keyboard, and only where a visual viewport
that is scrolled or zoomed shows the page. On iOS the keyboard shrinks the visual viewport and not the layout one, so a
menu opened near a focused field used to open under the keyboard. The popover, the select and the combobox now also
keep below the top of a visual viewport scrolled down (iOS moves it to keep a field in view), not only above its bottom.

**Breaking** (the module exports of 0.1.0-next.0): `placeMenu`, `placeAtPoint`, `placeSubmenu` and `MenuBox` are no
longer exported by the menu's module. They live with the other placement geometry, which is internal to the package.
