---
'@tanrei/web': patch
'@tanrei/react': patch
---

Menu: a menu whose items are all inside groups now puts focus on its first enabled item when it opens, as MNU-1 says.
Before, a menu that was mounted already open (a product that draws its menu only while it is open), or opened in the
same task that gave it new groups, left focus on the anchor in Chromium and Firefox, and the arrow keys did nothing:
the menu placed focus before its groups had drawn their slots, and a browser does not focus an item that is not drawn.
Now the menu waits for itself, its groups and its rows to draw, then places focus. The wait is only microtasks, so no
input comes between; a menu whose items are already drawn places focus at once, as before. This also covers a menubar's
menu opened with Up Arrow, which still takes focus on its last enabled item (MBR-9).
