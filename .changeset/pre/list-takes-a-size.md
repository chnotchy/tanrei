---
'@tanrei/web': minor
'@tanrei/react': minor
---

List and List row: `density` is gone; each takes `size` (`small`, `medium`; default `medium`) in its place. `regular`
is `medium` and `compact` is `small`, with the same heights, paddings, text styles and glyphs: `<tanrei-list
size="small">`, `<tanrei-list-row size="small">`. The system's density (`--tanrei-dial-density`) still moves the
heights of both sizes.

The size passes down as a Button's does in a button group: set on a list, it is the size of every List row the list
holds that sets none of its own. A row's own `size` now wins, `medium` included; before, a row in a list item drew the
list's density whatever its own said. Only a size set on the list is passed: a list that sets none leaves its rows at
their own size, and at the size a container around the list sets. A list or a row without a `size` is drawn at the
size its nearest container sets, and at `medium` where none does; reading `size` then still gives `medium`. Setting
it to any value makes it its own; removing the attribute (or setting the property to `null`) gives it back.

A small action, link or option is no longer lower than the pointer target for a fine pointer: under a system whose
`sys.target.pointer` is above its small item height (36 in the default system), the small item is drawn that high, as
the medium one is. The default system draws nothing differently: its pointer target is the minimum target, 36, which
the small item is already held at.

What broke:

- The `density` attribute and property of `tanrei-list` and `tanrei-list-row`, and the types `TanreiListDensity` and
  `TanreiListRowDensity` (now `TanreiListSize`, `TanreiListRowSize`; the registries a design system augments are
  `TanreiListSizeRegistry` and `TanreiListRowSizeRegistry`). A list and a row that set no size reflect no `size`, and the React
  wrappers `List` and `ListRow` pass no default one.
- The token ids `comp.list.container.height.{regular,compact}`, `comp.list.container.padding-block.{regular,compact}`,
  `comp.list-row.container.height.{one,two,three}-line.{regular,compact}` and
  `comp.list-row.container.padding-block.{regular,compact}` are now `.medium` and `.small`, and so are their CSS
  custom properties (`--tanrei-comp-list-container-height-medium`, …) and the generated native token types. The axes
  are `comp.list.size` and `comp.list-row.size`. A layer that pins one of the old ids, or adds a density, renames it.
- `TanreiListItemFrame` (what a list item tells a List row) has no `density` any more.

Fixtures renamed, their pictures unchanged: `list/density-compact` is `list/size-small`, `list-row/compact` is
`list-row/small` and `list-row/compact-one-line` is `list-row/small-one-line`.
