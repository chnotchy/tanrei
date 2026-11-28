---
'@tanrei/web': patch
---

A glyph of the icon set that becomes drawable — its face has loaded, after the element that draws it has settled on a
page loaded cold — now starts no transition. The check of a select's, a combobox's or a menu's chosen option fades its
`visibility` and `opacity` in and out, and when the face arrived it started a `visibility` transition from the hidden
mark it had never shown (it was then finished at once, so nothing was seen to move, but a motion was begun). The glyph
and what is in it are now marked drawn with no transition.
