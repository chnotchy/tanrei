---
'@tanrei/cli': minor
---

`tanrei build` prints the glyph names of the icon set that Tanrei's components may draw by themselves (a chevron, a
check, the cross of a close button…), in alphabetical order and comma-separated, and the axis values the product's
system draws icons at (fill, weight, grade, optical size). The full Material Symbols file is 5.4 MB; a product adds its
own names to the list and loads only those glyphs at those values — from Google Fonts with `icon_names=` and axis
ranges, or from a file it cuts down with a subsetter that keeps the ligature features. The list is generated from the
specs and the web components' code, and is an upper bound: it may name a word the components only use as a string.
