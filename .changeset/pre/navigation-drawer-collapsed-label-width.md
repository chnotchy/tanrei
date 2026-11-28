---
'@tanrei/compose': minor
'@tanrei/swiftui': minor
'@tanrei/flutter': minor
'@tanrei/react-native': minor
'@tanrei/tokens-build': minor
'@tanrei/web': minor
'@tanrei/react': minor
---

**A collapsed navigation drawer's short label spans the column, not its square.** Material 3's navigation rail keeps
its active indicator behind the icon and lets the label under it span the item. The drawer now does the same. A
collapsed cell that draws a short label (`collapsedLabels` set to `selected` or `always`) keeps its item container the
square behind the icon (40 by 40 in the default system), and with it the state layer, the selected fill and the focus
ring. The label is drawn `collapsed.item.gap` under the square, across the column less
`collapsed.item.label.padding-inline` on each side: 64 in the default system, where it was 32 (the square less 4 on
each side). Every label of the labelled fixtures is now drawn whole except Notifications. The cell keeps
`collapsed.item.container.padding-block` under the label, so a labelled cell is 68 high in the default system (it was
60).

- **Breaking: `comp.navigation-drawer.collapsed.item.container.padding-inline` is renamed
  `comp.navigation-drawer.collapsed.item.label.padding-inline`** (CSS
  `--tanrei-comp-navigation-drawer-collapsed-item-container-padding-inline` is
  `--tanrei-comp-navigation-drawer-collapsed-item-label-padding-inline`, and each platform's token struct member is
  renamed with it). The value is still 4. It is now the label's room on each side inside the column, no longer a padding
  inside the item container. No alias is kept. m3-like's pin of it (0) is dropped: Material's rail gives no number for
  it.
- **`comp.navigation-drawer.collapsed-selected.item.label.color` is `sys.color.on-surface`**, where it was the selected
  row's label color, because the label stands on the drawer's surface and not on the selected fill. Under cupertino the
  selected short label was white on the tint; it is now on-surface on the drawer's surface.
- **What moves in the presets:** under m3-like and m3-expressive-like the label is 72 wide (it was 56) and the cell
  stays 64 high. Their transparent item container, which carries the focus ring, is now the 56 by 32 indicator's box
  instead of reaching around the label. Under cupertino the label is 64 wide (it was 40), the item container is 48 by 44
  (it was 48 by 66), and a labelled cell is 80 high (it was 68).
- The web baselines of the labelled collapsed fixtures move with this change, as intended.
