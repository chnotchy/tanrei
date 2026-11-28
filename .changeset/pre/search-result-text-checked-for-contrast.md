---
'@tanrei/web': patch
---

**`<tanrei-search-result>` and a linked `<tanrei-search-result-group>` heading: the row's text is checked for
contrast.** The row's link (its own `<a>`, or `<button>`) lay over the row, and axe's `color-contrast` rule, which
ignores `pointer-events`, took it for an element covering the icon, the headline, the excerpt and its marks: it left
them incomplete ("overlapped by another element") instead of checking them. The link now lies under the row's icon and
text (`z-index: -1` inside the row), which take no pointer, so every press, hover, middle click and context menu still
reaches the link, and the text is checked. Nothing a result draws changes, in any state or engine.
