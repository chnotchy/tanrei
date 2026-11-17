---
'@tanrei/web': patch
---

Navigation bar, navigation drawer and tab view: `data-mirror="always"` or `"never"` now decides whether a glyph given
by name is mirrored in a right-to-left layout, as on a glyph the product places itself (`auto`, the default, leaves it
to the icon set's list) — on a `<tanrei-navigation-bar-item>` for its icon in both copies, on a
`<tanrei-navigation-drawer-item>` for its icon and on a `<tanrei-navigation-drawer-group>` for its icon and its
`open-icon`, and on a `<tanrei-tab-panel>` of a tab view that draws its own row for the icon of the tab drawn for it.
Before, each drew the glyph from the icon set's list alone.
