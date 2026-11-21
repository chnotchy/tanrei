---
'@tanrei/web': minor
'@tanrei/react': minor
---

Table: `density` is gone; it takes `size` (`small`, `medium`; default `medium`) in its place. `regular` is `medium`
and `compact` is `small`, with the same paddings and text styles: `<tanrei-table size="small">`. The system's density
(`--tanrei-dial-density`) still moves the cells' block paddings at both sizes.

A table without a `size` is drawn at the size its nearest container sets for what it holds (as a Button in a button
group is), and at `medium` where none does; reading `size` then still gives `medium`. Setting it to any value, `medium`
included, makes it its own; removing the attribute (or setting the property to `null`) gives it back. Without script,
the stylesheet draws the size set on the element, as before. Its rows and cells are its own and all take its size; it
passes none to what the product puts in its cells, its empty slot or its status line.

A small row that holds a checkbox or a radio button, and a small header row that holds a sort button, are no longer
lower than the pointer target for a fine pointer: they are drawn `sys.target.pointer` high, 36 in the default system
where the small size alone gives 32 (44 under the m3-like preset, whose pointer target is 44). A small row that holds
no control is as low as before. The fixtures `sortable-small`, `selection-small` and `data` draw these rows 4 px
taller in the default system, which is the intended result, and their baselines move with it.

The table's module now carries the size cascade: 26.7 kB gzip, within its budget of 27 kB.

What broke:

- The `density` attribute and property of `tanrei-table`, and the type `TanreiTableDensity` (now `TanreiTableSize`;
  the registry a design system augments is `TanreiTableSizeRegistry`). A table that sets no size reflects no `size`,
  and the React wrapper `Table` passes no default one.
- The token ids `comp.table.{cell.padding-block, cell.padding-inline, cell.text.typescale,
  header.text.typescale}.{regular,compact}` are now `.medium` and `.small`, and so are their CSS custom properties
  (`--tanrei-comp-table-cell-padding-block-medium`, …) and the generated native token types. The axis is
  `comp.table.size`. A layer that pins one of the old ids, or adds a density, renames it.

Fixtures renamed: `compact` is `small` and `compact-tokens` is `small-tokens` (picture unchanged), and
`striped-compact-tokens` is `striped-small-tokens`, `sortable-compact` is `sortable-small` and `selection-compact` is
`selection-small`. The two token fixtures and the `japanese` fixture name the new token ids and values in their cells,
so their pictures change with their text.
