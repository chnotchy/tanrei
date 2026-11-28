---
'@tanrei/web': minor
'@tanrei/react': minor
---

Table of contents and Description list: `density` is gone; each takes `size` (`small`, `medium`; default `medium`)
in its place. `regular` is `medium` and `compact` is `small`, with the same heights, paddings, gaps and text styles:
`<tanrei-table-of-contents size="small">`, `<tanrei-description-list size="small">`. The system's density
(`--tanrei-dial-density`) still moves the row heights of the table of contents and the space between facts at both
sizes. Timeline: `density` is gone with no replacement; the space between events is one token,
`comp.timeline.item.gap` (16 in the default system), which the system's density moves.

A table of contents or a description list without a `size` is drawn at the size its nearest container sets for what
it holds (as a Button in a button group is), and at `medium` where none does; reading `size` then still gives
`medium`. Setting it to any value, `medium` included, makes it its own; removing the attribute (or setting the property
to `null`) gives it back. Without script, both stylesheets draw the size set on the element, as before. Neither passes
its size on: a tag or a button in a description list's value keeps its own.

A small table-of-contents row is no longer lower than the pointer target for a fine pointer: under a system whose
`sys.target.pointer` is above its small row height (36 in the default system), the row is drawn that high, as a
medium one is. The default system draws nothing differently: its pointer target is the minimum target, 36, which the
small row is already held at.

What broke:

- The `density` attribute and property of `tanrei-table-of-contents` and `tanrei-description-list`, and the types
  `TanreiTableOfContentsDensity` and `TanreiDescriptionListDensity` (now `TanreiTableOfContentsSize`,
  `TanreiDescriptionListSize`; the registries a design system augments are `TanreiTableOfContentsSizeRegistry` and
  `TanreiDescriptionListSizeRegistry`). Neither reflects a `size` it did not set, and the React wrappers
  `TableOfContents` and `DescriptionList` pass no default one.
- The timeline's `data-density` attribute: it is no longer read, and an unknown value is no longer reported.
- The token ids `comp.table-of-contents.{row.height, row.padding-block}.{regular,compact}` and
  `comp.description-list.{fact.gap, term.gap, term.typescale, value.typescale, stat.value.typescale}.{regular,compact}`
  are now `.medium` and `.small`, and so are their CSS custom properties
  (`--tanrei-comp-table-of-contents-row-height-medium`, …) and the generated native token types. The axes are
  `comp.table-of-contents.size` and `comp.description-list.size`. `comp.timeline.item.gap.{regular,compact}` is
  `comp.timeline.item.gap`, and the timeline has no density axis. A layer that pins one of the old ids, or adds a
  density, renames it.

Fixtures renamed, their pictures unchanged: in the table of contents `density-compact-nested`,
`density-compact-three-levels`, `density-compact-current`, `density-compact-long-labels`, `density-compact-open` and
`density-compact-rtl` are `size-small-…`; in the description list `inline-compact`, `stacked-compact`,
`columns-compact` and `stat-compact` are `inline-small`, `stacked-small`, `columns-small` and `stat-small`. The
timeline's `compact` fixture is removed, and `large-plan-compact` is `large-plan`, drawn with the one gap: its picture
is new.
