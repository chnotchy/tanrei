---
'@tanrei/web': patch
---

A component's bundle no longer carries values it never reads. The `delegatedAria` and `linkAttributes` directives (the
first with its writer), the first-paint promise, the glyph visibility rule, the separation prop's values and the
reduced-motion style query are dropped where nothing uses them, and the pending glyphs of the accordion, the tree view
and the table no longer bring the glyph observer and font watch of the shadow-root glyphs with them. Nothing is drawn
or behaves differently. Most bundles are smaller, by up to 1.9 kB (gzip): the tooltip 28568 → 26661 B, the badge
12905 → 10999 B, the rating 22648 → 20753 B, the avatar 23296 → 21546 B. Seven grow by 1 to 65 B where the moved
modules compress less well together: `@tanrei/web/all` 669131 → 669196 B, the FAB menu by 45 B, the breadcrumbs by
28 B.
