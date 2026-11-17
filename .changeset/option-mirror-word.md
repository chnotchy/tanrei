---
'@tanrei/web': patch
---

Select and combobox: `data-mirror="always"` or `"never"` on a `<tanrei-option>` now decides whether the glyph its
`leading-icon` names is mirrored in a right-to-left layout — in its row of the list and in the container while it is
the chosen option — as on a glyph the product places itself (`auto`, the default, leaves it to the icon set's list).
Before, both drew an option's glyph from the icon set's list alone.
