---
'@tanrei/studio': patch
'@tanrei/docs': patch
---

**Theme Studio: the shuffle and the open lock draw as icons on the docs site.** The site's icon font is cut down to the
glyphs its sources declare, and the bar's `shuffle`, the rail's `lock_open` and the focus row's fallback were written
where the glyph list is not read, so until the full icon file loaded they drew as their letters. Each glyph the Studio
draws is now declared in a constant, and a test refuses a glyph the Studio draws that no list has.
