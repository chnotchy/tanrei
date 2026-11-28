---
'@tanrei/web': patch
---

Tree view: a closed parent's start chevron is mirrored in right-to-left only where the icon set marks `chevron_right`.
The stylesheet mirrored it whenever the layout was right-to-left, so under a set that does not mark it (a product
layer's own icon set) the tree mirrored the glyph itself, and a closed chevron pointed left where the set draws it
pointing right. The
element now asks the active icon set, as it does for every other glyph, and writes `data-tanrei-chevron-unmirrored` on
the tree where the set does not mark the name; the chevron is then drawn and turned as in left-to-right, so an open one
still points down and a change of direction turns nothing. A design system switched while the tree is shown draws the
new turn of an open chevron at once.
