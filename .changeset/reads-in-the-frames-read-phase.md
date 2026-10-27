---
'@tanrei/web': patch
---

Faster first frames on long pages: elements no longer have the browser style or lay out the whole page for a read of
their own while the page is still defining its elements. Each such read cost a long page a tenth of a second in Safari
and Firefox, once for every module that arrived in a task of its own. On the documentation's Button page (about 950
elements) the time spent in these reads before the first frame is about halved in Safari and cut by about a quarter in
Firefox. Nothing is drawn differently, and the first frame painted shows what it showed before.

- A table measures whether it scrolls, and writes its region and focus stop, after the frame's layout and before its
  paint, with every other table of the frame, instead of in a microtask of the task that wrote it.
- A closed menu no longer reads the form of its shortcuts. It reads it when it opens, and its rows keep the form
  they were last given until then.
- An app bar reads the window width it is compact below, and where its scrolling element is scrolled to, after the
  frame's layout, instead of as it is connected and in its first update.
- A navigation drawer brings its items to the offset given and its selection into view after the first frame's
  layout, and reckons its pinned rows there, instead of in microtasks before the frame and in a frame callback. A
  script that reads `scrollOffset` in a frame callback before the drawer's first frame is painted now finds the
  offset it gave, or 0 where it gave none, until that frame's layout.
- An element drawn by a stylesheet of its own (a table, a figure, an accordion and the others) asks whether the page
  loaded that stylesheet once for the page. The first question answers it for every such element on the page, where
  each kind used to ask in its own definition.
