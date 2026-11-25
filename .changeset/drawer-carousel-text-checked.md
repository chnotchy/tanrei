---
'@tanrei/web': patch
---

**The navigation drawer's labels and a carousel item's text are checked for contrast.** axe-core's `color-contrast`
rule left them incomplete ("overlapped by another element") instead of checking them, so faint text there was never
reported. In `<tanrei-navigation-drawer>` the item container of every destination and group row lies under the row at a
negative level, which axe-core takes for a box above a text that is not positioned: the row's text column (the label
and the supporting text) is now positioned, with no level of its own, and is drawn where it was. In
`<tanrei-carousel-item>` the state layer lies over the content while the item is hovered, focused or pressed: it now
holds its color and opacity and draws the color by its `::before`, at the same place in the paint order. Nothing either
component draws changes, in any fixture, theme, hover or focus, in Chromium, Firefox or WebKit.
