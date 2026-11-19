---
'@tanrei/compose': minor
'@tanrei/swiftui': minor
'@tanrei/flutter': minor
'@tanrei/react-native': minor
'@tanrei/tokens-build': minor
'@tanrei/web': minor
'@tanrei/react': minor
---

**A collapsed navigation drawer's short label takes the column's width, not its square's.** As Material 3's navigation
rail keeps its active indicator behind the icon and gives the label the item's width, a collapsed cell that draws a
short label (`collapsedLabels` `selected` or `always`) keeps its item container, and with it the state layer, the
selected fill and the focus ring, the square behind the icon (40 by 40 in the default system), and draws the label
`collapsed.item.gap` under it, across the column less `container.padding-inline` on each side: 48 in the default
system, where it was 32 (the square less 4 on each side). Starred, Shared and Recent are now drawn whole; Settings and
Notifications are still cut. The cell keeps `collapsed.item.container.padding-block` under the label, so a labelled
cell is 68 high in the default system (it was 60).

- **Breaking: `comp.navigation-drawer.collapsed.item.container.padding-inline` is removed** (CSS
  `--tanrei-comp-navigation-drawer-collapsed-item-container-padding-inline`, and its member on each platform's token
  struct): the label no longer stands inside the item container, so nothing reads it. No alias is kept.
- **`comp.navigation-drawer.collapsed-selected.item.label.color` is `sys.color.on-surface`**, where it was the selected
  row's label color: the label stands on the drawer's surface, not on the selected fill. Under cupertino the selected
  short label was white on the tint; it is now on-surface on the drawer's surface.
- **What moves in the presets:** m3-like and m3-expressive-like draw the same label (56 wide) and cell (64), and their
  transparent item container, which carries the focus ring, is now the 56 by 32 indicator's box instead of reaching
  around the label. Under cupertino the label is 48 wide (it was 40), the item container is 48 by 44 (it was 48 by 66),
  and a labelled cell is 80 high (it was 68).
- The web baselines of the labelled collapsed fixtures move with this change, as intended; they are recorded again
  for it.
