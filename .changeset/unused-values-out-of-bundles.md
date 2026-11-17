---
'@tanrei/web': patch
---

A component's bundle no longer carries values it never reads. The `@tanrei/web/icons.css` stylesheet was a constant
made at the top of the module that also gives every component its `iconGlyph()`, so some sixty bundles held all of it;
the build now writes it from a function, and the file is unchanged byte for byte. The `delegatedAria` and
`linkAttributes` directives (the first with its writer), the first-paint promise, the separation prop's values and the
reduced-motion style query are dropped where nothing uses them, and the pending glyphs of the accordion, the tree view
and the table no longer bring the glyph observer and font watch of the shadow-root glyphs with them. Nothing is drawn
or behaves differently. Every component's bundle is smaller, by up to 4.5 kB (gzip): the rating 25300 → 20753 B, the
avatar 25957 → 21546 B, the button 34190 → 31516 B, the select field 82699 → 79895 B, `@tanrei/web/all`
671769 → 669161 B.
