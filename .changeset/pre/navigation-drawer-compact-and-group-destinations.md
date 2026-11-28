---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

Navigation drawer: the row model shared with the tree view, a compact density, groups that are destinations, and the
main action on the icons' line.

- The rows take the tree view's parameters, with its names and meanings: `chevron` (`start`, the default, `end` or
  `none`), `guides` (`none`, `shown`, `hover`), `indent` (auto, or a number), `highlight` (`indented`, the default, or
  `full`), `iconSpace`, `expandable`, `labelWrap` and `supportingWrap`, a row's `supportingText` and
  `supportingPosition`, a group's trailing text and slot, `openIcon` and `loading` (named by the drawer's
  `loadingLabel`), and `stickyParents` (off by default) with `stickyMax` (2). Labels and supporting text are one line
  by default, cut, with the whole text in a tooltip on hover and keyboard focus only where cut. A collapsible drawer
  draws a start chevron at the end, so its icons keep their places in both forms. Visual change: groups now draw their
  chevron at the start by default, a nested row's fill begins at its indent, and a long label is one line — every
  drawer baseline with groups or long labels is recorded again.
- `density`: `regular` (the default, the menu item's 48 row) or `compact`, a tree view's compact row for a tool used
  with a pointer whose drawer lists many places: 32 rows with 16 glyphs, 8 paddings, a 2 gap between cells, 28
  headings, and a 56 column of icons when collapsed. No density changes the gap between the icon and the label. Both
  forms follow it, and a nested icon stands where its group's label starts. For touch a compact row is drawn at least
  the touch target high; for a pointer its hit area is the row and half the gap around it.
- The vocabulary changed: thirteen tokens now hold one value per density (`regular`, `compact`) —
  `comp.navigation-drawer.container.gap`, `item.container.height`, `item.padding-inline`, `item.nest-indent`,
  `item.icon.size`, `item.icon-indicator.width`, `item.icon-indicator.height`, `item.label.typescale`,
  `item.trailing-icon.size`, `collapsed.container.width`, `collapsed.item.container.width`,
  `collapsed.item.container.padding-block` and `heading.height`. A layer that set one of them sets its `.regular` value
  now (the shipped presets do); the CSS custom properties gain the same suffix
  (`--tanrei-comp-navigation-drawer-item-container-height-regular`). The Figma variables are renamed in place. New
  tokens: `item.padding-block` (per density), `item.supporting-text.typescale` and each condition's
  `item.supporting-text.color`, `guide.color` and `guide.width`, `sticky.container.color`, `sticky.divider.color` and
  `sticky.divider.width`.
- `selectableGroups` (off by default): a group with a `value` or an `href` is then a destination as well. Its row
  chooses it — `change` or `reselect`, the current page, a link with an `href` — and never opens or closes it; its
  chevron (or, without one, its icon) is a control of its own, after the row in the focus order, that alone opens and
  closes it (the WAI-ARIA Authoring Practices' disclosure navigation menu with top-level links). Collapsed, its cell
  chooses it. `revealSelected` also opens a group that is itself the selected destination.
- The main action's glyph stands on the destinations' icon line in both forms, at every size of the button, in both
  densities and every shipped system, in either direction, and with a start chevron: the drawer places the button from
  its own tokens by a margin on its own box around the slot, so a page's reset no longer moves it. A collapsed square
  wider than the column (the large main action in the default system) and a trailing glyph are reported.
- Web: all of it, with tests. SwiftUI, Compose, Flutter and React Native stay lagging: none of it is built there yet,
  and their drawers still read the drawer tokens by the names they had before this change.
