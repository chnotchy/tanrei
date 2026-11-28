---
'@tanrei/web': patch
---

Faster first load of long pages in Firefox. Two elements the package puts in the page for an instant and then takes out
now stand at the end of the body instead of in the root element: the probe that asks whether the browser answers style
container queries, and the probe that reads the window's box for the navigation drawer and the page scroll hold. Firefox
restyled the whole body each time a child of the root element was put in or taken out, because rules that look at a
child's place among its siblings are tried on the body too. On the documentation's Button page (about 13,000 elements)
each of those restyles cost 0.1 to 0.7 s in Firefox, and the page paid three of them as it loaded; its time spent
styling in a profile of its first load fell from 3.4 s to 1.8 s, and its load event comes about 0.6 s sooner (median of
six loads, 2.8 s to 2.2 s). Chromium is unchanged and WebKit slightly faster. A probe fixed to the window
still goes in the root element where the body would hold it in a box of its own (a transform, a filter, a container,
layout or paint containment), so the window's box is read the same way as before. In a document with no body, the
style queries' probe answers no, and components draw their gap form from script there.
