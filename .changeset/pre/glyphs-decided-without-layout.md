---
'@tanrei/web': patch
---

Components that draw glyphs of the icon set (checkbox, switch, menu, snackbar, copy button and the others that wait
for the icon font before drawing a glyph) cost a page less work. The page's fonts are listened to once, not twice for
each instance: a page of 1,000 checkboxes had 2,000 listeners and now has 2. A change of state that keeps a glyph's
name and family (checking a checkbox, turning a switch on) no longer reads the layout: toggling 1,000 checkboxes read
it 4,000 times and now reads it 0 times. A text face that finishes loading no longer has every glyph measured again;
only a face of a family a glyph is drawn in does. What is drawn, and when, is unchanged: a glyph still appears in the
first frame its font can draw it, and nothing is drawn in its place while it cannot.
