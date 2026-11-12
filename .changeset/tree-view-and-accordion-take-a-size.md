---
'@tanrei/web': minor
'@tanrei/react': minor
---

Tree view and Accordion: `density` is gone; each takes `size` (`small`, `medium`; default `medium`) in its place.
`regular` is `medium` and `compact` is `small`, with the same heights, paddings, text styles and glyphs:
`<tanrei-tree-view size="small">`, `<tanrei-accordion size="small">`. The system's density (`--tanrei-dial-density`)
still moves the heights of both sizes.

A tree or an accordion without a `size` is drawn at the size its nearest container sets for what it holds (as a Button
in a button group is), and at `medium` where none does; reading `size` then still gives `medium`. Setting it to any
value, `medium` included, makes it its own; removing the attribute (or setting the property to `null`) gives it back.
Without script, both stylesheets draw the size set on the element, as before. Neither passes its size on: an accordion
in an accordion's item keeps its own.

A small tree row is no longer lower than the pointer target for a fine pointer: under a system whose
`sys.target.pointer` is above its small row height (36 in the default system), the row is drawn that high, as a
medium one is. The default system draws nothing differently: its pointer target is the minimum target, 36, which the
small row is already held at.

The accordion's module now carries the size cascade (about 0.7 kB gzip), which it did not import before: 21.9 kB gzip
alone, over its budget of 21.9 kB. Its budget is 23.1 kB (today's size and 5 %): taking a container's size is what
the bytes buy, and it is the code every component that takes a size shares. The tree view already held the cascade
through its Buttons and stays within its budget.

What broke:

- The `density` attribute and property of `tanrei-tree-view` and `tanrei-accordion`, and the types
  `TanreiTreeViewDensity` and `TanreiAccordionDensity` (now `TanreiTreeViewSize`, `TanreiAccordionSize`; the
  registries a design system augments are `TanreiTreeViewSizeRegistry` and `TanreiAccordionSizeRegistry`). A tree and
  an accordion that set no size reflect no `size`, and the React wrappers `TreeView` and `Accordion` pass no default
  one.
- The token ids `comp.tree-view.{container.height, container.padding-block, container.padding-inline, container.gap,
  level.indent, label.typescale, icon.size, chevron.size}.{regular,compact}` and `comp.accordion.{container.height,
  container.padding-block, container.padding-inline, label.typescale, supporting-text.typescale,
  trailing-text.typescale, icon.size, chevron.size, content.padding-block-end}.{regular,compact}` are now `.medium` and
  `.small`, and so are their CSS custom properties (`--tanrei-comp-tree-view-container-height-medium`, …) and the
  generated native token types. The axes are `comp.tree-view.size` and `comp.accordion.size`. A layer that pins one of
  the old ids, or adds a density, renames it.

Fixtures renamed, their pictures unchanged: in the tree view `compact` is `small`, `compact-guides` is `small-guides`,
`chevron-none-compact` is `chevron-none-small`, `single-compact` is `single-small`, `all-parts-compact` is
`all-parts-small` and `rtl-guides-compact` is `rtl-guides-small`; in the accordion `compact` is `small`,
`compact-outlined` is `small-outlined`, `compact-outlined-gap` is `small-outlined-gap` and `all-parts-compact` is
`all-parts-small`.
