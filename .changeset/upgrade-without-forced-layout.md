---
'@tanrei/web': patch
'@tanrei/docs': patch
---

A page that is still loading upgrades its elements without having the browser style or lay out the whole page for
them, in every module's own task, before the first frame. Each such pass took half a second or more of a long page's
load in WebKit. What is drawn does not change.

- The first element that watches the page's fonts (a Button, a checkbox, any glyph) no longer asks the set of fonts
  whether a face is loading while the document loads: a face is taken to be loading, and the set is asked in the next
  frame callback.
- Glyphs of the icon set are decided by the resize observer until the document has been painted once, after the
  layout of the frame and before its paint, from the sizes it reports: their boxes are now observed as well as their
  inks, and nothing of the layout is read for them there. A glyph that appears without motion is held with no
  transition until the next frame's read phase, instead of being styled at once.
- Tabs: a tab whose label the observer has not reported yet leaves its truncation to that first report, rather than
  measuring it when the row first tells it what it is.
- Until the document has been painted once, these read in the first frame's read phase, after its layout and before
  its paint, instead of in their connection or render: whether a light-DOM component's root already draws it (its
  stylesheet is added there when it does not; Table, Accordion, App shell, Breadcrumbs, Table of contents and the
  others), the App shell's window widths, the Navigation drawer's room, the App bar's first fit of
  its actions, the Breadcrumbs' first measure, the Table of contents' view and first rule, and an open Menu's
  shortcut form. Whether the browser answers style container queries is probed there too; until then the answer is
  yes, and where the probe says no every element is drawn again before that frame is painted. An overlay open before
  the first paint holds its transitions for two frames instead of being styled at once. The steps' wait on the faces
  is asked in a frame callback.
- Docs: the examples are placed without a read of the layout at the top of their module, where the page was laid out
  for it. Each frame's inline script has the browser say, in the frames it draws while the page is parsed, whether
  the frame is near the view; the module draws those at once (in Firefox, before the page's later scripts, as
  before), and places the others — draws one near, holds the room of one further down — in the first frame after
  its layout.
