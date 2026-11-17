---
'@tanrei/web': patch
---

Search: `data-mirror="always"` or `"never"` on a `<tanrei-search-suggestion>`, a `<tanrei-search-result>` or a
`<tanrei-search-result-group>` now decides whether the glyph its `leading-icon` names is mirrored in a right-to-left
layout, as on a glyph the product places itself (`auto`, the default, leaves it to the icon set's list). Before, the
search drew these glyphs from the icon set's list alone. The search's own glyphs (its magnifier, the back arrow, the
clear button's close) take no word.
