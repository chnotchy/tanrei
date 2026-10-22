---
'@tanrei/web': patch
'@tanrei/tokens-build': patch
---

**Visual change, intended — a selected row is told from a hovered one in the tree view, the navigation drawer and
the table.** In the default system a selected tree row, drawer destination and table row took the neutral
`secondary-container` tone, which in light is the grey of a hovered row (1.00:1 to 1.03:1 between them). They now
take the list's selection: a layer of the row's own content color at the selected layer (16 %, twice the hover layer),
1.15:1 to 1.30:1 from a hovered row in every scheme and on every surface role. `comp.tree-view.selected.container.color`,
`comp.navigation-drawer.selected.item.container.color` and `comp.table.row.selected.container.color` change value; the
text of a selected row keeps its color. The snapshot baselines of the tree view, navigation drawer and table fixtures
that show a selected row are recorded again for this. The presets `m3-like`, `m3-expressive-like` and `cupertino` draw
as before.

`pnpm validate` holds it: in the default system a selected row and a hovered one (list, tree view, navigation drawer,
table) stand at least 1.1:1 apart in every scheme, each laid over each surface role, and a selected row's text is read
on its fill at 4.5:1 (7:1 in the high-contrast schemes).
