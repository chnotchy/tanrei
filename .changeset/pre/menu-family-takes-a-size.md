---
'@tanrei/web': minor
'@tanrei/react': minor
---

Menu and Search: `density` is gone; each takes `size` (`small`, `medium`; default `medium`) in its place. `regular` is
`medium` and `compact` is `small`, with the same heights, paddings, text styles and glyphs: `<tanrei-menu size="small">`,
`<tanrei-search size="small">`. Every submenu takes its menu's size. The system's density (`--tanrei-dial-density`)
still moves the heights of both sizes.

Select and Combobox (and Select field and Combobox field): `density` is gone with no replacement prop. The options of the
list take the box's `size`: a `small` select or combobox opens small options (36 high in the default system), a `medium`
or `large` one medium options (48). Before, every box size opened regular options unless `density` said otherwise, so
an open small select now draws lower rows.

A menu, a search, and the list of a select or a combobox take no size from a container around them, such as a toolbar,
a button group or a list whose size is set: they open over the page in the top layer, apart from the controls around
their anchor, as the menus of Material and Fluent keep their own rows in a dense toolbar. A menu opened
from a Button in a small toolbar is medium unless the menu sets its own `size`. The back button of the search's
full-screen view is now set to `medium`, as its spec says, so a container's size no longer reaches it either.

A small row or option is no longer lower than the pointer target for a fine pointer: under a system whose
`sys.target.pointer` is above the small row's height (36 in the default system), the small row is drawn that high, as
the medium one is. The default system draws nothing differently: its pointer target is the minimum target, 36, which
the small rows are already held at.

What broke:

- The `density` attribute and property of `tanrei-menu`, `tanrei-search`, `tanrei-select`, `tanrei-combobox`,
  `tanrei-select-field` and `tanrei-combobox-field`, and the types `TanreiMenuDensity`, `TanreiSearchDensity`,
  `TanreiSelectDensity` and `TanreiComboboxDensity` (now `TanreiMenuSize` and `TanreiSearchSize`; a select's and a
  combobox's options have no prop of their own). The registries a design system augments are
  `TanreiMenuSizeRegistry`, `TanreiSearchSizeRegistry`, and, for a size added to the options, `TanreiSelectOptionSizeRegistry`
  and `TanreiComboboxOptionSizeRegistry`. The React wrappers lose their `density` prop.
- `TanreiComboboxSize` now includes `small`, which the combobox's spec has always listed.
- The token ids `comp.menu.{container.height, container.padding-inline, container.padding-block, container.gap,
  leading-icon.size, trailing-icon.size, mark.size, group-title.padding-inline}.{regular,compact}`,
  `comp.select.{option.height, option.padding-inline, option.padding-block, option.gap, option.leading-icon.size,
  option.mark.size, group-title.padding-inline}.{regular,compact}`, the same of `comp.combobox`, and
  `comp.search.suggestion.{container.height, container.padding-inline, container.padding-block, container.gap,
  leading-icon.size}.{regular,compact}` are now `.medium` and `.small`, and so are their CSS custom properties
  (`--tanrei-comp-menu-container-height-medium`, …) and the generated native token types. The axes are
  `comp.menu.size`, `comp.select.option-size`, `comp.combobox.option-size` (the box alone has a size axis) and `comp.search.size`. A layer that pins one of the old
  ids, or adds a density, renames it.

Fixtures: `menu/density-compact` is `menu/size-small` and `search/density-compact` is `search/size-small`, their
pictures unchanged. `select/density-compact` and `combobox/density-compact` are `size-small`, with a small box, so their
pictures are new; and the open small selects (`select/small-open`, `select/small-label-hidden-open`, the same of
`select-field`, and `field/select-small-open`, `field/select-small-label-hidden-open`) now draw small options.
