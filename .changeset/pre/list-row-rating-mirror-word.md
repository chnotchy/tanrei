---
'@tanrei/web': minor
---

List row and rating: the product can now force or forbid the mirroring of a glyph they draw by name, as every other
component that draws one lets it (LRW-18, RAT-19). `data-mirror="always"` or `"never"` on a `<tanrei-list-row>`
decides for the glyphs its `leading-icon` and `trailing-icon` name, and on a `<tanrei-rating>` for the glyph its
`icon` names in every mark (`auto`, the default, leaves it to the icon set's list). The star a rating draws without
`icon` is its own glyph and takes no word. Before, both drew these glyphs from the icon set's list alone.
