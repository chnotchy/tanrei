---
'@tanrei/compose': minor
'@tanrei/swiftui': minor
'@tanrei/flutter': minor
'@tanrei/react-native': minor
'@tanrei/tokens-build': minor
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/docs': patch
---

**Tabs, navigation and trees are drawn at the control height.** A tab of a medium row (and so a Tab view's own row), a
navigation drawer's destination and its collapsed cell, a tree view's row and a table of contents' row (and its compact
presentation's) now read `sys.control.height.medium` in their default size, and are marked
`"dev.tanrei.aligned": "control"`. At a control height of 32 they are 32 tall; at 36, 36.

- **The default system changes, as intended:** at the default control height of 40 these rows go from **48 to 40**
  (`comp.tabs.container.height.medium`, `comp.navigation-drawer.item.container.height.medium`,
  `comp.navigation-drawer.collapsed.item.container.width.medium`, `comp.tree-view.container.height.medium`,
  `comp.table-of-contents.compact.row.height`), and a table of contents' row from **44 to 40**
  (`comp.table-of-contents.row.height.medium`). A collapsed drawer's cell is a square as tall as its row, centred in a
  column that keeps its 72; its padding-block now gives up half of what the cell loses below 40. A tree row's padding
  is 8 and a table of contents row's 10 at 40, so that one line still fits. The web baselines of these components are
  recorded again for this change. A primary tab with its icon above its label keeps its 64. A tab's indicator is the
  row less the track's inset, so it is 32 at 40, and a circle is 32 across: in the default system a tab that holds only
  a glyph is now the 36 target wide, wider than its circle; `comp.tabs.active-indicator.padding-block.medium` gives up
  half of what the row loses below 40, so that one line of the label fits a tab of a lower control height.
- **Breaking: the navigation drawer's `density` is now `size`**, so that "density" has one meaning: `density="regular"`
  is `size="medium"` (the default) and `density="compact"` is `size="small"`. The axis and its tokens are renamed with
  it: `comp.navigation-drawer.*.regular` is `*.medium` and `*.compact` is `*.small` (CSS
  `--tanrei-comp-navigation-drawer-…-regular` is `…-medium`), and the web type `TanreiNavigationDrawerDensity` is
  `TanreiNavigationDrawerSize`. No alias is kept.
- **The presets keep their originals' heights**, pinned with the reason: m3-like and m3-expressive-like keep Material
  3's 48 tab (and their 56 drawer row and cell), and the 48 tree row and 44 and 48 table of contents rows they drew;
  cupertino keeps the 48 tab, tree, drawer and compact table of contents rows and the 44 table of contents row it drew.
- New behaviour: TAB-63, TBV-25, NVD-105, TRV-74 and TOC-43 say a default row is as tall as the control height.
