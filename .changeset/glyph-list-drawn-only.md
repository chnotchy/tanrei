---
'@tanrei/cli': patch
---

The glyph names `tanrei build` prints are the glyphs the components draw and no other word: 163 names instead of 242.
The list no longer holds words such as `start`, `width`, `script` or `function` that the icon set also names but that
the components' code writes only as strings, so an icon font cut down to it is about a third smaller.
