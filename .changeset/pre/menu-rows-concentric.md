---
'@tanrei/web': patch
'@tanrei/tokens-build': patch
---

**Visual change, intended — the rows of a menu, a select, a combobox and a search view are concentric with their
sheet.** A row stands inside its sheet at the sheet's inline padding (4) and was rounded by `corner.small` (6) inside
a sheet rounded by `corner.medium` (8), so a filled row bulged past the sheet's curve at the first and last rows. In
the default system each row's corner is now the sheet's corner less that padding (4), derived with `sub`, and follows
the sheet's corner and padding: `comp.menu.container.shape`, `comp.select.option.shape`, `comp.combobox.option.shape`
and `comp.search.suggestion.container.shape`. On the web they are
`max(0px, calc(var(<sheet corner>) - var(<sheet padding>)))`, so a product that sets the sheet's corner or padding moves
the rows with it. The snapshot baselines that show a filled menu row (five menu fixtures: an open submenu's item, a
current link item) are recorded again for this. The presets keep the corners they drew.
