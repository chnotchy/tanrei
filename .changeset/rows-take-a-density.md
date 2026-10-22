---
'@tanrei/react': minor
'@tanrei/web': minor
---

Menu, Select, Combobox, Search and List take `density` (`regular`, `compact`; default `regular`), as the tree view and
the list row do; Select field and Combobox field forward it. A compact row is the tree view's compact row: 32 high, 20
glyphs, 8 from its edges, the same text styles. It is for a tool used with a mouse. For touch a row is never lower than
the touch target in either density; for a fine pointer a compact row is as high as its density gives (still above the
24 by 24 of WCAG 2.5.8), where a regular row is held to the pointer target. A design system may add densities.

- Menu: every row of every surface, submenus included; the group titles' inset follows the rows'.
- Select, Combobox: the options and the group titles of the list. The field's box is still `size`'s.
- Search: every row of the view, results and linked group headings included. The bar, the trigger, the header, the
  group titles and the status row do not change.
- List: the box of an action, a link and an option (its least height and its padding above and below), and every List
  row that is an item's direct child.

What broke:

- The row tokens of the five components are split by density: `comp.menu.container.{height,padding-block,padding-inline,gap}`,
  `comp.menu.{leading-icon,trailing-icon,mark}.size` and `comp.menu.group-title.padding-inline`;
  `comp.select.option.*` and `comp.combobox.option.*` (height, paddings, gap, leading icon and mark sizes) and their
  `group-title.padding-inline`; `comp.search.suggestion.container.{height,padding-block,padding-inline,gap}` and
  `comp.search.suggestion.leading-icon.size`; `comp.list.container.{height,padding-block}`. Each is now `<name>.regular`
  (the old value) and `<name>.compact` (custom properties `--…-regular`, `--…-compact`). A layer or a page that set
  one sets its `.regular` now.
- A List row inside an item of a list draws the list's density, not its own: set `density` on the list.

Baselines: new fixtures `density-compact` for the five components. No other image changes: the regular values are the
old ones.
