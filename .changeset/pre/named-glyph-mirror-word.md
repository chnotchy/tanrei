---
'@tanrei/web': patch
---

A glyph a component draws from a name the product gave it (a tab's `icon`) takes the product's word on mirroring from
`data-mirror` on the element that names it, with the values and the default it has on a glyph the product places
itself: `auto` (the icon set's list), `always`, `never`. The rule is written once for every component, and the tab's
own handling of it is now a shared primitive, `MirrorWordController`, that the other components which draw a named
glyph build on. A change of the layout direction redraws such a glyph at once, without a motion.
