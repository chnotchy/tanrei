---
'@tanrei/web': patch
---

Menu: `data-mirror="always"` or `"never"` on a menu item, a checkbox or radio item or a submenu now decides whether
the glyphs it names — its `leading-icon`, its `trailing-icon` and its own `mark-icon` — are mirrored in a right-to-left
layout, and on a `<tanrei-menu-group>` whether the `mark-icon` it names for its items is, as on a glyph the product
places itself (`auto`, the default, leaves it to the icon set's list). The submenu indicator and the link mark are the
menu's own glyphs and take no word. Before, the menu drew these glyphs from the icon set's list alone.
