---
'@tanrei/web': patch
---

Menubar: a menu is built when it is first shown, no longer when the bar mounts. A bar of seven menus now makes 9 updates
of its own at mount instead of 16 (no `tanrei-menu` is created for a closed menu), and its menus' items half as many.
The first opening is unchanged — the same motion, place and focus, by every input — and a menu once built is kept.
Until a menu is first shown, `tanrei-menubar-menu`'s shadow root holds no `tanrei-menu` and its items are assigned to no
slot, so they have no computed style.
