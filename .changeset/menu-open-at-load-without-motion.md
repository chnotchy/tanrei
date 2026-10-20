---
'@tanrei/web': patch
---

Menu: a menu that the page's markup writes open, with its submenus written open, is open in its first frame. Before
the document's first paint, neither its surface nor the surface of any submenu open in it fades in or grows any more:
there was nothing for them to grow from. A menu mounted open after the first paint, or opened later, opens with its
motion as before (MNU-4, MOT-4).
