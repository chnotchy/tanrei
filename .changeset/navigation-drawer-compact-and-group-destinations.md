---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

Navigation drawer: a compact density, groups that are destinations, and the main action on the icons' line.

- `density`: `regular` (the default, the menu item's 48 row it always had) or `compact`, a tree view's compact row for a
  tool used with a pointer whose drawer lists many places: 32 rows with 16 glyphs, 8 paddings and gaps, a 2 gap between
  cells, 28 headings, and a 56 column of icons when collapsed. Both forms follow it, every icon keeps one point in both
  forms, and a nested icon stands where its group's label starts in both densities. For touch a compact row is drawn at
  least the touch target high; for a pointer its hit area is the row and half the gap around it. A design system may add
  densities.
- The vocabulary changed: fourteen tokens now hold one value per density (`regular`, `compact`) —
  `comp.navigation-drawer.container.gap`, `item.container.height`, `item.padding-inline`, `item.gap`, `item.nest-indent`,
  `item.icon.size`, `item.icon-indicator.width`, `item.icon-indicator.height`, `item.label.typescale`,
  `item.trailing-icon.size`, `collapsed.container.width`, `collapsed.item.container.width`,
  `collapsed.item.container.padding-block` and `heading.height`. A layer that set one of them sets its `.regular` value
  now (the shipped presets do); the CSS custom properties gain the same suffix
  (`--tanrei-comp-navigation-drawer-item-container-height-regular`). The Figma variables are renamed in place.
- `selectableGroups` (off by default): a group with a `value` or an `href` is then a destination as well. Its row
  chooses it — `change` or `reselect`, the current page, a link with an `href` — and never opens or closes it; its
  chevron is a control of its own, after the row in the focus order, that alone opens and closes it (the WAI-ARIA
  Authoring Practices' disclosure navigation menu with top-level links). Collapsed, its cell chooses it. A group
  without either still only opens and closes. `revealSelected` also opens a group that is itself the selected
  destination.
- The main action's glyph stands on the destinations' icon line in both forms, at every size of the button, in both
  densities and every shipped system, in either direction: the drawer places the button from its own tokens (its
  collapsed square, its padding before a leading glyph, its glyph) instead of centring its measured square. A collapsed
  square wider than the column (the large main action in the default system) and a trailing glyph are reported.
- Web: all of it, with tests. SwiftUI, Compose, Flutter and React Native stay lagging: neither is built there yet, and their
  drawers still read the drawer tokens by the names they had before this change.
- Three new fixtures, `compact`, `compact-collapsed` and `selectable-groups`, whose web baselines are recorded new; no
  other baseline changes.
