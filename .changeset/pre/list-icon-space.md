---
'@tanrei/web': minor
---

List has `iconSpace` (`icon-space`: `auto`, `always`, `never`; default `auto`), as Menu, Tree view and Navigation
drawer have. A List row without a leading part now keeps the room of a leading glyph, empty, while the row of another
item of its list draws one (`leading-icon`), so that the headlines of rows with and without a glyph start on one line;
a list whose rows draw no glyph keeps no room. `always` keeps the room in every row, `never` only where a row draws a
glyph. An avatar, a picture or a control in a row's `leading` slot does not count and keeps no room beside it, and a
List row standing alone keeps none.

What changed for an existing page: a list in which some rows have `leading-icon` and others none drew the others'
headlines at the row's start and now draws them after the glyph's room; set `icon-space="never"` for the old look. The
rule that lining up such rows was the product's is retired. The list spec now names a List row as a kind of an item's
content, for its fixtures; the elements are unchanged. New fixtures `icon-space-auto`, `icon-space-always` and
`icon-space-never` have new baselines; no existing baseline changes, since no list fixture held rows before.
