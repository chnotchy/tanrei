---
'@tanrei/web': patch
---

Glyphs: when a component draws again and a glyph keeps its name (a checkbox checked, a list's choice), the component
now compares the glyph's font family in the frame's read phase, after the frame's own style and layout. It used to
read the family in a microtask right after the render. On a page that had just restyled itself in the same task (a
theme chosen in a docs page's appearance panel), that read made the browser style the whole page there and then: 9 ms
in Chromium and 3 to 4 ms in WebKit. Ten checkboxes and a list checked and chosen in the task that switches the theme
now force no style pass (two before). A glyph whose name changes is still decided in the task of the render. A glyph
whose family can no longer draw loses its mark before the first frame that shows the render is painted, as before.
