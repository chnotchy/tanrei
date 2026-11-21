---
'@tanrei/web': patch
---

FAB menu and file item: `data-mirror="always"` or `"never"` on a `<tanrei-fab-menu-item>` now decides whether the
glyph its `icon` names is mirrored in a right-to-left layout, and on a `<tanrei-file-item>` whether the glyph its
`glyph` names is, as on a glyph the product places itself (`auto`, the default, leaves it to the icon set's list). The
glyph a file's format chooses takes no word. Before, both drew these glyphs from the icon set's list alone.
