---
'@tanrei/docs': patch
---

Docs: a measure figure measures each length where the spec places it, and lists no length of a part its fixture does
not draw. A content padding is measured to the parts the spec lays out at it, not to an edge line or a region as wide
as the box: the App bar's padding to its navigation and actions, the Navigation drawer's to its item containers and the
Side sheet's to its content, which the figures now draw (they said the padding was not drawn, at 0). A part drawn in the
place of another holds that part's padding: the Color input's swatch stands where a leading icon stands, so its figure
draws the box's padding with an icon at the start (12) and the plain padding at the end (16), where it said the plain
one was 12; a Chip with a leading icon likewise draws its plain padding at the end (16). A part the fixture does not draw in its state — a closed Select's or Combobox's options, a closed FAB
menu's items, an unchecked Checkbox's mark — is left out of the table, where it was listed as "no such box".
