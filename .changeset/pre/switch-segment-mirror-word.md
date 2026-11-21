---
'@tanrei/web': patch
---

Switch and segmented button: `data-mirror="always"` or `"never"` on a `<tanrei-switch>` decides whether the glyphs its
`checked-icon` and `unchecked-icon` name are mirrored in a right-to-left layout, and on a `<tanrei-segment>` whether its
icon is, as it does on a glyph the product places itself (`auto`, the default, leaves it to the icon set's list).
Before, both drew the glyph in their shadow root from the icon set's list alone, so a product could neither force
nor forbid the mirroring of one use.
