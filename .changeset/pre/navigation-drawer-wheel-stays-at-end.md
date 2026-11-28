---
'@tanrei/web': patch
---

Navigation drawer: in Firefox, a wheel over the drawer's items no longer scrolls the page once the items are at
their end. Firefox keeps to the list's `overscroll-behavior: contain` only within one wheel transaction, and an event
that scrolls nothing does not extend it. So, 1.5 s after the list reached its end, it gave the next turns to the page:
someone still turning the wheel, or turning it again, scrolled the page 400 px a turn. The drawer now cancels a wheel
turned toward an end its items already stand at. It still lets through a wheel turned with Ctrl (the page's zoom, and
a trackpad's pinch), one turned sideways, one over items that cannot scroll, and one that a scroller inside the items
can still take. Chromium and Safari already kept the page still, and nothing changes there.
