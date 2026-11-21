---
'@tanrei/web': patch
---

App shell: the navigation leaves room for the main region and the aside. The navigation was held to the window less
a touch target, but nothing kept room for the aside or for the main region's own insets. A navigation drawer at its
greatest width (a drag to the window's edge, End on its resize handle, or a least width wider than the window) pushed
the aside, and the main region's insets, past the window: at 1280 with an aside the document was 1484 wide and the
main region had no room at all. Without an aside, the page still scrolled sideways by the main region's insets.

The navigation is now never wider than the window less the main region's least width (its start and end insets and
a touch target between them) and less the aside where it stands beside the main region (APS-5, NVD-97): 936 at 1280
beside a 240-wide aside, and 1176 with no aside. The page is no wider than the window, in either direction (WCAG 1.4.10).
A navigation drawer reads this as the room its parent gives it, so a drag, a key and a width the product gives all
stop there, and its handle reports it as its greatest value. A standard side sheet in the aside is measured as it
slides, so the drawer narrows and widens in step with it. The aside keeps its place and width: in an expanded window
it stays beside the main region, as the window's class decides (APS-9), and the navigation gives way.

The `all` bundle's budget goes from 668100 to 668300 bytes gzip. It was 668221 with this change, and within 668100
without it. The app shell itself went from 17.7 to 17.9 kB, well inside its own budget of 18.1 kB. The bytes are the
side sheet's measurement and the stylesheet's room rule, which keep the page from scrolling sideways.
