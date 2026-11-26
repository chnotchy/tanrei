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
- Docs: an example near the view is drawn, and one further down holds its room, in the first frame after its layout,
  instead of at the top of the module, where the page was laid out for it. In Firefox, whose first frame comes after
  the page's later scripts, the example in view now asks for its elements after them.
